// The headers in _headers actually reach the browser, on pages and on the files the Worker answers.
import { test, expect } from '@playwright/test';
import { BASE } from './pages.mjs';

const EVERY = {
  'strict-transport-security': /max-age=31536000; includeSubDomains/,
  'x-content-type-options': /^nosniff$/,
  'referrer-policy': /^strict-origin-when-cross-origin$/,
  'permissions-policy': /camera=\(\)/,
  'content-security-policy': /default-src 'self'.*frame-ancestors 'none'/,
};
const LONG = { 'cache-control': /max-age=31536000, immutable/ };

for (const [path, extra] of [['/', {}], ['/work', {}], ['/no-such-page', {}], ['/fonts/fonts.css', LONG], ['/photos/thumb/cathedral.webp', LONG], ['/music/her.mp3', LONG]]) {
  test(`headers on ${path}`, async ({ request }) => {
    const res = await request.get(BASE + path, { maxRedirects: 0 });
    const h = res.headers();
    for (const [name, want] of Object.entries({ ...EVERY, ...extra })) expect(h[name], `${name} on ${path}`).toMatch(want);
  });
}

test('/sky answers JSON and never caches for the visitor', async ({ request }) => {
  const res = await request.get(BASE + '/sky');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('no-store');
  expect(typeof (await res.json()).sky).toBe('string');
});

test('a song answers byte ranges through the Worker', async ({ request }) => {
  const res = await request.get(BASE + '/music/her.mp3', { headers: { Range: 'bytes=0-99' } });
  expect(res.status()).toBe(206);
  expect(res.headers()['content-range']).toMatch(/^bytes 0-99\/\d+$/);
  expect((await res.body()).length).toBe(100);
});
