/* Showtime Malfunction: an articulation game. The arcade's old animatronic band lurches across the arcade floor;
   each one's voice box shows a note and a count (E♭ × 4). Play that note that many SEPARATE times (tongued, or
   struck: Arcade.Pitch.onAttack) to reboot it before it reaches the front and knocks out a spotlight.
   Notes: NOTES × ORDER (shared/mode-picker.js + sequences.js). The Snare Drum (an unpitched player) gets a count-only
   mode: no staff, any clean hit counts, and its animatronics are Snapjaw Sal and his clone units.
   Progress: per instrument MEMBER (games.js byMember): setLevel(<progress key>, member id, showtime, {stars, best});
   the snare saves under 'showtime-malfunction:count'. Levels and rules: levels.js. Characters: characters.js.
   DIFFICULTY: Normal | EXTRA SPOOKY (levels.js column `x`: bigger counts, faster walk). EXTRA SPOOKY opens once this
   instrument has cleared The 5:00 Show on Normal (any mode; ?demo: always) and saves under the same keys + ':extra'.
   It is separate from the SPOOKY LEVEL (Mild | Spooky), which only changes the visuals. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'showtime-malfunction', SNARE_KEY = GAME_ID + ':count', EXTRA = ':extra';
  const LEVELS = window.SHOWTIMES, RULES = window.SHOWTIME_RULES, SHOW = A.Showtime;

  const inst = A.requireInstrument(GAME_ID);            // the snare is welcome here (games.js unpitched: true)
  if (!inst) return;
  const member = A.currentMember(), snare = inst.pitched === false, who = member.id;
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gd = A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const sfx = name => A.Sfx && A.Sfx.event(name);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = ([a, b]) => Math.floor(rand(a, b + 1));

  /* ---------- the spooky level (remembered): Mild = glitches and static only; Spooky = darker, and a lean-in at game over ---------- */
  function setSpooky(v) {
    gd.spooky = v === 'spooky' ? 'spooky' : 'mild'; save();
    document.body.classList.toggle('spooky-mode', gd.spooky === 'spooky');
    document.querySelectorAll('[data-spooky]').forEach(b => b.setAttribute('aria-pressed', b.dataset.spooky === gd.spooky));
  }
  document.querySelectorAll('[data-spooky]').forEach(b => b.addEventListener('click', () => { setSpooky(b.dataset.spooky); sfx('ui-toggle'); }));
  setSpooky(gd.spooky);

  /* ---------- the difficulty (remembered): Normal | EXTRA SPOOKY, locked until The 5:00 Show is cleared on Normal ---------- */
  const normalKeys = () => snare ? [SNARE_KEY] : A.progressKeys(GAME_ID);
  const extraEarned = () => normalKeys().some(k => A.store.level(k, who, 1).stars > 0);    // for THIS instrument, any mode
  const extraOpen = () => A.DEMO || extraEarned();
  const isExtra = () => gd.diff === 'extra' && extraOpen();
  const seenExtra = () => !!(gd.extraSeen || {})[who];
  function markExtraSeen() { (gd.extraSeen || (gd.extraSeen = {}))[who] = true; save(); }
  function drawDiff() {
    const open = extraOpen(), x = isExtra();
    document.body.classList.toggle('extra-mode', x);
    document.querySelectorAll('[data-diff]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.diff === 'extra') === x));
    const xb = document.querySelector('[data-diff="extra"]');
    xb.classList.toggle('locked', !open); xb.setAttribute('aria-disabled', String(!open));
    xb.classList.toggle('new', open && !A.DEMO && !seenExtra());
    $('diffLock').hidden = open;
  }
  function setDiff(v) {
    if (v === 'extra' && !extraOpen()) {                       // locked: say how to open it
      const l = $('diffLock'); l.classList.remove('nudge'); void l.offsetWidth; l.classList.add('nudge'); return;
    }
    if (v === 'extra' && !gd.extraVisuals) { gd.extraVisuals = true; setSpooky('spooky'); }   // the first time: Spooky visuals (Mild still works)
    if (v === 'extra' && extraEarned()) markExtraSeen();
    gd.diff = v === 'extra' ? 'extra' : 'normal'; save();
    drawDiff(); sfx('ui-toggle');
    showHub();
  }
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => setDiff(b.dataset.diff)));
  /** a showtime's row for the chosen difficulty: Normal = levels.js as written; EXTRA SPOOKY = its `x` column */
  function rowFor(lv, extra = isExtra()) {
    const L = LEVELS[lv - 1], x = L.x;
    if (!extra || !x) return L;
    return Object.assign({}, L, {count: x.count || L.count, snare: x.snare || L.snare, walk: L.walk / (x.speed || 1), blurb: x.blurb || L.blurb,
      boss: L.boss && Object.assign({}, L.boss, x.boss, {walk: L.boss.walk / (x.speed || 1)})});
  }

  /* ---------- the story: before the first showtime, and any time from the level screen ---------- */
  $('storyArt').innerHTML = ['walrus', 'owl', 'moose', 'gator', 'raccoon'].map(k => `<span class="bot glitch">${SHOW.botSVG(k)}</span>`).join('');
  let afterStory = null;
  function showStory(then) { afterStory = then || null; $('story').hidden = false; $('storyGo').focus(); }
  $('storyBtn').addEventListener('click', () => showStory());
  $('storyGo').addEventListener('click', () => { $('story').hidden = true; gd.storySeen = true; save(); if (afterStory) afterStory(); });

  /* ---------- modes: NOTES × ORDER for pitched instruments; count mode for the snare ---------- */
  const picker = snare ? null : A.ModePicker.mount($('modePick'), {gameId: GAME_ID, levels: LEVELS.length, onChange: () => showHub(),
    keySuffix: () => isExtra() ? EXTRA : '', max: LEVELS.length * 3});            // stars for the chosen difficulty, out of 24
  $('snareCard').hidden = !snare;
  const progressKey = () => (snare ? SNARE_KEY : picker.state.progressKey) + (isExtra() ? EXTRA : '');
  drawDiff();

  /* ---------- the showtime select ---------- */
  function showHub() {
    stopShow();
    if (picker) { picker.refresh(); A.ModePicker.useRange(picker.state); }   // star totals for the chosen difficulty
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true;
    document.body.classList.remove('in-show');
    drawDiff();
    const key = progressKey(), x = isExtra();
    $('levelsTitle').textContent = x ? 'Showtimes · Extra Spooky' : 'Showtimes';
    $('levelGrid').innerHTML = LEVELS.map((_, i) => {
      const lv = i + 1, L = rowFor(lv, x), p = A.store.level(key, who, lv);
      const open = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, who, lv - 1).stars > 0;
      const c = snare ? L.snare : L.count, times = c[0] === c[1] ? `× ${c[0]}` : `× ${c[0]}–${c[1]}`;
      const blurb = snare ? `${L.bots} animatronics, ${times} hits each${L.boss ? `, then Maestro Moose: ${L.boss.snare} hits, ${L.boss.phases} times` : ''}.`
        : picker.state.notes === 'first5' && picker.state.order === 'random' ? L.blurb : A.ModePicker.levelText(picker.state, Object.assign({}, L, {count: L.bots}), lv, [L.blurb]);
      return `<button class="lvl${L.boss ? ' boss' : ''}" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Showtime ${lv}</span>
        <span class="mini bot glitch">${SHOW.botSVG(L.boss ? 'moose' : snare ? 'gator' : ['walrus', 'owl', 'gator', 'raccoon'][i % 4])}</span>
        <span class="t">${L.name}</span>
        <span class="d">${blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${open ? (p.best ? 'Best ' + p.best : times) : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => {
      const lv = +b.dataset.l;
      const go = () => A.requireMic(() => startShow(lv));
      if (!gd.storySeen && RULES.storyOnce) showStory(go); else go();
    }));
  }

  /* ---------- a showtime ---------- */
  let G = null, raf = 0, lastT = 0, lastAttack = 0, heldSince = 0, W = 0, H = 0;
  const arena = $('arena');
  function measure() { W = arena.clientWidth; H = arena.clientHeight; }
  addEventListener('resize', () => { measure(); if (G) G.bots.forEach(place); });

  function startShow(lv) {
    stopShow();
    const extra = isExtra(), L = rowFor(lv, extra), boss = L.boss, total = L.bots + (boss ? boss.phases : 0);
    let items = [], seq = null;
    if (!snare) {
      A.ModePicker.useRange(picker.state);
      seq = A.ModePicker.sequence(picker.state, Object.assign({}, L, {count: total}), lv);
      items = seq.items;
    }
    // who comes out: pitched = the band in a shuffled order; snare = Snapjaw Sal, then his clone units
    const kinds = ['walrus', 'owl', 'gator', 'raccoon'].sort(() => Math.random() - .5);
    const queue = [...Array(L.bots)].map((_, i) => ({kind: snare ? (i === 0 ? 'gator' : 'clone') : kinds[i % 4], unit: snare && i ? String(i + 1).padStart(2, '0') : null,
      count: randInt(snare ? L.snare : L.count), item: items[i] || null}));
    G = {lv, L, extra, key: progressKey(), wasOpen: extraEarned(), queue, bots: [], sig: seq && seq.sig, fit: seq && seq.fit, name: seq ? seq.name : null,
      total: L.bots + (boss ? 1 : 0), rebooted: 0, lights: RULES.spotlights, score: 0, spawnAt: 0, over: false, band: [], nextId: 0,
      bossItems: boss ? items.slice(L.bots) : [], bossPending: !!boss};
    $('hub').hidden = true; $('results').hidden = true; $('play').hidden = false;
    document.body.classList.add('in-show');
    $('hudLevelLabel').textContent = `Showtime ${lv}${extra ? ' · Extra Spooky' : ''}`; $('hudLevelName').textContent = L.name;
    $('bots').innerHTML = ''; $('band').innerHTML = ''; banner('');
    drawLights(); hud();
    window.scrollTo(0, 0);
    measure();
    A.Pitch.ignoreCurrent();
    A.Pitch.demoAttacks = true;
    banner("It's showtime!", 'go'); setTimeout(() => { if (G && !G.over) banner(''); }, 1300);
    sfx('showtime-start');
    G.spawnAt = performance.now() + 1200;
    lastT = performance.now(); raf = requestAnimationFrame(loop);
  }
  function stopShow() {
    cancelAnimationFrame(raf); raf = 0;
    if (G) G.over = true;
    G = null; A.Pitch.demoAttacks = false;
  }

  /* ---------- the animatronics ---------- */
  const laneX = (lane, lanes) => lanes === 3 ? [.2, .5, .8][lane] : [.32, .68][lane];
  function spawn(spec, isBoss) {
    const L = G.L, lanes = L.lanes, taken = G.bots.filter(b => b.state === 'walk');
    // the lane whose nearest occupant is farthest back
    let lane = 0, best = Infinity;
    for (let k = 0; k < lanes; k++) { const z = Math.max(-1, ...taken.filter(b => b.lane === k).map(b => b.z)); if (z < best) { best = z; lane = k; } }
    if (isBoss) lane = lanes === 3 ? 1 : 0;
    const b = Object.assign({id: G.nextId++, lane, z: 0, zShown: 0, nextLurch: 0, state: 'walk', boss: !!isBoss, left: spec.count,
      walk: isBoss ? L.boss.walk : L.walk, phase: 1, phases: isBoss ? L.boss.phases : 1}, spec);
    const el = document.createElement('div');
    el.className = 'bot glitch' + (b.boss ? ' boss' : '');
    el.innerHTML = `<div class="sign"></div><div class="body">${SHOW.botSVG(b.kind, {unit: b.unit, label: SHOW.BAND[b.kind].name + (b.unit ? ' ' + b.unit : '')})}</div>`;
    b.el = el; b.sign = el.querySelector('.sign');
    $('bots').appendChild(el);
    G.bots.push(b);
    drawSign(b); place(b);
    return b;
  }
  function drawSign(b) {
    const n = b.left;
    let staff = '';
    if (!snare && b.item) {
      const sigW = A.keySigWidth(G.sig), w = 230 + sigW;
      staff = A.staffSVG(inst.clef, [{n: b.item.show, x: (84 + sigW + w - 30) / 2}], {fit: G.fit, keySig: G.sig, width: w, label: `Play ${b.item.label}`});
    } else staff = '<span class="drum-ico big" aria-hidden="true"></span>';
    b.sign.innerHTML = `<div class="vb-top">Voice box${b.boss ? ` · phase ${b.phase}/${b.phases}` : ''}</div><div class="vb-main">${staff}<b class="vb-count">× ${n}</b></div>`;
  }
  /* pseudo-3D: the back of the arcade (z 0) is small and near the horizon; the front (z 1) is big, at the bottom */
  function place(b) {
    if (!W) measure();
    const z = b.zShown, sc = (.3 + .7 * z) * (b.boss ? 1.3 : 1);
    const baseH = H * .58, baseW = baseH * .7;
    const cx = W * (.5 + (laneX(b.lane, G.L.lanes) - .5) * (.45 + .55 * z));
    const feet = H * (.38 + .6 * z);
    b.el.style.width = baseW + 'px'; b.el.style.height = baseH + 'px';
    b.el.style.transform = `translate3d(${(cx - baseW / 2).toFixed(1)}px,${(feet - baseH).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
    b.el.style.zIndex = 10 + Math.round(z * 100);
    b.sign.style.setProperty('--k', (Math.max(sc, .62) / sc).toFixed(3));   // far signs stay readable
  }
  function target() {
    let t = null;
    G.bots.forEach(b => { if (b.state === 'walk' && (!t || b.z > t.z)) t = b; });
    return t;
  }
  let lastTarget = null;
  function markTarget() {
    const t = target();
    if (t === lastTarget) return;
    if (lastTarget) lastTarget.el.classList.remove('target');
    lastTarget = t;
    if (t) {
      t.el.classList.add('target');
      setPrompt(snare ? `Hit ${t.left} times!` : `Play ${t.item.label} × ${t.left}. Tongue each one.`);
      heldSince = 0;
    }
  }

  /* ---------- the loop: walk, spawn, knock out spotlights ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!G) return;
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    // the band stands still while a sound plays (the detector is deaf then) or the tab is hidden
    const still = G.over || document.hidden || A.Pitch.isSuppressed(now);
    if (!still) {
      if (G.bossPending && now >= G.spawnAt) { G.bossPending = false; spawn({kind: 'moose', count: snare ? G.L.boss.snare : G.L.boss.count, item: G.bossItems[0] || null}, true); G.spawnAt = now + 2500; }
      const walking = G.bots.filter(b => b.state === 'walk' && !b.boss).length;
      if (G.queue.length && walking < G.L.atOnce && now >= G.spawnAt) {
        spawn(G.queue.shift());
        G.spawnAt = now + G.L.walk * 1000 / (G.L.atOnce + .6);
      }
      G.bots.forEach(b => {
        if (b.state !== 'walk') return;
        b.z = Math.min(1, b.z + dt / b.walk);
        if (reduced.matches) b.zShown = b.z;
        else if (now >= b.nextLurch) {                         // stop-motion: a jerky step, and a twitch
          b.zShown = b.z; b.nextLurch = now + rand(...RULES.lurchMs);
          b.el.classList.toggle('twitch');
        }
        place(b);
        if (b.z >= 1) reachFront(b);
      });
    }
    markTarget();
  }
  function reachFront(b) {
    if (G.over) return;
    G.lights--; drawLights(true); sfx('spotlight-out');
    if (b.boss) { b.z = Math.max(.05, b.z - .35); b.zShown = b.z; place(b); }   // the Maestro staggers back and keeps coming
    else {
      b.state = 'gone'; b.el.classList.add('fizzle'); b.el.classList.remove('target');
      setTimeout(() => b.el.remove(), 900);
    }
    setPrompt('A spotlight went out!', 'bad');
    hud();
    if (G.lights <= 0) return gameOver(b);
    checkEnd();
  }

  /* ---------- listening: every separate attack on the right note counts one down ---------- */
  A.Pitch.demoTarget = () => { const t = G && !G.over ? target() : null; return t && !snare && t.item ? {pc: t.item.pc, midi: t.item.sounding} : null; };
  A.Pitch.onAttack(a => {
    if (!G || G.over) return;
    const t = target(); if (!t) return;
    lastAttack = a.time; heldSince = 0;
    const ok = snare || (a.pc !== null && t.item && a.pc === t.item.pc);
    if (!ok) {
      t.sign.classList.remove('sour'); void t.sign.offsetWidth; t.sign.classList.add('sour');
      if (a.pc !== null) setPrompt(`That's ${G.name(a.pc)}. Play ${t.item.label}.`, 'bad');
      return;
    }
    t.left--; G.score += RULES.points.tick;
    t.el.classList.remove('spark'); void t.el.offsetWidth; t.el.classList.add('spark');
    if (t.left > 0) {
      drawSign(t); t.sign.classList.remove('tick'); void t.sign.offsetWidth; t.sign.classList.add('tick');
      sfx('attack-tick');
      setPrompt(snare ? `${t.left} more!` : `${t.left} more ${t.item.label}${t.left > 1 ? 's' : ''}!`, 'good');
    } else if (t.boss && t.phase < t.phases) {                  // the Maestro: next phase, next note, a stagger back
      t.phase++; t.left = snare ? G.L.boss.snare : G.L.boss.count; t.item = G.bossItems[t.phase - 1] || t.item;
      t.z = Math.max(.05, t.z - RULES.bossStagger); t.zShown = t.z; place(t); drawSign(t);
      G.score += RULES.points.reboot;
      sfx('reboot');
      setPrompt(`Phase ${t.phase} of ${t.phases}! ${snare ? '' : 'New note: ' + t.item.label + '.'}`, 'good');
      lastTarget = null;
    } else reboot(t);
    hud();
  });
  function reboot(b) {
    b.state = 'reboot';
    b.el.classList.remove('glitch', 'target'); b.el.classList.add('fixed');
    G.score += RULES.points.reboot + Math.round(RULES.points.early * (1 - b.z));
    G.rebooted++;
    sfx('reboot');
    setPrompt(`${SHOW.BAND[b.kind].name}${b.unit ? ' ' + b.unit : ''} rebooted!`, 'good');
    b.sign.innerHTML = '<div class="vb-top">Rebooted</div><div class="vb-main"><b class="vb-count">♪</b></div>';
    // it straightens up and shuffles back to the stage, where it joins the band
    setTimeout(() => { b.el.classList.add('walk-home'); b.el.style.transform = `translate3d(${W / 2 - 20}px,${H * .1}px,0) scale(.12)`; }, reduced.matches ? 50 : 500);
    setTimeout(() => { b.el.remove(); b.state = 'home'; joinBand(b); checkEnd(); }, reduced.matches ? 400 : 1700);
    lastTarget = null;
  }
  function joinBand(b) {
    G.band.push(b);
    const s = document.createElement('span');
    s.className = 'bot fixed band-bot' + (b.boss ? ' boss' : '');
    s.innerHTML = SHOW.botSVG(b.kind, {unit: b.unit});
    $('band').appendChild(s);
    hud();
  }
  function checkEnd() {
    if (!G || G.over) return;
    const busy = G.bots.some(b => b.state === 'walk' || b.state === 'reboot');
    if (!G.queue.length && !G.bossPending && !busy) finish(true);
  }

  /* ---------- the hint: a note held on without a new attack ---------- */
  A.Pitch.onFrame((r, level, now) => {
    if (!G) return;
    $('hearNote').textContent = snare ? (level > A.Pitch.gate ? 'Hit' : '–') : r ? G.name(r.pc) : '–';
    const bars = A.Pitch.bars(level);
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
    const t = !G.over && target();
    if (!t) return;
    const holding = A.Pitch.demoHeld() || (r && (snare || (t.item && r.pc === t.item.pc)));
    if (!holding) { heldSince = 0; return; }
    if (!heldSince) heldSince = now;
    if (now - Math.max(heldSince, lastAttack) > RULES.holdHintMs) setPrompt(snare ? 'Hit each stroke! One hit, one count.' : 'Tongue each note! Ta, ta, ta: every note starts fresh.', 'hint');
  });

  /* ---------- HUD, spotlights, banner ---------- */
  function hud() {
    if (!G) return;
    $('hudCount').textContent = `${G.rebooted} / ${G.total}`;
    $('hudScore').textContent = G.score;
  }
  function drawLights(justLost) {
    const n = RULES.spotlights;
    $('hudLights').innerHTML = [...Array(n)].map((_, i) => `<span class="bulb${i < G.lights ? ' on' : ''}${justLost && i === G.lights ? ' dying' : ''}"></span>`).join('');
    $('hudLights').setAttribute('aria-label', `${G.lights} of ${n} spotlights`);
    $('spots').innerHTML = [...Array(n)].map((_, i) => `<span class="spot s${i}${i < G.lights ? ' on' : ''}${justLost && i === G.lights ? ' dying' : ''}"><i></i></span>`).join('');
  }
  function banner(text, cls) { const b = $('banner'); b.hidden = !text; b.textContent = text || ''; b.className = 'banner ' + (cls || ''); }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- the end of a showtime ---------- */
  function gameOver(culprit) {
    G.over = true; A.Pitch.demoAttacks = false;
    sfx('showtime-over');
    banner("SHOWTIME'S OVER", 'over');
    document.body.classList.add('lights-out');
    if (gd.spooky === 'spooky' && !reduced.matches) {           // Spooky: a sudden (silent) lean-in from the nearest one
      const b = [...G.bots].filter(x => x.state === 'walk' || x === culprit).sort((x, y) => y.z - x.z)[0] || culprit;
      if (b) {                                                   // big and centered in the arena, as if it leaned in close
        const baseH = H * .58, baseW = baseH * .7, sc = Math.min(1.8, W * .9 / baseW, H * 1.15 / baseH);
        b.el.classList.remove('fizzle'); b.el.classList.add('lean-in');
        b.el.style.transform = `translate3d(${(W / 2 - baseW / 2).toFixed(1)}px,${(H * 1.08 - baseH).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
      }
    } else G.bots.forEach(b => b.el.classList.add('powered-down'));   // Mild: they just power down
    setTimeout(() => finish(false), 2200);
  }
  function finish(survived) {
    if (!G) return;
    const g = G; g.over = true; cancelAnimationFrame(raf); raf = 0; A.Pitch.demoAttacks = false;
    document.body.classList.remove('lights-out');
    const stars = !survived ? 0 : g.lights >= 3 ? 3 : g.lights === 2 ? 2 : 1;
    const old = A.store.level(g.key, who, g.lv), newBest = g.score > old.best && old.best > 0;
    A.store.setLevel(g.key, who, g.lv, {stars: Math.max(stars, old.stars), best: Math.max(g.score, old.best)});
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = !survived ? "Showtime's over" : stars === 3 ? 'Perfect show!' : 'Show saved!';
    $('resMsg').textContent = !survived ? `The band got through all ${RULES.spotlights} spotlights. Start each note fresh and fast, and reboot the closest one first. You've got this!`
      : stars === 3 ? `Every animatronic rebooted, every spotlight still shining.${g.L.boss ? ' Maestro Moose is back on the podium!' : ''}`
      : stars === 2 ? 'One spotlight went out. Keep them all lit for 3 stars.' : 'You kept the show going! Lose one spotlight or fewer for 2 stars.';
    $('resHits').textContent = `${g.rebooted}/${g.total}`;
    $('resLights').textContent = `${g.lights}/${RULES.spotlights}`;
    $('resScore').textContent = g.score;
    $('resBest').textContent = newBest ? 'New best score!' : old.best ? `Best: ${Math.max(g.score, old.best)}` : '';
    $('resBand').innerHTML = g.band.map(b => `<span class="bot fixed">${SHOW.botSVG(b.kind, {unit: b.unit})}</span>`).join('');
    const hasNext = g.lv < LEVELS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !hasNext;
    const unlockedNow = !g.extra && !g.wasOpen && extraEarned();       // The 5:00 Show cleared on Normal for the first time
    $('resUnlock').hidden = !unlockedNow;
    if (unlockedNow) markExtraSeen();
    $('results').hidden = false;
    A.Skins.announce($('results').querySelector('.panel'));        // skins earned by this result (shared/skins.js)
    (hasNext ? $('resNext') : $('resRetry')).focus();
    A.Sfx.sequence([stars ? 'level-complete' : null, stars > old.stars && 'star-earned', newBest && 'new-high-score', unlockedNow && 'extra-spooky-unlocked']);
    G = null;
    finished = g;
  }
  let finished = null;
  $('resNext').addEventListener('click', () => A.requireMic(() => startShow(finished.lv + 1)));
  $('resRetry').addEventListener('click', () => A.requireMic(() => startShow(finished.lv)));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);

  A.Showtime.debug = () => G;                              // tests
  showHub();
})(window.Arcade);
