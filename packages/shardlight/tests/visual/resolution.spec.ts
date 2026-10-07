import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import './types.js';

/**
 * The same light must look the same at any bake resolution. `softness` is
 * documented as px at a 1024 bake, so a low-resolution bake must scale it down;
 * if the baker forgets, the low-resolution bake comes out visibly softer. A soft
 * blob makes the difference unambiguous (thin rays only differ by resampling).
 */
const SOFT_BLOB = {
  color: '#FFF4E0',
  shards: [{ id: 'glow', kind: 'blob', channel: 'body', size: 0.7, falloff: 2, softness: 24 }],
};

async function shot(
  page: Page,
  options: { preset?: string; config?: Record<string, unknown>; resolution: number },
): Promise<Buffer> {
  await page.goto('/');
  await page.evaluate((render) => window.__harness.render(render), {
    target: 'dom' as const,
    size: 1024,
    ...options,
  });
  return page.locator('#stage').screenshot();
}

/** Mean absolute per-channel difference over lit pixels, 0..1. */
function litMeanAbsDiff(a: Buffer, b: Buffer): number {
  const imageA = PNG.sync.read(a);
  const imageB = PNG.sync.read(b);
  const length = Math.min(imageA.data.length, imageB.data.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 2 < length; i += 4) {
    const lumA =
      0.2126 * imageA.data[i]! + 0.7152 * imageA.data[i + 1]! + 0.0722 * imageA.data[i + 2]!;
    const lumB =
      0.2126 * imageB.data[i]! + 0.7152 * imageB.data[i + 1]! + 0.0722 * imageB.data[i + 2]!;
    if (Math.max(lumA, lumB) < 10) continue;
    sum += Math.abs(imageA.data[i]! - imageB.data[i]!);
    sum += Math.abs(imageA.data[i + 1]! - imageB.data[i + 1]!);
    sum += Math.abs(imageA.data[i + 2]! - imageB.data[i + 2]!);
    count += 3;
  }
  return count === 0 ? 0 : sum / (count * 255);
}

test('resolution parity: soft blob (256 vs 1024)', async ({ page }) => {
  const low = await shot(page, { config: SOFT_BLOB, resolution: 256 });
  const high = await shot(page, { config: SOFT_BLOB, resolution: 1024 });
  const diff = litMeanAbsDiff(low, high);
  console.log(`[resolution soft blob] 256 vs 1024 = ${diff.toFixed(4)}`);
  expect(diff, 'a soft blob should match across bake resolutions').toBeLessThan(0.01);
});

test('resolution parity: star (256 vs 1024)', async ({ page }) => {
  const low = await shot(page, { preset: 'star', resolution: 256 });
  const high = await shot(page, { preset: 'star', resolution: 1024 });
  const diff = litMeanAbsDiff(low, high);
  console.log(`[resolution star] 256 vs 1024 = ${diff.toFixed(4)}`);
  expect(diff, 'star should match across bake resolutions').toBeLessThan(0.006);
});
