import { test, expect } from '@playwright/test';
import { BASE } from './pages.mjs';
import { stubAnalytics } from './checks.mjs';

// Exercise the actual weather renderer and its WCAG reading surface at five-minute
// intervals, including both ink transitions. Opacity is checked separately: alpha
// on the whole reading surface must not reduce effective text contrast.
for (const width of [390, 1440]) for (const weather of ['clear', 'overcast', 'fog', 'storm']) {
  test(`homepage reading contrast ${width}px ${weather}`, async ({ page }) => {
    await stubAnalytics(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/?wx=${weather}&fast`);
    await page.waitForFunction(() => typeof paint === 'function' && document.body.classList.contains('ready'));
    await page.waitForTimeout(100);
    const contrast = await page.evaluate(() => {
      const luminance = rgb => rgb.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
      const values = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      let text = Infinity, control = Infinity;
      for (let minute = 0; minute < 1440; minute += 5) {
        paint(minute / 60, 0, 0);
        const css = getComputedStyle(document.documentElement);
        const ink = values(css.getPropertyValue('--ink'));
        const paper = values(css.getPropertyValue('--paper'));
        text = Math.min(text, ratio(ink, paper));
        const bar = document.querySelector('.mu .bar');
        if (bar) control = Math.min(control, ratio(values(getComputedStyle(bar).backgroundColor), paper));
      }
      return { text, control };
    });
    expect(contrast.text).toBeGreaterThanOrEqual(4.5);
    expect(contrast.control).toBeGreaterThanOrEqual(3);
    const fadedText = await page.evaluate(() => {
      const failures = [];
      for (const hour of [0, .8, 3.2, 6, 7.4, 11.2, 12.4, 18.5, 21]) {
        scrollTo(0, landY(hour));
        motion(0);
        for (const el of document.querySelectorAll('#dial, .cap, .po h2, .po .tx, .po small, .mu h2, .mu .ctl, .stage h3')) {
          if (getComputedStyle(el).visibility === 'hidden') continue;
          for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
            const css = getComputedStyle(ancestor);
            if (+css.opacity !== 1 || /brightness/.test(css.filter)) failures.push(`${hour}: ${el.className} via ${ancestor.className}: ${css.opacity} ${css.filter}`);
          }
        }
      }
      return failures;
    });
    expect(fadedText).toEqual([]);
    for (const selector of ['#priv', '.mu h2 i', '.mu .ctl button', '.po h2', '.k-turn h3']) {
      await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
    }
  });
}
