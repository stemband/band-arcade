/* Arcade floor in 3D (three.js r149, shared/vendor/three.min.js). Home page only.
   arcade.js loads three.js and calls Arcade.Floor3D.create(aisle, opts) when WebGL works; if anything
   here fails, or the device is too slow, arcade.js shows the 2D cabinets instead.

   The canvas is decoration. Everything a student reads or presses is still HTML (arcade.js):
   the game's name and description, the hi-score, the arrows, the lights, and START (an <a> this
   file only positions over the front cabinet's control panel).

   Each cabinet is built in code from its game's `cabinet3d` entry (shared/games.js):
     PROFILES  side silhouettes (z = depth, front is +z; y = height, in meters) that are extruded
               into the body, plus where the marquee, screen, control panel, coin door and START sit
               on them, and a topper ('peak' | 'dome' | 'fins' | 'pagoda' | 'vault' | 'gate' | 'vs' | 'puck' | 'lamp' | 'wing' | 'dish' | 'lanterns' | 'scroll' | 'road' | 'skyline' | 'taiko' | 'stand' | none). `dial: true`
               makes the coin door a round safe door with a combination dial; `twoPlayer: true` puts two joysticks
               and two sets of buttons on the control panel (1P in trim2, 2P in trim); `wheel: true` a steering wheel
               and a gear stick instead (a sit-down racer).
     colors    the 2D cabinet's trim/trim2 neon (theme.css tokens), so both versions match.
   Marquee and screen are canvas textures drawn with the bundled fonts; only the front cabinet's
   screen (the attract loop) and marquee (shared/marquees.js, at Arcade.Marquee.FPS) animate.

   Performance: renders only while something moves (a turn, the front cabinet's sway, its attract
   screen), at most ~30 fps when idle, never while the tab is hidden. Pixel ratio ≤ 1.5. If frames
   average over 40 ms for a few seconds it drops to pixel ratio 1 with no haze and no sway; if it is
   still slow after that it gives up (opts.onGiveUp) and arcade.js switches to the 2D cabinets. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const TURN_MS = 500, SPIN_MS = 650, SPIN_FROM = 2.5, SWAY = 0.14, SLOW_MS = 40, SAMPLE_MS = 3000, IDLE_MS = 32;
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
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.84, 0.84], [0.84, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.62, 1.46], [0.62, 1.66], [0, 1.66]],
      marquee: [[0.62, 1.47], [0.62, 1.65]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.84, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.12, y1: 0.56}, start: [0.62, 0.68],
    },
    /* temple: an upright cabinet under a temple gate (upswept top beam, tie beam, posts) with belt-color lanterns */
    temple: {
      width: 0.92, topper: 'gate',
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.84, 0.84], [0.84, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.62, 1.46], [0.62, 1.64], [0, 1.64]],
      marquee: [[0.62, 1.47], [0.62, 1.63]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.84, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
    /* rink: an upright for Neon Face-Off, two players at its panel, a glowing air hockey puck standing on top */
    rink: {
      width: 1.0, topper: 'puck', twoPlayer: true,
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.88, 0.84], [0.88, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.63, 1.46], [0.63, 1.66], [0, 1.66]],
      marquee: [[0.63, 1.48], [0.63, 1.64]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.88, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
    /* showtime: the old cabinet from the back room (Showtime Malfunction): a classic body, and a broken stage spotlight
       hanging askew on top */
    showtime: {
      width: 0.92, topper: 'lamp',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.78], [0, 1.78]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* speedway: a sit-down racer (Sustain Speedway): a tall screen hood, a dashboard with a steering wheel and a gear
       stick, a deep seat box in front, and a rear wing on top */
    speedway: {
      width: 1.04, topper: 'wing', wheel: true,
      points: [[0, 0], [0.98, 0], [0.98, 0.52], [0.66, 0.58], [0.66, 0.84], [0.86, 0.90], [0.86, 0.96], [0.56, 1.02], [0.46, 1.04], [0.40, 1.48], [0.66, 1.52], [0.66, 1.74], [0, 1.74]],
      marquee: [[0.66, 1.54], [0.66, 1.72]], screen: [[0.455, 1.07], [0.405, 1.45]], panel: [[0.86, 0.96], [0.56, 1.02]],
      door: {z: 0.98, y0: 0.1, y1: 0.44}, start: [0.66, 0.71],
    },
    /* duel: a wide two-player dojo cabinet (Dojo Duel): two players at its panel, and a dojo gate on top with two
       glowing paper lanterns and crossed bamboo practice swords */
    duel: {
      width: 1.08, topper: 'lanterns', twoPlayer: true,
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.90, 0.84], [0.90, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.64, 1.46], [0.64, 1.68], [0, 1.68]],
      marquee: [[0.64, 1.48], [0.64, 1.66]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.90, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
    /* signal: a deep-space radio console (Lost Signal): a classic body with a radio dish on a mast on top */
    signal: {
      width: 0.94, topper: 'dish',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.76], [0, 1.76]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* keys: the Keys to the City cabinet: a classic body with a little skyline on the roof, three skyscrapers standing
       in a piano's 2 + 3 black-key pattern, their windows lit */
    keys: {
      width: 0.96, topper: 'skyline',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.82, 0.84], [0.82, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.66, 1.50], [0.66, 1.72], [0.60, 1.76], [0, 1.76]],
      marquee: [[0.66, 1.52], [0.66, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.82, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* highway: the Music Highway cabinet: a classic body leaning forward a little, with a lit highway sign on two posts
       on the roof (a road running to the horizon) */
    highway: {
      width: 0.96, topper: 'road',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.82, 0.84], [0.82, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.66, 1.50], [0.66, 1.72], [0.60, 1.76], [0, 1.76]],
      marquee: [[0.66, 1.52], [0.66, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.82, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* ink: the Ink Master's cabinet (Vanishing Ink): a classic body with an unrolled scroll standing on the roof */
    ink: {
      width: 0.94, topper: 'scroll',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.76], [0, 1.76]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* taiko: the Rhythm Dojo cabinet: a classic body with a taiko drum on a low stand on the roof, its head facing
       out, a neon ring around the head */
    taiko: {
      width: 0.94, topper: 'taiko',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.76], [0, 1.76]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* audition: the Scale Trainer cabinet: a classic body with a music stand on the roof (a slanted desk holding a lit
       sheet of music, on a pole), a neon edge along the desk */
    audition: {
      width: 0.94, topper: 'stand',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.76], [0, 1.76]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* blocks: the Blocktave cabinet: a classic body with a little stack of neon blocks on the roof (dirt blocks with
       glowing moss tops, a music block in the middle with its note glowing) */
    blocks: {
      width: 0.94, topper: 'blocks',
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.80, 0.84], [0.80, 0.90], [0.56, 1.00], [0.46, 1.02], [0.40, 1.46], [0.64, 1.50], [0.64, 1.72], [0.58, 1.76], [0, 1.76]],
      marquee: [[0.64, 1.52], [0.64, 1.70]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.80, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* quest: a pixel-art cabinet (Arcade Quest): stepped, blocky edges front to back, like it was built from pixels */
    quest: {
      width: 0.94,
      points: [[0, 0], [0.62, 0], [0.62, 0.78], [0.72, 0.78], [0.72, 0.84], [0.82, 0.84], [0.82, 0.92], [0.56, 0.98], [0.46, 1.02], [0.40, 1.46],
               [0.56, 1.46], [0.56, 1.52], [0.64, 1.52], [0.64, 1.76], [0.56, 1.76], [0.56, 1.82], [0, 1.82]],
      marquee: [[0.64, 1.53], [0.64, 1.75]], screen: [[0.455, 1.05], [0.405, 1.43]], panel: [[0.82, 0.92], [0.56, 0.98]],
      door: {z: 0.62, y0: 0.14, y1: 0.58}, start: [0.62, 0.69],
    },
    /* versus: a wide two-player fighting cabinet with a long control panel and a lit VS sign on top */
    versus: {
      width: 1.08, topper: 'vs', twoPlayer: true,
      points: [[0, 0], [0.62, 0], [0.62, 0.76], [0.90, 0.84], [0.90, 0.90], [0.56, 1.00], [0.46, 1.02], [0.42, 1.42], [0.64, 1.46], [0.64, 1.68], [0, 1.68]],
      marquee: [[0.64, 1.48], [0.64, 1.66]], screen: [[0.455, 1.05], [0.425, 1.39]], panel: [[0.90, 0.90], [0.56, 1.00]],
      door: {z: 0.62, y0: 0.14, y1: 0.56}, start: [0.62, 0.68],
    },
  };
  const SHAPE_TO_PROFILE = {classic: 'classic', haunted: 'haunted', soundcheck: 'soundcheck', storm: 'storm', dojo: 'dojo', vault: 'vault', temple: 'temple', versus: 'versus', rink: 'rink', showtime: 'showtime', speedway: 'speedway', quest: 'quest', signal: 'signal', duel: 'duel', ink: 'ink', highway: 'highway', keys: 'keys', taiko: 'taiko', audition: 'audition', blocks: 'blocks'};
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
      marquee: c2.marquee, screen: c2.screen,
    };
  };

  /* ---------- colors: read from the theme tokens so 3D matches the rest of the site ---------- */
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || '#ff00ff';
  const tok = {};
  ['deep', 'floor', 'floor-2', 'floor-3', 'screen', 'ink', 'ink-2', 'text-hi', 'red', 'cab-side', 'cab-face', 'cab-panel', 'cab-metal',
   'pink', 'pink-hi', 'pink-ink', 'cyan', 'cyan-hi', 'cyan-ink', 'yellow', 'yellow-hi', 'yellow-ink', 'purple', 'purple-hi', 'purple-ink',
   'amber', 'amber-hi', 'amber-ink', 'green', 'green-hi', 'green-ink', 'red-hi', 'red-ink', 'white', 'white-hi', 'white-ink', 'blue', 'blue-hi', 'blue-ink',
   'dojo-wood', 'dojo-wood-2', 'dojo-paper', 'dojo-paper-dim', 'gold-ink', 'led-off', 'scroll-paper', 'scroll-rod', 'temple-wood', 'temple-sky',
   'belt-orange', 'belt-green', 'belt-blue', 'belt-purple', 'belt-red', 'belt-brown', 'belt-black', 'belt-diamond', 'anim-eye-bad',
   'sw-sky-top', 'sw-sky-mid', 'sw-sky-low', 'sw-sun-1', 'sw-sun-2', 'sw-ground', 'sw-grid', 'sw-road', 'sw-lane', 'sw-glass', 'sw-tail',
   'ls-scope', 'ls-grid', 'ls-wave', 'ls-ping', 'ls-sweep', 'dd-night', 'dd-wood', 'dd-wood-2', 'dd-wood-line', 'dd-paper', 'dd-lantern',
   'belt-white', 'belt-yellow', 'vi-paper', 'vi-paper-2', 'vi-rod', 'vi-rod-cap', 'vi-ink', 'vi-ink-2',
   'mh-sky', 'mh-road', 'mh-lane', 'mh-c', 'mh-e', 'mh-g', 'mh-b',
   'kt-night', 'kt-night-2', 'kt-street', 'kt-street-2', 'kt-bldg', 'kt-win-on', 'kt-win-off', 'kt-chop', 'kt-fork', 'kt-glow',
   'rd-body', 'rd-body-2', 'rd-head', 'rd-head-2', 'rd-iron', 'rd-stud', 'rd-stand',
   'sa-wall', 'sa-stand', 'sa-sheet', 'sa-ok', 'sa-cur',
   'bt-sky-night', 'bt-dirt', 'bt-slate', 'bt-moss', 'bt-tone',
   'pz-peg', 'pz-peg-hole', 'pz-wood', 'pz-wood-2', 'pz-paper', 'pz-glass', 'pz-warm'].forEach(n => { tok[n] = cssVar(n); });

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
    /* Neon Face-Off: the puck slides between a cyan and a magenta mallet on a tiny table (2.4 s loop, as 2D) */
    hockey(x, W, H, t) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      const L = W * .06, T = H * .1, R = W * .94, B = H * .9, u = tok[this.trim], v = tok[this.trim2];
      x.fillStyle = tok['floor-2']; x.fillRect(L, T, R - L, B - T);
      x.lineWidth = W * .018; x.strokeStyle = u; x.strokeRect(L, T, (R - L) / 2, B - T); x.strokeStyle = v; x.strokeRect(W / 2, T, (R - L) / 2, B - T);
      x.strokeStyle = tok['text-hi']; x.globalAlpha = .3; x.lineWidth = 1; x.beginPath(); x.arc(W / 2, H / 2, H * .14, 0, 7); x.stroke(); x.globalAlpha = 1;
      [[L + W * .08, u], [R - W * .08, v]].forEach(([mx, c]) => { x.strokeStyle = c; x.lineWidth = W * .02; x.beginPath(); x.arc(mx, H / 2, H * .08, 0, 7); x.stroke(); });
      const p = t == null ? .5 : (t % 2.4) / 2.4, a = p * Math.PI * 2;
      const px = W / 2 - Math.cos(a) * (W / 2 - L - W * .13), py = H / 2 - Math.sin(a) * (H / 2 - T - H * .12);
      const gr = x.createRadialGradient(px, py, 0, px, py, H * .1); gr.addColorStop(0, tok['white-hi']); gr.addColorStop(.4, tok.yellow); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, H * .1, 0, 7); x.fill();
    },
    /* Arcade Quest: glitchy static with an 8-bit microphone flickering through it (as 2D) */
    quest(x, W, H, t) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      const seed = t == null ? 1 : Math.floor(t * 8);
      for (let i = 0; i < 140; i++) {
        const r = Math.sin(seed * 91.7 + i * 12.9898) * 43758.5453, a = r - Math.floor(r), b = (r * 7.13) - Math.floor(r * 7.13);
        x.fillStyle = `rgba(200,195,225,${.06 + a * .2})`; x.fillRect(a * W, b * H, W * .05, 1.5);
      }
      const bar = t == null ? .3 : ((Math.floor(t * 3) * 37) % 70) / 100;
      x.fillStyle = tok[this.trim]; x.globalAlpha = .25; x.fillRect(0, H * bar, W, H * .1); x.globalAlpha = 1;
      const glitch = t != null && (t % 3.4) > 2.9, mic = A.QUEST_MIC || [], ps = H * .5 / Math.max(1, mic.length);
      const ox = W / 2 - 4.5 * ps + (glitch ? ps * 2 : 0), oy = H * .2;
      x.fillStyle = tok[this.trim + '-hi']; x.globalAlpha = glitch ? .4 : 1;
      mic.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === 'X') x.fillRect(ox + rx * ps, oy + ry * ps, ps + .5, ps + .5); }));
      x.globalAlpha = 1; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok[this.trim2 + '-hi'];
      x.font = `700 ${H * .09}px "GN Quest", sans-serif`; x.fillText('?? ??? ??', W / 2, H * .86);
    },
    /* Sustain Speedway: a synthwave road to a striped sun, lane lines rushing toward you, a car in the middle (as 2D) */
    /* Dojo Duel: two little ninjas across a glowing center line, a note card between them; they take turns hopping
       and the score ticks up (as 2D) */
    duel(x, W, H, t) {
      const tt = t == null ? .3 : t, ph = tt % 2.4;
      x.fillStyle = tok['dd-night']; x.fillRect(0, 0, W, H);
      x.fillStyle = tok['dd-wood']; x.fillRect(0, H * .72, W, H * .28);
      x.strokeStyle = tok.yellow; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2, H * .2); x.lineTo(W / 2, H); x.stroke();
      x.fillStyle = tok.screen; x.fillRect(W * .36, H * .16, W * .28, H * .28);
      x.strokeStyle = tok.ink; x.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const y = H * (.22 + i * .055); x.beginPath(); x.moveTo(W * .39, y); x.lineTo(W * .61, y); x.stroke(); }
      x.fillStyle = tok.ink; x.beginPath(); x.ellipse(W * .51, H * .3, W * .022, H * .025, -.35, 0, 7); x.fill();
      x.fillRect(W * .528, H * .18, 2, H * .12);
      const hop = p => (p > .19 && p < .72 ? -Math.sin((p - .19) / .53 * Math.PI) * H * .1 : 0);
      [[.21, this.trim2, 'belt-red', hop(ph)], [.79, this.trim, 'belt-blue', hop((ph + 1.2) % 2.4)]].forEach(([u, c, b, dy]) => {
        const cx = W * u, cy = H * .56 + dy;
        x.fillStyle = tok[c + '-hi']; x.beginPath(); x.arc(cx, cy, H * .08, 0, 7); x.fill();
        x.fillRect(cx - W * .05, cy + H * .09, W * .1, H * .18);
        x.fillStyle = tok[b]; x.fillRect(cx - H * .08, cy - H * .035, H * .16, H * .03);
      });
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${H * .12}px "GN Display", sans-serif`;
      const s1 = 1 + Math.floor(tt / 2.4) % 6, s2 = Math.floor((tt + 1.2) / 2.4) % 6;
      x.fillStyle = tok[this.trim2 + '-hi']; x.fillText(String(s1), W * .21, H * .12);
      x.fillStyle = tok[this.trim + '-hi']; x.fillText(String(s2), W * .79, H * .12);
      x.fillStyle = tok.yellow; x.font = `${H * .07}px "GN Display", sans-serif`; x.fillText('FIRST TO TAP!', W / 2, H * .92);
    },
    /* Lost Signal: a radar screen, the sweep turning, blips fading in and out as it passes (never a flash) */
    signal(x, W, H, t) {
      const tt = t == null ? 1.1 : t, cx = W / 2, cy = H * .47, R = H * .38;
      x.fillStyle = tok['ls-scope']; x.fillRect(0, 0, W, H);
      x.strokeStyle = tok['ls-grid']; x.lineWidth = 2;
      for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(cx, cy, R * k / 3, 0, Math.PI * 2); x.stroke(); }
      x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
      const ang = tt * 2.1 - Math.PI / 2;
      x.fillStyle = tok['ls-grid']; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, ang - .5, ang); x.closePath(); x.fill();
      x.strokeStyle = tok['ls-wave']; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); x.stroke();
      [[.6, .55], [2.4, .8], [4.1, .4]].forEach(([ba, br]) => {
        const since = (((ang - ba) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / 2.1, a = Math.max(0, 1 - since / 1.3);
        x.globalAlpha = a; x.fillStyle = tok['ls-wave']; x.beginPath(); x.arc(cx + Math.cos(ba) * br * R, cy + Math.sin(ba) * br * R, H * .025, 0, 7); x.fill();
      });
      x.globalAlpha = 1;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok['ls-wave'];
      x.font = `${H * .07}px "GN Display", sans-serif`; x.fillText('INCOMING…', W / 2, H * .93);
    },
    /* Keys to the City: a little skyline keyboard; a black key's windows fade on, then a white key glows (as 2D) */
    keys(x, W, H, t) {
      const tt = t == null ? 1.5 : t, ph = (tt % 3) / 3, on = ph < .2 ? 0 : ph < .45 ? (ph - .2) / .25 : ph < .75 ? 1 : 1 - (ph - .75) / .25;
      x.fillStyle = tok['kt-night-2']; x.fillRect(0, 0, W, H);
      const u = W / 9, y0 = H * .45;
      for (let i = 0; i < 7; i++) {
        x.fillStyle = tok['kt-street']; x.fillRect(u + i * u + 1, y0, u - 2, H * .4);
        if (i === 3) { x.globalAlpha = on; x.fillStyle = tok['kt-glow']; x.fillRect(u + i * u + 1, y0, u - 2, H * .4); x.globalAlpha = 1; }   // the asked key fades on
      }
      [0, 1, 3, 4, 5].forEach(i => { x.fillStyle = tok['kt-bldg']; x.fillRect(u + i * u + u * .65, y0 - H * .15, u * .7, H * .38);
        for (let r = 0; r < 4; r++) { x.fillStyle = i === 4 && on > .3 ? tok['kt-win-on'] : tok['kt-win-off']; x.fillRect(u + i * u + u * .8, y0 - H * .1 + r * H * .07, u * .4, H * .03); } });
      x.strokeStyle = tok['kt-chop']; x.lineWidth = 3; x.beginPath(); x.moveTo(u * 2.2, H * .08); x.lineTo(u * 2.45, H * .3); x.moveTo(u * 2.9, H * .08); x.lineTo(u * 2.65, H * .3); x.stroke();
      x.strokeStyle = tok['kt-fork']; x.beginPath(); [5.7, 6, 6.3].forEach(v => { x.moveTo(u * v, H * .08); x.lineTo(u * v, H * .17); }); x.moveTo(u * 5.7, H * .17); x.quadraticCurveTo(u * 6, H * .24, u * 6.3, H * .17); x.moveTo(u * 6, H * .21); x.lineTo(u * 6, H * .32); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok[this.trim + '-hi']; x.font = `${H * .07}px "GN Display", sans-serif`; x.fillText('FIND THE KEY!', W / 2, H * .93);
    },
    /* Music Highway: the game itself at cabinet size (shared/highway-draw.js: the same drawing as the game, playing the
       first phrase of Hot Cross Buns and looping; t = null: the still frame) */
    highway(x, W, H, t) {
      if (A.HighwayDraw) return A.HighwayDraw.attract(x, W, H, t);
      x.fillStyle = tok['mh-sky']; x.fillRect(0, 0, W, H);
    },
    /* Scale Trainer: the same canvas drawing as the 2D screen (shared/cabinets.js SCREENS.audition) */
    audition(x, W, H, t) {
      const scr = A.CAB_SCREENS && A.CAB_SCREENS.audition;
      if (scr && scr.draw) return scr.draw(x, W, H, t);
      x.fillStyle = tok['sa-wall']; x.fillRect(0, 0, W, H);
    },
    /* Blocktave: the same canvas drawing as the 2D screen (shared/cabinets.js SCREENS.blocks) */
    blocks(x, W, H, t) {
      const scr = A.CAB_SCREENS && A.CAB_SCREENS.blocks;
      if (scr && scr.draw) return scr.draw(x, W, H, t);
      x.fillStyle = tok['bt-sky-night']; x.fillRect(0, 0, W, H);
    },
    /* Rhythm Dojo: the same canvas drawing as the 2D screen (shared/cabinets.js SCREENS.taiko) */
    taiko(x, W, H, t) {
      const scr = A.CAB_SCREENS && A.CAB_SCREENS.taiko;
      if (scr && scr.draw) return scr.draw(x, W, H, t);
      x.fillStyle = tok['dd-night']; x.fillRect(0, 0, W, H);
    },
    /* Vanishing Ink: three notes brush onto a small scroll, stay, then fade away slowly; "PLAY IT BACK!" (4.2 s loop, as 2D) */
    ink(x, W, H, t) {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, tok['dd-night']); g.addColorStop(1, tok.deep);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const L = W * .12, R = W * .88, T = H * .14, B = H * .72;
      x.fillStyle = tok['vi-paper']; x.fillRect(L, T, R - L, B - T);
      x.fillStyle = tok['vi-rod']; x.fillRect(L - W * .05, T - H * .04, W * .05, B - T + H * .08); x.fillRect(R, T - H * .04, W * .05, B - T + H * .08);
      const gap = (B - T) / 8, top = T + gap * 2;
      x.strokeStyle = tok['vi-ink-2']; x.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(L + W * .03, top + i * gap); x.lineTo(R - W * .03, top + i * gap); x.stroke(); }
      const tt = t == null ? 1.5 : t % 4.2;
      [[.28, 3.5], [.5, 2.5], [.72, 1.5]].forEach(([u, st], i) => {
        const p = (tt - i * .25) / 4.2, a = p < 0 ? 0 : p < .06 ? p / .06 : p < .5 ? 1 : p < .74 ? 1 - (p - .5) / .24 : 0;
        const nx = W * u, ny = top + st * gap;
        x.globalAlpha = a; noteHead(x, nx, ny, gap, tok['vi-ink']);
        x.strokeStyle = tok['vi-ink']; x.lineWidth = 2.5; x.beginPath(); x.moveTo(nx + gap * .55, ny); x.lineTo(nx + gap * .55, ny - gap * 3.2); x.stroke();
      });
      x.globalAlpha = tt / 4.2 > .62 ? 1 : 0;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok[this.trim + '-hi'];
      x.font = `${H * .075}px "GN Display", sans-serif`; x.fillText('READ IT… PLAY IT BACK!', W / 2, H * .88);
      x.globalAlpha = 1;
    },
    speedway(x, W, H, t) {
      const hor = H * .47, tt = t == null ? 0 : t;
      x.fillStyle = tok['sw-sky-mid']; x.fillRect(0, 0, W, hor);
      const r = H * .22, sg = x.createLinearGradient(0, hor - r, 0, hor); sg.addColorStop(0, tok['sw-sun-1']); sg.addColorStop(1, tok['sw-sun-2']);
      x.fillStyle = sg; x.beginPath(); x.arc(W / 2, hor, r, Math.PI, 0); x.fill();
      x.fillStyle = tok['sw-sky-mid']; [.25, .45, .65].forEach((k, i) => x.fillRect(W / 2 - r, hor - r * k, r * 2, 2 + i * 1.5));
      x.fillStyle = tok['sw-ground']; x.fillRect(0, hor, W, H - hor);
      x.strokeStyle = tok['sw-grid']; x.globalAlpha = .6; x.lineWidth = 1;
      for (let i = 1; i < 7; i++) { const y = hor + (H - hor) * Math.pow(((i + (tt * 1.4) % 1) / 7), 2); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
      for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * .02, hor); x.lineTo(W / 2 + i * W * .2, H); x.stroke(); }
      x.globalAlpha = 1;
      x.fillStyle = tok['sw-road']; x.beginPath(); x.moveTo(W * .47, hor); x.lineTo(W * .53, hor); x.lineTo(W * .85, H); x.lineTo(W * .15, H); x.closePath(); x.fill();
      x.strokeStyle = tok[this.trim]; x.lineWidth = 3; x.beginPath(); x.moveTo(W * .47, hor); x.lineTo(W * .15, H); x.moveTo(W * .53, hor); x.lineTo(W * .85, H); x.stroke();
      x.strokeStyle = tok['sw-lane']; x.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = ((i + (tt * 2) % 1) / 6), b = a + .07; x.beginPath(); x.moveTo(W / 2, hor + (H - hor) * a * a); x.lineTo(W / 2, hor + (H - hor) * Math.min(1, b * b)); x.stroke(); }
      const cw = W * .2, cy = H * .9, sway = Math.sin(tt * 2.6) * W * .01;
      x.fillStyle = tok[this.trim]; x.fillRect(W / 2 - cw / 2 + sway, cy - H * .09, cw, H * .09);
      x.fillStyle = tok['sw-glass']; x.fillRect(W / 2 - cw * .32 + sway, cy - H * .15, cw * .64, H * .06);
      x.fillStyle = tok['sw-tail']; x.fillRect(W / 2 - cw * .45 + sway, cy - H * .06, cw * .2, H * .025); x.fillRect(W / 2 + cw * .25 + sway, cy - H * .06, cw * .2, H * .025);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok[this.trim2 + '-hi'];
      x.font = `${H * .08}px "GN Display", sans-serif`; x.fillText('HOLD THE NOTE', W / 2, H * .12);
    },
    /* Showtime Malfunction: static, and a pair of red eyes glowing through it that blinks now and then (as 2D) */
    showtime(x, W, H, t) {
      x.fillStyle = tok.deep; x.fillRect(0, 0, W, H);
      const seed = t == null ? 1 : Math.floor(t * 8);
      for (let i = 0; i < 160; i++) {                       // cheap static: a few small grey dashes, reshuffled 8 times a second
        const r = Math.sin(seed * 97.1 + i * 12.9898) * 43758.5453, a = r - Math.floor(r), b = (r * 7.13) - Math.floor(r * 7.13);
        x.fillStyle = `rgba(200,195,225,${.08 + a * .22})`; x.fillRect(a * W, b * H, W * .05, 1.5);
      }
      const blink = t != null && (t % 4.5) > 4.1, ey = H * .44, eye = tok['anim-eye-bad'];
      if (!blink) [W * .4, W * .6].forEach(ex => {
        const gr = x.createRadialGradient(ex, ey, 0, ex, ey, H * .14); gr.addColorStop(0, eye); gr.addColorStop(.3, eye); gr.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(ex, ey, H * .14, 0, 7); x.fill();
      });
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = tok[this.trim + '-hi']; x.globalAlpha = .8;
      x.font = `${H * .09}px "GN Display", sans-serif`; x.fillText('SHOWTIME?', W / 2, H * .84); x.globalAlpha = 1;
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

    // marquee: lit; its scene animates only while this cabinet is in front (shared/marquees.js)
    const mq = shared.marquee(g, k, W * .9 / segLen(P.marquee));
    panel(P.marquee, W * .9, basic(new THREE.Color(1, 1, 1), {map: mq.texture}));
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
    if (P.wheel) {                                      // a sit-down racer: a steering wheel, a gear stick, one button
      const wh = new THREE.Group(); wh.position.set(0, -.02, .05); wh.rotation.x = -.75; pw.add(wh);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 8, 28), lambert(col('deep'))); wh.add(detail(rim));
      const grip = new THREE.Mesh(new THREE.TorusGeometry(.1, .026, 8, 16, Math.PI * .7), basic(col(k.trim))); grip.rotation.z = Math.PI * .15; wh.add(detail(grip));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .02, 14), basic(col(k.trim2))); hub.rotation.x = Math.PI / 2; wh.add(detail(hub));
      [[.12, .012], [.012, .12]].forEach(([a, b], i) => { const sp = new THREE.Mesh(new THREE.BoxGeometry(i ? .014 : .19, i ? .1 : .014, .01), lambert(col('cab-metal'))); if (i) sp.position.y = -.05; wh.add(detail(sp)); });
      const col0 = new THREE.Mesh(up(new THREE.CylinderGeometry(.016, .016, .09, 8)), lambert(col('cab-metal'))); col0.position.set(0, .01, .045); pw.add(detail(col0));
      joystick(-W * .36, k.trim);                       // the gear stick
      button(W * .36, 0, k.trim2);
    } else if (P.twoPlayer) {                                  // 1P (trim2) on the left, 2P (trim) on the right
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
    } else if (P.topper === 'puck') {
      // a big air hockey puck standing on the roof: a dark disc with a neon rim in each player's color
      const r = W * .26, cy = topY + r + .02, fz = frontTop + zc - .1;
      const face = geom => { geom.rotateX(Math.PI / 2); return geom; };
      const disc = new THREE.Mesh(face(new THREE.CylinderGeometry(r, r, .08, 32)), [lambert(col('cab-side')), lambert(col('deep')), lambert(col('cab-side'))]);
      disc.position.set(0, cy, fz); disc.userData.pick = true; group.add(disc);
      [[r, k.trim], [r * .62, k.trim2]].forEach(([rr, c]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, .01, 6, 40), basic(col(c + '-hi'))); ring.position.set(0, cy, fz + .042); group.add(ring);
        const glow = new THREE.Mesh(new THREE.TorusGeometry(rr, .032, 6, 40), basic(col(c), {transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false}));
        glow.position.set(0, cy, fz + .042); group.add(glow);
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
    } else if (P.topper === 'wing') {
      // a racing wing on two struts, edged in both neons (Sustain Speedway)
      const fz = frontTop + zc - .2, metal = lambert(col('cab-metal'));
      [-1, 1].forEach(sd => { const st = new THREE.Mesh(new THREE.BoxGeometry(.03, .14, .05), metal); st.position.set(sd * W * .3, topY + .07, fz); group.add(detail(st)); });
      const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, .025, .2), lambert(col('cab-side'))); wing.position.set(0, topY + .15, fz); wing.rotation.x = -.12; group.add(wing);
      neon([new THREE.Vector3(-W * .51, topY + .17, fz + .1), new THREE.Vector3(W * .51, topY + .17, fz + .1)]);
      [-1, 1].forEach(sd => { const pl = new THREE.Mesh(new THREE.BoxGeometry(.02, .12, .24), basic(col(k.trim2))); pl.position.set(sd * W * .51, topY + .15, fz); group.add(detail(pl)); });
    } else if (P.topper === 'lamp') {
      // a broken stage spotlight on a bracket, knocked askew, its lens still glowing (Showtime Malfunction)
      const fz = frontTop + zc - .14, metal = lambert(col('cab-metal'));
      const post = new THREE.Mesh(new THREE.BoxGeometry(.03, .16, .03), metal); post.position.set(W * .2, topY + .08, fz); group.add(post);
      const lamp = new THREE.Group(); lamp.position.set(W * .2, topY + .17, fz); lamp.rotation.set(.5, 0, -.7);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .18, 14, 1, true), lambert(col('cab-side'))); can.rotation.x = Math.PI / 2; lamp.add(can);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(.08, 16), basic(col(k.trim2 + '-hi'))); lens.position.z = .09; lamp.add(lens);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(.16, 16), basic(col(k.trim2), {transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false})); glow.position.z = .095; lamp.add(glow);
      lamp.userData.pick = true; group.add(detail(lamp));
    } else if (P.topper === 'lanterns') {
      // a small dojo gate on the roof: a wooden beam with upturned ends on two posts, two paper lanterns hanging from
      // it (steady glow), and two bamboo practice swords crossed in the middle (Dojo Duel)
      const fz = frontTop + zc - .1, wood = lambert(col('dd-wood-2'));
      [-1, 1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(.05, .34, .05), wood); post.position.set(sd * W * .44, topY + .17, fz); group.add(post); });
      const beamShape = new THREE.Shape([[-W / 2 - .12, .08], [-W / 2, 0], [W / 2, 0], [W / 2 + .12, .08], [W / 2 + .1, .11], [0, .06], [-W / 2 - .1, .11]].map(([a, b]) => new THREE.Vector2(a, b)));
      const bg = new THREE.ExtrudeGeometry(beamShape, {depth: .1, bevelEnabled: false}); bg.translate(0, topY + .34, fz - .05);
      const beam = new THREE.Mesh(bg, [lambert(col(k.body)), wood]); beam.userData.pick = true; group.add(beam);
      neon([[-W / 2 - .12, .08], [-W / 2, 0], [W / 2, 0], [W / 2 + .12, .08]].map(([a, b]) => new THREE.Vector3(a, topY + .34 + b, fz + .054)));
      [-1, 1].forEach(sd => {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 10), basic(col('dd-lantern'))); lamp.scale.set(1, 1.3, 1);
        lamp.position.set(sd * W * .3, topY + .2, fz + .03); group.add(detail(lamp));
        const glow = new THREE.Mesh(new THREE.CircleGeometry(.17, 18), basic(col('dd-paper'), {transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false}));
        glow.position.set(sd * W * .3, topY + .2, fz + .11); group.add(glow);
        [.105, -.105].forEach(dy => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .02, 10), lambert(col('dd-wood-line'))); cap.position.set(sd * W * .3, topY + .2 + dy * .87, fz + .03); group.add(detail(cap)); });
      });
      [-.6, .6].forEach(a => {
        const bam = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .42, 8), lambert(col('belt-green'))); bam.rotation.z = a;
        bam.position.set(0, topY + .17, fz + .02); group.add(detail(bam));
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .1, 8), wood); grip.rotation.z = a;
        grip.position.set(Math.sin(-a) * .16, topY + .17 + Math.cos(a) * -.16, fz + .02); group.add(detail(grip));
      });
    } else if (P.topper === 'skyline') {
      // a little skyline on the roof: five skyscrapers in a piano's 2 + 3 black-key pattern, lit windows, a neon line (Keys to the City)
      const fz = frontTop + zc - .16, bw = W * .1;
      [[-.36, .3], [-.24, .38], [-.02, .26], [.12, .42], [.26, .32]].forEach(([u, h]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, h, .12), lambert(col('kt-bldg'))); b.position.set(u * W, topY + h / 2, fz); b.userData.pick = true; group.add(detail(b));
        for (let r = 0; r < Math.floor(h / .07); r++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(bw * .5, .025), basic(col(r % 3 ? 'kt-win-on' : 'kt-win-off'))); w.position.set(u * W, topY + .04 + r * .07, fz + .061); group.add(detail(w)); }
      });
      neon([new THREE.Vector3(-W * .45, topY + .01, fz + .07), new THREE.Vector3(W * .45, topY + .01, fz + .07)]);
    } else if (P.topper === 'road') {
      // a highway sign on two posts: a road to the horizon between neon edges, a few stars (Music Highway)
      const fz = frontTop + zc - .14, sw = W * .7, sh = .26, metal = lambert(col('cab-metal'));
      [-1, 1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(.03, .12, .03), metal); post.position.set(sd * sw * .35, topY + .06, fz); group.add(detail(post)); });
      const box = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, .05), lambert(col('cab-side'))); box.position.set(0, topY + .12 + sh / 2, fz - .03); box.userData.pick = true; group.add(box);
      const c = canvas(256, 96), cx = c.getContext('2d');
      cx.fillStyle = tok['mh-sky']; cx.fillRect(0, 0, 256, 96);
      cx.fillStyle = tok['mh-road']; cx.beginPath(); cx.moveTo(116, 20); cx.lineTo(140, 20); cx.lineTo(236, 96); cx.lineTo(20, 96); cx.fill();
      cx.strokeStyle = tok[k.trim2]; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(116, 20); cx.lineTo(20, 96); cx.moveTo(140, 20); cx.lineTo(236, 96); cx.stroke();
      cx.strokeStyle = tok['mh-lane']; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(128, 20); cx.lineTo(128, 96); cx.stroke();
      cx.fillStyle = tok['text-hi']; [[30, 10], [70, 6], [200, 12], [230, 4], [100, 8]].forEach(([a2, b2]) => cx.fillRect(a2, b2, 2, 2));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sw * .94, sh * .88), basic(new THREE.Color(1, 1, 1), {map: new THREE.CanvasTexture(c)}));
      face.position.set(0, topY + .12 + sh / 2, fz + .002); group.add(face);
      neon([new THREE.Vector3(-sw / 2, topY + .12 + sh, fz + .004), new THREE.Vector3(sw / 2, topY + .12 + sh, fz + .004)]);
    } else if (P.topper === 'dish') {
      // a radio dish on a mast, tilted up at the sky, its rim in the trim neon and a glowing receiver tip (Lost Signal)
      const fz = frontTop + zc - .22, metal = lambert(col('cab-metal'));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, .2, 8), metal); mast.position.set(-W * .18, topY + .1, fz); group.add(detail(mast));
      const dish = new THREE.Group(); dish.position.set(-W * .18, topY + .24, fz); dish.rotation.set(-.55, .35, 0);
      const bowlMat = lambert(col('cab-side')); bowlMat.side = THREE.DoubleSide;
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 10, 0, Math.PI * 2, 0, .9), bowlMat);
      bowl.rotation.x = -Math.PI / 2; bowl.position.z = .16; dish.add(bowl);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.157, .01, 6, 32), basic(col(k.trim + '-hi'))); rim.position.z = .035; dish.add(rim);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(.157, .03, 6, 32), basic(col(k.trim), {transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false})); glow.position.z = .035; dish.add(glow);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .16, 6), metal); arm.rotation.x = Math.PI / 2; arm.position.z = .1; dish.add(arm);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), basic(col(k.trim2 + '-hi'))); tip.position.z = .19; dish.add(tip);
      dish.userData.pick = true; group.add(detail(dish));
    } else if (P.topper === 'scroll') {
      // an unrolled scroll standing on the roof: parchment with brush-ink notes (the last one faded) between two wooden
      // rods, a neon edge along its top (Vanishing Ink)
      const fz = frontTop + zc - .12, sw = W * .9, sh = .24, cy = topY + sh / 2 + .05;
      const c = canvas(256, 72), cx = c.getContext('2d');
      cx.fillStyle = tok['vi-paper']; cx.fillRect(0, 0, 256, 72);
      cx.strokeStyle = tok['vi-ink-2']; cx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { cx.beginPath(); cx.moveTo(14, 18 + i * 9); cx.lineTo(242, 18 + i * 9); cx.stroke(); }
      [[64, 49.5, 1], [128, 40.5, 1], [192, 31.5, .35]].forEach(([nx, ny, a]) => {
        cx.globalAlpha = a; noteHead(cx, nx, ny, 9, tok['vi-ink']);
        cx.strokeStyle = tok['vi-ink']; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(nx + 5, ny); cx.lineTo(nx + 5, ny - 28); cx.stroke();
      });
      cx.globalAlpha = 1;
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), basic(new THREE.Color(1, 1, 1), {map: new THREE.CanvasTexture(c)}));
      paper.position.set(0, cy, fz); paper.userData.pick = true; group.add(paper);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), lambert(col('vi-paper-2'))); back.rotation.y = Math.PI; back.position.set(0, cy, fz - .002); group.add(back);
      [-1, 1].forEach(sd => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, sh + .1, 10), lambert(col('vi-rod'))); rod.position.set(sd * sw / 2, cy, fz); group.add(detail(rod));
        [1, -1].forEach(e => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .03, 10), lambert(col('vi-rod-cap'))); cap.position.set(sd * sw / 2, cy + e * (sh / 2 + .06), fz); group.add(detail(cap)); });
        const leg = new THREE.Mesh(new THREE.BoxGeometry(.03, .06, .03), lambert(col('vi-rod-cap'))); leg.position.set(sd * sw / 2, topY + .02, fz); group.add(detail(leg));
      });
      neon([new THREE.Vector3(-sw / 2, cy + sh / 2 + .01, fz + .004), new THREE.Vector3(sw / 2, cy + sh / 2 + .01, fz + .004)]);
    } else if (P.topper === 'stand') {
      // a music stand on the roof: a slanted desk holding a lit sheet of music (a staff with a few notes), a pole and a
      // small base; a neon edge in the trim color along the desk's lip (Scale Trainer)
      const fz = frontTop + zc - .16, dw = W * .62, dh = .26, cy = topY + .2 + dh / 2;
      const c = canvas(256, 108), cx = c.getContext('2d');
      cx.fillStyle = tok['sa-sheet']; cx.fillRect(0, 0, 256, 108);
      cx.strokeStyle = tok.ink; cx.lineWidth = 1.5;
      for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { cx.beginPath(); cx.moveTo(12, 16 + r * 50 + i * 7); cx.lineTo(244, 16 + r * 50 + i * 7); cx.stroke(); }
      for (let i = 0; i < 8; i++) { noteHead(cx, 30 + i * 28, 44 - i * 3.5, 6, tok.ink); noteHead(cx, 30 + i * 28, 94 - (7 - i) * 3.5, 6, tok.ink); }
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), basic(new THREE.Color(1, 1, 1), {map: new THREE.CanvasTexture(c)}));
      desk.position.set(0, cy, fz); desk.rotation.x = -.28; desk.userData.pick = true; group.add(desk);
      const back = new THREE.Mesh(new THREE.BoxGeometry(dw + .04, dh + .03, .02), lambert(col('sa-stand'))); back.position.set(0, cy, fz - .016); back.rotation.x = -.28; group.add(detail(back));
      const lip = new THREE.Mesh(new THREE.BoxGeometry(dw + .04, .025, .05), lambert(col('sa-stand'))); lip.position.set(0, cy - dh / 2 * Math.cos(.28) - .01, fz + .04); group.add(detail(lip));
      neon([new THREE.Vector3(-dw / 2, cy - dh / 2 * Math.cos(.28) + .005, fz + .07), new THREE.Vector3(dw / 2, cy - dh / 2 * Math.cos(.28) + .005, fz + .07)]);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .22, 8), lambert(col('sa-stand'))); pole.position.set(0, topY + .1, fz - .04); group.add(detail(pole));
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.08, .09, .02, 12), lambert(col('sa-stand'))); foot.position.set(0, topY + .01, fz - .04); group.add(detail(foot));
    } else if (P.topper === 'taiko') {
      // a taiko drum on a low wooden stand on the roof: a warm-wood barrel body, iron bands, a row of gold studs, its head
      // facing out with a neon ring in the SECOND trim color (Rhythm Dojo, the bamboo dojo: a gold rim on a jade cabinet)
      const fz = frontTop + zc - .14, R0 = .19, cy = topY + R0 + .06;
      const drum = new THREE.Group(); drum.position.set(0, cy, fz);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, .2, 20, 1), lambert(col('rd-body'))); body.rotation.x = Math.PI / 2; drum.add(body);
      [.075, -.075].forEach(z => { const band = new THREE.Mesh(new THREE.TorusGeometry(R0 + .004, .008, 6, 24), lambert(col('rd-iron'))); band.position.z = z; drum.add(band); });
      const head = new THREE.Mesh(new THREE.CircleGeometry(R0 * .96, 24), basic(col('rd-head-2')));   // unlit: the room's purple light never tints the hide head.position.z = .101; drum.add(head);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R0 * .96, .012, 6, 28), basic(col(k.trim2 + '-hi'))); ring.position.z = .104; drum.add(ring);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(R0 * .96, .035, 6, 28), basic(col(k.trim2), {transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false})); glow.position.z = .104; drum.add(glow);
      for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2, st = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), basic(col('rd-stud'))); st.position.set(Math.cos(a) * (R0 + .006), Math.sin(a) * (R0 + .006), .085); drum.add(st); }
      drum.userData.pick = true; group.add(detail(drum));
      const wood = lambert(col('rd-stand'));
      [-1, 1].forEach(sd => { const leg = new THREE.Mesh(new THREE.BoxGeometry(.035, .12, .16), wood); leg.position.set(sd * R0 * .75, topY + .06, fz); group.add(detail(leg)); });
    } else if (P.topper === 'blocks') {
      // a little stack of neon blocks on the roof (Blocktave): dirt blocks with glowing moss tops, and a music block
      // (slate) in the middle with its cyan note glowing on the front
      const fz = frontTop + zc - .14, b = .15;
      [[-1, 0, 'bt-dirt'], [0, 0, 'bt-slate'], [1, 0, 'bt-dirt'], [-.5, 1, 'bt-dirt'], [.5, 1, 'bt-dirt']].forEach(([i, j, c]) => {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(b, b, b), lambert(col(c))); cube.position.set(i * b * 1.02, topY + b / 2 + j * b * 1.02, fz); group.add(detail(cube));
        if (c === 'bt-dirt') { const moss = new THREE.Mesh(new THREE.BoxGeometry(b * 1.01, b * .18, b * 1.01), basic(col('bt-moss'))); moss.position.set(i * b * 1.02, topY + b * .92 + j * b * 1.02, fz); group.add(detail(moss)); }
      });
      const note = new THREE.Mesh(new THREE.CircleGeometry(b * .2, 12), basic(col('bt-tone'))); note.scale.set(1.3, .9, 1); note.position.set(0, topY + b * .45, fz + b / 2 + .002); note.userData.pick = true; group.add(note);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(b * .5, 16), basic(col('bt-tone'), {transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false})); halo.position.set(0, topY + b * .45, fz + b / 2 + .004); group.add(halo);
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

    return {group, mats, screen: scr, marquee: mq, start: new THREE.Vector3(0, P.start[1], P.start[0] + zc + .02), game: g, k};
  }

  /* ---------- the scene ---------- */
  A.Floor3D = {
    create(aisle, opts) {
      const THREE = window.THREE;
      if (!THREE || !THREE.WebGLRenderer) return Promise.reject(new Error('three.js missing'));
      const fonts = ['GN Display', 'GN Haunt', 'GN Pixel', 'GN Shade', 'GN Music', 'GN Text', 'GN Neon', 'GN Quest', 'GN Brush'].map(f => document.fonts ? document.fonts.load(`40px "${f}"`, 'AZ𝄞♭') : null);
      const fontWait = Promise.race([Promise.all(fonts).catch(() => {}), new Promise(ok => setTimeout(ok, 2500))]);
      return fontWait.then(() => setup(THREE, aisle, opts));
    },
  };

  function setup(THREE, aisle, opts) {
    const {onGiveUp} = opts;
    let ring = opts.ring, wrap = opts.wrap, M = ring.length, fadeOf = opts.fade || (() => 1), tagOf = opts.tag || null;
    const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
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
          // pictures from shared/marquees/ can't go into WebGL on a page opened from a file (the browser forbids it)
          const c = canvas(512, Math.round(512 / aspect)), art = location.protocol !== 'file:';
          const tex = new THREE.CanvasTexture(c);
          const m = {texture: tex, dead: false, draw(t) { if (m.dead) return; A.Marquee.draw(c.getContext('2d'), c.width, c.height, t, g, {art}); tex.needsUpdate = true; }};
          m.draw(null);
          A.Marquee.onArt(g, () => { if (!m.dead) { m.draw(null); kick(); } });   // a picture or a font arrived: draw again
          cache[id] = m;
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
    // how visible the checks are: --floor-checks in arcade.css (0–1), shared with the 2D floor
    const checks = Math.max(0, Math.min(1, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--floor-checks')) || .55));
    fx.fillStyle = tok['floor-3']; fx.globalAlpha = checks;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2) fx.fillRect(x * 32, y * 32, 32, 32);
    fx.globalAlpha = 1; fx.globalCompositeOperation = 'destination-in';
    fx.drawImage(radial(512, 'rgba(0,0,0,1)', .35), 0, 0);
    const floorTex = new THREE.CanvasTexture(fc);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({map: floorTex, transparent: true, opacity: .8, depthWrite: true, fog: false}));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2);
    scene.add(floor);

    // haze toward the back of the room
    const hazeGroup = new THREE.Group();
    const HAZE = ['purple', 'pink', 'cyan'], LIGHTS = ['pink', 'cyan'];
    [[tok.purple, -2.5, .3], [tok.pink, 2.8, .18], [tok.cyan, 0, .14]].forEach(([c, x, o], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({map: shared.glow('h'), color: new THREE.Color(c), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
      m.position.set(x, 2.2 + i * .3, -7 - i); hazeGroup.add(m);
    });
    scene.add(hazeGroup);

    /* THE PRIZE COUNTER along the back wall (shared/prizes.js): a pegboard with prizes, a lit PRIZES sign and a counter
       with a glass case, one textured plane drawn once (no motion). A real HTML button sits over it (placePrize), so
       clicking it, or tabbing to it, opens the Prize Counter. Layer 1: never in the floor reflection. */
    let prize = null, prizeBtn = null;
    if (A.Prizes) {
      const c = canvas(512, 360), x = c.getContext('2d');
      x.fillStyle = tok['pz-peg']; x.fillRect(20, 60, 472, 220);
      x.fillStyle = tok['pz-peg-hole'];
      for (let yy = 72; yy < 270; yy += 16) for (let xx = 32; xx < 484; xx += 16) { x.beginPath(); x.arc(xx, yy, 2, 0, 7); x.fill(); }
      const warm = x.createRadialGradient(256, 60, 10, 256, 60, 300); warm.addColorStop(0, tok['pz-warm'] + '66'); warm.addColorStop(1, 'transparent');
      x.fillStyle = warm; x.fillRect(20, 60, 472, 220);
      x.fillStyle = tok['pz-wood-2']; [150, 214].forEach(yy => x.fillRect(30, yy, 452, 8));
      const prizeCols = [tok.pink, tok.cyan, tok.yellow, tok.purple, tok.green, tok.amber];
      for (let i = 0; i < 7; i++) {                          // prizes on the shelves: little round plushies and boxes
        const px = 62 + i * 64;
        x.fillStyle = prizeCols[i % prizeCols.length];
        x.beginPath(); x.arc(px, 132, 16, 0, 7); x.fill(); x.fillRect(px - 14, 180, 28, 32);
        x.fillStyle = tok['pz-paper']; x.fillRect(px + 6, 150 - 2, 14, 10);
      }
      x.strokeStyle = tok['text-hi']; x.lineWidth = 2;
      [110, 256, 402].forEach(px => { x.beginPath(); x.moveTo(px, 60); x.lineTo(px, 78); x.stroke(); x.fillStyle = prizeCols[(px / 7 | 0) % 6]; x.beginPath(); x.arc(px, 92, 14, 0, 7); x.fill(); });
      x.save(); x.shadowColor = tok.amber; x.shadowBlur = 18; x.fillStyle = tok['amber-hi']; x.textAlign = 'center'; x.textBaseline = 'middle';
      fitText(x, 'PRIZES', '"GN Neon", "GN Display", sans-serif', 54, 420); x.fillText('PRIZES', 256, 32); x.restore();
      x.fillStyle = tok['pz-wood']; x.fillRect(0, 280, 512, 80);                  // the counter
      x.fillStyle = tok['pz-glass'] + '44'; x.fillRect(40, 290, 432, 56);        // its glass case
      x.strokeStyle = tok['pz-glass']; x.lineWidth = 3; x.strokeRect(40, 290, 432, 56);
      x.fillStyle = tok.yellow; x.beginPath(); x.arc(452, 280, 12, Math.PI, 0); x.fill();   // the counter bell
      const tex = new THREE.CanvasTexture(c);
      prize = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4 * 360 / 512), new THREE.MeshBasicMaterial({map: tex, transparent: true, fog: false, color: new THREE.Color(.85, .85, .85)}));
      prize.position.set(-6.2, 2.4 * 360 / 512 / 2, -6.8); prize.rotation.y = .38; prize.layers.set(1);
      prize.userData.tex = tex;
      scene.add(prize);
      prizeBtn = document.createElement('button');
      prizeBtn.type = 'button'; prizeBtn.className = 'prize3d'; prizeBtn.hidden = true;
      prizeBtn.setAttribute('aria-label', 'Prize Counter');
      prizeBtn.addEventListener('click', e => { e.stopPropagation(); A.Prizes.open({onClose: () => prizeBtn.focus({preventScroll: true})}); });
    }

    /* the cabinets. Each place on the ring is a SLOT: a holder the carousel moves, with either the FULL cabinet
       (only the front one and its neighbors: NEAR places away) or a FLAT stand-in (one textured plane: a lit
       silhouette with the marquee) farther out. setRing() swaps the whole set (a new zone) and disposes the old. */
    const NEAR = 1.5;
    const ringGroup = new THREE.Group(); scene.add(ringGroup);
    let slots = [];
    function disposeTree(o) {
      o.traverse(x => {
        if (x.geometry) x.geometry.dispose();
        if (x.material) [].concat(x.material).forEach(m => m.dispose());   // their textures are shared (cache) and stay
      });
    }
    /* a flat, lightweight cabinet: its silhouette in the body color with a neon edge, the marquee and a glowing screen */
    function flatCab(g) {
      const k = A.cabinet3dOf(g), P = PROFILES[k.profile], W = P.width, H = Math.max(...P.points.map(p => p[1]));
      const c = canvas(128, Math.round(128 * H / W)), x = c.getContext('2d'), cw = c.width, ch = c.height;
      x.fillStyle = tok[k.body] || tok['cab-side']; x.fillRect(2, 2, cw - 4, ch - 4);
      x.strokeStyle = tok[k.trim + '-hi'] || tok[k.trim]; x.lineWidth = 3; x.strokeRect(2, 2, cw - 4, ch - 4);
      const mq = canvas(256, 64); A.Marquee.draw(mq.getContext('2d'), 256, 64, null, g, {art: false});
      x.drawImage(mq, 8, ch * .03, cw - 16, (cw - 16) / 4);
      x.fillStyle = tok.deep; x.fillRect(cw * .14, ch * .4, cw * .72, ch * .26);
      x.strokeStyle = tok[k.trim2] || tok[k.trim]; x.lineWidth = 2; x.strokeRect(cw * .14, ch * .4, cw * .72, ch * .26);
      const tex = new THREE.CanvasTexture(c), mats = [];
      const m = new THREE.MeshBasicMaterial({map: tex, color: new THREE.Color(1, 1, 1), transparent: true}); mats.push([m, m.color.clone(), 'color']);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m);
      mesh.position.set(0, H / 2, .1); mesh.userData.pick = true;
      return {mesh, mats, tex};
    }
    /* what a slot shows: 'full' | 'flat' | 'none' (too far round the ring to be seen: nothing built at all, so a big
       ring like the Full Arcade costs no more than a zone). The zone tag comes and goes with the flat/full cabinet. */
    const VIS = 2.6;                                     // layout(): nothing farther than 2.5 places is visible
    function dropSlot(S) {
      if (S.full) { S.holder.remove(S.full.group); disposeTree(S.full.group); S.full = null; stats.disposed++; }
      if (S.flat) { S.holder.remove(S.flat.mesh); disposeTree(S.flat.mesh); S.flat.tex.dispose(); S.flat = null; }
      if (S.tag) { S.holder.remove(S.tag.mesh); disposeTree(S.tag.mesh); S.tag.tex.dispose(); S.tag = null; }
    }
    function ensureTag(S) {
      if (S.tag || S.noTag) return;
      S.tag = zoneTag(S.g); S.noTag = !S.tag;
      if (S.tag) { S.holder.add(S.tag.mesh); S.dim = undefined; }
    }
    function setFull(S, on) {
      if (on === null) { dropSlot(S); return; }
      ensureTag(S);
      if (on && !S.full) {
        S.full = build(THREE, S.g, shared); S.holder.add(S.full.group);
        if (S.flat) { S.holder.remove(S.flat.mesh); disposeTree(S.flat.mesh); S.flat.tex.dispose(); S.flat = null; }
        S.dim = undefined; stats.built++;
      } else if (!on && !S.flat) {
        if (S.full) { S.holder.remove(S.full.group); disposeTree(S.full.group); S.full = null; stats.disposed++; }
        S.flat = flatCab(S.g); S.holder.add(S.flat.mesh); S.dim = undefined;
      }
    }
    /** full cabinets where the carousel is and where it's going (and every place in between). A FAST SPIN to a far
        cabinet (more than SPIN_FROM places: the Full Arcade's jump strip) builds only both ends: the cabinets it flies
        past stay flat stand-ins. */
    function sync(a, b) {
      const ends = Math.abs(b - a) > SPIN_FROM;
      slots.forEach((S, r) => {
        let near = false, seen = false;
        if (ends) near = Math.abs(wrap(r - a)) <= NEAR || Math.abs(wrap(r - b)) <= NEAR;
        for (let p = Math.min(a, b); p <= Math.max(a, b) + 1e-6; p += .5) {
          const d = Math.abs(wrap(r - p));
          if (!ends && d <= NEAR) near = true;
          if (d <= VIS) seen = true;
        }
        // a fast spin: the cabinets it flies past get their flat stand-in only as they come into view (layout())
        if (ends && !near && seen) seen = Math.abs(wrap(r - a)) <= VIS || Math.abs(wrap(r - b)) <= VIS || !!S.flat;
        setFull(S, near ? true : seen ? false : null);
      });
      stats.full = slots.filter(S => S.full).length; stats.flat = slots.filter(S => S.flat).length;
    }
    /* the ZONE TAG under a cabinet (the Full Arcade: which zone the game lives in): a small lit plate standing on the
       floor in front of it, in the zone's color. A detail (layer 1), so it stays out of the floor reflection. */
    function zoneTag(g) {
      const t = tagOf && tagOf(g);
      if (!t) return null;
      const P = PROFILES[A.cabinet3dOf(g).profile], W = Math.max(.8, P.width), front = Math.max(...P.points.map(p => p[0]));
      const c = canvas(512, 72), x = c.getContext('2d'), col = tok[t.color] || tok.cyan, hi = tok[t.color + '-hi'] || col;
      x.fillStyle = tok.deep; x.strokeStyle = col; x.lineWidth = 6;
      x.beginPath(); x.roundRect ? x.roundRect(4, 4, 504, 64, 30) : x.rect(4, 4, 504, 64); x.fill(); x.stroke();
      x.fillStyle = hi; x.textAlign = 'center'; x.textBaseline = 'middle';
      fitText(x, t.text.toUpperCase(), '"GN Display", sans-serif', 38, 470); x.fillText(t.text.toUpperCase(), 256, 38);
      const tex = new THREE.CanvasTexture(c), m = new THREE.MeshBasicMaterial({map: tex, color: new THREE.Color(1, 1, 1), transparent: true});
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, W * 72 / 512), m);
      mesh.position.set(0, W * 36 / 512 + .01, front - .4 + .14); mesh.layers.set(1);
      return {mesh, tex, mats: [[m, m.color.clone(), 'color']]};
    }
    function clearSlots() {
      slots.forEach(S => { if (S.full) disposeTree(S.full.group); if (S.flat) { disposeTree(S.flat.mesh); S.flat.tex.dispose(); } if (S.tag) { disposeTree(S.tag.mesh); S.tag.tex.dispose(); } ringGroup.remove(S.holder); });
      slots = [];
      // this zone's marquee and screen textures go too (the round glow textures are tiny and shared: they stay)
      Object.keys(cache).forEach(id => { if (id[0] !== 'g') { if (cache[id].dead === false) cache[id].dead = true; (cache[id].texture || cache[id]).dispose(); delete cache[id]; } });
    }
    function makeSlots() {
      slots = ring.map(g => { const holder = new THREE.Group(); ringGroup.add(holder); return {g, holder, full: null, flat: null, tag: null, fade: fadeOf(g)}; });
    }
    const frontSlot = () => slots[frontIdx()];

    // HTML START over the front cabinet's control panel
    const start = document.createElement('a');
    start.className = 'start3d';
    start.textContent = 'Start';
    aisle.appendChild(cvs); aisle.appendChild(start); if (prizeBtn) aisle.appendChild(prizeBtn);
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
    let pos = opts.cur, from = pos, to = pos, t0 = 0, turning = false, turnMs = TURN_MS;
    const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const frontIdx = () => ((Math.round(pos) % M) + M) % M;

    function layout(now) {
      const sway = (!reduced.matches && !level) ? Math.sin(now / 1000 * .9) * SWAY : 0;
      slots.forEach((it, r) => {
        const d = wrap(r - pos), ad = Math.abs(d);
        const dim = (narrow ? Math.max(0, 1 - ad * 1.4) : ad < 1 ? 1 - .55 * ad : ad < 2 ? .45 - .25 * (ad - 1) : Math.max(0, .2 - .2 * (ad - 2) * 2)) * it.fade;
        it.ad = ad;
        it.holder.visible = dim > .01;
        if (!it.holder.visible) return;
        if (!it.full && !it.flat) { setFull(it, false); stats.flat = slots.filter(S => S.flat).length; }   // a fast spin brings it into view
        const phi = d * ARC_STEP;
        it.holder.position.set(Math.sin(phi) * ARC_R, 0, -ARC_R + Math.cos(phi) * ARC_R - SINK * Math.min(ad, 2.5));
        it.phi = phi;
        it.holder.rotation.y = phi + sway * Math.max(0, 1 - ad);
        if (it.dim !== dim) {
          it.dim = dim;
          (it.full ? it.full.mats : it.flat.mats).concat(it.tag ? it.tag.mats : []).forEach(([m, c, kind, op]) => {
            if (kind === 'add') m.opacity = (op || 1) * dim;
            else m.color.copy(c).multiplyScalar(dim);
          });
        }
      });
    }

    function placeStart() {
      const it = frontSlot();
      if (!it || !it.full) return;
      // where START sits on the cabinet, ignoring the idle sway, so the button holds still under a finger
      const v = it.full.start.clone().applyAxisAngle(Y_AXIS, it.phi || 0).add(it.holder.position).project(camera);
      const l = Math.round((v.x + 1) / 2 * Wpx) + 'px', t = Math.round((1 - v.y) / 2 * Hpx) + 'px';
      if (start.style.left !== l) start.style.left = l;
      if (start.style.top !== t) start.style.top = t;
    }

    /** the Prize Counter's button over its picture (hidden when it's off screen or too small to tap) */
    const PV = new THREE.Vector3();
    function placePrize() {
      if (!prize) return;
      const w = 1.2, h = 2.4 * 360 / 512 / 2, pts = [[-w, -h], [w, -h], [-w, h], [w, h]].map(([dx, dy]) => {
        PV.set(dx * Math.cos(prize.rotation.y), dy, -dx * Math.sin(prize.rotation.y)).add(prize.position).project(camera);
        return [(PV.x + 1) / 2 * Wpx, (1 - PV.y) / 2 * Hpx];
      });
      const l = Math.min(...pts.map(p => p[0])), r = Math.max(...pts.map(p => p[0])), t = Math.min(...pts.map(p => p[1])), b = Math.max(...pts.map(p => p[1]));
      const show = l >= 0 && r <= Wpx && t >= 0 && b <= Hpx && r - l >= 44 && b - t >= 44;
      prizeBtn.hidden = !show;
      if (show) Object.assign(prizeBtn.style, {left: Math.round(l) + 'px', top: Math.round(t) + 'px', width: Math.round(r - l) + 'px', height: Math.round(b - t) + 'px'});
    }

    /* ---------- rendering: only while something moves ---------- */
    let raf = 0, lastFrame = 0, lastRender = 0, lastScreen = 0, lastMarquee = 0, animT0 = performance.now();
    let sample = [], sampleStart = 0;
    function render() {
      renderer.clear();
      // pass 1: the reflection (everything upside down under the floor)
      floor.visible = false; hazeGroup.visible = false;
      const far = slots.filter(it => it.holder.visible && it.ad > 1.3);   // the far cabinets are too dim to reflect
      far.forEach(it => { it.holder.visible = false; });
      ringGroup.scale.y = -1; camera.layers.disable(1); renderer.render(scene, camera);
      const calls = renderer.info.render.calls;
      far.forEach(it => { it.holder.visible = true; });
      // pass 2: the room
      ringGroup.scale.y = 1; camera.layers.enable(1); floor.visible = true; hazeGroup.visible = !level;
      renderer.render(scene, camera);
      stats.drawCalls = calls + renderer.info.render.calls;
    }
    function frame(now) {
      raf = 0; lastTick = performance.now();
      if (document.hidden || A.floorPaused) return;            // hidden tab, or Select Player covers the floor
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
        const p = Math.min(1, (now - t0) / turnMs);
        pos = from + (to - from) * easeIO(p);
        if (p >= 1) { turning = false; pos = to; sync(to, to); }    // the turn is over: far cabinets go flat
      }
      const idle = !turning;
      if (!idle || now - lastRender >= IDLE_MS) {
        const t = Math.max(0, now - animT0) / 1000;       // a frame can be stamped a moment before setup ended
        const fr = frontSlot() && frontSlot().full;
        if (fr && !reduced.matches && now - lastScreen > 60) { fr.screen.draw(t); lastScreen = now; }
        if (fr && !reduced.matches && now - lastMarquee > 1000 / (A.Marquee.FPS / (level ? 2 : 1)) - 2) { fr.marquee.draw(t); lastMarquee = now; }
        layout(now); placeStart(); placePrize(); render(); lastRender = now; stats.frames++;
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

    const stats = {avgMs: null, samples: [], level: 0, frames: 0, noDowngrade: A.params.has('keep3d'), built: 0, disposed: 0, full: 0, flat: 0};
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
      cvs.remove(); start.remove(); if (fpsBox) fpsBox.remove(); if (prizeBtn) prizeBtn.remove();
      if (prize) prize.userData.tex.dispose();
      aisle.classList.remove('is-3d');
      A.Floor3D.stats = null; A.Floor3D.look = null;
    }
    // for testing and tuning: frame times (ms, averaged per few seconds), downgrade level, draw calls per frame (both passes)
    A.Floor3D.stats = () => Object.assign({}, stats, {pixelRatio: renderer.getPixelRatio(), haze: !!scene.fog, prize: !!(prizeBtn && !prizeBtn.hidden)});
    /* THE SEASONAL LOOK (season-look.js): the haze and the two side lights take its colors (the backdrop itself shows
       through the see-through canvas); none = the arcade's own pink / cyan / purple. Called again when it changes. */
    A.Floor3D.look = function () {
      if (dead) return null;
      const P = A.SeasonLook && A.SeasonLook.palette && A.SeasonLook.palette();
      const hz = (P && P.haze) || HAZE, li = (P && P.lights) || LIGHTS;
      hazeGroup.children.forEach((m, i) => m.material.color.set(cssVar(hz[i] || HAZE[i])));
      pinkL.color.set(cssVar(li[0])); cyanL.color.set(cssVar(li[1]));
      kick();
      return {haze: hz, lights: li};
    };
    A.Floor3D.look();

    makeSlots(); sync(pos, pos);
    resize();
    return {
      kind: '3d',
      startLink: start,
      /** a new set of cabinets (entering a zone); [] = none (the lobby): everything is disposed */
      setRing(newRing, newWrap, cur = 0, fade, tag) {
        clearSlots();
        ring = newRing; wrap = newWrap || wrap; M = ring.length; if (fade) fadeOf = fade; tagOf = tag || null;
        pos = from = to = cur; turning = false;
        makeSlots(); if (M) sync(pos, pos);
        stats.full = slots.filter(S => S.full).length; stats.flat = slots.filter(S => S.flat).length;
        kick();
      },
      /** the instrument changed: dim the games that don't suit it (games.js fit) */
      refade(fade) { fadeOf = fade; slots.forEach(S => { S.fade = fade(S.g); S.dim = undefined; }); kick(); },
      place(cur, instant) {
        const g = ring[cur];
        if (!g) return;
        start.href = A.startLink(g, '');
        start.className = 'start3d ' + A.trimClasses(g);
        start.setAttribute('aria-label', 'Start ' + g.name);
        const target = pos + wrap(cur - pos);
        const fr = frontSlot() && frontSlot().full;
        if (fr) { fr.screen.draw(null); fr.marquee.draw(null); }    // the old front cabinet's screen and marquee go still
        sync(pos, target);
        if (instant) { pos = from = to = target; turning = false; sync(pos, pos); }
        else { from = pos; to = target; t0 = performance.now(); turning = true; turnMs = Math.abs(target - pos) > SPIN_FROM ? SPIN_MS : TURN_MS; }
        kick();
        if (instant && reduced.matches) { layout(performance.now()); placeStart(); placePrize(); render(); }
      },
      pick(e) {
        if (e.target !== cvs) return null;
        const r = cvs.getBoundingClientRect();
        ray.setFromCamera({x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1}, camera);
        // only the solid bodies count (not the glow planes, which spread over the neighbors)
        const bodies = [];
        slots.forEach((it, r) => { if (it.holder.visible && (it.full || it.flat)) (it.full ? it.full.group.children : [it.flat.mesh]).forEach(o => { if (o.userData.pick) { o.userData.ring = r; bodies.push(o); } }); });
        const hit = ray.intersectObjects(bodies, false)[0];
        return hit ? Math.round(wrap(hit.object.userData.ring - pos)) : null;
      },
      destroy,
    };
  }
})(window.Arcade);
