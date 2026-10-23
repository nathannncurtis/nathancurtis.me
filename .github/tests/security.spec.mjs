import { test } from '@playwright/test';
import { BASE } from './pages.mjs';
import { verifySecurity } from './security-browser.mjs';

test('all documents enforce CSP and reject inline code and tampered SRI', async ({ browser }, info) => {
  test.skip(!['chromium', 'firefox', 'webkit'].includes(info.project.name), 'desktop engine policy coverage');
  await verifySecurity(browser, BASE);
});
