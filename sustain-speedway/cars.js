/* Sustain Speedway: THE CARS, drawn in 2D from behind (a canvas; no pictures). Arcade.SpeedwayCars.
   Every car = a BODY (its own silhouette and details) + a PAINT (a color string) with a FINISH (gloss, matte, metallic,
   pearl, chrome, neon) and an optional TWO-TONE roof color + a DECAL in its own color (+ a number) + PARTS (rims, a
   spoiler, the license plate's word or digits) + per-frame extras (underglow, the nitro flame's color).
   Each car is drawn ONCE per look, size bucket, sky color and brake-light state into its own small
   canvas (a SPRITE: gradients, shine, shadow, tail-light halos all baked in), then only copied each frame, so four cars
   cost four drawImage calls on an old iPad. Only what moves is drawn per frame: the Dune Buggy's bounce, the Hover
   Racer's thruster shimmer, nitro flames (none of the moving parts with reduced motion).
   Units: everything below is in CAR WIDTHS: x from -.5 (left) to .5 (right), y up is negative, 0 = the road.
   Colors: theme tokens only (--sw-* in theme.css), resolved when a sprite is built.
     draw(ctx, x, y, w, o)   o = {body, color, finish, color2, decal, dcolor, number, rims, spoiler, plate, glow, flame, sky,
                                  braking, alpha, t (ms), reduced, nitro, dpr, lite}
     side(ctx, x, y, w, o)   THE SIDE VIEW (the garage's preview toggle): the same look from the side, rims showing
     rimURL(style, px)       a rim close-up (the garage's WHEELS tiles)
   DARK PAINTS (luminance < DARK): a light rim around the whole car + a brighter highlight, so they never vanish on a night road.
     sprite(o)               the cached sprite {cv, ax, ay, k} (tests)     thumbURL(o, w)   a still picture (the garage)
     BODIES, EXHAUSTS, stats() */
(function (A) {
  "use strict";
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const BODY_IDS = ['coupe', 'mini', 'muscle', 'wagon', 'buggy', 'openwheel', 'hover', 'maestro', 'pickup', 'rally', 'stock', 'hotrod', 'kart', 'supercar', 'monster', 'retrohover', 'bumper'];
  // where the exhausts are (nitro flames come out of them), per body, in car widths
  const EXHAUSTS = {coupe: [[-.22, -.075], [.22, -.075]], mini: [[-.14, -.07], [.14, -.07]], muscle: [[-.3, -.07], [-.24, -.07], [.24, -.07], [.3, -.07]],
    wagon: [[-.26, -.07], [.26, -.07]], buggy: [[-.1, -.2], [.1, -.2]], openwheel: [[0, -.1]], maestro: [[0, -.1]], hover: [[-.25, -.16], [.25, -.16]],
    pickup: [[-.3, -.08], [.3, -.08]], rally: [[.24, -.08]], stock: [[-.3, -.07], [.3, -.07]], hotrod: [[-.2, -.1], [.2, -.1]], kart: [[-.08, -.08], [.08, -.08]],
    supercar: [[-.12, -.06], [-.05, -.06], [.05, -.06], [.12, -.06]], monster: [[-.22, -.36], [.22, -.36]], retrohover: [[0, -.2]], bumper: [[0, -.1]]};
  // THE DECK (where a chosen spoiler sits): y of the trunk / rear deck and its half-width, per body
  const DECK = {coupe: [-.32, .44], mini: [-.3, .36], muscle: [-.3, .45], wagon: [-.54, .38], buggy: [-.27, .3], hover: [-.25, .42], pickup: [-.5, .3],
    rally: [-.44, .3], stock: [-.33, .44], hotrod: [-.3, .3], kart: [-.18, .24], supercar: [-.26, .46], monster: [-.6, .36], retrohover: [-.32, .3], bumper: [-.34, .3]};
  // the bodies whose own design includes a spoiler ('stock' = keep it; any other choice replaces it)
  const OWN_SPOILER = {coupe: 'lip', muscle: 'ducktail', stock: 'wing', supercar: 'wing', rally: 'wing'};
  const DARK = .16;                                        // paints darker than this (relative luminance) get the light rim
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
    white: css('white-hi'), deep: css('deep'), nitro: css('sw-nitro'), star: css('yellow-hi'), bolt: css('yellow'),
    pearl: css('sw-pearl'), rimLight: css('sw-rim-light'), pink: css('pink'), cyan: css('cyan'), green: css('green'), purple: css('purple'), amber: css('amber'),
    orange: css('sw-flame-1'), blue: css('blue'), yellow: css('yellow')});
  const lum = c => { const v = rgbOf(c).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  let CUR = {};                                          // the look being built (the rims, the plate…): set by sprite()

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
    const rx = side < 0 ? l + w * .1 : l + w * .9, rim = CUR.rims || 'classic';   // the rim's edge, on the outer side
    if (rim === 'offroad' && !knobby) { x.fillStyle = K.tire; for (let yy = t + h * .08; yy < t + h; yy += h * .18) { x.fillRect(l - w * .06, yy, w * .08, h * .09); x.fillRect(l + w * .98, yy, w * .08, h * .09); } }
    if (rim === 'whitewall') { x.fillStyle = alpha(K.white, .85); x.fillRect(side < 0 ? l + w * .02 : l + w * .84, t + h * .15, w * .14, h * .7); }
    const rc = rim === 'gold' ? K.gold : rim === 'neonrim' ? (CUR.rimColor || K.nitro) : rim === 'disc' ? mix(K.chrome, K.white, .3) : K.chrome;
    if (rim === 'neonrim') { x.strokeStyle = alpha(rc, .35); x.lineWidth = .03; x.beginPath(); x.moveTo(rx, t + h * .15); x.lineTo(rx, t + h * .85); x.stroke(); }
    x.strokeStyle = alpha(rc, rim === 'turbine' || rim === 'disc' ? .95 : .75); x.lineWidth = rim === 'disc' || rim === 'turbine' ? .016 : .01;
    x.beginPath(); x.moveTo(rx, t + h * .2); x.lineTo(rx, t + h * .8); x.stroke();
  }
  /** a vertical gradient fill: a lighter top edge, the paint, darker lower sides */
  function paint(x, pal, top, bot) {
    const g = x.createLinearGradient(0, top, 0, bot);
    if (pal.finish === 'chrome') {                        // CHROME: the sky reflected on top, a bright band, the dark ground below
      g.addColorStop(0, mix(pal.sky, '#fff', .5)); g.addColorStop(.38, mix(pal.paint, '#fff', .75)); g.addColorStop(.46, mix(pal.paint, '#000', .55));
      g.addColorStop(.7, mix(pal.paint, '#fff', .25)); g.addColorStop(1, pal.dark); return g;
    }
    const hi = pal.finish === 'matte' ? mix(pal.paint, '#fff', pal.dark0 ? .18 : .1) : pal.light;
    g.addColorStop(0, hi); g.addColorStop(.3, pal.paint); g.addColorStop(.75, pal.paint); g.addColorStop(1, pal.dark);
    return g;
  }
  /** fill the current path with the paint + its FINISH (metallic flakes, the pearl's shifting sheen, the neon glow) */
  let flakes = null;
  function flakePattern(x) {
    if (!flakes) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 140; i++) { g.fillStyle = r() < .6 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.35)'; g.fillRect(r() * 64, r() * 64, 1, 1); }
      flakes = c;
    }
    return x.createPattern(flakes, 'repeat');
  }
  function fillPaint(x, pal, top, bot) {
    x.fillStyle = paint(x, pal, top, bot); x.fill();
    if (pal.finish === 'metallic') { x.save(); const pt = flakePattern(x); if (pt && pt.setTransform) pt.setTransform(new DOMMatrix().scale(1 / pal.px)); x.fillStyle = pt; x.globalAlpha = .55; x.fill(); x.restore(); }
    else if (pal.finish === 'pearl') {                    // a soft sheen that shifts toward the track's light
      const g = x.createLinearGradient(-.5, top, .5, bot); g.addColorStop(0, alpha(pal.sky, .28)); g.addColorStop(.5, alpha(pal.pearl, .3)); g.addColorStop(1, alpha(mix(pal.paint, pal.sky, .5), .22));
      x.fillStyle = g; x.fill();
    } else if (pal.finish === 'neon') { x.save(); x.shadowColor = pal.paint; x.shadowBlur = pal.px * .045; x.strokeStyle = mix(pal.paint, '#fff', .35); x.lineWidth = .012; x.stroke(); x.restore(); }
  }
  function shine(x, pal, pts) {                         // the bright highlight line along the roof / shoulders
    x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
    if (pal.finish === 'matte') x.globalAlpha = .45;
    if (pal.dark0) { x.strokeStyle = alpha(pal.rim, .8); x.lineWidth = .026; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1] - .006) : x.moveTo(p[0], p[1] - .006))); x.stroke(); }   // dark paints: a brighter highlight
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
  /** the license plate: the chosen word or digits (never typed text), else four blocks */
  function plate(x, K, cy, w = .15) {
    rrect(x, -w / 2, cy - w * .17, w, w * .34, .008); x.fillStyle = K.plate; x.fill();
    x.strokeStyle = K.plateInk; x.lineWidth = .005; x.stroke();
    const txt = plateText(CUR.plate);
    if (txt && CUR.px * w >= 18) {                        // big enough to read: the letters (a real font size, scaled down)
      x.save(); x.translate(0, cy); x.scale(w / 100, w / 100);
      x.fillStyle = K.plateInk; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `900 ${txt.length > 5 ? 20 : 26}px "GN Display", system-ui, sans-serif`; x.fillText(txt, 0, 2, 92); x.restore();
      return;
    }
    x.fillStyle = K.plateInk; for (let i = 0; i < 4; i++) x.fillRect(-w * .36 + i * w * .2, cy - w * .06, w * .12, w * .12);
  }
  const plateText = pl => (!pl ? '' : pl.w ? String(pl.w).slice(0, 8) : pl.d != null ? String(pl.d).replace(/\D/g, '').slice(0, 4) : '');

  /* ---------- DECALS, clipped to the car's painted shape (clip). box = the whole painted area [l, t, r, b] (stripes,
     flames); panel = the lower rear panel between the shoulders and the valance (stars, checkerboard, lightning), so
     nothing lands on the window. The number is num(), drawn last ---------- */
  function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
  const FULL = {stripes: 1, flames: 1, stripe1: 1, stripeoff: 1, swoosh: 1, camo: 1, dots: 1, tiger: 1, fade: 1};   // decals over the whole car (the rest: the rear panel)
  function decal(x, K, pal, o, clip, box, panel) {
    const d = o.decal; if (!d || d === 'none') return;
    x.save(); x.clip(clip);
    const [l, t, r, b] = FULL[d] ? box : (panel || box), w = r - l, h = b - t, dc = o.dcolor;
    if (d === 'stripes') { x.fillStyle = alpha(dc || K.white, .9); x.fillRect(-.1, t - .2, .06, h + .4); x.fillRect(.04, t - .2, .06, h + .4); }
    else if (d === 'stripe1') { x.fillStyle = alpha(dc || K.white, .9); x.fillRect(-.06, t - .2, .12, h + .4); }
    else if (d === 'stripeoff') { x.fillStyle = alpha(dc || K.white, .9); x.fillRect(.12, t - .2, .1, h + .4); x.fillRect(.25, t - .2, .03, h + .4); }
    else if (d === 'swoosh') {                           // an original sweeping swoosh from one corner across the car
      x.fillStyle = dc || K.white; x.beginPath(); x.moveTo(l, b - h * .15);
      x.quadraticCurveTo(-.05, b - h * .9, r, t + h * .25); x.quadraticCurveTo(0, b - h * .55, l + w * .1, b); x.closePath(); x.fill();
    } else if (d === 'notes') {
      x.fillStyle = dc || K.white;
      [[-.3, .7, .05], [-.05, .45, .04], [.24, .66, .05]].forEach(([nx, ny, nr]) => {
        const cx = nx * w, cy = t + ny * h; x.beginPath(); x.ellipse(cx, cy, nr, nr * .72, -.4, 0, 7); x.fill();
        x.fillRect(cx + nr * .72, cy - nr * 3.2, nr * .3, nr * 3.2); x.beginPath(); x.moveTo(cx + nr, cy - nr * 3.2); x.quadraticCurveTo(cx + nr * 2.4, cy - nr * 2.4, cx + nr * 2, cy - nr * 1.2); x.lineTo(cx + nr, cy - nr * 2.3); x.fill();
      });
    } else if (d === 'clef') {                            // a treble clef (drawn as a curling line)
      x.strokeStyle = dc || K.white; x.lineWidth = h * .06; x.lineCap = 'round';
      const cx = 0, cy = t + h * .55, u = h * .18;
      x.beginPath(); x.moveTo(cx + u * .25, cy + u * 2.3); x.quadraticCurveTo(cx - u * .6, cy + u * 2.5, cx - u * .3, cy + u * 1.7);
      x.lineTo(cx + u * .25, cy - u * 2.4); x.quadraticCurveTo(cx + u * .7, cy - u * 3.1, cx + u * .5, cy - u * 2); x.quadraticCurveTo(cx - u * 1.3, cy - u * .3, cx - u * .9, cy + u * .6);
      x.quadraticCurveTo(cx, cy + u * 1.5, cx + u * .9, cy + u * .5); x.quadraticCurveTo(cx + u * .6, cy - u * .5, cx - u * .2, cy); x.stroke();
    } else if (d === 'dots') {
      x.fillStyle = dc || K.white;
      for (let yy = t + h * .15, row = 0; yy < b; yy += h * .22, row++) for (let xx = l + (row % 2 ? w * .06 : w * .14); xx < r; xx += w * .16) { x.beginPath(); x.arc(xx, yy, h * .045, 0, 7); x.fill(); }
    } else if (d === 'tiger') {
      x.fillStyle = dc || K.deep;
      for (let i = 0; i < 7; i++) { const yy = t + h * (.1 + i * .13), s2 = i % 2 ? 1 : -1; x.beginPath(); x.moveTo(s2 * w * .52, yy); x.quadraticCurveTo(s2 * w * .25, yy + h * .04, s2 * w * .05, yy + h * .02); x.quadraticCurveTo(s2 * w * .25, yy + h * .09, s2 * w * .52, yy + h * .07); x.fill(); }
    } else if (d === 'camo') {
      const cols = [dc || mix(pal.paint, '#000', .45), mix(dc || pal.paint, '#fff', .25), mix(pal.paint, K.deep, .6)];
      let seed = 11; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 16; i++) { x.fillStyle = alpha(cols[i % 3], .85); const cx = l + rr() * w, cy = t + rr() * h, rx = w * (.05 + rr() * .07); x.beginPath(); x.ellipse(cx, cy, rx, rx * .6, rr() * 3, 0, 7); x.fill(); }
    } else if (d === 'fade') {                            // the paint fading into the decal color toward the bottom
      const g = x.createLinearGradient(0, t, 0, b); g.addColorStop(0, alpha(dc || K.deep, 0)); g.addColorStop(1, alpha(dc || K.deep, .85));
      x.fillStyle = g; x.fillRect(l, t, w, h);
    }
    else if (d === 'flames') {
      const g = x.createLinearGradient(0, b, 0, b - h * .75); g.addColorStop(0, dc || K.flame1); g.addColorStop(1, dc ? mix(dc, '#fff', .45) : K.flame2);
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
      x.fillStyle = dc || K.star;
      [[-.33, .35, .06], [.3, .3, .05], [-.12, .72, .035], [.14, .75, .04], [.42, .7, .03]].forEach(([sx, sy, sr]) => star(x, sx * w, t + sy * h, sr));
    } else if (d === 'checker') {
      const s = h * .16, y0 = t + h * .42;
      for (let i = 0; l + i * s < r; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? K.deep : (dc || K.white); x.fillRect(l + i * s, y0 + j * s, s + .001, s + .001); }
    } else if (d === 'lightning') {
      const bolt = [[l, t + h * .55], [-.12, t + h * .38], [-.05, t + h * .56], [.14, t + h * .3], [.08, t + h * .5], [r, t + h * .34], [.12, t + h * .64], [.05, t + h * .46], [-.14, t + h * .72], [-.08, t + h * .54]];
      path(x, bolt); x.fillStyle = dc || K.bolt; x.fill(); x.strokeStyle = K.deep; x.lineWidth = .008; x.stroke();
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

  /* ---------- SPOILERS: 'stock' = the body's own (if it has one); none / lip / wing / ducktail / tall on the DECK ---------- */
  const own = o => !o.spoiler || o.spoiler === 'stock';
  function spoiler(x, K, pal, o) {
    const kind = o.spoiler, d = DECK[o.body]; if (!d || own(o) || kind === 'none') return;
    const [y, hw] = d, c = pal.roof;
    if (kind === 'lip') { x.fillStyle = c.dark; rrect(x, -hw, y - .025, hw * 2, .024, .01); x.fill(); x.fillStyle = c.light; x.fillRect(-hw, y - .025, hw * 2, .006); }
    else if (kind === 'ducktail') { path(x, [[-hw - .03, y - .03], [hw + .03, y - .03], [hw, y + .005], [-hw, y + .005]]); x.fillStyle = c.dark; x.fill(); x.fillStyle = alpha(c.light, .8); x.fillRect(-hw - .02, y - .03, hw * 2 + .04, .006); }
    else {                                                 // a wing on two pillars (tall = higher and wider)
      const tall = kind === 'tall', top = y - (tall ? .2 : .1), w2 = hw + (tall ? .04 : .01);
      x.strokeStyle = c.darker; x.lineWidth = .016; x.beginPath(); x.moveTo(-hw * .55, y); x.lineTo(-hw * .6, top); x.moveTo(hw * .55, y); x.lineTo(hw * .6, top); x.stroke();
      const g = x.createLinearGradient(0, top - .05, 0, top); g.addColorStop(0, c.light); g.addColorStop(1, c.dark);
      rrect(x, -w2, top - .05, w2 * 2, .05, .012); x.fillStyle = g; x.fill();
      x.fillStyle = c.darker; x.fillRect(-w2 - .02, top - .08, .025, .11); x.fillRect(w2 - .005, top - .08, .025, .11);   // endplates
    }
  }

  /* ---------- THE BODIES: each draws its whole car, back to front, in unit coordinates ---------- */
  const BODIES = {
    /** Coupe: today's car, improved: sloped cabin, a lip spoiler, wide tail lights */
    coupe(x, K, pal, o) {
      shadow(x, .6, .07);
      tire(x, K, -.49, -.16, .17, .16, -1); tire(x, K, .32, -.16, .17, .16, 1);
      const body = [[-.5, -.08], [-.49, -.24], [-.49, -.28, -.42, -.3], [-.3, -.315], [.3, -.315], [.49, -.28, .49, -.24], [.5, -.08], [.5, -.05, .46, -.05], [-.46, -.05], [-.5, -.05, -.5, -.08]];
      const cab = [[-.3, -.312], [-.22, -.46], [-.2, -.476, -.16, -.476], [.16, -.476], [.2, -.476, .22, -.46], [.3, -.312]];
      path(x, body); fillPaint(x, pal, -.32, -.05);
      path(x, cab); fillPaint(x, pal.roof, -.48, -.3);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.5, -.476, .5, -.05], [-.44, -.3, .44, -.11]);
      path(x, [[-.46, -.11], [.46, -.11], [.46, -.05], [-.46, -.05]]); x.fillStyle = alpha(pal.darker, .9); x.fill();   // the lower valance
      glass(x, K, [[-.25, -.322], [-.19, -.452], [.19, -.452], [.25, -.322]]);
      shine(x, pal, [[-.47, -.27], [-.42, -.298], [-.3, -.312], [-.22, -.458], [.22, -.458], [.3, -.312], [.42, -.298], [.47, -.27]]);
      if (own(o)) { x.fillStyle = pal.dark; rrect(x, -.44, -.345, .88, .026, .01); x.fill(); x.fillStyle = pal.light; x.fillRect(-.44, -.345, .88, .006); }   // the spoiler
      tail(x, K, [['r', -.46, -.255, .2, .05], ['r', .26, -.255, .2, .05]], o.braking);
      diffuser(x, K, -.2, .2, -.1, -.05); exhausts(x, K, EXHAUSTS.coupe); plate(x, K, -.165); num(x, K, o, -.19, -.155, .045);
    },
    /** Mini: tiny, round and cheerful: a bubble cabin, a lighter roof, round lamps */
    mini(x, K, pal, o) {
      shadow(x, .47, .06);
      tire(x, K, -.4, -.13, .14, .13, -1); tire(x, K, .26, -.13, .14, .13, 1);
      const body = [[-.41, -.07], [-.42, -.24, -.3, -.3], [.3, -.3], [.42, -.24, .41, -.07], [.41, -.045, .36, -.045], [-.36, -.045], [-.41, -.045, -.41, -.07]];
      const cab = [[-.3, -.295], [-.3, -.47, 0, -.47], [.3, -.47, .3, -.295]];
      path(x, body); fillPaint(x, pal, -.3, -.045);
      path(x, cab); fillPaint(x, pal.roof, -.47, -.29);
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
      path(x, body); fillPaint(x, pal, -.28, -.045);
      path(x, cab); fillPaint(x, pal.roof, -.39, -.27);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.47, -.39, .47, -.045], [-.44, -.28, .44, -.1]);
      glass(x, K, [[-.22, -.285], [-.17, -.375], [.17, -.375], [.22, -.285]]);
      if (own(o)) { path(x, [[-.47, -.3], [.47, -.3], [.44, -.28], [-.44, -.28]]); x.fillStyle = pal.dark; x.fill(); }   // the ducktail
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
      path(x, body); fillPaint(x, pal, -.3, -.05);
      path(x, cab); fillPaint(x, pal.roof, -.54, -.29);
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
      path(x, body); fillPaint(x, pal, -.27, -.1);
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
      path(x, body); fillPaint(x, pal, -.25, -.06);
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
    /** Pickup Truck: a tall cab over a wide bed, a tailgate with a handle, vertical tail lights at the corners */
    pickup(x, K, pal, o) {
      shadow(x, .62, .075);
      tire(x, K, -.49, -.2, .19, .2, -1); tire(x, K, .3, -.2, .19, .2, 1);
      const cab = [[-.33, -.36], [-.3, -.56], [.3, -.56], [.33, -.36]];
      path(x, cab); fillPaint(x, pal.roof, -.56, -.36);
      glass(x, K, [[-.27, -.38], [-.25, -.52], [.25, -.52], [.27, -.38]]);
      const body = [[-.48, -.08], [-.48, -.36], [.48, -.36], [.48, -.08], [.48, -.06, .45, -.06], [-.45, -.06], [-.48, -.06, -.48, -.08]];
      path(x, body); fillPaint(x, pal, -.36, -.06);
      const clip = P2(body);
      decal(x, K, pal, o, clip, [-.48, -.36, .48, -.06], [-.4, -.34, .4, -.13]);
      x.fillStyle = pal.darker; x.fillRect(-.48, -.37, .96, .025);                                                      // the bed rail
      x.strokeStyle = alpha(pal.darker, .8); x.lineWidth = .008; x.beginPath(); x.moveTo(-.44, -.12); x.lineTo(.44, -.12); x.stroke();   // the tailgate seam
      x.fillStyle = K.chrome; rrect(x, -.07, -.31, .14, .025, .008); x.fill();                                           // its handle
      shine(x, pal, [[-.47, -.35], [.47, -.35]]);
      x.fillStyle = K.chrome; rrect(x, -.47, -.1, .94, .035, .012); x.fill();                                            // the step bumper
      tail(x, K, [['r', -.47, -.33, .06, .15], ['r', .41, -.33, .06, .15]], o.braking);
      exhausts(x, K, EXHAUSTS.pickup); plate(x, K, -.2); num(x, K, o, .22, -.24, .05);
    },
    /** Rally Car: a hatchback with mud flaps, a roof vent, a light pod on the roof and a roof wing */
    rally(x, K, pal, o) {
      shadow(x, .58, .07);
      tire(x, K, -.46, -.17, .17, .17, -1, CUR.rims === 'offroad'); tire(x, K, .29, -.17, .17, .17, 1, CUR.rims === 'offroad');
      x.fillStyle = K.tire; x.fillRect(-.47, -.1, .15, .1); x.fillRect(.32, -.1, .15, .1);                              // the mud flaps
      x.fillStyle = alpha(K.white, .7); x.fillRect(-.45, -.05, .11, .015); x.fillRect(.34, -.05, .11, .015);
      const body = [[-.45, -.1], [-.46, -.26], [-.43, -.3], [.43, -.3], [.46, -.26], [.45, -.1], [.45, -.08, .42, -.08], [-.42, -.08], [-.45, -.08, -.45, -.1]];
      const cab = [[-.34, -.298], [-.28, -.44], [.28, -.44], [.34, -.298]];
      path(x, body); fillPaint(x, pal, -.3, -.08);
      path(x, cab); fillPaint(x, pal.roof, -.44, -.29);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.46, -.44, .46, -.08], [-.42, -.29, .42, -.13]);
      glass(x, K, [[-.29, -.305], [-.24, -.42], [.24, -.42], [.29, -.305]]);
      x.fillStyle = pal.darker; rrect(x, -.08, -.475, .16, .03, .01); x.fill();                                            // the roof vent
      x.fillStyle = K.tire; rrect(x, -.22, -.5, .44, .045, .01); x.fill();                                                 // the light pod
      [-.16, -.055, .055, .16].forEach(lx => { x.fillStyle = K.star; x.beginPath(); x.arc(lx, -.4775, .016, 0, 7); x.fill(); });
      if (own(o)) { x.fillStyle = pal.roof.dark; rrect(x, -.3, -.455, .6, .022, .008); x.fill(); }                          // the roof wing
      shine(x, pal, [[-.45, -.27], [-.34, -.298], [.34, -.298], [.45, -.27]]);
      tail(x, K, [['r', -.43, -.26, .13, .06], ['r', .3, -.26, .13, .06]], o.braking);
      exhausts(x, K, EXHAUSTS.rally); plate(x, K, -.17); num(x, K, o, -.2, -.17, .045);
    },
    /** Stock Car: a wide, boxy racer: big number panels on the back and a tall blade spoiler */
    stock(x, K, pal, o) {
      shadow(x, .62, .075);
      tire(x, K, -.5, -.18, .19, .18, -1); tire(x, K, .31, -.18, .19, .18, 1);
      const body = [[-.49, -.07], [-.49, -.3], [-.45, -.33], [.45, -.33], [.49, -.3], [.49, -.07], [.49, -.05, .46, -.05], [-.46, -.05], [-.49, -.05, -.49, -.07]];
      const cab = [[-.3, -.33], [-.24, -.46], [.24, -.46], [.3, -.33]];
      path(x, body); fillPaint(x, pal, -.33, -.05);
      path(x, cab); fillPaint(x, pal.roof, -.46, -.33);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.49, -.46, .49, -.05], [-.45, -.32, .45, -.11]);
      glass(x, K, [[-.25, -.335], [-.2, -.44], [.2, -.44], [.25, -.335]]);
      [-1, 1].forEach(sd => { x.fillStyle = alpha(K.white, .92); rrect(x, sd * .36 - .07, -.27, .14, .12, .02); x.fill(); });   // the number panels
      const n = String(Math.max(1, Math.min(99, o.number | 0 || 7)));
      x.save(); x.fillStyle = K.deep; x.textAlign = 'center'; x.textBaseline = 'middle';
      [-1, 1].forEach(sd => { x.save(); x.translate(sd * .36, -.21); x.scale(.0011, .0011); x.font = `900 ${n.length > 1 ? 80 : 96}px "GN Display", system-ui, sans-serif`; x.fillText(n, 0, 6, 120); x.restore(); });
      x.restore();
      if (own(o)) {                                                                                                      // the blade spoiler
        path(x, [[-.46, -.35], [-.44, -.43], [.44, -.43], [.46, -.35]]); x.fillStyle = alpha(pal.roof.darker, .9); x.fill();
        x.strokeStyle = alpha(K.white, .4); x.lineWidth = .006; x.beginPath(); x.moveTo(-.44, -.428); x.lineTo(.44, -.428); x.stroke();
      }
      shine(x, pal, [[-.48, -.3], [-.45, -.33], [.45, -.33], [.48, -.3]]);
      tail(x, K, [['r', -.46, -.13, .18, .035], ['r', .28, -.13, .18, .035]], o.braking);
      exhausts(x, K, EXHAUSTS.stock); plate(x, K, -.085, .13);
    },
    /** Hot Rod: a small body with a chrome engine blower and intake stacks sticking up over the roof, fat rear tires */
    hotrod(x, K, pal, o) {
      shadow(x, .6, .07);
      tire(x, K, -.52, -.24, .24, .24, -1); tire(x, K, .28, -.24, .24, .24, 1);
      x.fillStyle = K.chrome; rrect(x, -.12, -.56, .24, .08, .02); x.fill();                                                // the blower
      x.fillStyle = mix(K.chrome, K.tire, .4); for (let i = 0; i < 4; i++) x.fillRect(-.1 + i * .058, -.62, .03, .07);     // the stacks
      x.fillStyle = K.tire; for (let i = 0; i < 4; i++) x.fillRect(-.095 + i * .058, -.625, .02, .012);
      const body = [[-.3, -.1], [-.31, -.28], [.31, -.28], [.3, -.1], [.3, -.08, .26, -.08], [-.26, -.08], [-.3, -.08, -.3, -.1]];
      const cab = [[-.25, -.278], [-.22, -.46], [.22, -.46], [.25, -.278]];
      path(x, cab); fillPaint(x, pal.roof, -.46, -.28);
      path(x, body); fillPaint(x, pal, -.28, -.08);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.31, -.46, .31, -.08], [-.28, -.27, .28, -.12]);
      glass(x, K, [[-.19, -.29], [-.17, -.43], [.17, -.43], [.19, -.29]]);
      x.fillStyle = K.chrome; x.fillRect(-.33, -.12, .66, .025);                                                          // the nerf bar
      shine(x, pal, [[-.3, -.27], [.3, -.27]]);
      tail(x, K, [['o', -.25, -.2, .03], ['o', .25, -.2, .03]], o.braking);
      exhausts(x, K, EXHAUSTS.hotrod); plate(x, K, -.17, .12); num(x, K, o, 0, -.205, .035);
    },
    /** Kart: tiny and low, the driver on show (helmet and shoulders), a big rear bumper, fat little wheels */
    kart(x, K, pal, o) {
      shadow(x, .55, .06);
      tire(x, K, -.48, -.15, .17, .15, -1); tire(x, K, .31, -.15, .17, .15, 1);
      x.fillStyle = mix(K.tire, K.chrome, .3); x.fillRect(-.32, -.1, .64, .03);                                           // the axle
      x.fillStyle = pal.darker; rrect(x, -.09, -.36, .18, .12, .03); x.fill();                                             // the driver's back
      x.fillStyle = pal.roof.paint; x.beginPath(); x.arc(0, -.41, .075, 0, 7); x.fill();                                   // the helmet
      x.fillStyle = alpha(K.white, .55); x.beginPath(); x.arc(-.025, -.43, .025, 0, 7); x.fill();
      x.fillStyle = K.tire; x.fillRect(-.075, -.4, .15, .02);
      const body = [[-.24, -.12], [-.22, -.24], [.22, -.24], [.24, -.12], [.2, -.1], [-.2, -.1]];
      path(x, body); fillPaint(x, pal, -.24, -.1);
      decal(x, K, pal, o, P2(body), [-.24, -.24, .24, -.1]);
      x.fillStyle = mix(K.tire, K.tread, .6); rrect(x, -.3, -.09, .6, .05, .02); x.fill();                                 // the rear bumper
      shine(x, pal, [[-.22, -.235], [.22, -.235]]);
      tail(x, K, [['o', -.16, -.07, .018], ['o', .16, -.07, .018]], o.braking);
      num(x, K, o, 0, -.17, .04);
    },
    /** Supercar: very low and wide, a small glasshouse, quad lamps, a huge diffuser and a low wing */
    supercar(x, K, pal, o) {
      shadow(x, .64, .07);
      tire(x, K, -.5, -.15, .2, .15, -1); tire(x, K, .3, -.15, .2, .15, 1);
      const body = [[-.5, -.06], [-.5, -.2], [-.44, -.25], [.44, -.25], [.5, -.2], [.5, -.06]];
      const cab = [[-.2, -.248], [-.14, -.34], [.14, -.34], [.2, -.248]];
      path(x, body); fillPaint(x, pal, -.25, -.06);
      path(x, cab); fillPaint(x, pal.roof, -.34, -.25);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.5, -.34, .5, -.06], [-.44, -.24, .44, -.12]);
      glass(x, K, [[-.16, -.255], [-.12, -.325], [.12, -.325], [.16, -.255]]);
      if (own(o)) { x.fillStyle = pal.roof.darker; rrect(x, -.46, -.29, .92, .025, .008); x.fill(); x.fillStyle = pal.roof.light; x.fillRect(-.46, -.29, .92, .005); }
      shine(x, pal, [[-.49, -.2], [-.44, -.245], [.44, -.245], [.49, -.2]]);
      tail(x, K, [['r', -.46, -.2, .12, .025], ['r', -.32, -.2, .08, .025], ['r', .24, -.2, .08, .025], ['r', .34, -.2, .12, .025]], o.braking);
      diffuser(x, K, -.38, .38, -.12, -.05, 9); exhausts(x, K, EXHAUSTS.supercar); plate(x, K, -.155, .12); num(x, K, o, -.3, -.15, .035);
    },
    /** Monster Truck: HUGE tires, the body lifted high on its suspension (still one lane wide) */
    monster(x, K, pal, o) {
      shadow(x, .62, .08);
      tire(x, K, -.5, -.42, .3, .42, -1, true); tire(x, K, .2, -.42, .3, .42, 1, true);
      x.strokeStyle = mix(K.chrome, K.tire, .3); x.lineWidth = .02;                                                         // the suspension
      x.beginPath(); x.moveTo(-.2, -.2); x.lineTo(-.08, -.4); x.moveTo(.2, -.2); x.lineTo(.08, -.4); x.moveTo(-.2, -.22); x.lineTo(.2, -.22); x.stroke();
      const body = [[-.4, -.36], [-.41, -.5], [.41, -.5], [.4, -.36], [.36, -.34], [-.36, -.34]];
      const cab = [[-.3, -.5], [-.26, -.63], [.26, -.63], [.3, -.5]];
      path(x, body); fillPaint(x, pal, -.5, -.34);
      path(x, cab); fillPaint(x, pal.roof, -.63, -.5);
      const clip = P2(body); clip.addPath(P2(cab));
      decal(x, K, pal, o, clip, [-.41, -.63, .41, -.34], [-.38, -.49, .38, -.37]);
      glass(x, K, [[-.25, -.505], [-.22, -.61], [.22, -.61], [.25, -.505]]);
      shine(x, pal, [[-.4, -.49], [.4, -.49]]);
      tail(x, K, [['r', -.38, -.47, .1, .04], ['r', .28, -.47, .1, .04]], o.braking);
      exhausts(x, K, EXHAUSTS.monster); plate(x, K, -.42, .12); num(x, K, o, .22, -.415, .035);
    },
    /** Retro Hover: 1970s future: a rounded pod with a bubble dome, tail fins and one big round thruster, floating */
    retrohover(x, K, pal, o) {
      shadow(x, .5, .05);
      const g = x.createRadialGradient(0, -.01, 0, 0, -.01, .45); g.addColorStop(0, alpha(K.pink, .4)); g.addColorStop(1, alpha(K.pink, 0));
      x.save(); x.scale(1, .18); x.fillStyle = g; x.fillRect(-.45, -.06 / .18 - .45, .9, .9); x.restore();
      x.translate(0, -HOVER_LIFT);
      [-1, 1].forEach(sd => { path(x, [[sd * .3, -.2], [sd * .46, -.42], [sd * .4, -.16]]); fillPaint(x, pal.roof, -.42, -.16); });   // the fins
      const body = [[-.42, -.14], [-.42, -.3, 0, -.32], [.42, -.3, .42, -.14], [.42, -.06, 0, -.06], [-.42, -.06, -.42, -.14]];
      path(x, body); fillPaint(x, pal, -.32, -.06);
      decal(x, K, pal, o, P2(body), [-.42, -.32, .42, -.06]);
      glass(x, K, [[-.2, -.3], [-.2, -.46, 0, -.46], [.2, -.46, .2, -.3]]);
      shine(x, pal, [[-.38, -.24], [0, -.315], [.38, -.24]]);
      const tg = x.createRadialGradient(0, -.14, 0, 0, -.14, .12); tg.addColorStop(0, alpha(K.pink, .9)); tg.addColorStop(1, alpha(K.pink, 0));
      x.fillStyle = tg; x.fillRect(-.12, -.26, .24, .24);
      x.fillStyle = K.chrome; x.beginPath(); x.arc(0, -.14, .07, 0, 7); x.fill();
      x.fillStyle = mix(K.pink, K.white, .4); x.beginPath(); x.arc(0, -.14, .045, 0, 7); x.fill();
      tail(x, K, [['o', -.3, -.18, .025], ['o', .3, -.18, .025]], o.braking);
      num(x, K, o, -.2, -.24, .035);
    },
    /** Bumper Car: round and friendly: a thick rubber bumper ring, a seat back, a pole with a little spark on top */
    bumper(x, K, pal, o) {
      shadow(x, .56, .07);
      x.strokeStyle = mix(K.chrome, K.tire, .4); x.lineWidth = .014; x.beginPath(); x.moveTo(.18, -.3); x.lineTo(.2, -.6); x.stroke();   // the pole
      x.fillStyle = K.star; x.beginPath(); x.arc(.2, -.61, .02, 0, 7); x.fill();
      const body = [[-.44, -.12], [-.44, -.3, 0, -.34], [.44, -.3, .44, -.12], [.44, -.08, 0, -.08], [-.44, -.08, -.44, -.12]];
      path(x, body); fillPaint(x, pal, -.34, -.08);
      decal(x, K, pal, o, P2(body), [-.44, -.34, .44, -.08]);
      x.fillStyle = pal.roof.darker; rrect(x, -.16, -.44, .32, .16, .06); x.fill();                                          // the seat back
      x.fillStyle = alpha(K.white, .25); rrect(x, -.13, -.42, .26, .03, .015); x.fill();
      shine(x, pal, [[-.4, -.24], [0, -.33], [.4, -.24]]);
      x.fillStyle = mix(K.tire, K.tread, .5); rrect(x, -.49, -.13, .98, .1, .05); x.fill();                                   // the rubber bumper ring
      x.strokeStyle = alpha(K.chrome, .35); x.lineWidth = .006; x.beginPath(); x.moveTo(-.46, -.08); x.lineTo(.46, -.08); x.stroke();
      tail(x, K, [['o', -.28, -.2, .028], ['o', .28, -.2, .028]], o.braking);
      num(x, K, o, 0, -.2, .045);
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
    path(x, body); fillPaint(x, pal, -.3, -.06);
    decal(x, K, pal, o, P2(body), [-.18, -.3, .18, -.06]);
    x.fillStyle = mix(pal.darker, K.tire, .4); path(x, [[-.06, -.3], [-.045, -.39], [.045, -.39], [.06, -.3]]); x.fill();   // the airbox
    x.fillStyle = pal.light; x.beginPath(); x.arc(0, -.335, .05, Math.PI, 0); x.fill();                                    // the helmet
    shine(x, pal, [[-.17, -.21], [-.1, -.295], [.1, -.295], [.17, -.21]]);
    const wg = x.createLinearGradient(0, -.53, 0, -.475);
    wg.addColorStop(0, pal.roof.light); wg.addColorStop(1, pal.roof.dark);
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
    const numbered = o.decal === 'number' || body === 'stock';
    const key = [body, o.color, o.finish || 'gloss', o.color2 || '', o.decal || 'none', o.dcolor || '', numbered ? o.number : '', o.rims || '', o.spoiler || '',
      px >= 60 ? plateText(o.plate) : '', px, o.sky || '', o.braking ? 1 : 0].join('|');
    let s = cache.get(key);
    if (s) return s;
    if (cache.size > 220) cache.clear();
    const K = tokens(), cv = document.createElement('canvas');
    cv.width = Math.ceil((R - L) * px); cv.height = Math.ceil((BOT - TOP) * px);
    const x = cv.getContext('2d');
    x.translate(-L * px, -TOP * px); x.scale(px, px);
    const palOf = (c, finish) => {
      const d0 = lum(c) < DARK;
      return {paint: c, light: mix(c, '#fff', d0 ? .62 : .45), dark: mix(c, '#000', d0 ? .25 : .38), darker: mix(c, '#000', d0 ? .45 : .66), sky: o.sky || K.white,
        finish, px, pearl: K.pearl, dark0: d0, rim: mix(o.sky || K.rimLight, K.rimLight, .6)};
    };
    const pal = palOf(o.color || K.white, o.finish || 'gloss');
    pal.roof = o.color2 ? palOf(o.color2, o.finish || 'gloss') : pal;
    CUR = {rims: o.rims, plate: o.plate, px, rimColor: o.glowColor};
    const oo = Object.assign({}, o, {body});
    BODIES[body](x, K, pal, oo);
    x.setTransform(1, 0, 0, 1, 0, 0); x.translate(-L * px, -TOP * px); x.scale(px, px);     // (a body may have moved the origin: the hovers)
    if (DECK[body]) { x.save(); if (body === 'hover' || body === 'retrohover') x.translate(0, -HOVER_LIFT); spoiler(x, K, pal, oo); x.restore(); }
    // DARK PAINTS: a light rim around the whole car, drawn behind it, so it never disappears into a dark road
    if (pal.dark0 || pal.roof.dark0) {
      const rim = document.createElement('canvas'); rim.width = cv.width; rim.height = cv.height;
      const r = rim.getContext('2d'); r.drawImage(cv, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = alpha(pal.rim, .9); r.fillRect(0, 0, rim.width, rim.height);
      const d = Math.max(1, px * .012);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-over';
      [[d, 0], [-d, 0], [0, -d], [d * .7, -d * .7], [-d * .7, -d * .7]].forEach(([dx, dy]) => x.drawImage(rim, dx, dy));
      x.globalCompositeOperation = 'source-over';
    }
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
    const K = tokens(), ex = EXHAUSTS[o.body] || EXHAUSTS.coupe;
    if (o.glow && o.glow !== 'none') {                                                                              // UNDERGLOW on the road
      const gc = K[o.glow] || K.cyan, spr = glowSprite(gc);
      if (o.lite) { ctx.globalAlpha = .35 * (o.alpha != null ? o.alpha : 1); ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(x, y - w * .01, w * .5, w * .06, 0, 0, 7); ctx.fill(); }
      else ctx.drawImage(spr, x - w * .66, y - w * .12, w * 1.32, w * .2);
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    }
    ctx.drawImage(s.cv, x - s.ax * k, y - s.ay * k + dy, s.cv.width * k, s.cv.height * k);
    if (o.body === 'hover' && !o.reduced && o.t != null) {                                                         // the thrusters shimmer
      ctx.globalAlpha = (o.alpha != null ? o.alpha : 1) * (.25 + .2 * Math.sin(o.t / 90));
      ctx.fillStyle = K.nitro;
      ex.forEach(([e, f]) => { ctx.beginPath(); ctx.arc(x + e * w, y + (f) * w, w * .05, 0, 7); ctx.fill(); });
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    }
    if (o.nitro) {                                                                                                  // nitro flames from the exhausts
      const rainbow = [K.pink, K.amber, K.yellow, K.green, K.cyan, K.purple];
      ctx.fillStyle = o.flame === 'rainbow' ? rainbow[Math.floor(((o.t || 0) / 400) % rainbow.length)] : FLAME[o.flame] ? K[FLAME[o.flame]] : K.orange;
      ctx.globalAlpha = .85 * (o.alpha != null ? o.alpha : 1);
      ex.forEach(([e, f]) => {
        const fx = x + e * w, fy = y + f * w + dy, len = w * (.1 + (o.reduced ? 0 : Math.random() * .08));
        ctx.beginPath(); ctx.moveTo(fx - w * .03, fy); ctx.lineTo(fx, fy + len); ctx.lineTo(fx + w * .03, fy); ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  }
  const FLAME = {orange: 'orange', blue: 'blue', green: 'green', purple: 'purple'};   // (rainbow: a slow color cycle, 2.5 colors a second)
  /** the underglow: a soft ellipse of light, drawn once per color */
  const glows = new Map();
  function glowSprite(c) {
    if (glows.has(c)) return glows.get(c);
    const cv = document.createElement('canvas'); cv.width = 132; cv.height = 20;
    const g = cv.getContext('2d'); g.scale(1, 20 / 132);
    const r = g.createRadialGradient(66, 66, 0, 66, 66, 66); r.addColorStop(0, alpha(c, .75)); r.addColorStop(.6, alpha(c, .3)); r.addColorStop(1, alpha(c, 0));
    g.fillStyle = r; g.fillRect(0, 0, 132, 132); glows.set(c, cv); return cv;
  }

  /* ---------- THE SIDE VIEW (the garage's preview toggle): one profile per body from SIDE, the look's paint, finish,
     two-tone roof, the decal on the door, the chosen RIMS, the spoiler at the back. Units: car lengths (x −.5 … .5) ---------- */
  // [ride height, body top, cabin [from, to, height], wheel radius, [rear, front] wheel x, hood drop, tall (roof rack / bed)]
  const SIDE = {
    coupe: [.06, .16, [-.28, .12, .27], .085, [-.32, .32], .03], mini: [.05, .15, [-.3, .2, .3], .07, [-.3, .3], .02], muscle: [.05, .15, [-.25, .1, .25], .095, [-.32, .33], .02],
    wagon: [.06, .17, [-.45, .15, .32], .08, [-.32, .32], .03], buggy: [.12, .2, [-.2, .15, .38], .12, [-.33, .33], .05], openwheel: [.06, .13, [-.1, .05, .22], .1, [-.36, .36], .06],
    maestro: [.06, .13, [-.1, .05, .22], .1, [-.36, .36], .06], hover: [.1, .17, [-.1, .15, .24], 0, [0, 0], .05], pickup: [.08, .2, [-.05, .25, .36], .1, [-.32, .32], .03],
    rally: [.08, .17, [-.35, .15, .3], .09, [-.32, .32], .03], stock: [.05, .16, [-.25, .12, .27], .09, [-.33, .33], .02], hotrod: [.07, .16, [-.3, 0, .3], .11, [-.35, .34], .06],
    kart: [.04, .09, [-.1, .05, .17], .06, [-.34, .34], .03], supercar: [.04, .12, [-.2, .12, .2], .085, [-.32, .33], .04], monster: [.26, .38, [-.2, .2, .5], .2, [-.3, .3], .03],
    retrohover: [.1, .2, [-.15, .15, .3], 0, [0, 0], .04], bumper: [.04, .18, [-.12, .1, .3], .05, [-.25, .25], .02]};
  function wheel(x, K, cx, cy, r, rim, glowC) {
    x.fillStyle = K.tire; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    if (rim === 'offroad') { x.fillStyle = K.tire; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.fillRect(cx + Math.cos(a) * r - r * .09, cy + Math.sin(a) * r - r * .09, r * .18, r * .18); } }
    if (rim === 'whitewall') { x.strokeStyle = K.white; x.lineWidth = r * .16; x.beginPath(); x.arc(cx, cy, r * .72, 0, 7); x.stroke(); }
    const rr = r * .58, col = rim === 'gold' ? K.gold : K.chrome;
    x.fillStyle = rim === 'disc' ? mix(K.chrome, K.white, .2) : mix(K.tire, K.tread, .6); x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill();
    x.strokeStyle = col; x.lineWidth = r * .08;
    if (rim === 'classic') for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.stroke(); }
    else if (rim === 'fivestar' || rim === 'gold' || rim === 'offroad') { x.lineWidth = r * .16; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 - 1.57; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); x.stroke(); } }
    else if (rim === 'turbine') { x.lineWidth = r * .07; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(a) * rr * .3, cy + Math.sin(a) * rr * .3); x.quadraticCurveTo(cx + Math.cos(a + .5) * rr * .7, cy + Math.sin(a + .5) * rr * .7, cx + Math.cos(a + .9) * rr, cy + Math.sin(a + .9) * rr); x.stroke(); } }
    else if (rim === 'neonrim') { x.save(); x.shadowColor = glowC || K.cyan; x.shadowBlur = r * 1.2; x.strokeStyle = glowC || K.cyan; x.lineWidth = r * .1; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke(); x.restore(); }
    x.strokeStyle = col; x.lineWidth = r * .07; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke();
    x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r * .12, 0, 7); x.fill();
  }
  function side(ctx, X, Y, W, o) {
    const K = tokens(), body = SIDE[o.body] ? o.body : 'coupe', [ride, top, [c0, c1, ch], wr, [wx0, wx1], drop] = SIDE[body];
    const d0 = lum(o.color || K.white) < DARK, pc = o.color || K.white;
    const pal = {paint: pc, light: mix(pc, '#fff', d0 ? .62 : .45), dark: mix(pc, '#000', d0 ? .25 : .38), darker: mix(pc, '#000', .6), sky: o.sky || K.white, finish: o.finish || 'gloss', px: W, pearl: K.pearl, dark0: d0, rim: K.rimLight};
    pal.roof = o.color2 ? Object.assign({}, pal, {paint: o.color2, light: mix(o.color2, '#fff', .45), dark: mix(o.color2, '#000', .38), darker: mix(o.color2, '#000', .6)}) : pal;
    ctx.save(); ctx.translate(X, Y); ctx.scale(W, W);
    const hover = !wr, lift = hover ? .06 : 0;
    // the shadow
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, .55); sg.addColorStop(0, 'rgba(0,0,0,.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.scale(1, .08); ctx.fillStyle = sg; ctx.fillRect(-.55, -.55, 1.1, 1.1); ctx.restore();
    if (o.glow && o.glow !== 'none') { ctx.drawImage(glowSprite(K[o.glow] || K.cyan), -.55, -.04, 1.1, .08); }
    ctx.translate(0, -lift);
    const b = -ride, t = -top - ride * .2;
    const bodyP = [[-.5, b], [-.5, t + .02], [-.47, t], [.3, t + drop * .3], [.49, t + drop], [.5, b + .01]];
    const cab = [[c0, t + .002], [c0 + .06, t - ch * .45], [c1 - .06, t - ch * .45], [c1 + .08, t + .002]];
    if (body !== 'openwheel' && body !== 'maestro' && body !== 'kart') { path(ctx, cab); fillPaint(ctx, pal.roof, t - ch * .45, t); glass(ctx, K, [[c0 + .03, t - .005], [c0 + .075, t - ch * .4], [c1 - .07, t - ch * .4], [c1 + .05, t - .005]]); }
    path(ctx, bodyP); fillPaint(ctx, pal, t, b);
    decal(ctx, K, pal, Object.assign({}, o, {decal: o.decal === 'number' ? 'none' : o.decal}), P2(bodyP), [-.5, t, .5, b], [-.3, t + .01, .2, b]);
    if (body === 'kart' || body === 'openwheel' || body === 'maestro') { ctx.fillStyle = pal.roof.paint; ctx.beginPath(); ctx.arc(-.05, t - .06, .06, 0, 7); ctx.fill(); }   // the driver's helmet
    if (o.decal === 'number') num(ctx, K, o, -.02, (t + b) / 2, Math.min(.07, (b - t) * .4));
    shine(ctx, pal, [[-.47, t + .004], [.3, t + drop * .3 + .004]]);
    ctx.fillStyle = K.tail; ctx.fillRect(-.505, t + .015, .02, .03);                                                        // the tail light
    ctx.fillStyle = K.white; ctx.fillRect(.485, t + drop + .01, .018, .025);                                               // the headlight
    // the spoiler at the back
    const sp = o.spoiler && o.spoiler !== 'stock' ? o.spoiler : (OWN_SPOILER[body] || 'none');
    if (sp === 'lip') { ctx.fillStyle = pal.roof.dark; ctx.fillRect(-.5, t - .02, .12, .02); }
    else if (sp === 'ducktail') { path(ctx, [[-.5, t], [-.53, t - .035], [-.36, t - .005]]); ctx.fillStyle = pal.roof.dark; ctx.fill(); }
    else if (sp === 'wing' || sp === 'tall') { const hh = sp === 'tall' ? .14 : .07; ctx.fillStyle = pal.roof.darker; ctx.fillRect(-.44, t - hh, .02, hh); ctx.fillStyle = pal.roof.dark; rrect(ctx, -.52, t - hh - .025, .2, .028, .01); ctx.fill(); }
    if (!hover) [wx0, wx1].forEach(wx => wheel(ctx, K, wx, -wr - (body === 'monster' ? 0 : 0), wr, o.rims || 'classic', K[o.glow] || null));
    else { ctx.fillStyle = alpha(K.nitro, .6); ctx.fillRect(-.3, -.005 + lift - .01, .6, .01); }
    ctx.restore();
  }
  /** a rim close-up picture (the garage's WHEELS tiles) */
  const rimURLs = new Map();
  function rimURL(style, px = 72) {
    const key = style + '|' + px; if (rimURLs.has(key)) return rimURLs.get(key);
    const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d');
    x.scale(px, px); wheel(x, tokens(), .5, .5, .46, style, null);
    const u = cv.toDataURL(); rimURLs.set(key, u); return u;
  }
  /** a still picture of a car (the garage's option tiles, the results screen); locked = a dark silhouette */
  const urls = new Map();
  function thumbURL(o, w, {locked} = {}) {
    const key = JSON.stringify([o.body, o.color, o.finish, o.color2, o.decal, o.dcolor, o.number, o.rims, o.spoiler, o.glow, w, o.sky, !!locked]);
    if (urls.has(key)) return urls.get(key);
    const dpr = Math.min(2, devicePixelRatio || 1), s = sprite(Object.assign({}, o, {w, dpr}));
    const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height;
    const x = cv.getContext('2d'); x.drawImage(s.cv, 0, 0);
    if (locked) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = tokens().deep; x.globalAlpha = .94; x.fillRect(0, 0, cv.width, cv.height); }
    const u = cv.toDataURL(); urls.set(key, u); return u;
  }
  /** how tall the side view stands, in car lengths (the garage fits its preview to it) */
  const sideHeight = body => { const v = SIDE[body] || SIDE.coupe; return v[0] + v[1] + v[2][2] * .45 + .08; };
  A.SpeedwayCars = {draw, side, sideHeight, sprite, thumbURL, rimURL, lum, DARK, BODIES: BODY_IDS, EXHAUSTS, bucket, stats: () => ({cached: cache.size, builds}), reset: () => { cache.clear(); urls.clear(); T = null; }};
})(window.Arcade);
