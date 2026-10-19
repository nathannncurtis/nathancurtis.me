# nathancurtis.me

One page, one day. Twenty-four hours of light where scrolling is time; you arrive at the hour it is where you are. Photographs, poems and music sit in the order of the day.

Plain HTML, CSS and a canvas. No build step, no framework. Served by GitHub Pages.

## Layout

- `index.html` the day: sky, stages, lightbox, music player
- `content.js` every photograph, poem and track the page shows
- `sig-strokes.js` the signature, as strokes
- `photos/web`, `photos/thumb` the photographs, 1600px JPEG and 600px WebP
- `music/` the tracks and covers
- `work/` the work page
- `privacy/` what the site collects
- `404.html` nothing at this hour
- `status/` other status pages, kept for a host that can serve them
- `fonts/` EB Garamond and IBM Plex, self-hosted, with their OFL licenses
- `robots.txt`, `llms.txt`, `humans.txt`, `sitemap.xml`, `.well-known/security.txt`

## Local

Serve the folder with any static server, for example `python3 -m http.server`, and open it. Add `?h=21.5` to a status page to preview any hour, or `?sky` to the day page to make the rare things in the sky frequent.

## License

The code is MIT. The photographs, poems, music, writing and marks are all rights reserved. Pretext and the fonts keep their own licenses. `LICENSE` lists which files are which.
