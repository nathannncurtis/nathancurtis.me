# Enforced CSP

All document scripts and styles live in same-origin files under `assets/`.
Static style attributes are classes; generated SVG stroke widths are presentation
attributes. Trusted generated animation declarations become class rules through
`assets/csp.js` in the external `assets/runtime.css` stylesheet's CSSOM. Runtime
position and sky variables use CSSStyleDeclaration property setters. The local
weather desk's stylesheet is external too. There are no fixed nonces or eval grants.

The trusted presentation helper accepts only our escaped, generated templates;
it is not a sanitizer for remote HTML. Dynamic stylesheet rules retain all CSP
resource constraints. It caches identical declarations to avoid adding duplicates
when the work page reflows.

`security-browser.mjs` exercises every document with the enforcing source policy
and fails on script errors or unexpected policy violations. Negative response
fixtures prove unapproved inline script blocks, style blocks, style attributes,
and changed SRI bytes are blocked in Chromium, Firefox and WebKit. Wrangler rewrites
production origin strings in local headers, so document responses in this test use
the exact source policy; separate header tests still inspect served headers.

Cloudflare's production responses still contain the old policy until deployment.
After the analytics migration gate is satisfied, check `/`, `/work`, `/privacy`,
unknown paths, `/sky`, and byte-range music responses on the real edge. Analytics
injection and delivery remain an explicit external deployment gate (see
`analytics-migration.md`). Do not report production acceptance before that happens.
