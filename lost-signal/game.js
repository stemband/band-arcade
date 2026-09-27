/* LOST SIGNAL: a pitch memory game. An alien probe plays a short melody (a "transmission"); the student echoes it back
   on their instrument, note by note, in order.
   THE ONE GAME THAT PLAYS PITCHED TONES (shared/tones.js, see CLAUDE.md): it takes turns. The microphone is PAUSED
   (Arcade.Pitch.pauseListening) whenever anything plays (the tones and every lost-signal-* sound except the two tiny
   echo clicks), and listens again only when the last tone has fully faded (+ RULES.listenAfterMs) and the "your
   turn" sound has ended, starting fresh (a note already sounding never counts). Music plays only on the menu screens.
   Notes: the NOTES × ORDER note set (shared/mode-picker.js + sequences.js) of the student's instrument; patterns are
   made from it by THE PATTERN GENERATOR (shared/patterns.js, Arcade.patterns, with SIGNAL_GEN from levels.js) in
   SOUNDING pitch, played shifted by whole octaves into RULES.register, and answers match by pitch class (any
   octave). Scale Order = stepwise transmissions only.
   Input and answers: THE ECHO FLOW (shared/echo.js, Arcade.Echo, shared with Vanishing Ink): each new articulation
   (Pitch.onAttack, with its pitch) fills the next slot; a held note (onHeld) counts too when no attack was heard for
   it (soft entries), never twice for one note. A long note fills one slot. Results are drawn on the staff by it too.
   Levels: SIGNAL_LEVELS; DEEP SPACE SCAN (the ENDLESS card, shared/endless.js): SIGNAL_ENDLESS. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'lost-signal';
  const LEVELS = window.SIGNAL_LEVELS, RULES = window.SIGNAL_RULES, GEN = window.SIGNAL_GEN, END = window.SIGNAL_ENDLESS;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember();
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('checkerLink').href = A.linkTo('../note-checker/index.html') + '#' + GAME_ID;
  $('demoHelp').hidden = !A.DEMO;
  const gd = A.store.gameData(GAME_ID);
  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: LEVELS.length, onChange: () => showHub()});
  const endKey = () => ({gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: A.Endless.setKey(picker.state)});

  /* ---------- the microphone: listening only in the student's turn ---------- */
  let listening = false;
  function mic(on) {
    listening = !!on;
    A.Pitch.pauseListening(!on);
    if (on) A.Pitch.ignoreCurrent();                  // whatever is already sounding never counts
    if (A.Sfx.sync) A.Sfx.sync();
    $('hearBox').classList.toggle('off', !on);
  }
  /** play a lost-signal-* sound and wait for it to end (the mic is paused for every one of them) */
  const snd = name => wait(Math.max(0, A.Sfx.event(name) || 0) * 1000);
  const menuMusic = on => { A.Sfx.setMusic(on ? ['lost-signal-music'] : null, {builtIn: true}); if (A.Bg) A.Bg.menu(on); };   // + the menu background

  /* ---------- the note set and THE PATTERN GENERATOR (shared/patterns.js) ---------- */
  const noteSet = pool => A.patterns.noteSet(picker.state, pool);
  const stepOnly = () => picker.state.order === 'order';
  const nextNote = (set, pattern, rules) => A.patterns.next(set, pattern, rules, GEN);
  const generate = (set, len, rules) => A.patterns.generate(set, len, rules, GEN);
  /** playback register: the whole pattern moves by whole octaves (its shape never changes) into RULES.register */
  function shiftFor(midis) {
    const [lo, hi] = RULES.register, a = Math.min(...midis), b = Math.max(...midis);
    let best = 0, cost = Infinity;
    for (let k = -4; k <= 4; k++) {
      const c = Math.max(0, lo - (a + 12 * k)) + Math.max(0, (b + 12 * k) - hi);
      if (c < cost || (c === cost && Math.abs(k) < Math.abs(best))) { best = k; cost = c; }
    }
    return 12 * best;
  }

  /* ---------- level select ---------- */
  let G = null, run = 0, hub = true;
  function showHub() {
    run++; stopTones(); G = null; hub = true;
    if (A.Pitch.active || A.Pitch.demoReady) mic(false);
    menuMusic(true);
    const st = picker.state, key = st.progressKey;
    A.ModePicker.useRange(st);
    ['play', 'results', 'intro', 'ending'].forEach(id => { $(id).hidden = true; });
    $('hub').hidden = false; $('wrap').classList.remove('playing');
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap; $('hubConcert').textContent = card.sub; $('hubStaff').innerHTML = card.html;
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      const open = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const len = Array.isArray(L.len) ? L.len.join('–') : L.len;
      const bits = [`${len} notes`, L.label ? 'first note named' : L.find ? 'find the first note' : 'no name', `${L.replays} replay${L.replays === 1 ? '' : 's'}`];
      return `<button class="lvl" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini" aria-hidden="true">${'<i></i>'.repeat(Math.min(6, Array.isArray(L.len) ? L.len[1] : L.len))}</span>
        <span class="t">${L.name}</span>
        <span class="d">${bits.join(' · ')}${stepOnly() ? ' · stepwise' : ''}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${open ? (p.best ? 'Best ' + p.best : L.count + ' transmissions') : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => intro(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), Object.assign(endKey(), {
      title: 'Deep Space Scan',
      label: `${member ? member.short : inst.shortName} · ${st.label}`,
      blurb: 'The same signal comes back each round with one new note on the end. How long a signal can you echo? 3 hearts, no replays.',
      onPlay: () => A.requireMic(startEndless)}));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), picker: $('modePick'),
      stars: i => A.store.level(key, inst.id, i + 1).stars,
      unlocked: i => A.DEMO || i === 0 || A.store.level(key, inst.id, i + 1).stars > 0 || A.store.level(key, inst.id, i).stars > 0});
  }

  /* ---------- the level intro (one plain sentence about what's new) ---------- */
  function intro(lv) {
    const L = LEVELS[lv - 1];
    $('introKicker').textContent = `Level ${lv} · ${L.count} transmissions`;
    $('introTitle').textContent = L.name;
    $('introStory').textContent = L.story;
    $('introNow').textContent = L.nowWhat + (stepOnly() ? ' (Scale Order: every transmission moves step by step.)' : '');
    soundWarning($('introWarn'));
    $('intro').hidden = false;
    $('introGo').onclick = () => { $('intro').hidden = true; A.requireMic(() => startLevel(lv)); };
    $('introGo').focus();
  }
  $('introBack').addEventListener('click', () => { $('intro').hidden = true; });
  function soundWarning(el) {
    const off = !A.store.sfx;
    el.hidden = !off;
    el.textContent = off ? 'Sound is off in the arcade. Tap the speaker button (top right) and turn SOUND ON to hear the transmissions.' : '';
  }

  /* ---------- play ---------- */
  function startLevel(lv) {
    const L = LEVELS[lv - 1];
    const ns = noteSet(L.pool);
    G = {lv, L, ns, t: 0, score: 0, hits: 0, total: 0, replays: 0, key: picker.state.progressKey};
    enterPlay(`Level ${lv}`, L.name);
    nextTransmission();
  }
  function startEndless() {
    const ns = noteSet(END.pool);
    G = {endless: true, L: {count: Infinity, label: true, find: false, replays: 0, noteMs: END.noteMs, gapMs: END.gapMs},
         ns, round: 0, lives: END.lives, score: 0, longest: 0, hits: 0, total: 0, replays: 0, pattern: null};
    G.pattern = generate(ns.set, END.startLen, endlessRules(END.startLen));
    enterPlay('Deep Space Scan', 'Round 1');
    nextTransmission();
  }
  function endlessRules(len) { return {leap: stepOnly() ? 2 : len >= END.leapFrom ? END.leapLater : END.leap, repeats: false}; }
  function enterPlay(label, name) {
    hub = false;
    menuMusic(false);                                   // never music during a transmission
    A.ModePicker.useRange(picker.state);
    ['hub', 'results', 'intro'].forEach(id => { $(id).hidden = true; });
    $('play').hidden = false; $('wrap').classList.add('playing');
    $('hudLevelLabel').textContent = label; $('hudLevelName').textContent = name;
    $('hudMidLabel').textContent = G.endless ? 'Longest' : 'Transmission';
    $('hudRightLabel').textContent = G.endless ? 'Lives' : 'Replays';
    $('quitPlay').textContent = G.endless ? 'Quit scan' : 'Quit level';
    scope.fit();
    window.scrollTo(0, 0);
  }

  /** one transmission: INCOMING (the tones) → FIND THE SIGNAL (some levels) → YOUR TURN (the echo) → its result */
  async function nextTransmission() {
    const tok = ++run, L = G.L;
    let pattern;
    if (G.endless) {
      G.round++;
      pattern = G.pattern;
      G.noteMs = Math.max(END.minNoteMs, END.noteMs * Math.pow(END.faster, Math.floor((G.round - 1) / END.fasterEvery)));
      G.gapMs = Math.round(END.gapMs * G.noteMs / END.noteMs);
      $('hudLevelName').textContent = `Round ${G.round}`;
    } else {
      G.t++;
      const len = Array.isArray(L.len) ? L.len[0] + Math.floor(Math.random() * (L.len[1] - L.len[0] + 1)) : L.len;
      const same = p => G.lastKey && p.map(it => it.sounding).join() === G.lastKey;
      for (let k = 0; k < 8 && (!pattern || same(pattern)); k++) pattern = generate(G.ns.set, len, {leap: stepOnly() ? 2 : L.leap, repeats: L.repeats});
      G.lastKey = pattern.map(it => it.sounding).join();                 // never the same transmission twice in a row
      G.noteMs = L.noteMs; G.gapMs = L.gapMs;
    }
    const labeled = G.endless ? G.round <= END.labelRounds : L.label;
    G.tx = {pattern, replays: 0, tries: 0, labeled, found: !(L.find && !G.endless), phase: 'incoming',
            shift: shiftFor(pattern.map(it => it.sounding))};
    mic(false);
    $('txResult').hidden = true; $('replayBtn').hidden = true; $('revealBtn').hidden = true;
    echo.begin(pattern); input.reset(); drawFirst(); hud(); setPrompt('', '');
    setStatus(G.endless ? `INCOMING SIGNAL · ${pattern.length} notes` : 'INCOMING TRANSMISSION');
    await snd('lost-signal-incoming');
    if (tok !== run) return;
    if (!(await playPattern(tok))) return;
    if (!G.tx.found) findPhase(tok); else yourTurn(tok, 'echo');
  }

  /* ---------- the tones (the mic is paused the whole time) ---------- */
  let tonesNow = null;
  function stopTones() { if (tonesNow) { tonesNow.stop(); tonesNow = null; } scope.active(false); }
  async function playPattern(tok) {
    const tx = G.tx;
    tx.phase = 'playing';
    mic(false);
    $('replayBtn').hidden = true;
    const h = tonesNow = A.tones.play(tx.pattern.map(it => it.sounding + tx.shift), {noteMs: G.noteMs, gapMs: G.gapMs,
      onNote: i => { if (tok === run) { scope.ping(i, tx.pattern.length, tx.pattern[i].sounding, tx.pattern); echo.pulse(i); } }});
    if (h.muted) setPrompt('Sound is off, so you can\'t hear the transmission. Turn it on with the speaker button (top right).', 'bad');
    scope.active(true);
    await h.done;
    if (tonesNow === h) tonesNow = null;
    scope.active(false);
    if (tx.interrupted || tok !== run) return false;      // a hidden tab stopped it: it plays again on return
    await wait(RULES.listenAfterMs);                     // the last tone has fully faded: only now may the mic listen
    return tok === run && !tx.interrupted;
  }

  /** the student's turn: "your turn" (mic still paused), then listen */
  async function yourTurn(tok, phase) {
    const tx = G.tx;
    setStatus(phase === 'find' ? 'FIND THE SIGNAL' : 'YOUR TURN · ECHO THE SIGNAL');
    await snd('lost-signal-your-turn');
    if (tok !== run) return;
    await wait(250);
    if (tok !== run) return;
    tx.phase = phase;
    if (phase === 'echo') {
      echo.start();
      setPrompt(tx.found && !tx.labeled && G.L.find ? 'Now echo the whole transmission, starting with the note you found.' : 'Play the notes back, in order.', '');
    }
    updateReplay();
    mic(true);
  }

  function findPhase(tok) {
    setPrompt('Static is hiding the first note. Play notes until you lock onto it.', '');
    yourTurn(tok, 'find');
  }
  async function signalFound(given) {
    const tok = run, tx = G.tx;
    tx.found = true; mic(false);
    $('revealBtn').hidden = true; $('replayBtn').hidden = true;
    drawFirst(true);
    setStatus('SIGNAL FOUND');
    setPrompt(given ? `The first note was ${tx.pattern[0].label}.` : `Signal found! It's ${tx.pattern[0].label}.`, 'good');
    await snd('lost-signal-found');
    await wait(500);
    if (tok !== run) return;
    yourTurn(tok, 'echo');
  }
  $('revealBtn').addEventListener('click', () => {
    if (!G || !G.tx || G.tx.phase !== 'find') return;
    G.tx.tries += 3;
    signalFound(true);
  });

  /* ---------- input: a new attack (or a held note no attack was heard for) ---------- */
  function heard(pc, now) {
    if (!G || !G.tx || !listening) return;
    const tx = G.tx;
    if (tx.phase === 'find') {
      if (pc === tx.pattern[0].pc) signalFound(false);
      else {
        tx.tries++;
        setPrompt(`Searching… that's ${G.ns.name(pc)}. Not it yet.`, 'bad');
        A.Sfx.event('lost-signal-wrong');
        if (tx.tries >= RULES.findReveal) $('revealBtn').hidden = false;
      }
      return;
    }
    if (tx.phase !== 'echo') return;
    echo.fill(pc);
  }
  const input = A.Echo.input({enabled: () => !!(G && G.tx), onNote: heard});
  A.Pitch.demoAttacks = true;                              // ?demo: Space = the note the game wants, W = a wrong one
  A.Pitch.demoTarget = () => {
    if (!G || !G.tx || !listening) return null;
    const it = G.tx.phase === 'find' ? G.tx.pattern[0] : echo.want();
    return it ? {pc: it.pc, midi: it.sounding} : null;
  };

  /* THE ECHO FLOW (shared/echo.js): the slots, each note heard fills the next one; RULES.slotMs for each note
     (the clock pauses while the tab is hidden) */
  const echo = A.Echo.create({
    slots: $('slots'), slotHTML: '<i></i><i></i><i></i><i></i>', timer: $('slotTimer'), slotMs: RULES.slotMs,
    running: () => !!(G && G.tx && G.tx.phase === 'echo' && listening),
    answering: () => !!(G && G.tx && G.tx.phase === 'echo'),
    sounds: {ok: 'lost-signal-correct', bad: 'lost-signal-wrong'},
    onFill: () => updateReplay(),
    onDone: () => finishTx(),
    onMark: () => markCurrent(),
  });

  /* ---------- REPLAY SIGNAL (before answering; costs a little) ---------- */
  function replaysLeft() { return G && !G.endless ? G.L.replays - G.tx.replays : 0; }
  function updateReplay() {
    const tx = G && G.tx, can = tx && !G.endless && replaysLeft() > 0 && (tx.phase === 'find' || (tx.phase === 'echo' && echo.i === 0));
    $('replayBtn').hidden = !can;
    if (can) $('replayBtn').textContent = `Replay signal (${replaysLeft()} left)`;
  }
  $('replayBtn').addEventListener('click', async () => {
    if (!G || !G.tx || replaysLeft() <= 0) return;
    const tok = run, tx = G.tx, phase = tx.phase;
    tx.replays++; G.replays++;
    hud();
    setStatus('REPLAYING TRANSMISSION');
    setPrompt(`Replay used: this transmission is worth a little less.`, '');
    if (!(await playPattern(tok))) return;
    yourTurn(tok, phase);
  });

  /* ---------- this transmission's result ---------- */
  async function finishTx() {
    const tok = run, tx = G.tx, n = tx.pattern.length;
    tx.phase = 'result';
    mic(false);
    echo.mark();
    const right = echo.res.filter(r => r && r.ok).length, perfect = right === n;
    G.hits += right; G.total += n;
    let pts;
    if (G.endless) pts = right * END.base + (perfect ? END.perfectBonus * n : 0);
    else pts = Math.max(0, Math.round(right * RULES.base * Math.max(0, 1 - RULES.replayCost * tx.replays) - tx.tries * RULES.findCost));
    G.score += pts;
    drawResult(tx);
    setStatus(perfect ? 'TRANSMISSION DECODED' : 'WEAK SIGNAL');
    $('txLine').textContent = perfect ? `Transmission decoded! All ${n} notes. +${pts}` : `${right} of ${n} notes decoded. +${pts}`;
    $('txLine').className = 'tx-line ' + (perfect ? 'good' : 'bad');
    setPrompt('', '');
    const last = !G.endless && G.t >= G.L.count;
    if (G.endless) {
      if (perfect) {
        G.longest = Math.max(G.longest, n);
        G.pattern = G.pattern.concat([nextNote(G.ns.set, G.pattern, endlessRules(n + 1))]);   // the SAME pattern + one note
        $('txNext').textContent = `Next signal (${n + 1} notes)`;
      } else {
        G.lives--;
        $('txNext').textContent = G.lives > 0 ? 'Try the same signal' : 'See results';
      }
    } else $('txNext').textContent = last ? 'Level results' : 'Next transmission';
    hud();
    $('txResult').hidden = false;
    $('txNext').focus();
    await snd(perfect ? 'lost-signal-decoded' : G.endless ? 'lost-signal-life-lost' : 'lost-signal-partial');
    if (tok !== run) return;
  }
  $('txNext').addEventListener('click', () => {
    if (!G) return;
    stopTones();
    if (G.endless) { if (G.lives <= 0) endlessOver(); else nextTransmission(); return; }
    if (G.t >= G.L.count) finishLevel(); else nextTransmission();
  });
  $('txHear').addEventListener('click', async () => {       // hear it again: no effect on the score
    if (!G || !G.tx || G.tx.phase !== 'result') return;
    const tok = run;
    stopTones();
    tonesNow = A.tones.play(G.tx.pattern.map(it => it.sounding + G.tx.shift), {noteMs: G.noteMs, gapMs: G.gapMs,
      onNote: i => { if (tok === run) { scope.ping(i, G.tx.pattern.length, G.tx.pattern[i].sounding, G.tx.pattern); echo.pulse(i); } }});
    scope.active(true);
    await tonesNow.done; tonesNow = null; scope.active(false);
  });

  /* the transmission on the staff, in the student's written pitch and clef: right = gold, wrong = coral + what they
     played, missed = coral in a dotted box (shared/echo.js) */
  function drawResult(tx) {
    A.Echo.drawResult($('resStaff'), {clef: inst.clef, pattern: tx.pattern, res: echo.res, sig: G.ns.sig, fit: G.ns.fit,
      name: G.ns.name, label: 'The transmission on the staff'});
  }

  /* ---------- level results ---------- */
  function finishLevel() {
    run++; mic(false);
    const {lv, hits, total, score, key, replays} = G;
    const acc = total ? hits / total : 0;
    const stars = acc === 1 && replays === 0 ? 3 : acc >= RULES.twoStar ? 2 : acc >= RULES.oneStar ? 1 : 0;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars === 3 ? 'Perfect contact!' : stars ? 'Transmission decoded!' : 'Weak signal';
    $('resMsg').textContent = stars === 3 ? 'Every note, no replays. Crystal-clear signal, operator!'
      : stars === 2 ? 'Echo every note with no replays for 3 stars.'
      : stars === 1 ? `Echo ${Math.ceil(RULES.twoStar * 100)}% of the notes for 2 stars.`
      : `Weak signal — try again, operator. Echo ${Math.round(RULES.oneStar * 100)}% of the notes to clear this level.`;
    $('resHits').textContent = `${hits}/${total}`;
    $('resAcc').textContent = Math.round(acc * 100) + '%';
    $('resReplays').textContent = replays;
    $('resScore').textContent = score;
    $('resBest').textContent = score > old.best && old.best ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const ending = lv === LEVELS.length && stars > 0;
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !(hasNext || ending);
    $('resNext').textContent = ending ? 'The end of the story' : 'Next level';
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));
    ($('resNext').hidden ? $('resRetry') : $('resNext')).focus();
    A.Sfx.event(stars ? 'lost-signal-level-clear' : 'lost-signal-partial');
  }
  $('resNext').addEventListener('click', () => {
    if (!G) return;
    if (G.lv === LEVELS.length) { $('results').hidden = true; showEnding(); return; }
    $('results').hidden = true; intro(G.lv + 1);
  });
  $('resRetry').addEventListener('click', () => { $('results').hidden = true; intro(G.lv); });
  $('resLevels').addEventListener('click', showHub);
  function showEnding() {
    $('endText').innerHTML = window.SIGNAL_ENDING.map(t => `<p>${t}</p>`).join('');
    $('ending').hidden = false; $('endOk').focus();
    A.Sfx.event('lost-signal-decoded');
  }
  $('endOk').addEventListener('click', showHub);

  /* ---------- DEEP SPACE SCAN: game over ---------- */
  function endlessOver() {
    run++; mic(false);
    const {score, longest, round} = G;
    A.Endless.gameOver(Object.assign(endKey(), {
      title: 'Signal lost', kicker: 'Deep Space Scan',
      run: {score, notes: longest, speed: 0, combo: round,
            stats: [['Longest signal', `${longest} notes`], ['Score', score.toLocaleString()], ['Rounds survived', round]]},
      sounds: {over: 'lost-signal-game-over', top: 'lost-signal-high-score'},
      onAgain: () => A.requireMic(startEndless), onBack: showHub, backLabel: 'Levels'}));
  }

  /* ---------- the console: the demo answer, the first-note box, HUD ---------- */
  function markCurrent() {
    const tx = G.tx;
    $('demoAns').hidden = !A.DEMO;
    const it = tx.phase === 'find' ? tx.pattern[0] : echo.want();
    if (A.DEMO) $('demoAns').textContent = it ? `Demo: the game wants ${it.label}` : '';
  }
  function drawFirst(found) {
    const tx = G.tx, show = tx.labeled || found;
    $('first').classList.toggle('static', !show);
    $('first').classList.toggle('found', !!found);
    $('firstName').textContent = show ? tx.pattern[0].label : '';
    $('first').setAttribute('aria-label', show ? `First note: ${tx.pattern[0].label}` : 'First note: hidden by static');
  }
  function hud() {
    if (G.endless) {
      $('hudMid').textContent = `${G.longest} notes`;
      $('hudRight').innerHTML = `<span class="ed-hearts">${A.Endless.hearts(G.lives, END.lives)}</span>`;
    } else {
      $('hudMid').textContent = `${G.t} / ${G.L.count}`;
      $('hudRight').textContent = G.tx ? replaysLeft() : G.L.replays;
    }
    $('hudScore').textContent = G.score;
  }
  function setStatus(t) { $('status').textContent = t; }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* the hearing meter (only while listening) */
  A.Pitch.onFrame((r, level) => {
    if (!G) return;
    $('hearNote').textContent = r && listening ? G.ns.name(r.pc) : '–';
    const bars = listening ? A.Pitch.bars(level) : 0;
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
  });

  /* ---------- THE SCOPE: a radar sweep that pings with each note + a glowing waveform (canvas) ---------- */
  const scope = (() => {
    const cv = $('scope'), cx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, on = false, pings = [], amp = 0, pitch = 0.5, t0 = performance.now();
    const tok = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
    let C = null;
    function colors() { C = {bg: tok('ls-scope'), grid: tok('ls-grid'), wave: tok('ls-wave'), ping: tok('ls-ping'), sweep: tok('ls-sweep')}; }
    function fit() {
      dpr = Math.min(1.5, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(120, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      colors(); draw(performance.now());
    }
    function draw(now) {
      if (!C) colors();
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.fillStyle = C.bg; cx.fillRect(0, 0, W, H);
      const R = H * 0.42, ox = Math.min(W * 0.22, R + 18), oy = H / 2;
      // radar rings
      cx.strokeStyle = C.grid; cx.lineWidth = 1.2;
      for (let k = 1; k <= 3; k++) { cx.beginPath(); cx.arc(ox, oy, R * k / 3, 0, Math.PI * 2); cx.stroke(); }
      cx.beginPath(); cx.moveTo(ox - R, oy); cx.lineTo(ox + R, oy); cx.moveTo(ox, oy - R); cx.lineTo(ox, oy + R); cx.stroke();
      // the sweep (turns only while a signal plays; never under reduced motion)
      const ang = reduced.matches ? -Math.PI / 4 : ((now - t0) / 2200) * Math.PI * 2;
      if (on && !reduced.matches) {
        const g = cx.createConicGradient ? cx.createConicGradient(ang - 0.9, ox, oy) : null;
        if (g) { g.addColorStop(0, 'transparent'); g.addColorStop(0.14, C.sweep); g.addColorStop(0.145, 'transparent'); cx.fillStyle = g; cx.beginPath(); cx.arc(ox, oy, R, 0, Math.PI * 2); cx.fill(); }
        cx.strokeStyle = C.ping; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(ox + Math.cos(ang) * R, oy + Math.sin(ang) * R); cx.stroke();
      }
      // pings: one blip per note, higher notes further out
      pings = pings.filter(p => now - p.t < 1600);
      pings.forEach(p => {
        const a = Math.max(0, 1 - (now - p.t) / 1600);
        cx.globalAlpha = a; cx.fillStyle = C.ping;
        cx.beginPath(); cx.arc(ox + Math.cos(p.ang) * p.r * R, oy + Math.sin(p.ang) * p.r * R, 5 + 4 * a, 0, Math.PI * 2); cx.fill();
        if (!reduced.matches) { cx.strokeStyle = C.ping; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ox + Math.cos(p.ang) * p.r * R, oy + Math.sin(p.ang) * p.r * R, 6 + (1 - a) * 18, 0, Math.PI * 2); cx.stroke(); }
      });
      cx.globalAlpha = 1;
      // the waveform: it glows and swells with each note, faster wiggles for higher notes
      const x0 = ox + R + 22, x1 = W - 14;
      if (x1 - x0 > 60) {
        cx.strokeStyle = C.grid; cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(x0, oy); cx.lineTo(x1, oy); cx.stroke();
        amp *= on ? 0.94 : 0.85;
        const cyc = 3 + pitch * 7, ph = reduced.matches ? 0 : (now - t0) / 140, A0 = (H * 0.36) * (0.06 + amp);
        cx.strokeStyle = C.wave; cx.lineWidth = 2.5; cx.shadowColor = C.wave; cx.shadowBlur = 8;
        cx.beginPath();
        for (let x = x0; x <= x1; x += 3) {
          const u = (x - x0) / (x1 - x0), env = Math.sin(Math.PI * u);
          const y = oy + Math.sin(u * cyc * Math.PI * 2 + ph) * A0 * env;
          x === x0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
        }
        cx.stroke(); cx.shadowBlur = 0;
      }
    }
    function loop(now) {
      draw(now);
      raf = (on || pings.length || amp > 0.02) && !document.hidden ? requestAnimationFrame(loop) : 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    addEventListener('resize', () => { if (!$('play').hidden) fit(); });
    return {
      fit,
      active(v) { on = v; kick(); },
      ping(i, n, sounding, pattern) {
        const s = pattern.map(p => p.sounding), lo = Math.min(...s), hi = Math.max(...s);
        const r = hi > lo ? 0.3 + 0.62 * (sounding - lo) / (hi - lo) : 0.6;
        pitch = hi > lo ? (sounding - lo) / (hi - lo) : 0.5;
        pings.push({t: performance.now(), r, ang: -Math.PI / 2 + (i + 0.5) / n * Math.PI * 2});
        amp = 1; kick();
      },
    };
  })();

  /* ---------- SIGNAL CHECK: the first time on this device, and any time from the button ---------- */
  function signalCheck() {
    $('check').hidden = false;
    $('checkTitle').textContent = 'Signal check';
    $('checkMsg').textContent = 'Turn your volume up (Chromebooks are often muted), then press the button to hear a test signal.';
    $('checkActs').innerHTML = '<button type="button" class="btn btn-gold" id="checkPlay">Play test signal</button><button type="button" class="btn btn-ghost" id="checkSkip">Not now</button>';
    $('checkPlay').focus();
    $('checkSkip').onclick = () => { $('check').hidden = true; };
    $('checkPlay').onclick = playCheck;
  }
  async function playCheck() {
    if (A.Pitch.active || A.Pitch.demoReady) mic(false);
    menuMusic(false);
    await wait(60);                                         // the tap has just unlocked the audio
    const h = A.tones.test();
    if (h.muted) {
      $('checkMsg').textContent = 'Sound is off in the arcade. Tap the speaker button (top right), turn SOUND ON, then try again.';
      $('checkActs').innerHTML = '<button type="button" class="btn btn-gold" id="checkAgain">Try again</button><button type="button" class="btn btn-ghost" id="checkSkip">Not now</button>';
    } else {
      $('checkMsg').textContent = 'Can you hear the signal? If not, turn your volume up and play it again.';
      $('checkActs').innerHTML = '<button type="button" class="btn btn-gold" id="checkYes">Yes, I hear it</button><button type="button" class="btn btn-ghost" id="checkAgain">Play it again</button>';
      await h.done;
    }
    $('checkAgain').onclick = playCheck;
    const skip = $('checkSkip'); if (skip) skip.onclick = () => { $('check').hidden = true; menuMusic(hub); };
    const yes = $('checkYes');
    if (yes) { yes.focus(); yes.onclick = () => { gd.signalChecked = true; A.store.saveGameData(GAME_ID); $('check').hidden = true; menuMusic(hub); }; }
  }
  $('checkBtn').addEventListener('click', signalCheck);

  /* a hidden tab stops the tones: the transmission plays again from the start when the student comes back (free) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && tonesNow && G && G.tx && G.tx.phase === 'playing') {
      stopTones(); G.tx.interrupted = true;
    } else if (!document.hidden && G && G.tx && G.tx.interrupted) {
      G.tx.interrupted = false;
      const tok = run, phase = G.tx.found ? 'echo' : 'find';
      playPattern(tok).then(ok => { if (ok) yourTurn(tok, phase); });
    }
  });

  $('quitPlay').addEventListener('click', showHub);
  A.LostSignal = {state: () => G, generate, nextNote, shiftFor, noteSet, levels: LEVELS};   // tests

  showHub();
  if (!gd.signalChecked) signalCheck();
})(window.Arcade);
