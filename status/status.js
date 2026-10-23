// Shared chrome for the status pages: the same sky as the day page at the visitor's current hour, the signature, the clock.
(() => {
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const ZEN = [[0,'#05060d'],[4,'#070a18'],[5.5,'#1c2240'],[6.5,'#6f7fa6'],[7.5,'#a9bbd6'],[10,'#bfd0e4'],[12,'#c4d6ea'],[15,'#bdcbdc'],[17.5,'#8f8ea8'],[18.6,'#4b3f63'],[19.6,'#1a1a33'],[21,'#0a0c1b'],[24,'#05060d']];
  const HOR = [[0,'#0a0c18'],[4,'#0d1022'],[5.5,'#5a3f4a'],[6.3,'#d9955f'],[7.5,'#e6cfae'],[10,'#e4e9ec'],[12,'#eceff0'],[15,'#e8ddcb'],[17.5,'#dfa672'],[18.6,'#a85a45'],[19.6,'#4c3550'],[21,'#141628'],[24,'#0a0c18']];
  const INK_L = [26, 24, 19], INK_D = [233, 228, 216];
  const at = (K, h) => { h = ((h % 24) + 24) % 24; for (let i = 1; i < K.length; i++) if (h <= K[i][0]) { const [h0, c0] = K[i - 1], [h1, c1] = K[i]; return mix(hex(c0), hex(c1), (h - h0) / (h1 - h0)); } return hex(K[0][1]); };
  const rgb = c => `rgb(${c.map(Math.round)})`;
  const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fmt = h => { const hh = Math.floor(((h % 24) + 24) % 24), mm = Math.floor((((h % 1) + 1) % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
  const q = new URLSearchParams(location.search);
  const fixed = q.has('h') ? parseFloat(q.get('h')) : null;       // ?h=21.5 previews another hour
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stars = Array.from({ length: 190 }, () => [Math.random(), Math.random() * 0.8, Math.random(), Math.random() * 6.28]);

  const sky = document.getElementById('sky'), ctx = sky.getContext('2d');
  let W = 0, H = 0;
  const size = () => { const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; sky.width = W * d; sky.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  function draw(h, t) {
    const z = at(ZEN, h), o = at(HOR, h);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(z)); g.addColorStop(0.72, rgb(mix(z, o, 0.55))); g.addColorStop(1, rgb(o));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sunA = Math.sin((h - 6) / 12 * Math.PI), sunX = ((h - 6) / 12) * W * 1.1 - W * 0.05, sunY = H * 0.6 - sunA * H * 0.5;
    const night = clamp(lum(z) < 0.12 ? 1 : (0.25 - lum(z)) / 0.13, 0, 1);
    if (night > 0) { ctx.fillStyle = '#eef0ff'; for (const [sx, sy, b, ph] of stars) { ctx.globalAlpha = night * b * (0.55 + 0.45 * Math.sin(t / 900 + ph)) * 0.9; const r = 0.5 + b * 1.1; ctx.fillRect(sx * W, sy * H, r, r); } ctx.globalAlpha = 1; }
    if (sunA > -0.1) {
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.5);
      halo.addColorStop(0, 'rgba(255,240,200,.55)'); halo.addColorStop(0.25, 'rgba(255,220,170,.18)'); halo.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sunX, sunY, H * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,230,.95)'; ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, 7); ctx.fill();
    }
    if (night > 0) {
      const mh = (h + 12) % 24, mA = Math.sin((mh - 6) / 12 * Math.PI), mx = ((mh - 6) / 12) * W * 1.1 - W * 0.05, my = H * 0.6 - mA * H * 0.5;
      if (mA > 0) { ctx.globalAlpha = night * 0.95; const halo = ctx.createRadialGradient(mx, my, 0, mx, my, 60); halo.addColorStop(0, 'rgba(220,225,245,.18)'); halo.addColorStop(1, 'rgba(220,225,245,0)'); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 60, 0, 7); ctx.fill(); ctx.fillStyle = '#e9ecf7'; ctx.beginPath(); ctx.arc(mx, my, 13, 0, 7); ctx.fill(); ctx.fillStyle = rgb(z); ctx.beginPath(); ctx.arc(mx - 7, my - 3, 11.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    }
    const k = smooth(0.37, 0.47, lum(mix(z, o, 0.5))), ink = mix(INK_D, INK_L, k).map(Math.round);
    const st = document.documentElement.style;
    st.setProperty('--ink', `rgb(${ink})`); st.setProperty('--ink-rgb', ink.join(', ')); st.setProperty('--sky', rgb(o)); st.setProperty('--sa', (0.22 + 0.38 * (1 - k)).toFixed(2));
    window.updateCanvasTextContrast?.(sky, ink);
  }
  const logo = document.getElementById('logo');
  if (logo && window.SIG) { logo.setAttribute('viewBox', `0 0 ${SIG.w} ${SIG.h}`); logo.innerHTML = SIG.paths.map(p => `<path d="${p.d}" stroke-width="${p.w}"/>`).join(''); }
  const clock = document.getElementById('clock');
  const clockText = document.body.dataset.clock;   // a page can pin or break the clock
  function frame(t) {
    const h = fixed ?? nowHour();
    draw(h, t);
    if (clock) clock.innerHTML = clockText ? clockText : `${fmt(h)}<i>now</i>`;
    if (!reduced) requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { size(); draw(fixed ?? nowHour(), 0); });
  size(); frame(0);
  if (reduced) draw(fixed ?? nowHour(), 0);
})();
