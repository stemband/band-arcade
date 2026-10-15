/* PEDAL POINT: THE LEVELS, THE SCORING and the keys (docs/games/pedal-point.md). Levels are saved by NUMBER (1–8):
   never reorder them; add new ones at the end (and raise games.js maxStars).
     name     the card's title          idea  the card's one line          say  the level intro's words
     kind     'match'    tune a drum to the reference (the same pitch)
              'pick'     the target is NAMED: choose a drum whose range has it, then tune it
              'interval' tune a drum an interval away from a reference (`ivs`: half steps; − = below)
              'keys'     a key's TONIC and DOMINANT on two drums (PP_KEYS) from one reference
              'change'   QUICK CHANGE: the drum starts on one note; retune it to the next before the downbeat
     drums    the drums on the stage (ids from drums.js), low to high, left to right
     ref      'any' = ▶ REFERENCE replays any time (it plays once by itself at the start of every round)
              'once' = it plays once, at the start of the round, and never again
     named    true = the target's note name is shown (else the student finds it by ear)
     gauge    THE TUNING GAUGE (the note letter on the rim) shown while tuning
     fine     THE FINE TUNER (the T-handle, ±50 cents) shown. On by DESIGN on every level: on a touchscreen one
              pixel of the pedal is about 3 cents, so the last few cents need the fine tuner (see the doc)
     rounds   tunings in the level (Two-Drum Setup: keys, each scoring both drums)
     bars, beats, tempo (QUICK CHANGE): the rests counted before the downbeat
     steps    (QUICK CHANGE) how far a change moves, in half steps [min, max] */
window.PP_LEVELS = [
  {name: 'Match It', idea: 'One drum. Match the pitch pipe; the gauge helps.', kind: 'match', drums: ['29'], ref: 'any', named: true, gauge: true, fine: true, rounds: 5,
   say: 'Listen to the pitch pipe, tap the drum, and work the pedal until they match. Toe down = higher, heel down = lower. The gauge on the rim shows the nearest note.'},
  {name: 'By Ear', idea: 'The same drum, no gauge. Just your ears.', kind: 'match', drums: ['29'], ref: 'any', named: false, gauge: false, fine: true, rounds: 5,
   say: 'No gauge this time. Tap the drum and the pitch pipe together and listen for the wobble: the slower it beats, the closer you are.'},
  {name: 'Pick Your Drum', idea: 'A note by name: choose the drum that can play it, then tune.', kind: 'pick', drums: ['32', '29', '26', '23'], ref: 'any', named: true, gauge: true, fine: true, rounds: 5,
   say: 'Four drums, four ranges. Bigger drums play lower. Tap the drum that can reach the note, then tune it.'},
  {name: 'Pitch Pipe', idea: 'The pitch pipe plays ONCE. Tune from memory.', kind: 'match', drums: ['29', '26'], ref: 'once', named: false, gauge: false, fine: true, rounds: 5,
   say: 'Like a real rehearsal: you hear the pitch pipe once. Hold the pitch in your head, then tune the lit drum to it.'},
  {name: 'Fifths and Fourths', idea: 'Tune a 5th or a 4th away from a named pitch.', kind: 'interval', ivs: [-7, -5, 5, 7], drums: ['32', '29', '26', '23'], ref: 'any', named: true, gauge: false, fine: true, rounds: 5,
   say: 'Real band tuning: the pitch pipe gives one note, and you tune your drum a fifth or a fourth away. Sing the interval in your head first.'},
  {name: 'Octaves and Fifths', idea: 'A 4th, a 5th or an octave from a pitch heard once.', kind: 'interval', ivs: [-12, -7, -5, 5, 7, 12], drums: ['32', '29', '26', '23'], ref: 'once', named: false, gauge: false, fine: true, rounds: 5,
   say: 'The reference plays once, and only the interval is named. Find the note in your head, then on the drum.'},
  {name: 'Two-Drum Setup', idea: 'A key\'s tonic and dominant on two drums.', kind: 'keys', drums: ['32', '29', '26', '23'], ref: 'once', named: true, gauge: false, fine: true, rounds: 4,
   say: 'Most band pieces want the TONIC and the DOMINANT (do and sol). One reference, then tune both drums. Both are scored.'},
  {name: 'Quick Change', idea: 'Retune before the downbeat: 4 bars of rest.', kind: 'change', drums: ['32', '29', '26', '23'], ref: 'once', named: true, gauge: false, fine: true, rounds: 5,
   bars: 4, beats: 4, tempo: 100, steps: [1, 4],
   say: 'Your part says "change F to G". You hear the new note once, then count 4 bars of rest. Lock in before the downbeat!'},
];

/* THE SCORING: stars from the AVERAGE error of the level's tunings (cents, either way: 100 cents = a half step).
     stars       [1 ★, 2 ★, 3 ★]: an average at or under each number earns that many stars
     bullseye    a tuning this close (cents) plays the sparkle (pp-star) and shows BULLSEYE
     points      a tuning's points = max(0, perfect − perCent × its error); the level's score = their sum (Best)
     lateStars   QUICK CHANGE: a change not locked in before the downbeat (judged where it is then) caps the level
                 at this many stars */
window.PP_SCORING = {stars: [25, 12, 6], bullseye: 3, perfect: 100, perCent: 3, lateStars: 1};

/* the rules of a round */
window.PP_RULES = {
  startAway: 150,           // cents: a round's drum starts at least this far from its target (heel or toe side)
  pipeSec: 2,               // the reference: the pitch pipe held this long (s)
  bothSec: 1.6,             // after LOCK IN: the pitch pipe and the drum together, this long
  pedalStep: 25,            // ↑/↓: the pedal moves this many cents
  fineStep: 2,              // Shift + ↑/↓, and the fine tuner's − / +: this many cents
  finePx: 1.6,              // the fine tuner: px of drag per cent (≈ 160 px for its whole ±50)
};

/* TWO-DRUM SETUP: the keys (concert pitch), their tonic and dominant, and the drums they go on. ref = the one
   reference (the tonic, at the tonic drum's pitch). Saved nowhere: edit freely. */
window.PP_KEYS = [
  {key: 'B♭', tonic: {note: 'Bb2', drum: '29'}, dominant: {note: 'F2', drum: '32'}, ref: 'Bb2'},
  {key: 'E♭', tonic: {note: 'Eb3', drum: '26'}, dominant: {note: 'Bb2', drum: '29'}, ref: 'Eb3'},
  {key: 'F',  tonic: {note: 'F2', drum: '32'},  dominant: {note: 'C3', drum: '26'},  ref: 'F2'},
  {key: 'A♭', tonic: {note: 'Ab2', drum: '29'}, dominant: {note: 'Eb3', drum: '26'}, ref: 'Ab2'},
];

/* FIFTHS AND FOURTHS / OCTAVES AND FIFTHS: the reference pitches (the pitch pipe, said by name). A target is
   reference + interval, and must land in a drum's comfortable middle (drums.js `comfy`). */
window.PP_REFS = ['F2', 'G2', 'A2', 'Bb2', 'C3', 'D3', 'F3', 'G3', 'A3', 'Bb3', 'C4'];
