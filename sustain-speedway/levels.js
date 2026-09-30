/* Sustain Speedway: the TRACKS (levels) and the RULES (how speed works). Tweak freely; the game reads everything here.

   TRACKS, one line each, in order. Stars are saved by track number (1–8), so keep the order.
     name     the track's name                          blurb  one plain sentence for the track card
     laps     how many laps (one target note per lap, from NOTES × ORDER)
     lap      seconds of good tone a lap takes at full speed; [first, last] = the laps get longer through the race
     pool     3 = the smaller starting note pool on the first track (sequences.js), 5 = the whole pool
     scene    the scenery: 'city' | 'river' | 'sunset' | 'harbor' | 'mountain' | 'desert' | 'grandprix'
     sky      'sunset' | 'dusk' | 'night' (the cars' rim light; also the fallback when `time` is left out)
     time     the TIME OF DAY and its light (scenery.js TIMES): 'sunset' | 'golden' (late afternoon) | 'dusk' (streetlights
              coming on) | 'dawn' | 'noon' (bright desert sun) | 'night' (moon, stars, streetlights) | 'neon' (a neon city night)
     weather  optional: 'mist' (low fog) | 'haze' (heat haze near the horizon) | 'rain' (a light drizzle). Off in LITE graphics.
     tunnels  true = parts of every lap are in a tunnel: the road is dark, and staying in tune lights it
     dyn      DYNAMICS ZONES (from track 3): {zones: per lap, len: each zone's share of the lap, kinds: which markings
              ('p' soft | 'f' loud | 'cresc' getting louder | 'decresc' getting softer)}. Slur laps have none.
     slurLaps SLUR LAPS (from track 5): these laps (1 = the first) have TWO notes: the target switches halfway and the
              student slurs to it (no break in the sound). The second note is picked from the NOTES setting's own notes:
              brass = the same fingering (a lip slur) when there is one, else a step; woodwinds = a small interval that
              doesn't cross the break (game.js slurPartner).
     rivals   the CPU cars: name, body (a car shape from SPEEDWAY_GARAGE.bodies, or 'maestro' = The Maestro's gold-trimmed
              open-wheel racer), color (a theme token), pace (0–1 of full speed; they never breathe, but pit like you)
   STARS per track: 1st = 3, 2nd = 2, 3rd = 1, last = 0. Winning (1st) opens the next track. */
window.SPEEDWAY_TRACKS = [
  {name: 'Downtown Loop',         blurb: 'A short city loop. Gentle rivals: hold each note and cruise.', laps: 4, lap: 5, pool: 3, scene: 'city', sky: 'sunset', time: 'sunset',
    rivals: [{name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .42}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .5}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .58}]},
  {name: 'River Street Run',      blurb: 'Along the river lights. A little longer each lap.', laps: 4, lap: 6, pool: 5, scene: 'river', sky: 'sunset', time: 'dusk', weather: 'rain',
    rivals: [{name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .48}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .56}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .63}]},
  {name: 'Sunset Strip',          blurb: 'Five laps into the sunset.', laps: 5, lap: 7, pool: 5, scene: 'sunset', sky: 'sunset', time: 'golden', dyn: {zones: 1, len: .3, kinds: ['p', 'f']},
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .52}, {name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .6}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .67}]},
  {name: 'Tunnel Vision',         blurb: 'The road goes dark in the tunnels. Stay in tune to light it up.', laps: 5, lap: 8, pool: 5, scene: 'city', sky: 'dusk', tunnels: true, time: 'neon', dyn: {zones: 1, len: .35, kinds: ['p', 'f', 'cresc']},
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .55}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .63}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .7}]},
  {name: 'Harbor Lights',         blurb: 'Six laps past the cranes and the water.', laps: 6, lap: 9, pool: 5, scene: 'harbor', sky: 'dusk', time: 'dawn', weather: 'mist', dyn: {zones: 2, len: .28, kinds: ['p', 'f', 'cresc', 'decresc']}, slurLaps: [3, 6],
    rivals: [{name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .58}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .66}, {name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .73}]},
  {name: 'Midnight Mountain',     blurb: 'Night climbs, ten seconds a lap. Breathe in the pits.', laps: 6, lap: 10, pool: 5, scene: 'mountain', sky: 'night', time: 'night', weather: 'mist', dyn: {zones: 2, len: .32, kinds: ['p', 'cresc', 'f', 'decresc']}, slurLaps: [2, 4, 6],
    rivals: [{name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .6}, {name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .69}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .76}]},
  {name: 'Neon Desert Endurance', blurb: 'Long, steady laps across the desert.', laps: 6, lap: 12, pool: 5, scene: 'desert', sky: 'sunset', time: 'noon', weather: 'haze', dyn: {zones: 2, len: .36, kinds: ['cresc', 'p', 'decresc', 'f']}, slurLaps: [2, 4, 6],
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .63}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .72}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .79}]},
  {name: 'The Grand Prix',        blurb: 'Eight laps, 12 to 15 seconds each, against the fastest cars.', laps: 8, lap: [12, 15], pool: 5, scene: 'grandprix', sky: 'night', time: 'night', dyn: {zones: 3, len: .26, kinds: ['p', 'f', 'cresc', 'decresc']}, slurLaps: [2, 4, 6, 8],
    rivals: [{name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .68}, {name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .77}, {name: 'The Maestro', body: 'maestro', color: 'yellow', pace: .84}]},
];

/* HOW SPEED WORKS. The car moves only while the lap's note is sounding (same letter, any octave). Each moment:
     speed = weights.tune × INTONATION + weights.pitch × PITCH STEADINESS + weights.volume × VOLUME STEADINESS
   INTONATION: full credit within the difficulty's `tol` cents, sliding down to `low.credit` at `low.cents`, 0 at 50.
   PITCH STEADINESS: the wobble (standard deviation, cents) over the last `windowMs`: full at pitch[0], none at pitch[1].
   VOLUME STEADINESS: the loudness wobble (standard deviation, dB) over the same window: full at volume[0], none at volume[1].
   The game only measures pitch and loudness: it says IN TUNE and STEADY, never anything about tone quality. */
window.SPEEDWAY_RULES = {
  difficulties: [
    {id: 'rookie',   name: 'Rookie',   tol: 20},       // full speed within ±20 cents
    {id: 'pro',      name: 'Pro',      tol: 12},
    {id: 'virtuoso', name: 'Virtuoso', tol: 6},
  ],
  weights: {tune: .6, pitch: .25, volume: .15},
  low: {cents: 40, credit: .1},
  windowMs: 300,
  pitch: [3, 15],          // cents of wobble: full credit … none
  volume: [1, 6],          // dB of wobble: full credit … none
  accel: 0.9,              // how fast the car speeds up (share of full speed per second)
  ease: 1.4,               // how fast it slows to a lower target speed while still playing
  brake: 3,                // a WRONG note: hard braking
  coast: 0.28,             // silence (breathing): gently losing speed
  wrongFrames: 2,          // a wrong note must be heard this many readings in a row (~40 ms each) before braking
  nitro: {cents: 5, steady: .75, holdMs: 2000, boost: 1.25},   // within ±5 cents and steady for 2 s: IN THE ZONE!
  pitSec: 3.5,             // the pit stop between laps (a rest: breathe, get the next fingering ready). Rivals pit too.
  topSpeed: 180,           // the speed shown at full speed (display only)
  ghostEvery: 0.5,         // the ghost car records your position every this many seconds
  /* PITCH STEERING (drawing only: speed, times and stars never read it). While the lap's note sounds, the car's
     sideways place shows the pitch: within the difficulty's `tol` = straight down the center line; beyond it the car
     drifts (flat = LEFT, sharp = RIGHT), reaching the road's edge at `edge` cents. The pitch is smoothed over `smoothMs`
     so the detector's jitter never shakes the car; not holding the note (breath, pit, a wrong note) = it eases back to
     the center over `backMs`. Past `rumble` of the way to an edge: the rumble strip lights, the car wobbles a little
     (never with reduced motion) and "FLAT ◀" / "▶ SHARP" shows on that side. */
  steer: {edge: 50, smoothMs: 250, backMs: 450, rumble: .75},
  /* THE INTONATION REPORT (results: "Your tuning"): only holds of at least `reportHoldSec` seconds count; the overall
     tendency tip (tips.js "general") shows when the average of every note is `tendency` cents or more sharp / flat;
     at most `maxTips` tips; the last `history` races per instrument are kept for the trend arrows. */
  report: {reportHoldSec: 1, tendency: 10, maxTips: 2, history: 10},
  /* DYNAMICS ZONES. THE VOLUME CHECK (once per play session, before the first race with zones) learns this device's
     SOFT and LOUD levels: `checkSec` s of each, after `readySec` s to get ready; less than `minSpread` dB apart = "Try a
     bigger difference" (CONTINUE then uses `fallbackSpread`). In a zone the loudness (smoothed over `smoothMs`, as a share
     0 = the soft level … 1 = the loud level) must be: p ≤ `softMax`, f ≥ `loudMin`, cresc / decresc within `rampWindow`
     of a ramp from `ramp[0]` to `ramp[1]` (or back). Wrong for `graceMs` = the car's speed × `slow` (a small, clear
     penalty) and a hint word. The zones start `startAt` into a lap. */
  dyn: {checkSec: 3, readySec: 1.2, minSpread: 4, fallbackSpread: 12, smoothMs: 200, softMax: .45, loudMin: .55, ramp: [.1, .9], rampWindow: .35,
    graceMs: 350, slow: .8, startAt: .12},
  /* SLUR LAPS: after the switch the old note still counts for `graceMs` (while the student moves to the new one);
     a gap in the sound of `gapMs` or more around the switch = a BREAK: the speed × `slow` for `slowMs` + "slur it!".
     (The detector's own note change can drop one or two readings: keep gapMs above ~120 ms.) */
  slur: {graceMs: 1200, gapMs: 150, slow: .55, slowMs: 1000},
  /* BREATH STATS: the longest STEADY HOLD = seconds of unbroken tone within the difficulty's tolerance (per note and
     per race). Kept per instrument in gameData('sustain-speedway').breath; the trend shows the last `history` races. */
  breath: {history: 10, minSec: 1},
};

/* THE GARAGE (inside Sustain Speedway only: the GARAGE button on the track select; garage.js + cars.js). The student's
   car, saved per device in store.gameData('sustain-speedway').garage:
     {body, paint, finish, paint2 (TWO-TONE: the roof / upper panels, null = one color), decal, dcolor (the decal's color:
      a paint id, null = the decal's own colors), number (1–99), rims, spoiler, glow (underglow), flame (nitro color),
      trail, plate: {w: '<word>'} | {d: '0427'}}
   + gameData.loadouts = 3 SAVED LOADOUTS [{name (one of LOADOUT_NAMES), car}].
   Never rename an id (saved choices use them); add new ones at the end of their list.
   UNLOCK RULES (earned in Sustain Speedway unless it says otherwise; old progress counts; any instrument and any mode):
     {free: true}            open from the start
     {stars: n}              n ★ in Sustain Speedway on this device (every instrument, every mode)
     {tracks: n}             finished n different tracks (any place)
     {wins: n}               won (1st place) n different tracks
     {winCount: n}           won n races (every win counts, repeats too; before the garage: one per track, instrument, mode)
     {track: n}              won track n            {achievement: id}   gameData achievements ('virtuoso-win', 'perfect-lap',
                                                                         'teacher-ghost' = beat a teacher ghost: teacher-ghosts.js)
     {bestLap: true}         set a best lap on any track        {any: [rules…]}   any one of them
     {cleanLaps: n}          n CLEAN LAPS: in the zone (nitro) for the whole lap, from the moment it can start
     {breath: s}             a steady hold of s seconds (the breath record, any instrument)
     {dynZones: n}           n DYNAMICS ZONES nailed (the right dynamic ≥ 80 % of the zone)
     {slurs: n}              n smooth slurs on slur laps
     {arcadeStars: n}        n ★ anywhere in the Arcade (every game)
   A PERFECT-PITCH LAP = a finished lap whose average tuning (how far off, either way) was within RULES.nitro.cents
   (the IN THE ZONE window), from at least perfectLapReadings readings (achievement 'perfect-lap').
   DARK PAINTS (black, navy, graphite…) automatically get a light rim and a brighter highlight (cars.js), so the car never
   disappears into the road on any track. */
window.SPEEDWAY_GARAGE = {
  bodies: [
    {id: 'coupe',     name: 'Coupe',            unlock: {free: true}},
    {id: 'mini',      name: 'Mini',             unlock: {free: true}},
    {id: 'muscle',    name: 'Muscle',           unlock: {tracks: 3, text: 'Finish any 3 tracks'}},
    {id: 'wagon',     name: 'Retro Wagon',      unlock: {stars: 15, text: 'Earn 15 ★ in Speedway'}},
    {id: 'buggy',     name: 'Dune Buggy',       unlock: {wins: 1, text: 'Win any track (1st place)'}},
    {id: 'openwheel', name: 'Open-Wheel Racer', unlock: {wins: 4, text: 'Get 3 ★ on 4 tracks'}},
    {id: 'hover',     name: 'Hover Racer',      unlock: {any: [{track: 8}, {achievement: 'virtuoso-win'}], text: 'Win The Grand Prix, or win any race on Virtuoso'}},
    {id: 'pickup',    name: 'Pickup Truck',     unlock: {tracks: 2, text: 'Finish any 2 tracks'}},
    {id: 'kart',      name: 'Kart',             unlock: {cleanLaps: 3, text: 'Drive 3 clean laps (in the zone the whole lap)'}},
    {id: 'bumper',    name: 'Bumper Car',       unlock: {arcadeStars: 50, text: 'Earn 50 ★ anywhere in the Arcade'}},
    {id: 'rally',     name: 'Rally Car',        unlock: {winCount: 5, text: 'Win 5 races'}},
    {id: 'hotrod',    name: 'Hot Rod',          unlock: {breath: 8, text: 'Hold one note steady for 8 seconds'}},
    {id: 'stock',     name: 'Stock Car',        unlock: {dynZones: 10, text: 'Nail 10 dynamics zones'}},
    {id: 'supercar',  name: 'Supercar',         unlock: {stars: 30, text: 'Earn 30 ★ in Speedway'}},
    {id: 'retrohover', name: 'Retro Hover',     unlock: {slurs: 10, text: 'Play 10 smooth slurs'}},
    {id: 'monster',   name: 'Monster Truck',    unlock: {arcadeStars: 200, text: 'Earn 200 ★ anywhere in the Arcade'}},
  ],
  // 'instrument' = your instrument's color (and an equipped color skin's); the rest are theme tokens. `finish` = this
  // paint always wears that finish (Matte Black)
  paints: [
    {id: 'instrument', name: "My instrument's color", unlock: {free: true}},
    {id: 'pink',   name: 'Neon Pink',   unlock: {free: true}},
    {id: 'cyan',   name: 'Electric Cyan', unlock: {free: true}},
    {id: 'yellow', name: 'Sunshine',    unlock: {free: true}},
    {id: 'green',  name: 'Laser Lime',  unlock: {free: true}},
    {id: 'amber',  name: 'Amber',       unlock: {stars: 5}},
    {id: 'purple', name: 'Violet',      unlock: {stars: 10}},
    {id: 'red',    name: 'Rocket Red',  unlock: {stars: 15}},
    {id: 'blue',   name: 'Deep Blue',   unlock: {stars: 20}},
    {id: 'white-hi', name: 'Pearl White', unlock: {stars: 25}},
    {id: 'belt-orange', name: 'Tangerine', unlock: {stars: 30}},
    {id: 'sw-teacher-gold', name: "Teacher's Gold", unlock: {achievement: 'teacher-ghost', text: "Beat your teacher's ghost (a BEAT MR. GRAHAM track)"}},
    {id: 'sw-paint-black',  name: 'Gloss Black', unlock: {free: true}},
    {id: 'sw-paint-matte',  name: 'Matte Black', finish: 'matte', unlock: {breath: 6, text: 'Hold one note steady for 6 seconds'}},
    {id: 'sw-paint-silver', name: 'Silver',      unlock: {tracks: 1, text: 'Finish any track'}},
    {id: 'sw-paint-teal',   name: 'Teal',        unlock: {stars: 8}},
    {id: 'sw-paint-mint',   name: 'Mint',        unlock: {stars: 12}},
    {id: 'sw-paint-navy',   name: 'Navy',        unlock: {winCount: 3, text: 'Win 3 races'}},
    {id: 'sw-paint-coral',  name: 'Coral',       unlock: {cleanLaps: 5, text: 'Drive 5 clean laps'}},
    {id: 'sw-paint-sky',    name: 'Sky Blue',    unlock: {dynZones: 3, text: 'Nail 3 dynamics zones'}},
    {id: 'sw-paint-lavender', name: 'Lavender',  unlock: {slurs: 3, text: 'Play 3 smooth slurs'}},
    {id: 'sw-paint-forest', name: 'Forest',      unlock: {tracks: 5, text: 'Finish any 5 tracks'}},
    {id: 'sw-paint-graphite', name: 'Graphite',  unlock: {arcadeStars: 25, text: 'Earn 25 ★ anywhere in the Arcade'}},
    {id: 'sw-paint-maroon', name: 'Maroon',      unlock: {stars: 35}},
    {id: 'sw-paint-bronze', name: 'Bronze',      unlock: {winCount: 8, text: 'Win 8 races'}},
    {id: 'sw-paint-gold',   name: 'Gold',        unlock: {stars: 45}},
  ],
  // FINISHES (a separate choice from the color): how the paint catches the light
  finishes: [
    {id: 'gloss',    name: 'Gloss',     unlock: {free: true}},
    {id: 'matte',    name: 'Matte',     unlock: {stars: 6}},
    {id: 'metallic', name: 'Metallic',  unlock: {tracks: 4, text: 'Finish any 4 tracks'}},
    {id: 'pearl',    name: 'Pearl',     unlock: {wins: 2, text: 'Win 2 different tracks'}},
    {id: 'neon',     name: 'Neon Glow', unlock: {dynZones: 5, text: 'Nail 5 dynamics zones'}},
    {id: 'chrome',   name: 'Chrome',    unlock: {breath: 10, text: 'Hold one note steady for 10 seconds'}},
  ],
  decals: [
    {id: 'none',      name: 'None',           unlock: {free: true}},
    {id: 'stripes',   name: 'Double stripes', unlock: {free: true}},
    {id: 'number',    name: 'Your number',    unlock: {free: true}},
    {id: 'flames',    name: 'Flames',         unlock: {achievement: 'perfect-lap', text: 'Drive a perfect-pitch lap (average within ±5¢)'}},
    {id: 'stars',     name: 'Stars',          unlock: {stars: 10}},
    {id: 'checker',   name: 'Checkerboard',   unlock: {winCount: 3, text: 'Win 3 races'}},
    {id: 'lightning', name: 'Lightning',      unlock: {bestLap: true, text: 'Set a best lap on any track'}},
    {id: 'stripe1',   name: 'Single stripe',  unlock: {free: true}},
    {id: 'stripeoff', name: 'Offset stripe',  unlock: {stars: 4}},
    {id: 'swoosh',    name: 'Swoosh',         unlock: {tracks: 3, text: 'Finish any 3 tracks'}},
    {id: 'notes',     name: 'Music notes',    unlock: {slurs: 1, text: 'Play a smooth slur'}},
    {id: 'clef',      name: 'Treble clef',    unlock: {dynZones: 1, text: 'Nail a dynamics zone'}},
    {id: 'dots',      name: 'Polka dots',     unlock: {arcadeStars: 10, text: 'Earn 10 ★ anywhere in the Arcade'}},
    {id: 'fade',      name: 'Gradient fade',  unlock: {stars: 20}},
    {id: 'camo',      name: 'Camo',           unlock: {winCount: 6, text: 'Win 6 races'}},
    {id: 'tiger',     name: 'Tiger stripes',  unlock: {breath: 12, text: 'Hold one note steady for 12 seconds'}},
  ],
  rims: [
    {id: 'classic',   name: 'Classic spokes', unlock: {free: true}},
    {id: 'fivestar',  name: 'Five-star',      unlock: {free: true}},
    {id: 'disc',      name: 'Disc',           unlock: {stars: 2}},
    {id: 'whitewall', name: 'Whitewall',      unlock: {tracks: 2, text: 'Finish any 2 tracks'}},
    {id: 'turbine',   name: 'Turbine',        unlock: {winCount: 4, text: 'Win 4 races'}},
    {id: 'offroad',   name: 'Off-road',       unlock: {wins: 3, text: 'Win 3 different tracks'}},
    {id: 'gold',      name: 'Gold',           unlock: {stars: 40}},
    {id: 'neonrim',   name: 'Neon rim',       unlock: {cleanLaps: 10, text: 'Drive 10 clean laps'}},
  ],
  spoilers: [
    {id: 'stock',    name: 'Stock',          unlock: {free: true}},
    {id: 'none',     name: 'None',           unlock: {free: true}},
    {id: 'lip',      name: 'Low lip',        unlock: {free: true}},
    {id: 'wing',     name: 'Classic wing',   unlock: {tracks: 2, text: 'Finish any 2 tracks'}},
    {id: 'ducktail', name: 'Ducktail',       unlock: {stars: 7}},
    {id: 'tall',     name: 'Tall race wing', unlock: {winCount: 7, text: 'Win 7 races'}},
  ],
  // UNDERGLOW: a soft glow on the road under the car (color = a theme token)
  glows: [
    {id: 'none',   name: 'None',   unlock: {free: true}},
    {id: 'cyan',   name: 'Cyan',   unlock: {stars: 5}},
    {id: 'pink',   name: 'Pink',   unlock: {cleanLaps: 5, text: 'Drive 5 clean laps'}},
    {id: 'green',  name: 'Green',  unlock: {dynZones: 5, text: 'Nail 5 dynamics zones'}},
    {id: 'purple', name: 'Purple', unlock: {slurs: 5, text: 'Play 5 smooth slurs'}},
    {id: 'yellow', name: 'Gold',   unlock: {breath: 8, text: 'Hold one note steady for 8 seconds'}},
  ],
  // EXHAUST FLAME / NITRO COLOR
  flames: [
    {id: 'orange',  name: 'Orange',  unlock: {free: true}},
    {id: 'blue',    name: 'Blue',    unlock: {wins: 2, text: 'Win 2 different tracks'}},
    {id: 'green',   name: 'Green',   unlock: {stars: 18}},
    {id: 'purple',  name: 'Purple',  unlock: {cleanLaps: 8, text: 'Drive 8 clean laps'}},
    {id: 'rainbow', name: 'Rainbow', unlock: {achievement: 'virtuoso-win', text: 'Win a race on Virtuoso'}},
  ],
  // TRAIL behind the car at speed (off in LITE graphics and with reduced motion)
  trails: [
    {id: 'none',     name: 'None',         unlock: {free: true}},
    {id: 'streak',   name: 'Light streak', unlock: {stars: 9}},
    {id: 'sparkles', name: 'Sparkles',     unlock: {tracks: 6, text: 'Finish any 6 tracks'}},
    {id: 'notes',    name: 'Music notes',  unlock: {slurs: 8, text: 'Play 8 smooth slurs'}},
    {id: 'stars',    name: 'Stars',        unlock: {arcadeStars: 100, text: 'Earn 100 ★ anywhere in the Arcade'}},
  ],
  // THE LICENSE PLATE: one of these words, or up to 4 digits (never typed text)
  plateWords: ['BAND', 'TUBA', 'BRASS', 'REEDS', 'FORTE', 'SOLO', 'RAVEN', 'NINJA', 'TUNE UP', 'ALLEGRO', 'PIANO', 'TEMPO', 'SWING', 'ENCORE', 'BRAVO', 'LEGATO'],
  loadoutNames: ['Car 1', 'Car 2', 'Car 3', 'Race Day', 'Showtime', 'Cruiser'],
  perfectLapReadings: 10,
  cleanLapShare: .9,          // a CLEAN LAP: in the zone ≥ this share of the lap (after the first RULES.nitro.holdMs)
  dynNailShare: .8,           // a dynamics zone NAILED: the right dynamic ≥ this share of the zone's readings
};
