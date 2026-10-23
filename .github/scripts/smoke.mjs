// Open every page in Chromium against `wrangler dev` (files, _headers and the Worker, as Cloudflare serves them)
// and fail on any script error, console error or CSP violation.
import { chromium } from 'playwright';

// A name that isn't localhost, so the page calls this Worker's /sky instead of borrowing the live one.
const base = 'http://site.test:8787';
const pages = ['/', '/work', '/privacy', '/no-such-page', ...['200', '301', '403', '410', '500', '503'].map(s => `/status/${s}.html`)];
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP site.test 127.0.0.1'] });
let bad = 0;
for (const path of pages) {
  const page = await browser.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('console', m => {
    // The beacon and the GitHub API are outside calls; their failing in CI says nothing about the site.
    // The 404 page's own 404 is the point of it.
    const from = m.location().url ?? '';
    if (m.type() !== 'error' || /cloudflareinsights|api\.github\.com/.test(m.text() + from) || from === base + path) return;
    problems.push(`console: ${m.text()}`);
  });
  const res = await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const want = path === '/no-such-page' ? 404 : 200;
  if (res.status() !== want) problems.push(`status ${res.status()}, want ${want}`);
  for (const p of problems) console.log(`::error::${path}: ${p}`);
  bad += problems.length;
  await page.close();
}
await browser.close();
if (bad) process.exit(1);
console.log(`smoke ok (${pages.length} pages)`);
