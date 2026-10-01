/* BLOCKTAVE: THE CHALLENGE CARD (Arcade.BlocktaveCard). A small card next to a block (or a creature, or the Measure's
   PERFORM button) that asks for one short performance. Every number is in rules.js.
     const card = Arcade.BlocktaveCard.open({kind, mode, title, sub, at: {x, y} (screen px), onDone({ok, why}), …})
   KINDS (INSTRUMENT mode = the microphone; TOUCH mode = the screen, no instrument):
     notes    items (buildSequence items) played IN ORDER: INSTRUMENT Pitch.onHeld (the concert pitch class), TOUCH the
              answer pad (shared/answer-pad.js: the written name as shown, key signature included). Tone Ore, Scale Veins,
              the Night Clams, the recipes' 'note' / 'notes3' / 'scale', a Composer row's melody.
     sustain  one steady, in-tune note for `secs` (INSTRUMENT: cents from reading.midi, like Arcade Quest's long tone)
     key      TOUCH's long tone: "Which key signature is this?" / "Name this scale" (shared/scales.js), 4 choices
     rhythm   a rhythm (Mr. Graham's Counting under a one-line staff) after a SILENT count-in (a pulsing light: nothing plays
              while the microphone listens). INSTRUMENT: shared/onsets.js (claps, drum hits, tongued notes); TOUCH: the TAP
              pad or Space. Judged by shared/rhythm-judge.js, minus the device's timing check (shared/calibration.js).
              Rhythm Rock, Rest Crystals (the rests must stay silent), the Metronome's 4 beats, Rushers, the snare.
     count    SNARE: exactly n hits, then stop (Tone Ore)
     roll     SNARE: an EVEN ROLL for `secs` (Sustain Stone, Sour Wisps)
   A wrong answer shakes the card (the caller keeps the block). hint: true = the note names show under the staff.
   card.close() · card.pause() / resume() · card.answer() (?demo / tests: the right answer through the real judging) ·
   card.want() (the note it waits for) · card.state() */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const R = () => window.BT_RULES;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const SIGN = {'-1': '♭', 0: '', 1: '♯'};
  const label = n => n.letter + SIGN[n.acc || 0];
  let C = null;                                                   // the open card

  /* the microphone listeners: subscribed once, they feed whichever card is open */
  let wired = false;
  function wire() {
    if (wired || !A.Pitch) return; wired = true;
    A.Pitch.onHeld(pc => { if (C && C.onHeld) C.onHeld(pc); });
    A.Pitch.onFrame((r, level, now) => { if (C && C.onFrame) C.onFrame(r, level, now); });
    if (A.Onsets) A.Onsets.listen(o => { if (C && C.onHit && C.o.mode === 'inst') C.onHit(o.time, o.level); });
  }

  function layer() {
    let l = document.getElementById('btCards');
    if (!l) { l = document.createElement('div'); l.id = 'btCards'; l.className = 'bt-cards'; document.body.appendChild(l); }
    return l;
  }
  /** put the card beside the point (x, y) on screen, fully on screen; narrow screens: a sheet along the bottom */
  function place(el, at) {
    if (typeof at === 'function') at = at();                   // a point that moves with the world (the camera follows the player)
    const W = innerWidth, H = innerHeight;
    el.classList.toggle('sheet', W <= 760 || !at);
    if (W <= 760 || !at) { el.style.left = el.style.top = ''; return; }
    const r = el.getBoundingClientRect(), gap = 28;
    let x = at.x + gap, y = at.y - r.height / 2;
    if (x + r.width > W - 8) x = at.x - gap - r.width;
    x = Math.max(8, Math.min(W - r.width - 8, x)); y = Math.max(64, Math.min(H - r.height - 8, y));
    const L = Math.round(x), T = Math.round(y), l0 = parseFloat(el.style.left), t0 = parseFloat(el.style.top);
    if (isNaN(l0) || Math.abs(L - l0) > 40 || Math.abs(T - t0) > 40) { el.style.left = L + 'px'; el.style.top = T + 'px'; }   // small moves: stay put
  }

  function open(o) {
    close(true);
    wire();
    const el = document.createElement('div');
    el.className = 'bt-card k-' + o.kind + (o.mode === 'inst' ? ' inst' : ' touch');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.title || 'Challenge');
    el.innerHTML = `<div class="bt-card-h"><div><b>${esc(o.title || '')}</b><small>${esc(o.sub || '')}</small></div>` +
      `<button type="button" class="bt-x" aria-label="Close">✕</button></div>` +
      `<div class="bt-card-b"></div><p class="bt-card-say" aria-live="polite"></p><div class="bt-card-f"></div>`;
    layer().appendChild(el);
    const card = C = {o, el, body: el.querySelector('.bt-card-b'), say: el.querySelector('.bt-card-say'), foot: el.querySelector('.bt-card-f'),
      i: 0, done: false, paused: false, raf: 0, t0: performance.now()};
    el.querySelector('.bt-x').addEventListener('click', () => { if (C === card) { const f = o.onCancel; close(); if (f) f(); } });
    KINDS[o.kind](card);
    place(el, o.at);
    return api(card);
  }
  function api(card) {
    return {
      close: () => { if (C === card) close(); },
      pause: () => { if (C === card && !card.paused) { card.paused = true; if (card.onPause) card.onPause(); } },
      resume: () => { if (C === card && card.paused) { card.paused = false; if (card.onResume) card.onResume(); } },
      answer: () => { if (C === card && card.answer) card.answer(); },
      want: () => card.want ? card.want() : null,
      state: () => ({kind: card.o.kind, i: card.i, done: card.done, paused: card.paused, phase: card.phase || null, hint: !!card.o.hint}),
      get open() { return C === card; },
      el: card.el,
    };
  }
  function close(silent) {
    if (!C) return;
    const c = C; C = null;
    cancelAnimationFrame(c.raf); clearTimeout(c.tm);
    if (A.Pitch && A.DEMO) A.Pitch.demoNote = null;
    c.el.remove();
    if (!silent && c.o.onClose) c.o.onClose();
  }
  /** the end of a card: right = a quick glow, wrong = a shake (rules.js wrongShowMs), then onDone */
  function finish(c, ok, why) {
    if (c.done) return;
    c.done = true;
    cancelAnimationFrame(c.raf);
    if (A.Pitch && A.DEMO) A.Pitch.demoNote = null;
    c.el.classList.add(ok ? 'good' : 'bad');
    if (why) c.say.textContent = why;
    c.tm = setTimeout(() => { if (C === c) { C = null; c.el.remove(); } c.o.onDone && c.o.onDone({ok, why}); }, ok ? 380 : R().wrongShowMs);
  }
  const loop = (c, fn) => { const tick = now => { if (C !== c || c.done) return; if (!c.paused) fn(now); c.raf = requestAnimationFrame(tick); }; c.raf = requestAnimationFrame(tick); };

  /* ---------- NOTES (played in order) ---------- */
  /** where each note of a card's staff goes: every note gets rules.js staffGap, plus staffAccRoom in front of one with a
      ♯ / ♭ / ♮, so an accidental never touches the notehead before it (nor its own: shared/ui.js draws it 31 units to
      the left of its head). x0 = the first note's spot without an accidental. Returns {xs, end} (end = after the last). */
  function spaceNotes(notes, x0) {
    const xs = []; let x = x0;
    notes.forEach(n => { if (n.acc || n.natural) x += R().staffAccRoom; xs.push(x); x += R().staffGap; });
    return {xs, end: x - R().staffGap};
  }
  function staffFor(c) {
    const o = c.o, items = o.items, x0 = 78 + A.keySigWidth(o.sig);
    const sp = spaceNotes(items.map(it => it.show), x0), W = Math.max(260, sp.end + 34);
    const cap = o.hint;
    return A.staffSVG(o.clef, items.map((it, k) => ({n: it.show, x: items.length > 1 ? sp.xs[k] : Math.max(sp.xs[0], (x0 + W) / 2 - 10), id: 'btn' + k,
      color: k < c.i ? '#0f8a5f' : k === c.i ? '#1d4fd8' : undefined, caption: cap ? it.label : ''})),
    {fit: o.fit || items.map(it => it.show), keySig: o.sig, width: W, captions: !!cap, label: 'The notes to play'});
  }
  const KINDS = {
    notes(c) {
      const o = c.o, items = o.items;
      const draw = () => { c.body.innerHTML = `<div class="bt-staff">${staffFor(c)}</div>` + (items.length > 1 ? `<p class="bt-prog">${c.i} / ${items.length}</p>` : ''); };
      c.el.classList.toggle('wide', items.length > 4);
      draw();
      c.want = () => items[c.i];
      const right = () => { c.i++; draw(); if (c.i >= items.length) finish(c, true); };
      const wrong = got => finish(c, false, got ? `That's ${got}. The block stays: try again!` : 'Not quite. The block stays: try again!');
      if (o.mode === 'inst') {
        c.say.textContent = items.length > 1 ? 'Play the notes in order on your instrument.' : 'Play this note on your instrument.';
        c.onHeld = pc => { if (c.done || c.paused) return; if (pc === items[c.i].pc) right(); else wrong(o.nameOf ? o.nameOf(pc) : null); };
        c.answer = () => { while (!c.done && c.i < items.length) c.onHeld(items[c.i].pc); };
        if (A.Pitch) A.Pitch.ignoreCurrent();
      } else {
        c.say.textContent = items.length > 1 ? 'Tap the note names in order.' : 'Tap the note name.';
        const accs = items.some(it => it.n.acc);
        const pad = A.AnswerPad.mount(c.foot, {accs, relabel: true, cls: 'bt-apad', onAnswer: (l, a) => {
          if (c.done || c.paused) return;
          const n = items[c.i].n;
          if (l === n.letter && a === (n.acc || 0)) right(); else wrong(l + SIGN[a]);
        }});
        A.holdGuard && A.holdGuard(c.foot);
        c.pad = pad;
        c.onKey = e => { const k = e.key.toUpperCase(); if (/^[A-G]$/.test(k)) { pad.press(k, e); return true; } return false; };
        c.answer = () => { while (!c.done && c.i < items.length) { const n = items[c.i].n; pad.setAcc(n.acc || 0); pad.press(n.letter, {timeStamp: performance.now()}); } };
      }
    },

    /* ---------- SUSTAIN (INSTRUMENT: one steady in-tune note) ---------- */
    sustain(c) {
      const o = c.o, it = o.items[0], need = o.secs * 1000, tol = o.cents || R().sustainCents;
      c.body.innerHTML = `<div class="bt-staff">${A.staffSVG(o.clef, [{n: it.show, x: 190, caption: o.hint ? it.label : ''}], {fit: o.fit || [it.show], keySig: o.sig, width: 300, captions: !!o.hint})}</div>` +
        `<div class="bt-hold"><i></i></div><p class="bt-cents">–</p>`;
      c.say.textContent = `Hold this note steady and in tune for ${o.secs} seconds.`;
      const bar = c.body.querySelector('.bt-hold i'), ce = c.body.querySelector('.bt-cents');
      let got = 0, last = 0, lastGood = 0;
      c.want = () => it;
      c.onFrame = (r, level, now) => {
        if (c.done || c.paused) { last = now; return; }
        const dt = last ? Math.min(100, now - last) : 0; last = now;
        if (A.Pitch.isSuppressed(now)) return;
        const dev = r ? (((r.midi - it.pc) % 12 + 18) % 12 - 6) * 100 : null;
        const on = dev != null && Math.abs(dev) <= tol;
        if (on) { got += dt; lastGood = now; } else if (now - lastGood > R().sustainGraceMs) got = Math.max(0, got - dt * 2);
        bar.style.transform = `scaleX(${Math.min(1, got / need)})`;
        ce.textContent = dev == null ? '–' : on ? 'In tune!' : dev > 0 ? 'A little sharp' : 'A little flat';
        ce.className = 'bt-cents ' + (on ? 'good' : dev != null ? 'bad' : '');
        if (got >= need) finish(c, true);
      };
      c.answer = () => { if (A.Pitch) { A.Pitch.demoNote = it.sounding; } };
    },

    /* ---------- KEY (TOUCH's long tone): a key signature or a scale to name ---------- */
    key(c) {
      const o = c.o, S = A.Scales, ids = S.LIST.map(s => s.id).filter(id => id !== 'chrom');
      const all = ids.map(id => S.build(o.member, id)), pick = all.find(s => s.id === o.scale) || all[Math.floor(Math.random() * all.length)];
      const asSig = o.ask ? o.ask === 'sig' : Math.random() < .5;
      // "Name this scale": the notes with their own accidentals (no key signature), each spaced by its own width
      const sp = spaceNotes(pick.up, 76);
      const staff = asSig
        ? A.staffSVG(o.clef, [], {fit: pick.up.slice(0, 1).map(n => n.show), keySig: pick.sig, width: 200, label: 'A key signature'})
        : A.staffSVG(o.clef, pick.up.map((n, k) => ({n, x: sp.xs[k]})), {fit: pick.up, width: sp.end + 30, label: 'A scale'});
      c.el.classList.toggle('wide', !asSig);
      c.body.innerHTML = `<div class="bt-staff">${staff}</div>`;
      c.say.textContent = asSig ? 'Which key signature is this?' : 'Name this scale.';
      const order = all.slice().sort(() => Math.random() - .5);
      c.foot.innerHTML = `<div class="bt-choices">${order.map(s => `<button type="button" class="btn btn-secondary btn-small" data-id="${s.id}">${esc(s.key)}</button>`).join('')}</div>`;
      c.foot.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        if (c.done || c.paused) return;
        if (b.dataset.id === pick.id) { b.classList.add('good'); finish(c, true); }
        else { b.classList.add('bad'); finish(c, false, `That was ${pick.key}. The block stays: try again!`); }
      }));
      c.answer = () => c.foot.querySelector(`[data-id="${pick.id}"]`).click();
      c.pick = pick;
    },

    /* ---------- RHYTHM (and rests): a silent count-in, then the measure; judged by shared/rhythm-judge.js ---------- */
    rhythm(c) {
      const o = c.o, Cn = A.Counting, RR = R().rhythm, time = o.time || '4/4';
      const p = Cn.parse(o.text, time), groups = Cn.groups(p), M = p.meter;
      const beatS = 60 / (o.bpm || RR.bpm), tickS = beatS / 12;
      const eng = A.RhythmStaff.engrave(p, {counting: true, id: 'btr'});
      c.body.innerHTML = `<div class="bt-rstaff">${eng.svg}</div><div class="bt-count" aria-live="polite"><b class="bt-beat"></b><span class="bt-dots">${Array.from({length: M.num}, () => '<i></i>').join('')}</span></div>`;
      const svg = c.body.querySelector('svg');
      if (A.RhythmStaff.refine) try { A.RhythmStaff.refine(c.body); } catch (e) { /* the estimate is fine */ }
      const ph = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ph.setAttribute('class', 'bt-ph'); ph.setAttribute('y1', '0'); ph.setAttribute('y2', String(eng.h)); svg.appendChild(ph);
      const targets = Cn.attacks(groups).map(g => ({t: g.t * tickS, g: g.g}));
      const lag = () => (A.Calibration ? A.Calibration.lag(o.mode === 'inst' ? 'clap' : 'tap') : 0) || 0;
      const rests = o.kind === 'rest' || /r/.test(o.text);
      c.say.textContent = o.mode === 'inst' ? (o.snare ? 'Watch the count-in light, then play the rhythm.' : 'Watch the count-in light, then play (or clap) the rhythm.')
        : 'Watch the count-in light, then TAP the rhythm.';
      if (o.mode !== 'inst') {
        c.foot.innerHTML = `<button type="button" class="bt-tap" aria-label="Tap">TAP</button>`;
        const tap = c.foot.querySelector('.bt-tap');
        A.holdGuard && A.holdGuard(tap, {lock: true});
        tap.addEventListener('pointerdown', e => { e.preventDefault(); hit(performance.now()); tap.classList.remove('hit'); void tap.offsetWidth; tap.classList.add('hit'); });
        c.onKey = e => { if (e.key === ' ' || e.key === 'Enter') { hit(performance.now()); return true; } return false; };
      }
      let start = 0, hits = [];
      const begin = () => { start = performance.now() / 1000 + RR.leadS; hits = []; c.phase = 'count'; };
      const t0 = () => start + M.num * beatS;                                 // the rhythm starts after one measure
      const endS = () => t0() + p.total * tickS + RR.lateMs / 1000;
      function hit(perf) { if (c.done || c.paused || !start) return; hits.push((perf - lag()) / 1000); c.el.classList.remove('hitfx'); void c.el.offsetWidth; c.el.classList.add('hitfx'); }
      c.onHit = t => hit(t);
      c.onPause = () => { start = 0; c.phase = 'wait'; };
      c.onResume = () => begin();
      const beatEl = c.body.querySelector('.bt-beat'), dots = [...c.body.querySelectorAll('.bt-dots i')];
      begin();
      loop(c, now => {
        const s = now / 1000;
        if (!start) return;
        const inCount = s < t0(), k = Math.floor((s - start) / beatS);
        if (s >= start && inCount) {
          c.phase = 'count';
          beatEl.textContent = String(k + 1); dots.forEach((d, j) => d.classList.toggle('on', j === k));
          c.el.style.setProperty('--pulse', String(Math.max(0, 1 - ((s - start) % beatS) / beatS)));
        } else if (!inCount) {
          c.phase = 'play';
          const bt = Math.floor((s - t0()) / beatS) % M.num;
          beatEl.textContent = s < t0() + p.total * tickS ? '' : ''; dots.forEach((d, j) => d.classList.toggle('on', j === bt));
          c.el.style.setProperty('--pulse', String(Math.max(0, 1 - ((s - t0()) % beatS) / beatS)));
          const tick = Math.min(p.total, (s - t0()) / tickS);
          const x = eng.xAt ? eng.xAt(tick) : 0; ph.setAttribute('x1', x); ph.setAttribute('x2', x);
        }
        if (s >= endS()) judge();
      });
      function judge() {
        const base = t0(), attacks = hits.map(h => ({rel: h - base})).filter(a => a.rel >= -RR.lateMs / 1000 - .05);
        const res = A.RhythmJudge.match(targets, attacks, RR);
        const ok = res.tg.filter(t => ['perfect', 'good', 'ok'].includes(t.res)).length;
        const pass = ok / Math.max(1, res.tg.length) >= RR.pass - 1e-9 && !res.extras.length;
        c.res = res;
        const early = res.tg.filter(t => t.res === 'early').length, late = res.tg.filter(t => t.res === 'late').length, miss = res.tg.filter(t => t.res === 'miss').length;
        finish(c, pass, pass ? null : res.extras.length ? (rests ? 'A sound in a rest! Rests stay silent. Try again!' : 'An extra hit! Try again!')
          : miss ? 'A note was missed. Try again!' : early > late ? 'A little early! Stay with the pulse.' : 'A little late! Stay with the pulse.');
      }
      c.answer = () => {                                                      // tests: every note right on time
        const go = () => targets.forEach(t => setTimeout(() => { const at = (t0() + t.t) * 1000 + lag(); if (o.mode === 'inst' && A.Onsets) A.Onsets.fake(at); else hit(at); }, Math.max(0, (t0() + t.t) * 1000 - performance.now())));
        go();
      };
      c.targets = targets;
    },

    /* ---------- COUNT (snare): exactly n hits, then stop ---------- */
    count(c) {
      const o = c.o, n = o.n, confirm = R().snareConfirmMs;
      c.body.innerHTML = `<div class="bt-bigcount"><b>× ${n}</b><span class="bt-hits"></span></div>`;
      c.say.textContent = o.mode === 'inst' ? `Play exactly ${n} hits, then STOP.` : `Tap exactly ${n} times, then STOP.`;
      const hitsEl = c.body.querySelector('.bt-hits');
      let got = 0, lastAt = 0;
      const hit = t => { if (c.done || c.paused) return; got++; lastAt = t; hitsEl.textContent = '●'.repeat(Math.min(got, 12)); if (got > n) finish(c, false, 'Too many! Count your hits and stop. Try again!'); };
      c.onHit = hit;
      tapPad(c, hit);
      loop(c, now => { if (got === n && now - lastAt >= confirm) finish(c, true); });
      c.answer = () => { for (let k = 0; k < n; k++) setTimeout(() => { if (o.mode === 'inst' && A.Onsets) A.Onsets.fake(); else hit(performance.now()); }, k * 260); };
    },

    /* ---------- ROLL (snare): fast AND even for `secs` ---------- */
    roll(c) {
      const o = c.o, secs = o.secs || R().rollS, rate = o.rate || R().rollRate, maxCv = R().rollMaxCv;
      c.body.innerHTML = `<div class="bt-hold"><i></i></div><p class="bt-cents">Start rolling!</p>`;
      c.say.textContent = o.mode === 'inst' ? `An even roll for ${secs} seconds: steady hits, at least ${rate} a second.` : `Tap an even roll for ${secs} seconds: steady taps, at least ${rate} a second.`;
      const bar = c.body.querySelector('.bt-hold i'), ce = c.body.querySelector('.bt-cents');
      let hits = [];
      const hit = t => { if (c.done || c.paused) return; hits.push(t); };
      c.onHit = hit; tapPad(c, hit);
      c.onPause = () => { hits = []; };
      loop(c, now => {
        hits = hits.filter(t => now - t < 1000);                                // the last second
        const gaps = hits.slice(1).map((t, k) => t - hits[k]), avg = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
        const cv = gaps.length > 2 ? Math.sqrt(gaps.reduce((a, g) => a + (g - avg) ** 2, 0) / gaps.length) / avg : 1;
        const fast = hits.length >= rate, even = cv <= maxCv;
        c.got = (c.got || 0) + (fast && even ? 16 : -24);
        c.got = Math.max(0, c.got);
        bar.style.transform = `scaleX(${Math.min(1, c.got / (secs * 1000))})`;
        ce.textContent = !hits.length ? 'Start rolling!' : !fast ? 'Faster!' : !even ? 'Smooth it out: even hits!' : 'Even and steady!';
        if (c.got >= secs * 1000) finish(c, true);
      });
      c.answer = () => { const n = Math.ceil(secs * (rate + 3)) + 12; for (let k = 0; k < n; k++) setTimeout(() => { if (C !== c) return; if (o.mode === 'inst' && A.Onsets) A.Onsets.fake(); else hit(performance.now()); }, k * 1000 / (rate + 3)); };
    },
  };
  KINDS.rest = KINDS.rhythm;
  function tapPad(c, hit) {
    if (c.o.mode === 'inst') return;
    c.foot.innerHTML = `<button type="button" class="bt-tap" aria-label="Tap">TAP</button>`;
    const tap = c.foot.querySelector('.bt-tap');
    A.holdGuard && A.holdGuard(tap, {lock: true});
    tap.addEventListener('pointerdown', e => { e.preventDefault(); hit(performance.now()); });
    c.onKey = e => { if (e.key === ' ' || e.key === 'Enter') { hit(performance.now()); return true; } return false; };
  }

  /* keys: the answer pad's letters, TAP = Space (a card's keys never reach the world); ?demo: Space = the right note
     (INSTRUMENT: held = Pitch.demoNote), W = a wrong one */
  addEventListener('keydown', e => {
    if (!C || C.done || C.paused || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.body.classList.contains('ui-modal')) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') return;
    if (A.DEMO && C.o.mode === 'inst' && (k === ' ' || k === 'w') && C.want && !e.repeat) {
      const w = C.want(); if (w && A.Pitch) { A.Pitch.demoNote = k === ' ' ? w.sounding : w.sounding + 2; e.preventDefault(); e.stopImmediatePropagation(); return; }
    }
    if (A.DEMO && k === ' ' && !e.repeat && (C.o.kind === 'rhythm' || C.o.kind === 'rest' || C.o.kind === 'count' || C.o.kind === 'roll') && C.o.mode === 'inst' && A.Onsets) {
      A.Onsets.fake(); e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (C.onKey && !e.repeat && C.onKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener('keyup', e => { if (A.DEMO && C && A.Pitch && (e.key === ' ' || e.key.toLowerCase() === 'w')) A.Pitch.demoNote = null; });
  addEventListener('resize', () => { if (C) place(C.el, C.o.at); });

  A.BlocktaveCard = {open, close: () => close(), get current() { return C && api(C); }, label, spaceNotes,
    /** keep the open card beside its block as the camera moves (the game calls it a few times a second) */
    follow() { if (C && typeof C.o.at === 'function') place(C.el, C.o.at); }};
})(window.Arcade);
