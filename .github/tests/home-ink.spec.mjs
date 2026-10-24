import { test, expect } from '@playwright/test';
import { BASE } from './pages.mjs';
import { stubAnalytics } from './checks.mjs';

// The day page's text takes its ink from the sky behind it. Land at every hour in four weathers and read each visible
// line against what is actually drawn behind its glyphs: the sky, plus the local dimming under the words.
const READ = () => {
  const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const map = side => new Promise(r => {
    const url = getComputedStyle(document.documentElement).getPropertyValue(`--ink-${side}`).trim().replace(/^url\(["']?|["']?\)$/g, '');
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); r({ w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }); }; img.src = url;
  });
  return Promise.all([map('light'), map('dark')]).then(([light, dark]) => {
    const sky = document.getElementById('sky'), sctx = sky.getContext('2d'), k = sky.width / innerWidth;
    const shade = document.getElementById('shade'), hctx = shade.getContext('2d'), hk = shade.width / innerWidth;
    let low = { ratio: Infinity };
    for (const el of document.querySelectorAll('.sky-ink')) {
      let faded = false;
      for (let n = el; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (+st.opacity < .5 || st.visibility === 'hidden' || st.display === 'none') faded = true; }
      if (faded) continue;
      const m = el.classList.contains('on-light') ? light : dark, range = document.createRange();
      range.selectNodeContents(el);
      for (const t of range.getClientRects()) for (const fx of [.1, .5, .9]) for (const fy of [.3, .7]) {
        if (t.width < 2) continue;
        const x = t.left + t.width * fx, y = t.top + t.height * fy;
        if (x < 4 || x >= innerWidth - 4 || y < 4 || y >= innerHeight - 4) continue;
        const px = sctx.getImageData(Math.floor((x - 4) * k), Math.floor((y - 4) * k), Math.ceil(8 * k), Math.ceil(8 * k)).data;
        let bg = [0, 0, 0]; for (let q = 0; q < px.length; q += 4) { bg[0] += px[q]; bg[1] += px[q + 1]; bg[2] += px[q + 2]; } bg = bg.map(v => v / (px.length / 4));
        const s = hctx.getImageData(Math.floor(x * hk), Math.floor(y * hk), 1, 1).data, a = s[3] / 255;
        bg = bg.map((v, i) => v * (1 - a) + s[i] * a);
        const i = (Math.min(m.h - 1, Math.floor(y / innerHeight * m.h)) * m.w + Math.min(m.w - 1, Math.floor(x / innerWidth * m.w))) * 4;
        const r = ratio(bg, [m.d[i], m.d[i + 1], m.d[i + 2]]);
        if (r < low.ratio) low = { ratio: r, text: el.textContent.trim().slice(0, 40) };
      }
    }
    return low;
  });
};

for (const width of [390, 1440]) for (const weather of ['clear', 'overcast', 'fog', 'storm']) {
  test(`day page text is legible every hour ${width}px ${weather}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'reads canvas pixels; one engine is enough');
    test.setTimeout(240_000);
    await stubAnalytics(page);
    await page.setViewportSize({ width, height: 900 });
    const fails = [];
    for (let hour = 0; hour < 24; hour++) {
      await page.goto(`${BASE}/?hour=${hour + .5}&wx=${weather}&fast`);
      await page.waitForFunction(() => document.body.classList.contains('ready') && document.querySelector('.sky-ink'));
      await page.waitForTimeout(800);
      const low = await page.evaluate(READ);
      if (low.ratio < 3) fails.push(`${hour}:30 ${low.ratio.toFixed(2)} "${low.text}"`);
    }
    expect(fails).toEqual([]);
  });
}

// The status pages take the same sky with one ink, light or dark, and a soft halo in the other tone under the letters.
// Read every line against the sky drawn behind it, with the halo counted at half its depth, about what a 2.5px blur
// leaves at the edge of a glyph.
const READ_STATUS = () => {
  const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const sky = document.getElementById('sky'), sctx = sky.getContext('2d'), k = sky.width / innerWidth;
  const root = getComputedStyle(document.documentElement), halo = rgb(root.getPropertyValue('--halo')), ha = halo.length === 3 ? +root.getPropertyValue('--halo-a') / 2 : 0;
  let low = { ratio: Infinity, read: 0 };
  for (const el of document.querySelectorAll('h1, p, .go, #clock, #work, .cap')) {
    let op = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const st = getComputedStyle(n); op *= +st.opacity; if (st.visibility === 'hidden' || st.display === 'none') op = 0; }
    if (op < .5) continue;
    const ink = rgb(getComputedStyle(el).color), range = document.createRange();
    range.selectNodeContents(el);
    for (const t of range.getClientRects()) for (const fx of [.1, .5, .9]) for (const fy of [.3, .7]) {
      if (t.width < 2) continue;
      const x = t.left + t.width * fx, y = t.top + t.height * fy;
      if (x < 4 || x >= innerWidth - 4 || y < 4 || y >= innerHeight - 4) continue;
      const px = sctx.getImageData(Math.floor((x - 4) * k), Math.floor((y - 4) * k), Math.ceil(8 * k), Math.ceil(8 * k)).data;
      let bg = [0, 0, 0]; for (let q = 0; q < px.length; q += 4) { bg[0] += px[q]; bg[1] += px[q + 1]; bg[2] += px[q + 2]; } bg = bg.map(v => v / (px.length / 4));
      const under = ha ? bg.map((v, i) => v * (1 - ha) + halo[i] * ha) : bg, fg = ink.map((v, i) => v * op + under[i] * (1 - op));
      const r = ratio(under, fg) || 0;
      low.read++;
      if (r < low.ratio) low = { ...low, ratio: r, text: el.textContent.trim().slice(0, 40) };
    }
  }
  return low;
};

for (const status of ['200', '301', '403', '410', '500', '503']) {
  test(`status page ${status} text is legible every hour`, async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'reads canvas pixels; one engine is enough');
    test.setTimeout(240_000);
    await stubAnalytics(page);
    const fails = [];
    // A phone upright, and a phone on its side, where the lines sit down near the horizon.
    for (const [width, height] of [[390, 844], [852, 393]]) {
      await page.setViewportSize({ width, height });
      for (let hour = 0; hour < 24; hour += .5) {
        await page.goto(`${BASE}/status/${status}.html?h=${hour}`);
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--ink'));
        await page.waitForTimeout(300);
        const low = await page.evaluate(READ_STATUS);
        if (!low.read) fails.push(`${width}px ${hour} read no text`);
        else if (low.ratio < 3) fails.push(`${width}px ${hour} ${low.ratio.toFixed(2)} "${low.text}"`);
      }
    }
    expect(fails).toEqual([]);
  });
}

test('day page text has no resting fade', async ({ page }) => {
  await stubAnalytics(page);
  await page.goto(`${BASE}/?hour=12&fast`);
  await page.waitForFunction(() => document.body.classList.contains('ready'));
  for (const selector of ['#priv', '.mu h2 i', '.mu .ctl button', '.po h2', '.k-turn h3']) {
    await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
  }
});

test('opening line gives the time here, then gets out of the way', async ({ page }) => {
  await stubAnalytics(page);
  await page.goto(`${BASE}/`);
  const note = page.locator('#opening-note');
  await expect(note).toHaveText(/^\d\d:\d\d where you are(; [a-z]+ (today|tonight))?\.$/, { timeout: 8000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && !document.body.classList.contains('booting'), null, { timeout: 15000 });
  await expect.poll(() => note.evaluate(n => +getComputedStyle(n).opacity)).toBe(0);
  await expect(page.locator('#chrome')).toHaveClass(/ready/);
});
