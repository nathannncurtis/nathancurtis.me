// nathancurtis.me: the pages are static files served straight from Cloudflare's edge.
// This Worker only runs for /sky; every other path goes to the files without touching it.

// /sky: the weather over the visitor, for the sky on the day page.
//
// Cloudflare already knows roughly where each request comes from. This reads that,
// rounds it to about a 10 km square, asks Open-Meteo what the sky is doing there,
// and answers with the weather only. It stores nothing about the visitor: no address,
// no coordinates, no log of its own. Open-Meteo only ever sees this Worker asking
// about a square of map. The ten-minute cache is keyed on a hash of the square, salted
// with a secret and the date, so even Cloudflare's own request logs never show a place.

const ALLOW = [/^https:\/\/nathancurtis\.me$/, /^https:\/\/www\.nathancurtis\.me$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/];
const TTL = 600; // seconds a square's weather is reused

// WMO weather codes, as Open-Meteo reports them, to what the sky should do.
function read(c) {
  const code = c.weather_code ?? 0;
  const out = { sky: 'clear', amount: 0 };
  if (code === 45 || code === 48) Object.assign(out, { sky: 'fog', amount: code === 48 ? 1 : 0.75 });
  else if (code >= 51 && code <= 57) Object.assign(out, { sky: 'drizzle', amount: [0.35, 0.6, 0.85][Math.min(2, Math.floor((code - 51) / 2))] });
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) Object.assign(out, { sky: 'rain', amount: code === 61 || code === 80 ? 0.4 : code === 63 || code === 81 || code === 66 ? 0.7 : 1 });
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) Object.assign(out, { sky: 'snow', amount: code === 71 || code === 85 || code === 77 ? 0.4 : code === 73 ? 0.7 : 1 });
  else if (code >= 95) Object.assign(out, { sky: 'storm', amount: code === 95 ? 0.75 : 1 });
  out.cloud = Math.round((c.cloud_cover ?? 0)) / 100;
  // haze: poor visibility without fog or falling weather
  const vis = c.visibility ?? 50000;
  out.haze = out.sky === 'clear' && vis < 10000 ? Math.round((1 - vis / 10000) * 100) / 100 : 0;
  out.wind = Math.round((c.wind_speed_10m ?? 0) * 10) / 10; // km/h
  out.day = c.is_day === 1;
  return out;
}

function cors(req) {
  const o = req.headers.get('Origin') || '';
  return ALLOW.some(r => r.test(o)) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
}

async function cacheKey(sq, env) {
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${env.SKY_SALT || ''}|${day}|${sq}`);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  return new Request(`https://sky.cache/${hash}`);
}

async function weather(req, env, ctx) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...h, 'Access-Control-Allow-Methods': 'GET' } });
  const cf = req.cf || {};
  const lat = parseFloat(cf.latitude), lon = parseFloat(cf.longitude);
  if (!isFinite(lat) || !isFinite(lon)) return new Response(JSON.stringify({ sky: 'unknown' }), { headers: h });
  const sq = `${(Math.round(lat * 10) / 10).toFixed(1)},${(Math.round(lon * 10) / 10).toFixed(1)}`; // ~10 km
  const key = await cacheKey(sq, env);
  const cache = caches.default;
  let hit = await cache.match(key);
  if (!hit) {
    const [a, b] = sq.split(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&current=weather_code,cloud_cover,visibility,wind_speed_10m,is_day`;
    const r = await fetch(url, { headers: { 'User-Agent': 'nathancurtis.me sky' } });
    if (!r.ok) return new Response(JSON.stringify({ sky: 'unknown' }), { headers: h });
    const body = JSON.stringify(read((await r.json()).current || {}));
    hit = new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${TTL}` } });
    ctx.waitUntil(cache.put(key, hit.clone()));
  }
  return new Response(await hit.text(), { headers: h });
}

// Static assets answer every request with the whole file. Phones need byte ranges for audio:
// iOS will not play media without them, and no browser can seek a track that lacks them.
async function ranged(req, env) {
  const res = await env.ASSETS.fetch(req.url, { method: req.method });
  const h = new Headers(res.headers); h.set('Accept-Ranges', 'bytes');
  const m = /^bytes=(\d*)-(\d*)$/.exec((req.headers.get('Range') || '').trim());
  if (!m || res.status !== 200 || req.method !== 'GET' || (m[1] === '' && m[2] === '')) return new Response(res.body, { status: res.status, headers: h });
  const buf = await res.arrayBuffer(), n = buf.byteLength;
  const start = m[1] === '' ? Math.max(0, n - +m[2]) : +m[1];
  const end = m[1] === '' || m[2] === '' ? n - 1 : Math.min(+m[2], n - 1);
  if (start >= n || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${n}`, 'Accept-Ranges': 'bytes' } });
  h.set('Content-Range', `bytes ${start}-${end}/${n}`); h.set('Content-Length', String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/sky') return weather(req, env, ctx);
    if (url.pathname.startsWith('/music/')) return ranged(req, env);
    return env.ASSETS.fetch(req);
  },
};
