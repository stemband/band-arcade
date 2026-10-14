/* ARCADE QUEST: the ENEMY TURN = a dodge (no instrument: a rest for lips and breath; the mic is not listening).
   The student steers a small glowing music note inside a white-bordered box (arrows/WASD, the D-pad, or drag
   anywhere on the screen: the note follows your finger's movement, so your finger never hides it) and dodges what
   the enemy throws, from its `dodge.patterns` (data/enemies.js):
     rain   falls from the top at a random spot          side   flies across from the left or right
     burst  a static burst: a warning ring, then pieces flying outward
     aimed  heads for where your note is                 wave   a row falling from the top, with one gap
   THE GHOST CONDUCTOR's (Episode 1's final boss):
     baton    a faint warning line, then his baton sweeps across the box around one corner (speed = how fast)
     measure  a row of falling measures of music (five lines and bar lines), with one gap
     sweep    small fermatas swooping across in a wave
   EPISODE 2's MACHINES (each fair: a warning first or a way through; Easy and the Metronome slow them like the rest;
   REDUCED MOTION keeps the danger moving (that's the dodge) but drops what only decorates: the confetti's twinkle, the
   tickets' flip, the rings' static, the beam's shimmer, the beat glow's swell):
     taps      tap shoes falling in columns, each LANDING EXACTLY ON A BEAT of a steady `bpm` (a soft tap; the floor
               glows on the beat): listen and move between beats
     beam      a spotlight's pool of light sweeping along one lane; a thin dotted warning line along that lane first
               (FX.beam.warnS ≥ 0.8 s): leave the lane
     squeal    a squiggly feedback wave (a train of little squiggles) crossing the box
     confetti  a warning ring, then a burst of confetti scattering from it and drifting down
     pendulum  a pendulum swinging across from above the box (a dotted arc first): only its weight hurts
     stubs     ticket stubs fluttering down on gentle side-to-side paths
     rope      a swaying rope sinking down the box, with a gap that drifts side to side: slip through the gap
     rings     static rings expanding from the top (the Mic-let), each with a gap: slip through it
   Never a flash: nothing blinks faster than 3 times a second, nothing fills the box.
   Q.dodge.start({enemy, easy, slow, shield, assist, mute, charm, onHit}) -> Promise {damage, hits, blocked, muted}
   Easy: slower and fewer; Metronome (slow): slower still; Cork Grease (shield): blocks hits; Assist: half damage.
   Charms (ARCADE QUEST ONLY): charm = the Metronome Charm's speed factor; mute = the Silver Mute's blocks left. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const BOX = {x: 100, y: 84, w: 120, h: 84};
  const SPEED = 82;                                            // your note, px per second
  let D = null;

  /* EPISODE 2's lingering hazards (beam, pendulum, rope, rings): {spawn(pat, sp), step(o, dt), hit(o, cx, cy), draw(ctx, o, now),
     done(o)}; one hit per hazard (like the baton) */
  const FX = {
    beam: {
      warnS: .8, r: 11,
      spawn(pat, sp) { const b = BOX, left = Math.random() < .5, y = Q.rand(b.y + 14, b.y + b.h - 14); return {y, x: left ? b.x - 12 : b.x + b.w + 12, dir: left ? 1 : -1, sp, go: D.t + Math.max(FX.beam.warnS, .8 / D.mult.speed)}; },
      step(o, dt) { if (D.t >= o.go) { if (!o.on) { o.on = true; Q.sfx('quest-spot-hum'); } o.x += o.dir * o.sp * dt; } },
      hit: (o, cx, cy) => o.on && Math.hypot(cx - o.x, cy - o.y) < FX.beam.r - 2,
      done: o => o.on && (o.dir > 0 ? o.x > BOX.x + BOX.w + 14 : o.x < BOX.x - 14),
      draw(ctx, o, now) {
        if (!o.on) { ctx.strokeStyle = Q.css('q-stage-glow'); ctx.globalAlpha = .7; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(BOX.x, o.y); ctx.lineTo(BOX.x + BOX.w, o.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; return; }
        const r = FX.beam.r + (Q.reduced() ? 0 : Math.sin(now / 90) * .6);
        ctx.fillStyle = Q.css('q-stage-glow'); ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(o.x - 3, BOX.y - 2); ctx.lineTo(o.x + 3, BOX.y - 2); ctx.lineTo(o.x + r, o.y); ctx.lineTo(o.x - r, o.y); ctx.fill();
        ctx.globalAlpha = .75; ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * .7, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      },
    },
    pendulum: {
      spawn(pat, sp) { const b = BOX; return {px: Q.rand(b.x + 40, b.x + b.w - 40), py: b.y - 24, len: b.h * .78 + 24, amp: .78, period: 2.4 / (pat.speed || 1) / D.mult.speed, go: D.t + .7, side: Math.random() < .5 ? 1 : -1, last: 0}; },
      ang(o) { return o.side * o.amp * Math.cos(Math.PI * 2 * (D.t - o.go) / o.period); },
      bob(o) { const a = FX.pendulum.ang(o); return [o.px + Math.sin(a) * o.len, o.py + Math.cos(a) * o.len]; },
      step(o) { if (D.t < o.go) return; const a = FX.pendulum.ang(o), sg = Math.sign(a); if (o.last && sg !== o.last) Q.sfx('quest-tick'); o.last = sg; },
      hit(o, cx, cy) { if (D.t < o.go) return false; const [x, y] = FX.pendulum.bob(o); return Math.hypot(cx - x, cy - y) < 7; },
      done: o => D.t > o.go + o.period,
      draw(ctx, o) {
        if (D.t < o.go) {                                       // the warning: a faint dotted arc where the weight will swing
          ctx.strokeStyle = Q.css('q-purple'); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.arc(o.px, o.py, o.len, Math.PI / 2 - o.amp, Math.PI / 2 + o.amp); ctx.stroke(); ctx.setLineDash([]); return;
        }
        const [x, y] = FX.pendulum.bob(o);
        ctx.strokeStyle = Q.css('q-brass'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.px, o.py); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = Q.css('q-brass-d'); ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = Q.css('q-brass'); ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 3, 0, Math.PI * 2); ctx.fill();
      },
    },
    rope: {
      gapW: 26,
      spawn(pat, sp) { const b = BOX; return {y: b.y - 3, sp, gx0: Q.rand(b.x + 28, b.x + b.w - 28), amp: Q.rand(10, 20), f: Q.rand(.35, .55) * D.mult.speed, born: D.t}; },
      gap: o => Q.clamp(o.gx0 + Math.sin((D.t - o.born) * o.f * Math.PI * 2) * o.amp, BOX.x + 16, BOX.x + BOX.w - 16),
      step(o, dt) { o.y += o.sp * dt; },
      hit: (o, cx, cy) => Math.abs(cy - o.y) < 2.5 && Math.abs(cx - FX.rope.gap(o)) > FX.rope.gapW / 2,
      done: o => o.y > BOX.y + BOX.h + 4,
      draw(ctx, o) {
        const g = FX.rope.gap(o), w = FX.rope.gapW / 2, y = Math.round(o.y);
        ctx.fillStyle = Q.css('q-stage-trim-d'); ctx.fillRect(BOX.x, y - 1, g - w - BOX.x, 3); ctx.fillRect(g + w, y - 1, BOX.x + BOX.w - g - w, 3);
        ctx.fillStyle = Q.css('q-stage-trim'); ctx.fillRect(BOX.x, y - 1, g - w - BOX.x, 1); ctx.fillRect(g + w, y - 1, BOX.x + BOX.w - g - w, 1);
        ctx.fillRect(Math.round(g - w - 3), y - 2, 4, 5); ctx.fillRect(Math.round(g + w - 1), y - 2, 4, 5);   // knots at the gap's edges
      },
    },
    rings: {
      gapW: 1.0,
      spawn(pat, sp) { const b = BOX; return {x: b.x + b.w / 2, y: b.y - 8, r: 4, sp, gapA: Q.rand(Math.PI * .2, Math.PI * .8)}; },
      step(o, dt) { o.r += o.sp * dt; },
      hit(o, cx, cy) {
        const d = Math.hypot(cx - o.x, cy - o.y); if (Math.abs(d - o.r) > 2.5) return false;
        const a = Math.atan2(cy - o.y, cx - o.x); let diff = Math.abs(a - o.gapA); if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return diff > FX.rings.gapW / 2;
      },
      done: o => o.r > Math.hypot(BOX.w, BOX.h) + 10,
      draw(ctx, o, now) {
        ctx.strokeStyle = Q.css('q-grey'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, o.gapA + FX.rings.gapW / 2, o.gapA - FX.rings.gapW / 2 + Math.PI * 2); ctx.stroke();
        if (!Q.reduced()) {                                     // a little static along the ring (decoration only)
          ctx.fillStyle = Q.css('q-white');
          for (let k = 0; k < 6; k++) { const a = o.gapA + FX.rings.gapW / 2 + ((k * 1.03 + now / 700) % (Math.PI * 2 - FX.rings.gapW)); ctx.fillRect(Math.round(o.x + Math.cos(a) * o.r), Math.round(o.y + Math.sin(a) * o.r), 1, 1); }
        }
        ctx.fillStyle = Q.css('q-stage-glow-red'); ctx.fillRect(o.x - 1, BOX.y, 2, 2);          // the Mic-let's red light, where they start
      },
    },
  };
  const CONFETTI = ['q-pink', 'q-gold', 'q-cursor', 'q-green', 'q-orange'];
  function spawn(pat, mult) {
    const b = BOX, sp = pat.speed * mult.speed, s = Q.spriteDef(pat.sprite) || {w: 6, h: 6};
    const add = (x, y, vx, vy, extra) => D.shots.push(Object.assign({x, y, vx, vy, sprite: pat.sprite, w: s.w, h: s.h, born: D.t}, extra || {}));
    if (pat.kind === 'rain') add(Q.rand(b.x, b.x + b.w - s.w), b.y - s.h, 0, sp);
    else if (pat.kind === 'side') { const left = Math.random() < .5; add(left ? b.x - s.w : b.x + b.w, Q.rand(b.y, b.y + b.h - s.h), left ? sp : -sp, 0); }
    else if (pat.kind === 'aimed') {
      const side = Math.floor(Math.random() * 3), x = side === 0 ? b.x - s.w : side === 1 ? b.x + b.w : Q.rand(b.x, b.x + b.w), y = side === 2 ? b.y - s.h : Q.rand(b.y, b.y + b.h);
      const dx = D.cx - x, dy = D.cy - y, d = Math.hypot(dx, dy) || 1;
      add(x, y, dx / d * sp, dy / d * sp);
    } else if (pat.kind === 'wave') {
      const gap = Q.rand(b.x + 10, b.x + b.w - 30);
      for (let x = b.x; x < b.x + b.w - s.w; x += s.w + 4) if (x < gap || x > gap + 22) add(x, b.y - s.h, 0, sp * .8);
    } else if (pat.kind === 'measure') {                      // a row of measures, one gap
      const mw = 24, gapAt = Math.floor(Q.rand(0, Math.floor(b.w / (mw + 4))));
      for (let k = 0, x = b.x; x < b.x + b.w - 6; k++, x += mw + 4) if (k !== gapAt) add(x, b.y - 12, 0, sp, {rect: true, w: mw, h: 12});
    } else if (pat.kind === 'sweep') {                        // fermatas swooping across on a wave
      const left = Math.random() < .5, y0 = Q.rand(b.y + 12, b.y + b.h - 18);
      add(left ? b.x - s.w : b.x + b.w, y0, left ? sp : -sp, 0, {y0, amp: Q.rand(8, 14), freq: Q.rand(1.2, 1.8)});
    } else if (pat.kind === 'baton') {                        // the baton: pivots at a corner and sweeps a quarter turn
      const corner = Math.floor(Math.random() * 4), px = corner % 2 ? b.x + b.w : b.x, py = corner > 1 ? b.y + b.h : b.y;
      const base = [0, Math.PI / 2, -Math.PI / 2, Math.PI][corner], dir = Math.random() < .5 ? 1 : -1;
      D.batons.push({px, py, a0: dir > 0 ? base : base + Math.PI / 2, a1: dir > 0 ? base + Math.PI / 2 : base, len: Math.hypot(b.w, b.h) * .8,
        warn: D.t, go: D.t + .7 / (pat.speed || 1) * (D.mult.speed < 1 ? 1.3 : 1), dur: 1 / (pat.speed || 1) / D.mult.speed});
    } else if (FX[pat.kind]) {                                // Episode 2's lingering hazards (FX above)
      D.fx.push(Object.assign({kind: pat.kind, born: D.t}, FX[pat.kind].spawn(pat, sp)));
    } else if (pat.kind === 'taps') {                         // a tap shoe that lands exactly on the next-but-one beat
      const beatS = 60 / ((pat.bpm || 96) * mult.speed), cols = pat.cols || 5, c = Math.floor(Math.random() * cols);
      const x = b.x + (b.w - s.w) * (c + .5) / cols, vy = (b.h + s.h) / (2 * beatS);
      add(x, b.y - s.h, 0, vy, {tap: true, lands: D.t + 2 * beatS});
    } else if (pat.kind === 'squeal') {                       // a squiggly train of feedback crossing on a wave
      const left = Math.random() < .5, y0 = Q.rand(b.y + 14, b.y + b.h - 18), amp = Q.rand(6, 11), freq = Q.rand(1.4, 2);
      for (let k = 0; k < 6; k++) add((left ? b.x - s.w : b.x + b.w) - (left ? 1 : -1) * k * 7, y0, left ? sp : -sp, 0, {y0, amp, freq, born: D.t - k * .07});
    } else if (pat.kind === 'stubs') {                        // a ticket stub fluttering down, side to side
      const x0 = Q.rand(b.x + 8, b.x + b.w - 8 - s.w);
      add(x0, b.y - s.h, 0, sp, {x0, ax: Q.rand(6, 12), freq: Q.rand(.6, 1), flip: Math.random() < .5});
    } else if (pat.kind === 'confetti') {                     // a warning ring, then confetti scattering and drifting down
      const x = Q.rand(b.x + 18, b.x + b.w - 18), y = Q.rand(b.y + 12, b.y + b.h / 2), n = pat.count || 10;
      D.warn.push({x, y, at: D.t + 0.55, n, sp, confetti: true});
    } else if (pat.kind === 'burst') {
      const x = Q.rand(b.x + 16, b.x + b.w - 16), y = Q.rand(b.y + 14, b.y + b.h - 14), n = pat.count || 6;
      D.warn.push({x, y, at: D.t + 0.55, n, sp, sprite: pat.sprite});   // a warning ring first (fair!)
    }
  }
  Q.dodge = {
    active: () => !!D,
    start({enemy, easy, slow, shield = 0, assist, mute = 0, charm = 1, onHit}) {
      const dd = enemy.dodge || {seconds: 6, patterns: [{kind: 'rain', sprite: 'sour', every: .6, speed: 45}]};
      const mult = {speed: (easy ? .7 : 1) * (slow || 1) * (charm || 1), every: easy ? 1.45 : 1};
      return new Promise(done => {
        D = {t: 0, len: dd.seconds, pats: dd.patterns.map(p => Object.assign({next: 0.35 + Math.random() * .4}, p)), mult, shots: [], warn: [], batons: [], fx: [], landed: [],
          cx: BOX.x + BOX.w / 2 - 3, cy: BOX.y + BOX.h / 2 - 4, inv: 0, damage: 0, hits: 0, blocked: 0, shield, mute, muted: 0, assist, atk: enemy.atk || 2, onHit, done, drag: null};
        const st = Q.stage;
        D.pd = e => { D.drag = {x: e.clientX, y: e.clientY}; };
        D.pm = e => {
          if (!D || !D.drag) return;
          const k = Q.W / Q.canvas.getBoundingClientRect().width;
          D.cx += (e.clientX - D.drag.x) * k * 1.15; D.cy += (e.clientY - D.drag.y) * k * 1.15;
          D.drag = {x: e.clientX, y: e.clientY};
        };
        D.pu = () => { if (D) D.drag = null; };
        st.addEventListener('pointerdown', D.pd); addEventListener('pointermove', D.pm); addEventListener('pointerup', D.pu);
        st.classList.add('q-dodging');
      });
    },
    update(dt) {
      if (!D) return;
      D.t += dt;
      const h = Q.input.held;
      const vx = (h.right ? 1 : 0) - (h.left ? 1 : 0), vy = (h.down ? 1 : 0) - (h.up ? 1 : 0);
      D.cx = Q.clamp(D.cx + vx * SPEED * dt, BOX.x + 2, BOX.x + BOX.w - 9); D.cy = Q.clamp(D.cy + vy * SPEED * dt, BOX.y + 2, BOX.y + BOX.h - 11);
      if (D.t < D.len - 0.8) D.pats.forEach(p => {
        if (D.t < p.next) return;
        spawn(p, D.mult);
        // taps keep a steady beat (every beat, exactly); everything else comes every `every` seconds, give or take
        p.next = p.kind === 'taps' ? p.next + 60 / ((p.bpm || 96) * D.mult.speed) : D.t + p.every * D.mult.every * Q.rand(.8, 1.2);
      });
      D.warn = D.warn.filter(w => {
        if (D.t < w.at) return true;
        const s = Q.spriteDef(w.sprite) || {w: 6, h: 6};
        if (w.confetti) {
          Q.sfx('quest-confetti');
          for (let i = 0; i < w.n; i++) { const a = i / w.n * Math.PI * 2 + Math.random() * .4, v = w.sp * Q.rand(.7, 1.1); D.shots.push({x: w.x - 2, y: w.y - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 12, grav: 34, col: CONFETTI[i % CONFETTI.length], w: 5, h: 5, born: D.t}); }   // (drawn 3 px, hit as 5: fair)
          return false;
        }
        for (let i = 0; i < w.n; i++) { const a = i / w.n * Math.PI * 2 + Math.random() * .3; D.shots.push({x: w.x - s.w / 2, y: w.y - s.h / 2, vx: Math.cos(a) * w.sp, vy: Math.sin(a) * w.sp, sprite: w.sprite, w: s.w, h: s.h}); }
        return false;
      });
      D.shots.forEach(s => {
        if (s.grav) s.vy = Math.min(s.vy + s.grav * dt, 40);
        s.x = s.ax ? s.x0 + Math.sin((D.t - s.born) * s.freq * Math.PI * 2) * s.ax : s.x + s.vx * dt;
        s.y = s.amp ? s.y0 + Math.sin((D.t - s.born) * s.freq * Math.PI * 2) * s.amp : s.y + s.vy * dt;
      });
      // a tap shoe reaching the floor ON its beat: a soft tap, and the floor glows there
      D.shots = D.shots.filter(s => { if (!s.tap || s.y + s.h < BOX.y + BOX.h) return true; D.landed.push({x: s.x + s.w / 2, t: D.t}); Q.sfx('quest-tap'); return false; });
      D.landed = D.landed.filter(l => D.t - l.t < .35);
      D.fx.forEach(o => FX[o.kind].step(o, dt));
      D.fx = D.fx.filter(o => !FX[o.kind].done(o));
      D.batons = D.batons.filter(bt => D.t < bt.go + bt.dur + .15);
      D.shots = D.shots.filter(s => s.x > BOX.x - 20 && s.x < BOX.x + BOX.w + 20 && s.y > BOX.y - 20 && s.y < BOX.y + BOX.h + 20);
      if (D.inv > 0) D.inv -= dt;
      else {
        const cx = D.cx + 3.5, cy = D.cy + 5;                   // the note's head: a small, forgiving hitbox
        let hit = D.shots.find(s => cx > s.x + 1 && cx < s.x + s.w - 1 && cy > s.y + 1 && cy < s.y + s.h - 1 &&
          s.x > BOX.x - 2 && s.x < BOX.x + BOX.w && s.y > BOX.y - 2 && s.y < BOX.y + BOX.h);
        if (!hit) {                                             // the baton: close to the swinging line (a forgiving 3 px)
          const bt = D.batons.find(t => D.t >= t.go && D.t <= t.go + t.dur && (() => {
            const a = t.a0 + (t.a1 - t.a0) * (D.t - t.go) / t.dur, ex = t.px + Math.cos(a) * t.len, ey = t.py + Math.sin(a) * t.len;
            const vx = ex - t.px, vy = ey - t.py, k = Q.clamp(((cx - t.px) * vx + (cy - t.py) * vy) / (vx * vx + vy * vy), 0, 1);
            return Math.hypot(t.px + vx * k - cx, t.py + vy * k - cy) < 3;
          })());
          if (bt) { hit = {baton: true}; bt.go = -99; }         // one hit per swing
        }
        if (!hit) {                                             // Episode 2's hazards: one hit each
          const o = D.fx.find(f => !f.spent && FX[f.kind].hit(f, cx, cy));
          if (o) { hit = {baton: true}; o.spent = true; }
        }
        if (hit) {
          if (!hit.baton) D.shots.splice(D.shots.indexOf(hit), 1);
          D.inv = 0.9; D.hits++;
          let dmg = 0;
          if (D.shield > 0) { D.shield--; D.blocked++; }
          else if (D.mute > 0) { D.mute--; D.muted++; }
          else { dmg = Math.max(1, Math.round(D.atk * (D.assist ? .5 : 1))); D.damage += dmg; }
          if (D.onHit && D.onHit(dmg, !dmg) === 'stop') D.t = D.len;
          Q.shake(2, 160);
        }
      }
      if (D.t >= D.len) this.end();
    },
    end() {
      if (!D) return;
      const d = D; D = null;
      Q.stage.removeEventListener('pointerdown', d.pd); removeEventListener('pointermove', d.pm); removeEventListener('pointerup', d.pu);
      Q.stage.classList.remove('q-dodging');
      d.done({damage: d.damage, hits: d.hits, blocked: d.blocked, muted: d.muted, shieldLeft: d.shield, muteLeft: d.mute});
    },
    draw(ctx, now) {
      if (!D) return;
      const b = BOX;
      ctx.fillStyle = Q.css('q-black'); ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.strokeStyle = Q.css('q-white'); ctx.lineWidth = 2; ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      D.warn.forEach(w => { ctx.strokeStyle = Q.css(w.confetti ? 'q-pink' : 'q-purple'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(w.x), Math.round(w.y), 7 - (w.at - D.t) * 6, 0, Math.PI * 2); ctx.stroke(); });
      D.fx.forEach(o => FX[o.kind].draw(ctx, o, now));
      // the taps' beat: the floor glows softly where a tap shoe just landed (a fade, never a flash)
      D.landed.forEach(l => { ctx.fillStyle = Q.css('q-stage-glow'); ctx.globalAlpha = .5 * (1 - (D.t - l.t) / .35); ctx.fillRect(Math.round(l.x - 8), b.y + b.h - 3, 16, 3); ctx.globalAlpha = 1; });
      D.shots.forEach(s => {
        if (s.col) { ctx.fillStyle = Q.css(s.col); const tw = !Q.reduced() && Math.floor((now / 160 + s.x) % 2) ? 2 : 3; ctx.fillRect(Math.round(s.x + 1), Math.round(s.y + 1), tw, 3 - (tw === 2 ? 1 : 0)); return; }   // confetti (its twinkle: decoration)
        if (s.flip != null) return Q.draw(ctx, s.sprite, s.x, s.y, {t: now, flip: !Q.reduced() && Math.floor((D.t - s.born) * 2) % 2 === 0});   // a ticket stub flipping as it flutters
        if (!s.rect) return Q.draw(ctx, s.sprite, s.x, s.y, {t: now});
        // a measure of music: five lines, a bar line at each end, and a note in it
        ctx.fillStyle = Q.css('q-paper'); ctx.globalAlpha = .9;
        for (let l = 0; l < 5; l++) ctx.fillRect(Math.round(s.x), Math.round(s.y + l * 3), s.w, 1);
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 13); ctx.fillRect(Math.round(s.x + s.w - 1), Math.round(s.y), 1, 13);
        ctx.fillStyle = Q.css('q-sour'); ctx.fillRect(Math.round(s.x + s.w / 2 - 2), Math.round(s.y + 5), 4, 3); ctx.fillRect(Math.round(s.x + s.w / 2 + 1), Math.round(s.y - 3), 1, 8);
        ctx.globalAlpha = 1;
      });
      D.batons.forEach(t => {
        if (D.t < t.go) {                                      // the warning: a faint dotted arc of where it will sweep
          ctx.strokeStyle = Q.css('q-purple'); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(t.px, t.py); ctx.lineTo(t.px + Math.cos(t.a0) * t.len, t.py + Math.sin(t.a0) * t.len); ctx.stroke();
          ctx.beginPath(); ctx.arc(t.px, t.py, t.len * .6, Math.min(t.a0, t.a1), Math.max(t.a0, t.a1)); ctx.stroke(); ctx.setLineDash([]);
        } else if (D.t <= t.go + t.dur) {
          const a = t.a0 + (t.a1 - t.a0) * (D.t - t.go) / t.dur, ex = t.px + Math.cos(a) * t.len, ey = t.py + Math.sin(a) * t.len;
          ctx.strokeStyle = Q.css('q-purple'); ctx.globalAlpha = .45; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(t.px, t.py); ctx.lineTo(ex, ey); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.strokeStyle = Q.css('q-white'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.px, t.py); ctx.lineTo(ex, ey); ctx.stroke();
          Q.draw(ctx, 'baton-tip', Math.round(ex - 2), Math.round(ey - 2));
        }
      });
      // your note: a soft glow behind it; after a hit it blinks (or, with reduced motion, gets a ring)
      const blink = D.inv > 0 && !Q.reduced() && Math.floor(D.inv * 10) % 2 === 0;
      ctx.fillStyle = Q.css('q-cursor'); ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(D.cx + 3.5, D.cy + 5, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (D.inv > 0 && Q.reduced()) { ctx.strokeStyle = Q.css('q-white'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(D.cx + 3.5, D.cy + 5, 7, 0, Math.PI * 2); ctx.stroke(); }
      if (!blink) Q.draw(ctx, 'cursor', D.cx, D.cy);
      ctx.restore();
      // the time left, as a thin bar under the box
      ctx.fillStyle = Q.css('q-grey-d'); ctx.fillRect(b.x, b.y + b.h + 4, b.w, 2);
      ctx.fillStyle = Q.css('q-cursor'); ctx.fillRect(b.x, b.y + b.h + 4, b.w * Math.max(0, 1 - D.t / D.len), 2);
    },
    state: () => D && {t: D.t, len: D.len, speed: D.mult.speed, mute: D.mute, muted: D.muted, shots: D.shots.length, batons: D.batons.length, hits: D.hits, cx: D.cx, cy: D.cy, damage: D.damage,
      fx: D.fx.map(o => o.kind), kinds: [...new Set(D.shots.map(s => (s.tap ? 'taps' : s.col ? 'confetti' : s.ax ? 'stubs' : s.amp ? 'wave' : 'shot')))],
      taps: D.shots.filter(s => s.tap).map(s => +(s.lands).toFixed(3)), landed: D.landed.length, warns: D.fx.filter(o => o.go != null).map(o => +(o.go - o.born).toFixed(3))},   // tests
  };
})(window.Arcade);
