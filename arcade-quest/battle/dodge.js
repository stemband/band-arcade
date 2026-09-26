/* ARCADE QUEST: the ENEMY TURN = a dodge (no instrument: a rest for lips and breath; the mic is not listening).
   The student steers a small glowing music note inside a white-bordered box (arrows/WASD, the D-pad, or drag
   anywhere on the screen: the note follows your finger's movement, so your finger never hides it) and dodges what
   the enemy throws, from its `dodge.patterns` (data/enemies.js):
     rain   falls from the top at a random spot          side   flies across from the left or right
     burst  a static burst: a warning ring, then pieces flying outward
     aimed  heads for where your note is                 wave   a row falling from the top, with one gap
   Q.dodge.start({enemy, easy, slow, shield, assist, onHit}) -> Promise {damage, hits, blocked}
   Easy: slower and fewer; Metronome (slow): slower still; Cork Grease (shield): blocks hits; Assist: half damage. */
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
    } else if (pat.kind === 'burst') {
      const x = Q.rand(b.x + 16, b.x + b.w - 16), y = Q.rand(b.y + 14, b.y + b.h - 14), n = pat.count || 6;
      D.warn.push({x, y, at: D.t + 0.55, n, sp, sprite: pat.sprite});   // a warning ring first (fair!)
    }
  }
  Q.dodge = {
    active: () => !!D,
    start({enemy, easy, slow, shield = 0, assist, onHit}) {
      const dd = enemy.dodge || {seconds: 6, patterns: [{kind: 'rain', sprite: 'sour', every: .6, speed: 45}]};
      const mult = {speed: (easy ? .7 : 1) * (slow || 1), every: easy ? 1.45 : 1};
      return new Promise(done => {
        D = {t: 0, len: dd.seconds, pats: dd.patterns.map(p => Object.assign({next: 0.35 + Math.random() * .4}, p)), mult, shots: [], warn: [],
          cx: BOX.x + BOX.w / 2 - 3, cy: BOX.y + BOX.h / 2 - 4, inv: 0, damage: 0, hits: 0, blocked: 0, shield, assist, atk: enemy.atk || 2, onHit, done, drag: null};
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
      D.shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; });
      D.shots = D.shots.filter(s => s.x > BOX.x - 20 && s.x < BOX.x + BOX.w + 20 && s.y > BOX.y - 20 && s.y < BOX.y + BOX.h + 20);
      if (D.inv > 0) D.inv -= dt;
      else {
        const cx = D.cx + 3.5, cy = D.cy + 5;                   // the note's head: a small, forgiving hitbox
        const hit = D.shots.find(s => cx > s.x + 1 && cx < s.x + s.w - 1 && cy > s.y + 1 && cy < s.y + s.h - 1 &&
          s.x > BOX.x - 2 && s.x < BOX.x + BOX.w && s.y > BOX.y - 2 && s.y < BOX.y + BOX.h);
        if (hit) {
          D.shots.splice(D.shots.indexOf(hit), 1); D.inv = 0.9; D.hits++;
          let dmg = 0;
          if (D.shield > 0) { D.shield--; D.blocked++; }
          else { dmg = Math.max(1, Math.round(D.atk * (D.assist ? .5 : 1))); D.damage += dmg; }
          if (D.onHit && D.onHit(dmg, D.blocked && !dmg) === 'stop') D.t = D.len;
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
      d.done({damage: d.damage, hits: d.hits, blocked: d.blocked, shieldLeft: d.shield});
    },
    draw(ctx, now) {
      if (!D) return;
      const b = BOX;
      ctx.fillStyle = Q.css('q-black'); ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.strokeStyle = Q.css('q-white'); ctx.lineWidth = 2; ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      D.warn.forEach(w => { ctx.strokeStyle = Q.css('q-purple'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(w.x), Math.round(w.y), 7 - (w.at - D.t) * 6, 0, Math.PI * 2); ctx.stroke(); });
      D.shots.forEach(s => Q.draw(ctx, s.sprite, s.x, s.y, {t: now}));
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
    state: () => D && {t: D.t, len: D.len, shots: D.shots.length, hits: D.hits, cx: D.cx, cy: D.cy, damage: D.damage},   // tests
  };
})(window.Arcade);
