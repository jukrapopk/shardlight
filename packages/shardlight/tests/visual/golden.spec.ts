import { expect, test } from '@playwright/test';
import './types.js';

const presets = ['star', 'sun', 'anamorphic', 'sparkle'] as const;
// The DOM target is covered by the per-preset goldens below.
const extraTargets = ['three', 'r3f'] as const;

// One golden per preset on the DOM target.
for (const preset of presets) {
  test(`golden: dom / ${preset}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((options) => window.__harness.render(options), {
      target: 'dom' as const,
      preset,
    });
    await expect(page.locator('#stage')).toHaveScreenshot(`dom-${preset}.png`);
  });
}

// One golden per 3D target, on the default preset.
for (const target of extraTargets) {
  test(`golden: ${target} / star`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((options) => window.__harness.render(options), {
      target,
      preset: 'star',
    });
    await expect(page.locator('#stage')).toHaveScreenshot(`${target}-star.png`);
  });
}
