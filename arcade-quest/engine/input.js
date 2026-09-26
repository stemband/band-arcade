/* ARCADE QUEST ENGINE: input. Keyboard (arrows/WASD, Enter/Space = A, Esc/Backspace = B), taps and clicks, and an
   on-screen D-pad + A/B buttons that appear on touch screens only. Everything becomes the same six buttons:
     up, down, left, right, a, b
   Q.input.held[btn]      true while held (dodging)
   Q.input.on(fn)         fn(btn) on every press; returns an off() function. The newest listener goes first and can
                          return true to stop older ones from hearing it (a menu over a menu).
   Q.input.touch          true on touch screens (the pad is shown)
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
  addEventListener('keyup', e => { const k = KEYS[e.key] || KEYS[e.key.toLowerCase && e.key.toLowerCase()]; if (k) held[k] = false; });
  addEventListener('blur', () => input.clear());

  /** the on-screen pad (touch screens): a D-pad and A/B buttons around the screen */
  Q.mountPad = function (el) {
    if (!el) return;
    el.hidden = !input.touch;
    el.innerHTML = `<div class="dpad" aria-label="Direction pad">` +
      ['up', 'left', 'right', 'down'].map(d => `<button type="button" class="pb pb-${d}" data-b="${d}" aria-label="${d}"><span aria-hidden="true">${{up: '▲', down: '▼', left: '◀', right: '▶'}[d]}</span></button>`).join('') +
      `</div><div class="abpad"><button type="button" class="pb pb-b" data-b="b" aria-label="B (back)">B</button><button type="button" class="pb pb-a" data-b="a" aria-label="A (OK)">A</button></div>`;
    el.querySelectorAll('[data-b]').forEach(b => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', e => { e.preventDefault(); held[k] = true; b.classList.add('on'); input.press(k); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { held[k] = false; b.classList.remove('on'); }));
    });
  };
})(window.Arcade);
