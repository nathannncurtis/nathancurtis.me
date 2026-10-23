import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BASE } from './pages.mjs';

for (const colorScheme of ['light', 'dark']) for (const width of [390, 820, 1440]) {
  test(`work readable ${colorScheme} ${width}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(BASE + '/work');
    await page.locator('.meta').first().waitFor();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 650) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(80); }
    const audit = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(audit.violations).toEqual([]);
    await page.locator('header a').first().focus();
    expect(await page.locator('header a').first().evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  });
}

for (const colorScheme of ['light', 'dark']) test(`work figure native keyboard scrolling ${colorScheme}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/work');
  const figure = page.locator('figure').first();
  await expect(figure).toHaveAttribute('tabindex', '0');
  await expect(figure).toHaveAccessibleName(/The pattern, end to end/);
  // Tab must reach the native scroll container from the preceding project link.
  await page.locator('.side h2 a').first().focus();
  await page.keyboard.press('Tab');
  await expect(figure).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => figure.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(figure).not.toBeFocused();
  const audit = await new AxeBuilder({ page }).withRules(['scrollable-region-focusable']).analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect.poll(() => page.locator('figure').first().getAttribute('tabindex')).toBe('-1');
});
