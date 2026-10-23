# Analytics integrity migration (deployment gate)

This branch removes manually embedded Cloudflare Analytics. **Do not merge or deploy
until managed injection is enabled and verified**, unless the owner explicitly
chooses to stop collecting browser analytics.

Cloudflare's [official FAQ](https://developers.cloudflare.com/web-analytics/faq/)
states that its manually embedded beacon does not support version pinning and
cannot safely use SRI. Its [changelog](https://developers.cloudflare.com/web-analytics/changelog/)
says automatic installation enables SRI by default. Do not hash the mutable URL,
copy an undocumented versioned URL, or self-host a distribution whose update and
licensing contract has not been established.

## Deployment gate

1. In Cloudflare Web Analytics, inspect the site's existing configuration. Enable
   managed automatic injection for the proxied site, preserving its existing token.
   This requires dashboard access; it has not been done by this PR.
2. Inspect a preview/production HTML response for exactly one injected beacon,
   containing `integrity` and `crossorigin="anonymous"`. Verify its actual CORS
   response and successful SRI validation in the browser. Do not print beacon
   payloads or visitor information.
3. Verify the managed beacon is allowed by the effective CSP and COEP. Observe a
   successful analytics delivery using synthetic browser traffic; record only
   status and endpoint, never the request payload.
4. Check `/`, `/work`, `/privacy`, `/404.html`, and representative `/status/*`
   responses. Check both the apex host and the www redirect. If any injection lacks
   integrity, keep this PR blocked and report it; do not silently disable analytics.
5. Record the deployment SHA, time, tested responses, and dashboard configuration
   here before removing the draft/deployment gate.

Cloudflare maintains the injected source and integrity together. CI rejects the
old manual mutable snippet. The CSP permits only the specific beacon origin and
analytics delivery endpoint while this migration is pending. Edge request analytics
are separate from the browser Web Analytics beacon and do not replace its metrics.

## Evidence and remaining access

On October 22, 2026, the source contained manually embedded unversioned beacons on
all documents. No authenticated Cloudflare dashboard session was available to
verify the managed-injection configuration. No configuration has been changed and
no deployment has been made. Production acceptance remains open.
