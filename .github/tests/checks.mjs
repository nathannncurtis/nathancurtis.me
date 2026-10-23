// What every page must get right in a Playwright browser. Returns a list of problems; empty is a pass.
import AxeBuilder from '@axe-core/playwright';
import { OUTSIDE } from './pages.mjs';

export function watch(page, base) {
  const problems = [];
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const from = m.location().url ?? '';
    // The 404 page's own 404 is the point of it.
    if (OUTSIDE.test(m.text() + from) || (/404/.test(m.text()) && from === page.url())) return;
    problems.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', r => {
    // A navigation or scroll can abort media and images mid-flight; that isn't a fault.
    if (r.url().startsWith(base) && !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(r.failure()?.errorText ?? '')) problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', r => {
    if (r.url().startsWith(base) && r.status() >= 400 && r.request().resourceType() !== 'document') problems.push(`${r.status()} for ${r.url()}`);
  });
  return problems;
}

export async function visit(page, base, { path, status }, { axe = true } = {}) {
  const problems = watch(page, base);
  const res = await page.goto(base + path, { waitUntil: 'load' });
  if (res.status() !== status) problems.push(`status ${res.status()}, want ${status}`);
  await page.waitForTimeout(1000);

  // Scroll the whole page in steps, so scroll-driven code and lazy images all run.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += Math.max(400, Math.floor(height / 12))) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  problems.push(...await page.evaluate(async () => {
    const out = [];
    await document.fonts.ready;
    for (const f of document.fonts) if (f.status === 'error') out.push(`font failed: ${f.family} ${f.weight} ${f.style}`);
    for (const img of document.images) if (img.complete && img.currentSrc && img.naturalWidth === 0) out.push(`image failed: ${img.currentSrc}`);
    const over = document.documentElement.scrollWidth - window.innerWidth;
    if (over > 1) out.push(`page is ${over}px wider than the screen`);
    if (!document.body.innerText.trim() && !document.querySelector('canvas, svg, img')) out.push('page is empty');
    return out;
  }));

  if (axe) {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical'))
      problems.push(`axe ${v.impact}: ${v.id} (${v.help}) at ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`);
  }
  return problems;
}
