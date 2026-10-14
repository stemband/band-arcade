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
   `glimpse: flag` = the first visit shows the giant Microphone in the room's `peek` tiles once (+ a crackle). */
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
      {id: 'moose', at: [11, 6]},
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
    ],
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
     ITS LETTERS: G boards · W wall · K the backdrop · L the ladder (Sal clears it) · b workbench · c paint cans
     · O the cardboard moon · s sawhorse · = edge · A the door back to the Lobby */
  workshop: {
    name: 'The Prop Workshop', ep: 2, music: 'quest-manor', floor: 'G',
    legend: {
      K: {sprite: 'tile-st-backdrop', solid: true}, L: {sprite: 'tile-st-ladder', solid: true, door: true},
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
      {at: [12, 1], to: 'loft', spawn: [7, 8], dir: 'up', need: 'salAwake', locked: 'ladder-locked', soon: 'ladder-soon'},
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
    ],
  },

  /* 5. BACKSTAGE (down the Pit's trap door, once Tubby moves): rope lines and sandbags, road cases, the stage
     manager's desk (its lamp, THE CLIPBOARD with the running order), a QUIET PLEASE sign the static keeps changing.
     The ladder back up to the Pit; the Dressing Rooms (build step 4) and the wings to the Main Stage (build step 5)
     show their signs for now. The whispers come more often here. Rhythm tier 2.
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
      {at: [5, 1], to: 'dressing', spawn: [7, 8], dir: 'up', soon: 'dressing-soon'},
      {at: [14, 1], to: 'stage', spawn: [7, 8], dir: 'up', soon: 'wings-soon'},
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
    ],
    enemies: [
      {key: 'm1', type: 'tapsy', at: [4, 6], wander: 2, tier: 2},
      {key: 'm2', type: 'spotlight', at: [12, 8], wander: 2},
    ],
  },
});
