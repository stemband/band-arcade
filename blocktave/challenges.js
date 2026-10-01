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

  /* ---------- THE NOTE LAYOUT: every Blocktave staff with several notes (the cards, Scale Veins, the scale question,
     the Composer rows and the Conductor's Podium) is laid out HERE, never with numbers of its own (rules.js: staffLead,
     staffGap, staffAccRoom, staffMinW, noteMinPx, staffTail).
     · the first note's box (its ledger lines, or its ♯ / ♭ / ♮) starts staffLead after the clef + key signature;
     · notes are staffGap apart (center to center), + staffAccRoom in front of one with an accidental;
     · a staff is at least staffMinW wide (when the screen has room): 1–3 notes are CENTERED in the space after the clef,
       4 or more are spread EVENLY across it (the gaps only grow, never under staffGap);
     · the drawing is never shown so small that a notehead is under noteMinPx tall: when the notes can't fit across the
       card at that size (phones), they WRAP onto more staff rows (each with its own clef and key signature), all rows the
       same width so every row has the same size. */
  const HEAD_H = 13.85;                                           // a notehead's height in staff units (shared/ui.js: rx 9, ry 6.6, turned 20°)
  const CLEF_R = {treble: 60, bass: 66}, SIG_R = {treble: 70, bass: 76};   // the clef's right edge; the first ♯/♭'s right edge (+12 each more)
  /** the right edge of the clef + key signature (staff units, measured with the GN Music font) */
  const headRight = (clef, sig) => sig && sig.count ? SIG_R[clef === 'bass' ? 'bass' : 'treble'] + (sig.count - 1) * 12 : CLEF_R[clef === 'bass' ? 'bass' : 'treble'];
  const leftOf = n => n.acc ? 32 : n.natural ? 28 : 15, RIGHT = 15;   // a note's box around its x: ledger lines ±15, an accidental 31 left
  /** how far right a note's box (accidental included) reaches past the one before: staffGap + staffAccRoom */
  const stepTo = n => R().staffGap + (n.acc || n.natural ? R().staffAccRoom : 0);
  /** {rows: [{from, to, xs}], W (units, every row), px (the drawing's smallest width on screen), scale (px per unit at least)}
      notes = the written notes as shown; opts {clef, sig, availPx (the room on screen for the drawing)} */
  function layoutNotes(notes, o = {}) {
    const r = R(), h0 = headRight(o.clef, o.sig), lead = r.staffLead, tail = r.staffTail, minScale = r.noteMinPx / HEAD_H;
    const maxUnits = o.availPx ? o.availPx / minScale : Infinity;
    // a row's natural width: the first box at h0 + lead, then one step per note
    const need = list => {
      if (!list.length) return {xs: [], span: [h0, h0], W: h0 + lead + tail};
      let x = h0 + lead + leftOf(list[0]); const xs = [x];
      for (let k = 1; k < list.length; k++) { x += stepTo(list[k]); xs.push(x); }
      const span = [xs[0] - leftOf(list[0]), x + RIGHT];
      return {xs, span, W: list.length <= 3 ? span[1] + lead + 8 : span[1] + tail};   // 1–3 notes: as much room after them as before
    };
    let nRows = 1;
    const split = n => { const per = Math.ceil(notes.length / n), out = []; for (let k = 0; k < notes.length; k += per) out.push([k, Math.min(notes.length, k + per)]); return out.length ? out : [[0, 0]]; };
    const widest = n => Math.max(...split(n).map(([a, b]) => need(notes.slice(a, b)).W));
    while (nRows < 4 && nRows < notes.length && widest(nRows) > maxUnits) nRows++;
    const W = Math.max(widest(nRows), Math.min(r.staffMinW, maxUnits));
    const rows = split(nRows).map(([from, to]) => {
      const list = notes.slice(from, to), m = need(list);
      if (!list.length) return {from, to, xs: []};
      let xs = m.xs;
      if (list.length <= 3) {                                    // short groups: centered in the space after the clef
        const mid = (h0 + W - 8) / 2, shift = Math.max(0, mid - (m.span[0] + m.span[1]) / 2);
        xs = xs.map(x => x + shift);
      } else {                                                   // longer groups: spread evenly across the staff
        const extra = Math.max(0, (W - tail) - m.span[1]), g = extra / (list.length - 1);
        xs = xs.map((x, k) => x + g * k);
      }
      return {from, to, xs};
    });
    return {rows, W, px: W * minScale, scale: minScale, head: h0};
  }
  /** the staff rows' SVG for a list of items {n (the note as shown), color?, caption?}; opts {clef, sig, fit, availPx,
      captions, label, id (each note's id = id + its index)}. Returns {html, px (the drawing's smallest width), rows, W}. */
  function staffRows(items, o = {}) {
    const L = layoutNotes(items.map(it => it.n), o), fit = o.fit || items.map(it => it.n);
    const html = L.rows.map((row, r) => `<div class="bt-srow">${A.staffSVG(o.clef, items.slice(row.from, row.to).map((it, k) => ({
      n: it.n, x: row.xs[k], id: o.id ? o.id + (row.from + k) : undefined, color: it.color, caption: it.caption || ''})),
      {fit, keySig: o.sig, width: L.W, captions: !!o.captions, label: (o.label || 'The notes') + (L.rows.length > 1 ? ` (line ${r + 1} of ${L.rows.length})` : '')})}</div>`).join('');
    return {html, px: L.px, rows: L.rows, W: L.W};
  }
  /** the room a card's staff has on this screen (px): a sheet along the bottom on narrow screens, else up to 92vw */
  const sheetMode = () => innerWidth <= 760;
  const CARD_CHROME = () => sheetMode() ? 20 : 32;                 // the card's padding + border + the staff box's padding (style.css)
  const cardRoom = () => (sheetMode() ? Math.min(560, innerWidth - 16) : innerWidth * .92) - CARD_CHROME();
  /** size the card to its staff: as wide as the notes need at noteMinPx (never under its usual width, never over 92vw) */
  function fitCard(c, px) {
    if (sheetMode()) { c.el.style.width = ''; return; }
    const base = c.el.classList.contains('wide') ? 480 : 380;
    c.el.style.width = Math.round(Math.min(innerWidth * .92, Math.max(base, px + CARD_CHROME()))) + 'px';
  }

  /* ---------- NOTES (played in order) ---------- */
  function staffFor(c) {
    const o = c.o, items = o.items, cap = o.hint;
    const s = staffRows(items.map((it, k) => ({n: it.show, color: k < c.i ? '#0f8a5f' : k === c.i ? '#1d4fd8' : undefined, caption: cap ? it.label : ''})),
      {clef: o.clef, sig: o.sig, fit: o.fit || items.map(it => it.show), availPx: cardRoom(), captions: !!cap, label: 'The notes to play', id: 'btn'});
    fitCard(c, s.px);
    return s.html;
  }
  const KINDS = {
    notes(c) {
      const o = c.o, items = o.items;
      const draw = () => { c.body.innerHTML = `<div class="bt-staff">${staffFor(c)}</div>` + (items.length > 1 ? `<p class="bt-prog">${c.i} / ${items.length}</p>` : ''); };
      c.el.classList.toggle('wide', items.length > 4);
      draw();
      c.redraw = draw;                                                   // a turned / resized screen: laid out again
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
      // "Name this scale": the notes with their own accidentals (no key signature), laid out like every other staff
      c.el.classList.toggle('wide', !asSig);
      let staff;
      if (asSig) staff = A.staffSVG(o.clef, [], {fit: pick.up.slice(0, 1).map(n => n.show), keySig: pick.sig, width: 200, label: 'A key signature'});
      else { const s = staffRows(pick.up.map(n => ({n})), {clef: o.clef, fit: pick.up, availPx: cardRoom(), label: 'A scale', id: 'btn'}); staff = s.html; fitCard(c, s.px); }
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
      const shown = +(+secs).toFixed(1);                                        // (the Baton's 3 × 0.7 = 2.1, never 2.0999999999999996)
      c.say.textContent = o.mode === 'inst' ? `An even roll for ${shown} seconds: steady hits, at least ${rate} a second.` : `Tap an even roll for ${shown} seconds: steady taps, at least ${rate} a second.`;
      const bar = c.body.querySelector('.bt-hold i'), ce = c.body.querySelector('.bt-cents');
      let hits = [];
      const hit = t => { if (c.done || c.paused) return; hits.push(t); };
      c.onHit = hit; tapPad(c, hit);
      let prev = 0;                                                            // the last frame's time: the bar counts REAL time
      c.onPause = () => { hits = []; prev = 0; };
      loop(c, now => {
        const dt = prev ? Math.min(250, now - prev) : 16; prev = now;          // (a slow device's frames: the same seconds as at 60 fps)
        hits = hits.filter(t => now - t < 1000);                                // the last second
        const gaps = hits.slice(1).map((t, k) => t - hits[k]), avg = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
        const cv = gaps.length > 2 ? Math.sqrt(gaps.reduce((a, g) => a + (g - avg) ** 2, 0) / gaps.length) / avg : 1;
        const fast = hits.length >= rate, even = cv <= maxCv;
        c.got = (c.got || 0) + (fast && even ? dt : -1.5 * dt);             // ms of even roll (losing it drains 1.5× as fast)
        c.got = Math.max(0, c.got);
        bar.style.transform = `scaleX(${Math.min(1, c.got / (secs * 1000))})`;
        ce.textContent = !hits.length ? 'Start rolling!' : !fast ? 'Faster!' : !even ? 'Smooth it out: even hits!' : 'Even and steady!';
        if (c.got >= secs * 1000) finish(c, true);
      });
      // tests: an even roll, kept up until the card is done (at most 30 s), so a busy machine's late timers or slow
      // frames only make it take longer, never fail
      c.answer = () => {
        const gap = 1000 / (rate + 3), end = performance.now() + 30000;
        const tap = () => { if (C !== c || c.done || performance.now() > end) return; if (o.mode === 'inst' && A.Onsets) A.Onsets.fake(); else hit(performance.now()); setTimeout(tap, gap); };
        tap();
      };
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
  addEventListener('resize', () => { if (C) { if (C.redraw) C.redraw(); place(C.el, C.o.at); } });

  A.BlocktaveCard = {open, close: () => close(), get current() { return C && api(C); }, label, layoutNotes, staffRows, headRight,
    /** keep the open card beside its block as the camera moves (the game calls it a few times a second) */
    follow() { if (C && typeof C.o.at === 'function') place(C.el, C.o.at); }};
})(window.Arcade);
