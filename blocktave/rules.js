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
    corkChance: .1,           // Reed Marsh: the chance a patch of dry ground grows a Cork tree …
    mapleChance: .05,         // … or a Maple tree
  },
  /* THE STARTER GUARANTEE: every world (and, once, every older saved world) has chapter 1's materials near the spawn */
  starterRange: 16,           // within this many tiles of the spawn …
  starter: {maple: 2, cork: 2,          // … at least this many Maple and Cork trees on dry ground …
            toneOre: 12, oreDepth: 8},  // … and this much Tone Ore at most oreDepth tiles below the ground
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
    caveMin: .12,             // nothing underground is ever darker than this: the cave's shape always shows faintly
    shaftRows: 6,             // daylight goes this many rows down a dug shaft (fading), and spreads this far into open caves …
    spread: .75,              // … keeping this much of its light for each tile it spreads
    // THE PLAYER'S GLOW (drawn only: it never stops creatures from appearing, so lamps still matter at night)
    playerRadius: 4.5,        // you always light the blocks around you this far (tiles) …
    playerGlow: .55,          // … this bright where you stand, fading out
    batonGlow: 1,             // the Golden Baton lights this many tiles farther
    openLift: .08,            // underground, open space looks this much lighter than rock (so the cave's shape reads)
    waterMin: .35,            // water is never drawn darker than this
    glint: .5,                // ores and veins keep a faint glow of their color in the dark (0 = none)
    // THE WAY UP
    lostDepth: 8,             // more than this many rows below the ground nearby …
    lostS: 20,                // … without getting closer to the surface for this long: an arrow points the way up
    surfaceAfterS: 60,        // this long underground: the pause menu offers ↑ SURFACE (back up along open tiles)
  },
  /* ---------- THE PARALLAX BACKDROP (backdrop.js): three layers per biome behind the world, a cave backdrop below ---------- */
  backdrop: {
    far: .15, mid: .35, near: .6,   // each layer moves this share of the camera's sideways movement …
    vertical: .1,             // … and this share of its up-and-down movement (so caves don't drag the sky around)
    cave: .2,                 // the cave backdrop's own parallax (both ways)
    blend: 8,                 // between biomes the two sets cross-fade over this many columns each side (world.js's blend)
    nightTint: .62,           // at night the layers are this much darker and bluer (0 = no tint)
    swayPx: 3, swayS: 7,      // the Reed Marsh's middle reeds sway this far (px), once every this many seconds (never with reduced motion)
    fireflies: 10,            // fireflies drifting over the marsh at night …
    motes: 14,                // … and dust motes over the canyon by day
    clefAlpha: .07,           // the Bass Depths' / Treble Peaks' big faint clef
    slowMs: 20, slowFrames: 180,  // frames averaging over slowMs to draw (over slowFrames frames) = the far layer only, for good
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
  /* ---------- WORLD DROPS: mined blocks and calmed creatures drop their item into the world ---------- */
  pickupRadius: 1.5,          // every dropped item this close to you (tiles, to its center) is picked up by itself
  magnetRadius: 2.5,          // … and from this close it glides toward you first (a short pull)
  magnetSpeed: 9,             // the pull's speed, tiles a second
  dropPop: [2.2, 6],          // a drop pops out: [sideways, up] speed (tiles a second), then falls with gravity
  dropSpread: .35,            // INSTRUMENT mode's extra drops are spread this far apart (tiles)
  dropBob: .08,               // a resting drop bobs this much (tiles; still with reduced motion)
  dropDespawnS: 600,          // a drop OFF SCREEN this long disappears (never while you can see it; the lost-hearts bag never does)
  maxDrops: 80,               // at most this many drops in the world: the oldest beyond that joins the nearest drop of its kind
  invSlots: 24,               // your bag holds this many DIFFERENT items (tools aside); full = a drop stays on the ground
  bagFullToastS: 3,           // "Bag full!" at most this often
  /* ---------- LITTLE TOUCHES (reduced motion / the MOTION switch: no swing, poof or floating text) ---------- */
  pickupLabelMs: 1100,        // "+1 Maple" over your head drifts up and fades over this long …
  pickupMergeMs: 600,         // … the same item again within this long counts up in the same label ("+3 Maple")
  pickupLabelsMax: 4,         // … at most this many labels at once
  pickupAriaMs: 1500,         // screen readers hear the pickups at most this often (the labels' text, gathered)
  tipDelayMs: 250,            // an item's tooltip shows after hovering / focusing this long …
  tipLongPressMs: 400,        // … or a finger held on it this long (a normal tap still picks the item)
  farFlashMs: 400,            // a tap on a block out of reach: its faint red outline shows this long …
  farToastS: 3,               // … and "Too far: walk closer!" at most this often
  swingMs: 260,               // mining / tapping a creature: the avatar's quick swing with its tool
  chips: {n: 5, ms: 300},     // a block breaking: this many little chips, gone after this long
  poofMs: 450,                // a creature calmed: a friendly puff of cloud and notes
  /* THE NOTE LAYOUT (every Blocktave staff with several notes: the cards, Scale Veins, "Name this scale", Composer rows;
     challenges.js layoutNotes). Staff units: the staff's lines are 16 apart. */
  staffLead: 40,              // the first note (its ♯ / ♭ included) starts this far after the clef + key signature
  staffGap: 56,               // notes are at least this far apart (center to center) …
  staffAccRoom: 20,           // … plus this much more in front of a note with a ♯ / ♭ / ♮
  staffMinW: 420,             // a staff is at least this wide (when the screen has room): 1–3 notes centered, 4+ spread evenly
  staffTail: 12,              // room after the last note of a spread row
  noteMinPx: 14,              // a notehead is never drawn smaller than this on screen (px tall): too many notes = two rows
                              // (three on the narrowest phones with a long key signature), never smaller notes
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
