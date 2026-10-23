// Physical phones and tablets on BrowserStack, reaching this runner's wrangler dev through BrowserStack Local.
// A button in the Actions tab (devices.yml), not part of CI: the free trial is 100 minutes in all.
// A used-up trial or a refused session is a warning, not a failure.
import { Builder } from 'selenium-webdriver';
import { Local } from 'browserstack-local';
import { PAGES } from './pages.mjs';
import { visitWd } from './wd-checks.mjs';

const user = process.env.BROWSERSTACK_USERNAME, key = process.env.BROWSERSTACK_ACCESS_KEY;
const id = `nathancurtis-me-${process.env.GITHUB_RUN_ID ?? Date.now()}`;
// bs-local.com is BrowserStack's name for the tunnelled machine; iOS will not reach "localhost".
const base = 'http://bs-local.com:8787';
const DEVICES = [
  { deviceName: 'iPhone 16', osVersion: '18', browserName: 'safari' },
  { deviceName: 'iPhone 13', osVersion: '15', browserName: 'safari' },
  { deviceName: 'iPad Pro 12.9 2022', osVersion: '16', browserName: 'safari' },
  { deviceName: 'Google Pixel 9', osVersion: '15.0', browserName: 'chrome' },
  { deviceName: 'Samsung Galaxy S24', osVersion: '14.0', browserName: 'samsung' },
  { deviceName: 'Samsung Galaxy A52', osVersion: '11.0', browserName: 'chrome' },
];

const local = new Local();
await new Promise((ok, no) => local.start({ key, localIdentifier: id, force: true }, e => (e ? no(e) : ok())));
let bad = 0;
try {
  for (const d of DEVICES) {
    const label = `${d.deviceName} (${d.browserName})`;
    let driver;
    try {
      driver = await new Builder()
        .usingServer(`https://${user}:${key}@hub.browserstack.com/wd/hub`)
        .withCapabilities({ browserName: d.browserName, 'bstack:options': { deviceName: d.deviceName, osVersion: d.osVersion, realMobile: 'true', local: 'true', localIdentifier: id, buildName: id, sessionName: label, consoleLogs: 'errors' } })
        .build();
    } catch (e) {
      console.log(`::warning::BrowserStack refused ${label}: ${e.message.split('\n')[0]}`);
      continue;
    }
    try {
      for (const p of PAGES) {
        const problems = await visitWd(driver, base, p);
        for (const x of problems) console.log(`::error::${label} ${p.path}: ${x}`);
        bad += problems.length;
      }
    } finally {
      await driver.executeScript(`browserstack_executor: {"action": "setSessionStatus", "arguments": {"status": "${bad ? 'failed' : 'passed'}"}}`).catch(() => {});
      await driver.quit();
    }
  }
} finally {
  await new Promise(ok => local.stop(ok));
}
if (bad) process.exit(1);
console.log(`browserstack ok (${DEVICES.length} devices)`);
