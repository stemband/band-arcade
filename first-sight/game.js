/* FIRST SIGHT: sight-reading practice for District Honor Band. A PRACTICE TOOL: no stars, no microphone, no judging.
   Full doc: docs/games/first-sight.md.
     THE LEVEL SELECT (#hub, shared/level-select.js with the heading "Select your key"): KEY (Concert F, B♭, E♭, A♭ or MIX
       = a different key each etude; the snare has no key row), LENGTH (8 bars, or 6 = the audition's length), the six
       levels (etudes.js LEVELS), and "Have an etude code?" (opens that exact etude). ?code=5E8-K7QX opens one directly.
     ONE ETUDE (#play): the music (shared/notation.js: the student's clef and written key; 4 bars a row, 2 on a narrow
       screen; 6 bars: 3 a row), the tempo marking, the code (tap = copy).
       STUDY: a countdown (Study time 30 s by default; Off / 30 / 60) with "I'm ready". Then:
       ▶ PLAY IT: a count-in (1 bar; 2 bars of 2/4 and 6/8), then the click (Click on/off) and a marker moving
         through the music while the student plays on their own instrument. Nothing listens.
       ▶ HEAR IT: unlocked after the first PLAY IT of an etude (read it first, then check yourself): the etude in the
         student's own instrument voice (shared/winds.js; the snare on the drum kit), the notes lighting as they sound.
       NEW ETUDE: a new code at the same level, key setting and length. TEMPO −/+ (remembered per level), COUNTING
       (the shared counting's syllables under the notes), PRINT IT, COPY A LINK.
     SAVED (gameData('first-sight')): key, bars, click, counting, studyS, tempo {level: bpm}, read (etudes played
       through), byLevel {level: count}, playS {day: seconds}; store.noteFinished once a play-through ends.
   Arcade.FirstSight.state() / open(code) / play() / hear() / stop() / ready() for tests. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const GAME_ID = 'first-sight';
  const $ = id => document.getElementById(id), E = A.FSEtudes;
  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.mountTopbar(inst, '', GAME_ID);

  /* ===== THE RULES (Mr. Graham edits these) ===== */
  const RULES = {
    tempoStep: 4,            // TEMPO − / + (beats per minute)
    tempoMin: 40,            // the slowest it goes
    tempoOver: 16,           // the fastest = the marking + this
    leadS: 0.25,             // the first count-in click comes this long after the tap
    gain: {p: .42, mp: .58, mf: .75, f: 1},   // ▶ HEAR IT's dynamics (1 = the voice's normal level)
    accent: 1.3,             // an accent's extra loudness
    length: {normal: .9, stac: .45, ten: 1, slur: 1},   // how much of its written length a note sounds
    clickGain: .5, clickDown: .8,   // the click's loudness (the first beat of each bar louder)
    minScale: .8,            // 4 bars a row (6 bars: 3) only while the music keeps at least this share of its natural size, else 2
  };
  /* ============================================== */

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const member = A.currentMember() || inst.members[0];
  const pitched = member.pitched !== false;
  const KEY_CHOICES = E.KEYS.concat(['mix']);
  const S = {
    key: KEY_CHOICES.includes(gd().key) ? gd().key : 'Bb', bars: gd().bars === 6 ? 6 : 8,
    click: gd().click !== false, counting: !!gd().counting, studyS: [0, 30, 60].includes(gd().studyS) ? gd().studyS : 30,
    et: null, real: null, rows: [], heard: false, played: false, run: null, studyT: 0, studyLeft: 0, studyOn: false, paused: false,
  };
  if (!pitched) S.key = 'Bb';                                       // the snare reads rhythms: no key to choose

  /* ================= THE LEVEL SELECT ================= */
  const keyName = k => k === 'mix' ? 'Mix' : E.KEY_NAME[k];
  const yourKey = k => {
    if (k === 'mix') return 'a new key each time';
    try { const sc = A.Scales.build(member, k); return sc.key ? `your ${sc.key.replace(' Major', '')}` : ''; } catch (e) { return ''; }
  };
  function drawPicker() {
    $('keyRow').hidden = !pitched;
    $('keySeg').innerHTML = KEY_CHOICES.map(k => `<button type="button" class="mp-note" data-key="${k}" aria-pressed="${S.key === k}"><b>${keyName(k)}</b><small>${esc(yourKey(k))}</small></button>`).join('');
    $('barsSeg').querySelectorAll('[data-bars]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.bars === S.bars)));
  }
  $('keySeg').addEventListener('click', e => {
    const b = e.target.closest('[data-key]'); if (!b) return;
    S.key = b.dataset.key; gd().key = S.key; save(); A.Sfx.event('ui-toggle'); drawPicker();
  });
  $('barsSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-bars]'); if (!b) return;
    S.bars = +b.dataset.bars; gd().bars = S.bars; save(); A.Sfx.event('ui-toggle'); drawPicker();
  });
  const setLabel = () => (pitched ? (S.key === 'mix' ? 'Mixed keys' : 'Concert ' + E.KEY_NAME[S.key]) + ' · ' : '') + S.bars + ' bars';
  const readAt = lv => ((gd().byLevel || {})[lv]) || 0;
  function drawLevels() {
    $('levelGrid').innerHTML = E.LEVELS.map(L => {
      const meters = Object.keys(L.meters).join(' · '), n = readAt(L.n);
      return `<button type="button" class="fs-card" data-l="${L.n}">
        <span class="n">Level ${L.n}</span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${esc(L.blurb)}</span>
        <span class="foot"><span class="fs-meters">${meters}</span><span>${n ? `${n} read` : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.fs-card').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
  }
  function showHub() {
    stopRun(); stopStudy();
    pause.setActive(false);
    $('play').hidden = true; $('hub').hidden = false;
    drawPicker(); drawLevels();
    // no stars: the lobby's practice card must not pre-select a level by its stars (level-select.js reads this flag)
    try { sessionStorage.removeItem('bandarcade.practice-pick'); } catch (e) { /* private mode */ }
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.fs-card'), gameId: GAME_ID,
      picker: $('keyPick'), pickHead: pitched ? 'Select your key' : 'Select your length', setLabel,
      need: pitched ? 'Select your key and level' : 'Select your length and level',
      label: i => `Level ${i + 1} · ${E.LEVELS[i].name}`});
    A.Sfx.gameMenuMusic(GAME_ID);
    $('demoHelp').hidden = !A.DEMO;
  }
  $('codeForm').addEventListener('submit', e => {
    e.preventDefault();
    const c = E.parseCode($('codeIn').value);
    if (!c) { $('codeMsg').textContent = 'That code doesn’t look right. A code looks like 5E8-K7QX.'; return; }
    $('codeMsg').textContent = '';
    open(c);
  });

  /* ================= ONE ETUDE ================= */
  function begin(lv) {
    const key = S.key === 'mix' || !pitched ? (pitched ? E.KEYS[Math.floor(Math.random() * 4)] : 'Bb') : S.key;
    open({level: lv, key, bars: S.bars, seed: E.newSeed()});
  }
  function open(c) {
    if (typeof c === 'string') c = E.parseCode(c);
    if (!c) return false;
    stopRun(); stopStudy();
    A.LevelSelect.played(c.level - 1);
    S.et = E.make(c);
    S.real = E.realize(S.et, member);
    S.heard = false; S.played = false;
    $('hub').hidden = true; $('play').hidden = false;
    pause.setActive(true);
    A.Sfx.gameMenuMusic(GAME_ID, false);                            // quiet: reading needs it
    const L = E.LEVELS[S.et.level - 1];
    $('kick').textContent = `Level ${L.n} · ${L.name} · ${S.et.bars} bars`;
    $('keyLine').textContent = pitched ? `Concert ${S.et.keyName}` + (S.real.scale && S.real.scale.key ? ` · your ${S.real.scale.key}` : '') : `Snare drum · ${S.et.meter}`;
    $('codeTxt').textContent = S.et.code;
    $('printHead').textContent = `First Sight · ${member.name} · Level ${L.n} · Code ${S.et.code}`;
    drawTempo(); segs(); drawSheet(); drawButtons();
    scrollTo(0, 0);
    startStudy();
    return true;
  }
  /** a quarter (or dotted quarter) note for the tempo marking, drawn (fonts draw ♩ too small or apart from its dot) */
  const noteIcon = dotted => `<svg class="fs-q" viewBox="0 0 ${dotted ? 20 : 14} 30" aria-hidden="true"><ellipse cx="6" cy="24" rx="5.6" ry="4.2" transform="rotate(-20 6 24)" fill="currentColor"/>` +
    `<path d="M10.6 23V2" stroke="currentColor" stroke-width="1.8"/>${dotted ? '<circle cx="16" cy="24" r="1.9" fill="currentColor"/>' : ''}</svg>`;
  const bpmOf = () => { const t = (gd().tempo || {})[S.et.level]; return t || S.et.tempo; };
  function drawTempo() {
    const et = S.et, b = bpmOf(), note = noteIcon(et.compound);
    $('tempoMark').innerHTML = `<b>${esc(et.tempoWord)}</b> ${note} = ${et.tempo}`;
    $('bpm').innerHTML = `${note} = ${b}`;
    $('bpm').setAttribute('aria-label', `${et.compound ? 'Dotted quarter' : 'Quarter'} note = ${b} beats a minute`);
    $('slowerBtn').disabled = b - RULES.tempoStep < RULES.tempoMin;
    $('fasterBtn').disabled = b + RULES.tempoStep > et.tempo + RULES.tempoOver;
  }
  function setTempo(d) {
    if (S.run) return;
    const g = gd(), t = g.tempo || (g.tempo = {});
    t[S.et.level] = Math.max(RULES.tempoMin, Math.min(S.et.tempo + RULES.tempoOver, bpmOf() + d));
    if (t[S.et.level] === S.et.tempo) delete t[S.et.level];
    save(); A.Sfx.event('ui-toggle'); drawTempo();
  }
  $('slowerBtn').addEventListener('click', () => setTempo(-RULES.tempoStep));
  $('fasterBtn').addEventListener('click', () => setTempo(RULES.tempoStep));
  function segs() {
    const set = (id, attr, val) => $(id).querySelectorAll(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))));
    set('clickSeg', 'click', S.click ? 'on' : 'off'); set('countSeg', 'count', S.counting ? 'on' : 'off'); set('studySeg', 'study', S.studyS);
  }
  $('clickSeg').addEventListener('click', e => { const b = e.target.closest('[data-click]'); if (!b) return; S.click = b.dataset.click === 'on'; gd().click = S.click; save(); segs(); });
  $('countSeg').addEventListener('click', e => { const b = e.target.closest('[data-count]'); if (!b) return; S.counting = b.dataset.count === 'on'; gd().counting = S.counting; save(); segs(); drawSheet(); });
  $('studySeg').addEventListener('click', e => {
    const b = e.target.closest('[data-study]'); if (!b) return;
    S.studyS = +b.dataset.study; gd().studyS = S.studyS; save(); segs();
    if (S.studyOn && !S.studyS) endStudy(true);
  });

  /* ---------- THE MUSIC: rows of bars, engraved by shared/notation.js ----------
     THE ROWS: as many bars a row as stay readable: 4 (6 bars: 3) when the row drawn at the staff area's width keeps at
     least RULES.minScale of its natural size, else 2. Every row has the same width: the widest row's, or the staff
     area's when that is wider (the spacing stretches, the notes never grow past their natural size). */
  const avail = () => Math.max(260, $('rows').clientWidth || $('sheet').clientWidth || 800);
  function rowsOf(nb) {
    const et = S.et, real = S.real, per12 = 12, rows = [];
    for (let from = 0; from < et.bars; from += nb) rows.push([from, Math.min(et.bars, from + nb)]);
    // each row's events in beats (quarters) from the row's first bar; a tie inside a row = one longer event; a tie
    // across a row break = tieOut / tieIn
    return rows.map(([from, to]) => {
      const t0 = from * et.barTicks, evs = [];
      et.events.filter(e => e.bar >= from && e.bar < to).forEach(e => {
        const prev = evs[evs.length - 1];
        if (e.tiedFrom && prev && prev.src.tieNext && et.events[e.i - 1].bar >= from) { prev.beats += e.d / per12; prev.tieOut = false; return; }
        const r = real.notes[e.i];
        const ev = {t: (e.t - t0) / per12, beats: e.d / per12, rest: e.rest, n: r ? r.n : null, id: e.rest ? undefined : `fs-e${e.i}`, src: e,
          trip: e.trip || undefined, art: e.art.length ? e.art.slice() : undefined, dyn: e.dyn, hair: e.hair, hairEnd: e.hairEnd,
          slur: e.slur, slurFirst: e.slurFirst, slurLast: e.slurLast, tieIn: !!e.tiedFrom, tieOut: !!e.tieNext,
          label: S.counting && et.labels ? et.labels[e.i] || '' : ''};
        if (real.unpitched) { ev.n = null; ev.slur = undefined; ev.art = ev.art && ev.art.filter(k => k === 'acc'); if (ev.art && !ev.art.length) ev.art = undefined; }
        evs.push(ev);
      });
      evs.forEach(ev => { if (ev.tieOut && evs.indexOf(ev) < evs.length - 1) ev.tieOut = false; });
      return {from, to, evs, t0};
    });
  }
  const engraveOpts = (r, k, width) => ({clef: S.real.clef, sig: S.real.sig, per: S.et.per, timeSig: S.et.ts, measures: r.to - r.from, events: r.evs,
    header: 'full', showTime: k === 0, captions: S.counting, final: r.to === S.et.bars, groupBeats: 1, width,
    label: k === 0 ? `The etude, bars ${r.from + 1} to ${r.to}` : `Bars ${r.from + 1} to ${r.to}`});
  function drawSheet() {
    const w = avail(), wide = S.et.bars === 6 ? 3 : 4;
    let built = null, W = 0;
    for (const nb of [wide, 2]) {
      built = rowsOf(nb);
      W = Math.max(...built.map((r, k) => A.Notation.engrave(engraveOpts(r, k)).vb.w));
      if (nb === 2 || w / W >= RULES.minScale) break;
    }
    const width = Math.max(W, w);
    S.rows = built.map((r, k) => Object.assign(r, {E: A.Notation.engrave(engraveOpts(r, k, width))}));
    $('rows').innerHTML = S.rows.map((r, k) => `<div class="fs-row" data-row="${k}">${r.E.svg}<i class="fs-marker" hidden></i></div>`).join('');
    $('rows').classList.toggle('fs-counting', S.counting);
    lastW = w;
  }
  let lastW = 0;
  addEventListener('resize', () => {
    if (!S.et || $('play').hidden || S.run) return;
    if (Math.abs(avail() - lastW) >= 20) drawSheet();
  });

  /* ---------- STUDY ---------- */
  function startStudy() {
    stopStudy();
    if (!S.studyS) { endStudy(false); return; }
    S.studyOn = true; S.studyLeft = S.studyS;
    $('study').hidden = false;
    say('');
    drawStudy();
    let last = performance.now();
    S.studyT = setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (S.paused || document.hidden) return;
      S.studyLeft = Math.max(0, S.studyLeft - dt);
      drawStudy();
      if (S.studyLeft <= 0) endStudy(true);
    }, 200);
  }
  function drawStudy() {
    const s = Math.ceil(S.studyLeft);
    $('studyLeft').textContent = s;
    $('studyWord').textContent = s === 1 ? 'second to study it.' : 'seconds to study it.';
    $('studyFill').style.transform = `scaleX(${S.studyS ? S.studyLeft / S.studyS : 0})`;
  }
  function stopStudy() { clearInterval(S.studyT); S.studyT = 0; S.studyOn = false; $('study').hidden = true; }
  function endStudy(sound) {
    stopStudy();
    if (sound) A.Sfx.event('ui-toggle');
    say(pitched ? 'Your turn! Tap ▶ Play it, then play along with the click. Keep going, even after a mistake.'
      : 'Your turn! Tap ▶ Play it, then play along on your drum or pad. Keep going, even after a mistake.');
    drawButtons();
    $('playBtn').focus({preventScroll: true});
  }
  $('readyBtn').addEventListener('click', () => endStudy(true));
  const say = t => { $('say').textContent = t; };

  /* ---------- PLAY IT / HEAR IT ---------- */
  function drawButtons() {
    const run = S.run;
    $('playBtn').textContent = run && run.kind === 'play' ? '■ Stop' : '▶ Play it';
    $('hearBtn').textContent = run && run.kind === 'hear' ? '■ Stop' : '▶ Hear it';
    $('playBtn').setAttribute('aria-pressed', String(!!run && run.kind === 'play'));
    $('hearBtn').setAttribute('aria-pressed', String(!!run && run.kind === 'hear'));
    $('hearBtn').classList.toggle('fs-locked', !S.played);
    $('hearBtn').title = S.played ? '' : 'Play it yourself first, then hear it to check.';
    $('newBtn').disabled = !!run;
    $('play').classList.toggle('fs-running', !!run);
  }
  $('playBtn').addEventListener('click', () => (S.run && S.run.kind === 'play' ? stopRun(true) : start('play')));
  $('hearBtn').addEventListener('click', () => {
    if (S.run && S.run.kind === 'hear') return stopRun(true);
    if (!S.played) { A.UI.toast('Play it yourself first, then hear it to check.', {near: $('hearBtn').parentNode}); return; }
    start('hear');
  });
  $('newBtn').addEventListener('click', () => { if (S.run) return; A.Sfx.event('ui-toggle'); begin(S.et.level); });

  /** the run's timeline: the count-in, then every bar; seconds from the first count-in click */
  function timeline(kind) {
    const et = S.et, bpm = bpmOf(), beatS = 60 / bpm, beatT = et.beatTicks, tickS = beatS / beatT;
    const beatsPerBar = et.barTicks / beatT, countBars = beatsPerBar < 3 ? 2 : 1, countS = countBars * beatsPerBar * beatS;
    const clicks = [];
    for (let b = 0; b < countBars * beatsPerBar; b++) clicks.push({at: b * beatS, down: b % beatsPerBar === 0, count: true});
    if (kind === 'hear' || S.click) for (let b = 0; b < et.bars * beatsPerBar; b++) clicks.push({at: countS + b * beatS, down: b % beatsPerBar === 0, count: false});
    if (kind === 'hear' && !S.click) clicks.splice(countBars * beatsPerBar);                     // HEAR IT: only the count-in without the click
    const notes = [];
    if (kind === 'hear') {
      // the dynamic in force at each note (hairpins glide between their two dynamics)
      const G = RULES.gain, evs = et.events;
      let cur = 'mf';
      const base = evs.map(e => { if (e.dyn) cur = e.dyn; return G[cur] || G.mf; });
      evs.forEach((e, i) => {
        if (!e.hair) return;
        const j = evs.findIndex((x, k) => k > i && x.hairEnd);
        if (j < 0) return;
        const a = base[i], z = G[evs[j].dyn] || base[j];
        for (let k = i; k < j; k++) base[k] = a + (z - a) * (evs[k].t - evs[i].t) / Math.max(1, evs[j].t - evs[i].t);
      });
      evs.forEach((e, i) => {
        if (e.rest || e.tiedFrom) return;
        let d = e.d, k = i;
        while (evs[k].tieNext && evs[k + 1]) { k++; d += evs[k].d; }
        const art = e.art || [], L = RULES.length;
        const frac = art.includes('stac') ? L.stac : art.includes('ten') ? L.ten : e.slur != null && !e.slurLast ? L.slur : L.normal;
        const r = S.real.notes[i];
        notes.push({i, at: countS + e.t * tickS, sec: Math.max(.06, d * tickS * frac), dur: d * tickS,
          gain: Math.min(1.25, base[i] * (art.includes('acc') ? RULES.accent : 1)), f: r ? 440 * Math.pow(2, (r.sounding - 69) / 12) : 0, acc: art.includes('acc')});
      });
    }
    return {bpm, beatS, tickS, countS, endS: countS + et.totalTicks * tickS, clicks, notes, countBars, beatsPerBar};
  }
  function start(kind) {
    stopRun();
    if (S.studyOn) stopStudy();
    const T = timeline(kind);
    const o = A.Sfx.output && A.Sfx.output();
    const run = {kind, T, t0: 0, ctx: o ? o.ctx : null, kit: null, voice: null, clk: null, raf: 0, lit: -1, rowLit: -1, done: false, p0: performance.now()};
    if (run.ctx && run.ctx.state !== 'running') run.ctx.resume().catch(() => {});
    if (run.ctx) {
      run.clk = A.AudioClock ? A.AudioClock.create().start() : null;
      const bus = run.ctx.createGain(); bus.gain.value = 1; bus.connect(o.out); run.bus = bus;
      run.kit = A.MHBacking.create(run.ctx, bus);
      if (kind === 'hear' && pitched) {
        run.voice = A.Winds.phrase(A.Winds.voiceFor(member.id), T.notes.map(n => ({f: n.f, at: n.at, sec: member.id === 'bells' ? Math.max(n.sec, .6) : n.sec, gain: n.gain})), {lead: RULES.leadS});
        run.t0 = run.voice ? run.voice.t0 : run.ctx.currentTime + RULES.leadS;
      } else run.t0 = run.ctx.currentTime + RULES.leadS;
      T.clicks.forEach(c => run.kit.click(run.t0 + c.at, c.down ? RULES.clickDown : RULES.clickGain, c.down));
      if (kind === 'hear' && !pitched) T.notes.forEach(n => run.kit.snare(run.t0 + n.at, Math.min(1, (n.acc ? 1 : .62) * n.gain)));
    }
    S.run = run;
    drawButtons();
    say(kind === 'play' ? 'Count-in…' : 'Listen…');
    run.raf = requestAnimationFrame(() => frame(run));
  }
  /** seconds since the first count-in click, as HEARD (the audio clock), or on performance.now() with the sound off */
  function nowOf(run) {
    if (run.ctx && run.clk) {
      run.clk.sample();
      let a = run.clk.audAt(performance.now());
      if (Math.abs(a - run.ctx.currentTime) > 1) a = run.ctx.currentTime - (run.ctx.outputLatency || run.ctx.baseLatency || 0);
      return a - run.t0;
    }
    return (performance.now() - run.p0) / 1000 - RULES.leadS;
  }
  function frame(run) {
    if (S.run !== run) return;
    const T = run.T, now = nowOf(run);
    if (now < T.countS) {
      const beat = Math.floor(Math.max(0, now) / T.beatS);
      say(now < 0 ? 'Count-in…' : `Count-in: ${Array.from({length: Math.min(beat + 1, T.countBars * T.beatsPerBar)}, (x, k) => (k % T.beatsPerBar) + 1).join(' ')}`);
    } else {
      const tick = (now - T.countS) / T.tickS, bar = Math.min(S.et.bars, Math.floor(tick / S.et.barTicks) + 1);
      say(`${run.kind === 'play' ? 'Play!' : 'Listen.'} Bar ${bar} of ${S.et.bars}`);
      mark(run, tick);
      if (run.kind === 'hear') light(run, now);
    }
    if (now >= T.endS + .15) { finish(run, false); return; }
    run.raf = requestAnimationFrame(() => frame(run));
  }
  /** the marker: a soft bar at the music's current place (the row's time → x map) */
  function mark(run, tick) {
    const et = S.et, row = S.rows.findIndex(r => tick < r.to * et.barTicks) ;
    const k = row < 0 ? S.rows.length - 1 : row, r = S.rows[k];
    const el = $('rows').children[k];
    if (!el) return;
    if (run.rowLit !== k) {
      $('rows').querySelectorAll('.fs-marker').forEach(m => { m.hidden = true; });
      run.rowLit = k;
      const m = el.querySelector('.fs-marker'); m.hidden = false;
      if (!A.reducedMotion || !A.reducedMotion.matches) el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
    const beats = Math.max(0, (tick - r.t0)) / 12, x = r.E.xAt(beats);
    el.querySelector('.fs-marker').style.left = (100 * x / r.E.vb.w) + '%';
  }
  function light(run, now) {
    const notes = run.T.notes;
    let k = -1;
    for (let i = 0; i < notes.length && notes[i].at <= now; i++) k = i;
    if (k >= 0 && now >= notes[k].at + notes[k].dur) k = -1;          // a rest: nothing lit
    if (k === run.lit) return;
    $('rows').querySelectorAll('g.fs-on').forEach(g => g.classList.remove('fs-on'));
    run.lit = k;
    if (k >= 0) { const g = $('rows').querySelector(`#fs-e${notes[k].i}`); if (g) g.classList.add('fs-on'); }
  }
  function finish(run, stopped) {
    if (run.done) return;
    run.done = true;
    cancelAnimationFrame(run.raf);
    if (run.voice) run.voice.stop();
    if (run.kit) { const k = run.kit; if (stopped) { try { k.fade && k.fade(.02); } catch (e) {} setTimeout(() => k.stopAll(), 40); } else setTimeout(() => k.stopAll(), 400); }
    if (run.bus) setTimeout(() => { try { run.bus.disconnect(); } catch (e) {} }, 500);
    $('rows').querySelectorAll('.fs-marker').forEach(m => { m.hidden = true; });
    $('rows').querySelectorAll('g.fs-on').forEach(g => g.classList.remove('fs-on'));
    if (S.run === run) S.run = null;
    const secs = Math.max(0, (performance.now() - run.p0) / 1000);
    logTime(secs);
    if (run.kind === 'play') {
      if (!stopped) {
        const first = !S.played;
        S.played = true;
        if (first) countRead();
        say('Nice work! Now tap ▶ Hear it to check yourself, play it again, or try a new etude.');
        A.Sfx.event('star-earned');
      } else say('Stopped. Tap ▶ Play it to start again from the count-in.');
    } else if (!stopped) { S.heard = true; say('How did yours compare? Play it again, or try a new etude.'); }
    else say('');
    drawButtons();
  }
  function stopRun(byStudent) { if (S.run) finish(S.run, true); if (byStudent) A.Sfx.event('ui-back'); }
  function countRead() {
    const g = gd(), by = g.byLevel || (g.byLevel = {});
    g.read = (g.read || 0) + 1; by[S.et.level] = (by[S.et.level] || 0) + 1;
    const recent = g.recent || (g.recent = []);
    if (!recent.includes(S.et.code)) { recent.unshift(S.et.code); recent.splice(10); }
    save();
    A.store.noteFinished(GAME_ID);                                 // Today's Practice: an etude played through
  }
  function logTime(secs) {
    if (!(secs > 0) || secs > 600) return;
    const g = gd(), log = g.playS || (g.playS = {}), k = A.store.dayKey();
    log[k] = Math.round(((log[k] || 0) + secs) * 10) / 10;
    Object.keys(log).sort().slice(0, -30).forEach(x => delete log[x]);
    save();
  }

  /* ---------- the code, a link, print ---------- */
  function copy(text, what) {
    const ok = () => A.UI.toast(`${what} copied`, {near: $('codeBtn').parentNode});
    const fail = () => A.UI.toast(`${what}: ${text}`, {near: $('codeBtn').parentNode});
    try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
  }
  $('codeBtn').addEventListener('click', () => copy(S.et.code, 'Code'));
  $('linkBtn').addEventListener('click', () => {
    const u = new URL(location.href); u.search = '?code=' + S.et.code; u.hash = '';
    copy(u.href, 'Link');
  });
  $('printBtn').addEventListener('click', () => { stopRun(); window.print(); });

  /* ---------- keys (?demo, and handy for everyone): Space = play, H = hear, N = new, Enter = ready ---------- */
  addEventListener('keydown', e => {
    if ($('play').hidden || e.target.closest('input, textarea, [contenteditable]') || document.querySelector('.overlay:not([hidden]) .panel')) return;
    if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); $('playBtn').click(); }
    else if (e.key === 'h' || e.key === 'H') $('hearBtn').click();
    else if ((e.key === 'n' || e.key === 'N') && !S.run) $('newBtn').click();
    else if (e.key === 'Enter' && S.studyOn && !e.target.closest('button')) endStudy(true);
  });

  /* ---------- pause (the kit's) ---------- */
  const pause = A.UI.pause.mount({
    onPause: () => { S.paused = true; stopRun(); },
    onResume: () => { S.paused = false; },
    onLevels: () => showHub(),
    levelsLabel: 'Back to levels',
    confirmLeave: () => false,
    info: () => S.et ? [['Etude', S.et.code], ['Tempo', `${bpmOf()}`]] : [],
  });
  addEventListener('pagehide', () => stopRun());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopRun(); });

  /* ---------- start ---------- */
  const deep = E.parseCode(new URLSearchParams(location.search).get('code') || '');
  showHub();
  if (deep) open(deep);

  A.FirstSight = {RULES,
    state: () => ({screen: $('play').hidden ? 'hub' : 'play', key: S.key, bars: S.bars, code: S.et && S.et.code, level: S.et && S.et.level,
      meter: S.et && S.et.meter, studyOn: S.studyOn, studyLeft: S.studyLeft, played: S.played, heard: S.heard,
      run: S.run ? {kind: S.run.kind, now: nowOf(S.run), endS: S.run.T.endS, clicks: S.run.T.clicks.length, notes: S.run.T.notes.length, voice: !!S.run.voice} : null,
      rows: S.rows.map(r => [r.from, r.to]), counting: S.counting, click: S.click, bpm: S.et ? bpmOf() : null,
      read: gd().read || 0, byLevel: Object.assign({}, gd().byLevel || {})}),
    etude: () => S.et, real: () => S.real, timeline: kind => timeline(kind),
    open, play: () => start('play'), hear: () => start('hear'), stop: () => stopRun(), ready: () => endStudy(false), hub: showHub};
})(window.Arcade);
