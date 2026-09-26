/* Sustain Speedway: a long-tone and intonation racing game. The student's instrument is the car's engine: the car
   moves only while they hold the lap's target note, faster the more in tune and steady it is (levels.js RULES).
   Notes: NOTES × ORDER (shared/mode-picker.js + sequences.js), one target note per lap. Tracks and rules: levels.js.
   Progress: per instrument MEMBER (games.js byMember): setLevel(<progress key>, member id, track, {stars, best});
   best = the best finish time in tenths of a second. Ghost cars and best laps live in store.gameData('sustain-speedway'):
     {diff, ghosts: {'<progress key>|<member>|<track>': {t (total s), p: [progress every RULES.ghostEvery s]}},
      bestLap: {same key: seconds}, achievements: {'virtuoso-win': true}}
   THE MICROPHONE listens for the whole race: nothing plays while racing (only the countdown before GO, and pit-in
   during a pit stop, which is a rest). The race clock stops while a sound mutes the detector (Pitch.isSuppressed). */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'sustain-speedway';
  const TRACKS = window.SPEEDWAY_TRACKS, R = window.SPEEDWAY_RULES;

  const inst = A.requireInstrument(GAME_ID);            // bells and snare go back to Select Player (games.js noPlay.block)
  if (!inst) return;
  const member = A.currentMember(), who = member.id;
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gd = A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const sfx = name => (A.Sfx ? A.Sfx.event(name) : 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const signed = c => { const a = Math.round(Math.abs(c)); return (a === 0 ? '' : c > 0 ? '+' : '−') + a + '¢'; };   // "+12¢", "−8¢", "0¢"
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();

  /* ---------- difficulty (remembered): Rookie ±20, Pro ±12, Virtuoso ±6 cents for full speed ---------- */
  const DIFF = R.difficulties, diffOf = id => DIFF.find(d => d.id === id) || DIFF[0];
  $('diffBtns').innerHTML = DIFF.map(d => `<button type="button" class="seg" data-diff="${d.id}">${d.name}</button>`).join('');
  function drawDiff() {
    const d = diffOf(gd.diff);
    document.querySelectorAll('[data-diff]').forEach(b => b.setAttribute('aria-pressed', b.dataset.diff === d.id));
    $('diffSay').textContent = `Full speed within ±${d.tol} cents of the center of the note.`;
  }
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { gd.diff = b.dataset.diff; save(); drawDiff(); if (A.Sfx) A.Sfx.event('ui-toggle'); }));
  drawDiff();

  /* ---------- modes: NOTES × ORDER, one note per lap ---------- */
  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: TRACKS.length, onChange: () => showHub()});
  const lapLens = L => [...Array(L.laps)].map((_, i) => Array.isArray(L.lap) ? L.lap[0] + (L.lap[1] - L.lap[0]) * (L.laps > 1 ? i / (L.laps - 1) : 0) : L.lap);
  const recKey = lv => `${picker.state.progressKey}|${who}|${lv}`;       // ghost cars and best laps: track × mode × instrument

  /* ---------- the track select ---------- */
  function showHub() {
    stopRace();
    A.ModePicker.useRange(picker.state);
    picker.refresh();
    $('race').hidden = true; $('hub').hidden = false; $('results').hidden = true;
    document.body.classList.remove('racing');
    const key = picker.state.progressKey;
    $('trackGrid').innerHTML = TRACKS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, who, lv);
      const open = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, who, lv - 1).stars >= 3;   // winning opens the next track
      const lens = lapLens(L), lapTxt = lens[0] === lens[lens.length - 1] ? `${lens[0]} s` : `${lens[0]}–${lens[lens.length - 1]} s`;
      const bl = (gd.bestLap || {})[recKey(lv)];
      return `<button class="trk sc-${L.scene}" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Track ${lv}</span><span class="t">${L.name}</span>
        <span class="d">${L.blurb}</span>
        <span class="facts">${L.laps} laps · ${lapTxt} a lap${L.tunnels ? ' · tunnels' : ''}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${!open ? 'Win the track before to open' : p.best ? 'Best ' + fmt(p.best / 10) + (bl ? ` · lap ${bl.toFixed(1)} s` : '') : ''}</span></span>
      </button>`;
    }).join('');
    $('trackGrid').querySelectorAll('.trk').forEach(b => b.addEventListener('click', () => { const lv = +b.dataset.l; A.requireMic(() => startRace(lv)); }));
  }

  /* ---------- a race ---------- */
  let G = null, raf = 0, lastT = 0;
  const S = {state: 'silent', cents: null, hist: [], wrongRun: 0, zoneSince: 0, I: 0, P: 0, V: 0, score: 0};   // what the mic hears

  function startRace(lv) {
    stopRace();
    const L = TRACKS[lv - 1], d = diffOf(gd.diff);
    A.ModePicker.useRange(picker.state);
    const seq = A.ModePicker.sequence(picker.state, Object.assign({}, L, {count: L.laps}), lv);
    const lens = lapLens(L);
    const rivals = L.rivals.map((r, i) => Object.assign({lane: [-1, 1, -1][i] * (i === 2 ? .45 : 1)}, r));
    const ghost = (gd.ghosts || {})[recKey(lv)] || null;
    G = {lv, L, diff: d, seq, items: seq.items, lens, rivals, ghost, lap: 0, dist: 0, v: 0, clock: 0, lapStart: 0, lapTimes: [],
      phase: 'count', goAt: 0, pitEnd: 0, nitro: false, zoneTime: 0, driveTime: 0, ghostRec: [0], nextRec: R.ghostEvery,
      laps: lens.map(() => ({n: 0, sum: 0, abs: 0, zone: 0})), world: 0, flashUntil: 0, finishedAt: 0};
    G.total = lens.reduce((a, b) => a + b, 0);
    $('hub').hidden = true; $('results').hidden = true; $('race').hidden = false; $('pit').hidden = true;
    document.body.classList.add('racing');
    $('raceDiff').textContent = `${d.name} · full speed within ±${d.tol}¢`;
    $('hudOf').textContent = `of ${rivals.length + 1}`;
    $('whoPic').innerHTML = A.portraitHTML(who, {size: 'tile', label: member.short});
    drawGauge(); drawNote(); hud(); resize();
    window.scrollTo(0, 0);
    resetHearing();
    // 3, 2, 1, GO! The countdown sound plays BEFORE listening counts; GO waits until it has finished (and its echo)
    const snd = sfx('race-countdown');
    G.goAt = performance.now() + Math.max(R.countdownMs, snd * 1000 + 300);
    A.Pitch.demoJitter = 0.01;
    lastT = performance.now(); raf = requestAnimationFrame(loop);
  }
  function stopRace() {
    cancelAnimationFrame(raf); raf = 0;
    G = null; demoKey = null; A.Pitch.demoNote = null; A.Pitch.demoJitter = 0.2;
    banner('');
  }
  function resetHearing() { S.state = 'silent'; S.cents = null; S.hist = []; S.wrongRun = 0; S.zoneSince = 0; S.score = 0; if (G) G.nitro = false; A.Pitch.ignoreCurrent(); }
  const item = () => G && G.items[Math.min(G.lap, G.items.length - 1)];

  /* ---------- listening: ~25 readings a second ---------- */
  const std = a => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
  const lerp01 = (v, full, none) => clamp((none - v) / (none - full), 0, 1);     // 1 at `full` or better, 0 at `none` or worse
  function intonation(c, tol) {
    const a = Math.abs(c);
    if (a <= tol) return 1;
    if (a <= R.low.cents) return 1 - (1 - R.low.credit) * (a - tol) / (R.low.cents - tol);
    return R.low.credit * clamp((50 - a) / (50 - R.low.cents), 0, 1);
  }
  A.Pitch.onFrame((r, level, now) => {
    if (!G || G.phase !== 'race') { if (G) drawGaugeNeedle(null); return; }
    const it = item();
    // cents from the TARGET (any octave): the engine's own `cents` is from the nearest semitone
    const dev = r ? (((r.midi - it.pc) % 12 + 18) % 12 - 6) * 100 : null;
    if (r && r.pc === it.pc && Math.abs(dev) <= 50) {
      S.wrongRun = 0; S.state = 'on'; S.cents = dev;
      S.hist.push({t: now, c: dev, db: 20 * Math.log10(Math.max(level, 1e-5))});
      while (S.hist.length && now - S.hist[0].t > R.windowMs) S.hist.shift();
      S.I = intonation(dev, G.diff.tol);
      const enough = S.hist.length >= 3;
      S.P = enough ? lerp01(std(S.hist.map(h => h.c)), R.pitch[0], R.pitch[1]) : 0.5;
      S.V = enough ? lerp01(std(S.hist.map(h => h.db)), R.volume[0], R.volume[1]) : 0.5;
      S.score = R.weights.tune * S.I + R.weights.pitch * S.P + R.weights.volume * S.V;
      // NITRO: within ±5 cents and steady for 2 s in a row, and for as long as it stays that way
      const zone = Math.abs(dev) <= R.nitro.cents && S.P >= R.nitro.steady && S.V >= R.nitro.steady;
      if (zone) { if (!S.zoneSince) S.zoneSince = now; } else S.zoneSince = 0;
      const was = G.nitro;
      G.nitro = zone && now - S.zoneSince >= R.nitro.holdMs;
      if (G.nitro && !was) { banner('IN THE ZONE!', 'zone', 1400); }
      const lp = G.laps[G.lap]; lp.n++; lp.sum += dev; lp.abs += Math.abs(dev);
    } else if (r) {                                          // a different note: brake (after a couple of readings)
      if (++S.wrongRun >= R.wrongFrames) {
        if (S.state !== 'wrong') { G.flashUntil = now + 900; flashTarget(); }
        S.state = 'wrong'; S.cents = null; S.hist = []; S.zoneSince = 0; G.nitro = false; S.score = 0;
      }
    } else {                                                 // silence (breathing), or nothing clear: coast
      S.wrongRun = 0; S.state = 'silent'; S.cents = null; S.hist = []; S.zoneSince = 0; G.nitro = false; S.score = 0;
    }
    drawGaugeNeedle(S.state === 'on' ? S.cents : null);
  });

  /* ---------- the loop: the car, the clock, laps, pit stops, rivals ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!G) return;
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    demoDrive(now);
    const paused = document.hidden || A.Pitch.isSuppressed(now);   // a sound is muting the mic: the race clock stops
    if (G.phase === 'count') {
      const left = Math.ceil((G.goAt - now) / 1000);
      if (now >= G.goAt) { G.phase = 'race'; banner('GO!', 'go', 700); resetHearing(); }
      else banner(String(Math.min(3, left)), 'count');
    } else if (G.phase === 'race' && !paused) {
      G.clock += dt; G.driveTime += dt;
      const target = S.state === 'on' ? S.score * (G.nitro ? R.nitro.boost : 1) : 0;
      if (S.state === 'on') G.v = target > G.v ? Math.min(target, G.v + R.accel * dt) : Math.max(target, G.v - R.ease * dt);
      else if (S.state === 'wrong') G.v = Math.max(0, G.v - R.brake * dt);
      else G.v = Math.max(0, G.v - R.coast * dt);
      if (G.nitro) { G.zoneTime += dt; G.laps[G.lap].zone += dt; }
      G.dist += G.v * dt; G.world += G.v * dt;
      if (G.dist >= G.lens[G.lap]) lapDone(now);
    } else if (G.phase === 'pit' && !paused) {
      G.clock += dt;
      pitCoach();
      if (G.clock >= G.pitEnd) leavePit();
    }
    if (G && G.phase !== 'done' && G.clock >= G.nextRec) { G.ghostRec.push(+progress().toFixed(3)); G.nextRec += R.ghostEvery; }
    if (G) { hud(); render(now); }
  }
  function progress() { return G.phase === 'pit' ? G.lap + 1 : G.lap + Math.min(1, G.dist / G.lens[G.lap]); }
  /** a rival's (or anyone's) progress at race time t, driving at `pace` and pitting like everyone else */
  function paceProgress(pace, t) {
    for (let i = 0; i < G.lens.length; i++) {
      const d = G.lens[i] / pace;
      if (t < d) return i + t / d;
      t -= d;
      if (i === G.lens.length - 1) return G.lens.length;
      if (t < R.pitSec) return i + 1;
      t -= R.pitSec;
    }
    return G.lens.length;
  }
  const paceFinish = pace => G.total / pace + (G.lens.length - 1) * R.pitSec;
  function ghostProgress(t) {
    const p = G.ghost && G.ghost.p; if (!p || !p.length) return null;
    const k = t / R.ghostEvery, i = Math.floor(k);
    if (i >= p.length - 1) return t >= G.ghost.t ? G.lens.length : p[p.length - 1];
    return p[i] + (p[i + 1] - p[i]) * (k - i);
  }
  function position() {
    const me = progress();
    return 1 + G.rivals.filter(r => paceProgress(r.pace, G.clock) > me).length;
  }
  function lapDone(now) {
    const t = G.clock - G.lapStart;
    G.lapTimes.push(t);
    if (G.lap === G.lens.length - 1) return finishRace(now);
    // PIT STOP: a short, required rest; the next note is shown so the student can get ready
    G.phase = 'pit'; G.pitEnd = G.clock + R.pitSec; G.pitStart = G.clock; G.v = 0;
    resetHearing(); drawGaugeNeedle(null);
    $('pitLap').textContent = `${G.lap + 2} of ${G.lens.length}`;
    const nx = G.items[G.lap + 1];
    $('pitStaff').innerHTML = staff(nx, 260);
    $('pitName').textContent = nx.label;
    $('pit').hidden = false; $('coach').textContent = 'Breathe in…';
    banner(`LAP ${G.lap + 1} · ${t.toFixed(1)} s`, 'lap', 1200);
    sfx('pit-in');                                              // a rest: the mic is ignored here anyway
  }
  function pitCoach() {
    const into = G.clock - G.pitStart, beat = R.pitSec / 4.4;      // "Breathe in… 2… 3… 4", then GO
    const n = Math.floor(into / beat);
    $('coach').textContent = n <= 0 ? 'Breathe in…' : n < 4 ? `${n + 1}…` : 'Ready…';
  }
  function leavePit() {
    G.lap++; G.dist = 0; G.lapStart = G.clock; G.phase = 'race';
    $('pit').hidden = true;
    drawNote(); resetHearing();
    banner('GO!', 'go', 600);
  }
  function finishRace() {
    G.phase = 'done'; G.v = 0;
    G.ghostRec.push(G.lens.length);
    sfx('race-finish');
    banner('FINISH!', 'finish');
    const g = G;
    setTimeout(() => { if (G === g) results(g); }, 1500);
  }

  /* ---------- ?demo: hold Space = the right note in tune; D = drifting sharp; W = a wrong note; E = centered but wobbly ---------- */
  let demoKey = null;
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (!G || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
      if (['space', 'd', 'w', 'e'].includes(k)) { demoKey = k; e.preventDefault(); }
    });
    addEventListener('keyup', e => { const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (k === demoKey) { demoKey = null; A.Pitch.demoNote = null; } });
  }
  function demoDrive(now) {
    if (!A.DEMO || !G) return;
    const it = item();
    if (!demoKey || !it) { A.Pitch.demoNote = null; return; }
    if (demoKey === 'space') { A.Pitch.demoJitter = 0.01; A.Pitch.demoNote = it.sounding; }
    else if (demoKey === 'd') { A.Pitch.demoJitter = 0.2; A.Pitch.demoNote = it.sounding + 0.3 + 0.05 * Math.sin(now / 260); }
    else if (demoKey === 'e') { A.Pitch.demoJitter = 0.2; A.Pitch.demoNote = it.sounding; }         // centered, but wobbling ±10 cents
    else { A.Pitch.demoJitter = 0.02; A.Pitch.demoNote = it.sounding + 2; }
  }

  /* ---------- HUD ---------- */
  function staff(it, w = 200) {
    const sigW = A.keySigWidth(G.seq.sig), width = w + sigW;
    return A.staffSVG(inst.clef, [{n: it.show, x: (84 + sigW + width - 30) / 2}], {fit: G.seq.fit, keySig: G.seq.sig, width, label: `Play ${it.label}`});
  }
  function drawNote() { const it = item(); $('noteStaff').innerHTML = staff(it); $('noteName').textContent = it.label; $('noteFlash').textContent = ''; $('noteCard').classList.remove('flash'); }
  function flashTarget() {
    const c = $('noteCard'), it = item();
    $('noteFlash').textContent = `Target: ${it.label}`;
    c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
  }
  let lastHud = '';
  function hud() {
    const pos = G.phase === 'count' ? G.rivals.length + 1 : position();
    const txt = [ord(pos), `${Math.min(G.lap + 1, G.lens.length)}/${G.lens.length}`, fmt(G.clock), Math.round(G.v * R.topSpeed), S.state].join('|');
    if (txt !== lastHud) {
      lastHud = txt;
      $('hudPos').textContent = ord(pos);
      $('hudLap').textContent = `${Math.min(G.lap + 1, G.lens.length)}/${G.lens.length}`;
      $('hudTime').textContent = fmt(G.clock);
      $('speedTxt').textContent = Math.round(G.v * R.topSpeed);
    }
    $('speedBar').style.width = clamp(G.v / R.nitro.boost, 0, 1) * 100 + '%';
    $('speedBar').classList.toggle('nitro', G.nitro);
    const steady = S.state === 'on' ? Math.round((S.P * R.weights.pitch + S.V * R.weights.volume) / (R.weights.pitch + R.weights.volume) * 100) : null;
    $('steadyTxt').textContent = steady === null ? '–' : steady >= 80 ? 'STEADY' : steady >= 50 ? 'Wobbly' : 'Unsteady';
    $('steadyBar').style.width = (steady || 0) + '%';
    $('zoneTxt').textContent = G.phase === 'pit' ? 'Pit stop: rest, breathe, and get ready for the next note.'
      : G.phase === 'count' ? 'Get ready: play the note when you see GO!'
      : G.nitro ? 'IN THE ZONE! Nitro while you stay centered and steady.'
      : S.state === 'wrong' ? `Wrong note: braking. Target: ${item().label}`
      : S.state === 'silent' && G.phase === 'race' ? 'Coasting. Breathe, then play the note again.'
      : S.zoneSince ? `Centered… ${Math.max(0, (R.nitro.holdMs - (performance.now() - S.zoneSince)) / 1000).toFixed(1)} s to nitro` : 'Hold within ±5 cents, steady, for 2 seconds: IN THE ZONE!';
    document.body.classList.toggle('nitro-on', !!G.nitro);
  }
  let bannerT = 0;
  function banner(text, cls, ms) {
    const b = $('banner'); clearTimeout(bannerT);
    b.hidden = !text; b.textContent = text || ''; b.className = 'banner' + (cls ? ' b-' + cls : '');
    if (text && ms) bannerT = setTimeout(() => { b.hidden = true; }, ms);
  }

  /* the TUNING SPEEDOMETER: an arc from −50 to +50 cents, the in-tune zone (±tolerance) glowing in the middle */
  const GA = {cx: 120, cy: 128, r: 100};
  const angle = c => Math.PI * (1 + (clamp(c, -50, 50) + 50) / 100);      // −50 = left end, +50 = right end
  const pt = (a, r) => `${(GA.cx + r * Math.cos(a)).toFixed(1)} ${(GA.cy + r * Math.sin(a)).toFixed(1)}`;
  const arc = (c1, c2, r) => `M${pt(angle(c1), r)}A${r} ${r} 0 0 1 ${pt(angle(c2), r)}`;
  function drawGauge() {
    const tol = G.diff.tol;
    const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map(c => `<path class="g-tick${c % 50 === 0 || c === 0 ? ' big' : ''}" d="M${pt(angle(c), GA.r - 14)}L${pt(angle(c), GA.r - (c % 50 === 0 || c === 0 ? 26 : 20))}"/>`).join('');
    $('gaugeSvg').innerHTML = `<title id="gaugeLbl">Tuning: how far from the center of the note</title>` +
      `<path class="g-track" d="${arc(-50, 50, GA.r)}"/>` +
      `<path class="g-warm" d="${arc(-40, -tol, GA.r)}"/><path class="g-warm" d="${arc(tol, 40, GA.r)}"/>` +
      `<path class="g-zone" d="${arc(-tol, tol, GA.r)}"/><path class="g-nitro" d="${arc(-R.nitro.cents, R.nitro.cents, GA.r)}"/>` +
      `<path class="g-speed-bg" d="${arc(-50, 50, GA.r - 38)}"/><path class="g-speed" id="gSpeed" d="${arc(-50, 50, GA.r - 38)}" pathLength="100" stroke-dasharray="0 100"/>` +
      ticks +
      `<text class="g-lbl" x="${GA.cx - GA.r + 4}" y="${GA.cy + 18}">♭ flat</text><text class="g-lbl" x="${GA.cx + GA.r - 4}" y="${GA.cy + 18}" text-anchor="end">sharp ♯</text>` +
      `<text class="g-lbl mid" x="${GA.cx}" y="${GA.cy - GA.r - 6}" text-anchor="middle">IN TUNE</text>` +
      `<g id="gNeedle" class="g-needle off"><path d="M${GA.cx - 4} ${GA.cy}L${GA.cx} ${GA.cy - GA.r + 8}L${GA.cx + 4} ${GA.cy}Z"/><circle cx="${GA.cx}" cy="${GA.cy}" r="8"/></g>`;
    drawGaugeNeedle(null);
  }
  function drawGaugeNeedle(c) {
    const n = $('gNeedle'); if (!n) return;
    n.classList.toggle('off', c === null);
    n.setAttribute('transform', `rotate(${((c === null ? 0 : clamp(c, -50, 50)) * 0.9).toFixed(1)} ${GA.cx} ${GA.cy})`);
    const sp = $('gSpeed'), fill = S.state === 'on' ? S.score * 100 : 0;
    if (sp) { sp.setAttribute('stroke-dasharray', `${fill.toFixed(1)} 100`); sp.style.opacity = fill > 0.5 ? 1 : 0; }   // no round-cap dot at zero
    const t = $('centsTxt'), tol = G ? G.diff.tol : 20;
    if (c === null) { t.textContent = S.state === 'wrong' ? 'Wrong note' : '–'; t.className = 'cents' + (S.state === 'wrong' ? ' bad' : ''); return; }
    const a = Math.round(Math.abs(c));
    const sgn = a === 0 ? '' : c > 0 ? '+' : '−';
    t.textContent = a <= tol ? `IN TUNE ${sgn}${a}¢` : `${sgn}${a}¢ ${c > 0 ? 'sharp' : 'flat'}`;
    t.className = 'cents ' + (a <= R.nitro.cents ? 'zone' : a <= tol ? 'good' : 'off');
  }

  /* ---------- the road: a pseudo-3D canvas (simple polygons and gradients, ≤ 1.5 × pixel ratio) ---------- */
  const cv = $('road'), cx = cv.getContext('2d');
  let W = 0, H = 0, C = null, scenery = null;
  function colors() {
    return {skyTop: css('sw-sky-top'), skyMid: css('sw-sky-mid'), skyLow: css('sw-sky-low'), dusk: css('sw-dusk-low'), night: css('sw-night-low'),
      sun1: css('sw-sun-1'), sun2: css('sw-sun-2'), moon: css('sw-moon'), star: css('sw-star'), ground: css('sw-ground'), grid: css('sw-grid'),
      road: css('sw-road'), road2: css('sw-road-2'), lane: css('sw-lane'), far: css('sw-far'), near: css('sw-near'), win: css('sw-window'),
      water: css('sw-water'), tunnel: css('sw-tunnel'), tail: css('sw-tail'), glass: css('sw-glass'), tire: css('sw-tire'), nitro: css('sw-nitro'),
      pink: css('pink'), cyan: css('cyan'), yellow: css('yellow'), amber: css('amber'), green: css('green'), purple: css('purple'), white: css('white-hi')};
  }
  function resize() {
    if (!G) return;
    const dpr = Math.min(1.5, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    C = C || colors();
    scenery = buildScenery();
  }
  addEventListener('resize', resize);
  const HOR = () => H * .42;                                // the horizon
  /* the skyline, drawn once per size into its own canvas (then just copied each frame) */
  function buildScenery() {
    const L = G.L, off = document.createElement('canvas'), w = Math.ceil(W * 1.3), h = Math.ceil(HOR() + 2);
    off.width = w; off.height = h;
    const g = off.getContext('2d'); let seed = G.lv * 97;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const base = h - 1;
    if (L.scene === 'mountain' || L.scene === 'desert' || L.scene === 'sunset') {
      [[C.far, .45, 9], [C.near, .3, 6]].forEach(([col, hh, n]) => {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, base);
        for (let i = 0; i <= n; i++) {
          const x = i / n * w, peak = base - h * hh * (.45 + rnd() * .55);
          if (L.scene === 'desert') { g.lineTo(x, peak); g.lineTo(x + w / n * .6, peak); } else g.lineTo(x + w / n / 2, peak);
          g.lineTo(x + w / n, base - h * .05);
        }
        g.lineTo(w, base); g.closePath(); g.fill();
      });
      if (L.scene === 'mountain') { g.strokeStyle = C.purple; g.globalAlpha = .5; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1; }
    } else {
      // a city (river / harbor / grand prix variations): two rows of buildings with lit windows
      [[C.far, .55, .6], [C.near, .38, 1]].forEach(([col, hh, winA]) => {
        let x = 0;
        while (x < w) {
          const bw = w * (.02 + rnd() * .045), bh = h * hh * (.35 + rnd() * .65);
          g.fillStyle = col; g.fillRect(x, base - bh, bw, bh);
          g.fillStyle = C.win; g.globalAlpha = .55 * winA;
          for (let yy = base - bh + 5; yy < base - 4; yy += 7) for (let xx = x + 3; xx < x + bw - 3; xx += 6) if (rnd() < .35) g.fillRect(xx, yy, 2, 3);
          g.globalAlpha = 1;
          x += bw + (L.scene === 'harbor' ? w * .02 * rnd() : 1);
        }
      });
      if (L.scene === 'harbor') {                            // cranes over the water
        g.strokeStyle = C.amber; g.lineWidth = 2; g.globalAlpha = .8;
        for (let i = 0; i < 3; i++) { const x = w * (.2 + i * .3); g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - h * .6); g.lineTo(x + w * .1, base - h * .6); g.moveTo(x - w * .03, base - h * .6); g.lineTo(x, base - h * .6); g.stroke(); }
        g.globalAlpha = 1;
      }
      if (L.scene === 'grandprix') {                        // grandstand lights
        g.fillStyle = C.white; for (let i = 0; i < 40; i++) { g.globalAlpha = .4 + rnd() * .5; g.fillRect(rnd() * w, base - h * (.05 + rnd() * .12), 2, 2); }
        g.globalAlpha = 1;
      }
    }
    return off;
  }
  function skyGradient() {
    const low = G.L.sky === 'night' ? C.night : G.L.sky === 'dusk' ? C.dusk : C.skyLow;
    const g = cx.createLinearGradient(0, 0, 0, HOR());
    g.addColorStop(0, C.skyTop); g.addColorStop(.55, C.skyMid); g.addColorStop(1, low);
    return g;
  }
  // world: 1 unit = one second at full speed. The road is drawn in bands from near to far.
  const SEG = 0.35, ZN = 1, ZF = 34, CAM = 1.1;
  const curveAt = w => (reduced.matches ? .5 : 1) * (Math.sin(w * .09 + G.lv) * .9 + Math.sin(w * .031) * .6);
  const tunnelAt = (lapFrac) => G.L.tunnels && lapFrac > .28 && lapFrac < .72;
  function render(now) {
    if (!W) resize();
    const hor = HOR(), bot = H;
    const cam = G.world * 6, curve = curveAt(G.world);
    const lapFrac = G.phase === 'pit' ? 0 : G.dist / G.lens[G.lap];
    const inTunnel = G.phase === 'race' && tunnelAt(lapFrac);
    const light = inTunnel ? (S.state === 'on' ? .25 + .75 * S.I : .15) : 1;
    // sky, sun or moon, skyline
    cx.fillStyle = skyGradient(); cx.fillRect(0, 0, W, hor + 1);
    const night = G.L.sky === 'night';
    if (night) {
      cx.fillStyle = C.star;
      for (let i = 0; i < 40; i++) { cx.globalAlpha = .3 + (i % 5) / 8; cx.fillRect((i * 173) % W, (i * 53 % 100) / 100 * hor * .7, 1.5, 1.5); }
      cx.globalAlpha = 1; cx.fillStyle = C.moon; cx.beginPath(); cx.arc(W * .72, hor * .32, Math.min(W, H) * .05, 0, Math.PI * 2); cx.fill();
    } else {
      const sr = Math.min(W * .16, hor * .62), sx = W / 2 - curve * W * .04, sy = hor - sr * .15;
      const sg = cx.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, C.sun1); sg.addColorStop(1, C.sun2);
      cx.save(); cx.beginPath(); cx.arc(sx, sy, sr, 0, Math.PI * 2); cx.clip();
      cx.fillStyle = sg; cx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      cx.fillStyle = skyGradient();                          // synthwave stripes across the lower sun
      for (let i = 0; i < 6; i++) { const y = sy - sr * .1 + i * sr * .16; cx.fillRect(sx - sr, y, sr * 2, 1.5 + i * 1.3); }
      cx.restore();
    }
    if (scenery) cx.drawImage(scenery, -W * .15 - curve * W * .05, hor - scenery.height + 1, scenery.width, scenery.height);
    // the ground and its glowing grid
    cx.fillStyle = G.L.scene === 'river' || G.L.scene === 'harbor' ? C.water : C.ground;
    cx.fillRect(0, hor, W, bot - hor);
    cx.strokeStyle = C.grid; cx.lineWidth = 1;
    for (let k = 1; k < 16; k++) {                            // horizontal grid lines, rushing toward you
      const z = ZF / (k + ((cam / 4) % 1));
      const y = hor + (bot - hor) * CAM / z * 3.2; if (y > bot) continue;
      cx.globalAlpha = .12 + .35 * (1 - z / ZF); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
    }
    cx.globalAlpha = .22;
    for (let k = -12; k <= 12; k++) { cx.beginPath(); cx.moveTo(W / 2 + k * W * .012 - curve * W * .04, hor); cx.lineTo(W / 2 + k * W * .16, bot); cx.stroke(); }
    cx.globalAlpha = 1;
    // the road, far to near
    // a point z seconds up the road: its screen row, the road's half-width there, and its center (the road bends toward the horizon)
    const proj = z => ({y: hor + (bot - hor) * CAM / z * .95, w: W * .62 / z * ZN, x: W / 2 + curve * W * .35 * Math.pow(1 - ZN / z, 2)});
    const bands = 60;
    let prev = null;
    for (let i = bands; i >= 0; i--) {
      const z = ZN + (ZF - ZN) * Math.pow(i / bands, 1.8);
      const p = proj(z);
      if (prev) {
        const stripe = Math.floor((z + cam) / SEG) % 2 === 0;
        quad(prev, p, 1.12, stripe ? C.pink : C.cyan, .9);                 // rumble strips
        quad(prev, p, 1, stripe ? C.road : C.road2, 1);                    // the road
        if (stripe) { quad(prev, p, .025, C.lane, .8, -.34); quad(prev, p, .025, C.lane, .8, .34); }   // lane dashes
      }
      prev = p;
    }
    // tunnels: dark, with arches that light up while you're in tune
    if (inTunnel) {
      cx.fillStyle = C.tunnel; cx.globalAlpha = .88 * (1 - light * .55); cx.fillRect(0, 0, W, H); cx.globalAlpha = 1;
      for (let k = 1; k < 9; k++) {
        const z = ZF / (k + ((cam / 3) % 1)) * .7 + ZN; const p = proj(z);
        const hw = p.w * .95, top = p.y - hw * 1.1;
        cx.strokeStyle = C.cyan; cx.globalAlpha = (.15 + .85 * light) * (1 - z / ZF); cx.lineWidth = Math.max(1, 6 / z);
        cx.strokeRect(p.x - hw, top, hw * 2, p.y - top);
      }
      cx.globalAlpha = 1;
    }
    // the other cars (ahead of you, up the road), far first; the ghost car is see-through
    const me = progress(), cars = [];
    const toDist = pr => { const i = Math.min(G.lens.length - 1, Math.floor(pr)); return G.lens.slice(0, i).reduce((a, b) => a + b, 0) + (pr - i) * G.lens[i]; };
    const myD = toDist(me);
    if (G.phase !== 'count') G.rivals.forEach(r => cars.push({d: toDist(paceProgress(r.pace, G.clock)) - myD, lane: r.lane, color: C[r.color] || C.cyan, name: r.name}));
    const gp = G.phase !== 'count' ? ghostProgress(G.clock) : null;
    if (gp !== null) cars.push({d: toDist(gp) - myD, lane: .35, color: C.white, ghost: true, name: 'Best run'});
    if (G.phase === 'count') G.rivals.forEach((r, i) => cars.push({d: .45 + i * .25, lane: r.lane, color: C[r.color] || C.cyan}));
    cars.filter(c => c.d > .05 && c.d < 7).sort((a, b) => b.d - a.d).forEach(c => {
      const z = ZN + c.d * 4.4; const p = proj(z);
      drawCar(p.x + c.lane * p.w * .5, p.y, p.w * .42, c.color, {ghost: c.ghost});
    });
    // your car, from behind
    const sway = reduced.matches ? 0 : -curve * W * .02;
    const col = carColor();
    drawCar(W / 2 + sway, bot - H * .04, Math.min(W * .24, H * .42), col.body, {tail: true, nitro: G.nitro && G.phase === 'race', stripes: col.stripes, me: true, braking: S.state === 'wrong'});
    // nitro speed lines (not with reduced motion)
    if (G.nitro && !reduced.matches) {                       // short streaks rushing past the sides of the road
      cx.strokeStyle = C.nitro; cx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1, k = ((now / 700 + i * .37) % 1), x0 = W / 2 + side * W * (.18 + (i % 3) * .07);
        const y = hor + (bot - hor) * k * k, x = x0 + side * W * .35 * k * k, len = 10 + 50 * k;
        cx.globalAlpha = .15 + .45 * k; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + side * len * .9, y + len * .5); cx.stroke();
      }
      cx.globalAlpha = 1;
    }
  }
  /** one band of the road between two projected rows: `k` = its width (share of the road), `off` = its center offset */
  function quad(a, b, k, col, alpha, off = 0) {
    cx.fillStyle = col; cx.globalAlpha = alpha; cx.beginPath();
    cx.moveTo(a.x + (off - k) * a.w, a.y); cx.lineTo(a.x + (off + k) * a.w, a.y);
    cx.lineTo(b.x + (off + k) * b.w, b.y); cx.lineTo(b.x + (off - k) * b.w, b.y);
    cx.closePath(); cx.fill(); cx.globalAlpha = 1;
  }
  /** a car from behind: x = center, y = where it touches the road, w = its width */
  function drawCar(x, y, w, color, {ghost, tail, nitro, stripes, braking} = {}) {
    const h = w * .42;
    cx.save();
    cx.globalAlpha = ghost ? .38 : 1;
    cx.fillStyle = C.tire; cx.fillRect(x - w * .48, y - h * .32, w * .16, h * .32); cx.fillRect(x + w * .32, y - h * .32, w * .16, h * .32);   // tires
    cx.fillStyle = color; cx.beginPath();                    // the body
    cx.moveTo(x - w * .5, y - h * .18); cx.lineTo(x - w * .46, y - h * .62); cx.lineTo(x - w * .3, y - h * .74);
    cx.lineTo(x + w * .3, y - h * .74); cx.lineTo(x + w * .46, y - h * .62); cx.lineTo(x + w * .5, y - h * .18); cx.closePath(); cx.fill();
    cx.beginPath();                                          // the cabin
    cx.moveTo(x - w * .3, y - h * .74); cx.lineTo(x - w * .22, y - h * 1.08); cx.lineTo(x + w * .22, y - h * 1.08); cx.lineTo(x + w * .3, y - h * .74); cx.closePath(); cx.fill();
    cx.fillStyle = C.glass; cx.beginPath();                  // the rear window
    cx.moveTo(x - w * .25, y - h * .77); cx.lineTo(x - w * .19, y - h * 1.02); cx.lineTo(x + w * .19, y - h * 1.02); cx.lineTo(x + w * .25, y - h * .77); cx.closePath(); cx.fill();
    if (stripes) { cx.fillStyle = C.white; cx.globalAlpha = ghost ? .3 : .85; cx.fillRect(x - w * .09, y - h * 1.08, w * .06, h * .9); cx.fillRect(x + w * .03, y - h * 1.08, w * .06, h * .9); cx.globalAlpha = ghost ? .38 : 1; }
    cx.fillStyle = C.tire; cx.fillRect(x - w * .4, y - h * .36, w * .8, h * .1);   // the bumper line
    cx.fillStyle = braking ? C.white : C.tail;               // tail lights (flare white while braking)
    cx.fillRect(x - w * .44, y - h * .56, w * .22, h * .1); cx.fillRect(x + w * .22, y - h * .56, w * .22, h * .1);
    if (tail) { cx.globalAlpha = .25; cx.fillRect(x - w * .48, y - h * .62, w * .3, h * .22); cx.fillRect(x + w * .18, y - h * .62, w * .3, h * .22); cx.globalAlpha = 1; }
    cx.fillStyle = color; cx.fillRect(x - w * .42, y - h * .82, w * .84, h * .06);   // the spoiler
    if (nitro) {                                             // nitro flames from the exhausts
      cx.fillStyle = C.nitro; cx.globalAlpha = .85;
      [-.18, .18].forEach(k => { cx.beginPath(); cx.moveTo(x + k * w - w * .04, y - h * .2); cx.lineTo(x + k * w, y + h * (.25 + (reduced.matches ? 0 : Math.random() * .2))); cx.lineTo(x + k * w + w * .04, y - h * .2); cx.closePath(); cx.fill(); });
    }
    cx.restore();
  }
  /** the car's color: the equipped color skin's (shared/skins.js), else the instrument's own color */
  function carColor() {
    let body = css('pt-' + who) || C.pink, stripes = false;
    const eq = A.Skins && A.Skins.equipped(who), sk = eq && A.Skins.LIST.find(s => s.id === eq.color);
    if (sk && sk.id !== 'classic' && sk.look && sk.look.colors) body = css(sk.look.colors[0] === 'white' ? 'white-hi' : sk.look.colors[0]) || body;
    if (sk && sk.look && sk.look.stripes) stripes = true;
    return {body, stripes};
  }

  /* ---------- results ---------- */
  let finished = null;
  function results(g) {
    cancelAnimationFrame(raf); raf = 0;
    const total = g.clock, pos = 1 + g.rivals.filter(r => paceFinish(r.pace) < total).length, last = g.rivals.length + 1;
    const stars = pos === 1 ? 3 : pos === 2 ? 2 : pos === 3 && last > 3 ? 1 : 0;
    const key = picker.state.progressKey, rk = recKey(g.lv);
    const old = A.store.level(key, who, g.lv), tenths = Math.round(total * 10);
    const newBest = !old.best || tenths < old.best;
    A.store.setLevel(key, who, g.lv, {stars: Math.max(stars, old.stars), best: old.best ? Math.min(old.best, tenths) : tenths});
    // the ghost car = your best run on this track, mode and instrument; best lap too
    gd.ghosts = gd.ghosts || {}; gd.bestLap = gd.bestLap || {};
    if (!gd.ghosts[rk] || total < gd.ghosts[rk].t) gd.ghosts[rk] = {t: +total.toFixed(2), p: g.ghostRec};
    const bestLap = Math.min(...g.lapTimes), oldLap = gd.bestLap[rk], newLap = !oldLap || bestLap < oldLap - 0.05;
    if (newLap) gd.bestLap[rk] = +bestLap.toFixed(2);
    if (pos === 1 && g.diff.id === 'virtuoso') (gd.achievements = gd.achievements || {})['virtuoso-win'] = true;   // the Helmet skin
    save();
    // the numbers
    const n = g.laps.reduce((a, l) => a + l.n, 0), avg = n ? g.laps.reduce((a, l) => a + l.abs, 0) / n : 0;
    $('resPos').textContent = `${ord(pos)} place`;
    $('resPos').className = 'res-pos p' + pos;
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = pos === 1 ? 'Race won!' : stars ? 'On the podium!' : 'Race finished';
    $('resMsg').textContent = pos === 1 ? (g.lv < TRACKS.length ? `You won ${g.L.name}! The next track is open.` : 'You won The Grand Prix!')
      : `Finish 1st to open the next track. Faster = more in tune and steadier, and fewer breaths in the middle of a lap.`;
    $('resTime').textContent = fmt(total);
    $('resLap').textContent = `${bestLap.toFixed(1)} s`;
    $('resCents').textContent = n ? `${Math.round(avg)}¢` : '–';
    $('resZone').textContent = `${Math.round(g.driveTime ? g.zoneTime / g.driveTime * 100 : 0)}%`;
    $('resDiff').textContent = `${g.diff.name} (±${g.diff.tol}¢)`;
    chart(g);
    $('resBest').textContent = [newBest && old.best ? 'New best time!' : '', newLap && oldLap ? `New best lap: ${bestLap.toFixed(1)} s!` : ''].filter(Boolean).join(' ');
    const hasNext = g.lv < TRACKS.length && (pos === 1 || A.DEMO);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));     // skins earned by this result (shared/skins.js)
    (hasNext ? $('resNext') : $('resRetry')).focus();
    A.Sfx.sequence([pos <= 3 && stars ? 'podium' : 'level-failed', stars > old.stars && 'star-earned', newLap && oldLap && 'new-best-lap']);
    finished = g; G = null;
  }
  /* the per-lap tuning chart: each lap's average (above = sharp, below = flat) with the in-tune band for this difficulty */
  function chart(g) {
    const w = 340, h = 170, top = 18, mid = 82, sc = 55 / 40, n = g.laps.length, bw = Math.min(34, (w - 50) / n * .6);
    const y = c => mid - clamp(c, -40, 40) * sc, tol = g.diff.tol;
    let out = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Average tuning for each lap">` +
      `<rect class="c-band" x="36" y="${y(tol)}" width="${w - 40}" height="${y(-tol) - y(tol)}"/>` +
      `<line class="c-zero" x1="36" x2="${w - 4}" y1="${mid}" y2="${mid}"/>` +
      [40, 20, -20, -40].map(c => `<text class="c-ax" x="30" y="${y(c) + 4}" text-anchor="end">${c > 0 ? '+' : ''}${c}</text>`).join('') +
      `<text class="c-ax" x="30" y="${mid + 4}" text-anchor="end">0</text>` +
      `<text class="c-side" x="${w - 6}" y="${top - 4}" text-anchor="end">sharp ♯</text><text class="c-side" x="${w - 6}" y="${h - 36}" text-anchor="end">flat ♭</text>`;
    const lines = [];
    g.laps.forEach((l, i) => {
      const it = g.items[i], x = 36 + (i + .5) * (w - 40) / n;
      if (!l.n) { out += `<text class="c-lbl" x="${x}" y="${mid + 4}" text-anchor="middle">–</text>`; }
      else {
        const m = l.sum / l.n, cls = Math.abs(m) <= tol ? 'ok' : m > 0 ? 'sharp' : 'flat';
        const y0 = Math.min(y(m), mid), hh = Math.max(2, Math.abs(y(m) - mid));
        out += `<rect class="c-bar ${cls}" x="${x - bw / 2}" y="${y0}" width="${bw}" height="${hh}" rx="3"/>` +
          `<text class="c-val" x="${x}" y="${m >= 0 ? y0 - 4 : y0 + hh + 12}" text-anchor="middle">${signed(m).replace('¢', '')}</text>`;
        lines.push(`<li class="${cls}"><b>Lap ${i + 1} (${it.label}):</b> ${Math.abs(m) <= tol ? `in tune on average (${signed(m)})` : `${Math.round(Math.abs(m))}¢ ${m > 0 ? 'sharp' : 'flat'} on average`}, ${g.lapTimes[i] ? g.lapTimes[i].toFixed(1) + ' s' : ''}${l.zone >= .5 ? `, ${l.zone.toFixed(1)} s in the zone` : ''}</li>`);
      }
      out += `<text class="c-note" x="${x}" y="${h - 18}" text-anchor="middle">${it.label}</text><text class="c-lap" x="${x}" y="${h - 4}" text-anchor="middle">L${i + 1}</text>`;
    });
    $('resChart').innerHTML = out + '</svg>';
    $('resLaps').innerHTML = lines.join('') || '<li>No notes were heard on target this race.</li>';
  }
  $('resNext').addEventListener('click', () => A.requireMic(() => startRace(finished.lv + 1)));
  $('resRetry').addEventListener('click', () => A.requireMic(() => startRace(finished.lv)));
  $('resTracks').addEventListener('click', showHub);
  $('quitRace').addEventListener('click', showHub);
  document.addEventListener('visibilitychange', () => { lastT = performance.now(); });

  A.Speedway = {debug: () => G, hearing: () => S, rules: R};    // tests
  showHub();
})(window.Arcade);
