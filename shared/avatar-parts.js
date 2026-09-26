/* Band Arcade: CREATE YOUR PLAYER, the parts. Every piece of a student's avatar is a small pixel map here.
   shared/avatar.js draws them in layers, twice: the FULL-BODY 8-bit sprite (32 × 32, Arcade Quest: SIDE facing
   right, FRONT and BACK views) and the PORTRAIT BUST (36 × 36, head and shoulders, for the arcade's screens).

   HOW A MAP IS WRITTEN (same idea as arcade-quest/sprites.js): rows of characters, one per pixel; '.' or a space is
   see-through. {y, half: [...]}: the LEFT half of a symmetric picture (16 characters wide for the sprite, 18 for the
   bust), mirrored to make the right half; {y, x, rows: [...]}: full rows starting at column x (default 0). y = the
   first row. The dark outline is added automatically around the whole character, so never draw it.
   THE LETTERS (the renderer turns each into the student's chosen color; the colors are --av-* tokens in theme.css):
     s skin, S skin shade (ears, nose), F freckles          e eye color, w eye white, K near-black (lashes, lids)
     b eyebrows (the hair's shade)   m mouth, t teeth, n tongue
     h hair, H hair shade, l hair highlight                c top, C top shade, d top detail (a contrast color)
     g gold, W white, p bottoms, P bottoms shade, q shoes, Q soles
     u head covering, U its shade, j its detail            x glasses frame      a hearing aid
     v wheelchair frame, V tire, r rim and spokes
     1–9, 0: the accessory skins' colors (red, red-hi, yellow, amber, pink, cyan, purple, deep, white-hi, cyan-hi)
   SPRITE landmarks (x grows right, y down): FRONT eyes (13, 9) and (18, 9), mouth (15–16, 11), ears x 9 / 22 rows
     8–9, neck y 13, torso x 11–20 rows 14–20; SIDE eye (17, 9), mouth (18, 11), ear (13, 8–9), torso x 12–18.
   BUST landmarks: eyes x 12–14 and 21–23 rows 15–17, brows rows 13–14, nose y 19, mouth x 15–20 rows 20–22, ears x 9 /
     26 rows 14–17, chin y 24, neck x 15–20 rows 25–27, shoulders from row 27.

   HOW TO ADD A PART: add an entry to its list below with a new id (never rename an id: students' avatars save it)
   and a `name` (what the button says and screen readers hear). Give it a map for each view you can (sprite
   `front`, `side`, `back` and `bust`); a missing view just draws nothing there. Then open Create Your Player
   (?demo) and look at it from every side. HAIR: `front` (over the head), `behind` (behind the body: long hair
   down the back), `back` (the back view; left out = the head filled in with hair down to `backTo`). HEAD
   COVERINGS: `hides: 'all'` (no hair shows: hijab, turban), 'top' (hair shows only below row `clip`: caps,
   beanies) or 'none' (headphones). */
window.AVATAR_PARTS = {};
(function (P) {
  "use strict";
  const rep = (ch, n) => ch.repeat(Math.max(0, n));
  /** a row with pixels from x0 to x1 (inclusive) in `ch`: easy symmetric shapes */
  const span = (x0, x1, ch = 's') => rep('.', x0) + rep(ch, x1 - x0 + 1);

  /* ---------- colors: the choices students see (each id = --av-<group>-<id> tokens in theme.css) ---------- */
  P.SKIN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({id: n, name: 'Skin tone ' + n}));
  P.HAIR_COLORS = [
    {id: 'black', name: 'Black'}, {id: 'darkbrown', name: 'Dark brown'}, {id: 'brown', name: 'Brown'}, {id: 'auburn', name: 'Auburn'},
    {id: 'copper', name: 'Copper'}, {id: 'blonde', name: 'Blonde'}, {id: 'platinum', name: 'Platinum'}, {id: 'gray', name: 'Gray'},
    {id: 'white', name: 'White'}, {id: 'pink', name: 'Pink'}, {id: 'purple', name: 'Purple'}, {id: 'blue', name: 'Blue'},
    {id: 'teal', name: 'Teal'}, {id: 'green', name: 'Green'}, {id: 'orange', name: 'Orange'}];
  P.EYE_COLORS = [{id: 'darkbrown', name: 'Dark brown'}, {id: 'brown', name: 'Brown'}, {id: 'hazel', name: 'Hazel'}, {id: 'green', name: 'Green'},
    {id: 'blue', name: 'Blue'}, {id: 'gray', name: 'Gray'}, {id: 'amber', name: 'Amber'}];
  // clothes, head coverings, shoes, glasses, hearing aids and the wheelchair all pick from this list
  P.COLORS = [
    {id: 'red', name: 'Red'}, {id: 'orange', name: 'Orange'}, {id: 'yellow', name: 'Yellow'}, {id: 'green', name: 'Green'}, {id: 'teal', name: 'Teal'},
    {id: 'blue', name: 'Blue'}, {id: 'navy', name: 'Navy'}, {id: 'purple', name: 'Purple'}, {id: 'pink', name: 'Pink'}, {id: 'maroon', name: 'Maroon'},
    {id: 'forest', name: 'Forest green'}, {id: 'black', name: 'Black'}, {id: 'gray', name: 'Gray'}, {id: 'white', name: 'White'},
    {id: 'denim', name: 'Denim'}, {id: 'khaki', name: 'Khaki'}, {id: 'tan', name: 'Tan'}];
  P.BOTTOM_COLORS = ['denim', 'black', 'khaki', 'gray', 'navy', 'maroon', 'forest', 'tan', 'purple', 'red'];
  P.SHOE_COLORS = ['white', 'black', 'red', 'blue', 'pink', 'green', 'yellow', 'purple', 'tan'];
  P.FRAME_COLORS = ['black', 'maroon', 'tan', 'red', 'blue', 'purple', 'pink', 'teal', 'yellow'];
  P.AID_COLORS = ['aid', 'black', 'blue', 'pink', 'purple', 'teal', 'red', 'yellow'];
  P.CHAIR_COLORS = ['gray', 'black', 'red', 'blue', 'purple', 'pink', 'teal', 'green', 'yellow'];

  /* ---------- the head: face shapes ---------- */
  // sprite: skull rows 2–10 (the same for every shape), then the jaw (rows 11–12) and the neck
  const SKULL = {
    front: [span(12, 15), span(11, 15), span(10, 15), span(10, 15), span(10, 15), span(10, 15), '.........Sssssss', '.........Sssssss', span(10, 15)],
    side:  [span(12, 17), span(11, 18), span(10, 19), span(10, 19), span(10, 19), span(10, 19), '..........sssSssssss', '..........sssSssssss', span(10, 20)],
  };
  // bust: skull rows 7–19, jaw rows 20–24
  const BUST_SKULL = [span(14, 17), span(12, 17), span(11, 17), span(10, 17), span(10, 17), span(10, 17), span(10, 17),
    '.........Sssssssss', '.........SSsssssss', '.........SSsssssss', '.........Sssssssss', span(10, 17), span(10, 17)];
  const face = (id, name, spriteJaw, sideJaw, bustJaw) => ({id, name,
    front: {y: 2, half: SKULL.front.concat(spriteJaw.map(([a]) => span(a, 15)), [span(14, 15)])},
    side:  {y: 2, rows: SKULL.side.concat(sideJaw.map(([a, b]) => span(a, b)), [span(14, 15)])},
    bust:  {y: 7, half: BUST_SKULL.concat(bustJaw.map(a => span(a, 17)), [span(15, 17), span(15, 17), span(15, 17)])}});
  P.FACES = [
    face('round',  'Round',  [[11], [12]], [[11, 18], [12, 17]], [10, 11, 12, 13, 15]),
    face('oval',   'Oval',   [[11], [13]], [[11, 18], [13, 17]], [11, 11, 12, 14, 15]),
    face('square', 'Square', [[10], [11]], [[10, 18], [11, 17]], [10, 10, 11, 12, 14]),
    face('heart',  'Heart',  [[12], [13]], [[12, 18], [13, 17]], [11, 12, 13, 14, 16]),
  ];

  /* ---------- eyes (left eye; the right one is its mirror image) ----------
     sprite front: a 2 × 2 box at x 12–13, rows 8–9; sprite side: 2 × 2 at x 17–18, rows 8–9 (facing right);
     bust: a 3 × 3 box at x 12–14, rows 15–17 */
  P.EYES = [
    {id: 'dot',    name: 'Dot',     front: ['..', '.e'], side: ['..', 'e.'], bust: ['...', '.ee', '.ee']},
    {id: 'bright', name: 'Bright',  front: ['..', 'we'], side: ['..', 'ew'], bust: ['...', '.we', '.ee']},
    {id: 'tall',   name: 'Tall',    front: ['.e', '.e'], side: ['e.', 'e.'], bust: ['.we', '.ee', '.ee']},
    {id: 'lashes', name: 'Lashes',  front: ['K.', '.e'], side: ['.K', 'e.'], bust: ['K..', 'Kee', '.ee']},
    {id: 'wide',   name: 'Wide',    front: ['..', 'we'], side: ['..', 'ew'], bust: ['...', 'wee', 'wee']},
    {id: 'calm',   name: 'Happy',   front: ['..', 'KK'], side: ['..', 'KK'], bust: ['...', '.K.', 'K.K']},
  ];
  /* eyebrows: sprite front x 11–13 rows 6–7 (3 × 2), side x 16–18 rows 6–7, bust x 12–14 rows 13–14 */
  P.BROWS = [
    {id: 'soft',   name: 'Soft',   front: ['...', '.bb'], side: ['...', 'bb.'], bust: ['...', 'bbb']},
    {id: 'thick',  name: 'Thick',  front: ['...', 'bbb'], side: ['...', 'bbb'], bust: ['bbb', 'bbb']},
    {id: 'arched', name: 'Arched', front: ['..b', '.b.'], side: ['b..', '.b.'], bust: ['.bb', 'b..']},
    {id: 'angled', name: 'Determined', front: ['.b.', '..b'], side: ['.b.', 'b..'], bust: ['b..', '.bb']},
  ];
  /* mouths: sprite front x 14–17 rows 10–11; side x 16–18 rows 10–11; bust x 15–20 rows 20–22 */
  P.MOUTHS = [
    {id: 'smile',      name: 'Smile',      front: ['m..m', '.mm.'], side: ['..m', '.m.'], bust: ['m....m', '.mmmm.', '......']},
    {id: 'grin',       name: 'Grin',       front: ['....', 'mttm'], side: ['...', '.tm'], bust: ['mmmmmm', 'mttttm', '.mmmm.']},
    {id: 'laugh',      name: 'Laugh',      front: ['mmmm', '.nn.'], side: ['..m', '.nm'], bust: ['mmmmmm', '.mnnm.', '..mm..']},
    {id: 'determined', name: 'Determined', front: ['....', '.mm.'], side: ['...', '.mm'], bust: ['......', '.mmmm.', '......']},
    {id: 'surprised',  name: 'Surprised',  front: ['.mm.', '.mm.'], side: ['..m', '..m'], bust: ['..mm..', '.mnnm.', '..mm..']},
    {id: 'cool',       name: 'Cool',       front: ['...m', '.mm.'], side: ['..m', '.m.'], bust: ['.....m', '.mmmm.', '......']},
  ];
  P.FRECKLES = {front: {y: 10, half: ['............F...']}, side: {y: 10, rows: ['...............F..']},
    bust: {y: 19, half: ['............F.F...', '.............F....']}};
  P.NOSE = {bust: {y: 19, half: ['.................S']}};

  /* ---------- hair ----------
     front/side/back: the SPRITE (32 × 32); bust: the PORTRAIT (36 × 36). behind: drawn behind the body (long
     hair down the back); for the back view the renderer draws `behind.front` over the body instead. */
  const HAIRS = P.HAIRS = [];
  const hair = (id, name, d) => { HAIRS.push(Object.assign({id, name}, d)); };

  hair('short', 'Short', {
    front: {y: 1, half: ['............hhhh', '..........hhhlhh', '.........hhhhhhh', '.........hhhhHhh', '.........hhhhhhh', '.........hhh....', '.........hh.....']},
    side:  {y: 1, rows: ['...........hhhhh', '.........hhhhlhhhh', '........hhhhhhhhhhh', '........hhhhhHhhhhhh', '........hhhhhhhhhhhh',
                         '.........hhhh', '.........hhh', '.........hhh', '.........hh']},
    backTo: 9,
    bust:  {y: 5, half: ['..............hhhh', '...........hhhhhhh', '.........hhhhhhlhh', '........hhhhhhhhhh', '........hhhhhhhhhh',
                         '........hhhhHhhhhh', '........hhhhhhhhhh', '........hhhh......', '........hhh.......', '.........h........']},
  });
  hair('buzz', 'Buzz cut', {
    front: {y: 2, half: ['............HHHH', '...........HHHHH', '..........HHHHHH', '..........HHHHHH', '..........HH....']},
    side:  {y: 2, rows: ['............HHHHHH', '...........HHHHHHH', '..........HHHHHHHH', '..........HHHHHH', '..........HHHH', '..........HHH', '..........HH']},
    backTo: 9, backCh: 'H',
    bust:  {y: 7, half: ['..............HHHH', '............HHHHHH', '...........HHHHHHH', '..........HHHHHHHH', '..........HHHHHHHH', '..........HHH.....']},
  });
  hair('bald', 'Bald', {});
  hair('long', 'Long', {
    front:  {y: 1, half: ['............hhhh', '..........hhhlhh', '.........hhhhhhh', '........hhhhhhhH', '........hhhhh...', '........hhhh....',
                          '........hhh.....', '........hhh.....', '........hhh.....', '........hhh.....', '........hhh.....', '........hhH.....', '........hhh.....', '........hH......']},
    behind: {front: {y: 12, half: ['........hhh.....', '........hhh.....', '........hhh.....', '........hhH.....', '........hhh.....', '........hhh.....', '........hhh.....', '.........hh.....']},
             side:  {y: 11, rows: ['........hhhh', '........hhhh', '........hhhh', '........hHhh', '........hhhh', '........hhhh', '........hhhh', '........hhhh', '.........hh']}},
    side:   {y: 1, rows: ['...........hhhhh', '.........hhhhlhhhh', '........hhhhhhhhhhh', '........hhhhhhhhhhhh', '........hhhhhhhhhhhh',
                          '........hhhhhh', '........hhhhh', '........hhhhh', '........hhhhh', '........hhhhh', '........hhhhh']},
    backTo: 11,
    bust:   {y: 5, half: ['..............hhhh', '...........hhhhhhh', '.........hhhhhhhhh', '........hhhhhlhhhH', '........hhhhhhhhH.', '.......hhhhhhhhh..',
                          '.......hhhhhh.....', '.......hhhhh......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......',
                          '.......hhhh.......', '.......hHhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......',
                          '.......hhhh.......', '.......hhhH.......']},
    bustBehind: {y: 20, half: ['......hhhhh.......', '......hhhhh.......', '......hhhhh.......', '......hhhhh.......', '......hhhhH.......', '......hhhhh.......',
                               '......hhhhh.......', '......hhhhh.......', '......hhhhh.......', '......hhhhh.......', '......hhhhh.......', '.......hhhh.......',
                               '.......hhhh.......', '........hh........']},
  });
  hair('bob', 'Bob', {
    front: {y: 1, half: ['............hhhh', '..........hhhlhh', '.........hhhhhhh', '........hhhhhhhh', '........hhhhhhhh', '........hhhhlhhh',
                         '........hhh.....', '........hhh.....', '........hhh.....', '........hhh.....', '........hhH.....']},
    side:  {y: 1, rows: ['...........hhhhh', '.........hhhhlhhhh', '........hhhhhhhhhhh', '........hhhhhhhhhhhh', '........hhhhhhhhhhhh', '........hhhhhhhhhhhh',
                         '........hhhhh', '........hhhhh', '........hhhhh', '........hhhhh', '........hhhH']},
    backTo: 11,
    bust:  {y: 5, half: ['..............hhhh', '...........hhhhhhh', '.........hhhhhhhhh', '........hhhhhlhhhh', '........hhhhhhhhhh', '.......hhhhhhhhhhh',
                         '.......hhhhhhhlhhh', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhh.......',
                         '.......hhhh.......', '.......hhhh.......', '.......hhhh.......', '.......hhhH.......', '........hH........']},
  });
  hair('curly', 'Curly', {
    front: {y: 0, half: ['...........h.hh.', '.........hhhhhhh', '........hhHhhHhh', '.......hhhhhlhhh', '.......hHhhHhhHh', '.......hhhhhhhhh',
                         '.......hhHh.h.h.', '.......hhhh.....', '.......hHh......', '.......hhh......', '........hh......', '........h.......']},
    side:  {y: 0, rows: ['..........h.hh.h', '........hhhhhhhhh', '.......hhHhhhHhhh.', '.......hhhhhlhhhhhh', '.......hHhhHhhhHhhh', '.......hhhhhhhhhhhhh',
                         '.......hhHhhhh.h.h', '.......hhhhhh', '.......hHhhh', '.......hhhh', '........hHh', '........hh']},
    backTo: 11,
    bust:  {y: 3, half: ['.............h.hh.', '...........hhhhhhh', '.........hhhHhhhhh', '........hhhhhhHhhh', '.......hhHhhhhlhhh', '......hhhhhHhhhhhh',
                         '......hhHhhhhhHhhh', '......hhhhhhhhhhhh', '......hhhhHh.h.h.h', '......hhHhh.......', '......hhhh........', '......hhHh........',
                         '......hhh.........', '.......hh.........', '.......h..........']},
  });
  hair('afro', 'Coily / afro', {
    front: {y: 0, half: ['.........hhhhhhh', '.......hhhhhlhhh', '......hhhHhhhlhh', '.....hhhhhhhhhhh', '.....hHhhhhHhhhh', '.....hhhhhhhhhhh',
                         '.....hhhHhh.....', '.....hhhhhh.....', '.....hhHhh......', '......hhhh......', '......hhh.......', '.......hh.......']},
    side:  {y: 0, rows: ['........hhhhhhhh', '......hhhhhhlhhhhh', '.....hhhHhhhhhlhhhh', '....hhhhhhhhhhhhhhhh', '....hHhhhhHhhhhhhhhh', '....hhhhhhhhhHhhhhhh',
                         '....hhhHhhhhhhh', '....hhhhhhhhhh', '....hhHhhhhh', '.....hhhhhhh', '.....hhhhhh', '......hhhh']},
    backTo: 11,
    bust:  {y: 0, half: ['...........hhhhhhh', '........hhhhhhhlhh', '......hhhhhhlhhhhh', '.....hhhhHhhhhhhhh', '....hhhhhhhhhhHhhh', '....hhhHhhhhhhhhhh',
                         '...hhhhhhhhhhhhhhh', '...hhhhhhhHhhhhhhh', '...hhHhhhhhhhhhhhh', '...hhhhhhhhhhhHhhh', '...hhhhhHhhhhhhhhh', '...hhhhhhhhh......',
                         '...hhhhHhh........', '...hhhhhhh........', '....hhhhh.........', '....hhHhh.........', '.....hhhh.........', '......hhh.........',
                         '.......h..........']},
  });
  hair('braids', 'Braids', {
    front:  {y: 1, half: ['............hHhh', '..........hhhHhh', '.........hHhhhHh', '.........hhhHhhh', '.........hHhhh..', '........hHh.....',
                          '........Hhh.....', '........hHh.....', '........Hhh.....', '........hHh.....', '........Hhh.....', '........hHh.....', '........Hhh.....']},
    behind: {front: {y: 13, half: ['.......hHh......', '.......Hhh......', '.......hHh......', '.......Hhh......', '.......hHh......', '.......Hhh......', '.......hHh......', '.......Hhh......', '........h.......']},
             side:  {y: 10, rows: ['.......hHhH', '.......HhHh', '.......hHhH', '.......HhHh', '.......hHhH', '.......HhHh', '.......hHhH', '.......HhHh', '.......hHhH', '.......HhHh', '........h.h']}},
    side:   {y: 1, rows: ['...........hHhh', '.........hhhHhhhh', '........hHhhhHhhhh', '........hhhHhhhhHhh', '........hHhhhhHhhhh', '........hhhHhh', '.......hHhHh', '.......HhHh', '.......hHhH']},
    backTo: 10, backTex: 'hH',
    bust:   {y: 5, half: ['..............hHhh', '...........hhhHhhh', '.........hhHhhhhHh', '........hhhhhHhhhh', '........hHhhhhhhhH', '........hhhhHh....',
                          '.......hHhh.......', '.......HhHh.......', '.......hHhH.......', '.......HhHh.......', '.......hHhH.......', '.......HhHh.......',
                          '.......hHhH.......', '.......HhHh.......', '.......hHhH.......', '.......HhHh.......', '.......hHhH.......', '.......HhHh.......',
                          '.......hHhH.......', '.......HhHh.......', '.......hHhH.......', '........h.h.......']},
    bustBehind: {y: 22, half: ['.....hHhH.........', '.....HhHh.........', '.....hHhH.........', '.....HhHh.........', '.....hHhH.........', '.....HhHh.........',
                               '.....hHhH.........', '.....HhHh.........', '.....hHhH.........', '.....HhHh.........', '.....hHhH.........', '......h.h.........']},
  });
  hair('locs', 'Locs', {
    front:  {y: 1, half: ['............hhhh', '..........hhhhhh', '.........hhlhhlh', '.........hhhhhhh', '.........hhhhhhh', '........hlhh.l..',
                          '........hhh.....', '........lhh.....', '........hhh.....', '........hlh.....', '........hhh.....', '........lhh.....']},
    behind: {front: {y: 12, half: ['.......hhlh.....', '.......hhhh.....', '.......lhhl.....', '.......hhhh.....', '.......hlhh.....', '.......hhh......']},
             side:  {y: 10, rows: ['.......hhlhh', '.......hhhhh', '.......lhhlh', '.......hhhhh', '.......hlhhh', '.......hhhhl', '.......hh.hh']}},
    side:   {y: 1, rows: ['...........hhhhh', '.........hhlhhhhh', '........hhhhhlhhhh', '........hhhhhhhhhhh', '........hhlhhhhhhhh', '........hhhhhhh.l',
                          '.......hhhhh', '.......hlhh', '.......hhhh']},
    backTo: 10, backTex: 'hhl',
    bust:   {y: 5, half: ['..............hhhh', '...........hhhhhhh', '.........hhlhhhhlh', '........hhhhhhhhhh', '........hhhhhlhhhh', '.......hhhhhhhhhhh',
                          '.......hlhhh.l..l.', '......hhhhh.......', '......hlhhh.......', '......hhhlh.......', '......hhhhh.......', '......lhhhh.......',
                          '......hhhlh.......', '......hhhhh.......', '......hlhhh.......', '......hhhhh.......', '......hhlhh.......', '.......h.h........']},
    bustBehind: {y: 20, half: ['.....hhhlhh.......', '.....hlhhhh.......', '.....hhhhlh.......', '.....hhlhhh.......', '.....lhhhhh.......', '.....hhhlhh.......',
                               '.....hhhhhh.......', '.....hlhhhh.......', '......h.h.h.......']},
  });
  hair('buns', 'Space buns', {
    front: {y: 0, half: ['........hhh.....', '.......hhhhhhhhh', '.......hHhhhhhhh', '........hhhhhhhh', '.........hhhhhhh', '.........hhhhhhH', '.........hh.....']},
    side:  {y: 0, rows: ['........hhh', '.......hhhhhhhhh', '.......hHhhhhhhhhhh', '........hhhhhhhhhhh', '.........hhhhhhhhhhh', '.........hhhhhhhhhhh', '.........hhhh', '.........hhh', '.........hh']},
    backTo: 9,
    bust:  {y: 1, half: ['.........hhhh.....', '........hhhlhh....', '........hhHhhh....', '........hhhhhh....', '.........hhhhhhhhh', '..........hhhhhhhh',
                         '.........hhhhhhhhh', '........hhhhhhhhhh', '........hhhhhhhhhH', '........hhhhhhhhH.', '........hhhhh.....', '........hhh.......', '.........h........']},
  });
  hair('topbun', 'Top bun', {
    front: {y: 0, half: ['.............hhh', '............hHHh', '..........hhhhhh', '.........hhhhhhh', '.........hhhhhhh', '.........hhhhhhh', '.........hh.....']},
    side:  {y: 0, rows: ['............hhh', '...........hHHhh', '.........hhhhhhhh', '........hhhhhhhhhhh', '........hhhhhhhhhhhh', '........hhhhhh', '.........hhhh', '.........hhh', '.........hh']},
    backTo: 9,
    bust:  {y: 1, half: ['..............hhhh', '.............hhhlh', '.............hHhhh', '..............hhhh', '..............hHHh', '...........hhhhhhh',
                         '.........hhhhhhhhh', '........hhhhhhhhhh', '........hhhhhhhhhh', '........hhhhhhhhhh', '........hhhh......', '........hhh.......', '.........h........']},
  });
  hair('ponytail', 'Ponytail', {
    front:  {y: 1, half: ['............hhhh', '..........hhhlhh', '.........hhhhhhh', '.........hhhhhhh', '.........hhhhhhh', '.........hh.....']},
    behind: {side: {y: 3, rows: ['.......hh', '......hhhh', '.....hhhh', '.....hhhh', '.....hhHh', '.....hhhh', '......hhh', '......hhh', '......hhH', '.......hh', '.......h']},
             back: {y: 8, half: ['..............hh', '..............hh', '.............hhh', '.............hhH', '.............hhh', '..............hh', '..............hh', '...............h']}},
    side:   {y: 1, rows: ['...........hhhhh', '.........hhhhlhhhh', '........hhhhhhhhhhh', '........hhhhhhhhhhhh', '........hhhhhhhhhh', '.........hhhh', '.........hhh', '.........hhh', '.........hh']},
    backTo: 9,
    bust:   {y: 5, half: ['..............hhhh', '...........hhhhhhh', '.........hhhhhhlhh', '........hhhhhhhhhh', '........hhhhhhhhhh', '........hhhhhhhhhh', '........hhhh......', '........hhh.......', '.........h........']},
    bustBehind: {y: 12, x: 25, rows: ['..hh', '.hhhh', '.hhhh', '.hhhh', '.hhHh', '.hhhh', '..hhh', '..hhh', '..hhH', '..hhh', '...hh', '...hh', '...h']},
  });
  hair('spiky', 'Spiky', {
    front: {y: 0, half: ['..........h..h.h', '.........hh.hhhh', '.........hhhhhhh', '........hhhhhlhh', '.........hhHhhhh', '.........hhhhhhh', '.........h.h....']},
    side:  {y: 0, rows: ['........h..h..h', '........hh.hh.hh', '.......hhhhhhhhhhh', '........hhhhhlhhhhh', '........hhhhhHhhhhhh', '........hhhhhhhhh.h.h', '.........hhhh', '.........hhh', '.........hh']},
    backTo: 9,
    bust:  {y: 1, half: ['............h...h.', '...........hh..hh.', '..........hhh.hhhh', '.......h.hhhhhhhhh', '.......hhhhhhhhlhh', '........hhhhhhhhhh', '.......hhhhhhHhhhh',
                         '........hhhhhhhhhh', '........hhhHhhhhhh', '........hhhhhhhhhh', '........hhhhh.h.h.', '........hhh.......', '.........h........']},
  });

  /* ---------- head coverings ---------- */
  P.HEADS = [
    {id: 'none', name: 'Nothing', hides: 'none'},
    // HIJAB: frames the face and covers the neck; drapes over the shoulders. The face is drawn in front of it.
    {id: 'hijab', name: 'Hijab', hides: 'all', neck: false,
     behind: {front: {y: 0, half: ['.........uuuuuuu', '.......uuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu',
                                   '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuu', '.......uuuuuuuuu', '.......uuuuuuuuu',
                                   '........uuuuuuuu', '.........uuuuuuu', '..........uuuuuu']},
              side:  {y: 0, rows: ['.........uuuuuuu', '.......uuuuuuuuuuu', '......uuuuuuuuuuuuu', '......uuuuuuuuuuuuuu', '......uuuuuuuuuuuuuu', '......uuuuuuuuuuuuuu',
                                   '......uuuuuuuuuu', '......uuuuuuuuu', '......uuuuuuuuu', '......uuuuuuuuu', '......uuuuuuuuuu', '......uuuuuuuuuuu', '......uuuuuuuuuuuu',
                                   '.......uuuuuuuuuuuu', '........uuuuuuuuuuu', '.........uuuuuuuuu', '..........uuuuuu']}},
     front: {y: 1, half: ['...........uuuuu', '.........uuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuUUUUUU',
                          '........uuU.....', '........uuU.....', '........uuU.....', '........uuU.....', '........uuuU....', '.........uuuU...', '..........uuuUUU']},
     side:  {y: 1, rows: ['...........uuuuu', '.........uuuuuuuuu', '........uuuuuuuuuuu', '........uuuuuuuuuuuu', '........uuuuuuuuuuuu', '........uuuuuuuUUUUU',
                          '........uuuuuuuU', '........uuuuuuuU', '........uuuuuuuU', '........uuuuuuuU', '........uuuuuuuuU', '.........uuuuuuuuU', '..........uuuuuuuuUU']},
     back:  {y: 1, half: ['...........uuuuu', '.........uuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu',
                          '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '........uuuuuuuu', '.........uuuuuuu', '..........uuuuuu', '...........uuuuu', '............uuuu']},
     bustBehind: {y: 4, half: ['.............uuuuu', '...........uuuuuuu', '.........uuuuuuuuu', '........uuuuuuuuuu', '.......uuuuuuuuuuu', '.......uuuuuuuuuuu',
                               '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu',
                               '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu',
                               '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '......uuuuuuuuuuuu', '.....uuuuuuuuuuuuu', '.....uuuuuuuuuuuuu',
                               '....uuuuuuuuuuuuuu', '....uuuuuuuuuuuuuu', '.....uuuuuuuuuuuuu', '......uuuuuuUuuuuu', '.......uuuuuuUuuuu', '.......uuuuuuuUuuu',
                               '........uuuuuuuUuu', '........uuuuuuuuuu']},
     bust:  {y: 4, half: ['.............uuuuu', '...........uuuuuuu', '.........uuuuuuuuu', '........uuuuuuuuuu', '.......uuuuuuuuuuu', '.......uuuuuuuuuuu',
                          '.......uuuuUUUUUUU', '.......uuuU.......', '.......uuuU.......', '.......uuuU.......', '.......uuuU.......', '.......uuuU.......', '.......uuuU.......',
                          '.......uuuU.......', '.......uuuU.......', '.......uuuU.......', '.......uuuuU......', '.......uuuuuU.....', '........uuuuuU....',
                          '.........uuuuuUUUU', '..........uuuuuuuu']}},
    {id: 'headwrap', name: 'Headwrap', hides: 'top', clip: {front: 6, side: 6, back: 6, bust: 12},
     front: {y: 0, half: ['..............uu', '..........uuuuUu', '.........uuuuUuu', '........uuuuuuUu', '........uuuuuuuU', '........uuuuuuuu', '.........UUUUUUU']},
     side:  {y: 0, rows: ['..............uu', '..........uuuuUuUu', '.........uuuuuuUuu', '........uuuuuuuuuUu', '........uuuuuuuuuuuU', '........uuuuuuuuuuuu', '.........UUUUUUUUUUU']},
     back:  {y: 0, half: ['................', '..........uuuuuu', '.........uuuuuuu', '........uuuuUuuu', '........uuuuuUuu', '........uuuuuuuu', '.........UUUUUUU']},
     bust:  {y: 1, half: ['...............uu.', '..............uUuu', '...........uuuuUuu', '.........uuuuuuuUu', '........uuuuuuuuuU', '........uuuuuuUUuu', '........uuuuuUuuuu',
                          '........uuuuuuUuuU', '........uuuuuuuUUu', '........uuuuuuuuuu', '.........UUUUUUUUU']}},
    {id: 'turban', name: 'Turban', hides: 'all',
     front: {y: 0, half: ['...........uuuuu', '.........uuuuuuu', '........uUuuuuuu', '........uuUuuuuu', '........uuuUuuuu', '........uuuuUuuu', '.........uuuuUUU']},
     side:  {y: 0, rows: ['..........uuuuuu', '........uuuuuuuuuu', '.......uUuuuuuuuuuu', '.......uuUuuuuuuuuuu', '.......uuuUUuuuuuuuu', '........uuuuUUuuuuuu', '.........uuuuuUUUUU', '..........uuu']},
     back:  {y: 0, half: ['...........uuuuu', '.........uuuuuuu', '........uUuuuuuu', '........uuUuuuuu', '........uuuUuuuu', '........uuuuUUUU', '.........uuuuuuu', '..........uuuuuu']},
     bust:  {y: 1, half: ['.............uuuuu', '...........uuuuuuu', '.........uuuuuuuuu', '........uuuuUuuuuu', '.......uuuuuuUuuuu', '.......uuuuuuuUuuu', '.......uUuuuuuuUuu',
                          '.......uuUuuuuuuUu', '.......uuuUuuuuuuU', '.......uuuuUuuuuuu', '........uuuuUUuuuu', '.........uuuuuuUUU']}},
    {id: 'beanie', name: 'Beanie', hides: 'top', clip: {front: 6, side: 6, back: 6, bust: 12},
     front: {y: 0, half: ['..............jj', '...........uuuuu', '.........uuUuuUu', '........uuUuuUuu', '........uuuuuuuu', '........UUUUUUUU', '........UuUuUuUu']},
     side:  {y: 0, rows: ['............jj', '..........uuuuuuu', '.........uuUuuUuuu', '........uuUuuUuuUuu', '........uuuuuuuuuuuu', '........UUUUUUUUUUUU', '........UuUuUuUuUuUu']},
     bust:  {y: 2, half: ['................jj', '..............jjjj', '............uuuuuu', '..........uuuuuuuu', '.........uuuUuuuUu', '........uuuUuuuUuu', '........uuUuuuUuuu',
                          '.......uuuuuuuuuuu', '.......UUUUUUUUUUU', '.......UuUuUuUuUuU']}},
    {id: 'cap', name: 'Ball cap', hides: 'top', clip: {front: 5, side: 5, back: 5, bust: 11},
     front: {y: 1, half: ['............uuuu', '..........uuuuuu', '.........uuuuujj', '.........uuuuuuu', '........UUUUUUUU']},
     side:  {y: 1, rows: ['...........uuuuu', '.........uuuuuujjj', '........uuuuuuuuuuu', '........uuuuuuuuuuuu', '........uuuuuuuuuuuUUUU']},
     back:  {y: 1, half: ['............uuuu', '..........uuuuuu', '.........uuuuuuu', '.........uuuuuuu', '.........uuuU..U']},
     bust:  {y: 3, half: ['...............uuu', '............uuuuuu', '..........uuuuuuuu', '.........uuuuuuuuu', '........uuuujjuuuu', '........uuuujjjuuu',
                          '........uuuuuuuuuu', '........uuuuuuuuuu', '.......UUUUUUUUUUU', '........UUUUUUUUUU']}},
    // a marching band shako: tall, a gold band, a black visor and a white plume
    {id: 'shako', name: 'Band shako', hides: 'top', clip: {front: 7, side: 7, back: 7, bust: 14},
     front: {y: 0, half: ['..........uuuuWW', '..........uuuuuj', '..........uuuugg', '..........uuuuuu', '..........uuuuuu', '..........gggggg', '.........KKKKKKK']},
     side:  {y: 0, rows: ['..........uuuuuWW', '..........uuuuuuuj', '..........uuuuuuug', '..........uuuuuuuu', '..........uuuuuuuu', '..........gggggggg', '..........KKKKKKKKKK']},
     back:  {y: 0, half: ['..........uuuuuu', '..........uuuuuu', '..........uuuuuu', '..........uuuuuu', '..........uuuuuu', '..........gggggg', '..........uuuuuu']},
     bust:  {y: 0, half: ['................WW', '...............WWW', '...............jjj', '..........uuuuuuuu', '..........uuuuuuuu', '..........uuuuuugg',
                          '..........uuuuuggg', '..........uuuuuugg', '..........uuuuuuuu', '..........gggggggg', '..........uuuuuuuu', '.........KKKKKKKKK',
                          '..........KKKKKKKK', '..........g.......', '..........g.......']}},
    {id: 'headphones', name: 'Headphones', hides: 'none',
     front: {y: 0, half: ['..........UUUUUU', '.........U......', '........U.......', '........U.......', '........U.......', '.......uu.......', '.......uu.......', '.......uu.......', '.......uu.......']},
     side:  {y: 0, rows: ['..........UUUUUU', '.........U......U', '.........U.......U', '..........U......U', '...........U.....U', '...........U....U', '...........Uu', '...........uuu', '...........uuu', '...........uuu', '............u']},
     back:  {y: 0, half: ['..........UUUUUU', '.........U......', '........U.......', '........U.......', '........U.......', '.......uu.......', '.......uu.......', '.......uu.......', '.......uu.......']},
     bust:  {y: 3, half: ['...........UUUUUUU', '.........UU.......', '........U.........', '.......U..........', '.......U..........', '.......U..........', '.......U..........',
                          '......uuu.........', '.....uuuu.........', '.....uuuu.........', '.....uuuu.........', '.....uuuu.........', '.....uuuu.........', '......uuu.........']}},
  ];

  /* ---------- clothes ----------
     TOPS: sleeve = how far down the arm the sleeve reaches (sprite arms: 0.35 short, 1 long); base: 'black' = always
     black (concert black: the color choice is the bow tie). front/side/back: the sprite torso (rows 13–21);
     bust: the shoulders (rows 25–35); behind: drawn behind the head (a hood). */
  const T = (x0, x1, ch = 'c') => span(x0, x1, ch);
  const torsoF = rows => ({y: 14, half: rows.concat(Array(7 - rows.length).fill(T(11, 15)))});
  const torsoS = rows => ({y: 14, rows: rows.concat(Array(7 - rows.length).fill(T(12, 18)))});
  P.TOPS = [
    {id: 'tee', name: 'Band T-shirt', sleeve: 0.35,
     front: torsoF(['...........cccCC', T(11, 15), '...........ccccd', '...........cccdd']), side: torsoS([]), back: torsoF([])},
    {id: 'hoodie', name: 'Hoodie', sleeve: 1,
     front: torsoF(['...........ccCCC', '...........cccWc', '...........cccWc', T(11, 15), T(11, 15), '...........cCCCC']),
     side: torsoS(['...........CCccccc']), back: {y: 13, half: ['............CCCC', '...........CCCCC', '...........cCCCc', T(11, 15), T(11, 15), T(11, 15), T(11, 15), T(11, 15)]},
     behind: {front: {y: 12, half: ['...........CCCCC', '...........CCCCC']}}},
    {id: 'marching', name: 'Marching jacket', sleeve: 1,
     front: {y: 13, half: ['..............cc', '...........ggccC', '...........cccgC', '...........ccccC', '...........cccgC', '...........ccccC', '...........cccgC', '...........ccccC']},
     side: {y: 13, rows: ['..............ccc', '............ggcccc', '............cccccg', '............cccccc', '............cccccg', '............cccccc', '............cccccg', '............cccccc']},
     back: {y: 13, half: ['..............cc', '...........ggccc', T(11, 15), T(11, 15), '...........CCCCC', T(11, 15), T(11, 15), T(11, 15)]}},
    {id: 'concert', name: 'Concert black', sleeve: 1, base: 'black',
     front: {y: 14, half: ['...........KKKdW', '...........KKKKW', '...........KKKKW', '...........KKKKK', '...........KKKKK', '...........KKKKK', '...........KKKKK']},
     side: {y: 14, rows: ['............KKKKKdW', '............KKKKKKW', '............KKKKKKK', '............KKKKKKK', '............KKKKKKK', '............KKKKKKK', '............KKKKKKK']},
     back: {y: 14, half: Array(7).fill('...........KKKKK')}},
    {id: 'polo', name: 'Polo', sleeve: 0.35,
     front: torsoF(['...........cCCCs', '...........ccccC', '...........ccccC']), side: torsoS(['............ccccCC']), back: torsoF(['...........cCCCC'])},
    {id: 'jersey', name: 'Jersey', sleeve: 0.35,
     front: torsoF(['...........cccds', '...........ccccd', T(11, 15), '...........ccccd', '...........ccccd', '...........ccccd']),
     side: torsoS(['............ccccccd']), back: torsoF([T(11, 15), T(11, 15), '...........ccccd', '...........cccdd', '...........ccccd', '...........ccccd'])},
  ];
  // the busts (written out in full: the shoulders need the neckline, collar and details)
  const B = {
    tee: ['..........ccccCsss', '.......ccccccCCCCC', '.....ccccccccccccc', '....cccccccccccccc', '...ccccccccccccccc', '...ccccccccccccccc', '...ccccccccccccccc',
          '...ccccccccccccccc', '...ccccccccccccccc'],
    hoodie: ['.........ccccCCsss', '......ccccccccCCCC', '.....ccccccccccWcc', '....cccccccccccWcc', '...ccccccccccccWcc', '...ccccccccccccWcc',
             '...ccccccccccccccc', '...cccccccCCCCCCCC', '...ccccccccccccccc'],
    marching: ['.........ccccccccc', '........gggcccccgC', '......ggggccccccgC', '.....cgggcccccccCC', '....cccccccccccgcC', '...ccccccccccccccC',
               '...cccccccccccgccC', '...ccccccccccccccC', '...cccccccccccgccC'],
    concert: ['.........KKKKKWWss', '......KKKKKKKKWWdd', '.....KKKKKKKKKKWWd', '....KKKKKKKKKKKKWW', '...KKKKKKKKKKKKKWW', '...KKKKKKKKKKKKKKW',
              '...KKKKKKKKKKKKKKW', '...KKKKKKKKKKKKKKW', '...KKKKKKKKKKKKKKW'],
    polo: ['..........ccCCCsss', '.......ccccccCCCsC', '.....ccccccccccccW', '....cccccccccccccC', '...ccccccccccccccW', '...ccccccccccccccc',
           '...ccccccccccccccc', '...ccccccccccccccc', '...ccccccccccccccc'],
    jersey: ['..........ccccdsss', '.......ccccccccdss', '.....ccccccccccdds', '....ddccccccccccdd', '...cddcccccccccccc', '...ccccccccccccccd',
             '...ccccccccccccccd', '...ccccccccccccccd', '...ccccccccccccccd'],
  };
  const BUST_BEHIND = {hoodie: {y: 21, half: ['..........CCCCCCCC', '.........CCCCCCCCC', '.........CCCCCCCCC', '.........CCCCCCCCC', '.........CCCCCCCCC', '.........CCCCCCCCC']},
    marching: {y: 25, half: ['..............gggg']}};
  // the band tee's graphic: a music note on the chest (full rows, x 16)
  const NOTE = {y: 30, x: 17, rows: ['..dd', '..d.', '..d.', 'ddd.', 'dd..']};
  P.TOPS.forEach(t => {
    t.bust = {y: 27, half: B[t.id]};
    if (BUST_BEHIND[t.id]) t.bustBehind = BUST_BEHIND[t.id];
    if (t.id === 'marching') t.bustTop = {y: 25, half: ['..............gggg', '..............cccc']};
    if (t.id === 'tee') t.bustDetail = NOTE;
  });

  /* BOTTOMS (sprite legs; the bust doesn't show them): legs = 'long' | 'shorts' (thighs only) | 'skirt' (flared,
     then bare legs); cuff = a darker last row (joggers) */
  P.BOTTOMS = [
    {id: 'jeans',   name: 'Jeans',   legs: 'long'},
    {id: 'joggers', name: 'Joggers', legs: 'long', cuff: true},
    {id: 'shorts',  name: 'Shorts',  legs: 'shorts'},
    {id: 'skirt',   name: 'Skirt',   legs: 'skirt'},
  ];
  /* SHOES: rows = how tall (2 = sneakers, 3 = high-tops and boots); sole = a lighter bottom row */
  P.SHOES = [
    {id: 'sneakers', name: 'Sneakers',  rows: 2, sole: true},
    {id: 'hightops', name: 'High-tops', rows: 3, sole: true},
    {id: 'boots',    name: 'Boots',     rows: 3, sole: false},
  ];

  /* ---------- extras ---------- */
  P.GLASSES = [
    {id: 'none', name: 'No glasses'},
    {id: 'round', name: 'Round',
     front: {y: 8, half: ['............xx..', '...........x..xx']}, side: {y: 8, rows: ['...............xxx', '.............xxx..x']},
     bust: {y: 14, half: ['............xxx...', '...........x...x..', '.........xxx...xxx', '...........x...x..', '............xxx...']}},
    {id: 'square', name: 'Square',
     front: {y: 8, half: ['...........xxxx.', '...........x..xx']}, side: {y: 8, rows: ['...............xxxx', '.............xxx..x']},
     bust: {y: 14, half: ['...........xxxxx..', '...........x...x..', '.........xxx...xxx', '...........x...x..', '...........xxxxx..']}},
    {id: 'bold', name: 'Bold',
     front: {y: 8, half: ['..........xxxxx.', '...........x..xx']}, side: {y: 8, rows: ['..............xxxxx', '.............xxx..x']},
     bust: {y: 13, half: ['..........xxxxxx..', '..........xxxxxx..', '.........xx....xxx', '...........x...x..', '...........x...x..', '............xxx...']}},
  ];
  // hearing aids: `side` 'left' / 'right' / 'both' = the student's own ears (their left ear is on your right)
  P.AIDS = [{id: 'none', name: 'None'}, {id: 'right', name: 'Right ear'}, {id: 'left', name: 'Left ear'}, {id: 'both', name: 'Both ears'}];
  P.AID = {front: {y: 7, x: 8, rows: ['a', 'a']}, side: {y: 7, x: 12, rows: ['a', 'a']}, bust: {y: 12, x: 7, rows: ['.a', 'aa', 'aa', 'a.']}};

  /* ---------- the accessory skins (shared/skins.js), drawn as things the avatar wears ----------
     over: drawn over everything on the head; behind: behind the body (the Cape); hides: 'top' = like a cap */
  P.ACCESSORIES = {
    headband: {front: {y: 5, half: ['.........1111111']}, side: {y: 5, rows: ['.......2.111111111111', '......22']}, back: {y: 5, half: ['.........1111111']},
               bust: {y: 11, half: ['........1111111111', '........2222222222'], after: {y: 11, x: 27, rows: ['.22', '2.2', '2..2']}}},
    shades:   {front: {y: 8, half: ['...........66666', '...........88886']}, side: {y: 8, rows: ['..............66666', '..............8886']},
               bust: {y: 14, half: ['..........66666666', '..........68888866', '..........688988..', '..........688886..', '...........6666...']}},
    visor:    {front: {y: 8, half: ['..........000000', '..........666666']}, side: {y: 8, rows: ['..............000000', '..............66666']},
               bust: {y: 14, half: ['.........000000000', '........0000000000', '........6666666666', '.........666666666']}},
    mask:     {front: {y: 8, half: ['.........8888888', '.........88998888', '.........8888888'].map(r => r.slice(0, 16))}, side: {y: 8, rows: ['..........88888888', '..........888889', '..........88888888']},
               bust: {y: 14, half: ['.........777777777', '........8888888888', '........8889998888', '........8889988888', '........8888888888', '.........777777777']}},
    crown:    {hides: 'crown', front: {y: 0, half: ['..........3..3.3', '..........333333']}, side: {y: 0, rows: ['..........3..3..3', '..........33333333']},
               back: {y: 0, half: ['..........3..3.3', '..........333333']},
               bust: {y: 1, half: ['..........3...3..3', '..........33.333.3', '..........33333333', '..........35336333', '..........33333333']}},
    helmet:   {hides: 'top', clip: {front: 7, side: 7, back: 7, bust: 14},
               front: {y: 0, half: ['...........55554', '.........5555554', '........55555554', '........55555554', '........55555554', '........55555554', '........66666666']},
               side:  {y: 0, rows: ['...........55554', '.........555555545', '........5555555555', '........55555555555', '........555555555555', '........555555555555', '........55555566666']},
               back:  {y: 0, half: ['...........55554', '.........5555554', '........55555554', '........55555554', '........55555554', '........55555554', '........55555554']},
               bust:  {y: 2, half: ['.............55554', '...........5555554', '.........555555554', '........5555555554', '.......55555555554', '.......55555555554',
                                     '.......55555555554', '.......55555555554', '.......55555555554', '.......88888888888', '.......86666666666', '.......8888888888.']}},
    baton:    {front: {y: 0, x: 20, rows: ['...3', '..9', '.9', '4']}, side: {y: 0, x: 8, rows: ['3', '.9', '..9', '...4']}, back: {y: 0, x: 8, rows: ['3', '.9', '..9', '...4']},
               bust: {y: 0, x: 24, rows: ['......3', '.....939', '.....93', '....9.', '...9', '..9', '.44', '44']}},
    cape:     {behind: {front: {y: 14, half: ['.........1111111', '........11111111', '........11111111', '........71111111', '........71111111', '.......771111111', '.......771111111', '.......777711111']},
                        side:  {y: 14, rows: ['.........1111', '........11111', '.......111111', '......1111111', '......7111111', '.....77111111', '.....77711111', '.....777711111', '.....7777']},
                        back:  {y: 13, half: ['............1111', '..........111111', '.........1111111', '.........1111111', '........11111111', '........11111111', '........71111111',
                                               '........71111111', '.......771111111', '.......771111111', '.......777111111']}},
               front: {y: 14, half: ['..............3.']}, bust: {y: 27, half: ['................3.']},
               bustBehind: {y: 26, half: ['.......111111111..', '....11111111111111', '..1111111111111111', '.11111111111111111', '.11111111111111111', '.71111111111111111',
                                          '.71111111111111111', '.77111111111111111', '.77711111111111111', '.77711111111111111']}},
  };
  // the accessory palette: digits 1–0 -> theme tokens
  P.ACC_COLORS = {1: 'red', 2: 'red-hi', 3: 'yellow', 4: 'amber', 5: 'pink', 6: 'cyan', 7: 'purple', 8: 'deep', 9: 'white-hi', 0: 'cyan-hi'};

  /* ---------- the wheelchair (sprite only), drawn under the seated legs ----------
     spokes: the wheel's frames while rolling (the renderer turns them as the student moves) */
  P.CHAIR = {
    side: {y: 13, rows: ['..........vv', '..........vv', '..........vv', '..........vv', '..........vv', '..........vv', '..........vv', '..........vv',
                         '..........vvvvvvvvvv', '..........vv......v', '..........v.......v', '..........v......vvvv', '......................', '.......................v',
                         '................vvvvvvvv', '..................VV.VV']},
    wheelSide: {cx: 13, cy: 24, r: 6},
    front: {y: 12, half: ['..........v.....', '..........v.....', '..........v.....', '.......VV.......', '......VrV.......', '......VrV.......', '......VrV.......',
                          '......VrV.......', '......VrV.......', '......VrV.......', '......VrV.......', '......VrV.......', '......VrV.......', '......VrV.......',
                          '......VrV.......', '.......VV.......', '................', '..........vvvvvv']},
    back: {y: 12, half: ['..........vv....', '..........vv....', '..........vvvvvv', '.......VVvvvvvvv', '......VrVvvvvvvv', '......VrVvvvvvvv', '......VrVvvvvvvv',
                         '......VrVvvvvvvv', '......VrVvvvvvvv', '......VrVvvvvvvv', '......VrVvvvvvvv', '......VrV.......', '......VrV.......', '......VrV.......',
                         '......VrV.......', '.......VV.......']},
  };
})(window.AVATAR_PARTS);
