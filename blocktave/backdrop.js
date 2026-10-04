/* BLOCKTAVE: THE PARALLAX BACKDROP (Arcade.BlocktaveBackdrop). Behind the world: the sky, then three layers per biome
   that move slower than the world (far, middle, near: rules.js backdrop), and under the ground a cave backdrop.
     REED MARSH        far: misty purple hills + a pale moon / sun, a faint water shimmer at the horizon
                       middle: rows of tall reeds and cattails (the only layer that sways, very slowly)
                       near: dark reed silhouettes · fireflies drift at night
     BRASS MOUNTAINS   far: jagged golden-bronze peaks (warm glints on them at sunrise and sunset)
                       middle: rock formations shaped like bell flares and coiled tubing
                       near: dark rocky ridges
     PERCUSSION CANYON far: layered red-orange canyon walls
                       middle: mesas shaped like drums and stacked cymbals (round tops, rim lines)
                       near: dark canyon edges with rawhide brushes · dust motes drift by day
     UNDERGROUND       dark rock, faint strata lines and a few crystals in the biome's color, its own slow parallax;
                       the Bass Depths and the Treble Peaks show their clef, big and faint.
   DRAW ONCE, MOVE ONLY WHAT MUST MOVE: every layer is drawn ONCE (per screen size) into an offscreen strip that repeats
   sideways; a frame only copies the strips at their offsets. Day and night: the layers are tinted by the sky light
   (darker and bluer at night), stars sit in the far sky at night. Between biomes the two sets cross-fade over the border.
   Reduced motion / MOTION off: the layers still follow the camera (that's position), but nothing sways, drifts or
   twinkles. A slow device (game.js marks it): the far layer only. Colors: theme tokens only (--bt-* in theme.css).
     const bd = Arcade.BlocktaveBackdrop.create({col})        col(token) → a color
     bd.draw(ctx, view)   view = {VW, VH, WPX, S, camX, camY, open(x, y) (an open tile?), day (0 night … 1 day), dusk (0–1: sunrise/sunset), now,
                                  still (no motion), low (far layer only), world, ground(x) (the GENERATED ground row), seed,
                                  layer: the player's layer ('depths' / 'peaks' show their clef)}
     bd.state()           what the last frame drew (tests) */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const BD = () => window.BT_RULES.backdrop;
  const SW = 1200;                                     // a strip repeats every this many CSS px
  const CT = 480;                                      // the cave tile (CSS px, repeats both ways)
  const TAU = Math.PI * 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** a smooth line that repeats every SW px: a few sines with whole periods */
  function wave(r, amp, ks) { const ph = ks.map(() => r() * TAU), am = ks.map(() => .4 + r() * .6); return x => ks.reduce((s, k, i) => s + Math.sin(x / SW * TAU * k + ph[i]) * am[i], 0) / ks.length * amp; }
  /** draw fn at -SW, 0 and +SW so shapes crossing the strip's edge repeat seamlessly */
  const wrap = fn => { fn(-SW); fn(0); fn(SW); };

  function create({col}) {
    let size = '', strips = {}, caves = {}, clefs = {}, last = {};
    const mk = (w, h, WPX) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * WPX)); c.height = Math.max(1, Math.round(h * WPX)); const g = c.getContext('2d'); g.scale(WPX, WPX); return {c, g}; };

    /* ---------- THE ART (each function draws one layer into its strip, SW × SH CSS px; horizon at H0) ---------- */
    const ART = {
      marsh: {
        far(g, SH, H0, r) {
          g.fillStyle = col('bt-marsh-moon'); g.globalAlpha = .55;
          g.beginPath(); g.arc(SW * .72, H0 * .32, 30, 0, TAU); g.fill(); g.globalAlpha = .12; g.beginPath(); g.arc(SW * .72, H0 * .32, 52, 0, TAU); g.fill();
          g.globalAlpha = 1;
          const back = wave(r, 46, [2, 3, 5]), front = wave(r, 30, [3, 4, 7]);
          ridge(g, SH, x => H0 - 70 + back(x), col('bt-marsh-far-2'));
          ridge(g, SH, x => H0 - 30 + front(x), col('bt-marsh-far'));
          g.fillStyle = col('bt-marsh-mist');                              // mist bands
          [[H0 - 44, .10, 26], [H0 - 8, .14, 18]].forEach(([y, a, h]) => { g.globalAlpha = a; g.fillRect(0, y, SW, h); });
          g.globalAlpha = .35; g.fillStyle = col('bt-marsh-water'); g.fillRect(0, H0 + 6, SW, 3);   // the water line
          g.globalAlpha = 1;
        },
        mid(g, SH, H0, r) {
          const base = H0 + 60;
          g.fillStyle = col('bt-marsh-mid'); g.fillRect(0, base, SW, SH - base);
          for (let k = 0; k < 150; k++) {                                  // reeds: thin blades
            const x = r() * SW, h = 70 + r() * 90, lean = (r() - .5) * 14;
            wrap(dx => { g.strokeStyle = col('bt-marsh-mid'); g.lineWidth = 3; g.beginPath(); g.moveTo(x + dx, base + 4); g.quadraticCurveTo(x + dx + lean * .3, base - h * .6, x + dx + lean, base - h); g.stroke(); });
            if (k % 5 === 0) wrap(dx => { g.fillStyle = col('bt-marsh-cat'); g.beginPath(); g.ellipse(x + dx + lean * .92, base - h * .9, 4, 11, lean / 80, 0, TAU); g.fill(); });   // a cattail
          }
        },
        near(g, SH, H0, r) {
          const base = H0 + 150, w = wave(r, 18, [3, 5]);
          ridge(g, SH, x => base + w(x), col('bt-marsh-near'));
          for (let k = 0; k < 70; k++) {
            const x = r() * SW, h = 90 + r() * 140, lean = (r() - .5) * 26;
            wrap(dx => { g.strokeStyle = col('bt-marsh-near'); g.lineWidth = 6; g.beginPath(); g.moveTo(x + dx, base + w(x) + 10); g.quadraticCurveTo(x + dx + lean * .2, base - h * .5, x + dx + lean, base - h); g.stroke(); });
          }
        },
      },
      brass: {
        far(g, SH, H0, r, peaks) {
          const pts = []; for (let x = 0; x < SW; x += 40 + r() * 50) pts.push([x, H0 - 40 - r() * 150]);
          const tall = pts.slice().sort((a, b) => a[1] - b[1]).slice(0, 5); tall.forEach(p => peaks.push(p));
          wrap(dx => { g.fillStyle = col('bt-brass-far'); g.beginPath(); g.moveTo(dx, SH); pts.forEach(([x, y]) => g.lineTo(x + dx, y)); g.lineTo(dx + SW, pts[0][1]); g.lineTo(dx + SW, SH); g.fill(); });
          // the lit faces: each peak's left slope a little lighter
          wrap(dx => { g.fillStyle = col('bt-brass-far-2'); g.globalAlpha = .55;
            for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (y1 < y0) { g.beginPath(); g.moveTo(x0 + dx, y0); g.lineTo(x1 + dx, y1); g.lineTo(x1 + dx, y1 + (y0 - y1) * .9 + 30); g.fill(); } }
            g.globalAlpha = 1; });
        },
        mid(g, SH, H0, r) {
          const base = H0 + 70, w = wave(r, 14, [2, 4]);
          ridge(g, SH, x => base + w(x), col('bt-brass-mid'));
          for (let k = 0; k < 5; k++) {                                    // bell flares standing in the rock
            const x = (k + .2 + r() * .5) * SW / 5, h = 90 + r() * 50, wb = 34 + r() * 16;
            wrap(dx => {
              const X = x + dx, Y = base + w(x) + 6;
              g.fillStyle = col('bt-brass-mid'); g.beginPath();
              g.moveTo(X - 9, Y); g.lineTo(X - 9, Y - h * .55); g.quadraticCurveTo(X - 10, Y - h * .85, X - wb, Y - h); g.lineTo(X + wb, Y - h); g.quadraticCurveTo(X + 10, Y - h * .85, X + 9, Y - h * .55); g.lineTo(X + 9, Y); g.fill();
              g.strokeStyle = col('bt-brass-mid-hi'); g.globalAlpha = .45; g.lineWidth = 3; g.beginPath(); g.moveTo(X - wb, Y - h); g.lineTo(X + wb, Y - h); g.stroke(); g.globalAlpha = 1;
            });
          }
          for (let k = 0; k < 4; k++) {                                    // coiled tubing: thick loops
            const x = (k + .65) * SW / 4 + r() * 40, y = base - 30 - r() * 30, rr = 24 + r() * 14;
            wrap(dx => { g.strokeStyle = col('bt-brass-mid'); g.lineWidth = 14; g.beginPath(); g.ellipse(x + dx, y, rr, rr * .75, 0, 0, TAU); g.stroke();
              g.strokeStyle = col('bt-brass-mid-hi'); g.globalAlpha = .35; g.lineWidth = 3; g.beginPath(); g.ellipse(x + dx, y - 3, rr, rr * .75, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.globalAlpha = 1; });
          }
        },
        near(g, SH, H0, r) {
          const pts = []; for (let x = 0; x < SW; x += 24 + r() * 40) pts.push([x, H0 + 120 + r() * 60]);
          wrap(dx => { g.fillStyle = col('bt-brass-near'); g.beginPath(); g.moveTo(dx, SH); pts.forEach(([x, y]) => g.lineTo(x + dx, y)); g.lineTo(dx + SW, pts[0][1]); g.lineTo(dx + SW, SH); g.fill(); });
        },
      },
      canyon: {
        far(g, SH, H0, r) {
          [['bt-canyon-far-2', H0 - 150, 50], ['bt-canyon-far', H0 - 90, 40], ['bt-canyon-far-3', H0 - 40, 26]].forEach(([c, y0, amp]) => {
            const steps = []; let x = 0; while (x < SW) { const w = 60 + r() * 120; steps.push([x, y0 + (r() - .5) * amp]); x += w; }
            wrap(dx => { g.fillStyle = col(c); g.beginPath(); g.moveTo(dx, SH); steps.forEach(([sx, sy], i) => { const nx = i + 1 < steps.length ? steps[i + 1][0] : SW; g.lineTo(sx + dx, sy); g.lineTo(nx + dx - 6, sy); }); g.lineTo(dx + SW, steps[0][1]); g.lineTo(dx + SW, SH); g.fill(); });
          });
          g.strokeStyle = col('bt-canyon-far-3'); g.globalAlpha = .3; g.lineWidth = 2;   // strata
          for (let k = 0; k < 6; k++) { const y = H0 - 130 + k * 22; g.beginPath(); g.moveTo(0, y); g.lineTo(SW, y + 4); g.stroke(); }
          g.globalAlpha = 1;
        },
        mid(g, SH, H0, r) {
          const base = H0 + 80;
          g.fillStyle = col('bt-canyon-mid'); g.fillRect(0, base, SW, SH - base);
          for (let k = 0; k < 6; k++) {
            const x = (k + .3 + r() * .4) * SW / 6, drum = k % 2 === 0;
            wrap(dx => {
              const X = x + dx;
              if (drum) {                                                  // a drum-shaped mesa: a cylinder, a rim, its head
                const w = 70 + r() * 30, h = 70 + r() * 40, top = base - h;
                g.fillStyle = col('bt-canyon-mid'); g.fillRect(X - w, top, w * 2, h + 2);
                g.beginPath(); g.ellipse(X, top, w, w * .22, 0, 0, TAU); g.fill();
                g.strokeStyle = col('bt-canyon-rim'); g.globalAlpha = .5; g.lineWidth = 3;
                g.beginPath(); g.ellipse(X, top, w, w * .22, 0, 0, TAU); g.stroke();
                g.beginPath(); g.moveTo(X - w, top + h * .35); g.lineTo(X + w, top + h * .35); g.stroke(); g.globalAlpha = 1;
              } else {                                                     // stacked cymbals: thin discs on a stand of rock
                const n = 3, w = 44 + r() * 20;
                g.fillStyle = col('bt-canyon-mid'); g.fillRect(X - 6, base - 90, 12, 92);
                for (let i = 0; i < n; i++) { const y = base - 92 - i * 18, ww = w - i * 8;
                  g.fillStyle = col('bt-canyon-mid'); g.beginPath(); g.ellipse(X, y, ww, 7, 0, 0, TAU); g.fill();
                  g.strokeStyle = col('bt-canyon-rim'); g.globalAlpha = .45; g.lineWidth = 2; g.beginPath(); g.ellipse(X, y, ww, 7, 0, Math.PI, TAU); g.stroke(); g.globalAlpha = 1; }
              }
            });
          }
        },
        near(g, SH, H0, r) {
          const base = H0 + 160, w = wave(r, 26, [2, 5]);
          ridge(g, SH, x => base + w(x) + (Math.sin(x / SW * TAU * 2) > .55 ? -70 : 0), col('bt-canyon-near'));
          for (let k = 0; k < 18; k++) {                                   // rawhide brushes: little tufts on the edge
            const x = r() * SW, y = base + w(x) + (Math.sin(x / SW * TAU * 2) > .55 ? -70 : 0);
            wrap(dx => { g.strokeStyle = col('bt-canyon-brush'); g.globalAlpha = .55; g.lineWidth = 2;
              for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + dx, y + 2); g.lineTo(x + dx + i * 4, y - 12 - Math.abs(i) * -1); g.stroke(); }
              g.globalAlpha = 1; });
          }
        },
      },
    };
    /** a filled shape under a repeating line y(x), down to the strip's bottom */
    function ridge(g, SH, y, color) {
      g.fillStyle = color;
      wrap(dx => { g.beginPath(); g.moveTo(dx, SH); for (let x = 0; x <= SW; x += 12) g.lineTo(x + dx, y(x)); g.lineTo(dx + SW, SH); g.closePath(); g.fill(); });
    }
    const SEED = {marsh: 11, brass: 23, canyon: 37};
    const CRYSTAL = {marsh: 'bt-moss', brass: 'bt-brass', canyon: 'bt-clay-2'};
    function stripsFor(biome, v) {
      const key = `${v.VW}x${v.VH}@${v.WPX}`;
      if (key !== size) { size = key; strips = {}; caves = {}; clefs = {}; }
      if (strips[biome]) return strips[biome];
      const SH = Math.round(v.VH * 1.25), H0 = Math.round(SH * .55), r = rng(SEED[biome]), out = {SH, H0, peaks: []};
      ['far', 'mid', 'near'].forEach(L => { const s = mk(SW, SH, v.WPX); ART[biome][L](s.g, SH, H0, r, out.peaks); out[L] = s.c; });
      return (strips[biome] = out);
    }
    /** a strip's layer with the night tint (a copy redone only when the tint changes) */
    function tinted(st, L, tint) {
      if (!tint) return st[L];
      const k = 't' + L;
      if (st[k] && st[k].tint === tint) return st[k].c;
      const c = st[k] ? st[k].c : document.createElement('canvas');
      c.width = st[L].width; c.height = st[L].height;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height); g.drawImage(st[L], 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = tint; g.fillStyle = col('bt-bg-night'); g.fillRect(0, 0, c.width, c.height);
      st[k] = {c, tint};
      return c;
    }
    function caveFor(biome, v) {
      if (caves[biome]) return caves[biome];
      const s = mk(CT, CT, v.WPX), g = s.g, r = rng(SEED[biome] + 5);   // one tile, then copied 2 × 2 below
      g.fillStyle = col('bt-cave-rock'); g.fillRect(0, 0, CT, CT);
      g.fillStyle = col('bt-cave-rock-2');
      for (let k = 0; k < 26; k++) { const x = r() * CT, y = r() * CT, w = 30 + r() * 70; const dr = (dx, dy) => { g.beginPath(); g.ellipse(x + dx, y + dy, w, w * .4, 0, 0, TAU); g.fill(); }; [-CT, 0, CT].forEach(dx => [-CT, 0, CT].forEach(dy => dr(dx, dy))); }
      g.strokeStyle = col('bt-cave-strata'); g.lineWidth = 2; g.globalAlpha = .6;      // strata lines (repeat every CT)
      for (let k = 0; k < 7; k++) { const y0 = (k + .5) * CT / 7, a = 4 + r() * 6, ph = r() * TAU; g.beginPath(); for (let x = 0; x <= CT; x += 16) g.lineTo(x, y0 + Math.sin(x / CT * TAU * 2 + ph) * a); g.stroke(); }
      g.globalAlpha = .55; g.fillStyle = col(CRYSTAL[biome]);                       // a few crystals
      for (let k = 0; k < 5; k++) { const x = 30 + r() * (CT - 60), y = 30 + r() * (CT - 60), h = 10 + r() * 14;
        for (let i = 0; i < 3; i++) { const ox = (i - 1) * 7, hh = h * (i === 1 ? 1 : .65); g.beginPath(); g.moveTo(x + ox - 4, y); g.lineTo(x + ox, y - hh); g.lineTo(x + ox + 4, y); g.fill(); } }
      g.globalAlpha = 1;
      const big = document.createElement('canvas'); big.width = s.c.width * 2; big.height = s.c.height * 2;
      const bg = big.getContext('2d'); [0, 1].forEach(i => [0, 1].forEach(j => bg.drawImage(s.c, i * s.c.width, j * s.c.height)));
      return (caves[biome] = big);
    }
    /** a big, faint clef (the Bass Depths / the Treble Peaks), drawn once */
    function clefFor(kind, v) {
      if (clefs[kind]) return clefs[kind];
      const s = mk(260, 320, v.WPX), g = s.g;
      g.fillStyle = col('bt-clef-hint'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${kind === 'bass' ? 220 : 260}px "GN Music", serif`;
      g.fillText(kind === 'bass' ? '𝄢' : '𝄞', 130, kind === 'bass' ? 150 : 175);
      return (clefs[kind] = s.c);
    }

    /* ---------- A FRAME ---------- */
    function draw(ctx, v) {
      const D = BD(), R = window.BT_RULES, S = v.S, VW = v.VW, VH = v.VH;
      v.ctx = ctx;
      const camPX = v.camX * S, camPY = v.camY * S;
      // which biome(s): the camera's middle column, cross-fading over each border's blend columns
      const cx = v.camX + VW / S / 2, set = [];
      const bi = R.biomes, here = bi.find(b => cx >= b.from && cx < b.to) || bi[bi.length - 1], k = bi.indexOf(here);
      const across = border => Math.max(0, Math.min(1, .5 + (cx - border) / D.blend / 2));   // 0 = blend columns left of the border … 1 = right
      if (k > 0 && cx - here.from < D.blend) { const t = smooth(across(here.from)); set.push([bi[k - 1].id, 1 - t], [here.id, t]); }
      else if (k < bi.length - 1 && here.to - cx < D.blend) { const t = smooth(across(here.to)); set.push([here.id, 1 - t], [bi[k + 1].id, t]); }
      else set.push([here.id, 1]);
      // the layers' offsets (CSS px): sideways camPX × speed; up and down camPY × vertical, around the usual surface view
      const ref = (R.world.surface - VH / S * .55) * S;
      const layers = v.low ? ['far'] : ['far', 'mid', 'near'];
      const off = {};
      layers.forEach(L => { off[L] = {x: camPX * D[L], y: (camPY - ref) * D.vertical}; });
      ctx.save();
      ctx.imageSmoothingEnabled = false;                                  // 1:1 copies (the strips are drawn at the canvas's own pixel size)
      const snap = n => Math.round(n * v.WPX) / v.WPX;
      // THE SKY (opaque: nothing is cleared), then the stars at night
      const gr = ctx.createLinearGradient(0, 0, 0, VH);
      gr.addColorStop(0, mixc(col('bt-sky-night'), col('bt-sky-day'), v.day));
      gr.addColorStop(1, mixc(col('bt-sky-night-2'), col('bt-sky-day-2'), v.day));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      if (v.day < .8) {
        ctx.globalAlpha = (1 - v.day) * .8; ctx.fillStyle = col('bt-star');
        for (let i = 0; i < 46; i++) { const sx = mod(((i * 97.3 + v.seed % 97) % 100) / 100 * VW * 1.5 - camPX * D.far * .6, VW), sy = ((i * 41.7) % 60) / 100 * VH * .6; ctx.fillRect(sx, sy, 2, 2); }
      }
      // THE LAYERS, tinted by the sky light (darker and bluer at night): each strip keeps a tinted copy, redone only when
      // the tint changes by a step (dusk and dawn), so a frame only copies pictures
      const night = 1 - v.day, tint = Math.round(night * D.nightTint * 20) / 20;
      const sway = !v.still && !v.low ? Math.sin(v.now / 1000 / D.swayS * TAU) * D.swayPx : 0;
      set.forEach(([id, a]) => {
        if (a <= 0.001) return;
        const st = stripsFor(id, v), top = -(st.SH - VH) / 2;
        layers.forEach(L => {
          const pic = tinted(st, L, tint), o = off[L], y = snap(top - Math.max(-(st.SH - VH) / 2, Math.min((st.SH - VH) / 2, o.y))), x0 = snap(-mod(o.x, SW));
          ctx.globalAlpha = a;
          if (L === 'mid' && id === 'marsh' && sway) {                       // the reeds sway: the top slices most
            const n = 4, sh = st.SH / n;
            for (let i = 0; i < n; i++) { const dx = snap(sway * (1 - i / n)); for (let x = x0 + dx; x < VW; x += SW) ctx.drawImage(pic, 0, i * sh * v.WPX, pic.width, sh * v.WPX, x, y + i * sh, SW, sh); }
          } else for (let x = x0; x < VW; x += SW) ctx.drawImage(pic, x, y, SW, st.SH);
          if (L === 'far') farBits(ctx, id, st, x0, y, a, v);
        });
      });
      ctx.globalAlpha = 1;
      // living bits in front of the tint (drift only with motion): fireflies at night, dust by day, warm glints at dusk
      set.forEach(([id, a]) => { if (a > .01 && !v.low) liveBits(ctx, id, a, v, off); });
      // UNDER THE GROUND: the cave backdrop, fading in over caveDepth rows below each column's ground
      const cave = drawCave(ctx, set, v, camPX, camPY);
      ctx.restore();
      last = {cam: {x: camPX, y: camPY}, biomes: set.map(([id, a]) => ({id, a: +a.toFixed(3)})), offsets: off, layers, low: !!v.low, sway, cave, still: !!v.still,
        night: tint, strips: Object.keys(strips), clef: cave.clef};
    }
    function farBits(ctx, id, st, x0, y, a, v) {
      if (id === 'brass' && v.dusk > 0.01) {                             // warm glints on the peaks at sunrise and sunset
        ctx.save(); ctx.globalAlpha = a * v.dusk * .8; ctx.fillStyle = col('bt-brass-glint');
        st.peaks.forEach(([px, py]) => { for (let x = x0 + px; x < v.VW + 20; x += SW) { ctx.beginPath(); ctx.arc(x, y + py + 4, 5, 0, TAU); ctx.fill(); ctx.globalAlpha = a * v.dusk * .25; ctx.beginPath(); ctx.arc(x, y + py + 4, 14, 0, TAU); ctx.fill(); ctx.globalAlpha = a * v.dusk * .8; } });
        ctx.restore();
      }
    }
    function liveBits(ctx, id, a, v, off) {
      const D = BD(), t = v.still ? 0 : v.now / 1000, VW = v.VW, VH = v.VH;
      if (id === 'marsh' && v.day < .6) {                                 // fireflies (night): a soft glow, slow drift, no blinking
        ctx.fillStyle = col('bt-firefly');
        for (let i = 0; i < D.fireflies; i++) {
          const bx = mod(i * 173.7 - off.mid.x * 1 + Math.sin(t * .23 + i) * 30, VW), by = VH * (.45 + (i * 37 % 40) / 100) + Math.cos(t * .19 + i * 2) * 18;
          const glow = (.55 + .45 * Math.sin(t * .6 + i * 1.7)) * (1 - v.day) * a;        // ≤ 0.1 Hz-ish fades, never a flash
          ctx.globalAlpha = glow * .25; ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
          ctx.globalAlpha = glow; ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
        }
      }
      if (id === 'marsh' && !v.still) {                                   // the water's shimmer at the horizon: short dashes sliding
        const st = strips.marsh; if (st) {
          const y = -(st.SH - VH) / 2 - Math.max(-(st.SH - VH) / 2, Math.min((st.SH - VH) / 2, off.far.y)) + st.H0 + 7;
          ctx.fillStyle = col('bt-marsh-water');
          for (let i = 0; i < 14; i++) { const x = mod(i * 97 - off.far.x + t * 6, VW); ctx.globalAlpha = a * (.18 + .12 * Math.sin(t * .8 + i)); ctx.fillRect(x, y, 14, 1.5); }
        }
      }
      if (id === 'canyon' && v.day > .5) {                                // dust motes in the daytime
        ctx.fillStyle = col('bt-dust');
        for (let i = 0; i < D.motes; i++) {
          const x = mod(i * 211.3 + t * (10 + i % 5 * 3) - off.mid.x, VW), y = VH * (.3 + (i * 53 % 50) / 100) + Math.sin(t * .4 + i) * 10;
          ctx.globalAlpha = a * v.day * .35; ctx.fillRect(x, y, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    /* the cave backdrop is copied only behind OPEN tiles under the GENERATED ground (v.ground: world.js w.ground, fixed
       whatever the player digs, so a shaft or a mined tunnel shows cave rock, never the outside layers; the rock tiles hide
       the rest): one small 1:1 copy per tile from the cave texture (2 × 2 copies of the tile, so every tile-sized piece is
       one rectangle), fading in over the caveDepth rows under each column's generated ground */
    function drawCave(ctx, set, v, camPX, camPY) {
      const D = BD(), R = window.BT_RULES, S = v.S, W = v.WPX, x0 = Math.floor(v.camX), y0 = Math.floor(v.camY);
      const cols = Math.ceil(v.VW / S) + 2, rows = Math.ceil(v.VH / S) + 2, depth = R.light.caveDepth;
      const ox = camPX * D.cave, oy = camPY * D.cave, out = {drawn: false, tiles: 0, clef: null, offset: {x: ox, y: oy}};
      const tiles = [];
      for (let i = 0; i < cols; i++) {
        const x = x0 + i; if (x < 0 || x >= v.world.w) continue;
        const t = v.ground ? v.ground(x) : v.top(x);                        // the GENERATED ground: digging never moves it
        for (let j = Math.max(0, t + 1 - y0); j < rows; j++) {
          const y = y0 + j; if (y >= v.world.h) break;
          if (v.open(x, y)) tiles.push([(x - v.camX) * S, (y - v.camY) * S, y - t, x, y]);
        }
      }
      if (tiles.length) {
        out.drawn = true; out.tiles = tiles.length; out.cells = tiles;
        set.forEach(([id, a]) => {
          if (a <= .001) return;
          const c = caveFor(id, v);
          tiles.forEach(([X, Y, b]) => {
            ctx.globalAlpha = a * (b < depth ? (b + .5) / depth : 1);
            const sx = mod(X + ox, CT), sy = mod(Y + oy, CT);
            ctx.drawImage(c, Math.round(sx * W), Math.round(sy * W), Math.round(S * W), Math.round(S * W), X, Y, S, S);
          });
        });
      }
      // the deep layers' clef, big and faint (far parallax)
      const kind = v.layer === 'depths' ? 'bass' : v.layer === 'peaks' ? 'treble' : null, deep = kind === 'bass';
      if (kind) {
        const c = clefFor(kind, v), into = deep ? Math.min(1, (v.camY + v.VH / S - R.world.deepY) / 10) : Math.min(1, Math.max(.4, (R.world.peaksY - v.camY) / 10));
        ctx.globalAlpha = D.clefAlpha * into;
        const cx = v.VW * 1.6 - mod(camPX * D.far, v.VW * 2.2), cy = v.VH * .45;   // wraps round off screen
        ctx.drawImage(c, cx - 130, cy - 160, 260, 320);
        out.clef = kind;
      }
      ctx.globalAlpha = 1;
      return out;
    }
    // (state().cave.at: the tiles the cave was drawn behind last frame, as "x,y" (tests; built only when asked))
    return {draw, state: () => Object.assign({}, last, last.cave ? {cave: Object.assign({}, last.cave, {cells: undefined, at: (last.cave.cells || []).map(c => c[3] + ',' + c[4])})} : {}), reset() { size = ''; }};
  }
  const mod = (a, n) => ((a % n) + n) % n;
  const smooth = t => t * t * (3 - 2 * t);
  function parse(c) { const m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16)); const r = /rgba?\(([^)]+)\)/.exec(c); return r ? r[1].split(',').slice(0, 3).map(Number) : null; }
  function mixc(a, b, t) { const pa = parse(a), pb = parse(b); if (!pa || !pb) return t > .5 ? b : a; return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`; }
  A.BlocktaveBackdrop = {create, SW, CT};
})(window.Arcade);
