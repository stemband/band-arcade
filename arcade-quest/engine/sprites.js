/* ARCADE QUEST ENGINE: sprites. The pixel maps live in arcade-quest/sprites.js (window.QUEST_ART).
   Q.draw(ctx, id, x, y, {frame, t, scale, alpha, anim, flip})   draw a sprite (top-left at x, y, in game pixels;
       flip: mirrored left to right).
       frame: a fixed frame; otherwise it animates through `anim` (default: every idle frame but the last 'happy' one
       when there are 3) at the sprite's fps, using t (ms).
   Q.spriteEl(id, {frame, scale, label})                    the sprite as a crisp <canvas> element (text-box portraits)
   Q.playerId(member, opts)                                 the student's avatar holding that instrument (see below)
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
    if (d.canvases) return (frames[id] = d.canvases);                 // drawn already (the avatar: shared/avatar.js)
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
    img.src = A.v ? A.v('art/' + file + '.png') : 'art/' + file + '.png';   // ?v=<site version> (shared/version.js)
  }
  const artOf = id => { const d = defs[id]; return d && !d.canvases && art[d.art || id]; };

  /** which frame to show: fixed, or animated (idle frames at fps) */
  function frameIndex(d, opts) {
    if (opts.frame != null) return opts.frame;
    const list = opts.anim || (d.frames ? (d.frames.length === 3 ? [0, 1] : d.frames.map((_, i) => i)) : (d.layers || d.canvases).map((_, i) => i));
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

  /* ---------- players: the student's AVATAR (Create Your Player, shared/avatar.js) holding their instrument ----------
     Q.playerId(member, {avatar}) builds every sprite of the character (32 × 32 each) from the device's avatar (or
     `avatar`, for the review sheet) with the instrument's POSES from arcade-quest/sprites.js:
       'player-<m>'            CARRY facing right, idle (2 frames). Battle, title, arena. While a playing challenge
                               is on screen it is drawn as 'player-<m>-play' instead (see Q.playing()).
       'player-<m>-walk'       CARRY facing right, walking (4 frames; mirrored with {flip} to walk left)
       'player-<m>-front'      CARRY facing the viewer: idle (2) · '-front-walk' walking (4)
       'player-<m>-back'       CARRY facing away: idle (2) · '-back-walk' walking (4)
       'player-<m>-play'       PLAYING, facing right (2 frames: breathing, or for bells/snare mallets up / striking)
     A student in a wheelchair ROLLS where others walk (the wheels turn). The layer order and the arms from each
     shoulder to its hand point are in shared/avatar.js; the instruments and hand points are POSES here.
     Players are always drawn from the avatar: art/player-<m>.png sheets are not used for them any more. */
  const PW = 32;
  Q.playerId = function (memberId, {avatar} = {}) {
    const id = 'player-' + memberId;
    const sp = A.Avatar && A.Avatar.sprites(memberId, avatar ? {avatar} : {});
    if (!sp) return id;
    Object.entries(sp).forEach(([suffix, d]) => {
      defs[id + suffix] = {w: d.w || PW, h: d.h || PW, fps: d.fps, canvases: d.frames, strike: d.strike, playAlt: suffix === '' ? id + '-play' : undefined};
      delete frames[id + suffix];
    });
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
