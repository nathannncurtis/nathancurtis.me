// The owner permits missing SRI only on the existing mutable Cloudflare beacon.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const file of ['index.html','work/index.html','privacy/index.html','404.html',...readdirSync('status').filter(f=>f.endsWith('.html')).map(f=>`status/${f}`)]) {
 const html=readFileSync(file,'utf8');
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=['"](https?:[^'"]+)['"][^>]*>/g)];
 assert.equal(scripts.length,1,`${file}: exactly one external script`);
 assert.equal(scripts[0][1],'https://static.cloudflareinsights.com/beacon.min.js');
 assert(scripts[0][0].includes('crossorigin="anonymous"'));
 assert(scripts[0][0].includes('627594e36168488d90e35c1019acae84'));
}
console.log('Only the owner-approved analytics source is exempt from SRI');
