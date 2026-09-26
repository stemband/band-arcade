/* Band Arcade — scales (GMEA All-State middle school scale requirements). Used by every game and the Note Checker.
   Five choices: Concert B♭, E♭, F and A♭ major (one octave, up then down: 8 + 7 = 15 notes) and Chromatic
   (the instrument's whole GMEA chromatic range from instruments.js, sharps going up, flats going down).
   Every scale is built for one instrument MEMBER (instruments.js), written for that instrument:
   transposed with its `sounds` value and spelled in its written key, with the right key signature. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  /*
    STARTING NOTES — the WRITTEN note each scale starts on, for every instrument, in scientific
    pitch notation (middle C = C4). These should match the GMEA scale sheets. To move a scale up
    or down an octave, change its note here (for example trumpet A♭: 'Bb3' -> 'Bb4').
    They were filled in with this rule, until checked against the sheets:
      Concert B♭: the same tonic as the first-five notes (the B♭ scale is the first five continued).
      Other scales: the tonic closest to that B♭ tonic whose whole octave fits the GMEA chromatic range;
      on a tie, the higher one for low brass, tuba and bassoon, the lower one for everyone else.
    An instrument missing here uses that rule.
  */
  const START = {
    //            Concert B♭         Concert E♭         Concert F          Concert A♭
    flute:      { Bb: 'Bb4',         Eb: 'Eb5',         F: 'F4',          Ab: 'Ab4' },
    oboe:       { Bb: 'Bb4',         Eb: 'Eb4',         F: 'F4',          Ab: 'Ab4' },
    tonebells:  { Bb: 'Bb4',         Eb: 'Eb5',         F: 'F4',          Ab: 'Ab4' },
    bells:      { Bb: 'Bb4',         Eb: 'Eb4',         F: 'F4',          Ab: 'Ab4' },
    altosax:    { Bb: 'G4',          Eb: 'C5',          F: 'D4',          Ab: 'F4'  },
    barisax:    { Bb: 'G4',          Eb: 'C5',          F: 'D4',          Ab: 'F4'  },
    trumpet:    { Bb: 'C4',          Eb: 'F4',          F: 'G3',          Ab: 'Bb3' },
    clarinet:   { Bb: 'C4',          Eb: 'F4',          F: 'G3',          Ab: 'Bb3' },
    tenorsax:   { Bb: 'C4',          Eb: 'F4',          F: 'G4',          Ab: 'Bb4' },
    horn:       { Bb: 'F4',          Eb: 'Bb3',         F: 'C4',          Ab: 'Eb4' },
    basscl:     { Bb: 'C4',          Eb: 'F4',          F: 'G3',          Ab: 'Bb3' },
    baritonetc: { Bb: 'C4',          Eb: 'F4',          F: 'G3',          Ab: 'Bb3' },
    trombone:   { Bb: 'Bb2',         Eb: 'Eb3',         F: 'F2',          Ab: 'Ab2' },
    euphbc:     { Bb: 'Bb2',         Eb: 'Eb3',         F: 'F2',          Ab: 'Ab2' },
    bassoon:    { Bb: 'Bb2',         Eb: 'Eb3',         F: 'F2',          Ab: 'Ab2' },
    tuba:       { Bb: 'Bb1',         Eb: 'Eb2',         F: 'F1',          Ab: 'Ab1' },
  };
  const LOW_REGISTER = ['trombone', 'euphbc', 'baritonetc', 'tuba', 'bassoon'];   // ties go up an octave

  const LIST = [
    {id: 'Bb', concert: 'B♭', pc: 10},
    {id: 'Eb', concert: 'E♭', pc: 3},
    {id: 'F',  concert: 'F',  pc: 5},
    {id: 'Ab', concert: 'A♭', pc: 8},
    {id: 'chrom', concert: null},
  ];

  const {parseNote, noteLabel, writtenMidi, mod12} = A.music;
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], LETTER_PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
  // major keys by tonic pitch class, spelled the usual way (never more than 6 sharps or flats)
  const KEYS = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
  const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'], FLAT_KEYS = ['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'];
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

  /** key signature of a major key: {type: '#'|'b', count} (count 0 = C major) */
  function keySignature(tonic) {
    const name = noteLabel(tonic);
    let i = SHARP_KEYS.indexOf(name);
    if (i > 0) return {type: '#', count: i};
    i = FLAT_KEYS.indexOf(name);
    return {type: 'b', count: Math.max(0, i)};
  }
  /** the accidental a key signature gives a letter: +1, -1 or 0 */
  function sigAcc(sig, letter) {
    if (!sig || !sig.count) return 0;
    return sig.type === '#' ? (SHARP_ORDER.slice(0, sig.count).includes(letter) ? 1 : 0)
                            : (FLAT_ORDER.slice(0, sig.count).includes(letter) ? -1 : 0);
  }
  /** how to DRAW a note under a key signature: the accidental only where the key doesn't already give it */
  function shown(n, sig) {
    if (!sig) return n;
    const a = n.acc === sigAcc(sig, n.letter) ? 0 : n.acc;
    return {letter: n.letter, acc: a, oct: n.oct, natural: a === 0 && n.acc === 0 && sigAcc(sig, n.letter) !== 0};
  }

  /** the written tonic pitch class of a concert scale for a member */
  const writtenPc = (m, s) => mod12(s.pc + m.sounds);
  const fits = (m, midi) => midi >= m.lowMidi && midi + 12 <= m.highMidi;

  /** the rule (see START): the member's written starting midi for scale s */
  function ruleStart(m, s) {
    const inst = A.getInstrument(m.group);
    const bbPc = writtenPc(m, LIST[0]);
    const five = writtenMidi(inst.notes[0]);
    const closest = (pc, near) => {
      let best = null;
      for (let w = m.lowMidi; w <= m.highMidi; w++) {
        if (mod12(w) !== pc || !fits(m, w)) continue;
        const d = Math.abs(w - near);
        if (best === null || d < Math.abs(best - near) ||
            (d === Math.abs(best - near) && (LOW_REGISTER.includes(m.id) ? w > best : w < best))) best = w;
      }
      return best;
    };
    const bb = mod12(five) === bbPc && fits(m, five) ? five : closest(bbPc, five);
    return s.id === 'Bb' ? bb : closest(writtenPc(m, s), bb);
  }

  /** the written starting midi for a member and scale: the START table if it has a usable entry, else the rule */
  function startMidi(m, s) {
    const t = START[m.id] && START[m.id][s.id];
    if (t) {
      const w = writtenMidi(parseNote(t));
      if (mod12(w) === writtenPc(m, s)) return w;
      if (window.console) console.warn(`scales.js: START ${m.id} ${s.id} = ${t} is not the right key; using the rule`);
    }
    return ruleStart(m, s);
  }

  /** spell a one-octave major scale from a written tonic midi */
  function majorScale(tonicMidi) {
    const [tl, ta] = KEYS[mod12(tonicMidi)];
    const tOct = Math.floor((tonicMidi - LETTER_PC[tl] - ta) / 12) - 1;
    const li = LETTERS.indexOf(tl);
    return MAJOR.map((iv, i) => {
      const letter = LETTERS[(li + i) % 7], oct = tOct + Math.floor((li + i) / 7);
      const midi = tonicMidi + iv;
      return {letter, acc: midi - ((oct + 1) * 12 + LETTER_PC[letter]), oct, midi};
    });
  }

  /**
   * Build a scale for a member. Returns
   *   {id, name ('Concert E♭'), label ('Concert E♭ (your F Major)'), short ('E♭'), key ('F Major') | null,
   *    sig {type, count} | null, up: [...], notes: [...up, then down]}
   * Each note: {letter, acc, oct, midi (written), sounding (midi), pc (concert pitch class), show (how to draw it)}
   */
  function build(m, id) {
    const s = LIST.find(x => x.id === id) || LIST[0];
    let up, down, sig = null, key = null;
    if (s.id === 'chrom') {
      up = A.chromaticScale(m);
      down = A.chromaticScale(m, {down: true}).slice(1);
    } else {
      up = majorScale(startMidi(m, s));
      down = up.slice(0, -1).reverse();
      sig = keySignature(up[0]);
      key = noteLabel(up[0]) + ' Major';
    }
    const dress = n => Object.assign({}, n, {sounding: n.midi - m.sounds, pc: mod12(n.midi - m.sounds), show: shown(n, sig)});
    up = up.map(dress);
    const notes = up.concat(down.map(dress));
    const name = s.id === 'chrom' ? 'Chromatic' : 'Concert ' + s.concert;
    return {id: s.id, name, short: s.concert || 'Chromatic', key, sig, up, notes,
            label: key ? `${name} (your ${key})` : `Chromatic (${noteLabel(up[0])}${up[0].oct} to ${noteLabel(up[up.length - 1])}${up[up.length - 1].oct})`};
  }

  /** a scale sequence at least `count` notes long: the scale up and down, then again from the second note */
  function sequence(scale, count) {
    const out = scale.notes.slice();
    while (out.length < count) out.push(...scale.notes.slice(1));
    return out;
  }

  /** where a game saves progress for a scale (random mode keeps the plain game id) */
  const progressKey = (gameId, scaleId) => `${gameId}:scale-${scaleId}`;

  A.Scales = {LIST, START, build, sequence, progressKey, keySignature, sigAcc, shown, ruleStart, startMidi};
})(window.Arcade);
