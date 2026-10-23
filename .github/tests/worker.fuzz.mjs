// Property tests for the Worker: thousands of random Range headers, files, places and Open-Meteo replies.
//   node worker.fuzz.mjs   (FUZZ_RUNS raises the count)
import fc from 'fast-check';
import assert from 'node:assert/strict';
import site from '../../worker/site.js';

const runs = Number(process.env.FUZZ_RUNS ?? 2000);
const ctx = { waitUntil() {} };

// Byte ranges on /music/*
const rangeHeader = fc.oneof(
  fc.tuple(fc.option(fc.nat(6000), { nil: '' }), fc.option(fc.nat(6000), { nil: '' })).map(([a, b]) => `bytes=${a}-${b}`),
  fc.string({ unit: fc.constantFrom(...'bytes=0123456789-, */'), maxLength: 20 }),
  fc.string({ unit: 'grapheme-ascii', maxLength: 30 }).filter(s => !/[\r\n\0]/.test(s)),
);
await fc.assert(fc.asyncProperty(fc.nat(5000), fc.option(rangeHeader, { nil: undefined }), fc.constantFrom('GET', 'HEAD'), async (n, range, method) => {
  const file = new Uint8Array(n).map((_, i) => (i * 7) % 256);
  const env = { ASSETS: { fetch: async (url, init = {}) => new Response(init.method === 'HEAD' ? null : file, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(n) } }) } };
  const r = await site.fetch(new Request('https://nathancurtis.me/music/a.mp3', { method, headers: range === undefined ? {} : { Range: range } }), env, ctx);
  assert.ok([200, 206, 416].includes(r.status), `status ${r.status}`);
  assert.equal(r.headers.get('Accept-Ranges'), 'bytes');
  const body = new Uint8Array(await r.arrayBuffer());
  if (r.status === 206) {
    const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('Content-Range'));
    assert.ok(m, `Content-Range ${r.headers.get('Content-Range')}`);
    const [s, e, total] = m.slice(1).map(Number);
    assert.ok(s <= e && e < n && total === n, `${s}-${e}/${total} of ${n}`);
    assert.equal(body.length, e - s + 1);
    assert.equal(r.headers.get('Content-Length'), String(e - s + 1));
    assert.deepEqual(body, file.slice(s, e + 1));
  } else if (r.status === 416) {
    assert.equal(r.headers.get('Content-Range'), `bytes */${n}`);
  } else if (method === 'GET') {
    assert.equal(body.length, n);
  }
}), { numRuns: runs });

// /sky: any place, any Origin, any reply from Open-Meteo
const store = new Map();
globalThis.caches = { default: { match: async k => store.get(k.url)?.clone(), put: async (k, v) => { store.set(k.url, v); } } };
const anything = fc.oneof(fc.double(), fc.integer(), fc.string(), fc.constant(null), fc.boolean());
const reply = fc.oneof(
  fc.record({ current: fc.record({ weather_code: anything, cloud_cover: anything, visibility: anything, wind_speed_10m: anything, is_day: anything }, { requiredKeys: [] }) }).map(o => ({ status: 200, body: JSON.stringify(o) })),
  fc.json().map(body => ({ status: 200, body })),
  fc.constantFrom(500, 429, 404).map(status => ({ status, body: 'nope' })),
);
const origin = fc.constantFrom(undefined, 'https://nathancurtis.me', 'https://www.nathancurtis.me', 'http://localhost:8787', 'https://evil.example', 'https://nathancurtis.me.evil.example', 'null');
await fc.assert(fc.asyncProperty(fc.option(anything), fc.option(anything), origin, reply, fc.constantFrom('GET', 'OPTIONS'), async (lat, lon, o, rep, method) => {
  store.clear();
  globalThis.fetch = async () => new Response(rep.body, { status: rep.status });
  const req = new Request('https://nathancurtis.me/sky', { method, headers: o ? { Origin: o } : {} });
  Object.defineProperty(req, 'cf', { value: { latitude: lat, longitude: lon } });
  const r = await site.fetch(req, {}, ctx);
  const allowed = o && /^https:\/\/(www\.)?nathancurtis\.me$|^http:\/\/localhost:8787$/.test(o);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), allowed ? o : null, `CORS for ${o}`);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  if (method === 'OPTIONS') return assert.equal(r.status, 204);
  assert.equal(r.status, 200);
  const out = JSON.parse(await r.text());
  assert.equal(typeof out.sky, 'string');
  for (const k of ['amount', 'cloud', 'haze', 'wind']) if (k in out) assert.ok(Number.isFinite(out[k]), `${k} is ${out[k]}`);
}), { numRuns: runs });

console.log(`worker fuzz ok (${runs} runs each)`);
