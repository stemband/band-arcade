/* ARCADE QUEST, EPISODE 2: THE SHOWTIME STAGE's pictures. The same rules as sprites.js: every sprite is a pixel map,
   one character per pixel ('.' = see-through), each palette maps characters to THEME TOKENS (shared/theme.css: the
   --q-stage-* tokens, plus the manor's --q-*; never a hex color). YOUR OWN ART: arcade-quest/art/<sprite id>.png
   replaces any of these (frames side by side). index.html?sprites shows the game's sprites; GALLERY=1 with
   tests/quest-ep2.spec.js saves docs/gallery/aq-ep2-sprites.png (every picture below at 4×) for review.
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
  function moose(beat) {
    const g = grid(24, 28);
    line(g, 8, 6, 3, 2, 'a'); line(g, 5, 4, 5, 0, 'a'); line(g, 4, 3, 1, 1, 'a');               // the left antler…
    put(g, 6, 6, 'F'); put(g, 7, 6, 'F');
    mirror(g);                                                                                    // …and the right one
    oval(g, 11.5, 8.5, 4.6, 4.2, 'f');                                                            // the head
    oval(g, 11.5, 11, 3.4, 2.2, 'l'); put(g, 10, 11, 'F'); put(g, 13, 11, 'F');                   // the muzzle, nostrils
    rect(g, 9, 7, 1, 2, 'e'); rect(g, 14, 7, 1, 2, 'e');                                          // red glitchy eyes
    put(g, 7, 9, 'b'); put(g, 16, 9, 'b'); rect(g, 11, 13, 2, 1, 'b');                            // bolts, the neck rod
    rect(g, 7, 14, 10, 8, 't'); rect(g, 10, 14, 4, 6, 'w');                                       // the tailcoat, the shirt
    put(g, 10, 14, 'r'); put(g, 11, 14, 'R'); put(g, 12, 14, 'R'); put(g, 13, 14, 'r');            // the bow tie
    put(g, 11, 17, 'k'); put(g, 12, 19, 'k');
    rect(g, 7, 22, 3, 2, 't'); rect(g, 14, 22, 3, 2, 't');                                        // coat tails
    rect(g, 10, 22, 1, 3, 'b'); rect(g, 13, 22, 1, 3, 'b'); rect(g, 8, 25, 3, 2, 'k'); rect(g, 13, 25, 3, 2, 'k');   // rods, boots
    line(g, 7, 15, 5, 20, 't', 2); rect(g, 4, 21, 2, 2, 'l');                                     // the left arm
    if (!beat) { line(g, 16, 15, 19, 10, 't', 2); rect(g, 19, 8, 2, 2, 'l'); line(g, 21, 8, 23, 4, 'w'); }   // FROZEN: baton up
    else { line(g, 16, 15, 20, 19, 't', 2); rect(g, 20, 20, 2, 2, 'l'); line(g, 22, 21, 23, 25, 'w'); put(g, 19, 5, 'z'); put(g, 21, 3, 'z'); }   // the downbeat (+ a spark)
    return text(outline(g));
  }
  const UP = moose(false), BEAT = moose(true);
  S['npc-moose'] = {w: 24, h: 28, fps: 2, palette: Object.assign({}, BOT, {a: 'q-stage-antler', f: 'q-stage-moose', F: 'q-stage-moose-d', l: 'q-stage-moose-l',
    t: 'q-stage-coat', z: 'q-white'}), frames: [UP, UP, UP, UP, UP, BEAT]};

  /* PROFESSOR HOOT: a felt owl in a mortarboard, reading the same page of a music book (it flips up, then back) */
  function hoot(flip) {
    const g = grid(24, 28);
    oval(g, 11.5, 15, 6.5, 8, 'f'); oval(g, 11.5, 18, 4, 5, 'l');                                  // the body, the belly
    oval(g, 9, 11, 2.8, 2.6, 'l'); oval(g, 14, 11, 2.8, 2.6, 'l');                                 // the face discs
    rect(g, 8, 10, 2, 2, 'e'); rect(g, 14, 10, 2, 2, 'e'); put(g, 9, 10, 'k'); put(g, 14, 10, 'k'); // eyes (red: the static)
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
  S['npc-hoot'] = {w: 24, h: 28, fps: 2, palette: Object.assign({}, BOT, {f: 'q-stage-owl', F: 'q-stage-owl-d', l: 'q-stage-owl-l', K: 'q-grey-d', p: 'q-paper-d'}),
    frames: [READ, READ, READ, hoot(true)]};

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
})(window.QUEST_ART);
