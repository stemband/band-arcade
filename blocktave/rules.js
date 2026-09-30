/* BLOCKTAVE: EVERY TUNING NUMBER, in one place (Mat: change a number here, never in game.js).
   Distances are in TILES (one block), times in SECONDS unless a name ends in Ms. */
window.BT_RULES = {
  /* ---------- THE WORLD ---------- */
  world: {
    w: 256, h: 96,            // tiles wide × deep (never change on a saved world: NEW WORLD makes one of the new size)
    surface: 34,              // the ground's average row (0 = the top of the sky)
    sea: 39,                  // water fills hollows up to this row (the marsh's pools)
    peaksY: 20,               // rows above this = TREBLE PEAKS (mountain tops: the treble clef, the chromatic pool)
    deepY: 64,                // rows from here down = BASS DEPTHS (deep caves: the bass clef, the chromatic pool)
    shallow: 7,               // rows below the local surface that still count as "surface" (the FIRST FIVE)
    caves: .42,               // 0–1: how much of the underground is cave (higher = more caves)
    oreEvery: 1,              // ore density multiplier (1 = normal)
  },
  /* the three biomes, left to right: [from, to) columns (they share the world's width) */
  biomes: [
    {id: 'marsh',  name: 'Reed Marsh',        from: 0,   to: 86},
    {id: 'brass',  name: 'Brass Mountains',   from: 86,  to: 172},
    {id: 'canyon', name: 'Percussion Canyon', from: 172, to: 256},
  ],
  /* ---------- DAY AND NIGHT ---------- */
  dayS: 360,                  // a day lasts 6 minutes …
  nightS: 180,                // … and a night 3 (creatures only come out in the dark)
  duskS: 20,                  // the sky fades this long at dusk and dawn
  /* ---------- THE PLAYER ---------- */
  player: {
    speed: 5.2,               // walking, tiles a second
    jump: 11,                 // jump speed (≈ 2 blocks high)
    gravity: 32,              // tiles/s²
    maxFall: 20,
    swim: .45,                // speed multiplier in water
    reach: 5,                 // blocks within this many tiles can be mined or built on
    hearts: 5,                // hearts (drawn as whole notes); a Sour Wisp takes half a heart
    hurtCooldownS: 1.4,       // after a hit, no more hits for this long
    snackHeal: 2,             // a Snack Bag gives back this many hearts
    stack: 99,                // most of one item in one slot
  },
  hotbar: 6,                  // hotbar slots along the bottom
  lockerSlots: 16,            // a Band Locker holds this many stacks
  /* ---------- MINING = PLAYING ---------- */
  challengeSlow: .3,          // while a challenge card is open the world runs at this speed (a night stays tense but fair)
  instrumentBonus: 2,         // INSTRUMENT mode drops this many times what TOUCH mode drops (playing is always worth more)
  hintAfterWrong: 3,          // this many wrong answers in a row show the note name as a hint
  otherClefNames: 5,          // the first this-many cards in the OTHER clef show the note name small under the staff
  wrongShowMs: 900,           // a wrong answer: the card shakes this long, then closes (the block stays)
  // notes a challenge asks for, by block kind and tool: [hands, Wooden Mallet, Brass Mallet, Silver Mallet, Golden Baton]
  // (0 = that tool can't mine it)
  notes: {
    tone:    [0, 2, 1, 1, 1],       // Tone Ore / Brass Ore: 2 notes with the Wooden Mallet, 1 from the Brass Mallet on
    scale:   [0, 0, 8, 6, 5],       // Scale / Spring Veins: that many notes of a scale in order (5–8)
    sustain: [0, 0, 0, 1, 1],       // Sustain Stone: Silver Mallet or better
    rhythm:  [0, 1, 1, 1, 1],       // Rhythm Rock: measures of rhythm
    rest:    [0, 0, 0, 1, 1],       // Rest Crystal: Silver Mallet or better
  },
  sustainS: 3,                // Sustain Stone (INSTRUMENT): hold one steady note this long …
  sustainBatonS: 2,           // … this long with the Golden Baton (shorter challenges)
  sustainCents: 25,           // … within this many cents of in tune
  sustainGraceMs: 350,        // a wobble shorter than this doesn't break the hold
  rollS: 3,                   // Snare Drum's Sustain Stone: an EVEN ROLL this long …
  rollRate: 6,                // … at least this many hits a second …
  rollMaxCv: .4,              // … this even (the gaps' spread ÷ their average; lower = more even)
  // rhythms (Rhythm Rock, Rest Crystal, snare Tone Ore / Scale Veins, the Metronome, Rushers): one measure after a
  // SILENT count-in (nothing plays while the microphone listens: the pulse is a light). Judged by shared/rhythm-judge.js.
  rhythm: {bpm: 76, perfectMs: 70, goodMs: 140, okMs: 220, lateMs: 340,
           pass: .8,          // share of the notes that must be OK or better, with no extra hits
           leadS: .6},        // a moment before the count-in starts
  snareCount: [3, 5],         // Snare Drum's Tone Ore: "play exactly N hits" (random from this range), then STOP
  snareConfirmMs: 700,        // … silence this long after the last hit confirms the count
  /* ---------- TOOLS: what each tier can mine (a block's `tier` in world.js) ---------- */
  tools: ['Hands', 'Wooden Mallet', 'Brass Mallet', 'Silver Mallet', 'Golden Baton'],
  /* ---------- DROPS (TOUCH mode; INSTRUMENT mode × instrumentBonus) ---------- */
  drops: {tone: 1, scale: 1, sustain: 1, rhythm: 1, rest: 1, tap: 1},
  /* ---------- LIGHT ---------- */
  light: {
    lampRadius: 7,            // a Stage Lamp lights this far
    dark: .5,                 // light below this counts as dark (creatures may appear)
    caveDepth: 4,             // rows below the local surface where the sky's light is gone
    maxShade: .86,            // how dark the darkest place looks (1 = black)
    nightSky: .28,            // the sky's light at midnight (0–1)
  },
  /* ---------- CREATURES (never scary: silly, and only in the dark) ---------- */
  spawn: {
    everyS: 3.5,              // a spawn is tried this often while it's dark somewhere near
    safe: 10,                 // never within this many tiles of the player
    range: 26,                // … and never farther than this
    perNight: {clam: 8, wisp: 4, rusher: 3},   // the most of each kind that can appear in one night
    atOnce: {clam: 4, wisp: 2, rusher: 2},     // the most of each kind at once
    rushersFrom: 3,           // Rushers come out from the 3rd night on
    cave: {clam: .6, wisp: .4},                // in unlit caves (any time), the share of spawns of each kind
    despawnFar: 44,           // a creature this far away disappears
  },
  clam: {hopS: 1.3, hopX: 1.6, hopY: 7, see: 16, listen: 9, calm: 10},
  wisp: {speed: 1.1, see: 18, drain: 3, listen: 9, holdS: 2, cents: 30},
  wispDrainS: 4,              // a Sour Wisp this close drains ½ heart every this many seconds
  rusher: {speed: 6.5, alert: 12, beats: 2, cooldownS: 5},
  /* THE FAIRNESS CHECK: a creature's challenge must fit the time it needs to reach you. A creature is slowed until
     (its challenge's seconds) × margin fit in (its distance ÷ its speed). */
  fair: {margin: 1.4, cardS: {clam: 4, wisp: 5, rusher: 0}},
  metronomeSlow: .8,          // creatures within a placed Metronome's radius move this fast
  metronomeRadius: 8,
  tunerRadius: 6,             // Sour Wisps can't enter a placed Tuner's radius
  /* ---------- LOSING ALL HEARTS (gentle: never a lost world) ---------- */
  dropShare: .25,             // this share of each carried material goes in a floating bag where you fell (tools stay)
  /* ---------- BUILDING ---------- */
  benchRange: 6,              // advanced recipes need a Luthier's Bench this close
  cotSafe: 10,                // sleeping on a Practice Cot needs no creature this close
  room: {maxTiles: 120, minTiles: 4},       // a SHELTER: an enclosed space (with a door) of at least minTiles air tiles
  // THE BAND HALL (chapter 5): a closed room with a door, at least minTiles inside, its walls at least brickShare Band Hall
  // Bricks (doors and glass don't count against it), stageMin Stage Floor tiles as its floor, a Stage Lamp and a Music
  // Stand inside
  bandHall: {minTiles: 24, brickShare: .8, stageMin: 3},
  composerMax: 8,             // a Composer row holds up to this many blocks
  doorWire: 2,                // a powered row opens doors this close to its blocks or its podium
  /* ---------- SAVING ---------- */
  autosaveS: 30,              // the world saves itself this often (and on pause and when the page is hidden)
  /* ---------- DRAWING ---------- */
  fps: 60,                    // the most frames a second
  pixel: 16,                  // the WORLD canvas's pixels per block (its pixel-art size; CSS scales it up crisply)
  dprMax: 1.5,                // the sharp overlay's (note bubbles, the reach) pixel density cap
  tileView: [22, 13],         // about this many tiles fit across × down (the tile size follows the screen)
  tilePx: [20, 44],           // … never smaller or bigger than this (CSS px)
  /* ---------- ENDLESS: SURVIVAL NIGHTS (one life, a fresh world, score = nights survived) ---------- */
  endless: {dayS: 45, nightS: 120, startS: 30, hearts: 5, kit: {mallet1: 1, lamp: 2, snack: 3}},
  /* ---------- THE MILESTONES' NUMBERS ---------- */
  goals: {toneOre: 10, clams: 5, wisps: 3, row: 8},
};
