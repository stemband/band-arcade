/* Band Arcade: THE MARQUEES, the lit sign at the top of every cabinet on the arcade floor. Drawn in code on a
   canvas: a themed, animated SCENE behind the game's title. The same drawing is the 3D cabinet's marquee texture
   (arcade3d.js), the 2D cabinet's marquee (?flat, shared/cabinets.js) and the sign above CHOOSE YOUR INSTRUMENT.

   EACH GAME'S MARQUEE is its `marquee` entry in shared/games.js (leave it out for the default):
     scene   the picture behind the title (SCENES below): 'storm' | 'manor' | 'vu' | 'dojo' | 'vault' | 'scroll'
             | 'versus' | 'hockey' | 'curtain' | 'synthwave' | 'pixel' | 'radio' | 'duel' | 'ink' | 'highway' | 'keys' | 'sparkle' (the default)
     colors  theme tokens (shared/theme.css) the scene uses, in the order its notes below give; any left out
             come from the scene's own defaults
     speed   1 = normal; 0.5 = half as fast, 2 = twice as fast
     still   the moment (seconds into the loop) shown as the still frame (side cabinets, reduced motion)
     every   'storm' only: seconds between lightning strikes (never under 1.2)
     titleLayouts  optional: the ways the title may be broken, e.g. [['VANISHING INK'], ['VANISHING', 'INK']]
             (left out: every split of its words into 1 or 2 lines; never inside a word or at a hyphen)
   EVERY MARQUEE SHOWS ONLY THE GAME'S MAIN TITLE (its `name`), AS LARGE AS IT FITS, with no kicker, subtitle,
   tagline or any other small text: every layout (1 line, or 2 stacked lines) is measured with its real glyph
   bounds, outline, glow and slant, and the one with the biggest letters wins, with an even safe margin
   (TITLE_MARGIN × the sign's height) inside the border on every side. It is measured only once the lettering font
   has loaded (until then the sign shows its scene alone; after FONT_WAIT ms a font that never comes falls back),
   and re-fitted whenever the size changes or a font arrives. The font is the cabinet's lettering
   (`cabinet.marquee` in games.js), always with a dark outline and a dark haze behind it so it stays readable.
   (2-player and other info belongs on the lobby's cards, never on the marquee.)

   RULES (keep them when you add a scene):
     - Only the FRONT cabinet's marquee (and the one on Select Player) animates, at FPS frames a second; every
       other marquee is a still frame. Nothing animates while the tab is hidden or with prefers-reduced-motion.
     - PHOTOSENSITIVITY: nothing may flash more than 3 times a second. A bright effect (lightning, a flickering
       bulb, sparks) lights up only PART of the marquee, never all of it at once, and fades in and out smoothly.
     - Colors only from theme tokens (tok()), never a hex color here.

   MAT'S OWN ART (optional): put a picture in shared/marquees/ named after the game's id:
     <id>.png or <id>.webp          replaces the drawn scene; the title is still drawn on top
     <id>-full.png or <id>-full.webp  replaces the WHOLE marquee (your picture must include the title)
   See shared/marquees/README.md (sizes). A missing file is looked for once per browser tab. On a page opened from
   a file (double-click) the 3D arcade can't use pictures (the browser forbids it), so it shows the drawn scene.

   Arcade.Marquee.draw(ctx, W, H, t, game, {art})   one frame (t in seconds, or null = the still frame)
   Arcade.Marquee.html(game, tag)                     the 2D marquee element (a canvas + the name for screen readers)
   Arcade.Marquee.hydrate(root)                       draw every marquee element inside root (still frames)
   Arcade.Marquee.animate(el, channel)                animate that marquee element ('floor' | 'select'); null stops it
   Arcade.Marquee.onArt(game, fn)                     fn() when the game's picture has loaded (arcade3d.js redraws)
   Arcade.Marquee.SCENES, FPS, config(game), flashLimit(game) (tests) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const FPS = 20;
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));

  /* ---------- colors: theme tokens ---------- */
  const tokCache = {};
  const tok = n => {
    if (!tokCache[n]) tokCache[n] = getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || getComputedStyle(document.documentElement).getPropertyValue('--text-hi').trim();
    return tokCache[n];
  };
  let probe = null;
  const rgbCache = {};
  function rgb(n) {                                  // a token as [r, g, b]
    if (rgbCache[n]) return rgbCache[n];
    probe = probe || document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#000'; probe.fillStyle = tok(n);
    const s = probe.fillStyle;
    return (rgbCache[n] = s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number));
  }
  const rgba = (n, a) => { const [r, g, b] = rgb(n); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`; };

  /* ---------- small helpers ---------- */
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const wrap = (v, m) => ((v % m) + m) % m;
  const smooth = p => p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);
  const layers = new Map();                          // offscreen layers, reused per size
  function layer(key, W, H) {
    let c = layers.get(key);
    if (!c) { c = document.createElement('canvas'); layers.set(key, c); }
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
    return [c, x];
  }
  function vGrad(x, H, stops) { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; }
  function glow(x, cx, cy, r, color, a) {            // a soft round light (fades to nothing)
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const GHOST = (() => { const m = A.ghostSVG ? A.ghostSVG('').match(/ d="([^"]+)"/) : null; return m && window.Path2D ? new Path2D(m[1]) : null; })();
  function ghostShape(x, cx, cy, w, color, a) {      // the Ghost Notes mascot's outline (80 × 80 in ui.js)
    if (!GHOST) return;
    x.save(); x.translate(cx - w / 2, cy - w / 2); x.scale(w / 80, w / 80);
    x.globalAlpha = a; x.fillStyle = tok(color); x.fill(GHOST);
    x.fillStyle = tok('deep'); x.beginPath(); x.arc(29, 40, 6, 0, 7); x.arc(51, 40, 6, 0, 7); x.fill();
    x.restore();
  }
  function flare(x, cx, cy, r, color, a) {           // a four-point sparkle
    x.save(); x.globalAlpha = a; x.fillStyle = tok(color);
    x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * .22, cy - r * .22); x.lineTo(cx + r, cy); x.lineTo(cx + r * .22, cy + r * .22);
    x.lineTo(cx, cy + r); x.lineTo(cx - r * .22, cy + r * .22); x.lineTo(cx - r, cy); x.lineTo(cx - r * .22, cy - r * .22); x.fill();
    x.restore();
  }
  /** one storm cloud (five puffs, lit tops, dark bottoms), drawn once per size and reused (a big saving each frame) */
  function cloudSprite(H, light) {
    const key = 'cloud' + Math.round(H) + light;
    if (layers.has(key)) return layers.get(key);
    const r = H * .32, w = Math.ceil(r * 4), h = Math.ceil(r * 2.6), c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), cx = w / 2, cy = h * .55, lit = [];
    x.fillStyle = tok('floor-3'); x.beginPath();
    [[0, 0, 1], [-.9, .25, .7], [.9, .2, .75], [-.4, -.35, .7], [.45, -.3, .65]].forEach(([dx, dy, s]) => { x.moveTo(cx + dx * r + r * s, cy + dy * r); x.arc(cx + dx * r, cy + dy * r, r * s, 0, 7); lit.push([cx + dx * r, cy + dy * r - r * s * .45, r * s]); });
    x.fill();
    x.globalCompositeOperation = 'source-atop';
    lit.forEach(([a, b, rr]) => glow(x, a, b, rr * .9, light, .22));
    x.fillStyle = vGrad(x, h, [[0, 'rgba(0,0,0,0)'], [1, rgba('deep', .55)]]); x.fillRect(0, 0, w, h);
    if (layers.size > 40) layers.clear();             // many sizes (window resizes): start over
    layers.set(key, c);
    return c;
  }
  /** a jagged lightning bolt or spark from (x0, y0) to (x1, y1), `seed` picks its zigzags */
  function jag(x0, y0, x1, y1, n, amp, seed) {
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const p = i / n; pts.push([x0 + (x1 - x0) * p + (hash(seed + i) - .5) * 2 * amp, y0 + (y1 - y0) * p + (hash(seed + i * 3.1) - .5) * amp * .4]); }
    pts.push([x1, y1]);
    return pts;
  }
  function strokePts(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); }

  /* ---------- THE SCENES: draw(x, W, H, t, c, m, g) ----------
     t = seconds (already × speed), c = the colors (tokens), m = the game's marquee entry. The title goes on top. */
  const SCENES = {
    /* NOTE STORM. colors: [bolt, light on the cloud tops, glow inside the clouds]. Rolling storm clouds, a forked bolt every `every`
       seconds at a random spot (one flash, rising in 60 ms and fading over half a second, lighting only the clouds
       near it), faint diagonal rain. */
    storm: {
      colors: ['yellow-hi', 'purple-ink', 'purple-hi'], still: m => Math.max(1.2, +m.every || 3.2) + hash(1) * .6 + .12,   // a bolt just struck
      draw(x, W, H, t, c, m) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok('floor-2')]]); x.fillRect(0, 0, W, H);
        const every = Math.max(1.2, +m.every || 3.2), n = Math.floor(t / every), start = n * every + hash(n) * .6, age = t - start;
        const I = age < 0 ? 0 : age < .06 ? age / .06 : Math.max(0, 1 - (age - .06) / .5);   // one smooth flash
        const bx = W * (.1 + .8 * hash(n * 7 + 1)), by = H * (.62 + .3 * hash(n * 3 + 2));
        // clouds (on their own layer while lightning is lit, so the flash lights only the clouds)
        const [lc, lx] = I > 0 ? layer('storm', W, H) : [null, x];
        const puffs = Math.max(14, Math.round(W / H * 6)), sprite = cloudSprite(H, c[1]);
        for (let i = 0; i < puffs; i++) {
          const span = W * 1.4, row = i % 3, cx = wrap(i / puffs * span + hash(i) * W * .1 - t * W * .012 * (.7 + row * .25), span) - W * .2;
          const cy = H * (row === 0 ? .05 : row === 1 ? .38 : .72) + (hash(i + 3) - .5) * H * .15 + Math.sin(t * .35 + i) * H * .025, sc = .75 + .5 * hash(i + 5);
          const w = sprite.width * sc, h = sprite.height * sc;
          lx.drawImage(sprite, cx - w / 2, cy - h / 2, w, h);
        }
        if (I > 0) { lx.globalCompositeOperation = 'source-atop'; glow(lx, bx, H * .15, H * 1.05, c[2], .85 * I); lx.globalCompositeOperation = 'source-over'; x.drawImage(lc, 0, 0); }
        // rain
        x.strokeStyle = rgba('text-lo', .16); x.lineWidth = Math.max(1, H * .008);
        x.beginPath();
        for (let i = 0; i < 46; i++) {
          const y = wrap(hash(i * 5.3) * H * 1.3 + t * H * 1.5, H * 1.3) - H * .15, rx = wrap(hash(i * 2.7) * W * 1.2 - y * .35, W * 1.2) - W * .1;
          x.moveTo(rx, y); x.lineTo(rx - H * .04, y + H * .11);
        }
        x.stroke();
        // the bolt: a trunk and one or two forks
        if (I > 0) {
          const seed = n * 13, trunk = jag(bx + (hash(seed) - .5) * H * .4, 0, bx, by, 9, H * .07, seed);
          const forks = [trunk, jag(...trunk[3], trunk[3][0] + (hash(seed + 5) - .5) * H * .9, H * (.5 + .3 * hash(seed + 6)), 5, H * .05, seed + 40)];
          if (hash(seed + 8) > .4) forks.push(jag(...trunk[5], trunk[5][0] + (hash(seed + 9) - .5) * H, H * (.7 + .25 * hash(seed + 7)), 4, H * .04, seed + 80));
          x.lineJoin = 'round'; x.lineCap = 'round';
          forks.forEach((f, i) => {
            x.strokeStyle = rgba(c[2], .35 * I); x.lineWidth = H * (i ? .03 : .05); strokePts(x, f);
            x.strokeStyle = rgba(c[0], I); x.lineWidth = Math.max(1.5, H * (i ? .012 : .022)); strokePts(x, f);
          });
        }
      },
    },
    /* GHOST NOTES. colors: [sky, windows, ghosts]. A moonlit manor on a hill, little ghosts drifting behind the
       letters, fog rolling along the bottom. */
    manor: {
      colors: ['purple-ink', 'yellow', 'screen'], still: 4,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok(c[0])]]); x.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) { x.fillStyle = rgba('text-hi', .3 + .4 * hash(i + 50)); x.fillRect(hash(i) * W, hash(i + 20) * H * .6, Math.max(1, H * .012), Math.max(1, H * .012)); }
        const mx = W * .84, my = H * .3, mr = H * .19;
        glow(x, mx, my, mr * 3, 'screen', .22);
        x.fillStyle = tok('screen'); x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
        x.fillStyle = rgba('text-lo', .35); x.beginPath(); x.arc(mx - mr * .3, my - mr * .1, mr * .2, 0, 7); x.arc(mx + mr * .25, my + mr * .35, mr * .13, 0, 7); x.fill();
        // ghosts drift slowly behind the letters
        for (let i = 0; i < 4; i++) {
          const gx = wrap(hash(i + 3) * W * 1.3 + t * W * .025 * (i % 2 ? -1 : 1) * (.6 + hash(i)), W * 1.3) - W * .15;
          ghostShape(x, gx, H * (.25 + .4 * hash(i + 7)) + Math.sin(t * 1.3 + i * 2) * H * .05, H * (.22 + .1 * hash(i + 11)), c[2], .62);
        }
        // the hill and the manor on it
        x.fillStyle = tok('floor');
        x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * .8); x.quadraticCurveTo(W * .16, H * .56, W * .34, H * .8); x.quadraticCurveTo(W * .6, H * .98, W, H * .88); x.lineTo(W, H); x.fill();
        const hx = W * .16, base = H * .66, u = H * .06;
        x.beginPath();
        x.rect(hx - u * 3, base - u * 3.2, u * 6, u * 3.4);                                  // the house
        x.moveTo(hx - u * 3.4, base - u * 3.2); x.lineTo(hx, base - u * 5.6); x.lineTo(hx + u * 3.4, base - u * 3.2);
        x.rect(hx - u * 4.6, base - u * 5, u * 1.6, u * 5.2);                                // the towers
        x.moveTo(hx - u * 4.9, base - u * 5); x.lineTo(hx - u * 3.8, base - u * 7.4); x.lineTo(hx - u * 2.7, base - u * 5);
        x.rect(hx + u * 3, base - u * 4.2, u * 1.4, u * 4.4);
        x.moveTo(hx + u * 2.8, base - u * 4.2); x.lineTo(hx + u * 3.7, base - u * 6.2); x.lineTo(hx + u * 4.6, base - u * 4.2);
        x.fill();
        [[-2, -2.4], [-.6, -2.4], [1.4, -2.4], [-4, -3.6], [3.4, -3]].forEach(([a, b], i) => {
          x.fillStyle = rgba(c[1], .55 + .25 * Math.sin(t * .8 + i * 1.7)); x.fillRect(hx + a * u, base + b * u, u * .7, u * .9);
        });
        // fog rolling along the bottom
        for (let i = 0; i < 9; i++) {
          const fx = wrap(hash(i + 30) * W * 1.4 + t * W * .03 * (.5 + hash(i + 31)), W * 1.4) - W * .2, fy = H * (.82 + .14 * hash(i + 32)), rw = W * (.18 + .12 * hash(i + 33));
          x.save(); x.translate(fx, fy); x.scale(1, .22);
          glow(x, 0, 0, rw, 'text-lo', .22); x.restore();
        }
      },
    },
    /* NOTE CHECKER. colors: [low bars, middle, top]. A bank of VU meters and equalizer bars bouncing gently. */
    vu: {
      colors: ['green', 'amber', 'amber-hi'], still: 1.3,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok('floor-2')]]); x.fillRect(0, 0, W, H);
        const meterW = H * 1.25, bx0 = meterW + H * .1, bx1 = W - meterW - H * .1;
        const n = Math.max(6, Math.round((bx1 - bx0) / (H * .1))), bw = (bx1 - bx0) / n, seg = 10, sh = H * .8 / seg;
        for (let i = 0; i < n; i++) {
          const lv = Math.max(.08, Math.min(1, .42 + .22 * Math.sin(t * 2.1 + i * .7) + .16 * Math.sin(t * 3.1 + i * 1.9) + .12 * Math.sin(t * .8 + i * .37)));
          for (let s = 0; s < seg; s++) {
            const on = s / seg < lv, col = s < 6 ? c[0] : s < 9 ? c[1] : c[2];
            x.fillStyle = rgba(col, on ? .85 : .1);
            x.fillRect(bx0 + i * bw + bw * .12, H * .9 - (s + 1) * sh + sh * .15, bw * .76, sh * .7);
          }
        }
        // two analog VU meters
        [[meterW / 2 + H * .06, 0], [W - meterW / 2 - H * .06, 1.3]].forEach(([mx, ph]) => {
          const my = H * .8, r = meterW * .45;
          x.fillStyle = rgba(c[1], .16); x.strokeStyle = rgba(c[1], .7); x.lineWidth = Math.max(1, H * .02);
          x.beginPath(); x.moveTo(mx - r * 1.08, my); x.arc(mx, my, r * 1.08, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
          x.strokeStyle = rgba(c[0], .8); x.beginPath(); x.arc(mx, my, r * .82, Math.PI * 1.15, Math.PI * 1.7); x.stroke();
          x.strokeStyle = rgba('red', .85); x.beginPath(); x.arc(mx, my, r * .82, Math.PI * 1.72, Math.PI * 1.85); x.stroke();
          for (let k = 0; k <= 8; k++) { const a = Math.PI * (1.15 + k * .0875); x.beginPath(); x.moveTo(mx + Math.cos(a) * r * .7, my + Math.sin(a) * r * .7); x.lineTo(mx + Math.cos(a) * r * .9, my + Math.sin(a) * r * .9); x.stroke(); }
          const lv = .5 + .28 * Math.sin(t * 1.7 + ph) + .12 * Math.sin(t * 3.3 + ph * 2), a = Math.PI * (1.18 + lv * .64);
          x.strokeStyle = tok(c[2]); x.lineWidth = Math.max(1, H * .025);
          x.beginPath(); x.moveTo(mx, my); x.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r); x.stroke();
          glow(x, mx, my - r * .5, r, c[1], .15);
        });
      },
    },
    /* NOTE NINJA. colors: [moon, petals, lanterns]. A dojo roofline under a big red moon, cherry-blossom petals
       drifting, paper lanterns swaying. */
    dojo: {
      colors: ['red', 'pink-hi', 'amber'], still: 2,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [.7, tok('purple-ink')], [1, tok('red-ink')]]); x.fillRect(0, 0, W, H);
        const mx = W * .5, my = H * .62, mr = H * .5;
        glow(x, mx, my, mr * 1.8, c[0], .35);
        const mg = x.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr);
        mg.addColorStop(0, tok('red-hi')); mg.addColorStop(1, tok(c[0]));
        x.fillStyle = mg; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
        // the dojo roofline: two tiers with upturned eaves
        x.fillStyle = tok('deep');
        const roof = (y, x0, x1, h) => {
          x.beginPath(); x.moveTo(x0 - h * 1.2, y - h * .5); x.quadraticCurveTo(x0, y, x0 + h, y - h * .15); x.lineTo((x0 + x1) / 2, y - h * 1.6);
          x.lineTo(x1 - h, y - h * .15); x.quadraticCurveTo(x1, y, x1 + h * 1.2, y - h * .5); x.lineTo(x1 + h * .2, y + h * .35); x.lineTo(x0 - h * .2, y + h * .35); x.fill();
        };
        roof(H * .74, W * .12, W * .88, H * .14);
        x.fillRect(W * .16, H * .78, W * .68, H * .22);
        roof(H * .5, W * .36, W * .64, H * .1);
        x.fillRect(W * .39, H * .52, W * .22, H * .2);
        // lanterns swaying on their strings
        [[.07, 0], [.93, 1.4], [.24, 2.5], [.76, .7]].forEach(([p, ph], i) => {
          const lx0 = W * p, len = H * (i < 2 ? .22 : .1), ang = Math.sin(t * 1.1 + ph) * .13, lw = H * .13, lh = H * .19;
          x.save(); x.translate(lx0, 0); x.rotate(ang);
          x.strokeStyle = rgba('text-lo', .6); x.lineWidth = Math.max(1, H * .008); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, len); x.stroke();
          glow(x, 0, len + lh / 2, lh * 1.3, c[2], .35);
          x.fillStyle = tok(c[2]); x.beginPath(); x.ellipse(0, len + lh / 2, lw / 2, lh / 2, 0, 0, 7); x.fill();
          x.strokeStyle = rgba('red-ink', .7); x.beginPath(); x.ellipse(0, len + lh / 2, lw / 4, lh / 2, 0, 0, 7); x.stroke();
          x.fillStyle = tok('deep'); x.fillRect(-lw * .3, len - lh * .02, lw * .6, lh * .1); x.fillRect(-lw * .3, len + lh * .94, lw * .6, lh * .1);
          x.restore();
        });
        // cherry-blossom petals
        for (let i = 0; i < 22; i++) {
          const px = wrap(hash(i) * W * 1.2 - t * W * .04 * (.6 + hash(i + 2)), W * 1.2) - W * .1;
          const py = wrap(hash(i + 5) * H * 1.2 + t * H * .12 * (.7 + hash(i + 7)), H * 1.2) - H * .1 + Math.sin(t * 1.5 + i) * H * .03;
          x.save(); x.translate(px, py); x.rotate(t * (1 + hash(i + 9)) + i);
          x.fillStyle = rgba(c[1], .85); x.beginPath(); x.ellipse(0, 0, H * .028, H * .014, 0, 0, 7); x.fill(); x.restore();
        }
      },
    },
    /* CHIME HEIST. colors: [laser 1, laser 2, dial glow]. A vault door with a slowly turning combination dial,
       green and red laser beams sweeping behind the title. */
    vault: {
      colors: ['green', 'red', 'cyan'], still: 1.6,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('cab-panel')], [1, tok('deep')]]); x.fillRect(0, 0, W, H);
        x.strokeStyle = rgba('text-lo', .05); x.lineWidth = 1;
        for (let y = 0; y < H; y += Math.max(2, H * .03)) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
        const vx = W * .5, vy = H * .5, R = H * .7;
        x.fillStyle = tok('floor-3'); x.beginPath(); x.arc(vx, vy, R, 0, 7); x.fill();
        x.strokeStyle = tok('cab-metal'); x.lineWidth = H * .06; x.beginPath(); x.arc(vx, vy, R * .92, 0, 7); x.stroke();
        x.fillStyle = tok('cab-metal');
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.beginPath(); x.arc(vx + Math.cos(a) * R * .78, vy + Math.sin(a) * R * .78, H * .025, 0, 7); x.fill(); }
        // the dial turns one way, then back (a combination)
        const ang = t * .35 + Math.sin(t * .6) * 1.2, dr = H * .3;
        glow(x, vx, vy, dr * 1.8, c[2], .18);
        x.fillStyle = tok('cab-panel'); x.beginPath(); x.arc(vx, vy, dr, 0, 7); x.fill();
        x.strokeStyle = tok('cab-metal'); x.lineWidth = Math.max(1, H * .02); x.stroke();
        x.strokeStyle = rgba('text-hi', .6); x.lineWidth = Math.max(1, H * .012);
        for (let i = 0; i < 40; i++) { const a = ang + i / 40 * Math.PI * 2, l = i % 5 ? .85 : .7; x.beginPath(); x.moveTo(vx + Math.cos(a) * dr * l, vy + Math.sin(a) * dr * l); x.lineTo(vx + Math.cos(a) * dr * .95, vy + Math.sin(a) * dr * .95); x.stroke(); }
        x.fillStyle = tok('red'); x.beginPath(); x.moveTo(vx, vy - dr - H * .06); x.lineTo(vx - H * .03, vy - dr - H * .1); x.lineTo(vx + H * .03, vy - dr - H * .1); x.fill();
        // lasers sweeping from the corners
        [[0, 0, .35, c[0], 0], [W, 0, Math.PI - .35, c[1], 1.3], [0, H, -.3, c[1], 2.1], [W, H, Math.PI + .3, c[0], 3.4]].forEach(([ox, oy, base, col, ph]) => {
          const a = base + Math.sin(t * .55 + ph) * .28, ex = ox + Math.cos(a) * W * 1.3, ey = oy + Math.sin(a) * W * 1.3;
          x.lineCap = 'round';
          x.strokeStyle = rgba(col, .22); x.lineWidth = H * .05; x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
          x.strokeStyle = rgba(col, .9); x.lineWidth = Math.max(1, H * .01); x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
          glow(x, ox, oy, H * .12, col, .7);
        });
      },
    },
    /* ANCIENT NINJA SCROLLS. colors: [sky, temple light]. An unrolled parchment scroll behind the title, a mountain
       temple, lanterns in the Band Ninja belt colors glowing softly. */
    scroll: {
      colors: ['temple-sky', 'amber'], still: 1,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok(c[0])]]); x.fillRect(0, 0, W, H);
        const ridge = (col, base, amp, seed) => {
          x.fillStyle = tok(col); x.beginPath(); x.moveTo(0, H);
          for (let i = 0; i <= 12; i++) x.lineTo(W * i / 12, H * (base - amp * hash(seed + i)));
          x.lineTo(W, H); x.fill();
        };
        ridge('floor-2', .72, .35, 4);
        // the temple on the far peak (left) and one on the right
        [[.07, 1], [.93, .8]].forEach(([p, s]) => {
          const tx = W * p, ty = H * .45, u = H * .07 * s;
          x.fillStyle = tok('floor');
          x.beginPath(); x.moveTo(tx - u * 3.4, ty); x.lineTo(tx, ty - u * 2); x.lineTo(tx + u * 3.4, ty); x.fill();
          x.fillRect(tx - u * 2, ty, u * 4, u * 2);
          x.beginPath(); x.moveTo(tx - u * 2.6, ty + u * 2); x.lineTo(tx, ty + u * .6); x.lineTo(tx + u * 2.6, ty + u * 2); x.fill();
          x.fillRect(tx - u * 1.6, ty + u * 2, u * 3.2, u * 2.4);
          x.fillStyle = rgba(c[1], .7 + .2 * Math.sin(t * .9 + p * 5)); x.fillRect(tx - u * .5, ty + u * 2.8, u, u * 1.2);
        });
        ridge('floor', .9, .2, 20);
        // the scroll, unrolled
        const sx0 = W * .16, sx1 = W * .84, sy0 = H * .2, sy1 = H * .9, rod = H * .1;
        x.fillStyle = rgba('scroll-paper', .9); x.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
        x.strokeStyle = rgba('scroll-rod', .18); x.lineWidth = 1;
        for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(sx0, sy0 + (sy1 - sy0) * i / 5); x.lineTo(sx1, sy0 + (sy1 - sy0) * i / 5 + H * .01); x.stroke(); }
        x.fillStyle = tok('scroll-rod');
        [sx0, sx1].forEach(rx => { x.fillRect(rx - rod / 2, sy0 - H * .05, rod, sy1 - sy0 + H * .1); x.fillRect(rx - rod * .3, sy0 - H * .09, rod * .6, sy1 - sy0 + H * .18); });
        // the belt lanterns on a string across the top
        const belts = ['belt-orange', 'belt-green', 'belt-blue', 'belt-purple', 'belt-red', 'belt-brown', 'belt-black', 'belt-diamond'];
        x.strokeStyle = rgba('text-lo', .5); x.lineWidth = Math.max(1, H * .01);
        x.beginPath(); x.moveTo(0, H * .04); x.quadraticCurveTo(W / 2, H * .2, W, H * .04); x.stroke();
        belts.forEach((b, i) => {
          const p = (i + .5) / belts.length, lx0 = W * p, ly = H * (.04 + .32 * p * (1 - p)) + H * .03;
          const a = .55 + .25 * Math.sin(t * 1.1 + i * .9);
          glow(x, lx0, ly + H * .05, H * .16, b === 'belt-black' ? 'text-lo' : b, a * .6);
          x.fillStyle = tok(b); x.beginPath(); x.ellipse(lx0, ly + H * .05, H * .035, H * .05, 0, 0, 7); x.fill();
        });
      },
    },
    /* BUTTON MASHER. colors: [left, right, sparks]. A fighting-game VS burst, two silhouettes facing off, energy
       sparks crackling between their fists. */
    versus: {
      colors: ['blue', 'red', 'yellow-hi'], still: .9,
      draw(x, W, H, t, c) {
        x.fillStyle = tok(c[0] + '-ink'); x.fillRect(0, 0, W, H);
        x.fillStyle = tok(c[1] + '-ink'); x.beginPath(); x.moveTo(W * .55, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W * .45, H); x.fill();
        // the burst: rays turning slowly
        x.save(); x.translate(W / 2, H / 2); x.rotate(t * .12);
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * Math.PI * 2;
          x.fillStyle = rgba(i % 2 ? 'yellow' : 'text-hi', i % 2 ? .16 : .06);
          x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * W, Math.sin(a) * W); x.lineTo(Math.cos(a + .17) * W, Math.sin(a + .17) * W); x.fill();
        }
        x.restore();
        glow(x, W / 2, H / 2, H * .9, 'yellow', .25);
        // two fighters facing each other (original silhouettes)
        [[W * .13, 1, c[0]], [W * .87, -1, c[1]]].forEach(([fx, dir, col], i) => {
          const bob = Math.sin(t * 2.4 + i * Math.PI) * H * .02, u = H * .1;
          x.save(); x.translate(fx, H * .98 + bob); x.scale(dir, 1);
          x.fillStyle = tok('deep'); x.strokeStyle = tok(col + '-hi'); x.lineWidth = Math.max(1, H * .014); x.lineJoin = 'round';
          const P = [[-1.1, -5.2], [1.1, -5.3], [3.1, -5], [3.1, -4.4], [1.1, -4.5], [.9, -3.1], [2.1, 0], [1.1, 0], [0, -2.3], [-1.1, 0], [-2.2, 0], [-.9, -3.1], [-1.3, -4.6]];
          x.beginPath(); P.forEach(([a, b], j) => (j ? x.lineTo(a * u, b * u) : x.moveTo(a * u, b * u))); x.closePath(); x.fill(); x.stroke();   // body, legs, the punching arm
          x.beginPath(); x.moveTo(-.9 * u, -4.9 * u); x.lineTo(.6 * u, -3.9 * u); x.lineTo(1.3 * u, -4.2 * u); x.stroke();                  // the guard arm
          x.beginPath(); x.arc(u * 3.35, -u * 4.7, u * .5, 0, 7); x.fill(); x.stroke();     // the fist
          x.beginPath(); x.arc(u * .1, -u * 6.1, u * .8, 0, 7); x.fill(); x.stroke();       // head
          x.restore();
        });
        // sparks between them: each lives 0.35 s and fades in and out (small, never the whole sign)
        x.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const life = .35, ph = t / life + i * .37, gen = Math.floor(ph), p = ph - gen, a = Math.sin(p * Math.PI);
          const sx = W * (.36 + .28 * hash(gen * 7 + i)), sy = H * (.2 + .6 * hash(gen * 3 + i)), len = H * (.12 + .15 * hash(gen + i * 2)), ang = hash(gen * 5 + i) * 6.3;
          const pts = jag(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len, 4, H * .03, gen * 11 + i);
          x.strokeStyle = rgba(c[2], .35 * a); x.lineWidth = H * .03; strokePts(x, pts);
          x.strokeStyle = rgba('white-hi', .9 * a); x.lineWidth = Math.max(1, H * .008); strokePts(x, pts);
        }
      },
    },
    /* NEON FACE-OFF. colors: [left rail, right rail, puck]. An air hockey table in perspective; a glowing puck
       streaking across with a light trail. */
    hockey: {
      colors: ['cyan', 'pink', 'white-hi'], still: 1.1,
      draw(x, W, H, t, c) {
        x.fillStyle = tok('deep'); x.fillRect(0, 0, W, H);
        const fy = H * .16, ny = H * 1.02, fx0 = W * .22, fx1 = W * .78, nx0 = -W * .02, nx1 = W * 1.02;
        const at = (u, v) => { const y = fy + (ny - fy) * v, x0 = fx0 + (nx0 - fx0) * v, x1 = fx1 + (nx1 - fx1) * v; return [x0 + (x1 - x0) * u, y, (x1 - x0) / (fx1 - fx0)]; };
        x.fillStyle = vGrad(x, H, [[0, tok('floor-2')], [1, tok('floor-3')]]);
        x.beginPath(); x.moveTo(fx0, fy); x.lineTo(fx1, fy); x.lineTo(nx1, ny); x.lineTo(nx0, ny); x.fill();
        x.fillStyle = rgba('text-lo', .12);                               // air holes
        for (let v = .1; v < 1; v += .12) for (let u = .05; u < 1; u += .05) { const [a, b, s] = at(u, v); x.fillRect(a, b, s * H * .01, s * H * .01); }
        x.lineWidth = Math.max(1, H * .025);
        x.strokeStyle = tok(c[0]); x.beginPath(); x.moveTo(W / 2, fy); x.lineTo(fx0, fy); x.lineTo(nx0, ny); x.stroke();
        x.strokeStyle = tok(c[1]); x.beginPath(); x.moveTo(W / 2, fy); x.lineTo(fx1, fy); x.lineTo(nx1, ny); x.stroke();
        x.lineWidth = Math.max(1, H * .012); x.strokeStyle = rgba('text-hi', .35);
        x.beginPath(); x.moveTo(W / 2, fy); x.lineTo(W / 2, ny); x.stroke();
        const [cx, cy, cs] = at(.5, .5); x.beginPath(); x.ellipse(cx, cy, H * .22 * cs, H * .09 * cs, 0, 0, 7); x.stroke();
        // goals
        [[0, c[0]], [1, c[1]]].forEach(([u, col]) => { const [a, b, s] = at(u, .5); glow(x, a, b, H * .3 * s, col, .5); });
        // the puck bounces around the table and leaves a trail
        const tri = p => { const q = wrap(p, 2); return q < 1 ? q : 2 - q; };
        const pos = k => { const tt = t - k * .035; return at(.04 + .92 * tri(tt * .42), .1 + .8 * tri(tt * .31 + .4)); };
        for (let k = 14; k >= 1; k--) { const [a, b, s] = pos(k); x.fillStyle = rgba(k % 2 ? c[0] : c[1], .35 * (1 - k / 15)); x.beginPath(); x.ellipse(a, b, H * .07 * s, H * .03 * s, 0, 0, 7); x.fill(); }
        const [px, py, ps] = pos(0);
        glow(x, px, py, H * .25 * ps, c[2], .45);
        x.fillStyle = tok(c[2]); x.beginPath(); x.ellipse(px, py, H * .07 * ps, H * .03 * ps, 0, 0, 7); x.fill();
      },
    },
    /* SHOWTIME MALFUNCTION. colors: [curtain, bulbs, eyes]. A stage curtain with a row of marquee bulbs (a few
       broken, two flickering gently, under 1 Hz), and a pair of red animatronic eyes blinking in the dark. */
    curtain: {
      colors: ['red', 'amber-hi', 'anim-eye-bad'], still: 2.5,
      draw(x, W, H, t, c) {
        x.fillStyle = tok('deep'); x.fillRect(0, 0, W, H);
        const folds = Math.max(8, Math.round(W / (H * .28))), fw = W / folds;
        for (let i = 0; i < folds; i++) {
          if (i === folds - 2) continue;                                     // a gap in the curtain (the eyes)
          const sway = Math.sin(t * .6 + i * .8) * fw * .06, x0 = i * fw + sway;
          const g = x.createLinearGradient(x0, 0, x0 + fw, 0);
          g.addColorStop(0, tok(c[0] + '-ink')); g.addColorStop(.5, tok(c[0])); g.addColorStop(1, tok(c[0] + '-ink'));
          x.fillStyle = g; x.fillRect(x0, 0, fw + 1, H);
        }
        x.fillStyle = vGrad(x, H, [[0, 'rgba(0,0,0,0)'], [.75, 'rgba(0,0,0,0)'], [1, rgba('deep', .6)]]); x.fillRect(0, 0, W, H);
        // the eyes in the gap: open, then a quick blink every few seconds
        const ex = (folds - 1.5) * fw, ey = H * .55, blink = wrap(t, 3.7) < .18 ? .12 : 1;
        [-1, 1].forEach(s => {
          glow(x, ex + s * H * .07, ey, H * .12, c[2], .5 * blink);
          x.fillStyle = tok(c[2]); x.beginPath(); x.ellipse(ex + s * H * .07, ey, H * .035, H * .03 * blink, 0, 0, 7); x.fill();
        });
        // the bulbs: steady, a few burnt out, two flickering slowly (a smooth dip, well under 3 times a second)
        const step = H * .14, n = Math.floor(W / step), dead = [3, n - 6, Math.floor(n / 2) + 2], flick = [6, n - 3];
        [H * .07, H * .93].forEach((by, row) => {
          for (let i = 0; i < n; i++) {
            const bx = (i + .5) * W / n, k = i + row * 7;
            let a = dead.includes(k % n) ? 0 : 1;
            if (flick.includes(k % n)) a = .35 + .65 * smooth(.5 + .5 * Math.sin(t * Math.PI * 2 * .8 + i));
            x.fillStyle = a ? rgba(c[1], .35 + .65 * a) : tok('cab-metal');
            if (a) glow(x, bx, by, H * .07, c[1], .5 * a);
            x.beginPath(); x.arc(bx, by, H * .028, 0, 7); x.fill();
          }
        });
      },
    },
    /* SUSTAIN SPEEDWAY. colors: [grid, sun top, speed lines]. A synthwave sunset, a grid road rushing toward the
       horizon, speed lines. */
    synthwave: {
      colors: ['sw-grid', 'sw-sun-1', 'text-hi'], still: .4,
      draw(x, W, H, t, c) {
        const hz = H * .56;
        x.fillStyle = vGrad(x, hz, [[0, tok('sw-sky-top')], [.6, tok('sw-sky-mid')], [1, tok('sw-sky-low')]]); x.fillRect(0, 0, W, hz);
        // the striped sun
        const sx = W * .5, r = H * .42;
        x.save(); x.beginPath(); x.rect(0, 0, W, hz); x.clip();
        glow(x, sx, hz, r * 2, 'sw-sun-2', .35);
        const sg = x.createLinearGradient(0, hz - r, 0, hz); sg.addColorStop(0, tok(c[1])); sg.addColorStop(1, tok('sw-sun-2'));
        x.fillStyle = sg; x.beginPath(); x.arc(sx, hz, r, Math.PI, 0); x.fill();
        x.fillStyle = tok('sw-sky-low');
        for (let i = 0; i < 5; i++) { const y = hz - r * (.08 + i * .13); x.fillRect(sx - r, y, r * 2, r * (.03 + i * .012)); }
        x.restore();
        // the ground and its grid rushing toward you
        x.fillStyle = tok('sw-ground'); x.fillRect(0, hz, W, H - hz);
        x.strokeStyle = tok(c[0]); x.lineWidth = Math.max(1, H * .012);
        for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(sx + i * W * .02, hz); x.lineTo(sx + i * W * .16, H); x.stroke(); }
        for (let k = 0; k < 9; k++) {
          const z = wrap(k / 9 + t * .35, 1), y = hz + (H - hz) * z * z;
          x.globalAlpha = .3 + .7 * z; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
        }
        x.globalAlpha = 1;
        // the road and its lane marks
        x.fillStyle = tok('sw-road'); x.beginPath(); x.moveTo(sx - W * .01, hz); x.lineTo(sx + W * .01, hz); x.lineTo(sx + W * .13, H); x.lineTo(sx - W * .13, H); x.fill();
        x.fillStyle = tok('sw-lane');
        for (let k = 0; k < 6; k++) {
          const z0 = wrap(k / 6 + t * .5, 1), z1 = Math.min(1, z0 + .06), y0 = hz + (H - hz) * z0 * z0, y1 = hz + (H - hz) * z1 * z1;
          x.fillRect(sx - (1 + z0 * 4) * H * .006, y0, (1 + z0 * 4) * H * .012, y1 - y0);
        }
        // speed lines
        x.strokeStyle = rgba(c[2], .35); x.lineWidth = Math.max(1, H * .01);
        for (let i = 0; i < 12; i++) {
          const y = H * (.12 + .8 * hash(i + 60)), sp = wrap(hash(i + 61) + t * (1.4 + hash(i + 62)), 1), side = i % 2 ? 1 : -1;
          const a = sx + side * W * (.1 + sp * .5), l = W * .08 * (.4 + sp);
          x.globalAlpha = Math.sin(sp * Math.PI); x.beginPath(); x.moveTo(a, y); x.lineTo(a + side * l, y); x.stroke();
        }
        x.globalAlpha = 1;
      },
    },
    /* DOJO DUEL. colors: [night sky, the center belt ribbon, lantern light]. A neon night dojo: a wooden floor with a
       glowing center line, two crossed bamboo practice swords behind the title, paper lanterns swaying slowly at both
       ends, and a string of Band Ninja belt-color ribbons fluttering along the top. Lanterns glow steadily (a slow,
       gentle breathing, never a flash). */
    duel: {
      colors: ['temple-sky', 'belt-red', 'amber'], still: 1.4,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [.55, tok(c[0])], [.72, tok('dd-wood')], [1, tok('dd-wood-line')]]); x.fillRect(0, 0, W, H);
        // floorboards (in perspective) and the neon center line
        x.strokeStyle = rgba('dd-wood-line', .9); x.lineWidth = Math.max(1, H * .01);
        for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * .05, H * .72); x.lineTo(W / 2 + i * W * .16, H); x.stroke(); }
        glow(x, W / 2, H * .86, H * .5, 'yellow', .25);
        x.strokeStyle = tok('yellow'); x.lineWidth = Math.max(2, H * .025);
        x.beginPath(); x.moveTo(W / 2, H * .72); x.lineTo(W / 2, H); x.stroke();
        // two crossed bamboo practice swords (with node rings), behind the title
        const bam = (ang) => {
          x.save(); x.translate(W / 2, H * .5); x.rotate(ang);
          const L = H * 1.1, r = H * .035;
          x.fillStyle = tok('belt-green'); x.fillRect(-L / 2, -r, L, r * 2);
          x.fillStyle = rgba('deep', .45); for (let k = -3; k <= 3; k++) x.fillRect(k * L / 7 - r * .2, -r, r * .4, r * 2);
          x.fillStyle = tok('dd-wood-2'); x.fillRect(L / 2 - L * .18, -r * 1.2, L * .18, r * 2.4);       // the grip
          x.restore();
        };
        bam(-.5); bam(Math.PI + .5);
        // the belt ribbons along the top (every Band Ninja belt color), fluttering gently
        const belts = ['belt-white', 'belt-yellow', 'belt-orange', 'belt-green', 'belt-blue', 'belt-purple', c[1], 'belt-brown', 'belt-black', 'belt-diamond'];
        const n = belts.length, span = W * .64, x0 = W * .18;
        x.strokeStyle = rgba('text-lo', .5); x.lineWidth = Math.max(1, H * .008);
        x.beginPath(); x.moveTo(x0 - W * .02, H * .04); x.quadraticCurveTo(W / 2, H * .14, x0 + span + W * .02, H * .04); x.stroke();
        belts.forEach((b, i) => {
          const u = (i + .5) / n, bx = x0 + span * u, by = H * .04 + Math.sin(u * Math.PI) * H * .05, sw = Math.sin(t * 1.4 + i * .8) * H * .015;
          x.fillStyle = tok(b); x.beginPath(); x.moveTo(bx - H * .03, by); x.lineTo(bx + H * .03, by);
          x.lineTo(bx + H * .02 + sw, by + H * .15); x.lineTo(bx + sw, by + H * .12); x.lineTo(bx - H * .02 + sw, by + H * .15); x.fill();
          x.strokeStyle = rgba('deep', .6); x.lineWidth = 1; x.stroke();
        });
        // paper lanterns at both ends (glowing, swaying slowly)
        [[.07, 0], [.93, 1.3], [.19, 2.2], [.81, .6]].forEach(([p, ph], i) => {
          const len = H * (i < 2 ? .16 : .06), ang = Math.sin(t * .9 + ph) * .1, lw = H * (i < 2 ? .2 : .15), lh = lw * 1.3;
          const breathe = .32 + .08 * Math.sin(t * .8 + ph);
          x.save(); x.translate(W * p, 0); x.rotate(ang);
          x.strokeStyle = rgba('text-lo', .6); x.lineWidth = Math.max(1, H * .008); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, len); x.stroke();
          glow(x, 0, len + lh / 2, lh * 1.4, c[2], breathe);
          const lg = x.createRadialGradient(0, len + lh * .45, lw * .05, 0, len + lh / 2, lw * .6);
          lg.addColorStop(0, tok('dd-paper')); lg.addColorStop(.7, tok('dd-lantern')); lg.addColorStop(1, tok(c[1]));
          x.fillStyle = lg; x.beginPath(); x.ellipse(0, len + lh / 2, lw / 2, lh / 2, 0, 0, 7); x.fill();
          x.strokeStyle = rgba('red-ink', .6); x.lineWidth = Math.max(1, H * .006);
          [.25, .5, .75].forEach(q => { x.beginPath(); x.ellipse(0, len + lh * q, lw / 2 * Math.sin(Math.PI * q), lh * .04, 0, 0, 7); x.stroke(); });
          x.fillStyle = tok('dd-wood-line'); x.fillRect(-lw * .28, len - lh * .03, lw * .56, lh * .09); x.fillRect(-lw * .28, len + lh * .94, lw * .56, lh * .09);
          x.restore();
        });
      },
    },
    /* KEYS TO THE CITY. colors: [lit windows, the Chopsticks, the Fork]. A neon skyline made of piano keys: black keys
       stand up as skyscrapers over a row of white keys, their windows fading on and off slowly, the Chopsticks and the
       Fork glowing over the groups (nothing flashes) */
    keys: {
      colors: ['kt-win-on', 'kt-chop', 'kt-fork'], still: 2,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok('kt-night-2')]]); x.fillRect(0, 0, W, H);
        const n = 14, u = W / n, ground = H * .78;
        x.fillStyle = tok('kt-street'); x.fillRect(0, ground, W, H - ground);
        x.strokeStyle = tok('kt-street-2'); x.lineWidth = Math.max(1, H * .01);
        for (let k = 1; k < n; k++) { x.beginPath(); x.moveTo(k * u, ground); x.lineTo(k * u, H); x.stroke(); }
        [1, 2, 4, 5, 6, 8, 9, 11, 12, 13].forEach((b, i) => {
          const h = H * (.35 + .3 * hash(b + 2)), bw = u * .6, cx = b * u, top = ground + H * .12 - h;
          x.fillStyle = tok('kt-bldg'); x.fillRect(cx - bw / 2, top, bw, h);
          for (let r = 0; r < 5; r++) {
            const on = .5 + .5 * Math.sin(t * .7 + hash(b * 5 + r) * 6.28);
            x.fillStyle = on > .5 ? rgba(c[0], .3 + .6 * on) : tok('kt-win-off');
            x.fillRect(cx - bw * .25, top + h * (.1 + r * .15), bw * .5, h * .06);
          }
        });
        [[1.5, 1], [5, 2], [8.5, 1], [12, 2]].forEach(([gx, k]) => {          // the signs over the groups
          const X = gx * u, Y = H * .16, s = H * .08, col = c[k];
          glow(x, X, Y, s * 3, col, .35);
          x.strokeStyle = tok(col); x.lineWidth = Math.max(1.2, H * .018); x.lineCap = 'round'; x.beginPath();
          if (k === 1) { x.moveTo(X - s * .6, Y - s); x.lineTo(X - s * .1, Y + s); x.moveTo(X + s * .6, Y - s); x.lineTo(X + s * .1, Y + s); }
          else { [-1, 0, 1].forEach(d => { x.moveTo(X + d * s * .55, Y - s); x.lineTo(X + d * s * .55, Y - s * .2); });
            x.moveTo(X - s * .55, Y - s * .2); x.quadraticCurveTo(X, Y + s * .5, X + s * .55, Y - s * .2); x.moveTo(X, Y + s * .15); x.lineTo(X, Y + s); }
          x.stroke();
        });
      },
    },
    /* MUSIC HIGHWAY. colors: [lanes + beat lines, road edges, stars]. A neon road running into a starfield: five lanes
       from the horizon, beat lines rolling toward you, small neon pads gliding down the lanes (slow; nothing flashes). */
    highway: {
      colors: ['mh-lane', 'pink', 'cyan'], still: .6,
      draw(x, W, H, t, c) {
        const hz = H * .3, vx = W / 2, far = 4, half = W * .5, sy = H * 1.05;
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [.3, tok('mh-sky')], [.3, tok('deep')], [1, tok('mh-road')]]); x.fillRect(0, 0, W, H);
        const n = Math.round(W / H * 24);
        for (let i = 0; i < n; i++) {                                // the starfield: slow, smooth twinkles
          const a = .25 + .55 * (.5 + .5 * Math.sin(t * (.5 + hash(i + 3)) + hash(i + 4) * 6.28));
          x.fillStyle = rgba(c[2], a); x.fillRect(W * hash(i + 1), hz * .95 * hash(i + 2), Math.max(1, H * .012), Math.max(1, H * .012));
        }
        const X = (u, d) => vx + u * half / d, Y = d => hz + (sy - hz) / d;
        x.fillStyle = tok('mh-road'); x.beginPath(); x.moveTo(X(-1, far), Y(far)); x.lineTo(X(1, far), Y(far)); x.lineTo(X(1, 1), Y(1)); x.lineTo(X(-1, 1), Y(1)); x.fill();
        for (let l = 0; l <= 5; l++) {
          const u = -1 + l * .4, edge = l === 0 || l === 5;
          x.strokeStyle = edge ? tok(c[1]) : rgba(c[0], .55); x.lineWidth = Math.max(1, H * (edge ? .022 : .01));
          if (edge) glow(x, X(u, 1.6), Y(1.6), H * .12, c[1], .25);
          x.beginPath(); x.moveTo(X(u, far), Y(far)); x.lineTo(X(u, 1), Y(1)); x.stroke();
        }
        for (let k = 0; k < 6; k++) {                                // beat lines rolling toward you
          const f = wrap(k / 6 + t * .3, 1), d = far - (far - 1) * f;
          x.strokeStyle = rgba(c[0], .25 + .5 * f); x.lineWidth = Math.max(1, H * .01);
          x.beginPath(); x.moveTo(X(-1, d), Y(d)); x.lineTo(X(1, d), Y(d)); x.stroke();
        }
        const cols = ['mh-c', 'mh-e', 'mh-g', 'mh-b', 'mh-d'];
        for (let i = 0; i < 5; i++) {                                // neon pads gliding down the lanes (as in the game)
          const f = wrap(hash(i + 20) + t * .18, 1), d = far - (far - 1.3) * f, u = -.8 + (i % 5) * .4;
          const w = half * .3 / d, h = w * .42, cx = X(u, d), by = Y(d), r = h / 2;
          x.fillStyle = rgba(cols[i], .3 + .55 * f); x.strokeStyle = tok(cols[i]); x.lineWidth = Math.max(1, H * .012);
          x.beginPath(); x.moveTo(cx - w / 2 + r, by - h); x.arcTo(cx + w / 2, by - h, cx + w / 2, by, r); x.arcTo(cx + w / 2, by, cx - w / 2, by, r);
          x.arcTo(cx - w / 2, by, cx - w / 2, by - h, r); x.arcTo(cx - w / 2, by - h, cx + w / 2, by - h, r); x.closePath(); x.fill(); x.stroke();
        }
      },
    },
    /* LOST SIGNAL. colors: [waveform, radar + blips, stars]. Deep space: a starfield, radar rings with a slowly turning
       sweep, blips that fade in as the sweep passes and fade out over a second (never a flash), and a glowing
       waveform along the bottom. */
    radio: {
      colors: ['ls-wave', 'ls-ping', 'text-hi'], still: 1.1,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok('ls-scope')]]); x.fillRect(0, 0, W, H);
        // stars: each twinkles slowly and smoothly
        const n = Math.round(W / H * 22);
        for (let i = 0; i < n; i++) {
          const a = .25 + .55 * (.5 + .5 * Math.sin(t * (0.6 + hash(i + 3)) + hash(i + 4) * 6.28));
          x.fillStyle = rgba(c[2], a); x.fillRect(W * hash(i + 1), H * hash(i + 2), Math.max(1, H * .012), Math.max(1, H * .012));
        }
        // radar rings (two: left and right of the title), the sweep and its blips
        [[W * .12, H * .55], [W * .88, H * .5]].forEach(([ox, oy], side) => {
          const R = H * .46;
          x.strokeStyle = rgba(c[1], .35); x.lineWidth = Math.max(1, H * .012);
          for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(ox, oy, R * k / 3, 0, Math.PI * 2); x.stroke(); }
          const ang = t * 1.6 * (side ? -1 : 1) + side;
          x.strokeStyle = rgba(c[1], .8); x.lineWidth = Math.max(1.5, H * .02);
          x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + Math.cos(ang) * R, oy + Math.sin(ang) * R); x.stroke();
          for (let b = 0; b < 3; b++) {
            const ba = hash(b + side * 9 + 20) * Math.PI * 2, br = R * (.3 + .6 * hash(b + side * 9 + 21));
            const since = wrap((ang - ba) * (side ? -1 : 1), Math.PI * 2) / 1.6;       // seconds since the sweep passed it
            const a = Math.max(0, 1 - since / 1.2);
            if (a > 0) { glow(x, ox + Math.cos(ba) * br, oy + Math.sin(ba) * br, H * .1, c[1], a * .7); x.fillStyle = rgba(c[1], a); x.beginPath(); x.arc(ox + Math.cos(ba) * br, oy + Math.sin(ba) * br, H * .03, 0, 7); x.fill(); }
          }
        });
        // the waveform
        const y0 = H * .86, A0 = H * .07;
        x.strokeStyle = rgba(c[0], .85); x.lineWidth = Math.max(1.5, H * .02);
        x.beginPath();
        for (let px = 0; px <= W; px += 3) {
          const u = px / W, env = .45 + .55 * Math.sin(Math.PI * wrap(u + t * .15, 1));
          const y = y0 + Math.sin(u * 30 + t * 4) * A0 * env;
          px ? x.lineTo(px, y) : x.moveTo(px, y);
        }
        x.stroke();
      },
    },
    /* VANISHING INK. colors: [parchment, the ink splash's neon rim, night]. A night dojo: an unrolled parchment scroll
       between two wooden rods, a staff of brush-ink notes on it (the last note slowly fades away and comes back: a
       4-second breath, never a flash), ink splashes with neon rims and drips, and one ink drop that slowly falls. */
    ink: {
      colors: ['vi-paper', 'pink', 'dd-night'], still: .6,
      draw(x, W, H, t, c) {
        x.fillStyle = vGrad(x, H, [[0, tok('deep')], [1, tok(c[2])]]); x.fillRect(0, 0, W, H);
        glow(x, W / 2, H * .5, W * .45, c[1], .16);
        // the scroll: parchment between two rods
        const px0 = W * .08, px1 = W * .92, py0 = H * .14, py1 = H * .86;
        x.fillStyle = vGrad(x, H, [[0, tok('vi-paper-2')], [.15, tok(c[0])], [.85, tok(c[0])], [1, tok('vi-paper-2')]]);
        x.fillRect(px0, py0, px1 - px0, py1 - py0);
        const rw = H * .07;
        [px0 - rw * .7, px1 - rw * .3].forEach(rx => {
          x.fillStyle = tok('vi-rod'); x.fillRect(rx, py0 - H * .07, rw, py1 - py0 + H * .14);
          x.fillStyle = tok('vi-rod-cap'); x.fillRect(rx - rw * .15, py0 - H * .09, rw * 1.3, H * .04); x.fillRect(rx - rw * .15, py1 + H * .05, rw * 1.3, H * .04);
        });
        // the staff and three brush-ink notes (the third one fades out and back in, slowly)
        const gap = H * .085, top = H * .5 - gap * 2, sx0 = px0 + W * .04, sx1 = px1 - W * .04;
        x.strokeStyle = rgba('vi-ink-2', .45); x.lineWidth = Math.max(1, H * .01);
        for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(sx0, top + i * gap); x.lineTo(sx1, top + i * gap); x.stroke(); }
        const fade = .5 + .5 * Math.cos(t * Math.PI * 2 / 4);
        [[.2, 3, 1], [.5, 2, 1], [.8, 1, fade]].forEach(([u, step, a]) => {
          const nx = sx0 + (sx1 - sx0) * u, ny = top + step * gap;
          x.fillStyle = rgba('vi-ink', .85 * a); x.strokeStyle = rgba('vi-ink', .85 * a); x.lineWidth = Math.max(1.5, gap * .16);
          x.beginPath(); x.ellipse(nx, ny, gap * .62, gap * .44, -.35, 0, 7); x.fill();
          x.beginPath(); x.moveTo(nx + gap * .56, ny - gap * .1); x.lineTo(nx + gap * .56, ny - gap * 3.2); x.stroke();
        });
        // ink splashes: dark blobs with a neon rim and a few drips, on two corners of the scroll
        const splash = (cx, cy, r, seed) => {
          x.beginPath();
          for (let k = 0; k <= 14; k++) {
            const a = k / 14 * Math.PI * 2, rr = r * (.7 + .45 * hash(seed + k % 14));
            k ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8);
          }
          x.closePath();
          x.save(); x.shadowColor = tok(c[1]); x.shadowBlur = H * .06; x.fillStyle = tok('vi-ink'); x.fill(); x.restore();
          x.strokeStyle = rgba(c[1], .8); x.lineWidth = Math.max(1, H * .012); x.stroke();
          for (let k = 0; k < 4; k++) { x.fillStyle = tok('vi-ink'); x.beginPath(); x.arc(cx + r * (1.3 + .5 * hash(seed + 20 + k)) * Math.cos(k * 1.7 + seed), cy + r * (1.1 + .4 * hash(seed + 30 + k)) * Math.sin(k * 1.7 + seed) * .8, r * (.08 + .1 * hash(seed + 40 + k)), 0, 7); x.fill(); }
        };
        splash(px0 + W * .05, py1 - H * .12, H * .13, 3);
        splash(px1 - W * .06, py0 + H * .1, H * .09, 11);
        // one ink drop falls slowly from the upper splash and fades
        const d = wrap(t / 3, 1), dy = py0 + H * .16 + d * H * .5;
        x.fillStyle = rgba('vi-ink', .9 * (1 - d)); x.beginPath(); x.ellipse(px1 - W * .06, dy, H * .018, H * .028, 0, 0, 7); x.fill();
      },
    },
    /* ARCADE QUEST. colors: [sky, microphone outline, static]. An 8-bit landscape at night with a giant
       microphone silhouette looming behind the title, crackling with pixel static (each speck fades in and out). */
    pixel: {
      colors: ['purple-ink', 'purple', 'cyan-hi'], still: 1.4,
      draw(x, W, H, t, c) {
        const p = Math.max(2, Math.round(H / 40)), snap = v => Math.round(v / p) * p;
        const bands = 6;
        for (let i = 0; i < bands; i++) { x.fillStyle = i % 2 ? tok(c[0]) : tok('deep'); x.globalAlpha = i / bands * .8 + .2; x.fillRect(0, snap(H * i / bands), W, snap(H / bands) + p); }
        x.globalAlpha = 1; x.fillStyle = vGrad(x, H, [[0, rgba('deep', .9)], [1, rgba(c[0], .2)]]); x.fillRect(0, 0, W, H);
        for (let i = 0; i < 36; i++) { x.fillStyle = rgba('text-hi', .25 + .5 * (.5 + .5 * Math.sin(t * 1.2 + i * 2.3))); x.fillRect(snap(hash(i) * W), snap(hash(i + 40) * H * .6), p, p); }
        // the microphone: a huge dark shape with a glowing outline and its one red light
        const mic = A.QUEST_MIC || [], rows = mic.length || 1, cols = (mic[0] || '').length || 1, ps = Math.max(p, Math.floor(H * 1.9 / rows / p) * p);
        const mx = snap(W / 2 - cols * ps / 2), my = snap(-ps * .15);
        const lit = (rx, ry) => mic[ry] && mic[ry][rx] === 'X';
        mic.forEach((row, ry) => [...row].forEach((ch, rx) => {
          if (ch !== 'X') return;
          const edge = !lit(rx - 1, ry) || !lit(rx + 1, ry) || !lit(rx, ry - 1) || !lit(rx, ry + 1);
          x.fillStyle = edge ? tok(c[1] + '-hi') : tok(c[1] + '-ink'); x.fillRect(mx + rx * ps, my + ry * ps, ps, ps);
        }));
        glow(x, mx + cols * ps / 2, my + rows * ps * .3, cols * ps, c[1], .18);
        const red = .6 + .3 * Math.sin(t * 1.3);
        glow(x, mx + cols * ps / 2, my + ps * 2.5, ps * 2.5, 'red', .5 * red);
        x.fillStyle = rgba('red-hi', red); x.fillRect(snap(mx + cols * ps / 2 - ps / 2), snap(my + ps * 2), ps, ps);
        // blocky hills in front
        [['floor-2', .8, .16, 3], ['floor', .9, .1, 11]].forEach(([col, base, amp, seed]) => {
          x.fillStyle = tok(col);
          const cw = p * 4;
          for (let xx = 0; xx < W; xx += cw) { const h = snap(H * (base - amp * (.5 + .5 * Math.sin(xx / W * 9 + seed) * hash(Math.floor(xx / cw) + seed)))); x.fillRect(xx, h, cw, H - h); }
        });
        // pixel static around the microphone: specks that fade in and out (each ~0.6 s)
        for (let i = 0; i < 28; i++) {
          const life = .6, ph = t / life + hash(i) , gen = Math.floor(ph), a = Math.sin((ph - gen) * Math.PI);
          const sx = mx + (hash(gen * 9 + i) * 1.4 - .2) * cols * ps, sy = my + hash(gen * 5 + i * 3) * Math.min(rows * ps, H - my) * .9;
          x.fillStyle = rgba(i % 3 ? c[2] : 'text-hi', .8 * a); x.fillRect(snap(sx), snap(sy), p * (1 + (i % 2)), p);
        }
        x.fillStyle = rgba('deep', .25); for (let y = 0; y < H; y += p * 2) x.fillRect(0, y, W, Math.max(1, p / 2));   // scanlines
      },
    },
    /* THE DEFAULT (any game without a `marquee`): its neon color in a slowly moving gradient, and sparkles.
       colors: [main, second] (default: the game's color and its cabinet's trim2) */
    sparkle: {
      colors: [], still: 1,
      draw(x, W, H, t, c) {
        const a = t * .25, gx = Math.cos(a) * W * .5, gy = Math.sin(a) * H * .5;
        const g = x.createLinearGradient(W / 2 - gx, H / 2 - gy, W / 2 + gx, H / 2 + gy);
        g.addColorStop(0, tok(c[0] + '-ink')); g.addColorStop(.5, tok('deep')); g.addColorStop(1, tok(c[1] + '-ink'));
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        glow(x, W * (.5 + .3 * Math.sin(t * .4)), H * .5, W * .4, c[0], .25);
        for (let i = 0; i < 16; i++) flare(x, hash(i) * W, hash(i + 30) * H, H * (.04 + .05 * hash(i + 60)), i % 2 ? c[0] + '-hi' : c[1] + '-hi', .15 + .65 * (.5 + .5 * Math.sin(t * (.8 + hash(i + 7)) + i * 2)));
      },
    },
  };
  const MAX_FLASH_HZ = 3;     // the photosensitivity rule; storm's `every` can't go under 1.2 s, flickers stay under 1 Hz

  /* ---------- the game's settings ---------- */
  const TRIMS = ['pink', 'cyan', 'yellow', 'purple', 'amber', 'green', 'red', 'white', 'blue'];
  function config(g) {
    const m = g.marquee || {}, scene = SCENES[m.scene] ? m.scene : 'sparkle', S = SCENES[scene], cab = A.cabinetOf ? A.cabinetOf(g) : {trim: 'cyan', trim2: 'pink'};
    const main = TRIMS.includes(g.color) ? g.color : cab.trim;
    const defaults = scene === 'sparkle' ? [main, cab.trim2] : S.colors;
    const colors = defaults.map((d, i) => (m.colors && m.colors[i]) || d);
    return {scene, S, colors, speed: +m.speed > 0 ? +m.speed : 1, still: m.still != null ? +m.still : typeof S.still === 'function' ? S.still(m) : S.still, every: m.every, cab,
      layouts: Array.isArray(m.titleLayouts) ? m.titleLayouts : null};
  }

  /* ---------- the title ---------- */
  const FONTS = {haunt: '"GN Haunt", "GN Display", sans-serif', pixel: '"GN Pixel", monospace', shade: '"GN Shade", "GN Display", sans-serif',
    faceoff: '"GN Neon", "GN Display", sans-serif', quest: '"GN Quest", sans-serif', signal: '"GN Neon", "GN Display", sans-serif',
    duel: '"GN Neon", "GN Display", sans-serif', highway: '"GN Neon", "GN Display", sans-serif', keys: '"GN Neon", "GN Display", sans-serif', ink: '"GN Brush", "GN Display", sans-serif'};
  /* ---------- the title: as big as it fits ---------- */
  const TITLE_MARGIN = .04;                        // the safe margin on every side, × the sign's height, inside the border
  const STROKE = .2, GLOW = .35, GLOW_REACH = .55; // outline width, glow blur, and how far the visible glow reaches (measured: ~.19 × the font size)
  const LINE_GAP = .1;                             // space between two lines' letters (× font size)
  const WORD_GAP = .28;                            // a space is at least this wide (× font size): some sign fonts (GN Neon)
                                                   // have a hairline space, and NEON FACE-OFF would read as one word
  /** a character's advance: the font's own, but a space never narrower than WORD_GAP */
  const adv = (x, ch, size) => { const w = x.measureText(ch).width; return ch === ' ' ? Math.max(w, size * WORD_GAP) : w; };
  /** every way to break the words into 1–maxLines lines, in order (words stay whole: a hyphen never breaks) */
  function splits(words, maxLines = 2) {
    const out = [];
    const go = (i, lines) => {
      if (i === words.length) { out.push(lines.map(l => l.join(' '))); return; }
      if (lines.length) go(i + 1, lines.slice(0, -1).concat([lines[lines.length - 1].concat(words[i])]));
      if (lines.length < maxLines) go(i + 1, lines.concat([[words[i]]]));
    };
    go(0, []);
    return out;
  }
  /* the lettering fonts: a fallback font measures differently (the title could come out small, or overflow once the
     real font arrives), so the title is measured and drawn only once its font has loaded; every marquee (2D, 3D
     textures, thumbnails) is drawn again the moment it arrives. A font that never loads falls back after FONT_WAIT. */
  const FONT_WAIT = 3000, fontState = {};           // font family list -> 'loading' | 'ok' | 'fallback'
  function fontReady(font) {
    const f = font.f, spec = `${font.w} 40px ${f}`;
    if (fontState[f] === 'ok' || fontState[f] === 'fallback' || !document.fonts || !document.fonts.load) return true;
    if (document.fonts.check(spec, 'AZ')) { fontState[f] = 'ok'; return true; }
    if (!fontState[f]) {
      fontState[f] = 'loading';
      const done = st => { if (fontState[f] !== 'loading') return; fontState[f] = st; fitCache.clear(); redrawAll(); };
      document.fonts.load(spec, 'AZ').then(() => done('ok'), () => done('fallback'));
      setTimeout(() => done('fallback'), FONT_WAIT);
    }
    return false;
  }
  const fitCache = new Map();
  /** {size, lines: [{text, asc, desc, left, adv}], pad, blockH, slant, font} for the biggest layout that fits W × H */
  function fitMax(x, W, H, g, k, font, slant) {
    const name = g.name.toUpperCase(), ready = !document.fonts || document.fonts.check(`40px ${font.f}`);
    const key = [g.id, W, H, ready, font.f].join('|');
    if (fitCache.has(key)) return fitCache.get(key);
    const layouts = (k.layouts || splits(name.split(' '))).map(l => l.map(t => String(t).toUpperCase()));
    // the margin starts inside the border; + 2 px for the outline's 2 px minimum and anti-aliasing on small signs
    const REF = 100, m = H * TITLE_MARGIN + Math.max(2, H * .05) / 2 + 2;
    x.save(); x.font = `${font.w} ${REF}px ${font.f}`;
    let best = null;
    layouts.forEach(layout => {
      const lines = layout.map(text => {
        // drawn letter by letter: the ink runs from the first letter's left overhang to the last letter's right edge
        const mt = x.measureText(text), chars = [...text], total = chars.reduce((a, ch) => a + adv(x, ch, REF), 0);
        const first = x.measureText(chars[0]), last = x.measureText(chars[chars.length - 1]), lastX = total - last.width;
        return {text, asc: mt.actualBoundingBoxAscent / REF, desc: mt.actualBoundingBoxDescent / REF, left: first.actualBoundingBoxLeft / REF,
          right: (lastX + last.actualBoundingBoxRight) / REF, adv: total / REF};
      });
      const pad = STROKE / 2 + GLOW * GLOW_REACH, sl = Math.abs(slant);
      const wCoef = Math.max(...lines.map(l => l.left + l.right + sl * (l.asc + l.desc))) + 2 * pad;
      const hCoef = lines.reduce((a, l) => a + l.asc + l.desc, 0) + LINE_GAP * (lines.length - 1) + 2 * pad;
      const size = Math.min((W - 2 * m) / wCoef, (H - 2 * m) / hCoef);
      if (!best || size > best.size + .01) best = {size, lines, pad, hCoef};
    });
    x.restore();
    if (fitCache.size > 200) fitCache.clear();
    fitCache.set(key, best);
    return best;
  }
  const fontOf = style => ({f: FONTS[style] || '"GN Display", sans-serif', w: style === 'quest' ? '700' : ''});
  const slantOf = style => (style === 'versus' || style === 'speedway' ? -.2 : 0);
  /** the title alone, as big as it fits: the cabinet's lettering, outline, glow and slant */
  function title(x, W, H, g, k) {
    const style = k.cab.marquee, font = fontOf(style), slant = slantOf(style);
    if (!fontReady(font)) return;                      // measured only with the real font: drawn the moment it arrives
    const F = fitMax(x, W, H, g, k, font, slant), s = F.size, words = g.name.toUpperCase().split(' ');
    // each word keeps its color: showtime = first word trim, the rest trim2 with the dead F bulb; faceoff likewise
    const two = (style === 'showtime' || style === 'faceoff') && words.length > 1;
    const colorOf = wi => (two && wi > 0 ? k.cab.trim2 : k.cab.trim);
    const blockH = (F.hCoef - 2 * F.pad) * s;
    let y = H / 2 - blockH / 2, wi = 0, deadUsed = false;
    // a soft dark haze behind the letters (never over them), as on every marquee (tests measure the letters without it)
    if (!k.noHaze) {
    x.save(); x.translate(W / 2, H / 2); x.scale(1, Math.min(1, (blockH + s) / W));
    const hr = W * .55, hg = x.createRadialGradient(0, 0, 0, 0, 0, hr);
    hg.addColorStop(0, rgba('deep', .6)); hg.addColorStop(.7, rgba('deep', .4)); hg.addColorStop(1, rgba('deep', 0));
    x.fillStyle = hg; x.fillRect(-hr, -hr, hr * 2, hr * 2); x.restore();
    }
    x.font = `${font.w} ${s}px ${font.f}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
    F.lines.forEach(l => {
      const base = y + l.asc * s, sl = Math.abs(slant);
      // the box of this line with its slant: [left - sl·desc, right + sl·asc]; center that box
      const bl = -l.left * s - sl * l.desc * s, br = l.right * s + sl * l.asc * s, x0 = W / 2 - (bl + br) / 2;
      x.save(); x.translate(x0, base); if (slant) x.transform(1, 0, slant, 1, 0, 0);
      let cx = 0;
      l.text.split(' ').forEach((wd, j, arr) => {
        const text = j < arr.length - 1 ? wd + ' ' : wd, col = colorOf(wi++);
        x.lineWidth = Math.max(2, s * STROKE); x.strokeStyle = tok('deep'); x.shadowBlur = 0;
        let ox = cx; [...text].forEach(ch => { if (ch !== ' ') x.strokeText(ch, ox, 0); ox += adv(x, ch, s); });   // the outline, letter by letter (same spacing as the fill)
        [...text].forEach(ch => {
          const dead = style === 'showtime' && col === k.cab.trim2 && ch === 'F' && !deadUsed;
          if (dead) deadUsed = true;
          x.shadowColor = dead ? 'rgba(0,0,0,0)' : tok(col); x.shadowBlur = s * GLOW;
          x.fillStyle = dead ? tok('cab-metal') : tok(col + '-hi'); x.fillText(ch, cx, 0);
          x.shadowBlur = 0; x.fillText(ch, cx, 0);
          cx += adv(x, ch, s);
        });
      });
      x.restore();
      y += (l.asc + l.desc + LINE_GAP) * s;
    });
    x.shadowBlur = 0;
  }

  /* ---------- Mat's pictures (shared/marquees/) ---------- */
  const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') + 'marquees/' : 'shared/marquees/'; })();
  const MISS_KEY = 'bandarcade.mq-miss', misses = new Set();
  try { JSON.parse(sessionStorage.getItem(MISS_KEY) || '[]').forEach(u => misses.add(u)); } catch (e) {}
  const art = {};                                      // game id -> {state: 'loading'|'done', img, full, waiting: [fn]}
  function loadArt(g) {
    if (art[g.id]) return art[g.id];
    const a = art[g.id] = {state: 'loading', img: null, full: false, waiting: []};
    const ver = u => (A.v ? A.v(u) : u);            // ?v=<site version> (shared/version.js)
    const tries = [[g.id + '-full.webp', true], [g.id + '-full.png', true], [g.id + '.webp', false], [g.id + '.png', false]].filter(([f]) => !misses.has(ver(BASE + f)));
    const next = () => {
      const t = tries.shift();
      if (!t) { a.state = 'done'; return; }
      const img = new Image(), url = ver(BASE + t[0]);
      img.onload = () => { a.img = img; a.full = t[1]; a.state = 'done'; a.waiting.splice(0).forEach(fn => fn()); redrawGame(g.id); };
      img.onerror = () => { misses.add(url); try { sessionStorage.setItem(MISS_KEY, JSON.stringify([...misses])); } catch (e) {} next(); };
      img.src = url;
    };
    next();
    return a;
  }
  function cover(x, img, W, H) {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
    x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  /* ---------- one frame ---------- */
  function draw(x, W, H, t, g, opts = {}) {
    const k = config(g), a = opts.art === false ? null : loadArt(g);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.shadowBlur = 0;
    const tt = (t == null ? k.still : t) * k.speed;
    if (a && a.img && a.full) { cover(x, a.img, W, H); x.restore(); return; }
    if (a && a.img) cover(x, a.img, W, H);
    else if (!opts.titleOnly) k.S.draw(x, W, H, tt, k.colors, {every: k.every}, g);
    x.shadowBlur = 0; x.globalAlpha = 1;
    if (opts.titleOnly) k.noHaze = true;
    title(x, W, H, g, k);
    if (!opts.titleOnly) { x.shadowBlur = 0; x.strokeStyle = tok(k.cab.trim); x.lineWidth = Math.max(2, H * .05); x.strokeRect(0, 0, W, H); }
    x.restore();
  }

  /* ---------- the 2D marquee elements (the ?flat cabinets and Select Player) ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
  function html(g, tag = 'p') {
    const c = A.cabinetOf(g);
    return `<${tag} class="mq mq-${c.marquee} mq-live" data-mq="${esc(g.id)}"><canvas class="mq-cv" aria-hidden="true"></canvas>` +
      `<span class="sr">${esc(g.name)}</span></${tag}>`;
  }
  const mounted = new Set();                            // marquee elements on the page
  const channels = {};                                  // 'floor' | 'select' -> the element that animates
  const gameOf = id => (A.ALL_GAMES || A.GAMES || []).find(x => x.id === id);
  const ro = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => paint(e.target.closest('.mq-live')))) : null;
  function paint(el, t = null) {
    if (!el || !el.isConnected) { mounted.delete(el); return; }
    const cv = el.querySelector('canvas'), g = gameOf(el.dataset.mq);
    if (!cv || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (W < 4 || H < 4) return;                         // not laid out yet (a hidden view): the ResizeObserver comes back
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    A.Marquee.draw(cv.getContext('2d'), W, H, t, g);
  }
  function hydrate(root) {
    (root || document).querySelectorAll('.mq-live').forEach(el => {
      if (!mounted.has(el)) { mounted.add(el); if (ro) ro.observe(el.querySelector('canvas')); }
      paint(el);
    });
  }
  function redrawGame(id) {
    mounted.forEach(el => { if (el.dataset.mq === id && !Object.values(channels).includes(el)) paint(el); });
    (listeners[id] || []).forEach(fn => fn());
  }
  const listeners = {};
  /** every marquee on the page again: 2D elements, 3D textures and thumbnails (onArt / thumb listeners) */
  function redrawAll() { mounted.forEach(el => { if (!Object.values(channels).includes(el)) paint(el); }); Object.keys(listeners).forEach(id => listeners[id].forEach(fn => fn())); }
  let raf = 0, last = 0, t0 = performance.now();
  function loop(now) {
    raf = 0;
    const live = Object.keys(channels).filter(c => channels[c] && channels[c].isConnected && !(c === 'floor' && A.floorPaused)).map(c => channels[c]);
    if (!Object.values(channels).some(Boolean) || reduced.matches || document.hidden) return;
    if (now - last >= 1000 / FPS - 2) { last = now; live.forEach(el => paint(el, (now - t0) / 1000)); }
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !document.hidden && !reduced.matches) raf = requestAnimationFrame(loop); }
  function animate(el, channel = 'floor') {
    const old = channels[channel];
    channels[channel] = el || null;
    if (old && old !== el) paint(old);                  // the old one goes still
    if (el) { hydrate(el.parentNode || el); if (reduced.matches) paint(el); else kick(); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  const onReduce = () => { if (reduced.matches) Object.values(channels).forEach(el => el && paint(el)); else kick(); };
  if (reduced.addEventListener) reduced.addEventListener('change', onReduce); else if (reduced.addListener) reduced.addListener(onReduce);
  // the lettering fonts may arrive after the first drawing: draw again once they're in
  if (document.fonts) {
    ['GN Display', 'GN Haunt', 'GN Pixel', 'GN Shade', 'GN Neon', 'GN Quest', 'GN Brush'].forEach(f => document.fonts.load(`40px "${f}"`, 'AZ').catch(() => {}));
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', redrawAll);
  }

  /* ---------- flat THUMBNAILS (the lobby's cards and ALL GAMES: images only, no animation, no 3D) ----------
     One still frame per game and size, drawn once from this same renderer and kept for the page (a JPEG data URL);
     drawn again when the game's picture or a lettering font arrives, and every <img data-mq-thumb> showing it
     is updated. Use: `<img data-mq-thumb="${key}" src="${Arcade.Marquee.thumb(g)}">` with key = thumbKey(g). */
  const thumbs = {};
  const thumbKey = (g, W = 400, H = 100) => g.id + '|' + W + 'x' + H;
  function thumb(g, W = 400, H = 100) {
    const key = thumbKey(g, W, H);
    if (thumbs[key]) return thumbs[key].url;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const T = thumbs[key] = {url: ''};
    const render = () => {
      draw(c.getContext('2d'), W, H, null, g);
      try { T.url = c.toDataURL('image/jpeg', .86); } catch (e) { T.url = ''; }        // a tainted canvas (file://): no picture
      document.querySelectorAll('img[data-mq-thumb]').forEach(i => { if (i.dataset.mqThumb === key && T.url) i.src = T.url; });
    };
    render();
    (listeners[g.id] = listeners[g.id] || []).push(render);
    return T.url;
  }

  A.Marquee = {
    FPS, MAX_FLASH_HZ, SCENES, config, draw, html, hydrate, animate, TITLE_MARGIN, thumb, thumbKey,
    /** tests: the fit chosen for a game at W × H ({size, lines, font: its lettering font has loaded}) */
    fitInfo(g, W, H) {
      const k = config(g), style = k.cab.marquee, c = document.createElement('canvas').getContext('2d');
      const F = fitMax(c, W, H, g, k, fontOf(style), slantOf(style));
      return {size: Math.round(F.size * 10) / 10, lines: F.lines.map(l => l.text), font: fontReady(fontOf(style))};
    },
    onArt(g, fn) { (listeners[g.id] = listeners[g.id] || []).push(fn); },
    /** tests: the brightest flash rate this game's scene can make (Hz), from the scene's own settings */
    flashLimit(g) { const k = config(g); return k.scene === 'storm' ? k.speed / Math.max(1.2, +k.every || 3.2) : 0; },
    get active() { return Object.keys(channels).filter(c => channels[c]); },
  };
})(window.Arcade);
