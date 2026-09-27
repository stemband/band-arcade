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
    {id: 'teal', name: 'Teal'}, {id: 'green', name: 'Green'}, {id: 'orange', name: 'Orange'},
    {id: 'cherry', name: 'Cherry red'}, {id: 'magenta', name: 'Magenta'}, {id: 'lavender', name: 'Lavender'}, {id: 'sky', name: 'Sky blue'},
    {id: 'mint', name: 'Mint'}, {id: 'sunny', name: 'Sunny yellow'}];
  P.EYE_COLORS = [{id: 'darkbrown', name: 'Dark brown'}, {id: 'brown', name: 'Brown'}, {id: 'hazel', name: 'Hazel'}, {id: 'green', name: 'Green'},
    {id: 'blue', name: 'Blue'}, {id: 'gray', name: 'Gray'}, {id: 'amber', name: 'Amber'}];
  // clothes, head coverings, shoes, glasses, hearing aids and the wheelchair all pick from this list
  P.COLORS = [
    {id: 'red', name: 'Red'}, {id: 'orange', name: 'Orange'}, {id: 'yellow', name: 'Yellow'}, {id: 'green', name: 'Green'}, {id: 'teal', name: 'Teal'},
    {id: 'blue', name: 'Blue'}, {id: 'navy', name: 'Navy'}, {id: 'purple', name: 'Purple'}, {id: 'pink', name: 'Pink'}, {id: 'maroon', name: 'Maroon'},
    {id: 'forest', name: 'Forest green'}, {id: 'black', name: 'Black'}, {id: 'gray', name: 'Gray'}, {id: 'white', name: 'White'},
    {id: 'denim', name: 'Denim'}, {id: 'khaki', name: 'Khaki'}, {id: 'tan', name: 'Tan'},
    {id: 'lavender', name: 'Lavender'}, {id: 'mint', name: 'Mint'}, {id: 'coral', name: 'Coral'}, {id: 'mustard', name: 'Mustard'},
    {id: 'cream', name: 'Cream'}, {id: 'brown', name: 'Brown'}, {id: 'sky', name: 'Sky blue'}, {id: 'olive', name: 'Olive'}];
  P.BOTTOM_COLORS = ['denim', 'black', 'khaki', 'gray', 'navy', 'maroon', 'forest', 'tan', 'purple', 'red', 'brown', 'olive', 'cream', 'pink', 'sky'];
  P.SHOE_COLORS = ['white', 'black', 'red', 'blue', 'pink', 'green', 'yellow', 'purple', 'tan', 'brown', 'teal', 'orange'];
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

  /* ---------- MORE FREE CHOICES: expressions, freckle styles, face paint ---------- */
  P.EYES.push(
    {id: 'confident', name: 'Confident', front: ['..', 'Ke'], side: ['..', 'eK'], bust: ['...', 'KKK', '.ee']},
    {id: 'focused',   name: 'Determined', front: ['.K', '.e'], side: ['K.', 'e.'], bust: ['K..', '.KK', '.ee']},
    // the right eye is drawn the same way round (not mirrored): both look to the side
    {id: 'glance',    name: 'Cool glance', front: ['..', 'we'], frontR: ['..', 'we'], side: ['..', 'ew'], bust: ['...', 'wwe', 'wwe'], bustR: ['...', 'wwe', 'wwe']},
    {id: 'cheerful',  name: 'Cheerful', front: ['..', 'ee'], side: ['..', 'ee'], bust: ['.ww', 'wee', 'eee']});
  P.BROWS.push({id: 'raised', name: 'Raised', front: ['.bb', '...'], side: ['bb.', '...'], bust: ['bbb', '...']});
  P.MOUTHS.push(
    {id: 'smirk', name: 'Smirk', front: ['...m', '.mm.'], side: ['..m', '.m.'], bust: ['.....m', '..mmm.', '......']},
    {id: 'beam',  name: 'Big smile', front: ['mmmm', '.nn.'], side: ['..m', '.nm'], bust: ['m....m', 'mmmmmm', '.mnnm.']});
  // freckles: false = none, true = the classic ones (P.FRECKLES above), or one of these styles
  P.FRECKLE_STYLES = [
    {id: false, name: 'No freckles'}, {id: true, name: 'Freckles'},
    {id: 'cheeks', name: 'Cheek freckles', front: {y: 10, half: ['...........F.F..']}, side: {y: 10, rows: ['..............F.F.']},
     bust: {y: 18, half: ['...........F.F....', '............F.F...', '...........F......']}},
    {id: 'nose', name: 'Nose freckles', front: {y: 10, half: ['..............F.']}, side: {y: 9, rows: ['.................F']},
     bust: {y: 18, half: ['...............F.F', '..............F.F.']}},
    {id: 'dusting', name: 'Lots of freckles', front: {y: 10, half: ['...........F.F.F']}, side: {y: 10, rows: ['.............F.F.F']},
     bust: {y: 17, half: ['..........F.......', '...........F.F.F..', '..........F..F..F.', '............F.F...']}},
  ];
  // face paint (the color is paintColor: letter T)
  P.PAINTS = [
    {id: 'none', name: 'No face paint'},
    {id: 'stripes', name: 'Stripes', front: {y: 10, half: ['............TT..']}, side: {y: 10, rows: ['................TT']},
     bust: {y: 18, half: ['............TTT...', '..................', '............TTT...']}},
    {id: 'bolt', name: 'Lightning bolt', front: {y: 10, x: 19, rows: ['T', 'T']}, side: {y: 10, x: 17, rows: ['T', 'T']},
     bust: {y: 17, x: 21, rows: ['..T', '.T.', 'TTT', '.T.', 'T..']}},
    {id: 'star', name: 'Star', front: {y: 10, x: 19, rows: ['T']}, side: {y: 10, x: 17, rows: ['T']},
     bust: {y: 18, x: 21, rows: ['.T.', 'TTT', '.T.']}},
  ];
  P.PAINT_COLORS = ['black', 'red', 'blue', 'yellow', 'pink', 'white', 'teal', 'purple', 'orange', 'green'];


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


  /* ---------- MORE HAIR (free: every texture and protective style is free, like all hair) ----------
     Drawn with the little shape kit below instead of typed rows: kit(width, height) gives a blank grid, then
     disc (a round shape), spans (rows of [x0, x1]), px (one pixel) paint it, sym() mirrors the left half onto the
     right, and map(y) turns it into an ordinary {y, rows} map. Textures are functions (x, y) -> letter:
     coil (tight coils: h with H and l dots), twist (diagonal twists), rowsTex (cornrows: parting lines), wave. */
  const kit = (w, h = 36) => {
    const g = Array.from({length: h}, () => Array(w).fill('.'));
    const k = {
      px(x, y, ch) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = typeof ch === 'function' ? ch(x, y) : ch; return k; },
      disc(cx, cy, r, ch) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * .5) k.px(x, y, ch); return k; },
      spans(y0, list, ch) { list.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) k.px(x, y0 + i, ch); }); return k; },
      clear(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) k.px(x, y, '.'); return k; },
      sym() { g.forEach(r => { for (let x = 0; x < w / 2; x++) if (r[x] !== '.') r[w - 1 - x] = r[x]; }); return k; },
      map() { return {y: 0, rows: g.map(r => r.join('').replace(/\.+$/, ''))}; },
    };
    return k;
  };
  const coil = (x, y) => ((x * 7 + y * 5) % 9 === 0 ? 'l' : (x + y * 2) % 5 === 0 ? 'H' : 'h');
  const twist = (x, y) => ((x + y) % 3 === 0 ? 'H' : 'h');
  const rowsTex = (x, y) => (x % 3 === 2 ? 'S' : y % 2 ? 'H' : 'h');
  const sideRows = (x, y) => (y % 3 === 2 ? 'S' : x % 2 ? 'H' : 'h');
  const wave = (x, y) => ((x + (y >> 1)) % 4 === 0 ? 'H' : 'h');
  /** a copy of a map with every hair pixel re-textured (h/H/l -> tex(x, y)) */
  const retex = (m, tex) => m && Object.assign({}, m, {[m.half ? 'half' : 'rows']: (m.half || m.rows).map((r, y) =>
    [...r].map((ch, x) => ('hHl'.includes(ch) ? tex(x + (m.x || 0), y + (m.y || 0)) : ch)).join(''))});
  const retexHair = (h, tex) => {
    const o = {};
    ['front', 'side', 'back', 'bust', 'bustBehind'].forEach(k => { if (h[k]) o[k] = retex(h[k], tex); });
    if (h.behind) o.behind = Object.fromEntries(Object.entries(h.behind).map(([v, m]) => [v, retex(m, tex)]));
    return Object.assign({}, h, o);
  };
  const byHair = id => HAIRS.find(x => x.id === id);
  const shape = o => { const c = Object.assign({}, o); delete c.id; delete c.name; return c; };   // a style's maps without its id and name
  // the close caps every short style starts from (the head's own outline, a pixel of volume)
  const CAP = {front: [[12, 19], [11, 20], [10, 21], [10, 21], [10, 21]], side: [[11, 16], [10, 18], [9, 18], [9, 19], [9, 19]],
    bust: [[14, 21], [12, 23], [10, 25], [9, 26], [9, 26], [9, 26], [9, 26]]};

  // AFRO PUFFS: pulled back, two round puffs
  hair('puffs', 'Afro puffs', {
    front: kit(32).spans(1, CAP.front, twist).spans(6, [[10, 10], [10, 10]], 'h').disc(7, 2.5, 2.8, coil).sym().map(),
    side:  kit(32).disc(7.5, 2.5, 2.8, coil).spans(1, CAP.side, twist).spans(6, [[9, 11], [9, 10], [9, 10]], 'h').map(),
    back:  kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], twist).disc(7, 2.5, 2.8, coil).sym().map(),
    bust:  kit(36).spans(5, CAP.bust, twist).spans(12, [[9, 10], [9, 10], [9, 9]], 'h').disc(5.5, 6, 5, coil).px(10, 8, 'H').sym().map(),
  });
  // HIGH PUFF: one big puff on top
  hair('highpuff', 'High puff', {
    front: kit(32).spans(2, CAP.front.slice(1), twist).spans(6, [[10, 10], [10, 10]], 'h').sym().disc(15.5, 1.5, 3.2, coil).map(),
    side:  kit(32).spans(2, CAP.side.slice(1), twist).spans(6, [[9, 11], [9, 10]], 'h').disc(12, 1.5, 3.2, coil).map(),
    back:  kit(32).spans(2, [[11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], twist).disc(15.5, 1.5, 3.2, coil).map(),
    bust:  kit(36).spans(6, CAP.bust.slice(1), twist).spans(12, [[9, 10], [9, 10], [9, 9]], 'h').sym().disc(17.5, 4.5, 5.5, coil).map(),
  });
  // CORNROWS: close braids from front to back (the parting lines show the scalp)
  hair('cornrows', 'Cornrows', {
    front: kit(32).spans(1, CAP.front, rowsTex).map(),
    side:  kit(32).spans(1, CAP.side, sideRows).spans(6, [[9, 10], [9, 10]], sideRows).map(),
    back:  kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20], [12, 19]], rowsTex)
      .spans(11, [[13, 13], [13, 13], [13, 13]], 'h').spans(11, [[18, 18], [18, 18], [18, 18]], 'h').map(),
    bust:  kit(36).spans(5, CAP.bust, rowsTex).map(),
  });
  // HIGH-TOP FADE: a tall flat top, the sides faded short
  hair('fade', 'High-top fade', {
    front: kit(32).spans(0, [[11, 20], [11, 20], [11, 20], [11, 20], [11, 20]], coil).spans(1, [[12, 19]], 'l').spans(5, [[9, 11], [9, 10], [9, 9]], 'H').sym().map(),
    side:  kit(32).spans(0, [[10, 18], [10, 18], [10, 18], [10, 18], [10, 18]], coil).spans(5, [[9, 12], [9, 11], [9, 11], [9, 10]], 'H').map(),
    back:  kit(32).spans(0, [[11, 20], [11, 20], [11, 20], [11, 20], [11, 20]], coil).spans(5, [[10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], 'H').map(),
    bust:  kit(36).spans(0, Array(11).fill([11, 24]), coil).spans(1, [[12, 23]], 'l').spans(9, [[9, 10], [9, 10], [9, 10], [9, 9], [9, 9]], 'H').sym().map(),
  });
  // BANTU KNOTS: small coiled knots all over
  const knots = (k, list, r) => { list.forEach(([x, y]) => { k.disc(x, y, r, 'H').disc(x - .2, y - .2, r - .9, 'h').px(x - r / 3, y - r / 3, 'l'); }); return k; };
  const scalpRows = (x, y) => (x % 3 === 2 ? 'S' : 'H');
  hair('bantu', 'Bantu knots', {
    front: knots(kit(32).spans(2, CAP.front.slice(1), scalpRows), [[11, 2], [15.5, 1], [20, 2]], 1.4).map(),
    side:  knots(kit(32).spans(2, CAP.side.slice(1), (x, y) => (y % 3 === 2 ? 'S' : 'H')), [[10, 2.5], [14, 1]], 1.4).map(),
    back:  knots(kit(32).spans(2, [[11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], scalpRows), [[11, 2], [15.5, 1], [20, 2], [12, 6], [19, 6]], 1.4).map(),
    bust:  knots(kit(36).spans(6, CAP.bust.slice(1), scalpRows), [[10, 8.5], [13.5, 5], [17.5, 3.5], [21.5, 5], [25, 8.5]], 2.3).map(),
  });
  // PIXIE: short, with a fringe swept to one side
  hair('pixie', 'Pixie cut', {
    front: kit(32).spans(1, [[12, 19], [10, 21], [10, 21], [10, 21], [10, 21], [10, 16], [10, 12]], 'h').px(21, 6, 'h').px(13, 3, 'l').px(12, 4, 'l').map(),
    side:  kit(32).spans(1, [[11, 16], [9, 18], [8, 19], [8, 19], [8, 20], [9, 12], [9, 11], [9, 10]], 'h').px(15, 3, 'l').map(),
    backTo: 9,
    bust:  kit(36).spans(5, [[15, 22], [12, 24], [10, 25], [9, 26], [9, 26], [9, 26], [9, 26], [9, 18], [9, 14], [9, 10]], 'h').spans(12, [[25, 26], [26, 26]], 'h')
      .px(13, 8, 'l').px(12, 9, 'l').px(14, 9, 'l').px(20, 7, 'H').map(),
  });
  // SIDE PART: neat, with a part line and more volume on one side
  hair('sidepart', 'Side part', {
    front: kit(32).spans(1, [[12, 20], [10, 21], [9, 22], [9, 22], [9, 22], [9, 11], [9, 10]], 'h').spans(6, [[21, 22], [22, 22]], 'h').px(13, 1, 'S').px(13, 2, 'S').px(15, 2, 'l').px(16, 3, 'l').map(),
    side:  kit(32).spans(1, [[11, 16], [9, 18], [8, 19], [8, 19], [8, 19], [9, 12], [9, 11], [9, 10]], 'h').px(15, 2, 'l').map(),
    backTo: 9,
    bust:  kit(36).spans(4, [[16, 23], [12, 25], [10, 26], [9, 27], [8, 27], [8, 27], [8, 27], [8, 26], [8, 11], [8, 10]], 'h').spans(12, [[24, 27], [25, 27]], 'h')
      .px(13, 5, 'S').px(13, 6, 'S').px(13, 7, 'S').px(13, 8, 'S').px(17, 6, 'l').px(18, 6, 'l').px(19, 7, 'l').map(),
  });
  // BANGS: shoulder length with a straight fringe
  const bob = byHair('bob');
  const fringe = (m, rows, from) => Object.assign({}, m, {half: m.half.map((r, i) => rows.includes(i) ? r.slice(0, from) + rep('h', r.length - from) : r)});
  hair('bangs', 'Bangs', {front: fringe(bob.front, [4, 5], 9), side: bob.side, backTo: bob.backTo, bust: fringe(bob.bust, [4, 5, 6, 7], 9)});
  // TWISTS, COILS, WAVY, BOX BRAIDS: the same shapes as locs, curly, long and braids with their own texture
  hair('twists', 'Twists', Object.assign(shape(retexHair(byHair('locs'), twist)), {backTex: 'hH'}));
  hair('coils', 'Coils', shape(retexHair(byHair('curly'), coil)));
  hair('wavy', 'Wavy', Object.assign(shape(retexHair(byHair('long'), wave)), {backTex: 'hhhH'}));
  const beads = m => m && Object.assign({}, m, {[m.half ? 'half' : 'rows']: (m.half || m.rows).map((r, i, all) => i === all.length - 1 ? r.replace(/h/g, 'g') : r)});   // a gold bead at each end
  const braids = byHair('braids');
  hair('boxbraids', 'Box braids with beads', Object.assign(shape(braids), {bust: beads(braids.bust), bustBehind: beads(braids.bustBehind),
    behind: {front: beads(braids.behind.front), side: beads(braids.behind.side)}}));
  // MOHAWK: a crest down the middle, the sides buzzed
  hair('mohawk', 'Mohawk', {
    front: kit(32).spans(0, [[14, 17], [14, 17], [14, 17], [14, 17], [14, 17]], 'h').spans(2, [[12, 13], [11, 13], [10, 13], [10, 11], [10, 10]], 'H').px(15, 1, 'l').sym().map(),
    side:  kit(32).spans(0, [[10, 17], [9, 18], [9, 18]], 'h').spans(3, [[9, 19], [9, 19], [9, 12], [9, 11], [9, 10]], 'H').px(13, 1, 'l').map(),
    back:  kit(32).spans(0, [[14, 17], [14, 17], [14, 17], [14, 17], [14, 17], [14, 17], [14, 17], [14, 17], [14, 17]], 'h').spans(2, [[11, 13], [10, 13], [10, 13], [10, 13], [10, 13], [10, 13], [10, 13], [11, 13]], 'H').sym().map(),
    bust:  kit(36).spans(0, [[16, 19], [15, 20], [15, 20], [15, 20], [15, 20], [15, 20], [15, 20], [15, 20], [15, 20]], 'h').spans(6, [[13, 14], [12, 14], [11, 14], [10, 13], [10, 12], [10, 11], [10, 10], [10, 10]], 'H')
      .px(16, 2, 'l').px(16, 4, 'l').sym().map(),
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

  /* ---------- MORE HEAD COVERINGS (free, and part of who a student is: never locked) ---------- */
  const patkaBust = kit(36).spans(5, [[14, 21], [12, 23], [10, 25], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26]], 'u').spans(13, [[9, 11], [9, 10]], 'u')
    .spans(12, [[9, 26]], 'U').disc(17.5, 3.5, 2.6, 'u').px(16, 2, 'U').px(18, 3, 'U').px(17, 4, 'U').sym();
  P.HEADS.push(
    {id: 'patka', name: 'Patka', hides: 'all',
     front: kit(32).spans(1, CAP.front, 'u').spans(5, [[10, 21]], 'U').spans(6, [[10, 10], [10, 10]], 'u').disc(15.5, .5, 1.6, 'u').px(15, 0, 'U').sym().map(),
     side:  kit(32).spans(1, CAP.side, 'u').spans(5, [[9, 19]], 'U').spans(6, [[9, 12], [9, 11]], 'u').disc(15, .5, 1.6, 'u').map(),
     back:  kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], 'u').disc(15.5, .5, 1.6, 'u').map(),
     bust:  patkaBust.map()},
    {id: 'kufi', name: 'Kufi', hides: 'top', clip: {front: 5, side: 5, back: 5, bust: 10},
     front: kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21]], 'u').spans(3, [[10, 21]], (x) => (x % 2 ? 'j' : 'u')).map(),
     side:  kit(32).spans(1, [[11, 16], [10, 18], [9, 18], [9, 19]], 'u').spans(3, [[9, 18]], (x) => (x % 2 ? 'j' : 'u')).map(),
     back:  kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21]], 'u').map(),
     bust:  kit(36).spans(4, [[15, 20], [13, 22], [11, 24], [10, 25], [10, 25], [9, 26]], 'u').spans(7, [[10, 25]], (x) => (x % 2 ? 'j' : 'u')).spans(9, [[9, 26]], 'U').map()},
    {id: 'tichel', name: 'Headscarf', hides: 'all',
     front: kit(32).spans(0, [[12, 19], [10, 21], [9, 22], [9, 22], [9, 22], [9, 22], [9, 11], [9, 10], [9, 10], [9, 10], [9, 10]], 'u').spans(5, [[11, 20]], 'U').sym().map(),
     side:  kit(32).spans(0, [[11, 16], [9, 18], [8, 19], [8, 19], [8, 19], [8, 19], [8, 12], [8, 12], [8, 12], [8, 12], [9, 11]], 'u').spans(5, [[12, 19]], 'U').spans(8, [[6, 7], [5, 7], [5, 6]], 'U').map(),
     back:  kit(32).spans(0, [[12, 19], [10, 21], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [10, 21], [12, 19]], 'u').spans(11, [[14, 17], [13, 18], [14, 17]], 'U').map(),
     bust:  kit(36).spans(4, [[14, 21], [11, 24], [9, 26], [8, 27], [8, 27], [8, 27], [8, 27], [8, 27]], 'u').spans(12, [[8, 10], [8, 10], [8, 10], [8, 10], [8, 10], [8, 10], [8, 10], [9, 10]], 'u')
       .spans(11, [[10, 25]], 'U').sym().map()},
    {id: 'durag', name: 'Durag', hides: 'all',
     front: kit(32).spans(1, CAP.front, 'u').spans(5, [[10, 21]], 'U').px(15, 1, 'U').px(16, 1, 'U').px(15, 2, 'U').px(16, 2, 'U').spans(6, [[10, 10]], 'u').sym().map(),
     side:  kit(32).spans(1, CAP.side, 'u').spans(5, [[9, 19]], 'U').spans(6, [[9, 11], [9, 10], [8, 9], [7, 9], [7, 8], [7, 8], [7, 8]], 'u').map(),
     back:  kit(32).spans(1, [[12, 19], [11, 20], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [10, 21], [11, 20]], 'u').spans(10, [[13, 14], [13, 14], [13, 14], [13, 14], [13, 14]], 'U').sym().map(),
     bust:  kit(36).spans(5, CAP.bust, 'u').spans(12, [[9, 26]], 'U').spans(5, [[17, 18], [17, 18], [17, 18], [17, 18], [17, 18], [17, 18]], 'U').spans(13, [[9, 10], [9, 10]], 'u').map()});

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
  // more everyday tops: a sweater vest over a white shirt, and a plaid flannel
  const plaid = (x, y) => ['c', 'C', 'K'][(Math.floor(x / 3) % 2) + (Math.floor(y / 3) % 2)];   // a buffalo check: light, shade, dark
  P.TOPS.push(
    {id: 'vest', name: 'Sweater vest', sleeve: 1, sleeveCh: 'W',
     front: torsoF(['...........cccWW', '...........cccWd', '...........ccccW', '...........cccdc', '...........ccdcd', '...........cccdc', '...........WWWWW']),
     side: torsoS(['............cccccWW', T(12, 18), T(12, 18), T(12, 18), T(12, 18), T(12, 18), '............WWWWWWW']), back: torsoF(['...........WWWWW', T(11, 15), T(11, 15), T(11, 15), T(11, 15), T(11, 15), '...........WWWWW']),
     bust: {y: 27, half: ['..........WWWWWsss', '.......WWccccWWWss', '.....WWcccccccWWWs', '....WWcccccccccWWW', '...WWccccdcccccWWW', '...WWcccdddcccccWW',
                          '...WWccccdcccccccW', '...WWccccccccccccc', '...WWccccccccccccc']}},
    {id: 'flannel', name: 'Flannel', sleeve: 1,
     front: kit(32).spans(14, Array(7).fill([11, 20]), plaid).spans(14, [[15, 16]], 's').map(),
     side: kit(32).spans(14, Array(7).fill([12, 18]), plaid).map(), back: kit(32).spans(14, Array(7).fill([11, 20]), plaid).map(),
     bust: kit(36).spans(27, [[10, 25], [7, 28], [5, 30], [4, 31], [3, 32], [3, 32], [3, 32], [3, 32], [3, 32]], plaid).spans(27, [[15, 20], [16, 19]], 's')
       .spans(27, [[13, 14], [14, 15], [15, 15]], 'C').spans(27, [[21, 22], [20, 21], [20, 20]], 'C').map()});
  // bottoms and shoes
  P.BOTTOMS.push({id: 'cargo', name: 'Cargo pants', legs: 'long', pocket: true});
  P.SHOES.push({id: 'sandals', name: 'Sandals', rows: 2, sandal: true});

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

  /* ---------- MORE GLASSES (free, like all glasses) ---------- */
  P.GLASSES.push(
    {id: 'rect', name: 'Rectangle', front: {y: 8, half: ['...........xxxxx', '...........x..x.']}, side: {y: 8, rows: ['...............xxxx', '..............xx..x']},
     bust: {y: 15, half: ['.........xxxxxxxxx', '..........x...x...', '..........xxxxx...']}},
    {id: 'cateye', name: 'Cat-eye', front: {y: 7, half: ['..........x.....', '...........xxxxx', '............x.x.']}, side: {y: 8, rows: ['..............xxxx', '.............xx..x']},
     bust: {y: 14, half: ['.........xx.......', '..........xxxxx...', '..........x...xxxx', '...........xxx....']}},
    {id: 'aviator', name: 'Aviator', front: {y: 8, half: ['...........xxxxx', '............xx..']}, side: {y: 8, rows: ['...............xxxx', '.............xx.xx']},
     bust: {y: 14, half: ['..........xxxxx...', '.........x.....xxx', '..........x...x...', '...........xxx....']}});

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

  /* =====================================================================================================================
     UNLOCKABLE ITEMS. Most parts are free. A part with an `unlock` rule must be earned first; until then it shows as a
     dark silhouette with its requirement (Create Your Player and the LOCKER on Select Player).
     UNLOCK RULES (the `unlock` field):
       {stars: 150}                         150 ★ on THIS DEVICE: every instrument, every game, every mode added up
       {game, level, stars, text}           an achievement: any instrument has `stars` on that level of that game
       {game, achievement: 'id', text}      an achievement a game saves (Arcade Quest's 'ep1', Speedway's 'virtuoso-win')
       {game, badge: true, text}            any TEST READY badge in Ancient Ninja Scrolls ({game, badges: 4, text}: 4 of them)
       {game, perfect: 8, text}             3 ★ on every level 1–8 of that game (any instrument, any mode's key)
       {game, endless: 10, text}            an Endless run of that game reached 10 notes (store.endless + gameData('endless-best'))
       {game, wins: 10, text}               matches won on this device (Neon Face-Off, Dojo Duel: shared/skins.js WINS)
       {shop: 250}                          bought for 250 Arcade Tokens at Arcade Quest's Token Booth (owned forever)
     IDENTITY ITEMS ARE ALWAYS FREE AND CAN NEVER BE LOCKED (avatar.js enforces it, whatever a rule says): no head
     covering at all, the hijab, headwrap, turban, patka, kufi, headscarf (tichel) and durag, hearing aids, the wheelchair
     and glasses.
     ANIMATED ITEMS (all optional; still frame = frame 0, used with reduced motion, Motion off and on every copy except
     the largest avatar on screen, see avatar-bg.js): `anim: {pal: {letter: [4 tokens]}}` cycles a fixed color
     (glowphones, lightup); `anim: {maps: {bust: [4 maps], front: [...], 'behind.front': [...]}}` swaps whole maps per
     frame (flap(), shiftRows() and unhalf() build them from the still map); a HAND item's `bust(api, f)` draws frame f;
     a pet's `frames` + `seq`. Keep changes small and slow (4 frames at 4 fps): nothing may flash.
     AVATAR CODE: every new part id (free or not) also goes at the END of its field's list in shared/avatar-code.js
     TABLE, so Share to Band Ninja carries it (?demo warns in the console about any id missing there).
     HOW TO ADD AN ITEM: add it to its list (EYES, MOUTHS, HAIR_COLORS, HEADS, TOPS, SHOES, PETS, BACKS, HANDS, EFFECTS or PLATES) with a new id
     and a name, draw its maps like the parts above, and give it an `unlock` rule (or none: free). An UNLOCKED! card
     shows the first time a student has earned it (results screens and Select Player), and old progress counts.
     A {shop} item: add '<field>:<id>' (e.g. 'pet:penguin') to the END of QUEST_V3.cosmetics in shared/backup.js so
     save codes carry it (2 places left; after that the code needs a version 4), and check it with ?demo&unlockall in the LOCKER and in Create Your Player from every side.
     A {shop} item appears on the Token Booth's PLAYER ITEMS shelf by itself (keep prices 50–500).
     ===================================================================================================================== */
  const recolor = (map, from, to) => map && Object.assign({}, map, map.half ? {half: map.half.map(r => r.replace(from, to))} : {rows: map.rows.map(r => r.replace(from, to))});
  const deep = o => JSON.parse(JSON.stringify(o));

  // ---- expressions (emotes) ----
  P.EYES.push(
    {id: 'stars',  name: 'Star eyes',  unlock: {stars: 10},  front: ['..', '.g'], side: ['..', 'g.'], bust: ['.g.', 'ggg', '.g.']},
    {id: 'hearts', name: 'Heart eyes', unlock: {shop: 75},   front: ['..', '.5'], side: ['..', '5.'], bust: ['5.5', '555', '.5.']},
    // the right eye can differ: frontR / sideR / bustR are the RIGHT eye as you see it (not mirrored)
    {id: 'wink',   name: 'Wink',       unlock: {game: 'ancient-ninja-scrolls', badge: true, text: 'Earn a TEST READY badge in Ancient Ninja Scrolls'},
     front: ['..', '.e'], frontR: ['..', 'KK'], side: ['..', 'e.'], bust: ['...', '.ee', '.ee'], bustR: ['...', '...', 'KKK']});
  P.MOUTHS.push(
    {id: 'tongue',  name: 'Silly tongue', unlock: {stars: 200}, front: ['.mm.', '.nn.'], side: ['..m', '.nm'], bust: ['.mmmm.', '.mnnm.', '..nn..']},
    {id: 'whistle', name: 'Whistle',      unlock: {shop: 50},   front: ['....', '..m.'], side: ['...', '..m'], bust: ['......', '...mm.', '...mm.']});

  // ---- hair colors (their colors are --av-hair-<id> tokens; fx: 'tips' = flame-colored ends, 'sparkle' = stars) ----
  P.HAIR_COLORS.push(
    {id: 'gold',     name: 'Gold',       unlock: {stars: 50}},
    {id: 'neon',     name: 'Neon green', unlock: {shop: 100}},
    {id: 'galaxy',   name: 'Galaxy',     unlock: {stars: 300}, fx: 'sparkle'},
    {id: 'flametip', name: 'Flame tips', unlock: {game: 'sustain-speedway', level: 8, stars: 3, text: 'Win The Grand Prix in Sustain Speedway'}, fx: 'tips'});

  // ---- hats ----
  const shako = P.HEADS.find(h => h.id === 'shako');
  const plume = k => recolor(recolor(shako[k], /W/g, '5'), /j/g, '9');
  P.HEADS.push(
    {id: 'tophat', name: 'Top hat', unlock: {stars: 100}, hides: 'top', clip: {front: 6, side: 6, back: 6, bust: 13},
     front: {y: 0, half: ['...........KKKKK', '...........KKKKK', '...........KKKKK', '...........uuuuu', '...........KKKKK', '........KKKKKKKK']},
     side:  {y: 0, rows: ['...........KKKKKKK', '...........KKKKKKK', '...........KKKKKKK', '...........uuuuuuu', '...........KKKKKKK', '........KKKKKKKKKKKKK']},
     bust:  {y: 0, half: ['...........KKKKKKK', '...........KKKKKKK', '...........KKKKKKK', '...........KKKKKKK', '...........KKKKKKK', '...........KKKKKKK',
                          '...........KKKKKKK', '...........uuuuuuu', '...........uuuuuuu', '...........KKKKKKK', '...........KKKKKKK', '.......KKKKKKKKKKK', '........KKKKKKKKKK']}},
    {id: 'wizard', name: 'Wizard hat', unlock: {stars: 500}, hides: 'top', clip: {front: 6, side: 6, back: 6, bust: 13},
     front: {y: 0, half: ['..............uu', '.............uuu', '............uu3u', '...........uuuuu', '..........uu3uuu', '........UUUUUUUU']},
     side:  {y: 0, rows: ['..............uu', '.............uuuu', '............uu3uu', '...........uuuuuuu', '..........uu3uuuuu', '........UUUUUUUUUUUU']},
     bust:  {y: 0, half: ['................uu', '...............uuu', '...............uuu', '..............uuuu', '.............uu3uu', '.............uuuuu',
                          '............uuuuuu', '...........uuuuu3u', '...........uuuuuuu', '..........uu3uuuuu', '..........uuuuuuuu', '.......UUUUUUUUUUU', '........UUUUUUUUUU']}},
    {id: 'plumeshako', name: 'Plumed shako', unlock: {game: 'button-masher', level: 8, stars: 1, text: 'Defeat The Conductor in Button Masher'}, hides: 'top', clip: shako.clip,
     front: plume('front'), side: plume('side'), back: shako.back,
     bust: {y: 0, half: ['...............555', '..............5595', '...............555', '..........uuuuuuuu', '..........uuuuuuuu', '..........uuuuuugg',
                         '..........uuuuuggg', '..........uuuuuugg', '..........uuuuuuuu', '..........gggggggg', '..........uuuuuuuu', '.........KKKKKKKKK',
                         '..........KKKKKKKK', '..........g.......', '..........g.......']}},
    {id: 'royalcrown', name: 'Royal crown', unlock: {shop: 400}, hides: 'none',
     front: {y: 0, half: ['..........3..3.3', '..........333333', '..........345363']}, side: {y: 0, rows: ['..........3..3..3', '..........33333333', '..........35363543']},
     back:  {y: 0, half: ['..........3..3.3', '..........333333', '..........343434']},
     bust:  {y: 0, half: ['.........3...3...3', '.........33..333.3', '.........333333333', '.........334335336', '.........333333333', '.........444444444']}},
    {id: 'diamondband', name: 'Diamond headband', unlock: {game: 'note-ninja', level: 10, stars: 1, text: 'Earn the Diamond belt in Note Ninja'}, hides: 'none',
     front: {y: 4, half: ['...............0', '.........6666669']}, side: {y: 4, rows: ['..................0', '........66666666669']}, back: {y: 5, half: ['.........6666666']},
     bust:  {y: 8, half: ['.................0', '................09', '........6666666609', '.........66666669.', '.................9']}});

  // ---- jackets ----
  const marching = P.TOPS.find(t => t.id === 'marching'), concert = P.TOPS.find(t => t.id === 'concert');
  const sparkle = map => map && Object.assign({}, map, {[map.half ? 'half' : 'rows']: (map.half || map.rows).map((r, y) => [...r].map((ch, x) => ch === 'c' && (x * 3 + y * 5) % 7 === 0 ? 'W' : ch).join(''))});
  P.TOPS.push(
    {id: 'rockstar', name: 'Rock-star jacket', unlock: {stars: 25}, sleeve: 1, sleeveCh: 'K',
     front: {y: 14, half: ['...........gKKcc', '...........KKKcc', '...........KKKcc', '...........KgKcc', '...........KKKcc', '...........KKKcc', '...........KKKcc']},
     side:  {y: 14, rows: Array(7).fill('............KKKKKcc')},
     back:  {y: 14, half: ['...........gKgKg', '...........KKKKK', '...........KgKgK', '...........KKKKK', '...........KKKKK', '...........KKKKK', '...........KKKKK']},
     bust:  {y: 27, half: ['.........KKKKccsss', '......KgKKKKKccccc', '.....KKKKKgKKccccc', '....KKKKKKKKKccccc', '...KKgKKKKKKKccccc', '...KKKKKKKKKKccccc',
                          '...KKKKKKgKKKccccc', '...KKKKKKKKKKccccc', '...KKKKKKKKKKccccc']}},
    {id: 'tuxedo', name: 'Tuxedo', unlock: {stars: 750}, sleeve: 1, base: 'black',
     front: {y: 14, half: ['...........KKWWK', '...........KKKWW', '...........KKKWW', '...........KKKKW', '...........KKKKW', '...........KKKKK', '...........KKKKK']},
     side: concert.side, back: concert.back,
     bust:  {y: 27, half: ['.........KKKKKWWss', '......KKKKKKKWWWKK', '.....KKKKKKKKWWWWK', '....KKdKKKKKKKWWWW', '...KKddKKKKKKKWWWW', '...KKKKKKKKKKKKWWW',
                          '...KKKKKKKKKKKKWWW', '...KKKKKKKKKKKKKWW', '...KKKKKKKKKKKKKWW']}},
    {id: 'champion', name: 'Championship jacket', unlock: {game: 'neon-face-off', level: 8, stars: 1, text: 'Beat The Champ in Neon Face-Off (1 player vs CPU)'}, sleeve: 1,
     front: {y: 13, half: ['..............gg', '...........ggccc', T(11, 15), '...........ccccg', '...........cccgg', T(11, 15), T(11, 15), '...........ggggg']},
     side:  {y: 13, rows: ['..............ggg', '............ggcccc', T(12, 18), T(12, 18), T(12, 18), T(12, 18), T(12, 18), '............ggggggg']},
     back:  {y: 13, half: ['..............gg', '...........ggccc', T(11, 15), '...........cccgg', '...........ccggg', '...........cccgg', T(11, 15), '...........ggggg']},
     bust:  {y: 25, half: ['..............gggg', '..............gggg', '.........ccccccggs', '......ccccccccccgg', '.....ccccccccccccc', '....cccccccccccccg',
                          '...cccccccccccccgg', '...ccccccccccccggg', '...cccccccccccccgg', '...ccccccccccccccc']}},
    {id: 'sequin', name: 'Sequined marching jacket', unlock: {game: 'chime-heist', level: 8, stars: 1, text: 'Clear The Golden Vault in Chime Heist'}, sleeve: 1,
     front: sparkle(marching.front), side: sparkle(marching.side), back: sparkle(marching.back), bust: sparkle(marching.bust),
     bustTop: marching.bustTop});

  // ---- PETS: a little friend floating beside the avatar (its own colors in `pal`: letter -> theme token) ----
  P.PETS = [
    {id: 'none', name: 'No pet'},
    {id: 'ghost', name: 'Tiny ghost', unlock: {game: 'ghost-notes', level: 8, stars: 3, text: 'Get 3 ★ on Ghost Run in Ghost Notes'},
     pal: {W: 'white-hi', K: 'av-black', p: 'pink'},
     rows: ['..WWWW..', '.WWWWWW.', '.WKWWKW.', '.WWWWWW.', '.WpWWpW.', '.WWWWWW.', '.WW.WW.W', 'W..W..W.']},
    {id: 'animatronic', name: 'Mini animatronic', unlock: {game: 'showtime-malfunction', level: 8, stars: 1, text: 'Defeat Maestro Moose in Showtime Malfunction'},
     pal: {M: 'anim-metal-dark', m: 'anim-metal', r: 'anim-eye-bad'},
     rows: ['.M....M.', '.MMMMMM.', 'MmmmmmmM', 'MmrmmrmM', 'MmmmmmmM', 'MmMMMMmM', '.MmmmmM.', '..M..M..']},
    {id: 'note', name: 'Note sprite', unlock: {stars: 150}, pal: {y: 'yellow', a: 'amber'},
     rows: ['....yy..', '....y.y.', '....y..y', '....y...', '..yyy...', '.yyyya..', '.yyyya..', '..aa....']},
    {id: 'star', name: 'Lucky star', unlock: {shop: 150}, pal: {y: 'yellow', a: 'amber', K: 'av-black'},
     rows: ['...yy...', '...yy...', 'yyyyyyyy', '.yKyyKy.', '..yyyy..', '.yyaayy.', 'yy....yy', '........']},
    {id: 'metronome', name: 'Metronome buddy', unlock: {shop: 250}, pal: {w: 'q-wood', W: 'q-wood-l', m: 'q-silver'},
     rows: ['...ww...', '..wWWw..', '..wmWw..', '.wWmWWw.', '.wWWmWw.', 'wWWWWWWw', 'wwwwwwww', '........']},
  ];
  P.PET_AT = {sprite: [24, 1], bust: [27, 1]};             // where a pet floats (top-left of its 8 × 8 picture)

  // ---- BACK items: capes and gear behind the avatar (accessory colors 1–0) ----
  const cape = P.ACCESSORIES.cape, capeColors = m => recolor(recolor(m, /1/g, '3'), /7/g, '6');
  P.BACKS = [
    {id: 'none', name: 'Nothing'},
    {id: 'pixelcape', name: 'Pixel-hero cape', unlock: {game: 'arcade-quest', achievement: 'ep1', text: 'Finish Episode 1 of Arcade Quest'},
     behind: {front: capeColors(cape.behind.front), side: capeColors(cape.behind.side), back: capeColors(cape.behind.back)}, bustBehind: capeColors(cape.bustBehind)},
    {id: 'jetpack', name: 'Jetpack', unlock: {shop: 300},
     behind: {front: {y: 14, half: ['........99......', '........98......', '........98......', '........98......', '........99......', '.........4......', '.........3......']},
              side:  {y: 14, rows: ['........999', '........988', '........988', '........988', '........999', '........4.4', '........3.3']},
              back:  {y: 14, half: ['...........99999', '...........98889', '...........98889', '...........98889', '...........99999', '............4..4', '............3..3']}},
     bustBehind: {y: 24, half: ['...999............', '..99889...........', '..98889...........', '..98889...........', '..98889...........', '..99999...........', '...4.4............', '...3.3............']}},
    {id: 'wings', name: 'Neon wings', unlock: {stars: 1000},
     behind: {front: {y: 11, half: ['..9.............', '.990............', '.9900...........', '99900...........', '.99900..........', '.999000.........', '..99900.........', '...9900.........', '....990.........', '.....99.........']},
              side:  {y: 10, rows: ['....9', '...990', '..9900', '..99900', '.999900', '.9999000', '..999900', '...99900', '....9990', '.....99']},
              back:  {y: 11, half: ['..9.............', '.990............', '.9900...........', '99900...........', '.99900..........', '.999000.........', '..99900.........', '...9900.........', '....990.........', '.....99.........']}},
     bustBehind: {y: 12, half: ['.9................', '990...............', '9900..............', '99900.............', '999900............', '.99990............', '.999900...........', '..99990...........',
                              '..999900..........', '...99990..........', '...999900.........', '....99990.........', '.....9999.........', '......99..........']}},
  ];


  /* =====================================================================================================================
     MORE UNLOCKABLE ITEMS (and the new slots: HAND items, EFFECTS, NAME PLATES).
     Colors a part always has (not the student's choice) go in its `pal` (letter -> theme token): heads use A B, tops
     D E G, hand items I J L M, back items N O (so two parts never fight over a letter).
     ANIMATED ITEMS have `anim` (the renderer plays 4 frames, ~4 a second, only on the largest avatar on screen and
     never with reduced motion or the Motion switch off; every other copy shows frame 0):
       anim.pal:  {letter: [4 tokens]}      a slow color cycle (light-up soles, glowing headphones, a glow stick)
       anim.maps: {bust: [4 maps], front: [...], side: [...], back: [...], bustBehind: [...], 'behind.front': [...]}
                                            a different picture per frame (a swaying plume, flapping wings and capes)
       hand items draw themselves: bust(api, frame) with api.px(x, y, ch) and api.line(x0, y0, x1, y1, ch)
     Game goals (shared/skins.js ruleMet): {game, level, stars}, {game, perfect: 8} (3 ★ on levels 1–8, any mode),
     {game, endless: 10} (an Endless run of that many notes: Lost Signal's longest signal, Vanishing Ink's scroll),
     {game, badges: 4} (Ancient Ninja Scrolls TEST READY badges), {game, wins: n}, {game, achievement}.
     ===================================================================================================================== */
  const W2 = 36;
  // a half map as full rows (to animate one side differently), and small ways to move a map
  const unhalf = (m, W) => m && m.half ? {y: m.y, rows: m.half.map(r => { const a = r.padEnd(W / 2, '.').slice(0, W / 2); return a + [...a].reverse().join(''); })} : m;
  const shiftRows = (m, from, to, dx) => m && Object.assign({}, m, {rows: m.rows.map((r, i) => i >= from && i <= to ? (dx > 0 ? rep('.', dx) + r : r.slice(-dx)) : r)});
  const shiftHalf = (m, dx) => m && (m.half ? Object.assign({}, m, {half: m.half.map(r => (dx > 0 ? rep('.', dx) + r : r.slice(-dx)))}) : shiftRows(m, 0, 99, dx));
  const flap = (m, lower = 0, d = 1) => m && [m, shiftHalf(m, -d), m, shiftHalf(m, d)].map((x, i) => lower && i % 2 ? Object.assign({}, x, {[m.half ? 'half' : 'rows']: (m.half || m.rows).map((r, y) => (y < lower ? (m.half || m.rows)[y] : (x.half || x.rows)[y]))}) : x);
  const BELT_NAMES = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Red', 'Brown', 'Black', 'Diamond'];
  const beltRule = i => ({game: 'note-ninja', level: i + 1, stars: 1, text: `Earn the ${BELT_NAMES[i]} belt in Note Ninja`});

  // ---- hats ----
  const band = P.ACCESSORIES.headband, toA = m => m && recolor(recolor(m, /1/g, 'A'), /2/g, 'A');
  const phones = P.HEADS.find(h => h.id === 'headphones'), toPhones = m => m && recolor(recolor(m, /u/g, 'B'), /U/g, 'A');
  const ring = (w, cx, cy, r, maxY) => { const k = kit(w); k.disc(cx, cy, r, 'A'); for (let y = 0; y < 36; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < (r - 1.1) ** 2 || y > maxY) k.px(x, y, '.'); return k; };
  P.HEADS.push(
    {id: 'pirate', name: 'Pirate hat', unlock: {shop: 200}, hides: 'top', clip: {front: 5, side: 5, back: 5, bust: 11}, pal: {A: 'av-black', B: 'av-gold'},
     front: kit(32).spans(0, [[12, 19], [11, 20], [11, 20]], 'A').spans(3, [[6, 25], [8, 23]], 'A').spans(4, [[9, 22]], 'B').px(6, 2, 'A').px(25, 2, 'A').px(15, 1, 'W').px(16, 1, 'W').map(),
     side:  kit(32).spans(0, [[11, 17], [10, 18], [10, 18]], 'A').spans(3, [[6, 22], [7, 21]], 'A').spans(4, [[8, 20]], 'B').px(6, 2, 'A').px(22, 2, 'A').map(),
     back:  kit(32).spans(0, [[12, 19], [11, 20], [11, 20]], 'A').spans(3, [[6, 25], [8, 23]], 'A').px(6, 2, 'A').px(25, 2, 'A').map(),
     bust:  kit(W2).spans(2, [[14, 21], [12, 23], [11, 24], [11, 24], [10, 25], [10, 25]], 'A').spans(8, [[4, 31], [6, 29]], 'A').spans(9, [[7, 28]], 'B')
       .spans(5, [[3, 4], [3, 5], [4, 5]], 'A').spans(5, [[31, 32], [30, 32], [30, 31]], 'A').spans(4, [[16, 19], [16, 19], [17, 18]], 'W').px(16, 5, 'A').px(19, 5, 'A').map()},
    {id: 'astronaut', name: 'Astronaut helmet', unlock: {stars: 400}, hides: 'none', pal: {A: 'white-hi', B: 'cyan-hi'},
     front: ring(32, 15.5, 6.5, 7.6, 12).px(10, 3, 'B').px(11, 2, 'B').map(),
     side:  ring(32, 15, 6.5, 7.6, 12).px(10, 3, 'B').map(),
     back:  ring(32, 15.5, 6.5, 7.6, 12).map(),
     bust:  ring(W2, 17.5, 14, 14.2, 25).spans(25, [[9, 26]], 'A').px(8, 8, 'B').px(9, 7, 'B').px(10, 6, 'B').px(8, 10, 'B').map()},
    {id: 'glowphones', name: 'Glowing headphones', unlock: {shop: 350}, hides: 'none', pal: {A: 'av-black', B: 'cyan'},
     anim: {pal: {B: ['cyan-ink', 'cyan', 'cyan-hi', 'cyan']}},
     front: toPhones(phones.front), side: toPhones(phones.side), back: toPhones(phones.back), bust: toPhones(phones.bust)},
    ...BELT_NAMES.map((b, i) => ({id: 'belt-' + b.toLowerCase(), name: `${b} belt headband`, unlock: beltRule(i), hides: 'none', pal: {A: 'belt-' + b.toLowerCase()},
      front: toA(band.front), side: toA(band.side), back: toA(band.back), bust: toA(band.bust), bustAfter: toA(band.bust.after)})));
  // the plumed shako's plume sways (frame 0 is the still picture)
  const ps = P.HEADS.find(h => h.id === 'plumeshako'), psBust = unhalf(ps.bust, W2), psFront = unhalf(ps.front, 32);
  ps.bust = psBust; ps.front = psFront;
  ps.anim = {maps: {bust: [psBust, shiftRows(psBust, 0, 2, 1), psBust, shiftRows(psBust, 0, 2, -1)], front: [psFront, shiftRows(psFront, 0, 0, 1), psFront, shiftRows(psFront, 0, 0, -1)]}};

  // ---- tops ----
  const X = (k, x0, y0, x1, y1, ch) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) k.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch); return k; };
  const bustBody = (ch = 'c') => kit(W2).spans(27, [[10, 25], [7, 28], [5, 30], [4, 31], [3, 32], [3, 32], [3, 32], [3, 32], [3, 32]], ch).spans(27, [[15, 20]], 's');
  const torso = (ch = 'c', rows = [14, 20]) => kit(32).spans(rows[0], Array(rows[1] - rows[0] + 1).fill([11, 20]), ch);
  const sideT = (ch = 'c', rows = [14, 20]) => kit(32).spans(rows[0], Array(rows[1] - rows[0] + 1).fill([12, 18]), ch);
  const twinkle = (k, f) => { const m = k.map(); return {y: 0, rows: m.rows.map((r, y) => [...r].map((ch, x) => (ch === 'c' && (x * 3 + y * 5 + f * 3) % 11 === 0 ? 'W' : ch)).join(''))}; };
  const stage = f => ({bust: twinkle(bustBody('c').spans(27, [[13, 22], [14, 21], [15, 20], [15, 20], [16, 19], [16, 19], [17, 18]], 'K').spans(28, [[12, 13], [22, 23]], 'C'), f),
    front: twinkle(torso('c').spans(14, [[15, 16], [15, 16], [15, 16], [15, 16], [15, 16], [15, 16], [15, 16]], 'K'), f), side: twinkle(sideT('c'), f), back: twinkle(torso('c'), f)});
  const S0 = stage(0);
  const gi = (pal, id, name, unlock) => ({id, name, unlock, sleeve: 0.8, sleeveCh: 'D', pal,
    front: X(torso('D'), 13, 14, 18, 18, 'E').spans(14, [[15, 16]], 's').spans(20, [[11, 20]], 'G').px(14, 21, 'G').px(17, 21, 'G').map(),
    side: sideT('D').spans(14, [[16, 18]], 'E').spans(20, [[12, 18]], 'G').map(), back: torso('D').spans(20, [[11, 20]], 'G').map(),
    bust: X(X(bustBody('D').spans(27, [[14, 21], [15, 20], [16, 19]], 's'), 13, 27, 21, 35, 'E'), 22, 27, 19, 30, 'E').map()});
  P.TOPS.push(
    {id: 'uniform', name: 'Marching band uniform', unlock: {stars: 100}, sleeve: 1,
     front: X(X(torso('c', [13, 20]).spans(13, [[14, 17]], 'g').px(11, 14, 'g').px(20, 14, 'g'), 11, 14, 20, 20, 'W'), 20, 14, 11, 20, 'W').map(),
     side: X(sideT('c', [13, 20]).spans(13, [[14, 16]], 'g'), 12, 14, 18, 20, 'W').map(), back: X(X(torso('c', [13, 20]), 11, 14, 20, 20, 'W'), 20, 14, 11, 20, 'W').map(),
     bust: X(X(X(X(bustBody('c').spans(25, [[15, 20], [15, 20]], 'g').spans(27, [[4, 9], [5, 8]], 'g').spans(27, [[26, 31], [27, 30]], 'g'), 8, 29, 27, 35, 'W'), 9, 29, 28, 35, 'W'), 27, 29, 8, 35, 'W'), 26, 29, 7, 35, 'W').map()},
    {id: 'stagejacket', name: 'Sequined stage jacket', unlock: {shop: 400}, sleeve: 1, bust: S0.bust, front: S0.front, side: S0.side, back: S0.back,
     anim: {maps: ['bust', 'front', 'side', 'back'].reduce((o, v) => { o[v] = [0, 1, 2, 3].map(f => stage(f)[v]); return o; }, {})}},
    gi({D: 'av-white', E: 'av-white-d', G: 'belt-white'}, 'gi', 'White ninja gi', beltRule(0)),
    gi({D: 'av-black', E: 'av-gray', G: 'belt-black'}, 'blackgi', 'Black ninja gi', beltRule(8)),
    {id: 'racing', name: 'Racing jacket', unlock: {game: 'sustain-speedway', perfect: 8, text: 'Win all 8 tracks in Sustain Speedway'}, sleeve: 1,
     front: torso('c').spans(14, Array(7).fill([12, 12]), 'W').spans(14, Array(7).fill([19, 19]), 'W').spans(14, [[15, 16]], 'K').px(13, 16, 'K').px(14, 16, 'W').px(13, 17, 'W').px(14, 17, 'K').map(),
     side: sideT('c').spans(14, Array(7).fill([13, 13]), 'W').map(), back: torso('c').spans(14, Array(7).fill([12, 12]), 'W').spans(14, Array(7).fill([19, 19]), 'W').map(),
     bust: bustBody('c').spans(27, [[14, 21]], 'K').spans(28, Array(8).fill([7, 8]), 'W').spans(28, Array(8).fill([27, 28]), 'W').spans(28, Array(8).fill([17, 18]), 'W')
       .spans(30, [[21, 22], [23, 24]], 'K').spans(31, [[23, 24], [21, 22]], 'K').spans(30, [[23, 24]], 'W').spans(31, [[21, 22]], 'W').map()},
    {id: 'spacesuit', name: 'Space suit', unlock: {game: 'lost-signal', endless: 10, text: 'Echo a 10-note signal in Lost Signal (Deep Space Scan)'}, sleeve: 1, sleeveCh: 'D',
     pal: {D: 'av-white', E: 'av-gray', G: 'av-blue'},
     front: torso('D').spans(15, [[14, 17], [14, 17]], 'G').px(14, 15, 'g').px(17, 16, 'W').spans(20, [[11, 20]], 'E').map(),
     side: sideT('D').spans(14, Array(6).fill([12, 13]), 'E').map(), back: torso('D').spans(14, Array(6).fill([12, 19]), 'E').map(),
     bust: bustBody('D').spans(26, [[12, 23], [11, 24]], 'E').spans(30, [[14, 21], [14, 21], [14, 21]], 'G').px(15, 31, 'g').px(18, 31, 'W').px(20, 31, 'g').map()},
    {id: 'ghosthunter', name: 'Ghost-hunter coat', unlock: {game: 'ghost-notes', perfect: 8, text: 'Get 3 ★ on every Ghost Notes level'}, sleeve: 1, sleeveCh: 'D',
     pal: {D: 'av-khaki', E: 'av-khaki-d', G: 'green'},
     front: torso('D', [14, 23]).spans(21, [[15, 16], [15, 16], [15, 16]], '.').spans(14, [[13, 14], [14, 14]], 'E').spans(14, [[17, 18], [17, 17]], 'E').px(18, 16, 'G').map(),
     side: sideT('D', [14, 23]).map(), back: torso('D', [14, 23]).spans(18, [[11, 20]], 'E').map(),
     bust: bustBody('D').spans(25, [[12, 14], [11, 14]], 'E').spans(25, [[21, 23], [21, 24]], 'E').spans(27, [[14, 21], [15, 20], [16, 19], [16, 19], [17, 18]], 'K')
       .spans(27, [[12, 14], [13, 14], [13, 15]], 'E').spans(27, [[21, 23], [21, 22], [20, 22]], 'E').spans(31, [[23, 26], [23, 26]], 'E').px(24, 31, 'G').map()});

  // ---- shoes (sprite only: the bust stops at the shoulders) ----
  P.SHOES.push({id: 'lightup', name: 'Light-up sneakers', unlock: {shop: 300}, rows: 2, sole: true, anim: {pal: {Q: ['pink', 'cyan', 'yellow', 'green']}}});

  // ---- back items: wings and capes flap ----
  P.BACKS.forEach(b => {
    if (b.id === 'wings' || b.id === 'pixelcape') b.anim = {maps: {bustBehind: flap(b.bustBehind, b.id === 'pixelcape' ? 3 : 0, 2), 'behind.front': flap(b.behind.front, b.id === 'pixelcape' ? 3 : 0),
      'behind.back': flap(b.behind.back, b.id === 'pixelcape' ? 3 : 0)}};
  });
  const neon = P.BACKS.find(b => b.id === 'wings'), feather = m => m && Object.assign({}, m, {[m.half ? 'half' : 'rows']: (m.half || m.rows).map((r, y) => [...r].map((ch, x) => (ch === '9' || ch === '0' ? ((x + y) % 3 === 0 ? 'O' : 'N') : ch)).join(''))});
  const fw = {bustBehind: feather(neon.bustBehind), behind: {front: feather(neon.behind.front), side: feather(neon.behind.side), back: feather(neon.behind.back)}};
  P.BACKS.push({id: 'featherwings', name: 'Feathered wings', unlock: {shop: 450}, pal: {N: 'white-hi', O: 'av-white-d'}, bustBehind: fw.bustBehind, behind: fw.behind,
    anim: {maps: {bustBehind: flap(fw.bustBehind, 0, 2), 'behind.front': flap(fw.behind.front), 'behind.back': flap(fw.behind.back)}}});
  // the Cape (an accessory skin) flaps too
  P.ACCESSORIES.cape.anim = {maps: {bustBehind: flap(P.ACCESSORIES.cape.bustBehind, 3, 2), 'behind.front': flap(P.ACCESSORIES.cape.behind.front, 3), 'behind.back': flap(P.ACCESSORIES.cape.behind.back, 3)}};

  // ---- HAND items (the 'hand' slot): held up beside the portrait (the full-body sprite holds your instrument instead).
  //      The hand is at x 29–30, rows 21–22; the arm comes up from the shoulder in the top's color. ----
  const HAND = [29.5, 21.5];
  P.HANDS = [
    {id: 'none', name: 'Empty hands'},
    {id: 'baton', name: "Conductor's baton", unlock: {stars: 600}, pal: {I: 'yellow', J: 'white-hi'}, anim: {spin: true},
     bust(a, f) { const ang = [90, 45, 0, 135][f % 4] * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang);
       a.line(HAND[0] - c * 5, HAND[1] + s * 5, HAND[0] + c * 5, HAND[1] - s * 5, 'J'); a.px(HAND[0] + c * 5, HAND[1] - s * 5, 'I'); }},
    {id: 'drumsticks', name: 'Drumsticks', unlock: {game: 'button-masher', perfect: 8, text: 'Get 3 ★ against every Button Masher rival'}, pal: {I: 'q-wood', J: 'q-wood-l'},
     bust(a) { a.line(29, 21, 31, 12, 'J').line(30, 21, 34, 13, 'J').px(31, 12, 'I').px(34, 13, 'I').px(31, 11, 'I'); }},
    {id: 'glowstick', name: 'Glow stick', unlock: {shop: 200}, pal: {I: 'green', L: 'green-hi', M: 'av-gray'}, anim: {pal: {I: ['green', 'green-hi', 'green-hi', 'green'], L: ['green-hi', 'white-hi', 'white-hi', 'green-hi']}},
     bust(a) { a.line(29, 13, 29, 20, 'L').line(30, 13, 30, 20, 'I').px(29, 12, 'M').px(30, 12, 'M'); }},
    {id: 'mic', name: 'Microphone', unlock: {game: 'arcade-quest', achievement: 'ep1', text: 'Finish Episode 1 of Arcade Quest'}, pal: {I: 'q-silver', J: 'av-black', L: 'q-silver-d', M: 'red'},
     bust(a) { a.line(29, 17, 29, 20, 'J').line(30, 17, 30, 20, 'J'); [[28, 14], [29, 13], [30, 13], [31, 14], [28, 15], [29, 14], [30, 14], [31, 15], [29, 15], [30, 15], [29, 16], [30, 16]].forEach(([x, y]) => a.px(x, y, (x + y) % 2 ? 'I' : 'L')); a.px(29, 18, 'M'); }},
    {id: 'wand', name: 'Magic wand', unlock: {shop: 250}, pal: {I: 'yellow', J: 'av-black', L: 'white-hi'}, anim: {sparkle: true},
     bust(a, f) { a.line(30, 21, 33, 15, 'J'); [[33, 12], [32, 13], [33, 13], [34, 13], [33, 14]].forEach(([x, y]) => a.px(x, y, 'I'));
       [[[31, 11], [35, 15]], [[35, 11], [31, 15]], [[33, 10], [35, 13]], [[31, 13], [34, 16]]][f % 4].forEach(([x, y]) => a.px(x, y, 'L')); }},
    {id: 'trophy', name: 'Trophy', unlock: {game: 'neon-face-off', wins: 10, text: 'Win 10 matches in Neon Face-Off on this device'}, pal: {I: 'yellow', J: 'amber', L: 'white-hi'},
     bust(a) { for (let y = 12; y <= 16; y++) a.line(27 + (y > 14 ? 1 : 0), y, 32 - (y > 14 ? 1 : 0), y, 'I'); a.px(26, 13, 'I').px(26, 14, 'I').px(33, 13, 'I').px(33, 14, 'I');
       a.line(29, 17, 30, 17, 'J').line(29, 18, 30, 18, 'J').line(27, 19, 32, 19, 'J').px(28, 13, 'L'); }},
  ];

  // ---- PETS: new friends, each with an idle animation (frames: pictures; seq: which one each of the 4 frames shows) ----
  P.PETS.push(
    {id: 'cat', name: 'Cat', unlock: {stars: 25}, pal: {o: 'amber', O: 'amber-ink', K: 'av-black', P: 'pink'}, seq: [0, 0, 1, 1],
     rows: ['.O...O..', '.oO.Oo..', '.ooooo..', '.oKoKo..', '.ooPoo.O', '..ooo..O', '.ooooooO', '.oo.oo..'],
     frames: [null, ['.O...O..', '.oO.Oo..', '.ooooo.O', '.oKoKo.O', '.ooPoo.O', '..ooo.O.', '.oooooo.', '.oo.oo..']]},
    {id: 'penguin', name: 'Penguin', unlock: {shop: 150}, pal: {K: 'av-black', W: 'white-hi', a: 'amber'}, seq: [0, 0, 1, 0],
     rows: ['..KKKK..', '.KKKKKK.', '.KWKKWK.', '.KKaaKK.', '.KWWWWK.', 'KKWWWWKK', '.KWWWWK.', '..a..a..'],
     frames: [null, ['..KKKK..', '.KKKKKK.', '.KWKKWK.', 'KKKaaKKK', 'K.WWWW.K', '.KWWWWK.', '.KWWWWK.', '..a..a..']]},
    {id: 'narwhal', name: 'Narwhal', unlock: {shop: 200}, pal: {b: 'cyan', B: 'cyan-ink', W: 'white-hi', K: 'av-black'}, seq: [0, 0, 0, 1],
     rows: ['W.......', '.W......', '..BbbB..', '.bbbbbb.', 'bbKbbbbb', 'bbbbbbbB', '.bbbbBB.', '.....B.B'],
     frames: [null, ['W.......', '.W......', '..BbbB..', '.bbbbbb.', 'bbbbbbbb', 'bbbbbbbB', '.bbbbBB.', '.....B.B']]},
    {id: 'robot', name: 'Mini robot', unlock: {game: 'showtime-malfunction', level: 8, stars: 1, suffix: ':extra', text: 'Clear The Midnight Encore on NIGHTMARE in Showtime Malfunction'},
     pal: {m: 'q-silver', M: 'q-silver-d', K: 'av-black', r: 'red', c: 'cyan'}, seq: [0, 0, 1, 1],
     rows: ['...r....', '...M....', '.mmmmmm.', '.mcmmcm.', '.mmKKmm.', '..MMMM..', '.mmmmmm.', '.m.mm.m.'],
     frames: [null, ['...M....', '...M....', '.mmmmmm.', '.mcmmcm.', '.mmKKmm.', '..MMMM..', '.mmmmmm.', '.m.mm.m.']]},
    {id: 'dragon', name: 'Baby dragon', unlock: {game: 'dojo-duel', wins: 10, text: 'Win 10 matches in Dojo Duel on this device'},
     pal: {g: 'green', G: 'green-ink', y: 'yellow', K: 'av-black'}, seq: [0, 1, 0, 1],
     rows: ['..g.g...', '.gggg...', 'gKggg.G.', 'gggggGG.', '.yygggG.', '.yyggg..', '.gg.gg.g', '......gg'],
     frames: [null, ['..g.g.G.', '.ggggGG.', 'gKgggG..', 'ggggg...', '.yyggg..', '.yyggg..', '.gg.gg.g', '......gg']]},
    {id: 'owl', name: 'Owl', unlock: {game: 'ancient-ninja-scrolls', badges: 4, text: 'Earn 4 TEST READY badges in Ancient Ninja Scrolls'},
     pal: {o: 'q-wood-l', O: 'q-wood', W: 'white-hi', K: 'av-black', y: 'amber'}, seq: [0, 0, 0, 1],
     rows: ['.O....O.', '.OooooO.', '.WWooWW.', '.WKooKW.', '.ooyyoo.', '.oOooOo.', '.oOooOo.', '..y..y..'],
     frames: [null, ['.O....O.', '.OooooO.', '.OOooOO.', '.ooooOo.', '.ooyyoo.', '.oOooOo.', '.oOooOo.', '..y..y..']]});
  // the old pets get idle animations too
  const pet = id => P.PETS.find(x => x.id === id);
  Object.assign(pet('ghost'), {seq: [0, 1, 0, 1], frames: [null, ['..WWWW..', '.WWWWWW.', '.WKWWKW.', '.WWWWWW.', '.WpWWpW.', '.WWWWWW.', 'W.WW.WW.', '.W..W..W']]});
  Object.assign(pet('metronome'), {seq: [0, 1, 0, 2], frames: [null, ['...ww...', '..wWWw..', '..wWmw..', '.wWWmWw.', '.wWmWWw.', 'wWWWWWWw', 'wwwwwwww', '........'],
    ['...ww...', '..wmWw..', '..wmWw..', '.wWmWWw.', '.wWmWWw.', 'wWWWWWWw', 'wwwwwwww', '........']]});
  Object.assign(pet('star'), {seq: [0, 0, 1, 0], frames: [null, ['...yy...', '...yy...', 'yyyyyyyy', '.yKyyKy.', '..yyyy..', '.yyaayy.', 'yy....yy', '........'].map((r, y) => y === 3 ? '.yyyyyy.' : r)]});

  // ---- EFFECTS (the 'effect' slot): drawn around the avatar by shared/avatar-fx.js (never over the face or the name) ----
  P.EFFECTS = [
    {id: 'none', name: 'No effect'},
    {id: 'notes', name: 'Floating notes', unlock: {stars: 50}},
    {id: 'orbit', name: 'Orbiting stars', unlock: {stars: 150}},
    {id: 'aura', name: 'Glow aura', unlock: {stars: 250}, colored: true},
    {id: 'sparkles', name: 'Sparkles', unlock: {game: 'chime-heist', perfect: 8, text: 'Get 3 ★ on every Chime Heist vault'}},
    {id: 'sparks', name: 'Lightning sparks', unlock: {game: 'note-storm', perfect: 8, text: 'Get 3 ★ on every Note Storm level'}},
    {id: 'bubbles', name: 'Bubbles', unlock: {game: 'vanishing-ink', endless: 10, text: 'Remember a 10-note scroll in Vanishing Ink (Endless Scroll)'}},
    {id: 'snow', name: 'Snowflakes', unlock: {shop: 250}},
    {id: 'confetti', name: 'Confetti', unlock: {shop: 350}},
  ];
  P.EFFECT_COLORS = ['cyan', 'pink', 'yellow', 'purple', 'green', 'amber'];

  // ---- NAME PLATES (the 'plate' slot): the frame around the player's name on results screens and score lists
  //      (the look is CSS: .av-plate-<id> in theme.css) ----
  P.PLATES = [
    {id: 'none', name: 'Plain'},
    {id: 'simple', name: 'Outline'},
    {id: 'notes', name: 'Music notes', unlock: {stars: 100}},
    {id: 'gold', name: 'Gold', unlock: {stars: 250}},
    {id: 'neon', name: 'Neon', unlock: {shop: 150}},
    {id: 'flames', name: 'Flames', unlock: {shop: 250}},
    ...BELT_NAMES.map((b, i) => ({id: 'belt-' + b.toLowerCase(), name: `${b} belt`, unlock: beltRule(i)})),
  ];

  /* ---- BACKGROUNDS (the 'bg' field): drawn in code behind the avatar by shared/avatar-bg.js ----
     kind 'solid' (one color) | 'grad' (two colors, top to bottom) | 'pattern' (pat: stripes, dots, staff, checker,
     stars; on colors[0], drawn in colors[1]) | 'scene' (scene: an animated scene from shared/bg-scenes.js, the same
     art as the game menus; lift = how much brighter than on a menu, 1–2). main = the one color the top-bar badge
     shows. Free ones have no `unlock`. Unlock rules as above, plus {game, wins: 5, text} = matches won on this
     device (Neon Face-Off, Dojo Duel: shared/skins.js WINS). HOW TO ADD ONE: add it here (a new id, never rename
     one), draw a new scene in bg-scenes.js if it needs one, and for a {shop} one add 'bg:<id>' to the END of
     QUEST_V3.cosmetics in shared/backup.js. */
  const clear = n => ({game: n[0], level: n[1], stars: 1, text: n[2]});
  P.BGS = [
    {id: 'none', name: 'None', kind: 'none', main: 'floor-3'},
    {id: 'midnight', name: 'Midnight', kind: 'solid', colors: ['floor-3'], main: 'floor-3'},
    {id: 'berry', name: 'Berry', kind: 'solid', colors: ['pink-ink'], main: 'pink-ink'},
    {id: 'ocean', name: 'Ocean', kind: 'solid', colors: ['cyan-ink'], main: 'cyan-ink'},
    {id: 'grape', name: 'Grape', kind: 'solid', colors: ['purple-ink'], main: 'purple-ink'},
    {id: 'ember', name: 'Ember', kind: 'solid', colors: ['amber-ink'], main: 'amber-ink'},
    {id: 'sunset', name: 'Sunset fade', kind: 'grad', colors: ['pink-ink', 'amber'], main: 'pink-ink'},
    {id: 'lagoon', name: 'Lagoon fade', kind: 'grad', colors: ['cyan-ink', 'purple-ink'], main: 'cyan-ink'},
    {id: 'lime', name: 'Lime fade', kind: 'grad', colors: ['green-ink', 'blue-ink'], main: 'green-ink'},
    {id: 'stripes', name: 'Stripes', kind: 'pattern', pat: 'stripes', colors: ['purple-ink', 'purple'], main: 'purple-ink'},
    {id: 'dots', name: 'Polka dots', kind: 'pattern', pat: 'dots', colors: ['pink-ink', 'pink-hi'], main: 'pink-ink'},
    {id: 'staff', name: 'Staff lines', kind: 'pattern', pat: 'staff', colors: ['floor-2', 'cyan'], main: 'floor-2'},
    {id: 'checker', name: 'Checkerboard', kind: 'pattern', pat: 'checker', colors: ['floor-2', 'floor-lit'], main: 'floor-2'},
    {id: 'starry', name: 'Starry', kind: 'pattern', pat: 'stars', colors: ['blue-ink', 'yellow'], main: 'blue-ink'},
    // ---- a game's background: clear its final level (or the goal given) ----
    {id: 'thunderstorm', name: 'Thunderstorm', kind: 'scene', scene: 'storm', lift: 1.6, main: 'purple-ink', unlock: clear(['note-storm', 8, 'Clear Note Storm Level 8'])},
    {id: 'hauntedhall', name: 'Haunted Hall', kind: 'scene', scene: 'manor', lift: 1.7, main: 'purple-ink', unlock: clear(['ghost-notes', 8, 'Clear Ghost Notes Level 8'])},
    {id: 'bamboomoon', name: 'Bamboo Moon', kind: 'scene', scene: 'bamboo', lift: 1.9, main: 'green-ink', unlock: clear(['note-ninja', 10, 'Earn the Diamond belt in Note Ninja'])},
    {id: 'inkbloom', name: 'Ink Bloom', kind: 'scene', scene: 'ink', lift: 1.5, main: 'floor-3', unlock: clear(['vanishing-ink', 8, 'Clear Vanishing Ink Level 8'])},
    {id: 'laservault', name: 'Laser Vault', kind: 'scene', scene: 'vault', lift: 1.9, main: 'blue-ink', unlock: clear(['chime-heist', 8, 'Clear The Golden Vault in Chime Heist'])},
    {id: 'lanterntemple', name: 'Lantern Temple', kind: 'scene', scene: 'temple', lift: 1.9, main: 'amber-ink', unlock: clear(['ancient-ninja-scrolls', 8, 'Earn a star on the Diamond scroll in Ancient Ninja Scrolls'])},
    {id: 'comboarena', name: 'Combo Arena', kind: 'scene', scene: 'arena', lift: 1.8, main: 'purple-ink', unlock: clear(['button-masher', 8, 'Defeat The Conductor in Button Masher'])},
    {id: 'airrink', name: 'Air Rink', kind: 'scene', scene: 'rink', lift: 2, main: 'cyan-ink', unlock: {game: 'neon-face-off', wins: 5, text: 'Win 5 matches in Neon Face-Off on this device'}},
    {id: 'spotlight', name: 'Spotlight Stage', kind: 'scene', scene: 'stage', lift: 2, main: 'red-ink', unlock: clear(['showtime-malfunction', 8, 'Clear Showtime Malfunction Level 8'])},
    {id: 'nighttrack', name: 'Night Track', kind: 'scene', scene: 'track', lift: 1.9, main: 'purple-ink', unlock: clear(['sustain-speedway', 8, 'Finish The Grand Prix in the top 3 in Sustain Speedway'])},
    {id: 'deepspace', name: 'Deep Space Radar', kind: 'scene', scene: 'space', lift: 2, main: 'blue-ink', unlock: clear(['lost-signal', 8, 'Clear Lost Signal Level 8'])},
    {id: 'neonhighway', name: 'Neon Highway', kind: 'scene', scene: 'highway', lift: 1.8, main: 'purple-ink', unlock: clear(['music-highway', 16, 'Earn a star on The Entertainer in Music Highway'])},
    {id: 'dojonight', name: 'Dojo Night', kind: 'scene', scene: 'night-dojo', lift: 2, main: 'red-ink', unlock: {game: 'dojo-duel', wins: 5, text: 'Win 5 matches in Dojo Duel on this device'}},
    {id: 'pixelcastle', name: 'Pixel Castle', kind: 'scene', scene: 'pixel-night', lift: 1.7, main: 'purple-ink', unlock: {game: 'arcade-quest', achievement: 'ep1', text: 'Finish Episode 1 of Arcade Quest'}},
    // ---- star milestones (every star on this device) ----
    {id: 'neoncity', name: 'Neon City', kind: 'scene', scene: 'city', lift: 1.8, main: 'purple-ink', unlock: {stars: 50}},
    {id: 'synthwave', name: 'Synthwave Sunset', kind: 'scene', scene: 'synthwave', lift: 1.1, main: 'pink-ink', unlock: {stars: 100}},
    {id: 'aurora', name: 'Aurora', kind: 'scene', scene: 'aurora', lift: 2, main: 'green-ink', unlock: {stars: 150}},
    {id: 'galaxyswirl', name: 'Galaxy Swirl', kind: 'scene', scene: 'galaxy', lift: 1.6, main: 'purple-ink', unlock: {stars: 250}},
    {id: 'goldrecords', name: 'Gold Record Wall', kind: 'scene', scene: 'records', lift: 1, main: 'amber-ink', unlock: {stars: 400}},
    // ---- the Token Booth (Arcade Quest) ----
    {id: 'bubbles', name: 'Underwater Bubbles', kind: 'scene', scene: 'bubbles', lift: 1.2, main: 'cyan-ink', unlock: {shop: 150}},
    {id: 'fireflies', name: 'Fireflies Night', kind: 'scene', scene: 'fireflies', lift: 1.2, main: 'blue-ink', unlock: {shop: 200}},
    {id: 'lavalamp', name: 'Lava Lamp', kind: 'scene', scene: 'lavalamp', lift: 1.1, main: 'purple-ink', unlock: {shop: 250}},
    {id: 'confetti', name: 'Confetti Party', kind: 'scene', scene: 'confetti', lift: 1.2, main: 'purple-ink', unlock: {shop: 300}},
  ];

  /* =====================================================================================================================
     OFFICIAL BAND NINJA GEAR: earned IN CLASS, never in the arcade. Only a belt code from Mat's Band Ninja portal opens
     it (shared/bandninja.js; typed at Arcade Quest's Token Booth, ENTER A CODE): unlock {bandninja: '<belt>'}. Every
     part here has `official: true`, so Create Your Player shows it on its own BAND NINJA tab ("Official Band Ninja gear:
     earned in class"), apart from the arcade's own Note Ninja belt items above, and only once a code has opened some.
     Colors: the portal's own belt colors (--bn-* tokens in theme.css).
     - P.BN_BELTS (the 'belt' field): a martial-arts belt at the waist (avatar.js draws it: a band + a knot + two tails;
       Z = the belt, z = its edge, Y = the Diamond belt's sparkle)
     - name-plate frames 'bn-<belt>' (P.PLATES), the Black Belt Gi (top 'bngi'), the Diamond Aura (effect 'bndiamond',
       shared/avatar-fx.js) and the Diamond Dojo (background 'bndojo', scene 'diamond-dojo' in bg-scenes.js)
     ===================================================================================================================== */
  const BN = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'red', 'brown', 'black', 'diamond'];
  const bnRule = k => ({bandninja: k, text: `Enter your ${k[0].toUpperCase() + k.slice(1)} belt code from Band Ninja at the Token Booth`});
  P.BN_BELTS = [{id: 'none', name: 'No belt'}].concat(BN.map(k => {
    const b = {id: k, name: `${k[0].toUpperCase() + k.slice(1)} belt`, official: true, unlock: bnRule(k), pal: {Z: 'bn-' + k, z: 'bn-' + k + '-d', Y: 'white-hi'}};
    if (k === 'diamond') b.anim = {pal: {Y: ['white-hi', 'bn-diamond', 'bn-diamond', 'bn-diamond']}};   // one slow sparkle (1 a second)
    return b;
  }));
  P.PLATES.push(...BN.map(k => ({id: 'bn-' + k, name: `${k[0].toUpperCase() + k.slice(1)} belt frame`, official: true, unlock: bnRule(k)})));
  const setPx = (m, pts) => {
    const rows = m.rows.slice();
    pts.forEach(([x, y, ch]) => { const r = y - (m.y || 0); if (r < 0) return; while (rows.length <= r) rows.push(''); rows[r] = rows[r].padEnd(x + 1, '.'); rows[r] = rows[r].slice(0, x) + ch + rows[r].slice(x + 1); });
    return {y: m.y || 0, rows};
  };
  const bngi = gi({D: 'av-black', E: 'bn-black-d', G: 'bn-gold'}, 'bngi', 'Black Belt Gi', bnRule('black'));
  bngi.official = true;
  bngi.bust = setPx(bngi.bust, [[8, 30, 'G'], [9, 30, 'G'], [8, 31, 'G'], [9, 31, 'G']]);            // the Band Ninja crest
  bngi.front = setPx(bngi.front, [[13, 15, 'G']]);
  P.TOPS.push(bngi);
  P.EFFECTS.push({id: 'bndiamond', name: 'Diamond Aura', official: true, unlock: bnRule('diamond')});
  P.BGS.push({id: 'bndojo', name: 'Diamond Dojo', kind: 'scene', scene: 'diamond-dojo', lift: 1.8, main: 'blue-ink', official: true, unlock: bnRule('diamond')});
})(window.AVATAR_PARTS);
