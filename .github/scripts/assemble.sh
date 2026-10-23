#!/usr/bin/env bash
# Build _site the way Cloudflare serves it, then make sure nothing is missing or left in that shouldn't be.
# Copies tracked files only, with git and tar, so it runs the same on Linux, macOS and Windows runners.
set -euo pipefail
rm -rf _site && mkdir _site
git ls-files -z \
  | grep -zvE '^(\.github/|worker/|\.zap/)|^(\.gitignore|\.gitleaks\.toml|README\.md|wrangler\.jsonc|CNAME)$' \
  | tar --null -T - -cf - | tar -xf - -C _site
for f in index.html 404.html LICENSE robots.txt sitemap.xml llms.txt humans.txt _headers \
         .well-known/security.txt privacy/index.html work/index.html work/ascii3d.js \
         work/pretext/layout.js content.js sig-strokes.js fonts/fonts.css fonts/work-fonts.css; do
  test -s "_site/$f" || { echo "::error::missing $f"; exit 1; }
done
for f in README.md worker wrangler.jsonc .zap .gitleaks.toml .github; do
  test ! -e "_site/$f" || { echo "::error::$f would be published"; exit 1; }
done
