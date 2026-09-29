/* Note Ninja: a note appears on the scroll; tap its name. No microphone (no pitch.js / mic-gate.js).
   NOTES × ORDER (shared/mode-picker.js, notes from shared/sequences.js): First 5, a concert scale or Chromatic,
   in Random or Scale Order; scale pools show their key signature. The answer is always the note's real name,
   key signature included (a B in F major is B♭), spelled as shown (C♯ is not D♭).
   Answering: ♭ ♮ ♯ work like a Shift key for the next letter tap, then go back to ♮.
   Belts (levels) live in levels.js. Sounds are named events in shared/sfx.js.
   ENDLESS MODE (the ∞ card, shared/endless.js; its numbers are NINJA_ENDLESS in levels.js): G.endless, 3 hearts
   (a wrong answer or a timeout costs one), the time per note shrinks with the SPEED curve, read-ahead and the
   whole note set come in as it rises, notes come in chunks from the same sequences, no stars, a Top 5 per note set. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'note-ninja';
  const RULES = window.NINJA_RULES, END = window.NINJA_ENDLESS;
  const BELTS = window.NINJA_BELTS.map(L => Object.assign({}, A.belt(L.name), L));   // color and sparkle from shared/belts.js
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const ACC_SIGN = {'-1': '♭', 0: '', 1: '♯'};
  const GOLD = '#c98a12', MISS = '#d0503f';          // same found / missed colors as the other games
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;
  const sfx = name => A.Sfx.event(name);
  A.Sfx.use('endless');
  const member = A.currentMember();
  const endKey = () => ({gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: A.Endless.setKey(picker.state)});

  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: BELTS.length, onChange: () => showHub()});
  // THE PAUSE MENU (shared/ui-kit.js): the answer timer (and an Endless run's clock) stops while paused.
  // BACK TO LEVELS leaves the belt (or ends the run) with nothing saved, as "Quit belt" / "Quit run" did.
  const pause = A.UI.pause.mount({
    canPause: () => !!G && !G.over && G.i < G.count,
    onPause: () => { if (G) G.paused = true; },
    onResume: () => { if (G) G.paused = false; },
    onRestart: () => G && G.endless ? startEndless() : startLevel(G.lv),
    onLevels: showHub, levelsLabel: 'Back to belts',
    info: () => !G ? [] : G.endless ? [['Speed', G.speed.toFixed(1)], ['Score', G.score]]
      : [['Note', `${Math.min(G.i + 1, G.count)} / ${G.count}`], ['Score', G.score]],
  });

  /* ---------- belt select ---------- */
  function showHub() {
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    stopTimer();
    G = null;
    const st = picker.state, key = st.progressKey;
    pause.setActive(false); A.UI.results.hide();
    $('play').hidden = true; $('hub').hidden = false;
    $('wrap').classList.remove('playing');
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap;
    $('hubConcert').textContent = card.sub;
    $('hubStaff').innerHTML = card.html;
    $('levelGrid').innerHTML = BELTS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      // open: belt 1, the belt after a cleared one, or any belt that already has stars (e.g. moved up when Red was added)
      const unlocked = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const count = A.ModePicker.sequence(st, L, lv).items.length;
      const blurb = A.ModePicker.levelText(st, L, lv, [L.onStaff > 1 ? `Read ahead: ${L.onStaff} notes at once.` : '', L.guides ? 'Letter guides.' : '', `${L.time} s per note.`]);
      return `<button class="lvl belt${L.sparkle ? ' sparkle' : ''}" data-l="${lv}" style="--belt:var(--${L.color})" ${unlocked ? '' : 'disabled'}>
        <span class="n">${L.name} belt</span>
        <span class="mini" aria-hidden="true"><i class="belt-knot"></i></span>
        <span class="t">${L.onStaff > 1 ? `Read ahead ×${L.onStaff}` : count + ' notes'}</span>
        <span class="d">${blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : count + ' notes') : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), Object.assign(endKey(), {
      label: `${member ? member.short : inst.shortName} · ${st.label}`,
      blurb: 'Name notes until your 3 hearts are gone. The timer keeps getting shorter, and more notes come at once. A wrong answer or running out of time costs a heart.',
      onPlay: startEndless}));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), picker: $('modePick'), endless: $('endlessTile'),
      unlocked: i => A.DEMO || i === 0 || A.store.level(key, inst.id, i + 1).stars > 0 || A.store.level(key, inst.id, i).stars > 0,
      lockText: i => `Clear the ${BELTS[i - 1].name} Belt to unlock`});
  }

  /* ---------- play ---------- */
  let G = null, timerId = 0;

  function startLevel(lv) {
    A.LevelSelect.played(lv - 1);                   // the level select comes back with this level selected
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    const L = BELTS[lv - 1], st = picker.state, seq = A.ModePicker.sequence(st, L, lv);
    // each item: the note as drawn (show) and its real name (letter + acc of n: key signature included)
    const items = seq.items.map(it => ({show: it.show, letter: it.n.letter, acc: it.n.acc, label: it.label}));
    G = {lv, L, items, count: items.length, key: st.progressKey, sig: seq.sig, fit: seq.fit,
         accs: seq.items.concat(seq.pool).some(it => it.n.acc),   // show ♭ ♮ ♯ only if these notes have any sharps or flats
         i: 0, gStart: 0, score: 0, hits: 0, wrong: 0, missed: 0, combo: 0, bestCombo: 0,
         acc: 0, locked: true, noteStart: 0};
    begin(`Belt ${lv}`, L.name, L, 'level-start');
  }

  /* ---------- ENDLESS MODE ---------- */
  const itemOf = it => ({show: it.show, letter: it.n.letter, acc: it.n.acc, label: it.label, pc: it.pc});
  function chunk(S) {
    const small = S < END.smallPoolUntil;
    return A.ModePicker.sequence(picker.state, {count: 24, pool: small ? 3 : 5}, small ? 1 : 2);
  }
  function startEndless() {
    A.LevelSelect.played('endless');
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    const st = picker.state, seq = chunk(0), full = A.ModePicker.sequence(st, {count: 8, pool: 5}, 2);
    G = {endless: true, L: {name: 'Endless', color: 'belt-white'}, items: seq.items.map(itemOf), count: Infinity,
         key: st.progressKey, sig: seq.sig, fit: seq.fit,
         accs: seq.items.concat(full.pool).some(it => it.n.acc),   // the whole set: its ♭/♯ may come in later
         i: 0, gStart: 0, score: 0, hits: 0, wrong: 0, missed: 0, combo: 0, bestCombo: 0,
         acc: 0, locked: true, noteStart: 0,
         clock: 0, speed: END.start, topSpeed: END.start, step: Math.floor(END.start / END.flashEvery),
         lives: END.lives, over: false, beltColor: ''};
    endlessRow(true);
    begin('Endless', 'Speed ' + END.start.toFixed(1), G.L, 'endless-start');
  }
  /** SPEED → this moment's belt-like row: time per note (always), and at a new group guides + read-ahead + hints */
  function endlessRow(group) {
    const S = G.speed, L = G.L;
    L.time = Math.max(END.minTime, END.time1 / S);
    if (group) {
      L.guides = END.guides.reduce((g, [from, v]) => S >= from ? v : g, 0);
      L.onStaff = END.readAhead.reduce((n, [from, v]) => S >= from ? v : n, 1);
      L.relabel = S >= END.noHintsFrom ? false : undefined;
    }
    // the ninja wears the belt that matches this pace (the highest belt whose time per note is still at least this)
    const belt = BELTS.filter(b => b.time >= L.time).pop() || BELTS[0];
    L.color = belt.color; L.sparkle = belt.sparkle;
  }
  /** the run's clock (only while a note waits for an answer): the SPEED, and "SPEED UP!" at each step */
  function endlessTick(dt) {
    G.clock += dt;
    const S = G.speed = A.Endless.speed(END, G.clock);
    G.topSpeed = Math.max(G.topSpeed, S);
    const step = Math.floor(S / END.flashEvery);
    if (step > G.step) { G.step = step; A.Endless.flash($('edFlash'), 'SPEED UP!'); sfx('speed-up'); }
    const shown = 'Speed ' + S.toFixed(1);
    if ($('hudBeltName').textContent !== shown) $('hudBeltName').textContent = shown;
  }
  function moreNotes() {
    const add = chunk(G.speed).items.map(itemOf), lastIt = G.items[G.items.length - 1];
    if (lastIt && add.length > 1 && add[0].pc === lastIt.pc) add.shift();    // never the same pitch twice across chunks
    G.items = G.items.concat(add);
  }
  function beltLook(L) {
    if (G.beltColor === L.color) return;
    G.beltColor = L.color;
    $('hudChip').style.setProperty('--belt', `var(--${L.color})`);
    $('hudChip').classList.toggle('sparkle', !!L.sparkle);
    $('ninja').innerHTML = A.ninjaSVG({belt: L.color});
  }
  function loseLife(k, color, text) {
    G.lives--; G.combo = 0; G.locked = true;
    reveal(k, color);
    sfx('endless-life-lost');
    act('stumble');
    setPrompt(text, 'bad');
    setAcc(0);
    hud();
    if (G.lives <= 0) {
      G.over = true; stopTimer(); pause.setActive(false);   // the run is over: GAME OVER comes in a moment
      const g = G;
      setTimeout(() => { if (G === g && G.over && !$('play').hidden) endlessOver(); }, 900);
      return;
    }
    advance(END.afterLifeMs);
  }
  function endlessOver() {
    A.Endless.gameOver(Object.assign(endKey(), {
      run: {score: G.score, notes: G.hits, speed: G.topSpeed, combo: G.bestCombo},
      onAgain: () => startEndless(), onBack: showHub, backLabel: 'Belts'}));
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // GAME OVER is a menu too
  }

  function begin(label, name, L, sound) {
    A.UI.results.hide(); $('hub').hidden = true; $('play').hidden = false;
    pause.set({leaveTitle: G.endless ? 'End this run?' : 'Leave this belt?',
      leaveText: G.endless ? 'This run won’t go on the Top 5.' : 'Your progress on this belt won’t be saved.', leaveYes: G.endless ? 'End run' : 'Leave'});
    $('wrap').classList.add('playing');
    pause.setActive(true);                         // after the play layout, so the button lines up with "← Arcade"
    $('hudBeltLabel').textContent = label;
    $('hudBeltName').textContent = name;
    $('hudCountLabel').textContent = G.endless ? 'Lives' : 'Note';
    G.beltColor = '';
    beltLook(L);
    $('accRow').hidden = !G.accs;
    setAcc(0);
    hud();
    window.scrollTo(0, 0);
    sfx(sound);
    drawGroup();
  }

  /* the current notes (1–4) on a still, crisp staff; answered notes stay put and turn gold.
     Fewer notes = a narrower drawing, so it scales up bigger on the screen. */
  let W = 400;
  function drawGroup() {
    if (G.endless) {
      endlessRow(true); beltLook(G.L);
      if (G.gStart + G.L.onStaff >= G.items.length - 1) moreNotes();
    }
    const n = G.L.onStaff, grp = G.items.slice(G.gStart, G.gStart + n);
    const sigW = A.keySigWidth(G.sig), guides = G.L.guides > 0;
    W = [0, 290, 330, 380, 420][n] + sigW;
    const start = 84 + sigW + (guides ? 34 : 0), end = W - 30;
    G.xs = grp.map((_, k) => grp.length === 1 && n === 1 ? (start + end) / 2 : start + (end - start) * (k + .5) / n);
    let svg = A.staffSVG(inst.clef, grp.map((it, k) => ({n: it.show, x: G.xs[k], id: 'nn' + k})),
      {fit: G.fit, keySig: G.sig, width: W, captions: true, label: n > 1 ? `${grp.length} notes, read left to right` : 'Name this note'});
    if (guides) svg = svg.replace('</svg>', guideSVG(66 + sigW, G.L.guides) + '</svg>');
    $('playStaff').innerHTML = svg;
    G.locked = false;
    nextNote();
  }
  /* faint letter names just after the clef (shared with Dojo Duel: Arcade.staffGuides in shared/ui.js) */
  const guideSVG = (x, alpha) => A.staffGuides(inst.clef, x, alpha);

  function current() { return G.items[G.i]; }
  function nextNote() {
    const it = current();
    if (G.endless) endlessRow(false);
    else $('hudCount').textContent = `${G.i + 1} / ${G.count}`;
    placePointer();
    $('demoAns').hidden = !A.DEMO;
    if (A.DEMO) $('demoAns').textContent = `Answer: ${it.label}`;
    setPrompt(G.L.onStaff > 1 ? 'Name the notes, left to right' : 'Name the note', '');
    G.noteStart = performance.now();
    startTimer();
  }
  function placePointer() {
    const k = G.i - G.gStart, svg = $('playStaff').querySelector('svg'), ptr = $('ptr');
    if (!svg || G.xs[k] == null) { ptr.hidden = true; return; }
    const r = svg.getBoundingClientRect(), box = $('scroll').getBoundingClientRect();
    ptr.hidden = G.L.onStaff < 2;                    // one note at a time needs no pointer
    ptr.style.left = (r.left - box.left + G.xs[k] / W * r.width) + 'px';
  }
  addEventListener('resize', () => { if (G && !$('play').hidden) placePointer(); });

  function reveal(k, color) {                         // color a note and write its name under it
    A.colorNote('nn' + k, color);
    const g = document.getElementById('nn' + k), svg = $('playStaff').querySelector('svg');
    if (!g || !svg) return;
    const vb = svg.viewBox.baseVal;
    g.insertAdjacentHTML('beforeend', `<text class="ncap" x="${G.xs[k]}" y="${vb.y + vb.height - 10}" text-anchor="middle" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="17" fill="${color}">${G.items[G.gStart + k].label}</text>`);
  }

  /* ---------- the timer (paused while the tab is hidden) ---------- */
  function startTimer() {
    stopTimer();
    const bar = $('timer').firstElementChild;
    bar.style.transform = 'scaleX(1)'; $('timer').classList.remove('low');
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      if (!G) return;
      if (document.hidden || G.paused) { G.noteStart += now - last; last = now; return; }   // hidden tab or PAUSE: the clock stops
      const dt = (now - last) / 1000;
      last = now;
      if (!G || G.locked) return;
      if (G.endless) endlessTick(dt);
      const frac = 1 - (now - G.noteStart) / (G.L.time * 1000);
      bar.style.transform = `scaleX(${Math.max(0, frac)})`;
      $('timer').classList.toggle('low', frac < .3);
      if (frac <= 0) miss();
    }, 100);
  }
  function stopTimer() { clearInterval(timerId); timerId = 0; }

  /* ---------- answers ---------- */
  function setAcc(a) {
    if (G) G.acc = a;
    document.querySelectorAll('.acc').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.acc === a)));
    document.querySelectorAll('.letter').forEach(b => {
      b.firstChild.textContent = b.dataset.letter + (G && G.L.relabel === false ? '' : ACC_SIGN[a]);   // Diamond: no hint on the buttons
      b.setAttribute('aria-label', b.dataset.letter + (a < 0 ? ' flat' : a > 0 ? ' sharp' : ''));
    });
  }
  $('letters').innerHTML = LETTERS.map(l => `<button type="button" class="letter" data-letter="${l}"><span>${l}</span></button>`).join('');
  $('letters').querySelectorAll('.letter').forEach(b => b.addEventListener('click', () => answer(b.dataset.letter)));
  document.querySelectorAll('.acc').forEach(b => b.addEventListener('click', () => { if (G) setAcc(+b.dataset.acc === G.acc ? 0 : +b.dataset.acc); }));
  A.holdGuard($('pad'));                             // a long press on an answer never selects or calls out (ui.js)

  function answer(letter) {
    if (!G || G.locked || G.paused) return;
    const it = current(), acc = G.accs ? G.acc : 0;
    setAcc(0);                                          // the Shift key lets go after every letter
    if (letter === it.letter && acc === it.acc) hit(); else wrongAnswer(letter + ACC_SIGN[acc]);
  }

  function hit() {
    const it = current(), k = G.i - G.gStart;
    const frac = Math.max(0, 1 - (performance.now() - G.noteStart) / (G.L.time * 1000));
    let pts, milestone;
    if (G.endless) {
      G.combo++;
      pts = Math.round((END.base + frac * END.quickBonus) * Math.max(1, 1 + END.speedBonus * (G.speed - 1)) * A.Endless.mult(G.combo));
      milestone = A.Endless.COMBO.some(([n]) => n === G.combo);
    } else {
      const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
      pts = Math.round((RULES.base + frac * RULES.speedBonus) * mult);
      G.combo++;
      milestone = G.combo % RULES.comboStep === 0;
    }
    G.score += pts; G.hits++; G.bestCombo = Math.max(G.bestCombo, G.combo);
    reveal(k, GOLD);
    act('strike');
    if (milestone) { sfx('ninja-combo'); popCombo(); } else sfx('ninja-slash');
    setPrompt(`Yes! ${it.label}. +${pts}`, 'good');
    advance(0);
  }
  function wrongAnswer(said) {
    if (G.endless) { G.wrong++; loseLife(G.i - G.gStart, MISS, `Not ${said}. That was ${current().label}.`); return; }
    G.wrong++; G.combo = 0;
    act('stumble');
    sfx('note-wrong');
    setPrompt(`Not ${said}. Look again.`, 'bad');
    hud();
  }
  function miss() {
    const it = current(), k = G.i - G.gStart;
    if (G.endless) { G.missed++; loseLife(k, MISS, `Time! That was ${it.label}.`); return; }
    G.missed++; G.combo = 0; G.locked = true;
    reveal(k, MISS);
    sfx('note-missed');
    setPrompt(`Time! That was ${it.label}.`, 'bad');
    setAcc(0);
    advance(RULES.afterMissMs);
  }
  /* on to the next note; a new group of notes after the last one on the staff */
  function advance(delay) {
    stopTimer();
    G.i++;
    hud();
    const g = G;                                        // a RESTART from the pause menu makes a new G: old timeouts stop
    if (G.i >= G.count) { G.locked = true; pause.setActive(false); setTimeout(() => { if (G === g) finishLevel(); }, Math.max(delay, 600)); return; }
    if (G.i - G.gStart >= G.L.onStaff) {
      G.locked = true;
      G.gStart = G.i;
      setTimeout(() => { if (G === g && !$('play').hidden) drawGroup(); }, Math.max(delay, RULES.afterGroupMs));
    } else if (delay) {
      setTimeout(() => { if (G === g && !$('play').hidden) { G.locked = false; nextNote(); } }, delay);
    } else nextNote();
  }

  /* ---------- the ninja, the target, the scroll ---------- */
  function act(kind) {
    const nj = $('ninja'), tg = $('target'), sc = $('scroll');
    if (kind === 'strike') { restart(nj, 'strike'); restart(tg, 'split'); }
    else { restart(nj, 'stumble'); if (!reduced.matches) restart(sc, 'shake'); }
  }
  function restart(el, cls) { el.classList.remove('strike', 'stumble', 'split', 'shake'); void el.getBoundingClientRect(); el.classList.add(cls); }
  function popCombo() {
    const m = G.endless ? A.Endless.mult(G.combo) : Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    const p = $('comboPop'); p.textContent = `${G.combo} in a row! ×${m}`;
    p.classList.remove('go'); void p.getBoundingClientRect(); p.classList.add('go');
  }
  function hud() {
    const mult = G.endless ? A.Endless.mult(G.combo) : Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    if (G.endless) {
      $('hudCount').innerHTML = `<span class="ed-hearts">${A.Endless.hearts(G.lives, END.lives)}</span>`;
      $('hudCount').setAttribute('aria-label', `${G.lives} of ${END.lives} lives`);
    } else $('hudCount').removeAttribute('aria-label');
    $('hudCombo').textContent = G.combo ? `${G.combo} ×${mult}` : '0';
    $('hudCombo').classList.toggle('hot', mult > 1);
    $('hudScore').textContent = G.score;
  }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- keyboard (Chromebooks): A–G answer, 1 / 2 / 3 = ♭ / ♮ / ♯ ---------- */
  addEventListener('keydown', e => {
    // never while a panel is open (results, pause, settings, a confirm: shared/ui-kit.js) or paused
    if (!G || G.paused || $('play').hidden || A.UI.isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k)) { e.preventDefault(); answer(k); }
    else if (G.accs && (k === '1' || k === '2' || k === '3')) { e.preventDefault(); setAcc(+k - 2); }
  });

  /* ---------- results ---------- */
  function finishLevel() {
    stopTimer();
    const {lv, L, hits, wrong, missed, score, count, key, bestCombo} = G;
    const pct = hits / count;
    const stars = wrong === 0 && missed === 0 ? 3 : pct >= RULES.twoStarRate ? 2 : pct >= RULES.passRate ? 1 : 0;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)}, stars);
    const newBelt = stars > 0 && old.stars === 0 && lv < BELTS.length;
    const newBest = score > old.best && old.best > 0;
    const hasNext = lv < BELTS.length && (stars > 0 || A.DEMO || A.store.level(key, inst.id, lv + 1).stars > 0);
    A.UI.results.show({gameId: GAME_ID, stars,
      hero: `<div class="res-ninja" id="resNinja">${A.ninjaSVG({belt: stars ? L.color : 'belt-white', cls: stars ? 'cheer' : ''})}</div>`,
      title: stars === 3 ? 'Perfect!' : stars ? `${L.name} belt cleared` : 'So close',
      msg: stars
        ? (stars === 3 ? 'Every note, no mistakes. True ninja reading!'
          : stars === 2 ? 'Name every note in time with no mistakes for 3 stars.'
          : `Name ${Math.ceil(count * RULES.twoStarRate)} of ${count} notes in time for 2 stars.`) + (newBelt ? ` You earned the ${BELTS[lv].name} belt!` : '')
        : `Name ${Math.ceil(count * RULES.passRate)} of ${count} notes in time to clear this belt. You've got this!`,
      tiles: [['Named', `${hits}/${count}`], ['Mistakes', wrong], ['Missed', missed], ['Score', score]],
      extra: `<p class="res-combo">Best combo <b id="resCombo">${bestCombo}</b></p>`,
      newBest, best: old.best ? `Best: ${Math.max(score, old.best)}` : '',
      next: {label: 'Next belt', hidden: !hasNext, onClick: () => startLevel(lv + 1)},
      retry: {label: 'Try again', onClick: () => startLevel(lv)},
      levels: {label: 'Belts', onClick: showHub}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // the menu music again, after the result sounds
    // sounds, one after another (each when the one before ends, whatever its length)
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > old.stars && 'star-earned', newBest && 'new-high-score',
      newBelt && (BELTS[lv].sparkle ? 'belt-diamond' : 'belt-earned')]);
  }

  A.Ninja = {state: () => G};   // tests

  showHub();
})(window.Arcade);
