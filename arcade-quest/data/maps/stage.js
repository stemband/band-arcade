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
   A door to a room that isn't built yet shows its `soon` sign instead (the rooms come with the next build steps). */
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
     Jukebox, and MAESTRO MOOSE in the middle, frozen mid-downbeat. The Green Room is open; the Pit (up the aisle,
     through the auditorium doors) and the Prop Workshop come next; the balcony is roped off until Tubby Tusk wakes. */
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
      {at: [11, 1], to: 'pit', spawn: [7, 8], dir: 'up', soon: 'pit-soon'},
      {at: [19, 1], to: 'workshop', spawn: [7, 8], dir: 'up', soon: 'workshop-soon'},
      {at: [21, 1], to: 'balcony', spawn: [7, 8], dir: 'up', need: 'tuskAwake', locked: 'balcony-roped', soon: 'balcony-soon'},
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
});
