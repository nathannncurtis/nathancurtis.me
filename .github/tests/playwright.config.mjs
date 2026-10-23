// Browsers and devices for nathancurtis.me. CI picks projects per OS with --project.
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true }; // Firefox has no isMobile; size and touch only

export default defineConfig({
  testDir: '.',
  testMatch: /\.spec\.mjs$/,
  outputDir: `${root}/test-results`,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `${root}/playwright-report` }]],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  webServer: {
    command: 'node .github/tests/node_modules/wrangler/bin/wrangler.js dev --port 8787 --ip 127.0.0.1 --log-level warn',
    cwd: root,
    url: 'http://127.0.0.1:8787/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'headers', testMatch: /headers\.spec\.mjs$/ },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'galaxy-s9', use: { ...devices['Galaxy S9+'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'iphone-15', use: { ...devices['iPhone 15 Pro Max'] } },
    { name: 'iphone-15-landscape', use: { ...devices['iPhone 15 Pro Max landscape'] } },
    { name: 'ipad', use: { ...devices['iPad Pro 11'] } },
    { name: 'firefox-phone', use: { ...devices['Desktop Firefox'], ...phone } },
  ].map(p => p.name === 'headers' ? p : { ...p, testIgnore: /headers\.spec\.mjs$/ }),
});
