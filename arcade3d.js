/* Arcade floor in 3D (three.js r149, shared/vendor/three.min.js). Home page only.
   arcade.js loads three.js and calls Arcade.Floor3D.create(aisle, opts) when WebGL works; if anything
   here fails, or the device is too slow, arcade.js shows the 2D cabinets instead.

   The canvas is decoration. Everything a student reads or presses is still HTML (arcade.js):
   the game's name and description, the hi-score, the arrows, the lights, and START (an <a> this
   file only positions over the front cabinet's control panel).

   Each cabinet is built in code from its game's `cabinet3d` entry (shared/games.js):
     PROFILES  side silhouettes (z = depth, front is +z; y = height, in meters) that are extruded
               into the body, plus where the marquee, screen, control panel, coin door and START sit
               on them, and a topper ('peak' | 'dome' | 'fins' | 'pagoda' | 'vault' | 'gate' | 'vs' | none). `dial: true`
               makes the coin door a round safe door with a combination dial; `twoPlayer: true` puts two joysticks
               and two sets of buttons on the control panel (1P in trim2, 2P in trim).
     colors    the 2D cabinet's trim/trim2 neon (theme.css tokens), so both versions match.
   Marquee and screen are canvas textures drawn with the bundled fonts; only the front cabinet's
   screen animates (the attract loop).

   Performance: renders only while something moves (a turn, the front cabinet's sway, its attract
   screen), at most ~30 fps when idle, never while the tab is hidden. Pixel ratio ≤ 1.5. If frames
   average over 40 ms for a few seconds it drops to pixel ratio 1 with no haze and no sway; if it is
   still slow after that it gives up (opts.onGiveUp) and arcade.js switches to the 2D cabinets. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const TURN_MS = 500, SWAY = 0.14, SLOW_MS = 40, SAMPLE_MS = 3000, IDLE_MS = 32;
  const ARC_R = 3.2, ARC_STEP = 0.46, SINK = 0.9;   // cabinets stand on an arc (radius, angle between neighbors); SINK pushes neighbors back

  /* ---------- side profiles ---------- */
  const PROFILES = {
    classic: {
      width: 0.92,
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.74], [0.58, 1.80], [0, 1.80]],
      marquee: [[0.64, 1.52], [0.64, 1.72]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* haunted house: tall, deep marquee overhang, steep control panel, a peaked roof on top */
    haunted: {
      width: 0.96, topper: 'peak',
      points: [[0, 0], [0.66, 0], [0.66, 0.06], [0.62, 0.10], [0.62, 0.76], [0.86, 0.84], [0.86, 0.90], [0.54, 1.08], [0.46, 1.10], [0.36, 1.50], [0.68, 1.54], [0.68, 1.78], [0.52, 1.84], [0, 1.84]],
      marquee: [[0.68, 1.56], [0.68, 1.76]], screen: [[0.455, 1.13], [0.37, 1.47]], panel: [[0.86, 0.90], [0.54, 1.08]],
      door: {z: 0.62, y0: 0.16, y1: 0.58}, start: [0.62, 0.68],
    },
    /* the small "sound check" machine: short and narrow, flat panel, a dome on top */
    soundcheck: {
      width: 0.84, topper: 'dome',
      points: [[0, 0], [0.56, 0], [0.56, 0.70], [0.70, 0.74], [0.70, 0.80], [0.52, 0.86], [0.46, 0.88], [0.44, 1.26], [0.57, 1.28], [0.57, 1.46], [0, 1.46]],
      marquee: [[0.57, 1.29], [0.57, 1.45]], screen: [[0.458, 0.91], [0.442, 1.24]], panel: [[0.70, 0.80], [0.52, 0.86]],
      door: {z: 0.56, y0: 0.14, y1: 0.52}, start: [0.56, 0.62],
    },
    /* storm: a raked top that leans out over the player, wide panel, lightning fins on the sides */
    storm: {
      width: 0.98, topper: 'fins',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.90, 0.86], [0.90, 0.92], [0.58, 1.00], [0.48, 1.02], [0.42, 1.46], [0.70, 1.52], [0.78, 1.88], [0, 1.72]],
      marquee: [[0.705, 1.55], [0.77, 1.85]], screen: [[0.475, 1.05], [0.425, 1.43]], panel: [[0.90, 0.92], [0.58, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* dojo: an upright cabinet under a wide pagoda roof with lanterns hanging from the eaves */
    dojo: {
      width: 0.94, topper: 'pagoda',
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.84, 0.84], [0.84, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.62, 1.46], [0.62, 1.68], [0, 1.68]],
      marquee: [[0.62, 1.48], [0.62, 1.66]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.84, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
    /* vault: an upright cabinet with a round vault door (bolts, spoked handle) standing on top, a safe door below */
    vault: {
      width: 0.94, topper: 'vault', dial: true,
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.84, 0.84], [0.84, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.62, 1.46], [0.62, 1.62], [0, 1.62]],
      marquee: [[0.62, 1.47], [0.62, 1.61]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.84, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.12, y1: 0.56}, start: [0.62, 0.68],
    },
    /* temple: an upright cabinet under a temple gate (upswept top beam, tie beam, posts) with belt-color lanterns */
    temple: {
      width: 0.92, topper: 'gate',
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.84, 0.84], [0.84, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.62, 1.46], [0.62, 1.64], [0, 1.64]],
      marquee: [[0.62, 1.47], [0.62, 1.63]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.84, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
    /* versus: a wide two-player fighting cabinet with a long control panel and a lit VS sign on top */
    versus: {
      width: 1.08, topper: 'vs', twoPlayer: true,
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.90, 0.84], [0.90, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.64, 1.46], [0.64, 1.68], [0, 1.68]],
      marquee: [[0.64, 1.48], [0.64, 1.66]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.90, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
  };
  const SHAPE_TO_PROFILE = {classic: 'classic', haunted: 'haunted', soundcheck: 'soundcheck', storm: 'storm', dojo: 'dojo', vault: 'vault', temple: 'temple', versus: 'versus'};
  const LANTERN_BELTS = ['belt-orange', 'belt-green', 'belt-blue', 'belt-purple', 'belt-red', 'belt-brown', 'belt-black', 'belt-diamond'];
  const BODIES = ['cab-side', 'cab-face', 'cab-panel', 'floor-3'];

  /** a game's 3D cabinet settings, every default filled in from its 2D cabinet */
  A.cabinet3dOf = function (g) {
    const c2 = A.cabinetOf(g), c = g.cabinet3d || {};
    const TRIMS = ['pink', 'cyan', 'yellow', 'purple', 'amber', 'green', 'red', 'white', 'blue'];
    return {
      profile: PROFILES[c.profile] ? c.profile : (SHAPE_TO_PROFILE[c2.shape] || 'classic'),
      trim: TRIMS.includes(c.trim) ? c.trim : c2.trim,
      trim2: TRIMS.includes(c.trim2) ? c.trim2 : c2.trim2,
      body: BODIES.includes(c.body) ? c.body : 'cab-side',
      marquee: c2.marquee, kicker: c2.kicker, screen: c2.screen,
    };
  };

  /* ---------- colors: read from the theme tokens so 3D matches the rest of the site ---------- */
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || '#ff00ff';
  const tok = {};
  ['deep', 'floor', 'floor-2', 'floor-3', 'screen', 'ink', 'ink-2', 'text-hi', 'red', 'cab-side', 'cab-face', 'cab-panel', 'cab-metal',
   'pink', 'pink-hi', 'pink-ink', 'cyan', 'cyan-hi', 'cyan-ink', 'yellow', 'yellow-hi', 'yellow-ink', 'purple', 'purple-hi', 'purple-ink',
   'amber', 'amber-hi', 'amber-ink', 'green', 'green-hi', 'green-ink', 'red-hi', 'red-ink', 'white', 'white-hi', 'white-ink', 'blue', 'blue-hi', 'blue-ink',
   'dojo-wood', 'dojo-wood-2', 'dojo-paper', 'dojo-paper-dim', 'gold-ink', 'led-off', 'scroll-paper', 'scroll-rod', 'temple-wood', 'temple-sky',
   'belt-orange', 'belt-green', 'belt-blue', 'belt-purple', 'belt-red', 'belt-brown', 'belt-black', 'belt-diamond'].forEach(n => { tok[n] = cssVar(n); });

  /* ---------- canvas helpers ---------- */
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const GHOST_PATH = (() => { const m = A.ghostSVG('').match(/ d="([^"]+)"/); return m ? m[1] : ''; })();
  function ghost(ctx, x, y, w, body, eye, label) {       // the mascot from ui.js, drawn with its own path
    const s = w / 80;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = body; ctx.fill(new Path2D(GHOST_PATH));
    ctx.fillStyle = eye;
    const ey = label ? 32 : 40, er = label ? 4 : 6;
    ctx.beginPath(); ctx.arc(29, ey, er, 0, 7); ctx.arc(51, ey, er, 0, 7); ctx.fill();
    if (label) { ctx.font = '26px "GN Display", "GN Music", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, 40, 74); }
    ctx.restore();
  }
  function fitText(ctx, text, font, size, maxW) {
    let s = size;
    ctx.font = `${s}px ${font}`;
    while (s > 8 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `${s}px ${font}`; }
    return s;
  }
  function radial(size, color, inner = 0) {             // soft round glow, for fake bloom and light pools
    const c = canvas(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, size * inner / 2, size / 2, size / 2, size / 2);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }

  /* ---------- marquees (match the .mq-* styles in shared/cabinets.css) ---------- */
  function drawMarquee(c, g, k, done) {
    const x = c.getContext('2d'), W = c.width, H = c.height, t = tok[k.trim], thi = tok[k.trim + '-hi'], tink = tok[k.trim + '-ink'], u = tok[k.trim2];
    const name = g.name.toUpperCase();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (k.marquee === 'haunt') {
      const gr = x.createRadialGradient(W / 2, H * 1.2, 10, W / 2, H * 1.2, W * .7);
      gr.addColorStop(0, tink); gr.addColorStop(1, tok.deep);
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      ghost(x, W * .05, H * .14, H * .58, tok.screen, tok.floor);
      const s = fitText(x, name, '"GN Haunt", "GN Display", sans-serif', H * .62, W * .72);
      x.shadowColor = u; x.shadowBlur = 14; x.fillStyle = thi;
      x.font = `${s}px "GN Haunt", "GN Display", sans-serif`; x.fillText(name, W * .56, H * .54);
    } else if (k.marquee === 'pixel') {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      if (k.kicker) {
        const ks = fitText(x, k.kicker.toUpperCase(), '"GN Pixel", monospace', H * .16, W * .8);
        x.shadowColor = u; x.shadowBlur = 8; x.fillStyle = u; x.font = `${ks}px "GN Pixel", monospace`; x.fillText(k.kicker.toUpperCase(), W / 2, H * .3);
      }
      const s = fitText(x, name, '"GN Pixel", monospace', H * .3, W * .86);
      x.shadowColor = t; x.shadowBlur = 12; x.fillStyle = t; x.font = `${s}px "GN Pixel", monospace`;
      x.fillText(name, W / 2, k.kicker ? H * .64 : H / 2);
    } else if (k.marquee === 'dojo') {
      // a paper sign in a wooden frame, red letters, the ninja (the same drawing as the page, as an image)
      const f = H * .1;
      x.fillStyle = tok['dojo-wood-2']; x.fillRect(0, 0, W, H);
      x.fillStyle = tok['dojo-paper']; x.fillRect(f, f, W - 2 * f, H - 2 * f);
      const s = fitText(x, name, '"GN Display", sans-serif', H * .44, W * .66);
      x.fillStyle = tok['red-ink']; x.font = `${s}px "GN Display", sans-serif`; x.fillText(name, W * .6, H * .54);
      if (A.ninjaSVG && done) {
        const img = new Image();
        img.onload = () => { x.drawImage(img, W * .05, H * .08, H * .84 * 100 / 120, H * .84); done(); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(A.ninjaSVG({belt: 'belt-black'}).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      }
      x.strokeStyle = t; x.lineWidth = H * .05; x.strokeRect(0, 0, W, H);
      return;
    } else if (k.marquee === 'scroll') {
      // a paper hand scroll with wooden rods at both ends, ink-red letters (two lines for a long name)
      const rod = H * .16;
      x.fillStyle = tok['scroll-rod']; x.fillRect(0, 0, W, H);
      x.fillStyle = tok['scroll-paper']; x.fillRect(rod, H * .06, W - 2 * rod, H * .88);
      const words = name.split(' '), lines = words.length > 2 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [name];
      const s = Math.min(...lines.map(l => fitText(x, l, '"GN Display", sans-serif', H * (lines.length > 1 ? .36 : .5), W * .76)));
      x.fillStyle = tok['red-ink']; x.font = `${s}px "GN Display", sans-serif`;
      lines.forEach((l, i) => x.fillText(l, W / 2, H * (lines.length > 1 ? .33 + i * .38 : .54)));
      x.strokeStyle = t; x.lineWidth = H * .05; x.strokeRect(0, 0, W, H);
      return;
    } else if (k.marquee === 'heist') {
      // a steel plate with rivets, laser-green letters, a red laser underline
      const gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, tok['cab-panel']); gr.addColorStop(1, tok.deep);
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.fillStyle = tok['cab-metal'];
      [[.05, .2], [.95, .2], [.05, .8], [.95, .8]].forEach(([a, b]) => { x.beginPath(); x.arc(W * a, H * b, H * .05, 0, 7); x.fill(); });
      x.fillStyle = u; x.shadowColor = u; x.shadowBlur = 10; x.fillRect(W * .1, H * .84, W * .8, H * .04);
      const s = fitText(x, name, '"GN Display", sans-serif', H * .5, W * .8);
      x.shadowColor = t; x.shadowBlur = 14; x.fillStyle = thi;
      x.font = `${s}px "GN Display", sans-serif`; x.fillText(name, W / 2, H * .48);
    } else if (k.marquee === 'versus') {
      // split blue / red with a bright seam, slanted yellow letters with a dark outline (match .mq-versus)
      x.fillStyle = u; x.fillRect(0, 0, W, H);
      x.fillStyle = t; x.beginPath(); x.moveTo(W * .54, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W * .46, H); x.fill();
      x.strokeStyle = tok['yellow-hi']; x.lineWidth = H * .04; x.beginPath(); x.moveTo(W * .54, 0); x.lineTo(W * .46, H); x.stroke();
      x.fillStyle = 'rgba(6,4,13,.72)'; x.fillRect(W * .05, H * .14, W * .9, H * .72);
      const s = fitText(x, name, '"GN Display", sans-serif', H * .44, W * .8);
      x.save(); x.translate(W / 2, H * .53); x.transform(1, 0, -.22, 1, 0, 0);
      x.font = `italic ${s}px "GN Display", sans-serif`;
      x.lineJoin = 'round'; x.lineWidth = s * .12; x.strokeStyle = tok.deep; x.strokeText(name, 0, 0);
      x.fillStyle = tok['red-ink']; x.fillText(name, s * .05, s * .07);
      x.fillStyle = tok.yellow; x.shadowColor = t; x.shadowBlur = 10; x.fillText(name, 0, 0);
      x.restore();
      x.shadowBlur = 0; x.strokeStyle = thi; x.lineWidth = H * .06; x.strokeRect(0, 0, W, H);
      return;
    } else if (k.marquee === 'shade') {
      x.fillStyle = tok['pink-ink']; x.fillRect(0, 0, W, H);
      x.strokeStyle = u; x.lineWidth = H * .16;
      for (let i = -H; i < W + H; i += H * .45) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); }
      const s = fitText(x, name, '"GN Shade", "GN Display", sans-serif', H * .56, W * .8);
      x.font = `${s}px "GN Shade", "GN Display", sans-serif`;
      const tw = x.measureText(name).width;
      x.fillStyle = tok.deep; x.fillRect(W / 2 - tw / 2 - H * .12, H * .16, tw + H * .24, H * .68);
      x.fillStyle = t; x.fillText(name, W / 2, H * .53);
    } else {
      x.fillStyle = t; x.fillRect(0, 0, W, H);
      const s = fitText(x, name, '"GN Display", sans-serif', H * .5, W * .86);
      x.fillStyle = tok.deep; x.font = `${s}px "GN Display", sans-serif`; x.fillText(name, W / 2, H * .54);
    }
    x.shadowBlur = 0; x.strokeStyle = t; x.lineWidth = H * .06; x.strokeRect(0, 0, W, H);
  }

  /* ---------- attract screens (canvas versions of SCREENS in shared/cabinets.js) ----------
     draw(ctx, W, H, t, g, k): t = seconds into the loop, or null for the still frame */
  const TREBLE = ['C5', 'E4', 'A4', 'D5', 'G4', 'B4', 'F4'];
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  function staffLines(x, W, top, gap, x0 = W * .04, x1 = W * .96) {
    x.strokeStyle = tok.ink; x.lineWidth = Math.max(1, gap * .09);
    for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(x0, top + i * gap); x.lineTo(x1, top + i * gap); x.stroke(); }
  }
  function noteHead(x, cx, cy, gap, color) {
    x.fillStyle = color; x.strokeStyle = color; x.lineWidth = Math.max(1.5, gap * .12);
    x.beginPath(); x.ellipse(cx, cy, gap * .58, gap * .42, -.35, 0, 7); x.fill();
  }
  const SCREENS3D = {
    ghost(x, W, H, t) {
      x.fillStyle = tok.screen; x.fillRect(0, 0, W, H);
      const i = t == null ? 0 : Math.floor(t / 2.6), p = t == null ? 0 : (t % 2.6) / 2.6;
      const n = A.music.parseNote(TREBLE[i % TREBLE.length]);
      const gap = H * .085, top = H * .56;
      staffLines(x, W, top, gap);
      x.fillStyle = tok.ink; x.font = `${gap * 4.2}px "GN Music", serif`; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      x.fillText('𝄞', W * .06, top + gap * 3.9);
      const ny = top + (A.noteY('treble', n) - 56) / 16 * gap, nx = W * .68;
      for (let ly = 136; ly <= A.noteY('treble', n); ly += 16) { const yy = top + (ly - 56) / 16 * gap; x.beginPath(); x.moveTo(nx - gap, yy); x.lineTo(nx + gap, yy); x.stroke(); }
      for (let ly = 40; ly >= A.noteY('treble', n); ly -= 16) { const yy = top + (ly - 56) / 16 * gap; x.beginPath(); x.moveTo(nx - gap, yy); x.lineTo(nx + gap, yy); x.stroke(); }
      noteHead(x, nx, ny, gap, tok.ink);
      const down = A.noteY('treble', n) <= 88;
      x.beginPath(); x.moveTo(nx + (down ? -1 : 1) * gap * .52, ny); x.lineTo(nx + (down ? -1 : 1) * gap * .52, ny + (down ? 1 : -1) * gap * 3.2); x.stroke();
      const a = p < .2 ? 1 : p < .85 ? 1 - .9 * (p - .2) / .65 : .1;
      x.globalAlpha = a;
      ghost(x, W / 2 - W * .16, H * .04, W * .32, tok[this.trim], tok.deep, A.music.noteLabel(n));
      x.globalAlpha = 1;
    },
    tuner(x, W, H, t) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);
      const i = t == null ? 0 : Math.floor(t / 3), p = t == null ? 1 : (t % 3) / 3;
      const keys = [[0, -48], [.22, 30], [.40, -18], [.56, 8], [.68, 0], [1, 0]];
      let ang = 0;
      for (let k = 1; k < keys.length; k++) if (p <= keys[k][0]) { const [p0, a0] = keys[k - 1], [p1, a1] = keys[k]; ang = a0 + (a1 - a0) * ease((p - p0) / (p1 - p0 || 1)); break; }
      const lit = p >= .68 ? 1 : .25, u = tok[this.trim2 + '-hi'];
      const wide = W / H > 1.4;                                // wide screens: the note on the left, the meter on the right
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.globalAlpha = lit; x.fillStyle = u; x.shadowColor = tok[this.trim2]; x.shadowBlur = 12;
      x.font = `${H * (wide ? .42 : .26)}px "GN Display", "GN Music", sans-serif`;
      x.fillText(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'][i % 7], wide ? W * .2 : W / 2, wide ? H * .5 : H * .22);
      x.shadowBlur = 0; x.globalAlpha = 1;
      const cx = wide ? W * .64 : W / 2, cy = H * (wide ? .78 : .86), r = wide ? H * .58 : W * .36;
      x.strokeStyle = tok[this.trim]; x.lineWidth = W * .02;
      x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.16, Math.PI * 1.84); x.stroke();
      x.strokeStyle = tok[this.trim2]; x.lineWidth = W * .045;
      x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.46, Math.PI * 1.54); x.stroke();
      x.strokeStyle = tok['text-hi']; x.lineWidth = W * .02; x.lineCap = 'round';
      const rad = (ang - 90) * Math.PI / 180;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(rad) * r * .92, cy + Math.sin(rad) * r * .92); x.stroke();
      x.fillStyle = tok[this.trim]; x.beginPath(); x.arc(cx, cy, W * .035, 0, 7); x.fill();
      x.globalAlpha = lit; x.fillStyle = tok[this.trim2]; x.font = `${H * .09}px "GN Display", sans-serif`;
      x.fillText('IN TUNE', cx, wide ? H * .94 : H * .47); x.globalAlpha = 1;
    },
    storm(x, W, H, t) {
      x.fillStyle = tok.screen; x.fillRect(0, 0, W, H);
      const gap = H * .1, top = H * .3;
      staffLines(x, W, top, gap, 0, W);
      const rx = W * .05, ry = top + gap * .8;                 // Tempo the robot
      x.fillStyle = tok['cyan-ink']; x.fillRect(rx, ry, gap * 2.4, gap * 2.3);
      x.fillStyle = tok.yellow; x.fillRect(rx + gap * .45, ry + gap * .6, gap * .5, gap * .5); x.fillRect(rx + gap * 1.45, ry + gap * .6, gap * .5, gap * .5);
      x.fillStyle = tok['pink-ink']; x.beginPath(); x.arc(rx + gap * 1.2, ry - gap * .6, gap * .25, 0, 7); x.fill();
      const tt = t == null ? .4 : t;
      [[0, 2.5], [-1, 1.5], [-2, 3.5]].forEach(([delay, line]) => {
        const p = ((tt - delay) % 3 + 3) % 3 / 3;               // same 3 s march as the 2D screen
        const nx = W * (1.06 - p * .74), a = p > .88 ? 1 - (p - .88) / .12 : 1;
        const ny = top + line * gap;
        x.globalAlpha = a; noteHead(x, nx, ny, gap, tok.ink);
        x.beginPath(); x.moveTo(nx + gap * .52, ny); x.lineTo(nx + gap * .52, ny - gap * 3); x.stroke();
        x.globalAlpha = 1;
      });
      if (t != null && (t % 1) > .8) {
        x.strokeStyle = tok['yellow-ink']; x.lineWidth = gap * .3; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(rx + gap * 2.6, ry + gap); x.lineTo(rx + gap * 4, ry + gap * .5); x.lineTo(rx + gap * 3.6, ry + gap * 1.2); x.lineTo(rx + gap * 5.2, ry + gap * .9); x.stroke();
      }
    },
    /* Note Ninja: a note on a paper scroll, its letter lights on the button row, a slash (same 2.4 s loop as 2D) */
    ninja(x, W, H, t) {
      x.fillStyle = tok['dojo-paper']; x.fillRect(0, 0, W, H);
      const i = t == null ? 0 : Math.floor(t / 2.4), p = t == null ? 1 : (t % 2.4) / 2.4;
      const n = A.music.parseNote(TREBLE[i % TREBLE.length]);
      const gap = H * .08, top = H * .14;
      staffLines(x, W, top, gap);
      const ny = top + (A.noteY('treble', n) - 56) / 16 * gap, nx = W * .6;
      const gold = p >= .5;
      noteHead(x, nx, ny, gap, gold ? tok['gold-ink'] : tok.ink);
      const up = A.noteY('treble', n) > 88;
      x.beginPath(); x.moveTo(nx + (up ? 1 : -1) * gap * .52, ny); x.lineTo(nx + (up ? 1 : -1) * gap * .52, ny + (up ? -1 : 1) * gap * 3.2); x.stroke();
      if (p >= .5 && p < .7) { x.strokeStyle = tok.red; x.lineWidth = gap * .35; x.lineCap = 'round'; x.beginPath(); x.moveTo(nx - gap * 2.2, ny + gap); x.lineTo(nx + gap * 2.2, ny - gap); x.stroke(); }
      const L = 'ABCDEFG', bw = W / 7.6;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${bw * .55}px "GN Display", sans-serif`;
      [...L].forEach((l, k) => {
        const bx = W * .04 + k * bw * 1.05, lit = l === n.letter && p >= .45;
        x.fillStyle = lit ? tok.red : tok.deep; x.fillRect(bx, H * .74, bw * .9, H * .2);
        x.fillStyle = tok['white-hi']; x.fillText(l, bx + bw * .45, H * .845);
      });
    },
    /* Chime Heist: a note on the terminal, its bar lights on a little bell kit, the next code light turns green (2.2 s loop, as 2D) */
    heist(x, W, H, t) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      const i = t == null ? 0 : Math.floor(t / 2.2), p = t == null ? 1 : (t % 2.2) / 2.2, tr = tok[this.trim], thi = tok[this.trim + '-hi'];
      const NOTES = ['G4', 'C5', 'E4', 'A4', 'F4', 'D5', 'B4'], n = A.music.parseNote(NOTES[i % NOTES.length]);
      x.fillStyle = tok.screen; x.fillRect(W * .14, H * .05, W * .72, H * .47);
      x.strokeStyle = tr; x.lineWidth = 2; x.strokeRect(W * .14, H * .05, W * .72, H * .47);
      const gap = H * .067, top = H * .15;
      staffLines(x, W, top, gap, W * .19, W * .81);
      const ny = top + (A.noteY('treble', n) - 56) / 16 * gap, nx = W * .54, gold = p >= .5;
      noteHead(x, nx, ny, gap, gold ? tok['gold-ink'] : tok.ink);
      const up = A.noteY('treble', n) > 88;
      x.beginPath(); x.moveTo(nx + (up ? 1 : -1) * gap * .52, ny); x.lineTo(nx + (up ? 1 : -1) * gap * .52, ny + (up ? -1 : 1) * gap * 3.2); x.stroke();
      for (let k = 0; k < 6; k++) {
        const on = k < i % 6 || (k === i % 6 && p >= .5);
        x.fillStyle = on ? tr : tok['led-off']; x.beginPath(); x.arc(W * (.34 + k * .064), H * .59, H * .025, 0, 7); x.fill();
      }
      const L = 'EFGABCD', bw = W / 7.4;
      [...L].forEach((l, k) => {
        const lit = l === n.letter && p >= .45, bh = H * (.3 - k * .022);
        x.fillStyle = lit ? thi : tok['cab-metal']; x.fillRect(W * .04 + k * bw * 1.03, H * .66 + (H * .3 - bh) / 2, bw * .86, bh);
        x.strokeStyle = tr; x.lineWidth = 1; x.strokeRect(W * .04 + k * bw * 1.03, H * .66 + (H * .3 - bh) / 2, bw * .86, bh);
      });
    },
    /* Ancient Ninja Scrolls: a scroll unrolls to a music term and its meaning, under belt lanterns (2.6 s loop, as 2D) */
    scrolls(x, W, H, t) {
      const T = [['Forte', 'Loud'], ['Allegro', 'Fast'], ['Legato', 'Smooth, connected'], ['Presto', 'Very fast'], ['Tempo', 'Speed of the beat'], ['Subito', 'Suddenly']];
      const i = t == null ? 0 : Math.floor(t / 2.6), p = t == null ? 1 : Math.min(1, (t % 2.6) / 2.6 / .25);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, tok['temple-sky']); g.addColorStop(1, tok.deep);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      LANTERN_BELTS.forEach((b, k) => { x.fillStyle = tok[b]; x.beginPath(); x.ellipse(W * (.14 + k * .103), H * .12, W * .03, H * .055, 0, 0, 7); x.fill(); });
      const top = H * .26, full = H * .66, h = full * ease(p), [term, mean] = T[i % T.length];
      x.fillStyle = tok['scroll-rod']; x.fillRect(W * .08, top - H * .04, W * .84, H * .045);
      x.fillStyle = tok['scroll-paper']; x.fillRect(W * .1, top, W * .8, h);
      x.fillStyle = tok['scroll-rod']; x.fillRect(W * .08, top + h, W * .84, H * .045);
      x.save(); x.beginPath(); x.rect(W * .1, top, W * .8, h); x.clip();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok.ink;
      x.font = `700 ${fitText(x, term, '"GN Text", sans-serif', H * .16, W * .7)}px "GN Text", sans-serif`; x.fillText(term, W / 2, top + full * .38);
      x.fillStyle = tok['ink-2']; x.font = `${fitText(x, mean, '"GN Text", sans-serif', H * .08, W * .74)}px "GN Text", sans-serif`; x.fillText(mean, W / 2, top + full * .7);
      x.restore();
    },
    /* Button Masher: two fighters under health bars, input icons light up, a blast flies (2.4 s loop, as 2D) */
    versus(x, W, H, t) {
      const i = t == null ? 0 : Math.max(0, Math.floor(t / 2.4)), p = t == null ? 1 : ((t % 2.4) + 2.4) % 2.4 / 2.4, u = tok[this.trim2], tr = tok[this.trim];
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, tok.deep); g.addColorStop(1, tok['floor-3']);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const hp = .38 - (i % 5) * .075;
      x.fillStyle = tok['floor-3']; x.fillRect(W * .05, H * .07, W * .38, H * .06); x.fillRect(W * .57, H * .07, W * .38, H * .06);
      x.fillStyle = u; x.fillRect(W * .05, H * .07, W * .38, H * .06);
      x.fillStyle = tr; x.fillRect(W * (.95 - hp), H * .07, W * hp, H * .06);
      x.fillStyle = tok.yellow; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${H * .09}px "GN Display", sans-serif`; x.fillText('VS', W / 2, H * .1);
      x.strokeStyle = u; x.lineWidth = 2; x.beginPath(); x.moveTo(0, H * .77); x.lineTo(W, H * .77); x.stroke();
      const fig = (cx, col, s) => { x.fillStyle = col; x.beginPath(); x.arc(cx, H * .4, H * .075 * s, 0, 7); x.fill(); x.fillRect(cx - W * .05 * s, H * .48, W * .1 * s, H * .19); x.fillRect(cx - W * .04 * s, H * .67, W * .025, H * .1); x.fillRect(cx + W * .015 * s, H * .67, W * .025, H * .1); };
      fig(W * .19, tok[this.trim2 + '-hi'], 1); fig(W * .81, tok[this.trim + '-hi'], 1.1);
      const COMBOS = [['1', '3'], ['1', '2', '3'], ['2'], ['1', '2'], ['0'], ['2', '3']], c = COMBOS[i % COMBOS.length];
      x.font = `${H * .07}px "GN Display", sans-serif`;
      c.forEach((b, k) => {
        if (p < k * .1) return;
        const bx = W * (.39 + k * .11);
        x.fillStyle = tok.yellow; x.beginPath(); x.arc(bx, H * .88, H * .055, 0, 7); x.fill();
        x.fillStyle = tok.deep; x.fillText(b, bx, H * .885);
      });
      if (p > .55 && p < .95) {
        const q = Math.min(1, (p - .55) / .35), bx = W * (.3 + q * .4);
        x.fillStyle = tok['white-hi']; x.strokeStyle = u; x.lineWidth = W * .02;
        x.beginPath(); x.arc(bx, H * .5, H * .05, 0, 7); x.fill(); x.stroke();
      }
    },
    insert(x, W, H, t, g) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 2);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const s = fitText(x, g.name.toUpperCase(), '"GN Display", sans-serif', H * .16, W * .86);
      x.fillStyle = tok[this.trim + '-hi']; x.shadowColor = tok[this.trim]; x.shadowBlur = 12;
      x.font = `${s}px "GN Display", sans-serif`; x.fillText(g.name.toUpperCase(), W / 2, H * .4);
      x.shadowBlur = 0; x.fillStyle = tok[this.trim2 + '-hi']; x.font = `${H * .085}px "GN Display", sans-serif`;
      x.fillText(t == null || (t % 2) < 1 ? 'PRESS START' : 'INSERT COIN', W / 2, H * .66);
    },
  };

  /* ---------- building one cabinet ---------- */
  function build(THREE, g, shared) {
    const k = A.cabinet3dOf(g), P = PROFILES[k.profile], W = P.width;
    const col = n => new THREE.Color(tok[n]);
    const group = new THREE.Group(), mats = [];        // mats: [material, base color or opacity, kind] for dimming
    const basic = (color, extra = {}) => { const m = new THREE.MeshBasicMaterial(Object.assign({color}, extra)); mats.push([m, m.color.clone(), extra.blending ? 'add' : 'color', extra.opacity]); return m; };
    const lambert = color => { const m = new THREE.MeshLambertMaterial({color}); mats.push([m, m.color.clone(), 'color']); return m; };
    const additive = (map, color, opacity) => basic(color, {map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false});
    const zc = -0.4;                                    // center the body's depth on the pivot so the sway turns it in place
    const detail = m => { m.layers.set(1); return m; }; // small parts: drawn in the room, left out of the floor reflection
    const at = (z, y) => [z + zc, y];

    // body: the side profile, extruded to the cabinet's width
    const shape = new THREE.Shape(P.points.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(shape, {depth: W, bevelEnabled: false});
    geo.rotateY(-Math.PI / 2); geo.translate(W / 2, 0, zc);
    const body = new THREE.Mesh(geo, [lambert(col(k.body)), lambert(col('cab-side'))]);
    body.userData.pick = true;
    group.add(body);

    // neon tubes along the outline of both side panels, each with a wide faint copy as its glow
    const tubeMat = basic(col(k.trim + '-hi')), glowMat = basic(col(k.trim), {transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false});
    [-1, 1].forEach(side => {
      const path = new THREE.CurvePath(), pts = P.points.map(([z, y]) => new THREE.Vector3(side * (W / 2 + .004), y, z + zc));
      pts.forEach((p, i) => path.add(new THREE.LineCurve3(p, pts[(i + 1) % pts.length])));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 6, .009, 5, true), tubeMat));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 6, .03, 5, true), glowMat));
    });

    // a flat panel laid along a segment of the profile (marquee, screen, control panel)
    function panel(seg, w, mat, lift = .004) {
      const [[z0, y0], [z1, y1]] = seg, dz = z1 - z0, dy = y1 - y0, L = Math.hypot(dz, dy), th = Math.atan2(dz, dy);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), mat);
      m.rotation.x = th;
      m.position.set(0, (y0 + y1) / 2 - Math.sin(th) * lift, (z0 + z1) / 2 + zc + Math.cos(th) * lift);
      m.userData.len = L;
      group.add(m);
      return m;
    }
    const segLen = ([[z0, y0], [z1, y1]]) => Math.hypot(z1 - z0, y1 - y0);

    // marquee: lit, drawn once
    panel(P.marquee, W * .9, basic(new THREE.Color(1, 1, 1), {map: shared.marquee(g, k, W * .9 / segLen(P.marquee))}));
    // screen: dark bezel, the attract texture, and a soft glow around it
    const sw = W * .74, sl = segLen(P.screen);
    panel(P.screen, sw + .09, basic(col('deep')), .003);
    panel(P.screen, sw * 1.5, additive(shared.glow(k.trim2), col(k.trim2), .5), .002);
    const scr = shared.screen(g, k, sw / sl);
    panel(P.screen, sw, basic(new THREE.Color(1, 1, 1), {map: scr.texture}), .006);

    // control panel with a joystick and three buttons
    const cp = panel(P.panel, W + .02, lambert(col('cab-panel')), .003);
    const pw = new THREE.Group(); pw.rotation.x = cp.rotation.x; pw.position.copy(cp.position); group.add(pw);
    const up = (geom) => { geom.rotateX(Math.PI / 2); return geom; };   // stand shapes up off the panel
    const joystick = (x, c) => {
      const stick = new THREE.Mesh(up(new THREE.CylinderGeometry(.012, .012, .12, 8)), lambert(col('cab-metal'))); stick.position.set(x, 0, .06); pw.add(detail(stick));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), basic(col(c))); ball.position.set(x, 0, .13); pw.add(detail(ball));
      const base = new THREE.Mesh(up(new THREE.CylinderGeometry(.06, .06, .012, 16)), basic(col('deep'))); base.position.set(x, 0, .006); pw.add(detail(base));
    };
    const button = (x, y, c, r = .03) => {
      const b = new THREE.Mesh(up(new THREE.CylinderGeometry(r, r, .025, 14)), basic(col(c)));
      b.position.set(x, y, .012); pw.add(detail(b));
    };
    if (P.twoPlayer) {                                  // 1P (trim2) on the left, 2P (trim) on the right
      [[-W * .4, k.trim2], [W * .06, k.trim]].forEach(([x0, c]) => {
        joystick(x0, c);
        [0, 1, 2].forEach(i => button(x0 + W * (.12 + i * .075), (i === 1 ? .015 : -.005), c, .024));
      });
    } else {
      joystick(-W * .26, k.trim2);
      [k.trim, k.trim2, k.trim + '-hi'].forEach((c, i) => button(W * (.1 + i * .12), (i - 1) * -.02, c));
    }
    // front lip of the panel in neon ink
    const lip = new THREE.Mesh(new THREE.BoxGeometry(W + .04, .05, .02), basic(col(k.trim + '-ink')));
    lip.position.set(0, P.panel[0][1] - .03, P.panel[0][0] + zc + .005); group.add(lip);

    // coin door (or a round safe door with a combination dial)
    const D = P.door, dh = D.y1 - D.y0;
    if (P.dial) {
      const r = Math.min(W * .24, dh / 2), cy = (D.y0 + D.y1) / 2, fz = D.z + zc;
      const face = (geom) => { geom.rotateX(Math.PI / 2); return geom; };
      const sd = new THREE.Mesh(face(new THREE.CylinderGeometry(r, r, .03, 28)), lambert(col('cab-metal'))); sd.position.set(0, cy, fz + .015); group.add(sd);
      const dial = new THREE.Mesh(face(new THREE.CylinderGeometry(r * .45, r * .45, .03, 20)), lambert(col('cab-panel'))); dial.position.set(0, cy, fz + .04); group.add(detail(dial));
      [0, Math.PI / 2].forEach(a => { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.3, .018, .018), basic(col(k.trim + '-hi'))); sp.rotation.z = a; sp.position.set(0, cy, fz + .06); group.add(detail(sp)); });
      // laser beams across the body above and below the safe door
      [[D.y1 + .04, k.trim], [D.y0 - .05, k.trim2]].forEach(([y, c]) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(W * .86, .01, .01), basic(col(c + '-hi'))); beam.position.set(0, y, fz + .01); group.add(beam);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * .9, .06), additive(shared.glow(c), col(c), .5)); glow.position.set(0, y, fz + .012); group.add(glow);
      });
    } else {
      const door = new THREE.Mesh(new THREE.BoxGeometry(W * .38, dh, .02), lambert(col('cab-metal')));
      door.position.set(0, (D.y0 + D.y1) / 2, D.z + zc + .01); group.add(door);
      [-1, 1].forEach(s => {
        const slot = new THREE.Mesh(new THREE.PlaneGeometry(W * .08, dh * .2), basic(col('red')));
        slot.position.set(s * W * .07, D.y0 + dh * .62, D.z + zc + .021); group.add(detail(slot));
      });
      const ret = new THREE.Mesh(new THREE.PlaneGeometry(W * .14, dh * .08), basic(col('deep')));
      ret.position.set(0, D.y0 + dh * .22, D.z + zc + .021); group.add(detail(ret));
    }

    // toppers: what makes each silhouette different from the front
    const topY = Math.max(...P.points.map(p => p[1])), frontTop = Math.max(...P.points.filter(p => p[1] > topY - .1).map(p => p[0]));
    const neon = (curvePts) => {
      const path = new THREE.CurvePath();
      for (let i = 0; i < curvePts.length - 1; i++) path.add(new THREE.LineCurve3(curvePts[i], curvePts[i + 1]));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(path, curvePts.length * 8, .009, 5, false), tubeMat));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(path, curvePts.length * 8, .03, 5, false), glowMat));
    };
    if (P.topper === 'peak') {
      const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(.07, .3), new THREE.Vector2(0, .36), new THREE.Vector2(-.07, .3)]);
      const d = frontTop - .02, tg = new THREE.ExtrudeGeometry(tri, {depth: d, bevelEnabled: false});
      tg.translate(0, topY, zc);
      const roof = new THREE.Mesh(tg, [lambert(col(k.body)), lambert(col('cab-side'))]); roof.userData.pick = true; group.add(roof);
      const fz = d + zc + .004;
      neon([new THREE.Vector3(-W / 2, topY, fz), new THREE.Vector3(-.07, topY + .3, fz), new THREE.Vector3(0, topY + .36, fz), new THREE.Vector3(.07, topY + .3, fz), new THREE.Vector3(W / 2, topY, fz)]);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), basic(col(k.trim + '-hi'))); lamp.position.set(0, topY + .39, fz); group.add(detail(lamp));
    } else if (P.topper === 'dome') {
      const r = W / 2, arc = new THREE.Shape(); arc.absarc(0, 0, r, 0, Math.PI, false); arc.lineTo(r, 0);
      const d = frontTop, dg = new THREE.ExtrudeGeometry(arc, {depth: d, bevelEnabled: false, curveSegments: 20});
      dg.translate(0, topY, zc);
      const dome = new THREE.Mesh(dg, [lambert(col(k.body)), lambert(col('cab-side'))]); dome.userData.pick = true; group.add(dome);
      const fz = d + zc + .004, pts = [];
      for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; pts.push(new THREE.Vector3(Math.cos(a) * r, topY + Math.sin(a) * r, fz)); }
      neon(pts);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (.2 + i * .15), lamp = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), basic(col(i % 2 ? k.trim2 + '-hi' : k.trim + '-hi')));
        lamp.position.set(Math.cos(a) * r * .8, topY + Math.sin(a) * r * .8, fz); group.add(detail(lamp));
      }
    } else if (P.topper === 'pagoda') {
      // a wide roof with upturned eaves, a red neon edge, and two paper lanterns
      const roof = new THREE.Shape([[-W / 2 - .24, .12], [-W / 2 - .06, 0], [W / 2 + .06, 0], [W / 2 + .24, .12], [.18, .34], [-.18, .34]].map(([a, b]) => new THREE.Vector2(a, b)));
      const d = frontTop + .08, rg = new THREE.ExtrudeGeometry(roof, {depth: d, bevelEnabled: false});
      rg.translate(0, topY, zc - .04);
      const rm = new THREE.Mesh(rg, [lambert(col('dojo-wood-2')), lambert(col('dojo-wood'))]); rm.userData.pick = true; group.add(rm);
      const fz = d + zc - .04 + .004;
      neon([[-W / 2 - .24, .12], [-W / 2 - .06, 0], [W / 2 + .06, 0], [W / 2 + .24, .12]].map(([a, b]) => new THREE.Vector3(a, topY + b, fz)));
      [-1, 1].forEach(sd => {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .09, 10), basic(col(k.trim + '-hi')));
        lamp.position.set(sd * (W / 2 + .18), topY + .02, fz - .04); group.add(detail(lamp));
      });
    } else if (P.topper === 'vault') {
      // a round vault door standing on the roof: steel disc, neon rim, a ring of bolts, a spoked handle
      const r = W * .4, cy = topY + r * .66, fz = frontTop - .12 + zc;
      const face = (geom) => { geom.rotateX(Math.PI / 2); return geom; };
      const disc = new THREE.Mesh(face(new THREE.CylinderGeometry(r, r, .14, 36)), [lambert(col(k.body)), lambert(col('cab-metal')), lambert(col(k.body))]);
      disc.position.set(0, cy, fz); disc.userData.pick = true; group.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .009, 6, 48), tubeMat); rim.position.set(0, cy, fz + .072); group.add(rim);
      const rimGlow = new THREE.Mesh(new THREE.TorusGeometry(r, .03, 6, 48), glowMat); rimGlow.position.set(0, cy, fz + .072); group.add(rimGlow);
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * 2 * i / 10, b = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), lambert(col('cab-metal')));
        b.position.set(Math.cos(a) * r * .84, cy + Math.sin(a) * r * .84, fz + .07); group.add(detail(b));
      }
      const hub = new THREE.Mesh(face(new THREE.CylinderGeometry(r * .26, r * .26, .04, 20)), lambert(col('cab-panel'))); hub.position.set(0, cy, fz + .09); group.add(detail(hub));
      [0, Math.PI / 3, -Math.PI / 3].forEach(a => { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.1, .022, .022), lambert(col('cab-metal'))); sp.rotation.z = a; sp.position.set(0, cy, fz + .1); group.add(detail(sp)); });
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), basic(col(k.trim2 + '-hi'))); knob.position.set(0, cy, fz + .12); group.add(detail(knob));
    } else if (P.topper === 'gate') {
      // a temple gate over the cabinet: two posts, a tie beam, an upswept top beam with a neon edge, belt lanterns between
      const fz = frontTop + zc - .1, wood = lambert(col('temple-wood'));
      [-1, 1].forEach(s => { const post = new THREE.Mesh(new THREE.BoxGeometry(.07, .44, .07), wood); post.position.set(s * (W / 2 - .02), topY + .22, fz); group.add(post); });
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(W + .28, .06, .06), wood); nuki.position.set(0, topY + .14, fz); group.add(nuki);
      const beamShape = new THREE.Shape([[-W / 2 - .34, .1], [-W / 2 - .2, 0], [W / 2 + .2, 0], [W / 2 + .34, .1], [W / 2 + .3, .14], [0, .08], [-W / 2 - .3, .14]].map(([a, b]) => new THREE.Vector2(a, b)));
      const bg = new THREE.ExtrudeGeometry(beamShape, {depth: .12, bevelEnabled: false}); bg.translate(0, topY + .4, fz - .06);
      const beam = new THREE.Mesh(bg, [lambert(col(k.body)), wood]); beam.userData.pick = true; group.add(beam);
      neon([[-W / 2 - .34, .1], [-W / 2 - .2, 0], [W / 2 + .2, 0], [W / 2 + .34, .1]].map(([a, b]) => new THREE.Vector3(a, topY + .4 + b, fz + .064)));
      LANTERN_BELTS.forEach((b, i) => {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .06, 10), basic(col(b)));
        lamp.position.set(-W * .36 + i * W * .72 / 7, topY + .3, fz + .05); group.add(detail(lamp));
      });
    } else if (P.topper === 'vs') {
      // a lit VS sign standing on the roof: a dark box, its face split blue / red with the letters, neon along the top
      const sw = W * .62, sh = .24, fz = frontTop + zc - .08;
      const box = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, .08), lambert(col('cab-side'))); box.position.set(0, topY + sh / 2 + .02, fz - .04); box.userData.pick = true; group.add(box);
      const c = canvas(256, 100), cx = c.getContext('2d');
      cx.fillStyle = tok[k.trim2]; cx.fillRect(0, 0, 256, 100);
      cx.fillStyle = tok[k.trim]; cx.beginPath(); cx.moveTo(140, 0); cx.lineTo(256, 0); cx.lineTo(256, 100); cx.lineTo(116, 100); cx.fill();
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = 'italic 72px "GN Display", sans-serif';
      cx.lineWidth = 9; cx.strokeStyle = tok.deep; cx.lineJoin = 'round'; cx.strokeText('VS', 128, 54); cx.fillStyle = tok.yellow; cx.fillText('VS', 128, 54);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sw * .94, sh * .86), basic(new THREE.Color(1, 1, 1), {map: new THREE.CanvasTexture(c)}));
      face.position.set(0, topY + sh / 2 + .02, fz + .002); group.add(face);
      neon([new THREE.Vector3(-sw / 2, topY + sh + .02, fz + .004), new THREE.Vector3(sw / 2, topY + sh + .02, fz + .004)]);
    } else if (P.topper === 'fins') {
      const bolt = new THREE.Shape([[0, 0], [.18, .34], [.08, .34], [.2, .62], [-.04, .26], [.06, .26], [-.06, 0]].map(([a, b]) => new THREE.Vector2(a, b)));
      [-1, 1].forEach(s => {
        const fg = new THREE.ExtrudeGeometry(bolt, {depth: .02, bevelEnabled: false});
        fg.rotateY(-Math.PI / 2); fg.translate(s * (W / 2 + .03) + .01, 1.02, zc + .22);
        group.add(detail(new THREE.Mesh(fg, basic(col(k.trim2)))));
      });
    }

    // light: a halo behind the cabinet and a pool of its color on the floor in front
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), additive(shared.glow(k.trim), col(k.trim), .22));
    halo.position.set(0, 1.1, zc - .1); group.add(halo);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), additive(shared.glow(k.trim), col(k.trim), .55));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .003, .5); group.add(pool);

    return {group, mats, screen: scr, start: new THREE.Vector3(0, P.start[1], P.start[0] + zc + .02), game: g, k};
  }

  /* ---------- the scene ---------- */
  A.Floor3D = {
    create(aisle, opts) {
      const THREE = window.THREE;
      if (!THREE || !THREE.WebGLRenderer) return Promise.reject(new Error('three.js missing'));
      const fonts = ['GN Display', 'GN Haunt', 'GN Pixel', 'GN Shade', 'GN Music', 'GN Text'].map(f => document.fonts ? document.fonts.load(`40px "${f}"`, 'AZ𝄞♭') : null);
      const fontWait = Promise.race([Promise.all(fonts).catch(() => {}), new Promise(ok => setTimeout(ok, 2500))]);
      return fontWait.then(() => setup(THREE, aisle, opts));
    },
  };

  function setup(THREE, aisle, opts) {
    const {ring, wrap, onGiveUp} = opts, M = ring.length;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let level = 0;                                                  // 0 = full, 1 = downgraded (dpr 1, no haze, no sway)
    const dpr = () => level ? 1 : Math.min(1.5, window.devicePixelRatio || 1);

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
    renderer.setPixelRatio(dpr());
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    const cvs = renderer.domElement;
    cvs.className = 'floor3d'; cvs.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 40);
    const haze = new THREE.Fog(new THREE.Color(tok.floor), 5.5, 15);
    scene.fog = haze;

    scene.add(new THREE.HemisphereLight(new THREE.Color(tok['purple-ink']), new THREE.Color(tok.deep), .9));
    const key = new THREE.DirectionalLight(0xffffff, .35); key.position.set(0, 3, 5); scene.add(key);
    const pinkL = new THREE.PointLight(new THREE.Color(tok.pink), 1.2, 9); pinkL.position.set(-3, 2.5, 2); scene.add(pinkL);
    const cyanL = new THREE.PointLight(new THREE.Color(tok.cyan), 1.2, 9); cyanL.position.set(3, 2.5, 2); scene.add(cyanL);

    // shared textures (one per game / color, reused by repeated cabinets)
    const cache = {};
    const shared = {
      glow(c) { return cache['g' + c] || (cache['g' + c] = new THREE.CanvasTexture(radial(128, '#ffffff'))); },
      marquee(g, k, aspect) {
        const id = 'm' + g.id;
        if (!cache[id]) {
          const c = canvas(512, Math.round(512 / aspect));
          drawMarquee(c, g, k, () => { cache[id].needsUpdate = true; kick(); });   // some marquees finish drawing a moment later
          cache[id] = new THREE.CanvasTexture(c);
        }
        return cache[id];
      },
      screen(g, k, aspect) {
        const id = 's' + g.id;
        if (!cache[id]) {
          const c = canvas(256, Math.round(256 / aspect)), draw = (SCREENS3D[k.screen] || SCREENS3D.insert).bind(k);
          const tex = new THREE.CanvasTexture(c);
          const s = {texture: tex, draw(t) { draw(c.getContext('2d'), c.width, c.height, t, g); tex.needsUpdate = true; }};
          s.draw(null);
          cache[id] = s;
        }
        return cache[id];
      },
    };

    // floor: dark and glossy. The cabinets are drawn a second time upside down underneath it (render()),
    // and this see-through floor darkens that copy into a reflection.
    const fc = canvas(512, 512), fx = fc.getContext('2d');
    fx.fillStyle = tok.deep; fx.fillRect(0, 0, 512, 512);
    fx.fillStyle = tok['floor-3']; fx.globalAlpha = .35;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2) fx.fillRect(x * 32, y * 32, 32, 32);
    fx.globalAlpha = 1; fx.globalCompositeOperation = 'destination-in';
    fx.drawImage(radial(512, 'rgba(0,0,0,1)', .35), 0, 0);
    const floorTex = new THREE.CanvasTexture(fc);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({map: floorTex, transparent: true, opacity: .8, depthWrite: true, fog: false}));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2);
    scene.add(floor);

    // haze toward the back of the room
    const hazeGroup = new THREE.Group();
    [[tok.purple, -2.5, .3], [tok.pink, 2.8, .18], [tok.cyan, 0, .14]].forEach(([c, x, o], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({map: shared.glow('h'), color: new THREE.Color(c), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
      m.position.set(x, 2.2 + i * .3, -7 - i); hazeGroup.add(m);
    });
    scene.add(hazeGroup);

    // the cabinets
    const ringGroup = new THREE.Group(); scene.add(ringGroup);
    const items = ring.map(g => { const it = build(THREE, g, shared); ringGroup.add(it.group); return it; });

    // HTML START over the front cabinet's control panel
    const start = document.createElement('a');
    start.className = 'start3d';
    start.textContent = 'Start';
    aisle.appendChild(cvs); aisle.appendChild(start);
    aisle.classList.add('is-3d');

    /* ---------- layout ---------- */
    let Wpx = 1, Hpx = 1, narrow = false, dead = false;
    const Y_AXIS = new THREE.Vector3(0, 1, 0);
    function resize() {
      Wpx = aisle.clientWidth || 1; Hpx = aisle.clientHeight || 1;
      renderer.setPixelRatio(dpr());
      renderer.setSize(Wpx, Hpx, false);
      cvs.style.width = Wpx + 'px'; cvs.style.height = Hpx + 'px';
      const asp = Wpx / Hpx, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      narrow = Wpx < 600;
      // fit the front cabinet (about 2.2 m tall with its topper, 1 m wide) with room around it
      const dist = Math.max(2.45 / .92 / 2 / tan, (1 / (narrow ? .62 : .34)) / 2 / (tan * asp));
      camera.aspect = asp;
      camera.position.set(0, 1.2, dist);
      camera.lookAt(0, 1.02, 0);
      camera.updateProjectionMatrix();
      kick();
    }

    /* ---------- the carousel ---------- */
    let pos = opts.cur, from = pos, to = pos, t0 = 0, turning = false;
    const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const frontIdx = () => ((Math.round(pos) % M) + M) % M;

    function layout(now) {
      const sway = (!reduced.matches && !level) ? Math.sin(now / 1000 * .9) * SWAY : 0;
      items.forEach((it, r) => {
        const d = wrap(r - pos), ad = Math.abs(d);
        const dim = narrow ? Math.max(0, 1 - ad * 1.4) : ad < 1 ? 1 - .55 * ad : ad < 2 ? .45 - .25 * (ad - 1) : Math.max(0, .2 - .2 * (ad - 2) * 2);
        it.ad = ad;
        it.group.visible = dim > .01;
        if (!it.group.visible) return;
        const phi = d * ARC_STEP;
        it.group.position.set(Math.sin(phi) * ARC_R, 0, -ARC_R + Math.cos(phi) * ARC_R - SINK * Math.min(ad, 2.5));
        it.phi = phi;
        it.group.rotation.y = phi + sway * Math.max(0, 1 - ad);
        if (it.dim !== dim) {
          it.dim = dim;
          it.mats.forEach(([m, c, kind, op]) => {
            if (kind === 'add') m.opacity = (op || 1) * dim;
            else m.color.copy(c).multiplyScalar(dim);
          });
        }
      });
    }

    function placeStart() {
      const it = items[frontIdx()];
      // where START sits on the cabinet, ignoring the idle sway, so the button holds still under a finger
      const v = it.start.clone().applyAxisAngle(Y_AXIS, it.phi || 0).add(it.group.position).project(camera);
      const l = Math.round((v.x + 1) / 2 * Wpx) + 'px', t = Math.round((1 - v.y) / 2 * Hpx) + 'px';
      if (start.style.left !== l) start.style.left = l;
      if (start.style.top !== t) start.style.top = t;
    }

    /* ---------- rendering: only while something moves ---------- */
    let raf = 0, lastFrame = 0, lastRender = 0, lastScreen = 0, animT0 = performance.now();
    let sample = [], sampleStart = 0;
    function render() {
      renderer.clear();
      // pass 1: the reflection (everything upside down under the floor)
      floor.visible = false; hazeGroup.visible = false;
      const far = items.filter(it => it.group.visible && it.ad > 1.3);   // the far cabinets are too dim to reflect
      far.forEach(it => { it.group.visible = false; });
      ringGroup.scale.y = -1; camera.layers.disable(1); renderer.render(scene, camera);
      const calls = renderer.info.render.calls;
      far.forEach(it => { it.group.visible = true; });
      // pass 2: the room
      ringGroup.scale.y = 1; camera.layers.enable(1); floor.visible = true; hazeGroup.visible = !level;
      renderer.render(scene, camera);
      stats.drawCalls = calls + renderer.info.render.calls;
    }
    function frame(now) {
      raf = 0; lastTick = performance.now();
      if (document.hidden) return;
      // frame timing: the gap between animation frames, averaged over a few seconds
      if (lastFrame) {
        sample.push(now - lastFrame);
        if (now - sampleStart > SAMPLE_MS && sample.length >= 8) {   // 8 frames is enough: a very slow device must still be caught
          const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
          stats.avgMs = Math.round(avg * 10) / 10; stats.samples.push(stats.avgMs);
          if (fpsBox) fpsBox.textContent = `${stats.avgMs} ms/frame · ${stats.drawCalls} draws · ${level ? 'low' : 'full'} quality`;
          sample = []; sampleStart = now;
          if (avg > SLOW_MS && !stats.noDowngrade) {
            if (!level) { level = 1; stats.level = 1; scene.fog = null; resize(); }
            else { destroy(); onGiveUp(); return; }
          }
        }
      } else { sampleStart = now; }
      lastFrame = now;

      if (turning) {
        const p = Math.min(1, (now - t0) / TURN_MS);
        pos = from + (to - from) * easeIO(p);
        if (p >= 1) { turning = false; pos = to; }
      }
      const idle = !turning;
      if (!idle || now - lastRender >= IDLE_MS) {
        const t = (now - animT0) / 1000;
        if (!reduced.matches && now - lastScreen > 60) { items[frontIdx()].screen.draw(t); lastScreen = now; }
        layout(now); placeStart(); render(); lastRender = now; stats.frames++;
      }
      if (turning || !reduced.matches) raf = requestAnimationFrame(frame);
      else lastFrame = 0;
    }
    let lastTick = 0;
    function kick() {
      if (document.hidden || dead) return;
      if (raf && performance.now() - lastTick < 1000) return;       // already running
      cancelAnimationFrame(raf);
      lastFrame = 0; lastTick = performance.now();
      raf = requestAnimationFrame(frame);
    }
    // watchdog: if the loop ever stalls while it should be moving (sway, attract screen), restart it
    const watchdog = setInterval(() => { if (!reduced.matches && performance.now() - lastTick > 1500) kick(); }, 2000);
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; } else kick(); };
    document.addEventListener('visibilitychange', onVis);
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(aisle); else addEventListener('resize', resize);
    cvs.addEventListener('webglcontextlost', e => { e.preventDefault(); destroy(); onGiveUp(); });

    const stats = {avgMs: null, samples: [], level: 0, frames: 0, noDowngrade: A.params.has('keep3d')};
    // ?fps: a small readout of the average frame time, for checking real iPads and Chromebooks
    let fpsBox = null;
    if (A.params.has('fps')) { fpsBox = document.createElement('div'); fpsBox.className = 'fps3d'; fpsBox.textContent = 'measuring…'; aisle.appendChild(fpsBox); }
    const ray = new THREE.Raycaster();
    function destroy() {
      if (dead) return; dead = true;
      cancelAnimationFrame(raf); raf = 0; clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) ro.disconnect(); else removeEventListener('resize', resize);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      Object.values(cache).forEach(c => (c.texture || c).dispose());
      floorTex.dispose();
      renderer.dispose();
      cvs.remove(); start.remove(); if (fpsBox) fpsBox.remove();
      aisle.classList.remove('is-3d');
      A.Floor3D.stats = null;
    }
    // for testing and tuning: frame times (ms, averaged per few seconds), downgrade level, draw calls per frame (both passes)
    A.Floor3D.stats = () => Object.assign({}, stats, {pixelRatio: renderer.getPixelRatio(), haze: !!scene.fog});

    resize();
    return {
      kind: '3d',
      startLink: start,
      place(cur, instant) {
        const g = ring[cur];
        start.href = A.startLink(g, '');
        start.className = 'start3d ' + A.trimClasses(g);
        start.setAttribute('aria-label', 'Start ' + g.name);
        const target = pos + wrap(cur - pos);
        items[frontIdx()].screen.draw(null);             // the old front cabinet's screen goes still
        if (instant) { pos = from = to = target; turning = false; }
        else { from = pos; to = target; t0 = performance.now(); turning = true; }
        kick();
        if (instant && reduced.matches) { layout(performance.now()); placeStart(); render(); }
      },
      pick(e) {
        if (e.target !== cvs) return null;
        const r = cvs.getBoundingClientRect();
        ray.setFromCamera({x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1}, camera);
        // only the solid bodies count (not the glow planes, which spread over the neighbors)
        const bodies = [];
        items.forEach((it, r) => { if (it.group.visible) it.group.children.forEach(o => { if (o.userData.pick) { o.userData.ring = r; bodies.push(o); } }); });
        const hit = ray.intersectObjects(bodies, false)[0];
        return hit ? Math.round(wrap(hit.object.userData.ring - pos)) : null;
      },
      destroy,
    };
  }
})(window.Arcade);
