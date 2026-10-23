import { test, expect } from '@playwright/test';
// A loopback origin is a secure context even when local CI uses HTTP.
const BASE = process.env.ISOLATION_BASE || 'http://127.0.0.1:8787';
test('isolation preserves resources and outbound navigation', async ({ page, request }, info) => {
  test.skip(!['chromium', 'firefox', 'webkit'].includes(info.project.name), 'desktop isolation coverage');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
  const image = page.locator('img').first();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate(e => e.complete && e.naturalWidth > 0)).toBe(true);
  const song = await request.get(BASE + '/music/her.mp3', { headers: { Range: 'bytes=0-99' } });
  expect(song.status()).toBe(206);
  expect((await song.body()).length).toBe(100);
  expect(song.headers()['cross-origin-resource-policy']).toBe('same-origin');
  expect(await page.evaluate(async () => typeof (await (await fetch('/sky')).json()).sky)).toBe('string');
  // The homepage has no outbound target=_blank links; use the work index for that behavior.
  await page.goto(BASE + '/work/', { waitUntil: 'domcontentloaded' });
  const external = page.locator('a[href^="https://"][target="_blank"]').first();
  const href = await external.getAttribute('href');
  await page.context().route(href, route => route.fulfill({ contentType: 'text/html', body: '<title>Destination</title>' }));
  const popupPromise = page.waitForEvent('popup');
  await external.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
});

test('production apex/www policy and routing', async ({ request }) => {
  test.skip(!process.env.PRODUCTION_BASE, 'run after deployment with PRODUCTION_BASE=https://nathancurtis.me');
  const apex = process.env.PRODUCTION_BASE.replace(/\/$/, '');
  const response = await request.get(apex, { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['cross-origin-embedder-policy']).toBe('require-corp');
  expect(headers['cross-origin-resource-policy']).toBe('same-origin');
  const www = await request.get(apex.replace('://', '://www.'), { maxRedirects: 0 });
  expect(www.status()).toBe(301);
  expect(new URL(www.headers().location).host).toBe(new URL(apex).host);
});

test('managed analytics remains compatible with isolation', async ({ page }, info) => {
  test.skip(!process.env.MANAGED_ANALYTICS_SRC, 'blocked until Cloudflare-managed analytics is enabled and verified');
  test.skip(!['chromium', 'firefox', 'webkit'].includes(info.project.name), 'desktop analytics coverage');
  const src = process.env.MANAGED_ANALYTICS_SRC;
  const scriptRequests = [];
  page.on('request', request => {
    if (request.resourceType() === 'script' && request.url() === src) scriptRequests.push(request);
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await expect.poll(() => scriptRequests.length).toBe(1);
  const script = page.locator(`script[src="${src}"]`);
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute('integrity', /^(sha256|sha384|sha512)-/);
  await expect(script).toHaveAttribute('crossorigin', 'anonymous');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
});
