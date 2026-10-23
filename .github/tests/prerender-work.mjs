// Refresh the checked-in initial /work document after editing its entries or figure templates.
// Start the site locally, then BASE=http://127.0.0.1:8787 node .github/tests/prerender-work.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { BASE } from './pages.mjs';
const file = new URL('../../work/index.html', import.meta.url);
const source = readFileSync(file, 'utf8');
const empty = source.replace(/<main id="list">[\s\S]*?<\/main>/, '<main id="list"></main>');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route('**/work{,/}', route => route.fulfill({ contentType: 'text/html', body: empty }));
  await page.route(/api.github.com|cloudflareinsights.com/, route => route.abort());
  await page.goto(BASE + '/work/');
  await page.locator('.meta').first().waitFor();
  const html = (await page.locator('#list').innerHTML()).replaceAll('e reveal', 'e shown');
  const rules = await page.evaluate(() => [...[...document.styleSheets].find(s => s.href?.endsWith('/assets/runtime.css')).cssRules].map(r => r.cssText).join('\n'));
  writeFileSync(new URL('../../assets/work-prerender.css', import.meta.url), rules + '\n');
  writeFileSync(file, source.replace(/<main id="list">[\s\S]*?<\/main>/, `<main id="list">${html}</main>`));
} finally { await browser.close(); }
