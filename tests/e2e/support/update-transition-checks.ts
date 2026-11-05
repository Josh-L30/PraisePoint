import { expect, type Page, type BrowserContext } from '@playwright/test';
import { deckFixture, deckId, libraryPath } from './deck-fixture';
import { teamFixture } from './team-fixture';
async function refused(page: Page, before: string, buildOf: (page: Page) => Promise<string>) {
  await page.getByRole('button', { name: 'Update app', exact: true }).click();
  await expect(
    page.getByText(
      /Close the editor and finish account changes|Another PraisePoint window is busy/,
    ),
  ).toBeVisible();
  expect(await buildOf(page)).toBe(before);
}
export async function verifyEditorUpdateSafety(
  page: Page,
  context: BrowserContext,
  before: string,
  buildOf: (page: Page) => Promise<string>,
) {
  const editor = await context.newPage(),
    state = await deckFixture(editor);
  let release = () => {};
  let saving = false;
  try {
    await editor.route('**/rest/v1/rpc/save_slide_deck', async (route) => {
      saving = true;
      const document = route.request().postDataJSON().p_document;
      await new Promise<void>((done) => {
        release = done;
      });
      state.documents.set(document.id, { document, revision: 2 });
      await route.fulfill({ json: { document, revision: 2 } });
    });
    await editor.goto(libraryPath + '/' + deckId);
    await editor
      .getByRole('textbox', { name: 'Lyrics', exact: true })
      .fill('Protect these unsaved words');
    await refused(page, before, buildOf);
    await editor.getByRole('button', { name: 'Full-window preview', exact: true }).click();
    await expect(editor.getByRole('dialog', { name: 'Presentation preview' })).toBeVisible();
    await refused(page, before, buildOf);
    await editor.getByRole('link', { name: 'Back to editor', exact: true }).click();
    await expect(editor.getByRole('textbox', { name: 'Lyrics', exact: true })).toHaveValue(
      'Protect these unsaved words',
    );
    await editor.getByRole('button', { name: 'Save presentation', exact: true }).click();
    await expect.poll(() => saving).toBe(true);
    await refused(page, before, buildOf);
    release();
    await expect(editor.getByText('Saved · revision 2', { exact: true })).toBeVisible();
  } finally {
    release();
    await editor.close();
  }
}
export async function verifyLogoutUpdateSafety(
  page: Page,
  context: BrowserContext,
  before: string,
  buildOf: (page: Page) => Promise<string>,
) {
  const auth = await context.newPage();
  await teamFixture(auth, { personalOnly: true });
  let release = () => {},
    logoutRequested = false;
  try {
    await auth.route('**/auth/v1/logout*', async (route) => {
      logoutRequested = true;
      await new Promise<void>((done) => {
        release = done;
      });
      await route.fulfill({ status: 204 });
    });
    await auth.goto('/app');
    await expect(auth.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await auth.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('gather-device', 3);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction(
                ['meta', 'mediaFiles', 'preparedServices', 'preparedAssets'],
                'readwrite',
              );
            let hold = true;
            (window as unknown as { releaseTestCleanup: () => void }).releaseTestCleanup = () => {
              hold = false;
            };
            tx.oncomplete = () => db.close();
            const keep = () => {
              if (hold) tx.objectStore('meta').get('session').onsuccess = keep;
            };
            keep();
            resolve();
          };
        }),
    );
    await auth.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect
      .poll(() => auth.evaluate(() => localStorage.getItem('gather-sign-out-pending')))
      .toBe('1');
    expect(logoutRequested).toBe(false);
    await refused(page, before, buildOf);
    await auth.evaluate(() =>
      (window as unknown as { releaseTestCleanup: () => void }).releaseTestCleanup(),
    );
    await expect.poll(() => logoutRequested).toBe(true);
    await refused(page, before, buildOf);
    release();
    await expect(
      auth.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
  } finally {
    await auth
      .evaluate(() =>
        (window as unknown as { releaseTestCleanup?: () => void }).releaseTestCleanup?.(),
      )
      .catch(() => {});
    release();
    await auth.close();
  }
}
