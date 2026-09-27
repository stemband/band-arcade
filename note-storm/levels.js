/* Note Storm level design. Tweak freely; the game reads everything from here.
     count  notes in the level
     pool   how many of the five notes are used (3 = the first three)
     march  seconds a note takes to cross the staff from the right edge to Tempo (smaller = faster).
            Keep it at 2.5 or more: a student needs about 0.3 s to hold a note plus time to read and react.
     every  AVERAGE seconds between new notes (keep it 0.7 or more so a strong student can keep up)
     gust   0–0.5: how uneven the storm is. 0 = a note exactly every `every` seconds. 0.4 = runs of quick notes
            (every × 0.6 apart) then runs of slow ones (every × 1.4), so the average stays `every` but a gust can
            fill the staff up to maxOn. A new note also waits for room: it never lands on top of another one.
     maxOn  most notes on the staff at once (1–5)
     names  true = the note name rides under each note, false = read the staff
   Speeds below are compared with the old hardest level (march 6 s = "1×").
   Clearing a level (80% of notes blasted, at least one life left) unlocks the next one.
   Keep 8 levels: saved stars are stored by level number. */
window.STORM_LEVELS = [
  //  name            count  pool  march  every  gust  maxOn  names     speed vs old hardest
  {name:'Warm-Up',     count:6,  pool:3, march:12,  every:1,    gust:0,   maxOn:1, names:true,  blurb:'First three notes, one at a time. Names showing.'},   // 0.5×
  {name:'All Five',    count:8,  pool:5, march:10,  every:1,    gust:0,   maxOn:1, names:true,  blurb:'All five notes, one at a time. Names showing.'},     // 0.6×
  {name:'Double Up',   count:12, pool:5, march:8,   every:3,    gust:0.2, maxOn:2, names:true,  blurb:'Two notes on the staff at once.'},                    // 0.75×
  {name:'No Names',    count:14, pool:5, march:6.5, every:2.4,  gust:0.2, maxOn:2, names:false, blurb:'The names are gone. Read the staff.'},               // 0.9×
  {name:'Triple',      count:18, pool:5, march:5.2, every:1.8,  gust:0.3, maxOn:3, names:false, blurb:'Up to three notes at once.'},                        // 1.15×
  {name:'Rush',        count:24, pool:5, march:4.2, every:1.3,  gust:0.35,maxOn:4, names:false, blurb:'Faster, and up to four at once.'},                   // 1.4×
  {name:'Downpour',    count:30, pool:5, march:3.3, every:1,    gust:0.4, maxOn:4, names:false, blurb:'A real downpour. Keep them coming!'},                 // 1.8×
  {name:'Note Storm',  count:40, pool:5, march:2.5, every:0.8,  gust:0.45,maxOn:5, names:false, blurb:'Forty notes, up to five at once. Can you stop the storm?'}, // 2.4×
];
window.STORM_RULES = {
  lives: 3,             // notes that can reach the defender before the level ends
  passRate: 0.8,        // share of notes blasted needed to clear a level (1 star)
  base: 100,            // points for each note blasted
  farBonus: 100,        // extra points for a note blasted at the right edge (less the closer it gets)
  readyMs: 1200,        // "Get ready" pause before the first note (longer if the level-start sound is still playing)
  refillMs: 700,        // pause before a new note fills a spot that just opened on a FULL staff
  gapUnits: 64,         // the closest two notes may be on the staff (staff units; a note with a ♯ is about 60 wide)
  muteMs: 250,          // the most of any sound that mutes the microphone (+ 250 ms of room echo, shared/sfx.js):
                        // the storm never stops, so a long hit sound must not leave the detector deaf
};

/* ENDLESS MODE (the ∞ card under the levels): play until the last heart is gone. The speed never stops rising.
   SPEED (shown in the HUD): 1 = Level 1's pace (a note takes march1 seconds to reach Tempo); Level 8 is about 4.8.
     SPEED after t seconds = start + (max − start) × (1 − e^(−t ÷ k)) + creep × t      (shared/endless.js)
   With these numbers: 0.85 at the start, about 2.7 after 1 minute, 3.8 after 2, 4.5 after 3, 5.4 after 5.
   The notes never get faster than minMarch; past that, the rising SPEED only brings them closer together
   (every ÷ SPEED, down to minEvery) with up to 5 on the staff at once, so late runs are about reading several notes. */
window.STORM_ENDLESS = {
  march1: 12,          // seconds to reach Tempo at SPEED 1 (Level 1's pace)
  start: 0.85,         // SPEED at the start: slower than Level 1 (a note takes 14 s)
  max: 4.4,            // the main ramp heads toward this SPEED…
  k: 100,              // …fast at first (after k seconds it has gone about 63% of the way)
  creep: 0.004,        // …plus this much more every second, forever (0.24 a minute), so every run ends
  minMarch: 2.2,       // never faster than this many seconds to reach Tempo (a held note needs ~0.3 s to count)
  every: 3.96,         // average seconds between new notes = every ÷ SPEED (0.8 s at SPEED 4.95)…
  minEvery: 0.55,      // …but never closer than this
  gust: 0.3,           // uneven gusts, like the levels (0 = perfectly even)
  more: [[1.3, 2], [2.2, 3], [3.4, 4], [4.8, 5]],   // [from SPEED, most notes on the staff at once]
  smallPoolUntil: 1.3, // until this SPEED, only the smaller level-1 pool (first three notes, a scale's first five…)
  flashEvery: 0.5,     // "SPEED UP!" each time SPEED passes a multiple of this (about every 20–60 s)
  lives: 3,            // a note reaching Tempo costs a heart; wrong notes only break the combo
  base: 100, farBonus: 100,   // points per note, like the levels, × the combo (×2 at 10 in a row, ×3 at 25, ×4 at 50)…
  speedBonus: 0.5,     // …× (1 + speedBonus × (SPEED − 1)): the faster it is, the more each note is worth
};
