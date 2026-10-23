import { test, expect } from '@playwright/test';
import { BASE, PAGES } from './pages.mjs';
import { visit } from './checks.mjs';

for (const p of PAGES) {
  test(`${p.path} loads clean`, async ({ page }, info) => {
    const problems = await visit(page, BASE, p);
    // WebKit's screenshot helper injects `body {}` to synchronize animations.
    // Check site errors before that tooling-only inline stylesheet is attempted.
    expect(problems, problems.join('\n')).toEqual([]);
    await page.screenshot({ path: info.outputPath('screen.png'), caret: 'initial' });
  });
}
