# Analytics integrity exception

On October 22, 2026 the owner explicitly chose: “Keep analytics carve out an exception.”

The existing Cloudflare beacon and site token remain on every page. Only this exact
external script is exempt from SRI: `https://static.cloudflareinsights.com/beacon.min.js`.
The URL is mutable and Cloudflare does not support durable manual SRI pinning.
This is an accepted remaining risk, not a completed integrity migration.

`crossorigin="anonymous"` uses the beacon's CORS response under COEP. Live response
inspection returned Access-Control-Allow-Origin: * and CORP: cross-origin. Browser
checks require the real script to load while crossOriginIsolated remains true.
The source guard rejects additional external scripts; CSP remains restrictive,
without unsafe-inline or unsafe-eval. The tampered-SRI negative fixture remains.

Managed injection with SRI remains a future improvement requiring Cloudflare Web
Analytics permissions. Production analytics delivery must be checked after release
without recording payloads or visitor data.
