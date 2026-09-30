/* Music Highway: THE SONG ENGINE. Turns a song from songs.js (scale degrees in a concert key) into what one
   instrument plays: timed notes with the WRITTEN note (spelled in that instrument's key), its concert pitch class
   (what the microphone hears), the octave that fits the instrument, fingerings, and the chords for headphones mode.
   Loaded by the game (game.js) and the Song Board (songs.html). Needs shared/instruments.js (+ fingerings.js and
   diagrams.js for the fingering cards).

     Arcade.SongMap.check(song)                -> [problems] (a measure that doesn't add up, a bad degree)
     Arcade.SongMap.events(song)               -> [{i, t, beats, measure, deg, oct, acc, tied?, slur, slurFirst?, slurLast?} | {rest}] in beats from the start
                                                  (a tied pair (NOTE TEXT '~') = one note)
     Arcade.SongMap.concert(song, {shift})     -> the same notes with `concert` (midi) and `pc`; shift = semitones the
                                                  whole song moves (the C–G horn plays it in concert F: shift −5)
     Arcade.SongMap.forMember(song, member, group, {hornSide, sticking}) -> the song for one instrument:
         {notes: [{i, t, beats, measure, pc, concert, midi (written), n (written note), show, label, fing, deg}],
          rests: [{t, beats, measure}], sig ({type, count} | null), clef, shift, keyName ('Concert B♭'), writtenKey ('C major'), unpitched,
          chords: [{measure, root, tones: [concert midis], name}], beatsPerMeasure, measures}
         the snare (unpitched): every note has pc null, no written note; the rhythm is the same.
     Arcade.SongMap.fitOctave(...)             the octave rule (below)
     Arcade.SongMap.lanes(song, map, group)    -> THE PITCH LANES of the highway: {lanes: [{midis, label, count}], of(note)}
                                                  (low = left; see LANES below)
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
  // the relative minor of a major key (by the major's pitch class), spelled from its letter: E♭ → C, F → D, B♭ → G, A → F♯
  const minorLabel = pc => { const li = (LETTERS.indexOf(KEYS[pc][0]) + 5) % 7, acc = ((pc + 9 - LETTER_PC[li]) % 12 + 18) % 12 - 6;
    return LETTERS[li] + (acc < 0 ? '♭' : acc > 0 ? '♯' : ''); };

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
    // a tie ('~') must lead into the same note (degree, octave, accidental)
    const seq = (song.notes || []).filter(n => !n.bar);
    seq.forEach((n, k) => { if (!n.tie) return; const x = seq[k + 1];
      if (!x || x.rest != null || x.deg !== n.deg || (x.oct || 0) !== (n.oct || 0) || (x.acc || 0) !== (n.acc || 0)) out.push(`${song.id}: note ${k + 1} is tied (~) but the next note isn't the same note`); });
    // slurs: the NOTE TEXT reader's own reports (an unclosed '(', a ')' with no '(', a slur in a slur…)
    (song.notes && song.notes.problems || []).forEach(p => out.push(`${song.id}: ${p}`));
    if (Math.abs(t - Math.round(t / per) * per) > 1e-6) out.push(`${song.id}: the last measure has ${+(t % per).toFixed(3)} of ${per} beats`);
    if (song.sticking) { const n = String(song.sticking).toUpperCase().replace(/[^RL]/g, '').length, k = events(song).filter(x => !x.rest).length;   // a tied pair = one note
      if (n !== k) out.push(`${song.id}: sticking has ${n} letters for ${k} notes`); }
    if (song.tier === 1) (song.notes || []).forEach(n => { if (n.deg && (n.deg > 5 || n.oct || n.acc)) out.push(`${song.id}: tier 1 uses only degrees 1–5 in the first octave`); });
    return [...new Set(out)];
  }

  /** timed notes (beats from the start of the song). TIES: a note with `tie` and the same note after it become ONE
      note (its beats added; the measure it starts in); the notation draws the tie where a bar line cuts it. */
  function events(song) {
    const per = beatsPer(song), out = [];
    let t = 0, i = 0, held = null;
    (song.notes || []).forEach(n => {
      if (n.bar) return;
      if (n.rest != null) { held = null; out.push({rest: true, t, beats: n.rest, measure: Math.floor(t / per + 1e-6) + 1}); t += n.rest; return; }
      const same = held && held.deg === n.deg && held.oct === (n.oct || 0) && held.acc === (n.acc || 0);
      if (same) { held.beats += n.beats; held.tied = (held.tied || 1) + 1; if (held.slur == null && n.slur != null) held.slur = n.slur; }
      else out.push(held = {i: i++, t, beats: n.beats, deg: n.deg, oct: n.oct || 0, acc: n.acc || 0, measure: Math.floor(t / per + 1e-6) + 1, slur: n.slur != null ? n.slur : null});
      if (!n.tie) held = null;
      t += n.beats;
    });
    // SLURS: each slurred note knows its group (`slur`), whether it starts it (`slurFirst`: its attack is the
    // group's one tongued note) and whether it ends it (`slurLast`)
    const bySlur = {};
    out.forEach(e => { if (e.slur != null) (bySlur[e.slur] = bySlur[e.slur] || []).push(e); });
    Object.values(bySlur).forEach(g => {
      if (g.length < 2) { g.forEach(e => { e.slur = null; }); return; }
      g[0].slurFirst = true; g[g.length - 1].slurLast = true;
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
      // a chord the song writes keeps its own name ('v' in a natural-minor song is a minor v: its triad is the scale's own)
      out.push({measure: m, deg, root: tones[0], tones, name: given && given[m - 1] ? given[m - 1] : (song.mode === 'minor' && deg !== 5 ?['i', 'ii', 'III', 'iv', 'v', 'VI', 'VII'] : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'])[deg - 1]});
    }
    return out;
  }

  /** the song for one instrument member (see the top) */
  /* STICKING (the snare): the song's own `sticking` (R/L letters, one per note in order; spaces and | are ignored) when
     it has one, else the student's pattern: 'alternate' (hand to hand note by note, every measure starts with R; rests
     don't count) | 'downbeats' (a note on a beat = R, off the beat (the "&", "e", "a") = L). A long note (a roll, a half
     note) just takes the hand the rule gives it. */
  function stickings(song, notes, pattern) {
    const own = song.sticking ? String(song.sticking).toUpperCase().replace(/[^RL]/g, '').split('') : null;
    let m = -1, hand = 0;
    return notes.map((e, i) => {
      if (own && own[i]) return own[i];
      if (pattern === 'downbeats') return Math.abs(e.t - Math.round(e.t)) < 1e-6 ? 'R' : 'L';
      if (e.measure !== m) { m = e.measure; hand = 0; }
      return hand++ % 2 ? 'L' : 'R';
    });
  }
  function forMember(song, member, group, {hornSide = 'F', sticking = 'alternate'} = {}) {
    const unpitched = member.pitched === false || group.pitched === false;
    // a group whose first five don't start on concert B♭ (the C–G horn: concert F) gets the song moved by that same
    // interval, whatever key the song is in (B♭ songs → F, E♭ songs → A♭); every other group plays the song's own key
    let shift = 0;
    if (!unpitched && group.targetPc && group.targetPc.length) {
      shift = mod12(group.targetPc[0] - KEY_PC.Bb);
      if (shift > 6) shift -= 12;
    }
    const list = concert(song, {shift});
    const concertKeyPc = mod12(KEY_PC[song.key || 'Bb'] + shift);
    const rests = list.filter(e => e.rest).map(e => ({t: e.t, beats: e.beats, measure: e.measure}));
    const base = {beatsPerMeasure: beatsPer(song), measures: Math.ceil((list.total || 0) / beatsPer(song) - 1e-6), total: list.total, shift, unpitched, rests,
      keyName: 'Concert ' + keyLabel(concertKeyPc) + (song.mode === 'minor' ? ' (' + minorLabel(concertKeyPc) + ' minor)' : ''),
      chords: chordsFor(song, list, tonicMidi(song, shift) + (song.mode === 'minor' ? 0 : 0))};
    if (unpitched) {
      const ns = list.filter(e => !e.rest), st = stickings(song, ns, sticking);
      return Object.assign(base, {clef: null, sig: null, writtenKey: '', sticking: song.sticking ? 'song' : sticking,
        notes: ns.map((e, i) => Object.assign({}, e, {pc: null, concert: null, midi: null, stick: st[i], slur: null, slurFirst: false, slurLast: false}))});   // the snare ignores slurs
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
    return Object.assign(base, {clef: group.clef, sig, octave: k, writtenKey: song.mode === 'minor' ? minorLabel(wKey) + ' minor' : keyLabel(wKey) + ' major', notes, diagram: table ? table.diagram : 'none'});
  }

  /* LANES: one highway lane per written pitch, lowest on the left, so the melody's shape shows on the road.
     Tier 1 = exactly the group's first five notes (even when a song leaves one out: beginners always see their five);
     tiers 2 / 3 = every pitch the song uses, at most MAX_LANES[tier]: past that, the least-used pitch joins its
     nearest neighbor's lane (order kept). The snare: two STICKING lanes, L (left hand) and R (right hand). A lane's label = its pitch's written name (a lane of
     two merged pitches: both, "E/F"; more: the most-used one's). */
  const MAX_LANES = {1: 5, 2: 8, 3: 12};
  function lanes(song, map, group) {
    if (map.unpitched) return {lanes: [{midis: [], label: 'L', count: map.notes.filter(n => n.stick === 'L').length}, {midis: [], label: 'R', count: map.notes.filter(n => n.stick === 'R').length}],
      of: n => n.stick === 'R' ? 1 : 0};                          // the snare: two sticking lanes, L on the left, R on the right
    let L;
    if (song.tier === 1 && group && group.notes && group.notes.length >= 5) {
      L = group.notes.slice(0, 5).map(n => ({midis: [writtenMidi(n)], label: noteLabel(n), count: 0}));
    } else {
      const by = {};
      map.notes.forEach(n => { by[n.midi] = by[n.midi] || {midis: [n.midi], label: n.label, names: {[n.midi]: n.label}, count: 0}; by[n.midi].count++; });
      L = Object.keys(by).map(Number).sort((a, b) => a - b).map(m => by[m]);
      const max = MAX_LANES[song.tier] || 12;
      while (L.length > max) {
        let i = 0; L.forEach((l, j) => { if (l.count < L[i].count) i = j; });
        const lo = L[i - 1], hi = L[i + 1], mid = x => x.midis.reduce((a, b) => a + b, 0) / x.midis.length, me = mid(L[i]);
        const into = !lo ? hi : !hi ? lo : (me - mid(lo) < mid(hi) - me || (me - mid(lo) === mid(hi) - me && lo.count <= hi.count)) ? lo : hi;
        into.midis = into.midis.concat(L[i].midis).sort((a, b) => a - b);
        Object.assign(into.names, L[i].names);
        if (L[i].count > into.count) into.label = L[i].label;
        into.count += L[i].count; into.merged = true;
        L.splice(i, 1);
      }
    }
    // counts (tier 1) and the lane of any written midi (a note outside every lane: the nearest one)
    const of = n => {
      const m = n.midi != null ? n.midi : n;
      let best = 0, bd = Infinity;
      L.forEach((l, j) => l.midis.forEach(x => { const d = Math.abs(x - m); if (d < bd) { bd = d; best = j; } }));
      return best;
    };
    if (song.tier === 1) map.notes.forEach(n => L[of(n)].count++);
    // a merged lane of two pitches shows both names ("E/F"); more than two: the most-used one's
    L.forEach(l => { if (l.merged && l.midis.length === 2) l.label = l.midis.map(m => l.names[m]).join('/'); });
    return {lanes: L, of};
  }

  A.SongMap = {check, events, concert, forMember, fitOctave, chordsFor, beatsPer, keyLabel, KEYS, lanes, MAX_LANES, stickings};
  // measure problems show in the console (and on the Song Board), so a typo in songs.js is found at once
  if (window.MH_SONGS) window.MH_SONGS.forEach(s => check(s).forEach(p => console.warn('Music Highway songs.js: ' + p)));
})(window.Arcade);
