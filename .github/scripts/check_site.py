#!/usr/bin/env python3
# The launch checklist, run against _site: page heads, the files beside them, links, and the CSP.
import datetime, re, struct, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

SITE = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
DOMAIN = "https://nathancurtis.me"
PAGES = {"index.html": "/", "work/index.html": "/work", "privacy/index.html": "/privacy"}
errors = []

def err(msg):
    errors.append(msg)
    print(f"::error::{msg}")

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta, self.links, self.refs, self.lang, self.title, self._in_title = {}, {}, [], None, "", False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.lang = a.get("lang")
        if tag == "title": self._in_title = True
        if tag == "meta":
            key = a.get("property") or a.get("name")
            if key: self.meta.setdefault(key, a.get("content", ""))
        if tag == "link" and a.get("rel"): self.links.setdefault(a["rel"], a.get("href"))
        for attr in ("href", "src", "poster"):
            if a.get(attr): self.refs.append(a[attr])
        if a.get("srcset"): self.refs += [s.split()[0] for s in a["srcset"].split(",") if s.strip()]
    def handle_endtag(self, tag):
        if tag == "title": self._in_title = False
    def handle_data(self, data):
        if self._in_title: self.title += data

def parse(path):
    h = Head(); h.feed(path.read_text()); return h

def resolves(ref, page):
    """Does a local href/src point at something _site (or the Worker) will serve?"""
    if "${" in ref or re.match(r"^(https?:|mailto:|tel:|data:|javascript:|#)", ref): return True
    path = urlparse(ref).path
    if not path: return True
    target = (Path("/") / path) if path.startswith("/") else (Path("/") / page.parent / path)
    rel = str(target).lstrip("/")
    if rel in ("sky",): return True  # answered by the Worker
    p = SITE / rel
    return p.is_file() or (p / "index.html").is_file() or p.with_suffix(".html").is_file() or (rel == "" and (SITE / "index.html").is_file())

# Page heads
for rel, url in PAGES.items():
    h = parse(SITE / rel)
    want = ["description", "og:type", "og:site_name", "og:title", "og:description", "og:url",
            "og:image", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "theme-color", "viewport"]
    for k in want:
        if not h.meta.get(k): err(f"{rel}: missing meta {k}")
    if not h.title.strip(): err(f"{rel}: empty <title>")
    if not h.lang: err(f"{rel}: <html> has no lang")
    if h.links.get("canonical") != DOMAIN + url: err(f"{rel}: canonical is {h.links.get('canonical')}, want {DOMAIN + url}")
    if h.meta.get("og:url") != DOMAIN + url: err(f"{rel}: og:url is {h.meta.get('og:url')}, want {DOMAIN + url}")
    if h.meta.get("twitter:card") != "summary_large_image": err(f"{rel}: twitter:card should be summary_large_image")
    img = h.meta.get("og:image", "")
    if img.startswith(DOMAIN) and not (SITE / img[len(DOMAIN):].lstrip("/")).is_file(): err(f"{rel}: og:image {img} isn't in the site")

# The fallback is excluded from indexing; valid pages must remain indexable.
if "noindex" not in {x.strip().lower() for x in parse(SITE / "404.html").meta.get("robots", "").split(",")}:
    err("404.html: missing robots noindex")
for rel in PAGES:
    if "noindex" in {x.strip().lower() for x in parse(SITE / rel).meta.get("robots", "").split(",")}:
        err(f"{rel}: valid page must remain indexable")

# Every HTML file: icons, no mutable manual beacon, and links that go somewhere
for page in sorted(SITE.rglob("*.html")):
    rel = page.relative_to(SITE)
    h = parse(page)
    if h.links.get("icon") is None or h.links.get("apple-touch-icon") is None: err(f"{rel}: needs a favicon and an apple-touch-icon")
    if "static.cloudflareinsights.com/beacon" in page.read_text(): err(f"{rel}: mutable manual beacon; use gated managed SRI injection")
    for ref in h.refs:
        if not resolves(ref, rel): err(f"{rel}: broken link {ref}")

# CSS url()s
for css in SITE.rglob("*.css"):
    for ref in re.findall(r"url\(['\"]?([^'\")]+)", css.read_text()):
        if not resolves(ref, css.relative_to(SITE)): err(f"{css.relative_to(SITE)}: broken url({ref})")

# Images at the sizes the platforms expect
def png_size(p):
    b = p.read_bytes()[:24]
    if b[:8] != b"\x89PNG\r\n\x1a\n": return None
    return struct.unpack(">II", b[16:24])
for name, size in (("og.png", (1200, 630)), ("apple-touch-icon.png", (180, 180))):
    got = png_size(SITE / name)
    if got != size: err(f"{name} is {got}, want {size}")

# sitemap.xml: the sitemaps.org namespace, and every page in it exists. Read as text: it is our own small file,
# and xmllint in the workflow checks that it is well formed.
sitemap = (SITE / "sitemap.xml").read_text()
ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
if not re.search(rf'<urlset[^>]*\sxmlns="{re.escape(ns)}"', sitemap): err(f"sitemap.xml: <urlset> needs xmlns=\"{ns}\"")
locs = [l.strip() for l in re.findall(r"<loc>([^<]+)</loc>", sitemap)]
for loc in locs:
    if not loc.startswith(DOMAIN) or not resolves(urlparse(loc).path or "/", Path("index.html")): err(f"sitemap.xml: {loc} isn't a page here")
for url in PAGES.values():
    if DOMAIN + url not in locs: err(f"sitemap.xml: missing {DOMAIN + url}")

# robots.txt: points at the sitemap, still turns away AI training crawlers
robots = (SITE / "robots.txt").read_text()
if f"Sitemap: {DOMAIN}/sitemap.xml" not in robots: err("robots.txt: no Sitemap line")
for bot in ("GPTBot", "ClaudeBot", "CCBot", "Google-Extended"):
    if f"User-agent: {bot}" not in robots: err(f"robots.txt: {bot} no longer disallowed")

# security.txt: required fields, and not expired or about to be
sec = (SITE / ".well-known/security.txt").read_text()
for field in ("Contact: mailto:nathan@nathancurtis.me", "Preferred-Languages:", f"Canonical: {DOMAIN}/.well-known/security.txt"):
    if field not in sec: err(f"security.txt: missing {field}")
m = re.search(r"^Expires:\s*(\S+)", sec, re.M)
if not m: err("security.txt: no Expires")
else:
    left = datetime.datetime.fromisoformat(m.group(1).replace("Z", "+00:00")) - datetime.datetime.now(datetime.timezone.utc)
    if left.days < 30: err(f"security.txt: expires in {left.days} days; move Expires a year out")

# Every outside origin the code calls must be allowed by the CSP in _headers
csp_line = next((l for l in (SITE / "_headers").read_text().splitlines() if "Content-Security-Policy:" in l), "")
csp = {d.split()[0]: d.split()[1:] for d in csp_line.split(":", 1)[-1].split(";") if d.strip()}
def allowed(directive, origin):
    return origin in csp.get(directive, csp.get("default-src", []))
for f in list(SITE.rglob("*.html")) + list(SITE.rglob("*.js")):
    text = f.read_text()
    for origin in set(re.findall(r"<script[^>]+src=[\"'](https://[^/\"']+)", text)):
        if not allowed("script-src", origin): err(f"{f.relative_to(SITE)}: script from {origin} not in CSP script-src")
    for origin in set(re.findall(r"fetch\(\s*[\"'`](https://[^/\"'`]+)", text)):
        if not allowed("connect-src", origin): err(f"{f.relative_to(SITE)}: fetch to {origin} not in CSP connect-src")

if errors:
    sys.exit(f"{len(errors)} problem(s)")
print("site ok")
