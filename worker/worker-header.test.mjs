import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import site from './site.js';
import { SECURITY_HEADERS } from './security.js';
const source = readFileSync(new URL('../_headers', import.meta.url), 'utf8').split('\n# Photographs')[0];
for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert(source.includes(`  ${name}: ${value}`), `${name}: Worker policy drift`);
const env = { ASSETS: { fetch: async () => new Response(new Uint8Array(100), { headers: { 'content-type': 'audio/mpeg' } }) } };
for (const [path, init, status] of [['/sky', {}, 200], ['/sky', { method: 'OPTIONS' }, 204], ['/music/a.mp3', { headers: { Range: 'bytes=0-4' } }, 206], ['/music/a.mp3', { headers: { Range: 'bytes=999-' } }, 416], ['/anything', {}, 200]]) {
  const response = await site.fetch(new Request('https://nathancurtis.me'+path, init), env, {});
  assert.equal(response.status, status);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers.get(name), value, `${path}: ${name}`);
}
console.log('Every Worker path preserves matching security headers, including ranges and errors');
