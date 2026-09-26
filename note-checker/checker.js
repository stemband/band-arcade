/* Note Checker: shows what the mic hears (in the student's written pitch), a tuning needle,
   and lights up notes once they have been held. Shared by every game. Modes:
     FIRST 5        the five notes the games use (letter names; any octave counts)
     B♭ E♭ F A♭     the GMEA major scales for the student's instrument (scales.js), up and down, with key signature
     CHROMATIC      the student's whole chromatic scale (GMEA ranges in instruments.js)
   All but FIRST 5 are octave-exact: a note lights only in the octave written on the staff. */
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

  /* ---------- FULL RANGE (mode 'full', chromatic) and SCALES ('Bb', 'Eb', 'F', 'Ab') ----------
     Both show a list of written notes for the student's instrument member. Chromatic: one note per pitch,
     "Going down" re-spells it with flats (found notes stay found). Scales: the scale up then down (15 notes);
     a held pitch lights the first of its places still dark, so going up lights the way up, then the way down. */
  let member = null, down = false, list = [], sig = null, fullFound = new Set(), heard = null, cursor = 0, scaleObj = null;
  const byWritten = new Map();        // written midi -> keys of the list places with that pitch, in order
  const isChromatic = () => mode === 'full';

  // the instrument is the one chosen on Select Player (a member): no "Which instrument do you play?" here
  function setupFull() {
    if (!member) return;
    $('memberName').textContent = member.name;
    $('dirBtn').hidden = !isChromatic();
    scaleObj = isChromatic() ? null : A.Scales.build(member, mode);
    $('fullLede').innerHTML = isChromatic()
      ? 'Play your whole chromatic scale. Hold each note until it turns gold. It has to be the <b>right octave</b>: the low D and the high D are different notes.'
      : `<b>${scaleObj.label}.</b> Play it up and back down. Hold each note until it turns gold, in the <b>octave shown</b>.`;
    A.Pitch.setRange(member.soundLow, member.soundHigh);
    cursor = 0;
    drawFull();
  }
  function buildList() {
    if (isChromatic()) {
      sig = null;
      list = A.chromaticScale(member, {down}).map(n => ({n, show: n, key: 'm' + n.midi, midi: n.midi, sounding: n.sounding, label: noteLabel(n)}));
    } else {
      sig = scaleObj.sig;
      list = scaleObj.notes.map((n, i) => ({n, show: n.show, key: 'i' + i, midi: n.midi, sounding: n.sounding, label: noteLabel(n)}));
    }
    byWritten.clear();
    list.forEach(it => { if (!byWritten.has(it.midi)) byWritten.set(it.midi, []); byWritten.get(it.midi).push(it.key); });
  }
  // lay the notes out in rows that fit the screen: at least 50px per note so sharps and flats never touch
  function drawFull() {
    if (!member) return;
    buildList();
    const box = $('fullStaff'), W = Math.max(260, Math.floor(box.clientWidth || 340));
    const CLEF = 72 + A.keySigWidth(sig), per = Math.max(4, Math.min(12, Math.floor((W - CLEF - 16) / 50))), step = (W - CLEF - 16) / per;
    let html = '';
    for (let r = 0; r < list.length; r += per) {
      const row = list.slice(r, r + per);
      html += A.staffSVG(member.clef, row.map((it, k) => ({n: it.show, x: CLEF + step * (k + .5), id: 'fr' + it.key, caption: it.label})),
        {width: W, keySig: sig, label: `Notes ${r + 1} to ${r + row.length}: ` + row.map(it => it.label).join(', ')});
    }
    box.innerHTML = html;
    fullFound.forEach(k => A.colorNote('fr' + k, GOLD));
    markHeard(heard, true); markCursor();
    $('dirBtn').setAttribute('aria-pressed', down);
    fullCount();
  }
  function fullCount() {
    const n = list.length, f = list.filter(it => fullFound.has(it.key)).length;
    $('ckFound').textContent = f === n ? (isChromatic() ? `All ${n} notes found. Great range!` : `All ${n} notes. Scale complete!`) : `${f} of ${n} notes`;
  }
  /** a written pitch's name, spelled the way the staff shows it right now */
  function nameOf(w) {
    const it = list.find(x => mod12(x.midi - w) === 0);
    return it && !isChromatic() ? noteLabel(it.n) : noteLabel(spell(w, down));
  }
  /** outline the note being heard right now (written midi, or null) */
  function markHeard(w, force) {
    if (w === heard && !force) return;
    document.querySelectorAll('#fullStaff .hearing').forEach(g => g.classList.remove('hearing'));
    heard = w;
    (w != null && byWritten.get(w) || []).forEach(k => { const g = document.getElementById('fr' + k); if (g) g.classList.add('hearing'); });
  }
  function markCursor() {
    const old = document.querySelector('#fullStaff .demo-cursor'); if (old) old.classList.remove('demo-cursor');
    if (!A.DEMO || !list[cursor]) return;
    const g = document.getElementById('fr' + list[cursor].key); if (g) g.classList.add('demo-cursor');
  }
  function hint(text) { $('fullHint').textContent = text; }

  /* a held note (exact sounding midi, already moved into range by the pitch engine if it was an octave off) */
  function fullHeld(note) {
    const w = note + member.sounds;                     // what that is on the student's part
    const open = (byWritten.get(w) || []).find(k => !fullFound.has(k));
    if (open) {
      fullFound.add(open); A.colorNote('fr' + open, GOLD); hint(''); fullCount();
      return;
    }
    // same letter, another octave still to find: point the student at it
    const sibs = list.filter(it => mod12(it.midi - w) === 0 && it.midi !== w && !fullFound.has(it.key));
    if (!sibs.length) { hint(''); return; }
    const target = sibs.reduce((a, b) => Math.abs(b.midi - w) < Math.abs(a.midi - w) ? b : a);
    const lower = w < target.midi, nm = nameOf(w);
    hint(`That's ${/^[AEF]/.test(nm) ? 'an' : 'a'} ${nm}, but an octave ${lower ? 'lower' : 'higher'}. Try the ${lower ? 'higher' : 'lower'} one.`);
  }

  /* ---------- modes: FIRST 5 | B♭ | E♭ | F | A♭ | CHROMATIC ---------- */
  function setMode(m) {
    const was = mode;
    mode = m; A.store.setCheckerMode(m);
    document.querySelectorAll('.mode-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
    $('fivePanel').hidden = m !== 'five'; $('fullPanel').hidden = m === 'five';
    $('demoHelp').hidden = !A.DEMO;
    hint('');
    if (was !== m) { fullFound = new Set(); heard = null; }
    if (m === 'five') { A.Pitch.setRange(null); draw(); }
    else { member = A.currentMember(); setupFull(); }
  }
  document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));
  $('dirBtn').addEventListener('click', () => { down = !down; drawFull(); });
  let lastW = 0;
  addEventListener('resize', () => { const w = $('fullStaff').clientWidth; if (mode !== 'five' && w !== lastW) { lastW = w; drawFull(); } });
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
    if (mode !== 'five') { if (member) fullHeld(note); return; }
    const i = inst.targetPc.indexOf(pc);
    if (i >= 0 && !found.has(i)) { found.add(i); draw(); }
  });

  A.Pitch.onFrame((r, level) => {
    const big = $('ckNote'), conc = $('ckConcert'), needle = $('needle'), verdict = $('ckVerdict');
    const full = mode !== 'five' && member;
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
      if (mode === 'five' || !member || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        // ↑/↓ step through the list in order (it runs downward when "Going down", and a scale comes back down)
        const step = e.key === 'ArrowUp' ? 1 : -1, dirStep = isChromatic() && down ? -step : step;
        cursor = Math.max(0, Math.min(list.length - 1, cursor + dirStep));
        markCursor();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (list[cursor]) A.Pitch.demoNote = list[cursor].sounding - (e.shiftKey ? 12 : 0);
      }
    });
    addEventListener('keyup', e => { if (e.key === ' ' && A.Pitch.demoNote !== null) { e.preventDefault(); A.Pitch.demoNote = null; } });
  }
})(window.Arcade);
