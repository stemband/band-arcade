/* ARCADE QUEST: the playing challenges. Each returns a Promise of a result:
     {acc 0–1 (how accurate), speed 0–1 (time left), correct (right notes / hits), total, success (acc ≥ 0.8)}
   Q.challenge.resolve(type, enemy)  the challenge this instrument can actually do (fallbacks below)
   Q.challenge.run(type, {enemy, harmonize, serenade})   (serenade: its happy note, shorter than HARMONIZE's; snare: a gentle beat)
   THE MICROPHONE LISTENS ONLY HERE: Q.listen(true) at the start of PLAY / SERENADE / LONG TONE / ARTICULATE / HARMONIZE and
   Q.listen(false) at the end (Pitch.pauseListening). VOCAB and FINGERING don't use the mic at all. The challenge
   clock stops while a sound is muting the mic (Pitch.isSuppressed).
   FALLBACKS: the Snare Drum can't play pitches: play/longtone/fingering -> articulate (count hits); Bells can't hold
   a long tone: longtone -> play; fingering without a chart (fingerings.js not loaded, or no entry) -> play;
   articulate without attack detection -> play; vocab without vocab.js -> play. THE RHYTHM FAMILY (rhythm, tempo, echo:
   Episode 2) never needs a pitch, so every instrument plays it (the snare through shared/onsets.js); only a missing
   attack detector falls back (winds and bells: play; the snare: articulate).
   ?demo: hold Space = the right note (PLAY, LONG TONE, HARMONIZE), W = a wrong note, S = a steady long tone,
   T (or Space) taps = attacks (ARTICULATE; RHYTHM / TEMPO / ECHO: a hit at that moment, the snare's too), V =
   auto-answer (VOCAB, FINGERING; F works for fingering too). */
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
  let onHeld = null, onFrame = null, onAttack = null, onOnset = null;
  A.Pitch.onHeld((pc, now, note) => { if (onHeld) onHeld(pc, now, note); });
  A.Pitch.onFrame((r, level, now) => { if (onFrame) onFrame(r, level, now); });
  if (A.Pitch.onAttack) A.Pitch.onAttack(a => { if (onAttack) onAttack(a); });
  // the snare's hits in the rhythm family: onsets (shared/onsets.js, never pitch), as Showtime Malfunction's snare jobs
  if (A.Onsets) A.Onsets.listen(o => { if (onOnset) onOnset(o); });

  /** the microphone is on (or ?demo stands in): true, or false if the student tapped Cancel on the mic prompt */
  Q.micReady = () => new Promise(res => {
    if (A.Pitch.active || A.Pitch.demoReady) return res(true);
    A.requireMic(() => res(true), {offer: false});      // (a battle: never the room check's offer)
    const iv = setInterval(() => {
      const gate = document.getElementById('micGateTitle'), box = gate && gate.closest('.overlay');
      if (A.Pitch.active || A.Pitch.demoReady) clearInterval(iv);
      else if (box && box.hidden) { clearInterval(iv); res(false); }
    }, 250);
  });

  /* ---------- which challenge ---------- */
  const hasFingering = () => !!(A.Masher && window.MASHER_FINGERINGS && window.MASHER_FINGERINGS[member.id]);
  const RHYTHMIC = ['rhythm', 'tempo', 'echo'];
  const rhythmReady = () => !!(A.Counting && A.RhythmJudge && A.RhythmStaff && A.AudioClock && (unpitched ? A.Onsets : A.Pitch.onAttack));
  function resolve(type) {
    if (RHYTHMIC.includes(type)) return rhythmReady() ? type : unpitched ? 'articulate' : 'play';
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
  function finish(p, stopDemo, res, ms = 700) {
    onHeld = onFrame = onAttack = onOnset = null;
    stopDemo();
    A.Pitch.demoAttacks = false;
    Q.listen(false);
    return Q.wait(ms).then(() => { p.remove(); res.success = res.acc >= 0.8; return res; });
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
  function longtone(enemy, {item, seq, hold, tol = 25, secs, title, cutoff}) {
    if (!item) { seq = notes(enemy, 1); item = seq.items[0]; }
    secs = secs || hold + 7;
    // cutoff (the Ghost Conductor): the hold length is a secret (the bar is measured against a longer one) and he
    // "cuts you off" when it's reached
    const barLen = cutoff ? hold * 1.6 : hold;
    const p = panel(title || Q.text(cutoff ? 'cutoffIntro' : 'longIntro', {note: item.label, n: hold}),
      `<div class="q-staff q-one">${staff(seq, [item], 0)}</div><div class="q-hold${cutoff ? ' q-cutoff' : ''}"><i id="qHold"></i></div><p class="q-cents" id="qCents">–</p>`);
    let got = 0, lastT = 0;
    return new Promise(done => {
      const end = () => { c.stop(); finish(p, stop, {acc: Math.min(1, got / hold), speed: c.left() / secs, correct: got >= hold ? 1 : 0, total: 1}).then(done); };
      onFrame = (r, level, now) => {
        const dt = lastT ? Math.min(.1, (now - lastT) / 1000) : 0; lastT = now;
        const dev = r ? (((r.midi - item.pc) % 12 + 18) % 12 - 6) * 100 : null;
        const on = r && r.pc === item.pc && Math.abs(dev) <= tol;
        got = on ? got + dt : Math.max(0, got - dt * .5);          // off or silent: it slowly drains
        p.querySelector('#qHold').style.width = Math.min(100, got / barLen * 100) + '%';
        if (cutoff && on && got < hold) say(p, got < hold / 2 ? 'Hold it...' : 'Hold... hold...', '');
        const ce = p.querySelector('#qCents');
        if (!r) ce.textContent = '–';
        else if (r.pc !== item.pc) ce.textContent = `That's ${seq.name(r.pc)}`;
        else { const a = Math.round(Math.abs(dev)); ce.textContent = a <= tol ? `IN TUNE ${a ? (dev > 0 ? '+' : '−') + a + '¢' : ''}` : `${dev > 0 ? '+' : '−'}${a}¢ ${dev > 0 ? 'sharp' : 'flat'}`; }
        ce.className = 'q-cents ' + (on ? 'good' : r ? 'bad' : '');
        if (got >= hold) { say(p, cutoff ? 'CUT OFF! (He swipes his baton.) Perfectly held.' : 'Steady! Beautiful.', 'good'); onFrame = null; end(); }
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
  function articulate(enemy, {taps = enemy.taps || 4, secs = enemy.time || 7, title, bpm = enemy.bpm} = {}) {
    let seq = null, item = null;
    if (!unpitched) { seq = notes(enemy, 1); item = seq.items[0]; }
    const intro = bpm ? (unpitched ? Q.text('beatIntroDrum', {n: taps}) : Q.text('beatIntro', {note: item.label, n: taps}))
      : unpitched ? Q.text('tapIntroDrum', {n: taps}) : Q.text('tapIntro', {note: item.label, n: taps});
    const p = panel(title || intro,
      (item ? `<div class="q-staff q-one">${staff(seq, [item], 0)}</div>` : '<div class="q-drum" aria-hidden="true"></div>') +
      (bpm ? `<p class="q-beat" aria-hidden="true"><i></i></p>` : '') + `<p class="q-taps" id="qTaps">${'<i></i>'.repeat(taps)}</p>`);
    let hits = 0, wrong = 0, onBeat = 0;
    // bpm (the Ghost Conductor): his baton light flashes on every beat (silently: a click would deafen the mic);
    // notes played near a beat count more
    const period = bpm ? 60000 / bpm : 0, t0 = performance.now(), light = p.querySelector('.q-beat i');
    const beatIv = bpm ? setInterval(() => { if (light) { light.classList.add('on'); setTimeout(() => light.classList.remove('on'), 140); } }, period) : 0;
    return new Promise(done => {
      const end = () => {
        c.stop(); clearInterval(beatIv);
        const acc = bpm ? hits / taps * (0.6 + 0.4 * (hits ? onBeat / hits : 0)) : hits / taps;
        finish(p, stop, {acc: Q.clamp(acc - wrong * .1, 0, 1), speed: c.left() / secs, correct: hits, total: taps}).then(done);
      };
      A.Pitch.demoTarget = () => item ? {pc: item.pc, midi: item.sounding} : null;
      A.Pitch.demoAttacks = true;
      onAttack = a => {
        if (unpitched || a.pc === item.pc) {
          hits++;
          if (bpm) { const ph = ((a.time - t0) % period + period) % period / period; if (ph < .25 || ph > .75 || A.DEMO) onBeat++; }
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

  /* ---------- VOCAB: a Band Ninja vocabulary question (no microphone). An enemy's `vocab` (a list of the test items'
     ids in ancient-ninja-scrolls/vocab.js, any rank) picks from those items only: the Ticket Stubs' tempo and rhythm
     words; else every item of rank `rank`. The wrong answers come from the item's own rank's word bank. ---------- */
  function vocab(enemy) {
    const ids = enemy.vocab, all = window.VOCAB, pick = ids ? all.filter(v => ids.includes(v.id)) : [];
    const pool = pick.length ? pick : all.filter(v => v.rank === (enemy.rank || 3));
    const q = Q.pick(pool), secs = enemy.time || 14, rank = q.rank;
    let choices;
    if (q.type === 'symbol') choices = [q.answer].concat(A.SYMBOL_IDS.filter(s => s !== q.answer).sort(() => Math.random() - .5).slice(0, 3));
    else choices = [q.answer].concat([...new Set(window.VOCAB_BANKS[rank])].filter(w => w !== q.answer).sort(() => Math.random() - .5).slice(0, 3));
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

  /* ================= THE RHYTHM FAMILY (Episode 2): RHYTHM (read it, play it), TEMPO (steady beats), ECHO (hear it,
     play it back). Built ONLY from the arcade's shared rhythm code: the rhythm is Counting text (shared/counting.js),
     drawn by RhythmStaff.engrave with Mr. Graham's counting under it, judged by RhythmJudge.match on the AUDIO CLOCK
     (shared/calibration.js AudioClock) minus this device's saved delay (Calibration.lag('clap'), the timing check
     Rhythm Dojo and Showtime's snare share). Never a second judge, parser or staff.
     INPUT: winds and bells play it on ANY one note: only when each note STARTS counts (Pitch.onAttack, as ARTICULATE);
     the Snare Drum's hits come from shared/onsets.js (Onsets.listen, as Showtime's snare jobs; sticking is never
     judged). ?demo: Space (or T) = a hit now.
     THE COUNT-OFF: one measure of clicks first (Rhythm Dojo's count-in: its kit, music-highway/backing.js, scheduled
     on the audio clock straight into Sfx.output(), never Sfx.event, so it never mutes the microphone), a beat light
     pulsing with it and the count (1 2 3 4). Hits during the count-off never count (but, like Rhythm Dojo, they teach
     the BLEED: how loud and how late this microphone hears our own clicks). No click while you play, unless the enemy
     has `click: true` (then a hit right on a click must be bleedK × louder than the clicks were).
     THE SCORE (the usual {acc, speed, correct, total, success}): acc = the judge's results averaged (RHYTHM.value)
     − RHYTHM.extra per EXTRA hit, never under 0; speed = the share of PERFECT + GOOD (so a skill crit needs a really
     clean rhythm); correct / total = notes hit / notes. ASSIST mode widens every window (RHYTHM.assist).
     ECHO plays the rhythm FIRST (the woodblock over a soft click, Rhythm Dojo's HEAR IT) with the microphone PAUSED,
     then listens again only once the last woodblock has faded + RHYTHM.echoFadeS (+ Pitch.ignoreCurrent: Lost
     Signal's turn-taking); HEAR IT AGAIN costs a little (each replay × RHYTHM.echoReplay on the score). */
  const RHYTHM = {
    // THE JUDGE's windows (ms from the written note, after the device's delay): Rhythm Dojo's
    perfectMs: 70, goodMs: 140, okMs: 220, lateMs: 360,
    value: {perfect: 1, good: .8, ok: .5, early: .3, late: .3, miss: 0},   // what each result is worth
    extra: .1,                // each EXTRA hit (in a rest, or one too many) takes this off the score
    assist: 1.35,             // ASSIST mode: every window × this
    bpm: {1: 76, 2: 80, 3: 84},   // RHYTHM's tempo for each tier (a machine's own `bpm` wins)
    countBeats: 4,            // THE COUNT-OFF: one measure of 4/4
    studyS: 1.6,              // RHYTHM: time to read the staff before the count-off starts
    leadS: .35,               // the first click comes this long after the count-off starts
    tailS: .5,                // listening goes on this long after the last note's window
    showMs: 1300,             // the colored result stays this long
    clickVol: .9, blockVol: .9, echoClickVol: .35,
    bleedMs: 90, bleedK: 2.2, bleedLearnMs: 250,   // Rhythm Dojo's bleed rule (only with `click: true`)
    tempoBeats: 8, tempoBpm: 96,   // TEMPO: 8 quarter notes at the machine's `bpm` (`accel`: + that many bpm by the last)
    echoBlockS: .15,          // ECHO: one woodblock's length
    echoFadeS: .4,            // listening again only this long after the last woodblock has faded
    echoReplay: .85,          // HEAR IT AGAIN: each replay × this on the score (a little less damage / CALM)
    echoReplays: 2,           // at most this many
    serenade: {tier: 1, tempoBeats: 4, echoTier: 'echo2'},   // SERENADE against a rhythm machine: gentle versions
  };
  const bufs = {click: null, block: null};
  const loadBufs = () => {
    if (!A.Sfx || !A.Sfx.buffer) return;
    if (!bufs.click) Promise.resolve(A.Sfx.buffer('rd-click')).then(b => { if (b) bufs.click = b; }).catch(() => {});
    if (!bufs.block) Promise.resolve(A.Sfx.buffer('rd-woodblock')).then(b => { if (b) bufs.block = b; }).catch(() => {});
  };
  addEventListener('pointerdown', loadBufs, true); addEventListener('keydown', loadBufs, true);
  /** the audio clock + Rhythm Dojo's kit on the arcade's output (null kit = sound off or still locked: the clock runs
      on performance.now() and the count-off is the beat light alone) */
  function rhythmClock() {
    const clk = A.AudioClock.create().start();
    if (clk.ctx && clk.ctx.state !== 'running') clk.ctx = null;           // a locked context's time stands still
    const o = clk.ctx && A.Sfx && A.Sfx.output();
    const kit = o && A.MHBacking ? A.MHBacking.create(o.ctx, o.out, {click: bufs.click, block: bufs.block}) : null;
    clk.perfAt = aud => (clk.ctx ? (aud - clk.off) * 1000 : aud * 1000 + clk.p0);
    return {clk, kit};
  }
  const windows = () => { const k = Q.settings.get().assist ? RHYTHM.assist : 1; return {perfectMs: RHYTHM.perfectMs * k, goodMs: RHYTHM.goodMs * k, okMs: RHYTHM.okMs * k, lateMs: RHYTHM.lateMs * k}; };
  /** a pattern from QUEST_RHYTHMS (data/rhythms.js): `bars` random ones of the tier, joined by bar lines */
  function pattern(tier, bars = 1) {
    const pool = (window.QUEST_RHYTHMS || {})[tier] || ['q q q q'], out = [];
    for (let i = 0; i < bars; i++) { let t; do { t = Q.pick(pool); } while (bars > 1 && pool.length > 1 && t === out[out.length - 1]); out.push(t); }
    return out.join(' | ');
  }
  let RS = null;                                                // the rhythm challenge on screen (tests: Q.rhythm.state())
  /** THE PERFORMANCE: the count-off, then listening for the hits, then the judge. targets = [{t (s after the first
      note), g?}]; opts {beatS, total (s), click, countBeats, onHit(n), live(k) (note k is due), paint(tg)} */
  function perform(p, R, {beatS, total, click = false, countBeats = RHYTHM.countBeats, onHit, live, paint}) {
    return new Promise(resolveDone => {
      const {clk, kit} = rhythmClock();
      const t0 = clk.now() + RHYTHM.leadS, T0 = t0 + countBeats * beatS, end = T0 + total;
      const clicks = [];
      for (let t = t0, i = 0; t < (click ? end : T0) - 1e-6; t += beatS, i++) { if (kit) kit.click(t, RHYTHM.clickVol, i % countBeats === 0); clicks.push(t); }
      const W = windows(), att = {attacks: [], lag: A.Calibration ? A.Calibration.lag('clap') : 60, bleed: 0, offs: []};
      Object.assign(R, {phase: 'count', clk, kit, t0, T0, end, beatS, clicks, att, W, countBeats});
      const light = p.querySelector('.q-rbeat i'), num = p.querySelector('.q-rcount');
      const nearClick = (heard, lag, ms) => { let best = null; clicks.forEach(c => { const d = heard - (c + lag); if (Math.abs(d) * 1000 <= ms && (best == null || Math.abs(d) < Math.abs(best))) best = d; }); return best; };
      const clickLag = () => { if (!att.offs.length) return 0; const o = att.offs.slice().sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };
      const add = (pTime, level) => {
        if (R.phase !== 'count' && R.phase !== 'play') return;
        const heard = clk.audAt(pTime), rel = heard - att.lag / 1000 - T0;
        if (rel < -W.lateMs / 1000) {                             // the count-off: never a hit, but it teaches the bleed
          const d = level != null ? nearClick(heard, 0, RHYTHM.bleedLearnMs) : null;
          if (d != null) { att.offs.push(d); att.bleed = Math.max(att.bleed, level); }
          return;
        }
        if (click && level != null && att.bleed && nearClick(heard, clickLag(), RHYTHM.bleedMs) != null && level <= att.bleed * RHYTHM.bleedK) return;
        att.attacks.push({rel});
        if (onHit) onHit(att.attacks.length, rel);
      };
      R.add = add;
      onAttack = a => { if (!unpitched) add(a.time, a.level); };
      onOnset = o => { if (unpitched) add(o.time, o.level); };
      A.Pitch.demoTarget = () => null; A.Pitch.demoAttacks = !unpitched;   // ?demo: Space / T = a hit (the pitch engine's attack keys)
      const stopDemo = unpitched ? demoKeys({space: [() => A.Onsets.fake(performance.now(), .3)], t: [() => A.Onsets.fake(performance.now(), .3)]}) : demoKeys({});
      Q.listen(true); A.Pitch.ignoreCurrent();
      if (unpitched && A.Onsets.ensure) A.Onsets.ensure();
      let raf = 0, k = -1;
      const tick = () => {
        if (!R.live) return;
        raf = requestAnimationFrame(tick);
        clk.sample();
        const now = clk.audAt(performance.now());
        // the beat light: brightest on each beat, fading smoothly (one swell a beat; steady under reduced motion)
        const sinceBeat = ((now - t0) / beatS) % 1, beat = Math.floor((now - t0) / beatS);
        if (light) { light.style.opacity = Q.reduced() ? (now >= t0 && now < end ? 1 : .35) : now < t0 ? .25 : Math.max(.25, 1 - sinceBeat * .9); light.classList.toggle('on', now >= t0 && now < end); }
        if (num) num.textContent = now >= t0 && now < T0 ? String(beat % countBeats + 1) : now >= T0 && now < end ? '' : '';
        if (now >= T0 && R.phase === 'count') R.phase = 'play';
        if (live) { const due = R.targets.reduce((j, x, i) => (now >= T0 + x.t - .05 ? i : j), -1); if (due !== k) { k = due; live(k); } }
        if (now >= end + W.lateMs / 1000 + RHYTHM.tailS) done();
      };
      R.live = true;
      raf = requestAnimationFrame(tick);
      const done = () => {
        if (!R.live) return;
        R.live = false; cancelAnimationFrame(raf);
        R.phase = 'done';
        const {tg, extras} = A.RhythmJudge.match(R.targets, att.attacks.filter(x => x.rel <= total + W.lateMs / 1000), W);
        const n = tg.length || 1, sum = tg.reduce((v, t) => v + (RHYTHM.value[t.res] || 0), 0);
        const acc = Q.clamp(sum / n - RHYTHM.extra * extras.length, 0, 1) * (R.scoreK || 1);
        const clean = tg.filter(t => t.res === 'perfect' || t.res === 'good').length;
        R.result = {tg: tg.map(t => ({res: t.res, d: t.d == null ? null : Math.round(t.d)})), extras: extras.length};
        if (paint) paint(tg);
        const hit = tg.filter(t => t.res !== 'miss').length;
        say(p, acc >= .95 ? Q.text('rhythmPerfect') : acc >= .7 ? Q.text('rhythmGood', {n: hit, of: tg.length}) : Q.text('rhythmTry', {n: hit, of: tg.length}), acc >= .7 ? 'good' : 'bad');
        if (kit) kit.stopAll();
        finish(p, stopDemo, {acc, speed: clean / n, correct: hit, total: tg.length}, RHYTHM.showMs).then(r => { if (RS === R) RS = null; resolveDone(r); });
      };
      R.stop = done;
    });
  }
  const RES_CLS = r => (r === 'perfect' || r === 'good' ? 'q-r-good' : r === 'miss' ? 'q-r-bad' : 'q-r-near');
  const beatLight = () => `<p class="q-rbeat" aria-hidden="true"><i></i><b class="q-rcount"></b></p>`;

  /* ---------- RHYTHM: read one measure (`bars: 2` for the final boss) and play it ---------- */
  function rhythm(enemy, {tier = enemy.tier || 1, bars = enemy.bars || 1, title} = {}) {
    const text = enemy.rhythm || pattern(tier, bars), parsed = A.Counting.parse(text, '4/4'), groups = A.Counting.groups(parsed);
    const bpm = enemy.bpm || RHYTHM.bpm[tier] || 80, spt = 60 / bpm / parsed.meter.beat;
    const targets = groups.filter(g => !g.rest).map(g => ({g: g.g, t: g.t * spt}));
    const E = A.RhythmStaff.engrave(parsed, {counting: true, id: 'qrs', groups, label: 'Rhythm: ' + text});
    const p = panel(title || Q.text(unpitched ? 'rhythmIntroDrum' : 'rhythmIntro'), `<div class="q-staff q-rstaff">${E.svg}</div>` + beatLight()); p.classList.add('q-rhy');
    A.RhythmStaff.refine(p);
    const R = RS = {kind: 'rhythm', text, tier, bpm, targets, phase: 'study'};
    const mark = (g, cls) => p.querySelectorAll(`.q-rstaff g.rn[data-g="${g}"], .q-rstaff g.rc[data-g="${g}"]`).forEach(el => { el.classList.remove('q-cur', 'q-r-good', 'q-r-near', 'q-r-bad'); if (cls) el.classList.add(cls); });
    say(p, Q.text('rhythmRead'));
    return Q.wait(RHYTHM.studyS * 1000).then(() => {
      say(p, Q.text('rhythmCount'));
      return perform(p, R, {beatS: 60 / bpm, total: parsed.total * spt, click: !!enemy.click,
        live: k => targets.forEach((x, i) => mark(x.g, i === k ? 'q-cur' : null)),
        paint: tg => tg.forEach(x => mark(x.g, RES_CLS(x.res)))});
    });
  }

  /* ---------- TEMPO: 8 steady quarter notes at the machine's `bpm` after the count-off (`accel`: speeding up) ---------- */
  function tempo(enemy, {beats = enemy.beats || RHYTHM.tempoBeats, title} = {}) {
    const bpm = enemy.bpm || RHYTHM.tempoBpm, accel = enemy.accel || 0, targets = [];
    for (let i = 0, t = 0; i < beats; i++) { targets.push({t}); t += 60 / (bpm + (beats > 1 ? accel * i / (beats - 1) : 0)); }
    const total = targets[beats - 1].t + 60 / (bpm + accel);
    const p = panel(title || Q.text(accel ? 'tempoIntroAccel' : 'tempoIntro', {n: beats, bpm}), `<p class="q-tdots" aria-hidden="true">${'<i></i>'.repeat(beats)}</p>` + beatLight()); p.classList.add('q-rhy');
    const R = RS = {kind: 'tempo', bpm, accel, targets, phase: 'study'};
    const dots = () => p.querySelectorAll('.q-tdots i');
    say(p, Q.text('rhythmCount'));
    return perform(p, R, {beatS: 60 / bpm, total, click: !!enemy.click,
      onHit: n => dots().forEach((d, i) => d.classList.toggle('on', i < n)),
      paint: tg => tg.forEach((x, i) => { const d = dots()[i]; if (d) { d.classList.remove('on'); d.classList.add(RES_CLS(x.res)); } })});
  }

  /* ---------- ECHO: it plays a rhythm (the mic paused), you play it back (no staff: by ear) ---------- */
  function echo(enemy, {tier = enemy.tier || 1, title} = {}) {
    const time = tier === 'echo2' ? '2/4' : '4/4', text = enemy.rhythm || pattern(tier, 1), parsed = A.Counting.parse(text, time), groups = A.Counting.groups(parsed);
    const bpm = enemy.bpm || RHYTHM.bpm[tier] || 80, spt = 60 / bpm / parsed.meter.beat, beatS = 60 / bpm;
    const targets = groups.filter(g => !g.rest).map(g => ({g: g.g, t: g.t * spt}));
    const p = panel(title || Q.text('echoListen'), `<div class="q-echo" aria-hidden="true"><i class="q-ear"></i>${targets.map(() => '<b></b>').join('')}</div><div class="q-echo-menu"></div>` + beatLight()); p.classList.add('q-rhy');
    const R = RS = {kind: 'echo', text, tier, bpm, targets, phase: 'hear', replays: 0};
    const blobs = () => p.querySelectorAll('.q-echo b');
    /* the rhythm, played: the woodblock on each note over a soft click on each beat, the microphone PAUSED */
    const hear = () => new Promise(done => {
      R.phase = 'hear'; A.Pitch.pauseListening(true);
      if (A.Sfx && A.Sfx.duckHold) A.Sfx.duckHold(true, {level: .15});
      const {clk, kit} = rhythmClock(), t0 = clk.now() + .3;
      if (kit) {
        for (let b = 0; b < parsed.total * spt / beatS - 1e-6; b++) kit.click(t0 + b * beatS, RHYTHM.echoClickVol, b === 0);
        targets.forEach(x => kit.block(t0 + x.t, RHYTHM.blockVol, false));
      }
      const last = t0 + targets[targets.length - 1].t, resume = last + RHYTHM.echoBlockS + RHYTHM.echoFadeS;
      Object.assign(R, {hearClk: clk, hearT0: t0, resumeAt: resume});
      const step = () => {
        const now = clk.audAt(performance.now());
        blobs().forEach((b, i) => b.classList.toggle('on', now >= t0 + targets[i].t - .02 && now < t0 + targets[i].t + .2));
        if (now >= resume) { if (A.Sfx && A.Sfx.duckHold) A.Sfx.duckHold(false); done(); } else setTimeout(step, 30);
      };
      step();
    });
    /* PLAY IT BACK, or HEAR IT AGAIN (at most RHYTHM.echoReplays times; each costs a little) */
    const choose = () => new Promise(done => {
      R.phase = 'choose';
      const left = RHYTHM.echoReplays - R.replays, items = [{id: 'play', label: Q.text('echoPlay')}].concat(left > 0 ? [{id: 'again', label: Q.text('echoAgain'), sub: Q.text('echoAgainSub')}] : []);
      say(p, Q.text('echoChoose'));
      const m = Q.menu(p.querySelector('.q-echo-menu'), items, {cols: items.length, label: Q.text('echoChoose'), cls: 'q-small-menu', onPick: it => { m.destroy(); R.pick = null; done(it.id); }});
      R.pick = id => { if (items.some(x => x.id === id)) { m.destroy(); R.pick = null; done(id); } };
    });
    return (async () => {
      await hear();
      for (;;) {
        const c = await choose();
        if (c === 'play') break;
        R.replays++; await hear();
      }
      R.scoreK = Math.pow(RHYTHM.echoReplay, R.replays);
      blobs().forEach(b => b.classList.remove('on'));
      say(p, Q.text('echoGo'));
      return perform(p, R, {beatS, total: parsed.total * spt, countBeats: parsed.meter.num || RHYTHM.countBeats,
        onHit: n => blobs().forEach((b, i) => b.classList.toggle('on', i < n)),
        paint: tg => tg.forEach((x, i) => { const b = blobs()[i]; if (b) { b.classList.remove('on'); b.classList.add(RES_CLS(x.res)); } })});
    })();
  }
  /** tests (and ?demo): the rhythm challenge on screen */
  Q.rhythm = {
    RULES: RHYTHM,
    state: () => RS && {kind: RS.kind, phase: RS.phase, text: RS.text || null, tier: RS.tier || null, bpm: RS.bpm, accel: RS.accel || 0,
      targets: RS.targets.map(x => x.t), T0p: RS.clk ? RS.clk.perfAt(RS.T0) : null, t0p: RS.clk ? RS.clk.perfAt(RS.t0) : null,
      clicks: RS.clk ? RS.clicks.map(c => RS.clk.perfAt(c)) : [], beatS: RS.beatS || null, lagMs: RS.att ? RS.att.lag : null, hits: RS.att ? RS.att.attacks.length : 0,
      bleed: RS.att ? RS.att.bleed : 0, listening: A.Pitch.listening(), replays: RS.replays || 0, resumeAtP: RS.hearClk ? RS.hearClk.perfAt(RS.resumeAt) : null,
      windows: RS.W || windows(), result: RS.result || null},
    /** ?demo: a hit heard at performance time p (ms), as if from the microphone (level: its loudness, for the bleed rule) */
    hit(p, level = null) { if (A.DEMO && RS && RS.add) RS.add(p, level); },
    /** ?demo: ECHO's choice ('play' | 'again') */
    pick(id) { if (A.DEMO && RS && RS.pick) RS.pick(id); },
  };

  /* ---------- HARMONIZE: the enemy's happy note (or happy rhythm) ---------- */
  function harmonize(enemy) {
    const h = enemy.harmonize || {type: 'note', hold: 1.5};
    if (RHYTHMIC.includes(h.type)) {                           // a rhythm machine's happy rhythm (every instrument, the snare too)
      const e = Object.assign({}, enemy, h.tier ? {tier: h.tier} : {}, h.beats ? {beats: h.beats} : {});
      const title = Q.text('harmonize' + h.type[0].toUpperCase() + h.type.slice(1));
      return resolve(h.type) === h.type ? RUN[h.type](e, {title}) : articulate(enemy, {taps: 5, secs: 10});
    }
    if (h.type === 'scale') {                                  // the final HARMONIZE: the whole concert B♭ scale (snare: 8 strokes)
      if (unpitched) return articulate({taps: 8, time: 16}, {title: Q.text('harmonizeScaleDrum')});
      return play({notes: 'Bb', order: 'order', count: 8, time: h.time || 40}, undefined, undefined, Q.text('harmonizeScale'));
    }
    if (unpitched || h.type === 'articulate') {
      const taps = h.taps || 5;
      return articulate(enemy, {taps, secs: taps + 5, title: unpitched ? Q.text('harmonizeDrum', {n: taps}) : undefined});
    }
    const {seq, item} = happyNote(enemy);
    return longtone(enemy, {item, seq, hold: h.hold || 1.5, tol: 35, secs: (h.hold || 1.5) + 7, title: Q.text('harmonizeIntro', {note: item.label})});
  }

  /* ---------- SERENADE: its CALM challenge = HARMONIZE's happy-note challenge, shorter (the befriend path) ---------- */
  const SERENADE = {share: .6, minHold: 1, taps: 4, drumTaps: 4};
  function serenade(enemy) {
    const h = enemy.harmonize || {type: 'note', hold: 1.5};
    // a RHYTHM MACHINE (its challenge is RHYTHM, TEMPO or ECHO): a gentle version of its own kind, for every instrument
    const kind = RHYTHMIC.includes(enemy.challenge) ? enemy.challenge : null, S = RHYTHM.serenade;
    if (kind && resolve(kind) === kind) {
      if (kind === 'rhythm') return rhythm(Object.assign({}, enemy, {bpm: null, bars: 1, rhythm: null}), {tier: S.tier, bars: 1, title: Q.text('serenadeRhythm')});
      if (kind === 'tempo') return tempo(Object.assign({}, enemy, {accel: 0}), {beats: S.tempoBeats, title: Q.text('serenadeTempo', {n: S.tempoBeats})});
      return echo(Object.assign({}, enemy, {bpm: null, rhythm: null}), {tier: S.echoTier, title: Q.text('serenadeEcho')});
    }
    if (unpitched) return articulate({taps: SERENADE.drumTaps, time: SERENADE.drumTaps + 6}, {title: Q.text('serenadeDrum', {n: SERENADE.drumTaps})});   // a gentle, steady beat
    if (h.type === 'articulate') return articulate(enemy, {taps: SERENADE.taps, secs: SERENADE.taps + 5, title: Q.text('serenadeTaps', {n: SERENADE.taps})});
    const {seq, item} = happyNote(enemy);
    const hold = Math.max(SERENADE.minHold, Math.round((h.hold || 1.5) * SERENADE.share * 2) / 2);
    return longtone(enemy, {item, seq, hold, tol: 35, secs: hold + 6, title: Q.text('serenadeIntro', {note: item.label, n: hold})});
  }

  const RUN = {rhythm, tempo, echo};
  Q.challenge = {
    RHYTHMIC,
    resolve,
    run(type, {enemy, harmonize: harm, serenade: ser} = {}) {
      if (harm) return harmonize(enemy);
      if (ser) return serenade(enemy);
      const t = resolve(type);
      if (t === 'play') return play(enemy);
      if (t === 'longtone') {
        const hold = Array.isArray(enemy.hold) ? Math.round(Q.rand(enemy.hold[0], enemy.hold[1]) * 2) / 2 : enemy.hold || 3;
        return longtone(enemy, {hold, cutoff: !!enemy.cutoff, secs: enemy.cutoff ? enemy.time : undefined});
      }
      if (t === 'articulate') return articulate(enemy);
      if (t === 'vocab') return vocab(enemy);
      if (t === 'fingering') return fingering(enemy);
      if (RUN[t]) return RUN[t](enemy);
      return play(enemy);
    },
    uses: t => ['play', 'longtone', 'articulate'].concat(RHYTHMIC).includes(resolve(t)),     // does this challenge use the mic?
    /** the B♭ Blast (Episode 1's song, from the Butler): the concert B♭ scale. learn: the whole scale bottom to top
        (the Snare Drum: 8 clean strokes); in battle: 4 scale notes in random order (snare: 6 strokes) */
    blast(learn) {
      if (unpitched) return articulate({taps: learn ? 8 : 6, time: learn ? 16 : 9}, {title: learn ? Q.text('blastDrum') : undefined});
      return play({notes: 'Bb', order: learn ? 'order' : 'random', count: learn ? 8 : 4, time: learn ? 40 : 12}, undefined, undefined, learn ? Q.text('blastLearn') : Q.text('blastPlay'));
    },
    /** the E♭ ENCORE (Episode 2's song, from Professor Hoot): the concert E♭ scale (shared/scales.js through
        buildSequence, for this instrument). learn: the whole scale bottom to top (the Snare Drum: 8 clean strokes);
        in battle: 4 scale notes in random order (snare: 6 strokes); battle.js × RULES.encore */
    encore(learn) {
      if (unpitched) return articulate({taps: learn ? 8 : 6, time: learn ? 16 : 9}, {title: learn ? Q.text('encoreDrum') : Q.text('encorePlayDrum')});
      return play({notes: 'Eb', order: learn ? 'order' : 'random', count: learn ? 8 : 4, time: learn ? 40 : 12}, undefined, undefined, learn ? Q.text('encoreLearn') : Q.text('encorePlay'));
    },
  };
})(window.Arcade);
