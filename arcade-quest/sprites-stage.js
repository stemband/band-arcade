/* ARCADE QUEST, EPISODE 2: THE SHOWTIME STAGE's pictures. The same rules as sprites.js: every sprite is a pixel map,
   one character per pixel ('.' = see-through), each palette maps characters to THEME TOKENS (shared/theme.css: the
   --q-stage-* tokens, plus the manor's --q-*; never a hex color). YOUR OWN ART: arcade-quest/art/<sprite id>.png
   replaces any of these (frames side by side). index.html?sprites shows the game's sprites; GALLERY=1 with
   tests/quest-ep2.spec.js saves docs/gallery/aq-ep2/sprites.png (every picture below at 4×) for review.
     tile-st-…     the theater's 16 × 16 tiles (data/maps/stage.js says which letter draws which): tile-st-bulbs
                   (the marquee bulbs twinkle, slowly) and tile-st-curtain (it sways) have 2 frames
     stage-speaker the old stage speaker under the attic's sheet (32 × 40: grille dark, grille glowing red)
     npc-moose     MAESTRO MOOSE (24 × 28), frozen mid-downbeat: the baton up for 2.5 s, then one glitchy downbeat
     npc-hoot      PROFESSOR HOOT, stuck reading the same page (it flips up, then back)
     npc-tina      TICKET BOOTH TINA, Token Booth Terry's cousin (a ghost with a ticket-taker's hat and a ticket roll)
     npc-pete      POPCORN PETE, the snack counter's popcorn bucket (a kernel pops now and then)
   The Showtime Band are pixel versions of Showtime Malfunction's animatronics (showtime-malfunction/characters.js:
   felt, bolts, glowing eyes; red while the static has them). Friendly machines: nobody is inside them.
   Small drawing helpers (rectangles, ovals, lines, an automatic outline) build the characters, so a pose is easy to
   change: edit the numbers and reload. */
(function (Q) {
  "use strict";
  const S = Q.SPRITES;

  /* ---------- helpers ---------- */
  const grid = (w, h) => Array.from({length: h}, () => Array(w).fill('.'));
  const text = g => g.map(r => r.join(''));
  const put = (g, x, y, ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  const rect = (g, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, ch); };
  const oval = (g, cx, cy, rx, ry, ch) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, ch);
    }
  };
  function line(g, x0, y0, x1, y1, ch, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) rect(g, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), thick, thick, ch);
  }
  /** the left half copied onto the right (x → w − 1 − x) */
  const mirror = g => g.forEach(r => { for (let x = 0; x < r.length / 2; x++) if (r[x] !== '.') r[r.length - 1 - x] = r[x]; });
  /** a dark outline around everything drawn (the 8-bit look): every empty pixel touching a filled one */
  function outline(g, ch = 'o') {
    const c = g.map(r => r.slice());
    g.forEach((r, y) => r.forEach((v, x) => {
      if (v !== '.') return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = (g[y + dy] || [])[x + dx]; return n && n !== '.' && n !== ch; })) c[y][x] = ch;
    }));
    return c;
  }
  /** rows moved down by n pixels (an idle bob) */
  const down = (rows, n = 1) => Array(n).fill('.'.repeat(rows[0].length)).concat(rows.slice(0, rows.length - n));
  /** overlay rows on top of base rows ('.' in the overlay keeps the base pixel) */
  const over = (base, top) => base.map((row, y) => { const t = top[y]; return t ? [...row].map((ch, x) => (t[x] && t[x] !== '.' ? t[x] : ch)).join('') : row; });
  const repeat = (motif, times) => motif.map(r => r.repeat(times));
  const pad16 = rows => Array.from({length: 16}, (_, i) => (rows[i] || '').padEnd(16, '.'));
  const tile = (palette, frames, extra) => Object.assign({w: 16, h: 16, fps: 3, palette, frames}, extra || {});

  /* ---------- floors ---------- */
  const CARPET = {c: 'q-stage-carpet', d: 'q-stage-carpet-d', l: 'q-stage-carpet-l', y: 'q-stage-runner'};
  const carpet8 = ['cccccccc', 'cccclccc', 'ccclylcc', 'cccclccc', 'cccccccc', 'dccccccc', 'cccccccc', 'ccccccdc'];
  const CARPET_ROWS = repeat(carpet8, 2).concat(repeat(carpet8, 2));
  S['tile-st-carpet'] = tile(CARPET, [CARPET_ROWS]);
  // the gold runner up the middle of the lobby (3 tiles wide: no border inside, so it reads as one carpet)
  const runner8 = ['yyyyyyyy', 'yyyTyyyy', 'yyTyTyyy', 'yyyTyyyy', 'yyyyyyyy', 'yyyyyyyT', 'yyyyyyyy', 'Tyyyyyyy'];
  S['tile-st-runner'] = tile({y: 'q-stage-runner', T: 'q-stage-trim-d'}, [repeat(runner8, 2).concat(repeat(runner8, 2))]);
  const BOARD = {p: 'q-stage-board', d: 'q-stage-board-d', l: 'q-stage-board-l'};
  S['tile-st-boards'] = tile(BOARD, [['pppppppppppppppp', 'ppplpppppppppppp', 'pppppppppppppppp', 'dddddddddddddddd',
    'pppppppdpppppppp', 'pppppppdpppplppp', 'pppppppdpppppppp', 'dddddddddddddddd', 'pppppppppppdpppp', 'plppppppppppdppp'.slice(0, 16),
    'pppppppppppdpppp', 'dddddddddddddddd', 'ppppdppppppppppp', 'ppppdpppppplpppp', 'ppppdppppppppppp', 'dddddddddddddddd']]);
  // the aisle exit (the bottom edge of a room): a gold mat with an arrow, on the carpet
  S['tile-st-exit'] = tile(Object.assign({T: 'q-stage-trim-d'}, CARPET), [over(CARPET_ROWS, ['', '', '..yyyyyyyyyyyy..', '..yyyyyyyyyyyy..', '..yyyyyTTyyyyy..',
    '..yyyyyTTyyyyy..', '..yyyyyTTyyyyy..', '..yyyTTTTTTyyy..', '..yyyyTTTTyyyy..', '..yyyyyTTyyyyy..', '..yyyyyyyyyyyy..', '..yyyyyyyyyyyy..'])]);

  /* ---------- walls: dark red damask, gold trim (the face of the back wall; decorations sit on it) ---------- */
  const WALL = {W: 'q-stage-wall', d: 'q-stage-wall-d', l: 'q-stage-wall-l', t: 'q-stage-trim', T: 'q-stage-trim-d', v: 'q-void'};
  const FACE = ['tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'WdWWWWWWWWWWWWdW', 'WWWWWWWdWWWWWWWW', 'WWWWWWdldWWWWWWW', 'WWWWWdlWldWWWWWW',
    'WWWWWWdldWWWWWWW', 'WWWWWWWdWWWWWWWW', 'WdWWWWWWWWWWWWdW', 'WWWWWWWWWWWWWWWW', 'TTTTTTTTTTTTTTTT', 'tttttttttttttttt',
    'dWWWWWWddWWWWWWd', 'dWWWWWWddWWWWWWd', 'TTTTTTTTTTTTTTTT', 'tttttttttttttttt'];
  S['tile-st-wall'] = tile(WALL, [FACE]);
  S['tile-st-cap'] = tile({d: 'q-stage-wall-d', v: 'q-void'}, [['dddddddddddddddd', 'ddvddddddddddddd', 'dddddddddddvdddd', 'dddddddddddddddd', 'dddddvdddddddddd',
    'dddddddddddddddd', 'dddddddddddddvdd', 'dvdddddddddddddd', 'dddddddddddddddd', 'ddddddddvddddddd', 'dddddddddddddddd', 'ddddvddddddddddd',
    'dddddddddddddddd', 'dddddddddddddvdd', 'dddddddddddddddd', 'dddddddddddddddd']]);
  // marquee bulbs around the auditorium doors: two halves take turns, once a second (a slow twinkle, never a flash)
  const bulbs = i => over(FACE, [i ? 'f.o.f.o.f.o.f.o.' : 'o.f.o.f.o.f.o.f.', '', i ? 'okkkkkkkkkkkkkkf' : 'fkkkkkkkkkkkkkko', '.kkkkkkkkkkkkkk.',
    '.kkkkkkyykkkkkk.', '.kkkkkyyyykkkkk.', '.kkkkkkyykkkkkk.', '.kkkkkkkkkkkkkk.', i ? 'fkkkkkkkkkkkkkko' : 'okkkkkkkkkkkkkkf', i ? 'o.f.o.f.o.f.o.f.' : 'f.o.f.o.f.o.f.o.']);
  S['tile-st-bulbs'] = tile(Object.assign({o: 'q-stage-bulb', f: 'q-stage-bulb-off', k: 'q-stage-wall-d', y: 'q-stage-glow'}, WALL), [bulbs(0), bulbs(1)], {fps: 1});
  // a show poster: the band's silhouettes under a red title band
  S['tile-st-poster'] = tile(Object.assign({r: 'q-stage-stripe', y: 'q-stage-bulb', p: 'q-paper', k: 'q-black'}, WALL), [over(FACE, ['', '',
    '...tttttttttt...', '...trrrrrrrrt...', '...tryyyyyyrt...', '...trrrrrrrrt...', '...tppppppppt...', '...tpkpkkpkpt...', '...tpkkkkkkpt...',
    '...tpkkpkkkkt...'.slice(0, 16), '...tppppppppt...', '...tttttttttt...'])]);
  // a dressing-room mirror ringed with bulbs
  S['tile-st-mirror'] = tile(Object.assign({m: 'q-stage-mirror', M: 'q-stage-mirror-l', b: 'q-stage-bulb'}, WALL), [over(FACE, ['', '',
    '...b..b..b..b...', '..tttttttttttt..', '.btmmmmmmmmmmtb.', '..tmMmmmmmmmmt..', '.btmmMmmmmmmmtb.', '..tmmmmmmmmmmt..', '.btmmmmmmmMmmtb.',
    '..tttttttttttt..', '...b..b..b..b...'])]);
  // a stage door (walk into it), and stairs up: roped off with a velvet rope until its door's flag is set
  const DOORWAY = ['tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'WWTttttttttttTWW'];
  S['tile-st-door'] = tile(WALL, [DOORWAY.concat(Array(13).fill('WWtvvvvvvvvvvtWW'))]);
  const STAIRS = DOORWAY.concat(Array.from({length: 13}, (_, i) => (i % 2 ? 'WWtbbbbbbbbbbtWW' : 'WWtBBBBBBBBBBtWW')));
  const STEPS = Object.assign({b: 'q-stage-board', B: 'q-stage-board-d', g: 'q-brass', G: 'q-brass-d', r: 'q-stage-velvet', R: 'q-stage-velvet-d'}, WALL);
  S['tile-st-stairs'] = tile(STEPS, [STAIRS]);
  S['tile-st-roped'] = tile(STEPS, [over(STAIRS, ['', '', '', '', '', '', '...g........g...', '..gGg......gGg..', '...grr....rrg...', '...g.rrrrrr.g...',
    '...g........g...', '...g........g...', '..GGG......GGG..'])]);

  /* ---------- furniture (on the carpet) ---------- */
  const FURN = Object.assign({}, CARPET, {g: 'q-brass', G: 'q-brass-d', r: 'q-stage-velvet', R: 'q-stage-velvet-d', L: 'q-stage-velvet-l',
    t: 'q-stage-trim', T: 'q-stage-trim-d', k: 'q-black', K: 'q-grey-d', w: 'q-white', p: 'q-paper', P: 'q-paper-d', s: 'q-stage-glass',
    e: 'q-moon', y: 'q-stage-pop', Y: 'q-stage-pop-d', x: 'q-stage-stripe', n: 'q-green', N: 'q-green-d'});
  // a brass post with the velvet rope sagging to the next post on both sides
  S['tile-st-post'] = tile(FURN, [pad16(['', '', '.......gg.......', '......gGGg......', '.......gg.......', '......rggr......', '....rr.gg.rr....',
    '..rr...gg...rr..', 'rr.....gg.....rr', 'R......gg......R', '.......gg.......', '.......gg.......', '.......gg.......', '.....GGGGGG.....',
    '....GGGGGGGG....', ''])]);
  const FRONT = (top, mid) => ['TTTTTTTTTTTTTTTT', 'tttttttttttttttt', 'TTTTTTTTTTTTTTTT'].concat(top, mid, ['TTTTTTTTTTTTTTTT', 'dddddddddddddddd', 'cccccccccccccccc']);
  // the box office counter: a brass top over red velvet panels
  S['tile-st-boxoffice'] = tile(FURN, [FRONT([], ['RRRRRRRRRRRRRRRR', 'RrrrrrRRRrrrrrrR', 'RrLrrrRRRrLrrrrR'.slice(0, 16), 'RrrrrrRRRrrrrrrR',
    'RrrrrrRRRrrrrrrR', 'RrrrrrRRRrrrrrrR', 'RrrrrrRRRrrrrrrR', 'RrrrrrRRRrrrrrrR', 'RRRRRRRRRRRRRRRR', 'RgRRRRRRRRRRRRgR'])]);
  // TICKET BOOTH TINA's window: glass, a ticket slot, a ticket sticking out
  S['tile-st-ticket'] = tile(FURN, [['TTTTTTTTTTTTTTTT', 'TgTgTgTgTgTgTgTT', 'TTTTTTTTTTTTTTTT', 'RssssssssssssssR', 'RsssssssssssesR'.padEnd(15, 's') + 'R',
    'RssssssssssessR'.padEnd(15, 's') + 'R', 'RssssssssssssssR', 'RRRRRRRRRRRRRRRR', 'RRRRRkkkkkkRRRRR', 'RRRRRpppppkRRRRR', 'RRRRRpxpxpRRRRRR',
    'RrRrRrRrRrRrRrRR', 'RRRRRRRRRRRRRRRR', 'TTTTTTTTTTTTTTTT', 'dddddddddddddddd', 'cccccccccccccccc']]);
  // POPCORN PETE's snack counter: a glass case of popcorn over red and white stripes
  S['tile-st-snack'] = tile(FURN, [['TTTTTTTTTTTTTTTT', 'tttttttttttttttt', 'ssssssssssssssss', 'syYysssyyYsssyys', 'yyyyYsyyyyyYsyyy',
    'yYyyyyyyYyyyyyYy', 'yyyyyyyyyyyyyyyy', 'TTTTTTTTTTTTTTTT', 'xxwwxxwwxxwwxxww', 'xxwwxxwwxxwwxxww', 'xxwwxxwwxxwwxxww', 'xxwwxxwwxxwwxxww',
    'xxwwxxwwxxwwxxww', 'TTTTTTTTTTTTTTTT', 'dddddddddddddddd', 'cccccccccccccccc']]);
  // a row of theater seats (two to a tile)
  S['tile-st-seats'] = tile(FURN, [pad16(['', '', '..RRRRR...RRRRR.', '.RrrrrrR.RrrrrrR', '.RrLrrrR.RrLrrrR', '.RrrrrrR.RrrrrrR', '.RrrrrrR.RrrrrrR',
    '.RrrrrrR.RrrrrrR', '.RRRRRRR.RRRRRRR', 'gRrrrrrRgRrrrrrRg'.slice(0, 16), 'gRRRRRRRgRRRRRRR', 'g......g.......g'.slice(0, 16), 'G......G.......G'.slice(0, 16)])]);
  // the green room's squashy couch (two side by side make a sofa)
  S['tile-st-couch'] = tile(FURN, [pad16(['', '', '', '', '..NNNNNNNNNNNN..', '.NnnnnnnnnnnnnN.', '.NnnnnnnnnnnnnN.', 'NNnnnnnnnnnnnnNN', 'NnNNNNNNNNNNNNnN',
    'NnnnnnnnnnnnnnnN', 'NnnnnnnnnnnnnnnN', 'NNNNNNNNNNNNNNNN', '.T............T.', '.T............T.'])]);
  // a music stand with a page on it ("Measure 12")
  S['tile-st-stand'] = tile(FURN, [pad16(['', '...KKKKKKKKKK...', '...KppppppppK...', '...KpkPkkPkpK...', '...KppppppppK...', '...KpkkPkPkpK...', '...KppppppppK...',
    '...KKKKKKKKKK...', '.......KK.......', '.......KK.......', '.......KK.......', '.......KK.......', '......K..K......', '.....K....K.....', '....K......K....'])]);
  // the red velvet curtain: deep folds, swaying a pixel at the hem (2 frames, slow)
  const fold = 'lrrRRrrl';
  const curtain = i => Array.from({length: 16}, (_, y) => { const r = fold.repeat(3); const sh = i && y > 9 ? 1 : 0; return r.slice(sh, sh + 16); });
  S['tile-st-curtain'] = tile({r: 'q-stage-velvet', R: 'q-stage-velvet-d', l: 'q-stage-velvet-l'}, [curtain(0), curtain(1)], {fps: 1});

  /* ---------- THE OLD STAGE SPEAKER (the attic, Episode 2's way in): 32 × 40; frame 1 = its grille glowing red ---------- */
  function speaker(glow) {
    const g = grid(32, 40);
    rect(g, 1, 0, 30, 38, 's');
    [[1, 0], [28, 0], [1, 35], [28, 35]].forEach(([x, y]) => rect(g, x, y, 3, 3, 'T'));          // brass corners
    oval(g, 15.5, 8, 6, 4.6, 'S'); oval(g, 15.5, 8, 4.6, 3.3, 'g');                              // the tweeter
    oval(g, 15.5, 25, 12.5, 11, 'S'); oval(g, 15.5, 25, 11, 9.6, 'g');                           // the woofer
    for (let y = 16; y < 35; y++) for (let x = 5; x < 27; x++) if (g[y][x] === 'g' && (x + y) % 2 === 0) g[y][x] = 'G';   // the grille's mesh
    oval(g, 15.5, 25, 3, 2.6, 'S');
    rect(g, 3, 38, 5, 2, 'k'); rect(g, 24, 38, 5, 2, 'k');                                        // feet
    if (glow) g.forEach(r => r.forEach((v, x) => { if (v === 'S') r[x] = 'R'; else if (v === 'G') r[x] = 'r'; }));
    return text(outline(g));
  }
  S['stage-speaker'] = {w: 32, h: 40, fps: 2, palette: {s: 'q-stage-speaker', S: 'q-steel-d', g: 'q-stage-grille', G: 'q-grey-d', T: 'q-stage-trim-d',
    k: 'q-black', R: 'q-stage-glow-red', r: 'q-red', o: 'q-out'}, frames: [speaker(false), speaker(true)]};

  /* ---------- THE SHOWTIME BAND and the Lobby's staff (NPCs, 24 × 28) ---------- */
  const BOT = {o: 'q-out', b: 'q-steel', k: 'q-black', w: 'q-white', e: 'q-stage-eye', r: 'q-red', R: 'q-carpet-d', y: 'q-gold'};

  /* MAESTRO MOOSE: antlers, a felt muzzle, a tailcoat and a bow tie; red glitchy eyes; frozen with the baton up */
  function moose(beat, ok) {
    const g = grid(24, 28);
    line(g, 8, 6, 3, 2, 'a'); line(g, 5, 4, 5, 0, 'a'); line(g, 4, 3, 1, 1, 'a');               // the left antler…
    put(g, 6, 6, 'F'); put(g, 7, 6, 'F');
    mirror(g);                                                                                    // …and the right one
    oval(g, 11.5, 8.5, 4.6, 4.2, 'f');                                                            // the head
    oval(g, 11.5, 11, 3.4, 2.2, 'l'); put(g, 10, 11, 'F'); put(g, 13, 11, 'F');                   // the muzzle, nostrils
    rect(g, 9, 7, 1, 2, ok ? 'E' : 'e'); rect(g, 14, 7, 1, 2, ok ? 'E' : 'e');                    // red glitchy eyes (blue: un-glitched)
    put(g, 7, 9, 'b'); put(g, 16, 9, 'b'); rect(g, 11, 13, 2, 1, 'b');                            // bolts, the neck rod
    rect(g, 7, 14, 10, 8, 't'); rect(g, 10, 14, 4, 6, 'w');                                       // the tailcoat, the shirt
    put(g, 10, 14, 'r'); put(g, 11, 14, 'R'); put(g, 12, 14, 'R'); put(g, 13, 14, 'r');            // the bow tie
    put(g, 11, 17, 'k'); put(g, 12, 19, 'k');
    rect(g, 7, 22, 3, 2, 't'); rect(g, 14, 22, 3, 2, 't');                                        // coat tails
    rect(g, 10, 22, 1, 3, 'b'); rect(g, 13, 22, 1, 3, 'b'); rect(g, 8, 25, 3, 2, 'k'); rect(g, 13, 25, 3, 2, 'k');   // rods, boots
    line(g, 7, 15, 5, 20, 't', 2); rect(g, 4, 21, 2, 2, 'l');                                     // the left arm
    if (!beat) { line(g, 16, 15, 19, 10, 't', 2); rect(g, 19, 8, 2, 2, 'l'); line(g, 21, 8, 23, 4, 'w'); }   // FROZEN: baton up
    else { line(g, 16, 15, 20, 19, 't', 2); rect(g, 20, 20, 2, 2, 'l'); line(g, 22, 21, 23, 25, 'w'); if (!ok) { put(g, 19, 5, 'z'); put(g, 21, 3, 'z'); } }   // the downbeat (+ a spark while glitched)
    return text(outline(g));
  }
  const UP = moose(false), BEAT = moose(true);
  const MOOSE_P = Object.assign({}, BOT, {a: 'q-stage-antler', f: 'q-stage-moose', F: 'q-stage-moose-d', l: 'q-stage-moose-l', t: 'q-stage-coat', z: 'q-white', E: 'q-stage-eye-ok'});
  S['npc-moose'] = {w: 24, h: 28, fps: 2, palette: MOOSE_P, frames: [UP, UP, UP, UP, UP, BEAT]};
  // UN-GLITCHED (build step 5, the ending): blue eyes, conducting in time (up, down)
  S['npc-moose-ok'] = {w: 24, h: 28, fps: 2, palette: MOOSE_P, frames: [moose(false, true), moose(true, true)]};

  /* PROFESSOR HOOT: a felt owl in a mortarboard, reading the same page of a music book (it flips up, then back) */
  function hoot(flip, ok) {
    const g = grid(24, 28);
    oval(g, 11.5, 15, 6.5, 8, 'f'); oval(g, 11.5, 18, 4, 5, 'l');                                  // the body, the belly
    oval(g, 9, 11, 2.8, 2.6, 'l'); oval(g, 14, 11, 2.8, 2.6, 'l');                                 // the face discs
    rect(g, 8, 10, 2, 2, ok ? 'E' : 'e'); rect(g, 14, 10, 2, 2, ok ? 'E' : 'e'); put(g, 9, 10, 'k'); put(g, 14, 10, 'k'); // eyes (red: the static; blue: awake)
    rect(g, 11, 13, 2, 2, 'y');                                                                    // the beak
    rect(g, 5, 5, 14, 1, 'k'); rect(g, 8, 6, 8, 2, 'K'); line(g, 17, 5, 18, 9, 'y');               // the mortarboard + tassel
    put(g, 6, 14, 'b'); put(g, 17, 14, 'b');
    rect(g, 5, 16, 1, 5, 'F'); rect(g, 18, 16, 1, 5, 'F');                                         // wings holding the book
    rect(g, 6, 17, 12, 5, 'w'); rect(g, 11, 17, 2, 5, 'p');                                        // the open book
    [7, 8, 9, 14, 15, 16].forEach(x => { put(g, x, 18, 'K'); put(g, x, 20, 'K'); });
    if (flip) { rect(g, 13, 14, 4, 3, 'w'); put(g, 13, 16, 'p'); }                                 // a page lifts…
    rect(g, 9, 23, 1, 2, 'b'); rect(g, 14, 23, 1, 2, 'b'); rect(g, 8, 25, 3, 1, 'y'); rect(g, 13, 25, 3, 1, 'y');   // legs, feet
    return text(outline(g));
  }
  const READ = hoot(false);
  const HOOT_P = Object.assign({}, BOT, {f: 'q-stage-owl', F: 'q-stage-owl-d', l: 'q-stage-owl-l', K: 'q-grey-d', p: 'q-paper-d', E: 'q-stage-eye-ok'});
  S['npc-hoot'] = {w: 24, h: 28, fps: 2, palette: HOOT_P, frames: [READ, READ, READ, hoot(true)]};
  // AWAKE (hootAwake, data/maps/stage.js npc `awake`): the static let go: friendly blue eyes, still reading (a new page now)
  const READ_OK = hoot(false, true);
  S['npc-hoot-ok'] = {w: 24, h: 28, fps: 2, palette: HOOT_P, frames: [READ_OK, READ_OK, READ_OK, hoot(true, true)]};

  /* TICKET BOOTH TINA: a lavender ghost (Terry's cousin) with a ticket-taker's pillbox hat and a roll of tickets */
  function tina() {
    const g = grid(24, 28);
    oval(g, 11.5, 13, 7.6, 8.6, 'w'); rect(g, 4, 13, 16, 9, 'w');
    for (let x = 4; x < 20; x++) if (x % 4 < 2) put(g, x, 22, 'w');                                 // the wavy hem
    rect(g, 8, 10, 2, 2, 'k'); rect(g, 14, 10, 2, 2, 'k'); put(g, 7, 13, 'p'); put(g, 16, 13, 'p');   // eyes, cheeks
    put(g, 10, 14, 'm'); put(g, 13, 14, 'm'); put(g, 11, 15, 'm'); put(g, 12, 15, 'm');              // a smile
    rect(g, 8, 1, 8, 3, 'r'); rect(g, 8, 4, 8, 1, 'y'); rect(g, 9, 1, 2, 1, 'R');                    // the pillbox hat
    oval(g, 20, 16, 2, 2, 'P'); put(g, 20, 16, 'k'); rect(g, 19, 18, 2, 4, 'P'); put(g, 19, 19, 'r'); put(g, 20, 21, 'r');   // the ticket roll
    return text(outline(g, 'd'));
  }
  const T0 = tina();
  S['npc-tina'] = {w: 24, h: 28, fps: 2, palette: {d: 'q-ghost-d', w: 'q-ghost-2', k: 'q-black', p: 'q-cheek', m: 'q-out', r: 'q-red', R: 'q-pink', y: 'q-gold', P: 'q-paper'},
    frames: [T0, down(T0)]};

  /* POPCORN PETE: a striped popcorn bucket with a face, gloves and little shoes (a kernel pops now and then) */
  function pete(pop) {
    const g = grid(24, 28);
    for (let y = 10; y <= 24; y++) { const hw = 7 - (y - 10) * 2 / 14; for (let x = Math.round(11.5 - hw); x <= Math.round(11.5 + hw); x++) put(g, x, y, (x >> 1) % 2 ? 'x' : 'w'); }
    oval(g, 8, 8, 3, 2.5, 'y'); oval(g, 12, 6, 3.5, 3, 'y'); oval(g, 16, 8, 3, 2.5, 'y');           // the popcorn on top
    put(g, 7, 7, 'Y'); put(g, 12, 5, 'Y'); put(g, 15, 8, 'Y'); put(g, 10, 8, 'Y');
    rect(g, 7, 13, 10, 6, 'W');                                                                     // the label, with a face
    rect(g, 9, 14, 1, 2, 'k'); rect(g, 14, 14, 1, 2, 'k'); put(g, 10, 17, 'k'); put(g, 11, 18, 'k'); put(g, 12, 18, 'k'); put(g, 13, 17, 'k');
    line(g, 4, 14, 2, 18, 'K'); line(g, 19, 14, 21, 18, 'K'); rect(g, 1, 19, 2, 2, 'W'); rect(g, 21, 19, 2, 2, 'W');   // arms, gloves
    rect(g, 9, 25, 1, 2, 'K'); rect(g, 14, 25, 1, 2, 'K'); rect(g, 7, 27, 3, 1, 'k'); rect(g, 14, 27, 3, 1, 'k');      // legs, shoes
    if (pop) rect(g, 17, 1, 2, 2, 'y');                                                             // POP!
    return text(outline(g));
  }
  const P0 = pete(false);
  S['npc-pete'] = {w: 24, h: 28, fps: 2, palette: {o: 'q-out', x: 'q-stage-stripe', w: 'q-white', W: 'q-paper', y: 'q-stage-pop', Y: 'q-stage-pop-d', k: 'q-black', K: 'q-grey-d'},
    frames: [P0, down(P0), P0, down(pete(true))]};

  /* ---------- EPISODE 2's MACHINES (32 × 32, like Episode 1's ghosts: idle, idle, happy). Glitching = red eyes (the
     static); happy (befriended) = friendly blue eyes. Silly stage machines, never scary: nobody inside them. ---------- */
  const MP = {o: 'q-out', k: 'q-black', K: 'q-grey-d', w: 'q-white', e: 'q-stage-eye', E: 'q-stage-eye-ok', b: 'q-steel', B: 'q-steel-d',
    y: 'q-gold', Y: 'q-brass-d', r: 'q-red', R: 'q-stage-velvet-d', p: 'q-pink', P: 'q-purple', m: 'q-out', s: 'q-stage-bulb', S: 'q-stage-bulb-off',
    t: 'q-stage-trim', T: 'q-stage-trim-d', W: 'q-wood', l: 'q-wood-l', c: 'q-paper', C: 'q-paper-d', g: 'q-green', G: 'q-cursor', v: 'q-stage-velvet'};
  const machine = (draw) => ({w: 32, h: 32, fps: 2, palette: MP, frames: [0, 1, 2].map(f => { const g = grid(32, 32); draw(g, f); return text(outline(g)); })});
  /** a cartoon eye: white with a pupil (red while glitching, blue when happy) */
  const eye = (g, x, y, happy) => { rect(g, x, y, 2, 2, 'w'); put(g, x + 1, y + 1, happy ? 'E' : 'e'); };
  const smile = (g, x, y, w) => { put(g, x, y, 'm'); put(g, x + w - 1, y, 'm'); rect(g, x + 1, y + 1, w - 2, 1, 'm'); };
  const note = (g, x, y) => { rect(g, x, y, 2, 2, 'y'); rect(g, x + 1, y - 4, 1, 4, 'y'); put(g, x + 2, y - 4, 'y'); };

  /* TAPSY: a pair of tap shoes dancing by themselves (one heel up, then the other), shiny, metal taps, little bows */
  function shoe(g, x, y, happy) {
    rect(g, x + 1, y - 5, 6, 6, 'w'); rect(g, x + 1, y - 5, 6, 1, 'c');                  // a white spat (the ankle)
    oval(g, x + 7, y + 4, 7, 3.6, 'k'); rect(g, x + 1, y + 3, 4, 5, 'k');               // the shoe and its heel
    rect(g, x + 1, y + 8, 4, 1, 'b'); rect(g, x + 8, y + 7, 6, 1, 'b');                 // the taps
    put(g, x + 11, y + 2, 'K'); put(g, x + 12, y + 2, 'K');                             // shine
    eye(g, x + 6, y + 2, happy); eye(g, x + 10, y + 2, happy);
    rect(g, x + 3, y - 2, 3, 1, 'r'); put(g, x + 2, y - 3, 'r'); put(g, x + 6, y - 3, 'r');   // a bow on the spat
  }
  S.tapsy = machine((g, f) => {
    shoe(g, 0, f === 0 ? 17 : 21, f === 2); shoe(g, 16, f === 1 ? 17 : 21, f === 2);
    if (f === 2) { note(g, 14, 8); note(g, 27, 5); }
  });
  /* TOM-TOM TERMITE (designed by a Raven Band student): a termite on a little tom-tom, two chewed-down drumsticks
     (up, then down on the drumhead; notes when happy). Not one of the 20 machines: a bonus friend in the Workshop */
  S.termite = machine((g, f) => {
    oval(g, 16, 26, 8, 3, 'r'); rect(g, 8, 23, 17, 4, 'r'); oval(g, 16, 23, 8, 2.4, 'c');   // the tom-tom: its shell, its head
    rect(g, 8, 25, 17, 1, 'y'); put(g, 10, 27, 'Y'); put(g, 22, 27, 'Y');                     // the rim, two lugs
    oval(g, 16, 18, 5, 3.4, 'W'); oval(g, 16, 13, 4.5, 3.4, 'l'); oval(g, 16, 7, 5.5, 4.5, 'l');   // abdomen, thorax, head
    rect(g, 13, 11, 6, 1, 'W'); rect(g, 13, 16, 6, 1, 'l');                                   // the segments
    line(g, 13, 3, 9, 0, 'k'); line(g, 19, 3, 23, 0, 'k');                                    // antennae
    eye(g, 13, 6, f === 2); eye(g, 18, 6, f === 2);
    if (f === 2) smile(g, 14, 9, 4); else { rect(g, 14, 10, 4, 1, 'm'); put(g, 14, 11, 'w'); put(g, 17, 11, 'w'); }   // little mandibles
    if (f === 1) { line(g, 11, 14, 6, 21, 'C', 1); line(g, 21, 14, 26, 21, 'C', 1); put(g, 6, 21, 'c'); put(g, 26, 21, 'c'); }   // sticks down on the drum
    else { line(g, 11, 13, 4, 9, 'C', 1); line(g, 21, 13, 28, 9, 'C', 1); put(g, 4, 9, 'c'); put(g, 28, 9, 'c'); }            // sticks up
    if (f === 2) { note(g, 2, 6); note(g, 27, 4); }
  });
  /* SPOTLIGHT SPRITE: a little stage light on a yoke, its lens a bulb (dim, bright, beaming when happy) */
  S.spotlight = machine((g, f) => {
    line(g, 6, 28, 10, 22, 'K', 2); line(g, 25, 28, 21, 22, 'K', 2); rect(g, 9, 21, 14, 2, 'K');   // the stand and its yoke
    rect(g, 8, 8, 16, 13, 'B'); rect(g, 9, 9, 14, 11, 'b');                              // the can
    oval(g, 16, 6, 6, 4, 'Y'); oval(g, 16, 6, 4.6, 2.8, f === 1 ? 'S' : 's');           // the lens (dims, then comes back)
    eye(g, 11, 12, f === 2); eye(g, 19, 12, f === 2);
    if (f === 2) { smile(g, 13, 16, 6); line(g, 12, 1, 8, 0, 's'); line(g, 20, 1, 24, 0, 's'); } else rect(g, 14, 17, 4, 1, 'm');
    rect(g, 6, 13, 2, 3, 'K'); rect(g, 24, 13, 2, 3, 'K');                               // the yoke's knobs
  });
  /* FEEDBACK FUZZ: a squealing ball of feedback on a bad cable (its spikes jitter; smooth and round when happy) */
  S.feedback = machine((g, f) => {
    oval(g, 16, 14, 9, 8.5, 'p'); oval(g, 16, 14, 6, 5.5, 'P');
    if (f !== 2) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + (f ? .26 : 0), r = k % 2 ? 11 : 12.5; line(g, Math.round(16 + Math.cos(a) * 8), Math.round(14 + Math.sin(a) * 8), Math.round(16 + Math.cos(a) * r), Math.round(14 + Math.sin(a) * r), 'p'); }
    eye(g, 11, 10, f === 2); eye(g, 19, 10, f === 2);
    if (f === 2) smile(g, 13, 17, 6); else { oval(g, 16, 18, 2.6, 2, 'm'); rect(g, 15, 17, 2, 1, 'w'); }   // EEEEE!
    line(g, 16, 23, 14, 27, 'k'); line(g, 14, 27, 20, 29, 'k'); rect(g, 20, 27, 4, 4, 'Y'); rect(g, 24, 28, 2, 1, 'b'); rect(g, 24, 30, 2, 1, 'b');   // the cable and its plug
  });
  /* CONFETTI CANNON: a little party cannon on wheels (confetti puffs out; a big burst when happy) */
  S.confetti = machine((g, f) => {
    line(g, 12, 20, 21, 9, 'v', 6); line(g, 13, 19, 20, 10, 'y', 1);                     // the barrel, a gold stripe
    oval(g, 22, 8, 3.5, 3.5, 'R');                                                        // its mouth
    rect(g, 6, 18, 16, 7, 'v'); rect(g, 6, 20, 16, 1, 'y');                              // the body
    oval(g, 9, 26, 3.5, 3.5, 'W'); oval(g, 19, 26, 3.5, 3.5, 'W'); put(g, 9, 26, 'l'); put(g, 19, 26, 'l');   // wheels
    eye(g, 9, 21, f === 2); eye(g, 15, 21, f === 2);
    const bits = f === 2 ? [[26, 2, 'p'], [28, 6, 'G'], [24, 1, 'y'], [29, 2, 'g'], [22, 0, 'G'], [27, 10, 'y'], [30, 8, 'p']] : f ? [[26, 4, 'p'], [27, 1, 'y']] : [[25, 3, 'G'], [28, 2, 'p']];
    bits.forEach(([x, y, c]) => rect(g, x, y, 2, 2, c));
  });
  /* METRO-GNOME: a tiny pyramid metronome in a pointy gnome hat with a beard; its pendulum ticks left, right */
  S.metrognome = machine((g, f) => {
    for (let y = 12; y <= 29; y++) { const hw = 3 + (y - 12) * .5; rect(g, Math.round(16 - hw), y, Math.round(hw * 2), 1, 'W'); }   // the wooden body
    rect(g, 9, 28, 14, 2, 'l');
    for (let y = 1; y <= 11; y++) { const hw = (y - 1) * .55; rect(g, Math.round(16 - hw), y, Math.max(1, Math.round(hw * 2)), 1, 'r'); }   // the pointy hat
    rect(g, 9, 11, 14, 2, 'r');
    eye(g, 12, 14, f === 2); eye(g, 18, 14, f === 2);
    oval(g, 16, 20, 5, 3, 'w');                                                           // the beard
    const tip = f === 0 ? 9 : f === 1 ? 23 : 16;
    line(g, 16, 27, tip, 17, 'b'); rect(g, tip - 1, 19, 3, 2, 'Y');                     // the pendulum and its weight
    if (f === 2) note(g, 27, 8);
  });
  /* TICKET STUBS: a swarm of torn tickets; the one in front has a face (they shuffle; a neat fan when happy) */
  function ticket(g, x, y, face, happy) {
    rect(g, x, y, 12, 7, 'c'); rect(g, x, y + 1, 12, 1, 'r'); rect(g, x + 8, y, 1, 7, 'C');   // paper, a red stripe, the perforation
    put(g, x + 11, y + 6, '.'); put(g, x + 11, y + 5, '.');                                // torn
    if (face) { eye(g, x + 2, y + 3, happy); eye(g, x + 5, y + 3, happy); }
  }
  S.stubs = machine((g, f) => {
    const spots = f === 2 ? [[3, 6], [17, 6], [10, 3]] : f ? [[4, 4], [18, 9], [12, 2]] : [[2, 9], [19, 5], [13, 1]];
    spots.forEach(([x, y]) => ticket(g, x, y, false));
    ticket(g, 9, 16, true, f === 2);
    if (f === 2) smile(g, 11, 24, 4);
  });
  /* ROPE KNOT: a curtain rope in a terrible knot, a tassel on one end (its ends swing; hanging free when happy) */
  S.ropeknot = machine((g, f) => {
    if (f === 2) { line(g, 16, 0, 16, 22, 't', 3); line(g, 17, 0, 17, 22, 'T'); }
    else {
      oval(g, 12, 13, 7, 6, 't'); oval(g, 20, 15, 7, 6, 't'); oval(g, 12, 13, 3.5, 2.8, '.'); oval(g, 20, 15, 3.5, 2.8, '.');
      line(g, 9, 9, 23, 19, 'T', 2); line(g, 6, 2, 9, 9, 't', 3);
      line(g, 26, 18, f ? 29 : 25, 24, 't', 3);
    }
    const ex = f === 2 ? 15 : f ? 28 : 24, ey = f === 2 ? 23 : 24;
    rect(g, ex, ey, 4, 2, 'y'); for (let i = 0; i < 4; i++) line(g, ex + i, ey + 2, ex + i, ey + 6, 'Y');   // the tassel
    eye(g, f === 2 ? 13 : 10, f === 2 ? 8 : 11, f === 2); eye(g, f === 2 ? 18 : 19, f === 2 ? 8 : 13, f === 2);
    if (f === 2) smile(g, 14, 12, 4);
  });
  /* MIC-LET: a tiny walking retro microphone with one small red light (the big Microphone's lonely helper) */
  S.miclet = machine((g, f) => {
    oval(g, 16, 9, 7, 7, 'b'); oval(g, 16, 9, 5.6, 5.6, 'B');                            // the grille
    for (let y = 4; y < 15; y++) for (let x = 11; x < 22; x++) if (g[y][x] === 'B' && (x + y) % 2) g[y][x] = 'K';
    eye(g, 12, 7, f === 2); eye(g, 18, 7, f === 2);
    if (f === 2) smile(g, 14, 11, 4);
    rect(g, 13, 15, 6, 3, 'b');                                                           // the collar
    rect(g, 14, 18, 4, 7, 'k'); put(g, 16, 20, f === 2 ? 'g' : 'r'); put(g, 16, 21, f === 2 ? 'g' : 'r');   // the handle, its little light
    const l = f === 1 ? 1 : 0;
    rect(g, 13, 25, 2, 3 + l, 'k'); rect(g, 17, 25, 2, 4 - l, 'k');                       // legs, walking
    rect(g, 11, 28 + l, 4, 2, 'K'); rect(g, 17, 29 - l, 4, 2, 'K');                       // shoes
    if (f === 2) note(g, 25, 8);
  });

  /* ---------- the machines' dodge pieces (battle/dodge.js) ---------- */
  // (the dodge box is black: a white spat and a grey shoe, so it shows)
  S['tap-shot'] = {w: 8, h: 7, palette: {k: 'q-grey-d', K: 'q-grey', b: 'q-steel', w: 'q-white', r: 'q-red'}, frames: [['.www....', '.wrw....', '.www....', '.kkkkk..', 'kkkkKkkk', 'kk...kkk', 'bb...bbb']]};
  S['squeal-shot'] = {w: 6, h: 5, palette: {p: 'q-pink', w: 'q-white'}, frames: [['.pp...', 'p..p..', '....p.', '.....p', '....pw']]};
  S['stub-shot'] = {w: 7, h: 4, palette: {c: 'q-paper', r: 'q-red', C: 'q-paper-d'}, frames: [['crrrrCc', 'ccccCcc', 'ccccCcc', 'ccccCc.']]};

  /* ---------- BUILD STEP 3: THE ORCHESTRA PIT, THE PROP WORKSHOP, BACKSTAGE, THE BALCONY (16 × 16 tiles; each room's
     map, data/maps/stage.js, says which letter draws which in that room: its `legend`) ---------- */
  /** a 16 × 16 tile drawn with the helpers: draw(g) on a grid filled with `fill` */
  const drawn = (fill, draw) => { const g = grid(16, 16); if (fill) rect(g, 0, 0, 16, 16, fill); draw(g); return text(g); };
  // THE PIT's floor: dark planks (a seam on each plank, never in the same place)
  const PIT = {p: 'q-stage-pit', d: 'q-stage-pit-d', l: 'q-stage-board-d', c: 'q-paper', C: 'q-paper-d', k: 'q-grey-d', K: 'q-black',
    g: 'q-brass', G: 'q-brass-d', h: 'q-paper', W: 'q-wood', w: 'q-wood-l', v: 'q-void', b: 'q-stage-board', B: 'q-stage-board-d', T: 'q-stage-trim-d', t: 'q-stage-trim'};
  const pitFloor = g => { for (let y = 0; y < 16; y++) { if (y % 4 === 3) rect(g, 0, y, 16, 1, 'd'); else put(g, [5, 11, 3, 9][y >> 2], y, 'd'); } put(g, 13, 1, 'l'); put(g, 2, 9, 'l'); };
  S['tile-st-pitfloor'] = tile(PIT, [drawn('p', pitFloor)]);
  // sheet music dropped on the floor (two pages, staff lines and a few notes)
  S['tile-st-sheets'] = tile(PIT, [drawn('p', g => {
    pitFloor(g); rect(g, 2, 3, 8, 7, 'c'); [4, 6, 8].forEach(y => rect(g, 3, y, 6, 1, 'k')); put(g, 4, 5, 'K'); put(g, 7, 7, 'K'); put(g, 6, 4, 'K');
    rect(g, 9, 8, 6, 6, 'C'); [10, 12].forEach(y => rect(g, 10, y, 4, 1, 'k')); put(g, 11, 11, 'K');
  })]);
  // the pit rail: the stage's edge above, a brass rail, the pit's dark front wall
  S['tile-st-rail'] = tile(PIT, [drawn('d', g => {
    rect(g, 0, 0, 16, 5, 'b'); rect(g, 0, 2, 16, 1, 'B'); put(g, 6, 0, 'B'); put(g, 12, 3, 'B'); rect(g, 0, 5, 16, 1, 't'); rect(g, 0, 6, 16, 1, 'T');
    rect(g, 0, 8, 16, 1, 'g'); [1, 8, 14].forEach(x => rect(g, x, 8, 1, 4, 'G')); rect(g, 0, 12, 16, 1, 'K'); put(g, 4, 14, 'p'); put(g, 11, 13, 'p');
  })]);
  // a timpani (a copper kettle drum): its head, the rim, the bowl, little legs
  S['tile-st-timpani'] = tile(PIT, [drawn(null, g => {
    oval(g, 7.5, 9, 6.5, 4.5, 'g'); oval(g, 7.5, 8, 5, 2.5, 'G'); oval(g, 7.5, 5.5, 6.5, 2.2, 'h'); rect(g, 1, 5, 14, 1, 'K');
    put(g, 5, 4, 'C'); put(g, 10, 6, 'C'); rect(g, 3, 13, 1, 3, 'K'); rect(g, 12, 13, 1, 3, 'K'); rect(g, 7, 13, 2, 3, 'K');
  })]);
  // THE TRAP DOOR under Tubby: shut (a wooden hatch with a brass ring), then open (a ladder down into the dark)
  S['tile-st-trap'] = tile(PIT, [drawn('p', g => {
    pitFloor(g); rect(g, 2, 2, 12, 12, 'T'); rect(g, 3, 3, 10, 10, 'W'); [5, 8, 11].forEach(x => rect(g, x, 3, 1, 10, 'w')); oval(g, 7.5, 8, 1.6, 1.6, 'g'); put(g, 7, 8, 'W'); put(g, 8, 8, 'W');
  })]);
  S['tile-st-trap-open'] = tile(PIT, [drawn('p', g => {
    pitFloor(g); rect(g, 2, 2, 12, 12, 'T'); rect(g, 3, 3, 10, 10, 'v'); rect(g, 4, 3, 1, 10, 'W'); rect(g, 11, 3, 1, 10, 'W'); [4, 7, 10].forEach(y => rect(g, 5, y, 6, 1, 'w'));
  })]);

  // THE WORKSHOP: a workbench (a block of wood and a paintbrush on it), paint cans, a cardboard moon, a sawhorse
  const SHOP = Object.assign({}, BOARD, {W: 'q-wood', w: 'q-wood-l', k: 'q-black', K: 'q-grey-d', b: 'q-blue', B: 'q-blue-d', r: 'q-red', y: 'q-gold',
    g: 'q-green', c: 'q-paper', C: 'q-paper-d', e: 'q-moon', s: 'q-steel', t: 'q-stage-trim', T: 'q-stage-trim-d'});
  S['tile-st-bench'] = tile(SHOP, [drawn(null, g => {
    rect(g, 0, 5, 16, 3, 'W'); rect(g, 0, 5, 16, 1, 'w'); rect(g, 1, 8, 2, 7, 'W'); rect(g, 13, 8, 2, 7, 'W'); rect(g, 1, 12, 14, 1, 'w');
    rect(g, 3, 2, 4, 3, 'w'); rect(g, 3, 2, 4, 1, 'C'); line(g, 9, 4, 13, 2, 'y'); rect(g, 13, 1, 2, 2, 'r');               // a wood block, a paintbrush
  })]);
  S['tile-st-paint'] = tile(SHOP, [drawn(null, g => {
    [[1, 'r'], [6, 'b'], [11, 'y']].forEach(([x, c], i) => {
      const y = 6 + (i % 2) * 2; rect(g, x, y, 4, 7, 's'); rect(g, x, y, 4, 1, c); rect(g, x, y + 3, 4, 2, c); put(g, x + 1, y - 1, 'K'); put(g, x + 2, y - 1, 'K');
      put(g, x + 3, y + 1, c); put(g, x + 3, y + 2, c);                                                                    // a friendly drip
    });
  })]);
  S['tile-st-moon'] = tile(SHOP, [drawn(null, g => {
    oval(g, 7.5, 7, 7, 6.8, 'e'); oval(g, 12, 5, 5, 5, '.');                                                             // a big crescent
    g.forEach((r, y) => r.forEach((v, x) => { if (v === 'e' && (x + y) % 9 === 0) r[x] = 'C'; }));                              // cardboard spots
    put(g, 4, 6, 'k'); put(g, 3, 9, 'K'); put(g, 4, 10, 'K'); put(g, 5, 10, 'K'); rect(g, 7, 13, 2, 3, 'W'); rect(g, 4, 15, 8, 1, 'W');          // a sleepy eye, a smile, its stand
  })]);
  S['tile-st-sawhorse'] = tile(SHOP, [drawn(null, g => {
    rect(g, 0, 6, 16, 2, 'W'); rect(g, 0, 6, 16, 1, 'w'); line(g, 3, 8, 1, 15, 'W', 2); line(g, 5, 8, 6, 15, 'W', 2); line(g, 11, 8, 10, 15, 'W', 2); line(g, 13, 8, 14, 15, 'W', 2);
  })]);
  // the half-painted backdrop on the back wall: a blue sky with a cloud above, plain canvas below
  S['tile-st-backdrop'] = tile(Object.assign({}, WALL, SHOP), [over(FACE, ['', '', 'ttttttttttttttt.', 'tbbbbbbbbbbbbbt.', 'tbbcccbbbbbbbbt.', 'tbcccccbbbbccbt.',
    'tbbbbbbbbbbbbbt.', 'tbbbBbbbbbBBbbt.', 'tccccccccccccct.', 'tcccCccccccccct.', 'tccccccccCccccT.', 'ttttttttttttttt.'])]);
  // THE LADDER up into the fly loft (in the wall; Snapjaw Sal clears it). Also the way up through the trap door.
  const LADDER = DOORWAY.concat(Array.from({length: 13}, (_, i) => (i % 3 === 1 ? 'WWtvlwwwwwwlvtWW' : 'WWtvlvvvvvvlvtWW')));
  S['tile-st-ladder'] = tile(Object.assign({l: 'q-wood', w: 'q-wood-l'}, WALL), [LADDER]);

  // BACKSTAGE: black-painted walls (rope lines, the QUIET PLEASE sign), dark boards, sandbags, road cases, the desk
  const BACK = {k: 'q-black', K: 'q-grey-d', g: 'q-grey', r: 'q-paper-d', R: 'q-plank-d', v: 'q-void', b: 'q-steel', B: 'q-steel-d', y: 'q-gold',
    c: 'q-paper', C: 'q-paper-d', W: 'q-wood', w: 'q-wood-l', s: 'q-stage-velvet', S: 'q-stage-velvet-d', L: 'q-stage-red-lit', l: 'q-stage-bulb',
    p: 'q-stage-board-d', P: 'q-stage-pit-d', n: 'q-green', N: 'q-green-d', e: 'q-stage-glow'};
  const BFACE = ['KKKKKKKKKKKKKKKK', 'kkkkkkkkkkkkkkkk', 'kkkkkkkKkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkKkkkkkkkkkkkk', 'kkkkkkkkkkkkKkkk', 'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk', 'kkkkkkKkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkKkkkk', 'kkkkkkkkkkkkkkkk', 'kKkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'KKKKKKKKKKKKKKKK', 'kkkkkkkkkkkkkkkk'];
  S['tile-st-bwall'] = tile(BACK, [BFACE]);
  // rope lines up to the flies, tied off on a cleat rail
  S['tile-st-ropes'] = tile(BACK, [over(BFACE, Array.from({length: 16}, (_, y) => [...'................'].map((c, x) =>
    ([3, 7, 12].includes(x) ? (y === 11 && x === 7 ? 'W' : 'r') : y === 11 && x > 5 && x < 10 ? 'b' : '.')).join('')))]);
  // the QUIET PLEASE sign (lit red); every other second the static adds "PLEASE PLEASE" (one more lit line, a slow change)
  const quiet = more => over(BFACE, ['', '', '.BBBBBBBBBBBBBB.', '.BLLLLLLLLLLLLB.', '.BLlLlLlLlLlLLB.', '.BLLLLLLLLLLLLB.', '.BLlLlLlLlLlLLB.', '.BLLLLLLLLLLLLB.',
    more ? '.BLlLlLlLlLlLLB.' : '.BBBBBBBBBBBBBB.', more ? '.BLLLLLLLLLLLLB.' : '', more ? '.BBBBBBBBBBBBBB.' : '']);
  S['tile-st-quiet'] = tile(BACK, [quiet(false), quiet(true)], {fps: 0.5});
  const BDOOR = ['KKKKKKKKKKKKKKKK', 'kkkkkkkkkkkkkkkk', 'kkKKKKKKKKKKKKkk'];
  S['tile-st-bdoor'] = tile(Object.assign({t: 'q-stage-trim'}, BACK), [BDOOR.concat(Array.from({length: 13}, (_, i) => (i === 5 ? 'kkKvvvvvvvvvyKkk' : 'kkKvvvvvvvvvvKkk')))]);
  // the wings: a gap in the black wall with the red curtain behind it (down: the show isn't on yet)
  S['tile-st-wings'] = tile(BACK, [BDOOR.concat(Array.from({length: 13}, (_, y) => 'kkK' + 'sSssSssSss'.slice(0, 10) + 'Kkk'))]);
  S['tile-st-bladder'] = tile(Object.assign({l: 'q-wood', w: 'q-wood-l'}, BACK), [BDOOR.concat(Array.from({length: 13}, (_, i) => (i % 3 === 1 ? 'kkKvlwwwwwwlvKkk' : 'kkKvlvvvvvvlvKkk')))]);
  const bfloor = g => { for (let y = 0; y < 16; y++) { if (y % 4 === 3) rect(g, 0, y, 16, 1, 'P'); else put(g, [9, 3, 12, 6][y >> 2], y, 'P'); } };
  S['tile-st-bfloor'] = tile(BACK, [drawn('p', bfloor)]);
  S['tile-st-sandbags'] = tile(BACK, [drawn(null, g => {
    [[1, 9], [8, 9], [4.5, 4]].forEach(([x, y]) => { oval(g, x + 3, y + 3, 3.6, 2.8, 'C'); oval(g, x + 3, y + 2.4, 2.6, 1.6, 'c'); put(g, Math.round(x + 3), y, 'K'); });
    rect(g, 7, 0, 1, 5, 'r');                                                                                                   // its rope, up to the flies
  })]);
  S['tile-st-case'] = tile(BACK, [drawn(null, g => {
    rect(g, 1, 3, 14, 12, 'k'); rect(g, 1, 3, 14, 1, 'K'); [[1, 3], [13, 3], [1, 13], [13, 13]].forEach(([x, y]) => rect(g, x, y, 2, 2, 'b'));
    rect(g, 3, 8, 10, 2, 'y'); put(g, 7, 6, 'B'); put(g, 8, 6, 'B'); rect(g, 6, 5, 4, 1, 'B');                              // a stencil stripe, a handle
  })]);
  // the stage manager's desk: one tile with the lamp (glowing), one with THE CLIPBOARD (the show's running order)
  const desk = g => { rect(g, 0, 7, 16, 3, 'W'); rect(g, 0, 7, 16, 1, 'w'); rect(g, 1, 10, 2, 6, 'W'); rect(g, 13, 10, 2, 6, 'W'); };
  S['tile-st-desk-lamp'] = tile(BACK, [drawn(null, g => { desk(g); rect(g, 4, 6, 4, 1, 'K'); line(g, 6, 6, 8, 2, 'K'); oval(g, 10, 2, 3, 1.6, 'n'); rect(g, 8, 3, 5, 1, 'N'); rect(g, 9, 4, 3, 1, 'e'); })]);
  S['tile-st-desk-clip'] = tile(BACK, [drawn(null, g => { desk(g); rect(g, 4, 2, 7, 5, 'c'); rect(g, 6, 1, 3, 2, 'b'); [3, 4, 5].forEach(y => rect(g, 5, y, 5, 1, 'C')); })]);

  // THE BALCONY: the railing, the dark drop down to the stage, the curtain far below (a gap: the Microphone peeks
  // through it), a follow-spot on its stand
  const BAL = Object.assign({}, FURN, {v: 'q-void', V: 'q-stage-pit', r: 'q-stage-velvet-d', R: 'q-stage-wall-d', l: 'q-stage-velvet', s: 'q-steel', S: 'q-steel-d'});
  S['tile-st-railing'] = tile(BAL, [drawn(null, g => { rect(g, 0, 4, 16, 2, 'g'); rect(g, 0, 6, 16, 1, 'G'); [1, 6, 11].forEach(x => rect(g, x, 7, 2, 7, 'g')); rect(g, 0, 14, 16, 2, 'G'); })]);
  S['tile-st-drop'] = tile(BAL, [drawn('v', g => { rect(g, 0, 12, 16, 4, 'V'); put(g, 3, 14, 'y'); put(g, 11, 13, 'y'); })]);
  const farCurtain = gap => drawn('R', g => { for (let x = 0; x < 16; x++) for (let y = 2; y < 16; y++) put(g, x, y, x % 4 === 1 ? 'l' : 'r'); if (gap) rect(g, 6, 2, 4, 14, 'v'); rect(g, 0, 0, 16, 2, 'v'); });
  S['tile-st-view'] = tile(BAL, [farCurtain(false)]);
  S['tile-st-gap'] = tile(BAL, [farCurtain(true)]);
  S['tile-st-followspot'] = tile(BAL, [drawn(null, g => {
    line(g, 7, 9, 3, 15, 'S'); line(g, 8, 9, 8, 15, 'S'); line(g, 9, 9, 13, 15, 'S');
    rect(g, 2, 3, 10, 6, 's'); rect(g, 2, 3, 10, 1, 'S'); oval(g, 12.5, 6, 2, 3, 'y'); rect(g, 0, 5, 2, 2, 'S');
  })]);

  /* TUBBY TUSK: a walrus in felt with ivory tusks, hugging a big brass tuba (its bell over his shoulder). Glitched: red
     eyes and one low note pouring out of the bell (BWAAAAA); awake: blue eyes, the tuba resting, a smile */
  function tusk(f, ok) {
    const g = grid(24, 28);
    oval(g, 11.5, 19, 8, 8, 'f'); oval(g, 11.5, 21, 5, 5, 'l');                                    // the body, the belly
    oval(g, 11, 8, 6, 5.2, 'f');                                                                    // the head
    oval(g, 11, 11, 4, 2.2, 'l'); [8, 10, 12, 14].forEach(x => put(g, x, 11, 'F'));               // the muzzle, whiskers
    line(g, 9, 13, 9, 17, 'u', 1); line(g, 13, 13, 13, 17, 'u', 1);                               // the tusks
    rect(g, 7, 6, 2, 2, ok ? 'E' : 'e'); rect(g, 13, 6, 2, 2, ok ? 'E' : 'e'); put(g, 11, 9, 'k');  // eyes (red: the static), nose
    put(g, 5, 9, 'b'); put(g, 17, 9, 'b');                                                          // bolts
    oval(g, 15, 20, 4.5, 4.5, 'g'); oval(g, 15, 20, 2.6, 2.6, 'G'); oval(g, 15, 20, 1.2, 1.2, 'g'); // the tuba's coil
    rect(g, 18, 6, 3, 12, 'g'); rect(g, 19, 7, 1, 10, 'G'); oval(g, 19.5, 4.5, 4, 2, 'g'); rect(g, 17, 4, 6, 1, 'G');   // its bell
    line(g, 12, 13, 14, 16, 'G');                                                                   // the mouthpiece
    rect(g, 4, 25, 5, 2, 'F'); rect(g, 14, 25, 5, 2, 'F');                                          // flippers
    if (!ok) { const w = f ? 1 : 0; put(g, 21 + w, 1, 'z'); put(g, 23, 2 + w, 'z'); put(g, 20, 0, 'z'); }   // BWAAAA: the note's ripples
    else if (f) { put(g, 10, 12, 'k'); put(g, 12, 12, 'k'); }                                        // awake: a smile under the whiskers
    return text(outline(g));
  }
  const TUSK_P = Object.assign({}, BOT, {f: 'q-stage-walrus', F: 'q-stage-walrus-d', l: 'q-stage-walrus-l', u: 'q-stage-tusk', g: 'q-brass', G: 'q-brass-d', z: 'q-stage-glow-red', E: 'q-stage-eye-ok'});
  S['npc-tusk'] = {w: 24, h: 28, fps: 3, palette: TUSK_P, frames: [tusk(0), tusk(1)]};
  S['npc-tusk-ok'] = {w: 24, h: 28, fps: 1, palette: TUSK_P, frames: [tusk(0, true), tusk(1, true)]};

  /* SNAPJAW SAL: a felt gator with a long snout and a snare drum on a strap. Glitched: red eyes and a drum roll that
     never ends (the sticks take turns, fast); awake: blue eyes, sticks crossed, a big toothy (friendly) grin */
  function sal(f, ok) {
    const g = grid(24, 28);
    oval(g, 10, 17, 6.5, 7, 'f'); oval(g, 10, 18, 4, 5, 'l');                                       // the body, the belly
    line(g, 4, 22, 0, 26, 'f', 2);                                                                  // the tail
    oval(g, 8, 8, 5, 4.4, 'f'); rect(g, 10, 6, 12, 5, 'f'); rect(g, 10, 6, 12, 1, 'l');              // the head, the long snout
    [12, 15, 18, 21].forEach(x => put(g, x, 11, 'w')); put(g, 20, 7, 'k');                         // teeth (friendly ones), a nostril
    oval(g, 6, 4, 2, 1.8, 'f'); oval(g, 10, 4, 2, 1.8, 'f');                                         // eye bumps
    rect(g, 5, 4, 2, 2, ok ? 'E' : 'e'); rect(g, 9, 4, 2, 2, ok ? 'E' : 'e');                      // eyes
    put(g, 3, 9, 'b'); put(g, 15, 12, 'b');
    rect(g, 6, 19, 14, 5, 'd'); rect(g, 6, 18, 14, 1, 'h'); rect(g, 6, 18, 14, 1, 'h'); rect(g, 6, 24, 14, 1, 'b'); rect(g, 6, 19, 14, 1, 'b');   // the snare
    [8, 11, 14, 17].forEach(x => rect(g, x, 20, 1, 4, 'D'));                                        // its lugs
    rect(g, 6, 25, 3, 2, 'F'); rect(g, 13, 25, 3, 2, 'F');                                          // feet
    if (ok) { line(g, 9, 17, 15, 12, 'W'); line(g, 15, 17, 9, 12, 'W'); }                            // awake: sticks crossed
    else if (f) { line(g, 9, 17, 6, 12, 'W'); line(g, 15, 18, 18, 16, 'W'); }                         // the roll: one stick up…
    else { line(g, 9, 18, 6, 16, 'W'); line(g, 15, 17, 18, 12, 'W'); }                               // …then the other
    return text(outline(g));
  }
  const SAL_P = Object.assign({}, BOT, {f: 'q-stage-gator', F: 'q-stage-gator-d', l: 'q-stage-gator-l', d: 'q-stage-drum', D: 'q-brass-d', h: 'q-stage-drumhead', W: 'q-wood-l', E: 'q-stage-eye-ok'});
  S['npc-sal'] = {w: 24, h: 28, fps: 6, palette: SAL_P, frames: [sal(0), sal(1)]};
  S['npc-sal-ok'] = {w: 24, h: 28, fps: 1, palette: SAL_P, frames: [sal(0, true), down(sal(0, true))]};

  /* ---------- BUILD STEP 4: THE DRESSING ROOMS, THE VENT, THE FLY LOFT, RICO BANDIT ---------- */
  // THE DRESSING ROOMS: a makeup table (under each mirror), a costume rack, the STAR DOOR to the stage (shut / open),
  // the VENT GRATE low in the wall (shut / popped open), and Rico's heap of "borrowed" notes
  const DRESS = Object.assign({}, FURN, {v: 'q-void', b: 'q-blue', B: 'q-blue-d', h: 'q-stage-bulb', s: 'q-steel', S: 'q-steel-d', o: 'q-orange'});
  S['tile-st-vanity'] = tile(DRESS, [drawn(null, g => {
    rect(g, 0, 4, 16, 3, 'T'); rect(g, 0, 4, 16, 1, 't'); rect(g, 1, 7, 2, 8, 'T'); rect(g, 13, 7, 2, 8, 'T'); rect(g, 3, 7, 10, 4, 'R'); put(g, 8, 9, 'g');
    rect(g, 2, 2, 2, 2, 'p'); rect(g, 5, 1, 1, 3, 'x'); rect(g, 8, 2, 3, 2, 'y'); put(g, 12, 3, 'b');                 // powder, a lipstick, a brush, a pin
  })]);
  S['tile-st-rack'] = tile(DRESS, [drawn(null, g => {
    rect(g, 1, 1, 14, 1, 'S'); rect(g, 1, 1, 1, 14, 'S'); rect(g, 14, 1, 1, 14, 'S'); rect(g, 0, 14, 4, 1, 'S'); rect(g, 12, 14, 4, 1, 'S');
    [[3, 'r'], [6, 'b'], [9, 'y'], [11, 'n']].forEach(([x, c]) => { rect(g, x, 2, 2, 1, 'k'); rect(g, x - 1, 3, 3, 8, c); });   // costumes on hangers
  })]);
  const STAR = DOORWAY.concat(Array.from({length: 13}, () => 'WWtrrrrrrrrrrtWW'));
  const starOn = (rows, y0) => over(rows, Array(y0).fill('').concat(['.......y........', '......yyy.......', '....yyyyyyy.....', '......yyy.......', '.....y...y......']));
  S['tile-st-stardoor'] = tile(Object.assign({r: 'q-stage-velvet-d', y: 'q-gold'}, WALL), [starOn(STAR, 6)]);
  S['tile-st-stardoor-open'] = tile(Object.assign({y: 'q-stage-bulb'}, WALL), [starOn(DOORWAY.concat(Array(13).fill('WWtvvvvvvvvvvtWW')), 6)]);
  const GRATE = FACE.slice(0, 7).concat(['WWWWWWWWWWWWWWWW', 'WTTTTTTTTTTTTTTW', 'WTsSsSsSsSsSsSTW', 'WTsSsSsSsSsSsSTW', 'WTsSsSsSsSsSsSTW', 'WTsSsSsSsSsSsSTW', 'WTTTTTTTTTTTTTTW', 'WWWWWWWWWWWWWWWW', 'tttttttttttttttt']);
  S['tile-st-vent'] = tile(Object.assign({s: 'q-steel', S: 'q-void'}, WALL), [GRATE]);
  S['tile-st-vent-open'] = tile(Object.assign({s: 'q-steel', S: 'q-void'}, WALL), [FACE.slice(0, 7).concat(['WWWWWWWWWWWWWWWW', 'WTTTTTTTTTTTTTTW', 'WTSSSSSSSSSSSSTW', 'WTSSSSSSSSSSSSTW', 'WTSSSSSSSSSSSSTW', 'WTSSSSSSSSSSSSTW', 'WTTTTTTTTTTTTTTW', 'ssssssWWWWWWWWWW', 'tttttttttttttttt'])]);
  // Rico's heap of borrowed notes, spilling out (gold and white notes, a few stems)
  S['tile-st-heap'] = tile(DRESS, [drawn(null, g => {
    [[2, 12], [6, 11], [10, 12], [4, 9], [9, 8], [12, 10], [7, 6], [3, 13], [12, 13]].forEach(([x, y], i) => { rect(g, x, y, 3, 2, i % 3 ? 'y' : 'w'); rect(g, x + 2, y - 4, 1, 4, i % 3 ? 'Y' : 'K'); });
  })]);

  // THE VENT: air ducts (dim, riveted), slow fans, notes Rico dropped, a duct box (the Lucky Pick hides on it)
  const DUCT = {d: 'q-stage-duct', D: 'q-stage-duct-d', l: 'q-stage-duct-l', k: 'q-black', K: 'q-grey-d', y: 'q-gold', Y: 'q-brass-d', w: 'q-white', b: 'q-steel', v: 'q-void'};
  const ductFloor = g => { rect(g, 0, 0, 16, 16, 'd'); [0, 8].forEach(y => rect(g, 0, y, 16, 1, 'D')); [2, 13].forEach(x => { put(g, x, 3, 'l'); put(g, x, 11, 'l'); }); };
  S['tile-st-duct'] = tile(DUCT, [drawn(null, ductFloor)]);
  S['tile-st-duct-notes'] = tile(DUCT, [drawn(null, g => { ductFloor(g); rect(g, 3, 9, 3, 2, 'y'); rect(g, 5, 5, 1, 4, 'Y'); rect(g, 10, 4, 3, 2, 'w'); rect(g, 12, 1, 1, 3, 'K'); })]);
  S['tile-st-ductwall'] = tile(DUCT, [drawn('D', g => { rect(g, 0, 12, 16, 4, 'd'); rect(g, 0, 12, 16, 1, 'l'); [1, 6, 11].forEach(x => put(g, x, 14, 'K')); })]);
  const fan = f => drawn('D', g => {
    oval(g, 7.5, 7.5, 6.5, 6.5, 'k'); oval(g, 7.5, 7.5, 6, 6, 'K');
    const a0 = f ? Math.PI / 4 : 0; for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; line(g, 7.5, 7.5, Math.round(7.5 + Math.cos(a) * 5), Math.round(7.5 + Math.sin(a) * 5), 'b', 2); }
    rect(g, 7, 7, 2, 2, 'l'); rect(g, 0, 15, 16, 1, 'd');
  });
  S['tile-st-fan'] = tile(DUCT, [fan(0), fan(1)], {fps: 2});   // turning slowly (2 frames a second: a slow turn, never a flash)
  S['tile-st-ductbox'] = tile(DUCT, [drawn(null, g => { ductFloor(g); rect(g, 2, 4, 12, 10, 'K'); rect(g, 2, 4, 12, 2, 'l'); rect(g, 4, 8, 8, 1, 'k'); rect(g, 4, 10, 8, 1, 'k'); })]);

  // THE FLY LOFT: steel catwalks over the dark, the lighting bars, ropes and sandbags, a hole with the ladder down,
  // the vent's hatch, the stairs down to the stage, and the TOP of the red curtain with a gap (the Microphone below)
  const LOFT = {c: 'q-stage-catwalk', C: 'q-stage-catwalk-d', v: 'q-void', k: 'q-black', K: 'q-grey-d', y: 'q-gold', b: 'q-steel', B: 'q-steel-d',
    r: 'q-paper-d', W: 'q-wood', w: 'q-wood-l', l: 'q-stage-bulb', L: 'q-stage-bulb-off', s: 'q-stage-velvet', S: 'q-stage-velvet-d', h: 'q-stage-velvet-l'};
  const catwalk = g => { rect(g, 0, 0, 16, 16, 'C'); for (let y = 1; y < 16; y += 3) for (let x = 1; x < 16; x += 3) rect(g, x, y, 2, 2, 'c'); rect(g, 0, 0, 16, 1, 'b'); rect(g, 0, 15, 16, 1, 'b'); };
  S['tile-st-catwalk'] = tile(LOFT, [drawn(null, catwalk)]);
  S['tile-st-void'] = tile(LOFT, [drawn('v', g => { put(g, 4, 9, 'K'); put(g, 12, 3, 'K'); })]);
  S['tile-st-lightbar'] = tile(LOFT, [drawn('v', g => { rect(g, 0, 4, 16, 2, 'B'); [2, 8, 13].forEach(x => { rect(g, x, 6, 3, 4, 'k'); rect(g, x, 10, 3, 1, 'L'); }); rect(g, 7, 0, 1, 4, 'r'); })]);
  S['tile-st-loftrope'] = tile(LOFT, [drawn('v', g => { [4, 8, 11].forEach(x => rect(g, x, 0, 1, 16, 'r')); rect(g, 3, 9, 3, 3, 'W'); })]);
  S['tile-st-hole'] = tile(LOFT, [drawn(null, g => { catwalk(g); rect(g, 2, 2, 12, 12, 'v'); rect(g, 3, 2, 1, 12, 'W'); rect(g, 12, 2, 1, 12, 'W'); [4, 8, 12].forEach(y => rect(g, 4, y, 8, 1, 'w')); })]);
  S['tile-st-hatch'] = tile(LOFT, [drawn(null, g => { catwalk(g); rect(g, 2, 3, 12, 10, 'K'); rect(g, 3, 4, 10, 8, 'v'); [5, 7, 9].forEach(y => rect(g, 3, y, 10, 1, 'b')); })]);
  S['tile-st-loftstairs'] = tile(LOFT, [drawn(null, g => { catwalk(g); for (let i = 0; i < 5; i++) rect(g, 2, 2 + i * 3, 12, 2, i % 2 ? 'W' : 'w'); rect(g, 1, 1, 1, 14, 'y'); rect(g, 14, 1, 1, 14, 'y'); })]);
  const curtTop = gap => drawn('v', g => { for (let x = 0; x < 16; x++) for (let y = 6; y < 16; y++) put(g, x, y, x % 4 === 1 ? 'h' : x % 4 === 3 ? 'S' : 's'); rect(g, 0, 6, 16, 2, 'y'); if (gap) rect(g, 5, 6, 6, 10, 'v'); });
  S['tile-st-curttop'] = tile(LOFT, [curtTop(false)]);
  S['tile-st-curtgap'] = tile(LOFT, [curtTop(true)]);

  /* RICO BANDIT: a raccoon in felt (grey, a dark mask, a striped tail) with a brass alto sax. Glitched: red eyes,
     clutching his case of borrowed notes; awake: blue eyes, handing a note back; resting: in a chair, eyes shut, zzz */
  function rico(f, mode) {
    const g = grid(24, 28), ok = mode !== 'glitch';
    line(g, 4, 25, 1, 19, 'f', 3); [20, 22, 24].forEach(y => { put(g, 2, y, 'M'); put(g, 3, y, 'M'); });   // the striped tail
    oval(g, 12, 18, 6, 7, 'f'); oval(g, 12, 19, 3.6, 5, 'l');                                        // the body, the belly
    oval(g, 12, 8, 6, 5, 'f'); oval(g, 12, 10.5, 3, 2, 'l'); put(g, 12, 11, 'k');                    // the head, the muzzle, the nose
    rect(g, 7, 2, 2, 3, 'f'); rect(g, 15, 2, 2, 3, 'f'); put(g, 7, 2, 'M'); put(g, 16, 2, 'M');     // ears
    rect(g, 7, 6, 10, 3, 'M');                                                                        // the bandit mask
    if (mode === 'rest') { rect(g, 9, 7, 2, 1, 'w'); rect(g, 13, 7, 2, 1, 'w'); }                    // eyes shut
    else { rect(g, 9, 6, 2, 2, ok ? 'E' : 'e'); rect(g, 13, 6, 2, 2, ok ? 'E' : 'e'); }
    put(g, 6, 12, 'b'); put(g, 18, 12, 'b');
    line(g, 15, 12, 18, 22, 'g', 2); oval(g, 17, 23, 2.6, 2, 'g'); put(g, 17, 23, 'G'); put(g, 16, 16, 'G'); put(g, 17, 19, 'G');   // the sax
    rect(g, 8, 25, 3, 2, 'F'); rect(g, 13, 25, 3, 2, 'F');                                           // feet
    if (mode === 'glitch') { rect(g, 3, 14, 7, 5, 'K'); rect(g, 3, 14, 7, 1, 'k'); put(g, 4 + f, 13, 'y'); put(g, 7 - f, 12, 'w'); }   // his case, notes peeking out
    if (mode === 'ok') { rect(g, 3, 9 - f, 2, 2, 'y'); rect(g, 4, 5 - f, 1, 4, 'y'); }               // a note held out: "here, have a C"
    if (mode === 'rest') { rect(g, 5, 22, 14, 2, 'W'); rect(g, 5, 24, 2, 4, 'W'); rect(g, 17, 24, 2, 4, 'W'); rect(g, 4, 13, 2, 11, 'W'); if (f) { put(g, 19, 2, 'w'); put(g, 21, 0, 'w'); } }   // the chair; zzz
    return text(outline(g));
  }
  const RICO_P = Object.assign({}, BOT, {f: 'q-stage-raccoon', F: 'q-stage-raccoon-d', l: 'q-stage-raccoon-l', M: 'q-stage-mask', g: 'q-brass', G: 'q-brass-d',
    K: 'q-grey-d', E: 'q-stage-eye-ok', W: 'q-wood'});
  S['npc-rico'] = {w: 24, h: 28, fps: 2, palette: RICO_P, frames: [rico(0, 'glitch'), rico(1, 'glitch')]};
  S['npc-rico-ok'] = {w: 24, h: 28, fps: 1, palette: RICO_P, frames: [rico(0, 'ok'), rico(1, 'ok')]};
  S['npc-rico-rest'] = {w: 24, h: 28, fps: 1, palette: RICO_P, frames: [rico(0, 'rest'), rico(1, 'rest')]};

  /* RICO, THE MINI-BOSS (48 × 48, the Conductor's size class): big, his sax raised, the case at his feet overflowing with
     borrowed notes (idle, idle, happy: the notes flying home) */
  function ricoBoss(f) {
    const g = grid(48, 48), happy = f === 2;
    line(g, 10, 44, 3, 30, 'f', 5); [32, 36, 40].forEach(y => rect(g, 4 + (y - 32) / 4, y, 4, 2, 'M'));          // the tail
    oval(g, 24, 32, 11, 12, 'f'); oval(g, 24, 34, 7, 9, 'l');                                                      // the body
    oval(g, 24, 14, 10, 8.5, 'f'); oval(g, 24, 18.5, 5, 3.4, 'l'); rect(g, 23, 18, 3, 2, 'k');                     // the head, muzzle, nose
    rect(g, 15, 3, 4, 6, 'f'); rect(g, 29, 3, 4, 6, 'f'); rect(g, 16, 4, 2, 3, 'M'); rect(g, 30, 4, 2, 3, 'M');    // ears
    rect(g, 15, 10, 18, 5, 'M');                                                                                   // the mask
    rect(g, 18, 11, 3, 3, 'w'); rect(g, 27, 11, 3, 3, 'w'); rect(g, 19, 12, 2, 2, happy ? 'E' : 'e'); rect(g, 28, 12, 2, 2, happy ? 'E' : 'e');
    if (happy) { put(g, 21, 21, 'k'); put(g, 27, 21, 'k'); rect(g, 22, 22, 5, 1, 'k'); }
    put(g, 13, 20, 'b'); put(g, 35, 20, 'b'); put(g, 24, 26, 'b');
    const up = f === 1 ? 2 : 0;                                                                                     // the sax, raised (a little higher on frame 1)
    line(g, 30, 22 - up, 36, 38 - up, 'g', 3); oval(g, 35, 40 - up, 5, 3.4, 'g'); oval(g, 35, 40 - up, 3, 1.8, 'G');
    [26, 30, 34].forEach(y => put(g, 33, y - up, 'G')); line(g, 26, 20, 30, 22 - up, 'G');
    rect(g, 16, 44, 6, 3, 'F'); rect(g, 27, 44, 6, 3, 'F');
    rect(g, 1, 36, 14, 10, 'K'); rect(g, 1, 36, 14, 2, 'k'); rect(g, 6, 40, 4, 1, 'y');                             // the case
    const notes = happy ? [[4, 4], [10, 1], [38, 3], [44, 8], [40, 14], [6, 12]] : [[3, 32], [8, 30], [12, 33], [5, 28], [10, 26]];
    notes.forEach(([x, y], i) => { rect(g, x, y, 3, 2, i % 2 ? 'y' : 'w'); rect(g, x + 2, y - 4, 1, 4, i % 2 ? 'Y' : 'K'); });
    return text(outline(g));
  }
  S.rico = {w: 48, h: 48, fps: 2, palette: Object.assign({}, RICO_P, {Y: 'q-brass-d'}), frames: [ricoBoss(0), ricoBoss(1), ricoBoss(2)]};

  // RICO's dodge (battle/dodge.js 'borrow'): a borrowed note, and his sax case at the bottom of the box
  S['borrow-note'] = {w: 6, h: 7, palette: {y: 'q-gold', Y: 'q-brass-d', w: 'q-white'}, frames: [['....Y.', '....YY', '....Y.', '....Y.', '.yyyY.', 'yywyy.', '.yyy..']]};
  S['borrow-case'] = {w: 20, h: 8, palette: {k: 'q-black', K: 'q-grey-d', y: 'q-gold', g: 'q-grey', w: 'q-white'}, frames: [['..y....w.....y......', 'gggggggggggggggggggg', 'gKKKKKKKKKKKKKKKKKKg', 'gKKKKKKKyyyyKKKKKKKg', 'gKKKKKKKKKKKKKKKKKKg', 'gKKKKKKKKKKKKKKKKKKg', 'gggggggggggggggggggg', '.kk..............kk.']]};

  /* ---------- BUILD STEP 5: THE MAIN STAGE (data/maps/stage.js `stage`) ----------
     tile-st-backdrop   the painted night-sky backdrop at the back of the stage
     tile-st-podium     Maestro Moose's podium (in front of him)
     tile-st-footlights the front edge of the stage: a row of footlights glowing softly (2 frames, 1 a second: two
                        warm colors trade places, never a flash)
     stage-glitch       the static at a band member's feet before the finale (2 frames, slow; small and dim)
     stage-spot         a warm pool of light at their feet after it (still)
     stage-mic          THE STAGE MIC in its stand, front and center, with a dim red light (still: it never blinks)
     stage-hole         after the ending: the hole in the boards where its cable runs down
     moose-note         the Lobby: the note Maestro Moose leaves on the carpet (GONE TO THE STAGE!)
     bignumber          THE BIG NUMBER (battle): the five band members in two rows (72 × 48, `members`: battle.js
                        lights the one whose stage is running and dims the others)
     tuba-bubble · flurry-shot · stick-shot   its dodges: Tubby's bubbles, Hoot's flurry of notes, Sal's sticks */
  S['tile-st-backdrop'] = tile({c: 'q-stage-coat', s: 'q-stage-bulb-off', S: 'q-stage-glow', T: 'q-stage-trim-d', t: 'q-stage-trim'}, [['cccccccccccccccc', 'ccsccccccccccccc', 'cccccccccccscccc',
    'cccccccSccccccccc'.slice(0, 16), 'cccccccccccccccc', 'cccccccccccccscc', 'csccccccccccccccc'.slice(0, 16), 'cccccccsccccccccc'.slice(0, 16), 'cccccccccccccccc', 'cccccccccscccccc',
    'cccscccccccccccc', 'cccccccccccccccc', 'cccccccccccccccc', 'tttttttttttttttt', 'TTTTTTTTTTTTTTTT', 'TcTTcTTcTTcTTcTT']]);
  S['tile-st-podium'] = tile(Object.assign({w: 'q-wood', W: 'q-wood-l', y: 'q-gold', k: 'q-black'}, BOARD), [over(S['tile-st-boards'].frames[0], ['', '', '', '',
    '..kkkkkkkkkkkk..', '..kWWWWWWWWWWk..', '..kyyyyyyyyyyk..', '..kwwwwwwwwwwk..', '..kwwwWWWWwwwk..', '..kwwwWyyWwwwk..', '..kwwwWWWWwwwk..', '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..', '..kyyyyyyyyyyk..', '..kkkkkkkkkkkk..'])]);
  const foot = i => over(S['tile-st-boards'].frames[0], ['', '', '', '', '', 'TTTTTTTTTTTTTTTT', 'tttttttttttttttt', '.KKKK..KKKK..KKK'.replace(/\./g, 't'),
    i ? 'tKgbKttKbgKttKgb' : 'tKbgKttKgbKttKbg', 'WWWWWWWWWWWWWWWW', 'WeWWWWWWWWWWWWeW', 'WWWWWWWeWWWWWWWW', 'WWWWWWWWWWWWWWWW', 'TTTTTTTTTTTTTTTT', 'vvvvvvvvvvvvvvvv', 'vvvvvvvvvvvvvvvv']);
  S['tile-st-footlights'] = tile(Object.assign({K: 'q-grey-d', b: 'q-stage-bulb', g: 'q-stage-glow', W: 'q-stage-wall', e: 'q-stage-wall-d', t: 'q-stage-trim', T: 'q-stage-trim-d', v: 'q-void'}, BOARD), [foot(0), foot(1)], {fps: 1});
  S['stage-glitch'] = {w: 16, h: 6, fps: 2, palette: {g: 'q-grey-d', G: 'q-grey', r: 'q-stage-red-lit'}, frames: [
    ['....g.G..g.g....', '..gG.g..G.g.Gg..', '.g.G.g.r.g.G.g..', '..g.G.g..gG.g...', '....g..G.g......', '................'],
    ['.....G.g.G.g....', '..g.g.G.g.r.g...', '.G.g..G.g.G.g.g.', '..gG.g.G..g.G...', '.....g.G..g.....', '................']]};
  S['stage-spot'] = {w: 16, h: 6, palette: {y: 'q-stage-glow', b: 'q-stage-bulb'}, frames: [
    ['....y.y.y.y.....', '..y.y.b.b.y.y...', '.y.b.b.b.b.b.y..', '..y.y.b.b.y.y...', '....y.y.y.y.....', '................']]};
  function stageMic() {
    const g = grid(12, 26);
    oval(g, 5.5, 3.5, 3, 3.4, 'S'); [[4, 2], [6, 2], [5, 3], [4, 4], [6, 4]].forEach(([x, y]) => put(g, x, y, 's'));   // the round head, its mesh
    rect(g, 3, 7, 6, 2, 'B'); put(g, 5, 9, 'r'); put(g, 6, 9, 'r');                                                  // the band, the red light
    rect(g, 5, 9, 2, 13, 'b'); put(g, 5, 9, 'r'); put(g, 6, 9, 'r');                                                 // the stand
    line(g, 5, 22, 1, 25, 'B'); line(g, 6, 22, 10, 25, 'B'); rect(g, 5, 22, 2, 4, 'B');                              // the tripod feet
    return text(outline(g));
  }
  S['stage-mic'] = {w: 12, h: 26, palette: {S: 'q-silver-d', s: 'q-silver', B: 'q-steel-d', b: 'q-steel', r: 'q-stage-red-lit', o: 'q-out'}, frames: [stageMic()]};
  S['stage-hole'] = {w: 16, h: 16, palette: {k: 'q-black', K: 'q-out', d: 'q-stage-board-d', c: 'q-grey-d', C: 'q-steel-d'}, frames: [['', '', '', '', '', '....dddddddd....', '...dkkkkkkkkd...',
    '..dkKKKKKKKKkd..', '..dkKKKcCKKKkd..', '..dkKKKcCKKKkd..', '...dkKKcCKKkd...', '....ddkcCkdd....', '.......cC.......', '.......cC.......', '', ''].map(r => r.padEnd(16, '.'))]};
  S['moose-note'] = {w: 10, h: 7, palette: {p: 'q-paper', k: 'q-black', r: 'q-stage-velvet'}, frames: [['pppppppppp', 'pkkpkkkpkp', 'pppppppppp', 'pkpkkpkkpp', 'pppppppppp', 'ppkkkpprrp', 'pppppppppp']]};
  // THE BIG NUMBER: who stands where in its 72 × 48 box (back row Hoot, Moose, Rico; front row Tubby, Sal), in the
  // order of the battle's stages (Tubby, Hoot, Sal, Rico, Moose); `ok` = their un-glitched sprite (befriended)
  const BIG = [{sprite: 'npc-tusk', ok: 'npc-tusk-ok', at: [12, 20]}, {sprite: 'npc-hoot', ok: 'npc-hoot-ok', at: [0, 0]}, {sprite: 'npc-sal', ok: 'npc-sal-ok', at: [36, 20]},
    {sprite: 'npc-rico', ok: 'npc-rico-ok', at: [48, 0]}, {sprite: 'npc-moose', ok: 'npc-moose-ok', at: [24, 0]}];
  const layer = (id, f, at) => ({rows: S[id].frames[f % S[id].frames.length], palette: S[id].palette, at});
  const backFirst = BIG.slice().sort((a, b) => a.at[1] - b.at[1]);
  S.bignumber = {w: 72, h: 48, fps: 2, members: BIG,
    layers: [0, 1, 2].map(f => backFirst.map(m => layer(f === 2 ? m.ok : m.sprite, f === 2 ? 0 : f, m.at)))};
  S['tuba-bubble'] = {w: 12, h: 12, palette: {b: 'q-stage-eye-ok', B: 'q-steel', w: 'q-white'}, frames: [['....BBBB....', '..BB....BB..', '.B..ww....B.', '.B.ww.....B.', 'B..w.......B',
    'B..........B', 'B..........B', 'B..........B', '.B........bB', '.B.......b.B', '..BB....BB..', '....BBBB....']]};
  S['flurry-shot'] = {w: 5, h: 6, palette: {s: 'q-silver', S: 'q-silver-d'}, frames: [['...S.', '...SS', '...S.', '.sss.', 'sssS.', '.ss..']]};
  S['stick-shot'] = {w: 4, h: 12, palette: {w: 'q-wood-l', W: 'q-wood', t: 'q-paper'}, frames: [['.tt.', '.tt.', '.ww.', '.ww.', '.wW.', '.wW.', '.wW.', '.wW.', '.WW.', '.WW.', '.WW.', '.WW.']]};
  /* THE FINAL STAND (designed by a Raven Band student): Maestro Moose's thrown batons (they spin: 4 frames; reduced
     motion: the first only), Snapjaw Sal's drum (hit, then a shockwave), THE HAMBURGER CHARM's icon (the CHARMS panel,
     the found message) and the crumb a sharp-eyed student might spot in the Main Stage's corner */
  S['baton-shot'] = {w: 7, h: 7, fps: 8, palette: {w: 'q-white', y: 'q-gold'}, frames: [
    ['.......', '.......', '.......', 'ywwwwww', '.......', '.......', '.......'],
    ['......w', '.....w.', '....w..', '...w...', '..w....', '.w.....', 'y......'],
    ['...y...', '...w...', '...w...', '...w...', '...w...', '...w...', '...w...'],
    ['y......', '.w.....', '..w....', '...w...', '....w..', '.....w.', '......w']]};
  S['fs-drum'] = {w: 12, h: 10, palette: {h: 'q-stage-drumhead', d: 'q-stage-drum', W: 'q-silver', s: 'q-silver-d', k: 'q-grey'}, frames: [[
    '..hhhhhhhh..', '.hhhhhhhhhh.', '.sssssssss s'.replace(' ', 's'), '.dWddWddWdd.', '.dddddddddd.', '.dWddWddWdd.', '.dddddddddd.', '.ssssssssss.', '..k......k..', '.k........k.']]};
  S['charm-burger'] = {w: 12, h: 10, palette: {o: 'q-orange', O: 'q-orange-d', w: 'q-white', g: 'q-green', y: 'q-gold', p: 'q-wood'}, frames: [[
    '...oooooo...', '..ooowoowo..', '.oooooooooo.', '.OOOOOOOOOO.', 'gggggggggggg', '.yyyyyyyyyy.', '.pppppppppp.', '.pppppppppp.', '.oooooooooo.', '..OOOOOOOO..']]};
  S['burger-crumb'] = {w: 3, h: 2, palette: {r: 'q-reed', R: 'q-orange-d'}, frames: [['.r.', 'rR.']]};
  /* INSTRUMENT TIERS and UPGRADES (designed by a Raven Band student). THE NOTE SHARDS' icon: a small glowing crystal
     shaped like an eighth note (the pause tiles, the UPGRADES tab, the found message).
     MAT: the student's icon goes here (this ONE sprite; its name is QUEST_TEXT `shards` in data/battle-text.js).
     THE DIAMOND's only clue: one tiny glint at the end of the Balcony's back row (data/maps/stage.js), until it's found. */
  S['shard'] = {w: 9, h: 10, palette: {h: 'q-gear-shard-l', l: 'q-gear-shard', L: 'q-gear-shard-d'}, frames: [[
    '.....hL..', '.....lhL.', '.....l.hL', '.....l..L', '.....l...', '.....l...', '..hhhl...', '.hllll...', '.LlllL...', '..LLL....']]};
  S['diamond-glint'] = {w: 1, h: 1, palette: {h: 'q-gear-dia-l'}, frames: [['h']]};

  /* ---------- THE GLITCH DIMENSION (a Raven Band student's secret; data/maps/stage.js `glitch`) ----------
     Everything here is the static's colors (purple, pink, blue) on near-black. Tiles change at most once a second (2
     frames, fps 1) and only a few pixels at a time: a slow shimmer, never a flash. */
  const GL = {v: 'q-void', d: 'q-purple-d', p: 'q-purple', k: 'q-pink', b: 'q-blue', B: 'q-blue-d'};
  const glFloor = f => Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => {
    if (x === 0 || y === 0) return 'd';                                                    // the grid
    const n = (x * 7 + y * 13 + f * 5) % 23;
    return n === 0 ? 'k' : n === 11 ? 'b' : 'v';                                           // a few stray pixels
  }).join(''));
  S['tile-gl-floor'] = tile(GL, [glFloor(0), glFloor(1)], {fps: 1});
  const glWall = f => Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => {
    if (y % 4 === 3) return 'v';                                                           // scanlines
    const shift = (y >> 2) % 2 && f ? 2 : 0;                                               // one band slips 2 px, then back
    return ((x + shift) * 3 + y) % 11 === 0 ? 'p' : (x + shift) % 8 === 0 ? 'B' : 'd';
  }).join(''));
  S['tile-gl-wall'] = tile(GL, [glWall(0), glWall(1)], {fps: 1});
  S['tile-gl-void'] = tile(GL, [Array(16).fill('v'.repeat(16))]);
  const glPortal = f => { const g = grid(16, 16); rect(g, 0, 0, 16, 16, 'v');
    oval(g, 7.5, 8, 7, 6.5, f ? 'b' : 'k'); oval(g, 7.5, 8, 5.5, 5, 'p'); oval(g, 7.5, 8, 4, 3.5, f ? 'k' : 'b'); oval(g, 7.5, 8, 2.5, 2, 'v'); return text(g); };
  S['tile-gl-portal'] = tile(GL, [glPortal(0), glPortal(1)], {fps: 1});

  /* MR. GRAHAM? (the band director, glitched by the static; designed by a Raven Band student, approved by Mr.
     Graham): clear glasses, a short beard, a brown fauxhawk, a conductor's tuxedo with a bow tie, the baton up, then
     down. While glitched a band of him slips sideways in static colors and his eyes glow red; befriended: a smile,
     calm eyes, notes. He can't be defeated (data/enemies.js mustHarmonize): only befriended. */
  const MG = {o: 'q-out', k: 'q-black', K: 'q-grey-d', w: 'q-white', s: 'q-skin-1', S: 'q-skin-2', h: 'q-hair-2', H: 'q-hair',
    g: 'q-grey', e: 'q-black', r: 'q-red', E: 'q-blue', c: 'q-paper', y: 'q-gold', p: 'q-pink', b: 'q-blue', m: 'q-out'};
  const graham = f => {
    const g = grid(32, 32), happy = f === 2;
    rect(g, 7, 20, 18, 12, 'k'); rect(g, 6, 22, 2, 8, 'k'); rect(g, 24, 22, 2, 8, 'k');      // the tuxedo
    for (let y = 20; y <= 26; y++) { const hw = Math.max(0, 3 - (y - 20) * .5); rect(g, Math.round(16 - hw), y, Math.round(hw * 2) + 1, 1, 'w'); }   // the shirt
    line(g, 12, 20, 15, 27, 'K'); line(g, 20, 20, 17, 27, 'K');                              // lapels
    rect(g, 13, 20, 2, 2, 'k'); rect(g, 17, 20, 2, 2, 'k'); rect(g, 15, 20, 2, 1, 'k');       // the bow tie
    put(g, 16, 24, 'K'); put(g, 16, 26, 'K');                                                 // shirt studs
    rect(g, 14, 17, 4, 3, 'S');                                                               // the neck
    oval(g, 16, 10, 5.5, 6.5, 's');                                                           // the face
    oval(g, 16, 14.5, 5.5, 3.2, 'h'); rect(g, 11, 11, 1, 4, 'h'); rect(g, 21, 11, 1, 4, 'h');  // the short beard
    rect(g, 14, 14, 4, 1, happy ? 'm' : 's'); if (happy) { put(g, 13, 13, 'm'); put(g, 18, 13, 'm'); }   // the mouth (a smile)
    rect(g, 11, 3, 11, 3, 'h'); rect(g, 14, 0, 4, 4, 'h'); put(g, 15, 0, 'H'); put(g, 16, 1, 'H');   // the fauxhawk
    rect(g, 10, 5, 1, 3, 'H'); rect(g, 21, 5, 1, 3, 'H');                                     // short sides
    [11, 17].forEach(x => { rect(g, x, 7, 4, 1, 'g'); rect(g, x, 10, 4, 1, 'g'); rect(g, x, 8, 1, 2, 'g'); rect(g, x + 3, 8, 1, 2, 'g'); });   // clear glasses
    rect(g, 15, 8, 2, 1, 'g');
    put(g, 12, 9, happy ? 'E' : 'r'); put(g, 13, 9, happy ? 'E' : f ? 'r' : 'e'); put(g, 18, 9, happy ? 'E' : f ? 'r' : 'e'); put(g, 19, 9, happy ? 'E' : 'r');
    const hand = f === 1 ? [28, 24] : [28, 15];                                               // the baton arm: up, then the downbeat
    line(g, 24, 21, hand[0], hand[1], 'k', 2); rect(g, hand[0], hand[1] - 1, 2, 2, 's');
    line(g, hand[0] + 1, hand[1] - 1, hand[0] + 3, hand[1] - (f === 1 ? -4 : 7), 'c');
    if (happy) { note(g, 2, 8); note(g, 4, 16); }
    let rows = text(outline(g));
    if (!happy) {                                                                             // the static: one band slips sideways
      const y0 = f ? 22 : 6;
      rows = rows.map((r, y) => (y >= y0 && y < y0 + 2 ? ('..' + r.slice(0, 30)).replace(/[kKw]/g, (ch, x) => (x % 3 ? 'p' : 'b')) : r));
    }
    return rows;
  };
  S.mrgraham = {w: 32, h: 32, fps: 2, palette: MG, frames: [graham(0), graham(1), graham(2)]};
})(window.QUEST_ART);
