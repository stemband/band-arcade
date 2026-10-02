/* Arcade.AnswerPad: the note-name answer pad in Note Ninja's layout (so students already know it). Used by Dojo Duel
   (two pads on one screen), Keys to the City (NAME THE KEY) and Blocktave's TOUCH note cards.
     const pad = Arcade.AnswerPad.mount(el, {accs, relabel, notes, holdRow, cls, onAnswer(letter, acc, ev)})
       notes    the note set's spelled names (buildSequence's `spelled`: [{letter, acc}], one per letter, the WHOLE set,
                never level 1's smaller pool). With them, THE SPELLED PAD: no ♭ ♮ ♯ row, one button per note of the set
                ("B♭ C D E♭ F" for flute First 5) and a button answers its letter AND its accidental in one tap.
                Without them (Chromatic, or a card with no set), or with the teacher setting SPELL_ANSWER_BUTTONS off
                (teacher-settings.js): THE SHIFT PAD, a row of ♭ ♮ ♯ that work like a Shift key for the next letter
                (♮ by default, back to ♮ after every letter; shown only when `accs`), then A–G in one row.
       accs     true = show ♭ ♮ ♯ (Shift pad)    relabel  false = the letters don't turn into A♭ B♭ … after ♭ (no hint)
       holdRow  true = a spelled pad keeps the ♭ ♮ ♯ row's space (invisible) when `accs`, so the pad's height never changes
                between spelled and Shift rounds (Keys to the City: the keyboard under it never moves)
       onAnswer gets the letter, the accidental (-1 | 0 | 1) and the pointer event (ev.timeStamp decides ties), the same in
                both pads, so the games' checks don't change
     pad.setAcc(a) · pad.press(letter, ev) (keyboards: on a spelled pad the letter answers that letter's spelled note)
     pad.set({accs, relabel, notes}) · pad.lock(on) · pad.mark(letter, cls) · pad.spelled (the notes shown, or null)
     pad.letters() (the letters on the buttons) · pad.label(letter) ('B♭': what that letter answers right now)
     AnswerPad.spelled(notes) = the notes to spell with (null when the teacher setting is off or there are none)
     AnswerPad.name(letter, acc) = 'B♭' · AnswerPad.say(letter, acc) = 'B flat' (aria-labels)
     AnswerPad.cols(width, n) = buttons a row for a spelled pad (Note Ninja's own pad uses these helpers too)
   Buttons answer on POINTERDOWN (fast thumbs; every finger is its own pointer, so two pads work at the same time on
   an iPad), never on click. The page should give the pads' area `touch-action: none` during play.
   Layout: the spelled buttons share one row while each can be at least 48 px wide, else two rows (ResizeObserver);
   never a button under 48 px (a very narrow pad, Dojo Duel side by side on a phone, takes a third row). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const SIGN = {'-1': '♭', 0: '', 1: '♯'};
  const MIN_W = 48, GAP = 6;

  const spellOn = () => !(A.TEACHER && A.TEACHER.SPELL_ANSWER_BUTTONS === false);
  /** the notes a pad spells with: the set's names, or null (teacher setting off, Chromatic, no set) */
  const spelled = notes => spellOn() && Array.isArray(notes) && notes.length ? notes.map(n => ({letter: n.letter, acc: n.acc || 0})) : null;
  const name = (letter, acc) => letter + (SIGN[acc || 0] || '');
  const say = (letter, acc) => letter + (acc < 0 ? ' flat' : acc > 0 ? ' sharp' : '');
  /** buttons a row: all n while each gets MIN_W px (gap GAP), else two even rows (more only where even that can't fit) */
  const cols = (w, n, gap = GAP) => !w || w >= n * MIN_W + (n - 1) * gap ? n
    : Math.max(1, Math.min(Math.ceil(n / 2), Math.floor((w + gap) / (MIN_W + gap))));

  function mount(el, {accs = false, relabel = true, notes = null, holdRow = false, cls = '', onAnswer} = {}) {
    let acc = 0, locked = false, opt = {accs, relabel, holdRow}, sp = spelled(notes), shown = '';
    el.classList.add('apad'); if (cls) el.classList.add(...cls.split(' '));
    el.innerHTML =
      `<div class="apad-accs" role="group" aria-label="Sharp or flat">` +
      [[-1, '♭', 'Flat'], [0, '♮', 'Natural'], [1, '♯', 'Sharp']].map(([a, s, l]) =>
        `<button type="button" class="apad-acc" data-acc="${a}" aria-pressed="${a === 0}" aria-label="${l}">${s}</button>`).join('') + `</div>` +
      `<div class="apad-letters" role="group" aria-label="Note names"></div>`;
    const accRow = el.querySelector('.apad-accs'), row = el.querySelector('.apad-letters');
    /** the buttons: the set's spelled notes, or A–G (rebuilt only when that changes) */
    function build() {
      const key = sp ? sp.map(n => name(n.letter, n.acc)).join(' ') : '';
      if (key === shown && row.children.length) return;
      shown = key;
      const list = sp || LETTERS.map(l => ({letter: l, acc: 0}));
      row.innerHTML = list.map(n => `<button type="button" class="apad-letter" data-letter="${n.letter}"><span>${n.letter}</span></button>`).join('');
      el.classList.toggle('sp', !!sp);
      fit();
    }
    /** spelled pads: one row while every button gets MIN_W px, else two even rows */
    function fit() {
      const n = row.children.length, c = sp ? cols(row.clientWidth, n) : n;
      row.classList.toggle('two', c < n);
      row.style.setProperty('--cols', c);
    }
    function draw() {
      build();
      accRow.hidden = sp ? !(opt.holdRow && opt.accs) : !opt.accs;
      accRow.classList.toggle('apad-ghost', !!sp);                 // holdRow: the row's space, nothing to tap
      el.querySelectorAll('.apad-acc').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.acc === acc)));
      el.querySelectorAll('.apad-letter').forEach(b => {
        const l = b.dataset.letter, a = sp ? accOf(l) : acc;
        b.firstChild.textContent = sp ? name(l, a) : l + (opt.relabel === false ? '' : SIGN[acc]);
        b.setAttribute('aria-label', say(l, a));
      });
    }
    const accOf = letter => { const n = sp && sp.find(x => x.letter === letter); return n ? n.acc : 0; };
    const pad = {
      el,
      get spelled() { return sp; },
      letters: () => sp ? sp.map(n => n.letter) : LETTERS.slice(),
      label: letter => name(letter, sp ? accOf(letter) : opt.accs ? acc : 0),
      setAcc(a) { acc = opt.accs && !sp ? a : 0; draw(); },
      set(o) { Object.assign(opt, o); if ('notes' in o) sp = spelled(o.notes); acc = 0; draw(); },
      lock(on) { locked = !!on; el.classList.toggle('locked', locked); },
      press(letter, ev) {
        if (locked) return;
        const a = sp ? accOf(letter) : opt.accs ? acc : 0;   // spelled: the letter's own note (B → B♭ in that set)
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
    if (window.ResizeObserver) new ResizeObserver(fit).observe(row);
    draw();
    return pad;
  }

  A.AnswerPad = {mount, LETTERS, SIGN, spelled, spellOn, name, say, cols};
})(window.Arcade);
