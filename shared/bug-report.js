/* Band Arcade: ANONYMOUS BUG REPORTS. When something breaks on a student's device, a small anonymous note goes to
   Mr. Graham's scoreboard (Arcade.LEADERBOARD_URL, Leaderboard.gs v5, its "Errors" tab: grouped by day, game, error,
   place, browser and version, with a count). Loaded on EVERY page by shared/version.js (checkVersion's tags), right
   after leaderboard-config.js and teacher-settings.js and before every other script, so it hears every error.

   WHAT A REPORT CONTAINS, AND NOTHING ELSE (a POST, Content-Type text/plain, JSON; a CORS "simple request"):
     {type: 'error', game, message, where, browser, version, count}
       game     the page's game id from its address ('blocktave'; the floor page = 'arcade')
       message  the error's message only (no stack), web addresses replaced by "[address]", at most 200 characters
       where    the file NAME and line ("game.js:812"): never the full address, never a query string
       browser  family + major version from the user-agent ("Safari 17", "Chrome 128"), nothing else from it
       version  Arcade.VERSION (the deployed commit)
       count    how many times it happened since the last send
   NEVER: the player id, grade, avatar name, instrument, stars, anything typed, page addresses, localStorage, the stack.
   It carries nothing about the student, so it does NOT depend on the leaderboard switch or a grade.

   ON THE DEVICE: the same message + place is one report with a count; at most MAX_KINDS (5) different ones per page
   load; sent at most once every SEND_GAP (30 s) (the first FIRST_WAIT 2 s after the first error, so a burst becomes one
   report), and whatever waits goes on `pagehide` (navigator.sendBeacon, a text/plain Blob; else fetch keepalive).
   Nothing is stored; a failed send is dropped (never retried).
   OFF: ?demo, the test runner (navigator.webdriver), no scoreboard address, VERSION 'dev' (the repository, local
   files), and Mr. Graham's switch: teacher-settings.js BUG_REPORTS false.
   ONLY THE ARCADE'S OWN FILES (Arcade.ROOT): never another site's script or a browser extension; never its own errors.
   Known noise is ignored: "ResizeObserver loop…", "Script error." with no file.
   IT CAN NEVER BREAK ANYTHING: every part is wrapped; a failure in here is silent.
     Arcade.BugReport.state()   tests: {on, why, waiting: [{message, where, count}], kinds, sent, inMs (the next send)}
     Arcade.BugReport.flush()   tests: send what waits now */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const MAX_KINDS = 5, SEND_GAP = 30000, FIRST_WAIT = 2000, MAX_MSG = 200;
  const ME = /\/shared\/bug-report\.js(\?|$)/;
  const waiting = new Map();                 // key (message|where) -> report
  const kinds = new Set();                   // every different report this page load
  let timer = 0, timerAt = 0, lastSend = -1e12, sent = 0;

  /** why reports are off right now ('' = on) */
  function off() {
    try {
      if (/[?&]demo(=|&|$)/.test(location.search) || A.DEMO) return '?demo';
      if (navigator.webdriver) return 'test runner';
      if (!A.VERSION || A.VERSION === 'dev') return 'dev version';
      if (A.TEACHER && A.TEACHER.BUG_REPORTS === false) return 'turned off (teacher-settings.js)';
      if (!String(A.LEADERBOARD_URL || '').trim()) return 'no scoreboard address';
      return '';
    } catch (e) { return 'error'; }
  }
  const clock = () => (window.performance && performance.now ? performance.now() : Date.now());
  const root = () => A.ROOT || '';
  /** the page's game id: the first folder after the site's root ('' or index.html = the floor: 'arcade') */
  function gameId() {
    const rel = (location.origin + location.pathname).slice(root().length);
    const first = rel.split('/')[0];
    return !first || /\.html?$/.test(first) ? 'arcade' : first.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'arcade';
  }
  /** "Safari 17", "Chrome 128": the family and its major version only */
  function browser() {
    const ua = navigator.userAgent || '';
    const pick = [[/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/SamsungBrowser\/(\d+)/, 'Samsung'],
      [/CriOS\/(\d+)/, 'Chrome'], [/FxiOS\/(\d+)/, 'Firefox'], [/Firefox\/(\d+)/, 'Firefox'], [/Chrome\/(\d+)/, 'Chrome'],
      [/Version\/(\d+)[.\d]* (?:Mobile\/\S+ )?Safari\//, 'Safari']];
    for (const [re, name] of pick) { const m = re.exec(ua); if (m) return name + ' ' + m[1]; }
    return 'Other';
  }
  /** one of the arcade's own files (not this one) → "game.js:812"; anything else → '' */
  function place(file, line) {
    file = String(file || '');
    if (!file || !root() || file.indexOf(root()) !== 0 || ME.test(file.split('#')[0])) return '';
    const name = file.split(/[?#]/)[0].split('/').pop().replace(/[^\w.-]/g, '');
    return name ? name + (line ? ':' + (+line || 0) : '') : '';
  }
  /** the first of the arcade's own files in a stack (only to find `where`: the stack itself is never sent) */
  function placeFromStack(stack) {
    const re = /((?:https?|file):\/\/[^\s)'"]+?):(\d+)(?::\d+)?/g;
    let m;
    while ((m = re.exec(String(stack || '')))) { const p = place(m[1], m[2]); if (p) return p; }
    return '';
  }
  const clean = msg => String(msg == null ? '' : msg).replace(/^Uncaught\s+/, '')
    .replace(/\b(?:https?|file|blob|data|chrome-extension|moz-extension|safari-(?:web-)?extension):[^\s'"<>)]*/gi, '[address]')
    .replace(/\s+/g, ' ').trim().slice(0, MAX_MSG);
  const noise = (msg, where) => !msg || !where || /ResizeObserver loop/i.test(msg) || /^(\w*Error: )?Script error\.?$/i.test(msg);

  function note(msg, where) {
    if (off()) return;
    msg = clean(msg);
    if (noise(msg, where)) return;
    const key = msg + '|' + where;
    const r = waiting.get(key);
    if (r) { r.count++; }
    else {
      if (!kinds.has(key)) { if (kinds.size >= MAX_KINDS) return; kinds.add(key); }
      waiting.set(key, {message: msg, where, count: 1});
    }
    schedule();
  }
  function schedule() {
    if (timer || !waiting.size) return;
    // (a monotonic clock, and never more than SEND_GAP from now: a clock set backwards never holds reports back)
    const now = clock(), at = Math.max(now + FIRST_WAIT, Math.min(lastSend, now) + SEND_GAP);
    timerAt = at;
    timer = setTimeout(() => { timer = 0; try { flush(); } catch (e) { /* silent */ } }, at - now);
  }
  /** the reports waiting, as the scoreboard takes them (only these fields) */
  function bodies() {
    const base = {game: gameId(), browser: browser(), version: String(A.VERSION).slice(0, 40)};
    return [...waiting.values()].map(r => JSON.stringify({type: 'error', game: base.game, message: r.message, where: r.where,
      browser: base.browser, version: base.version, count: r.count}));
  }
  function flush({beacon = false} = {}) {
    if (!waiting.size) return 0;
    const list = off() ? [] : bodies(), url = String(A.LEADERBOARD_URL || '').trim();
    waiting.clear();
    if (timer) { clearTimeout(timer); timer = 0; }
    if (!list.length) return 0;
    lastSend = clock();
    list.forEach(body => {
      try {
        let ok = false;
        if (beacon && navigator.sendBeacon) { try { ok = navigator.sendBeacon(url, new Blob([body], {type: 'text/plain'})); } catch (e) { ok = false; } }
        if (!ok && window.fetch) {
          const p = fetch(url, {method: 'POST', headers: {'Content-Type': 'text/plain'}, body, credentials: 'omit', redirect: 'follow', keepalive: beacon});
          if (p && p.catch) p.catch(() => {});      // a failed send is dropped
        }
        sent++;
      } catch (e) { /* dropped */ }
    });
    return list.length;
  }

  // script errors (a failed picture or sound never reaches window: those don't bubble)
  addEventListener('error', e => {
    try {
      if (!(e instanceof ErrorEvent)) return;
      const er = e.error, msg = er && typeof er === 'object' && er.message ? (er.name ? er.name + ': ' : '') + er.message : e.message || '';   // the same words in every browser
      note(msg, place(e.filename, e.lineno) || (e.error ? placeFromStack(e.error.stack) : ''));
    } catch (err) { /* silent */ }
  });
  addEventListener('unhandledrejection', e => {
    try {
      const r = e && e.reason;
      const msg = r && typeof r === 'object' ? (r.message ? (r.name ? r.name + ': ' : '') + r.message : String(r)) : String(r);
      note(msg, r && r.stack ? placeFromStack(r.stack) : '');
    } catch (err) { /* silent */ }
  });
  addEventListener('pagehide', () => { try { flush({beacon: true}); } catch (e) { /* silent */ } });

  A.BugReport = {
    state: () => ({on: !off(), why: off(), waiting: [...waiting.values()].map(r => Object.assign({}, r)), kinds: kinds.size, sent,
      inMs: timer ? Math.max(0, Math.round(timerAt - clock())) : null}),
    flush: () => { try { return flush(); } catch (e) { return 0; } },
    MAX_KINDS, SEND_GAP,
  };
})(window.Arcade);
