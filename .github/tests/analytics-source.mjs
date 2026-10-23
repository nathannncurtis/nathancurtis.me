// Do not reintroduce a mutable, manually embedded analytics dependency.
// Managed injection must be checked against the real edge response before deployment.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const file of ['index.html', 'work/index.html', 'privacy/index.html', '404.html', ...readdirSync('status').filter(f => f.endsWith('.html')).map(f => `status/${f}`)]) {
  const html = readFileSync(file, 'utf8');
  assert(!html.includes('static.cloudflareinsights.com/beacon'), `${file}: use managed injection with SRI; see analytics-migration.md`);
}
console.log('No mutable manually embedded analytics scripts');
