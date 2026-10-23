import { test, expect } from '@playwright/test';

// Exercise the actual weather renderer and its WCAG reading surface at five-minute
// intervals, including both ink transitions. Opacity is checked separately: alpha
// on the whole reading surface must not reduce effective text contrast.
for (const width of [390, 1440]) for (const weather of ['clear', 'overcast', 'fog', 'storm']) {
  test(`homepage reading contrast ${width}px ${weather}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?wx=${weather}`);
    await page.waitForFunction(() => typeof paint === 'function');
    const minimum = await page.evaluate(() => {
      const luminance = rgb => rgb.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
      let minimum = Infinity;
      for (let minute = 0; minute < 1440; minute += 5) {
        paint(minute / 60, 0, 0);
        const css = getComputedStyle(document.documentElement);
        const ink = css.getPropertyValue('--ink').match(/[\d.]+/g).map(Number);
        const paper = css.getPropertyValue('--paper').match(/[\d.]+/g).map(Number);
        const a = luminance(ink), b = luminance(paper);
        minimum = Math.min(minimum, (Math.max(a, b) + .05) / (Math.min(a, b) + .05));
      }
      return minimum;
    });
    expect(minimum).toBeGreaterThanOrEqual(4.5);
    for (const selector of ['#priv', '.mu h2 i', '.mu .ctl button', '.po h2', '.k-turn h3']) {
      await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
    }
  });
}
