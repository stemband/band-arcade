/* Sustain Speedway: THE CARS, drawn in 2D from behind (a canvas; no pictures). Arcade.SpeedwayCars.
   Every car = a BODY (its own silhouette and details) + a PAINT (a color string) + a DECAL (+ a number).
   Each car is drawn ONCE per body, paint, decal, size bucket, sky color and brake-light state into its own small
   canvas (a SPRITE: gradients, shine, shadow, tail-light halos all baked in), then only copied each frame, so four cars
   cost four drawImage calls on an old iPad. Only what moves is drawn per frame: the Dune Buggy's bounce, the Hover
   Racer's thruster shimmer, nitro flames (none of the moving parts with reduced motion).
   Units: everything below is in CAR WIDTHS: x from -.5 (left) to .5 (right), y up is negative, 0 = the road.
   Colors: theme tokens only (--sw-* in theme.css), resolved when a sprite is built.
     draw(ctx, x, y, w, o)   o = {body, color, decal, number, sky, braking, alpha, t (ms), reduced, nitro, dpr}
     sprite(o)               the cached sprite {cv, ax, ay, k} (tests)     thumbURL(o, w)   a still picture (the garage)
     BODIES, EXHAUSTS, stats() */
(function (A) {
  "use strict";
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const BODY_IDS = ['coupe', 'mini', 'muscle', 'wagon', 'buggy', 'openwheel', 'hover', 'maestro'];
  // where the exhausts are (nitro flames come out of them), per body, in car widths
  const EXHAUSTS = {coupe: [[-.22, -.075], [.22, -.075]], mini: [[-.14, -.07], [.14, -.07]], muscle: [[-.3, -.07], [-.24, -.07], [.24, -.07], [.3, -.07]],
    wagon: [[-.26, -.07], [.26, -.07]], buggy: [[-.1, -.2], [.1, -.2]], openwheel: [[0, -.1]], maestro: [[0, -.1]], hover: [[-.25, -.16], [.25, -.16]]};
  const HOVER_LIFT = .07;

  /* ---------- colors ---------- */
  const probe = document.createElement('canvas').getContext('2d');
  const rgbOf = c => {                                   // any CSS color → [r, g, b]
    probe.fillStyle = '#000'; probe.fillStyle = c || '#888';
    const s = probe.fillStyle;
    if (s[0] === '#') { const n = parseInt(s.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = s.match(/[\d.]+/g) || [128, 128, 128]; return [+m[0], +m[1], +m[2]];
  };
  const mix = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
  const alpha = (c, a) => { const x = rgbOf(c); return `rgba(${x.join(',')},${a})`; };
  let T = null;                                          // the theme's car tokens (read once)
  const tokens = () => T || (T = {tire: css('sw-tire'), tread: css('sw-tread'), chrome: css('sw-chrome'), glass: css('sw-glass'), tail: css('sw-tail'),
    plate: css('sw-plate'), plateInk: css('sw-plate-ink'), gold: css('sw-gold'), flame1: css('sw-flame-1'), flame2: css('sw-flame-2'),
    white: css('white-hi'), deep: css('deep'), nitro: css('sw-nitro'), star: css('yellow-hi'), bolt: css('yellow')});

  /* ---------- the pieces every car shares (unit coordinates) ---------- */
  function path(x, pts) { x.beginPath(); pts.forEach((p, i) => (p.length > 2 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); }
  const P2 = pts => { const p = new Path2D(); pts.forEach((q, i) => (q.length > 2 ? p.quadraticCurveTo(q[0], q[1], q[2], q[3]) : i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  function rrect(x, l, t, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(l, t, w, h, r) : x.rect(l, t, w, h); }
  function shadow(x, rx, ry, dy = 0) {
    const g = x.createRadialGradient(0, dy, 0, 0, dy, rx);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.7, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.scale(1, ry / rx); x.fillStyle = g; x.fillRect(-rx, dy * rx / ry - rx, rx * 2, rx * 2); x.restore();
  }
  /** a tire from behind: rounded, darker at its edges, tread lines, a chrome rim edge on the outside (knobby: bumps) */
  function tire(x, K, l, t, w, h, side, knobby) {
    const g = x.createLinearGradient(l, 0, l + w, 0);
    g.addColorStop(0, mix(K.tire, '#000', .4)); g.addColorStop(.35, mix(K.tire, K.tread, .8)); g.addColorStop(.65, mix(K.tire, K.tread, .8)); g.addColorStop(1, mix(K.tire, '#000', .4));
    rrect(x, l, t, w, h, Math.min(w, h) * .32); x.fillStyle = g; x.fill();
    x.strokeStyle = alpha(K.chrome, .16); x.lineWidth = .006;
    for (let yy = t + h * .14; yy < t + h * .92; yy += h * .16) { x.beginPath(); x.moveTo(l + w * .12, yy); x.lineTo(l + w * .88, yy); x.stroke(); }
    if (knobby) {
      x.fillStyle = K.tire;
      for (let yy = t + h * .08; yy < t + h; yy += h * .18) { x.fillRect(l - w * .08, yy, w * .1, h * .09); x.fillRect(l + w * .98, yy, w * .1, h * .09); }
    }
    const rx = side < 0 ? l + w * .1 : l + w * .9;       // the rim's edge, on the outer side
    x.strokeStyle = alpha(K.chrome, .75); x.lineWidth = .01; x.beginPath(); x.moveTo(rx, t + h * .2); x.lineTo(rx, t + h * .8); x.stroke();
  }
  /** a vertical gradient fill: a lighter top edge, the paint, darker lower sides */
  function paint(x, pal, top, bot) {
    const g = x.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, pal.light); g.addColorStop(.3, pal.paint); g.addColorStop(.75, pal.paint); g.addColorStop(1, pal.dark);
    return g;
  }
  function shine(x, pal, pts) {                         // the bright highlight line along the roof / shoulders
    x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = alpha(pal.sky, .5); x.lineWidth = .02; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1] - .004) : x.moveTo(p[0], p[1] - .004))); x.stroke();   // the rim light (the sky)
    x.strokeStyle = alpha('#fff', .7); x.lineWidth = .009; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1] + .008) : x.moveTo(p[0], p[1] + .008))); x.stroke();
    x.restore();
  }
  function glass(x, K, pts) {
    const ys = pts.map(p => p[1]), g = x.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, mix(K.glass, '#fff', .35)); g.addColorStop(1, mix(K.glass, '#000', .3));
    path(x, pts); x.fillStyle = g; x.fill();
    const l = Math.min(...pts.map(p => p[0])), r = Math.max(...pts.map(p => p[0])), t = Math.min(...ys), b = Math.max(...ys);   // a reflection streak
    x.save(); path(x, pts); x.clip(); x.strokeStyle = alpha('#fff', .22); x.lineWidth = (r - l) * .12;
    x.beginPath(); x.moveTo(l + (r - l) * .25, b); x.lineTo(l + (r - l) * .55, t); x.stroke(); x.restore();
  }
  /** tail lights: a soft halo (brighter while braking) + the lamp; shape 'r' rect [l, t, w, h] or 'o' circle [cx, cy, r] */
  function tail(x, K, lights, braking) {
    const hot = braking ? mix(K.tail, '#fff', .45) : K.tail;
    lights.forEach(([kind, a, b, c, d]) => {
      const cx = kind === 'o' ? a : a + c / 2, cy = kind === 'o' ? b : b + d / 2, rad = (kind === 'o' ? c * 2.2 : Math.min(Math.max(c, d) * .95, .14)) * (braking ? 1.4 : 1);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, alpha(K.tail, braking ? .75 : .42)); g.addColorStop(1, alpha(K.tail, 0));
      x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    });
    lights.forEach(([kind, a, b, c, d]) => {
      x.fillStyle = hot;
      if (kind === 'o') { x.beginPath(); x.arc(a, b, c, 0, 7); x.fill(); x.fillStyle = alpha('#fff', braking ? .8 : .45); x.beginPath(); x.arc(a - c * .25, b - c * .25, c * .35, 0, 7); x.fill(); }
      else { rrect(x, a, b, c, d, d * .35); x.fill(); x.fillStyle = alpha('#fff', braking ? .75 : .35); x.fillRect(a + c * .1, b + d * .2, c * .8, d * .22); }
    });
  }
  function diffuser(x, K, l, r, top, bot, fins = 5) {
    path(x, [[l, bot], [l + .02, top], [r - .02, top], [r, bot]]); x.fillStyle = mix(K.tire, K.tread, .5); x.fill();
    x.strokeStyle = alpha(K.chrome, .3); x.lineWidth = .006;
    for (let i = 1; i < fins; i++) { const xx = l + (r - l) * i / fins; x.beginPath(); x.moveTo(xx, top); x.lineTo(xx, bot); x.stroke(); }
  }
  function exhausts(x, K, list) {
    list.forEach(([ex, ey]) => {
      x.fillStyle = K.chrome; x.beginPath(); x.ellipse(ex, ey, .026, .019, 0, 0, 7); x.fill();
      x.fillStyle = K.tire; x.beginPath(); x.ellipse(ex, ey, .015, .011, 0, 0, 7); x.fill();
    });
  }
  function plate(x, K, cy, w = .15) {
    rrect(x, -w / 2, cy - w * .17, w, w * .34, .008); x.fillStyle = K.plate; x.fill();
    x.strokeStyle = K.plateInk; x.lineWidth = .005; x.stroke();
    x.fillStyle = K.plateInk; for (let i = 0; i < 4; i++) x.fillRect(-w * .36 + i * w * .2, cy - w * .06, w * .12, w * .12);
  }

  /* ---------- DECALS, clipped to the car's painted shape (clip). box = the whole painted area [l, t, r, b] (stripes,
     flames); panel = the lower rear panel between the shoulders and the valance (stars, checkerboard, lightning), so
     nothing lands on the window. The number is num(), drawn last ---------- */
  function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
  function decal(x, K, pal, o, clip, box, panel) {
    const d = o.decal; if (!d || d === 'none') return;
    x.save(); x.clip(clip);
    const [l, t, r, b] = d === 'stripes' || d === 'flames' ? box : (panel || box), w = r - l, h = b - t;
    if (d === 'stripes') { x.fillStyle = alpha(K.white, .9); x.fillRect(-.1, t - .2, .06, h + .4); x.fillRect(.04, t - .2, .06, h + .4); }
    else if (d === 'flames') {
      const g = x.createLinearGradient(0, b, 0, b - h * .75); g.addColorStop(0, K.flame1); g.addColorStop(1, K.flame2);
      x.fillStyle = g;
      [[-1, 1], [1, -1]].forEach(([s]) => {
        x.beginPath(); x.moveTo(s * (w * .5), b);
        for (let i = 0; i < 4; i++) {
          const x0 = s * (w * .5 - i * w * .09), tipY = b - h * (.75 - i * .12);
          x.quadraticCurveTo(x0 - s * w * .02, b - h * .3, x0 - s * w * .06, tipY);
          x.quadraticCurveTo(x0 - s * w * .05, b - h * .3, x0 - s * w * .09, b - h * .1);
        }
        x.lineTo(s * w * .12, b); x.closePath(); x.fill();
      });
    } else if (d === 'stars') {
      x.fillStyle = K.star;
      [[-.33, .35, .06], [.3, .3, .05], [-.12, .72, .035], [.14, .75, .04], [.42, .7, .03]].forEach(([sx, sy, sr]) => star(x, sx * w, t + sy * h, sr));
    } else if (d === 'checker') {
      const s = h * .16, y0 = t + h * .42;
      for (let i = 0; l + i * s < r; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? K.deep : K.white; x.fillRect(l + i * s, y0 + j * s, s + .001, s + .001); }
    } else if (d === 'lightning') {
      const bolt = [[l, t + h * .55], [-.12, t + h * .38], [-.05, t + h * .56], [.14, t + h * .3], [.08, t + h * .5], [r, t + h * .34], [.12, t + h * .64], [.05, t + h * .46], [-.14, t + h * .72], [-.08, t + h * .54]];
      path(x, bolt); x.fillStyle = K.bolt; x.fill(); x.strokeStyle = K.deep; x.lineWidth = .008; x.stroke();
    }
    x.restore();
  }

  /** YOUR NUMBER (the 'number' decal): a white roundel drawn LAST, at a spot each body picks clear of its lamps and plate */
  function num(x, K, o, cx, cy, rad) {
    if (o.decal !== 'number') return;
    const n = String(Math.max(1, Math.min(99, o.number | 0 || 1)));
    x.save(); x.fillStyle = K.white; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
    x.strokeStyle = K.deep; x.lineWidth = .008; x.stroke();
    // text at a real font size (a sub-pixel font in car-width units renders badly): 100 units = the roundel's diameter
    x.translate(cx, cy); x.scale(rad / 50, rad / 50);
    x.fillStyle = K.deep; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${n.length > 1 ? 56 : 70}px "GN Display", system-ui, sans-serif`;
    x.fillText(n, 0, 4, 86); x.restore();
  }

  /* ---------- THE BODIES: each draws its whole car, back to front, in unit coordinates ---------- */
  const BODIES = {
    /** Coupe: today's car, improved: sloped cabin, a lip spoiler, wide tail lights */
    coupe(x, K, pal, o) {
      shadow(x, .6, .07);
      tire(x, K, -.49, -.16, .17, .16, -1); tire(x, K, .32, -.16, .17, .16, 1);
      const body = [[-.5, -.08], [-.49, -.24], [-.49, -.28, -.42, -.3], [-.3, -.315], [.3, -.315], [.49, -.28, .49, -.24], [.5, -.08], [.5, -.05, .46, -.05], [-.46, -.05], [-.5, -.05, -.5, -.08]];
      const cab = [[-.3, -.312], [-.22, -.46], [-.2, -.476, -.16, -.476], [.16, -.476], [.2, -.476, .22, -.46], [.3, -.312]];
      path(x, body); x.fillStyle = paint(x, pal, -.32, -.05); x.fill();
      path(x, cab); x.fillStyle = paint(x, pal, -.48, -.3); x.fill();
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.5, -.476, .5, -.05], [-.44, -.3, .44, -.11]);
      path(x, [[-.46, -.11], [.46, -.11], [.46, -.05], [-.46, -.05]]); x.fillStyle = alpha(pal.darker, .9); x.fill();   // the lower valance
      glass(x, K, [[-.25, -.322], [-.19, -.452], [.19, -.452], [.25, -.322]]);
      shine(x, pal, [[-.47, -.27], [-.42, -.298], [-.3, -.312], [-.22, -.458], [.22, -.458], [.3, -.312], [.42, -.298], [.47, -.27]]);
      x.fillStyle = pal.dark; rrect(x, -.44, -.345, .88, .026, .01); x.fill();                                          // the spoiler
      x.fillStyle = pal.light; x.fillRect(-.44, -.345, .88, .006);
      tail(x, K, [['r', -.46, -.255, .2, .05], ['r', .26, -.255, .2, .05]], o.braking);
      diffuser(x, K, -.2, .2, -.1, -.05); exhausts(x, K, EXHAUSTS.coupe); plate(x, K, -.165); num(x, K, o, -.19, -.155, .045);
    },
    /** Mini: tiny, round and cheerful: a bubble cabin, a lighter roof, round lamps */
    mini(x, K, pal, o) {
      shadow(x, .47, .06);
      tire(x, K, -.4, -.13, .14, .13, -1); tire(x, K, .26, -.13, .14, .13, 1);
      const body = [[-.41, -.07], [-.42, -.24, -.3, -.3], [.3, -.3], [.42, -.24, .41, -.07], [.41, -.045, .36, -.045], [-.36, -.045], [-.41, -.045, -.41, -.07]];
      const cab = [[-.3, -.295], [-.3, -.47, 0, -.47], [.3, -.47, .3, -.295]];
      path(x, body); x.fillStyle = paint(x, pal, -.3, -.045); x.fill();
      path(x, cab); x.fillStyle = paint(x, pal, -.47, -.29); x.fill();
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.41, -.47, .41, -.045], [-.36, -.29, .36, -.12]);
      x.save(); path(x, cab); x.clip(); x.fillStyle = mix(pal.paint, K.white, .7); x.fillRect(-.32, -.49, .64, .05); x.restore();   // the roof
      glass(x, K, [[-.22, -.305], [-.22, -.415, 0, -.415], [.22, -.415, .22, -.305]]);
      shine(x, pal, [[-.38, -.22], [-.3, -.29], [.3, -.29], [.38, -.22]]);
      path(x, [[-.38, -.1], [.38, -.1], [.38, -.045], [-.38, -.045]]); x.fillStyle = alpha(pal.darker, .85); x.fill();
      x.fillStyle = K.chrome; rrect(x, -.39, -.12, .78, .022, .01); x.fill();                                           // a chrome bumper
      tail(x, K, [['o', -.32, -.22, .038], ['o', .32, -.22, .038]], o.braking);
      exhausts(x, K, EXHAUSTS.mini); plate(x, K, -.17, .13); num(x, K, o, -.19, -.18, .04);
    },
    /** Muscle: wide and low, big rear tires, a shaker scoop over the roof, a ducktail, a full-width light bar */
    muscle(x, K, pal, o) {
      shadow(x, .62, .075);
      tire(x, K, -.5, -.19, .2, .19, -1); tire(x, K, .3, -.19, .2, .19, 1);
      const body = [[-.47, -.06], [-.47, -.25], [-.44, -.28], [.44, -.28], [.47, -.25], [.47, -.06], [.47, -.045, .44, -.045], [-.44, -.045], [-.47, -.045, -.47, -.06]];
      const cab = [[-.27, -.278], [-.21, -.39], [.21, -.39], [.27, -.278]];
      path(x, [[-.07, -.385], [-.055, -.435], [.055, -.435], [.07, -.385]]); x.fillStyle = pal.darker; x.fill();          // the hood scoop, over the roof
      x.fillStyle = K.tire; x.fillRect(-.04, -.43, .08, .018);
      path(x, body); x.fillStyle = paint(x, pal, -.28, -.045); x.fill();
      path(x, cab); x.fillStyle = paint(x, pal, -.39, -.27); x.fill();
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.47, -.39, .47, -.045], [-.44, -.28, .44, -.1]);
      glass(x, K, [[-.22, -.285], [-.17, -.375], [.17, -.375], [.22, -.285]]);
      path(x, [[-.47, -.3], [.47, -.3], [.44, -.28], [-.44, -.28]]); x.fillStyle = pal.dark; x.fill();                  // the ducktail
      shine(x, pal, [[-.46, -.29], [.46, -.29]]);
      path(x, [[-.45, -.1], [.45, -.1], [.45, -.045], [-.45, -.045]]); x.fillStyle = alpha(pal.darker, .9); x.fill();
      x.fillStyle = K.tire; rrect(x, -.42, -.235, .84, .06, .01); x.fill();                                             // the light bar
      tail(x, K, [['r', -.4, -.228, .3, .045], ['r', .1, -.228, .3, .045]], o.braking);
      diffuser(x, K, -.16, .16, -.095, -.045, 4); exhausts(x, K, EXHAUSTS.muscle); plate(x, K, -.16); num(x, K, o, -.19, -.138, .034);
    },
    /** Retro Wagon: boxy, a tall cabin, round tail lights, a roof rack */
    wagon(x, K, pal, o) {
      shadow(x, .6, .07);
      tire(x, K, -.47, -.15, .16, .15, -1); tire(x, K, .31, -.15, .16, .15, 1);
      const body = [[-.47, -.07], [-.47, -.3], [.47, -.3], [.47, -.07], [.47, -.05, .44, -.05], [-.44, -.05], [-.47, -.05, -.47, -.07]];
      const cab = [[-.42, -.298], [-.39, -.54], [.39, -.54], [.42, -.298]];
      path(x, body); x.fillStyle = paint(x, pal, -.3, -.05); x.fill();
      path(x, cab); x.fillStyle = paint(x, pal, -.54, -.29); x.fill();
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.47, -.54, .47, -.05], [-.44, -.3, .44, -.13]);
      glass(x, K, [[-.35, -.31], [-.33, -.51], [.33, -.51], [.35, -.31]]);
      x.strokeStyle = K.chrome; x.lineWidth = .016; x.lineCap = 'round';                                                 // the roof rack
      x.beginPath(); x.moveTo(-.36, -.575); x.lineTo(.36, -.575); x.moveTo(-.3, -.54); x.lineTo(-.3, -.575); x.moveTo(0, -.54); x.lineTo(0, -.575); x.moveTo(.3, -.54); x.lineTo(.3, -.575); x.stroke();
      shine(x, pal, [[-.46, -.3], [-.42, -.3], [-.39, -.535], [.39, -.535], [.42, -.3], [.46, -.3]]);
      x.fillStyle = K.chrome; rrect(x, -.46, -.125, .92, .03, .012); x.fill();                                            // the chrome bumper
      tail(x, K, [['o', -.4, -.235, .033], ['o', -.31, -.235, .033], ['o', .31, -.235, .033], ['o', .4, -.235, .033]], o.braking);
      exhausts(x, K, EXHAUSTS.wagon); plate(x, K, -.185); num(x, K, o, -.19, -.2, .05);
    },
    /** Dune Buggy: a small tub in a roll cage, knobby tires (it bounces: drawn per frame) */
    buggy(x, K, pal, o) {
      shadow(x, .6, .07);
      tire(x, K, -.5, -.27, .21, .27, -1, true); tire(x, K, .29, -.27, .21, .27, 1, true);
      x.strokeStyle = K.chrome; x.lineWidth = .02; x.lineCap = 'round'; x.lineJoin = 'round';                             // the roll cage
      x.beginPath(); x.moveTo(-.3, -.2); x.lineTo(-.24, -.52); x.lineTo(.24, -.52); x.lineTo(.3, -.2);
      x.moveTo(-.27, -.36); x.lineTo(.27, -.36); x.moveTo(-.24, -.52); x.lineTo(.27, -.36); x.stroke();
      x.fillStyle = alpha(K.tire, .8); x.beginPath(); x.arc(0, -.37, .085, Math.PI, 0); x.fill();                          // the seat back
      const body = [[-.34, -.12], [-.32, -.27], [.32, -.27], [.34, -.12], [.34, -.1, .3, -.1], [-.3, -.1], [-.34, -.1, -.34, -.12]];
      path(x, body); x.fillStyle = paint(x, pal, -.27, -.1); x.fill();
      decal(x, K, pal, o, P2(body), [-.34, -.27, .34, -.1]);
      shine(x, pal, [[-.32, -.265], [.32, -.265]]);
      x.strokeStyle = K.tire; x.lineWidth = .025; x.beginPath(); x.moveTo(-.29, -.14); x.lineTo(-.4, -.13); x.moveTo(.29, -.14); x.lineTo(.4, -.13); x.stroke();   // the axle arms
      tail(x, K, [['o', -.26, -.205, .026], ['o', .26, -.205, .026]], o.braking);
      exhausts(x, K, EXHAUSTS.buggy); plate(x, K, -.15, .12); num(x, K, o, 0, -.215, .04);
    },
    /** Open-Wheel Racer: a narrow tub, big exposed wheels, suspension arms, a tall rear wing, one rain light */
    openwheel(x, K, pal, o) { openwheel(x, K, pal, o, false); },
    /** The Maestro: the open-wheel racer with gold trim (a rival only) */
    maestro(x, K, pal, o) { openwheel(x, K, pal, o, true); },
    /** Hover Racer: no wheels: a wedge floating on a glow, two thrusters (their shimmer is drawn per frame) */
    hover(x, K, pal, o) {
      shadow(x, .52, .05);
      const g = x.createRadialGradient(0, -.01, 0, 0, -.01, .5);                                                        // the hover glow on the road
      g.addColorStop(0, alpha(K.nitro, .45)); g.addColorStop(1, alpha(K.nitro, 0));
      x.save(); x.scale(1, .18); x.fillStyle = g; x.fillRect(-.5, -.06 / .18 - .5, 1, 1); x.restore();
      x.translate(0, -HOVER_LIFT);
      const body = [[-.5, -.1], [-.44, -.25], [.44, -.25], [.5, -.1], [.46, -.06], [-.46, -.06]];
      const cab = [[-.2, -.248], [-.17, -.37, 0, -.39], [.17, -.37, .2, -.248]];
      path(x, body); x.fillStyle = paint(x, pal, -.25, -.06); x.fill();
      const clip = P2(body);
      decal(x, K, pal, o, clip, [-.5, -.25, .5, -.06]);
      glass(x, K, cab);
      shine(x, pal, [[-.49, -.12], [-.44, -.245], [.44, -.245], [.49, -.12]]);
      path(x, [[-.44, -.25], [.44, -.25], [.43, -.235], [-.43, -.235]]); x.fillStyle = K.tail; x.fill();                  // the light bar along the top
      tail(x, K, [['r', -.42, -.215, .16, .03], ['r', .26, -.215, .16, .03]], o.braking);
      EXHAUSTS.hover.forEach(([ex, ey]) => {                                                                               // the thrusters
        const tg = x.createRadialGradient(ex, ey + HOVER_LIFT, 0, ex, ey + HOVER_LIFT, .11);
        tg.addColorStop(0, alpha(K.nitro, .8)); tg.addColorStop(1, alpha(K.nitro, 0));
        x.fillStyle = tg; x.fillRect(ex - .11, ey + HOVER_LIFT - .11, .22, .22);
        x.fillStyle = mix(pal.darker, K.tire, .5); x.beginPath(); x.arc(ex, ey + HOVER_LIFT, .06, 0, 7); x.fill();
        x.fillStyle = mix(K.nitro, K.white, .4); x.beginPath(); x.arc(ex, ey + HOVER_LIFT, .035, 0, 7); x.fill();
      });
      plate(x, K, -.105, .12); num(x, K, o, -.12, -.17, .04);
    },
  };
  function openwheel(x, K, pal, o, gold) {
    const trim = gold ? K.gold : pal.dark;
    shadow(x, .6, .07);
    x.strokeStyle = mix(K.tire, K.chrome, .35); x.lineWidth = .014;                                                      // the suspension arms
    x.beginPath(); x.moveTo(-.14, -.2); x.lineTo(-.33, -.16); x.moveTo(-.14, -.1); x.lineTo(-.33, -.08); x.moveTo(.14, -.2); x.lineTo(.33, -.16); x.moveTo(.14, -.1); x.lineTo(.33, -.08); x.stroke();
    tire(x, K, -.5, -.25, .19, .25, -1); tire(x, K, .31, -.25, .19, .25, 1);
    x.strokeStyle = trim; x.lineWidth = .016;                                                                            // the wing pillars
    x.beginPath(); x.moveTo(-.08, -.25); x.lineTo(-.12, -.49); x.moveTo(.08, -.25); x.lineTo(.12, -.49); x.stroke();
    const body = [[-.16, -.06], [-.18, -.2], [-.1, -.3], [.1, -.3], [.18, -.2], [.16, -.06]];
    path(x, body); x.fillStyle = paint(x, pal, -.3, -.06); x.fill();
    decal(x, K, pal, o, P2(body), [-.18, -.3, .18, -.06]);
    x.fillStyle = mix(pal.darker, K.tire, .4); path(x, [[-.06, -.3], [-.045, -.39], [.045, -.39], [.06, -.3]]); x.fill();   // the airbox
    x.fillStyle = pal.light; x.beginPath(); x.arc(0, -.335, .05, Math.PI, 0); x.fill();                                    // the helmet
    shine(x, pal, [[-.17, -.21], [-.1, -.295], [.1, -.295], [.17, -.21]]);
    const wg = x.createLinearGradient(0, -.53, 0, -.475);
    wg.addColorStop(0, pal.light); wg.addColorStop(1, pal.dark);
    rrect(x, -.43, -.53, .86, .055, .012); x.fillStyle = wg; x.fill();                                                   // the rear wing
    x.fillStyle = trim; x.fillRect(-.45, -.58, .03, .15); x.fillRect(.42, -.58, .03, .15);                               // its endplates
    x.strokeStyle = alpha(pal.sky, .5); x.lineWidth = .012; x.beginPath(); x.moveTo(-.42, -.533); x.lineTo(.42, -.533); x.stroke();
    if (gold) { x.strokeStyle = K.gold; x.lineWidth = .012; rrect(x, -.43, -.53, .86, .055, .012); x.stroke(); path(x, body); x.stroke(); }
    tail(x, K, [['r', -.035, -.22, .07, .045]], o.braking);                                                             // the rain light
    diffuser(x, K, -.15, .15, -.1, -.05, 4); exhausts(x, K, EXHAUSTS.openwheel); num(x, K, o, 0, -.14, .04);
  }

  /* ---------- sprites: one per look and size, reused every frame ---------- */
  const cache = new Map(); let builds = 0;
  const bucket = px => (px < 40 ? Math.ceil(px / 4) * 4 : px < 120 ? Math.ceil(px / 8) * 8 : Math.ceil(px / 16) * 16);
  const L = -.64, R = .64, TOP = -.64, BOT = .08;                     // a sprite's extent, in car widths
  function sprite(o) {
    const body = BODIES[o.body] ? o.body : 'coupe', dpr = o.dpr || 1, px = bucket(Math.max(8, o.w * dpr));
    const key = [body, o.color, o.decal || 'none', o.decal === 'number' ? o.number : '', px, o.sky || '', o.braking ? 1 : 0].join('|');
    let s = cache.get(key);
    if (s) return s;
    if (cache.size > 220) cache.clear();
    const K = tokens(), cv = document.createElement('canvas');
    cv.width = Math.ceil((R - L) * px); cv.height = Math.ceil((BOT - TOP) * px);
    const x = cv.getContext('2d');
    x.translate(-L * px, -TOP * px); x.scale(px, px);
    const pc = o.color || K.white;
    const pal = {paint: pc, light: mix(pc, '#fff', .45), dark: mix(pc, '#000', .38), darker: mix(pc, '#000', .66), sky: o.sky || K.white};
    BODIES[body](x, K, pal, Object.assign({}, o, {body}));
    s = {cv, ax: -L * px, ay: -TOP * px, k: px}; cache.set(key, s); builds++;
    return s;
  }
  /** draw a car: x = its center, y = where it touches the road, w = its width (CSS px) */
  function draw(ctx, x, y, w, o) {
    const s = sprite(Object.assign({}, o, {w})), k = w / s.k;
    let dy = 0;
    if (o.body === 'buggy' && !o.reduced && o.t != null) dy = -Math.abs(Math.sin(o.t / 120)) * w * .02;            // the buggy bounces
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.drawImage(s.cv, x - s.ax * k, y - s.ay * k + dy, s.cv.width * k, s.cv.height * k);
    const K = tokens(), ex = EXHAUSTS[o.body] || EXHAUSTS.coupe;
    if (o.body === 'hover' && !o.reduced && o.t != null) {                                                         // the thrusters shimmer
      ctx.globalAlpha = (o.alpha != null ? o.alpha : 1) * (.25 + .2 * Math.sin(o.t / 90));
      ctx.fillStyle = K.nitro;
      ex.forEach(([e, f]) => { ctx.beginPath(); ctx.arc(x + e * w, y + (f) * w, w * .05, 0, 7); ctx.fill(); });
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    }
    if (o.nitro) {                                                                                                  // nitro flames from the exhausts
      ctx.fillStyle = K.nitro; ctx.globalAlpha = .85 * (o.alpha != null ? o.alpha : 1);
      ex.forEach(([e, f]) => {
        const fx = x + e * w, fy = y + f * w + dy, len = w * (.1 + (o.reduced ? 0 : Math.random() * .08));
        ctx.beginPath(); ctx.moveTo(fx - w * .03, fy); ctx.lineTo(fx, fy + len); ctx.lineTo(fx + w * .03, fy); ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  }
  /** a still picture of a car (the garage's option tiles, the results screen); locked = a dark silhouette */
  const urls = new Map();
  function thumbURL(o, w, {locked} = {}) {
    const key = JSON.stringify([o.body, o.color, o.decal, o.number, w, o.sky, !!locked]);
    if (urls.has(key)) return urls.get(key);
    const dpr = Math.min(2, devicePixelRatio || 1), s = sprite(Object.assign({}, o, {w, dpr}));
    const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height;
    const x = cv.getContext('2d'); x.drawImage(s.cv, 0, 0);
    if (locked) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = tokens().deep; x.globalAlpha = .94; x.fillRect(0, 0, cv.width, cv.height); }
    const u = cv.toDataURL(); urls.set(key, u); return u;
  }
  A.SpeedwayCars = {draw, sprite, thumbURL, BODIES: BODY_IDS, EXHAUSTS, bucket, stats: () => ({cached: cache.size, builds}), reset: () => { cache.clear(); urls.clear(); T = null; }};
})(window.Arcade);
