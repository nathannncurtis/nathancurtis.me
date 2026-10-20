// node worker/range.test.mjs
import assert from 'node:assert/strict';
import site from './site.js';

const file = new Uint8Array(1000).map((_, i) => i % 256);
const env = { ASSETS: { fetch: async (url, init = {}) => new Response(init.method === 'HEAD' ? null : file, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '1000' } }) } };
const get = (range, method = 'GET') => site.fetch(new Request('https://nathancurtis.me/music/a.mp3', { method, headers: range ? { Range: range } : {} }), env, {});

let r = await get();
assert.equal(r.status, 200); assert.equal(r.headers.get('Accept-Ranges'), 'bytes'); assert.equal((await r.arrayBuffer()).byteLength, 1000);
r = await get('bytes=0-1');
assert.equal(r.status, 206); assert.equal(r.headers.get('Content-Range'), 'bytes 0-1/1000'); assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [0, 1]);
r = await get('bytes=998-');
assert.equal(r.headers.get('Content-Range'), 'bytes 998-999/1000'); assert.equal(r.headers.get('Content-Length'), '2');
r = await get('bytes=-3');
assert.equal(r.headers.get('Content-Range'), 'bytes 997-999/1000');
r = await get('bytes=500-99999');
assert.equal(r.headers.get('Content-Range'), 'bytes 500-999/1000');
r = await get('bytes=1000-');
assert.equal(r.status, 416); assert.equal(r.headers.get('Content-Range'), 'bytes */1000');
r = await get('bytes=0-1,5-6');
assert.equal(r.status, 200);
r = await get('bytes=0-1', 'HEAD');
assert.equal(r.status, 200);
console.log('range ok');
