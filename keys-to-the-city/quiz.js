/* Keys to the City: THE MUSIC MODEL and THE ROUND MAKER (no drawing here, so it can be tested on its own).
   The piano is in CONCERT pitch: a key's midi is what it sounds. Notes are {letter, acc (-1 | 0 | 1), oct}.

     Arcade.KTTC.KEYS                the major keys used: {F, Bb, Eb, Ab, G, D, A}: tonic + key signature
     Arcade.KTTC.scaleOf(key, tonicMidi)   the major scale up one octave from that tonic key: [{midi, n}] (8 notes)
     Arcade.KTTC.spell(midi, how)    a key's name: how = '#' | 'b' | a key id ('F': spelled by that key's scale)
     Arcade.KTTC.showUnder(n, sig)   how a note is drawn under a key signature (no ♭ on a B in F major; ♮ when needed)
     Arcade.KTTC.nameOk(round, letter, acc)   is this a right name for the round's key? (spelling rules, below)
     Arcade.KTTC.round(L, {i, clefPref, prev, rng})   one round of district L (levels.js), round index i
   SPELLING: without a key signature a white key is its plain letter, and a black key takes either name unless the
   level asks for sharps only or flats only ('sharps' | 'flats'; 'flats-any' = flats for the first half, then either).
   With a key signature every name must be the key's own (in F major the black key between A and B is B♭, not A♯). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], LPC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  const mod = (a, n) => ((a % n) + n) % n;
  const midiOf = n => (n.oct + 1) * 12 + LPC[n.letter] + n.acc;
  const parse = s => { const m = /^([A-G])([b#]?)(-?\d)$/.exec(s); return {letter: m[1], acc: m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0, oct: +m[3]}; };
  const isBlack = midi => [1, 3, 6, 8, 10].includes(mod(midi, 12));
  const SIGN = {'-1': '♭', 0: '', 1: '♯'};
  const label = n => n.letter + SIGN[n.acc];

  /* the keys (concert = piano): tonic and signature. Flats B E A D…, sharps F C G… (ui.js draws them in place) */
  const KEYS = {
    F: {tonic: {letter: 'F', acc: 0}, sig: {type: 'b', count: 1}, name: 'F major'},
    Bb: {tonic: {letter: 'B', acc: -1}, sig: {type: 'b', count: 2}, name: 'B♭ major'},
    Eb: {tonic: {letter: 'E', acc: -1}, sig: {type: 'b', count: 3}, name: 'E♭ major'},
    Ab: {tonic: {letter: 'A', acc: -1}, sig: {type: 'b', count: 4}, name: 'A♭ major'},
    G: {tonic: {letter: 'G', acc: 0}, sig: {type: '#', count: 1}, name: 'G major'},
    D: {tonic: {letter: 'D', acc: 0}, sig: {type: '#', count: 2}, name: 'D major'},
    A: {tonic: {letter: 'A', acc: 0}, sig: {type: '#', count: 3}, name: 'A major'},
  };
  const SIG_ORDER = {b: ['B', 'E', 'A', 'D', 'G', 'C', 'F'], '#': ['F', 'C', 'G', 'D', 'A', 'E', 'B']};
  /** the accidental the key signature gives a letter (-1 | 0 | 1) */
  const sigAcc = (sig, letter) => sig && SIG_ORDER[sig.type].slice(0, sig.count).includes(letter) ? (sig.type === 'b' ? -1 : 1) : 0;
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];

  /** a pitch spelled by a key's scale (null when the pitch isn't in the key) */
  function inKey(midi, key) {
    const K = KEYS[key], t = LETTERS.indexOf(K.tonic.letter), tpc = mod(LPC[K.tonic.letter] + K.tonic.acc, 12);
    const deg = MAJOR.indexOf(mod(midi - tpc, 12));
    if (deg < 0) return null;
    const letter = LETTERS[(t + deg) % 7], acc = sigAcc(K.sig, letter);
    return {letter, acc, oct: Math.floor((midi - LPC[letter] - acc) / 12) - 1};
  }
  /** a key's name: '#' / 'b' (a black key's sharp or flat name; a white key is always its letter) or a key id */
  function spell(midi, how) {
    if (KEYS[how]) return inKey(midi, how);
    const pc = mod(midi, 12);
    let letter, acc = 0;
    if (!isBlack(midi)) letter = LETTERS.find(l => LPC[l] === pc);
    else if (how === 'b') { acc = -1; letter = LETTERS.find(l => LPC[l] === pc + 1); }
    else { acc = 1; letter = LETTERS.find(l => LPC[l] === pc - 1); }
    return {letter, acc, oct: Math.floor((midi - LPC[letter] - acc) / 12) - 1};
  }
  /** how to draw a note under a key signature */
  function showUnder(n, sig) {
    const k = sigAcc(sig, n.letter), s = {letter: n.letter, acc: n.acc === k ? 0 : n.acc, oct: n.oct};
    if (n.acc === 0 && k) s.natural = true;
    return s;
  }
  /** the major scale, one octave up from a tonic key */
  function scaleOf(key, tonicMidi) {
    return [0, 2, 4, 5, 7, 9, 11, 12].map(d => ({midi: tonicMidi + d, n: inKey(tonicMidi + d, key)}));
  }
  /** the note a name stands for at this key (the octave that makes the name fit the key's midi) */
  function noteFor(midi, letter, acc) { return {letter, acc, oct: Math.floor((midi - LPC[letter] - acc) / 12) - 1}; }

  /** is (letter, acc) a right name for the round's key? */
  function nameOk(r, letter, acc) {
    const midi = r.target.midi;
    if (mod(LPC[letter] + acc, 12) !== mod(midi, 12)) return false;       // not even that key
    if (r.key) { const k = inKey(midi, r.key); return !!k && k.letter === letter && k.acc === acc; }
    if (!isBlack(midi)) return acc === 0;                                 // a white key: its plain letter (no E♯ / C♭ here)
    if (r.spell === 'sharps') return acc === 1;
    if (r.spell === 'flats') return acc === -1;
    return acc !== 0;
  }

  /* ---------- the round maker ---------- */
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function weighted(rng, w) {
    const ks = Object.keys(w).filter(k => w[k] > 0), tot = ks.reduce((s, k) => s + w[k], 0);
    let x = rng() * tot;
    for (const k of ks) { x -= w[k]; if (x < 0) return k; }
    return ks[ks.length - 1];
  }
  /** the clef of a round: the level's own, or the student's choice ('treble' | 'bass' | 'both') */
  function clefFor(L, clefPref, rng) {
    const list = L.clefs === 'pref' ? (clefPref === 'both' ? ['treble', 'bass'] : [clefPref || 'treble']) : L.clefs;
    return list.length > 1 ? pick(rng, list) : list[0];
  }
  /** the notes (lowest, highest midi) of a clef in district L */
  function rangeOf(L, clef) { const r = L[clef] || L.treble || L.bass; return [midiOf(parse(r[0])), midiOf(parse(r[1]))]; }

  function round(L, {i = 0, clefPref = 'treble', prev = null, rng = Math.random} = {}) {
    const half = i >= Math.floor((L.rounds || 12) / 2);
    let type = weighted(rng, L.types);
    const clef = clefFor(L, clefPref, rng);
    const [lo, hi] = rangeOf(L, clef);
    // key signature: key-signature districts (sigsFirst for the first half), a share of rounds without one
    const sigs = L.keySigs ? (L.sigsFirst && !half ? L.sigsFirst : L.keySigs) : null;
    let key = sigs && rng() >= (L.noSig || 0) ? pick(rng, sigs) : null;
    if (type === 'scale' && !key) key = pick(rng, sigs || ['F', 'G']);
    if (type === 'circuit') key = null;                                   // FULL CIRCUIT: plain names on a plain staff
    const spellMode = L.spell === 'flats-any' ? (half ? 'any' : 'flats') : L.spell || 'any';
    const r = {type, clef, key, sig: key ? KEYS[key].sig : null, keyName: key ? KEYS[key].name : '', spell: spellMode, range: [lo, hi]};
    if (type === 'scale') {
      // a tonic whose octave fits (it may reach a little past the district's top note)
      const tpc = mod(LPC[KEYS[key].tonic.letter] + KEYS[key].tonic.acc, 12);
      const tonics = [];
      for (let m = lo; m <= hi; m++) if (mod(m, 12) === tpc && m + 12 <= hi + 5) tonics.push(m);
      const t = tonics.length ? pick(rng, tonics) : lo + mod(tpc - lo, 12);
      r.scale = scaleOf(key, t);
      r.target = {midi: t, n: r.scale[0].n};
      r.target.show = showUnder(r.target.n, r.sig);
      return r;
    }
    // the key: in range, white/black as the district says, in the key when there's a key signature, not the last one
    let pool = [];
    for (let m = lo; m <= hi; m++) {
      if (key && !inKey(m, key)) continue;
      if (!key && L.keys === 'white' && isBlack(m)) continue;
      pool.push(m);
    }
    if (!key && L.keys === 'black' && rng() < .55) pool = pool.filter(isBlack);   // black-key districts: mostly black keys
    if (pool.length > 1) pool = pool.filter(m => m !== prev);
    const midi = pick(rng, pool);
    const how = key || (spellMode === 'sharps' ? '#' : spellMode === 'flats' ? 'b' : rng() < .5 ? '#' : 'b');
    const n = spell(midi, how);
    r.target = {midi, n, show: showUnder(n, r.sig)};
    // the answer pad needs ♭/♯ when the key is black or the key signature alters it
    r.accs = isBlack(midi) || !!key || L.keys !== 'white';
    return r;
  }

  A.KTTC = {LETTERS, LPC, KEYS, SIGN, midiOf, parse, isBlack, label, inKey, spell, showUnder, scaleOf, noteFor, nameOk, round, rangeOf, clefFor, sigAcc, weighted};
})(window.Arcade);
