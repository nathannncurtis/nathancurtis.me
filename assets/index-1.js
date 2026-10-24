
const C = window.CONTENT;
const day = document.getElementById('day');
const clock = document.getElementById('clock');
const rail = document.getElementById('rail');
const skyEl = document.getElementById('sky');
const ctx = skyEl.getContext('2d');
const mobile = matchMedia('(max-width: 760px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BREATHE = true; // slow drift of the aurora distortion (set via JS, throttled) instead of per-frame SMIL
// The hour and everything scrolling drives are a function of scrollY alone. They are measured
// against the window as it was when the page opened (or last changed width), never the live one,
// so toolbars collapsing, a keyboard or a window resize can never move the time or the zoom.
let SH = innerHeight, SW = innerWidth;
const vh = () => SH;
const phone = mobile.matches;
// Image dimensions are measured from the immutable assets (width, height, thumbnail width).
const photoDimensions = {"IMG_0192":[1200,1600,600],"IMG_0637":[1200,1600,600],"IMG_0645":[1200,1600,600],"IMG_0680":[1200,1600,600],"IMG_0681":[1600,1200,600],"IMG_0685":[1600,1200,600],"IMG_0705":[1200,1600,600],"IMG_0711":[1200,1600,600],"IMG_0714":[1200,1600,600],"IMG_0715":[1200,1600,600],"IMG_0748":[1200,1600,600],"IMG_0758":[1600,1200,600],"IMG_0764":[1600,983,600],"IMG_0766":[1600,1200,600],"IMG_0770":[1600,1200,600],"IMG_0788":[1200,1600,600],"IMG_0828":[1200,1600,600],"IMG_0858":[1200,1600,600],"IMG_0884":[1200,1600,600],"IMG_0889":[1600,1200,600],"IMG_0947":[1200,1600,600],"IMG_0956":[1200,1600,600],"IMG_0961":[1200,1600,600],"IMG_0963":[1200,1600,600],"IMG_0964":[1200,1600,600],"IMG_1047":[1600,1200,600],"IMG_1051":[1200,1600,600],"IMG_1053":[1200,1600,600],"IMG_7369":[1200,1600,600],"IMG_7373":[1200,1600,600],"IMG_7376":[1200,1600,600],"IMG_8040":[1600,669,600],"IMG_8044":[1600,1200,600],"IMG_8076":[1600,1200,600],"IMG_8205":[1200,1600,600],"IMG_8206":[1200,1600,600],"IMG_8209":[1200,1600,600],"IMG_9208":[1200,1600,600],"IMG_9553":[1200,1600,600],"PANO_20170717_062243-02":[1600,378,1000],"PANO_20170719_133054":[1600,328,1000],"cathedral":[1800,1350,600],"green-tide":[1350,1800,600],"lone-spruce":[1800,1350,600],"nightwatch":[1350,1800,600],"single-thread":[1350,1800,600],"slow-turning":[1350,1800,600]};
// Browsers select once for the
// rendered slot and DPR; the lightbox still deliberately loads the original.
const photoImg = (p, cls = '', sizes = '(max-width: 760px) 86vw, 70vw') => {
  const [width, height, thumbWidth] = photoDimensions[p.src.split('/').pop().replace('.jpg', '')];
  return `<img src="${p.thumb}" srcset="${p.thumb} ${thumbWidth}w, ${p.src} ${width}w" sizes="${sizes}" width="${width}" height="${height}" alt="${p.title}" class="${cls}" loading="lazy" decoding="async">`;
};

const ZEN = [[0,'#05060d'],[4,'#070a18'],[5.5,'#1c2240'],[6.5,'#6f7fa6'],[7.5,'#a9bbd6'],[10,'#bfd0e4'],[12,'#c4d6ea'],[15,'#bdcbdc'],[17.5,'#8f8ea8'],[18.6,'#4b3f63'],[19.6,'#1a1a33'],[21,'#0a0c1b'],[24,'#05060d']];
const HOR = [[0,'#0a0c18'],[4,'#0d1022'],[5.5,'#5a3f4a'],[6.3,'#d9955f'],[7.5,'#e6cfae'],[10,'#e4e9ec'],[12,'#eceff0'],[15,'#e8ddcb'],[17.5,'#dfa672'],[18.6,'#a85a45'],[19.6,'#4c3550'],[21,'#141628'],[24,'#0a0c18']];
const INK_L = [26, 24, 19], INK_D = [233, 228, 216];

const ORDER = [
  ['mu', 'before', 0.2], ['turn', null, 0.8], ['lights', null, 1.7], ['mu', 'terror', 3.2], ['st', 'campground-fireworks', 3.4],
  ['win', 'canyonlands-dawn', 6.0], ['ph', 'yukon-whites', 6.9], ['po', 'Routine in Green', 7.4], ['win', 'snowbound-valley', 8.1],
  ['st', 'clear-shallows', 9.2], ['ph', 'old-growth', 9.9], ['st', 'throne-in-the-woods', 10.5], ['orbit', null, 11.2],
  ['frieze', null, 12.4], ['po', 'Rings, Not Stories', 14.2], ['win', 'red-rock-road', 16.2], ['ph', 'sun-over-canyon', 17.2],
  ['ph', 'winter-dusk', 18.0], ['po', 'Burnt Orange', 18.5], ['ph', 'drifting-medusa', 20.4], ['mu', 'fear-of-god', 21.0],
  ['ph', 'harbor-lights', 21.8], ['st', 'alcatraz-steps', 22.4], ['po', 'Scent of Salt', 23.2]
];
const ARCH = new Set(['caryatid', 'hermes', 'draped-marble', 'seated-marble', 'odeon']);
const ROUND = new Set(['the-tholos']);
const ORBIT = ['garden-cat', 'blue-macaw', 'taverna-dog'];
const TURN = ['caryatid', 'apollo-olympia', 'hermes', 'marble-horses', 'draped-marble', 'window-light', 'seated-marble', 'terracotta', 'two-faces', 'looking-down', 'athena-heracles'];
const TURNSET = new Set(TURN);
const byId = Object.fromEntries(C.photos.map(p => [p.id, p]));
const byTitle = Object.fromEntries(C.verse.map(v => [v.title, v]));
const music = Object.fromEntries(C.music.map(m => [m.id, m]));

const items = [], photos = [], strays = [];
const addPhoto = (p, el) => { el.dataset.i = photos.length; photos.push({ p, f: el }); el.onclick = () => openLight(+el.dataset.i); };
const capHtml = p => `<div class="cap"><span>${p.title}</span><em>${p.collection}, ${p.year}</em></div>`;
const stage = (hour, kind, inner, span) => {
  const s = document.createElement('section');
  s.className = `stage k-${kind} dev`;
  s.style.height = span + 'vh';
  const pin = document.createElement('div'); pin.className = 'pin';
  if (inner) pin.appendChild(inner);
  s.appendChild(pin);
  day.appendChild(s);
  const it = { hour, kind, el: s, pin, inner, span };
  items.push(it);
  return it;
};

let strayN = 0;
const blobs = [];
const blobPoly = (seed, k) => {
  const n = 48, pts = [];
  let s = seed * 9301 + k * 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const raw = Array.from({ length: 8 }, () => 0.7 + rnd() * 0.3);
  const r = Array.from({ length: n }, (_, i) => { const t = i / n * 8, j = Math.floor(t), f = t - j, a = raw[j % 8], b = raw[(j + 1) % 8]; return a + (b - a) * (f * f * (3 - 2 * f)); });
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push(`${(50 + Math.cos(a) * 50 * r[i]).toFixed(2)}% ${(50 + Math.sin(a) * 50 * r[i]).toFixed(2)}%`); }
  return pts.join(', ');
};
const morphSheet = [...document.styleSheets].find(s => s.href && new URL(s.href).pathname === '/assets/runtime.css');
let friezeTrack = null;

for (const [kind, key, hour] of ORDER) {
  if (kind === 'ph' || kind === 'win') {
    const p = byId[key];
    const f = document.createElement('figure');
    f.className = kind + ' hold';
    f.style.setProperty('--ar', p.aspect);
    if (kind === 'win') f.innerHTML = `<div class="frame sh">${photoImg(p, 'ex')}</div>${capHtml(p)}`;
    else f.innerHTML = `${photoImg(p, 'ex sh')}${capHtml(p)}`;
    if (kind !== 'win') addPhoto(p, f);
    stage(hour, kind, f, kind === 'win' ? (key === 'red-rock-road' ? 170 : 260) : 170).p = p;
  } else if (kind === 'st') {
    const p = byId[key];
    const f = document.createElement('figure');
    f.className = 'st';
    const n = strayN++;
    f.dataset.n = n;
    f.style.setProperty('--ar', p.aspect);
    f.style.setProperty('--fd', (12 + (n % 4) * 3) + 's'); f.style.setProperty('--fo', (-n * 2.3) + 's');
    f.style.setProperty('--fx', ((n % 3) - 1) * 9 + 'px'); f.style.setProperty('--fy', (-6 - (n % 3) * 5) + 'px');
    f.style.setProperty('--r0', ((n % 2) ? -0.8 : 0.5) + 'deg'); f.style.setProperty('--r1', ((n % 2) ? 0.7 : -0.6) + 'deg');
    f.innerHTML = `<div class="fl">${photoImg(p, 'ex sh', '(max-width: 760px) 26vw, 17vw')}</div>${capHtml(p)}`;
    addPhoto(p, f);
    strays.push({ el: f, hour, n, p });
  } else if (kind === 'po') {
    const v = byTitle[key];
    const s = document.createElement('section');
    s.className = 'po dev';
    let k = 0;
    s.innerHTML = cspHTML(`<h2>${v.title}</h2>` + v.stanzas.map(st => '<p>' + st.split('\n').map(line => {
      const n = v.notes && v.notes[line];
      return `<span class="ln" style="--d:${(k++ * 0.045).toFixed(3)}s"><span class="tx">${line || '&nbsp;'}</span>${n ? `<small>${n}</small>` : ''}</span>`;
    }).join('') + '</p>').join(''));
    day.appendChild(s);
    items.push({ hour, kind, el: s, flow: true });
  } else if (kind === 'mu') {
    const m = music[key];
    const s = document.createElement('section');
    s.className = 'mu hold';
    s.setAttribute('aria-label', m.title);
    const face = m.cover ? `<img src="${m.cover}" alt="" class="sh">` : `<div class="cover sh"><small>${m.kind}</small>${m.title}</div>`;
    const list = m.tracks.map((t, i) => `<li data-i="${i}"><button type="button" class="track-button"><span>${t.title}</span><span>${t.length}</span></button></li>`).join('');
    s.innerHTML = `<div class="sleeve"><div class="disc"></div>${face}</div><h2>${m.title}<i>${m.kind}</i></h2><ol>${list}</ol><div class="bar"><b></b><input class="seek" type="range" min="0" max="100" step="1" value="0" aria-label="Playback position" aria-valuetext="Not playing" disabled></div><div class="ctl"><button type="button" data-a="play" aria-pressed="false">Play</button><button type="button" data-a="pause" aria-pressed="false">Pause</button></div>`;
    wirePlayer(s, m);
    stage(hour, 'mu', s, 150);
  } else if (kind === 'lights') {
    const lights = C.photos.filter(p => p.sub === 'The Lights');
    const it = stage(hour, 'lights', null, 260);
    it.pin.innerHTML = `<h3>The Lights, Alaska 2023</h3>`;
    lights.forEach((p, i) => {
      const b = document.createElement('figure');
      b.className = 'blob';
      const a = blobPoly(i + 1, 0), bb = blobPoly(i + 1, 1), c = blobPoly(i + 1, 2);
      morphSheet.insertRule(`@keyframes morph${i} { 0%, 100% { clip-path: polygon(${a}); } 36% { clip-path: polygon(${bb}); } 70% { clip-path: polygon(${c}); } }`, morphSheet.cssRules.length);
      b.innerHTML = cspHTML(`<div class="sheet" style="--p:${a}; animation-name: morph${i}">${photoImg(p, '', '(max-width: 760px) 56vw, 30vw')}</div>${capHtml(p)}`);
      b.style.setProperty('--md', (28 + i * 5) + 's'); b.style.setProperty('--mo', (-i * 7) + 's');
      b.style.setProperty('--cd', (9 + i * 2) + 's'); b.style.setProperty('--co', (-i * 3) + 's');
      addPhoto(p, b);
      it.pin.appendChild(b);
      blobs.push({ el: b, p, i, dx: 0, dy: 0, ph: i * 1.7, cx: 0, cy: 0 });
    });
    it.blobs = blobs;
  } else if (kind === 'turn') {
    const it = stage(hour, 'turn', null, 560);
    it.pin.innerHTML = `<h3>Marble, Greece 2025</h3><div class="ring"></div>`;
    const ring = it.pin.querySelector('.ring');
    it.cards = TURN.map((id, i) => {
      const p = byId[id];
      const f = document.createElement('figure');
      f.style.setProperty('--ar', p.aspect);
      f.innerHTML = `${photoImg(p, 'ex sh', '(max-width: 760px) 44vw, 25vw')}${capHtml(p)}`;
      addPhoto(p, f);
      ring.appendChild(f);
      return { el: f, p, i };
    });
  } else if (kind === 'orbit') {
    const it = stage(hour, 'orbit', null, 320);
    it.cards = ORBIT.map((id, i) => {
      const p = byId[id];
      const f = document.createElement('figure');
      f.style.setProperty('--ar', p.aspect);
      f.innerHTML = `${photoImg(p, 'ex sh', '(max-width: 760px) 44vw, 25vw')}${capHtml(p)}`;
      addPhoto(p, f);
      it.pin.appendChild(f);
      return { el: f, p, i };
    });
  } else if (kind === 'frieze') {
    const greece = C.photos.filter(p => p.collection === 'Greece' && !TURNSET.has(p.id));
    const it = stage(hour, 'frieze', null, 380);
    it.pin.innerHTML = `<h3>Greece, spring 2025</h3><div class="track"></div>`;
    friezeTrack = it.pin.querySelector('.track');
    greece.forEach(p => {
      const f = document.createElement('figure');
      if (ARCH.has(p.id)) f.className = 'arch'; else if (ROUND.has(p.id)) f.className = 'round';
      const [aw, ah] = p.aspect.split('/').map(Number);
      if (aw > ah) f.classList.add('land');
      f.style.setProperty('--ih', aw > ah ? '78%' : '100%');
      f.innerHTML = `${photoImg(p, 'ex', '(max-width: 760px) 62vw, 46vw')}${capHtml(p)}`;
      addPhoto(p, f);
      friezeTrack.appendChild(f);
    });
  }
}
for (const s of strays) {
  const host = items.filter(it => !it.flow).reduce((a, b) => Math.abs(b.hour - s.hour) < Math.abs(a.hour - s.hour) ? b : a);
  host.pin.appendChild(s.el);
  s.host = host;
}
const firstStage = items.find(it => !it.flow), lastFlow = items[items.length - 1];
const topClone = lastFlow.el.cloneNode(true);
topClone.classList.remove('dev'); topClone.classList.add('lit');
topClone.setAttribute('aria-hidden', 'true');
day.prepend(topClone);
items.unshift({ hour: lastFlow.hour - 24, kind: 'po', el: topClone, flow: true });
const botClone = firstStage.el.cloneNode(true);
botClone.classList.remove('dev'); botClone.classList.add('lit');
botClone.setAttribute('aria-hidden', 'true');
botClone.querySelectorAll('button, input').forEach(el => el.tabIndex = -1);
botClone.querySelectorAll('li, .ctl button, .bar').forEach(el => el.onclick = () => { scrollTo({ top: scrollY - loopLen(), behavior: 'instant' }); });
day.appendChild(botClone);
items.push({ hour: firstStage.hour + 24, kind: 'mu', el: botClone, pin: botClone.querySelector('.pin'), inner: botClone.querySelector('.hold'), span: firstStage.span });
const loopLen = () => lastFlow.el.offsetTop - topClone.offsetTop;

const audio = document.getElementById('audio');
let current = null;
function wirePlayer(s, m) {
  const bar = s.querySelector('.bar'), fill = bar.querySelector('b'), seek = bar.querySelector('.seek');
  const lis = [...s.querySelectorAll('li')];
  const ctl = s.querySelectorAll('.ctl button');
  const timeLabel = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const updatePosition = () => {
    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    const percent = ready ? audio.currentTime / audio.duration * 100 : 0;
    fill.style.width = percent + '%';
    seek.disabled = !ready;
    seek.value = percent;
    seek.setAttribute('aria-valuetext', ready ? `${timeLabel(audio.currentTime)} of ${timeLabel(audio.duration)}` : 'Not playing');
  };
  const setPlayback = playing => {
    s.classList.toggle('playing', playing);
    ctl.forEach((c, i) => {
      const on = i === 0 ? playing : !playing;
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', String(on));
    });
  };
  const reset = () => {
    lis.forEach(l => { l.classList.remove('on'); l.querySelector('button').removeAttribute('aria-current'); });
    fill.style.width = 0;
    seek.value = 0; seek.disabled = true; seek.setAttribute('aria-valuetext', 'Not playing');
    ctl.forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    s.classList.remove('out', 'playing');
  };
  const resume = () => audio.play().catch(() => { if (current && current.s === s) setPlayback(false); });
  const play = i => {
    if (current && current.s !== s) current.reset();
    current = { s, reset, m };
    lis.forEach((l, k) => {
      l.classList.toggle('on', k === i);
      if (k === i) l.querySelector('button').setAttribute('aria-current', 'true');
      else l.querySelector('button').removeAttribute('aria-current');
    });
    seek.value = 0; seek.disabled = true; seek.setAttribute('aria-valuetext', 'Loading'); fill.style.width = 0;
    audio.onplay = () => setPlayback(true);
    audio.onpause = () => setPlayback(false);
    audio.onloadedmetadata = updatePosition;
    audio.ontimeupdate = updatePosition;
    audio.onended = () => { if (i + 1 < m.tracks.length) play(i + 1); else reset(); };
    audio.src = m.tracks[i].src;
    s.classList.add('out');
    resume();
  };
  lis.forEach(l => l.querySelector('button').onclick = () => play(+l.dataset.i));
  ctl[0].onclick = () => { if (current && current.s === s && audio.src) resume(); else play(0); };
  ctl[1].onclick = () => { if (current && current.s === s) audio.pause(); };
  seek.oninput = () => {
    if (current && current.s === s && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = audio.duration * Number(seek.value) / 100;
      updatePosition();
    }
  };
}

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const at = (K, h) => {
  h = ((h % 24) + 24) % 24;
  for (let i = 1; i < K.length; i++) if (h <= K[i][0]) { const [h0, c0] = K[i - 1], [h1, c1] = K[i]; return mix(hex(c0), hex(c1), (h - h0) / (h1 - h0)); }
  return hex(K[0][1]);
};
const rgb = c => `rgb(${c.map(Math.round)})`;
const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const stars = Array.from({ length: 190 }, () => [Math.random(), Math.random() * 0.8, Math.random(), Math.random() * 6.28]);
const meteors = [];
let nextMeteor = 2500, sat = { t: -1 }, nextSat = 15000;
const skyDemo = new URLSearchParams(location.search).has('sky'); // ?sky makes the rare things frequent, for looking
const cdist = (a, b) => Math.abs(((a - b + 12) % 24 + 24) % 24 - 12);   // hours apart on a 24h circle
// Moon: the real phase tonight. 0 new, .5 full, 1 new again.
const moonPhase = () => ((Date.now() / 864e5 - 10962.76) % 29.530588853 + 29.530588853) % 29.530588853 / 29.530588853; // days since the new moon of 2000-01-06 18:14 UTC
function drawMoon(x, y, r, p, alpha, dark) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e9ecf7'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  const k = Math.cos(p * Math.PI * 2), waxing = p < 0.5, rx = Math.max(0.6, r * Math.abs(k));
  ctx.fillStyle = dark; ctx.beginPath();
  if (waxing) { ctx.arc(x, y, r, Math.PI / 2, Math.PI * 1.5, false); ctx.ellipse(x, y, rx, r, 0, -Math.PI / 2, Math.PI / 2, k < 0); }
  else { ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false); ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, Math.PI * 1.5, k < 0); }
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
// Milky Way: a grainy band rendered once, drawn faintly through the deepest hours.
const MW = document.createElement('canvas'); MW.width = 1024; MW.height = 300;
{ const c = MW.getContext('2d'); let s = 4242; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 1.5; };
  for (let i = 0; i < 9000; i++) { const x = rnd() * 1024, y = 150 + gauss() * 42, a = 0.04 + rnd() * 0.16; c.fillStyle = `rgba(235,238,255,${a.toFixed(3)})`; c.fillRect(x, y, 1 + (rnd() < 0.08 ? 1 : 0), 1); }
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) { const x = rnd() * 1024, y = 150 + gauss() * 20, g = c.createRadialGradient(x, y, 0, x, y, 40 + rnd() * 60); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 1024, 300); }
}
// The two Dippers, as they really sit around Polaris: [right ascension h, declination °, size]
const DIPPERS = [
  [[11.06, 61.75, 2.1], [11.03, 56.38, 2.0], [11.90, 53.69, 1.9], [12.26, 57.03, 1.5], [12.90, 55.96, 2.1], [13.40, 54.93, 1.9], [13.79, 49.31, 2.1]],
  [[2.53, 89.26, 2.0], [17.54, 86.59, 1.2], [16.77, 82.04, 1.3], [15.73, 77.79, 1.3], [16.29, 75.76, 1.1], [14.85, 74.16, 1.8], [15.35, 71.83, 1.5]],
];
const polar = (ra, dec, h, cx, cy, s) => { const a = (ra * 15 + h * 15 + 200) * Math.PI / 180, r = (90 - dec) * s; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
// Plane, crow, bats, heat lightning
let plane = { t: -1, trail: [] }, nextPlane = skyDemo ? 800 : 25000 + Math.random() * 60000;
let crow = { state: 'gone', t0: 0 };
const bats = Array.from({ length: 7 }, (_, i) => ({ x: 0.15 + Math.random() * 0.7, y: 0.06 + Math.random() * 0.2, vx: 0, vy: 0, ph: i * 1.3, nt: 0 }));
// Weather: what the sky is doing over the visitor right now, from the sky Worker
// (Cloudflare's rough location, rounded to ~10 km, asked of Open-Meteo; nothing kept).
// It only holds near the visitor's present hour and fades as they scroll away from now.
// ?wx=rain | drizzle | snow | storm | fog | haze | overcast | clear, optionally :0.6 for amount, forces it everywhere.
const SKY_URL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 'https://nathancurtis.me/sky' : '/sky'; // same site in production; local dev borrows the live one
let WX = null;
const wxForce = (() => { const v = new URLSearchParams(location.search).get('wx'); if (!v) return null; const [sky, a] = v.split(':'); const amt = a ? +a : 0.8;
  const base = { sky, amount: amt, cloud: 0, haze: 0, wind: 12 };
  if (sky === 'overcast') return { ...base, sky: 'clear', amount: 0, cloud: 1 };
  if (sky === 'haze') return { ...base, sky: 'clear', amount: 0, haze: amt, cloud: 0.2 };
  if (sky === 'clear') return { ...base, amount: 0 };
  return { ...base, cloud: sky === 'fog' ? 0.6 : 0.9, wind: sky === 'storm' ? 35 : sky === 'snow' ? 8 : 15 }; })();
if (wxForce) WX = wxForce;
const weatherReady = wxForce ? Promise.resolve(wxForce) : fetch(SKY_URL, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => { if (d && d.sky && d.sky !== 'unknown') WX = d; return WX; }).catch(() => null);
const drops = Array.from({ length: 420 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, p: Math.random() * 6.28 }));
let bolt = { t: -1 }, nextBolt = 4000;
let wxAll = !!wxForce;
function wxStrength(h) { if (!WX) return 0; return wxAll ? 1 : clamp(1 - (cdist(h, nowHour()) - 1.5) / 2.5, 0, 1); }
function drawWeather(h, t, dt, z, night) {
  const s = wxStrength(h); if (s <= 0) return;
  const { sky, amount = 0, cloud = 0, haze = 0, wind = 0 } = WX;
  const wet = sky === 'rain' || sky === 'drizzle' || sky === 'storm' || sky === 'snow';
  // overcast: a grey lid that hides the sun, moon and stars in proportion to cover
  const lid = s * Math.min(0.85, cloud * 0.5 + (wet ? 0.22 + amount * 0.2 : 0) + (sky === 'fog' ? 0.15 : 0));
  // Weather colours follow the dark of the sky gradually, so a heavy lid can't jump from night grey to day grey.
  const byNight = (day, dark) => mix(day, dark, night).map(Math.round);
  if (lid > 0.01) { const grey = byNight([150, 156, 166], [28, 30, 38]), top = mix(z, grey, 0.75);
    const g = ctx.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, `rgba(${top.map(Math.round)},${lid.toFixed(3)})`); g.addColorStop(1, `rgba(${grey},${(lid * 0.7).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); }
  if (haze > 0) { ctx.fillStyle = `rgba(${byNight([214, 204, 186], [60, 58, 62])},${(s * haze * 0.4).toFixed(3)})`; ctx.fillRect(0, 0, W, Hh); }
  if (sky === 'fog') { const g = ctx.createLinearGradient(0, Hh * 0.25, 0, Hh); const c = byNight([226, 228, 230], [70, 74, 84]);
    g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.6, `rgba(${c},${(s * amount * 0.55).toFixed(3)})`); g.addColorStop(1, `rgba(${c},${(s * amount * 0.8).toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); }
  // storm: real lightning, a whole-sky flash and a forked bolt
  if (sky === 'storm' && !reduced) {
    nextBolt -= dt;
    if (bolt.t < 0 && nextBolt < 0) { const x0 = W * (0.15 + Math.random() * 0.7), pts = [[x0, -5]]; let x = x0, y = 0; while (y < Hh * (0.55 + Math.random() * 0.3)) { y += 14 + Math.random() * 30; x += (Math.random() - 0.5) * 46; pts.push([x, y]); } bolt = { t: 0, pts }; nextBolt = (6000 + Math.random() * 12000) / Math.max(0.4, amount); }
    if (bolt.t >= 0) { bolt.t += dt; const k = bolt.t / 520, env = k < 1 ? (k < 0.12 ? 1 : k < 0.2 ? 0.25 : k < 0.32 ? 0.85 : 1 - k) : 0;
      if (env > 0) { ctx.fillStyle = `rgba(235,238,255,${(0.32 * env * s).toFixed(3)})`; ctx.fillRect(0, 0, W, Hh);
        ctx.strokeStyle = `rgba(250,250,255,${(0.95 * env * s).toFixed(3)})`; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.beginPath(); bolt.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      if (k >= 1) bolt.t = -1; }
  }
  // falling weather
  if (!wet || reduced) return;
  window.skyInkClean?.(skyEl);   // the text reads the sky before snow and rain, so passing drops can't flicker it
  const snow = sky === 'snow', drizzle = sky === 'drizzle';
  const n = Math.round(drops.length * Math.min(1, (snow ? 0.55 : drizzle ? 0.5 : 0.7) * (0.35 + amount)) * s);
  const lean = clamp(wind / 60, 0, 0.6) * (snow ? 1.4 : 1), sec = dt / 1000;
  const col = snow ? byNight([255, 255, 255], [240, 242, 250]) : byNight([120, 130, 150], [190, 200, 220]);
  ctx.strokeStyle = `rgba(${col},${(snow ? 0.9 : drizzle ? 0.35 : 0.45) * s})`; ctx.fillStyle = `rgba(${col},${0.85 * s})`;
  ctx.lineWidth = drizzle ? 0.7 : 1; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = drops[i], v = snow ? 0.06 * d.s : (drizzle ? 0.55 : 0.95) * d.s;
    d.y += v * sec * (snow ? 1 : 1.4); d.x += (lean * v + (snow ? Math.sin(t / 900 + d.p) * 0.0006 : 0)) * sec;
    if (d.y > 1.02) { d.y = -0.02; d.x = Math.random() * 1.2 - 0.2; } if (d.x > 1.05) d.x -= 1.1;
    const x = d.x * W, y = d.y * Hh;
    if (snow) { ctx.moveTo(x + 1.6 * d.s, y); ctx.arc(x, y, 1.6 * d.s, 0, 7); }
    else { const L = (drizzle ? 7 : 15) * d.s; ctx.moveTo(x, y); ctx.lineTo(x - lean * L, y - L); }
  }
  snow ? ctx.fill() : ctx.stroke();
}
let flash = { t: -1, x: 0 }, nextFlash = skyDemo ? 12000 : 180000 + Math.random() * 300000;
function drawCrow(x, y, s, wing, alpha) {   // a silhouette; wing is the flap angle, 0 when perched
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.fillStyle = '#121014'; ctx.strokeStyle = '#121014'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.42, -0.25, 0, 7); ctx.fill();                       // body
  ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.38, s * 0.32, 0, 7); ctx.fill();                              // head
  ctx.beginPath(); ctx.moveTo(s * 1.1, -s * 0.42); ctx.lineTo(s * 1.55, -s * 0.3); ctx.lineTo(s * 1.1, -s * 0.22); ctx.fill(); // beak
  ctx.beginPath(); ctx.moveTo(-s * 0.8, 0.1 * s); ctx.lineTo(-s * 1.5, s * 0.35); ctx.lineTo(-s * 1.35, -s * 0.05); ctx.fill(); // tail
  if (wing !== 0) { ctx.lineWidth = s * 0.28; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * s * 0.4, -s * 1.4 * wing, d * s * 1.5, -s * 1.5 * wing * 0.8 + s * 0.2); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.15); ctx.quadraticCurveTo(s * 0.1, -s * 0.5, s * 0.55, -s * 0.2); ctx.lineWidth = s * 0.12; ctx.stroke(); } // folded wing line
  ctx.restore();
}

let W = 0, Hh = 0, dpr = 1;
function sizeSky() {
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = innerWidth; Hh = SH; // the sky is drawn to the fixed height too; anything taller shows the horizon colour behind it
  skyEl.width = Math.round(W * dpr); skyEl.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawSky(h, t, dt) {
  const z = at(ZEN, h), o = at(HOR, h);
  const g = ctx.createLinearGradient(0, 0, 0, Hh);
  g.addColorStop(0, rgb(z)); g.addColorStop(0.72, rgb(mix(z, o, 0.55))); g.addColorStop(1, rgb(o));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
  const sunA = Math.sin((h - 6) / 12 * Math.PI);
  // Heat lightning: a silent flash low on the horizon, late evenings, rarely.
  if (!reduced && h > 19.5 && h < 23.6) {
    nextFlash -= dt;
    if (flash.t < 0 && nextFlash < 0) { flash = { t: 0, x: W * (0.1 + Math.random() * 0.8) }; nextFlash = skyDemo ? 15000 + Math.random() * 15000 : 180000 + Math.random() * 300000; }
    if (flash.t >= 0) {
      flash.t += dt; const k = flash.t / 420, env = k < 1 ? Math.max(0, Math.sin(k * Math.PI)) * (k > 0.35 && k < 0.5 ? 0.35 : 1) : 0;
      if (env > 0) { const fg = ctx.createRadialGradient(flash.x, Hh * 0.9, 0, flash.x, Hh * 0.9, W * 0.36); fg.addColorStop(0, `rgba(255,246,228,${(0.26 * env).toFixed(3)})`); fg.addColorStop(0.5, `rgba(255,236,210,${(0.08 * env).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,236,210,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, Hh); }
      if (k >= 1) flash.t = -1;
    }
  }
  const sunX = ((h - 6) / 12) * W * 1.1 - W * 0.05;
  const sunY = Hh * 0.6 - sunA * Hh * 0.5;
  const night = clamp(lum(z) < 0.12 ? 1 : (0.25 - lum(z)) / 0.13, 0, 1);
  if (night > 0) {
    const deep = clamp(1 - cdist(h, 1) / 3.6, 0, 1);   // the Milky Way only in the deepest hours, 21:30 to 04:30
    if (deep > 0) { ctx.save(); ctx.globalAlpha = night * deep * 0.55; ctx.translate(W * 0.55, Hh * 0.36); ctx.rotate(-0.55 + (h - 1) * 0.045); const mw = W * 1.5; ctx.drawImage(MW, -mw / 2, -mw * 300 / 1024 / 2, mw, mw * 300 / 1024); ctx.restore(); }
    { // Big and Little Dipper, turning around Polaris once a day
      const cx = W * 0.2, cy = Hh * 0.3, sc = Math.min(W, Hh) * 0.0068;
      ctx.fillStyle = '#f4f5ff'; ctx.strokeStyle = '#f4f5ff';
      for (const con of DIPPERS) {
        const pts = con.map(([ra, dec, sz]) => [...polar(ra, dec, h, cx, cy, sc), sz]);
        ctx.globalAlpha = night * 0.04; ctx.lineWidth = 0.6; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        pts.forEach(([x, y, sz], i) => { const tw = 0.75 + 0.25 * Math.sin(t / 1100 + i * 2.1); ctx.globalAlpha = night * tw; ctx.beginPath(); ctx.arc(x, y, sz * 0.75, 0, 7); ctx.fill(); });
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#eef0ff';
    for (const [sx, sy, b, ph] of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t / 900 + ph);
      ctx.globalAlpha = night * b * tw * 0.9;
      const r = 0.5 + b * 1.1;
      ctx.fillRect(sx * W, sy * Hh, r, r);
    }
    ctx.globalAlpha = 1;
    if (!reduced) {
      nextMeteor -= dt;
      if (nextMeteor < 0) { nextMeteor = 3000 + Math.random() * 7000; meteors.push({ x: W * (0.1 + Math.random() * 0.8), y: Hh * Math.random() * 0.35, a: Math.PI * (0.62 + Math.random() * 0.25), l: 0, s: 900 + Math.random() * 600, len: 90 + Math.random() * 120 }); }
      for (const m of meteors) {
        m.l += dt;
        const k = m.l / m.s, x = m.x + Math.cos(m.a) * k * 520, y = m.y + Math.sin(m.a) * k * 520;
        const fade = Math.sin(Math.min(1, k) * Math.PI);
        const gr = ctx.createLinearGradient(x, y, x - Math.cos(m.a) * m.len, y - Math.sin(m.a) * m.len);
        gr.addColorStop(0, `rgba(255,255,250,${(0.9 * fade * night).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,255,250,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(m.a) * m.len, y - Math.sin(m.a) * m.len); ctx.stroke();
      }
      for (let i = meteors.length - 1; i >= 0; i--) if (meteors[i].l > meteors[i].s) meteors.splice(i, 1);
      nextSat -= dt;
      if (sat.t < 0 && nextSat < 0) { sat = { t: 0, y: Hh * (0.1 + Math.random() * 0.4), dir: Math.random() < 0.5 ? 1 : -1 }; nextSat = 30000 + Math.random() * 30000; }
      if (sat.t >= 0) {
        sat.t += dt;
        const k = sat.t / 26000, x = sat.dir > 0 ? k * (W + 40) - 20 : W + 20 - k * (W + 40);
        ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(t / 250)); ctx.fillStyle = '#fff'; ctx.fillRect(x, sat.y + Math.sin(k * 3) * 30, 1.6, 1.6); ctx.globalAlpha = 1;
        if (k > 1) sat.t = -1;
      }
    }
  }
  const twilight = clamp(1 - Math.abs(sunA + 0.08) / 0.3, 0, 1);
  if (twilight > 0) {
    const vx = sunX + (h < 12 ? W * 0.14 : -W * 0.14), vy = sunY - Hh * 0.16;
    const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, 14);
    vg.addColorStop(0, `rgba(255,250,240,${(0.95 * twilight).toFixed(2)})`); vg.addColorStop(0.3, `rgba(255,250,240,${(0.5 * twilight).toFixed(2)})`); vg.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vx, vy, 14, 0, 7); ctx.fill();
  }
  if (sunA > -0.18) {
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Hh * (0.45 + 0.25 * (1 - Math.abs(sunA))));
    const low = clamp(1 - sunA * 1.4, 0, 1);
    const under = clamp(1 + sunA / 0.18, 0, 1);
    glow.addColorStop(0, `rgba(255, ${Math.round(220 - low * 90)}, ${Math.round(170 - low * 110)}, ${(0.5 + low * 0.2) * under})`);
    glow.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, Hh);
    const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 42);
    disc.addColorStop(0, 'rgba(255,250,235,.95)'); disc.addColorStop(0.55, 'rgba(255,240,210,.7)'); disc.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.globalAlpha = under; ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(sunX, sunY, 42, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  const mh = ((h + 5) % 24);
  if (mh < 11 && night > 0) {
    const ma = Math.sin(mh / 11 * Math.PI);
    const mx = (mh / 11) * W * 1.05 - W * 0.025, my = Hh * 0.5 - ma * Hh * 0.42;
    ctx.globalAlpha = night * 0.95;
    const halo = ctx.createRadialGradient(mx, my, 0, mx, my, 60);
    halo.addColorStop(0, 'rgba(220,225,245,.18)'); halo.addColorStop(1, 'rgba(220,225,245,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 60, 0, 7); ctx.fill();
    drawMoon(mx, my, 13, moonPhase(), night * 0.95, rgb(mix(z, [150, 155, 180], 0.16)));
  }
  // A plane, now and then: a speck with a contrail by day, a pair of lights by night.
  const day = clamp((sunA + 0.02) / 0.1, 0, 1);
  if (!reduced) {
    nextPlane -= dt;
    if (plane.t < 0 && nextPlane < 0) { plane = { t: 0, y: Hh * (0.05 + Math.random() * 0.12), dir: Math.random() < 0.5 ? 1 : -1, dur: 42000 + Math.random() * 20000, trail: plane.trail, last: 0 }; nextPlane = skyDemo ? 12000 : 90000 + Math.random() * 150000; }
    if (plane.t >= 0) {
      plane.t += dt; const k = plane.t / plane.dur, x = plane.dir > 0 ? k * (W + 60) - 30 : W + 30 - k * (W + 60), y = plane.y + Math.sin(k * 2.2) * 14;
      if (day > 0 && plane.t - plane.last > 140) { plane.trail.push({ x, y, age: 0 }); plane.last = plane.t; }
      if (day > 0) { ctx.globalAlpha = 0.55 * day; ctx.fillStyle = '#3a3b44'; ctx.fillRect(x - 3, y - 0.6, 6, 1.4); ctx.fillRect(x - 0.6, y - 2.2, 1.2, 4.4); ctx.globalAlpha = 1; }
      if (day < 1) { const red = (t % 1000) < 500, strobe = (t % 1600) < 70; ctx.globalAlpha = (1 - day) * night; if (red) { ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x - 3, y, 1.6, 1.6); } if (strobe) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y, 1.8, 1.8); } ctx.globalAlpha = 1; }
      if (k > 1) plane.t = -1;
    }
    if (plane.trail.length) {
      ctx.lineCap = 'round';
      for (let i = 1; i < plane.trail.length; i++) { const a = plane.trail[i - 1], b = plane.trail[i]; b.age += dt; const f = 1 - b.age / 38000; if (f <= 0) continue; ctx.globalAlpha = 0.32 * f * f * day; ctx.lineWidth = 1 + (1 - f) * 7; ctx.strokeStyle = 'rgba(255,255,255,1)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.globalAlpha = 1; plane.trail[0].age += dt;
      while (plane.trail.length && plane.trail[0].age > 38000) plane.trail.shift();
    }
  }
  // The crow of Burnt Orange: it comes in around six and settles on a wire in the corner.
  const crowA = clamp((0.55 - Math.abs(h - 18.2)) / 0.15, 0, 1);
  if (crowA > 0) {
    const wire = x => Hh * (0.02 + 0.14 * (x - W * 0.74) / (W * 0.26)) + Math.sin((x - W * 0.74) / (W * 0.26) * Math.PI) * 9;
    ctx.globalAlpha = crowA * 0.55; ctx.strokeStyle = '#1a1813'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(W * 0.74, -2); for (let x = W * 0.74; x <= W + 4; x += 12) ctx.lineTo(x, wire(x)); ctx.stroke(); ctx.globalAlpha = 1;
    const px = W * 0.885, py = wire(px) - 1;
    if (crow.state === 'gone') crow = { state: reduced ? 'perched' : 'flying', t0: t };
    if (crow.state === 'flying') {
      const k = clamp((t - crow.t0) / 7000, 0, 1), e = k * k * (3 - 2 * k);
      const x = -40 + (px + 40) * e, y = Hh * 0.11 + (py - Hh * 0.11) * e + Math.sin(e * Math.PI) * Hh * -0.05;
      const flap = Math.sin(t / 95) * (k < 0.78 ? 0.9 : 0.9 * (1 - (k - 0.78) / 0.22));
      drawCrow(x, y, 9, 0.15 + flap, crowA);
      if (k >= 1) crow.state = 'perched';
    } else { const bob = Math.sin(t / 2600) > 0.96 ? 1.2 : 0; drawCrow(px, py - 5 + bob, 8.5, 0, crowA); }
  } else crow.state = 'gone';
  // Bats, for a little while after sunset.
  const batA = clamp(1 - Math.abs(sunA + 0.14) / 0.12, 0, 1);
  if (batA > 0 && !reduced) {
    ctx.strokeStyle = '#141216'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (const b of bats) {
      b.nt -= dt; if (b.nt < 0) { b.vx = (Math.random() - 0.5) * 0.00022; b.vy = (Math.random() - 0.5) * 0.00018; b.nt = 160 + Math.random() * 400; }
      b.x = clamp(b.x + b.vx * dt, 0.06, 0.94); b.y = clamp(b.y + b.vy * dt, 0.04, 0.3);
      const x = b.x * W, y = b.y * Hh, f = Math.sin(t / 55 + b.ph) * 3.2, s = 4.5;
      ctx.globalAlpha = batA * 0.75; ctx.beginPath(); ctx.moveTo(x - s, y - f); ctx.quadraticCurveTo(x - s / 2, y + 1, x, y); ctx.quadraticCurveTo(x + s / 2, y + 1, x + s, y - f); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  drawWeather(h, t, dt, z, night);
  return { z, o, sunA, night };
}

let keys = [];
function layout() {
  const m = mobile.matches, Wv = innerWidth;
  for (const it of items) {
    if (it.span) it.el.style.height = Math.round(it.span * SH / 100) + 'px';
    if (it.pin) it.pin.style.height = SH + 'px';
    else if (it.flow) it.el.style.paddingTop = it.el.style.paddingBottom = Math.round(SH * (m ? 0.10 : 0.14)) + 'px';
  }
  for (const it of items) {
    if (it.kind === 'ph') {
      const [aw, ah] = it.p.aspect.split('/').map(Number);
      it.inner.style.setProperty('--w', (m ? (aw > ah ? Math.round(Wv * 0.86) : Math.round(Wv * 0.66)) : Math.round(aw > ah ? Math.min(Wv * 0.62, vh() * 0.95) : Math.min(Wv * 0.36, vh() * 0.64))) + 'px');
    } else if (it.kind === 'win') {
      const [aw, ah] = it.p.aspect.split('/').map(Number);
      const real = { 'canyonlands-dawn': 4.23, 'red-rock-road': 4.88, 'snowbound-valley': 2.39 }[it.p.id] || aw / ah;
      it.inner.style.setProperty('--w', Wv + 'px');
      it.whFull = Math.round(Wv / real);
      it.wh = it.p.id === 'red-rock-road' ? it.whFull : Math.round(m ? Math.max(vh() * 0.4, Wv / real * 1.6) : vh() * 0.82);
      it.inner.style.setProperty('--wh', it.wh + 'px');
    } else if (it.kind === 'turn') {
      const w = m ? Math.round(Wv * 0.36) : Math.round(Math.min(Wv * 0.15, vh() * 0.28));
      it.cw = w; it.R = m ? Math.round(Math.min(Wv * 0.95, vh() * 0.42)) : Math.round(Math.min(Wv * 0.33, vh() * 0.55));
      for (const c of it.cards) c.el.style.width = w + 'px';
    } else if (it.kind === 'orbit') {
      const w = m ? Math.round(Wv * 0.44) : Math.round(Math.min(Wv * 0.25, vh() * 0.40));
      it.cw = w;
      for (const c of it.cards) c.el.style.width = w + 'px';
    } else if (it.kind === 'lights') {
      const H = vh();
      const spots = m ? [[0.03, 0.06, 0.55], [0.42, 0.2, 0.56], [0.0, 0.42, 0.5], [0.45, 0.5, 0.55], [0.08, 0.7, 0.5], [0.5, 0.74, 0.46]]
                      : [[0.06, 0.08, 0.22], [0.33, 0.04, 0.3], [0.66, 0.1, 0.26], [0.16, 0.5, 0.3], [0.49, 0.47, 0.24], [0.74, 0.53, 0.24]];
      it.blobs.forEach((b, i) => {
        const [fx, fy, fw] = spots[i % spots.length];
        const w = Math.round(Wv * fw), hgt = Math.round(w * (b.p.aspect === '4/3' ? 0.82 : 1.18));
        b.el.style.left = Math.round(Wv * fx) + 'px'; b.el.style.top = Math.round(H * fy) + 'px';
        b.el.style.width = (w / 2) + 'px'; b.el.style.height = (hgt / 2) + 'px'; // rasterized at half size, scale(2) in motion()
        b.cx = Wv * fx + w / 2; b.cy = H * fy + hgt / 2;
      });
    } else if (it.kind === 'frieze') {
      friezeTrack.style.setProperty('--fh', Math.round(m ? vh() * 0.46 : vh() * 0.62) + 'px');
    }
  }
  for (const el of day.querySelectorAll('.st')) {
    const n = +el.dataset.n;
    const w = m ? Math.round(Wv * 0.26) : Math.round(Wv * ([0.13, 0.17, 0.11, 0.15][n % 4]));
    el.style.width = w + 'px';
    const left = [0.06, 0.78, 0.1, 0.74][n % 4], top = [0.14, 0.58, 0.62, 0.12][n % 4];
    el.style.left = Math.round((m ? [0.04, 0.7, 0.04, 0.7][n % 4] : left) * Wv) + 'px';
    el.style.top = Math.round((m ? [0.13, 0.78, 0.78, 0.13][n % 4] : top) * vh()) + 'px';
  }
  keys = items.map(it => { const r = it.el.getBoundingClientRect(); return [r.top + scrollY + r.height * 0.5, it.hour]; }).sort((a, b) => a[0] - b[0]);
  lastHour = -1;
}
const hourAtY = y => {
  if (!keys.length) return 0;
  if (y <= keys[0][0]) return keys[0][1] - (keys[0][0] - y) / vh();
  for (let i = 1; i < keys.length; i++) if (y <= keys[i][0]) { const [y0, h0] = keys[i - 1], [y1, h1] = keys[i]; return h0 + (h1 - h0) * ((y - y0) / Math.max(1, y1 - y0)); }
  const [yl, hl] = keys[keys.length - 1];
  return hl + (y - yl) / vh();
};
// Arrive exactly at the hour it is: the clock, read at the middle of the screen, says now.
const landY = h => Math.max(0, yAtHour(h) - SH * 0.5);
const yAtHour = h => {
  if (!keys.length) return 0;
  if (h <= keys[0][1]) return keys[0][0];
  for (let i = 1; i < keys.length; i++) if (h <= keys[i][1]) { const [y0, h0] = keys[i - 1], [y1, h1] = keys[i]; return y0 + (y1 - y0) * ((h - h0) / Math.max(0.01, h1 - h0)); }
  return keys[keys.length - 1][0];
};

for (let h = 0; h < 24; h++) {
  const b = document.createElement('b');
  if (h % 3 === 0) b.dataset.l = String(h).padStart(2, '0');
  b.onclick = () => scrollTo({ top: yAtHour(h + 0.3) - SH * 0.5, behavior: reduced ? 'auto' : 'smooth' });
  rail.appendChild(b);
}
const ticks = [...rail.children];
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('dev'); e.target.classList.add('lit'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

let pointer = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });

let lastHour = -1, booting = true;
const fmt = h => { const hh = Math.floor(((h % 24) + 24) % 24), mm = Math.floor((((h % 1) + 1) % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
function paint(h, t, dt) {
  const s = drawSky(h, t, dt);
  const k = smooth(0.37, 0.47, lum(mix(s.z, s.o, 0.5)));
  const ink = mix(INK_D, INK_L, k).map(Math.round);
  const st = document.documentElement.style;
  st.setProperty('--ink', `rgb(${ink})`);
  st.setProperty('--ink-rgb', ink.join(', '));
  st.setProperty('--sky', rgb(s.o));
  st.setProperty('--sky-z', rgb(s.z));
  const near = Math.abs(((h - nowHour() + 12) % 24 + 24) % 24 - 12) < 0.2;
  clock.innerHTML = `${fmt(h)}${near ? '<i>now</i>' : ''}`;
  const cur = Math.round(((h % 24) + 24) % 24) % 24;
  ticks.forEach((b, i) => b.classList.toggle('on', i === cur));
  const dark = 1 - k;
  const up = s.sunA > 0.02;
  const len = up ? (1 - s.sunA) * 34 + 6 : 4;
  const dirx = up ? -Math.cos((h - 6) / 12 * Math.PI) : 0;
  const sx = dirx * len, sy = up ? 6 + (1 - s.sunA) * 10 : 4, sb = up ? 18 + s.sunA * 40 : 30;
  st.setProperty('--sx', sx.toFixed(1) + 'px'); st.setProperty('--sy', sy.toFixed(1) + 'px'); st.setProperty('--sb', sb.toFixed(0) + 'px');
  st.setProperty('--sh', up ? '40, 25, 10' : '0, 0, 0'); st.setProperty('--sa', (0.22 + 0.38 * dark).toFixed(2));
  st.setProperty('--b', (1 - 0.14 * dark).toFixed(3)); st.setProperty('--c', (1 + 0.06 * dark).toFixed(3));
  window.skyInk?.(skyEl);
}
function motion(t) {
  const H = vh();
  for (const it of items) {
    if (it.flow) continue;
    const r = it.el.getBoundingClientRect();
    const off = r.bottom < -100 || r.top > innerHeight + 100;
    if (it.kind === 'lights') it.el.classList.toggle('idle', off);
    if (off) continue;
    const p = clamp(-r.top / (r.height - H), 0, 1);
    if (it.inner) it.inner.style.setProperty('--s', (it.kind === 'win' ? 1 : 0.62 + 0.38 * Math.sin(p * Math.PI)).toFixed(4));
    if (it.kind === 'win') {
      const img = it.inner.querySelector('img'), fr = it.inner.querySelector('.frame');
      const pan = clamp(p / 0.5, 0, 1), zoom = smooth(0.5, 0.82, p);
      const h = Math.round(it.wh + (it.whFull - it.wh) * zoom);
      if (fr.offsetHeight !== h) fr.style.height = h + 'px';
      const overX = Math.max(0, img.offsetWidth - fr.offsetWidth);
      img.style.transform = `translateX(${(-overX * pan).toFixed(1)}px)`;
    } else if (it.kind === 'lights') {
      for (const b of it.blobs) {
        const px = (pointer.x - b.cx) / innerWidth, py = (pointer.y - b.cy) / H;
        const tx = -px * 14 + Math.sin(t / 4000 + b.ph) * 10, ty = -py * 10 + Math.cos(t / 5200 + b.ph) * 8 + (p - 0.5) * -60 * (b.i % 2 ? 1 : 0.5);
        b.dx += (tx - b.dx) * 0.04; b.dy += (ty - b.dy) * 0.04;
        b.el.style.transform = `translate(${b.dx.toFixed(1)}px, ${b.dy.toFixed(1)}px) scale(2)`;
      }
      if (BREATHE && !reduced && t - (it.lastNoise || -1e9) >= 250) {
        it.lastNoise = t;
        const wob = 0.024 + 0.006 * Math.sin(t / 26000 * Math.PI * 2); // 0.018..0.030 (half-res element, so 2x the original 0.009..0.015)
        const k = (1 + Math.sin(t / 18000 * Math.PI * 2)) / 2;
        wobTurb.setAttribute('baseFrequency', wob.toFixed(4));
        aurTurb.setAttribute('baseFrequency', `${(0.008 + 0.006 * k).toFixed(4)} ${(0.06 - 0.016 * k).toFixed(4)}`); // "0.008 0.06" .. "0.014 0.044"
      }
    } else if (it.kind === 'turn') {
      // Marble on a slow carousel: scrolling brings each figure to the front once; time drifts it gently.
      const n = it.cards.length, ang = p * 360 * (n - 1) / n + (reduced ? 0 : t / 1000 * 1.1);
      for (const c of it.cards) {
        const a = (c.i * 360 / n - ang) * Math.PI / 180, z = Math.cos(a), lit = clamp((z + 0.25) / 1.25, 0, 1);
        const s = 1200 / (1200 - it.R * z), x = it.R * Math.sin(a) * s;   // simple perspective projection of a ring
        c.el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), -50%) scale(${s.toFixed(3)})`;
        c.el.style.opacity = clamp(1 + z * 1.6, 0, 1).toFixed(3);
        c.el.style.filter = `brightness(${(0.35 + 0.65 * lit).toFixed(3)})`;
        c.el.style.zIndex = Math.round(100 + z * 50);
        c.el.style.setProperty('--co', Math.pow(Math.max(0, z), 4).toFixed(2));
      }
    } else if (it.kind === 'orbit') {
      // Three stray frames on a tilted ring, bottom-right to upper-left. Scrolling turns it once; time drifts it slowly.
      const m = mobile.matches, W = innerWidth;
      const tilt = m ? 1.05 : 0.42, cT = Math.cos(tilt), sT = Math.sin(tilt);
      const hw = it.cw / 2, hh = it.cw * 2 / 3 + 30;
      const a = Math.min((H / 2 - hh - 16) / sT, (W / 2 - hw - 16) / cT), b = H * 0.06;
      const spin = p * Math.PI * 2 + (reduced ? 0 : t / 16000);
      for (const c of it.cards) {
        const th = spin + c.i * Math.PI * 2 / 3 - Math.PI / 2, z = Math.sin(th);
        const u = a * Math.cos(th), v = b * z;
        const x = u * cT - v * sT, y = u * sT + v * cT, s = 0.5 + 0.5 * (z + 1) / 2;
        c.el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${s.toFixed(3)})`;
        c.el.style.zIndex = Math.round(10 + z * 5);
        c.el.style.opacity = (0.55 + 0.45 * (z + 1) / 2).toFixed(3);
        c.el.style.setProperty('--co', Math.max(0, z * z * z).toFixed(2));
      }
    } else if (it.kind === 'frieze') {
      const over = friezeTrack.scrollWidth - innerWidth + innerWidth * 0.07;
      friezeTrack.style.transform = `translate(${(-over * p).toFixed(1)}px, -50%)`;
    }
    if (it.pin) for (const el of it.pin.querySelectorAll('.st')) el.style.transform = `translateY(${((p - 0.5) * -90 * (+el.dataset.n % 2 ? 1 : -0.7)).toFixed(1)}px)`;
  }
}
let lastFrame = 0, prevY = 0, shownHour = null;
function loop() {
  const L = loopLen(), y = scrollY;
  if (y > botClone.offsetTop + 8 && y > prevY) { scrollTo({ top: y - L, behavior: 'instant' }); lastHour = -1; }
  else if (y < topClone.offsetHeight * 0.5 && y < prevY) { scrollTo({ top: y + L, behavior: 'instant' }); lastHour = -1; }
  prevY = scrollY;
}
function frame(t) {
  const dt = lastFrame ? Math.min(100, t - lastFrame) : 16; lastFrame = t;
  if (!booting) {
    if (lightI < 0) loop();
    const h = shownHour = hourAtY(scrollY + SH * 0.5);
    const night = lum(at(ZEN, h)) < 0.2;
    const twilight = Math.abs(Math.sin((h - 6) / 12 * Math.PI) + 0.08) < 0.3;
    if (Math.abs(h - lastHour) > 0.0015 || night || twilight || wxStrength(h) > 0) { lastHour = h; paint(h, t, dt); }
    motion(t);
  }
  requestAnimationFrame(frame);
}

const light = document.getElementById('light');
const pic = light.querySelector('.pic');
const lightCap = light.querySelector('figcaption');
const cloud = light.querySelector('.cloud');
const fly = document.getElementById('fly');
let lightI = -1, lightBusy = false, lightRect = null;
const FLY_EASE = 'cubic-bezier(.42,0,.16,1)';
const rectPoly = n => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * 4, k = Math.floor(t), f = t - k; pts.push(k === 0 ? `${(f * 100).toFixed(2)}% 0%` : k === 1 ? `100% ${(f * 100).toFixed(2)}%` : k === 2 ? `${(100 - f * 100).toFixed(2)}% 100%` : `0% ${(100 - f * 100).toFixed(2)}%`); } return `polygon(${pts.join(', ')})`; };
function sourceShape(f) {
  const img = f.querySelector('img');
  const sheet = f.querySelector('.sheet');
  const frame = f.querySelector('.frame');
  const clip = sheet ? getComputedStyle(sheet).clipPath : 'none';
  const n = clip.startsWith('polygon') ? clip.split(',').length : 0;
  let pos = '50% 50%';
  if (frame) {
    const fr = frame.getBoundingClientRect(), ir = img.getBoundingClientRect();
    const over = ir.width - fr.width;
    pos = `${over > 0 ? ((fr.left - ir.left) / over * 100).toFixed(2) : 50}% 50%`;
  }
  return { img, el: frame || sheet || img, radius: getComputedStyle(img).borderRadius, clip, rectClip: n ? rectPoly(n) : 'none', pos };
}
let hiddenSrc = null;
const wobT = document.getElementById('wob2t'), wobD = document.getElementById('wob2d');
const srcWob = document.querySelector('#wob feTurbulence');
const wobTurb = document.getElementById('wobt'), aurTurb = document.getElementById('aurt');
function wobble(from, to, ms) {
  wobT.setAttribute('baseFrequency', ((+srcWob.baseFrequencyX.animVal || 0.022) / 2).toFixed(4)); // #wob is tuned for half-res blobs; fly is full-size
  fly.style.filter = 'url(#wob2)';
  const t0 = performance.now();
  const step = now => {
    const k = clamp((now - t0) / ms, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    wobD.setAttribute('scale', (from + (to - from) * e).toFixed(2));
    if (k < 1) requestAnimationFrame(step); else if (to === 0) fly.style.filter = '';
  };
  requestAnimationFrame(step);
}
function fitRect(ar) {
  const W = innerWidth, H = innerHeight;
  let w = W, h = w / ar;
  if (h > H) { h = H; w = h * ar; }
  return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
}
const px = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
const aspectOf = (img, p) => img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : p.aspect.split('/').map(Number).reduce((a, b) => a / b);
const clearAnims = (...els) => els.forEach(el => el.getAnimations().forEach(a => a.cancel()));
function openLight(i) {
  if (lightBusy) return;
  lightBusy = true;
  clearAnims(fly, light, cloud, pic);
  lightI = i;
  if (!history.state?.light) history.pushState({ light: 1 }, '');
  const { p, f } = photos[i];
  const sh = sourceShape(f);
  const from = sh.el.getBoundingClientRect();
  const to = fitRect(aspectOf(sh.img, p));
  lightRect = to;
  const fullSrc = p.src;
  const full = new Image(); full.src = fullSrc;
  const cur = sh.img.currentSrc || sh.img.src;
  fly.style.cssText = `display:block; background-image:url("${cur}"); background-position:${sh.pos}; border-radius:${sh.radius}; clip-path:${sh.clip}; left:${from.left}px; top:${from.top}px; width:${from.width}px; height:${from.height}px;`;
  if (hiddenSrc) hiddenSrc.style.visibility = '';
  hiddenSrc = f; f.style.visibility = 'hidden';
  document.body.style.overflow = 'hidden';
  light.classList.add('on');
  lightCap.innerHTML = `${p.title}<em>${p.collection}, ${p.year}</em>`;
  pic.style.opacity = 0;
  Object.assign(pic.style, px(to));
  pic.style.backgroundImage = `url("${cur}")`;
  light.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 950, easing: FLY_EASE, fill: 'forwards' });
  cloud.animate([{ opacity: .8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 1500, easing: 'ease-out', fill: 'forwards' });
  const kf = [{ ...px(from), borderRadius: sh.radius, clipPath: sh.clip, backgroundPosition: sh.pos }, { ...px(to), borderRadius: '0px', clipPath: sh.rectClip, backgroundPosition: '50% 50%' }];
  if (sh.clip === 'none') { delete kf[0].clipPath; delete kf[1].clipPath; }
  const a = fly.animate(kf, { duration: 950, easing: FLY_EASE, fill: 'forwards' });
  a.onfinish = () => {
    pic.style.opacity = 1;
    fly.style.display = 'none';
    light.classList.add('shown');
    lightBusy = false;
    full.decode().then(() => { if (lightI === i) pic.style.backgroundImage = `url("${fullSrc}")`; }).catch(() => {});
    if (closeAsked) { closeAsked = false; closeLight(); }
  };
  if (sh.clip !== 'none' && !mobile.matches) wobble(22, 0, 950); else fly.style.filter = '';
}
function closeLight() {
  if (lightI < 0 || lightBusy) return;
  lightBusy = true;
  clearAnims(fly, light, cloud, pic);
  const { f } = photos[lightI];
  const sh = sourceShape(f);
  const from = lightRect, to = sh.el.getBoundingClientRect();
  fly.style.cssText = `display:block; background-image:${pic.style.backgroundImage}; background-position:50% 50%; border-radius:0px; clip-path:${sh.rectClip}; left:${from.left}px; top:${from.top}px; width:${from.width}px; height:${from.height}px;`;
  if (hiddenSrc && hiddenSrc !== f) { hiddenSrc.style.visibility = ''; }
  hiddenSrc = f; f.style.visibility = 'hidden';
  pic.style.opacity = 0;
  light.classList.remove('shown');
  light.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 850, easing: FLY_EASE, fill: 'forwards' });
  const kf = [{ ...px(from), borderRadius: '0px', clipPath: sh.rectClip, backgroundPosition: '50% 50%' }, { ...px(to), borderRadius: sh.radius, clipPath: sh.clip, backgroundPosition: sh.pos }];
  if (sh.clip === 'none') { delete kf[0].clipPath; delete kf[1].clipPath; }
  const a = fly.animate(kf, { duration: 850, easing: FLY_EASE, fill: 'forwards' });
  a.onfinish = () => { f.style.visibility = ''; hiddenSrc = null; fly.style.display = 'none'; fly.style.filter = ''; light.classList.remove('on'); document.body.style.overflow = ''; lightI = -1; lightBusy = false; };
  if (sh.clip !== 'none' && !mobile.matches) wobble(0, 22, 850); else fly.style.filter = '';
}
function stepLight(d) {
  if (lightI < 0 || lightBusy) return;
  const n = (lightI + d + photos.length) % photos.length;
  const { p, f } = photos[n];
  const img = f.querySelector('img');
  const to = fitRect(aspectOf(img, p));
  lightBusy = true;
  clearAnims(pic);
  const out = pic.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-d * 40}px)` }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
  out.onfinish = () => {
    lightI = n; lightRect = to;
    Object.assign(pic.style, px(to));
    pic.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lightCap.innerHTML = `${p.title}<em>${p.collection}, ${p.year}</em>`;
    const inn = pic.animate([{ opacity: 0, transform: `translateX(${d * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
    inn.onfinish = () => { lightBusy = false; const full = new Image(); full.src = p.src; full.decode().then(() => { if (lightI === n) pic.style.backgroundImage = `url("${p.src}")`; }).catch(() => {}); };
  };
}
let closeAsked = false, touch0 = null, swiped = false;
const dismiss = () => { if (history.state?.light) history.back(); else closeLight(); };
addEventListener('popstate', () => { if (lightI < 0) return; if (lightBusy) closeAsked = true; else closeLight(); });
light.onclick = e => { if (swiped) { swiped = false; return; } if (lightBusy) return; if (e.target.classList.contains('k')) stepLight(e.target.classList.contains('l') ? -1 : 1); else dismiss(); };
light.addEventListener('touchstart', e => { swiped = false; touch0 = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
light.addEventListener('touchmove', e => { if (e.touches.length === 1) e.preventDefault(); }, { passive: false }); // iOS scrolls the page under a fixed layer otherwise
light.addEventListener('touchend', e => {
  if (!touch0) return;
  const t = e.changedTouches[0], dx = t.clientX - touch0[0], dy = t.clientY - touch0[1]; touch0 = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; stepLight(dx < 0 ? 1 : -1); }
});
addEventListener('keydown', e => { if (e.key === 'Escape') dismiss(); if (e.key === 'ArrowRight') stepLight(1); if (e.key === 'ArrowLeft') stepLight(-1); });
clock.onclick = () => scrollTo({ top: yAtHour(nowHour()) - SH * 0.5, behavior: reduced ? 'auto' : 'smooth' });

const boot = document.getElementById('boot');
const sigSvg = document.getElementById('sig');
const logo = document.getElementById('logo');
const openingNote = document.getElementById('opening-note');
function signature() {
  const S = window.SIG;
  const paths = S.paths.map(p => `<path d="${p.d}" stroke-width="${p.w}"/>`).join('');
  sigSvg.setAttribute('viewBox', `0 0 ${S.w} ${S.h}`);
  sigSvg.innerHTML = paths;
  logo.setAttribute('viewBox', `0 0 ${S.w} ${S.h}`);
  logo.innerHTML = paths;
  const ps = [...sigSvg.querySelectorAll('path')];
  const total = ps.reduce((a, p) => a + p.getTotalLength(), 0);
  const speed = 1450 / total;
  let t = 0;
  ps.forEach(p => {
    const L = p.getTotalLength();
    p.style.strokeDasharray = L;
    p.style.strokeDashoffset = L;
    p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: Math.max(40, L * speed), delay: t, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    t += L * speed + 30;
  });
  return t;
}
function flyLogo() {
  return new Promise(resolve => {
  const from = sigSvg.getBoundingClientRect(), to = logo.getBoundingClientRect();
  const sx = to.width / from.width;
  const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const a = sigSvg.animate([{ transform: 'translate(-50%, -50%)' }, { transform: `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px)) scale(${sx.toFixed(4)})` }], { duration: 900, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
  a.onfinish = () => { logo.style.transition = 'none'; document.getElementById('chrome').classList.add('ready'); sigSvg.style.display = 'none'; resolve(); };
  });
}
function preloadAll() {
  const urls = [...new Set([...document.images].filter(i => i.loading !== 'lazy').map(i => i.currentSrc || i.src).filter(Boolean))];
  return Promise.all(urls.map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; im.decode?.().then(r, r); })));
}
// If nobody has scrolled a few seconds after landing, the day drifts forward a quarter hour and settles back,
// showing that scrolling moves the clock and the sky. Once, and never against the reader's hand.
function hintScroll() {
  if (reduced) return;
  let touched = false;
  const stop = () => { touched = true; };
  const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  evs.forEach(e => addEventListener(e, stop, { once: true, passive: true }));
  const landed = scrollY;
  setTimeout(() => {
    // Any movement since landing, however it came (a link, the clock, a script), means the reader has found it.
    if (touched || document.hidden || Math.abs(scrollY - landed) > 1) { evs.forEach(e => removeEventListener(e, stop)); return; }
    const y0 = scrollY, h = hourAtY(y0 + SH * 0.5), d = yAtHour(Math.min(h + 0.25, 23.9)) - yAtHour(h), t0 = performance.now(), dur = 2400;
    let set = y0;
    const step = now => {
      if (touched || Math.abs(scrollY - set) > 1) return;
      const k = clamp((now - t0) / dur, 0, 1);
      set = Math.round(y0 + d * Math.sin(Math.PI * ease(k)));
      scrollTo(0, set);
      if (k < 1) requestAnimationFrame(step); else evs.forEach(e => removeEventListener(e, stop));
    };
    requestAnimationFrame(step);
  }, 4000);
}
function start() {
  sizeSky();
  const q = new URLSearchParams(location.search);
  const target = q.has('hour') ? +q.get('hour') : nowHour();
  paint(0, 0, 16);
  // The arrival stage's photo comes first, and the opening waits only for it.
  const arrival = items.reduce((a, b) => cdist(a.hour, target) < cdist(b.hour, target) ? a : b);
  const firstImage = arrival.el.querySelector('img');
  if (firstImage) { firstImage.loading = 'eager'; firstImage.fetchPriority = 'high'; }
  const drawn = signature();
  const loaded = Promise.race([preloadAll(), new Promise(r => setTimeout(r, 8000))]);
  // Once the arrival photo is in, the rest of the gallery downloads behind the signature without holding the
  // opening, in the order a reader scrolling on from here meets it (forward through the day, round past midnight),
  // a few at a time. Starting earlier would make the photo the opening waits for share a slow connection.
  const ahead = el => { const it = items.find(i => i.el.contains(el)); return it ? (it.hour - target + 24) % 24 : 24; };
  const queue = [...document.images].filter(i => i.loading === 'lazy').sort((a, b) => ahead(a) - ahead(b));
  const next = () => {
    const img = queue.shift(); if (!img) return;
    img.fetchPriority = 'low'; img.loading = 'eager';
    let done = false; const on = () => { if (!done) { done = true; next(); } };
    if (img.complete && img.naturalWidth) on(); else { img.addEventListener('load', on, { once: true }); img.addEventListener('error', on, { once: true }); }
  };
  loaded.then(() => { for (let i = 0; i < 4; i++) next(); });
  // One line under the signature: the time here and the sky outside, written in as the signature finishes.
  const SAY = { fog: 'foggy', drizzle: 'drizzly', rain: 'raining', storm: 'stormy', snow: 'snowing' };
  const sayWeather = (d, h) => {
    if (!d || !d.sky || d.sky === 'unknown') return '';
    const what = d.sky === 'clear' ? (d.cloud > .68 ? 'overcast' : d.cloud > .28 ? 'cloudy' : 'clear') : SAY[d.sky];
    return what ? `${what} ${h >= 5 && h < 17 ? 'today' : 'tonight'}` : '';
  };
  const fast = q.has('fast');
  const writeLine = new Promise(resolve => setTimeout(async () => {
    const now = new Date(), hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const w = await Promise.race([weatherReady.then(d => sayWeather(d, now.getHours() + now.getMinutes() / 60)), new Promise(r => setTimeout(() => r(''), 300))]);
    openingNote.textContent = w ? `${hhmm} where you are; ${w}.` : `${hhmm} where you are.`;
    const sig = sigSvg.getBoundingClientRect();
    openingNote.style.top = `${Math.round(sig.bottom + Math.min(28, sig.height * 0.3))}px`;
    openingNote.classList.add('on');
    if (reduced || fast) return resolve();
    // A soft edge moves left to right across the line, the way the pen moves across the signature.
    openingNote.style.maskImage = openingNote.style.webkitMaskImage = 'linear-gradient(90deg, #000 40%, transparent 60%)';
    openingNote.style.maskSize = openingNote.style.webkitMaskSize = '250% 100%';
    const a = openingNote.animate([{ maskPosition: '100% 0', webkitMaskPosition: '100% 0' }, { maskPosition: '0 0', webkitMaskPosition: '0 0' }], { duration: 900, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    a.onfinish = resolve;
  }, fast ? 0 : drawn * 0.7));
  // The line holds long enough to read, then the sky comes up behind it while the signature goes to its corner.
  const sweepStart = writeLine.then(() => new Promise(r => setTimeout(r, fast ? 0 : 600))).then(() => {
    if (!fast) openingNote.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(3px)' }], { duration: 900, easing: 'ease-in', fill: 'forwards' });
    flyLogo();
  });
  sweepStart.then(() => {
    layout();
    scrollTo(0, landY(target));
    layout();
    boot.classList.add('off');
    const t0 = performance.now(), dur = q.has('fast') ? 0 : 1800;
    const sweepDone = new Promise(res => {
      const sweep = now => {
        const k = dur ? ease(clamp((now - t0) / dur, 0, 1)) : 1;
        paint(target * k, now, 16);
        if (k < 1) requestAnimationFrame(sweep); else res();
      };
      requestAnimationFrame(sweep);
    });
    Promise.all([sweepDone, loaded]).then(() => {
      layout();
      scrollTo(0, landY(target));
      document.body.classList.add('ready');
      items.forEach(it => io.observe(it.el));
      setTimeout(() => { document.body.classList.remove('booting'); requestAnimationFrame(() => requestAnimationFrame(() => { booting = false; lastHour = -1; if (!fast) hintScroll(); })); }, q.has('fast') ? 0 : 350);
    });
  });
}
history.scrollRestoration = 'manual';
if (history.state?.light) history.replaceState(null, '');
addEventListener('resize', () => {
  sizeSky(); lastHour = -1;
  if (innerWidth === SW) return; // height alone changes nothing on the page
  const h = booting ? null : shownHour; // the hour on screen before the browser reflowed anything
  SW = innerWidth; SH = innerHeight;
  layout();
  if (h !== null) scrollTo({ top: yAtHour(h) - SH * 0.5, behavior: 'instant' }); // a new width re-lays the day out at the same hour
});
addEventListener('load', () => { layout(); });
start();
frame(0);
// Weather desk: only on a local dev server, never on the live site.
if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
  let live = WX && !wxForce ? { ...WX } : null;
  fetch(SKY_URL, { cache: 'no-store' }).then(r => r.json()).then(d => { live = d; paint(); }).catch(() => {});
  const P = { sky: wxForce?.sky || 'live', amount: wxForce?.amount ?? 0.8, cloud: 0.9, haze: 0.6, wind: 15 };
  const desk = document.createElement('div');
  desk.id = 'wxdesk';
  desk.innerHTML = `
  <div class="top"><b>Weather desk · local only</b><span id="wxmin">–</span></div>
  <div class="g">${['live','clear','overcast','haze','fog','drizzle','rain','storm','snow'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
  <label>amount<input type="range" id="wxa" min="0.1" max="1" step="0.05"><span id="wxav"></span></label>
  <label>cloud<input type="range" id="wxc" min="0" max="1" step="0.05"><span id="wxcv"></span></label>
  <label>wind<input type="range" id="wxw" min="0" max="60" step="1"><span id="wxwv"></span></label>
  <div class="row"><span>only near now</span><input type="checkbox" id="wxnear"></div>
  <div class="live" id="wxlive">real sky: asking…</div>`;
  document.body.appendChild(desk);
  const $ = s => desk.querySelector(s);
  function apply() {
    desk.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === P.sky));
    $('#wxa').value = P.amount; $('#wxav').textContent = (+P.amount).toFixed(2);
    $('#wxc').value = P.cloud; $('#wxcv').textContent = (+P.cloud).toFixed(2);
    $('#wxw').value = P.wind; $('#wxwv').textContent = P.wind;
    if (P.sky === 'live') WX = live ? { ...live } : null;
    else if (P.sky === 'overcast') WX = { sky: 'clear', amount: 0, cloud: P.cloud, haze: 0, wind: P.wind };
    else if (P.sky === 'haze') WX = { sky: 'clear', amount: 0, cloud: P.cloud * 0.3, haze: P.amount, wind: P.wind };
    else if (P.sky === 'clear') WX = { sky: 'clear', amount: 0, cloud: 0, haze: 0, wind: P.wind };
    else WX = { sky: P.sky, amount: +P.amount, cloud: +P.cloud, haze: 0, wind: +P.wind };
    wxAll = P.sky === 'live' ? false : !$('#wxnear').checked;
    $('#wxlive').textContent = live ? `real sky here: ${live.sky}${live.amount ? ' ' + live.amount : ''}, cloud ${live.cloud}, wind ${live.wind} km/h` : 'real sky: unavailable';
    lastHour = -1;
  }
  desk.addEventListener('click', e => { const k = e.target.dataset?.k; if (k) { P.sky = k; if (k === 'storm') P.wind = Math.max(P.wind, 30); apply(); } });
  $('#wxa').oninput = e => { P.amount = +e.target.value; apply(); };
  $('#wxc').oninput = e => { P.cloud = +e.target.value; apply(); };
  $('#wxw').oninput = e => { P.wind = +e.target.value; apply(); };
  $('#wxnear').onchange = apply;
  $('#wxmin').onclick = () => desk.classList.toggle('min');
  const paint = apply; apply();
}
