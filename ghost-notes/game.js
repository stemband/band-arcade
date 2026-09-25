/* Ghost Notes: read the note, play it; the name label (a ghost) fades level by level. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'ghost-notes';
  const LEVELS = window.GHOST_LEVELS, RULES = window.GHOST_RULES;
  const {noteLabel} = A.music;

  const inst = A.currentInstrument();
  if (!inst) { location.replace(A.link('../index.html')); return; }
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst);
  $('checkerLink').href = A.link('../note-checker/index.html') + '#' + GAME_ID;

  /* ---------- level select ---------- */
  function showHub() {
    G = null;
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true;
    $('hubConcert').textContent = 'Concert ' + inst.concertLabel;
    $('hubStaff').innerHTML = A.fiveNoteStaff(inst);
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = A.store.level(GAME_ID, inst.id, lv);
      const unlocked = A.DEMO || lv === 1 || A.store.level(GAME_ID, inst.id, lv - 1).stars > 0;
      const op = L.vis === 'flash' ? .6 : Math.max(L.vis, .08);
      return `<button class="lvl" data-l="${lv}" ${unlocked ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini" style="opacity:${op}">${A.ghostSVG('', '')}</span>
        <span class="t">${L.name}</span>
        <span class="d">${L.blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : L.count + ' notes') : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b =>
      b.addEventListener('click', () => A.requireMic(() => startLevel(+b.dataset.l))));
    window.scrollTo(0, 0);
  }

  /* ---------- play ---------- */
  let G = null;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function buildSeq(count, pool) {           // every note appears evenly; never the same note twice in a row
    const seq = [];
    while (seq.length < count) {
      const bag = shuffle([...Array(pool).keys()]);
      if (seq.length && bag[0] === seq[seq.length - 1]) [bag[0], bag[1]] = [bag[1], bag[0]];
      seq.push(...bag);
    }
    return seq.slice(0, count);
  }

  function startLevel(lv) {
    const L = LEVELS[lv - 1];
    G = {lv, L, seq: buildSeq(L.count, L.pool), i: 0, score: 0, hits: 0, wrong: 0, noteStart: 0, locked: true};
    $('results').hidden = true; $('hub').hidden = true; $('play').hidden = false;
    $('hudLevelLabel').textContent = `Level ${lv}`;
    $('hudLevelName').textContent = L.name;
    $('hudScore').textContent = '0';
    window.scrollTo(0, 0);
    A.Pitch.ignoreCurrent();                 // whatever is already sounding doesn't count
    nextNote();
  }

  function nextNote() {
    const idx = G.seq[G.i], n = inst.notes[idx];
    G.target = inst.targetPc[idx]; G.note = n;
    $('hudCount').textContent = `${G.i + 1} / ${G.L.count}`;
    $('playStaff').innerHTML = A.staffSVG(inst.clef, [{n, x: 185, id: 'pn'}], {label: 'Play this note', fit: inst.notes});
    const slot = $('ghostSlot'), vis = G.L.vis;
    slot.style.transition = 'none';
    slot.innerHTML = A.ghostSVG(noteLabel(n));
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
    slot.style.transition = 'none'; slot.innerHTML = A.ghostSVG(noteLabel(G.note), cls); slot.style.opacity = 1;
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
      setPrompt(`Yes! That's ${noteLabel(G.note)}.`, 'good');
      setTimeout(advance, RULES.afterHitMs);
    } else {
      G.wrong++;
      setPrompt(`That's ${inst.writtenName(pc)}. Look again.`, 'bad');
    }
  });

  A.Pitch.onFrame((r, level, now) => {
    if (!G) return;
    const hb = $('hearNote');
    hb.textContent = r ? inst.writtenName(r.pc) : '–';
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
      setPrompt(`Time! That note was ${noteLabel(G.note)}.`, 'bad');
      setTimeout(advance, RULES.afterMissMs);
    }
  });

  function advance() {
    if (!G) return;
    G.i++;
    if (G.i >= G.L.count) finishLevel(); else nextNote();
  }

  function finishLevel() {
    const {lv, L, hits, wrong, score} = G;
    const acc = hits / L.count;
    const stars = acc === 1 && wrong === 0 ? 3 : acc >= RULES.twoStarRate ? 2 : acc >= RULES.passRate ? 1 : 0;
    const old = A.store.level(GAME_ID, inst.id, lv);
    A.store.setLevel(GAME_ID, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    G.locked = true;
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = stars ? (stars === 3 ? 'Perfect!' : 'Level cleared') : 'So close';
    $('resMsg').textContent = stars
      ? (stars === 3 ? 'Every note, no wrong notes.'
        : stars === 2 ? 'Get every note with no wrong notes for 3 stars.'
        : `Hit ${Math.ceil(L.count * RULES.twoStarRate)} of ${L.count} notes for 2 stars.`)
      : `You need ${Math.ceil(L.count * RULES.passRate)} of ${L.count} notes to clear this level.`;
    $('resHits').textContent = `${hits}/${L.count}`;
    $('resWrong').textContent = wrong;
    $('resScore').textContent = score;
    $('resBest').textContent = score > old.best && old.best ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const hasNext = lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    (hasNext ? $('resNext') : $('resRetry')).focus();
  }

  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);

  showHub();
})(window.Arcade);
