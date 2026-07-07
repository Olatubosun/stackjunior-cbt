const express = require('express');
const path    = require('path');
const fs      = require('fs');
const morgan  = require('morgan');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Base path the SPA is served under behind a reverse proxy (e.g. "/cbt").
// Empty string means it is served at the root (local development).
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');
// Bind host — 127.0.0.1 behind a reverse proxy, 0.0.0.0 for local dev.
const HOST = process.env.HOST || '0.0.0.0';

// Where the browser should send API calls. In production the API is same-origin
// under the base path (e.g. /cbt/api); in local dev it is the standalone
// backend on its own port.
const API_BASE = process.env.API_BASE
  || (BASE_PATH ? `${BASE_PATH}/api` : 'http://localhost:5000/api');

// StackJunior web app URL — where SSO users are sent on logout if no explicit
// return URL was provided. Empty in standalone/local use.
const STACKJUNIOR_WEB_URL = process.env.STACKJUNIOR_WEB_URL || '';

// Cache-busting token for the SPA's own assets. Changes each process start
// (i.e. each deploy/restart) so long-lived CDN/browser caches don't serve
// stale js/css after an update.
const ASSET_VER = process.env.ASSET_VER || String(Date.now());

const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(morgan('dev'));
app.use(express.json());

// ── Runtime config ─────────────────────────────────────────────
// Exposed to the browser as window.CBT_CONFIG; loaded before api.js.
const configScript =
  `window.CBT_CONFIG = ${JSON.stringify({
    basePath: BASE_PATH,
    apiBase: API_BASE,
    stackjuniorUrl: STACKJUNIOR_WEB_URL,
  })};`;
app.get(`${BASE_PATH}/config.js`, (req, res) => {
  res.type('application/javascript').send(configScript);
});

// ── Static assets (under the base path) ────────────────────────
// index:false so directory requests fall through to the SPA handler below,
// which injects the <base> tag.
app.use(BASE_PATH || '/', express.static(PUBLIC_DIR, { index: false }));

// ── SPA fallback ───────────────────────────────────────────────
// Serve index.html with a <base href> injected so relative asset URLs resolve
// under the base path regardless of the current route depth.
let indexHtml = null;
const renderIndex = () => {
  if (indexHtml == null) {
    const raw = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    indexHtml = raw
      .replace('<!--BASE-->', `<base href="${BASE_PATH}/" />`)
      // Append a version query to local css/js refs so a deploy invalidates
      // any long-lived cache (the index itself is served no-cache below).
      .replace(/((?:src|href)=")([^":]+\.(?:js|css))(")/g, `$1$2?v=${ASSET_VER}$3`);
  }
  return indexHtml;
};
const sendIndex = (req, res) =>
  res.set('Cache-Control', 'no-cache').type('html').send(renderIndex());

app.get(`${BASE_PATH}/*`, sendIndex);
// Also answer the bare base path with no trailing slash (e.g. /cbt?token=...).
if (BASE_PATH) app.get(BASE_PATH, sendIndex);

app.listen(PORT, HOST, () => {
  console.log(`Frontend running on ${HOST}:${PORT}${BASE_PATH}`);
});
