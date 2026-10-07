import { expect, test } from '@playwright/test';
import './types.js';

/**
 * `resolution: 'auto'` (the `<ShardLight>` default) re-measures on resize and
 * re-bakes in power-of-two steps, so a light mounted at one size does not stay
 * stuck there.
 */
test("resolution 'auto' re-bakes on resize, in power-of-two steps", async ({ page }) => {
  await page.goto('/');
  await page.evaluate((options) => window.__harness.render(options), {
    target: 'dom' as const,
    size: 256,
  });

  const before = await page.evaluate(
    () => (document.querySelector('#stage img') as HTMLImageElement | null)?.naturalWidth,
  );
  expect(before).toBe(256);

  // Grow the light to 900px: auto should re-measure and snap up to 1024.
  await page.evaluate(() => {
    const root = document.querySelector('#stage > div') as HTMLElement;
    root.style.width = '900px';
    root.style.height = '900px';
  });

  await page.waitForFunction(
    () => (document.querySelector('#stage img') as HTMLImageElement | null)?.naturalWidth === 1024,
    undefined,
    { timeout: 5000 },
  );
});
