/* Button Masher rivals (the levels). Tweak freely; the game reads everything from here.
   One line per rival, in the order students fight them. Stars are saved by rival number (1–8), so keep the order.

     name      the rival's name on the health bar
     look      which drawing (game.js, RIVAL_LOOKS): 'reed' | 'clef' | 'tornado' | 'sharp' | 'flat' | 'doctor' | 'metronome' | 'conductor'
     colors    [main, trim] theme colors: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'blue' | 'white'
     taunt     one line the rival says before the fight
     pool      which notes: 'first3' (the first three of the student's first five), 'first5',
               'Bb' | 'Eb' | 'F' | 'Ab' (that concert scale, one octave, shared/scales.js), 'mixed' (all four scales)
     notes     notes per match. If they run out before the rival is down: TIME OVER, the rival wins
     health    rival health = correct combos needed for the K.O. (at most `notes`)
     time      seconds per note before a timeout (a miss: the rival counters and the next note comes)
     showName  true: the note name shows under the staff (levels 1–2)
     hint      seconds before the right keys glow faintly (0 = never)
   Notes come in random order, never the same note twice in a row. Scale levels show the key signature. */
window.MASHER_RIVALS = [
  {name: 'Squeaky Reed',   look: 'reed',      colors: ['green', 'yellow'],  taunt: 'Squee-eek! My high notes will crack your combos!',        pool: 'first3', notes: 10, health: 6,  time: 15, showName: true,  hint: 5},
  {name: 'Captain Clef',   look: 'clef',      colors: ['cyan', 'white'],    taunt: 'All hands on staff! You can\'t read my lines and spaces!', pool: 'first5', notes: 12, health: 8,  time: 12, showName: true,  hint: 0},
  {name: 'Tempo Tornado',  look: 'tornado',   colors: ['purple', 'cyan'],   taunt: 'Whirl-whirl! Can your fingers keep up with the spin?',    pool: 'Bb',     notes: 12, health: 9,  time: 10, showName: false, hint: 0},
  {name: 'Sir Sharp',      look: 'sharp',     colors: ['amber', 'white'],   taunt: 'En garde! Well, not really. I just like raising things.',  pool: 'Eb',     notes: 12, health: 9,  time: 10, showName: false, hint: 0},
  {name: 'Lady Flat',      look: 'flat',      colors: ['pink', 'purple'],   taunt: 'Darling, your fingering is a half step too low.',          pool: 'F',      notes: 12, health: 9,  time: 9,  showName: false, hint: 0},
  {name: 'Dr. Dissonance', look: 'doctor',    colors: ['green', 'pink'],    taunt: 'Mwa-ha-ha! Every note clashes in my lab!',                 pool: 'Ab',     notes: 14, health: 11, time: 9,  showName: false, hint: 0},
  {name: 'The Metronome',  look: 'metronome', colors: ['amber', 'red'],     taunt: 'Tick. Tock. Tick. Tock. You. Are. Late.',                   pool: 'mixed',  notes: 16, health: 13, time: 7,  showName: false, hint: 0},
  {name: 'The Conductor',  look: 'conductor', colors: ['red', 'yellow'],    taunt: 'The final movement. Show me every scale, from the top!',   pool: 'mixed',  notes: 20, health: 17, time: 6,  showName: false, hint: 0, boss: true},
];
window.MASHER_RULES = {
  energy: 5,            // your energy bar: each wrong combo or timeout (a rival counter) costs 1; empty = the rival wins
  tries: 2,             // a wrong combo keeps the same note for one more try; the second wrong moves on
  base: 100,            // points for each correct combo
  speedBonus: 100,      // extra points for an instant STRIKE! (less as the timer runs down)
  comboStep: 5,         // every 5 in a row raises the multiplier by 1 (and plays the combo-streak sound) …
  maxMultiplier: 4,     // … up to ×4
  showCorrectMs: 1500,  // after a wrong combo or a timeout, the right keys glow this long
  afterHitMs: 650,      // pause after a correct STRIKE! before the next note
};
