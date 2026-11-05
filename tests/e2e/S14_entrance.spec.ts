import { test, expect } from '@playwright/test';

for (const width of [1440, 834, 390, 320]) {
  test(`login opens directly without entrance media at ${width}px`, async ({ page }) => {
    const videos: string[] = [];
    const errors: string[] = [];
    page.on('request', (r) => {
      if (/\.mp4(?:\?|$)/.test(r.url())) videos.push(r.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: width === 320 ? 700 : 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/auth');
    await expect(
      page.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
    await expect(page.locator('video,.login-entrance')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Continue with Google', exact: true }),
    ).toBeVisible();
    expect(videos).toEqual([]);
    expect(errors).toEqual([]);
  });
}
