/* BLOCKTAVE: a side-view block-building survival game where PLAYING YOUR INSTRUMENT is how you mine and craft.
   One world per device (localStorage 'bandarcade.blocktave.world', NOT in the Arcade Backup Code: too big; SAVE WORLD
   TO FILE in the pause menu keeps a copy). Small things (milestones, recipes found, mode, controls) live in
   gameData('blocktave'), which IS in the Backup Code.
     rules.js     every tuning number · recipes.js  items, recipes, chapters · world.js  blocks, generator, saving
     challenges.js  the challenge card (mining = playing, crafting = performing)
   MODES: INSTRUMENT (the microphone: play the notes) | TOUCH (tap note names, rhythms). INSTRUMENT drops 2× (rules.js
   instrumentBonus). The microphone listens ONLY while a challenge card is open or a creature is near (the day/night
   music plays otherwise: mic: false loops never play while listening).
   STARS COME ONLY FROM MILESTONES (recipes.js BT_CHAPTERS): setLevel('blocktave', member, chapter, {stars}); mining or
   building more never adds a star. SURVIVAL NIGHTS (the Endless card): a fresh world, one life, score = nights survived.
   Original look: a neon, stage-lit block world (--bt-* tokens); the player is the student's own avatar (Avatar.sprites). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'blocktave', WORLD_KEY = 'bandarcade.blocktave.world';
  const R = window.BT_RULES, BW = A.BlocktaveWorld, B = BW.BLOCKS, ID = BW.ID, ITEMS = window.BT_ITEMS, RECIPES = window.BT_RECIPES, CHAPTERS = window.BT_CHAPTERS;
  const Card = A.BlocktaveCard;
  const RM = A.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const mod = (a, n) => ((a % n) + n) % n;

  const inst = A.requireInstrument(GAME_ID);            // the snare is welcome (games.js unpitched: true)
  if (!inst) return;
  const member = A.currentMember(), snare = inst.pitched === false, who = member.id;
  A.Pitch.setInstrument(inst);
  A.Pitch.pauseListening(true);                          // the microphone listens only while a card or a creature needs it
  A.mountTopbar(inst, '', GAME_ID);
  A.Sfx.use('endless');
  $('demoHelp').hidden = !A.DEMO;
  // the reading instrument: the snare reads nothing (its challenges are rhythms); everyone else reads their own notes
  const readM = member;

  /* ---------- saved choices: gameData('blocktave') = {mode, ms: {member: {id: date}}, stats: {member: {…}}, found: {recipe: 1}, seen: {…}, controls, otherClef} ---------- */
  const gd = () => A.store.gameData(GAME_ID);
  const saveGd = patch => { if (patch) Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };
  let mode = gd().mode === 'touch' ? 'touch' : 'inst';
  const stats = () => { const s = gd().stats || (gd().stats = {}); return s[who] || (s[who] = {ore: 0, clams: 0, wisps: 0, mined: 0}); };
  const seen = k => !!(gd().seen || {})[k];
  const markSeen = k => { const s = gd().seen || (gd().seen = {}); s[k] = 1; saveGd(); };

  /* ================= THE TITLE SCREEN (the level select: the 5 chapters + Survival Nights) ================= */
  const msDone = id => !!((gd().ms || {})[who] || {})[id];
  const chDone = ci => CHAPTERS[ci].goals.every(g => msDone(g.id));
  /** the CURRENT chapter (0-based): the lowest one not finished (all finished = the last) */
  const curCh = () => { const i = CHAPTERS.findIndex((c, k) => !chDone(k)); return i < 0 ? CHAPTERS.length - 1 : i; };
  /** a chapter is REACHED once every chapter before it is finished (its "complete!" results wait for that) */
  const reached = ci => CHAPTERS.slice(0, ci).every((c, k) => chDone(k));
  /** chapters whose "complete!" results were shown: gameData.shownCh[member] = {index: 1} (older saves: every finished one) */
  function shownCh() {
    const all = gd().shownCh || (gd().shownCh = {});
    if (!all[who]) { all[who] = {}; CHAPTERS.forEach((c, k) => { if (chDone(k)) all[who][k] = 1; }); saveGd(); }
    return all[who];
  }
  /** later chapters' milestones already done */
  const bonusDone = () => CHAPTERS.slice(curCh() + 1).reduce((n, c) => n + c.goals.filter(g => msDone(g.id)).length, 0);
  function drawMode() {
    $('modeInst').setAttribute('aria-pressed', String(mode === 'inst'));
    $('modeTouch').setAttribute('aria-pressed', String(mode === 'touch'));
    $('modeNote').textContent = mode === 'inst'
      ? (snare ? `My instrument (${member.short}): play rhythms, counts and rolls to mine. Mining drops twice as much!` : `My instrument (${member.short}): play the notes to mine and craft. Mining drops twice as much!`)
      : 'Touch: tap note names and rhythms on the screen. No microphone.';
  }
  $('modeInst').onclick = () => { mode = 'inst'; saveGd({mode}); A.Sfx.event('ui-toggle'); drawMode(); };
  $('modeTouch').onclick = () => { mode = 'touch'; saveGd({mode}); A.Sfx.event('ui-toggle'); drawMode(); };
  function worldLine() {
    const w = loadWorld();
    $('worldLine').textContent = w ? `Your world: day ${Math.floor(w.time / (R.dayS + R.nightS)) + 1} · ${w.survived || 0} ${w.survived === 1 ? 'night' : 'nights'} survived · lives on this device`
      : 'A brand-new world is waiting for you.';
  }
  function showHub() {
    stopWorld();
    A.Sfx.gameMenuMusic(GAME_ID);
    $('play').hidden = true; $('hub').hidden = false; A.UI.results.hide(); A.UI.intro.hide();
    document.body.classList.remove('bt-playing');
    pause.setActive(false);
    drawMode(); worldLine();
    $('levelGrid').innerHTML = CHAPTERS.map((ch, i) => {
      const p = A.store.level(GAME_ID, who, i + 1);
      return `<button class="lvl bt-ch${p.stars >= 3 ? ' cleared' : ''}" data-l="${i + 1}">
        <span class="n">Chapter ${i + 1}</span>
        <span class="t">${esc(ch.name)}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars || 0)}</span><span>${chDone(i) ? (reached(i) ? 'Complete' : 'Complete · finished early') : `${ch.goals.filter(g => msDone(g.id)).length} of 3`}</span></span>
        <ul class="bt-card-goals">${ch.goals.map(g => `<li class="${msDone(g.id) ? 'ok' : ''}">${msDone(g.id) ? '✓' : '○'} ${esc(g.text)}</li>`).join('')}</ul>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), {gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: 'nights', title: 'SURVIVAL NIGHTS', label: 'One life',
      blurb: 'A fresh world and one life: how many nights can you survive? Build, light lamps and calm the creatures.', onPlay: () => begin('endless')});
    scrollTo(0, 0);
    startOnCurrent();
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), endless: $('endlessTile'), unlocked: () => true,
      gameId: GAME_ID, label: i => `Chapter ${i + 1} · ${CHAPTERS[i].name}`});
  }
  // the chapter select starts on the CURRENT chapter (level-select.js remembers per game|player|group; Endless is kept)
  function startOnCurrent() {
    try {
      const d = A.store.gameData('level-select'), k = [GAME_ID, A.store.player || '', A.store.instId || ''].join('|');
      if (d[k] !== 'endless') { d[k] = curCh(); A.store.saveGameData('level-select'); }
    } catch (e) { /* no storage */ }
  }
  function begin(ch) {
    A.UI.results.hide();
    const go = () => enterWorld(ch);
    if (mode === 'inst') A.requireMic(go); else go();
  }

  /* ================= THE WORLD: loading and saving ================= */
  function loadWorld() {
    try { const raw = localStorage.getItem(WORLD_KEY); return raw ? BW.decode(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function saveWorld() {
    if (!G || G.endless || !G.w) return false;
    G.w.player = playerSave();
    try { localStorage.setItem(WORLD_KEY, JSON.stringify(BW.encode(G.w))); G.lastSave = performance.now(); G.w.dirty = false; return true; }
    catch (e) { A.UI.toast('Your world could not be saved on this device. Save it to a file!', {kind: 'err'}); return false; }
  }
  const seedParam = () => { const s = A.params && A.params.get('seed'); return s != null && s !== '' && isFinite(+s) ? (+s >>> 0) : null; };
  const newSeed = () => seedParam() != null ? seedParam() : Math.floor(Math.random() * 4294967296) >>> 0;
  function playerSave() {
    const p = G.p;
    return {x: +p.x.toFixed(2), y: +p.y.toFixed(2), hearts: p.hearts, inv: p.inv, hot: p.hot, sel: p.sel};
  }

  /* ================= THE GAME STATE ================= */
  let G = null;
  const tierOf = inv => Math.max(0, ...Object.keys(inv).filter(k => inv[k] > 0 && ITEMS[k] && ITEMS[k].kind === 'tool').map(k => ITEMS[k].tier));
  function enterWorld(ch) {
    const endless = ch === 'endless';
    A.LevelSelect.played(endless ? 'endless' : ch - 1);
    let w = endless ? null : loadWorld(), grew = null;
    if (w) grew = BW.repair(w, R);                              // an older world: the starter check, once
    if (!w) w = BW.generate(newSeed(), R);
    if (endless) { w.time = R.endless.startS; }
    const P = w.player || {};
    G = {w, endless, ch: endless ? 0 : ch, t0: performance.now(), held: 0, creatures: [], parts: [], bags: w.bags,
      keys: {left: false, right: false, jump: false}, build: false, lastSave: performance.now(), wrong: 0, target: null,
      cycleCount: {}, spawnT: 0, died: false, calmed: 0, mined: 0, frames: [], listen: false, wispHold: 0, fx: {},
      p: {x: P.x != null ? P.x : w.spawn.x + .5, y: P.y != null ? P.y : w.spawn.y + 1, vx: 0, vy: 0, face: 1, ground: false, hurtT: 0,
        hearts: P.hearts > 0 ? P.hearts : (endless ? R.endless.hearts : R.player.hearts), inv: P.inv || {}, hot: P.hot || new Array(R.hotbar).fill(null), sel: P.sel || 0, walkT: 0}};
    if (endless) Object.entries(R.endless.kit).forEach(([k, n]) => gain(k, n, true));
    G.nightWas = isNight();
    G.cycle = cycleNo();
    scanGear();
    $('hub').hidden = true; $('play').hidden = false;
    document.body.classList.add('bt-playing');
    pause.setActive(true);
    pause.set({levelsLabel: endless ? 'End this run' : 'Back to chapters', extras: pauseExtras(), note: ''});
    A.Sfx.gameMenuMusic(GAME_ID, false);
    worldMusic(true);
    sizeCanvas(); drawHot(); drawHud(); drawGoals();
    listenSync();
    G.running = true; G.last = performance.now();
    G.raf = requestAnimationFrame(frame);
    scrollTo(0, 0);
    if (!endless) { if (!w.player || w.dirty) saveWorld(); }
    if (grew) setTimeout(() => A.UI.toast('New trees have grown near your camp!', {ms: 3200}), 600);
    if (!endless) setTimeout(checkReached, 900);
    if (!seen('welcome')) firstCard('welcome', 'Welcome to Blocktave!', endless ? 'Survive as many nights as you can with one life! Build a shelter, light Stage Lamps and calm the creatures with your music.'
      : 'This world is yours: it lives on this device. Tap a block to mine it. Glowing blocks are music: play (or tap) the notes to break them! Tap CRAFT to make tools, and build a shelter before night comes.');
  }
  function stopWorld() {
    if (!G) return;
    if (!G.endless) saveWorld();
    cancelAnimationFrame(G.raf); G.running = false;
    Card.close(); closePanels();
    G = null;
    A.Pitch.pauseListening(true); A.Sfx.sync();
    A.Sfx.setMusic(null);
  }

  /* ================= TIME: day and night ================= */
  const DAY = () => G && G.endless ? R.endless.dayS : R.dayS, NIGHT = () => G && G.endless ? R.endless.nightS : R.nightS;
  const cycleNo = () => Math.floor(G.w.time / (DAY() + NIGHT()));
  const inCycle = () => mod(G.w.time, DAY() + NIGHT());
  const isNight = () => inCycle() >= DAY();
  /** the sky's light now (1 = day, R.light.nightSky at night, fading at dusk and dawn) */
  function skyLight() {
    const c = inCycle(), d = DAY(), n = NIGHT(), f = R.duskS, lo = R.light.nightSky;
    if (c < d - f) return 1;                                              // day
    if (c < d) return lo + (1 - lo) * ((d - c) / f);                      // dusk: fading into the night
    if (c < d + n - f) return lo;                                         // night
    return lo + (1 - lo) * ((c - (d + n - f)) / f);                       // dawn: the last seconds of the night
  }
  function worldMusic(force) {
    const n = isNight();
    if (!force && G.musicNight === n) return;
    G.musicNight = n;
    A.Sfx.setMusic(n ? 'blocktave-night' : 'blocktave-day', {fade: 2});
  }

  /* ================= INVENTORY ================= */
  function gain(id, n, quiet) {
    const inv = G.p.inv;
    inv[id] = Math.min(R.player.stack * 9, (inv[id] || 0) + n);
    const it = ITEMS[id];
    if (it && it.kind !== 'tool' && !G.p.hot.includes(id)) { const k = G.p.hot.indexOf(null); if (k >= 0) G.p.hot[k] = id; }
    findRecipes();
    if (!quiet) drawHot();
  }
  function take(id, n = 1) {
    const inv = G.p.inv; if ((inv[id] || 0) < n) return false;
    inv[id] -= n; if (!inv[id]) { delete inv[id]; const k = G.p.hot.indexOf(id); if (k >= 0) G.p.hot[k] = null; }
    drawHot();
    return true;
  }
  const have = (id, n = 1) => (G.p.inv[id] || 0) >= n;
  const tier = () => tierOf(G.p.inv);
  /** RECIPE BOOK: a recipe is found the first time you hold all its ingredients */
  function findRecipes() {
    const f = gd().found || (gd().found = {}); let any = false;
    RECIPES.forEach(r => {
      if (f[r.id]) return;
      const need = {}; r.in.forEach(i => { need[i] = (need[i] || 0) + 1; });
      if (Object.keys(need).every(k => have(k, need[k]))) { f[r.id] = 1; any = r; }
    });
    if (any) { saveGd(); A.UI.toast(`New recipe in your Recipe Book: ${any.name}!`); }
  }

  /* ================= THE CANVAS ================= */
  /* TWO CANVASES: the WORLD is drawn at its own pixel-art size (R.pixel px a block: the tiles' 16-unit grid and the
     avatar sprite's 32 px for 2 blocks), and CSS scales it up crisply (image-rendering: pixelated): a few hundred
     thousand pixels a frame at most, so it stays smooth on an old iPad. The note bubbles, the reach and the target are
     drawn sharp on a clear OVERLAY at the screen's density (≤ dprMax). */
  const cv = $('btCanvas'), ctx = cv.getContext('2d'), ov = $('btOver'), oc = ov.getContext('2d');
  let S = 32, VW = 0, VH = 0, DPR = 1, WPX = .5, cols = 0, rows = 0;
  function sizeCanvas() {
    VW = innerWidth; VH = innerHeight;
    DPR = Math.min(R.dprMax, devicePixelRatio || 1);
    S = Math.round(Math.max(R.tilePx[0], Math.min(R.tilePx[1], Math.min(VW / R.tileView[0], VH / R.tileView[1]))));
    WPX = Math.min(DPR, R.pixel / S);                                   // world pixels per CSS px
    cv.width = Math.round(VW * WPX); cv.height = Math.round(VH * WPX);
    ov.width = Math.round(VW * DPR); ov.height = Math.round(VH * DPR);
    cv.style.width = ov.style.width = VW + 'px'; cv.style.height = ov.style.height = VH + 'px';
    cols = Math.ceil(VW / S) + 2; rows = Math.ceil(VH / S) + 2;
    TILES.build(S * WPX);
    lightCv.width = cols; lightCv.height = rows;
    if (padArr) padArr.apply();
  }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || '#888';
  let COL = null;
  const col = n => (COL || (COL = {}))[n] || (COL[n] = css(n));

  /* ---------- THE TILES: each block drawn once per size into an atlas (original art: neon, stage-lit) ---------- */
  const TILES = {
    atlas: null, size: 0,
    build(px) {
      px = Math.max(8, Math.round(px));
      if (this.size === px && this.atlas) return;
      this.size = px;
      const a = this.atlas = document.createElement('canvas');
      a.width = px * B.length; a.height = px;
      const g = a.getContext('2d');
      B.forEach((b, i) => { g.save(); g.translate(i * px, 0); g.beginPath(); g.rect(0, 0, px, px); g.clip(); drawTile(g, b.key, px); g.restore(); });
    },
    draw(c, id, x, y, s) { c.drawImage(this.atlas, id * this.size, 0, this.size, this.size, x, y, s, s); },
  };
  function drawTile(g, key, s) {
    const u = s / 16, fill = (c, x, y, w, h) => { g.fillStyle = col(c); g.fillRect(x * u, y * u, w * u, h * u); };
    const rr = (c, x, y, w, h, r) => { g.fillStyle = col(c); g.beginPath(); g.roundRect ? g.roundRect(x * u, y * u, w * u, h * u, r * u) : g.rect(x * u, y * u, w * u, h * u); g.fill(); };
    const line = (c, w, pts) => { g.strokeStyle = col(c); g.lineWidth = w * u; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)); g.stroke(); };
    const dot = (c, x, y, r) => { g.fillStyle = col(c); g.beginPath(); g.arc(x * u, y * u, r * u, 0, 7); g.fill(); };
    const oval = (c, x, y, rx, ry, rot = -.35) => { g.fillStyle = col(c); g.beginPath(); g.ellipse(x * u, y * u, rx * u, ry * u, rot, 0, 7); g.fill(); };
    const bevel = () => { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, s, u); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, s - u, s, u); };
    const stone = (base = 'bt-slate', lines = 'bt-slate-2') => { fill(base, 0, 0, 16, 16); line(lines, .8, [[0, 5], [6, 3], [16, 6]]); line(lines, .8, [[0, 12], [9, 10], [16, 13]]); bevel(); };
    switch (key) {
      case 'air': g.clearRect(0, 0, s, s); break;
      case 'dirt': fill('bt-dirt', 0, 0, 16, 16); [[3, 4], [11, 3], [7, 10], [13, 12], [2, 13]].forEach(([x, y]) => dot('bt-dirt-2', x, y, 1)); bevel(); break;
      case 'moss': fill('bt-dirt', 0, 0, 16, 16); [[4, 10], [12, 12]].forEach(([x, y]) => dot('bt-dirt-2', x, y, 1));
        fill('bt-moss-2', 0, 0, 16, 4); line('bt-moss', 1.2, [[0, 2.5], [2, 1], [4, 2.5], [6, 1], [8, 2.5], [10, 1], [12, 2.5], [14, 1], [16, 2.5]]); break;
      case 'sand': fill('bt-sand', 0, 0, 16, 16); for (let k = 0; k < 6; k++) dot('bt-sand-2', (k * 5.3) % 15 + 1, (k * 7.1) % 14 + 1, .7); bevel(); break;
      case 'clay': fill('bt-clay', 0, 0, 16, 16); fill('bt-clay-2', 0, 4, 16, 2); fill('bt-clay-2', 0, 11, 16, 1.5); bevel(); break;
      case 'slate': stone(); break;
      case 'bedrock': fill('bt-bedrock', 0, 0, 16, 16); line('bt-slate', .6, [[0, 8], [16, 8]]); line('bt-slate', .6, [[8, 0], [8, 16]]); break;
      case 'water': g.fillStyle = col('bt-water'); g.globalAlpha = .55; g.fillRect(0, 0, s, s); g.globalAlpha = .9; line('bt-water-hi', .8, [[0, 3], [4, 2], [8, 3], [12, 2], [16, 3]]); g.globalAlpha = 1; break;
      case 'leaves': [[4, 5, 4], [11, 5, 4], [8, 11, 4.5], [3, 12, 3], [13, 12, 3]].forEach(([x, y, r]) => dot('bt-leaf', x, y, r)); [[5, 4], [11, 6], [8, 10]].forEach(([x, y]) => dot('bt-leaf-hi', x, y, 1)); break;
      case 'reed': line('bt-reed', 1.1, [[5, 16], [5, 3]]); line('bt-reed', 1.1, [[10, 16], [10, 6]]); oval('bt-cork', 5, 4, 1.4, 3, 0); oval('bt-cork', 10, 7, 1.3, 2.6, 0); line('bt-reed', .8, [[12, 16], [14, 9]]); break;
      case 'cork': fill('bt-cork', 4, 0, 8, 16); [[6, 3], [9, 7], [6, 11], [9, 14]].forEach(([x, y]) => dot('bt-cork-2', x, y, .9)); break;
      case 'maple': fill('bt-maple', 4, 0, 8, 16); line('bt-maple-2', .7, [[6, 0], [6, 16]]); line('bt-maple-2', .7, [[9.5, 0], [9.5, 16]]); break;
      case 'felt': rr('bt-felt', 0, 0, 16, 16, 2); g.setLineDash([u * 1.5, u * 1.2]); line('bt-felt-2', .6, [[1.5, 1.5], [14.5, 1.5], [14.5, 14.5], [1.5, 14.5], [1.5, 1.5]]); g.setLineDash([]); break;
      case 'rawhide': line('bt-maple-2', 1, [[5, 16], [6, 9]]); line('bt-maple-2', 1, [[11, 16], [10, 9]]); oval('bt-rawhide', 8, 8, 6, 3, 0); oval('bt-rawhide-2', 8, 7.4, 4.6, 1.6, 0); break;
      case 'toneOre': stone(); [[5, 6], [11, 10], [7, 12.5]].forEach(([x, y]) => { oval('bt-tone', x, y, 2.2, 1.6); }); line('bt-tone', .7, [[7.1, 5.7], [7.1, 1.8]]); line('bt-tone', .7, [[13.1, 9.7], [13.1, 5.8]]); break;
      case 'brassOre': stone(); [[5, 5], [11, 9], [6, 12]].forEach(([x, y]) => { dot('bt-brass', x, y, 2.2); dot('bt-slate', x, y, .9); }); break;
      case 'scaleVein': stone(); line('bt-scale', 1.3, [[1, 14], [4, 14], [4, 11], [7, 11], [7, 8], [10, 8], [10, 5], [13, 5], [13, 2], [15, 2]]); break;
      case 'springVein': stone(); line('bt-spring', 1.1, [[2, 12], [5, 5], [7, 12], [9, 5], [11, 12], [13, 5], [15, 12]]); break;
      case 'sustain': stone('bt-slate', 'bt-slate-2'); rr('bt-sustain', 2, 6.5, 12, 3, 1.5); line('bt-sustain-hi', .7, [[3.5, 8], [12.5, 8]]); break;
      case 'rhythmRock': stone('bt-clay', 'bt-clay-2'); [[3, 12, 4], [7, 12, 2], [11, 12, 4]].forEach(([x, y, h]) => { fill('bt-rhythm', x, y - h * 2, 1.6, h * 2); dot('bt-rhythm', x - .2, y, 1.6); }); break;
      case 'restCrystal': stone(); line('bt-rest', 1.4, [[7, 2], [10, 5.5], [6.5, 8.5], [10, 12], [7, 14]]); break;
      case 'planks': fill('bt-plank', 0, 0, 16, 16); [4, 8, 12].forEach(y => fill('bt-plank-2', 0, y, 16, .7)); [[5, 0, 4], [11, 4, 4], [3, 8, 4], [9, 12, 4]].forEach(([x, y, h]) => fill('bt-plank-2', x, y, .7, h)); break;
      case 'panel': fill('bt-panel', 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) { g.fillStyle = col('bt-panel-2'); g.beginPath(); g.moveTo(x * u, (y + 4) * u); g.lineTo((x + 2) * u, y * u); g.lineTo((x + 4) * u, (y + 4) * u); g.fill(); } break;
      case 'brick': fill('bt-brick-mortar', 0, 0, 16, 16); [[0, 0, 7.4], [8, 0, 7.4], [-4, 4, 7.4], [4, 4, 7.4], [12, 4, 7.4], [0, 8, 7.4], [8, 8, 7.4], [-4, 12, 7.4], [4, 12, 7.4], [12, 12, 7.4]].forEach(([x, y, w]) => rr('bt-brick', x + .3, y + .3, w, 3.4, .6)); break;
      case 'stage': fill('bt-stage', 0, 0, 16, 16); fill('bt-stage-edge', 0, 0, 16, 1.4); [5, 11].forEach(x => fill('bt-stage-2', x, 1.4, .6, 14.6)); break;
      case 'riser': fill('bt-plank', 0, 11, 16, 5); fill('bt-plank', 5, 6, 11, 5); fill('bt-plank', 10, 1, 6, 5); [11, 6, 1].forEach(y => fill('bt-stage-edge', 16 - (y === 11 ? 16 : y === 6 ? 11 : 6), y, y === 11 ? 16 : y === 6 ? 11 : 6, .8)); break;
      case 'door': fill('bt-plank', 2, 0, 12, 16); line('bt-plank-2', .8, [[8, 0], [8, 16]]); dot('bt-door-window', 8, 5, 2.6); dot('bt-brass', 12, 10, 1); break;
      case 'doorOpen': fill('bt-plank-2', 2, 0, 1.5, 16); fill('bt-plank-2', 12.5, 0, 1.5, 16); fill('bt-plank', 2, 0, 3, 16); break;
      case 'glass': g.fillStyle = col('bt-glass'); g.globalAlpha = .3; g.fillRect(0, 0, s, s); g.globalAlpha = 1; line('bt-glass-edge', 1, [[.5, .5], [15.5, .5], [15.5, 15.5], [.5, 15.5], [.5, .5]]); line('bt-glass-edge', .6, [[4, 12], [11, 5]]); break;
      case 'lamp': line('bt-slate-2', 1, [[8, 16], [8, 9]]); line('bt-slate-2', 1, [[5, 16], [11, 16]]); rr('bt-slate-2', 4, 3, 8, 6, 1.5); dot('bt-lamp', 8, 6, 2.4); break;
      case 'cot': fill('bt-felt', 1, 10, 14, 3); rr('bt-panel', 2, 8.5, 4, 2, 1); line('bt-slate-2', .9, [[2, 13], [2, 16]]); line('bt-slate-2', .9, [[14, 13], [14, 16]]); break;
      case 'locker': rr('bt-locker', 3, 0, 10, 16, 1); [2.5, 4, 5.5].forEach(y => fill('bt-locker-2', 5, y, 6, .6)); dot('bt-brass', 11, 9, .9); break;
      case 'stand': line('bt-slate-2', .9, [[8, 16], [8, 7]]); line('bt-slate-2', .9, [[5, 16], [11, 16]]); fill('bt-slate-2', 3, 2, 10, 6); fill('bt-screen', 4, 3, 8, 4); break;
      case 'metronome': g.fillStyle = col('bt-plank'); g.beginPath(); g.moveTo(4 * u, 16 * u); g.lineTo(6.5 * u, 2 * u); g.lineTo(9.5 * u, 2 * u); g.lineTo(12 * u, 16 * u); g.fill(); line('bt-brass', .9, [[8, 14], [10.5, 4]]); break;
      case 'tuner': rr('bt-slate-2', 2, 6, 12, 10, 1.5); fill('bt-screen', 3.5, 7.5, 9, 4); line('bt-rhythm', .8, [[8, 11], [9.5, 8]]); break;
      case 'composer': rr('bt-composer', 0, 0, 16, 16, 2); oval('bt-tone', 7, 10, 2.8, 2); line('bt-tone', .8, [[9.4, 9.5], [9.4, 3]]); break;
      case 'podium': fill('bt-plank', 3, 7, 10, 9); fill('bt-plank-2', 2, 6, 12, 1.5); line('bt-brass', .8, [[9, 6], [13, 1.5]]); break;
      case 'bench': fill('bt-plank', 0, 6, 16, 2.5); line('bt-plank-2', 1, [[2, 8.5], [2, 16]]); line('bt-plank-2', 1, [[14, 8.5], [14, 16]]); oval('bt-cork', 7, 3.6, 3.2, 2.2, 0); oval('bt-cork', 10.2, 4, 2, 1.6, 0); line('bt-slate-2', .6, [[7, 3.6], [10.5, 4]]); break;
      default: fill('bt-dirt', 0, 0, 16, 16);
    }
  }
  /* item icons (inventory, hotbar, the Measure): a block's own tile, or a small drawing for materials and tools */
  const ICON = {};
  function iconURL(id) {
    if (ICON[id]) return ICON[id];
    const c = document.createElement('canvas'), s = 48; c.width = c.height = s;
    const g = c.getContext('2d'), it = ITEMS[id] || {}, u = s / 16;
    const dot = (cl, x, y, r) => { g.fillStyle = col(cl); g.beginPath(); g.arc(x * u, y * u, r * u, 0, 7); g.fill(); };
    const line = (cl, w, pts) => { g.strokeStyle = col(cl); g.lineWidth = w * u; g.lineCap = 'round'; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)); g.stroke(); };
    if (it.block) drawTile(g, it.block, s);
    else {
      const gem = (cl, sides = 6) => { g.fillStyle = col(cl); g.beginPath(); for (let k = 0; k < sides; k++) { const a = k / sides * 6.283 - 1.57; g.lineTo((8 + Math.cos(a) * 5.5) * u, (8 + Math.sin(a) * 5.5) * u); } g.fill(); dot('text-hi', 6.5, 6.2, .9); };
      const mallet = headCol => { line('bt-plank', 1.6, [[4, 14], [10, 6]]); g.fillStyle = col(headCol); g.beginPath(); g.ellipse(11 * u, 4.6 * u, 3.6 * u, 2.6 * u, -.9, 0, 7); g.fill(); };
      switch (id) {
        case 'reed': drawTile(g, 'reed', s); break;
        case 'cork': dot('bt-cork', 8, 8, 5); dot('bt-cork-2', 6, 7, 1); dot('bt-cork-2', 10, 10, 1); break;
        case 'felt': drawTile(g, 'felt', s); break;
        case 'maple': g.fillStyle = col('bt-maple'); g.fillRect(3 * u, 6 * u, 10 * u, 5 * u); line('bt-maple-2', .6, [[3, 8.5], [13, 8.5]]); break;
        case 'rawhide': dot('bt-rawhide', 8, 8, 5.5); dot('bt-rawhide-2', 8, 8, 3.5); break;
        case 'tone': gem('bt-tone'); break;
        case 'brass': gem('bt-brass', 8); break;
        case 'gem': gem('bt-scale', 4); break;
        case 'spring': line('bt-spring', 1.3, [[3, 12], [6, 4], [8, 12], [10, 4], [13, 12]]); break;
        case 'hum': gem('bt-sustain', 5); break;
        case 'rhythm': gem('bt-rhythm', 7); break;
        case 'rest': line('bt-rest', 1.6, [[7, 2], [10, 5.5], [6.5, 8.5], [10, 12], [7, 14]]); break;
        case 'pearl': dot('bt-pearl', 8, 8, 4.5); dot('text-hi', 6.5, 6.5, 1.2); break;
        case 'dust': [[5, 6], [9, 4], [11, 9], [6, 11], [8, 8]].forEach(([x, y]) => dot('bt-wisp', x, y, 1.3)); break;
        case 'mallet1': mallet('bt-cork'); break;
        case 'mallet2': mallet('bt-brass'); break;
        case 'mallet3': mallet('bt-silver'); break;
        case 'baton': line('bt-brass', 1.3, [[3, 13], [13, 3]]); dot('bt-plank', 3.5, 12.5, 1.8); break;
        case 'snack': g.fillStyle = col('bt-snack'); g.beginPath(); g.roundRect ? g.roundRect(4 * u, 4 * u, 8 * u, 10 * u, 2 * u) : g.rect(4 * u, 4 * u, 8 * u, 10 * u); g.fill(); line('bt-brass', .8, [[5, 6], [11, 6]]); break;
        default: dot('text-lo', 8, 8, 4);
      }
    }
    return (ICON[id] = c.toDataURL());
  }
  const itemName = id => (ITEMS[id] || {}).name || id;

  /* ================= THE PLAYER'S SPRITE: the student's own avatar (shared/avatar.js, the full-body sprites) ================= */
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    try { SPR = A.Avatar.sprites(member.id) || null; } catch (e) { SPR = null; }
    return SPR;
  }
  addEventListener('arcade:avatar', () => { SPR = null; });

  /* ================= PHYSICS ================= */
  const HW = .36, PH = 1.8;
  const solid = (x, y) => B[BW.at(G.w, Math.floor(x), Math.floor(y))].solid;
  const blockAt = (x, y) => B[BW.at(G.w, Math.floor(x), Math.floor(y))];
  function collides(x, y, hw = HW, h = PH) {
    for (let ty = Math.floor(y - h + .001); ty <= Math.floor(y - .001); ty++) for (let tx = Math.floor(x - hw); tx <= Math.floor(x + hw - .001); tx++) if (solid(tx, ty)) return true;
    return false;
  }
  function inBlock(p, key, h = PH) { for (let ty = Math.floor(p.y - h + .001); ty <= Math.floor(p.y - .001); ty++) for (let tx = Math.floor(p.x - HW); tx <= Math.floor(p.x + HW - .001); tx++) if (blockAt(tx, ty)[key]) return true; return false; }
  /** move a body (x = center, y = feet) with tile collisions; step: climb a 1-block ledge while walking */
  function moveBody(b, dt, hw, h, step) {
    const sub = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt / .4));
    b.ground = false;
    for (let k = 0; k < sub; k++) {
      const d = dt / sub, nx = b.x + b.vx * d;
      if (!collides(nx, b.y, hw, h)) b.x = nx;
      else if (step && b.groundWas && !collides(nx, b.y - 1.01, hw, h) && !collides(b.x, b.y - 1.01, hw, h)) { b.y -= 1; b.x = nx; }
      else b.vx = 0;
      const ny = b.y + b.vy * d;
      if (!collides(b.x, ny, hw, h)) b.y = ny;
      else { if (b.vy > 0) { b.ground = true; b.y = Math.floor(ny - .001); } b.vy = 0; }
    }
    b.x = Math.max(hw + .01, Math.min(G.w.w - hw - .01, b.x));
    b.groundWas = b.ground;
  }
  function stepPlayer(dt) {
    const p = G.p, P = R.player, k = G.keys;
    const water = inBlock(p, 'fluid'), climb = inBlock(p, 'climb');
    const sp = P.speed * (water ? P.swim + .25 : 1);
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    p.vx = dir * sp; if (dir) p.face = dir;
    if (climb && k.jump) p.vy = -P.speed * .9;
    else if (water) { p.vy = Math.min(p.vy + P.gravity * .3 * dt, 3); if (k.jump) p.vy = -P.speed * .8; }
    else { p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt); if (k.jump && p.ground) p.vy = -P.jump; }
    moveBody(p, dt, HW, PH, true);
    // stay out of the world floor: a body stuck inside a block (a block placed over it) is pushed up
    if (collides(p.x, p.y)) { for (let u = 1; u < 4; u++) if (!collides(p.x, p.y - u)) { p.y -= u; break; } }
    p.walkT = dir ? p.walkT + dt : 0;
    if (p.y > G.w.h + 2) { p.y = G.w.spawn.y + 1; p.x = G.w.spawn.x + .5; }
    p.hurtT = Math.max(0, p.hurtT - dt);
    // bags: walk into one to pick it up
    for (let i = G.w.bags.length - 1; i >= 0; i--) { const bg = G.w.bags[i]; if (Math.abs(bg.x - p.x) < 1 && Math.abs(bg.y - (p.y - .9)) < 1.3) { Object.entries(bg.items).forEach(([id, n]) => gain(id, n, true)); G.w.bags.splice(i, 1); drawHot(); A.Sfx.event('bt-pickup'); A.UI.toast('You picked up your bag!'); } }
    // THE DEEP LAYERS (chapter 4)
    const z = BW.zone(G.w, Math.floor(p.x), Math.floor(p.y - .5), R);
    if (z.layer !== G.layer || z.biome !== G.biome) { G.layer = z.layer; G.biome = z.biome; drawZone(z); }
    if ((z.layer === 'depths' || z.layer === 'peaks') && !G.endless) award('deep');
  }

  /* ================= THE CAMERA AND DRAWING ================= */
  const lightCv = document.createElement('canvas'), lightG = lightCv.getContext('2d');
  let camX = 0, camY = 0;
  function frame(now) {
    if (!G || !G.running) return;
    G.raf = requestAnimationFrame(frame);
    const minGap = 1000 / R.fps - 1;
    if (now - G.last < minGap) return;
    const real = Math.min(.05, (now - G.last) / 1000); G.last = now;
    const t0 = performance.now();
    if (!G.held && !pause.paused) {
      const slow = Card.current || panelOpen() ? R.challengeSlow : 1;
      update(real * slow, real, now);
    }
    draw(now);
    const ms = performance.now() - t0;
    G.frames.push([now, ms]); if (G.frames.length > 240) G.frames.shift();
    G.nFrames = (G.nFrames || 0) + 1; if (!G.since) G.since = now;
  }
  function update(dt, real, now) {
    const w = G.w;
    w.time += dt;
    stepPlayer(dt);
    // night and day
    const night = isNight(), cyc = cycleNo();
    if (night && !G.nightWas) nightFalls();
    if (!night && G.nightWas) dawn();
    G.nightWas = night;
    if (cyc !== G.cycle) { G.cycle = cyc; G.cycleCount = {}; }
    worldMusic();
    // creatures (they freeze while a sound mutes the microphone: shared/pitch.js suppression)
    const frozen = A.Pitch.listening() && A.Pitch.isSuppressed(now);
    if (!frozen) stepCreatures(dt);
    G.spawnT += dt;
    if (G.spawnT >= R.spawn.everyS) { G.spawnT = 0; trySpawn(); }
    listenSync();
    // particles
    G.parts = G.parts.filter(q => (q.t += real) < q.life);
    // autosave
    if (!G.endless && performance.now() - G.lastSave > R.autosaveS * 1000) saveWorld();
    if (G.hudT == null || now - G.hudT > 250) { G.hudT = now; drawHud(); Card.follow(); }
  }
  function draw(now) {
    const w = G.w, p = G.p, sky = skyLight();
    // the camera: the player a little below the middle
    camX = Math.max(0, Math.min(w.w - VW / S, p.x - VW / S / 2));
    const sheet = VW <= 760 && Card.current;                              // a card along the bottom: the player moves up out from under it
    camY = Math.max(-4, Math.min(w.h - VH / S + (sheet ? VH / S * .4 : 0), p.y - 1 - VH / S * (sheet ? .28 : .55)));
    ctx.setTransform(WPX, 0, 0, WPX, 0, 0);
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, ov.width, ov.height); oc.setTransform(DPR, 0, 0, DPR, 0, 0);
    // THE SKY: a stage wash, day to night (colors from the theme)
    const gr = ctx.createLinearGradient(0, 0, 0, VH);
    const dayMix = Math.max(0, Math.min(1, (sky - R.light.nightSky) / (1 - R.light.nightSky)));
    gr.addColorStop(0, mix(col('bt-sky-night'), col('bt-sky-day'), dayMix));
    gr.addColorStop(1, mix(col('bt-sky-night-2'), col('bt-sky-day-2'), dayMix));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    drawSkyBits(dayMix, now);
    // THE TILES: only the visible ones
    const x0 = Math.floor(camX), y0 = Math.floor(camY), ox = (x0 - camX) * S, oy = (y0 - camY) * S;
    ctx.imageSmoothingEnabled = false;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j; if (y < 0 || y >= w.h) continue;
      for (let i = 0; i < cols; i++) {
        const x = x0 + i; if (x < 0 || x >= w.w) continue;
        const v = w.b[y * w.w + x]; if (!v) continue;
        TILES.draw(ctx, v, ox + i * S, oy + j * S, S);
        if (v === ID.composer) { const m = w.meta[x + ',' + y]; if (m && m.powered) { ctx.fillStyle = col('bt-powered'); ctx.globalAlpha = .35; ctx.fillRect(ox + i * S, oy + j * S, S, S); ctx.globalAlpha = 1; } }
      }
    }
    const sx = x => (x - camX) * S, sy = y => (y - camY) * S;
    // bags where someone fell
    w.bags.forEach(bg => { const bob = RM.matches ? 0 : Math.sin(now / 400) * .1; drawBag(sx(bg.x), sy(bg.y + bob)); });
    // THE PLAYER (the avatar sprite; blinking never: a hit shows as a soft fade)
    drawPlayer(sx(p.x), sy(p.y), now);
    // creatures
    G.creatures.forEach(c => drawCreature(c, sx(c.x), sy(c.y), now));
    // particles
    G.parts.forEach(q => { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.c; const k = q.t / q.life; ctx.fillRect(sx(q.x + q.vx * k), sy(q.y + q.vy * k + k * k), S * .18, S * .18); });
    ctx.globalAlpha = 1;
    // THE LIGHT: one pixel per tile, scaled up smoothly (soft light around lamps, dark caves, the night)
    const img = lightG.createImageData(cols, rows), d = img.data, lamps = G.lamps.filter(L => L.x > x0 - 9 && L.x < x0 + cols + 9 && L.y > y0 - 9 && L.y < y0 + rows + 9);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const l = BW.light(w, x0 + i, y0 + j, sky, lamps, R), a = Math.round(255 * R.light.maxShade * (1 - l));
      d[(j * cols + i) * 4 + 3] = a;
    }
    lightG.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCv, 0, 0, cols, rows, ox - S / 2, oy - S / 2, cols * S, rows * S);
    // after the light, so they're always readable: the note bubbles, the reach and the target
    G.creatures.forEach(c => drawBubble(c, sx(c.x), sy(c.y)));
    drawReach(sx, sy);
  }
  function mix(a, b, t) {
    const pa = parse(a), pb = parse(b); if (!pa || !pb) return t > .5 ? b : a;
    return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`;
  }
  function parse(c) { const m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [0, 2, 4].map(k => parseInt(m[1].slice(k, k + 2), 16)); const r = /rgba?\(([^)]+)\)/.exec(c); return r ? r[1].split(',').slice(0, 3).map(Number) : null; }
  function drawSkyBits(day, now) {
    // stars at night (still), and far-off stage spotlights by day: slow, soft, never flashing
    if (day < .8) {
      ctx.globalAlpha = (1 - day) * .8; ctx.fillStyle = col('bt-star');
      for (let k = 0; k < 40; k++) { const x = ((k * 97.3 + G.w.seed % 97) % 100) / 100 * VW, y = ((k * 41.7) % 60) / 100 * VH * .7; ctx.fillRect(x - camX * .2 % VW, y, 2, 2); }
      ctx.globalAlpha = 1;
    }
    if (day > .2) {
      ctx.globalAlpha = day * .1; ctx.fillStyle = col('bt-beam');
      for (let k = 0; k < 3; k++) { const a = RM.matches ? 0 : Math.sin(now / 6000 + k * 2) * .25, x = VW * (.2 + k * .3); ctx.beginPath(); ctx.moveTo(x, VH * .95); ctx.lineTo(x + Math.sin(a - .3) * VH, 0); ctx.lineTo(x + Math.sin(a + .3) * VH, 0); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  function drawPlayer(x, y, now) {
    const p = G.p, spr = sprites(), h = S * 2;
    ctx.globalAlpha = p.hurtT > 0 ? .55 : 1;
    if (spr) {
      const key = Card.current && mode === 'inst' ? '-play' : p.walkT > 0 ? '-walk' : '';
      const set = spr[key] || spr[''], f = set.frames[Math.floor(now / 1000 * (set.fps || 2)) % set.frames.length];
      ctx.imageSmoothingEnabled = false;
      ctx.save(); ctx.translate(x, y - h + S * .08);
      if (p.face < 0) { ctx.scale(-1, 1); ctx.drawImage(f, -h / 2, 0, h, h); } else ctx.drawImage(f, -h / 2, 0, h, h);
      ctx.restore();
    } else {
      ctx.fillStyle = col('cyan'); ctx.fillRect(x - HW * S, y - PH * S, HW * 2 * S, PH * S);
    }
    ctx.globalAlpha = 1;
  }
  function drawBag(x, y) {
    ctx.fillStyle = col('bt-bag'); ctx.beginPath(); ctx.ellipse(x, y, S * .35, S * .3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = col('bt-brass'); ctx.lineWidth = S * .06; ctx.beginPath(); ctx.moveTo(x - S * .15, y - S * .28); ctx.lineTo(x + S * .15, y - S * .28); ctx.stroke();
  }
  function drawReach(sx, sy) {
    const p = G.p, cx = sx(p.x), cy = sy(p.y - .9);
    oc.strokeStyle = col(G.build ? 'bt-build' : 'bt-mine'); oc.globalAlpha = .22; oc.lineWidth = 2; oc.setLineDash([6, 8]);
    oc.beginPath(); oc.arc(cx, cy, R.player.reach * S, 0, 7); oc.stroke(); oc.setLineDash([]); oc.globalAlpha = 1;
    const t = G.target; if (!t) return;
    const ok = inReach(t.x, t.y);
    oc.strokeStyle = col(ok ? (G.build ? 'bt-build' : 'bt-mine') : 'bt-far'); oc.lineWidth = 3;
    oc.strokeRect(sx(t.x) + 1.5, sy(t.y) + 1.5, S - 3, S - 3);
  }

  /* ================= MINING AND BUILDING ================= */
  const inReach = (x, y) => Math.hypot(x + .5 - G.p.x, y + .5 - (G.p.y - .9)) <= R.player.reach + .01;
  function tileAt(clientX, clientY) { return {x: Math.floor(camX + clientX / S), y: Math.floor(camY + clientY / S)}; }
  /** a tap / click on the world: a creature, else the block (MINE mode breaks, BUILD mode places or uses) */
  function tapWorld(clientX, clientY, alt) {
    if (!G || G.held || pause.paused || Card.current) return;
    const wx = camX + clientX / S, wy = camY + clientY / S;
    const cr = G.creatures.find(c => c.state === 'live' && Math.abs(c.x - wx) < .9 && wy > c.y - 1.4 && wy < c.y + .4);
    if (cr) return creatureCard(cr);
    const t = tileAt(clientX, clientY);
    G.target = t;
    act(t.x, t.y, alt ? !G.build : G.build);
  }
  function act(x, y, build) {
    if (!inReach(x, y)) { A.UI.toast('Too far away: walk closer!', {ms: 1400}); return; }
    const b = B[BW.at(G.w, x, y)];
    if (build) {
      if (b.use) return useBlock(b, x, y);
      const id = G.p.hot[G.p.sel];
      if (id === 'snack') return eat();
      return place(x, y, id);
    }
    return mine(x, y);
  }
  function mine(x, y) {
    const b = B[BW.at(G.w, x, y)];
    if (!b.mine) { if (b.key !== 'air' && b.key !== 'water') A.UI.toast(`${b.name} can't be mined.`, {ms: 1400}); return false; }
    const need = b.tier || 0, have = tier();
    if (have < need) {
      if (b.key === 'toneOre' && have < 1 && !seen('ore-mallet')) { firstCard('ore-mallet', 'Tone Ore!', 'You need a Wooden Mallet for this! Make one in the Measure: Planks, Planks, Cork.'); return false; }
      A.UI.toast(`${b.name} needs a ${R.tools[need]}. Tap CRAFT to make one!`, {ms: 2200}); return false;
    }
    if (b.mine === 'tap') { breakBlock(x, y, b, 1); return true; }
    return challengeFor(b, x, y);
  }
  function breakBlock(x, y, b, n) {
    const w = G.w;
    if (b.door) { [y - 1, y, y + 1].forEach(yy => { if (B[BW.at(w, x, yy)].door) BW.put(w, x, yy, ID.air); }); }
    else BW.put(w, x, y, ID.air);
    delete w.meta[x + ',' + y];
    if (b.key === 'locker') { const m = w.lockers && w.lockers[x + ',' + y]; if (m) Object.entries(m).forEach(([k, c]) => gain(k, c, true)); }
    if (b.drop) gain(b.drop, n);
    burst(x + .5, y + .5, col(b.key === 'toneOre' ? 'bt-tone' : b.key === 'moss' ? 'bt-moss' : 'bt-dirt-2'));
    A.Sfx.event('bt-break');
    stats().mined++; G.mined++; saveGd();
    if (b.light || b.key === 'metronome' || b.key === 'tuner' || b.use) scanGear();
    checkRooms(x, y);
    return true;
  }
  function burst(x, y, c) { if (RM.matches) return; for (let k = 0; k < 8; k++) G.parts.push({x, y, vx: (Math.random() - .5) * 1.6, vy: (Math.random() - .8) * 1.4, t: 0, life: .45, c}); if (G.parts.length > 80) G.parts.splice(0, G.parts.length - 80); }
  function place(x, y, id) {
    const it = ITEMS[id];
    if (!id || !it || !it.block) { A.UI.toast(id ? `${itemName(id)} can't be placed.` : 'Pick something to build from your hotbar.', {ms: 1800}); return false; }
    if (!have(id)) return false;
    const w = G.w, here = B[BW.at(w, x, y)], nb = B[ID[it.block]];
    if (here.key !== 'air' && here.key !== 'water') return false;
    if (nb.solid && collidesBox(x, y)) { A.UI.toast('You are standing there!', {ms: 1200}); return false; }
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = BW.at(w, x + dx, y + dy); return v !== ID.air && v !== ID.water; });
    if (!next) { A.UI.toast('Build next to another block.', {ms: 1400}); return false; }
    if (it.block === 'door') {                                            // a door is 2 blocks tall
      const up = B[BW.at(w, x, y - 1)];
      if (up.key !== 'air' && up.key !== 'water') { A.UI.toast('A door needs 2 blocks of room.', {ms: 1400}); return false; }
      if (collidesBox(x, y - 1)) return false;
      BW.put(w, x, y - 1, ID.door);
    }
    BW.put(w, x, y, ID[it.block]);
    if (it.block === 'composer') w.meta[x + ',' + y] = {pitch: defaultPitch()};
    take(id);
    A.Sfx.event('bt-place');
    if (nb.light) { scanGear(); award('lamp'); }
    if (['metronome', 'tuner', 'bench'].includes(it.block)) scanGear();
    if (it.block === 'bench') award('bench');
    if (it.block === 'composer' && !seen('composer')) firstCard('composer', 'The composing corner!', 'Composer Blocks are yours to write music with. Put up to 8 in a row, tap each one in BUILD mode to pick its note, then put a Conductor\'s Podium at the end. Play your melody at the podium to power the row: it lights up and opens a door next to it!');
    checkRooms(x, y);
    return true;
  }
  const collidesBox = (x, y) => { const p = G.p; return x + 1 > p.x - HW && x < p.x + HW && y + 1 > p.y - PH && y < p.y; };
  function useBlock(b, x, y) {
    const w = G.w;
    if (b.door) {
      const open = b.key === 'door';
      [y - 1, y, y + 1].forEach(yy => { const v = B[BW.at(w, x, yy)]; if (v.door) BW.put(w, x, yy, open ? ID.doorOpen : ID.door); });
      if (!open && collides(G.p.x, G.p.y)) [y - 1, y, y + 1].forEach(yy => { if (B[BW.at(w, x, yy)].door) BW.put(w, x, yy, ID.doorOpen); });
      A.Sfx.event('bt-place');
      return true;
    }
    if (b.key === 'cot') return sleep(x, y);
    if (b.key === 'locker') return openLocker(x, y);
    if (b.key === 'composer') return openComposer(x, y);
    if (b.key === 'podium') return openPodium(x, y);
    if (b.key === 'bench') return openCraft();
    return false;
  }
  function eat() {
    if (!have('snack')) return;
    if (G.p.hearts >= maxHearts()) { A.UI.toast('Your hearts are full!', {ms: 1200}); return; }
    take('snack'); G.p.hearts = Math.min(maxHearts(), G.p.hearts + R.player.snackHeal);
    A.Sfx.event('bt-pickup'); drawHud();
  }
  const maxHearts = () => G.endless ? R.endless.hearts : R.player.hearts;
  function defaultPitch() { const n = inst.notes && inst.notes[0]; return n && !snare ? A.music.writtenMidi(n) : 72; }

  /* ================= THE CHALLENGES (challenges.js draws the card) ================= */
  /** the notes a card asks for here: the pool by depth (surface = first five, middle = a concert scale, the deep layers =
      chromatic), the clef by depth (Treble Peaks = treble, Bass Depths = bass, else the student's own) */
  const POOLS = {surface: 'first5', middle: null, peaks: 'chrom', depths: 'chrom'};
  const SCALES = ['Bb', 'Eb', 'F', 'Ab'];
  const OTHER_FIT = {treble: m => m >= 55 && m <= 84, bass: m => m >= 36 && m <= 64};
  function notesAt(x, y, n, {order = 'random', pool} = {}) {
    const z = BW.zone(G.w, x, y, R);
    const clef = z.layer === 'peaks' ? 'treble' : z.layer === 'depths' ? 'bass' : inst.clef;
    const notes = pool || POOLS[z.layer] || SCALES[Math.floor(Math.random() * SCALES.length)];
    const other = clef !== inst.clef;
    const seq = A.buildSequence({member: readM, group: inst, notes, order, level: 2, count: order === 'order' ? Math.max(n, 8) : Math.max(24, n * 3)});
    let items = order === 'order' ? seq.items.slice(0, n) : seq.items;
    if (other && order !== 'order') { const f = items.filter(it => OTHER_FIT[clef](it.midi)); if (f.length >= n) items = f; }
    items = items.slice(0, n);
    const fit = (other ? seq.fit.filter(s => OTHER_FIT[clef](A.music.writtenMidi(s))) : seq.fit);
    return {items, clef, sig: seq.sig, fit: fit.length ? fit : items.map(i => i.show), other, nameOf: seq.name};
  }
  function hintNow(set) {
    if (G.wrong >= R.hintAfterWrong) return true;
    if (set.other) { const k = gd().otherClef || 0; if (k < R.otherClefNames) { gd().otherClef = k + 1; saveGd(); return true; } }
    return false;
  }
  const RD_CELLS = () => [...new Set((window.RD_LEVELS || []).slice(0, R.rhythmLevels || 5).flatMap(L => [].concat(L.time).includes('4/4') ? (Array.isArray(L.cells) ? L.cells : (L.cells && L.cells['4/4']) || []) : []))];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const RESTS = ['wr | q qr hr', 'hr hr | q qr hr', 'hr qr qr | q qr hr', 'qr qr hr | q qr hr', 'qr hr qr | q qr hr'];
  /** the card for a performance kind at this spot (blocks, recipes, creatures): {kind, …} for challenges.js */
  function spec(kind, x, y, n) {
    const t = tier(), baton = t >= 4;
    if (snare) {
      if (kind === 'tone' || kind === 'note' || kind === 'notes3') return {kind: 'count', n: kind === 'notes3' ? 4 : R.snareCount[0] + Math.floor(Math.random() * (R.snareCount[1] - R.snareCount[0] + 1)), sub: 'Count your hits'};
      if (kind === 'scale' || kind === 'rhythm') return {kind: 'rhythm', text: pick(RD_CELLS()), sub: 'Play the rhythm'};
      if (kind === 'sustain' || kind === 'longtone') return {kind: 'roll', secs: baton ? R.rollS * .7 : R.rollS, sub: 'An even roll'};
    }
    if (kind === 'tone' || kind === 'note' || kind === 'notes3') {
      const set = notesAt(x, y, n || (kind === 'notes3' ? 3 : 1));
      return Object.assign({kind: 'notes', sub: set.items.length > 1 ? 'Play the notes' : 'Play the note', hint: hintNow(set)}, set);
    }
    if (kind === 'scale') {
      const set = notesAt(x, y, n || 5, {order: 'order', pool: n === 8 ? 'Bb' : SCALES[Math.floor(Math.random() * SCALES.length)]});
      return Object.assign({kind: 'notes', sub: 'A scale, in order', hint: hintNow(set)}, set);
    }
    if (kind === 'sustain' || kind === 'longtone') {
      if (mode === 'touch') return {kind: 'key', member: readM, clef: inst.clef, sub: 'A music question'};
      const set = notesAt(x, y, 1);
      return Object.assign({kind: 'sustain', secs: kind === 'longtone' ? 4 : baton ? R.sustainBatonS : R.sustainS, sub: 'A long tone', hint: hintNow(set)}, set);
    }
    if (kind === 'rhythm') return {kind: 'rhythm', text: pick(RD_CELLS()), sub: 'Play the rhythm'};
    if (kind === 'rest') return {kind: 'rest', text: pick(RESTS), sub: 'Rests, then the downbeat'};
    if (kind === 'beats') return {kind: 'rhythm', text: 'q q q q', sub: '4 steady beats'};
    return {kind: 'notes', items: []};
  }
  /** a block's place on screen, as a function: the card beside it follows the camera (challenges.js follow) */
  function screenAt(x, y) { return () => ({x: (x + .5 - camX) * S, y: (y + .5 - camY) * S}); }
  function openCard(sp, at, title, onDone) {
    listenSync(true);
    const c = Card.open(Object.assign({mode, snare, title, at, onDone: r => { listenSync(); onDone(r); }, onCancel: () => listenSync()}, sp));
    if (!seen('mining')) firstCard('mining', 'Mining = playing!', mode === 'inst'
      ? (snare ? 'Music blocks need a performance: count your hits, play a rhythm or an even roll. Play it right and the block breaks, with double the loot!' : 'Music blocks need a performance: play the note on the card on your instrument. Play it right and the block breaks, with double the loot! Rhythm cards count in with a silent light.')
      : 'Music blocks need a performance: tap the note names on the card (or tap the rhythm). A wrong answer keeps the block: just try again!');
    return c;
  }
  function challengeFor(b, x, y) {
    const t = Math.min(4, tier()), n = (R.notes[b.mine] || [])[t];
    if (!n) { A.UI.toast(`${b.name} needs a better mallet.`, {ms: 1800}); return false; }
    const sp = spec(b.mine, x, y, b.mine === 'tone' || b.mine === 'scale' ? n : 0);
    openCard(sp, screenAt(x, y), b.name, r => {
      if (!G) return;
      if (r.ok) {
        G.wrong = 0;
        const n2 = (R.drops[b.mine] || 1) * (mode === 'inst' ? R.instrumentBonus : 1);
        if (BW.at(G.w, x, y) === b.id) breakBlock(x, y, b, n2);
        A.Sfx.event('bt-mined');
        if (b.mine === 'tone') { stats().ore++; saveGd(); if (stats().ore >= R.goals.toneOre) award('ore10'); drawGoals(); }
        if (b.key === 'sustain') award('sustain');
      } else { G.wrong++; A.Sfx.event('bt-wrong'); }
    });
    return true;
  }

  /* ================= CRAFTING = PERFORMING (the Measure) ================= */
  const slots = [null, null, null, null];
  let book = false;
  const match = () => { const s = slots.filter(Boolean); return RECIPES.find(r => r.in.length === s.length && r.in.every((k, i) => k === slots[i])) || null; };
  const usedOf = id => slots.filter(s => s === id).length;
  const benchNear = () => G.gear.bench.some(b => Math.hypot(b.x - G.p.x, b.y - G.p.y) <= R.benchRange);
  const PERF = {note: 'Play one note', notes3: 'Play three notes', beats: 'Play 4 steady beats', longtone: 'Play a 4-second long tone', scale: 'Play the Concert B♭ scale up'};
  const PERF_TOUCH = {note: 'Tap one note name', notes3: 'Tap three note names', beats: 'Tap 4 steady beats', longtone: 'Answer a key-signature question', scale: 'Tap the Concert B♭ scale\'s notes in order'};
  const PERF_SNARE = {note: 'Count your hits', notes3: 'Count your hits', beats: 'Play 4 steady beats', longtone: 'Play an even roll', scale: 'Play a rhythm'};
  function openCraft() {
    closePanels();
    $('craft').hidden = false; G.panel = 'craft';
    drawCraft();
    $('craftClose').focus();
  }
  function drawCraft() {
    const m = match(), f = gd().found || {};
    // THE MEASURE: a one-line staff, 4 slots between bar lines
    $('measure').innerHTML = `<div class="bt-bar"></div>` + slots.map((s, i) => `<button type="button" class="bt-slot${s ? ' full' : ''}" data-i="${i}" aria-label="${s ? 'Slot ' + (i + 1) + ': ' + esc(itemName(s)) + ' (tap to take it out)' : 'Slot ' + (i + 1) + ': empty'}">` +
      (s ? `<img src="${iconURL(s)}" alt=""><small>${esc(itemName(s))}</small>` : `<span class="beat">${i + 1}</span>`) + `</button>`).join('') + `<div class="bt-bar end"></div>`;
    $('measure').querySelectorAll('.bt-slot').forEach(b => b.onclick = () => { slots[+b.dataset.i] = null; const rest = slots.filter(Boolean); slots.fill(null); rest.forEach((x, k) => { slots[k] = x; }); A.Sfx.event('ui-toggle'); drawCraft(); });
    const perf = r => (snare ? PERF_SNARE : mode === 'inst' ? PERF : PERF_TOUCH)[r.perf];
    if (m) {
      const bench = !m.bench || benchNear();
      $('recipeLine').innerHTML = `<b>${esc(m.name)}${m.n > 1 ? ' × ' + m.n : ''}</b> <span>${esc(perf(m))}</span>` + (bench ? '' : `<em>Needs a Luthier's Bench nearby.</em>`);
      $('perform').disabled = !bench; $('perform').hidden = false;
      $('recipeLine').classList.add('on');
    } else {
      $('recipeLine').innerHTML = slots.some(Boolean) ? '<span>No recipe with these, in this order. The order matters, like notes in a measure!</span>' : '<span>Tap your items to put them in the measure, in order.</span>';
      $('perform').hidden = true; $('recipeLine').classList.remove('on');
    }
    const ids = Object.keys(G.p.inv).filter(k => G.p.inv[k] > 0 && ITEMS[k] && ITEMS[k].kind !== 'tool');
    $('craftItems').innerHTML = ids.length ? ids.map(k => { const left = G.p.inv[k] - usedOf(k);
      return `<button type="button" class="bt-chip" data-id="${k}" ${left > 0 ? '' : 'disabled'}><img src="${iconURL(k)}" alt=""><span>${esc(itemName(k))}</span><b>${left}</b></button>`; }).join('')
      : '<p class="ui-msg empty">Nothing yet: mine some blocks!</p>';
    $('craftItems').querySelectorAll('.bt-chip').forEach(b => b.onclick = () => { const k = slots.indexOf(null); if (k < 0) return; slots[k] = b.dataset.id; A.Sfx.event('ui-toggle'); drawCraft(); });
    // THE RECIPE BOOK
    $('bookBtn').setAttribute('aria-pressed', String(book));
    $('book').hidden = !book;
    const shown = r => f[r.id] || (window.BT_ALWAYS_SHOWN || []).includes(r.id);
    if (book) $('book').innerHTML = RECIPES.map(r => shown(r)
      ? `<button type="button" class="bt-rec" data-id="${r.id}"><b>${esc(r.name)}</b><span class="ins">${r.in.map(i => `<img src="${iconURL(i)}" alt="${esc(itemName(i))}" title="${esc(itemName(i))}">`).join('<i>›</i>')}</span><small>${esc(perf(r))}${r.bench ? ' · at a Luthier\'s Bench' : ''}</small></button>`
      : `<div class="bt-rec unknown" aria-label="A recipe you haven't found yet"><b>?</b><span class="ins">${r.in.map(() => '<span class="q">?</span>').join('<i>›</i>')}</span></div>`).join('');
    if (book) $('book').querySelectorAll('.bt-rec[data-id]').forEach(b => b.onclick = () => { const r = RECIPES.find(x => x.id === b.dataset.id); slots.fill(null); r.in.forEach((k, i) => { slots[i] = k; }); book = false; drawCraft(); });
    $('bookCount').textContent = `${Object.keys(f).filter(k => RECIPES.some(r => r.id === k)).length} / ${RECIPES.length}`;
  }
  $('bookBtn').onclick = () => { book = !book; drawCraft(); };
  $('craftClose').onclick = () => closePanels();
  $('perform').onclick = () => perform();
  function perform() {
    const r = match(); if (!r || (r.bench && !benchNear())) return;
    const need = {}; r.in.forEach(i => { need[i] = (need[i] || 0) + 1; });
    if (!Object.keys(need).every(k => have(k, need[k]))) { A.UI.toast('You don\'t have enough of those.'); return; }
    const rect = $('perform').getBoundingClientRect(), p = G.p;
    const sp = spec(r.perf === 'longtone' ? 'longtone' : r.perf === 'beats' ? 'beats' : r.perf === 'scale' ? 'scale' : r.perf, Math.floor(p.x), Math.floor(p.y - 1), r.perf === 'scale' ? 8 : 0);
    openCard(sp, {x: rect.left + rect.width / 2, y: rect.top - 40}, 'Perform: ' + r.name, res => {
      if (!G) return;
      if (!res.ok) { A.Sfx.event('bt-wrong'); A.UI.toast('Not quite: your ingredients are safe. Try again!'); return; }
      Object.keys(need).forEach(k => take(k, need[k]));
      gain(r.out, r.n);
      slots.fill(null);
      A.Sfx.event('bt-craft');
      A.UI.toast(`You made ${r.n > 1 ? r.n + ' × ' : ''}${r.name}!`);
      if (r.out === 'mallet1') award('mallet');
      if (r.out === 'metronome') award('metro');
      if (r.out === 'tuner') award('tuner');
      if (r.out === 'baton') award('baton');
      if (G.panel === 'craft') drawCraft();
    });
  }

  /* ================= THE INVENTORY, THE HOTBAR, A BAND LOCKER ================= */
  function drawHot() {
    if (!G) return;
    const p = G.p;
    $('hotbar').innerHTML = p.hot.map((id, i) => `<button type="button" class="bt-hot${i === p.sel ? ' sel' : ''}" data-i="${i}" aria-pressed="${i === p.sel}" aria-label="${id ? esc(itemName(id)) + ' × ' + (p.inv[id] || 0) : 'Empty slot'} (${i + 1})">` +
      (id ? `<img src="${iconURL(id)}" alt=""><b>${p.inv[id] || 0}</b>` : '') + `<small>${i + 1}</small></button>`).join('');
    $('hotbar').querySelectorAll('.bt-hot').forEach(b => b.onclick = () => selectHot(+b.dataset.i));
    const t = tier();
    $('toolName').textContent = R.tools[t];
    $('toolIcon').innerHTML = t ? `<img src="${iconURL(['', 'mallet1', 'mallet2', 'mallet3', 'baton'][t])}" alt="">` : '';
    if (G.panel === 'inv') drawInv();
  }
  function selectHot(i) {
    const p = G.p;
    if (p.sel === i && p.hot[i] === 'snack') { eat(); return; }
    p.sel = i; drawHot();
    if (p.hot[i] && ITEMS[p.hot[i]] && ITEMS[p.hot[i]].block && !G.build) setBuild(true);
  }
  function openInv() { closePanels(); $('inv').hidden = false; G.panel = 'inv'; drawInv(); $('invClose').focus(); }
  function drawInv(locker) {
    const inv = G.p.inv, ids = Object.keys(inv).filter(k => inv[k] > 0);
    $('invTitle').textContent = locker ? 'Band Locker' : 'Inventory';
    $('invTool').textContent = `Your tool: ${R.tools[tier()]}`;
    $('invGrid').innerHTML = ids.length ? ids.map(k => `<button type="button" class="bt-chip" data-id="${k}"><img src="${iconURL(k)}" alt=""><span>${esc(itemName(k))}</span><b>${inv[k]}</b></button>`).join('') : '<p class="ui-msg empty">Nothing yet.</p>';
    $('invHint').textContent = locker ? 'Tap your items to store them, and the locker\'s items to take them.' : `Tap an item to put it in hotbar slot ${G.p.sel + 1}.${have('snack') ? ' Tap a Snack Bag twice to eat it.' : ''}`;
    $('invGrid').querySelectorAll('.bt-chip').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (locker) { const L = lockerOf(locker), n = inv[id]; if (Object.keys(L).length >= R.lockerSlots && !L[id]) { A.UI.toast('The locker is full.'); return; } take(id, n); L[id] = (L[id] || 0) + n; drawInv(locker); return; }
      if (id === 'snack' && G.p.hot[G.p.sel] === 'snack') { eat(); drawInv(); return; }
      if (ITEMS[id] && ITEMS[id].kind === 'tool') return;
      const k = G.p.hot.indexOf(id); if (k >= 0) G.p.hot[k] = null;
      G.p.hot[G.p.sel] = id; drawHot(); drawInv();
    });
    $('lockerBox').hidden = !locker;
    if (locker) {
      const L = lockerOf(locker), ks = Object.keys(L);
      $('lockerGrid').innerHTML = Array.from({length: R.lockerSlots}, (_, i) => ks[i] ? `<button type="button" class="bt-chip" data-id="${ks[i]}"><img src="${iconURL(ks[i])}" alt=""><span>${esc(itemName(ks[i]))}</span><b>${L[ks[i]]}</b></button>` : '<span class="bt-empty"></span>').join('');
      $('lockerGrid').querySelectorAll('.bt-chip').forEach(b => b.onclick = () => { const id = b.dataset.id; gain(id, L[id]); delete L[id]; drawInv(locker); });
    }
  }
  const lockerOf = key => { const w = G.w; w.lockers = w.lockers || {}; return w.lockers[key] || (w.lockers[key] = {}); };
  function openLocker(x, y) { closePanels(); $('inv').hidden = false; G.panel = 'inv'; drawInv(x + ',' + y); $('invClose').focus(); return true; }
  $('invClose').onclick = () => closePanels();
  function panelOpen() { return !!(G && G.panel); }
  function closePanels() {
    ['inv', 'craft', 'composer'].forEach(id => { $(id).hidden = true; });
    if (G) { G.panel = null; if (G.w) G.w.dirty = true; }
  }

  /* ================= COMPOSER BLOCKS AND THE CONDUCTOR'S PODIUM ================= */
  const chrom = () => A.chromaticScale(snare ? A.memberById('bells') : readM);
  const noteOf = midi => { const c = chrom(); return c.find(n => n.midi === midi) || c[0]; };
  const itemOf = n => ({n, show: n, label: Card.label(n), midi: n.midi, sounding: n.sounding, pc: mod(n.sounding, 12)});
  function openComposer(x, y) {
    closePanels(); $('composer').hidden = false; G.panel = 'composer';
    const m = G.w.meta[x + ',' + y] || (G.w.meta[x + ',' + y] = {pitch: defaultPitch()});
    const draw = () => {
      const n = noteOf(m.pitch);
      $('compTitle').textContent = 'Composer Block';
      $('compStaff').innerHTML = A.staffSVG(snare ? 'treble' : inst.clef, [{n, x: 200, caption: Card.label(n) + n.oct}], {width: 300, captions: true, label: 'This block\'s note'});
      $('compActs').innerHTML = `<button type="button" class="btn btn-secondary" data-d="-1">▼ Lower</button><button type="button" class="btn btn-secondary" data-d="1">▲ Higher</button>`;
      $('compActs').querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const c = chrom(), k = c.findIndex(q => q.midi === m.pitch); const nk = Math.max(0, Math.min(c.length - 1, (k < 0 ? 0 : k) + +b.dataset.d)); m.pitch = c[nk].midi; delete m.powered; G.w.dirty = true; draw(); });
      $('compSay').textContent = 'Pick this block\'s note. A row of Composer Blocks with a Conductor\'s Podium at its end is a melody!';
      $('compPlay').hidden = true;
    };
    draw();
    $('compDone').focus();
    return true;
  }
  /** a podium's row: the Composer Blocks in a line right beside it (left or right), in order away from it */
  function rowOf(x, y) {
    for (const d of [-1, 1]) {
      const out = [];
      for (let k = 1; k <= R.composerMax; k++) { if (BW.at(G.w, x + d * k, y) !== ID.composer) break; out.push(x + d * k); }
      if (out.length) return d < 0 ? out.reverse() : out;
    }
    return [];
  }
  function openPodium(x, y) {
    const xs = rowOf(x, y);
    if (!xs.length) { A.UI.toast('Put Composer Blocks in a row right beside the podium.', {ms: 2400}); return true; }
    closePanels(); $('composer').hidden = false; G.panel = 'composer';
    const items = xs.map(cx => itemOf(noteOf((G.w.meta[cx + ',' + y] || {}).pitch || defaultPitch())));
    $('compTitle').textContent = `Your melody (${items.length} ${items.length === 1 ? 'note' : 'notes'})`;
    const W = Math.max(300, 110 + items.length * 46);
    $('compStaff').innerHTML = A.staffSVG(snare ? 'treble' : inst.clef, items.map((it, k) => ({n: it.show, x: 90 + k * 46, caption: it.label})), {width: W, captions: true, label: 'Your melody'});
    $('compSay').textContent = mode === 'inst' ? (snare ? 'Play one steady hit for each note to power the row!' : 'Play your melody on your instrument to power the row!') : 'Tap your melody\'s note names in order to power the row!';
    $('compActs').innerHTML = `<button type="button" class="btn btn-primary" id="compPerf">Perform</button>`;
    $('compPlay').hidden = false; $('compPlay').disabled = A.Pitch.listening();
    $('compPlay').onclick = () => {                                     // play it back (Sfx.piano: never while listening)
      if (A.Pitch.listening()) return;
      items.forEach((it, k) => setTimeout(() => { if (!A.Pitch.listening()) A.Sfx.piano(it.sounding); }, k * 420));
    };
    $('compPerf').onclick = () => {
      const rect = $('compPerf').getBoundingClientRect();
      const sp = snare ? {kind: 'rhythm', text: Array.from({length: Math.ceil(items.length / 4) * 4}, (_, k) => k < items.length ? 'q' : 'qr').join(' ').replace(/((?:\S+ ){3}\S+) /g, '$1 | '), sub: 'One hit per note'}
        : {kind: 'notes', items, clef: inst.clef, fit: items.map(i => i.show), sig: null, sub: 'Your melody'};
      closePanels();
      openCard(sp, {x: rect.left + rect.width / 2, y: rect.top - 60}, 'Conductor\'s Podium', r => {
        if (!G || !r.ok) { if (G) A.Sfx.event('bt-wrong'); return; }
        xs.forEach(cx => { const m = G.w.meta[cx + ',' + y] || (G.w.meta[cx + ',' + y] = {pitch: defaultPitch()}); m.powered = true; });
        // wired doors: every door this close to the row or the podium opens
        const all = xs.concat([x]);
        for (const cx of all) for (let dx = -R.doorWire; dx <= R.doorWire; dx++) for (let dy = -R.doorWire; dy <= R.doorWire; dy++) if (BW.at(G.w, cx + dx, y + dy) === ID.door) BW.put(G.w, cx + dx, y + dy, ID.doorOpen);
        G.w.dirty = true;
        A.Sfx.event('bt-powered');
        A.UI.toast('The row is powered! It lights up and opens the door beside it.');
        if (items.length >= R.goals.row) award('row8');
      });
    };
    $('compDone').focus();
    return true;
  }
  $('compDone').onclick = () => closePanels();

  /* ================= THE PRACTICE COT: sleep through the night ================= */
  function sleep(x, y) {
    G.w.cot = {x, y};
    const near = G.creatures.some(c => c.state === 'live' && Math.hypot(c.x - G.p.x, c.y - G.p.y) < R.cotSafe);
    if (!isNight()) { A.UI.toast('Your cot is set: you\'ll wake up here. You can sleep here at night.', {ms: 2600}); saveWorld(); return true; }
    if (near) { A.UI.toast('You can\'t sleep: a creature is near!', {ms: 2000}); return true; }
    G.w.time += (DAY() + NIGHT()) - inCycle() + 1;                       // morning
    G.creatures = [];
    A.UI.toast('Good morning! You slept through the night.', {ms: 2400});
    saveWorld();
    return true;
  }
  function nightFalls() {
    G.w.nights++; G.died = false; G.cycleCount = {};
    A.Sfx.event('bt-night');
    if (!seen('night')) firstCard('night', 'Night is falling!', 'Creatures come out in the dark: Night Clams, Sour Wisps and, later, Rushers. They\'re silly, not scary: calm them with your music! Stage Lamps keep them away, and nothing appears inside a closed room with a door.');
  }
  function dawn() {
    if (!G.died) {
      G.w.survived = (G.w.survived || 0) + 1;
      if (!G.endless) award('night');
      else A.Endless.flash($('edFlash'), `NIGHT ${G.w.survived} SURVIVED!`);
    }
    A.Sfx.event('bt-dawn');
    drawHud();
  }

  /* ================= LIGHT AND GEAR (lamps, metronomes, tuners, benches) ================= */
  function scanGear() {
    const w = G.w, L = [], gear = {metronome: [], tuner: [], bench: []};
    for (let i = 0; i < w.b.length; i++) {
      const v = w.b[i]; if (v < ID.lamp) continue;
      const x = i % w.w, y = Math.floor(i / w.w);
      if (v === ID.lamp) L.push({x: x + .5, y: y + .5});
      else if (v === ID.metronome) gear.metronome.push({x: x + .5, y: y + .5});
      else if (v === ID.tuner) gear.tuner.push({x: x + .5, y: y + .5});
      else if (v === ID.bench) gear.bench.push({x: x + .5, y: y + 1});
    }
    G.lamps = L; G.gear = gear;
  }
  const lightHere = (x, y) => BW.light(G.w, Math.floor(x), Math.floor(y), skyLight(), G.lamps, R);

  /* ================= ROOMS: a shelter with a door (chapter 1), the Band Hall (chapter 5) ================= */
  function checkRooms(x, y) {
    if (G.endless) return;
    const tried = new Set();
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, -2], [1, -1], [-1, -1]]) {
      const rm = BW.room(G.w, x + dx, y + dy, R);
      if (!rm) continue;
      const k = rm.tiles.map(t => t.join(',')).sort()[0]; if (tried.has(k)) continue; tried.add(k);
      if (rm.doors.length && rm.tiles.length >= R.room.minTiles) award('shelter');
      if (isBandHall(rm)) award('hall');
    }
  }
  function isBandHall(rm) {
    const H = R.bandHall, w = G.w;
    if (!rm.doors.length || rm.tiles.length < H.minTiles) return false;
    const inside = rm.tiles.map(([x, y]) => BW.at(w, x, y));
    if (!inside.includes(ID.lamp) || !inside.includes(ID.stand)) return false;
    const walls = rm.walls.map(([x, y]) => BW.at(w, x, y));
    const stage = rm.walls.filter(([x, y]) => BW.at(w, x, y) === ID.stage && rm.tiles.some(([tx, ty]) => tx === x && ty === y - 1)).length;
    if (stage < H.stageMin) return false;
    const counted = walls.filter(v => !B[v].door && v !== ID.glass && v !== ID.stage);
    return counted.length > 0 && counted.filter(v => v === ID.brick).length / counted.length >= H.brickShare - 1e-9;
  }

  /* ================= CREATURES (original and silly: never scary) ================= */
  const KINDS = {clam: 'Night Clam', wisp: 'Sour Wisp', rusher: 'Rusher'};
  let cid = 0;
  function trySpawn() {
    const w = G.w, p = G.p, sky = skyLight();
    const surfaceDark = sky < R.light.dark;
    const kinds = ['clam', 'wisp'].concat(w.nights >= R.spawn.rushersFrom ? ['rusher'] : []);
    for (let tries = 0; tries < 6; tries++) {
      const dx = (R.spawn.safe + Math.random() * (R.spawn.range - R.spawn.safe)) * (Math.random() < .5 ? -1 : 1);
      const x = Math.floor(p.x + dx); if (x < 1 || x >= w.w - 1) continue;
      const y = Math.floor(p.y - 6 + Math.random() * 12);
      if (Math.hypot(x - p.x, y - p.y) < R.spawn.safe) continue;
      const cave = y > BW.top(w, x) + R.light.caveDepth;
      if (!cave && !surfaceDark) continue;                                   // creatures only come out in the dark
      const kind = cave ? (Math.random() < R.spawn.cave.clam ? 'clam' : 'wisp') : kinds[Math.floor(Math.random() * kinds.length)];
      const cc = G.cycleCount;
      if ((cc[kind] || 0) >= R.spawn.perNight[kind]) continue;
      if (G.creatures.filter(c => c.kind === kind && c.state === 'live').length >= R.spawn.atOnce[kind]) continue;
      if (!canSpawnAt(x, y, kind)) continue;
      spawn(kind, x + .5, kind === 'wisp' ? y + .5 : y + 1);
      return true;
    }
    return false;
  }
  /** nowhere lit, nowhere solid, never inside a closed room with a door (and a clam or a rusher stands on something) */
  function canSpawnAt(x, y, kind) {
    const w = G.w, v = BW.at(w, x, y);
    if (B[v].solid || v === ID.water || B[BW.at(w, x, y - 1)].solid) return false;
    if (kind !== 'wisp' && !B[BW.at(w, x, y + 1)].solid) return false;
    if (BW.light(w, x, y, skyLight(), G.lamps, R) >= R.light.dark) return false;
    const rm = BW.room(w, x, y, R);
    if (rm && rm.doors.length) return false;
    return true;
  }
  function spawn(kind, x, y) {
    const c = {id: ++cid, kind, x, y, vx: 0, vy: 0, t: 0, state: 'live', hopT: Math.random(), drainT: 0, alpha: 1, ground: false};
    if (snare) c.n = R.snareCount[0] + Math.floor(Math.random() * (R.snareCount[1] - R.snareCount[0] + 1));
    else if (kind === 'clam') { const set = notesAt(Math.floor(x), Math.floor(y), 1); c.item = set.items[0]; c.set = set; }
    // THE FAIRNESS CHECK: slowed until its challenge fits the time it needs to reach you
    const need = kind === 'rusher' ? rusherNeed() : R.fair.cardS[kind];
    const dist = Math.max(1, Math.hypot(x - G.p.x, y - G.p.y)), base = kind === 'clam' ? R.clam.hopX / R.clam.hopS : kind === 'wisp' ? R.wisp.speed : R.rusher.speed;
    const fromDist = kind === 'rusher' ? R.rusher.alert : dist;
    c.mul = Math.min(1, fromDist / base / (need * R.fair.margin));
    G.creatures.push(c);
    G.cycleCount[kind] = (G.cycleCount[kind] || 0) + 1;
    return c;
  }
  const rusherNeed = () => { const b = 60 / R.rhythm.bpm; return R.rhythm.leadS + (R.rusher.beats * 2) * b + R.rhythm.lateMs / 1000; };
  function speedMul(c) {
    let m = c.mul;
    if (G.gear.metronome.some(g => Math.hypot(g.x - c.x, g.y - c.y) <= R.metronomeRadius)) m *= R.metronomeSlow;
    return m;
  }
  function stepCreatures(dt) {
    const p = G.p, day = skyLight() >= R.light.dark;
    for (const c of G.creatures) {
      c.t += dt;
      if (c.state !== 'live') { c.alpha -= dt * 1.5; continue; }
      const dx = p.x - c.x, dy = (p.y - .9) - (c.y - .4), d = Math.hypot(dx, dy);
      // daylight above ground: creatures fade away (never a burst: a slow fade)
      if (day && c.y <= BW.top(G.w, Math.floor(c.x)) + 2) { c.state = 'gone'; continue; }
      if (d > R.spawn.despawnFar) { c.state = 'gone'; continue; }
      const m = speedMul(c);
      if (c.kind === 'clam') {
        c.vy = Math.min(R.player.maxFall, c.vy + R.player.gravity * dt);
        c.hopT -= dt * m;
        if (c.ground && c.hopT <= 0 && d < R.clam.see) { c.hopT = R.clam.hopS; c.vy = -R.clam.hopY * Math.min(1, .6 + m * .4); c.vx = Math.sign(dx) * R.clam.hopX / R.clam.hopS * 1.6 * m; }
        if (c.ground && c.hopT > 0) c.vx *= .8;
        moveBody(c, dt, .38, .8, false);
        if (touches(c)) hurt(1, c);
      } else if (c.kind === 'wisp') {
        let vx = 0, vy = 0;
        if (d < R.wisp.see) { vx = dx / d * R.wisp.speed * m; vy = dy / d * R.wisp.speed * m; }
        vy += RM.matches ? 0 : Math.sin(c.t * 2.2) * .4;
        let nx = c.x + vx * dt, ny = c.y + vy * dt;
        for (const t of G.gear.tuner) { const td = Math.hypot(nx - t.x, ny - t.y); if (td < R.tunerRadius) { nx = t.x + (nx - t.x) / td * R.tunerRadius; ny = t.y + (ny - t.y) / td * R.tunerRadius; } }
        if (!solid(nx, ny)) { c.x = nx; c.y = ny; } else if (!solid(nx, c.y)) c.x = nx; else if (!solid(c.x, ny)) c.y = ny;   // slides along walls
        if (d < R.wisp.drain) { c.drainT += dt; if (c.drainT >= R.wispDrainS) { c.drainT = 0; hurt(.5, c, true); } } else c.drainT = 0;
      } else if (c.kind === 'rusher') {
        c.vy = Math.min(R.player.maxFall, c.vy + R.player.gravity * dt);
        c.cool = Math.max(0, (c.cool || 0) - dt);
        const charging = d < R.rusher.alert && !c.cool;
        c.vx = charging ? Math.sign(dx) * R.rusher.speed * m : c.cool ? -Math.sign(dx) * 2 : Math.sin(c.t) * 1.2;
        if (charging && !c.alerted) { c.alerted = true; if (!Card.current && !panelOpen()) creatureCard(c); }
        if (!charging) c.alerted = false;
        moveBody(c, dt, .4, .9, true);
        if (c.ground && c.vx && collides(c.x + Math.sign(c.vx) * .5, c.y, .4, .9)) c.vy = -R.player.jump * .8;
        if (touches(c)) { hurt(1, c); c.cool = R.rusher.cooldownS; }
      }
      if (!seen('c-' + c.kind) && d < 14 && !G.held && !Card.current) creatureIntro(c.kind);
    }
    G.creatures = G.creatures.filter(c => c.state === 'live' || c.alpha > 0);
    passiveListen(dt);
  }
  const touches = c => Math.abs(c.x - G.p.x) < .7 && c.y > G.p.y - PH - .2 && c.y - .8 < G.p.y;
  function hurt(n, c, drain) {
    const p = G.p;
    if (!drain && p.hurtT > 0) return;
    if (!drain) { p.hurtT = R.player.hurtCooldownS; p.vx = 0; p.vy = -6; p.x += Math.sign(p.x - (c ? c.x : p.x)) * .6; }
    p.hearts = Math.max(0, p.hearts - n);
    A.Sfx.event('bt-hurt');
    drawHud();
    if (p.hearts <= 0) outOfBreath();
  }
  /** ALL HEARTS LOST: Survival Nights ends; the world keeps going (respawn at the cot, a bag with a share of the materials) */
  function outOfBreath() {
    const p = G.p;
    if (G.endless) return survivalOver();
    G.died = true;
    const bag = {x: p.x, y: p.y - .6, items: {}};
    Object.keys(p.inv).forEach(k => { const it = ITEMS[k]; if (!it || it.kind === 'tool' || it.kind === 'use') return; const n = Math.floor(p.inv[k] * R.dropShare); if (n > 0) { bag.items[k] = n; take(k, n); } });
    if (Object.keys(bag.items).length) G.w.bags.push(bag);
    const cot = G.w.cot && BW.at(G.w, G.w.cot.x, G.w.cot.y) === ID.cot ? G.w.cot : null;
    p.x = cot ? cot.x + .5 : G.w.spawn.x + .5; p.y = cot ? cot.y + 1 : G.w.spawn.y + 1; p.vx = p.vy = 0;
    p.hearts = maxHearts(); p.hurtT = R.player.hurtCooldownS;
    G.creatures.forEach(c => { if (Math.hypot(c.x - p.x, c.y - p.y) < R.spawn.safe) c.state = 'gone'; });
    Card.close();
    A.Sfx.event('bt-respawn');
    A.UI.toast(`Out of breath! You're back at your ${cot ? 'cot' : 'starting spot'}. Your bag is where you fell.`, {ms: 3600});
    drawHot(); drawHud(); saveWorld();
  }
  /** INSTRUMENT mode, no card: a note that matches a nearby clam's bubble calms it; a steady in-tune note dispels a wisp */
  function heardNote(pc) {
    if (!G || mode !== 'inst' || snare || Card.current || G.held || pause.paused) return;
    const c = G.creatures.filter(k => k.state === 'live' && k.kind === 'clam' && k.item && k.item.pc === pc && Math.hypot(k.x - G.p.x, k.y - G.p.y) <= R.clam.calm)
      .sort((a, b) => Math.hypot(a.x - G.p.x, a.y - G.p.y) - Math.hypot(b.x - G.p.x, b.y - G.p.y))[0];
    if (c) calm(c);
  }
  A.Pitch.onHeld(pc => heardNote(pc));
  A.Pitch.onFrame((r, level, now) => {
    if (!G || mode !== 'inst' || snare || Card.current || G.held || pause.paused) { if (G) G.wispHold = 0; return; }
    const near = G.creatures.find(k => k.state === 'live' && k.kind === 'wisp' && Math.hypot(k.x - G.p.x, k.y - G.p.y) <= R.wisp.listen);
    if (!near || !r) { G.wispHold = 0; return; }
    const cents = (r.midi - Math.round(r.midi)) * 100;
    if (Math.abs(cents) <= R.wisp.cents) { G.wispHold += 40; if (G.wispHold >= R.wisp.holdS * 1000) { G.wispHold = 0; calm(near); } } else G.wispHold = 0;
  });
  function passiveListen() { /* (the onHeld / onFrame listeners above do the work while listenSync keeps the mic on) */ }
  function creatureCard(c) {
    if (Card.current || G.held) return;
    const at = () => ({x: (c.x - camX) * S, y: (c.y - .5 - camY) * S});
    let sp;
    if (c.kind === 'clam') sp = snare ? {kind: 'count', n: c.n, sub: 'Count your hits'} : Object.assign({}, c.set, {kind: 'notes', items: [c.item], sub: 'Play its note to calm it', hint: G.wrong >= R.hintAfterWrong});
    else if (c.kind === 'wisp') sp = spec('sustain', Math.floor(c.x), Math.floor(c.y));
    else sp = {kind: 'rhythm', time: '2/4', text: pick(R.rusher.cells || ['q q', 'e e q', 'q e e', 'h']), sub: 'Match the rhythm before it arrives!'};
    openCard(sp, at, KINDS[c.kind], r => { if (!G) return; if (r.ok && c.state === 'live') { G.wrong = 0; calm(c); } else if (!r.ok) G.wrong++; });
  }
  function calm(c) {
    if (c.state !== 'live') return;
    c.state = 'calm';
    const drop = {clam: 'pearl', wisp: 'dust', rusher: 'spring'}[c.kind];
    gain(drop, mode === 'inst' ? R.instrumentBonus : 1);
    A.Sfx.event('bt-calm');
    G.calmed++;
    if (!G.endless) {
      if (c.kind === 'clam') { stats().clams++; saveGd(); if (stats().clams >= R.goals.clams) award('clams'); }
      if (c.kind === 'wisp') { stats().wisps++; saveGd(); if (stats().wisps >= R.goals.wisps) award('wisps'); }
      drawGoals();
    }
    A.UI.toast({clam: 'The Night Clam is calm! It left a Pearl.', wisp: 'The Sour Wisp is in tune now! It left Pitch Dust.', rusher: 'The Rusher found the beat! It left a Valve Spring.'}[c.kind], {ms: 1800});
  }
  function creatureIntro(kind) {
    const T = {clam: ['A Night Clam!', snare ? 'Night Clams hop toward you. Tap one and play the number of hits in its bubble to calm it.' : mode === 'inst' ? 'Night Clams hop toward you with a note in their bubble. Play that note to calm them (or tap one for its card)!' : 'Night Clams hop toward you with a note in their bubble. Tap one and tap its note name to calm it!'],
      wisp: ['A Sour Wisp!', snare ? 'Sour Wisps drain your hearts when they get close. Tap one and play an even roll to dispel it.' : mode === 'inst' ? 'Sour Wisps are out of tune and drain your hearts when they get close. Hold any steady, in-tune note near one to dispel it!' : 'Sour Wisps drain your hearts when they get close. Tap one and answer its music question to dispel it!'],
      rusher: ['A Rusher!', 'Rushers are fast little metronome gremlins. When one charges, match its 2-beat rhythm before it arrives!']}[kind];
    firstCard('c-' + kind, T[0], T[1]);
  }

  /* ================= DRAWING CREATURES (canvas, theme colors) ================= */
  function drawCreature(c, x, y, now) {
    ctx.globalAlpha = Math.max(0, Math.min(1, c.alpha));
    const s = S;
    if (c.kind === 'clam') {
      const open = c.state === 'calm' ? .5 : .15 + (RM.matches ? 0 : Math.abs(Math.sin(c.t * 3)) * .15);
      ctx.fillStyle = col('bt-clam'); ctx.beginPath(); ctx.ellipse(x, y - s * .25, s * .45, s * .25, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y - s * .3, s * .45, s * .28, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col('bt-clam-2'); ctx.lineWidth = s * .05; ctx.beginPath(); ctx.moveTo(x - s * .1, y - s * .55); ctx.lineTo(x, y - s * .38); ctx.lineTo(x - s * .05, y - s * .3); ctx.stroke();  // the crack
      ctx.fillStyle = col('bt-ink'); [-.15, .15].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s, y - s * (.36 + open * .2), s * .05, 0, 7); ctx.fill(); });
    } else if (c.kind === 'wisp') {
      const wob = RM.matches ? 0 : Math.sin(c.t * 5) * s * .06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * .7);
      g.addColorStop(0, col(c.state === 'calm' ? 'bt-rhythm' : 'bt-wisp')); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * .7, 0, 7); ctx.fill();
      ctx.fillStyle = col('bt-ink'); ctx.beginPath(); ctx.arc(x - s * .12 + wob, y - s * .05, s * .05, 0, 7); ctx.arc(x + s * .14 - wob, y - s * .08, s * .05, 0, 7); ctx.fill();
      ctx.strokeStyle = col('bt-ink'); ctx.lineWidth = s * .04; ctx.beginPath(); ctx.moveTo(x - s * .12, y + s * .12); ctx.quadraticCurveTo(x, y + (c.state === 'calm' ? .22 : .04) * s, x + s * .12, y + s * .12); ctx.stroke();
    } else {
      const sw = RM.matches ? 0 : Math.sin(c.t * 9) * .5;
      ctx.fillStyle = col('bt-rusher'); ctx.beginPath(); ctx.moveTo(x - s * .35, y); ctx.lineTo(x - s * .15, y - s * .85); ctx.lineTo(x + s * .15, y - s * .85); ctx.lineTo(x + s * .35, y); ctx.fill();
      ctx.strokeStyle = col('bt-brass'); ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(x, y - s * .15); ctx.lineTo(x + Math.sin(sw) * s * .3, y - s * .75); ctx.stroke();
      ctx.fillStyle = col('bt-ink'); [-.1, .1].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s, y - s * .5, s * .045, 0, 7); ctx.fill(); });
    }
    ctx.globalAlpha = 1;
  }
  /** the note bubble over a clam (a tiny staff), a count for the snare, "tap me" / "hold a note" for wisps */
  function drawBubble(c, x, y) {
    if (c.state !== 'live' || c.kind === 'rusher') return;
    const s = S, big = c.kind === 'clam' && !snare, bw = s * (big ? 2.8 : 2.2), bh = s * (big ? 2.1 : 1.5), bx = x - bw / 2, by = y - s * (c.kind === 'wisp' ? 2.3 : big ? 3 : 2.4);
    oc.fillStyle = col('bt-bubble'); oc.strokeStyle = col('bt-ink'); oc.lineWidth = 1.5;
    oc.beginPath(); oc.roundRect ? oc.roundRect(bx, by, bw, bh, s * .3) : oc.rect(bx, by, bw, bh); oc.fill(); oc.stroke();
    oc.beginPath(); oc.moveTo(x - s * .15, by + bh); oc.lineTo(x, by + bh + s * .25); oc.lineTo(x + s * .15, by + bh); oc.fill();
    oc.fillStyle = col('bt-ink'); oc.textAlign = 'center'; oc.textBaseline = 'middle';
    if (c.kind === 'wisp' || snare) {
      oc.font = `700 ${Math.round(s * .38)}px ${getComputedStyle(document.body).fontFamily}`;
      oc.fillText(snare && c.kind === 'clam' ? `× ${c.n}` : mode === 'inst' && !snare ? 'Hold a note!' : 'Tap me!', x, by + bh / 2);
      return;
    }
    // a one-note staff: lines 16 units apart in the ui.js staff (y 56–120), scaled into the bubble
    const k = bh / 150, top = by + bh / 2 - 88 * k, lx0 = bx + s * .2, lx1 = bx + bw - s * .2, cl = c.set ? c.set.clef : inst.clef;
    oc.save(); oc.beginPath(); oc.rect(bx, by, bw, bh); oc.clip();
    oc.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const ly = top + (56 + i * 16) * k; oc.beginPath(); oc.moveTo(lx0, ly); oc.lineTo(lx1, ly); oc.stroke(); }
    oc.font = `${Math.round(62 * k)}px "GN Music","Noto Music",serif`; oc.textAlign = 'left'; oc.textBaseline = 'alphabetic';
    oc.fillText(cl === 'treble' ? '𝄞' : '𝄢', lx0 + 2, top + (cl === 'treble' ? 119 : 111) * k);
    const n = c.item.show, ny = top + A.noteY(cl, n) * k, nx = bx + bw * .66;
    for (let ly = 136; ly <= A.noteY(cl, n); ly += 16) { oc.beginPath(); oc.moveTo(nx - 15 * k, top + ly * k); oc.lineTo(nx + 15 * k, top + ly * k); oc.stroke(); }
    for (let ly = 40; ly >= A.noteY(cl, n); ly -= 16) { oc.beginPath(); oc.moveTo(nx - 15 * k, top + ly * k); oc.lineTo(nx + 15 * k, top + ly * k); oc.stroke(); }
    if (n.acc) { oc.font = `${Math.round(54 * k)}px "GN Music","Noto Music",serif`; oc.fillText(n.acc < 0 ? '♭' : '♯', nx - 31 * k, ny + 6 * k); }
    oc.beginPath(); oc.ellipse(nx, ny, 9 * k, 6.6 * k, -.35, 0, 7); oc.fill();
    if (G.wrong >= R.hintAfterWrong || (c.set && c.set.other && (gd().otherClef || 0) < R.otherClefNames)) {
      oc.font = `700 ${Math.round(s * .3)}px ${getComputedStyle(document.body).fontFamily}`; oc.textAlign = 'center'; oc.fillText(c.item.label, x, by + bh - s * .12);
    }
    oc.restore();
  }

  /* ================= THE MICROPHONE: listening only when something needs it ================= */
  function listenSync(forCard) {
    if (!G) return;
    const near = mode === 'inst' && !snare && G.creatures.some(c => c.state === 'live' && c.kind !== 'rusher' && Math.hypot(c.x - G.p.x, c.y - G.p.y) <= Math.max(R.clam.listen, R.wisp.listen));
    const want = mode === 'inst' && !pause.paused && !G.held && (forCard || !!Card.current || near);
    if (want === G.listen) return;
    G.listen = want;
    A.Pitch.pauseListening(!want);
    if (want) A.Pitch.ignoreCurrent();
    A.Sfx.sync();
  }

  /* ================= MILESTONES = STARS ================= */
  function award(id) {
    if (!G || G.endless || A.DEMO && A.params.has('nostars')) return;
    const all = gd().ms || (gd().ms = {}), mine = all[who] || (all[who] = {});
    if (mine[id]) return;
    const d = A.store.today ? A.store.today() : new Date(), p2 = n => String(n).padStart(2, '0');
    mine[id] = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    saveGd();
    const ci = CHAPTERS.findIndex(c => c.goals.some(g => g.id === id)), ch = CHAPTERS[ci], later = ci > curCh();
    const stars = ch.goals.filter(g => mine[g.id]).length, prev = A.store.level(GAME_ID, who, ci + 1);
    A.store.setLevel(GAME_ID, who, ci + 1, {stars: Math.max(stars, prev.stars || 0), best: Math.max(stars, prev.best || 0)}, stars);
    const g = ch.goals.find(x => x.id === id);
    A.Sfx.event('bt-milestone');
    // a later chapter's milestone done early still counts: it says so
    A.UI.toast(later ? `★ Bonus milestone (Chapter ${ci + 1}): ${g.text}!` : `★ Milestone: ${g.text}!`, {ms: 2600});
    drawGoals();
    if (stars >= 3) setTimeout(checkReached, 700);
  }
  /** shows the "complete!" results of the first finished chapter the player has REACHED and not seen yet */
  function checkReached() {
    if (!G || G.endless || G.resultsUp) return;
    const s = shownCh(), ci = CHAPTERS.findIndex((c, k) => chDone(k) && reached(k) && !s[k]);
    if (ci < 0) return;
    s[ci] = 1; saveGd();
    chapterDone(ci);
  }
  function chapterDone(ci) {
    if (!G || G.endless) return;
    saveWorld();
    G.held++; G.resultsUp = true;
    Card.close(); closePanels();
    pause.setActive(false);
    const next = ci + 1 < CHAPTERS.length;
    A.UI.results.show({gameId: GAME_ID, stars: 3, kicker: `Chapter ${ci + 1}`, title: `${CHAPTERS[ci].name}: complete!`,
      msg: next ? (chDone(ci + 1) ? `Every milestone done! Chapter ${ci + 2}, ${CHAPTERS[ci + 1].name}, is already finished too!` : `Every milestone done! Next up: Chapter ${ci + 2}, ${CHAPTERS[ci + 1].name}.`) : 'You finished every chapter of Blocktave. Your Band Hall is ready for the concert!',
      extra: `<ul class="bt-reslist">${CHAPTERS[ci].goals.map(g => `<li>★ ${esc(g.text)}</li>`).join('')}</ul>`,
      next: {hidden: true},
      retry: {label: 'Keep building', onClick: () => { A.UI.results.hide(); if (G) { G.resultsUp = false; G.ch = curCh() + 1; drawGoals(); G.held = Math.max(0, G.held - 1); pause.setActive(true); A.Sfx.gameMenuMusic(GAME_ID, false); worldMusic(true); setTimeout(checkReached, 600); } }},
      levels: {label: 'Chapters', onClick: () => showHub()}});
    A.Sfx.sequence(['level-complete', 'star-earned'], 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
  }

  /* ================= SURVIVAL NIGHTS (the Endless card) ================= */
  function survivalOver() {
    const g = G, n = g.w.survived || 0;
    G.running = false; cancelAnimationFrame(G.raf); Card.close(); closePanels();
    const run = {score: n, notes: g.calmed, speed: n, combo: 0, stats: [['Nights survived', n], ['Creatures calmed', g.calmed], ['Blocks mined', g.mined]]};
    G = null;
    A.Pitch.pauseListening(true); A.Sfx.sync(); A.Sfx.setMusic(null);
    $('play').hidden = true; document.body.classList.remove('bt-playing');
    pause.setActive(false);
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Endless.gameOver({gameId: GAME_ID, instKey: A.Endless.instKey(inst, member), setKey: 'nights', title: 'OUT OF BREATH', kicker: 'Survival Nights', run,
      onAgain: () => begin('endless'), onBack: showHub, backLabel: 'Chapters'});
  }

  /* ================= THE HUD ================= */
  function drawHud() {
    if (!G) return;
    const p = G.p, max = maxHearts();
    let h = '';
    for (let k = 0; k < max; k++) { const v = Math.max(0, Math.min(1, p.hearts - k)); h += `<i class="bt-heart${v >= 1 ? ' full' : v > 0 ? ' half' : ''}"></i>`; }
    $('hearts').innerHTML = h; $('hearts').setAttribute('aria-label', `${p.hearts} of ${max} hearts`);
    const c = inCycle(), night = c >= DAY(), left = night ? DAY() + NIGHT() - c : DAY() - c;
    $('clock').textContent = `${night ? '🌙 Night' : '☀ Day'} ${Math.floor(G.w.time / (DAY() + NIGHT())) + 1} · ${Math.ceil(left / 60)} min`;
    $('clock').classList.toggle('night', night);
    $('modeBadge').textContent = mode === 'inst' ? (G.listen ? '🎵 Listening' : '🎵 Instrument') : '👆 Touch';
    $('modeBadge').classList.toggle('on', !!G.listen);
    if (G.endless) $('survived').textContent = `Nights survived: ${G.w.survived || 0}`;
    $('survived').hidden = !G.endless;
  }
  function drawZone(z) {
    const layer = {peaks: 'Treble Peaks', depths: 'Bass Depths', surface: '', middle: 'Underground'}[z.layer];
    $('zone').textContent = z.biomeName + (layer ? ' · ' + layer : '');
  }
  function drawGoals() {
    if (!G) return;
    if (G.endless) { $('goals').hidden = true; return; }
    const ci = curCh(), ch = CHAPTERS[ci], s = stats(), bonus = bonusDone();
    G.ch = ci + 1;
    const nextGoal = ch.goals.find(g => !msDone(g.id));
    const prog = {ore10: ` (${Math.min(s.ore, R.goals.toneOre)}/${R.goals.toneOre})`, clams: ` (${Math.min(s.clams, R.goals.clams)}/${R.goals.clams})`, wisps: ` (${Math.min(s.wisps, R.goals.wisps)}/${R.goals.wisps})`};
    $('goals').hidden = false;
    $('goals').innerHTML = `<b>Chapter ${G.ch}: ${esc(ch.name)}</b>` + ch.goals.map(g => `<span class="${msDone(g.id) ? 'ok' : ''}">${msDone(g.id) ? '★' : '☆'} ${esc(g.text)}${msDone(g.id) ? '' : prog[g.id] || ''}</span>` +
      (g === nextGoal && g.hint ? `<small class="bt-how"><b>How?</b> ${esc(g.hint)}</small>` : '')).join('') +
      (bonus ? `<span class="bt-bonus">+ ${bonus} ${bonus === 1 ? 'milestone' : 'milestones'} already done in later chapters</span>` : '');
  }
  function setBuild(on) {
    G.build = on;
    $('modeBtn').textContent = on ? 'BUILD' : 'MINE';
    $('modeBtn').setAttribute('aria-pressed', String(on));
    $('modeBtn').classList.toggle('build', on);
  }

  /* ================= FIRST-TIME CARDS (they pause the world) ================= */
  function firstCard(key, title, text) {
    if (seen(key) || !G) return;
    markSeen(key);
    G.held++;
    const c = Card.current; if (c) c.pause();
    listenSync();
    A.UI.intro.show({theme: 'bt-intro', kicker: 'New!', title, text: esc(text),
      go: {label: 'Got it!', onClick: () => { A.UI.intro.hide(); if (G) { G.held = Math.max(0, G.held - 1); const c2 = Card.current; if (c2) c2.resume(); listenSync(); } }}});
  }

  /* ================= INPUT: the pad, the keyboard, taps on the world ================= */
  const KEYS = {arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'jump', w: 'jump', ' ': 'jump'};
  addEventListener('keydown', e => {
    if (!G || e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('ui-modal') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (KEYS[k]) { if (Card.current && k !== 'arrowleft' && k !== 'arrowright' && k !== 'arrowup') return; G.keys[KEYS[k]] = true; e.preventDefault(); return; }
    if (e.repeat || Card.current) return;
    if (/^[1-6]$/.test(k)) { selectHot(+k - 1); return; }
    if (k === 'e') { if (G.panel === 'inv') closePanels(); else openInv(); return; }
    if (k === 'c') { if (G.panel === 'craft') closePanels(); else openCraft(); return; }
    if (k === 'b') { setBuild(!G.build); return; }
  });
  addEventListener('keyup', e => { if (!G) return; const k = KEYS[e.key.toLowerCase()]; if (k) G.keys[k] = false; });
  addEventListener('blur', () => { if (G) G.keys = {left: false, right: false, jump: false}; });
  cv.addEventListener('pointerdown', e => { if (e.button === 1) return; e.preventDefault(); tapWorld(e.clientX, e.clientY, e.button === 2); });
  cv.addEventListener('pointermove', e => { if (!G || e.pointerType !== 'mouse') return; G.target = tileAt(e.clientX, e.clientY); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  // THE PAD: ◀ ▶ JUMP held (each its own pointer), MINE / BUILD toggles
  function holdBtn(el, key) {
    const on = e => { e.preventDefault(); if (!G || (padArr && padArr.editing)) return; G.keys[key] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } };
    const off = () => { if (G) G.keys[key] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  }
  holdBtn($('padL'), 'left'); holdBtn($('padR'), 'right'); holdBtn($('padJ'), 'jump');
  $('modeBtn').addEventListener('click', () => { if (G && !(padArr && padArr.editing)) setBuild(!G.build); });
  A.holdGuard($('pad'), {lock: true});
  $('invBtn').onclick = () => { if (G) { if (G.panel === 'inv') closePanels(); else openInv(); } };
  $('craftBtn').onclick = () => { if (G) { if (G.panel === 'craft') closePanels(); else openCraft(); } };
  // ARRANGE CONTROLS (shared/pad-arrange.js, the same as Arcade Quest's): touch screens, from the Settings panel
  const isTouch = () => matchMedia('(pointer: coarse)').matches || (A.params && A.params.has('touch'));
  const padArr = A.PadArrange ? A.PadArrange.create({
    gameId: GAME_ID, key: 'controls', cls: 'bt-',
    clusters: {move: () => $('padMove'), act: () => $('padAct')}, labels: {move: '◀ ▶', act: 'Jump / Mine'},
    hint: 'Drag the arrows and the JUMP / MINE buttons where your thumbs like them.',
    pad: () => $('pad'), wrap: () => $('play'),
    obstacles: () => [...document.querySelectorAll('.bt-card, #hotbar')], watch: () => document.body,
    touch: isTouch,
  }) : null;
  A.UI.settings.register(box => {
    box.innerHTML = `<div class="ui-srow"><span class="ui-sname">Play by<small>${snare ? 'rhythms and rolls' : 'notes on your instrument'}, or taps</small></span>` +
      `<span></span><div class="ui-seg" role="group" aria-label="Play by"><button type="button" data-m="inst" aria-pressed="${mode === 'inst'}">My instrument</button><button type="button" data-m="touch" aria-pressed="${mode === 'touch'}">Touch</button></div></div>` +
      (isTouch() && padArr ? `<div class="ui-srow"><span class="ui-sname">On-screen controls</span><span></span><button type="button" class="btn btn-secondary btn-small bt-arrange-btn">Arrange controls</button></div>` : '');
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { switchMode(b.dataset.m); box.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.m === mode))); });
    const ar = box.querySelector('.bt-arrange-btn');
    if (ar) ar.onclick = () => { const ov = document.getElementById('uiSettings'); const done = ov && ov.querySelector('[data-act=done]'); if (done) done.click(); setTimeout(() => padArr.open(), 60); };
  }, {title: 'Blocktave'});
  function switchMode(m) {
    if (m === mode) return;
    mode = m; saveGd({mode}); drawMode();
    if (G) { Card.close(); listenSync(); drawHud(); pause.set({extras: pauseExtras()}); }
    if (m === 'inst' && G) A.requireMic(() => listenSync());
  }
  addEventListener('resize', () => { if (G) sizeCanvas(); });

  /* ================= THE PAUSE MENU (shared/ui-kit.js) ================= */
  const pause = A.UI.pause.mount({
    onPause() {
      if (!G) return;
      G.keys = {left: false, right: false, jump: false};
      const c = Card.current; if (c) c.pause();
      if (!G.endless) saveWorld();
      if (!G.endless && !seen('file-note')) { markSeen('file-note'); pause.set({note: 'Your world lives on this device. Save it to a file to keep a copy.'}); }
      else pause.set({note: ''});
      listenSync();
    },
    onResume() { if (!G) return; G.last = performance.now(); const c = Card.current; if (c) c.resume(); listenSync(); },
    onLevels() { if (G && G.endless) return survivalOver(); showHub(); },
    levelsLabel: 'Back to chapters',
    confirmLeave: () => !!G && G.endless && (G.w.survived || 0) > 0,
    leaveTitle: 'End this run?', leaveText: 'Your nights survived go in the Top 5.', leaveYes: 'End run',
    onArcade() { if (G && !G.endless) saveWorld(); },
    canPause: () => !!G && G.running,
    info: () => !G ? [] : G.endless ? [['Nights survived', G.w.survived || 0], ['Hearts', G.p.hearts]] : [['Day', cycleNo() + 1], ['Tool', R.tools[tier()]], ['Blocks mined', stats().mined]],
  });
  function pauseExtras() {
    const x = [{label: 'Switch to ' + (mode === 'inst' ? 'Touch mode' : 'Instrument mode'), id: 'btModeX', onClick: () => switchMode(mode === 'inst' ? 'touch' : 'inst')}];
    if (G && G.endless) return x;
    return x.concat([
      {label: 'Save world to file', id: 'btSaveFile', onClick: () => { downloadWorld(); }},
      {label: 'Load world file', id: 'btLoadFile', onClick: () => { $('worldFile').value = ''; $('worldFile').click(); }},
      {label: 'New world', id: 'btNewWorld', onClick: () => newWorldAsk()},
    ]);
  }
  /* SAVE WORLD TO FILE / LOAD WORLD FILE / NEW WORLD */
  function worldJSON() { if (G && !G.endless) G.w.player = playerSave(); return JSON.stringify(Object.assign({game: GAME_ID}, BW.encode(G.w))); }
  function downloadWorld() {
    if (!G) return;
    saveWorld();
    const blob = new Blob([worldJSON()], {type: 'application/json'}), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'blocktave-world.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    A.UI.toast('Your world was saved to blocktave-world.json.');
  }
  function importWorld(text, ask = true) {
    let o = null; try { o = JSON.parse(text); } catch (e) { o = null; }
    const w = o && o.game === GAME_ID ? BW.decode(o) : null;
    if (!w) { A.UI.toast('That file isn\'t a Blocktave world.', {kind: 'err'}); return Promise.resolve(false); }
    const go = () => { try { localStorage.setItem(WORLD_KEY, JSON.stringify(BW.encode(w))); } catch (e) { return false; }
      const ch = G ? G.ch : 1; if (G) { cancelAnimationFrame(G.raf); G.running = false; Card.close(); closePanels(); G = null; }
      if (pause.paused) pause.resume();
      enterWorld(ch || 1); A.UI.toast('World loaded!'); return true; };
    if (!ask) return Promise.resolve(go());
    if (G) G.held++;
    return A.UI.confirm({title: 'Load this world?', text: 'Your whole world will be replaced by the one in the file.', yes: 'Load it', no: 'Keep mine', danger: true})
      .then(y => { if (G) G.held = Math.max(0, G.held - 1); return y ? go() : false; });
  }
  $('worldFile').addEventListener('change', () => { const f = $('worldFile').files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importWorld(String(r.result)); r.readAsText(f); });
  function newWorldAsk() {
    if (!G) return;
    G.held++;
    const back = () => { if (G) G.held = Math.max(0, G.held - 1); };
    A.UI.confirm({title: 'Start a new world?', text: 'Your whole world will be replaced by a brand-new one.', yes: 'New world', no: 'Keep my world', danger: true})
      .then(y => { if (!y) return back();
        return A.UI.confirm({title: 'Are you sure?', text: 'Your whole world will be replaced. Everything you built will be gone (your stars stay). Save it to a file first if you want a copy!', yes: 'Yes, new world', no: 'Keep my world', danger: true})
          .then(y2 => { if (!y2) return back(); const ch = G.ch; cancelAnimationFrame(G.raf); G.running = false; Card.close(); closePanels(); G = null;
            try { localStorage.removeItem(WORLD_KEY); } catch (e) { /* fine */ } enterWorld(ch || 1); }); });
  }

  /* ================= TESTS AND ?demo ================= */
  const fps = () => { if (!G || G.frames.length < 2) return null; const f = G.frames, span = f[f.length - 1][0] - f[0][0]; return {fps: (f.length - 1) / span * 1000, drawMs: f.reduce((a, x) => a + x[1], 0) / f.length}; };
  A.Blocktave = {
    state: () => ({screen: G ? 'world' : 'hub', mode, snare, chapter: G && G.ch, endless: !!(G && G.endless),
      player: G && {x: G.p.x, y: G.p.y, hearts: G.p.hearts, tier: tier(), ground: G.p.ground}, inv: G && Object.assign({}, G.p.inv), hot: G && G.p.hot.slice(),
      time: G && G.w.time, night: G && isNight(), nights: G && G.w.nights, survived: G && G.w.survived, listening: A.Pitch.listening(),
      creatures: G ? G.creatures.map(c => ({id: c.id, kind: c.kind, x: c.x, y: c.y, state: c.state, pc: c.item && c.item.pc, sounding: c.item && c.item.sounding, n: c.n, mul: c.mul})) : [],
      card: Card.current && Card.current.state(), panel: G && G.panel, build: G && G.build, seed: G && G.w.seed, bags: G ? G.w.bags.length : 0, cot: G && G.w.cot,
      held: G && G.held, tile: S, frames: fps(), run: G && {frames: G.nFrames || 0, ms: G.since ? performance.now() - G.since : 0}}),
    world: () => G && G.w, worldJSON: () => G && worldJSON(), importWorld: (t, ask) => importWorld(t, ask), save: () => saveWorld(),
    begin, showHub, fps, key: WORLD_KEY,
  };
  if (A.DEMO) {
    A.Blocktave.demo = {
      give: (id, n = 1) => { gain(id, n); return G.p.inv[id]; },
      tp: (x, y) => { G.p.x = x + .5; G.p.y = y + 1; G.p.vx = G.p.vy = 0; },
      find: (key, from) => { const w = G.w, v = ID[key], ox = from ? from.x : G.p.x, oy = from ? from.y : G.p.y; let best = null, bd = 1e9;
        for (let i = 0; i < w.b.length; i++) if (w.b[i] === v) { const x = i % w.w, y = Math.floor(i / w.w), d = Math.hypot(x - ox, y - oy); if (d < bd) { bd = d; best = {x, y}; } } return best; },
      /** stand next to (x, y) with room to breathe: dig out the two tiles above the spot next to it */
      standBy: (x, y) => { const w = G.w; for (const dx of [-1, 1]) { const sx = x + dx; BW.put(w, sx, y, ID.air); BW.put(w, sx, y - 1, ID.air); if (!B[BW.at(w, sx, y + 1)].solid) BW.put(w, sx, y + 1, ID.slate); G.p.x = sx + .5; G.p.y = y + 1; G.p.vx = G.p.vy = 0; return {x: sx, y}; } },
      put: (x, y, key) => BW.put(G.w, x, y, ID[key]),
      at: (x, y) => B[BW.at(G.w, x, y)].key,
      mine: (x, y) => mine(x, y),
      act: (x, y, build) => act(x, y, build),
      place: (x, y, id) => { if (!have(id)) gain(id, 1); return place(x, y, id); },
      answer: () => { const c = Card.current; if (c) c.answer(); return !!c; },
      craft: id => { const r = RECIPES.find(x => x.id === id); if (!r) return false; if (!G.panel) openCraft(); slots.fill(null); r.in.forEach((k, i) => { slots[i] = k; }); drawCraft(); perform(); return !!Card.current; },
      spawn: (kind, dx = 6) => { const x = G.p.x + dx; return spawn(kind, x, kind === 'wisp' ? G.p.y - 1.5 : G.p.y).id; },
      hurt: (n = 1) => { G.p.hurtT = 0; hurt(n, null); },
      time: t => { G.w.time = t; },
      heard: pc => heardNote(pc),
      listen: () => listenSync(),
      canSpawnAt: (x, y, kind = 'clam') => canSpawnAt(x, y, kind),
      spawnCheck: () => trySpawn(),
      award, stats: () => Object.assign({}, stats()), mode: m => switchMode(m),
      hold: on => { G.held = Math.max(0, G.held + (on ? 1 : -1)); },
      room: (x, y) => BW.room(G.w, x, y, R),
      /** a 3 × 2 room with dirt walls around the spawn, then its door placed the real way (chapter 1's shelter) */
      shelter: () => {
        const w = G.w, x0 = Math.floor(w.spawn.x) - 1, y = Math.floor(w.spawn.y) + 1;
        for (let x = x0 - 1; x <= x0 + 3; x++) { BW.put(w, x, y, ID.dirt); for (let yy = y - 3; yy < y; yy++) BW.put(w, x, yy, ID.air); BW.put(w, x, y - 3, ID.dirt); }
        BW.put(w, x0 - 1, y - 1, ID.dirt); BW.put(w, x0 - 1, y - 2, ID.dirt);
        G.p.x = x0 + 1.5; G.p.y = y; G.p.vx = G.p.vy = 0;
        if (!have('door')) gain('door', 1);
        return place(x0 + 3, y - 1, 'door');
      },
    };
  }
  showHub();
})(window.Arcade);
