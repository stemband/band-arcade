/* Chime Heist vaults (the levels). Tweak freely; the game reads everything from here.
   Each line is one vault, in the order students crack them.

     name      the vault's name
     treasure  what's inside when the door swings open: 'lemon' | 'plush' | 'robot' | 'watch' |
               'painting' | 'diamond' | 'coins' | 'crown'  (drawn in game.js, TREASURES)
     count     notes in the vault's code (SCALES and CHROMATIC play at least the whole scale up and down)
     time      seconds for each note before a guard's flashlight sweeps by (a miss)
     labels    letter names on the bars: 'all' | 'faded' | 'c' (only the C bars, a landmark) | 'none'
     onScreen  notes of the code on the terminal at once. 2 or more = READ AHEAD: play them left to right
     alarm     alarm meter segments. Each wrong bar or timeout fills one; full = CAUGHT, the vault ends
     pool      FIRST FIVE mode only: how many of the first five notes are used (3 = the first three)
   Clearing a vault (80% of the code, alarm not full) unlocks the next one. */
window.HEIST_VAULTS = [
  {name: 'Lemonade Stand Lockbox', treasure: 'lemon',    count: 8,  time: 10,  labels: 'all',   onScreen: 1, alarm: 6, pool: 3},
  {name: 'Arcade Prize Counter',   treasure: 'plush',    count: 8,  time: 9,   labels: 'faded', onScreen: 1, alarm: 6, pool: 5},
  {name: 'Toy Store Safe',         treasure: 'robot',    count: 10, time: 8,   labels: 'c',     onScreen: 1, alarm: 5, pool: 5},
  {name: 'Train Car Strongbox',    treasure: 'watch',    count: 10, time: 8,   labels: 'none',  onScreen: 1, alarm: 5, pool: 5},
  {name: 'Art Gallery Case',       treasure: 'painting', count: 12, time: 6,   labels: 'none',  onScreen: 1, alarm: 4, pool: 5},
  {name: 'Museum Diamond Vault',   treasure: 'diamond',  count: 12, time: 6,   labels: 'none',  onScreen: 2, alarm: 4, pool: 5},
  {name: 'City Bank Vault',        treasure: 'coins',    count: 15, time: 5,   labels: 'none',  onScreen: 3, alarm: 4, pool: 5},
  {name: 'The Golden Vault',       treasure: 'crown',    count: 20, time: 3.5, labels: 'none',  onScreen: 4, alarm: 3, pool: 5},
];
window.HEIST_RULES = {
  passRate: 0.8,        // share of the code played in time to clear a vault (1 star)
  twoStarRate: 0.9,     // 2 stars (3 stars = no mistakes and no misses)
  base: 100,            // points for each correct bar
  speedBonus: 100,      // extra points for an instant strike (less as the timer runs down)
  streakStep: 5,        // every 5 in a row (the SILENT STREAK) raises the multiplier by 1 …
  maxMultiplier: 4,     // … up to ×4
  afterGroupMs: 450,    // pause before the next notes of the code appear
  afterMissMs: 1300,    // pause after a timeout (the right bar glows)
};
