/* ARCADE QUEST: the playing challenges. Each returns a Promise of a result:
     {acc 0–1 (how accurate), speed 0–1 (time left), correct (right notes / hits), total, success (acc ≥ 0.8)}
   Q.challenge.resolve(type, enemy)  the challenge this instrument can actually do (fallbacks below)
   Q.challenge.run(type, {enemy, harmonize})
   THE MICROPHONE LISTENS ONLY HERE: Q.listen(true) at the start of PLAY / LONG TONE / ARTICULATE / HARMONIZE and
   Q.listen(false) at the end (Pitch.pauseListening). VOCAB and FINGERING don't use the mic at all. The challenge
   clock stops while a sound is muting the mic (Pitch.isSuppressed).
   FALLBACKS: the Snare Drum can't play pitches: play/longtone/fingering -> articulate (count hits); Bells can't hold
   a long tone: longtone -> play; fingering without a chart (fingerings.js not loaded, or no entry) -> play;
   articulate without attack detection -> play; vocab without vocab.js -> play.
   ?demo: hold Space = the right note (PLAY, LONG TONE, HARMONIZE), W = a wrong note, S = a steady long tone,
   T (or Space) taps = attacks (ARTICULATE), V = auto-answer (VOCAB, FINGERING; F works for fingering too). */
(function (A) {
  "use strict";
  const Q = A.Quest;
  let inst, member, unpitched;
  Q.challengeSetup = (i, m) => { inst = i; member = m; unpitched = i.pitched === false; };

  /* ---------- listening on/off (the mic only listens during a playing challenge) ---------- */
  Q.listen = function (on) {
    A.Pitch.pauseListening(!on);
    Q.input.blocked = on;                                    // during a challenge, the demo keys belong to the pitch engine
    if (A.Sfx && A.Sfx.sync) A.Sfx.sync();                   // battle music stops while listening
    document.body.classList.toggle('q-listening', on);
    const tag = Q.$('qMicTag'); if (tag) tag.hidden = !on;
  };
  // one handler each for the pitch engine's events: the running challenge sets them
  let onHeld = null, onFrame = null, onAttack = null;
  A.Pitch.onHeld((pc, now, note) => { if (onHeld) onHeld(pc, now, note); });
  A.Pitch.onFrame((r, level, now) => { if (onFrame) onFrame(r, level, now); });
  if (A.Pitch.onAttack) A.Pitch.onAttack(a => { if (onAttack) onAttack(a); });

  /** the microphone is on (or ?demo stands in): true, or false if the student tapped Cancel on the mic prompt */
  Q.micReady = () => new Promise(res => {
    if (A.Pitch.active || A.Pitch.demoReady) return res(true);
    A.requireMic(() => res(true));
    const iv = setInterval(() => {
      const gate = document.getElementById('micGateTitle'), box = gate && gate.closest('.overlay');
      if (A.Pitch.active || A.Pitch.demoReady) clearInterval(iv);
      else if (box && box.hidden) { clearInterval(iv); res(false); }
    }, 250);
  });

  /* ---------- which challenge ---------- */
  const hasFingering = () => !!(A.Masher && window.MASHER_FINGERINGS && window.MASHER_FINGERINGS[member.id]);
  function resolve(type) {
    if (unpitched) return type === 'vocab' ? 'vocab' : 'articulate';
    if (type === 'longtone' && inst.id === 'bells') return 'play';
    if (type === 'fingering' && !hasFingering()) return 'play';
    if (type === 'articulate' && !A.Pitch.onAttack) return 'play';
    if (type === 'vocab' && !(window.VOCAB && window.VOCAB_BANKS)) return 'play';
    return type;
  }

  /* ---------- notes ---------- */
  function notes(enemy, count) {
    const pool = enemy.notes || 'first5';
    A.ModePicker.useRange({notes: pool, member});
    const seq = A.buildSequence({member, group: inst, notes: pool, order: enemy.order || 'random', level: 2, count, pool: 5});
    return Object.assign(seq, {items: seq.items.slice(0, count)});      // Scale Order gives the whole cycle: keep `count`
  }
  function happyNote(enemy) {
    A.Pitch.setRange(null);
    const seq = A.buildSequence({member, group: inst, notes: 'first5', order: 'order', count: 5});
    return {seq, item: seq.items[Math.max(0, Math.min(4, enemy.happy || 0))]};
  }
  Q.happyLabel = enemy => unpitched ? 'a steady beat' : happyNote(enemy).item.label;
  function staff(seq, items, cur, w0 = 110) {
    const sigW = A.keySigWidth(seq.sig), step = 62, width = w0 + sigW + items.length * step;
    const x0 = 84 + sigW + 22;
    return A.staffSVG(inst.clef, items.map((it, i) => ({n: it.show, x: x0 + i * step, id: 'qn' + i})), {fit: seq.fit, keySig: seq.sig, width,
      label: 'Play ' + items.map(i => i.label).join(', ')});
  }

  /* ---------- the panel and the clock ---------- */
  function panel(title, body, {mic = true} = {}) {
    const p = Q.el('div', 'q-chal');
    p.innerHTML = `<p class="q-chal-t">${title}</p><div class="q-chal-body">${body}</div>` +
      `<div class="q-clock" aria-hidden="true"><i></i></div><p class="q-chal-say" aria-live="polite"></p>` +
      '';
    Q.ui.appendChild(p);
    return p;
  }
  const say = (p, t, cls = '') => { const s = p.querySelector('.q-chal-say'); s.textContent = t; s.className = 'q-chal-say ' + cls; };
  /** a challenge clock of `secs` that stops while a sound mutes the mic; tick(dt) each frame, done() when time is up */
  function clock(p, secs, tick, timeUp) {
    let left = secs, last = performance.now(), raf = 0, live = true;
    const bar = p.querySelector('.q-clock i');
    const step = now => {
      if (!live) return;
      raf = requestAnimationFrame(step);
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (document.hidden || A.Pitch.isSuppressed(now)) return;
      left -= dt; bar.style.width = Math.max(0, left / secs * 100) + '%';
      if (tick) tick(dt, now);
      if (left <= 0 && live) { live = false; cancelAnimationFrame(raf); timeUp(); }
    };
    raf = requestAnimationFrame(step);
    return {stop() { live = false; cancelAnimationFrame(raf); }, left: () => Math.max(0, left), secs};
  }
  /** ?demo keys for a challenge: {key: [down, up]} while the challenge runs */
  function demoKeys(map) {
    if (!A.DEMO) return () => {};
    const down = e => { const f = map[e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase()]; if (f && !e.repeat) { e.preventDefault(); f[0](); } };
    const up = e => { const f = map[e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase()]; if (f && f[1]) f[1](); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); A.Pitch.demoNote = null; A.Pitch.demoJitter = 0.2; };
  }
  function finish(p, stopDemo, res) {
    onHeld = onFrame = onAttack = null;
    stopDemo();
    A.Pitch.demoAttacks = false;
    Q.listen(false);
    return Q.wait(700).then(() => { p.remove(); res.success = res.acc >= 0.8; return res; });
  }

  /* ---------- PLAY: 1–4 notes on the staff ---------- */
  function play(enemy, count = enemy.count || 3, secs = enemy.time || 9, title) {
    const seq = notes(enemy, count), items = seq.items;
    const p = panel(title || Q.text('playIntro'), `<div class="q-staff" id="qStaff">${staff(seq, items, 0)}</div>`);
    let i = 0, correct = 0, firstTry = true;
    const mark = () => items.forEach((_, k) => { const g = p.querySelector('#qn' + k); if (g) g.setAttribute('class', k < i ? 'q-done' : k === i ? 'q-cur' : ''); });
    mark(); say(p, `${items[0].label}…`);
    return new Promise(done => {
      const end = () => { c.stop(); finish(p, stop, {acc: correct / items.length, speed: c.left() / secs, correct, total: items.length}).then(done); };
      onHeld = pc => {
        if (i >= items.length) return;
        if (pc === items[i].pc) {
          if (firstTry) correct++;
          i++; firstTry = true; mark(); A.Pitch.ignoreCurrent();
          if (i >= items.length) { say(p, 'Nice!', 'good'); end(); } else say(p, `${items[i].label}…`, 'good');
        } else { firstTry = false; say(p, Q.text('wrongNote', {note: seq.name(pc)}), 'bad'); }
      };
      const stop = demoKeys({
        space: [() => { A.Pitch.demoJitter = 0.02; A.Pitch.demoNote = items[Math.min(i, items.length - 1)].sounding; }, () => { A.Pitch.demoNote = null; }],
        w: [() => { A.Pitch.demoNote = items[Math.min(i, items.length - 1)].sounding + 2; }, () => { A.Pitch.demoNote = null; }],
      });
      // holding Space through the notes: follow the next note as soon as one counts
      onFrame = () => { if (A.DEMO && A.Pitch.demoNote !== null && A.Pitch.demoJitter === 0.02 && items[i]) A.Pitch.demoNote = items[i].sounding; };
      Q.listen(true);
      const c = clock(p, secs, null, end);
    });
  }

  /* ---------- LONG TONE (and HARMONIZE's happy note): hold one note steady and in tune ---------- */
  function longtone(enemy, {item, seq, hold, tol = 25, secs, title}) {
    if (!item) { seq = notes(enemy, 1); item = seq.items[0]; }
    secs = secs || hold + 7;
    const p = panel(title || Q.text('longIntro', {note: item.label, n: hold}),
      `<div class="q-staff q-one">${staff(seq, [item], 0)}</div><div class="q-hold"><i id="qHold"></i></div><p class="q-cents" id="qCents">–</p>`);
    let got = 0, lastT = 0;
    return new Promise(done => {
      const end = () => { c.stop(); finish(p, stop, {acc: Math.min(1, got / hold), speed: c.left() / secs, correct: got >= hold ? 1 : 0, total: 1}).then(done); };
      onFrame = (r, level, now) => {
        const dt = lastT ? Math.min(.1, (now - lastT) / 1000) : 0; lastT = now;
        const dev = r ? (((r.midi - item.pc) % 12 + 18) % 12 - 6) * 100 : null;
        const on = r && r.pc === item.pc && Math.abs(dev) <= tol;
        got = on ? got + dt : Math.max(0, got - dt * .5);          // off or silent: it slowly drains
        p.querySelector('#qHold').style.width = Math.min(100, got / hold * 100) + '%';
        const ce = p.querySelector('#qCents');
        if (!r) ce.textContent = '–';
        else if (r.pc !== item.pc) ce.textContent = `That's ${seq.name(r.pc)}`;
        else { const a = Math.round(Math.abs(dev)); ce.textContent = a <= tol ? `IN TUNE ${a ? (dev > 0 ? '+' : '−') + a + '¢' : ''}` : `${dev > 0 ? '+' : '−'}${a}¢ ${dev > 0 ? 'sharp' : 'flat'}`; }
        ce.className = 'q-cents ' + (on ? 'good' : r ? 'bad' : '');
        if (got >= hold) { say(p, 'Steady! Beautiful.', 'good'); onFrame = null; end(); }
      };
      const stop = demoKeys({
        s: [() => { A.Pitch.demoJitter = 0.01; A.Pitch.demoNote = item.sounding; }, () => { A.Pitch.demoNote = null; }],
        space: [() => { A.Pitch.demoJitter = 0.01; A.Pitch.demoNote = item.sounding; }, () => { A.Pitch.demoNote = null; }],
        w: [() => { A.Pitch.demoNote = item.sounding + 2; }, () => { A.Pitch.demoNote = null; }],
      });
      Q.listen(true);
      const c = clock(p, secs, null, end);
    });
  }

  /* ---------- ARTICULATE: one note × N separate times (the Snare Drum: any clean hit) ---------- */
  function articulate(enemy, {taps = enemy.taps || 4, secs = enemy.time || 7, title} = {}) {
    let seq = null, item = null;
    if (!unpitched) { seq = notes(enemy, 1); item = seq.items[0]; }
    const p = panel(title || (unpitched ? Q.text('tapIntroDrum', {n: taps}) : Q.text('tapIntro', {note: item.label, n: taps})),
      (item ? `<div class="q-staff q-one">${staff(seq, [item], 0)}</div>` : '<div class="q-drum" aria-hidden="true"></div>') +
      `<p class="q-taps" id="qTaps">${'<i></i>'.repeat(taps)}</p>`);
    let hits = 0, wrong = 0;
    return new Promise(done => {
      const end = () => { c.stop(); finish(p, stop, {acc: Q.clamp(hits / taps - wrong * .1, 0, 1), speed: c.left() / secs, correct: hits, total: taps}).then(done); };
      A.Pitch.demoTarget = () => item ? {pc: item.pc, midi: item.sounding} : null;
      A.Pitch.demoAttacks = true;
      onAttack = a => {
        if (unpitched || a.pc === item.pc) {
          hits++;
          p.querySelectorAll('#qTaps i').forEach((d, k) => d.classList.toggle('on', k < hits));
          if (hits >= taps) { say(p, 'Clean and separate!', 'good'); onAttack = null; end(); }
          else { say(p, `${taps - hits} more!`, 'good'); Q.sfx('attack-tick'); }
        } else if (a.pc !== null) { wrong++; say(p, Q.text('wrongNote', {note: seq.name(a.pc)}), 'bad'); }
      };
      const stop = demoKeys({});                                // Space / T / W are the pitch engine's attack keys
      Q.listen(true);
      const c = clock(p, secs, null, end);
    });
  }

  /* ---------- VOCAB: a Band Ninja vocabulary question (no microphone) ---------- */
  function vocab(enemy) {
    const rank = enemy.rank || 3, pool = window.VOCAB.filter(v => v.rank === rank);
    const q = Q.pick(pool), secs = enemy.time || 14;
    let choices;
    if (q.type === 'symbol') choices = [q.answer].concat(A.SYMBOL_IDS.filter(s => s !== q.answer).sort(() => Math.random() - .5).slice(0, 3));
    else choices = [q.answer].concat(window.VOCAB_BANKS[rank].filter(w => w !== q.answer).sort(() => Math.random() - .5).slice(0, 3));
    choices.sort(() => Math.random() - .5);
    const prompt = q.prompt.includes('___') ? q.prompt.replace('___', '_____') : q.prompt;
    const p = panel(Q.text('vocabIntro'), `<p class="q-q">${prompt}</p>${q.show ? `<div class="q-sym">${A.symbolSVG(q.show, A.symbolName(q.show))}</div>` : ''}<div id="qChoices"></div>` +
      (A.DEMO ? `<p class="q-demo">Demo: V answers (${q.type === 'symbol' ? A.symbolName(q.answer) : q.answer})</p>` : ''), {mic: false});
    return new Promise(done => {
      let over = false;
      const answer = (c) => {
        if (over) return; over = true; clk.stop(); m.destroy(); stop();
        const ok = c === q.answer;
        say(p, ok ? 'Correct!' : `It's "${q.type === 'symbol' ? A.symbolName(q.answer) : q.answer}". ${q.tip || ''}`, ok ? 'good' : 'bad');
        Q.wait(ok ? 800 : 2200).then(() => { p.remove(); done({acc: ok ? 1 : 0.15, speed: clk.left() / secs, correct: ok ? 1 : 0, total: 1, success: ok}); });
      };
      const m = Q.menu(p.querySelector('#qChoices'), choices.map(c => ({id: c, label: q.type === 'symbol' ? `<span class="q-symc">${A.symbolSVG(c, A.symbolName(c))}</span>` : c})),
        {cols: 2, onPick: it => answer(it.id), label: 'Answers', cls: 'q-choices'});
      const stop = demoKeys({v: [() => answer(q.answer)]});
      const clk = clock(p, secs, null, () => answer(null));
    });
  }

  /* ---------- FINGERING: build the note's fingering on the Button Masher diagram (no microphone) ---------- */
  function fingering(enemy) {
    const M = A.Masher, T = M.table(member), D = M.DIAGRAMS[T.diagram];
    let seq, item, tries = 0;
    do { seq = notes(enemy, 1); item = seq.items[0]; tries++; } while (!T.has(item.midi) && tries < 12);
    if (!T.has(item.midi)) return play(enemy, 1);
    const right = T.notes(item.midi), secs = enemy.time || 14;
    const p = panel(Q.text('fingerIntro', {note: item.label}),
      `<div class="q-staff q-one q-small">${staff(seq, [item], 0)}</div><div class="q-diagram">${M.diagramSVG(T.diagram, {interactive: true, label: 'Tap the keys for ' + item.label})}</div>` +
      `<button type="button" class="q-btn q-check">Check</button>` + (A.DEMO ? `<p class="q-demo">Demo: V or F answers (${right[0].text})</p>` : ''), {mic: false});
    const svg = p.querySelector('.diagram'), pressed = {};
    const redraw = () => M.setState(svg, pressed);
    const toggle = id => {
      const k = D.keys.find(x => x.id === id); if (!k) return;
      if (D.slide) { Object.keys(pressed).forEach(x => delete pressed[x]); pressed[id] = 1; }
      else if (k.half) pressed[id] = !pressed[id] ? 'h' : pressed[id] === 'h' ? 1 : 0;
      else pressed[id] = pressed[id] ? 0 : 1;
      if (!pressed[id]) delete pressed[id];
      redraw();
    };
    svg.addEventListener('pointerdown', e => { const k = e.target.closest('.key'); if (k) { e.preventDefault(); toggle(k.dataset.k); } });
    svg.addEventListener('keydown', e => { const k = e.target.closest('.key'); if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(k.dataset.k); } });
    redraw();
    return new Promise(done => {
      let over = false;
      const check = (auto) => {
        if (over) return; over = true; clk.stop(); stop();
        if (auto) { Object.keys(pressed).forEach(x => delete pressed[x]); Object.assign(pressed, M.pressedOf(right[0].keys)); }
        const ok = right.some(f => f.canon === M.canon(pressed));
        M.setState(svg, pressed, {glow: ok ? null : right[0].keys});
        say(p, ok ? 'That\'s the fingering!' : `The fingering is: ${right[0].text}.`, ok ? 'good' : 'bad');
        Q.wait(ok ? 900 : 2400).then(() => { p.remove(); done({acc: ok ? 1 : 0.15, speed: clk.left() / secs, correct: ok ? 1 : 0, total: 1, success: ok}); });
      };
      p.querySelector('.q-check').addEventListener('click', () => check(false));
      const stop = demoKeys({v: [() => check(true)], f: [() => check(true)]});
      const clk = clock(p, secs, null, () => check(false));
    });
  }

  /* ---------- HARMONIZE: the enemy's happy note (or happy rhythm) ---------- */
  function harmonize(enemy) {
    const h = enemy.harmonize || {type: 'note', hold: 1.5};
    if (unpitched || h.type === 'articulate') {
      const taps = h.taps || 5;
      return articulate(enemy, {taps, secs: taps + 5, title: unpitched ? Q.text('harmonizeDrum', {n: taps}) : undefined});
    }
    const {seq, item} = happyNote(enemy);
    return longtone(enemy, {item, seq, hold: h.hold || 1.5, tol: 35, secs: (h.hold || 1.5) + 7, title: Q.text('harmonizeIntro', {note: item.label})});
  }

  Q.challenge = {
    resolve,
    run(type, {enemy, harmonize: harm} = {}) {
      if (harm) return harmonize(enemy);
      const t = resolve(type);
      if (t === 'play') return play(enemy);
      if (t === 'longtone') return longtone(enemy, {hold: enemy.hold || 3});
      if (t === 'articulate') return articulate(enemy);
      if (t === 'vocab') return vocab(enemy);
      if (t === 'fingering') return fingering(enemy);
      return play(enemy);
    },
    uses: t => ['play', 'longtone', 'articulate'].includes(resolve(t)),     // does this challenge use the mic?
    /** the B♭ Blast (Episode 1's song, from the Butler): the concert B♭ scale. learn: the whole scale bottom to top
        (the Snare Drum: 8 clean strokes); in battle: 4 scale notes in random order (snare: 6 strokes) */
    blast(learn) {
      if (unpitched) return articulate({taps: learn ? 8 : 6, time: learn ? 16 : 9}, {title: learn ? Q.text('blastDrum') : undefined});
      return play({notes: 'Bb', order: learn ? 'order' : 'random', count: learn ? 8 : 4, time: learn ? 40 : 12}, undefined, undefined, learn ? Q.text('blastLearn') : Q.text('blastPlay'));
    },
  };
})(window.Arcade);
