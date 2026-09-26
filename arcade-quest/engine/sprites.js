/* ARCADE QUEST ENGINE: sprites. The pixel maps live in arcade-quest/sprites.js (window.QUEST_ART).
   Q.draw(ctx, id, x, y, {frame, t, scale, alpha, anim})   draw a sprite (top-left at x, y, in game pixels).
       frame: a fixed frame; otherwise it animates through `anim` (default: every idle frame but the last 'happy' one
       when there are 3) at the sprite's fps, using t (ms).
   Q.spriteEl(id, {frame, scale, label})                    the sprite as a crisp <canvas> element (text-box portraits)
   Q.playerId(member, opts)                                 builds 'player-<member id>' from BODY + INSTRUMENTS
   PNG HOOK: the first time a sprite is drawn, arcade-quest/art/<id>.png is tried. If it loads, it is used instead
   (frames side by side, each the sprite's w × h). A missing file is remembered for this tab, so it is asked once. */
(function (A) {
  "use strict";
  const Q = A.Quest, ART = window.QUEST_ART;
  const defs = Object.assign({}, ART.SPRITES);
  const frames = {};                                            // id -> [canvas per frame]
  Q.spriteDef = id => defs[id];

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
    const d = defs[id]; if (!d) return;
    const f = frameIndex(d, opts), s = opts.scale || 1, img = artOf(id);
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.imageSmoothingEnabled = false;
    if (img) ctx.drawImage(img, f * d.w, 0, d.w, d.h, Math.round(x), Math.round(y), d.w * s, d.h * s);
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

  /* ---------- players: BODY + the member's instrument ---------- */
  /** build (or rebuild) the sprite 'player-<member id>'. tone: 0–3 (skin tone); the equipped skin outlines it */
  Q.playerId = function (memberId, {tone = 1} = {}) {
    const id = 'player-' + memberId;
    const pal = Object.assign({}, ART.BODY_PALETTE, {c: 'pt-' + memberId, s: ART.SKIN_TONES[tone] || ART.SKIN_TONES[1]});
    const eq = A.Skins && A.Skins.equipped ? A.Skins.equipped(memberId) : null;
    const sk = eq && A.Skins.LIST.find(s => s.id === eq.color);
    if (sk && sk.id !== 'classic' && sk.look && sk.look.colors) pal.o = sk.look.colors[0] === 'white' ? 'white-hi' : sk.look.colors[0];   // skin = outline color
    const ins = ART.INSTRUMENTS[memberId];
    const layer = (dy) => [{rows: ART.BODY, palette: pal, at: [6, 1 + dy]}].concat(ins ? [{rows: ins.rows, palette: ART.INSTRUMENT_PALETTE, at: [ins.at[0], ins.at[1] + dy]}] : []);
    defs[id] = {w: 28, h: 25, fps: 2, layers: [layer(0), layer(1)]};
    delete frames[id];
    return id;
  };
})(window.Arcade);
