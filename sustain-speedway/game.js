/* Sustain Speedway: a long-tone and intonation racing game. The student's instrument is the car's engine: the car
   moves only while they hold the lap's target note, faster the more in tune and steady it is (levels.js RULES).
   Notes: NOTES × ORDER (shared/mode-picker.js + sequences.js), one target note per lap. Tracks and rules: levels.js.
   Progress: per instrument MEMBER (games.js byMember): setLevel(<progress key>, member id, track, {stars, best});
   best = the best finish time in tenths of a second. Ghost cars and best laps live in store.gameData('sustain-speedway'):
     {diff, ghosts: {'<progress key>|<member>|<track>': {t (total s), p: [progress every RULES.ghostEvery s]}},
      bestLap: {same key: seconds}, achievements: {'virtuoso-win': true, 'perfect-lap': true}, wins (races won),
      garage: {body, paint, decal, number} + garageSeen (THE GARAGE: garage.js, the cars: cars.js)}
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
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const gd = A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const sfx = name => (A.Sfx ? A.Sfx.event(name) : 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const Garage = A.SpeedwayGarage, Cars = A.SpeedwayCars;
  if (gd.wins == null) { gd.wins = Garage.stats().winCount; save(); }   // races won (before the garage: one per track, instrument and mode)
  const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const signed = c => { const a = Math.round(Math.abs(c)); return (a === 0 ? '' : c > 0 ? '+' : '−') + a + '¢'; };   // "+12¢", "−8¢", "0¢"
  const dayKey = () => { const d = A.store.today ? A.store.today() : new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();

  /* ---------- difficulty (remembered): Rookie ±20, Pro ±12, Virtuoso ±6 cents for full speed ---------- */
  const DIFF = R.difficulties, diffOf = id => DIFF.find(d => d.id === id) || DIFF[0];
  $('diffBtns').innerHTML = DIFF.map(d => `<button type="button" data-diff="${d.id}">${d.name}</button>`).join('');
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
  // THE COUNTDOWN's sounds (race-count-3/-2/-1/-go and their Dojo Duel fallbacks): downloaded as the track screen shows,
  // so the first countdown after a page load is on time
  const COUNT_SOUNDS = A.countdown.sounds('race');
  function showHub() {
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    A.Sfx.prefer(COUNT_SOUNDS);
    stopRace();
    A.ModePicker.useRange(picker.state);
    picker.refresh();
    pause.setActive(false); A.UI.results.hide();
    $('race').hidden = true; $('hub').hidden = false;
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
        <span class="facts">${L.laps} laps · ${lapTxt} a lap${L.tunnels ? ' · tunnels' : ''}${L.dyn ? ' · dynamics' : ''}${L.slurLaps ? ' · slurs' : ''}</span>
        ${teacherFor(lv) ? `<span class="tg-badge">Beat ${teacherFor(lv).name}</span>` : ''}
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${!open ? '' : p.best ? 'Best ' + fmt(p.best / 10) + (bl ? ` · lap ${bl.toFixed(1)} s` : '') : ''}</span></span>
      </button>`;
    }).join('');
    $('trackGrid').querySelectorAll('.trk').forEach(b => b.addEventListener('click', () => { const lv = +b.dataset.l; A.requireMic(() => startRace(lv)); }));
    garageDot(); drawRecords();
    // GARAGE (beside): just left of START, in the level select's sticky row
    A.LevelSelect.show({screen: $('hub'), grid: $('trackGrid'), beside: $('garageBtn'), cards: $('trackGrid').querySelectorAll('.trk'), picker: $('modePick'),
      unlocked: i => A.DEMO || i === 0 || A.store.level(key, who, i + 1).stars > 0 || A.store.level(key, who, i).stars >= 3,
      lockText: i => `Win Track ${i} to unlock`});
  }

  /* ---------- a race ---------- */
  let G = null, raf = 0, lastT = 0;
  /* THE PAUSE MENU (shared/ui-kit.js): G.held stops the race clock, the car, the rivals and the pit stop. Paused during
     the COUNTDOWN, it stops, and starts again from 3 on RESUME (as when the page is hidden). */
  const pause = A.UI.pause.mount({
    onPause: () => { if (!G) return; G.held = true; if (G.phase === 'count') stopCountdown(); },
    onResume: () => {
      if (!G) return;
      G.held = false; lastT = performance.now();
      resetHearing();                                         // the microphone starts fresh: only what is heard from now counts
      if (G.phase === 'count' && !G.cd && !document.hidden) startCountdown();
    },
    onRestart: () => startRace(G ? G.lv : 1),
    onLevels: showHub,
    levelsLabel: 'Back to tracks',
    canPause: () => !!G && G.phase !== 'done',
    info: () => G ? [['Lap', `${Math.min(G.lap + 1, G.lens.length)}/${G.lens.length}`], ['Time', fmt(G.clock)], ['Position', ord(position())]] : [],
  });
  /** the countdown stops (the page hidden, or paused); it starts again from 3 */
  function stopCountdown() {
    if (!G.cd && !G.goHeard) return;
    G.cd = null; G.goHeard = false; A.Sfx.hush(); banner(''); G.restarts = (G.restarts || 0) + 1;
  }
  const S = {state: 'silent', cents: null, hist: [], wrongRun: 0, zoneSince: 0, I: 0, P: 0, V: 0, score: 0};   // what the mic hears

  function startRace(lv) {
    A.LevelSelect.played(lv - 1);                   // the level select comes back with this level selected
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    stopRace();
    const L = TRACKS[lv - 1], d = diffOf(gd.diff);
    A.ModePicker.useRange(picker.state);
    const seq = A.ModePicker.sequence(picker.state, Object.assign({}, L, {count: L.laps}), lv);
    const lens = lapLens(L);
    const rivals = L.rivals.map((r, i) => Object.assign({home: i % 2 ? 1 : -1}, r));      // home lane: left, right, left… (LANES)
    const ghost = (gd.ghosts || {})[recKey(lv)] || null;
    const teacher = teacherFor(lv);                                       // THE TEACHER GHOST CHALLENGE (teacher-ghosts.js)
    G = {car: Garage.look(), lv, L, diff: d, seq, items: seq.items, lens, rivals, ghost, teacher, lap: 0, dist: 0, v: 0, clock: 0, lapStart: 0, lapTimes: [],
      phase: 'count', pitEnd: 0, nitro: false, zoneTime: 0, driveTime: 0, ghostRec: [0], nextRec: R.ghostEvery,
      steer: 0, steerRec: [0], notes: {},                                // PITCH STEERING (drawing only) + THE INTONATION REPORT
      fx: {}, season: SC.season(),                                       // the scenery: effects, the SEASONAL look (scenery.js)
      laps: lens.map(() => ({n: 0, sum: 0, abs: 0, zone: 0})), world: 0, flashUntil: 0, finishedAt: 0};
    G.total = lens.reduce((a, b) => a + b, 0);
    G.props = SC.propsFor(L, G.season); G.air = SC.airFor(L, G.season); FX.clear();
    G.slurB = lens.map((_, i) => (L.slurLaps || []).includes(i + 1) ? slurPartner(G.items[i], seq) : null);   // SLUR LAPS
    G.zones = makeZones(L, lens, G.slurB);                                                                     // DYNAMICS ZONES
    G.dynPitch = {soft: {n: 0, sum: 0}, loud: {n: 0, sum: 0}}; G.slurs = [];
    S.dynMul = 1; S.slurMul = 1; S.slurSlowUntil = 0; S.dbS = null; dynShow(null);
    A.UI.results.hide(); $('hub').hidden = true; $('race').hidden = false; $('pit').hidden = true;
    document.body.classList.add('racing');
    $('raceDiff').textContent = `${d.name} · full speed within ±${d.tol}¢`;
    $('hudOf').textContent = `of ${rivals.length + 1}`;
    $('whoPic').innerHTML = A.avatarHTML ? A.avatarHTML({size: 'tile', member: who}) : A.portraitHTML(who, {size: 'tile', label: member.short});   // the driver: the student's avatar
    drawGauge(); drawNote(); hud(); resize();
    window.scrollTo(0, 0);
    resetHearing();
    A.Pitch.demoJitter = 0.01;
    pause.setActive(true);
    lastT = performance.now(); raf = requestAnimationFrame(loop);
    // 3, 2, 1, GO! once its sounds are ready (at most 0.8 s: a sound still missing plays its fallback)
    const g = G;
    if (L.dyn && !dynLevels()) volumeCheck();                  // THE VOLUME CHECK (once per play session) before the countdown
    A.Sfx.whenReady(COUNT_SOUNDS, 800).then(() => { if (G === g && G.phase === 'count' && !G.cd && !G.held && !document.hidden) startCountdown(); });
  }
  /* THE COUNTDOWN (shared/countdown.js, like Dojo Duel and Neon Face-Off): CLASSIC 3 · 2 · 1 one second apart, each
     number shown as its own voice clip plays (race-count-N, else Dojo Duel's), then a spoken "GO!". It runs on the race's
     own countdown clock (G.cd, advanced by the loop only while the page is visible); hiding the page stops it, and it
     starts again from 3 (visibilitychange). Nothing heard counts until the race starts: the "GO!" banner, the car and the
     race clock start the moment the microphone is live again after the GO voice (the sound manager's own mute ends:
     Pitch.isSuppressed), never on a guess. A note started during "GO!" simply counts from then on. */
  function startCountdown() {
    const g = G, cd = {t: 0, timers: [], log: []};
    g.cd = cd; g.goHeard = false;
    banner('');
    A.countdown({style: 'classic', voicePrefix: 'race', go: true,
      later: (ms, fn) => { if (g.cd === cd) cd.timers.push({at: cd.t + ms, fn}); },
      show: (label, kind) => {
        if (G !== g || g.cd !== cd) return;
        cd.log.push({label, kind, t: Math.round(cd.t), at: Math.round(performance.now())});
        banner(kind === 'count' ? label : '', 'count');        // the GO! banner waits for the microphone (below)
      },
      onGo: () => { if (G === g && g.cd === cd) g.goHeard = performance.now(); }});
  }
  /** the countdown's clock: runs its timers (the loop calls it every frame while counting and visible) */
  function countTick(ms) {
    const cd = G.cd; if (!cd) return;
    cd.t += ms;
    for (;;) {
      const due = cd.timers.filter(x => x.at <= cd.t).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      cd.timers.splice(cd.timers.indexOf(due), 1); due.fn();
      if (!G || G.cd !== cd) break;
    }
  }
  function stopRace() {
    cancelAnimationFrame(raf); raf = 0;
    if (G && G.phase === 'vcheck') { $('vcheck').hidden = true; $('vcheck').innerHTML = ''; }
    G = null; demoKey = null; A.Pitch.demoNote = null; A.Pitch.demoJitter = 0.2; A.Pitch.demoLevel = null; dynShow(null); FX.clear(); hidePodium();
    banner('');
  }
  function resetHearing() { endHold(); S.state = 'silent'; S.cents = null; S.hist = []; S.wrongRun = 0; S.zoneSince = 0; S.score = 0; if (G) G.nitro = false; A.Pitch.ignoreCurrent(); }
  /** the note to play NOW: the lap's note, or on a SLUR LAP its second note once the car is past halfway */
  const item = () => {
    if (!G) return null;
    const i = Math.min(G.lap, G.items.length - 1), b = G.slurB && G.slurB[i];
    return b && G.sl && G.sl.lap === i && G.sl.switched ? b : G.items[i];
  };

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
    if (G && G.phase === 'vcheck') { volumeReading(r, level); return; }
    if (!G || G.phase !== 'race') { if (G) drawGaugeNeedle(null); return; }
    let it = item();
    // A SLUR: just after the switch the first note still counts (the student is moving to the new one), and a gap in
    // the sound around the switch is a BREAK
    const sl = G.sl && G.sl.watch ? G.sl : null;
    if (sl) {
      if (r && r.pc === sl.a.pc && r.pc !== it.pc && now - sl.at < R.slur.graceMs) it = sl.a;
      if (!r) { if (sl.gapFrom == null) sl.gapFrom = now; if (now - sl.gapFrom >= R.slur.gapMs) sl.broke = true; }
      else sl.gapFrom = null;
      if (r && r.pc === G.slurB[sl.lap].pc) slurDone(now, sl.broke ? 'break' : 'slur');
      else if (now - sl.at >= R.slur.graceMs) slurDone(now, 'missed');
    }
    if (r) S.lastSound = now;
    // cents from the TARGET (any octave): the engine's own `cents` is from the nearest semitone
    const dev = r ? (((r.midi - it.pc) % 12 + 18) % 12 - 6) * 100 : null;
    if (r && r.pc === it.pc && Math.abs(dev) <= 50) {
      S.wrongRun = 0; S.state = 'on'; S.cents = dev;
      dynReading(now, level, dev);
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
      holdReading(now, dev);
    } else if (r) {                                          // a different note: brake (after a couple of readings)
      if (++S.wrongRun >= R.wrongFrames) {
        if (S.state !== 'wrong') { G.flashUntil = now + 900; flashTarget(); }
        S.state = 'wrong'; S.cents = null; S.hist = []; S.zoneSince = 0; G.nitro = false; S.score = 0; endHold();
      }
    } else {                                                 // silence (breathing), or nothing clear: coast
      S.wrongRun = 0; S.state = 'silent'; S.cents = null; S.hist = []; S.zoneSince = 0; G.nitro = false; S.score = 0; endHold();
    }
    drawGaugeNeedle(S.state === 'on' ? S.cents : null);
  });

  /* ---------- THE INTONATION REPORT's numbers: one HOLD = the lap's note sounding without a break ----------
     Per target note (its WRITTEN name with the octave, e.g. "D4"): the holds of at least RULES.report.reportHoldSec s
     add their readings (average signed cents), their wobble (the hold's standard deviation, weighted by its length),
     and the longest unbroken run within the difficulty's tolerance (hold). Time in the zone comes from the loop. */
  const noteKey = it => it.label + (it.n && it.n.oct != null ? it.n.oct : '');
  function noteStat(it) {
    const k = noteKey(it);
    return G.notes[k] || (G.notes[k] = {key: k, label: it.label, oct: it.n && it.n.oct, n: 0, sum: 0, wob: 0, dur: 0, zone: 0, hold: 0});
  }
  function holdReading(now, dev) {
    let h = S.seg;
    if (!h) h = S.seg = {t0: now, t1: now, n: 0, sum: 0, sq: 0, tolAt: null, best: 0, lap: G.lap, it: item()};
    h.t1 = now; h.n++; h.sum += dev; h.sq += dev * dev;
    if (Math.abs(dev) <= G.diff.tol) { if (h.tolAt === null) h.tolAt = now; h.best = Math.max(h.best, (now - h.tolAt) / 1000); }
    else h.tolAt = null;
  }
  function endHold() {
    const h = S.seg; S.seg = null;
    if (!h || !G || !h.it) return;
    const dur = (h.t1 - h.t0) / 1000;
    if (dur < R.report.reportHoldSec || h.n < 3) return;
    const st = noteStat(h.it), m = h.sum / h.n;
    st.n += h.n; st.sum += h.sum; st.wob += Math.sqrt(Math.max(0, h.sq / h.n - m * m)) * dur; st.dur += dur;
    st.hold = Math.max(st.hold, h.best);
  }

  /* ---------- PITCH STEERING: the car's sideways place shows the pitch (drawing only) ---------- */
  /** −1 (the left edge: flat) … 0 (the center line: in tune) … 1 (the right edge: sharp) for a pitch `c` cents off */
  function steerOf(c) {
    const a = Math.abs(c), tol = G.diff.tol;
    if (a <= tol) return 0;
    return Math.sign(c) * clamp((a - tol) / Math.max(1, R.steer.edge - tol), 0, 1);
  }
  function steerTick(dt) {
    const on = G.phase === 'race' && S.state === 'on' && S.cents !== null;
    const want = on ? steerOf(S.cents) : 0, tau = (on ? R.steer.smoothMs : R.steer.backMs) / 1000;
    G.steer += (want - G.steer) * (1 - Math.exp(-dt / tau));
    if (Math.abs(G.steer) < 1e-4) G.steer = 0;
  }
  let steerShown = '';
  function steerWord(side) {                               // "FLAT ◀" on the left, "▶ SHARP" on the right, or nothing
    if (side === steerShown) return;
    steerShown = side;
    const w = $('steerWord');
    w.hidden = !side; w.className = 'steer-word ' + (side || '');
    w.textContent = side === 'l' ? 'FLAT ◀' : side === 'r' ? '▶ SHARP' : '';
  }
  /* the one-time hint on the first race after the update (gameData.steerHint) */
  function steerHint() {
    if (gd.steerHint) return;
    gd.steerHint = true; save();
    const h = $('steerHint'); h.hidden = false;
    clearTimeout(steerHint.t); steerHint.t = setTimeout(() => { h.hidden = true; }, 7000);
  }

  /* ---------- DYNAMICS ZONES ----------
     Per lap: `dyn.zones` stretches of `dyn.len` of the lap each (none on a slur lap), spread evenly after dyn.startAt,
     with the markings taken in turn from `dyn.kinds` (a random start per race). Levels come from THE VOLUME CHECK. */
  const D = R.dyn;
  function makeZones(L, lens, slurB) {
    const k0 = Math.floor(Math.random() * 4);
    return lens.map((len, lap) => {
      if (!L.dyn || slurB[lap]) return [];
      const n = L.dyn.zones, room = (1 - D.startAt) / n;
      return [...Array(n)].map((_, i) => {
        const from = D.startAt + room * i + Math.max(0, room - L.dyn.len) / 2;
        return {from: from * len, to: Math.min(.98, from + L.dyn.len) * len, kind: L.dyn.kinds[(k0 + lap * n + i) % L.dyn.kinds.length]};
      });
    });
  }
  const zoneNow = () => (G && G.phase === 'race' && G.zones[G.lap] || []).find(z => G.dist >= z.from && G.dist < z.to) || null;
  const zoneProg = z => clamp((G.dist - z.from) / (z.to - z.from), 0, 1);
  /** where the loudness should be now in zone z (0 = your soft level … 1 = your loud level): [low, high] */
  function dynWant(z) {
    if (z.kind === 'p') return [-1, D.softMax];
    if (z.kind === 'f') return [D.loudMin, 2];
    const k = zoneProg(z), c = z.kind === 'cresc' ? D.ramp[0] + (D.ramp[1] - D.ramp[0]) * k : D.ramp[1] - (D.ramp[1] - D.ramp[0]) * k;
    return [c - D.rampWindow, c + D.rampWindow];
  }
  const dbOf = level => 20 * Math.log10(Math.max(level, 1e-5));
  function dynReading(now, level, dev) {
    const db = dbOf(level), dt = S.lastDbT ? now - S.lastDbT : 40; S.lastDbT = now;
    S.dbS = S.dbS == null ? db : S.dbS + (db - S.dbS) * (1 - Math.exp(-dt / D.smoothMs));
    const z = zoneNow(), lv = dynLevels();
    if (!z || !lv) { S.dynMul = 1; S.dynBad = 0; dynShow(z); return; }
    const norm = (S.dbS - lv.soft) / Math.max(1, lv.loud - lv.soft), [lo, hi] = dynWant(z);
    const hint = norm < lo ? 'louder!' : norm > hi ? 'softer!' : '';
    if (hint) { if (!S.dynBad) S.dynBad = now; } else S.dynBad = 0;
    const wrong = !!hint && now - S.dynBad >= D.graceMs;
    S.dynMul = wrong ? D.slow : 1;
    S.norm = norm;
    // the pitch in soft and loud places (the report's "Pitch in soft / loud zones")
    const k = zoneProg(z), soft = z.kind === 'p' || (z.kind === 'decresc' && k > .6) || (z.kind === 'cresc' && k < .4);
    const loud = z.kind === 'f' || (z.kind === 'cresc' && k > .6) || (z.kind === 'decresc' && k < .4);
    if (soft || loud) { const d = G.dynPitch[soft ? 'soft' : 'loud']; d.n++; d.sum += dev; }
    const zz = G.zoneStats || (G.zoneStats = {}), key = `${G.lap}:${z.from}`;
    const st = zz[key] || (zz[key] = {n: 0, ok: 0}); st.n++; if (!hint) st.ok++;
    dynShow(z, wrong ? hint : '');
  }
  const DYN_WORD = {p: ['p', 'piano: soft'], f: ['f', 'forte: loud'], cresc: ['cresc.', 'get louder'], decresc: ['decresc.', 'get softer']};
  let dynShown = '';
  function dynShow(z, hint = '') {
    const key = z ? z.kind + '|' + hint : '';
    if (key === dynShown) return;
    dynShown = key;
    const b = $('dynBadge');
    if (!z) { b.hidden = true; return; }
    b.hidden = false; b.className = 'dyn-badge k-' + z.kind + (hint ? ' bad' : '');
    b.innerHTML = `<b class="dyn-mark">${z.kind === 'cresc' ? '<svg viewBox="0 0 60 24" aria-hidden="true"><path d="M58 3L2 12L58 21"/></svg>' : z.kind === 'decresc' ? '<svg viewBox="0 0 60 24" aria-hidden="true"><path d="M2 3L58 12L2 21"/></svg>' : DYN_WORD[z.kind][0]}</b>
      <span class="dyn-say">${DYN_WORD[z.kind][1]}</span>${hint ? `<span class="dyn-hint">${hint}</span>` : ''}`;
  }
  /* THE VOLUME CHECK: "Play your note SOFT… now LOUD" (dyn.checkSec each), learning this device's levels for the play
     session (Arcade.session 'sw-dyn' + sessionStorage bandarcade.sw-dyn), RETRY or LET'S RACE. */
  const DYN_KEY = 'bandarcade.sw-dyn';
  function dynLevels() {
    if (!A.session || !A.session.has('sw-dyn')) return null;
    try { const v = JSON.parse(sessionStorage.getItem(DYN_KEY) || 'null'); return v && v.who === who ? v : null; } catch (e) { return null; }
  }
  function setDynLevels(soft, loud) {
    try { sessionStorage.setItem(DYN_KEY, JSON.stringify({who, soft: +soft.toFixed(1), loud: +loud.toFixed(1)})); } catch (e) { /* private mode: asked again next race */ }
    if (A.session) A.session.mark('sw-dyn');
  }
  function volumeCheck() {
    G.phase = 'vcheck';
    G.vc = {step: 'ready-soft', t: 0, soft: [], loud: []};
    $('vcheck').hidden = false; drawCheck();
  }
  function volumeReading(r, level) { const vc = G.vc; if (r && vc && (vc.step === 'soft' || vc.step === 'loud')) vc[vc.step].push(dbOf(level)); drawMeter(level); }
  const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
  function volumeTick(dt) {
    const vc = G.vc; if (!vc || vc.step === 'done') return;
    vc.t += dt;
    const lim = vc.step.startsWith('ready') ? D.readySec : D.checkSec;
    if (vc.t < lim) { const bar = $('vcBar'); if (bar) bar.style.width = (vc.t / lim * 100) + '%'; return; }
    vc.t = 0;
    vc.step = {'ready-soft': 'soft', soft: 'ready-loud', 'ready-loud': 'loud', loud: 'done'}[vc.step];
    if (vc.step === 'done') {
      const soft = median(vc.soft), loud = median(vc.loud);
      vc.result = soft == null || loud == null ? {ok: false, why: 'I didn’t hear your note. Play the note on the card, then try again.'}
        : loud - soft < D.minSpread ? {ok: 'close', soft, loud, why: 'Those sounded about the same. Try again with a bigger difference: really soft, then really loud!'}
        : {ok: true, soft, loud};
    }
    drawCheck();
  }
  function drawCheck() {
    const vc = G.vc, it = G.items[0], box = $('vcheck');
    const say = {'ready-soft': 'Get ready…', soft: 'Play your note SOFT…', 'ready-loud': 'Now get ready for LOUD…', loud: '…now LOUD!'};
    if (vc.step !== 'done') {
      box.innerHTML = `<div class="vc-card"><p class="vc-title">Volume check</p><p class="vc-say ${vc.step.replace('ready-', '')}">${say[vc.step]}</p>
        <p class="vc-note">Play <b>${it.label}</b> (or any note) · ${D.checkSec} s each</p>
        <div class="vc-time"><i id="vcBar"></i></div><div class="vc-meter" aria-hidden="true"><i id="vcMeter"></i></div></div>`;
      return;
    }
    const r = vc.result;
    box.innerHTML = `<div class="vc-card"><p class="vc-title">Volume check</p>
      ${r.ok === true ? `<p class="vc-say ok">Got it!</p><p class="vc-note">Soft and loud are set for this session. Watch for <b>p</b>, <b>f</b>, cresc. and decresc. signs on the road.</p>`
        : `<p class="vc-say bad">Hmm…</p><p class="vc-note">${r.why}</p>`}
      <div class="vc-acts"><button type="button" class="btn btn-secondary" id="vcRetry">Retry</button>
      ${r.ok ? '<button type="button" class="btn btn-primary" id="vcGo">Let’s race!</button>' : ''}</div></div>`;
    $('vcRetry').addEventListener('click', () => { G.vc = {step: 'ready-soft', t: 0, soft: [], loud: []}; drawCheck(); });
    const go = $('vcGo');
    if (go) { go.addEventListener('click', () => endCheck(r.ok === true ? r.soft : r.soft, r.ok === true ? r.loud : r.soft + D.fallbackSpread)); go.focus(); }
  }
  function drawMeter(level) { const m = $('vcMeter'); if (m) m.style.width = clamp((dbOf(level) + 50) / 44, 0, 1) * 100 + '%'; }
  function endCheck(soft, loud) {
    setDynLevels(soft, loud);
    $('vcheck').hidden = true; $('vcheck').innerHTML = '';
    if (!G || G.phase !== 'vcheck') return;
    G.phase = 'count'; G.vc = null;
    if (!G.cd && !G.held && !document.hidden) startCountdown();
  }
  A.UI.settings.register(box => {
    box.insertAdjacentHTML('beforeend', `<div class="ui-srow"><span class="ui-sname">Volume check<small>for the dynamics tracks (p, f, cresc., decresc.)</small></span><span></span>
      <button type="button" class="btn btn-secondary btn-small" id="swRedoVol">Redo</button><p class="ui-snote" id="swRedoNote"></p></div>`);
    box.querySelector('#swRedoVol').addEventListener('click', () => {
      try { sessionStorage.removeItem(DYN_KEY); } catch (e) { /* nothing saved */ }
      box.querySelector('#swRedoNote').textContent = 'It will run before your next race with dynamics.';
    });
  }, {title: 'Sustain Speedway'});

  /* ---------- SLUR LAPS ----------
     The second note comes from the NOTES setting's own pool (never a note outside it): BRASS = a note with the SAME
     primary fingering / slide position (a lip slur: shared/fingerings.js) when the pool has one, else the nearest step;
     WOODWINDS = 1 to 5 half steps away without crossing the break (clarinets: written B♭4 | B4; saxophones: C♯5 | D5). */
  const FING = (() => {                                        // written midi → the primary fingering, for this member
    const t = ((window.MASHER_FINGERINGS || {})[who] || {}).notes || {}, out = {};
    Object.keys(t).forEach(k => { try { out[A.music.writtenMidi(A.music.parseNote(k))] = String([].concat(t[k])[0]); } catch (e) { /* skip */ } });
    return out;
  })();
  const BREAK = {clarinet: 70.5, basscl: 70.5, altosax: 73.5, tenorsax: 73.5, barisax: 73.5};
  function slurPartner(a, seq) {
    const pool = (seq.pool || []).filter(p => p.midi !== a.midi && p.pc !== a.pc), pick = l => l[Math.floor(Math.random() * l.length)];
    if (!pool.length) return null;
    const dist = p => Math.abs(p.midi - a.midi);
    if (member.family === 'brass') {
      const same = pool.filter(p => FING[a.midi] != null && FING[p.midi] === FING[a.midi] && dist(p) <= 12);
      if (same.length) return same.sort((x, y) => dist(x) - dist(y))[0];
    }
    const br = BREAK[who];
    const ok = pool.filter(p => dist(p) >= 1 && dist(p) <= 5 && (br == null || (p.midi < br) === (a.midi < br)));
    const best = ok.filter(p => dist(p) >= 2 && dist(p) <= 4);
    return best.length ? pick(best) : ok.length ? pick(ok) : null;
  }
  function slurTick(now) {
    const b = G.slurB[G.lap];
    if (!b) return;
    if (!G.sl || G.sl.lap !== G.lap) G.sl = {lap: G.lap, a: G.items[G.lap], switched: false};
    const sl = G.sl;
    if (!sl.switched && G.dist >= G.lens[G.lap] / 2) {        // THE SWITCH (halfway)
      endHold();
      // (performance.now(), the time the detector's frames use: a busy page's frame timestamp runs behind it)
      const pn = performance.now();
      sl.switched = true; sl.watch = true; sl.at = pn; sl.broke = false;
      sl.gapFrom = S.state === 'on' ? null : (S.lastSound || pn);
      if (sl.gapFrom != null && pn - sl.gapFrom >= R.slur.gapMs) sl.broke = true;
      drawNote();
      banner(`SLUR TO ${b.label}!`, 'slur', 900);
    }
  }
  function slurDone(now, how) {
    const sl = G.sl; if (!sl || !sl.watch) return;
    sl.watch = false; sl.result = how;
    G.slurs.push({lap: sl.lap, a: sl.a.label, b: G.slurB[sl.lap].label, ok: how === 'slur', how});
    if (how === 'break') { S.slurSlowUntil = now + R.slur.slowMs; banner('Slur it!', 'bad', 1100); }
    else if (how === 'slur') { banner('Smooth!', 'zone', 800); gd.slurSmooth = (gd.slurSmooth || 0) + 1; }
  }

  /* ---------- the loop: the car, the clock, laps, pit stops, rivals ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!G) return;
    const raw = now - lastT, dt = Math.min(0.1, raw / 1000); lastT = now;
    perfWatch(raw);
    demoDrive(now);
    const paused = document.hidden || G.held || A.Pitch.isSuppressed(now);   // a sound is muting the mic (or the pause menu is open): the race clock stops
    if (G.phase === 'vcheck') { if (!document.hidden && !G.held) volumeTick(Math.min(raw, 250) / 1000); }
    else if (G.phase === 'count') {
      if (!document.hidden && !G.held) countTick(Math.min(raw, 250));
      // the race starts when the microphone is live again after "GO!": the sound manager's mute has really ended
      if (G && G.goHeard && !G.held && !A.Pitch.isSuppressed(now)) { G.phase = 'race'; G.liveAt = now; banner('GO!', 'go', 700); resetHearing(); steerHint(); }
    } else if (G.phase === 'race' && !paused) {
      G.clock += dt; G.driveTime += dt;
      slurTick(now);
      S.slurMul = now < (S.slurSlowUntil || 0) ? R.slur.slow : 1;
      const zn = zoneNow(); if (!zn) { S.dynMul = 1; dynShow(null); } else if (S.state !== 'on') dynShow(zn);
      (G.zones[G.lap] || []).forEach(z => {                     // a zone passed: NAILED (the garage counts them)?
        if (z.done || G.dist < z.to) return;
        z.done = true;
        const st = (G.zoneStats || {})[`${G.lap}:${z.from}`];
        if (st && st.n >= 8 && st.ok / st.n >= window.SPEEDWAY_GARAGE.dynNailShare) { gd.dynNailed = (gd.dynNailed || 0) + 1; G.nailed = (G.nailed || 0) + 1; }
      });
      driveStep(dt);
      if (G.nitro) { G.zoneTime += dt; G.laps[G.lap].zone += dt; noteStat(item()).zone += dt; }
      if (G.dist >= G.lens[G.lap]) lapDone(now);
    } else if (G.phase === 'pit' && !paused) {
      G.clock += dt;
      pitCoach();
      if (G.clock >= G.pitEnd) leavePit();
    }
    if (G && !paused) steerTick(dt);
    if (G && G.phase !== 'done' && G.clock >= G.nextRec) { G.ghostRec.push(+progress().toFixed(3)); G.steerRec.push(+G.steer.toFixed(2)); G.nextRec += R.ghostEvery; }
    if (G) { hud(); render(now); }
  }
  /** THE CAR'S SPEED: from what is heard only (S: the score, nitro, a wrong note, silence), never from the steering */
  function driveStep(dt) {
    // (DYNAMICS ZONES: the wrong dynamic × dyn.slow; a SLUR broken: × slur.slow for a moment)
    const target = S.state === 'on' ? S.score * (G.nitro ? R.nitro.boost : 1) * (S.dynMul || 1) * (S.slurMul || 1) : 0;
    if (S.state === 'on') G.v = target > G.v ? Math.min(target, G.v + R.accel * dt) : Math.max(target, G.v - R.ease * dt);
    else if (S.state === 'wrong') G.v = Math.max(0, G.v - R.brake * dt);
    else G.v = Math.max(0, G.v - R.coast * dt);
    G.dist += G.v * dt; G.world += G.v * dt;
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
  /** the ghost's own steering at race time t (an older ghost has none: straight) */
  function ghostSteer(t) {
    const s = G.ghost && G.ghost.s; if (!s || !s.length) return 0;
    const k = t / R.ghostEvery, i = Math.min(s.length - 1, Math.floor(k)), j = Math.min(s.length - 1, i + 1);
    return s[i] + (s[j] - s[i]) * (k - i);
  }
  function ghostProgress(t, ghost = G.ghost) {
    const p = ghost && ghost.p; if (!p || !p.length) return null;
    const k = t / R.ghostEvery, i = Math.floor(k);
    if (i >= p.length - 1) return t >= ghost.t ? G.lens.length : p[p.length - 1];
    return p[i] + (p[i + 1] - p[i]) * (k - i);
  }
  function position() {
    const me = progress();
    return 1 + G.rivals.filter(r => paceProgress(r.pace, G.clock) > me).length;
  }
  function lapDone(now) {
    endHold();
    const t = G.clock - G.lapStart;
    G.lapTimes.push(t);
    const lp = G.laps[G.lap];                                   // a PERFECT-PITCH LAP (the garage's Flames)
    if (lp.n >= window.SPEEDWAY_GARAGE.perfectLapReadings && lp.abs / lp.n <= R.nitro.cents) (gd.achievements = gd.achievements || {})['perfect-lap'] = true;
    const could = t - R.nitro.holdMs / 1000;                   // A CLEAN LAP: in the zone the whole lap (from when nitro can start)
    if (could > 0 && lp.zone >= could * window.SPEEDWAY_GARAGE.cleanLapShare) gd.cleanLaps = (gd.cleanLaps || 0) + 1;
    if (G.lap === G.lens.length - 1) return finishRace(now);
    // PIT STOP: a short, required rest; the next note is shown so the student can get ready
    G.phase = 'pit'; G.pitEnd = G.clock + R.pitSec; G.pitStart = G.clock; G.v = 0; dynShow(null);
    resetHearing(); drawGaugeNeedle(null);
    $('pitLap').textContent = `${G.lap + 2} of ${G.lens.length}`;
    const nx = G.items[G.lap + 1];
    const nb = G.slurB[G.lap + 1];
    $('pitStaff').innerHTML = nb ? slurStaff(nx, nb, 260) : staff(nx, 260);
    $('pitName').textContent = nb ? `${nx.label} ⌒ ${nb.label} (slur!)` : nx.label;
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
  /* THE FINISH LINE MOMENT: the checkered flag waves as you cross (FINISH!), confetti for 1st place (sparkles for 2nd
     and 3rd; none in LITE), then THE PODIUM for about FINISH.podiumMs (a tap, Enter or Space skips it), then the results. */
  const FINISH = {flagMs: 1500, podiumMs: 2200};
  function finishRace() {
    G.phase = 'done'; G.v = 0; steerWord('');
    pause.setActive(false);                         // the race is over: nothing left to pause
    G.ghostRec.push(G.lens.length); G.steerRec.push(0);
    sfx('race-finish');
    banner('FINISH!', 'finish');
    const g = G;
    g.fx.flagAt = performance.now();
    celebrate(placeOf(g));
    setTimeout(() => { if (G === g) showPodium(g); }, FINISH.flagMs);
  }
  /** your finishing place: 1 + the rivals whose (steady-pace) finish time beats yours */
  const placeOf = g => 1 + g.rivals.filter(r => paceFinish(r.pace) < g.clock).length;
  let podium = null;
  function showPodium(g) {
    const place = placeOf(g), el = $('podium');
    // everyone in finishing order: you (your time) and the rivals (their steady-pace times)
    const order = [{you: true, t: g.clock}].concat(g.rivals.map(r => ({r, t: paceFinish(r.pace)}))).sort((a, b) => a.t - b.t || (a.you ? -1 : 1));
    const sky = css('sw-sky-low');
    const carImg = o => `<img class="pd-car" alt="" src="${Cars.thumbURL(Object.assign({}, o.you ? g.car : {body: o.r.body || 'coupe', color: C[o.r.color] || C.cyan, decal: 'none'}, {sky}), 110)}">`;
    const who = o => o.you ? `<span class="pd-av">${A.avatarHTML ? A.avatarHTML({size: 'tile', member: member.id}) : ''}</span>${carImg(o)}<b class="pd-name">You</b>`
      : `${carImg(o)}<b class="pd-name">${o.r.name}</b>`;
    const step = n => `<div class="pd-slot p${n}${order[n - 1].you ? ' me' : ''}" data-place="${n}">${who(order[n - 1])}<div class="pd-step"><span>${ord(n)}</span></div></div>`;
    el.innerHTML = `<p class="pd-title">${place === 1 ? 'You win!' : place <= 3 ? `${ord(place)} place!` : `${ord(place)} place`}</p>
      <div class="pd-steps">${step(2)}${step(1)}${step(3)}</div>
      ${place > 3 ? `<div class="pd-off me" data-place="${place}">${who(order[place - 1])}<small>${ord(place)}</small></div>` : ''}
      <p class="pd-skip">${matchMedia('(hover: none)').matches ? 'Tap' : 'Click, or press Enter,'} to continue</p>`;
    el.hidden = false; banner(''); celebrate(place);               // a second wave with the podium
    const done = () => { if (podium && podium.g === g) { hidePodium(); if (G === g) results(g); } };
    const key = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); done(); } };
    el.addEventListener('pointerdown', done, {once: true});
    addEventListener('keydown', key, true);
    podium = {g, place, order: order.map(o => (o.you ? 'you' : o.r.name)), key, t: setTimeout(done, FINISH.podiumMs)};
    el.focus({preventScroll: true});
  }
  function hidePodium() {
    if (!podium) return;
    clearTimeout(podium.t); removeEventListener('keydown', podium.key, true);
    const el = $('podium'); el.hidden = true; el.innerHTML = '';
    podium = null;
  }

  /* ---------- ?demo: hold Space = the right note in tune; D = drifting sharp (+25 cents, drifting to +45 over 4 s);
     F = the same drifting flat; W = a wrong note; E = centered but wobbly ---------- */
  let demoKey = null, demoSince = 0;
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (!G || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
      if (['space', 'd', 'f', 'w', 'e', 's', 'l', 'b'].includes(k)) { demoKey = k; demoSince = performance.now(); e.preventDefault(); }
    });
    addEventListener('keyup', e => { const k = e.key === ' ' ? 'space' : e.key.toLowerCase(); if (k === demoKey) { demoKey = null; A.Pitch.demoNote = null; } });
  }
  function demoDrive(now) {
    if (!A.DEMO || !G) return;
    const it = item();
    if (!demoKey || !it) { A.Pitch.demoNote = null; A.Pitch.demoLevel = null; return; }
    // the loudness: Space (and B) = the right dynamic for the zone you're in; S = soft, L = loud (from the volume check)
    const lv = dynLevels() || {soft: -30, loud: -14}, z = zoneNow(), lvl = n => Math.pow(10, (lv.soft + (lv.loud - lv.soft) * n) / 20);
    if (demoKey === 's') A.Pitch.demoLevel = lvl(0);
    else if (demoKey === 'l') A.Pitch.demoLevel = lvl(1);
    else if (z) { const [lo, hi] = dynWant(z); A.Pitch.demoLevel = lvl(clamp((Math.max(0, lo) + Math.min(1, hi)) / 2, 0, 1)); }
    else A.Pitch.demoLevel = null;
    if (G.phase === 'vcheck') { A.Pitch.demoJitter = 0.01; A.Pitch.demoNote = it.sounding; return; }
    // B = a BREAK at a slur's switch: 300 ms of silence, then the new note
    if (demoKey === 'b' && G.sl && G.sl.lap === G.lap && G.sl.switched && now - G.sl.at < 300) { A.Pitch.demoNote = null; return; }
    if (['space', 's', 'l', 'b'].includes(demoKey)) { A.Pitch.demoJitter = 0.01; A.Pitch.demoNote = it.sounding; }
    else if (demoKey === 'd' || demoKey === 'f') {                // drifting: +25 cents at first, +45 after 4 s (F: flat)
      // the wobble (±2) + jitter (±2) keep it under 50 cents: past that it reads as the next note (and the detector's
      // hysteresis can hold it there), a wrong note instead of a sharp one
      const off = .25 + .2 * Math.min(1, (now - demoSince) / 4000) + .02 * Math.sin(now / 260);
      A.Pitch.demoJitter = 0.04; A.Pitch.demoNote = it.sounding + (demoKey === 'd' ? off : -off);
    }
    else if (demoKey === 'e') { A.Pitch.demoJitter = 0.2; A.Pitch.demoNote = it.sounding; }         // centered, but wobbling ±10 cents
    else { A.Pitch.demoJitter = 0.02; A.Pitch.demoNote = it.sounding + 2; }
  }

  /* ---------- HUD ---------- */
  function staff(it, w = 200) {
    const sigW = A.keySigWidth(G.seq.sig), width = w + sigW;
    return A.staffSVG(inst.clef, [{n: it.show, x: (84 + sigW + width - 30) / 2}], {fit: G.seq.fit, keySig: G.seq.sig, width, label: `Play ${it.label}`});
  }
  /** a SLUR LAP's card: both notes joined by a slur arc (the current one dark, the other grey) */
  function slurStaff(a, b, w = 200, cur = 0) {
    const sigW = A.keySigWidth(G.seq.sig), width = w + sigW + 40, x0 = 84 + sigW + 26, x1 = width - 40;
    let svg = A.staffSVG(inst.clef, [{n: a.show, x: x0, color: cur === 1 ? 'var(--ink-2)' : null}, {n: b.show, x: x1, color: cur === 0 ? 'var(--ink-2)' : null}],
      {fit: G.seq.fit.concat([a.show, b.show]), keySig: G.seq.sig, width, label: `Slur ${a.label} to ${b.label}`});
    const ya = A.noteY(inst.clef, a.show), yb = A.noteY(inst.clef, b.show), y = Math.max(ya, yb) + 16;   // the arc under the heads
    return svg.replace('</svg>', `<path class="slur-arc" d="M${x0 + 4} ${ya + 12}Q${(x0 + x1) / 2} ${y + 22} ${x1 - 4} ${yb + 12}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`);
  }
  function drawNote() {
    const it = item(), i = Math.min(G.lap, G.items.length - 1), b = G.slurB[i];
    if (b) {
      const second = it === b;
      $('noteStaff').innerHTML = slurStaff(G.items[i], b, 200, second ? 1 : 0);
      $('noteName').textContent = second ? `→ ${b.label}` : `${G.items[i].label} ⌒ ${b.label}`;
    } else { $('noteStaff').innerHTML = staff(it); $('noteName').textContent = it.label; }
    $('noteCard').classList.toggle('slur', !!b);
    $('noteFlash').textContent = ''; $('noteCard').classList.remove('flash');
  }
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
      `<text class="g-lbl" x="${GA.cx - GA.r + 4}" y="${GA.cy + 18}">◀ flat</text><text class="g-lbl" x="${GA.cx + GA.r - 4}" y="${GA.cy + 18}" text-anchor="end">sharp ▶</text>` +
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
      pink: css('pink'), cyan: css('cyan'), red: css('red'), yellow: css('yellow'), amber: css('amber'), green: css('green'), purple: css('purple'), white: css('white-hi'),
      chrome: css('sw-chrome'), smoke: css('sw-smoke'), lamp: css('sw-lamp'), screen: css('screen'), ink: css('ink')};
  }
  function resize() {
    if (!G) return;
    const dpr = Math.min(1.5, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    C = C || colors();
    Object.assign(DYN_COL, {p: C.cyan, f: C.pink, cresc: C.amber, decresc: C.purple});
    scenery = buildScenery();
  }
  addEventListener('resize', resize);
  const HOR = () => H * .42;                                // the horizon
  /* THE SCENERY LAYERS (parallax, drawn once per size, then only copied): FAR = the distant skyline / mountains (slides
     a little with the bends), MID = the nearer row (slides more; the Grand Prix's grandstands and banners); the NEAR
     layer is the roadside things (scenery.js sprites) rushing past on the road itself, drawn each frame. LITE: far only. */
  function buildScenery() {
    const L = G.L, w = Math.ceil(W * 1.3), h = Math.ceil(HOR() + 2);
    let seed = G.lv * 97;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const layer = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const far = layer(), mid = layer(), gf = far.getContext('2d'), gm = mid.getContext('2d'), base = h - 1;
    const T = SC.timeOf(L);
    if (L.scene === 'mountain' || L.scene === 'desert' || L.scene === 'sunset') {
      [[gf, C.far, .45, 9], [gm, C.near, .3, 6]].forEach(([g, col, hh, n]) => {
        g.fillStyle = L.scene === 'desert' && g === gm ? css('sw-sand') : col; g.beginPath(); g.moveTo(0, base);
        for (let i = 0; i <= n; i++) {
          const x = i / n * w, peak = base - h * hh * (.45 + rnd() * .55);
          if (L.scene === 'desert') { g.lineTo(x, peak); g.lineTo(x + w / n * .6, peak); } else g.lineTo(x + w / n / 2, peak);
          g.lineTo(x + w / n, base - h * .05);
        }
        g.lineTo(w, base); g.closePath(); g.fill();
        if (L.scene === 'desert' && g === gm) { g.globalAlpha = .35; g.fillStyle = C.far; g.fill(); g.globalAlpha = 1; }
      });
      if (L.scene === 'mountain') { gf.strokeStyle = C.purple; gf.globalAlpha = .5; gf.lineWidth = 1; gf.stroke(); gf.globalAlpha = 1; }
    } else {
      // a city (river / harbor / grand prix variations): two rows of buildings with lit windows
      [[gf, C.far, .55, .6], [gm, C.near, .38, 1]].forEach(([g, col, hh, winA]) => {
        let x = 0;
        while (x < w) {
          const bw = w * (.02 + rnd() * .045), bh = h * hh * (.35 + rnd() * .65);
          g.fillStyle = col; g.fillRect(x, base - bh, bw, bh);
          g.fillStyle = C.win; g.globalAlpha = .55 * winA * (T.lights || T.body === 'none' ? 1.3 : .8);
          for (let yy = base - bh + 5; yy < base - 4; yy += 7) for (let xx = x + 3; xx < x + bw - 3; xx += 6) if (rnd() < .35) g.fillRect(xx, yy, 2, 3);
          if (T.body === 'none' && rnd() < .25) { g.globalAlpha = .9; g.fillStyle = rnd() < .5 ? C.pink : C.cyan; g.fillRect(x + 2, base - bh + 2, bw - 4, 2); }   // neon rooftops
          g.globalAlpha = 1;
          x += bw + (L.scene === 'harbor' ? w * .02 * rnd() : 1);
        }
      });
      if (L.scene === 'harbor') {                            // cranes over the water
        gm.strokeStyle = C.amber; gm.lineWidth = 2; gm.globalAlpha = .8;
        for (let i = 0; i < 3; i++) { const x = w * (.2 + i * .3); gm.beginPath(); gm.moveTo(x, base); gm.lineTo(x, base - h * .6); gm.lineTo(x + w * .1, base - h * .6); gm.moveTo(x - w * .03, base - h * .6); gm.lineTo(x, base - h * .6); gm.stroke(); }
        gm.globalAlpha = 1;
      }
      if (L.scene === 'grandprix') {                        // the GRANDSTANDS: tiers of fans and race banners across the horizon
        gm.clearRect(0, 0, w, h);
        const fans = [css('sw-crowd-1'), css('sw-crowd-2'), css('sw-crowd-3')], top = base - h * .3;
        gm.fillStyle = css('sw-stand'); gm.fillRect(0, top, w, base - top);
        for (let y = top + 4; y < base - 3; y += 4) for (let x = 2; x < w; x += 4) if (rnd() < .6) { gm.fillStyle = fans[Math.floor(rnd() * 3)]; gm.globalAlpha = .55 + rnd() * .4; gm.fillRect(x, y, 2, 2); }
        gm.globalAlpha = 1;
        gm.fillStyle = C.red; gm.fillRect(0, top - 3, w, 3);
        for (let x = w * .05; x < w; x += w * .16) {          // banners on the stand's roof: checkered and red
          gm.fillStyle = C.chrome; gm.fillRect(x, top - h * .16, 2, h * .16);
          if ((x / (w * .16)) % 2 < 1) SC.checker(gm, x + 2, top - h * .16, w * .06, h * .06, 6, 2, C.tire, C.white);
          else { gm.fillStyle = C.red; gm.fillRect(x + 2, top - h * .16, w * .06, h * .06); gm.fillStyle = C.white; gm.fillRect(x + 4, top - h * .13, w * .06 - 4, 2); }
        }
      }
    }
    // the time of day's light over the scenery (night darker; nothing for day)
    if (T.shade) [gf, gm].forEach(g => { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = T.shade; g.fillStyle = C.tunnel; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; });
    return {far, mid};
  }
  /* ---------- GRAPHICS: Auto (default) | Full | Lite (the Settings panel; gameData.gfx) ----------
     AUTO measures the frame time in the first seconds of a race (PERF): an average over PERF.ms = LITE for good on this
     device (gameData.gfxSlow), without a word. LITE = the far scenery layer only, no roadside things, no particles or
     weather, no blur, no shake, fewer speed lines. */
  const PERF = {from: .5, to: 3.5, ms: 22};
  const gfxMode = () => (['full', 'lite'].includes(gd.gfx) ? gd.gfx : 'auto');
  const lite = () => gfxMode() === 'lite' || (gfxMode() === 'auto' && !!gd.gfxSlow);
  function perfWatch(raw) {
    if (!G || gfxMode() !== 'auto' || gd.gfxSlow || G.phase !== 'race' || document.hidden || G.held) return;
    const t = (performance.now() - (G.liveAt || 0)) / 1000;
    if (t < PERF.from || raw > 250) return;
    const P = G.perf || (G.perf = {n: 0, sum: 0});
    if (t <= PERF.to) { P.n++; P.sum += raw; return; }
    if (P.done) return;
    P.done = true; P.avg = P.n ? P.sum / P.n : 0;
    if (P.n >= 10 && P.avg > PERF.ms) { gd.gfxSlow = true; save(); FX.clear(); }
  }
  A.UI.settings.register(box => {
    box.insertAdjacentHTML('beforeend', `<div class="ui-srow sw-gfx"><span class="ui-sname" id="swGfxL">Graphics<small>Lite is smoother on older devices</small></span>
      <div class="ui-seg" role="group" aria-labelledby="swGfxL">${['auto', 'full', 'lite'].map(m => `<button type="button" data-gfx="${m}" aria-pressed="${gfxMode() === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div>`);
    box.querySelectorAll('[data-gfx]').forEach(b => b.addEventListener('click', () => {
      gd.gfx = b.dataset.gfx; save(); FX.clear();
      box.querySelectorAll('[data-gfx]').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (A.Sfx) A.Sfx.event('ui-toggle');
    }));
  }, {title: 'Sustain Speedway'});

  /* ---------- SPEED FEEL + THE FINISH (Full graphics; the particles are scenery.js's pool) ---------- */
  const SC = A.SpeedwayScene, FX = SC.Particles(180);
  const noMotion = () => reduced.matches;                    // (Arcade.reducedMotion: the device's setting OR Motion off)
  function smoke(x, y, n, spread) {                           // tire smoke puffs from the rear tires
    if (lite()) return;
    for (let i = 0; i < n; i++) FX.add({kind: 'smoke', color: C.smoke, x: x + (Math.random() - .5) * spread, y: y - 2, vx: (Math.random() - .5) * 60, vy: 10 + Math.random() * 30,
      r: 4 + Math.random() * 5, grow: 26 + Math.random() * 20, life: .7 + Math.random() * .4, a: .55});
  }
  function celebrate(place) {                                 // confetti for 1st, sparkles for 2nd and 3rd
    if (lite() || place > 3) return;
    const cols = [C.pink, C.cyan, C.yellow, C.green, C.amber, C.white];
    if (place === 1) for (let i = 0; i < 90; i++) FX.add({kind: 'confetti', color: cols[i % cols.length], x: Math.random() * W, y: -Math.random() * H * .6,
      vx: (Math.random() - .5) * 40, vy: 70 + Math.random() * 90, r: 3 + Math.random() * 3, vr: (Math.random() - .5) * 8, life: 4 + Math.random() * 2, sway: 2 + Math.random() * 2});
    else for (let i = 0; i < 26; i++) FX.add({kind: 'spark', color: place === 2 ? C.white : C.amber, x: W * (.15 + Math.random() * .7), y: H * (.1 + Math.random() * .5),
      r: 4 + Math.random() * 5, life: .8 + Math.random() * .9, fadeIn: 0});
  }
  // world: 1 unit = one second at full speed. The road is drawn in bands from near to far.
  const SEG = 0.35, ZN = 1, ZF = 34, CAM = 1.1, PROP_GAP = 2.6;
  const curveAt = w => (reduced.matches ? .5 : 1) * (Math.sin(w * .09 + G.lv) * .9 + Math.sin(w * .031) * .6);
  const tunnelAt = (lapFrac) => G.L.tunnels && lapFrac > .28 && lapFrac < .72;
  let fxT = 0;
  function render(now) {
    if (!W) resize();
    const hor = HOR(), bot = H, LITE = lite(), still = noMotion(), T = SC.timeOf(G.L);
    const fdt = fxT ? Math.min(.1, (now - fxT) / 1000) : 0; fxT = now;
    const cam = G.world * 6, curve = curveAt(G.world);
    const lapFrac = G.phase === 'pit' ? 0 : G.dist / G.lens[G.lap];
    const inTunnel = G.phase === 'race' && tunnelAt(lapFrac);
    const light = inTunnel ? (S.state === 'on' ? .25 + .75 * S.I : .15) : 1;
    // NITRO: a light shake (never with reduced motion / Motion off, never in LITE)
    const shake = G.nitro && G.phase === 'race' && !still && !LITE;
    cx.save();
    if (shake) { cx.translate(Math.sin(now / 37) * 1.6, Math.cos(now / 29) * 1.2); G.fx.shook = (G.fx.shook || 0) + 1; }
    // THE SKY (cached per size and time of day), sliding a little with the bends
    cx.drawImage(SC.sky(G.L, W, hor), -W * .1 - curve * W * .03, 0);
    // THE SCENERY: far (slow) and mid (faster) layers
    if (scenery) {
      cx.drawImage(scenery.far, -W * .15 - curve * W * .04, hor - scenery.far.height + 1);
      if (!LITE) cx.drawImage(scenery.mid, -W * .15 - curve * W * .1, hor - scenery.mid.height + 1);
    }
    // the ground and its glowing grid
    cx.fillStyle = G.L.scene === 'river' || G.L.scene === 'harbor' ? C.water : css(T.ground);
    cx.fillRect(0, hor, W, bot - hor);
    cx.strokeStyle = C.grid; cx.lineWidth = 1;
    for (let k = 1; k < 16; k++) {                            // horizontal grid lines, rushing toward you
      const z = ZF / (k + ((cam / 4) % 1));
      const y = hor + (bot - hor) * CAM / z * 3.2; if (y > bot) continue;
      cx.globalAlpha = (.12 + .35 * (1 - z / ZF)) * T.grid; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
    }
    cx.globalAlpha = .22 * T.grid;
    for (let k = -12; k <= 12; k++) { cx.beginPath(); cx.moveTo(W / 2 + k * W * .012 - curve * W * .04, hor); cx.lineTo(W / 2 + k * W * .16, bot); cx.stroke(); }
    cx.globalAlpha = 1;
    // the road, far to near
    // a point z seconds up the road: its screen row, the road's half-width there, and its center (the road bends toward the horizon)
    const proj = z => ({y: hor + (bot - hor) * CAM / z * .95, w: W * .62 / z * ZN, x: W / 2 + curve * W * .35 * Math.pow(1 - ZN / z, 2)});
    const bands = 60;
    let prev = null;
    // the rumble strip on the side you're drifting to glows (a soft 2-a-second pulse; steady with reduced motion)
    const rumbleEdge = Math.abs(G.steer) >= R.steer.rumble && G.phase === 'race' ? Math.sign(G.steer) : 0;
    const rumbleGlow = still ? .55 : .45 + .25 * Math.sin(now / 80);
    // DYNAMICS ZONES ahead on this lap: a colored band on the road (+ a sign at its start, below); road units: 6 a second
    const zAt = d => 1.1 + (d - G.dist) * 6;
    const spans = G.phase === 'race' || G.phase === 'count' ? (G.zones[G.lap] || []).map(zn => ({z0: zAt(zn.from), z1: zAt(zn.to), zn})).filter(x => x.z1 > ZN && x.z0 < ZF) : [];
    let zPrev = ZF;
    for (let i = bands; i >= 0; i--) {
      const z = ZN + (ZF - ZN) * Math.pow(i / bands, 1.8);
      const p = proj(z);
      if (prev) {
        const band = spans.find(x => x.z0 < zPrev && x.z1 > z);
        const stripe = Math.floor((z + cam) / SEG) % 2 === 0;
        quad(prev, p, 1.12, stripe ? C.red : C.white, .9);                 // rumble strips: red and white
        if (!LITE && z < 14) { quad(prev, p, .012, C.tire, .5, 1.06); quad(prev, p, .012, C.tire, .5, -1.06); }   // their ridges
        quad(prev, p, 1, stripe ? C.road : C.road2, 1);                    // the road
        if (stripe) { quad(prev, p, .025, C.lane, .8, -.34); quad(prev, p, .025, C.lane, .8, .34); }   // lane dashes
        if (rumbleEdge && z < 9) quad(prev, p, .09, C.yellow, rumbleGlow * (1 - z / 9), rumbleEdge * 1.03);   // the strip you're on lights up
        if (band) quad(prev, p, .98, DYN_COL[band.zn.kind], .2);
      }
      prev = p; zPrev = z;
    }
    // THE FINISH GATE on the last lap: a checkered line on the road and a banner over it (road units: 6 per second)
    const last = G.lap === G.lens.length - 1 && (G.phase === 'race' || G.phase === 'done');
    if (last) {
      const z = 1.1 + Math.max(0, G.lens[G.lap] - G.dist) * 6;
      if (z < ZF && z > ZN) {
        const a = proj(z), b = proj(z + .35);
        cx.save(); cx.beginPath(); cx.moveTo(a.x - a.w, a.y); cx.lineTo(a.x + a.w, a.y); cx.lineTo(b.x + b.w, b.y); cx.lineTo(b.x - b.w, b.y); cx.closePath(); cx.clip();
        SC.checker(cx, a.x - a.w, b.y, a.w * 2, Math.max(1, a.y - b.y), 14, 2, C.tire, C.white); cx.restore();
        SC.gate(cx, a, C);
      }
    }
    // THE NEAR LAYER: roadside things rushing past (every PROP_GAP road units, alternating sides), far first
    if (!LITE && G.props.length) {
      for (let k = Math.floor((cam + ZF) / PROP_GAP); k * PROP_GAP > cam + ZN; k--) {
        const z = k * PROP_GAP - cam, pr = G.props[((k % G.props.length) + G.props.length) % G.props.length], side = k % 2 ? 1 : -1;
        const p = proj(z), spr = SC.propSprite(pr), sh = p.w * (pr.kind === 'stand' ? .8 : pr.kind === 'lamp' || pr.kind === 'banner' || pr.kind === 'bulbs' ? 1.25 : .9);
        const sw = sh * spr.width / spr.height, x = p.x + side * p.w * 1.3;
        if (x + sw < 0 || x - sw > W || sh < 2) continue;
        cx.globalAlpha = Math.min(1, (ZF - z) / 8);
        if (side < 0) cx.drawImage(spr, x - sw, p.y - sh, sw, sh);
        else { cx.save(); cx.translate(x + sw, p.y - sh); cx.scale(-1, 1); cx.drawImage(spr, 0, 0, sw, sh); cx.restore(); }   // mirrored on the right
        if (pr.kind === 'lamp' && pr.lit) { cx.globalAlpha *= .1; cx.fillStyle = C.lamp; cx.beginPath(); cx.ellipse(p.x + side * p.w * .75, p.y, p.w * .5, p.w * .08, 0, 0, Math.PI * 2); cx.fill(); }   // its pool of light
      }
      cx.globalAlpha = 1;
    }
    // the ROADSIDE SIGNS: each dynamics zone's marking at its start, and a slur lap's SLUR sign at the switch
    spans.forEach(x => { if (x.z0 > ZN + .3) roadSign(proj(x.z0), x.zn.kind); });
    if (G.phase === 'race' && G.slurB[G.lap] && !(G.sl && G.sl.switched)) { const z = zAt(G.lens[G.lap] / 2); if (z > ZN + .3 && z < ZF) roadSign(proj(z), 'slur'); }
    // weather near the horizon: MIST (a low fog band), HAZE (heat shimmer color), the spooky season's FOG
    const fog = !LITE && (G.L.weather === 'mist' || G.L.weather === 'haze' || (G.season && G.season.fog));
    if (fog) {
      const col = G.L.weather === 'haze' ? css('sw-haze') : css('sw-fog'), fg = G.fogGrad || (G.fogGrad = {});
      const key = `${W}|${H}|${col}`;
      if (fg.key !== key) { const g = cx.createLinearGradient(0, hor - H * .12, 0, hor + H * .22); g.addColorStop(0, 'transparent'); g.addColorStop(.45, col); g.addColorStop(1, 'transparent'); fg.key = key; fg.g = g; }
      cx.globalAlpha = G.L.weather === 'haze' ? .22 : .3; cx.fillStyle = fg.g; cx.fillRect(0, hor - H * .12, W, H * .34); cx.globalAlpha = 1;
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
    // every car's REAL distance ahead of you (0 before GO); placeCars adds the starting grid on top (drawing only)
    G.rivals.forEach((r, i) => cars.push({d: G.phase === 'count' ? 0 : toDist(paceProgress(r.pace, G.clock)) - myD, who: r, idx: i, name: r.name}));
    // the ghost isn't on the starting grid: it joins once the grid has faded (it would sweep through the pack)
    const gp = G.phase !== 'count' && gridAmount() === 0 ? ghostProgress(G.clock) : null;
    if (gp !== null) cars.push({d: toDist(gp) - myD, who: G.ghostCar || (G.ghostCar = {}), idx: G.rivals.length, look: G.car, ghost: true, name: 'Best run', steer: ghostSteer(G.clock)});   // the ghost = your own car, see-through
    // THE TEACHER'S GHOST: a gold see-through car with the teacher's name over it
    const tp = G.teacher && G.phase !== 'count' && gridAmount() === 0 ? ghostProgress(G.clock, G.teacher) : null;
    if (tp !== null) cars.push({d: toDist(tp) - myD, who: G.teacherCar || (G.teacherCar = {}), idx: G.rivals.length + 1, look: {body: 'openwheel', color: css('sw-teacher-gold'), decal: 'stripes'},
      ghost: true, teacher: true, name: G.teacher.name});
    // your car, from behind (drawn last, so it's on top; its box is where nobody else may be drawn)
    const sway = still ? 0 : -curve * W * .02;
    const mine = {x: W / 2 + sway, y: bot - H * .04, w: Math.min(W * .24, H * .42)};
    // PITCH STEERING: the road's half-width where the car sits; the steer (−1 … 1) moves the car's center up to the edge
    const road = proj(CAM * .95 * (bot - hor) / Math.max(1, mine.y - hor));
    mine.x += G.steer * Math.max(0, road.w - mine.w * .5);
    const rumbleSide = Math.abs(G.steer) >= R.steer.rumble && G.phase === 'race' ? (G.steer < 0 ? 'l' : 'r') : '';
    if (rumbleSide && !still) { mine.x += Math.sin(now / 28) * Math.max(1, W * .002); mine.y += Math.sin(now / 19); }   // the rumble: a small wobble
    steerWord(rumbleSide);
    G.carX = mine.x - W / 2;
    const sky = css(T.rim);                                   // the rim light on every car: the time of day's
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const placed = placeCars(cars, proj, mine, now);
    placed.forEach(c => Cars.draw(cx, c.x, c.y, c.w, Object.assign({}, c.look || {body: c.who.body || 'coupe', color: C[c.who.color] || C.cyan, decal: 'none'},
      {sky, dpr, t: now, reduced: still, alpha: c.teacher ? .55 : c.ghost ? .38 : 1})));
    placed.filter(c => c.teacher).forEach(c => nameTag(c.x, c.box.t - 4, c.name, Math.max(10, Math.min(16, c.w * .16))));
    // TIRE SMOKE: a burst at GO, and while braking hard (scaled by the speed)
    if (!LITE && G.phase === 'race') {
      if (G.liveAt && !G.fx.goSmoke) { G.fx.goSmoke = true; smoke(mine.x, mine.y, 14, mine.w * .7); }
      if (S.state === 'wrong' && G.v > .05 && Math.random() < G.v * 1.6) smoke(mine.x, mine.y, 1, mine.w * .6);
    }
    FX.step(fdt, W, H);
    // the smoke goes under your car; everything else in the air over it
    // THE TRAIL (the garage's PARTS): behind your car at speed, never in LITE or with reduced motion
    const trail = G.car.trail;
    if (!LITE && !still && trail && trail !== 'none' && G.phase === 'race' && G.v > .45) {
      if (trail === 'streak') {
        [-1, 1].forEach(sd => { const tx = mine.x + sd * mine.w * .3, g = cx.createLinearGradient(0, mine.y - mine.w * .2, 0, H);
          g.addColorStop(0, C.tail || C.red); g.addColorStop(1, 'transparent'); cx.globalAlpha = .35 * Math.min(1, G.v); cx.fillStyle = g;
          cx.fillRect(tx - mine.w * .02, mine.y - mine.w * .2, mine.w * .04, H - mine.y + mine.w * .2); });
        cx.globalAlpha = 1;
      } else if (Math.random() < G.v * .9) {
        const kind = trail === 'notes' ? 'note' : 'spark', col = trail === 'stars' ? C.yellow : trail === 'notes' ? C.white : C.cyan;
        FX.add({kind, under: true, color: col, x: mine.x + (Math.random() - .5) * mine.w * .6, y: mine.y - mine.w * .15, vx: (Math.random() - .5) * 70, vy: 70 + Math.random() * 90,
          r: trail === 'stars' ? 5 + Math.random() * 3 : 3 + Math.random() * 2, life: .55 + Math.random() * .3});
      }
    }
    FX.draw(cx, C, p => p.kind === 'smoke' || p.under);
    Cars.draw(cx, mine.x, mine.y, mine.w, Object.assign({}, G.car, {sky, dpr, t: now, reduced: still, lite: LITE, nitro: G.nitro && G.phase === 'race', braking: S.state === 'wrong'}));
    // SPEED LINES at the screen's edges, growing with the speed (fewer in LITE; none with reduced motion)
    const sp = clamp((G.v - .35) / .8, 0, 1);
    if (!still && sp > 0 && G.phase === 'race') {
      cx.strokeStyle = C.white; cx.lineWidth = 1.5;
      const n = LITE ? 4 : 10;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, k = ((now / (900 - 400 * sp) + i * .173) % 1);
        const y = hor + (bot - hor) * (.15 + .85 * ((i * .37) % 1)), x = side < 0 ? W * (.02 + .08 * k) : W * (.98 - .08 * k), len = W * (.03 + .12 * sp) * k;
        cx.globalAlpha = .35 * sp * Math.sin(Math.PI * k); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + side * len, y + len * .35); cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    // nitro speed lines (not with reduced motion)
    if (G.nitro && !still) {                                  // short streaks rushing past the sides of the road
      cx.strokeStyle = C.nitro; cx.lineWidth = 2;
      for (let i = 0; i < (LITE ? 6 : 12); i++) {
        const side = i % 2 ? 1 : -1, k = ((now / 700 + i * .37) % 1), x0 = W / 2 + side * W * (.18 + (i % 3) * .07);
        const y = hor + (bot - hor) * k * k, x = x0 + side * W * .35 * k * k, len = 10 + 50 * k;
        cx.globalAlpha = .15 + .45 * k; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + side * len * .9, y + len * .5); cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    // WEATHER + SEASONAL AIR (snow, petals, leaves, rain, bats, notes, hearts) and the finish's confetti / sparkles
    if (!LITE) SC.fillAir(FX, G.air, W, H, hor);
    FX.draw(cx, C, p => p.kind !== 'smoke' && !p.under);
    // NITRO MOTION BLUR (Full graphics only): long soft streaks fanning out from the vanishing point toward the edges
    // (cheap lines: redrawing the frame over itself cost old iPads too much)
    if (shake) {
      cx.strokeStyle = C.white; cx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2, k = ((now / 420 + i * .29) % 1), r0 = Math.max(W, H) * (.35 + .5 * k), r1 = r0 + Math.max(W, H) * .12;
        cx.globalAlpha = .1 * Math.sin(Math.PI * k);
        cx.beginPath(); cx.moveTo(W / 2 + Math.cos(a) * r0, hor + Math.sin(a) * r0 * .6); cx.lineTo(W / 2 + Math.cos(a) * r1, hor + Math.sin(a) * r1 * .6); cx.stroke();
      }
      cx.globalAlpha = 1;
    }
    cx.restore();
    // THE CHECKERED FLAG, waving as you cross (still with reduced motion)
    if (G.phase === 'done' && G.fx.flagAt && now - G.fx.flagAt < 1500) SC.flag(cx, W * .5 - Math.min(W * .2, 150) / 2, H * .08, Math.min(W * .2, 150), now, still, C);
  }
  /** the name tag over the teacher's ghost car */
  function nameTag(x, y, text, size) {
    cx.font = `700 ${Math.round(size)}px ${css('text') || 'sans-serif'}`; cx.textAlign = 'center'; cx.textBaseline = 'bottom';
    const w = cx.measureText(text).width + size;
    cx.globalAlpha = .9; cx.fillStyle = C.tunnel; cx.fillRect(x - w / 2, y - size * 1.35, w, size * 1.35);
    cx.strokeStyle = css('sw-teacher-gold'); cx.lineWidth = 1.5; cx.strokeRect(x - w / 2, y - size * 1.35, w, size * 1.35);
    cx.fillStyle = css('sw-teacher-gold'); cx.globalAlpha = 1; cx.fillText(text, x, y - size * .15);
  }
  /* a big roadside sign on the right: p / f (bold italic, like printed music), the cresc. / decresc. hairpins, a slur */
  const DYN_COL = {};
  function roadSign(p, kind) {
    const col = kind === 'slur' ? C.green : DYN_COL[kind], bw = p.w * .62, bh = p.w * .4, x = p.x + p.w * 1.2, y = p.y - p.w * .78;
    if (bh < 3 || x > W + bw) return;
    cx.fillStyle = C.chrome; cx.fillRect(x + bw * .45, y + bh, Math.max(1, bw * .06), p.y - y - bh);
    cx.fillStyle = C.screen; cx.strokeStyle = col; cx.lineWidth = Math.max(1, bh * .08);
    cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, bw, bh, bh * .15) : cx.rect(x, y, bw, bh); cx.fill(); cx.stroke();
    cx.fillStyle = C.ink; cx.strokeStyle = C.ink; cx.lineWidth = Math.max(1, bh * .07);
    if (kind === 'p' || kind === 'f') { cx.font = `italic 700 ${Math.round(bh * .8)}px Georgia, 'Times New Roman', serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(kind, x + bw / 2, y + bh * .52); }
    else if (kind === 'slur') { cx.beginPath(); cx.moveTo(x + bw * .15, y + bh * .4); cx.quadraticCurveTo(x + bw / 2, y + bh * .95, x + bw * .85, y + bh * .4); cx.stroke(); }
    else {
      const l = x + bw * .12, r = x + bw * .88, m = y + bh / 2, o = bh * .3;
      cx.beginPath();
      if (kind === 'cresc') { cx.moveTo(r, m - o); cx.lineTo(l, m); cx.lineTo(r, m + o); } else { cx.moveTo(l, m - o); cx.lineTo(r, m); cx.lineTo(l, m + o); }
      cx.stroke();
    }
  }
  /* ---------- NO TWO CARS EVER OVERLAP ON SCREEN, AND NOTHING GLITCHES ----------
     Three lanes (the road's dashes at ±.34): the other cars keep to a side lane (rivals left, right, left…; the ghost
     right); the middle lane is yours, and they use it only well up the road from you. Drawing only: the real progress,
     positions, times and the standings are never touched.
     THE STARTING GRID: before GO and for the first GRID.hold s of the race every rival sits in a fixed slot (2 a row,
     GRID.d0 up the road, GRID.row between rows, lane by its index), drawn exactly there; over the next GRID.blend s
     the grid offset fades out, so the cars leave the grid smoothly as their pace separates them. The ghost (your best
     run) joins once the grid is gone.
     STABLE LANES after that (memory on each car: lane, off, blockedAt, movedAt, dd): a car keeps its lane until it has
     been blocked LANE_BLOCK_MS in a row, and after a change it stays LANE_STAY_MS; lane moves slide at LANE_SPEED
     (never a jump, the first frame included: a car appears in its own lane). Ties in the order are broken by the
     car's index, and cars are placed in the order they were DRAWN last frame, so nothing flips between frames.
     NO POSITION JUMPS: a car that must be held back so it doesn't overlap has its DRAWN distance eased (EASE a
     second) toward the clear spot and back; it is never drawn over another car or over yours (if the eased spot
     would touch one, it takes the clear spot at once). Reduced motion: no sliding (lane and hold-back changes are
     instant) and still at most one lane change per LANE_STAY_MS per car. */
  const LANES = [-.67, .67, 0];                            // offsets in road half-widths: left, right, the middle
  const LANE_SPEED = 4;                                    // lane changes: half-widths a second
  const LANE_BLOCK_MS = 400, LANE_STAY_MS = 1500, EASE = 12, EASE_MAX = 2.5;   // EASE_MAX: road units a second at most
  const GRID = {d0: .5, row: .55, hold: 1.5, blend: 2.5};
  const carBox = (x, y, w) => ({l: x - w * .5, r: x + w * .5, t: y - w * .42 * 1.12, b: y + 2});
  const hits = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const homeOf = i => (i % 2 ? 1 : -1);                    // left, right, left… (the ghost's index comes after the rivals')
  const gridD = i => GRID.d0 + Math.floor(i / 2) * GRID.row;
  /** how much of the starting grid is still drawn: 1 before GO and for GRID.hold s, then fading to 0 */
  const gridAmount = () => (G.phase === 'count' ? 1 : G.clock < GRID.hold ? 1 : Math.max(0, 1 - (G.clock - GRID.hold) / GRID.blend));
  let laneT = 0;
  function placeCars(cars, proj, mine, now) {
    const dt = laneT ? Math.min(.1, (now - laneT) / 1000) : 0; laneT = now;
    const grid = gridAmount(), still = reduced.matches;
    const at = (c, off, d) => { const p = proj(ZN + d * 4.4), w = p.w * .42, x = p.x + (off + (c.steer || 0) * .28) * p.w; return {x, y: p.y, w, box: carBox(x, p.y, w)}; };   // the ghost replays its own steering in its lane
    const taken = [carBox(mine.x, mine.y, mine.w)];
    const clear = box => !taken.some(t => hits(t, box));
    const off = k => LANES[k === -1 ? 0 : k === 1 ? 1 : 2];
    const out = [];
    cars.forEach(c => { c.target = c.d + grid * gridD(c.idx); });
    // THE ORDER never flips: by where each car was DRAWN last frame (else its target), ties by index; the nearer car
    // claims its spot first and a car behind it in the same lane is pushed up the road a little at a time
    const key = c => (c.who.dd != null && c.who.seenAt != null && now - c.who.seenAt <= 250 ? c.who.dd : c.target);
    cars.filter(c => c.target > .05 && c.target < 7).sort((a, b) => key(a) - key(b) || a.idx - b.idx).forEach(c => {
      const o = c.who, home = homeOf(c.idx);
      const back = o.seenAt == null || now - o.seenAt > 250;               // (re)appearing: in its own lane, where it is
      if (o.lane == null) { o.lane = home; o.off = off(home); o.movedAt = -1e9; o.blockedAt = null; }
      if (grid > 0) { o.lane = home; o.blockedAt = null; }                  // on the grid: its slot, no lane logic
      else if (clear(at(c, off(o.lane), c.target).box)) o.blockedAt = null;
      else {
        if (o.blockedAt == null) o.blockedAt = now;
        if (now - o.blockedAt >= LANE_BLOCK_MS && now - o.movedAt >= LANE_STAY_MS) {
          const k = (o.lane === 0 ? [home, -home] : [-o.lane, 0]).find(k => clear(at(c, off(k), c.target).box));
          if (k !== undefined) { o.lane = k; o.movedAt = now; o.blockedAt = null; }
        }
      }
      const tOff = off(o.lane);
      o.off = still || back ? tOff : o.off + Math.max(-LANE_SPEED * dt, Math.min(LANE_SPEED * dt, tOff - o.off));
      // the clear spot: at the car's target, else a little farther up the road
      let need = c.target, pos = at(c, o.off, need);
      while (!clear(pos.box) && need < 7) { need += .03; pos = at(c, o.off, need); }
      if (!clear(pos.box)) return;                                          // (never: nothing drawn over another car)
      let d = still || back || !dt ? need : o.dd + Math.max(-EASE_MAX * dt, Math.min(EASE_MAX * dt, (need - o.dd) * Math.min(1, dt * EASE)));
      pos = at(c, o.off, d);
      if (!clear(pos.box)) { d = need; pos = at(c, o.off, d); }             // the eased spot would touch a car: the clear one
      o.dd = d; o.seenAt = now;
      taken.push(pos.box);
      out.push(Object.assign({}, c, pos, {drawnD: d}));
    });
    G.carsDrawn = out.map(c => ({name: c.name || null, idx: c.idx, body: c.look ? c.look.body : c.who.body || 'coupe', ghost: !!c.ghost, lane: c.who.lane, grid: +grid.toFixed(2),
      d: +c.d.toFixed(3), drawnD: +c.drawnD.toFixed(3), off: +c.who.off.toFixed(2), box: c.box}));
    G.carsDrawn.push({name: 'you', body: G.car.body, box: taken[0]});
    return out.sort((a, b) => b.drawnD - a.drawnD || b.idx - a.idx);        // far first
  }
  /** one band of the road between two projected rows: `k` = its width (share of the road), `off` = its center offset */
  function quad(a, b, k, col, alpha, off = 0) {
    cx.fillStyle = col; cx.globalAlpha = alpha; cx.beginPath();
    cx.moveTo(a.x + (off - k) * a.w, a.y); cx.lineTo(a.x + (off + k) * a.w, a.y);
    cx.lineTo(b.x + (off + k) * b.w, b.y); cx.lineTo(b.x + (off - k) * b.w, b.y);
    cx.closePath(); cx.fill(); cx.globalAlpha = 1;
  }
  const carName = c => { const b = window.SPEEDWAY_GARAGE.bodies.find(x => x.id === c.body); return b ? b.name : 'Coupe'; };
  function garageDot() {                                     // the "new" dot (and the button's name says so too) + THE NEXT UNLOCK
    const n = Garage.fresh().length;
    $('garageDot').hidden = !n;
    $('garageBtn').setAttribute('aria-label', n ? 'Garage: new items' : 'Garage');
    const nx = Garage.nextUnlock(), el = $('garageNext');
    el.hidden = !nx;
    if (nx) el.innerHTML = `<span class="gn-k">Next unlock</span> <b>${nx.name}</b> <small>(${nx.what.toLowerCase()})</small>: ${nx.text}${nx.progress ? ` <span class="gn-p">· ${nx.progress}</span>` : ''}`;
  }
  $('garageBtn').addEventListener('click', () => Garage.open({onClose: garageDot}));

  /* ---------- BREATH STATS: the longest STEADY HOLD (unbroken tone within the difficulty's tolerance) ----------
     gameData.breath[member] = {best (s), notes: {<written note>: {s, m (midi, for the order)}}, hist: [{d, best}] (the
     last RULES.breath.history races)}. breathRecord(g) saves a race and says whether it set a new record. */
  const B = R.breath;
  function breathRecord(g) {
    const all = (gd.breath = gd.breath || {}), me = (all[who] = all[who] || {best: 0, notes: {}, hist: []});
    const notes = Object.values(g.notes).filter(st => st.hold >= B.minSec);
    const race = notes.reduce((a, st) => Math.max(a, st.hold), 0), prev = me.best || 0;
    const newNotes = [];
    notes.forEach(st => {
      const k = st.key, old = me.notes[k];
      if (!old || st.hold > old.s + .05) { if (old) newNotes.push(k); me.notes[k] = {s: +st.hold.toFixed(1), m: noteMidiOf(g, k)}; }
    });
    const rec = race >= B.minSec && race > prev + .05;
    if (race >= B.minSec) { me.hist.push({d: dayKey(), best: +race.toFixed(1)}); while (me.hist.length > B.history) me.hist.shift(); }
    if (rec) me.best = +race.toFixed(1);
    return {race, prev, rec: rec && prev > 0, first: rec && !prev, newNotes};
  }
  const noteMidiOf = (g, k) => { const it = g.items.concat(g.slurB.filter(Boolean)).find(x => noteKey(x) === k); return it ? it.midi : null; };   // (written)
  const fmtS = s => `${s.toFixed(1)} s`;
  function spark(hist) {                                        // a tiny bar chart of the last races' longest holds
    if (!hist || hist.length < 2) return '';
    const max = Math.max(...hist.map(h => h.best)), w = 8, gap = 3, H = 26;
    return `<svg class="rec-spark" viewBox="0 0 ${hist.length * (w + gap)} ${H}" role="img" aria-label="Your last ${hist.length} races: ${hist.map(h => h.best).join(', ')} seconds">${
      hist.map((h, i) => { const hh = Math.max(2, h.best / max * (H - 2)); return `<rect x="${i * (w + gap)}" y="${H - hh}" width="${w}" height="${hh}" rx="2"${i === hist.length - 1 ? ' class="last"' : ''}/>`; }).join('')}</svg>`;
  }
  function trendWord(hist) {
    if (!hist || hist.length < 3) return '';
    const n = hist.length, recent = hist.slice(-3).reduce((a, h) => a + h.best, 0) / 3, earlier = hist.slice(0, n - 3).concat(hist.slice(0, 1)).reduce((a, h) => a + h.best, 0) / Math.max(1, n - 3 + 1);
    return recent > earlier + .3 ? '▲ getting longer!' : recent < earlier - .3 ? '▼ a bit shorter lately' : '● steady';
  }
  /** THE PERSONAL RECORDS panel on the track select (this instrument) */
  function drawRecords() {
    const me = ((gd.breath || {})[who]) || null, box = $('records');
    if (!me || !me.best) { box.hidden = true; box.innerHTML = ''; return; }
    const notes = Object.entries(me.notes || {}).sort((a, b) => b[1].s - a[1].s).slice(0, 8);
    box.hidden = false;
    box.innerHTML = `<h2 class="rec-title" id="recT">Personal records <small>${member.short}</small></h2>
      <div class="rec-main"><div><small>Longest steady hold</small><b id="recBest">${fmtS(me.best)}</b></div>
        <div class="rec-trend">${spark(me.hist)}<span>${trendWord(me.hist)}</span></div></div>
      ${notes.length ? `<ul class="rec-notes">${notes.map(([k, v]) => `<li><b>${k.replace(/(\d)$/, '<sub>$1</sub>')}</b> ${fmtS(v.s)}</li>`).join('')}</ul>` : ''}`;
  }

  /* ---------- THE TEACHER GHOST CHALLENGE (teacher-ghosts.js; ?teacher saves one) ----------
     THE CODE: "SSG1-<payload>-<check>". payload = 1~track~notes~order~difficulty~total tenths~progress, where progress
     = the ghost samples (one every RULES.ghostEvery s) as thousandths of a lap, stored as the steps between samples in
     base 36, with runs written "step*count" (so a steady drive is a few characters). check = FNV-1a of the payload, base
     36. A code that doesn't decode, checks out wrong, or doesn't fit its track is ignored (?demo: a console warning). */
  const TEACHER_MODE = /[?&]teacher(=|&|$)/.test(location.search);
  const fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36).padStart(7, '0'); };
  function ghostCode(g) {
    const q = g.ghostRec.map(p => Math.round(p * 1000)), steps = q.map((v, i) => Math.max(0, i ? v - q[i - 1] : v));
    const runs = [];
    steps.forEach(v => { const r = runs[runs.length - 1]; if (r && r[0] === v) r[1]++; else runs.push([v, 1]); });
    const prog = runs.map(([v, n]) => v.toString(36) + (n > 1 ? '*' + n.toString(36) : '')).join('.');
    const payload = ['1', g.lv, picker.state.notes, picker.state.order, g.diff.id, Math.round(g.clock * 10), prog].join('~');
    return `SSG1-${payload}-${fnv(payload)}`;
  }
  function decodeGhost(code) {
    const m = /^SSG1-([^-]+)-([0-9a-z]{7})$/.exec(String(code || '').trim());
    if (!m || fnv(m[1]) !== m[2]) return null;
    const f = m[1].split('~');
    if (f.length !== 7 || f[0] !== '1') return null;
    const lv = +f[1], L = TRACKS[lv - 1], t = +f[5] / 10;
    if (!L || !DIFF.some(d => d.id === f[4]) || !(t > 0)) return null;
    const q = []; let acc = 0;
    for (const tok of f[6].split('.')) {
      const [v, n] = tok.split('*'), step = parseInt(v, 36), times = n ? parseInt(n, 36) : 1;
      if (!(step >= 0) || !(times >= 1) || times > 5000) return null;
      for (let i = 0; i < times; i++) { acc += step; q.push(acc / 1000); }
    }
    if (q.length < 2 || Math.abs(q[q.length - 1] - L.laps) > .01) return null;     // it must finish that track
    return {lv, notes: f[2], order: f[3], diff: f[4], t, p: q};
  }
  let TG = null;
  function teacherGhosts() {
    if (TG) return TG;
    TG = {};
    (window.SPEEDWAY_TEACHER_GHOSTS || []).forEach((e, i) => {
      try {
        const g = e && decodeGhost(e.code);
        if (!g) { if (A.DEMO) console.warn(`Sustain Speedway: teacher ghost #${i + 1} (${e && e.name}) is not a valid code: ignored`); return; }
        const cur = TG[g.lv], week = String(e.week || '');
        if (!cur || week >= cur.week) TG[g.lv] = Object.assign(g, {name: String(e.name || 'Teacher').slice(0, 30), week});
      } catch (err) { if (A.DEMO) console.warn('Sustain Speedway: a teacher ghost was ignored', err); }
    });
    return TG;
  }
  const teacherFor = lv => teacherGhosts()[lv] || null;
  function showGhostCode(g) {
    const code = ghostCode(g), today = dayKey();
    const line = `{name: "Mr. Graham", week: "${today}", code: "${code}"},`;
    A.UI.confirm({title: 'Teacher ghost', yes: 'Done', no: null,
      text: `Paste this into <b>sustain-speedway/teacher-ghosts.js</b> on GitHub (one line in the list; change the name if you like).`,
      extra: `<textarea class="tg-code" id="tgCode" readonly rows="5" aria-label="Teacher ghost code">${line}</textarea>
        <p class="tg-meta">${g.L.name} · ${fmt(g.clock)} · ${g.diff.name} · ${picker.state.label || picker.state.notes}</p>
        <button type="button" class="btn btn-secondary btn-small" id="tgCopy">Copy</button>`});
    const ta = $('tgCode'), cp = $('tgCopy');
    cp.addEventListener('click', () => {
      ta.select();
      const ok = () => { cp.textContent = 'Copied!'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(line).then(ok, () => { try { document.execCommand('copy'); ok(); } catch (e) { /* select it by hand */ } });
      else { try { document.execCommand('copy'); ok(); } catch (e) { /* select it by hand */ } }
    });
    return code;
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
    A.store.setLevel(key, who, g.lv, {stars: Math.max(stars, old.stars), best: old.best ? Math.min(old.best, tenths) : tenths}, stars);
    // the ghost car = your best run on this track, mode and instrument; best lap too
    gd.ghosts = gd.ghosts || {}; gd.bestLap = gd.bestLap || {};
    if (!gd.ghosts[rk] || total < gd.ghosts[rk].t) gd.ghosts[rk] = {t: +total.toFixed(2), p: g.ghostRec, s: g.steerRec};   // s = its steering
    const bestLap = Math.min(...g.lapTimes), oldLap = gd.bestLap[rk], newLap = !oldLap || bestLap < oldLap - 0.05;
    if (newLap) gd.bestLap[rk] = +bestLap.toFixed(2);
    if (pos === 1 && g.diff.id === 'virtuoso') (gd.achievements = gd.achievements || {})['virtuoso-win'] = true;   // the Helmet skin
    if (pos === 1) gd.wins = (gd.wins || 0) + 1;
    save();
    const tuning = report(g);                                   // THE INTONATION REPORT (+ the history it adds to)
    const breath = breathRecord(g);                             // BREATH STATS
    // THE TEACHER'S GHOST: beaten = the Teacher's Gold paint (once)
    const tg = g.teacher ? {name: g.teacher.name, by: g.teacher.t - total} : null;
    if (tg && tg.by > 0) (gd.achievements = gd.achievements || {})['teacher-ghost'] = true;
    save();
    const fresh = Garage.fresh();                               // NEW IN THE GARAGE! (earned by this race)
    // the numbers
    const n = g.laps.reduce((a, l) => a + l.n, 0), avg = n ? g.laps.reduce((a, l) => a + l.abs, 0) / n : 0;
    const hasNext = g.lv < TRACKS.length && (pos === 1 || A.DEMO);
    A.UI.results.show({gameId: GAME_ID, wide: true, stars,
      hero: `<p class="res-pos p${pos}" id="resPos">${ord(pos)} place</p><img class="res-car" id="resCar" alt="Your car: ${carName(g.car)}" src="${Cars.thumbURL(Object.assign({}, g.car, {sky: css('sw-sky-low')}), 170)}">`,
      title: pos === 1 ? 'Race won!' : stars ? 'On the podium!' : 'Race finished',
      msg: pos === 1 ? (g.lv < TRACKS.length ? `You won ${g.L.name}! The next track is open.` : 'You won The Grand Prix!')
        : `Finish 1st to open the next track. Faster = more in tune and steadier, and fewer breaths in the middle of a lap.`,
      tiles: [['Total time', fmt(total), 'resTime'], ['Best lap', `${bestLap.toFixed(1)} s`, 'resLap'], ['Avg. off', n ? `${Math.round(avg)}¢` : '–', 'resCents'],
        ['In the zone', `${Math.round(g.driveTime ? g.zoneTime / g.driveTime * 100 : 0)}%`, 'resZone']],
      newBest: newBest && !!old.best, newBestText: 'New best time!',
      best: [old.best ? `Best time: ${fmt(Math.min(old.best, tenths) / 10)}` : '', newLap && oldLap ? `New best lap: ${bestLap.toFixed(1)} s!` : ''].filter(Boolean).join(' · '),
      // THE BUTTONS FIRST (actsFirst): then NEW IN THE GARAGE! (its filled GARAGE button), then the race's details
      actsFirst: true,
      extra: (fresh.length ? Garage.cardHTML(fresh) : '') + `<h3 class="res-more" id="resMore">Race details</h3>`
        + (tg ? `<p class="res-tg ${tg.by > 0 ? 'won' : ''}" id="resTeacher">${tg.by > 0 ? `You beat ${tg.name}'s ghost by ${tg.by.toFixed(1)} s!` : `${tg.name}'s ghost won by ${Math.max(.1, -tg.by).toFixed(1)} s: try again!`}</p>` : '')
        + (breath.race >= B.minSec ? `<p class="res-breath" id="resBreath">Longest steady hold: <b>${fmtS(breath.race)}</b>${breath.rec || breath.first ? ' <span class="br-new">(new record!)</span>' : ''}${breath.rec ? ' <span class="br-badge" id="brBadge">🌬️ Breath record!</span>' : ''}</p>` : '')
        + tuning.html + `<p class="res-diff" id="resDiff">Difficulty: ${g.diff.name} (±${g.diff.tol}¢)</p>
        <p class="chart-title">Tuning each lap <small>(above the line = sharp, below = flat; green band = in tune on this difficulty)</small></p>
        <div class="chart" id="resChart"></div><ul class="lap-notes" id="resLaps"></ul>`,
      onShow: () => {
        chart(g);
        const b = $('gNewBtn'); if (b) b.addEventListener('click', () => Garage.open());
        const gb = $('resGarage');                                // the results' GARAGE: the track menu's look + its car icon
        if (gb) { gb.classList.add('garage-btn'); gb.innerHTML = Garage.ICON + '<span class="gb-t">Garage</span>'; gb.setAttribute('aria-label', 'Garage'); }
        if (fresh.length) Garage.markSeen(fresh);
      },
      next: {label: 'Next track', hidden: !hasNext, onClick: () => A.requireMic(() => startRace(finished.lv + 1))},
      retry: {label: 'Try again', onClick: () => A.requireMic(() => startRace(finished.lv))},
      levels: {label: 'Tracks', onClick: showHub},
      // GARAGE after every race: here with the other buttons, unless something was unlocked (then the NEW IN THE
      // GARAGE! card's filled button is the only one)
      more: (fresh.length ? [] : [{label: 'Garage', id: 'resGarage', onClick: () => Garage.open()}])
        .concat(TEACHER_MODE ? [{label: 'Save as teacher ghost', id: 'resTeacherGhost', onClick: () => showGhostCode(g)}] : [])});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // the menu music again, after the result sounds
    A.Sfx.sequence([pos <= 3 && stars ? 'podium' : 'level-failed', stars > old.stars && 'star-earned', newLap && oldLap && 'new-best-lap']);
    finished = g; G = null;
  }
  /* ---------- THE INTONATION REPORT: "Your tuning" ----------
     One row per target note (written, with its octave) held at least RULES.report.reportHoldSec s: a centered bar from
     −50 (flat, left) to +50 cents (sharp, right) with the in-tune band shaded, a kid-friendly word, and a trend arrow
     when this instrument has history (gameData.tuning[member] = the last RULES.report.history races:
     [{d: 'YYYY-MM-DD', n: {<note>: average cents}}]). Then up to RULES.report.maxTips TIPS from tips.js (tipsFor). */
  const TIPS = window.SPEEDWAY_TIPS || {};
  const normNote = n => String(n).replace(/^([A-Ga-g])#/, '$1♯').replace(/^([A-Ga-g])b/, '$1♭').replace(/^[a-g]/, c => c.toUpperCase());
  function wordFor(m, tol) {
    const a = Math.abs(m);
    return a <= tol ? 'right on!' : m > 0 ? (a > 25 ? 'high (sharp)' : 'a little high (sharp)') : (a > 25 ? 'low (flat)' : 'a little low (flat)');
  }
  function byMember(table, key) {                              // tips.js lookups: the member first, then its family, then 'any'
    if (!table) return null;
    return table[who] || table[member.family] || table.any || null;
  }
  function tipsFor(rows, tol, extra = []) {
    const out = [], add = t => { if (t && !out.includes(t) && out.length < R.report.maxTips) out.push(t); };
    extra.forEach(add);                                        // (the dynamics tips come first: tipsFor's caller decides)
    const n = rows.reduce((a, r) => a + r.n, 0), overall = n ? rows.reduce((a, r) => a + r.m * r.n, 0) / n : 0;
    if (Math.abs(overall) >= R.report.tendency) { const g = byMember(TIPS.general); if (g) add(g[overall > 0 ? 'sharp' : 'flat']); }
    rows.filter(r => Math.abs(r.m) > tol).sort((a, b) => Math.abs(b.m) - Math.abs(a.m)).forEach(r => {
      const dir = r.m > 0 ? 'sharp' : 'flat';
      const hit = (TIPS.notes || []).find(t => [].concat(t.member).includes(who) && t.dir === dir && (t.notes || []).map(normNote).includes(r.key));
      add(hit ? hit.text : (TIPS.air || {})[dir]);
    });
    return out;
  }
  function report(g) {
    const tol = g.diff.tol, H = R.report;
    const rows = Object.values(g.notes).filter(st => st.n && st.dur >= H.reportHoldSec)
      .map(st => ({key: st.key, label: st.label, oct: st.oct, n: st.n, m: st.sum / st.n, wob: st.wob / st.dur, zone: st.zone, hold: st.hold, dur: st.dur}));
    // the history (this instrument): the trend compares with the average of the earlier races that had the note
    const hist = ((gd.tuning = gd.tuning || {})[who] = gd.tuning[who] || []);
    rows.forEach(r => {
      const past = hist.map(h => h.n[r.key]).filter(v => typeof v === 'number');
      if (!past.length) return;
      const before = past.reduce((a, v) => a + Math.abs(v), 0) / past.length, now = Math.abs(r.m);
      r.trend = now <= tol && before <= tol ? 'same' : now < before - 2 ? 'closer' : now > before + 2 ? 'farther' : 'same';
    });
    if (rows.length) {
      hist.push({d: dayKey(), n: Object.fromEntries(rows.map(r => [r.key, +r.m.toFixed(1)]))});
      while (hist.length > H.history) hist.shift();
    }
    const allIn = rows.length > 0 && rows.every(r => Math.abs(r.m) <= tol);
    // PITCH IN SOFT / LOUD ZONES (dynamics tracks): the classic problem = flat when soft, sharp when loud
    const dyn = ['soft', 'loud'].map(k => ({k, d: g.dynPitch[k]})).filter(x => x.d.n >= 20).map(x => ({k: x.k, m: x.d.sum / x.d.n, n: x.d.n}));
    const dynTips = dyn.filter(x => Math.abs(x.m) > Math.max(6, tol * .6)).map(x => {
      const tab = TIPS.dynamics || {}, key = x.k + (x.m < 0 ? 'Flat' : 'Sharp');
      return [tab[who], tab[member.family], tab.any].map(t => t && t[key]).find(Boolean);
    }).filter(Boolean);
    const dynAllIn = dyn.every(x => Math.abs(x.m) <= tol);
    const allInAll = allIn && dynAllIn;
    const tips = allInAll ? [] : tipsFor(rows, tol, dynTips);
    const pct = c => (50 + clamp(c, -50, 50)) + '%';
    const TREND = {closer: ['▲', 'getting closer!'], farther: ['▼', 'a bit farther off than before'], same: ['●', 'about the same as before']};
    const rowHTML = r => {
      const cls = Math.abs(r.m) <= tol ? 'ok' : r.m > 0 ? 'sharp' : 'flat', t = r.trend && TREND[r.trend];
      return `<li class="tn-row ${cls}${r.dynRow ? ' tn-dynrow' : ''}" data-note="${r.key}" data-cents="${r.m.toFixed(1)}">
        <b class="tn-note">${r.label}<sub>${r.oct != null ? r.oct : ''}</sub></b>
        <span class="tn-bar" role="img" aria-label="${r.label}${r.oct != null ? r.oct : ''}: ${signed(r.m)}, ${wordFor(r.m, tol)}"><i class="tn-band" style="left:${pct(-tol)};right:${(50 - Math.min(50, tol))}%"></i><i class="tn-mid"></i><i class="tn-dot" style="left:${pct(r.m)}"></i></span>
        <span class="tn-word">${wordFor(r.m, tol)} <small>${signed(r.m)}${r.dynRow ? '' : ` · wobble ${Math.round(r.wob)}¢`}${r.zone >= .5 ? ` · ${r.zone.toFixed(1)} s in the zone` : ''}</small></span>
        ${t ? `<span class="tn-trend ${r.trend}" title="${t[1]}">${t[0]} <small>${t[1]}</small></span>` : ''}${r.extra || ''}</li>`;
    };
    const html = `<section class="tuning" id="resTuning" aria-labelledby="tnTitle"><h3 class="tn-title" id="tnTitle">Your tuning</h3>
      ${rows.length ? `<p class="tn-scale" aria-hidden="true"><span></span><span class="tn-sc"><i>◀ flat</i><i>in tune</i><i>sharp ▶</i></span><span></span></p><ul class="tn-rows">${rows.map(rowHTML).join('')}</ul>`
        : '<p class="tn-none">Hold each note for at least a second to get your tuning report.</p>'}
      ${dyn.length ? `<p class="tn-sub">Pitch in soft / loud zones</p><ul class="tn-rows tn-dyn">${dyn.map(x => rowHTML({key: x.k, label: x.k === 'soft' ? 'Soft' : 'Loud', oct: null, m: x.m, wob: 0, zone: 0, dynRow: true})).join('')}</ul>` : ''}
      ${g.slurs.length ? `<p class="tn-slurs" id="tnSlurs">Slurs: <b>${g.slurs.filter(x => x.ok).length} of ${g.slurs.length}</b> smooth${g.slurs.some(x => x.how === 'break') ? ' · keep the air going while you change notes' : ''}</p>` : ''}
      ${allInAll ? '<p class="tn-great" id="tnGreat">Right on pitch! Great ears.</p>' : tips.length ? `<ul class="tn-tips" id="tnTips">${tips.map(t => `<li>💡 ${t}</li>`).join('')}</ul>` : ''}</section>`;
    return {rows, tips, allIn: allInAll, dyn, html};
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
  document.addEventListener('visibilitychange', () => {
    lastT = performance.now();
    // PAUSED during the countdown (the page hidden): it stops, and starts again from 3 when the page comes back
    if (!G || G.phase !== 'count') return;
    // (the pause menu opens too: its RESUME starts the countdown again)
    if (document.hidden) stopCountdown();
    else if (!G.held && !G.cd) startCountdown();
  });

  A.Speedway = {debug: () => G, hearing: () => S, rules: R, countSounds: COUNT_SOUNDS, car: () => G && G.car,    // tests
    steer: () => G && {steer: G.steer, x: G.carX, word: steerShown},
    skipChecks: () => { if (!dynLevels()) setDynLevels(-30, -14); if (G && G.phase === 'vcheck') endCheck(-30, -14); },
    dyn: () => G && {levels: dynLevels(), zone: zoneNow(), mul: S.dynMul, norm: S.norm, zones: G.zones, check: G.vc && {step: G.vc.step, result: G.vc.result}},
    slur: () => G && {laps: G.slurB.map(b => b && b.label), sl: G.sl && {lap: G.sl.lap, switched: G.sl.switched, result: G.sl.result, broke: G.sl.broke}, slurs: G.slurs, mul: S.slurMul, target: item() && item().label},
    ghostCode: () => finished && ghostCode(finished), decodeGhost, teacher: lv => teacherFor(lv), breath: () => (gd.breath || {})[who] || null,
    podium: () => podium && {place: podium.place, order: podium.order, shown: !$('podium').hidden},
    fx: () => ({lite: lite(), mode: gfxMode(), particles: FX.n, kinds: [...new Set(FX.list.map(p => p.kind))], props: G ? G.props.map(p => p.kind) : [], season: G && G.season ? G.season.id : null,
      air: G && G.air ? G.air.kind : null, perf: G && G.perf, shook: G ? G.fx.shook || 0 : 0, time: G ? (G.L.time || G.L.sky) : null}), lastRace: () => finished, tipsFor, steerOf: c => steerOf(c), driveStep: dt => driveStep(dt)};
  showHub();
})(window.Arcade);
