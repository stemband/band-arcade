/* Note Checker: shows what the mic hears (in the student's written pitch), a tuning needle,
   and lights up notes once they have been held. Shared by every game. Two modes:
     FIRST 5 NOTES  the five notes the games use (letter names; any octave counts)
     FULL RANGE     the student's whole chromatic scale (GMEA ranges in instruments.js). Octave-exact:
                    a note lights only in the octave written on the staff. */
(function (A) {
  "use strict";
  const {$} = A;
  const {noteLabel, spell, mod12} = A.music;
  const inst = A.requireInstrument('note-checker');
  if (!inst) return;
  const GOLD = '#c98a12';   // the found-note color (same as first-five mode)

  // "Back to <game>" when opened from a game (the game links here with #<game-id>)
  const fromGame = A.GAMES.find(g => g.id === location.hash.slice(1) && g.id !== 'note-checker');
  A.mountTopbar(inst, fromGame
    ? `<a class="btn btn-ghost btn-small" href="${A.linkTo('../' + fromGame.id + '/index.html')}">Back to ${fromGame.name}</a>` : '', 'note-checker');

  A.Pitch.setInstrument(inst);
  let mode = A.store.checkerMode, found = new Set(), smooth = 0;

  /* ---------- FIRST 5 NOTES (unchanged) ---------- */
  function draw() {
    $('ckStaff').innerHTML = A.fiveNoteStaff(inst, i => found.has(i) ? GOLD : undefined);
    $('ckFound').textContent = found.size === 5 ? 'All 5 notes found. You’re ready to play!' : `${found.size} of 5 notes found`;
  }

  /* ---------- FULL RANGE ---------- */
  let member = null, down = false, scale = [], fullFound = new Set(), heard = null, cursor = 0;
  const byWritten = new Map();        // written midi -> index in scale

  function chooseMember(id) {
    member = A.getMember(inst, id);
    if (!member) return;
    A.store.setMember(inst.id, member.id);
    fullFound = new Set();
    setupFull();
  }
  function setupFull() {
    const pick = !member;
    $('memberPick').hidden = !pick; $('fullMain').hidden = pick;
    if (pick) {
      $('memberBtns').innerHTML = inst.members.map(m =>
        `<button class="btn member-btn" type="button" data-id="${m.id}">${m.name}</button>`).join('');
      $('memberBtns').querySelectorAll('button').forEach(b => b.addEventListener('click', () => chooseMember(b.dataset.id)));
      A.Pitch.setRange(null);
      $('ckFound').textContent = '';
      return;
    }
    $('memberName').textContent = member.name;
    $('memberChange').hidden = inst.members.length < 2;
    A.Pitch.setRange(member.soundLow, member.soundHigh);
    cursor = 0;
    drawFull();
  }
  // lay the scale out in rows that fit the screen: at least 50px per note so sharps and flats never touch
  function drawFull() {
    if (!member) return;
    scale = A.chromaticScale(member, {down});
    byWritten.clear(); scale.forEach((n, i) => byWritten.set(n.midi, i));
    const box = $('fullStaff'), W = Math.max(260, Math.floor(box.clientWidth || 340));
    const CLEF = 72, per = Math.max(4, Math.min(12, Math.floor((W - CLEF - 16) / 50))), step = (W - CLEF - 16) / per;
    let html = '';
    for (let r = 0; r < scale.length; r += per) {
      const row = scale.slice(r, r + per);
      html += A.staffSVG(member.clef, row.map((n, k) => ({n, x: CLEF + step * (k + .5), id: 'fr' + n.midi, caption: noteLabel(n)})),
        {width: W, label: `Notes ${r + 1} to ${r + row.length}: ` + row.map(noteLabel).join(', ')});
    }
    box.innerHTML = html;
    fullFound.forEach(w => A.colorNote('fr' + w, GOLD));
    markHeard(heard, true); markCursor();
    $('dirBtn').setAttribute('aria-pressed', down);
    fullCount();
  }
  function fullCount() {
    const n = scale.length, f = fullFound.size;
    $('ckFound').textContent = f === n ? `All ${n} notes found. Great range!` : `${f} of ${n} notes`;
  }
  const nameOf = w => noteLabel(spell(w, down));   // spelled the way the staff shows it right now
  /** outline the note being heard right now (written midi, or null) */
  function markHeard(w, force) {
    if (w === heard && !force) return;
    const old = document.querySelector('#fullStaff .hearing'); if (old) old.classList.remove('hearing');
    heard = w;
    const g = w != null && document.getElementById('fr' + w); if (g) g.classList.add('hearing');
  }
  function markCursor() {
    const old = document.querySelector('#fullStaff .demo-cursor'); if (old) old.classList.remove('demo-cursor');
    if (!A.DEMO || !scale[cursor]) return;
    const g = document.getElementById('fr' + scale[cursor].midi); if (g) g.classList.add('demo-cursor');
  }
  function hint(text) { $('fullHint').textContent = text; }

  /* a held note (exact sounding midi, already moved into range by the pitch engine if it was an octave off) */
  function fullHeld(note) {
    const w = note + member.sounds;                     // what that is on the student's part
    if (byWritten.has(w) && !fullFound.has(w)) {
      fullFound.add(w); A.colorNote('fr' + w, GOLD); hint(''); fullCount();
      return;
    }
    // same letter, another octave still to find: point the student at it
    const sibs = scale.filter(n => mod12(n.midi - w) === 0 && n.midi !== w && !fullFound.has(n.midi));
    if (!sibs.length) { hint(''); return; }
    const target = sibs.reduce((a, b) => Math.abs(b.midi - w) < Math.abs(a.midi - w) ? b : a);
    const lower = w < target.midi;
    hint(`That's ${/^[AEF]/.test(nameOf(w)) ? 'an' : 'a'} ${nameOf(w)}, but an octave ${lower ? 'lower' : 'higher'}. Try the ${lower ? 'higher' : 'lower'} one.`);
  }

  /* ---------- modes ---------- */
  function setMode(m) {
    mode = m; A.store.setCheckerMode(m);
    document.querySelectorAll('.mode-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
    $('fivePanel').hidden = m !== 'five'; $('fullPanel').hidden = m !== 'full';
    $('demoHelp').hidden = !A.DEMO;
    hint('');
    if (m === 'five') { A.Pitch.setRange(null); draw(); }
    else { member = A.getMember(inst, A.store.memberFor(inst.id)); setupFull(); }
  }
  document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));
  $('memberChange').addEventListener('click', () => { member = null; setupFull(); $('memberBtns').querySelector('button').focus(); });
  $('dirBtn').addEventListener('click', () => { down = !down; drawFull(); });
  let lastW = 0;
  addEventListener('resize', () => { const w = $('fullStaff').clientWidth; if (mode === 'full' && w !== lastW) { lastW = w; drawFull(); } });
  setMode(mode);

  const start = () => { $('startRow').hidden = true; };
  $('startBtn').addEventListener('click', () => A.requireMic(start));
  A.requireMic(start);   // shows the mic prompt right away (the tap on it counts as the gesture iPads need)

  $('ckReset').addEventListener('click', () => {
    if (mode === 'five') { found = new Set(); draw(); }
    else { fullFound = new Set(); hint(''); drawFull(); }
  });

  $('sens').value = A.store.sens;
  $('sens').addEventListener('input', e => { A.store.setSens(+e.target.value); A.Pitch.setSensitivity(+e.target.value); });

  A.Pitch.onHeld((pc, now, note) => {
    if (mode === 'full') { if (member) fullHeld(note); return; }
    const i = inst.targetPc.indexOf(pc);
    if (i >= 0 && !found.has(i)) { found.add(i); draw(); }
  });

  A.Pitch.onFrame((r, level) => {
    const big = $('ckNote'), conc = $('ckConcert'), needle = $('needle'), verdict = $('ckVerdict');
    const full = mode === 'full' && member;
    if (r) {
      const w = full ? r.note + member.sounds : null;
      big.textContent = full ? nameOf(w) : inst.writtenName(r.pc);
      big.classList.toggle('hit', full ? byWritten.has(w) : inst.targetPc.includes(r.pc));
      conc.textContent = inst.t ? `Concert ${A.music.NAMES[r.pc]}` : `${Math.round(r.freq)} Hz`;
      smooth = smooth * .6 + r.cents * .4;
      const c = Math.max(-50, Math.min(50, smooth)), a = Math.abs(c);
      needle.style.transform = `translateX(${c * 3}px)`; needle.setAttribute('opacity', 1);
      verdict.textContent = a <= 10 ? 'In tune' : a <= 25 ? (c < 0 ? 'A little flat' : 'A little sharp') : (c < 0 ? 'Flat' : 'Sharp');
      verdict.style.color = a <= 10 ? 'var(--gold)' : 'var(--bone)';
      if (full) markHeard(byWritten.has(w) ? w : null);
    } else {
      big.textContent = '–'; big.classList.remove('hit');
      conc.textContent = level < A.Pitch.gate ? 'Play a note' : 'Listening…';
      needle.setAttribute('opacity', .25);
      verdict.innerHTML = '&nbsp;';
      if (full) markHeard(null);
    }
    const fill = $('lvlFill');
    fill.style.width = A.Pitch.levelPct(level) + '%';
    fill.classList.toggle('over', level >= A.Pitch.gate);
    $('lvlGate').style.left = A.Pitch.levelPct(A.Pitch.gate) + '%';
  });

  /* ---------- ?demo in full range: ↑/↓ pick a note, hold Space to "play" it (Shift+Space: an octave low) ---------- */
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (mode !== 'full' || !member || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const higher = e.key === 'ArrowUp' ? 1 : -1, dirStep = down ? -higher : higher;   // the list runs downward when "Going down"
        cursor = Math.max(0, Math.min(scale.length - 1, cursor + dirStep));
        markCursor();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (scale[cursor]) A.Pitch.demoNote = scale[cursor].sounding - (e.shiftKey ? 12 : 0);
      }
    });
    addEventListener('keyup', e => { if (e.key === ' ' && A.Pitch.demoNote !== null) { e.preventDefault(); A.Pitch.demoNote = null; } });
  }
})(window.Arcade);
