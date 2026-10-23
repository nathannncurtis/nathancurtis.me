# Cross-origin policy rollout

The global `/*` rule in `_headers` applies COOP `same-origin`, COEP `require-corp`,
and CORP `same-origin` to documents and static resources. The Worker applies the
same response policy to `/sky`, music range responses, errors, and asset fallback
responses. `worker/worker-header.test.mjs` checks that these policies stay aligned.

## Resource and behavior inventory

- Site scripts, stylesheets, fonts, photographs, music, and icons are same-origin.
  The site's data-URI decorative SVG backgrounds do not make network requests.
- `/music/*` is served through the Worker. Range responses preserve the global
  policy and continue to return `206`/`416` as appropriate.
- `/sky` is served through the Worker. The page's fetch remains same-origin.
- There is no intentional framing or cross-origin embedding. The www hostname
  redirects to the apex before serving a document; the production redirect must
  be rechecked after deployment.
- External project links open in new tabs with `rel="noopener"`. Browser coverage
  checks that the new tab has no `window.opener`.
- The manually embedded Cloudflare beacon has been removed. Managed Cloudflare
  Analytics configuration remains unverified; its SRI, CORS, delivery, CSP, and
  COEP behavior are a separate required gate in
  [analytics-migration.md](analytics-migration.md).

## Local and CI evidence

`.github/tests/isolation.spec.mjs` checks `crossOriginIsolated`, loaded fonts,
photograph decode, a music byte-range response, `/sky`, and outbound popup
behavior in Chromium, Firefox, and WebKit. Focused Chromium passed locally. CI's
desktop browser projects provide the cross-engine run; the test's production
headers/www assertion runs only when `PRODUCTION_BASE` is set, and remains blocked
until the enforcing headers are live. The managed Analytics test likewise remains
blocked until `MANAGED_ANALYTICS_SRC` points to the verified injected script.

Do not merge or deploy this policy while either production gate is unverified.
After deployment, run with `PRODUCTION_BASE=https://nathancurtis.me` and verify
the documented analytics configuration with `MANAGED_ANALYTICS_SRC` set. Record
the response results and deployment SHA here. No production deployment has been
made as part of this change.
