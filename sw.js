/* Band Arcade: THE SERVICE WORKER (the installable app's offline copy). Registered by shared/app.js on every page
   of the deployed site; never in the repository's 'dev' version (a double-clicked file or python3 -m http.server
   runs without it, exactly as before).

   ONE CACHE PER SITE VERSION ('band-arcade-<version>'): the deploy (tools/stamp-version.py) writes the version and
   FILES below = every file of the site with a short fingerprint of its contents, and whether it's stored at install
   ('p': pages, the engine, styles, fonts, icons: about 3.5 MB) or the first time it's used (the rest: sounds,
   portraits, art). A new version's install COPIES every file whose fingerprint didn't change from the old cache,
   so an update downloads only what changed. Once the new version takes over, the old caches are deleted.

   HOW REQUESTS ARE ANSWERED (only this site's own files: another site, e.g. the leaderboard, is never touched):
     - pages (navigations) and shared/version.js: NETWORK FIRST (checked with the server every time, so students
       get a new version as soon as they're online); the stored copy only when the network fails; a page never
       visited and not stored = offline.html.
     - every other file: CACHE FIRST inside this version. A file asked for with ?v=<another version> is a page of
       another version: it goes to the network and is never stored, so one page never mixes two versions.
     - requests that ask to skip caches (the Sound Board's checks, music retries) and partial (Range) requests go
       straight to the network.
   Mat never edits this file: in the repository VERSION stays 'dev' and FILES empty; the deploy fills them in. */
'use strict';
const VERSION = 'dev';
const FILES = {};
const PREFIX = 'band-arcade-';
const CACHE = PREFIX + VERSION;
const SCOPE = new URL('./', self.registration.scope).href;
const HASHES = '__files.json';                       // this cache's FILES, so the next version can reuse unchanged files

const key = rel => SCOPE + rel;
const relOf = url => url.href.startsWith(SCOPE) ? decodeURI(url.pathname.slice(new URL(SCOPE).pathname.length)) : null;
const fresh = rel => fetch(key(rel), {cache: 'no-cache', credentials: 'same-origin'});

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (VERSION === 'dev') return;
    const cache = await caches.open(CACHE);
    // the newest older cache, to copy unchanged files from
    const olds = (await caches.keys()).filter(n => n.startsWith(PREFIX) && n !== CACHE);
    let old = null, oldFiles = {};
    for (const name of olds) {
      const c = await caches.open(name), r = await c.match(key(HASHES));
      if (!r) continue;
      const f = await r.json().catch(() => null);
      if (f && Object.keys(f).length >= Object.keys(oldFiles).length) { old = c; oldFiles = f; }
    }
    const jobs = Object.keys(FILES).map(rel => async () => {
      const [hash, when] = FILES[rel];
      if (old && oldFiles[rel] && oldFiles[rel][0] === hash) {
        const r = await old.match(key(rel));
        if (r) return cache.put(key(rel), r);
      }
      if (when !== 'p') return;
      const r = await fresh(rel);
      if (!r.ok) throw new Error(rel + ': ' + r.status);
      await cache.put(key(rel), r);
    });
    // a few at a time (weak school Wi-Fi); a failed file fails the install, so a half-stored version never takes over
    let i = 0;
    await Promise.all(Array.from({length: 6}, async () => { while (i < jobs.length) await jobs[i++](); }));
    await cache.put(key(HASHES), new Response(JSON.stringify(FILES), {headers: {'Content-Type': 'application/json'}}));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'skip-waiting') self.skipWaiting();
  if (d.type === 'version' && event.ports[0]) event.ports[0].postMessage({version: VERSION});
});

/** a redirected response can't answer a page request in Safari: the same page, without the redirect flag */
const plain = r => r.redirected ? r.blob().then(b => new Response(b, {status: r.status, statusText: r.statusText, headers: r.headers})) : r;

async function networkFirst(rel, request, page) {
  const cache = await caches.open(CACHE);
  try {
    const r = await fetch(request.url, {cache: 'no-cache', credentials: 'same-origin'});
    if (r.ok && FILES[rel]) cache.put(key(rel), r.clone());
    return plain(r);
  } catch (e) {
    const hit = await cache.match(key(rel)) || (page && rel.endsWith('/') ? await cache.match(key(rel + 'index.html')) : null);
    if (hit) return hit;
    if (page) return (await cache.match(key('offline.html'))) || new Response('You’re offline.', {status: 503, headers: {'Content-Type': 'text/plain'}});
    throw e;
  }
}

async function cacheFirst(rel, request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key(rel));
  if (hit) return hit;
  try {
    const r = await fetch(request);
    if (r.ok && r.type === 'basic' && FILES[rel]) cache.put(key(rel), r.clone());
    return r;
  } catch (e) {
    // offline and never stored: a file the site doesn't have answers "not found", exactly as online (sfx.js then
    // tries its .mp3); one it has fails like any network error
    if (!FILES[rel]) return new Response('', {status: 404, statusText: 'Not Found'});
    throw e;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (VERSION === 'dev' || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;           // never another site (the leaderboard)
  const rel = relOf(url);
  if (rel === null || rel === 'sw.js') return;
  if (request.mode === 'navigate') {
    const page = rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel;
    return event.respondWith(networkFirst(page, request, true));
  }
  if (request.cache === 'reload' || request.cache === 'no-cache' || request.cache === 'no-store' || request.headers.has('range')) return;
  if (rel === 'shared/version.js') return event.respondWith(networkFirst(rel, request, false));
  const v = url.searchParams.get('v');
  if (v && v !== VERSION && !rel.startsWith('shared/sounds/')) return;   // another version's file: network only
  event.respondWith(cacheFirst(rel, request));
});
