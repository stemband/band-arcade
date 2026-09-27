/* Band Arcade: AVATAR EFFECTS and ANIMATED ITEMS (Create Your Player). Load after avatar-bg.js.

   EFFECTS (the avatar's 'effect' slot, P.EFFECTS in avatar-parts.js): drawn in code around the portrait bust, on two
   layers: BEHIND the avatar (the aura's glow, far snowflakes, stars passing behind the head) and IN FRONT of it
   (notes, sparkles, sparks, confetti). Nothing in front is ever drawn over the FACE (FACE below) and the name is
   outside the picture, so neither is ever covered.
   ANIMATED ITEMS (anything worn with `anim`, pets with frames): the bust's 4 frames (Arcade.Avatar.bustFrames),
   about 4 a second.
   Only the ONE live avatar that shared/avatar-bg.js's loop picks (the largest visible) moves; every other copy shows
   still pictures (stillURLs: the effect's still frame; the bust's frame 0), and so does everything with reduced
   motion, the MOVING BACKGROUNDS switch off, or a slow device.
   PHOTOSENSITIVITY: nothing flashes. Every twinkle and pulse is a smooth fade of at most ~1 a second over a small
   part of the picture; sparks fade in over 0.25 s and out over 0.4 s, each site at most once every 2.6 s.

     Arcade.AvatarFx.stillURLs(effect, color, px)   {back, front}: still pictures for a box px wide (cached)
     Arcade.AvatarFx.drawLive(box, seconds)         (the loop) animate this box
     Arcade.AvatarFx.stop(box)                      back to still pictures
     Arcade.AvatarFx.draw(ctx, effect, size, t, {layer, color, silhouette, burst})   one layer, one frame (tests)
     Arcade.AvatarFx.state(box)                     tests: {body, fx, f} */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const TAU = Math.PI * 2;
  const FACE = {x0: 8.5, x1: 27.5, y0: 9.5, y1: 25.5};        // the face in the bust's 36 × 36 grid: never drawn over
  const inFace = (x, y) => x > FACE.x0 && x < FACE.x1 && y > FACE.y0 && y < FACE.y1;
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const fract = v => v - Math.floor(v);
  const rgbCache = {};
  let probe = null;
  function rgb(name) {
    if (rgbCache[name]) return rgbCache[name];
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    probe = probe || document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#000'; if (v) probe.fillStyle = v;
    const s = probe.fillStyle;
    return (rgbCache[name] = s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number));
  }
  const col = (n, a = 1) => { const [r, g, b] = rgb(n); return `rgba(${r},${g},${b},${a})`; };

  /* ---------- little shapes (x, y in bust pixels; u = screen pixels per bust pixel) ---------- */
  function star4(x, u, cx, cy, r, c) {
    x.fillStyle = c; x.beginPath();
    x.moveTo(cx * u, (cy - r) * u); x.lineTo((cx + r * .28) * u, cy * u); x.lineTo(cx * u, (cy + r) * u); x.lineTo((cx - r * .28) * u, cy * u); x.closePath(); x.fill();
    x.beginPath(); x.moveTo((cx - r) * u, cy * u); x.lineTo(cx * u, (cy + r * .28) * u); x.lineTo((cx + r) * u, cy * u); x.lineTo(cx * u, (cy - r * .28) * u); x.closePath(); x.fill();
  }
  function star5(x, u, cx, cy, r, c) {
    x.fillStyle = c; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo((cx + Math.cos(a) * rr) * u, (cy + Math.sin(a) * rr) * u); }
    x.closePath(); x.fill();
  }
  function note(x, u, cx, cy, c) {
    x.fillStyle = c; x.strokeStyle = c; x.lineWidth = Math.max(1, u * .55);
    x.beginPath(); x.ellipse(cx * u, cy * u, 1.3 * u, .95 * u, -.4, 0, TAU); x.fill();
    x.beginPath(); x.moveTo((cx + 1.1) * u, cy * u); x.lineTo((cx + 1.1) * u, (cy - 3.6) * u); x.lineTo((cx + 2.4) * u, (cy - 2.6) * u); x.stroke();
  }
  const glowDot = (x, u, cx, cy, r, c0) => { const g = x.createRadialGradient(cx * u, cy * u, 0, cx * u, cy * u, r * u); g.addColorStop(0, c0); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect((cx - r) * u, (cy - r) * u, r * 2 * u, r * 2 * u); };
  const auraGlow = {};
  const SIDE = i => (i % 2 ? 29 + hash(i + 5) * 6 : 1 + hash(i + 5) * 6);            // a spot beside the head, left or right

  /* ---------- THE EFFECTS: fn(ctx, u, t, layer, opts) ---------- */
  const FX = {
    notes(x, u, t, layer) {
      if (layer !== 'front') return;
      for (let i = 0; i < 6; i++) {
        const P = 4 + (i % 3) * .8, c = fract(t / P + hash(i)), px = SIDE(i) + Math.sin(t * 1.3 + i) * .9, py = 35 - c * 34;
        if (inFace(px, py)) continue;
        x.globalAlpha = Math.sin(c * Math.PI) * .9; note(x, u, px, py, col(['yellow', 'cyan', 'pink'][i % 3]));
      }
      x.globalAlpha = 1;
    },
    sparkles(x, u, t, layer) {
      if (layer !== 'front') return;
      [[3, 6], [32, 4], [5, 31], [31, 30], [2, 18], [34, 17], [18, 1.5], [8, 2]].forEach(([sx, sy], i) => {
        const P = 1.8 + hash(i) * .8, s = Math.pow(Math.max(0, Math.sin(t * TAU / P + i * 1.7)), 3);
        if (s < .02) return;
        x.globalAlpha = s; star4(x, u, sx, sy, 2.4 * (.4 + .6 * s), col(i % 2 ? 'white-hi' : 'yellow-hi'));
      });
      x.globalAlpha = 1;
    },
    orbit(x, u, t, layer) {
      for (let i = 0; i < 3; i++) {
        const a = t * .9 + i * TAU / 3, front = Math.sin(a) > 0;
        if ((layer === 'front') !== front) continue;
        const sx = 18 + Math.cos(a) * 16, sy = 5.5 + Math.sin(a) * 3.2;
        glowDot(x, u, sx, sy, 3.2, col('yellow', .35)); star5(x, u, sx, sy, 1.7, col('yellow-hi'));
      }
    },
    aura(x, u, t, layer, o) {
      if (layer !== 'back') return;
      const a = .35 + .15 * Math.sin(t * TAU / 3), c = o.color || 'cyan', k = c + '|' + u;
      if (!auraGlow[k]) { const g = document.createElement('canvas'); g.width = g.height = Math.ceil(38 * u); glowDot(g.getContext('2d'), u, 19, 19, 19, col(c, .55)); auraGlow[k] = g; }
      x.globalAlpha = a; x.drawImage(auraGlow[k], -1 * u, 3 * u); x.globalAlpha = 1;      // the glow is drawn once per color + size
      if (o.silhouette) {                                      // a soft rim of light around the avatar's own shape
        x.globalAlpha = a; x.drawImage(o.silhouette, 0, 0, 36 * u, 36 * u); x.globalAlpha = 1;
      }
    },
    snow(x, u, t, layer) {
      const n = layer === 'back' ? 16 : 6;
      for (let i = 0; i < n; i++) {
        const k = i + (layer === 'back' ? 0 : 50), sp = 1.4 + hash(k + 1) * 1.4;
        const px = (layer === 'back' ? hash(k) * 36 : SIDE(k)) + Math.sin(t * .7 + k) * 1.2, py = fract(t * sp / 38 + hash(k + 2)) * 40 - 2;
        if (layer === 'front' && inFace(px, py)) continue;
        x.fillStyle = col('white-hi', layer === 'back' ? .55 : .85); const s = (layer === 'back' ? .7 : 1) * u;
        x.fillRect(px * u - s * 1.5, py * u - s * .5, s * 3, s); x.fillRect(px * u - s * .5, py * u - s * 1.5, s, s * 3);
      }
    },
    bubbles(x, u, t, layer) {
      const n = layer === 'back' ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const k = i + (layer === 'back' ? 0 : 30), c = fract(t / (6 + hash(k) * 3) + hash(k + 1));      // slow: a rim passing a spot never reads as flicker
        const px = (layer === 'back' ? 4 + hash(k + 3) * 28 : SIDE(k)) + Math.sin(t * 1.6 + k) * .8, py = 37 - c * 38, r = .9 + hash(k + 4) * .9;
        if (layer === 'front' && inFace(px, py)) continue;
        x.globalAlpha = Math.min(1, Math.sin(c * Math.PI) * 1.4);
        x.fillStyle = col('cyan', .22); x.beginPath(); x.arc(px * u, py * u, r * u, 0, TAU); x.fill();
        x.strokeStyle = col('cyan-hi', .6); x.lineWidth = Math.max(1, u * .4); x.beginPath(); x.arc(px * u, py * u, r * u, 0, TAU); x.stroke();
        x.fillStyle = col('white-hi', .6); x.fillRect((px - r * .45) * u, (py - r * .45) * u, Math.max(1, u * .5), Math.max(1, u * .5));
      }
      x.globalAlpha = 1;
    },
    sparks(x, u, t, layer) {
      if (layer !== 'front') return;
      [[4, 25], [32, 24], [31, 5], [5, 5]].forEach(([sx, sy], i) => {
        const P = 2.6, d = (t + i * .9) % P, cyc = Math.floor((t + i * .9) / P);
        const a = d < .25 ? d / .25 : d < .45 ? 1 : d < .85 ? 1 - (d - .45) / .4 : 0;      // a soft fade in and out: never a flash
        if (a <= 0) return;
        const pts = [[sx, sy]];
        for (let k = 1; k <= 4; k++) pts.push([sx + (hash(cyc * 9 + k + i * 31) - .5) * 5, sy + (i < 2 ? -k * 1.6 : k * 1.2)]);
        if (pts.some(([px, py]) => inFace(px, py))) return;
        [[1.6, .25], [.55, .85]].forEach(([w, al]) => {
          x.strokeStyle = col('cyan-hi', al * a); x.lineWidth = Math.max(1, u * w); x.beginPath();
          pts.forEach(([px, py], k) => (k ? x.lineTo(px * u, py * u) : x.moveTo(px * u, py * u))); x.stroke();
        });
      });
    },
    confetti(x, u, t, layer, o) {
      if (layer !== 'front') return;
      const colors = ['pink', 'cyan', 'yellow', 'green', 'purple-hi', 'amber'];
      const piece = (px, py, k, rot) => {
        if (inFace(px, py)) return;
        const flip = Math.abs(Math.cos(t * (1.2 + hash(k) * 1.5) + k));
        x.save(); x.translate(px * u, py * u); x.rotate(rot); x.fillStyle = col(colors[k % colors.length], .9);
        x.fillRect(-u, -u * .5 * flip, u * 2, Math.max(1, u * flip)); x.restore();
      };
      for (let i = 0; i < 12; i++) {                          // falling gently beside the head
        const c = fract(t / (4 + hash(i) * 2) + hash(i + 1));
        piece(SIDE(i) + Math.sin(t + i) * 1.2, c * 40 - 3, i, t * (.5 + hash(i + 2)) + i);
      }
      const b = o.burst;                                     // the celebration: a burst from below when a result shows
      if (b != null && b < 1.8) for (let i = 0; i < 22; i++) {
        const ang = -Math.PI / 2 + (hash(i + 70) - .5) * 2.6, v = 16 + hash(i + 71) * 12;
        piece(18 + Math.cos(ang) * v * b, 34 + Math.sin(ang) * v * b + 14 * b * b, i + 7, b * 6 + i);
      }
    },
  };
  function draw(x, id, size, t, {layer = 'front', color, silhouette, burst} = {}) {
    const fn = FX[id]; if (!fn) return;
    fn(x, size / 36, t, layer, {color, silhouette, burst});
  }

  /* ---------- still pictures (every copy that isn't the live one) ---------- */
  const stills = new Map();
  function stillURLs(effect, color, px = 96) {
    if (!FX[effect]) return null;
    const key = [effect, color, px].join('|');
    if (stills.has(key)) return stills.get(key);
    const out = {};
    ['back', 'front'].forEach(layer => {
      const c = document.createElement('canvas'); c.width = c.height = px;
      try { draw(c.getContext('2d'), effect, px, 1.7, {layer, color}); out[layer] = c.toDataURL('image/png'); } catch (e) { out[layer] = ''; }
    });
    stills.set(key, out);
    return out;
  }

  /* ---------- the live box ---------- */
  const boxState = new WeakMap(), sil = new WeakMap();
  /** the aura's rim: the avatar's shape grown by one pixel all round, in one color; made once per frame canvas + color,
      so a live frame draws it with ONE drawImage */
  function silhouette(frame, color) {
    let m = sil.get(frame); if (!m) { m = {}; sil.set(frame, m); }
    if (m[color]) return m[color];
    const c = document.createElement('canvas'); c.width = c.height = 36;
    const x = c.getContext('2d');
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => x.drawImage(frame, dx, dy));
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col(color); x.fillRect(0, 0, 36, 36);
    return (m[color] = c);
  }
  function drawLive(box, sec) {
    const info = A.Avatar && A.Avatar.liveInfo(box.dataset.live);
    if (!info) return;
    let st = boxState.get(box); if (!st) { st = {start: sec, f: -1, px: 0}; boxState.set(box, st); }
    const r = box.getBoundingClientRect(), dpr = Math.min(1.5, devicePixelRatio || 1);
    const px = Math.max(72, Math.min(288, 36 * Math.round(r.width * dpr / 36)));
    const frames = A.Avatar.bustFrames(info.av, info.eq), f = Math.floor(sec * 4) % 4;
    const body = box.querySelector('canvas.av-live');
    if (body && frames.length > 1) {
      if (body.width !== px) { body.width = body.height = px; st.f = -1; }
      if (st.f !== f) { const x = body.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, px, px); x.drawImage(frames[f], 0, 0, px, px); st.f = f; }
      body.hidden = false; box.classList.add('av-anim-body');
    }
    const eff = info.av.effect;
    const layers = box.querySelectorAll('canvas.av-fx');
    if (eff && eff !== 'none' && layers.length) {
      const silo = eff === 'aura' ? silhouette(frames[frames.length > 1 ? f : 0], info.av.effectColor || 'cyan') : null;
      const burst = box.closest('.av-res') ? sec - st.start : null;
      layers.forEach(c => {
        if (c.width !== px) { c.width = c.height = px; }
        const x = c.getContext('2d'); x.clearRect(0, 0, px, px);
        draw(x, eff, px, sec, {layer: c.classList.contains('av-fx-b') ? 'back' : 'front', color: info.av.effectColor, silhouette: silo, burst});
        c.hidden = false;
      });
      box.classList.add('av-anim-fx');
    }
  }
  function stop(box) {
    box.querySelectorAll('canvas.av-live, canvas.av-fx').forEach(c => { c.hidden = true; });
    box.classList.remove('av-anim-body', 'av-anim-fx');
    const st = boxState.get(box); if (st) st.f = -1;
  }
  const state = box => ({body: box.classList.contains('av-anim-body'), fx: box.classList.contains('av-anim-fx') ? (A.Avatar.liveInfo(box.dataset.live) || {av: {}}).av.effect : null,
    f: (boxState.get(box) || {}).f});

  A.AvatarFx = {FX: Object.keys(FX), FACE, draw, stillURLs, drawLive, stop, state};
})(window.Arcade);
