/* Showtime Malfunction: an articulation game. The arcade's old animatronic band lurches across the arcade floor;
   each one's voice box shows a note and a count (E♭ × 4). Play that note that many SEPARATE times (tongued, or
   struck: Arcade.Pitch.onAttack) to reboot it before it reaches the front and knocks out a spotlight.
   Notes: NOTES × ORDER (shared/mode-picker.js + sequences.js). The Snare Drum (an unpitched player) gets a count-only
   mode: no staff, any clean hit counts; the same band, special machines and Maestro Moose as everyone else.
   Progress: per instrument MEMBER (games.js byMember): setLevel(<progress key>, member id, showtime, {stars, best});
   the snare saves under 'showtime-malfunction:count'. Levels and rules: levels.js. Characters: characters.js.
   DIFFICULTY: Normal | NIGHTMARE (levels.js column `x`: bigger counts, faster walk). NIGHTMARE opens once this
   instrument has cleared The 5:00 Show on Normal (any mode; ?demo: always) and saves under the same keys + ':extra'.
   It is separate from the SPOOKY LEVEL (Mild | Spooky | Jump Scare), which only changes the visuals.
   SPECIAL MACHINES (levels.js SHOWTIME_SPECIALS, characters.js): from Showtime 3 on, an animatronic walking on may be
   a special one with an ability (one at a time; its first appearance on a device pauses for its card); the
   MALFUNCTION FILES (gameData.files) collect them. JUMP SCARE (the third spooky level; shared/teacher-settings.js can
   hide it; asked every time; back to Spooky on a new day): 1–2 scares a showtime (levels.js SHOWTIME_SCARES) that
   pause everything and never cost a spotlight. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'showtime-malfunction', SNARE_KEY = GAME_ID + ':count', EXTRA = ':extra';
  const LEVELS = window.SHOWTIMES, RULES = window.SHOWTIME_RULES, SHOW = A.Showtime;
  const SPEC = window.SHOWTIME_SPECIALS, MACH = SPEC.machines, SCARES = window.SHOWTIME_SCARES;
  const SCARE_TYPES = ['lunge', 'eyes', 'popup', 'band'];
  // ?demo&special=<id> (or a part of it: lurker, dolls…): every animatronic that may be a special is that one, from
  // Showtime 1 on (tests). ?demo&scare=<type> (Jump Scare on): that kind of scare, 3 s into the showtime
  const FORCE = (() => { const q = A.DEMO && (A.params.get('special') || '').toLowerCase(); return !q ? null : MACH[q] ? q : Object.keys(MACH).find(k => k.includes(q)) || null; })();
  const FORCE_SCARE = A.DEMO && SCARE_TYPES.includes(A.params.get('scare')) ? A.params.get('scare') : null;

  const inst = A.requireInstrument(GAME_ID);            // the snare is welcome here (games.js unpitched: true)
  if (!inst) return;
  const member = A.currentMember(), snare = inst.pitched === false, who = member.id;
  A.Pitch.setInstrument(inst);
  A.mountTopbar(inst, '', GAME_ID);
  $('demoHelp').hidden = !A.DEMO;
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const gd = A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const sfx = name => A.Sfx && A.Sfx.event(name);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = ([a, b]) => Math.floor(rand(a, b + 1));
  const pick = list => list[Math.floor(Math.random() * list.length)];

  /* ---------- the spooky level (remembered): Mild = glitches and static only; Spooky = darker, and a lean-in at game over;
     Jump Scare = everything Spooky has + 1–2 jump scares a showtime. Jump Scare: only when the teacher allows it
     (shared/teacher-settings.js), asked EVERY time it's turned on, never the default, and back to Spooky on a new day ---------- */
  const jumpAllowed = () => !!(A.TEACHER && A.TEACHER.JUMP_SCARE_ALLOWED);
  const dayKey = () => { const d = A.store.today ? A.store.today() : new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const spookyOn = () => gd.spooky === 'spooky' || gd.spooky === 'jump';
  const jumpOn = () => gd.spooky === 'jump';
  function setSpooky(v) {
    gd.spooky = v === 'jump' && jumpAllowed() ? 'jump' : v === 'spooky' || v === 'jump' ? 'spooky' : 'mild';
    if (gd.spooky === 'jump') gd.jumpDay = dayKey();
    save(); drawSpooky();
  }
  function drawSpooky() {
    if (gd.spooky === 'jump' && (!jumpAllowed() || gd.jumpDay !== dayKey())) { gd.spooky = 'spooky'; save(); }   // a new day, or switched off
    document.body.classList.toggle('spooky-mode', spookyOn());
    document.body.classList.toggle('jump-mode', jumpOn());
    document.querySelectorAll('[data-spooky="jump"]').forEach(b => { b.hidden = !jumpAllowed(); });
    document.querySelectorAll('[data-jump-note]').forEach(p => { p.hidden = !jumpAllowed(); });
    document.querySelectorAll('[data-spooky]').forEach(b => b.setAttribute('aria-pressed', b.dataset.spooky === (gd.spooky || 'mild')));
  }
  /** Jump Scare: asked every time it's turned on (shared/ui-kit.js confirm; the safe answer has the focus) */
  function askJump() {
    A.UI.confirm({title: 'Jump Scare mode', theme: 'st-jump', danger: true, yes: 'Yes', no: 'No',
      text: '<b>This mode has sudden jump scares with loud sounds. Are you sure?</b>',
      extra: `<label class="jw-check"><input type="checkbox" id="jwVisual"${gd.scareVisual ? ' checked' : ''}> Visual scares only (no scare sounds)</label>`,
      onYes: panel => { gd.scareVisual = panel.querySelector('#jwVisual').checked; }})
      .then(yes => { if (yes) { setSpooky('jump'); sfx('ui-toggle'); } });
  }
  // the spooky level's buttons: on the showtime screen, and in the Settings panel (so it can change from the pause menu)
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-spooky]'); if (!b) return;
    if (b.dataset.spooky === 'jump') { if (!jumpOn()) askJump(); return; }
    setSpooky(b.dataset.spooky); sfx('ui-toggle');
  });
  A.UI.settings.register(box => {
    box.innerHTML = `<span class="ui-label" id="spookySetLbl">Spooky level</span>
      <div class="ui-seg st-seg" role="group" aria-labelledby="spookySetLbl"><button type="button" data-spooky="mild">Mild</button><button type="button" data-spooky="spooky">Spooky</button><button type="button" class="jump-seg" data-spooky="jump" hidden>Jump Scare</button></div>
      <p class="st-jump-note" data-jump-note hidden>Jump Scare resets to Spooky each new day.</p>`;
    drawSpooky();
  });
  drawSpooky();

  /* ---------- THE MALFUNCTION FILES: every special machine; a silhouette until met, the whole file once rebooted ---------- */
  const files = () => gd.files || (gd.files = {});
  const fileOf = id => files()[id] || (files()[id] = {seen: 0, beaten: 0});
  const howFor = id => (snare && MACH[id].howSnare) || MACH[id].how;
  function drawFilesCount() {
    const n = SHOW.SPECIAL_IDS.filter(id => (files()[id] || {}).beaten).length;
    $('filesCount').textContent = `${n}/${SHOW.SPECIAL_IDS.length}`;
  }
  function showFiles() {
    $('filesGrid').innerHTML = SHOW.SPECIAL_IDS.map(id => {
      const f = files()[id] || {}, M = MACH[id], st = f.beaten ? 'done' : f.seen ? 'seen' : 'none';
      return `<div class="file f-${st}">
        <span class="bot ${st === 'done' ? 'fixed' : 'glitch'}${st === 'none' ? ' silhouette' : ''}">${SHOW.botSVG(id, {label: st === 'none' ? 'Unknown machine' : M.name})}</span>
        <b class="f-name">${st === 'none' ? '???' : M.name}</b>
        <span class="f-how">${st === 'done' ? howFor(id) : st === 'seen' ? 'Spotted! Reboot one to complete its file.' : 'Not found yet. Keep playing!'}</span>
        <span class="f-count">${st === 'done' ? `Rebooted ${f.beaten} time${f.beaten === 1 ? '' : 's'}` : ''}</span>
      </div>`;
    }).join('');
    $('files').hidden = false; $('filesClose').focus();
  }
  $('filesBtn').addEventListener('click', () => { showFiles(); sfx('ui-toggle'); });
  $('filesClose').addEventListener('click', () => { $('files').hidden = true; $('filesBtn').focus(); });
  $('files').addEventListener('keydown', e => { if (e.key === 'Escape') { $('files').hidden = true; $('filesBtn').focus(); } });

  /* ---------- the difficulty (remembered): Normal | NIGHTMARE, locked until The 5:00 Show is cleared on Normal ---------- */
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
    if (v === 'extra' && !gd.extraVisuals) { gd.extraVisuals = true; if (!spookyOn()) setSpooky('spooky'); }   // the first time: Spooky visuals (Mild still works)
    if (v === 'extra' && extraEarned()) markExtraSeen();
    gd.diff = v === 'extra' ? 'extra' : 'normal'; save();
    drawDiff(); sfx('ui-toggle');
    showHub();
  }
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => setDiff(b.dataset.diff)));
  /** a showtime's row for the chosen difficulty: Normal = levels.js as written; NIGHTMARE = its `x` column */
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
    A.Sfx.gameMenuMusic(GAME_ID);                   // menu music (games.js menuMusic); a menu never listens
    stopShow();
    if (picker) { picker.refresh(); A.ModePicker.useRange(picker.state); }   // star totals for the chosen difficulty
    pause.setActive(false); A.UI.results.hide();
    $('play').hidden = true; $('hub').hidden = false;
    document.body.classList.remove('in-show');
    drawDiff(); drawSpooky(); drawFilesCount();
    const key = progressKey(), x = isExtra();
    $('levelGrid').innerHTML = LEVELS.map((_, i) => {
      const lv = i + 1, L = rowFor(lv, x), p = A.store.level(key, who, lv);
      const open = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(key, who, lv - 1).stars > 0;
      const c = snare ? L.snare : L.count, times = c[0] === c[1] ? `× ${c[0]}` : `× ${c[0]}–${c[1]}`;
      const blurb = snare ? `${L.bots} animatronics, ${times} hits each${L.boss ? `, then Maestro Moose: ${L.boss.snare} hits, ${L.boss.phases} times` : ''}.`
        : picker.state.notes === 'first5' && picker.state.order === 'random' ? L.blurb : A.ModePicker.levelText(picker.state, Object.assign({}, L, {count: L.bots}), lv, [L.blurb]);
      return `<button class="lvl${L.boss ? ' boss' : ''}" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Showtime ${lv}</span>
        <span class="mini bot glitch">${SHOW.botSVG(L.boss ? 'moose' : ['walrus', 'owl', 'gator', 'raccoon'][i % 4])}</span>
        <span class="t">${L.name}</span>
        <span class="d">${blurb}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${open ? (p.best ? 'Best ' + p.best : times) : ''}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => {
      const lv = +b.dataset.l;
      const go = () => A.requireMic(() => startShow(lv));
      if (!gd.storySeen && RULES.storyOnce) showStory(go); else go();
    }));
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), picker: picker ? $('modePick') : null,
      unlocked: i => A.DEMO || i === 0 || A.store.level(key, who, i + 1).stars > 0 || A.store.level(key, who, i).stars > 0,
      lockText: i => `Clear Showtime ${i} to unlock`});
  }

  /* ---------- a showtime ---------- */
  let G = null, raf = 0, lastT = 0, lastAttack = 0, heldSince = 0, W = 0, H = 0;
  /* THE PAUSE MENU (shared/ui-kit.js). Its own flag (G.held), separate from G.paused (a special machine's card):
     the band, the game clock, the spawning, a jump scare in progress and every timer of the show hold still.
     The show's timers run on showClock(), which stops while paused (later()). */
  let heldMs = 0, heldAt = 0;
  const showClock = () => (heldAt || performance.now()) - heldMs;
  function later(fn, ms) { if (G) G.timers.push({at: showClock() + ms, fn}); }
  function runTimers() {
    if (!G || heldAt) return;
    const now = showClock(), due = G.timers.filter(t => t.at <= now);
    if (!due.length) return;
    G.timers = G.timers.filter(t => t.at > now);
    due.forEach(t => t.fn());
  }
  const pause = A.UI.pause.mount({
    onPause: () => { if (!G) return; G.held = true; heldAt = performance.now(); document.body.classList.add('st-frozen'); },
    onResume: () => {
      document.body.classList.remove('st-frozen');
      if (!G) return;
      const gap = performance.now() - heldAt;
      heldMs += gap; heldAt = 0;
      G.spawnAt += gap;                                       // the next animatronic waits as long as the pause did
      G.bots.forEach(b => { b.nextLurch += gap; });
      G.held = false; lastT = performance.now();
      if (G.scare) A.Pitch.suppress(Math.max(0, G.scareEnd - showClock()));   // a scare still going: nothing counts until it's over
    },
    onRestart: () => { const lv = G ? G.lv : 1; unfreeze(); startShow(lv); },
    onLevels: () => { unfreeze(); showHub(); },
    levelsLabel: 'Back to showtimes',
    canPause: () => !!G && !G.over,
    info: () => G ? [['Rebooted', `${G.rebooted} / ${G.total}`], ['Spotlights', `${G.lights} / ${RULES.spotlights}`], ['Score', G.score]] : [],
  });
  function unfreeze() { document.body.classList.remove('st-frozen'); if (heldAt) { heldMs += performance.now() - heldAt; heldAt = 0; } }
  const arena = $('arena');
  function measure() {
    W = arena.clientWidth; H = arena.clientHeight;
    panelSide = $('tpanel').getBoundingClientRect().left >= arena.getBoundingClientRect().right - 1;   // beside the arena, or below it
  }
  addEventListener('resize', () => { measure(); if (G) { G.bots.forEach(place); lineup($('band')); } const rb = document.getElementById('resBand'); if (rb && finished) lineup(rb, {maxH: resBandMax()}); });

  function startShow(lv) {
    A.LevelSelect.played(lv - 1);                   // the level select comes back with this level selected
    A.Sfx.gameMenuMusic(GAME_ID, false);            // the music fades out before anything is heard
    stopShow();
    const extra = isExtra(), L = rowFor(lv, extra), boss = L.boss, total = L.bots + (boss ? boss.phases : 0);
    let items = [], seq = null;
    if (!snare) {
      A.ModePicker.useRange(picker.state);
      seq = A.ModePicker.sequence(picker.state, Object.assign({}, L, {count: total}), lv);
      items = seq.items;
    }
    // who comes out: the band in a shuffled order (the snare too: only its counts are hits instead of notes)
    const kinds = ['walrus', 'owl', 'gator', 'raccoon'].sort(() => Math.random() - .5);
    const queue = [...Array(L.bots)].map((_, i) => ({kind: kinds[i % 4], count: randInt(snare ? L.snare : L.count), item: items[i] || null}));
    drawSpooky();                                   // a new day since the page opened: Jump Scare is back to Spooky
    G = {lv, L, extra, key: progressKey(), wasOpen: extraEarned(), queue, bots: [], sig: seq && seq.sig, fit: seq && seq.fit, name: seq ? seq.name : null,
      total: L.bots + (boss ? 1 : 0), rebooted: 0, lights: RULES.spotlights, score: 0, spawnAt: 0, over: false, band: [], nextId: 0,
      bossItems: boss ? items.slice(L.bots) : [], bossPending: !!boss,
      // the game clock (s: stops with the band), the pool the specials' extra notes come from, the special on the floor,
      // the intro card's pause, recent attacks (the Lurker's roll), the jump scares planned (game-clock seconds)
      t: 0, pool: seq ? seq.pool : [], special: null, paused: false, attacks: [], specials: 0, specialPts: 0,
      scare: null, scarePlan: planScares(L), entered: 0, lastScare: null, scares: [], held: false, timers: []};
    G.ext = extentOf(G.fit);
    A.UI.results.hide(); $('hub').hidden = true; $('play').hidden = false;
    document.body.classList.add('in-show');
    $('hudLevelLabel').textContent = `Showtime ${lv}${extra ? ' · Nightmare' : ''}`; $('hudLevelName').textContent = L.name;
    $('bots').innerHTML = ''; $('band').innerHTML = ''; banner('');
    lastTarget = null; tpShown = tpLook = null; drawPanel(null);
    drawLights(); hud();
    window.scrollTo(0, 0);
    measure();
    A.Pitch.ignoreCurrent();
    A.Pitch.demoAttacks = true;
    pause.setActive(true);
    banner("It's showtime!", 'go'); later(() => { if (G && !G.over) banner(''); }, 1300);
    sfx('showtime-start');
    G.spawnAt = performance.now() + 1200;
    lastT = performance.now(); raf = requestAnimationFrame(loop);
  }
  function stopShow() {
    cancelAnimationFrame(raf); raf = 0;
    unfreeze();
    $('scare').className = 'scare'; arena.classList.remove('band-snap'); $('specialCard').hidden = true;
    if (G) G.over = true;
    G = null; A.Pitch.demoAttacks = false;
  }

  /* ---------- the animatronics ---------- */
  const laneX = (lane, lanes) => lanes === 3 ? [.2, .5, .8][lane] : [.32, .68][lane];
  function spawn(spec, isBoss, at = {}) {
    const L = G.L, lanes = L.lanes, taken = G.bots.filter(b => b.state === 'walk');
    // the lane whose nearest occupant is farthest back
    let lane = 0, best = Infinity;
    for (let k = 0; k < lanes; k++) { const z = Math.max(-1, ...taken.filter(b => b.lane === k).map(b => b.z)); if (z < best) { best = z; lane = k; } }
    if (isBoss) lane = lanes === 3 ? 1 : 0;
    if (at.lane != null) lane = at.lane;
    const walk = spec.walk || (isBoss ? L.boss.walk : L.walk / (spec.speed || 1));
    const b = Object.assign({id: G.nextId++, lane, z: at.z || 0, zShown: at.z || 0, nextLurch: 0, state: 'walk', boss: !!isBoss, left: spec.count,
      phase: 1, phases: isBoss ? L.boss.phases : 1}, spec, {walk, total: spec.count});
    const el = document.createElement('div');
    el.className = 'bot glitch' + (b.boss ? ' boss' : '') + (b.special ? ' special sp-' + b.special : '') + (b.mini ? ' mini' : '') + (b.dark ? ' dark' : '');
    el.innerHTML = `<div class="ring" aria-hidden="true"></div><div class="sign${b.dark ? ' dark' : ''}"></div><div class="body">${SHOW.botSVG(b.kind, {plates: b.plates, label: SHOW.BAND[b.kind].name})}</div>`;
    b.el = el; b.sign = el.querySelector('.sign');
    if (b.special === 'blackout-bot') el.style.setProperty('--fade', MACH['blackout-bot'].fadeMs + 'ms');
    $('bots').appendChild(el);
    G.bots.push(b);
    drawSign(b); place(b);
    if (b.special) meetSpecial(b);
    return b;
  }

  /* ---------- THE SPECIAL MACHINES (levels.js SHOWTIME_SPECIALS) ---------- */
  /** which special (if any) the next animatronic becomes: never while another special is still walking */
  function chooseSpecial() {
    if (G.special && G.special.state === 'walk') return null;
    if (FORCE) return FORCE;
    const base = SPEC.chance[G.lv - 1] || 0, ch = base + (G.extra && base > 0 ? SPEC.nightmare : 0);
    return ch > 0 && Math.random() < ch ? pick(SHOW.SPECIAL_IDS) : null;
  }
  /** another note from the showtime's note set (a different pitch), for the Duet Dolls' second doll and the Jester's glitch */
  function otherItem(item) {
    const others = G.pool.filter(it => !item || it.pc !== item.pc);
    return others.length ? pick(others) : item;
  }
  /** a regular animatronic's spec turned into a special one (same note: it comes from ModePicker.sequence) */
  function specialize(spec) {
    const id = chooseSpecial();
    if (!id) return spec;
    const M = MACH[id], s = Object.assign({}, spec, {kind: id, special: id, speed: M.speed || 1});
    if (id === 'turbo-tin') s.count = randInt(snare ? M.snare : M.count);
    if (id === 'tuba-tank') { s.count = Math.round(spec.count * M.countMul); s.plates = Math.min(s.count, M.plates); }
    if (id === 'long-tone-lurker') { s.count = 1; s.need = (snare ? M.roll : M.hold)[G.lv - 1]; s.holdP = 0; }
    if (id === 'duet-dolls' && !snare) {
      let c = Math.max(M.minCount, spec.count); if (c % 2) c++;
      s.count = c; s.duet = [spec.item, otherItem(spec.item)]; s.turn = 0;
    }
    if (id === 'glitch-jester' && !snare) { s.count = Math.max(2, spec.count); s.switchLeft = s.count - Math.ceil(s.count * M.switchAt); }
    if (id === 'blackout-bot') s.dark = true;
    if (id === 'oil-can-ollie') s.oilT = 0;
    return s;
  }
  /** a special walks on: its sound, or (the first time on this device) the game pauses for its card */
  function meetSpecial(b) {
    G.special = b; G.specials++;
    const f = fileOf(b.special), first = !f.seen;
    f.seen = 1; save();
    if (!first) { sfx('special-' + b.special); return; }
    G.paused = true;
    $('spArt').innerHTML = SHOW.botSVG(b.kind, {plates: b.plates});
    $('spTitle').textContent = MACH[b.special].name;
    $('spHow').textContent = howFor(b.special);
    $('specialCard').hidden = false; $('spGo').focus();
    A.Sfx.sequence(['special-alert', 'special-intro'], 60, {channel: 'showtime'});
  }
  $('spGo').addEventListener('click', () => {
    $('specialCard').hidden = true;
    if (G) { G.paused = false; A.Pitch.ignoreCurrent(); lastT = performance.now(); }
  });
  /** every frame the band moves: Blackout Bot's note fading in, Oil Can Ollie's oil */
  function specialTick(b, dt) {
    if (b.dark && b.z >= MACH['blackout-bot'].revealAt) {
      b.dark = false; b.el.classList.remove('dark'); b.sign.classList.remove('dark');
      if (lastTarget === b) drawPanel(b);
    }
    if (b.special === 'oil-can-ollie') {
      const M = MACH['oil-can-ollie'];
      b.oilT += dt;
      if (b.oilT >= M.every) { b.oilT -= M.every; oil(b, M); }
    }
  }
  /** Oil Can Ollie: +1 play on the nearest other machine still walking (at most maxAdd each; the Lurker holds, it isn't counted) */
  function oil(from, M) {
    const lx = b => laneX(b.lane, G.L.lanes);
    const near = G.bots.filter(b => b !== from && b.state === 'walk' && b.special !== 'long-tone-lurker' && (b.oiled || 0) < M.maxAdd)
      .sort((a, c) => Math.hypot(lx(a) - lx(from), a.z - from.z) - Math.hypot(lx(c) - lx(from), c.z - from.z))[0];
    if (!near) return;
    near.left++; near.total++; near.oiled = (near.oiled || 0) + 1;
    drawSign(near);
    near.el.classList.remove('oiled'); void near.el.offsetWidth; near.el.classList.add('oiled');
    if (lastTarget === near) { drawPanel(near); setPrompt(`Oil Can Ollie oiled it: ${near.left} to go! Reboot Ollie to stop the oil.`, 'bad'); }
  }
  /** the Long Tone Lurker: the ring fills while its note is held steadily (the snare: a roll of rollRate hits a second),
      and drains slowly when the note stops or changes. Tonguing doesn't count (onAttack) */
  let lastRead = null;
  function lurkerTick(dt, now) {
    const t = target();
    if (!t || t.special !== 'long-tone-lurker') return;
    const M = MACH['long-tone-lurker'];
    let holding;
    if (snare) holding = A.Pitch.demoHeld() === 'drum' || G.attacks.filter(x => now - x < 1000).length >= M.rollRate;
    else holding = A.Pitch.demoHeld() === t.item.pc || !!(lastRead && now - lastRead.at < 250 && lastRead.r && lastRead.r.pc === t.item.pc);
    t.holdP = holding ? Math.min(t.need, t.holdP + dt) : Math.max(0, t.holdP - dt * M.drain);
    setHold(t);
    if (holding && !t.wasHolding) setPrompt(snare ? 'Keep rolling! Steady…' : 'Hold it! One long, steady note.', 'good');
    t.wasHolding = holding;
    if (t.holdP >= t.need) { t.left = 0; G.score += RULES.points.tick * Math.round(t.need * 2); reboot(t); hud(); }
  }
  function setHold(t) {
    const p = (t.holdP / t.need).toFixed(3);
    t.el.style.setProperty('--p', p);
    if (lastTarget === t) $('tpanel').style.setProperty('--p', p);
  }
  /** the Glitch Jester: halfway, its note glitches (slowly: a skew and a fade, never a flash) into another from the set */
  function jesterSwap(t) {
    t.switched = true;
    t.item = otherItem(t.item);
    t.el.classList.remove('reglitch'); void t.el.offsetWidth; t.el.classList.add('reglitch');
    t.el.style.setProperty('--glitch', MACH['glitch-jester'].glitchMs + 'ms');
    sfx('special-glitch-jester');
    setPrompt(`Glitch! Its note changed to ${t.item.label}.`, 'bad');
  }
  /** Tuba Tank: one armor plate pops off for every counted play (spread out when it needs more plays than it has plates) */
  function popPlates(b) {
    const keep = Math.ceil(b.left / b.total * b.plates);
    b.el.querySelectorAll('.body .a-plate').forEach(p => { if (+p.dataset.i >= keep && !p.classList.contains('popped')) p.classList.add('popped'); });
  }
  /** Split Sprocket rebooted: two minis in the lanes beside it (the middle lane: both sides), faster, one play each */
  function split(b) {
    const M = MACH['split-sprocket'], n = G.L.lanes, l = b.lane;
    const lanes = n === 2 ? [0, 1] : l === 0 ? [0, 1] : l === 2 ? [1, 2] : [0, 2];
    lanes.forEach(lane => spawn({kind: 'sprocket-mini', mini: true, count: randInt(snare ? M.miniSnare : M.miniCount),
      item: G.pool.length ? pick(G.pool) : b.item, walk: G.L.walk / M.miniSpeed}, false, {lane, z: Math.max(.05, b.z - .04)}));
    G.total += lanes.length;
    sfx('special-split-sprocket');
    setPrompt('Split Sprocket split in two! One play each.', 'bad');
  }

  /* ---------- JUMP SCARES (Jump Scare mode): every showtime gets 1 (2 on longer shows), timed by PROGRESS: a scare is
     armed when a set share of the animatronics has walked on (levels.js SHOWTIME_SCARES.at) and comes `delay` seconds
     later. It waits (never skips) while a guard holds: the first seconds of the show, too soon after the last scare, or
     the last seconds of one of Maestro Moose's phases. Never the last animatronic to walk on, so never in the last
     seconds of a show. ?demo&scare=<kind>: that kind, 3 s in (and again later) ---------- */
  function planScares(L) {
    if (!jumpOn()) return [];
    if (FORCE_SCARE) return [{at: 3}, {at: 3 + SCARES.apart}];
    const long = L.bots >= SCARES.longFrom || !!L.boss;
    return (long ? SCARES.at.long : SCARES.at.short).map(share => ({after: Math.min(L.bots - 1, Math.max(1, Math.round(share * L.bots))), at: null}));
  }
  /** the queue's animatronics walking on arm the planned scares */
  function armScares() {
    G.scarePlan.forEach(p => { if (p.at == null && G.entered >= p.after) p.at = G.t + SCARES.delay; });
  }
  function scareTick() {
    const next = G.scarePlan[0];
    if (!next || next.at == null || G.t < next.at || !jumpOn()) return;   // not armed yet / not time yet / switched off mid-show
    const walking = G.bots.filter(b => b.state === 'walk');
    const boss = walking.find(b => b.boss);
    const guard = G.t < SCARES.notBefore || (G.lastScare != null && G.t - G.lastScare < SCARES.apart) ||
      (boss && (boss.left <= 2 || (1 - boss.z) * boss.walk < SCARES.bossGuard));
    // the very end of the show (nothing left to come and the last one about to be rebooted): too late
    const ending = !G.queue.length && !G.bossPending && !walking.some(b => b.boss || b.z < .75);
    if (guard) { next.at = G.t + .5; return; }
    G.scarePlan.shift();
    if (ending && !FORCE_SCARE) { G.scareSkipped = (G.scareSkipped || 0) + 1; return; }
    G.lastScare = G.t;
    scare(FORCE_SCARE || null, walking.length ? pick(walking.filter(b => !b.boss).concat(walking).slice(0, 3)) : null);
  }
  /** one scare (~1.3 s), then a short beat: the band, the clocks and the microphone all wait (a scare never costs a spotlight) */
  function scare(type, src) {
    let kind = type || pick(G.band.length ? SCARE_TYPES : SCARE_TYPES.filter(t => t !== 'band'));
    if (kind === 'band' && !G.band.length) kind = 'lunge';
    if (reduced.matches) kind = 'fade';                     // reduced motion: a quick fade to darkness and eyes, nothing moves
    const el = $('scare'), ms = SCARES.ms;
    G.scare = {kind, from: src ? src.kind : null}; G.scareEnd = showClock() + ms + SCARES.beat;
    G.scares.push({kind, t: +G.t.toFixed(1)});
    A.Pitch.suppress(ms + SCARES.beat);                    // nothing heard counts until the band moves again
    const who = src && src.kind !== 'duet-dolls' ? src.kind : pick(['walrus', 'owl', 'raccoon', 'gator']);
    $('scareBot').innerHTML = kind === 'band' || kind === 'fade' ? '' : `<span class="bot glitch">${SHOW.botSVG(who)}</span>`;
    el.className = 'scare on sct-' + kind;
    if (kind === 'band') arena.classList.add('band-snap');
    if (!gd.scareVisual) sfx('scare-sting-' + randInt([1, 3]));
    later(() => { el.classList.add('out'); arena.classList.remove('band-snap'); }, ms);
    later(() => {
      el.className = 'scare';
      if (G && G.scare) { G.scare = null; A.Pitch.ignoreCurrent(); lastT = performance.now(); }
    }, ms + SCARES.beat);
  }
  /* one note on a short staff: the voice box signs and the target panel (tight around the clef, key signature and note) */
  function noteStaff(item, opts = {}) {
    const sigW = A.keySigWidth(G.sig), w = 118 + sigW;
    const svg = A.staffSVG(inst.clef, [{n: item.show, x: 88 + sigW}], {fit: G.fit, keySig: G.sig, width: w, label: `Play ${item.label}`});
    if (!opts.fitted) return svg;
    // the panel: the same box for every note of the pool, so the staff never jumps; a wide pool (Chromatic) would
    // make every note tiny, so there each note gets its own box
    const ext = G.ext.bot - G.ext.top <= 150 ? G.ext : extentOf([item.show]);
    return svg.replace(/viewBox="[^"]*"/, `viewBox="0 ${ext.top} ${w} ${ext.bot - ext.top}"`);
  }
  /** the room notes need around the staff (the clef, stems and ledger lines) */
  function extentOf(notes) {
    let top = 38, bot = 138;
    (notes || []).forEach(n => { const y = A.noteY(inst.clef, n); top = Math.min(top, y > 88 ? y - 56 : y - 12); bot = Math.max(bot, y > 88 ? y + 12 : y + 56); });
    return {top, bot};
  }
  function drawSign(b) {
    const n = b.left;
    let staff = !snare && b.item ? noteStaff(b.item) : '<span class="drum-ico big" aria-hidden="true"></span>';
    let count = `<b class="vb-count">× ${n}</b>`;
    if (b.duet) staff = b.duet.map((it, i) => `<span class="duet-n${i === b.turn ? ' now' : ''}">${noteStaff(it)}</span>`).join('');
    if (b.special === 'long-tone-lurker') count = holdRing(b.need, snare ? 'Roll' : 'Hold');
    const oil = b.oiled ? `<span class="vb-oil" aria-label="Oiled: plus ${b.oiled}">${'<i></i>'.repeat(b.oiled)}</span>` : '';
    b.sign.innerHTML = `<div class="vb-top">${b.special ? MACH[b.special].name : 'Voice box'}${b.boss ? ` · phase ${b.phase}/${b.phases}` : ''}<span class="vb-next">Next</span></div>` +
      `<div class="vb-main">${staff}${count}${oil}<span class="vb-dark" aria-hidden="true">?</span></div>`;
    b.signH = b.sign.offsetHeight;
  }
  /* pseudo-3D: the back of the arcade (z 0) is small and near the horizon; the front (z 1) is big, at the bottom */
  /** the Long Tone Lurker's ring (fills with --p on the bot or the panel) and its seconds */
  const holdRing = (need, word) => `<span class="hold-ring" role="img" aria-label="${word} for ${need} seconds"><svg viewBox="0 0 44 44" aria-hidden="true">` +
    `<circle class="hr-bg" cx="22" cy="22" r="18"/><circle class="hr-fill" cx="22" cy="22" r="18" pathLength="100"/></svg><b>${need}s</b><small>${word}</small></span>`;
  function place(b) {
    if (!W) measure();
    const z = b.zShown, sc = (.3 + .7 * z) * (b.boss ? 1.3 : b.mini ? .72 : 1);
    const baseH = H * .58, baseW = baseH * .7;
    const cx = W * (.5 + (laneX(b.lane, G.L.lanes) - .5) * (.45 + .55 * z));
    const feet = H * (.38 + .6 * z);
    b.el.style.width = baseW + 'px'; b.el.style.height = baseH + 'px';
    b.el.style.transform = `translate3d(${(cx - baseW / 2).toFixed(1)}px,${(feet - baseH).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
    b.el.style.zIndex = 10 + Math.round(z * 100);
    const k = Math.max(sc, W < 500 ? .7 : .8) / sc;                       // far signs never shrink below a readable size
    b.sign.style.setProperty('--k', k.toFixed(3));
    // a far sign that would poke out of the top of the arena slides down over its own head instead
    const top = feet - baseH * sc * .98 - (b.signH || 0) * k * sc;
    b.sign.style.setProperty('--dy', (top < 4 ? (4 - top) / sc : 0).toFixed(1) + 'px');
  }
  function target() {
    let t = null;
    G.bots.forEach(b => { if (b.state === 'walk' && (!t || b.z > t.z)) t = b; });
    return t;
  }
  let lastTarget = null, lastNext = null;
  function markTarget() {
    const t = target();
    // the NEXT tag: the second-closest one still walking
    let nx = null;
    if (t) G.bots.forEach(b => { if (b !== t && b.state === 'walk' && (!nx || b.z > nx.z)) nx = b; });
    if (nx !== lastNext) { if (lastNext) lastNext.el.classList.remove('next'); if (nx) nx.el.classList.add('next'); lastNext = nx; }
    if (t === lastTarget) return;
    if (lastTarget) lastTarget.el.classList.remove('target');
    lastTarget = t;
    drawPanel(t);
    if (t) {
      t.el.classList.remove('next');
      t.el.classList.add('target');
      setPrompt(targetPrompt(t));
      heldSince = 0;
    }
  }

  const doll = t => t.turn ? 'second' : 'first';
  function targetPrompt(t) {
    if (t.special === 'long-tone-lurker') return snare ? `Keep a steady roll (${MACH['long-tone-lurker'].rollRate} hits a second) until the ring fills!` : `Hold ${t.item.label} until the ring fills. One long, steady note.`;
    if (t.dark) return 'Blackout Bot! Its note is hidden in the dark. Watch closely…';
    if (t.duet) return `Take turns: ${t.duet[0].label}, ${t.duet[1].label}, ${t.duet[0].label}… × ${t.left}. Now the ${doll(t)} doll.`;
    return snare ? `Hit ${t.left} times!` : `Play ${t.item.label} × ${t.left}. Tongue each one.`;
  }
  /* ---------- THE TARGET PANEL: the current target's note and count, big and fixed, whatever its distance ---------- */
  let tpShown = null, tpLook = null;                        // what the panel shows: '<bot id>:<phase>' (+ the note shown)
  function drawPanel(t) {
    const el = $('tpanel');
    el.classList.toggle('idle', !t);
    if (!t) { tpShown = tpLook = null; $('tpWho').textContent = G && !G.over ? 'Get ready…' : ''; $('tpStaff').innerHTML = ''; $('tpCount').textContent = ''; tether(null); return; }
    const key = t.id + ':' + t.phase;
    // what the staff shows: the note (the Duet Dolls: the one whose turn it is; Blackout Bot: nothing while it's dark)
    const look = key + ':' + (t.item ? t.item.label + t.item.midi : '') + ':' + (t.dark ? 'dark' : '');
    if (key !== tpShown) {                                  // a new target (or the Maestro's next phase): redraw and flash
      tpShown = key;
      el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
    }
    if (look !== tpLook) {                                  // a new note on the same target (Duet turns, the Jester, the dark lifting): quietly
      tpLook = look;
      $('tpWho').textContent = SHOW.BAND[t.kind].name + (t.boss ? ` · phase ${t.phase}/${t.phases}` : '') + (t.duet ? ` · ${doll(t)} doll` : '');
      $('tpStaff').innerHTML = t.dark ? '<span class="tp-dark">Too dark to read…<br>wait for it!</span>'
        : !snare && t.item ? noteStaff(t.item, {fitted: true}) : '<span class="drum-ico huge" aria-hidden="true"></span>';
      el.classList.toggle('tp-special', !!t.special);
    }
    if (t.special === 'long-tone-lurker') {
      if (!$('tpCount').querySelector('.hold-ring')) $('tpCount').innerHTML = holdRing(t.need, snare ? 'Roll' : 'Hold');
      $('tpCount').setAttribute('aria-label', `${snare ? 'Roll' : 'Hold'} for ${t.need} seconds`);
      el.style.setProperty('--p', (t.holdP / t.need).toFixed(3));
      return;
    }
    $('tpCount').textContent = `× ${t.left}`;
    $('tpCount').setAttribute('aria-label', `${t.left} more`);
  }
  function tickPanel() {
    const c = $('tpCount'); c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick');
  }
  /* the tether: a thin line from the target's voice box (side panel) or its feet (panel below) to the panel's edge */
  let panelSide = true;
  function tether(t) {
    const svg = $('tether'), line = $('tetherLine');
    if (!t || t.state !== 'walk') { svg.classList.remove('on'); return; }
    const ar = arena.getBoundingClientRect();
    let x1, y1, x2, y2;
    if (panelSide) {
      const r = t.sign.getBoundingClientRect();
      x1 = r.right - ar.left; y1 = r.top + r.height / 2 - ar.top; x2 = W; y2 = Math.min(H - 20, Math.max(20, y1));
    } else {
      const r = t.el.querySelector('.ring').getBoundingClientRect();
      x1 = r.left + r.width / 2 - ar.left; y1 = r.bottom - ar.top; x2 = x1; y2 = H;
    }
    line.setAttribute('x1', x1.toFixed(1)); line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1)); line.setAttribute('y2', y2.toFixed(1));
    svg.classList.add('on');
  }

  /* ---------- the loop: walk, spawn, knock out spotlights ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!G) return;
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    // the band stands still while a sound plays (the detector is deaf then) or the tab is hidden
    // …and while a special machine's card is open, or during a jump scare
    // …and while the pause menu is open (G.held)
    runTimers();
    if (!G) return;
    const still = G.over || G.paused || G.held || !!G.scare || document.hidden || A.Pitch.isSuppressed(now);
    if (!still) {
      G.t += dt;
      if (G.bossPending && now >= G.spawnAt) { G.bossPending = false; spawn({kind: 'moose', count: snare ? G.L.boss.snare : G.L.boss.count, item: G.bossItems[0] || null}, true); G.spawnAt = now + 2500; }
      const walking = G.bots.filter(b => b.state === 'walk' && !b.boss).length;
      if (G.queue.length && walking < G.L.atOnce && now >= G.spawnAt) {
        spawn(specialize(G.queue.shift()));
        G.entered++; armScares();
        G.spawnAt = now + G.L.walk * 1000 / (G.L.atOnce + .6);
      }
      G.bots.forEach(b => {
        if (!G || b.state !== 'walk') return;                 // (the last one reaching the front can end the show mid-loop)
        b.z = Math.min(1, b.z + dt / b.walk);
        if (reduced.matches) b.zShown = b.z;
        else if (now >= b.nextLurch) {                         // stop-motion: a jerky step, and a twitch
          b.zShown = b.z; b.nextLurch = now + rand(...RULES.lurchMs);
          b.el.classList.toggle('twitch');
        }
        place(b);
        specialTick(b, dt);
        if (b.z >= 1) reachFront(b);
      });
      if (!G) return;
      lurkerTick(dt, now);
      scareTick();
    }
    markTarget();
    tether(G.over ? null : lastTarget);
  }
  function reachFront(b) {
    if (G.over) return;
    G.lights--; drawLights(true); sfx('spotlight-out');
    if (b.boss) { b.z = Math.max(.05, b.z - .35); b.zShown = b.z; place(b); }   // the Maestro staggers back and keeps coming
    else {
      b.state = 'gone'; b.el.classList.add('fizzle'); b.el.classList.remove('target');
      if (G.special === b) G.special = null;
      later(() => b.el.remove(), 900);
    }
    setPrompt('A spotlight went out!', 'bad');
    hud();
    if (G.lights <= 0) return gameOver(b);
    checkEnd();
  }

  /* ---------- listening: every separate attack on the right note counts one down ---------- */
  A.Pitch.demoTarget = () => { const t = G && !G.over ? target() : null; return t && !snare && t.item ? {pc: t.item.pc, midi: t.item.sounding} : null; };
  A.Pitch.onAttack(a => {
    if (!G || G.over || G.paused || G.held || G.scare) return;
    const t = target(); if (!t) return;
    lastAttack = a.time; heldSince = 0;
    const tNow = performance.now();
    G.attacks.push(tNow); while (G.attacks.length && tNow - G.attacks[0] > 1500) G.attacks.shift();
    if (t.special === 'long-tone-lurker') {                     // tonguing doesn't count: it wants one long, steady note (snare: a roll)
      if (!snare) setPrompt('Hold it! One long, steady note.', 'hint');
      return;
    }
    if (t.duet && a.pc !== null && a.pc !== t.item.pc && a.pc === t.duet[1 - t.turn].pc) {   // the other doll's note: not its turn, nothing happens
      setPrompt(`Take turns! Now the ${doll(t)} doll: ${t.item.label}.`, 'hint');
      return;
    }
    const ok = snare || (a.pc !== null && t.item && a.pc === t.item.pc);
    if (!ok) {
      t.sign.classList.remove('sour'); void t.sign.offsetWidth; t.sign.classList.add('sour');
      if (a.pc !== null) setPrompt(`That's ${G.name(a.pc)}. Play ${t.item.label}.`, 'bad');
      return;
    }
    t.left--; G.score += RULES.points.tick;
    t.el.classList.remove('spark'); void t.el.offsetWidth; t.el.classList.add('spark');
    if (t.plates) popPlates(t);
    if (t.duet) { t.turn = 1 - t.turn; t.item = t.duet[t.turn]; t.el.classList.toggle('duet-b', t.turn === 1); }
    if (t.left > 0) {
      const swapped = t.switchLeft != null && !t.switched && t.left <= t.switchLeft;
      if (swapped) jesterSwap(t);
      drawSign(t); t.sign.classList.remove('tick'); void t.sign.offsetWidth; t.sign.classList.add('tick');
      drawPanel(t); tickPanel();
      if (!swapped) sfx('attack-tick');
      if (swapped) { /* its own message */ }
      else if (t.duet) setPrompt(`${t.left} more! Now the ${doll(t)} doll: ${t.item.label}.`, 'good');
      else setPrompt(snare ? `${t.left} more!` : `${t.left} more ${t.item.label}${t.left > 1 ? 's' : ''}!`, 'good');
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
    if (b.special) {                                        // a special machine: bonus points and its Malfunction File
      const bonus = RULES.points.special + (MACH[b.special].points || 0);
      G.score += bonus; G.specialPts += bonus;
      const f = fileOf(b.special); f.seen = 1; f.beaten = (f.beaten || 0) + 1; save();
      G.beaten = (G.beaten || 0) + 1;
      if (G.special === b) G.special = null;
    }
    sfx('reboot');
    if (b.special === 'split-sprocket') setTimeout(() => { if (G && !G.over) split(b); }, 0);
    setPrompt(`${SHOW.BAND[b.kind].name} rebooted!`, 'good');
    b.sign.innerHTML = '<div class="vb-top">Rebooted</div><div class="vb-main"><b class="vb-count">♪</b></div>';
    // it straightens up and shuffles back to the stage, where it joins the band
    later(() => { b.el.classList.add('walk-home'); b.el.style.transform = `translate3d(${W / 2 - 20}px,${H * .1}px,0) scale(.12)`; }, reduced.matches ? 50 : 500);
    later(() => { b.el.remove(); b.state = 'home'; joinBand(b); checkEnd(); }, reduced.matches ? 400 : 1700);
    lastTarget = null;
  }
  function joinBand(b) {
    G.band.push(b);
    const s = document.createElement('span');
    s.className = 'bot fixed band-bot' + (b.boss ? ' boss' : '') + (b.mini ? ' mini' : '');
    s.innerHTML = SHOW.botSVG(b.kind);
    $('band').appendChild(s);
    lineup($('band'));
    hud();
  }
  /* THE LINEUP (the stage band, and the rebooted band on the results screen): everyone always fits in the box. It picks
     the number of rows (1–4) that lets the characters be tallest: neighbours overlap a little (LINEUP.overlap of a
     character's width), each row further back overlaps the one in front (LINEUP.rowStep of a character's height)
     and is offset half a step; the front row is drawn in front. `maxH`: the box grows to fit, up to that height (the
     results); without it the box's own height is the limit (the stage). Children: .bot elements (.boss 1.18× tall,
     .mini 0.72×), placed absolutely. */
  const LINEUP = {aspect: .7, overlap: .38, rowStep: .55, maxRows: 4};
  function lineup(box, {maxH} = {}) {
    const kids = [...box.children], n = kids.length;
    if (!n) { if (maxH) box.style.height = '0px'; return; }
    const Wb = box.clientWidth, Hb = maxH || box.clientHeight;
    if (!Wb || !Hb) return;
    let best = null;
    for (let r = 1; r <= Math.min(LINEUP.maxRows, n); r++) {
      const c = Math.ceil(n / r), step = LINEUP.aspect * (1 - LINEUP.overlap);
      const hW = Wb / (step * (c - 1) + LINEUP.aspect + (r > 1 ? step / 2 : 0));
      const hH = Hb / (1.18 + (r - 1) * LINEUP.rowStep);                  // room for a boss's taller head
      const h = Math.min(hW, hH);
      if (!best || h > best.h + .5) best = {r, c, h};
    }
    const {r, c, h} = best, w = h * LINEUP.aspect, step = w * (1 - LINEUP.overlap);
    // Maestro Moose (the boss) stands in the middle of the front row
    const order = kids.filter(el => !el.classList.contains('boss'));
    kids.filter(el => el.classList.contains('boss')).forEach(el => order.splice(Math.floor(Math.min(c, order.length + 1) / 2), 0, el));
    const total = h * (1.18 + (r - 1) * LINEUP.rowStep);
    if (maxH) box.style.height = Math.ceil(total) + 'px';
    const Hbox = maxH ? total : box.clientHeight;
    order.forEach((el, i) => {
      const row = Math.floor(i / c), inRow = row < r - 1 ? c : n - c * (r - 1), k = i - row * c;
      const sc = el.classList.contains('boss') ? 1.18 : el.classList.contains('mini') ? .72 : 1;
      const rowW = step * (inRow - 1) + w, x0 = (Wb - rowW) / 2 + (row % 2 ? step / 2 : 0);
      const bottom = Hbox - row * h * LINEUP.rowStep;
      Object.assign(el.style, {position: 'absolute', width: (w * sc).toFixed(1) + 'px', height: (h * sc).toFixed(1) + 'px',
        left: (x0 + k * step + (w - w * sc) / 2).toFixed(1) + 'px', top: (bottom - h * sc).toFixed(1) + 'px', zIndex: String(100 - row * 10 + k % 10)});
    });
    box.dataset.rows = r;
  }
  function checkEnd() {
    if (!G || G.over) return;
    const busy = G.bots.some(b => b.state === 'walk' || b.state === 'reboot');
    if (!G.queue.length && !G.bossPending && !busy) finish(true);
  }

  /* ---------- the hint: a note held on without a new attack ---------- */
  A.Pitch.onFrame((r, level, now) => {
    if (!G) return;
    lastRead = {r, at: performance.now()};
    $('hearNote').textContent = snare ? (level > A.Pitch.gate ? 'Hit' : '–') : r ? G.name(r.pc) : '–';
    const bars = A.Pitch.bars(level);
    $('hearBars').querySelectorAll('i').forEach((b, i) => b.classList.toggle('on', i < bars));
    const t = !G.over && !G.paused && !G.held && !G.scare && target();
    if (!t || t.special === 'long-tone-lurker') return;       // the Lurker WANTS a held note (lurkerTick)
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
    pause.setActive(false);                         // the show is over: nothing left to pause
    drawPanel(null);
    sfx('showtime-over');
    banner("SHOWTIME'S OVER", 'over');
    document.body.classList.add('lights-out');
    if (spookyOn() && !reduced.matches) {           // Spooky: a sudden (silent) lean-in from the nearest one
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
    A.store.setLevel(g.key, who, g.lv, {stars: Math.max(stars, old.stars), best: Math.max(g.score, old.best)}, stars);
    const hasNext = g.lv < LEVELS.length && (stars > 0 || A.DEMO);
    const unlockedNow = !g.extra && !g.wasOpen && extraEarned();       // The 5:00 Show cleared on Normal for the first time
    if (unlockedNow) markExtraSeen();
    const extra = (unlockedNow ? '<p class="x-unlock" id="resUnlock"><b>NIGHTMARE unlocked!</b> The band is faster, and every voice box wants more plays. Pick it on the showtime screen.</p>' : '') +
      (g.beaten ? `<p class="res-special" id="resSpecial">Special machines rebooted: ${g.beaten} (+${g.specialPts} bonus points). See them in the Malfunction Files!</p>` : '');
    A.UI.results.show({gameId: GAME_ID, theme: 'st-results', stars,
      // the rebooted band: BELOW the stars (never over them), every one of them fitting (lineup: smaller, more rows)
      onShow: panel => {
        const band = document.createElement('div');
        band.className = 'res-band'; band.id = 'resBand'; band.setAttribute('aria-hidden', 'true');
        band.innerHTML = g.band.map(b => `<span class="bot fixed${b.boss ? ' boss' : ''}${b.mini ? ' mini' : ''}">${SHOW.botSVG(b.kind)}</span>`).join('');
        const stars = panel.querySelector('.ui-stars');
        if (stars) stars.after(band); else panel.prepend(band);
        lineup(band, {maxH: resBandMax()});
      },
      title: !survived ? "Showtime's over" : stars === 3 ? 'Perfect show!' : 'Show saved!',
      msg: !survived ? `The band got through all ${RULES.spotlights} spotlights. Start each note fresh and fast, and reboot the closest one first. You've got this!`
        : stars === 3 ? `Every animatronic rebooted, every spotlight still shining.${g.L.boss ? ' Maestro Moose is back on the podium!' : ''}`
        : stars === 2 ? 'One spotlight went out. Keep them all lit for 3 stars.' : 'You kept the show going! Lose one spotlight or fewer for 2 stars.',
      tiles: [['Rebooted', `${g.rebooted}/${g.total}`, 'resHits'], ['Spotlights', `${g.lights}/${RULES.spotlights}`, 'resLights'], ['Score', g.score, 'resScore']],
      newBest, best: old.best ? `Best: ${Math.max(g.score, old.best)}` : '',
      extra,
      next: {label: 'Next showtime', hidden: !hasNext, onClick: () => A.requireMic(() => startShow(finished.lv + 1))},
      retry: {label: 'Try again', onClick: () => A.requireMic(() => startShow(finished.lv))},
      levels: {label: 'Showtimes', onClick: showHub}});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});   // the menu music again, after the result sounds
    A.Sfx.sequence([stars ? 'level-complete' : null, stars > old.stars && 'star-earned', newBest && 'new-high-score', unlockedNow && 'nightmare-unlocked']);
    G = null;
    finished = g;
  }
  let finished = null;
  /** the results' band: at most this tall (the stars, the words and the buttons still fit on a short screen) */
  const resBandMax = () => Math.max(70, Math.min(150, innerHeight * .2));

  A.Showtime.debug = () => G;                              // tests
  A.Showtime.lineup = lineup;                              // tests: lay out a stage/results band
  A.Showtime.finish = () => finish(true);                  // tests: end the show now (survived)
  A.Showtime.scare = type => G && !G.scare && scare(type, G.bots.find(b => b.state === 'walk'));   // tests: one scare now
  showHub();
})(window.Arcade);
