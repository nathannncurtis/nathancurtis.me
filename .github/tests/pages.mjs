// Every page the site serves, and what a visit to it should answer.
export const PAGES = [
  { path: '/', status: 200 },
  { path: '/work', status: 200 },
  { path: '/privacy', status: 200 },
  { path: '/no-such-page', status: 404 },
  ...['200', '301', '403', '410', '500', '503'].map(s => ({ path: `/status/${s}.html`, status: 200 })),
];

// A name that isn't localhost, so the day page calls this Worker's /sky instead of borrowing the live one.
// CI maps it to 127.0.0.1 in the hosts file; BASE overrides it anywhere else.
export const BASE = process.env.BASE ?? 'http://site.test:8787';

// Outside calls whose failure in CI says nothing about the site.
export const OUTSIDE = /cloudflareinsights\.com|api\.github\.com|api\.open-meteo\.com/;
