/* DOJO DUEL settings. Tweak freely; the game reads everything from here.

   MAT: the belts themselves (and what each one plays) come from Note Ninja: note-ninja/levels.js NINJA_BELTS
   (its `pool` = the first three notes on White, then the whole note set; `guides` = the faint letter names;
   `relabel: false` = the buttons stop hinting ♭/♯). A player may choose any belt they have a star on in Note Ninja
   on this device (or the next one up), so the belts work as a handicap: each player reads their own notes. */
window.DUEL_RULES = {
  lengths: [7, 10, 15],   // MATCH LENGTH choices: first to this many points
  length: 10,             // …the default
  pointMs: 6000,          // nobody answers in this long = no point
  stunMs: 1000,           // a wrong tap: that player's buttons rest this long (dizzy)
  revealMs: 800,          // both answers stay on screen this long before the next note
  tieMs: 24,              // taps this close together are compared by their exact time stamp
  readyMs: 900,           // "READY…" shows this long, then "BEGIN!" (a word change, never a flash)
  beginMs: 700,
  fastMs: 1500,           // a point won faster than this = a "fast" Sensei line
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
  timeout:    ['A tricky one! Here are the answers.', 'The notes win this round. Next!'],
  bothWrong:  ['Both of you, breathe. Next note!', 'A tangle! Look at the answers.'],
  matchPoint: ['Match point for {name}!', '{name} needs one more point!'],
  comeback:   ['The duel is not over yet!', 'Never give up, ninja!'],
  win:        ['The student becomes the master!', 'A worthy duel!', 'Victory for {name}!'],
  lose:       ['A great duel. Every note you read makes you stronger.', 'Well fought! Practice these and come back.'],
  senseiWins: ['Well fought, young one. Practice these and challenge me again!'],
};
