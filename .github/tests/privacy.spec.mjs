import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BASE } from './pages.mjs';

for (const hour of [0, 6, 6.5, 7, 12, 18, 18.5, 19, 23]) {
  test(`privacy text remains readable at hour ${hour}`, async ({ page }) => {
    await page.route(/cloudflareinsights\.com/, r => r.fulfill({ status: 200, body: '' }));
    await page.goto(`${BASE}/privacy?h=${hour}`);
    await expect(page.locator('#when')).toHaveText('October 18, 2026');
    const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  });
}
