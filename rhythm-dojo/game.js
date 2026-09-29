/* Rhythm Dojo: read a rhythm on a one-line percussion staff (shared/rhythm-staff.js) with Mr. Graham's counting
   underneath (shared/counting.js), then PERFORM it: CLAP (the microphone hears claps as sharp onsets:
   shared/onsets.js, never pitch), TAP (a big drum pad or Space) or SNARE (the microphone, like CLAP).
   The counting fades as the level goes on (the Counting setting: SHOW / AUTO / HIDE).
     levels.js   RD_LEVELS (the levels), RD_RULES (judging windows, stars, the timing check), RD_MARATHON (endless)
   A ROUND: the rhythm shows (study) → HEAR IT (optional: the woodblock over a click, a playhead, each syllable lights as
   it sounds; the microphone is NOT listening) → PERFORM: "Ready!" (rd-count-in), a one-measure count-in (clicks + big
   1 2 3 4), then a moving playhead and a pulse light on every beat (smooth, ≤ 3 a second). CLAP/SNARE: no clicks after
   the count-in (the microphone listens; HEADPHONES mode, after the headphones check, keeps clicking). TAP: the clicks
   keep going; a tap counts on pointerdown / Space keydown, and letting go never matters.
   NOTHING IS HELD in any mode (a clap, a tap or a snare hit can't sustain): a note is judged only by when it starts;
   the student SAYS the small underlined counts of a long note while waiting for the next one.
   JUDGING: each attack against its note after the timing check's offset: PERFECT / GOOD / OK / EARLY / LATE / MISS,
   an attack far from every note (a rest, or one too many) = EXTRA. Then the FEEDBACK: the counting again with every
   syllable colored (green on time, yellow early/late, red missed/extra) and a one-line tip; TRY AGAIN / NEXT.
   CLOCK: everything is scheduled on the arcade's AudioContext and judged in AUDIBLE time (shared/calibration.js).
   Progress: setLevel('rhythm-dojo', 'all', level, {stars, best}) (games.js player: 'all'); SLOW gives no stars.
   DOJO MARATHON (the Endless card): shared/endless.js Top 5 per performing mode ('clap' | 'tap' | 'snare'). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'rhythm-dojo';
  const LEVELS = window.RD_LEVELS, R = window.RD_RULES, MAR = window.RD_MARATHON, C = A.Counting, RS = A.RhythmStaff;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const RM = A.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)');

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Hands & Drum'});
  $('demoHelp').hidden = !A.DEMO;
  A.Sfx.use('endless');

  /* ---------- saved choices: gameData('rhythm-dojo') = {mode, counting, speed, hp, calib: {clap, tap}} ---------- */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };
  const opt = {mode: ['clap', 'tap', 'snare'].includes(gd().mode) ? gd().mode : 'clap',
    counting: ['show', 'auto', 'hide'].includes(gd().counting) ? gd().counting : 'auto',
    speed: gd().speed === 'slow' ? 'slow' : 'normal', hp: !!gd().hp};
  const micMode = () => opt.mode !== 'tap';
  const calKey = () => micMode() ? 'clap' : 'tap';          // the snare is heard by the same microphone as claps
  const calib = () => (gd().calib || {})[calKey()];
  const lagMs = () => { const c = calib(); return c && typeof c.ms === 'number' ? c.ms : R.defaultLag[calKey()]; };
  const VERB = {clap: 'Clap it!', tap: 'Tap it!', snare: 'Play it!'};
  const BELTS = A.BELTS;
  const beltOf = lv => BELTS[Math.min(BELTS.length - 1, lv - 1)];

  /* ================= SOUND: the click and the woodblock (music-highway/backing.js's kit, on the audio clock) ================= */
  const CLK = A.AudioClock.create();
  const bufs = {click: null, block: null};
  const loadBufs = () => {
    if (!A.Sfx.buffer) return;
    if (!bufs.click) Promise.resolve(A.Sfx.buffer('rd-click')).then(b => { if (b) bufs.click = b; }).catch(() => {});
    if (!bufs.block) Promise.resolve(A.Sfx.buffer('rd-woodblock')).then(b => { if (b) bufs.block = b; }).catch(() => {});
  };
  addEventListener('pointerdown', loadBufs, true); addEventListener('keydown', loadBufs, true);
  let kit = null;
  function newKit(raw) {
    const o = raw ? A.Sfx.outputRaw && A.Sfx.outputRaw() : A.Sfx.output();
    if (!o) return null;
    return A.MHBacking.create(o.ctx, o.out, {click: bufs.click, block: bufs.block});
  }
  const stopKit = () => { if (kit) { kit.stopAll(); kit = null; } };
  /* the context time heard at perf ms p, and the other way round (tests and scheduling) */
  const perfAt = aud => CLK.ctx ? (aud - CLK.off) * 1000 : aud * 1000 + CLK.p0;

  /* ================= THE SENSEI, THE TAIKO DRUM ================= */
  const senseiBelt = () => G && G.lv ? 'belt-' + beltOf(G.lv).name.toLowerCase() : 'belt-black';
  function sensei(mood) { $('sensei').innerHTML = A.senseiSVG(mood, senseiBelt()); }
  function say(text, mood = 'calm') { sensei(mood); $('say').textContent = text; }
  $('hubSensei').innerHTML = A.senseiSVG('happy', 'belt-black');
  /* THE TAIKO: an original neon drum on a stand; its rim is the PULSE LIGHT (--pulse 0–1, set every frame) */
  $('drum').innerHTML = `<svg viewBox="0 0 160 150" class="taiko">
    <path class="tk-stand" d="M34 146l22-46M126 146l-22-46M44 128h72"/>
    <ellipse class="tk-glow" cx="80" cy="62" rx="70" ry="52"/>
    <path class="tk-body" d="M22 30q58-22 116 0v64q-58 22-116 0z"/>
    <path class="tk-band" d="M22 42q58-20 116 0M22 82q58 20 116 0"/>
    <g class="tk-studs">${[34, 56, 80, 104, 126].map((x, i) => `<circle cx="${x}" cy="${[37, 32, 30, 32, 37][i]}" r="2.4"/><circle cx="${x}" cy="${[88, 93, 95, 93, 88][i]}" r="2.4"/>`).join('')}</g>
    <ellipse class="tk-head" cx="80" cy="30" rx="58" ry="14"/>
    <ellipse class="tk-mon" cx="80" cy="30" rx="16" ry="4.2"/>
  </svg>`;
  function strike() {
    const d = $('drum');
    d.classList.remove('hit'); void d.getBoundingClientRect(); d.classList.add('hit');
  }

  /* ================= BUILDING A RHYTHM ================= */
  const rnd = n => Math.floor(Math.random() * n);
  /* join one-measure cells with bar lines; `tie` = the chance of tying a measure's last note to the next one's first */
  function joinCells(cells, tie) {
    const ms = cells.map(c => c.trim().split(/\s+/));
    for (let k = 0; k + 1 < ms.length; k++) {
      const last = ms[k][ms[k].length - 1], first = ms[k + 1][0];
      // only between plain notes an eighth or longer (never a rest, a triplet or a sixteenth)
      if (tie && Math.random() < tie && /^[whqe]\.?$/.test(last) && /^[whqe]\.?$/.test(first)) ms[k][ms[k].length - 1] = last + '_';
    }
    return ms.map(m => m.join(' ')).join(' | ');
  }
  function pickCells(pool, n, avoid) {
    for (let tries = 0; tries < 12; tries++) {
      const out = [];
      for (let k = 0; k < n; k++) {
        let c; do { c = pool[rnd(pool.length)]; } while (pool.length > 1 && c === out[out.length - 1]);
        out.push(c);
      }
      if (!(avoid instanceof Set ? avoid.has(out.join('|')) : out.join('|') === avoid)) return out;
    }
    return [pool[0]];
  }
  const cellsFor = (L, time) => Array.isArray(L.cells) ? L.cells : L.cells[time];
  /** round r (0-based) of level L: {text, time} */
  function levelRhythm(L, r, avoid) {
    const times = [].concat(L.time), time = times[r % times.length];
    const [m0, m1] = L.measures, n = Math.round(m0 + (m1 - m0) * (L.rounds > 1 ? r / (L.rounds - 1) : 0));
    const cells = pickCells(cellsFor(L, time), n, avoid);
    return {text: joinCells(cells, L.tieAcross || 0), time, key: cells.join('|')};
  }

  /* ================= THE LEVEL SELECT ================= */
  const prog = lv => A.store.level(GAME_ID, 'all', lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0 || prog(i + 1).stars > 0;
  function drawOpts() {
    $('modeSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === opt.mode)));
    $('countSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.count === opt.counting)));
    $('speedSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.speed === opt.speed)));
    $('hpBtn').hidden = !micMode();
    $('hpBtn').textContent = `🎧 Headphones: ${opt.hp ? 'on' : 'off'}`;
    $('hpBtn').setAttribute('aria-pressed', String(opt.hp));
    const c = calib();
    $('optNote').textContent = (opt.mode === 'tap' ? 'Tap the big drum pad or press Space on each note.'
      : opt.mode === 'snare' ? 'Play the rhythm on your snare. The microphone listens for each hit.'
      : 'Clap the rhythm. The microphone listens for each clap (nothing is recorded).') +
      (c ? ` Timing check: ${c.ms} ms.` : ' Do the timing check once on this device.') + (opt.speed === 'slow' ? ' SLOW: practice speed, no stars.' : '');
  }
  $('modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; opt.mode = b.dataset.mode; save({mode: opt.mode}); A.Sfx.event('ui-toggle'); showHub(); });
  $('countSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; opt.counting = b.dataset.count; save({counting: opt.counting}); A.Sfx.event('ui-toggle'); drawOpts(); });
  $('speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; opt.speed = b.dataset.speed; save({speed: opt.speed}); A.Sfx.event('ui-toggle'); drawOpts(); });
  $('calBtn').addEventListener('click', () => { const go = () => calibrate(); if (micMode()) A.requireMic(go); else go(); });
  $('hpBtn').addEventListener('click', () => {
    if (opt.hp) { opt.hp = false; save({hp: false}); drawOpts(); A.Sfx.event('ui-toggle'); return; }
    A.requireMic(() => headphonesCheck(ok => { opt.hp = ok; save({hp: ok}); drawOpts(); }));
  });
  /* the Counting choice also lives in the shared Settings panel (it makes sense mid-level) */
  A.UI.settings.register(box => {
    box.innerHTML = '<span class="ui-label">Counting under the staff</span><div class="ui-seg" role="group" aria-label="Counting">' +
      ['show', 'auto', 'hide'].map(k => `<button type="button" data-c="${k}" aria-pressed="${opt.counting === k}">${{show: 'Show', auto: 'Auto', hide: 'Hide'}[k]}</button>`).join('') + '</div>';
    box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      opt.counting = b.dataset.c; save({counting: opt.counting});
      box.querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawOpts(); if (G && G.R) applyCounting();
    });
  });

  function showHub() {
    stopAll();
    G = null;
    A.Sfx.gameMenuMusic(GAME_ID);
    A.Pitch.pauseListening(true);
    pause.setActive(false); A.UI.results.hide();
    $('play').hidden = true; $('hub').hidden = false;
    drawOpts();
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = prog(lv), open = unlocked(i), belt = beltOf(lv);
      const times = [].concat(L.time).join(' · ');
      return `<button class="lvl rd-lvl${p.stars ? ' cleared' : ''}" data-l="${lv}" ${open ? '' : 'disabled'} style="--band:var(--belt-${belt.name.toLowerCase()})">
        <span class="n">Level ${lv} · ${esc(belt.name)} belt</span>
        <span class="rd-band" aria-hidden="true"></span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${esc(L.blurb)} ${times} · ♩ = ${L.tempo}${[].concat(L.time).includes('6/8') ? ' (eighths)' : ''}.</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : L.rounds + ' rhythms'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), {gameId: GAME_ID, instKey: opt.mode, setKey: 'marathon', title: 'DOJO MARATHON',
      label: {clap: 'Clapping', tap: 'Tapping', snare: 'Snare'}[opt.mode],
      blurb: 'Rhythm after rhythm, longer and trickier, and the tempo keeps creeping up. A rhythm under 70 % costs a life. 3 lives.',
      onPlay: () => begin('endless')});
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), endless: $('endlessTile'), unlocked,
      label: i => `Level ${i + 1} · ${LEVELS[i].name}`, lockText: i => `Earn a star on ${LEVELS[i - 1].name} to unlock`});
  }

  /* START: the microphone first (clap/snare), then the timing check the first time in this mode */
  function begin(lv) {
    A.UI.results.hide();
    const go = () => {
      const start = () => lv === 'endless' ? startEndless() : startLevel(lv);
      if (!calib()) calibrate(start, {first: true}); else start();
    };
    if (micMode()) A.requireMic(go); else go();
  }

  /* ================= PLAYING ================= */
  let G = null;                                           // the level (or marathon) in progress; G.R = the current round
  const pause = A.UI.pause.mount({
    onPause: () => { if (G) { G.paused = true; abortAttempt(); } },
    onResume: () => { if (G) { G.paused = false; if (G.endless && G.R) setTimeout(() => G && !G.paused && perform(), 500); } },
    onRestart: () => G && (G.endless ? startEndless() : startLevel(G.lv)),
    onLevels: showHub,
    note: 'RESUME starts this rhythm again with a count-in.',
    info: () => G ? (G.endless ? [['Round', G.round + 1], ['Score', G.score]] : [['Rhythm', `${G.r + 1} / ${G.L.rounds}`], ['Score', G.score]]) : [],
  });

  function startLevel(lv) {
    A.LevelSelect.played(lv - 1);
    A.Sfx.gameMenuMusic(GAME_ID, false);
    const L = LEVELS[lv - 1];
    G = {lv, L, r: -1, best: [], score: 0, roundScore: [], slow: opt.speed === 'slow', hideAll: opt.counting === 'hide', endless: false, seen: new Set()};
    enterPlay();
    $('hudLabel').textContent = `Level ${lv}`;
    $('hudNameT').textContent = L.name;
    $('hudBand').style.setProperty('--band', `var(--belt-${beltOf(lv).name.toLowerCase()})`);
    $('hudCountLabel').textContent = 'Rhythm';
    $('hudLivesBox').hidden = true;
    nextRound();
  }
  function enterPlay() {
    A.UI.results.hide();
    $('hub').hidden = true; $('play').hidden = false;
    $('pad').hidden = opt.mode !== 'tap';
    $('rdGo').textContent = VERB[opt.mode];
    pause.setActive(true);
    window.scrollTo(0, 0);
  }

  function nextRound() {
    G.r++;
    const L = G.L, rh = levelRhythm(L, G.r, G.seen);
    G.seen.add(rh.key);
    const tempo = L.tempo * (G.slow ? R.slowRate : 1);
    setRound(rh.text, rh.time, tempo);
    $('hudCount').textContent = `${G.r + 1} / ${L.rounds}`;
    say(G.r === 0 ? `${L.name}! Read the rhythm and the counting. Tap HEAR IT to listen first, or ${VERB[opt.mode].replace('!', '').toLowerCase()} when you're ready.`
      : G.R.fade === 'hide' ? 'No counting this time. Count it in your head!' : G.R.fade === 'fade' ? 'The counting is fading. You know it!' : 'Read it, count it, then perform it.', 'calm');
  }

  /* the counting's look for this round: show | fade | hide */
  function fadeFor(r) {
    if (opt.counting === 'show') return 'show';
    if (opt.counting === 'hide') return 'hide';
    return r < R.fade[0] ? 'show' : r < R.fade[1] ? 'fade' : 'hide';
  }
  function applyCounting() {
    if (!G || !G.R) return;
    G.R.fade = G.endless ? (opt.counting === 'hide' ? 'hide' : opt.counting === 'show' ? 'show' : G.round < 4 ? 'show' : G.round < 10 ? 'fade' : 'hide') : fadeFor(G.r);
    const s = $('sheet'); s.classList.remove('cnt-show', 'cnt-fade', 'cnt-hide');
    s.classList.add('cnt-' + (G.R.phase === 'feedback' ? 'show' : G.R.fade));
  }

  /* a new rhythm on the sheet */
  function setRound(text, time, tempo) {
    stopAll();
    const p = C.parse(text, time), gs = C.groups(p), M = p.meter;
    const spt = 60 / tempo / M.beat;                                   // seconds per tick (6/8: the tempo counts eighths)
    const targets = gs.filter(g => !g.rest).map(g => ({g: g.g, t: g.t * spt, end: g.end * spt, ticks: g.end - g.t, res: null, d: null}));
    G.R = {text, time, tempo, p, gs, M, spt, targets, total: p.total * spt, phase: 'study', attempts: 0, best: null};
    drawSheet();
    applyCounting();
    $('tip').textContent = ''; $('tip').className = 'rd-tip';
    showButtons('study');
  }
  function drawSheet() {
    const Rd = G.R, wide = $('sheet').clientWidth || innerWidth;
    const per = Rd.p.measures <= 2 ? (wide < 640 ? 1 : 2) : (wide < 640 ? 1 : 2);
    const rows = RS.rows(Rd.p, per);
    Rd.rows = rows.map(([from, to], k) => {
      const E = RS.engrave(Rd.p, {from, to, groups: Rd.gs, id: 'rd' + k, label: `Rhythm, measures ${from + 1} to ${to}`});
      return {E, from, to};
    });
    // every row at the SAME scale: each as wide as its share of the widest row
    $('rows').style.setProperty('--mw', Math.max(...Rd.rows.map(r => r.E.w)));
    $('rows').innerHTML = Rd.rows.map((r, k) => `<div class="rd-row" data-k="${k}" style="--w:${r.E.w}">${r.E.svg}<i class="rd-ph" hidden></i></div>`).join('');
    RS.refine($('rows'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (G && G.R === Rd) RS.refine($('rows')); });
  }
  addEventListener('resize', () => { if (G && G.R && !$('play').hidden && G.R.phase !== 'perform' && G.R.phase !== 'hear') { drawSheet(); applyCounting(); if (G.R.phase === 'feedback') paint(G.R.shown); } });

  function showButtons(phase) {
    const study = phase === 'study', fb = phase === 'feedback';
    $('rdHear').hidden = !(study || fb) || G.endless;
    $('rdGo').hidden = !study;
    $('rdRetry').hidden = !fb || G.endless;
    $('rdNext').hidden = !fb || G.endless;
    $('rdNext').textContent = !G.endless && G.r + 1 >= G.L.rounds ? 'Finish level' : 'Next rhythm';
    $('rdHear').disabled = $('rdGo').disabled = false;
    $('listenLine').hidden = !(phase === 'perform' && micMode());
  }
  $('rdHear').onclick = () => hearIt();
  $('rdGo').onclick = () => perform();
  $('rdRetry').onclick = () => { if (!G) return; G.R.phase = 'study'; clearMarks(); applyCounting(); showButtons('study'); perform(); };
  $('rdNext').onclick = () => { if (!G) return; if (G.r + 1 >= G.L.rounds) finishLevel(); else nextRound(); };

  /* ---------- the timeline of one pass (HEAR IT or PERFORM): count-in, then the rhythm ---------- */
  function timeline(withIn = true) {
    const Rd = G.R, M = Rd.M, beatS = M.beat * Rd.spt;
    const countN = M.compound ? 6 : M.num;                              // 6/8 counts all six eighths in
    CLK.start();
    const t0 = CLK.now() + .25, T0 = t0 + (withIn ? countN * beatS : 0);
    return {t0, T0, beatS, countN, end: T0 + Rd.total};
  }
  function scheduleClicks(k, from, to, beatS, per) {
    if (!k) return [];
    const out = [];
    for (let t = from, i = 0; t < to - 1e-6; t += beatS, i++) { k.click(t, R.clickVol, i % per === 0); out.push(t); }
    return out;
  }

  /* HEAR IT: woodblock over the click; the microphone isn't listening */
  function hearIt() {
    if (!G || !G.R || G.R.phase === 'perform' || G.R.phase === 'hear') return;
    A.Sfx.gameMenuMusic(GAME_ID, false);
    A.Pitch.pauseListening(true);
    clearMarks();
    const Rd = G.R, T = timeline(true);
    Rd.phase = 'hear'; applyCounting();
    kit = newKit(false);
    const per = Rd.M.compound ? 6 : Rd.M.num;
    scheduleClicks(kit, T.t0, T.end, T.beatS, per);
    if (kit) Rd.targets.forEach(x => kit.block(T.T0 + x.t, R.blockVol, false));
    run({T, hear: true});
    say('Listen to the woodblock and follow the counting.', 'calm');
    $('rdHear').disabled = $('rdGo').disabled = true;
  }

  /* PERFORM */
  function perform() {
    if (!G || !G.R || G.paused || G.R.phase === 'perform' || G.R.phase === 'hear') return;
    A.Sfx.gameMenuMusic(GAME_ID, false);
    A.Pitch.pauseListening(true);
    clearMarks();
    const Rd = G.R;
    Rd.phase = 'count'; applyCounting();
    $('rdHear').disabled = $('rdGo').disabled = true;
    $('rdHear').hidden = $('rdRetry').hidden = $('rdNext').hidden = true;
    $('tip').textContent = '';
    const len = A.Sfx.event('rd-count-in') || 0;                       // "Ready!" before the clicks (the mic waits for it)
    const id = Rd.attemptId = (Rd.attemptId || 0) + 1;
    setTimeout(() => { if (G && G.R === Rd && Rd.attemptId === id && !G.paused) go(); }, Math.min(900, len * 1000 + 60));
    function go() {
      const T = timeline(true), per = Rd.M.compound ? 6 : Rd.M.num;
      kit = newKit(false);
      const clicksAll = !micMode() || opt.hp;                          // TAP (no microphone) and headphones: the beat keeps going
      Rd.clicks = scheduleClicks(kit, T.t0, clicksAll ? T.end : T.T0, T.beatS, per);
      Rd.att = {T, attacks: [], lag: lagMs(), bleed: 0, offs: [], down: null};
      Rd.phase = 'perform';
      showButtons('perform');
      if (micMode()) { A.Pitch.pauseListening(false); A.Pitch.ignoreCurrent(); A.Onsets.ensure(); }
      say(opt.mode === 'tap' ? 'Count along… then tap!' : opt.mode === 'snare' ? 'Count along… then play!' : 'Count along… then clap!', 'calm');
      run({T, hear: false});
      if (auto) autoAttempt(T);
    }
  }
  function abortAttempt() {
    stopAll();
    if (G && G.R && (G.R.phase === 'perform' || G.R.phase === 'count' || G.R.phase === 'hear')) {
      G.R.phase = 'study'; G.R.attemptId = (G.R.attemptId || 0) + 1;
      clearMarks(); applyCounting(); showButtons('study');
      say('Ready when you are.', 'calm');
    }
  }
  function stopAll() {
    cancelAnimationFrame(raf); raf = 0;
    stopKit();
    A.Pitch.pauseListening(true);
    $('countBig').textContent = ''; $('countBig').className = 'rd-count';
    document.querySelectorAll('.rd-ph').forEach(e => { e.hidden = true; });
    $('drum').style.setProperty('--pulse', 0);
  }

  /* ---------- THE FRAME LOOP: playhead, lit syllables, the pulse light, the count-in numbers, the end ---------- */
  let raf = 0;
  function run({T, hear}) {
    cancelAnimationFrame(raf);
    const Rd = G.R, rows = Rd.rows, M = Rd.M;
    const litEls = [...$('rows').querySelectorAll('.rc-big, .rc-small')].map(e => ({e, t: +e.dataset.t}));
    const noteEls = [...$('rows').querySelectorAll('.rn')];
    let lastLit = null, lastNum = null;
    const tick = () => {
      if (!G || G.R !== Rd) return;
      CLK.sample();
      const now = CLK.audAt(performance.now()), rel = now - T.T0;
      // the count-in: big numbers on each beat
      if (rel < 0) {
        const k = Math.floor((now - T.t0) / T.beatS);
        const num = k >= 0 ? String(k + 1) : '';
        if (num !== lastNum) { lastNum = num; const c = $('countBig'); c.textContent = num; c.className = 'rd-count' + (num ? ' on' : ''); }
      } else if (lastNum !== '') { lastNum = ''; $('countBig').textContent = ''; $('countBig').className = 'rd-count'; }
      // THE PULSE LIGHT: brightest on each beat, fading smoothly until the next (never more than 1 a beat: ≤ 3 a second)
      const bt = (now - T.t0) / T.beatS, ph = bt - Math.floor(bt);
      const pulse = now < T.t0 || now > T.end + .1 ? 0 : RM.matches ? .6 : Math.exp(-ph * 3.2);
      $('drum').style.setProperty('--pulse', pulse.toFixed(3));
      // playhead + the syllable sounding now
      const tk = rel / Rd.spt;
      rows.forEach((r, k) => {
        const ph2 = $('rows').children[k].querySelector('.rd-ph'), inRow = tk >= r.E.t0 - (k === 0 ? 1e9 : 0) && tk < r.E.t1;
        ph2.hidden = !(inRow && rel >= -T.beatS * .5 && rel <= Rd.total);
        if (!ph2.hidden) ph2.style.left = (r.E.xAt(Math.max(r.E.t0, tk)) / r.E.w * 100).toFixed(2) + '%';
      });
      let cur = null;
      if (rel >= 0 && rel <= Rd.total) for (const x of litEls) if (x.t <= tk + .01 && (!cur || x.t >= cur.t)) cur = x;
      if (cur !== lastLit) { if (lastLit) lastLit.e.classList.remove('lit'); if (cur) cur.e.classList.add('lit'); lastLit = cur; }
      if (hear) noteEls.forEach(n => { const g = Rd.gs[+n.dataset.g]; n.classList.toggle('lit', !!g && !g.rest && rel >= 0 && tk >= g.t && tk < g.end); });
      if (now > T.end + (hear ? .15 : R.lateMs / 1000 + .15)) {
        if (lastLit) lastLit.e.classList.remove('lit');
        noteEls.forEach(n => n.classList.remove('lit'));
        raf = 0;
        return hear ? hearDone() : attemptDone();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function hearDone() {
    stopAll();
    if (!G || !G.R) return;
    G.R.phase = G.R.attempts ? 'feedback' : 'study';
    applyCounting();
    showButtons(G.R.phase);
    if (G.R.phase === 'feedback') paint(G.R.shown);
    say(G.R.attempts ? 'Now you try again!' : `Your turn. ${VERB[opt.mode]}`, 'happy');
  }

  /* ---------- INPUT: claps / snare hits (onsets), taps (the pad, Space) ---------- */
  A.Onsets.listen(o => addAttack(o.time, o.level));
  function addAttack(p, level = null) {
    if (!G || !G.R || G.R.phase !== 'perform' || !G.R.att) return;
    const Rd = G.R, a = Rd.att, aud = CLK.audAt(p) - a.lag / 1000, rel = aud - a.T.T0;
    if (rel < -R.lateMs / 1000) {                                        // the count-in: never a clap, but it teaches the bleed
      // how late the microphone hears our own clicks (speaker + mic delay: it differs from device to device), and how loud
      const d = level != null && Rd.clicks ? nearestClick(Rd, CLK.audAt(p), 0, R.bleedLearnMs) : null;
      if (d != null) { a.offs.push(d); a.bleed = Math.max(a.bleed, level); }
      return;
    }
    // with the clicks still going (headphones), a hit right on a click (as late as the count-in's were heard) must be
    // clearly louder than the clicks were
    if (level != null && a.bleed && Rd.clicks && nearestClick(Rd, CLK.audAt(p), clickLag(a), R.bleedMs) != null && level <= a.bleed * R.bleedK) return;
    a.attacks.push({rel, p, up: null});
    strike();
  }
  /** the heard time's distance (s) to the nearest click played (+ lag), when within ms; else null */
  function nearestClick(Rd, heard, lag, ms) {
    let best = null;
    Rd.clicks.forEach(c => { const d = heard - (c + lag); if (Math.abs(d) * 1000 <= ms && (best == null || Math.abs(d) < Math.abs(best))) best = d; });
    return best;
  }
  /** the median delay the count-in's clicks were heard with (0 before any) */
  function clickLag(a) {
    if (!a.offs.length) return 0;
    const o = a.offs.slice().sort((x, y) => x - y);
    return o[Math.floor(o.length / 2)];
  }
  function tapDown(p) {
    if (opt.mode !== 'tap') return;
    if (G && G.R && G.R.phase === 'perform') {
      addAttack(p);                                                      // only the press counts: letting go is never measured
      if (kit) kit.block(CLK.now(), .55);                                // the pad knocks back (TAP mode: no microphone)
    } else strike();
  }
  const pad = $('pad');
  pad.addEventListener('pointerdown', e => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (_) { /* a pointer the browser no longer tracks: the tap still counts */ } pad.classList.add('down'); tapDown(e.timeStamp || performance.now()); });
  const padUp = () => pad.classList.remove('down');               // the pressed look only
  pad.addEventListener('pointerup', padUp); pad.addEventListener('pointercancel', padUp);
  A.holdGuard && A.holdGuard(pad, {lock: true});
  addEventListener('keydown', e => {
    if (e.key !== ' ' || e.repeat || A.UI.isOpen() || !G || $('play').hidden) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (opt.mode === 'tap') { e.preventDefault(); if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); pad.classList.add('down'); tapDown(performance.now()); }
    else if (A.DEMO && G.R && G.R.phase === 'perform') { e.preventDefault(); A.Onsets.fake(performance.now(), .3); }   // ?demo: Space = a clap
  });
  addEventListener('keyup', e => { if (e.key === ' ' && opt.mode === 'tap' && G) pad.classList.remove('down'); });

  /* ---------- JUDGING ---------- */
  function judge(Rd) {
    const a = Rd.att, tg = Rd.targets.map(x => Object.assign({}, x, {res: null, d: null, a: null}));
    const extras = [];
    a.attacks.filter(x => x.rel <= Rd.total + R.lateMs / 1000).forEach(x => {
      let best = null;
      tg.forEach(t => { if (t.res) return; const d = (x.rel - t.t) * 1000; if (Math.abs(d) <= R.lateMs && (!best || Math.abs(d) < Math.abs(best.d))) best = {t, d}; });
      if (!best) { extras.push(x); return; }
      const t = best.t, d = best.d, ad = Math.abs(d);
      t.d = d; t.a = x;
      t.res = ad <= R.perfectMs ? 'perfect' : ad <= R.goodMs ? 'good' : ad <= R.okMs ? 'ok' : d < 0 ? 'early' : 'late';
    });
    tg.forEach(t => { if (!t.res) t.res = 'miss'; });                 // a note is judged only by when it starts
    const val = t => R.value[t.res] || 0;
    const sum = tg.reduce((s, t) => s + val(t), 0);
    const acc = tg.length + extras.length ? sum / (tg.length + extras.length) : 1;
    const perfects = tg.filter(t => t.res === 'perfect').length;
    const pts = Math.max(0, Math.round(tg.reduce((s, t) => s + 100 * val(t), 0) - 50 * extras.length) * (G.hideAll ? 1 + R.hideBonus : 1));
    return {tg, extras, acc, perfects, pts: Math.round(pts)};
  }

  function attemptDone() {
    stopAll();
    const Rd = G.R;
    const res = judge(Rd);
    Rd.attempts++;
    Rd.phase = 'feedback';
    Rd.shown = res;
    if (!Rd.best || res.acc > Rd.best.acc) Rd.best = res;
    applyCounting();
    paint(res);
    const tip = tipFor(res, Rd);
    $('tip').textContent = tip.text; $('tip').className = 'rd-tip ' + tip.kind;
    const pct = Math.round(res.acc * 100);
    if (G.endless) return marathonRound(res);
    // the level's score: each rhythm's best attempt
    G.roundScore[G.r] = Math.max(G.roundScore[G.r] || 0, res.pts);
    G.best[G.r] = Math.max(G.best[G.r] || 0, res.acc);
    G.score = G.roundScore.reduce((s, x) => s + (x || 0), 0);
    $('hudScore').textContent = G.score;
    say(pct >= 95 ? `${pct}%! Right on the beat!` : pct >= 80 ? `${pct}%. Very good! One more time for a perfect one?` : pct >= 60 ? `${pct}%. Good work. Check the colors.` : `${pct}%. Let's look at the counting and try again.`,
      pct >= 80 ? 'happy' : pct >= 60 ? 'calm' : 'hmm');
    showButtons('feedback');
    A.Sfx.event(res.acc >= .95 ? 'rd-perfect' : res.acc < .6 ? 'rd-miss' : 'note-hit');
    $('rdNext').focus({preventScroll: true});
  }

  /* THE FEEDBACK COLORS: every counting group (and its note) green / yellow / red; an
     EXTRA inside a rest = the rest red, inside a long note = its small (counted, not played) syllables red */
  function clearMarks() {
    $('rows').querySelectorAll('.rc, .rn').forEach(e => e.classList.remove('ok', 'near', 'bad', 'extra', 'lit'));
  }
  function paint(res) {
    if (!res) return;
    clearMarks();
    const Rd = G.R, cls = {perfect: 'ok', good: 'ok', ok: 'near', early: 'near', late: 'near', miss: 'bad'};
    const mark = (g, c) => $('rows').querySelectorAll(`.rc[data-g="${g}"], .rn[data-g="${g}"]`).forEach(e => e.classList.add(c));
    res.tg.forEach(t => mark(t.g, cls[t.res]));
    Rd.gs.filter(g => g.rest).forEach(g => mark(g.g, 'ok'));
    res.extras.forEach(x => {
      const tick = x.rel / Rd.spt + 1, g = Rd.gs.find(g => tick >= g.t && tick < g.end) || Rd.gs[Rd.gs.length - 1];   // (+1 tick: right on a rest's start is in the rest)
      if (!g) return;
      if (g.rest) { $('rows').querySelectorAll(`.rc[data-g="${g.g}"], .rn[data-g="${g.g}"]`).forEach(e => e.classList.remove('ok')); mark(g.g, 'bad'); }
      else mark(g.g, 'extra');
    });
  }

  /* THE TIP: one line, the most useful thing to hear */
  function where(tick, M) {
    const s = C.syllable(tick, M), beat = Math.floor((((tick % M.per) + M.per) % M.per) / M.beat) + 1;
    return /^\d+$/.test(s) ? `beat ${s}` : `the ${s} of ${beat}`;
  }
  function tipFor(res, Rd) {
    const M = Rd.M, gT = g => Rd.gs[g].t;
    const restExtra = res.extras.map(x => ({x, g: Rd.gs.find(g => x.rel / Rd.spt + 1 >= g.t && x.rel / Rd.spt + 1 < g.end)})).find(o => o.g && o.g.rest);
    if (restExtra) return {kind: 'bad', text: `Shh! ${where(restExtra.g.t, M).replace(/^./, c => c.toUpperCase())} is a rest. Count it, don't ${opt.mode === 'tap' ? 'tap' : opt.mode === 'snare' ? 'play' : 'clap'} it.`};
    const miss = res.tg.find(t => t.res === 'miss');
    if (miss) return {kind: 'bad', text: `You missed ${where(gT(miss.g), M)}. Say the counting out loud!`};
    if (res.extras.length) return {kind: 'bad', text: `One ${opt.mode === 'tap' ? 'tap' : opt.mode === 'snare' ? 'hit' : 'clap'} too many. Each note gets just one!`};
    const off = res.tg.filter(t => t.d != null && Math.abs(t.d) > R.goodMs).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    if (off) return off.d < 0 ? {kind: 'near', text: `You rushed ${where(gT(off.g), M)}! Wait for it.`} : {kind: 'near', text: `You dragged ${where(gT(off.g), M)}. Stay with the pulse!`};
    const mean = res.tg.filter(t => t.d != null).reduce((s, t, _, arr) => s + t.d / arr.length, 0);
    if (mean < -45) return {kind: 'near', text: 'A little early overall. Relax and let the beat come to you.'};
    if (mean > 45) return {kind: 'near', text: 'A little late overall. Feel the pulse and move with it.'};
    return {kind: 'ok', text: 'Right on the beat! Beautiful rhythm.'};
  }

  /* ================= THE LEVEL'S RESULTS ================= */
  function finishLevel() {
    stopAll();
    const {lv, L} = G;
    const acc = L.rounds ? G.best.reduce((s, x) => s + (x || 0), 0) / L.rounds : 0;
    const stars = G.slow ? 0 : acc >= R.threeStar ? 3 : acc >= R.twoStar ? 2 : acc >= R.oneStar ? 1 : 0;
    const old = prog(lv);
    if (!G.slow) A.store.setLevel(GAME_ID, 'all', lv, {stars: Math.max(stars, old.stars), best: Math.max(G.score, old.best)}, stars);
    const hasNext = lv < LEVELS.length && (stars > 0 || old.stars > 0 || A.DEMO);
    const pct = Math.round(acc * 100);
    pause.setActive(false);
    A.UI.results.show({gameId: GAME_ID, stars: G.slow ? null : stars,
      hero: `<div class="rd-res-hero">${A.senseiSVG(stars ? 'present' : 'hmm', 'belt-' + beltOf(lv).name.toLowerCase())}</div>`,
      kicker: `Level ${lv} · ${beltOf(lv).name} belt`,
      title: G.slow ? 'Practice complete!' : stars === 3 ? 'Perfect rhythm!' : stars ? 'Level cleared' : 'So close',
      msg: G.slow ? 'SLOW is for practice: play it at Normal speed to earn stars.'
        : stars === 3 ? 'Every rhythm right on the beat.' : stars === 2 ? `Get ${Math.round(R.threeStar * 100)} % for 3 stars.`
        : stars === 1 ? `Get ${Math.round(R.twoStar * 100)} % for 2 stars.` : `You need ${Math.round(R.oneStar * 100)} % to clear this level.`,
      tiles: [['Accuracy', pct + '%'], ['Rhythms', L.rounds], ['Score', G.score]],
      newBest: !G.slow && G.score > old.best && old.best > 0, best: old.best ? `Best: ${Math.max(G.score, old.best)}` : '',
      next: {label: 'Next level', hidden: !hasNext, onClick: () => begin(lv + 1)},
      retry: {label: 'Try again', onClick: () => begin(lv)},
      levels: {label: 'Levels', onClick: showHub}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Sfx.sequence([stars ? 'rd-level-clear' : 'level-failed', !G.slow && stars > old.stars && 'star-earned', !G.slow && G.score > old.best && old.best > 0 && 'new-high-score']);
  }

  /* ================= DOJO MARATHON ================= */
  function startEndless() {
    A.Sfx.gameMenuMusic(GAME_ID, false);
    A.LevelSelect.played('endless');
    G = {endless: true, round: -1, lives: MAR.lives, score: 0, notes: 0, perfectRounds: 0, topTempo: 0, last: '', hideAll: opt.counting === 'hide', slow: false};
    enterPlay();
    $('hudLabel').textContent = '∞ Dojo Marathon';
    $('hudNameT').textContent = {clap: 'Clapping', tap: 'Tapping', snare: 'Snare'}[opt.mode];
    $('hudBand').style.setProperty('--band', 'var(--belt-black)');
    $('hudCountLabel').textContent = 'Round';
    $('hudLivesBox').hidden = false;
    $('hudScore').textContent = '0';
    A.Sfx.event('endless-start');
    nextMarathon();
  }
  function marathonRhythm(round) {
    const pool = Math.min(LEVELS.length, 1 + Math.floor(round / MAR.poolEvery));
    const L = LEVELS[rnd(pool)];
    const times = [].concat(L.time), time = times[rnd(times.length)];
    const n = MAR.measures.filter(([from]) => round >= from).pop()[1];
    const cells = pickCells(cellsFor(L, time), n, G.last);
    const k = Math.min(1, round / MAR.tempoAt), bpm = MAR.tempo[0] + (MAR.tempo[1] - MAR.tempo[0]) * k;
    const tempo = Math.round(bpm * (time === '6/8' ? 1.65 : 1) * (L.tempo < 80 ? L.tempo / 80 : 1));   // sixteenth levels stay a little slower
    return {text: joinCells(cells, round >= MAR.tieAcrossFrom ? MAR.tieAcross : 0), time, tempo, key: cells.join('|'), bpm: Math.round(bpm)};
  }
  function nextMarathon() {
    if (!G || !G.endless) return;
    G.round++;
    const rh = marathonRhythm(G.round);
    G.last = rh.key; G.topTempo = Math.max(G.topTempo, rh.bpm);
    setRound(rh.text, rh.time, rh.tempo);
    $('hudCount').textContent = String(G.round + 1);
    $('hudLives').innerHTML = A.Endless.hearts(G.lives, MAR.lives);
    say(`Round ${G.round + 1}. Read it… here comes the count-in.`, 'calm');
    const Rd = G.R;
    setTimeout(() => { if (G && G.R === Rd && !G.paused && Rd.phase === 'study') perform(); }, MAR.studyMs);
  }
  function marathonRound(res) {
    const Rd = G.R;
    const perfect = res.tg.every(t => t.res === 'perfect') && !res.extras.length;
    const pts = Math.round(res.pts * (perfect ? MAR.perfectBonus : 1));
    G.score += pts; G.notes += res.tg.filter(t => t.res !== 'miss').length;
    if (perfect) G.perfectRounds++;
    $('hudScore').textContent = G.score;
    const lost = res.acc < MAR.loseBelow;
    if (lost) { G.lives--; A.Sfx.event('endless-life-lost'); }
    $('hudLives').innerHTML = A.Endless.hearts(G.lives, MAR.lives);
    const pct = Math.round(res.acc * 100);
    say(lost ? `${pct}%. That one cost a life. Shake it off!` : perfect ? `${pct}%! Perfect round: double points!` : `${pct}%. On to the next one!`, lost ? 'hmm' : 'happy');
    showButtons('feedback');
    setTimeout(() => {
      if (!G || !G.endless || G.R !== Rd || G.paused) return;
      if (G.lives <= 0) return marathonOver();
      nextMarathon();
    }, 1900);
  }
  function marathonOver() {
    stopAll();
    const run = {score: G.score, notes: G.notes, speed: G.topTempo, combo: G.perfectRounds,
      stats: [['Score', G.score.toLocaleString()], ['Rounds', G.round + 1], ['Top tempo', `♩ = ${G.topTempo}`], ['Perfect rounds', G.perfectRounds]]};
    pause.setActive(false);
    A.Endless.gameOver({gameId: GAME_ID, instKey: opt.mode, setKey: 'marathon', run, title: 'Marathon Over', kicker: 'Dojo Marathon',
      onAgain: () => begin('endless'), onBack: showHub});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
  }

  /* ================= THE TIMING CHECK (shared/calibration.js) ================= */
  let calRun = null;
  function calibrate(done, {first = false} = {}) {
    const P = $('calPanel'), tap = !micMode(), key = calKey();
    $('calTitle').textContent = 'Timing check' + (tap ? ' (tapping)' : ' (clapping)');
    $('calMsg').textContent = (first ? 'First, a quick timing check. ' : '') + `Every microphone, screen and speaker adds a tiny delay. Listen to ${R.calLead} clicks, then ${tap ? 'tap the pad (or press Space)' : 'clap'} on each of the next ${R.calClicks} clicks, right with them.`;
    $('calDots').innerHTML = Array.from({length: R.calLead + R.calClicks}, (_, k) => `<i class="${k < R.calLead ? 'lead' : ''}"></i>`).join('');
    $('calSay').textContent = '';
    $('calPad').hidden = true;
    $('calGo').hidden = false; $('calGo').textContent = 'Start';
    $('calSkip').textContent = first ? 'Skip for now' : 'Cancel';
    P.hidden = false; $('calGo').focus();
    const close = ok => { P.hidden = true; if (calRun) { clearInterval(calRun.timer); if (calRun.kit) calRun.kit.stopAll(); if (calRun.sub) calRun.sub.stop(); } calRun = null; A.Pitch.pauseListening(true); A.Sfx.gameMenuMusic(GAME_ID); drawOpts(); if (done) done(ok); };
    $('calSkip').onclick = () => close(false);
    $('calGo').onclick = () => {
      $('calGo').hidden = true;
      A.Sfx.gameMenuMusic(GAME_ID, false);
      CLK.start();
      const k2 = newKit(true), spb = 60 / R.calBpm, t0 = CLK.now() + .6, n = R.calLead + R.calClicks;
      const clicks = Array.from({length: n}, (_, k) => t0 + k * spb);
      if (k2) clicks.forEach((t, k) => k2.click(t, R.clickVol, k % 4 === 0));
      calRun = {attacks: [], clicks, kit: k2};
      if (tap) { $('calPad').hidden = false; }
      else { A.Pitch.pauseListening(false); A.Onsets.ensure(); calRun.sub = A.Onsets.listen(o => calRun && calRun.attacks.push({time: o.time, level: o.level})); }
      const dots = $('calDots').children;
      calRun.timer = setInterval(() => {
        CLK.sample();
        const now = CLK.audAt(performance.now()), k = clicks.findIndex(t => t > now) - 1, kk = k < 0 ? (now > clicks[n - 1] ? n - 1 : -1) : k;
        [...dots].forEach((d, j) => d.classList.toggle('on', j <= kk));
        $('calSay').textContent = kk < 0 ? 'Get ready…' : kk < R.calLead ? `Listen… ${R.calLead - kk}` : tap ? 'Tap on every click!' : 'Clap on every click!';
        if (now > clicks[n - 1] + .7) { clearInterval(calRun.timer); calDone(); }
      }, 40);
    };
    function calDone() {
      A.Pitch.pauseListening(true);
      if (calRun.sub) calRun.sub.stop();
      $('calPad').hidden = true;
      const res = A.Calibration.analyse({clicks: calRun.clicks, lead: R.calLead, attacks: calRun.attacks, audAt: p => CLK.audAt(p), rules: R});
      lastCal = res;
      if (!res.ok) {
        $('calSay').textContent = res.why === 'click' ? 'I heard the click, not your claps. Try clapping a little louder or moving the device a bit farther from the speaker.'
          : res.accepted ? `I heard ${res.accepted} of ${R.calClicks}. ${tap ? 'Tap' : 'Clap'} right on each click. Let's try again!`
          : `I didn't hear anything. ${tap ? 'Tap the pad or press Space' : 'Check the microphone and clap a little louder'}. Let's try again!`;
        $('calGo').hidden = false; $('calGo').textContent = 'Try again';
        return;
      }
      const c = Object.assign({}, gd().calib || {}); c[key] = {ms: Math.round(res.median), n: res.accepted, at: Date.now()};
      save({calib: c});
      $('calSay').textContent = `All set! Your timing check: ${Math.round(res.median)} ms.`;
      setTimeout(() => close(true), 1100);
    }
  }
  let lastCal = null;
  const calPad = $('calPad');
  calPad.addEventListener('pointerdown', e => { e.preventDefault(); if (calRun) calRun.attacks.push({time: e.timeStamp || performance.now(), level: null}); calPad.classList.add('down'); });
  calPad.addEventListener('pointerup', () => calPad.classList.remove('down'));
  addEventListener('keydown', e => {                                   // Space on the clicks (the panel's button has gone)
    if ($('calPanel').hidden) return;
    if (e.key === ' ' && calRun && !micMode() && !e.repeat) { e.preventDefault(); calRun.attacks.push({time: performance.now(), level: null}); }
    if (e.key === ' ' && calRun && micMode() && A.DEMO && !e.repeat) { e.preventDefault(); A.Onsets.fake(performance.now(), .3); }
  });

  /* ================= THE HEADPHONES CHECK: can the microphone hear the clicks? ================= */
  let hpResult = null;
  function headphonesCheck(done) {
    const P = $('calPanel');
    $('calTitle').textContent = 'Headphones check';
    $('calMsg').textContent = 'With headphones on, the clicks can keep going while you clap. Put your headphones on, stay quiet, and tap Check now: the game plays a few clicks and listens.';
    $('calDots').innerHTML = ''; $('calSay').textContent = ''; $('calPad').hidden = true;
    $('calGo').hidden = false; $('calGo').textContent = 'Check now'; $('calSkip').textContent = 'Cancel';
    P.hidden = false; $('calGo').focus();
    let sub = null;
    const finish = ok => { P.hidden = true; if (sub) sub.stop(); A.Pitch.pauseListening(true); A.Sfx.gameMenuMusic(GAME_ID); done(ok); };
    $('calSkip').onclick = () => finish(false);
    $('calGo').onclick = () => {
      $('calGo').hidden = true;
      A.Sfx.gameMenuMusic(GAME_ID, false);
      CLK.start();
      const k2 = newKit(true);
      if (!k2) { $('calSay').textContent = 'Sound is off, so there is nothing to check. Turn the sound on to use headphones mode.'; $('calSkip').textContent = 'OK'; return; }
      const t0 = CLK.now() + .5, clicks = Array.from({length: R.headCheckClicks}, (_, k) => t0 + k * .6);
      clicks.forEach(t => k2.click(t, R.clickVol, true));
      const heard = new Set();
      A.Pitch.pauseListening(false); A.Onsets.ensure();
      sub = A.Onsets.listen(o => { const a = CLK.audAt(o.time); clicks.forEach((c, k) => { if (a - c > -.03 && a - c < .3) heard.add(k); }); });
      $('calSay').textContent = 'Listening…';
      setTimeout(() => {
        hpResult = {heard: heard.size};
        const ok = heard.size < R.headCheckMax;
        $('calSay').textContent = ok ? 'The microphone can\'t hear the clicks: headphones mode is on. The beat keeps clicking while you clap.'
          : 'It sounds like your speakers are on. Plug in headphones to use this mode.';
        $('calSkip').textContent = 'OK';
        $('calSkip').onclick = () => finish(ok);
      }, (clicks[clicks.length - 1] - CLK.now() + .6) * 1000);
    };
  }

  /* ================= TESTS ================= */
  let auto = null;
  function autoAttempt(T) {
    const o = auto, Rd = G.R, lag = Rd.att.lag;
    Rd.targets.forEach((t, i) => {
      if (o.skip && o.skip.includes(i)) return;
      const off = (Array.isArray(o.offset) ? o.offset[i] || 0 : o.offset || 0) / 1000;
      const at = perfAt(T.T0 + t.t + off + lag / 1000);
      setTimeout(() => { if (G && G.R === Rd && Rd.phase === 'perform') { if (opt.mode === 'tap') tapDown(at); else A.Onsets.fake(at, .3); } }, Math.max(0, at - performance.now()));
    });
    (o.extra || []).forEach(s => { const at = perfAt(T.T0 + s + lag / 1000); setTimeout(() => { if (G && G.R === Rd && Rd.phase === 'perform') opt.mode === 'tap' ? tapDown(at) : A.Onsets.fake(at, .3); }, Math.max(0, at - performance.now())); });
    if (!o.persist) auto = null;
  }
  A.RhythmDojo = {
    state: () => G ? {lv: G.lv || null, endless: !!G.endless, round: G.endless ? G.round : G.r, lives: G.lives, score: G.score, paused: !!G.paused,
      phase: G.R && G.R.phase, text: G.R && G.R.text, time: G.R && G.R.time, tempo: G.R && G.R.tempo, fade: G.R && G.R.fade, counting: G.R && C.text(G.R.gs),
      targets: G.R && G.R.targets.length, attempts: G.R && G.R.attempts,
      last: G.R && G.R.shown ? {acc: +G.R.shown.acc.toFixed(3), res: G.R.shown.tg.map(t => t.res), extras: G.R.shown.extras.length, tip: $('tip').textContent} : null,
      clock: CLK.ctx ? 'audio' : 'perf', mode: opt.mode, lag: lagMs()} : {phase: 'menu', mode: opt.mode},
    /** the next performances play themselves: offset ms (or one per note), skip [note indexes], extra [seconds], persist */
    autoPlay(offset = 0, o = {}) { auto = Object.assign({offset}, o); },
    judge: () => G && G.R && G.R.att ? judge(G.R) : null,
    /** the performance's bleed rule: the clicks' level and how late they were heard in the count-in (ms) */
    bleed: () => G && G.R && G.R.att ? {level: G.R.att.bleed, lagMs: Math.round(clickLag(G.R.att) * 1000), heard: G.R.att.offs.length, offs: G.R.att.offs.map(o => Math.round(o * 1000))} : null,
    /** the performance in progress: its rhythm's start (AudioContext time), each note's time after it (s) and when to press for it (performance.now() ms) */
    timeline: () => G && G.R && G.R.att ? {T0: G.R.att.T.T0, notes: G.R.targets.map(t => t.t), perf: G.R.targets.map(t => perfAt(G.R.att.T.T0 + t.t + G.R.att.lag / 1000))} : null,
    set: patch => { Object.assign(opt, patch); save(patch); if (!G) showHub(); },
    calibration: () => lastCal, headphones: () => hpResult,
    /** the timing check's clicks as performance.now() times (tests: tap along with them) */
    calClicks: () => calRun ? calRun.clicks.map(c => perfAt(c)) : null,
    setRound: (text, time, tempo) => { if (G) setRound(text, time, tempo || 80); },
  };

  showHub();
})(window.Arcade);
