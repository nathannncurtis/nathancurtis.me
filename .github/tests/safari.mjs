// Real Safari through safaridriver: desktop Safari on this Mac, or Safari in the booted iOS Simulator.
//   node safari.mjs desktop | node safari.mjs ios
import { Builder } from 'selenium-webdriver';
import safari from 'selenium-webdriver/safari.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE, PAGES } from './pages.mjs';
import { visitWd } from './wd-checks.mjs';

const target = process.argv[2] ?? 'desktop';
const opts = new safari.Options();
if (target === 'ios') opts.set('platformName', 'iOS').set('safari:useSimulator', true).set('safari:deviceType', 'iPhone');
// The first session to a freshly booted simulator can time out finding Safari; a later attempt finds it.
let driver;
for (let attempt = 1; !driver; attempt++) {
  try {
    driver = await new Builder().forBrowser('safari').setSafariOptions(opts).build();
  } catch (e) {
    if (attempt === 3) throw e;
    console.log(`::warning::safari ${target}: session attempt ${attempt} failed (${e.message.split('\n')[0]}), retrying`);
    await new Promise(r => setTimeout(r, 15_000));
  }
}
const shots = `../../test-results/safari-${target}`;
mkdirSync(shots, { recursive: true });
let bad = 0;
try {
  for (const p of PAGES) {
    const problems = await visitWd(driver, BASE, p);
    writeFileSync(`${shots}/${p.path.replace(/\W+/g, '_') || 'home'}.png`, await driver.takeScreenshot(), 'base64');
    for (const x of problems) console.log(`::error::safari ${target} ${p.path}: ${x}`);
    bad += problems.length;
  }
} finally {
  await driver.quit();
}
if (bad) process.exit(1);
console.log(`safari ${target} ok (${PAGES.length} pages)`);
