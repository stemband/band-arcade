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
  /** 0 on the face, rising smoothly to 1 two pixels away from it: a particle passing near the face fades out */
  const faceFade = (px, py) => {
    const dx = Math.max(FACE.x0 - px, px - FACE.x1, 0), dy = Math.max(FACE.y0 - py, py - FACE.y1, 0);
    if (inFace(px, py)) return 0;
    const d = Math.max(dx, dy); return d >= 2.5 ? 1 : d <= .5 ? 0 : (d - .5) / 2;
  };
  /** a soft six-armed snowflake r bust pixels across, turning slowly with a */
  function flake(x, u, cx, cy, r, a) {
    glowDot(x, u, cx, cy, r * 1.3, col('white-hi', .4));
    x.strokeStyle = col('white-hi', .6); x.lineWidth = Math.max(1, u * .6); x.lineCap = 'round'; x.beginPath();
    for (let i = 0; i < 3; i++) { const ang = a + i * Math.PI / 3, dx = Math.cos(ang) * r, dy = Math.sin(ang) * r; x.moveTo((cx - dx) * u, (cy - dy) * u); x.lineTo((cx + dx) * u, (cy + dy) * u); }
    x.stroke();
  }
  /** a pixel heart (5 × 4 cells of s bust pixels) centered on cx, cy, with a tiny light highlight */
  const HEART = ['XX.XX', 'XXXXX', '.XXX.', '..X..'];
  function heart(x, u, cx, cy, s, c) {
    const ox = cx - 2.5 * s, oy = cy - 2 * s, X = i => Math.round((ox + i * s) * u), Y = i => Math.round((oy + i * s) * u);
    x.beginPath();                                             // one path, cells on whole pixels: no seams between them
    HEART.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === 'X') x.rect(X(rx), Y(ry), X(rx + 1) - X(rx), Y(ry + 1) - Y(ry)); }));
    const o = Math.max(1, Math.round(u * .35));                // a dark edge, so it reads on any background (a pink one too)
    x.save(); x.fillStyle = col('deep', .6); [[-o, 0], [o, 0], [0, -o], [0, o]].forEach(([dx, dy]) => { x.translate(dx, dy); x.fill(); x.translate(-dx, -dy); }); x.restore();
    x.fillStyle = c; x.fill();
    x.fillStyle = col('white-hi', .7); x.fillRect(X(.5), Y(.4), Math.max(1, X(1.1) - X(.5)), Math.max(1, Y(1) - Y(.4)));
  }
  /** a cherry-blossom petal: a soft oval with a notch, turned by a and flipping gently (its width breathes) */
  function petal(x, u, cx, cy, a, s, k) {
    const flip = .45 + .55 * Math.abs(Math.cos(a * .7));
    x.save(); x.translate(cx * u, cy * u); x.rotate(a); x.scale(1, flip);
    x.fillStyle = col(k % 3 ? 'pink-hi' : 'pink', .95);
    const q = s * u; x.beginPath(); x.moveTo(-1.6 * q, 0);                   // the stem end, round sides, a notch at the tip
    x.quadraticCurveTo(-.6 * q, -1.4 * q, 1.5 * q, -.8 * q); x.lineTo(1 * q, 0); x.lineTo(1.5 * q, .8 * q);
    x.quadraticCurveTo(-.6 * q, 1.4 * q, -1.6 * q, 0); x.closePath();
    x.strokeStyle = col('deep', .55); x.lineWidth = Math.max(1, u * .4); x.stroke(); x.fill();     // a dark edge: reads on any background
    x.fillStyle = col('white-hi', .45); x.beginPath(); x.ellipse(-.3 * q, -.25 * q, .6 * q, .3 * q, 0, 0, TAU); x.fill();
    x.restore();
  }
  /** a tiny cartoon bat (Floating bats): a round purple body with two ears and two friendly eyes, scalloped wings
      that flap gently (w: -1..1 lifts the wing tips), a dark edge so it reads on any background */
  function bat(x, u, cx, cy, s, w) {
    const P = (dx, dy) => [(cx + dx * s) * u, (cy + dy * s) * u];
    x.beginPath();
    [-1, 1].forEach(side => {                                  // each wing: from the body out to the tip and back, scalloped
      const tip = -1.1 * w;
      x.moveTo(...P(side * .8, -.4)); x.lineTo(...P(side * 2.4, -.9 + tip * .6)); x.lineTo(...P(side * 3.6, -.3 + tip));
      x.lineTo(...P(side * 3.1, .7 + tip * .5)); x.lineTo(...P(side * 2.5, .3 + tip * .4)); x.lineTo(...P(side * 1.9, .8 + tip * .3));
      x.lineTo(...P(side * 1.4, .4)); x.lineTo(...P(side * .8, .7)); x.closePath();
    });
    x.moveTo(...P(-.75, -.6)); x.lineTo(...P(-.6, -1.6)); x.lineTo(...P(-.2, -.9)); x.lineTo(...P(.2, -.9)); x.lineTo(...P(.6, -1.6)); x.lineTo(...P(.75, -.6)); x.closePath();
    x.moveTo(...P(1.05, .1)); x.ellipse(cx * u, (cy + .1 * s) * u, 1.05 * s * u, 1 * s * u, 0, 0, TAU);
    x.strokeStyle = col('deep', .7); x.lineWidth = Math.max(1, u * .5); x.lineJoin = 'round'; x.stroke();
    x.fillStyle = col('purple'); x.fill();
    x.fillStyle = col('yellow-hi');                            // the eyes: two little dots
    [-.38, .38].forEach(dx => { x.beginPath(); x.arc((cx + dx * s) * u, (cy - .05 * s) * u, Math.max(.6, .26 * s * u), 0, TAU); x.fill(); });
  }
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
    /* THE LEGENDARY GRANDMASTER'S AURA (all 10 Band Ninja belt codes): the rarest item in the arcade, and the only one
       with every belt color. BEHIND: a soft halo whose rainbow of the 10 belt colors turns very slowly (one turn in
       24 s), breathing gently (8 s), and a gold rim around the avatar's own shape. IN FRONT: a crown of 10 tiny
       diamonds, one per belt, circling slowly above the head (one turn in 16 s; the back half passes behind the head,
       dimmer), each fading as it nears the face. Every change is a slow fade: nothing flashes. */
    grandmaster(x, u, t, layer, o) {
      const BELTS = ['bn-white', 'bn-yellow', 'bn-orange', 'bn-green', 'bn-blue', 'bn-purple', 'bn-red', 'bn-brown', 'bn-black', 'bn-diamond'];
      if (layer === 'back') {
        const breathe = .5 + .1 * Math.sin(t * TAU / 8), cx = 18 * u, cy = 20 * u, R = 19 * u;
        x.save();
        x.globalAlpha = breathe;
        const spin = t * TAU / 24;
        let fill;
        if (x.createConicGradient) {
          fill = x.createConicGradient(spin, cx, cy);
          BELTS.concat(BELTS[0]).forEach((b, i) => fill.addColorStop(i / BELTS.length, col(b, .75)));
        } else fill = col('bn-diamond', .6);
        x.fillStyle = fill;
        x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
        // fade the halo to nothing at its edge and keep its middle soft (a radial mask over the rainbow)
        x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1;
        const m = x.createRadialGradient(cx, cy, R * .25, cx, cy, R);
        m.addColorStop(0, 'rgba(0,0,0,.55)'); m.addColorStop(.6, 'rgba(0,0,0,.9)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = m; x.fillRect(0, 0, 36 * u, 36 * u);
        x.restore();
        if (o.silhouette) { x.globalAlpha = .55 + .15 * Math.sin(t * TAU / 8); x.drawImage(o.silhouette, 0, 0, 36 * u, 36 * u); x.globalAlpha = 1; }
        FX._crown(x, u, t, false);
        return;
      }
      FX._crown(x, u, t, true);
    },
    _crown(x, u, t, front) {
      const BELTS = ['bn-white', 'bn-yellow', 'bn-orange', 'bn-green', 'bn-blue', 'bn-purple', 'bn-red', 'bn-brown', 'bn-black', 'bn-diamond'];
      BELTS.forEach((b, i) => {
        const a = t * TAU / 16 + i * TAU / BELTS.length, s = Math.sin(a);
        if ((s > 0) !== front) return;
        const px = 18 + Math.cos(a) * 15, py = 4.5 + s * 2.6, fade = front ? faceFade(px, py) : .55;
        if (fade < .03) return;
        x.globalAlpha = fade * (front ? .95 : .6);
        glowDot(x, u, px, py, 2.4, col(b, .45));
        x.fillStyle = col(b); x.beginPath();                    // a tiny diamond with a dark edge (reads on any background)
        x.moveTo(px * u, (py - 1.3) * u); x.lineTo((px + .9) * u, py * u); x.lineTo(px * u, (py + 1.3) * u); x.lineTo((px - .9) * u, py * u); x.closePath();
        x.strokeStyle = col('deep', .6); x.lineWidth = Math.max(1, u * .35); x.stroke(); x.fill();
      });
      x.globalAlpha = 1;
    },
    /* OFFICIAL BAND NINJA GEAR (the Diamond belt code): a slow diamond-blue aura with the avatar's rim, and a few
       small diamonds drifting beside the head, fading in and out (never a blink) */
    bndiamond(x, u, t, layer, o) {
      if (layer === 'back') { FX.aura(x, u, t, 'back', Object.assign({}, o, {color: 'bn-diamond'})); return; }
      [[4, 8], [31, 6], [3, 27], [32, 25], [18, 2]].forEach(([dx, dy], i) => {
        const P = 3.2 + hash(i) * 1.2, s = Math.pow(Math.max(0, Math.sin(t * TAU / P + i * 1.9)), 2);
        if (s < .03) return;
        const cx = dx + Math.sin(t * .6 + i) * .6, cy = dy - s * 1.2, r = 1.3 + s * .9;
        if (inFace(cx, cy)) return;
        x.globalAlpha = s * .9;
        x.fillStyle = col('bn-diamond'); x.beginPath();
        x.moveTo(cx * u, (cy - r) * u); x.lineTo((cx + r * .7) * u, cy * u); x.lineTo(cx * u, (cy + r) * u); x.lineTo((cx - r * .7) * u, cy * u); x.closePath(); x.fill();
        x.fillStyle = col('white-hi', .8); x.fillRect((cx - r * .25) * u, (cy - r * .45) * u, Math.max(1, u * .5), Math.max(1, u * .5));
      });
      x.globalAlpha = 1;
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

    /* SEASONAL EFFECTS (unlock {event}: shared/seasons.js). Slow and soft: every particle fades in and out, and one
       near the face fades away smoothly (faceFade) instead of popping. */
    /* Spooky green glow: a friendly ghost-green aura with the avatar's rim, a slow breathing pulse (5 s) and a few
       soft wisps curling up around the edge */
    spookyglow(x, u, t, layer, o) {
      if (layer === 'back') {
        const a = .42 + .13 * Math.sin(t * TAU / 5), k = 'spooky|' + u;
        if (!auraGlow[k]) { const g = document.createElement('canvas'); g.width = g.height = Math.ceil(38 * u); glowDot(g.getContext('2d'), u, 19, 19, 19, col('green', .55)); auraGlow[k] = g; }
        x.globalAlpha = a; x.drawImage(auraGlow[k], -1 * u, 3 * u);
        if (o.silhouette) x.drawImage(o.silhouette, 0, 0, 36 * u, 36 * u);
        for (let i = 0; i < 5; i++) {                          // wisps rising behind the shoulders and head
          const c = fract(t / (5 + hash(i + 40) * 2) + hash(i + 41)), bx = [3, 33, 7, 29, 18][i];
          const px = bx + Math.sin(c * TAU + i) * 1.6, py = 33 - c * 30;
          x.globalAlpha = Math.sin(c * Math.PI) * .7; glowDot(x, u, px, py, 3 + c * 1.5, col('green', .6));
        }
        x.globalAlpha = 1; return;
      }
      for (let i = 0; i < 4; i++) {                            // two or three small wisps drifting up beside the head
        const k = i + 60, c = fract(t / (6 + hash(k) * 2) + hash(k + 1)), px = SIDE(k) + Math.sin(c * TAU * 1.2 + i) * 1.3, py = 34 - c * 32;
        const a = Math.sin(c * Math.PI) * .8 * faceFade(px, py); if (a < .02) continue;
        x.globalAlpha = a; glowDot(x, u, px, py, 2.4, col('green', .7));        // a little ghostly wisp: a soft head + a wavy tail
        glowDot(x, u, px + Math.sin(c * TAU * 1.2 + i - .6) * .8, py + 1.6, 1.6, col('green', .45));
        glowDot(x, u, px, py, 1.1, col('green-hi', .8));
      }
      x.globalAlpha = 1;
    },
    /* Snowfall: big, soft flakes drifting down slowly (about 12 s top to bottom), swaying, far ones behind, near ones
       in front, and a little drift of snow in the bottom corners */
    snowfall(x, u, t, layer) {
      const back = layer === 'back', n = back ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const k = i + (back ? 100 : 120), c = fract(t / (14 + hash(k) * 6) + hash(k + 1));
        const px = (back ? 2 + hash(k + 2) * 32 : SIDE(k)) + Math.sin(t * .4 + k) * 1.4, py = c * 40 - 3;
        const a = Math.min(1, Math.sin(c * Math.PI) * 1.6) * (back ? .6 : .9) * (back ? 1 : faceFade(px, py));
        if (a < .02) continue;
        x.globalAlpha = a; flake(x, u, px, py, back ? 1.5 : 2, t * .08 + k);
      }
      if (!back) {                                             // the drift: two soft mounds in the bottom corners
        x.globalAlpha = .85; x.fillStyle = col('white-hi', .75);
        [[0, 6.5], [36, 6.5]].forEach(([cx, r]) => { x.beginPath(); x.ellipse(cx * u, 36.5 * u, r * u, 2.2 * u, 0, 0, TAU); x.fill(); });
        x.fillStyle = col('cyan-hi', .35);
        [[0, 6.5], [36, 6.5]].forEach(([cx, r]) => x.fillRect((cx - r * .6) * u, 35.2 * u, r * 1.2 * u, Math.max(1, u * .4)));
      }
      x.globalAlpha = 1;
    },
    /* MUSIC NOTE SPARKLES (the seasonal shop, Music In Our Schools Month): a few gold notes drifting slowly up beside
       the head, each with a soft four-point twinkle that fades in and out (a 5–7 s cycle: never a blink), fading as
       they near the face; behind: two dim sparkles. The still picture (reduced motion, Motion off) = one frame. */
    notesparkles(x, u, t, layer) {
      const back = layer === 'back', n = back ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const k = i + (back ? 400 : 420), c = fract(t / (6 + hash(k) * 2) + hash(k + 1));
        const px = SIDE(k) + Math.sin(t * .5 + k) * .8, py = 34 - c * 32;
        const a = Math.sin(c * Math.PI) * (back ? .45 : .9) * (back ? 1 : faceFade(px, py));
        if (a < .02) continue;
        x.globalAlpha = a;
        if (back) star4(x, u, px, py, 1.8, col('yellow-hi', .8));
        else {
          note(x, u, px, py, col(i % 2 ? 'yellow' : 'amber-hi'));
          const tw = Math.pow(Math.max(0, Math.sin(t * TAU / (5 + i) + k)), 2);
          if (tw > .05) { x.globalAlpha = a * tw; star4(x, u, px + 3, py - 3.5, 1.4, col('white-hi')); }
        }
      }
      x.globalAlpha = 1;
    },
    /* Floating hearts: little pixel hearts in pinks and reds rising slowly beside the head, fading in and out */
    hearts(x, u, t, layer) {
      const back = layer === 'back', n = back ? 3 : 5, cols = ['pink', 'pink-hi', 'red', 'red-hi'];
      for (let i = 0; i < n; i++) {
        const k = i + (back ? 200 : 220), c = fract(t / (9 + hash(k) * 3) + hash(k + 1));
        const px = SIDE(k) + Math.sin(t * .6 + k) * .9, py = 36 - c * 36, s = back ? .55 : .7 + hash(k + 3) * .2;
        const a = Math.sin(c * Math.PI) * (back ? .55 : .95) * (back ? 1 : faceFade(px, py));
        if (a < .02) continue;
        x.globalAlpha = a; heart(x, u, px, py, s, col(cols[k % cols.length]));
      }
      x.globalAlpha = 1;
    },
    /* FLOATING BATS (Spooky Season's bonus ladder): 3 tiny cartoon bats circling slowly around the top of the head (one
       turn in 12 s; the far half passes behind the head), bobbing a little, wings flapping about once a second. A bat
       near the face fades away smoothly. The still picture (reduced motion, Motion off) = one frame. */
    floatbats(x, u, t, layer) {
      for (let i = 0; i < 3; i++) {
        const a = t * TAU / 12 + i * TAU / 3, front = Math.sin(a) > 0;
        if ((layer === 'front') !== front) continue;
        const px = 18 + Math.cos(a) * 16, py = 5 + Math.sin(a) * 3 + Math.sin(t * 1.3 + i * 2) * .7;
        const al = (front ? 1 : .7) * (front ? faceFade(px, py) : 1); if (al < .02) continue;
        x.globalAlpha = al; bat(x, u, px, py, front ? 1.15 : .95, Math.sin(t * TAU * 1.1 + i * 1.9));
      }
      x.globalAlpha = 1;
    },
    /* Cherry blossoms: small pink petals drifting diagonally down (left to right), turning slowly as they fall */
    blossoms(x, u, t, layer) {
      const back = layer === 'back', n = back ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const k = i + (back ? 300 : 320), c = fract(t / (9 + hash(k) * 4) + hash(k + 1));
        const x0 = back ? hash(k + 2) * 30 - 6 : (k % 2 ? 22 : -6) + hash(k + 2) * 8;
        const px = x0 + c * 14 + Math.sin(t * .8 + k) * 1.2, py = c * 42 - 4;
        const a = Math.min(1, Math.sin(c * Math.PI) * 1.5) * (back ? .55 : .95) * (back ? 1 : faceFade(px, py));
        if (a < .02 || px < -2 || px > 38) continue;
        x.globalAlpha = a; petal(x, u, px, py, t * (.6 + hash(k + 3) * .5) + k, back ? .8 : 1, k);
      }
      x.globalAlpha = 1;
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
      const rim = {aura: info.av.effectColor || 'cyan', bndiamond: 'bn-diamond', spookyglow: 'green', grandmaster: 'bn-gold'}[eff];   // effects with the avatar's rim
      const silo = rim ? silhouette(frames[frames.length > 1 ? f : 0], rim) : null;
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

  A.AvatarFx = {FX: Object.keys(FX).filter(k => k[0] !== '_'), FACE, draw, stillURLs, drawLive, stop, state};
})(window.Arcade);
