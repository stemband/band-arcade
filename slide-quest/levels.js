/* SLIDE QUEST: THE LEVELS, THE SCORING and the rules of a round (docs/games/slide-quest.md). Levels are saved by
   NUMBER (1–8): never reorder them; add new ones at the end (and raise games.js maxStars).
     name     the card's title          idea  the card's one line          say  the level intro's words
     tuning   'ideal' = every partial exactly on the equal-tempered chart · 'real' = the true harmonic series (the 5th
              partial about 14 cents flat at its mark; the tuning slide leaves room to push it up): slide.js
     partials the pool the targets come from (partials 2–6)
     focus    optional {partial, rounds}: at least this many of the level's rounds are on that partial
     lips     true = PARTIAL ▲ / ▼ choose the partial yourself (the round starts on another one); else it's locked to the
              target's
     ref      'drone' = THE TUNING DRONE (held; DRONE ON/OFF; it starts ON by itself at the start of each round)
              'once'  = the note plays once, at the start of the round, and never again
     named    true = the target's note name is shown       told   true = its position is told ("4th position")
     marks    true = the 7 position marks on the inner slide            needle  true = THE TUNER NEEDLE while blowing
     rounds   targets in the level (never repeated)
     lesson   the FIRST time this level opens, its intro adds "From here on, your ears are the tuner." (once:
              gameData('slide-quest').earLesson)
     flatTip  after LOCK IN on a 5th-partial target, add "5th-partial notes are flat at the mark: bring the slide IN" */
window.SQ_LEVELS = [
  {name: 'First Slide', idea: 'One partial, the marks and a needle. Make the beating stop.', tuning: 'ideal', partials: [3], lips: false, ref: 'drone', named: true, told: true, marks: true, needle: true, rounds: 5,
   say: 'Blow into the horn and move the slide. Out = lower, in = higher. Listen to the drone with your note: hear the wah-wah-wah? The slower it beats, the closer you are. When it stops, you match!'},
  {name: 'Find the Spot', idea: 'Named notes. You find the position yourself.', tuning: 'ideal', partials: [2, 3, 4], lips: false, ref: 'drone', named: true, told: false, marks: true, needle: true, rounds: 5,
   say: 'Same game, but you find the position yourself. Notice: the marks get farther apart the farther out you go.'},
  {name: 'Ears Only', idea: 'No name, no needle. Just the drone.', tuning: 'ideal', partials: [2, 3, 4], lips: false, ref: 'drone', named: false, told: false, marks: true, needle: false, rounds: 5,
   say: 'No name, no needle. Just the drone and your ears. Make the beating stop.'},
  {name: 'No Marks', idea: 'A bare slide, like a real trombone.', tuning: 'ideal', partials: [2, 3, 4], lips: false, ref: 'drone', named: false, told: false, marks: false, needle: false, rounds: 5, lesson: true,
   say: 'Real trombones don\'t have marks on the slide. Players find each spot by ear. You can too.'},
  {name: 'From Memory', idea: 'The note plays ONCE. Find it from memory.', tuning: 'ideal', partials: [2, 3, 4], lips: false, ref: 'once', named: false, told: false, marks: false, needle: false, rounds: 5,
   say: 'The note plays once. Hold it in your head, then find it.'},
  {name: 'Partial Up, Partial Down', idea: 'Change partials to reach more notes: PARTIAL ▲ ▼.', tuning: 'ideal', partials: [2, 3, 4, 5], lips: true, ref: 'drone', named: true, told: false, marks: true, needle: false, rounds: 5,
   say: 'On a trombone the slide isn\'t the only thing that picks the note. Each PARTIAL is a different family of notes, and your air and embouchure move you between them. Use PARTIAL ▲ ▼ and the slide together.'},
  {name: 'Real Horn', idea: 'Real horns aren\'t perfectly in tune. Move the slide IN.', tuning: 'real', partials: [3, 4, 5, 6], focus: {partial: 5, rounds: 3}, lips: true, ref: 'drone', named: true, told: true, marks: true, needle: false, rounds: 5, flatTip: true,
   say: 'Real horns aren\'t perfectly in tune. Some notes (like D in 1st position) sit a little flat at their mark. Start at the mark, then listen and move IN until the beats stop. Real players tune with a little room at the top, so they can move flat notes in.'},
  {name: 'Trust Your Ears', idea: 'The slide, the partials and your ears. No help.', tuning: 'real', partials: [2, 3, 4, 5, 6], lips: true, ref: 'drone', named: false, told: false, marks: false, needle: false, rounds: 5,
   say: 'Everything at once: the slide, the partials and your ears. No marks, no help. Trust your ears. They\'re the best tuner you own.'},
];

/* THE SCORING (Pedal Point's PP_SCORING): stars from the AVERAGE error of the level's notes (cents, either way).
     stars       [1 ★, 2 ★, 3 ★]: an average at or under each number earns that many stars
     bullseye    a note this close (cents) plays the sparkle (sq-star) and shows BULLSEYE
     points      a note's points = max(0, perfect − perCent × its error); the level's score = their sum (Best) */
window.SQ_SCORING = {stars: [25, 12, 6], bullseye: 3, perfect: 100, perCent: 3};

/* the rules of a round */
window.SQ_RULES = {
  startAway: 150,           // cents: a round's slide starts at least this far from the target's spot
  onceSec: 2,               // 'once' levels: the note plays this long
  bothSec: 1.6,             // after LOCK IN: the horn and the drone together, this long
  arrowCents: 5,            // ←/→: the slide moves this many cents' worth
  fineCents: 1,             // Shift + ←/→: this many
  nudgeCents: 2,            // NUDGE − / +: this many (on a phone 1 cent near 7th position is under a pixel)
  holdMs: 350,              // BLOW: a press held longer than this is a HOLD (released = the horn stops); shorter = a tap (toggle)
};
