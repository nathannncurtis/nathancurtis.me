import { test, expect } from '@playwright/test';
import { BASE } from './pages.mjs';
import { stubAnalytics } from './checks.mjs';
for (const width of [390, 1440]) for (const deviceScaleFactor of [1, 2]) {
  test(`responsive gallery ${width}px DPR ${deviceScaleFactor}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor });
    const page = await context.newPage();
    await stubAnalytics(page);
    await page.goto(`${BASE}/?hour=12&fast`);
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    const photos = page.locator('img[srcset]');
    expect(await photos.count()).toBeGreaterThan(20);
    expect(await photos.evaluateAll(imgs => imgs.every(i => i.width > 0 && i.height > 0 && i.getAttribute('width') && i.getAttribute('height')))).toBe(true);
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((s, r) => s + r.encodedBodySize, 0));
    expect(bytes).toBeLessThan(width < 760 ? 6_000_000 : 8_000_000);
    for (const image of await photos.all()) {
      await image.evaluate(i => i.scrollIntoView({ block: 'center', behavior: 'instant' }));
      // Every photo must arrive; how fast is Lighthouse's job, and parallel CI workers share one slow dev server.
      await expect.poll(() => image.evaluate(i => i.complete && i.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    }
    await page.evaluate(() => openLight(0));
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#light .pic')).backgroundImage.includes(photos[0].p.src))).toBe(true);
    await context.close();
  });
}
