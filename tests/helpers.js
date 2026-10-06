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
  /\/favicon\.ico$/, /\/docs\/gallery\//,     // the UI gallery's pictures come from GALLERY=1 test runs
];
const optional = url => OPTIONAL.some(r => r.test(new URL(url).pathname));

/** a saved device: an instrument chosen (trumpet by default), nothing else. A seasonal event's free gift never opens
    its panel by itself here (the lobby queue's 'event-gift': the real calendar would put it in every lobby test;
    tests/lobby-queue.spec.js turns it on): gameData 'season-lobby' giftAfter, unless the test gives its own. */
function device(member = 'trumpet', extra = {}) {
  const gameData = Object.assign({'season-lobby': {giftAfter: '9999-12-31'}}, extra.gameData || {});
  return Object.assign({player: member, members: {}, games: {}, modes: {}}, extra, {gameData});
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
    // "ResizeObserver loop completed with undelivered notifications": the browser's own notice that a resize callback
    // changed the layout again in the same frame (the rest is delivered next frame). Not an error by the spec, and
    // nothing is lost; WebKit reports it as one on a busy CI runner (Dojo Duel's phone layout). Every other error counts.
    if (/^ResizeObserver loop (completed with undelivered notifications|limit exceeded)/.test(e.message || '')) return;
    watch.errors.push(`uncaught: ${e.message}`);
  });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text(), url = (m.location() || {}).url || '';
    if (/Failed to load resource/i.test(t)) { if (url && !optional(url) && /^https?:\/\/127\.0\.0\.1/.test(url)) watch.errors.push(`console: ${t} ${url}`); return; }
    // Linux WebKit's WebGL on a CI machine with no GPU (software OpenGL) logs this for three.js's textures (the 3D floor);
    // the floor still draws. Real Safari (Apple's own graphics) never says it. See docs/engine/testing.md.
    if (/^WebGL: INVALID_OPERATION: glTexStorage2D: Texture is immutable/.test(t)) return;
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

/* CPU_DRAWING (`test.use(CPU_DRAWING)` at the top of Music Highway's and Sustain Speedway's spec files and
   game-runs.spec.js): Playwright's
   Linux WebKit (WPE) draws with Skia on the GPU, which on a CI machine (no GPU: software OpenGL) crashes the page now and
   then in these canvas games: an internal WebKit check (the runner's kernel log: "trap invalid opcode in libWPEWebKit",
   a SkiaGPUWorker segfault), seen as "Target crashed". WEBKIT_SKIA_ENABLE_CPU_RENDERING draws on the CPU instead: 2 crashes
   in ~200 runs of those specs instead of 14 (the rest: WebKit's compositor thread; CI's one retry covers them). Not for
   every spec: on the CPU, WebKit's WebGL (the 3D floor) logs "glTexStorage2D: Texture is immutable". Blocktave's pages
   crash now and then either way, and on the CPU its long chapter 1 runs got slower and crashed MORE (October 2026),
   so blocktave.spec.js keeps the default; its tests are short instead (a crash costs one short retry). */
const CPU_DRAWING = {launchOptions: [async ({browserName}, use) => use(browserName === 'webkit'
  ? {env: Object.assign({}, process.env, {WEBKIT_SKIA_ENABLE_CPU_RENDERING: '1'})}
  : process.env.PW_CHROMIUM_PATH ? {executablePath: process.env.PW_CHROMIUM_PATH} : {}), {scope: 'worker'}]};

/**
 * WHAT THE PAGE SAW, for a failure message on a busy runner (WebKit can starve a page's frames for seconds, and its page
 * process can crash): the longest gap between animation frames, every gap over 1 s, timer gaps over 1 s (the main thread
 * itself stalled), and any hidden / visible / pagehide. Call before page.goto; `await seen(() => state)` gives one line
 * (with the game's own state from `state`, run in the page), and never hangs on a stuck or crashed page.
 */
async function pageWatch(page) {
  await page.addInitScript(() => {
    const L = window.__pw = {gap: 0, gaps: [], timer: [], vis: []}; let last = 0, tl = 0;
    const f = t => { if (last) { const g = Math.round(t - last); L.gap = Math.max(L.gap, g); if (g > 1000 && L.gaps.length < 20) L.gaps.push(`${g} ms at ${Math.round(t)}`); } last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    setInterval(() => { const t = performance.now(); if (tl && t - tl > 1100 && L.timer.length < 20) L.timer.push(`${Math.round(t - tl)} ms at ${Math.round(t)}`); tl = t; }, 100);
    document.addEventListener('visibilitychange', () => L.vis.push((document.hidden ? 'hidden ' : 'visible ') + Math.round(performance.now())));
    addEventListener('pagehide', () => L.vis.push('pagehide ' + Math.round(performance.now())));
  });
  return (state = null) => Promise.race([
    page.evaluate(fn => { let s = null; try { s = fn ? (0, eval)('(' + fn + ')')() : null; } catch (e) { s = 'state failed: ' + e.message; }
      return JSON.stringify({now: Math.round(performance.now()), hidden: document.hidden, frames: window.__pw, state: s}); }, state && state.toString())
      .catch(e => 'page gone: ' + e.message.split('\n')[0]),
    new Promise(r => setTimeout(() => r('no answer in 3 s (the page is stuck)'), 3000))]);
}
/** run `fn`; if it throws, add what the page saw (pageWatch's `seen`) to the error */
async function explain(seen, state, fn) {
  try { return await fn(); } catch (e) { e.message += `\n  the page: ${await seen(state)}`; throw e; }
}

/** the leaderboard mock's answers (the API in docs/engine/leaderboard.md "THE LEADERBOARD") */
function boardFor(params) {
  if (params.get('action') === 'status') return {ok: true, enabled: true};
  // WEEKLY CHAMPIONS: last week's, with nobody from the tests' devices (tests/champions.spec.js puts its own in front)
  if (params.get('action') === 'champions') return {ok: true, enabled: true, grade: +params.get('grade') || 6,
    champions: {week: lastWeekKey(), stars: [{id: 'AAAAAA', name: [1, 1, 1], value: 40}], improved: [], streak: [], endless: {}}};
  const e = (id, n, v) => ({id, name: n, value: v});
  return {ok: true, enabled: true, grade: +params.get('grade') || 6, week: '2026-09-28', updated: Date.now(),
    boards: {stars: [e('AAAAAA', [1, 1, 1], 42), e('BBBBBB', [2, 3, 4], 30), e('TESTMK', [3, 5, 7], 12)],
      improved: [e('BBBBBB', [2, 3, 4], 9)], streak: [e('AAAAAA', [1, 1, 1], 5)],
      endless: {'note-storm': [e('CCCCCC', [4, 4, 4], 1234)]}}};
}

/** last week's Monday on this machine, 'YYYY-MM-DD' (shared/leaderboard.js lastWeekKey: the week the champions are for) */
function lastWeekKey(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

/* WIDE_OK: the only things allowed to be wider than the screen besides the general rules in tooWide() below. Each
   entry: {sel (a CSS selector), url (a RegExp on the page's path + query + hash; optional), why}. Every entry is
   reviewed in the pull request that adds it; prefer fixing the layout. */
const WIDE_OK = [
];

/**
 * TOO WIDE: everything VISIBLE on the page (or inside `within`, a CSS selector) that is wider than the screen.
 * Returns a list of problems (like offscreen()), each naming the element (tag#id.classes "first 30 characters"),
 * its left–right edges and the viewport width:
 *   1. any visible element whose box sticks out past the left or right edge of the viewport by more than 1 px
 *      (panels, dialogs, text, headings, images, SVGs, canvases, tables, cards, rows); only the outermost one is
 *      named (its children stick out with it);
 *   2. text cut off sideways: an element whose own text is clipped by its overflow (hidden/clip, no ellipsis) or
 *      runs past its own box (one unbreakable line wider than the box).
 * THE GENERAL EXCEPTIONS (each also applies to everything inside):
 *   a. inside a container that scrolls sideways ON PURPOSE (overflow-x auto/scroll and scrollable: thumbnail strips,
 *      the staff rows, wide tables). A WINDOW never scrolls sideways on purpose: the page, an .overlay, a dialog or a
 *      panel that does is the bug itself, so those don't count as such a container.
 *   b. decorative layers: inside [aria-hidden="true"] (the menu backgrounds, marquee glows, particles, scenery) or
 *      [hidden], and the inside of an SVG (the <svg> itself is checked).
 *   c. clipped ON PURPOSE by an overflow: hidden/clip parent whose own box is on screen (carousels, the 3D floor's
 *      canvas, a scene cropped to its frame): what shows is on screen. Again not when the clipping parent is the
 *      page or a window: a panel that cuts its own content off is the bug.
 *   d. WIDE_OK (above): anything else, one entry with a reason each.
 * `ok` = extra WIDE_OK-style entries for one test.
 */
async function tooWide(page, {within = null, ok = []} = {}) {
  const allow = [...WIDE_OK, ...ok].map(e => ({sel: e.sel, url: e.url ? e.url.source : null}));
  return page.evaluate(([within, allow]) => {
    const W = document.documentElement.clientWidth, out = [], flagged = new Set();
    const here = location.pathname + location.search + location.hash;
    const okSel = allow.filter(e => !e.url || new RegExp(e.url).test(here)).map(e => e.sel).join(', ');
    const WINDOW = 'html, body, .overlay, [role="dialog"], [role="alertdialog"], .panel, .ui-panel';
    const name = el => {
      const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
      const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls.trim() ? '.' + cls.trim().split(/\s+/).join('.') : ''}${text ? ` "${text}"` : ''}`;
    };
    const visible = el => {
      if (el.checkVisibility && !el.checkVisibility({opacityProperty: true, visibilityProperty: true})) return false;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') return false;
      const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1;
    };
    const onScreen = r => r.left >= -1 && r.right <= W + 1;
    /** one of the general exceptions (a, b, c, d) for `el` */
    const excused = el => {
      if (el.closest('[aria-hidden="true"], [hidden]') || el.ownerSVGElement) return true;
      if (okSel && el.closest(okSel)) return true;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.matches(WINDOW)) continue;
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true;
        if (/(hidden|clip)/.test(s.overflowX) && onScreen(p.getBoundingClientRect())) return true;
      }
      return false;
    };
    const root = within ? document.querySelector(within) : document.body;
    if (!root) return [`${within} is not on the page`];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (/^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|BR|WBR|OPTION)$/.test(el.tagName)) continue;
      let p = el.parentElement, under = false;
      for (; p; p = p.parentElement) if (flagged.has(p)) { under = true; break; }
      if (under || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      // 1. sticks out of the screen
      if (!onScreen(r) && !excused(el)) {
        flagged.add(el);
        out.push(`${name(el)} x ${Math.round(r.left)}–${Math.round(r.right)} of ${W}`);
        continue;
      }
      // 2. its own text cut off sideways
      const texts = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      if (!texts.length) continue;
      const s = getComputedStyle(el);
      if (s.display === 'inline' || s.display === 'contents') continue;   // an inline box is its text: nothing to spill out of
      let cut = '';
      if (/(hidden|clip)/.test(s.overflowX)) {
        if (s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1) cut = `text cut off: ${el.scrollWidth} px of text in a ${el.clientWidth} px box`;
      } else {
        const rg = document.createRange(); let lo = Infinity, hi = -Infinity;
        for (const t of texts) { rg.selectNodeContents(t); for (const q of rg.getClientRects()) if (q.width) { lo = Math.min(lo, q.left); hi = Math.max(hi, q.right); } }
        if (hi > r.right + 1 || lo < r.left - 1) cut = `text runs out of its box (text ${Math.round(lo)}–${Math.round(hi)}, box ${Math.round(r.left)}–${Math.round(r.right)})`;
      }
      if (cut && !excused(el)) { flagged.add(el); out.push(`${name(el)} ${cut}, x ${Math.round(r.left)}–${Math.round(r.right)} of ${W}`); }
    }
    // (a window is fixed over the page: whether the page behind it scrolls sideways is the page's own check)
    const sw = document.documentElement.scrollWidth;
    if (!within && sw > W + 1) out.push(`the page scrolls sideways: ${sw} px wide in a ${W} px window`);
    return out.slice(0, 20);
  }, [within, allow]);
}

/* PHONE SIZES for the phone-width check (tests/phone-width.spec.js, and the results screens in game-runs.spec.js) */
const PHONES = [['390 × 844', 390, 844], ['360 × 740', 360, 740], ['375 × 667', 375, 667]];

/**
 * WINDOW FITS: the open window `sel` passes tooWide(), and its MAIN BUTTON (`main`, or the window's first visible
 * .btn-primary, else its GO button, else its first .btn, else its first button) can be reached: scrolled into view it
 * is fully on the screen and nothing covers its middle. Returns the problems (none = []).
 */
const MAIN = ['.btn-primary', '[data-act="go"]', '.btn', 'button'];
async function windowFits(page, sel, {main = null, ok = []} = {}) {
  // the window's own running animations jump to their end first: it's measured as it rests, never mid-way (a results
  // screen's stars pop in small and tilted, and a star caught then reads as "text runs out of its box"); an endless
  // one (a glow, a spinner) can't finish and is left as it is; nothing outside the window (a toast) is touched
  await page.evaluate(s => { const w = document.querySelector(s); if (w) w.getAnimations({subtree: true}).forEach(a => { try { a.finish(); } catch (e) { /* endless */ } }); }, sel);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // the layout has settled
  const bad = await tooWide(page, {within: sel, ok});
  let btn = null;
  for (const m of main ? [main] : MAIN.map(m => `${sel} ${m}`)) {
    const b = page.locator(m).filter({visible: true}).first();
    if (await b.count()) { btn = b; break; }
  }
  if (!btn) return bad;
  // (the browser's own scroll: Playwright's scrollIntoViewIfNeeded waits for the button to stop moving, and a results
  // screen's buttons glow and pop in)
  const at = await btn.evaluate(el => {
    el.scrollIntoView({block: 'nearest', inline: 'nearest'});
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1));
    return {r: [r.left, r.right, r.top, r.bottom].map(Math.round), on: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
      tap: !!hit && (hit === el || el.contains(hit) || hit.contains(el)), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)};
  });
  if (!at.on) bad.push(`its main button "${at.text}" can't be scrolled fully onto the screen (x ${at.r[0]}–${at.r[1]}, y ${at.r[2]}–${at.r[3]})`);
  else if (!at.tap) bad.push(`its main button "${at.text}" is covered by something else`);
  return bad;
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

/** THE LEADERBOARD TESTS' SPEED RULES: the page's clock is the test's (page.clock: time flows, and settle() jumps it
    forward instead of waiting out UNDO's 5 s, the start-up flush, the lobby's idle check…), and the leaderboard gives
    up on a request after 4 s instead of 25 (Leaderboard.TIMEOUTS), so a hang fails fast. Call before page.goto. */
async function quickLeaderboard(page) {
  await page.clock.install();
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const L = window.Arcade && window.Arcade.Leaderboard;
    if (L && L.TIMEOUTS) Object.assign(L.TIMEOUTS, {read: 4000, send: 4000});
  }));
}
/** the floor's lobby queue has shown (and this closes) its UNLOCKED! card, if it has one to show: items a seasonal
    event gave since the last visit are celebrated in the lobby first (shared/lobby-queue.js, lobby.js Lobby.unlocked) */
async function closeUnlocked(page) {
  await expect.poll(() => page.evaluate(() => { const s = Arcade.Lobby.queue.state(); return s.current === 'unlocked' || !s.waiting.includes('unlocked'); })).toBe(true);
  const ok = page.locator('.sk-catchup [data-close]');
  if (await ok.count()) { await ok.click(); await expect(page.locator('.sk-catchup')).toHaveCount(0); }
}
/** jump the page's clock forward (its timers fire), then a moment of real time for the mocked network to answer */
async function settle(page, ms) { await page.clock.fastForward(ms); await page.waitForTimeout(250); }

/** A BUSY PAGE (call before page.goto), like a slow iPad or a loaded test machine. Hits and readings are stamped with
    performance.now(), so a game that judged them by a frame's timestamp would be early / late.
    lagFrames(page, ms): every animation frame's timestamp is `ms` older than the moment the frame runs.
    busyFrames(page): each animation frame first works for `window.__busyMs` ms (0 to start; a test sets it), so its
    callbacks run that long after the frame's timestamp (which never goes backwards, as in a real browser). */
async function lagFrames(page, ms) {
  await page.addInitScript(ms => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => cb(t - ms));
  }, ms);
}
async function busyFrames(page) {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    let seen = -1;
    window.__busyMs = 0;
    window.requestAnimationFrame = cb => raf(t => {
      if (t !== seen) { seen = t; const end = performance.now() + window.__busyMs; while (performance.now() < end) { /* busy */ } }
      cb(t);
    });
  });
}

module.exports = {ROOT, LB_URL, LB_HOSTS, OPTIONAL, optional, device, prepare, pageWatch, explain, CPU_DRAWING, boardFor, lastWeekKey, offscreen, tooWide, WIDE_OK, windowFits, PHONES, saved, starsIn, VIEWPORTS, quickLeaderboard, settle, closeUnlocked, lagFrames, busyFrames};
