import { test, expect } from '@playwright/test';

for (const [width, height] of [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [540, 720],
  [600, 960],
  [700, 1000],
  [701, 1000],
  [744, 1133],
  [768, 1024],
  [810, 1080],
  [820, 1180],
  [834, 1194],
  [900, 1200],
  [901, 1200],
  [1024, 1366],
  [1180, 820],
  [1440, 900],
  [844, 390],
]) {
  test(`login fits ${width}x${height} with balanced side gutters`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { x: r.x, right: r.right, width: r.width, height: r.height };
      };
      return {
        viewport: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        story: rect('.open-welcome-story'),
        form: rect('.open-welcome-signin'),
        button: rect('.google-button'),
        label: rect('.google-label'),
        labelLine:
          parseFloat(getComputedStyle(document.querySelector('.google-label')!).fontSize) * 1.6,
      };
    });
    expect(layout.pageWidth).toBeLessThanOrEqual(width);
    expect(layout.form.x).toBeGreaterThanOrEqual(20);
    expect(layout.form.right).toBeLessThanOrEqual(width - 20);
    expect(layout.button.height).toBeGreaterThanOrEqual(48);
    expect(layout.label.height).toBeLessThanOrEqual(layout.labelLine + 1);
    if (width <= 900) {
      expect(layout.form.width).toBeLessThanOrEqual(520);
      expect(Math.abs(layout.form.x - layout.story.x)).toBeLessThan(1);
      expect(Math.abs(layout.form.x - (width - layout.form.right))).toBeLessThan(1);
    }
  });
}
