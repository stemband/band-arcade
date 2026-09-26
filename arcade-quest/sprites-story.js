/* ARCADE QUEST, EPISODE 1's FINALE: the sprites (same format as sprites.js: rows of characters + a palette of
   THEME TOKENS, never a hex color). Some are built with tiny drawing helpers (lines and ellipses on a grid of
   characters) so arms and batons are easy to move: change the numbers, reload index.html?sprites or the game.
     conductor    THE GHOST CONDUCTOR (final boss, 48 × 48): wild white hair, tailcoat, bow tie, a ghostly tail,
                  conducting (frames: baton up, baton down, happy = both arms up, smiling)
     mic-big      THE MYSTERIOUS MICROPHONE's silhouette (32 × 56): the title screen and the cliffhanger. Its one
                  red "recording" light is the only color.
     mic-shadow   the same, tiny (7 × 12): glimpsed in the manor's windows
     fermata-sm   a small sweeping fermata (the Conductor's dodge)          baton-tip  a baton's glowing tip
   Your own art: arcade-quest/art/<sprite id>.png replaces any of these (see art/README.md). */
(function (Q) {
  "use strict";
  const S = Q.SPRITES;
  // a left half -> the whole row: each half row is carried on to the middle with its last character, then mirrored
  const mirror = (half, n = 24) => half.map(r => { const p = r.padEnd(n, r[r.length - 1] || '.').slice(0, n); return p + [...p].reverse().join(''); });
  const grid = (rows, w, h) => Array.from({length: h}, (_, y) => [...(rows[y] || '').padEnd(w, '.').slice(0, w)]);
  const text = g => g.map(r => r.join(''));
  function line(g, x0, y0, x1, y1, ch, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      for (let dx = 0; dx < thick; dx++) for (let dy = 0; dy < thick; dy++) if (g[y + dy] && g[y + dy][x + dx] !== undefined) g[y + dy][x + dx] = ch;
    }
  }
  const dot = (g, x, y, ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };

  /* ---------- THE GHOST CONDUCTOR ---------- */
  // the left half (mirrored): hair, an angry face, a tailcoat over a white shirt, a forked ghost tail
  const COND = mirror(['', '..............W...W...', '............WW..WWWW..', '...........WWWWWWWWWWW', '..........WWWWWWWWWWWW', '.........WWWWWWWWWWWWW',
    '.........WWWWoooooooooo', '........WWWWowwwwwwwwww', '........WWWowweeeewwwww', '........WWWowwwwwkkwwww', '.........WWowwwwwkKwwww',
    '.........WWowwpwwwwwwww', '..........Wowwwwwwwwwmm', '...........owwwwwwwwmww', '............owwwwwwwwww', '.............oowwwwwwww',
    '...............ooyyyyyy', '.............ttttttTTyyy', '...........tttttttttTrrr', '..........ttttttttttTyrr', '.........tttttttttttTyyy',
    '........ttttttttttttTyyy', '........ttttttttttttTyyy', '.......tttttttttttttTyyy', '.......tttttttttttttTyyy', '.......tttttttttttttTyyy',
    '.......tttttttttttttTyyy', '.......ttttttttttttttTyy', '.......ttttttttttttttttt', '.......ttttttttttttttttt', '.......ttttttttttttttttt',
    '........tttttttttttttttt', '........tt.ttttttttttttt', '.........t..tttttttttttt', '.............owwwwwwwwww', '.............owwwwwwwwww',
    '..............owwwwwwwww', '..............owwwwwwwww', '...............owwwwwwww', '...............owwwwwwww', '................owwwwww.',
    '................owwwww..', '.................owwww..', '.................owww...', '..................oww...', '..................ow....', '...................o....']);
  function conductor(pose) {
    const g = grid(COND, 48, 48);
    const sleeve = (x0, y0, x1, y1) => { line(g, x0, y0, x1, y1, 't', 3); line(g, x1, y1, x1, y1, 'w', 3); };
    if (pose === 'up') {           // baton raised high (his right hand = your left), the other hand open
      sleeve(14, 20, 6, 10); line(g, 7, 10, 2, 1, 's', 1); dot(g, 2, 1, 'S'); dot(g, 1, 0, 'S');
      sleeve(33, 20, 41, 26);
    } else if (pose === 'down') {  // the downbeat
      sleeve(14, 20, 5, 24); line(g, 5, 25, 0, 31, 's', 1); dot(g, 0, 31, 'S');
      sleeve(33, 20, 41, 16);
    } else {                       // happy: both arms up, the baton like a victory wave
      sleeve(14, 20, 7, 9); line(g, 8, 9, 4, 1, 's', 1); dot(g, 4, 1, 'S');
      sleeve(33, 20, 40, 9);
      // a smile instead of the frown, soft brows
      for (let x = 21; x <= 26; x++) { dot(g, x, 12, 'w'); dot(g, x, 13, 'm'); }
      [[13, 20, 'w'], [13, 27, 'w'], [12, 20, 'm'], [12, 27, 'm']].forEach(([y, x, c]) => dot(g, x, y, c));
      for (let x = 14; x <= 17; x++) { dot(g, x, 8, 'w'); dot(g, 47 - x, 8, 'w'); }
      [15, 16, 31, 32].forEach(x => dot(g, x, 7, 'e'));
    }
    return text(g);
  }
  S.conductor = {w: 48, h: 48, fps: 2, palette: {W: 'q-white', o: 'q-purple-d', w: 'q-ghost-2', e: 'q-out', k: 'q-black', K: 'q-white', p: 'q-cheek', m: 'q-out',
    y: 'q-white', r: 'q-red', t: 'q-black', T: 'q-grey-d', s: 'q-paper', S: 'q-gold'},
    frames: [conductor('up'), conductor('down'), conductor('happy')]};

  /* ---------- THE MYSTERIOUS MICROPHONE ---------- */
  function micBig() {
    const w = 32, h = 56, g = grid([], w, h), cx = 15.5;
    for (let y = 0; y < 26; y++) for (let x = 0; x < w; x++) {            // the round head
      const d = ((x - cx) / 11.5) ** 2 + ((y - 12.5) / 12.5) ** 2;
      if (d <= 1) g[y][x] = d > .8 ? 'r' : ((x + y) % 3 === 0 || y % 4 === 0) ? 'g' : 'b';
    }
    line(g, 5, 13, 26, 13, 'r', 1); line(g, 5, 14, 26, 14, 'r', 1);      // the band around the grille
    for (let y = 26; y < 34; y++) line(g, 11, y, 20, y, y === 26 ? 'r' : 'b', 1);   // the neck
    line(g, 4, 18, 4, 30, 'r', 2); line(g, 26, 18, 26, 30, 'r', 2);       // the U-shaped holder
    line(g, 4, 30, 10, 36, 'r', 2); line(g, 26, 30, 21, 36, 'r', 2); line(g, 10, 36, 21, 36, 'r', 2);
    line(g, 15, 37, 15, 50, 'b', 2);                                       // the stand
    for (let y = 50; y < 56; y++) line(g, 15 - (y - 49) * 2, y, 16 + (y - 49) * 2, y, y === 50 ? 'r' : 'b', 1);
    g[29][14] = 'L'; g[29][15] = 'L'; g[30][14] = 'L'; g[30][15] = 'L';    // the red recording light
    return text(g);
  }
  S['mic-big'] = {w: 32, h: 56, palette: {b: 'q-out', g: 'q-purple-d', r: 'q-purple', L: 'q-red'}, frames: [micBig()]};
  S['mic-shadow'] = {w: 7, h: 12, palette: {b: 'q-out', L: 'q-red'}, frames: [['.bbbbb.', 'bbbbbbb', 'bbbbbbb', 'bbbbbbb', '.bbbbb.', 'b.bLb.b', '.bbbbb.', '...b...', '...b...', '...b...', '..bbb..', '.bbbbb.']]};

  /* ---------- the Conductor's dodge shapes ---------- */
  S['fermata-sm'] = {w: 11, h: 7, palette: {w: 'q-ghost', o: 'q-purple'}, frames: [['...wwwww...', '.wwoooooww.', 'wwo.....oww', 'wo.......ow', '....www....', '....www....', '...........']]};
  S['baton-tip'] = {w: 5, h: 5, palette: {w: 'q-white', y: 'q-gold'}, frames: [['..y..', '.yWy.'.replace('W', 'w'), 'ywwwy', '.ywy.', '..y..']]};
})(window.QUEST_ART);
