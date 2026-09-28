/* Shared helpers for Band Arcade's tests: what every page is watched for, how storage is seeded, the leaderboard mock. */
const fs = require('fs');
const path = require('path');
const {expect} = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
/** the scoreboard address from shared/leaderboard-config.js ('' = off) */
const LB_URL = ((fs.readFileSync(path.join(ROOT, 'shared/leaderboard-config.js'), 'utf8').match(/LEADERBOARD_URL\s*=\s*'([^']*)'/) || [])[1]) || '';
/* the scoreboard is a Google Apps Script: it answers from script.google.com, then redirects to googleusercontent */
const LB_HOSTS = /^(script\.google\.com|script\.googleusercontent\.com)$/;

/* Files the site LOOKS FOR on purpose and falls back gracefully when they are missing (Mat uploads them later):
   recordings, portrait pictures and their variants, marquee and menu-background pictures, Arcade Quest's PNG art.
   A 404 there is normal. Any other missing local file fails the test. */
const OPTIONAL = [
  /\/shared\/sounds\//, /\/shared\/portraits\//, /\/shared\/marquees\//, /\/shared\/backgrounds\//, /\/arcade-quest\/art\//,
  /\/favicon\.ico$/,
];
const optional = url => OPTIONAL.some(r => r.test(new URL(url).pathname));

/** a saved device: an instrument chosen (trumpet by default), nothing else */
function device(member = 'trumpet', extra = {}) {
  return Object.assign({player: member, members: {}, games: {}, modes: {}}, extra);
}

/**
 * Get a page ready: storage seeded (once, before the first page script), the microphone refused (the games' ?demo
 * stands in for it, the same in Chromium and WebKit), outside hosts blocked and recorded, the leaderboard mocked.
 * Returns `watch`: {errors, missing, outside, posts, check()}.
 */
async function prepare(page, {store = device(), visit = true, mic = false} = {}) {
  const watch = {errors: [], missing: [], outside: [], posts: []};
  await page.addInitScript(([store, visit, mic]) => {
    try {
      if (store && !localStorage.getItem('bandarcade.v1')) localStorage.setItem('bandarcade.v1', JSON.stringify(store));
      if (visit) sessionStorage.setItem('bandarcade.visit', '1');
    } catch (e) { /* about:blank */ }
    if (!mic && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('No microphone in the tests', 'NotFoundError'));
    }
  }, [store, visit, mic]);
  page.on('pageerror', e => {
    // WebKit reports a download cancelled by a page change (the backup panel's reload) as an error "…/file due to access
    // control checks"; for an optional file (a sound the site preloads) that is not a site error
    const m = /(\/\S+) due to access control checks/.exec(e.message || '');
    if (m && optional('http://127.0.0.1' + m[1].replace(/^\/127\.0\.0\.1:\d+/, ''))) return;
    watch.errors.push(`uncaught: ${e.message}`);
  });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text(), url = (m.location() || {}).url || '';
    if (/Failed to load resource/i.test(t)) { if (url && !optional(url) && /^https?:\/\/127\.0\.0\.1/.test(url)) watch.errors.push(`console: ${t} ${url}`); return; }
    watch.errors.push(`console: ${t}`);
  });
  page.on('response', r => {
    const u = r.url();
    if (/^https?:\/\/127\.0\.0\.1/.test(u) && r.status() >= 400 && !optional(u)) watch.missing.push(`${r.status()} ${new URL(u).pathname}`);
  });
  await page.route(url => !/^(https?:\/\/127\.0\.0\.1[:/]|data:|blob:|about:)/.test(url.href), async route => {
    const req = route.request(), u = new URL(req.url());
    if (LB_HOSTS.test(u.hostname)) {
      if (req.method() === 'POST') { watch.posts.push(req.postData() || ''); return route.fulfill({status: 200, contentType: 'application/json', body: '{"ok":true,"id":"TEST01"}'}); }
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(boardFor(u.searchParams))});
    }
    watch.outside.push(req.url());
    return route.abort();
  });
  watch.check = (what = '') => {
    expect(watch.errors, `JavaScript errors ${what}`).toEqual([]);
    expect(watch.missing, `missing local files ${what}`).toEqual([]);
    expect(watch.outside, `requests to outside hosts ${what}`).toEqual([]);
  };
  return watch;
}

/** the leaderboard mock's answers (the API in CLAUDE.md "THE LEADERBOARD") */
function boardFor(params) {
  if (params.get('action') === 'status') return {ok: true, enabled: true};
  const e = (id, n, v) => ({id, name: n, value: v});
  return {ok: true, enabled: true, grade: +params.get('grade') || 6, week: '2026-09-28', updated: Date.now(),
    boards: {stars: [e('AAAAAA', [1, 1, 1], 42), e('BBBBBB', [2, 3, 4], 30), e('TESTMK', [3, 5, 7], 12)],
      improved: [e('BBBBBB', [2, 3, 4], 9)], streak: [e('AAAAAA', [1, 1, 1], 5)],
      endless: {'note-storm': [e('CCCCCC', [4, 4, 4], 1234)]}}};
}

/** visible buttons (and links styled as buttons) that stick out of the viewport sideways, and a page that scrolls sideways */
async function offscreen(page) {
  return page.evaluate(() => {
    const W = innerWidth, out = [];
    const visible = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const inHidden = el => !!el.closest('[hidden], [aria-hidden="true"]');
    for (const el of document.querySelectorAll('button, a.btn, [role="button"]')) {
      if (inHidden(el) || !visible(el)) continue;
      // inside something that scrolls sideways on purpose (a strip of thumbnails): that's fine
      let p = el.parentElement, scroller = false;
      while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) { scroller = true; break; } if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'clip') { const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect(); if (r.right <= pr.left || r.left >= pr.right) { scroller = true; break; } } p = p.parentElement; }
      if (scroller) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > W + 1) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" x ${Math.round(r.left)}–${Math.round(r.right)} of ${W}`);
    }
    const sw = document.documentElement.scrollWidth;
    if (sw > W + 1) out.push(`the page scrolls sideways: ${sw} px wide in a ${W} px window`);
    return out;
  });
}

/** the saved progress of this browser (localStorage) */
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1') || '{}'));
/** the best stars saved for level `lv` of a progress key, any instrument */
function starsIn(store, key, lv = 1) {
  const g = (store.games || {})[key] || {};
  return Math.max(0, ...Object.values(g).map(inst => ((inst || {})[lv] || {}).stars || 0));
}

const VIEWPORTS = {
  'iPad landscape': {width: 1180, height: 820},
  'iPad portrait': {width: 820, height: 1180},
  'Chromebook': {width: 1366, height: 768},
};

module.exports = {ROOT, LB_URL, LB_HOSTS, OPTIONAL, optional, device, prepare, boardFor, offscreen, saved, starsIn, VIEWPORTS};
