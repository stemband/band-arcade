/* ARCADE QUEST ENGINE: CUTSCENES, THE CREDITS AND "EPISODE 1 COMPLETE".
   The words live in data/dialogue.js (QUEST_CUTSCENES, QUEST_CREDITS); this file draws the pictures behind them.
   Q.go('cutscene', {id, next})   play QUEST_CUTSCENES[id]; then `next`: {id, next} (another cutscene),
                                  {credits: true, first, whisperer} (the credits, then Episode 1 Complete) or {scene, args}
   Every cutscene is SKIPPABLE (the SKIP button or Esc skips the rest of that scene) and short. A (or a tap) = next line.
   THE PICTURES (a shot's `show`), drawn on the 320 × 180 canvas above the text box:
     arcade   the Band Arcade after hours: a row of glowing cabinets, you practicing in the middle
     glitch   the same, the screens flickering into static          drain   the colors draining into gray static
     pull     the Ghost Notes cabinet, close up, pulling you in     party   the manor celebrating (your ghost friends)
     crackle  the party frozen in static                            mic     THE MYSTERIOUS MICROPHONE, huge
     black    nothing (a shot's `title` shows big words over it)
     rafters  THE DEFEAT ENDING: the manor lighting up while the Conductor drifts up into the rafters, fading
   EPISODE 2's INTRO ('ep2-intro', data/dialogue-stage.js):
     sheet    the attic: the dusty sheet slides off an old stage speaker as big as a wardrobe (its grille dark)
     speaker  KSSSHHH: its grille glows red for a moment        speaker-pull  `pull`, through the speaker's grille
     marquee  the Showtime Stage's marquee at night, half its letters out ("SH WT ME"); one letter flickers slowly
              (well under 3 flashes a second)                   steps  you land on the theater's front steps
   EPISODE 2's ENDINGS (build step 5: 'ep2-ending', 'ep2-ending-fade', 'ep2-mic', 'ep2-cliffhanger'):
     stage-warm    the Main Stage from the audience: the five spotlights warm up one by one (each fades in over
                   STAGE.warmS: slow, never a flash) and each band member un-glitches as their light comes on
     stage-encore  the band plays the E♭ Encore with you: notes float up from each member, your band friends cheer
     stage-rest    the band powered down to rest (dim, still); Maestro Moose alone in his light
     stage-mic     the dark stage; the stage mic up front, its red light glowing (it grows over STAGE.micS, steady)
     mic-dive      the red light dives down the mic's cable into the floor; the speakers at the sides crackle
   Reduced motion: no shaking, no flicker; the static stands still and nobody bounces (the sheet is already off);
   the stage lights are simply on, the notes hold still, the red light is already gone. */
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
  /** THE PULL (Episode 1's intro: the Ghost Notes cabinet; Episode 2's: the old stage speaker's grille): the screen
      spirals inward and you shrink into it, then a white flash */
  function pull(ctx, now, t, kind) {
    ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
    const spk = kind === 'speaker';
    if (spk) {                                                                                // the speaker, close up
      ctx.fillStyle = Q.css('q-stage-speaker'); ctx.fillRect(96, 0, 128, 130);
      ctx.fillStyle = Q.css('q-stage-trim-d'); ctx.fillRect(96, 0, 128, 3); ctx.fillRect(96, 127, 128, 3);
      ctx.fillStyle = Q.css('q-stage-grille'); ctx.beginPath(); ctx.arc(160, 61, 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Q.css('q-stage-glow-red'); ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(160, 61, 50, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = Q.css('q-purple-d'); ctx.fillRect(96, 0, 128, 130);                       // the Ghost Notes cabinet, close up
      ctx.fillStyle = Q.css('q-bar-5'); ctx.fillRect(100, 4, 120, 14);
      ctx.fillStyle = Q.css('q-white'); ctx.font = '8px "GN Quest", monospace'; ctx.textAlign = 'center'; ctx.fillText('GHOST NOTES', 160, 14); ctx.textAlign = 'left';
      ctx.fillStyle = Q.css('q-black'); ctx.fillRect(110, 26, 100, 70);
    }
    // the screen (or the grille): a glowing spiral pulling inward
    const spin = Q.reduced() ? 0 : now / 400;
    for (let r = 46; r > 2; r -= 5) {
      ctx.strokeStyle = Q.css(spk ? (r % 10 ? 'q-stage-glow-red' : 'q-pink') : (r % 10 ? 'q-cursor' : 'q-purple')); ctx.globalAlpha = .25 + .6 * (1 - r / 46); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(160, 61, r * .7, spin + r * .2, spin + r * .2 + Math.PI * 1.3); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // you, pulled toward the screen and shrinking
    const p = Q.reduced() ? Math.min(1, t / 3) : Math.min(1, (t / 3) ** 2), s = 2 - 1.6 * p;
    Q.draw(ctx, `player-${me().id}`, Math.round(128 + 16 * (2 - s)), Math.round(96 - 40 * p - 32 * s + 16), {scale: s, t: now});
    noise(ctx, now, 120, .35);
    if (t > 2.6) { ctx.fillStyle = Q.css('q-white'); ctx.globalAlpha = Math.min(1, (t - 2.6) * 2) * .8; ctx.fillRect(0, 0, Q.W, Q.H); ctx.globalAlpha = 1; }
  }
  /** the attic at night (Episode 2's intro): the back wall, a moonlit window, the floorboards */
  function attic(ctx) {
    ctx.fillStyle = Q.css('q-wall-d'); ctx.fillRect(0, 0, Q.W, 80);
    ctx.fillStyle = Q.css('q-trim-d'); ctx.fillRect(0, 76, Q.W, 4);
    ctx.fillStyle = Q.css('q-plank-d'); ctx.fillRect(0, 80, Q.W, 100);
    ctx.fillStyle = Q.css('q-plank'); for (let y = 90; y < Q.H; y += 12) ctx.fillRect(0, y, Q.W, 1);
    ctx.fillStyle = Q.css('q-glass'); ctx.fillRect(28, 16, 30, 34);
    ctx.fillStyle = Q.css('q-moon'); ctx.fillRect(46, 22, 6, 6);
    ctx.fillStyle = Q.css('q-trim'); ctx.fillRect(42, 16, 2, 34); ctx.fillRect(28, 32, 30, 2);
  }
  /* the old stage speaker (sprite 'stage-speaker', 32 × 40, drawn × 2) and its cable into the wall; glow 0–1 = its
     grille glowing red */
  const SPK = {x: 128, y: 44, s: 2};
  function speaker(ctx, glow) {
    ctx.fillStyle = Q.css('q-black');                                                        // the cable, along the floor into the wall
    ctx.fillRect(SPK.x + 60, SPK.y + 74, 70, 3); ctx.fillRect(SPK.x + 128, 70, 3, SPK.y + 7);
    Q.draw(ctx, 'stage-speaker', SPK.x, SPK.y, {scale: SPK.s, frame: 0});
    if (glow <= 0) return;
    ctx.globalAlpha = glow * .35; ctx.fillStyle = Q.css('q-stage-glow-red');
    ctx.beginPath(); ctx.ellipse(SPK.x + 32, SPK.y + 36, 50, 46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = glow; Q.draw(ctx, 'stage-speaker', SPK.x, SPK.y, {scale: SPK.s, frame: 1}); ctx.globalAlpha = 1;
  }
  /* THE SHOWTIME STAGE's marquee: "SHOWTIME" in bulbs with the O and the I out ("SH WT ME"); the M flickers slowly
     (off for 0.45 s about every 2.7 s: well under 3 flashes a second; steady under reduced motion) */
  const MARQUEE = 'SHOWTIME', OUT = [2, 5], FLICKER = 6;
  function marquee(ctx, now, {x = 40, y = 40, w = 240, h = 64, size = 26, sky = true} = {}) {
    if (sky) {
      ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = Q.css(i % 3 ? 'q-grey-d' : 'q-grey'); ctx.fillRect(Math.floor(rnd(i * 3.3) * Q.W), Math.floor(rnd(i * 9.1) * 40), 1, 1); }
      ctx.fillStyle = Q.css('q-stage-wall'); ctx.fillRect(0, y + h + 8, Q.W, Q.H - y - h - 8);   // the theater under it
      ctx.fillStyle = Q.css('q-stage-trim'); ctx.fillRect(0, y + h + 8, Q.W, 2);
    }
    ctx.fillStyle = Q.css('q-stage-wall-d'); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = Q.css('q-stage-trim'); ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    // the bulbs around the edge: steady (a few dead ones)
    for (let bx = x + 5; bx < x + w - 3; bx += 8) [y + 4, y + h - 6].forEach(by => { ctx.fillStyle = Q.css(rnd(bx * 1.7 + by) < .2 ? 'q-stage-bulb-off' : 'q-stage-bulb'); ctx.fillRect(bx, by, 2, 2); });
    const off = !Q.reduced() && Math.floor(now / 450) % 6 === 3;
    ctx.font = `${size}px "GN Quest", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [...MARQUEE].forEach((ch, i) => {
      const lx = x + w * (i + .5) / MARQUEE.length, ly = y + h / 2 + 1, dead = OUT.includes(i) || (i === FLICKER && off);
      if (!dead) { ctx.globalAlpha = .3; ctx.fillStyle = Q.css('q-stage-glow'); ctx.fillText(ch, lx + 1, ly + 1); ctx.globalAlpha = 1; }
      ctx.fillStyle = Q.css(dead ? 'q-stage-bulb-off' : 'q-stage-bulb'); ctx.globalAlpha = dead ? .45 : 1; ctx.fillText(ch, lx, ly); ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  /* ---------- the pictures ---------- */
  const SHOW = {
    black() {},
    arcade(ctx, now) { arcade(ctx, now); playerAt(ctx, now, 128, 60); },
    glitch(ctx, now, t) { arcade(ctx, now, {glitch: Math.min(.8, .2 + t / 3)}); playerAt(ctx, now, 128, 60); bands(ctx, now, 3, .15); },
    drain(ctx, now, t) { arcade(ctx, now, {glitch: .6}); playerAt(ctx, now, 128, 60); drain(ctx, Math.min(1, t / 2.5)); noise(ctx, now, 500, .45); bands(ctx, now, 4, .2); },
    pull(ctx, now, t) { pull(ctx, now, t, 'cabinet'); },
    // EPISODE 2's INTRO: the attic's old stage speaker
    sheet(ctx, now, t) {
      attic(ctx); speaker(ctx, 0);
      // the sheet slides off to the right and lands in a heap (already there under reduced motion)
      const p = Q.reduced() ? 1 : Math.min(1, t / 1.6), e = 1 - (1 - p) * (1 - p);
      const x0 = SPK.x - 6 + e * 112, bottom = SPK.y + 84, w = 76 - e * 4, h = 88 - e * 68;
      // a draped shape (flat on top, rounded corners) that becomes a soft heap on the floor; folds down its front
      const k = 8 - 6 * e;
      for (let i = 0; i < w; i++) {
        const u = Math.abs(2 * i / w - 1), col = Math.round(h * Math.sqrt(Math.max(0, 1 - u ** k))), top = bottom - col;
        ctx.fillStyle = Q.css(i % Math.max(6, Math.round(w / 5)) === 0 ? 'q-ghost-d' : 'q-ghost'); ctx.fillRect(Math.round(x0 + i), top, 1, col);
        ctx.fillStyle = Q.css('q-ghost-d'); ctx.fillRect(Math.round(x0 + i), Math.round(top + col * .65), 1, Math.ceil(col * .35));
      }
    },
    speaker(ctx, now, t) {
      const jolt = !Q.reduced() && t < .8;
      if (jolt) { ctx.save(); ctx.translate(Math.round(rnd(Math.floor(now / 50)) * 4 - 2), 0); }
      attic(ctx); speaker(ctx, Math.min(1, t / .6));
      if (jolt) ctx.restore();
      bands(ctx, now, 2, .15);
    },
    'speaker-pull'(ctx, now, t) { pull(ctx, now, t, 'speaker'); },
    marquee(ctx, now) { marquee(ctx, now); },
    steps(ctx, now) {
      // (everything above the text box: it covers the bottom third)
      ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
      ctx.fillStyle = Q.css('q-stage-wall'); ctx.fillRect(40, 4, 240, 92);                      // the theater's front
      ctx.fillStyle = Q.css('q-stage-trim'); ctx.fillRect(40, 4, 240, 2); ctx.fillRect(40, 94, 240, 2);
      marquee(ctx, now, {x: 80, y: 8, w: 160, h: 26, size: 13, sky: false});
      [[116, 44], [164, 44]].forEach(([x, y]) => {                                           // two doors, warm light behind
        ctx.fillStyle = Q.css('q-stage-trim-d'); ctx.fillRect(x - 2, y - 2, 44, 54);
        ctx.fillStyle = Q.css('q-stage-glow'); ctx.globalAlpha = .85; ctx.fillRect(x, y, 40, 52); ctx.globalAlpha = 1;
        ctx.fillStyle = Q.css('q-stage-trim'); ctx.fillRect(x + 19, y, 2, 52);
      });
      for (let i = 0; i < 3; i++) { ctx.fillStyle = Q.css(i % 2 ? 'q-stage-board-d' : 'q-stage-board'); ctx.fillRect(34 - i * 8, 96 + i * 9, Q.W - 68 + i * 16, 9); }   // the steps
      ctx.fillStyle = Q.css('q-stage-carpet'); ctx.fillRect(144, 96, 32, 27);                 // the red carpet up the middle
      ctx.fillStyle = Q.css('q-stage-runner'); ctx.fillRect(144, 96, 2, 27); ctx.fillRect(174, 96, 2, 27);
      Q.draw(ctx, `player-${me().id}-back`, 128, 58, {scale: 2, t: now});
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
  /* ---------- EPISODE 2: THE MAIN STAGE (the endings) ---------- */
  const STAGE = {warmS: 1, warmGap: .7, warmAt: .4, micS: 1.5, diveS: 1.6, scale: 1.5};
  // the band, left to right (Moose in the middle): [glitched sprite, un-glitched sprite]
  const BAND = [['npc-tusk', 'npc-tusk-ok'], ['npc-hoot', 'npc-hoot-ok'], ['npc-moose', 'npc-moose-ok'], ['npc-sal', 'npc-sal-ok'], ['npc-rico', 'npc-rico-ok']];
  const bandX = i => 48 + i * 56;
  /** the stage, seen from the audience (everything above the text box): the backdrop, the curtain drawn back, the boards,
      the footlights; lit[i] 0–1 = how far member i's spotlight has warmed up */
  function stageBack(ctx, lit, dark = 0) {
    ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, Q.H);
    ctx.fillStyle = Q.css('q-stage-coat'); ctx.fillRect(20, 0, Q.W - 40, 86);
    for (let i = 0; i < 26; i++) { ctx.fillStyle = Q.css('q-stage-bulb-off'); ctx.fillRect(Math.floor(30 + rnd(i * 2.1) * (Q.W - 60)), Math.floor(4 + rnd(i * 5.3) * 60), 1, 1); }
    ctx.fillStyle = Q.css('q-stage-board'); ctx.fillRect(0, 86, Q.W, 34);
    ctx.fillStyle = Q.css('q-stage-board-d'); for (let y = 92; y < 120; y += 6) ctx.fillRect(0, y, Q.W, 1);
    [0, 1].forEach(side => { for (let i = 0; i < 26; i++) {                                 // the red curtain, drawn back
      ctx.fillStyle = Q.css(i % 6 < 3 ? 'q-stage-velvet' : 'q-stage-velvet-d'); ctx.fillRect(side ? Q.W - 1 - i : i, 0, 1, 112 - i * 1.6);
    } });
    ctx.fillStyle = Q.css('q-stage-velvet-d'); ctx.fillRect(0, 0, Q.W, 6);
    lit.forEach((l, i) => {                                                                 // the spotlights (soft cones, then pools)
      if (l <= 0) return;
      ctx.globalAlpha = .22 * l; ctx.fillStyle = Q.css('q-stage-glow');
      ctx.beginPath(); ctx.moveTo(bandX(i) - 6, 0); ctx.lineTo(bandX(i) + 6, 0); ctx.lineTo(bandX(i) + 26, 100); ctx.lineTo(bandX(i) - 26, 100); ctx.fill();
      ctx.globalAlpha = .35 * l; ctx.beginPath(); ctx.ellipse(bandX(i), 99, 26, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    });
    for (let x = 8; x < Q.W; x += 16) { ctx.fillStyle = Q.css('q-grey-d'); ctx.fillRect(x, 114, 6, 3); ctx.fillStyle = Q.css(dark > .5 ? 'q-stage-bulb-off' : 'q-stage-glow'); ctx.fillRect(x + 2, 113, 2, 1); }
    if (dark > 0) { ctx.globalAlpha = dark; ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, 120); ctx.globalAlpha = 1; }
  }
  /** the band on stage: state 'glitch' | 'ok' | 'rest' per member (rest = dim and still, with a "z") */
  function stageBand(ctx, now, states, {hop = false} = {}) {
    const s = STAGE.scale;
    states.forEach((st, i) => {
      const y = 100 - 28 * s + (hop && st === 'ok' && !Q.reduced() ? Math.round(Math.abs(Math.sin(now / 280 + i)) * -3) : 0);
      Q.draw(ctx, BAND[i][st === 'glitch' ? 0 : 1], Math.round(bandX(i) - 12 * s), Math.round(y), {scale: s, t: now, alpha: st === 'rest' ? .5 : 1, frame: st === 'rest' ? 0 : undefined});
      if (st === 'rest') {
        const z = Q.reduced() ? .3 : (now / 900 + i * .3) % 1;
        ctx.fillStyle = Q.css('q-white'); ctx.font = '8px "GN Quest", monospace'; ctx.globalAlpha = .8 - z * .6;
        ctx.fillText('z', bandX(i) + 10 + z * 6, 100 - 28 * s - z * 10); ctx.globalAlpha = 1;
      }
    });
  }
  /** the stage mic up front (glow 0–1: its red light) */
  const MIC = {x: 148, y: 66, s: 2};                                                        // the stage mic, front and center (× 2)
  function bigMic(ctx, glow, gone = false) {
    Q.draw(ctx, 'stage-mic', MIC.x, MIC.y, {scale: MIC.s});
    const lx = MIC.x + 6 * MIC.s, ly = MIC.y + 9.5 * MIC.s;
    if (!gone && glow > 0) {
      ctx.globalAlpha = .3 * glow; ctx.fillStyle = Q.css('q-stage-glow-red'); ctx.beginPath(); ctx.arc(lx, ly, 3 + 6 * glow, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = glow; ctx.fillRect(Math.round(lx - 2), Math.round(ly - 1), 4, 2); ctx.globalAlpha = 1;
    }
    if (gone) { ctx.fillStyle = Q.css('q-black'); ctx.fillRect(Math.round(lx - 2), Math.round(ly - 1), 4, 2); }
  }
  // which band is on stage after the battle (the best ending: awake; the shorter one: resting)
  const routeBand = () => ((Q.save.get().route || {}).bignumber === 'fade' ? ['rest', 'rest', 'ok', 'rest', 'rest'] : ['ok', 'ok', 'ok', 'ok', 'ok']);
  Object.assign(SHOW, {
    'stage-warm'(ctx, now, t) {
      const lit = BAND.map((b, i) => (Q.reduced() ? 1 : Q.clamp((t - STAGE.warmAt - i * STAGE.warmGap) / STAGE.warmS, 0, 1)));
      stageBack(ctx, lit); stageBand(ctx, now, lit.map(l => (l > .5 ? 'ok' : 'glitch')));
    },
    'stage-encore'(ctx, now) {
      stageBack(ctx, [1, 1, 1, 1, 1]); stageBand(ctx, now, ['ok', 'ok', 'ok', 'ok', 'ok'], {hop: true});
      BAND.forEach((b, i) => { for (let k = 0; k < 2; k++) {                                  // notes float up from each member
        const c = Q.reduced() ? .3 + k * .35 : ((now / 2600) + i * .21 + k * .5) % 1, x = bandX(i) + 14 + Math.round(Math.sin(c * 6 + i) * 3), y = Math.round(54 - c * 46);
        ctx.globalAlpha = Math.min(1, Math.sin(c * Math.PI) * 1.4); ctx.fillStyle = Q.css(SCREENS[(i + k) % SCREENS.length]);
        ctx.fillRect(x, y, 3, 2); ctx.fillRect(x + 2, y - 5, 1, 5); ctx.globalAlpha = 1;
      } });
      // you, in the middle, and the friends you brought, cheering (a little hop; still under reduced motion)
      const friends = Q.band ? Q.band.members().slice(0, 2) : [];
      friends.forEach((id, k) => Q.draw(ctx, id, k ? 200 : 88, 94 + (Q.reduced() ? 0 : Math.round(Math.abs(Math.sin(now / 240 + k)) * -4)), {t: now, frame: 2}));
      playerAt(ctx, now, 136, 80, 1.5);                                                         // (in front of Maestro: he conducts you)
    },
    'stage-rest'(ctx, now) { stageBack(ctx, [0, 0, 1, 0, 0]); stageBand(ctx, now, ['rest', 'rest', 'ok', 'rest', 'rest']); },
    'stage-mic'(ctx, now, t) {
      stageBack(ctx, [0, 0, 0, 0, 0], .55); stageBand(ctx, now, routeBand());
      ctx.globalAlpha = .55; ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, 120); ctx.globalAlpha = 1;
      bigMic(ctx, Q.reduced() ? 1 : Math.min(1, t / STAGE.micS));
    },
    'mic-dive'(ctx, now, t) {
      stageBack(ctx, [0, 0, 0, 0, 0], .55); stageBand(ctx, now, routeBand());
      ctx.globalAlpha = .55; ctx.fillStyle = Q.css('q-void'); ctx.fillRect(0, 0, Q.W, 120); ctx.globalAlpha = 1;
      bigMic(ctx, 0, true);
      // the red light travels down the stand and into the floor (already gone under reduced motion)
      const p = Q.reduced() ? 1 : Math.min(1, t / STAGE.diveS), lx = MIC.x + 6 * MIC.s, y0 = MIC.y + 9.5 * MIC.s, y = y0 + p * (114 - y0);
      if (p < 1) { ctx.globalAlpha = .4; ctx.fillStyle = Q.css('q-stage-glow-red'); ctx.beginPath(); ctx.arc(lx, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillRect(Math.round(lx - 2), Math.round(y - 2), 4, 4); }
      ctx.fillStyle = Q.css('q-black'); ctx.beginPath(); ctx.ellipse(lx, 117, 9, 3, 0, 0, Math.PI * 2); ctx.fill();          // the hole it went down
      [[24, 50], [Q.W - 44, 50]].forEach(([x, y]) => {                                         // the speakers at the sides, crackling
        ctx.fillStyle = Q.css('q-stage-speaker'); ctx.fillRect(x, y, 20, 28); ctx.fillStyle = Q.css('q-stage-grille'); ctx.beginPath(); ctx.arc(x + 10, y + 16, 7, 0, Math.PI * 2); ctx.fill();
      });
      if (p >= 1 || Q.reduced()) { noise(ctx, now, 260, .25); bands(ctx, now, 3, .12); }
    },
  });
  STAGE.lit = t => BAND.map((b, i) => (Q.reduced() ? 1 : Q.clamp((t - STAGE.warmAt - i * STAGE.warmGap) / STAGE.warmS, 0, 1)));   // tests
  Q.storyStage = STAGE;

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
    else if (next.credits) Q.go('credits', {first: next.first, whisperer: next.whisperer, ep: next.ep, showstopper: next.showstopper});
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
    // ep 2: Episode 2's roll (QUEST_CREDITS_EP2), then EPISODE 2 COMPLETE
    enter({first, whisperer, ep, showstopper}) {
      Q.listen(false);
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-credits');
      const list = ((ep === 2 && window.QUEST_CREDITS_EP2) || window.QUEST_CREDITS || []).map(c => `<div class="q-cr"><h3>${fillYou(c.h)}</h3>${c.lines.map(l => `<p>${fillYou(l)}</p>`).join('')}</div>`).join('');
      Q.ui.innerHTML = `<div class="q-credits" role="region" aria-label="Credits"><div class="q-roll" id="qRoll">${list}</div></div>`;
      K = {first, ep: ep || 1, done: false};
      const end = () => { if (!K || K.done) return; K.done = true; off(); removeEventListener('keydown', esc, true); Q.go('complete', {first, whisperer, ep, showstopper}); };
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
    // whisperer: the Ghost Conductor was the last manor ghost helped (the Ghost Whisperer's line; its items are on the card)
    // ep 2: EPISODE 2 COMPLETE (completeEp2 below)
    enter({first, whisperer, ep, showstopper}) {
      this.ep = ep || 1;
      if (ep === 2) return completeEp2({first, showstopper});
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-victory');
      const s = Q.save.get(), code = Q.save.code();
      Q.save.achievements();
      const leave = then => { A.UI.results.hide(); then(); };
      A.UI.results.show({gameId: 'arcade-quest', theme: 'q-theme', stars: null, title: 'Episode 1 complete!',
        msg: 'Ghost Notes Manor has its music back. ' + ((s.route || {}).conductor === 'fade'
          ? 'The Ghost Conductor faded into the rafters, humming along. (Befriend him next time for the best ending!)'
          : 'The Ghost Conductor joined your band.') + (whisperer ? ' ' + Q.text('ghostWhisperer') : ''),
        tiles: [['Level', s.level], ['Band friends', s.roster.length], ['Tokens', A.Tokens.balance()], ['Ghosts helped', Q.save.helped()]],
        extra: (code ? `<p class="ui-label">Your save code</p><p class="q-code">${code}</p>` : '') +
          `<p class="ui-howto">The manor is still yours to explore. Episode 2 is open: look under the dusty sheet in the attic!</p>`,
        next: {label: 'Keep exploring', onClick: () => leave(() => Q.go('world', {map: 'attic', x: 7, y: 8, dir: 'up'}))},
        levels: {label: 'Title screen', onClick: () => leave(() => Q.go('title'))}});      // (announce: Pixel Hero, the Baton)
      if (first) Q.sfx('quest-levelup');
    },
    exit() { A.UI.results.hide(); },
    draw(ctx, now) { if (this.ep === 2) SHOW[(Q.save.get().route || {}).bignumber === 'fade' ? 'stage-rest' : 'stage-encore'](ctx, now, 9); else party(ctx, now, true); },
  };
  /* EPISODE 2 COMPLETE: the same shared results screen: the machines helped (befriended, powered down), battles,
     level, the time played in Episode 2, the save code, the UNLOCKED! card (A.Skins.announce: the Showtime Stage, the
     plate, the Top Hat; the Spotlight on the best ending with every kind befriended), KEEP EXPLORING (back onto the
     Main Stage, beside the hole the cable went down) / TITLE SCREEN. Its words follow the ending, + the SHOWSTOPPER line
     once every machine is helped. */
  function completeEp2({first, showstopper}) {
    if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-victory');
    const s = Q.save.get(), code = Q.save.code(), keys = Q.save.ghosts(2).map(g => g.key), done = s.done || {};
    Q.save.achievements();
    const helped = keys.filter(k => done[k]).length, friends = keys.filter(k => done[k] === 'befriend').length, faded = keys.filter(k => done[k] === 'fade').length;
    const mins = Math.max(1, Math.round(Q.save.played(2) / 60)), time = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    const best = (s.route || {}).bignumber !== 'fade';
    const leave = then => { A.UI.results.hide(); then(); };
    A.UI.results.show({gameId: 'arcade-quest', theme: 'q-theme', stars: null, title: 'Episode 2 complete!',
      msg: 'The Showtime Stage has its band back. ' + (best ? 'The whole band played the E♭ Encore with you.'
        : 'The band powered down to rest, and Maestro will wake them for the matinee. (HARMONIZE next time for the best ending!)') +
        ' But the Microphone got away, down its cable...' + (showstopper ? ' ' + Q.text('showstopper') : ''),
      tiles: [['Machines helped', `${helped} / ${keys.length}`], ['Befriended', friends], ['Powered down', faded], ['Battles', (s.battles || {}).won || 0], ['Level', s.level], ['Time', time]],
      extra: (code ? `<p class="ui-label">Your save code</p><p class="q-code">${code}</p>` : '') +
        `<p class="ui-howto">The theater is still yours to explore. Where does that cable go? Find out in Episode 3!</p>`,
      next: {label: 'Keep exploring', onClick: () => leave(() => Q.go('world', {map: 'stage', x: 11, y: 7, dir: 'down'}))},
      levels: {label: 'Title screen', onClick: () => leave(() => Q.go('title'))}});
    if (first) Q.sfx('quest-levelup');
  }
})(window.Arcade);
