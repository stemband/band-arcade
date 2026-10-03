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

/* THE SNARE DRUM'S JOBS (only when the player is the Snare Drum: wind players never see any of this). The microphone
   hears WHEN a hit lands and HOW LOUD it is (shared/onsets.js), never which hand played: nothing here judges sticking.
   Every time below is on the game clock: it stops with the band (a sound playing, PAUSE, a special's card, a scare).
   Arrays with 8 numbers = one per showtime (1–8). `from` = the first showtime a job appears in.
   THE BEAT is SILENT (no click: a sound would mute the microphone): the stage lights and the target panel's border
   swell on every beat (never more than 2.2 swells a second: keep every bpm ≤ 132), a row of beat dots on the panel. */
window.SNARE_RULES = {
  // the silent pulse's tempo on count machines (beats a minute), and the demo keys' hit loudness (?demo: Space)
  beat: {bpm: [72, 72, 76, 80, 84, 88, 96, 100], maxSwells: 2.2},
  // EXACT COUNTS (every showtime): at 0 the machine waits confirmMs; a hit then = an OVER-HIT (+overhitAdd, count again);
  // silence = reboot. The next target listens only after gapMs of silence (a hit in the gap starts the gap again)
  exact: {confirmMs: 350, overhitAdd: 2, gapMs: 400},
  // FREEZE (from showtime 2): at a `chance` share of count machines, when `at` of its hits are done, the Maestro's hand
  // rises for `beats` beats: every machine walks at walkMul, a hit = +penalty hits. Never in the last `guard` seconds
  // before the target reaches the front
  freeze: {from: 2, chance: [0, .3, .3, .3, .35, .35, .4, .4], beats: [0, 2, 2, 3, 3, 3, 4, 4], at: .5, walkMul: .5, penalty: 2, guard: 2},
  // RHYTHM MACHINES (from showtime 3): a `share` of the regular machines ask for `measures` one-measure rhythms (4/4,
  // SNARE_RHYTHMS below) played in time after a one-measure silent count-in. Every written note needs a hit within
  // `window` ms and no extra hits (rests included); a failed measure is played again. bpm × nightmareBpm on NIGHTMARE
  rhythm: {from: 3, share: [0, 0, .35, .35, .3, .25, .25, .25], measures: [0, 0, 1, 1, 1, 2, 2, 2],
    window: [0, 0, 160, 150, 145, 140, 130, 120], bpm: [0, 0, 76, 80, 84, 88, 96, 100], nightmareBpm: 1.1, leadS: .4},
  // SOFT AND LOUD (from showtime 5): a `share` of the regular machines are p (only soft hits count; a loud one = +1) or
  // f (only loud hits count). THE SOUNDCHECK (before the first dynamics showtime, and "Redo soundcheck" on the snare
  // card): `hits` soft, then `hits` loud; the split = halfway between them on a log scale; loud must be ≥ minRatio × soft
  dyn: {from: 5, share: [0, 0, 0, 0, .25, .2, .2, .2], hits: 4, minRatio: 2},
  // ACCENT MACHINES (from showtime 6): a `share` of the regular machines: 8 eighth notes (a 4-long pattern plays twice)
  // in time with the pulse like a rhythm machine; every > hit loud and every other hit soft (the soundcheck's split)
  accent: {from: 6, share: [0, 0, 0, 0, 0, .2, .2, .2], measures: [0, 0, 0, 0, 0, 1, 1, 1],
    patterns: ['> - - -', '- - > -', '> - - - > - - -', '> - > - - > - -']},
  // THE LONG TONE LURKER'S ROLL fills only while it's fast enough (its rollRate) AND even: the gaps' spread (coefficient
  // of variation over the last `windowS` s) ≤ maxCv (NIGHTMARE: maxCvNightmare); a clumpy roll fills at clumpyMul.
  // NIGHTMARE: the Glitch Lurker's roll is a CRESCENDO: each third of the ring crescK × louder than the one before
  roll: {maxCv: .35, maxCvNightmare: .25, clumpyMul: .3, windowS: 1, crescK: 1.15, crescListenS: .4},
  // THE TEMPO-LOCK MAESTRO (NIGHTMARE, showtime 8): each phase at its own bpm, after a one-measure count-in: steady
  // EIGHTH notes; a hit within `window` ms of the eighth grid fills 1/(2 × beats) of the phase, a hit off it drains the
  // same; the average drift over the last beat says "rushing" / "dragging"
  maestro: {bpm: [84, 96, 108], beats: 8, window: 90},
  // THE FAIRNESS CHECK for every snare job (as the hybrids'): a machine is slowed until its job (hits ÷ `rate` a second,
  // the confirm wait, freeze beats, count-in + measures, the roll) fits in `margin` of the time it walks
  fair: {rate: 4, margin: .7},
  // THE TIMING CHECK (shared/timing-check.js, the same as Rhythm Dojo's; saved for the whole arcade): 4 clicks to listen
  // to, then hit on 8. Rhythm jobs take this device's delay off every hit (none yet = Rhythm Dojo's default)
  timing: {calLead: 4, calClicks: 8, calBpm: 90, calNeed: 5, maxLagMs: 400, calMinSpreadMs: 3, calClickMaxMs: 25, calTooEarlyMs: 120,
    bleedMs: 90, bleedK: 2.2, clickVol: .9},
  demo: {level: .3, soft: .06, loud: .4},
};

/* THE SNARE'S RHYTHMS: loaded from Rhythm Dojo's vetted one-measure cells (rhythm-dojo/levels.js RD_LEVELS, 4/4 only),
   filtered by what each showtime allows (a rhythm is drawn at random, never the same twice in a row). A showtime's
   pool = every 4/4 cell whose tokens are all in `allow`; `sync: false` = no syncopation (a quarter or longer starting
   off the beat); `more` = extra rhythms written here (counting.js text, one measure). */
window.SNARE_RHYTHMS = {
  3: {allow: 'q e', sync: false},                                       // quarters and eighths
  4: {allow: 'q e qr er', sync: false},                                 // + quarter and eighth rests
  5: {allow: 'q e qr er q. e_ q_', sync: false, more: ['q. e q. e', 'q_ e e q q']},   // + dotted quarter–eighth, ties
  6: {allow: 'q e qr er q. e_ q_ [ ]', sync: false},                    // + eighth-note triplets
  7: {allow: 'q e qr er q. e_ q_ [ ] s', sync: false, more: ['e s s e s s q q', 's s e q q q', 's s s s s s s s q q']},   // + sixteenth combos
  8: {allow: '*', sync: true},                                          // everything, syncopation too
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
   and its own settings, explained on its line.

   HYBRIDS: stitched-together machines (`hybrid: [A, B]`, the two specials they're made of). A hybrid does BOTH parents'
   tricks with the parents' own rules and settings; anything set on the hybrid's own line wins over the parents' (its
   speed, a sooner reveal, a gentler count…). They appear only from Showtime `hybrids.from` on (NIGHTMARE too): a share
   of the specials (`hybrids.share` by showtime) is a hybrid instead. Never two on the floor (one special at a time).
     hybrids.fair  THE FAIRNESS CHECK: a hybrid is slowed down until it can be beaten in the time it walks: the time it
                   needs (its plays ÷ `rate` a second (snare: `snareRate` hits), its hold, `glitch` s for a glitch) must
                   fit in `margin` of the time its note shows before it reaches the front. */
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

    /* ---------- HYBRIDS (both parents' tricks; the settings here win over the parents') ---------- */
    // hold its note to fill the ring; halfway the note glitches: switch to the new note and keep holding (the ring keeps
    // what it had). Snare: a steady roll whose speed jumps from rollRate to rollRate2 hits a second halfway
    'glitch-lurker':    {name: 'Glitch Lurker', hybrid: ['long-tone-lurker', 'glitch-jester'], speed: .85, rollRate2: 8, points: 150,
                         how: 'Hold its note to fill the ring. Halfway, the note glitches: switch to the new note and keep holding!',
                         howSnare: 'Keep a steady roll until the ring fills. Halfway, roll faster: 8 hits a second!'},
    // its note fades in late, then glitches into another note. Snare: an ordinary count (in the dark until it fades in)
    'blackout-jester':  {name: 'Blackout Jester', hybrid: ['blackout-bot', 'glitch-jester'], revealAt: .4, points: 150,
                         how: 'Its note is hidden in the dark until it fades in. Then, halfway, it glitches into another note!',
                         howSnare: 'Hidden in the dark until it fades in, then just a count: hit it that many times.'},
    // a duet pair (two notes, in turns); rebooted, it splits into two minis, each keeping one doll's note (1 play each).
    // Snare: a count, then two 1-hit minis
    'sprocket-dolls':   {name: 'Sprocket Dolls', hybrid: ['split-sprocket', 'duet-dolls'], speed: .9, miniSnare: [1, 1], points: 150,
                         how: 'Take turns between the two dolls\' notes. Reboot it and it splits: each mini keeps one doll\'s note!',
                         howSnare: 'Hit it that many times. Then it splits in two: one hit for each mini.'},
    // armored and slow; while any plate is left it oils the others (+1 play every `every` s). The first `plates` plays
    // each pop a plate: pop them all to stop the oiling
    'oil-tank':         {name: 'Oil Tank', hybrid: ['oil-can-ollie', 'tuba-tank'], speed: .6, countMul: 1.5, plates: 4, popFirst: true, every: 4.5, points: 175,
                         how: 'Armored and slow. While it has plates, it oils the others. Pop its plates to stop the oil!'},
    // fast (Turbo Tin: 1–2 plays), its note hidden until a third of the way (sooner than Blackout Bot, so it's fair)
    'turbo-blackout':   {name: 'Turbo Blackout', hybrid: ['turbo-tin', 'blackout-bot'], speed: 1.8, revealAt: .33, points: 150,
                         how: 'Fast, and its note is hidden in the dark until a third of the way. Only 1 or 2 plays: be ready!'},
    // take turns between two notes; each correct play pops a plate (1.5× the plays, not 2×)
    'duet-tank':        {name: 'Duet Tank', hybrid: ['duet-dolls', 'tuba-tank'], speed: .7, countMul: 1.5, points: 175,
                         how: 'Two heads, two notes: take turns. It\'s armored: every right note pops a plate.',
                         howSnare: 'Armored: hit it that many times to pop every plate.'},
  },
  hybrids: {from: 5, share: [0, 0, 0, 0, .3, .3, .4, .4], fair: {rate: 2, snareRate: 4, glitch: 1.2, margin: .7}},
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
     ms          how long a scare lasts, and `beat` = the pause after it before the band moves again
   Every scare fills the ENTIRE screen (game.js scare(): #scare is a full-viewport overlay above everything).

   TERROR (the fourth SPOOKY LEVEL, after its own warning; only if shared/teacher-settings.js TERROR_ALLOWED): `terror`
     count       scares per showtime (1–8); NIGHTMARE = `nightmare`. Planned by PROGRESS like Jump Scare: `at[n]` = the
                 shares of the showtime's animatronics that have walked on, for n scares; the same guards (notBefore,
                 apart, bossGuard, never at the very end)
     buildUpS    [fewest, most] seconds of THE BUILD-UP before each scare (and each fake-out): the lights slowly dim
                 (dimMs, one smooth fade), the static and the emergency light fade out, every machine freezes mid-step,
                 the show waits (like a scare, so it never costs anything), dead silence; the target panel stays readable
     fakeChance  the share of build-ups that end in NOTHING (a fake-out): the lights come back slowly (`recoverMs`), the
                 band moves again, and the real scare comes `fakeDelayS` [fewest, most] seconds later (inside the same
                 guards; never dropped at the end of a show). At most `fakeMax` a show, never two in a row
     kinds       the 8 kinds Terror picks from (never the same twice in a row); Jump Scare keeps its first 4
     faceHoldMs  FACE: how long the broken face fills the screen before it snaps away
     peekMs      PANEL: how long the face eases in from the target panel's edge before its full-screen lunge (≥ 1 s)
     lightsOutS  LIGHTS OUT: [fewest, most] seconds the arena is dark (the eyes glow, the band keeps walking, the
                 student keeps playing: no freeze, no sound). `lightsOutEyes` = the share that end in a full-screen EYES
                 scare. Never with a machine within `bossGuard` s of the front, never with 2 or fewer machines left
     sightS      MAESTRO: [fewest, most] seconds between his two silent sightings (the back of the stage, then closer)
                 and between the second and his full-screen lunge (after a build-up). Never in Showtime 8 or the Encore
     sightMs     how long each sighting shows (a dark shape that fades in and out: never a flash) */
window.SHOWTIME_SCARES = {at: {short: [.4], long: [.25, .55]}, longFrom: 7, delay: 1, notBefore: 6, apart: 6, bossGuard: 5, ms: 1300, beat: 700,
  terror: {count: [2, 2, 2, 3, 3, 3, 4, 4], nightmare: 4, at: {2: [.3, .65], 3: [.2, .45, .7], 4: [.15, .35, .55, .75]},
    buildUpS: [2, 3.5], dimMs: 2000, recoverMs: 1600, fakeChance: .35, fakeDelayS: [8, 20], fakeMax: 2,
    kinds: ['lunge', 'eyes', 'popup', 'band', 'face', 'panel', 'lightsout', 'maestro'],
    faceHoldMs: 600, peekMs: 1200, lightsOutS: [2, 3], lightsOutEyes: .5, sightS: [10, 20], sightMs: 1400}};

/* THE ENCORE (ENDLESS MODE, shared/endless.js: the ∞ card under the showtimes, the Top 5, GAME OVER). The animatronics
   keep coming, faster and faster, until all 3 spotlights are out. Every time here is RUN TIME: the pausable show clock
   (it stops with the band: PAUSE, a special's card, a scare, a sound muting the microphone, a hidden tab), never wall
   time. No stars, no unlocks, nothing in `games` progress: the runs live in Arcade.store `endless`. NIGHTMARE doesn't
   apply here (the Encore has its own ramp) and neither does its red look.
     lives          the spotlights (a machine reaching the front knocks one out; 0 = GAME OVER)
     walk, speed    seconds to cross the floor = walk ÷ SPEED, SPEED = Endless.speed(speed, t): from 1 (13 s: Showtime 2's
                    walk) toward `max` (≈ 9.2 s: NIGHTMARE Showtime 8's, 11 s ÷ 1.2), about 63% of the way after `k` s,
                    plus `creep` a second forever, so every run ends; never faster than `minWalk` s
     count          [fewest, most] plays per machine: `from` at the start, growing to `to` over `countRampS` s
     snareCount     the same for the Snare Drum (hits)
     atOnceAt       machines on the floor at once: 1, then +1 at each of these times (s) → 3
     lanesAt        2 lanes, 3 from this time (s)
     tierEveryS     a "SPEED UP!" banner + the speed-up sound at each new tier (every this many s)
     smallPoolUntil the first machines read only the smaller note pool (Showtime 1's), then the whole set
     specialsFrom   no special machines for the first seconds; then specialChance [from, to], rising over specialRampS s
                    (still never more than one special on the floor; Split Sprocket's minis excepted). Every special and
                    hybrid can come; one never met on this device still gets its "NEW MALFUNCTION DETECTED!" card
     hybridsFromS   hybrids from this time, as `hybridShare` of the specials
     bossEvery      MAESTRO MOOSE ENCORE: he walks on every this many reboots with `bossPhases` phases (+1 every second
                    encore, at most `bossMaxPhases`), `boss` = his plays (snare: hits) a phase and his walk (÷ SPEED)
     points         each reboot = `reboot` × the combo multiplier (Endless.mult: ×2 at 10 in a row, ×3 at 25, ×4 at 50);
                    a special adds SHOWTIME_RULES.points.special + its own points; beating the Maestro adds `boss`.
                    The combo = reboots in a row without a spotlight lost or a sour note (a wrong pitch, an over-hit)
     bandMax        the stage band's most members: then the oldest walks off the stage for each new one
     scareEvery     JUMP SCARE (only where it is allowed and on today): at most one scare per this many reboots, after
                    `scareAt` [fewest, most] reboots into each block; the showtimes' guards (SHOWTIME_SCARES notBefore,
                    apart, bossGuard) + never while a machine is within `scareNearFrontS` s of the front
     snare          THE SNARE DRUM'S RAMP (SNARE_RULES by run time instead of showtime number): exact counts from the start,
                    FREEZE from `freezeFromS`, RHYTHM machines from `rhythmFromS`; the showtime the jobs' tables are read
                    at (rhythm pool, bpm, shares, soft/loud and accents, the Long Tone Lurker's hold/roll for everyone)
                    = 1 + t ÷ `showtimeEveryS`, at most 8 */
window.SHOWTIME_ENDLESS = {
  lives: 3,
  walk: 13, speed: {start: 1, max: 1.42, k: 150, creep: .0008}, minWalk: 6,
  count: {from: [2, 3], to: [5, 7]}, snareCount: {from: [4, 6], to: [10, 14]}, countRampS: 300,
  atOnceAt: [45, 135], lanesAt: 135, tierEveryS: 45,
  smallPoolUntil: 6,
  specialsFrom: 45, specialChance: [.10, .35], specialRampS: 240, hybridsFromS: 180, hybridShare: .3,
  bossEvery: 20, bossPhases: 2, bossMaxPhases: 4, boss: {count: 8, snare: 12, walk: 34},
  points: {reboot: 100, boss: 500},
  bandMax: 14,
  scareEvery: 25, scareAt: [8, 20], scareNearFrontS: 3,
  snare: {freezeFromS: 40, rhythmFromS: 90, showtimeEveryS: 45},
};
