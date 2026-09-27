/* VANISHING INK level design. Tweak freely; the game reads everything from here.

   MAT: each line is one level. Keep 8 lines: stars are saved by level number.
     name      the level's name
     rounds    scrolls in the level
     len       notes on each scroll
     pool      3 = the smaller level-1 pool (first three notes, a scale's first five, one octave of Chromatic),
               5 = the whole note set picked above the levels
     leap      the biggest skip between two notes, in half steps: 2 = stepwise only, 4 = small skips (up to a 3rd),
               5 = steps and skips mixed (up to a 4th), 7 = larger skips (up to a 5th), 12 = up to an octave
               (only if the note set reaches that far). Levels with skips always have at least one skip.
     repeats   true = the same note may come twice in a row (it needs a new tongue on the second one)
     study     seconds the notes stay on the scroll (after they are brushed in)
     ink       'fade' = the notes fade away slowly over the last part of the study time (`fade` = that part:
               0.4 = the last 40%); 'vanish' = the notes stay dark, then disappear all at once in a puff of ink
     reveals   REVEAL SCROLL presses per round (each shows the ink again briefly and lowers that round's score a little)
     say       the Ink Master's line on the level intro
     nowWhat   the one plain sentence about what's new
   Scale Order (the ORDER choice above the levels) keeps every scroll stepwise, in any level. */
window.INK_LEVELS = [
  {name: 'First Stroke',     rounds: 6, len: 2, pool: 3, leap: 2,  repeats: false, study: 5,   ink: 'fade',   fade: .4,  reveals: 2,
   say: 'Look closely, young ninja. Ink does not wait.',
   nowWhat: 'Read 2 notes. When the ink fades away, play them from memory.'},
  {name: 'Wet Ink',          rounds: 6, len: 3, pool: 5, leap: 2,  repeats: false, study: 5,   ink: 'fade',   fade: .4,  reveals: 2,
   say: 'Three strokes, one shape. Read them together, like a word.',
   nowWhat: 'Now 3 notes, moving step by step.'},
  {name: 'Brush Skips',      rounds: 6, len: 3, pool: 5, leap: 4,  repeats: false, study: 4,   ink: 'fade',   fade: .4,  reveals: 2,
   say: 'A skip leaves a gap on the staff. A sharp eye sees the gap.',
   nowWhat: 'Notes can skip now (up to a 3rd), and you have 4 seconds to read.'},
  {name: 'Quick Brush',      rounds: 6, len: 4, pool: 5, leap: 4,  repeats: false, study: 4,   ink: 'fade',   fade: .4,  reveals: 1,
   say: 'Four notes. Is the line climbing, falling, or turning around?',
   nowWhat: '4 notes, and only 1 reveal each round.'},
  {name: 'Fading Fast',      rounds: 6, len: 4, pool: 5, leap: 5,  repeats: false, study: 3,   ink: 'fade',   fade: .25, reveals: 1,
   say: 'The ink dries quickly tonight. Read fast, remember long.',
   nowWhat: 'Steps and skips mixed, only 3 seconds, and the ink fades faster.'},
  {name: 'Vanishing Point',  rounds: 6, len: 5, pool: 5, leap: 5,  repeats: false, study: 3,   ink: 'vanish', fade: 0,   reveals: 1,
   say: 'Now the ink plays a trick. Blink, and it is gone.',
   nowWhat: 'The ink won\'t fade slowly anymore. It vanishes! 5 notes.'},
  {name: 'Shadow Ink',       rounds: 6, len: 5, pool: 5, leap: 7,  repeats: false, study: 2,   ink: 'vanish', fade: 0,   reveals: 0,
   say: 'Shadows move quickly. So must your eyes.',
   nowWhat: 'Bigger skips (up to a 5th), 2 seconds, and no reveals.'},
  {name: 'Invisible Master', rounds: 6, len: 6, pool: 5, leap: 12, repeats: true,  study: 1.5, ink: 'vanish', fade: 0,   reveals: 0,
   say: 'The last scroll. Even I have to squint at this one. Show me what you see.',
   nowWhat: '6 notes from your whole note set, 1.5 seconds, and a note can repeat (tongue it again).'},
];

/* what the Ink Master says after Invisible Master is cleared */
window.INK_ENDING = [
  'The scroll is blank, but you still see every note. That is the secret of the Vanishing Ink.',
  'Reading music is not one note at a time. It is shapes: steps, skips, notes that repeat. You read them all.',
  'Keep your eyes sharp, Ink Master. The dojo is yours.',
];

window.INK_RULES = {
  brushMs: 100,         // each note brushes onto the scroll this long after the one before it
  slotMs: 6000,         // time for each note of the answer before that slot counts as missed
  revealMs: 1500,       // REVEAL SCROLL: how long the ink shows again
  revealCost: 0.15,     // each reveal takes 15% off that round's points
  base: 100,            // points for each right note
  oneStar: 0.70,        // share of notes right for 1 star (clears the level, opens the next)
  twoStar: 0.85,        // 2 stars; 3 stars = every note right and no reveals used
  warnMs: 1600,         // how long "READ, DON'T PLAY YET" stays up
};

/* THE PATTERN GENERATOR (shared/patterns.js, shared with Lost Signal): how likely each move is in Vanishing Ink
   (bigger = more likely). Leave a line out to use the shared default. */
window.INK_GEN = {
  step: 4,              // up or down a half or whole step
  third: 2.2,           // a 3rd
  fourth: 1.2,          // a 4th
  fifth: 1,             // a 5th
  wide: 0.3,            // 6ths and 7ths
  octave: 0.6,          // an octave
  repeat: 1.8,          // the same note again (only where `repeats` is on)
};

/* ENDLESS SCROLL (the ENDLESS card): the same scroll comes back each round with one new note on the end. */
window.INK_ENDLESS = {
  startLen: 2,          // notes in the first round
  lives: 3,             // a round with any wrong or missed note costs a life (the SAME scroll comes back, no note added)
  study: 2.5,           // study time: this many seconds…
  perNote: 0.5,         // …plus this much for each note…
  shrink: 0.97,         // …× this for every round played (it slowly gets shorter)…
  minStudy: 1,          // …but never less than this…
  minPerNote: 0.3,      // …plus this much for each note
  fadeRounds: 5,        // the ink FADES for the first 5 rounds, then it VANISHES
  fade: 0.4,            // the last 40% of the study time fades
  leap: 4, leapLater: 7, leapFrom: 8,   // skips up to a 3rd, then up to a 5th from 8 notes on
  pool: 5,              // the whole note set
  base: 100,            // points for each right note
  perfectBonus: 50,     // + this × the scroll's length for a perfect round
};
