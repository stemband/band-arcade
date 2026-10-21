/* ARCADE QUEST, EPISODE 2: THE SHOWTIME STAGE. MAT: edit freely.
   The same format as data/maps/manor.js (read its notes first): one character per 16 × 16 tile, one string per row.
   Every room here has `ep: 2` (its episode: the floor's line, the whispers, where CONTINUE goes) and room ids that
   never clash with the manor's (saved helped machines are '<room>:<key>').
   THE THEATER'S TILES (added to QUEST_TILES below; the manor's keep their letters):
     =  wall top (the theater's dark edge)   W  theater wall   Y  wall + marquee bulbs (they twinkle, slowly)
     P  wall + a show poster                 m  wall + a dressing-room mirror with bulbs
     d  stage door (in the wall: walk into it)                 A  aisle exit (at the bottom edge: walk onto it)
     l  stairs roped off with a velvet rope (a door with `need`: open = Q, the stairs up)
     u  theater carpet   U  the gold carpet runner   G  stage boards
     R  a velvet rope post (with the rope)   B  box office counter   i  the ticket window (Ticket Booth Tina)
     F  the snack counter   H  theater seats   V  the red velvet curtain (it sways)   E  a couch   N  a music stand
     (j = the Save Jukebox, as in the manor)
   A door to a room that isn't built yet shows its `soon` sign instead (the rooms come with the next build steps).
   A ROOM'S OWN LETTERS (`legend`, build step 3): QUEST_TILES is nearly full, so a room can give letters its own meaning
   inside that room only ({letter: {sprite, solid, over, door, open, peek}}, the same flags; `open` names another
   letter of the same legend). Every room below lists its letters at its top.
   THE BAND WAKES (`wakes: {npc, flag}`): when every machine in the room is helped, BEFRIENDED OR POWERED DOWN, that
   band member wakes up (the flag), says their `wake` lines (data/dialogue-stage.js), and steps aside (`moved`).
   Never only befriends: no route can lock a door. engine/save.js repairs a save where they're all done (a save code).
   `tier` on a room's machine = its rhythm tier there (data/rhythms.js: 1 in the Pit and the Workshop, 2 deeper in).
   `whispers: [first, every]` = seconds until the room's first whisper, then between them (Backstage: more often).
   `glimpse: flag` = the first visit shows the giant Microphone in the room's `peek` tiles once (+ a crackle).
   BUILD STEP 4: `whisperLines` = whispers of the room's own (the Fly Loft), added to the episode's; an npc's
   `if: flag` (or '!flag') = it's there only then (Rico, after his battle); a map enemy's `boss: true` = not one of the
   20 machines (Rico Bandit: his own flags, data/enemies.js doneFlag / opens / opensIfFaded).
   BUILD STEP 5: an npc's or a thing's or a prop's `if` can also be 'a&b' and 'route:<enemy id>=befriend|fade' (how
   that story enemy was passed: save.route); an npc's `rest: true` = drawn dim with a little "z" (powered down to
   rest); a prop's `under: true` = drawn on the floor, under everyone; a map enemy's `sprite` = how it looks in the
   room (THE BIG NUMBER stands there as Maestro Moose). */
Object.assign(window.QUEST_TILES, {
  '=': {sprite: 'tile-st-cap', solid: true},
  W: {sprite: 'tile-st-wall', solid: true},
  Y: {sprite: 'tile-st-bulbs', solid: true},
  P: {sprite: 'tile-st-poster', solid: true},
  m: {sprite: 'tile-st-mirror', solid: true},
  d: {sprite: 'tile-st-door', door: true},
  A: {sprite: 'tile-st-exit', door: true},
  l: {sprite: 'tile-st-roped', solid: true, door: true, open: 'Q'},
  Q: {sprite: 'tile-st-stairs', door: true},
  u: {sprite: 'tile-st-carpet'},
  U: {sprite: 'tile-st-runner'},
  G: {sprite: 'tile-st-boards'},
  R: {sprite: 'tile-st-post', over: true, solid: true},
  B: {sprite: 'tile-st-boxoffice', solid: true},
  i: {sprite: 'tile-st-ticket', solid: true},
  F: {sprite: 'tile-st-snack', solid: true},
  H: {sprite: 'tile-st-seats', over: true, solid: true},
  V: {sprite: 'tile-st-curtain', solid: true, peek: true},      // peek: the giant microphone shows here in a whisper
  E: {sprite: 'tile-st-couch', over: true, solid: true},
  N: {sprite: 'tile-st-stand', over: true, solid: true},
});

Object.assign(window.QUEST_MAPS, {
  /* 1. THE LOBBY: the hub, safe. Ticket Booth Tina (the Token Booth), Popcorn Pete's snack counter (the shop), a Save
     Jukebox, and MAESTRO MOOSE in the middle, frozen mid-downbeat. The Green Room, the Orchestra Pit (through the
     auditorium doors, down the aisle) and the Prop Workshop (the side door) are open; the balcony stairs are roped off
     until Tubby Tusk wakes. */
  lobby: {
    name: 'The Lobby', ep: 2, music: 'quest-foyer', start: [11, 10], safe: true, floor: 'u',
    tiles: [
      '=======================',
      '=WdWPWWYYYYdYYYYWWPdWl=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=uuuuuuuRRUUURRuuuuuuu=',
      '=uBiBuuuuuUUUuuuuFFFuj=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=uuuuuuuRRUUURRuuuuuuu=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=uuuuuuuuuUUUuuuuuuuuu=',
      '=======================',
    ],
    doors: [
      {at: [2, 1], to: 'greenroom', spawn: [7, 8], dir: 'up'},
      {at: [11, 1], to: 'pit', spawn: [8, 9], dir: 'up'},
      {at: [19, 1], to: 'workshop', spawn: [8, 9], dir: 'up'},
      {at: [21, 1], to: 'balcony', spawn: [7, 8], dir: 'up', need: 'tuskAwake', locked: 'balcony-roped'},
    ],
    npcs: [
      {id: 'moose', at: [11, 6], if: '!ricoDone'},          // (once Rico is done he goes to the Main Stage: his note is here)
      {id: 'tina', at: [3, 3]},
      {id: 'pete', at: [18, 3]},
    ],
    things: [
      {at: [21, 4], use: 'jukebox', say: 'jukebox-stage'},
      {at: [3, 4], use: 'booth', keeper: 'tina'},
      {at: [18, 4], use: 'shop', keeper: 'pete'},
      {at: [2, 4], say: 'box-office'}, {at: [4, 4], say: 'box-office'},
      {at: [17, 4], say: 'snack-counter'}, {at: [19, 4], say: 'snack-counter'},
      {at: [4, 1], say: 'lobby-poster'}, {at: [18, 1], say: 'lobby-poster-2'},
      {at: [7, 1], say: 'lobby-bulbs'}, {at: [8, 1], say: 'lobby-bulbs'}, {at: [9, 1], say: 'lobby-bulbs'}, {at: [10, 1], say: 'lobby-bulbs'},
      {at: [12, 1], say: 'lobby-bulbs'}, {at: [13, 1], say: 'lobby-bulbs'}, {at: [14, 1], say: 'lobby-bulbs'}, {at: [15, 1], say: 'lobby-bulbs'},
      {at: [8, 3], say: 'velvet-rope'}, {at: [9, 3], say: 'velvet-rope'}, {at: [13, 3], say: 'velvet-rope'}, {at: [14, 3], say: 'velvet-rope'},
      {at: [8, 8], say: 'velvet-rope'}, {at: [9, 8], say: 'velvet-rope'}, {at: [13, 8], say: 'velvet-rope'}, {at: [14, 8], say: 'velvet-rope'},
      {at: [11, 6], say: 'moose-note', if: 'ricoDone'},
    ],
    props: [{at: [11, 6], sprite: 'moose-note', under: true, if: 'ricoDone'}],   // Maestro's note on the carpet: GONE TO THE STAGE!
    enemies: [],
  },

  /* 2. THE GREEN ROOM (off the Lobby): the PRACTICE room, safe. Mirrors with bulbs, a couch, a music stand, and
     PROFESSOR HOOT, stuck reading the same page until 6 Episode 2 machines are helped; then he wakes and teaches the
     E♭ Encore (data/dialogue-stage.js). Like the Practice
     Hall, its machines (coming) come back every visit. */
  greenroom: {
    name: 'The Green Room', ep: 2, music: 'quest-foyer', practice: true, safe: true, floor: 'u',
    tiles: [
      '================',
      '=WmWmWmWWPWWWWW=',
      '=uuuuuuuuuuuuuu=',
      '=uuuuuuuuuuuEEu=',
      '=uuuuuuuuuuuuuu=',
      '=uuuuNuuuuuuuuu=',
      '=uuuuuuuuuuuuuu=',
      '=uuuuuuuuuuuuuu=',
      '=uuuuuuuuuuuuuu=',
      '=======A========',
    ],
    doors: [{at: [7, 9], to: 'lobby', spawn: [2, 2], dir: 'down'}],
    npcs: [{id: 'hoot', at: [4, 5], awake: {flag: 'hootAwake', sprite: 'npc-hoot-ok'}}],   // awake: his eyes stop glowing red
    things: [
      {at: [5, 5], say: 'greenroom-stand'},
      {at: [2, 1], say: 'greenroom-mirror'}, {at: [4, 1], say: 'greenroom-mirror-2'}, {at: [6, 1], say: 'greenroom-mirror'},
      {at: [9, 1], say: 'greenroom-callboard'},
      {at: [12, 3], say: 'greenroom-couch'}, {at: [13, 3], say: 'greenroom-couch'},
    ],
    enemies: [],
  },

  /* 3. THE ORCHESTRA PIT (down the aisle): rows of music stands, sheet music on the floor, two timpani, the rail of the
     stage above. TUBBY TUSK sits on the TRAP DOOR, glitched on one low note; he wakes once its 3 machines are helped
     (either way), shuffles aside, and the trap door opens down to Backstage. The ROSIN POUCH charm hides in the
     corner timpani. Rhythm tier 1.
     ITS LETTERS: p pit floor · s sheet music on the floor · r the stage's rail · o a timpani · t the trap door
     (shut; open: T) · N a music stand · = edge · A the aisle back up */
  pit: {
    name: 'The Orchestra Pit', ep: 2, music: 'quest-manor', floor: 'p',
    legend: {
      p: {sprite: 'tile-st-pitfloor'}, s: {sprite: 'tile-st-sheets'}, r: {sprite: 'tile-st-rail', solid: true},
      o: {sprite: 'tile-st-timpani', over: true, solid: true}, t: {sprite: 'tile-st-trap', solid: true, door: true, open: 'T'},
      T: {sprite: 'tile-st-trap-open', door: true},
    },
    tiles: [
      '==================',
      '=rrrrrrrrrrrrrrrr=',
      '=opppppppppppppso=',
      '=ppNpNpNpptpNpNpp=',
      '=pppppppppppppppp=',
      '=psNpNpNppppNpNpp=',
      '=pppppppppppppppp=',
      '=ppNpNpNppppNpNsp=',
      '=pppppppppppppppp=',
      '=sppppppppppppppp=',
      '========A=========',
    ],
    doors: [
      {at: [8, 10], to: 'lobby', spawn: [11, 2], dir: 'down'},
      {at: [10, 3], to: 'backstage', spawn: [17, 2], dir: 'down', need: 'tuskAwake', locked: 'trap-locked'},
    ],
    npcs: [{id: 'tusk', at: [10, 3], moved: {flag: 'tuskAwake', at: [11, 3]}, awake: {flag: 'tuskAwake', sprite: 'npc-tusk-ok'}}],
    wakes: {npc: 'tusk', flag: 'tuskAwake'},
    things: [
      {at: [1, 2], say: 'pit-timpani'},
      {at: [16, 2], say: 'pit-timpani-2', charm: 'rosin-pouch', found: 'pit-timpani-found'},
      {at: [5, 1], say: 'pit-sign'}, {at: [12, 1], say: 'pit-rail'},
      {at: [3, 3], say: 'pit-stand'}, {at: [5, 3], say: 'pit-stand-2'}, {at: [7, 3], say: 'pit-stand'}, {at: [12, 3], say: 'pit-stand-2'}, {at: [14, 3], say: 'pit-stand'},
      {at: [3, 5], say: 'pit-stand'}, {at: [5, 5], say: 'pit-stand-2'}, {at: [7, 5], say: 'pit-stand'}, {at: [12, 5], say: 'pit-stand-2'}, {at: [14, 5], say: 'pit-stand'},
      {at: [3, 7], say: 'pit-stand'}, {at: [5, 7], say: 'pit-stand-2'}, {at: [7, 7], say: 'pit-stand'}, {at: [12, 7], say: 'pit-stand-2'}, {at: [14, 7], say: 'pit-stand'},
    ],
    enemies: [
      {key: 'm1', type: 'spotlight', at: [9, 5], wander: 1},
      {key: 'm2', type: 'feedback', at: [15, 6], wander: 1},
      {key: 'm3', type: 'metrognome', at: [4, 8], wander: 2, tier: 1},
    ],
  },

  /* 4. THE PROP WORKSHOP (the Lobby's side door): workbenches, paint cans, a giant cardboard moon, a half-painted
     backdrop, a sawhorse. SNAPJAW SAL is stuck in a drum roll; she wakes once its 4 machines are helped (either way),
     teaches RHYTHM ('rhythm-lesson': the Metronome Ticker), and clears the ladder up to the Fly Loft (build step 4:
     until then its `soon` sign). Rhythm tier 1.
     ITS LETTERS: G boards · W wall · K the backdrop · L the ladder (Sal clears it: then M) · b workbench · c paint cans
     · O the cardboard moon · s sawhorse · = edge · A the door back to the Lobby */
  workshop: {
    name: 'The Prop Workshop', ep: 2, music: 'quest-manor', floor: 'G',
    legend: {
      K: {sprite: 'tile-st-backdrop', solid: true}, L: {sprite: 'tile-st-ladder', solid: true, door: true, open: 'M'}, M: {sprite: 'tile-st-ladder', door: true},
      b: {sprite: 'tile-st-bench', over: true, solid: true}, c: {sprite: 'tile-st-paint', over: true, solid: true},
      O: {sprite: 'tile-st-moon', over: true, solid: true}, s: {sprite: 'tile-st-sawhorse', over: true, solid: true},
    },
    tiles: [
      '==================',
      '=WKKKWWWWWWWLWWWW=',
      '=GGGGGGGGGGGGGGGG=',
      '=GbbGGGGGGGGGGccG=',
      '=GGGGGGGGGGGGGGGG=',
      '=GGGOGGGGGGGGsGGG=',
      '=GGGGGGGGGGGGGGGG=',
      '=GccGGGGGGGGGbbGG=',
      '=GGGGGGGGGGGGGGGG=',
      '=GGGGGGGGGGGGGGGG=',
      '========A=========',
    ],
    doors: [
      {at: [8, 10], to: 'lobby', spawn: [19, 2], dir: 'down'},
      {at: [12, 1], to: 'loft', spawn: [2, 2], dir: 'right', need: 'salAwake', locked: 'ladder-locked'},
    ],
    npcs: [{id: 'sal', at: [8, 3], awake: {flag: 'salAwake', sprite: 'npc-sal-ok'}}],
    wakes: {npc: 'sal', flag: 'salAwake'},
    things: [
      {at: [2, 3], say: 'workshop-bench'}, {at: [3, 3], say: 'workshop-bench-2'}, {at: [13, 7], say: 'workshop-bench'}, {at: [14, 7], say: 'workshop-bench-2'},
      {at: [14, 3], say: 'workshop-paint'}, {at: [15, 3], say: 'workshop-paint'}, {at: [2, 7], say: 'workshop-paint'}, {at: [3, 7], say: 'workshop-paint'},
      {at: [4, 5], say: 'workshop-moon'}, {at: [13, 5], say: 'workshop-sawhorse'},
      {at: [2, 1], say: 'workshop-backdrop'}, {at: [3, 1], say: 'workshop-backdrop'}, {at: [4, 1], say: 'workshop-backdrop'},
    ],
    enemies: [
      {key: 'm1', type: 'tapsy', at: [6, 6], wander: 2, tier: 1},
      {key: 'm2', type: 'tapsy', at: [11, 4], wander: 2, tier: 1},
      {key: 'm3', type: 'ropeknot', at: [10, 8], wander: 1},
      {key: 'm4', type: 'confetti', at: [15, 5], wander: 1},
      // TOM-TOM TERMITE (a Raven Band student's): a bonus friend by the sawhorse, `extra` = not one of the 20 machines
      // (the Workshop's wake gate, the floor's %, the Showtime Log and SHOWSTOPPER never count it)
      {key: 'x1', type: 'termite', at: [14, 8], wander: 1, extra: true},
    ],
  },

  /* 5. BACKSTAGE (down the Pit's trap door, once Tubby moves): rope lines and sandbags, road cases, the stage
     manager's desk (its lamp, THE CLIPBOARD with the running order), a QUIET PLEASE sign the static keeps changing.
     The ladder back up to the Pit; the Dressing Rooms (Rico Bandit); the wings to the Main Stage (`need: 'ricoDone'`,
     either route; build step 5 builds the stage: until then its sign). The whispers come more often here. Rhythm tier 2.
     ITS LETTERS: g dark boards · k black wall · r rope lines · q the QUIET PLEASE sign · d the Dressing Rooms' door
     · w the wings · h the ladder up to the Pit · S sandbags · C a road case · l the desk's lamp · c the clipboard */
  backstage: {
    name: 'Backstage', ep: 2, music: 'quest-manor', floor: 'g', whispers: [12, [30, 55]],
    legend: {
      g: {sprite: 'tile-st-bfloor'}, k: {sprite: 'tile-st-bwall', solid: true}, r: {sprite: 'tile-st-ropes', solid: true},
      q: {sprite: 'tile-st-quiet', solid: true}, d: {sprite: 'tile-st-bdoor', door: true}, w: {sprite: 'tile-st-wings', door: true, peek: true},
      h: {sprite: 'tile-st-bladder', door: true}, S: {sprite: 'tile-st-sandbags', over: true, solid: true},
      C: {sprite: 'tile-st-case', over: true, solid: true}, l: {sprite: 'tile-st-desk-lamp', over: true, solid: true},
      c: {sprite: 'tile-st-desk-clip', over: true, solid: true},
    },
    tiles: [
      '====================',
      '=rrkkdkkkqkkkkwkkhr=',
      '=gggggggggggggggggg=',
      '=gSSSgggggggggggCCg=',
      '=gggggggggggggggggg=',
      '=ggggglcggggggggggg=',
      '=gggggggggggggggggg=',
      '=gCCgggggggggggSSSg=',
      '=gggggggggggggggggg=',
      '=gggggggggggggggggg=',
      '====================',
    ],
    doors: [
      {at: [17, 1], to: 'pit', spawn: [10, 4], dir: 'down'},
      {at: [5, 1], to: 'dressing', spawn: [9, 9], dir: 'up'},
      {at: [14, 1], to: 'stage', spawn: [1, 3], dir: 'right', need: 'ricoDone', locked: 'wings-locked'},
    ],
    npcs: [],
    things: [
      {at: [6, 5], say: 'backstage-lamp'}, {at: [7, 5], say: 'backstage-clipboard'},
      {at: [9, 1], say: 'backstage-quiet'}, {at: [1, 1], say: 'backstage-ropes'}, {at: [2, 1], say: 'backstage-ropes'}, {at: [18, 1], say: 'backstage-ropes'},
      {at: [2, 3], say: 'backstage-sandbags'}, {at: [3, 3], say: 'backstage-sandbags'}, {at: [4, 3], say: 'backstage-sandbags'},
      {at: [15, 7], say: 'backstage-sandbags'}, {at: [16, 7], say: 'backstage-sandbags'}, {at: [17, 7], say: 'backstage-sandbags'},
      {at: [16, 3], say: 'backstage-case'}, {at: [17, 3], say: 'backstage-case'}, {at: [2, 7], say: 'backstage-case-2'}, {at: [3, 7], say: 'backstage-case-2'},
    ],
    enemies: [
      {key: 'm1', type: 'metrognome', at: [4, 5], wander: 2, tier: 2},
      {key: 'm2', type: 'stubs', at: [12, 4], wander: 2},
      {key: 'm3', type: 'feedback', at: [9, 8], wander: 2},
      {key: 'm4', type: 'spotlight', at: [15, 9], wander: 1},
    ],
  },

  /* 6. THE BALCONY (the Lobby's roped stairs, once Tubby wakes): seat rows behind a brass railing, the dark drop down
     to the stage, a follow-spot. Through the curtain's gap far below, the giant Microphone shows for a moment the
     first time you come up (`glimpse`). Rhythm tier 2.
     ITS LETTERS: v the curtain far below · x the curtain's gap (the Microphone peeks through) · o the drop · i the
     railing · f the follow-spot · u carpet · H seats · = edge · A the stairs back down */
  balcony: {
    name: 'The Balcony', ep: 2, music: 'quest-foyer', floor: 'u', glimpse: 'balconyGlimpse',
    legend: {
      v: {sprite: 'tile-st-view', solid: true}, x: {sprite: 'tile-st-gap', solid: true, peek: true}, o: {sprite: 'tile-st-drop', solid: true},
      i: {sprite: 'tile-st-railing', over: true, solid: true}, f: {sprite: 'tile-st-followspot', over: true, solid: true},
    },
    tiles: [
      '==================',
      '=vvvvvvvxvvvvvvvv=',
      '=oooooooooooooooo=',
      '=iiiiiiiiiiiiiiii=',
      '=uuuuuuuuuuuuuuuf=',
      '=HHHHHHuuuuHHHHHH=',
      '=uuuuuuuuuuuuuuuu=',
      '=HHHHHHuuuuHHHHHH=',
      '=uuuuuuuuuuuuuuuu=',
      '=======A==========',
    ],
    doors: [{at: [7, 9], to: 'lobby', spawn: [21, 2], dir: 'down'}],
    npcs: [],
    things: [
      {at: [16, 4], say: 'balcony-spot'}, {at: [4, 3], say: 'balcony-railing'}, {at: [12, 3], say: 'balcony-railing'},
      {at: [3, 5], say: 'balcony-seats'}, {at: [13, 7], say: 'balcony-seats'},
      // THE DIAMOND (INSTRUMENT TIERS, designed by a Raven Band student): the far end of the back row, a dead-end corner
      // (seats above, walls right and below). Reachable on EVERY route: the Balcony opens when Tubby Tusk wakes (the
      // Pit's 3 machines helped, either way). `secret`: no twinkle, no talk bubble; A finds it facing the tile OR
      // standing on it (engine/world.js), like the Hamburger Charm. Once, ever (Q.gear)
      {at: [16, 8], gear: 'diamond', found: 'balcony-diamond-found', secret: true},
    ],
    // its only clue: one pixel of glint on the carpet, until it's found
    props: [{at: [16, 8], sprite: 'diamond-glint', under: true, if: '!gear:diamond'}],
    enemies: [
      {key: 'm1', type: 'tapsy', at: [4, 6], wander: 2, tier: 2},
      {key: 'm2', type: 'spotlight', at: [12, 8], wander: 2},
    ],
  },

  /* 7. THE DRESSING ROOMS (Backstage's door): a row of mirrors with bulbs over makeup tables, costume racks, the STAR
     DOOR to the stage, a vent grate low in the back wall. RICO BANDIT, the mini-boss (dressing:boss), behind a heap of
     "borrowed" notes. Befriended: he stands by the star door, awake, and it opens (ricoDoor); powered down: he rests in
     a chair by the vent and the vent grate pops open (ricoVent) into THE VENT. Rhythm tier 3.
     ITS LETTERS: u carpet · W wall · m a mirror with bulbs · t a makeup table · c a costume rack · n Rico's heap of
     notes · s the star door (open: S) · v the vent grate (open: V) · = edge · A the door back to Backstage */
  dressing: {
    name: 'The Dressing Rooms', ep: 2, music: 'quest-manor', floor: 'u',
    legend: {
      t: {sprite: 'tile-st-vanity', over: true, solid: true}, c: {sprite: 'tile-st-rack', over: true, solid: true}, n: {sprite: 'tile-st-heap', over: true, solid: true},
      s: {sprite: 'tile-st-stardoor', solid: true, door: true, open: 'S'}, S: {sprite: 'tile-st-stardoor-open', door: true},
      v: {sprite: 'tile-st-vent', solid: true, door: true, open: 'V'}, V: {sprite: 'tile-st-vent-open', door: true},
    },
    tiles: [
      '====================',
      '=WmWmWmWmWWWWsWWvWW=',
      '=ututututuuuuuuuuuu=',
      '=uuuuuuuuuuuuuuuuuu=',
      '=uuuuuuuuuuuuuuuuuu=',
      '=uuuuuuuuuuunuuunuu=',
      '=uuuuuuuuuuuuuuuuuu=',
      '=ccuuuuuuuuuuuuuucc=',
      '=uuuuuuuuuuuuuuuuuu=',
      '=uuuuuuuuuuuuuuuuuu=',
      '=========A==========',
    ],
    doors: [
      {at: [9, 10], to: 'backstage', spawn: [5, 2], dir: 'down'},
      {at: [13, 1], to: 'stage', spawn: [20, 3], dir: 'left', need: 'ricoDoor', locked: 'stardoor-locked'},
      {at: [16, 1], to: 'vent', spawn: [2, 4], dir: 'up', need: 'ricoVent', locked: 'vent-locked'},
    ],
    npcs: [
      {id: 'rico', at: [12, 2], if: 'ricoDoor', sprite: 'npc-rico-ok', awake: {flag: 'ricoDoor', sprite: 'npc-rico-ok'}},         // befriended: by the star door, handing notes back
      {id: 'rico', at: [17, 2], if: 'ricoVent', sprite: 'npc-rico-rest', awake: {flag: 'ricoVent', sprite: 'npc-rico-rest'}},       // powered down: resting in a chair by the vent
    ],
    things: [
      {at: [2, 1], say: 'dressing-mirror'}, {at: [4, 1], say: 'dressing-mirror-2'}, {at: [6, 1], say: 'dressing-mirror'}, {at: [8, 1], say: 'dressing-mirror-3'},
      {at: [2, 2], say: 'dressing-table'}, {at: [4, 2], say: 'dressing-table'}, {at: [6, 2], say: 'dressing-table-2'}, {at: [8, 2], say: 'dressing-table'},
      {at: [1, 7], say: 'dressing-rack'}, {at: [2, 7], say: 'dressing-rack'}, {at: [17, 7], say: 'dressing-rack-2'}, {at: [18, 7], say: 'dressing-rack-2'},
      {at: [12, 5], say: 'dressing-heap'}, {at: [16, 5], say: 'dressing-heap'},
    ],
    enemies: [
      {key: 'm1', type: 'feedback', at: [4, 4], wander: 2},
      {key: 'm2', type: 'confetti', at: [6, 8], wander: 2},
      {key: 'm3', type: 'ropeknot', at: [12, 8], wander: 2},
      {key: 'boss', type: 'rico', at: [14, 5], wander: 0, size: 3, boss: true},  // (boss: not one of the 20 machines)
    ],
  },

  /* 8. THE VENT (behind the Dressing Rooms' grate: THE DEFEAT ROUTE's passage, like Episode 1's Hidden Passage): a
     crawlspace of air ducts, slow fans, notes Rico dropped, and RICO'S LUCKY PICK (only here). The hatch at the far
     end climbs into the Fly Loft. No machines. It stays open for good (ricoVent never unsets).
     ITS LETTERS: d duct · n duct with dropped notes · k duct wall · F a fan · b a duct box · L the hatch up · g the
     grate back down · = edge */
  vent: {
    name: 'The Vent', ep: 2, music: 'quest-manor', floor: 'd',
    legend: {
      d: {sprite: 'tile-st-duct'}, n: {sprite: 'tile-st-duct-notes'}, k: {sprite: 'tile-st-ductwall', solid: true}, F: {sprite: 'tile-st-fan', solid: true},
      b: {sprite: 'tile-st-ductbox', solid: true}, L: {sprite: 'tile-st-bladder', door: true}, g: {sprite: 'tile-st-vent-open', door: true},
    },
    tiles: [
      '================',
      '=kkkFkkkkkFkkkL=',
      '=ddnddddddddndd=',
      '=ddddddbddddddd=',
      '=dnddddddddnddd=',
      '==g=============',
    ],
    doors: [
      {at: [2, 5], to: 'dressing', spawn: [16, 2], dir: 'down'},
      {at: [14, 1], to: 'loft', spawn: [2, 9], dir: 'right'},
    ],
    npcs: [],
    things: [
      {at: [7, 3], say: 'vent-box', charm: 'ricos-pick', found: 'vent-box-found'},
      {at: [4, 1], say: 'vent-fan'}, {at: [10, 1], say: 'vent-fan'},
    ],
    enemies: [],
  },

  /* 9. THE FLY LOFT (Sal's ladder from the Workshop, or the Vent's hatch): catwalks over the dark, the lighting bars,
     ropes and sandbags, the TOP of the red curtain. Far below, through the curtain's gap, the giant Microphone stands
     (steady: the closest it's been). The second SAVE JUKEBOX, by the ladder. Whispers come often here, with lines of
     their own. THE STAIRS DOWN to the Main Stage need ricoDone (either route; build step 5 builds the stage).
     Rhythm tier 3.
     ITS LETTERS: c catwalk · o the dark below · b lighting bars · r ropes · S sandbags · V the curtain's top · x its
     gap · h the ladder down · v the vent's hatch · d the stairs down · j the Save Jukebox · = edge */
  loft: {
    name: 'The Fly Loft', ep: 2, music: 'quest-manor', floor: 'c', whispers: [8, [20, 40]],
    whisperLines: ['...you\'re close... too close...', '...too LOUD...', '...don\'t look down...', '...they all left the stage...'],
    legend: {
      c: {sprite: 'tile-st-catwalk'}, o: {sprite: 'tile-st-void', solid: true}, b: {sprite: 'tile-st-lightbar', solid: true},
      r: {sprite: 'tile-st-loftrope', solid: true}, S: {sprite: 'tile-st-sandbags', over: true, solid: true},
      V: {sprite: 'tile-st-curttop', solid: true, peek: true}, x: {sprite: 'tile-st-curtgap', solid: true, peek: true},
      h: {sprite: 'tile-st-hole', door: true}, v: {sprite: 'tile-st-hatch', door: true}, d: {sprite: 'tile-st-loftstairs', door: true},
    },
    tiles: [
      '======================',
      '=bbjbbbbbbbbbbbbbbbbb=',
      '=hcccccccccccccccccrc=',
      '=cooooooooooooooooScS=',
      '=coVVVVVVVxVVVVVVVVoc=',
      '=cooooooooooooooooooc=',
      '=cccccccccccccccccccc=',
      '=coooooooocoooooooooc=',
      '=coooooooocoooooooooc=',
      '=vccccccccccccccccccd=',
      '======================',
    ],
    doors: [
      {at: [1, 2], to: 'workshop', spawn: [12, 2], dir: 'down'},
      {at: [1, 9], to: 'vent', spawn: [13, 2], dir: 'left', need: 'ricoVent', locked: 'hatch-locked'},   // (latched from below: the defeat route's)
      {at: [20, 9], to: 'stage', spawn: [19, 2], dir: 'down', need: 'ricoDone', locked: 'loft-stairs-locked'},
    ],
    npcs: [],
    props: [{at: [10, 4], sprite: 'mic-shadow', frame: 0}],            // the giant Microphone, far below, through the gap
    things: [
      {at: [3, 1], use: 'jukebox', say: 'jukebox-loft'},
      {at: [10, 3], say: 'loft-gap'}, {at: [5, 3], say: 'loft-curtain'}, {at: [15, 3], say: 'loft-curtain'},
      {at: [19, 2], say: 'loft-ropes'}, {at: [18, 3], say: 'loft-sandbags'}, {at: [20, 3], say: 'loft-sandbags'}, {at: [8, 1], say: 'loft-lights'},
    ],
    enemies: [
      {key: 'm1', type: 'miclet', at: [6, 6], wander: 2, tier: 3},
      {key: 'm2', type: 'metrognome', at: [15, 6], wander: 2, tier: 3},
      {key: 'm3', type: 'stubs', at: [10, 8], wander: 1},
      {key: 'm4', type: 'miclet', at: [14, 9], wander: 2, tier: 3},
    ],
  },

  /* 10. THE MAIN STAGE (build step 5): the boards, the red curtain drawn back, footlights glowing softly along the
     front, the painted backdrop, Maestro Moose's podium, and at the very front, center, THE STAGE MIC in its stand.
     Three ways in: Backstage's wings (ricoDone), the Dressing Rooms' star door (ricoDoor: befriended) and the Fly
     Loft's stairs (ricoDone). Before the finale the band stands frozen in five glitching spots (Rico too, whatever
     happened in the Dressing Rooms: here he's "rebooted"), and Maestro Moose at the podium IS THE BIG NUMBER (the
     map enemy, `sprite: 'npc-moose'`: talk to him (A) or walk into him: his speech, then the battle, data/enemies.js
     'bignumber'). After it (ep2Done) the band are NPCs: awake (the best ending) or resting (the shorter one), Moose
     at his podium either way, and where the mic stood, a hole with its cable running down.
     ITS LETTERS: G boards · V the curtain (drawn back) · k the backdrop · p the podium · f the footlights · M the
     mic's spot (solid) · w the wings (to Backstage) · s the star door (to the Dressing Rooms) · d the stairs up to the
     Fly Loft · = edge */
  stage: {
    name: 'The Main Stage', ep: 2, music: 'quest-manor', floor: 'G',
    legend: {
      k: {sprite: 'tile-st-backdrop', solid: true}, p: {sprite: 'tile-st-podium', over: true, solid: true}, f: {sprite: 'tile-st-footlights', solid: true},
      M: {sprite: 'tile-st-boards', solid: true}, w: {sprite: 'tile-st-wings', door: true, peek: true}, s: {sprite: 'tile-st-stardoor-open', door: true},
      d: {sprite: 'tile-st-loftstairs', door: true},
    },
    tiles: [
      '======================',
      '=VVkkkkkkkkkkkkkkkkdV=',
      '=VGGGGGGGGGGGGGGGGGGV=',
      'wGGGGGGGGGGGGGGGGGGGGs',
      '=VGGGGGGGGGpGGGGGGGGV=',
      '=VGGGGGGGGGGGGGGGGGGV=',
      '=VGGGGGGGGGGGGGGGGGGV=',
      '=VGGGGGGGGGGGGGGGGGGV=',
      '=GGGGGGGGGGMGGGGGGGGG=',
      '=ffffffffffffffffffff=',
      '======================',
    ],
    doors: [
      {at: [0, 3], to: 'backstage', spawn: [14, 2], dir: 'down'},
      {at: [21, 3], to: 'dressing', spawn: [13, 2], dir: 'down'},
      {at: [19, 1], to: 'loft', spawn: [19, 9], dir: 'left'},
    ],
    npcs: [
      // before the finale: frozen in the static (their glitched sprites)
      {id: 'stage-tusk', at: [5, 6], sprite: 'npc-tusk', if: '!ep2Done'},
      {id: 'stage-hoot', at: [7, 3], sprite: 'npc-hoot', if: '!ep2Done'},
      {id: 'stage-sal', at: [17, 6], sprite: 'npc-sal', if: '!ep2Done'},
      {id: 'stage-rico', at: [15, 3], sprite: 'npc-rico', if: '!ep2Done'},
      // after it: THE BEST ENDING (befriended) = awake; THE SHORTER ENDING (played on) = resting, dimmed
      ...[['stage-tusk', [5, 6], 'npc-tusk-ok'], ['stage-hoot', [7, 3], 'npc-hoot-ok'], ['stage-sal', [17, 6], 'npc-sal-ok'], ['stage-rico', [15, 3], 'npc-rico-ok']].flatMap(([id, at, ok]) => [
        {id, at, sprite: ok, if: 'ep2Done&route:bignumber=befriend', awake: {flag: 'ep2Done', sprite: ok}},
        {id, at, sprite: ok, rest: true, if: 'ep2Done&route:bignumber=fade', awake: {flag: 'ep2Done', sprite: ok}}]),
      {id: 'stage-moose', at: [11, 3], sprite: 'npc-moose-ok', if: 'ep2Done', awake: {flag: 'ep2Done', sprite: 'npc-moose-ok'}},
    ],
    props: [
      ...[[5, 6], [7, 3], [11, 3], [17, 6], [15, 3]].flatMap(at => [{at, sprite: 'stage-glitch', under: true, if: '!ep2Done'}, {at, sprite: 'stage-spot', under: true, if: 'ep2Done'}]),
      {at: [11, 8], sprite: 'stage-mic', if: '!ep2Done'},
      {at: [11, 8], sprite: 'stage-hole', under: true, if: 'ep2Done'},
      // THE HAMBURGER CHARM's only clue (designed by a Raven Band student): a crumb on the boards, nothing more
      {at: [1, 8], sprite: 'burger-crumb', under: true, if: '!charm:hamburger'},
    ],
    things: [
      {at: [11, 8], say: 'stage-mic', if: '!ep2Done'}, {at: [11, 8], say: 'stage-cable', if: 'ep2Done'},
      {at: [11, 4], say: 'stage-podium'}, {at: [5, 1], say: 'stage-backdrop'}, {at: [14, 1], say: 'stage-backdrop'},
      {at: [4, 9], say: 'stage-footlights'}, {at: [17, 9], say: 'stage-footlights'},
      // THE HAMBURGER CHARM: the bottom-left corner of the stage, before or after THE BIG NUMBER. `secret`: no twinkle,
      // and A finds it standing ON this tile too (engine/world.js), so a wall-hugger in the corner finds it
      {at: [1, 8], charm: 'hamburger', found: 'stage-burger-found', secret: true},
    ],
    enemies: [
      {key: 'boss', type: 'bignumber', at: [11, 3], wander: 0, boss: true, sprite: 'npc-moose'},   // (boss: not one of the 20 machines)
    ],
  },
});
