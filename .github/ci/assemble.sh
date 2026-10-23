#!/usr/bin/env bash
# Build _site the way Cloudflare serves it, then make sure nothing is missing or left in that shouldn't be.
set -euo pipefail
rm -rf _site && mkdir _site
rsync -a --exclude=.git --exclude=.github --exclude=.gitignore --exclude=README.md \
         --exclude=worker --exclude=wrangler.jsonc --exclude=CNAME --exclude=_site ./ _site/
for f in index.html 404.html LICENSE robots.txt sitemap.xml llms.txt humans.txt _headers \
         .well-known/security.txt privacy/index.html work/index.html work/ascii3d.js \
         work/pretext/layout.js content.js sig-strokes.js fonts/fonts.css fonts/work-fonts.css; do
  test -s "_site/$f" || { echo "::error::missing $f"; exit 1; }
done
test ! -e _site/README.md && test ! -e _site/worker && test ! -e _site/wrangler.jsonc
