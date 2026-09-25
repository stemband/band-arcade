/* Ghost Notes level design. Tweak freely; the game reads everything from here.
     count  notes in the level
     pool   how many of the five notes are used (3 = the first three)
     time   seconds per note before it counts as missed
     vis    how visible the note name is: 1 = full, 0 = gone, 'flash' = shows briefly then vanishes
   Clearing a level (80% of notes) unlocks the next one. */
window.GHOST_LEVELS = [
  {name:'Warm-Up',      count:6,  pool:3, time:10,  vis:1,       blurb:'First three notes. Names showing.'},
  {name:'All Five',     count:8,  pool:5, time:9,   vis:1,       blurb:'All five notes. Names showing.'},
  {name:'Fading',       count:10, pool:5, time:8,   vis:.5,      blurb:'The names start to fade.'},
  {name:'Faint',        count:10, pool:5, time:7,   vis:.2,      blurb:'The names are barely there.'},
  {name:'Blink',        count:10, pool:5, time:6,   vis:'flash', blurb:'Each name flashes, then vanishes.'},
  {name:'Ghosted',      count:12, pool:5, time:6,   vis:0,       blurb:'No names. Read the staff.'},
  {name:'Quick Ghosts', count:12, pool:5, time:4.5, vis:0,       blurb:'No names, less time.'},
  {name:'Ghost Run',    count:15, pool:5, time:3.5, vis:0,       blurb:'Fifteen notes, fast.'},
];
window.GHOST_RULES = {
  passRate: 0.8,        // share of notes needed to clear a level (1 star)
  twoStarRate: 0.9,     // 2 stars
  flashMs: 1300,        // how long the name shows on 'flash' levels
  afterHitMs: 650,      // pause after a correct note
  afterMissMs: 1400,    // pause after time runs out (shows the answer)
};
