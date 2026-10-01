/* Band Arcade: THE UI KIT. The pieces every game shares, so the arcade feels like one place (docs/STYLE.md says how
   they look and when to use each; styles in shared/ui-kit.css). Loaded on every page by shared/version.js, before the
   page's own scripts; nothing here runs until a game calls it.

   Arcade.UI.pause.mount({…})      THE PAUSE BUTTON + PAUSE MENU (RESUME · RESTART · SETTINGS · extras · BACK TO LEVELS · BACK TO ARCADE GAMES)
   Arcade.UI.results.show({…})     THE RESULTS SCREEN (stars, title, stat tiles, NEXT / TRY AGAIN / LEVELS, new best)
   Arcade.UI.settings.open({…})    THE SETTINGS PANEL (sound, music, effects, motion, seasonal look, mic sensitivity + meter, the game's own)
   Arcade.UI.intro.show({…})       A LEVEL INTRO pop-up
   Arcade.UI.confirm({…})          a YES / NO question (never the browser's confirm()); UI.notice({…}) = one OK button
   Arcade.UI.toast(text, {…})      a short message that fades by itself
   Arcade.UI.state()               tests

   Every panel: a real dialog (role, label), focus moves in and back out, Tab stays inside, Esc = the safe way out
   (resume / close / no), ↑/↓ move through a menu, every control ≥ 44 px, safe areas respected, and no motion when the
   device (or the Settings panel's Motion switch) asks for less. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const UI = A.UI = A.UI || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const FOCUSABLE = 'button:not([disabled]):not([hidden]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const visible = e => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const typing = e => e && /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !/^(range|checkbox|radio|button)$/.test(e.type || '');

  /* ---------- DIALOG PLUMBING: focus in, Tab trapped, Esc, ↑/↓ in a menu, focus back out ---------- */
  const open = new Set();
  function syncBody() { document.body.classList.toggle('ui-modal', open.size > 0); }
  function trap(ov, {onEsc} = {}) {
    ov._prev = document.activeElement;
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape' && onEsc) { e.preventDefault(); e.stopPropagation(); onEsc(); return; }
      if (e.key === 'Tab') {
        const f = [...ov.querySelectorAll(FOCUSABLE)].filter(visible);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        return;
      }
      const menu = e.target.closest && e.target.closest('.ui-menu, .ui-res-acts, .acts');
      if (menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.tagName === 'BUTTON') {
        const b = [...menu.querySelectorAll('button')].filter(visible), i = b.indexOf(e.target);
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        if (i >= 0 && b.length > 1) { e.preventDefault(); b[(i + d + b.length) % b.length].focus(); }
      }
      // the game underneath never sees keys meant for a panel (its ?demo keys, its answer keys)
      e.stopPropagation();
    });
    ov.addEventListener('keyup', e => e.stopPropagation());
  }
  /* ---------- LAYERS: "OPEN A PANEL ON TOP" ----------
     A panel opened from inside another panel (Backup / Restore from Settings, the Locker from a results card, the
     creator from the Locker…) must never open BEHIND it. UI.layer.open(el) gives the element an inline z-index one
     above whatever is showing now (the highest visible fixed/absolute child of <body>, toasts aside), never below its
     own CSS layer (`min`); UI.layer.close(el) puts it back. Kit panels use it too (show/hide), so a yes/no question
     asked from any panel (min 90) is always on top of it, and toasts (min 95) on top of that.
     With {trap: true} it also runs the dialog plumbing for a panel that isn't a kit panel: focus in (`focus`, a
     selector or element, else the first control), Tab stays inside, Esc (only while it's the TOP layer) calls onEsc,
     body.ui-modal while open (Arcade Quest's keys stop), and close() gives the focus back to what opened it. */
  const LAYERS = [];
  function topZ(except) {
    let z = 0;
    for (const c of document.body.children) {
      if (c === except || c.classList.contains('ui-toast') || !visible(c)) continue;
      const cs = getComputedStyle(c);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      const v = parseInt(cs.zIndex, 10);
      if (v > z) z = v;
    }
    return z;
  }
  function lift(el, min) {
    el.style.zIndex = '';
    const own = parseInt(getComputedStyle(el).zIndex, 10) || 0;
    el.style.zIndex = String(Math.max(own, min || 0, topZ(el) + 1));
  }
  UI.layer = {
    open(el, {min = 80, trap: t = false, onEsc = null, focus = null} = {}) {
      lift(el, min);
      const L = {el, prev: document.activeElement, onEsc, trap: t};
      LAYERS.push(L);
      if (t) {
        open.add(el); syncBody();
        L.key = e => {
          if (LAYERS[LAYERS.length - 1] !== L) return;                    // a panel above it has the keys
          if (e.key === 'Escape' && L.onEsc) { e.preventDefault(); e.stopPropagation(); L.onEsc(); return; }
          if (e.key === 'Tab') {
            const f = [...el.querySelectorAll(FOCUSABLE)].filter(visible);
            if (!f.length) return;
            const i = f.indexOf(document.activeElement);
            if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
          }
        };
        document.addEventListener('keydown', L.key, true);
        const f = typeof focus === 'string' ? el.querySelector(focus) : focus || [...el.querySelectorAll(FOCUSABLE)].filter(visible)[0];
        if (f && f.focus) f.focus({preventScroll: true});
      }
      return L;
    },
    close(el, {restore = true} = {}) {
      const i = LAYERS.findIndex(L => L.el === el);
      if (i < 0) return;
      const [L] = LAYERS.splice(i, 1);
      el.style.zIndex = '';
      if (L.trap) {
        document.removeEventListener('keydown', L.key, true);
        open.delete(el); syncBody();
        const p = L.prev;
        if (restore && p && p.focus && document.contains(p) && visible(p)) p.focus({preventScroll: true});
      }
    },
    /** the element on the top layer (null = none) */
    top: () => (LAYERS.length ? LAYERS[LAYERS.length - 1].el : null),
    topZ: () => topZ(null),
    state: () => LAYERS.map(L => ({id: L.el.id, cls: L.el.className, z: +L.el.style.zIndex})),
  };
  function show(ov, focusSel) {
    ov.hidden = false; open.add(ov); syncBody();
    UI.layer.close(ov); UI.layer.open(ov, {min: 0});                    // on top of whatever is showing (its CSS layer at least)
    const f = (focusSel && ov.querySelector(focusSel)) || [...ov.querySelectorAll(FOCUSABLE)].filter(visible)[0];
    if (f) f.focus({preventScroll: true});
  }
  function hide(ov, {restore = true} = {}) {
    if (!ov || ov.hidden) return;
    ov.hidden = true; open.delete(ov); syncBody(); UI.layer.close(ov);
    const p = ov._prev; ov._prev = null;
    if (restore && p && p.focus && document.contains(p) && visible(p)) p.focus({preventScroll: true});
  }
  UI.isOpen = () => open.size > 0;

  /* ---------- CONFIRM / NOTICE ---------- */
  /** a yes/no question. Resolves true (yes) or false (no, Esc, a tap outside). extra = more HTML (a checkbox…), read
      it in onYes(panel) before the panel goes. */
  UI.confirm = function ({title, text = '', yes = 'Yes', no = 'No', danger = false, extra = '', theme = '', onYes} = {}) {
    return new Promise(res => {
      const ov = el(`<div class="overlay ui-ov ui-confirm-ov ${esc(theme)}" id="uiConfirm" hidden><div class="panel ui-panel" role="alertdialog" aria-modal="true" aria-labelledby="uiConfirmT" aria-describedby="uiConfirmX">
        <h2 class="ui-title" id="uiConfirmT">${esc(title)}</h2><p id="uiConfirmX">${text}</p>${extra}
        <div class="acts"><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(yes)}</button>
          ${no ? `<button type="button" class="btn btn-secondary" data-act="no">${esc(no)}</button>` : ''}</div></div></div>`);
      document.body.appendChild(ov);
      const done = v => { if (v && onYes) onYes(ov.querySelector('.panel')); hide(ov); ov.remove(); res(v); };
      trap(ov, {onEsc: () => done(false)});
      ov.addEventListener('click', e => { if (e.target === ov && no) done(false); });
      ov.querySelector('[data-act=yes]').addEventListener('click', () => done(true));
      const n = ov.querySelector('[data-act=no]'); if (n) n.addEventListener('click', () => done(false));
      // the safe answer has the focus (a stray Enter never leaves or deletes anything)
      show(ov, no ? '[data-act=no]' : '[data-act=yes]');
    });
  };
  UI.notice = ({title, text, ok = 'OK', theme} = {}) => UI.confirm({title, text, yes: ok, no: null, theme});

  /* ---------- TOAST ---------- */
  /** a short message that fades by itself (≈2 s). near: an element to show it over (a locked level card); kind:
      'good' | 'bad' | ''; top: px from the top of the screen instead of the bottom; icon: a small picture before the text (trusted HTML: a portrait); action: {label, onClick,
      aria}: a small button after the text (the only part of a toast that takes taps; tapping it removes the toast) */
  UI.toast = function (text, {near = null, kind = '', ms = 2200, top = null, icon = '', action = null} = {}) {
    const t = el(`<div class="ui-toast ${esc(kind)}${near ? ' near' : ''}${icon || action ? ' rich' : ''}" role="status" aria-live="polite"></div>`);
    if (!icon && !action) t.textContent = text;
    else {
      t.innerHTML = (icon ? `<span class="ui-toast-icon" aria-hidden="true">${icon}</span>` : '') + `<span class="ui-toast-text">${esc(text)}</span>`;
      if (action) {
        const b = el(`<button type="button" class="ui-toast-act"${action.aria ? ` aria-label="${esc(action.aria)}"` : ''}>${esc(action.label)}</button>`);
        b.addEventListener('click', e => { t.remove(); action.onClick(e); });
        t.insertAdjacentHTML('beforeend', '<span class="ui-toast-sep" aria-hidden="true">·</span>'); t.appendChild(b);
      }
    }
    t.style.setProperty('--ui-toast-ms', ms + 'ms');
    if (top != null && !near) { t.classList.add('top'); t.style.top = Math.round(top) + 'px'; }
    if (near) near.appendChild(t); else { document.body.appendChild(t); t.style.zIndex = String(Math.max(95, topZ(t) + 1)); }   // above every open panel
    setTimeout(() => t.remove(), ms + 100);
    return t;
  };

  /* ---------- THE PAUSE BUTTON + PAUSE MENU ----------
     const pause = Arcade.UI.pause.mount({
       onPause(reason), onResume(),          the game stops / restarts its clock (reason: 'button' | 'key' | 'hidden')
       onRestart(),                          start this level again (leave out = no RESTART)
       onLevels(),                           back to the level select (the kit asks first when confirmLeave() says so)
       levelsLabel: 'Back to levels',        (Back to setup, Title screen…)
       extras: [{label, onClick, id}],       more buttons before BACK TO LEVELS (Music Highway's SONG MENU…)
       info: () => [[label, value]…],        numbers to show (score so far…)
       note: 'text',                         a line under the title
       confirmLeave: () => true,             leaving would lose progress (the default while a level runs)
       leaveTitle, leaveText, leaveYes,      that question's words ('Leave this level?', '…won't be saved.', 'Leave')
       confirmRestart: () => false,          ask before RESTART too (restartText)
       arcade: true,                         BACK TO ARCADE GAMES (every game; false = none): after BACK TO LEVELS, it asks
                                             first exactly like BACK TO LEVELS (confirmLeave), then stops the microphone
                                             (Pitch.stop) and the voices, fades the music, and opens the arcade floor's
                                             ALL GAMES view turned to this game (index.html#<game> with
                                             sessionStorage bandarcade.from = {view: 'all'}: the lobby goes underneath)
       onArcade(),                           the game's own clean-up just before it leaves (Dojo Duel's timers…)
       canPause: () => true,                 can it pause right now (not during a results moment…)
       pauseOnBlur: false,                   also pause when the window loses focus for 0.6 s (Music Highway)
       place: element,                       draw the button inside this element instead of the top-left corner
       theme: 'class' })
     pause.setActive(true)   when a level/round/match starts (the button shows, "← Arcade" hides, Esc/P pause)
     pause.setActive(false)  on every menu (level select, results)
     pause.pause() / resume() / paused / active
     While paused the microphone stops listening (Arcade.Pitch.pauseListening) and comes back on RESUME, where only a
     new note counts. */
  let P = null;          // the one pause controller of this page
  const PAUSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>';
  function mountPause(o = {}) {
    if (P) { Object.assign(P.o, o); return P.api; }
    const opt = Object.assign({levelsLabel: 'Back to levels', restartLabel: 'Restart', extras: [], confirmLeave: () => true, canPause: () => true, arcade: true}, o);
    const btn = el(`<button type="button" class="ui-pause-btn${opt.place ? ' ui-inline' : ''} ${esc(opt.theme || '')}" id="uiPauseBtn" aria-label="Pause" hidden>${PAUSE_SVG}<span class="ui-pb-t">Pause</span></button>`);
    (opt.place || document.body).appendChild(btn);
    const ov = el(`<div class="overlay ui-ov ui-pause ${esc(opt.theme || '')}" id="uiPause" hidden><div class="panel ui-panel" role="dialog" aria-modal="true" aria-labelledby="uiPauseT">
      <h2 class="ui-title" id="uiPauseT">Paused</h2><p class="ui-pnote"></p><div class="ui-tiles ui-pinfo"></div><div class="ui-menu"></div></div></div>`);
    document.body.appendChild(ov);
    const S = {o: opt, active: false, paused: false, micWas: null, blurT: 0};
    function micOff() {
      const Pi = A.Pitch;
      if (!Pi || !Pi.pauseListening) return;
      S.micWas = !!Pi.paused; Pi.pauseListening(true);
      if (A.Sfx && A.Sfx.sync) A.Sfx.sync();
    }
    function micBack() {
      const Pi = A.Pitch;
      if (!Pi || !Pi.pauseListening || S.micWas === null) return;
      Pi.pauseListening(S.micWas); S.micWas = null;          // un-pausing starts fresh: only a new note counts
      if (A.Sfx && A.Sfx.sync) A.Sfx.sync();
    }
    function place() {
      if (opt.place) return;
      // line up with where "← Arcade" is on this page (the top bar), else the top-left corner
      const b = document.querySelector('#topbar .brand'), r = b && b.getClientRects().length ? b.getBoundingClientRect() : null;
      if (r && r.top >= 0 && r.top < 120 && r.left < innerWidth / 2) { btn.style.setProperty('--ui-pause-x', r.left + 'px'); btn.style.setProperty('--ui-pause-y', r.top + 'px'); }
      else { btn.style.removeProperty('--ui-pause-x'); btn.style.removeProperty('--ui-pause-y'); }
    }
    function drawMenu() {
      const o = S.o, m = ov.querySelector('.ui-menu');
      ov.querySelector('.ui-pnote').textContent = o.note || '';
      ov.querySelector('.ui-pnote').hidden = !o.note;
      const info = o.info ? o.info() || [] : [];
      const pi = ov.querySelector('.ui-pinfo');
      pi.innerHTML = info.map(([k, v]) => `<div class="ui-tile"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('');
      pi.hidden = !info.length;
      const items = [['resume', 'Resume', 'btn-primary']];
      if (o.onRestart) items.push(['restart', o.restartLabel, 'btn-secondary']);
      items.push(['settings', 'Settings', 'btn-secondary']);
      (o.extras || []).forEach((x, i) => items.push(['x' + i, x.label, 'btn-secondary', x.id]));
      if (o.onLevels) items.push(['levels', o.levelsLabel, 'btn-danger']);
      if (o.arcade !== false) items.push(['arcade', 'Back to Arcade Games', 'btn-secondary', 'uiPauseArcade']);
      m.innerHTML = items.map(([a, t, c, id]) => `<button type="button" class="btn ${c}" data-act="${a}"${id ? ` id="${esc(id)}"` : ''}>${esc(t)}</button>`).join('');
    }
    ov.querySelector('.ui-menu').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const a = b.dataset.act, o = S.o;
      if (a === 'resume') return api.resume();
      if (a === 'settings') return UI.settings.open({onClose: () => { const r = ov.querySelector('[data-act=settings]'); if (r && !ov.hidden) r.focus(); }});
      if (a === 'restart') {
        const go = () => { closeMenu(); S.paused = false; micBack(); if (o.onRestart) o.onRestart(); };
        if (!o.confirmRestart || !o.confirmRestart()) return go();
        return UI.confirm({title: 'Start over?', text: esc(o.restartText || 'Your progress in this level won’t be saved.'), yes: 'Start over', no: 'Keep playing', danger: true, theme: o.theme})
          .then(y => { if (y) go(); });
      }
      if (a === 'levels') {
        const go = () => { closeMenu(); S.paused = false; micBack(); api.setActive(false); o.onLevels && o.onLevels(); };
        if (!o.confirmLeave || !o.confirmLeave()) return go();
        return UI.confirm({title: o.leaveTitle || 'Leave this level?', text: esc(o.leaveText || 'Your progress in this level won’t be saved.'),
          yes: o.leaveYes || 'Leave', no: 'Keep playing', danger: true, theme: o.theme}).then(y => { if (y) go(); });
      }
      if (a === 'arcade') {
        const go = () => { closeMenu(); S.micWas = null; if (o.onArcade) o.onArcade(); toArcade(); };
        if (!o.confirmLeave || !o.confirmLeave()) return go();
        return UI.confirm({title: o.leaveTitle || 'Leave this level?', text: esc(o.leaveText || 'Your progress in this level won’t be saved.'),
          yes: o.leaveYes || 'Leave', no: 'Keep playing', danger: true, theme: o.theme}).then(y => { if (y) go(); });
      }
      if (a[0] === 'x') { const x = (o.extras || [])[+a.slice(1)]; if (x && x.onClick) { closeMenu(); S.paused = false; micBack(); x.onClick(); } }
    });
    trap(ov, {onEsc: () => api.resume()});
    function closeMenu() { hide(ov, {restore: false}); }
    /* BACK TO ARCADE GAMES: the floor's ALL GAMES view, this game in front (arcade.js reads bandarcade.from the same
       way as after "← Arcade"); the microphone off and every voice hushed first, the music fades as the page changes */
    function toArcade() {
      const Pi = A.Pitch;
      if (Pi && Pi.stop) Pi.stop(); else if (Pi && Pi.pauseListening) Pi.pauseListening(true);
      try { sessionStorage.setItem('bandarcade.from', JSON.stringify({view: 'all'})); } catch (e) { /* private mode */ }
      const href = A.homeLink ? A.homeLink(A.pageGame || 'all-games') : '../index.html#all-games';
      const Sf = A.Sfx;
      if (Sf && Sf.hush) Sf.hush();
      if (Sf && Sf.sync) Sf.sync();
      if (Sf && Sf.playThenGo) Sf.playThenGo('ui-back', href); else location.href = href;
    }
    btn.addEventListener('click', () => api.pause('button'));
    const api = {
      el: btn, menu: ov,
      get paused() { return S.paused; },
      get active() { return S.active; },
      set(o2) { Object.assign(S.o, o2); if (!ov.hidden) drawMenu(); },
      setActive(on) {
        S.active = !!on;
        btn.hidden = !on;
        document.documentElement.classList.toggle('ui-in-level', !!on && !opt.place);
        if (on) { place(); requestAnimationFrame(place); }        // again once the game's play layout has settled
        else if (!ov.hidden) { closeMenu(); S.paused = false; micBack(); }
      },
      pause(reason = 'button') {
        if (!S.active || S.paused) return false;
        if (S.o.canPause && !S.o.canPause(reason)) return false;
        S.paused = true;
        micOff();
        if (S.o.onPause) S.o.onPause(reason);
        drawMenu();
        show(ov, '[data-act=resume]');
        return true;
      },
      resume() {
        if (!S.paused) return false;
        closeMenu(); S.paused = false;
        micBack();
        if (A.Pitch && A.Pitch.ignoreCurrent) A.Pitch.ignoreCurrent();
        if (S.o.onResume) S.o.onResume();
        if (visible(btn)) btn.focus({preventScroll: true});
        return true;
      },
      open: () => !ov.hidden,
    };
    // the tab hidden (another app, the home button, a locked iPad): pause
    document.addEventListener('visibilitychange', () => { if (document.hidden) api.pause('hidden'); });
    addEventListener('pagehide', () => api.pause('hidden'));
    addEventListener('blur', () => {
      if (!S.o.pauseOnBlur) return;
      clearTimeout(S.blurT); S.blurT = setTimeout(() => { if (!document.hasFocus()) api.pause('hidden'); }, 600);
    });
    addEventListener('focus', () => clearTimeout(S.blurT));
    // Esc or P: pause (Esc in the menu = resume: the menu handles it)
    addEventListener('keydown', e => {
      if (!S.active || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (open.size && !(S.paused && open.size === 1 && !ov.hidden)) return;   // another panel is on top
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (S.paused) api.resume(); else api.pause('key');
      }
    });
    addEventListener('resize', () => { if (S.active) place(); });
    P = {o: S.o, api};
    return api;
  }
  UI.pause = {mount: mountPause, get: () => P && P.api};

  /* ---------- THE RESULTS SCREEN ----------
     Arcade.UI.results.show({
       gameId, theme: 'class', wide: false,
       hero: 'html',                     a picture above the stars (the rival bowing, the treasure, the Sensei…)
       stars: 0–3 | null,                null = no stars (a two-player match, Endless)
       kicker, title, msg, msgHTML,      the big title line and one sentence under it (msgHTML: already-safe HTML)
       tiles: [[label, value]…],         2–4 stat tiles
       best: 'Best: 1135', newBest: true, the best line, and the NEW BEST! ribbon
       extra: 'html' | element,          the game's own part (trouble spot, missed notes, Top 5…)
       next:   {label, onClick, hidden}, NEXT LEVEL (hidden when there is none / not earned)
       retry:  {label, onClick},         TRY AGAIN
       levels: {label, onClick},         LEVELS (back to the level select)
       more: [{label, onClick, id}],     any other buttons (after these); any button may add `act` (data-act) and
                                         `primary: true` (it becomes the yellow one instead)
       actsFirst: false,                 true = the buttons come right after the tiles / best line, ABOVE the extra
                                         part (a long report reads as optional detail under them: Sustain Speedway)
       idPrefix,                          (render only) no ids on the buttons, so two copies can share a page
       announce: true | {members, member} | false,   the UNLOCKED! card + the avatar (shared/skins.js)
       onShow(panel) })                  wire the extra part
     Showing it marks the game (gameId, else the page's) FINISHED today (store.noteFinished: Today's Practice).
     The first shown of NEXT / TRY AGAIN is the yellow button and has the focus. UI.results.render(el, {…}) = the same
     screen inside an element (Dojo Duel: one per player, each facing its player). */
  let RES = null;
  function resultsHTML(o) {
    const n = o.stars == null ? null : Math.max(0, Math.min(3, o.stars));
    const tiles = (o.tiles || []).filter(Boolean);
    return `<div class="ui-res-hero">${o.hero || ''}</div>` +
      (n == null ? '' : `<div class="ui-stars" id="resStars" role="img" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('')}</div>`) +
      (o.kicker ? `<p class="ui-kicker">${esc(o.kicker)}</p>` : '') +
      `<h2 class="ui-title ui-res-title" id="resTitle">${esc(o.title || '')}</h2>` +
      `<p class="ui-res-msg" id="resMsg">${o.msgHTML || esc(o.msg || '')}</p>` +
      (o.newBest ? `<p class="ui-newbest">${esc(o.newBestText || 'New best!')}</p>` : '') +
      (tiles.length ? `<div class="ui-tiles">${tiles.map(([k, v, id]) => `<div class="ui-tile"><small>${esc(k)}</small><b${id ? ` id="${esc(id)}"` : ''}>${esc(v)}</b></div>`).join('')}</div>` : '') +
      `<p class="ui-res-best" id="resBest">${esc(o.best || '')}</p>` +
      (o.actsFirst ? `<div class="acts ui-res-acts ui-res-first"></div><div class="ui-res-extra"></div>`
        : `<div class="ui-res-extra"></div><div class="acts ui-res-acts"></div>`);
  }
  function fillResults(panel, o) {
    panel.innerHTML = resultsHTML(o);
    const ex = panel.querySelector('.ui-res-extra');
    if (o.extra && typeof o.extra === 'object') ex.appendChild(o.extra); else if (o.extra) ex.innerHTML = o.extra;
    const acts = panel.querySelector('.ui-res-acts');
    const btns = [];
    const add = (b, id, def) => {
      if (!b || b.hidden) return;
      const x = el(`<button type="button" class="btn" ${id ? `id="${id}"` : ''}>${esc(b.label || def)}</button>`);
      if (b.id) x.id = b.id;
      if (b.act) x.dataset.act = b.act;
      x.addEventListener('click', e => { if (b.onClick) b.onClick(e); });
      acts.appendChild(x); btns.push([x, b]);
    };
    const pre = o.idPrefix || '';
    add(o.next, pre ? '' : 'resNext', 'Next level');
    add(o.retry, pre ? '' : 'resRetry', 'Try again');
    add(o.levels, pre ? '' : 'resLevels', 'Levels');
    (o.more || []).forEach(m => add(m, '', ''));
    btns.forEach(([x, b], i) => x.classList.add(b.primary || (i === 0 && !btns.some(([, bb]) => bb.primary)) ? 'btn-primary' : 'btn-secondary'));
    const stars = panel.querySelector('.ui-stars'), rib = panel.querySelector('.ui-newbest');
    if (!A.reducedMotion || !A.reducedMotion.matches) { if (stars) { stars.classList.remove('go'); void stars.offsetWidth; stars.classList.add('go'); } if (rib) rib.classList.add('go'); }
    return btns.length ? btns.find(([, b]) => b.primary) ? btns.find(([, b]) => b.primary)[0] : btns[0][0] : null;
  }
  UI.results = {
    get el() { return RES; },
    show(o = {}) {
      if (!RES) {
        RES = el('<div class="overlay ui-ov ui-results" id="results" hidden><div class="panel ui-panel" role="dialog" aria-modal="true" aria-labelledby="resTitle"></div></div>');
        document.body.appendChild(RES);
        trap(RES, {});
      }
      RES.className = `overlay ui-ov ui-results${o.wide ? ' ui-wide' : ''}${o.actsFirst ? ' ui-acts-first' : ''} ${o.theme || ''}`;
      if (o.gameId) RES.dataset.game = o.gameId;
      // a round played to its end: today's activity log `f` (Today's Practice checks its step off: shared/practice.js)
      if (A.store && A.store.noteFinished) A.store.noteFinished(o.gameId || A.pageGame);
      const panel = RES.querySelector('.panel');
      const first = fillResults(panel, o);
      // "+3 ★ = 15 tokens at the Prize Counter" (shared/tokens.js): text only, when this result earned new stars
      const tl = A.Tokens && A.Tokens.resultLine ? A.Tokens.resultLine() : '';
      if (tl) { const b = panel.querySelector('.ui-res-best'); b.insertAdjacentHTML('afterend', `<p class="ui-res-tokens" id="resTokens">${A.Tokens.iconHTML()}${esc(tl)}</p>`); }
      if (P && P.api) P.api.setActive(false);
      RES.hidden = false; open.add(RES); syncBody();
      RES.scrollTop = 0;
      if (o.announce !== false && A.Skins && A.Skins.announce) A.Skins.announce(panel, o.announce && typeof o.announce === 'object' ? o.announce : undefined);
      if (o.onShow) o.onShow(panel);
      if (first && o.focus !== false) first.focus({preventScroll: true});
      return panel;
    },
    hide() { if (RES && !RES.hidden) { RES.hidden = true; open.delete(RES); syncBody(); } },
    get shown() { return !!RES && !RES.hidden; },
    /** the same results screen inside an element (no overlay) */
    render(host, o = {}) {
      host.innerHTML = '<div class="ui-panel ui-res-inline"></div>';
      const panel = host.firstElementChild;
      const first = fillResults(panel, Object.assign({idPrefix: 'x'}, o));
      if (o.onShow) o.onShow(panel);
      return {panel, first};
    },
  };

  /* ---------- LEVEL INTRO ----------
     Arcade.UI.intro.show({theme, hero, kicker, title, text: 'html', extra: 'html', go: {label, onClick}, back: {label, onClick}})
     go = the yellow button (and the focus); back = the level select. */
  let INTRO = null;
  UI.intro = {
    show(o = {}) {
      if (!INTRO) {
        INTRO = el('<div class="overlay ui-ov ui-intro" id="intro" hidden><div class="panel ui-panel" role="dialog" aria-modal="true" aria-labelledby="introTitle"></div></div>');
        document.body.appendChild(INTRO);
        trap(INTRO, {onEsc: () => { const b = INTRO._back; if (b) { UI.intro.hide(); if (b.onClick) b.onClick(); } }});
      }
      INTRO.className = `overlay ui-ov ui-intro ${o.theme || ''}`;
      INTRO._back = o.back || null;
      const p = INTRO.querySelector('.panel');
      p.innerHTML = `<div class="ui-intro-hero">${o.hero || ''}</div>` + (o.kicker ? `<p class="ui-kicker" id="introKicker">${esc(o.kicker)}</p>` : '') +
        `<h2 class="ui-title" id="introTitle">${esc(o.title || '')}</h2>` + (o.text ? `<p class="ui-intro-text" id="introText">${o.text}</p>` : '') +
        `<div class="ui-intro-extra">${o.extra || ''}</div>` +
        `<div class="acts"><button type="button" class="btn btn-primary" id="introGo" data-act="go">${esc((o.go && o.go.label) || 'Start')}</button>` +
        (o.back ? `<button type="button" class="btn btn-secondary" id="introBack">${esc(o.back.label || 'Levels')}</button>` : '') + '</div>';
      p.querySelector('#introGo').addEventListener('click', () => { UI.intro.hide(); if (o.go && o.go.onClick) o.go.onClick(); });
      if (o.back) p.querySelector('#introBack').addEventListener('click', () => { UI.intro.hide(); if (o.back.onClick) o.back.onClick(); });
      if (o.onShow) o.onShow(p);
      show(INTRO, '#introGo');
      return p;
    },
    hide() { if (INTRO) hide(INTRO, {restore: false}); },
    get el() { return INTRO; },
  };

  /* ---------- THE SETTINGS PANEL ----------
     Opened by the top bar's settings button (Arcade.Sfx.mountControls), the pause menu's SETTINGS and the lobby.
     Every row is a setting saved on the device and shared by every game: Sound on/off, Music, Effects (and on the
     lobby the arcade's ambience), Motion (animations on/off), Mic sensitivity with the live level meter. A game adds its
     own options with Arcade.UI.settings.register(fn): fn(box) fills a box at the bottom ("This game"). */
  const extrasFns = [];
  let SET = null;
  UI.settings = {
    register(fn, {title = 'This game', lobby = false} = {}) { extrasFns.push({fn, title, lobby}); },
    get open() { return !!SET; },
    open(o = {}) {
      if (SET) return;
      const st = A.store || {};
      const lobby = o.lobby || extrasFns.some(x => x.lobby);
      // the microphone rows: on pages that can listen (pitch.js) and on the lobby (the setting is shared by every game)
      const mic = !!A.Pitch || lobby;
      const ov = el(`<div class="overlay ui-ov ui-settings-ov ui-settings ${esc(o.theme || '')}" id="uiSettings" hidden><div class="panel ui-panel" role="dialog" aria-modal="true" aria-labelledby="uiSetT">
        <h2 class="ui-title" id="uiSetT">Settings</h2>
        <div class="ui-srow"><span class="ui-sname" id="uiSndL">Sound</span><span></span><button type="button" class="ui-switch" role="switch" data-k="sfx" aria-labelledby="uiSndL"></button></div>
        <label class="ui-srow"><span class="ui-sname">Music</span><input type="range" min="0" max="100" step="5" data-k="musVol"><output></output></label>
        <label class="ui-srow"><span class="ui-sname">Effects</span><input type="range" min="0" max="100" step="5" data-k="sfxVol"><output></output></label>
        ${lobby ? '<label class="ui-srow"><span class="ui-sname">Arcade sounds<small>the hum on the arcade floor</small></span><input type="range" min="0" max="100" step="5" data-k="ambVol"><output></output></label>' : ''}
        <div class="ui-srow"><p class="ui-snote" data-note="sound"></p></div>
        <div class="ui-srow"><span class="ui-sname" id="uiMotL">Motion<small>moving backgrounds and animations</small></span><span></span><button type="button" class="ui-switch" role="switch" data-k="motion" aria-labelledby="uiMotL"></button><p class="ui-snote" data-note="motion"></p></div>
        ${A.Seasons && A.Seasons.setLookOn ? '<div class="ui-srow"><span class="ui-sname" id="uiSeaL">Seasonal look<small>the arcade\'s menus dress up for the seasons</small></span><span></span><button type="button" class="ui-switch" role="switch" data-k="season" aria-labelledby="uiSeaL"></button></div>' : ''}
        ${mic ? `<label class="ui-srow"><span class="ui-sname">Mic sensitivity<small>more = hears quieter notes</small></span><input type="range" min="0" max="100" step="1" data-k="sens"><output></output></label>
        <div class="ui-srow ui-mrow"><span class="ui-sname">Mic level</span><div class="ui-meter" aria-hidden="true"><i></i><em></em></div><span></span><p class="ui-snote" data-note="mic"></p></div>` : ''}
        <div class="ui-sextras"></div>
        <div class="acts"><button type="button" class="btn btn-primary" data-act="done">Done</button></div></div></div>`);
      document.body.appendChild(ov);
      SET = ov;
      const Sfx = A.Sfx, Pi = A.Pitch;
      const vol = k => (st[k] != null ? st[k] : .5);
      function draw() {
        const on = st.sfx !== false;
        const sw = ov.querySelector('[data-k=sfx]'); sw.setAttribute('aria-checked', on); sw.title = on ? 'Sound on' : 'Sound off';
        ov.querySelectorAll('input[data-k$=Vol]').forEach(r => { r.value = Math.round(vol(r.dataset.k) * 100); r.nextElementSibling.textContent = r.value + '%'; r.disabled = !on; });
        ov.querySelector('[data-note=sound]').textContent = Sfx && Sfx.loopNote ? Sfx.loopNote() : '';
        const mo = ov.querySelector('[data-k=motion]'), d = st.gameData ? st.gameData('bg') : {};
        const sys = matchMedia('(prefers-reduced-motion: reduce)').matches;
        mo.setAttribute('aria-checked', d.motion !== false && !sys);
        mo.disabled = sys;
        ov.querySelector('[data-note=motion]').textContent = sys ? 'Your device asks for less motion, so things stay still.'
          : d.slow ? 'The moving backgrounds were switched off because this device was slow. Switch Motion off and on to try again.' : '';
        const se = ov.querySelector('[data-k=season]'); if (se) se.setAttribute('aria-checked', A.Seasons.lookOn());
        const s = ov.querySelector('input[data-k=sens]'); if (s) { s.value = st.sens != null ? st.sens : 50; s.nextElementSibling.textContent = s.value; }
      }
      ov.querySelector('[data-k=sfx]').addEventListener('click', () => {
        if (st.setSfx) st.setSfx(!(st.sfx !== false));
        if (Sfx && Sfx.settingsChanged) Sfx.settingsChanged('sfx');
        draw();
      });
      ov.querySelectorAll('input[data-k$=Vol]').forEach(r => {
        r.addEventListener('input', () => { if (st.setVolume) st.setVolume(r.dataset.k, r.value / 100); r.nextElementSibling.textContent = r.value + '%'; if (Sfx && Sfx.settingsChanged) Sfx.settingsChanged(r.dataset.k); });
        r.addEventListener('change', () => { if (Sfx && Sfx.settingsChanged) Sfx.settingsChanged(r.dataset.k, true); });
      });
      ov.querySelector('[data-k=motion]').addEventListener('click', () => {
        const d = st.gameData ? st.gameData('bg') : {};
        const now = !(d.motion !== false);
        UI.setMotion(now);
        draw();
      });
      const sea = ov.querySelector('[data-k=season]');
      if (sea) sea.addEventListener('click', () => { A.Seasons.setLookOn(!A.Seasons.lookOn()); if (Sfx && Sfx.event) Sfx.event('ui-toggle'); draw(); });
      const sens = ov.querySelector('input[data-k=sens]');
      if (sens) sens.addEventListener('input', () => {
        const v = +sens.value; sens.nextElementSibling.textContent = v;
        if (st.setSens) st.setSens(v);
        if (Pi && Pi.setSensitivity) Pi.setSensitivity(v);
      });
      // the live meter: while a microphone is open on this page (it reads the level even while a game is paused)
      const bar = ov.querySelector('.ui-meter i'), gate = ov.querySelector('.ui-meter em');
      const live = mic && Pi && (Pi.active || Pi.demoReady) && Pi.levelPct;
      if (mic) {
        ov.querySelector('[data-note=mic]').textContent = live ? 'Play a note: the bar turns green when the game can hear it.'
          : Pi ? 'The meter moves once the microphone is on (start a level).' : 'The meter moves in games that listen to your instrument.';
        ov.querySelector('.ui-meter').hidden = !live;
      }
      let raf = 0;
      if (live) {
        const tick = () => {
          const lv = Pi.meterLevel ? Pi.meterLevel() : Pi.level || 0;
          bar.style.width = Pi.levelPct(lv) + '%';
          bar.classList.toggle('over', lv > Pi.gate);
          gate.style.left = Pi.levelPct(Pi.gate) + '%';
          raf = requestAnimationFrame(tick);
        };
        tick();
      }
      // the game's own options (and the lobby's backup / install)
      const xs = ov.querySelector('.ui-sextras');
      extrasFns.concat(o.extras ? [{fn: o.extras, title: o.extrasTitle || 'This game'}] : []).forEach(x => {
        const g = el(`<div class="ui-sgroup"><h3 class="ui-section">${esc(x.title)}</h3><div class="ui-sextra"></div></div>`);
        xs.appendChild(g);
        x.fn(g.querySelector('.ui-sextra'), {close: () => close()});
      });
      function close() {
        cancelAnimationFrame(raf);
        hide(ov); ov.remove(); SET = null;
        if (A.Sfx && A.Sfx.refreshControls) A.Sfx.refreshControls();
        if (o.onClose) o.onClose();
      }
      trap(ov, {onEsc: close});
      ov.addEventListener('click', e => { if (e.target === ov) close(); });
      ov.querySelector('[data-act=done]').addEventListener('click', close);
      draw();
      show(ov, '[data-k=sfx]');
    },
    close() { if (SET) SET.querySelector('[data-act=done]').click(); },
  };

  /** MOTION on/off (the Settings panel): saved with the moving-backgrounds setting (gameData('bg').motion), so one switch
      stills the backgrounds, the avatars and every animation (html.no-motion, ui-kit.css) */
  UI.setMotion = function (on) {
    if (A.Bg && A.Bg.setMotion) A.Bg.setMotion(on);
    else if (A.store && A.store.gameData) { const d = A.store.gameData('bg'); d.motion = !!on; if (on) d.slow = false; A.store.saveGameData('bg'); }
    if (A.reducedMotion && A.reducedMotion.refresh) A.reducedMotion.refresh();
  };

  UI.state = () => ({
    pause: P ? {active: P.api.active, paused: P.api.paused, open: P.api.open(), button: visible(P.api.el)} : null,
    results: !!RES && !RES.hidden, intro: !!INTRO && !INTRO.hidden, settings: !!SET, modals: open.size,
  });
})(window.Arcade);
