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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n, not = []) => shuffle(a.filter(x => !not.includes(x))).slice(0, n);

  A.mountTopbar(null, '<span class="sound-ctl" id="sndCtl"></span>', GAME_ID, {fixed: 'Band Ninja'});
  A.Sfx.mountControls($('sndCtl'), {ambience: false});
  A.Sfx.allowAmbience(false);
  const sfx = name => A.Sfx.event(name);
  $('demoHelp').hidden = !A.DEMO;

  /* ---------- saved data ---------- */
  const gd = A.store.gameData(GAME_ID);
  ['terms', 'spar', 'exams', 'badges'].forEach(k => { if (!gd[k] || typeof gd[k] !== 'object') gd[k] = {}; });
  const save = () => A.store.saveGameData(GAME_ID);
  const term = id => gd.terms[id] || (gd.terms[id] = {c: 0, m: 0});
  const mastered = id => (gd.terms[id] || {}).c >= RULES.masterAfter;
  const masteredIn = rank => itemsOf(rank).filter(it => mastered(it.id)).length;

  /* ---------- the Sensei: an original, kind old teacher (topknot, round glasses, long beard, indigo robe) ---------- */
  function senseiSVG(mood = 'calm', belt = 'belt-black') {
    const happy = mood === 'happy' || mood === 'present';
    const eyes = happy
      ? '<path class="ss-line" d="M47 53q4-4 8 0M65 53q4-4 8 0"/>'
      : '<circle class="ss-ink" cx="51" cy="53" r="2.2"/><circle class="ss-ink" cx="69" cy="53" r="2.2"/>';
    const brows = mood === 'hmm'
      ? '<path class="ss-brow" d="M56 44q-8-6-18 1M64 42q8-4 18 3"/>'
      : '<path class="ss-brow" d="M56 45q-8-4-18 5M64 45q8-4 18 5"/>';
    const mouth = mood === 'hmm' ? '<path class="ss-line" d="M55 72h10"/>'
      : happy ? '<path class="ss-mouth" d="M53 70q7 7 14 0z"/>' : '<path class="ss-line" d="M54 71q6 4 12 0"/>';
    const hands = mood === 'present'
      ? '<rect class="ss-scroll" x="34" y="102" width="52" height="12" rx="3"/><circle class="ss-rod" cx="34" cy="108" r="6"/><circle class="ss-rod" cx="86" cy="108" r="6"/>' +
        '<ellipse class="ss-skin" cx="38" cy="112" rx="7" ry="5"/><ellipse class="ss-skin" cx="82" cy="112" rx="7" ry="5"/>'
      : '<path class="ss-sleeve" d="M38 104q22 12 44 0v10q-22 10-44 0z"/>';
    return `<svg class="sensei ${mood}" viewBox="0 0 120 150" aria-hidden="true">` +
      '<path class="ss-robe" d="M20 150q2-52 40-62q38 10 40 62z"/>' +
      '<path class="ss-robe2" d="M60 88l-16 20 16 30 16-30z"/>' +
      `<rect class="ss-belt" x="28" y="124" width="64" height="8" rx="2" style="fill:var(--${belt})"/>` +
      '<circle class="ss-hair" cx="60" cy="22" r="7"/><rect class="ss-tie" x="55" y="27" width="10" height="3" rx="1.5"/>' +
      '<ellipse class="ss-hair" cx="36" cy="54" rx="5" ry="9"/><ellipse class="ss-hair" cx="84" cy="54" rx="5" ry="9"/>' +
      '<circle class="ss-skin" cx="60" cy="52" r="24"/>' +
      brows + eyes +
      '<circle class="ss-glass" cx="51" cy="53" r="7"/><circle class="ss-glass" cx="69" cy="53" r="7"/><path class="ss-line" d="M58 53h4"/>' +
      '<path class="ss-hair" d="M40 62q20 14 40 0q2 28-20 48q-22-20-20-48z"/>' +
      '<path class="ss-hair" d="M47 66q13-6 26 0q-6 5-13 3q-7 2-13-3z"/>' +
      mouth + hands + '</svg>';
  }

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
    stopTimer(); Q = null;
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
    stopTimer(); Q = null; rank = r;
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
    stopTimer();
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
      setTimeout(() => { if (Q && Q.mode === 'spar' && view === 'quiz') nextQuestion(); }, ok ? 350 : 1100);
      return;
    }
    hud();
    if (ok) {
      $('fbLine').textContent = ['Correct!', 'Well done.', 'Yes!', 'The scroll agrees.'][Q.n % 4];
      $('feedback').className = 'feedback good';
      setTimeout(() => { if (Q && view === 'quiz' && Q.answered) nextQuestion(); }, 750);
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
    const t = $('toast');
    t.innerHTML = `<span class="mini-scroll" aria-hidden="true"></span>Scroll unrolled: <b>${esc(name)}</b>`;
    t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
  }

  function startTimer() {
    stopTimer();
    const bar = $('qTimer').firstElementChild;
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      if (document.hidden) { Q.endAt += now - last; last = now; return; }
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
    stopTimer();
    const b = A.belt(rank), mode = Q.mode;
    let t = 520, title, msg, best = '', stars = null, mood = 'happy';
    if (mode === 'train') {
      const pct = Math.round(100 * Q.firstTry / Q.total), all = masteredIn(rank) === 15;
      stars = all ? 3 : pct >= RULES.twoStarRate * 100 ? 2 : 1;
      const old = A.store.level(GAME_ID, 'all', beltNo(rank));
      A.store.setLevel(GAME_ID, 'all', beltNo(rank), {stars: Math.max(stars, old.stars), best: Math.max(pct, old.best)});
      title = stars === 3 ? 'Every scroll mastered!' : 'Round complete';
      msg = `${Q.firstTry} of ${Q.total} right the first time (${pct}%). ${masteredIn(rank)} of 15 ${b.name} scrolls unrolled.` +
        (stars === 1 ? ' Get 90% right the first time for 2 stars.' : stars === 2 ? ' Master all 15 scrolls for 3 stars.' : '');
      best = old.best ? `Best: ${Math.max(pct, old.best)}% first try` : '';
      sfx('level-complete');
      if (stars > old.stars) { setTimeout(() => sfx('star-earned'), t); t += 380; }
      if (pct > old.best && old.best > 0) setTimeout(() => sfx('new-high-score'), t);
    } else if (mode === 'spar') {
      const old = gd.spar[rank] || 0;
      if (Q.score > old) { gd.spar[rank] = Q.score; save(); }
      title = Q.score > old && old ? 'New best!' : 'Time!';
      msg = `${Q.right} right, ${Q.wrong} missed, best combo ${Q.bestCombo}. Score ${Q.score}.`;
      best = `Best: ${Math.max(old, Q.score)}`;
      mood = Q.right > Q.wrong ? 'happy' : 'hmm';
      sfx('level-complete');
      if (Q.score > old && old) setTimeout(() => sfx('new-high-score'), t);
    } else {
      title = 'Review complete';
      msg = `${Q.right} of ${Q.total} right. The scrolls you miss most will keep coming back until they stick.`;
      mood = Q.right >= Q.total * .8 ? 'happy' : 'hmm';
      sfx('level-complete');
    }
    $('resSensei').innerHTML = senseiSVG(mood, mode === 'review' ? 'belt-black' : b.color);
    $('resStars').innerHTML = stars == null ? '' : A.starStr(stars);
    $('resStars').hidden = stars == null;
    $('resTitle').textContent = title; $('resMsg').textContent = msg; $('resBest').textContent = best;
    $('resBack').textContent = mode === 'review' ? 'Temple' : 'Chamber';
    $('results').hidden = false; $('resAgain').focus();
    A.Skins.announce($('results').querySelector('.panel'), {members: [A.store.player]});
  }
  $('resAgain').addEventListener('click', () => { $('results').hidden = true; startQuiz(Q.mode); });
  $('resBack').addEventListener('click', () => { $('results').hidden = true; const m = Q && Q.mode; Q = null; if (m === 'review') showHub(); else openChamber(rank); });
  $('quitQuiz').addEventListener('click', () => { const m = Q && Q.mode; stopTimer(); Q = null; if (m === 'review') showHub(); else openChamber(rank); });

  /* ---------- Belt Exam: the paper test ---------- */
  let E = null;
  function startExam() {
    const b = A.belt(rank);
    E = {rank, items: itemsOf(rank), placed: {}, syms: {}, chosen: null, target: null, done: false};
    E.symChoices = {};
    E.items.filter(it => it.type === 'symbol').forEach(it => { E.symChoices[it.id] = shuffle([it.answer, ...pick(A.SYMBOL_IDS, 3, [it.answer])]); });
    $('exam').style.setProperty('--belt', `var(--${b.color})`);
    $('exRank').textContent = `Rank ${rank}`;
    $('exName').textContent = `${b.name} Belt Exam`;
    $('exResult').hidden = true;
    $('exSubmit').hidden = false; $('exSubmit').textContent = 'Submit exam';
    $('exHow').hidden = false;
    drawExam();
    show('exam');
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
  $('exSubmit').addEventListener('click', () => {
    if (!E) return;
    if (E.done) return startExam();
    const n = answeredCount();
    $('cfMsg').textContent = n < 15 ? `You've answered ${n} of 15. Blanks count as missed.` : 'All 15 answered. Check your work, then turn it in to the Sensei.';
    $('confirm').hidden = false; $('cfYes').focus();
  });
  $('cfNo').addEventListener('click', () => { $('confirm').hidden = true; $('exSubmit').focus(); });
  $('cfYes').addEventListener('click', () => { $('confirm').hidden = true; gradeExam(); });
  $('exBack').addEventListener('click', () => { E = null; openChamber(rank); });

  function gradeExam() {
    sfx('gong');
    E.done = true; E.chosen = null; E.target = null;
    const right = E.items.filter(isRight).length, missed = 15 - right, allowed = PASS[E.rank], passed = missed <= allowed;
    const b = A.belt(E.rank), old = gd.exams[E.rank] || {best: 0, passed: false}, firstBadge = passed && !gd.badges[E.rank];
    gd.exams[E.rank] = {best: Math.max(old.best, right), passed: old.passed || passed};
    if (passed) gd.badges[E.rank] = true;
    save();
    const rule = allowed === 0 ? 'To pass: all 15 right.' : `To pass: miss ${allowed} or fewer.`;
    $('exResult').innerHTML = `<div class="res-sensei small" aria-hidden="true">${senseiSVG(passed ? 'happy' : 'hmm', b.color)}</div>` +
      `<div><p class="ex-score">${right} / 15 <small>missed ${missed}</small></p>` +
      `<p class="ex-verdict ${passed ? 'pass' : 'fail'}">${passed ? `Passed! ${rule}` : `Not yet. ${rule} Study the red ones and try again.`}</p>` +
      (passed ? `<p class="ex-ready"><span class="ready-chip">Test Ready</span> You're ready to take your real Rank ${E.rank} test in person!</p>` : '') +
      `<p class="ex-best">Best: ${gd.exams[E.rank].best} / 15</p></div>`;
    $('exResult').hidden = false;
    $('exSubmit').textContent = 'Take it again';
    $('exHow').hidden = true;
    drawExam();
    window.scrollTo(0, 0);
    if (passed) setTimeout(() => presentBadge(E.rank, firstBadge), 900);
    else setTimeout(() => sfx('level-failed'), 900);
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
  $('bdOk').addEventListener('click', () => { $('badge').hidden = true; $('exSubmit').focus({preventScroll: true}); });

  /* ---------- keyboard: 1–4 pick an answer, Enter/Space go on after a miss ---------- */
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || view !== 'quiz' || !Q || !$('results').hidden) return;
    if (/^[1-4]$/.test(e.key) && !Q.answered) {
      const b = $('choices').children[+e.key - 1];
      if (b) { e.preventDefault(); answer(b.dataset.k); }
    } else if ((e.key === 'Enter' || e.key === ' ') && Q.answered && !$('nextBtn').hidden && document.activeElement !== $('nextBtn')) {
      e.preventDefault(); nextQuestion();
    }
  });

  showHub();
})(window.Arcade);
