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
