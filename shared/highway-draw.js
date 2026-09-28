/* Band Arcade: THE MUSIC HIGHWAY DRAWING, shared by the game (music-highway/game.js) and its cabinet's attract screen
   (shared/cabinets.js SCREENS.highway, arcade3d.js SCREENS3D.highway), so the cabinet always shows the game as it is.
   Needs shared/bg-scenes.js (the synthwave sunset: BgScenes.sunset.paint). Colors: theme tokens only.

   A VIEW (V) is one highway's geometry, in CSS pixels of its canvas:
     {W, roadH (the road canvas's height), cx, hy (horizon), sy (the strike line), K (road depth), half (the road's half
      width at the strike line), nl (lanes), laneW, padW, padH, gateW, gateH, lead (s a pad is on the road),
      minFont (smallest gate label)}
   Arcade.HighwayDraw:
     laneX(V, lane, s)                       a lane's centre at depth scale s (1 = the strike line)
     proj(V, dt)                             where a moment dt s away is: {d, s (scale), y}. Depth d = (1 + K)^(dt / lead):
                                             a pad's size and its distance to the next pad shrink together; past the line
                                             a pad keeps the line's speed at full size
     paintStatic(V, labels, {dpr, q})        the still layer, drawn ONCE: the sunset, the road, its edges, the strike line,
                                             the unlit gates and their letter names -> a canvas (V.sun = the sun)
     drawRoad(g, V, {t, spb, per, still})    ONLY THE ROAD MOVES: one cross line per beat (crossing the gates ON the beat,
                                             downbeats magenta) and the lane dividers' dashes rolling with them
     drawTrails(g, V, notes, {from, t, q})   the light trails of notes with `trail` (burning bright while `holding`)
     drawPads(g, V, notes, {from, t, q, names, onPad})   the neon pads (a hit one is consumed by its gate)
     drawGates(g, V, lanes, {q})             the gates' glow: lanes = [{v (0–1), col (a letter: 'c'…'b'), bad (0–1)}]
     attract(x, W, H, t)                     THE CABINET'S ATTRACT DEMO (below): t = s, or null = the still frame
   A note = {t, end, tEnd, lane, color ('c'…'b', 'e'/'g' for the snare), label, trail, res, holding}. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const TOK = {}, tok = name => TOK[name] || (TOK[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || 'white');
  const FONT = () => getComputedStyle(document.documentElement).getPropertyValue('--display').trim() || 'sans-serif';

  const laneX = (V, l, s = 1) => V.cx + (l - (V.nl - 1) / 2) * V.laneW * s;
  function proj(V, dt) {
    const L = V.lead, H = V.sy - V.hy;
    if (dt < 0) return {d: 1, s: 1, y: V.sy - dt / L * H * Math.log(1 + V.K)};
    const d = Math.pow(1 + V.K, dt / L);
    return {d, s: 1 / d, y: V.hy + H / d};
  }
  function rrect(g, x, y, w, h, r) {                              // a rounded rectangle path (no ctx.roundRect on older iPads)
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* the parts that never move, drawn once: the sunset, the road, its edges, the unlit gates and their letter names */
  function paintStatic(V, labels, {dpr = 1, q = 'hi', stars} = {}) {
    const W = V.W, H = V.roadH;
    const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (A.BgScenes && A.BgScenes.sunset) V.sun = A.BgScenes.sunset.paint(g, W, H, {hz: V.hy, cx: V.cx, stars: stars != null ? stars : q === 'lo' ? 15 : 60, mountains: q !== 'lo'}).sun;
    else { g.fillStyle = tok('mh-sky'); g.fillRect(0, 0, W, H); }
    // the road: from the vanishing point on the horizon to the bottom (lines through the vanishing point = perspective)
    const Hr = V.sy - V.hy, dB = Hr / (H - V.hy), xB = u => V.cx + u * V.half / dB, thick = Math.max(1.5, Math.min(3, W / 340));
    g.globalAlpha = .9; g.fillStyle = tok('mh-road');
    g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(1), H); g.lineTo(xB(-1), H); g.closePath(); g.fill(); g.globalAlpha = 1;
    for (const u of [-1, 1]) {                                     // the road's edges (the lane dashes move: drawRoad)
      if (q !== 'lo') { g.strokeStyle = tok('pink'); g.globalAlpha = .25; g.lineWidth = thick * 3; g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(u), H); g.stroke(); }
      g.strokeStyle = tok('pink'); g.globalAlpha = .95; g.lineWidth = thick;
      g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(u), H); g.stroke();
    }
    g.globalAlpha = 1;
    // the strike line and the gates (unlit), with each lane's letter name under its gate
    g.strokeStyle = tok('cyan'); g.globalAlpha = .7; g.lineWidth = Math.max(1, thick * .7);
    g.beginPath(); g.moveTo(V.cx - V.half, V.sy); g.lineTo(V.cx + V.half, V.sy); g.stroke(); g.globalAlpha = 1;
    const fs = Math.max(V.minFont || 13, Math.min(24, V.laneW * .3));
    g.font = `${fs}px ${FONT()}`; g.textAlign = 'center'; g.textBaseline = 'top';
    labels.forEach((lb, l) => {
      const x = laneX(V, l);
      g.fillStyle = tok('deep'); g.globalAlpha = .55; rrect(g, x - V.gateW / 2, V.sy - V.gateH / 2, V.gateW, V.gateH, V.gateH * .35); g.fill();
      g.globalAlpha = .85; g.strokeStyle = tok('mh-gate'); g.lineWidth = Math.max(1, thick * .7); g.stroke();
      g.globalAlpha = 1; g.lineWidth = Math.max(2, fs * .25); g.strokeStyle = tok('deep'); g.fillStyle = tok('text-hi');
      g.strokeText(lb, x, V.sy + V.gateH / 2 + fs * .35); g.fillText(lb, x, V.sy + V.gateH / 2 + fs * .35);
    });
    return c;
  }

  /* ONLY THE ROAD MOVES: the sky, sun, mountains and the ground beside the road are the still layer. On the road: one
     cross line per beat, crossing the gates ON the beat (downbeats magenta), and the lane dividers' dashes rolling toward
     the player with them. still (reduced motion) = the road stands still too. */
  function drawRoad(g, V, {t, spb, per, still}) {
    const tg = still ? 0 : t, dMax = Math.pow(1 + V.K, 1.6), Hr = V.sy - V.hy, thin = Math.max(.8, Math.min(1.2, V.W / 700));
    const yAt = dt => { const p = proj(V, dt); return p.d > dMax ? null : p.y; };
    const hw = y => V.half * (y - V.hy) / Hr;                       // the road's half width at height y (through the vanishing point)
    const fadeAt = y => Math.max(0, Math.min(1, (y - V.hy) / (Hr * .35)));
    const b0 = Math.floor((tg - V.lead) / spb) - 1, b1 = Math.floor((tg + V.lead * 1.6) / spb) + 1;
    for (let b = b0; b <= b1; b++) {
      const y = yAt(b * spb - tg); if (y == null || y > V.roadH) continue;
      const down = ((b % per) + per) % per === 0, w = hw(y);
      g.strokeStyle = tok(down ? 'mh-grid-2' : 'mh-grid'); g.lineWidth = (down ? 2 : 1.2) * thin; g.globalAlpha = (down ? .75 : .5) * fadeAt(y);
      g.beginPath(); g.moveTo(V.cx - w, y); g.lineTo(V.cx + w, y); g.stroke();
    }
    g.strokeStyle = tok('mh-lane'); g.lineWidth = 1.6 * thin;
    for (let b = b0; b <= b1; b++) {                                // dashes: half a beat long, one every beat
      const ya = yAt(b * spb - tg), yb = yAt((b + .5) * spb - tg);
      if (ya == null || yb == null) continue;
      const y0 = Math.min(ya, V.roadH), y1 = Math.min(yb, V.roadH); if (y0 === y1) continue;
      g.globalAlpha = .7 * fadeAt(Math.max(y0, y1));
      g.beginPath();
      for (let l = 1; l < V.nl; l++) { const u = -1 + l * 2 / V.nl; g.moveTo(V.cx + u * hw(y0), y0); g.lineTo(V.cx + u * hw(y1), y1); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* FULL-VALUE TRAILS: a light stretching back from the pad for the note's length (to tEnd); while held it burns bright */
  function drawTrails(g, V, notes, {from = 0, t, q = 'hi'}) {
    for (let k = from; k < notes.length && notes[k].t - t <= V.lead; k++) {
      const n = notes[k];
      if (!n.trail) continue;
      const a = n.t - t, e = n.tEnd - t;
      if (e < -.3) continue;
      const hit = n.res && n.res !== 'miss', lit = hit && n.holding && e > 0;
      const pa = proj(V, hit ? Math.max(a, 0) : Math.max(a, -.3)), pe = proj(V, Math.min(e, V.lead * 1.3));
      if (pe.y >= pa.y) continue;
      const x0 = laneX(V, n.lane, pa.s), x1 = laneX(V, n.lane, pe.s), w = V.padW * .34;
      const quad = k2 => { g.beginPath(); g.moveTo(x0 - w * k2 * pa.s, pa.y); g.lineTo(x0 + w * k2 * pa.s, pa.y); g.lineTo(x1 + w * k2 * pe.s, pe.y); g.lineTo(x1 - w * k2 * pe.s, pe.y); g.closePath(); };
      g.fillStyle = n.res === 'miss' ? tok('text-dim') : tok('mh-' + n.color);
      if (lit && q !== 'lo') { g.globalAlpha = .3; quad(1.9); g.fill(); }
      g.globalAlpha = n.res === 'miss' ? .2 : lit ? .95 : hit ? .3 : .55; quad(1); g.fill();
      if (lit) { g.fillStyle = tok('text-hi'); g.globalAlpha = .7; quad(.35); g.fill(); }
      g.globalAlpha = 1;
    }
  }

  /* THE PADS (a hit pad is consumed by its gate; a missed one rolls on, grey, and fades) */
  function drawPads(g, V, notes, {from = 0, t, q = 'hi', names = true, onPad}) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const font = FONT();
    for (let k = from; k < notes.length; k++) {
      const n = notes[k], dt = n.t - t;
      if (dt > V.lead) break;
      if (dt < -.45 || (n.res && n.res !== 'miss')) continue;
      const p = proj(V, dt), x = laneX(V, n.lane, p.s), w = V.padW * p.s, h = V.padH * p.s, y = p.y;
      const al = Math.min(1, (V.lead - dt) / (V.lead * .15)) * (dt < 0 ? Math.max(0, 1 + dt / .45) : 1);
      if (al <= 0) continue;
      const colr = n.res === 'miss' ? tok('text-dim') : tok('mh-' + n.color), halo = Math.max(2, V.padH * .08) * p.s;
      if (q !== 'lo' && !n.res) { g.globalAlpha = .28 * al; g.fillStyle = colr; rrect(g, x - w / 2 - halo, y - h / 2 - halo, w + halo * 2, h + halo * 2, h * .6); g.fill(); }
      g.globalAlpha = al; g.fillStyle = colr; rrect(g, x - w / 2, y - h / 2, w, h, h * .42); g.fill();
      g.fillStyle = tok('text-hi'); g.globalAlpha = .35 * al; rrect(g, x - w * .4, y - h * .38, w * .8, h * .26, h * .13); g.fill();
      g.globalAlpha = al; g.strokeStyle = tok('deep'); g.lineWidth = Math.max(1, Math.min(2.6, V.padH * .04) * p.s); rrect(g, x - w / 2, y - h / 2, w, h, h * .42); g.stroke();
      if (names && h >= 7) { g.fillStyle = tok('deep'); g.font = `${Math.round(h * .66)}px ${font}`; g.fillText(n.label, x, y + h * .04); }
      if (onPad) onPad(n, y);
    }
    g.globalAlpha = 1;
  }

  /* THE GATES' GLOW (the fades themselves are the caller's: v rises in 60 ms, falls in 200 ms) and the red miss outline */
  function drawGates(g, V, lanes, {q = 'hi'} = {}) {
    const sp = Math.max(4, Math.min(14, V.gateH * .25));
    lanes.forEach((ln, l) => {
      const x = laneX(V, l), gw = V.gateW, gh = V.gateH;
      if (ln.v > 0) {
        const c = tok('mh-' + ln.col);
        g.fillStyle = c;
        if (q !== 'lo') { g.globalAlpha = .18 * ln.v; rrect(g, x - gw / 2 - sp, V.sy - gh / 2 - sp, gw + sp * 2, gh + sp * 2, gh * .6); g.fill();
          g.globalAlpha = .3 * ln.v; rrect(g, x - gw / 2 - sp * .45, V.sy - gh / 2 - sp * .45, gw + sp * .9, gh + sp * .9, gh * .5); g.fill(); }
        g.globalAlpha = .6 * ln.v; rrect(g, x - gw / 2, V.sy - gh / 2, gw, gh, gh * .35); g.fill();
        g.globalAlpha = ln.v; g.strokeStyle = c; g.lineWidth = Math.max(1.5, sp * .22); g.stroke();
      }
      if (ln.bad > 0) { g.globalAlpha = .55 * ln.bad; g.strokeStyle = tok('red'); g.lineWidth = 2.5; rrect(g, x - gw / 2, V.sy - gh / 2, gw, gh, gh * .35); g.stroke(); }
    });
    g.globalAlpha = 1;
  }

  /* ================= THE CABINET'S ATTRACT DEMO =================
     The game at cabinet size, playing the first phrase of Hot Cross Buns (a tier-1 song: E D C, E D C) on the five
     first-five lanes, then looping: the still sunset, the road rolling at the song's tempo, pads with their letter
     names and full-value trails, each gate lighting as its pad arrives (a fade in, a fade out: never a blink), the half
     notes' trails burning bright while "held", PERFECT / GOOD above the gate and the combo ticking up. Everything is a
     function of t (no state), so the still frame and every copy agree. No sound. (A staff strip is left out: at cabinet
     size its notes would be a few pixels.) */
  const DEMO = {tempo: 88, per: 4, loopBeats: 10, lead: 1.9, still: 2.35, labels: ['C', 'D', 'E', 'F', 'G'],
    // [beat, beats, lane, judgment] of "3 2 1:2 | 3 2 1:2"
    notes: [[0, 1, 2, 'PERFECT'], [1, 1, 1, 'PERFECT'], [2, 2, 0, 'GOOD'], [4, 1, 2, 'PERFECT'], [5, 1, 1, 'PERFECT'], [6, 2, 0, 'PERFECT']]};
  const COLOR = ['c', 'd', 'e', 'f', 'g'];
  const cache = {};
  function demoView(W, H) {
    const key = W + 'x' + H;
    if (cache[key]) return cache[key];
    const V = {W, roadH: H, cx: W / 2, hy: H * .3, sy: H * .8, K: 5, nl: 5, lead: DEMO.lead, minFont: Math.max(8, H * .045)};
    V.half = W * .47; V.laneW = V.half * 2 / V.nl;
    V.padW = V.laneW * .8; V.padH = V.padW * .5; V.gateW = Math.min(V.laneW * .94, V.padW + W * .02); V.gateH = V.padH + H * .025;
    V.bg = paintStatic(V, DEMO.labels, {dpr: 1, stars: 30});
    return (cache[key] = V);
  }
  function attract(x, W, H, time) {
    const V = demoView(W, H), spb = 60 / DEMO.tempo, P = DEMO.loopBeats * spb, t = time == null ? DEMO.still : ((time % P) + P) % P;
    x.save(); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.drawImage(V.bg, 0, 0, W, H);
    drawRoad(x, V, {t, spb, per: DEMO.per, still: false});
    // this loop's notes, the next loop's (coming over the horizon) and the last one's (still leaving)
    const notes = [];
    [-1, 0, 1].forEach(k => DEMO.notes.forEach(([b, bs, lane, judge], i) => {
      const nt = (b + k * DEMO.loopBeats) * spb, dur = bs * spb;
      notes.push({t: nt, end: nt + dur, tEnd: nt + dur * .88, lane, color: COLOR[lane], label: DEMO.labels[lane], trail: true, judge, i, loop: k,
        res: t >= nt ? 'perfect' : null, holding: bs >= 2 && t < nt + dur * .88});
    }));
    drawTrails(x, V, notes, {t});
    drawPads(x, V, notes, {t});
    // the gates: each lights as its pad arrives, stays lit through a held note (a short note: a moment after it ends),
    // then fades out; fades only (60 ms in, 200 ms out)
    const lanes = DEMO.labels.map((_, l) => {
      const last = notes.filter(n => n.lane === l && n.t <= t).pop();
      if (!last) return {v: 0, col: COLOR[l], bad: 0};
      const off = DEMO.notes[last.i][1] >= 2 ? last.tEnd : last.end + .12;
      const v = t < off ? Math.min(1, (t - last.t) / .06) : Math.max(0, 1 - (t - off) / .2);
      return {v, col: COLOR[l], bad: 0};
    });
    drawGates(x, V, lanes, {});
    // PERFECT / GOOD over the gate (a fade up and away), and the combo
    const font = FONT(), hit = notes.filter(n => n.loop === 0 && n.t <= t), lastHit = notes.filter(n => n.t <= t).pop();
    if (lastHit && t - lastHit.t < .7) {
      const f = (t - lastHit.t) / .7;
      x.globalAlpha = 1 - f * f; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `${Math.round(H * .075)}px ${font}`; x.lineWidth = Math.max(2, H * .012); x.strokeStyle = tok('deep');
      x.fillStyle = tok(lastHit.judge === 'PERFECT' ? 'yellow-hi' : 'green-hi');
      const tx = Math.max(W * .2, Math.min(W * .8, laneX(V, lastHit.lane))), ty = V.sy - V.gateH - H * .05 - f * H * .04;
      x.strokeText(lastHit.judge, tx, ty); x.fillText(lastHit.judge, tx, ty);
    }
    if (hit.length) {
      x.globalAlpha = 1; x.textAlign = 'left'; x.textBaseline = 'top';
      x.font = `${Math.round(H * .055)}px ${font}`; x.lineWidth = Math.max(2, H * .01); x.strokeStyle = tok('deep'); x.fillStyle = tok('text-hi');
      const s = 'COMBO ' + hit.length; x.strokeText(s, W * .04, H * .04); x.fillText(s, W * .04, H * .04);
    }
    x.restore();
  }

  A.HighwayDraw = {laneX, proj, rrect, paintStatic, drawRoad, drawTrails, drawPads, drawGates, attract, DEMO, tok};
})(window.Arcade);
