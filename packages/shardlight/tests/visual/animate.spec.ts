import { expect, test } from '@playwright/test';
import './types.js';

/**
 * The DOM adapter subscribes to the shared ticker only while a light is both on
 * screen and animating. These exercise the "animating" half end to end, in a
 * real browser (an idle light used to tick forever).
 */
test('an effect-free DOM light reports idle', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((options) => window.__harness.render(options), {
    target: 'dom' as const,
    size: 256,
  });

  const animating = await page.evaluate(() => {
    const root = document.querySelector('#stage > div') as HTMLElement & {
      model?: { animating: boolean };
    };
    return root.model?.animating;
  });
  expect(animating).toBe(false);
});

test('a DOM light with a continuous effect animates', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((options) => window.__harness.render(options), {
    target: 'dom' as const,
    size: 256,
    effects: [{ type: 'pulse', channels: ['body'], speed: 2, amount: 0.4 }],
  });

  const values = await page.evaluate(async () => {
    const root = document.querySelector('#stage > div') as HTMLElement;
    const read = () => getComputedStyle(root).getPropertyValue('--shardlight-body-scale').trim();
    const seen: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      seen.push(read());
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    return seen;
  });

  expect(new Set(values).size).toBeGreaterThan(1);
});

test('effects on the config still apply (not shadowed by the adapter)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((options) => window.__harness.render(options), {
    target: 'dom' as const,
    size: 256,
    config: { effects: [{ type: 'pulse', channels: ['body'], speed: 2, amount: 0.4 }] },
  });

  const animating = await page.evaluate(() => {
    const root = document.querySelector('#stage > div') as HTMLElement & {
      model?: { animating: boolean };
    };
    return root.model?.animating;
  });
  expect(animating).toBe(true);
});
