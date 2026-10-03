/* Band Arcade: THE LOBBY QUEUE (the floor page only: index.html, loaded early). ONE rule for everything that pops up or
   slides in on its own on the floor page, so a student never opens the arcade to a pile of banners and panels.
   A feature ASKS to appear; the queue decides when:
     Arcade.Lobby.queue.request({id, kind: 'panel' | 'banner' | 'toast', priority, show(done), when?(), views?, ms?, reward?})
       id        one request per id: asking again while it waits updates it, while it shows does nothing
       kind      'panel'  a modal card (CHAMPION, UNLOCKED!, the event's free gift, Bring your progress…)
                 'banner' the slot under the lobby cards (SAVE YOUR PROGRESS, the grade question) or the app's update
                 'toast'  a short message (PLAYING AS)
       priority  a PRIORITY name below (or a number); default: PRIORITY[id], else PRIORITY.toast / 0
       show(done) draws it NOW; done() when it closes (claimed, dismissed, snoozed, finished). It may return how to take
                 it away again (a banner or toast the queue has to hide for a moment): a function (hide), an element
                 (removed to hide; gone by itself = done) or {hide, gone()}
       when()    (optional) "still wanted?", asked again just before it shows (false: the request is dropped)
       views     'lobby' (default) | 'any' (the lobby, a zone, ALL GAMES) | 'select' (the Select Player screen)
       ms        a toast's time on screen (default 2200)
       reward    true: an UNLOCKED! card, which may be the visit's 3rd panel
     .cancel(id)     no longer wanted (a banner or toast showing is taken away; a panel showing is forgotten)
     .hold(key, on)  hold everything (arcade.js: 'opening-game' while a game's START sound plays)
     .busy({views})  why nothing may show right now ('' = free): Arcade.Lobby.free() is !busy()
     .state()        tests: {current, banner, toast, waiting: [ids], shownThisVisit, panels, visit, blocked}
     .isShowing(id), .kick(), PRIORITY, SETTINGS
   THE RULES
     - AT MOST ONE PANEL AT A TIME, the highest priority first; the next one ≥ SETTINGS.gapMs after the last closed,
       and the first of a visit once the lobby has been free for SETTINGS.settleMs (so everything asked on the way in
       is sorted first).
     - A VISIT = the lobby showing (not a zone, ALL GAMES or Choose Your Instrument) until the student leaves it. At most
       SETTINGS.maxPanelsPerVisit (2) panels a visit; an UNLOCKED! card (reward) may be a 3rd. The rest wait for the
       next visit (still wanted? when()), their own snooze rules still apply.
     - AT MOST ONE BANNER, one TOAST at a time; a banner or toast shows only while no panel is up or waiting (a
       higher-priority one takes the place of a lower one, which waits). Each toast stays its whole `ms`; one that had
       to hide shows again, whole, later.
     - NOTHING over PRESS START, Choose Your Instrument / Select Player (body.in-select; a 'select' request is that
       screen's own), a game being opened, the leaderboard, the avatar creator, or any panel or overlay the student
       opened (Prize Counter, Locker, Settings, Backup, the event panel…): the queue waits for them. A banner or toast
       showing hides meanwhile and comes back after.
   ?demo&queue=log: every decision in the console. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  /* ===================== PRIORITY (Mr. Graham can reorder these: a higher number shows first) ===================== */
  const PRIORITY = {
    'app-update': 100,      // banner: "New version ready — tap to update" (shared/app.js): it needs a reload
    'bring-progress': 90,   // panel: the installed app's first launch asks for a Backup Code (shared/app.js)
    'tour': 80,             // panel: the first-day tour (none yet): everything below waits until it finishes
    'unlocked': 70,         // panel: UNLOCKED! cards (shared/skins.js catchUp, via Arcade.Lobby.unlocked)
    'champion': 60,         // panel: the weekly CHAMPION card (champion-lobby.js)
    'event-gift': 50,       // panel: a seasonal event's free gift, once a day until claimed (season-lobby.js)
    'create-player': 40,    // panel: "Create your player?" (shared/avatar-creator.js offer, on Select Player)
    'grade': 30,            // banner: "Show up on the leaderboard? What grade are you in?" (leaderboard-screen.js)
    'backup-nudge': 20,     // banner: SAVE YOUR PROGRESS (shared/backup-nudge.js)
    'playing-as': 10,       // toast: "Playing as Trumpet · Change" after PRESS START (arcade.js)
    'toast': 0,             // any other toast
  };
  const SETTINGS = {maxPanelsPerVisit: 2, rewardExtra: 1, gapMs: 600, settleMs: 300, tickMs: 200};
  /* ================================================================================================================ */

  const params = new URLSearchParams(location.search);
  const LOG = params.has('demo') && params.get('queue') === 'log';
  const log = (...a) => { if (LOG && window.console) console.log('[lobby queue]', ...a); };
  const $ = id => document.getElementById(id);
  const now = () => performance.now();
  const body = () => document.body;

  const waiting = new Map();                      // id -> request
  const cur = {panel: null, banner: null, toast: null};
  const holds = new Set();
  let visit = 0, inVisit = false, visitAt = 0, shownThisVisit = [], panels = 0, lastClose = -1e9, timer = 0, lastWhy = '';

  const prio = r => typeof r.priority === 'number' ? r.priority
    : r.priority in PRIORITY ? PRIORITY[r.priority] : r.id in PRIORITY ? PRIORITY[r.id] : r.kind === 'toast' ? PRIORITY.toast : 0;
  const lobbyShowing = () => { const l = $('lobby'); return !!l && !l.hidden && !body().classList.contains('in-select'); };
  const shown = el => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';

  /** why nothing may appear now for requests of these views ('' = free) */
  function busy({views = 'lobby'} = {}) {
    if (!body()) return 'loading';
    if (document.hidden) return 'hidden';
    if (shown($('pressStart'))) return 'press-start';
    const sel = body().classList.contains('in-select');
    if (views === 'select' ? !sel : sel) return views === 'select' ? 'no select screen' : 'choose your instrument';
    if (views === 'lobby') { const l = $('lobby'); if (!l || l.hidden) return 'not the lobby'; }
    if (holds.size) return [...holds][0];
    if (body().classList.contains('lb-open')) return 'leaderboard';
    if (body().classList.contains('avc-open')) return 'avatar creator';
    if (A.UI && ((A.UI.isOpen && A.UI.isOpen()) || (A.UI.layer && A.UI.layer.top && A.UI.layer.top()))) return 'panel';
    if ([...document.querySelectorAll('body > .overlay')].some(shown)) return 'overlay';
    return '';
  }

  function request(r) {
    if (!r || !r.id || !r.show) return null;
    r.kind = r.kind || 'panel';
    r.views = r.views || 'lobby';
    if (Object.values(cur).some(c => c && c.id === r.id)) return r.id;          // already showing
    const old = waiting.get(r.id);
    waiting.set(r.id, Object.assign(old || {}, r, {at: old ? old.at : now()}));
    if (!old) log('asked', r.id, r.kind);
    soon();
    return r.id;
  }
  function cancel(id) {
    if (waiting.delete(id)) log('cancelled (waiting)', id);
    ['banner', 'toast', 'panel'].forEach(k => {
      const c = cur[k];
      if (!c || c.id !== id) return;
      log('cancelled (showing)', id);
      c.finished = true; cur[k] = null;
      if (k !== 'panel') takeAway(c);
      else lastClose = now();
    });
    soon();
  }
  function takeAway(c) {
    const h = c.handle;
    try {
      if (typeof h === 'function') h();
      else if (h && h.nodeType === 1) h.remove();
      else if (h && h.hide) h.hide();
    } catch (e) { if (window.console) console.warn('lobby queue: hide', c.id, e); }
  }
  const gone = c => { const h = c.handle; return !!h && (h.nodeType === 1 ? !h.isConnected : !!(h.gone && h.gone())); };
  const wanted = r => { try { return !r.when || !!r.when(); } catch (e) { return false; } };
  /** may this panel still show on this visit? (the per-visit limit counts the lobby's own panels only) */
  const roomFor = r => r.views !== 'lobby' || panels < SETTINGS.maxPanelsPerVisit || (!!r.reward && panels < SETTINGS.maxPanelsPerVisit + SETTINGS.rewardExtra);

  /** the waiting requests of this kind that could show now, best first (when() is asked only of the one chosen) */
  function ready(kind) {
    return [...waiting.values()].filter(r => r.kind === kind && !busy({views: r.views}) && (kind !== 'panel' || roomFor(r)))
      .sort((a, b) => prio(b) - prio(a) || a.at - b.at);
  }
  function best(kind) {
    for (const r of ready(kind)) {
      if (wanted(r)) return r;
      waiting.delete(r.id); log('dropped (no longer wanted)', r.id);
    }
    return null;
  }
  const panelWaiting = () => ready('panel').some(wanted);

  function startVisit() {
    visit++; inVisit = true; visitAt = now(); shownThisVisit = []; panels = 0;
    log('visit', visit, 'starts; waiting:', [...waiting.keys()].join(', ') || 'nothing');
  }
  function endVisit() {
    inVisit = false;
    log('visit', visit, 'ends');
    ['banner', 'toast'].forEach(k => { const c = cur[k]; if (c && c.views === 'lobby') putBack(k, 'left the lobby'); });
  }
  /** a banner or toast has to make way: hidden now, back in the line (a toast will show again whole) */
  function putBack(k, why) {
    const c = cur[k]; cur[k] = null;
    takeAway(c);
    if (c.finished) return;
    c.handle = null;
    if (!waiting.has(c.id)) waiting.set(c.id, c);
    log('hidden', c.id, '(' + why + ')');
  }
  function finish(k, c) {
    if (c.finished) return;
    c.finished = true;
    if (cur[k] === c) cur[k] = null;
    if (k === 'panel') { lastClose = now(); setTimeout(refocus, 0); }
    log('done', c.id);
    soon();
  }
  /** a panel closed and took the focus with it: back to the lobby (arcade.js focusView), unless something else is up */
  function refocus() {
    const a = document.activeElement;
    if ((a && a !== document.body && a.isConnected) || busy({views: 'any'})) return;
    if (A.Lobby.refocus) A.Lobby.refocus();
  }
  function display(k, r) {
    waiting.delete(r.id);
    cur[k] = r; r.finished = false; r.shownAt = now();
    if (k === 'panel') { if (inVisit && r.views === 'lobby') panels++; }
    if (inVisit && !shownThisVisit.includes(r.id)) shownThisVisit.push(r.id);
    log('shows', r.id, k === 'panel' ? `(panel ${panels} this visit)` : '');
    let h;
    try { h = r.show(() => finish(k, r)); } catch (e) { if (window.console) console.error('lobby queue:', r.id, e); finish(k, r); return; }
    if (!r.finished) r.handle = h;
  }

  function tick() {
    clearTimeout(timer); timer = 0;
    if (!body()) { timer = setTimeout(tick, SETTINGS.tickMs); return; }
    const showing = lobbyShowing();
    if (showing && !inVisit) startVisit(); else if (!showing && inVisit) endVisit();
    // banners and toasts: gone by themselves, time up, or something now in their way
    ['banner', 'toast'].forEach(k => {
      const c = cur[k];
      if (!c) return;
      if (gone(c)) { finish(k, c); return; }
      if (k === 'toast' && now() - c.shownAt >= (c.ms || 2200)) { takeAway(c); finish(k, c); return; }
      const why = busy({views: c.views}) || (cur.panel ? 'a panel' : panelWaiting() ? 'a panel is next' : '');
      if (why) putBack(k, why);
    });
    // the next panel
    if (!cur.panel) {
      const r = best('panel');
      const wait = r && Math.max(lastClose + SETTINGS.gapMs - now(), r.views === 'lobby' ? visitAt + SETTINGS.settleMs - now() : 0);
      if (r && wait <= 0) display('panel', r);
      else if (r) say('next: ' + r.id + ' in ' + Math.round(wait) + ' ms');
      else if (waiting.size) say('waiting: ' + [...waiting.values()].map(w => w.id + ' (' + (busy({views: w.views}) || (w.kind === 'panel' && !roomFor(w) ? 'next visit' : 'after the panels')) + ')').join(', '));
    }
    // banners and toasts only while no panel is up or about to be
    if (!cur.panel && !panelWaiting()) {
      ['banner', 'toast'].forEach(k => {
        const r = best(k), c = cur[k];
        if (!r) return;
        if (c && prio(r) <= prio(c)) return;
        if (c) putBack(k, r.id + ' comes first');
        display(k, r);
      });
    }
    const quiet = !cur.panel && !cur.toast && !panelWaiting();
    body().classList.toggle('lq-quiet', quiet);                     // the Prize Counter sign's wish pulse (arcade.css)
    if (waiting.size || cur.panel || cur.banner || cur.toast || inVisit !== lobbyShowing()) timer = setTimeout(tick, SETTINGS.tickMs);
  }
  function say(why) { if (why !== lastWhy) { lastWhy = why; log(why); } }
  let micro = false;
  function soon() {
    if (micro) return;
    micro = true;
    Promise.resolve().then(() => { micro = false; tick(); });
  }
  function hold(key, on) { if (on) holds.add(key); else holds.delete(key); log(on ? 'hold' : 'release', key); soon(); }

  // the lobby showing or hidden, the page back on screen, a panel closing: look again
  document.addEventListener('visibilitychange', soon);
  addEventListener('pageshow', e => { if (e.persisted) { holds.delete('opening-game'); if (inVisit) endVisit(); soon(); } });
  addEventListener('popstate', () => setTimeout(soon, 0));
  if (window.MutationObserver) {
    const watch = () => {
      new MutationObserver(soon).observe(document.body, {childList: true, attributes: true, attributeFilter: ['class']});
      const l = $('lobby'); if (l) new MutationObserver(soon).observe(l, {attributes: true, attributeFilter: ['hidden']});   // a visit starts or ends
    };
    if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch, {once: true});
  }

  soon();                                         // a first look (body.lq-quiet: the Prize Counter sign's pulse)

  A.Lobby = A.Lobby || {};
  A.Lobby.queue = {
    request, cancel, hold, busy, kick: soon, PRIORITY, SETTINGS,
    isShowing: id => Object.values(cur).some(c => c && c.id === id),
    has: id => waiting.has(id) || Object.values(cur).some(c => c && c.id === id),
    state: () => ({current: cur.panel && cur.panel.id, banner: cur.banner && cur.banner.id, toast: cur.toast && cur.toast.id,
      waiting: [...waiting.values()].sort((a, b) => prio(b) - prio(a) || a.at - b.at).map(r => r.id),
      shownThisVisit: shownThisVisit.slice(), panels, visit, inVisit, blocked: busy()}),
  };
})(window.Arcade);
