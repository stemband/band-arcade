/* Keys to the City: THE CITY MAP (the levels). Mat edits this table; the game reads everything from here.
   Levels are saved by NUMBER (district 1, 2, …): never reorder or remove lines, add new ones at the end.

   THE BLACK-KEY GROUPS have exactly two names, everywhere (hints, the Mayor, help text):
     THE CHOPSTICKS = the group of 2 black keys.  C is the white key right next to (just left of) the Chopsticks.
     THE FORK       = the group of 3 black keys.  F is the white key right next to (just left of) the Fork.

   Each district (level):
     name     the district's name              say    the Mayor's line on the level's intro
     rounds   questions in the level (every round: one try; a wrong answer shows the right one, then the next round)
     types    how often each question type comes up (weights): find = FIND THE KEY (a note on the staff → tap its key,
              octave counts), name = NAME THE KEY (a key lights up → tap its letter name), circuit = FULL CIRCUIT (name it,
              then tap its place on the staff), scale = SCALE BUILDER (a key signature → tap its major scale, one octave up)
     treble / bass   the notes (lowest, highest) for each clef. A level with `clefs: 'pref'` uses the student's clef choice
              (Treble / Bass / Both on the level screen); otherwise the clefs listed are used
     keys     'white' | 'black' (black keys + whites mixed, about half and half) | 'all'
     spell    how black keys are named: 'sharps' (only the ♯ name counts) | 'flats' | 'any' (either name counts) |
              'flats-any' (flats for the first half of the level, then either). Key signature rounds always spell by the key
     keySigs  the major key signatures the level uses (concert, like the piano): ['F', 'Bb', 'Eb', 'Ab'], ['G', 'D', 'A'] …
              In those rounds a note affected by the key signature means the ALTERED key (a B in F major = B♭), and a
              named key must be spelled by the key (in F major the black key between A and B is B♭, never A♯)
     sigsFirst  optional: keySigs for the first half of the level only (Sharp Signature Summit: sharp keys, then mixed)
     noSig    share of rounds with no key signature on key-signature levels (0–1)
     sigHint  key-signature rounds that briefly light the key signature's ♯/♭ that applies (then the hint fades)
     signs    how bright the Chopsticks and Fork signs are: 1 = on, 0 = off, [from, to] = they fade across the level.
              SHOW SIGNS (a hint button) turns them back on for one round (the C/F labels too); it costs `RULES.signsCost`
              points. A sign can be TAPPED for its spoken hint while it is visible (brightness ≥ `RULES.signTapFrom`)
     labels   the "C" and "F" plates on every C and F key (in the Chopsticks' and the Fork's colors), like `signs`:
              1 = on, [from, to] = they fade across the level, left out = none
     hints    true = after a wrong answer the Mayor points at the sign ("Find the Chopsticks: C is right next to them!")
     helper   INSTRUMENT MODE: show "Piano B♭ = your C" (the student's written note). true | 'fade' (the first
              `RULES.helperFadeRounds` rounds only) | false
     view     how many white keys should fit on screen (the keyboard pans when the level's keys don't all fit)
     time     seconds per round (the Mayor's Challenge); null = no timer (a quick answer still scores more)

   TIMED ROUNDS (the Mayor's Challenge, Night Shift): a question that takes several taps gets the base time + about
   1.5 s for every tap after the first (`RULES.perTap`): NAME THE KEY of a black key (♯/♭ + letter), FULL CIRCUIT (the
   name, then its place on the staff). Any new multi-tap question in timed play must follow this rule. SCALE BUILDER
   (8 taps) is never timed: it stays in Key Signature Square and Sharp Signature Summit only.                        */
window.KTTC_LEVELS = [
  {name: 'Downtown C', rounds: 12, types: {find: 1}, clefs: 'pref', treble: ['C4', 'B4'], bass: ['C3', 'B3'], keys: 'white', spell: 'any',
   signs: 1, labels: 1, hints: true, helper: true, view: 8, time: null,
   say: 'Welcome downtown! C is right next to the Chopsticks. F is right next to the Fork.'},
  {name: 'Restaurant Row', rounds: 12, types: {name: 1, find: 1}, clefs: 'pref', treble: ['C4', 'C5'], bass: ['C3', 'C4'], keys: 'white', spell: 'any',
   signs: [1, .1], labels: [1, 0], hints: true, helper: true, view: 8, time: null,
   say: 'Now I light a key and you name it. The signs get dimmer as you go!'},
  {name: 'Sharp Street', rounds: 12, types: {find: 1, name: 1}, clefs: 'pref', treble: ['C4', 'C5'], bass: ['C3', 'C4'], keys: 'black', spell: 'sharps',
   signs: .55, hints: true, helper: true, view: 8, time: null,
   say: 'A sharp is the key just to the RIGHT. On Sharp Street, black keys are sharps.'},
  {name: 'Flat Iron District', rounds: 12, types: {find: 1, name: 1}, clefs: 'pref', treble: ['C4', 'C5'], bass: ['C3', 'C4'], keys: 'black', spell: 'flats-any',
   signs: .4, hints: true, helper: true, view: 8, time: null,
   say: 'A flat is the key just to the LEFT. Every black key has two names: C♯ is also D♭!'},
  {name: 'Ledger Line Heights', rounds: 12, types: {find: 1, name: 1, circuit: 1}, clefs: 'pref', treble: ['A3', 'C6'], bass: ['C2', 'E4'], keys: 'all', spell: 'any',
   signs: .25, hints: false, helper: 'fade', view: 15, time: null,
   say: 'Up here the notes climb onto ledger lines. Name a key, then put it on the staff!'},
  {name: 'Bass Clef Harbor', rounds: 12, types: {find: 1, name: 1, circuit: 1}, clefs: ['bass'], bass: ['C2', 'C4'], keys: 'all', spell: 'any',
   signs: .15, hints: false, helper: false, view: 15, time: null,
   say: 'Down at the harbor we read bass clef. Middle C sits on a ledger line just above the bass staff.'},
  {name: 'Key Signature Square', rounds: 12, types: {find: 1, name: .7, scale: .6}, clefs: ['treble', 'bass'], treble: ['C4', 'G5'], bass: ['E2', 'C4'], keys: 'all', spell: 'any',
   keySigs: ['F', 'Bb', 'Eb', 'Ab'], noSig: 0, sigHint: 4, signs: .1, hints: false, helper: false, view: 15, time: null,
   say: 'Key signatures! A flat in the signature changes that note everywhere: in F major, every B is B♭.'},
  {name: 'Sharp Signature Summit', rounds: 12, types: {find: 1, name: .7, scale: .6}, clefs: ['treble', 'bass'], treble: ['C4', 'G5'], bass: ['E2', 'C4'], keys: 'all', spell: 'any',
   keySigs: ['G', 'D', 'A', 'F', 'Bb', 'Eb', 'Ab'], sigsFirst: ['G', 'D', 'A'], noSig: 0, sigHint: 4, signs: .05, hints: false, helper: false, view: 15, time: null,
   say: 'Sharp keys now: in G major every F is F♯. Then flat keys and sharp keys, all mixed up!'},
  {name: "The Mayor's Challenge", rounds: 15, types: {find: 1, name: .8, circuit: .5}, clefs: ['treble', 'bass'], treble: ['A3', 'C6'], bass: ['C2', 'E4'], keys: 'all', spell: 'any',
   keySigs: ['F', 'Bb', 'Eb', 'Ab', 'G', 'D', 'A'], noSig: .4, sigHint: 0, signs: 0, hints: false, helper: false, view: 15, time: 9,
   say: 'My challenge: everything at once, a timer on every round and no signs. Win it and the keys to the city are yours!'},
];

window.KTTC_RULES = {
  stars: [.7, .85, 1],      // share of rounds right for 1 ★ (clears the district), 2 ★, 3 ★ (every round right)
  base: 100,                // points for a right answer
  quickBonus: 50,           // + up to this for a quick one (gone after quickSecs)
  quickSecs: 8,
  scaleBonus: 100,          // a whole scale built counts extra
  signsCost: 30,            // SHOW SIGNS costs this many points from that round
  signTapFrom: .2,          // a sign this bright (or brighter) can be tapped for its spoken hint; dimmer = faded, not tappable
  perTap: 1.5,              // TIMED ROUNDS: + this many seconds for every tap after the first (see TIMED ROUNDS above)
  streak: 5,                // every 5 right in a row lights a city block (kttc-block-lights)
  afterRightMs: 700,        // the pause after a right answer
  afterWrongMs: 1900,       // after a wrong one (the right answer glows, and early levels show the sign hint)
  helperFadeRounds: 4,      // helper: 'fade' = the helper shows for this many rounds
  sigHintMs: 1800,          // how long a key-signature hint glows
  minKeyPx: 46,             // a white key is never narrower than this (iPad fingers); the keyboard pans instead
};

/* ENDLESS: NIGHT SHIFT. Mixed questions until the 3 hearts are gone; every `every` right answers it steps up a STAGE:
   wider ranges, bass clef, black keys, key signatures, less time. Top 5 per device (shared/endless.js; not saved in ?demo). */
window.KTTC_NIGHT = {
  lives: 3,
  every: 5,                 // right answers per stage
  time: [12, 3.5, .3],      // seconds per round: [at the start, the floor, − per right answer]
  base: 100, quickBonus: 100, stageBonus: .15,   // points: (base + quick) × (1 + stageBonus × stage) × the combo multiplier
  stages: [                 // what each stage adds (a stage keeps everything before it)
    {types: {find: 1, name: 1}, treble: ['C4', 'C5'], keys: 'white'},
    {keys: 'all'},
    {treble: ['A3', 'C6'], types: {find: 1, name: 1, circuit: .5}},
    {bass: ['C2', 'E4'], clefs: ['treble', 'bass']},
    {keySigs: ['F', 'Bb', 'G', 'D'], noSig: .5},   // no SCALE BUILDER: it is never timed (TIMED ROUNDS above)
    {keySigs: ['F', 'Bb', 'Eb', 'Ab', 'G', 'D', 'A'], noSig: .35},
  ],
};
