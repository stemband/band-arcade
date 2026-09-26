/* Sustain Speedway: the TRACKS (levels) and the RULES (how speed works). Tweak freely; the game reads everything here.

   TRACKS, one line each, in order. Stars are saved by track number (1–8), so keep the order.
     name     the track's name                          blurb  one plain sentence for the track card
     laps     how many laps (one target note per lap, from NOTES × ORDER)
     lap      seconds of good tone a lap takes at full speed; [first, last] = the laps get longer through the race
     pool     3 = the smaller starting note pool on the first track (sequences.js), 5 = the whole pool
     scene    the scenery: 'city' | 'river' | 'sunset' | 'harbor' | 'mountain' | 'desert' | 'grandprix'
     sky      'sunset' | 'dusk' | 'night'
     tunnels  true = parts of every lap are in a tunnel: the road is dark, and staying in tune lights it
     rivals   the CPU cars: name, color (a theme token), pace (0–1 of full speed; they never breathe, but pit like you)
   STARS per track: 1st = 3, 2nd = 2, 3rd = 1, last = 0. Winning (1st) opens the next track. */
window.SPEEDWAY_TRACKS = [
  {name: 'Downtown Loop',         blurb: 'A short city loop. Gentle rivals: hold each note and cruise.', laps: 4, lap: 5, pool: 3, scene: 'city', sky: 'sunset',
    rivals: [{name: 'Volt Viper', color: 'cyan', pace: .42}, {name: 'Neon Nomad', color: 'yellow', pace: .5}, {name: 'Chrome Comet', color: 'green', pace: .58}]},
  {name: 'River Street Run',      blurb: 'Along the river lights. A little longer each lap.', laps: 4, lap: 6, pool: 5, scene: 'river', sky: 'sunset',
    rivals: [{name: 'Volt Viper', color: 'cyan', pace: .48}, {name: 'Neon Nomad', color: 'yellow', pace: .56}, {name: 'Chrome Comet', color: 'green', pace: .63}]},
  {name: 'Sunset Strip',          blurb: 'Five laps into the sunset.', laps: 5, lap: 7, pool: 5, scene: 'sunset', sky: 'sunset',
    rivals: [{name: 'Turbo Tempo', color: 'amber', pace: .52}, {name: 'Volt Viper', color: 'cyan', pace: .6}, {name: 'Chrome Comet', color: 'green', pace: .67}]},
  {name: 'Tunnel Vision',         blurb: 'The road goes dark in the tunnels. Stay in tune to light it up.', laps: 5, lap: 8, pool: 5, scene: 'city', sky: 'dusk', tunnels: true,
    rivals: [{name: 'Turbo Tempo', color: 'amber', pace: .55}, {name: 'Neon Nomad', color: 'yellow', pace: .63}, {name: 'Violet Vortex', color: 'purple', pace: .7}]},
  {name: 'Harbor Lights',         blurb: 'Six laps past the cranes and the water.', laps: 6, lap: 9, pool: 5, scene: 'harbor', sky: 'dusk',
    rivals: [{name: 'Chrome Comet', color: 'green', pace: .58}, {name: 'Violet Vortex', color: 'purple', pace: .66}, {name: 'Turbo Tempo', color: 'amber', pace: .73}]},
  {name: 'Midnight Mountain',     blurb: 'Night climbs, ten seconds a lap. Breathe in the pits.', laps: 6, lap: 10, pool: 5, scene: 'mountain', sky: 'night',
    rivals: [{name: 'Neon Nomad', color: 'yellow', pace: .6}, {name: 'Volt Viper', color: 'cyan', pace: .69}, {name: 'Violet Vortex', color: 'purple', pace: .76}]},
  {name: 'Neon Desert Endurance', blurb: 'Long, steady laps across the desert.', laps: 6, lap: 12, pool: 5, scene: 'desert', sky: 'sunset',
    rivals: [{name: 'Turbo Tempo', color: 'amber', pace: .63}, {name: 'Chrome Comet', color: 'green', pace: .72}, {name: 'Violet Vortex', color: 'purple', pace: .79}]},
  {name: 'The Grand Prix',        blurb: 'Eight laps, 12 to 15 seconds each, against the fastest cars.', laps: 8, lap: [12, 15], pool: 5, scene: 'grandprix', sky: 'night',
    rivals: [{name: 'Violet Vortex', color: 'purple', pace: .68}, {name: 'Volt Viper', color: 'cyan', pace: .77}, {name: 'The Maestro', color: 'yellow', pace: .84}]},
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
  countdownMs: 3000,       // 3, 2, 1, GO! (longer if the countdown sound is longer)
  topSpeed: 180,           // the speed shown at full speed (display only)
  ghostEvery: 0.5,         // the ghost car records your position every this many seconds
};
