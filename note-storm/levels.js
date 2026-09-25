/* Note Storm level design. Tweak freely; the game reads everything from here.
     count  notes in the level
     pool   how many of the five notes are used (3 = the first three)
     march  seconds a note takes to cross the staff from the right edge to the defender
     every  seconds between new notes (a new note also waits for room: see maxOn)
     maxOn  most notes on the staff at once
     names  true = the note name rides under each note, false = read the staff
   Clearing a level (80% of notes blasted, at least one life left) unlocks the next one. */
window.STORM_LEVELS = [
  {name:'Warm-Up',     count:6,  pool:3, march:12,  every:1,   maxOn:1, names:true,  blurb:'First three notes, one at a time. Names showing.'},
  {name:'All Five',    count:8,  pool:5, march:11,  every:1,   maxOn:1, names:true,  blurb:'All five notes, one at a time. Names showing.'},
  {name:'Double Up',   count:10, pool:5, march:10,  every:5,   maxOn:2, names:true,  blurb:'Two notes on the staff at once.'},
  {name:'No Names',    count:10, pool:5, march:10,  every:4.5, maxOn:2, names:false, blurb:'The names are gone. Read the staff.'},
  {name:'Picking Up',  count:12, pool:5, march:8.5, every:3.8, maxOn:2, names:false, blurb:'A little faster.'},
  {name:'Triple',      count:14, pool:5, march:8,   every:3,   maxOn:3, names:false, blurb:'Up to three notes at once.'},
  {name:'Rush',        count:16, pool:5, march:7,   every:2.4, maxOn:3, names:false, blurb:'Faster, and more of them.'},
  {name:'Note Storm',  count:20, pool:5, march:6,   every:1.7, maxOn:4, names:false, blurb:'Twenty notes, up to four at once.'},
];
window.STORM_RULES = {
  lives: 3,             // notes that can reach the defender before the level ends
  passRate: 0.8,        // share of notes blasted needed to clear a level (1 star)
  base: 100,            // points for each note blasted
  farBonus: 100,        // extra points for a note blasted at the right edge (less the closer it gets)
  readyMs: 1200,        // "Get ready" pause before the first note
  refillMs: 700,        // pause before a new note fills a spot that just opened
};
