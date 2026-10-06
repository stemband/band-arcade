/* BLOCKTAVE: EVERY TUNING NUMBER, in one place (Mat: change a number here, never in game.js).
   Distances are in TILES (one block), times in SECONDS unless a name ends in Ms.
   THE BLOCKS, in order: world · starter · biomes · day and night · player · mining (notes, drops) · tools · light ·
   courage (THE COURAGE METER at the bottom of the world) · backdrop · creatures (spawn, clam, wisp, rusher, fair) ·
   losing all hearts · building · world drops · little touches · the note layout · saving · drawing · endless · goals */
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
  /* ---------- THE MUSIC: day, night, and CAVE music deep underground (sounds.js blocktave-day / -night / -cave) ---------- */
  music: {
    caveRows: 12,             // deeper than this many rows below the ground nearby → the cave music (in a cave it wins over night)
    leaveRows: 8,             // … back above this many rows → day or night music again (the gap stops it flickering at the edge)
    fadeS: 2.5,               // the crossfade between tracks (s)
  },
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
  otherRange: {treble: [55, 84, 71], bass: [36, 64, 50]},   // an OTHER clef's comfortable written range [low, high, the staff's middle line] (MIDI): single notes are filtered to it, scales moved by octaves into it
  craftWide: 820,             // the CRAFT panel at least this wide (px): two columns (the bench + materials | the Recipe Book); narrower = sticky bench + tabs
  craftGutter: 20,            // the panel's margin from the window edges (px), as in style.css .bt-panel
  dragEdge: 70,               // dragging a material within this many px of the top of the scrolling area scrolls it toward the slots
  dragScroll: 14,             // … by up to this many px a frame
  wrongShowMs: 900,           // a wrong answer: the card shakes this long, then closes (the block stays)
  // notes a challenge asks for, by block kind and tool: [hands, Wooden Mallet, Brass Mallet, Silver Mallet, Golden Baton]
  // (0 = that tool can't mine it)
  notes: {
    tone:    [0, 2, 1, 1, 1],       // Tone Ore / Brass Ore: 2 notes with the Wooden Mallet, 1 from the Brass Mallet on
    scale:   [0, 0, 8, 6, 5],       // Scale / Spring Veins: that many notes of a scale in order (5–8)
    sustain: [0, 0, 0, 1, 1],       // Sustain Stone: Silver Mallet or better
    rhythm:  [0, 1, 1, 1, 1],       // Rhythm Rock: measures of rhythm
    rest:    [0, 0, 0, 1, 1],       // Rest Crystal: Silver Mallet or better
    // (added with Chapter 6: the six new ores)
    lowread:  [0, 0, 3, 3, 2],      // Rumble Ore: low notes (ledger lines BELOW the bass staff), going down
    highread: [0, 0, 3, 3, 2],      // Piccolo Quartz: high notes (ledger lines ABOVE the treble staff), going up
    interval: [0, 1, 1, 1, 1],      // Interval Geode: one interval (two notes, lower then higher)
    keysig:   [0, 0, 1, 1, 1],      // Key Quartz: one key signature
    dynamics: [0, 1, 1, 1, 1],      // Dynamic Coral: soft, then loud
    tempo:    [0, 0, 8, 8, 6],      // Tempo Amber: this many steady beats alone after the count-in
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
  countOffVol: .8,            // THE COUNT-OFF YOU CAN HEAR (rhythm cards): the clicks' level (the downbeat full, the others softer) …
  countOffEchoMs: 250,        // … and while the microphone listens it hears nothing new until the last click has ended + this
                              // (the "Count-off clicks" setting turns them off; a card whose mute would reach its first note stays silent)
  snareCount: [3, 5],         // Snare Drum's Tone Ore: "play exactly N hits" (random from this range), then STOP
  snareConfirmMs: 700,        // … silence this long after the last hit confirms the count
  /* ---------- TOOLS: what each tier can mine (a block's `tier` in world.js) ---------- */
  tools: ['Hands', 'Wooden Mallet', 'Brass Mallet', 'Silver Mallet', 'Golden Baton'],
  /* ---------- DROPS (TOUCH mode; INSTRUMENT mode × instrumentBonus) ---------- */
  drops: {tone: 1, scale: 1, sustain: 1, rhythm: 1, rest: 1, tap: 1, lowread: 1, highread: 1, interval: 1, keysig: 1, dynamics: 1, tempo: 1},
  /* ---------- THE SIX ORES OF CHAPTER 6 (world.js placeOres2: new worlds, and once into every older saved world) ----------
     Each rate = the chance that one tile where that ore may form becomes it (tuned for about: Rumble 25, Piccolo 20,
     Geode 40, Key 30, Coral 20, Amber 25 a world). */
  ores: {
    rumbleBelow: 12,          // Rumble Ore: Bass Depths only, at least this many rows below deepY, on a cave's wall …
    rumbleRate: .065,
    piccoloAbove: 4,          // Piccolo Quartz: Treble Peaks only, at least this many rows above peaksY, on the mountain's face
    piccoloRate: .47,
    geodeRate: .082,          // Interval Geode: the walls of middle-layer caves, anywhere
    keyBelow: 3,              // Key Quartz: Brass Mountains rock, at least this many rows under the ground (never the surface)
    keyRate: .011,
    coralRate: .6,            // Dynamic Coral: the beds of Reed Marsh pools (under water)
    amberBelow: 10,           // Tempo Amber: Percussion Canyon, at least this many rows under the ground
    amberRate: .0076,
    minReach: 6,              // every world has at least this many Rumble Ore and Piccolo Quartz on an open face (reachable)
    keepAway: 6,              // the one-time pass into an OLDER world: never this close to anything the player built
  },
  /* DYNAMIC CORAL's card: "Play SOFT, then LOUD" (forgiving by design) */
  dyn: {
    holdS: .8,                // hold the soft note this long, then the loud one this long …
    ratio: 1.8,               // … the loud one at least this many times the soft one's level (the snare: its hits' peaks)
    failS: 4,                 // the loud part sounding this long without getting loud enough = "Make the second one MUCH louder!"
    marks: ['pp', 'p', 'mp', 'mf', 'f', 'ff'],   // TOUCH: 4 of these, shuffled, tapped softest to loudest
  },
  /* TEMPO AMBER's card: a tempo word + its mark, a 4-beat count-in, then keep the beat ALONE */
  tempo: {
    choices: [66, 92, 112, 132],   // the BPMs (the word comes from Tune Up's metronome, TEMPO_WORDS)
    countIn: 4,               // beats of count-in (TOUCH: clicks you can hear; INSTRUMENT: the count-off rule)
    tol: .08,                 // the average beat within this share of the target …
    even: .2,                 // … and every gap within this share of the average
  },
  /* ---------- CHAPTER 6'S GEAR AND BLOCKS (recipes.js: kind 'gear' works while it's anywhere in the hotbar) ---------- */
  trampoline: {boost: 6, holdBoost: 1, minFall: 3},   // a Timpani Trampoline launches you boost tiles up (+holdBoost holding JUMP),
                                                       // landing on it faster than minFall tiles a second
  gear: {
    jumpPlus: 1,              // Tuba Boots: jump this many tiles higher
    glideSpeed: 2.2,          // Piccolo Glider: hold JUMP while falling = fall no faster than this (tiles a second)
    speedPlus: .3,            // Accelerando Boots: walk this much faster (they stack with Tuba Boots)
  },
  signs: {maxPairs: 3, safe: 8, hurtS: 3, fadeMs: 700},   // D.S. al Coda Signs: pairs a world; no travel at night with a creature
                                                         // this close, or hurt in the last hurtS seconds; the fade
  sonar: {range: 80},         // the Sonar Tuning Fork points to the nearest chosen ore this close (tiles)
  organ: {chordMs: 1100},     // the Pipe Organ's major chord (tones.js; never while a card is open or the mic listens)
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
    // THE NEON TORCH (carried: it lights while it's in ANY hotbar slot; drawn only, like the glow: never in the spawn check)
    torchRadius: 7,           // instead of playerRadius while carried (the Golden Baton's batonGlow still adds) …
    torchGlow: .9,            // … this bright at your body, fading out
    torchTint: .1,            // a soft warm-cyan wash in its light (0 = none; it never flickers)
    openLift: .08,            // underground, open space looks this much lighter than rock (so the cave's shape reads)
    waterMin: .35,            // water is never drawn darker than this
    glint: .5,                // ores and veins keep a faint glow of their color in the dark (0 = none)
    // THE WAY UP
    lostDepth: 8,             // more than this many rows below the ground nearby …
    lostS: 20,                // … without getting closer to the surface for this long: an arrow points the way up
    surfaceAfterS: 60,        // this long underground: the pause menu offers ↑ SURFACE (back up along open tiles)
  },
  /* ---------- THE COURAGE METER: a player who parks at the very bottom of the world and stops building slowly loses
     their nerve; when it runs out they're carried back up to the surface (they keep EVERYTHING: a nudge, never a
     punishment). BUILDING = placing a block, using a door / cot / locker / composer / podium / bench, MAKE IT at the
     Measure, eating a Snack Bag (and, with resetOnMine, passing a challenge card). Walking, jumping, tap-mining and
     menus don't count. The clock stops while a card is open, paused, the mic is muted for a sound, or the tab is hidden. */
  courage: {
    name: 'Courage',          // the meter's word (Mat: change it here, e.g. 'Sanity')
    floorRows: 6,             // "the very bottom" = within this many rows above the World Floor (bedrock)
    graceS: 30,               // seconds at the bottom with no building before the meter starts to drain
    drainS: 60,               // then this long from full to empty
    refillS: 4,               // building refills it this fast (full in 4 s)
    warnAt: .35,              // the "Feeling uneasy…" warning below this
    resetOnMine: true,        // mining a MUSIC block (a challenge card passed) counts as building, so students
                              // who are playing their instrument down there are never sent up
    jitterMs: 900,            // the "got the jitters" swirl / fade before you reappear on the surface
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
    perNight: {clam: 8, wisp: 4, rusher: 3, zipper: 4},   // the most of each kind that can appear in one night (night 1) …
    atOnce: {clam: 4, wisp: 2, rusher: 2, zipper: 2},     // … and the most of each kind at once (night 1)
    // THE SPAWN RAMP (the Rey Update): both numbers above grow with the night number: × (1 + per × (night − 1)), at most
    // × cap (about 2× by night 7). Survival Nights uses its own night count.
    ramp: {per: .15, cap: 2},
    rushersFrom: 3,           // Rushers come out from the 3rd night on
    zippersFrom: 2,           // Zippers come out from the 2nd night on
    cotSafe: 12,              // nothing ever appears this close to your Practice Cot (even in the dark)
    cave: {clam: .6, wisp: .4},                // in unlit caves (any time), the share of spawns of each kind
    despawnFar: 44,           // a creature this far away disappears
  },
  clam: {hopS: 1.3, hopX: 1.6, hopY: 7, see: 16, listen: 9, calm: 10},
  // THE ZIPPER (the Rey Update): a tiny, zippy note-bug. speedX = how many times a Night Clam's speed it runs; its touch
  // takes ½ a heart, then it zips away for fleeS seconds
  // THE ZIPPER (the Rey Update): speedX × a Night Clam's top speed (hopX ÷ hopS) before the fairness check, notices you
  // within `see`, the mic listens within `listen`, after its touch (½ a heart) it runs away for fleeS, jump = its hop speed
  zipper: {speedX: 3, see: 16, listen: 9, fleeS: 1.6, jump: 9},
  wisp: {speed: 1.1, see: 18, drain: 3, listen: 9, holdS: 2, cents: 30},   // (holdS: before HP; a hold now hits every combat.wispTickS)
  wispDrainS: 4,              // a Sour Wisp this close drains ½ heart every this many seconds
  rusher: {speed: 6.5, alert: 12, beats: 2, cooldownS: 5},
  /* THE FAIRNESS CHECK: a creature's challenge must fit the time it needs to reach you. A creature is slowed until
     (its challenge's seconds) × margin fit in (its distance ÷ its speed). */
  // (cardS: the challenge seconds before creatures had HP; kept for reference, the check now uses combat.actionS × hits)
  fair: {margin: 1.4, cardS: {clam: 4, wisp: 5, rusher: 0}},
  /* ---------- COMBAT: MUSIC DOES THE DAMAGE (the Rey Update: Rey's numbers are the starting values) ----------
     Creatures are still CALMED, never killed: every correct musical action (a right note, a right answer, a right hit,
     each second of a steady in-tune hold) does CALM DAMAGE against the creature's HP; at 0 it's calmed (the poof, its
     drop). A wrong answer does nothing. */
  combat: {
    hp: {clam: 10, wisp: 15, rusher: 12, zipper: 1},   // each creature's HP (Rey: "10 or more"; the Zipper: 1)
    damage: [1, 2, 3, 4, 5],  // calm damage per correct action, by your best tool: none, Wooden / Brass / Silver Mallet, Golden Baton
    wispTickS: 1,             // a Sour Wisp: each this-many seconds of steady in-tune holding (a roll on the snare) is one hit
    // THE FAIRNESS CHECK with HP: a creature needs ceil(HP ÷ damage) correct actions to calm, each taking about this many
    // seconds; it's slowed until that time × fair.margin fits the time it needs to reach you
    actionS: {clam: 2, wisp: 1, zipper: 2.5},
    numberMs: 900,            // a "−3" floats up from a creature this long (no drift with reduced motion)
    barMs: 4000,              // its HP bar shows this long after a hit (and while its card is open)
    // BREAKING OUT: a creature that can't get any closer to you for breakAfterS may break ONE soft block next to it every
    // breakEveryS (never doors, glass, bricks, rock, ores, stations, lamps, cots, Composer Blocks, or any wall of a
    // closed room with a door: shelters stay safe). The block drops its item as usual.
    breakAfterS: 3, breakEveryS: 2,
    soft: ['dirt', 'moss', 'sand', 'leaves', 'planks'],   // the SOFT blocks it may break (block keys; Glow Moss is dirt)
    pool: 8,                  // a Night Clam / Zipper carries this many notes of its zone; each hit shows a NEW one of them
  },
  /* ARMOR AND SHIELDS (the Rey Update 2/4; Rey's numbers). One armor and one shield can be worn (the Inventory's two
     slots). When a creature's hit lands:
       1. a worn SHIELD uses 1 durability and BLOCKS the whole hit `block` of the time (a soft clank, one pulse on you);
       2. otherwise a worn ARMOR uses 1 durability, and the hit shrinks by the reductions together: they MULTIPLY,
          1 − (1 − armor) × (1 − shield), at most maxReduction (Silver Stage Armor + Silver Cymbal Shield = 68 %);
       3. what's left is counted in HALF HEARTS by "fair rounding": the whole halves, plus one more half with the chance of
          the remainder (0.3 hearts → ½ heart 60 % of the time, else nothing), so on average you lose exactly the reduced
          damage, and ¼ heart = ½ heart half the time.
     A Sour Wisp's drain is damage too: armor reduces it (and wears), but a shield can't block a drain (no shield at all).
     durability: hits an item can take (or block); at 0 it wears out (a soft crack, a toast) and is gone. Repair it at a
     Luthier's Bench: one of its `repair` material (recipes.js) + a one-note performance, back to full. */
  defense: {
    armor: {
      feltvest:    {reduce: .25, durability: 30},   // Felt Vest: 25 % less damage
      brasscoat:   {reduce: .50, durability: 50},   // Brass-Buckle Coat: 50 % less
      silverarmor: {reduce: .60, durability: 80},   // Silver Stage Armor: 60 % less
    },
    shield: {
      drumshield:   {reduce: .10, block: .20, durability: 20},   // Drumhead Shield: 10 % less, blocks 1 hit in 5
      bellshield:   {reduce: .15, block: .50, durability: 35},   // Brass Bell Shield: 15 % less, blocks half the hits
      cymbalshield: {reduce: .20, block: .70, durability: 50},   // Silver Cymbal Shield: 20 % less, blocks 7 hits in 10
    },
    maxReduction: .75,        // armor + shield never take away more than this share of a hit
    flashMs: 400,             // a block's pulse on the avatar (one soft ring, fading; never white, never repeated)
  },
  /* THE POWER METER (the Rey Update 3/4): abilities run on MUSIC. Every PASSED challenge card (a music block, a recipe, a
     creature's card, the Podium, a repair, the Power Table's own cards) fills perCard pips, and so does every creature
     you calm (perCalm); using an ability costs 1 pip. Shown as max pips beside the hearts. */
  power: {max: 3, perCard: 1, perCalm: 1},
  /* ABILITIES (learned and upgraded at the Power Table; recipes.js BT_POWERS has what each costs). Rey's level table:
     levels[0] = level 1 … levels[2] = level 3: `damage` = calm damage, `cooldownS` = seconds before it can be used again.
     A use is ONE tap (the ABILITY button by the hotbar, or Q / R / T: W and E are already Jump and the Inventory) toward
     the aimed spot / the nearest creature within `range`. Never while a card or a panel is open. The fairness check
     never counts on abilities. */
  abilities: {
    levels: [{damage: 5, cooldownS: 10}, {damage: 7, cooldownS: 5}, {damage: 10, cooldownS: 3.5}],
    range: 8,                 // tiles: how far an ability looks for the nearest creature / the aimed spot
    slots: 1, amuletSlots: 3, // abilities equipped at once: 1, or 3 with the Multi-Power Amulet
    // FIRE: a wall of warm sparks in front of you (width × height tiles) for `seconds`; every tickS each creature in it
    // takes perTick × level, at most the level's damage in all
    fire: {seconds: 2, tickS: .5, perTick: 3, width: 3, height: 2.5},
    // EARTH: throws the SOFT block you aim at (rules.js combat.soft; never a station or a shelter wall) at `speed` tiles/s,
    // up to `reach` tiles away to pick it up and `range` to fly; the first creature it meets takes the level's damage,
    // and the block drops as an item where it lands
    earth: {reach: 4.5, speed: 14},
    // WIND: a dash of `dash` tiles (never into a solid block); creatures within `width` tiles of the dash's path are pushed
    // `push` tiles away (never into a block) and take the level's damage
    wind: {dash: 3, push: 4, width: 1.5},
    // WATER: a splash of `radius` tiles at the target: Rey's own damage (2 / 5 / 8 by level), and creatures in it move
    // at slowMul for slowS
    water: {radius: 2.5, damage: [2, 5, 8], slowS: 3, slowMul: .4},
    // LIGHTNING: strikes the nearest creature within `range` (the level's damage) and CONFUSES it for confuseS (it wanders
    // a new random way every wanderS); drawn as ONE zigzag flash that fades over flashMs (never strobing, never full-screen;
    // reduced motion: a straight line that fades)
    lightning: {range: 10, confuseS: 3, wanderS: .7, flashMs: 300},
  },
  metronomeSlow: .8,          // creatures within a placed Metronome's radius move this fast
  metronomeRadius: 8,
  tunerRadius: 6,             // Sour Wisps can't enter a placed Tuner's radius
  /* ---------- LOSING ALL HEARTS (gentle: never a lost world) ---------- */
  dropShare: .25,             // this share of each carried material goes in a floating bag where you fell (tools stay) …
  dropShareCot: .10,          // … only this share when you have a Practice Cot set (the Rey Update)
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
  newChapter: 5,              // Chapter 6 shows once this chapter has at least one star
};
