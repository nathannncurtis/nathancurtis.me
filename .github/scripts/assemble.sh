#!/usr/bin/env bash
# Build _site the way Cloudflare serves it, then make sure nothing is missing or left in that shouldn't be.
set -euo pipefail
rm -rf _site && mkdir _site
rsync -a --exclude=.git --exclude=.github --exclude=.gitignore --exclude=README.md \
         --exclude=worker --exclude=wrangler.jsonc --exclude=CNAME --exclude=_site \
         --exclude=.zap --exclude=.gitleaks.toml --exclude=node_modules --exclude=.wrangler ./ _site/
for f in index.html 404.html LICENSE robots.txt sitemap.xml llms.txt humans.txt _headers \
         .well-known/security.txt privacy/index.html work/index.html work/ascii3d.js \
         work/pretext/layout.js content.js sig-strokes.js fonts/fonts.css fonts/work-fonts.css; do
  test -s "_site/$f" || { echo "::error::missing $f"; exit 1; }
done
for f in README.md worker wrangler.jsonc .zap .gitleaks.toml .github; do
  test ! -e "_site/$f" || { echo "::error::$f would be published"; exit 1; }
done
