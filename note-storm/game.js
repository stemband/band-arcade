/* Note Storm: notes march left along the staff toward Tempo (the defender).
   Play the front note to blast it; a note that reaches Tempo costs a life.
   The staff is drawn once; each frame only moves the note layers (CSS transforms).
   NOTES × ORDER (shared/mode-picker.js, notes from shared/sequences.js): First 5, a concert scale or Chromatic,
   in Random or Scale Order (notes arrive in the order of the sequence). Levels keep their speed, notes on screen
   and lives in every combination.
   SEVERAL NOTES AT ONCE: a played note blasts the note CLOSEST TO TEMPO with that pitch (any note on the staff
   counts, not only the front one); none on the staff = a wrong note. One held note blasts one note: the same
   pitch twice needs a fresh attack (pitch.js onHeld fires once per note).
   THE STORM NEVER STOPS: notes, spawning and the clock keep going through shots, sounds and the microphone's
   mute (only the pause button, a hidden tab, and the start/results screens stop it). The mute stays short:
   Sfx.muteMax = RULES.muteMs, and Pitch.softSuppress lets a note started during the mute count right after it.
   ENDLESS MODE (the ∞ card, shared/endless.js; its numbers are STORM_ENDLESS in levels.js): the same storm with no
   end: G.endless, G.L is worked out again every frame from the SPEED curve (march, every, maxOn), notes come in
   chunks from the same sequences, 3 hearts, wrong notes only break the combo, no stars, a Top 5 per note set. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'note-storm';
  const LEVELS = window.STORM_LEVELS, RULES = window.STORM_RULES, END = window.STORM_ENDLESS;

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.Pitch.setInstrument(inst);
  A.Pitch.softSuppress = true;               // see THE STORM NEVER STOPS above
  A.Sfx.muteMax = RULES.muteMs;
  A.Sfx.use('endless');
  const member = A.currentMember();
  const endKey = () => ({gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: A.Endless.setKey(picker.state)});
  A.mountTopbar(inst, '', GAME_ID);
  $('checkerLink').href = A.linkTo('../note-checker/index.html') + '#' + GAME_ID;
  $('demoHelp').hidden = !A.DEMO;
  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: LEVELS.length, onChange: () => showHub()});

  /* ---------- staff geometry (SVG units; the staff's middle line is y = 88) ---------- */
  const MID_Y = 88;
  let DEF_X = 84;              // Tempo's center (moves right past a key signature in scale pools)
  let HIT_X = 124;             // a note that gets this far reaches Tempo
  const SLICE_L = -48, SLICE_W = 92;   // each note's own little drawing, centered on the note head
  let BEAM_X = DEF_X + 40;
  const BEAM_Y = MID_Y + 5;
  let W = 400, top = 0, H = 0, scale = 1;
  const spawnX = () => W - 34;
  const noteX = p => spawnX() - p * (spawnX() - HIT_X);

  /** Tempo, the metronome robot. Drawn around (0,0). */
  const tempoSVG = () =>
    `<g class="pend"><line x1="0" y1="-24" x2="0" y2="-44"/><circle cx="0" cy="-46" r="5"/></g>` +
    `<rect class="t-foot" x="-19" y="26" width="13" height="7" rx="3"/><rect class="t-foot" x="6" y="26" width="13" height="7" rx="3"/>` +
    `<path class="t-arm" d="M16 3H30"/><path class="t-fork" d="M40 0H30V10H40"/>` +
    `<path class="t-body" d="M-21 28H21L13 -26H-13Z"/>` +
    `<rect class="t-face" x="-10" y="-18" width="20" height="14" rx="4"/>` +
    `<rect class="t-eye" x="-6.5" y="-14" width="4" height="6" rx="1.5"/><rect class="t-eye" x="2.5" y="-14" width="4" height="6" rx="1.5"/>` +
    `<circle class="t-core" cx="0" cy="12" r="5.5"/>`;

  /* ---------- level select ---------- */
  function showHub() {
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    stop();
    G = null;
    $('wrap').classList.remove('playing');
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true; $('paused').hidden = true;
    const st = picker.state, key = st.progressKey;
    A.ModePicker.useRange(st);
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap;
    $('hubConcert').textContent = card.sub;
    $('hubStaff').innerHTML = card.html;
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      const unlocked = A.DEMO || lv === 1 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const count = A.ModePicker.sequence(st, L, lv).items.length;
      const blurb = A.ModePicker.levelText(st, L, lv, [L.maxOn > 1 ? `Up to ${L.maxOn} notes at once.` : 'One note at a time.', L.names ? 'Names showing.' : 'No names.']);
      return `<button class="lvl" data-l="${lv}" ${unlocked ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini" aria-label="Up to ${L.maxOn} at once">${'<i>♩</i>'.repeat(L.maxOn)}</span>
        <span class="t">${L.name}</span>
        <span class="d">${blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : count + ' notes') : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b =>
      b.addEventListener('click', () => A.requireMic(() => startLevel(+b.dataset.l))));
    A.Endless.tile($('endlessTile'), Object.assign(endKey(), {
      label: `${member ? member.short : inst.shortName} · ${st.label}`,
      blurb: 'Play until the storm gets you. The notes keep speeding up, and more of them come at once. 3 hearts.',
      onPlay: () => A.requireMic(startEndless)}));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), picker: $('modePick'),
      stars: i => A.store.level(key, inst.id, i + 1).stars, unlocked: i => A.DEMO || i === 0 || A.store.level(key, inst.id, i).stars > 0});
  }

  /* ---------- play ---------- */
  let G = null, raf = 0, last = 0;
  function startLevel(lv) {
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    stop();
    const L = LEVELS[lv - 1], st = picker.state, seq = A.ModePicker.sequence(st, L, lv), items = seq.items;
    G = {lv, L, items, count: items.length, key: st.progressKey, sig: seq.sig, fit: seq.fit, name: seq.name,
         spawned: 0, notes: [], front: null, gi: 0, roomOn: L.maxOn,
         clock: 0, nextSpawn: RULES.readyMs / 1000, lives: RULES.lives, maxLives: RULES.lives,
         score: 0, hits: 0, lost: 0, wrong: 0, paused: false, over: false};
    begin(`Level ${lv}`, L.name, 'level-start');
  }

  /* ---------- ENDLESS MODE ---------- */
  function startEndless() {
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    stop();
    const st = picker.state, seq = chunk(0);
    G = {endless: true, L: endlessRow(END.start), items: seq.items, count: Infinity, sig: seq.sig, fit: seq.fit, name: seq.name,
         spawned: 0, notes: [], front: null, gi: 0, roomOn: 5, key: st.progressKey,
         clock: 0, nextSpawn: RULES.readyMs / 1000, lives: END.lives, maxLives: END.lives,
         score: 0, hits: 0, lost: 0, wrong: 0, paused: false, over: false,
         speed: END.start, topSpeed: END.start, step: Math.floor(END.start / END.flashEvery), combo: 0, bestCombo: 0};
    begin('Endless', 'Speed ' + END.start.toFixed(1), 'endless-start');
  }
  /** the SPEED now (t = seconds since the run began) */
  const speedAt = t => A.Endless.speed(END, t);
  /** what a SPEED means for the storm: a row like the ones in levels.js */
  function endlessRow(S) {
    const march = Math.max(END.minMarch, END.march1 / S);
    const every = Math.max(END.minEvery, END.every / S);
    const maxOn = END.more.reduce((n, [from, on]) => S >= from ? on : n, 1);
    return {name: 'Endless', march, every, gust: END.gust, maxOn, names: false};
  }
  /** more notes from the same sequences (the smaller pool first, like Level 1) */
  function chunk(S) {
    const small = S < END.smallPoolUntil;
    return A.ModePicker.sequence(picker.state, {count: 24, pool: small ? 3 : 5}, small ? 1 : 2);
  }
  function moreNotes() {
    const add = chunk(G.speed).items.slice(), lastIt = G.items[G.items.length - 1];
    if (lastIt && add.length > 1 && add[0].pc === lastIt.pc) add.shift();    // never the same pitch twice across chunks
    G.items = G.items.concat(add);
  }
  /** each frame: the SPEED, and "SPEED UP!" when it passes the next step */
  function endlessTick() {
    const S = G.speed = speedAt(G.clock);
    G.topSpeed = Math.max(G.topSpeed, S);
    const before = G.L.maxOn;
    G.L = endlessRow(S);
    const step = Math.floor(S / END.flashEvery);
    if (step > G.step) {
      G.step = step;
      A.Endless.flash($('edFlash'), G.L.maxOn > before ? `SPEED UP! Up to ${G.L.maxOn} notes` : 'SPEED UP!');
      A.Sfx.event('speed-up');
    }
    const shown = 'Speed ' + S.toFixed(1);
    if ($('hudLevelName').textContent !== shown) $('hudLevelName').textContent = shown;
    if (G.spawned >= G.items.length - 2) moreNotes();
  }

  function begin(label, name, sound) {
    const L = G.L;
    $('results').hidden = true; $('paused').hidden = true; $('hub').hidden = true; $('play').hidden = false;
    $('wrap').classList.add('playing');
    $('hudLevelLabel').textContent = label;
    $('hudLevelName').textContent = name;
    $('hudLeftLabel').textContent = G.endless ? 'Combo' : 'Notes left';
    $('quitPlay').textContent = G.endless ? 'Quit run' : 'Quit level';
    $('noteLayer').innerHTML = '';
    hud();
    window.scrollTo(0, 0);
    layout(true);
    setPrompt('Get ready…', '');
    A.Pitch.ignoreCurrent();                 // whatever is already sounding doesn't count
    // the first note waits for the level-start sound (the mic would hear it as a note)
    const intro = A.Sfx.event(sound);
    G.nextSpawn = Math.max(G.nextSpawn, intro ? intro + 0.35 : 0);
    // the first level with several notes at once (or the first endless run): a tip, once per device
    const data = A.store.gameData(GAME_ID);
    if ((L.maxOn > 1 || G.endless) && !data.sameTip) {
      data.sameTip = true; A.store.saveGameData(GAME_ID);
      setPrompt('Same note twice? Tongue it again!', 'tip');
      G.nextSpawn += 1.5;
    }
    run();
  }

  /** Draw the staff and Tempo once for the current width. Notes keep their progress, so this is safe mid-level. */
  function layout(force) {
    if (!G) return;
    const fw = $('field').clientWidth;
    // aim for a big staff, but keep it short enough to leave room for the HUD on a landscape screen
    const probe = A.staffSVG(inst.clef, [], {fit: G.fit, captions: G.L.names});
    const vb = probe.match(/viewBox="0 (\S+) \d+ (\S+)"/);
    top = +vb[1]; H = +vb[2];
    const want = Math.min(2, (innerHeight * 0.45) / H);
    const off = A.keySigWidth(G.sig);                 // Tempo stands after the key signature
    // wide enough that maxOn notes fit between the right edge and Tempo without touching (a smaller staff on phones)
    const room = 158 + off + G.roomOn * RULES.gapUnits;
    const newW = Math.max(340, room, Math.round(fw / want));
    if (!force && newW === W && Math.abs(fw / W - scale) < .001) return;
    W = newW; scale = fw / W;
    DEF_X = 84 + off; HIT_X = 124 + off; BEAM_X = DEF_X + 40;
    $('stormStaff').innerHTML = A.staffSVG(inst.clef, [], {fit: G.fit, captions: G.L.names, width: W, keySig: G.sig,
      label: 'Staff with notes marching toward Tempo'});
    const fx = $('fx');
    fx.setAttribute('viewBox', `0 ${top} ${W} ${H}`);
    fx.innerHTML = `<g transform="translate(${DEF_X} ${MID_Y})"><g class="tempo" id="tempo">${tempoSVG()}</g></g><g id="beams"></g>`;
    G.notes.forEach(n => { n.el.style.width = SLICE_W * scale + 'px'; place(n); });
  }
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => layout(false), 120); });

  function noteSVG(it) {
    const n = it.show, y = A.noteY(inst.clef, n);
    const capY = top + H - 10;
    const lx = n.acc ? -40 : -20;
    const b = `M${lx + 7} ${y - 19}H${lx}V${y + 19}H${lx + 7}M13 ${y - 19}H20V${y + 19}H13`;
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      rays += `<line x1="${(c * 10).toFixed(1)}" y1="${(y + s * 10).toFixed(1)}" x2="${(c * 26).toFixed(1)}" y2="${(y + s * 26).toFixed(1)}"/>`;
    }
    return `<svg viewBox="${SLICE_L} ${top} ${SLICE_W} ${H}">` +
      `<rect class="halo" x="${lx - 4}" y="${y - 23}" width="${28 - lx}" height="46" rx="12"/>` +
      `<g class="glyph">${A.noteGlyph(inst.clef, {n, x: 0, caption: G.L.names ? it.label : ''}, capY)}</g>` +
      `<path class="brackets" d="${b}"/>` +
      `<g class="burst"><circle cx="0" cy="${y}" r="9"/>${rays}</g></svg>`;
  }

  function spawn() {
    const it = G.items[G.spawned++];
    const el = document.createElement('div');
    el.className = 'sn';
    el.style.width = SLICE_W * scale + 'px';
    el.innerHTML = noteSVG(it);
    $('noteLayer').appendChild(el);
    const n = {it, pc: it.pc, y: A.noteY(inst.clef, it.show), p: 0, el};
    G.notes.push(n);
    place(n);
    G.nextSpawn = G.clock + gap();
    if (!G.front) pickFront();
  }

  /** seconds until the next note: runs of quick notes, then runs of slow ones (levels.js `gust`), averaging `every` */
  function gap() {
    const L = G.L, run = Math.max(1, L.maxOn - 1), quick = Math.floor(G.gi++ / run) % 2 === 1;
    const g = L.gust ? L.every * (1 + (quick ? -1 : 1) * L.gust) * (0.92 + Math.random() * 0.16) : L.every;
    return g;
  }

  /** room for a new note: fewer than maxOn on the staff, and the newest one has moved far enough from the edge */
  function roomForNote() {
    if (G.notes.length >= G.L.maxOn) return false;
    const newest = G.notes[G.notes.length - 1];
    return !newest || newest.p * (spawnX() - HIT_X) >= RULES.gapUnits;
  }

  function place(n) {
    n.el.style.transform = `translate3d(${((noteX(n.p) + SLICE_L) * scale).toFixed(1)}px,0,0)`;
  }

  /** the front note is the one closest to Tempo: always the oldest note still on the staff (it glows) */
  function pickFront() {
    const f = G.notes[0] || null;
    if (f === G.front) return;
    G.front = f;
    if (f) {
      f.el.classList.add('front');
      if (!/tip|good|bad/.test($('prompt').className)) setPrompt(playText(), '');
    }
  }
  const playText = () => G.L.maxOn > 1
    ? (G.L.names ? 'Play the notes before they reach Tempo!' : 'Read the notes and play them!')
    : (G.L.names ? 'Play the glowing note!' : 'Read the glowing note and play it!');

  function removeNote(n, cls) {
    const full = G.notes.length >= G.L.maxOn;
    G.notes.splice(G.notes.indexOf(n), 1);
    n.el.classList.remove('front');
    n.el.classList.add(cls);
    setTimeout(() => n.el.remove(), 550);
    if (G.front === n) G.front = null;
    if (full) G.nextSpawn = Math.max(G.nextSpawn, G.clock + RULES.refillMs / 1000);   // a spot just opened on a full staff
    pickFront();
    hud();
    checkEnd();
  }

  function blast(n) {
    let pts = RULES.base + Math.round((1 - n.p) * RULES.farBonus);
    if (G.endless) {
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
      pts = Math.round((END.base + (1 - n.p) * END.farBonus) * Math.max(1, 1 + END.speedBonus * (G.speed - 1)) * A.Endless.mult(G.combo));
    }
    G.score += pts; G.hits++;
    const x = noteX(n.p);
    // beam from Tempo's tuning fork to the note, then a burst where the note was
    const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    beam.setAttribute('class', 'beam');
    [['x1', BEAM_X], ['y1', BEAM_Y], ['x2', x], ['y2', n.y]].forEach(([k, v]) => beam.setAttribute(k, v));
    $('beams').appendChild(beam);
    setTimeout(() => beam.remove(), 350);
    kick('fire');
    const pop = document.createElement('div');
    pop.className = 'pop-pts'; pop.textContent = '+' + pts;
    pop.style.left = (x * scale) + 'px'; pop.style.top = ((n.y - top - 30) * scale) + 'px';
    $('noteLayer').appendChild(pop);
    setTimeout(() => pop.remove(), 800);
    setPrompt(`Blasted! That was ${n.it.label}.`, 'good');
    A.Sfx.event('note-hit');
    removeNote(n, 'boom');
  }

  function lose(n) {
    G.lost++; G.lives--;
    kick('ouch');
    setPrompt(`That ${n.it.label} got through!`, 'bad');
    if (G.endless) { G.combo = 0; A.Sfx.event('endless-life-lost'); }   // endless-game-over plays on the GAME OVER panel
    else A.Sfx.event(G.lives > 0 ? 'life-lost' : 'game-over');
    removeNote(n, 'lost');
  }

  function kick(cls) {                       // restart a one-shot animation on Tempo
    const t = $('tempo'); if (!t) return;
    t.classList.remove('fire', 'ouch'); void t.getBoundingClientRect(); t.classList.add(cls);
  }

  function checkEnd() {
    if (G.over) return;
    if (G.lives <= 0 || (!G.endless && G.spawned >= G.count && !G.notes.length)) {
      G.over = true;
      setTimeout(() => { if (G && G.over) finishLevel(); }, 750);
    }
  }

  function hud() {
    $('hudLeft').textContent = G.endless ? (G.combo ? `${G.combo} ×${A.Endless.mult(G.combo)}` : '0') : G.count - G.hits - G.lost;
    $('hudScore').textContent = G.score;
    $('hudLives').innerHTML = A.Endless.hearts(G.lives, G.maxLives);
    $('hudLives').setAttribute('aria-label', `${G.lives} of ${G.maxLives} lives`);
  }

  let promptT = 0;
  function setPrompt(text, cls) {
    const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || '');
    clearTimeout(promptT);
    if (cls) promptT = setTimeout(() => { if (G && !G.over && G.front) setPrompt(playText(), ''); }, cls === 'tip' ? 2600 : 1400);
  }

  /* ---------- the animation loop: move notes, spawn new ones ---------- */
  function frame(now) {
    raf = 0;
    if (!G || G.paused) return;
    const dt = Math.min(0.1, (now - last) / 1000);   // cap the step so a slow frame never jumps a note past Tempo
    last = now;
    // the storm never stops for a sound (see THE STORM NEVER STOPS at the top)
    if (!G.over) {
      G.clock += dt;
      if (G.endless) endlessTick();
      const step = dt / G.L.march;
      for (let i = 0; i < G.notes.length; i++) { G.notes[i].p += step; place(G.notes[i]); }
      while (!G.over && G.notes.length && G.notes[0].p >= 1) lose(G.notes[0]);
      if (!G.over && G.spawned < G.count && G.clock >= G.nextSpawn && roomForNote()) spawn();
    }
    raf = requestAnimationFrame(frame);
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---------- pause ---------- */
  function pause() {
    if (!G || G.paused || G.over || !$('results').hidden) return;
    G.paused = true; stop();
    $('play').classList.add('is-paused');
    $('paused').hidden = false;
    $('resumeBtn').focus();
  }
  function resume() {
    if (!G || !G.paused) return;
    G.paused = false;
    $('play').classList.remove('is-paused');
    $('paused').hidden = true;
    A.Pitch.ignoreCurrent();
    run();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('keydown', e => {
    if (!G || $('play').hidden) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { G.paused ? resume() : pause(); }
  });

  /* ---------- listening ---------- */
  A.Pitch.onHeld(pc => {
    if (!G || G.paused || G.over || !G.front) return;
    const hit = G.notes.find(n => n.pc === pc);        // the oldest match = the one closest to Tempo
    if (hit) blast(hit);
    else {
      G.wrong++;
      if (G.endless && G.combo) { G.combo = 0; hud(); }   // a wrong note breaks the combo, never costs a heart
      const f = G.front.el; f.classList.remove('nope'); void f.getBoundingClientRect(); f.classList.add('nope');
      setPrompt(G.L.maxOn > 1 ? `That's ${G.name(pc)}. It's not on the staff.` : `That's ${G.name(pc)}. Play the glowing note.`, 'bad');
      A.Sfx.event('note-wrong');
    }
  });

  let lastHeard = null, lastBars = -1, lastMatch = null;
  A.Pitch.onFrame((r, level) => {
    if (!G) return;
    const heard = r ? G.name(r.pc) : '–';
    const match = !!(r && G.notes.some(n => n.pc === r.pc));
    if (heard !== lastHeard) { $('hearNote').textContent = heard; lastHeard = heard; }
    if (match !== lastMatch) { $('hearNote').classList.toggle('match', match); lastMatch = match; }
    const bars = A.Pitch.bars(level);
    if (bars !== lastBars) { $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars)); lastBars = bars; }
  });

  /* ---------- results ---------- */
  function finishLevel() {
    stop();
    if (G.endless) {
      A.Endless.gameOver(Object.assign(endKey(), {
        run: {score: G.score, notes: G.hits, speed: G.topSpeed, combo: G.bestCombo},
        onAgain: () => startEndless(), onBack: showHub, backLabel: 'Levels'}));
      A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // GAME OVER is a menu too
      return;
    }
    const {lv, hits, lost, wrong, score, lives, count, key} = G;
    const need = Math.ceil(count * RULES.passRate);
    const cleared = lives > 0 && hits >= need;
    const stars = !cleared ? 0 : lost === 0 && wrong === 0 ? 3 : lost <= 1 ? 2 : 1;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars === 3 ? 'Perfect!' : stars ? 'Level cleared' : lives <= 0 ? 'The storm got through' : 'So close';
    $('resMsg').textContent =
      stars === 3 ? 'Every note blasted, no wrong notes.'
      : stars === 2 ? (lost ? 'Only one note got through. Stop them all with no wrong notes for 3 stars.'
                            : 'Nothing got through! Play with no wrong notes for 3 stars.')
      : stars === 1 ? 'Let one note or fewer get through for 2 stars.'
      : lives <= 0 ? `${RULES.lives} notes got through. Read the glowing note and play it early. You've got this!`
      : `Blast ${need} of ${count} notes to clear this level.`;
    $('resHits').textContent = `${hits}/${count}`;
    $('resLost').textContent = lost;
    $('resWrong').textContent = wrong;
    $('resScore').textContent = score;
    $('resBest').textContent = score > old.best && old.best ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // the menu music again, after the result sounds
    A.Skins.announce($('results').querySelector('.panel'));        // skins earned by this result (shared/skins.js)
    (hasNext ? $('resNext') : $('resRetry')).focus();
    // game-over already played when the last heart went
    A.Sfx.sequence([stars ? 'level-complete' : lives > 0 && 'level-failed', stars > old.stars && 'star-earned', score > old.best && old.best > 0 && 'new-high-score']);
  }

  // ?demo scales: Space plays the glowing (front) note
  A.ModePicker.demoSpace(() => G && !G.paused && !G.over && G.front && G.front.it.sounding != null ? G.front.it.sounding : null);

  A.Storm = {state: () => G, levels: LEVELS};   // tests

  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);
  $('pauseBtn').addEventListener('click', pause);
  $('resumeBtn').addEventListener('click', resume);
  $('pauseQuit').addEventListener('click', showHub);

  showHub();
})(window.Arcade);
