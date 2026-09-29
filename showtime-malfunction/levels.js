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
     x        THE NIGHTMARE COLUMN (the harder difficulty; everything not listed here stays as above: same
              number of animatronics, same lanes, same pool):
                count   [fewest, most] plays each               snare  [fewest, most] hits (Snare Drum, up to 16)
                speed   walk-speed multiplier (1.15 = 15% faster than Normal: walk seconds ÷ speed)
                blurb   the level card's sentence in NIGHTMARE
                boss    {count, snare}: Maestro Moose's plays / hits per phase (phases and the rest as in `boss`)
   STARS per showtime: 3 = no spotlights lost, 2 = one lost, 1 = survived (a spotlight left). All 3 out = SHOWTIME'S OVER.
   Normal and NIGHTMARE keep separate stars (NIGHTMARE saves under the same progress keys + ':extra'). */
window.SHOWTIMES = [
  {name: 'The 5:00 Show',       blurb: 'One at a time, slow. Play each note twice.',          bots: 5, count: [2, 2], snare: [4, 4],   atOnce: 1, lanes: 2, walk: 14, pool: 3,
    x: {count: [2, 3], snare: [4, 6],   speed: 1.15, blurb: 'Two or three plays each, a little faster.'}},
  {name: 'The 6:00 Show',       blurb: 'Two or three plays each.',                            bots: 6, count: [2, 3], snare: [4, 6],   atOnce: 1, lanes: 2, walk: 13, pool: 5,
    x: {count: [4, 4], snare: [8, 8],   speed: 1.15, blurb: 'Four plays each.'}},
  {name: 'The 7:00 Show',       blurb: 'Three plays each, two on the floor at once.',         bots: 7, count: [3, 3], snare: [6, 6],   atOnce: 2, lanes: 2, walk: 12, pool: 5,
    x: {count: [5, 5], snare: [10, 10], speed: 1.15, blurb: 'Five plays each, two on the floor at once.'}},
  {name: 'The 8:00 Show',       blurb: 'Three or four plays each.',                           bots: 8, count: [3, 4], snare: [6, 8],   atOnce: 2, lanes: 2, walk: 11, pool: 5,
    x: {count: [6, 6], snare: [12, 12], speed: 1.18, blurb: 'Six plays each.'}},
  {name: 'The 9:00 Show',       blurb: 'Four plays each, and they move faster.',              bots: 8, count: [4, 4], snare: [8, 8],   atOnce: 2, lanes: 2, walk: 9.5, pool: 5,
    x: {count: [6, 8], snare: [12, 14], speed: 1.18, blurb: 'Six to eight plays each, and they move faster.'}},
  {name: 'The 10:00 Show',      blurb: 'Four or five plays each, in three lanes.',            bots: 9, count: [4, 5], snare: [8, 10],  atOnce: 3, lanes: 3, walk: 10, pool: 5,
    x: {count: [8, 8], snare: [14, 14], speed: 1.18, blurb: 'Eight plays each, in three lanes.'}},
  {name: 'The 11:00 Show',      blurb: 'Five or six plays each, faster still.',               bots: 10, count: [5, 6], snare: [10, 12], atOnce: 3, lanes: 3, walk: 9, pool: 5,
    x: {count: [8, 10], snare: [14, 16], speed: 1.2, blurb: 'Eight to ten plays each, faster still.'}},
  {name: 'The Midnight Encore', blurb: 'Maestro Moose takes the stage: 8 plays, three times over, while the band keeps coming.',
                                                                                              bots: 6, count: [3, 4], snare: [6, 8],   atOnce: 2, lanes: 3, walk: 11, pool: 5,
    boss: {count: 8, phases: 3, snare: 12, walk: 34},
    x: {count: [4, 5], snare: [8, 10], speed: 1.2, blurb: 'Maestro Moose returns: 12 plays, three times over, while the band keeps coming.',
      boss: {count: 12, snare: 16}}},
];

window.SHOWTIME_RULES = {
  spotlights: 3,          // the student's stage lights; each animatronic that reaches the front knocks one out
  holdHintMs: 1000,       // a note held this long with no new attack shows "Tongue each note!"
  lurchMs: [170, 260],    // stop-motion: an animatronic moves in jerky steps this far apart (off with reduced motion)
  bossStagger: 0.22,      // how far Maestro Moose staggers back after each phase (0–1 of the floor)
  points: {tick: 10, reboot: 100, early: 100,    // each counted play, each reboot, + up to `early` for rebooting it far away
           special: 150},                        // + this for rebooting a SPECIAL MACHINE (+ its own `points` below)
  storyOnce: true,        // show the story before the first showtime (it can always be read again from the level screen)
};

/* THE SPECIAL MACHINES: rare bonus animatronics with an ability. A special REPLACES a regular animatronic when it
   walks on (the showtime has the same number of machines; only Split Sprocket's two minis are extra), and never more
   than one special is on the floor at once (the minis don't count). Stars work exactly as before; rebooting a special
   earns bonus points. The first time a device meets each one, the game pauses for its "NEW MALFUNCTION DETECTED!" card.

     chance    the chance (0–1) that an animatronic walking on is a special, by showtime (1–8): none in 1–2
     nightmare added to that chance in NIGHTMARE (only where specials already appear: never in Showtimes 1–2)
   Each machine (the id is saved in the Malfunction Files: never rename it):
     name, how     its name and the one-line "how to beat it" on its card and in the Malfunction Files
     speed         walk-speed multiplier (2 = twice as fast as the showtime's animatronics, 0.6 = slower)
     count         [fewest, most] plays (Turbo Tin, split minis), or countMul × the showtime's count (Tuba Tank)
     snare         the same for the Snare Drum (hits)
     points        extra points for this one (on top of SHOWTIME_RULES.points.special, which every special earns)
     howSnare      the card's line for the Snare Drum, when the machine works differently there
   SNARE DRUM (count mode): Turbo Tin, Tuba Tank, Split Sprocket, Blackout Bot and Oil Can Ollie work with hits; the Long
   Tone Lurker wants a steady ROLL; the Duet Dolls and the Glitch Jester are ordinary counts (no notes to swap).
   and its own settings, explained on its line. */
window.SHOWTIME_SPECIALS = {
  chance: [0, 0, .15, .15, .25, .25, .25, .30],
  nightmare: .10,
  machines: {
    // fast and fragile: twice the speed, only 1–2 plays
    'turbo-tin':        {name: 'Turbo Tin', how: 'Twice as fast, but it only needs 1 or 2 plays. Be quick!', speed: 2, count: [1, 2], snare: [2, 3], points: 50},
    // slow and armored: ~2× the plays; one armor plate pops off with each counted play (at most `plates` plates drawn)
    'tuba-tank':        {name: 'Tuba Tank', how: 'Slow, but armored: it needs twice as many plays. Pop off every plate!', speed: .6, countMul: 2, plates: 8, points: 100},
    // tonguing does NOT count: hold its note steadily for `hold` seconds (by showtime 1–8); the ring drains at `drain`
    // × fill speed while the note stops or changes. Snare: a steady roll of at least `rollRate` hits a second for `roll` seconds
    'long-tone-lurker': {name: 'Long Tone Lurker', how: 'Tonguing won\'t work. Hold its note: one long, steady note until the ring fills.', speed: .85,
                         hold: [2, 2, 2, 2.5, 3, 3.5, 3.5, 4], drain: .5, roll: [2, 2, 2, 2, 2.5, 2.5, 3, 3], rollRate: 6, points: 100,
                         howSnare: 'Single hits won\'t work. Keep a steady roll (6 hits a second or more) until the ring fills.'},
    // a linked pair with two different notes: play them in turns A, B, A, B… (the next one glows); the other note does nothing
    'duet-dolls':       {name: 'Duet Dolls', how: 'Two dolls, two notes. Take turns: first doll, second doll, first, second…', speed: .9, minCount: 4, points: 100,
                         howSnare: 'Two dolls, one count: hit it that many times, like the rest of the band.'},
    // after `switchAt` of its plays its note glitches (slowly, `glitchMs`) into another note from the set
    'glitch-jester':    {name: 'Glitch Jester', how: 'Halfway through, its note glitches into a different one. Read it again!', switchAt: .5, glitchMs: 700, points: 75,
                         howSnare: 'A trickster, but on the snare it\'s just a count: hit it that many times.'},
    // rebooted, it splits into two minis in the lanes beside it: faster, one play each
    'split-sprocket':   {name: 'Split Sprocket', how: 'Reboot it and it splits in two! Each mini is fast but needs only 1 play.', miniSpeed: 1.5, miniCount: [1, 1], miniSnare: [2, 2], points: 75},
    // its voice box is dark until it has walked `revealAt` of the way, then the note fades in (`fadeMs`, no flicker)
    'blackout-bot':     {name: 'Blackout Bot', how: 'Its note is hidden in the dark. Watch closely: it fades in halfway.', revealAt: .5, fadeMs: 900, points: 75},
    // while on the floor, every `every` seconds it oils the nearest other machine: +1 play (at most `maxAdd` per machine)
    'oil-can-ollie':    {name: 'Oil Can Ollie', how: 'It oils the others: +1 play every few seconds. Reboot Ollie first!', every: 4, maxAdd: 3, points: 100},
  },
};

/* JUMP SCARE MODE (the third SPOOKY LEVEL, after a warning; only if shared/teacher-settings.js allows it): EVERY
   showtime played in it gets its scares, timed by PROGRESS through the show (never by fixed seconds: a quick player
   finishes the early showtimes in 20–30 seconds). The scares pause the band, the clocks and the microphone, and never
   cost a spotlight.
     at          when, as shares of the showtime's animatronics that have walked on: a scare comes `delay` seconds after
                 that many have entered. `short` = a showtime with fewer than `longFrom` animatronics (1 scare), `long` =
                 one with `longFrom` or more, or with Maestro Moose (2 scares). Never the last one to walk on, so a scare
                 never lands in the last seconds of a show.
     delay       seconds (game clock) after that animatronic walks on
     notBefore   never in the first seconds of a showtime (it waits)
     apart       at least this many seconds between two scares (the second waits)
     bossGuard   never in the last seconds of a boss phase (the Maestro this close to the front, or 2 plays or fewer left)
     ms          how long a scare lasts, and `beat` = the pause after it before the band moves again */
window.SHOWTIME_SCARES = {at: {short: [.4], long: [.25, .55]}, longFrom: 7, delay: 1, notBefore: 6, apart: 6, bossGuard: 5, ms: 1300, beat: 700};
