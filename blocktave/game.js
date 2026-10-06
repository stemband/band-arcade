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
  /* TOUCH MODE IS THE SAME FOR EVERY MEMBER. drum() = INSTRUMENT mode on the snare: only then are the cards drum
     performances (counts, rolls, rhythms on the drum). In TOUCH the snare reads the BELLS' notes (treble clef, the bells'
     range: readM / readG) and taps rhythms like everyone else; everyone else always reads their own notes. */
  const BELLS = snare ? A.memberById('bells') : null, BELLS_G = snare ? A.groupFor('bells') : null;
  const drum = () => snare && mode === 'inst';
  const readM = () => snare ? BELLS : member;              // (the snare's INSTRUMENT cards read nothing: they're counts and rhythms)
  const readG = () => snare ? BELLS_G : inst;

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
  /** CHAPTER 6 (and any later one) shows once Chapter rules.js newChapter has a star (the list, the goals box) */
  const newChOpen = () => (A.store.level(GAME_ID, who, R.newChapter).stars || 0) >= 1;
  const shownChapters = () => newChOpen() ? CHAPTERS.length : R.newChapter;
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
    $('levelGrid').innerHTML = CHAPTERS.slice(0, shownChapters()).map((ch, i) => {
      const p = A.store.level(GAME_ID, who, i + 1);
      return `<button class="lvl bt-ch${p.stars >= 3 ? ' cleared' : ''}" data-l="${i + 1}">
        <span class="n">Chapter ${i + 1}${i >= R.newChapter && !seen('ch' + (i + 1)) ? ' <em class="bt-new">NEW!</em>' : ''}</span>
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
    return {x: +p.x.toFixed(2), y: +p.y.toFixed(2), hearts: p.hearts, inv: p.inv, hot: p.hot, sel: p.sel, wear: p.wear, wornLeft: p.wornLeft};
  }

  /* ================= THE GAME STATE ================= */
  let G = null;
  /** the worn ARMOR and SHIELD ({id, left}: its durability left), checked against rules.js defense (an older save: none) */
  function wearOf(W) {
    const D = R.defense, out = {armor: null, shield: null};
    ['armor', 'shield'].forEach(k => { const w = W && W[k]; if (w && D[k][w.id]) out[k] = {id: w.id, left: Math.max(1, Math.min(D[k][w.id].durability, +w.left || D[k][w.id].durability))}; });
    return out;
  }
  const tierOf = inv => Math.max(0, ...Object.keys(inv).filter(k => inv[k] > 0 && ITEMS[k] && ITEMS[k].kind === 'tool').map(k => ITEMS[k].tier));
  function enterWorld(ch) {
    const endless = ch === 'endless';
    A.LevelSelect.played(endless ? 'endless' : ch - 1);
    let w = endless ? null : loadWorld(), grew = null;
    if (w) grew = BW.repair(w, R);                              // an older world: the starter check, once
    const ores2 = !!(w && w.fromV < 3);                        // an older world: Chapter 6's ores, once (below, out of view)
    if (!w) w = BW.generate(newSeed(), R);
    if (endless) { w.time = R.endless.startS; }
    const P = w.player || {};
    G = {w, endless, ch: endless ? 0 : ch, t0: performance.now(), held: 0, creatures: [], parts: [], bags: w.bags,
      keys: {left: false, right: false, jump: false}, build: false, lastSave: performance.now(), wrong: 0, target: null,
      cycleCount: {}, spawnT: 0, died: false, calmed: 0, mined: 0, frames: [], listen: false, wispHold: 0, fx: {},
      p: {x: P.x != null ? P.x : w.spawn.x + .5, y: P.y != null ? P.y : w.spawn.y + 1, vx: 0, vy: 0, face: 1, ground: false, hurtT: 0,
        hearts: P.hearts > 0 ? P.hearts : (endless ? R.endless.hearts : R.player.hearts), inv: P.inv || {}, hot: P.hot || new Array(R.hotbar).fill(null), sel: P.sel || 0, walkT: 0,
        wear: wearOf(P.wear), wornLeft: Object.assign({}, P.wornLeft)}};   // armor + shield (an older save: none)
    if (endless) Object.entries(R.endless.kit).forEach(([k, n]) => gain(k, n, true, false));
    G.nightWas = isNight();
    G.cycle = cycleNo();
    scanGear();
    $('hub').hidden = true; $('play').hidden = false;
    document.body.classList.add('bt-playing');
    pause.setActive(true);
    pause.set({levelsLabel: endless ? 'End this run' : 'Back to chapters', extras: pauseExtras(), note: ''});
    A.Sfx.gameMenuMusic(GAME_ID, false);
    worldMusic(true);
    sizeCanvas();
    G.oreSeen = new Uint8Array(B.length); Object.keys(gd().oreSeen || {}).forEach(k => { if (ID[k] != null) G.oreSeen[ID[k]] = 1; });
    if (ores2) {                                                 // THE ONE-TIME ORE PASS (world.js ores2Pass): never where you can see
      const p = G.p, vx = VW / S / 2 + 3, vy = VH / S + 3;
      G.ores2 = BW.ores2Pass(w, R, {x0: Math.floor(p.x - vx), x1: Math.ceil(p.x + vx), y0: Math.floor(p.y - vy), y1: Math.ceil(p.y + vy)});
      w.dirty = true;
    }
    drawHot(); drawHud(); drawGoals();
    listenSync();
    G.running = true; G.last = performance.now();
    G.raf = requestAnimationFrame(frame);
    scrollTo(0, 0);
    if (!endless) { if (!w.player || w.dirty) saveWorld(); }
    if (grew) setTimeout(() => A.UI.toast('New trees have grown near your camp!', {ms: 3200}), 600);
    if (!endless) setTimeout(checkReached, 900);
    if (!endless) setTimeout(checkNewChapter, 1200);
    if (!seen('welcome')) firstCard('welcome', 'Welcome to Blocktave!', endless ? 'Survive as many nights as you can with one life! Build a shelter, light Stage Lamps and calm the creatures with your music.'
      : mode === 'inst' ? 'This world is yours: it lives on this device. Tap a block to mine it. Glowing blocks are music: play (or tap) the notes to break them! Tap CRAFT to make tools, and build a shelter before night comes.'
        : 'This world is yours: it lives on this device. Tap a block to mine it. Glowing blocks are music: tap the note names or the rhythm to break them! Tap CRAFT to make tools, and build a shelter before night comes.');
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
  /** THE WORLD'S MUSIC: one choice from depth + night (rules.js music): deeper than caveRows below the ground nearby (the
      same depth stepWay measures) = the cave track, which wins over night; back above leaveRows = day or night again.
      setMusic runs only when the choice changes. */
  function musicChoice() {
    const d = G.way ? G.way.depth : 0, M = R.music;
    if (!G.inCave && d > M.caveRows) G.inCave = true;
    else if (G.inCave && d < M.leaveRows) G.inCave = false;
    return G.inCave ? 'blocktave-cave' : isNight() ? 'blocktave-night' : 'blocktave-day';
  }
  function worldMusic(force) {
    const t = musicChoice();
    if (!force && G.musicTrack === t) return;
    G.musicTrack = t;
    A.Sfx.setMusic(t, {fade: R.music.fadeS, builtIn: t === 'blocktave-cave'});
  }

  /* ================= INVENTORY ================= */
  const MAX_ONE = () => R.player.stack * 9;
  /** gain items: the hotbar, the Recipe Book, and (unless label === false) the "+1 Maple" label over your head */
  function gain(id, n, quiet, label = true) {
    const inv = G.p.inv;
    inv[id] = Math.min(MAX_ONE(), (inv[id] || 0) + n);
    const it = ITEMS[id];
    if (it && (it.kind !== 'tool' || it.hotbar) && it.kind !== 'armor' && it.kind !== 'shield' && !G.p.hot.includes(id)) { const k = G.p.hot.indexOf(null); if (k >= 0) { G.p.hot[k] = id; gearIn(id); } }
    if (id === 'torch' && !seen('torch') && G.running) setTimeout(() => { if (G) firstCard('torch', 'A Neon Torch!', 'Keep it in your hotbar and it lights the dark around you, at night and underground.'); }, 500);
    findRecipes();
    if (label) pickupLabel(id, n);
    if (!quiet) drawHot();
  }
  /** GEAR (recipes.js kind 'gear': boots, the glider, the sonar fork) works while it's ANYWHERE in the hotbar */
  const gearOn = id => !!(G && G.p.hot.includes(id) && (G.p.inv[id] || 0) > 0);
  /** a gear item just went into the hotbar: its little sound */
  function gearIn(id) { if (ITEMS[id] && ITEMS[id].kind === 'gear' && G && G.running) A.Sfx.event('bt-gear'); }
  /** room in your bag for this item? (rules.js invSlots different items, tools aside; one item up to its stack limit) */
  function canHold(id) {
    const inv = G.p.inv;
    if (inv[id] > 0) return inv[id] < MAX_ONE();
    const kinds = Object.keys(inv).filter(k => inv[k] > 0 && !(ITEMS[k] && ITEMS[k].kind === 'tool')).length;
    return (ITEMS[id] && ITEMS[id].kind === 'tool') || kinds < R.invSlots;
  }

  /* ================= "+1 MAPLE": the pickup labels over your head (and the same words for screen readers) =================
     Drawn on the sharp overlay after the light (readable in the dark: a dark outline). The same item within
     pickupMergeMs counts up in one label; at most pickupLabelsMax; reduced motion = no drift, only the fade. */
  const LIVE = {q: [], t: 0, tm: 0};
  function pickupLabel(id, n, text) {
    if (!G || !(n > 0) && !text) return;
    const now = performance.now(), L = G.labels || (G.labels = []);
    const same = !text && L.find(l => l.id === id && !l.text && now - l.last < R.pickupMergeMs);
    if (same) { same.n += n; same.last = now; same.t0 = now; }
    else { L.push({id, n, text, t0: now, last: now}); while (L.length > R.pickupLabelsMax) L.shift(); }
    G.fx.labels = (G.fx.labels || 0) + 1;
    say(text || `+${n} ${itemName(id)}`);
  }
  const labelText = l => l.text || `+${l.n} ${itemName(l.id)}`;
  /** the aria-live region hears the pickups at most every pickupAriaMs (gathered: "+2 Maple, +1 Cork") */
  function say(t) {
    LIVE.q.push(t);
    if (LIVE.tm) return;
    const flush = () => { LIVE.tm = 0; if (!LIVE.q.length) return; const el = $('btLive'); if (el) el.textContent = LIVE.q.splice(0).join(', '); LIVE.t = performance.now(); };
    const wait = Math.max(0, R.pickupAriaMs - (performance.now() - LIVE.t));
    LIVE.tm = setTimeout(flush, wait);
  }
  function drawLabels(sx, sy, now) {
    const L = G.labels; if (!L || !L.length) return;
    G.labels = L.filter(l => now - l.t0 < R.pickupLabelMs);
    const p = G.p, x = sx(p.x), base = sy(p.y - PH) - 10, fs = Math.round(Math.max(14, Math.min(19, S * .5)));
    oc.font = `700 ${fs}px ${getComputedStyle(document.body).fontFamily}`; oc.textBaseline = 'middle'; oc.textAlign = 'left';
    oc.lineJoin = 'round';
    G.labels.slice().reverse().forEach((l, k) => {                       // the newest just over the head, older ones above it
      const f = (now - l.t0) / R.pickupLabelMs, rise = RM.matches ? 0 : f * S * .7;
      const y = base - k * (fs + 10) - rise, txt = labelText(l), tw = oc.measureText(txt).width, ic = fs + 4, w = ic + 4 + tw;
      oc.globalAlpha = f < .6 ? 1 : Math.max(0, 1 - (f - .6) / .4);
      const lx = Math.round(x - w / 2);
      oc.drawImage(iconCanvas(l.id), lx, Math.round(y - ic / 2), ic, ic);
      oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.strokeText(txt, lx + ic + 4, y);
      oc.fillStyle = col('text-hi'); oc.fillText(txt, lx + ic + 4, y);
    });
    oc.globalAlpha = 1;
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

  /* ================= WORLD DROPS: mined blocks and calmed creatures drop their item into the world =================
     A drop pops out with a little arc, falls onto the nearest solid ground below (never inside a block) and bobs there.
     Within rules.js magnetRadius of you it glides toward you, within pickupRadius it's yours ("+1 Pearl"). A full bag
     leaves it on the ground ("Bag full!"). Saved with the world (world.js `drops`, v 2). Off screen a drop disappears
     after dropDespawnS (never while you can see it; the lost-hearts bag is separate and never does); at most maxDrops. */
  const DROP_R = .22;                                                    // a drop's size (tiles, half of it)
  function dropItem(id, n, x, y) {
    if (!G || !(n > 0)) return;
    const w = G.w, D = w.drops || (w.drops = []), pieces = Math.min(n, 3);
    for (let k = 0; k < pieces; k++) {
      const share = Math.floor(n / pieces) + (k < n % pieces ? 1 : 0), off = pieces > 1 ? (k - (pieces - 1) / 2) * R.dropSpread : 0;
      D.push({x: x + off, y, item: id, n: share, t: 0, vx: (off ? Math.sign(off) : Math.random() - .5) * R.dropPop[0] * (.6 + Math.random() * .4), vy: -R.dropPop[1], born: performance.now()});
    }
    capDrops();
    w.dirty = true;
  }
  /** at most maxDrops: the oldest beyond that joins the nearest drop of the same item (none = the next oldest) */
  function capDrops() {
    const D = G.w.drops;
    while (D.length > R.maxDrops) {
      let merged = false;
      for (let i = 0; i < D.length - R.maxDrops + 1 && !merged; i++) {
        const a = D[i];
        let best = null, bd = 1e9;
        D.forEach(b => { if (b !== a && b.item === a.item) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < bd) { bd = d; best = b; } } });
        if (best) { best.n += a.n; D.splice(i, 1); merged = true; }
      }
      if (!merged) break;                                                // nothing to merge with: never throw items away
    }
  }
  /** the distance from a drop to the player's body (a vertical segment from the feet to the head) */
  const bodyDist = (d, p) => Math.hypot(d.x - p.x, d.y - Math.max(p.y - PH + .2, Math.min(p.y - .2, d.y)));
  function stepDrops(dt, now) {
    const D = G.w.drops; if (!D || !D.length) return;
    const p = G.p, vx0 = camX - 1, vx1 = camX + VW / S + 1, vy0 = camY - 1, vy1 = camY + VH / S + 1;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i], dist = bodyDist(d, p), room = canHold(d.item), popped = now - (d.born || 0) > 250;   // it pops out first
      if (room && popped && dist <= R.pickupRadius) { take1(d, i); continue; }
      if (room && popped && dist <= R.magnetRadius && !d.vy) {
        // THE MAGNET: a short glide toward you
        const tx = p.x, ty = Math.max(p.y - PH + .2, Math.min(p.y - .2, d.y)), k = Math.min(1, R.magnetSpeed * dt / Math.max(.01, dist));
        d.x += (tx - d.x) * k; d.y += (ty - d.y) * k; d.pull = true;
      } else {
        if (!room && dist <= R.pickupRadius) bagFull();
        d.pull = false;
        fallDrop(d, dt);
      }
      // off screen: the despawn clock runs
      if (d.x < vx0 || d.x > vx1 || d.y < vy0 || d.y > vy1) { d.t = (d.t || 0) + dt; if (d.t >= R.dropDespawnS) { D.splice(i, 1); G.w.dirty = true; } }
    }
  }
  /** gravity and the ground: never inside a block (a block placed over a drop pushes it up into the air) */
  function fallDrop(d, dt) {
    if (solid(d.x, d.y)) { let k = 0; while (k < 6 && solid(d.x, d.y)) { d.y = Math.floor(d.y) - DROP_R - .01; k++; } d.vy = 0; }
    if (d.vx) { const nx = d.x + d.vx * dt; if (!solid(nx + Math.sign(d.vx) * DROP_R, d.y)) d.x = nx; else d.vx = 0; d.vx *= Math.pow(.2, dt); if (Math.abs(d.vx) < .05) d.vx = 0; }
    const under = d.y + DROP_R + .02;
    if (d.vy || !solid(d.x, under)) {
      d.vy = Math.min(R.player.maxFall, (d.vy || 0) + R.player.gravity * dt);
      const ny = d.y + d.vy * dt;
      if (d.vy > 0 && solid(d.x, ny + DROP_R)) { d.y = Math.floor(ny + DROP_R) - DROP_R; d.vy = 0; d.vx = 0; }
      else if (d.vy < 0 && solid(d.x, ny - DROP_R)) d.vy = 0;
      else d.y = ny;
      if (d.y > G.w.h) d.y = G.w.h - 3;
    }
  }
  function take1(d, i) {
    G.w.drops.splice(i, 1); G.w.dirty = true;
    gain(d.item, d.n);
    G.fx.picked = (G.fx.picked || 0) + d.n;
    A.Sfx.event('bt-pickup');
  }
  function bagFull() {
    const now = performance.now();
    if (now - (G.fullAt || -1e9) < R.bagFullToastS * 1000) return;
    G.fullAt = now;
    A.UI.toast('Bag full! Store some things in a Band Locker.', {ms: 2000});
  }
  function drawDrops(sx, sy, now) {
    const D = G.w.drops; if (!D || !D.length) return;
    const size = S * DROP_R * 2.6;
    ctx.imageSmoothingEnabled = false;
    D.forEach((d, k) => {
      const x = sx(d.x), y = sy(d.y);
      if (x < -S || y < -S || x > VW + S || y > VH + S) return;
      const bob = RM.matches || d.vy || d.pull ? 0 : Math.sin(now / 420 + k) * R.dropBob * S;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + DROP_R * S, size * .35, size * .1, 0, 0, 7); ctx.fill();
      ctx.drawImage(iconCanvas(d.item), Math.round(x - size / 2), Math.round(y - size / 2 + bob), Math.round(size), Math.round(size));
    });
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
      // --- Chapter 6 (original art) ---
      case 'rumbleOre': stone('bt-rumble-2', 'bt-slate-2'); line('bt-rumble', 1.2, [[0, 5], [2, 3], [4, 7], [6, 3], [8, 7], [10, 3], [12, 7], [14, 3], [16, 5]]); line('bt-rumble', .8, [[1, 12], [4, 10], [7, 13], [10, 10], [13, 13], [15, 11]]); break;
      case 'piccoloQuartz': fill('bt-treble-2', 0, 0, 16, 16); g.fillStyle = col('bt-treble');
        [[3, 14, 3, 8], [8, 14, 2.6, 11], [12.5, 14, 2.4, 7]].forEach(([x, y, w2, h]) => { g.beginPath(); g.moveTo((x - w2) * u, y * u); g.lineTo(x * u, (y - h) * u); g.lineTo((x + w2) * u, y * u); g.fill(); });
        line('text-hi', .5, [[8, 3.5], [8, 9]]); bevel(); break;
      case 'intervalGeode': stone(); dot('bt-geode', 8, 8, 6); dot('bt-rumble-2', 8, 8, 4.4); oval('bt-geode-2', 6.2, 9.5, 1.5, 1.1); oval('bt-geode-2', 9.8, 6.5, 1.5, 1.1); line('bt-geode', .8, [[8, 2], [8, 14]]); break;
      case 'keyQuartz': stone(); g.fillStyle = col('bt-key'); g.beginPath(); g.moveTo(8 * u, 1.5 * u); g.lineTo(13.5 * u, 8 * u); g.lineTo(8 * u, 14.5 * u); g.lineTo(2.5 * u, 8 * u); g.fill();
        line('bt-key-2', .7, [[6.5, 4.5], [6.5, 11]]); g.strokeStyle = col('bt-key-2'); g.lineWidth = .7 * u; g.beginPath(); g.ellipse(7.9 * u, 9.6 * u, 1.5 * u, 1.3 * u, 0, -1.6, 1.6); g.stroke(); break;
      case 'dynamicCoral': fill('bt-sand', 0, 12, 16, 4); line('bt-coral-2', 1, [[3, 13], [3, 8], [1.5, 5]]); line('bt-coral', 1.4, [[8, 13], [8, 6], [5.5, 3]]); line('bt-coral', 1.4, [[8, 8], [11, 4]]); line('bt-coral', 1.8, [[13, 13], [13, 7], [14.5, 2.5]]); break;
      case 'tempoAmber': rr('bt-amber', 0, 0, 16, 16, 2.5); rr('bt-amber-2', 3, 2.5, 10, 11, 1.5); g.globalAlpha = .45; fill('bt-amber', 4, 3.5, 8, 9); g.globalAlpha = 1;
        g.fillStyle = col('bt-plank'); g.beginPath(); g.moveTo(5 * u, 12 * u); g.lineTo(7 * u, 4 * u); g.lineTo(9 * u, 4 * u); g.lineTo(11 * u, 12 * u); g.fill(); line('bt-brass', .7, [[8, 11], [10, 5]]); bevel(); break;
      case 'trampoline': fill('bt-tramp-rim', 0, 5, 16, 3); fill('bt-tramp', 1, 3.5, 14, 2); line('bt-plank-2', 1.2, [[2.5, 8], [1.5, 16]]); line('bt-plank-2', 1.2, [[13.5, 8], [14.5, 16]]); line('bt-tramp-rim', .8, [[4, 8], [8, 14], [12, 8]]); break;
      case 'segno': line('bt-slate-2', 1, [[8, 16], [8, 10]]); rr('bt-sign', 2, 1, 12, 10, 1.5); line('bt-ink', 1, [[5.2, 9], [10.8, 3]]); g.fillStyle = col('bt-ink');
        g.font = `${8 * u}px "GN Music","Noto Music",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('S', 8 * u, 6.3 * u); dot('bt-ink', 5.2, 4.5, .8); dot('bt-ink', 10.8, 7.5, .8); break;
      case 'coda': line('bt-slate-2', 1, [[8, 16], [8, 10]]); rr('bt-sign', 2, 1, 12, 10, 1.5); g.strokeStyle = col('bt-ink'); g.lineWidth = u; g.beginPath(); g.ellipse(8 * u, 6 * u, 2.6 * u, 3.4 * u, 0, 0, 7); g.stroke();
        line('bt-ink', .9, [[8, 1.6], [8, 10.4]]); line('bt-ink', .9, [[3.6, 6], [12.4, 6]]); break;
      case 'organ': fill('bt-organ', 1, 8, 14, 8); [3, 6, 9, 12].forEach((x, k) => rr('bt-organ-pipe', x, 1 + (k % 2) * 2, 2, 8 - (k % 2) * 2, .8)); fill('bt-stage-edge', 1, 10, 14, .8); break;
      case 'corallamp': line('bt-coral', 1, [[8, 16], [8, 10]]); line('bt-coral', .9, [[8, 12], [5, 9]]); line('bt-coral', .9, [[8, 12], [11, 9]]); dot('bt-coral-glow', 8, 6.5, 3.6); dot('bt-coral-2', 7, 5.5, 1); break;
      case 'bench': fill('bt-plank', 0, 6, 16, 2.5); line('bt-plank-2', 1, [[2, 8.5], [2, 16]]); line('bt-plank-2', 1, [[14, 8.5], [14, 16]]); oval('bt-cork', 7, 3.6, 3.2, 2.2, 0); oval('bt-cork', 10.2, 4, 2, 1.6, 0); line('bt-slate-2', .6, [[7, 3.6], [10.5, 4]]); break;
      default: fill('bt-dirt', 0, 0, 16, 16);
    }
  }
  /* item icons (inventory, hotbar, the Measure): a block's own tile, or a small drawing for materials and tools */
  const ICON = {}, ICON_CV = {};
  const iconURL = id => ICON[id] || (ICON[id] = iconCanvas(id).toDataURL());
  /** an item's icon as a 48 px canvas (the hotbar's mini tile; drawn on the world for drops, swings and labels) */
  function iconCanvas(id) {
    if (ICON_CV[id]) return ICON_CV[id];
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
        case 'torch':                                                     // a short dark handle, a glowing neon tube on top
          g.globalAlpha = .28; dot('bt-torch', 10.2, 5.8, 4.6); g.globalAlpha = 1;
          line('bt-torch-handle', 2.4, [[4, 14], [8, 10]]); line('bt-plank', .8, [[4.4, 13.6], [7.6, 10.4]]);
          line('bt-torch', 2.6, [[8.4, 9.6], [12, 3.6]]); line('bt-torch-core', 1, [[8.6, 9.3], [11.8, 4]]); break;
        // --- Chapter 6 (original icons) ---
        case 'basscrystal': gem('bt-rumble', 6); line('bt-rumble-2', .7, [[4.5, 9], [6.5, 7], [8.5, 10], [11, 7]]); break;
        case 'treblecrystal': gem('bt-treble', 4); line('bt-treble-2', .6, [[8, 3.5], [8, 12.5]]); break;
        case 'harmony': dot('bt-geode', 8, 8, 5.5); dot('bt-rumble-2', 8, 8, 4); dot('bt-geode-2', 6.3, 9.4, 1.3); dot('bt-geode-2', 9.7, 6.6, 1.3); break;
        case 'keyshard': g.fillStyle = col('bt-key'); g.beginPath(); g.moveTo(8 * u, 2 * u); g.lineTo(13 * u, 8 * u); g.lineTo(8 * u, 14 * u); g.lineTo(3 * u, 8 * u); g.fill(); line('bt-key-2', .7, [[6.6, 5], [6.6, 11]]); dot('bt-key-2', 7.9, 9.7, 1.2); break;
        case 'coralpearl': dot('bt-coral', 8, 8, 4.8); dot('bt-coral-2', 6.6, 6.6, 1.4); break;
        case 'amberbeat': gem('bt-amber', 6); line('bt-amber-2', .7, [[8, 11], [10, 5]]); break;
        case 'grandgem': gem('bt-treble', 8); g.globalAlpha = .85; dot('bt-rumble', 8, 9.5, 3); g.globalAlpha = 1; dot('bt-geode-2', 8, 6, 1.2); break;
        case 'tubaboots': g.fillStyle = col('bt-rumble'); g.fillRect(4 * u, 4 * u, 4 * u, 7 * u); g.fillRect(4 * u, 10 * u, 8 * u, 3 * u); line('bt-brass', 1, [[4, 13.5], [12, 13.5]]); dot('bt-brass', 6, 6, .9); break;
        case 'glider': g.fillStyle = col('bt-treble'); g.beginPath(); g.moveTo(1.5 * u, 10 * u); g.quadraticCurveTo(8 * u, 2 * u, 14.5 * u, 10 * u); g.lineTo(8 * u, 7.5 * u); g.closePath(); g.fill(); line('bt-treble-2', .6, [[8, 7.5], [8, 12.5]]); break;
        case 'sonarfork': line('bt-silver', 1.2, [[8, 15], [8, 9]]); line('bt-silver', 1.1, [[5.5, 9], [5.5, 2.5]]); line('bt-silver', 1.1, [[10.5, 9], [10.5, 2.5]]); line('bt-silver', 1.1, [[5.5, 9], [10.5, 9]]);
          g.globalAlpha = .7; g.strokeStyle = col('bt-mine'); g.lineWidth = .6 * u; [3, 4.6].forEach(r2 => { g.beginPath(); g.arc(8 * u, 4 * u, r2 * u, -2.4, -.7); g.stroke(); }); g.globalAlpha = 1; break;
        case 'accelboots': g.fillStyle = col('bt-amber'); g.fillRect(6 * u, 4 * u, 4 * u, 7 * u); g.fillRect(6 * u, 10 * u, 7 * u, 3 * u); [[1.5, 6], [2.5, 9], [1.5, 12]].forEach(([x, y]) => line('bt-mine', .7, [[x, y], [x + 3, y]])); break;
        case 'snack': g.fillStyle = col('bt-snack'); g.beginPath(); g.roundRect ? g.roundRect(4 * u, 4 * u, 8 * u, 10 * u, 2 * u) : g.rect(4 * u, 4 * u, 8 * u, 10 * u); g.fill(); line('bt-brass', .8, [[5, 6], [11, 6]]); break;
        // --- the Rey Update 2/4: armor (a vest / coat / plate) and shields (a drumhead, a bell, a cymbal) ---
        case 'feltvest': case 'brasscoat': case 'silverarmor': {
          const body = {feltvest: 'bt-felt', brasscoat: 'bt-rumble', silverarmor: 'bt-silver'}[id], trim = {feltvest: 'bt-felt-2', brasscoat: 'bt-brass', silverarmor: 'bt-spring'}[id];
          g.fillStyle = col(body); g.beginPath(); g.moveTo(5 * u, 2.5 * u); g.lineTo(11 * u, 2.5 * u); g.lineTo(14 * u, 6 * u); g.lineTo(12 * u, 7.5 * u); g.lineTo(12 * u, 14 * u); g.lineTo(4 * u, 14 * u); g.lineTo(4 * u, 7.5 * u); g.lineTo(2 * u, 6 * u); g.closePath(); g.fill();
          line(trim, .9, [[8, 3.5], [8, 13.5]]);
          if (id !== 'feltvest') [5.5, 8.5, 11.5].forEach(yy => dot(trim, 9.7, yy, .8));
          if (id === 'silverarmor') { line(trim, .7, [[4.5, 8], [11.5, 8]]); dot('text-hi', 6, 5, .8); }
          break;
        }
        case 'drumshield': dot('bt-plank', 8, 8, 6.5); dot('bt-rawhide', 8, 8, 5.2); dot('bt-rawhide-2', 8, 8, 1.6); break;
        case 'bellshield': dot('bt-brass', 8, 8, 6.5); dot('bt-rumble', 8, 8, 3.6); dot('bt-ink', 8, 8, 1.6); dot('text-hi', 5.4, 5.4, .9); break;
        case 'cymbalshield': dot('bt-silver', 8, 8, 6.5); g.strokeStyle = col('bt-slate-2'); g.lineWidth = .4 * u; [2.6, 4.4].forEach(r2 => { g.beginPath(); g.arc(8 * u, 8 * u, r2 * u, 0, 7); g.stroke(); }); dot('bt-slate-2', 8, 8, 1.2); dot('text-hi', 5.6, 5.2, .8); break;
        default: dot('text-lo', 8, 8, 4);
      }
    }
    return (ICON_CV[id] = c);
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
  /** the block(s) right under the feet have this flag (a trampoline's `bounce`) */
  function standingOn(key) { const y = Math.floor(G.p.y + .01); for (let tx = Math.floor(G.p.x - HW); tx <= Math.floor(G.p.x + HW - .001); tx++) if (blockAt(tx, y)[key]) return true; return false; }
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
  /** the upward speed that reaches h tiles (gravity: rules.js player.gravity) */
  const launchV = h => Math.sqrt(2 * R.player.gravity * Math.max(0, h));
  function stepPlayer(dt) {
    const p = G.p, P = R.player, k = G.keys;
    const water = inBlock(p, 'fluid'), climb = inBlock(p, 'climb');
    // GEAR in the hotbar: Accelerando Boots walk faster, Tuba Boots jump higher (they stack), the Piccolo Glider floats
    const sp = P.speed * (water ? P.swim + .25 : 1) * (gearOn('accelboots') ? 1 + R.gear.speedPlus : 1);
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    p.vx = dir * sp; if (dir) p.face = dir;
    p.gliding = false;
    if (climb && k.jump) p.vy = -P.speed * .9;
    else if (water) { p.vy = Math.min(p.vy + P.gravity * .3 * dt, 3); if (k.jump) p.vy = -P.speed * .8; }
    else {
      p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt);
      if (k.jump && p.ground) p.vy = gearOn('tubaboots') ? -launchV(P.jump * P.jump / (2 * P.gravity) + R.gear.jumpPlus) : -P.jump;
      if (k.jump && !p.ground && p.vy > R.gear.glideSpeed && gearOn('glider')) { p.vy = R.gear.glideSpeed; p.gliding = true; }
    }
    const fall = p.vy;
    moveBody(p, dt, HW, PH, true);
    // A TIMPANI TRAMPOLINE: landing on it (from a fall or a jump) launches you trampoline.boost tiles up (+1 holding JUMP)
    if (p.ground && fall > R.trampoline.minFall && standingOn('bounce')) {
      p.vy = -launchV(R.trampoline.boost + (k.jump ? R.trampoline.holdBoost : 0)); p.ground = false;
      p.bounceFrom = p.y; G.fx.bounces = (G.fx.bounces || 0) + 1;
      if (!(Card.current && A.Pitch.listening())) A.Sfx.event('bt-boing');      // never while a card listens
    }
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

  /* ================= THE WAY UP (lighting's helpers for a player deep underground) =================
     More than light.lostDepth rows below the ground nearby (the median of the nearby columns' ground, so a shaft you dug
     doesn't count as "the ground") and not closer to the surface for light.lostS seconds: an arrow at the screen's edge
     points along the shortest OPEN path to a tile under the open sky ("↑ Surface"; straight up when no open path exists).
     After light.surfaceAfterS underground the pause menu offers ↑ SURFACE: back up along the open tiles, or, with no open
     way, "Dig upward with your mallet!" (it never digs). Checked twice a second; the path search is capped. */
  const WAY_MAX = 6000;                                                     // the most tiles one path search looks at
  function groundNear(x) {
    const t = []; for (let k = -8; k <= 8; k++) t.push(BW.top(G.w, Math.max(0, Math.min(G.w.w - 1, x + k))));
    return t.sort((a, b) => a - b)[8];
  }
  /** the shortest open path (4 ways, through tiles you can stand in) from (x, y) to a tile under the open sky at the
      ground's level: [[x, y], …] from the player, or null */
  function pathUp(x, y) {
    const w = G.w, ref = groundNear(x), seen = new Map(), q = [[x, y]];
    const passable = (cx, cy) => cx >= 0 && cx < w.w && cy >= 0 && cy < w.h && !B[w.b[cy * w.w + cx]].solid;
    if (!passable(x, y)) return null;
    seen.set(y * w.w + x, -1);
    for (let h = 0; h < q.length && q.length < WAY_MAX; h++) {
      const [cx, cy] = q[h];
      if (cy < BW.top(w, cx) && cy <= groundNear(cx) + 1 && cy <= ref + 1) {       // under the open sky, at the ground's level
        const out = []; let k = cy * w.w + cx;
        while (k !== -1) { out.unshift([k % w.w, Math.floor(k / w.w)]); k = seen.get(k); }
        return out;
      }
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = cx + dx, ny = cy + dy, nk = ny * w.w + nx;
        if (!seen.has(nk) && passable(nx, ny)) { seen.set(nk, cy * w.w + cx); q.push([nx, ny]); }
      }
    }
    return null;
  }
  function stepWay(real, now) {
    const W = G.way || (G.way = {underS: 0, lostT: 0, best: Infinity, arrow: null, t: 0, depth: 0, surfaceBtn: false});
    const p = G.p, x = Math.floor(p.x), y = Math.floor(p.y - .5), L = R.light;
    if (now - W.t < 500) { if (W.depth > L.caveDepth) W.underS += real; if (W.depth > L.lostDepth) W.lostT += real; return; }
    W.t = now;
    W.depth = y - groundNear(x);
    if (W.depth > L.caveDepth && y >= BW.top(G.w, x)) W.underS += real; else W.underS = 0;
    const btn = W.underS >= L.surfaceAfterS;
    if (btn !== W.surfaceBtn) { W.surfaceBtn = btn; pause.set({extras: pauseExtras()}); }
    if (W.depth <= L.lostDepth) { W.lostT = 0; W.best = Infinity; W.arrow = null; W.path = null; return; }
    const path = pathUp(x, y), dist = path ? path.length : Infinity;
    W.path = path;
    if (dist < W.best - .5) { W.best = dist; W.lostT = 0; } else W.lostT += real;
    if (W.lostT >= L.lostS) {
      const way = path && path[Math.min(6, path.length - 1)];
      const dx = way ? way[0] + .5 - p.x : 0, dy = way ? way[1] + .5 - (p.y - .9) : -1, n = Math.hypot(dx, dy) || 1;
      W.arrow = {dx: dx / n, dy: dy / n, open: !!path};
    } else W.arrow = null;
  }
  /** the pause menu's ↑ SURFACE: up to the nearest tile under the open sky along open tiles, or a hint (never digs) */
  function goSurface() {
    if (!G) return;
    const p = G.p, path = pathUp(Math.floor(p.x), Math.floor(p.y - .5));
    if (pause.paused) pause.resume();
    if (!path) { A.UI.toast('Dig upward with your mallet!', {ms: 2600}); return; }
    const [tx] = path[path.length - 1];
    p.x = tx + .5; p.y = BW.top(G.w, tx); p.vx = p.vy = 0;
    G.way = null;
    A.UI.toast('Back to the surface!', {ms: 1800});
  }
  /** the arrow at the screen's edge (the sharp overlay, readable in the dark: a dark outline) */
  function drawWay(sx, sy) {
    const a = G.way && G.way.arrow; if (!a) return;
    const cx = sx(G.p.x), cy = sy(G.p.y - .9), pad = 58;
    // where the ray from the player meets the screen's inset edge
    const tx = a.dx > 0 ? (VW - pad - cx) / a.dx : a.dx < 0 ? (pad - cx) / a.dx : Infinity;
    const ty = a.dy > 0 ? (VH - pad - cy) / a.dy : a.dy < 0 ? (pad + 40 - cy) / a.dy : Infinity;
    const t = Math.max(0, Math.min(tx, ty)), x = cx + a.dx * t, y = cy + a.dy * t, ang = Math.atan2(a.dy, a.dx);
    oc.save(); oc.translate(x, y); oc.rotate(ang);
    oc.beginPath(); oc.moveTo(18, 0); oc.lineTo(-10, -13); oc.lineTo(-4, 0); oc.lineTo(-10, 13); oc.closePath();
    oc.lineWidth = 5; oc.strokeStyle = col('bt-ink'); oc.stroke(); oc.fillStyle = col('bt-build'); oc.fill();
    oc.restore();
    oc.font = '700 15px "GN Text", system-ui, sans-serif'; oc.textAlign = 'center'; oc.textBaseline = 'middle';
    const ly = y + (a.dy < -.5 ? 28 : -28);
    oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.strokeText('↑ Surface', x, ly); oc.fillStyle = col('bt-build'); oc.fillText('↑ Surface', x, ly);
  }

  /* ================= THE COURAGE METER (rules.js courage) =================
     At the very bottom of the world (the feet within courage.floorRows rows above the World Floor's 2 rows) a player who
     stops BUILDING (brave()) gets courage.graceS seconds, then the meter (#courage, under the hearts) drains over
     courage.drainS; under warnAt it pulses gently and says "Feeling uneasy…" once per trip; empty = GOT THE JITTERS: a
     soft swirl / fade (reduced motion: a plain fade), bt-respawn, and you're back on the surface straight above (else
     the nearest open way up, else the cot, else the spawn point). Nothing is taken: no bag, no hearts, no items. The
     clock counts only while the world runs (no card, no pause, no mic mute, no jitters; rAF stops with a hidden tab).
     Leaving the zone refills it and hides it. In memory only: a reload starts fresh. */
  const CG = () => G.courage || (G.courage = {inZone: false, grace: R.courage.graceS, value: 1, warned: false, refill: false, shown: false});
  const inBottom = p => p.y - .01 >= G.w.h - 2 - R.courage.floorRows;
  /** building: the grace starts over and the meter fills back up */
  function brave() { if (!G) return; const c = CG(); c.grace = R.courage.graceS; if (c.value < 1) c.refill = true; }
  function stepCourage(real, now) {
    const c = CG(), K = R.courage;
    c.inZone = inBottom(G.p);
    if (G.jitter) return;
    if (c.refill || !c.inZone) {
      c.value = Math.min(1, c.value + real / K.refillS);
      if (c.value >= 1) { c.refill = false; c.warned = false; }
      if (!c.inZone) c.grace = K.graceS;
    } else {
      const still = Card.current || (A.Pitch.listening() && A.Pitch.isSuppressed(now));
      if (!still) {
        if (c.grace > 0) c.grace = Math.max(0, c.grace - real);
        else c.value = Math.max(0, c.value - real / K.drainS);
      }
      if (c.value < K.warnAt && !c.warned) {
        c.warned = true;
        A.UI.toast('Feeling uneasy down here… build something!', {ms: 3000}); say('Feeling uneasy down here. Build something!');
      }
      if (c.value <= 0) jitters();
    }
    drawCourage();
  }
  function drawCourage() {
    const c = CG(), el = $('courage'); if (!el) return;
    if (el.dataset.name !== R.courage.name) { el.dataset.name = R.courage.name; $('courageName').textContent = R.courage.name; }
    const show = c.value < 1 || (c.inZone && c.grace <= 0);
    if (show !== c.shown) { c.shown = show; el.classList.toggle('on', show); el.setAttribute('aria-hidden', String(!show)); }
    el.style.setProperty('--cg', c.value.toFixed(3));
    el.classList.toggle('low', c.value < R.courage.warnAt && !c.refill);
  }
  /** the surface straight above column x (standing room under the open sky), else nearby columns, else the open way up */
  function surfaceSpot(x) {
    const w = G.w, ok = cx => { if (cx < 0 || cx >= w.w) return false; const t = BW.top(w, cx); return t >= 2 && !B[BW.at(w, cx, t - 1)].solid && !B[BW.at(w, cx, t - 2)].solid; };
    for (let d = 0; d < 24; d++) for (const cx of d ? [x - d, x + d] : [x]) if (ok(cx)) return {x: cx, y: BW.top(w, cx)};
    const path = pathUp(x, Math.floor(G.p.y - .5));
    if (path) { const [tx] = path[path.length - 1]; return {x: tx, y: BW.top(w, tx)}; }
    const cot = w.cot && BW.at(w, w.cot.x, w.cot.y) === ID.cot ? w.cot : null;
    return cot ? {x: cot.x, y: cot.y + 1} : {x: w.spawn.x, y: w.spawn.y + 1};
  }
  /** GOT THE JITTERS: the swirl / fade, then back on the surface with everything kept (Survival Nights goes on) */
  function jitters() {
    if (G.jitter) return;
    const c = CG(), g = G, ms = R.courage.jitterMs, ov = $('btJitter');
    G.jitter = {t0: performance.now()};
    G.fx.jitters = (G.fx.jitters || 0) + 1;
    Card.close();
    A.Sfx.event('bt-respawn');
    if (ov) { ov.classList.toggle('still', !!RM.matches); ov.hidden = false; void ov.offsetWidth; ov.classList.add('go'); }
    setTimeout(() => {
      if (G !== g) return;
      const p = G.p, spot = surfaceSpot(Math.floor(p.x));
      p.x = spot.x + .5; p.y = spot.y; p.vx = p.vy = 0;
      G.creatures.forEach(k => { if (Math.hypot(k.x - p.x, k.y - p.y) < R.spawn.safe) k.state = 'gone'; });
      G.way = null; G.jitter = null;
      c.value = 1; c.grace = R.courage.graceS; c.refill = false; c.warned = false;
      const msg = 'You got the jitters at the bottom of the world! Back to the surface. (Build something down there to stay brave.)';
      A.UI.toast(msg, {ms: 4200}); say(msg);
      drawCourage(); drawHud();
      if (!G.endless) saveWorld();
      if (ov) { ov.classList.remove('go'); setTimeout(() => { ov.hidden = true; }, 320); }
    }, ms / 2);
  }

  /* ================= THE CAMERA AND DRAWING ================= */
  const lightCv = document.createElement('canvas'), lightG = lightCv.getContext('2d');
  const BD = A.BlocktaveBackdrop.create({col: k => col(k)});
  /* A SLOW DEVICE: frames averaging over backdrop.slowMs to draw (over backdrop.slowFrames frames) = the backdrop's far
     layer only, for good on this device (gameData bgLow) */
  const bgLow = () => !!gd().bgLow;
  function perfWatch() {
    if (bgLow()) return;
    const f = G.frames; if (f.length < R.backdrop.slowFrames || (G.nFrames || 0) % 30) return;
    const ms = f.slice(-R.backdrop.slowFrames).reduce((a, x) => a + x[1], 0) / R.backdrop.slowFrames;
    if (ms > R.backdrop.slowMs) saveGd({bgLow: true});
  }
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
    perfWatch();
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
    // particles, world drops
    G.parts = G.parts.filter(q => (q.t += real) < q.life);
    stepDrops(dt, now);
    stepWay(real, now);
    stepCourage(real, now);
    stepSonar(now);
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
    // THE SKY AND THE PARALLAX BACKDROP (backdrop.js): the biome's three layers, day to night, the cave backdrop below
    const dayMix = Math.max(0, Math.min(1, (sky - R.light.nightSky) / (1 - R.light.nightSky)));
    BD.draw(ctx, {VW, VH, WPX, S, camX, camY, day: dayMix, dusk: 1 - Math.abs(2 * dayMix - 1), now, still: !!RM.matches,
      low: bgLow(), world: w, ground: x => BW.groundAt(w, x, R), open: (x, y) => !B[w.b[y * w.w + x]].solid, seed: w.seed, layer: G.layer});
    // THE TILES: only the visible ones
    const x0 = Math.floor(camX), y0 = Math.floor(camY), ox = (x0 - camX) * S, oy = (y0 - camY) * S;
    ctx.imageSmoothingEnabled = false;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j; if (y < 0 || y >= w.h) continue;
      for (let i = 0; i < cols; i++) {
        const x = x0 + i; if (x < 0 || x >= w.w) continue;
        const v = w.b[y * w.w + x]; if (!v) continue;
        if (v === ID.organ) drawOrganPart(x, y, ox + i * S, oy + j * S); else TILES.draw(ctx, v, ox + i * S, oy + j * S, S);
        if (ORE_FLAG[v] && !G.oreSeen[v]) seeOre(v);
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
    const lv = drawnLight(x0, y0, sky);
    const img = lightG.createImageData(cols, rows), d = img.data;
    for (let k = 0; k < cols * rows; k++) d[k * 4 + 3] = Math.round(255 * R.light.maxShade * (1 - lv[k]));
    lightG.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCv, 0, 0, cols, rows, ox - S / 2, oy - S / 2, cols * S, rows * S);
    drawGlints(x0, y0, ox, oy, lv);
    drawTorchTint(x => (x - camX) * S, y => (y - camY) * S);
    drawCoralGlow(x => (x - camX) * S, y => (y - camY) * S);
    // after the light, so they're always readable: the note bubbles, the reach and the target
    drawDrops(sx, sy, now);
    drawPoofs(sx, sy, now);
    G.creatures.forEach(c => drawBubble(c, sx(c.x), sy(c.y)));
    G.creatures.forEach(c => drawHp(c, sx(c.x), sy(c.y), now));
    drawDamage(sx, sy, now);
    drawReach(sx, sy, now);
    drawLabels(sx, sy, now);
    drawWay(sx, sy);
    drawSonar(sx, sy);
  }
  /** THE NEON TORCH lights while it's in any hotbar slot (rules.js light.torchRadius / torchGlow): drawn only */
  const torchOn = () => !!(G && G.p.hot.includes('torch') && (G.p.inv.torch || 0) > 0);
  /** its soft warm-cyan wash around you (after the light; still: it never flickers) */
  function drawTorchTint(sx, sy) {
    if (!torchOn() || !R.light.torchTint) return;
    const x = sx(G.p.x), y = sy(G.p.y - .9), r = (R.light.torchRadius + (tier() >= 4 ? R.light.batonGlow : 0)) * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col('bt-torch-tint')); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = R.light.torchTint; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  /* THE LIGHT AS DRAWN (world.js lightMap + what only the eye needs): the PLAYER'S GLOW (playerRadius, playerGlow at the
     center, fading; the Golden Baton batonGlow farther), open space underground a little lighter than rock (openLift),
     water never darker than waterMin. G.lightGrid keeps the last frame's (tests: demo.lightAt). */
  function drawnLight(x0, y0, sky) {
    const w = G.w, p = G.p, L = R.light, lamps = G.lamps.filter(q => q.x > x0 - 9 && q.x < x0 + cols + 9 && q.y > y0 - 9 && q.y < y0 + rows + 9);
    const m = BW.lightMap(w, x0, y0, cols, rows, sky, lamps, R), v = m.v;
    const torch = torchOn(), r = (torch ? L.torchRadius : L.playerRadius) + (tier() >= 4 ? L.batonGlow : 0), glow = torch ? L.torchGlow : L.playerGlow, px = p.x, py = p.y - .9;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j; if (y < 0 || y >= w.h) continue;
      for (let i = 0; i < cols; i++) {
        const x = x0 + i; if (x < 0 || x >= w.w) continue;
        const k = j * cols + i, b = B[w.b[y * w.w + x]];
        let l = v[k];
        if (!b.solid && y > BW.top(w, x) && l < .3) l += L.openLift;
        if (b.fluid) l = Math.max(l, L.waterMin);
        const dd = Math.hypot(x + .5 - px, y + .5 - py);
        if (dd < r + 1) l = Math.max(l, glow * (dd < r ? 1 - .4 * (dd / r) ** 2 : .6 * (r + 1 - dd)));
        v[k] = Math.min(1, l);
      }
    }
    G.lightGrid = {x0, y0, cols, rows, v};
    return v;
  }
  /** ORE GLINTS: music blocks keep a faint glow of their color in the dark (still: no twinkle), so they read as "mine me" */
  const GLINT = {toneOre: 'bt-tone', brassOre: 'bt-brass', scaleVein: 'bt-scale', springVein: 'bt-spring', sustain: 'bt-sustain', rhythmRock: 'bt-rhythm', restCrystal: 'bt-rest',
    rumbleOre: 'bt-rumble', piccoloQuartz: 'bt-treble', intervalGeode: 'bt-geode-2', keyQuartz: 'bt-key', dynamicCoral: 'bt-coral', tempoAmber: 'bt-amber'};
  const GLINT_ID = {}; Object.keys(GLINT).forEach(k => { GLINT_ID[ID[k]] = GLINT[k]; });
  function drawGlints(x0, y0, ox, oy, lv) {
    const w = G.w, a0 = R.light.glint; if (!a0) return;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j; if (y < 0 || y >= w.h) continue;
      for (let i = 0; i < cols; i++) {
        const x = x0 + i; if (x < 0 || x >= w.w) continue;
        const c = GLINT_ID[w.b[y * w.w + x]]; if (!c) continue;
        const dark = 1 - lv[j * cols + i]; if (dark < .25) continue;
        const X = ox + i * S, Y = oy + j * S, u = S / 8, h = (x * 7 + y * 13) % 5;
        ctx.fillStyle = col(c);
        ctx.globalAlpha = a0 * dark * .35; ctx.fillRect(X + u, Y + u, S - 2 * u, S - 2 * u);
        ctx.globalAlpha = a0 * dark;                                          // three glint pixels, the same every frame
        ctx.fillRect(X + (1 + h % 3) * u * 1.6, Y + (1 + h % 2) * u * 1.5, u, u);
        ctx.fillRect(X + (4 + h % 2) * u, Y + (5 - h % 2) * u, u * .8, u * .8);
        ctx.fillRect(X + (2 + h % 4) * u, Y + (3 + h % 3) * u, u * .6, u * .6);
      }
    }
    ctx.globalAlpha = 1;
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
    if (G.p.hot[G.p.sel] === 'torch' && torchOn() && !G.swing) {            // the torch in the avatar's hand while it's the selected slot
      const ic = iconCanvas('torch'), w = S * .7;
      ctx.save(); ctx.translate(x + p.face * S * .32, y - S * 1.05); if (p.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(ic, -w * .25, -w * .75, w, w); ctx.restore();
    }
    // WORN GEAR: small badges over the body (never a new sprite): the armor on the chest, the shield at the front arm
    const W = p.wear, bw = S * .5;
    if (W.armor) { ctx.globalAlpha = .9; ctx.drawImage(iconCanvas(W.armor.id), x - bw / 2, y - S * 1.25, bw, bw); ctx.globalAlpha = 1; }
    if (W.shield) ctx.drawImage(iconCanvas(W.shield.id), x + p.face * S * .36 - bw / 2, y - S * .95, bw, bw);
    const bf = G.blockAt ? (now - G.blockAt) / R.defense.flashMs : 1;     // a BLOCK: one soft ring that fades (no flashing)
    if (bf < 1) {
      ctx.globalAlpha = .7 * (1 - bf); ctx.strokeStyle = col('bt-silver'); ctx.lineWidth = Math.max(2, S * .12);
      ctx.beginPath(); ctx.ellipse(x, y - S * .95, S * (.6 + (RM.matches ? 0 : bf * .25)), S * (1.05 + (RM.matches ? 0 : bf * .25)), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (p.gliding) {                                                     // the Piccolo Glider: a small swept wing over the head
      const u = S / 16, gy = y - S * 2.05;
      ctx.fillStyle = col('bt-treble'); ctx.beginPath(); ctx.moveTo(x - 9 * u, gy + 2 * u); ctx.quadraticCurveTo(x, gy - 3 * u, x + 9 * u, gy + 2 * u); ctx.lineTo(x, gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col('bt-slate-2'); ctx.lineWidth = Math.max(1, u * .7); ctx.beginPath(); ctx.moveTo(x - 3 * u, gy + 1 * u); ctx.lineTo(x - 2 * u, gy + 6 * u); ctx.moveTo(x + 3 * u, gy + 1 * u); ctx.lineTo(x + 2 * u, gy + 6 * u); ctx.stroke();
    }
    drawSwing(x, y, now);
  }
  /* ================= THE SWING (mining, a creature tapped, a block's challenge passed) =================
     The avatar turns to the target and its tool (the item's own icon: Wooden / Brass / Silver Mallet, Golden Baton)
     arcs from behind its head down toward it in rules.js swingMs; no tool = a quick reach. A new swing restarts it.
     Reduced motion / MOTION off: none. */
  const TOOL_OF = ['', 'mallet1', 'mallet2', 'mallet3', 'baton'];
  function swing(tx, ty) {
    if (!G) return;
    const p = G.p, dx = tx - p.x;
    if (Math.abs(dx) > .05) p.face = Math.sign(dx);
    if (RM.matches) return;
    const sh = {x: p.x + p.face * .15, y: p.y - 1.35};
    G.swing = {t0: performance.now(), tool: TOOL_OF[tier()], face: p.face, end: Math.atan2(ty - sh.y, Math.abs(tx - sh.x))};
    G.fx.swings = (G.fx.swings || 0) + 1;
  }
  function drawSwing(x, y, now) {
    const sw = G.swing; if (!sw) return;
    const f = (now - sw.t0) / R.swingMs;
    if (f >= 1 || RM.matches) { G.swing = null; return; }
    const e = 1 - Math.pow(1 - f, 3);                                    // fast, then easing into the target
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(x + sw.face * S * .15, y - S * 1.35); ctx.scale(sw.face, 1);
    if (sw.tool) {
      const a0 = -2.2, a1 = Math.max(-.6, Math.min(1.2, sw.end)), a = a0 + (a1 - a0) * e, L = S * 1.1;
      // the icon's handle is at its lower left, its head up to the right (about 53° up): turn it to point along `a`
      ctx.rotate(a + .93);
      ctx.drawImage(iconCanvas(sw.tool), -L * .25, -L * .875, L, L);
    } else {
      const reach = Math.sin(Math.PI * Math.min(1, f * 1.2)) * S * .55;
      ctx.fillStyle = col('bt-sand'); ctx.beginPath(); ctx.arc(reach + S * .1, S * .35, S * .13, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  /* ================= THE POOF (a creature calmed): a soft puff of cloud in its colors and a few notes floating up;
     the creature shrinks into it. Never a flash, never bright white. Reduced motion: none (the creature just fades). */
  const POOF_COL = {clam: ['bt-clam', 'bt-clam-2'], wisp: ['bt-wisp', 'bt-rhythm'], rusher: ['bt-rusher', 'bt-brass'], zipper: ['bt-zipper', 'bt-zipper-2']};
  function poof(c) {
    A.Sfx.event('bt-poof');
    if (RM.matches) return;
    (G.poofs || (G.poofs = [])).push({x: c.x, y: c.kind === 'wisp' ? c.y : c.y - .4, t0: performance.now(), kind: c.kind, seed: Math.random() * 6});
    G.fx.poofs = (G.fx.poofs || 0) + 1;
  }
  function drawPoofs(sx, sy, now) {
    const P = G.poofs; if (!P || !P.length) return;
    G.poofs = P.filter(q => now - q.t0 < R.poofMs);
    G.poofs.forEach(q => {
      const f = (now - q.t0) / R.poofMs, x = sx(q.x), y = sy(q.y), cols = POOF_COL[q.kind] || POOF_COL.clam;
      oc.globalAlpha = .7 * (1 - f);
      for (let k = 0; k < 6; k++) {
        const a = q.seed + k * 1.047, r = S * (.18 + .55 * f), d = S * (.15 + .45 * f);
        oc.fillStyle = col(cols[k % 2]); oc.beginPath(); oc.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, r * (k % 2 ? .8 : 1), 0, 7); oc.fill();
      }
      oc.globalAlpha = 1 - f; oc.fillStyle = col('bt-moss'); oc.textAlign = 'center'; oc.textBaseline = 'middle';
      oc.font = `${Math.round(S * .5)}px "GN Music","Noto Music",serif`;
      [-.45, .1, .5].forEach((dx, k) => oc.fillText(k % 2 ? '♫' : '♪', x + dx * S, y - S * (.3 + f * (1 + k * .25))));
      oc.globalAlpha = 1;
    });
  }
  function drawBag(x, y) {
    ctx.fillStyle = col('bt-bag'); ctx.beginPath(); ctx.ellipse(x, y, S * .35, S * .3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = col('bt-brass'); ctx.lineWidth = S * .06; ctx.beginPath(); ctx.moveTo(x - S * .15, y - S * .28); ctx.lineTo(x + S * .15, y - S * .28); ctx.stroke();
  }
  /** the target highlight (a tile in reach, under the mouse or the last tap) and, for a moment, a tap out of reach */
  function drawReach(sx, sy, now) {
    const t = G.target;
    if (t && inReach(t.x, t.y)) {                                         // bright, whatever the light: a dark edge, then the color
      oc.strokeStyle = col('bt-ink'); oc.lineWidth = 5; oc.strokeRect(sx(t.x) + 1.5, sy(t.y) + 1.5, S - 3, S - 3);
      oc.strokeStyle = col(G.build ? 'bt-build' : 'bt-mine'); oc.lineWidth = 3;
      oc.strokeRect(sx(t.x) + 1.5, sy(t.y) + 1.5, S - 3, S - 3);
      const v = BW.at(G.w, t.x, t.y), sm = v && B[v].sign ? G.w.meta[t.x + ',' + t.y] : null;
      const name = v ? B[v].name + (B[v].sign && !(sm && sm.mate) ? ' (no partner)' : '') : '';   // the target's name over it
      if (name && !G.build) {
        oc.font = '700 13px "GN Text", system-ui, sans-serif'; oc.textAlign = 'center'; oc.textBaseline = 'bottom';
        oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.strokeText(name, sx(t.x) + S / 2, sy(t.y) - 3);
        oc.fillStyle = col('bt-mine'); oc.fillText(name, sx(t.x) + S / 2, sy(t.y) - 3);
      }
      G.targetName = name;
    } else G.targetName = '';
    const f = G.far;
    if (f && now - f.t0 < R.farFlashMs) {
      oc.globalAlpha = .55 * (1 - (now - f.t0) / R.farFlashMs);
      oc.strokeStyle = col('bt-far'); oc.lineWidth = 2;
      oc.strokeRect(sx(f.x) + 1.5, sy(f.y) + 1.5, S - 3, S - 3);
      oc.globalAlpha = 1;
    } else if (f) G.far = null;
  }

  /* ================= MINING AND BUILDING ================= */
  /** a tap on a block OUT of reach: its faint red outline for farFlashMs, and "Too far: walk closer!" (at most every farToastS) */
  function tooFar(x, y) {
    const now = performance.now();
    G.far = {x, y, t0: now};
    if (now - (G.farAt || -1e9) >= R.farToastS * 1000) { G.farAt = now; A.UI.toast('Too far: walk closer!', {ms: 1400}); }
  }
  const inReach = (x, y) => Math.hypot(x + .5 - G.p.x, y + .5 - (G.p.y - .9)) <= R.player.reach + .01;
  function tileAt(clientX, clientY) { return {x: Math.floor(camX + clientX / S), y: Math.floor(camY + clientY / S)}; }
  /** a tap / click on the world: a creature, else the block (MINE mode breaks, BUILD mode places or uses) */
  function tapWorld(clientX, clientY, alt) {
    if (!G || G.held || pause.paused || Card.current) return;
    const wx = camX + clientX / S, wy = camY + clientY / S;
    const cr = G.creatures.find(c => c.state === 'live' && Math.abs(c.x - wx) < .9 && wy > c.y - 1.4 && wy < c.y + .4);
    if (cr) { swing(cr.x, cr.y - .4); return creatureCard(cr); }
    const t = tileAt(clientX, clientY);
    G.target = t;
    act(t.x, t.y, alt ? !G.build : G.build);
  }
  function act(x, y, build) {
    if (!inReach(x, y)) { tooFar(x, y); return; }
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
    swing(x + .5, y + .5);
    const need = b.tier || 0, have = tier();
    if (have < need) {
      if (b.key === 'toneOre' && have < 1 && !seen('ore-mallet')) { firstCard('ore-mallet', 'Tone Ore!', 'You need a Wooden Mallet for this! Make one in the Measure: Planks, Planks, Cork.'); return false; }
      A.UI.toast(`${b.name} needs a ${R.tools[need]}. Tap CRAFT to make one!`, {ms: 2200}); return false;
    }
    if (b.mine === 'tap') { breakBlock(x, y, b, 1); return true; }
    return challengeFor(b, x, y);
  }
  function breakBlock(x, y, b, n) {
    const w = G.w, m0 = w.meta[x + ',' + y];
    if (b.door) { [y - 1, y, y + 1].forEach(yy => { if (B[BW.at(w, x, yy)].door) BW.put(w, x, yy, ID.air); }); }
    else if (b.key === 'organ') organTiles(x, y).forEach(([ox, oy]) => { BW.put(w, ox, oy, ID.air); delete w.meta[ox + ',' + oy]; });
    else BW.put(w, x, y, m0 && m0.water ? ID.water : ID.air);
    if (b.sign && m0 && m0.mate) { const mm = w.meta[m0.mate]; if (mm) mm.mate = null; }   // its partner: "No partner" until a new one
    delete w.meta[x + ',' + y];
    if (b.key === 'locker') { const m = w.lockers && w.lockers[x + ',' + y]; if (m) { Object.entries(m).forEach(([k, c]) => gain(k, c, true)); delete w.lockers[x + ',' + y]; drawHot(); } }
    if (b.drop) dropItem(b.drop, n, x + .5, y + .5);                    // it pops out of the broken block and falls
    chips(x + .5, y + .5, col(CHIP[b.key] || 'bt-dirt-2'));
    A.Sfx.event('bt-break');
    stats().mined++; G.mined++; saveGd();
    if (b.light || b.key === 'metronome' || b.key === 'tuner' || b.use || b.key === 'organ') scanGear();
    checkRooms(x, y);
    return true;
  }
  /** a block breaking: a few little chips in its color (rules.js chips; none with reduced motion) */
  const CHIP = {toneOre: 'bt-tone', brassOre: 'bt-brass', scaleVein: 'bt-scale', springVein: 'bt-spring', sustain: 'bt-sustain', rhythmRock: 'bt-rhythm',
    restCrystal: 'bt-rest', moss: 'bt-moss', sand: 'bt-sand', clay: 'bt-clay-2', slate: 'bt-slate-2', leaves: 'bt-leaf-hi', maple: 'bt-maple', cork: 'bt-cork',
    reed: 'bt-reed', felt: 'bt-felt-2', rawhide: 'bt-rawhide', planks: 'bt-plank', brick: 'bt-brick', glass: 'bt-glass', panel: 'bt-panel-2',
    rumbleOre: 'bt-rumble', piccoloQuartz: 'bt-treble', intervalGeode: 'bt-geode-2', keyQuartz: 'bt-key', dynamicCoral: 'bt-coral', tempoAmber: 'bt-amber',
    trampoline: 'bt-tramp', organ: 'bt-organ-pipe', corallamp: 'bt-coral'};
  function chips(x, y, c) {
    if (RM.matches) return;
    G.fx.chips = (G.fx.chips || 0) + 1;
    for (let k = 0; k < R.chips.n; k++) G.parts.push({x, y, vx: (Math.random() - .5) * 1.8, vy: (Math.random() - .9) * 1.6, t: 0, life: R.chips.ms / 1000, c});
    if (G.parts.length > 60) G.parts.splice(0, G.parts.length - 60);
  }
  function place(x, y, id) {
    const it = ITEMS[id];
    if (it && it.hotbar && !it.block) { A.UI.toast('Carry it in your hotbar to light the way.', {ms: 2000}); return false; }   // the Neon Torch is carried, never placed
    if (it && it.kind === 'gear') { A.UI.toast('Keep it in your hotbar: it works from there.', {ms: 2000}); return false; }
    if (!id || !it || !it.block) { A.UI.toast(id ? `${itemName(id)} can't be placed.` : 'Pick something to build from your hotbar.', {ms: 1800}); return false; }
    if (!have(id)) return false;
    const w = G.w, here = B[BW.at(w, x, y)], nb = B[ID[it.block]];
    if (here.key !== 'air' && here.key !== 'water') return false;
    if (nb.solid && collidesBox(x, y)) { A.UI.toast('You are standing there!', {ms: 1200}); return false; }
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = BW.at(w, x + dx, y + dy); return v !== ID.air && v !== ID.water; });
    if (!next) { A.UI.toast('Build next to another block.', {ms: 1400}); return false; }
    if (B[ID[it.block]].sign && signCount(it.block) >= R.signs.maxPairs) { A.UI.toast(`Your world has ${R.signs.maxPairs} sign pairs. Break one to build another.`, {ms: 2600}); return false; }
    if (it.block === 'organ') return placeOrgan(x, y);
    if (it.block === 'door') {                                            // a door is 2 blocks tall
      const up = B[BW.at(w, x, y - 1)];
      if (up.key !== 'air' && up.key !== 'water') { A.UI.toast('A door needs 2 blocks of room.', {ms: 1400}); return false; }
      if (collidesBox(x, y - 1)) return false;
      BW.put(w, x, y - 1, ID.door);
    }
    const wasWater = here.key === 'water';
    BW.put(w, x, y, ID[it.block]);
    if (it.block === 'composer') w.meta[x + ',' + y] = {pitch: defaultPitch()};
    if (it.block === 'corallamp' && wasWater) w.meta[x + ',' + y] = {water: 1};   // breaking it lets the water back
    if (nb.sign) pairSign(x, y, it.block);
    take(id);
    A.Sfx.event('bt-place');
    if (nb.light) { scanGear(); if (it.block === 'lamp') award('lamp'); }
    if (nb.sign && !seen('signs')) firstCard('signs', 'D.S. al Coda!', 'D.S. al Coda = go back to the sign, then jump to the coda. Place a Segno Sign and a Coda Sign anywhere in your world, then tap one in BUILD mode to travel to the other!');
    if (['metronome', 'tuner', 'bench'].includes(it.block)) scanGear();
    if (it.block === 'bench') award('bench');
    if (it.block === 'composer' && !seen('composer')) firstCard('composer', 'The composing corner!', `Composer Blocks are yours to write music with. Put up to 8 in a row, tap each one in BUILD mode to pick its note, then put a Conductor's Podium at the end. ${mode === 'inst' ? 'Play' : 'Tap'} your melody at the podium to power the row: it lights up and opens a door next to it!`);
    checkRooms(x, y);
    brave();
    return true;
  }
  const collidesBox = (x, y) => { const p = G.p; return x + 1 > p.x - HW && x < p.x + HW && y + 1 > p.y - PH && y < p.y; };
  function useBlock(b, x, y) {
    const r = useBlock0(b, x, y);
    if (r) brave();
    return r;
  }
  function useBlock0(b, x, y) {
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
    if (b.sign) return travel(x, y);
    if (b.key === 'organ') return playOrgan(x, y);
    return false;
  }
  function eat() {
    if (!have('snack')) return;
    if (G.p.hearts >= maxHearts()) { A.UI.toast('Your hearts are full!', {ms: 1200}); return; }
    take('snack'); G.p.hearts = Math.min(maxHearts(), G.p.hearts + R.player.snackHeal);
    pickupLabel('snack', R.player.snackHeal, `+${R.player.snackHeal} Hearts`);
    brave();
    A.Sfx.event('bt-pickup'); drawHud();
  }
  const maxHearts = () => G.endless ? R.endless.hearts : R.player.hearts;
  function defaultPitch() { const n = inst.notes && inst.notes[0]; return n && !snare ? A.music.writtenMidi(n) : 72; }

  /* ================= THE CHALLENGES (challenges.js draws the card) ================= */
  /** the notes a card asks for here: the pool by depth (surface = first five, middle = a concert scale, the deep layers =
      chromatic), the clef by depth (Treble Peaks = treble, Bass Depths = bass, else the student's own) */
  const POOLS = {surface: 'first5', middle: null, peaks: 'chrom', depths: 'chrom'};
  const SCALES = ['Bb', 'Eb', 'F', 'Ab'];
  /* THE OTHER CLEF'S COMFORTABLE RANGE (written MIDI) and its middle line (treble B4, bass D3). Other-clef cards keep to
     it: single notes are picked inside it; a SCALE (which must stay in order) is MOVED BY WHOLE OCTAVES into it (display
     only: the shift that puts the most of its notes inside, ties to the one nearest the middle line); spelling, key
     signature and order never change, and playing is by pitch class (Pitch.onHeld pc; the sustain card's cents are
     measured mod 12), so a moved scale never asks for an octave the student can't play. */
  const OTHER_RANGE = R.otherRange;
  const OTHER_FIT = {treble: m => m >= OTHER_RANGE.treble[0] && m <= OTHER_RANGE.treble[1], bass: m => m >= OTHER_RANGE.bass[0] && m <= OTHER_RANGE.bass[1]};
  /** the octave shift (in octaves) that puts the most of these written MIDIs inside the clef's comfortable range */
  function octaveShift(midis, clef) {
    const [lo, hi, mid] = OTHER_RANGE[clef], avg = midis.reduce((a, b) => a + b, 0) / Math.max(1, midis.length);
    let best = 0, bestIn = -1, bestD = Infinity;
    for (let k = -4; k <= 4; k++) {
      const inR = midis.filter(m => m + 12 * k >= lo && m + 12 * k <= hi).length, d = Math.abs(avg + 12 * k - mid);
      if (inR > bestIn || (inR === bestIn && d < bestD)) { best = k; bestIn = inR; bestD = d; }
    }
    return best;
  }
  /** a written note moved by k octaves (its spelling kept) */
  const moveNote = (nt, k) => !k || !nt ? nt : Object.assign({}, nt, {oct: nt.oct + k}, nt.midi != null ? {midi: nt.midi + 12 * k} : {});
  const moveItem = (it, k) => !k ? it : Object.assign({}, it, {n: moveNote(it.n, k), show: moveNote(it.show, k), midi: it.midi + 12 * k});
  function notesAt(x, y, n, {order = 'random', pool} = {}) {
    const z = BW.zone(G.w, x, y, R);
    const clef = z.layer === 'peaks' ? 'treble' : z.layer === 'depths' ? 'bass' : readG().clef;
    const notes = pool || POOLS[z.layer] || SCALES[Math.floor(Math.random() * SCALES.length)];
    const other = clef !== readG().clef;
    const seq = A.buildSequence({member: readM(), group: readG(), notes, order, level: 2, count: order === 'order' ? Math.max(n, 8) : Math.max(24, n * 3)});
    let items = order === 'order' ? seq.items.slice(0, n) : seq.items, shift = 0;
    if (other && order === 'order') {                                     // a scale: the whole scale moves by octaves
      shift = octaveShift(items.map(it => it.midi), clef);
      items = items.map(it => moveItem(it, shift));
    } else if (other) {                                                   // single notes: the ones inside the range …
      const f = items.filter(it => OTHER_FIT[clef](it.midi));
      if (f.length >= n) items = f;
      else {                                                              // … else the same octave shift as a fallback
        shift = octaveShift(items.map(it => it.midi), clef);
        items = items.map(it => moveItem(it, shift));
        const f2 = items.filter(it => OTHER_FIT[clef](it.midi)); if (f2.length >= n) items = f2;
      }
    }
    items = items.slice(0, n);
    const fitAll = other ? seq.fit.map(s => moveNote(s, shift)) : seq.fit;
    const fit = other ? fitAll.filter(s => OTHER_FIT[clef](A.music.writtenMidi(s))) : fitAll;
    return {items, clef, sig: seq.sig, fit: fit.length ? fit : items.map(i => i.show), other, shifted: shift !== 0, nameOf: seq.name,
            spelled: seq.spelled};                                        // TOUCH: the answer pad's spelled buttons (null: Chromatic)
  }
  /** the note names under the staff: after hintAfterWrong wrong answers, and the first otherClefNames other-clef cards
      (counted in gameData otherClef); returns 'other' when it's the other-clef reason */
  function hintNow(set) {
    if (G.wrong >= R.hintAfterWrong) return true;
    if (set.other) { const k = gd().otherClef || 0; if (k < R.otherClefNames) { gd().otherClef = k + 1; saveGd(); return 'other'; } }
    return false;
  }
  /** a moved other-clef scale says so (with the names, the first otherClefNames times) */
  const shiftNote = (set, h) => set.shifted && h === 'other' ? `${set.clef === 'bass' ? 'Bass' : 'Treble'} clef! Play it where it sits on your instrument.` : null;
  const RD_CELLS = () => [...new Set((window.RD_LEVELS || []).slice(0, R.rhythmLevels || 5).flatMap(L => [].concat(L.time).includes('4/4') ? (Array.isArray(L.cells) ? L.cells : (L.cells && L.cells['4/4']) || []) : []))];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const RESTS = ['wr | q qr hr', 'hr hr | q qr hr', 'hr qr qr | q qr hr', 'qr qr hr | q qr hr', 'qr hr qr | q qr hr'];
  /** the card for a performance kind at this spot (blocks, recipes, creatures): {kind, …} for challenges.js */
  function spec(kind, x, y, n) {
    const t = tier(), baton = t >= 4;
    if (drum()) {
      if (kind === 'tone' || kind === 'note' || kind === 'notes3') return {kind: 'count', n: kind === 'notes3' ? 4 : R.snareCount[0] + Math.floor(Math.random() * (R.snareCount[1] - R.snareCount[0] + 1)), sub: 'Count your hits'};
      if (kind === 'scale' || kind === 'rhythm') return {kind: 'rhythm', text: pick(RD_CELLS()), sub: 'Play the rhythm'};
      if (kind === 'sustain' || kind === 'longtone') return {kind: 'roll', secs: baton ? R.rollS * .7 : R.rollS, sub: 'An even roll'};
    }
    if (kind === 'tone' || kind === 'note' || kind === 'notes3') {
      const set = notesAt(x, y, n || (kind === 'notes3' ? 3 : 1));
      const h = hintNow(set);
      return Object.assign({kind: 'notes', sub: mode === 'inst' ? (set.items.length > 1 ? 'Play the notes' : 'Play the note') : (set.items.length > 1 ? 'Tap the note names' : 'Tap the note name'), hint: !!h, note: shiftNote(set, h)}, set);
    }
    if (kind === 'scale') {
      const set = notesAt(x, y, n || 5, {order: 'order', pool: n === 8 ? 'Bb' : SCALES[Math.floor(Math.random() * SCALES.length)]}), h = hintNow(set);
      return Object.assign({kind: 'notes', sub: 'A scale, in order', hint: !!h, note: shiftNote(set, h)}, set);
    }
    if (kind === 'sustain' || kind === 'longtone') {
      if (mode === 'touch') return {kind: 'key', member: readM(), clef: readG().clef, sub: 'A music question'};
      const set = notesAt(x, y, 1);
      return Object.assign({kind: 'sustain', secs: kind === 'longtone' ? 4 : baton ? R.sustainBatonS : R.sustainS, sub: 'A long tone', hint: !!hintNow(set)}, set);
    }
    // --- CHAPTER 6'S ORES ---
    if (kind === 'lowread' || kind === 'highread') {
      if (drum()) return {kind: 'rhythm', text: pick(RD_CELLS()), sub: 'Play the rhythm'};
      const set = ledgerSet(kind === 'lowread' ? 'below' : 'above', n || 3), h = G.wrong >= R.hintAfterWrong;
      return Object.assign({kind: 'notes', sub: kind === 'lowread' ? 'Low notes, going down' : 'High notes, going up', hint: h}, set);
    }
    if (kind === 'interval') {
      if (drum()) return {kind: 'count', n: R.snareCount[0] + Math.floor(Math.random() * (R.snareCount[1] - R.snareCount[0] + 1)), sub: 'Count your hits'};
      return Object.assign({kind: 'interval', sub: 'An interval', hint: G.wrong >= R.hintAfterWrong}, intervalSet());
    }
    if (kind === 'keysig') {
      if (drum()) return {kind: 'rhythm', text: pick(RD_CELLS()), sub: 'Play the rhythm'};
      return {kind: 'keysig', member: readM(), clef: readG().clef, sub: 'A key signature'};
    }
    if (kind === 'dynamics') return {kind: 'dynamics', item: drum() ? null : firstNote(), sub: 'Soft, then loud'};
    if (kind === 'tempo') {
      const bpm = pick(R.tempo.choices), TW = A.TempoWords;
      return {kind: 'tempo', bpm, word: TW ? TW.tempoWord(bpm) : 'Tempo', beats: n || R.notes.tempo[2], sub: 'Keep the tempo'};
    }
    if (kind === 'rhythm') return {kind: 'rhythm', text: pick(RD_CELLS()), sub: mode === 'inst' ? 'Play the rhythm' : 'Tap the rhythm'};
    if (kind === 'rest') return {kind: 'rest', text: pick(RESTS), sub: 'Rests, then the downbeat'};
    if (kind === 'beats') return {kind: 'rhythm', text: 'q q q q', sub: '4 steady beats'};
    return {kind: 'notes', items: []};
  }
  /* RUMBLE ORE / PICCOLO QUARTZ: n notes with 1–3 LEDGER LINES below the bass staff (E2 … A1, going DOWN) or above the
     treble staff (A5 … E6, going UP), spelled naturally (no key signature); judged by pitch class, so each is played where
     it sits on the student's instrument. The staff box grows to fit them (challenges.js staffBox). */
  const LEDGER = {below: {clef: 'bass', notes: ['E2', 'D2', 'C2', 'B1', 'A1']}, above: {clef: 'treble', notes: ['A5', 'B5', 'C6', 'D6', 'E6']}};
  /** a written note as a card item; `sounding` = where it sits on the student's instrument (moved by octaves into its
      sounding range: these cards are judged by pitch class, and ?demo plays this one) */
  const dressNote = n => {
    const m = readM(), midi = A.music.writtenMidi(n); let sounding = midi - (m.sounds || 0);
    if (m.soundLow != null) { while (sounding < m.soundLow) sounding += 12; while (sounding > m.soundHigh) sounding -= 12; }
    return {n, show: n, label: Card.label(n), midi, sounding, pc: mod(sounding, 12)};
  };
  function ledgerSet(dir, n) {
    const L = LEDGER[dir], pool = L.notes.map(A.music.parseNote), picked = [];
    while (picked.length < Math.min(n, pool.length)) { const k = Math.floor(Math.random() * pool.length); if (!picked.includes(k)) picked.push(k); }
    const items = picked.sort((a, b) => a - b).map(k => dressNote(pool[k]));    // the pool runs away from the staff: going down / up
    return {items, clef: L.clef, sig: null, fit: items.map(i => i.show), other: L.clef !== readG().clef};
  }
  /** INTERVAL GEODE: two notes of one of the member's scales (both in range), a 2nd up to an octave */
  function intervalSet() {
    const seq = A.buildSequence({member: readM(), group: readG(), notes: pick(SCALES), order: 'order', level: 2, count: 8}), sc = seq.items.slice(0, 8);
    const size = 1 + Math.floor(Math.random() * 7), lo = Math.floor(Math.random() * (8 - size));
    return {items: [sc[lo], sc[lo + size]], size: size + 1, clef: readG().clef, sig: seq.sig, fit: seq.fit, nameOf: seq.name};
  }
  /** DYNAMIC CORAL: a comfortable note to play soft, then loud (the first of the member's first five) */
  const firstNote = () => { const g = readG(), n = g.notes && g.notes[0]; return n ? dressNote(Object.assign({}, n)) : null; };
  /** a block's place on screen, as a function: the card beside it follows the camera (challenges.js follow) */
  function screenAt(x, y) { return () => ({x: (x + .5 - camX) * S, y: (y + .5 - camY) * S}); }
  function openCard(sp, at, title, onDone) {
    listenSync(true);
    const c = Card.open(Object.assign({mode, snare, title, at, countoff: gd().countoff !== false, onDone: r => { listenSync(); if (r && r.ok) { A.store.noteFinished(GAME_ID); if (R.courage.resetOnMine) brave(); } onDone(r); }, onCancel: () => listenSync()}, sp));
    if (!seen('mining')) firstCard('mining', mode === 'inst' ? 'Mining = playing!' : 'Mining = music!', mode === 'inst'
      ? (snare ? 'Music blocks need a performance: count your hits, play a rhythm or an even roll. Play it right and the block breaks, with double the loot!' : 'Music blocks need a performance: play the note on the card on your instrument. Play it right and the block breaks, with double the loot! Rhythm cards count in with a silent light.')
      : 'Music blocks need a performance: tap the note names on the card (or tap the rhythm). A wrong answer keeps the block: just try again!');
    return c;
  }
  function challengeFor(b, x, y) {
    const t = Math.min(4, tier()), n = (R.notes[b.mine] || [])[t];
    if (!n) { A.UI.toast(`${b.name} needs a better mallet.`, {ms: 1800}); return false; }
    const sp = spec(b.mine, x, y, ['tone', 'scale', 'lowread', 'highread', 'tempo'].includes(b.mine) ? n : 0);
    openCard(sp, screenAt(x, y), b.name, r => {
      if (!G) return;
      if (r.ok) {
        G.wrong = 0;
        const n2 = (R.drops[b.mine] || 1) * (mode === 'inst' ? R.instrumentBonus : 1);
        swing(x + .5, y + .5);
        if (BW.at(G.w, x, y) === b.id) breakBlock(x, y, b, n2);
        A.Sfx.event('bt-mined');
        if (b.mine === 'tone') { stats().ore++; saveGd(); if (stats().ore >= R.goals.toneOre) award('ore10'); drawGoals(); }
        if (b.key === 'sustain') award('sustain');
        if (b.key === 'rumbleOre' || b.key === 'piccoloQuartz') { const st = stats(); st[b.key] = 1; saveGd(); if (st.rumbleOre && st.piccoloQuartz) award('extremes'); }
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
  // what each performance asks (the result box and the Recipe Book)
  const PERF = {note: 'Play 1 note', notes3: 'Play 3 notes', beats: '4 steady beats', longtone: 'A 4-second long tone', scale: 'Concert B♭ scale'};
  const PERF_TOUCH = {note: 'Tap 1 note name', notes3: 'Tap 3 note names', beats: 'Tap 4 steady beats', longtone: 'A key-signature question', scale: 'Concert B♭ scale (tap its notes)'};
  const PERF_SNARE = {note: 'Count your hits', notes3: 'Count your hits', beats: '4 steady beats', longtone: 'An even roll', scale: 'Play a rhythm'};
  const ORD = ['1st', '2nd', '3rd', '4th'];
  let missing = null;                                                    // the Recipe Book: a recipe tapped without its items
  function openCraft() {
    closePanels();
    $('craft').hidden = false; G.panel = 'craft';
    // the first time: one line on the shortcuts (taps fill the slots too)
    $('craftTip').hidden = seen('craftTip'); markSeen('craftTip');
    drawCraft();
    $('craftClose').focus();
  }
  /** THE MEASURE, a crafting station: a wooden workbench with a staff carved on its edge, 4 big labeled slots IN ORDER
      (1st … 4th), an arrow to the RESULT (? until the slots match a recipe: its icon, name, × n, the performance), MAKE IT
      (the performance: disabled until a match, and without a Luthier's Bench nearby when the recipe needs one); your
      materials below (tap or drag into the next empty slot); the Recipe Book fills the slots in order. BT_RECIPES and
      match() are the rules: only the screen is the station. */
  function drawCraft() {
    const m = match(), f = gd().found || {};
    $('measure').innerHTML = slots.map((s, i) => `<div class="bt-slotwrap"><span class="bt-slotlbl">${ORD[i]}</span>` +
      `<button type="button" class="bt-slot${s ? ' full' : ''}" data-i="${i}"${s ? ` data-item="${s}"` : ''} aria-label="${s ? ORD[i] + ': ' + esc(itemName(s)) + ' (tap to take it out)' : ORD[i] + ' slot: empty'}">` +
      (s ? `<img src="${iconURL(s)}" alt=""><span class="bt-slotname">${esc(itemName(s))}</span><span class="bt-slotx" aria-hidden="true">✕</span>` : `<span class="bt-plus" aria-hidden="true">+</span>`) +
      `</button>${s ? '' : `<small class="bt-slotcap">Material ${i + 1}</small>`}</div>`).join('');
    $('measure').querySelectorAll('.bt-slot').forEach(b => b.onclick = () => {
      if (!slots[+b.dataset.i]) return;
      slots[+b.dataset.i] = null; const rest = slots.filter(Boolean); slots.fill(null); rest.forEach((x, k) => { slots[k] = x; });
      missing = null; A.Sfx.event('ui-toggle'); drawCraft();
    });
    const perf = r => (mode === 'inst' ? (snare ? PERF_SNARE : PERF) : PERF_TOUCH)[r.perf];   // the MODE first, then the snare
    const res = $('recipeLine');
    if (m) {
      const bench = !m.bench || benchNear();
      res.className = 'bt-result on' + (bench ? '' : ' nobench');
      res.innerHTML = `<img src="${iconURL(m.out)}" alt=""><b>${esc(m.name)}</b>${m.n > 1 ? `<span class="bt-resn">× ${m.n}</span>` : ''}<span class="bt-resperf">${esc(perf(m))}</span>` +
        (bench ? '' : `<em>Needs a Luthier's Bench nearby</em>`);
      res.dataset.item = m.out;
      $('perform').disabled = !bench;
    } else {
      res.className = 'bt-result';
      res.innerHTML = `<span class="bt-resq" aria-hidden="true">?</span><span class="bt-resperf">${slots.some(Boolean) ? 'No recipe with these, in this order.' : 'The result shows here.'}</span>`;
      delete res.dataset.item;
      $('perform').disabled = true;
    }
    const ids = Object.keys(G.p.inv).filter(k => G.p.inv[k] > 0 && ITEMS[k] && ITEMS[k].kind !== 'tool');
    $('craftItems').innerHTML = ids.length ? ids.map(k => { const left = G.p.inv[k] - usedOf(k);
      return `<button type="button" class="bt-chip bt-mat" data-id="${k}" data-item="${k}" ${left > 0 ? '' : 'disabled'}><img src="${iconURL(k)}" alt=""><span>${esc(itemName(k))}</span><b>${left}</b></button>`; }).join('')
      : '<p class="ui-msg empty">Nothing yet: mine some blocks!</p>';
    $('craftItems').querySelectorAll('.bt-chip').forEach(b => { b.onclick = () => { if (dragJustEnded()) return; addToSlot(b.dataset.id); }; dragTile(b); });
    // THE RECIPE BOOK (+ its search: searchBook)
    $('bookBtn').setAttribute('aria-pressed', String(book));
    craftLayout();
    if (!book && bookQ) { bookQ = ''; $('bookSearch').value = ''; }
    if (book) drawBook(perf);
    $('bookCount').textContent = `${Object.keys(f).filter(k => RECIPES.some(r => r.id === k)).length} / ${RECIPES.length}`;
  }
  /* THE LAYOUT: the bench, then YOUR MATERIALS right under it, then the Recipe Book (never between them). A WIDE panel
     (≥ R.craftWide px: iPad landscape, Chromebooks) = two columns: the bench + materials left, the book right with its own
     scroll (the book closed = the left column takes the full width). NARROW (phones, iPad portrait): the bench is sticky at
     the top while the rest scrolls, and TABS under it, Materials | Recipe Book, one at a time (the Recipe Book button and a
     tab both pick it; a recipe tap fills the slots and goes back to Materials). */
  const craftWide = () => innerWidth - R.craftGutter >= R.craftWide;
  function craftLayout() {
    const wide = craftWide(), c = $('craft');
    c.classList.toggle('wide', wide); c.classList.toggle('book', book);
    $('bookWrap').hidden = !book;
    $('matsPane').hidden = !wide && book;
    $('craftTabs').hidden = wide;
    [['tabMats', !book], ['tabBook', book]].forEach(([id, on]) => { const t = $(id); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  }
  const pickTab = b => { if (b === book) return; book = b; missing = null; A.Sfx.event('ui-toggle'); drawCraft(); };
  $('tabMats').onclick = () => pickTab(false);
  $('tabBook').onclick = () => pickTab(true);
  $('craftTabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation(); pickTab(!book); $(book ? 'tabBook' : 'tabMats').focus();
  });
  addEventListener('resize', () => { if (G && G.panel === 'craft') craftLayout(); });
  /* THE RECIPE BOOK'S SEARCH (the field above the recipes): as you type, case-insensitive, any part of a word, it keeps the
     recipes whose NAME, OUTPUT item, any INGREDIENT or PERFORMANCE words match ("plank" = Maple Planks and everything made
     with planks); the matched letters are <mark>ed (an ingredient / output / performance match shows on a "Uses: …" line);
     none = "No recipes match 'xyz'." Recipes you haven't found stay hidden while searching: a search never reveals one.
     Typing never reaches the game (the game's keys skip a text field); Esc clears it, a second Esc closes the book; "/"
     focuses it on a keyboard (never focused by itself: a touch keyboard would cover the book); closing the book clears it. */
  let bookQ = '';
  const PERF_WORDS = {note: 'note', notes3: 'notes', beats: 'beats rhythm', longtone: 'long tone key signature roll', scale: 'scale'};
  const hl = (text, q) => { const i = q ? text.toLowerCase().indexOf(q) : -1; return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); };
  /** what a found recipe matches: {name (hit in the recipe's name), why: [texts that matched]} or null */
  function bookMatch(r, q, perf) {
    if (!q) return {name: false, why: []};
    const has = t => t.toLowerCase().includes(q), why = [];
    const name = has(r.name);
    const out = itemName(r.out);
    if (out !== r.name && has(out)) why.push(out);
    [...new Set(r.in)].forEach(i => { const n = itemName(i); if (has(n) && !why.includes(n)) why.push(n); });
    const pw = perf(r) + ' ' + (PERF_WORDS[r.perf] || '');
    const perfHit = has(pw);
    return name || why.length || perfHit ? {name, why, perf: perfHit} : null;
  }
  function drawBook(perf) {
    const f = gd().found || {}, q = bookQ.trim().toLowerCase();
    const shown = r => f[r.id] || (window.BT_ALWAYS_SHOWN || []).includes(r.id);
    const html = RECIPES.map(r => {
      if (!shown(r)) return q ? '' : `<div class="bt-rec unknown" aria-label="A recipe you haven't found yet"><b>?</b><span class="ins">${r.in.map(() => '<span class="q">?</span>').join('<i>›</i>')}</span></div>`;
      const m = bookMatch(r, q, perf); if (!m) return '';
      const miss = missing && missing.id === r.id ? missing.need : null;
      return `<button type="button" class="bt-rec${miss ? ' missing' : ''}" data-id="${r.id}"><b>${hl(r.name, q)}${r.n > 1 ? ' × ' + r.n : ''}</b><span class="ins">${r.in.map(i => `<img src="${iconURL(i)}" alt="${esc(itemName(i))}" data-item="${i}"${miss && miss[i] ? ' class="lack"' : ''}>`).join('<i>›</i>')}</span>` +
        (m.why.length ? `<span class="bt-why">Uses: ${m.why.map(t => hl(t, q)).join(', ')}</span>` : '') +
        `<small>${m.perf ? hl(perf(r), q) : esc(perf(r))}${r.bench ? ' · at a Luthier\'s Bench' : ''}</small>` +
        (miss ? `<em>Missing: ${Object.entries(miss).map(([k, n]) => `${n} ${esc(itemName(k))}`).join(', ')}</em>` : '') + `</button>`;
    }).join('');
    $('book').innerHTML = html;
    $('book').hidden = !html;
    $('bookEmpty').hidden = !!html;
    $('bookEmpty').textContent = html ? '' : `No recipes match '${bookQ.trim()}'.`;
    $('bookSearchX').hidden = !bookQ;
    $('book').querySelectorAll('.bt-rec[data-id]').forEach(b => b.onclick = () => fromBook(RECIPES.find(x => x.id === b.dataset.id)));
  }
  function searchBook(q) { bookQ = q; $('bookSearch').value = q; if (G && G.panel === 'craft' && book) drawCraft(); }
  $('bookSearch').addEventListener('input', e => searchBook(e.target.value));
  $('bookSearchX').onclick = () => { searchBook(''); $('bookSearch').focus(); };
  $('bookSearch').addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    if (bookQ) searchBook(''); else { book = false; drawCraft(); $('bookBtn').focus(); }
  });
  /** the next empty slot gets this material (if you still have one not already in the measure) */
  function addToSlot(id) {
    const k = slots.indexOf(null); if (k < 0 || !id) return false;
    if ((G.p.inv[id] || 0) - usedOf(id) <= 0) return false;
    slots[k] = id; missing = null; A.Sfx.event('ui-toggle'); drawCraft();
    return true;
  }
  /** the Recipe Book: a recipe fills the slots in order when you have its items, else shows what's missing in red */
  function fromBook(r) {
    const need = {}; r.in.forEach(i => { need[i] = (need[i] || 0) + 1; });
    const lack = {}; Object.keys(need).forEach(k => { const d = need[k] - (G.p.inv[k] || 0); if (d > 0) lack[k] = d; });
    if (Object.keys(lack).length) { missing = {id: r.id, need: lack}; A.Sfx.event('bt-wrong'); drawCraft(); return false; }
    missing = null; slots.fill(null); r.in.forEach((k, i) => { slots[i] = k; }); book = false; A.Sfx.event('ui-toggle'); drawCraft();
    return true;
  }
  /* DRAG a material onto the workbench: it goes into the next empty slot (a tap does the same) */
  let drag = null, dragEnd = 0;
  const dragJustEnded = () => performance.now() - dragEnd < 300;
  function dragTile(el) {
    el.addEventListener('dragstart', e => e.preventDefault());            // never the browser's own image drag (it cancels the pointer)
    el.addEventListener('pointerdown', e => {
      if (el.disabled || e.button > 0) return;
      drag = {el, id: el.dataset.id, x0: e.clientX, y0: e.clientY, ghost: null, pid: e.pointerId};
    });
  }
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 10) return;
    if (!drag.ghost) {
      const g = drag.ghost = document.createElement('img');
      g.src = iconURL(drag.id); g.className = 'bt-dragghost'; g.alt = '';
      document.body.appendChild(g); A.UI.layer && (g.style.zIndex = String(A.UI.layer.topZ() + 1));
      tipHide();
      $('bench').classList.add('dragging');                                // the empty slots light up as drop targets
      dragScroll();
    }
    drag.y = e.clientY;
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    $('bench').classList.toggle('drop-on', onBench(e));
  });
  const onBench = e => !!document.elementsFromPoint(e.clientX, e.clientY).find(n => n.id === 'bench');
  /** while dragging near the top of whatever scrolls (the panel, or the wide left column), scroll it toward the slots */
  function dragScroll() {
    if (!drag || !drag.ghost) return;
    const sc = [$('craftMain'), $('craft')].find(el => el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible');
    if (sc && drag.y != null) {
      const top = sc.getBoundingClientRect().top, d = drag.y - top;
      if (d < R.dragEdge && sc.scrollTop > 0) sc.scrollTop -= Math.ceil(R.dragScroll * (1 - Math.max(0, d) / R.dragEdge));
    }
    requestAnimationFrame(dragScroll);
  }
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null;
    if (!d.ghost) return;
    d.ghost.remove(); dragEnd = performance.now();
    $('bench').classList.remove('drop-on', 'dragging');
    if (e && e.type === 'pointerup' && onBench(e)) addToSlot(d.id);           // anywhere on the bench = the next empty slot
  };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
  $('bookBtn').onclick = () => { book = !book; missing = null; drawCraft(); };
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
      if (r.also) Object.entries(r.also).forEach(([k, n]) => gain(k, n));   // D.S. al Coda: a Segno AND a Coda
      slots.fill(null);
      A.Sfx.event('bt-craft');
      brave();
      const wornNow = ITEMS[r.out] && (ITEMS[r.out].kind === 'armor' || ITEMS[r.out].kind === 'shield') && !G.p.wear[ITEMS[r.out].kind] && wear(r.out);
      A.UI.toast(wornNow ? `You made a ${r.name} and put it on! (Inventory: tap to swap or take it off.)` : `You made ${r.n > 1 ? r.n + ' × ' : ''}${r.name}!`);
      if (r.out === 'mallet1') award('mallet');
      if (r.out === 'metronome') award('metro');
      if (r.out === 'tuner') award('tuner');
      if (r.out === 'baton') award('baton');
      if (r.out === 'grandgem') award('grandgem');
      if (G.panel === 'craft') drawCraft();
    });
  }

  /* ================= TOOLTIPS on every item (the hotbar, the inventory, a Band Locker, the Recipe Book, the Measure) =================
     Any element with data-item: hovering (mouse) or focusing (keyboard) it shows #btTip after rules.js tipDelayMs; on a
     touch screen a long-press (tipLongPressMs) shows it and lifting the finger hides it (that tap then picks nothing; a
     normal tap still selects / places as before). The tip: the name, its one line (recipes.js desc), "Found: …" for
     materials, what a tool can mine. It flips above / below / right / left to stay on screen and never covers its item,
     through UI.layer, so it's above every panel. */
  const tip = $('btTip');
  let tipFor = null, tipTm = 0, press = null, swallowClick = 0;
  function tipText(id) {
    const it = ITEMS[id] || {};
    let h = `<b>${esc(it.name || id)}</b>`;
    if (it.desc) h += `<span>${esc(it.desc)}</span>`;
    if (it.found) h += `<small>Found: ${esc(it.found)}</small>`;
    if (it.kind === 'gear') h += `<small>Works while it's in your hotbar.</small>`;
    if (it.kind === 'tool') {
      // the blocks that need a tool, up to this one's tier (a tool mines everything a smaller one does)
      const can = B.filter(b => b.mine && b.tier >= 1 && b.tier <= it.tier).map(b => b.name);
      if (can.length) h += `<small>Can mine: ${esc(can.join(', '))}</small>`;
    }
    return h;
  }
  function tipShow(el) {
    const id = el && el.dataset.item; if (!id || !document.contains(el)) return;
    tipFor = el;
    tip.innerHTML = tipText(id); tip.hidden = false;
    if (A.UI.layer) { A.UI.layer.close(tip); A.UI.layer.open(tip, {min: 96}); }
    // place it: above, below, right, then left of its item; on screen; never over the item itself
    const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight, g = 8;
    const spots = [[r.left + r.width / 2 - t.width / 2, r.top - t.height - g], [r.left + r.width / 2 - t.width / 2, r.bottom + g],
      [r.right + g, r.top + r.height / 2 - t.height / 2], [r.left - t.width - g, r.top + r.height / 2 - t.height / 2]];
    const clampX = x => Math.max(6, Math.min(W - t.width - 6, x)), clampY = y => Math.max(6, Math.min(H - t.height - 6, y));
    const over = (x, y) => x < r.right && x + t.width > r.left && y < r.bottom && y + t.height > r.top;
    let best = spots.map(([x, y]) => [clampX(x), clampY(y)]).find(([x, y], k) => !over(x, y) && (k > 1 || (spots[k][1] >= 6 && spots[k][1] + t.height <= H - 6)));
    if (!best) best = [clampX(spots[0][0]), clampY(spots[0][1])];
    tip.style.left = Math.round(best[0]) + 'px'; tip.style.top = Math.round(best[1]) + 'px';
    if (G) G.fx.tips = (G.fx.tips || 0) + 1;
  }
  function tipHide() { clearTimeout(tipTm); tipTm = 0; if (tip.hidden) return; tip.hidden = true; tipFor = null; if (A.UI.layer) A.UI.layer.close(tip); }
  const itemEl = e => e.target && e.target.closest && e.target.closest('[data-item]');
  document.addEventListener('mouseover', e => {
    const el = itemEl(e); if (el === tipFor) return;
    if (!el) { if (tipFor) tipHide(); return; }
    tipHide(); tipTm = setTimeout(() => tipShow(el), R.tipDelayMs);
  });
  document.addEventListener('focusin', e => { const el = itemEl(e); tipHide(); if (el) tipTm = setTimeout(() => tipShow(el), R.tipDelayMs); });
  document.addEventListener('focusout', () => tipHide());
  document.addEventListener('pointerdown', e => {
    tipHide();
    const el = itemEl(e); if (!el || e.pointerType !== 'touch') return;
    press = {el, x: e.clientX, y: e.clientY, id: e.pointerId, tm: setTimeout(() => { if (press && press.el === el) { press.long = true; tipShow(el); } }, R.tipLongPressMs)};
  }, true);
  document.addEventListener('pointermove', e => { if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.tm); if (!press.long) press = null; } }, true);
  const pressEnd = e => { if (!press || e.pointerId !== press.id) return; clearTimeout(press.tm); if (press.long) { swallowClick = performance.now(); tipHide(); } press = null; };
  document.addEventListener('pointerup', pressEnd, true); document.addEventListener('pointercancel', pressEnd, true);
  // after a long-press the finger's click picks nothing
  document.addEventListener('click', e => { if (performance.now() - swallowClick < 500 && itemEl(e)) { e.preventDefault(); e.stopImmediatePropagation(); swallowClick = 0; } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tip.hidden) tipHide(); }, true);
  document.addEventListener('contextmenu', e => { if (itemEl(e)) e.preventDefault(); });

  /* ================= THE INVENTORY, THE HOTBAR, A BAND LOCKER ================= */
  function drawHot() {
    if (!G) return;
    const p = G.p;
    $('hotbar').innerHTML = p.hot.map((id, i) => `<button type="button" class="bt-hot${i === p.sel ? ' sel' : ''}" data-i="${i}"${id ? ` data-item="${id}"` : ''} aria-pressed="${i === p.sel}" aria-label="${id ? esc(itemName(id)) + ' × ' + (p.inv[id] || 0) : 'Empty slot'} (${i + 1})">` +
      (id ? `<img src="${iconURL(id)}" alt=""><b>${p.inv[id] || 0}</b>` : '') + (id && ITEMS[id] && ITEMS[id].kind === 'gear' ? '<i class="bt-gearbadge" aria-hidden="true"></i>' : '') + `<small>${i + 1}</small></button>`).join('');
    $('hotbar').querySelectorAll('.bt-hot').forEach(b => b.onclick = () => selectHot(+b.dataset.i));
    const t = tier();
    $('toolName').textContent = R.tools[t];
    $('toolIcon').innerHTML = t ? `<img src="${iconURL(['', 'mallet1', 'mallet2', 'mallet3', 'baton'][t])}" alt="">` : '';
    if (G.panel === 'inv') drawInv();
  }
  function selectHot(i) {
    const p = G.p;
    if (p.sel === i && p.hot[i] === 'snack') { eat(); return; }
    if (p.sel === i && p.hot[i] === 'sonarfork') { openSonar(); return; }
    p.sel = i; drawHot();
    if (p.hot[i] && ITEMS[p.hot[i]] && ITEMS[p.hot[i]].block && !G.build) setBuild(true);
  }
  function openInv() { closePanels(); $('inv').hidden = false; G.panel = 'inv'; drawInv(); $('invClose').focus(); }
  function drawInv(locker) {
    const inv = G.p.inv, ids = Object.keys(inv).filter(k => inv[k] > 0);
    $('invTitle').textContent = locker ? 'Band Locker' : 'Inventory';
    $('invTool').textContent = `Your tool: ${R.tools[tier()]}`;
    drawWear(locker);
    $('invGrid').innerHTML = ids.length ? ids.map(k => `<button type="button" class="bt-chip" data-id="${k}" data-item="${k}"><img src="${iconURL(k)}" alt=""><span>${esc(itemName(k))}</span><b>${inv[k]}</b></button>`).join('') : '<p class="ui-msg empty">Nothing yet.</p>';
    $('invHint').textContent = locker ? 'Tap your items to store them, and the locker\'s items to take them.' : `Tap an item to put it in hotbar slot ${G.p.sel + 1}.${ids.some(k => ITEMS[k] && (ITEMS[k].kind === 'armor' || ITEMS[k].kind === 'shield')) ? ' Tap an armor or a shield to wear it.' : ''}${have('snack') ? ' Tap a Snack Bag twice to eat it.' : ''}`;
    $('invGrid').querySelectorAll('.bt-chip').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (locker) { const L = lockerOf(locker), n = inv[id]; if (Object.keys(L).length >= R.lockerSlots && !L[id]) { A.UI.toast('The locker is full.'); return; } take(id, n); L[id] = (L[id] || 0) + n; drawInv(locker); return; }
      if (id === 'snack' && G.p.hot[G.p.sel] === 'snack') { eat(); drawInv(); return; }
      if (ITEMS[id] && (ITEMS[id].kind === 'armor' || ITEMS[id].kind === 'shield')) { wear(id); drawInv(); return; }   // worn, never in the hotbar
      if (ITEMS[id] && ITEMS[id].kind === 'tool' && !ITEMS[id].hotbar) return;
      const k = G.p.hot.indexOf(id); if (k >= 0) G.p.hot[k] = null;
      G.p.hot[G.p.sel] = id; if (k < 0) gearIn(id); drawHot(); drawInv();
    });
    $('lockerBox').hidden = !locker;
    if (locker) {
      const L = lockerOf(locker), ks = Object.keys(L);
      $('lockerGrid').innerHTML = Array.from({length: R.lockerSlots}, (_, i) => ks[i] ? `<button type="button" class="bt-chip" data-id="${ks[i]}" data-item="${ks[i]}"><img src="${iconURL(ks[i])}" alt=""><span>${esc(itemName(ks[i]))}</span><b>${L[ks[i]]}</b></button>` : '<span class="bt-empty"></span>').join('');
      $('lockerGrid').querySelectorAll('.bt-chip').forEach(b => b.onclick = () => { const id = b.dataset.id; if (!canHold(id)) { bagFull(); return; } gain(id, L[id]); delete L[id]; drawInv(locker); });
    }
  }
  /** THE ARMOR and SHIELD slots at the top of the Inventory: what you wear, its durability bar; tap it to take it off; a
      Repair button when it's worn down (at a bench) */
  function drawWear(locker) {
    const box = $('wearRow'); box.hidden = !!locker; if (locker) return;
    box.innerHTML = ['armor', 'shield'].map(slot => {
      const w = G.p.wear[slot], label = slot === 'armor' ? 'Armor' : 'Shield';
      if (!w) return `<div class="bt-wear" data-slot="${slot}"><span class="bt-wear-empty" aria-hidden="true"></span><span class="bt-wear-t"><small>${label}</small>None: tap one in your bag to wear it</span></div>`;
      const max = wearMax(slot, w.id), f = w.left / max, mat = ITEMS[w.id].repair;
      return `<div class="bt-wear" data-slot="${slot}"><button type="button" class="bt-wear-btn" data-off="${slot}" data-item="${w.id}" aria-label="${esc(itemName(w.id))}, ${w.left} of ${max} hits left. Tap to take it off.">`
        + `<span class="bt-wear-ic"><img src="${iconURL(w.id)}" alt=""><i class="bt-dur${f <= .25 ? ' low' : ''}"><b style="width:${Math.round(f * 100)}%"></b></i></span>`
        + `<span class="bt-wear-t"><small>${label}</small>${esc(itemName(w.id))} <em>${w.left}/${max}</em></span></button>`
        + (w.left < max ? `<button type="button" class="btn btn-secondary btn-small bt-repair" data-repair="${slot}">Repair (1 ${esc(itemName(mat))})</button>` : '') + `</div>`;
    }).join('');
    box.querySelectorAll('[data-off]').forEach(b => b.onclick = () => { unwear(b.dataset.off); drawInv(); });
    box.querySelectorAll('[data-repair]').forEach(b => b.onclick = () => repair(b.dataset.repair));
  }
  const lockerOf = key => { const w = G.w; w.lockers = w.lockers || {}; return w.lockers[key] || (w.lockers[key] = {}); };
  function openLocker(x, y) { closePanels(); $('inv').hidden = false; G.panel = 'inv'; drawInv(x + ',' + y); $('invClose').focus(); return true; }
  $('invClose').onclick = () => closePanels();
  function panelOpen() { return !!(G && G.panel); }
  function closePanels() {
    tipHide();
    ['inv', 'craft', 'composer', 'sonar'].forEach(id => { $(id).hidden = true; });
    bookQ = ''; $('bookSearch').value = '';                               // the Recipe Book's search never outlives the panel
    if (G) { G.panel = null; if (G.w) G.w.dirty = true; }
  }

  /* ================= COMPOSER BLOCKS AND THE CONDUCTOR'S PODIUM ================= */
  const chrom = () => A.chromaticScale(readM());
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
    // laid out like every card's staff (challenges.js layoutNotes): centered or spread, wrapped on a narrow panel
    const room = Math.max(200, ($('compStaff').clientWidth || $('composer').clientWidth || innerWidth) - 12);
    $('compStaff').innerHTML = Card.staffRows(items.map(it => ({n: it.show, caption: it.label})), {clef: snare ? 'treble' : inst.clef, availPx: room, captions: true, label: 'Your melody'}).html;
    $('compSay').textContent = mode === 'inst' ? (snare ? 'Play one steady hit for each note to power the row!' : 'Play your melody on your instrument to power the row!') : 'Tap your melody\'s note names in order to power the row!';
    $('compActs').innerHTML = `<button type="button" class="btn btn-primary" id="compPerf">Perform</button>`;
    $('compPlay').hidden = false; $('compPlay').disabled = A.Pitch.listening();
    $('compPlay').onclick = () => {                                     // play it back (Sfx.piano: never while listening)
      if (A.Pitch.listening()) return;
      items.forEach((it, k) => setTimeout(() => { if (!A.Pitch.listening()) A.Sfx.piano(it.sounding); }, k * 420));
    };
    $('compPerf').onclick = () => {
      const rect = $('compPerf').getBoundingClientRect();
      const sp = drum() ? {kind: 'rhythm', text: Array.from({length: Math.ceil(items.length / 4) * 4}, (_, k) => k < items.length ? 'q' : 'qr').join(' ').replace(/((?:\S+ ){3}\S+) /g, '$1 | '), sub: 'One hit per note'}
        : {kind: 'notes', items, clef: readG().clef, fit: items.map(i => i.show), sig: null, sub: 'Your melody'};
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

  /* ================= CHAPTER 6: D.S. AL CODA SIGNS, THE PIPE ORGAN, THE SONAR TUNING FORK, CORAL LAMPS ================= */
  /* D.S. AL CODA SIGNS: world meta 'x,y' = {sign: 'segno'|'coda', mate: 'x,y'|null}. A placed sign pairs with the nearest
     unpaired sign of the other kind (crafted together, they pair as you place them); at most signs.maxPairs of each kind.
     BUILD-tapping one takes you to its partner. FAIRNESS: never with a card open, at night with a creature within
     signs.safe, or hurt in the last signs.hurtS seconds ("Too dangerous to travel right now!"). A soft swirl fade (a
     plain fade with reduced motion). Breaking one leaves its partner with "No partner". */
  const OTHER_SIGN = {segno: 'coda', coda: 'segno'};
  const xyOf = k => k.split(',').map(Number);
  const signsOf = kind => Object.keys(G.w.meta).filter(k => { const m = G.w.meta[k]; if (!m || m.sign !== kind) return false; const [x, y] = xyOf(k); return BW.at(G.w, x, y) === ID[kind]; });
  const signCount = kind => signsOf(kind).length;
  function pairSign(x, y, kind) {
    const w = G.w, me = w.meta[x + ',' + y] = {sign: kind, mate: null};
    let best = null, bd = Infinity;
    signsOf(OTHER_SIGN[kind]).forEach(k => { if (w.meta[k].mate) return; const [sx, sy] = xyOf(k), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = k; } });
    if (best) { me.mate = best; w.meta[best].mate = x + ',' + y; }
  }
  function travel(x, y) {
    const w = G.w, m = w.meta[x + ',' + y], p = G.p, now = performance.now();
    const mate = m && m.mate && w.meta[m.mate] ? xyOf(m.mate) : null;
    if (!mate || BW.at(w, mate[0], mate[1]) !== ID[OTHER_SIGN[m.sign]]) { A.UI.toast(`No partner: place a ${m && m.sign === 'coda' ? 'Segno' : 'Coda'} Sign to travel.`, {ms: 2200}); return true; }
    const near = isNight() && G.creatures.some(c => c.state === 'live' && Math.hypot(c.x - p.x, c.y - p.y) < R.signs.safe);
    if (Card.current || G.jitter || G.warp || near || now - (G.hurtAt || -1e9) < R.signs.hurtS * 1000) { A.UI.toast('Too dangerous to travel right now!', {ms: 2000}); return true; }
    const g = G, ov = $('btJitter');
    G.warp = {t0: now}; G.fx.warps = (G.fx.warps || 0) + 1;
    A.Sfx.event('bt-warp');
    if (ov) { ov.classList.toggle('still', !!RM.matches); ov.classList.add('warp'); ov.hidden = false; void ov.offsetWidth; ov.classList.add('go'); }
    setTimeout(() => {
      if (G !== g) return;
      p.x = mate[0] + .5; p.y = mate[1] + 1; p.vx = p.vy = 0;
      G.warp = null; G.way = null;
      award('coda');
      if (ov) { ov.classList.remove('go'); setTimeout(() => { ov.hidden = true; ov.classList.remove('warp'); }, 320); }
      if (!G.endless) saveWorld();
    }, R.signs.fadeMs / 2);
    return true;
  }
  /* THE PIPE ORGAN: 2 wide × 3 tall (every tile is 'organ'; meta {organ: 'x,y' of its bottom-left}); breaking any tile
     breaks all of it. BUILD-tap = a short major chord in the student's key (shared/tones.js: refused while a card is open
     or the microphone listens; the mic is muted for the chord + 400 ms in case it starts listening). */
  function organTiles(x, y) {
    const m = G.w.meta[x + ',' + y]; if (!m || !m.organ) return [[x, y]];
    const [ax, ay] = xyOf(m.organ), out = [];
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 3; dy++) if (BW.at(G.w, ax + dx, ay - dy) === ID.organ) out.push([ax + dx, ay - dy]);
    return out;
  }
  function placeOrgan(x, y) {
    const w = G.w, tiles = [];
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 3; dy++) tiles.push([x + dx, y - dy]);
    if (tiles.some(([tx, ty]) => { const k = B[BW.at(w, tx, ty)].key; return k !== 'air' && k !== 'water'; })) { A.UI.toast('A Pipe Organ needs room: 2 blocks wide and 3 tall.', {ms: 2000}); return false; }
    if (tiles.some(([tx, ty]) => collidesBox(tx, ty))) { A.UI.toast('You are standing there!', {ms: 1200}); return false; }
    tiles.forEach(([tx, ty]) => { BW.put(w, tx, ty, ID.organ); w.meta[tx + ',' + ty] = {organ: x + ',' + y}; });
    take('organ'); A.Sfx.event('bt-place');
    scanGear(); checkRooms(x, y); checkRooms(x, y - 1); brave();
    return true;
  }
  /** its part of the 2 × 3 picture (drawn once per size) */
  let ORGAN = null;
  function drawOrganPart(x, y, X, Y) {
    const m = G.w.meta[x + ',' + y], [ax, ay] = m && m.organ ? xyOf(m.organ) : [x, y];
    const px = Math.round(S * WPX);
    if (!ORGAN || ORGAN.width !== px * 2) {
      ORGAN = document.createElement('canvas'); ORGAN.width = px * 2; ORGAN.height = px * 3;
      const g = ORGAN.getContext('2d'), u = px / 16, f = (c, a, b, w2, h) => { g.fillStyle = col(c); g.fillRect(a * u, b * u, w2 * u, h * u); };
      f('bt-organ', 1, 22, 30, 26); f('bt-stage-edge', 1, 26, 30, 1.2); f('bt-organ', 4, 18, 24, 5);
      [[4, 6, 12], [8, 3, 15], [12, 1, 17], [16, 0, 18], [20, 1, 17], [24, 3, 15], [28, 6, 12]].forEach(([a, b, h]) => { f('bt-organ-pipe', a - 1.2, b, 2.4, h); f('bt-ink', a - .6, b + h - 4, 1.2, 1.4); });
      [[6, 32], [12, 32], [18, 32], [24, 32]].forEach(([a, b]) => f('bt-screen', a, b, 4, 1.6));
      f('bt-plank-2', 3, 40, 26, 2);
    }
    const dx = Math.max(0, Math.min(1, x - ax)), dy = Math.max(0, Math.min(2, ay - y));
    ctx.drawImage(ORGAN, dx * px, (2 - dy) * px, px, px, X, Y, S, S);
  }
  /** the chord's root: the student's first note (concert), in a comfortable octave */
  function organRoot() {
    const n = inst.notes && inst.notes[0];
    let m = n && !snare ? A.music.writtenMidi(n) - (member.sounds || 0) : 58;
    while (m < 55) m += 12; while (m > 66) m -= 12;
    return m;
  }
  function playOrgan() {
    if (Card.current || A.Pitch.listening() || !A.tones) { A.UI.toast('The organ waits while your microphone is listening.', {ms: 2000}); return true; }
    const r = organRoot(), midis = [r, r + 4, r + 7];
    let dur = 0;
    midis.forEach(m => { const t = A.tones.play([m], {noteMs: R.organ.chordMs, gapMs: 0, vol: .22}); dur = Math.max(dur, t.dur || 0); });
    A.Pitch.suppress(dur * 1000 + 400);
    G.fx.chords = (G.fx.chords || 0) + 1; G.lastChord = midis;
    return true;
  }
  /* THE SONAR TUNING FORK (gear): tap its hotbar slot twice → pick one of the ores you've ever SEEN (gameData.oreSeen,
     noted as they're drawn on screen); while it's in the hotbar an arrow at the screen's edge points to the nearest one
     within sonar.range ("~23 blocks"), else "None nearby". Searched twice a second. */
  const SONAR_ORES = ['toneOre', 'brassOre', 'scaleVein', 'springVein', 'sustain', 'rhythmRock', 'restCrystal'].concat(BW.ORES2);
  const ORE_FLAG = new Uint8Array(B.length); SONAR_ORES.forEach(k => { ORE_FLAG[ID[k]] = 1; });
  function seeOre(v) {
    G.oreSeen[v] = 1;
    const os = gd().oreSeen || (gd().oreSeen = {});
    if (!os[B[v].key]) { os[B[v].key] = 1; saveGd(); }
  }
  const TILE_ICON = {};
  const tileIcon = key => TILE_ICON[key] || (TILE_ICON[key] = (() => { const c = document.createElement('canvas'); c.width = c.height = 48; drawTile(c.getContext('2d'), key, 48); return c.toDataURL(); })());
  function openSonar() {
    closePanels(); $('sonar').hidden = false; G.panel = 'sonar';
    const os = gd().oreSeen || {}, list = SONAR_ORES.filter(k => os[k]), cur = gd().sonar || null;
    $('sonarGrid').innerHTML = list.length ? list.map(k => `<button type="button" class="bt-chip${k === cur ? ' sel' : ''}" data-ore="${k}" aria-pressed="${k === cur}"><img src="${tileIcon(k)}" alt=""><span>${esc(B[ID[k]].name)}</span></button>`).join('') +
      `<button type="button" class="bt-chip" data-ore="" aria-pressed="${!cur}"><span>Off</span></button>` : '<p class="ui-msg empty">Find some ores first: the fork only knows the ones you\'ve seen.</p>';
    $('sonarGrid').querySelectorAll('[data-ore]').forEach(b => b.onclick = () => { saveGd({sonar: b.dataset.ore || null}); G.sonarT = 0; closePanels(); });
    $('sonarClose').focus();
  }
  $('sonarClose').onclick = () => closePanels();
  function stepSonar(now) {
    const want = gearOn('sonarfork') && gd().sonar;
    if (!want) { G.sonarHit = null; G.sonarFor = null; return; }
    if (now - (G.sonarT || 0) < 500 && G.sonarFor === want) return;
    G.sonarT = now; G.sonarFor = want;
    const w = G.w, v = ID[want], rg = R.sonar.range, px = G.p.x, py = G.p.y - .9;
    let best = null, bd = Infinity;
    for (let y = Math.max(0, Math.floor(py - rg)); y <= Math.min(w.h - 1, Math.ceil(py + rg)); y++)
      for (let x = Math.max(0, Math.floor(px - rg)); x <= Math.min(w.w - 1, Math.ceil(px + rg)); x++) {
        if (w.b[y * w.w + x] !== v) continue;
        const d = Math.hypot(x + .5 - px, y + .5 - py); if (d < bd && d <= rg) { bd = d; best = {x, y, d}; }
      }
    G.sonarHit = best;
  }
  function drawSonar(sx, sy) {
    const want = G.sonarFor; if (!want) return;
    const name = B[ID[want]].name, cx = sx(G.p.x), cy = sy(G.p.y - .9);
    oc.font = '700 15px "GN Text", system-ui, sans-serif'; oc.textAlign = 'center'; oc.textBaseline = 'middle'; oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.fillStyle = col('bt-mine');
    const h = G.sonarHit;
    if (!h) { const t = `No ${name} nearby`; oc.strokeText(t, cx, cy - S * 1.9); oc.fillText(t, cx, cy - S * 1.9); return; }
    const dx = sx(h.x + .5) - cx, dy = sy(h.y + .5) - cy, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, pad = 58;
    const tx = ux > 0 ? (VW - pad - cx) / ux : ux < 0 ? (pad - cx) / ux : Infinity, ty = uy > 0 ? (VH - pad - cy) / uy : uy < 0 ? (pad + 40 - cy) / uy : Infinity;
    const t = Math.max(S * 1.2, Math.min(tx, ty, n - S * .8)), x = cx + ux * t, y = cy + uy * t;
    oc.save(); oc.translate(x, y); oc.rotate(Math.atan2(uy, ux));
    oc.beginPath(); oc.moveTo(18, 0); oc.lineTo(-10, -13); oc.lineTo(-4, 0); oc.lineTo(-10, 13); oc.closePath();
    oc.lineWidth = 5; oc.strokeStyle = col('bt-ink'); oc.stroke(); oc.fillStyle = col('bt-mine'); oc.fill(); oc.restore();
    const lbl = `${name} ~${Math.round(h.d)} blocks`, ly = y + (uy < -.5 ? 28 : -28), lw = oc.measureText(lbl).width;
    const lx = Math.max(lw / 2 + 8, Math.min(VW - lw / 2 - 8, x));                // the words stay on screen
    oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.strokeText(lbl, lx, ly); oc.fillStyle = col('bt-mine'); oc.fillText(lbl, lx, ly);
  }
  /** a Coral Lamp's soft teal glow (after the light; still) */
  function drawCoralGlow(sx, sy) {
    const r = R.light.lampRadius * S * .55;
    G.lamps.forEach(l => {
      if (!l.coral) return;
      const x = sx(l.x), y = sy(l.y); if (x < -r || y < -r || x > VW + r || y > VH + r) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col('bt-coral-glow')); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = .14; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    });
  }

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
    if (!cotNow() && !gd().cotTip) {                                     // once: a quiet tip (a toast, never in the way)
      gd().cotTip = 1; saveGd();
      A.UI.toast('Craft a Practice Cot: you\'ll wake up next to it and lose less if the night goes badly.', {ms: 4200});
    }
    if (!seen('night')) firstCard('night', 'Night is falling!', 'Creatures come out in the dark: Night Clams, Sour Wisps and, later, Zippers and Rushers. They\'re silly, not scary: calm them with your music! Stage Lamps keep them away, and nothing appears inside a closed room with a door.');
  }
  function dawn() {
    if (!G.died) {
      G.w.survived = (G.w.survived || 0) + 1;
      A.store.noteFinished(GAME_ID);                                  // a night survived (Today's Practice)
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
      else if (v === ID.corallamp) L.push({x: x + .5, y: y + .5, coral: true});   // a Coral Lamp lights (and keeps creatures away) like a Stage Lamp
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
    if (!inside.includes(ID.lamp) || !(inside.includes(ID.stand) || inside.includes(ID.organ))) return false;   // a Pipe Organ counts as the stand
    const walls = rm.walls.map(([x, y]) => BW.at(w, x, y));
    const stage = rm.walls.filter(([x, y]) => BW.at(w, x, y) === ID.stage && rm.tiles.some(([tx, ty]) => tx === x && ty === y - 1)).length;
    if (stage < H.stageMin) return false;
    const counted = walls.filter(v => !B[v].door && v !== ID.glass && v !== ID.stage);
    return counted.length > 0 && counted.filter(v => v === ID.brick).length / counted.length >= H.brickShare - 1e-9;
  }

  /* ================= CREATURES (original and silly: never scary) ================= */
  const KINDS = {clam: 'Night Clam', wisp: 'Sour Wisp', rusher: 'Rusher', zipper: 'Zipper'};
  let cid = 0;
  /* COMBAT (the Rey Update; rules.js combat): MUSIC DOES THE DAMAGE. Every correct musical action against a creature (a
     right note played or tapped, a right count, each wispTickS of a steady in-tune hold or roll, a right key answer, every
     right hit in a Rusher's rhythm) does dmgNow() calm damage, by your best tool (combat.damage: none 1, Wooden 2, Brass 3,
     Silver 4, Golden Baton 5); at 0 HP the creature is CALMED (the poof, its drop). A wrong answer does nothing. */
  const CB = () => R.combat;
  const dmgNow = () => CB().damage[Math.max(0, Math.min(CB().damage.length - 1, tier()))];
  /** THE SPAWN RAMP: perNight and atOnce grow with the night number (spawn.ramp), at most × cap */
  const rampNow = () => { const n = Math.max(1, (G.w.nights || 0)), r = R.spawn.ramp; return Math.min(r.cap, 1 + r.per * (n - 1)); };
  const capOf = (tbl, kind) => Math.round((tbl[kind] || 0) * rampNow());
  /** a creature's own top speed (tiles a second), before the fairness check slows it */
  const baseSpeed = kind => kind === 'clam' ? R.clam.hopX / R.clam.hopS : kind === 'wisp' ? R.wisp.speed : kind === 'rusher' ? R.rusher.speed : R.zipper.speedX * R.clam.hopX / R.clam.hopS;
  /** the Practice Cot, if one is set and still there */
  const cotNow = () => G.w.cot && BW.at(G.w, G.w.cot.x, G.w.cot.y) === ID.cot ? G.w.cot : null;
  function trySpawn() {
    const w = G.w, p = G.p, sky = skyLight();
    const surfaceDark = sky < R.light.dark;
    const kinds = ['clam', 'wisp'].concat(w.nights >= R.spawn.rushersFrom ? ['rusher'] : [], w.nights >= R.spawn.zippersFrom ? ['zipper'] : []);
    for (let tries = 0; tries < 6; tries++) {
      const dx = (R.spawn.safe + Math.random() * (R.spawn.range - R.spawn.safe)) * (Math.random() < .5 ? -1 : 1);
      const x = Math.floor(p.x + dx); if (x < 1 || x >= w.w - 1) continue;
      const y = Math.floor(p.y - 6 + Math.random() * 12);
      if (Math.hypot(x - p.x, y - p.y) < R.spawn.safe) continue;
      const cave = y > BW.top(w, x) + R.light.caveDepth;
      if (!cave && !surfaceDark) continue;                                   // creatures only come out in the dark
      const kind = cave ? (Math.random() < R.spawn.cave.clam ? 'clam' : 'wisp') : kinds[Math.floor(Math.random() * kinds.length)];
      const cc = G.cycleCount;
      if ((cc[kind] || 0) >= capOf(R.spawn.perNight, kind)) continue;
      if (G.creatures.filter(c => c.kind === kind && c.state === 'live').length >= capOf(R.spawn.atOnce, kind)) continue;
      if (!canSpawnAt(x, y, kind)) continue;
      spawn(kind, x + .5, kind === 'wisp' ? y + .5 : y + 1);
      return true;
    }
    return false;
  }
  /** nowhere lit, nowhere solid, never inside a closed room with a door, never near the Practice Cot (spawn.cotSafe, even
      in the dark), and a clam, a rusher or a zipper stands on something */
  function canSpawnAt(x, y, kind) {
    const w = G.w, v = BW.at(w, x, y), cot = cotNow();
    if (cot && Math.hypot(x + .5 - (cot.x + .5), y + .5 - (cot.y + .5)) < R.spawn.cotSafe) return false;
    if (B[v].solid || v === ID.water || B[BW.at(w, x, y - 1)].solid) return false;
    if (kind !== 'wisp' && !B[BW.at(w, x, y + 1)].solid) return false;
    if (BW.light(w, x, y, skyLight(), G.lamps, R) >= R.light.dark) return false;
    const rm = BW.room(w, x, y, R);
    if (rm && rm.doors.length) return false;
    return true;
  }
  const snareN = () => R.snareCount[0] + Math.floor(Math.random() * (R.snareCount[1] - R.snareCount[0] + 1));
  function spawn(kind, x, y) {
    const c = {id: ++cid, kind, x, y, vx: 0, vy: 0, t: 0, state: 'live', hopT: Math.random(), drainT: 0, alpha: 1, ground: false};
    c.hp = c.max = CB().hp[kind];
    if (snare) c.n = kind === 'zipper' ? 1 : snareN();
    if (kind === 'clam' || kind === 'zipper') { const set = notesAt(Math.floor(x), Math.floor(y), CB().pool); c.item = set.items[0]; c.set = set; c.pcs = [...new Set(set.items.map(i => i.pc))]; }
    // THE FAIRNESS CHECK, with HP: calming takes ceil(HP ÷ your damage) correct actions of about combat.actionS each (a
    // Rusher: one rhythm card as it charges); the creature is slowed until that time × fair.margin fits the time it needs
    // to reach you, so a student with no mallet still has time
    const need = kind === 'rusher' ? rusherNeed() : Math.ceil(c.max / dmgNow()) * CB().actionS[kind];
    const dist = Math.max(1, Math.hypot(x - G.p.x, y - G.p.y)), base = baseSpeed(kind);
    const fromDist = kind === 'rusher' ? R.rusher.alert : dist;
    c.need = need; c.base = base;
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
      } else if (c.kind === 'zipper') {                                  // THE ZIPPER: runs (3× a clam), hops ledges
        c.vy = Math.min(R.player.maxFall, c.vy + R.player.gravity * dt);
        c.flee = Math.max(0, (c.flee || 0) - dt);
        const sp = c.base * m;
        c.vx = c.flee ? -Math.sign(dx || 1) * sp : d < R.zipper.see ? Math.sign(dx) * sp : (RM.matches ? 0 : Math.sin(c.t * 2) * .8);
        moveBody(c, dt, .3, .6, true);
        if (c.ground && c.vx && collides(c.x + Math.sign(c.vx) * .4, c.y, .3, .6)) c.vy = -R.zipper.jump;
        if (!c.flee && touches(c)) { hurt(.5, c); c.flee = R.zipper.fleeS; }   // ½ a heart, then it zips away
      }
      breakOut(c, d, dt);
      if (!seen('c-' + c.kind) && d < 14 && !G.held && !Card.current) creatureIntro(c.kind);
    }
    G.creatures = G.creatures.filter(c => c.state === 'live' || c.alpha > 0);
    passiveListen(dt);
  }
  const touches = c => Math.abs(c.x - G.p.x) < .7 && c.y > G.p.y - PH - .2 && c.y - .8 < G.p.y;
  /* BREAKING OUT (combat.breakAfterS / breakEveryS / soft): a creature BOXED IN (its tile inside a small enclosed space
     with no door: BW.room) that hasn't got any closer to you for breakAfterS breaks ONE soft wall block next to it (the one
     nearest you) every breakEveryS: a soft crunch, its item dropped as usual. Never a door, glass, brick, rock, ore,
     station, lamp, cot or Composer Block, never a wall of a closed room with a door (a shelter stays safe), and never a
     creature that's out in the open: it escapes a box, it never digs toward you through the world. */
  const SOFT = () => new Set(CB().soft.map(k => ID[k]));
  function shelterWall(x, y) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (B[BW.at(G.w, x + dx, y + dy)].solid) continue;
      const rm = BW.room(G.w, x + dx, y + dy, R); if (rm && rm.doors.length) return true;
    }
    return false;
  }
  function breakOut(c, d, dt) {
    if (c.state !== 'live') return;
    if (c.bestD == null || d < c.bestD - .05) { c.bestD = d; c.stuckT = 0; return; }
    if (d > (c.kind === 'wisp' ? R.wisp.see : R.clam.see) || c.flee || c.cool) { c.stuckT = 0; c.bestD = d; return; }
    c.stuckT = (c.stuckT || 0) + dt; c.breakT = Math.max(0, (c.breakT || 0) - dt);
    if (c.stuckT < CB().breakAfterS || c.breakT > 0) return;
    c.breakT = CB().breakEveryS;
    const tx = Math.floor(c.x), ty = Math.floor(c.kind === 'wisp' ? c.y : c.y - .5), rm = BW.room(G.w, tx, ty, R);
    if (!rm || rm.doors.length) return;                                  // out in the open, or a shelter: nothing to break
    const soft = SOFT(), walls = new Set(rm.walls.map(([x, y]) => x + ',' + y));
    const near = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [tx + dx, ty + dy])
      .filter(([x, y]) => walls.has(x + ',' + y) && soft.has(BW.at(G.w, x, y)) && !shelterWall(x, y))
      .sort((a, b) => Math.hypot(a[0] - G.p.x, a[1] - G.p.y) - Math.hypot(b[0] - G.p.x, b[1] - G.p.y));
    if (!near.length) return;
    const [bx, by] = near[0], b = B[BW.at(G.w, bx, by)];
    BW.put(G.w, bx, by, ID.air);
    if (b.drop) dropItem(b.drop, 1, bx + .5, by + .5);                    // nothing is lost
    chips(bx + .5, by + .5, col(CHIP[b.key] || 'bt-dirt-2'));
    A.Sfx.event('bt-break');
    G.fx.breaks = (G.fx.breaks || 0) + 1;
    c.stuckT = 0; c.bestD = null;
  }
  function hurt(n, c, drain) {
    const p = G.p;
    if (!drain && p.hurtT > 0) return;
    if (!drain) { p.hurtT = R.player.hurtCooldownS; p.vx = 0; p.vy = -6; p.x += Math.sign(p.x - (c ? c.x : p.x)) * .6; }
    const d = defend(n, drain);
    G.lastHit = d;
    if (d.blocked) { G.blockAt = performance.now(); G.fx.blocks = (G.fx.blocks || 0) + 1; A.Sfx.event('bt-clank'); return; }
    if (!(d.n > 0)) { G.fx.absorbed = (G.fx.absorbed || 0) + 1; return; }    // the armor took all of it this time
    n = d.n;
    p.hearts = Math.max(0, p.hearts - n);
    G.hurtAt = performance.now();
    A.Sfx.event('bt-hurt');
    drawHud();
    if (p.hearts <= 0) outOfBreath();
  }
  /* ARMOR AND SHIELDS (rules.js defense): what's left of a hit of `n` hearts. A shield blocks it (never a drain), else
     the reductions multiply (capped), then FAIR ROUNDING to half hearts: the whole halves + one more half with the chance
     of the remainder. Each worn item the hit reaches uses 1 durability (the shield even when it blocks). */
  const rnd = () => (G.rnd || Math.random)();
  function defend(n, drain) {
    const W = G.p.wear, D = R.defense, a = W.armor && D.armor[W.armor.id], s = !drain && W.shield && D.shield[W.shield.id];
    if (s) { wearDown('shield'); if (rnd() < s.block) return {n: 0, raw: 0, red: 1, blocked: true}; }
    if (a) wearDown('armor');
    const red = Math.min(D.maxReduction, 1 - (1 - (a ? a.reduce : 0)) * (1 - (s ? s.reduce : 0)));
    const raw = n * (1 - red), lo = Math.floor(raw * 2 + 1e-9) / 2, rest = (raw - lo) * 2;
    return {n: lo + (rest > 1e-9 && rnd() < rest ? .5 : 0), raw, red, blocked: false};
  }
  /** one hit on a worn item; at 0 it wears out (a soft crack + a toast) and is gone */
  function wearDown(slot) {
    const w = G.p.wear[slot]; if (!w) return;
    w.left--;
    if (w.left > 0) return;
    G.p.wear[slot] = null;
    A.Sfx.event('bt-crack');
    A.UI.toast(`Your ${itemName(w.id)} wore out!`, {ms: 2400});
    G.fx.woreOut = (G.fx.woreOut || 0) + 1;
    if (G.panel === 'inv') drawInv();
  }
  const wearMax = (slot, id) => R.defense[slot][id].durability;
  /** wear an armor or shield from your bag (the one you had on goes back, keeping its wear: wornLeft) */
  function wear(id) {
    const it = ITEMS[id], slot = it && it.kind; if (slot !== 'armor' && slot !== 'shield' || !have(id)) return false;
    const old = G.p.wear[slot];
    take(id, 1);
    if (old) unwearTo(old, slot);
    const left = G.p.wornLeft[id] || wearMax(slot, id); delete G.p.wornLeft[id];
    G.p.wear[slot] = {id, left};
    A.Sfx.event('bt-gear');
    G.w.dirty = true;
    return true;
  }
  function unwearTo(w, slot) {
    gain(w.id, 1, true, false);
    if (w.left < wearMax(slot, w.id)) G.p.wornLeft[w.id] = Math.min(G.p.wornLeft[w.id] || 1e9, w.left);
  }
  function unwear(slot) {
    const w = G.p.wear[slot]; if (!w) return false;
    if (!canHold(w.id)) { bagFull(); return false; }
    G.p.wear[slot] = null; unwearTo(w, slot); G.w.dirty = true;
    return true;
  }
  /** REPAIR at a Luthier's Bench: one of its repair material + a one-note performance = full durability */
  function repair(slot) {
    const w = G.p.wear[slot]; if (!w || Card.current) return false;
    const mat = ITEMS[w.id].repair;
    if (!benchNear()) { A.UI.toast('Repair it at a Luthier\'s Bench.', {ms: 1800}); return false; }
    if (!have(mat)) { A.UI.toast(`You need 1 ${itemName(mat)} to repair it.`, {ms: 1800}); return false; }
    closePanels();
    openCard(spec('note', Math.floor(G.p.x), Math.floor(G.p.y)), () => ({x: (G.p.x - camX) * S, y: (G.p.y - 1 - camY) * S}), 'Repair: ' + itemName(w.id), r => {
      if (!G || !r.ok || G.p.wear[slot] !== w || !have(mat)) return;
      take(mat, 1); w.left = wearMax(slot, w.id); G.w.dirty = true;
      A.Sfx.event('bt-craft'); A.UI.toast(`Your ${itemName(w.id)} is as good as new!`, {ms: 1800});
    });
    return true;
  }
  /** ALL HEARTS LOST: Survival Nights ends; the world keeps going (respawn at the cot, a bag with a share of the materials) */
  function outOfBreath() {
    const p = G.p;
    if (G.endless) return survivalOver();
    G.died = true;
    const bag = {x: p.x, y: p.y - .6, items: {}}, cot = cotNow(), share = cot ? R.dropShareCot : R.dropShare;   // a cot set: you lose less
    Object.keys(p.inv).forEach(k => { const it = ITEMS[k]; if (!it || it.kind === 'tool' || it.kind === 'use' || it.kind === 'gear' || it.kind === 'armor' || it.kind === 'shield') return; const n = Math.floor(p.inv[k] * share); if (n > 0) { bag.items[k] = n; take(k, n); } });
    if (Object.keys(bag.items).length) G.w.bags.push(bag);
    p.x = cot ? cot.x + .5 : G.w.spawn.x + .5; p.y = cot ? cot.y + 1 : G.w.spawn.y + 1; p.vx = p.vy = 0;
    p.hearts = maxHearts(); p.hurtT = R.player.hurtCooldownS;
    G.creatures.forEach(c => { if (Math.hypot(c.x - p.x, c.y - p.y) < R.spawn.safe) c.state = 'gone'; });
    Card.close();
    A.Sfx.event('bt-respawn');
    A.UI.toast(`Out of breath! You're back at your ${cot ? 'cot' : 'starting spot'}. Your bag is where you fell.`, {ms: 3600});
    drawHot(); drawHud(); saveWorld();
  }
  /** INSTRUMENT mode, no card: a note that matches a nearby clam's bubble is one hit (then it shows a new note); any note
      of a Zipper's pool is one hit; every combat.wispTickS of a steady in-tune note near a wisp is one hit */
  function heardNote(pc) {
    if (!G || mode !== 'inst' || snare || Card.current || G.held || pause.paused) return;
    const c = G.creatures.filter(k => k.state === 'live' && ((k.kind === 'clam' && k.item && k.item.pc === pc) || (k.kind === 'zipper' && k.pcs && k.pcs.includes(pc))) && Math.hypot(k.x - G.p.x, k.y - G.p.y) <= R.clam.calm)
      .sort((a, b) => Math.hypot(a.x - G.p.x, a.y - G.p.y) - Math.hypot(b.x - G.p.x, b.y - G.p.y))[0];
    if (c) hitCreature(c);
  }
  A.Pitch.onHeld(pc => heardNote(pc));
  A.Pitch.onFrame((r, level, now) => {
    if (!G || mode !== 'inst' || snare || Card.current || G.held || pause.paused) { if (G) G.wispHold = 0; return; }
    const near = G.creatures.find(k => k.state === 'live' && k.kind === 'wisp' && Math.hypot(k.x - G.p.x, k.y - G.p.y) <= R.wisp.listen);
    if (!near || !r) { G.wispHold = 0; return; }
    const cents = (r.midi - Math.round(r.midi)) * 100;
    if (Math.abs(cents) <= R.wisp.cents) { G.wispHold += 40; if (G.wispHold >= CB().wispTickS * 1000) { G.wispHold -= CB().wispTickS * 1000; hitCreature(near); } } else G.wispHold = 0;
  });
  function passiveListen() { /* (the onHeld / onFrame listeners above do the work while listenSync keeps the mic on) */ }
  /** a creature's card (tapped, or a Rusher charging). Each right answer is one hit; while the creature isn't calmed yet
      the next card opens straight away with a NEW note / question (a wrong one ends it). A Rusher's card: every right hit
      in its rhythm is one hit; it charges again with a new card if it isn't calmed. */
  function creatureCard(c) {
    if (Card.current || G.held || c.state !== 'live') return;
    const at = () => ({x: (c.x - camX) * S, y: (c.y - .5 - camY) * S});
    let sp;
    if (c.kind === 'clam' || c.kind === 'zipper') sp = drum() ? {kind: 'count', n: c.n, sub: c.n === 1 ? 'One hit' : 'Count your hits'} : Object.assign({}, c.set, {kind: 'notes', items: [c.item], sub: mode === 'inst' ? 'Play its note to calm it' : 'Tap its note name to calm it', hint: G.wrong >= R.hintAfterWrong});
    else if (c.kind === 'wisp') { sp = spec('sustain', Math.floor(c.x), Math.floor(c.y)); if (sp.kind === 'sustain' || sp.kind === 'roll') sp.secs = CB().wispTickS; }
    else sp = {kind: 'rhythm', time: '2/4', text: pick(R.rusher.cells || ['q q', 'e e q', 'q e e', 'h']), sub: mode === 'inst' ? 'Match the rhythm before it arrives!' : 'Tap the rhythm before it arrives!'};
    G.cardFor = c;
    const done = r => {
      if (G && G.cardFor === c) G.cardFor = null;
      if (!G) return;
      if (c.kind === 'rusher') { if (r.ok) G.wrong = 0; else G.wrong++; if ((r.hits || 0) > 0) hitCreature(c, r.hits); return; }
      if (!r.ok) { G.wrong++; return; }
      G.wrong = 0;
      if (hitCreature(c) && c.state === 'live')                          // not calmed yet: the next card, a new note / question
        setTimeout(() => { if (G && c.state === 'live' && !Card.current && !G.held && Math.hypot(c.x - G.p.x, c.y - G.p.y) < R.spawn.range) creatureCard(c); }, 150);
    };
    openCard(sp, at, KINDS[c.kind], done);
  }
  /** ONE CORRECT ACTION against a creature: dmgNow() × n calm damage, a "−3" floating up, the HP bar; at 0 HP it's
      calmed; otherwise a clam / zipper shows a new note (and the snare a new count). Returns true if it hit. */
  function hitCreature(c, n = 1) {
    if (!G || !c || c.state !== 'live' || !(n > 0)) return false;
    const d = dmgNow() * n, now = performance.now();
    c.hp = Math.max(0, c.hp - d); c.hitAt = now;
    const L = G.dmg || (G.dmg = []);
    L.push({id: c.id, x: c.x, y: c.y - hpTop(c) - .45, t0: now, text: '−' + d});   // just over its HP bar (never on its bubble)
    while (L.length > 8) L.shift();
    G.fx.hits = (G.fx.hits || 0) + 1; G.fx.damage = (G.fx.damage || 0) + d;
    G.fx.dmgLog = (G.fx.dmgLog || []).concat(d).slice(-20);             // (tests: each hit's damage)
    if (c.hp <= 0) { calm(c); return true; }
    if (c.kind === 'clam' && c.set) {                                    // a NEW note from the same pool (more practice)
      const pool = c.set.items.filter(i => i.pc !== c.item.pc);
      if (pool.length) c.item = pool[Math.floor(Math.random() * pool.length)];
    }
    if (snare && c.kind !== 'zipper') c.n = snareN();
    return true;
  }
  function calm(c) {
    if (c.state !== 'live') return;
    c.state = 'calm'; c.calmAt = performance.now(); c.hp = 0;
    // its item drops into the world where it was (INSTRUMENT mode: more of them, slightly spread)
    const drop = {clam: 'pearl', wisp: 'dust', rusher: 'spring', zipper: 'zipthread'}[c.kind];
    dropItem(drop, mode === 'inst' ? R.instrumentBonus : 1, c.x, c.kind === 'wisp' ? c.y : c.y - .4);
    poof(c);
    G.calmed++;
    if (!G.endless) {
      if (c.kind === 'clam') { stats().clams++; saveGd(); if (stats().clams >= R.goals.clams) award('clams'); }
      if (c.kind === 'wisp') { stats().wisps++; saveGd(); if (stats().wisps >= R.goals.wisps) award('wisps'); }
      drawGoals();
    }
    A.UI.toast({clam: 'The Night Clam is calm! It left a Pearl.', wisp: 'The Sour Wisp is in tune now! It left Pitch Dust.', rusher: 'The Rusher found the beat! It left a Valve Spring.', zipper: 'The Zipper settled down! It left Zip Thread.'}[c.kind], {ms: 1800});
  }
  function creatureIntro(kind) {
    const T = {clam: ['A Night Clam!', drum() ? 'Night Clams hop toward you. Tap one and play the number of hits in its bubble to calm it.' : mode === 'inst' ? 'Night Clams hop toward you with a note in their bubble. Play that note to calm them (or tap one for its card)!' : 'Night Clams hop toward you with a note in their bubble. Tap one and tap its note name to calm it!'],
      wisp: ['A Sour Wisp!', drum() ? 'Sour Wisps drain your hearts when they get close. Tap one and play an even roll to dispel it.' : mode === 'inst' ? 'Sour Wisps are out of tune and drain your hearts when they get close. Hold any steady, in-tune note near one to dispel it!' : 'Sour Wisps drain your hearts when they get close. Tap one and answer its music question to dispel it!'],
      zipper: ['A Zipper!', drum() ? 'Zippers are tiny, speedy note-bugs! They\'re 3× as quick as a Night Clam but calm right down: tap one and play ONE hit.' : mode === 'inst' ? 'Zippers are tiny, speedy note-bugs! They\'re 3× as quick as a Night Clam, but ONE right note calms them: play any note from your notes near one (or tap it for its card).' : 'Zippers are tiny, speedy note-bugs! They\'re 3× as quick as a Night Clam, but ONE right answer calms them: tap one and tap its note name.'],
      rusher: ['A Rusher!', mode === 'inst' ? 'Rushers are fast little metronome gremlins. When one charges, match its 2-beat rhythm before it arrives!' : 'Rushers are fast little metronome gremlins. When one charges, tap its 2-beat rhythm before it arrives!']}[kind];
    firstCard('c-' + kind, T[0], T[1]);
  }

  /* ================= DRAWING CREATURES (canvas, theme colors) ================= */
  function drawCreature(c, x, y, now) {
    ctx.globalAlpha = Math.max(0, Math.min(1, c.alpha));
    const s = S;
    if (c.state === 'calm' && !RM.matches) {                             // shrinking into its poof
      const k = Math.max(.05, 1 - (now - (c.calmAt || now)) / R.poofMs);
      ctx.save(); ctx.translate(x, y - S * .4); ctx.scale(k, k); ctx.translate(-x, -(y - S * .4));
      drawCreatureBody(c, x, y, s);
      ctx.restore(); ctx.globalAlpha = 1; return;
    }
    drawCreatureBody(c, x, y, s);
    ctx.globalAlpha = 1;
  }
  function drawCreatureBody(c, x, y, s) {
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
    } else if (c.kind === 'zipper') {                                   // a tiny eighth note with legs: a round head-body, a stem, a flag
      s *= 1.25;
      const step = RM.matches ? 0 : Math.sin(c.t * 18) * s * .06, f = c.vx < 0 ? -1 : 1;
      ctx.strokeStyle = col('bt-zipper-2'); ctx.lineWidth = s * .05; ctx.beginPath();
      ctx.moveTo(x - s * .1, y - s * .14); ctx.lineTo(x - s * .16 + step, y); ctx.moveTo(x + s * .1, y - s * .14); ctx.lineTo(x + s * .16 - step, y); ctx.stroke();
      ctx.fillStyle = col('bt-zipper'); ctx.beginPath(); ctx.ellipse(x, y - s * .22, s * .2, s * .14, -.35, 0, 7); ctx.fill();
      ctx.strokeStyle = col('bt-zipper'); ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(x + f * s * .17, y - s * .26); ctx.lineTo(x + f * s * .17, y - s * .7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + f * s * .17, y - s * .7); ctx.quadraticCurveTo(x + f * s * .42, y - s * .58, x + f * s * .34, y - s * .4); ctx.stroke();
      ctx.fillStyle = col('bt-ink'); [-.07, .07].forEach(k => { ctx.beginPath(); ctx.arc(x + (k + f * .04) * s, y - s * .24, s * .035, 0, 7); ctx.fill(); });
    } else {
      const sw = RM.matches ? 0 : Math.sin(c.t * 9) * .5;
      ctx.fillStyle = col('bt-rusher'); ctx.beginPath(); ctx.moveTo(x - s * .35, y); ctx.lineTo(x - s * .15, y - s * .85); ctx.lineTo(x + s * .15, y - s * .85); ctx.lineTo(x + s * .35, y); ctx.fill();
      ctx.strokeStyle = col('bt-brass'); ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(x, y - s * .15); ctx.lineTo(x + Math.sin(sw) * s * .3, y - s * .75); ctx.stroke();
      ctx.fillStyle = col('bt-ink'); [-.1, .1].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s, y - s * .5, s * .045, 0, 7); ctx.fill(); });
    }
    ctx.globalAlpha = 1;
  }
  /** THE HP BAR over a creature's head: only once it's been hit (for combat.barMs) or while its card is open */
  /** how high (tiles over its feet) a creature's HP bar sits: over its bubble (a Rusher has none) */
  const hpTop = c => c.kind === 'rusher' ? 1.1 : (c.kind === 'wisp' ? 2.3 : !drum() ? 3 : 2.4) + .35;
  const hpShown = (c, now) => c.state === 'live' && ((G.cardFor === c && !!Card.current) || now - (c.hitAt || -1e9) < CB().barMs);
  function drawHp(c, x, y, now) {
    if (!hpShown(c, now)) return;
    const top = hpTop(c);
    const w = S * 1.1, h = Math.max(4, S * .12), bx = Math.round(x - w / 2), by = Math.round(y - S * top);
    oc.fillStyle = col('bt-ink'); oc.fillRect(bx - 2, by - 2, w + 4, h + 4);
    oc.fillStyle = col('bt-hp-bg'); oc.fillRect(bx, by, w, h);
    oc.fillStyle = col('bt-hp'); oc.fillRect(bx, by, Math.round(w * c.hp / c.max), h);
    G.fx.bars = (G.fx.bars || 0) + 1;
  }
  /** "−3": the calm damage floating up from a creature (like the pickup labels; reduced motion: only the fade, no flashing) */
  function drawDamage(sx, sy, now) {
    const L = G.dmg; if (!L || !L.length) return;
    G.dmg = L.filter(l => now - l.t0 < CB().numberMs);
    const fs = Math.round(Math.max(15, Math.min(22, S * .6)));
    oc.font = `800 ${fs}px ${getComputedStyle(document.body).fontFamily}`; oc.textBaseline = 'middle'; oc.textAlign = 'center'; oc.lineJoin = 'round';
    G.dmg.forEach(l => {
      const f = (now - l.t0) / CB().numberMs, y = sy(l.y) - (RM.matches ? 0 : f * S * .9), x = sx(l.x);
      oc.globalAlpha = f < .6 ? 1 : Math.max(0, 1 - (f - .6) / .4);
      oc.lineWidth = 4; oc.strokeStyle = col('bt-ink'); oc.strokeText(l.text, x, y);
      oc.fillStyle = col('bt-dmg'); oc.fillText(l.text, x, y);
    });
    oc.globalAlpha = 1;
  }
  /** the note bubble over a clam (a tiny staff), a count for the snare, "tap me" / "hold a note" for wisps */
  function drawBubble(c, x, y) {
    if (c.state !== 'live' || c.kind === 'rusher') return;
    const s = S, noteKind = c.kind === 'clam' || c.kind === 'zipper', big = noteKind && !drum(), bw = s * (big ? 2.8 : 2.2), bh = s * (big ? 2.1 : 1.5), bx = x - bw / 2, by = y - s * (c.kind === 'wisp' ? 2.3 : big ? 3 : 2.4);
    oc.fillStyle = col('bt-bubble'); oc.strokeStyle = col('bt-ink'); oc.lineWidth = 1.5;
    oc.beginPath(); oc.roundRect ? oc.roundRect(bx, by, bw, bh, s * .3) : oc.rect(bx, by, bw, bh); oc.fill(); oc.stroke();
    oc.beginPath(); oc.moveTo(x - s * .15, by + bh); oc.lineTo(x, by + bh + s * .25); oc.lineTo(x + s * .15, by + bh); oc.fill();
    oc.fillStyle = col('bt-ink'); oc.textAlign = 'center'; oc.textBaseline = 'middle';
    if (c.kind === 'wisp' || drum()) {
      oc.font = `700 ${Math.round(s * .38)}px ${getComputedStyle(document.body).fontFamily}`;
      oc.fillText(drum() && noteKind ? `× ${c.n}` : mode === 'inst' && !snare ? 'Hold a note!' : 'Tap me!', x, by + bh / 2);
      return;
    }
    // a one-note staff: lines 16 units apart in the ui.js staff (y 56–120), scaled into the bubble
    const k = bh / 150, top = by + bh / 2 - 88 * k, lx0 = bx + s * .2, lx1 = bx + bw - s * .2, cl = c.set ? c.set.clef : readG().clef;
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
    const near = mode === 'inst' && !snare && G.creatures.some(c => c.state === 'live' && c.kind !== 'rusher' && Math.hypot(c.x - G.p.x, c.y - G.p.y) <= Math.max(R.clam.listen, R.wisp.listen, R.zipper.listen));
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
    if (ci + 1 === R.newChapter) setTimeout(checkNewChapter, 900);
  }
  /** a chapter that just showed (Chapter 6 once Chapter 5 has a star): its "NEW CHAPTER!" card, once */
  function checkNewChapter() {
    if (!G || G.endless || G.resultsUp) return;
    if (G.held || Card.current) { setTimeout(checkNewChapter, 1500); return; }      // after the card that's up now
    for (let i = R.newChapter; i < shownChapters(); i++) {
      if (seen('ch' + (i + 1))) continue;
      const ch = CHAPTERS[i];
      firstCard('ch' + (i + 1), 'NEW CHAPTER!', `Chapter ${i + 1}, ${ch.name}, is open! ${ch.goals.map(g => g.text).join('. ')}.`);
      drawGoals();
      return;
    }
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
      retry: {label: 'Keep building', onClick: () => { A.UI.results.hide(); if (G) { G.resultsUp = false; G.ch = curCh() + 1; drawGoals(); G.held = Math.max(0, G.held - 1); pause.setActive(true); A.Sfx.gameMenuMusic(GAME_ID, false); worldMusic(true); setTimeout(checkReached, 600); setTimeout(checkNewChapter, 900); } }},
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
    if (k === '/' && G.panel === 'craft') { e.preventDefault(); if (!book) { book = true; drawCraft(); } $('bookSearch').focus(); return; }
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
    box.innerHTML = (mode === 'inst' ? `<div class="ui-srow"><span class="ui-sname">Play by<small>${snare ? 'rhythms and rolls' : 'notes on your instrument'}, or taps</small></span>`
      : `<div class="ui-srow"><span class="ui-sname">Answer by<small>taps on the screen, or ${snare ? 'your drum' : 'your instrument'}</small></span>`) +
      `<span></span><div class="ui-seg" role="group" aria-label="${mode === 'inst' ? 'Play by' : 'Answer by'}"><button type="button" data-m="inst" aria-pressed="${mode === 'inst'}">My instrument</button><button type="button" data-m="touch" aria-pressed="${mode === 'touch'}">Touch</button></div></div>` +
      `<div class="ui-srow"><span class="ui-sname">Count-off clicks<small>a one-measure count you can hear before a rhythm card</small></span><span></span>` +
      `<div class="ui-seg" role="group" aria-label="Count-off clicks"><button type="button" data-co="1" aria-pressed="${gd().countoff !== false}">On</button><button type="button" data-co="0" aria-pressed="${gd().countoff === false}">Off</button></div></div>` +
      (isTouch() && padArr ? `<div class="ui-srow"><span class="ui-sname">On-screen controls</span><span></span><button type="button" class="btn btn-secondary btn-small bt-arrange-btn">Arrange controls</button></div>` : '');
    box.querySelectorAll('[data-co]').forEach(b => b.onclick = () => { saveGd({countoff: b.dataset.co === '1'}); box.querySelectorAll('[data-co]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.co === b.dataset.co))); });
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { switchMode(b.dataset.m); box.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.m === mode))); });
    const ar = box.querySelector('.bt-arrange-btn');
    if (ar) ar.onclick = () => { const ov = document.getElementById('uiSettings'); const done = ov && ov.querySelector('[data-act=done]'); if (done) done.click(); setTimeout(() => padArr.open(), 60); };
  }, {title: 'Blocktave'});
  function switchMode(m) {
    if (m === mode) return;
    mode = m; saveGd({mode}); drawMode();
    if (G) { Card.close(); listenSync(); drawHud(); pause.set({extras: pauseExtras()}); }
    if (m === 'inst' && G) A.requireMic(() => listenSync(), {offer: false});   // (mid-game: never the room check's offer)
  }
  addEventListener('resize', () => { if (G) sizeCanvas(); });

  /* ================= THE PAUSE MENU (shared/ui-kit.js) ================= */
  const pause = A.UI.pause.mount({
    place: $('hudLeft'),                                                  // right above the milestones box (style.css .bt-hudl)
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
    if (G && G.way && G.way.surfaceBtn) x.push({label: '↑ Surface', id: 'btSurface', onClick: () => goSurface()});
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
      creatures: G ? G.creatures.map(c => ({id: c.id, kind: c.kind, x: c.x, y: c.y, state: c.state, pc: c.item && c.item.pc, sounding: c.item && c.item.sounding, n: c.n, mul: c.mul, hp: c.hp, max: c.max, need: c.need, bar: hpShown(c, performance.now()), flee: c.flee || 0, pcs: c.pcs})) : [],
      wear: G ? {armor: G.p.wear.armor && Object.assign({max: wearMax('armor', G.p.wear.armor.id)}, G.p.wear.armor), shield: G.p.wear.shield && Object.assign({max: wearMax('shield', G.p.wear.shield.id)}, G.p.wear.shield)} : null,
      wornLeft: G ? Object.assign({}, G.p.wornLeft) : null, lastHit: G ? G.lastHit || null : null,
      damage: G ? dmgNow() : 0, dmgLabels: G ? (G.dmg || []).map(l => l.text) : [], ramp: G ? rampNow() : 0, cotTip: !!gd().cotTip,
      card: Card.current && Card.current.state(), panel: G && G.panel, build: G && G.build, seed: G && G.w.seed, bags: G ? G.w.bags.length : 0, cot: G && G.w.cot,
      held: G && G.held, tile: S, frames: fps(), run: G && {frames: G.nFrames || 0, ms: G.since ? performance.now() - G.since : 0},
      drops: G ? (G.w.drops || []).map(d => ({x: d.x, y: d.y, item: d.item, n: d.n, t: d.t || 0, pull: !!d.pull, falling: !!d.vy})) : [],
      labels: G ? (G.labels || []).map(labelText) : [], tip: tip.hidden ? null : tip.textContent, slots: slots.slice(),
      fx: G ? Object.assign({}, G.fx, {swing: !!G.swing, poofing: (G.poofs || []).length, far: !!G.far, rm: !!RM.matches}) : {},
      way: G && G.way ? {depth: G.way.depth, underS: G.way.underS, lostT: G.way.lostT, arrow: G.way.arrow, surfaceBtn: G.way.surfaceBtn, path: G.way.path ? G.way.path.length : null, next: G.way.path ? G.way.path.slice(0, 8) : null} : null,
      targetName: G ? G.targetName || '' : '',
      backdrop: BD.state(), torch: torchOn(), music: G && G.musicTrack, inCave: !!(G && G.inCave),
      gear: G ? {tubaboots: gearOn('tubaboots'), glider: gearOn('glider'), accelboots: gearOn('accelboots'), sonarfork: gearOn('sonarfork'), gliding: !!G.p.gliding} : null,
      vy: G && G.p.vy, warp: !!(G && G.warp), sonar: G ? {target: gd().sonar || null, hit: G.sonarHit || null} : null, lastChord: G && G.lastChord || null,
      signs: G ? Object.keys(G.w.meta).filter(k => G.w.meta[k] && G.w.meta[k].sign).map(k => ({at: k, sign: G.w.meta[k].sign, mate: G.w.meta[k].mate})) : [],
      ores2: G && G.ores2 || null, chapters: shownChapters(), oreSeen: Object.keys(gd().oreSeen || {}),
      courage: G && G.courage ? {inZone: G.courage.inZone, graceLeft: G.courage.grace, value: G.courage.value, warned: G.courage.warned, shown: G.courage.shown, jitter: !!G.jitter, jitters: G.fx.jitters || 0} : null}),
    /** the light a tile was drawn with last frame (world.js lightMap + the player's glow), or null off screen */
    lightAt: (x, y) => { const g = G && G.lightGrid; if (!g) return null; const i = x - g.x0, j = y - g.y0; return i < 0 || j < 0 || i >= g.cols || j >= g.rows ? null : g.v[j * g.cols + i]; },
    lightGrid: () => G && G.lightGrid && {x0: G.lightGrid.x0, y0: G.lightGrid.y0, cols: G.lightGrid.cols, rows: G.lightGrid.rows, v: Array.from(G.lightGrid.v)},
    surface: () => goSurface(),
    world: () => G && G.w, worldJSON: () => G && worldJSON(), importWorld: (t, ask) => importWorld(t, ask), save: () => saveWorld(),
    begin, showHub, fps, key: WORLD_KEY,
  };
  if (A.DEMO) {
    let stepNow = 0;                                    // demo.step()'s clock
    A.Blocktave.demo = {
      give: (id, n = 1) => { gain(id, n); return G.p.inv[id]; },
      drop: (id, n, x, y) => dropItem(id, n, x, y),
      calm: id => { const c = G.creatures.find(k => k.id === id); if (c) calm(c); return !!c; },
      hit: (id, n = 1) => { const c = G.creatures.find(k => k.id === id); return !!c && hitCreature(c, n); },
      nightFalls: () => nightFalls(),
      /** ARMOR AND SHIELDS: wear / take off / repair; a seeded random for blocks and fair rounding (null = Math.random) */
      wear: id => { if (!have(id)) gain(id, 1, true); return wear(id); },
      unwear: slot => unwear(slot),
      repair: slot => repair(slot),
      seedRandom: seed => { G.rnd = seed == null ? null : BW.rng(seed); },
      defend: (n, drain) => defend(n, drain),
      caps: kind => ({perNight: capOf(R.spawn.perNight, kind), atOnce: capOf(R.spawn.atOnce, kind)}),
      canHold: id => canHold(id),
      fromBook: id => fromBook(RECIPES.find(r => r.id === id)),
      addToSlot: id => addToSlot(id),
      tp: (x, y) => { G.p.x = x + .5; G.p.y = y + 1; G.p.vx = G.p.vy = 0; },
      find: (key, from) => { const w = G.w, v = ID[key], ox = from ? from.x : G.p.x, oy = from ? from.y : G.p.y; let best = null, bd = 1e9;
        for (let i = 0; i < w.b.length; i++) if (w.b[i] === v) { const x = i % w.w, y = Math.floor(i / w.w), d = Math.hypot(x - ox, y - oy); if (d < bd) { bd = d; best = {x, y}; } } return best; },
      /** stand next to (x, y) with room to breathe: dig out the two tiles above the spot next to it */
      standBy: (x, y) => { const w = G.w; for (const dx of [-1, 1]) { const sx = x + dx; BW.put(w, sx, y, ID.air); BW.put(w, sx, y - 1, ID.air); if (!B[BW.at(w, sx, y + 1)].solid) BW.put(w, sx, y + 1, ID.slate); G.p.x = sx + .5; G.p.y = y + 1; G.p.vx = G.p.vy = 0; return {x: sx, y}; } },
      put: (x, y, key) => BW.put(G.w, x, y, ID[key]),
      target: (x, y) => { G.target = {x, y}; },
      bgLow: on => saveGd({bgLow: !!on}),
      /** the card a performance kind would open at (x, y), and the notes a card there would use (tests) */
      spec: (kind, x, y, n) => spec(kind, x, y, n),
      notesAt: (x, y, n, o) => notesAt(x, y, n, o),
      /** open a card for a spec beside (x, y) (tests: a scale vein's card in the Bass Depths, an extreme staff) */
      /** a creature's own card (as if it were tapped) */
      creatureCard: id => { const c = G.creatures.find(k => k.id === id); if (c) creatureCard(c); return !!Card.current; },
      openSpec: (sp, x, y) => { G.fx.lastCard = null; openCard(sp, screenAt(x, y), sp.title || 'Test', r => { if (G) G.fx.lastCard = {ok: r.ok, why: r.why || null}; }); return !!Card.current; },
      /** put an item in the hotbar (the selected slot's neighbor: the first empty one) or take it out */
      hotbar: (id, on) => { const h = G.p.hot, k = h.indexOf(id); if (!on) { if (k >= 0) h[k] = null; } else if (k < 0) { const e = h.indexOf(null); h[e >= 0 ? e : h.length - 1] = id; } drawHot(); return h.slice(); },
      at: (x, y) => B[BW.at(G.w, x, y)].key,
      mine: (x, y) => mine(x, y),
      act: (x, y, build) => act(x, y, build),
      place: (x, y, id) => { if (!have(id)) gain(id, 1); return place(x, y, id); },
      answer: () => { const c = Card.current; if (c) c.answer(); return !!c; },
      craft: id => { const r = RECIPES.find(x => x.id === id); if (!r) return false; if (!G.panel) openCraft(); slots.fill(null); r.in.forEach((k, i) => { slots[i] = k; }); drawCraft(); perform(); return !!Card.current; },
      spawn: (kind, dx = 6) => { const x = G.p.x + dx; return spawn(kind, x, kind === 'wisp' ? G.p.y - 1.5 : G.p.y).id; },
      hurt: (n = 1, drain = false) => { G.p.hurtT = 0; hurt(n, null, drain); },
      time: t => { G.w.time = t; },
      heard: pc => heardNote(pc),
      listen: () => listenSync(),
      canSpawnAt: (x, y, kind = 'clam') => canSpawnAt(x, y, kind),
      spawnCheck: () => trySpawn(),
      award, stats: () => Object.assign({}, stats()), mode: m => switchMode(m),
      hold: on => { G.held = Math.max(0, G.held + (on ? 1 : -1)); },
      /** THE TEST CLOCK: run the world `s` seconds right now in fixed steps of `dt` (no waiting for frames, so a busy test
          machine's frame rate never changes the result), the same update() a frame runs; `each(t)` after every step
          (t = seconds run so far). Its clock carries on from the last step() (never behind the real one), so a mute or
          a timer set before the steps ends at the same game time however long the test machine takes between calls. The
          page's own frames carry on afterwards. */
      step: (s, each, dt = 1 / 60) => {
        let now = Math.max(performance.now(), stepNow);
        for (let k = 1, n = Math.round(s / dt); k <= n && G; k++) {
          now += dt * 1000;
          if (!G.held && !pause.paused) update(dt * (Card.current || panelOpen() ? R.challengeSlow : 1), dt, now);
          if (each) each(k * dt);
        }
        stepNow = now;
      },
      /** Chapter 6's helpers: press / release a key, the jump speed now, the organ, the sonar's pick */
      key: (k, on) => { G.keys[k] = !!on; },
      organ: () => playOrgan(),
      sonar: key => { saveGd({sonar: key || null}); G.sonarT = 0; },
      seeOre: key => seeOre(ID[key]),
      travel: (x, y) => travel(x, y),
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
