import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { DeckEditorPage } from '../../../src/features/decks/DeckEditorPage';
import { createDeckService, type DeckService } from '../../../src/features/decks/deck-service';
import { mayChangeAccount } from '../../../src/lib/navigation-guard';
import { deckFixture, deckId, workspaceId } from '../../support/deck-fixture';
import type { DeckDocument } from '../../../src/domain/deck';
import { forgetDraft } from '../../../src/lib/draft-memory';
import { purgeProfileData } from '../../../src/lib/device-session';
const profileId = '22222222-2222-4222-8222-222222222222';
const originalFonts = Object.getOwnPropertyDescriptor(document,'fonts');
beforeEach(() => Object.defineProperty(document,'fonts',{ configurable: true, value: { load: async () => [{ family: 'Figtree',status: 'loaded' }],check: () => true } }));
afterEach(() => { vi.restoreAllMocks(); forgetDraft(profileId); if (originalFonts) Object.defineProperty(document,'fonts',originalFonts); else Reflect.deleteProperty(document,'fonts'); });
function editor(overrides: Partial<DeckService> = {}, document = deckFixture()) {
  const service: DeckService = { ...createDeckService(null), getDeck: async () => ({ ok: true, value: { document, revision: 1 } }), ...overrides };
  return render(<RouterProvider router={createMemoryRouter([
    { path: '/edit', element: <DeckEditorPage workspaceId={workspaceId} deckId={deckId} profileId={profileId} service={service} /> },
    { path: '/app/w/:workspaceId/decks', element: <p>Presentation library</p> },
    { path: '/app/w/:workspaceId/decks/:deckId', element: <p>Copied presentation</p> },
  ],{ initialEntries: ['/edit'] })} />);
}
it('retains every entered word after a failed save',async () => {
  editor({ saveDeck: async () => ({ ok: false, error: { code: 'NETWORK', message: 'Save could not be confirmed.' } }) });
  const lyrics = await screen.findByRole('textbox',{ name: 'Lyrics' });
  await userEvent.clear(lyrics); await userEvent.type(lyrics,'主よ 🙏\nKeep every word');
  await userEvent.click(screen.getByRole('button',{ name: 'Save presentation' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
  expect(lyrics).toHaveValue('主よ 🙏\nKeep every word');
});
it('saves the retained conflict draft as a copy',async () => {
  let copied: DeckDocument | undefined;
  editor({ saveDeck: async () => ({ ok: false, error: { code: 'CONFLICT', message: 'A newer revision exists.' } }),
    saveCopy: async document => { copied=document; return { ok: true, value: { document: { ...document, id: crypto.randomUUID() }, revision: 1 } }; } });
  const lyrics = await screen.findByRole('textbox',{ name: 'Lyrics' });
  await userEvent.clear(lyrics); await userEvent.type(lyrics,'My draft survives');
  await userEvent.click(screen.getByRole('button',{ name: 'Save presentation' }));
  await userEvent.click(await screen.findByRole('button',{ name: 'Save draft as a copy' }));
  expect(await screen.findByText('Copied presentation')).toBeVisible();
  expect(copied?.slides[0].elements[0]).toMatchObject({ text: 'My draft survives' });
});
it('blocks navigation and account changes until the volunteer decides about their draft',async () => {
  const confirm = vi.spyOn(window,'confirm').mockReturnValue(false);
  editor();
  await userEvent.type(await screen.findByRole('textbox',{ name: 'Lyrics' }),' More words');
  expect(mayChangeAccount()).toBe(false); expect(confirm).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('link',{ name: 'Back to presentations' }));
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('Leave without saving');
  await userEvent.click(screen.getByRole('button',{ name: 'Keep editing' }));
  expect((screen.getByRole('textbox',{ name: 'Lyrics' }) as HTMLTextAreaElement).value).toContain('More words');
  await userEvent.click(screen.getByRole('link',{ name: 'Back to presentations' }));
  await userEvent.click(screen.getByRole('button',{ name: 'Discard changes and leave' }));
  expect(await screen.findByText('Presentation library')).toBeVisible();
});
it('offers manual passage, reference and translation fields',async () => {
  editor({},deckFixture('scripture'));
  expect(await screen.findByRole('textbox',{ name: 'Passage' })).toBeVisible();
  expect(screen.getByRole('textbox',{ name: 'Reference' })).toBeVisible();
  expect(screen.getByRole('textbox',{ name: 'Translation' })).toBeVisible();
});
it('lets a volunteer type a new text size one digit at a time',async () => {
  const saveDeck = vi.fn(async (document: DeckDocument) => ({ ok: true as const,value: { document,revision: 2 } }));
  editor({ saveDeck });
  await screen.findByRole('textbox',{ name: 'Lyrics' });
  const size = screen.getByRole('spinbutton',{ name: 'Text size' });
  await userEvent.clear(size); await userEvent.type(size,'68');
  expect(size).toHaveValue(68);
  await userEvent.click(screen.getByRole('button',{ name: 'Save presentation' }));
  expect(saveDeck).toHaveBeenCalledWith(expect.objectContaining({ slides: [expect.objectContaining({ elements: [expect.objectContaining({ fontSize: 68 })] })] }),1);
});
it('recovers a same-tab draft after an auth-boundary unmount and purges it on explicit sign-out',async () => {
  const view = editor();
  const input = await screen.findByRole('textbox',{ name: 'Lyrics' });
  await userEvent.clear(input); await userEvent.type(input,'Recovered words');
  view.unmount();
  const next = editor();
  expect(await screen.findByRole('textbox',{ name: 'Lyrics' })).toHaveValue('Recovered words');
  expect(screen.getByText(/unsaved draft was recovered/)).toBeVisible();
  next.unmount();
  expect((await purgeProfileData(profileId)).ok).toBe(true);
  editor();
  expect(await screen.findByRole('textbox',{ name: 'Lyrics' })).toHaveValue('Enter your lyrics here\nOne line at a time');
});
it('waits for a pending save before leaving or changing account',async () => {
  let complete!: (value: Awaited<ReturnType<DeckService['saveDeck']>>) => void;
  let saved: DeckDocument | undefined;
  editor({ saveDeck: document => { saved=document; return new Promise(resolve => { complete=resolve; }); } });
  await userEvent.type(await screen.findByRole('textbox',{ name: 'Lyrics' }),' Pending');
  await userEvent.click(screen.getByRole('button',{ name: 'Save presentation' }));
  expect(mayChangeAccount()).toBe(false);
  await userEvent.click(screen.getByRole('link',{ name: 'Back to presentations' }));
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('still finishing');
  expect(screen.getByRole('button',{ name: 'Discard changes and leave' })).toBeDisabled();
  await act(async () => complete({ ok: true,value: { document: saved!,revision: 2 } }));
  expect(await screen.findByText('Presentation library')).toBeVisible();
});
it('keeps the saved checkpoint distinct from undo and redo',async () => {
  const saveDeck=vi.fn(async (document: DeckDocument) => ({ ok: true as const,value: { document,revision: 2 } }));
  editor({ saveDeck });
  const lyrics=await screen.findByRole('textbox',{ name: 'Lyrics' });
  await userEvent.clear(lyrics); await userEvent.type(lyrics,'Saved new words');
  await userEvent.click(screen.getByRole('button',{ name: 'Save presentation' }));
  expect(await screen.findByText('Saved · revision 2')).toBeVisible();
  await userEvent.click(screen.getByRole('button',{ name: 'Undo' }));
  expect(lyrics).toHaveValue('Enter your lyrics here\nOne line at a time');
  expect(screen.getByRole('button',{ name: 'Save presentation' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button',{ name: 'Redo' }));
  expect(lyrics).toHaveValue('Saved new words');
  expect(screen.getByRole('button',{ name: 'Save presentation' })).toBeDisabled();
  expect(saveDeck).toHaveBeenCalledOnce();
});
