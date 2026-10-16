/* PEDAL POINT: THE PRACTICE ROOM (docs/games/pedal-point.md PRACTICE MODE). No stars, nothing in `games` progress.
   Set up 1–4 timpani, tune them (pedal, fine tuner, or a note from the drum's range), and PLAY them: a tap = a stroke
   (where on the head matters a little: the playing spot rings, the center thuds), press and hold = a roll, two fingers
   or ✋ = muffle; keys J K L ; (or F G H J). THE CLICK (a metronome), LOAD YOUR OWN SHEET MUSIC (kept on this device
   only, in IndexedDB), and the four PRACTICE ETUDES with HEAR IT and PLAY ALONG.
   NO MICROPHONE (Pedal Point never uses one): every sound is timpani.js's (through Sfx.output()) or the shared click kit
   (music-highway/backing.js). Arcade.PedalPoint.practice = the test hooks. */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'pedal-point';
  const D = A.PPDrums, T = A.Timpani, ROLL = T.ROLL, E = A.PPEtudes;

  /* ================= THE PRACTICE ROOM'S SETTINGS (Mr. Graham edits these) ================= */
  const PRACTICE = {
    // ONE TAP SETUPS: the drums (sizes from drums.js) and their notes, low to high
    presets: [
      {id: 'cf', name: 'C & F', sub: '26" + 23"', drums: [['26', 'C3'], ['23', 'F3']]},       // the default for 2 drums (Mr. Graham's setup)
      {id: 'bbf', name: 'B♭ & F', sub: '29" + 26"', drums: [['29', 'Bb2'], ['26', 'F3']]},
      {id: 'ebbb', name: 'E♭ & B♭', sub: '29" + 26"', drums: [['29', 'Bb2'], ['26', 'Eb3']]},
      {id: 'four', name: 'Four drums', sub: 'F B♭ C F', drums: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']]},
    ],
    // the drums a count starts with (before the student changes them), and their notes
    counts: {1: [['26', 'C3']], 2: [['26', 'C3'], ['23', 'F3']], 3: [['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']], 4: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']]},
    dyn: {p: .42, mf: .68, f: .9, ff: 1},       // DYNAMICS: a stroke's loudness (there's no pressure on a touch screen)
    accent: 1.25,                               // an accented note (HEAR IT), × its dynamic (never over 1.15)
    click: {min: 40, max: 160, tempo: 88, vol: .7},
    keys: {jkl: ['j', 'k', 'l', ';'], fghj: ['f', 'g', 'h', 'j']},
    muffleMs: 150,                              // a second finger down on the same drum within this = MUFFLE
    // PLAY ALONG's judge (shared/rhythm-judge.js): ms either side of the note. on time = perfect/good/ok
    judge: {perfectMs: 45, goodMs: 85, okMs: 130, lateMs: 220},
    score: {onTime: 1, off: .5, short: .5, wrong: 0, miss: 0},   // ACCURACY: what each result is worth
    tuneWarn: 25,                               // cents: "this drum is out of tune" (the etudes' notes)
    findCents: 150,                             // an etude note is on a drum tuned within this many cents of it
    lookS: .15, tickMs: 25, startS: .35,        // the scheduler (HEAR IT, PLAY ALONG, the click)
    activeS: 6,                                 // practice time: counted while something was played in the last few s
    saveEveryS: 15, keepDays: 30,
    sheets: {max: 6, maxMB: 40},                // LOAD SHEET MUSIC: files kept on this device
  };

  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const S = {open: false, sel: 0, show: 'none', presses: {}, keyDown: {}, dyn: 'mf', clickOn: false, run: null,
    lastActive: -1e9, unsaved: 0, lastTick: 0, etude: null, sheetId: null, sheetURL: null, zoom: {s: 1, x: 0, y: 0}};

  /* ================= THE SETUP ================= */
  const cfg = () => {
    const g = gd(), p = g.practice || (g.practice = {});
    if (!Array.isArray(p.drums) || !p.drums.length) p.drums = PRACTICE.counts[2].map(([id, n]) => drumAt(id, n));
    p.order = p.order === 'eu' ? 'eu' : 'us'; p.keys = p.keys === 'fghj' ? 'fghj' : 'jkl';
    if (p.gauge == null) p.gauge = true;
    if (!PRACTICE.dyn[p.dyn]) p.dyn = 'mf';
    if (!(p.tempo >= PRACTICE.click.min && p.tempo <= PRACTICE.click.max)) p.tempo = PRACTICE.click.tempo;
    return p;
  };
  function drumAt(id, note) {
    const d = D.byId(id), m = D.midiOf(note);
    return {id, pedal: Math.max(0, Math.min(1, D.pedalFor(d, Math.max(d.lowMidi, Math.min(d.highMidi, m))))), fine: 0};
  }
  /** the drums in their SCREEN order, left to right: [{i (index in cfg.drums), x, d}] (lowest left, or right: European) */
  function order() {
    const p = cfg(), list = p.drums.map((x, i) => ({i, x, d: D.byId(x.id)}));
    list.sort((a, b) => a.d.lowMidi - b.d.lowMidi || a.i - b.i);                  // lowest pitch first
    return p.order === 'eu' ? list.reverse() : list;
  }
  const freqOf = i => { const x = cfg().drums[i]; return D.freqAt(D.byId(x.id), x.pedal, x.fine); };
  const midiOf = i => { const x = cfg().drums[i]; return D.midiAt(D.byId(x.id), x.pedal, x.fine); };
  const key = i => 'p' + i;                     // the drum's voice in timpani.js (the levels use 0–3)
  function applyPreset(id) {
    const pr = PRACTICE.presets.find(x => x.id === id); if (!pr) return false;
    cfg().drums = pr.drums.map(([d, n]) => drumAt(d, n)); save(); T.stopAll(); draw(); drawSetup(); return true;
  }
  function setCount(n) {
    n = Math.max(1, Math.min(4, n | 0));
    cfg().drums = PRACTICE.counts[n].map(([d, m]) => drumAt(d, m)); save(); T.stopAll(); draw(); drawSetup();
  }

  /* ================= THE SEMICIRCLE (the Practice Room's drums, seen from above, as a timpanist sets them up) =================
     The PLAYER'S SEAT is a point at the bottom middle; every drum's CENTER sits on a circle of radius R around it, so every
     drum is the same reach away, and each drum's PEDAL points straight at the seat (the feet find them without looking).
     Sizes in INCHES (the drums' real sizes), then the whole picture is scaled to fit the screen. Mr. Graham tunes these. */
  const ARC = {
    span: {1: 0, 2: 50, 3: 95, 4: 130},   // degrees between the first and last drum's centers, seen from the seat
    gap: 1.5,                    // inches between neighbors' rims (they nearly touch, as in a real setup)
    pedalGap: .5,                // inches from the rim to the pedal's toe end
    pedalLen: 17.4,              // inches: the pedal's length (0.6 × a 29" head)
    pedalW: 7,                   // inches: its width
    seatR: 5,                    // inches: the stool
    seatGap: 2.5,                // inches between the stool and the nearest pedal
    hand: 52,                    // px: the ✋ MUFFLE button (a 44 px target + its border)
    handTurn: 50,                // degrees around the drum from its pedal, to the outside of the fan
    minPx: {pedalW: 56, pedalW2: 44, pedalL: 96, head: 64},   // the smallest on screen: a finger's pedal (56, or 44 on
                                 // a screen too narrow for that), a tappable head
    label: 16,                   // px at each end of the pedal for TOE / HEEL (the plate travels between them)
    plate: 18,                   // px: the pedal's plate (along the pedal)
    maxH: .52, maxHMusic: .36,   // × the window's height: the picture's height (smaller with music showing): 3–4 drums
    fillN: 2,                    // up to this many drums FILL THE ROOM LEFT: from the top of the drums to the bottom of the
                                 // window, less the fine tuner and the help line under them (never less than maxHMusic
                                 // with music showing), so 1 or 2 drums are big
    maxPx: {pedalL: 200, pedalW: 72, seatR: 26},   // (1–2 drums) the pedal and the stool are for a foot, not to scale:
                                 // once the drums are big they stop growing at these px
    shrink: .85,                 // a small screen: the gap and the span shrink by up to this before targets do
    pad: 6,                      // px around the picture
  };
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  /** the picture for drums of radius rs (inches, left to right) in a box W px wide and at most H px high */
  function solveArc(rs, W, H, {cap = false} = {}) {
    const n = rs.length;
    const build = (s, span, gap, pwPx, tight) => {
      // the pedal and the stool in px: their real size × the scale, at least the finger-sized minimum; capped (big drums)
      const px = (inch, min, max) => { const v = Math.max(inch * s, min); return cap ? Math.min(v, Math.max(min, max)) : v; };
      const w = px(ARC.pedalW, pwPx, ARC.maxPx.pedalW) / s, l = px(ARC.pedalLen, ARC.minPx.pedalL, ARC.maxPx.pedalL) / s, hand = ARC.hand / s;
      const seatR = px(ARC.seatR, 0, ARC.maxPx.seatR) / s;
      const pairs = []; for (let k = 0; k < n - 1; k++) pairs.push(rs[k] + rs[k + 1] + gap);
      const angles = R => pairs.map(c => 2 * Math.asin(Math.min(1, c / (2 * R))));
      const total = R => angles(R).reduce((a, b) => a + b, 0);
      const base = Math.max(...rs) + ARC.pedalGap + l + ARC.seatGap + seatR;
      let R = base;
      if (n > 1 && total(R) > rad(span)) {               // the span asks for a larger circle: bisect
        let lo = R, hi = R * 50;
        for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (total(m) > rad(span)) lo = m; else hi = m; }
        R = hi;
      }
      const place = R => {
        const a = angles(R), sum = a.reduce((x, y) => x + y, 0);
        let th = -sum / 2;
        return rs.map((r, k) => {
          if (k) th += a[k - 1];
          const u = [-Math.sin(th), Math.cos(th)];          // from the drum toward the seat (screen y down)
          const c = [R * Math.sin(th), -R * Math.cos(th)];
          const toe = [c[0] + u[0] * (r + ARC.pedalGap), c[1] + u[1] * (r + ARC.pedalGap)];
          const heel = [toe[0] + u[0] * l, toe[1] + u[1] * l];
          const side = n === 1 ? 1 : th < -1e-9 ? -1 : 1;                     // the fan's outside (the middle drum: right)
          return {r, th, c, u, toe, heel, w, l, side, seatR};
        });
      };
      let ds = place(R), tries = 0;
      while (overlaps(ds) && tries++ < 400) { R *= 1.02; ds = place(R); }
      placeHands(ds, hand, tight);
      return {R, ds, w, l, hand, seatR, span: n > 1 ? deg(ds[n - 1].th - ds[0].th) : 0, limited: n > 1 && deg(ds[n - 1].th - ds[0].th) < span - 3};
    };
    const box = g => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      g.ds.forEach(d => {
        add(d.c[0] - d.r, d.c[1] - d.r); add(d.c[0] + d.r, d.c[1] + d.r);
        rectCorners(d.toe, d.heel, d.w).forEach(p => add(p[0], p[1]));
        add(d.hand.c[0] - d.hand.s / 2, d.hand.c[1] - d.hand.s / 2); add(d.hand.c[0] + d.hand.s / 2, d.hand.c[1] + d.hand.s / 2);
      });
      add(-g.seatR, -g.seatR); add(g.seatR, g.seatR + g.youH);
      return {x0, y0, x1, y1, w: x1 - x0, h: y1 - y0};
    };
    const fit = (span, gap, pwPx, tight) => {                         // the largest scale (px per inch) whose picture fits; if none fits
      let best = null, low = null;                       // the height, the one that needs the least (the page scrolls)
      for (let s = .8; s < 40; s *= 1.03) {
        const g = build(s, span, gap, pwPx, tight); g.youH = 18 / s; g.box = box(g); g.s = s; g.tight = !!tight;
        const pw = g.box.w * s + 2 * ARC.pad, ph = g.box.h * s + 2 * ARC.pad;
        if (pw > W) continue;
        if (ph <= H) best = g;
        if (!low || ph < low.box.h * low.s + 2 * ARC.pad) low = g;
      }
      return best || low;
    };
    const span = ARC.span[Math.min(4, Math.max(1, n))];
    // a small screen: a tighter fan (the gap and the span down to ARC.shrink), then 44 px pedals; then the picture
    // simply grows taller (the page scrolls) rather than any target getting smaller. The best = the least too tall,
    // then the biggest
    const over = g => Math.max(0, g.box.h * g.s + 2 * ARC.pad - H);
    let g = fit(span, ARC.gap, ARC.minPx.pedalW);
    if (n > 1 && (over(g) > 0 || 2 * Math.min(...rs) * g.s < ARC.minPx.head)) {
      for (const pw of [ARC.minPx.pedalW, ARC.minPx.pedalW2]) {
        const g2 = fit(span * ARC.shrink, ARC.gap * ARC.shrink, pw, true);
        if (g2 && (over(g2) < over(g) - 1 || (over(g2) <= over(g) + 1 && g2.s > g.s))) g = g2;
      }
    }
    const s = g.s, ox = g.box.x0, oy = g.box.y0, P = p => [(p[0] - ox) * s + ARC.pad, (p[1] - oy) * s + ARC.pad];
    return {
      s, R: g.R, span: g.span, limited: g.limited || g.tight, over: g.box.h * s + 2 * ARC.pad > H + 1, room: H, W: Math.ceil(g.box.w * s + 2 * ARC.pad), H: Math.ceil(g.box.h * s + 2 * ARC.pad),
      seat: {c: P([0, 0]), r: g.seatR * s},
      drums: g.ds.map(d => ({c: P(d.c), r: d.r * s, th: deg(d.th), toe: P(d.toe), heel: P(d.heel), w: d.w * s, l: d.l * s, u: d.u,
        hand: {c: P(d.hand.c), s: ARC.hand}})),
    };
  }
  /* the plain geometry the layout checks: a pedal = a rectangle from toe to heel, w wide */
  function rectCorners(a, b, w) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
    return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
  }
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const segSeg = (a, b, c, d) => Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b)) * (cross(a, b, c, d) ? 0 : 1);
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  const cross = (a, b, c, d) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  /** does anything touch: a pedal with the stool, another drum's head or another pedal */
  function overlaps(ds) {
    const m = .4;                                        // inches of air
    for (let i = 0; i < ds.length; i++) {
      const a = ds[i];
      if (segDist([0, 0], a.toe, a.heel) < a.seatR + a.w / 2 + m) return true;
      for (let j = 0; j < ds.length; j++) {
        const b = ds[j];
        if (i !== j && segDist(b.c, a.toe, a.heel) < b.r + a.w / 2 + m) return true;
        if (j > i && segSeg(a.toe, a.heel, b.toe, b.heel) < (a.w + b.w) / 2 + m) return true;
      }
    }
    return false;
  }
  /** each ✋: just outside its rim, ARC.handTurn around from its pedal to the outside of the fan; where that spot is
      taken (a small screen: the buttons are a finger's size, not the drums' scale), the next free spot further round */
  function placeHands(ds, hand, tight) {
    const rot = (u, t) => [u[0] * Math.cos(t) - u[1] * Math.sin(t), u[0] * Math.sin(t) + u[1] * Math.cos(t)];
    const free = (d, c) => {
      if (Math.hypot(c[0], c[1]) < d.seatR + hand * .75) return false;
      return ds.every(b => (b === d || Math.hypot(c[0] - b.c[0], c[1] - b.c[1]) >= b.r + hand * .72) &&
        segDist(c, b.toe, b.heel) >= hand * .72 + b.w / 2 && (!b.hand || b === d || Math.hypot(c[0] - b.hand.c[0], c[1] - b.hand.c[1]) >= hand * 1.1));
    };
    let x0 = Infinity, x1 = -Infinity;                   // the drums' and pedals' own width: keep the buttons inside it
    ds.forEach(d => { x0 = Math.min(x0, d.c[0] - d.r, d.heel[0] - d.w / 2); x1 = Math.max(x1, d.c[0] + d.r, d.heel[0] + d.w / 2); });
    ds.forEach(d => {
      const tries = [];
      for (let a = ARC.handTurn; a <= 180; a += 10) { tries.push(a * d.side); tries.push(-a * d.side); }
      let best = null;
      for (const a of tries) {
        const t = -rad(a), hu = rot(d.u, t);
        const hd = Math.max(d.r + hand * .72, (hand * .72 + d.w / 2 + .4) / Math.max(.3, Math.abs(Math.sin(t))));
        const c = [d.c[0] + hu[0] * hd, d.c[1] + hu[1] * hd];
        const ok = free(d, c), inside = !tight || (c[0] - hand / 2 >= x0 && c[0] + hand / 2 <= x1);
        if (ok && inside) { best = {c, s: hand, turn: a}; break; }
        if (ok && (!best || best.crowded)) best = {c, s: hand, turn: a, wide: true};
        if (!best) best = {c, s: hand, turn: a, crowded: true};
      }
      d.hand = best;
    });
  }

  /* ================= THE DRUMS ON SCREEN (seen from above: the head, its playing spot, the copper rim; the pedals
     pointing at the seat; one SVG for the shapes, the ✋ buttons and "out of tune" badges on top) ================= */
  let L = null;                                         // the current picture (solveArc, in px inside #prDrums)
  const fx = n => n.toFixed(1);
  /** the picture's height: 3–4 drums = ARC.maxH (maxHMusic with music); 1–2 drums (fillN) = the room left on screen from
      the top of the drums (on the page) to the bottom of the window, less what the stage shows under them */
  function roomH(n, music) {
    const cap = Math.max(240, innerHeight * (music ? ARC.maxHMusic : ARC.maxH));
    if (n > ARC.fillN) return cap;
    const box = $('prDrums'), st = $('prStage'), top = box.getBoundingClientRect().top + scrollY;
    const under = st.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;   // the fine tuner, the help, padding
    const room = innerHeight - top - under - ARC.pad;
    return Math.max(music ? cap : 240, room);
  }
  function layout() {
    const box = $('prDrums'), W = box.clientWidth;
    if (!W) return null;
    const music = $('practice').classList.contains('pr-music'), ord = order(), H = roomH(ord.length, music);
    const lay = solveArc(ord.map(o => +o.d.id / 2), W, H, {cap: ord.length <= ARC.fillN});
    const dx = Math.max(0, (W - lay.W) / 2), sh = q => [q[0] + dx, q[1]];
    lay.seat.c = sh(lay.seat.c);
    lay.drums.forEach((d, v) => { d.i = ord[v].i; d.id = ord[v].d.id; d.c = sh(d.c); d.toe = sh(d.toe); d.heel = sh(d.heel); d.hand.c = sh(d.hand.c);
      d.track = d.l - 2 * ARC.label; });
    lay.key = [W, Math.round(H), music, ord.map(o => o.i + ':' + o.d.id).join()].join('|');
    return lay;
  }
  function draw() {
    if (!S.open) return;
    const p = cfg(), keys = PRACTICE.keys[p.keys];
    if (S.sel >= p.drums.length) S.sel = 0;
    const box = $('prDrums');
    L = layout();
    if (!L) { box.innerHTML = ''; return; }
    box.style.height = L.H + 'px';
    const svg = [`<svg class="pr-arc" width="${box.clientWidth}" height="${L.H}" aria-hidden="false">`,
      `<g class="pr-seat" aria-hidden="true"><circle cx="${fx(L.seat.c[0])}" cy="${fx(L.seat.c[1])}" r="${fx(L.seat.r)}"/>` +
      `<text x="${fx(L.seat.c[0])}" y="${fx(L.seat.c[1] + L.seat.r + 13)}" text-anchor="middle">You</text></g>`];
    L.drums.forEach((d, v) => {
      const [cx, cy] = d.c, r = d.r, away = [-d.u[0], -d.u[1]], clampF = v => Math.max(14, Math.min(40, v)), fs = clampF(r * .22), ks = clampF(r * .15);
      svg.push(`<g class="pr-drum" data-i="${d.i}" data-v="${v}">` +
        `<circle class="pr-cue" cx="${fx(cx)}" cy="${fx(cy)}" r="${fx(r + 6)}"/>` +
        `<g class="pr-pedal" data-i="${d.i}" role="slider" tabindex="-1" aria-label="${d.id} inch drum pedal" aria-valuemin="0" aria-valuemax="100" transform="translate(${fx(d.toe[0])} ${fx(d.toe[1])}) rotate(${fx(d.th)})">` +
          `<rect class="pr-ped" x="${fx(-d.w / 2)}" y="0" width="${fx(d.w)}" height="${fx(d.l)}" rx="10"/>` +
          `<line class="pr-ptrack" x1="0" y1="${ARC.label}" x2="0" y2="${fx(d.l - ARC.label)}"/>` +
          `<rect class="pr-plate" x="${fx(-(d.w - 12) / 2)}" y="0" width="${fx(d.w - 12)}" height="${ARC.plate}" rx="5"/>` +
          `<text class="pr-plabel" transform="translate(0 ${ARC.label / 2}) rotate(${fx(-d.th)})">Toe</text>` +
          `<text class="pr-plabel" transform="translate(0 ${fx(d.l - ARC.label / 2)}) rotate(${fx(-d.th)})">Heel</text></g>` +
        `<g class="pr-head" data-i="${d.i}" role="button" tabindex="-1" aria-label="${d.id} inch drum: tap to play, hold to roll" transform="translate(${fx(cx)} ${fx(cy)})">` +
          `<circle class="pr-rim" r="${fx(r)}"/><circle class="pr-hoop" r="${fx(r * .95)}"/><circle class="pr-skin" r="${fx(r * .92)}"/>` +
          `<circle class="pr-spot" r="${fx(r * .92 * T.TIMPANI.spot)}"/><circle class="pr-ripple" r="${fx(r * .4)}"/>` +
          `<text class="pr-sz" y="${fx(-fs * .15)}" style="font-size:${fx(clampF(fs * .8))}px">${d.id}"</text>` +
          `<text class="pr-note" id="prNote${d.i}" y="${fx(fs * 1.05)}" style="font-size:${fx(fs)}px"></text>` +
          `<text class="pr-key" x="${fx(away[0] * r * .7)}" y="${fx(away[1] * r * .7)}" style="font-size:${fx(ks)}px">${(keys[v] || '').toUpperCase()}</text></g></g>`);
    });
    svg.push('</svg>');
    const html = L.drums.map(d => {
      const away = [-d.u[0], -d.u[1]], t = [d.c[0] + away[0] * (d.r + 4), d.c[1] + away[1] * (d.r + 4)];
      return `<button type="button" class="pr-hand" data-i="${d.i}" aria-label="Muffle the ${d.id} inch drum" style="left:${fx(d.hand.c[0] - d.hand.s / 2)}px;top:${fx(d.hand.c[1] - d.hand.s / 2)}px;width:${d.hand.s}px;height:${d.hand.s}px">✋</button>` +
        `<span class="pr-tune" id="prTune${d.i}" hidden style="left:${fx(t[0])}px;top:${fx(t[1])}px;max-width:${fx(d.r * 2)}px;transform:translate(${fx(-50 + 50 * away[0])}%,${fx(-50 + 50 * away[1])}%)">out of tune</span>`;
    }).join('');
    box.innerHTML = svg.join('') + html;
    box.querySelectorAll('.pr-head').forEach(h => wireHead(h, +h.dataset.i));
    box.querySelectorAll('.pr-hand').forEach(b => b.addEventListener('click', () => muffle(+b.dataset.i)));
    box.querySelectorAll('.pr-pedal').forEach(el => wirePedal(el, +el.dataset.i));
    A.holdGuard(box, {lock: true});
    p.drums.forEach((x, i) => drawDrum(i));
    drawFine(); tuneBadges();
  }
  /* the picture follows the screen: a new width, height or music showing draws it again (one frame later) */
  let relayT = 0;
  function relayout() {
    cancelAnimationFrame(relayT);
    relayT = requestAnimationFrame(() => {
      if (!S.open || !L) return;
      const box = $('prDrums'), music = $('practice').classList.contains('pr-music'), H = roomH(order().length, music);
      if (L.key.split('|').slice(0, 3).join('|') !== [box.clientWidth, Math.round(H), music].join('|') && !Object.keys(S.presses).length) draw();
    });
  }
  if (window.ResizeObserver) { const ro = new ResizeObserver(relayout); ['prDrums', 'prScore', 'prBar'].forEach(id => ro.observe($(id))); }   // the room above the drums changes too
  addEventListener('resize', relayout); addEventListener('orientationchange', relayout);
  const drumL = i => L && L.drums.find(d => d.i === i);
  function drawDrum(i) {
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`); if (!el) return;
    const x = cfg().drums[i], d = D.byId(x.id), g = drumL(i);
    el.classList.toggle('sel', S.sel === i);
    if (g) el.querySelector('.pr-plate').setAttribute('y', fx(ARC.label + (1 - x.pedal) * (g.l - 2 * ARC.label - ARC.plate)));
    const pd = el.querySelector('.pr-pedal');
    pd.setAttribute('aria-valuenow', Math.round(x.pedal * 100)); pd.setAttribute('tabindex', S.sel === i ? 0 : -1);
    $('prNote' + i).textContent = cfg().gauge ? D.gauge(d, x.pedal, x.fine) + D.spell(Math.round(D.midiAt(d, x.pedal, x.fine))).oct : '?';
  }
  function drawFine() {
    const x = cfg().drums[S.sel]; if (!x) return;
    $('prFineT').style.setProperty('--f', (x.fine / D.FINE).toFixed(3));
    $('prFineTrack').setAttribute('aria-valuenow', Math.round(x.fine));
    $('prFineL').textContent = `Fine tuner · ${x.id}"`;
  }
  function select(i) { if (!cfg().drums[i]) return; S.sel = i; cfg().drums.forEach((x, k) => drawDrum(k)); drawFine(); }
  function setPedal(i, p) {
    const x = cfg().drums[i]; if (!x) return;
    x.pedal = Math.max(0, Math.min(1, p)); T.setFreq(key(i), freqOf(i)); drawDrum(i); tuneBadges(); saveSoon();
  }
  function setFine(i, c) {
    const x = cfg().drums[i]; if (!x) return;
    x.fine = Math.max(-D.FINE, Math.min(D.FINE, c)); T.setFreq(key(i), freqOf(i)); drawDrum(i); drawFine(); tuneBadges(); saveSoon();
  }
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };
  /* THE PEDAL follows its own angle: the drag along the pedal's axis counts (toward the drum = toe down = higher), a drag
     across it almost nothing; the track's length = the full travel */
  function wirePedal(el, i) {
    let st = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); select(i);
      const g = drumL(i); if (!g) return;
      st = {x: e.clientX, y: e.clientY, p: cfg().drums[i].pedal, h: Math.max(40, g.track), u: g.u, id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', e => {
      if (!st || e.pointerId !== st.id) return;
      const along = -((e.clientX - st.x) * st.u[0] + (e.clientY - st.y) * st.u[1]);     // toward the drum
      setPedal(i, st.p + along / st.h);
    });
    const end = e => { if (st && e.pointerId === st.id) st = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  (function wireFine() {
    const el = $('prFineTrack'); let st = null;
    el.addEventListener('pointerdown', e => {
      const x = cfg().drums[S.sel]; if (!x) return;
      e.preventDefault(); st = {x: e.clientX, f: x.fine, id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', e => { if (st && e.pointerId === st.id) setFine(S.sel, st.f + (e.clientX - st.x) / window.PP_RULES.finePx); });
    const end = e => { if (st && e.pointerId === st.id) st = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
    $('prFineDown').addEventListener('click', () => setFine(S.sel, cfg().drums[S.sel].fine - window.PP_RULES.fineStep));
    $('prFineUp').addEventListener('click', () => setFine(S.sel, cfg().drums[S.sel].fine + window.PP_RULES.fineStep));
  })();

  /* ================= PLAYING: strokes, rolls, muffle ================= */
  const vel = () => PRACTICE.dyn[S.dyn] || PRACTICE.dyn.mf;
  function stroke(i, {center = 0, v = vel(), at = null} = {}) {
    if (!cfg().drums[i]) return false;
    S.lastActive = performance.now();
    const ok = T.strike(key(i), freqOf(i), {vel: v, center, layer: true, at, dyn: vel()});   // dyn: the recorded LAYER (p / mf / f)
    if (at == null) hitFx(i, center);
    return ok;
  }
  function hitFx(i, center) {
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`); if (!el) return;
    el.classList.remove('hit', 'thud'); void el.offsetWidth; el.classList.add('hit'); if (center > 0) el.classList.add('thud');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('hit', 'thud'), 450);
  }
  /** a press (a finger or a key) on drum i: one stroke now; held past ROLL.holdMs it becomes a roll until release */
  function press(i, id, {center = 0} = {}) {
    if (!cfg().drums[i]) return;
    // a second finger on the same drum within muffleMs = MUFFLE
    const other = Object.values(S.presses).find(p => p.i === i && p.id !== id && p.finger && performance.now() - p.at < PRACTICE.muffleMs);
    if (other && String(id).startsWith('ptr')) { release(other.id, true); muffle(i); return; }
    const pr = {i, id, at: performance.now(), rolling: false, hand: 0, finger: String(id).startsWith('ptr'), rel: alongNow()};
    S.presses[id] = pr;
    stroke(i, {center});
    attack(i, pr);
    pr.holdT = setTimeout(() => { if (S.presses[id] === pr) { pr.rolling = true; rollStroke(pr); } }, ROLL.holdMs);
  }
  function rollStroke(pr) {
    if (S.presses[pr.id] !== pr) return;
    pr.hand ^= 1;
    const j = 1 + (Math.random() * 2 - 1) * ROLL.velJitter, lr = pr.hand ? 1 - ROLL.rlBalance : 1;
    stroke(pr.i, {v: Math.min(1.15, vel() * ROLL.vel * j * lr)});
    pr.n = (pr.n || 0) + 1;
    const step = 1000 / ROLL.rate + (Math.random() * 2 - 1) * ROLL.jitterMs;
    pr.rollT = setTimeout(() => rollStroke(pr), step);
  }
  function release(id, silent) {
    const pr = S.presses[id]; if (!pr) return;
    clearTimeout(pr.holdT); clearTimeout(pr.rollT); delete S.presses[id];
    const now = alongNow();
    if (pr.att) pr.att.hold = now != null ? Math.max(0, now - pr.att.rel) : (performance.now() - pr.at) / 1000;
    if (silent && pr.att) pr.att.muffled = true;
  }
  function muffle(i) {
    Object.values(S.presses).filter(p => p.i === i).forEach(p => release(p.id, true));
    T.damp(key(i)); S.lastActive = performance.now();
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`);
    if (el) { el.classList.add('muffled'); setTimeout(() => el.classList.remove('muffled'), 300); }
  }
  /** where on the head: 0 = the playing spot or farther out … 1 = the dead center (the thud) */
  function centerOf(el, e) {
    const g = drumL(+el.dataset.i), b = $('prDrums').getBoundingClientRect();
    if (!g) return 0;
    const rad = g.r * .9, dist = Math.hypot(e.clientX - (b.left + g.c[0]), e.clientY - (b.top + g.c[1])) / rad;
    const from = T.TIMPANI.thud.from;
    return dist >= from ? 0 : (from - dist) / from;
  }
  function wireHead(el, i) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); select(i);
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      press(i, 'ptr' + e.pointerId, {center: centerOf(el, e)});
    });
    const up = e => release('ptr' + e.pointerId);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ================= THE KEYBOARD ================= */
  const visIndex = v => { const o = order()[v]; return o ? o.i : null; };
  document.addEventListener('keydown', e => {
    if (!S.open || document.body.classList.contains('ui-modal') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    const k = e.key.toLowerCase(), keys = PRACTICE.keys[cfg().keys], v = keys.indexOf(k);
    if (v >= 0 && v < cfg().drums.length) {
      e.preventDefault();
      if (e.repeat) return;                                 // a held key = a roll, never the key repeat
      const i = visIndex(v);
      if (e.shiftKey) { muffle(i); return; }
      S.keyDown[k] = true; press(i, 'key:' + k);
      return;
    }
    if (/^[1-4]$/.test(e.key)) { const i = visIndex(+e.key - 1); if (i != null) { e.preventDefault(); select(i); } return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (e.target && e.target.type === 'range') return;
      e.preventDefault();
      const x = cfg().drums[S.sel], s = e.key === 'ArrowUp' ? 1 : -1;
      if (e.shiftKey) setFine(S.sel, x.fine + s * window.PP_RULES.fineStep);
      else setPedal(S.sel, x.pedal + s * window.PP_RULES.pedalStep / D.byId(x.id).span);
    }
  });
  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (S.keyDown[k]) { delete S.keyDown[k]; release('key:' + k); }
  });
  addEventListener('blur', () => Object.keys(S.presses).forEach(id => release(id)));

  /* ================= THE SCHEDULER (the click, HEAR IT, PLAY ALONG): sounds ahead on the audio clock, lights at the
     AUDIBLE time (the rudiment player's approach) ================= */
  function transport({events, more, onEvent, onEnd, endS}) {
    const o = A.Sfx && A.Sfx.output && A.Sfx.output();
    const ctx = o ? o.ctx : null;
    let clk = null;
    if (ctx && A.AudioClock) { clk = A.AudioClock.create().start(); if (clk.ctx !== ctx) { clk.ctx = ctx; clk.off = null; clk.sample(); } }
    if (!ctx || !clk) { const p0 = performance.now(); clk = {now: () => (performance.now() - p0) / 1000, audAt: p => (p - p0) / 1000, sample() {}, ctx: null}; }
    const kit = ctx && A.MHBacking ? A.MHBacking.create(ctx, o.out) : null;
    const t0 = clk.now() + PRACTICE.startS;
    let queue = (events || []).slice().sort((a, b) => a.time - b.time), vis = [], running = true, timer = 0, raf = 0, made = 0;
    const R = {t0, clk, ctx, log: [], stop, now: () => audible() - t0, running: () => running};
    function audible() {
      clk.sample();
      let n = clk.audAt(performance.now());
      if (ctx && Math.abs(n - ctx.currentTime) > 1) n = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      return n;
    }
    function play(e) {
      const at = t0 + e.time;
      vis.push(e); R.log.push({kind: e.kind, time: e.time, drum: e.drum, n: e.n});
      if (R.log.length > 3000) R.log.splice(0, 1000);
      if (!ctx) return;
      if (e.kind === 'click' && kit) kit.click(at, PRACTICE.click.vol * (e.down ? 1 : .8), !!e.down);
      if (e.kind === 'stroke') T.strike(key(e.drum), freqOf(e.drum), {at, vel: e.vel, layer: true, dyn: e.dyn});
    }
    function schedule() {
      if (!running) return;
      const horizon = clk.now() + PRACTICE.lookS - t0;
      if (more) while (made < horizon + .5) { const add = more(made, made + .5); made += .5; if (add) queue = queue.concat(add).sort((a, b) => a.time - b.time); }
      while (queue.length && queue[0].time < horizon) play(queue.shift());
    }
    function frame() {
      if (!running) return;
      const now = audible() - t0;
      while (vis.length && vis[0].time <= now) { const e = vis.shift(); try { if (onEvent) onEvent(e, now); } catch (err) { setTimeout(() => { throw err; }); } }
      if (endS != null && now >= endS && !queue.length) { stop(false); return; }
      raf = requestAnimationFrame(frame);
    }
    function stop(cut = true) {
      if (!running) return;
      running = false; clearInterval(timer); cancelAnimationFrame(raf);
      if (cut && kit) { kit.fade(.02); setTimeout(() => kit.stopAll(), 40); }
      if (onEnd) onEnd({stopped: cut});
    }
    schedule(); timer = setInterval(schedule, PRACTICE.tickMs); raf = requestAnimationFrame(frame);
    return R;
  }

  /* ================= THE CLICK ================= */
  function setClick(on) {
    stopRun();
    S.clickOn = !!on;
    $('prClickBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) { beatLight(null); return; }
    const p = cfg(), beatS = () => 60 / p.tempo;
    let nextT = 0, beat = 0;
    S.run = {kind: 'click', tr: transport({more: (from, to) => {
      const out = [];
      while (nextT < to) { out.push({time: nextT, kind: 'click', down: beat % 4 === 0, beat, count: beat < 4}); beat++; nextT += beatS(); }
      return out;
    }, onEvent: e => { beatLight(e); S.lastActive = performance.now(); }})};
  }
  function beatLight(e) {
    const el = $('prBeat');
    if (!e) { el.className = 'pr-beat'; el.textContent = ''; return; }
    el.className = 'pr-beat'; void el.offsetWidth; el.className = 'pr-beat on' + (e.down ? ' down' : '');
    el.textContent = e.count ? String(e.beat % 4 + 1) : '';
  }
  function stopRun() {
    if (S.run && S.run.tr) S.run.tr.stop();
    S.run = null;
  }

  /* ================= THE ETUDES ================= */
  const etudes = E.ETUDES.map(et => E.parse(et));
  /** an etude's own tuning ([[size, note], …] low to high), else the C & F preset (the first four) */
  const setupOf = e => (e && e.etude.setup) || PRACTICE.presets.find(x => x.id === 'cf').drums;
  const noteName = (n, oct = true) => D.label(D.midiOf(n), oct);
  /** SET UP … FOR ME: the etude's drums, sizes and notes (pedal on the note, fine tuner 0), saved like any setup */
  function applySetup(setup) {
    cfg().drums = setup.map(([d, n]) => drumAt(d, n)); save(); T.stopAll(); draw(); drawSetup(); tuneBadges();
  }
  function showEtude(id) {
    stopRun();
    const e = etudes.find(x => x.etude.id === id) || etudes[0];
    S.etude = e; cfg().etude = e.etude.id; save();
    $('prEtudeSel').value = e.etude.id;
    $('prAbout').textContent = e.etude.about || '';
    const bars = Array.from({length: e.measures}, (_, k) => `<option value="${k}">${k + 1}</option>`).join('');
    $('prFrom').innerHTML = bars; $('prTo').innerHTML = bars;
    $('prFrom').value = '0'; $('prTo').value = String(e.measures - 1);
    engraveEtude(e);
    const best = (gd().etudes || {})[e.etude.id];
    $('prResult').textContent = best ? `Best: ${best.best} % (at ${best.pct} % tempo)` : `♩ = ${e.etude.tempo}. Hear it first, then play along.`;
    tuneBadges();
  }
  function engraveEtude(e) {
    // a phone: 2 bars a row, else 4, or 2 where a row of 4 would have to shrink more than about a quarter (busy 16ths)
    const room = ($('prStaff').clientWidth || innerWidth) - 16, pitch = n => (e.notes[n.i] || {}).pitch;
    const draw = per => A.RhythmStaff.rows(e.parsed, per).map(([a, b], r) => ({a, b, g: A.RhythmStaff.engrave(e.parsed, {from: a, to: b, counting: false, clef: 'bass', pitch, slurs: e.slurs, marks: e.etude.marks, id: 'pe' + r, label: `${e.etude.name}, bars ${a + 1} to ${b}`})}));
    let rows = draw(room < 684 ? 2 : 4);
    if (rows.some(x => x.g.w > room * 1.3) && room >= 684) rows = draw(2);
    $('prStaff').innerHTML = `<h3 class="pr-etitle">${e.etude.name} <small>♩ = ${e.etude.tempo}</small></h3>` +
      `<p class="pr-tuning">Timpani: ${setupOf(e).map(([, n]) => noteName(n)).join(' · ')}</p>` +
      rows.map(({a, g}) => `<div class="pr-srow-staff" data-from="${a}">${g.svg}</div>`).join('');
  }
  /** which drum plays each etude pitch: the nearest-tuned drum within findCents (each drum once) -> {midi: drumIndex} */
  function assign(e) {
    const pitches = [...new Set(e.notes.filter(n => !n.rest).map(n => n.midi))], used = new Set(), out = {};
    pitches.forEach(m => {
      let best = -1, bc = 1e9;
      cfg().drums.forEach((x, i) => { if (used.has(i)) return; const c = Math.abs((midiOf(i) - m) * 100); if (c < bc) { bc = c; best = i; } });
      if (best >= 0 && bc <= PRACTICE.findCents) { out[m] = best; used.add(best); }
    });
    return out;
  }
  /* the badges: a drum carrying an etude note > tuneWarn cents off says so; a note no drum is near: the set-up offer */
  function tuneBadges() {
    if (!S.open) return;
    const show = S.show === 'etude' && S.etude;
    const map = show ? assign(S.etude) : {}, off = {};
    Object.entries(map).forEach(([m, i]) => { const c = (midiOf(i) - +m) * 100; if (Math.abs(c) > PRACTICE.tuneWarn) off[i] = c; });
    cfg().drums.forEach((x, i) => { const b = $('prTune' + i); if (b) { b.hidden = !(i in off); b.textContent = i in off ? `out of tune (${off[i] > 0 ? '+' : '−'}${Math.round(Math.abs(off[i]))}¢)` : ''; } });
    const missing = show ? [...new Set(S.etude.notes.filter(n => !n.rest).map(n => n.midi))].filter(m => !(m in map)) : [];
    $('prNeed').hidden = !missing.length;
    if (missing.length) {
      const su = setupOf(S.etude), few = cfg().drums.length < su.length;
      $('prNeedText').textContent = few
        ? `This etude needs ${su.length} drums: ${su.map(([, n]) => noteName(n)).join(', ')}. Tune them yourself (good practice!), or:`
        : `This etude needs ${missing.map(m => D.label(m)).join(' and ')} on your drums. Tune them yourself (good practice!), or:`;
      $('prCF').textContent = `Set up ${su.map(([, n]) => noteName(n, false)).join(' · ')} for me`;
    }
    S.badges = {off, missing};
  }
  /** the strokes HEAR IT plays (and PLAY ALONG's notes): bars [from, to] at pct of the tempo */
  function plan(e, {from = 0, to = e.measures - 1, pct = 1} = {}) {
    const per = e.parsed.meter.per, tm = E.timer(e, pct), t0 = tm(from * per), map = assign(e);
    const dynAt = dynamicsOf(e), out = [], notes = [];
    e.notes.forEach((n, k) => {
      if (n.rest || n.measure < from || n.measure > to) return;
      const time = tm(n.t) - t0, end = tm(n.t + n.d) - t0, drum = map[n.midi], v = dynAt(n.t);
      notes.push({n: n.i, time, end, drum, roll: n.roll, midi: n.midi});
      if (drum == null) return;
      if (!n.roll) { out.push({time, kind: 'stroke', drum, vel: Math.min(1.15, v * (n.accent ? PRACTICE.accent : 1)), dyn: v, n: n.i}); return; }
      // a roll: single strokes at the ROLL rate; a release rolls right up to its next note, else stops a stroke short
      const nx = e.notes[k + 1], stop = n.release && nx ? tm(nx.t) - t0 - 1 / ROLL.rate : end - 1 / ROLL.rate;
      let t = time, h = 0;
      while (t < stop - 1e-6 || t === time) {
        const first = t === time;
        out.push({time: t, kind: 'stroke', drum, vel: Math.min(1.15, v * (first ? (n.accent ? PRACTICE.accent : 1) : ROLL.vel * (h ? 1 - ROLL.rlBalance : 1))), dyn: v, n: n.i, roll: true});
        h ^= 1; t += 1 / ROLL.rate;
      }
    });
    return {strokes: out, notes, endS: tm((to + 1) * per) - t0, beatS: 60 / (e.etude.tempo * pct), per, tm, t0};
  }
  /** a dynamic for every tick: the marks (p mf f ff), "cresc." rising to the next dynamic */
  function dynamicsOf(e) {
    const per = e.parsed.meter.per, ms = (e.etude.marks || []).slice().sort((a, b) => a.m - b.m);
    return t => {
      const bar = t / per;
      let v = PRACTICE.dyn.mf, cres = null;
      ms.forEach(mk => { if (mk.m <= bar) { if (mk.kind === 'dyn' && PRACTICE.dyn[mk.text]) { v = PRACTICE.dyn[mk.text]; cres = null; } else if (/cresc/.test(mk.text)) cres = mk; } });
      if (cres) {
        const next = ms.find(x => x.m > cres.m && x.kind === 'dyn'), goal = next ? PRACTICE.dyn[next.text] : Math.min(1, v + .2), endBar = next ? next.m : cres.m + 1;
        v = v + (goal - v) * Math.min(1, (bar - cres.m) / Math.max(1, endBar - cres.m));
      }
      return v;
    };
  }
  const range = () => {
    let a = +$('prFrom').value || 0, b = +$('prTo').value; if (isNaN(b)) b = S.etude.measures - 1;
    if (b < a) [a, b] = [b, a];
    return {from: a, to: b};
  };
  const pct = () => (+$('prPct').value || 100) / 100;
  const loopOn = () => $('prLoop').getAttribute('aria-pressed') === 'true';
  const eclickOn = () => $('prEClick').getAttribute('aria-pressed') === 'true';

  /* lighting a note and the drum to hit */
  let lit = [];
  function lightNote(n, drum) {
    lit.forEach(el => el.classList.remove('pp-now', 'cue')); lit = [];
    if (n == null) return;
    $('prStaff').querySelectorAll(`g.rn[data-n="${n}"]`).forEach(el => { el.classList.add('pp-now'); lit.push(el); });
    if (drum != null) { const d = $('prDrums').querySelector(`.pr-drum[data-i="${drum}"]`); if (d) { d.classList.add('cue'); lit.push(d); } }
  }
  function clearMarks() { $('prStaff').querySelectorAll('g.rn').forEach(el => el.classList.remove('pp-now', 'r-ok', 'r-off', 'r-wrong', 'r-miss', 'r-short')); }

  /* HEAR IT / PLAY ALONG */
  function startEtude(mode) {
    const e = S.etude; if (!e) return;
    setClick(false); stopRun(); clearMarks();
    const r = range(), p = pct(), PL = plan(e, Object.assign({pct: p}, r)), count = mode === 'along' ? 4 : 0;
    const lead = count * PL.beatS, endS = lead + PL.endS + PRACTICE.judge.lateMs / 1000 + .2;
    const evs = [];
    if (mode === 'hear') PL.strokes.forEach(s => evs.push(Object.assign({}, s, {time: s.time + lead})));
    // the count-in (PLAY ALONG: one bar), then the click on every beat (if on)
    const beats = Math.round((r.to - r.from + 1) * PL.per / 12);
    for (let b = 0; b < count; b++) evs.push({time: b * PL.beatS, kind: 'click', down: b === 0, count: true, beat: b});
    if (eclickOn()) for (let b = 0; b < beats; b++) evs.push({time: lead + PL.tm(b * 12 + r.from * PL.per) - PL.t0 - 0, kind: 'click', down: b % 4 === 0, beat: b});
    PL.notes.forEach(n => evs.push({time: lead + n.time, kind: 'note', n: n.n, drum: n.drum}));
    const run = {kind: mode, e, r, pct: p, PL, lead, attacks: [], pass: 0};
    S.run = run;
    $('prHear').hidden = true; $('prAlong').hidden = true; $('prStop').hidden = false;
    $('prResult').textContent = mode === 'along' ? 'Count-in… then play the lit notes.' : 'Listen…';
    run.tr = transport({events: evs, endS, onEvent: ev => {
      S.lastActive = performance.now();
      if (ev.kind === 'click') beatLight(ev);
      if (ev.kind === 'note') lightNote(ev.n, mode === 'along' ? ev.drum : ev.drum);
    }, onEnd: ({stopped}) => {
      lightNote(null);
      if (S.run !== run) return;
      if (mode === 'along' && !stopped) finishAlong(run);
      if (!stopped && loopOn()) { S.passes = (S.passes || 0) + 1; setTimeout(() => { if (S.run === run) startEtude(mode); }, 250); return; }
      endEtudeUI();
      if (stopped || mode === 'hear') { S.run = null; if (mode === 'hear') $('prResult').textContent = 'Your turn: PLAY ALONG.'; }
    }});
  }
  function endEtudeUI() { $('prHear').hidden = false; $('prAlong').hidden = false; $('prStop').hidden = true; beatLight(null); }
  /** PLAY ALONG's clock: seconds since the etude's first note (the AUDIBLE time), or null when nothing is running */
  function alongNow() {
    const run = S.run;
    if (!run || run.kind !== 'along' || !run.tr) return null;
    return run.tr.now() - run.lead;
  }
  /** every press during PLAY ALONG is an attack (rel = when it was heard, s from the first note; hold = how long) */
  function attack(i, pr) {
    const run = S.run;
    if (!run || run.kind !== 'along' || pr.rel == null) return;
    pr.att = {rel: pr.rel, drum: i, hold: 0};
    run.attacks.push(pr.att);
  }
  /** THE JUDGE: the shared RhythmJudge per drum (right drum + timing), then: a note missed on its drum but hit on
      another = WRONG DRUM; a roll note needs a hold covering ROLL.holdFrac of its length (else SHORT) */
  function judge(PL, attacks) {
    const R = PRACTICE.judge, res = new Array(PL.notes.length).fill(null), drums = [...new Set(PL.notes.map(n => n.drum))];
    drums.forEach(d => {
      const ts = PL.notes.map((n, k) => ({k, t: n.time, n})).filter(x => x.n.drum === d);
      const as = attacks.filter(a => a.drum === d).slice().sort((a, b) => a.rel - b.rel);
      const m = A.RhythmJudge.match(ts, as, R);
      m.tg.forEach(t => { res[t.k] = {res: t.res, d: t.d, a: t.a}; });
    });
    PL.notes.forEach((n, k) => {
      const r = res[k] || {res: 'miss'};
      if (r.res === 'miss' && attacks.some(a => a.drum !== n.drum && Math.abs((a.rel - n.time) * 1000) <= R.okMs)) r.res = 'wrong';
      if (n.roll && r.a && /perfect|good|ok|early|late/.test(r.res) && r.a.hold < ROLL.holdFrac * (n.end - n.time)) r.short = true;
      r.kind = r.res === 'miss' ? 'miss' : r.res === 'wrong' ? 'wrong' : r.short ? 'short' : /perfect|good|ok/.test(r.res) ? 'ok' : 'off';
      res[k] = r;
    });
    const W = PRACTICE.score, worth = {ok: W.onTime, off: W.off, short: W.short, wrong: W.wrong, miss: W.miss};
    const acc = PL.notes.length ? Math.round(100 * res.reduce((s, r) => s + worth[r.kind], 0) / PL.notes.length) : 0;
    return {res, acc, counts: res.reduce((c, r) => (c[r.kind] = (c[r.kind] || 0) + 1, c), {})};
  }
  function finishAlong(run) {
    const J = judge(run.PL, run.attacks);
    run.J = J; run.pass++;
    J.res.forEach((r, k) => { const n = run.PL.notes[k]; $('prStaff').querySelectorAll(`g.rn[data-n="${n.n}"]`).forEach(el => el.classList.add('r-' + r.kind)); });
    const c = J.counts, full = run.r.from === 0 && run.r.to === run.e.measures - 1;
    let line = `Accuracy ${J.acc} % · on time ${c.ok || 0} · early/late ${c.off || 0}${c.short ? ` · short rolls ${c.short}` : ''} · wrong drum ${c.wrong || 0} · missed ${c.miss || 0}`;
    if (full) {
      const all = gd().etudes || (gd().etudes = {}), old = all[run.e.etude.id];
      if (!old || J.acc > old.best) { all[run.e.etude.id] = {best: J.acc, pct: Math.round(run.pct * 100)}; save(); line += old ? ' · NEW BEST!' : ''; }
      else line += ` · best ${old.best} %`;
    }
    $('prResult').textContent = line;
    S.lastResult = J;
  }

  /* ================= LOAD YOUR OWN SHEET MUSIC: IndexedDB on THIS DEVICE only =================
     Never uploaded, never sent anywhere, not in the Arcade Backup Code (that's localStorage): a separate database,
     'bandarcade-sheets', store 'sheets' = {id, name, type, size, added, blob}. Shown from a blob: URL. */
  const SheetDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, no) => {
        if (!window.indexedDB) return no(new Error('no IndexedDB'));
        const r = indexedDB.open('bandarcade-sheets', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('sheets', {keyPath: 'id', autoIncrement: true}); };
        r.onsuccess = () => { this.db = r.result; ok(this.db); };
        r.onerror = () => no(r.error);
      });
    },
    tx(mode, fn) { return this.open().then(db => new Promise((ok, no) => { const t = db.transaction('sheets', mode), st = t.objectStore('sheets'), out = fn(st); t.oncomplete = () => ok(out && out.result !== undefined ? out.result : out); t.onerror = () => no(t.error); })); },
    // the file's BYTES are stored (an ArrayBuffer), never the File itself: WebKit's private sessions (Safari Private
    // Browsing) refuse to keep a Blob in IndexedDB, but keep its bytes
    list() { return this.tx('readonly', st => st.getAll()).then(a => (a || []).map(x => ({id: x.id, name: x.name, type: x.type, size: x.size, added: x.added}))).then(a => a.concat(MEM.map(m => ({id: m.id, name: m.name, type: m.type, size: m.size, added: m.added, mem: true})))); },
    get(id) { const m = MEM.find(x => x.id === id); return m ? Promise.resolve(m) : this.tx('readonly', st => st.get(id)); },
    add(file, data) { return this.tx('readwrite', st => st.add({name: file.name || 'My music', type: file.type || '', size: file.size || 0, added: Date.now(), data})); },
    remove(id) { const k = MEM.findIndex(x => x.id === id); if (k >= 0) { MEM.splice(k, 1); return Promise.resolve(); } return this.tx('readwrite', st => st.delete(id)); },
  };
  /* a browser that can't keep the file at all (no IndexedDB, storage full or blocked): it's shown for this visit only */
  const MEM = [];
  const blobOf = rec => rec.blob || new Blob([rec.data], {type: rec.type || ''});
  async function loadFile(file) {
    if (!file) return;
    const okType = /^image\//.test(file.type) || file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!okType) { A.UI.toast('That file isn\'t a picture or a PDF.'); return; }
    if (file.size > PRACTICE.sheets.maxMB * 1048576) { A.UI.toast(`That file is too big (over ${PRACTICE.sheets.maxMB} MB).`); return; }
    let list = [];
    try { list = await SheetDB.list(); } catch (e) { list = MEM.slice(); }
    if (list.length >= PRACTICE.sheets.max) { A.UI.toast(`You have ${list.length} pieces saved. Remove one first.`); return; }
    let id = null;
    try { const data = await file.arrayBuffer(); id = await SheetDB.add(file, data); cfg().sheet = id; save(); }
    catch (e) {
      id = 'm' + (MEM.length + 1) + '-' + Date.now();
      MEM.push({id, name: file.name || 'My music', type: file.type || '', size: file.size || 0, added: Date.now(), blob: file});
      A.UI.toast('This browser can\'t keep your music after you leave, but it\'s here for now.', {ms: 4000});
    }
    await drawSheets(id);
  }
  async function drawSheets(pick) {
    let list = [];
    try { list = await SheetDB.list(); } catch (e) { list = MEM.slice(); }
    const sel = $('prSheetSel');
    sel.innerHTML = list.length ? list.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('') : '<option value="">(nothing yet)</option>';
    const id = pick != null ? pick : cfg().sheet;
    const cur = list.find(x => x.id === id) || list[list.length - 1];
    sel.disabled = !list.length; $('prRemove').disabled = !cur;
    if (cur) sel.value = String(cur.id);
    await showSheet(cur ? cur.id : null);
    return list;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function showSheet(id) {
    if (S.sheetURL) { URL.revokeObjectURL(S.sheetURL); S.sheetURL = null; }
    const view = $('prView');
    view.querySelectorAll('img,iframe').forEach(x => x.remove());
    $('prPdfTip').hidden = true; S.sheetId = null; S.sheetType = null;
    $('prEmpty').hidden = id != null;
    ['prZoomIn', 'prZoomOut', 'prFit'].forEach(b => { $(b).disabled = true; });
    if (id == null) return;
    const rec = await SheetDB.get(id).catch(() => null);
    if (!rec) { $('prEmpty').hidden = false; return; }
    S.sheetId = id; cfg().sheet = id; save();
    S.sheetURL = URL.createObjectURL(blobOf(rec));
    const pdf = rec.type === 'application/pdf' || /\.pdf$/i.test(rec.name);
    S.sheetType = pdf ? 'pdf' : 'image';
    if (pdf) {
      const f = document.createElement('iframe');
      f.className = 'pr-pdf'; f.title = rec.name; f.src = S.sheetURL + '#view=FitH';
      view.appendChild(f);
      // iPad Safari shows only a PDF's first page (and little zoom) in a frame; some browsers can't show PDFs at all
      $('prPdfTip').hidden = !(isIOS() || navigator.pdfViewerEnabled === false);
    } else {
      const img = document.createElement('img');
      img.className = 'pr-img'; img.alt = rec.name; img.src = S.sheetURL; img.draggable = false;
      img.onload = () => fit();
      view.appendChild(img);
      ['prZoomIn', 'prZoomOut', 'prFit'].forEach(b => { $(b).disabled = false; });
    }
  }
  /* the image: fit to width, + / − / FIT, pinch-zoom and drag-pan */
  function applyZoom() { const img = $('prView').querySelector('img'); if (img) img.style.transform = `translate(${S.zoom.x}px, ${S.zoom.y}px) scale(${S.zoom.s})`; }
  function fit() {
    const img = $('prView').querySelector('img'), v = $('prView'); if (!img || !img.naturalWidth) return;
    S.zoom = {s: v.clientWidth / img.naturalWidth, x: 0, y: 0, fit: true}; applyZoom();
  }
  function zoomBy(k, cx, cy) {
    const v = $('prView'), r = v.getBoundingClientRect(), px = cx != null ? cx - r.left : v.clientWidth / 2, py = cy != null ? cy - r.top : v.clientHeight / 2;
    const s0 = S.zoom.s, s1 = Math.max(.1, Math.min(8, s0 * k));
    S.zoom.x = px - (px - S.zoom.x) * s1 / s0; S.zoom.y = py - (py - S.zoom.y) * s1 / s0; S.zoom.s = s1; S.zoom.fit = false; applyZoom();
  }
  (function wireView() {
    const v = $('prView'), pts = new Map();
    let last = null;
    v.addEventListener('pointerdown', e => { if (!v.querySelector('img')) return; pts.set(e.pointerId, {x: e.clientX, y: e.clientY}); try { v.setPointerCapture(e.pointerId); } catch (er) {} last = null; });
    v.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pts.size === 1) { S.zoom.x += e.clientX - prev.x; S.zoom.y += e.clientY - prev.y; applyZoom(); return; }
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (last) zoomBy(d / last, (a.x + b.x) / 2, (a.y + b.y) / 2);
      last = d;
    });
    const up = e => { pts.delete(e.pointerId); last = null; };
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    v.addEventListener('wheel', e => { if (!v.querySelector('img') || !e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, {passive: false});
    $('prZoomIn').addEventListener('click', () => zoomBy(1.25));
    $('prZoomOut').addEventListener('click', () => zoomBy(.8));
    $('prFit').addEventListener('click', fit);
    $('prFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; loadFile(f); });
    $('prSheetSel').addEventListener('change', () => { const v = $('prSheetSel').value; showSheet(/^m/.test(v) ? v : +v); });
    $('prRemove').addEventListener('click', () => {
      const id = S.sheetId; if (id == null) return;
      A.UI.confirm({title: 'Remove this music?', text: 'It will be deleted from this device.', yes: 'Remove', no: 'Keep it', danger: true,
        onYes: async () => { await SheetDB.remove(id).catch(() => {}); cfg().sheet = null; save(); drawSheets(null); }});
    });
    $('prHide').addEventListener('click', () => setShow('none'));
    addEventListener('resize', () => { if (S.zoom.fit) fit(); });
  })();

  /* ================= THE SCREEN ================= */
  function setShow(m) {
    if (S.run && S.run.kind !== 'click') stopRun();
    S.show = m; cfg().show = m; save();
    $('prShow').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.show === m ? 'true' : 'false'));
    $('prScore').hidden = m === 'none';
    $('prEtude').hidden = m !== 'etude'; $('prSheet').hidden = m !== 'sheet';
    $('practice').classList.toggle('pr-music', m !== 'none');
    relayout();
    if (m === 'etude') showEtude(cfg().etude);
    if (m === 'sheet') drawSheets();
    tuneBadges();
  }
  function setDyn(d) {
    S.dyn = d; cfg().dyn = d; save();
    $('prDyn').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.dyn === d ? 'true' : 'false'));
  }
  /* the setup panel */
  function drawSetup() {
    const p = cfg();
    $('prPresets').innerHTML = PRACTICE.presets.map(x => `<button type="button" class="btn btn-secondary btn-small" data-preset="${x.id}">${x.name}<small>${x.sub}</small></button>`).join('');
    $('prPresets').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { applyPreset(b.dataset.preset); A.Sfx.event('ui-toggle'); }));
    $('prCount').innerHTML = [1, 2, 3, 4].map(n => `<button type="button" data-n="${n}" aria-pressed="${p.drums.length === n}">${n}</button>`).join('');
    $('prCount').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { setCount(+b.dataset.n); A.Sfx.event('ui-toggle'); }));
    $('prSlots').innerHTML = order().map((o, v) => {
      const d = o.d, cur = Math.round(midiOf(o.i)), onNote = Math.abs((midiOf(o.i) - cur) * 100) < 1;
      const notes = []; for (let m = d.lowMidi; m <= d.highMidi; m++) notes.push(`<option value="${m}" ${onNote && m === cur ? 'selected' : ''}>${D.label(m)}</option>`);
      return `<div class="pr-slot" data-i="${o.i}"><b>Drum ${v + 1}</b>
        <label>Size <select data-size="${o.i}">${D.DRUMS.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${x.name} (${D.label(x.lowMidi)}–${D.label(x.highMidi)})</option>`).join('')}</select></label>
        <label>Note <select data-note="${o.i}">${onNote ? '' : '<option value="" selected>(tuned by pedal)</option>'}${notes.join('')}</select></label></div>`;
    }).join('');
    $('prSlots').querySelectorAll('[data-size]').forEach(s => s.addEventListener('change', () => {
      const i = +s.dataset.size, x = cfg().drums[i], m = Math.round(midiOf(i)); cfg().drums[i] = drumAt(s.value, D.label(m).replace('♭', 'b').replace('♯', '#')); save(); T.damp(key(i)); draw(); drawSetup();
    }));
    $('prSlots').querySelectorAll('[data-note]').forEach(s => s.addEventListener('change', () => {
      if (s.value === '') return; const i = +s.dataset.note, d = D.byId(cfg().drums[i].id);
      cfg().drums[i].pedal = D.pedalFor(d, +s.value); cfg().drums[i].fine = 0; save(); T.setFreq(key(i), freqOf(i)); draw(); drawSetup();
    }));
    const seg = (id, attr, val) => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset[attr] === String(val) ? 'true' : 'false'));
    seg('prOrder', 'order', p.order); seg('prKeys', 'keys', p.keys); seg('prGauge', 'gauge', p.gauge ? 1 : 0);
    if (A.PedalPoint && A.PedalPoint.mountDrumSound) A.PedalPoint.mountDrumSound($('prSound'), {id: 'prSound', labelClass: 'pr-sl'});   // DRUM SOUND (game.js)
  }
  function openSetup() { drawSetup(); const ov = $('prSetup'); ov.hidden = false; A.UI.layer.open(ov, {trap: true, onEsc: closeSetup, focus: '#prSetupDone'}); }
  function closeSetup() { const ov = $('prSetup'); if (ov.hidden) return; ov.hidden = true; A.UI.layer.close(ov); }
  $('prOrder').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().order = b.dataset.order; save(); draw(); drawSetup(); });
  $('prKeys').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().keys = b.dataset.keys; save(); draw(); drawSetup(); });
  $('prGauge').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().gauge = b.dataset.gauge === '1'; save(); draw(); drawSetup(); });
  $('prSetupDone').addEventListener('click', closeSetup);
  $('prSetupBtn').addEventListener('click', openSetup);
  $('prClickBtn').addEventListener('click', () => setClick(!S.clickOn));
  $('prTempo').addEventListener('input', () => { cfg().tempo = +$('prTempo').value; $('prTempoVal').textContent = cfg().tempo; saveSoon(); });
  $('prDyn').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDyn(b.dataset.dyn); });
  $('prShow').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setShow(b.dataset.show); });
  $('prEtudeSel').innerHTML = etudes.map((e, k) => `<option value="${e.etude.id}">${k + 1}. ${e.etude.name} · ${setupOf(e).length} drums</option>`).join('');
  $('prEtudeSel').addEventListener('change', () => showEtude($('prEtudeSel').value));
  $('prHear').addEventListener('click', () => startEtude('hear'));
  $('prAlong').addEventListener('click', () => startEtude('along'));
  $('prStop').addEventListener('click', () => { stopRun(); endEtudeUI(); lightNote(null); });
  $('prPct').addEventListener('input', () => { $('prPctVal').textContent = $('prPct').value + ' %'; });
  ['prLoop', 'prEClick'].forEach(id => $(id).addEventListener('click', () => { const b = $(id); b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }));
  $('prCF').addEventListener('click', () => { if (S.etude) applySetup(setupOf(S.etude)); });

  /* ================= THE PRACTICE-TIME LOG: gameData('pedal-point').playS['YYYY-MM-DD'] = seconds really playing
     (the room open, the page visible, something played in the last activeS seconds), the last keepDays days ======== */
  function tick() {
    const now = performance.now(), dt = S.lastTick ? (now - S.lastTick) / 1000 : 0;
    S.lastTick = now;
    if (S.open && !document.hidden && dt > 0 && dt <= 1.5 && (now - S.lastActive) / 1000 < PRACTICE.activeS) {
      S.unsaved += dt;
      if (S.unsaved >= PRACTICE.saveEveryS) flush();
    }
  }
  function flush() {
    if (!(S.unsaved > 0)) return;
    const g = gd(), log = g.playS || (g.playS = {}), k = A.store.dayKey();
    log[k] = Math.round(((log[k] || 0) + S.unsaved) * 10) / 10; S.unsaved = 0;
    Object.keys(log).sort().slice(0, -PRACTICE.keepDays).forEach(x => delete log[x]);
    save();
  }
  setInterval(tick, 500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { flush(); Object.keys(S.presses).forEach(id => release(id)); setClick(false); stopRun(); } });
  addEventListener('pagehide', flush);

  /* ================= OPEN / CLOSE (game.js's LEVELS | PRACTICE switch) ================= */
  function open() {
    S.open = true;
    const p = cfg();
    $('practice').hidden = false; document.body.classList.add('pr-open');
    $('prTempo').value = p.tempo; $('prTempoVal').textContent = p.tempo;
    setDyn(p.dyn);
    draw();
    setShow(p.show === 'etude' || p.show === 'sheet' ? p.show : 'none');
    S.lastTick = performance.now();
  }
  function close() {
    if (!S.open) return;
    flush(); S.open = false;
    Object.keys(S.presses).forEach(id => release(id)); setClick(false); stopRun(); T.stopAll(); closeSetup();
    $('practice').hidden = true; document.body.classList.remove('pr-open');
  }

  A.PPPractice = {open, close, PRACTICE};
  A.PedalPoint = A.PedalPoint || {};
  A.PedalPoint.practice = {
    PRACTICE, SheetDB, etudes, setupOf, applySetup, open, close, applyPreset, setCount, select, setPedal, setFine, setShow, setDyn, setClick, showEtude,
    openSetup, closeSetup, plan: (id, o) => plan(etudes.find(e => e.etude.id === id), o || {}), judge, assign: id => assign(etudes.find(e => e.etude.id === id)),
    press, release, muffle, stroke, startEtude, stop: () => { stopRun(); endEtudeUI(); },
    /** PLAY ALONG in ?demo: a hit on drum i at `rel` s from the first note, held `hold` s */
    attack: (i, rel, hold = 0) => { const run = S.run; if (!run || run.kind !== 'along') return false; run.attacks.push({rel, drum: i, hold}); return true; },
    flush, centerOf, ARC, solveArc,
    /** the picture in page px: the seat, each drum's center and radius, its pedal (toe, heel, width, axis), its ✋ */
    arc: () => {
      if (!L) return null;
      const b = $('prDrums').getBoundingClientRect(), P = q => ({x: b.left + q[0], y: b.top + q[1]});
      return {s: L.s, R: L.R, span: L.span, limited: L.limited, over: L.over, room: L.room, box: {x: b.left, y: b.top, w: b.width, h: b.height},
        seat: Object.assign(P(L.seat.c), {r: L.seat.r}),
        drums: L.drums.map(d => ({i: d.i, id: d.id, c: P(d.c), r: d.r, th: d.th, u: d.u, toe: P(d.toe), heel: P(d.heel), w: d.w, l: d.l, track: d.track,
          hand: Object.assign(P(d.hand.c), {size: d.hand.s})}))};
    },
    /** tests: end the running HEAR IT / PLAY ALONG now, as if it had played to its end (PLAY ALONG is judged) */
    endNow: () => { if (S.run && S.run.tr) S.run.tr.stop(false); },
    state: () => ({open: S.open, cfg: JSON.parse(JSON.stringify(cfg())), order: order().map(o => o.i), sel: S.sel, dyn: S.dyn, show: S.show,
      drums: cfg().drums.map((x, i) => ({id: x.id, pedal: x.pedal, fine: x.fine, freq: freqOf(i), midi: midiOf(i)})),
      presses: Object.values(S.presses).map(p => ({i: p.i, id: p.id, rolling: p.rolling, n: p.n || 0})),
      click: S.clickOn, run: S.run ? {kind: S.run.kind, pass: S.run.pass, log: S.run.tr ? S.run.tr.log.slice() : [], lead: S.run.lead, endS: S.run.PL ? S.run.PL.endS : null, attacks: (S.run.attacks || []).slice(), J: S.run.J || null} : null,
      etude: S.etude ? S.etude.etude.id : null, passes: S.passes || 0, etudesBest: JSON.parse(JSON.stringify(gd().etudes || {})), badges: S.badges || null, result: $('prResult').textContent, lastResult: S.lastResult || null,
      sheet: {id: S.sheetId, type: S.sheetType, url: S.sheetURL, zoom: Object.assign({}, S.zoom), tip: !$('prPdfTip').hidden},
      playS: Object.assign({}, gd().playS || {}), unsaved: S.unsaved}),
  };
})(window.Arcade);
