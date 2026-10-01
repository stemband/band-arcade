/* Band Arcade: THE LEADERBOARD CLIENT (per grade, weekly; Mat's Google Apps Script scoreboard at
   Arcade.LEADERBOARD_URL, shared/leaderboard-config.js). Load after storage.js and leaderboard-config.js, on every
   page that saves progress (storage.js calls it when stars, Endless scores and plays happen).

   PRIVACY: this is the ONLY code in the arcade that sends anything off the device, and ONLY these fields:
     {pid, grade, name: [titleNum, adjNum, nounNum], game, type: 'stars'|'endless'|'play', value, level}
   pid = a random 24-character id made once on this device (no name, no account); name = the avatar's words as their
   permanent NUMBERS (shared/avatar-names.js), never text. Nothing is sent unless ALL of these hold: an address is
   set, the student's "Show me on the leaderboard" switch is ON (the default), a grade is chosen, and it is not ?demo.
   Turning the switch off drops anything still waiting to be sent.

   EVENTS: 'play' once a day per game (the first time EACH game is started that day); 'stars' = how many NEW stars a level's best just
   gained (1–3); 'endless' = the score at an Endless game over, only when it beats this device's best for that game
   this week. Events wait in a queue on the device (at most 50: the oldest go first) and are sent one at a time; a
   failed or offline send stays queued and is tried again (going online, the page showing again, every 60 s). Nothing
   here ever holds up a game.

   THE NETWORK (school iPads and Macs: Safari): a cold Apps Script that reads the Sheet can take 10–20 s, so a board
   read waits up to TIMEOUTS.read (25 s) and is tried once more after a time-out; a send waits up to TIMEOUTS.send
   (20 s). Every request is a CORS "simple request", so no preflight (Apps Script can't answer one): GET with no
   headers, POST with only Content-Type text/plain; credentials 'omit', redirects followed (script.google.com →
   script.googleusercontent.com), and NO `cache` option (WebKit has turned a non-default cache mode into
   Cache-Control/Pragma request headers, which forces a preflight). WARM-UP: warm() sends one quiet ?action=status
   when the arcade opens and when the lobby shows again 10+ minutes later, so the script is awake when a student taps
   the trophy (result ignored, never in ?demo). THE LAST GOOD BOARD of each grade is kept in localStorage
   ('bandarcade.lb-last'; not progress, not in the Backup Code): when a read fails it's shown instead ({stale: true}).
   lastRequest() = how the last request went (for ?teacher): {ok, why ('timeout after 25 s' | 'offline' | 'HTTP 500' |
   'not JSON' | 'network error (CORS or blocked)'), ms, tries, at}.

   Saved in gameData('leaderboard') (so the Arcade Backup Code carries it, streak and all): {pid, grade, on, queue,
   plays: {day: 'YYYY-MM-DD', games: [ids already sent a 'play' that day]}, week, weekStars, endless: {gameId: best this week}, id (the 6-character id the
   scoreboard shows for this device, when it tells us)}.

     Arcade.Leaderboard.available()      an address is set (the button shows)
     .settings() / setGrade(6|7|8) / setOn(bool)
     .canSend()                           everything above holds
     .board(grade, {fresh})              → {ok, data} (cached 60 s on this device; a failed read → the last good board
                                           {ok, data, stale: true, at, why}) | {ok: false, why}
     .warm()                              the quiet wake-up (at most once in 10 minutes)
     .lastRequest()                       how the last request went (?teacher)
     .TIMEOUTS                            {read, send} in ms (tests shorten them)
     .mine()                              this device's week: {week, stars, endless: {…}, streak, grade}
     .queue() / .flush()                  tests
*/
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const TIMEOUTS = {read: 25000, send: 20000}, MAX_QUEUE = 50, CACHE_MS = 60000, RETRY_MS = 60000, WARM_GAP = 10 * 60000;
  const url = () => String(A.LEADERBOARD_URL || '').trim();
  const D = () => A.store.gameData('leaderboard');
  const save = () => A.store.saveGameData('leaderboard');
  const pad = n => String(n).padStart(2, '0');
  const today = () => (A.store.today ? A.store.today() : new Date());
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  /** the week's Monday (boards reset every Monday) */
  const weekKey = (d = today()) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return dayKey(m); };
  const newPid = () => {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789', out = [], r = new Uint8Array(24);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.floor(Math.random() * 256); });
    r.forEach(b => out.push(abc[b % 36]));
    return out.join('');
  };
  const pid = () => { const d = D(); if (!/^[a-z0-9]{24}$/.test(d.pid || '')) { d.pid = newPid(); save(); } return d.pid; };
  const GRADES = [6, 7, 8];

  function settings() { const d = D(); return {grade: GRADES.includes(+d.grade) ? +d.grade : null, on: d.on !== false, pid: d.pid || null}; }
  function setGrade(g) { if (!GRADES.includes(+g)) return; D().grade = +g; save(); flushSoon(); }
  function setOn(on) { const d = D(); d.on = !!on; if (!on) d.queue = []; save(); if (on) flushSoon(); }
  const available = () => !!url();
  const canSend = () => available() && !A.DEMO && settings().on && !!settings().grade;

  /* ---------- this week on this device ---------- */
  function rollWeek() {
    const d = D(), w = weekKey();
    if (d.week !== w) { d.week = w; d.weekStars = 0; d.endless = {}; save(); }
    return d;
  }
  /** school days (Mon–Fri) in a row with practice, ending today or the last school day (weekends never break it) */
  function streak() {
    const log = A.store.activity || {}, d = today();
    const played = k => { const a = log[k]; return !!a && !!(a.p || a.s || a.c || Object.keys(a.g || {}).length); };
    let n = 0, day = new Date(d.getFullYear(), d.getMonth(), d.getDate()), first = true;
    for (let i = 0; i < 400; i++) {
      const wd = day.getDay();
      if (wd !== 0 && wd !== 6) {
        if (played(dayKey(day))) n++;
        else if (!first) break;                // today not played yet doesn't break it
        first = false;
      }
      day.setDate(day.getDate() - 1);
    }
    return n;
  }
  function mine() { const d = rollWeek(); return {week: d.week, stars: d.weekStars || 0, endless: Object.assign({}, d.endless), streak: streak(), grade: settings().grade}; }

  /* ---------- the events (storage.js calls these) ---------- */
  function enqueue(ev) {
    if (!canSend()) return;
    const av = A.Avatar && A.Avatar.get ? A.Avatar.get() : null;
    const body = {pid: pid(), grade: settings().grade, name: av && A.Avatar.nameNumbers ? A.Avatar.nameNumbers(av) : [0, 0, 0],
      game: String(ev.game || ''), type: ev.type, value: Math.max(0, Math.round(+ev.value || 0)), level: ev.level == null ? '' : ev.level};
    const d = D(), q = d.queue || (d.queue = []);
    q.push(body);
    while (q.length > MAX_QUEUE) q.shift();
    save();
    flushSoon();
  }
  /** a level's best stars went up by `gain` */
  function stars(game, level, gain) {
    if (!(gain > 0) || A.DEMO) return;
    const d = rollWeek(); d.weekStars = (d.weekStars || 0) + gain; save();
    enqueue({type: 'stars', game, level, value: Math.min(3, gain)});
  }
  /** an Endless game over: sent only when it beats this device's best this week for that game */
  function endless(game, score) {
    score = Math.round(+score || 0);
    if (score <= 0 || A.DEMO) return;
    const d = rollWeek(), e = d.endless || (d.endless = {});
    if (score <= (e[game] || 0)) return;
    e[game] = score; save();
    enqueue({type: 'endless', game, value: score});
  }
  /** a game started: once a day PER GAME (plays = {day, games: [ids sent today]}, a new day starts the list over) */
  function play(game) {
    game = String(game || '');
    if (!game || !canSend()) return;
    const d = D(), k = dayKey(today());
    let p = d.plays;
    if (!p || p.day !== k || !Array.isArray(p.games)) p = d.plays = {day: k, games: []};
    if (p.games.includes(game)) return;
    p.games.push(game); save();
    enqueue({type: 'play', game, value: 1});
  }

  /* ---------- the network: simple CORS requests only (see the top), a time limit, what happened ---------- */
  let last = null;                                            // how the last request went (lastRequest(), ?teacher)
  async function request(params, body, ms = body === undefined ? TIMEOUTS.read : TIMEOUTS.send, quiet = false) {
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), ms);
    const t0 = Date.now(), done = (res, why) => { if (!quiet) last = {ok: !res.net, why: why || null, ms: Date.now() - t0, at: Date.now(), action: params ? params.action : 'send'}; return res; };
    try {
      const u = url() + (params ? (url().includes('?') ? '&' : '?') + new URLSearchParams(params) : '');
      const r = await fetch(u, body === undefined
        ? {method: 'GET', credentials: 'omit', redirect: 'follow', signal: ctl && ctl.signal}
        : {method: 'POST', credentials: 'omit', redirect: 'follow', signal: ctl && ctl.signal,
           headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body)});
      if (!r.ok) return done({net: true, status: r.status}, `HTTP ${r.status}`);
      try { return done({json: await r.json()}); } catch (e) { return done({net: true, status: 'not json'}, 'not JSON'); }
    } catch (e) {
      if (e && e.name === 'AbortError') return done({net: true, status: 'timeout'}, `timeout after ${ms >= 10000 ? Math.round(ms / 1000) : +(ms / 1000).toFixed(1)} s`);
      if (navigator.onLine === false) return done({net: true, status: 'offline'}, 'offline');
      return done({net: true, status: 'network'}, 'network error (CORS or blocked)');
    } finally { clearTimeout(timer); }
  }
  /** WARM-UP: one quiet ?action=status so a cold script is awake by the time someone opens the leaderboard (at most
      once in WARM_GAP, remembered for the browser session; never waited for, the result ignored; never in ?demo) */
  const WKEY = 'bandarcade.lb-warm';
  function warm() {
    if (!available() || A.DEMO) return false;
    let at = 0; try { at = +sessionStorage.getItem(WKEY) || 0; } catch (e) { /* fine */ }
    if (Date.now() - at < WARM_GAP) return false;
    try { sessionStorage.setItem(WKEY, String(Date.now())); } catch (e) { /* fine */ }
    request({action: 'status'}, undefined, TIMEOUTS.read, true).catch(() => {});   // quiet: not what the teacher line reports
    return true;
  }
  let flushing = false, soon = 0;
  function flushSoon(ms = 400) { if (!soon) soon = setTimeout(() => { soon = 0; flush(); }, ms); }
  /** send what waits, oldest first; stop at the first failure (it stays queued) */
  async function flush() {
    if (flushing || !canSend() || (navigator.onLine === false)) return;
    flushing = true;
    try {
      while ((D().queue || []).length && canSend()) {
        const ev = D().queue[0], res = await request(null, ev);
        if (res.net) break;                                        // offline, timed out, a server error: try later
        const q = D().queue; if (q[0] === ev) q.shift();             // done (a refused event is dropped, never retried)
        if (res.json && /^[A-Za-z0-9]{6}$/.test(res.json.id || '')) D().id = res.json.id;   // this device's short id, if the scoreboard says
        save();
      }
    } finally { flushing = false; }
  }
  if (typeof addEventListener === 'function') {
    addEventListener('online', () => flushSoon(200));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) flushSoon(800); });
    setInterval(() => { if ((D().queue || []).length) flush(); }, RETRY_MS);
    setTimeout(() => { if (A.store && (D().queue || []).length) flush(); }, 3000);
  }

  /* ---------- reading the boards (cached 60 s on this device; the last good one kept for when the network fails) ---- */
  const CKEY = 'bandarcade.lb-cache', LKEY = 'bandarcade.lb-last';
  const cacheGet = g => { try { const c = JSON.parse(sessionStorage.getItem(CKEY)) || {}; return c[g] && Date.now() - c[g].at < CACHE_MS ? c[g] : null; } catch (e) { return null; } };
  const cachePut = (g, data) => { try { const c = JSON.parse(sessionStorage.getItem(CKEY)) || {}; c[g] = {at: Date.now(), data}; sessionStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) { /* fine */ } };
  const lastGet = g => { try { const c = JSON.parse(localStorage.getItem(LKEY)) || {}; return c[g] && c[g].data ? c[g] : null; } catch (e) { return null; } };
  const lastPut = (g, data) => { try { const c = JSON.parse(localStorage.getItem(LKEY)) || {}; c[g] = {at: Date.now(), data}; localStorage.setItem(LKEY, JSON.stringify(c)); } catch (e) { /* fine */ } };
  async function board(grade, {fresh} = {}) {
    if (!available()) return {ok: false, why: 'off'};
    grade = +grade;
    if (!GRADES.includes(grade)) return {ok: false, why: 'grade'};
    const c = !fresh && cacheGet(grade);
    if (c) return {ok: true, data: c.data, at: c.at, cached: true};
    const t0 = Date.now();
    let res = await request({action: 'board', grade}), tries = 1;
    if (res.net && res.status === 'timeout') { res = await request({action: 'board', grade}); tries = 2; }   // a cold script: once more
    if (last) Object.assign(last, {tries, ms: Date.now() - t0});                                         // (both tries)
    const why = res.net ? res.status : !res.json || res.json.ok === false ? 'error' : res.json.enabled === false ? 'disabled' : null;
    if (why === 'disabled') return {ok: false, why};
    if (why) {
      const old = lastGet(grade);                             // the network failed: the last good board, marked stale
      return old ? {ok: true, data: old.data, at: old.at, stale: true, why} : {ok: false, why};
    }
    cachePut(grade, res.json); lastPut(grade, res.json);
    return {ok: true, data: res.json, at: Date.now()};
  }
  /** is this board entry this device? (the scoreboard's 6-character id, else the pid's start) */
  const isMe = entry => !!entry && !!entry.id && (entry.id === D().id || (!D().id && D().pid && entry.id === D().pid.slice(0, 6)));

  A.Leaderboard = {available, settings, setGrade, setOn, canSend, stars, endless, play, board, mine, isMe, weekKey, GRADES,
    ENDLESS_GAMES: ['note-storm', 'note-ninja', 'lost-signal', 'vanishing-ink', 'keys-to-the-city', 'rhythm-dojo', 'blocktave'],
    warm, TIMEOUTS, lastRequest: () => last && Object.assign({}, last),
    queue: () => (D().queue || []).slice(), flush, _request: request};
})(window.Arcade);
