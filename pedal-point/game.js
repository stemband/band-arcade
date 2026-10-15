/* PEDAL POINT: tune the timpani by ear (docs/games/pedal-point.md).
   The game plays a REFERENCE (a pitch pipe); the student strikes a virtual timpani and works its PEDAL (and the fine
   tuner) until the drum matches, then LOCKS IN and is scored on how close it got, in cents. NO MICROPHONE AT ALL
   (no pitch.js on this page): every sound is the game's own (timpani.js), so the score is exact.
     drums.js   THE DRUMS (sizes, ranges, the pedal's math) · timpani.js  THE SOUND (Arcade.Timpani)
     levels.js  THE LEVELS, THE SCORING, the keys and reference pitches
   Progress: setLevel('pedal-point', 'all', level, {stars, best}) (games.js player: 'all': no instrument). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'pedal-point';
  const LEVELS = window.PP_LEVELS, SCORING = window.PP_SCORING, RULES = window.PP_RULES, KEYS = window.PP_KEYS, REFS = window.PP_REFS;
  const D = A.PPDrums, T = A.Timpani;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const rnd = n => Math.floor(Math.random() * n);
  const pickOne = a => a[rnd(a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const IV_NAME = {5: 'fourth', 7: 'fifth', 12: 'octave'};
  const MINUS = '−';

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Timpani'});
  $('demoHelp').hidden = !A.DEMO;

  /* saved: gameData('pedal-point') = {hpTip: the headphones tip was shown, gaugeLesson: "gauges drift" was said} */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };

  /* ================= THE LEVEL SELECT ================= */
  const prog = lv => A.store.level(GAME_ID, 'all', lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0;
  const KETTLE_ICON = '<svg viewBox="0 0 40 30" aria-hidden="true"><path class="pk-bowl" d="M3 8Q5 25 20 28Q35 25 37 8Z"/><ellipse class="pk-head" cx="20" cy="8" rx="17" ry="4.5"/></svg>';
  function showHub() {
    stopRound(); G = null;
    A.Sfx.gameMenuMusic(GAME_ID);
    pause.setActive(false); A.UI.results.hide(); A.UI.intro.hide();
    $('play').hidden = true; $('hub').hidden = false;
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = prog(lv), open = unlocked(i);
      return `<button class="lvl" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini">${KETTLE_ICON}</span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${esc(L.idea)}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : L.rounds + (L.kind === 'keys' ? ' keys' : ' tunings')}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), unlocked,
      label: i => `Level ${i + 1} · ${LEVELS[i].name}`});
  }

  /* THE LEVEL INTRO (shared/ui-kit.js): the level's idea; the first level without the gauge also says once that
     gauges drift */
  function begin(lv) {
    A.UI.results.hide();
    const L = LEVELS[lv - 1];
    const lesson = !L.gauge && !gd().gaugeLesson;
    if (lesson) save({gaugeLesson: true});
    A.UI.intro.show({theme: 'pp-intro', kicker: `Level ${lv}`, title: L.name, text: esc(L.say),
      hero: `<div class="pp-intro-kettle" aria-hidden="true">${kettleSVG(29)}</div>`,
      extra: lesson ? '<p class="pp-lesson" id="gaugeLesson"><b>The gauge is gone. Gauges drift: trust your ear.</b> A real timpani\'s gauge slips as the head stretches and the room warms up, so timpanists check every note by ear.</p>' : '',
      go: {label: 'Let\'s tune!', onClick: () => startLevel(lv)},
      back: {label: 'Levels', onClick: () => showHub()}});
  }

  /* ================= THE STAGE: the kettles, their gauges and pedals ================= */
  function kettleSVG(size) {
    return `<svg class="pp-kettle-svg" viewBox="0 0 120 96" aria-hidden="true">` +
      `<path class="pp-strut" d="M30 78L22 94M90 78L98 94M60 86V95"/>` +
      `<path class="pp-bowl" d="M6 22Q9 72 60 88Q111 72 114 22Z"/>` +
      `<path class="pp-shine" d="M18 30Q24 62 48 76"/>` +
      `<g class="pp-headg"><ellipse class="pp-head" cx="60" cy="22" rx="56" ry="13"/><ellipse class="pp-spot" cx="60" cy="22" rx="10" ry="3"/></g>` +
      `<ellipse class="pp-hoop" cx="60" cy="22" rx="57" ry="14"/>` +
      `<text class="pp-size" x="60" y="62" text-anchor="middle">${size}"</text></svg>`;
  }
  function buildStage(L) {
    G.drums = L.drums.map((id, i) => ({i, d: D.byId(id), pedal: 0.5, fine: 0, enabled: false}));
    const showRange = L.kind === 'pick';
    $('drums').innerHTML = G.drums.map(x => `<div class="pp-drum" data-i="${x.i}" style="--pp-size:${(0.76 + (x.d.id - 23) / 9 * 0.24).toFixed(3)}">
        <button type="button" class="pp-kettle" data-i="${x.i}" aria-label="${x.d.id} inch drum: tap it">${kettleSVG(x.d.id)}</button>
        <div class="pp-gauge" ${L.gauge ? '' : 'hidden'} aria-label="Gauge"><b>–</b></div>
        ${showRange ? `<div class="pp-range">${D.label(x.d.lowMidi)}–${D.label(x.d.highMidi)}</div>` : ''}
        <div class="pp-pedal" data-i="${x.i}" role="slider" tabindex="-1" aria-label="${x.d.id} inch drum pedal" aria-valuemin="0" aria-valuemax="100">
          <span class="pp-toe" aria-hidden="true">Toe ▲</span><span class="pp-track" aria-hidden="true"><span class="pp-plate"></span></span><span class="pp-heel" aria-hidden="true">Heel ▼</span>
        </div>
      </div>`).join('');
    $('stage').classList.toggle('pp-n1', G.drums.length === 1);
    $('fine').hidden = !L.fine;
    A.holdGuard($('drums'), {lock: true});
    A.holdGuard($('fine'), {lock: true});
    $('drums').querySelectorAll('.pp-kettle').forEach(b => b.addEventListener('click', () => kettleTap(+b.dataset.i)));
    $('drums').querySelectorAll('.pp-pedal').forEach(p => dragPedal(p, +p.dataset.i));
  }
  const drumEl = i => $('drums').querySelector(`.pp-drum[data-i="${i}"]`);
  const freqOf = i => { const x = G.drums[i]; return D.freqAt(x.d, x.pedal, x.fine); };
  function drawDrum(i) {
    const x = G.drums[i], el = drumEl(i); if (!el) return;
    el.classList.toggle('on', G.active === i);
    el.classList.toggle('rest', !x.enabled && G.phase !== 'pick');
    el.classList.toggle('cursor', G.phase === 'pick' && G.cursor === i);
    el.querySelector('.pp-plate').style.setProperty('--p', x.pedal.toFixed(4));
    const pd = el.querySelector('.pp-pedal');
    pd.setAttribute('aria-valuenow', Math.round(x.pedal * 100)); pd.setAttribute('aria-valuetext', `Pedal ${Math.round(x.pedal * 100)}% toe down`);
    pd.setAttribute('aria-disabled', x.enabled ? 'false' : 'true');
    pd.tabIndex = G.active === i ? 0 : -1;
    const g = el.querySelector('.pp-gauge b'); if (g) g.textContent = D.gauge(x.d, x.pedal, x.fine);
  }
  function drawFine() {
    const x = G && G.drums[G.active];
    const f = x ? x.fine : 0;
    $('fineT').style.setProperty('--f', (f / D.FINE).toFixed(3));
    $('fineTrack').setAttribute('aria-valuenow', Math.round(f));
    $('fineTrack').setAttribute('aria-valuetext', `${f > 0 ? '+' : f < 0 ? MINUS : ''}${Math.abs(Math.round(f))} cents`);
    ['fineDown', 'fineUp', 'fineTrack'].forEach(id => $(id).classList.toggle('off', !x || !x.enabled));
  }
  const drawAll = () => { if (!G || !G.drums) return; G.drums.forEach((x, i) => drawDrum(i)); drawFine(); };

  /* THE PEDAL: toe down (up the screen) = higher, heel down = lower; the drag moves it from where it is */
  function dragPedal(el, i) {
    let start = null;
    el.addEventListener('pointerdown', e => {
      if (!canTune() || !G.drums[i].enabled) return;
      e.preventDefault();
      setActive(i);
      const tr = el.querySelector('.pp-track').getBoundingClientRect();
      start = {y: e.clientY, p: G.drums[i].pedal, h: Math.max(60, tr.height), id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('held');
    });
    el.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id || !canTune()) return;
      setPedal(i, start.p - (e.clientY - start.y) / start.h);
    });
    const end = e => { if (start && e.pointerId === start.id) { start = null; el.classList.remove('held'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  /* THE FINE TUNER: the T-handle turns as it is dragged sideways; − / + step it */
  (function fineTuner() {
    const el = $('fineTrack');
    let start = null;
    el.addEventListener('pointerdown', e => {
      if (!canTune() || !G.drums[G.active] || !G.drums[G.active].enabled) return;
      e.preventDefault();
      start = {x: e.clientX, f: G.drums[G.active].fine, id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('held');
    });
    el.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id || !canTune()) return;
      setFine(G.active, start.f + (e.clientX - start.x) / RULES.finePx);
    });
    const end = e => { if (start && e.pointerId === start.id) { start = null; el.classList.remove('held'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
    $('fineDown').addEventListener('click', () => { if (canTune() && G.drums[G.active]) setFine(G.active, G.drums[G.active].fine - RULES.fineStep); });
    $('fineUp').addEventListener('click', () => { if (canTune() && G.drums[G.active]) setFine(G.active, G.drums[G.active].fine + RULES.fineStep); });
  })();

  function setPedal(i, p) {
    const x = G && G.drums[i]; if (!x || !x.enabled || G.phase !== 'tune') return;
    x.pedal = Math.max(0, Math.min(1, p));
    T.setFreq(i, freqOf(i));                                // a ringing drum glides with the pedal
    drawDrum(i);
  }
  function setFine(i, c) {
    const x = G && G.drums[i]; if (!x || !x.enabled || G.phase !== 'tune') return;
    x.fine = Math.max(-D.FINE, Math.min(D.FINE, c));
    T.setFreq(i, freqOf(i));
    drawDrum(i); drawFine();
  }
  function setActive(i) {
    if (!G || !G.drums[i] || !G.drums[i].enabled) return;
    G.active = i; drawAll();
  }
  const canTune = () => !!G && !G.paused && G.phase === 'tune';

  /* a tap on a kettle: choose it (PICK YOUR DRUM) or make it the active drum, and a tuning tap */
  function kettleTap(i) {
    if (!G || G.paused) return;
    if (G.phase === 'pick') return pick(i);
    if (G.phase !== 'tune' || !G.drums[i].enabled) return;
    setActive(i); strike(true);
  }
  function strike(soft) {
    if (!canTune() || G.active == null) return false;
    const ok = T.strike(G.active, freqOf(G.active), {soft});
    const el = drumEl(G.active);
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); clearTimeout(el._hitT); el._hitT = setTimeout(() => el.classList.remove('hit'), 700); }
    return ok;
  }

  /* ================= PLAYING A LEVEL ================= */
  let G = null;
  function startLevel(lv) {
    stopRound();
    A.LevelSelect.played(lv - 1);
    A.Sfx.gameMenuMusic(GAME_ID, false);                     // the menu music fades out: tuning needs quiet
    const L = LEVELS[lv - 1];
    G = {lv, L, i: 0, n: L.rounds, results: [], score: 0, used: [], late: 0, paused: false, phase: 'wait', active: null, cursor: 0,
         keyOrder: shuffle(KEYS.map((k, j) => j)), timers: []};
    A.UI.results.hide(); A.UI.intro.hide();
    $('hub').hidden = true; $('play').hidden = false;
    pause.setActive(true);
    $('hudLevelLabel').textContent = `Level ${lv}`; $('hudLevelName').textContent = L.name; $('hudScore').textContent = '0';
    buildStage(L);
    window.scrollTo(0, 0);
    if (!gd().hpTip) { save({hpTip: true}); A.UI.toast('Headphones help: these drums are LOW.', {ms: 5000, kind: 'pp-tip'}); }
    nextRound(true);
  }
  function later(ms, fn) { const t = setTimeout(() => { G && (G.timers = G.timers.filter(x => x !== t)); fn(); }, ms); if (G) G.timers.push(t); return t; }
  function stopRound() {
    T.stopAll();
    if (G) { G.timers.forEach(clearTimeout); G.timers = []; cancelAnimationFrame(G.countRaf); if (G.both) G.both.cancel(); }
  }

  /* THE ROUND MAKER: every level's targets (random in the drums' comfortable middles, never repeated in a level) */
  const comfyMidis = d => { const out = []; for (let m = d.lowMidi + d.comfy; m <= d.highMidi - d.comfy; m++) out.push(m); return out; };
  /** the drum (index in `drums`) a pitch sits best on: in its comfortable middle, nearest the middle of the range */
  function bestDrum(drums, midi) {
    let best = -1, dist = 1e9;
    drums.forEach((x, i) => { const d = x.d || x; if (!D.comfy(d, midi)) return; const c = Math.abs(midi - (d.lowMidi + d.highMidi) / 2); if (c < dist) { dist = c; best = i; } });
    return best;
  }
  /** an interval round: reference + interval, landing on a drum (null if it doesn't fit any) */
  function intervalTarget(drums, refMidi, iv) {
    const t = refMidi + iv, di = bestDrum(drums, t);
    return di < 0 ? null : {midi: t, di};
  }
  function makeRound(L) {
    const used = G.used, drums = G.drums, free = m => !used.includes(m);
    const r = {targets: [], refMidi: null, refPlays: 0, kind: L.kind};
    if (L.kind === 'match' || L.kind === 'pick') {
      let pool = [];
      drums.forEach(x => comfyMidis(x.d).forEach(m => { if (!pool.includes(m)) pool.push(m); }));
      const fresh = pool.filter(free); pool = fresh.length ? fresh : pool;
      const m = pickOne(pool);
      r.targets = [{midi: m, di: L.kind === 'pick' ? null : bestDrum(drums, m)}];
      r.refMidi = m;
    } else if (L.kind === 'interval') {
      for (let k = 0; k < 400 && !r.targets.length; k++) {
        const ref = D.midiOf(pickOne(REFS)), iv = pickOne(L.ivs), t = intervalTarget(drums, ref, iv);
        if (t && (free(t.midi) || k > 300)) { r.targets = [t]; r.refMidi = ref; r.iv = iv; }
      }
    } else if (L.kind === 'keys') {
      const K = KEYS[G.keyOrder[G.i % G.keyOrder.length]];
      r.key = K;
      r.targets = ['tonic', 'dominant'].map(part => ({midi: D.midiOf(K[part].note), di: drums.findIndex(x => x.d.id === K[part].drum), part}));
      r.refMidi = D.midiOf(K.ref);
    } else if (L.kind === 'change') {
      for (let k = 0; k < 400 && !r.targets.length; k++) {
        const di = rnd(drums.length), ms = comfyMidis(drums[di].d), from = pickOne(ms);
        const step = L.steps[0] + rnd(L.steps[1] - L.steps[0] + 1), to = from + (Math.random() < .5 ? -step : step);
        if (!ms.includes(to) || (!free(to) && k < 300)) continue;
        r.targets = [{midi: to, di}]; r.from = from; r.refMidi = to;
      }
    }
    r.targets.forEach(t => { t.f = D.freq(t.midi); used.push(t.midi); });
    return r;
  }
  const letter = m => D.label(m, false);
  function promptFor(L, r) {
    const t = r.targets[0], dn = t.di != null && G.drums[t.di] ? G.drums[t.di].d.name : '';
    switch (L.kind) {
      case 'match': return L.named ? `Tune the ${dn} drum to ${D.label(t.midi)}` : `Tune the ${dn} drum to the pitch pipe`;
      case 'pick': return t.di == null ? `${D.label(t.midi)}: which drum can play it? Tap it.` : `Tune the ${dn} drum to ${D.label(t.midi)}`;
      case 'interval': {
        const way = r.iv < 0 ? 'below' : 'above', nm = IV_NAME[Math.abs(r.iv)], art = Math.abs(r.iv) === 12 ? 'an' : 'a';
        return L.named ? `Tune the ${dn} drum to the ${letter(t.midi)} ${art} ${nm} ${way} this ${letter(r.refMidi)}`
          : `Tune the ${dn} drum ${art} ${nm} ${way} this ${letter(r.refMidi)}`;
      }
      case 'keys': {
        const [a, b] = r.targets;
        return `Key of ${r.key.key}: tune ${letter(a.midi)} on the ${G.drums[a.di].d.name} and ${letter(b.midi)} on the ${G.drums[b.di].d.name}`;
      }
      case 'change': return `Change ${letter(r.from)} to ${letter(t.midi)} in ${L.bars} bars`;
    }
    return '';
  }

  function nextRound(first) {
    const L = G.L;
    G.r = makeRound(L);
    G.phase = L.kind === 'pick' ? 'pick' : 'tune';
    G.cursor = 0;
    // every drum rests, except the round's own; each target drum starts well away from its target
    G.drums.forEach(x => { x.enabled = false; });
    G.r.targets.forEach(t => { if (t.di != null) startDrum(t); });
    G.active = G.r.targets[0].di;
    $('hudCount').textContent = `${G.i + 1} / ${G.n}`;
    $('prompt').textContent = promptFor(L, G.r);
    $('feedback').hidden = true; $('controls').hidden = false;
    $('count').hidden = L.kind !== 'change';
    if (L.kind === 'change') drawCount(0);
    refButton();
    drawAll();
    // the reference plays by itself at the start of every round (after the menu music has faded on the first)
    later(first ? 700 : 350, () => playRef());
  }
  function startDrum(t) {
    const x = G.drums[t.di];
    x.enabled = true; x.fine = 0;
    if (G.L.kind === 'change') { x.pedal = D.pedalFor(x.d, G.r.from); return; }   // QUICK CHANGE: exactly on the old note
    const want = D.pedalFor(x.d, t.midi), away = RULES.startAway / x.d.span;
    let p = Math.random();
    for (let k = 0; k < 30 && Math.abs(p - want) < away; k++) p = Math.random();
    if (Math.abs(p - want) < away) p = want > .5 ? 0 : 1;
    x.pedal = p;
  }

  /* PICK YOUR DRUM: a drum whose range has the note; the wrong one only costs time */
  function pick(i) {
    if (!G || G.phase !== 'pick' || G.paused) return false;
    const t = G.r.targets[0], x = G.drums[i];
    if (!x) return false;
    G.cursor = i;
    if (!D.inRange(x.d, t.midi)) {
      const el = drumEl(i);
      A.UI.toast('That note is out of this drum\'s range', {near: el, kind: 'pp-wrong'});
      G.wrongPicks = (G.wrongPicks || 0) + 1;
      if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
      A.Sfx.event('note-wrong');
      drawAll();
      return false;
    }
    t.di = i; G.phase = 'tune'; startDrum(t); G.active = i;
    $('prompt').textContent = promptFor(G.L, G.r);
    A.Sfx.event('ui-toggle');
    drawAll(); strike(true);
    return true;
  }

  /* THE REFERENCE: the pitch pipe. 'any' = replay any time; 'once' = the round's first play only */
  const refAllowed = () => !!G && !!G.r && (G.L.ref === 'any' || G.r.refPlays < 1);
  function refButton() {
    const b = $('refBtn');
    b.hidden = G.L.ref === 'once';
    b.disabled = !refAllowed();
  }
  function playRef() {
    if (!G || G.paused || !G.r || !refAllowed() || (G.phase !== 'tune' && G.phase !== 'pick')) return false;
    if (G.pipe) G.pipe.stop();
    G.r.refPlays++;
    const p = T.pipe(D.freq(G.r.refMidi), {sec: RULES.pipeSec});
    G.pipe = p;
    $('refBtn').classList.toggle('playing', !!p);
    const done = () => {
      if (G && G.pipe === p) G.pipe = null;
      $('refBtn').classList.remove('playing');
      if (!G) return;
      if (G.paused) { if (G.L.ref === 'once' && G.r.refPlays === 1) { G.r.refPlays = 0; G.r.replay = true; } return; }   // heard again, free, on RESUME
      if (G.L.kind === 'change' && G.phase === 'tune' && !G.countStart) startCount();
    };
    if (p) p.onEnd = done; else done();
    refButton();
    return !!p;
  }

  /* QUICK CHANGE: the bars of rest, counted; the downbeat judges the drum where it is */
  function startCount() {
    const L = G.L;
    G.beatMs = 60000 / L.tempo; G.countMs = L.bars * L.beats * G.beatMs;
    G.countStart = performance.now(); G.lastBeat = -1;
    tickCount();
  }
  function drawCount(ms) {
    const L = G.L, beats = L.bars * L.beats, b = G.beatMs ? Math.min(beats, Math.floor(ms / G.beatMs)) : -1;
    $('countBar').innerHTML = Array.from({length: L.bars}, (_, bar) => `<span class="pp-barbox${G.beatMs && b >= bar * L.beats && b < (bar + 1) * L.beats ? ' now' : ''}"><small>${bar + 1}</small>${
      Array.from({length: L.beats}, (_, k) => `<i class="${G.beatMs && bar * L.beats + k <= b ? 'on' : ''}"></i>`).join('')}</span>`).join('');
    const left = G.countMs ? Math.max(0, 1 - ms / G.countMs) : 1;
    const bar = $('timer'); bar.firstElementChild.style.transform = `scaleX(${left})`; bar.classList.toggle('low', left < .3);
  }
  function tickCount() {
    cancelAnimationFrame(G.countRaf);
    const tick = () => {
      if (!G || G.paused || G.phase !== 'tune' || !G.countStart) return;
      const ms = performance.now() - G.countStart, beat = Math.floor(ms / G.beatMs);
      if (beat !== G.lastBeat && ms < G.countMs) { G.lastBeat = beat; A.Sfx.event('pp-count'); }
      drawCount(ms);
      if (ms >= G.countMs) return lock(true);
      G.countRaf = requestAnimationFrame(tick);
    };
    G.countRaf = requestAnimationFrame(tick);
  }

  /* ================= LOCK IN, and what the student hears and sees afterwards ================= */
  const fmtCents = c => { const r = Math.round(Math.abs(c)); return r === 0 ? 'Right on: 0 cents' : `${c > 0 ? '+' : MINUS}${r} cents ${c > 0 ? 'sharp' : 'flat'}`; };
  const pointsFor = c => Math.max(0, Math.round(SCORING.perfect - SCORING.perCent * Math.abs(c)));
  /** stars for an average error (cents); late = a QUICK CHANGE round missed the downbeat */
  const starsFor = (avg, late) => { const s = SCORING.stars.filter(x => avg <= x + 1e-9).length; return late ? Math.min(s, SCORING.lateStars) : s; };
  function lock(late = false) {
    if (!G || G.phase !== 'tune' || G.paused) return false;
    cancelAnimationFrame(G.countRaf);
    if (G.pipe) G.pipe.stop();
    G.phase = 'feedback';
    const res = G.r.targets.map(t => {
      const f = freqOf(t.di), c = D.cents(f, t.f), x = G.drums[t.di];
      return {target: t.midi, drum: x.d.id, freq: f, tf: t.f, cents: c, abs: Math.abs(c), points: pointsFor(c), midi: D.midiAt(x.d, x.pedal, x.fine), late};
    });
    G.results.push(...res);
    if (late) G.late++;
    G.score += res.reduce((s, x) => s + x.points, 0);
    $('hudScore').textContent = G.score;
    A.Sfx.sequence(['pp-lock', res.every(x => x.abs <= SCORING.bullseye) && 'pp-star'].filter(Boolean), 60, {channel: GAME_ID});
    showFeedback(res, late);
    drawAll();                                               // (nothing can be tuned now: canTune() needs the 'tune' phase)
    later(500, () => hearBoth(res));
    return true;
  }
  function meterSVG(c) {
    const X = v => 20 + (Math.max(-50, Math.min(50, v)) + 50) * 2.2, s3 = SCORING.stars[2], s2 = SCORING.stars[1];
    let s = `<svg class="pp-meter" viewBox="0 0 260 64" role="img" aria-label="Cents meter: ${esc(fmtCents(c))}">`;
    s += `<rect class="pm-zone z2" x="${X(-s2)}" y="14" width="${X(s2) - X(-s2)}" height="18" rx="3"/><rect class="pm-zone z3" x="${X(-s3)}" y="14" width="${X(s3) - X(-s3)}" height="18" rx="3"/>`;
    for (let v = -50; v <= 50; v += 10) s += `<line class="pm-tick${v === 0 ? ' mid' : ''}" x1="${X(v)}" y1="${v === 0 ? 8 : 12}" x2="${X(v)}" y2="${v === 0 ? 38 : 34}"/>`;
    s += `<text class="pm-l" x="20" y="56">flat</text><text class="pm-l" x="240" y="56" text-anchor="end">sharp</text><text class="pm-l" x="130" y="56" text-anchor="middle">0</text>`;
    const nx = X(c), off = Math.abs(c) > 50;
    s += `<path class="pm-needle${off ? ' off' : ''}" d="M${nx} 4L${nx - 6} -4H${nx + 6}Z M${nx - 1.5} 4H${nx + 1.5}V40H${nx - 1.5}Z"/>`;
    return s + '</svg>';
  }
  function staffFor(r) {
    const tn = D.spell(r.target), dn = D.spell(Math.round(r.midi));
    const ok = r.abs <= SCORING.stars[2], close = r.abs <= SCORING.stars[0];
    return A.staffSVG('bass', [
      {n: tn, x: 140, color: '#c98a12', caption: 'Target'},
      {n: dn, x: 250, color: ok ? '#1f8a5a' : close ? '#2a6fb0' : '#d0503f', caption: 'Drum'},
    ], {width: 320, label: `Target ${D.label(r.target)}, drum ${D.label(Math.round(r.midi))} ${fmtCents(r.cents)}`});
  }
  function showFeedback(res, late) {
    const last = G.i + 1 >= G.n;
    $('controls').hidden = true;
    const fb = $('feedback');
    fb.innerHTML = (late ? '<p class="pp-late" id="lateMsg">The downbeat came first! The drum was judged where it was.</p>' : '') +
      `<div class="pp-fb-row">${res.map(r => `<div class="pp-fb-one${r.abs <= SCORING.bullseye ? ' bull' : ''}">
          <p class="pp-fb-drum">${r.drum}" drum · target ${D.label(r.target)}</p>
          <p class="pp-err">${esc(fmtCents(r.cents))}${r.abs <= SCORING.bullseye ? ' <span class="pp-bull">Bullseye!</span>' : ''}</p>
          ${meterSVG(r.cents)}
          <div class="pp-fb-staff">${staffFor(r)}</div>
        </div>`).join('')}</div>
      <div class="acts pp-fb-acts"><button type="button" class="btn btn-secondary" id="bothBtn">▶ Hear both</button><button type="button" class="btn btn-primary" id="nextBtn">${last ? 'See results' : 'Next'}</button></div>`;
    fb.hidden = false;
    $('bothBtn').onclick = () => hearBoth(res);
    $('nextBtn').onclick = () => next();
    $('nextBtn').focus({preventScroll: true});
    fb.scrollIntoView({block: 'nearest', behavior: 'auto'});
  }
  /* the pitch pipe and the drum TOGETHER, so the difference is heard (one tuning after another) */
  function hearBoth(res) {
    if (!G || G.paused || G.phase !== 'feedback') return;
    if (G.both) G.both.cancel();
    T.stopAll();
    let k = 0, timer = 0, cancelled = false;
    const one = () => {
      if (cancelled || !G || G.phase !== 'feedback' || G.paused || k >= res.length) return;
      const r = res[k++];
      T.pipe(r.tf, {sec: RULES.bothSec, vol: .8});
      T.strike('both', r.freq, {soft: false});
      timer = setTimeout(one, (RULES.bothSec + .5) * 1000);
    };
    G.both = {cancel() { cancelled = true; clearTimeout(timer); }};
    one();
  }
  function next() {
    if (!G || G.phase !== 'feedback') return;
    stopRound();
    G.countStart = 0; G.beatMs = 0; G.countMs = 0;
    G.i++;
    if (G.i >= G.n) finish(); else nextRound(false);
  }

  /* ================= RESULTS ================= */
  function finish() {
    const g = G;
    g.phase = 'done';
    const avg = g.results.reduce((s, r) => s + r.abs, 0) / Math.max(1, g.results.length);
    const stars = starsFor(avg, g.late > 0), prev = prog(g.lv), newBest = g.score > (prev.best || 0);
    A.store.setLevel(GAME_ID, 'all', g.lv, {stars: Math.max(stars, prev.stars || 0), best: Math.max(g.score, prev.best || 0)}, stars);
    pause.setActive(false);
    const best = g.results.reduce((m, r) => Math.min(m, r.abs), 1e9);
    const [s1, s2, s3] = SCORING.stars;
    A.UI.results.show({gameId: GAME_ID, stars,
      hero: `<div class="pp-res-kettle" aria-hidden="true">${kettleSVG(26)}</div>`,
      title: stars === 3 ? 'In tune!' : stars ? 'Level cleared' : 'Almost there!',
      msg: g.late && stars <= SCORING.lateStars && avg <= s2 ? 'Lock in before the downbeat on every change for more stars.'
        : stars === 3 ? 'A timpanist\'s ears: right in tune.'
        : stars === 2 ? `Get the average under ${s3} cents for 3 stars.`
        : stars === 1 ? `Get the average under ${s2} cents for 2 stars.`
        : `Get the average under ${s1} cents to clear this level. Tap the drum with the pitch pipe and listen for the wobble!`,
      tiles: [['Average', `${avg.toFixed(1)} cents`], ['Closest', `${Math.round(best)} cents`], ['Score', g.score]],
      newBest: newBest && !!prev.best,
      best: prev.best ? (newBest ? `Best: ${g.score} (was ${prev.best})` : `Best: ${Math.max(prev.best, g.score)}`) : '',
      next: {label: 'Next level', hidden: !(g.lv < LEVELS.length && (stars > 0 || A.DEMO)), onClick: () => begin(g.lv + 1)},
      retry: {label: 'Try again', onClick: () => begin(g.lv)},
      levels: {label: 'Levels', onClick: () => showHub()}});
    g.avg = avg; g.stars = stars;
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > (prev.stars || 0) && 'star-earned', newBest && prev.best && 'new-high-score'].filter(Boolean), 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
  }

  /* ================= THE PAUSE MENU: every sound stops; QUICK CHANGE's count holds ================= */
  const pause = A.UI.pause.mount({
    onPause() {
      if (!G) return;
      G.paused = true; G.pausedAt = performance.now();
      cancelAnimationFrame(G.countRaf);
      if (G.both) G.both.cancel();
      T.stopAll();
    },
    onResume() {
      if (!G || !G.paused) return;
      if (G.countStart) G.countStart += performance.now() - G.pausedAt;   // the paused time never counts
      G.paused = false;
      if (G.phase === 'tune' || G.phase === 'pick') {
        if (G.r.replay || !G.r.refPlays) { G.r.replay = false; playRef(); }   // an interrupted reference plays again, free
        else if (G.countStart) tickCount();
      }
    },
    onRestart() { const lv = G ? G.lv : 1; startLevel(lv); },
    onLevels() { showHub(); },
    canPause: () => !!G && G.phase !== 'done',
    info: () => G ? [['Tuning', `${Math.min(G.i + 1, G.n)} / ${G.n}`], ['Score', G.score]] : [],
  });

  /* ================= THE KEYBOARD ================= */
  const enabledDrums = () => G.drums.map((x, i) => x.enabled ? i : -1).filter(i => i >= 0);
  document.addEventListener('keydown', e => {
    if (!G || G.paused || document.body.classList.contains('ui-modal') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, onBtn = e.target && /^(BUTTON|A|INPUT)$/.test(e.target.tagName);
    if (G.phase === 'feedback') {
      if (k === 'Enter' && !onBtn) { e.preventDefault(); next(); }
      return;
    }
    if (G.phase === 'pick') {
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); G.cursor = (G.cursor + (k === 'ArrowRight' ? 1 : -1) + G.drums.length) % G.drums.length; drawAll(); }
      else if (k === ' ' || k === 'Enter') { e.preventDefault(); pick(G.cursor); }
      else if (k === 'r' || k === 'R') { e.preventDefault(); playRef(); }
      else if (A.DEMO && (k === 'a' || k === 'A')) { e.preventDefault(); api.auto(); }
      else if (A.DEMO && (k === 'w' || k === 'W')) { e.preventDefault(); api.wrong(); }
      return;
    }
    if (G.phase !== 'tune') return;
    const x = G.drums[G.active];
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      const en = enabledDrums(); if (en.length < 2) return;
      const j = en.indexOf(G.active);
      setActive(en[(j + (k === 'ArrowRight' ? 1 : -1) + en.length) % en.length]);
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const s = k === 'ArrowUp' ? 1 : -1;
      if (e.shiftKey && G.L.fine) setFine(G.active, x.fine + s * RULES.fineStep);
      else setPedal(G.active, x.pedal + s * RULES.pedalStep / x.d.span);
    } else if (k === ' ') { e.preventDefault(); strike(!e.shiftKey); }
    else if (k === 'r' || k === 'R') { e.preventDefault(); playRef(); }
    else if (k === 'Enter') { e.preventDefault(); lock(); }
    else if (A.DEMO && (k === 'a' || k === 'A')) { e.preventDefault(); api.auto(); }
    else if (A.DEMO && (k === 'w' || k === 'W')) { e.preventDefault(); api.wrong(); }
  });
  $('tapBtn').addEventListener('click', () => strike(true));
  $('strokeBtn').addEventListener('click', () => strike(false));
  $('refBtn').addEventListener('click', () => playRef());
  $('lockBtn').addEventListener('click', () => lock());

  /* ================= TESTS and ?demo ================= */
  /** tune every target drum of the round to its target (+ cents) */
  function tuneTo(off) {
    if (!G || G.paused) return false;
    if (G.phase === 'pick') { const ok = G.drums.findIndex(x => D.inRange(x.d, G.r.targets[0].midi)); pick(ok); }
    if (G.phase !== 'tune') return false;
    G.r.targets.forEach(t => {
      const x = G.drums[t.di];
      x.pedal = Math.max(0, Math.min(1, D.pedalFor(x.d, t.midi))); x.fine = 0;
      x.fine = Math.max(-D.FINE, Math.min(D.FINE, (t.midi - D.midiAt(x.d, x.pedal, 0)) * 100 + off));
      T.setFreq(t.di, freqOf(t.di));
    });
    drawAll();
    return true;
  }
  const api = A.PedalPoint = {
    state() {
      if (!G) return {phase: 'hub'};
      return {lv: G.lv, phase: G.phase, i: G.i, n: G.n, kind: G.L.kind, active: G.active, cursor: G.cursor, paused: G.paused,
        score: G.score, late: G.late, prompt: $('prompt').textContent, gauge: !!G.L.gauge, fine: !!G.L.fine,
        drums: G.drums.map((x, i) => ({id: x.d.id, pedal: x.pedal, fine: x.fine, freq: freqOf(i), midi: D.midiAt(x.d, x.pedal, x.fine), gauge: D.gauge(x.d, x.pedal, x.fine), enabled: x.enabled})),
        targets: G.r ? G.r.targets.map(t => ({midi: t.midi, freq: t.f, di: t.di, drum: t.di != null ? G.drums[t.di].d.id : null, part: t.part || null})) : [],
        ref: G.r ? {midi: G.r.refMidi, plays: G.r.refPlays, mode: G.L.ref, allowed: refAllowed(), iv: G.r.iv || null, from: G.r.from != null ? G.r.from : null, key: G.r.key ? G.r.key.key : null} : null,
        count: G.L.kind === 'change' ? {started: !!G.countStart, ms: G.countMs || 0, left: G.countStart ? Math.max(0, G.countMs - ((G.paused ? G.pausedAt : performance.now()) - G.countStart)) : null} : null,
        results: G.results.slice(), wrongPicks: G.wrongPicks || 0, stars: G.stars, avg: G.avg};
    },
    begin: lv => startLevel(lv),
    intro: lv => begin(lv),
    auto: () => tuneTo(0),
    wrong: () => tuneTo(30),
    lock: () => lock(),
    next: () => next(),
    pick: i => pick(i),
    setPedal: (i, p) => setPedal(i, p),
    setFine: (i, c) => setFine(i, c),
    setActive: i => setActive(i),
    strike: soft => strike(soft !== false),
    reference: () => playRef(),
    starsFor, pointsFor, intervalTarget: (refName, iv) => { const t = intervalTarget(D.DRUMS, D.midiOf(refName), iv); return t && {midi: t.midi, drum: D.DRUMS[t.di].id, name: D.label(t.midi)}; },
    showHub,
  };

  showHub();
})(window.Arcade);
