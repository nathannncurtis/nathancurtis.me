const RAMP = ' .:-=+*#%@';
const N = 6, PW = 1.05, PH = 1.45;
let seed = 23;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const word = (row, u) => { const h = Math.sin(row * 91.7 + Math.floor(u * 14 + row * 3.1) * 12.9898) * 43758.5; return h - Math.floor(h); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function sheets() {
  const S = [], U = [], V = [], B = [], T = [];
  for (let k = 0; k < N; k++) {
    const dense = k >= N - 2, steps = dense ? 110 : 44, vsteps = dense ? 152 : 60;
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= vsteps; j++) {
      const u = i / steps, v = j / vsteps;
      const rim = Math.abs(u - .5) > .485 || Math.abs(v - .5) > .49;
      let t = 0;
      if (dense && !rim) {
        const row = Math.floor((1 - v) * 40), band = ((1 - v) * 40) % 1;
        if (v < 0.9 && v > 0.1 && u > 0.1 && u < 0.9 && band > 0.35 && band < 0.75 && (row % 6 !== 5 || u < 0.55)) t = word(row, u) > 0.16 ? 1 : 3;
        if (v > 0.9 && v < 0.93 && u > 0.1 && u < 0.45) t = 2;
      }
      S.push(k); U.push(u); V.push(v); B.push(rim ? 0.55 : 0.12); T.push(t);
    }
  }
  return { S: Uint8Array.from(S), U: Float32Array.from(U), V: Float32Array.from(V), B: Float32Array.from(B), T: Uint8Array.from(T) };
}

function slot(s) {
  const off = s - (N - 1) / 2;
  return { rot: off * 0.11, dx: off * 0.06, dy: off * -0.035, dz: off * 0.075, curl: 0.07 * Math.cos(s * Math.PI) };
}

export function mount(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const P = sheets(), n = P.S.length;
  let cw = 7.2, ch = 13, cols = 0, rows = 0, zb = null, ib = null, dpr = 1, W = 0, Hh = 0;
  const font = '12px "IBM Plex Mono", ui-monospace, monospace';
  let mode = opts.mode || 'open', next = mode, t0 = -1, queued = null;
  const DUR = 950;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; Hh = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = font; cw = ctx.measureText('M').width; ch = 13;
    cols = Math.ceil(W / cw); rows = Math.ceil(Hh / ch); zb = new Float32Array(cols * rows); ib = new Float32Array(cols * rows);
  }
  function turn(to) { if (t0 >= 0) { queued = to; return; } next = to; t0 = performance.now(); }
  const busy = () => t0 >= 0;
  const textInk = (t, m) => t === 0 ? 0 : m === 'sealed' ? (t === 2 ? 0.8 : 1) : t === 1 ? 0.7 : t === 2 ? 0.8 : 0;
  function draw(yaw, now = performance.now()) {
    let a = 0;
    if (t0 >= 0) {
      a = Math.min(1, (now - t0) / DUR);
      if (a >= 1) { mode = next; t0 = -1; a = 0; if (queued !== null) { const q = queued; queued = null; turn(q); } }
    }
    const e = ease(a);
    zb.fill(-1e9); ib.fill(0);
    const pitch = -0.18, cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const unit = Math.min(W, Hh) * 0.5 * 0.92 * (opts.size || 1), cx0 = W * (opts.cx ?? 0.5), cy0 = Hh * (opts.cy ?? 0.5), D = 3.2;
    const L = [-0.45, 0.65, 0.62], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    const sway = Math.sin(yaw * 1.3) * 0.12, cw2 = Math.cos(sway), sw2 = Math.sin(sway);
    const sl = [];
    for (let k = 0; k < N; k++) {
      const top = k === N - 1, q = slot(top ? N - 1 : k + e);
      if (top) { q.dx += e * 1.9; q.dy += e * 0.32; q.rot -= e * 0.38; q.dz += e * 0.12; }
      q.cr = Math.cos(q.rot); q.sr = Math.sin(q.rot);
      q.fade = top ? Math.pow(1 - e, 1.5) : k === 0 ? Math.max(0.35, e) : 1;
      q.mode = top ? mode : k === N - 2 ? (t0 >= 0 ? next : mode) : null;
      q.wav = k;
      sl.push(q);
    }
    if (t0 < 0) sl[0].fade = 1;
    for (let i = 0; i < n; i++) {
      const q = sl[P.S[i]], u = P.U[i], v = P.V[i];
      const lx = (u - .5) * PW, ly = (v - .5) * PH, lz = q.curl * Math.sin(u * Math.PI) + 0.04 * Math.sin(v * 2.4 + q.wav);
      const dzu = q.curl * Math.PI * Math.cos(u * Math.PI) / PW;
      let x = lx * q.cr - ly * q.sr + q.dx, y = lx * q.sr + ly * q.cr + q.dy, z = lz + q.dz;
      let nx = -dzu * q.cr, ny = -dzu * q.sr, nz = 1;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const ty = y * cw2 - z * sw2; z = y * sw2 + z * cw2; y = ty; const tn = ny * cw2 - nz * sw2; nz = ny * sw2 + nz * cw2; ny = tn;
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, nx1 = nx * cy + nz * sy, nz1 = -nx * sy + nz * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, ny2 = ny * cp - nz1 * sp, nz2 = ny * sp + nz1 * cp;
      const s = D / (D - z2), px = cx0 + x1 * s * unit, py = cy0 - y2 * s * unit;
      const c = (px / cw) | 0, r = (py / ch) | 0;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const idx = r * cols + c;
      if (z2 <= zb[idx]) continue;
      zb[idx] = z2;
      const t = P.T[i], m = q.mode;
      let k = P.B[i];
      if (m && t) k = Math.max(k, textInk(t === 3 ? (m === 'sealed' ? 1 : 0) : t, m));
      const dif = Math.abs(nx1 * L[0] + ny2 * L[1] + nz2 * L[2]);
      ib[idx] = Math.min(1, k * (0.55 + 0.45 * dif) * q.fade);
    }
    ctx.clearRect(0, 0, W, Hh);
    ctx.font = font; ctx.textBaseline = 'top'; ctx.fillStyle = opts.color(); ctx.globalAlpha = opts.alpha ?? 0.4;
    for (let r = 0; r < rows; r++) {
      let line = '', any = false;
      for (let c = 0; c < cols; c++) { const v = ib[r * cols + c]; const k = v > 0.02 ? Math.max(1, Math.min(9, (v * 9.99) | 0)) : 0; line += RAMP[k]; if (k) any = true; }
      if (any) ctx.fillText(line, 0, r * ch);
    }
    ctx.globalAlpha = 1;
  }
  size();
  return { size, draw, turn, busy, get mode() { return mode; } };
}
