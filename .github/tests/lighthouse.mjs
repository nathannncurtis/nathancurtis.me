// Lighthouse on every page, as a phone (throttled 4G, slow CPU) and as a desktop. Three runs each, median scores.
// Fails when a category drops under its floor or a budget is exceeded. Reports land in ../../lighthouse/.
import lighthouse from 'lighthouse';
import desktop from 'lighthouse/core/config/desktop-config.js';
import * as launcher from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { BASE } from './pages.mjs';

// Scores are 0-100. Raise a floor when the page gets better; never lower one to go green.
// A floor of 100 is checked audit by audit, so an accepted audit below doesn't hide a new one.
const FLOORS = {
  mobile: { performance: 90, accessibility: 100, 'best-practices': 100, seo: 100 },
  desktop: { performance: 95, accessibility: 100, 'best-practices': 100, seo: 100 },
};
// Known findings on the site, accepted until the follow-up named beside each lands. Keys: path, or path@form.
const ACCEPTED = {
  '/work': ['color-contrast'],
  '/privacy': ['color-contrast'],
};
const LOCAL = !/^https:/.test(BASE);
const SETTINGS = {
  // Served over http on this machine, so HTTPS can't be judged here (live.yml does, on the real site),
  // and the analytics beacon refuses an origin that isn't the site's.
  ...(LOCAL ? { skipAudits: ['is-on-https', 'redirects-http'], blockedUrlPatterns: ['*cloudflareinsights.com*'] } : {}),
};
// Bytes transferred on first load and timings in ms, per form factor. The day page loads its whole gallery behind
// the opening, so the totals cover every photo.
const BUDGETS = {
  mobile: { 'largest-contentful-paint': 4000, 'cumulative-layout-shift': 0.1, 'total-blocking-time': 300, script: 300_000, font: 400_000, total: 14_000_000 },
  desktop: { 'largest-contentful-paint': 2500, 'cumulative-layout-shift': 0.1, 'total-blocking-time': 200, script: 300_000, font: 400_000, total: 18_000_000 },
};
// Lighthouse won't score a page that answers 404, so the 404 page is left to the browser tests.
const PATHS = ['/', '/work', '/privacy'];
const RUNS = Number(process.env.LH_RUNS ?? 3);

const out = new URL('../../lighthouse/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const chrome = await launcher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--host-resolver-rules=MAP site.localhost 127.0.0.1'] });
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows = [];
let bad = 0;
try {
  for (const form of ['mobile', 'desktop']) {
    for (const path of PATHS) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await lighthouse(BASE + path, { port: chrome.port, output: 'html', logLevel: 'error', ...SETTINGS }, form === 'desktop' ? desktop : undefined);
        runs.push(r);
      }
      const lhr = runs.map(r => r.lhr);
      const pick = lhr.indexOf(lhr.find(l => l.categories.performance.score === median(lhr.map(l => l.categories.performance.score))));
      writeFileSync(`${out}${form}${path.replace(/\W+/g, '_') || '_home'}.html`, runs[pick].report);
      const l = lhr[pick];
      const scores = Object.fromEntries(Object.keys(FLOORS[form]).map(k => [k, Math.round(median(lhr.map(x => x.categories[k].score)) * 100)]));
      const ok = new Set([...(ACCEPTED[path] ?? []), ...(ACCEPTED[`${path}@${form}`] ?? [])]);
      const problems = [];
      const a = l.audits, b = BUDGETS[form];
      for (const [k, floor] of Object.entries(FLOORS[form])) {
        if (floor < 100) { if (scores[k] < floor && !ok.has(k)) problems.push(`${k} ${scores[k]} < ${floor}`); continue; }
        for (const ref of l.categories[k].auditRefs)
          if (ref.weight > 0 && a[ref.id].score !== null && a[ref.id].score < 1 && !ok.has(ref.id)) problems.push(`${k}: ${ref.id} (${a[ref.id].title})`);
      }
      for (const t of ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time']) if (a[t].numericValue > b[t] && !ok.has(t)) problems.push(`${t} ${Math.round(a[t].numericValue * 1000) / 1000} > ${b[t]}`);
      const bytes = Object.fromEntries((a['resource-summary']?.details?.items ?? []).map(i => [i.resourceType, i.transferSize]));
      for (const t of ['script', 'font', 'total']) if ((bytes[t] ?? 0) > b[t] && !ok.has(t)) problems.push(`${t} ${bytes[t]} bytes > ${b[t]}`);
      rows.push(`| ${form} | ${path} | ${Object.values(scores).join(' | ')} | ${Math.round(a['largest-contentful-paint'].numericValue)} | ${Math.round((bytes.total ?? 0) / 1024)} KB |`);
      for (const p of problems) console.log(`::error::lighthouse ${form} ${path}: ${p}`);
      bad += problems.length;
      console.log(`${form} ${path}`, scores);
    }
  }
} finally {
  await chrome.kill();
}
const table = ['| form | page | perf | a11y | best practices | SEO | LCP ms | weight |', '|---|---|---|---|---|---|---|---|', ...rows].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse\n\n${table}\n`);
if (bad) process.exit(1);
console.log('lighthouse ok');
