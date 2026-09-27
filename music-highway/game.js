/* Music Highway: a play-along rhythm game. Fingering cards for the student's own instrument fly down a neon highway
   in time with a backing groove; the student plays each note as its card reaches the strike line. The microphone
   judges the pitch AND the timing (from the note's attack).
     songs.js     THE SONG LIST (scale degrees in a concert key) · song-map.js: songs -> each instrument's written notes
     settings.js  judging windows, scoring, stars, speeds, calibration, volumes · backing.js: the drums (+ headphones band)
   THE CLOCK: everything runs on the arcade's AudioContext (Sfx.output()): the drums are scheduled on it, and the
   highway, the staff and the judge all read the AUDIBLE time from it (getOutputTimestamp / outputLatency), so the
   cards reach the line exactly as the beat is heard and nothing drifts, however long the song. With the sound off the
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

  /* ---------- saved things: gameData('music-highway') = {calib: {speaker, headphones}, hp, slow, horn, tip} ---------- */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };
  let slow = !!gd().slow, hp = !!gd().hp, hornSide = gd().horn === 'Bb' ? 'Bb' : 'F';
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
    $('spdNormal').setAttribute('aria-pressed', String(!slow)); $('spdSlow').setAttribute('aria-pressed', String(slow));
    $('hpBtn').setAttribute('aria-pressed', String(hp)); $('hpBtn').classList.toggle('on', hp);
    $('hornOpt').hidden = member.id !== 'horn';
    $('hornF').setAttribute('aria-pressed', String(hornSide === 'F')); $('hornBb').setAttribute('aria-pressed', String(hornSide === 'Bb'));
    const c = (gd().calib || {})[mode()];
    $('optNote').textContent = (slow ? 'Slow: 75% speed, for practice. No stars. ' : '') +
      (hp ? 'Headphones mode: the band plays the melody, bass and chords too. Bluetooth headphones add a delay: recalibrate with them on. ' : '') +
      (c ? `Timing calibrated (${Math.round(c.ms)} ms${hp ? ', headphones' : ''}).` : 'Not calibrated yet: the first song starts with a quick timing check.');
    $('calBtn').textContent = c ? 'Recalibrate' : 'Calibrate';
  }
  $('spdNormal').onclick = () => { slow = false; save({slow}); A.Sfx.event('ui-toggle'); drawOpts(); showHub(); };
  $('spdSlow').onclick = () => { slow = true; save({slow}); A.Sfx.event('ui-toggle'); drawOpts(); showHub(); };
  $('hornF').onclick = () => { hornSide = 'F'; save({horn: 'F'}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('hornBb').onclick = () => { hornSide = 'Bb'; save({horn: 'Bb'}); A.Sfx.event('ui-toggle'); drawOpts(); };
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
      const map = SM.forMember(s, member, inst, {hornSide});
      const secs = Math.round((map.total + map.beatsPerMeasure) * 60 / s.tempo);
      return `<button class="lvl mh-song t${s.tier}" data-i="${i}" ${open ? '' : 'disabled'}>
        <span class="n">${TIER_NAME[s.tier]}</span>
        <span class="t">${esc(s.title)}</span>
        <span class="d">${esc(s.source)}<br>${s.tempo} beats a minute · ${s.timeSig[0]}/${s.timeSig[1]} · ${map.notes.length} notes · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : ''}</span></span>
      </button>`;
    }).join('');
    $('songGrid').querySelectorAll('.mh-song').forEach(b => b.addEventListener('click', () => begin(+b.dataset.i)));
    A.LevelSelect.show({screen: $('hub'), grid: $('songGrid'), cards: $('songGrid').querySelectorAll('.mh-song'), unlocked,
      label: i => SONGS[i].title + (slow ? ' · SLOW' : ''),
      lockText: i => `Get stars on 3 Tier ${SONGS[i].tier - 1} songs to unlock`});
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /** START on a song: the microphone, then (once) the headphones check and the timing check, then the song */
  function begin(i, opts = {}) {
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
  const COLORS = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b'];      // card color by letter (written)

  function buildTimeline(song, map, rate, practice) {
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
    const lanesOf = (() => {                                       // lane by pitch: low = left
      if (unpitched) return n => n.stick === 'L' ? 1 : 3;
      const pitches = [...new Set(map.notes.map(n => n.midi))].sort((a, b) => a - b), L = R.lanes;
      return n => pitches.length < 2 ? 2 : Math.round(pitches.indexOf(n.midi) / (pitches.length - 1) * (L - 1));
    })();
    const list = notes.map((n, k) => ({k, n, t: n.t * spb, beats: n.beats, dur: n.beats * spb, end: (n.t + n.beats) * spb, lane: lanesOf(n), measure: n.measure,
      orig: n.orig || n.measure, loop: n.loop || 0, pc: n.pc, midi: n.concert, long: !unpitched && n.beats >= R.holdFrom, res: null, held: 0}));
    return {spb, per, notes: list, measures, total: measures * per * spb, loops, from, perLoop: practice ? list.length / loops : list.length,
      loopLen: practice ? (practice.to - practice.from + 1) * per * spb : Infinity};
  }

  function startSong(i, {practice = null} = {}) {
    stopSong();
    const song = SONGS[i];
    A.LevelSelect.played(i);
    A.Sfx.gameMenuMusic(GAME_ID, false);                          // the menu music fades; the microphone listens again
    const rate = practice ? R.practiceRate : slow ? R.slowRate : 1;
    const map = SM.forMember(song, member, inst, {hornSide});
    const T = buildTimeline(song, map, rate, practice);
    G = {i, song, map, rate, practice, slow: !practice && slow, T, phase: 'count', score: 0, combo: 0, maxCombo: 0, mult: 1,
         counts: {perfect: 0, good: 0, ok: 0, early: 0, late: 0, miss: 0}, value: 0, judged: 0, pendingAtk: [], recent: [], soft: [],
         bleed: 0, bleedSamples: [], hits: [], lag: lagMs(), paused: false, loopStats: {}, log: []};
    $('hub').hidden = true; $('results').hidden = true; $('play').hidden = false;
    document.documentElement.classList.add('mh-playing');
    $('hudSong').textContent = song.title + (practice ? ' · practice' : G.slow ? ' · slow' : '');
    $('hudAccL').textContent = practice ? 'This loop' : 'Accuracy';
    layout(); buildCards(); buildStaff();
    showTip(practice ? `Practice: measures ${practice.from}–${practice.to}, looping at ${Math.round(R.practiceRate * 100)}% speed. Tap pause to stop.` :
      unpitched ? 'Play each hit as its card reaches the line. Stick with the R and L!' : 'Play each note as its card reaches the glowing line.');
    A.Pitch.ignoreCurrent();
    A.Pitch.demoAttacks = true;
    clockStart();
    kit = CLK.ctx ? A.MHBacking.create(CLK.ctx, CLK.out) : null;
    // the uploaded drums file (if any) is fetched now; the count-in gives it time. Practice and slow use the generated groove
    G.drumFile = null;
    if (kit && !practice && !unpitched) A.Sfx.buffer('mh-drums-' + song.id).then(b => { if (G && G.song === song && b) G.drumFile = b; });
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
      if (!G.fileStarted) groove.forEach(([at, drum, v]) => { if (unpitched && drum === 'snare') return; if (Math.abs(at - inMeasure) < .01 || (at % .25 && Math.abs(Math.floor(at * 4) / 4 - inMeasure) < .01)) {
        const tt = G.T0 + (b - inMeasure + at) * T.spb;
        if (tt < now) G.lateHits = (G.lateHits || 0) + 1;          // tests: a hit put on the clock after its time (a stalled page)
        kit[drum](tt, v * R.drumVol);
        G.hits.push(tt);
      } });
      if (hp && hpChecked) headphoneBand(b, t);
      G.nextBeat = Math.round((b + .25) * 4) / 4;
    }
    if (G.hits.length > 200) G.hits.splice(0, G.hits.length - 200);
  }
  /* headphones mode: the guide melody (the student's notes, quietly), a bass note on the strong beats, a soft chord */
  function headphoneBand(b, t) {
    const T = G.T;
    T.notes.filter(n => Math.abs(n.t / T.spb - b) < .01 && n.midi != null).forEach(n => kit.tone(G.T0 + n.t, n.midi, Math.max(.12, n.dur * .9), R.guideVol, 'guide'));
    const inM = b % T.per;
    if (Math.abs(inM) < .01 || (T.per === 4 && Math.abs(inM - 2) < .01)) {
      const m = Math.floor(b / T.per + 1e-6) + 1, orig = G.practice ? ((m - 1) % (G.practice.to - G.practice.from + 1)) + G.practice.from : m;
      const ch = G.map.chords[orig - 1];
      if (ch) {
        let root = ch.root; while (root > 50) root -= 12; while (root < 38) root += 12;
        kit.tone(t, root, T.spb * (T.per === 4 ? 1.8 : T.per * .9), R.bassVol, 'bass');
        if (Math.abs(inM) < .01) ch.tones.forEach(m2 => { let x = m2; while (x > 67) x -= 12; while (x < 55) x += 12; kit.tone(t, x, T.spb * T.per * .95, R.padVol, 'pad'); });
      }
    }
  }

  function stopSong() {
    clearInterval(sched); sched = 0; cancelAnimationFrame(raf); raf = 0;
    if (kit) { kit.stopAll(); kit = null; }
    A.Pitch.demoAttacks = false;
    G = null;
  }

  /* ================= INPUT: attacks + pitch (see settings.js) ================= */
  A.Pitch.demoTarget = () => {
    if (!G) return null;
    const t = songNow(), n = G.T.notes.find(x => !x.res && x.t > t - R.outerMs / 1000);
    return n ? (unpitched ? null : {pc: n.pc, midi: n.midi}) : null;
  };
  const songNow = (p = performance.now()) => G ? audAt(p) - G.T0 : 0;
  /** an attack's song time, corrected by the calibration */
  const songOf = perf => songNow(perf) - G.lag / 1000;

  A.Pitch.onAttack(a => {
    if (calRun) { calRun.attacks.push(a); return; }
    if (!G || G.paused) return;
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
      if (pc != null && G.T.notes.some(n => !n.res && Math.abs(t - n.t) <= W)) wrongNote(pc);
      return false;
    }
    const d = (t - best.t) * 1000, ad = Math.abs(d);
    const res = ad <= R.perfectMs ? 'perfect' : ad <= R.goodMs ? 'good' : ad <= R.okMs ? 'ok' : d < 0 ? 'early' : 'late';
    mark(best, res, d);
    if (best.long) { best.holding = true; best.lastHeard = performance.now(); }
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
    showJudge(res, d);
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
    if (!G || G.paused) return;
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
      if (!n.res && t > n.t + late) mark(n, 'miss', null);
      if (n.long && n.res && n.res !== 'miss' && !n.bonused && t > n.end) {
        n.bonused = true; n.holding = false;
        const beats = n.held / G.T.spb;
        if (beats > .25) { const pts = Math.round(beats * R.holdPoints); G.score += pts; G.bonus = (G.bonus || 0) + pts; hud(); }
      }
    });
    drawHighway(t);
    moveStaff(t);
    if (G.practice) {
      const L = Math.floor(Math.max(0, t) / (G.T.total / G.T.loops));
      if (L !== G.shownLoop) { G.shownLoop = L; hud(); }
    }
    if (t > G.T.total + .6 && G.phase === 'play') finish();
  }

  /* ---------- layout + the road ---------- */
  const V = {};
  function layout() {
    const P = $('play'), W = P.clientWidth, H = P.clientHeight;
    const staffH = Math.round(Math.max(96, Math.min(170, H * .2)));
    const roadH = H - staffH;
    Object.assign(V, {W, H, roadH, staffH, cx: W / 2, hy: roadH * .1, sy: roadH * .84, K: 2.6});
    V.half = Math.min(W * .46, roadH * .72);
    V.laneW = V.half * 2 / R.lanes;
    V.cardW = Math.min(190, V.laneW * .98); V.cardH = V.cardW * (unpitched ? .9 : 1);
    const c = $('road'), dpr = Math.min(1.5, devicePixelRatio || 1);
    c.width = Math.round(W * dpr); c.height = Math.round(roadH * dpr); c.style.width = W + 'px'; c.style.height = roadH + 'px';
    V.g = c.getContext('2d'); V.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    V.bg = drawStatic(W, roadH, dpr);
    $('staffBox').style.height = staffH + 'px';
    P.style.setProperty('--cardw', V.cardW + 'px'); P.style.setProperty('--cardh', V.cardH + 'px');
    P.style.setProperty('--sy', V.sy + 'px');
    // the pads on the strike line
    $('pads').innerHTML = Array.from({length: R.lanes}, (_, l) => `<i class="mh-pad" style="left:${V.cx + (l - (R.lanes - 1) / 2) * V.laneW}px;top:${V.sy}px;width:${V.laneW * .8}px"></i>`).join('');
  }
  const TOK = {}, tok = name => TOK[name] || (TOK[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || 'white');
  /* the parts that never move, drawn once: the night sky, the stars, the sun on the horizon, the road and its lanes */
  function drawStatic(W, H, dpr) {
    const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, tok('deep')); sky.addColorStop(.1, tok('mh-sky')); sky.addColorStop(1, tok('floor'));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = tok('text-hi');
    for (let i = 0; i < 90; i++) { g.globalAlpha = .15 + rnd() * .5; g.fillRect(rnd() * W, rnd() * V.hy * 1.6, 1.3, 1.3); }
    g.globalAlpha = 1;
    // the sun, half under the horizon
    const r = Math.min(W * .12, H * .12), sun = g.createLinearGradient(0, V.hy - r, 0, V.hy);
    sun.addColorStop(0, tok('mh-sun1')); sun.addColorStop(1, tok('mh-sun2'));
    g.save(); g.beginPath(); g.rect(0, 0, W, V.hy); g.clip();
    g.fillStyle = sun; g.globalAlpha = .55; g.beginPath(); g.arc(V.cx, V.hy, r, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1; g.fillStyle = tok('deep');
    for (let k = 0; k < 4; k++) g.fillRect(V.cx - r, V.hy - r * (.14 + k * .2), r * 2, 1.5 + k);
    g.restore();
    // the road
    const far = 1 + V.K, xAt = (x, d) => V.cx + x / d, yAt = d => V.hy + (V.sy - V.hy) / d;
    const dBottom = (V.sy - V.hy) / (H - V.hy);
    g.beginPath(); g.moveTo(xAt(-V.half, far), yAt(far)); g.lineTo(xAt(V.half, far), yAt(far));
    g.lineTo(xAt(V.half, dBottom), H); g.lineTo(xAt(-V.half, dBottom), H); g.closePath();
    const rd = g.createLinearGradient(0, V.hy, 0, H); rd.addColorStop(0, tok('floor-2')); rd.addColorStop(1, tok('mh-road'));
    g.fillStyle = rd; g.fill();
    for (let l = 0; l <= R.lanes; l++) {
      const x = -V.half + l * V.laneW, edge = l === 0 || l === R.lanes;
      g.strokeStyle = edge ? tok('pink') : tok('mh-lane'); g.lineWidth = edge ? 3 : 1.4; g.globalAlpha = edge ? .9 : .5;
      if (edge) { g.shadowColor = tok('pink'); g.shadowBlur = 10; } else g.shadowBlur = 0;
      g.beginPath(); g.moveTo(xAt(x, far), yAt(far)); g.lineTo(xAt(x, dBottom), H); g.stroke();
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
    // the strike line
    g.strokeStyle = tok('cyan'); g.lineWidth = 4; g.shadowColor = tok('cyan'); g.shadowBlur = 14;
    g.beginPath(); g.moveTo(V.cx - V.half, V.sy); g.lineTo(V.cx + V.half, V.sy); g.stroke(); g.shadowBlur = 0;
    return c;
  }
  /** where a moment dt seconds away is on the road: {y, s (scale), d} */
  function proj(dt) {
    const L = G.lead, z = dt / L;
    const d = z >= 0 ? 1 + V.K * z : Math.max(.62, 1 + z * 1.4);
    return {d, s: 1 / d, y: V.hy + (V.sy - V.hy) / d};
  }
  function drawHighway(t) {
    const g = V.g, T = G.T;
    g.clearRect(0, 0, V.W, V.roadH);
    g.drawImage(V.bg, 0, 0, V.W, V.roadH);
    // beat lines rolling toward the strike line (measure lines brighter): the music's pulse on the road
    const b0 = Math.ceil((t - .4) / T.spb), b1 = Math.floor((t + G.lead) / T.spb);
    for (let b = Math.max(b0, -T.per); b <= b1; b++) {
      const p = proj(b * T.spb - t); if (p.y > V.roadH) continue;
      const bar = ((b % T.per) + T.per) % T.per === 0;
      g.strokeStyle = bar ? tok('mh-lane') : tok('floor-3'); g.globalAlpha = (bar ? .8 : .45) * Math.min(1, (1 - (p.d - 1) / V.K) * 1.5);
      g.lineWidth = bar ? 2 : 1;
      g.beginPath(); g.moveTo(V.cx - V.half * p.s, p.y); g.lineTo(V.cx + V.half * p.s, p.y); g.stroke();
    }
    g.globalAlpha = 1;
    // long notes' glowing tails (filled gold as they are held)
    for (let k = G.ci; k < T.notes.length && T.notes[k].t - t <= G.lead; k++) {
      const n = T.notes[k];
      if (!n.long) continue;
      const a = n.t - t, e = n.end - t;
      if (e < -.5 || a > G.lead) continue;
      const pa = proj(Math.max(a, -.35)), pe = proj(Math.min(e, G.lead)), x = (n.lane - (R.lanes - 1) / 2) * V.laneW, w = V.laneW * .22;
      g.beginPath();
      g.moveTo(V.cx + (x - w) * pa.s, pa.y); g.lineTo(V.cx + (x + w) * pa.s, pa.y);
      g.lineTo(V.cx + (x + w) * pe.s, pe.y); g.lineTo(V.cx + (x - w) * pe.s, pe.y); g.closePath();
      const col = n.res === 'miss' ? tok('text-dim') : tok('mh-' + (n.color || 'c'));
      g.fillStyle = col; g.globalAlpha = n.res === 'miss' ? .25 : .55;
      if (!reduced()) { g.shadowColor = col; g.shadowBlur = 12; }
      g.fill(); g.shadowBlur = 0; g.globalAlpha = 1;
      if (n.res && n.res !== 'miss' && n.held > 0) {                // the tail meter: how much has been held
        const ph = proj(Math.max(-.35, a + n.held));
        g.fillStyle = tok('yellow-hi'); g.globalAlpha = .85;
        g.beginPath(); g.moveTo(V.cx + (x - w * .5) * pa.s, pa.y); g.lineTo(V.cx + (x + w * .5) * pa.s, pa.y);
        g.lineTo(V.cx + (x + w * .5) * ph.s, ph.y); g.lineTo(V.cx + (x - w * .5) * ph.s, ph.y); g.closePath(); g.fill(); g.globalAlpha = 1;
      }
    }
    // the cards: only the ones on the road (from G.ci while they are within the lead time)
    while (G.ci < T.notes.length && T.notes[G.ci].end - t < -.8) { const n = T.notes[G.ci++]; if (n.el) { n.el.remove(); n.el = null; } }
    for (let k = G.ci; k < T.notes.length; k++) {
      const n = T.notes[k], dt = n.t - t;
      if (dt > G.lead) break;
      if (dt < -.6 || (n.res && n.res !== 'miss' && dt < -.12)) { if (n.el) { n.el.remove(); n.el = null; } continue; }
      if (!n.el) makeCard(n);
      const el = n.el, p = proj(dt), x = V.cx + (n.lane - (R.lanes - 1) / 2) * V.laneW * p.s;
      el.style.transform = `translate(${(x - V.cardW / 2).toFixed(1)}px,${(p.y - V.cardH).toFixed(1)}px) scale(${p.s.toFixed(3)})`;
      el.style.opacity = String(Math.min(1, (G.lead - dt) / (G.lead * .18)) * (dt < 0 ? Math.max(0, 1 + dt / .6) : 1));
      el.style.zIndex = String(1000 - Math.round(dt * 100));
    }
  }

  /* ---------- the cards ---------- */
  const cardCache = {};
  function cardInner(n) {
    if (unpitched) return `<b class="mh-stick">${n.n.stick}</b><svg class="mh-drum" viewBox="0 0 60 40" aria-hidden="true"><ellipse cx="30" cy="12" rx="24" ry="8"/><path d="M6 12v16c0 4.4 10.7 8 24 8s24-3.6 24-8V12"/><path d="M12 26l6-10M48 26l-6-10"/></svg>`;
    const key = n.n.midi + '|' + hornSide;
    if (cardCache[key]) return cardCache[key];
    let pic = '';
    if (member.id === 'bells') pic = bellsSVG(n.n.midi);
    else if (n.n.fing && A.Masher && A.Masher.DIAGRAMS[G.map.diagram]) {
      const tmp = document.createElement('div');
      tmp.innerHTML = A.Masher.diagramSVG(G.map.diagram, {label: 'Fingering: ' + n.n.fing.text});
      const svg = tmp.firstChild, D = A.Masher.DIAGRAMS[G.map.diagram];
      A.Masher.setState(svg, A.Masher.pressedOf(n.n.fing.keys));
      if (D.brass) {                                               // valves: just the valves (and the horn's trigger), big
        const ks = D.keys, ext = k => k.r || Math.max(k.w, k.h) / 2;
        const x0 = Math.min(...ks.map(k => k.x - ext(k))) - 10, x1 = Math.max(...ks.map(k => k.x + ext(k))) + 10;
        const y0 = Math.min(...ks.map(k => k.y - ext(k))) - 8, y1 = Math.max(...ks.map(k => k.y + ext(k))) + 8;
        svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
        svg.querySelector('.dg-draw').setAttribute('opacity', '.35');
      }
      const txt = n.n.fing.text;                                   // a long woodwind description: the diagram says it
      pic = `<div class="mh-dg">${tmp.innerHTML}</div>` + (txt.length <= 22 ? `<span class="mh-ft">${esc(txt)}</span>` : '');
    } else pic = `<span class="mh-ft mh-nochart">Check your fingering chart</span>`;
    return (cardCache[key] = `<b class="mh-note">${n.n.label}</b>${pic}`);
  }
  /* bells: a strip of the bell kit around the note, the bar to strike lit (naturals below, sharps/flats raised) */
  function bellsSVG(w) {
    const nat = [0, 2, 4, 5, 7, 9, 11];
    const isNat = m => nat.includes(((m % 12) + 12) % 12);
    let lo = w - 5; while (!isNat(lo)) lo--;
    const bars = []; let x = 0;
    for (let m = lo; bars.filter(b => b.nat).length < 7; m++) {
      if (isNat(m)) { bars.push({m, nat: true, x}); x += 14; }
      else bars.push({m, nat: false, x: x - 7});
    }
    return `<svg class="mh-bells" viewBox="-2 0 ${x + 2} 46" aria-hidden="true">` +
      bars.filter(b => b.nat).map(b => `<rect x="${b.x}" y="18" width="12" height="${26 - (b.m - lo) * .5}" rx="2" class="${b.m === w ? 'on' : ''}"/>`).join('') +
      bars.filter(b => !b.nat).map(b => `<rect x="${b.x + 1}" y="2" width="10" height="${16 - (b.m - lo) * .3}" rx="2" class="acc ${b.m === w ? 'on' : ''}"/>`).join('') + `</svg>`;
  }
  function buildCards() {
    // how long a card is on the road: leadBeats, never under leadMinS, and longer for quick notes so their cards don't pile up
    const minDur = Math.min(...G.T.notes.map(n => n.dur));
    G.lead = Math.min(R.leadMaxS, Math.max(R.leadMinS, R.leadBeats * G.T.spb, R.leadPerShortest * minDur));
    $('cards').innerHTML = '';
    G.ci = 0;                                                      // the first card that hasn't left the road yet
    G.T.notes.forEach(n => { n.color = unpitched ? (n.n.stick === 'L' ? 'g' : 'e') : COLORS[((n.n.midi % 12) + 12) % 12]; n.el = null; });
  }
  /* a card is made as it comes over the horizon and removed once it has passed (a long song or a practice loop never
     keeps hundreds of cards in the page) */
  function makeCard(n) {
    const el = document.createElement('div');
    el.className = `mh-card mc-${n.color}${n.n.n && n.n.n.acc ? ' acc' : ''}${n.long ? ' long' : ''}${unpitched ? ' snare' : ''}${n.res ? (n.res === 'miss' ? ' missed' : ' hit') : ''}`;
    el.innerHTML = cardInner(n);
    $('cards').appendChild(el); n.el = el;
  }
  function cardDone(n, res) {
    if (!n.el) return;
    n.el.classList.add(res === 'miss' ? 'missed' : 'hit');
    const g = document.getElementById('mhn' + (G.practice ? n.k % G.T.perLoop : n.k));
    if (g) g.classList.add(res === 'miss' ? 'miss' : 'hit');
    if (res !== 'miss') burst(n, res);
  }
  function burst(n, res) {
    const pad = $('pads').children[n.lane];
    if (!pad) return;
    pad.classList.remove('lit', 'perfect'); void pad.offsetWidth;
    pad.classList.add('lit'); if (res === 'perfect') pad.classList.add('perfect');
  }
  let judgeT = 0;
  const WORD = {perfect: 'PERFECT', good: 'GOOD', ok: 'OK', early: 'EARLY', late: 'LATE', miss: 'MISS'};
  function showJudge(res, d) {
    const j = $('judge');
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

  /* ---------- the scrolling staff (written pitch, the student's clef, letter names, a playhead) ---------- */
  let PPB = 58;                                                    // staff units per beat (wider for songs with short notes)
  function buildStaff() {
    const T0 = G.T, T = G.practice ? {per: T0.per, spb: T0.spb, measures: G.practice.to - G.practice.from + 1, notes: T0.notes.slice(0, T0.perLoop)} : T0;
    const m = G.map, startX = 40, notesX = n => startX + n.t / T.spb * PPB;
    PPB = Math.max(58, Math.min(130, 32 / Math.min(...m.notes.map(n => n.beats))));
    const width = startX + T.measures * T.per * PPB + 60;
    let svg;
    if (unpitched) {
      svg = `<svg class="staff mh-perc" viewBox="0 40 ${width} 110">` + `<line x1="0" y1="88" x2="${width}" y2="88" stroke="#18203a" stroke-width="1.6"/>` +
        T.notes.map(n => `<g id="mhn${n.k}"><ellipse class="head" cx="${notesX(n)}" cy="88" rx="9" ry="6.6" transform="rotate(-20 ${notesX(n)} 88)" fill="#18203a"/><line class="stem" x1="${notesX(n) + 8.3}" y1="86" x2="${notesX(n) + 8.3}" y2="46" stroke="#18203a" stroke-width="2"/><text class="ncap" x="${notesX(n)}" y="132" text-anchor="middle" font-weight="700" font-size="16" fill="#4b5570">${n.n.stick}</text></g>`).join('');
    } else {
      const items = T.notes.map(n => ({n: n.n.show, x: notesX(n), id: 'mhn' + n.k, caption: n.n.label}));
      svg = A.staffSVG(m.clef, items, {width, keySig: m.sig, fit: m.notes.map(n => n.show), label: 'The song on the staff'});
      // the song's own clef slides away under the fixed one; notes start after it
    }
    const vb = /viewBox="([\d.\s-]+)"/.exec(svg)[1].split(/\s+/).map(Number);
    let bars = '';
    for (let k = 0; k <= T.measures; k++) { const x = startX - PPB * .3 + k * T.per * PPB; bars += `<line class="mh-bar" x1="${x}" y1="${unpitched ? 72 : 56}" x2="${x}" y2="${unpitched ? 104 : 120}" stroke="#18203a" stroke-width="1.4"/>`; }
    svg = svg.replace('</svg>', bars + '</svg>');
    const box = $('staffBox'), h = V.staffH - 10, scale = h / vb[3];
    const strip = $('staffStrip');
    strip.innerHTML = svg;
    const s = strip.firstChild; s.style.width = vb[2] * scale + 'px'; s.style.height = h + 'px'; s.removeAttribute('width');
    // the fixed clef + key signature on the left
    const pinW = unpitched ? 40 : 60 + A.keySigWidth(m.sig);
    const pin = unpitched ? `<svg viewBox="0 40 ${pinW} 110"><line x1="0" y1="88" x2="${pinW}" y2="88" stroke="#18203a" stroke-width="1.6"/><rect x="12" y="74" width="5" height="28" fill="#18203a"/><rect x="21" y="74" width="5" height="28" fill="#18203a"/></svg>`
      : A.staffSVG(m.clef, [], {width: pinW + 16, keySig: m.sig, fit: m.notes.map(n => n.show)});
    $('staffPin').innerHTML = pin;
    const ps = $('staffPin').firstChild; ps.style.height = h + 'px'; ps.style.width = (unpitched ? pinW : pinW + 16) * scale + 'px';
    V.st = {scale, startX, pinPx: (unpitched ? pinW : pinW + 16) * scale};
    V.st.play = V.st.pinPx + Math.min(120, box.clientWidth * .12);
    $('playhead').style.left = V.st.play + 'px';
    moveStaff(-10);
  }
  function moveStaff(t) {
    if (!V.st) return;
    if (G.practice && t >= 0) {                                    // practice: one loop's staff, the playhead wraps around
      const L = Math.floor(t / G.T.loopLen);
      if (L !== V.st.loop) { V.st.loop = L; $('staffStrip').querySelectorAll('g.hit,g.miss').forEach(g => g.classList.remove('hit', 'miss')); }
      t -= L * G.T.loopLen;
    }
    const x = (V.st.startX + Math.max(-G.T.per, t / G.T.spb) * PPB) * V.st.scale;
    $('staffStrip').style.transform = `translateX(${(V.st.play - x).toFixed(1)}px)`;
  }

  /* ================= THE END: results ================= */
  function finish() {
    const g = G; g.phase = 'done';
    clearInterval(sched); sched = 0; cancelAnimationFrame(raf); raf = 0;
    if (kit) { const k = kit; kit = null; k.fade(.4); setTimeout(() => k.stopAll(), 600); }
    A.Pitch.demoAttacks = false;
    const total = g.T.notes.length, acc = total ? g.value / total * 100 : 0;
    const stars = g.practice || g.slow ? 0 : R.stars.filter(s => acc >= s - 1e-9).length;
    const lvKey = g.i + 1, prev = A.store.level(GAME_ID, member.id, lvKey);
    let newBest = false;
    if (!g.practice && !g.slow) {
      newBest = g.score > (prev.best || 0);
      A.store.setLevel(GAME_ID, member.id, lvKey, {stars, best: g.score});
    }
    $('play').hidden = true; document.documentElement.classList.remove('mh-playing');
    const shownStars = g.practice || g.slow ? null : stars;
    $('resStars').innerHTML = shownStars == null ? '' : A.starStr(shownStars);
    $('resTitle').textContent = g.practice ? 'Practice done' : g.slow ? 'Slow practice done' : stars ? (stars === 3 ? 'Superstar!' : 'Song complete!') : 'Keep practicing!';
    $('resMsg').textContent = g.practice ? `You looped measures ${g.practice.from}–${g.practice.to}. Try the whole song again!` :
      g.slow ? 'Slow mode is for practice (no stars). Ready for full speed?' :
      stars === 3 ? 'Right on the beat. The band loves you!' : stars ? `${Math.round(R.stars[stars] || 100)}% accuracy gets the next star.` : `Reach ${R.stars[0]}% accuracy for a star. Practice the trouble spot below, then try again!`;
    $('resScore').textContent = g.score; $('resAcc').textContent = Math.round(acc) + '%'; $('resCombo').textContent = g.maxCombo;
    const c = g.counts;
    $('resCounts').innerHTML = [['perfect', 'Perfect'], ['good', 'Good'], ['ok', 'OK'], ['early', 'Early'], ['late', 'Late'], ['miss', 'Miss']]
      .map(([k, l]) => `<span class="mc-${k}"><b>${c[k]}</b>${l}</span>`).join('') + (g.bonus ? `<span class="mc-bonus"><b>+${g.bonus}</b>Hold bonus</span>` : '');
    $('resBest').textContent = g.practice || g.slow ? '' : newBest && prev.best ? `New best score! (was ${prev.best})` : prev.best ? `Best: ${Math.max(prev.best, g.score)}` : '';
    trouble(g);
    const next = g.i + 1 < SONGS.length && unlocked(g.i + 1);
    $('resNext').hidden = !next || !!g.practice;
    $('results').hidden = false;
    $('results').dataset.song = g.i;
    lastG = g; G = null;
    const snd = [!g.practice && !g.slow ? (stars ? 'level-complete' : 'level-failed') : 'level-complete'];
    if (stars > (prev.stars || 0)) snd.push('star-earned');
    if (newBest && prev.best) snd.push('new-high-score');
    A.Sfx.sequence(snd, 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Skins.announce($('results').querySelector('.panel'));
  }
  let lastG = null;
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
    if (unpitched) $('troubleStaff').innerHTML = `<p class="mh-sticks">${notes.map(n => `<span class="${n.res === 'miss' ? 'miss' : ''}">${n.n.stick}</span>`).join(' ')}</p>`;
    else {
      const x0 = 70 + A.keySigWidth(g.map.sig), gap = Math.max(34, Math.min(56, 560 / Math.max(1, notes.length)));
      $('troubleStaff').innerHTML = A.staffSVG(g.map.clef, notes.map((n, k) => ({n: n.n.show, x: x0 + 20 + k * gap, caption: n.n.label, id: 'mht' + k})),
        {width: x0 + 60 + notes.length * gap, keySig: g.map.sig, label: 'The trouble spot'});
      notes.forEach((n, k) => { const el = document.getElementById('mht' + k); if (el && n.res === 'miss') el.classList.add('miss'); });
    }
    $('practiceBtn').onclick = () => begin(g.i, {practice: {from, to}});
    box.hidden = false;
  }
  $('resRetry').onclick = () => begin(+$('results').dataset.song);
  $('resNext').onclick = () => { const i = +$('results').dataset.song + 1; $('results').hidden = true; begin(i); };
  $('resSongs').onclick = () => showHub();

  /* ================= PAUSE ================= */
  function pause() {
    if (!G || G.paused || G.phase === 'done') return;
    G.paused = true; G.pausedAt = Math.max(0, songNow());
    clearInterval(sched); sched = 0;
    if (kit) { kit.stopAll(); kit = A.MHBacking.create(CLK.ctx, CLK.out); }
    $('pausePanel').hidden = false;
    A.Pitch.demoAttacks = false;
    if (A.Bg) A.Bg.menu(true);
  }
  function resume() {
    if (!G || !G.paused) return;
    $('pausePanel').hidden = true;
    if (A.Bg) A.Bg.menu(false);
    const T = G.T, m = Math.floor(G.pausedAt / (T.per * T.spb));
    const from = Math.max(0, m * T.per * T.spb);
    G.fileStarted = false;
    A.Pitch.demoAttacks = true; A.Pitch.ignoreCurrent();
    play(from);
  }
  $('pauseBtn').onclick = () => G && G.practice ? finish() : pause();
  $('resumeBtn').onclick = resume;
  $('restartBtn').onclick = () => { const i = G ? G.i : 0, pr = G && G.practice; $('pausePanel').hidden = true; startSong(i, {practice: pr}); };
  $('quitBtn').onclick = () => { $('pausePanel').hidden = true; showHub(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && G && !G.paused) { e.preventDefault(); G.practice ? finish() : pause(); } });
  addEventListener('resize', () => { if (G && !$('play').hidden) { layout(); buildStaff(); G.T.notes.forEach(n => { if (n.el) { n.el.remove(); n.el = null; } }); } });

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
            if (hold && n.long && !wrong) { n.holding = true; n.lastHeard = performance.now(); const iv = setInterval(() => { if (!G || songNow() > n.end) return clearInterval(iv); n.lastHeard = performance.now(); n.held = Math.max(n.held, Math.min(n.dur, songNow() - n.t)); }, 40); }
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
  };

  showHub();
})(window.Arcade);
