/* ARCADE QUEST ENGINE: THE ON-SCREEN CONTROLS' VIEW (touch screens): no zooming, and ARRANGE CONTROLS.
   NO ZOOM (iPad Safari): the viewport can't be scaled (index.html: maximum-scale=1), the stage and the pad take no
   browser gestures (touch-action: none; the pad's touchstart/touchend are cancelled), every other button is
   touch-action: manipulation (no double-tap zoom) and Safari's pinch gestures (gesturestart/gesturechange) and
   dblclick are blocked on this page. RECOVERY: if the page is zoomed anyway (visualViewport.scale > 1.05) a small
   RESET VIEW button shows (sized and placed for the zoomed view); it re-sets the viewport meta (user-scalable=no for
   a moment, then back), scrolls to 0,0 and lays the game out again. Checked on every visual-viewport change and
   whenever the game comes back into focus. Q.view.check(scale?) / reset() / state() (tests).
   ARRANGE CONTROLS (Arcade Quest's SETTINGS → "Arrange controls", touch screens only): an edit mode over the game
   where the student drags the D-pad and the A/B cluster anywhere (kept fully on screen), a size slider for each
   (75–150 %), an opacity slider (20–100 %), RESET TO DEFAULT and DONE. Saved per device and per orientation in
   gameData('arcade-quest').controls = {portrait | landscape: {dpad: {x, y, s}, ab: {x, y, s}, op}} (x, y = the
   cluster's center as a share of the window; s = size; op = opacity). The page layout never changes (the game keeps
   its size): an arranged cluster is only moved and scaled with a transform from its normal place (.q-wrap.pad-free).
   THE CONTROLS NEVER BLOCK A MENU OR THE TEXT: whenever a menu (the battle's PLAY · LISTEN · ITEM · HARMONIZE, any
   Q.menu), a text box, a challenge's buttons or the ☰ MENU button show,
   a cluster that would overlap it is nudged clear (the nearest free spot above, below or beside it); it goes back to
   its saved spot when that's gone. Keyboard play is unchanged. Q.arrange.open() / close() / state() (tests). */
(function (A) {
  "use strict";
  const Q = A.Quest, GAME = 'arcade-quest';
  const vv = window.visualViewport;

  /* ---------- NO ZOOM ---------- */
  const META = document.querySelector('meta[name="viewport"]');
  const BASE = META ? META.getAttribute('content') : 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), {passive: false}));
  document.addEventListener('dblclick', e => e.preventDefault(), {passive: false});

  let resetBtn = null, fakeScale = null;
  const scaleNow = () => (fakeScale != null ? fakeScale : vv ? vv.scale : 1);
  function check(scale) {
    if (scale !== undefined) fakeScale = scale;                   // tests: pretend the page is zoomed this much
    const s = scaleNow(), zoomed = s > 1.05;
    if (!zoomed) { if (resetBtn) resetBtn.hidden = true; return false; }
    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.type = 'button'; resetBtn.className = 'q-resetview'; resetBtn.textContent = 'Reset view';
      resetBtn.addEventListener('click', reset);
      document.body.appendChild(resetBtn);
    }
    resetBtn.hidden = false;
    // keep it the same size and at the top of what the student sees, however far in they are zoomed
    const ox = vv && fakeScale == null ? vv.pageLeft : scrollX, oy = vv && fakeScale == null ? vv.pageTop : scrollY, w = vv && fakeScale == null ? vv.width : innerWidth;
    resetBtn.style.left = (ox + w / 2) + 'px'; resetBtn.style.top = (oy + 8 / s) + 'px';
    resetBtn.style.transform = `translateX(-50%) scale(${1 / s})`;
    return true;
  }
  let resets = 0;
  function reset() {
    resets++;
    if (META) META.setAttribute('content', BASE + ', user-scalable=no');    // Safari zooms back out to the scale allowed
    scrollTo(0, 0);
    setTimeout(() => {
      if (META) META.setAttribute('content', BASE);
      scrollTo(0, 0); fakeScale = null;
      if (Q.layout) Q.layout();
      check();
    }, 350);
  }
  if (vv) { vv.addEventListener('resize', () => check()); vv.addEventListener('scroll', () => check()); }
  addEventListener('focus', () => check());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  Q.view = {check, reset, state: () => ({zoomed: !!resetBtn && !resetBtn.hidden, meta: META && META.getAttribute('content'), resets})};

  /* ---------- ARRANGE CONTROLS ---------- */
  const SIZE = [0.75, 1.5], OPAC = [0.2, 1], GAP = 6, EDGE = 4;
  const data = () => A.store.gameData(GAME);
  const orient = () => (innerWidth > innerHeight ? 'landscape' : 'portrait');
  const saved = () => (data().controls || {})[orient()] || null;
  function save(L) { const d = data(); d.controls = Object.assign({}, d.controls, {[orient()]: L}); A.store.saveGameData(GAME); }
  function forget() { const d = data(); if (d.controls) { delete d.controls[orient()]; A.store.saveGameData(GAME); } }
  const $ = id => document.getElementById(id);
  const wrap = () => document.querySelector('.q-wrap');
  const cluster = k => { const p = $('pad'); return p && p.querySelector(k === 'dpad' ? '.dpad' : '.abpad'); };
  let E = null;                                                  // the edit mode: {L, drag, el}

  /** a cluster's box in the normal layout (without its transform) */
  const natural = c => { const t = c.style.transform; c.style.transform = ''; const r = c.getBoundingClientRect(); c.style.transform = t; return r; };
  /** where the clusters stand in the normal layout (their centers as shares of the window), for a first arrangement */
  function defaults() {
    const at = k => { const r = natural(cluster(k)); return {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: 1}; };
    return {dpad: at('dpad'), ab: at('ab'), op: 1};
  }
  function clear() { ['dpad', 'ab'].forEach(k => { const c = cluster(k); if (c) c.style.transform = ''; }); const p = $('pad'); if (p) p.style.opacity = ''; }
  /** the menus and the text the controls must never cover (only the ones on screen) */
  function obstacles() {
    const ui = $('ui'); if (!ui) return [];
    // (+ the ☰ MENU button, which sits beside #ui in the game screen's corner: engine/world.js)
    return [...ui.querySelectorAll('.q-menu, .q-textbox, .q-chal button'), ...document.querySelectorAll('#qMenuSlot .ui-pause-btn')].filter(el => el.offsetParent !== null && !el.hidden && !el.closest('[hidden]'))
      .map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
  }
  const hits = (a, b) => a.left < b.right + GAP && a.right > b.left - GAP && a.top < b.bottom + GAP && a.bottom > b.top - GAP;
  const box = (left, top, w, h) => ({left, top, width: w, height: h, right: left + w, bottom: top + h});
  /** a cluster's box: its saved center and size, fully on screen, then clear of every menu and text box */
  function placeBox(c, p, avoid, r0) {
    const W = innerWidth, H = innerHeight, w = r0.width * p.s, h = r0.height * p.s;
    const clampX = x => Math.max(EDGE, Math.min(W - w - EDGE, x)), clampY = y => Math.max(EDGE, Math.min(H - h - EDGE, y));
    let r = box(clampX(p.x * W - w / 2), clampY(p.y * H - h / 2), w, h);
    if (!avoid) return r;
    const obs = obstacles(), free = b => !obs.some(o => hits(b, o)) && b.left >= EDGE - .5 && b.top >= EDGE - .5 && b.right <= W - EDGE + .5 && b.bottom <= H - EDGE + .5;
    if (free(r)) return r;
    // the nearest spot clear of everything: just above, below, left or right of each thing it would cover
    const tries = [];
    obs.forEach(o => {
      tries.push(box(r.left, o.top - GAP - h, w, h), box(r.left, o.bottom + GAP, w, h), box(o.left - GAP - w, r.top, w, h), box(o.right + GAP, r.top, w, h));
    });
    const ok = tries.map(b => box(clampX(b.left), clampY(b.top), w, h)).filter(free)
      .sort((a, b) => Math.hypot(a.left - r.left, a.top - r.top) - Math.hypot(b.left - r.left, b.top - r.top));
    return ok[0] || r;
  }
  /** lay the pad out: the saved arrangement for this orientation (or the edit mode's), else the normal layout */
  function apply() {
    const w = wrap(), p = $('pad');
    if (!w || !p || p.hidden) return;
    const L = E ? E.L : saved();
    if (!L) { if (w.classList.contains('pad-free')) { w.classList.remove('pad-free'); clear(); } return; }
    w.classList.add('pad-free');
    p.style.opacity = Math.max(OPAC[0], Math.min(OPAC[1], L.op || 1));
    ['dpad', 'ab'].forEach(k => {
      const c = cluster(k), r0 = natural(c), r = placeBox(c, L[k], !E, r0);
      c.style.transform = `translate(${Math.round(r.left - r0.left)}px, ${Math.round(r.top - r0.top)}px) scale(${L[k].s})`;
    });
  }
  let queued = false;
  const soon = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
  // (a resize or a turn of the device: engine/core.js layout() calls apply() once the page is laid out again)
  // menus and text boxes come and go: nudge the controls clear of them (and back)
  function watch() {
    const ui = $('ui'); if (!ui || watch.on) return;
    watch.on = true;
    new MutationObserver(soon).observe(ui.parentNode || ui, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']});   // #stage: #ui and the ☰ MENU button
  }

  /* the edit mode */
  function open() {
    const p = $('pad');
    if (!Q.input.touch || !p || p.hidden || E) return;
    const L = JSON.parse(JSON.stringify(saved() || defaults()));
    const el = document.createElement('div');
    el.className = 'q-arrange'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Arrange controls');
    const pct = v => Math.round(v * 100);
    el.innerHTML = `<div class="q-arr-panel"><h2>Arrange controls</h2><p class="q-small">Drag the D-pad and the A/B buttons where your thumbs like them.</p>` +
      `<label>D-pad size <input type="range" data-k="dpad" min="${pct(SIZE[0])}" max="${pct(SIZE[1])}" step="5" value="${pct(L.dpad.s)}"><output></output></label>` +
      `<label>A/B size <input type="range" data-k="ab" min="${pct(SIZE[0])}" max="${pct(SIZE[1])}" step="5" value="${pct(L.ab.s)}"><output></output></label>` +
      `<label>Opacity <input type="range" data-k="op" min="${pct(OPAC[0])}" max="${pct(OPAC[1])}" step="5" value="${pct(L.op || 1)}"><output></output></label>` +
      `<div class="q-arr-acts"><button type="button" class="btn btn-secondary btn-small" data-act="reset">Reset to default</button>` +
      `<button type="button" class="btn btn-primary btn-small" data-act="done">Done</button></div></div>`;
    document.body.appendChild(el);
    E = {L, el, drag: null, orient: orient()};
    Q.input.arranging = true; Q.input.clear();
    document.body.classList.add('q-arranging');
    const outs = () => el.querySelectorAll('input').forEach(i => { i.nextElementSibling.textContent = i.value + '%'; });
    el.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
      const v = +i.value / 100;
      if (i.dataset.k === 'op') E.L.op = v; else E.L[i.dataset.k].s = v;
      outs(); apply(); save(E.L);
    }));
    outs();
    el.querySelector('[data-act=reset]').addEventListener('click', () => {
      forget(); E.L = defaults();
      el.querySelectorAll('input').forEach(i => { i.value = i.dataset.k === 'op' ? 100 : 100; });
      outs(); apply();
      E.reset = true;
    });
    el.querySelector('[data-act=done]').addEventListener('click', close);
    // dragging a cluster (the whole cluster moves; its buttons press nothing while arranging)
    ['dpad', 'ab'].forEach(k => {
      const c = cluster(k);
      c.classList.add('q-dragme');
      c.addEventListener('pointerdown', E[k + 'Down'] = e => {
        if (!E) return;
        e.preventDefault(); e.stopPropagation();
        E.drag = {k, id: e.pointerId, x: e.clientX, y: e.clientY, x0: E.L[k].x, y0: E.L[k].y};
        E.reset = false;
        try { c.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      }, true);
    });
    E.move = e => {
      const d = E && E.drag; if (!d || e.pointerId !== d.id) return;
      E.L[d.k].x = d.x0 + (e.clientX - d.x) / innerWidth; E.L[d.k].y = d.y0 + (e.clientY - d.y) / innerHeight;
      apply();
    };
    E.up = e => {
      const d = E && E.drag; if (!d || e.pointerId !== d.id) return;
      E.drag = null;
      // keep what's on screen: the clamped center becomes the saved one
      const r = cluster(d.k).getBoundingClientRect();
      E.L[d.k].x = (r.left + r.width / 2) / innerWidth; E.L[d.k].y = (r.top + r.height / 2) / innerHeight;
      save(E.L);
    };
    addEventListener('pointermove', E.move); addEventListener('pointerup', E.up); addEventListener('pointercancel', E.up);
    E.resize = () => { if (E && orient() !== E.orient) { E.orient = orient(); E.L = JSON.parse(JSON.stringify(saved() || defaults())); } };
    addEventListener('resize', E.resize);
    apply();
    el.querySelector('[data-act=done]').focus();
  }
  function close() {
    if (!E) return;
    const e = E;
    if (!e.reset) save(e.L);
    removeEventListener('pointermove', e.move); removeEventListener('pointerup', e.up); removeEventListener('pointercancel', e.up); removeEventListener('resize', e.resize);
    ['dpad', 'ab'].forEach(k => { const c = cluster(k); c.classList.remove('q-dragme'); c.removeEventListener('pointerdown', e[k + 'Down'], true); });
    e.el.remove();
    E = null; Q.input.arranging = false;
    document.body.classList.remove('q-arranging');
    apply();
  }

  Q.arrange = {
    open, close, apply,
    /** start watching the game's menus (main.js, after the pad is mounted) */
    init() { watch(); apply(); },
    state() {
      const r = k => { const c = cluster(k); if (!c) return null; const b = c.getBoundingClientRect(); return {left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height}; };
      return {editing: !!E, orient: orient(), free: !!wrap() && wrap().classList.contains('pad-free'), saved: data().controls || null,
        dpad: r('dpad'), ab: r('ab'), opacity: $('pad') ? getComputedStyle($('pad')).opacity : null};
    },
  };
})(window.Arcade);
