/* Music Highway: a play-along rhythm game. Neon light pads race down a synthwave highway in time with a backing
   groove, one lane per pitch (low notes on the left, high on the right, so the melody's shape shows on the road);
   the student plays each note as its pad reaches its lane's gate. The microphone judges the pitch AND the timing
   (from the note's attack).
     songs.js     THE SONG LIST (scale degrees in a concert key) · song-map.js: songs -> each instrument's written notes
     settings.js  judging windows, scoring, stars, speeds, calibration, volumes · backing.js: the drums (+ headphones band)
   THE CLOCK: everything runs on the arcade's AudioContext (Sfx.output()): the drums are scheduled on it, and the
   highway, the staff and the judge all read the AUDIBLE time from it (getOutputTimestamp / outputLatency), so the
   pads reach their gates exactly as the beat is heard and nothing drifts, however long the song. With the sound off the
   game falls back to performance.now().
   SOUND WHILE LISTENING (the exception, see CLAUDE.md): the backing plays while the microphone listens and does NOT mute
   it; the drums are unpitched noise (a hit counts only with the right pitch) and the snare player's hits must be louder
   than the drums heard back. Pitched backing only in HEADPHONES MODE after the speaker check. No sound effects during a
   song. Progress: setLevel('music-highway', member id, song number, {stars, best}) (games.js byMember). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'music-highway';
  const SONGS = window.MH_SONGS, R = window.MH_RULES, SM = A.SongMap;
  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember ? A.currentMember() : inst.members[0];
  const unpitched = inst.pitched === false;
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;
  { const l = A.link('songs.html'); $('boardLink').href = l + (l.includes('?') ? '&' : '?') + 'm=' + encodeURIComponent(member.id); }
  const RM = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => RM.matches;

  /* ---------- saved things: gameData('music-highway') = {calib: {speaker, headphones}, hp, speed ('slow' | 'normal' |
     'turbo'; old saves: slow), mode ('play' | 'practice'), melody, melVol, wide, names, sticking, fx, turbo ({member:
     {song id: true}}: the ⚡ TURBO badges), tip} ---------- */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };
  let speed = ['slow', 'normal', 'turbo'].includes(gd().speed) ? gd().speed : gd().slow ? 'slow' : 'normal';
  let playMode = gd().mode === 'practice' ? 'practice' : 'play';       // PRACTICE: the pitched backing plays, the mic stays off
  let melody = gd().melody !== false, melVol = typeof gd().melVol === 'number' ? gd().melVol : .7;
  let hp = !!gd().hp, wide = !!gd().wide, names = gd().names !== false;
  const RATE = {slow: R.slowRate, normal: 1, turbo: R.turboRate};
  const turboBadge = s => !!((gd().turbo || {})[member.id] || {})[s.id];
  let sticking = gd().sticking === 'downbeats' ? 'downbeats' : 'alternate';   // the snare's default hand pattern
  const hornSide = 'F';                                            // (the fingering choice of the old cards: not used any more)
  let hpChecked = false;                                         // the speaker check passed on this page load
  const mode = () => hp ? 'headphones' : 'speaker';
  const lagMs = () => { const c = (gd().calib || {})[mode()]; return c && typeof c.ms === 'number' ? c.ms : R.defaultLagMs; };
  const calibrated = () => !!((gd().calib || {})[mode()]);

  /* ---------- unlocks: tier 2 after stars on 3 tier-1 songs, tier 3 after stars on 3 tier-2 songs ---------- */
  const starsOf = i => A.store.level(GAME_ID, member.id, i + 1).stars || 0;
  const tierStarred = tier => SONGS.filter((s, i) => s.tier === tier && starsOf(i) > 0).length;
  const tierOpen = tier => A.DEMO || tier <= 1 || tierStarred(tier - 1) >= 3;
  const unlocked = i => tierOpen(SONGS[i].tier) || starsOf(i) > 0;

  /* ================= SONG SELECT ================= */
  function drawOpts() {
    ['slow', 'normal', 'turbo'].forEach(k => $('spd' + k[0].toUpperCase() + k.slice(1)).setAttribute('aria-pressed', String(speed === k)));
    $('modePlay').setAttribute('aria-pressed', String(playMode === 'play')); $('modePractice').setAttribute('aria-pressed', String(playMode === 'practice'));
    $('pracOpts').hidden = playMode !== 'practice';
    $('melOn').setAttribute('aria-pressed', String(melody)); $('melOff').setAttribute('aria-pressed', String(!melody));
    $('melVol').value = Math.round(melVol * 100); $('melVol').disabled = !melody;
    $('hpBtn').setAttribute('aria-pressed', String(hp)); $('hpBtn').classList.toggle('on', hp);
    $('spcNormal').setAttribute('aria-pressed', String(!wide)); $('spcWide').setAttribute('aria-pressed', String(wide));
    $('stickOpt').hidden = $('stickNote').hidden = !unpitched;
    if (unpitched) $('hubBlurb').textContent = 'Neon lights race down the highway with the band: the left lane is your left hand, the right lane your right hand. Hit the drum as each light reaches its gate.';
    $('stickAlt').setAttribute('aria-pressed', String(sticking === 'alternate')); $('stickDown').setAttribute('aria-pressed', String(sticking === 'downbeats'));
    $('namesOn').setAttribute('aria-pressed', String(names)); $('namesOff').setAttribute('aria-pressed', String(!names));
    const c = (gd().calib || {})[mode()];
    $('optNote').textContent = (playMode === 'practice' ? 'Practice: hear every note played for you. The microphone stays off: no score, no stars. ' : '') +
      (speed === 'slow' ? 'Slow: 75% speed, for practice. No stars. ' : speed === 'turbo' ? 'Turbo: 125% speed! Stars count, and a star earns the ⚡ TURBO badge. ' : '') + (wide ? 'Wide note spacing: more room between the lights (they move a little faster). ' : '') + (names ? '' : 'Letter names are off inside the lights (the gates still show them). ')  +
      (hp ? 'Headphones mode: the band plays the melody, bass and chords too. Bluetooth headphones add a delay: recalibrate with them on. ' : '') +
      (c ? `Timing calibrated (${Math.round(c.ms)} ms${hp ? ', headphones' : ''}).` : 'Not calibrated yet: the first song starts with a quick timing check.');
    $('calBtn').textContent = c ? 'Recalibrate' : 'Calibrate';
  }
  const setSpeed = k => { speed = k; save({speed}); A.Sfx.event('ui-toggle'); drawOpts(); showHub(); };
  $('spdSlow').onclick = () => setSpeed('slow'); $('spdNormal').onclick = () => setSpeed('normal'); $('spdTurbo').onclick = () => setSpeed('turbo');
  const setMode = k => { playMode = k; save({mode: k}); A.Sfx.event('ui-toggle'); drawOpts(); showHub(); };
  $('modePlay').onclick = () => setMode('play'); $('modePractice').onclick = () => setMode('practice');
  $('melOn').onclick = () => { melody = true; save({melody}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('melOff').onclick = () => { melody = false; save({melody}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('melVol').oninput = () => { melVol = $('melVol').value / 100; save({melVol}); };
  $('spcNormal').onclick = () => { wide = false; save({wide}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('spcWide').onclick = () => { wide = true; save({wide}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('stickAlt').onclick = () => { sticking = 'alternate'; save({sticking}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('stickDown').onclick = () => { sticking = 'downbeats'; save({sticking}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('namesOn').onclick = () => { names = true; save({names}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('namesOff').onclick = () => { names = false; save({names}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('hpBtn').onclick = () => {
    A.Sfx.event('ui-toggle');
    if (hp) { hp = false; save({hp}); drawOpts(); return; }
    A.requireMic(() => speakerCheck(ok => { if (ok) { hp = true; hpChecked = true; save({hp}); } drawOpts(); if (ok && !calibrated()) calibrate(() => drawOpts()); }));
  };
  $('calBtn').onclick = () => A.requireMic(() => calibrate(() => drawOpts()));

  const TIER_NAME = {1: 'Tier 1 · First five', 2: 'Tier 2 · Whole scale', 3: 'Tier 3 · Challenge'};
  function showHub() {
    stopSong();
    A.Sfx.gameMenuMusic(GAME_ID);
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true; $('pausePanel').hidden = true;
    document.documentElement.classList.remove('mh-playing');
    drawOpts();
    $('songGrid').innerHTML = SONGS.map((s, i) => {
      const p = A.store.level(GAME_ID, member.id, i + 1), open = unlocked(i);
      const map = SM.forMember(s, member, inst, {hornSide, sticking});
      const secs = Math.round((map.total + map.beatsPerMeasure) * 60 / s.tempo);
      return `<button class="lvl mh-song t${s.tier}" data-i="${i}" ${open ? '' : 'disabled'}>
        <span class="n">${TIER_NAME[s.tier]}</span>
        <span class="t">${esc(s.title)}${turboBadge(s) ? ' <span class="mh-turbo" title="Cleared on Turbo">⚡ TURBO</span>' : ''}</span>
        <span class="d">${esc(s.source)}<br>${s.tempo} beats a minute · ${s.timeSig[0]}/${s.timeSig[1]} · ${map.notes.length} notes · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : ''}</span></span>
      </button>`;
    }).join('');
    $('songGrid').querySelectorAll('.mh-song').forEach(b => b.addEventListener('click', () => begin(+b.dataset.i)));
    A.LevelSelect.show({screen: $('hub'), grid: $('songGrid'), cards: $('songGrid').querySelectorAll('.mh-song'), unlocked,
      label: i => SONGS[i].title + (speed === 'slow' ? ' · SLOW' : speed === 'turbo' ? ' · TURBO' : '') + (playMode === 'practice' ? ' · PRACTICE' : ''),
      lockText: i => `Get stars on 3 Tier ${SONGS[i].tier - 1} songs to unlock`});
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /** START on a song: the microphone, then (once) the headphones check and the timing check, then the song */
  function begin(i, opts = {}) {
    const guide = opts.guide != null ? opts.guide : playMode === 'practice';
    if (guide) return startSong(i, Object.assign({}, opts, {guide: true}));   // PRACTICE: never asks for the microphone
    A.requireMic(() => {
      const go = () => startSong(i, opts);
      const cal = () => calibrated() ? go() : calibrate(ok => go(), {first: true});
      if (hp && !hpChecked) speakerCheck(ok => { if (!ok) { hp = false; save({hp}); drawOpts(); } else hpChecked = true; cal(); });
      else cal();
    });
  }

  /* ================= THE CLOCK (audible AudioContext time; see the top) ================= */
  const CLK = {ctx: null, off: null, p0: 0};
  function clockStart() {
    const o = A.Sfx.output();
    CLK.ctx = o ? o.ctx : null; CLK.out = o ? o.out : null; CLK.off = null; CLK.p0 = performance.now();
    if (CLK.ctx && CLK.ctx.state !== 'running') CLK.ctx.resume().catch(() => {});
    sampleClock();
  }
  /* the audible context time at performance time p (seconds), smoothed so the frame-by-frame jitter of currentTime
     never shakes the cards; with no audio: performance time */
  function sampleClock() {
    const c = CLK.ctx, p = performance.now();
    if (!c) return;
    let raw = null;
    try { const ts = c.getOutputTimestamp && c.getOutputTimestamp(); if (ts && ts.performanceTime > 0 && ts.contextTime > 0) raw = ts.contextTime + (p - ts.performanceTime) / 1000; } catch (e) {}
    if (raw == null) raw = c.currentTime - (c.outputLatency || c.baseLatency || 0);
    const s = raw - p / 1000;
    if (CLK.off == null || Math.abs(s - CLK.off) > .06) CLK.off = s; else CLK.off += (s - CLK.off) * .04;
  }
  const audAt = p => CLK.ctx ? p / 1000 + CLK.off : (p - CLK.p0) / 1000;        // "context seconds" heard at perf ms p
  const nowCtx = () => CLK.ctx ? CLK.ctx.currentTime : (performance.now() - CLK.p0) / 1000;

  /* ================= THE SONG ================= */
  let G = null, kit = null, raf = 0, sched = 0;
  const COLORS = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b'];      // pad color by letter (written)

  function buildTimeline(song, map, rate, practice, lanes) {
    const spb = 60 / (song.tempo * rate), per = map.beatsPerMeasure;
    let notes = map.notes, measures = map.measures, loops = 1, from = 1;
    if (practice) {
      from = practice.from; const to = practice.to;
      const inRange = map.notes.filter(n => n.measure >= from && n.measure <= to);
      const len = (to - from + 1) * per, base = (from - 1) * per;
      loops = R.practiceLoops; measures = (to - from + 1) * loops;
      notes = [];
      for (let k = 0; k < loops; k++) inRange.forEach(n => notes.push(Object.assign({}, n, {t: n.t - base + k * len, loop: k, measure: n.measure - from + 1 + k * (to - from + 1), orig: n.measure})));
    }
    const lanesOf = n => lanes.of(n);                              // one lane per pitch, low = left; the snare: its hand's lane
    const list = notes.map((n, k) => ({k, n, t: n.t * spb, beats: n.beats, dur: n.beats * spb, end: (n.t + n.beats) * spb, lane: lanesOf(n), measure: n.measure,
      orig: n.orig || n.measure, loop: n.loop || 0, pc: n.pc, midi: n.concert, long: !unpitched && n.beats >= R.holdFrom,
      trail: !unpitched && n.beats >= R.trailFrom - 1e-6, res: null, held: 0}));
    // a trail ends a little before the note does (trailGap of its length), so two notes in a row stay apart
    list.forEach(n => { n.tEnd = n.end - (n.trail ? R.trailGap * n.dur : 0); });
    list.fvTotal = list.filter(n => n.trail).length;
    return {spb, per, notes: list, measures, total: measures * per * spb, loops, from, perLoop: practice ? list.length / loops : list.length,
      loopLen: practice ? (practice.to - practice.from + 1) * per * spb : Infinity};
  }

  const CONCERT = {g: {clef: 'treble', notes: [A.music.parseNote('Bb4')], targetPc: [10], pitched: true}, m: {id: 'concert', sounds: 0, lowMidi: 58, highMidi: 84, pitched: true}};
  function startSong(i, {practice = null, guide = false} = {}) {
    stopSong();
    const song = SONGS[i];
    A.LevelSelect.played(i);
    A.Sfx.gameMenuMusic(GAME_ID, false);                          // the menu music fades; the microphone listens again
    const rate = practice ? R.practiceRate : RATE[speed];
    const map = SM.forMember(song, member, inst, {hornSide, sticking});
    const lanes = SM.lanes(song, map, inst);
    const T = buildTimeline(song, map, rate, practice, lanes);
    G = {i, song, map, lanes, rate, practice, guide, speed: practice ? 'practice' : speed, slow: !practice && speed === 'slow', T, fv: {n: T.notes.fvTotal || 0, held: 0, pts: 0}, phase: 'count', score: 0, combo: 0, maxCombo: 0, mult: 1,
         counts: {perfect: 0, good: 0, ok: 0, early: 0, late: 0, miss: 0}, value: 0, judged: 0, pendingAtk: [], recent: [], soft: [],
         bleed: 0, bleedSamples: [], hits: [], lag: lagMs(), paused: false, loopStats: {}, log: []};
    $('hub').hidden = true; $('results').hidden = true; $('play').hidden = false;
    document.documentElement.classList.add('mh-playing');
    $('hudSong').textContent = song.title + (practice ? ' · practice' : speed === 'slow' ? ' · slow' : speed === 'turbo' ? ' · turbo' : '');
    $('hudPractice').hidden = !guide; $('play').classList.toggle('guide', guide);
    // PRACTICE: the melody the band plays (the snare hears the song's concert melody for context)
    if (guide) G.melody = unpitched ? (() => { const cm = SM.forMember(song, CONCERT.m, CONCERT.g), sp = T.spb, fr = practice ? practice.from : 1, to = practice ? practice.to : cm.measures;
        const base = (fr - 1) * cm.beatsPerMeasure, len = (to - fr + 1) * cm.beatsPerMeasure, loops = practice ? T.loops : 1, out = [];
        for (let k = 0; k < loops; k++) cm.notes.filter(n => n.measure >= fr && n.measure <= to).forEach(n => out.push({t: (n.t - base + k * len) * sp, dur: n.beats * sp, midi: n.concert}));
        return out; })() : T.notes.map(n => ({t: n.t, dur: n.dur, midi: n.midi}));
    if (unpitched && A.DEMO) stickingSelfCheck();
    $('hudAccL').textContent = practice ? 'This loop' : 'Accuracy';
    layout(); buildPads(); buildStaff();
    showTip(guide ? (unpitched ? 'Practice: the band plays the song. Follow the sticking: left lane = L, right lane = R.' : 'Practice: listen and watch. Each gate lights up as its note plays. Play along if you like!') : practice ? `Practice: measures ${practice.from}–${practice.to}, looping at ${Math.round(R.practiceRate * 100)}% speed. Tap pause to stop.` :
      unpitched ? 'Play each hit as its light reaches the gate. Stick with the R and L!' : 'Play each note as its light reaches its gate. Low notes on the left, high notes on the right!');
    A.Pitch.ignoreCurrent();
    A.Pitch.demoAttacks = !guide;
    clockStart();
    kit = CLK.ctx ? A.MHBacking.create(CLK.ctx, CLK.out) : null;
    // the uploaded drums file (if any) is fetched now; the count-in gives it time. Practice and slow use the generated groove
    G.drumFile = null;
    if (kit && !practice && !unpitched && rate === 1) A.Sfx.buffer('mh-drums-' + song.id).then(b => { if (G && G.song === song && b) G.drumFile = b; });
    play(0);
  }

  /** start (or resume) the song at `fromSec` of song time: a one-measure count-in, then the groove */
  function play(fromSec) {
    const T = G.T;
    const countIn = T.per * T.spb, lead = .7;                    // (after the menu music's 0.5 s microphone mute)
    sampleClock();
    G.T0 = nowCtx() + lead + countIn - fromSec;                  // context time of the song's beat 1 (song time 0)
    G.from = fromSec; G.phase = 'count'; G.paused = false;
    G.countAt = G.T0 + fromSec - countIn;
    G.nextBeat = Math.round(fromSec / T.spb * 4) / 4;            // the scheduler's cursor, in beats (16th grid)
    G.clicks = [];
    for (let b = 0; b < T.per; b++) {                             // the count-in: stick clicks (accent on 1) over the hi-hat,
      const t = G.countAt + b * T.spb;                             // and the kick: the game hears its own drums before
      G.clicks.push(t);                                            // any note (a snare player's bleed level, see onAttack)
      if (kit) { kit.click(t, R.clickVol * 1.2, b === 0); kit.hat(t, .7 * R.drumVol); kit.kick(t, (b ? .8 : 1) * R.drumVol); }
    }
    G.fileStarted = false;
    clearInterval(sched); sched = setInterval(schedule, 25); schedule();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }

  /* the scheduler: every 25 ms, everything due in the next R.lookaheadS seconds is put on the audio clock (a page that
     stalls for less than that, a slow Chromebook or a busy iPad, never delays a drum hit) */
  function schedule() {
    if (!G || G.paused || !kit) return;
    const T = G.T, now = nowCtx(), until = now + R.lookaheadS - G.T0;   // song seconds
    if (G.drumFile && !G.fileStarted && G.T0 + G.from > now) {
      kit.file(G.T0 + G.from, G.drumFile, G.from, 1); G.fileStarted = true;
    }
    const groove = A.MHBacking.groove(G.song.style, T.per);
    while (G.nextBeat * T.spb <= until && G.nextBeat * T.spb < T.total) {
      const b = G.nextBeat, t = G.T0 + b * T.spb, inMeasure = +(b % T.per).toFixed(3);
      if (!G.fileStarted) groove.forEach(([at, drum, v]) => { if (unpitched && !G.guide && drum === 'snare') return; if (Math.abs(at - inMeasure) < .01 || (at % .25 && Math.abs(Math.floor(at * 4) / 4 - inMeasure) < .01)) {
        const tt = G.T0 + (b - inMeasure + at) * T.spb;
        if (tt < now) G.lateHits = (G.lateHits || 0) + 1;          // tests: a hit put on the clock after its time (a stalled page)
        kit[drum](tt, v * R.drumVol);
        G.hits.push(tt);
      } });
      if ((hp && hpChecked) || G.guide) headphoneBand(b, t);
      G.nextBeat = Math.round((b + .25) * 4) / 4;
    }
    if (G.hits.length > 200) G.hits.splice(0, G.hits.length - 200);
  }
  /* headphones mode: the guide melody (the student's notes, quietly), a bass note on the strong beats, a soft chord */
  function headphoneBand(b, t) {
    const T = G.T;
    const mv = G.guide ? (melody ? R.practiceMelodyVol * melVol : 0) : R.guideVol, bv = G.guide ? R.practiceBassVol : R.bassVol, pv = G.guide ? R.practicePadVol : R.padVol;
    const tone = (at, m, d, v, kind) => { kit.tone(at, m, d, v, kind); if (G.tones) G.tones.push({kind, at: +(at - G.T0).toFixed(4), m}); };
    if (mv > 0) (G.guide ? G.melody : T.notes).filter(n => Math.abs(n.t / T.spb - b) < .01 && n.midi != null).forEach(n => tone(G.T0 + n.t, n.midi, Math.max(.12, n.dur * .9), mv, 'guide'));
    const inM = b % T.per;
    if (Math.abs(inM) < .01 || (T.per === 4 && Math.abs(inM - 2) < .01)) {
      const m = Math.floor(b / T.per + 1e-6) + 1, orig = G.practice ? ((m - 1) % (G.practice.to - G.practice.from + 1)) + G.practice.from : m;
      const ch = G.map.chords[orig - 1];
      if (ch) {
        let root = ch.root; while (root > 50) root -= 12; while (root < 38) root += 12;
        tone(t, root, T.spb * (T.per === 4 ? 1.8 : T.per * .9), bv, 'bass');
        if (Math.abs(inM) < .01) ch.tones.forEach(m2 => { let x = m2; while (x > 67) x -= 12; while (x < 55) x += 12; tone(t, x, T.spb * T.per * .95, pv, 'pad'); });
      }
    }
  }

  function stopSong() {
    clearInterval(sched); sched = 0; cancelAnimationFrame(raf); raf = 0;
    if (kit) { kit.stopAll(); kit = null; }
    A.Pitch.demoAttacks = false;
    glowOff(true);
    G = null;
  }

  /* ================= INPUT: attacks + pitch (see settings.js) ================= */
  A.Pitch.demoTarget = () => {
    if (!G) return null;
    const t = songNow(), n = G.T.notes.find(x => !x.res && x.t > t - R.outerMs / 1000);
    return n ? (unpitched ? null : {pc: n.pc, midi: n.midi}) : null;
  };
  const songNow = (p = performance.now()) => !G ? 0 : G.paused ? G.pausedRaw : audAt(p) - G.T0;   // (paused = the clock stands still)
  /** an attack's song time, corrected by the calibration */
  const songOf = perf => songNow(perf) - G.lag / 1000;

  A.Pitch.onAttack(a => {
    if (calRun) { calRun.attacks.push(a); return; }
    if (!G || G.paused || G.guide) return;
    G.recent.push(a.time); if (G.recent.length > 20) G.recent.shift();
    const t = songOf(a.time);
    // THE DRUMS HEARD BACK (a snare player: any attack counts, so the backing's own hits must not). An attack right on a
    // backing hit with no note near it (the count-in, the hi-hat between notes) = the speakers: its level is learned.
    // On a note, an attack on a backing hit counts only when clearly louder (bleedK ×) than the drums heard back.
    if (unpitched) {
      const at = audAt(a.time), onDrum = G.clicks.concat(G.hits).some(h => Math.abs(at - h) < R.bleedMs / 1000);
      const nearNote = G.T.notes.some(n => !n.res && Math.abs(t - n.t) <= R.outerMs / 1000);
      if (A.DEMO) G.log.push({atk: +t.toFixed(3), lvl: a.level == null ? null : +a.level.toFixed(4), onDrum, nearNote, bleed: +G.bleed.toFixed(4)});
      if (a.level != null && onDrum) {
        if (G.phase === 'count' || !nearNote) { G.bleed = Math.max(G.bleed, a.level); return; }
        if (a.level < G.bleed * R.bleedK) return;
      }
      if (G.phase === 'count') return;
      return judge(t, null, a.time);
    }
    if (a.pc != null && judge(t, a.pc, a.time)) return;
    G.pendingAtk.push({t, time: a.time, pc: a.pc, until: a.time + R.pitchConfirmMs});
  });

  /** judge a note start at song time t with pitch class pc (null = unpitched): the closest open note in the window */
  function judge(t, pc, perf) {
    const W = R.outerMs / 1000;
    let best = null;
    G.T.notes.forEach(n => {
      if (n.res || Math.abs(t - n.t) > W) return;
      if (pc != null && n.pc !== pc) return;
      if (!best || Math.abs(t - n.t) < Math.abs(t - best.t)) best = n;
    });
    if (!best) {
      const open = pc != null && G.T.notes.find(n => !n.res && Math.abs(t - n.t) <= W);
      if (open) { wrongNote(pc); badPad(open.lane); }
      return false;
    }
    const d = (t - best.t) * 1000, ad = Math.abs(d);
    const res = ad <= R.perfectMs ? 'perfect' : ad <= R.goodMs ? 'good' : ad <= R.okMs ? 'ok' : d < 0 ? 'early' : 'late';
    mark(best, res, d);
    if (best.trail) { best.holding = true; best.lastHeard = performance.now(); }
    return true;
  }
  function mark(n, res, d) {
    n.res = res; n.d = d;
    const hit = res !== 'miss', clean = hit && res !== 'early' && res !== 'late';
    G.combo = clean ? G.combo + 1 : 0;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.mult = Math.min(R.comboMax, 1 + Math.floor(G.combo / R.comboStep));
    G.score += R.points[res] * (clean ? G.mult : 1);
    G.counts[res]++; G.value += R.value[res]; G.judged++;
    if (G.practice) { const L = G.loopStats[n.loop] = G.loopStats[n.loop] || {v: 0, c: 0}; L.v += R.value[res]; L.c++; }
    G.log.push({k: n.k, res, d: d == null ? null : Math.round(d)});
    cardDone(n, res);
    if (res === 'perfect' || res === 'good' || res === 'ok') glowHit(n);
    else if (res === 'miss') badPad(n.lane);
    showJudge(res, d, n.lane);
    hud();
  }
  let wrongT = 0;
  function wrongNote(pc) {
    if (performance.now() - wrongT < 400) return;
    wrongT = performance.now();
    const nm = inst.writtenName ? inst.writtenName(pc) : A.music.NAMES[pc];
    const j = $('judge'); j.className = 'mh-judge wrong'; j.textContent = `That's ${nm}`;
  }

  /* each detector frame: confirm attacks by pitch, soft entries, long-note holding */
  let run = {pc: null, since: 0, frames: 0, last: 0};
  A.Pitch.onFrame((r, level, now) => {
    if (calRun) { calRun.frames.push({r, now}); }
    if (hpRun) { hpRun.frame(r, level); }
    if (!G || G.paused || G.guide) return;
    const pc = r ? r.pc : null;
    // a new pitch (or a pitch after silence): a possible soft entry, decided 260 ms later
    if (pc != null) {
      if (pc !== run.pc || now - run.last > 110) { run = {pc, since: now, frames: 0, last: now}; }
      run.frames++; run.last = now;
      if (run.frames === 2 && !unpitched) G.soft.push({pc, time: run.since, due: now + 260});
    }
    // attacks waiting for their pitch
    for (let k = G.pendingAtk.length - 1; k >= 0; k--) {
      const a = G.pendingAtk[k];
      if (pc != null && now >= a.time && judge(a.t, pc, a.time)) { G.pendingAtk.splice(k, 1); continue; }
      if (now > a.until) { G.pendingAtk.splice(k, 1); if (a.pc != null) judge(a.t, a.pc, a.time); }
    }
    for (let k = G.soft.length - 1; k >= 0; k--) {
      const s = G.soft[k];
      if (now < s.due) continue;
      G.soft.splice(k, 1);
      if (G.recent.some(t => t > s.time - R.softEntryMs && t < s.time + 120)) continue;   // it had an attack: judged already
      judge(songOf(s.time - 25), s.pc, s.time);
    }
    // long notes: the tail meter fills while the note sounds
    G.T.notes.forEach(n => {
      if (!n.holding) return;
      if (pc === n.pc) n.lastHeard = now;
      if (now - n.lastHeard > R.holdGapMs) { n.holding = false; return; }
      const t = songNow(now);
      n.held = Math.max(n.held, Math.min(n.dur, t - n.t));
    });
  });

  /* ================= THE FRAME: highway, staff, misses, the end ================= */
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!G || G.paused) return;
    sampleClock();
    const t = songNow();
    // the count-in numbers (1 2 3 4 on the clicks), then play
    if (G.phase === 'count') {
      const countStart = G.from - G.T.per * G.T.spb;
      if (t >= G.from) { G.phase = 'play'; showCount(''); }
      else showCount(t >= countStart ? String(Math.min(G.T.per, Math.floor((t - countStart) / G.T.spb) + 1)) : '');
    }
    // misses: past the window (+ a moment for a late attack's pitch to settle)
    const late = R.outerMs / 1000 + .3;
    G.T.notes.forEach(n => {
      if (G.guide) {                                               // PRACTICE: each note "plays itself": its gate lights as it sounds
        if (!n.res && t >= n.t && t < n.end + .3) { n.res = 'guide'; n.holding = n.trail; glowHit(n); }
        else if (!n.res && t >= n.end + .3) n.res = 'guide';
        if (n.res === 'guide' && n.holding && t >= n.tEnd) n.holding = false;
        return;
      }
      if (!n.res && t > n.t + late) mark(n, 'miss', null);
      // FULL VALUE: a quarter note or longer held for fullValueShare of its length (checked where its trail ends)
      if (n.trail && n.res && n.res !== 'miss' && !n.fvDone && t > n.tEnd) {
        n.fvDone = true;
        if (n.holding) n.held = Math.max(n.held, n.tEnd - n.t);    // still sounding at the trail's end = held to there
        if (n.held >= R.fullValueShare * n.dur - 1e-3) {
          n.fullValue = true; G.fv.held++;
          if (!n.long) { G.score += R.fullValuePoints; G.fv.pts += R.fullValuePoints; hud(); }   // (long notes earn the hold bonus per beat)
          fvPop(n);
        }
      }
      if (n.long && n.res && n.res !== 'miss' && !n.bonused && t > n.end) {
        n.bonused = true; n.holding = false;
        const beats = n.held / G.T.spb;
        if (beats > .25) { const pts = Math.round(beats * R.holdPoints); G.score += pts; G.bonus = (G.bonus || 0) + pts; hud(); }
      }
    });
    const d0 = performance.now();
    glowFrame(t);
    drawHighway(t);
    moveStaff(t);
    perfWatch(d0);
    if (G.trace) { G.traceLog.push({t, tx: V.st.play - V.st.x * V.st.scale, pads: G.trace.pads}); G.trace = {pads: {}}; }
    if (G.practice) {
      const L = Math.floor(Math.max(0, t) / (G.T.total / G.T.loops));
      if (L !== G.shownLoop) { G.shownLoop = L; hud(); }
    }
    if (t > G.T.total + .6 && G.phase === 'play') finish();
  }

  /* PERFORMANCE: the frame's own drawing time and the time between frames. Averages that stay slow for 3 s
     (draw > fxSlowDrawMs or frames further apart than fxSlowGapMs) lower the effects once, for good on this device */
  function perfWatch(d0) {
    const now = performance.now();
    if (FX.q === 'lo') return;
    FX.draw.push(now - d0); if (FX.last) FX.gaps.push(d0 - FX.last); FX.last = d0;
    if (FX.draw.length < 180) return;
    const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), dr = avg(FX.draw), gp = avg(FX.gaps);
    FX.draw = []; FX.gaps = [];
    if (dr > R.fxSlowDrawMs || gp > R.fxSlowGapMs) { FX.q = 'lo'; FX.why = {draw: +dr.toFixed(1), gap: +gp.toFixed(1)}; save({fx: 'lo'}); layout(); spacing(); }
  }
  /* ---------- THE HIGHWAY: a synthwave sunset (bg-scenes.js S.sunset, drawn once into V.bg), the road with one lane
     per pitch (song-map.js lanes: low = left), the grid rolling in time with the song, neon light PADS flying from the
     horizon to their lane's GATE on the strike line, long notes' light trails, and the gates' hit glow. All on one
     canvas; the static layers are drawn once (layout), each frame only the grid, trails, pads and gates. ---------- */
  const V = {};
  /* effects quality: 'hi' | 'lo' (fewer stars, no mountains, no halos, pixel ratio 1). A device whose frames stay slow
     is lowered once, for good (gameData('music-highway').fx), instead of dropping frames */
  const FX = {q: gd().fx === 'lo' ? 'lo' : 'hi', draw: [], gaps: [], last: 0};
  const TOK = {}, tok = name => TOK[name] || (TOK[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || 'white');
  const FONT = (getComputedStyle(document.documentElement).getPropertyValue('--display').trim() || 'sans-serif');
  function layout() {
    const P = $('play'), W = P.clientWidth, H = P.clientHeight;
    const staffH = Math.round(Math.max(96, Math.min(170, H * .2)));
    const roadH = H - staffH;
    Object.assign(V, {W, H, roadH, staffH, cx: W / 2, hy: roadH * R.horizon, sy: roadH * .86, K: R.roadDepth});
    V.nl = G.lanes.lanes.length;
    V.half = unpitched ? Math.min(W * .3, roadH * .45, 230) : Math.min(W * .47, roadH * .85);   // the snare: two sticking lanes
    V.laneW = V.half * 2 / V.nl;
    V.padW0 = Math.min(R.padMaxPx, V.laneW * .8); V.padH0 = V.padW0 * R.padShape;
    V.padW = V.padW0; V.padH = V.padH0;
    V.gateW = Math.min(V.laneW * .94, V.padW0 + 16); V.gateH = V.padH0 + 12;
    const c = $('road'), dpr = FX.q === 'lo' ? 1 : Math.min(1.5, devicePixelRatio || 1);
    c.width = Math.round(W * dpr); c.height = Math.round(roadH * dpr); c.style.width = W + 'px'; c.style.height = roadH + 'px';
    V.g = c.getContext('2d'); V.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    V.bg = drawStatic(W, roadH, dpr);
    $('staffBox').style.height = staffH + 'px';
    P.style.setProperty('--sy', V.sy + 'px');
    GL.lanes = Array.from({length: V.nl}, () => ({v: 0, target: 0, n: null, offAt: -1e9, col: 'c', badAt: -1e9}));
  }
  const laneX = (l, s = 1) => V.cx + (l - (V.nl - 1) / 2) * V.laneW * s;
  function rrect(g, x, y, w, h, r) {                              // a rounded rectangle path (no ctx.roundRect on older iPads)
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /* the parts that never move, drawn once: the sunset, the road, its lanes, the unlit gates and their letter names */
  function drawStatic(W, H, dpr) {
    const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const art = A.BgScenes.sunset.paint(g, W, H, {hz: V.hy, cx: V.cx, stars: FX.q === 'lo' ? 15 : 60, mountains: FX.q !== 'lo'});
    V.sun = art.sun;
    // the road: from the vanishing point on the horizon to the bottom (lines through the vanishing point = perspective)
    const Hr = V.sy - V.hy, dB = Hr / (H - V.hy), xB = u => V.cx + u * V.half / dB;
    g.globalAlpha = .9; g.fillStyle = tok('mh-road');
    g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(1), H); g.lineTo(xB(-1), H); g.closePath(); g.fill(); g.globalAlpha = 1;
    for (const u of [-1, 1]) {                                     // the road's edges (the lane dashes move: drawHighway)
      if (FX.q !== 'lo') { g.strokeStyle = tok('pink'); g.globalAlpha = .25; g.lineWidth = 9; g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(u), H); g.stroke(); }
      g.strokeStyle = tok('pink'); g.globalAlpha = .95; g.lineWidth = 3;
      g.beginPath(); g.moveTo(V.cx, V.hy); g.lineTo(xB(u), H); g.stroke();
    }
    g.globalAlpha = 1;
    // the strike line and the gates (unlit), with each lane's letter name under its gate
    g.strokeStyle = tok('cyan'); g.globalAlpha = .7; g.lineWidth = 2;
    g.beginPath(); g.moveTo(V.cx - V.half, V.sy); g.lineTo(V.cx + V.half, V.sy); g.stroke(); g.globalAlpha = 1;
    const fs = Math.max(13, Math.min(24, V.laneW * .3));
    g.font = `${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    G.lanes.lanes.forEach((ln, l) => {
      const x = laneX(l);
      g.fillStyle = tok('deep'); g.globalAlpha = .55; rrect(g, x - V.gateW / 2, V.sy - V.gateH / 2, V.gateW, V.gateH, V.gateH * .35); g.fill();
      g.globalAlpha = .85; g.strokeStyle = tok('mh-gate'); g.lineWidth = 2; g.stroke();
      g.globalAlpha = 1; g.lineWidth = 4; g.strokeStyle = tok('deep'); g.fillStyle = tok('text-hi');
      g.strokeText(ln.label, x, V.sy + V.gateH / 2 + 6); g.fillText(ln.label, x, V.sy + V.gateH / 2 + 6);
    });
    return c;
  }
  /* the road is exponential in depth: d = (1 + K)^(dt / lead). A pad's size (1/d) and its distance to the next pad
     then shrink together, so the spacing rule (CARD SPACING in settings.js) holds all the way up the road. Past the
     line a pad keeps the line's speed at full size. */
  function proj(dt) {
    const L = G.lead, H = V.sy - V.hy;
    if (dt < 0) return {d: 1, s: 1, y: V.sy - dt / L * H * Math.log(1 + V.K)};
    const d = Math.pow(1 + V.K, dt / L);
    return {d, s: 1 / d, y: V.hy + H / d};
  }
  function drawHighway(t) {
    const g = V.g, T = G.T, W = V.W, still = reduced();
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.drawImage(V.bg, 0, 0, W, V.roadH);
    // ONLY THE ROAD MOVES: the sky, sun, mountains and the ground beside the road are the still layer (V.bg). On the road:
    // one cross line per beat, crossing the gates ON the beat (downbeats magenta), and the lane dividers' dashes rolling
    // toward the player with them. Reduced motion: the road stands still too.
    const tg = still ? 0 : t, dMax = Math.pow(1 + V.K, 1.6), Hr = V.sy - V.hy;
    const yAt = dt => { const p = proj(dt); return p.d > dMax ? null : p.y; };
    const hw = y => V.half * (y - V.hy) / Hr;                       // the road's half width at height y (through the vanishing point)
    const fadeAt = y => Math.max(0, Math.min(1, (y - V.hy) / (Hr * .35)));
    const b0 = Math.floor((tg - G.lead) / T.spb) - 1, b1 = Math.floor((tg + G.lead * 1.6) / T.spb) + 1;
    for (let b = b0; b <= b1; b++) {
      const y = yAt(b * T.spb - tg); if (y == null || y > V.roadH) continue;
      const down = ((b % T.per) + T.per) % T.per === 0, w = hw(y);
      g.strokeStyle = tok(down ? 'mh-grid-2' : 'mh-grid'); g.lineWidth = down ? 2 : 1.2; g.globalAlpha = (down ? .75 : .5) * fadeAt(y);
      g.beginPath(); g.moveTo(V.cx - w, y); g.lineTo(V.cx + w, y); g.stroke();
    }
    g.strokeStyle = tok('mh-lane'); g.lineWidth = 1.6;
    for (let b = b0 * 2; b <= b1 * 2; b++) {                        // dashes: half a beat long, one every beat
      if (b % 2) continue;
      const ya = yAt(b / 2 * T.spb - tg), yb = yAt((b / 2 + .5) * T.spb - tg);
      if (ya == null || yb == null) continue;
      const y0 = Math.min(ya, V.roadH), y1 = Math.min(yb, V.roadH); if (y0 === y1) continue;
      g.globalAlpha = .7 * fadeAt(Math.max(y0, y1));
      g.beginPath();
      for (let l = 1; l < V.nl; l++) { const u = -1 + l * 2 / V.nl; g.moveTo(V.cx + u * hw(y0), y0); g.lineTo(V.cx + u * hw(y1), y1); }
      g.stroke();
    }
    g.globalAlpha = 1;
    while (G.ci < T.notes.length && T.notes[G.ci].end - t < -.8) G.ci++;
    // LONG NOTES: a light trail stretching back from the pad for the note's length; while it's held it burns bright
    for (let k = G.ci; k < T.notes.length && T.notes[k].t - t <= G.lead; k++) {
      const n = T.notes[k];
      if (!n.trail) continue;
      const a = n.t - t, e = n.tEnd - t;
      if (e < -.3) continue;
      const hit = n.res && n.res !== 'miss', lit = hit && n.holding && e > 0;
      const from = hit ? Math.max(a, 0) : Math.max(a, -.3), pa = proj(from), pe = proj(Math.min(e, G.lead * 1.3));
      if (pe.y >= pa.y) continue;
      const x0 = laneX(n.lane, pa.s), x1 = laneX(n.lane, pe.s), w = V.padW * .34;
      const quad = k2 => { g.beginPath(); g.moveTo(x0 - w * k2 * pa.s, pa.y); g.lineTo(x0 + w * k2 * pa.s, pa.y); g.lineTo(x1 + w * k2 * pe.s, pe.y); g.lineTo(x1 - w * k2 * pe.s, pe.y); g.closePath(); };
      g.fillStyle = n.res === 'miss' ? tok('text-dim') : tok('mh-' + n.color);
      if (lit && FX.q !== 'lo') { g.globalAlpha = .3; quad(1.9); g.fill(); }
      g.globalAlpha = n.res === 'miss' ? .2 : lit ? .95 : hit ? .3 : .55; quad(1); g.fill();
      if (lit) { g.fillStyle = tok('text-hi'); g.globalAlpha = .7; quad(.35); g.fill(); }
      g.globalAlpha = 1;
    }
    // THE PADS (a hit pad is consumed by its gate; a missed one rolls on, grey, and fades)
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = G.ci; k < T.notes.length; k++) {
      const n = T.notes[k], dt = n.t - t;
      if (dt > G.lead) break;
      if (dt < -.45 || (n.res && n.res !== 'miss')) continue;
      const p = proj(dt), x = laneX(n.lane, p.s), w = V.padW * p.s, h = V.padH * p.s, y = p.y;
      const al = Math.min(1, (G.lead - dt) / (G.lead * .15)) * (dt < 0 ? Math.max(0, 1 + dt / .45) : 1);
      if (al <= 0) continue;
      const colr = n.res === 'miss' ? tok('text-dim') : tok('mh-' + n.color);
      if (FX.q !== 'lo' && !n.res) { g.globalAlpha = .28 * al; g.fillStyle = colr; rrect(g, x - w / 2 - 5 * p.s, y - h / 2 - 5 * p.s, w + 10 * p.s, h + 10 * p.s, h * .6); g.fill(); }
      g.globalAlpha = al; g.fillStyle = colr; rrect(g, x - w / 2, y - h / 2, w, h, h * .42); g.fill();
      g.fillStyle = tok('text-hi'); g.globalAlpha = .35 * al; rrect(g, x - w * .4, y - h * .38, w * .8, h * .26, h * .13); g.fill();
      g.globalAlpha = al; g.strokeStyle = tok('deep'); g.lineWidth = Math.max(1.2, 2.6 * p.s); rrect(g, x - w / 2, y - h / 2, w, h, h * .42); g.stroke();
      if (names && h >= 9) { g.fillStyle = tok('deep'); g.font = `${Math.round(h * .66)}px ${FONT}`; g.fillText(n.label, x, y + h * .04); }
      if (G.trace) G.trace.pads[n.k] = y;
    }
    g.globalAlpha = 1;
    drawGates();
  }
  /* the gates' glow (GL, below) and the red miss outline */
  function drawGates() {
    const g = V.g, now = performance.now();
    GL.lanes.forEach((ln, l) => {
      const x = laneX(l), gw = V.gateW, gh = V.gateH, bad = Math.max(0, 1 - (now - ln.badAt) / R.badMs);
      if (ln.v > 0) {
        const c = tok('mh-' + ln.col);
        g.fillStyle = c;
        if (FX.q !== 'lo') { g.globalAlpha = .18 * ln.v; rrect(g, x - gw / 2 - 14, V.sy - gh / 2 - 14, gw + 28, gh + 28, gh * .6); g.fill();
          g.globalAlpha = .3 * ln.v; rrect(g, x - gw / 2 - 6, V.sy - gh / 2 - 6, gw + 12, gh + 12, gh * .5); g.fill(); }
        g.globalAlpha = .6 * ln.v; rrect(g, x - gw / 2, V.sy - gh / 2, gw, gh, gh * .35); g.fill();
        g.globalAlpha = ln.v; g.strokeStyle = c; g.lineWidth = 3; g.stroke();
      }
      if (bad > 0) { g.globalAlpha = .55 * bad; g.strokeStyle = tok('red'); g.lineWidth = 2.5; rrect(g, x - gw / 2, V.sy - gh / 2, gw, gh, gh * .35); g.stroke(); }
    });
    g.globalAlpha = 1;
  }

  /* CARD SPACING (settings.js), for the pads: the time a pad is on the road (G.lead) and the pad size for this song.
     Two pads dt apart (the song's quickest step from one note to the next) at any depth d: their gap =
     H (1 - (1+K)^(-dt/lead)) / d, a pad is padH / d, so the rule is H (1 - (1+K)^(-dt/lead)) >= (1 + cardGap) × padH
     (× wideMul for WIDE): measured at the strike line, and it holds everywhere up the road. */
  function spacing() {
    const T = G.T, K = V.K, H = V.sy - V.hy, lnK = Math.log(1 + K);
    let dt = Infinity;
    for (let k = 1; k < T.notes.length; k++) { const d = T.notes[k].t - T.notes[k - 1].t; if (d > 1e-4) dt = Math.min(dt, d); }
    if (!isFinite(dt)) dt = T.spb;
    const mul = (1 + R.cardGap) * (wide ? R.wideMul : 1);
    const pref = Math.min(R.leadMaxS, Math.max(R.leadMinS, R.leadBeats * T.spb));
    const leadFor = h => { const f = mul * h / H; return f >= .999 ? 0 : dt * lnK / -Math.log(1 - f); };
    let scale = 1, lead = Math.min(pref, leadFor(V.padH0));
    if (lead < R.readMinS) {                                      // too fast to read: smaller pads for this song
      const h = (1 - Math.pow(1 + K, -dt / R.readMinS)) * H / mul;
      scale = Math.max(R.cardMinScale, Math.min(1, h / V.padH0));
      lead = Math.min(pref, leadFor(V.padH0 * scale));
    }
    G.lead = lead;
    V.padW = V.padW0 * scale; V.padH = V.padH0 * scale;
    G.spacing = {dt: +dt.toFixed(3), lead: +lead.toFixed(3), scale: +scale.toFixed(3), wide, padPx: Math.round(V.padH), lanes: V.nl,
      pxPerBeat: Math.round(H * lnK / lead * T.spb), gapPx: Math.round(H * (1 - Math.pow(1 + K, -dt / lead)) - V.padH)};
  }
  function buildPads() {
    spacing();
    G.ci = 0;                                                      // the first note that hasn't left the road yet
    G.T.notes.forEach(n => {
      n.color = unpitched ? (n.n.stick === 'L' ? 'g' : 'e') : COLORS[((n.n.midi % 12) + 12) % 12];
      n.label = unpitched ? n.n.stick : n.n.label;
    });
  }
  function cardDone(n, res) {
    const g = staffNote(n);
    if (g) g.classList.add(res === 'miss' ? 'miss' : 'hit');
  }
  const staffNote = n => document.getElementById('mhn' + (G.practice ? n.k % G.T.perLoop : n.k));

  /* ---------- THE GATE GLOW (visual only; see settings.js) ----------
     A right note in time (PERFECT / GOOD / OK) lights its lane's gate, and the note on the staff, in the pad's color.
     A long note stays lit while it is held (the same check as the hold bonus: n.holding; its trail burns bright too)
     and fades as soon as it isn't; a short note stays lit glowLingerMs past its end, so a run of right notes keeps the
     gates lit. It never blinks: it fades in (60 ms) and out (200 ms), and a gate goes out at most once every
     glowMinCycleMs (≤ 3 times a second); reduced motion = on/off with no fades. Misses and wrong notes: a dim red
     gate outline. */
  const GL = {lanes: [], last: null};
  function glowHit(n) {
    const ln = GL.lanes[n.lane]; if (!G || !ln) return;
    if (ln.n && ln.n !== n) litNote(ln.n, false);
    ln.n = n; ln.col = n.color; ln.target = 1; GL.last = n;
    litNote(n, true);
  }
  function litNote(n, on) {
    const g = G && staffNote(n);
    if (g) { if (on) g.style.setProperty('--gc', `var(--mh-${n.color || 'c'})`); g.classList.toggle('lit', on); }
  }
  function glowFrame(t) {
    const now = performance.now(), dms = Math.min(100, now - (GL.at || now)); GL.at = now;
    GL.lanes.forEach(ln => {
      const n = ln.n;
      if (ln.target && n) {
        const want = n.trail ? n.holding && t < n.tEnd : t < n.end + R.glowLingerMs / 1000;
        if (!want && now - ln.offAt >= R.glowMinCycleMs) { ln.offAt = now; ln.target = 0; litNote(n, false); ln.n = null; }
      }
      if (reduced()) ln.v = ln.target;
      else if (ln.v < ln.target) ln.v = Math.min(1, ln.v + dms / 60);
      else if (ln.v > ln.target) ln.v = Math.max(0, ln.v - dms / 200);
    });
  }
  function glowOff() {
    GL.lanes.forEach(ln => { if (ln.n && G) litNote(ln.n, false); ln.v = ln.target = 0; ln.n = null; ln.offAt = -1e9; });
    GL.last = null;
  }
  function badPad(lane) {
    const ln = GL.lanes[lane], now = performance.now();
    if (!ln || now - ln.badAt < R.glowMinCycleMs) return;
    ln.badAt = now;
  }
  let judgeT = 0;
  const WORD = {perfect: 'PERFECT', good: 'GOOD', ok: 'OK', early: 'EARLY', late: 'LATE', miss: 'MISS'};
  function showJudge(res, d, lane) {
    const j = $('judge');
    if (lane != null && V.W) j.style.left = Math.max(130, Math.min(V.W - 130, laneX(lane))) + 'px';
    j.className = 'mh-judge ' + res; void j.offsetWidth; j.classList.add('pop');
    j.innerHTML = WORD[res] + (G.combo >= 5 ? `<small>${G.combo} combo${G.mult > 1 ? ' · ×' + G.mult : ''}</small>` : '');
    clearTimeout(judgeT); judgeT = setTimeout(() => { j.textContent = ''; j.className = 'mh-judge'; }, 700);
  }
  function showCount(s) {
    const c = $('count');
    if (c.dataset.v === s) return;
    c.dataset.v = s; c.textContent = s; c.classList.remove('pop'); void c.offsetWidth; if (s) c.classList.add('pop');
  }
  let tipT = 0;
  function showTip(s) { const t = $('tip'); t.textContent = s; t.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => { t.hidden = true; }, 5000); }
  function hud() {
    $('hudScore').textContent = G.score;
    $('hudCombo').textContent = G.combo + (G.mult > 1 ? ' ×' + G.mult : '');
    if (G.practice) {
      const L = G.loopStats[G.shownLoop || 0], P = G.loopStats[(G.shownLoop || 0) - 1];
      const s = L && L.c ? L : P; $('hudAcc').textContent = s && s.c ? Math.round(s.v / s.c * 100) + '%' : '–';
    } else $('hudAcc').textContent = G.judged ? Math.round(G.value / G.judged * 100) + '%' : '–';
  }

  /* ---------- the scrolling staff: the song as printed music (notation.js), the student's clef + key signature pinned
     on the left, letter names, a playhead. It scrolls by THE TIME -> X MAP of the engraving, so the playhead reaches
     each notehead exactly when its card reaches the strike line (the staff's speed changes a little; the cards don't). */
  /** the song's notes + rests of measures from..to as notation events (ids = the notes' staff ids) */
  function staffEvents(map, from, to, idOf) {
    const base = (from - 1) * map.beatsPerMeasure, inR = e => e.measure >= from && e.measure <= to;
    return map.notes.filter(inR).map((n, j) => ({t: n.t - base, beats: n.beats, n: n.n, label: unpitched ? n.stick : n.label, id: idOf(n, j)}))
      .concat((map.rests || []).filter(inR).map(r => ({t: r.t - base, beats: r.beats, rest: true})));
  }
  function buildStaff() {
    const m = G.map, P = G.practice, from = P ? P.from : 1, to = P ? P.to : m.measures;
    const E = A.MHNotation.engrave({clef: unpitched ? null : m.clef, sig: m.sig, per: m.beatsPerMeasure, timeSig: G.song.timeSig,
      measures: to - from + 1, header: 'time', x0: 6, captions: true, final: !P,
      events: staffEvents(m, from, to, (n, j) => 'mhn' + (P ? j : m.notes.indexOf(n)))});
    const box = $('staffBox'), h = V.staffH - 10, scale = h / E.vb.h;
    const strip = $('staffStrip');
    strip.innerHTML = E.svg;
    const s = strip.firstChild; s.style.width = E.vb.w * scale + 'px'; s.style.height = h + 'px';
    const pin = A.MHNotation.pinSVG({clef: unpitched ? null : m.clef, sig: m.sig, top: E.vb.top, h: E.vb.h});
    $('staffPin').innerHTML = pin.svg;
    const ps = $('staffPin').firstChild; ps.style.height = h + 'px'; ps.style.width = pin.w * scale + 'px';
    V.st = {scale, E, pinPx: pin.w * scale};
    V.st.play = V.st.pinPx + Math.min(120, box.clientWidth * .12);
    $('playhead').style.left = V.st.play + 'px';
    moveStaff(-G.T.per * G.T.spb);
  }
  /** where the staff is at song time t (seconds): the engraving's x (staff units) under the playhead */
  function staffX(t) {
    if (G.practice && t >= 0) t -= Math.floor(t / G.T.loopLen) * G.T.loopLen;
    return Math.max(0, V.st.E.xAt(Math.max(-G.T.per, t / G.T.spb)));   // (the count-in: the staff waits at its start)
  }
  function moveStaff(t) {
    if (!V.st) return;
    if (G.practice && t >= 0) {                                    // practice: one loop's staff, the playhead wraps around
      const L = Math.floor(t / G.T.loopLen);
      if (L !== V.st.loop) { V.st.loop = L; $('staffStrip').querySelectorAll('g.hit,g.miss').forEach(g => g.classList.remove('hit', 'miss')); }
    }
    V.st.x = staffX(t);
    $('staffStrip').style.transform = `translateX(${(V.st.play - V.st.x * V.st.scale).toFixed(1)}px)`;
  }

  /* ================= THE END: results ================= */
  function finish() {
    const g = G; g.phase = 'done';
    clearInterval(sched); sched = 0; cancelAnimationFrame(raf); raf = 0;
    if (kit) { const k = kit; kit = null; k.fade(.4); setTimeout(() => k.stopAll(), 600); }
    A.Pitch.demoAttacks = false;
    if (g.guide) return practiceDone(g);
    const total = g.T.notes.length, acc = total ? g.value / total * 100 : 0;
    const stars = g.practice || g.slow ? 0 : R.stars.filter(s => acc >= s - 1e-9).length;
    const lvKey = g.i + 1, prev = A.store.level(GAME_ID, member.id, lvKey);
    let newBest = false;
    let turboNew = false;
    if (!g.practice && !g.slow) {                                  // NORMAL and TURBO count; the best stars and score are kept
      newBest = g.score > (prev.best || 0);
      A.store.setLevel(GAME_ID, member.id, lvKey, {stars: Math.max(stars, prev.stars || 0), best: Math.max(g.score, prev.best || 0)});
      if (g.speed === 'turbo' && stars >= 1) {                     // the ⚡ TURBO badge on this song (per instrument)
        const tb = gd().turbo || {}, mine = tb[member.id] || (tb[member.id] = {});
        turboNew = !mine[g.song.id]; mine[g.song.id] = true; save({turbo: tb});
      }
    }
    $('play').hidden = true; document.documentElement.classList.remove('mh-playing');
    const shownStars = g.practice || g.slow ? null : stars;
    $('resStars').innerHTML = shownStars == null ? '' : A.starStr(shownStars);
    ['resFvBox', 'resCounts'].forEach(id => { $(id).hidden = false; }); $('resPlay').hidden = true; $('resRetry').textContent = 'Play again';
    document.querySelector('#results .mh-stats').hidden = false;
    $('resFvBox').hidden = !g.fv.n;                                 // FULL VALUE HELD: quarter notes and longer (not the snare)
    $('resFv').textContent = g.fv.n ? Math.round(g.fv.held / g.fv.n * 100) + '%' : '–';
    $('resTitle').textContent = g.practice ? 'Practice done' : g.slow ? 'Slow practice done' : stars ? (stars === 3 ? 'Superstar!' : 'Song complete!') : 'Keep practicing!';
    $('resMsg').textContent = g.practice ? `You looped measures ${g.practice.from}–${g.practice.to}. Try the whole song again!` :
      g.slow ? 'Slow mode is for practice (no stars). Ready for full speed?' :
      stars === 3 ? 'Right on the beat. The band loves you!' : stars ? `${Math.round(R.stars[stars] || 100)}% accuracy gets the next star.` : `Reach ${R.stars[0]}% accuracy for a star. Practice the trouble spot below, then try again!`;
    $('resScore').textContent = g.score; $('resAcc').textContent = Math.round(acc) + '%'; $('resCombo').textContent = g.maxCombo;
    const c = g.counts;
    $('resCounts').innerHTML = [['perfect', 'Perfect'], ['good', 'Good'], ['ok', 'OK'], ['early', 'Early'], ['late', 'Late'], ['miss', 'Miss']]
      .map(([k, l]) => `<span class="mc-${k}"><b>${c[k]}</b>${l}</span>`).join('') + (g.bonus ? `<span class="mc-bonus"><b>+${g.bonus}</b>Hold bonus</span>` : '') +
      (g.fv.pts ? `<span class="mc-bonus"><b>+${g.fv.pts}</b>Full value</span>` : '');
    $('resBest').textContent = (turboNew ? '⚡ TURBO badge earned! ' : '') + (g.practice || g.slow ? '' : newBest && prev.best ? `New best score! (was ${prev.best})` : prev.best ? `Best: ${Math.max(prev.best, g.score)}` : '');
    trouble(g);
    const next = g.i + 1 < SONGS.length && unlocked(g.i + 1);
    $('resNext').hidden = !next || !!g.practice;
    $('results').hidden = false;
    $('results').dataset.song = g.i; $('results').dataset.guide = '';
    lastG = g; G = null;
    const snd = [!g.practice && !g.slow ? (stars ? 'level-complete' : 'level-failed') : 'level-complete'];
    if (stars > (prev.stars || 0)) snd.push('star-earned');
    if (newBest && prev.best) snd.push('new-high-score');
    A.Sfx.sequence(snd, 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Skins.announce($('results').querySelector('.panel'));
  }
  let lastG = null;
  /* the end of a PRACTICE run: no score, no stars, nothing saved */
  function practiceDone(g) {
    $('play').hidden = true; document.documentElement.classList.remove('mh-playing');
    $('resStars').innerHTML = ''; $('resTitle').textContent = 'Practice complete!';
    $('resMsg').textContent = unpitched ? 'You heard the whole song and saw every stick. Ready to play it for real?' : 'You heard every note of the song. Ready to play it for real?';
    document.querySelector('#results .mh-stats').hidden = true; $('resCounts').hidden = true; $('resBest').textContent = ''; $('trouble').hidden = true;
    $('resPlay').hidden = false; $('resNext').hidden = true; $('resRetry').textContent = 'Practice again';
    $('results').hidden = false; $('results').dataset.song = g.i; $('results').dataset.guide = '1';
    lastG = g; G = null;
    A.Sfx.sequence(['level-complete'], 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Skins.announce($('results').querySelector('.panel'));
  }
  /* a quiet FULL VALUE pop-up over the note's gate (a fade, never a flash) */
  let fvT = 0;
  function fvPop(n) {
    const f = $('fv'); if (!f || !V.W) return;
    f.style.left = Math.max(80, Math.min(V.W - 80, laneX(n.lane))) + 'px';
    f.textContent = 'FULL VALUE'; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
    clearTimeout(fvT); fvT = setTimeout(() => f.classList.remove('show'), 900);
  }
  /* ?demo: the snare's sticking and lanes for the first two measures, in the console */
  function stickingSelfCheck() {
    const rows = G.T.notes.filter(n => n.measure <= 2).map(n => ({measure: n.measure, beat: +(n.n.t % G.T.per + 1).toFixed(2), stick: n.n.stick, lane: G.lanes.lanes[n.lane].label}));
    const ok = rows.every(r => r.stick === r.lane);
    console.info(`Music Highway sticking self-check (${G.map.sticking}): ${ok ? 'OK, every note is in its hand\'s lane' : 'MISMATCH'}\n` + rows.map(r => `  m${r.measure} beat ${r.beat}: ${r.stick} -> lane ${r.lane}`).join('\n'));
    G.stickCheck = {ok, rows};
  }
  /* the trouble spot: the measures (practiceMeasures long) with the most misses (early/late count half) */
  function trouble(g) {
    const box = $('trouble');
    if (g.practice) { box.hidden = true; return; }
    const per = {}, span = R.practiceMeasures;
    g.T.notes.forEach(n => { const w = n.res === 'miss' ? 1 : n.res === 'early' || n.res === 'late' ? .5 : n.res === 'ok' ? .2 : 0; per[n.measure] = (per[n.measure] || 0) + w; });
    let best = null;
    for (let m = 1; m <= g.T.measures - span + 1; m++) {
      let s = 0; for (let k = 0; k < span; k++) s += per[m + k] || 0;
      if (s > 0 && (!best || s > best.s)) best = {m, s};
    }
    if (!best) { box.hidden = true; return; }
    const from = best.m, to = Math.min(g.T.measures, best.m + span - 1);
    const notes = g.T.notes.filter(n => n.measure >= from && n.measure <= to);
    const misses = notes.filter(n => n.res === 'miss').length;
    $('troubleMsg').textContent = `Measures ${from}–${to}: ${misses ? misses + ' missed' : 'a little off the beat'}. Loop it slowly until it feels easy.`;
    const E = A.MHNotation.engrave({clef: unpitched ? null : g.map.clef, sig: g.map.sig, per: g.map.beatsPerMeasure, timeSig: g.song.timeSig,
      measures: to - from + 1, header: 'full', captions: true, label: 'The trouble spot',
      events: staffEvents(g.map, from, to, (n, j) => 'mht' + j)});
    $('troubleStaff').innerHTML = E.svg;
    notes.forEach((n, k) => { const el = document.getElementById('mht' + k); if (el && n.res === 'miss') el.classList.add('miss'); });
    $('practiceBtn').onclick = () => begin(g.i, {practice: {from, to}});
    box.hidden = false;
  }
  $('resRetry').onclick = () => begin(+$('results').dataset.song, {guide: $('results').dataset.guide === '1'});
  $('resPlay').onclick = () => { playMode = 'play'; save({mode: 'play'}); drawOpts(); begin(+$('results').dataset.song, {guide: false}); };
  $('resNext').onclick = () => { const i = +$('results').dataset.song + 1; $('results').hidden = true; begin(i, {guide: false}); };
  $('resSongs').onclick = () => showHub();

  /* ================= PAUSE ================= */
  /* ================= PAUSE =================
     Pausing stops the scheduler and every scheduled or sounding backing sound (drums, clicks, the headphones band), the
     song clock and the drawing freeze where they are (frame() draws nothing while paused), and nothing heard counts.
     RESUME goes back ONE MEASURE (never before the start), counts in one measure and plays on from there, on a new
     clock start: drums, pads, staff and judging stay in step. Notes already judged keep their result (judge() skips them).
     Auto-pause: a hidden tab, a locked device, or the window losing focus for more than PAUSE_BLUR_MS. */
  const PAUSE_BLUR_MS = 600;
  function pause() {
    if (!G || G.paused || G.phase === 'done') return;
    G.pausedRaw = songNow(); G.pausedAt = Math.max(0, G.pausedRaw); G.paused = true; G.pauses = (G.pauses || 0) + 1;
    clearInterval(sched); sched = 0;
    if (kit) { kit.stopAll(); kit = A.MHBacking.create(CLK.ctx, CLK.out); }
    G.pendingAtk = []; G.soft = [];
    G.T.notes.forEach(n => { n.holding = false; });                // a held note stops counting (its bonus so far stays)
    glowOff(); showCount('');
    A.Pitch.demoAttacks = false;
    $('pScore').textContent = G.guide ? '–' : G.score;
    $('pAccL').textContent = G.practice ? 'This loop' : 'Accuracy';
    $('pAcc').textContent = $('hudAcc').textContent;
    $('pausePanel').hidden = false;
    setTimeout(() => $('resumeBtn').focus(), 0);
  }
  function resume() {
    if (!G || !G.paused) return;
    $('pausePanel').hidden = true;
    const T = G.T, bar = T.per * T.spb;
    const beat = Math.floor(G.pausedAt / T.spb + 1e-6) * T.spb;     // back one measure from the beat we stopped on
    const from = Math.max(0, beat - bar);
    G.fileStarted = false;
    G.resumes = (G.resumes || []).concat({at: +G.pausedAt.toFixed(3), from: +from.toFixed(3)});
    A.Pitch.demoAttacks = true; A.Pitch.ignoreCurrent();
    play(from);
  }
  $('pauseBtn').onclick = () => pause();
  $('resumeBtn').onclick = resume;
  $('restartBtn').onclick = () => { const i = G ? G.i : 0, pr = G && G.practice, gd2 = !!(G && G.guide); $('pausePanel').hidden = true; startSong(i, {practice: pr, guide: gd2}); };
  /* SONG MENU: the song ends at once: no results, no stars, nothing saved; the song select comes back with this song
     still selected (LevelSelect remembered it when it started) */
  $('quitBtn').onclick = () => { $('pausePanel').hidden = true; showHub(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('pagehide', () => pause());
  let blurT = 0;
  addEventListener('blur', () => { clearTimeout(blurT); blurT = setTimeout(() => { if (!document.hasFocus()) pause(); }, PAUSE_BLUR_MS); });
  addEventListener('focus', () => clearTimeout(blurT));
  addEventListener('keydown', e => {
    if (!G || $('play').hidden || e.repeat) return;
    const k = e.key;
    if (k !== 'Escape' && k !== 'p' && k !== 'P') return;
    e.preventDefault();
    if (!G.paused) pause(); else if (k === 'Escape' || k === 'p' || k === 'P') resume();
  });
  addEventListener('resize', () => { if (G && !$('play').hidden) { layout(); spacing(); buildStaff(); } });

  /* ================= CALIBRATION: "Play any note on each of the 8 clicks" ================= */
  let calRun = null;
  function calibrate(done, {first = false} = {}) {
    const P = $('calPanel');
    $('calTitle').textContent = 'Timing check' + (hp ? ' (headphones)' : '');
    $('calMsg').textContent = (first ? 'First, a quick timing check. ' : '') + `Every microphone and speaker adds a tiny delay. Listen to ${R.calLead} clicks, then play any note (or hit) on each of the next ${R.calClicks} clicks, right with them.` +
      (hp ? ' Wear your headphones the whole time.' : '');
    $('calDots').innerHTML = Array.from({length: R.calLead + R.calClicks}, (_, k) => `<i class="${k < R.calLead ? 'lead' : ''}"></i>`).join('');
    $('calSay').textContent = '';
    $('calGo').hidden = false; $('calGo').textContent = 'Start'; $('calSkip').textContent = first ? 'Skip for now' : 'Cancel';
    P.hidden = false;
    const close = ok => { P.hidden = true; calRun = null; A.Pitch.demoAttacks = false; A.Sfx.gameMenuMusic(GAME_ID); done && done(ok); };
    $('calSkip').onclick = () => { if (calRun && calRun.timer) clearInterval(calRun.timer); if (calRun && calRun.kit) calRun.kit.stopAll(); close(false); };
    $('calGo').onclick = () => {
      $('calGo').hidden = true;
      A.Sfx.gameMenuMusic(GAME_ID, false);
      clockStart();
      const k2 = CLK.ctx ? A.MHBacking.create(CLK.ctx, CLK.out) : null;
      const spb = 60 / R.calBpm, t0 = nowCtx() + .6, n = R.calLead + R.calClicks;
      const clicks = Array.from({length: n}, (_, k) => t0 + k * spb);
      if (k2) clicks.forEach((t, k) => k2.click(t, R.clickVol * 1.3, k % 4 === 0));
      A.Pitch.demoAttacks = true; A.Pitch.demoTarget = calTarget;
      calRun = {attacks: [], frames: [], kit: k2, clicks};
      const dots = $('calDots').children;
      calRun.timer = setInterval(() => {
        sampleClock();
        const now = audAt(performance.now()), k = clicks.findIndex(t => t > now) - 1, kk = k < 0 ? (now > clicks[n - 1] ? n - 1 : -1) : k;
        [...dots].forEach((d, j) => d.classList.toggle('on', j <= kk));
        $('calSay').textContent = kk < 0 ? 'Get ready…' : kk < R.calLead ? `Listen… ${R.calLead - kk}` : 'Play on every click!';
        if (now > clicks[n - 1] + .7) { clearInterval(calRun.timer); calDone(); }
      }, 40);
    };
    function calDone() {
      const offs = [];
      calRun.clicks.slice(R.calLead).forEach(c => {
        const near = calRun.attacks.map(a => (audAt(a.time) - c) * 1000).filter(d => Math.abs(d) <= R.maxLagMs).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
        if (near != null) offs.push(near);
      });
      offs.sort((a, b) => a - b);
      const med = offs.length ? offs[Math.floor(offs.length / 2)] : null;
      A.Pitch.demoAttacks = false; A.Pitch.demoTarget = demoTargetGame;
      if (offs.length < R.calNeed || med == null) {
        $('calSay').textContent = offs.length ? `I heard ${offs.length} of ${R.calClicks}. Play a little louder, right on each click. Let's try again!` : "I didn't hear any notes. Check the microphone and play a little louder. Let's try again!";
        $('calGo').hidden = false; $('calGo').textContent = 'Try again';
        calRun = null;
        return;
      }
      const c = Object.assign({}, gd().calib || {}); c[mode()] = {ms: Math.round(med), n: offs.length, at: Date.now()};
      save({calib: c});
      $('calSay').textContent = `All set! Your timing check: ${Math.round(med)} ms.`;
      calRun = null;
      setTimeout(() => close(true), 1100);
    }
  }
  const demoTargetGame = A.Pitch.demoTarget;
  const calTarget = () => unpitched ? null : {pc: inst.targetPc[0], midi: 60 + inst.targetPc[0]};

  /* ================= HEADPHONES: THE SPEAKER CHECK ================= */
  let hpRun = null;
  function speakerCheck(done) {
    const P = $('hpPanel');
    $('hpMsg').textContent = 'In headphones mode the band also plays the melody, bass and chords, so the microphone must NOT hear them. Put your headphones on, stay quiet, and tap Check now: the game plays three test notes and listens.';
    $('hpGo').hidden = false; $('hpGo').textContent = 'Check now'; $('hpCancel').textContent = 'Cancel';
    $('hpMeter').firstElementChild.style.width = '0';
    P.hidden = false;
    const finishCheck = ok => { P.hidden = true; hpRun = null; A.Sfx.gameMenuMusic(GAME_ID); done(ok); };
    $('hpCancel').onclick = () => { if (hpRun) { hpRun.stop(); } finishCheck(false); };
    $('hpGo').onclick = () => {
      $('hpGo').hidden = true;
      A.Sfx.gameMenuMusic(GAME_ID, false);
      clockStart();
      if (!CLK.ctx) { $('hpMsg').textContent = 'Sound is off, so there is nothing to check. Turn the sound on (the speaker button) to use headphones mode.'; $('hpCancel').textContent = 'OK'; return; }
      const k2 = A.MHBacking.create(CLK.ctx, CLK.out);
      // three test notes the detector listens for: the student's first-five notes 1, 3 and 5 (concert), in its range
      const pcs = unpitched ? [10, 2, 5] : [inst.targetPc[0], inst.targetPc[2], inst.targetPc[4]];
      const lo = inst.minF ? 12 * Math.log2(inst.minF / 440) + 69 : 55, hi = inst.maxF ? 12 * Math.log2(inst.maxF / 440) + 69 : 80;
      const mid = Math.max(lo + 6, Math.min(hi - 4, 64));
      const midis = pcs.map(pc => { let m = Math.round(mid - 6); while (((m % 12) + 12) % 12 !== pc) m++; return m; });
      const t0 = CLK.ctx.currentTime + .4, len = .7, gap = .25;
      midis.forEach((m, k) => k2.tone(t0 + k * (len + gap), m, len, R.checkVol, 'guide'));
      const heard = [0, 0, 0];
      const start = performance.now() + 400 + (CLK.ctx.outputLatency || 0) * 1000;
      hpRun = {midis, heard, stop: () => k2.stopAll(), frame(r, level) {
        const k = Math.floor((performance.now() - start) / ((len + gap) * 1000));
        if (k < 0 || k > 2) return;
        $('hpMeter').firstElementChild.style.width = Math.min(100, A.Pitch.levelPct(level)) + '%';
        if (r && r.pc === ((midis[k] % 12) + 12) % 12) heard[k]++;
      }};
      if (A.DEMO) A.Pitch.demoTarget = () => null;
      setTimeout(() => {
        const loud = heard.filter(h => h >= R.checkFrames).length;
        const ok = loud < 2;
        hpRun = null;
        A.Pitch.demoTarget = demoTargetGame;
        if (ok) {
          $('hpMsg').textContent = 'The microphone can\'t hear the band: headphones mode is on. Bluetooth headphones add a delay, so run the timing check with them on.';
          $('hpCancel').textContent = 'OK';
          $('hpCancel').onclick = () => finishCheck(true);
        } else {
          $('hpMsg').textContent = 'It sounds like your speakers are on. Plug in headphones to use this mode.';
          $('hpGo').hidden = false; $('hpGo').textContent = 'Check again'; $('hpCancel').textContent = 'Keep it off';
          $('hpCancel').onclick = () => finishCheck(false);
        }
        speakerResult = {heard: heard.slice(), ok};
      }, 400 + 3 * (len + gap) * 1000 + 350 + (CLK.ctx.outputLatency || 0) * 1000);
    };
  }
  let speakerResult = null;

  /* ================= TESTS ================= */
  A.Highway = {
    state: () => G ? {song: G.song.id, phase: G.phase, t: +songNow().toFixed(3), T0: G.T0, score: G.score, combo: G.combo, maxCombo: G.maxCombo,
      counts: Object.assign({}, G.counts), judged: G.judged, total: G.T.notes.length, lag: G.lag, rate: G.rate, bleed: G.bleed, paused: G.paused,
      drums: G.hits.length, lateHits: G.lateHits || 0, file: !!G.fileStarted, clock: CLK.ctx ? 'audio' : 'perf', log: G.log.slice(-40)} : {phase: 'menu', last: lastG ? {counts: lastG.counts, score: lastG.score} : null},
    /** tests: play every note automatically, `offsetMs` from its time (the attack given the calibrated delay) */
    autoPlay(offsetMs = 0, {wrong = false, every = 1, hold = true} = {}) {
      const done = new Set();
      const tick = () => {
        if (!G) return;
        if (G.phase !== 'done') requestAnimationFrame(tick);
        const t = songNow();
        G.T.notes.forEach((n, k) => {
          if (done.has(n.k) || k % every) return;
          const off = Array.isArray(offsetMs) ? offsetMs[k % offsetMs.length] : offsetMs;
          if (t >= n.t + off / 1000) {
            done.add(n.k);
            const perf = performance.now() - (t - n.t - off / 1000) * 1000 + G.lag;
            G.recent.push(perf);
            const pc = unpitched ? null : wrong ? (n.pc + 2) % 12 : n.pc;
            if (unpitched) judge(songOf(perf), null, perf); else judge(songOf(perf), pc, perf);
            if (hold && n.trail && !wrong) { n.holding = true; n.lastHeard = performance.now(); const iv = setInterval(() => { if (!G || songNow() > n.end || (typeof hold === 'number' && songNow() > n.t + hold * n.dur)) return clearInterval(iv); if (G.paused || G.phase === 'count') return; n.lastHeard = performance.now(); n.held = Math.max(n.held, Math.min(n.dur, songNow() - n.t)); }, 40); }
          }
        });
      };
      tick();
    },
    start: (i, opts) => startSong(i, opts || {}),
    finish: () => G && finish(),
    speakerResult: () => speakerResult,
    speakerCheck: cb => speakerCheck(cb || (() => {})),
    calibrate: cb => calibrate(cb || (() => {})),
    clock: () => ({audible: CLK.ctx ? audAt(performance.now()) : null, current: CLK.ctx ? CLK.ctx.currentTime : null, off: CLK.off}),
    kitCount: () => kit ? kit.count() : 0,
    /** tests: the calibration's click times (context s), and the perf time (ms) at which context time t is heard */
    calClicks: () => calRun ? calRun.clicks.slice() : null,
    perfAt: t => CLK.ctx ? (t - CLK.off) * 1000 : null,
    /** tests: the card spacing of the song playing, and every card's box on the road at song time t (the drawing's math) */
    spacing: () => G && G.spacing,
    cardRects: t => G ? G.T.notes.filter(n => n.t - t <= G.lead && n.t - t >= -.45).map(n => {
      const p = proj(n.t - t), x = laneX(n.lane, p.s), w = V.padW * p.s, h = V.padH * p.s;
      return {k: n.k, lane: n.lane, x0: x - w / 2, x1: x + w / 2, y0: p.y - h / 2, y1: p.y + h / 2};
    }) : [],
    lanes: () => G ? {n: V.nl, labels: G.lanes.lanes.map(l => l.label), midis: G.lanes.lanes.map(l => l.midis), sy: V.sy, gates: G.lanes.lanes.map((_, l) => laneX(l))} : null,
    fx: () => ({q: FX.q, why: FX.why || null}),
    /** tests: the resumes so far ([{at, from}]) and the drum hits scheduled (context s) with the song's clock start */
    pauses: () => G ? {n: G.pauses || 0, resumes: G.resumes || [], T0: G.T0, from: G.from, spb: G.T.spb, dur: G.T.total} : null,
    paused: () => !!(G && G.paused),
    stickCheck: () => G && G.stickCheck,
    /** tests: record every backing tone from now on ({kind, at (song s), m}) */
    tones: () => { if (G) G.tones = G.tones || []; return G && G.tones; },
    notes: () => G ? G.T.notes.map(n => ({k: n.k, t: +n.t.toFixed(3), beats: n.beats, lane: n.lane, stick: n.n.stick || null, trail: !!n.trail, tEnd: +n.tEnd.toFixed(3), res: n.res, fullValue: !!n.fullValue, held: +n.held.toFixed(3), dur: +n.dur.toFixed(3)})) : null,
    mode: () => ({playMode, speed, melody, melVol, guide: !!(G && G.guide), rate: G ? G.rate : null}),
    fvStat: () => G ? Object.assign({}, G.fv) : lastG ? Object.assign({}, lastG.fv) : null,
    /** tests: record every frame from now on: {t, tx (the staff strip's translateX), pads: {note k: y of its center}} */
    trace: () => { if (G) { G.trace = {pads: {}}; G.traceLog = []; } },
    traceLog: () => G ? G.traceLog : null,
    names: () => names,
    staff: () => V.st ? {play: V.st.play, scale: V.st.scale, sy: V.sy, padH: V.padH, x: V.st.x} : null,
    glow: () => ({on: GL.lanes.some(l => l.target), k: GL.last && GL.lanes[GL.last.lane] && GL.lanes[GL.last.lane].target ? GL.last.k : null, lanes: GL.lanes.map(l => +l.v.toFixed(2))}),
  };

  showHub();
})(window.Arcade);
