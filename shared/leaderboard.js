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
   this week. Events wait in a queue on the device (at most 250: the oldest go first) and are sent one at a time, at
   most PER_HOUR (100) in an hour (the server takes 150 per player); a failed or offline send stays queued and is tried
   again (going online, the page showing again, every 60 s). Nothing here ever holds up a game.
   NO GRADE YET: while the grade is the ONLY thing missing, this week's would-be events are HELD (see HELD below) and go
   out when a grade is chosen. CHANGING THE GRADE: queued events take the new grade and one 'play' goes at once
   (d.regrade, not the daily record): the scoreboard (Leaderboard.gs v4.1) counts each player in the grade of their
   NEWEST event, so the whole week moves over.

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
   scoreboard shows for this device, when it tells us), held, askAfter (the lobby's grade question waits until then),
   regrade {day, from, to}, lastOk / lastRefused (?teacher)}.

     Arcade.Leaderboard.available()      an address is set (the button shows)
     .settings() / setGrade(6|7|8) / setOn(bool)
     .canSend()                           everything above holds
     .board(grade, {fresh})              → {ok, data} (cached 60 s on this device; a failed read → the last good board
                                           {ok, data, stale: true, at, why}) | {ok: false, why}
     .warm()                              the quiet wake-up (at most once in 10 minutes)
     .lastRequest()                       how the last request went (?teacher)
     .TIMEOUTS                            {read, send} in ms (tests shorten them)
     .mine()                              this device's week: {week, stars, endless: {…}, streak, grade}
     .queue() / .flush()                  tests; flush() → {sent, left, why}
     .held() / .heldCount() / .canHold() / .clearGrade() / .diag()   no grade yet; ?teacher's device state
   WEEKLY CHAMPIONS (the block of that name below): .champions(grade) / .checkChampion({force}) / .unclaimed() /
     .claim() / .trophies() / .championships() / .CHAMPION_REWARDS / .boardName(b) / .boardValue(b, v) / .weekName(w) /
     .champState() (?teacher, tests). Saved too: awards, champCheckedWeek, champLast.
*/
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const TIMEOUTS = {read: 25000, send: 20000}, MAX_QUEUE = 250, CACHE_MS = 60000, RETRY_MS = 60000, WARM_GAP = 10 * 60000;
  const MAX_HELD = 200, PER_HOUR = 100;                     // held entries before a grade; sends an hour (the server allows 150)
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
  /** choose the grade. The first time: everything HELD while there was no grade goes into the queue. A different grade
      than before: the waiting events take the new grade and one 'play' goes at once (the regrade flag, not the daily
      record), because the scoreboard counts each player in the grade of their NEWEST event: the whole week moves over. */
  function setGrade(g) {
    if (!GRADES.includes(+g)) return;
    g = +g;
    const d = D(), was = settings().grade;
    d.grade = g;
    (d.queue || []).forEach(ev => { ev.grade = g; });
    save();
    if (!was) release();
    else if (was !== g && canSend()) {
      const p = d.plays, game = (p && p.day === dayKey(today()) && p.games && p.games[0]) || todaysGame() || 'arcade';
      d.regrade = {day: dayKey(today()), from: was, to: g};
      enqueue({type: 'play', game, value: 1});
    }
    flushSoon();
  }
  /** the switch. OFF = nothing is ever sent: the queue and everything held are dropped */
  function setOn(on) { const d = D(); d.on = !!on; if (!on) { d.queue = []; d.held = null; } save(); if (on) flushSoon(); }
  /** "clear my grade" (the lobby card's UNDO, tests): back to no grade; nothing is sent */
  function clearGrade() { const d = D(); delete d.grade; save(); }
  const available = () => !!url();
  const canSend = () => available() && !A.DEMO && settings().on && !!settings().grade;
  /** only the grade is missing (an address, the switch on, not ?demo): what would be sent is HELD instead */
  const canHold = () => available() && !A.DEMO && settings().on && !settings().grade;
  /** the first game started today in the activity log (a regrade's 'play') */
  function todaysGame() { const a = (A.store.activity || {})[dayKey(today())]; return a && a.g ? Object.keys(a.g)[0] || null : null; }

  /* ---------- this week on this device ---------- */
  function rollWeek() {
    const d = D(), w = weekKey();
    if (d.week !== w) { d.week = w; d.weekStars = 0; d.endless = {}; d.held = null; save(); }   // (held events are this week's)
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

  /* ---------- HELD: before a grade is chosen ----------
     While the only thing missing is the grade, this week's would-be events wait in gameData('leaderboard').held =
     {week, stars: {'game|level': {game, level, value ≤ 3}}, endless: {game: best}, plays: {day, games}} (at most
     MAX_HELD entries, the oldest stars dropped first; a new week drops it, the switch OFF drops it). setGrade() moves it
     into the queue: stars as events of ≤ 3 (one per level), each game's best Endless score, today's plays. */
  function heldRec() {
    const d = rollWeek();
    if (!d.held || d.held.week !== d.week) d.held = {week: d.week, stars: {}, endless: {}, plays: {day: '', games: []}};
    return d.held;
  }
  const heldCount = h => !h ? 0 : Object.keys(h.stars || {}).length + Object.keys(h.endless || {}).length + ((h.plays || {}).games || []).length;
  function hold(ev) {
    const h = heldRec();
    if (ev.type === 'stars') {
      const k = ev.game + '|' + ev.level, e = h.stars[k] || (h.stars[k] = {game: ev.game, level: ev.level, value: 0});
      e.value = Math.min(3, e.value + (+ev.value || 0));
    } else if (ev.type === 'endless') h.endless[ev.game] = Math.max(h.endless[ev.game] || 0, +ev.value || 0);
    else if (ev.type === 'play') {
      const k = dayKey(today());
      if (h.plays.day !== k) h.plays = {day: k, games: []};
      if (!h.plays.games.includes(ev.game)) h.plays.games.push(ev.game);
    }
    for (let over = heldCount(h) - MAX_HELD, keys = Object.keys(h.stars); over > 0 && keys.length; over--) delete h.stars[keys.shift()];
    save();
  }
  /** the grade was just chosen: everything held goes into the queue (with this grade), then it is forgotten */
  function release() {
    const d = D(), h = d.held;
    d.held = null;
    if (!h || h.week !== weekKey() || !canSend()) { save(); return 0; }
    let n = 0;
    Object.values(h.stars || {}).forEach(e => { if (e.value > 0) { enqueue({type: 'stars', game: e.game, level: e.level, value: Math.min(3, e.value)}, true); n++; } });
    Object.keys(h.endless || {}).forEach(g => { enqueue({type: 'endless', game: g, value: h.endless[g]}, true); n++; });
    const k = dayKey(today());
    if (h.plays && h.plays.day === k) {
      const p = d.plays && d.plays.day === k ? d.plays : (d.plays = {day: k, games: []});
      h.plays.games.forEach(g => { if (!p.games.includes(g)) { p.games.push(g); enqueue({type: 'play', game: g, value: 1}, true); n++; } });
    }
    save();
    return n;
  }

  /* ---------- the events (storage.js calls these) ---------- */
  function enqueue(ev, quietly = false) {
    if (!canSend()) { if (canHold()) hold(ev); return; }
    const av = A.Avatar && A.Avatar.get ? A.Avatar.get() : null;
    const body = {pid: pid(), grade: settings().grade, name: av && A.Avatar.nameNumbers ? A.Avatar.nameNumbers(av) : [0, 0, 0],
      game: String(ev.game || ''), type: ev.type, value: Math.max(0, Math.round(+ev.value || 0)), level: ev.level == null ? '' : ev.level};
    const d = D(), q = d.queue || (d.queue = []);
    q.push(body);
    while (q.length > MAX_QUEUE) q.shift();
    if (!quietly) { save(); flushSoon(); }
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
    if (!game) return;
    if (!canSend()) { if (canHold()) hold({type: 'play', game}); return; }
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
  /* PACING: at most PER_HOUR sends in any hour on this device (the server takes 150 an hour per player), so a big
     catch-up (held events, a long time offline) goes out over the queue's normal retries (every 60 s) instead of at
     once. The send times live in localStorage 'bandarcade.lb-sent' (not progress, not in the Backup Code). */
  const SKEY = 'bandarcade.lb-sent';
  const sentLastHour = () => { try { const t = Date.now() - 3600000; return (JSON.parse(localStorage.getItem(SKEY)) || []).filter(x => x > t); } catch (e) { return []; } };
  const noteSent = () => { try { const l = sentLastHour(); l.push(Date.now()); localStorage.setItem(SKEY, JSON.stringify(l)); } catch (e) { /* fine */ } };
  /** send what waits, oldest first; stop at the first failure (it stays queued) → {sent, left, why} */
  async function flush() {
    if (flushing) return {sent: 0, left: (D().queue || []).length, why: 'busy'};
    if (!canSend()) return {sent: 0, left: (D().queue || []).length, why: !available() ? 'no address' : A.DEMO ? '?demo' : !settings().on ? 'switch off' : 'no grade'};
    if (navigator.onLine === false) return {sent: 0, left: (D().queue || []).length, why: 'offline'};
    flushing = true;
    let sent = 0, why = null;
    try {
      while ((D().queue || []).length && canSend()) {
        if (sentLastHour().length >= PER_HOUR) { why = 'pacing (100 an hour)'; break; }
        const ev = D().queue[0], res = await request(null, ev);
        if (res.net) { why = last && last.why; break; }            // offline, timed out, a server error: try later
        noteSent();
        // done (a refused event is dropped, never retried). Compared by value too: store.reload() (the champions check,
        // Today's Practice) may have swapped the saved data for a fresh copy while this send was on its way
        const q = D().queue || []; if (q[0] === ev || (q[0] && JSON.stringify(q[0]) === JSON.stringify(ev))) q.shift();
        if (res.json && /^[A-Za-z0-9]{6}$/.test(res.json.id || '')) D().id = res.json.id;   // this device's short id, if the scoreboard says
        if (res.json && res.json.ok !== false) { D().lastOk = Date.now(); sent++; } else D().lastRefused = {at: Date.now(), why: (res.json && res.json.error) || 'refused'};
        save();
      }
    } finally { flushing = false; }
    return {sent, left: (D().queue || []).length, why};
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
  /** one read: GET ?action=<action>&grade=<g> (a board, or the champions), cached CACHE_MS, the last good answer kept */
  async function read(action, grade, {fresh, quiet = false} = {}) {
    if (!available()) return {ok: false, why: 'off'};
    grade = +grade;
    if (!GRADES.includes(grade)) return {ok: false, why: 'grade'};
    const key = action === 'board' ? grade : action + grade;           // (a board keeps its old key: saved boards still show)
    const c = !fresh && cacheGet(key);
    if (c) return {ok: true, data: c.data, at: c.at, cached: true};
    const t0 = Date.now();
    let res = await request({action, grade}, undefined, TIMEOUTS.read, quiet), tries = 1;
    if (res.net && res.status === 'timeout') { res = await request({action, grade}, undefined, TIMEOUTS.read, quiet); tries = 2; }   // a cold script: once more
    if (last && !quiet) Object.assign(last, {tries, ms: Date.now() - t0});                                         // (both tries)
    const why = res.net ? res.status : !res.json || res.json.ok === false ? 'error' : res.json.enabled === false ? 'disabled' : null;
    if (why === 'disabled') return {ok: false, why};
    if (why) {
      const old = lastGet(key);                               // the network failed: the last good answer, marked stale
      return old ? {ok: true, data: old.data, at: old.at, stale: true, why} : {ok: false, why};
    }
    cachePut(key, res.json); lastPut(key, res.json);
    return {ok: true, data: res.json, at: Date.now()};
  }
  const board = (grade, opts) => read('board', grade, opts);
  /* =====================================================================================================================
     WEEKLY CHAMPIONS. When a week ends, the scoreboard (Leaderboard.gs v4) lists who finished 1st on each board of each
     grade: GET ?action=champions&grade=7 → {ok, enabled, grade, champions: {week (last week's Monday), stars: [entry…],
     improved: [...], streak: [...], endless: {gameId: [...]}}}, entry = {id, name: [t, a, n], value} like a board row
     (everyone tied for 1st is listed; an empty list = nobody reached the minimum). The board read carries the same
     `champions`. NOTHING NEW IS SENT: one more GET with only action + grade, under the same conditions as any send
     (canSend: an address, the switch on, a grade, not ?demo); this device finds its OWN id in the lists, here.
     THE CHECK (checkChampion, called by the lobby when it is on screen): once a week (champCheckedWeek = last week's
     Monday, after a good answer); a failed or offline check tries again at a later lobby showing, at most every
     CHAMP_RETRY; it counts as the warm-up (warm() then waits its 10 minutes). Only LAST week is ever offered: a student
     who comes back two weeks later quietly misses that one.
     SAVED in gameData('leaderboard') (so the Backup Code carries it and a restored device never pays twice):
       awards: {'YYYY-MM-DD': {stars | improved | streak | 'endless:<gameId>': {value, claimed}}} (52 weeks kept),
       champCheckedWeek, champLast {ok, why, at, found} (?teacher).
     CLAIMING (the lobby's CHAMPION card, CLAIM): the record is read fresh and written `claimed` FIRST, then the tokens,
     so a reload or a second tab can never pay twice; then the avatar items it has earned go into ownedItems.
     ===================================================================================================================== */
  // THE REWARDS (Mat edits these numbers)
  const CHAMPION_REWARDS = {
    stars: 100, improved: 75, streak: 75, endless: 50,   // tokens for each 1st place
    plate: 1,          // championships needed for the CHAMPION name plate
    trophyGold: 5,     // championships for the GOLD TROPHY back item
  };
  const CHAMP_ITEMS = [['plate:champion', 'plate'], ['back:goldtrophy', 'trophyGold']];   // [item key, CHAMPION_REWARDS setting]
  const CHAMP_RETRY = 10 * 60000, CHAMP_KEY = 'bandarcade.lb-champ', KEEP_WEEKS = 52;
  const champions = (grade, opts) => (canSend() ? read('champions', grade, opts) : Promise.resolve({ok: false, why: 'off'}));
  /** last week's Monday (the week the champions are for) */
  const lastWeekKey = () => { const d = today(); return weekKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)); };
  /** this device's 6-character id on the boards (null: it never sent anything) */
  const myId = () => D().id || (D().pid ? D().pid.slice(0, 6) : null);
  /** every 1st place of this device in a champions answer: [{board, value}] */
  function matches(ch, id) {
    const out = [];
    if (!ch || !id) return out;
    const has = list => (Array.isArray(list) ? list : []).find(e => e && e.id === id);
    ['stars', 'improved', 'streak'].forEach(b => { const e = has(ch[b]); if (e) out.push({board: b, value: +e.value || 0}); });
    Object.keys(ch.endless || {}).forEach(g => { const e = has(ch.endless[g]); if (e) out.push({board: 'endless:' + g, value: +e.value || 0}); });
    return out;
  }
  const keepWeeks = aw => Object.keys(aw).sort().reverse().slice(KEEP_WEEKS).forEach(k => { delete aw[k]; });
  let checking = false;
  /** the weekly check: → {ran, ok, why, found} (never throws, never blocks anything) */
  async function checkChampion({force = false} = {}) {
    if (checking || !canSend()) return {ran: false, why: checking ? 'busy' : 'off'};
    const wk = lastWeekKey();
    if (!force && D().champCheckedWeek === wk) return {ran: false, why: 'done'};
    let at = 0; try { at = +sessionStorage.getItem(CHAMP_KEY) || 0; } catch (e) { /* fine */ }
    if (!force && Date.now() - at < CHAMP_RETRY) return {ran: false, why: 'wait'};
    try { sessionStorage.setItem(CHAMP_KEY, String(Date.now())); sessionStorage.setItem(WKEY, String(Date.now())); } catch (e) { /* fine */ }   // (it wakes the script too)
    checking = true;
    try {
      const grade = settings().grade, res = await champions(grade, {fresh: true, quiet: true});   // (quiet: lastRequest() stays the boards')
      const ch = res.ok && !res.stale && res.data && res.data.champions;
      if (!ch) { D().champLast = {ok: false, why: res.stale ? res.why : res.why || 'no champions', at: Date.now()}; save(); return {ran: true, ok: false, why: D().champLast.why}; }
      if (ch.week !== wk) { D().champLast = {ok: false, why: `the scoreboard has the week of ${ch.week || '?'}`, at: Date.now()}; save(); return {ran: true, ok: false, why: D().champLast.why}; }
      A.store.reload && A.store.reload();                       // fresh from the device: another tab may have checked already
      const d = D(), aw = d.awards || (d.awards = {}), found = matches(ch, myId());
      found.forEach(m => { const w = aw[wk] || (aw[wk] = {}); if (!w[m.board]) w[m.board] = {value: m.value, claimed: false}; });
      keepWeeks(aw);
      d.champCheckedWeek = wk; d.champLast = {ok: true, why: null, at: Date.now(), found: found.length};
      save();
      grantItems();                                              // (Mat lowered a CHAMPION_REWARDS number: earned now)
      if (found.length) try { dispatchEvent(new CustomEvent('arcade:champion')); } catch (e) { /* old browsers */ }
      return {ran: true, ok: true, found: found.length};
    } finally { checking = false; }
  }
  /** the awards not claimed yet: [{week, board, value}] */
  function unclaimed() {
    const aw = D().awards || {}, out = [];
    Object.keys(aw).sort().forEach(w => Object.keys(aw[w] || {}).forEach(b => { if (aw[w][b] && !aw[w][b].claimed) out.push({week: w, board: b, value: aw[w][b].value}); }));
    return out;
  }
  /** every claimed championship, newest first: [{week, board, value}] (the player card's trophy shelf) */
  function trophies() {
    const aw = D().awards || {}, out = [];
    Object.keys(aw).sort().reverse().forEach(w => Object.keys(aw[w] || {}).forEach(b => { if (aw[w][b] && aw[w][b].claimed) out.push({week: w, board: b, value: aw[w][b].value}); }));
    return out;
  }
  const championships = () => trophies().length;
  const championNeed = k => Math.max(1, +CHAMPION_REWARDS[k] || 1);
  const rewardFor = b => +CHAMPION_REWARDS[String(b).split(':')[0]] || 0;
  /** the avatar items the claimed championships have earned and this device doesn't own yet: written, → their keys */
  function grantItems() {
    const own = A.store.ownedItems || {}, n = championships(), got = [];
    CHAMP_ITEMS.forEach(([key, k]) => { if (n >= championNeed(k) && !own[key]) { A.store.ownItem(key); got.push(key); } });
    return got;
  }
  /** CLAIM: → {awards: [...], tokens, items: [new item keys]} (nothing waiting → tokens 0) */
  function claim() {
    A.store.reload && A.store.reload();                         // fresh from the device: another tab may have paid already
    const list = unclaimed(), aw = D().awards || {};
    list.forEach(a => { aw[a.week][a.board].claimed = true; });
    if (list.length) save();                                    // the record FIRST…
    const tokens = list.reduce((n, a) => n + rewardFor(a.board), 0);
    if (tokens && A.Tokens) A.Tokens.add(tokens);               // …then the tokens (arcade:tokens: the Prize Counter's sign)
    return {awards: list, tokens, items: grantItems()};
  }
  /** words for the screens: the board's name, its value, the week */
  const gameNameOf = id => ((A.ALL_GAMES || A.GAMES || []).find(g => g.id === id) || {name: id}).name;
  function boardName(b) {
    const [k, g] = String(b).split(':');
    return k === 'stars' ? 'Most stars' : k === 'improved' ? 'Most improved' : k === 'streak' ? 'Practice streak' : k === 'endless' ? `${gameNameOf(g)} Endless` : k;
  }
  function boardValue(b, v) {
    const k = String(b).split(':')[0];
    v = +v || 0;
    return k === 'stars' ? `${v} ★` : k === 'improved' ? `+${v} ★` : k === 'streak' ? `${v} ${v === 1 ? 'day' : 'days'}` : v.toLocaleString('en-US');
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekName = w => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w || ''); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : String(w || ''); };
  const champState = () => ({checkedWeek: D().champCheckedWeek || null, last: D().champLast || null, lastWeek: lastWeekKey(), id: myId(),
    awards: JSON.parse(JSON.stringify(D().awards || {}))});
  /** ?teacher: this device's leaderboard state, in one place */
  function diag() {
    const d = D(), st = settings();
    return {grade: st.grade, on: st.on, available: available(), demo: !!A.DEMO, id: myId(), queue: (d.queue || []).length, held: heldCount(d.held),
      weekStars: rollWeek().weekStars || 0, last: last && Object.assign({}, last), lastOk: d.lastOk || null, lastRefused: d.lastRefused || null,
      regrade: d.regrade || null, sentLastHour: sentLastHour().length};
  }
  /** is this board entry this device? (the scoreboard's 6-character id, else the pid's start) */
  const isMe = entry => !!entry && !!entry.id && (entry.id === D().id || (!D().id && D().pid && entry.id === D().pid.slice(0, 6)));

  A.Leaderboard = {available, settings, setGrade, setOn, canSend, stars, endless, play, board, mine, isMe, weekKey, GRADES,
    ENDLESS_GAMES: ['note-storm', 'note-ninja', 'lost-signal', 'vanishing-ink', 'keys-to-the-city', 'rhythm-dojo', 'blocktave'],
    warm, TIMEOUTS, lastRequest: () => last && Object.assign({}, last),
    queue: () => (D().queue || []).slice(), flush, _request: request,
    clearGrade, canHold, held: () => JSON.parse(JSON.stringify(D().held || null)), heldCount: () => heldCount(D().held), diag, MAX_HELD, PER_HOUR,
    CHAMPION_REWARDS, champions, checkChampion, unclaimed, trophies, championships, championNeed, rewardFor, claim, grantItems,
    boardName, boardValue, weekName, myId, lastWeekKey, champState};
})(window.Arcade);
