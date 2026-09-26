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
   Q.dodge.start({enemy, easy, slow, shield, assist, mute, charm, onHit}) -> Promise {damage, hits, blocked, muted}
   Easy: slower and fewer; Metronome (slow): slower still; Cork Grease (shield): blocks hits; Assist: half damage.
   Charms (ARCADE QUEST ONLY): charm = the Metronome Charm's speed factor; mute = the Silver Mute's blocks left. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const BOX = {x: 100, y: 84, w: 120, h: 84};
  const SPEED = 82;                                            // your note, px per second
  let D = null;

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
        D = {t: 0, len: dd.seconds, pats: dd.patterns.map(p => Object.assign({next: 0.35 + Math.random() * .4}, p)), mult, shots: [], warn: [], batons: [],
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
      if (D.t < D.len - 0.8) D.pats.forEach(p => { if (D.t >= p.next) { spawn(p, D.mult); p.next = D.t + p.every * D.mult.every * Q.rand(.8, 1.2); } });
      D.warn = D.warn.filter(w => {
        if (D.t < w.at) return true;
        const s = Q.spriteDef(w.sprite) || {w: 6, h: 6};
        for (let i = 0; i < w.n; i++) { const a = i / w.n * Math.PI * 2 + Math.random() * .3; D.shots.push({x: w.x - s.w / 2, y: w.y - s.h / 2, vx: Math.cos(a) * w.sp, vy: Math.sin(a) * w.sp, sprite: w.sprite, w: s.w, h: s.h}); }
        return false;
      });
      D.shots.forEach(s => { s.x += s.vx * dt; s.y = s.amp ? s.y0 + Math.sin((D.t - s.born) * s.freq * Math.PI * 2) * s.amp : s.y + s.vy * dt; });
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
      D.warn.forEach(w => { ctx.strokeStyle = Q.css('q-purple'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(w.x), Math.round(w.y), 7 - (w.at - D.t) * 6, 0, Math.PI * 2); ctx.stroke(); });
      D.shots.forEach(s => {
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
    state: () => D && {t: D.t, len: D.len, speed: D.mult.speed, mute: D.mute, muted: D.muted, shots: D.shots.length, batons: D.batons.length, hits: D.hits, cx: D.cx, cy: D.cy, damage: D.damage},   // tests
  };
})(window.Arcade);
