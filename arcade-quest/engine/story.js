/* ARCADE QUEST ENGINE: CUTSCENES, THE CREDITS AND "EPISODE 1 COMPLETE".
   The words live in data/dialogue.js (QUEST_CUTSCENES, QUEST_CREDITS); this file draws the pictures behind them.
   Q.go('cutscene', {id, next})   play QUEST_CUTSCENES[id]; then `next`: {id, next} (another cutscene),
                                  {credits: true, first} (the credits, then Episode 1 Complete) or {scene, args}
   Every cutscene is SKIPPABLE (the SKIP button or Esc skips the rest of that scene) and short. A (or a tap) = next line.
   THE PICTURES (a shot's `show`), drawn on the 320 × 180 canvas above the text box:
     arcade   the Band Arcade after hours: a row of glowing cabinets, you practicing in the middle
     glitch   the same, the screens flickering into static          drain   the colors draining into gray static
     pull     the Ghost Notes cabinet, close up, pulling you in     party   the manor celebrating (your ghost friends)
     crackle  the party frozen in static                            mic     THE MYSTERIOUS MICROPHONE, huge
     black    nothing (a shot's `title` shows big words over it)
     rafters  THE DEFEAT ENDING: the manor lighting up while the Conductor drifts up into the rafters, fading
   Reduced motion: no shaking, no flicker; the static stands still and nobody bounces. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const CUTS = () => window.QUEST_CUTSCENES || {}, SPEAKERS = () => window.QUEST_CUTSCENE_SPEAKERS || {};
  const SCREENS = ['q-bar-1', 'q-bar-5', 'q-bar-3', 'q-bar-4', 'q-bar-6', 'q-bar-2', 'q-bar-5'];
  let C = null;                                               // the cutscene playing: {shot, t0, skipped}
  const me = () => A.currentMember();
  const fillYou = t => String(t).replace(/\{you\}/g, me().short).replace(/\{hero\}/g, Q.hero());

  /* ---------- drawing helpers ---------- */
  // a repeatable pseudo-random number (static that stands still under reduced motion)
  const rnd = seed => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
  function noise(ctx, now, amount, alpha = .5) {
    const frame = Q.reduced() ? 1 : Math.floor(now / 70);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < amount; i++) {
      const r = rnd(frame * 977 + i);
      ctx.fillStyle = Q.css(r > .6 ? 'q-white' : r > .3 ? 'q-grey' : 'q-grey-d');
      ctx.fillRect(Math.floor(rnd(i * 3.1 + frame) * Q.W), Math.floor(rnd(i * 7.7 + frame * 1.3) * Q.H), 1 + (r > .9), 1);
    }
    ctx.globalAlpha = 1;
  }
  function bands(ctx, now, n, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = Q.css('q-grey');
    const f = Q.reduced() ? 0 : Math.floor(now / 110);
    for (let i = 0; i < n; i++) ctx.fillRect(0, Math.floor(rnd(f * 31 + i) * Q.H), Q.W, 1 + Math.floor(rnd(i + f) * 3));
    ctx.globalAlpha = 1;
  }
  /** fade everything drawn so far toward gray (0 = full color, 1 = gray) */
  function drain(ctx, d) {
    if (d <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = Math.min(1, d);
    ctx.fillStyle = Q.css('q-grey'); ctx.fillRect(0, 0, Q.W, Q.H); ctx.restore();
  }
  /** the arcade floor after hours; glitch 0–1 = how many screens are static */
  function arcade(ctx, now, {glitch = 0} = {}) {
    ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
    ctx.fillStyle = Q.css('q-floor'); ctx.fillRect(0, 100, Q.W, 80);
    ctx.fillStyle = Q.css('q-floor-2'); for (let x = 0; x < Q.W; x += 20) ctx.fillRect(x, 100, 10, 1);
    const f = Q.reduced() ? 0 : Math.floor(now / 160);
    for (let i = 0; i < 7; i++) {
      const x = 6 + i * 45, y = 34, jit = glitch && !Q.reduced() && rnd(f * 7 + i) < glitch * .4 ? Math.round(rnd(f + i) * 4 - 2) : 0;
      ctx.fillStyle = Q.css('q-purple-d'); ctx.fillRect(x + jit, y, 34, 66);                 // the cabinet
      ctx.fillStyle = Q.css(SCREENS[i]); ctx.fillRect(x + 2 + jit, y + 2, 30, 6);             // its marquee
      const staticNow = glitch && rnd(f * 13 + i * 5) < glitch;
      ctx.fillStyle = Q.css(staticNow ? 'q-grey-d' : 'q-black'); ctx.fillRect(x + 5 + jit, y + 14, 24, 18);   // its screen
      if (staticNow) { for (let k = 0; k < 40; k++) { ctx.fillStyle = Q.css(rnd(f + k * i) > .5 ? 'q-white' : 'q-grey'); ctx.fillRect(x + 5 + jit + Math.floor(rnd(k + f * i) * 24), y + 14 + Math.floor(rnd(k * 3 + f) * 18), 1, 1); } }
      else {
        ctx.fillStyle = Q.css(SCREENS[(i + 2) % SCREENS.length]); ctx.globalAlpha = .7; ctx.fillRect(x + 7 + jit, y + 16, 20, 14); ctx.globalAlpha = 1;
        if (i === 3) { ctx.fillStyle = Q.css('q-white'); ctx.fillRect(x + 13, y + 18, 8, 7); ctx.fillRect(x + 12, y + 20, 10, 6); ctx.fillStyle = Q.css('q-black'); ctx.fillRect(x + 14, y + 21, 2, 2); ctx.fillRect(x + 18, y + 21, 2, 2); }
      }
      ctx.fillStyle = Q.css('q-grey-d'); ctx.fillRect(x + 4 + jit, y + 38, 26, 6);            // the control panel
      ctx.fillStyle = Q.css(SCREENS[(i + 4) % SCREENS.length]); ctx.fillRect(x + 8 + jit, y + 40, 3, 2); ctx.fillRect(x + 22 + jit, y + 40, 3, 2);
      // light pooling on the floor
      ctx.globalAlpha = .12; ctx.fillStyle = Q.css(SCREENS[i]); ctx.fillRect(x - 4, 100, 42, 10); ctx.globalAlpha = 1;
    }
  }
  function playerAt(ctx, now, x, y, scale = 2, id) { Q.draw(ctx, id || `player-${me().id}-play`, x, y, {scale, t: now}); }

  /* ---------- the pictures ---------- */
  const SHOW = {
    black() {},
    arcade(ctx, now) { arcade(ctx, now); playerAt(ctx, now, 128, 60); },
    glitch(ctx, now, t) { arcade(ctx, now, {glitch: Math.min(.8, .2 + t / 3)}); playerAt(ctx, now, 128, 60); bands(ctx, now, 3, .15); },
    drain(ctx, now, t) { arcade(ctx, now, {glitch: .6}); playerAt(ctx, now, 128, 60); drain(ctx, Math.min(1, t / 2.5)); noise(ctx, now, 500, .45); bands(ctx, now, 4, .2); },
    pull(ctx, now, t) {
      ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
      ctx.fillStyle = Q.css('q-purple-d'); ctx.fillRect(96, 0, 128, 130);                       // the Ghost Notes cabinet, close up
      ctx.fillStyle = Q.css('q-bar-5'); ctx.fillRect(100, 4, 120, 14);
      ctx.fillStyle = Q.css('q-white'); ctx.font = '8px "GN Quest", monospace'; ctx.textAlign = 'center'; ctx.fillText('GHOST NOTES', 160, 14); ctx.textAlign = 'left';
      ctx.fillStyle = Q.css('q-black'); ctx.fillRect(110, 26, 100, 70);
      // the screen: a glowing spiral pulling inward
      const spin = Q.reduced() ? 0 : now / 400;
      for (let r = 46; r > 2; r -= 5) {
        ctx.strokeStyle = Q.css(r % 10 ? 'q-cursor' : 'q-purple'); ctx.globalAlpha = .25 + .6 * (1 - r / 46); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(160, 61, r * .7, spin + r * .2, spin + r * .2 + Math.PI * 1.3); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // you, pulled toward the screen and shrinking
      const p = Q.reduced() ? Math.min(1, t / 3) : Math.min(1, (t / 3) ** 2), s = 2 - 1.6 * p;
      Q.draw(ctx, `player-${me().id}`, Math.round(128 + 16 * (2 - s)), Math.round(96 - 40 * p - 32 * s + 16), {scale: s, t: now});
      noise(ctx, now, 120, .35);
      if (t > 2.6) { ctx.fillStyle = Q.css('q-white'); ctx.globalAlpha = Math.min(1, (t - 2.6) * 2) * .8; ctx.fillRect(0, 0, Q.W, Q.H); ctx.globalAlpha = 1; }
    },
    party(ctx, now) { party(ctx, now, true); },
    rafters(ctx, now, t) { party(ctx, now, true, {rise: Math.min(1, t / 4)}); },
    crackle(ctx, now, t) {
      if (!Q.reduced() && t < 1.2) { ctx.save(); ctx.translate(Math.round(rnd(Math.floor(now / 40)) * 6 - 3), 0); }
      party(ctx, now, false);
      if (!Q.reduced() && t < 1.2) ctx.restore();
      drain(ctx, Math.min(.85, t / 1.2)); noise(ctx, now, 700, .5); bands(ctx, now, 6, .25);
    },
    mic(ctx, now, t) {
      ctx.fillStyle = Q.css('q-black'); ctx.fillRect(0, 0, Q.W, Q.H);
      noise(ctx, now, 900, .35);
      const glow = .18 + (Q.reduced() ? 0 : Math.sin(now / 300) * .06);
      ctx.fillStyle = Q.css('q-purple'); ctx.globalAlpha = glow; ctx.beginPath(); ctx.ellipse(160, 70, 78, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      const grow = Q.reduced() ? 1 : Math.min(1, .7 + t / 2);
      const s = 3 * grow;
      Q.draw(ctx, 'mic-big', Math.round(160 - 16 * s), Math.round(4 + (1 - grow) * 60), {scale: s});
      // the red recording light blinks (steady with reduced motion)
      if (!Q.reduced() && Math.floor(now / 500) % 2) { ctx.fillStyle = Q.css('q-out'); ctx.fillRect(Math.round(160 - 16 * s + 14 * s), Math.round(4 + (1 - grow) * 60 + 29 * s), 2 * s, 2 * s); }
      bands(ctx, now, 3, .2);
    },
  };
  /** the manor, celebrating: warm candlelight, your ghost friends bouncing, the Conductor conducting, confetti */
  function party(ctx, now, moving, {rise = 0} = {}) {
    ctx.fillStyle = Q.css('q-wall'); ctx.fillRect(0, 0, Q.W, 70);
    ctx.fillStyle = Q.css('q-trim'); ctx.fillRect(0, 66, Q.W, 4);
    ctx.fillStyle = Q.css('q-plank'); ctx.fillRect(0, 70, Q.W, 110);
    ctx.fillStyle = Q.css('q-plank-d'); for (let y = 78; y < Q.H; y += 10) ctx.fillRect(0, y, Q.W, 1);
    for (let i = 0; i < 6; i++) {                                                             // candles
      const x = 20 + i * 56; ctx.fillStyle = Q.css('q-paper'); ctx.fillRect(x, 30, 3, 10);
      ctx.fillStyle = Q.css('q-flame'); ctx.fillRect(x, 26, 3, 4);
      ctx.globalAlpha = .18; ctx.beginPath(); ctx.arc(x + 1.5, 28, 12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    const bounce = k => (moving && !Q.reduced() ? Math.round(Math.abs(Math.sin(now / 260 + k)) * -4) : 0);
    // (the defeat ending: the Conductor drifts up and fades as the room lights up)
    Q.draw(ctx, 'conductor', 136, 20 + Math.round(bounce(0) / 2) - Math.round(rise * 40), {frame: 2, alpha: 1 - rise * .8});
    const friends = [...new Set(['wisp', 'squeaker', 'hush', 'wobble', 'chatterbox', ...Q.save.get().roster.filter(id => id !== 'conductor' && id !== 'fermata')])].slice(0, 8);
    friends.forEach((id, k) => {
      const x = k < 4 ? 8 + k * 30 : 184 + (k - 4) * 32;
      Q.draw(ctx, id, x, 70 + bounce(k), {t: now, frame: 2});
    });
    playerAt(ctx, now, 144, 72, 1, `player-${me().id}-play`);
    // confetti
    for (let i = 0; i < 46; i++) {
      const col = SCREENS[i % SCREENS.length], speed = 14 + rnd(i) * 20;
      const y = moving && !Q.reduced() ? (rnd(i * 5) * Q.H + now / 1000 * speed) % Q.H : rnd(i * 5) * 130;
      ctx.fillStyle = Q.css(col); ctx.fillRect(Math.floor(rnd(i * 2.3) * Q.W), Math.floor(y), 2, 2);
    }
  }

  /* ---------- playing a cutscene ---------- */
  function skipUI() {
    const b = Q.el('button', 'q-skip', 'Skip ▸▸'); b.type = 'button'; b.setAttribute('aria-label', 'Skip this scene');
    b.addEventListener('click', e => { e.stopPropagation(); skip(); });
    Q.ui.appendChild(b);
  }
  function skip() { if (!C || C.skipped) return; C.skipped = true; Q.skipText(); if (C.wake) C.wake(); }
  const escKey = e => { if (C && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); skip(); } };
  /** say a shot's lines, switching speaker on '@name ' */
  async function lines(list) {
    const groups = [];
    list.forEach(l => {
      const m = /^@(\w+)\s+(.*)$/.exec(l), sp = m && SPEAKERS()[m[1]];
      const who = sp || {name: '', sprite: null}, text = fillYou(sp ? m[2] : l), g = groups[groups.length - 1];
      if (g && g.who === who) g.lines.push(text); else groups.push({who, lines: [text]});
    });
    for (const g of groups) { if (C.skipped) return; await Q.say(g.lines, {name: g.who.name, portrait: g.who.sprite}); }
  }
  /** wait ms, or until A / a tap / SKIP */
  function pause(ms) {
    return new Promise(res => {
      let off = null;
      const done = () => { if (off) off(); Q.stage.removeEventListener('click', done); if (C) C.wake = null; res(); };
      off = Q.input.on(btn => { if (btn === 'a') { done(); return true; } return false; });
      Q.stage.addEventListener('click', done);
      C.wake = done;
      Q.wait(ms).then(done);
    });
  }
  async function run(id, next) {
    const cut = CUTS()[id], me2 = C;
    if (cut && cut.music !== undefined && A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(cut.music);
    for (const shot of (cut ? cut.shots : [])) {
      if (C !== me2 || C.skipped) break;
      C.shot = shot; C.t0 = performance.now();
      if (shot.music !== undefined && A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(shot.music);
      if (shot.sfx) Q.sfx(shot.sfx);
      const title = Q.$('qCutTitle'); title.textContent = shot.title || ''; title.hidden = !shot.title;
      if (shot.lines) await lines(shot.lines); else await pause(shot.wait || 1500);
    }
    if (C !== me2) return;
    C = null;
    if (!next) Q.go('title');
    else if (next.id) Q.go('cutscene', next);
    else if (next.credits) Q.go('credits', {first: next.first});
    else Q.go(next.scene, next.args);
  }
  Q.scenes.cutscene = {
    enter({id, next}) {
      Q.listen(false);
      C = {id, shot: {show: 'black'}, t0: performance.now(), skipped: false};
      Q.ui.innerHTML = `<p class="q-cutitle" id="qCutTitle" hidden></p>`;
      skipUI();
      addEventListener('keydown', escKey, true);
      run(id, next);
    },
    exit() { removeEventListener('keydown', escKey, true); C = null; },
    draw(ctx, now) {
      if (!C) return;
      const t = (now - C.t0) / 1000, f = SHOW[C.shot.show] || SHOW.black;
      f(ctx, now, t);
    },
  };
  Q.cutscene = () => C && {id: C.id, show: C.shot.show, skipped: C.skipped};          // tests

  /* ---------- THE CREDITS (a short roll; SKIP, A or Esc skips) ---------- */
  let K = null;
  Q.scenes.credits = {
    enter({first}) {
      Q.listen(false);
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-credits');
      const list = (window.QUEST_CREDITS || []).map(c => `<div class="q-cr"><h3>${fillYou(c.h)}</h3>${c.lines.map(l => `<p>${fillYou(l)}</p>`).join('')}</div>`).join('');
      Q.ui.innerHTML = `<div class="q-credits" role="region" aria-label="Credits"><div class="q-roll" id="qRoll">${list}</div></div>`;
      K = {first, done: false};
      const end = () => { if (!K || K.done) return; K.done = true; off(); removeEventListener('keydown', esc, true); Q.go('complete', {first}); };
      const esc = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); } };
      addEventListener('keydown', esc, true);
      const off = Q.input.on(btn => { if (btn === 'a' || btn === 'b') { end(); return true; } return true; });
      const b = Q.el('button', 'q-skip', Q.reduced() ? 'Done ▸' : 'Skip ▸▸'); b.type = 'button'; b.addEventListener('click', end); Q.ui.appendChild(b);
      const roll = Q.$('qRoll');
      if (!Q.reduced()) roll.addEventListener('animationend', end);
      K.end = end;
    },
    exit() { K = null; },
    draw(ctx, now) { noise(ctx, now, 60, .25); },
  };

  /* ---------- EPISODE 1 COMPLETE: the arcade's shared results screen (shared/ui-kit.js, pixel-themed in style.css):
     stats, your save code, the UNLOCKED! card (Pixel Hero, the Baton), KEEP EXPLORING (the attic) / TITLE SCREEN ---------- */
  Q.scenes.complete = {
    enter({first}) {
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-victory');
      const s = Q.save.get(), code = Q.save.code();
      Q.save.achievements();
      const leave = then => { A.UI.results.hide(); then(); };
      A.UI.results.show({gameId: 'arcade-quest', theme: 'q-theme', stars: null, title: 'Episode 1 complete!',
        msg: 'Ghost Notes Manor has its music back. ' + ((s.route || {}).conductor === 'fade'
          ? 'The Ghost Conductor faded into the rafters, humming along. (Befriend him next time for the best ending!)'
          : 'The Ghost Conductor joined your band.'),
        tiles: [['Level', s.level], ['Band friends', s.roster.length], ['Tokens', A.Tokens.balance()], ['Ghosts helped', Q.save.helped()]],
        extra: (code ? `<p class="ui-label">Your save code</p><p class="q-code">${code}</p>` : '') +
          `<p class="ui-howto">The manor is still yours to explore. Episode 2 is coming...</p>`,
        next: {label: 'Keep exploring', onClick: () => leave(() => Q.go('world', {map: 'attic', x: 7, y: 8, dir: 'up'}))},
        levels: {label: 'Title screen', onClick: () => leave(() => Q.go('title'))}});      // (announce: Pixel Hero, the Baton)
      if (first) Q.sfx('quest-levelup');
    },
    exit() { A.UI.results.hide(); },
    draw(ctx, now) { party(ctx, now, true); },
  };
})(window.Arcade);
