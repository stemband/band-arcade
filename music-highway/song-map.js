/* Music Highway: THE SONG ENGINE. Turns a song from songs.js (scale degrees in a concert key) into what one
   instrument plays: timed notes with the WRITTEN note (spelled in that instrument's key), its concert pitch class
   (what the microphone hears), the octave that fits the instrument, fingerings, and the chords for headphones mode.
   Loaded by the game (game.js) and the Song Board (songs.html). Needs shared/instruments.js (+ fingerings.js and
   diagrams.js for the fingering cards).

     Arcade.SongMap.check(song)                -> [problems] (a measure that doesn't add up, a bad degree)
     Arcade.SongMap.events(song)               -> [{i, t, beats, measure, deg, oct, acc} | {rest}] in beats from the start
     Arcade.SongMap.concert(song, {shift})     -> the same notes with `concert` (midi) and `pc`; shift = semitones the
                                                  whole song moves (the C–G horn plays it in concert F: shift −5)
     Arcade.SongMap.forMember(song, member, group, {hornSide}) -> the song for one instrument:
         {notes: [{i, t, beats, measure, pc, concert, midi (written), n (written note), show, label, fing, deg}],
          sig ({type, count} | null), clef, shift, keyName ('Concert B♭'), writtenKey ('C major'), unpitched,
          chords: [{measure, root, tones: [concert midis], name}], beatsPerMeasure, measures}
         the snare (unpitched): every note has pc null, no written note; the rhythm is the same.
     Arcade.SongMap.fitOctave(...)             the octave rule (below)
   THE OCTAVE RULE: tier 1 = degree 1 lands exactly on the first note of the student's first five (its written
   note), so a tier-1 song only uses the notes they know. Tiers 2–3 try every octave and keep the one whose notes sit
   best inside the member's GMEA chromatic range and closest to its first five, preferring notes that have a fingering
   in shared/fingerings.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const {parseNote, writtenMidi, mod12, noteLabel} = A.music;
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
  const KEY_PC = {C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11};
  // a major key by pitch class: its tonic's letter + accidental, and its key signature
  const KEYS = {0: ['C', 0, null], 1: ['D', -1, ['b', 5]], 2: ['D', 0, ['#', 2]], 3: ['E', -1, ['b', 3]], 4: ['E', 0, ['#', 4]], 5: ['F', 0, ['b', 1]],
                6: ['G', -1, ['b', 6]], 7: ['G', 0, ['#', 1]], 8: ['A', -1, ['b', 4]], 9: ['A', 0, ['#', 3]], 10: ['B', -1, ['b', 2]], 11: ['B', 0, ['#', 5]]};
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const ORDER = {b: ['B', 'E', 'A', 'D', 'G', 'C', 'F'], '#': ['F', 'C', 'G', 'D', 'A', 'E', 'B']};
  const keyLabel = pc => { const k = KEYS[pc]; return k[0] + (k[1] < 0 ? '♭' : ''); };

  const beatsPer = song => (song.timeSig || [4, 4])[0] * 4 / (song.timeSig || [4, 4])[1];

  /** every measure must add up; returns a list of problems (empty = fine) */
  function check(song) {
    const out = [], per = beatsPer(song);
    let t = 0, m = 1;
    (song.notes || []).forEach(n => {
      if (n.bar) {
        if (Math.abs(t - Math.round(t / per) * per) > 1e-6) out.push(`${song.id}: measure ${m} ends after ${+(t % per).toFixed(3)} of ${per} beats`);
        m = Math.round(t / per) + 1; return;
      }
      if (n.rest == null && !(n.deg >= 1 && n.deg <= 7)) out.push(`${song.id}: "${JSON.stringify(n)}" has no degree 1–7`);
      t += n.rest != null ? n.rest : n.beats;
    });
    if (Math.abs(t - Math.round(t / per) * per) > 1e-6) out.push(`${song.id}: the last measure has ${+(t % per).toFixed(3)} of ${per} beats`);
    if (song.tier === 1) (song.notes || []).forEach(n => { if (n.deg && (n.deg > 5 || n.oct || n.acc)) out.push(`${song.id}: tier 1 uses only degrees 1–5 in the first octave`); });
    return [...new Set(out)];
  }

  /** timed notes (beats from the start of the song) */
  function events(song) {
    const per = beatsPer(song), out = [];
    let t = 0, i = 0;
    (song.notes || []).forEach(n => {
      if (n.bar) return;
      if (n.rest != null) { out.push({rest: true, t, beats: n.rest, measure: Math.floor(t / per + 1e-6) + 1}); t += n.rest; return; }
      out.push({i: i++, t, beats: n.beats, deg: n.deg, oct: n.oct || 0, acc: n.acc || 0, measure: Math.floor(t / per + 1e-6) + 1});
      t += n.beats;
    });
    out.total = t;
    return out;
  }

  /** the concert key's tonic midi (degree 1, octave 0): Bb3 for 'Bb'; a minor song's degree 1 = the relative minor below */
  function tonicMidi(song, shift = 0) {
    const pc = KEY_PC[song.key || 'Bb'];
    let m = 48 + pc + shift;                                // C3..B3 + shift
    if (song.mode === 'minor') m -= 3;                      // the relative minor (in Bb: G)
    return m;
  }
  function concert(song, {shift = 0} = {}) {
    const base = tonicMidi(song, shift), sc = song.mode === 'minor' ? MINOR : MAJOR;
    const ev = events(song), out = ev.map(e => e.rest ? e : Object.assign(e, {concert: base + sc[e.deg - 1] + 12 * e.oct + e.acc, pc: mod12(base + sc[e.deg - 1] + e.acc)}));
    out.total = ev.total;
    return out;
  }

  /* spell a written midi in a written major key (letters follow the scale degree, so the key's accidentals come out right) */
  function spellDeg(w, keyPc, deg, minor) {
    const k = KEYS[keyPc], tl = LETTERS.indexOf(k[0]);
    const li = (tl + (deg - 1) + (minor ? 5 : 0)) % 7, letter = LETTERS[li];
    let oct = Math.floor(w / 12) - 1;
    // the natural letter's midi closest to w
    let best = null;
    for (let o = oct - 1; o <= oct + 1; o++) { const nm = (o + 1) * 12 + LETTER_PC[li]; if (!best || Math.abs(w - nm) < Math.abs(w - best.nm)) best = {o, nm}; }
    const acc = w - best.nm;
    if (Math.abs(acc) > 1) return A.music.spell(w, true);       // a double sharp/flat: plain spelling instead
    return {letter, acc, oct: best.o};
  }
  function keySig(keyPc) { const s = KEYS[keyPc][2]; return s ? {type: s[0], count: s[1]} : null; }
  function showUnder(n, sig) {
    const inSig = sig && ORDER[sig.type].slice(0, sig.count).includes(n.letter) ? (sig.type === 'b' ? -1 : 1) : 0;
    const show = {letter: n.letter, acc: n.acc === inSig ? 0 : n.acc, oct: n.oct};
    if (n.acc === 0 && inSig) show.natural = true;
    return show;
  }

  /** the octave rule (see the top) */
  function fitOctave(song, list, member, group, fingerTable) {
    const first5 = writtenMidi(group.notes[0]);
    if (song.tier === 1) {
      const d1 = list.find(e => !e.rest && e.deg === 1 && !e.oct && !e.acc);
      const ref = d1 ? d1.concert + member.sounds : null;
      if (ref != null) return Math.round((first5 - ref) / 12) * 12;
    }
    const lo = member.lowMidi, hi = member.highMidi, notes = list.filter(e => !e.rest);
    let best = null;
    for (let k = -48; k <= 48; k += 12) {
      let cost = 0;
      notes.forEach(e => {
        const w = e.concert + member.sounds + k;
        if (w < lo) cost += 100 * (lo - w); else if (w > hi) cost += 100 * (w - hi);
        if (w < first5 - 7) cost += 3 * (first5 - 7 - w); else if (w > first5 + 16) cost += 3 * (w - first5 - 16);
        if (fingerTable && !fingerTable.has(w)) cost += 2;
      });
      const mean = notes.reduce((s, e) => s + e.concert + member.sounds + k, 0) / Math.max(1, notes.length);
      cost += Math.abs(mean - (first5 + 5)) * .5;
      if (!best || cost < best.cost) best = {k, cost};
    }
    return best.k;
  }

  /* chords: the song's own ('I IV V I'), else the best of I / IV / V (i / iv / v) for each measure's melody */
  const ROMAN = {i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7};
  function chordsFor(song, list, base) {
    const per = beatsPer(song), sc = song.mode === 'minor' ? MINOR : MAJOR;
    const measures = Math.ceil((list.total || 0) / per - 1e-6);
    const given = song.chords ? String(song.chords).split(/[\s|]+/).filter(Boolean) : null;
    const triad = d => [0, 2, 4].map(s => { const idx = d - 1 + s; return base + sc[idx % 7] + 12 * Math.floor(idx / 7); });
    const out = [];
    let prev = 1;
    for (let m = 1; m <= measures; m++) {
      let deg;
      if (given && given[m - 1]) deg = ROMAN[given[m - 1].replace(/[^ivIV]/g, '').toLowerCase()] || 1;
      else if (m === measures) deg = 1;
      else {
        const inM = list.filter(e => !e.rest && e.measure === m);
        let bestD = prev, bestS = -1;
        [1, 4, 5].forEach(d => {
          const pcs = triad(d).map(mod12);
          let s = 0; inM.forEach(e => { if (pcs.includes(e.pc)) s += e.beats * (Math.abs(e.t % per) < 1e-6 ? 1.5 : 1); });
          if (d === prev) s += .01; if (d === 1) s += .005;
          if (s > bestS) { bestS = s; bestD = d; }
        });
        deg = bestD;
      }
      prev = deg;
      const tones = triad(deg);
      out.push({measure: m, deg, root: tones[0], tones, name: (song.mode === 'minor' && deg !== 5 ? ['i', 'ii', 'III', 'iv', 'v', 'VI', 'VII'] : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'])[deg - 1]});
    }
    return out;
  }

  /** the song for one instrument member (see the top) */
  function forMember(song, member, group, {hornSide = 'F'} = {}) {
    const unpitched = member.pitched === false || group.pitched === false;
    // move the song to the group's first five when its tonic isn't concert B♭ (the C–G horn: concert F)
    let shift = 0;
    if (!unpitched && group.targetPc && group.targetPc.length) {
      shift = mod12(group.targetPc[0] - KEY_PC[song.key || 'Bb']);
      if (shift > 6) shift -= 12;
    }
    const list = concert(song, {shift});
    const concertKeyPc = mod12(KEY_PC[song.key || 'Bb'] + shift);
    const base = {beatsPerMeasure: beatsPer(song), measures: Math.ceil((list.total || 0) / beatsPer(song) - 1e-6), total: list.total, shift, unpitched,
      keyName: 'Concert ' + keyLabel(concertKeyPc) + (song.mode === 'minor' ? ' (' + keyLabel(mod12(concertKeyPc + 9)) + ' minor)' : ''),
      chords: chordsFor(song, list, tonicMidi(song, shift) + (song.mode === 'minor' ? 0 : 0))};
    if (unpitched) {
      let hand = 0;
      return Object.assign(base, {clef: null, sig: null, writtenKey: '', notes: list.filter(e => !e.rest).map(e => Object.assign({}, e, {pc: null, concert: null, midi: null, stick: (hand++ % 2) ? 'L' : 'R'}))});
    }
    const table = A.Masher && window.MASHER_FINGERINGS ? A.Masher.table(member) : null;
    const k = fitOctave(song, list, member, group, table);
    const wKey = mod12(concertKeyPc + member.sounds), sig = keySig(wKey);
    const notes = list.filter(e => !e.rest).map(e => {
      const w = e.concert + member.sounds + k;
      const n = spellDeg(w, wKey, e.deg, song.mode === 'minor');
      const fs = table ? table.notes(w) : [];
      let fing = fs[0] || null;
      if (fing && member.id === 'horn' && hornSide === 'Bb') fing = fs.find(f => /^T/.test(String(f.raw))) || fing;
      return Object.assign({}, e, {concert: e.concert + k, midi: w, n, show: showUnder(n, sig), label: noteLabel(n), fing, fings: fs});
    });
    return Object.assign(base, {clef: group.clef, sig, octave: k, writtenKey: keyLabel(wKey) + ' major', notes, diagram: table ? table.diagram : 'none'});
  }

  A.SongMap = {check, events, concert, forMember, fitOctave, chordsFor, beatsPer, keyLabel, KEYS};
  // measure problems show in the console (and on the Song Board), so a typo in songs.js is found at once
  if (window.MH_SONGS) window.MH_SONGS.forEach(s => check(s).forEach(p => console.warn('Music Highway songs.js: ' + p)));
})(window.Arcade);
