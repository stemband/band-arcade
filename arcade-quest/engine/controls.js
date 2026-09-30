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

  /* ---------- ARRANGE CONTROLS (shared/pad-arrange.js: the same edit mode as Blocktave's pad) ---------- */
  const $ = id => document.getElementById(id);
  const cluster = k => { const p = $('pad'); return p && p.querySelector(k === 'dpad' ? '.dpad' : '.abpad'); };
  const arr = A.PadArrange.create({
    gameId: GAME, key: 'controls', cls: 'q-',
    clusters: {dpad: () => cluster('dpad'), ab: () => cluster('ab')}, labels: {dpad: 'D-pad', ab: 'A/B'},
    hint: 'Drag the D-pad and the A/B buttons where your thumbs like them.',
    pad: () => $('pad'), wrap: () => document.querySelector('.q-wrap'),
    // the menus and the text the controls must never cover (+ the ☰ MENU button beside #ui: engine/world.js)
    obstacles: () => { const ui = $('ui'); return ui ? [...ui.querySelectorAll('.q-menu, .q-textbox, .q-chal button'), ...document.querySelectorAll('#qMenuSlot .ui-pause-btn')] : []; },
    watch: () => { const ui = $('ui'); return ui && (ui.parentNode || ui); },       // #stage: #ui and the ☰ MENU button
    touch: () => Q.input.touch,
    onStart() { Q.input.arranging = true; Q.input.clear(); },
    onEnd() { Q.input.arranging = false; },
  });
  Q.arrange = arr;
})(window.Arcade);
