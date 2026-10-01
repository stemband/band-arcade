/* TUNE UP's TUNER tab: THE HOT-AIR BALLOON. The student's avatar rides in the basket of a striped balloon; a landing
   platform (a little floating island with a flag) sits in the middle of the sky.
     HEIGHT = PITCH ERROR: SHARP (too high) = above the platform, FLAT (too low) = below it, IN TUNE = landed on it.
       The basket's bottom is drawn cents / maxCents of the way from the platform to the top (sharp) or bottom (flat) of
       the scene, clamped; the cents are smoothed (smoothMs) so the balloon floats instead of jittering. Nothing heard =
       it drifts back to a resting spot just below the platform ("Play a long note!").
     IN TUNE (|cents| ≤ inTune): landed, a happy face, a little confetti once per landing (none with reduced motion),
       "IN TUNE!" in green. CLOSE (≤ close): "Almost! A little lower / higher", amber. FARTHER: "Too high (sharp)" /
       "Too low (flat)", coral, a worried face, a small wobble, and an arrow on each side pointing the way to move.
       Direction is never shown by color alone: the height, the arrows and the words always say it.
     THE NOTE: the WRITTEN name for the student's instrument (the member's `sounds`) big, on a small staff in their clef,
       "concert F" small under it (or concert first: the switch "Show concert pitch first"). "+12 ¢" in the corner
       ("Show cents").
     HOLD IT: a ring around the platform fills while the note stays within `close` (holdS to fill), drains when it
       wobbles out or stops; full = "Steady! 4 seconds in tune" + the best hold this session. Every fill counts toward
       the Golden Tuning Fork (5 in one day: gameData('tuneup').holds[day]).
     WHAT TO DO: after tipAfterS sharp or flat, TUNING_TIPS[member] says which way to move the tuning slide / barrel /
       headjoint; a note that keeps moving gets "Steady air, relaxed embouchure."
     HEAR THE NOTE (TARGET mode): one clean tone for 2 s through shared/tones.js (the ONE pitched sound here: the
       microphone is PAUSED while it plays and listens again only after it has faded + listenAfterMs, then
       Pitch.ignoreCurrent()), then "Now you play it!". In TARGET mode the cents are measured from the TARGET (any
       octave), and another note says "That's an A, try a B♭!". FREE mode (default) = the nearest note.
     REFERENCE A: Settings → Tuner → "Reference A" 438–445 Hz (gameData('tuneup').a4; Pitch.a4 while this tab is open).
   No stars, no setLevel, nothing sent anywhere. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const T = A.TuneUp, inst = T && T.inst;
  if (!inst) return;
  const {$} = A, P = A.Pitch, {NAMES, mod12, spell} = A.music;

  /* ===== THE TUNER'S NUMBERS (Mat edits) ===== */
  const TUNER = {
    maxCents: 50,        // the balloon reaches the top / bottom of the sky at this many cents (clamped)
    smoothMs: 120,       // how quickly it follows the pitch (bigger = floatier)
    inTune: 5,           // |cents| ≤ this = landed, IN TUNE
    close: 15,           // |cents| ≤ this = "Almost!" (and what the HOLD IT ring counts)
    holdS: 4,            // seconds within `close` to fill the HOLD IT ring
    drainS: 2,           // seconds for a full ring to drain once the note wobbles out or stops
    tipAfterS: 1.5,      // sharp or flat this long = the instrument's tuning tip
    wobbleCents: 12,     // the cents jumping around more than this (over the last 2 s) = "Steady air…"
    quietMs: 300,        // nothing heard this long = the balloon goes back to its resting spot
    rest: .3,            // the resting spot: this share of the way from the platform down to the bottom
    topRoom: .8,         // at the most sharp the basket is this many balloon-heights from the top (the envelope's tip may leave the sky)
    confettiGapS: 1.5,   // at most one confetti burst this often
    toneMs: 2000,        // HEAR THE NOTE: how long the tone plays
    listenAfterMs: 400,  // …and how long after it has faded before listening again
    rewardHolds: 5,      // full HOLD IT rings in one day for the Golden Tuning Fork (avatar-parts.js `tool: 'tuner-hold'`)
  };
  /* ===== WHAT TO DO, by member id (Mat edits): [too high (sharp), too low (flat)] ===== */
  const TUNING_TIPS = {
    flute:      ['Pull the headjoint out a little.', 'Push the headjoint in a little.'],
    oboe:       ['Pull the reed out slightly (ask your director).', 'Push the reed in.'],
    clarinet:   ['Pull the barrel out a little.', 'Push the barrel in.'],
    basscl:     ['Pull the barrel out a little.', 'Push the barrel in.'],
    bassoon:    ['Use a longer bocal or pull the bocal out slightly.', 'Push the bocal in / shorter bocal.'],
    altosax:    ['Pull the mouthpiece out a little.', 'Push the mouthpiece in.'],
    tenorsax:   ['Pull the mouthpiece out a little.', 'Push the mouthpiece in.'],
    barisax:    ['Pull the mouthpiece out a little.', 'Push the mouthpiece in.'],
    trumpet:    ['Pull your main tuning slide out a little.', 'Push your main tuning slide in.'],
    baritonetc: ['Pull your main tuning slide out a little.', 'Push your main tuning slide in.'],
    horn:       ['Pull your main tuning slide out a little.', 'Push your main tuning slide in.'],
    euphbc:     ['Pull your main tuning slide out a little.', 'Push your main tuning slide in.'],
    tuba:       ['Pull your main tuning slide out a little.', 'Push your main tuning slide in.'],
    trombone:   ['Pull the tuning slide out a little (or adjust your slide position).', 'Push the tuning slide in.'],
    bells:      ["Bells don't need tuning!", null],
  };
  const STEADY_TIP = 'Steady air, relaxed embouchure.';
  const A4S = [438, 439, 440, 441, 442, 443, 444, 445];

  const member = T.member, pitched = inst.pitched !== false && !!member && member.pitched !== false;
  const D = T.data();
  if (D.concertFirst === undefined) D.concertFirst = false;
  if (D.showCents === undefined) D.showCents = true;
  const RM = A.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => RM.matches;

  /* ---------- the notes: written names spelled like the arcade's parts (B♭, E♭, A♭, F♯, C♯) ---------- */
  const flat = pc => NAMES[pc].includes('♭');
  const nameW = w => NAMES[mod12(w)];
  const noteW = w => spell(w, flat(mod12(w)));                   // {letter, acc, oct} for the staff
  const article = n => /^[AEF]/.test(n) ? 'an' : 'a';
  const written = s => s + (member ? member.sounds : inst.t);    // sounding midi -> written midi
  /* the tuning note: concert B♭ (winds' tuning note) nearest the first-five tonic, inside the member's range */
  function tuningNote() {
    const tonic = A.music.writtenMidi(inst.notes[0]) - member.sounds;
    let best = null;
    for (let m = member.soundLow; m <= member.soundHigh; m++) if (mod12(m) === 10 && (best === null || Math.abs(m - tonic) < Math.abs(best - tonic))) best = m;
    return best === null ? tonic : best;
  }
  const TARGETS = !pitched ? [] : [{s: tuningNote(), tune: true}].concat(inst.notes.map(n => ({s: A.music.writtenMidi(n) - member.sounds})));

  /* ---------- state ---------- */
  const S = {mode: D.tunerMode === 'target' ? 'target' : 'free', target: TARGETS.length ? TARGETS[Math.min(+D.tunerTarget || 0, TARGETS.length - 1)].s : null,
    phase: 'listen', sm: null, raw: null, lastHeard: -1e9, status: 'rest', dir: null, wrong: null, note: null,
    hold: 0, run: 0, best: 0, filled: false, dirSince: 0, dirOf: null, hist: [], tip: '', landedAt: -1e9, landed: false, confetti: 0,
    tone: null, reward: false, basket: 0, platform: 0, last: 0, raf: 0, words: '', arrow: null, face: 'calm'};

  /* ---------- the drawing ---------- */
  const scene = $('tnScene'), balloon = $('tnBalloon'), plat = $('tnPlatform');
  function drawAvatar() {
    if (!A.avatarHTML || !A.Avatar) { $('tnAv').innerHTML = ''; return; }
    const av = A.Avatar.get(), m = member ? member.id : null;
    const face = (k, patch) => `<span class="tn-face tn-face-${k}">${A.avatarHTML({size: 'tile', member: m, avatar: Object.assign({}, av, patch), bg: false, label: ''})}</span>`;
    $('tnAv').innerHTML = face('calm', {}) + face('happy', {mouth: 'beam', eyes: 'cheerful'}) + face('worried', {mouth: 'surprised', brows: 'raised'});
    setFace(S.face, true);
  }
  function setFace(k, force) {
    if (k === S.face && !force) return;
    S.face = k;
    $('tnAv').dataset.face = k;
  }
  addEventListener('arcade:avatar', drawAvatar);

  function drawTargets() {
    const sel = $('tnTarget');
    sel.innerHTML = TARGETS.map((t, i) => `<option value="${i}">${t.tune ? 'Tuning note: ' : ''}${nameW(written(t.s))} (concert ${NAMES[mod12(t.s)]})</option>`).join('');
    sel.value = String(Math.max(0, TARGETS.findIndex(t => t.s === S.target)));
  }
  function drawMode() {
    $('tnModeSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
    $('tnTargetRow').classList.toggle('free', S.mode === 'free');
    const t = S.target;
    $('tnFlag').textContent = S.mode === 'target' && t != null ? nameW(written(t)) : '';
    plat.classList.toggle('flagged', S.mode === 'target');
  }
  function drawSwitches() {
    $('tnConcert').setAttribute('aria-checked', !!D.concertFirst);
    $('tnShowCents').setAttribute('aria-checked', D.showCents !== false);
    $('tnCents').hidden = D.showCents === false;
  }
  /* the big note + the small staff (written pitch, in the student's clef) */
  let shownNote = undefined;
  function drawNote(s) {
    if (s === shownNote) return;
    shownNote = s;
    if (s == null) { $('tnBig').textContent = '–'; $('tnSmall').innerHTML = '&nbsp;'; $('tnStaff').innerHTML = ''; return; }
    const w = written(s), wn = nameW(w), cn = NAMES[mod12(s)];
    if (D.concertFirst) { $('tnBig').textContent = cn; $('tnSmall').textContent = `concert · your ${wn}`; }
    else { $('tnBig').textContent = wn; $('tnSmall').textContent = `concert ${cn}`; }
    $('tnStaff').innerHTML = A.staffSVG(member.clef, [{n: noteW(w), x: 112}], {width: 170, label: `Written ${wn}`});
  }

  /* ---------- reading the microphone (Pitch.onFrame, ~25 a second) ---------- */
  const on = () => T.tab === 'tuner' && pitched;
  P.onFrame((r, level, now) => {
    if (!on()) return;
    const dt = Math.min(.2, S.last ? (now - S.last) / 1000 : .04); S.last = now;
    if (S.phase === 'tone') { r = null; }
    let c = null;
    S.wrong = null;
    if (r) {
      S.lastHeard = now;
      S.note = r.note;
      if (S.mode === 'target' && S.target != null) {
        const d = r.midi - S.target, d12 = d - 12 * Math.round(d / 12);
        if (Math.abs(d12) > .5) S.wrong = r.note;
        c = d12 * 100;
      } else c = r.cents;
    }
    S.raw = c;
    // HOLD IT: within `close` fills, anything else drains
    const inClose = c !== null && !S.wrong && Math.abs(c) <= TUNER.close;
    if (inClose) {
      S.hold = Math.min(TUNER.holdS, S.hold + dt); S.run += dt; S.best = Math.max(S.best, S.run);
      if (S.hold >= TUNER.holdS && !S.filled) { S.filled = true; countHold(); }
    } else {
      S.run = 0;
      S.hold = Math.max(0, S.hold - dt * TUNER.holdS / TUNER.drainS);
      if (S.hold <= 0) S.filled = false;
    }
    // the direction kept this long = the tuning tip; jumping around = steady air
    const dir = c === null || S.wrong || Math.abs(c) <= TUNER.inTune ? null : c > 0 ? 'sharp' : 'flat';
    if (dir !== S.dirOf) { S.dirOf = dir; S.dirSince = now; }
    if (c !== null && !S.wrong) S.hist.push([now, c]);
    while (S.hist.length && now - S.hist[0][0] > 2000) S.hist.shift();
    tipNow(now);
    if (!r && S.reward && now - S.lastHeard > 1000) showReward();
  });
  function tipNow(now) {
    let tip = '';
    const tips = member && TUNING_TIPS[member.id];
    if (S.dirOf && now - S.dirSince >= TUNER.tipAfterS * 1000 && tips) tip = tips[S.dirOf === 'sharp' ? 0 : 1] || '';
    if (!tip && S.hist.length > 20) {
      const xs = S.hist.map(h => h[1]), m = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
      if (sd > TUNER.wobbleCents) tip = STEADY_TIP;
    }
    if (tip !== S.tip) { S.tip = tip; $('tnTip').textContent = tip || ' '; }
  }

  /* ---------- every frame: smooth, place the balloon, the words, the ring ---------- */
  function frame(now) {
    S.raf = 0;
    if (!on()) return;
    const dt = Math.min(.1, (now - (S.fnow || now)) / 1000); S.fnow = now;
    const H = scene.clientHeight || 300, B = balloon.offsetHeight || H * .4;
    const pY = plat.offsetTop;                                       // the platform's top: where the basket lands
    S.platform = pY;
    const heard = S.raw !== null && now - S.lastHeard < TUNER.quietMs;
    const target = heard ? Math.max(-TUNER.maxCents, Math.min(TUNER.maxCents, S.raw)) : null;
    // smoothing (an exponential follow); with nothing heard the balloon goes back to rest
    const k = 1 - Math.exp(-dt * 1000 / TUNER.smoothMs);
    if (target === null) S.sm = null;
    else S.sm = S.sm === null ? target : S.sm + (target - S.sm) * k;
    const cents = S.sm;
    let status = 'rest', dir = null;
    if (cents !== null) {
      const a = Math.abs(cents);
      dir = a <= TUNER.inTune ? null : cents > 0 ? 'sharp' : 'flat';
      status = S.wrong != null ? 'wrong' : a <= TUNER.inTune ? 'tune' : a <= TUNER.close ? 'close' : 'far';
    }
    // where the basket's bottom goes: up toward the top (sharp), down toward the bottom (flat), on the platform (in tune)
    let b;
    if (cents === null) b = pY + TUNER.rest * (H - pY) + (still() ? 0 : Math.sin(now / 1400) * 4);
    else if (status === 'tune') b = pY;
    else if (cents > 0) b = pY - (cents / TUNER.maxCents) * (pY - B * TUNER.topRoom);
    else b = pY + (-cents / TUNER.maxCents) * (H - pY);
    S.basket = Math.round(b);
    const wob = status === 'far' && !still() ? Math.sin(now / 130) * 3 : 0;
    const bob = status !== 'tune' && cents !== null && !still() ? Math.sin(now / 700) * 2 : 0;
    balloon.style.transform = `translate(-50%, ${(b - B + bob).toFixed(1)}px) rotate(${wob.toFixed(2)}deg)`;
    balloon.classList.toggle('still', still());
    // the landing
    const landed = status === 'tune';
    if (landed && !S.landed) {
      S.landedAt = now;
      if (!still() && now - (S.lastConfetti || -1e9) > TUNER.confettiGapS * 1000) { S.lastConfetti = now; confetti(); }
    }
    S.landed = landed;
    scene.classList.toggle('landed', landed);
    scene.dataset.status = status;
    setFace(landed ? 'happy' : status === 'far' || status === 'wrong' ? 'worried' : 'calm');
    // the words (and the arrows: point the way to MOVE)
    let words, cls;
    const tn = S.target != null ? nameW(written(S.target)) : '';
    if (S.phase === 'tone') { words = 'Listen…'; cls = 'listen'; }
    else if (status === 'rest') { words = S.mode === 'target' && S.phase === 'yourturn' ? 'Now you play it!' : 'Play a long note!'; cls = 'rest'; }
    else if (status === 'wrong') { const n = nameW(written(S.wrong)); words = `That's ${article(n)} ${n}, try ${article(tn)} ${tn}!`; cls = 'far'; }
    else if (status === 'tune') { words = 'IN TUNE!'; cls = 'tune'; }
    else if (status === 'close') { words = dir === 'sharp' ? 'Almost! A little lower' : 'Almost! A little higher'; cls = 'close'; }
    else { words = dir === 'sharp' ? 'Too high (sharp)' : 'Too low (flat)'; cls = 'far'; }
    if (words !== S.words) { S.words = words; $('tnWords').textContent = words; }
    $('tnWords').dataset.kind = cls;
    S.status = status; S.dir = dir;
    const arrow = status === 'close' || status === 'far' ? (dir === 'sharp' ? 'down' : 'up') : status === 'wrong' ? (S.wrong > S.target ? 'down' : 'up') : null;
    if (arrow !== S.arrow) {
      S.arrow = arrow;
      [$('tnArrowL'), $('tnArrowR')].forEach(el => { el.dataset.dir = arrow || ''; el.textContent = arrow === 'down' ? '▼' : arrow === 'up' ? '▲' : ''; el.title = arrow === 'down' ? 'Go lower' : arrow === 'up' ? 'Go higher' : ''; });
    }
    // the cents in the corner
    $('tnCents').textContent = cents === null || S.wrong != null ? '' : `${cents >= 0 ? '+' : '−'}${Math.abs(Math.round(cents))} ¢`;
    drawNote(heard ? S.note : null);
    // HOLD IT
    const pct = Math.round(100 * S.hold / TUNER.holdS);
    $('tnRing').setAttribute('stroke-dasharray', `${pct} 100`); $('tnRing').classList.toggle('empty', !pct);
    plat.classList.toggle('full', S.filled);
    const ht = S.filled ? `Steady! ${TUNER.holdS} seconds in tune` : S.hold > 0 ? 'Hold it…' : ' ';
    const bt = S.best >= 1 ? ` · Best: ${S.best.toFixed(1)} s` : '';
    const hold = ht + bt;
    if (hold !== S.holdTxt) { S.holdTxt = hold; $('tnHold').innerHTML = `${ht === ' ' ? '&nbsp;' : ht}${bt ? `<span class="tn-best">Best: ${S.best.toFixed(1)} s</span>` : ''}`; }
    S.raf = requestAnimationFrame(frame);
  }
  function confetti() {
    const box = $('tnConfetti'), cols = ['yellow', 'pink', 'cyan', 'green', 'amber'];
    box.innerHTML = Array.from({length: 14}, (_, i) =>
      `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--d:${(Math.random() * .25).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;background:var(--${cols[i % cols.length]})"></i>`).join('');
    box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
    S.confetti++;
  }

  /* ---------- HOLD IT counts toward the Golden Tuning Fork (5 full rings in one day) ---------- */
  function dayKey() { const d = A.store.today(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function countHold() {
    const h = D.holds || (D.holds = {}), k = dayKey();
    h[k] = (h[k] || 0) + 1;
    Object.keys(h).sort().slice(0, -30).forEach(x => delete h[x]);     // the last 30 days are plenty
    T.save();
    if (h[k] >= TUNER.rewardHolds && A.Avatar && A.Avatar.freshItems && A.Avatar.freshItems().length) S.reward = true;   // shown once the note ends
  }
  /* the UNLOCKED! card (toolbox.js T.reward → Skins.announce), never in the middle of a hold: after the note has ended */
  function showReward() { S.reward = false; T.reward('Steady tuning!', `${TUNER.rewardHolds} notes held in tune today.`); }

  /* ---------- HEAR THE NOTE: one tone, the microphone paused while it plays ---------- */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function hear() {
    if (!pitched || S.phase === 'tone') return;
    setMode('target');
    S.phase = 'tone';
    P.pauseListening(true); if (A.Sfx.sync) A.Sfx.sync();
    for (let i = 0; i < 10 && !(A.Sfx.output && A.Sfx.output()); i++) await wait(50);   // the tap is still unlocking the audio
    if (T.tab !== 'tuner') { S.phase = 'listen'; return; }
    const shift = 12 * Math.log2((D.a4 || 440) / 440);               // the tone follows the reference A
    const h = S.tone = A.tones.play([S.target + shift], {noteMs: TUNER.toneMs, gapMs: 0, vol: .4});
    if (h.muted) A.UI && A.UI.toast && A.UI.toast('Sound is off: turn it on in Settings to hear the note.', {near: $('tnHear')});
    P.suppress(h.dur * 1000 + TUNER.listenAfterMs);
    await h.done;
    await wait(TUNER.listenAfterMs);
    if (S.tone !== h) return;                                        // stopped (another tab, another tone)
    S.tone = null;
    if (T.tab !== 'tuner') return;
    P.pauseListening(false); P.ignoreCurrent(); if (A.Sfx.sync) A.Sfx.sync();
    S.phase = 'yourturn';
  }
  function stopTone() { if (S.tone) { const h = S.tone; S.tone = null; h.stop(); } if (S.phase === 'tone') S.phase = 'listen'; }

  function setMode(m) {
    S.mode = m === 'target' ? 'target' : 'free'; D.tunerMode = S.mode; T.save();
    if (S.mode === 'free') S.phase = 'listen';
    drawMode();
  }

  /* ---------- controls ---------- */
  $('tnModeSeg').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { setMode(b.dataset.mode); if (A.Sfx.event && !P.listening()) A.Sfx.event('ui-toggle'); } });
  $('tnTarget').addEventListener('change', e => { const t = TARGETS[+e.target.value]; if (t) { S.target = t.s; D.tunerTarget = +e.target.value; T.save(); setMode('target'); } });
  $('tnHear').addEventListener('click', hear);
  $('tnConcert').addEventListener('click', () => { D.concertFirst = !D.concertFirst; T.save(); shownNote = undefined; drawSwitches(); });
  $('tnShowCents').addEventListener('click', () => { D.showCents = D.showCents === false; T.save(); drawSwitches(); });
  $('tnToMetro').addEventListener('click', () => T.go('metronome', {focus: true}));

  /* REFERENCE A (Settings → Tuner): for the director; every game stays at 440 */
  if (A.UI && A.UI.settings) A.UI.settings.register(box => {
    box.innerHTML = `<label class="ui-srow"><span class="ui-sname">Reference A<small>A = 440 Hz unless your director says otherwise</small></span>` +
      `<select id="tnA4">${A4S.map(f => `<option value="${f}">${f} Hz</option>`).join('')}</select></label>`;
    const sel = box.querySelector('select'); sel.value = String(D.a4 || 440);
    sel.addEventListener('change', () => { D.a4 = +sel.value; T.save(); if (T.tab === 'tuner') P.a4 = D.a4; });
  }, {title: 'Tuner'});

  /* ?demo: hold Space = the note in tune, U = sharp (+25 ¢), J = flat (−25 ¢), W = a wrong note (a step up) */
  if (A.DEMO) {
    const KEYS = {' ': 0, u: .25, j: -.25, w: 2};
    addEventListener('keydown', e => {
      if (!on() || e.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase(); if (!(k in KEYS)) return;
      e.preventDefault();
      P.demoNote = (S.mode === 'target' ? S.target : TARGETS[0].s) + KEYS[k];
    });
    addEventListener('keyup', e => { if (on() && e.key.toLowerCase() in KEYS) { P.demoNote = null; } });
  }

  /* ---------- the tab (toolbox.js) ---------- */
  T.register('tuner', {
    listens: () => pitched,
    enter() {
      $('tnDrums').hidden = pitched; $('tnMain').hidden = !pitched;
      if (!pitched) return;
      P.setRange(member.soundLow, member.soundHigh);
      P.a4 = D.a4 || 440;
      S.demoJitter = P.demoJitter; P.demoJitter = .02;
      P.demoTarget = () => null; P.demoAttacks = false;
      $('tnDemo').hidden = !A.DEMO;
      drawAvatar(); drawTargets(); drawMode(); drawSwitches();
      S.sm = null; S.raw = null; S.last = 0; S.fnow = 0; shownNote = undefined;
      if (!S.raf) S.raf = requestAnimationFrame(frame);
    },
    leave() {
      stopTone();
      if (!pitched) return;
      P.a4 = 440; P.setRange(null);
      if (S.demoJitter != null) P.demoJitter = S.demoJitter;
      if (A.DEMO) P.demoNote = null;
      cancelAnimationFrame(S.raf); S.raf = 0;
      S.hold = 0; S.filled = false; S.run = 0;
    },
  });

  /** tests */
  T.tuner = {
    TUNER, TUNING_TIPS, TARGETS,
    state: () => ({status: S.status, dir: S.dir, cents: S.sm, raw: S.raw, basket: S.basket, platform: S.platform,
      pos: S.status === 'rest' ? 'rest' : Math.abs(S.basket - S.platform) <= 2 ? 'landed' : S.basket < S.platform ? 'above' : 'below',
      words: S.words, arrow: S.arrow, big: $('tnBig').textContent, small: $('tnSmall').textContent, hold: S.hold, filled: S.filled, best: S.best,
      holdText: $('tnHold').textContent, tip: S.tip, mode: S.mode, target: S.target, phase: S.phase, face: S.face, confetti: S.confetti,
      landed: S.landed, a4: P.a4, flag: $('tnFlag').textContent}),
    hear, setMode, setTarget: i => { S.target = TARGETS[i].s; drawTargets(); drawMode(); },
    tuningNote,
  };
})(window.Arcade);
