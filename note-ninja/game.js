/* Note Ninja: a note appears on the scroll; tap its name. No microphone (no pitch.js / mic-gate.js).
   NOTES × ORDER (shared/mode-picker.js, notes from shared/sequences.js): First 5, a concert scale or Chromatic,
   in Random or Scale Order; scale pools show their key signature. The answer is always the note's real name,
   key signature included (a B in F major is B♭), spelled as shown (C♯ is not D♭).
   Answering: ♭ ♮ ♯ work like a Shift key for the next letter tap, then go back to ♮.
   Belts (levels) live in levels.js. Sounds are named events in shared/sfx.js. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'note-ninja';
  const RULES = window.NINJA_RULES;
  const BELTS = window.NINJA_BELTS.map(L => Object.assign({}, A.belt(L.name), L));   // color and sparkle from shared/belts.js
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const ACC_SIGN = {'-1': '♭', 0: '', 1: '♯'};
  const GOLD = '#c98a12', MISS = '#d0503f';          // same found / missed colors as the other games
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.mountTopbar(inst, '<span class="sound-ctl" id="sndCtl"></span>', GAME_ID);
  A.Sfx.allowAmbience(false);                       // no arcade-room hum inside a game
  $('demoHelp').hidden = !A.DEMO;
  const sfx = name => A.Sfx.event(name);

  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: BELTS.length, onChange: () => showHub()});

  /* ---------- belt select ---------- */
  function showHub() {
    stopTimer();
    G = null;
    const st = picker.state, key = st.progressKey;
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true;
    $('wrap').classList.remove('playing');
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap;
    $('hubConcert').textContent = card.sub;
    $('hubStaff').innerHTML = card.html;
    $('levelsTitle').textContent = st.scale ? `Belts: ${st.scale.name}` : 'Belts';
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
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : count + ' notes') : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.l)));
    window.scrollTo(0, 0);
  }

  /* ---------- play ---------- */
  let G = null, timerId = 0;

  function startLevel(lv) {
    const L = BELTS[lv - 1], st = picker.state, seq = A.ModePicker.sequence(st, L, lv);
    // each item: the note as drawn (show) and its real name (letter + acc of n: key signature included)
    const items = seq.items.map(it => ({show: it.show, letter: it.n.letter, acc: it.n.acc, label: it.label}));
    G = {lv, L, items, count: items.length, key: st.progressKey, sig: seq.sig, fit: seq.fit,
         accs: seq.items.concat(seq.pool).some(it => it.n.acc),   // show ♭ ♮ ♯ only if these notes have any sharps or flats
         i: 0, gStart: 0, score: 0, hits: 0, wrong: 0, missed: 0, combo: 0, bestCombo: 0,
         acc: 0, locked: true, noteStart: 0};
    $('results').hidden = true; $('hub').hidden = true; $('play').hidden = false;
    $('wrap').classList.add('playing');
    $('hudBeltLabel').textContent = `Belt ${lv}`;
    $('hudBeltName').textContent = L.name;
    $('hudChip').style.setProperty('--belt', `var(--${L.color})`);
    $('hudChip').classList.toggle('sparkle', !!L.sparkle);
    $('ninja').innerHTML = A.ninjaSVG({belt: L.color});
    $('accRow').hidden = !G.accs;
    setAcc(0);
    hud();
    window.scrollTo(0, 0);
    sfx('level-start');
    drawGroup();
  }

  /* the current notes (1–4) on a still, crisp staff; answered notes stay put and turn gold.
     Fewer notes = a narrower drawing, so it scales up bigger on the screen. */
  let W = 400;
  function drawGroup() {
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
  /* faint letter names just after the clef: the lines in one column, the spaces in the next
     (treble lines E G B D F, spaces F A C E; bass lines G B D F A, spaces A C E G) */
  function guideSVG(x, alpha) {
    const names = inst.clef === 'treble' ? ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'] : ['G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3'];
    return `<g class="guides" opacity="${alpha}">` + names.map((nm, i) => {
      const n = A.music.parseNote(nm), onLine = i % 2 === 0;
      return `<text x="${x + (onLine ? 0 : 14)}" y="${A.noteY(inst.clef, n) + 4.5}" text-anchor="middle" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="12.5" fill="#4b5570">${n.letter}</text>`;
    }).join('') + `</g>`;
  }

  function current() { return G.items[G.i]; }
  function nextNote() {
    const it = current();
    $('hudCount').textContent = `${G.i + 1} / ${G.count}`;
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
      if (document.hidden) { G.noteStart += now - last; last = now; return; }
      last = now;
      if (!G || G.locked) return;
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

  function answer(letter) {
    if (!G || G.locked) return;
    const it = current(), acc = G.accs ? G.acc : 0;
    setAcc(0);                                          // the Shift key lets go after every letter
    if (letter === it.letter && acc === it.acc) hit(); else wrongAnswer(letter + ACC_SIGN[acc]);
  }

  function hit() {
    const it = current(), k = G.i - G.gStart;
    const frac = Math.max(0, 1 - (performance.now() - G.noteStart) / (G.L.time * 1000));
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    const pts = Math.round((RULES.base + frac * RULES.speedBonus) * mult);
    G.score += pts; G.hits++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
    reveal(k, GOLD);
    act('strike');
    if (G.combo % RULES.comboStep === 0) { sfx('ninja-combo'); popCombo(); } else sfx('ninja-slash');
    setPrompt(`Yes! ${it.label}. +${pts}`, 'good');
    advance(0);
  }
  function wrongAnswer(said) {
    G.wrong++; G.combo = 0;
    act('stumble');
    sfx('note-wrong');
    setPrompt(`Not ${said}. Look again.`, 'bad');
    hud();
  }
  function miss() {
    const it = current(), k = G.i - G.gStart;
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
    if (G.i >= G.count) { G.locked = true; setTimeout(finishLevel, Math.max(delay, 600)); return; }
    if (G.i - G.gStart >= G.L.onStaff) {
      G.locked = true;
      G.gStart = G.i;
      setTimeout(() => { if (G && !$('play').hidden) drawGroup(); }, Math.max(delay, RULES.afterGroupMs));
    } else if (delay) {
      setTimeout(() => { if (G && !$('play').hidden) { G.locked = false; nextNote(); } }, delay);
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
    const m = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    const p = $('comboPop'); p.textContent = `${G.combo} in a row! ×${m}`;
    p.classList.remove('go'); void p.getBoundingClientRect(); p.classList.add('go');
  }
  function hud() {
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    $('hudCombo').textContent = G.combo ? `${G.combo} ×${mult}` : '0';
    $('hudCombo').classList.toggle('hot', mult > 1);
    $('hudScore').textContent = G.score;
  }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- keyboard (Chromebooks): A–G answer, 1 / 2 / 3 = ♭ / ♮ / ♯ ---------- */
  addEventListener('keydown', e => {
    if (!G || $('play').hidden || !$('results').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
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
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    const newBelt = stars > 0 && old.stars === 0 && lv < BELTS.length;
    $('resNinja').innerHTML = A.ninjaSVG({belt: stars ? L.color : 'belt-white', cls: stars ? 'cheer' : ''});
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars === 3 ? 'Perfect!' : stars ? `${L.name} belt cleared` : 'So close';
    $('resMsg').textContent = stars
      ? (stars === 3 ? 'Every note, no mistakes. True ninja reading!'
        : stars === 2 ? 'Name every note in time with no mistakes for 3 stars.'
        : `Name ${Math.ceil(count * RULES.twoStarRate)} of ${count} notes in time for 2 stars.`) + (newBelt ? ` You earned the ${BELTS[lv].name} belt!` : '')
      : `Name ${Math.ceil(count * RULES.passRate)} of ${count} notes in time to clear this belt. You've got this!`;
    $('resHits').textContent = `${hits}/${count}`;
    $('resWrong').textContent = wrong;
    $('resMissed').textContent = missed;
    $('resCombo').textContent = bestCombo;
    $('resScore').textContent = score;
    const newBest = score > old.best && old.best > 0;
    $('resBest').textContent = newBest ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const hasNext = lv < BELTS.length && (stars > 0 || A.DEMO || A.store.level(key, inst.id, lv + 1).stars > 0);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));        // skins earned by this result (shared/skins.js)
    (hasNext ? $('resNext') : $('resRetry')).focus();
    // sounds, one after another (each when the one before ends, whatever its length)
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > old.stars && 'star-earned', newBest && 'new-high-score',
      newBelt && (BELTS[lv].sparkle ? 'belt-diamond' : 'belt-earned')]);
  }

  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);

  showHub();
})(window.Arcade);
