/* Sustain Speedway: THE SCENERY (Arcade.SpeedwayScene). The road itself is drawn by game.js; this file holds what
   makes each track feel like a place and the car feel fast, all 2D canvas and cheap:
     TIMES     each track's time of day and light (levels.js `time`): the sky's colors, the sun / moon, stars,
               streetlights, the ground, and the rim light on the cars
     sky()     the sky (gradient, stars, sun or moon) drawn ONCE per size into an offscreen canvas, then only copied
     sprite()  every roadside thing (streetlights, palms, pines, cacti, rocks, buoys, grandstands, banners and the
               seasonal ones: jack-o'-lanterns, string lights, flowers…) drawn ONCE per kind into a 96 px sprite
     propsFor  which things line the road for a track (+ the SEASONAL touches, shared/seasons.js)
     Particles a small capped pool: tire smoke, confetti, sparkles, snow, petals, leaves, rain, bats, notes, hearts
     flag() / gate()  the checkered flag waving as you cross, and the finish gate on the last lap
   SEASONAL TOUCHES follow the arcade's SEASONAL LOOK (Arcade.Seasons.look(): an event or a background-only season)
   and switch off with the student's "Seasonal look" switch; ?season=<id> previews one (like the menus).
   PHOTOSENSITIVITY: nothing flashes; sparkles fade in and out over ≥ 0.4 s; every color is a theme token. */
(function (A) {
  'use strict';
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const TAU = Math.PI * 2;

  /* ---------- TIMES OF DAY ----------
     sky [top, middle, low] (tokens), body 'sun' | 'sun-low' | 'sun-high' | 'moon' | 'none', stars, lights (streetlights
     on), ground (token), grid (how bright the ground grid is), rim (the token the cars' rim light takes), shade (a dark
     wash over the scenery: 0 = none) */
  const TIMES = {
    sunset: {sky: ['sw-sky-top', 'sw-sky-mid', 'sw-sky-low'], body: 'sun', stars: false, lights: false, ground: 'sw-ground', grid: 1, rim: 'sw-sky-low', shade: 0},
    golden: {sky: ['sw-sky-mid', 'sw-sun-2', 'sw-golden-low'], body: 'sun-low', stars: false, lights: false, ground: 'sw-ground', grid: .8, rim: 'sw-golden-low', shade: 0},
    dusk:   {sky: ['sw-sky-top', 'sw-sky-mid', 'sw-dusk-low'], body: 'sun-low', stars: true, lights: true, ground: 'sw-ground', grid: 1, rim: 'sw-dusk-low', shade: .1},
    dawn:   {sky: ['sw-dawn-top', 'sw-dawn-mid', 'sw-dawn-low'], body: 'sun-low', stars: false, lights: false, ground: 'sw-ground', grid: .6, rim: 'sw-dawn-low', shade: 0},
    noon:   {sky: ['sw-noon-top', 'sw-noon-mid', 'sw-noon-low'], body: 'sun-high', stars: false, lights: false, ground: 'sw-noon-ground', grid: .35, rim: 'sw-noon-low', shade: 0},
    night:  {sky: ['sw-sky-top', 'sw-sky-top', 'sw-night-low'], body: 'moon', stars: true, lights: true, ground: 'sw-ground', grid: 1, rim: 'sw-night-low', shade: .2},
    neon:   {sky: ['sw-neon-top', 'sw-neon-mid', 'sw-neon-low'], body: 'none', stars: true, lights: true, ground: 'sw-ground', grid: 1.2, rim: 'sw-neon-low', shade: .15},
  };
  const timeOf = L => TIMES[L.time] || TIMES[L.sky === 'night' ? 'night' : L.sky === 'dusk' ? 'dusk' : 'sunset'];

  /* ---------- THE SKY: drawn once per (time, size), 20 % wider than the screen so it can slide with the bends ---------- */
  const skies = new Map();
  function sky(L, W, hor) {
    const T = timeOf(L), key = `${L.time || L.sky}|${Math.round(W)}|${Math.round(hor)}`;
    if (skies.has(key)) return skies.get(key);
    const w = Math.ceil(W * 1.2), h = Math.ceil(hor + 1), c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, css(T.sky[0])); gr.addColorStop(.55, css(T.sky[1])); gr.addColorStop(1, css(T.sky[2]));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (T.stars) {
      g.fillStyle = css('sw-star');
      for (let i = 0; i < 70; i++) { g.globalAlpha = .25 + (i % 5) / 7; g.fillRect((i * 173.3) % w, ((i * 53) % 100) / 100 * h * .75, 1.5, 1.5); }
      g.globalAlpha = 1;
    }
    if (T.body === 'moon') {
      g.fillStyle = css('sw-moon'); g.beginPath(); g.arc(w * .72, h * .3, Math.min(W, hor * 2) * .045, 0, TAU); g.fill();
    } else if (T.body !== 'none') {
      const sr = Math.min(W * (T.body === 'sun-high' ? .07 : .16), h * .62);
      const sx = w / 2, sy = T.body === 'sun-high' ? h * .28 : T.body === 'sun-low' ? h - sr * .45 : h - sr * .15;
      const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr);
      sg.addColorStop(0, css('sw-sun-1')); sg.addColorStop(1, css(T.body === 'sun-high' ? 'sw-sun-1' : 'sw-sun-2'));
      if (T.body === 'sun-high') {                                  // a bright noon sun with a soft halo
        const halo = g.createRadialGradient(sx, sy, sr * .8, sx, sy, sr * 3);
        halo.addColorStop(0, css('sw-haze')); halo.addColorStop(1, 'transparent');
        g.globalAlpha = .5; g.fillStyle = halo; g.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6); g.globalAlpha = 1;
      }
      g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.clip();
      g.fillStyle = sg; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      if (T.body !== 'sun-high') { g.fillStyle = gr; for (let i = 0; i < 6; i++) g.fillRect(sx - sr, sy - sr * .1 + i * sr * .16, sr * 2, 1.5 + i * 1.3); }   // synthwave stripes
      g.restore();
    }
    if (skies.size > 12) skies.clear();
    skies.set(key, c);
    return c;
  }

  /* ---------- ROADSIDE SPRITES: drawn once per kind at a 96 px reference height ---------- */
  const sprites = new Map();
  const H0 = 96;
  const DRAW = {
    lamp(g, lit) {                                                // a streetlight leaning over the road (drawn for the LEFT side)
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(6, 10, 4, 86); g.fillRect(6, 10, 30, 3);
      g.fillStyle = lit ? css('sw-lamp') : css('sw-chrome'); g.fillRect(30, 12, 10, 4);
      if (lit) { const r = g.createRadialGradient(35, 16, 1, 35, 16, 22); r.addColorStop(0, css('sw-lamp')); r.addColorStop(1, 'transparent'); g.globalAlpha = .6; g.fillStyle = r; g.fillRect(12, 0, 46, 40); g.globalAlpha = 1; }
    },
    palm(g) {
      g.strokeStyle = css('sw-trunk'); g.lineWidth = 5; g.beginPath(); g.moveTo(20, 96); g.quadraticCurveTo(14, 50, 24, 22); g.stroke();
      g.fillStyle = css('sw-palm');
      [[-1, .2], [1, .1], [-1, -.5], [1, -.6], [0, -1]].forEach(([d, up]) => { g.beginPath(); g.moveTo(24, 22); g.quadraticCurveTo(24 + d * 16, 10 + up * 8, 24 + d * 24 + (d ? 0 : 2), 28 - up * 14); g.quadraticCurveTo(24 + d * 12, 18, 24, 24); g.fill(); });
    },
    pine(g, snow) {
      g.fillStyle = css('sw-trunk'); g.fillRect(18, 80, 6, 16);
      g.fillStyle = css('sw-pine');
      [[0, 34], [22, 28], [42, 22]].forEach(([y, hw]) => { g.beginPath(); g.moveTo(21, y); g.lineTo(21 + hw * .6, y + 38); g.lineTo(21 - hw * .6, y + 38); g.fill(); });
      if (snow) { g.fillStyle = css('sw-snow'); [[0, 34], [22, 28], [42, 22]].forEach(([y]) => { g.beginPath(); g.moveTo(21, y); g.lineTo(26, y + 9); g.lineTo(16, y + 9); g.fill(); }); }
    },
    cactus(g) {
      g.fillStyle = css('sw-cactus');
      const r = (x, y, w, h) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, w / 2) : g.rect(x, y, w, h); g.fill(); };
      r(16, 30, 10, 66); r(4, 48, 8, 24); r(4, 66, 16, 6); r(30, 40, 8, 22); r(24, 58, 14, 6);
    },
    rock(g) { g.fillStyle = css('sw-rock'); g.beginPath(); g.moveTo(0, 96); g.lineTo(8, 76); g.lineTo(22, 70); g.lineTo(36, 80); g.lineTo(42, 96); g.fill(); },
    buoy(g) { g.fillStyle = css('sw-buoy'); g.beginPath(); g.moveTo(10, 96); g.lineTo(14, 70); g.lineTo(26, 70); g.lineTo(30, 96); g.fill(); g.fillStyle = css('white-hi'); g.fillRect(12, 80, 16, 4); g.fillStyle = css('sw-lamp'); g.fillRect(18, 62, 4, 8); },
    sign(g) {                                                     // a neon sign on a post (the neon city)
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(14, 40, 4, 56);
      g.strokeStyle = css('pink'); g.lineWidth = 3; g.strokeRect(3, 10, 28, 30);
      g.strokeStyle = css('cyan'); g.lineWidth = 2; g.beginPath(); g.arc(17, 25, 8, 0, TAU); g.stroke();
    },
    stand(g) {                                                    // a grandstand chunk full of fans
      g.fillStyle = css('sw-stand'); g.beginPath(); g.moveTo(0, 96); g.lineTo(0, 40); g.lineTo(60, 20); g.lineTo(60, 96); g.fill();
      const cols = [css('sw-crowd-1'), css('sw-crowd-2'), css('sw-crowd-3')];
      for (let r = 0; r < 6; r++) for (let k = 0; k < 9; k++) { g.fillStyle = cols[(r * 7 + k * 3) % 3]; g.fillRect(3 + k * 6.3, 44 - r * 3.3 + r * 9 - k * 1.1 + 6, 3, 3); }
      g.fillStyle = css('red'); g.fillRect(0, 36, 60, 4);
    },
    banner(g) {                                                   // a race banner on two poles
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(2, 20, 3, 76); g.fillRect(55, 20, 3, 76);
      g.fillStyle = css('red'); g.fillRect(4, 20, 52, 16);
      g.fillStyle = css('white-hi'); for (let i = 0; i < 6; i++) g.fillRect(6 + i * 9, 24, 5, 8);
    },
    pumpkin(g) {                                                  // a friendly jack-o'-lantern
      g.fillStyle = css('sw-pumpkin'); g.beginPath(); g.ellipse(20, 82, 18, 14, 0, 0, TAU); g.fill();
      g.fillStyle = css('sw-cactus'); g.fillRect(18, 64, 4, 6);
      g.fillStyle = css('sw-pumpkin-eye');
      g.beginPath(); g.moveTo(10, 80); g.lineTo(14, 74); g.lineTo(18, 80); g.fill(); g.beginPath(); g.moveTo(22, 80); g.lineTo(26, 74); g.lineTo(30, 80); g.fill();
      g.beginPath(); g.moveTo(10, 86); g.quadraticCurveTo(20, 94, 30, 86); g.lineTo(26, 88); g.lineTo(20, 90); g.lineTo(14, 88); g.fill();
    },
    bulbs(g) {                                                    // string lights on a post
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(4, 20, 3, 76);
      g.strokeStyle = css('sw-lamp-pole'); g.lineWidth = 1; g.beginPath(); g.moveTo(6, 22); g.quadraticCurveTo(30, 40, 58, 22); g.stroke();
      ['red', 'green', 'yellow', 'cyan', 'pink'].forEach((c, i) => { const t = (i + 1) / 6, x = 6 + 52 * t, y = 22 + 4 * (1 - (2 * t - 1) ** 2) * 4.5; g.fillStyle = css(c); g.beginPath(); g.arc(x, y + 3, 2.6, 0, TAU); g.fill(); });
    },
    flower(g) {
      g.strokeStyle = css('sw-palm'); g.lineWidth = 2; g.beginPath(); g.moveTo(14, 96); g.lineTo(14, 72); g.stroke();
      g.fillStyle = css('sw-petal'); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(14 + Math.cos(a) * 6, 66 + Math.sin(a) * 6, 4.5, 0, TAU); g.fill(); }
      g.fillStyle = css('yellow'); g.beginPath(); g.arc(14, 66, 3.5, 0, TAU); g.fill();
    },
    heart(g) {                                                    // a heart sign (Friendship Week)
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(12, 50, 4, 46);
      g.fillStyle = css('pink'); g.beginPath(); g.moveTo(14, 50); g.bezierCurveTo(-4, 36, 4, 18, 14, 30); g.bezierCurveTo(24, 18, 32, 36, 14, 50); g.fill();
    },
    note(g) {                                                     // a big eighth note on a post (Music In Our Schools Month)
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(12, 56, 4, 40);
      g.fillStyle = css('yellow'); g.beginPath(); g.ellipse(12, 50, 8, 6, -.4, 0, TAU); g.fill(); g.fillRect(17, 14, 3, 36);
      g.beginPath(); g.moveTo(20, 14); g.quadraticCurveTo(32, 22, 28, 36); g.quadraticCurveTo(28, 24, 20, 22); g.fill();
    },
    pennant(g) {                                                  // school pennant flags (Back to School)
      g.fillStyle = css('sw-lamp-pole'); g.fillRect(4, 20, 3, 76);
      ['amber', 'cyan', 'pink', 'green'].forEach((c, i) => { g.fillStyle = css(c); g.beginPath(); g.moveTo(8 + i * 13, 22); g.lineTo(20 + i * 13, 22); g.lineTo(14 + i * 13, 36); g.fill(); });
    },
    hay(g) { g.fillStyle = css('sw-sand'); g.fillRect(2, 74, 40, 22); g.fillStyle = css('sw-trunk'); g.fillRect(2, 80, 40, 2); g.fillRect(2, 88, 40, 2); },
  };
  const WIDTH = {lamp: 46, palm: 50, pine: 42, cactus: 42, rock: 42, buoy: 40, sign: 34, stand: 60, banner: 60, pumpkin: 40, bulbs: 62, flower: 28, heart: 30, note: 34, pennant: 62, hay: 44};
  function sprite(kind, lit) {
    const key = kind + (lit ? '+' : '');
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement('canvas'), w = WIDTH[kind] || 40;
    c.width = w * 2; c.height = H0 * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    (DRAW[kind] || DRAW.rock)(g, lit);
    sprites.set(key, c);
    return c;
  }

  /* ---------- WHICH THINGS LINE THE ROAD ----------
     base: by scene; lights: streetlights while the time of day has them; SEASONAL: shared/seasons.js's look */
  const SCENE_PROPS = {city: ['lamp'], river: ['lamp', 'buoy'], sunset: ['palm'], harbor: ['lamp', 'buoy'], mountain: ['pine', 'rock', 'pine'],
    desert: ['cactus', 'rock'], grandprix: ['stand', 'banner', 'stand']};
  /* the SEASONAL touches, one entry per look (shared/seasons.js): props along the road, particles in the air, fog */
  const SEASON_FX = {
    spooky:     {props: ['pumpkin'], air: 'bat', fog: true},
    winter:     {props: ['bulbs', 'snowpine'], air: 'snow'},
    frost:      {props: ['snowpine'], air: 'snow'},
    friendship: {props: ['heart'], air: 'heart'},
    miosm:      {props: ['note'], air: 'note'},
    spring:     {props: ['flower'], air: 'petal'},
    summer:     {props: ['palm'], air: null},
    school:     {props: ['pennant'], air: null},
    harvest:    {props: ['hay', 'pumpkin'], air: 'leaf'},
    concert:    {props: ['bulbs'], air: 'note'},
  };
  /** the seasonal look to show in a race today (null = none / the student's Seasonal look switch is off) */
  function season() {
    const S = A.Seasons; if (!S || !S.look) return null;
    let l = null; try { l = S.look(); } catch (e) { return null; }
    if (!l || !SEASON_FX[l.look]) return null;
    if (!l.preview && S.lookOn && !S.lookOn()) return null;
    return Object.assign({id: l.look, name: l.name}, SEASON_FX[l.look]);
  }
  function propsFor(L, sea) {
    const T = timeOf(L), base = (SCENE_PROPS[L.scene] || ['lamp']).slice();
    if (T.lights && !base.includes('lamp') && L.scene !== 'grandprix') base.push('lamp');
    const out = base.map(k => ({kind: k, lit: T.lights}));
    if (sea) sea.props.forEach(k => out.push(k === 'snowpine' ? {kind: 'pine', snow: true} : {kind: k, lit: T.lights}));
    return out;
  }
  const propSprite = p => sprite(p.kind, p.kind === 'pine' ? !!p.snow : !!p.lit);   // (a pine's flag = its snow)

  /* ---------- PARTICLES: a small capped pool (screen coordinates) ---------- */
  function Particles(max) {
    const list = [];
    return {
      list,
      get n() { return list.length; },
      add(p) { if (list.length < max) list.push(Object.assign({age: 0, life: 1, vx: 0, vy: 0, r: 3, rot: 0, vr: 0}, p)); },
      clear() { list.length = 0; },
      step(dt, W, H) {
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.grow) p.r += p.grow * dt;
          if (p.sway) p.x += Math.sin(p.age * p.sway) * 12 * dt;
          if (p.loop && p.y > H + 10) { p.y = -10; p.x = Math.random() * W; p.age = 0; }
          if (p.loop && (p.x < -30 || p.x > W + 30)) { p.x = p.vx > 0 ? -20 : W + 20; }
          if (!p.loop && p.age >= p.life) list.splice(i, 1);
        }
      },
      draw(g, C, only) {
        list.forEach(p => {
          if (only && !only(p)) return;
          const k = p.loop ? 1 : 1 - p.age / p.life;
          g.globalAlpha = Math.max(0, (p.a || 1) * (p.fadeIn ? Math.min(1, p.age / p.fadeIn) : 1) * (p.kind === 'smoke' ? k * k : p.kind === 'spark' ? Math.sin(Math.PI * Math.min(1, p.age / p.life)) : Math.min(1, k * 3)));
          g.fillStyle = p.color || C.white;
          const K = SHAPES[p.kind] || SHAPES.dot;
          K(g, p);
        });
        g.globalAlpha = 1;
      },
    };
  }
  const SHAPES = {
    dot: (g, p) => { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); },
    smoke: (g, p) => { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); },
    confetti: (g, p) => { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.r, -p.r * .5, p.r * 2, p.r); g.restore(); },
    petal: (g, p) => { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.ellipse(0, 0, p.r, p.r * .55, 0, 0, TAU); g.fill(); g.restore(); },
    leaf: (g, p) => { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); g.moveTo(-p.r, 0); g.quadraticCurveTo(0, -p.r, p.r, 0); g.quadraticCurveTo(0, p.r, -p.r, 0); g.fill(); g.restore(); },
    rain: (g, p) => { g.fillRect(p.x, p.y, 1.2, p.r * 3); },
    spark: (g, p) => { star(g, p.x, p.y, p.r); },
    heart: (g, p) => { const r = p.r; g.beginPath(); g.moveTo(p.x, p.y + r); g.bezierCurveTo(p.x - r * 1.6, p.y, p.x - r * .6, p.y - r * 1.2, p.x, p.y - r * .3); g.bezierCurveTo(p.x + r * .6, p.y - r * 1.2, p.x + r * 1.6, p.y, p.x, p.y + r); g.fill(); },
    note: (g, p) => { g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * .7, -.4, 0, TAU); g.fill(); g.fillRect(p.x + p.r * .7, p.y - p.r * 3, 1.6, p.r * 3); },
    bat: (g, p) => {                                             // a little bat, wings flapping slowly (2 a second)
      const f = Math.sin(p.age * 12) * .5 + .5, r = p.r;
      g.beginPath(); g.moveTo(p.x, p.y);
      g.quadraticCurveTo(p.x - r, p.y - r * (.2 + f), p.x - r * 2, p.y - r * f * .6);
      g.quadraticCurveTo(p.x - r, p.y + r * .2, p.x, p.y + r * .4);
      g.quadraticCurveTo(p.x + r, p.y + r * .2, p.x + r * 2, p.y - r * f * .6);
      g.quadraticCurveTo(p.x + r, p.y - r * (.2 + f), p.x, p.y); g.fill();
    },
  };
  function star(g, cx, cy, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .35 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }

  /** the AIR (weather + seasonal particles) for a track: {kind, n, color token} or null */
  function airFor(L, sea) {
    if (sea && sea.air) return {kind: sea.air, n: sea.air === 'bat' ? 6 : 36};
    if (L.weather === 'rain') return {kind: 'rain', n: 60};
    return null;
  }
  const AIR_COLOR = {snow: 'sw-snow', petal: 'sw-petal', leaf: 'sw-leaf', rain: 'sw-fog', bat: 'purple', note: 'yellow', heart: 'pink'};
  /** keeps the ambient particles topped up (loop: they wrap around the screen) */
  function fillAir(P, air, W, H, hor) {
    if (!air) return;
    let have = P.list.filter(p => p.air).length;
    const C = css(AIR_COLOR[air.kind] || 'white-hi');
    while (have++ < air.n) {
      const k = air.kind, bat = k === 'bat';
      P.add({air: true, loop: true, kind: k, color: C, x: Math.random() * W, y: bat ? hor * (.2 + Math.random() * .6) : Math.random() * H,
        vx: bat ? (Math.random() < .5 ? -1 : 1) * (20 + Math.random() * 25) : k === 'rain' ? -30 : (Math.random() - .5) * 20,
        vy: bat ? 0 : k === 'rain' ? 380 + Math.random() * 120 : k === 'note' || k === 'heart' ? -(12 + Math.random() * 14) : 22 + Math.random() * 30,
        r: bat ? 5 + Math.random() * 3 : k === 'rain' ? 4 : k === 'note' || k === 'heart' ? 4 + Math.random() * 2 : 1.4 + Math.random() * 2.2,
        vr: (Math.random() - .5) * 3, sway: k === 'rain' || bat ? 0 : 1 + Math.random() * 2, a: k === 'rain' ? .45 : bat ? .9 : .8});
    }
    // notes and hearts float UP: wrap them from the top back to the bottom
    P.list.forEach(p => { if (p.air && p.vy < 0 && p.y < -10) { p.y = H + 5; p.x = Math.random() * W; } });
  }

  /* ---------- THE FINISH: the checkered gate across the road, and the flag waving as you cross ---------- */
  function checker(g, x, y, w, h, cols, rows, dark, light) {
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = (r + c) % 2 ? dark : light; g.fillRect(x + c * cw, y + r * ch, cw + .5, ch + .5); }
  }
  /** the finish gate at road point p (from game.js's proj): two posts at the road's edges and a checkered banner */
  function gate(g, p, C) {
    const hw = p.w * 1.18, top = p.y - p.w * 1.05, bh = Math.max(3, p.w * .16);
    g.fillStyle = C.chrome || C.white;
    g.fillRect(p.x - hw - p.w * .04, top, Math.max(1.5, p.w * .05), p.y - top); g.fillRect(p.x + hw - p.w * .01, top, Math.max(1.5, p.w * .05), p.y - top);
    checker(g, p.x - hw, top, hw * 2, bh, 16, 2, C.tire, C.white);
  }
  /** the checkered flag, waving (still with reduced motion): pole at x, top y, cloth width w */
  function flag(g, x, y, w, t, still, C) {
    const h = w * .66, cols = 8, rows = 5, cw = w / cols, ch = h / rows;
    g.fillStyle = C.chrome || C.white; g.fillRect(x - 3, y - 6, 4, h * 2.2);
    for (let c = 0; c < cols; c++) {
      const wave = still ? 0 : Math.sin(t / 160 - c * .7) * h * .08 * (c / cols);
      for (let r = 0; r < rows; r++) { g.fillStyle = (r + c) % 2 ? C.tire : C.white; g.fillRect(x + c * cw, y + r * ch + wave, cw + .6, ch + .6); }
    }
  }

  A.SpeedwayScene = {TIMES, timeOf, sky, sprite, propSprite, propsFor, season, SEASON_FX, Particles, airFor, fillAir, gate, flag, checker, WIDTH,
    reset() { skies.clear(); sprites.clear(); }};
})(window.Arcade);
