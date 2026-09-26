/* Ghost Notes: read the note, play it; the name label (a ghost) fades level by level.
   NOTES × ORDER (shared/mode-picker.js, notes from shared/sequences.js): First 5, a concert scale or Chromatic,
   in Random or Scale Order. Levels keep their fading and timing in every combination. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'ghost-notes';
  const LEVELS = window.GHOST_LEVELS, RULES = window.GHOST_RULES;

  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('checkerLink').href = A.linkTo('../note-checker/index.html') + '#' + GAME_ID;
  $('demoHelp').hidden = !A.DEMO;

  const picker = A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: LEVELS.length, onChange: () => showHub()});
  const VIS_TEXT = {1: 'Names showing.', .5: 'The names start to fade.', .2: 'The names are barely there.', flash: 'Each name flashes, then vanishes.', 0: 'No names. Read the staff.'};

  /* ---------- level select ---------- */
  function showHub() {
    G = null;
    const st = picker.state, key = st.progressKey;
    A.ModePicker.useRange(st);
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true;
    const card = A.ModePicker.hubCard(st);
    $('hubCap').textContent = card.cap;
    $('hubConcert').textContent = card.sub;
    $('hubStaff').innerHTML = card.html;
    $('levelsTitle').textContent = st.scale ? `Levels: ${st.scale.name}` : 'Levels';
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      const unlocked = A.DEMO || lv === 1 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const op = L.vis === 'flash' ? .6 : Math.max(L.vis, .08);
      const count = A.ModePicker.sequence(st, L, lv).items.length;
      const blurb = A.ModePicker.levelText(st, L, lv, [VIS_TEXT[L.vis], `${L.time} s per note.`]);
      return `<button class="lvl" data-l="${lv}" ${unlocked ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini" style="opacity:${op}">${A.ghostSVG('', '')}</span>
        <span class="t">${L.name}</span>
        <span class="d">${blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : count + ' notes') : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b =>
      b.addEventListener('click', () => A.requireMic(() => startLevel(+b.dataset.l))));
    window.scrollTo(0, 0);
  }

  /* ---------- play ---------- */
  let G = null;
  function startLevel(lv) {
    const L = LEVELS[lv - 1], st = picker.state;
    const seq = A.ModePicker.sequence(st, L, lv), items = seq.items;
    G = {lv, L, items, count: items.length, key: st.progressKey, sig: seq.sig, fit: seq.fit, name: seq.name,
         i: 0, score: 0, hits: 0, wrong: 0, noteStart: 0, locked: true};
    $('results').hidden = true; $('hub').hidden = true; $('play').hidden = false;
    $('hudLevelLabel').textContent = `Level ${lv}`;
    $('hudLevelName').textContent = L.name;
    $('hudScore').textContent = '0';
    window.scrollTo(0, 0);
    A.Pitch.ignoreCurrent();                 // whatever is already sounding doesn't count
    nextNote();
  }

  function nextNote() {
    const it = G.items[G.i];
    G.target = it.pc; G.note = it;
    $('hudCount').textContent = `${G.i + 1} / ${G.count}`;
    $('playStaff').innerHTML = A.staffSVG(inst.clef, [{n: it.show, x: 185, id: 'pn'}], {label: 'Play this note', fit: G.fit, keySig: G.sig});
    const slot = $('ghostSlot'), vis = G.L.vis;
    slot.style.transition = 'none';
    slot.innerHTML = A.ghostSVG(it.label);
    slot.style.opacity = vis === 'flash' ? 1 : vis;
    void slot.offsetWidth; slot.style.transition = '';
    clearTimeout(G.flashT);
    if (vis === 'flash') G.flashT = setTimeout(() => { slot.style.opacity = 0; }, RULES.flashMs);
    setPrompt(vis === 0 ? 'Read the staff and play the note' : 'Play the note on the staff', '');
    const t = $('timer'); t.firstElementChild.style.transform = 'scaleX(1)'; t.classList.remove('low');
    G.noteStart = performance.now(); G.locked = false;
    const held = A.Pitch.heldPc();
    if (held !== null && held !== G.target) A.Pitch.ignoreCurrent();   // a note still ringing isn't a wrong note
  }

  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }
  function revealGhost(cls) {
    const slot = $('ghostSlot');
    slot.style.transition = 'none'; slot.innerHTML = A.ghostSVG(G.note.label, cls); slot.style.opacity = 1;
  }

  A.Pitch.onHeld((pc, now) => {
    if (!G || G.locked) return;
    if (pc === G.target) {
      G.locked = true;
      const frac = Math.max(0, 1 - (now - G.noteStart) / (G.L.time * 1000));
      const pts = 100 + Math.round(frac * 100);          // 100 for the note + up to 100 speed bonus
      G.score += pts; G.hits++;
      $('hudScore').textContent = G.score;
      A.colorNote('pn', '#c98a12'); revealGhost('gold');
      const pop = $('pop'); pop.textContent = '+' + pts; pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go');
      setPrompt(`Yes! That's ${G.note.label}.`, 'good');
      setTimeout(advance, RULES.afterHitMs);
    } else {
      G.wrong++;
      setPrompt(`That's ${G.name(pc)}. Look again.`, 'bad');
    }
  });

  A.Pitch.onFrame((r, level, now) => {
    if (!G) return;
    const hb = $('hearNote');
    hb.textContent = r ? G.name(r.pc) : '–';
    hb.classList.toggle('match', !!(r && r.pc === G.target));
    const bars = A.Pitch.bars(level);
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
    if (G.locked) return;
    if (document.hidden) { G.noteStart += 40; return; }   // pause the clock while the tab is hidden
    const frac = 1 - (now - G.noteStart) / (G.L.time * 1000);
    const t = $('timer'); t.firstElementChild.style.transform = `scaleX(${Math.max(0, frac)})`; t.classList.toggle('low', frac < .3);
    if (frac <= 0) {
      G.locked = true;
      A.colorNote('pn', '#d0503f'); revealGhost('coral');
      setPrompt(`Time! That note was ${G.note.label}.`, 'bad');
      setTimeout(advance, RULES.afterMissMs);
    }
  });

  function advance() {
    if (!G) return;
    G.i++;
    if (G.i >= G.count) finishLevel(); else nextNote();
  }

  function finishLevel() {
    const {lv, hits, wrong, score, count, key} = G;
    const acc = hits / count;
    const stars = acc === 1 && wrong === 0 ? 3 : acc >= RULES.twoStarRate ? 2 : acc >= RULES.passRate ? 1 : 0;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    G.locked = true;
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars ? (stars === 3 ? 'Perfect!' : 'Level cleared') : 'So close';
    $('resMsg').textContent = stars
      ? (stars === 3 ? 'Every note, no wrong notes.'
        : stars === 2 ? 'Get every note with no wrong notes for 3 stars.'
        : `Hit ${Math.ceil(count * RULES.twoStarRate)} of ${count} notes for 2 stars.`)
      : `You need ${Math.ceil(count * RULES.passRate)} of ${count} notes to clear this level.`;
    $('resHits').textContent = `${hits}/${count}`;
    $('resWrong').textContent = wrong;
    $('resScore').textContent = score;
    $('resBest').textContent = score > old.best && old.best ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));        // skins earned by this result (shared/skins.js)
    (hasNext ? $('resNext') : $('resRetry')).focus();
  }

  A.ModePicker.demoSpace(() => G && !G.locked && G.note && G.note.sounding != null ? G.note.sounding : null);   // ?demo scales: Space plays the note

  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);

  showHub();
})(window.Arcade);
