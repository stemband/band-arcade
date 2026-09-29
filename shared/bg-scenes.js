/* Band Arcade: THE MENU BACKGROUND SCENES, animated backgrounds drawn in code (no image files). Each game's menu
   screens (level select, mode picker, level intros, results, setup/title) show its scene behind the menu, like
   stepping inside its cabinet art; shared/backgrounds.js runs them (one at a time, ~30 fps, at a reduced resolution),
   and a picture Mat uploads to shared/backgrounds/ replaces the scene.

   Arcade.BgScenes.<scene>(ctx, W, H, t, opts)   draws one frame; t in seconds; opts = {state (the scene's own cache,
                                                 kept between frames), still (true: the still frame: no lightning,
                                                 no sputter), colors (theme token names, from games.js bg.colors)}
   Arcade.BgScenes.STILL[scene]                  the moment (s) shown as the still frame (reduced motion, Motion off)
   Arcade.BgScenes.flashes(scene, from, to)      tests: the lightning/sputter events in a time range

   RULES (keep them when you add a scene):
     - DARK and LOW CONTRAST: the menu sits on top (and backgrounds.js adds a dark overlay). Nothing important in the
       middle of the screen: the activity lives toward the edges and in the distance.
     - PHOTOSENSITIVITY: nothing may flash more than 3 times a second, and never the whole screen. Lightning only
       brightens PART of the clouds, softly (storm: a glow behind the clouds every 6–15 s, fading in 0.35–0.6 s,
       sometimes a second weaker pulse; the stage spotlight dips slowly, 2 dips a second at most).
     - Colors only from theme tokens (col()), never a hex color here. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const TAU = Math.PI * 2;
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const probe = document.createElement('canvas').getContext('2d');
  const rgbCache = {};
  /** a theme token as [r, g, b] */
  function rgbOf(name) {
    if (rgbCache[name]) return rgbCache[name];
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    probe.fillStyle = '#000'; if (v) probe.fillStyle = v;
    const s = probe.fillStyle;
    const rgb = s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    return (rgbCache[name] = rgb);
  }
  const col = (n, a = 1) => { const [r, g, b] = rgbOf(n); return `rgba(${r},${g},${b},${a})`; };
  /** token n1 mixed with n2 (k = share of n2) */
  const mix = (n1, n2, k, a = 1) => { const p = rgbOf(n1), q = rgbOf(n2); return `rgba(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(',')},${a})`; };
  const fract = v => v - Math.floor(v);
  const tri = v => 1 - Math.abs(2 * fract(v) - 1);                    // 0 → 1 → 0, period 1
  function vgrad(x, W, H, stops) { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  function glow(x, cx, cy, r, c0, c1 = 'rgba(0,0,0,0)') {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c0); g.addColorStop(1, c1);
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  /* an x position toward the edges: the left or right third, never the middle */
  const edgeX = h => (h < .5 ? .03 + h * .6 : .67 + (h - .5) * .6);
  /** events at random intervals: [{t, k}] up to `until` (deterministic: the same for every run) */
  function schedule(S, key, first, min, spread, until) {
    const L = S[key] || (S[key] = [{t: first, k: 0}]);
    while (L[L.length - 1].t < until) { const k = L.length; L.push({t: L[L.length - 1].t + min + spread * hash(k * 7.3 + first), k}); }
    return L;
  }
  /* ONE lightning strike: a fast rise (50 ms) and a soft fade (tau), sometimes a second weaker pulse */
  const STRIKE = {rise: .05, tauMin: .1, tauSpread: .07, doubleGap: .21, doubleAmp: .55, doubleChance: .35};
  function strikeEnv(d, s) {
    const one = (d, tau) => d < 0 ? 0 : d < STRIKE.rise ? d / STRIKE.rise : Math.exp(-(d - STRIKE.rise) / tau);
    const tau = STRIKE.tauMin + STRIKE.tauSpread * hash(s.k + 3.1);
    return Math.max(one(d, tau), s.dbl ? STRIKE.doubleAmp * one(d - STRIKE.doubleGap, tau) : 0);
  }
  /* soft cloud puffs pre-drawn on a strip twice the screen wide (it scrolls and wraps) */
  function cloudStrip(W, H, seed, n, y0, y1, tone, alpha) {
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H;
    const x = c.getContext('2d');
    for (let i = 0; i < n; i++) {
      const cx = hash(seed + i) * W * 2, cy = H * (y0 + (y1 - y0) * hash(seed + i + 40)), r = H * (.07 + .09 * hash(seed + i + 80));
      for (let j = 0; j < 9; j++) {                                // a cloud bank: many flattened puffs side by side
        const px = cx + (j - 4) * r * .7 + (hash(seed + i * 9 + j) - .5) * r, py = cy + (hash(seed + i * 11 + j) - .5) * r * .5 - Math.sin(j / 8 * Math.PI) * r * .4;
        const pr = r * (.7 + .6 * hash(seed + i * 13 + j));
        [-W * 2, 0, W * 2].forEach(o => { x.save(); x.translate(px + o, py); x.scale(1.9, 1); glow(x, 0, 0, pr, col(tone, alpha), col(tone, 0)); x.restore(); });
      }
    }
    return c;
  }
  function drawStrip(x, strip, W, off) { const o = -fract(off) * W * 2; x.drawImage(strip, o, 0); x.drawImage(strip, o + W * 2, 0); }

  const S = A.BgScenes = {};

  /* NOTE STORM: layered clouds rolling slowly; lightning glows BEHIND the clouds (never a full-screen flash); rain */
  S.storm = (x, W, H, t, o) => {
    const st = o.state;
    if (st.W !== W || st.H !== H) {
      st.W = W; st.H = H;
      st.far = cloudStrip(W, H, 11, 12, .05, .5, 'purple-ink', .35);
      st.mid = cloudStrip(W, H, 23, 10, .02, .45, 'night-3', .6);
      st.near = cloudStrip(W, H, 37, 8, -.04, .3, 'deep', .85);
    }
    vgrad(x, W, H, [[0, col('night')], [.6, col('night-2')], [1, col('deep')]]);
    drawStrip(x, st.far, W, t / 260);
    // lightning: a glow inside the clouds, part of the sky only, never over 0.32 alpha
    if (!o.still) {
      schedule(st, 'strikes', 4, 6, 9, t + 20).forEach(s => {
        s.dbl = s.dbl != null ? s.dbl : hash(s.k + 80) < STRIKE.doubleChance;
        const e = strikeEnv(t - s.t, s); if (e < .01) return;
        const sx = W * edgeX(hash(s.k + 50)), sy = H * (.12 + .2 * hash(s.k + 60)), r = Math.min(W, H) * .55;
        x.save(); x.globalCompositeOperation = 'lighter';
        glow(x, sx, sy, r, col('purple-hi', .32 * e), col('purple-hi', 0));
        glow(x, sx, sy, r * .45, col('white-hi', .14 * e), col('white-hi', 0));
        if (hash(s.k + 90) < .3) {                             // a faint jagged bolt seen through a gap
          x.strokeStyle = col('white-hi', .3 * e); x.lineWidth = Math.max(1, W / 700);
          x.beginPath(); let px = sx, py = sy + r * .1; x.moveTo(px, py);
          for (let j = 0; j < 6; j++) { px += (hash(s.k * 3 + j) - .5) * r * .18; py += r * .09; x.lineTo(px, py); }
          x.stroke();
        }
        x.restore();
      });
    }
    drawStrip(x, st.mid, W, t / 170);
    drawStrip(x, st.near, W, t / 110);
    // rain: faint diagonal streaks
    x.strokeStyle = col('cyan-hi', .07); x.lineWidth = Math.max(1, W / 900);
    x.beginPath();
    for (let i = 0; i < 90; i++) {
      const sp = .8 + .4 * hash(i + 5), rx = fract(hash(i) + t * .12 * sp) * W * 1.2 - W * .1, ry = fract(hash(i + 7) + t * .9 * sp) * H * 1.2 - H * .1;
      x.moveTo(rx, ry); x.lineTo(rx - H * .02, ry + H * .06);
    }
    x.stroke();
  };

  /* GHOST NOTES: a haunted manor hallway: wallpaper, candle sconces (a gentle flicker), drifting mist, ghost wisps */
  S.manor = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('night')], [.72, mix('night-2', 'purple-ink', .35)], [.72, col('deep')], [1, col('night')]]);
    x.fillStyle = col('purple-ink', .08);                       // wallpaper stripes
    for (let i = 0; i < 24; i++) x.fillRect(i * W / 24, 0, W / 70, H * .72);
    x.strokeStyle = col('purple-ink', .12); x.lineWidth = Math.max(1, H / 400);   // floor boards toward the back
    for (let i = -8; i <= 8; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * .02, H * .72); x.lineTo(W / 2 + i * W * .16, H); x.stroke(); }
    [[.06, .34, 1], [.94, .34, 1], [.24, .4, .6], [.76, .4, .6]].forEach(([sx, sy, sc], i) => {   // sconces: glow + flame
      const f = .86 + .08 * Math.sin(t * 5.3 + i * 2) + .06 * Math.sin(t * 8.1 + i);
      glow(x, W * sx, H * sy, H * .22 * sc, col('amber', .2 * f), col('amber', 0));
      x.fillStyle = col('yellow-hi', .7 * f); x.beginPath(); x.ellipse(W * sx, H * sy, H * .007 * sc, H * .018 * sc, 0, 0, TAU); x.fill();
      x.fillStyle = col('cab-metal', .5); x.fillRect(W * sx - H * .01 * sc, H * sy + H * .018 * sc, H * .02 * sc, H * .03 * sc);
    });
    for (let i = 0; i < 7; i++) {                                 // mist along the floor
      const mx = fract(hash(i) + t * (.008 + .006 * hash(i + 3))) * W * 1.6 - W * .3;
      x.save(); x.translate(mx, H * (.78 + .15 * hash(i + 9))); x.scale(3, 1);
      glow(x, 0, 0, H * .12, col('mist', .07), col('mist', 0)); x.restore();
    }
    for (let i = 0; i < 4; i++) {                                 // ghost wisps floating by, high up
      const sp = .012 + .01 * hash(i + 20), gx = (fract(hash(i + 30) + t * sp) * 1.5 - .25) * W;
      const gy = H * (.14 + .18 * hash(i + 40)) + Math.sin(t * .7 + i * 3) * H * .03;
      for (let k = 6; k >= 0; k--) glow(x, gx - k * H * .025, gy + Math.sin(t * 1.3 + k * .6 + i) * H * .01, H * (.05 - k * .005), col('q-wisp', .11 - k * .012), col('q-wisp', 0));
    }
  };

  /* NOTE NINJA: a moonlit bamboo forest: stalks sway, a few leaves drift down, a big soft moon */
  S.bamboo = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('night')], [.7, mix('night-2', 'green-ink', .25)], [1, col('deep')]]);
    const mx = W * .8, my = H * .2, mr = Math.min(W, H) * .11;
    glow(x, mx, my, mr * 3.2, col('bone', .1), col('bone', 0));
    x.fillStyle = col('bone', .32); x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fill();
    const stalk = (bx, w, tone, a, sway, i) => {
      x.strokeStyle = col(tone, a); x.lineWidth = w; x.lineCap = 'butt';
      const top = -H * .05, lean = Math.sin(t * .45 + i * 1.7) * sway;
      x.beginPath(); x.moveTo(bx, H); x.quadraticCurveTo(bx, H * .5, bx + lean, top); x.stroke();
      x.strokeStyle = col('deep', a * .8); x.lineWidth = Math.max(1, w * .18);
      for (let n = 1; n < 7; n++) { const f = n / 7, yy = H - (H - top) * f, xx = bx + lean * f * f; x.beginPath(); x.moveTo(xx - w / 2, yy); x.lineTo(xx + w / 2, yy); x.stroke(); }
    };
    for (let i = 0; i < 22; i++) stalk(W * edgeX(hash(i + 1)), W * (.004 + .004 * hash(i + 2)), 'green-ink', .35, W * .01, i);     // far
    for (let i = 0; i < 8; i++) stalk(W * (i < 4 ? .01 + i * .045 : .83 + (i - 4) * .045), W * (.012 + .008 * hash(i + 60)), 'deep', .9, W * .018, i + 40);   // near
    for (let i = 0; i < 14; i++) {                                 // leaves drifting down
      const ly = (fract(hash(i + 70) + t * (.02 + .02 * hash(i + 71))) * 1.2 - .1) * H;
      const lx = W * edgeX(hash(i + 72)) + Math.sin(t * 1.1 + i) * W * .02;
      x.save(); x.translate(lx, ly); x.rotate(Math.sin(t * 1.5 + i) * .9);
      x.fillStyle = col('green', .22); x.beginPath(); x.ellipse(0, 0, H * .012, H * .004, 0, 0, TAU); x.fill(); x.restore();
    }
  };

  /* VANISHING INK: a dark dojo wall; ink drops bloom and fade like ink spreading in water */
  S.ink = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('dd-night', 'vi-paper', .22)], [1, mix('dd-night', 'vi-paper', .1)]]);
    x.strokeStyle = col('dd-wood-line', .18); x.lineWidth = Math.max(1, W / 600);
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * W / 8, 0); x.lineTo(i * W / 8, H); x.stroke(); }
    for (let i = 0; i < 7; i++) {
      const P = 9 + 5 * hash(i + 1), ph = hash(i + 2) * P, cyc = Math.floor((t + ph) / P), age = (t + ph) - cyc * P;
      const seed = i * 31 + cyc, bx = W * edgeX(hash(seed)), by = H * (.1 + .8 * hash(seed + 5));
      const R = Math.min(W, H) * (.12 + .1 * hash(seed + 9)), r = R * (1 - Math.exp(-age * .6));
      const a = (age < 1.2 ? age / 1.2 : Math.exp(-(age - 1.2) * .35)) * .8;
      for (let k = 0; k < 6; k++) {
        const ang = hash(seed * 3 + k) * TAU, d = r * .45 * hash(seed * 5 + k);
        glow(x, bx + Math.cos(ang) * d, by + Math.sin(ang) * d, r * (.55 + .35 * hash(seed * 7 + k)), col('vi-ink', a), col('vi-ink', 0));
      }
      x.strokeStyle = col('pink', a * .25); x.lineWidth = Math.max(1, W / 700);
      x.beginPath(); x.arc(bx, by, r * .95, 0, TAU); x.stroke();
    }
  };

  /* CHIME HEIST: a dark blueprint grid, a faint vault door, slow-sweeping red security lasers */
  S.vault = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('deep', 'blue-ink', .45)], [1, col('deep')]]);
    const g = Math.min(W, H) / 16;
    x.lineWidth = 1;
    for (let i = 0; i * g < W; i++) { x.strokeStyle = col('cyan', i % 5 ? .05 : .1); x.beginPath(); x.moveTo(i * g, 0); x.lineTo(i * g, H); x.stroke(); }
    for (let i = 0; i * g < H; i++) { x.strokeStyle = col('cyan', i % 5 ? .05 : .1); x.beginPath(); x.moveTo(0, i * g); x.lineTo(W, i * g); x.stroke(); }
    const vx = W * .86, vy = H * .66, vr = Math.min(W, H) * .3;         // the vault door, to one side
    x.strokeStyle = col('cyan', .14); x.lineWidth = Math.max(1, W / 500);
    [1, .8, .35].forEach(k => { x.beginPath(); x.arc(vx, vy, vr * k, 0, TAU); x.stroke(); });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t * .02; x.beginPath(); x.moveTo(vx + Math.cos(a) * vr * .35, vy + Math.sin(a) * vr * .35); x.lineTo(vx + Math.cos(a) * vr * .8, vy + Math.sin(a) * vr * .8); x.stroke(); }
    [[0, 0, .9, .35], [W, 0, 2.25, .3], [0, H, -.75, .25]].forEach(([ox, oy, base, sw], i) => {   // lasers from corners
      const a = base + Math.sin(t * (.13 + .04 * i) + i * 2) * sw, L = Math.hypot(W, H);
      const ex = ox + Math.cos(a) * L, ey = oy + Math.sin(a) * L;
      x.strokeStyle = col('red', .07); x.lineWidth = Math.max(4, W / 90); x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
      x.strokeStyle = col('red-hi', .32); x.lineWidth = Math.max(1, W / 700); x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
    });
  };

  /* ANCIENT NINJA SCROLLS: temple library shelves in shadow, shafts of light with dust, paper lanterns rising */
  S.temple = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('temple-sky', 'deep', .55)], [1, col('deep')]]);
    x.save(); x.globalCompositeOperation = 'lighter';
    [[.3, .1], [.62, .07], [.45, .05]].forEach(([sx, a], i) => {   // light shafts from high windows
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col('amber', a)); g.addColorStop(1, col('amber', 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(W * sx, 0); x.lineTo(W * (sx + .07), 0); x.lineTo(W * (sx + .25), H); x.lineTo(W * (sx + .12), H); x.fill();
    });
    for (let i = 0; i < 40; i++) {                                // dust in the light
      const dx = W * (.32 + .35 * hash(i)) + Math.sin(t * .3 + i) * W * .02, dy = fract(hash(i + 3) - t * .01 * (1 + hash(i + 4))) * H;
      x.fillStyle = col('bone', .12 + .1 * Math.sin(t + i)); x.fillRect(dx, dy, Math.max(1, W / 600), Math.max(1, W / 600));
    }
    x.restore();
    [[0, .17], [.83, .17]].forEach(([sx, sw]) => {                // the shelves, left and right
      x.fillStyle = col('temple-wood', .55); x.fillRect(W * sx, 0, W * sw, H);
      for (let r = 1; r < 7; r++) {
        const y = r * H / 7; x.fillStyle = col('deep', .6); x.fillRect(W * sx, y, W * sw, H / 90);
        for (let k = 0; k < 7; k++) { x.fillStyle = col('scroll-paper', .12 + .06 * hash(r * 9 + k + sx)); x.beginPath(); x.arc(W * (sx + sw * (k + .5) / 7), y - H * .025, H * .018, 0, TAU); x.fill(); }
      }
    });
    for (let i = 0; i < 6; i++) {                                 // paper lanterns rising slowly
      const ly = (1.15 - fract(hash(i + 50) + t * (.012 + .008 * hash(i + 51)))) * H * 1.2 - H * .1;
      const lx = W * edgeX(hash(i + 52)) + Math.sin(t * .5 + i) * W * .015, s = H * (.018 + .012 * hash(i + 53));
      glow(x, lx, ly, s * 5, col('amber', .16), col('amber', 0));
      x.fillStyle = col('dd-lantern', .55); x.fillRect(lx - s * .6, ly - s, s * 1.2, s * 2);
    }
  };

  /* BUTTON MASHER: a neon fighting arena: a glowing perspective floor grid, sweeping spotlights, a few sparks */
  S.arena = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('deep')], [.58, col('arena')], [1, col('deep')]]);
    const hz = H * .58, vx = W / 2;
    x.strokeStyle = col('arena-grid', .35); x.lineWidth = Math.max(1, W / 800);
    for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(vx + i * W * .01, hz); x.lineTo(vx + i * W * .12, H); x.stroke(); }
    for (let k = 0; k < 12; k++) {                                // lines rushing toward you
      const f = fract(k / 12 + t * .08), y = hz + (H - hz) * f * f;
      x.strokeStyle = col('arena-grid', .45 * f); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    x.save(); x.globalCompositeOperation = 'lighter';
    [[0, 'pink'], [W, 'cyan']].forEach(([ox, c], i) => {           // spotlights from the top corners
      const a = Math.PI / 2 + (i ? 1 : -1) * (.55 + Math.sin(t * .35 + i * 2) * .3), L = H * 1.3, sp = .12;
      const g = x.createRadialGradient(ox, 0, 0, ox, 0, L); g.addColorStop(0, col(c, .12)); g.addColorStop(1, col(c, 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox + Math.cos(a - sp) * L, Math.sin(a - sp) * L); x.lineTo(ox + Math.cos(a + sp) * L, Math.sin(a + sp) * L); x.fill();
    });
    for (let b = 0; b < 3; b++) {                                 // sparks: small, near the floor's edges
      const P = 3.5 + b, cyc = Math.floor(t / P), age = t - cyc * P; if (age > 1) continue;
      const sx = W * edgeX(hash(cyc * 5 + b)), sy = hz + (H - hz) * .5;
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (hash(cyc + k * 3 + b) - .5) * 2, v = H * (.25 + .25 * hash(k + cyc)), px = sx + Math.cos(a) * v * age, py = sy + Math.sin(a) * v * age + H * .5 * age * age;
        x.fillStyle = col('yellow-hi', .5 * (1 - age)); x.fillRect(px, py, Math.max(1, W / 500), Math.max(1, W / 500));
      }
    }
    x.restore();
  };

  /* NEON FACE-OFF: an air-hockey rink seen from above in neon; pucks glide and bounce with fading trails */
  S.rink = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('deep')], [1, col('night')]]);
    const m = Math.min(W, H) * .06, rx = m, ry = m, rw = W - 2 * m, rh = H - 2 * m, rr = Math.min(rw, rh) * .12;
    x.fillStyle = col('night-2', .5); x.strokeStyle = col('cyan', .3); x.lineWidth = Math.max(2, W / 300);
    x.beginPath(); x.roundRect ? x.roundRect(rx, ry, rw, rh, rr) : x.rect(rx, ry, rw, rh); x.fill(); x.stroke();
    x.strokeStyle = col('pink', .14); x.lineWidth = Math.max(1, W / 600);
    x.beginPath(); x.moveTo(W / 2, ry); x.lineTo(W / 2, ry + rh); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, rh * .18, 0, TAU); x.stroke();
    [rx, rx + rw].forEach(gx => { x.strokeStyle = col('yellow', .25); x.beginPath(); x.moveTo(gx, H / 2 - rh * .15); x.lineTo(gx, H / 2 + rh * .15); x.stroke(); });
    const pr = Math.min(W, H) * .025;
    const at = (i, tt) => [rx + pr + tri(hash(i) + tt * (.03 + .02 * hash(i + 1))) * (rw - 2 * pr), ry + pr + tri(hash(i + 2) + tt * (.04 + .02 * hash(i + 3))) * (rh - 2 * pr)];
    ['cyan', 'pink', 'yellow'].forEach((c, i) => {
      for (let k = 12; k >= 1; k--) { const [px, py] = at(i, t - k * .05); x.fillStyle = col(c, .05 * (1 - k / 13)); x.beginPath(); x.arc(px, py, pr * (1 - k * .03), 0, TAU); x.fill(); }
      const [px, py] = at(i, t); glow(x, px, py, pr * 3, col(c, .25), col(c, 0));
      x.fillStyle = col(c, .55); x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
    });
  };

  /* SHOWTIME MALFUNCTION: a dim dusty stage: heavy curtains, one spotlight that now and then sputters (slow dips,
     never a rapid flicker), drifting dust. Spooky, not scary: no characters, no faces. */
  const SPUTTER = {first: 5, min: 8, spread: 5, len: 1.4, dips: 3, depth: .45};   // dips at ~2 a second, smooth
  function sputter(st, t, still) {
    if (still) return 1;
    let b = 1;
    schedule(st, 'sputters', SPUTTER.first, SPUTTER.min, SPUTTER.spread, t + 20).forEach(s => {
      const d = t - s.t; if (d < 0 || d > SPUTTER.len) return;
      const w = Math.sin(Math.PI * d / SPUTTER.len * SPUTTER.dips); b = Math.min(b, 1 - SPUTTER.depth * w * w);
    });
    return b;
  }
  S.stage = (x, W, H, t, o) => {
    vgrad(x, W, H, [[0, col('deep')], [.75, mix('deep', 'stage-curtain', .12)], [.75, col('stage-wood')], [1, col('deep')]]);
    x.fillStyle = col('deep', .55); x.fillRect(0, H * .75, W, H * .25);
    const b = sputter(o.state, t, o.still), cx = W * .63;
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createLinearGradient(0, 0, 0, H * .8); g.addColorStop(0, col('amber-hi', .1 * b)); g.addColorStop(1, col('amber-hi', .03 * b));
    x.fillStyle = g; x.beginPath(); x.moveTo(cx - W * .02, 0); x.lineTo(cx + W * .02, 0); x.lineTo(cx + W * .12, H * .82); x.lineTo(cx - W * .12, H * .82); x.fill();
    x.save(); x.translate(cx, H * .82); x.scale(1, .22); glow(x, 0, 0, W * .14, col('amber-hi', .16 * b), col('amber-hi', 0)); x.restore();
    for (let i = 0; i < 30; i++) {                                 // dust in the beam
      const f = hash(i), dy = fract(hash(i + 4) + t * .01 * (1 + f)) * H * .8, dx = cx + (hash(i + 8) - .5) * (W * .04 + dy * .2) + Math.sin(t * .4 + i) * W * .005;
      x.fillStyle = col('bone', .18 * b); x.fillRect(dx, dy, Math.max(1, W / 700), Math.max(1, W / 700));
    }
    x.restore();
    const curtain = (x0, w, flip) => {                             // folds: repeating dark/light stripes
      for (let k = 0; k < 7; k++) {
        const fx = x0 + (flip ? w - (k + 1) * w / 7 : k * w / 7), g2 = x.createLinearGradient(fx, 0, fx + w / 7, 0);
        g2.addColorStop(0, mix('stage-curtain', 'deep', .75)); g2.addColorStop(.5, mix('stage-curtain', 'deep', .45)); g2.addColorStop(1, mix('stage-curtain', 'deep', .8));
        x.fillStyle = g2; x.fillRect(fx, 0, w / 7 + 1, H * .78);
      }
    };
    curtain(0, W * .2, false); curtain(W * .8, W * .2, true);
    x.fillStyle = mix('stage-curtain', 'deep', .6); x.fillRect(0, 0, W, H * .09);    // the valance
    for (let k = 0; k < 16; k++) { x.fillStyle = col('deep', .35); x.beginPath(); x.arc((k + .5) * W / 16, H * .09, W / 34, 0, Math.PI); x.fill(); }
  };

  /* SUSTAIN SPEEDWAY: a night racetrack to a vanishing point; lane lines and light streaks flow past; a city glows */
  S.track = (x, W, H, t) => {
    const hz = H * .42, vx = W / 2;
    vgrad(x, W, H, [[0, col('sw-sky-top')], [.3, col('sw-sky-mid')], [.42, col('sw-sky-low')], [.42, col('sw-ground')], [1, col('deep')]]);
    x.fillStyle = col('deep', .45); x.fillRect(0, 0, W, H);        // keep it dark
    glow(x, vx, hz, W * .45, col('sw-sun-1', .12), col('sw-sun-1', 0));
    for (let i = 0; i < 40; i++) {                                 // the city skyline on the horizon
      const bx = (i / 40) * W, bw = W / 40 + 1, bh = H * (.03 + .09 * hash(i + 3)) * (Math.abs(i - 20) > 5 ? 1 : .5);
      x.fillStyle = col('sw-far', .85); x.fillRect(bx, hz - bh, bw, bh);
      for (let k = 0; k < 3; k++) if (hash(i * 7 + k) > .6) { x.fillStyle = col('sw-window', .3); x.fillRect(bx + bw * .3, hz - bh * (.3 + .2 * k), bw * .2, bh * .06); }
    }
    x.fillStyle = col('sw-road', .8); x.beginPath(); x.moveTo(vx - W * .02, hz); x.lineTo(vx + W * .02, hz); x.lineTo(W * .98, H); x.lineTo(W * .02, H); x.fill();
    for (let k = 0; k < 10; k++) {                                 // lane dashes flowing toward you
      const f = fract(k / 10 + t * .35), f2 = Math.min(1, f + .04), y1 = hz + (H - hz) * f * f, y2 = hz + (H - hz) * f2 * f2;
      [-1, 1].forEach(s => { x.strokeStyle = col('sw-lane', .35 * f); x.lineWidth = Math.max(1, W / 300 * f); x.beginPath(); x.moveTo(vx + s * (W * .16) * f * f, y1); x.lineTo(vx + s * (W * .16) * f2 * f2, y2); x.stroke(); });
    }
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {                                 // light streaks along both sides
      const side = i % 2 ? 1 : -1, f = fract(hash(i) + t * (.5 + .3 * hash(i + 1))), e = f * f;
      const x1 = vx + side * W * (.05 + .48 * e), y1 = hz + (H - hz) * e * .9, x2 = vx + side * W * (.05 + .48 * Math.min(1, e * 1.25)), y2 = hz + (H - hz) * Math.min(1, e * 1.25) * .9;
      x.strokeStyle = col(i % 3 ? 'sw-tail' : 'sw-nitro', .35 * f); x.lineWidth = Math.max(1, W / 400 * f); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    }
    x.restore();
  };

  /* KEYS TO THE CITY: a night skyline whose skyscrapers stand in piano-key groups of 2 and 3, the Chopsticks and Fork
     neon signs glowing softly above them, a piano keyboard for a street along the bottom, windows switching on and off
     slowly (fades, never a blink) */
  S['keys-city'] = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('deep')], [.55, col('kt-night-2')], [1, col('kt-night')]]);
    for (let i = 0; i < 60; i++) { x.fillStyle = col('text-hi', .12 + .3 * tri(hash(i + 3) + t * .04)); x.fillRect(hash(i) * W, hash(i + 40) * H * .45, 1.3, 1.3); }
    const ground = H * .82, u = W / 21;                                  // 21 white keys across
    const blacks = [1, 2, 4, 5, 6];                                      // black keys after white 0,1 and 3,4,5 of each octave
    for (let o = 0; o < 3; o++) blacks.forEach((b, k) => {
      const cx = (o * 7 + b) * u, h = H * (.28 + .22 * hash(o * 7 + b)), bw = u * .62, top = ground - h;
      x.fillStyle = col('kt-bldg'); x.fillRect(cx - bw / 2, top, bw, h);
      for (let r = 0; r < Math.floor(h / (u * .45)); r++) for (let c = 0; c < 2; c++) {
        const on = tri(hash(o * 70 + b * 9 + r * 3 + c) + t * .03);                       // a slow fade on and off
        x.fillStyle = on > .6 ? col('kt-win-on', .25 + .35 * (on - .6) / .4) : col('kt-win-off', .5);
        x.fillRect(cx - bw / 2 + bw * (.18 + c * .44), top + u * .25 + r * u * .45, bw * .22, u * .22);
      }
      if (k === 0 || k === 2) {                                          // the sign over each group
        const gx = k === 0 ? (o * 7 + 1.5) * u : (o * 7 + 5) * u, gy = H * .2 + hash(o + k) * H * .06, s = u * .5, glow = .45 + .2 * Math.sin(t * .6 + o + k);
        x.strokeStyle = col(k === 0 ? 'kt-chop' : 'kt-fork', glow); x.lineWidth = Math.max(1.5, u * .06); x.lineCap = 'round';
        x.strokeRect(gx - s * 1.1, gy - s * 1.1, s * 2.2, s * 2.2);
        x.beginPath();
        if (k === 0) { x.moveTo(gx - s * .5, gy - s * .7); x.lineTo(gx - s * .1, gy + s * .7); x.moveTo(gx + s * .5, gy - s * .7); x.lineTo(gx + s * .1, gy + s * .7); }
        else { [-1, 0, 1].forEach(d => { x.moveTo(gx + d * s * .45, gy - s * .75); x.lineTo(gx + d * s * .45, gy - s * .2); });
          x.moveTo(gx - s * .45, gy - s * .2); x.quadraticCurveTo(gx, gy + s * .3, gx + s * .45, gy - s * .2); x.moveTo(gx, gy + s * .1); x.lineTo(gx, gy + s * .8); }
        x.stroke();
      }
    });
    x.fillStyle = col('kt-street', .85); x.fillRect(0, ground, W, H - ground);            // the keyboard street
    x.strokeStyle = col('kt-street-2'); x.lineWidth = 1;
    for (let k = 0; k <= 21; k++) { x.beginPath(); x.moveTo(k * u, ground); x.lineTo(k * u, H); x.stroke(); }
    x.fillStyle = col('deep', .35); x.fillRect(0, 0, W, H);              // keep it dark behind the menus
  };

  /* THE SYNTHWAVE SUNSET (Music Highway's art: the game's backdrop (music-highway/game.js) and its menu scene below
     share it). paint() draws what never moves, once, into a canvas the caller keeps: the purple-to-pink sky, a few
     stars, the big striped sun on the horizon, wireframe mountains on both sides and the ground with its grid lines
     running to the vanishing point. The moving parts (the grid's rolling lines, the road, the pads) are the caller's.
       S.sunset.paint(x, W, H, {hz, cx, stars, mountains})  -> {sun: {x, y, r, img}} (img = the sun alone, for a swell) */
  S.sunset = {
    paint(x, W, H, o = {}) {
      const hz = o.hz, cx = o.cx != null ? o.cx : W / 2, stars = o.stars == null ? 60 : o.stars;
      vgrad(x, W, hz, [[0, col('mh-sky-top')], [.55, col('mh-sky-mid')], [1, col('mh-sky-low')]]);
      for (let i = 0; i < stars; i++) {                                  // stars in the dark top of the sky
        const sx = hash(i) * W, sy = Math.pow(hash(i + 50), 1.6) * hz * .6;
        x.fillStyle = col('text-hi', .25 + .5 * hash(i + 9)); x.fillRect(sx, sy, 1.5, 1.5);
      }
      // the sun: a gradient disc sitting on the horizon, horizontal bands cut out of its lower half
      const r = Math.min(W * .16, hz * .64), sy = hz - r * .42;
      const img = document.createElement('canvas'); img.width = Math.ceil(r * 2 + 4); img.height = Math.ceil(r * 2 + 4);
      const g = img.getContext('2d'), c0 = r + 2;
      const gr = g.createLinearGradient(0, 2, 0, r * 2 + 2); gr.addColorStop(0, col('mh-sun1')); gr.addColorStop(.55, col('amber')); gr.addColorStop(1, col('mh-sun2'));
      g.fillStyle = gr; g.beginPath(); g.arc(c0, c0, r, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 6; k++) { const f = k / 6, y = c0 + r * (.08 + f * .9), h = r * (.04 + f * .09); g.fillRect(0, y, img.width, h); }
      glow(x, cx, sy, r * 2, col('mh-sun2', .35), col('mh-sun2', 0));
      x.save(); x.beginPath(); x.rect(0, 0, W, hz); x.clip();
      x.drawImage(img, cx - c0, sy - c0);
      // wireframe mountains on both sides
      if (o.mountains !== false) {
        const ridge = (pts, side) => {
          const P = pts.map(([u, v]) => [side < 0 ? W * u : W * (1 - u), hz - v * hz * .42]);
          x.fillStyle = col('mh-mtn'); x.beginPath(); x.moveTo(P[0][0], hz); P.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(P[P.length - 1][0], hz); x.closePath(); x.fill();
          x.strokeStyle = col('mh-mtn-line', .35); x.lineWidth = 1;                // the wireframe: peak to the valleys around it
          for (let i = 1; i < P.length - 1; i++) { x.beginPath(); x.moveTo(P[i][0], P[i][1]); x.lineTo((P[i - 1][0] + P[i][0]) / 2, hz); x.lineTo(P[i][0], hz); x.lineTo((P[i + 1][0] + P[i][0]) / 2, hz); x.stroke(); }
          x.strokeStyle = col('mh-mtn-line', .85); x.lineWidth = Math.max(1.5, W / 700);
          x.beginPath(); P.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
        };
        ridge([[0, .5], [.05, .75], [.11, .42], [.17, .9], [.24, .5], [.3, .66], [.37, .18], [.4, 0]], -1);
        ridge([[0, .6], [.06, .38], [.12, .82], [.19, .45], [.26, .7], [.33, .3], [.38, .12], [.41, 0]], 1);
      }
      x.restore();
      // the ground: dark, with the grid's lines running to the vanishing point
      vgrad2(x, 0, hz, W, H - hz, [[0, col('mh-ground')], [1, mix('mh-ground', 'deep', .5)]]);
      for (let i = -24; i <= 24; i++) {
        const gl = x.createLinearGradient(0, hz, 0, H); gl.addColorStop(0, col('mh-grid', 0)); gl.addColorStop(1, col('mh-grid', .35));
        x.strokeStyle = gl; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, hz); x.lineTo(cx + i * W * .09, H); x.stroke();
      }
      x.strokeStyle = col('mh-sky-low', .9); x.lineWidth = 2; x.beginPath(); x.moveTo(0, hz); x.lineTo(W, hz); x.stroke();
      return {sun: {x: cx - c0, y: sy - c0, r, img}};
    },
  };
  function vgrad2(x, X0, Y0, W, H, stops) { const g = x.createLinearGradient(0, Y0, 0, Y0 + H); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(X0, Y0, W, H); }

  /* MUSIC HIGHWAY (the menu scene): the game's own synthwave sunset (S.sunset) with the highway's pitch lanes, the
     grid rolling toward you and a few light pads drifting down the lanes. Slow; the menus sit on top */
  const HW_CACHE = {};
  S.highway = (x, W, H, t) => {
    // the still layers are drawn once per size and kept here (an avatar background passes no state of its own)
    const key = W + 'x' + H, st = HW_CACHE[key] || (HW_CACHE[key] = {}), hz = H * .42, vx = W / 2, far = 6, half = W * .36, sy = H * 1.02;
    const keys = Object.keys(HW_CACHE); if (keys.length > 6) delete HW_CACHE[keys[0]];
    if (!st.bg) {
      st.bg = document.createElement('canvas'); st.bg.width = W; st.bg.height = H;
      const b = st.bg.getContext('2d');
      S.sunset.paint(b, W, H, {hz, cx: vx, stars: 50});
      const X = (u, d) => vx + u * half / d, Y = d => hz + (sy - hz) / d;
      b.fillStyle = col('mh-road', .92); b.beginPath(); b.moveTo(vx, hz); b.lineTo(X(1, 1), Y(1)); b.lineTo(X(-1, 1), Y(1)); b.fill();
      for (let l = 0; l <= 5; l++) { const u = -1 + l * .4, edge = l === 0 || l === 5;
        b.strokeStyle = edge ? col('pink', .8) : col('mh-lane', .35); b.lineWidth = edge ? Math.max(2, W / 400) : 1;
        b.beginPath(); b.moveTo(vx, hz); b.lineTo(X(u, 1), Y(1)); b.stroke(); }
    }
    x.drawImage(st.bg, 0, 0, W, H);
    const X = (u, d) => vx + u * half / d, Y = d => hz + (sy - hz) / d;
    for (let k = 0; k < 10; k++) {                                // the grid rolling toward you
      const f = fract(k / 10 + t * .1), d = Math.pow(far, 1 - f);
      x.strokeStyle = col(k % 2 ? 'mh-grid' : 'mh-grid-2', .5 * f); x.lineWidth = 1 + f;
      x.beginPath(); x.moveTo(0, Y(d)); x.lineTo(W, Y(d)); x.stroke();
    }
    const cols = ['mh-c', 'mh-d', 'mh-e', 'mh-f', 'mh-g', 'mh-a', 'mh-b'];
    for (let i = 0; i < 6; i++) {                                  // light pads drifting down the lanes
      const f = fract(hash(i + 20) + t * .07), d = Math.pow(far, 1 - f), lane = Math.floor(hash(i + 31) * 5), u = -.8 + lane * .4;
      const w = half * .3 / d, h = w * .45, cx = X(u, d), by = Y(d);
      x.fillStyle = col(cols[i % 7], .25 + .5 * f); x.strokeStyle = col('deep', .8); x.lineWidth = 1.5;
      x.beginPath(); x.rect(cx - w / 2, by - h, w, h); x.fill(); x.stroke();
    }
    x.fillStyle = col('deep', .25); x.fillRect(0, 0, W, H);           // a little darker behind the menus
  };


  /* LOST SIGNAL: a slow starfield, a radar sweep in the corner, a faint distant signal pulse */
  S.space = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('deep')], [1, mix('deep', 'ls-panel', .4)]]);
    [[60, .004, .25], [40, .009, .4], [22, .016, .6]].forEach(([n, sp, a], L) => {
      for (let i = 0; i < n; i++) {
        const sx = fract(hash(i + L * 100) - t * sp) * W, sy = hash(i + L * 100 + 50) * H, tw = .6 + .4 * Math.sin(t * (1 + hash(i)) + i);
        x.fillStyle = col('white-hi', a * tw); const s = Math.max(1, W / 900) * (L + 1) * .7; x.fillRect(sx, sy, s, s);
      }
    });
    const rx = W * .12, ry = H * .82, rr = Math.min(W, H) * .22;     // the radar, bottom left
    x.strokeStyle = col('ls-grid', .25); x.lineWidth = Math.max(1, W / 800);
    [1, .66, .33].forEach(k => { x.beginPath(); x.arc(rx, ry, rr * k, 0, TAU); x.stroke(); });
    x.beginPath(); x.moveTo(rx - rr, ry); x.lineTo(rx + rr, ry); x.moveTo(rx, ry - rr); x.lineTo(rx, ry + rr); x.stroke();
    const a = t * .8;
    for (let k = 0; k < 16; k++) { x.fillStyle = col('ls-sweep', .1 * (1 - k / 16)); x.beginPath(); x.moveTo(rx, ry); x.arc(rx, ry, rr, a - (k + 1) * .05, a - k * .05); x.fill(); }
    const px = W * .82, py = H * .22, per = 4, ph = fract(t / per);  // the distant signal
    glow(x, px, py, Math.min(W, H) * .02, col('ls-ping', .5), col('ls-ping', 0));
    [0, .33, .66].forEach(d => { const f = fract(ph + d); x.strokeStyle = col('ls-ping', .25 * (1 - f)); x.beginPath(); x.arc(px, py, Math.min(W, H) * .2 * f, 0, TAU); x.stroke(); });
  };

  /* DOJO DUEL: a night dojo: paper lanterns gently swaying from the roof beam, blossom petals drifting */
  S['night-dojo'] = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('dd-night')], [.78, mix('dd-night', 'floor-3', .4)], [.78, col('dd-wood')], [1, col('deep')]]);
    x.fillStyle = col('deep', .4); x.fillRect(0, H * .78, W, H * .22);
    x.strokeStyle = col('dd-wood-line', .35); x.lineWidth = Math.max(1, W / 700);
    for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * W / 10, H * .78); x.lineTo(W / 2 + (i * W / 10 - W / 2) * 1.6, H); x.stroke(); }
    x.fillStyle = col('dd-wood', .95); x.fillRect(0, 0, W, H * .06);                 // the roof beam
    [.08, .24, .76, .92].forEach((lx, i) => {
      const L = H * (.14 + .05 * (i % 2)), ang = Math.sin(t * .8 + i * 1.3) * .06, ex = W * lx + Math.sin(ang) * L, ey = H * .06 + Math.cos(ang) * L;
      x.strokeStyle = col('dd-wood-line', .7); x.beginPath(); x.moveTo(W * lx, H * .06); x.lineTo(ex, ey); x.stroke();
      glow(x, ex, ey + H * .03, H * .16, col('dd-lantern', .22), col('dd-lantern', 0));
      x.fillStyle = col('dd-paper', .6); x.beginPath(); x.ellipse(ex, ey + H * .03, H * .025, H * .035, ang, 0, TAU); x.fill();
      x.fillStyle = col('red-ink', .6); x.fillRect(ex - H * .012, ey - H * .006, H * .024, H * .008);
    });
    for (let i = 0; i < 22; i++) {                                 // blossom petals drifting
      const px = (fract(hash(i) + t * (.015 + .01 * hash(i + 1))) * 1.2 - .1) * W, py = (fract(hash(i + 2) + t * (.025 + .015 * hash(i + 3))) * 1.2 - .1) * H;
      x.save(); x.translate(px + Math.sin(t + i) * W * .01, py); x.rotate(t * (.5 + hash(i + 4)) + i);
      x.fillStyle = col('pink-hi', .3); x.beginPath(); x.ellipse(0, 0, H * .008, H * .004, 0, 0, TAU); x.fill(); x.restore();
    }
  };

  /* RHYTHM DOJO (the bamboo dojo: jade + gold): the drum hall at night: a wooden floor, dim paper screens along the
     back wall, two big wooden taiko drums on stands at the edges (their gold rims and a jade glow breathe slowly,
     2.4 s: never a beat-by-beat flash), two lanterns swaying, and dust drifting in the lantern light. The middle stays dark for the menu. */
  S.taiko = (x, W, H, t) => {
    const m = Math.min(W, H);
    vgrad(x, W, H, [[0, col('rd-night')], [.72, mix('rd-night', 'floor-3', .35)], [.72, col('dd-wood')], [1, col('deep')]]);
    // the paper screens on the back wall
    const sy = H * .16, sh = H * .44, n = 8;
    for (let i = 0; i < n; i++) {
      const sx = W * (.04 + i * .92 / n), sw = W * .92 / n - W * .01;
      x.fillStyle = mix('rd-night', 'dd-paper', .08); x.fillRect(sx, sy, sw, sh);
      x.strokeStyle = col('dd-wood-line', .8); x.lineWidth = Math.max(1, m / 240);
      x.strokeRect(sx, sy, sw, sh);
      x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(sx, sy + sh * k / 4); x.lineTo(sx + sw, sy + sh * k / 4); } x.moveTo(sx + sw / 2, sy); x.lineTo(sx + sw / 2, sy + sh); x.stroke();
    }
    x.fillStyle = col('dd-wood', .95); x.fillRect(0, 0, W, H * .07);               // the roof beam
    x.strokeStyle = col('dd-wood-line', .35); x.lineWidth = Math.max(1, W / 700);
    for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * W / 10, H * .72); x.lineTo(W / 2 + (i * W / 10 - W / 2) * 1.6, H); x.stroke(); }
    // the lanterns
    [.2, .8].forEach((lx, i) => {
      const L = H * .12, ang = Math.sin(t * .7 + i * 1.7) * .05, ex = W * lx + Math.sin(ang) * L, ey = H * .07 + Math.cos(ang) * L;
      x.strokeStyle = col('dd-wood-line', .7); x.beginPath(); x.moveTo(W * lx, H * .07); x.lineTo(ex, ey); x.stroke();
      glow(x, ex, ey + H * .03, H * .18, col('dd-lantern', .22), col('dd-lantern', 0));
      x.fillStyle = col('dd-paper', .6); x.beginPath(); x.ellipse(ex, ey + H * .03, H * .026, H * .036, ang, 0, TAU); x.fill();
    });
    // the two drums on their stands
    const breath = .5 + .5 * Math.sin(t * TAU / 2.4);
    [[.1, 0], [.9, 1]].forEach(([u, k]) => {
      const dx = W * u, r = m * .14, cy = H * .62, b = k ? 1 - breath : breath;
      x.strokeStyle = col('rd-stand'); x.lineWidth = m * .02; x.lineCap = 'round';
      x.beginPath(); x.moveTo(dx - r * .8, H * .9); x.lineTo(dx - r * .3, cy + r * .6); x.moveTo(dx + r * .8, H * .9); x.lineTo(dx + r * .3, cy + r * .6); x.stroke();
      x.fillStyle = col('rd-body'); x.beginPath(); x.ellipse(dx, cy, r * 1.05, r, 0, 0, TAU); x.fill();
      x.strokeStyle = col('rd-iron'); x.lineWidth = m * .01;
      x.beginPath(); x.ellipse(dx, cy, r * 1.05, r, 0, 0, TAU); x.stroke();
      glow(x, dx, cy, r * 1.6, col('rd-jade', .07 + .12 * b), col('rd-jade', 0));
      x.fillStyle = col('rd-head', .9); x.beginPath(); x.ellipse(dx, cy, r * .78, r * .74, 0, 0, TAU); x.fill();
      x.strokeStyle = col('yellow', .35 + .35 * b); x.lineWidth = m * .012; x.beginPath(); x.ellipse(dx, cy, r * .78, r * .74, 0, 0, TAU); x.stroke();
      x.fillStyle = col('rd-stud', .8);
      for (let j = 0; j < 14; j++) { const a = j / 14 * TAU; x.beginPath(); x.arc(dx + Math.cos(a) * r * .9, cy + Math.sin(a) * r * .86, m * .006, 0, TAU); x.fill(); }
    });
    // dust in the light
    for (let i = 0; i < 18; i++) {
      const px = (fract(hash(i + 40) + t * (.006 + .004 * hash(i + 41))) * 1.1 - .05) * W, py = H * (.1 + .6 * fract(hash(i + 42) - t * (.01 + .006 * hash(i + 43))));
      x.fillStyle = col('dd-paper', .12 + .12 * hash(i + 44)); x.beginPath(); x.arc(px, py, m * .003, 0, TAU); x.fill();
    }
  };

  /* OFFICIAL BAND NINJA GEAR (the Diamond belt code; avatar backgrounds only): the night dojo with diamond-blue lanterns,
     a Diamond belt hung on the back wall, and small diamond glints drifting down slowly (they fade, never blink) */
  S['diamond-dojo'] = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('dd-night', 'bn-diamond-d', .18)], [.78, mix('dd-night', 'floor-3', .4)], [.78, col('dd-wood')], [1, col('deep')]]);
    x.fillStyle = col('deep', .4); x.fillRect(0, H * .78, W, H * .22);
    x.strokeStyle = col('dd-wood-line', .35); x.lineWidth = Math.max(1, W / 700);
    for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * W / 10, H * .78); x.lineTo(W / 2 + (i * W / 10 - W / 2) * 1.6, H); x.stroke(); }
    x.fillStyle = col('dd-wood', .95); x.fillRect(0, 0, W, H * .06);                 // the roof beam
    // the belt on the back wall: a band, a knot, two tails
    const by = H * .42, bw = W * .34, bh = H * .035, cx = W / 2;
    glow(x, cx, by, W * .3, col('bn-diamond', .16), col('bn-diamond', 0));
    x.fillStyle = col('bn-diamond', .75); x.fillRect(cx - bw / 2, by - bh / 2, bw, bh);
    x.fillStyle = col('bn-diamond-d', .85); x.fillRect(cx - bh, by - bh, bh * 2, bh * 2);
    x.save(); x.translate(cx, by + bh); x.fillStyle = col('bn-diamond', .75);
    [-1, 1].forEach(sd => { x.save(); x.rotate(sd * .22); x.fillRect(sd > 0 ? 0 : -bh, 0, bh, H * .16); x.restore(); });
    x.restore();
    [.08, .24, .76, .92].forEach((lx, i) => {
      const L = H * (.14 + .05 * (i % 2)), ang = Math.sin(t * .8 + i * 1.3) * .06, ex = W * lx + Math.sin(ang) * L, ey = H * .06 + Math.cos(ang) * L;
      x.strokeStyle = col('dd-wood-line', .7); x.beginPath(); x.moveTo(W * lx, H * .06); x.lineTo(ex, ey); x.stroke();
      glow(x, ex, ey + H * .03, H * .16, col('bn-diamond', .2), col('bn-diamond', 0));
      x.fillStyle = col('dd-paper', .55); x.beginPath(); x.ellipse(ex, ey + H * .03, H * .025, H * .035, ang, 0, TAU); x.fill();
      x.fillStyle = col('bn-diamond', .6); x.fillRect(ex - H * .012, ey - H * .006, H * .024, H * .008);
    });
    for (let i = 0; i < 18; i++) {                                 // diamond glints drifting down
      const px = (fract(hash(i) + t * (.01 + .008 * hash(i + 1))) * 1.2 - .1) * W, py = (fract(hash(i + 2) + t * (.02 + .012 * hash(i + 3))) * 1.2 - .1) * H;
      const a = .18 + .12 * Math.sin(t * .9 + i * 2.1), r = H * (.006 + .004 * hash(i + 4));
      x.fillStyle = col('bn-diamond', a); x.beginPath();
      x.moveTo(px, py - r * 1.6); x.lineTo(px + r, py); x.lineTo(px, py + r * 1.6); x.lineTo(px - r, py); x.closePath(); x.fill();
    }
  };

  /* ARCADE QUEST (title screen): an 8-bit night sky, twinkling pixel stars, a castle silhouette in pixel art */
  S['pixel-night'] = (x, W, H, t, o) => {
    const st = o.state, pw = 160, ph = Math.max(60, Math.round(pw * H / W));
    const layer = () => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; return c; };
    if (!st.c || st.c.height !== ph) {
      // the parts that never move are drawn ONCE (the dithered sky is 1 × 1 pixels: far too many to redraw every frame)
      st.c = layer(); st.back = layer(); st.front = layer();
      const b = st.back.getContext('2d');
      const bands = ['q-void', 'q-void', 'q-purple-d', 'q-blue-d'];
      for (let y = 0; y < ph; y++) for (let xx = 0; xx < pw; xx += 1) {          // the sky: bands with a checker dither where they meet
        const f = y / ph * (bands.length - 1), bd = Math.floor(f), frac = f - bd, up = ((xx + y) % 2) && frac > .5 ? 1 : 0;
        b.fillStyle = col(bands[Math.min(bands.length - 1, bd + up)]); b.fillRect(xx, y, 1, 1);
      }
      b.fillStyle = col('q-black', .3); b.fillRect(0, 0, pw, ph);                      // keep it dark (the castle still stands out)
      const f = st.front.getContext('2d');
      const mx = Math.floor(pw * .18), my = Math.floor(ph * .18);                      // a pixel crescent moon
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16 && (dx - 2) * (dx - 2) + (dy + 1) * (dy + 1) > 12) { f.fillStyle = col('q-moon', .75); f.fillRect(mx + dx, my + dy, 1, 1); }
      f.fillStyle = mix('q-green-d', 'q-black', .55);                  // hills
      for (let hx = 0; hx < pw; hx++) { const hy = ph * .82 + Math.sin(hx * .07) * 3 + Math.sin(hx * .19) * 1.5; f.fillRect(hx, Math.floor(hy), 1, ph); }
      const cx = Math.floor(pw * .72), base = Math.floor(ph * .8);  // the castle, to the right
      f.fillStyle = col('q-black');
      [[0, 26, 20], [-8, 34, 6], [20, 34, 6], [6, 40, 7]].forEach(([dx, hgt, w]) => {
        f.fillRect(cx + dx, base - hgt, w, hgt);
        for (let k = 0; k < w; k += 2) f.fillRect(cx + dx + k, base - hgt - 2, 1, 2);
      });
    }
    const p = st.c.getContext('2d');
    p.clearRect(0, 0, pw, ph); p.drawImage(st.back, 0, 0);
    for (let i = 0; i < 60; i++) {
      const sx = Math.floor(hash(i) * pw), sy = Math.floor(hash(i + 9) * ph * .6), on = hash(i * 3 + Math.floor(t * .7 + hash(i) * 5)) > .25;
      if (on) { p.fillStyle = col('q-white', .35 + .3 * hash(i + 2)); p.fillRect(sx, sy, 1, 1); }
    }
    p.drawImage(st.front, 0, 0);
    const cx = Math.floor(pw * .72), base = Math.floor(ph * .8);
    if (Math.floor(t * .5) % 4 !== 3) { p.fillStyle = col('q-gold', .8); p.fillRect(cx + 9, base - 32, 1, 2); p.fillRect(cx + 4, base - 16, 2, 2); }
    x.imageSmoothingEnabled = false; x.drawImage(st.c, 0, 0, W, H); x.imageSmoothingEnabled = true;
  };

  /* THE NOTE CHECKER: a calm, slow, soft aurora (very little motion: students are tuning) */
  S.aurora = (x, W, H, t, o) => {
    vgrad(x, W, H, [[0, col('deep')], [1, col('night')]]);
    for (let i = 0; i < 50; i++) { x.fillStyle = col('white-hi', .15 + .1 * hash(i + 1)); x.fillRect(hash(i) * W, hash(i + 5) * H * .7, Math.max(1, W / 900), Math.max(1, W / 900)); }
    const st = o.state, pw = 120, ph = Math.max(40, Math.round(pw * H / W));
    if (!st.c || st.c.height !== ph) { st.c = document.createElement('canvas'); st.c.width = pw; st.c.height = ph; }
    const p = st.c.getContext('2d');
    // the curtains move very slowly (0.05 rad/s): redrawn at most 6 times a second (360 gradients a frame is costly)
    if (st.at == null || Math.abs(t - st.at) >= 1 / 6 || st.atH !== ph) { st.at = t; st.atH = ph; p.clearRect(0, 0, pw, ph);
    [['green', .3, .22, 0], ['cyan', .22, .3, 2], ['purple', .18, .18, 4]].forEach(([c, a, by, ph0]) => {
      for (let px = 0; px < pw; px++) {
        const u = px / pw, y = ph * by + Math.sin(u * 5 + t * .05 + ph0) * ph * .06 + Math.sin(u * 13 + t * .03 + ph0) * ph * .02;
        const h = ph * (.14 + .06 * Math.sin(u * 7 + t * .04 + ph0)), g = p.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, col(c, 0)); g.addColorStop(1, col(c, a * (.6 + .4 * Math.sin(u * 3 + t * .06 + ph0))));
        p.fillStyle = g; p.fillRect(px, y - h, 1, h);
      }
    });
    }
    x.save(); x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true; x.drawImage(st.c, 0, 0, W, H); x.restore();
  };

  /* ---------- AVATAR BACKGROUND SCENES (shared/avatar-bg.js), also ready for a game's menu some day ----------
     Same rules as above: dark, tokens only, slow, nothing flashes. Square-friendly (the avatar covers the middle). */

  /* NEON CITY: a skyline at night: two rows of buildings, windows that slowly light and dim, neon signs humming */
  S.city = (x, W, H, t) => {
    vgrad(x, W, H, [[0, col('deep')], [.55, mix('deep', 'purple-ink', .45)], [1, mix('deep', 'pink-ink', .35)]]);
    for (let i = 0; i < 40; i++) { x.fillStyle = col('white-hi', .12 + .12 * hash(i + 3)); x.fillRect(hash(i) * W, hash(i + 7) * H * .4, Math.max(1, W / 400), Math.max(1, W / 400)); }
    glow(x, W * .5, H * .95, W * .7, col('pink', .16), col('pink', 0));
    [[.34, 'floor-2', 16, .1], [.52, 'floor', 11, .2]].forEach(([top, tone, n, seed], L) => {
      for (let i = 0; i < n; i++) {
        const bw = W / n, bx = i * bw, bh = H * (top * .45 + top * .55 * hash(i * 3 + seed * 90)) + (L ? H * .1 : 0), by = H - bh;
        x.fillStyle = col(tone); x.fillRect(bx - 1, by, bw + 1, bh);
        const cols = 3, rows = Math.floor(bh / (H * .045)), ww = bw / (cols * 2 + 1), wh = H * .018;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const k = i * 97 + r * 13 + c + L * 500, on = .5 + .5 * Math.sin(t * .25 * (.4 + hash(k)) + hash(k + 1) * TAU);
          if (hash(k + 2) < .45) continue;
          x.fillStyle = col(hash(k + 3) < .5 ? 'yellow-hi' : 'cyan-hi', (.08 + .3 * on) * (L ? 1 : .6));
          x.fillRect(bx + ww * (1 + c * 2), by + H * .02 + r * H * .045, ww, wh);
        }
        if (L && hash(i + 40) > .7) {                                 // a neon sign on a roof, humming slowly
          const hum = .75 + .25 * Math.sin(t * 1.2 + i), c = hash(i + 41) > .5 ? 'pink' : 'cyan';
          glow(x, bx + bw / 2, by - H * .03, bw * .9, col(c, .25 * hum), col(c, 0));
          x.fillStyle = col(c, .8 * hum); x.fillRect(bx + bw * .15, by - H * .045, bw * .7, H * .025);
        }
      }
    });
  };

  /* SYNTHWAVE SUNSET: a striped sun sinking behind mountains, a neon grid rolling toward you */
  S.synthwave = (x, W, H, t) => {
    const hz = H * .62;
    vgrad(x, W, H, [[0, col('deep')], [.35, mix('deep', 'purple-ink', .7)], [hz / H, mix('purple-ink', 'pink-ink', .7)], [hz / H, col('deep')], [1, mix('deep', 'purple-ink', .3)]]);
    const sr = Math.min(W, H) * .3, sx = W * .5, sy = hz - sr * .35;
    glow(x, sx, sy, sr * 2.2, col('pink', .25), col('pink', 0));
    x.save(); x.beginPath(); x.rect(0, 0, W, hz); x.clip();
    const g = x.createLinearGradient(0, sy - sr, 0, sy + sr); g.addColorStop(0, col('yellow')); g.addColorStop(.5, col('amber')); g.addColorStop(1, col('pink'));
    x.fillStyle = g; x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
    x.fillStyle = mix('purple-ink', 'pink-ink', .6);                   // the sun's stripes, drifting down slowly
    for (let k = 0; k < 6; k++) { const f = fract(k / 6 + t * .03), y = sy + sr * (f * 1.1 - .1), h = sr * .03 * (1 + f * 3); x.fillRect(sx - sr, y, sr * 2, h); }
    x.restore();
    x.fillStyle = col('deep');                                          // mountains
    x.beginPath(); x.moveTo(0, hz); [[0, .8], [.12, .55], [.22, .74], [.3, .62], [.4, .85]].forEach(([u, v]) => x.lineTo(W * u, hz - (1 - v) * H * .5)); x.lineTo(W * .45, hz); x.fill();
    x.beginPath(); x.moveTo(W, hz); [[1, .78], [.88, .58], [.78, .72], [.7, .64], [.6, .86]].forEach(([u, v]) => x.lineTo(W * u, hz - (1 - v) * H * .5)); x.lineTo(W * .55, hz); x.fill();
    x.strokeStyle = col('pink', .7); x.lineWidth = Math.max(1, W / 300);
    x.beginPath(); x.moveTo(0, hz); x.lineTo(W, hz); x.stroke();
    x.strokeStyle = col('cyan', .45); x.lineWidth = Math.max(1, W / 500);
    for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * .03, hz); x.lineTo(W / 2 + i * W * .2, H); x.stroke(); }
    for (let k = 0; k < 8; k++) { const f = fract(k / 8 + t * .12), y = hz + (H - hz) * f * f; x.strokeStyle = col('cyan', .55 * f); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  };

  /* GALAXY SWIRL: spiral arms of stars turning slowly around the middle */
  S.galaxy = (x, W, H, t, o) => {
    vgrad(x, W, H, [[0, col('deep')], [1, mix('deep', 'purple-ink', .35)]]);
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) * .55, m = Math.min(W, H);
    glow(x, cx, cy, m * .45, col('purple', .35), col('purple', 0));
    glow(x, cx, cy, m * .18, col('pink-hi', .3), col('pink-hi', 0));
    x.save(); x.globalCompositeOperation = 'lighter';
    const cols = ['cyan', 'pink', 'purple-hi', 'white-hi'];
    for (let i = 0; i < 260; i++) {
      const arm = i % 3, d = Math.pow(hash(i + 1), .7), a = arm / 3 * TAU + d * 4.2 + t * .06 + (hash(i + 2) - .5) * .5;
      const r = d * R, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * .8;
      const tw = .55 + .45 * Math.sin(t * (.6 + hash(i + 3)) + i);
      x.fillStyle = col(cols[i % 4], (.25 + .5 * (1 - d)) * tw); const s = Math.max(1, m / 180) * (1 + hash(i + 4));
      x.fillRect(px, py, s, s);
    }
    x.restore();
  };

  /* GOLD RECORD WALL: framed gold records on a dark wall, slowly spinning, a soft spotlight passing along */
  S.records = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('deep', 'floor-3', .8)], [1, col('deep')]]);
    const n = 3, cw = W / n, ch = H / n, r = Math.min(cw, ch) * .3;
    for (let row = 0; row < n; row++) for (let c = 0; c < n; c++) {
      const fx = c * cw + cw / 2, fy = row * ch + ch / 2, s = Math.min(cw, ch) * .82;
      x.fillStyle = col('dd-wood', .9); x.fillRect(fx - s / 2, fy - s / 2, s, s);
      x.strokeStyle = col('amber', .6); x.lineWidth = Math.max(1, W / 200); x.strokeRect(fx - s / 2, fy - s / 2, s, s);
      x.fillStyle = col('deep'); x.fillRect(fx - s * .42, fy - s * .42, s * .84, s * .84);
      const g = x.createRadialGradient(fx - r * .3, fy - r * .3, 0, fx, fy, r);
      g.addColorStop(0, col('yellow-hi')); g.addColorStop(.6, col('amber')); g.addColorStop(1, col('amber-ink'));
      x.fillStyle = g; x.beginPath(); x.arc(fx, fy, r, 0, TAU); x.fill();
      x.strokeStyle = col('amber-ink', .6); x.lineWidth = 1;
      [.85, .7, .55].forEach(k => { x.beginPath(); x.arc(fx, fy, r * k, 0, TAU); x.stroke(); });
      const a = t * (.5 + .1 * c) + row;                                 // the shine turning with the record
      x.strokeStyle = col('white-hi', .55); x.lineWidth = Math.max(1, r * .12);
      x.beginPath(); x.arc(fx, fy, r * .72, a, a + .7); x.stroke();
      x.fillStyle = col('pink-ink'); x.beginPath(); x.arc(fx, fy, r * .28, 0, TAU); x.fill();
      x.fillStyle = col('deep'); x.beginPath(); x.arc(fx, fy, r * .06, 0, TAU); x.fill();
    }
    const sp = (Math.sin(t * .35) * .6 + .5) * W;                           // the spotlight drifting across
    x.save(); x.globalCompositeOperation = 'lighter'; glow(x, sp, H * .45, Math.min(W, H) * .5, col('amber-hi', .12), col('amber-hi', 0)); x.restore();
  };

  /* UNDERWATER BUBBLES: deep water, light rays swaying from the surface, bubbles wobbling up */
  S.bubbles = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('cyan-ink', 'blue-ink', .5)], [.6, mix('deep', 'blue-ink', .55)], [1, col('deep')]]);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {                                         // light rays
      const bx = W * (.1 + .2 * i) + Math.sin(t * .3 + i * 2) * W * .06, g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, col('cyan-hi', .16)); g.addColorStop(1, col('cyan-hi', 0)); x.fillStyle = g;
      x.beginPath(); x.moveTo(bx - W * .03, 0); x.lineTo(bx + W * .03, 0); x.lineTo(bx + W * .12, H); x.lineTo(bx - W * .02, H); x.fill();
    }
    x.restore();
    for (let i = 0; i < 26; i++) {
      const sp = .06 + .06 * hash(i + 1), y = (1.1 - fract(hash(i + 2) + t * sp)) * H * 1.15 - H * .05, r = Math.min(W, H) * (.012 + .03 * hash(i + 3));
      const bx = hash(i + 4) * W + Math.sin(t * 1.6 + i) * W * .015;
      x.strokeStyle = col('cyan-hi', .6); x.lineWidth = Math.max(1, r * .18); x.beginPath(); x.arc(bx, y, r, 0, TAU); x.stroke();
      x.fillStyle = col('cyan', .12); x.fill();
      x.fillStyle = col('white-hi', .7); x.beginPath(); x.arc(bx - r * .35, y - r * .35, r * .22, 0, TAU); x.fill();
    }
  };

  /* LAVA LAMP: soft glowing blobs rising and sinking, slowly melting together */
  S.lavalamp = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('deep', 'purple-ink', .55)], [1, mix('deep', 'pink-ink', .4)]]);
    glow(x, W / 2, H, W * .8, col('amber', .2), col('amber', 0));
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const P = 14 + 10 * hash(i + 1), f = tri(t / P + hash(i + 2)), by = H * (1.05 - 1.1 * f), bx = W * (.12 + .76 * hash(i + 3)) + Math.sin(t * .2 + i) * W * .05;
      const r = Math.min(W, H) * (.09 + .07 * hash(i + 4)), c = i % 3 === 0 ? 'amber' : i % 3 === 1 ? 'pink' : 'yellow';
      x.save(); x.translate(bx, by); x.scale(1, 1.15 + .15 * Math.sin(t * .5 + i));
      glow(x, 0, 0, r * 1.6, col(c, .55), col(c, 0));
      x.fillStyle = col(c, .35); x.beginPath(); x.arc(0, 0, r * .8, 0, TAU); x.fill(); x.restore();
    }
    x.restore();
  };

  /* CONFETTI PARTY: soft party lights and confetti falling gently, turning as it falls */
  S.confetti = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('deep', 'purple-ink', .5)], [1, col('deep')]]);
    [['pink', .2, .25], ['cyan', .8, .3], ['yellow', .5, .8]].forEach(([c, u, v], i) => glow(x, W * u + Math.sin(t * .2 + i) * W * .05, H * v, Math.min(W, H) * .45, col(c, .14), col(c, 0)));
    const cols = ['pink', 'cyan', 'yellow', 'green', 'purple-hi', 'amber'];
    for (let i = 0; i < 46; i++) {
      const sp = .05 + .05 * hash(i + 1), y = (fract(hash(i + 2) + t * sp) * 1.2 - .1) * H, px = hash(i + 3) * W + Math.sin(t * (.7 + hash(i + 4)) + i) * W * .03;
      const s = Math.min(W, H) * (.018 + .014 * hash(i + 5)), turn = Math.cos(t * (1.2 + hash(i + 6) * 1.5) + i);
      x.save(); x.translate(px, y); x.rotate(t * (.4 + hash(i + 7)) + i);
      x.fillStyle = col(cols[i % cols.length], .85); x.fillRect(-s / 2, -s * .3 * Math.abs(turn), s, Math.max(1, s * .6 * Math.abs(turn)));
      x.restore();
    }
  };

  /* FIREFLIES NIGHT: a dark meadow, grass swaying, fireflies drifting and glowing softly on and off (slow) */
  S.fireflies = (x, W, H, t) => {
    vgrad(x, W, H, [[0, mix('deep', 'blue-ink', .35)], [.7, mix('deep', 'green-ink', .25)], [1, col('deep')]]);
    for (let i = 0; i < 30; i++) { x.fillStyle = col('white-hi', .1 + .15 * hash(i + 2)); x.fillRect(hash(i) * W, hash(i + 5) * H * .45, Math.max(1, W / 400), Math.max(1, W / 400)); }
    x.strokeStyle = mix('deep', 'green-ink', .5); x.lineWidth = Math.max(1, W / 160);
    for (let i = 0; i < 60; i++) {
      const gx = hash(i + 10) * W, gh = H * (.1 + .16 * hash(i + 11)), sw = Math.sin(t * .8 + i * .7) * W * .012;
      x.beginPath(); x.moveTo(gx, H); x.quadraticCurveTo(gx, H - gh * .6, gx + sw, H - gh); x.stroke();
    }
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const fx = W * (hash(i + 20) + Math.sin(t * (.1 + .08 * hash(i + 21)) + i) * .12), fy = H * (.3 + .6 * hash(i + 22) + Math.sin(t * (.13 + .1 * hash(i + 23)) + i * 2) * .08);
      const on = Math.max(0, Math.sin(t * (.5 + .4 * hash(i + 24)) + i * 1.7));      // under 0.5 pulses a second, smooth
      glow(x, fx, fy, Math.min(W, H) * .07, col('yellow', .45 * on), col('yellow', 0));
      x.fillStyle = col('yellow-hi', .25 + .7 * on); x.fillRect(fx - 1, fy - 1, Math.max(2, W / 160), Math.max(2, W / 160));
    }
    x.restore();
  };

  /** a still layer painted once per size into the scene's state (only the moving parts are drawn every frame) */
  function layer(st, key, W, H, paint) {
    const L = st[key];
    if (L && L.width === W && L.height === H) return L;
    const c = st[key] = document.createElement('canvas'); c.width = W; c.height = H;
    paint(c.getContext('2d'), W, H);
    return c;
  }
  /** a slow, smooth breath 0..1 (period p seconds; keep p ≥ 2: nothing flickers) */
  const breathe = (t, p, ph = 0) => .5 + .5 * Math.sin(t * TAU / p + ph);

  /* HAUNTED HALLWAY: a cute, friendly spooky corridor at night: purple walls running back to a lit doorway, crooked
     portraits, cobwebs in the corners, candle sconces that glow softly (slow breaths, no flicker), mist on the floor
     and one little friendly ghost drifting across and back, high up */
  S['haunted-hallway'] = (x, W, H, t, o) => {
    const bx0 = W * .39, bx1 = W * .61, by0 = H * .3, by1 = H * .62, m = Math.min(W, H);   // the far wall
    x.drawImage(layer(o.state, 'hall', W, H, (p, W, H) => {
      vgrad(p, W, H, [[0, mix('deep', 'purple-ink', .25)], [1, col('deep')]]);
      const wall = (pts, c) => { p.fillStyle = c; p.beginPath(); pts.forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b)); p.closePath(); p.fill(); };
      wall([[0, 0], [bx0, by0], [bx0, by1], [0, H]], mix('deep', 'purple-ink', .3));                    // left wall
      wall([[W, 0], [bx1, by0], [bx1, by1], [W, H]], mix('deep', 'purple-ink', .3));                    // right wall
      wall([[0, 0], [W, 0], [bx1, by0], [bx0, by0]], mix('deep', 'purple-ink', .14));                   // ceiling
      wall([[0, H], [W, H], [bx1, by1], [bx0, by1]], mix('deep', 'q-carpet-d', .2));                  // floor
      wall([[W * .18, H], [W * .82, H], [W * .54, by1], [W * .46, by1]], mix('deep', 'red-ink', .25)); // the runner rug
      p.fillStyle = mix('deep', 'purple-ink', .2); p.fillRect(bx0, by0, bx1 - bx0, by1 - by0);          // the far wall
      glow(p, W / 2, (by0 + by1) / 2 + H * .03, (bx1 - bx0) * .9, col('purple', .14), col('purple', 0));
      p.fillStyle = mix('deep', 'purple', .22); p.fillRect(W * .46, H * .4, W * .08, by1 - H * .4);     // the lit doorway
      p.strokeStyle = col('purple-ink', .25); p.lineWidth = Math.max(1, W / 300);                      // wallpaper stripes, in perspective
      for (let i = 1; i < 9; i++) {
        const u = i / 9, lx = bx0 * u, rx = W - (W - bx1) * u;
        [[lx, lx / bx0], [rx, (W - rx) / (W - bx1)]].forEach(([sx, f]) => { p.beginPath(); p.moveTo(sx, by0 * f); p.lineTo(sx, H - (H - by1) * f); p.stroke(); });
      }
      [[.12, .5], [.26, .78]].forEach(([u, sc], k) => {                                                   // portraits on both walls
        [-1, 1].forEach(side => {
          const f = u / (bx0 / W), X0 = side < 0 ? W * u : W * (1 - u), w = W * .07 * sc * (1.2 - f * .5);
          const top = by0 * f + H * .12 * (1 - f), h = (H - (H - by1) * f - by0 * f) * .28;
          p.save(); p.translate(X0, top + h / 2); p.rotate((k ? -.06 : .05) * side);
          p.fillStyle = mix('deep', 'gold-ink', .45); p.fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
          p.fillStyle = mix('deep', 'purple-ink', .12); p.fillRect(-w / 2, -h / 2, w, h);
          p.fillStyle = mix('deep', 'q-ghost-d', .2); p.beginPath(); p.ellipse(0, -h * .08, w * .22, h * .2, 0, 0, TAU); p.fill();   // a portrait's head
          p.fillRect(-w * .3, h * .12, w * .6, h * .3);
          p.restore();
        });
      });
      p.strokeStyle = col('q-ghost', .14); p.lineWidth = 1;                                            // cobwebs in the top corners
      [[0, 1], [W, -1]].forEach(([cx, d]) => {
        const r = m * .22;
        for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI / 2; p.beginPath(); p.moveTo(cx, 0); p.lineTo(cx + d * Math.cos(a) * r, Math.sin(a) * r); p.stroke(); }
        for (let j = 1; j <= 3; j++) { p.beginPath(); for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI / 2, rr = r * j / 3.3 * (k % 5 ? .92 : 1); k ? p.lineTo(cx + d * Math.cos(a) * rr, Math.sin(a) * rr) : p.moveTo(cx + d * rr, 0); } p.stroke(); }
      });
    }), 0, 0);
    [[.07, .42, 1], [.93, .42, 1], [.3, .4, .55], [.7, .4, .55]].forEach(([sx, sy, sc], i) => {   // candles: a slow breath of light
      const f = .8 + .12 * breathe(t, 3.2 + i * .7, i * 2) + .08 * breathe(t, 5.1, i);
      const X = W * sx, Y = H * sy, r = m * .018 * sc;
      glow(x, X, Y - r * 2, m * .2 * sc, col('amber', .2 * f), col('amber', 0));
      x.fillStyle = col('bone', .6); x.fillRect(X - r * .6, Y - r * .4, r * 1.2, r * 2.4);                  // the candle
      x.fillStyle = mix('deep', 'gold-ink', .4); x.fillRect(X - r * 1.4, Y + r * 2, r * 2.8, r * .7);                    // its holder
      x.fillStyle = col('yellow-hi', .75 * f); x.beginPath(); x.ellipse(X, Y - r * 1.2, r * .5, r * (1 + .1 * Math.sin(t * 2.4 + i)), 0, 0, TAU); x.fill();
    });
    for (let i = 0; i < 5; i++) {                                                          // mist along the floor
      const mx = fract(hash(i + 3) + t * (.01 + .006 * hash(i + 4))) * W * 1.6 - W * .3;
      x.save(); x.translate(mx, H * (.82 + .12 * hash(i + 5))); x.scale(3, 1);
      glow(x, 0, 0, m * .1, col('mist', .08), col('mist', 0)); x.restore();
    }
    // the friendly ghost: floats across and back high up (a round head, a wavy hem, dot eyes, rosy cheeks, a little smile)
    const gx = W * (.5 + .36 * Math.sin(t * .08)), gy = H * .17 + Math.sin(t * .6) * H * .02, gr = m * .065, dir = Math.cos(t * .08) >= 0 ? 1 : -1;
    glow(x, gx, gy, gr * 2.4, col('q-wisp', .12), col('q-wisp', 0));
    // pre-drawn once per size and facing, then placed with smooth (filtered) moves: its edges never shimmer
    const gs = Math.ceil(gr * 3), spr = layer(o.state, 'ghost' + dir, gs, gs, p => {
      p.translate(gs / 2, gs * .42);
      p.fillStyle = col('q-ghost', .62); p.beginPath(); p.arc(0, 0, gr, Math.PI, 0);
      const hem = gr * 1.1; p.lineTo(gr, hem);
      for (let k = 4; k > 0; k--) { const hx = -gr + (k - .5) * gr / 2; p.quadraticCurveTo(hx + gr * .25, hem + gr * .22, hx, hem - gr * .05); p.lineTo(hx - gr * .25, hem); }
      p.closePath(); p.fill();
      p.fillStyle = col('deep'); const ex = gr * .1 * dir;
      [-1, 1].forEach(s => { p.beginPath(); p.ellipse(ex + s * gr * .34, -gr * .1, gr * .11, gr * .15, 0, 0, TAU); p.fill(); });
      p.fillStyle = col('q-cheek', .55); [-1, 1].forEach(s => { p.beginPath(); p.arc(ex + s * gr * .55, gr * .18, gr * .1, 0, TAU); p.fill(); });
      p.strokeStyle = col('deep'); p.lineWidth = Math.max(1, gr * .08); p.beginPath(); p.arc(ex, gr * .15, gr * .16, .2, Math.PI - .2); p.stroke();
    });
    x.save(); x.translate(gx, gy); x.rotate(Math.sin(t * .5 + 1) * .04); x.imageSmoothingEnabled = true;
    x.drawImage(spr, -gs / 2, -gs * .42);
    x.restore();
  };

  /* TWINKLE LIGHTS: a winter night: strings of colored bulbs draped across the top and the sides, each bulb slowly
     fading brighter and dimmer on its own (2.4–5 s a cycle: a twinkle, never a blink), soft snow falling on snowy hills */
  const TW_STRANDS = [[-.02, .06, 1.02, .06, .14, 11], [-.02, .02, .45, -.02, .2, 6], [.55, -.02, 1.02, .03, .2, 6], [-.02, .36, .2, .78, .06, 5], [1.02, .36, .8, .78, .06, 5]];
  const TW_COLS = ['pink', 'cyan', 'yellow', 'green', 'amber', 'purple'];
  const twAt = (W, H, u0, v0, u1, v1, sag, f) => [W * (u0 + (u1 - u0) * f), H * (v0 + (v1 - v0) * f + sag * 4 * f * (1 - f))];
  function TW_BULBS(W, H) {
    const L = [];
    TW_STRANDS.forEach(([u0, v0, u1, v1, sag, n], s) => { for (let k = 0; k < n; k++) { const [a, b] = twAt(W, H, u0, v0, u1, v1, sag, (k + .5) / n); L.push([a, b, s * 17 + k]); } });
    return L;
  }
  S['twinkle-lights'] = (x, W, H, t, o) => {
    const m = Math.min(W, H);
    x.drawImage(layer(o.state, 'night', W, H, (p, W, H) => {
      vgrad(p, W, H, [[0, col('deep')], [.75, mix('deep', 'blue-ink', .38)], [1, mix('deep', 'blue-ink', .2)]]);
      for (let i = 0; i < 40; i++) { p.fillStyle = col('white-hi', .08 + .14 * hash(i + 60)); p.fillRect(hash(i + 61) * W, hash(i + 62) * H * .6, Math.max(1, W / 400), Math.max(1, W / 400)); }
      const hill = (y0, amp, ph, c) => { p.fillStyle = c; p.beginPath(); p.moveTo(0, H); for (let i = 0; i <= 40; i++) { const u = i / 40; p.lineTo(u * W, H * (y0 - amp * Math.sin(u * 3.2 + ph))); } p.lineTo(W, H); p.fill(); };
      hill(.86, .06, .4, mix('deep', 'blue-ink', .5));
      hill(.93, .05, 2.1, mix('deep', 'blue-ink', .6, .9));
      p.fillStyle = col('white-hi', .06); p.fillRect(0, H * .9, W, H * .1);
      for (let i = 0; i < 5; i++) {                                                          // little pines on the far hill, dark
        const px = W * (.06 + .22 * i + .06 * hash(i + 90)), py = H * (.86 - .05 * Math.sin(px / W * 3.2 + .4)), s = m * (.05 + .03 * hash(i + 91));
        p.fillStyle = mix('deep', 'blue-ink', .2);
        for (let k = 0; k < 3; k++) { p.beginPath(); p.moveTo(px, py - s * (1.6 - k * .45)); p.lineTo(px - s * (.35 + k * .12), py - s * (.7 - k * .35)); p.lineTo(px + s * (.35 + k * .12), py - s * (.7 - k * .35)); p.fill(); }
      }
    }), 0, 0);
    const r = m * .014, gr = Math.max(4, Math.round(m * .07)), br = Math.max(2, Math.ceil(r * 1.3));
    const bulbs = TW_BULBS(W, H);
    x.drawImage(layer(o.state, 'wires', W, H, p => {                                        // the wires (a gentle droop) + every bulb unlit
      p.strokeStyle = mix('deep', 'green-ink', .5); p.lineWidth = Math.max(1, m / 250);
      TW_STRANDS.forEach(([u0, v0, u1, v1, sag]) => { p.beginPath(); for (let k = 0; k <= 24; k++) { const [a, b] = twAt(W, H, u0, v0, u1, v1, sag, k / 24); k ? p.lineTo(a, b) : p.moveTo(a, b); } p.stroke(); });
      bulbs.forEach(([bx, by, k]) => {
        p.fillStyle = col('deep'); p.fillRect(bx - r * .45, by - r * .2, r * .9, r * .9);
        p.fillStyle = mix('deep', TW_COLS[k % TW_COLS.length], .3); p.beginPath(); p.ellipse(bx, by + r * 1.4, r * .8, r * 1.15, 0, 0, TAU); p.fill();
      });
    }), 0, 0);
    TW_COLS.forEach(c => {                                                                   // each color's glow and lit bulb, pre-drawn once
      layer(o.state, 'glow-' + c, gr * 2, gr * 2, p => glow(p, gr, gr, gr, col(c, .22), col(c, 0)));
      layer(o.state, 'bulb-' + c, br * 2, br * 2, p => {
        p.fillStyle = mix('deep', c, .9); p.beginPath(); p.ellipse(br, br, r * .8, r * 1.15, 0, 0, TAU); p.fill();
        p.fillStyle = col('white-hi', .35); p.beginPath(); p.arc(br - r * .25, br - r * .3, r * .25, 0, TAU); p.fill();
      });
    });
    x.save(); x.globalCompositeOperation = 'lighter';
    bulbs.forEach(([bx, by, k]) => {                                                         // each bulb breathes on its own: 2.4–5 s a cycle
      x.globalAlpha = .35 + .65 * breathe(t, 2.4 + 2.6 * hash(k + 7), hash(k + 8) * TAU);
      x.drawImage(o.state['glow-' + TW_COLS[k % TW_COLS.length]], bx - gr, by + m * .02 - gr);
    });
    x.globalCompositeOperation = 'source-over';
    bulbs.forEach(([bx, by, k]) => {
      x.globalAlpha = .1 + .9 * breathe(t, 2.4 + 2.6 * hash(k + 7), hash(k + 8) * TAU);
      x.drawImage(o.state['bulb-' + TW_COLS[k % TW_COLS.length]], bx - br, by + r * 1.4 - br);
    });
    x.restore();
    for (let tier = 0; tier < 3; tier++) {                                                    // soft snow (one path per brightness)
      x.fillStyle = col('white-hi', .22 + .12 * tier); x.beginPath();
      for (let i = tier; i < 45; i += 3) {
        const sp = .03 + .03 * hash(i + 30), y = (fract(hash(i + 31) + t * sp) * 1.1 - .05) * H, sx = hash(i + 32) * W + Math.sin(t * (.4 + .3 * hash(i + 33)) + i) * W * .03, r = m * (.004 + .005 * hash(i + 35));
        x.moveTo(sx + r, y); x.arc(sx, y, r, 0, TAU);
      }
      x.fill();
    }
  };

  /* CONCERT HALL: the stage seen from the seats: red curtains and a valance, chairs and music stands waiting on a warm
     wooden stage, three spotlight cones breathing slowly and drifting a little, rows of seats along the bottom */
  S['concert-hall'] = (x, W, H, t, o) => {
    const m = Math.min(W, H), sy = H * .66;                                                  // the stage's front edge
    x.drawImage(layer(o.state, 'hall', W, H, (p, W, H) => {
      vgrad(p, W, H, [[0, col('deep')], [.5, mix('deep', 'stage-curtain', .18)], [sy / H, mix('deep', 'red-ink', .3)], [1, col('deep')]]);
      vgrad2(p, 0, H * .5, W, sy - H * .5, [[0, mix('stage-wood', 'deep', .7)], [1, mix('stage-wood', 'deep', .35)]]);   // the stage floor
      p.strokeStyle = col('deep', .35); p.lineWidth = 1;
      for (let i = 1; i < 5; i++) { const y = H * .5 + (sy - H * .5) * (i / 5) * (i / 5); p.beginPath(); p.moveTo(0, y); p.lineTo(W, y); p.stroke(); }
      p.fillStyle = mix('stage-wood', 'deep', .75); p.fillRect(0, sy, W, H * .03);                      // the stage's lip
      p.fillStyle = mix('deep', 'floor-3', .6);                                                            // chairs and stands, in arcs
      [[.54, .9, 7], [.6, 1, 8]].forEach(([yy, sc, n]) => {
        for (let i = 0; i < n; i++) {
          const u = .18 + .64 * (i + .5) / n, cx = W * u, cy = H * yy - Math.sin(u * Math.PI) * H * .03, s = m * .032 * sc;
          p.fillRect(cx - s * .5, cy - s * 1.3, s * .18, s * 1.3); p.fillRect(cx - s * .5, cy - s * .5, s, s * .15);   // a chair
          p.fillRect(cx - s * .5, cy - s * .35, s * .12, s * .35); p.fillRect(cx + s * .38, cy - s * .35, s * .12, s * .35);
          if (i % 2 === 0) { p.fillRect(cx + s * .8, cy - s * 1.6, s * .08, s * 1.6); p.save(); p.translate(cx + s * .84, cy - s * 1.7); p.rotate(-.25); p.fillRect(-s * .45, -s * .3, s * .9, s * .55); p.restore(); }   // a music stand
        }
      });
      const curtain = (x0, w, flip) => {
        const n = 6;
        for (let k = 0; k < n; k++) {
          const fx = x0 + (flip ? w - (k + 1) * w / n : k * w / n), g = p.createLinearGradient(fx, 0, fx + w / n, 0);
          g.addColorStop(0, mix('stage-curtain', 'deep', .7)); g.addColorStop(.5, mix('stage-curtain', 'deep', .3)); g.addColorStop(1, mix('stage-curtain', 'deep', .78));
          p.fillStyle = g; p.beginPath(); p.moveTo(fx, 0); p.lineTo(fx + w / n + 1, 0); p.lineTo(fx + w / n + 1 + (flip ? -1 : 1) * w * .05 * (k / n), sy); p.lineTo(fx + (flip ? -1 : 1) * w * .05 * (k / n), sy); p.fill();
        }
      };
      curtain(0, W * .16, false); curtain(W * .84, W * .16, true);
      vgrad2(p, 0, 0, W, H * .13, [[0, mix('stage-curtain', 'deep', .7)], [1, mix('stage-curtain', 'deep', .45)]]);   // the valance
      for (let k = 0; k < 12; k++) { p.fillStyle = mix('stage-curtain', 'deep', .45); p.beginPath(); p.arc((k + .5) * W / 12, H * .13, W / 24, 0, Math.PI); p.fill(); }
      p.fillStyle = col('gold', .5); p.fillRect(0, H * .13 - 1, W, Math.max(1, H / 200));
      for (let r = 0; r < 4; r++) {                                                           // rows of seats (the backs of them)
        const y = sy + H * .06 + r * H * .085, s = W / (10 + r * -1.5) , off = r % 2 ? s / 2 : 0;
        p.fillStyle = mix('deep', 'red-ink', .18 + r * .05);
        for (let cx = -s + off; cx < W + s; cx += s) { p.beginPath(); p.moveTo(cx - s * .42, y + H * .09); p.lineTo(cx - s * .42, y + s * .18); p.quadraticCurveTo(cx - s * .42, y, cx, y); p.quadraticCurveTo(cx + s * .42, y, cx + s * .42, y + s * .18); p.lineTo(cx + s * .42, y + H * .09); p.fill(); }
      }
    }), 0, 0);
    x.save(); x.globalCompositeOperation = 'lighter';
    [[.28, .14, 7], [.5, 0, 9], [.72, -.14, 8]].forEach(([u, lean, P], i) => {                 // spotlights: slow breaths, slow drift
      const b = .55 + .45 * breathe(t, P, i * 2.1), fx = W * (u + .04 * Math.sin(t * TAU / (P * 2.3) + i)), top = W * (u - lean * .6);
      const g = x.createLinearGradient(0, H * .1, 0, sy);
      g.addColorStop(0, col('amber-hi', .14 * b)); g.addColorStop(1, col('amber-hi', .05 * b));
      x.fillStyle = g; x.beginPath(); x.moveTo(top - W * .015, H * .1); x.lineTo(top + W * .015, H * .1); x.lineTo(fx + W * .09, sy - H * .04); x.lineTo(fx - W * .09, sy - H * .04); x.fill();
      x.save(); x.translate(fx, sy - H * .05); x.scale(1, .25); glow(x, 0, 0, W * .12, col('amber-hi', .2 * b), col('amber-hi', 0)); x.restore();
    });
    for (let i = 0; i < 24; i++) {                                                             // dust in the light
      const dy = H * .12 + fract(hash(i + 50) + t * .012 * (1 + hash(i + 51))) * (sy - H * .2), dx = W * (.2 + .6 * hash(i + 52)) + Math.sin(t * .3 + i) * W * .01;
      x.fillStyle = col('bone', .16); x.fillRect(dx, dy, Math.max(1, W / 500), Math.max(1, W / 500));
    }
    x.restore();
  };

  /* SUNSET BEACH: a half sun sinking into the sea under a warm sky, its light shimmering on slow waves, foam sliding up
     and back on the sand, a palm tree swaying a little and a couple of birds gliding by */
  S['sunset-beach'] = (x, W, H, t, o) => {
    const m = Math.min(W, H), hz = H * .55, sand = H * .82;
    const sr = m * .2, sx = W * .5;
    x.drawImage(layer(o.state, 'sky', W, H, (p, W, H) => {
      vgrad2(p, 0, 0, W, hz, [[0, col('deep')], [.4, mix('deep', 'purple-ink', .5)], [.75, mix('deep', 'pink-ink', .6)], [1, mix('pink-ink', 'amber-ink', .6)]]);
      glow(p, sx, hz, sr * 3, col('amber', .22), col('amber', 0));
      p.save(); p.beginPath(); p.rect(0, 0, W, hz); p.clip();
      const g = p.createLinearGradient(0, hz - sr, 0, hz); g.addColorStop(0, mix('yellow', 'amber', .3)); g.addColorStop(1, mix('amber', 'pink-ink', .4));
      p.fillStyle = g; p.beginPath(); p.arc(sx, hz, sr, 0, TAU); p.fill();
      p.fillStyle = mix('deep', 'purple-ink', .35, .6);                                 // thin cloud streaks
      [[.15, .22, .3], [.7, .3, .25], [.35, .4, .18], [.82, .12, .2]].forEach(([u, v, w]) => { p.beginPath(); p.ellipse(W * u, H * v, W * w, H * .012, 0, 0, TAU); p.fill(); });
      p.restore();
      vgrad2(p, 0, hz, W, sand - hz, [[0, mix('deep', 'purple-ink', .4)], [1, mix('deep', 'blue-ink', .25)]]);   // the sea
      vgrad2(p, 0, sand, W, H - sand, [[0, mix('amber-ink', 'deep', .7)], [1, mix('amber-ink', 'deep', .88)]]);      // the sand
    }), 0, 0);
    // the sun's path on the water: short strokes that shimmer (slow sway, each fades in and out over seconds)
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const f = (i + .5) / 22, y = hz + (sand - hz) * f * .95, w = sr * (.35 + 1.1 * f) * (.5 + .5 * hash(i + 3));
      const cx = sx + (hash(i + 4) - .5) * sr * .6 * (1 + f) + Math.sin(t * .5 + i) * sr * .08, a = .1 + .22 * breathe(t, 2.5 + 2 * hash(i + 5), i);
      x.fillStyle = col('amber-hi', a * .8 * (1 - f * .5)); x.fillRect(cx - w / 2, y, w, Math.max(1, H * .006));
    }
    x.restore();
    x.strokeStyle = col('amber-hi', .12); x.lineWidth = Math.max(1, H / 300);                // slow swell lines
    for (let k = 0; k < 6; k++) {
      const f = fract(k / 6 + t * .025), y = hz + (sand - hz) * f;
      x.globalAlpha = Math.sin(f * Math.PI); x.beginPath();
      for (let i = 0; i <= 20; i++) { const u = i / 20; x.lineTo(u * W, y + Math.sin(u * 9 + t * .4 + k) * H * .004 * (1 + f * 2)); }
      x.stroke();
    }
    x.globalAlpha = 1;
    const reach = H * .05 * breathe(t, 9, 0);                                               // foam sliding up the sand and back
    x.fillStyle = col('white-hi', .1);
    x.beginPath(); x.moveTo(0, sand - 2);
    for (let i = 0; i <= 24; i++) { const u = i / 24; x.lineTo(u * W, sand + reach * (.6 + .4 * Math.sin(u * 7 + 1)) + Math.sin(u * 23 + t * .3) * H * .004); }
    x.lineTo(W, sand - 2); x.fill();
    x.fillStyle = mix('deep', 'blue-ink', .4, .5); x.fillRect(0, sand - 2, W, 2);
    // the palm: a leaning trunk and fronds on the right, swaying slowly
    const px = W * .88, py = H * 1.0, top = [W * .8, H * .36], sway = Math.sin(t * .5) * .05;
    x.strokeStyle = col('deep'); x.lineCap = 'round'; x.lineWidth = m * .03;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(W * .9, H * .6, top[0], top[1]); x.stroke();
    x.fillStyle = col('deep');
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * .5 + sway * (1 + k % 2), L = m * (.2 + .05 * hash(k + 70)), tx = top[0] + Math.cos(a) * L, ty = top[1] + Math.sin(a) * L * .6 + L * .35;
      x.beginPath(); x.moveTo(top[0], top[1]);
      x.quadraticCurveTo((top[0] + tx) / 2 + Math.cos(a - 1.2) * L * .25, (top[1] + ty) / 2 - L * .3, tx, ty);
      x.quadraticCurveTo((top[0] + tx) / 2, (top[1] + ty) / 2 - L * .1, top[0], top[1]); x.fill();
    }
    x.lineCap = 'butt';
    // birds: soft V shapes gliding slowly across the sky, wings flapping gently (under 1 beat a second)
    x.strokeStyle = col('deep', .8); x.lineWidth = Math.max(1, m / 180);
    for (let i = 0; i < 3; i++) {
      const bxp = (fract(hash(i + 80) + t * (.012 + .006 * i)) * 1.3 - .15) * W, byp = H * (.12 + .1 * i) + Math.sin(t * .3 + i) * H * .015;
      const s = m * (.022 - .004 * i), fl = Math.sin(t * TAU * .7 + i * 2) * s * .35;
      x.beginPath(); x.moveTo(bxp - s, byp - fl); x.quadraticCurveTo(bxp - s * .4, byp - s * .35 - fl * .5, bxp, byp); x.quadraticCurveTo(bxp + s * .4, byp - s * .35 - fl * .5, bxp + s, byp - fl); x.stroke();
    }
  };

  /** still frames: a nice moment of each scene (no lightning, no sputter) */
  S.STILL = {storm: 30, manor: 12, bamboo: 20, ink: 6, vault: 9, temple: 30, arena: 4, rink: 7, stage: 3, track: 2, space: 5, 'night-dojo': 10, 'pixel-night': 3, aurora: 20,
    highway: 4, 'keys-city': 6, city: 8, synthwave: 3, galaxy: 10, records: 2, bubbles: 6, lavalamp: 9, confetti: 5, fireflies: 7, 'diamond-dojo': 10,
    'haunted-hallway': 4, 'twinkle-lights': 6, 'concert-hall': 3, 'sunset-beach': 5, taiko: 4};
  /** tests: every lightning / sputter event between from and to (s): {t, len (s until it has faded), pulses} */
  S.flashes = (scene, from, to) => {
    const st = {};
    if (scene === 'storm') return schedule(st, 'strikes', 4, 6, 9, to).filter(s => s.t >= from && s.t < to).map(s => {
      const tau = STRIKE.tauMin + STRIKE.tauSpread * hash(s.k + 3.1), dbl = hash(s.k + 80) < STRIKE.doubleChance;
      return {t: +s.t.toFixed(2), len: +(STRIKE.rise + tau * Math.log(1 / .05) + (dbl ? STRIKE.doubleGap : 0)).toFixed(2), pulses: dbl ? 2 : 1};
    });
    if (scene === 'stage') return schedule(st, 'sputters', SPUTTER.first, SPUTTER.min, SPUTTER.spread, to).filter(s => s.t >= from && s.t < to).map(s => ({t: +s.t.toFixed(2), len: SPUTTER.len, pulses: SPUTTER.dips}));
    return [];
  };
  S.NAMES = Object.keys(S).filter(k => typeof S[k] === 'function' && !['flashes'].includes(k));
})(window.Arcade);
