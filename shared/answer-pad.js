/* Arcade.AnswerPad: the note-name answer pad in Note Ninja's layout (so students already know it): a row of
   ♭ ♮ ♯ that work like a Shift key for the next letter (♮ by default, back to ♮ after every letter; shown only when
   the notes have sharps or flats), then A–G in one row. Used by Dojo Duel (two pads on one screen).
     const pad = Arcade.AnswerPad.mount(el, {accs, relabel, cls, onAnswer(letter, acc, ev)})
       accs     true = show ♭ ♮ ♯          relabel  false = the letters don't turn into A♭ B♭ … after ♭ (no hint)
       onAnswer gets the letter, the accidental (-1 | 0 | 1) and the pointer event (ev.timeStamp decides ties)
     pad.setAcc(a) · pad.press(letter, ev) (keyboards) · pad.set({accs, relabel}) · pad.lock(on) · pad.mark(letter, cls)
   Buttons answer on POINTERDOWN (fast thumbs; every finger is its own pointer, so two pads work at the same time on
   an iPad), never on click. The page should give the pads' area `touch-action: none` during play. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const SIGN = {'-1': '♭', 0: '', 1: '♯'};

  function mount(el, {accs = false, relabel = true, cls = '', onAnswer} = {}) {
    let acc = 0, locked = false, opt = {accs, relabel};
    el.classList.add('apad'); if (cls) el.classList.add(...cls.split(' '));
    el.innerHTML =
      `<div class="apad-accs" role="group" aria-label="Sharp or flat">` +
      [[-1, '♭', 'Flat'], [0, '♮', 'Natural'], [1, '♯', 'Sharp']].map(([a, s, l]) =>
        `<button type="button" class="apad-acc" data-acc="${a}" aria-pressed="${a === 0}" aria-label="${l}">${s}</button>`).join('') + `</div>` +
      `<div class="apad-letters" role="group" aria-label="Note names">` +
      LETTERS.map(l => `<button type="button" class="apad-letter" data-letter="${l}"><span>${l}</span></button>`).join('') + `</div>`;
    const accRow = el.querySelector('.apad-accs');
    function draw() {
      accRow.hidden = !opt.accs;
      el.querySelectorAll('.apad-acc').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.acc === acc)));
      el.querySelectorAll('.apad-letter').forEach(b => {
        b.firstChild.textContent = b.dataset.letter + (opt.relabel === false ? '' : SIGN[acc]);
        b.setAttribute('aria-label', b.dataset.letter + (acc < 0 ? ' flat' : acc > 0 ? ' sharp' : ''));
      });
    }
    const pad = {
      el,
      setAcc(a) { acc = opt.accs ? a : 0; draw(); },
      set(o) { Object.assign(opt, o); acc = 0; draw(); },
      lock(on) { locked = !!on; el.classList.toggle('locked', locked); },
      press(letter, ev) {
        if (locked) return;
        const a = opt.accs ? acc : 0;
        acc = 0; draw();                                     // the Shift lets go after every letter
        if (onAnswer) onAnswer(letter, a, ev || {timeStamp: performance.now()});
      },
      mark(letter, cls) {
        const b = el.querySelector(`.apad-letter[data-letter="${letter}"]`); if (!b) return;
        b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
      },
    };
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      e.preventDefault();                                   // no focus ring, no text selection, no double-tap zoom
      if (b.dataset.letter) pad.press(b.dataset.letter, e);
      else if (!locked) pad.setAcc(+b.dataset.acc === acc ? 0 : +b.dataset.acc);
    });
    el.addEventListener('click', e => { if (e.detail === 0) {             // keyboard activation (Enter/Space on a focused button)
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.letter) pad.press(b.dataset.letter, e); else if (!locked) pad.setAcc(+b.dataset.acc === acc ? 0 : +b.dataset.acc);
    } });
    draw();
    return pad;
  }

  A.AnswerPad = {mount, LETTERS, SIGN};
})(window.Arcade);
