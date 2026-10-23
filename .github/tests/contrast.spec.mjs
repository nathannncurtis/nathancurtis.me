import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BASE } from './pages.mjs';

test('day text keeps AA contrast through one full scroll in every weather', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The contrast matrix runs once in Chromium; other projects cover their browser behavior.');
  test.setTimeout(240_000);
  const failures = [];
  for (const weather of ['clear', 'rain', 'snow', 'storm']) {
    await page.goto(`${BASE}/?hour=0&wx=${weather}&fast`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 15_000 });
    await page.waitForTimeout(750);
    const { start, end } = await page.evaluate(() => ({
      start: scrollY,
      // Stop when the center of the viewport reaches the beginning of the cloned
      // first scene, after passing through the full original day.
      end: document.querySelector('#day').lastElementChild.offsetTop - innerHeight / 2
    }));
    const steps = 48;
    for (let step = 0; step <= steps; step++) {
      const y = start + (end - start) * step / steps;
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(100);
      const count = await page.evaluate(() => {
        document.querySelectorAll('[data-a11y-contrast]').forEach(el => el.removeAttribute('data-a11y-contrast'));
        for (const el of document.querySelectorAll('body *')) {
          if (![...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) continue;
          el.setAttribute('data-a11y-contrast', '');
        }
        return document.querySelectorAll('[data-a11y-contrast]').length;
      });
      expect(count, `No visible text at scroll ${step}/${steps} in ${weather}`).toBeGreaterThan(0);
      const result = await new AxeBuilder({ page }).withRules(['color-contrast']).include('[data-a11y-contrast]').analyze();
      for (const violation of result.violations) {
        failures.push(`scroll ${step}/${steps} ${weather}: ${violation.nodes.slice(0, 3).map(n => `${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim()}`).join('; ')}`);
      }
    }
  }
  expect(failures, failures.join('\n')).toEqual([]);
});
