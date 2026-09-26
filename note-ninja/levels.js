/* Note Ninja belts (the levels). Tweak freely; the game reads everything from here.

   MAT: these are the 10 Band Ninja ranks, in the order students earn them. Each line is one belt.
   Change the numbers freely. To change a belt's color, pick a different `color` token below
   (or change that token's color in shared/theme.css: --belt-white, --belt-yellow, …).
   Don't reorder or remove lines without a plan for saved stars: they are saved by position (belt 1, 2, …).

     name     the belt's name, shown on the belt card and in the results
     color    'belt-white' | 'belt-yellow' | 'belt-orange' | 'belt-green' | 'belt-blue' | 'belt-purple'
              | 'belt-red' | 'belt-brown' | 'belt-black' | 'belt-diamond'
     sparkle  true = the belt glints (Diamond); off for reduced motion
     count    notes in the belt (SCALES mode plays at least the whole scale up and down)
     time     seconds for each note before it counts as missed
     guides   faint letter names on the staff lines and spaces: .55 = easy to see, .25 = faint, 0 = none
     onStaff  notes on the staff at once. 2 or more = READ AHEAD: answer them left to right
     relabel  false = the letter buttons don't change to A♭ B♭ … / A♯ B♯ … after ♭/♯ is tapped (no hint)
     pool     RANDOM mode only: how many of the first five notes are used (3 = the first three)
   Clearing a belt (80% of notes named in time) unlocks the next one. */
window.NINJA_BELTS = [
  {name: 'White',   color: 'belt-white',   count: 8,  time: 10,  guides: .55, onStaff: 1, pool: 3, blurb: 'First three notes. Letter guides on the staff.'},
  {name: 'Yellow',  color: 'belt-yellow',  count: 8,  time: 9,   guides: .25, onStaff: 1, pool: 5, blurb: 'All five notes. The guides fade.'},
  {name: 'Orange',  color: 'belt-orange',  count: 10, time: 8,   guides: 0,   onStaff: 1, pool: 5, blurb: 'No guides. Read the staff.'},
  {name: 'Green',   color: 'belt-green',   count: 12, time: 6,   guides: 0,   onStaff: 1, pool: 5, blurb: 'Twelve notes, less time.'},
  {name: 'Blue',    color: 'belt-blue',    count: 12, time: 6,   guides: 0,   onStaff: 2, pool: 5, blurb: 'Read ahead: two notes at once, left to right.'},
  {name: 'Purple',  color: 'belt-purple',  count: 15, time: 5,   guides: 0,   onStaff: 3, pool: 5, blurb: 'Three notes at once.'},
  {name: 'Red',     color: 'belt-red',     count: 15, time: 4.5, guides: 0,   onStaff: 3, pool: 5, blurb: 'Three notes at once, faster.'},
  {name: 'Brown',   color: 'belt-brown',   count: 16, time: 4.5, guides: 0,   onStaff: 4, pool: 5, blurb: 'Four notes at once.'},
  {name: 'Black',   color: 'belt-black',   count: 20, time: 3.5, guides: 0,   onStaff: 4, pool: 5, blurb: 'Twenty notes, four at once, fast.'},
  {name: 'Diamond', color: 'belt-diamond', count: 24, time: 3,   guides: 0,   onStaff: 4, pool: 5, sparkle: true, relabel: false,
   blurb: 'Twenty-four notes, fastest. The buttons give no ♭/♯ hints.'},
];
window.NINJA_RULES = {
  passRate: 0.8,        // share of notes named in time to clear a belt (1 star)
  twoStarRate: 0.9,     // 2 stars (3 stars = no mistakes and no misses)
  base: 100,            // points for each note named
  speedBonus: 100,      // extra points for an instant answer (less as the timer runs down)
  comboStep: 5,         // every 5 in a row raises the combo multiplier by 1 …
  maxMultiplier: 4,     // … up to ×4
  afterGroupMs: 450,    // pause before the next notes appear
  afterMissMs: 1200,    // pause after time runs out (shows the answer)
};
