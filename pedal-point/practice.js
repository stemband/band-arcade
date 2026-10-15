/* PEDAL POINT: THE PRACTICE ROOM (docs/games/pedal-point.md PRACTICE MODE). No stars, nothing in `games` progress.
   Set up 1–4 timpani, tune them (pedal, fine tuner, or a note from the drum's range), and PLAY them: a tap = a stroke
   (where on the head matters a little: the playing spot rings, the center thuds), press and hold = a roll, two fingers
   or ✋ = muffle; keys J K L ; (or F G H J). THE CLICK (a metronome), LOAD YOUR OWN SHEET MUSIC (kept on this device
   only, in IndexedDB), and the four PRACTICE ETUDES with HEAR IT and PLAY ALONG.
   NO MICROPHONE (Pedal Point never uses one): every sound is timpani.js's (through Sfx.output()) or the shared click kit
   (music-highway/backing.js). Arcade.PedalPoint.practice = the test hooks. */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'pedal-point';
  const D = A.PPDrums, T = A.Timpani, ROLL = T.ROLL, E = A.PPEtudes;

  /* ================= THE PRACTICE ROOM'S SETTINGS (Mr. Graham edits these) ================= */
  const PRACTICE = {
    // ONE TAP SETUPS: the drums (sizes from drums.js) and their notes, low to high
    presets: [
      {id: 'cf', name: 'C & F', sub: '26" + 23"', drums: [['26', 'C3'], ['23', 'F3']]},       // the default for 2 drums (Mr. Graham's setup)
      {id: 'bbf', name: 'B♭ & F', sub: '29" + 26"', drums: [['29', 'Bb2'], ['26', 'F3']]},
      {id: 'ebbb', name: 'E♭ & B♭', sub: '29" + 26"', drums: [['29', 'Bb2'], ['26', 'Eb3']]},
      {id: 'four', name: 'Four drums', sub: 'F B♭ C F', drums: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']]},
    ],
    // the drums a count starts with (before the student changes them), and their notes
    counts: {1: [['26', 'C3']], 2: [['26', 'C3'], ['23', 'F3']], 3: [['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']], 4: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']]},
    dyn: {p: .42, mf: .68, f: .9, ff: 1},       // DYNAMICS: a stroke's loudness (there's no pressure on a touch screen)
    accent: 1.25,                               // an accented note (HEAR IT), × its dynamic (never over 1.15)
    click: {min: 40, max: 160, tempo: 88, vol: .7},
    keys: {jkl: ['j', 'k', 'l', ';'], fghj: ['f', 'g', 'h', 'j']},
    muffleMs: 150,                              // a second finger down on the same drum within this = MUFFLE
    // PLAY ALONG's judge (shared/rhythm-judge.js): ms either side of the note. on time = perfect/good/ok
    judge: {perfectMs: 45, goodMs: 85, okMs: 130, lateMs: 220},
    score: {onTime: 1, off: .5, short: .5, wrong: 0, miss: 0},   // ACCURACY: what each result is worth
    tuneWarn: 25,                               // cents: "this drum is out of tune" (the etudes' notes)
    findCents: 150,                             // an etude note is on a drum tuned within this many cents of it
    lookS: .15, tickMs: 25, startS: .35,        // the scheduler (HEAR IT, PLAY ALONG, the click)
    activeS: 6,                                 // practice time: counted while something was played in the last few s
    saveEveryS: 15, keepDays: 30,
    sheets: {max: 6, maxMB: 40},                // LOAD SHEET MUSIC: files kept on this device
  };

  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const S = {open: false, sel: 0, show: 'none', presses: {}, keyDown: {}, dyn: 'mf', clickOn: false, run: null,
    lastActive: -1e9, unsaved: 0, lastTick: 0, etude: null, sheetId: null, sheetURL: null, zoom: {s: 1, x: 0, y: 0}};

  /* ================= THE SETUP ================= */
  const cfg = () => {
    const g = gd(), p = g.practice || (g.practice = {});
    if (!Array.isArray(p.drums) || !p.drums.length) p.drums = PRACTICE.counts[2].map(([id, n]) => drumAt(id, n));
    p.order = p.order === 'eu' ? 'eu' : 'us'; p.keys = p.keys === 'fghj' ? 'fghj' : 'jkl';
    if (p.gauge == null) p.gauge = true;
    if (!PRACTICE.dyn[p.dyn]) p.dyn = 'mf';
    if (!(p.tempo >= PRACTICE.click.min && p.tempo <= PRACTICE.click.max)) p.tempo = PRACTICE.click.tempo;
    return p;
  };
  function drumAt(id, note) {
    const d = D.byId(id), m = D.midiOf(note);
    return {id, pedal: Math.max(0, Math.min(1, D.pedalFor(d, Math.max(d.lowMidi, Math.min(d.highMidi, m))))), fine: 0};
  }
  /** the drums in their SCREEN order, left to right: [{i (index in cfg.drums), x, d}] (lowest left, or right: European) */
  function order() {
    const p = cfg(), list = p.drums.map((x, i) => ({i, x, d: D.byId(x.id)}));
    list.sort((a, b) => a.d.lowMidi - b.d.lowMidi || a.i - b.i);                  // lowest pitch first
    return p.order === 'eu' ? list.reverse() : list;
  }
  const freqOf = i => { const x = cfg().drums[i]; return D.freqAt(D.byId(x.id), x.pedal, x.fine); };
  const midiOf = i => { const x = cfg().drums[i]; return D.midiAt(D.byId(x.id), x.pedal, x.fine); };
  const key = i => 'p' + i;                     // the drum's voice in timpani.js (the levels use 0–3)
  function applyPreset(id) {
    const pr = PRACTICE.presets.find(x => x.id === id); if (!pr) return false;
    cfg().drums = pr.drums.map(([d, n]) => drumAt(d, n)); save(); T.stopAll(); draw(); drawSetup(); return true;
  }
  function setCount(n) {
    n = Math.max(1, Math.min(4, n | 0));
    cfg().drums = PRACTICE.counts[n].map(([d, m]) => drumAt(d, m)); save(); T.stopAll(); draw(); drawSetup();
  }

  /* ================= THE DRUMS ON SCREEN (seen from above: the head, its playing spot, the copper rim) ================= */
  function headSVG(size) {
    const spot = T.TIMPANI.spot * 46;
    return `<svg class="pr-svg" viewBox="0 0 100 100" aria-hidden="true">` +
      `<circle class="pr-rim" cx="50" cy="50" r="49"/><circle class="pr-hoop" cx="50" cy="50" r="46.5"/>` +
      `<circle class="pr-skin" cx="50" cy="50" r="45"/><circle class="pr-spot" cx="50" cy="50" r="${spot.toFixed(1)}"/>` +
      `<circle class="pr-ripple" cx="50" cy="50" r="20"/><text class="pr-sz" x="50" y="54" text-anchor="middle">${size}"</text></svg>`;
  }
  function draw() {
    if (!S.open) return;
    const p = cfg(), ord = order(), keys = PRACTICE.keys[p.keys];
    if (S.sel >= p.drums.length) S.sel = 0;
    $('prDrums').style.setProperty('--n', ord.length);
    $('prDrums').innerHTML = ord.map((o, v) => `<div class="pr-drum" data-i="${o.i}" data-v="${v}" style="--pr-size:${(.78 + (o.d.id - 23) / 9 * .22).toFixed(3)}">
        <div class="pr-head" data-i="${o.i}" role="button" tabindex="-1" aria-label="${o.d.id} inch drum: tap to play, hold to roll">${headSVG(o.d.id)}<span class="pr-key" aria-hidden="true">${(keys[v] || '').toUpperCase()}</span></div>
        <div class="pr-info"><b class="pr-note" id="prNote${o.i}"></b><span class="pr-tune" id="prTune${o.i}" hidden>out of tune</span></div>
        <div class="pr-row">
          <button type="button" class="pr-hand" data-i="${o.i}" aria-label="Muffle the ${o.d.id} inch drum">✋</button>
          <div class="pp-pedal pr-pedal" data-i="${o.i}" role="slider" tabindex="-1" aria-label="${o.d.id} inch drum pedal" aria-valuemin="0" aria-valuemax="100">
            <span class="pp-toe" aria-hidden="true">Toe</span><span class="pp-track" aria-hidden="true"><span class="pp-plate"></span></span><span class="pp-heel" aria-hidden="true">Heel</span>
          </div>
        </div>
      </div>`).join('');
    $('prDrums').querySelectorAll('.pr-head').forEach(h => wireHead(h, +h.dataset.i));
    $('prDrums').querySelectorAll('.pr-hand').forEach(b => b.addEventListener('click', () => muffle(+b.dataset.i)));
    $('prDrums').querySelectorAll('.pr-pedal').forEach(el => wirePedal(el, +el.dataset.i));
    A.holdGuard($('prDrums'), {lock: true});
    p.drums.forEach((x, i) => drawDrum(i));
    drawFine(); tuneBadges();
  }
  function drawDrum(i) {
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`); if (!el) return;
    const x = cfg().drums[i], d = D.byId(x.id);
    el.classList.toggle('sel', S.sel === i);
    el.querySelector('.pp-plate').style.setProperty('--p', x.pedal.toFixed(4));
    const pd = el.querySelector('.pr-pedal');
    pd.setAttribute('aria-valuenow', Math.round(x.pedal * 100)); pd.tabIndex = S.sel === i ? 0 : -1;
    $('prNote' + i).textContent = cfg().gauge ? D.gauge(d, x.pedal, x.fine) + D.spell(Math.round(D.midiAt(d, x.pedal, x.fine))).oct : '?';
  }
  function drawFine() {
    const x = cfg().drums[S.sel]; if (!x) return;
    $('prFineT').style.setProperty('--f', (x.fine / D.FINE).toFixed(3));
    $('prFineTrack').setAttribute('aria-valuenow', Math.round(x.fine));
    $('prFineL').textContent = `Fine tuner · ${x.id}"`;
  }
  function select(i) { if (!cfg().drums[i]) return; S.sel = i; cfg().drums.forEach((x, k) => drawDrum(k)); drawFine(); }
  function setPedal(i, p) {
    const x = cfg().drums[i]; if (!x) return;
    x.pedal = Math.max(0, Math.min(1, p)); T.setFreq(key(i), freqOf(i)); drawDrum(i); tuneBadges(); saveSoon();
  }
  function setFine(i, c) {
    const x = cfg().drums[i]; if (!x) return;
    x.fine = Math.max(-D.FINE, Math.min(D.FINE, c)); T.setFreq(key(i), freqOf(i)); drawDrum(i); drawFine(); tuneBadges(); saveSoon();
  }
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 400); };
  function wirePedal(el, i) {
    let st = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); select(i);
      const h = Math.max(50, el.querySelector('.pp-track').getBoundingClientRect().height);
      st = {y: e.clientY, p: cfg().drums[i].pedal, h, id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', e => { if (st && e.pointerId === st.id) setPedal(i, st.p - (e.clientY - st.y) / st.h); });
    const end = e => { if (st && e.pointerId === st.id) st = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  (function wireFine() {
    const el = $('prFineTrack'); let st = null;
    el.addEventListener('pointerdown', e => {
      const x = cfg().drums[S.sel]; if (!x) return;
      e.preventDefault(); st = {x: e.clientX, f: x.fine, id: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', e => { if (st && e.pointerId === st.id) setFine(S.sel, st.f + (e.clientX - st.x) / window.PP_RULES.finePx); });
    const end = e => { if (st && e.pointerId === st.id) st = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
    $('prFineDown').addEventListener('click', () => setFine(S.sel, cfg().drums[S.sel].fine - window.PP_RULES.fineStep));
    $('prFineUp').addEventListener('click', () => setFine(S.sel, cfg().drums[S.sel].fine + window.PP_RULES.fineStep));
  })();

  /* ================= PLAYING: strokes, rolls, muffle ================= */
  const vel = () => PRACTICE.dyn[S.dyn] || PRACTICE.dyn.mf;
  function stroke(i, {center = 0, v = vel(), at = null} = {}) {
    if (!cfg().drums[i]) return false;
    S.lastActive = performance.now();
    const ok = T.strike(key(i), freqOf(i), {vel: v, center, layer: true, at});
    if (at == null) hitFx(i, center);
    return ok;
  }
  function hitFx(i, center) {
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`); if (!el) return;
    el.classList.remove('hit', 'thud'); void el.offsetWidth; el.classList.add('hit'); if (center > 0) el.classList.add('thud');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('hit', 'thud'), 450);
  }
  /** a press (a finger or a key) on drum i: one stroke now; held past ROLL.holdMs it becomes a roll until release */
  function press(i, id, {center = 0} = {}) {
    if (!cfg().drums[i]) return;
    // a second finger on the same drum within muffleMs = MUFFLE
    const other = Object.values(S.presses).find(p => p.i === i && p.id !== id && p.finger && performance.now() - p.at < PRACTICE.muffleMs);
    if (other && String(id).startsWith('ptr')) { release(other.id, true); muffle(i); return; }
    const pr = {i, id, at: performance.now(), rolling: false, hand: 0, finger: String(id).startsWith('ptr'), rel: alongNow()};
    S.presses[id] = pr;
    stroke(i, {center});
    attack(i, pr);
    pr.holdT = setTimeout(() => { if (S.presses[id] === pr) { pr.rolling = true; rollStroke(pr); } }, ROLL.holdMs);
  }
  function rollStroke(pr) {
    if (S.presses[pr.id] !== pr) return;
    pr.hand ^= 1;
    const j = 1 + (Math.random() * 2 - 1) * ROLL.velJitter, lr = pr.hand ? 1 - ROLL.rlBalance : 1;
    stroke(pr.i, {v: Math.min(1.15, vel() * ROLL.vel * j * lr)});
    pr.n = (pr.n || 0) + 1;
    const step = 1000 / ROLL.rate + (Math.random() * 2 - 1) * ROLL.jitterMs;
    pr.rollT = setTimeout(() => rollStroke(pr), step);
  }
  function release(id, silent) {
    const pr = S.presses[id]; if (!pr) return;
    clearTimeout(pr.holdT); clearTimeout(pr.rollT); delete S.presses[id];
    const now = alongNow();
    if (pr.att) pr.att.hold = now != null ? Math.max(0, now - pr.att.rel) : (performance.now() - pr.at) / 1000;
    if (silent && pr.att) pr.att.muffled = true;
  }
  function muffle(i) {
    Object.values(S.presses).filter(p => p.i === i).forEach(p => release(p.id, true));
    T.damp(key(i)); S.lastActive = performance.now();
    const el = $('prDrums').querySelector(`.pr-drum[data-i="${i}"]`);
    if (el) { el.classList.add('muffled'); setTimeout(() => el.classList.remove('muffled'), 300); }
  }
  /** where on the head: 0 = the playing spot or farther out … 1 = the dead center (the thud) */
  function centerOf(el, e) {
    const r = el.querySelector('svg').getBoundingClientRect(), rad = r.width / 2 * .9;
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dist = Math.hypot(dx, dy) / rad;
    const from = T.TIMPANI.thud.from;
    return dist >= from ? 0 : (from - dist) / from;
  }
  function wireHead(el, i) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); select(i);
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      press(i, 'ptr' + e.pointerId, {center: centerOf(el, e)});
    });
    const up = e => release('ptr' + e.pointerId);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ================= THE KEYBOARD ================= */
  const visIndex = v => { const o = order()[v]; return o ? o.i : null; };
  document.addEventListener('keydown', e => {
    if (!S.open || document.body.classList.contains('ui-modal') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
    const k = e.key.toLowerCase(), keys = PRACTICE.keys[cfg().keys], v = keys.indexOf(k);
    if (v >= 0 && v < cfg().drums.length) {
      e.preventDefault();
      if (e.repeat) return;                                 // a held key = a roll, never the key repeat
      const i = visIndex(v);
      if (e.shiftKey) { muffle(i); return; }
      S.keyDown[k] = true; press(i, 'key:' + k);
      return;
    }
    if (/^[1-4]$/.test(e.key)) { const i = visIndex(+e.key - 1); if (i != null) { e.preventDefault(); select(i); } return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (e.target && e.target.type === 'range') return;
      e.preventDefault();
      const x = cfg().drums[S.sel], s = e.key === 'ArrowUp' ? 1 : -1;
      if (e.shiftKey) setFine(S.sel, x.fine + s * window.PP_RULES.fineStep);
      else setPedal(S.sel, x.pedal + s * window.PP_RULES.pedalStep / D.byId(x.id).span);
    }
  });
  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (S.keyDown[k]) { delete S.keyDown[k]; release('key:' + k); }
  });
  addEventListener('blur', () => Object.keys(S.presses).forEach(id => release(id)));

  /* ================= THE SCHEDULER (the click, HEAR IT, PLAY ALONG): sounds ahead on the audio clock, lights at the
     AUDIBLE time (the rudiment player's approach) ================= */
  function transport({events, more, onEvent, onEnd, endS}) {
    const o = A.Sfx && A.Sfx.output && A.Sfx.output();
    const ctx = o ? o.ctx : null;
    let clk = null;
    if (ctx && A.AudioClock) { clk = A.AudioClock.create().start(); if (clk.ctx !== ctx) { clk.ctx = ctx; clk.off = null; clk.sample(); } }
    if (!ctx || !clk) { const p0 = performance.now(); clk = {now: () => (performance.now() - p0) / 1000, audAt: p => (p - p0) / 1000, sample() {}, ctx: null}; }
    const kit = ctx && A.MHBacking ? A.MHBacking.create(ctx, o.out) : null;
    const t0 = clk.now() + PRACTICE.startS;
    let queue = (events || []).slice().sort((a, b) => a.time - b.time), vis = [], running = true, timer = 0, raf = 0, made = 0;
    const R = {t0, clk, ctx, log: [], stop, now: () => audible() - t0, running: () => running};
    function audible() {
      clk.sample();
      let n = clk.audAt(performance.now());
      if (ctx && Math.abs(n - ctx.currentTime) > 1) n = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      return n;
    }
    function play(e) {
      const at = t0 + e.time;
      vis.push(e); R.log.push({kind: e.kind, time: e.time, drum: e.drum, n: e.n});
      if (R.log.length > 3000) R.log.splice(0, 1000);
      if (!ctx) return;
      if (e.kind === 'click' && kit) kit.click(at, PRACTICE.click.vol * (e.down ? 1 : .8), !!e.down);
      if (e.kind === 'stroke') T.strike(key(e.drum), freqOf(e.drum), {at, vel: e.vel, layer: true});
    }
    function schedule() {
      if (!running) return;
      const horizon = clk.now() + PRACTICE.lookS - t0;
      if (more) while (made < horizon + .5) { const add = more(made, made + .5); made += .5; if (add) queue = queue.concat(add).sort((a, b) => a.time - b.time); }
      while (queue.length && queue[0].time < horizon) play(queue.shift());
    }
    function frame() {
      if (!running) return;
      const now = audible() - t0;
      while (vis.length && vis[0].time <= now) { const e = vis.shift(); try { if (onEvent) onEvent(e, now); } catch (err) { setTimeout(() => { throw err; }); } }
      if (endS != null && now >= endS && !queue.length) { stop(false); return; }
      raf = requestAnimationFrame(frame);
    }
    function stop(cut = true) {
      if (!running) return;
      running = false; clearInterval(timer); cancelAnimationFrame(raf);
      if (cut && kit) { kit.fade(.02); setTimeout(() => kit.stopAll(), 40); }
      if (onEnd) onEnd({stopped: cut});
    }
    schedule(); timer = setInterval(schedule, PRACTICE.tickMs); raf = requestAnimationFrame(frame);
    return R;
  }

  /* ================= THE CLICK ================= */
  function setClick(on) {
    stopRun();
    S.clickOn = !!on;
    $('prClickBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) { beatLight(null); return; }
    const p = cfg(), beatS = () => 60 / p.tempo;
    let nextT = 0, beat = 0;
    S.run = {kind: 'click', tr: transport({more: (from, to) => {
      const out = [];
      while (nextT < to) { out.push({time: nextT, kind: 'click', down: beat % 4 === 0, beat, count: beat < 4}); beat++; nextT += beatS(); }
      return out;
    }, onEvent: e => { beatLight(e); S.lastActive = performance.now(); }})};
  }
  function beatLight(e) {
    const el = $('prBeat');
    if (!e) { el.className = 'pr-beat'; el.textContent = ''; return; }
    el.className = 'pr-beat'; void el.offsetWidth; el.className = 'pr-beat on' + (e.down ? ' down' : '');
    el.textContent = e.count ? String(e.beat % 4 + 1) : '';
  }
  function stopRun() {
    if (S.run && S.run.tr) S.run.tr.stop();
    S.run = null;
  }

  /* ================= THE ETUDES ================= */
  const etudes = E.ETUDES.map(et => E.parse(et));
  function showEtude(id) {
    stopRun();
    const e = etudes.find(x => x.etude.id === id) || etudes[0];
    S.etude = e; cfg().etude = e.etude.id; save();
    $('prEtudeSel').value = e.etude.id;
    const bars = Array.from({length: e.measures}, (_, k) => `<option value="${k}">${k + 1}</option>`).join('');
    $('prFrom').innerHTML = bars; $('prTo').innerHTML = bars;
    $('prFrom').value = '0'; $('prTo').value = String(e.measures - 1);
    engraveEtude(e);
    const best = (gd().etudes || {})[e.etude.id];
    $('prResult').textContent = best ? `Best: ${best.best} % (at ${best.pct} % tempo)` : `♩ = ${e.etude.tempo}. Hear it first, then play along.`;
    tuneBadges();
  }
  function engraveEtude(e) {
    const narrow = ($('prStaff').clientWidth || innerWidth) < 700;               // a phone: 2 bars a row, else 4
    const rows = A.RhythmStaff.rows(e.parsed, narrow ? 2 : 4), pitch = n => (e.notes[n.i] || {}).pitch;
    $('prStaff').innerHTML = `<h3 class="pr-etitle">${e.etude.name} <small>♩ = ${e.etude.tempo}</small></h3>` + rows.map(([a, b], r) => {
      const g = A.RhythmStaff.engrave(e.parsed, {from: a, to: b, counting: false, clef: 'bass', pitch, slurs: e.slurs, marks: e.etude.marks, id: 'pe' + r, label: `${e.etude.name}, bars ${a + 1} to ${b}`});
      return `<div class="pr-srow-staff" data-from="${a}">${g.svg}</div>`;
    }).join('');
  }
  /** which drum plays each etude pitch: the nearest-tuned drum within findCents (each drum once) -> {midi: drumIndex} */
  function assign(e) {
    const pitches = [...new Set(e.notes.filter(n => !n.rest).map(n => n.midi))], used = new Set(), out = {};
    pitches.forEach(m => {
      let best = -1, bc = 1e9;
      cfg().drums.forEach((x, i) => { if (used.has(i)) return; const c = Math.abs((midiOf(i) - m) * 100); if (c < bc) { bc = c; best = i; } });
      if (best >= 0 && bc <= PRACTICE.findCents) { out[m] = best; used.add(best); }
    });
    return out;
  }
  /* the badges: a drum carrying an etude note > tuneWarn cents off says so; a note no drum is near: the set-up offer */
  function tuneBadges() {
    if (!S.open) return;
    const show = S.show === 'etude' && S.etude;
    const map = show ? assign(S.etude) : {}, off = {};
    Object.entries(map).forEach(([m, i]) => { const c = (midiOf(i) - +m) * 100; if (Math.abs(c) > PRACTICE.tuneWarn) off[i] = c; });
    cfg().drums.forEach((x, i) => { const b = $('prTune' + i); if (b) { b.hidden = !(i in off); b.textContent = i in off ? `out of tune (${off[i] > 0 ? '+' : '−'}${Math.round(Math.abs(off[i]))}¢)` : ''; } });
    const missing = show ? [...new Set(S.etude.notes.filter(n => !n.rest).map(n => n.midi))].filter(m => !(m in map)) : [];
    $('prNeed').hidden = !missing.length;
    if (missing.length) $('prNeedText').textContent = `This etude needs ${missing.map(m => D.label(m)).join(' and ')} on your drums. Tune them yourself (good practice!), or:`;
    S.badges = {off, missing};
  }
  /** the strokes HEAR IT plays (and PLAY ALONG's notes): bars [from, to] at pct of the tempo */
  function plan(e, {from = 0, to = e.measures - 1, pct = 1} = {}) {
    const per = e.parsed.meter.per, tm = E.timer(e, pct), t0 = tm(from * per), map = assign(e);
    const dynAt = dynamicsOf(e), out = [], notes = [];
    e.notes.forEach((n, k) => {
      if (n.rest || n.measure < from || n.measure > to) return;
      const time = tm(n.t) - t0, end = tm(n.t + n.d) - t0, drum = map[n.midi], v = dynAt(n.t);
      notes.push({n: n.i, time, end, drum, roll: n.roll, midi: n.midi});
      if (drum == null) return;
      if (!n.roll) { out.push({time, kind: 'stroke', drum, vel: Math.min(1.15, v * (n.accent ? PRACTICE.accent : 1)), n: n.i}); return; }
      // a roll: single strokes at the ROLL rate; a release rolls right up to its next note, else stops a stroke short
      const nx = e.notes[k + 1], stop = n.release && nx ? tm(nx.t) - t0 - 1 / ROLL.rate : end - 1 / ROLL.rate;
      let t = time, h = 0;
      while (t < stop - 1e-6 || t === time) {
        const first = t === time;
        out.push({time: t, kind: 'stroke', drum, vel: Math.min(1.15, v * (first ? (n.accent ? PRACTICE.accent : 1) : ROLL.vel * (h ? 1 - ROLL.rlBalance : 1))), n: n.i, roll: true});
        h ^= 1; t += 1 / ROLL.rate;
      }
    });
    return {strokes: out, notes, endS: tm((to + 1) * per) - t0, beatS: 60 / (e.etude.tempo * pct), per, tm, t0};
  }
  /** a dynamic for every tick: the marks (p mf f ff), "cresc." rising to the next dynamic */
  function dynamicsOf(e) {
    const per = e.parsed.meter.per, ms = (e.etude.marks || []).slice().sort((a, b) => a.m - b.m);
    return t => {
      const bar = t / per;
      let v = PRACTICE.dyn.mf, cres = null;
      ms.forEach(mk => { if (mk.m <= bar) { if (mk.kind === 'dyn' && PRACTICE.dyn[mk.text]) { v = PRACTICE.dyn[mk.text]; cres = null; } else if (/cresc/.test(mk.text)) cres = mk; } });
      if (cres) {
        const next = ms.find(x => x.m > cres.m && x.kind === 'dyn'), goal = next ? PRACTICE.dyn[next.text] : Math.min(1, v + .2), endBar = next ? next.m : cres.m + 1;
        v = v + (goal - v) * Math.min(1, (bar - cres.m) / Math.max(1, endBar - cres.m));
      }
      return v;
    };
  }
  const range = () => {
    let a = +$('prFrom').value || 0, b = +$('prTo').value; if (isNaN(b)) b = S.etude.measures - 1;
    if (b < a) [a, b] = [b, a];
    return {from: a, to: b};
  };
  const pct = () => (+$('prPct').value || 100) / 100;
  const loopOn = () => $('prLoop').getAttribute('aria-pressed') === 'true';
  const eclickOn = () => $('prEClick').getAttribute('aria-pressed') === 'true';

  /* lighting a note and the drum to hit */
  let lit = [];
  function lightNote(n, drum) {
    lit.forEach(el => el.classList.remove('pp-now', 'cue')); lit = [];
    if (n == null) return;
    $('prStaff').querySelectorAll(`g.rn[data-n="${n}"]`).forEach(el => { el.classList.add('pp-now'); lit.push(el); });
    if (drum != null) { const d = $('prDrums').querySelector(`.pr-drum[data-i="${drum}"]`); if (d) { d.classList.add('cue'); lit.push(d); } }
  }
  function clearMarks() { $('prStaff').querySelectorAll('g.rn').forEach(el => el.classList.remove('pp-now', 'r-ok', 'r-off', 'r-wrong', 'r-miss', 'r-short')); }

  /* HEAR IT / PLAY ALONG */
  function startEtude(mode) {
    const e = S.etude; if (!e) return;
    setClick(false); stopRun(); clearMarks();
    const r = range(), p = pct(), PL = plan(e, Object.assign({pct: p}, r)), count = mode === 'along' ? 4 : 0;
    const lead = count * PL.beatS, endS = lead + PL.endS + PRACTICE.judge.lateMs / 1000 + .2;
    const evs = [];
    if (mode === 'hear') PL.strokes.forEach(s => evs.push(Object.assign({}, s, {time: s.time + lead})));
    // the count-in (PLAY ALONG: one bar), then the click on every beat (if on)
    const beats = Math.round((r.to - r.from + 1) * PL.per / 12);
    for (let b = 0; b < count; b++) evs.push({time: b * PL.beatS, kind: 'click', down: b === 0, count: true, beat: b});
    if (eclickOn()) for (let b = 0; b < beats; b++) evs.push({time: lead + PL.tm(b * 12 + r.from * PL.per) - PL.t0 - 0, kind: 'click', down: b % 4 === 0, beat: b});
    PL.notes.forEach(n => evs.push({time: lead + n.time, kind: 'note', n: n.n, drum: n.drum}));
    const run = {kind: mode, e, r, pct: p, PL, lead, attacks: [], pass: 0};
    S.run = run;
    $('prHear').hidden = true; $('prAlong').hidden = true; $('prStop').hidden = false;
    $('prResult').textContent = mode === 'along' ? 'Count-in… then play the lit notes.' : 'Listen…';
    run.tr = transport({events: evs, endS, onEvent: ev => {
      S.lastActive = performance.now();
      if (ev.kind === 'click') beatLight(ev);
      if (ev.kind === 'note') lightNote(ev.n, mode === 'along' ? ev.drum : ev.drum);
    }, onEnd: ({stopped}) => {
      lightNote(null);
      if (S.run !== run) return;
      if (mode === 'along' && !stopped) finishAlong(run);
      if (!stopped && loopOn()) { S.passes = (S.passes || 0) + 1; setTimeout(() => { if (S.run === run) startEtude(mode); }, 250); return; }
      endEtudeUI();
      if (stopped || mode === 'hear') { S.run = null; if (mode === 'hear') $('prResult').textContent = 'Your turn: PLAY ALONG.'; }
    }});
  }
  function endEtudeUI() { $('prHear').hidden = false; $('prAlong').hidden = false; $('prStop').hidden = true; beatLight(null); }
  /** PLAY ALONG's clock: seconds since the etude's first note (the AUDIBLE time), or null when nothing is running */
  function alongNow() {
    const run = S.run;
    if (!run || run.kind !== 'along' || !run.tr) return null;
    return run.tr.now() - run.lead;
  }
  /** every press during PLAY ALONG is an attack (rel = when it was heard, s from the first note; hold = how long) */
  function attack(i, pr) {
    const run = S.run;
    if (!run || run.kind !== 'along' || pr.rel == null) return;
    pr.att = {rel: pr.rel, drum: i, hold: 0};
    run.attacks.push(pr.att);
  }
  /** THE JUDGE: the shared RhythmJudge per drum (right drum + timing), then: a note missed on its drum but hit on
      another = WRONG DRUM; a roll note needs a hold covering ROLL.holdFrac of its length (else SHORT) */
  function judge(PL, attacks) {
    const R = PRACTICE.judge, res = new Array(PL.notes.length).fill(null), drums = [...new Set(PL.notes.map(n => n.drum))];
    drums.forEach(d => {
      const ts = PL.notes.map((n, k) => ({k, t: n.time, n})).filter(x => x.n.drum === d);
      const as = attacks.filter(a => a.drum === d).slice().sort((a, b) => a.rel - b.rel);
      const m = A.RhythmJudge.match(ts, as, R);
      m.tg.forEach(t => { res[t.k] = {res: t.res, d: t.d, a: t.a}; });
    });
    PL.notes.forEach((n, k) => {
      const r = res[k] || {res: 'miss'};
      if (r.res === 'miss' && attacks.some(a => a.drum !== n.drum && Math.abs((a.rel - n.time) * 1000) <= R.okMs)) r.res = 'wrong';
      if (n.roll && r.a && /perfect|good|ok|early|late/.test(r.res) && r.a.hold < ROLL.holdFrac * (n.end - n.time)) r.short = true;
      r.kind = r.res === 'miss' ? 'miss' : r.res === 'wrong' ? 'wrong' : r.short ? 'short' : /perfect|good|ok/.test(r.res) ? 'ok' : 'off';
      res[k] = r;
    });
    const W = PRACTICE.score, worth = {ok: W.onTime, off: W.off, short: W.short, wrong: W.wrong, miss: W.miss};
    const acc = PL.notes.length ? Math.round(100 * res.reduce((s, r) => s + worth[r.kind], 0) / PL.notes.length) : 0;
    return {res, acc, counts: res.reduce((c, r) => (c[r.kind] = (c[r.kind] || 0) + 1, c), {})};
  }
  function finishAlong(run) {
    const J = judge(run.PL, run.attacks);
    run.J = J; run.pass++;
    J.res.forEach((r, k) => { const n = run.PL.notes[k]; $('prStaff').querySelectorAll(`g.rn[data-n="${n.n}"]`).forEach(el => el.classList.add('r-' + r.kind)); });
    const c = J.counts, full = run.r.from === 0 && run.r.to === run.e.measures - 1;
    let line = `Accuracy ${J.acc} % · on time ${c.ok || 0} · early/late ${c.off || 0}${c.short ? ` · short rolls ${c.short}` : ''} · wrong drum ${c.wrong || 0} · missed ${c.miss || 0}`;
    if (full) {
      const all = gd().etudes || (gd().etudes = {}), old = all[run.e.etude.id];
      if (!old || J.acc > old.best) { all[run.e.etude.id] = {best: J.acc, pct: Math.round(run.pct * 100)}; save(); line += old ? ' · NEW BEST!' : ''; }
      else line += ` · best ${old.best} %`;
    }
    $('prResult').textContent = line;
    S.lastResult = J;
  }

  /* ================= LOAD YOUR OWN SHEET MUSIC: IndexedDB on THIS DEVICE only =================
     Never uploaded, never sent anywhere, not in the Arcade Backup Code (that's localStorage): a separate database,
     'bandarcade-sheets', store 'sheets' = {id, name, type, size, added, blob}. Shown from a blob: URL. */
  const SheetDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, no) => {
        if (!window.indexedDB) return no(new Error('no IndexedDB'));
        const r = indexedDB.open('bandarcade-sheets', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('sheets', {keyPath: 'id', autoIncrement: true}); };
        r.onsuccess = () => { this.db = r.result; ok(this.db); };
        r.onerror = () => no(r.error);
      });
    },
    tx(mode, fn) { return this.open().then(db => new Promise((ok, no) => { const t = db.transaction('sheets', mode), st = t.objectStore('sheets'), out = fn(st); t.oncomplete = () => ok(out && out.result !== undefined ? out.result : out); t.onerror = () => no(t.error); })); },
    // the file's BYTES are stored (an ArrayBuffer), never the File itself: WebKit's private sessions (Safari Private
    // Browsing) refuse to keep a Blob in IndexedDB, but keep its bytes
    list() { return this.tx('readonly', st => st.getAll()).then(a => (a || []).map(x => ({id: x.id, name: x.name, type: x.type, size: x.size, added: x.added}))).then(a => a.concat(MEM.map(m => ({id: m.id, name: m.name, type: m.type, size: m.size, added: m.added, mem: true})))); },
    get(id) { const m = MEM.find(x => x.id === id); return m ? Promise.resolve(m) : this.tx('readonly', st => st.get(id)); },
    add(file, data) { return this.tx('readwrite', st => st.add({name: file.name || 'My music', type: file.type || '', size: file.size || 0, added: Date.now(), data})); },
    remove(id) { const k = MEM.findIndex(x => x.id === id); if (k >= 0) { MEM.splice(k, 1); return Promise.resolve(); } return this.tx('readwrite', st => st.delete(id)); },
  };
  /* a browser that can't keep the file at all (no IndexedDB, storage full or blocked): it's shown for this visit only */
  const MEM = [];
  const blobOf = rec => rec.blob || new Blob([rec.data], {type: rec.type || ''});
  async function loadFile(file) {
    if (!file) return;
    const okType = /^image\//.test(file.type) || file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!okType) { A.UI.toast('That file isn\'t a picture or a PDF.'); return; }
    if (file.size > PRACTICE.sheets.maxMB * 1048576) { A.UI.toast(`That file is too big (over ${PRACTICE.sheets.maxMB} MB).`); return; }
    let list = [];
    try { list = await SheetDB.list(); } catch (e) { list = MEM.slice(); }
    if (list.length >= PRACTICE.sheets.max) { A.UI.toast(`You have ${list.length} pieces saved. Remove one first.`); return; }
    let id = null;
    try { const data = await file.arrayBuffer(); id = await SheetDB.add(file, data); cfg().sheet = id; save(); }
    catch (e) {
      id = 'm' + (MEM.length + 1) + '-' + Date.now();
      MEM.push({id, name: file.name || 'My music', type: file.type || '', size: file.size || 0, added: Date.now(), blob: file});
      A.UI.toast('This browser can\'t keep your music after you leave, but it\'s here for now.', {ms: 4000});
    }
    await drawSheets(id);
  }
  async function drawSheets(pick) {
    let list = [];
    try { list = await SheetDB.list(); } catch (e) { list = MEM.slice(); }
    const sel = $('prSheetSel');
    sel.innerHTML = list.length ? list.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('') : '<option value="">(nothing yet)</option>';
    const id = pick != null ? pick : cfg().sheet;
    const cur = list.find(x => x.id === id) || list[list.length - 1];
    sel.disabled = !list.length; $('prRemove').disabled = !cur;
    if (cur) sel.value = String(cur.id);
    await showSheet(cur ? cur.id : null);
    return list;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  async function showSheet(id) {
    if (S.sheetURL) { URL.revokeObjectURL(S.sheetURL); S.sheetURL = null; }
    const view = $('prView');
    view.querySelectorAll('img,iframe').forEach(x => x.remove());
    $('prPdfTip').hidden = true; S.sheetId = null; S.sheetType = null;
    $('prEmpty').hidden = id != null;
    ['prZoomIn', 'prZoomOut', 'prFit'].forEach(b => { $(b).disabled = true; });
    if (id == null) return;
    const rec = await SheetDB.get(id).catch(() => null);
    if (!rec) { $('prEmpty').hidden = false; return; }
    S.sheetId = id; cfg().sheet = id; save();
    S.sheetURL = URL.createObjectURL(blobOf(rec));
    const pdf = rec.type === 'application/pdf' || /\.pdf$/i.test(rec.name);
    S.sheetType = pdf ? 'pdf' : 'image';
    if (pdf) {
      const f = document.createElement('iframe');
      f.className = 'pr-pdf'; f.title = rec.name; f.src = S.sheetURL + '#view=FitH';
      view.appendChild(f);
      // iPad Safari shows only a PDF's first page (and little zoom) in a frame; some browsers can't show PDFs at all
      $('prPdfTip').hidden = !(isIOS() || navigator.pdfViewerEnabled === false);
    } else {
      const img = document.createElement('img');
      img.className = 'pr-img'; img.alt = rec.name; img.src = S.sheetURL; img.draggable = false;
      img.onload = () => fit();
      view.appendChild(img);
      ['prZoomIn', 'prZoomOut', 'prFit'].forEach(b => { $(b).disabled = false; });
    }
  }
  /* the image: fit to width, + / − / FIT, pinch-zoom and drag-pan */
  function applyZoom() { const img = $('prView').querySelector('img'); if (img) img.style.transform = `translate(${S.zoom.x}px, ${S.zoom.y}px) scale(${S.zoom.s})`; }
  function fit() {
    const img = $('prView').querySelector('img'), v = $('prView'); if (!img || !img.naturalWidth) return;
    S.zoom = {s: v.clientWidth / img.naturalWidth, x: 0, y: 0, fit: true}; applyZoom();
  }
  function zoomBy(k, cx, cy) {
    const v = $('prView'), r = v.getBoundingClientRect(), px = cx != null ? cx - r.left : v.clientWidth / 2, py = cy != null ? cy - r.top : v.clientHeight / 2;
    const s0 = S.zoom.s, s1 = Math.max(.1, Math.min(8, s0 * k));
    S.zoom.x = px - (px - S.zoom.x) * s1 / s0; S.zoom.y = py - (py - S.zoom.y) * s1 / s0; S.zoom.s = s1; S.zoom.fit = false; applyZoom();
  }
  (function wireView() {
    const v = $('prView'), pts = new Map();
    let last = null;
    v.addEventListener('pointerdown', e => { if (!v.querySelector('img')) return; pts.set(e.pointerId, {x: e.clientX, y: e.clientY}); try { v.setPointerCapture(e.pointerId); } catch (er) {} last = null; });
    v.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pts.size === 1) { S.zoom.x += e.clientX - prev.x; S.zoom.y += e.clientY - prev.y; applyZoom(); return; }
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (last) zoomBy(d / last, (a.x + b.x) / 2, (a.y + b.y) / 2);
      last = d;
    });
    const up = e => { pts.delete(e.pointerId); last = null; };
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    v.addEventListener('wheel', e => { if (!v.querySelector('img') || !e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, {passive: false});
    $('prZoomIn').addEventListener('click', () => zoomBy(1.25));
    $('prZoomOut').addEventListener('click', () => zoomBy(.8));
    $('prFit').addEventListener('click', fit);
    $('prFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; loadFile(f); });
    $('prSheetSel').addEventListener('change', () => { const v = $('prSheetSel').value; showSheet(/^m/.test(v) ? v : +v); });
    $('prRemove').addEventListener('click', () => {
      const id = S.sheetId; if (id == null) return;
      A.UI.confirm({title: 'Remove this music?', text: 'It will be deleted from this device.', yes: 'Remove', no: 'Keep it', danger: true,
        onYes: async () => { await SheetDB.remove(id).catch(() => {}); cfg().sheet = null; save(); drawSheets(null); }});
    });
    $('prHide').addEventListener('click', () => setShow('none'));
    addEventListener('resize', () => { if (S.zoom.fit) fit(); });
  })();

  /* ================= THE SCREEN ================= */
  function setShow(m) {
    if (S.run && S.run.kind !== 'click') stopRun();
    S.show = m; cfg().show = m; save();
    $('prShow').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.show === m ? 'true' : 'false'));
    $('prScore').hidden = m === 'none';
    $('prEtude').hidden = m !== 'etude'; $('prSheet').hidden = m !== 'sheet';
    $('practice').classList.toggle('pr-music', m !== 'none');
    if (m === 'etude') showEtude(cfg().etude);
    if (m === 'sheet') drawSheets();
    tuneBadges();
  }
  function setDyn(d) {
    S.dyn = d; cfg().dyn = d; save();
    $('prDyn').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.dyn === d ? 'true' : 'false'));
  }
  /* the setup panel */
  function drawSetup() {
    const p = cfg();
    $('prPresets').innerHTML = PRACTICE.presets.map(x => `<button type="button" class="btn btn-secondary btn-small" data-preset="${x.id}">${x.name}<small>${x.sub}</small></button>`).join('');
    $('prPresets').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { applyPreset(b.dataset.preset); A.Sfx.event('ui-toggle'); }));
    $('prCount').innerHTML = [1, 2, 3, 4].map(n => `<button type="button" data-n="${n}" aria-pressed="${p.drums.length === n}">${n}</button>`).join('');
    $('prCount').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { setCount(+b.dataset.n); A.Sfx.event('ui-toggle'); }));
    $('prSlots').innerHTML = order().map((o, v) => {
      const d = o.d, cur = Math.round(midiOf(o.i)), onNote = Math.abs((midiOf(o.i) - cur) * 100) < 1;
      const notes = []; for (let m = d.lowMidi; m <= d.highMidi; m++) notes.push(`<option value="${m}" ${onNote && m === cur ? 'selected' : ''}>${D.label(m)}</option>`);
      return `<div class="pr-slot" data-i="${o.i}"><b>Drum ${v + 1}</b>
        <label>Size <select data-size="${o.i}">${D.DRUMS.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${x.name} (${D.label(x.lowMidi)}–${D.label(x.highMidi)})</option>`).join('')}</select></label>
        <label>Note <select data-note="${o.i}">${onNote ? '' : '<option value="" selected>(tuned by pedal)</option>'}${notes.join('')}</select></label></div>`;
    }).join('');
    $('prSlots').querySelectorAll('[data-size]').forEach(s => s.addEventListener('change', () => {
      const i = +s.dataset.size, x = cfg().drums[i], m = Math.round(midiOf(i)); cfg().drums[i] = drumAt(s.value, D.label(m).replace('♭', 'b').replace('♯', '#')); save(); T.damp(key(i)); draw(); drawSetup();
    }));
    $('prSlots').querySelectorAll('[data-note]').forEach(s => s.addEventListener('change', () => {
      if (s.value === '') return; const i = +s.dataset.note, d = D.byId(cfg().drums[i].id);
      cfg().drums[i].pedal = D.pedalFor(d, +s.value); cfg().drums[i].fine = 0; save(); T.setFreq(key(i), freqOf(i)); draw(); drawSetup();
    }));
    const seg = (id, attr, val) => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset[attr] === String(val) ? 'true' : 'false'));
    seg('prOrder', 'order', p.order); seg('prKeys', 'keys', p.keys); seg('prGauge', 'gauge', p.gauge ? 1 : 0);
  }
  function openSetup() { drawSetup(); const ov = $('prSetup'); ov.hidden = false; A.UI.layer.open(ov, {trap: true, onEsc: closeSetup, focus: '#prSetupDone'}); }
  function closeSetup() { const ov = $('prSetup'); if (ov.hidden) return; ov.hidden = true; A.UI.layer.close(ov); }
  $('prOrder').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().order = b.dataset.order; save(); draw(); drawSetup(); });
  $('prKeys').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().keys = b.dataset.keys; save(); draw(); drawSetup(); });
  $('prGauge').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cfg().gauge = b.dataset.gauge === '1'; save(); draw(); drawSetup(); });
  $('prSetupDone').addEventListener('click', closeSetup);
  $('prSetupBtn').addEventListener('click', openSetup);
  $('prClickBtn').addEventListener('click', () => setClick(!S.clickOn));
  $('prTempo').addEventListener('input', () => { cfg().tempo = +$('prTempo').value; $('prTempoVal').textContent = cfg().tempo; saveSoon(); });
  $('prDyn').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDyn(b.dataset.dyn); });
  $('prShow').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setShow(b.dataset.show); });
  $('prEtudeSel').innerHTML = etudes.map((e, k) => `<option value="${e.etude.id}">${k + 1}. ${e.etude.name}</option>`).join('');
  $('prEtudeSel').addEventListener('change', () => showEtude($('prEtudeSel').value));
  $('prHear').addEventListener('click', () => startEtude('hear'));
  $('prAlong').addEventListener('click', () => startEtude('along'));
  $('prStop').addEventListener('click', () => { stopRun(); endEtudeUI(); lightNote(null); });
  $('prPct').addEventListener('input', () => { $('prPctVal').textContent = $('prPct').value + ' %'; });
  ['prLoop', 'prEClick'].forEach(id => $(id).addEventListener('click', () => { const b = $(id); b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }));
  $('prCF').addEventListener('click', () => { if (cfg().drums.length < 2) setCount(2); applyPreset('cf'); });

  /* ================= THE PRACTICE-TIME LOG: gameData('pedal-point').playS['YYYY-MM-DD'] = seconds really playing
     (the room open, the page visible, something played in the last activeS seconds), the last keepDays days ======== */
  function tick() {
    const now = performance.now(), dt = S.lastTick ? (now - S.lastTick) / 1000 : 0;
    S.lastTick = now;
    if (S.open && !document.hidden && dt > 0 && dt <= 1.5 && (now - S.lastActive) / 1000 < PRACTICE.activeS) {
      S.unsaved += dt;
      if (S.unsaved >= PRACTICE.saveEveryS) flush();
    }
  }
  function flush() {
    if (!(S.unsaved > 0)) return;
    const g = gd(), log = g.playS || (g.playS = {}), k = A.store.dayKey();
    log[k] = Math.round(((log[k] || 0) + S.unsaved) * 10) / 10; S.unsaved = 0;
    Object.keys(log).sort().slice(0, -PRACTICE.keepDays).forEach(x => delete log[x]);
    save();
  }
  setInterval(tick, 500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { flush(); Object.keys(S.presses).forEach(id => release(id)); setClick(false); stopRun(); } });
  addEventListener('pagehide', flush);

  /* ================= OPEN / CLOSE (game.js's LEVELS | PRACTICE switch) ================= */
  function open() {
    S.open = true;
    const p = cfg();
    $('practice').hidden = false; document.body.classList.add('pr-open');
    $('prTempo').value = p.tempo; $('prTempoVal').textContent = p.tempo;
    setDyn(p.dyn);
    draw();
    setShow(p.show === 'etude' || p.show === 'sheet' ? p.show : 'none');
    S.lastTick = performance.now();
  }
  function close() {
    if (!S.open) return;
    flush(); S.open = false;
    Object.keys(S.presses).forEach(id => release(id)); setClick(false); stopRun(); T.stopAll(); closeSetup();
    $('practice').hidden = true; document.body.classList.remove('pr-open');
  }

  A.PPPractice = {open, close, PRACTICE};
  A.PedalPoint = A.PedalPoint || {};
  A.PedalPoint.practice = {
    PRACTICE, SheetDB, etudes, open, close, applyPreset, setCount, select, setPedal, setFine, setShow, setDyn, setClick, showEtude,
    openSetup, closeSetup, plan: (id, o) => plan(etudes.find(e => e.etude.id === id), o || {}), judge, assign: id => assign(etudes.find(e => e.etude.id === id)),
    press, release, muffle, stroke, startEtude, stop: () => { stopRun(); endEtudeUI(); },
    /** PLAY ALONG in ?demo: a hit on drum i at `rel` s from the first note, held `hold` s */
    attack: (i, rel, hold = 0) => { const run = S.run; if (!run || run.kind !== 'along') return false; run.attacks.push({rel, drum: i, hold}); return true; },
    flush, centerOf,
    /** tests: end the running HEAR IT / PLAY ALONG now, as if it had played to its end (PLAY ALONG is judged) */
    endNow: () => { if (S.run && S.run.tr) S.run.tr.stop(false); },
    state: () => ({open: S.open, cfg: JSON.parse(JSON.stringify(cfg())), order: order().map(o => o.i), sel: S.sel, dyn: S.dyn, show: S.show,
      drums: cfg().drums.map((x, i) => ({id: x.id, pedal: x.pedal, fine: x.fine, freq: freqOf(i), midi: midiOf(i)})),
      presses: Object.values(S.presses).map(p => ({i: p.i, id: p.id, rolling: p.rolling, n: p.n || 0})),
      click: S.clickOn, run: S.run ? {kind: S.run.kind, pass: S.run.pass, log: S.run.tr ? S.run.tr.log.slice() : [], lead: S.run.lead, endS: S.run.PL ? S.run.PL.endS : null, attacks: (S.run.attacks || []).slice(), J: S.run.J || null} : null,
      etude: S.etude ? S.etude.etude.id : null, passes: S.passes || 0, etudesBest: JSON.parse(JSON.stringify(gd().etudes || {})), badges: S.badges || null, result: $('prResult').textContent, lastResult: S.lastResult || null,
      sheet: {id: S.sheetId, type: S.sheetType, url: S.sheetURL, zoom: Object.assign({}, S.zoom), tip: !$('prPdfTip').hidden},
      playS: Object.assign({}, gd().playS || {}), unsaved: S.unsaved}),
  };
})(window.Arcade);
