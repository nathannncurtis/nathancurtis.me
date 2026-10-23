import { test, expect } from '@playwright/test';
import { BASE, PAGES } from './pages.mjs';
import { visit } from './checks.mjs';

for (const p of PAGES) {
  test(`${p.path} loads clean`, async ({ page }, info) => {
    const problems = await visit(page, BASE, p);
    await page.screenshot({ path: info.outputPath('screen.png') });
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
