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
     rivals   the CPU cars: name, body (a car shape from SPEEDWAY_GARAGE.bodies, or 'maestro' = The Maestro's gold-trimmed
              open-wheel racer), color (a theme token), pace (0–1 of full speed; they never breathe, but pit like you)
   STARS per track: 1st = 3, 2nd = 2, 3rd = 1, last = 0. Winning (1st) opens the next track. */
window.SPEEDWAY_TRACKS = [
  {name: 'Downtown Loop',         blurb: 'A short city loop. Gentle rivals: hold each note and cruise.', laps: 4, lap: 5, pool: 3, scene: 'city', sky: 'sunset', time: 'sunset',
    rivals: [{name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .42}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .5}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .58}]},
  {name: 'River Street Run',      blurb: 'Along the river lights. A little longer each lap.', laps: 4, lap: 6, pool: 5, scene: 'river', sky: 'sunset', time: 'dusk', weather: 'rain',
    rivals: [{name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .48}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .56}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .63}]},
  {name: 'Sunset Strip',          blurb: 'Five laps into the sunset.', laps: 5, lap: 7, pool: 5, scene: 'sunset', sky: 'sunset', time: 'golden',
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .52}, {name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .6}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .67}]},
  {name: 'Tunnel Vision',         blurb: 'The road goes dark in the tunnels. Stay in tune to light it up.', laps: 5, lap: 8, pool: 5, scene: 'city', sky: 'dusk', tunnels: true, time: 'neon',
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .55}, {name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .63}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .7}]},
  {name: 'Harbor Lights',         blurb: 'Six laps past the cranes and the water.', laps: 6, lap: 9, pool: 5, scene: 'harbor', sky: 'dusk', time: 'dawn', weather: 'mist',
    rivals: [{name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .58}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .66}, {name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .73}]},
  {name: 'Midnight Mountain',     blurb: 'Night climbs, ten seconds a lap. Breathe in the pits.', laps: 6, lap: 10, pool: 5, scene: 'mountain', sky: 'night', time: 'night', weather: 'mist',
    rivals: [{name: 'Neon Nomad', body: 'wagon', color: 'yellow', pace: .6}, {name: 'Volt Viper', body: 'openwheel', color: 'cyan', pace: .69}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .76}]},
  {name: 'Neon Desert Endurance', blurb: 'Long, steady laps across the desert.', laps: 6, lap: 12, pool: 5, scene: 'desert', sky: 'sunset', time: 'noon', weather: 'haze',
    rivals: [{name: 'Turbo Tempo', body: 'muscle', color: 'amber', pace: .63}, {name: 'Chrome Comet', body: 'coupe', color: 'green', pace: .72}, {name: 'Violet Vortex', body: 'hover', color: 'purple', pace: .79}]},
  {name: 'The Grand Prix',        blurb: 'Eight laps, 12 to 15 seconds each, against the fastest cars.', laps: 8, lap: [12, 15], pool: 5, scene: 'grandprix', sky: 'night', time: 'night',
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
};

/* THE GARAGE (inside Sustain Speedway only: the GARAGE button on the track select; garage.js + cars.js). The student's
   car = BODY + PAINT + DECAL (+ a number 1–99), saved per device in store.gameData('sustain-speedway').garage.
   Never rename an id (saved choices use them); add new ones at the end.
   UNLOCK RULES (earned in Sustain Speedway; old progress counts, any instrument and any NOTES × ORDER mode):
     {free: true}            open from the start
     {stars: n}              n ★ in Sustain Speedway on this device (every instrument, every mode)
     {tracks: n}             finished n different tracks (any place)
     {wins: n}               won (1st place) n different tracks
     {winCount: n}           won n races (every win counts, repeats too; before the garage: one per track, instrument, mode)
     {track: n}              won track n            {achievement: id}   gameData achievements ('virtuoso-win', 'perfect-lap')
     {bestLap: true}         set a best lap on any track        {any: [rules…]}   any one of them
   A PERFECT-PITCH LAP = a finished lap whose average tuning (how far off, either way) was within RULES.nitro.cents
   (the IN THE ZONE window), from at least perfectLapReadings readings (achievement 'perfect-lap'). */
window.SPEEDWAY_GARAGE = {
  bodies: [
    {id: 'coupe',     name: 'Coupe',            unlock: {free: true}},
    {id: 'mini',      name: 'Mini',             unlock: {free: true}},
    {id: 'muscle',    name: 'Muscle',           unlock: {tracks: 3, text: 'Finish any 3 tracks'}},
    {id: 'wagon',     name: 'Retro Wagon',      unlock: {stars: 15, text: 'Earn 15 ★ in Speedway'}},
    {id: 'buggy',     name: 'Dune Buggy',       unlock: {wins: 1, text: 'Win any track (1st place)'}},
    {id: 'openwheel', name: 'Open-Wheel Racer', unlock: {wins: 4, text: 'Get 3 ★ on 4 tracks'}},
    {id: 'hover',     name: 'Hover Racer',      unlock: {any: [{track: 8}, {achievement: 'virtuoso-win'}], text: 'Win The Grand Prix, or win any race on Virtuoso'}},
  ],
  // 'instrument' = your instrument's color (and an equipped color skin's); 4 paints free, one more every 5 ★
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
  ],
  decals: [
    {id: 'none',      name: 'None',           unlock: {free: true}},
    {id: 'stripes',   name: 'Racing stripes', unlock: {free: true}},
    {id: 'number',    name: 'Your number',    unlock: {free: true}},
    {id: 'flames',    name: 'Flames',         unlock: {achievement: 'perfect-lap', text: 'Drive a perfect-pitch lap (average within ±5¢)'}},
    {id: 'stars',     name: 'Stars',          unlock: {stars: 10}},
    {id: 'checker',   name: 'Checkerboard',   unlock: {winCount: 3, text: 'Win 3 races'}},
    {id: 'lightning', name: 'Lightning',      unlock: {bestLap: true, text: 'Set a best lap on any track'}},
  ],
  perfectLapReadings: 10,
};
