/* Showtime Malfunction: the SHOWTIMES (levels) and the rules. Tweak freely; the game reads everything from here.

   SHOWTIMES, one line each, in order. Stars are saved by showtime number (1–8), so keep the order.
     name     the showtime's name                    blurb   one plain sentence for the level card
     bots     how many animatronics lurch out in this showtime (the notes come from NOTES × ORDER, like every game)
     count    [fewest, most] times each one's note must be played (tongued or struck) to reboot it
     snare    [fewest, most] hits for the Snare Drum player (a count-only mode, so bigger numbers, up to 12)
     atOnce   how many can be on the floor at the same time
     lanes    2 or 3 lanes across the arcade floor
     walk     seconds an animatronic takes to lurch from the back of the arcade to the front (smaller = faster)
     pool     3 = the smaller starting note pool on the first showtime (sequences.js), 5 = the whole pool
     boss     the final boss (showtime 8): Maestro Moose, `phases` × `count` plays (snare: `snare` hits a phase),
              walking `walk` seconds, while the smaller animatronics keep coming
   STARS per showtime: 3 = no spotlights lost, 2 = one lost, 1 = survived (a spotlight left). All 3 out = SHOWTIME'S OVER. */
window.SHOWTIMES = [
  {name: 'The 5:00 Show',       blurb: 'One at a time, slow. Play each note twice.',          bots: 5, count: [2, 2], snare: [4, 4],   atOnce: 1, lanes: 2, walk: 14, pool: 3},
  {name: 'The 6:00 Show',       blurb: 'Two or three plays each.',                            bots: 6, count: [2, 3], snare: [4, 6],   atOnce: 1, lanes: 2, walk: 13, pool: 5},
  {name: 'The 7:00 Show',       blurb: 'Three plays each, two on the floor at once.',         bots: 7, count: [3, 3], snare: [6, 6],   atOnce: 2, lanes: 2, walk: 12, pool: 5},
  {name: 'The 8:00 Show',       blurb: 'Three or four plays each.',                           bots: 8, count: [3, 4], snare: [6, 8],   atOnce: 2, lanes: 2, walk: 11, pool: 5},
  {name: 'The 9:00 Show',       blurb: 'Four plays each, and they move faster.',              bots: 8, count: [4, 4], snare: [8, 8],   atOnce: 2, lanes: 2, walk: 9.5, pool: 5},
  {name: 'The 10:00 Show',      blurb: 'Four or five plays each, in three lanes.',            bots: 9, count: [4, 5], snare: [8, 10],  atOnce: 3, lanes: 3, walk: 10, pool: 5},
  {name: 'The 11:00 Show',      blurb: 'Five or six plays each, faster still.',               bots: 10, count: [5, 6], snare: [10, 12], atOnce: 3, lanes: 3, walk: 9, pool: 5},
  {name: 'The Midnight Encore', blurb: 'Maestro Moose takes the stage: 8 plays, three times over, while the band keeps coming.',
                                                                                              bots: 6, count: [3, 4], snare: [6, 8],   atOnce: 2, lanes: 3, walk: 11, pool: 5,
    boss: {count: 8, phases: 3, snare: 12, walk: 34}},
];

window.SHOWTIME_RULES = {
  spotlights: 3,          // the student's stage lights; each animatronic that reaches the front knocks one out
  holdHintMs: 1000,       // a note held this long with no new attack shows "Tongue each note!"
  lurchMs: [170, 260],    // stop-motion: an animatronic moves in jerky steps this far apart (off with reduced motion)
  bossStagger: 0.22,      // how far Maestro Moose staggers back after each phase (0–1 of the floor)
  points: {tick: 10, reboot: 100, early: 100},   // each counted play, each reboot, + up to `early` for rebooting it far away
  storyOnce: true,        // show the story before the first showtime (it can always be read again from the level screen)
};
