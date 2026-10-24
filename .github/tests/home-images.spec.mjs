import { test, expect } from '@playwright/test';
import { BASE } from './pages.mjs';
import { stubAnalytics } from './checks.mjs';
for (const width of [390, 1440]) for (const deviceScaleFactor of [1, 2]) {
  test(`responsive gallery ${width}px DPR ${deviceScaleFactor}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor });
    const page = await context.newPage();
    await stubAnalytics(page);
    // Whether the page is being scheduled at all: frames and timers since load, long tasks, and if it thinks it's hidden.
    await page.addInitScript(() => {
      const v = window.__vitals = { frames: 0, ticks: 0, long: 0, longest: 0, busy: 0 };
      const tick = () => { v.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      setInterval(() => v.ticks++, 100);
      new PerformanceObserver(l => { for (const e of l.getEntries()) { v.long++; v.busy += e.duration; v.longest = Math.max(v.longest, e.duration); } }).observe({ type: 'longtask', buffered: true });
    });
    const vitals = () => page.evaluate(() => `${document.visibilityState}${document.hasFocus() ? '' : ' unfocused'} ${Math.round(performance.now())}ms up, ${__vitals.frames} frames, ${__vitals.ticks} timer ticks, ${__vitals.long} long tasks (${Math.round(__vitals.busy)}ms, longest ${Math.round(__vitals.longest)}ms)`);
    await page.goto(`${BASE}/?hour=12&fast`);
    await page.waitForFunction(() => document.body.classList.contains('ready'));
    const photos = page.locator('img[srcset]');
    expect(await photos.count()).toBeGreaterThan(20);
    expect(await photos.evaluateAll(imgs => imgs.every(i => i.width > 0 && i.height > 0 && i.getAttribute('width') && i.getAttribute('height')))).toBe(true);
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((s, r) => s + r.encodedBodySize, 0));
    // The whole gallery loads behind the opening, so this is the gallery's weight, not just the first screen's.
    expect(bytes).toBeLessThan(width < 760 ? 14_000_000 : 18_000_000);
    // What every photo did: which file the browser chose, whether it arrived, how long the fetch took and how big it was.
    const ledger = () => page.evaluate(() => [...document.querySelectorAll('img[srcset]')].map((i, n) => {
      const r = performance.getEntriesByName(i.currentSrc)[0], name = i.currentSrc.split('/').pop();
      return `${String(n).padStart(2)} ${name} complete=${i.complete} natural=${i.naturalWidth} loading=${i.loading} priority=${i.fetchPriority}`
        + (r ? ` start=${Math.round(r.startTime)}ms took=${Math.round(r.duration)}ms bytes=${r.transferSize} status=${r.responseStatus}` : ' no response yet');
    }).join('\n'));
    const t0 = Date.now();
    let n = 0, slowestPoll = 0;
    for (const image of await photos.all()) {
      await image.evaluate(i => i.scrollIntoView({ block: 'center', behavior: 'instant' }));
      // Every photo must arrive; how fast is Lighthouse's job, and parallel CI workers share one slow dev server.
      // Each poll's round trip is kept: a page that answers "not yet" and a page that doesn't answer are different failures.
      const t1 = Date.now(); let arrived = false, polls = 0, slowest = 0;
      while (!arrived && Date.now() - t1 < 15_000) {
        const p = Date.now();
        arrived = await image.evaluate(i => i.complete && i.naturalWidth > 0);
        slowest = Math.max(slowest, Date.now() - p); polls++;
        if (!arrived) await page.waitForTimeout(100);
      }
      slowestPoll = Math.max(slowestPoll, slowest);
      if (!arrived) {
        const src = await image.evaluate(i => i.currentSrc);
        console.log(`photo ${n} (${src}) didn't arrive in 15s, ${Date.now() - t0}ms into the gallery; ${polls} polls, slowest ${slowest}ms; page: ${await vitals()}\n${await ledger()}`);
        expect(arrived, `photo ${n} (${src}) didn't arrive in 15s`).toBe(true);
      }
      n++;
    }
    const sum = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.initiatorType === 'img').reduce((s, r) => ({ n: s.n + 1, bytes: s.bytes + r.transferSize, slowest: Math.max(s.slowest, r.duration) }), { n: 0, bytes: 0, slowest: 0 }));
    console.log(`${width}px DPR ${deviceScaleFactor}: ${sum.n} photos, ${(sum.bytes / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s, slowest fetch ${Math.round(sum.slowest)}ms, slowest poll ${slowestPoll}ms; page: ${await vitals()}`);
    // Opening the lightbox flies the thumbnail up (950ms), then swaps in the full-size file once it has decoded.
    // The same 15s the photos got: the full file comes off the same shared server, and the swap waits on the fly.
    const t1 = Date.now();
    await page.evaluate(() => openLight(0));
    const swapped = await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#light .pic')).backgroundImage.includes(photos[0].p.src)), { timeout: 15_000 }).toBe(true).then(() => true, () => false);
    const light = await page.evaluate(() => {
      const want = photos[0].p.src, r = performance.getEntriesByName(location.origin + want)[0];
      const anims = document.getAnimations().filter(a => a.effect?.target?.closest?.('#light, #fly')).map(a => `${a.effect.target.id || a.effect.target.className}:${a.playState}@${Math.round(a.currentTime ?? -1)}`);
      return `light="${document.getElementById('light').className}" fly=${document.getElementById('fly').style.display || 'unset'} pic=${getComputedStyle(document.querySelector('#light .pic')).backgroundImage.split('/').pop()} want=${want.split('/').pop()}`
        + (r ? ` full: start=${Math.round(r.startTime)}ms took=${Math.round(r.duration)}ms bytes=${r.transferSize} status=${r.responseStatus}` : ' full: no response yet') + ` animations=[${anims.join(' ')}]`;
    });
    console.log(`${width}px DPR ${deviceScaleFactor}: lightbox ${swapped ? 'swapped to the full file' : 'did not swap'} in ${Date.now() - t1}ms; ${light}`);
    expect(swapped, `lightbox didn't swap to the full file in 15s; ${light}`).toBe(true);
    await context.close();
  });
}
