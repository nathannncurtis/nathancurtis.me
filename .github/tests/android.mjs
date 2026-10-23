// Real Chrome for Android in the emulator, driven over its DevTools socket, with the same checks as Playwright.
// The workflow forwards the socket to localhost:9222; the emulator reaches this machine at 10.0.2.2.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PAGES } from './pages.mjs';
import { visit } from './checks.mjs';
import { androidVersion } from './android-version.mjs';
const provenance = await androidVersion();

const base = process.env.ANDROID_BASE ?? 'http://10.0.2.2:8787';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
const identity = await context.newPage();
const ua = await identity.evaluate(() => navigator.userAgent);
console.log('Android browser user agent:', ua);
if (!/Android/.test(ua)) throw Error('The CDP target is not Android');
const cdpVersion = await browser.version();
if (cdpVersion.split('.')[0] !== provenance.version.split('.')[0]) throw Error(`CDP browser ${cdpVersion} differs from installed ${provenance.version}`);
await identity.close();
mkdirSync('../../test-results/android', { recursive: true });
// Straight after boot the emulator's network can still be coming up (ERR_ADDRESS_UNREACHABLE); wait for the host.
const probe = await context.newPage();
for (let i = 1; ; i++) {
  try { await probe.goto(base + '/', { timeout: 10_000 }); break; }
  catch (e) { if (i === 30) throw e; await new Promise((r) => setTimeout(r, 2000)); }
}
await probe.close();
let bad = 0;
for (const p of PAGES) {
  const page = await context.newPage();
  // axe runs in the desktop and device projects already; here the question is whether real Chrome on a phone copes.
  const problems = await visit(page, base, p, { axe: false });
  await page.screenshot({ path: `../../test-results/android/${p.path.replace(/\W+/g, '_') || 'home'}.png` });
  for (const x of problems) console.log(`::error::android chrome ${p.path}: ${x}`);
  bad += problems.length;
  await page.close();
}
await browser.close();
if (bad) process.exit(1);
console.log(`android ${provenance.product} ${provenance.version} ok (${PAGES.length} pages)`);
