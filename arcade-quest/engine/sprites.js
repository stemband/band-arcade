/* ARCADE QUEST ENGINE: sprites. The pixel maps live in arcade-quest/sprites.js (window.QUEST_ART).
   Q.draw(ctx, id, x, y, {frame, t, scale, alpha, anim, flip})   draw a sprite (top-left at x, y, in game pixels;
       flip: mirrored left to right).
       frame: a fixed frame; otherwise it animates through `anim` (default: every idle frame but the last 'happy' one
       when there are 3) at the sprite's fps, using t (ms).
   Q.spriteEl(id, {frame, scale, label})                    the sprite as a crisp <canvas> element (text-box portraits)
   Q.playerId(member, opts)                                 builds the member's layered character sprites (see below)
   Q.addSprite(id, def)                                     add or replace a sprite at run time
   PNG HOOK: the first time a sprite is drawn, arcade-quest/art/<id>.png is tried. If it loads, it is used instead
   (frames side by side, each the sprite's w × h; a def with `art` + `artRow`/`artCol` reads its frames from that
   row/column of a shared sheet, like the players' art/player-<m>.png). A missing file is remembered for this tab. */
(function (A) {
  "use strict";
  const Q = A.Quest, ART = window.QUEST_ART;
  const defs = Object.assign({}, ART.SPRITES);
  const frames = {};                                            // id -> [canvas per frame]
  Q.spriteDef = id => defs[id];
  Q.addSprite = (id, def) => { defs[id] = def; delete frames[id]; };

  function render(rowsList, palette, w, h, layers) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    (layers || [{rows: rowsList, palette, at: [0, 0]}]).forEach(L => {
      L.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          const ch = row[rx], tok = L.palette[ch];
          if (ch === '.' || ch === ' ' || !tok) continue;
          x.fillStyle = Q.css(tok); x.fillRect(L.at[0] + rx, L.at[1] + ry, 1, 1);
        }
      });
    });
    return c;
  }
  function framesOf(id) {
    if (frames[id]) return frames[id];
    const d = defs[id]; if (!d) return [];
    frames[id] = d.layers ? d.layers.map(ls => render(null, null, d.w, d.h, ls)) : d.frames.map(rows => render(rows, d.palette, d.w, d.h));
    tryArt(id);
    return frames[id];
  }

  /* ---------- the PNG hook: arcade-quest/art/<id>.png ---------- */
  const MISS = 'bandarcade.quest-art-miss';
  let miss = {}; try { miss = JSON.parse(sessionStorage.getItem(MISS) || '{}'); } catch (e) { miss = {}; }
  const art = {};
  function tryArt(id) {
    const file = defs[id].art || id;
    if (art[file] !== undefined || miss[file] || location.protocol === 'file:') return;
    art[file] = null;
    const img = new Image();
    img.onload = () => { art[file] = img; delete frames[id]; };        // redraw from the picture from now on
    img.onerror = () => { miss[file] = 1; try { sessionStorage.setItem(MISS, JSON.stringify(miss)); } catch (e) {} };
    img.src = 'art/' + file + '.png';
  }
  const artOf = id => { const d = defs[id]; return d && art[d.art || id]; };

  /** which frame to show: fixed, or animated (idle frames at fps) */
  function frameIndex(d, opts) {
    if (opts.frame != null) return opts.frame;
    const list = opts.anim || (d.frames ? (d.frames.length === 3 ? [0, 1] : d.frames.map((_, i) => i)) : d.layers.map((_, i) => i));
    if (list.length < 2 || Q.reduced()) return list[0];
    return list[Math.floor((opts.t || performance.now()) / 1000 * (d.fps || 2)) % list.length];
  }
  Q.draw = function (ctx, id, x, y, opts = {}) {
    let d = defs[id]; if (!d) return;
    if (d.playAlt && !opts.pose && Q.playing && Q.playing() && defs[d.playAlt]) { id = d.playAlt; d = defs[id]; }   // playing now
    if (d.strike && opts.frame == null) opts = Object.assign({}, opts, {frame: Q.strikeNow() ? 1 : 0});        // mallets/sticks
    const f = frameIndex(d, opts), s = opts.scale || 1, img = artOf(id);
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.imageSmoothingEnabled = false;
    if (opts.flip) { ctx.translate(Math.round(x) * 2 + d.w * s, 0); ctx.scale(-1, 1); }
    if (img) ctx.drawImage(img, ((d.artCol || 0) + f) * d.w, (d.artRow || 0) * d.h, d.w, d.h, Math.round(x), Math.round(y), d.w * s, d.h * s);
    else { const c = framesOf(id)[f] || framesOf(id)[0]; if (c) ctx.drawImage(c, Math.round(x), Math.round(y), d.w * s, d.h * s); }
    ctx.restore();
  };
  Q.spriteEl = function (id, {frame = 0, scale = 3, label = ''} = {}) {
    const d = defs[id], c = document.createElement('canvas');
    if (!d) return c;
    c.width = d.w; c.height = d.h; c.className = 'q-sprite';
    c.style.width = `calc(var(--px) * ${d.w * scale / 3})`;
    if (label) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); } else c.setAttribute('aria-hidden', 'true');
    const draw = () => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, d.w, d.h); Q.draw(x, id, 0, 0, {frame}); };
    draw(); setTimeout(draw, 400);                                     // again once a PNG (if any) has loaded
    return c;
  };

  /* ---------- players: layered band kids (see the notes at the top of arcade-quest/sprites.js) ----------
     Q.playerId(member, {tone}) builds every sprite of that member's character (32 × 32 each):
       'player-<m>'            CARRY facing right, idle (2 frames). Battle, title, arena. While a playing challenge
                               is on screen it is drawn as 'player-<m>-play' instead (see Q.playing()).
       'player-<m>-walk'       CARRY facing right, walking (4 frames; mirrored with {flip} to walk left)
       'player-<m>-front'      CARRY facing the viewer: idle (2) · '-front-walk' walking (4)
       'player-<m>-back'       CARRY facing away: idle (2) · '-back-walk' walking (4)
       'player-<m>-play'       PLAYING, facing right (2 frames: breathing, or for bells/snare mallets up / striking)
     YOUR OWN ART: art/player-<m>.png = one sheet of 32 × 32 frames, rows: 0 side (idle, idle, walk ×4),
     1 front (same), 2 back (same), 3 playing (2 frames). See arcade-quest/art/README.md. */
  const PW = 32;
  const blank = () => Array.from({length: PW}, () => Array(PW).fill('.'));
  const rowsOf = g => g.map(r => r.join(''));
  const put = (g, x, y, ch) => { if (x >= 0 && x < PW && y >= 0 && y < PW) g[y][x] = ch; };
  const stamp = (g, rows, x0, y0) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && ch !== ' ') put(g, x0 + x, y0 + y, ch); }));
  /** an 'o' outline around everything drawn in g */
  const outline = (g, mask) => {
    const o = g.map(r => r.slice());
    g.forEach((r, y) => r.forEach((ch, x) => {
      if (ch !== '.' || (mask && mask[y] && mask[y][x] && mask[y][x] !== '.')) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy] && g[y + dy][x + dx]; return c && c !== '.' && c !== 'o'; })) o[y][x] = 'o';
    }));
    return o;
  };
  /** an arm from the shoulder to the hand: a 2-pixel sleeve then skin, outlined; the hand is a 2 × 2 block */
  function armGrid(sh, hand, withHand = true, mask) {
    const g = blank();
    let [x0, y0] = sh; const [x1, y1] = hand;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, n = Math.max(dx, dy) || 1;
    const wide = dy >= dx ? [1, 0] : [0, 1];
    let err = dx - dy, i = 0;
    for (;;) {
      const ch = i / n < 0.35 ? 'c' : 's';
      put(g, x0, y0, ch); put(g, x0 + wide[0], y0 + wide[1], ch);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      i++;
    }
    if (withHand) [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => put(g, x1 + a, y1 + b, 's'));
    return outline(g, mask);                     // no outline where the body is: a sleeve over the shirt blends in
  }
  const handOnly = hand => { const g = blank(); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => put(g, hand[0] + a, hand[1] + b, 's')); return outline(g); };
  /** legs + shoes for one frame. side: {back, front} steps (x offset at the foot); front/back: {left, right} lifts */
  function legGrid(view, step) {
    const L = ART.LEGS, g = blank();
    const leg = (hx, dx, lift, side) => {
      const foot = L.foot - lift;
      for (let y = L.top; y < foot; y++) { const x = hx + Math.round(dx * (y - L.top) / (L.foot - L.top)); put(g, x - 1, y, 'p'); put(g, x, y, 'p'); put(g, x + 1, y, 'p'); }
      const fx = hx + dx;
      for (let y = foot; y <= foot + 1; y++) for (let x = fx - 1; x <= fx + (side ? 2 : 1); x++) put(g, x, y, 'b');
    };
    if (view === 'side') { leg(L.side.back, step.back || 0, 0, true); leg(L.side.front, step.front || 0, 0, true); }
    else { leg(L.front.left, 0, step.left || 0); leg(L.front.right, 0, step.right || 0); }
    return outline(g);
  }
  const hanging = sh => [sh[0], 22];                                // an arm hanging down at the side
  // frames: [upper-body bob, leg step]
  const IDLE = [[0, {}], [1, {}]];
  const WALK = {side: [[0, {back: -2, front: 2}], [1, {}], [0, {back: 2, front: -2}], [1, {}]],
    front: [[0, {left: 2}], [1, {}], [0, {right: 2}], [1, {}]]};

  /** the layers of one frame. view: 'side' | 'front' | 'back'; pose: a POSES entry; bob: 0/1; step: legs */
  function frameLayers(view, pose, bob, step, pal) {
    const IP = ART.INSTRUMENT_PALETTE, S = ART.SHAPES;
    const L = (grid, palette, dy = 0) => ({rows: rowsOf(grid), palette, at: [0, dy]});
    const partsGrid = z => {
      const g = blank();
      (pose.parts || []).forEach(([shape, x, y, pz = 'front']) => {
        if (view === 'back' ? z === 'back' : pz === z) stamp(g, S[shape] || [], x, y);   // from behind, all of it is behind
      });
      return outline(g);                                    // a thin dark edge keeps brass apart from a yellow shirt
    };
    const out = [L(legGrid(view === 'side' ? 'side' : 'front', step), pal)];
    const body = view === 'side' ? ART.BODY.SIDE : view === 'front' ? ART.BODY.FRONT : ART.BODY.BACK;
    const bodyG = blank(); stamp(bodyG, body, 0, 0);
    const mask = rowsOf(bodyG);
    const H = pose.hands || {};
    if (view === 'side') {
      const SH = ART.SHOULDERS.side, back = H.back === 'rest' || !H.back ? null : H.back, front = H.front === 'rest' || !H.front ? null : H.front;
      out.push(L(armGrid(SH.back, back || hanging(SH.back), !back, mask), pal, bob));        // the back arm (its hand comes later)
      out.push(L(partsGrid('back'), IP, bob));
      out.push(L(bodyG, pal, bob));
      out.push(L(partsGrid('front'), IP, bob));
      if (back) out.push(L(handOnly(back), pal, bob));                                        // the back hand, on the instrument
      out.push(L(armGrid(SH.front, front || hanging(SH.front), true, mask), pal, bob));
      out.push(L(partsGrid('top'), IP, bob));                                                  // sticks and mallets, in the hands
    } else {
      const SH = ART.SHOULDERS.front, arms = ['left', 'right'].map(k => armGrid(SH[k], H[k] && H[k] !== 'rest' ? H[k] : hanging(SH[k]), true, mask));
      if (view === 'back') {                                                                  // seen from behind: all of it behind the body
        out.push(L(partsGrid('back'), IP, bob));
        arms.forEach(a => out.push(L(a, pal, bob)));
        out.push(L(bodyG, pal, bob));
      } else {
        out.push(L(partsGrid('back'), IP, bob));
        out.push(L(bodyG, pal, bob));
        out.push(L(partsGrid('front'), IP, bob));
        arms.forEach(a => out.push(L(a, pal, bob)));
        out.push(L(partsGrid('top'), IP, bob));
      }
    }
    return out;
  }
  Q.playerId = function (memberId, {tone = 1} = {}) {
    const id = 'player-' + memberId;
    const pal = Object.assign({}, ART.BODY_PALETTE, {c: 'pt-' + memberId, s: ART.SKIN_TONES[tone] || ART.SKIN_TONES[1]});
    const eq = A.Skins && A.Skins.equipped ? A.Skins.equipped(memberId) : null;
    const sk = eq && A.Skins.LIST.find(s => s.id === eq.color);
    if (sk && sk.id !== 'classic' && sk.look && sk.look.colors) pal.o = sk.look.colors[0] === 'white' ? 'white-hi' : sk.look.colors[0];   // skin = outline color
    const P = ART.POSES[memberId] || ART.POSES.trumpet;
    const play = [].concat(P.play), percussion = play.length > 1;
    const def = (suffix, view, pose, list, row, col, extra) => {
      defs[id + suffix] = Object.assign({w: PW, h: PW, fps: 2, art: id, artRow: row, artCol: col,
        layers: list.map(([bob, step], i) => frameLayers(view, typeof pose === 'function' ? pose(i) : pose, bob, step, pal))}, extra || {});
      delete frames[id + suffix];
    };
    def('', 'side', P.side, IDLE, 0, 0, {playAlt: id + '-play'});
    def('-walk', 'side', P.side, WALK.side, 0, 2, {fps: 8});
    def('-front', 'front', P.front, IDLE, 1, 0);
    def('-front-walk', 'front', P.front, WALK.front, 1, 2, {fps: 8});
    def('-back', 'back', P.front, IDLE, 2, 0);
    def('-back-walk', 'back', P.front, WALK.front, 2, 2, {fps: 8});
    def('-play', 'side', i => play[i % play.length], percussion ? [[0, {}], [0, {}]] : IDLE, 3, 0, percussion ? {strike: true} : {});
    return id;
  };

  /* ---------- when does a character play? ----------
     While a playing challenge (PLAY, LONG TONE, ARTICULATE, HARMONIZE, FINGERING, the Butler's song) is on screen,
     a character drawn with its 'player-<m>' sprite switches to its PLAYING pose; VOCAB is only a question, so it
     keeps carrying. Bells and snare strike on every attack the microphone hears (Pitch.onAttack). */
  Q.playing = () => { const c = document.querySelector('.q-chal'); return !!c && !c.querySelector('#qChoices'); };
  let lastStrike = 0;
  if (A.Pitch && A.Pitch.onAttack) A.Pitch.onAttack(() => { lastStrike = performance.now(); });
  Q.strikeNow = () => performance.now() - lastStrike < 160;
})(window.Arcade);
