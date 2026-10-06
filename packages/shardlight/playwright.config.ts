import { defineConfig, devices } from '@playwright/test';

/**
 * Visual tests: render each preset in a headless Chromium, store
 * golden PNGs, and compare the three targets for parity. These exercise the
 * real `canvas2d` baker and the DOM / three.js / R3F adapters, which the Vitest
 * unit suite never touches.
 */
export default defineConfig({
  testDir: './tests/visual',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  // No platform suffix: goldens are shared, compared within a tolerance.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5199',
    viewport: { width: 400, height: 400 },
    deviceScaleFactor: 1,
    launchOptions: {
      // Allow software WebGL in headless Chromium.
      args: [
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'vite --config tests/visual/vite.config.ts --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
