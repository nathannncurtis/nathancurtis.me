import { chromium, firefox, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base = process.env.SECURITY_BASE || 'http://127.0.0.1:8791';
const policy = readFileSync('_headers', 'utf8').split('\n').find(l => l.includes('Content-Security-Policy:')).split('Content-Security-Policy:')[1].trim();
assert(!policy.includes('unsafe-inline'));
const paths = ['/', '/work/', '/privacy/', '/404.html', '/status/200.html', '/status/403.html', '/status/410.html', '/status/500.html', '/status/503.html'];
for (const engine of [chromium, firefox, webkit]) {
  const browser = await engine.launch();
  for (const path of paths) {
    const page = await browser.newPage();
    const errors = [], violations = [];
    // Wrangler rewrites production hostnames inside local CSP headers; test the
    // policy that the edge will actually serve, including local weather fallback.
    await page.route(base + '/**', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
    });
    page.on('pageerror', e => errors.push(e.message));
    await page.exposeFunction('recordViolation', v => violations.push(v));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.recordViolation({ directive: e.effectiveDirective, source: e.blockedURI })));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    assert.deepEqual(errors, [], `${engine.name()} ${path}: script failures`);
    assert.deepEqual(violations, [], `${engine.name()} ${path}: unexpected CSP violations`);
    assert(await page.locator('body').innerText(), `${path}: empty document`);
    if (path === '/') {
      assert(await page.locator('.po .ln').count() > 0, 'poems rendered');
      assert(await page.locator('.mu button').count() > 0, 'music controls rendered');
      assert(await page.evaluate(() => [...document.styleSheets].find(s => s.href?.endsWith('/assets/runtime.css')).cssRules.length) > 0, 'dynamic CSS rules applied');
    }
    if (path === '/work/') assert(await page.locator('article').count() > 0, 'work entries rendered');
    await page.close();
  }
  // A response fixture, never a deployed page. JS evaluation itself bypasses CSP,
  // so inject actual DOM nodes and assert their attempted execution is blocked.
  const page = await browser.newPage();
  await page.route(base + '/security-negative', r => r.fulfill({ headers: { 'content-type': 'text/html', 'content-security-policy': policy }, body: '<!doctype html><html><head><title>Negative security fixture</title></head><body><p id="probe">probe</p><script>window.unapproved=true</script><style>#probe { color:rgb(1,2,3) }</style><p id="attribute" style="color:rgb(1,2,3)">attribute</p></body></html>' }));
  await page.goto(base + '/security-negative');
  assert.equal(await page.evaluate(() => window.unapproved), undefined, 'unapproved inline script blocked');
  for (const id of ['probe', 'attribute']) assert.notEqual(await page.locator('#'+id).evaluate(e => getComputedStyle(e).color), 'rgb(1, 2, 3)', 'unapproved inline style blocked');
  // Independently prove SRI rejects changed bytes, without transmitting analytics.
  const good = 'window.integrityProbe=true';
  const integrity = 'sha384-' + createHash('sha384').update(good).digest('base64');
  await page.route(base + '/sri-probe.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.integrityProbe="tampered"' }));
  await page.route(base + '/sri-negative', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><title>SRI</title></head><body><script src="/sri-probe.js" integrity="${integrity}"></script></body></html>` }));
  await page.goto(base + '/sri-negative');
  assert.equal(await page.evaluate(() => window.integrityProbe), undefined, 'tampered bytes blocked by SRI');
  await browser.close();
  console.log(`${engine.name()}: all documents enforce CSP; inline script/style and tampered SRI blocked`);
}
