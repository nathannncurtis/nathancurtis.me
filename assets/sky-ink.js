// Text takes its colour from the sky pixels directly behind it.
// Each block of text (a poem, a caption, the records, the nav) holds one side, light or dark, for as long as it is
// on screen, and drifts subtly within that side as the sky moves. It only changes side while it is off screen.
// A soft shadow in the opposite tone sits under the letters; where that isn't enough (the moon, a flash), the sky
// right behind the words dims or lifts a little.
(() => {
  const SW = 128, SH = 80, RATIO = 4.6, SHADE_TARGET = 3.2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  // Warm ramp from near-black brown to warm white; luminance rises along it.
  const RAMP = [[10, 8, 6], [26, 24, 19], [50, 34, 20], [102, 76, 52], [160, 140, 118], [214, 202, 182], [233, 228, 216], [246, 239, 224], [255, 253, 248]];
  const rampAt = s => { const p = clamp(s, 0, 1) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(p)); return mix(RAMP[i], RAMP[i + 1], p - i); };
  const LUT = Array.from({ length: 1024 }, (_, i) => { const c = rampAt(i / 1023); return { c, L: lum(c) }; });
  const inkOfLum = L => {
    let lo = 0, hi = LUT.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LUT[m].L < L) lo = m; else hi = m; }
    const a = LUT[lo], b = LUT[hi], t = b.L === a.L ? 0 : clamp((L - a.L) / (b.L - a.L), 0, 1);
    return mix(a.c, b.c, t);
  };
  // Light side: the page's cream, brightening toward white as the sky behind needs it. Dark side: the page's dark ink, deepening toward black.
  const CREAM = lum([233, 228, 216]), DARK = lum([26, 24, 19]);
  const lightInk = L => inkOfLum(clamp(Math.max(CREAM, RATIO * (L + 0.05) - 0.05), 0, 1));
  const darkInk = L => inkOfLum(clamp(Math.min(DARK, (L + 0.05) / RATIO - 0.05), 0, 1));
  const inkOn = (side, L) => side === 'light' ? lightInk(L) : darkInk(L);

  const TEXT = '#clock, #work, #priv, .cap, .k-lights h3, .k-turn h3, .k-frieze h3, .po h2, .po .ln .tx, .po .ln small, .mu h2, .mu ol, .mu .ctl, #light figcaption, #light .k';
  const FIXED = ['chrome', 'rail', 'light'];
  const groupOf = el => el.closest('#chrome, #rail, #light, .po, .mu, .stage') || el;

  const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
  const small = mk(), smallCtx = small.getContext('2d', { willReadFrequently: true });
  const lightMap = mk(), darkMap = mk();
  const root = document.documentElement;
  const sideOf = new WeakMap();
  let onScreen = new Set();
  let busy = false, pending = null, ready = false, skyLum = null, skyRGB = null, calm = null, steady = null, rawRGB = null, builtClock = null;

  // The local dimming of the sky, drawn between the sky and the text.
  const shade = document.createElement('canvas'); shade.id = 'shade';
  const shadeCtx = shade.getContext('2d');
  document.getElementById('sky').after(shade);

  const clockNow = () => { const [hh, mm] = (document.getElementById('clock')?.textContent || '00:00').slice(0, 5).split(':').map(Number); return hh + mm / 60; };
  const cells = r => ({
    x0: clamp(Math.floor(r.left / innerWidth * SW), 0, SW - 1), x1: clamp(Math.floor(r.right / innerWidth * SW), 0, SW - 1),
    y0: clamp(Math.floor(r.top / innerHeight * SH), 0, SH - 1), y1: clamp(Math.floor(r.bottom / innerHeight * SH), 0, SH - 1),
  });
  const worst = (side, c) => {
    let w = Infinity;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const L = calm[y * SW + x]; w = Math.min(w, contrast(L, lum(inkOn(side, L)))); }
    return w;
  };
  const better = c => worst('light', c) >= worst('dark', c) ? 'light' : 'dark';

  // How much the sky behind a word must dim (light side) or lift (dark side) to read.
  const shadeNeed = (side, rgb) => {
    for (let a = 0; a <= 1; a += 0.02) {
      const bg = side === 'light' ? rgb.map(v => v * (1 - a)) : rgb.map(v => v + (255 - v) * a), L = lum(bg);
      if (contrast(L, lum(inkOn(side, lum(rgb)))) >= SHADE_TARGET) return a;
    }
    return 1;
  };
  // A block entering takes whichever side needs less help across the column it will travel through, judged by most of
  // that sky so a small bright spot (the moon) can't tip it. Only a near tie goes to where the day is heading: light
  // after noon, dark before. A side that needs real shading never beats one that needs none.
  const entering = c => {
    const need = side => {
      const all = [];
      for (let y = 0; y < SH; y++) for (let x = c.x0; x <= c.x1; x++) { const i = (y * SW + x) * 3; all.push(shadeNeed(side, [rawRGB[i], rawRGB[i + 1], rawRGB[i + 2]])); }
      all.sort((a, b) => a - b);
      return all[Math.floor((all.length - 1) * 0.9)];
    };
    const h = clockNow(), nl = need('light'), nd = need('dark'), lean = 0.04;
    return h >= 12 ? (nl <= nd + lean ? 'light' : 'dark') : (nd <= nl + lean ? 'dark' : 'light');
  };

  function decide(group, r) {
    const fixed = FIXED.includes(group.id), c = cells(r);
    let side = sideOf.get(group);
    if (!side || (!fixed && !onScreen.has(group))) side = fixed ? better(c) : entering(c);
    else if (fixed) {
      // Fixed pieces never leave the screen, so they change side in place, once at dawn and once at dusk.
      const other = side === 'light' ? 'dark' : 'light';
      if (worst(other, c) > worst(side, c) * 1.15) side = other;
    }
    sideOf.set(group, side);
    return side;
  }

  const gap = (a, b) => Math.min(Math.abs(a - b), 24 - Math.abs(a - b));
  // While the page is booting the sky sweeps from midnight to now in a second or two; nothing read then is worth
  // keeping. Readings aren't smoothed and sides aren't held until the sweep is over.
  const booting = () => document.body.classList.contains('booting');
  let lastClock = null, skyGen = 0;
  function place() {
    if (!ready) return;
    // When time jumps rather than scrolls (landing, the loop at midnight), the scene is new: every block chooses again,
    // against a sky reading taken after the jump.
    const now = clockNow();
    if (booting() || (lastClock !== null && gap(now, lastClock) > 0.5)) onScreen = new Set();
    lastClock = now;
    if (builtClock !== null && gap(now, builtClock) > 0.25) return;
    const seen = new Set(), groups = new Map();
    for (const el of document.querySelectorAll(TEXT)) {
      // Marks every line this script inks, on screen or not.
      if (!el.hasAttribute('data-sky-ink')) el.setAttribute('data-sky-ink', '');
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth || !r.width) continue;
      const g = groupOf(el);
      if (!groups.has(g)) groups.set(g, decide(g, FIXED.includes(g.id) ? g.getBoundingClientRect() : r));
      seen.add(g);
      const side = groups.get(g), s = el.offsetWidth ? r.width / el.offsetWidth : 1;
      el.classList.add('sky-ink');
      el.classList.toggle('on-light', side === 'light'); el.classList.toggle('on-dark', side === 'dark');
      el.style.backgroundImage = `var(--ink-${side})`;
      el.style.backgroundSize = `${innerWidth / s}px ${innerHeight / s}px`;
      el.style.backgroundPosition = `${-r.left / s}px ${-r.top / s}px`;
    }
    const rail = document.getElementById('rail');
    if (rail) { const side = decide(rail, rail.getBoundingClientRect()); seen.add(rail); root.style.setProperty('--rail-ink', `var(--ink-${side})`); }
    const chrome = document.getElementById('chrome'), logo = document.getElementById('logo'), lr = logo?.getBoundingClientRect();
    if (chrome && lr?.width) {
      const side = sideOf.get(chrome) || decide(chrome, chrome.getBoundingClientRect()); seen.add(chrome);
      const x = clamp(Math.floor((lr.left + lr.width / 2) / innerWidth * SW), 0, SW - 1), y = clamp(Math.floor((lr.top + lr.height / 2) / innerHeight * SH), 0, SH - 1);
      root.style.setProperty('--logo-ink', `rgb(${inkOn(side, skyLum[y * SW + x]).map(Math.round).join(' ')})`);
    }
    onScreen = seen;
    drawShade();
  }

  // Text that is faded out (captions that only show on hover, poems not yet written in) gets no shade.
  const shown = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (+st.opacity < 0.3 || st.visibility === 'hidden' || st.display === 'none') return false; } return true; };
  // The shade is drawn again only when something it depends on has moved: which lines show, where, on which side,
  // and the sky reading under them. A page sitting still costs nothing here.
  let drawn = '';
  function drawShade() {
    const k = 0.5, w = Math.round(innerWidth * k), h = Math.round(innerHeight * k);
    const range = document.createRange(), rects = [];
    let key = `${w} ${h} ${builtClock} ${skyGen}`;
    for (const el of document.querySelectorAll('.sky-ink')) {
      const box = el.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight || !box.width || !shown(el)) continue;
      const side = el.classList.contains('on-light') ? 'light' : 'dark';
      // Shade the words themselves, not the whole row they sit in.
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (r.bottom < 0 || r.top > innerHeight || r.width < 1) continue;
        rects.push([side, r]); key += `|${side[0]}${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0}`;
      }
    }
    if (key === drawn) return;
    drawn = key;
    if (shade.width !== w || shade.height !== h) { shade.width = w; shade.height = h; }
    shadeCtx.clearRect(0, 0, w, h);
    shadeCtx.filter = `blur(${Math.round(14 * k)}px)`;
    for (const [side, r] of rects) {
      {
        const c = cells(r), needs = [];
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = (y * SW + x) * 3; needs.push(shadeNeed(side, [skyRGB[i], skyRGB[i + 1], skyRGB[i + 2]])); }
        needs.sort((p, q) => p - q);
        // The feather thins the shade at the middle of a line; give it back.
        const a = Math.min(1, needs[Math.floor((needs.length - 1) * 0.9)] * 1.1);
        if (a < 0.01) continue;
        shadeCtx.fillStyle = side === 'light' ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
        const px = 30, py = 14;
        shadeCtx.fillRect((r.left - px) * k, (r.top - py) * k, (r.width + px * 2) * k, (r.height + py * 2) * k);
      }
    }
    shadeCtx.filter = 'none';
  }

  function build() {
    const sky = pending; pending = null; busy = true;
    const at = clockNow();
    smallCtx.drawImage(sky, 0, 0, SW, SH);
    let src = smallCtx.getImageData(0, 0, SW, SH).data;
    const raw = new Uint8Array(SW * SH * 3);
    for (let i = 0, j = 0; i < src.length; i += 4, j += 3) { raw[j] = src[i]; raw[j + 1] = src[i + 1]; raw[j + 2] = src[i + 2]; }
    // The ink and shade read a sky smoothed over a few frames, so flashes and twinkles don't flicker them.
    // When time jumps (landing, the loop at midnight) the old sky is no guide: start again from this one.
    const jumped = booting() || (builtClock !== null && gap(at, builtClock) > 0.5);
    if (steady && !jumped) {
      // Once the smoothed sky has settled on what's drawn (nothing scrolling, no twinkle), the maps would come out
      // the same; rebuilding and repainting every line for that is wasted on every frame the page sits still.
      let delta = 0;
      for (let i = 0; i < src.length; i++) delta = Math.max(delta, Math.abs(src[i] - steady[i]));
      if (delta < 0.5) { busy = false; return; }
    }
    if (!steady || jumped) steady = Float32Array.from(src);
    else for (let i = 0; i < src.length; i++) steady[i] += (src[i] - steady[i]) * 0.06;
    src = steady;
    const lc = lightMap.getContext('2d'), dc = darkMap.getContext('2d');
    const lo = lc.createImageData(SW, SH), dk = dc.createImageData(SW, SH), lums = new Float32Array(SW * SH), rgbs = new Uint8Array(SW * SH * 3);
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
      const L = lums[j] = lum([src[i], src[i + 1], src[i + 2]]);
      rgbs[j * 3] = src[i]; rgbs[j * 3 + 1] = src[i + 1]; rgbs[j * 3 + 2] = src[i + 2];
      const a = lightInk(L), b = darkInk(L);
      lo.data.set([a[0], a[1], a[2], 255], i); dk.data.set([b[0], b[1], b[2], 255], i);
    }
    lc.putImageData(lo, 0, 0); dc.putImageData(dk, 0, 0);
    const lu = lightMap.toDataURL(), du = darkMap.toDataURL();
    const decode = u => { const img = new Image(); img.src = u; return img.decode().catch(() => {}); };
    Promise.all([decode(lu), decode(du)]).then(() => {
      skyLum = lums; skyRGB = rgbs; rawRGB = raw; builtClock = at; skyGen++;
      if (!calm || jumped) calm = Float32Array.from(lums); else for (let j = 0; j < lums.length; j++) calm[j] += (lums[j] - calm[j]) * 0.15;
      root.style.setProperty('--ink-light', `url(${lu})`);
      root.style.setProperty('--ink-dark', `url(${du})`);
      ready = true; place(); busy = false;
      if (pending) build();
    });
  }
  // The reading: the day page draws its sky model small onto this canvas (skySample), without the falling weather;
  // a page without that draws the sky canvas down instead.
  const clean = mk(), cleanCtx = clean.getContext('2d');
  window.skyInk = (sky, h, t) => {
    place();
    if (!sky?.width) return;
    if (window.skySample) window.skySample(clean, SW, SH, h, t); else cleanCtx.drawImage(sky, 0, 0, SW, SH);
    pending = clean;
    if (!busy) build();
  };
})();
