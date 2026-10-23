// Every photo, cover and song content.js names has to be a file in _site.
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const site = process.argv[2] ?? '_site';
const ctx = { window: {} };
vm.runInNewContext(readFileSync(`${site}/content.js`, 'utf8'), ctx);
const paths = new Set();
const walk = v => {
  if (typeof v === 'string' && /^\/(photos|music)\/.+\.\w+$/.test(v)) paths.add(v);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
walk(ctx.window.CONTENT);
const missing = [...paths].filter(p => !existsSync(site + p));
missing.forEach(p => console.log(`::error::content.js names ${p}, which isn't in the site`));
if (missing.length) process.exit(1);
console.log(`content ok (${paths.size} files)`);
