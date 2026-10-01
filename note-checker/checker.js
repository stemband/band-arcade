/* TUNE UP's NOTE CHECKER tab (the toolbox: toolbox.js; the Tuner and the Metronome are tuner.js and metronome.js).
   Note Checker: shows what the mic hears (in the student's written pitch), a tuning needle,
   and lights up notes once they have been held. Shared by every game. Modes:
     FIRST 5        the five notes the games use (letter names; any octave counts)
     B♭ E♭ F A♭     the GMEA major scales for the student's instrument (scales.js), up and down, with key signature
     CHROMATIC      the student's whole chromatic scale (GMEA ranges in instruments.js)
     ARTICULATION   counts every separate attack (tongued note, mallet strike, drum hit: Arcade.Pitch.onAttack), with
                    the note name when it has one. Mat's check of attack detection on real instruments. The only mode
                    for the Snare Drum (an unpitched player).
   All but FIRST 5 and ARTICULATION are octave-exact: a note lights only in the octave written on the staff. */
(function (A) {
  "use strict";
  const {$} = A;
  const {noteLabel, spell, mod12} = A.music;
  const T = A.TuneUp, inst = T && T.inst;                                // toolbox.js: the instrument + the top bar
  if (!inst) return;
  const GOLD = '#c98a12';   // the found-note color (same as first-five mode)
  const on = () => T.tab === 'checker';                                 // every listener below only acts on this tab

  const unpitched = inst.pitched === false;                             // the snare drum
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
    $('dirSeg').hidden = !isChromatic();
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
  /* lay the notes out in rows, EVENLY: every gap between two notes is the same, counting the room a ♯/♭/♮ takes in
     front of its note (so a sharp never looks closer to its neighbor), and one gap for every row, so rows line up.
     Scales: the way up on one row, the way down on the next (each split in two on a narrow screen).
     Chromatic: as many rows as it needs, the notes shared out evenly between them. */
  const HEAD_L = 11, HEAD_R = 11, ACC_L = 34, MIN_GAP = 18, CHROM_MIN = 50, SCALE_MIN = 40;
  const leftOf = it => (it.show.acc || it.show.natural ? ACC_L : HEAD_L);
  function rowsOf(avail) {
    if (!isChromatic()) {
      const up = list.slice(0, scaleObj.up.length), dn = list.slice(scaleObj.up.length);
      if (avail / up.length >= SCALE_MIN) return [up, dn];
      const half = a => { const k = Math.ceil(a.length / 2); return [a.slice(0, k), a.slice(k)]; };
      return half(up).concat(half(dn));
    }
    const per = Math.max(4, Math.min(12, Math.floor(avail / CHROM_MIN))), nRows = Math.ceil(list.length / per), even = Math.ceil(list.length / nRows);
    const rows = [];
    for (let r = 0; r < list.length; r += even) rows.push(list.slice(r, r + even));
    return rows;
  }
  function drawFull() {
    if (!member) return;
    buildList();
    const box = $('fullStaff'), W = Math.max(260, Math.floor(box.clientWidth || 340));
    const CLEF = 70 + A.keySigWidth(sig, 'big'), RIGHT = 14, avail = W - CLEF - RIGHT;
    const rows = rowsOf(avail);
    // one gap for every row: the one that makes the fullest row fill the width
    const need = row => row.reduce((a, it) => a + leftOf(it) + HEAD_R, 0);
    const gap = Math.max(MIN_GAP, Math.min(...rows.map(row => (avail - need(row)) / row.length)));
    let html = '';
    rows.forEach((row, ri) => {
      let x = CLEF + gap / 2;
      const items = row.map(it => { x += leftOf(it); const at = x; x += HEAD_R + gap; return {n: it.show, x: at, id: 'fr' + it.key, caption: it.label}; });
      const first = list.indexOf(row[0]) + 1;
      const what = isChromatic() ? `Notes ${first} to ${first + row.length - 1}` : (row[0] === list[0] || list.indexOf(row[0]) < scaleObj.up.length ? 'Going up' : 'Coming down');
      html += A.staffSVG(member.clef, items, {width: W, keySig: sig, sigStyle: 'big', label: `${what}: ` + row.map(it => it.label).join(', ')});
    });
    box.innerHTML = html;
    fullFound.forEach(k => A.colorNote('fr' + k, GOLD));
    markHeard(heard, true); markCursor();
    $('dirSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.down === String(down)));
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
      if (fullFound.size === list.length) A.Sfx.event('all-notes-found');   // no sound per note: it would deafen the detector mid-scale
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
    if (unpitched) m = 'art';                                          // the snare drum: articulation only
    const was = mode;
    mode = m; if (!unpitched) A.store.setCheckerMode(m);
    document.querySelectorAll('.mode-btn').forEach(b => { b.setAttribute('aria-pressed', b.dataset.mode === m); b.hidden = unpitched && b.dataset.mode !== 'art'; });
    $('fivePanel').hidden = m !== 'five'; $('fullPanel').hidden = m === 'five' || m === 'art'; $('artPanel').hidden = m !== 'art';
    $('foundRow').hidden = m === 'art';
    document.querySelector('.readout').hidden = m === 'art' && unpitched;
    $('demoHelp').hidden = !A.DEMO; $('artDemo').hidden = !A.DEMO;
    A.Pitch.demoAttacks = m === 'art';
    hint('');
    if (was !== m) { fullFound = new Set(); heard = null; }
    if (m === 'five' || m === 'art') { A.Pitch.setRange(null); if (m === 'five') draw(); else artReset(); }
    else { member = A.currentMember(); setupFull(); }
  }
  document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode !== mode) setMode(b.dataset.mode);
    if (A.DEMO && mode === 'art') b.blur();                            // ?demo: Space is an attack here, not a button press
  }));

  /* ---------- ARTICULATION: count every attack ---------- */
  let artN = 0, artTimes = [], artHeldSince = 0, lastAttackAt = 0;
  function artReset() { artN = 0; artTimes = []; $('artCount').textContent = '0'; $('artNote').innerHTML = '&nbsp;'; $('artRate').innerHTML = '&nbsp;'; $('artHint').innerHTML = '&nbsp;'; }
  if (unpitched) { $('artLede').textContent = 'Play single strokes on the snare. Every hit the mic catches counts.'; $('artTip').textContent = 'Strike each hit cleanly, and let the drum ring between hits.'; }
  $('artReset').addEventListener('click', artReset);
  const demoT = () => unpitched ? null : {pc: inst.targetPc[0], midi: 60 + inst.targetPc[0]};   // ?demo: Space plays the first of the five
  A.Pitch.onAttack(a => {
    if (!on() || mode !== 'art') return;
    artN++; lastAttackAt = a.time;
    const c = $('artCount'); c.textContent = artN; c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
    $('artNote').textContent = unpitched ? 'Hit!' : a.pc === null ? 'no clear pitch' : inst.writtenName(a.pc);
    artTimes.push(a.time); artTimes = artTimes.filter(t => a.time - t < 2000);
    $('artRate').textContent = artTimes.length > 1 ? `${(1000 * (artTimes.length - 1) / (a.time - artTimes[0])).toFixed(1)} per second` : '\u00a0';
    $('artHint').innerHTML = '&nbsp;';
  });
  $('dirSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { const d = b.dataset.down === 'true'; if (d !== down) { down = d; drawFull(); } }));
  let lastW = 0;
  addEventListener('resize', () => { const w = $('fullStaff').clientWidth; if (on() && mode !== 'five' && w !== lastW) { lastW = w; drawFull(); } });

  /* THE TOOLBOX (toolbox.js): this tab listens; entering it sets its range again (the Tuner sets its own), and the
     microphone prompt shows from toolbox.js (the tap on it counts as the gesture iPads need) */
  T.register('checker', {
    listens: true,
    enter() { A.Pitch.demoTarget = demoT; setMode(mode); if (mode !== 'five') { lastW = 0; drawFull(); } },
    leave() { A.Pitch.demoAttacks = false; A.Pitch.demoNote = null; A.Pitch.setRange(null); },
  });

  $('ckReset').addEventListener('click', () => {
    if (mode === 'five') { found = new Set(); draw(); }
    else { fullFound = new Set(); hint(''); drawFull(); }
  });

  A.Pitch.onHeld((pc, now, note) => {
    if (!on()) return;
    if (mode !== 'five') { if (member) fullHeld(note); return; }
    const i = inst.targetPc.indexOf(pc);
    if (i >= 0 && !found.has(i)) { found.add(i); draw(); if (found.size === 5) A.Sfx.event('all-notes-found'); }
  });

  A.Pitch.onFrame((r, level, now) => {
    if (!on()) return;
    if (mode === 'art') {
      const held = r || A.Pitch.demoHeld();
      if (held) { if (!artHeldSince) artHeldSince = now; } else artHeldSince = 0;
      if (held && now - Math.max(artHeldSince, lastAttackAt) > 1000) $('artHint').textContent = unpitched ? 'Hit again!' : 'Tongue each note: ta ta ta ta.';
    }
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
  });

  /* ---------- ?demo in full range: ↑/↓ pick a note, hold Space to "play" it (Shift+Space: an octave low) ---------- */
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (!on() || mode === 'five' || mode === 'art' || !member || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
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
    addEventListener('keyup', e => { if (on() && e.key === ' ' && A.Pitch.demoNote !== null) { e.preventDefault(); A.Pitch.demoNote = null; } });
  }
})(window.Arcade);
