/* ARCADE QUEST ENGINE: input. Keyboard (arrows/WASD, Enter/Space = A, Esc/Backspace = B), taps and clicks, and an
   on-screen D-pad + A/B buttons that appear on touch screens only. Everything becomes the same six buttons:
     up, down, left, right, a, b
   Q.input.held[btn]      true while held (dodging)
   Q.input.on(fn)         fn(btn) on every press; returns an off() function. The newest listener goes first and can
                          return true to stop older ones from hearing it (a menu over a menu).
   Q.input.touch          true on touch screens (the pad is shown)
   Q.input.arranging      true while ARRANGE CONTROLS is open (engine/controls.js): the pad presses nothing
   While a shared panel (shared/ui-kit.js: pause menu, settings, a yes/no question, the results) is open
   (body.ui-modal), or Create Your Player (body.avc-open), the game hears no keys.
   Keys go to buttons as normal when a real button has focus (Enter/Space click it), so menus stay accessible. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const KEYS = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
    Enter: 'a', ' ': 'a', z: 'a', Escape: 'b', Backspace: 'b', x: 'b'};
  const held = {up: false, down: false, left: false, right: false, a: false, b: false};
  let listeners = [];
  const input = Q.input = {
    held,
    touch: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
    on(fn) { listeners.unshift(fn); return () => { listeners = listeners.filter(f => f !== fn); }; },
    press(btn) { for (const fn of listeners.slice()) if (fn(btn) === true) break; },
    clear() { Object.keys(held).forEach(k => { held[k] = false; }); },
    /** true while a text field (or a demo key the pitch engine uses) should keep its key */
    blocked: false,
  };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (document.body.classList.contains('avc-open')) return;   // Create Your Player is open: its own keys
    if (document.body.classList.contains('ui-modal')) return;   // a shared panel is open (pause, settings, a question…)
    // Esc while the shared PAUSE button shows and nothing else is on screen: the kit's pause has it (never both)
    if (e.key === 'Escape' && Q.pauseOwnsEsc && Q.pauseOwnsEsc()) return;
    const k = KEYS[e.key] || KEYS[e.key.toLowerCase && e.key.toLowerCase()];
    if (!k) return;
    if (input.blocked) return;                                  // a playing challenge: the keys are the demo notes
    const onButton = e.target.closest && e.target.closest('button, a');
    if (onButton && k === 'a') return;                          // the focused button clicks itself
    if (/^Arrow| /.test(e.key)) e.preventDefault();
    held[k] = true;
    if (e.repeat && !/up|down|left|right/.test(k)) return;     // holding A or B doesn't repeat; arrows do (menus)
    input.press(k);
  });
  /* KEYBOARD HINTS (keyboards only: !input.touch; touch screens have the pad, whose A and B match the words):
     Q.keyHints.label('a')  "A (Z / Enter)" on a keyboard, "A" on touch   ·   Q.keyHints.more  the text box's ▼ (+ "Enter")
     THE KEY LEGEND (#qKeys, the game screen's bottom-left corner, while you're free to walk: engine/world.js calls
     show(free) every frame): "Arrows: move · Z / Enter: A (talk, choose) · X / Esc: B (back) · M: Menu". It fades to
     low opacity after FADE_MS without a key press and comes back on a key, on hover and when a new scene or room loads
     (wake()). Settings: "Show key hints" (Q.settings keyHints, default On). QUICK HIDE: H (in the world, any time) or the
     legend's ✕ turn that same setting off (H turns it back on), saved, with a toast (Q.keyHints.set(on)).
     THE FIRST TIME the game is played on a keyboard (gameData keysTip), one line after the opening story: tip(). */
  const FADE_MS = 10000;
  const LEGEND = 'Arrows: move · Z / Enter: A (talk, choose) · X / Esc: B (back) · M: Menu · H: hide hints';
  const TOAST = {off: 'Key hints hidden: press H to show them.', on: 'Key hints on.'};
  let hintEl = null, fadeT = 0, shown = false;
  const hintsOn = () => !input.touch && !(Q.settings && Q.settings.get().keyHints === false);
  const legend = () => {
    if (hintEl && hintEl.isConnected) return hintEl;
    const stage = document.getElementById('stage'); if (!stage) return null;
    hintEl = Q.el('p', 'q-keys', `<span class="q-keys-t">${LEGEND}</span><button type="button" class="q-keys-x" aria-label="Hide key hints" title="Hide key hints">✕</button>`);
    hintEl.id = 'qKeys'; hintEl.hidden = true;
    hintEl.addEventListener('mouseenter', () => Q.keyHints.wake());
    hintEl.querySelector('.q-keys-x').addEventListener('click', e => { e.currentTarget.blur(); Q.keyHints.set(false); });
    stage.appendChild(hintEl);
    return hintEl;
  };
  Q.keyHints = {
    LEGEND, FADE_MS,
    label: b => (input.touch ? b.toUpperCase() : b === 'a' ? 'A (Z / Enter)' : b === 'b' ? 'B (X / Esc)' : b.toUpperCase()),
    get more() { return input.touch ? '▼' : '▼ Enter'; },
    show(on) {
      on = !!on && hintsOn();
      const el = on || shown ? legend() : null;
      if (!el || on === shown) return;
      shown = on; el.hidden = !on;
      if (on) Q.keyHints.wake();
    },
    wake() {
      clearTimeout(fadeT);
      if (hintEl) hintEl.classList.remove('dim');
      fadeT = setTimeout(() => { if (hintEl) hintEl.classList.add('dim'); }, FADE_MS);
    },
    state: () => ({shown: !!hintEl && !hintEl.hidden, dim: !!hintEl && hintEl.classList.contains('dim'), text: hintEl ? hintEl.querySelector('.q-keys-t').textContent : '',
      on: hintsOn()}),
    /** the setting itself (H, the ✕, the Settings switch all share it), saved, with a toast */
    set(on) {
      Q.settings.set({keyHints: !!on});
      if (A.UI && A.UI.toast) A.UI.toast(on ? TOAST.on : TOAST.off, {ms: 2600});
      if (Q.onSettings) Q.onSettings();
    },
    firstTip: () => !input.touch && !A.store.gameData('arcade-quest').keysTip,
    tip() {
      if (!Q.keyHints.firstTip()) return Promise.resolve();
      const d = A.store.gameData('arcade-quest'); d.keysTip = true; A.store.saveGameData('arcade-quest');
      return Q.say('On a keyboard: Z or Enter = A, X or Esc = B, M = Menu.');
    },
  };
  addEventListener('keydown', () => { if (shown) Q.keyHints.wake(); }, true);
  // H: hide / show the key hints (keyboards, in the world, no panel open)
  addEventListener('keydown', e => {
    if ((e.key !== 'h' && e.key !== 'H') || e.repeat || e.ctrlKey || e.metaKey || e.altKey || input.touch || input.blocked) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || Q.sceneName !== 'world') return;
    if (document.body.classList.contains('ui-modal') || document.body.classList.contains('avc-open')) return;
    e.preventDefault(); Q.keyHints.set(!hintsOn());
  });
  addEventListener('keyup', e => { const k = KEYS[e.key] || KEYS[e.key.toLowerCase && e.key.toLowerCase()]; if (k) held[k] = false; });
  addEventListener('blur', () => input.clear());

  /** the on-screen pad (touch screens): a D-pad and A/B buttons around the screen.
      HOLDING never selects, calls out, highlights, zooms or scrolls (Arcade.holdGuard + no text in the buttons: the
      arrows are drawn, the letters are CSS content). THE D-PAD is one control: the finger that presses it is captured
      (setPointerCapture), its direction follows the finger's angle from the pad's center, so a finger that drifts off
      the button keeps walking and one that slides onto another arrow turns; lifting it (or the browser cancelling it)
      stops. A and B are their own pointers, so a direction held with one thumb and A tapped with the other both work. */
  const ARROW = {up: 'M12 5l8 12H4z', down: 'M12 19L4 7h16z', left: 'M5 12l12-8v16z', right: 'M19 12L7 4v16z'};
  Q.mountPad = function (el) {
    if (!el) return;
    el.hidden = !input.touch;
    el.innerHTML = `<div class="dpad" role="group" aria-label="Direction pad">` +
      ['up', 'left', 'right', 'down'].map(d => `<button type="button" class="pb pb-${d}" data-b="${d}" aria-label="${d}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW[d]}"/></svg></button>`).join('') +
      `</div><div class="abpad"><button type="button" class="pb pb-b" data-b="b" aria-label="B (back)"></button><button type="button" class="pb pb-a" data-b="a" aria-label="A (OK)"></button></div>`;
    if (A.holdGuard) A.holdGuard(el, {lock: true, touch: true});
    // no double-tap zoom from quick taps on the pad (iPad Safari): its touches are the game's, never the browser's
    el.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, {passive: false});
    const dpad = el.querySelector('.dpad'), btn = d => dpad.querySelector(`[data-b="${d}"]`);
    let ptr = null, dir = null;
    const dirAt = e => {
      const r = dpad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return dir;            // the middle: keep going the same way
      return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    };
    const setDir = d => {
      if (d === dir) return;
      if (dir) { held[dir] = false; btn(dir).classList.remove('on'); }
      dir = d;
      if (d) { held[d] = true; btn(d).classList.add('on'); input.press(d); }
    };
    const endDir = e => { if (e.pointerId !== ptr) return; ptr = null; setDir(null); };
    dpad.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (ptr !== null || input.arranging) return;                                       // one finger steers
      ptr = e.pointerId;
      try { dpad.setPointerCapture(e.pointerId); } catch (x) { /* not capturable: moves still arrive over the pad */ }
      setDir(dirAt(e));
    });
    dpad.addEventListener('pointermove', e => { if (e.pointerId === ptr) setDir(dirAt(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dpad.addEventListener(t, endDir));
    el.querySelectorAll('.abpad [data-b]').forEach(b => {
      const k = b.dataset.b;
      let bp = null;
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (bp !== null || input.arranging) return;
        bp = e.pointerId;
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
        held[k] = true; b.classList.add('on'); input.press(k);
      });
      const up = e => { if (e.pointerId !== bp) return; bp = null; held[k] = false; b.classList.remove('on'); };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, up));
    });
  };
})(window.Arcade);
