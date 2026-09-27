/* VANISHING INK: a reading-memory game (Band Ninja world). A short line of notes is brushed onto the Ink Master's
   scroll; the magic ink fades (or vanishes); the student plays the notes back, in order, from memory. It trains
   reading notes in groups and seeing melodic shapes (steps, skips, repeated notes): the next step after Ghost Notes.
   Notes: the NOTES × ORDER note set (shared/mode-picker.js + sequences.js) of the student's instrument; each scroll is
   made by THE PATTERN GENERATOR (shared/patterns.js, shared with Lost Signal, with INK_GEN from levels.js). Drawn in
   the student's written pitch and clef as plain quarter notes; answers match by concert pitch class (any octave).
   Scale Order = stepwise scrolls only.
   THE MICROPHONE listens from the moment the ink appears, but NOTHING counts until the ink is fully gone: a note
   played while the ink shows only brings up "READ, DON'T PLAY YET". When the ink is gone: Pitch.ignoreCurrent(), and
   THE ECHO FLOW (shared/echo.js, shared with Lost Signal) takes the answer: each new attack (or a held note no attack
   was heard for) fills the next slot, right or wrong; RULES.slotMs without a note = missed. The answer clock pauses
   while a sound mutes the mic (Pitch.isSuppressed). The study clock does not (nothing is answered while it runs).
   Every sound is unpitched noise; music plays only on the level screens (never while listening).
   Levels: INK_LEVELS; ENDLESS SCROLL (the ENDLESS card, shared/endless.js): INK_ENDLESS. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'vanishing-ink';
  const LEVELS = window.INK_LEVELS, RULES = window.INK_RULES, GEN = window.INK_GEN, END = window.INK_ENDLESS;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const LAYOUT = {gap: 78, minW: 470};                 // the scroll's staff: room per note, narrowest drawing
  const STUDY = new Set(['brush', 'study', 'reveal']);  // phases where the ink shows: nothing played counts

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember();
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('checkerLink').href = A.linkTo('../note-checker/index.html') + '#' + GAME_ID;
  $('demoHelp').hidden = !A.DEMO;
  $('hubMaster').innerHTML = inkMasterSVG('calm');
  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: LEVELS.length, onChange: () => showHub()});
  const endKey = () => ({gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: A.Endless.setKey(picker.state)});

  /* ---------- the microphone: listening only while a scroll is on (never on the menus) ---------- */
  let listening = false;
  function mic(on) {
    listening = !!on;
    A.Pitch.pauseListening(!on);
    if (on) A.Pitch.ignoreCurrent();
    if (A.Sfx.sync) A.Sfx.sync();
    $('hearBox').classList.toggle('off', !on);
  }
  const menuMusic = on => { A.Sfx.setMusic(on ? ['vanishing-ink-music'] : null); if (A.Bg) A.Bg.menu(on); };   // a file only (nothing pitched is generated); + the menu background

  /* ---------- the note set and the patterns (shared/patterns.js) ---------- */
  const noteSet = pool => A.patterns.noteSet(picker.state, pool);
  const stepOnly = () => picker.state.order === 'order';
  const generate = (set, len, rules) => A.patterns.generate(set, len, rules, GEN);
  const endlessRules = len => ({leap: stepOnly() ? 2 : len >= END.leapFrom ? END.leapLater : END.leap, repeats: false});

  /* ---------- level select ---------- */
  let G = null, run = 0, hub = true;
  function showHub() {
    run++; G = null; hub = true;
    if (A.Pitch.active || A.Pitch.demoReady) mic(false);
    menuMusic(true);
    const st = picker.state, key = st.progressKey;
    A.ModePicker.useRange(st);
    ['play', 'results', 'intro', 'ending'].forEach(id => { $(id).hidden = true; });
    $('hub').hidden = false; $('wrap').classList.remove('in-play');
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap; $('hubConcert').textContent = card.sub; $('hubStaff').innerHTML = card.html;
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      const open = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const bits = [`${L.len} notes`, `${L.study} s`, L.ink === 'fade' ? 'ink fades' : 'ink vanishes', `${L.reveals} reveal${L.reveals === 1 ? '' : 's'}`];
      return `<button class="lvl ${L.ink}" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini" aria-hidden="true">${'<i></i>'.repeat(L.len)}</span>
        <span class="t">${L.name}</span>
        <span class="d">${bits.join(' · ')}${stepOnly() ? ' · stepwise' : ''}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${open ? (p.best ? 'Best ' + p.best : L.rounds + ' scrolls') : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => intro(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), Object.assign(endKey(), {
      title: 'Endless Scroll',
      label: `${member ? member.short : inst.shortName} · ${st.label}`,
      blurb: 'The same scroll comes back each round with one new note on the end. How long a scroll can you remember? 3 lives, no reveals.',
      onPlay: () => A.requireMic(startEndless)}));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), picker: $('modePick'), endless: $('endlessTile'),
      unlocked: i => A.DEMO || i === 0 || A.store.level(key, inst.id, i + 1).stars > 0 || A.store.level(key, inst.id, i).stars > 0});
  }

  /* ---------- the level intro: the Ink Master's line + one plain sentence about what's new ---------- */
  function intro(lv) {
    A.LevelSelect.played(lv - 1);                   // the level select comes back with this level selected
    const L = LEVELS[lv - 1];
    $('introMaster').innerHTML = inkMasterSVG(lv === LEVELS.length ? 'happy' : 'calm');
    $('introSay').textContent = `“${L.say}”`;
    $('introKicker').textContent = `Level ${lv} · ${L.rounds} scrolls`;
    $('introTitle').textContent = L.name;
    $('introNow').textContent = L.nowWhat + (stepOnly() ? ' (Scale Order: every scroll moves step by step.)' : '');
    $('intro').hidden = false;
    $('introGo').onclick = () => { $('intro').hidden = true; A.requireMic(() => startLevel(lv)); };
    $('introGo').focus();
  }
  $('introBack').addEventListener('click', () => { $('intro').hidden = true; });

  /* ---------- play ---------- */
  function startLevel(lv) {
    A.LevelSelect.played(lv - 1);                   // the level select comes back with this level selected
    const L = LEVELS[lv - 1];
    G = {lv, L, ns: noteSet(L.pool), r: 0, score: 0, hits: 0, total: 0, reveals: 0, key: picker.state.progressKey};
    enterPlay(`Level ${lv}`, L.name);
    nextRound();
  }
  function startEndless() {
    A.LevelSelect.played('endless');
    const ns = noteSet(END.pool);
    G = {endless: true, ns, round: 0, lives: END.lives, score: 0, longest: 0, hits: 0, total: 0, reveals: 0};
    G.pattern = generate(ns.set, END.startLen, endlessRules(END.startLen));
    enterPlay('Endless Scroll', 'Round 1');
    nextRound();
  }
  function enterPlay(label, name) {
    hub = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // the hidden menu's button keeps no focus
    menuMusic(false);                                   // never music while the scroll is on
    A.ModePicker.useRange(picker.state);
    ['hub', 'results', 'intro'].forEach(id => { $(id).hidden = true; });
    $('play').hidden = false; $('wrap').classList.add('in-play');
    $('hudLevelLabel').textContent = label; $('hudLevelName').textContent = name;
    $('hudMidLabel').textContent = G.endless ? 'Longest' : 'Scroll';
    $('hudRightLabel').textContent = G.endless ? 'Lives' : 'Reveals';
    $('quitPlay').textContent = G.endless ? 'Quit scroll' : 'Quit level';
    window.scrollTo(0, 0);
  }

  /** one round: the ink brushes in → STUDY THE SCROLL → the ink fades or vanishes → PLAY IT FROM MEMORY → results */
  async function nextRound() {
    const tok = ++run;
    let pattern, study, ink, fade;
    if (G.endless) {
      G.round++;
      pattern = G.pattern;
      const n = pattern.length;
      study = Math.max(END.minStudy + END.minPerNote * n, (END.study + END.perNote * n) * Math.pow(END.shrink, G.round - 1));
      ink = G.round <= END.fadeRounds ? 'fade' : 'vanish'; fade = END.fade;
      $('hudLevelName').textContent = `Round ${G.round}`;
    } else {
      G.r++;
      const L = G.L, same = p => G.lastKey && p.map(it => it.sounding).join() === G.lastKey;
      for (let k = 0; k < 8 && (!pattern || same(pattern)); k++) pattern = generate(G.ns.set, L.len, {leap: stepOnly() ? 2 : L.leap, repeats: L.repeats});
      G.lastKey = pattern.map(it => it.sounding).join();                 // never the same scroll twice in a row
      study = L.study; ink = L.ink; fade = L.fade;
    }
    G.R = {pattern, studyMs: study * 1000, ink, fade, reveals: 0, phase: 'brush', t: 0, last: 0, faded: false, warned: 0};
    echo.begin(pattern); input.reset();
    $('slots').classList.add('wait');
    $('roundRes').hidden = true; $('revealBtn').hidden = true;
    $('scroll').classList.remove('back', 'done');
    hud(); setPrompt('', ''); hideNope();
    drawInk(pattern);
    timerBar(1);
    mic(true);                                          // listening, but nothing counts until the ink is gone
    setStatus('Study the scroll');
    demoText();
    await brushIn(tok);
    if (tok !== run) return;
    G.R.phase = 'study'; G.R.last = 0;
    kick();
  }

  /* ---------- the ink: brushed in, studied, faded or vanished ---------- */
  let notes = [];
  /** the staff is sized for this scroll's own notes (as large as it can be; a wide note set like Chromatic would
      otherwise shrink it), and the results are drawn with the same size, so the ink comes back in the same place */
  const inkFit = pattern => pattern.map(it => it.show);
  function drawInk(pattern) {
    A.Echo.drawResult($('staffBox'), {clef: inst.clef, pattern, res: [], sig: G.ns.sig, fit: inkFit(pattern), name: G.ns.name,
      plain: true, idPrefix: 'ink', gap: LAYOUT.gap, minW: LAYOUT.minW, label: 'The scroll'});
    notes = pattern.map((_, k) => document.getElementById('ink' + k));
    notes.forEach(g => { g.classList.add('ink-note'); g.style.opacity = 0; });
  }
  const setInk = v => notes.forEach(g => { if (g) g.style.opacity = v; });
  /** the notes appear one by one, left to right (all at once under reduced motion) */
  async function brushIn(tok) {
    if (reduced.matches) { setInk(1); A.Sfx.event('ink-brush'); return; }
    for (let k = 0; k < notes.length; k++) {
      if (tok !== run) return;
      const g = notes[k];
      g.style.opacity = 1;
      g.animate([{opacity: 0, transform: 'translate(-6px, -3px) scale(1.18)'}, {opacity: 1, transform: 'none'}], {duration: 170, easing: 'ease-out'});
      A.Sfx.event('ink-brush');
      await wait(RULES.brushMs);
    }
    await wait(120);
  }
  /** the ink disappears all at once, in small puffs of ink smoke (VANISH levels; no puffs under reduced motion) */
  function puff() {
    const svg = $('staffBox').querySelector('svg');
    if (!svg || reduced.matches) return;
    const NS = 'http://www.w3.org/2000/svg', layer = document.createElementNS(NS, 'g');
    layer.setAttribute('class', 'puff');
    notes.forEach((g, k) => {
      const head = g && g.querySelector('ellipse'); if (!head) return;
      const cx = +head.getAttribute('cx'), cy = +head.getAttribute('cy');
      for (let j = 0; j < 5; j++) {
        const c = document.createElementNS(NS, 'circle'), a = j / 5 * Math.PI * 2 + k, d = 8 + (j % 2) * 6;
        c.setAttribute('cx', cx + Math.cos(a) * d); c.setAttribute('cy', cy + Math.sin(a) * d * .7); c.setAttribute('r', 5 + (j % 3) * 2);
        layer.appendChild(c);
        c.animate([{opacity: .55, transform: 'scale(.4)'}, {opacity: 0, transform: 'scale(1.7)'}], {duration: 520, easing: 'ease-out', fill: 'forwards'});
      }
    });
    svg.appendChild(layer);
    setTimeout(() => layer.remove(), 700);
  }

  /* the round clock (game time: it stops while the tab is hidden): the study time, the fade, the reveal */
  let raf = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0;
    const R = G && G.R;
    if (!R || (R.phase !== 'study' && R.phase !== 'reveal')) return;
    const dt = R.last ? Math.min(100, now - R.last) : 0; R.last = now;
    R.t += dt;
    if (R.phase === 'study') {
      const p = R.t / R.studyMs;
      timerBar(1 - p);
      if (R.ink === 'fade') {
        const from = 1 - R.fade;                       // the last part of the study time: all the notes fade together
        if (p >= from) {
          if (!R.faded) { R.faded = true; A.Sfx.event('ink-fade'); setStatus('The ink is fading…'); }
          setInk(Math.max(0, (1 - p) / R.fade));
        }
      }
      if (p >= 1) { inkGone(); return; }
    } else if (R.t >= RULES.revealMs) { revealDone(); return; }
    else timerBar(1 - R.t / RULES.revealMs);
    raf = requestAnimationFrame(tick);
  }
  /** the ink is fully gone: from now on notes count (starting fresh) */
  function inkGone() {
    const R = G.R;
    if (R.ink === 'vanish') puff();
    setInk(0); timerBar(0);
    R.phase = 'echo';
    A.Pitch.ignoreCurrent();                            // a note already sounding never counts: the answer starts fresh
    $('slots').classList.remove('wait');
    setStatus('Play it from memory');
    setPrompt('Play the notes back, in order.', '');
    echo.start();
    updateReveal();
    A.Sfx.sequence([R.ink === 'vanish' && 'ink-vanish', 'ink-your-turn']);   // the answer clock waits while they play
  }

  /* ---------- REVEAL SCROLL: the ink shows again briefly, before the first note (costs a little) ---------- */
  const revealsLeft = () => (G && !G.endless && G.R ? G.L.reveals - G.R.reveals : 0);
  function updateReveal() {
    const R = G && G.R, can = R && R.phase === 'echo' && echo.i === 0 && revealsLeft() > 0;
    $('revealBtn').hidden = !can;
    if (can) $('revealBtn').textContent = `Reveal scroll (${revealsLeft()} left)`;
    hud();
  }
  $('revealBtn').addEventListener('click', () => {
    const R = G && G.R;
    if (!R || R.phase !== 'echo' || echo.i !== 0 || revealsLeft() <= 0) return;
    R.reveals++; G.reveals++;
    R.phase = 'reveal'; R.t = 0; R.last = 0;
    $('revealBtn').hidden = true;
    $('slots').classList.add('wait');
    echo.mark();
    setInk(1);
    timerBar(1);
    setStatus('Study the scroll');
    setPrompt('Reveal used: this round is worth a little less.', '');
    A.Sfx.event('ink-reveal-scroll');
    hud();
    kick();
  });
  function revealDone() {
    const R = G.R;
    setInk(0); timerBar(0);
    R.phase = 'echo';
    A.Pitch.ignoreCurrent();
    $('slots').classList.remove('wait');
    setStatus('Play it from memory');
    setPrompt('Play the notes back, in order.', '');
    echo.start();                                       // the first slot's clock starts again
    updateReveal();
  }

  /* ---------- input: a note played while the ink shows never counts ---------- */
  let nopeTimer = 0;
  function warnNoPlay() {
    if (!G || !G.R) return;
    G.R.warned++;
    $('nope').hidden = false;
    clearTimeout(nopeTimer);
    nopeTimer = setTimeout(hideNope, RULES.warnMs);
  }
  function hideNope() { clearTimeout(nopeTimer); $('nope').hidden = true; }
  function heard(pc) {
    const R = G.R;
    if (STUDY.has(R.phase)) warnNoPlay();
    else if (R.phase === 'echo') echo.fill(pc);
  }
  const input = A.Echo.input({enabled: () => !!(G && G.R && listening), onNote: heard});
  A.Pitch.demoAttacks = true;                              // ?demo: Space = the note the game wants, W = a wrong one
  A.Pitch.demoTarget = () => {
    if (!G || !G.R || !listening) return null;
    const it = STUDY.has(G.R.phase) ? G.R.pattern[0] : echo.want();
    return it ? {pc: it.pc, midi: it.sounding} : null;
  };

  /* THE ECHO FLOW (shared/echo.js): each note heard fills the next slot, right or wrong; RULES.slotMs for each note
     (the clock pauses while the tab is hidden and while a sound mutes the mic) */
  const echo = A.Echo.create({
    slots: $('slots'), slotHTML: '<i></i>', timer: $('slotTimer'), slotMs: RULES.slotMs, pauseSuppressed: true,
    running: () => !!(G && G.R && G.R.phase === 'echo' && listening),
    answering: () => !!(G && G.R && G.R.phase === 'echo'),
    sounds: {ok: 'ink-note-correct', bad: 'ink-note-wrong'},
    onFill: () => updateReveal(),
    onDone: () => finishRound(),
    onMark: () => demoText(),
  });

  /* ---------- this round's result: the ink comes back, marked ---------- */
  function finishRound() {
    const R = G.R, n = R.pattern.length;
    R.phase = 'result';
    mic(false);
    echo.mark();
    hideNope();
    $('revealBtn').hidden = true;
    const right = echo.res.filter(r => r && r.ok).length, perfect = right === n;
    G.hits += right; G.total += n;
    const pts = G.endless ? right * END.base + (perfect ? END.perfectBonus * n : 0)
      : Math.round(right * RULES.base * Math.max(0, 1 - RULES.revealCost * R.reveals));
    G.score += pts;
    A.Echo.drawResult($('staffBox'), {clef: inst.clef, pattern: R.pattern, res: echo.res, sig: G.ns.sig, fit: inkFit(R.pattern), name: G.ns.name,
      gap: LAYOUT.gap, minW: LAYOUT.minW, label: `The scroll: ${right} of ${n} notes remembered`});
    $('scroll').classList.add('back');
    setStatus(perfect ? 'Perfect memory!' : 'The ink returns');
    $('rrLine').textContent = `${right} of ${n} notes remembered. +${pts}`;
    $('rrLine').className = 'rr-line ' + (perfect ? 'good' : 'bad');
    setPrompt('', '');
    if (G.endless) {
      if (perfect) {
        G.longest = Math.max(G.longest, n);
        G.pattern = G.pattern.concat([A.patterns.next(G.ns.set, G.pattern, endlessRules(n + 1), GEN)]);   // the SAME scroll + one note
        $('rrNext').textContent = `Next scroll (${n + 1} notes)`;
      } else {
        G.lives--;
        $('rrNext').textContent = G.lives > 0 ? 'Try the same scroll' : 'See results';
      }
    } else $('rrNext').textContent = G.r >= G.L.rounds ? 'Level results' : 'Next scroll';
    hud();
    $('roundRes').hidden = false;
    $('rrNext').focus();
    A.Sfx.event(G.endless && !perfect ? 'ink-life-lost' : 'ink-round-complete');
  }
  $('rrNext').addEventListener('click', () => {
    if (!G || !G.R || G.R.phase !== 'result') return;
    if (G.endless) { if (G.lives <= 0) endlessOver(); else nextRound(); return; }
    if (G.r >= G.L.rounds) finishLevel(); else nextRound();
  });

  /* ---------- level results ---------- */
  function finishLevel() {
    run++; mic(false);
    const {lv, hits, total, score, key, reveals} = G;
    const acc = total ? hits / total : 0;
    const stars = acc === 1 && reveals === 0 ? 3 : acc >= RULES.twoStar ? 2 : acc >= RULES.oneStar ? 1 : 0;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars === 3 ? 'Perfect memory!' : stars ? 'Scroll mastered!' : 'The ink got away';
    $('resMsg').textContent = stars === 3 ? 'Every note, no reveals. Your eyes are as sharp as a brush tip!'
      : stars === 2 ? 'Remember every note with no reveals for 3 stars.'
      : stars === 1 ? `Remember ${Math.ceil(RULES.twoStar * 100)}% of the notes for 2 stars.`
      : `Try again, young ninja. Remember ${Math.round(RULES.oneStar * 100)}% of the notes to clear this level.`;
    $('resHits').textContent = `${hits}/${total}`;
    $('resAcc').textContent = Math.round(acc * 100) + '%';
    $('resReveals').textContent = reveals;
    $('resScore').textContent = score;
    $('resBest').textContent = score > old.best && old.best ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const ending = lv === LEVELS.length && stars > 0;
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !(hasNext || ending);
    $('resNext').textContent = ending ? 'The Ink Master\'s last words' : 'Next level';
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));
    ($('resNext').hidden ? $('resRetry') : $('resNext')).focus();
    A.Sfx.sequence([stars ? 'ink-level-clear' : 'level-failed', stars > old.stars && 'star-earned', score > old.best && old.best && 'new-high-score']);
  }
  $('resNext').addEventListener('click', () => {
    if (!G) return;
    $('results').hidden = true;
    if (G.lv === LEVELS.length) showEnding(); else intro(G.lv + 1);
  });
  $('resRetry').addEventListener('click', () => { $('results').hidden = true; intro(G.lv); });
  $('resLevels').addEventListener('click', showHub);
  function showEnding() {
    $('endMaster').innerHTML = inkMasterSVG('happy');
    $('endText').innerHTML = window.INK_ENDING.map(t => `<p>${t}</p>`).join('');
    $('ending').hidden = false; $('endOk').focus();
    A.Sfx.event('ink-level-clear');
  }
  $('endOk').addEventListener('click', showHub);

  /* ---------- ENDLESS SCROLL: game over ---------- */
  function endlessOver() {
    run++; mic(false);
    const {score, longest, round} = G;
    A.Endless.gameOver(Object.assign(endKey(), {
      title: 'Game over', kicker: 'Endless Scroll',
      run: {score, notes: longest, speed: 0, combo: round,
            stats: [['Longest scroll', `${longest} notes`], ['Score', score.toLocaleString()], ['Rounds survived', round]]},
      sounds: {over: 'ink-game-over', top: 'ink-high-score'},
      onAgain: () => A.requireMic(startEndless), onBack: showHub, backLabel: 'Levels'}));
  }

  /* ---------- HUD, status, the ink-drop timer ---------- */
  function hud() {
    if (!G) return;
    if (G.endless) {
      $('hudMid').textContent = `${G.longest} notes`;
      $('hudRight').innerHTML = `<span class="ed-hearts">${A.Endless.hearts(G.lives, END.lives)}</span>`;
    } else {
      $('hudMid').textContent = `${G.r} / ${G.L.rounds}`;
      $('hudRight').textContent = G.R ? revealsLeft() : G.L.reveals;
    }
    $('hudScore').textContent = G.score;
  }
  function setStatus(t) { $('status').textContent = t; }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }
  function timerBar(f) {
    const v = Math.max(0, Math.min(1, f)), t = $('inkTimer');
    t.firstElementChild.style.transform = `scaleX(${v})`;
    t.lastElementChild.style.left = `${v * 100}%`;
    t.classList.toggle('empty', v <= 0);
  }
  function demoText() {
    $('demoAns').hidden = !A.DEMO;
    if (!A.DEMO || !G || !G.R) return;
    const it = G.R.phase === 'echo' ? echo.want() : null;
    $('demoAns').textContent = it ? `Demo: the game wants ${it.label}` : '';
  }

  /* the hearing meter, and "READ, DON'T PLAY YET" for any note heard while the ink shows */
  A.Pitch.onFrame((r, level) => {
    if (!G) return;
    $('hearNote').textContent = r && listening ? G.ns.name(r.pc) : '–';
    const bars = listening ? A.Pitch.bars(level) : 0;
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
    if (r && listening && G.R && STUDY.has(G.R.phase)) warnNoPlay();
  });

  /* ---------- THE INK MASTER: an original, friendly old octopus calligrapher in a black-belt headband, a brush in
     one arm (styles: .im-* in style.css). mood: 'calm' | 'happy' ---------- */
  function inkMasterSVG(mood) {
    const happy = mood === 'happy';
    const eyes = happy ? '<path class="im-lid" d="M40 63q6-7 12 0M68 63q6-7 12 0"/>'
      : '<ellipse class="im-eye" cx="46" cy="63" rx="4" ry="5"/><ellipse class="im-eye" cx="74" cy="63" rx="4" ry="5"/>' +
        '<circle class="im-glint" cx="47.5" cy="61" r="1.4"/><circle class="im-glint" cx="75.5" cy="61" r="1.4"/>';
    return `<svg class="im im-${happy ? 'happy' : 'calm'}" viewBox="0 0 124 132" role="img" aria-label="The Ink Master, a friendly old octopus with a calligraphy brush">` +
      // arms (behind), curling at the tips
      '<path class="im-arm" d="M34 80q-18 14-14 34q3 12 14 8q-8-2-6-10q2-12 16-22Z"/>' +
      '<path class="im-arm" d="M48 86q-8 20 0 34q6 8 12 2q-8-4-6-14q2-10 6-20Z"/>' +
      '<path class="im-arm" d="M72 86q8 20 0 34q-6 8-12 2q8-4 6-14q-2-10-6-20Z"/>' +
      '<path class="im-arm" d="M86 80q14 8 20 4q6-4 6-12l6 4q0 14-12 18q-12 4-24-4Z"/>' +
      // the brush, held up in the right arm
      '<path class="im-handle" d="M112 76L120 38"/><path class="im-tip" d="M120 38q4-8 1-16q-6 7-5 15Z"/><path class="im-ferrule" d="M118.6 44.5l3-1"/>' +
      // head and spots
      '<path class="im-skin" d="M60 10C92 10 102 36 100 56C98 78 84 90 60 90C36 90 22 78 20 56C18 36 28 10 60 10Z"/>' +
      '<circle class="im-spot" cx="42" cy="26" r="3.2"/><circle class="im-spot" cx="78" cy="22" r="2.6"/><circle class="im-spot" cx="88" cy="34" r="2"/>' +
      // the black-belt headband, knot and tails
      '<path class="im-band" d="M21 43Q60 32 99 43L99 51Q60 40 21 51Z"/>' +
      '<path class="im-band" d="M96 44l14-8l-3 9l9 5l-17 1Z"/>' +
      // bushy white brows, eyes, wispy mustache, smile
      '<path class="im-brow" d="M38 54q8-6 16-1M66 53q8-5 16 1"/>' + eyes +
      '<path class="im-stache" d="M60 72q-7-3-13 1q-3 2-6-1M60 72q7-3 13 1q3 2 6-1"/>' +
      `<path class="im-mouth" d="${happy ? 'M50 78q10 10 20 0' : 'M52 78q8 6 16 0'}"/>` +
      '</svg>';
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden && G && G.R) { G.R.last = 0; kick(); } });
  $('quitPlay').addEventListener('click', showHub);
  A.VanishingInk = {state: () => G, echo: () => echo, levels: LEVELS, inkMasterSVG};   // tests

  showHub();
})(window.Arcade);
