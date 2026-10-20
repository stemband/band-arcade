/* PERFECT PITCH: hear it, judge it, tune it (docs/games/perfect-pitch.md). Pedal Point's and Slide Quest's sibling.
   Each round: HEAR the tuner's reference, then the instrument's note (the game made it SHARP, FLAT or exactly IN TUNE);
   JUDGE it (SHARP · FLAT · IN TUNE); TUNE it with that instrument's real tuning mechanism, drawn on the screen; LOCK IN
   and be scored on the judgment and on how close it got, in cents. NO MICROPHONE AT ALL (no pitch.js on this page):
   every sound is the game's own (shared/winds.js), so the score is exact.
     instruments.js  THE TABLE (PP2_TUNE) and THE MECHANISM PHYSICS (Arcade.PP2Tune) · art.js  THE PICTURES
     levels.js       THE LEVELS, THE SCORING, the rules of a round
   Progress: setLevel('perfect-pitch', 'all', level, {stars, best}) (games.js player: 'all': the stars don't depend on
   which instrument is tuned). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'perfect-pitch';
  const LEVELS = window.PP2_LEVELS, SCORING = window.PP2_SCORING, RULES = window.PP2_RULES;
  const T = A.PP2Tune, ART = A.PP2Art, W = A.Winds;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const MINUS = '−';
  const OBOE_TEXT = 'Oboes and bassoons don\'t tune with a slide or a barrel. Oboists tune by moving the reed in or out a tiny bit and with their embouchure, and bassoonists change to a different bocal. That\'s too small to practice here, so pick another instrument to tune. The clarinet\'s barrel is a good one to try!';

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Ear training'});
  $('demoHelp').hidden = !A.DEMO;

  /* saved: gameData('perfect-pitch') = {tune: the instrument picked here (a player id), oboeNote: the oboe / bassoon
     explanation was shown on this device} */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };

  /* ================= CHOOSE AN INSTRUMENT TO TUNE ================= */
  const tunable = id => !!id && !!T.byId(id);
  const locked = id => T.LOCKED.includes(id);
  const savedMember = () => { const m = A.currentMember ? A.currentMember() : null; return m ? m.id : null; };
  /** the default: the saved instrument when it's tunable, else the last one picked here, else none yet */
  function defaultTune() {
    const own = savedMember();
    if (tunable(own)) return own;
    return tunable(gd().tune) ? gd().tune : null;
  }
  let tune = defaultTune();
  const tuneRow = () => T.byId(tune);
  const memberShort = id => (T.member(id) || {}).short || id;
  function drawTuneRow() {
    $('tuneName').textContent = tune ? memberShort(tune) : 'Choose';
    $('tuneWhat').textContent = tune ? `${tuneRow().mech}, ${tuneRow().where}` : 'Pick an instrument to tune';
    $('tunePic').innerHTML = tune && A.portraitHTML ? A.portraitHTML(tune, {size: 'chip'}) : '';
  }
  function pick(id) {
    if (!tunable(id)) return false;
    tune = id; save({tune: id});
    drawTuneRow(); showHub();
    return true;
  }
  /* THE PICKER: a panel of tiles in PLAYERS order (no bells, no snare); oboe and bassoon dimmed with a lock */
  let picker = null, afterPick = null;
  const LOCK_SVG = '<svg class="p2-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  function openPicker(then = null) {
    closePicker();
    afterPick = then;
    const ids = A.PLAYERS.filter(id => !T.HIDDEN.includes(id));
    picker = document.createElement('div');
    picker.className = 'overlay ui-ov p2-pick-ov'; picker.id = 'tunePicker';
    picker.innerHTML = `<div class="panel ui-panel p2-pick" role="dialog" aria-modal="true" aria-labelledby="pickTitle">
      <h2 class="ui-title" id="pickTitle">Choose an instrument to tune</h2>
      <p class="p2-pick-sub">Every instrument tunes a different way. Pick yours, or try another one!</p>
      <div class="p2-tiles">${ids.map(id => `<button type="button" class="p2-tile${locked(id) ? ' locked' : ''}${id === tune ? ' on' : ''}" data-id="${id}"
          ${locked(id) ? 'aria-disabled="true"' : `aria-pressed="${id === tune}"`}>${A.portraitHTML ? A.portraitHTML(id, {size: 'tile'}) : ''}<span class="p2-tile-n">${esc(memberShort(id))}</span>${locked(id) ? LOCK_SVG : ''}</button>`).join('')}</div>
      <div class="acts"><button type="button" class="btn btn-secondary" id="pickClose">Close</button></div></div>`;
    document.body.appendChild(picker);
    picker.querySelectorAll('.p2-tile').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (locked(id)) { A.Sfx.event('ui-toggle'); oboeNotice(); return; }
      A.Sfx.event('ui-toggle');
      const then = afterPick; closePicker(); pick(id);
      if (then) then();
    }));
    picker.querySelector('#pickClose').addEventListener('click', () => closePicker());
    picker.addEventListener('click', e => { if (e.target === picker) closePicker(); });
    A.UI.layer.open(picker, {min: 90, trap: true, onEsc: () => closePicker(), focus: tune ? `.p2-tile[data-id="${tune}"]` : '.p2-tile:not(.locked)'});
  }
  function closePicker() {
    if (!picker) return;
    A.UI.layer.close(picker); picker.remove(); picker = null; afterPick = null;
  }
  const oboeNotice = () => A.UI.notice({title: 'Not this one', text: esc(OBOE_TEXT), ok: 'OK', theme: 'p2-theme'});
  $('tuneBtn').addEventListener('click', () => openPicker());

  /* A saved oboe or bassoon: the explanation once per device, after PRESS START (an intro panel), then the picker */
  A.PressStart.show(GAME_ID, () => setTimeout(oboeIntro, 0));      // (after the first screen is drawn)
  function oboeIntro() {
    if (!locked(savedMember()) || gd().oboeNote) return;
    save({oboeNote: true});
    A.UI.intro.show({theme: 'p2-intro', kicker: memberShort(savedMember()), title: 'Pick an instrument to tune', text: esc(OBOE_TEXT),
      hero: `<div class="p2-intro-art" aria-hidden="true">${ART.svg('clarinet', {mini: true})}</div>`,
      extra: '<p class="p2-lesson" id="oboeNote"><b>Every band player needs good ears, and you can train yours here.</b></p>',
      go: {label: 'Choose', onClick: () => openPicker()}});
  }

  /* ================= THE LEVEL SELECT ================= */
  const prog = lv => A.store.level(GAME_ID, 'all', lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0;
  function showHub() {
    stopRound(); G = null;
    A.Sfx.gameMenuMusic(GAME_ID);
    pause.setActive(false); A.UI.results.hide(); A.UI.intro.hide();
    $('play').hidden = true; $('hub').hidden = false;
    drawTuneRow();
    const art = tune ? tuneRow().art : 'clarinet';
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = prog(lv), open = unlocked(i);
      return `<button class="lvl" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini">${ART.icon(art)}</span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${esc(L.idea)}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : L.rounds + ' rounds'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), unlocked,
      label: i => `Level ${i + 1} · ${LEVELS[i].name}`});
  }

  /* THE LEVEL INTRO (shared/ui-kit.js); no instrument chosen yet: the picker first, then the intro */
  function begin(lv) {
    A.UI.results.hide();
    if (!tune) { openPicker(() => begin(lv)); return; }
    const L = LEVELS[lv - 1];
    A.UI.intro.show({theme: 'p2-intro', kicker: `Level ${lv}`, title: L.name, text: esc(L.say),
      hero: `<div class="p2-intro-art" aria-hidden="true">${ART.svg(tuneRow().art, {mini: true})}</div>`,
      extra: `<p class="p2-lesson">Tuning: <b>${esc(memberShort(tune))}</b> (the ${esc(tuneRow().mech.toLowerCase())})</p>`,
      go: {label: 'Let\'s play!', onClick: () => startLevel(lv)},
      back: {label: 'Levels', onClick: () => showHub()}});
  }

  /* ================= THE STAGE ================= */
  let G = null;
  const ID = () => G.tune;
  const art = () => ART.ART[G.row.art];
  /** the instrument note's frequency at the mechanism's setting now */
  const fNow = () => G.r.f * Math.pow(2, (G.r.offset + T.centsAt(ID(), G.d)) / 1200);
  /** the error now (cents, + = sharp) */
  const errNow = () => G.r.offset + T.centsAt(ID(), G.d);
  function buildStage() {
    const row = G.row;
    $('stage').innerHTML = ART.svg(row.art, {label: `The ${memberShort(G.tune)}'s ${row.mech.toLowerCase()}: drag it to pull it out (lower) or push it in (higher)`});
    const m = $('mech');
    m.setAttribute('role', 'slider'); m.setAttribute('aria-label', `The ${row.mech.toLowerCase()}: drag it out (lower) or in (higher)`);
    m.setAttribute('aria-valuemin', -row.travel); m.setAttribute('aria-valuemax', row.travel);
    $('needle').hidden = !G.L.needle;
    $('againBtn').hidden = !G.L.replay;
    $('togetherBtn').hidden = !G.L.together;
    $('bothTuneBtn').hidden = !G.L.together;
    A.holdGuard($('stage'), {lock: true});
    dragMech(m);
  }
  function draw() {
    if (!G || !$('mech')) return;
    const row = G.row;
    $('mech').setAttribute('transform', `translate(${ART.shift(art(), G.d, row.travel).toFixed(2)} 0)`);
    $('mech').setAttribute('aria-valuenow', G.d.toFixed(1));
    $('stage').classList.toggle('sounding', !!G.sounding);
    $('stage').classList.toggle('tuning', G.phase === 'tune');
    $('lockBtn').disabled = !lockReady();
    $('playBtn').classList.toggle('on', !!G.sounding);
    const judging = G.phase === 'judge';
    ['judgeSharp', 'judgeFlat', 'judgeTune'].forEach(id => { $(id).disabled = !judging; });
    $('againBtn').disabled = $('togetherBtn').disabled = !judging;
    if (G.L.needle) drawNeedle();
  }
  /* THE TUNER NEEDLE: −50…+50 cents from the reference, live while the note sounds */
  function drawNeedle() {
    const live = G.phase === 'tune' && (G.sounding || G.togetherOn), c = errNow(), v = Math.max(-50, Math.min(50, c));
    const el = $('needle');
    el.classList.toggle('idle', !live);
    el.querySelector('.sn-needle').setAttribute('transform', `translate(${(live ? v * 1.8 : 0).toFixed(2)} 0)`);
    el.classList.toggle('near', live && Math.abs(c) <= SCORING.stars[2][0]);
  }
  const lockReady = () => !!G && G.phase === 'tune' && !G.paused && G.r.heardAt != null && Math.abs(G.r.heardAt - G.d) < 1e-9;

  /* THE MECHANISM: drag it anywhere on it; it moves from where it is (never jumps to the finger) */
  function dragMech(el) {
    let start = null;
    el.addEventListener('pointerdown', e => {
      if (!canTune()) return;
      e.preventDefault();
      const svg = $('stage').querySelector('svg').getBoundingClientRect(), a = art();
      start = {cx: e.clientX, d: G.d, k: svg.width / ART.W * a.span / (2 * G.row.travel) * a.outDir, id: e.pointerId};   // screen px per mm (signed)
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('held');
    });
    el.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id || !canTune()) return;
      setPull(start.d + (e.clientX - start.cx) / start.k);
    });
    const end = e => { if (start && e.pointerId === start.id) { start = null; el.classList.remove('held'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  const canTune = () => !!G && !G.paused && G.phase === 'tune';
  /** set the pull (mm from the middle, + = out); the first move is checked for the wrong way */
  function setPull(d) {
    if (!canTune()) return false;
    const nd = T.clampD(ID(), d), r = G.r;
    if (Math.abs(nd - G.d) < 1e-9) return true;
    if (!r.firstMove) {
      r.firstMove = nd > G.d ? 'out' : 'in';
      // THE WRONG WAY: sharp and pushed IN (higher), or flat and pulled OUT (lower): said once, right then
      if ((r.offset > 0 && r.firstMove === 'in') || (r.offset < 0 && r.firstMove === 'out')) {
        r.wrongWay = true; G.wrongWay++;
        const b = $('wrongWay');
        b.textContent = r.offset > 0 ? 'Sharp means too high: PULL OUT to make it longer and lower.' : 'Flat means too low: PUSH IN to make it shorter and higher.';
        b.hidden = false;
      }
    }
    G.d = nd;
    if (G.sounding) { W.setFreq(fNow()); r.heardAt = G.d; }       // a sounding note glides with the mechanism
    draw();
    return true;
  }
  /** move it by `c` cents' worth (+ = higher = IN) */
  const nudge = c => canTune() && setPull(T.dFor(ID(), T.centsAt(ID(), G.d) + c));

  /* ================= PLAYING A LEVEL ================= */
  function startLevel(lv) {
    stopRound();
    if (!tune) { openPicker(() => begin(lv)); return; }
    A.LevelSelect.played(lv - 1);
    A.Sfx.gameMenuMusic(GAME_ID, false);                     // the menu music fades out: tuning needs quiet
    const L = LEVELS[lv - 1];
    G = {lv, L, tune, row: tuneRow(), i: 0, n: L.rounds, results: [], score: 0, wrongWay: 0, paused: false, phase: 'wait', timers: [],
         d: 0, sounding: false, togetherOn: false, plan: makePlan(L, lv, tune)};
    A.UI.results.hide(); A.UI.intro.hide();
    $('hub').hidden = true; $('play').hidden = false;
    pause.setActive(true);
    $('hudLevelLabel').textContent = `Level ${lv}`; $('hudLevelName').textContent = L.name; $('hudScore').textContent = '0';
    buildStage();
    window.scrollTo(0, 0);
    nextRound(true);
  }
  function later(ms, fn) { const t = setTimeout(() => { G && (G.timers = G.timers.filter(x => x !== t)); fn(); }, ms); if (G) G.timers.push(t); return t; }
  function stopRound() {
    W.stopAll();
    if (G) { G.timers.forEach(clearTimeout); G.timers = []; G.sounding = false; G.togetherOn = false; clearTimeout(G.playTimer); clearTimeout(G.togTimer); if (G.both) G.both.cancel(); }
  }

  /* THE ROUND MAKER: the level's offsets (± a value in its range, never the same value twice; `inTune` rounds exactly
     0, shuffled in, never level 1's first round) and its notes (never the same note with the same sign twice while
     another is left) */
  function makePlan(L, lv, id) {
    const n = L.rounds, k = n - L.inTune;
    let slots = shuffle(Array.from({length: n}, (_, i) => i < L.inTune));
    if (lv === 1 && slots[0]) slots = slots.slice(1).concat(true);
    const vals = shuffle(Array.from({length: L.cents[1] - L.cents[0] + 1}, (_, i) => L.cents[0] + i)).slice(0, k);
    const more = Math.random() < .5 ? 1 : -1;               // the odd one out: sharp or flat, at random
    const signs = shuffle(Array.from({length: k}, (_, i) => i < Math.ceil(k / 2) ? more : -more));
    const offsets = []; let j = 0;
    slots.forEach(inTune => offsets.push(inTune ? 0 : signs[j] * vals[j++]));
    const pool = T.notesFor(id, L.notes), used = new Set();
    return offsets.map(off => {
      const sg = Math.sign(off);
      const fresh = shuffle(pool).filter(m => !used.has(m + '|' + sg));
      const midi = fresh.length ? fresh[0] : pool[rnd(pool.length)];
      used.add(midi + '|' + sg);
      return {midi, offset: off};
    });
  }
  function nextRound(first) {
    const p = G.plan[G.i], id = ID();
    G.r = {midi: p.midi, offset: p.offset, f: T.midiFreq(p.midi), judged: null, right: null, heardAt: null, firstMove: null, wrongWay: false,
      written: T.writtenLabel(id, p.midi), writtenOct: T.writtenLabel(id, p.midi, true), concert: T.concertLabel(p.midi), refPlays: 0};
    G.d = 0; G.sounding = false; G.togetherOn = false;
    $('hudCount').textContent = `${G.i + 1} / ${G.n}`;
    $('noteLine').textContent = `Your note: ${G.r.written} (concert ${G.r.concert})`;
    $('prompt').textContent = 'Listen…';
    $('judged').hidden = true; $('wrongWay').hidden = true;
    $('feedback').hidden = true; $('controls').hidden = true; $('judgePanel').hidden = false;
    G.phase = 'hear';
    draw();
    later(first ? 700 : 350, () => hear());                 // after the menu music has faded on the first
  }

  /* HEAR: the reference (refSec), a gap, then the instrument note (noteSec); then JUDGE */
  function hear() {
    if (!G || G.paused) return;
    W.stopAll();
    G.r.refPlays++;
    $('prompt').textContent = 'Listen: the tuner\'s note…';
    $('stage').classList.remove('sounding');
    W.ref(G.r.f, {sec: RULES.refSec});
    later((RULES.refSec + RULES.gapSec) * 1000, () => {
      $('prompt').textContent = `…then the ${memberShort(ID())}.`;
      W.play(G.row.voice, fNow(), {sec: RULES.noteSec});
      $('stage').classList.add('sounding');
      later(RULES.noteSec * 1000, () => {
        $('stage').classList.remove('sounding');
        if (G.phase === 'hear') G.phase = 'judge';
        $('prompt').textContent = 'Is it sharp, flat or in tune?';
        draw();
      });
    });
  }
  function again() {
    if (!G || G.paused || G.phase !== 'judge' || !G.L.replay) return false;
    G.phase = 'hear'; draw(); hear();
    return true;
  }
  function togetherJudge() {
    if (!G || G.paused || G.phase !== 'judge' || !G.L.together) return false;
    W.stopAll();
    W.together(G.row.voice, fNow(), G.r.f, {sec: RULES.bothSec});
    return true;
  }

  /* JUDGE: SHARP · FLAT · IN TUNE */
  const truthOf = r => r.offset > 0 ? 'sharp' : r.offset < 0 ? 'flat' : 'tune';
  const WORD = {sharp: 'sharp: a little too high', flat: 'flat: a little too low', tune: 'in tune'};
  function judge(ans) {
    if (!G || G.paused || !(G.phase === 'judge' || G.phase === 'hear') || !WORD[ans]) return false;
    G.timers.forEach(clearTimeout); G.timers = []; W.stopAll(); $('stage').classList.remove('sounding');
    const r = G.r, truth = truthOf(r);
    r.judged = ans; r.right = ans === truth;
    A.Sfx.event(r.right ? 'note-hit' : 'note-wrong');
    if (truth === 'tune' && r.right) {                        // IN TUNE, and it was: full points, the round ends
      finishRound({cents: 0, leftAlone: true});
      return true;
    }
    const el = $('judged');
    el.className = 'p2-judged ' + (r.right ? 'right' : 'wrong');
    el.innerHTML = r.right ? `<span class="p2-mark" aria-hidden="true">✓</span> Yes: it was ${truth === 'sharp' ? 'sharp' : 'flat'}.`
      : truth === 'tune' ? `<span class="p2-mark" aria-hidden="true">✗</span> It was in tune. Don't move what's in tune: play it, then lock it in.`
      : `<span class="p2-mark" aria-hidden="true">✗</span> It was ${WORD[truth]}.`;
    el.hidden = false;
    G.phase = 'tune';
    $('judgePanel').hidden = true; $('controls').hidden = false;
    $('prompt').textContent = truth === 'sharp' ? 'Tune it: sharp → pull out (longer = lower)' : truth === 'flat' ? 'Tune it: flat → push in (shorter = higher)' : 'Leave it where it is';
    draw();
    return true;
  }

  /* TUNE: ▶ PLAY (the note at the setting now, held noteSec: a drag glides it), ▶ REFERENCE, ▶ TOGETHER */
  function playNote() {
    if (!canTune()) return false;
    clearTimeout(G.togTimer); G.togetherOn = false;
    W.start(G.row.voice, fNow());
    G.sounding = true; G.r.heardAt = G.d;                     // LOCK IN opens once the note is heard at this setting
    clearTimeout(G.playTimer);
    G.playTimer = setTimeout(() => { if (!G) return; W.stop(); G.sounding = false; draw(); }, RULES.noteSec * 1000);
    draw();
    return true;
  }
  function reference() {
    if (!canTune()) return false;
    W.ref(G.r.f, {sec: RULES.noteSec});
    return true;
  }
  function togetherTune() {
    if (!canTune() || !G.L.together) return false;
    clearTimeout(G.playTimer); W.stop(); G.sounding = false;
    W.together(G.row.voice, fNow(), G.r.f, {sec: RULES.bothSec});
    G.r.heardAt = G.d; G.togetherOn = true;
    clearTimeout(G.togTimer);
    G.togTimer = setTimeout(() => { if (G) { G.togetherOn = false; draw(); } }, RULES.bothSec * 1000);
    draw();
    return true;
  }

  /* ================= LOCK IN, and what the student hears and sees afterwards ================= */
  const fmtCents = c => { const r = Math.round(Math.abs(c)); return r === 0 ? 'Right on: 0 cents' : `${c > 0 ? '+' : MINUS}${r} cents ${c > 0 ? 'sharp' : 'flat'}`; };
  const tunePoints = c => Math.max(0, Math.round(SCORING.perfect - SCORING.perCent * Math.abs(c)));
  const pointsFor = (c, right) => (right ? SCORING.judge : 0) + tunePoints(c);
  /** stars for an average error (cents) and the judgments right */
  const starsFor = (avg, right) => { let s = 0; for (const [a, j] of SCORING.stars) { if (avg <= a + 1e-9 && right >= j) s++; else break; } return s; };
  function lock() {
    if (!lockReady()) return false;
    finishRound({cents: errNow()});
    return true;
  }
  function finishRound({cents, leftAlone = false}) {
    clearTimeout(G.playTimer); clearTimeout(G.togTimer);
    W.stopAll(); G.sounding = false; G.togetherOn = false;
    G.phase = 'feedback';
    const r = G.r, id = ID(), abs = Math.abs(cents);
    const res = {midi: r.midi, offset: r.offset, judged: r.judged, right: !!r.right, cents, abs, points: pointsFor(cents, r.right), d: G.d,
      exact: T.dFor(id, -r.offset), wrongWay: r.wrongWay, leftAlone, freq: r.f * Math.pow(2, cents / 1200), tf: r.f, written: r.writtenOct};
    G.results.push(res);
    G.score += res.points;
    $('hudScore').textContent = G.score;
    A.Sfx.sequence(['p2-lock', abs <= SCORING.bullseye && 'p2-star'].filter(Boolean), 60, {channel: GAME_ID});
    showFeedback(res);
    draw();
    later(500, () => hearBoth(res));
  }
  function meterSVG(c) {
    const X = v => 20 + (Math.max(-50, Math.min(50, v)) + 50) * 2.2, s3 = SCORING.stars[2][0], s2 = SCORING.stars[1][0];
    let s = `<svg class="p2-meter" viewBox="0 0 260 64" role="img" aria-label="Cents meter: ${esc(fmtCents(c))}">`;
    s += `<rect class="pm-zone z2" x="${X(-s2)}" y="14" width="${X(s2) - X(-s2)}" height="18" rx="3"/><rect class="pm-zone z3" x="${X(-s3)}" y="14" width="${X(s3) - X(-s3)}" height="18" rx="3"/>`;
    for (let v = -50; v <= 50; v += 10) s += `<line class="pm-tick${v === 0 ? ' mid' : ''}" x1="${X(v)}" y1="${v === 0 ? 8 : 12}" x2="${X(v)}" y2="${v === 0 ? 38 : 34}"/>`;
    s += `<text class="pm-l" x="20" y="56">flat</text><text class="pm-l" x="240" y="56" text-anchor="end">sharp</text><text class="pm-l" x="130" y="56" text-anchor="middle">0</text>`;
    const nx = X(c), off = Math.abs(c) > 50;
    s += `<path class="pm-needle${off ? ' off' : ''}" d="M${nx} 4L${nx - 6} -4H${nx + 6}Z M${nx - 1.5} 4H${nx + 1.5}V40H${nx - 1.5}Z"/>`;
    return s + '</svg>';
  }
  /* the reference (gold) and the note on a small staff, in the WRITTEN pitch and the member's clef */
  function staffFor(res) {
    const id = ID(), n = T.spellWritten(id, res.midi), ok = res.abs <= SCORING.stars[2][0], close = res.abs <= SCORING.stars[0][0];
    return A.staffSVG(T.clefOf(id), [
      {n, x: 140, color: '#c98a12', caption: 'Tuner'},
      {n, x: 250, color: ok ? '#1f8a5a' : close ? '#2a6fb0' : '#d0503f', caption: 'You'},
    ], {width: 320, label: `Written ${res.written}: ${fmtCents(res.cents)}`});
  }
  function spotLine(res) {
    if (res.leftAlone) return 'Right: leave it alone!';
    if (res.abs <= SCORING.bullseye) return 'Right there!';
    return `The exact spot was a little further ${res.exact > res.d ? 'OUT' : 'IN'}.`;
  }
  function showFeedback(res) {
    const last = G.i + 1 >= G.n, bull = res.abs <= SCORING.bullseye;
    $('controls').hidden = true; $('judgePanel').hidden = true; $('wrongWay').hidden = true;
    if (res.leftAlone) {
      const el = $('judged'); el.className = 'p2-judged right'; el.innerHTML = '<span class="p2-mark" aria-hidden="true">✓</span> Yes: it was in tune.'; el.hidden = false;
    }
    $('prompt').textContent = res.right ? 'Nice ears!' : 'Good tuning work. Listen again:';
    const fb = $('feedback');
    fb.innerHTML = `<div class="p2-fb-one${bull ? ' bull' : ''}">
        <p class="p2-fb-note">Written ${esc(res.written)} · ${res.right ? 'judged right' : 'judged wrong'}</p>
        <p class="p2-err">${esc(fmtCents(res.cents))}${bull ? ' <span class="p2-bull">Bullseye!</span>' : ''}</p>
        <p class="p2-spot" id="spotMsg">${esc(spotLine(res))}</p>
        ${res.offset === 0 && !res.leftAlone ? '<p class="p2-tip" id="leaveTip">It was in tune from the start. Don\'t move what\'s in tune!</p>' : ''}
        ${meterSVG(res.cents)}
        <div class="p2-fb-staff">${staffFor(res)}</div>
      </div>
      <div class="acts p2-fb-acts"><button type="button" class="btn btn-secondary" id="bothBtn">▶ Hear both</button><button type="button" class="btn btn-primary" id="nextBtn">${last ? 'See results' : 'Next'}</button></div>`;
    fb.hidden = false;
    $('bothBtn').onclick = () => hearBoth(res);
    $('nextBtn').onclick = () => next();
    $('nextBtn').focus({preventScroll: true});
    fb.scrollIntoView({block: 'nearest', behavior: 'auto'});
  }
  /* the tuned note and the reference TOGETHER, so the difference is heard */
  function hearBoth(res) {
    if (!G || G.paused || G.phase !== 'feedback') return;
    if (G.both) G.both.cancel();
    W.stopAll();
    W.together(G.row.voice, res.freq, res.tf, {sec: RULES.bothSec});
    const stage = $('stage');
    stage.classList.add('sounding');
    const timer = setTimeout(() => stage.classList.remove('sounding'), RULES.bothSec * 1000);
    G.both = {cancel() { clearTimeout(timer); W.stopAll(); stage.classList.remove('sounding'); }};
  }
  function next() {
    if (!G || G.phase !== 'feedback') return;
    stopRound();
    G.i++;
    if (G.i >= G.n) finish(); else nextRound(false);
  }

  /* ================= RESULTS ================= */
  function finish() {
    const g = G;
    g.phase = 'done';
    $('stage').classList.remove('sounding');
    const avg = g.results.reduce((s, r) => s + r.abs, 0) / Math.max(1, g.results.length);
    const right = g.results.filter(r => r.right).length;
    const stars = starsFor(avg, right), prev = prog(g.lv), newBest = g.score > (prev.best || 0);
    A.store.setLevel(GAME_ID, 'all', g.lv, {stars: Math.max(stars, prev.stars || 0), best: Math.max(g.score, prev.best || 0)}, stars);
    pause.setActive(false);
    const best = g.results.reduce((m, r) => Math.min(m, r.abs), 1e9);
    const [s1, s2, s3] = SCORING.stars, n = g.results.length;
    A.UI.results.show({gameId: GAME_ID, stars,
      hero: `<div class="p2-res-art" aria-hidden="true">${ART.svg(g.row.art, {mini: true})}</div>`,
      title: stars === 3 ? 'Perfect pitch!' : stars ? 'Level cleared' : 'Almost there!',
      msg: stars === 3 ? 'Sharp, flat or in tune: your ears knew every time.'
        : stars === 2 ? `For 3 stars: every judgment right and the average under ${s3[0]} cents.`
        : stars === 1 ? `For 2 stars: ${s2[1]} of ${n} judgments right and the average under ${s2[0]} cents.`
        : `To clear this level: ${s1[1]} of ${n} judgments right and the average under ${s1[0]} cents. Play them TOGETHER and listen for the wah-wah-wah!`,
      tiles: [['Judgments', `${right} of ${n} right`], ['Average', `${avg.toFixed(1)} cents`], ['Closest', `${Math.round(best)} cents`],
        ['Wrong-way starts', String(g.wrongWay)], ['Score', g.score]],
      newBest: newBest && !!prev.best,
      best: prev.best ? (newBest ? `Best: ${g.score} (was ${prev.best})` : `Best: ${Math.max(prev.best, g.score)}`) : '',
      next: {label: 'Next level', hidden: !(g.lv < LEVELS.length && (stars > 0 || A.DEMO)), onClick: () => begin(g.lv + 1)},
      retry: {label: 'Try again', onClick: () => begin(g.lv)},
      levels: {label: 'Levels', onClick: () => showHub()}});
    g.avg = avg; g.stars = stars; g.right = right;
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > (prev.stars || 0) && 'star-earned', newBest && prev.best && 'new-high-score'].filter(Boolean), 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
  }

  /* ================= THE PAUSE MENU: every sound stops (and when the page hides) ================= */
  const pause = A.UI.pause.mount({
    onPause() {
      if (!G) return;
      G.paused = true;
      if (G.phase === 'hear') { G.timers.forEach(clearTimeout); G.timers = []; G.replay = true; }   // cut short: heard again, free, on RESUME
      clearTimeout(G.playTimer); clearTimeout(G.togTimer);
      if (G.both) G.both.cancel();
      G.sounding = false; G.togetherOn = false;
      W.stopAll();
      draw();
    },
    onResume() {
      if (!G || !G.paused) return;
      G.paused = false;
      if (G.phase === 'hear' && G.replay) { G.replay = false; G.r.refPlays = Math.max(0, G.r.refPlays - 1); hear(); }
      draw();
    },
    onRestart() { const lv = G ? G.lv : 1; startLevel(lv); },
    onLevels() { showHub(); },
    canPause: () => !!G && G.phase !== 'done',
    info: () => G ? [['Round', `${Math.min(G.i + 1, G.n)} / ${G.n}`], ['Score', G.score]] : [],
  });
  addEventListener('pagehide', () => W.stopAll());

  /* ================= THE KEYBOARD ================= */
  document.addEventListener('keydown', e => {
    if (!G || G.paused || document.body.classList.contains('ui-modal') || e.ctrlKey || e.metaKey || e.altKey) return;
    // after LOCK IN a focused, visible button (HEAR BOTH) takes its own Enter; while playing, Enter is the game's key
    const k = e.key, onBtn = !!e.target && /^(BUTTON|A|INPUT)$/.test(e.target.tagName) && e.target.getClientRects().length > 0;
    if (A.DEMO && (k === 'a' || k === 'A')) { e.preventDefault(); api.auto(); return; }
    if (A.DEMO && (k === 'w' || k === 'W')) { e.preventDefault(); api.wrong(); return; }
    if (G.phase === 'feedback') {
      if (k === 'Enter' && !onBtn) { e.preventDefault(); next(); }
      return;
    }
    if (G.phase === 'judge' || G.phase === 'hear') {
      const ans = {s: 'sharp', S: 'sharp', ArrowUp: 'sharp', f: 'flat', F: 'flat', ArrowDown: 'flat', i: 'tune', I: 'tune', Enter: 'tune'}[k];
      if (ans) { e.preventDefault(); if (G.phase === 'judge') judge(ans); }
      else if (k === 'r' || k === 'R') { e.preventDefault(); again(); }
      else if (k === 't' || k === 'T') { e.preventDefault(); togetherJudge(); }
      return;
    }
    if (G.phase !== 'tune') return;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {               // the mechanism moves the way the arrow points on the drawing
      e.preventDefault();
      const right = k === 'ArrowRight', out = (art().outDir > 0) === right;
      nudge((out ? -1 : 1) * (e.shiftKey ? RULES.fineCents : RULES.arrowCents));
    } else if (k === ' ') { e.preventDefault(); if (!e.repeat) playNote(); }                // (P is the arcade's pause key)
    else if (k === 'r' || k === 'R') { e.preventDefault(); reference(); }
    else if (k === 't' || k === 'T') { e.preventDefault(); togetherTune(); }
    else if (k === 'Enter') { e.preventDefault(); lock(); }
  });
  // Space while tuning is always PLAY, never a click on the focused button (browsers click a button on Space's keyup)
  document.addEventListener('keyup', e => { if (e.key === ' ' && G && G.phase === 'tune' && !document.body.classList.contains('ui-modal')) e.preventDefault(); });
  ['judgeSharp', 'judgeFlat', 'judgeTune'].forEach(id => $(id).addEventListener('click', () => judge($(id).dataset.a)));
  $('againBtn').addEventListener('click', () => again());
  $('togetherBtn').addEventListener('click', () => togetherJudge());
  $('nudgeDown').addEventListener('click', () => nudge(-RULES.nudgeCents));
  $('nudgeUp').addEventListener('click', () => nudge(RULES.nudgeCents));
  $('playBtn').addEventListener('click', () => playNote());
  $('refBtn').addEventListener('click', () => reference());
  $('bothTuneBtn').addEventListener('click', () => togetherTune());
  $('lockBtn').addEventListener('click', () => lock());

  /* ================= TESTS and ?demo ================= */
  /** judge right, then set the mechanism exactly (+ cents: that far off) and count it as heard */
  function tuneTo(off, ans) {
    if (!G || G.paused) return false;
    if (G.phase === 'hear' || G.phase === 'judge') judge(ans || truthOf(G.r));
    if (G.phase !== 'tune') return G.phase === 'feedback';
    G.d = T.clampD(ID(), T.dFor(ID(), off - G.r.offset));
    G.r.heardAt = G.d;                                         // the demo stands in for playing it (A + Enter locks in)
    if (G.sounding) W.setFreq(fNow());
    draw();
    return true;
  }
  const wrongAnswer = r => ({sharp: 'flat', flat: 'sharp', tune: 'sharp'}[truthOf(r)]);
  const api = A.PerfectPitch = {
    state() {
      const base = {tune, picker: !!picker};
      if (!G) return Object.assign(base, {phase: 'hub'});
      const L = G.L, r = G.r;
      return Object.assign(base, {lv: G.lv, phase: G.phase, i: G.i, n: G.n, paused: G.paused, score: G.score, prompt: $('prompt').textContent,
        d: G.d, freq: r ? fNow() : null, cents: r ? errNow() : null, sounding: !!G.sounding, lockEnabled: !$('lockBtn').disabled, wrongWay: G.wrongWay,
        flags: {cents: L.cents.slice(), inTune: L.inTune, notes: L.notes, replay: !!L.replay, together: !!L.together, needle: !!L.needle},
        target: r ? {midi: r.midi, offset: r.offset, freq: r.f, written: r.writtenOct, concert: r.concert, clef: T.clefOf(G.tune), judged: r.judged, right: r.right,
          firstMove: r.firstMove, wrongWay: r.wrongWay, heardAt: r.heardAt, refPlays: r.refPlays} : null,
        plan: G.plan.map(p => Object.assign({}, p)), results: G.results.slice(), stars: G.stars, avg: G.avg, right: G.right});
    },
    begin: lv => startLevel(lv),
    intro: lv => begin(lv),
    pick: id => pick(id),
    openPicker: () => openPicker(),
    judge: a => judge(a),
    setPull: mm => setPull(mm),
    nudge: c => nudge(c),
    play: () => playNote(),
    reference: () => reference(),
    together: () => G && (G.phase === 'tune' ? togetherTune() : togetherJudge()),
    again: () => again(),
    auto: () => tuneTo(0),
    wrong: () => G ? tuneTo(G.r.offset < 0 ? -30 : 30, wrongAnswer(G.r)) : false,
    lock: () => lock(),
    next: () => next(),
    starsFor, pointsFor, showHub,
  };

  drawTuneRow();
  showHub();
})(window.Arcade);
