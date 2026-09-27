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

  /* ARCADE QUEST (title screen): an 8-bit night sky, twinkling pixel stars, a castle silhouette in pixel art */
  S['pixel-night'] = (x, W, H, t, o) => {
    const st = o.state, pw = 160, ph = Math.max(60, Math.round(pw * H / W));
    if (!st.c || st.c.height !== ph) { st.c = document.createElement('canvas'); st.c.width = pw; st.c.height = ph; }
    const p = st.c.getContext('2d');
    const bands = ['q-void', 'q-void', 'q-purple-d', 'q-blue-d'];
    for (let y = 0; y < ph; y++) for (let xx = 0; xx < pw; xx += 1) {          // the sky: bands with a checker dither where they meet
      const f = y / ph * (bands.length - 1), b = Math.floor(f), frac = f - b, up = ((xx + y) % 2) && frac > .5 ? 1 : 0;
      p.fillStyle = col(bands[Math.min(bands.length - 1, b + up)]); p.fillRect(xx, y, 1, 1);
    }
    p.fillStyle = col('q-black', .3); p.fillRect(0, 0, pw, ph);                      // keep it dark (the castle still stands out)
    for (let i = 0; i < 60; i++) {
      const sx = Math.floor(hash(i) * pw), sy = Math.floor(hash(i + 9) * ph * .6), on = hash(i * 3 + Math.floor(t * .7 + hash(i) * 5)) > .25;
      if (on) { p.fillStyle = col('q-white', .35 + .3 * hash(i + 2)); p.fillRect(sx, sy, 1, 1); }
    }
    const mx = Math.floor(pw * .18), my = Math.floor(ph * .18);                      // a pixel crescent moon
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16 && (dx - 2) * (dx - 2) + (dy + 1) * (dy + 1) > 12) { p.fillStyle = col('q-moon', .75); p.fillRect(mx + dx, my + dy, 1, 1); }
    p.fillStyle = mix('q-green-d', 'q-black', .55);                  // hills
    for (let hx = 0; hx < pw; hx++) { const hy = ph * .82 + Math.sin(hx * .07) * 3 + Math.sin(hx * .19) * 1.5; p.fillRect(hx, Math.floor(hy), 1, ph); }
    const cx = Math.floor(pw * .72), base = Math.floor(ph * .8);  // the castle, to the right
    p.fillStyle = col('q-black');
    [[0, 26, 20], [-8, 34, 6], [20, 34, 6], [6, 40, 7]].forEach(([dx, hgt, w]) => {
      p.fillRect(cx + dx, base - hgt, w, hgt);
      for (let k = 0; k < w; k += 2) p.fillRect(cx + dx + k, base - hgt - 2, 1, 2);
    });
    if (Math.floor(t * .5) % 4 !== 3) { p.fillStyle = col('q-gold', .8); p.fillRect(cx + 9, base - 32, 1, 2); p.fillRect(cx + 4, base - 16, 2, 2); }
    x.imageSmoothingEnabled = false; x.drawImage(st.c, 0, 0, W, H); x.imageSmoothingEnabled = true;
  };

  /* THE NOTE CHECKER: a calm, slow, soft aurora (very little motion: students are tuning) */
  S.aurora = (x, W, H, t, o) => {
    vgrad(x, W, H, [[0, col('deep')], [1, col('night')]]);
    for (let i = 0; i < 50; i++) { x.fillStyle = col('white-hi', .15 + .1 * hash(i + 1)); x.fillRect(hash(i) * W, hash(i + 5) * H * .7, Math.max(1, W / 900), Math.max(1, W / 900)); }
    const st = o.state, pw = 120, ph = Math.max(40, Math.round(pw * H / W));
    if (!st.c || st.c.height !== ph) { st.c = document.createElement('canvas'); st.c.width = pw; st.c.height = ph; }
    const p = st.c.getContext('2d'); p.clearRect(0, 0, pw, ph);
    [['green', .3, .22, 0], ['cyan', .22, .3, 2], ['purple', .18, .18, 4]].forEach(([c, a, by, ph0]) => {
      for (let px = 0; px < pw; px++) {
        const u = px / pw, y = ph * by + Math.sin(u * 5 + t * .05 + ph0) * ph * .06 + Math.sin(u * 13 + t * .03 + ph0) * ph * .02;
        const h = ph * (.14 + .06 * Math.sin(u * 7 + t * .04 + ph0)), g = p.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, col(c, 0)); g.addColorStop(1, col(c, a * (.6 + .4 * Math.sin(u * 3 + t * .06 + ph0))));
        p.fillStyle = g; p.fillRect(px, y - h, 1, h);
      }
    });
    x.save(); x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true; x.drawImage(st.c, 0, 0, W, H); x.restore();
  };

  /** still frames: a nice moment of each scene (no lightning, no sputter) */
  S.STILL = {storm: 30, manor: 12, bamboo: 20, ink: 6, vault: 9, temple: 30, arena: 4, rink: 7, stage: 3, track: 2, space: 5, 'night-dojo': 10, 'pixel-night': 3, aurora: 20};
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
