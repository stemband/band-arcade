/* Rhythm Dojo level design. Tweak freely; the game reads everything from here.
   Rhythms are written in the text format of shared/counting.js (one MEASURE per string):
     w h q e s = whole, half, quarter, eighth, sixteenth · a dot after = dotted (q.) · r = rest (qr, er, h.r)
     _ = tied to the next note (h_) · [e e e] = a triplet · rounds join measures with bar lines
   A LEVEL:
     name      the level's name (its card and the HUD)
     time      '4/4' | '3/4' | '2/4' | '6/8', or a list: the rounds take turns
     cells     the one-measure rhythms a round is built from (per time signature when `time` is a list: {'3/4': […]})
     tempo     beats a minute (6/8: EIGHTH notes a minute: the eighth gets the beat)
     measures  [first round, last round]: how many measures a round has, growing through the level
     tieAcross chance (0–1) that two measures are TIED over the bar line (last note → first note; never rests)
     rounds    rounds in the level (stars from the average accuracy of all of them)
     blurb     one line for the level card
   The COUNTING under the staff (the "Counting" setting AUTO): shown in rounds 1–3, faded in 4–6, hidden in 7–8
   (RD_RULES.fade). SHOW keeps it, HIDE hides it from the start (a small score bonus: RD_RULES.hideBonus).
   Stars are saved by level number: never reorder or remove levels (add new ones at the end). */
window.RD_LEVELS = [
  {name: 'First Steps', time: '4/4', tempo: 80, measures: [1, 2], rounds: 8,
    blurb: 'Quarter notes and quarter rests.',
    cells: ['q q q q', 'q q q qr', 'q qr q q', 'qr q q q', 'q q qr q', 'q qr q qr', 'qr q qr q', 'q q qr qr']},
  {name: 'Long Tones', time: '4/4', tempo: 80, measures: [1, 2], rounds: 8,
    blurb: 'Half notes, whole notes, half and whole rests.',
    cells: ['h h', 'h q q', 'q q h', 'w', 'hr h', 'h hr', 'q qr h', 'h q qr', 'q q hr', 'hr q q']},
  {name: 'Three and Two', time: ['3/4', '2/4'], tempo: 84, measures: [1, 2], rounds: 8,
    blurb: '3/4 and 2/4 time, and dotted half notes.',
    cells: {'3/4': ['h.', 'h q', 'q h', 'q q q', 'qr q q', 'h qr', 'q qr q', 'q q qr'], '2/4': ['q q', 'h', 'qr q', 'q qr']}},
  {name: 'Eighth Pairs', time: '4/4', tempo: 84, measures: [1, 2], rounds: 8,
    blurb: 'Eighth notes in pairs: 1 & 2 &.',
    cells: ['e e q q q', 'q e e q q', 'q q e e q', 'e e e e q q', 'q q e e e e', 'e e q e e q', 'e e h q', 'q e e h', 'e e e e e e e e']},
  {name: 'Lone Eighths', time: '4/4', tempo: 86, measures: [1, 2], rounds: 8,
    blurb: 'Single eighths and eighth rests.',
    cells: ['e er q q q', 'er e q q q', 'q er e q q', 'q e er h', 'er e er e q q', 'e er e er h', 'q q er e q', 'q er e er e q']},
  {name: 'Dotted Quarters', time: '4/4', tempo: 88, measures: [1, 2], rounds: 8,
    blurb: 'Dotted quarter + eighth: 1 (& 2) &.',
    cells: ['q. e q q', 'q. e h', 'q q. e q', 'q q q. e', 'q. e q. e', 'h q. e', 'q. e e e q']},
  {name: 'Off the Beat', time: '4/4', tempo: 88, measures: [1, 2], rounds: 8,
    blurb: 'Syncopation (eighth, quarter, eighth) and ties.',
    cells: ['e q e q q', 'q e q e q', 'e q q q e', 'e q e h', 'h_ q q', 'q q_ q q', 'e e_ e e q q', 'q e e_ e e q', 'e q e e q e']},
  {name: 'Sixteenth Storm', time: '4/4', tempo: 76, measures: [1, 2], rounds: 8,
    blurb: 'Four sixteenths, eighth + two sixteenths, two sixteenths + eighth.',
    cells: ['s s s s q q q', 'q s s s s q q', 'e s s q q q', 's s e q q q', 'e s s e s s q q', 's s e s s e h', 'q e s s s s e q', 's s s s s s s s h']},
  {name: 'Triplet Temple', time: '4/4', tempo: 84, measures: [1, 2], rounds: 8,
    blurb: 'Triplets: 1 la le 2 la le.',
    cells: ['[e e e] q q q', 'q [e e e] q q', '[e e e] [e e e] h', 'q q [e e e] q', '[e e e] q [e e e] q', 'h [e e e] q', '[e e e] h q']},
  {name: 'Six-Eight Swing', time: '6/8', tempo: 132, measures: [1, 2], rounds: 8,
    blurb: '6/8 time: the eighth note gets the beat, 1 2 3 4 5 6.',
    cells: ['q. q.', 'q e q e', 'e e e q.', 'q. e e e', 'h.', 'q e e e e', 'e e e e e e', 'q.r q.', 'er e e q.', 'q e q.']},
  {name: 'Master\'s Scroll', time: '4/4', tempo: 96, measures: [2, 4], rounds: 8, tieAcross: .5,
    blurb: 'Ties across bar lines and everything mixed, 2 to 4 measures.',
    cells: ['q q q q', 'h h', 'q. e q q', 'e q e q q', 'e e q e e q', 's s s s q h', 'q e s s q q', '[e e e] q h', 'h q. e', 'q qr e e q', 'e e_ e e q q', 'w']},
];

window.RD_RULES = {
  /* JUDGING: how far (ms) an attack may be from its note, after the device's timing check is taken off */
  perfectMs: 70,        // PERFECT
  goodMs: 140,          // GOOD
  okMs: 220,            // OK
  lateMs: 360,          // beyond OK up to this: EARLY or LATE (counts a little, shown yellow); farther = not this note
  /* what each result is worth (accuracy = the average; every EXTRA clap/tap counts as one more missed note) */
  value: {perfect: 1, good: .85, ok: .6, early: .3, late: .3, miss: 0},
  /* stars from a level's average accuracy (SLOW gives no stars) */
  oneStar: .6, twoStar: .8, threeStar: .95,
  clearAt: .6,          // a round this good or better turns the round's belt stripe on (just a picture)
  /* the counting in AUTO: shown in rounds 1–fade[0], faded (at fadeOpacity) until fade[1], hidden after */
  fade: [3, 6], fadeOpacity: .28,
  hideBonus: .1,        // HIDE from the start: +10 % score
  slowRate: .8,         // SLOW: 80 % of the tempo (no stars)
  /* CLAP/SNARE mode: an attack within bleedMs of a click the speakers played must be bleedK × louder than the clicks the
     microphone heard during the count-in (headphones mode keeps clicking during the performance). The count-in also
     measures HOW LATE the clicks are heard (any onset within bleedLearnMs of a click; the median is used), so a device
     whose speaker + microphone delay is long still recognizes its own clicks */
  bleedMs: 90, bleedK: 2.2, bleedLearnMs: 250,
  /* THE TIMING CHECK (shared/calibration.js): 4 clicks to listen to, then clap/tap on the next 8 */
  calLead: 4, calClicks: 8, calBpm: 90, calNeed: 5, maxLagMs: 400, calMinSpreadMs: 3, calClickMaxMs: 25, calTooEarlyMs: 120,
  defaultLag: {clap: 60, tap: 40},   // ms, until the timing check has been done
  clickVol: .9, blockVol: .9,
  /* the HEADPHONES check (clap/snare mode, so the clicks can keep going): headCheckClicks clicks while listening; if the
     microphone hears headCheckMax of them or more, the speakers are on and the clicks stop after the count-in */
  headCheckClicks: 4, headCheckMax: 2,
};

/* DOJO MARATHON (the Endless card): random rhythms from the levels' cells, growing longer and harder, the tempo creeping
   up; a round under loseBelow accuracy costs a heart (3). Score = 100 × each note's value, ×2 for a perfect round. */
window.RD_MARATHON = {
  lives: 3,
  loseBelow: .7,
  tempo: [80, 120],       // from, to (reached at `tempoAt` rounds; 6/8 rounds go ×1.65 in eighth notes)
  tempoAt: 24,
  poolEvery: 3,           // every 3 rounds one more level's rhythms join the pool (First Steps first)
  measures: [[0, 1], [6, 2], [14, 3], [22, 4]],   // [from round, measures]
  tieAcrossFrom: 14, tieAcross: .35,
  studyMs: 2600,          // the rhythm shows this long before the count-in starts
  perfectBonus: 2,
};
