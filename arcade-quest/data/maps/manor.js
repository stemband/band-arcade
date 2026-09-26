/* ARCADE QUEST, EPISODE 1: GHOST NOTES MANOR. MAT: edit freely.
   Each room is a tile map: one character per 16 × 16 tile, one string per row (every row the same length).
   THE TILES (QUEST_TILES below): what each character draws and whether you can walk on it.
     X  wall top (the dark edge)     #  wall          c  wall + candle      p q n  wall + a portrait
     w  wall + window                C  wall + clock  f  wall + fireplace   D  door (in the wall: walk into it)
     L  locked door                  M  exit mat (at the bottom edge: walk onto it)
     .  wood floor     ,  carpet     _  checkered floor     r  rug     s  stairs     ~  fog (drifts)
     b  bookshelf      t  table      h  chair     x  plant   g  piano   y  piano keys   k  counter   o  stove
     j  SAVE JUKEBOX   T  TOKEN BOOTH   S  SHOP COUNTER   a  the Ghost Notes cabinet   e  a dusty sheet   z  a cable
   IN EACH ROOM:
     doors    {at: [x, y], to: room id, spawn: [x, y] where you appear, dir: 'up'|'down'|'left'|'right',
               need: a flag (locked until then; `locked` says why)}. x counts from 0 at the left, y from 0 at the top.
     npcs     {id (data/dialogue.js), at, sprite?, moved: {flag, at} (where they stand once that flag is set)}
     enemies  {key (unique in the room: saved when you help that ghost), type (data/enemies.js), at, happy?, wander (tiles)}
     things   {at, say: a sign id in data/dialogue.js (inspect with A), use?: 'jukebox' | 'booth' | 'shop'}
     floor    the floor tile drawn under furniture (tiles with over: true), e.g. '_' in the Kitchen (default '.')
     music    a music event (shared/sounds.js); fog: true = drifting fog over the whole room; practice: true = its
              ghosts come back every visit (the Practice Hall). */
window.QUEST_TILES = {
  ' ': {sprite: 'tile-void', solid: true},
  X: {sprite: 'tile-cap', solid: true},
  '#': {sprite: 'tile-wall', solid: true},
  c: {sprite: 'tile-candle', solid: true},
  p: {sprite: 'tile-portrait', solid: true},
  q: {sprite: 'tile-portrait2', solid: true},
  n: {sprite: 'tile-portrait3', solid: true},
  w: {sprite: 'tile-window', solid: true},
  C: {sprite: 'tile-clock', solid: true},
  f: {sprite: 'tile-fireplace', solid: true},
  D: {sprite: 'tile-door'},
  L: {sprite: 'tile-locked', solid: true},
  M: {sprite: 'tile-mat'},
  '.': {sprite: 'tile-floor'},
  ',': {sprite: 'tile-carpet'},
  _: {sprite: 'tile-check'},
  r: {sprite: 'tile-rug'},
  s: {sprite: 'tile-stairs'},
  '~': {sprite: 'tile-fog'},
  b: {sprite: 'tile-books', solid: true},
  t: {sprite: 'tile-table', over: true, solid: true},
  h: {sprite: 'tile-chair', over: true, solid: true},
  x: {sprite: 'tile-plant', over: true, solid: true},
  g: {sprite: 'tile-piano', solid: true},
  y: {sprite: 'tile-keys', solid: true},
  k: {sprite: 'tile-counter', solid: true},
  o: {sprite: 'tile-stove', solid: true},
  j: {sprite: 'tile-jukebox', solid: true},
  T: {sprite: 'tile-booth', solid: true},
  S: {sprite: 'tile-shop', solid: true},
  a: {sprite: 'tile-cabinet', over: true, solid: true},
  e: {sprite: 'tile-sheet', over: true, solid: true},
  z: {sprite: 'tile-cable', over: true},
};

window.QUEST_MAPS = {
  /* 1. THE FOYER: the safe hub. No enemies. */
  foyer: {
    name: 'The Foyer', music: 'quest-foyer', start: [10, 9], safe: true,
    tiles: [
      'XXXXXXXXXXXXXXXXXXXX',
      'XD#c#w#p#cD#p#w#f#CX',
      'X........,,.......jX',
      'Xx..h....,,........X',
      'X..T.....,,....S...X',
      'X........,,........X',
      'X...rrrr.,,..rrrr..X',
      'X...rrrr.,,..rrrr..X',
      'Xx.......,,.......xX',
      'X...a....,,........X',
      'X........,,........X',
      'XXXXXXXXXXXXXXXXXXXX',
    ],
    doors: [
      {at: [1, 1], to: 'practice', spawn: [7, 7], dir: 'up'},
      {at: [10, 1], to: 'hall', spawn: [14, 7], dir: 'up'},
    ],
    npcs: [
      {id: 'mezzo', at: [8, 5]},
      {id: 'terry', at: [3, 3]},
      {id: 'rusty', at: [15, 3]},
      {id: 'lou', at: [17, 9]},
    ],
    things: [
      {at: [18, 2], use: 'jukebox', say: 'jukebox'},
      {at: [3, 4], use: 'booth'},
      {at: [15, 4], use: 'shop'},
      {at: [4, 9], say: 'foyer-cabinet'},
      {at: [7, 1], say: 'foyer-portrait'},
      {at: [5, 1], say: 'foyer-window'},
      {at: [14, 1], say: 'foyer-window'},
      {at: [12, 1], say: 'foyer-portrait'},
      {at: [16, 1], say: 'foyer-fireplace'},
      {at: [18, 1], say: 'foyer-clock'},
    ],
    enemies: [],
  },

  /* 2. THE PORTRAIT HALL: PLAY and LISTEN (Wisps and a Squeaker). Sir Reginald Rest sleeps in front of the attic stairs. */
  hall: {
    name: 'The Portrait Hall', music: 'quest-manor',
    tiles: [
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'X#D#p#c#q#c#n#D#c#p#c#q#c#D##X',
      'X............................X',
      'X..x......................x..X',
      'X,,,,,,,,,,,,,,,,,,,,,,,,,,,,X',
      'X,,,,,,,,,,,,,,,,,,,,,,,,,,,,X',
      'X............................X',
      'X....x.......~~~~.......x....X',
      'XXXXXXXXXXXXXXMXXXXXXXXXXXXXXX',
    ],
    doors: [
      {at: [14, 8], to: 'foyer', spawn: [10, 2], dir: 'down'},
      {at: [2, 1], to: 'library', spawn: [10, 10], dir: 'up'},
      {at: [26, 1], to: 'ballroom', spawn: [11, 12], dir: 'up'},
      {at: [14, 1], to: 'stairs', spawn: [5, 14], dir: 'up'},
    ],
    npcs: [
      {id: 'reginald', at: [14, 2], moved: {flag: 'reginaldAwake', at: [16, 2]}},
      {id: 'fran', at: [9, 6]},
    ],
    things: [
      {at: [4, 1], say: 'hall-portrait-1'}, {at: [8, 1], say: 'hall-portrait-2'}, {at: [12, 1], say: 'hall-portrait-3'},
      {at: [18, 1], say: 'hall-portrait-4'}, {at: [22, 1], say: 'hall-portrait-5'},
      {at: [3, 3], say: 'plant'}, {at: [26, 3], say: 'plant'},
    ],
    enemies: [
      {key: 'w1', type: 'wisp', at: [6, 3], happy: 0, wander: 2},
      {key: 'w2', type: 'wisp', at: [19, 6], happy: 2, wander: 2},
      {key: 'w3', type: 'wisp', at: [23, 3], happy: 4, wander: 2},
      {key: 's1', type: 'squeaker', at: [11, 5], wander: 2},
    ],
  },

  /* 3. THE LIBRARY: VOCAB (Hush, the librarian ghosts). The Library Twins give hints. */
  library: {
    name: 'The Library', music: 'quest-manor',
    tiles: [
      'XXXXXXXXXXXXXXXXXXXX',
      'Xbbbbbb#cw#cbbbbbbbX',
      'X..................X',
      'X.bb.bb.bb..bb.bb..X',
      'X..................X',
      'X.bb.bb.bb..bb.bb..X',
      'X..................X',
      'X..rrrr....t...t...X',
      'X..rrrr............X',
      'X.bb.bb.....bb.bb..X',
      'X.........~~~......X',
      'XXXXXXXXXXMXXXXXXXXX',
    ],
    doors: [{at: [10, 11], to: 'hall', spawn: [2, 2], dir: 'down'}],
    npcs: [
      {id: 'twins', at: [4, 7], sprite: 'npc-tilly'},
      {id: 'twins', at: [5, 7], sprite: 'npc-tally'},
    ],
    things: [
      {at: [2, 3], say: 'book-1'}, {at: [5, 3], say: 'book-2'}, {at: [8, 3], say: 'book-3'}, {at: [12, 3], say: 'book-4'}, {at: [15, 3], say: 'book-5'},
      {at: [2, 5], say: 'book-6'}, {at: [9, 5], say: 'book-7'}, {at: [16, 5], say: 'book-8'}, {at: [2, 9], say: 'book-9'}, {at: [13, 9], say: 'book-10'},
      {at: [3, 1], say: 'book-1'}, {at: [15, 1], say: 'book-4'}, {at: [9, 1], say: 'library-window'},
      {at: [11, 7], say: 'library-table'}, {at: [15, 7], say: 'library-table'},
    ],
    enemies: [
      {key: 'h1', type: 'hush', at: [11, 4], wander: 2},
      {key: 'h2', type: 'hush', at: [17, 6], wander: 1},
      {key: 'h3', type: 'hush', at: [8, 8], wander: 2},
      {key: 'w1', type: 'wisp', at: [14, 2], happy: 1, wander: 2},
    ],
  },

  /* 4. THE BALLROOM: LONG TONE (Wobbles). The Butler teaches the B♭ Blast. */
  ballroom: {
    name: 'The Ballroom', music: 'quest-manor', fog: true, floor: '.',
    tiles: [
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'X#c#w#c#p#c##D#c#q#c#w#X',
      'X......................X',
      'X.ggg..______________..X',
      'X.yyy..______________..X',
      'X......______________..X',
      'X......______________..X',
      'X......______________..X',
      'X......______________..X',
      'X......______________..X',
      'X......................X',
      'X.x..t...t....t...t..x.X',
      'X......................X',
      'XXXXXXXXXXXMXXXXXXXXXXXX',
    ],
    doors: [
      {at: [11, 13], to: 'hall', spawn: [26, 2], dir: 'down'},
      {at: [13, 1], to: 'kitchen', spawn: [8, 9], dir: 'up'},
    ],
    npcs: [
      {id: 'butler', at: [5, 4]},
      {id: 'dot', at: [13, 6]},
    ],
    things: [
      {at: [2, 3], say: 'piano'}, {at: [3, 3], say: 'piano'}, {at: [4, 3], say: 'piano'}, {at: [2, 4], say: 'piano'}, {at: [3, 4], say: 'piano'}, {at: [4, 4], say: 'piano'},
      {at: [8, 1], say: 'ballroom-portrait'}, {at: [17, 1], say: 'ballroom-portrait-2'}, {at: [4, 1], say: 'ballroom-window'}, {at: [21, 1], say: 'ballroom-window'},
      {at: [5, 11], say: 'ballroom-table'}, {at: [9, 11], say: 'ballroom-table'}, {at: [14, 11], say: 'ballroom-table'}, {at: [18, 11], say: 'ballroom-table'},
    ],
    enemies: [
      {key: 'b1', type: 'wobble', at: [9, 5], wander: 2},
      {key: 'b2', type: 'wobble', at: [18, 8], wander: 2},
      {key: 'b3', type: 'wobble', at: [11, 9], wander: 2},
      {key: 's1', type: 'squeaker', at: [20, 3], wander: 1},
    ],
  },

  /* 5. THE KITCHEN: ARTICULATE (Chatterboxes, the teacup ghosts) */
  kitchen: {
    name: 'The Kitchen', music: 'quest-manor', floor: '_',
    tiles: [
      'XXXXXXXXXXXXXXXXXX',
      'X#c##w##C##w##c##X',
      'Xkkkookkkkookkkk.X',
      'X________________X',
      'X________________X',
      'X___tt_______tt__X',
      'X________________X',
      'X________________X',
      'Xx______________xX',
      'X________________X',
      'XXXXXXXXMXXXXXXXXX',
    ],
    doors: [{at: [8, 10], to: 'ballroom', spawn: [13, 2], dir: 'down'}],
    npcs: [{id: 'sizzle', at: [8, 3]}],
    things: [
      {at: [4, 2], say: 'stove'}, {at: [5, 2], say: 'stove'}, {at: [10, 2], say: 'stove'}, {at: [11, 2], say: 'stove'},
      {at: [1, 2], say: 'counter'}, {at: [7, 2], say: 'counter-2'}, {at: [13, 2], say: 'counter'}, {at: [8, 1], say: 'kitchen-clock'},
      {at: [4, 5], say: 'kitchen-table'}, {at: [5, 5], say: 'kitchen-table'}, {at: [13, 5], say: 'kitchen-table'}, {at: [14, 5], say: 'kitchen-table'},
    ],
    enemies: [
      {key: 'c1', type: 'chatterbox', at: [3, 7], wander: 2},
      {key: 'c2', type: 'chatterbox', at: [11, 7], wander: 2},
      {key: 'c3', type: 'chatterbox', at: [15, 4], wander: 1},
      {key: 'w1', type: 'wisp', at: [7, 8], happy: 3, wander: 2},
    ],
  },

  /* 6. THE ATTIC STAIRS: the mini-boss, The Phantom Fermata, holds the attic door shut */
  stairs: {
    name: 'The Attic Stairs', music: 'quest-manor', fog: true,
    tiles: [
      'XXXXXXXXXXX',
      'X#c##L##c#X',
      'X...sss...X',
      'X...sss...X',
      'X...sss...X',
      'X..sssss..X',
      'X..sssss..X',
      'X..sssss..X',
      'X..sssss..X',
      'X..sssss..X',
      'X..sssss..X',
      'X.~sssss~.X',
      'X.~sssss~.X',
      'X..sssss..X',
      'X.........X',
      'XXXXXMXXXXX',
    ],
    doors: [
      {at: [5, 15], to: 'hall', spawn: [14, 2], dir: 'down'},
      {at: [5, 1], to: 'attic', spawn: [7, 8], dir: 'up', need: 'atticOpen', locked: 'locked-attic'},
    ],
    npcs: [],
    things: [{at: [2, 1], say: 'stairs-candle'}, {at: [8, 1], say: 'stairs-candle'}, {at: [4, 9], say: 'stairs'}],
    enemies: [
      {key: 'boss', type: 'fermata', at: [5, 2], wander: 0, size: 3},
      {key: 'b1', type: 'wobble', at: [2, 8], wander: 1},
      {key: 'c1', type: 'chatterbox', at: [8, 11], wander: 1},
    ],
  },

  /* 7. THE ATTIC: locked until the Phantom Fermata is HARMONIZED. The final boss arrives in the next stage. */
  attic: {
    name: 'The Attic', music: 'quest-manor', fog: true,
    tiles: [
      'XXXXXXXXXXXXXXXX',
      'X#w##c####c##w#X',
      'X..............X',
      'X....ee........X',
      'X....eezzzzzzz.X',
      'X..............X',
      'X..x...........X',
      'X...........~~.X',
      'X..............X',
      'XXXXXXXMXXXXXXXX',
    ],
    doors: [{at: [7, 9], to: 'stairs', spawn: [5, 2], dir: 'down'}],
    npcs: [],
    things: [
      {at: [5, 3], say: 'attic-sheet'}, {at: [6, 3], say: 'attic-sheet'}, {at: [5, 4], say: 'attic-sheet'}, {at: [6, 4], say: 'attic-sheet'},
      {at: [2, 1], say: 'attic-window'}, {at: [13, 1], say: 'attic-window'}, {at: [3, 6], say: 'attic-end'}, {at: [10, 4], say: 'attic-cable'},
    ],
    enemies: [],
  },

  /* THE PRACTICE HALL (off the Foyer): one ghost of each kind, back every visit. Replay any challenge. */
  practice: {
    name: 'The Practice Hall', music: 'quest-foyer', practice: true,
    tiles: [
      'XXXXXXXXXXXXXXXX',
      'X#c#w##C##w#c##X',
      'X..............X',
      'X..h.h.h.h.h...X',
      'X..............X',
      'X..............X',
      'X..h.h.h.h.h...X',
      'X..............X',
      'X..............X',
      'XXXXXXXMXXXXXXXX',
    ],
    doors: [{at: [7, 9], to: 'foyer', spawn: [1, 2], dir: 'down'}],
    npcs: [],
    things: [{at: [7, 1], say: 'practice-sign'}, {at: [4, 1], say: 'practice-window'}, {at: [10, 1], say: 'practice-window'}],
    enemies: [
      {key: 'p1', type: 'wisp', at: [2, 2], happy: 0, wander: 1},
      {key: 'p2', type: 'squeaker', at: [12, 2], wander: 1},
      {key: 'p3', type: 'hush', at: [4, 5], wander: 1},
      {key: 'p4', type: 'wobble', at: [10, 5], wander: 1},
      {key: 'p5', type: 'chatterbox', at: [13, 7], wander: 1},
    ],
  },
};
