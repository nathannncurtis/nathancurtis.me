
import { prepareWithSegments, layoutWithLines } from '/work/pretext/layout.js';
import { mount } from '/work/ascii3d.js';

const FONT = '16px "IBM Plex Sans"', LEAD = '500 16px "IBM Plex Sans"', LH = 27;
const GH = '<svg class="i" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

const FILL = 'the quick work of a long afternoon was set against the slower record of what had been asked for and what had arrived and each part of it was checked twice before anything moved from one place to the next while the rest of the system kept running beside it without being told';
const filler = (n, seed) => { const w = FILL.split(' '); let out = [], i = seed % w.length; while (out.join(' ').length < n) { out.push(w[i % w.length]); i += 3 + (seed % 4); } return out.join(' '); };

const entries = [
  { name: 'ORCA', mark: true, kind: 'An architectural pattern', url: 'https://github.com/nathannncurtis/orca', go: 'GitHub', site: 'https://orcapattern.org', meta: ['Rust, PostgreSQL in one implementation', 'v1.0'],
    lead: 'Operational store, Read models, Change capture, Anti-corruption layer. A pattern for building a fast, independent platform on top of a system you do not own and cannot change.',
    paras: [
      'Many organizations run their core business on a vendor’s system: a database you can read, but whose schema, release cycle and API belong to someone else. Everything else grows around it. Tools query it directly, each keeps its own drifting copy, the vendor’s quirks leak into every one of them, and the API is too slow and too incomplete to build on.',
      'The usual answers do not fit. Building on the vendor’s API lacks the reads you need. Turning on the database’s change tracking alters a schema you do not own. Mirroring the database gives you speed, but every app still speaks the vendor’s model. ORCA is the shape that remains: own a translated, live copy for reads, and send every write back through the vendor.' ],
    diagram: true,
    parts: [
      ['Change capture', 'A signal of which records changed, taken from outside the vendor’s schema. A hint, never a fact.', 'cap'],
      ['Operational store', 'Your own copy. Every hint is re-read from the source, committed only, and reconciliation always wins.', 'store'],
      ['Anti-corruption layer', 'One library that turns the vendor’s model into yours, so nothing else ever sees it.', 'acl'],
      ['Read models', 'Screen-shaped documents, versioned in commit order and delivered only as whole versions.', 'rm'],
      ['Writes', 'Through the vendor’s API, judged by what comes back: confirmed, state reached, or undetermined.', 'api'] ] },
  { name: 'Dokkit', fig: 'dokkit', kind: 'Monitoring', url: 'https://github.com/nathannncurtis/dokkit', go: 'GitHub', site: 'https://dokkit.dev', meta: ['Elixir, Phoenix, Go', '416 commits', 'Still being built'],
    lead: 'One place that watches everything I run and tells me what needs my attention.',
    paras: [ 'The first screen is what needs a look now, which is wider than what is down. The program on each machine opens no port and reports what is on it. Discovery writes a proposal, and nothing is watched until a person accepts it. It suggests changes to its own rules and never makes them.' ] },
  { sealed: true, fig: true, kind: 'Glyph-atlas compression', name: 12, meta: ['Python'], line: 'Scanned pages rebuilt from {3} {6} {3} of {6}, {7} {2} {5} so one letter can never become another. {4} smaller across {3} million pages.' },
  { name: 'steddi', fig: 'steddi', kind: 'iOS navigation', url: 'https://github.com/nathannncurtis/steddi', go: 'GitHub', site: 'https://steddi.io', meta: ['Swift, SwiftUI, MapKit', '1,153 commits', 'Still being built'],
    lead: 'For people who already know their routes. Rerouted only when it actually matters.',
    paras: [ 'Drive a route your way once and it is saved. Turn-by-turn is its own engine, with no navigation SDK. A faster way is offered only when it saves enough of what is left of the drive: a larger share on a short drive, a smaller one on a long drive, never less than a minute and a half, and never in the last three minutes.' ] },
  { sealed: true, kind: 'Legal records production', name: 10, meta: ['Python, Rust, TypeScript, C#'], line: 'Records requests assembled end to end on top of {5} closed programs, each {6} {4} {7}. {7} pages in {5} {5}.' },
  { sealed: true, kind: 'Precedent-driven judging', name: 9, meta: ['Python, vLLM'], line: 'A small model takes the easy pages. A {5} {6} {5} rules on the rest, shown the {4} {7} {7} and the {7} {5}.' },
  { name: 'coil', fig: 'coil', kind: 'Python compiler', url: 'https://github.com/nathannncurtis/coil', go: 'GitHub', meta: ['Python, C', 'v0.3.1 on PyPI'],
    lead: 'Directory in, executable out.',
    paras: [ 'Existing tools for turning Python into an executable are complicated: hidden imports, missing DLLs, spec files, hook scripts. Coil takes a project folder and returns an .exe with no configuration. The executable is a native launcher, not a renamed interpreter, so the arguments you pass are the arguments your program gets.' ] },
  { sealed: true, fig: true, kind: 'Medical disc decryption', name: 8, meta: ['Go'], line: 'Five {6} disc formats turned into {5} {5}, including a {3} {6} rebuilt from {4} {4} {8}.' },
  { name: 'mdview', fig: 'mdview', kind: 'Markdown viewer', url: 'https://github.com/nathannncurtis/mdview-zig', go: 'GitHub', meta: ['Zig', 'v0.4.0', 'Still being built'],
    lead: 'A native markdown viewer, about 285 KB, with no webview and no runtime.',
    paras: [ 'Markdown is headings, paragraphs, code and lists. It does not need a browser engine. Each platform is drawn with its own text engine, and the program starts before you notice.' ] },
  { sealed: true, kind: 'Closed label formats', name: 13, meta: ['Python, C#, Rust'], line: 'The same move three times: three closed {4} {5} programs, their files written {8} without ever {7} {4}. And the {5} that {5} the {5}, driven over a protocol worked out from {3} {6} {7}.' },
  { sealed: true, kind: 'Admin-free software delivery', name: 9, meta: ['Rust, Elixir'], line: 'Installs and updates apps on {9} machines with no admin rights. The agent refuses anything outside a {5} {9}, even when its own {6} asks.' },
];

const NX = '15px "IBM Plex Mono"';
const GLYPH = '-=+*#:%=+-*';
const rg = () => GLYPH[(Math.random() * GLYPH.length) | 0];
const noise = t => (typeof t === 'number' ? 'x'.repeat(t) : t).replace(/\S/g, rg);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cache = new Map();
const lines = (t, w, f = FONT) => { const k = f + t; if (!cache.has(k)) cache.set(k, prepareWithSegments(t, f)); return layoutWithLines(cache.get(k), w, LH).lines; };

const T = (x, y, t, c = '', d = 0, a = '') => `<text class="o ${c}" x="${x}" y="${y}" ${a} style="--fd:${d}ms">${esc(t)}</text>`;
const P = (d, c, dl = 0) => `<path class="s ${c}"${c === 'q' ? '' : ' pathLength="1"'} d="${d}" style="--fd:${dl}ms"/>`;
const FIGS = {
  dokkit: () => {
    const rows = [['web-02', 'down'], ['nightly backup', 'late, 40 min'], ['mail certificate', 'expires in 9 days'], ['print-queue', 'found, not watched'], ['files-01 disk', '86%, rising']];
    let g = T(0, 14, 'needs a look  5', 't', 200) + T(190, 14, 'down  1', 'at', 260) + P('M0 28 H640', 'f', 150);
    rows.forEach(([n, st], i) => {
      const y = 52 + i * 26, d = 380 + i * 90;
      g += (i === 0 ? `<circle class="o af" cx="6" cy="${y - 4}" r="4" style="--fd:${d}ms"/>` : `<circle class="o" cx="6" cy="${y - 4}" r="3.5" fill="none" stroke="var(--accent)" stroke-width="1.2" style="--fd:${d}ms"/>`)
        + T(24, y, n, 't', d) + T(250, y, st, i === 0 ? 'at' : '', d) + P(`M0 ${y + 10} H640`, 'f', d);
    });
    return { h: 200, svg: g + T(24, 194, '+ 31 more, all fine', '', 900) + `<circle class="o fl" cx="6" cy="190" r="3" style="--fd:900ms"/>`,
      cap: 'The first screen. One row is down. Five need a look.' };
  },
  steddi: () => {
    const X = m => 40 + m / 120 * 580, Y = v => 170 - v / 0.3 * 150;
    const need = m => Math.min(0.2 * (0.5 + 1 / (1 + Math.exp(0.06 * (m - 30)))), 0.8);
    let curve = '';
    for (let m = 3; m <= 120; m += 1.5) curve += (curve ? ' L' : 'M') + X(m).toFixed(1) + ' ' + Y(need(m)).toFixed(1);
    let g = P(`M40 170 H620`, 'f', 100) + P(`M40 20 V170`, 'f', 100);
    for (const v of [0.1, 0.2, 0.3]) g += P(`M40 ${Y(v)} H620`, 'f', 150) + T(32, Y(v) + 4, `${v * 100}%`, '', 200, 'text-anchor="end"');
    for (const m of [0, 30, 60, 90, 120]) g += T(X(m), 188, String(m), '', 200, 'text-anchor="middle"');
    g += `<rect class="o fl" x="${X(0)}" y="20" width="${X(3) - X(0)}" height="150" fill-opacity=".4" style="--fd:300ms"/>`
      + P(curve, 'k', 400) + T(620, 206, 'minutes left', '', 300, 'text-anchor="end"') + T(48, 12, 'share of what is left a faster way must save', '', 300)
      + `<circle class="o af" cx="${X(15)}" cy="${Y(4 / 15)}" r="5" style="--fd:1300ms"/>` + T(X(15) + 12, Y(4 / 15) - 6, '4 min saved, 15 left: offered', 'at', 1350)
      + `<circle class="o" cx="${X(60)}" cy="${Y(4 / 60)}" r="5" fill="none" stroke="var(--dim)" stroke-width="1.4" style="--fd:1500ms"/>` + T(X(60), Y(4 / 60) + 24, '4 min saved, 60 left: not offered', '', 1550, 'text-anchor="middle"');
    return { h: 210, svg: g, cap: 'The default threshold. The same four minutes is worth a reroute with 15 minutes to go and not with 60. Nothing is offered in the shaded last three minutes.' };
  },
  coil: () => {
    const tree = ['myproject/', '├─ main.py', '├─ app/', '│  ├─ core.py', '│  └─ ui.py', '├─ assets/', '└─ requirements.txt'];
    let g = tree.map((l, i) => T(0, 20 + i * 21, l, i ? '' : 't', 200 + i * 60, 'xml:space="preserve"')).join('');
    g += P('M200 82 H400', 'k', 700) + P('M392 76 L400 82 L392 88', 'k', 1000) + T(214, 68, 'coil build ./myproject', 't', 800)
      + P('M468 34 H516 L534 52 V130 H468 Z', 'a', 1000) + P('M516 34 V52 H534', 'a', 1300) + T(452, 156, 'myproject.exe', 'at', 1400);
    return { h: 164, svg: g, cap: 'One command. No spec file, no hooks, no list of hidden imports.' };
  },
  mdview: () => {
    const W = 600, big = 200 * 1024, small = 285;
    const g = T(0, 14, 'an Electron app', '', 200) + T(W, 14, '~200 MB', '', 200, 'text-anchor="end"')
      + `<rect class="o fl" x="0" y="24" width="${W}" height="14" rx="1" style="--fd:400ms"/>`
      + T(0, 72, 'mdview', 't', 700) + T(W, 72, '285 KB', 'at', 700, 'text-anchor="end"')
      + `<rect class="o af" x="0" y="82" width="${Math.max(1.5, W * small / big).toFixed(2)}" height="14" style="--fd:900ms"/>`;
    return { h: 100, svg: g, cap: 'Drawn to scale. The amber sliver is mdview.' };
  },
};
const figure = (e, n) => {
  if (e.sealed) return `<figure class="fig x">${[0, 1, 2, 3].map(j => `<span class="nx" style="--d:${300 + j * 60}ms">${esc(noise('x'.repeat(30 + ((j * 17 + n * 5) % 34))))}</span>`).join('')}<figcaption><b>Fig. ${n}</b>${esc(noise('xxxx xxxxxx xx xxxxxxx xxxx'))}</figcaption></figure>`;
  const f = FIGS[e.fig]();
  return `<figure class="fig"><svg viewBox="-4 -4 648 ${f.h + 8}" aria-hidden="true">${f.svg}</svg><figcaption><b>Fig. ${n}</b>${esc(f.cap)}</figcaption></figure>`;
};
const list = document.getElementById('list');
let figN = 1;
entries.forEach(e => { if (e.fig) e.figN = ++figN; });
entries.forEach((e, i) => {
  const a = document.createElement('article');
  a.className = 'e reveal' + (e.sealed ? ' sealed' : '');
  a.innerHTML = cspHTML(`<div class="side">${e.sealed ? `<span class="name-x" style="--d:0ms">${esc(noise(e.name))}</span>` : `<h2><a href="${e.url}" target="_blank" rel="noopener">${esc(e.name)}</a>${e.mark ? `<picture class="mark" aria-hidden="true"><source media="(prefers-color-scheme: dark)" srcset="orca-mark-dark.svg"><img src="orca-mark-light.svg" alt=""></picture>` : ''}</h2>`}<div class="kind">${esc(e.kind)}</div></div><div class="text"></div>`);
  list.appendChild(a);
  e.el = a; e.textEl = a.querySelector('.text');
});

function render(e) {
  const w = e.textEl.clientWidth;
  let n = 0, html = '';
  const d = () => `--d:${Math.min(n++, 14) * 45 + 80}ms`;
  if (e.sealed) {
    html += `<div class="para"><p class="ls" style="${d()}">${esc(e.line).replace(/\{(\d+)\}/g, (_, c) => `<span class="nx">${esc(noise(+c))}</span>`)}</p></div>`;
    if (e.fig) html += figure(e, e.figN);
  } else {
    html += `<div class="para lead">${lines(e.lead, w, LEAD).map(l => `<span class="ln" style="font-weight:500;${d()}">${esc(l.text)}</span>`).join('')}</div>`;
    e.paras.forEach((p, j) => {
      html += `<div class="para">${lines(p, w).map(l => `<span class="ln" style="${d()}">${esc(l.text)}</span>`).join('')}</div>`;
      if (e.diagram && j === 0) html += `<figure><div class="diagram" id="diagram"></div><figcaption><b>Fig. 1</b>The pattern, end to end. Hover a part to find it.</figcaption></figure>`;
    });
    if (e.fig) html += figure(e, e.figN);
    if (e.parts) html += `<dl class="parts">${e.parts.map(([k, v, id]) => `<dt class="ln" data-part="${id}" style="height:auto;white-space:normal;${d()}">${esc(k)}</dt><dd class="ln" data-part="${id}" style="height:auto;white-space:normal;${d()}">${esc(v)}</dd>`).join('')}</dl>`;
  }
  const repo = !e.sealed && /github\.com\/([^/]+\/[^/]+)/.exec(e.url || '')?.[1];
  const live = m => !repo ? '' : /\bcommits$/.test(m) ? ` data-live="commits" data-repo="${repo}"` : /^v\d/.test(m) ? ` data-live="version" data-repo="${repo}"` : '';
  const meta = (e.meta || []).map(m => `<span class="dot"${live(m)}>${esc(m)}</span>`).join('');
  const site = e.site ? `<a class="go dot" href="${e.site}" target="_blank" rel="noopener">${esc(e.site.replace('https://', ''))}<span class="ar">→</span></a>` : '';
  const go = e.sealed ? '' : site + `<a class="go dot" href="${e.url}" target="_blank" rel="noopener">${e.web ? '' : GH}${esc(e.go)}<span class="ar">→</span></a>`;
  html += `<div class="meta ln" style="height:auto;white-space:normal;${d()}">${meta}${go}</div>`;
  e.textEl.innerHTML = cspHTML(html);
  if (e.diagram) { drawDiagram(); hotNow = new Map(); litNow = new Set(); }
}

const diagram = (() => {
  const W = 92, H = 13;
  const g = Array.from({ length: H }, () => Array(W).fill(' ')), cls = Array.from({ length: H }, () => Array(W).fill('')), bid = Array.from({ length: H }, () => Array(W).fill(''));
  const put = (r, c, s, k = '', id = '') => { for (let i = 0; i < s.length; i++) { g[r][c + i] = s[i]; cls[r][c + i] = k; bid[r][c + i] = id; } };
  const box = (r, c, w, id, name, role) => {
    put(r, c, '\u256d' + '\u2500'.repeat(w - 2) + '\u256e', 'bx', id);
    put(r + 1, c, '\u2502', 'bx', id); put(r + 1, c + 1, (' ' + name).padEnd(w - 2), 'name', id); put(r + 1, c + w - 1, '\u2502', 'bx', id);
    put(r + 2, c, '\u2502', 'bx', id); put(r + 2, c + 1, (' ' + role).padEnd(w - 2), 'role', id); put(r + 2, c + w - 1, '\u2502', 'bx', id);
    put(r + 3, c, '\u2570' + '\u2500'.repeat(w - 2) + '\u256f', 'bx', id);
  };
  for (let r = 0; r < H; r++) { put(r, 18, '\u2506', 'div'); put(r, 73, '\u2506', 'div'); }
  put(0, 1, 'VENDOR', 'zone'); put(0, 21, 'YOUR PLATFORM', 'zone'); put(0, 76, 'CLIENTS', 'zone');
  box(2, 1, 15, 'db', 'database', 'not yours');
  box(2, 22, 14, 'cap', 'capture', 'hints only');
  box(2, 39, 14, 'store', 'store', 'your copy');
  box(2, 57, 15, 'rm', 'read models', 'versioned');
  box(2, 76, 16, 'app', 'app', 'your screens');
  box(9, 1, 15, 'api', 'vendor API', 'every write');
  const h = (r, c0, c1) => { const o = [], s = c1 >= c0 ? 1 : -1; for (let c = c0; c !== c1 + s; c += s) o.push([r, c]); return o; };
  const v = (c, r0, r1) => { const o = [], s = r1 >= r0 ? 1 : -1; for (let r = r0; r !== r1 + s; r += s) o.push([r, c]); return o; };
  const seg = (cells, ch) => cells.forEach(([r, c]) => { g[r][c] = ch; cls[r][c] = ''; bid[r][c] = ''; });
  const set = (r, c, ch) => { g[r][c] = ch; cls[r][c] = ''; };
  const path = [], dest = [];
  put(1, 16, 'hint', 'lab'); put(1, 51, 'translate', 'lab', 'acl'); put(1, 72, 'whole', 'lab');
  set(3, 15, '\u251c'); seg(h(3, 16, 20), '\u2500'); set(3, 21, '>'); path.push(h(3, 16, 21)); dest.push('cap');
  set(3, 35, '\u251c'); seg(h(3, 36, 37), '\u2500'); set(3, 38, '>'); path.push(h(3, 36, 38)); dest.push('store');
  set(5, 45, '\u252c'); seg(v(45, 6, 6), '\u2502'); set(7, 45, '\u256f'); seg(h(7, 9, 44), '\u2500'); set(7, 8, '\u2570'); set(6, 8, '\u2502'); set(5, 8, '^');
  put(7, 12, ' re-read by key, committed only ', 'lab');
  path.push([[6, 45], [7, 45], ...h(7, 44, 9), [7, 8], [6, 8], [5, 8]]); dest.push('db');
  set(3, 52, '\u251c'); seg(h(3, 53, 55), '\u2500'); set(3, 56, '>'); h(3, 53, 56).forEach(([r, c]) => bid[r][c] = 'acl'); path.push(h(3, 53, 56)); dest.push('rm');
  set(3, 71, '\u251c'); seg(h(3, 72, 74), '\u2500'); set(3, 75, '>'); path.push(h(3, 72, 75)); dest.push('app');
  set(5, 83, '\u252c'); seg(v(83, 6, 9), '\u2502'); set(10, 83, '\u256f'); seg(h(10, 17, 82), '\u2500'); set(10, 16, '<');
  put(10, 36, ' one claimer, never resent blind ', 'lab');
  path.push([...v(83, 6, 9), [10, 83], ...h(10, 82, 16)]); dest.push('api');
  return { g, cls, bid, W, path, dest };
})();

let dcells = null, dbox = null;
function drawDiagram() {
  const el = document.getElementById('diagram'); if (!el) return;
  const { g, cls, bid, W } = diagram;
  dcells = []; dbox = {};
  el.textContent = '';
  for (let r = 0; r < g.length; r++) {
    const row = document.createElement('span'); row.className = 'r';
    for (let c = 0; c < W; c++) {
      const sp = document.createElement('span');
      sp.textContent = g[r][c]; if (cls[r][c]) sp.className = cls[r][c];
      row.appendChild(sp); dcells.push(sp);
      const id = bid[r][c]; if (id) { (dbox[id] ||= []).push(sp); sp.dataset.b = id; }
    }
    el.appendChild(row);
  }
}
let raf = 0, hotNow = new Map(), litNow = new Set();
function paintCell(idx, k) {
  const sp = dcells[idx], r = (idx / diagram.W) | 0, c = idx % diagram.W, ch = diagram.g[r][c];
  if (k === undefined) { sp.className = diagram.cls[r][c]; sp.textContent = ch; return; }
  sp.className = k ? 'trail' : 'hot';
  sp.textContent = !k && '\u2500\u2502'.includes(ch) ? '\u2022' : ch;
}
function flow(on) {
  cancelAnimationFrame(raf); raf = 0;
  if (!dcells || !document.getElementById('diagram')?.firstChild) drawDiagram();
  for (const idx of hotNow.keys()) paintCell(idx); hotNow = new Map();
  for (const id of litNow) dbox[id]?.forEach(sp => sp.classList.remove('lit')); litNow = new Set();
  if (!on) return;
  let fi = 0, t0 = performance.now(), arrived = false, lastI = -1;
  const lit = new Map();
  const tick = now => {
    raf = requestAnimationFrame(tick);
    const cells = diagram.path[fi], i = Math.floor((now - t0) / 34);
    if (i >= cells.length && !arrived) { arrived = true; lit.set(diagram.dest[fi], now + 520); }
    if (i >= cells.length + 6) { fi = (fi + 1) % diagram.path.length; arrived = false; t0 = now + (fi === 0 ? 1100 : fi === 2 || fi === 5 ? 380 : 160); }
    const want = new Set(); for (const [id, until] of lit) if (until > now) want.add(id); else lit.delete(id);
    for (const id of litNow) if (!want.has(id)) dbox[id]?.forEach(sp => sp.classList.remove('lit'));
    for (const id of want) if (!litNow.has(id)) dbox[id]?.forEach(sp => sp.classList.add('lit'));
    litNow = want;
    if (i === lastI) return;
    lastI = i;
    const next = new Map();
    for (let k = 0; k < 4; k++) { const j = i - k; if (j >= 0 && j < cells.length) next.set(cells[j][0] * diagram.W + cells[j][1], k); }
    for (const idx of hotNow.keys()) if (!next.has(idx)) paintCell(idx);
    for (const [idx, k] of next) if (hotNow.get(idx) !== k) paintCell(idx, k);
    hotNow = next;
  };
  raf = requestAnimationFrame(tick);
}

await Promise.all([document.fonts.load(FONT), document.fonts.load(LEAD), document.fonts.load('12px "IBM Plex Mono"'), document.fonts.load(NX)]);
entries.forEach(render);

const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('shown'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
entries.forEach(e => io.observe(e.el));
new IntersectionObserver(es => flow(es[0].isIntersecting), { threshold: 0.25 }).observe(entries[0].el);

let rw = innerWidth;
addEventListener('resize', () => { if (innerWidth === rw) return; rw = innerWidth; const on = !!raf; entries.forEach(render); flow(on); });

const fine = matchMedia('(pointer: fine)').matches;
const dark = matchMedia('(prefers-color-scheme: dark)');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();



const bg = document.getElementById('bg');
let art = null, need = true, curPage = -1;
const pageIndex = () => { const line = innerHeight * 0.45; let k = 0; for (let i = 0; i < entries.length; i++) if (entries[i].el.getBoundingClientRect().top <= line) k = i; return k; };
const pageMode = () => entries[pageIndex()].sealed ? 'sealed' : 'open';
document.getElementById('pgt').textContent = entries.length;
function setPage(i) {
  art?.turn(entries[i].sealed ? 'sealed' : 'open');
  const n = document.getElementById('pgn'), dir = i > (+n.textContent - 1) ? 1 : -1;
  n.style.transform = `translateY(${dir * -100}%)`;
  setTimeout(() => { n.style.transition = 'none'; n.textContent = i + 1; n.style.transform = `translateY(${dir * 100}%)`; void n.offsetWidth; n.style.transition = ''; n.style.transform = 'none'; }, 180);
}
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function place() { const m = innerWidth < 760; return { cx: m ? 0.5 : 0.27, cy: 0.54, size: m ? 0.95 : 1.12, alpha: dark.matches ? 0.42 : 0.46, color: () => css('--dim') }; }
function load() { const m = art?.mode; art = mount(bg, { ...place(), mode: m || pageMode() }); need = true; }
load();
let yaw = 0.55 * Math.sin(scrollY * 0.0011), drawn = NaN;
const frame = () => {
  const target = 0.55 * Math.sin(scrollY * 0.0011);
  yaw = still ? target : yaw + (target - yaw) * 0.22;
  if (Math.abs(target - yaw) < 1e-4) yaw = target;
  const pi = pageIndex();
  if (pi !== curPage) { curPage = pi; setPage(pi); }
  if (need || yaw !== drawn || art.busy()) { art.draw(yaw); drawn = yaw; need = false; }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
let lw = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; load(); } else { art.size(); need = true; } }); // a phone's address bar only changes the height
dark.addEventListener('change', load);

list.addEventListener('pointerover', e => {
  const b = e.target.closest('[data-b]')?.dataset.b || e.target.closest('[data-part]')?.dataset.part || null;
  list.querySelectorAll('.hov').forEach(x => x.classList.remove('hov'));
  list.querySelectorAll('.parts .on').forEach(x => x.classList.remove('on'));
  if (!b) return;
  (dbox?.[b] || []).forEach(sp => sp.classList.add('hov'));
  list.querySelectorAll(`[data-part="${b}"]`).forEach(x => x.classList.add('on'));
});

document.addEventListener('copy', e => {
  const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
  const r = sel.getRangeAt(0);
  const within = n => (n.nodeType === 1 ? n : n.parentElement)?.closest('.e.sealed');
  const box = document.createElement('div'); box.appendChild(r.cloneContents());
  const touched = within(r.startContainer) || within(r.endContainer) || box.querySelector('.nx, .name-x');
  if (!touched) return;
  if (!box.querySelector('.nx, .name-x, .para, .side, .e')) { e.clipboardData.setData('text/plain', '[redacted]'); e.preventDefault(); return; }
  box.querySelectorAll('.e.sealed .text .para:not(:has(.ls)), .text .para:has(.nx):not(:has(.ls))').forEach(x => x.replaceWith('[redacted]\n'));
  box.querySelectorAll('.nx, .name-x').forEach(x => x.replaceWith('[redacted]'));
  box.querySelectorAll('.para .ln').forEach(x => x.append(' '));
  box.querySelectorAll('.meta .dot').forEach(x => { if (x.nextElementSibling) x.append(' · '); });
  box.querySelectorAll('.parts dt').forEach(x => x.append(': '));
  box.querySelectorAll('.para, .side, .meta, h2, .kind, .parts dd').forEach(x => x.append('\n'));
  const text = box.textContent.replace(/(\[redacted\]\s*)+/g, m => /\n/.test(m) ? '[redacted]\n' : '[redacted] ').replace(/\[redacted\] ([.,:;])/g, '[redacted]$1').replace(/ {2,}/g, ' ').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  e.clipboardData.setData('text/plain', text); e.preventDefault();
});

// Commit counts and versions, read from GitHub when the page opens. The numbers written
// into the page are the fallback; anything that fails to load just keeps them.
(() => {
  const spans = [...document.querySelectorAll('[data-live]')]; if (!spans.length) return;
  const nf = new Intl.NumberFormat('en-US'), memo = {};
  const get = (u, f) => (memo[u] ||= fetch('https://api.github.com/' + u, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? f(r) : null).catch(() => null));
  for (const s of spans) {
    const repo = s.dataset.repo;
    if (s.dataset.live === 'commits') get(`repos/${repo}/commits?per_page=1`, r => { const m = /[?&]page=(\d+)>; rel="last"/.exec(r.headers.get('Link') || ''); return m ? +m[1] : null; })
      .then(n => { if (n) s.textContent = `${nf.format(n)} commits`; });
    else get(`repos/${repo}/releases/latest`, r => r.json()).then(d => { const tag = d?.tag_name; if (tag && /^v?\d/.test(tag)) s.textContent = s.textContent.replace(/^v[\w.-]+/, tag.startsWith('v') ? tag : 'v' + tag); });
  }
})();
console.log('%cThe redacted text isn\u2019t in this page. There\u2019s nothing to find.', 'font: 12px "IBM Plex Mono", monospace; color: #a8743f;');

if (fine) {
  document.body.classList.add('cc');
  const cur = document.getElementById('cur'), glyph = cur.firstChild;
  addEventListener('pointermove', e => {
    cur.classList.add('on');
    cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const t = e.target;
    const link = t.closest('a'), x = t.closest('.e.sealed'), txt = t.closest('.text .ln, .lead, .parts, .diagram');
    cur.className = 'on' + (link ? ' link' : x ? ' x' : txt ? ' text' : '');
    glyph.textContent = link ? '→' : x ? rg() : txt ? '|' : '+';
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));

  let mx = -1e4, my = -1e4, live = null, sraf = 0;
  const shimmer = () => {
    if (!live) { sraf = 0; return; }
    for (const s of live.querySelectorAll('.nx, .name-x')) {
      const b = s.getBoundingClientRect();
      if (Math.abs(b.top + b.height / 2 - my) > 70) continue;
      const cwx = b.width / Math.max(1, s.textContent.length);
      const chars = [...s.textContent];
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') continue;
        const d = Math.hypot(b.left + (i + .5) * cwx - mx, b.top + b.height / 2 - my);
        if (d < 110 && Math.random() < .45 * (1 - d / 110)) chars[i] = rg();
      }
      s.textContent = chars.join('');
    }
    sraf = setTimeout(() => requestAnimationFrame(shimmer), 45);
  };
  document.getElementById('list').addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    const s = e.target.closest('.e.sealed');
    live = s; if (s && !sraf) sraf = requestAnimationFrame(shimmer);
  }, { passive: true });
  document.getElementById('list').addEventListener('pointerleave', () => { live = null; });
}

const sig = document.getElementById('sig');
if (window.SIG) { sig.setAttribute('viewBox', `0 0 ${SIG.w} ${SIG.h}`); sig.innerHTML = SIG.paths.map(p => `<path d="${p.d}" stroke-width="${p.w}"/>`).join(''); }
