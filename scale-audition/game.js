/* Scale Audition: the GMEA Middle School All-State (First Round) / District Honor Band scale audition. The same four
   scales and the same rules for both: Concert F, B♭, E♭ and A♭ (in that order), each up and down with its arpeggio,
   from memory, against the sheet's time limit, then the chromatic.
   THE GMEA SHEETS ARE THE SOURCE: every scale (the written starting note, 1 or 2 octaves, the time) is the AUDITION
   table in shared/scales.js; edit it there, never here. Spelling and key signatures come from scales.js, the
   chromatic from Arcade.chromaticScale (instruments.js), the staff from Arcade.staffSVG (ui.js).
   Modes: PRACTICE (one scale, no clock: LOOP, SLOW GUIDE, NOTE BY NOTE; no stars), AUDITION (the levels: all four,
   one try each, one clock), CHROMATIC (the member's GMEA chromatic range, a stopwatch).
   HEARING: the expected notes are followed IN ORDER from Pitch.onFrame readings (never onHeld: students play fast and
   may slur): a new note = the same pitch class read STABLE_FRAMES frames in a row AND a change from the last counted
   pitch, or a fresh attack (Pitch.onAttack), or a short silence first. Judged by pitch class (the scale's order
   catches octave mistakes). Nothing plays while a scale is heard; the clock pauses during Pitch suppression. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'scale-audition';

  /* ---------- TUNING: every number the game uses ---------- */
  const STABLE_FRAMES = 3;              // a new note: the same pitch class read this many frames in a row (~40 ms each = 120 ms)
  const GAP_FRAMES = 3;                 // …or after this many silent frames, the same pitch again is a new note (a soft re-tongue)
  const ATTACK_NEW_MS = 60;             // an attack at least this long after the last counted note = a fresh attack (a repeated note)
  const LEVELS = [                      // AUDITION: time = the sheet's time × mult; staff: false = from memory (the scale's name only)
    {name: 'Warm-Up Room',  mult: 2.0,  staff: true,  blurb: 'Double time, the music on the stand.'},
    {name: 'Practice Room', mult: 1.5,  staff: true,  blurb: 'More time than the real room, the music on the stand.'},
    {name: 'Hallway',       mult: 1.25, staff: false, blurb: 'From memory: only the scale\'s name.'},
    {name: 'Audition Room', mult: 1.0,  staff: false, blurb: 'The real thing: the GMEA sheet\'s time, from memory.'},
  ];
  const TWO_STARS_CLEAN = .9;           // 2 ★: at least this share of every note clean (and all four finished in time)
  const LOW_TIME_S = 15;                // the time bar turns amber in the last 15 s (no alarm, ever)
  const TIME_UP_IDLE_S = 12;            // after time: the scale being played may finish; nothing heard this long = it ends
  const THANKS_MS = 2400;               // the "Time. Thank you." / "Thank you." screen before the score sheet
  const CHROM_STARS = {two: {rate: 2.5, miss: 2}, three: {rate: 4, miss: 0}};   // clean notes a second, most misses
  const GUIDE_TEMPOS = [60, 80, 100];   // SLOW GUIDE: ♩ = … (silent: a click would mute the microphone)
  const MALLET_RANGE = [48, 108];       // sounding midi the detector searches for mallets (they audition on a bigger instrument than the bell kit)
  const READ_MS = 2200;                 // the adjudicator's line stays this long before the countdown (longer if the recorded voice is)
  const DEMO_STEP_MS = 230;             // ?demo: holding Space plays the next note this often

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember() || inst.members[0];
  const MALLET = member.family === 'percussion';
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;

  const S = A.Scales, ORDER = S.AUDITION_ORDER;
  const SCALES = ORDER.map(id => S.audition(member, id)).filter(Boolean);
  const CHROM = S.auditionChromatic(member);
  const SHEET_S = S.auditionTime(member);
  const clef = inst.clef;
  const gd = A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const nameOf = n => A.music.noteLabel(n) + n.oct;                          // "F♯3"
  const fmt = ms => { const s = Math.max(0, ms) / 1000, m = Math.floor(s / 60), r = s - m * 60; return `${m}:${String(Math.floor(r)).padStart(2, '0')}`; };
  const fmt1 = ms => { const s = Math.max(0, ms) / 1000, m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; };
  const opt = {mode: ['practice', 'audition', 'chrom'].includes(gd.mode) ? gd.mode : 'audition', loop: !!gd.loop, guide: GUIDE_TEMPOS.includes(gd.guide) ? gd.guide : 0, nbn: !!gd.nbn};
  const setOpt = patch => { Object.assign(opt, patch); Object.assign(gd, patch); save(); };

  /* ---------- the sheet: the scale on the staff like the GMEA sheet (4/4, the sheet's rhythm; only a picture) ---------- */
  const MID = 88;                                                             // ui.js: the middle line's y
  const STEP = {4: 74, 1: 46, .5: 36, .25: 31};                               // x room per note by length (beats)
  const MIN_SCALE = .72;                                                      // a row is never drawn smaller than this (notes stay readable)
  const noteW = n => (STEP[n.beats] || STEP[.5]) + (n.show.acc || n.show.natural ? 12 : 0);
  /** the sheet's rows: whole measures packed into rows as wide as the screen allows (chromatic: notes) */
  function rowsOf(sc, px) {
    const budget = Math.max(420, px / MIN_SCALE), head = first => 70 + A.keySigWidth(sc.sig) + (first ? 34 : 0) + 28;
    const units = sc.measures ? sc.measures.map(() => []) : [];
    if (sc.measures) sc.notes.forEach((n, i) => units[n.measure].push(i)); else sc.notes.forEach((n, i) => units.push([i]));
    const out = [];
    let cur = null;
    units.forEach((u, k) => {
      const w = u.reduce((a, i) => a + noteW(sc.notes[i]), 0) + (sc.measures ? 8 : 0);
      if (!cur || cur.w + w > budget - head(cur.first)) { cur = {idx: [], w: 0, bars: !!sc.measures, first: !out.length}; out.push(cur); }
      cur.idx.push(...u); cur.w += w;
    });
    if (out.length) out[out.length - 1].last = true;
    return out;
  }
  /** one row of the sheet: staffSVG + beams, bar lines and the time signature (the `extra` layer) */
  function rowSVG(sc, row, prefix, minW = 0) {
    const ks = A.keySigWidth(sc.sig);
    let x = 70 + ks + (row.first ? 34 : 0) + 14;
    const items = [], meta = [];
    let lastM = null, bars = [];
    row.idx.forEach(i => {
      const n = sc.notes[i];
      if (row.bars && lastM !== null && n.measure !== lastM) { bars.push(x - 12); x += 8; }
      lastM = n.measure;
      if (n.show.acc || n.show.natural) x += 12;
      items.push({n: n.show, x, id: `${prefix}${i}`, whole: n.beats >= 4});
      meta.push({i, beats: n.beats, x, y: A.noteY(clef, n.show)});
      x += STEP[n.beats] || STEP[.5];
    });
    const natural = x + 14, W = Math.max(natural, minW);
    // beams: notes shorter than a beat inside the same beat, stems one way (the group's average), meeting the beam
    let extra = '', pos = 0, mNow = null, group = [];
    const flush = () => {
      if (group.length < 2) { group = []; return; }
      const up = group.reduce((a, g) => a + g.y, 0) / group.length > MID;
      const end = up ? Math.min(...group.map(g => g.y)) - 46 : Math.max(...group.map(g => g.y)) + 46;
      group.forEach(g => { const it = items[g.k]; it.stemUp = up; it.stemTo = end; });
      const sx = g => g.x + (up ? 8.3 : -8.3), th = 6, dy = up ? 0 : -th;
      const bar = (a, b, off) => `<path class="sa-beam" d="M${a} ${end + dy + off}H${b}V${end + dy + off + th}H${a}Z"/>`;
      extra += bar(sx(group[0]) - 1, sx(group[group.length - 1]) + 1, 0);
      for (let k = 0; k < group.length; k++) if (group[k].beats <= .25) {         // sixteenths: a second beam (a stub for a lone one)
        let e = k; while (e + 1 < group.length && group[e + 1].beats <= .25) e++;
        const off = up ? 10 : -10;
        extra += e > k ? bar(sx(group[k]) - 1, sx(group[e]) + 1, off) : bar(sx(group[k]) - (k ? 10 : 0), sx(group[k]) + (k ? 0 : 10), off);
        k = e;
      }
      group = [];
    };
    meta.forEach((m, k) => {
      const n = sc.notes[m.i];
      if (n.measure !== mNow) { flush(); pos = 0; mNow = n.measure; }
      const beat = Math.floor(pos + 1e-6);
      if (m.beats < 1 && sc.measures) {
        if (group.length && Math.floor(group[0].pos + 1e-6) !== beat) flush();
        group.push(Object.assign({k, pos}, m));
      } else flush();
      pos += m.beats;
    });
    flush();
    if (row.first && sc.measures) {
      const tx = 70 + ks + 4;
      extra += `<text class="sa-tsig" x="${tx}" y="84">4</text><text class="sa-tsig" x="${tx}" y="116">4</text>`;
    }
    bars.forEach(bx => { extra += `<line class="sa-bar" x1="${bx}" y1="56" x2="${bx}" y2="120"/>`; });
    if (row.last && sc.measures) extra += `<line class="sa-bar" x1="${natural - 16}" y1="56" x2="${natural - 16}" y2="120"/><rect class="sa-bar-end" x="${natural - 12}" y="56" width="5" height="64"/>`;
    return A.staffSVG(clef, items, {width: W, fit: sc.notes.map(n => n.show), keySig: sc.sig, extra, label: `${sc.label}, notes ${row.idx[0] + 1} to ${row.idx[row.idx.length - 1] + 1}`});
  }
  function drawSheet(el, sc, prefix = 'sn') {
    const rows = rowsOf(sc, (el.clientWidth || 700) - 16);
    const wOf = r => 70 + A.keySigWidth(sc.sig) + (r.first && sc.measures ? 34 : 0) + 14 + r.idx.reduce((a, i) => a + noteW(sc.notes[i]), 0) + 14 +
      (r.bars ? 8 * (new Set(r.idx.map(i => sc.notes[i].measure)).size - 1) : 0);
    const minW = Math.max(...rows.map(wOf));                                    // every row the same scale, left-aligned like a printed part
    el.innerHTML = rows.map(r => `<div class="sa-row">${rowSVG(sc, r, prefix, minW)}</div>`).join('');
    el.dataset.w = el.clientWidth;
  }
  addEventListener('resize', () => {                                          // a turned iPad: the rows are packed again
    const el = $('sheet');
    if (G && !el.hidden && Math.abs((+el.dataset.w || 0) - el.clientWidth) > 40) { drawSheet(el, cur().sc); drawNow(); }
  });
  const noteEl = i => document.getElementById('sn' + i);
  function markNote(i, cls) { const g = noteEl(i); if (g) { g.classList.remove('ok', 'fix', 'bad', 'cur'); if (cls) g.classList.add(cls); } }
  function setCur(i) {
    document.querySelectorAll('#sheet g.cur').forEach(g => g.classList.remove('cur'));
    const g = noteEl(i); if (g) g.classList.add('cur');
  }
  function dotsHTML(res, n) {
    return `<span class="sa-dotrow">${Array.from({length: n}, (_, i) => `<i class="${res[i] || 'none'}"></i>`).join('')}</span>`;
  }

  /* ---------- the state of a run ---------- */
  let G = null;
  const scaleRun = sc => ({sc, res: [], i: 0, started: false, done: false, inTime: false, ms0: 0, ms: 0, wrong: 0});

  /* ---------- MODE + LEVEL SELECT ---------- */
  const pause = A.UI.pause.mount({
    onPause: () => { if (G) G.paused = true; },
    onResume: () => { if (G) { G.paused = false; G.last = performance.now(); } },
    onLevels: showHub,
    info: () => G ? [[G.kind === 'audition' ? 'Scale' : 'Note', G.kind === 'audition' ? `${G.si + 1} of ${G.runs.length}` : `${cur().i + 1} of ${cur().sc.notes.length}`], ['Time', fmt(G.ms)]] : [],
  });
  const PRACTICE_LIST = SCALES.concat([CHROM]);
  const readyFor = () => (gd.ready || {})[member.id];
  const prog = lv => A.store.level(GAME_ID, member.id, lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0;

  function drawOpts() {
    $('modeSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === opt.mode)));
    $('practiceOpts').hidden = opt.mode !== 'practice';
    $('loopSw').setAttribute('aria-checked', String(opt.loop));
    $('nbnSw').setAttribute('aria-checked', String(opt.nbn));
    $('guideSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === opt.guide)));
    const r = readyFor();
    $('readyBadge').hidden = !r;
    $('readyWho').textContent = r ? `${member.short} · earned ${r}` : '';
    $('modeNote').textContent = {
      practice: 'Pick a scale and play it as many times as you like: no clock, no stars. LOOP starts it again after the last note; SLOW GUIDE shows where you should be; NOTE BY NOTE waits for each note.',
      audition: `All four scales in order, F, B♭, E♭, A♭, one try each, like the real room. The GMEA sheet's time for ${member.name}: ${fmt(SHEET_S * 1000)}. No alarm: when time runs out you may finish the scale you are on.`,
      chrom: 'Tongued or slurred, any rhythm you choose — the judges listen for evenness, accuracy and speed.',
    }[opt.mode];
  }
  $('modeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.dataset.mode === opt.mode) return; setOpt({mode: b.dataset.mode}); A.Sfx.event('ui-toggle'); showHub(); });
  $('loopSw').addEventListener('click', () => { setOpt({loop: !opt.loop}); A.Sfx.event('ui-toggle'); drawOpts(); });
  $('nbnSw').addEventListener('click', () => { setOpt({nbn: !opt.nbn}); A.Sfx.event('ui-toggle'); drawOpts(); });
  $('guideSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setOpt({guide: +b.dataset.g}); A.Sfx.event('ui-toggle'); drawOpts(); });

  const practiceBest = id => ((gd.practice || {})[member.id] || {})[id];
  function showHub() {
    stopRun();
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    pause.setActive(false); A.UI.results.hide();
    $('play').hidden = true; $('hub').hidden = false;
    drawOpts();
    let cards = '', label, lockText, gameId = GAME_ID + ':' + opt.mode, isOpen = () => true;
    if (opt.mode === 'audition') {
      cards = LEVELS.map((L, i) => {
        const lv = i + 1, p = prog(lv), open = unlocked(i);
        return `<button class="lvl sa-lvl" data-l="${lv}" ${open ? '' : 'disabled'}>
          <span class="n">Level ${lv}</span>
          <span class="t">${esc(L.name)}</span>
          <span class="d">${esc(L.blurb)} ${fmt(SHEET_S * L.mult * 1000)} for all four scales.</span>
          <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? `Best ${p.best}% clean` : L.staff ? 'Music shown' : 'From memory'}</span></span>
        </button>`;
      }).join('');
      isOpen = unlocked; label = i => `Level ${i + 1} · ${LEVELS[i].name}`; lockText = i => `Earn a star in the ${LEVELS[i - 1].name} to unlock`;
    } else if (opt.mode === 'practice') {
      cards = PRACTICE_LIST.map((sc, i) => {
        const b = practiceBest(sc.id);
        return `<button class="lvl sa-lvl" data-p="${i}">
          <span class="n">${sc.id === 'chrom' ? 'Chromatic' : `Scale ${i + 1} of 4`}</span>
          <span class="t">${esc(sc.label)}</span>
          <span class="d">${sc.id === 'chrom' ? `${sc.notes.length} notes, up and down.` : `${sc.octaves} octave${sc.octaves > 1 ? 's' : ''}, up and down + arpeggio: ${sc.notes.length} notes.`}</span>
          <span class="foot"><span>${b ? `Best clean run ${fmt1(b * 100)}` : 'No clean run yet'}</span></span>
        </button>`;
      }).join('');
      label = i => PRACTICE_LIST[i].label;
    } else {
      const c = (gd.chrom || {})[member.id] || {};
      cards = `<button class="lvl sa-lvl" data-c="1">
          <span class="n">Chromatic Challenge</span>
          <span class="t">${esc(CHROM.label)}</span>
          <span class="d">Up and down, one try, a stopwatch and no time limit. 2 ★: ${CHROM_STARS.two.rate} clean notes a second, ${CHROM_STARS.two.miss} misses or fewer. 3 ★: ${CHROM_STARS.three.rate} a second, no misses.</span>
          <span class="foot"><span class="stars">${A.starStr(c.stars || 0)}</span><span>${c.t ? 'Best ' + fmt1(c.t * 100) : CHROM.notes.length + ' notes'}</span></span>
        </button>`;
      label = () => 'Chromatic Challenge';
    }
    $('levelGrid').className = 'levels sa-grid sa-grid-' + opt.mode;
    $('levelGrid').innerHTML = cards;
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.l) A.requireMic(() => begin('audition', +b.dataset.l));
      else if (b.dataset.p) A.requireMic(() => begin('practice', +b.dataset.p));
      else A.requireMic(() => begin('chrom', 0));
    }));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), unlocked: isOpen, label, lockText, gameId});
  }

  /* ---------- a run ---------- */
  const cur = () => G.runs[G.si];
  let timers = [];
  function later(ms, fn) {                                  // a timer that waits while the game is paused
    const tok = G && G.tok;
    const t = {left: ms, fn, tok, at: performance.now()};
    const run = () => {
      if (!G || G.tok !== tok) return;
      if (G.paused) { t.id = setTimeout(run, 120); return; }
      fn();
    };
    t.id = setTimeout(run, ms); timers.push(t);
  }
  function stopRun() {
    timers.forEach(t => clearTimeout(t.id)); timers = [];
    cancelAnimationFrame(raf); raf = 0;
    if (G) { G.tok = -1; G.listening = false; }
    G = null;
    A.Pitch.pauseListening(true);
    $('adj').hidden = true; $('timeUp').hidden = true;
  }

  function begin(kind, arg) {
    stopRun();
    A.LevelSelect.played(kind === 'audition' ? arg - 1 : kind === 'practice' ? arg : 0);
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    A.Pitch.pauseListening(true);                   // …and the microphone waits for the countdown
    const tok = Date.now();
    const L = kind === 'audition' ? LEVELS[arg - 1] : null;
    const list = kind === 'audition' ? SCALES : kind === 'chrom' ? [CHROM] : [PRACTICE_LIST[arg]];
    G = {kind, arg, L, tok, runs: list.map(scaleRun), si: 0, ms: 0, last: performance.now(), clockOn: false, listening: false, paused: false,
      limit: kind === 'audition' ? SHEET_S * L.mult * 1000 : 0, timeUp: false, lastNoteAt: 0, cleanRuns: 0, laps: 0,
      memory: kind === 'audition' && !L.staff, nbn: kind === 'practice' && opt.nbn, guide: kind === 'practice' ? opt.guide : 0, loop: kind === 'practice' && opt.loop,
      f: {cand: null, gap: 99, lastPc: null, lastAt: 0, attackAt: 0}};
    A.UI.results.hide(); $('hub').hidden = true; $('play').hidden = false;
    // one try each, like the real room: no RESTART in an audition or the Chromatic Challenge (practice has one)
    pause.set({onRestart: kind === 'practice' ? () => G && begin(G.kind, G.arg) : null,
      levelsLabel: kind === 'practice' ? 'Back to scales' : 'Back to levels', leaveTitle: kind === 'practice' ? 'Leave this scale?' : 'Leave the audition?'});
    pause.setActive(true);
    $('who').innerHTML = A.avatarHTML({size: 'chip', member: member.id});
    $('hudKicker').textContent = kind === 'audition' ? `Audition · Level ${arg}` : kind === 'chrom' ? 'Chromatic Challenge' : 'Practice';
    $('hudTitle').textContent = kind === 'audition' ? L.name : kind === 'chrom' ? member.short : G.runs[0].sc.name;
    $('clockLabel').textContent = kind === 'audition' ? 'Time left' : 'Time';
    $('timeBar').hidden = kind !== 'audition';
    $('clock').textContent = fmt(G.limit);
    showScale();
    setPrompt('');
    window.scrollTo(0, 0);
    raf = requestAnimationFrame(loop);
    if (kind === 'practice') {                     // practice: no adjudicator, no countdown
      setPrompt(G.nbn ? 'Play each note as it shows.' : 'Start when you are ready.');
      later(400, startListening);
      return;
    }
    $('adj').hidden = false;
    $('adjText').textContent = kind === 'audition' ? 'Please play your scales in order, from memory.' : 'Please play your chromatic scale, up and down.';
    $('count').textContent = '';
    const voice = kind === 'audition' ? A.Sfx.event('sa-adjudicator') * 1000 : 0;
    later(Math.max(READ_MS, voice + 300), () => {
      A.countdown({style: 'classic', voicePrefix: 'audition', go: true, later,
        show: (text, k) => { const c = $('count'); c.textContent = text === 'GO!' ? 'Begin!' : text; c.className = 'sa-count ' + (k || ''); },
        onGo: () => { $('adj').hidden = true; startListening(); }});
    });
  }
  function startListening() {
    if (!G) return;
    if (MALLET) A.Pitch.setRange(MALLET_RANGE[0], MALLET_RANGE[1]); else A.Pitch.setRange(member.soundLow, member.soundHigh);
    A.Pitch.pauseListening(false);
    A.Pitch.ignoreCurrent();                       // whatever is already sounding doesn't count
    A.Sfx.sync();
    G.listening = true; G.clockOn = true; G.last = performance.now(); G.lastNoteAt = G.last;
    setPrompt(G.kind === 'audition' ? `Begin with ${cur().sc.name}.` : G.kind === 'chrom' ? 'Begin.' : prompt0());
  }
  const prompt0 = () => G.nbn ? 'Play the note on the staff.' : 'Play the scale: the microphone follows along.';

  /** draw the current scale (the sheet, or the memory card, or NOTE BY NOTE's single note) */
  function showScale() {
    const r = cur(), sc = r.sc;
    $('stepNo').textContent = G.kind === 'audition' ? `Scale ${G.si + 1} of ${G.runs.length}` : G.kind === 'chrom' ? CHROM.label : (G.loop ? `Clean runs: ${G.cleanRuns}` : '');
    $('scaleName').textContent = G.kind === 'chrom' ? 'Chromatic' : sc.label;
    $('memory').hidden = !G.memory;
    $('sheet').hidden = G.memory || G.nbn;
    $('nbn').hidden = !G.nbn;
    if (G.memory) { $('memName').textContent = sc.label; $('memSub').textContent = `${sc.octaves} octave${sc.octaves > 1 ? 's' : ''}, up and down, then the arpeggio.`; }
    else if (!G.nbn) drawSheet($('sheet'), sc);
    drawNow();
  }
  function drawNow() {
    const r = cur(), n = r.sc.notes.length;
    if (!G.memory && !G.nbn) { r.res.forEach((st, i) => markNote(i, st)); if (r.i < n) setCur(r.i); }
    $('liveDots').innerHTML = dotsHTML(r.res, n);
    if (G.nbn && r.i < n) drawNbn(r.sc.notes[r.i], r.i, n);
  }
  function drawNbn(note, i, n) {
    $('nbnStaff').innerHTML = A.staffSVG(clef, [{n: note.show, x: 150 + A.keySigWidth(r0().sc.sig), id: 'nb'}], {width: 240 + A.keySigWidth(r0().sc.sig), keySig: r0().sc.sig, label: 'Play this note'});
    $('nbnName').textContent = nameOf(note);
    $('nbnOf').textContent = `Note ${i + 1} of ${n}`;
    const T = A.Masher && A.Masher.table(member), fs = T && T.notes(note.midi);
    if (fs && fs.length && A.Masher.DIAGRAMS[T.diagram]) {
      $('nbnFing').innerHTML = A.Masher.diagramSVG(T.diagram, {label: `Fingering for ${nameOf(note)}: ${fs[0].text}`}) + `<p class="sa-fing-t">${esc(fs[0].text)}${fs.length > 1 ? ` <small>(or ${esc(fs.slice(1).map(f => f.text).join(', '))})</small>` : ''}</p>`;
      A.Masher.setState($('nbnFing').querySelector('svg'), A.Masher.pressedOf(fs[0].keys));
    } else $('nbnFing').innerHTML = '';
  }
  const r0 = () => cur();
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- HEARING: follow the notes in order ---------- */
  A.Pitch.onAttack(a => { if (G && G.listening) G.f.attackAt = a.time; });
  A.Pitch.onFrame((r, level, now) => {
    const hb = $('hearNote');
    hb.textContent = r ? inst.writtenName(r.pc) : '–';
    const bars = A.Pitch.bars(level);
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
    if (!G || !G.listening || G.paused) return;
    const f = G.f;
    if (!r) { f.gap++; f.cand = null; return; }
    if (f.cand && f.cand.pc === r.pc) f.cand.n++;
    else { f.cand = {pc: r.pc, n: 1, afterGap: f.gap >= GAP_FRAMES, used: false, usedAt: 0}; }
    f.gap = 0;
    const c = f.cand;
    if (c.n < STABLE_FRAMES) return;
    const fresh = f.attackAt > f.lastAt + ATTACK_NEW_MS && f.attackAt > c.usedAt;
    if (!c.used) {
      c.used = true; c.usedAt = now;
      if (c.pc !== f.lastPc || c.afterGap || fresh) heard(c.pc, now);          // else: the same note, still held
    } else if (fresh) { c.usedAt = now; heard(c.pc, now); }                    // the same pitch tongued again
  });

  /** one note heard: judge it against the expected note */
  function heard(pc, now) {
    const f = G.f, r = cur(), notes = r.sc.notes;
    f.lastPc = pc; f.lastAt = now; G.lastNoteAt = now;
    if (r.i >= notes.length) return;
    const want = notes[r.i], next = notes[r.i + 1], prev = r.i > 0 ? notes[r.i - 1] : null;
    if (!r.started) { r.started = true; r.ms0 = G.ms; if (G.guide) G.guideAt = G.ms; }
    if (pc === want.pc) { r.res[r.i] = r.res[r.i] === 'bad' ? 'fix' : 'ok'; advance(1); }
    else if (next && pc === next.pc) { r.res[r.i] = 'bad'; r.res[r.i + 1] = 'ok'; r.skipped = (r.skipped || 0) + 1; setPrompt(`Skipped ${nameOf(want)}.`, 'bad'); advance(2); }
    else if (prev && pc === prev.pc) { /* the note just counted, played again: ignored */ }
    else {
      r.wrong++;
      if (r.res[r.i] !== 'bad') { r.res[r.i] = 'bad'; }
      setPrompt(G.memory ? 'Not that one. Keep going!' : `That's ${inst.writtenName(pc)}. Look for ${nameOf(want)}.`, 'bad');
      drawNow();
    }
  }
  function advance(k) {
    const r = cur();
    r.i += k;
    if (r.i >= r.sc.notes.length) { scaleDone(); return; }
    if (G.kind !== 'audition' || !G.timeUp) setPrompt(G.nbn ? 'Yes! Next note.' : '', 'good');
    drawNow();
  }
  function scaleDone() {
    const r = cur();
    r.done = true; r.ms = G.ms - r.ms0; r.inTime = G.kind !== 'audition' || !G.timeUp;
    drawNow();
    if (G.kind === 'practice') return practiceDone();
    if (G.kind === 'chrom') return finish();
    if (G.timeUp || G.si >= G.runs.length - 1) return finish();
    G.si++;
    G.f.cand = null;
    showScale();
    setPrompt(`Next: ${cur().sc.name}.`);
  }
  function practiceDone() {
    const r = cur(), clean = r.res.filter(x => x === 'ok').length === r.sc.notes.length;
    if (clean) {
      G.cleanRuns++;
      const tenths = Math.round(r.ms / 100), p = (gd.practice = gd.practice || {}), me = (p[member.id] = p[member.id] || {});
      if (!me[r.sc.id] || tenths < me[r.sc.id]) { me[r.sc.id] = tenths; save(); }
    }
    G.laps++;
    if (G.loop) {                                   // LOOP: straight back to the first note
      G.runs[0] = scaleRun(r.sc); G.guideAt = null;
      setPrompt(clean ? `Clean run! (${G.cleanRuns})` : 'Again from the top.', clean ? 'good' : '');
      showScale();
      return;
    }
    finish();
  }

  /* ---------- the clock (rAF): pauses while paused, hidden or during Pitch suppression ---------- */
  let raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!G) return;
    const dt = now - G.last; G.last = now;
    if (G.clockOn && !G.paused && !document.hidden && !A.Pitch.isSuppressed(now)) G.ms += Math.min(dt, 250);
    if (G.kind === 'audition') {
      const left = G.limit - G.ms;
      $('clock').textContent = fmt(Math.ceil(Math.max(0, left) / 1000) * 1000);
      const bar = $('timeBar'), frac = Math.max(0, left / G.limit);
      bar.firstElementChild.style.transform = `scaleX(${frac})`;
      bar.classList.toggle('low', left <= LOW_TIME_S * 1000);
      bar.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
      if (G.clockOn && !G.timeUp && left <= 0) timeIsUp();
      if (G.timeUp && G.listening && !G.paused && now - G.lastNoteAt > TIME_UP_IDLE_S * 1000) finish();
    } else $('clock').textContent = fmt(G.ms);
    if (G.guide && G.guideAt != null) guideTick();
  }
  function timeIsUp() {
    G.timeUp = true;
    const r = cur();
    if (!r.started) { finish(); return; }           // nothing started: the audition ends here
    setPrompt('Time is up: you may finish this scale and arpeggio.');   // calm, no alarm (the GMEA rule)
  }
  /** SLOW GUIDE: a moving highlight at ♩ = tempo along the sheet's rhythm (silent; it never judges) */
  function guideTick() {
    const r = cur(), notes = r.sc.notes, beat = 60000 / G.guide;
    let t = (G.ms - G.guideAt) / beat, k = 0;
    while (k < notes.length - 1 && t >= notes[k].beats) { t -= notes[k].beats; k++; }
    if (k === G.guideK) return;
    G.guideK = k;
    document.querySelectorAll('#sheet g.guide').forEach(g => g.classList.remove('guide'));
    const g = noteEl(k); if (g) g.classList.add('guide');
  }

  /* ---------- the end: the score sheet ---------- */
  function finish() {
    if (!G || !G.listening) return;
    G.listening = false; G.clockOn = false;
    A.Pitch.pauseListening(true); A.Sfx.sync();
    const done = () => (G.kind === 'audition' ? results() : G.kind === 'chrom' ? chromResults() : practiceResults());
    if (G.kind === 'audition') {
      $('timeUp').hidden = false;
      $('timeUpSub').textContent = G.timeUp ? '' : 'All four scales played.';
      $('timeUp').querySelector('.sa-adj-t').textContent = G.timeUp ? 'Time. Thank you.' : 'Thank you.';
      later(THANKS_MS, () => { $('timeUp').hidden = true; done(); });
    } else done();
  }
  const cleanOf = r => r.res.filter(x => x === 'ok').length;
  function sheetRow(r, label) {
    const n = r.sc.notes.length, clean = cleanOf(r);
    const status = r.done && r.inTime ? '<b class="sa-ok">✓ finished</b>' : r.done ? '<b class="sa-late">✓ finished after time</b>' : '<b class="sa-bad">✗ time</b>';
    return `<tr><th scope="row">${esc(label || r.sc.label)}</th><td>${status}</td><td class="sa-num">${clean}/${n}</td><td class="sa-num">${r.started ? fmt1(r.done ? r.ms : G.ms - r.ms0) : '–'}</td></tr>
      <tr class="sa-dotline"><td colspan="4">${dotsHTML(r.res, n)}</td></tr>`;
  }
  function sheetHTML(rows, total) {
    return `<div class="sa-scoresheet" id="scoreSheet"><p class="sa-ss-h">Judge's score sheet · ${esc(member.name)}</p>
      <table><thead><tr><th scope="col">Scale</th><th scope="col">Result</th><th scope="col">Clean</th><th scope="col">Time</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="sa-ss-key"><i class="ok"></i> clean <i class="fix"></i> fixed <i class="bad"></i> missed or skipped <i class="none"></i> not played</p>
      ${total ? `<p class="sa-ss-total">${total}</p>` : ''}</div>`;
  }
  function results() {
    const lv = G.arg, runs = G.runs;
    const total = runs.reduce((a, r) => a + r.sc.notes.length, 0), clean = runs.reduce((a, r) => a + cleanOf(r), 0);
    const allInTime = runs.every(r => r.done && r.inTime);
    const stars = !allInTime ? 0 : clean === total ? 3 : clean / total >= TWO_STARS_CLEAN ? 2 : 1;
    const pct = Math.round(clean / total * 100);
    const old = prog(lv);
    A.store.setLevel(GAME_ID, member.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(pct, old.best || 0)}, stars);
    let newReady = false;
    if (lv === LEVELS.length && stars === 3) { const rd = (gd.ready = gd.ready || {}); newReady = !rd[member.id]; if (newReady) { rd[member.id] = A.store.today ? A.store.today() : new Date().toISOString().slice(0, 10); save(); } }
    const ready = lv === LEVELS.length && stars === 3;
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    const extra = (ready ? `<p class="sa-ready sa-res-ready" id="resReady"><span class="sa-ready-b">ALL-STATE READY</span> ${newReady ? 'New!' : ''}</p>` : '') +
      sheetHTML(runs.map(r => sheetRow(r)).join(''), `Total time ${fmt1(G.ms)} of ${fmt(G.limit)}${G.timeUp ? ' · time ran out' : ''}`);
    A.UI.results.show({gameId: GAME_ID, stars, wide: true, actsFirst: true,
      title: stars === 3 ? (ready ? 'All-State ready!' : 'Perfect audition!') : stars ? 'Audition finished' : 'Time. Thank you.',
      msg: stars === 3 ? 'Every note clean, all four scales in time.'
        : stars === 2 ? 'Every note clean for 3 stars.'
        : stars === 1 ? `Get ${Math.round(TWO_STARS_CLEAN * 100)} % of the notes clean for 2 stars.`
        : 'Finish all four scales in time for a star. Practice mode has no clock.',
      tiles: [['Clean notes', `${clean}/${total}`], ['Clean', `${pct}%`], ['Scales in time', `${runs.filter(r => r.done && r.inTime).length}/4`]],
      best: old.best ? `Best: ${Math.max(pct, old.best)}% clean` : '', newBest: old.best > 0 && pct > old.best, newBestText: 'New best!',
      extra,
      next: {label: 'Next level', hidden: !hasNext, onClick: () => A.requireMic(() => begin('audition', lv + 1))},
      retry: {label: 'Try again', onClick: () => A.requireMic(() => begin('audition', lv))},
      levels: {label: 'Levels', onClick: showHub},
      announce: true});                           // (UI.results calls Skins.announce: the UNLOCKED! card + the avatar)
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > old.stars && 'star-earned']);
    G.done = true;
  }
  function chromResults() {
    const r = G.runs[0], n = r.sc.notes.length, clean = cleanOf(r), miss = n - clean;
    const secs = Math.max(.1, r.ms / 1000), rate = clean / secs;
    const stars = !r.done ? 0 : rate >= CHROM_STARS.three.rate && miss <= CHROM_STARS.three.miss ? 3 : rate >= CHROM_STARS.two.rate && miss <= CHROM_STARS.two.miss ? 2 : 1;
    const c = (gd.chrom = gd.chrom || {}), me = (c[member.id] = c[member.id] || {}), tenths = Math.round(r.ms / 100), oldT = me.t;
    const newBest = r.done && (!oldT || tenths < oldT);
    const oldStars = me.stars || 0;
    if (r.done) { if (newBest) me.t = tenths; me.stars = Math.max(oldStars, stars); save(); }
    A.UI.results.show({gameId: GAME_ID, stars, wide: true, actsFirst: true,
      title: stars === 3 ? 'Even, clean and fast!' : stars ? 'Chromatic finished' : 'Chromatic',
      msg: stars === 3 ? 'The judges would love that.' : stars === 2 ? `${CHROM_STARS.three.rate} clean notes a second with no misses for 3 stars.` : `${CHROM_STARS.two.rate} clean notes a second with ${CHROM_STARS.two.miss} misses or fewer for 2 stars.`,
      tiles: [['Time', fmt1(r.ms)], ['Clean', `${clean}/${n}`], ['Notes a second', rate.toFixed(1)]],
      best: oldT || newBest ? `Best time: ${fmt1(Math.min(oldT || tenths, tenths) * 100)}` : '', newBest: newBest && !!oldT, newBestText: 'New best time!',
      extra: sheetHTML(sheetRow(r, CHROM.label)),
      retry: {label: 'Try again', onClick: () => A.requireMic(() => begin('chrom', 0))},
      levels: {label: 'Back', onClick: showHub}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > oldStars && 'star-earned']);
    G.done = true;
  }
  function practiceResults() {
    const r = G.runs[0], n = r.sc.notes.length, clean = cleanOf(r), b = practiceBest(r.sc.id);
    A.UI.results.show({gameId: GAME_ID, stars: null, wide: true, actsFirst: true,
      title: clean === n ? 'Clean run!' : 'Run finished', kicker: 'Practice',
      msg: clean === n ? 'Every note clean.' : `${clean} of ${n} notes clean. The dots show exactly where it broke.`,
      tiles: [['Clean', `${clean}/${n}`], ['Time', fmt1(r.ms)]],
      best: b ? `Best clean run: ${fmt1(b * 100)}` : 'No clean run yet',
      extra: sheetHTML(sheetRow(r)),
      retry: {label: 'Play it again', onClick: () => A.requireMic(() => begin('practice', G ? G.arg : 0))},
      levels: {label: 'Scales', onClick: showHub}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    G.done = true;
  }

  /* ---------- ?demo: Space = the next note (hold = keep playing), W = a wrong note, K = skip one ---------- */
  if (A.DEMO) {
    let hold = 0;
    const wantPc = () => G && G.listening && cur().i < cur().sc.notes.length ? cur().sc.notes[cur().i] : null;
    const play = () => { const w = wantPc(); if (w) heard(w.pc, performance.now()); };
    addEventListener('keydown', e => {
      if (!G || !G.listening || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); if (e.repeat) return; play(); clearInterval(hold); hold = setInterval(play, DEMO_STEP_MS); }
      else if (k === 'w' && !e.repeat) { const w = wantPc(); if (w) heard((w.pc + 1) % 12 === (cur().sc.notes[cur().i + 1] || {}).pc ? (w.pc + 6) % 12 : (w.pc + 1) % 12, performance.now()); }
      else if (k === 'k' && !e.repeat) { const r = cur(), nx = r.sc.notes[r.i + 1]; if (nx) heard(nx.pc, performance.now()); }
    });
    addEventListener('keyup', e => { if (e.key === ' ') clearInterval(hold); });
  }

  /* tests */
  A.ScaleAudition = {
    state: () => G ? {kind: G.kind, arg: G.arg, si: G.si, listening: G.listening, ms: G.ms, limit: G.limit, timeUp: G.timeUp, memory: G.memory, done: !!G.done,
      runs: G.runs.map(r => ({id: r.sc.id, i: r.i, n: r.sc.notes.length, res: r.res.slice(), started: r.started, done: r.done, inTime: r.inTime, wrong: r.wrong}))} : null,
    want: () => G && G.listening && cur().i < cur().sc.notes.length ? cur().sc.notes[cur().i] : null,
    heard: pc => G && heard(pc, performance.now()),
    scales: () => SCALES, chromatic: () => CHROM, begin, setMs: ms => { if (G) G.ms = ms; },
    member: () => member.id,
  };

  showHub();
})(window.Arcade);
