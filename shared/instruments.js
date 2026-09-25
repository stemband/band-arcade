/* Band Arcade — instruments and note helpers.
   This is the single source of truth for instrument groups and transpositions.
   Every game reads from here; never copy this table into a game. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  const NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];  // pitch-class names (flats preferred, as in band parts)
  const LETTER_PC = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
  const STEP_OF   = {C:0, D:1, E:2, F:3, G:4, A:5, B:6};

  const mod12 = x => ((x % 12) + 12) % 12;
  const mtof  = m => 440 * Math.pow(2, (m - 69) / 12);

  /** "Bb4" -> {letter:'B', acc:-1, oct:4} */
  function parseNote(s) {
    const m = s.match(/^([A-G])(b|#)?(\d)$/);
    return {letter: m[1], acc: m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0, oct: +m[3]};
  }
  const noteLabel   = n => n.letter + (n.acc < 0 ? '♭' : n.acc > 0 ? '♯' : '');
  const writtenMidi = n => (n.oct + 1) * 12 + LETTER_PC[n.letter] + n.acc;
  const stepOf      = n => n.oct * 7 + STEP_OF[n.letter];   // diatonic staff position

  /*
    Each group (matches the instrument picker Mat uses in class):
      clef     'treble' | 'bass'
      t        semitones the part is written ABOVE concert pitch (pitch class only)
      written  the first five notes as they appear on the student's part
      range    rough sounding MIDI range; only used to tune the pitch detector
    The concert pitches the game listens for are computed from written + t.
  */
  const INSTRUMENTS = [
    {id:'flute', name:'Flute, Oboe, Colored Tone Bells',          clef:'treble', t:0, written:['Bb4','C5','D5','Eb5','F5'], range:[70,89]},
    {id:'bells', name:'Orchestral Bells / Bell Kit',              clef:'treble', t:0, written:['Bb4','C5','D5','Eb5','F5'], range:[94,101]},
    {id:'alto',  name:'Alto Saxophone',                           clef:'treble', t:9, written:['G4','A4','B4','C5','D5'],   range:[58,65]},
    {id:'bari',  name:'Baritone Saxophone',                       clef:'treble', t:9, written:['G4','A4','B4','C5','D5'],   range:[46,53]},
    {id:'bb',    name:'Trumpet, Clarinet, Tenor Saxophone',       clef:'treble', t:2, written:['C4','D4','E4','F4','G4'],   range:[46,65]},
    {id:'hornF', name:'French Horn (F, G, A, B♭, C)',             clef:'treble', t:7, written:['F4','G4','A4','Bb4','C5'],  range:[58,65]},
    {id:'hornC', name:'French Horn (C, D, E, F, G)',              clef:'treble', t:7, written:['C5','D5','E5','F5','G5'],   range:[65,72]},
    {id:'bcl',   name:'Bass Clarinet & Baritone T.C.',            clef:'treble', t:2, written:['C4','D4','E4','F4','G4'],   range:[46,53]},
    {id:'low',   name:'Trombone, Baritone, Euphonium, Bassoon',   clef:'bass',   t:0, written:['Bb2','C3','D3','Eb3','F3'], range:[46,53]},
    {id:'tuba',  name:'Tuba',                                     clef:'bass',   t:0, written:['Bb1','C2','D2','Eb2','F2'], range:[34,41]},
  ];

  INSTRUMENTS.forEach(inst => {
    inst.notes    = inst.written.map(parseNote);
    inst.targetPc = inst.notes.map(n => mod12(writtenMidi(n) - inst.t));  // concert pitch classes to listen for
    inst.minF     = mtof(inst.range[0]) * 0.78;
    inst.maxF     = Math.min(7000, mtof(inst.range[1]) * 2.3);
    inst.writtenName = pc => NAMES[mod12(pc + inst.t)];                 // concert pc -> name on the student's part
    inst.concertLabel = inst.targetPc.map(pc => NAMES[pc]).join(' ');
    inst.shortName = inst.name.split(/[,/&(]/)[0].trim();
  });

  A.music = {NAMES, parseNote, noteLabel, writtenMidi, stepOf, mod12, mtof};
  A.INSTRUMENTS = INSTRUMENTS;
  A.getInstrument = id => INSTRUMENTS.find(i => i.id === id) || null;
})(window.Arcade);
