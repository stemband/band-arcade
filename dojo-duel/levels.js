/* DOJO DUEL settings. Tweak freely; the game reads everything from here.

   MAT: the belts themselves (and what each one plays) come from Note Ninja: note-ninja/levels.js NINJA_BELTS
   (its `pool` = the first three notes on White, then the whole note set; `guides` = the faint letter names;
   `relabel: false` = the buttons stop hinting ♭/♯). A player may choose any belt they have a star on in Note Ninja
   on this device (or the next one up), so the belts work as a handicap: each player reads their own notes. */
/* PACING: every timing of a point, in one place (milliseconds). A point goes:
     COUNTDOWN (3-2-1 in the middle of each player's staff, buttons locked and dimmed)
     → the NOTE appears on both sides at the same instant, buttons unlock
     → a tap (or nobody within noteMs)
     → the RESULT MOMENT (both answers shown, buttons locked) → the next countdown.
   With QUICK, a point takes about resultMs + 3 × quickStep ≈ 2.6 s plus the players' own answer time. */
window.DUEL_PACING = {
  quickStep: 350,         // QUICK countdown (the default): each of 3, 2, 1 shows this long
  classicStep: 1000,      // CLASSIC countdown: each number this long. Always used for the first note of a match
                          // (followed by BEGIN!) and for the note after a point that makes someone's MATCH POINT
  offMs: 400,             // OFF: no numbers, just this short "ready" gap with an empty staff
  introGapMs: 400,        // MATCH START (and REMATCH): the gong (dojo-begin) + the Sensei's line (sensei-begin, "Begin!") play
                          // together; the CLASSIC 3-2-1 starts this long after the longer of the two has finished…
  introMaxMs: 3000,       // …but no later than this after they start (never while the Sensei is still speaking)
  voiceWaitMs: 100,       // a countdown waits (checking this often) until any voice line (sensei-fast…) has finished
  resultMs: 1500,         // the RESULT MOMENT after a point (the strike, +1, both answers shown)
  noPointMs: 1500,        // the same moment when nobody scores (both wrong, or too slow)
  flyMs: 650,             // the "+1" flies to the score this long (inside the result moment)
  stunMs: 1000,           // a wrong tap: that player's buttons rest this long (dizzy)
  noteMs: 6000,           // nobody answers in this long = no point ("Too slow, ninjas!")
  fastMs: 1500,           // a PLAYER's point won faster than this (from the note appearing) counts as "fast": the
                          // Sensei's "fast" line and the sensei-fast sound. The Sensei's own points never count
};

window.DUEL_RULES = {
  lengths: [7, 10, 15],   // MATCH LENGTH choices: first to this many points
  length: 10,             // …the default
  countdowns: ['quick', 'classic', 'off'],   // COUNTDOWN choices on the setup screen (remembered on this device)
  tieMs: 24,              // taps this close together are compared by their exact time stamp
};

/* SOLO VS. SENSEI: the Sensei's reaction time (seconds, ± spread) and how often it taps a wrong note first */
window.DUEL_SENSEI = [
  {id: 'easy',   name: 'Easy',   react: 3.0, spread: 0.25, wrong: 0.15, blurb: 'The Sensei takes about 3 seconds, and sometimes slips.'},
  {id: 'medium', name: 'Medium', react: 2.0, spread: 0.25, wrong: 0.07, blurb: 'About 2 seconds, and slips now and then.'},
  {id: 'hard',   name: 'Hard',   react: 1.3, spread: 0.2,  wrong: 0,    blurb: 'About 1.3 seconds, and never slips. Good luck!'},
];

/* THE SENSEI'S LINES (the announcer). {name} = the player it talks about. Keep them short, kind and encouraging to
   BOTH players. One is picked at random each time. */
window.DUEL_LINES = {
  ready:      ['Bow to your opponent…', 'Eyes on your staff…', 'Breathe in, ninjas…'],
  begin:      ['Begin!'],
  fast:       ['Swift and sharp!', 'Lightning fingers, {name}!', 'Too quick to see!'],
  point:      ['A point for {name}!', 'Well read, {name}!', 'Clean and true!'],
  wrong:      ['Patience, ninja…', 'Steady. Read it again.', 'Slow is smooth, smooth is fast.'],
  timeout:    ['Too slow, ninjas!', 'Too slow, ninjas! Here are the answers.', 'The notes win this round!'],
  bothWrong:  ['Both of you, breathe. Next note!', 'A tangle! Look at the answers.'],
  matchPoint: ['Match point for {name}!', '{name} needs one more point!'],
  comeback:   ['The duel is not over yet!', 'Never give up, ninja!'],
  win:        ['The student becomes the master!', 'A worthy duel!', 'Victory for {name}!'],
  lose:       ['A great duel. Every note you read makes you stronger.', 'Well fought! Practice these and come back.'],
  senseiWins: ['Well fought, young one. Practice these and challenge me again!'],
};
