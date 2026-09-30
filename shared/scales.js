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

  /*
    THE AUDITION (Scale Audition): the GMEA Middle School All-State / District Honor Band scale audition, from the GMEA
    MS All-State scale sheets (the First Round All-State and the District Honor Band auditions ask the same). THE GMEA
    SHEETS ARE THE SOURCE: when a sheet changes, edit this table, never the game.
      each member: per concert scale [the WRITTEN starting note, octaves (1 | 2)], and `time` = the sheet's limit (s)
      for all four scales. The audition order is always Concert F, B♭, E♭, A♭ (AUDITION_ORDER), not LIST's order.
    A scale is played up and down, then its arpeggio: 1 octave = 1-2-3-4-5-6-7-8-7-6-5-4-3-2-1 + 3-5-8-5-3-1 (21 notes);
    2 octaves = up 2 octaves and down + 3-5-8-10-12-15-12-10-8-5-3-1 (41 notes). audition(member, id) builds it.
    Mallets (bells): the same four scales, 2 octaves each (Mat's rule); played on a bigger instrument than the bell kit,
    so no range check. The chromatic: the member's GMEA chromatic range (instruments.js); mallets: F4–F6 (AUDITION_CHROM).
  */
  const SAX = {F: ['D4', 2], Bb: ['G4', 1], Eb: ['C4', 2], Ab: ['F4', 1], time: 60};
  const TPT = {F: ['G3', 2], Bb: ['C4', 1], Eb: ['F4', 1], Ab: ['Bb3', 1], time: 60};
  const TBN = {F: ['F2', 2], Bb: ['Bb2', 1], Eb: ['Eb3', 1], Ab: ['Ab2', 1], time: 60};
  const AUDITION = {
    //            Concert F        Concert B♭        Concert E♭        Concert A♭        seconds
    flute:      {F: ['F4', 2],  Bb: ['Bb4', 1], Eb: ['Eb4', 2], Ab: ['Ab4', 1], time: 60},
    oboe:       {F: ['F4', 1],  Bb: ['Bb4', 1], Eb: ['Eb4', 1], Ab: ['Ab4', 1], time: 60},
    clarinet:   {F: ['G3', 2],  Bb: ['C4', 2],  Eb: ['F3', 2],  Ab: ['Bb3', 2], time: 75},
    basscl:     {F: ['G3', 2],  Bb: ['C4', 1],  Eb: ['F3', 2],  Ab: ['Bb3', 1], time: 60},
    bassoon:    {F: ['F2', 2],  Bb: ['Bb1', 2], Eb: ['Eb2', 2], Ab: ['Ab2', 1], time: 75},
    altosax: SAX, barisax: SAX,
    tenorsax:   {F: ['G4', 1],  Bb: ['C4', 2],  Eb: ['F4', 1],  Ab: ['Bb4', 1], time: 60},
    trumpet: TPT, baritonetc: TPT,
    horn:       {F: ['C4', 1],  Bb: ['F3', 2],  Eb: ['Bb3', 1], Ab: ['Eb4', 1], time: 60},
    trombone: TBN, euphbc: TBN,
    tuba:       {F: ['F1', 2],  Bb: ['Bb1', 1], Eb: ['Eb2', 1], Ab: ['Ab1', 1], time: 60},
    bells:      {F: ['F4', 2],  Bb: ['Bb3', 2], Eb: ['Eb4', 2], Ab: ['Ab3', 2], time: 60},   // Mat: confirm (no GMEA sheet time for mallets)
  };
  const AUDITION_ORDER = ['F', 'Bb', 'Eb', 'Ab'];
  // the chromatic, audition only: mallets play 2 octaves up and down from concert F (the bells member is unchanged)
  const AUDITION_CHROM = {bells: ['F4', 'F6']};
  // the sheets' rhythm (4/4), only a picture (nothing is judged on it): beats per note, one list per measure. The SAME
  // note values for 1 and 2 octaves (a 2-octave scale just has more measures): scale measures = quarter, 2 eighths,
  // 4 eighths (7 notes); arpeggio measures = quarter, 2 eighths, quarter, 2 eighths (6 notes; the first starts on the
  // scale's last note); a final whole note.
  //   1 octave:  | 1 2 3 4 5 6 7 | 8 7 6 5 4 3 2 | 1 3 5 8 5 3 | 1 |                                (21 notes, 4 bars)
  //   2 octaves: | 1–7 | 8–14 | 15 14 … 9 | 8 7 … 2 | 1 3 5 8 10 12 | 15 12 10 8 5 3 | 1 |       (41 notes, 7 bars)
  const SCALE_BAR = [1, .5, .5, .5, .5, .5, .5], ARP_BAR = [1, .5, .5, 1, .5, .5];
  const RHYTHM = {
    1: [SCALE_BAR, SCALE_BAR, ARP_BAR, [4]],
    2: [SCALE_BAR, SCALE_BAR, SCALE_BAR, SCALE_BAR, ARP_BAR, ARP_BAR, [4]],
  };

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

  /**
   * THE AUDITION SCALE for a member (AUDITION above): {id, name, label, key, sig, octaves, notes, measures}
   * notes: the scale up and down, then its arpeggio, each {letter, acc, oct, midi (written), sounding, pc, show, beats,
   * measure}; measures = how many notes each measure holds (the sheet's 4/4 picture).
   */
  function audition(m, id) {
    const e = AUDITION[m.id], s = LIST.find(x => x.id === id);
    if (!e || !e[id] || !s) return null;
    const [start, octaves] = e[id];
    const t = writtenMidi(parseNote(start));
    const up = majorScale(t).concat(octaves === 2 ? majorScale(t + 12).slice(1) : []);
    const arp = (octaves === 2 ? [2, 4, 7, 9, 11, 14, 11, 9, 7, 4, 2, 0] : [2, 4, 7, 4, 2, 0]).map(i => up[i]);
    const sig = keySignature(up[0]), key = noteLabel(up[0]) + ' Major';
    const beats = [].concat(...RHYTHM[octaves]), bars = RHYTHM[octaves].map(r => r.length);
    let k = 0;
    const measureOf = bars.reduce((a, n, mi) => a.concat(Array(n).fill(mi)), []);
    const notes = up.concat(up.slice(0, -1).reverse(), arp).map(n => Object.assign({}, n, {
      sounding: n.midi - m.sounds, pc: mod12(n.midi - m.sounds), show: shown(n, sig), beats: beats[k], measure: measureOf[k++]}));
    const name = 'Concert ' + s.concert;
    // ARTICULATION, as on the GMEA sheets: tongue going up, slur coming down. slurs = [first, last] note indexes: the
    // scale's top note down to the tonic where the scale ends, then the arpeggio's top note down to the final whole
    // note (the arpeggio going up stays tongued). Mallets can't slur: none.
    const top = 7 * octaves, arpTop = 2 * top + 1 + (octaves === 2 ? 5 : 2);
    const slurs = m.family === 'percussion' ? [] : [[top, 2 * top], [arpTop, notes.length - 1]];
    return {id, name, short: s.concert, key, sig, octaves, notes, measures: bars, slurs, label: `${name} (your ${key})`};
  }
  /** the audition's chromatic scale for a member: its GMEA range (mallets: AUDITION_CHROM), sharps up, flats down */
  function auditionChromatic(m) {
    const o = AUDITION_CHROM[m.id];
    const mm = o ? Object.assign({}, m, {low: parseNote(o[0]), high: parseNote(o[1]), lowMidi: writtenMidi(parseNote(o[0])), highMidi: writtenMidi(parseNote(o[1]))}) : m;
    const up = A.chromaticScale(mm), down = A.chromaticScale(mm, {down: true}).slice(1);
    const notes = up.concat(down).map(n => Object.assign({}, n, {sounding: n.midi - m.sounds, pc: mod12(n.midi - m.sounds), show: n, beats: .5}));
    const lo = up[0], hi = up[up.length - 1];
    return {id: 'chrom', name: 'Chromatic', short: 'Chromatic', key: null, sig: null, notes, slurs: [],   // tongued or slurred: the student's choice
      label: `Chromatic (${noteLabel(lo)}${lo.oct} to ${noteLabel(hi)}${hi.oct})`};
  }
  /** the sheet's time limit (s) for a member */
  const auditionTime = m => (AUDITION[m.id] || {}).time || 60;

  /** a scale sequence at least `count` notes long: the scale up and down, then again from the second note */
  function sequence(scale, count) {
    const out = scale.notes.slice();
    while (out.length < count) out.push(...scale.notes.slice(1));
    return out;
  }

  /** where a game saves progress for a scale (random mode keeps the plain game id) */
  const progressKey = (gameId, scaleId) => `${gameId}:scale-${scaleId}`;

  A.Scales = {LIST, START, build, sequence, progressKey, keySignature, sigAcc, shown, ruleStart, startMidi,
    AUDITION, AUDITION_ORDER, AUDITION_CHROM, audition, auditionChromatic, auditionTime};
})(window.Arcade);
