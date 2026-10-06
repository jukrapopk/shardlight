import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import './types.js';

const presets = [
  'star',
  'sun',
  'anamorphic',
  'sparkle',
  'neon',
  'ember',
  'starburst',
  'frost',
] as const;
type Target = 'dom' | 'three' | 'r3f';

/**
 * Mean absolute per-channel difference, 0..1. Robust to a handful of stray
 * pixels (unlike a raw diff count) and to minor sRGB-vs-linear rounding.
 *
 * Known, accepted difference: the DOM composites layers with canvas
 * `lighter` / CSS `plus-lighter` in sRGB space, while the 3D targets add in
 * three.js's linear working space and re-encode. That makes faint overlapping
 * rays a little dimmer in 3D. three and R3F share the same pipeline, so they
 * match almost exactly.
 */
function meanAbsDiff(a: Buffer, b: Buffer): number {
  const imageA = PNG.sync.read(a);
  const imageB = PNG.sync.read(b);
  const length = Math.min(imageA.data.length, imageB.data.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 2 < length; i += 4) {
    sum += Math.abs(imageA.data[i]! - imageB.data[i]!);
    sum += Math.abs(imageA.data[i + 1]! - imageB.data[i + 1]!);
    sum += Math.abs(imageA.data[i + 2]! - imageB.data[i + 2]!);
    count += 3;
  }
  return sum / (count * 255);
}

/** Fraction of pixels above a low luminance threshold; a "not blank" check. */
function litFraction(buffer: Buffer): number {
  const image = PNG.sync.read(buffer);
  let lit = 0;
  const pixels = image.width * image.height;
  for (let i = 0; i + 2 < image.data.length; i += 4) {
    const l = 0.2126 * image.data[i]! + 0.7152 * image.data[i + 1]! + 0.0722 * image.data[i + 2]!;
    if (l > 8) lit += 1;
  }
  return lit / pixels;
}

async function shot(page: Page, target: Target, preset: string): Promise<Buffer> {
  await page.goto('/');
  await page.evaluate((options) => window.__harness.render(options), { target, preset });
  return page.locator('#stage').screenshot();
}

for (const preset of presets) {
  test(`parity: ${preset}`, async ({ page }) => {
    const dom = await shot(page, 'dom', preset);
    const three = await shot(page, 'three', preset);
    const r3f = await shot(page, 'r3f', preset);

    // Guard against a vacuous pass: every target must actually draw light.
    expect(litFraction(dom), `${preset}: dom draws something`).toBeGreaterThan(0.005);
    expect(litFraction(three), `${preset}: three draws something`).toBeGreaterThan(0.001);
    expect(litFraction(r3f), `${preset}: r3f draws something`).toBeGreaterThan(0.001);

    const domThree = meanAbsDiff(dom, three);
    const threeR3f = meanAbsDiff(three, r3f);
    const domR3f = meanAbsDiff(dom, r3f);
    console.log(
      `[parity ${preset}] dom/three=${domThree.toFixed(4)} three/r3f=${threeR3f.toFixed(4)} dom/r3f=${domR3f.toFixed(4)}`,
    );

    // Same pipeline: should be near-identical.
    expect(threeR3f, 'three vs r3f').toBeLessThan(0.02);
    // Different colour spaces: allow a few percent (see note above).
    expect(domThree, 'dom vs three').toBeLessThan(0.08);
    expect(domR3f, 'dom vs r3f').toBeLessThan(0.08);
  });
}
