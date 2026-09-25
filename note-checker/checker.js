/* Note Checker: shows what the mic hears (in the student's written pitch), a tuning needle,
   and lights up each of the five notes once it has been held. Shared by every game. */
(function (A) {
  "use strict";
  const {$} = A;
  const inst = A.requireInstrument('note-checker');
  if (!inst) return;

  // "Back to <game>" when opened from a game (the game links here with #<game-id>)
  const fromGame = A.GAMES.find(g => g.id === location.hash.slice(1) && g.id !== 'note-checker');
  A.mountTopbar(inst, fromGame
    ? `<a class="btn btn-ghost btn-small" href="${A.linkTo('../' + fromGame.id + '/index.html')}">Back to ${fromGame.name}</a>` : '', 'note-checker');

  A.Pitch.setInstrument(inst);
  let found = new Set(), smooth = 0;

  function draw() {
    $('ckStaff').innerHTML = A.fiveNoteStaff(inst, i => found.has(i) ? '#c98a12' : undefined);
    $('ckFound').textContent = found.size === 5 ? 'All 5 notes found. You’re ready to play!' : `${found.size} of 5 notes found`;
  }
  draw();

  const start = () => { $('startRow').hidden = true; };
  $('startBtn').addEventListener('click', () => A.requireMic(start));
  A.requireMic(start);   // shows the mic prompt right away (the tap on it counts as the gesture iPads need)

  $('ckReset').addEventListener('click', () => { found = new Set(); draw(); });

  $('sens').value = A.store.sens;
  $('sens').addEventListener('input', e => { A.store.setSens(+e.target.value); A.Pitch.setSensitivity(+e.target.value); });

  A.Pitch.onHeld(pc => {
    const i = inst.targetPc.indexOf(pc);
    if (i >= 0 && !found.has(i)) { found.add(i); draw(); }
  });

  A.Pitch.onFrame((r, level) => {
    const big = $('ckNote'), conc = $('ckConcert'), needle = $('needle'), verdict = $('ckVerdict');
    if (r) {
      big.textContent = inst.writtenName(r.pc);
      big.classList.toggle('hit', inst.targetPc.includes(r.pc));
      conc.textContent = inst.t ? `Concert ${A.music.NAMES[r.pc]}` : `${Math.round(r.freq)} Hz`;
      smooth = smooth * .6 + r.cents * .4;
      const c = Math.max(-50, Math.min(50, smooth)), a = Math.abs(c);
      needle.style.transform = `translateX(${c * 3}px)`; needle.setAttribute('opacity', 1);
      verdict.textContent = a <= 10 ? 'In tune' : a <= 25 ? (c < 0 ? 'A little flat' : 'A little sharp') : (c < 0 ? 'Flat' : 'Sharp');
      verdict.style.color = a <= 10 ? 'var(--gold)' : 'var(--bone)';
    } else {
      big.textContent = '–'; big.classList.remove('hit');
      conc.textContent = level < A.Pitch.gate ? 'Play a note' : 'Listening…';
      needle.setAttribute('opacity', .25);
      verdict.innerHTML = '&nbsp;';
    }
    const fill = $('lvlFill');
    fill.style.width = A.Pitch.levelPct(level) + '%';
    fill.classList.toggle('over', level >= A.Pitch.gate);
    $('lvlGate').style.left = A.Pitch.levelPct(A.Pitch.gate) + '%';
  });
})(window.Arcade);
