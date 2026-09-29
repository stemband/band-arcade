/* Ancient Ninja Scrolls: the Band Ninja music vocabulary trainer, Ranks 3–10 (Orange … Diamond).
   No microphone and no instrument (no pitch.js / mic-gate.js). The tests live in vocab.js.
   Modes per belt (every belt is open): TRAIN (multiple choice with spaced repetition; stars),
   SPAR (60-second speed round; best score), BELT EXAM (the paper test: word bank + blanks; TEST READY badge).
   SCROLL REVIEW mixes every belt with a mastered scroll, weighted toward the terms missed most.
   Saved: Train stars via Arcade.store.setLevel(GAME_ID, 'all', belt 1–8, {stars, best});
   everything else in Arcade.store.gameData(GAME_ID) = {terms: {id: {c, m}}, spar: {rank: best},
   exams: {rank: {best, passed}}, badges: {rank: true}}. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'ancient-ninja-scrolls';
  const ITEMS = window.VOCAB, BANKS = window.VOCAB_BANKS, PASS = window.VOCAB_PASS, RULES = window.SCROLL_RULES;
  const RANKS = [3, 4, 5, 6, 7, 8, 9, 10];
  const beltNo = rank => rank - 2;                     // Orange = belt 1 … Diamond = belt 8 (progress levels)
  const itemsOf = rank => ITEMS.filter(it => it.rank === rank);
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n, not = []) => shuffle(a.filter(x => !not.includes(x))).slice(0, n);

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Band Ninja'});
  const sfx = name => A.Sfx.event(name);
  $('demoHelp').hidden = !A.DEMO;

  /* ---------- timers that hold still while the game is paused ---------- */
  let timers = [];
  function later(fn, ms) {
    const t = {fn, left: ms, due: performance.now() + ms};
    const run = () => { timers = timers.filter(x => x !== t); t.fn(); };
    t.run = run; t.id = setTimeout(run, ms); timers.push(t);
    return t;
  }
  function holdTimers() { const now = performance.now(); timers.forEach(t => { clearTimeout(t.id); t.left = Math.max(0, t.due - now); }); }
  function resumeTimers() { const now = performance.now(); timers.forEach(t => { t.due = now + t.left; t.id = setTimeout(t.run, t.left); }); }
  function clearTimers() { timers.forEach(t => clearTimeout(t.id)); timers = []; }

  /* ---------- THE PAUSE MENU (shared/ui-kit.js): during a round (Train, Spar, Review) and the Belt Exam.
     Spar's 60-second clock, the speed bonus and the wait before the next question all stop while paused.
     BACK TO THE CHAMBER (the temple from Scroll Review) is the way out of a round or an exam. ---------- */
  let pausedAt = 0;
  const pause = A.UI.pause.mount({
    onPause: () => { pausedAt = performance.now(); holdTimers(); },
    onResume: () => { if (Q && Q.shownAt) Q.shownAt += performance.now() - pausedAt; resumeTimers(); },
    onLevels: () => leave(),
    info: () => {
      if (view === 'exam' && E) return [['Answered', `${answeredCount()} / 15`]];
      if (!Q) return [];
      if (Q.mode === 'train') return [['Scrolls done', `${Q.done} / ${Q.total}`], ['Right first try', Q.firstTry]];
      if (Q.mode === 'review') return [['Question', `${Math.min(Q.n + 1, Q.total)} / ${Q.total}`], ['Right', Q.right]];
      return [['Time left', `${Math.ceil(Math.max(0, Q.endAt - pausedAt) / 1000)} s`], ['Score', Q.score]];
    },
  });
  /** the pause menu's words for this round or exam */
  function pauseFor(what) {
    const toTemple = what === 'review';
    pause.set(what === 'exam'
      ? {onRestart: null, levelsLabel: 'Back to the chamber', leaveTitle: 'Leave the exam?',
         leaveText: 'Your answers on this exam will be lost.', confirmLeave: () => !!E && !E.done && answeredCount() > 0}
      : {onRestart: () => { if (Q) startQuiz(Q.mode); }, levelsLabel: toTemple ? 'Back to the temple' : 'Back to the chamber', leaveTitle: 'Leave this round?',
         leaveText: 'Your mastered scrolls stay mastered, but this round won’t count.', confirmLeave: () => !!Q && Q.n > 0});
    pause.setActive(true);
    pauseGutter(); requestAnimationFrame(pauseGutter);
  }
  /** the strip under the pause button (style.css): as tall as the button's row, wherever the kit put it */
  function pauseGutter() {
    const b = document.getElementById('uiPauseBtn'), r = b && b.getClientRects().length ? b.getBoundingClientRect() : null;
    if (r && r.bottom > 0) document.documentElement.style.setProperty('--an-top', Math.ceil(r.bottom + 8) + 'px');
  }
  addEventListener('resize', () => requestAnimationFrame(pauseGutter));
  /** out of a round or an exam: back to the chamber (the temple from Scroll Review) */
  function leave() {
    const m = Q && Q.mode;
    clearTimers(); stopTimer(); Q = null; E = null;
    if (m === 'review') showHub(); else openChamber(rank);
  }

  /* ---------- saved data ---------- */
  const gd = A.store.gameData(GAME_ID);
  ['terms', 'spar', 'exams', 'badges'].forEach(k => { if (!gd[k] || typeof gd[k] !== 'object') gd[k] = {}; });
  const save = () => A.store.saveGameData(GAME_ID);
  const term = id => gd.terms[id] || (gd.terms[id] = {c: 0, m: 0});
  const mastered = id => (gd.terms[id] || {}).c >= RULES.masterAfter;
  const masteredIn = rank => itemsOf(rank).filter(it => mastered(it.id)).length;

  /* the Sensei (an original, kind old teacher) is shared with Dojo Duel: Arcade.senseiSVG in shared/ui.js */
  const senseiSVG = A.senseiSVG;

  /* ---------- the temple (hub) ---------- */
  $('lanternRow').innerHTML = RANKS.map(r => `<i class="lantern${A.belt(r).sparkle ? ' sparkle' : ''}" style="--belt:var(--${A.belt(r).color})"></i>`).join('');
  $('hubSensei').innerHTML = senseiSVG('calm');
  let view = 'hub', rank = 3;
  function show(v) {
    view = v;
    ['hub', 'chamber', 'quiz', 'exam'].forEach(s => { $(s).hidden = s !== v; });
    window.scrollTo(0, 0);
  }
  function showHub() {
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    stopTimer(); clearTimers(); Q = null;
    pause.setActive(false); A.UI.results.hide();
    $('chambers').innerHTML = RANKS.map(r => {
      const b = A.belt(r), p = A.store.level(GAME_ID, 'all', beltNo(r)), m = masteredIn(r), ready = gd.badges[r];
      return `<button class="chamber-card${b.sparkle ? ' sparkle' : ''}" data-r="${r}" style="--belt:var(--${b.color})">
        <i class="lantern" aria-hidden="true"></i>
        <span class="cc-rank">Rank ${r}</span><span class="cc-name">${b.name}</span>
        <span class="stars">${A.starStr(p.stars)}</span>
        <span class="cc-scrolls">Scrolls ${m} / 15</span>
        ${ready ? '<span class="ready-chip">Test Ready</span>' : ''}
      </button>`;
    }).join('');
    $('chambers').querySelectorAll('.chamber-card').forEach(b => b.addEventListener('click', () => openChamber(+b.dataset.r)));
    // SELECT YOUR LEVEL (shared/level-select.js): every chamber is open; START opens the selected one
    A.LevelSelect.show({screen: $('hub'), grid: $('chambers'), cards: $('chambers').querySelectorAll('.chamber-card'),
      unlocked: () => true, label: i => `Rank ${RANKS[i]} · ${A.belt(RANKS[i]).name} chamber`});
    const open = RANKS.filter(r => masteredIn(r) > 0), total = RANKS.reduce((s, r) => s + masteredIn(r), 0);
    $('reviewBtn').disabled = !open.length;
    $('reviewInfo').textContent = open.length
      ? `${total} scroll${total === 1 ? '' : 's'} mastered in ${open.map(r => A.belt(r).name).join(', ')}. Mixed questions, with the ones you miss most coming up more.`
      : 'Master a scroll in any chamber (answer it right 3 times) to open Scroll Review.';
    const nReady = Object.keys(gd.badges).length;
    $('hubSay').textContent = nReady
      ? `Welcome back. You are Test Ready for ${nReady} belt${nReady === 1 ? '' : 's'}. Which chamber will you study tonight?`
      : 'Welcome, young ninja. Each chamber of this temple holds the fifteen secret scrolls of one belt. Choose the chamber for your next test.';
    show('hub');
  }
  $('reviewBtn').addEventListener('click', () => startQuiz('review'));

  /* ---------- a chamber: modes and the scroll rack ---------- */
  function openChamber(r) {
    A.LevelSelect.played(RANKS.indexOf(r));        // the temple comes back with this chamber selected
    A.Sfx.gameMenuMusic(GAME_ID);                   // a belt's chamber is a menu too
    stopTimer(); clearTimers(); Q = null; rank = r;
    pause.setActive(false); A.UI.results.hide();
    const b = A.belt(r), p = A.store.level(GAME_ID, 'all', beltNo(r)), ex = gd.exams[r];
    $('chamber').style.setProperty('--belt', `var(--${b.color})`);
    $('chamber').classList.toggle('sparkle', !!b.sparkle);
    $('chRank').textContent = `Rank ${r}`;
    $('chName').textContent = `${b.name} Chamber`;
    $('trainInfo').innerHTML = `${A.starStr(p.stars)}${p.best ? ` Best ${p.best}% first try` : ''}`;
    $('sparInfo').textContent = gd.spar[r] ? `Best ${gd.spar[r]}` : 'No score yet';
    $('examInfo').innerHTML = ex ? `Best ${ex.best} / 15${gd.badges[r] ? ' <span class="ready-chip">Test Ready</span>' : ''}` : 'Not taken yet';
    const m = masteredIn(r);
    $('rackTitle').textContent = `Scroll rack: ${m} of 15 unrolled`;
    $('rack').innerHTML = itemsOf(r).map((it, i) => {
      const open = mastered(it.id), name = it.type === 'symbol' ? A.symbolName(it.answer) : it.answer;
      return open
        ? `<div class="scroll open" role="img" aria-label="Scroll ${i + 1}: ${esc(name)}, mastered"><span class="sc-rod"></span><span class="sc-paper">` +
          (it.type === 'symbol' || it.show ? `<span class="sc-sym">${A.symbolSVG(it.type === 'symbol' ? it.answer : it.show)}</span>` : '') +
          `<b>${esc(name)}</b><small>${esc(tipOf(it))}</small></span><span class="sc-rod"></span></div>`
        : `<div class="scroll rolled" role="img" aria-label="Scroll ${i + 1}: not mastered yet"><span class="sc-roll"><span class="seal">${i + 1}</span></span>` +
          `<small>${(gd.terms[it.id] || {}).c || 0} / ${RULES.masterAfter}</small></div>`;
    }).join('');
    show('chamber');
  }
  $('chBack').addEventListener('click', showHub);
  $('goTrain').addEventListener('click', () => startQuiz('train'));
  $('goSpar').addEventListener('click', () => startQuiz('spar'));
  $('goExam').addEventListener('click', startExam);

  /* ---------- questions ---------- */
  const blankHTML = '<span class="blank" aria-label="blank">&nbsp;</span>';
  function promptHTML(it) { return esc(it.prompt).replace('___', blankHTML); }
  /** the one-line reminder after a miss: the sentence with the blank filled in */
  function tipOf(it) {
    if (it.tip) return it.tip;
    if (it.type === 'symbol') return `This is the ${A.symbolName(it.answer).toLowerCase()}.`;
    if (it.show) return `This symbol is the ${it.answer}.`;
    if (it.prompt.includes('___')) return it.prompt.replace('___', it.answer);
    return it.prompt.trim().endsWith('?') ? `${it.prompt} ${it.answer}.` : `${it.answer}: ${it.prompt}`;
  }
  /* Build one question. flip = the other direction: show the term, pick its prompt/definition
     (for symbols: show the symbol, pick its name; for "What is this symbol called?": pick the symbol). */
  function makeQuestion(it, flip) {
    const q = {it, flip, sym: null};
    if (it.type === 'symbol') {
      const others = pick(A.SYMBOL_IDS, 3, [it.answer]), keys = shuffle([it.answer, ...others]);
      if (!flip) { q.kicker = 'Tap the correct symbol'; q.text = esc(it.prompt); q.choices = keys.map(k => ({key: k, sym: k})); }
      else { q.kicker = 'Name the symbol'; q.sym = it.answer; q.text = 'What is this symbol called?'; q.choices = keys.map(k => ({key: k, label: A.symbolName(k)})); }
      q.right = it.answer;
    } else if (it.show && flip) {
      const others = pick(A.SYMBOL_IDS, 3, [it.show]);
      q.kicker = 'Tap the correct symbol'; q.text = `Which symbol is the ${esc(it.answer)}?`;
      q.choices = shuffle([it.show, ...others]).map(k => ({key: k, sym: k})); q.right = it.show;
    } else if (flip) {
      const pool = itemsOf(it.rank).filter(o => o.id !== it.id && o.type === 'word' && !o.show && o.answer !== it.answer);
      const others = shuffle(pool).slice(0, 3);
      q.kicker = 'Which one matches this term?'; q.term = it.answer; q.text = `<span class="q-term">${esc(it.answer)}</span>`;
      q.choices = shuffle([it, ...others]).map(o => ({key: o.id, label: promptHTML(o), html: true})); q.right = it.id;
    } else {
      const others = pick(BANKS[it.rank], 3, [it.answer]);
      q.kicker = it.show ? 'Name the symbol' : it.prompt.includes('___') ? 'Fill in the blank' : 'Which term is this?';
      q.sym = it.show || null; q.text = promptHTML(it);
      q.choices = shuffle([it.answer, ...others]).map(k => ({key: k, label: esc(k), html: true})); q.right = it.answer;
    }
    return q;
  }
  function rightLabel(q) {
    const c = q.choices.find(c => c.key === q.right);
    return c.sym ? A.symbolName(c.sym) : c.html ? c.label.replace(/<[^>]+>/g, '___').replace(/(___)+/g, '___') : c.label;
  }

  /* ---------- Train / Spar / Review rounds ---------- */
  let Q = null, timerId = 0;
  function startQuiz(mode) {
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    stopTimer(); clearTimers(); A.UI.results.hide();
    const b = A.belt(rank);
    Q = {mode, n: 0, score: 0, combo: 0, bestCombo: 0, right: 0, wrong: 0, firstTry: 0, done: 0, answered: false, current: null, last: null};
    if (mode === 'train') {
      Q.queue = shuffle(itemsOf(rank)).map(it => ({it, left: 1, tried: false}));
      Q.total = Q.queue.length;
    } else if (mode === 'review') {
      Q.ranks = RANKS.filter(r => masteredIn(r) > 0);
      Q.total = RULES.reviewCount;
    } else {
      Q.total = 0; Q.endAt = performance.now() + RULES.sparSeconds * 1000;
    }
    $('quiz').style.setProperty('--belt', mode === 'review' ? 'var(--yellow)' : `var(--${b.color})`);
    $('qMode').textContent = {train: 'Train', spar: 'Spar', review: 'Scroll Review'}[mode];
    $('qBelt').textContent = mode === 'review' ? 'All chambers' : b.name;
    $('qCountLabel').textContent = mode === 'train' ? 'Scrolls done' : mode === 'review' ? 'Question' : 'Time';
    $('qScoreLabel').textContent = mode === 'train' ? 'Right first try' : mode === 'review' ? 'Right' : 'Score';
    $('qComboBox').hidden = mode !== 'spar';
    $('qTimer').hidden = mode !== 'spar';
    show('quiz');
    pauseFor(mode);
    if (mode === 'spar') startTimer();
    nextQuestion();
  }
  function pickReviewItem() {       // weighted toward the terms missed most; never the same item twice in a row
    const pool = ITEMS.filter(it => Q.ranks.includes(it.rank) && (!Q.last || it.id !== Q.last.id));
    const w = pool.map(it => 1 + 2 * ((gd.terms[it.id] || {}).m || 0));
    let x = Math.random() * w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function nextQuestion() {
    if (!Q) return;
    let it;
    if (Q.mode === 'train') { if (!Q.queue.length) return finishQuiz(); it = Q.queue[0].it; }
    else if (Q.mode === 'review') { if (Q.n >= Q.total) return finishQuiz(); it = pickReviewItem(); }
    else { const pool = itemsOf(rank).filter(o => !Q.last || o.id !== Q.last.id); it = pool[Math.floor(Math.random() * pool.length)]; }
    const q = makeQuestion(it, Q.n % 2 === 1);        // every other question flips direction
    Q.current = q; Q.last = it; Q.answered = false; Q.shownAt = performance.now();
    $('qKicker').textContent = q.kicker;
    $('qSym').innerHTML = q.sym ? A.symbolSVG(q.sym, 'the symbol in the question') : '';
    $('qSym').hidden = !q.sym;
    $('qText').innerHTML = q.text;
    $('qCard').classList.toggle('flip', !!q.term);
    $('choices').classList.toggle('syms', q.choices.some(c => c.sym));
    $('choices').innerHTML = q.choices.map((c, i) =>
      `<button type="button" class="choice${A.DEMO && c.key === q.right ? ' hint' : ''}" data-k="${esc(c.key)}"><span class="num" aria-hidden="true">${i + 1}</span>` +
      (c.sym ? `<span class="c-sym">${A.symbolSVG(c.sym, 'choice ' + (i + 1))}</span>` : `<span class="c-label">${c.html ? c.label : esc(c.label)}</span>`) + `</button>`).join('');
    $('choices').querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => answer(b.dataset.k)));
    $('fbLine').textContent = ''; $('fbTip').textContent = ''; $('feedback').className = 'feedback'; $('nextBtn').hidden = true;
    hud();
  }
  function hud() {
    if (Q.mode === 'train') { $('qCount').textContent = `${Q.done} / ${Q.total}`; $('qScore').textContent = `${Q.firstTry}`; }
    else if (Q.mode === 'review') { $('qCount').textContent = `${Math.min(Q.n + 1, Q.total)} / ${Q.total}`; $('qScore').textContent = `${Q.right}`; }
    else {
      $('qScore').textContent = Q.score;
      const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(Q.combo / RULES.comboStep));
      $('qCombo').textContent = Q.combo ? `${Q.combo} ×${mult}` : '0';
      $('qCombo').classList.toggle('hot', mult > 1);
    }
  }
  function answer(key) {
    if (!Q || Q.answered) return;
    const q = Q.current, it = q.it, ok = key === q.right;
    Q.answered = true;
    $('choices').querySelectorAll('.choice').forEach(b => {
      b.disabled = true;
      if (b.dataset.k === q.right) b.classList.add('right'); else if (b.dataset.k === key) b.classList.add('wrong');
    });
    const t = term(it.id);
    if (ok) {
      sfx('answer-right');
      Q.right++;
      const was = t.c; t.c++;
      if (was < RULES.masterAfter && t.c >= RULES.masterAfter) unrolled(it);
    } else {
      sfx('answer-wrong');
      Q.wrong++; t.m++;
    }
    save();
    Q.n++;
    if (Q.mode === 'train') {
      const e = Q.queue.shift();
      if (!e.tried) { e.tried = true; if (ok) Q.firstTry++; }
      if (ok) e.left--; else e.left = RULES.retryUntil;           // a miss comes back until right twice
      if (e.left > 0) Q.queue.splice(Math.min(RULES.retryGap, Q.queue.length), 0, e); else Q.done++;
    }
    if (Q.mode === 'spar') {
      if (ok) {
        Q.combo++; Q.bestCombo = Math.max(Q.bestCombo, Q.combo);
        const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor((Q.combo - 1) / RULES.comboStep));
        const quick = Math.max(0, 1 - (performance.now() - Q.shownAt) / 5000);
        Q.score += Math.round((RULES.sparBase + RULES.sparSpeed * quick) * mult);
        $('fbLine').textContent = 'Hai!';
      } else { Q.combo = 0; $('fbLine').textContent = `It was: ${rightLabel(q)}`; }
      $('feedback').className = 'feedback ' + (ok ? 'good' : 'bad');
      hud();
      later(() => { if (Q && Q.mode === 'spar' && view === 'quiz') nextQuestion(); }, ok ? 350 : 1100);
      return;
    }
    hud();
    if (ok) {
      $('fbLine').textContent = ['Correct!', 'Well done.', 'Yes!', 'The scroll agrees.'][Q.n % 4];
      $('feedback').className = 'feedback good';
      later(() => { if (Q && view === 'quiz' && Q.answered) nextQuestion(); }, 750);
    } else {
      $('fbLine').textContent = `The answer: ${rightLabel(q)}`;
      $('fbTip').textContent = tipOf(it) + (Q.mode === 'train' ? ' This one will come back.' : '');
      $('feedback').className = 'feedback bad';
      $('nextBtn').hidden = false; $('nextBtn').focus({preventScroll: true});
    }
  }
  $('nextBtn').addEventListener('click', () => { if (Q && Q.answered) nextQuestion(); });

  function unrolled(it) {                                 // a term is mastered: its scroll unrolls onto the rack
    sfx('scroll-unroll');
    const name = it.type === 'symbol' ? A.symbolName(it.answer) : it.answer;
    const t = A.UI.toast(`Scroll unrolled: ${name}`, {kind: 'good', ms: 2400});
    t.classList.add('ans-toast');
    t.insertAdjacentHTML('afterbegin', '<span class="mini-scroll" aria-hidden="true"></span>');
  }

  function startTimer() {
    stopTimer();
    const bar = $('qTimer').firstElementChild;
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      if (document.hidden || pause.paused) { Q.endAt += now - last; last = now; return; }   // the clock stops while paused
      last = now;
      const left = Math.max(0, Q.endAt - now);
      bar.style.transform = `scaleX(${left / (RULES.sparSeconds * 1000)})`;
      $('qTimer').classList.toggle('low', left < 10000);
      $('qCount').textContent = `${Math.ceil(left / 1000)} s`;
      if (left <= 0) { stopTimer(); finishQuiz(); }
    }, 100);
  }
  function stopTimer() { clearInterval(timerId); timerId = 0; }

  function finishQuiz() {
    stopTimer(); clearTimers();
    const b = A.belt(rank), mode = Q.mode;
    let title, msg = '', best = '', stars = null, mood = 'happy', tiles, newBest = false;
    if (mode === 'train') {
      const pct = Math.round(100 * Q.firstTry / Q.total), all = masteredIn(rank) === 15;
      stars = all ? 3 : pct >= RULES.twoStarRate * 100 ? 2 : 1;
      const old = A.store.level(GAME_ID, 'all', beltNo(rank));
      A.store.setLevel(GAME_ID, 'all', beltNo(rank), {stars: Math.max(stars, old.stars), best: Math.max(pct, old.best)}, stars);
      title = stars === 3 ? 'Every scroll mastered!' : 'Round complete';
      msg = stars === 1 ? 'Get 90% right the first time for 2 stars.' : stars === 2 ? 'Master all 15 scrolls for 3 stars.' : `All 15 ${b.name} scrolls are unrolled.`;
      tiles = [['Right first try', `${Q.firstTry} / ${Q.total}`], ['First try', `${pct}%`], [`${b.name} scrolls`, `${masteredIn(rank)} / 15`]];
      newBest = pct > old.best && old.best > 0;
      best = old.best ? `Best: ${Math.max(pct, old.best)}% first try` : '';
      A.Sfx.sequence(['level-complete', stars > old.stars && 'star-earned', pct > old.best && old.best > 0 && 'new-high-score']);
    } else if (mode === 'spar') {
      const old = gd.spar[rank] || 0;
      if (Q.score > old) { gd.spar[rank] = Q.score; save(); }
      title = 'Time!';
      tiles = [['Right', Q.right], ['Missed', Q.wrong], ['Best combo', Q.bestCombo], ['Score', Q.score]];
      newBest = !!(Q.score > old && old);
      best = `Best: ${Math.max(old, Q.score)}`;
      mood = Q.right > Q.wrong ? 'happy' : 'hmm';
      A.Sfx.sequence(['level-complete', Q.score > old && old && 'new-high-score']);
    } else {
      title = 'Review complete';
      msg = 'The scrolls you miss most will keep coming back until they stick.';
      tiles = [['Right', `${Q.right} / ${Q.total}`], ['Missed', Q.wrong]];
      mood = Q.right >= Q.total * .8 ? 'happy' : 'hmm';
      sfx('level-complete');
    }
    A.UI.results.show({gameId: GAME_ID, stars, title, msg, tiles, best, newBest,
      hero: `<div class="res-sensei" aria-hidden="true">${senseiSVG(mood, mode === 'review' ? 'belt-black' : b.color)}</div>`,
      retry: {label: 'Try again', onClick: () => { A.UI.results.hide(); startQuiz(mode); }},
      levels: {label: mode === 'review' ? 'Temple' : 'Chamber', onClick: () => { A.UI.results.hide(); Q = null; if (mode === 'review') showHub(); else openChamber(rank); }},
      announce: {members: [A.store.player]}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // the menu music again, after the result sounds
  }

  /* ---------- Belt Exam: the paper test ---------- */
  let E = null;
  function startExam() {
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    const b = A.belt(rank);
    E = {rank, items: itemsOf(rank), placed: {}, syms: {}, chosen: null, target: null, done: false};
    E.symChoices = {};
    clearTimers(); A.UI.results.hide();
    E.items.filter(it => it.type === 'symbol').forEach(it => { E.symChoices[it.id] = shuffle([it.answer, ...pick(A.SYMBOL_IDS, 3, [it.answer])]); });
    $('exam').style.setProperty('--belt', `var(--${b.color})`);
    $('exRank').textContent = `Rank ${rank}`;
    $('exName').textContent = `${b.name} Belt Exam`;
    $('exResult').hidden = true;
    $('exSubmit').hidden = false;
    $('exHow').hidden = false;
    drawExam();
    show('exam');
    pauseFor('exam');
  }
  function drawExam() {
    const used = new Set(Object.values(E.placed));
    $('bank').innerHTML = BANKS[E.rank].map(w => `<button type="button" class="chip-word${E.chosen === w ? ' on' : ''}" data-w="${esc(w)}" aria-pressed="${E.chosen === w}" ${used.has(w) || E.done ? 'disabled' : ''}>${esc(w)}</button>`).join('');
    $('exList').innerHTML = E.items.map((it, i) => {
      const res = E.done ? (isRight(it) ? ' right' : ' wrong') : '';
      let body;
      if (it.type === 'symbol') {
        body = `<span class="ex-p">${esc(it.prompt)}</span><span class="sym-choices" role="group" aria-label="Choose a symbol">` +
          E.symChoices[it.id].map((k, j) => `<button type="button" class="sym-pick${E.syms[it.id] === k ? ' on' : ''}${A.DEMO && !E.done && k === it.answer ? ' hint' : ''}${E.done && k === it.answer ? ' key' : ''}" data-id="${it.id}" data-k="${k}" aria-pressed="${E.syms[it.id] === k}" ${E.done ? 'disabled' : ''}>${A.symbolSVG(k, 'symbol ' + (j + 1))}</button>`).join('') + '</span>';
      } else {
        const w = E.placed[it.id], blank = `<button type="button" class="ex-blank${w ? ' filled' : ''}${E.target === it.id ? ' target' : ''}" data-id="${it.id}" ${E.done ? 'disabled' : ''} aria-label="${w ? 'Answer: ' + esc(w) + '. Tap to clear' : 'Blank'}">${w ? esc(w) : '&nbsp;'}</button>`;
        const p = esc(it.prompt);
        body = it.prompt.includes('___') ? `<span class="ex-p">${p.replace('___', blank)}</span>`
          : it.prompt.trim().endsWith('?') ? `<span class="ex-p">${p} ${blank}</span>` : `<span class="ex-p">${blank} ${p}</span>`;
        if (it.show) body = `<span class="ex-sym">${A.symbolSVG(it.show)}</span>` + body;
        if (A.DEMO && !E.done) body += `<small class="demo-key">${esc(it.answer)}</small>`;
      }
      if (E.done && !isRight(it)) body += `<small class="ex-correct">Answer: ${esc(it.type === 'symbol' ? A.symbolName(it.answer) : it.answer)}</small>`;
      return `<li class="ex-item${res}${it.type === 'symbol' ? ' sym' : ''}"><span class="ex-n">${i + 1}.</span><span class="ex-body">${body}</span>${E.done ? `<span class="ex-mark" aria-label="${isRight(it) ? 'right' : 'wrong'}">${isRight(it) ? '✓' : '✗'}</span>` : ''}</li>`;
    }).join('');
  }
  const isRight = it => it.type === 'symbol' ? E.syms[it.id] === it.answer : E.placed[it.id] === it.answer;
  function place(id, w) {
    Object.keys(E.placed).forEach(k => { if (E.placed[k] === w) delete E.placed[k]; });
    E.placed[id] = w; E.chosen = null; E.target = null;
  }
  $('bank').addEventListener('click', e => {
    const b = e.target.closest('.chip-word'); if (!b || !E || E.done) return;
    const w = b.dataset.w;
    if (E.target) place(E.target, w); else E.chosen = E.chosen === w ? null : w;
    drawExam(); refocus('.chip-word', 'w', w);
  });
  $('exList').addEventListener('click', e => {
    if (!E || E.done) return;
    const bl = e.target.closest('.ex-blank'), sp = e.target.closest('.sym-pick');
    if (bl) {
      const id = bl.dataset.id;
      if (E.placed[id]) { delete E.placed[id]; E.target = null; }           // tap a filled blank to clear it
      else if (E.chosen) place(id, E.chosen);
      else E.target = E.target === id ? null : id;                        // or pick the blank first, then a word
      drawExam(); refocus('.ex-blank', 'id', id);
    } else if (sp) {
      E.syms[sp.dataset.id] = sp.dataset.k; drawExam(); refocus(`.sym-pick[data-id="${sp.dataset.id}"]`, 'k', sp.dataset.k);
    }
  });
  function refocus(sel, attr, val) {                     // keep keyboard focus on the same control after a redraw
    const el = [...document.querySelectorAll(sel)].find(x => x.dataset[attr] === val);
    if (el && !el.disabled) el.focus({preventScroll: true});
  }
  const answeredCount = () => E.items.filter(it => it.type === 'symbol' ? E.syms[it.id] : E.placed[it.id]).length;
  $('exSubmit').addEventListener('click', async () => {
    if (!E || E.done) return;
    const n = answeredCount(), ex = E;
    const yes = await A.UI.confirm({title: 'Turn in your exam?', yes: 'Turn it in', no: 'Keep working',
      text: n < 15 ? `You've answered ${n} of 15. Blanks count as missed.` : 'All 15 answered. Check your work, then turn it in to the Sensei.'});
    if (yes && E === ex && !E.done) gradeExam();
  });
  $('exResult').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    if (b.dataset.act === 'again') startExam(); else leave();
  });

  function gradeExam() {
    sfx('gong');
    pause.setActive(false);                          // the graded paper is a results screen: no pause here
    E.done = true; E.chosen = null; E.target = null;
    const right = E.items.filter(isRight).length, missed = 15 - right, allowed = PASS[E.rank], passed = missed <= allowed;
    const b = A.belt(E.rank), old = gd.exams[E.rank] || {best: 0, passed: false}, firstBadge = passed && !gd.badges[E.rank];
    gd.exams[E.rank] = {best: Math.max(old.best, right), passed: old.passed || passed};
    if (passed) gd.badges[E.rank] = true;
    save();
    const rule = allowed === 0 ? 'To pass: all 15 right.' : `To pass: miss ${allowed} or fewer.`;
    $('exResult').innerHTML = `<div class="res-sensei small" aria-hidden="true">${senseiSVG(passed ? 'happy' : 'hmm', b.color)}</div>` +
      `<div class="ex-res-body"><h3 class="ui-title">${passed ? 'Passed!' : 'Not yet'}</h3>` +
      `<p class="ex-verdict">${passed ? rule : `${rule} Study the red ones and try again.`}</p>` +
      `<div class="ui-tiles"><div class="ui-tile"><small>Right</small><b>${right} / 15</b></div><div class="ui-tile"><small>Missed</small><b>${missed}</b></div>` +
      `<div class="ui-tile"><small>Best</small><b>${gd.exams[E.rank].best} / 15</b></div></div>` +
      (passed ? `<p class="ex-ready"><span class="ready-chip">Test Ready</span> You're ready to take your real Rank ${E.rank} test in person!</p>` : '') +
      `<div class="acts"><button type="button" class="btn btn-primary" id="exAgain" data-act="again">Take it again</button>` +
      `<button type="button" class="btn btn-secondary" id="exChamber" data-act="chamber">Chamber</button></div></div>`;
    $('exResult').hidden = false;
    $('exSubmit').hidden = true;
    $('exHow').hidden = true;
    drawExam();
    window.scrollTo(0, 0);
    const r = E.rank, graded = E;
    if (passed) setTimeout(() => { if (E === graded) presentBadge(r, firstBadge); }, 900);
    else setTimeout(() => sfx('level-failed'), 900);
    // the menu music again once the exam's result sounds are done
    setTimeout(() => { if (E === graded && E.done) A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true}); }, 1000);
  }
  function presentBadge(r, first) {
    const b = A.belt(r);
    sfx('test-ready');
    $('bdSensei').innerHTML = senseiSVG('present', b.color);
    $('bdMedal').innerHTML = `<span class="medal-in" style="--belt:var(--${b.color})"><b>TEST</b><b>READY</b><small>Rank ${r}</small></span>`;
    $('bdMsg').textContent = `${first ? 'The Sensei presents your ' + b.name + ' TEST READY badge. ' : ''}You're ready to take your real Rank ${r} test in person!`;
    $('badge').hidden = false; $('bdOk').focus();
    A.Skins.announce($('badge').querySelector('.panel'), {members: [A.store.player]});   // a TEST READY badge unlocks the Ninja Mask
  }
  $('bdOk').addEventListener('click', () => { $('badge').hidden = true; const a = $('exAgain'); if (a) a.focus({preventScroll: true}); });

  /* ---------- keyboard: 1–4 pick an answer, Enter/Space go on after a miss ---------- */
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || view !== 'quiz' || !Q || pause.paused || A.UI.isOpen()) return;
    if (/^[1-4]$/.test(e.key) && !Q.answered) {
      const b = $('choices').children[+e.key - 1];
      if (b) { e.preventDefault(); answer(b.dataset.k); }
    } else if ((e.key === 'Enter' || e.key === ' ') && Q.answered && !$('nextBtn').hidden && document.activeElement !== $('nextBtn')) {
      e.preventDefault(); nextQuestion();
    }
  });

  showHub();
})(window.Arcade);
