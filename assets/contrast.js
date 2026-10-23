// Choose an ink for each visible text group from the pixels of the sky behind it.
// The colour stays warm; it only moves toward dark or light ink when the sky needs it.
(() => {
  const sw = 64, sh = 40, map = document.createElement('canvas');
  map.width = sw; map.height = sh;
  const mapCtx = map.getContext('2d', { willReadFrequently: true });
  const targets = [
    '#logo', '#clock', '#clock i', '#work', '#priv', '#rail b',
    '.cap', '.k-lights h3', '.k-turn h3', '.k-frieze h3',
    '.po h2', '.po .ln .ink-zone', '.po .ln small',
    '.mu h2', '.mu h2 i', '.mu .track-button', '.mu .track-button span:last-child', '.mu .ctl button',
    '#light figcaption', '#light .k',
    'main .code', 'main h1', 'main p', 'main .go'
  ];
  const defaults = new WeakMap();
  const previous = new WeakMap();
  let elements = null, last = -Infinity;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const linear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const luminance = c => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
  const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const css = c => `rgb(${c.map(v => Math.round(v)).join(' ')})`;
  const visibleText = (el, data) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) return null;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return null;
    }
    const xs = [r.left + Math.min(2, r.width * 0.12), r.left + r.width / 2, r.right - Math.min(2, r.width * 0.12)];
    const ys = [r.top + Math.min(1, r.height * 0.18), r.top + r.height / 2, r.bottom - Math.min(1, r.height * 0.18)];
    const out = [];
    for (const y of ys) for (const x of xs) {
      const ix = clamp(Math.floor(x / innerWidth * sw), 0, sw - 1), iy = clamp(Math.floor(y / innerHeight * sh), 0, sh - 1), i = (iy * sw + ix) * 4;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
    return { rect: r, colors: out };
  };
  const meets = (ink, alpha, backgrounds) => backgrounds.every(bg => ratio(mix(bg, ink, alpha), bg) >= 4.55);
  const choose = (base, startAlpha, backgrounds, prior) => {
    if (meets(base, startAlpha, backgrounds)) return { ink: base, alpha: startAlpha };
    const ends = [[14, 13, 11], [247, 243, 232]];
    let best = null;
    for (const end of ends) {
      for (let ai = 0; ai <= 32; ai++) {
        const alpha = startAlpha + (1 - startAlpha) * ai / 32;
        if (!meets(end, alpha, backgrounds)) continue;
        let lo = 0, hi = 1;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2;
          if (meets(mix(base, end, mid), alpha, backgrounds)) hi = mid; else lo = mid;
        }
        const score = (alpha - startAlpha) * 1.2 + (prior
          ? Math.hypot(...mix(base, end, hi).map((v, i) => v - prior[i])) / 255
          : hi * 0.8);
        if (!best || score < best.score) best = { ink: mix(base, end, hi), alpha, score };
        break;
      }
    }
    return best || { ink: ends[0], alpha: 1 };
  };

  window.updateCanvasTextContrast = (canvas, baseInk) => {
    const now = performance.now();
    if (now - last < 40 || !canvas?.width || !canvas?.height) return;
    last = now;
    if (!elements) elements = [...new Set(targets.flatMap(s => [...document.querySelectorAll(s)]))];
    try {
      mapCtx.clearRect(0, 0, sw, sh);
      mapCtx.drawImage(canvas, 0, 0, sw, sh);
      const data = mapCtx.getImageData(0, 0, sw, sh).data;
      for (const el of elements) {
        const sample = visibleText(el, data);
        if (!sample) continue;
        const ownOpacity = +getComputedStyle(el).opacity;
        const startAlpha = defaults.get(el) ?? ownOpacity;
        if (!defaults.has(el)) defaults.set(el, startAlpha);
        const old = previous.get(el);
        const result = choose(baseInk, startAlpha, sample.colors, old?.ink);
        el.style.color = css(result.ink);
        el.style.setProperty('--contrast-opacity', result.alpha.toFixed(3));
        previous.set(el, result);
      }
    } catch { /* A missing or unreadable canvas leaves the original ink in place. */ }
  };
})();
