/* PERFECT PITCH: THE LEVELS, THE SCORING and the rules of a round (docs/games/perfect-pitch.md). Levels are saved by
   NUMBER (1–8): never reorder them; add new ones at the end (and raise games.js maxStars).
     name     the card's title          idea  the card's one line          say  the level intro's words
     cents    [min, max]: a round's offset is ± a value in this range (never the same value twice in a level)
     inTune   how many of the level's rounds are EXACTLY in tune (0 cents), shuffled in (never level 1's first round)
     notes    'Bb' | 'BbF' | 'tuning' | 'range': which notes (perfect-pitch/instruments.js notesFor)
     replay   true = ▶ AGAIN (and R) replays the reference and the note before the student judges
     together true = ▶ TOGETHER (and T): the reference and the note at once, so they beat
     needle   true = THE TUNER NEEDLE while tuning
     rounds   rounds in the level (targets never repeated: note + offset) */
window.PP2_LEVELS = [
  {name: 'Way Off', idea: 'Big differences, a needle and every kind of help.', cents: [35, 50], inTune: 0, notes: 'Bb', replay: true, together: true, needle: true, rounds: 5,
   say: 'First the tuner\'s note, then your instrument. Is your note too high (SHARP), too low (FLAT), or IN TUNE? Then fix it: sharp → pull out (longer = lower). Flat → push in (shorter = higher).'},
  {name: 'Getting Closer', idea: 'Smaller differences. Listen for the beats.', cents: [20, 35], inTune: 1, notes: 'Bb', replay: true, together: true, needle: true, rounds: 5,
   say: 'Closer now. Play them TOGETHER and listen for the wah-wah-wah. The slower it beats, the closer you are.'},
  {name: 'In Tune or Not?', idea: 'Some notes are already in tune. Can you tell?', cents: [15, 25], inTune: 2, notes: 'BbF', replay: true, together: true, needle: false, rounds: 5,
   say: 'Some notes are already in tune. If it\'s in tune, say so, and don\'t touch it!'},
  {name: 'No Needle', idea: 'Your ears are the tuner.', cents: [10, 20], inTune: 1, notes: 'BbF', replay: true, together: true, needle: false, rounds: 5,
   say: 'No needle. Your ears are the tuner.'},
  {name: 'Tuning Notes', idea: 'B♭, F and A, like a real band tune-up.', cents: [10, 20], inTune: 1, notes: 'tuning', replay: true, together: false, needle: false, rounds: 5,
   say: 'Bands tune to more than one note: B♭, F and A.'},
  {name: 'Hear It Once', idea: 'Each note plays once. Listen closely!', cents: [10, 20], inTune: 1, notes: 'tuning', replay: false, together: false, needle: false, rounds: 5,
   say: 'Each note plays once, like a quick tune-up before the concert.'},
  {name: 'Any Note', idea: 'Any note your instrument plays.', cents: [8, 15], inTune: 1, notes: 'range', replay: true, together: false, needle: false, rounds: 5,
   say: 'Any note your instrument plays. Same rule: sharp → longer, flat → shorter.'},
  {name: 'Perfect Pitch', idea: 'Small differences, one listen, no help.', cents: [5, 12], inTune: 1, notes: 'range', replay: false, together: false, needle: false, rounds: 5,
   say: 'Small differences, one listen, no help. Perfect pitch!'},
];

/* THE SCORING: stars from the AVERAGE error (cents, either way) AND the judgments right
     stars       [[avg ≤, judgments right ≥] for 1 ★, 2 ★, 3 ★]
     judge       points for a right judgment (SHARP / FLAT / IN TUNE)
     perfect / perCent   a round's tuning points = max(0, perfect − perCent × |its error|); the level's score = their sum (Best)
     bullseye    a round this close (cents) plays the sparkle (p2-star) and shows BULLSEYE */
window.PP2_SCORING = {stars: [[25, 3], [12, 4], [6, 5]], judge: 50, perfect: 100, perCent: 3, bullseye: 3};

/* the rules of a round */
window.PP2_RULES = {
  refSec: 1.6,              // HEAR: the reference plays this long
  gapSec: 0.3,              // then this gap
  noteSec: 1.6,             // then the instrument note, this long (also ▶ PLAY while tuning)
  bothSec: 1.6,             // ▶ TOGETHER, and after LOCK IN: the tuned note and the reference together
  nudgeCents: 1,            // NUDGE − / +: this many cents' worth
  arrowCents: 3,            // ←/→: this many
  fineCents: 1,             // Shift + ←/→: this many
};
