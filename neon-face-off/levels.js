/* Neon Face-Off: the CPU ladder and the rules. Tweak freely; the game reads everything from here.

   CPU RIVALS (1 player vs CPU), one line each, in ladder order. Stars are saved by rival number (1–8), so keep
   the order. Beating a rival unlocks the next.
     name      the rival's name
     color     its neon: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'blue' | 'white'
     plays     the instrument its portrait shows (an instrument id from shared/instruments.js; it only "plays" silently)
     reaction  [fastest, slowest] seconds the CPU takes to "play" its note
     accuracy  0–1: the chance it plays the right note in time. A miss lets the puck through
     line      one line shown on the rival card
   STARS per rival: win = 1, win by 4 or more goals = 2, win without conceding a goal (a shutout) = 3.
   Two-player matches award no stars; the device keeps a head-to-head record instead. */
window.FACEOFF_RIVALS = [
  {name: 'Rookie Robo',  color: 'green',  plays: 'trumpet',  reaction: [3.0, 5.0], accuracy: 0.70, line: 'Still reading the instructions. Beep boop!'},
  {name: 'Slide Rule',   color: 'amber',  plays: 'trombone', reaction: [2.6, 4.4], accuracy: 0.75, line: 'Measures every angle. Slowly.'},
  {name: 'Puckster',     color: 'yellow', plays: 'altosax',  reaction: [2.2, 3.8], accuracy: 0.80, line: 'Loves the sound of a clean hit.'},
  {name: 'Rim Shot',     color: 'red',    plays: 'bells',    reaction: [1.9, 3.2], accuracy: 0.84, line: 'Bounces it off every rail on purpose.'},
  {name: 'Glide',        color: 'purple', plays: 'flute',    reaction: [1.6, 2.8], accuracy: 0.88, line: 'Smooth, quiet, and always on time.'},
  {name: 'Blitz',        color: 'pink',   plays: 'clarinet', reaction: [1.3, 2.3], accuracy: 0.91, line: 'Fast hands. Faster puck.'},
  {name: 'Zero Gravity', color: 'blue',   plays: 'horn',     reaction: [1.0, 1.9], accuracy: 0.94, line: 'The puck just floats back. Every time.'},
  {name: 'The Champ',    color: 'white',  plays: 'tuba',     reaction: [0.8, 1.5], accuracy: 0.97, line: 'Undefeated. Until today?'},
];

/* DIFFICULTY per player: the shortest time they ever get to play their note (from the note appearing to the goal) */
window.FACEOFF_DIFFICULTY = [
  {id: 'rookie',  label: 'Rookie',   window: 4.0, level: 1},   // level 1 = the smaller starting note pool (sequences.js)
  {id: 'pro',     label: 'Pro',      window: 2.5, level: 2},
  {id: 'allstar', label: 'All-Star', window: 1.5, level: 2},
];

window.FACEOFF_RULES = {
  points: [5, 7, 11],   // points-to-win choices on the match setup (7 is the default)
  defaultPoints: 7,
  cpuWindow: 1.5,       // the CPU's own minimum window (it is an All-Star at receiving)
  serveTime: 6.0,       // seconds the first shot of a rally takes to cross the table (before power)
  rallySpeedUp: 0.92,   // each return multiplies the rally's base crossing time by this (RALLY ESCALATION)
  serveMax: 8,          // a serve not played within this many seconds goes as a WEAK serve
  suppressMs: 480,      // after each hit the detector hears nothing this long (the hit sound); the opponent's clock starts after it
  /* STRIKE POWER from reaction time (seconds from the note appearing to the note registering). The shot's crossing
     time = base × factor, but never shorter than the receiver's minimum window (+ suppressMs). */
  power: [
    {label: 'SMASH!', under: 1.0, factor: 0.55, sound: 'puck-smash'},
    {label: 'POWER',  under: 1.8, factor: 0.70, sound: 'puck-hit-hard'},
    {label: 'GOOD',   under: 3.0, factor: 0.85, sound: 'puck-hit-hard'},
    {label: 'WEAK',   under: Infinity, factor: 1.0, sound: 'puck-hit-soft'},
  ],
  serve: 'loser',       // who serves after a goal: 'loser' (the player who was scored on, like real air hockey) or 'alternate'
  celebrateMs: 1700,    // the goal celebration before the next serve
  sounds: true,         // hit, goal and turn sounds (each one mutes the detector while it plays); false = a silent game
};
