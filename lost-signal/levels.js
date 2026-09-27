/* LOST SIGNAL level design. Tweak freely; the game reads everything from here.

   MAT: each line is one level (a place in space). Keep 8 lines: stars are saved by level number.
     name      the level's name (a place in space)
     count     transmissions in the level
     len       notes in each transmission: a number, or [fewest, most]
     pool      3 = the smaller level-1 pool (first three notes, a scale's first five, one octave of Chromatic),
               5 = the whole note set picked above the levels
     leap      the biggest skip between two notes, in half steps: 2 = stepwise only, 4 = small skips (up to a 3rd),
               7 = larger skips (up to a 5th), 12 = up to an octave (only if the note set reaches that far)
     repeats   true = the same note may come twice in a row (it needs a new tongue on the second one)
     label     true = the first note's name is shown; false = static hides it
     find      true = FIND THE SIGNAL: before the echo, try notes until you match the hidden first note
     replays   REPLAY SIGNAL presses per transmission (each lowers that transmission's score a little)
     noteMs    how long each note plays (ms); gapMs = the silence between notes
     story     the level intro's story line; nowWhat = the one plain sentence about what's new
   Scale Order (the ORDER choice above the levels) keeps every transmission stepwise, in any level. */
window.SIGNAL_LEVELS = [
  {name: 'First Contact', count: 6, len: 2,      pool: 3, leap: 2,  repeats: false, label: true,  find: false, replays: 2, noteMs: 750, gapMs: 160,
   story: 'A strange signal is pulsing from just past the moon. Echo it back to say hello.',
   nowWhat: 'Listen to 2 notes, then play them back. The first note\'s name is shown.'},
  {name: 'Moon Relay',    count: 6, len: 3,      pool: 5, leap: 2,  repeats: false, label: true,  find: false, replays: 2, noteMs: 750, gapMs: 160,
   story: 'The probe answered! Its message bounces off an old relay on the far side of the moon.',
   nowWhat: 'Now 3 notes, moving step by step.'},
  {name: 'Asteroid Belt', count: 6, len: [3, 4], pool: 5, leap: 4,  repeats: false, label: true,  find: false, replays: 2, noteMs: 700, gapMs: 150,
   story: 'The signal weaves between tumbling rocks. It sounds almost like… a tune?',
   nowWhat: 'Notes can skip now (up to a 3rd), and some transmissions have 4 notes.'},
  {name: 'Ringed Giant',  count: 6, len: 4,      pool: 5, leap: 4,  repeats: false, label: true,  find: false, replays: 1, noteMs: 580, gapMs: 130,
   story: 'Near a giant ringed planet, the transmissions speed up. Someone out there is excited!',
   nowWhat: 'Faster playback, and only 1 replay per transmission.'},
  {name: 'Static Storm',  count: 6, len: 4,      pool: 5, leap: 4,  repeats: false, label: false, find: true,  replays: 1, noteMs: 600, gapMs: 140,
   story: 'A static storm! The probe is still sending, but the first note is buried in noise.',
   nowWhat: 'Static is hiding the first note. Find it by ear!'},
  {name: 'Nebula',        count: 6, len: 5,      pool: 5, leap: 7,  repeats: false, label: false, find: true,  replays: 1, noteMs: 560, gapMs: 130,
   story: 'Inside a glowing nebula the melodies stretch wider. The probe sends a picture: a stage with empty spotlights.',
   nowWhat: '5 notes with bigger skips (up to a 5th). Find the first note by ear.'},
  {name: 'Deep Space',    count: 6, len: 5,      pool: 5, leap: 12, repeats: false, label: false, find: false, replays: 0, noteMs: 520, gapMs: 120,
   story: 'Far from any star, the probe whispers: "Our band forgot its songs. Can you remember them for us?"',
   nowWhat: 'No name, no searching, no replays. The first note counts like the rest.'},
  {name: 'The Source',    count: 6, len: 6,      pool: 5, leap: 12, repeats: true,  label: false, find: false, replays: 0, noteMs: 480, gapMs: 110,
   story: 'You found the source: a quiet planet full of instruments, all waiting for their music.',
   nowWhat: '6 notes from your whole note set, and a note can repeat (tongue it again).'},
];

/* what happens after The Source is cleared (the end of the story) */
window.SIGNAL_ENDING = [
  'CONTACT! Your echoes carried the lost songs all the way home.',
  'On the quiet planet the spotlights flicker on. A band of friendly aliens picks up their instruments and plays your melodies back to you.',
  'They were a band all along. They just needed someone who could listen, and play it back. Thanks, operator!',
];

window.SIGNAL_RULES = {
  slotMs: 6000,         // time for each note of the echo before that slot counts as missed
  listenAfterMs: 400,   // the microphone listens this long after the last tone has faded (never while it plays)
  base: 100,            // points for each right note
  replayCost: 0.15,     // each REPLAY SIGNAL takes 15% off that transmission's points
  findCost: 20,         // FIND THE SIGNAL: points lost for each wrong try
  findReveal: 4,        // FIND THE SIGNAL: after this many wrong tries, a "Show me" button appears (costs 3 tries' points)
  oneStar: 0.70,        // share of notes right for 1 star (clears the level, opens the next)
  twoStar: 0.85,        // 2 stars; 3 stars = every note right and no replays used
  register: [55, 79],   // playback register (SOUNDING midi): concert G3–G5. Each pattern moves by whole octaves, as a
                        // block, into this range (so a tuba player hears it higher); matching ignores the octave
};

/* THE PATTERN GENERATOR: how likely each move is (bigger = more likely). A pattern starts on a random note of the
   set and then picks each next note from these weights, within the level's `leap`. */
window.SIGNAL_GEN = {
  step: 4,              // up or down a half or whole step
  third: 2.2,           // a 3rd (3–4 half steps)
  fourth: 1.2,          // a 4th (5)
  fifth: 1,             // a 5th (6–7)
  wide: 0.3,            // 6ths and 7ths (8–11)
  octave: 0.6,          // an octave (12)
  repeat: 1.8,          // the same note again (only where `repeats` is on)
  recover: 2.5,         // after a skip bigger than a 3rd, a step back the other way is this much more likely…
  noBigInARow: true,    // …and another skip bigger than a 3rd is not allowed (no leaping around)
  noPingPong: 0.4,      // going straight back to the note before last is less likely (× this)
  mustSkip: true,       // levels with skips: a pattern of 3+ notes always has at least one
};

/* DEEP SPACE SCAN (the ENDLESS card): the same pattern comes back each round with one new note on the end. */
window.SIGNAL_ENDLESS = {
  startLen: 2,          // notes in the first round
  labelRounds: 3,       // the first note is named for the first 3 rounds, then static covers it
  lives: 3,             // a round with any wrong or missed note costs a heart (the SAME pattern plays again)
  noteMs: 700, gapMs: 140,
  fasterEvery: 5,       // every 5 rounds the notes get quicker…
  faster: 0.9,          // …by this much (0.9 = 10% shorter)…
  minNoteMs: 330,       // …but never shorter than this
  leap: 4, leapLater: 7, leapFrom: 8,   // skips up to a 3rd, then up to a 5th from pattern length 8
  pool: 5,              // the whole note set
  base: 100,            // points for each right note
  perfectBonus: 50,     // + this × the pattern's length for a perfect round
};
