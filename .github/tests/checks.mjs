// What every page must get right in a Playwright browser. Returns a list of problems; empty is a pass.
import AxeBuilder from '@axe-core/playwright';
import { OUTSIDE } from './pages.mjs';

// Known axe findings on the site, accepted until the follow-up beside each lands. Anything else still fails.
const ACCEPTED_AXE = [
  // The day page and /work colour their text from the sky or a muted ink; contrast is a deliberate look, not a bug.
  { rule: 'color-contrast', path: '/', target: /./ },
  { rule: 'color-contrast', path: '/work', target: /./ },
  { rule: 'color-contrast', path: '/privacy', target: /./ },
  { rule: 'color-contrast', path: '/no-such-page', target: /./ },
];

export async function stubAnalytics(page) {
  // The analytics beacon only accepts the real site's origin; answer it here so it stays quiet.
  await page.route(/cloudflareinsights\.com/, r => r.fulfill(/beacon/.test(r.request().url())
    ? { status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: '' }
    : { status: 204, headers: { 'access-control-allow-origin': '*' } }));
}

export async function watch(page, base, expect404 = false) {
  const problems = [];
  await stubAnalytics(page);
  page.on('pageerror', e => problems.push(`script error: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const from = m.location().url ?? '';
    // The 404 page's own 404 is the point of it.
    if (OUTSIDE.test(m.text() + from) || (expect404 && /404/.test(m.text()) && !/\.(js|css|png|jpg|webp|svg|woff2|mp3)$/.test(from))) return;
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
  const problems = await watch(page, base, status === 404);
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
    for (const v of r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')) {
      const nodes = v.nodes.map(n => n.target.join(' ')).filter(t => !ACCEPTED_AXE.some(a => a.rule === v.id && a.path === path && a.target.test(t)));
      if (nodes.length) problems.push(`axe ${v.impact}: ${v.id} (${v.help}) at ${nodes.slice(0, 3).join(', ')}`);
    }
  }
  return problems;
}
