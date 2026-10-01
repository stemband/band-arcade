/* TUNE UP's METRONOME tab: the student's AVATAR bops on the beat on a little stage, and THE TEMPO LADDER.
   It NEVER uses the microphone (toolbox.js turns the mic off on this tab), so its clicks never mute anything.
     THE CLICK = music-highway/backing.js's kit (the uploaded mh-click, else the generated woodblock: unpitched noise),
       SCHEDULED ON THE AUDIOCONTEXT CLOCK `lookaheadS` ahead by a small timer, never played "now": every tick's time is
       segment start + j × tick length (a new segment only when the tempo changes), so it can't drift. Beat 1 accented
       (the accent click: higher + louder), 6/8 accents 1 and 4, subdivision clicks softer. SILENT MODE schedules no sound.
     THE BOP follows the AUDIBLE time (Arcade.AudioClock: getOutputTimestamp / outputLatency), so the avatar lands
       exactly when the click is heard: a squash-and-bounce on every beat, a bigger hop + arms up (the victory pose) on
       beat 1. Reduced motion / MOTION off: no bobbing (the counter still lights). Silent mode: the counter glows gently
       on the beat, at most 3 times a second, never full-screen.
     CONTROLS: −/+ (±1, hold = ±5), a slider 40–208, TAP TEMPO (the average of the last 4 taps; 2 s idle starts over),
       the tempo word (TEMPO_WORDS), time signature 2/4 3/4 4/4 6/8 (6 eighths, accents 1 and 4; "Feel in 2" = 2
       dotted-quarter beats with the eighths as soft ticks) ¢ 2/2 (2 half-note beats), subdivision (not in 6/8),
       SILENT MODE, START/STOP. Keys: Space start/stop, ↑/↓ tempo (Shift = 5), T tap.
     THE TEMPO LADDER: START, GOAL, STEP, MEASURES per step; START LADDER counts in one measure, then every MEASURES
       measures goes up STEP (always ON A DOWNBEAT) until the GOAL (then keeps going, or STOP AT GOAL). HOLD stays on this
       tempo; STEP BACK goes down a step (at the next downbeat). At the goal: "You climbed to 100! 🎉" and a small fanfare
       once the click has stopped (never on a beat). 3 ladders of 8+ steps = the Ladder Climber name plate.
     A HIDDEN TAB stops it ("Paused — tap START").
   Everything is remembered on the device: gameData('tuneup').metro and .ladder. No stars, no setLevel. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const T = A.TuneUp, inst = T && T.inst;
  if (!inst) return;
  const {$} = A;

  /* ===== THE METRONOME'S NUMBERS (Mat edits) ===== */
  const METRO = {
    min: 40, max: 208,      // the tempo range (BPM)
    lookaheadS: .12,        // clicks are scheduled this far ahead on the audio clock
    tickMs: 25,             // how often the scheduler looks ahead
    startS: .12,            // the first click comes this long after START
    vol: {one: 1, accent: .85, beat: .9, sub: .45},   // beat 1, 6/8's beat 4, the other beats, subdivisions
    tapKeep: 4, tapResetMs: 2000,
    holdMs: 450, repeatMs: 220,                       // −/+ held: ±5 after holdMs, again every repeatMs
    flashMinMs: 340,        // silent mode: the counter glows at most this often (≤ 3 a second)
    hop: .07, hopOne: .16,  // the bop's height (share of the dancer's height): every beat, beat 1
    ladderPlate: 8,         // ladders of at least this many steps count toward the Ladder Climber plate
  };
  /* ===== THE TEMPO WORDS (Mat edits): [from BPM, word] ===== */
  const TEMPO_WORDS = [[0, 'Largo'], [60, 'Larghetto'], [66, 'Adagio'], [76, 'Andante'], [108, 'Moderato'], [120, 'Allegro'], [168, 'Presto']];
  const tempoWord = bpm => TEMPO_WORDS.filter(([f]) => bpm >= f).pop()[1];
  /* the meters: beats counted, which beats are accented, the default subdivision ticks */
  const METERS = {
    '2/4': {beats: 2, acc: [0]}, '3/4': {beats: 3, acc: [0]}, '4/4': {beats: 4, acc: [0]}, '2/2': {beats: 2, acc: [0]},
    '6/8': {beats: 6, acc: [0, 3], noSub: true},
  };

  const D = T.data();
  const M = D.metro = Object.assign({bpm: 100, meter: '4/4', feel2: false, sub: 1, silent: false}, D.metro || {});
  const L = D.ladder = Object.assign({start: 60, goal: 100, step: 4, measures: 4, stopAtGoal: false}, D.ladder || {});
  const RM = A.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)');
  const clampB = b => Math.max(METRO.min, Math.min(METRO.max, Math.round(b)));

  /** the structure now: beats a measure, ticks a beat, accents */
  function shape() {
    const m = METERS[M.meter] || METERS['4/4'];
    if (M.meter === '6/8' && M.feel2) return {beats: 2, sub: 3, acc: [0]};
    return {beats: m.beats, sub: m.noSub ? 1 : Math.max(1, Math.min(4, +M.sub || 1)), acc: m.acc};
  }

  /* ================= THE CLOCK + THE SCHEDULER ================= */
  let kit = null, clickBuf = null, clk = null, timer = 0;
  const R = {running: false, seg: null, j: 0, sh: null, bar: 0, beat: 0, sub: 0, pend: null, structPend: false, log: [], vis: [],
    ladder: null, sound: false, stopAt: null, endT: null, startedAt: 0};
  const loadClick = () => { if (!clickBuf && A.Sfx.buffer) Promise.resolve(A.Sfx.buffer('mh-click')).then(b => { if (b) clickBuf = b; }).catch(() => {}); };
  addEventListener('pointerdown', loadClick, true); addEventListener('keydown', loadClick, true);
  const perfClock = () => { const p0 = performance.now(); return {ctx: null, now: () => (performance.now() - p0) / 1000, audAt: p => (p - p0) / 1000, sample() {}}; };
  const beatDur = bpm => 60 / bpm;

  function emitTick() {
    const t = R.seg.t0 + R.j * R.seg.dur;
    const onBeat = R.sub === 0, down = onBeat && R.beat === 0;
    // a new time signature / subdivision starts a new measure on the next beat
    if (onBeat && R.structPend) { R.structPend = false; R.sh = shape(); if (!down) { R.beat = 0; R.bar++; } newSeg(t, R.seg.bpm); return emitTick(); }
    // a new tempo from the controls lands on the next beat (the ladder's land on a downbeat: ladderAtDownbeat)
    if (onBeat && R.pend && (R.pend.at === 'beat' || down)) { const b = R.pend.bpm; R.pend = null; newSeg(t, b); }
    if (down && R.ladder && !ladderAtDownbeat(t)) return false;         // the ladder stopped at its goal
    const s = R.seg, sh = R.sh;
    const accent = onBeat && sh.acc.includes(R.beat), one = down;
    const vol = !onBeat ? METRO.vol.sub : one ? METRO.vol.one : accent ? METRO.vol.accent : METRO.vol.beat;
    const sound = !!(kit && !M.silent);
    if (sound) kit.click(t, vol, accent);
    const ev = {t: +t.toFixed(6), bar: R.bar, beat: R.beat, sub: R.sub, accent, one, vol, bpm: s.bpm, sound, countIn: !!(R.ladder && R.ladder.countIn), subs: sh.sub, beats: sh.beats};
    R.log.push(ev); if (R.log.length > 4000) R.log.splice(0, 1000);
    if (onBeat) R.vis.push(ev);
    // the next tick
    R.j++; R.sub++;
    if (R.sub >= sh.sub) { R.sub = 0; R.beat++; if (R.beat >= sh.beats) { R.beat = 0; R.bar++; } }
    return true;
  }
  function newSeg(t, bpm) { R.seg = {t0: t, bpm, dur: beatDur(bpm) / R.sh.sub}; R.j = 0; showBpm(bpm); }
  function schedule() {
    if (!R.running) return;
    const horizon = clk.now() + METRO.lookaheadS;
    let guard = 0;
    while (R.running && R.seg.t0 + R.j * R.seg.dur < horizon && guard++ < 200) if (!emitTick()) { endRun(); break; }
  }
  async function start({ladder = false} = {}) {
    if (R.running) stop();
    $('mtPaused').hidden = true;
    R.sound = false; kit = null;
    // the audio clock whenever the arcade's audio is on (SILENT MODE uses it too, it just schedules no clicks)
    for (let i = 0; i < 8 && !(A.Sfx.output && A.Sfx.output()); i++) await new Promise(r => setTimeout(r, 40));   // the tap is unlocking the audio
    const o = A.Sfx.output && A.Sfx.output();
    if (o) { kit = A.MHBacking.create(o.ctx, o.out, {click: clickBuf}); R.sound = true; }
    else if (!M.silent && A.UI && A.UI.toast) A.UI.toast('Sound is off: the beat shows on screen only.', {near: $('mtGo')});
    clk = R.sound ? A.AudioClock.create().start() : perfClock();
    R.sh = shape(); R.bar = ladder ? -1 : 0; R.beat = 0; R.sub = 0; R.pend = null; R.structPend = false; R.vis = []; R.endT = null;
    R.ladder = ladder ? newLadder() : null;
    R.running = true; R.startedAt = clk.now();
    newSeg(clk.now() + METRO.startS, R.ladder ? R.ladder.rungs[0] : M.bpm);
    schedule();
    timer = setInterval(schedule, METRO.tickMs);
    drawRun(); loop();
  }
  /** stop now (the clicks already scheduled are cut) */
  function stop() {
    if (!R.running && !R.ladder) return;
    R.running = false; clearInterval(timer); timer = 0;
    if (kit) { kit.stopAll(); kit = null; }
    R.vis = [];
    const lad = R.ladder; R.ladder = null;
    drawRun();
    if (lad && lad.reached) celebrate(lad);
  }
  /* the ladder stopped at its goal: let the last clicks sound, then stop (and the fanfare after them) */
  function endRun() {
    R.running = false; clearInterval(timer); timer = 0;
    const last = R.log.length ? R.log[R.log.length - 1].t : clk.now();
    const ms = Math.max(0, (last - clk.audAt(performance.now())) * 1000) + 250;
    setTimeout(() => { if (!R.running) { kit = null; const lad = R.ladder; R.ladder = null; drawRun(); if (lad) celebrate(lad); } }, ms);
  }

  /* ================= THE TEMPO LADDER ================= */
  function rungsOf(l = L) {
    const out = [];
    if (!(l.goal > l.start) || !(l.step > 0)) return [clampB(l.start)];
    for (let b = l.start; b < l.goal; b += l.step) out.push(clampB(b));
    out.push(clampB(l.goal));
    return out.filter((b, i, a) => i === 0 || b !== a[i - 1]);
  }
  function newLadder() { return {rungs: rungsOf(), rung: 0, bars: 0, hold: false, countIn: true, reached: false, counted: false, steps: rungsOf().length - 1, msg: ''}; }
  /** at each downbeat: the count-in ends, a measure is counted, the tempo goes up a step. false = stop here. */
  function ladderAtDownbeat(t) {
    const lad = R.ladder;
    if (lad.countIn) { if (R.bar < 0) return true; lad.countIn = false; lad.bars = 0; drawLadder(); return true; }
    lad.bars++;
    const top = lad.rung >= lad.rungs.length - 1;
    if (lad.back) { lad.back = false; lad.bars = 0; lad.rung = Math.max(0, lad.rung - 1); newSeg(t, lad.rungs[lad.rung]); drawLadder(); return true; }
    if (lad.hold) { lad.bars = 0; drawLadder(); return true; }
    if (lad.bars < L.measures) { drawLadder(); return true; }
    if (top) {
      if (L.stopAtGoal) return false;
      lad.bars = 0; drawLadder(); return true;
    }
    lad.rung++; lad.bars = 0;
    newSeg(t, lad.rungs[lad.rung]);
    if (lad.rung === lad.rungs.length - 1) reachGoal(lad);
    drawLadder();
    return true;
  }
  function reachGoal(lad) {
    lad.reached = true;
    lad.msg = `You climbed to ${lad.rungs[lad.rungs.length - 1]}! 🎉`;
    $('ldMsg').textContent = lad.msg;
    if (!lad.counted && lad.steps >= METRO.ladderPlate) { lad.counted = true; D.ladders = (D.ladders || 0) + 1; T.save(); }
  }
  /* after the click has stopped: the fanfare (never on a beat), then a new item if one was earned */
  function celebrate(lad) {
    if (A.Sfx.event) A.Sfx.event('tuneup-ladder-top');
    R.fanfares = (R.fanfares || 0) + 1;
    if (lad.counted && T.reward) setTimeout(() => T.reward('Ladder climbed!', lad.msg), 900);
  }

  /* ================= THE PICTURE ================= */
  const dancer = $('mtDancer');
  function drawDancer() {
    const m = T.member ? T.member.id : null;
    const F = A.AvatarFight;
    const idle = F && F.ready() ? F.stillHTML(m, 'idle') : '', up = F && F.ready() ? F.stillHTML(m, 'victory') : '';
    dancer.innerHTML = idle && up ? `<span class="mt-pose mt-idle">${idle}</span><span class="mt-pose mt-up">${up}</span>`
      : `<span class="mt-pose mt-idle">${A.avatarHTML ? A.avatarHTML({size: 'big', member: m, label: ''}) : ''}</span><span class="mt-pose mt-up"></span>`;
  }
  addEventListener('arcade:avatar', () => { if (T.tab === 'metronome') drawDancer(); });
  function drawCounter() {
    const sh = R.running ? R.sh : shape();
    $('mtCount').innerHTML = Array.from({length: sh.beats}, (_, i) => `<b class="mt-n${sh.acc.includes(i) ? ' acc' : ''}" data-i="${i}">${i + 1}</b>`).join('');
    $('mtDots').innerHTML = Array.from({length: sh.beats}, (_, i) => `<i class="mt-dot" data-i="${i}"></i>` +
      Array.from({length: sh.sub - 1}, (_, k) => `<i class="mt-tick" data-i="${i}" data-k="${k + 1}"></i>`).join('')).join('');
    R.drawnShape = sh;
  }
  function showBpm(bpm) {
    $('mtBpm').textContent = bpm; $('mtWord').textContent = tempoWord(bpm);
    if (!R.running || !R.ladder) $('mtSlider').value = bpm;
  }
  function drawRun() {
    $('mtGo').textContent = R.running ? 'Stop' : 'Start';
    $('mtGo').setAttribute('aria-pressed', R.running);
    const ladOn = !!(R.running && R.ladder);
    $('ldGo').textContent = ladOn ? 'Stop ladder' : 'Start ladder';
    $('ldHold').disabled = $('ldBack').disabled = !ladOn;
    ['mtMinus', 'mtPlus', 'mtSlider', 'mtTap'].forEach(id => { $(id).disabled = ladOn; });
    $('mtStage').classList.toggle('running', R.running);
    if (!R.running) { showBpm(M.bpm); resetPose(); }
    drawCounter(); drawLadder();
  }
  function drawLadder() {
    const lad = R.ladder, box = $('mtLadder'), rungs = lad ? lad.rungs : rungsOf();
    box.hidden = !(lad || $('mtLad').open);
    const cur = lad ? lad.rung : -1, n = rungs.length;
    box.innerHTML = `<div class="mt-rails">` + rungs.map((b, i) => `<span class="mt-rung${i === cur ? ' cur' : i < cur ? ' done' : ''}" style="--i:${i};--n:${n}"><em>${i === 0 || i === n - 1 || i === cur ? b : ''}</em></span>`).join('') +
      (lad ? `<span class="mt-climber" style="--i:${cur};--n:${n}">${A.avatarHTML ? A.avatarHTML({size: 'chip', member: T.member ? T.member.id : null, label: ''}) : ''}</span>` : '') + `</div>`;
    let stat;
    if (!lad) stat = rungs.length > 1 ? `${rungs.length - 1} steps: ${rungs[0]} → ${rungs[rungs.length - 1]} BPM` : 'Set a goal faster than the start.';
    else if (lad.countIn) stat = 'Count-in…';
    else if (lad.hold) stat = `Step ${cur + 1} of ${n} · Holding: practice this speed until it's easy`;
    else if (cur >= n - 1) stat = `Step ${n} of ${n} · At the goal!`;
    else { const left = L.measures - lad.bars; stat = `Step ${cur + 1} of ${n} · ${left} measure${left === 1 ? '' : 's'} to the next step`; }
    $('ldStat').textContent = stat;
    $('ldHold').setAttribute('aria-pressed', !!(lad && lad.hold));
    $('ldBack').disabled = !lad || cur <= 0;
  }

  /* ---------- the frame loop: follow the AUDIBLE time ---------- */
  let raf = 0, shownBeat = null, lastFlash = 0;
  const bops = [];
  function resetPose() { dancer.style.transform = ''; dancer.classList.remove('arms'); $('mtCount').querySelectorAll('.lit').forEach(x => x.classList.remove('lit', 'flash')); $('mtDots').querySelectorAll('.lit').forEach(x => x.classList.remove('lit')); shownBeat = null; }
  function loop() {
    cancelAnimationFrame(raf);
    const step = () => {
      raf = 0;
      const last = R.vis[R.vis.length - 1];
      if (!R.running && !(last && clk && last.t + beatDur(last.bpm) > clk.audAt(performance.now()))) { resetPose(); return; }
      if (T.tab !== 'metronome') return;
      clk.sample();
      const p = performance.now(), aud = clk.audAt(p);
      while (R.vis.length > 1 && R.vis[1].t <= aud) R.vis.shift();
      const ev = R.vis[0];
      if (ev && ev.t <= aud) {
        const dur = beatDur(ev.bpm), ph = Math.min(1, (aud - ev.t) / dur);
        const key = ev.bar + ':' + ev.beat;
        if (key !== shownBeat) {
          shownBeat = key;
          if (R.drawnShape && R.drawnShape.beats !== ev.beats) drawCounter();
          $('mtCount').querySelectorAll('.mt-n').forEach(x => x.classList.toggle('lit', +x.dataset.i === ev.beat));
          $('mtDots').querySelectorAll('.mt-dot').forEach(x => x.classList.toggle('lit', +x.dataset.i === ev.beat));
          if (M.silent && p - lastFlash >= METRO.flashMinMs) {
            lastFlash = p; const n = $('mtCount').querySelector('.mt-n.lit');
            if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
          }
          bops.push({bar: ev.bar, beat: ev.beat, click: ev.t, land: aud - ph * dur, seen: aud});
          if (bops.length > 600) bops.splice(0, 200);
          if (ev.countIn !== R.shownCount) { R.shownCount = ev.countIn; $('mtStage').classList.toggle('countin', ev.countIn); }
        }
        // the subdivision ticks
        const k = Math.floor(ph * ev.subs);
        $('mtDots').querySelectorAll('.mt-tick').forEach(x => x.classList.toggle('lit', +x.dataset.i === ev.beat && +x.dataset.k === k));
        // THE BOP: on the ground (squashed) at the beat, a bounce in between; beat 1 a bigger hop with arms up
        if (!RM.matches) {
          const h = dancer.offsetHeight || 160, hop = (ev.one ? METRO.hopOne : METRO.hop) * h;
          const y = -hop * Math.sin(Math.PI * ph), sq = Math.max(0, 1 - ph / .18) * (ev.one ? .14 : .09);
          dancer.style.transform = `translateY(${y.toFixed(1)}px) scale(${(1 + sq * .6).toFixed(3)}, ${(1 - sq).toFixed(3)})`;
        } else dancer.style.transform = '';
        dancer.classList.toggle('arms', ev.one && ph < .6);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ================= CONTROLS ================= */
  function setBpm(b, {save = true} = {}) {
    b = clampB(b);
    M.bpm = b; if (save) T.save();
    if (R.running && !R.ladder) R.pend = {bpm: b, at: 'beat'};
    showBpm(b);
  }
  function holdBtn(id, d) {
    const el = $(id); let t = 0, rep = 0, long = false;
    const end = () => { clearTimeout(t); clearInterval(rep); t = rep = 0; };
    el.addEventListener('pointerdown', e => {
      if (el.disabled || e.button > 0) return;
      long = false; end();
      t = setTimeout(() => { long = true; setBpm(M.bpm + 5 * d); rep = setInterval(() => setBpm(M.bpm + 5 * d), METRO.repeatMs); }, METRO.holdMs);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => el.addEventListener(k, end));
    el.addEventListener('click', e => { if (long) { long = false; return; } setBpm(M.bpm + d); });
    if (A.holdGuard) A.holdGuard(el);
  }
  holdBtn('mtMinus', -1); holdBtn('mtPlus', 1);
  $('mtSlider').addEventListener('input', e => setBpm(+e.target.value));
  const taps = [];
  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > METRO.tapResetMs) taps.length = 0;
    taps.push(now); while (taps.length > METRO.tapKeep) taps.shift();
    if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    const b = $('mtTap'); b.classList.remove('tapped'); void b.offsetWidth; b.classList.add('tapped');
  }
  $('mtTap').addEventListener('click', tap);
  $('mtGo').addEventListener('click', () => { if (R.running) stop(); else start(); });
  const seg = (id, key, conv = String) => {
    const box = $(id);
    const draw = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(conv(b.dataset.v)) === String(M[key])));
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return;
      M[key] = conv(b.dataset.v); T.save(); draw(); drawOptions();
      if (R.running) R.structPend = true; else drawCounter();
    });
    return draw;
  };
  const drawMeter = seg('mtMeter', 'meter'), drawSub = seg('mtSub', 'sub', Number);
  const sw = (id, get, set) => { const el = $(id); el.addEventListener('click', () => { set(!get()); T.save(); drawOptions(); }); return () => el.setAttribute('aria-checked', !!get()); };
  const drawFeel = sw('mtFeel', () => M.feel2, v => { M.feel2 = v; if (R.running) R.structPend = true; });
  const drawSilent = sw('mtSilent', () => M.silent, v => { M.silent = v; });   // the scheduler reads it tick by tick
  const drawStop = sw('ldStop', () => L.stopAtGoal, v => { L.stopAtGoal = v; });
  function drawOptions() {
    drawMeter(); drawSub(); drawFeel(); drawSilent(); drawStop();
    const six = M.meter === '6/8';
    $('mtFeelRow').hidden = !six;
    $('mtSub').querySelectorAll('button').forEach(b => { b.disabled = six; });
    $('mtSub').classList.toggle('off', six);
    if (!R.running) drawCounter();
  }
  // the ladder's numbers
  const LD = {ldStart: 'start', ldGoal: 'goal', ldStep: 'step', ldMeas: 'measures'};
  Object.entries(LD).forEach(([id, k]) => {
    const el = $(id); el.value = L[k];
    el.addEventListener('change', () => {
      const lim = k === 'step' ? [1, 40] : k === 'measures' ? [1, 32] : [METRO.min, METRO.max];
      const v = Math.max(lim[0], Math.min(lim[1], Math.round(+el.value || L[k])));
      L[k] = v; el.value = v; T.save(); drawLadder();
    });
  });
  $('mtLad').addEventListener('toggle', drawLadder);
  $('ldGo').addEventListener('click', () => {
    if (R.running && R.ladder) { stop(); return; }
    if (rungsOf().length < 2) { $('ldMsg').textContent = 'Set a goal faster than the start tempo.'; return; }
    $('ldMsg').textContent = '';
    start({ladder: true});
  });
  $('ldHold').addEventListener('click', () => { if (R.ladder) { R.ladder.hold = !R.ladder.hold; drawLadder(); } });
  $('ldBack').addEventListener('click', () => { if (R.ladder && R.ladder.rung > 0) { R.ladder.back = true; drawLadder(); } });   // HOLD stays as it was

  /* the keys (only on this tab; never inside a text/number box or the slider) */
  addEventListener('keydown', e => {
    if (T.tab !== 'metronome' || e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('ui-modal')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.closest('[role=tablist]')) return;
    if (e.key === ' ') { e.preventDefault(); if (!e.repeat) $('mtGo').click(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { if (R.ladder) return; e.preventDefault(); setBpm(M.bpm + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1)); }
    else if (e.key.toLowerCase() === 't' && !e.repeat) { if (R.ladder) return; e.preventDefault(); tap(); }
  });
  /* a hidden tab stops it (the audio may be suspended anyway) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (R.running || R.ladder)) { stop(); $('mtPaused').hidden = false; }
  });

  /* ---------- the tab (toolbox.js) ---------- */
  T.register('metronome', {
    listens: false,
    enter() { drawDancer(); drawOptions(); showBpm(M.bpm); drawRun(); },
    leave() { stop(); $('mtPaused').hidden = true; },
  });

  /** tests */
  T.metronome = {
    METRO, TEMPO_WORDS, tempoWord, METERS,
    state: () => ({running: R.running, bpm: R.seg ? R.seg.bpm : M.bpm, saved: Object.assign({}, M), ladder: R.ladder ? Object.assign({}, R.ladder, {rungs: R.ladder.rungs.slice()}) : null,
      ladderSettings: Object.assign({}, L), sound: R.sound, word: $('mtWord').textContent, shown: +$('mtBpm').textContent, paused: !$('mtPaused').hidden,
      stat: $('ldStat').textContent, msg: $('ldMsg').textContent, ladders: D.ladders || 0, fanfares: R.fanfares || 0, kitCount: kit ? kit.count() : 0}),
    log: () => R.log.slice(), bops: () => bops.slice(), clear: () => { R.log.length = 0; bops.length = 0; },
    start, stop, setBpm, tap,
    /** the schedule's times for n ticks of one segment, exactly as emitTick computes them (no accumulation, no drift) */
    times: (bpm, n, sub = 1) => { const dur = beatDur(bpm) / sub; return Array.from({length: n}, (_, j) => j * dur); },
    clock: () => clk ? {aud: clk.audAt(performance.now()), now: clk.now(), audio: !!clk.ctx} : null,
    rungs: () => rungsOf(),
  };
})(window.Arcade);
