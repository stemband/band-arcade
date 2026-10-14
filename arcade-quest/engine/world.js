/* ARCADE QUEST ENGINE: the OVERWORLD. Top-down rooms made of 16 × 16 tiles (data/maps/…), a camera that follows you,
   walls you bump into, doors between rooms, candles and fog that flicker and drift.
   MOVING: one tile per step (arrows/WASD or the D-pad), smooth in between. A (Enter/Space) talks to whoever you
   face or inspects the thing in front of you; B (Backspace/X, the pad's B), Esc, P or the PAUSE button opens THE
   PAUSE MENU (shared/ui-kit.js Arcade.UI.pause, pixel-themed in style.css: RESUME · SETTINGS · CHARMS · BAND · TITLE SCREEN,
   with LV/HP/XP/tokens). It exists only in the overworld (battles are turn-based and wait for you; cutscenes have SKIP);
   while it's open Q.paused stops the whole game loop, Q.wait and the text box. Esc during a conversation or a panel
   still means B (back / next line), so the two never both react.
   GHOSTS are visible and wander near their spot (no random battles). Bump into one (or let it bump into you) and a
   battle starts. A ghost you befriend or fade never comes back (saved in save.done), except in a `practice` room.
   Q.go('world', {map, x, y, dir})     enter a room (x, y = a tile; left out = the room's start)
   Q.go('world', {continue: true})     back to the last Save Jukebox (or the episode's hub: the Foyer, the Lobby)
   Q.episodes.go(1 | 2)                EPISODE SELECT: Episode 1 = the Foyer's jukebox; Episode 2 (only after ep1Done) =
                                       its intro cutscene the first time, then its last Save Jukebox (or the Lobby's)
   Q.go('world', {resume: true, result})  back from a battle (battle.js does this)
   Q.world.state()                     for tests: {map, x, y, dir, ghosts, npcs, busy, moving, paused, whisper}
   Conversations, signs, the jukebox, the Token Booth, the shop and the pause menu are in engine/talk.js. */
(function (A) {
  "use strict";
  const Q = A.Quest, T = 16;
  const STEP = 0.16, GHOST_STEP = 0.3;                      // seconds per tile: you, a wandering ghost
  const MAPS = () => window.QUEST_MAPS, TILES = () => window.QUEST_TILES;
  const DIRS = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
  let W = null, offKeys = null;

  /* ---------- THE PAUSE MENU (the arcade's shared one: shared/ui-kit.js) ---------- */
  let pause = null, frozen = false, wasBusy = false, inCharms = false;
  function freeze() {
    if (frozen) return;
    frozen = true; Q.paused = true; document.body.classList.add('q-paused'); Q.input.clear();
    if (W) { wasBusy = W.busy; W.busy = true; }
  }
  function unfreeze() {
    if (!frozen) return;
    frozen = false; Q.paused = false; document.body.classList.remove('q-paused'); Q.input.clear();
    if (W) W.busy = wasBusy;
  }
  const idle = () => !!W && !W.busy && !W.fade && !W.fighting;
  /** Esc belongs to the pause menu only when nothing else is on screen (engine/input.js asks) */
  Q.pauseOwnsEsc = () => !!pause && pause.active && Q.sceneName === 'world' && idle();
  /* THE MENU BUTTON: the kit's pause button, placed in the game screen's top-right corner (#qMenuSlot, beside the
     canvas, never inside #ui, which every scene redraws) and dressed as "☰ MENU". It shows only while you're free
     to walk (the same as when Esc/P/B/M may pause: no battle, no conversation, no panel); engine/controls.js keeps an
     arranged pad clear of it. */
  function menuSlot() {
    let slot = document.getElementById('qMenuSlot');
    if (!slot) { slot = Q.el('div', 'q-menuslot'); slot.id = 'qMenuSlot'; document.getElementById('stage').appendChild(slot); }
    return slot;
  }
  const MENU_ICON = '<svg viewBox="0 0 7 6" aria-hidden="true" shape-rendering="crispEdges"><rect y="0" width="7" height="1"/><rect y="2.5" width="7" height="1"/><rect y="5" width="7" height="1"/></svg>';
  function kitPause() {
    if (pause || !A.UI || !A.UI.pause) return pause;
    pause = A.UI.pause.mount({
      theme: 'q-theme',
      place: menuSlot(),
      onPause: freeze,
      onResume: () => {
        if (!inCharms) unfreeze();                                     // (the tab hidden over CHARMS: that panel is still open)
        // the kit gives the PAUSE button the focus back; here A (Enter/Space) must talk, not press it again
        setTimeout(() => { if (pause && document.activeElement === pause.el) pause.el.blur(); }, 0);
      },
      // never mid-battle-flash or while the microphone listens (the Butler's lesson); Esc/P only when you're free to walk
      canPause: reason => Q.sceneName === 'world' && !!W && !W.fighting && !Q.input.blocked && (reason !== 'key' || idle()),
      note: 'Save your spot at a Save Jukebox. Your level, items and friends save on their own.',
      detail: () => Q.talk.ghostLog(Q.world.ep()),                     // THE GHOST LOG (engine/talk.js): this episode's
      info: () => { const s = Q.save.get(); return [['Level', s.level], ['Power', Q.save.powerAt(s.level)], ['HP', `${s.hp}/${s.maxHp}`], ['XP', `${s.xp}/${Q.save.xpToNext(s.level)}`], ['Tokens', A.Tokens.balance()]]; },
      extras: [{label: 'Charms', id: 'qPauseCharms', onClick: async () => {          // the CHARMS panel, then back to the pause menu
        inCharms = true;
        try { await Q.talk.charms(); } finally { inCharms = false; }
        if (!pause.active) return;
        if (!pause.paused) pause.pause('button');
      }}, {label: 'Band', id: 'qPauseBand', onClick: async () => {                    // THE BAND panel (who plays beside you)
        inCharms = true;
        try { await Q.talk.band(); } finally { inCharms = false; }
        if (!pause.active) return;
        if (!pause.paused) pause.pause('button');
      }}],
      levelsLabel: 'Title screen',
      onLevels: () => { unfreeze(); Q.go('title'); },
      confirmLeave: () => true,
      leaveTitle: 'Go to the title screen?',
      leaveText: 'Where you are is kept only from your last Save Jukebox. Your level, items, tokens and friends are already saved.',
      leaveYes: 'Title screen',
    });
    pause.el.classList.add('q-menubtn');
    pause.el.innerHTML = `${MENU_ICON}<span class="ui-pb-t">Menu</span>`;
    pause.el.setAttribute('aria-label', 'Menu');
    // M opens (and closes) the menu too, like Esc, P and B
    addEventListener('keydown', e => {
      if ((e.key !== 'm' && e.key !== 'M') || e.repeat || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!pause.active || Q.sceneName !== 'world') return;
      if (pause.paused) { if (pause.open() && A.UI.state().modals <= 1) { e.preventDefault(); pause.resume(); } return; }
      if (document.body.classList.contains('ui-modal') || document.body.classList.contains('avc-open') || !idle()) return;
      e.preventDefault(); pause.pause('key');
    }, true);                                              // (capture: the open menu keeps its keys from bubbling)
    return pause;
  }

  /* ---------- the episodes: each room's `ep` (data/maps), its hub, and EPISODE SELECT ---------- */
  const HUB = {1: 'foyer', 2: 'lobby'};
  const epOf = id => Q.save.episodeOf(id);
  /** the room to land in when a saved room doesn't exist (yet): that episode's hub */
  const hubFor = id => (MAPS()[HUB[epOf(id)]] ? HUB[epOf(id)] : 'foyer');
  /** back to a saved spot {map, x, y, dir} (a Save Jukebox), or the hub of its episode */
  function loadSpot(at) {
    if (at && MAPS()[at.map]) { const sp = at.x == null ? Q.save.jukeSpot(at.map) : at; if (sp) return load(sp.map, [sp.x, sp.y], sp.dir); return load(at.map); }
    load(hubFor(at && at.map));
  }
  Q.episodes = {
    /** Episode 2 opens only after Episode 1 is finished (DECISION 1: no recap, no teacher override) */
    unlocked: n => n === 1 || (n === 2 && Q.save.flag('ep1Done')),
    go(n) {
      if (!Q.episodes.unlocked(n)) return false;
      if (n === 1) { const sp = Q.save.jukeSpot('foyer'); Q.go('world', {map: 'foyer', x: sp.x, y: sp.y, dir: sp.dir}); return true; }
      // EPISODE 2: the intro the first time (ep2Start is set as it starts, so a skipped intro counts too)
      if (!Q.save.flag('ep2Start')) {
        Q.save.setFlag('ep2Start');
        Q.go('cutscene', {id: 'ep2-intro', next: {scene: 'world', args: {map: 'lobby', intro: 'ep2'}}});
        return true;
      }
      const w = Q.save.get().world, sp = w && epOf(w.map) === 2 && MAPS()[w.map] ? (w.x == null ? Q.save.jukeSpot(w.map) : w) : Q.save.jukeSpot('lobby');
      Q.go('world', {map: sp.map, x: sp.x, y: sp.y, dir: sp.dir});
      return true;
    },
  };

  /* ---------- the room ---------- */
  const doorAt = (x, y) => W.def.doors.find(d => d.at[0] === x && d.at[1] === y);
  const doorOpen = d => !d.need || Q.save.flag(d.need);
  /** a door into a room that isn't built yet (Episode 2's next rooms): it shows its `soon` sign instead */
  const doorBuilt = d => !!MAPS()[d.to];
  /** a letter's tile: the room's own `legend` first (data/maps/stage.js), then QUEST_TILES */
  const tdef = (ch, def = W.def) => (def.legend && def.legend[ch]) || TILES()[ch];
  function tileOf(x, y) {
    const row = W.def.tiles[y], ch = row ? row[x] : ' ', t = tdef(ch) || TILES()[' '];
    if (t.open) { const d = doorAt(x, y); if (d && doorOpen(d) && tdef(t.open)) return tdef(t.open); }   // a locked door or a cracked wall, opened
    return t;
  }
  const npcAt = (x, y) => W.npcs.find(n => n.x === x && n.y === y);
  const ghostAt = (x, y) => W.ghosts.find(g => g.y === y && Math.abs(g.x - x) <= ((g.size || 1) - 1) / 2);
  const thingAt = (x, y) => W.def.things.find(t => t.at[0] === x && t.at[1] === y && Q.world.cond(t.if));
  const solid = (x, y) => !!tileOf(x, y).solid;

  /** draw the room's still tiles once into their own canvas; tiles that animate are drawn every frame */
  function prerender() {
    const def = W.def, c = document.createElement('canvas');
    c.width = def.tiles[0].length * T; c.height = def.tiles.length * T;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    W.anim = [];
    def.tiles.forEach((row, ty) => [...row].forEach((ch, tx) => {
      const t = tileOf(tx, ty), d = Q.spriteDef(t.sprite);
      if (t.over) Q.draw(x, tdef(def.floor || '.', def).sprite, tx * T, ty * T, {frame: 0});   // furniture stands on the room's floor
      Q.draw(x, t.sprite, tx * T, ty * T, {frame: 0});
      if (d && d.frames && d.frames.length > 1) W.anim.push({x: tx, y: ty, sprite: t.sprite});
    }));
    W.canvas = c;
  }
  function spawnFor(def) {
    if (def.start) return def.start;
    const d = def.doors[0], last = def.tiles.length - 1;
    return d.at[1] === last ? [d.at[0], d.at[1] - 1] : [d.at[0], d.at[1] + 1];
  }
  /* ROOM MUSIC (data/music.js QUEST_ROOM_MUSIC: room → its 'quest-room-…' track). Until that file is uploaded the room
     plays what it did before (its map's `music`: quest-foyer / quest-manor), never silence. Rooms that end up on the same
     track keep it playing; a different one crossfades in about a second; a track comes back where it stopped (sounds.js
     `resume`), so after a battle the room's music carries on, fading back in. The music manager fades it out while the
     microphone listens (the Butler's lesson) and back in after. */
  const ROOM_XF = 1;
  const musicFor = id => { const def = MAPS()[id] || {}; return [(window.QUEST_ROOM_MUSIC || {})[id] || 'quest-room-' + id, def.music || 'quest-manor']; };
  function roomMusic(id) { if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(musicFor(id), {fade: ROOM_XF}); }

  /** the room's NPCs, where they stand now: `moved` once its flag is set; an npc with `if: flag` (or '!flag') is
      there only then (Rico, awake by the stage door or resting in his chair, after his battle) */
  function npcsFor(def) {
    return def.npcs.filter(n => Q.world.cond(n.if)).map(n => {
      const at2 = n.moved && Q.save.flag(n.moved.flag) ? n.moved.at : n.at;
      const D = (window.QUEST_DIALOGUE || {})[n.id] || {};
      return {id: n.id, x: at2[0], y: at2[1], px: at2[0] * T, py: at2[1] * T, sprite: n.sprite || D.sprite || 'npc-mezzo', src: n};   // (n.awake: drawn below)
    });
  }
  function load(mapId, at, dir) {
    Q.keyHints.wake();                                   // a new room: the key legend comes back
    const id = MAPS()[mapId] ? mapId : hubFor(mapId), def = MAPS()[id];
    const [x, y] = at && MAPS()[mapId] ? at : spawnFor(def);
    const save = Q.save.get();
    if (save.ep !== (def.ep || 1)) { save.ep = def.ep || 1; Q.save.write(); }      // the episode last played (v6)
    W = {map: id, def, x, y, px: x * T, py: y * T, dir: dir || 'up', move: null, busy: false, grace: 1.2, steps: 0, fade: null, flash: null,
      cycles: (W && W.cycles) || {}, cleared: {}, npcs: [], ghosts: []};
    W.npcs = npcsFor(def);
    W.ghosts = def.enemies.filter(e => def.practice || !save.done[id + ':' + e.key]).map(e => ({key: e.key, type: e.type, happy: e.happy, tier: e.tier, sprite: e.sprite,
      x: e.at[0], y: e.at[1], px: e.at[0] * T, py: e.at[1] * T, home: e.at.slice(), wander: e.wander == null ? 2 : e.wander, size: e.size || 1,
      move: null, wait: Q.rand(0.4, 1.6)}));
    prerender();
    setTimeout(() => { if (W && W.def === def) prerender(); }, 800);     // again, once any PNG art has loaded
    const wh = def.whispers || [null, null];                 // a room's own whisper timing (Backstage: more often)
    W.whisperAt = wh[0] != null ? wh[0] : Q.rand(25, 45); W.whisper = null;
    // THE GLIMPSE (the Balcony): the first visit, the giant Microphone shows in the room's peek tiles for a moment
    if (def.glimpse && !Q.save.flag(def.glimpse)) {
      Q.save.setFlag(def.glimpse);
      setTimeout(() => { if (W && W.def === def && !W.whisper) { W.whisper = {t: 0, glimpse: true}; Q.sfx('quest-mic-crackle'); } }, 900);
    }
    // the room's track, through the music manager: it starts as soon as it's loaded, the FIRST time too. Its ghosts'
    // battle music and the rooms next door are fetched now, so a battle or the next room starts with music
    if (A.Sfx && A.Sfx.setMusic) {
      roomMusic(id);
      // (a boss's music can be a list: its own track, then the one it falls back to)
      A.Sfx.preloadMusic([].concat(...def.enemies.map(e => ((window.QUEST_ENEMIES || []).find(x => x.id === e.type) || {}).music || 'quest-battle'))
        .concat(...(def.doors || []).map(d => MAPS()[d.to] ? musicFor(d.to) : [])));
    }
    Q.talk.hud(); Q.talk.banner(def.name);
  }

  /* ---------- moving ---------- */
  function heldDir() {
    const h = Q.input.held;
    return h.up ? 'up' : h.down ? 'down' : h.left ? 'left' : h.right ? 'right' : null;
  }
  function tryStep(dir) {
    W.dir = dir;
    const [dx, dy] = DIRS[dir], nx = W.x + dx, ny = W.y + dy;
    const g = ghostAt(nx, ny);
    if (g) return encounter(g);
    const d = doorAt(nx, ny);
    if (d && (!doorOpen(d) || !doorBuilt(d))) { if (!W.bumped) { W.bumped = true; Q.sfx('quest-door'); bumpSign(d); } return; }
    if (solid(nx, ny) || npcAt(nx, ny)) return;
    W.move = {fx: W.x, fy: W.y, t: 0};
    W.x = nx; W.y = ny;
    if (++W.steps % 2) Q.sfx('quest-step');
  }
  /** a locked door says why; a door to a room still being built says its `soon` sign */
  const bumpSign = d => Q.talk.sign(!doorOpen(d) ? d.locked || 'locked' : d.soon || 'soon');
  function arrive() {
    W.move = null; W.bumped = false;
    const d = doorAt(W.x, W.y);
    if (d && doorOpen(d) && doorBuilt(d)) goThrough(d);
  }
  function goThrough(d) {
    W.busy = true; Q.sfx('quest-door');
    const done = () => { load(d.to, d.spawn, d.dir); W.fade = {t: 0, dir: 1}; };
    if (Q.reduced()) done();
    else { W.fade = {t: 0, dir: -1, then: done}; }
  }

  /* ---------- ghosts ---------- */
  function ghostThink(g, dt) {
    if (g.move) {
      g.move.t += dt / GHOST_STEP;
      if (g.move.t >= 1) g.move = null;
      return;
    }
    if (!g.wander) return;
    g.wait -= dt;
    if (g.wait > 0) return;
    g.wait = Q.rand(0.8, 1.8);
    let dirs = Object.keys(DIRS);
    const near = Math.abs(g.x - W.x) + Math.abs(g.y - W.y) <= 3;
    if (near && W.grace <= 0 && Math.random() < 0.55) {                       // curious: drifts toward you
      dirs = dirs.filter(k => { const [dx, dy] = DIRS[k]; return Math.abs(g.x + dx - W.x) + Math.abs(g.y + dy - W.y) < Math.abs(g.x - W.x) + Math.abs(g.y - W.y); });
    }
    const k = Q.pick(dirs), [dx, dy] = DIRS[k], nx = g.x + dx, ny = g.y + dy;
    if (Math.abs(nx - g.home[0]) > g.wander || Math.abs(ny - g.home[1]) > g.wander) return;
    if (nx === W.x && ny === W.y) { if (W.grace <= 0 && !W.move) encounter(g); return; }
    const ch = W.def.tiles[ny] && W.def.tiles[ny][nx];
    if (solid(nx, ny) || npcAt(nx, ny) || ghostAt(nx, ny) || (tdef(ch) || {}).door || (W.move && nx === W.x && ny === W.y)) return;
    g.move = {fx: g.x, fy: g.y, t: 0};
    g.x = nx; g.y = ny;
  }
  async function encounter(g) {
    if (W.busy) return;
    W.busy = true; W.fighting = g.key;
    const E = (window.QUEST_ENEMIES || []).find(e => e.id === g.type);
    if (E && E.talk) { await Q.talk.npc(E.talk); if (!W || W.fighting !== g.key) return; }   // the final boss's speech first
    Q.sfx('quest-encounter');
    W.flash = {t: 0};
    setTimeout(() => {
      if (!W || W.fighting !== g.key) return;
      // the room's own touches: its happy note, its rhythm tier (data/maps/stage.js: deeper rooms read harder rhythms)
      const o = Object.assign({}, g.happy != null ? {happy: g.happy} : {}, g.tier ? {tier: g.tier} : {});
      Q.go('battle', {enemy: g.type, overrides: Object.keys(o).length ? o : null, back: {scene: 'world', args: {resume: true}}});
    }, Q.reduced() ? 350 : 700);
  }
  function afterBattle(result) {
    const g = W.ghosts.find(x => x.key === W.fighting);
    W.fighting = null; W.flash = null; W.busy = false; W.grace = 2;
    if (!result || !g) return;
    if (result.kind === 'rest') {                                             // out of breath: back to the last jukebox
      const at = Q.save.get().world, ep = W.def.ep || 1;
      if (at && epOf(at.map) === ep) loadSpot(at); else load(HUB[ep]);       // (that episode's jukebox, else its hub)
      return;
    }
    W.ghosts = W.ghosts.filter(x => x !== g);
    const E = (window.QUEST_ENEMIES || []).find(e => e.id === result.enemy) || {}, s = Q.save.get();
    let whisperer = false, showstopper = false;
    const firstEp2 = !(s.flags || {}).ep2Done;                                  // (THE BIG NUMBER's doneFlag sets it just below)
    // THE BAND WAKES (Episode 2: data/maps/stage.js `wakes`): this was the room's last machine, helped either way
    // (checked before anything reads the save again: its repair, save.js routes(), would set the flag quietly)
    const wk = W.def.wakes, woke = !!wk && !W.def.practice && !(s.flags || {})[wk.flag] && W.def.enemies.every(e => e.key === g.key || s.done[W.map + ':' + e.key]);
    if (!W.def.practice) {
      s.done[W.map + ':' + g.key] = result.kind;
      if (E.opens || E.final) s.route = Object.assign({}, s.route, {[E.id]: result.kind});   // the route taken (achievements)
      if (E.doneFlag) s.flags[E.doneFlag] = true;                                // Rico: ricoDone, either way
      Q.save.write();
      // GHOST WHISPERER: the last manor ghost helped (befriended or faded) -> 'manor-all' (save.js achievements);
      // its Episode 2 twin, SHOWSTOPPER: the last Showtime machine -> 'stage-all'
      const had = Q.save.has('manor-all'), hadStage = Q.save.has('stage-all'), now = Q.save.achievements();
      whisperer = !had && !!now['manor-all'];
      showstopper = !hadStage && !!now['stage-all'];
    }
    if (E.opens || E.opensIfFaded) { prerender(); W.npcs = npcsFor(W.def); }       // a door or a cracked wall opened (Rico stands up)
    const after = [];                                                             // what to show, in order, once back
    if (woke) { Q.save.setFlag(wk.flag); after.push(() => wake(wk)); }
    // THE ALTERNATE ROUTE: the first gate ghost a student defeats (not befriends) says something moved
    if (!W.def.practice && result.kind === 'fade' && E.opensIfFaded && (W.def.ep || 1) === 1 && !Q.save.flag('shiftHint')) {
      Q.save.setFlag('shiftHint');
      after.push(() => { Q.sfx('quest-door'); Q.shake(2, 500); return Q.say([Q.text('shiftHint')]); });
    }
    // the UNLOCKED! card (the Spirit Lantern, the Ghost Whisperer plate) after the battle's results; when the Ghost
    // Conductor was the last one, EPISODE 1 COMPLETE shows it instead (engine/story.js)
    if (whisperer && !E.final) after.push(() => ghostWhisperer('ghostWhisperer'));
    if (showstopper && !E.final) after.push(() => ghostWhisperer('showstopper'));       // (THE BIG NUMBER isn't one of the 20)
    // Episode 2's mini-boss: what opened, in words (data/enemies.js afterLines)
    const al = !W.def.practice && E.afterLines && E.afterLines[result.kind];
    if (al) after.push(() => { Q.sfx('quest-door'); return Q.say(al); });
    if (after.length) {
      W.busy = true;
      after.reduce((p, f) => p.then(() => (W ? f() : null)), Promise.resolve()).then(() => { if (W) W.busy = false; });
    }
    if (E.final && !W.def.practice && (W.def.ep || 1) === 2) {                  // THE END of Episode 2 (engine/story.js)
      const first = firstEp2;
      Q.save.setFlag('ep2Done'); Q.save.achievements();                          // (doneFlag set it already: ep2Done)
      W.busy = true;
      // befriended: the best ending (the band plays the Encore with you); played on: the band powers down to rest.
      // Both: the Microphone speaks, the cliffhanger, the credits, EPISODE 2 COMPLETE
      Q.go('cutscene', {id: result.kind === 'befriend' ? 'ep2-ending' : 'ep2-ending-fade',
        next: {id: 'ep2-mic', next: {id: 'ep2-cliffhanger', next: {credits: true, ep: 2, first, showstopper: Q.save.has('stage-all')}}}});
    } else if (E.final && !W.def.practice) {                                     // THE END of Episode 1 (engine/story.js)
      const first = !Q.save.flag('ep1Done');
      Q.save.setFlag('ep1Done'); Q.save.achievements();
      W.busy = true;
      // befriended: the full ending (the best one); defeated: the shorter, still happy one. Both finish Episode 1
      Q.go('cutscene', {id: result.kind === 'befriend' ? 'ending' : 'ending-fade', next: {id: 'cliffhanger', next: {credits: true, first, whisperer}}});
    }
  }

  /** a band member wakes up (Tubby Tusk, Snapjaw Sal): their `wake` lines (data/dialogue-stage.js) with the awake
      portrait, then they step aside (`moved`) and the door they guarded opens (prerender) */
  async function wake(wk) {
    const n = W.npcs.find(x => x.id === wk.npc), D = (window.QUEST_DIALOGUE || {})[wk.npc] || {};
    Q.sfx('quest-encore-learned');
    await Q.talk.say(wk.npc, D.wake || []);
    if (!W) return;
    if (n && n.src.moved) Q.world.moveNpc(wk.npc, n.src.moved.at);
    if (D.metFlag) Q.save.setFlag(D.metFlag);
    prerender();
  }

  /** GHOST WHISPERER (and Episode 2's SHOWSTOPPER: line 'showstopper'): the arcade's UNLOCKED! card (shared/skins.js
      catchUp) over the room, with its line on top;
      resolves when it closes (a tick later, so the key that closed it doesn't also reach the overworld) */
  function ghostWhisperer(line = 'ghostWhisperer') {
    return new Promise(done => {
      const fin = () => setTimeout(done, 0);
      if (!A.Skins || !A.Skins.catchUp) return fin();
      Q.input.clear();
      const shown = A.Skins.catchUp(A.store.player, {lead: Q.text(line), theme: 'q-theme', onClose: fin,
        foot: 'Find them in the <b>LOCKER</b>, or wear one now.'});
      if (!shown.length) return fin();
      // the focus on the card itself, not WEAR IT: an A still pressed from the battle's last line must not choose for you
      const pan = document.querySelector('.sk-catchup.q-theme>.panel');
      if (pan) { pan.tabIndex = -1; pan.focus({preventScroll: true}); }
    });
  }

  /* ---------- the microphone's whispers: now and then, while exploring (never in a safe room: the Foyer, the Lobby;
     never in a practice room: the Practice Hall, the Green Room), the static crackles, a microphone shows in the
     windows (Episode 1) or between the curtains (Episode 2: tiles with `peek`) and a whisper floats by
     (QUEST_WHISPERS, Episode 2's own QUEST_WHISPERS_EP2) ---------- */
  function whisperTick(dt) {
    if (W.whisper) { W.whisper.t += dt; if (W.whisper.t > 4.5) { W.whisper = null; const el = Q.$('qWhisper'); if (el) el.classList.remove('on'); } return; }
    if (W.busy || W.def.practice || W.def.safe || W.map === 'foyer') return;
    W.whisperAt -= dt;
    if (W.whisperAt > 0) return;
    const every = (W.def.whispers || [])[1] || [55, 95];
    W.whisperAt = Q.rand(every[0], every[1]);
    W.whisper = {t: 0};
    Q.sfx('quest-mic-crackle');
    let el = Q.$('qWhisper');
    if (!el) { el = Q.el('p', 'q-whisper'); el.id = 'qWhisper'; el.setAttribute('aria-live', 'polite'); Q.ui.appendChild(el); }
    // (a room can add its own: the Fly Loft's `whisperLines`)
    el.textContent = Q.pick(((W.def.ep === 2 && window.QUEST_WHISPERS_EP2) || window.QUEST_WHISPERS || ['...so much noise...']).concat(W.def.whisperLines || []));
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  /* ---------- A and B ---------- */
  const facing = () => { const [dx, dy] = DIRS[W.dir]; return [W.x + dx, W.y + dy]; };
  async function interact() {
    const [fx, fy] = facing();
    const n = npcAt(fx, fy), th = thingAt(fx, fy), d = doorAt(fx, fy), g = ghostAt(fx, fy);
    // a story boss with a speech (THE BIG NUMBER: Maestro Moose at his podium): A talks to him, like walking into him
    if (g && !n && ((window.QUEST_ENEMIES || []).find(e => e.id === g.type) || {}).talk) return encounter(g);
    if (!n && !th && !(d && (!doorOpen(d) || !doorBuilt(d)))) return;
    W.busy = true;
    try {
      if (n) { if (n.x !== W.x) n.face = n.x > W.x ? 'left' : 'right'; await Q.talk.npc(n.id, n); }
      else if (th) await Q.talk.thing(th);
      else await Q.talk.sign(!doorOpen(d) ? d.locked || 'locked' : d.soon || 'soon');
    } finally { if (W) { W.busy = false; Q.talk.hud(); } }
  }

  Q.world = {
    /** a map entry's `if` (npcs, things, props): 'flag', '!flag', 'a&b' (all) or 'route:<enemy id>=befriend|fade' (how
        that story enemy was passed: the save's route). No condition = always */
    cond(c) {
      if (!c) return true;
      if (c.includes('&')) return c.split('&').every(x => Q.world.cond(x.trim()));
      if (c[0] === '!') return !Q.world.cond(c.slice(1));
      const r = /^route:([\w-]+)=(\w+)$/.exec(c);
      if (r) return (Q.save.get().route || {})[r[1]] === r[2];
      return Q.save.flag(c);
    },
    // busy includes a door's fade (out, then in): input is ignored until it ends, so tests must wait for it too
    state: () => W && {map: W.map, x: W.x, y: W.y, dir: W.dir, busy: W.busy || !!W.fade, moving: !!W.move, paused: !!Q.paused, ghosts: W.ghosts.map(g => ({key: g.key, type: g.type, x: g.x, y: g.y})),
      whisper: W.whisper ? (W.whisper.glimpse ? 'glimpse' : 'whisper') : null,
      npcs: W.npcs.map(n => ({id: n.id, x: n.x, y: n.y}))},
    /** move an NPC somewhere (Sir Reginald stepping aside) */
    moveNpc(id, at) { W.npcs.filter(n => n.id === id).forEach(n => { n.x = at[0]; n.y = at[1]; n.px = at[0] * T; n.py = at[1] * T; }); },
    here: () => W && {map: W.map, x: W.x, y: W.y, dir: W.dir},
    /** the room's map entry for an NPC standing here (its `awake`, `moved`), or null */
    npcSrc: id => { const n = W && W.npcs.find(x => x.id === id); return n ? n.src : null; },
    /** the episode of the room you're in (1 outside the overworld) */
    ep: () => (W && W.def.ep) || 1,
    /** tests: a whisper right now */
    whisperNow() { if (W) { W.whisper = null; W.whisperAt = 0; } },
    /** tests: stand on a tile (demo only) */
    /** ?demo (tests): start the battle with the ghost `key` in this room, as if you walked into it */
    fight(key) { if (!A.DEMO || !W || W.busy) return false; const g = W.ghosts.find(x => x.key === key); if (!g) return false; encounter(g); return true; },
    warp(x, y, dir) { if (!A.DEMO || !W) return; W.x = x; W.y = y; W.px = x * T; W.py = y * T; W.move = null; W.bumped = false; if (dir) W.dir = dir; },
  };

  Q.scenes.world = {
    enter(args = {}) {
      Q.listen(false);
      Q.talk.mount();
      if (kitPause()) { pause.setActive(true); document.documentElement.classList.add('ui-in-level'); }
      Q.keyHints.wake();
      if (args.resume && W) {
        roomMusic(W.map);                                // the room's music again, from where it stopped
        Q.talk.hud();
        afterBattle(args.result);
      } else if (args.continue) { const at = Q.save.get().world; if (at) loadSpot(at); else load(HUB[Q.save.get().ep || 1]); }
      else load(args.map || 'foyer', args.x != null ? [args.x, args.y] : null, args.dir);
      offKeys = Q.input.on(btn => {
        if (!W || W.busy || W.fade) return false;
        if (btn === 'a' && !W.move) { interact(); return true; }
        if (/^(up|down|left|right)$/.test(btn)) { W.tap = btn; return false; }        // a quick tap still takes one step
        if (btn === 'b') { if (pause) pause.pause('button'); return true; }
        return false;
      });
      // the opening story (NEW GAME), then, the first time the game is played on a keyboard, the keys in one line
      if (args.intro || Q.keyHints.firstTip()) { W.busy = true; (args.intro ? Q.talk.intro(args.intro) : Promise.resolve()).then(() => Q.keyHints.tip()).then(() => { if (W) W.busy = false; }); }
    },
    exit() { if (offKeys) offKeys(); offKeys = null; Q.keyHints.show(false); if (pause) pause.setActive(false); unfreeze(); Q.input.clear(); },
    update(dt) {
      if (!W) return;
      const free = idle() && !Q.paused && !Q.input.blocked;
      if (pause && pause.active && pause.el.hidden === free) { pause.el.hidden = !free; }
      Q.keyHints.show(free);
      if (W.grace > 0) W.grace -= dt;
      if (!Q.paused) Q.save.tick(dt);                    // the time played (EPISODE 2 COMPLETE)
      if (W.fade) {
        W.fade.t += dt / 0.22;
        if (W.fade.t >= 1) { const f = W.fade; W.fade = null; if (f.then) f.then(); else if (!W.fighting) W.busy = false; }   // (a ghost met during the fade-in: its battle is starting)
      }
      if (W.flash) W.flash.t += dt;
      if (W.move) { W.move.t += dt / STEP; if (W.move.t >= 1) arrive(); }
      if (!W.busy && !W.move && !W.fade) { const d = heldDir() || W.tap; if (d) tryStep(d); }
      W.tap = null;
      if (!W.busy) W.ghosts.forEach(g => ghostThink(g, dt));
      whisperTick(dt);
      W.px = W.move ? (W.move.fx + (W.x - W.move.fx) * Math.min(1, W.move.t)) * T : W.x * T;
      W.py = W.move ? (W.move.fy + (W.y - W.move.fy) * Math.min(1, W.move.t)) * T : W.y * T;
      W.ghosts.forEach(g => {
        g.px = g.move ? (g.move.fx + (g.x - g.move.fx) * Math.min(1, g.move.t)) * T : g.x * T;
        g.py = g.move ? (g.move.fy + (g.y - g.move.fy) * Math.min(1, g.move.t)) * T : g.y * T;
      });
    },
    draw(ctx, now) {
      if (!W) return;
      const mw = W.canvas.width, mh = W.canvas.height;
      let cx = W.px + 8 - Q.W / 2, cy = W.py + 8 - Q.H / 2 + 10;
      cx = mw <= Q.W ? (mw - Q.W) / 2 : Q.clamp(cx, 0, mw - Q.W);
      cy = mh <= Q.H - 20 ? (mh - Q.H) / 2 - 8 : Q.clamp(cy, -20, mh - Q.H);
      cx = Math.round(cx); cy = Math.round(cy);
      ctx.drawImage(W.canvas, -cx, -cy);
      W.anim.forEach(a => Q.draw(ctx, a.sprite, a.x * T - cx, a.y * T - cy, {t: now}));
      // a charm still hidden here (a map thing with `charm`): a small twinkle (steady under reduced motion)
      W.def.things.forEach(th => {
        if (!th.charm || !Q.charms || Q.charms.owned(th.charm)) return;
        const on = Q.reduced() || Math.floor(now / 400) % 3 !== 0, x = th.at[0] * T + 11 - cx, y = th.at[1] * T + 3 - cy;
        if (!on) return;
        ctx.fillStyle = Q.css('q-white'); ctx.fillRect(x, y - 2, 1, 5); ctx.fillRect(x - 2, y, 5, 1);
        ctx.fillStyle = Q.css('yellow'); ctx.fillRect(x, y, 1, 1);
      });
      // everyone, back to front
      const bob = Q.reduced() ? 0 : Math.round(Math.sin(now / 300));
      const list = [];
      W.npcs.forEach(n => list.push({y: n.py, fn: () => {
        const spr = n.src.awake && Q.save.flag(n.src.awake.flag) ? n.src.awake.sprite : n.sprite;   // woken up: un-glitched (Hoot)
        // `rest` (powered down to rest: the Big Number's shorter ending): dimmed, still, with a little "z" like Sir Reginald's
        Q.draw(ctx, spr, n.px + 8 - 12 - cx, n.py + T - 28 + 2 - cy, {t: now, flip: n.face === 'left', alpha: n.src.rest ? .55 : undefined, frame: n.src.rest ? 0 : undefined});
        if ((n.id === 'reginald' && !Q.save.flag('reginaldAwake')) || n.src.rest) {
          ctx.fillStyle = Q.css('q-white'); ctx.font = '8px "GN Quest", monospace';
          const z = Q.reduced() ? 0 : (now / 600) % 1;
          ctx.globalAlpha = 1 - z; ctx.fillText('z', n.px + 16 - cx + z * 6, n.py - 14 - cy - z * 8); ctx.globalAlpha = 1;
        }
      }}));
      (W.def.props || []).forEach(p => {                    // pictures standing on the floor (the attic's stage speaker)
        if (!Q.world.cond(p.if)) return;
        const d = Q.spriteDef(p.sprite) || {w: 16, h: 16};
        const fn = () => Q.draw(ctx, p.sprite, p.at[0] * T + (d.w < T ? Math.floor((T - d.w) / 2) : 0) - cx, (p.at[1] + 1) * T - d.h - (p.under ? 1 : 0) - cy, {t: now, frame: p.frame});   // (a small one: centred on its tile)
        if (p.under) fn(); else list.push({y: p.at[1] * T, fn});           // `under`: on the floor, under everyone (the stage's spots)
      });
      W.ghosts.forEach(g => list.push({y: g.py, fn: () => {
        const id = g.sprite || g.type, d = Q.spriteDef(id) || {w: 32, h: 32};      // (a map enemy's own `sprite`: the Big Number = Moose)
        Q.draw(ctx, id, Math.round(g.px + 8 - d.w / 2 - cx), Math.round(g.py + T - d.h + 2 - cy + (g.sprite ? 0 : bob)), {t: now});
      }}));
      list.push({y: W.py + 0.5, fn: () => {
        // the character (32 × 32, feet on the tile): side view walking left/right, front walking down, back walking up
        const base = 'player-' + A.currentMember().id, walk = W.move ? '-walk' : '';
        const id = W.dir === 'up' ? base + '-back' + walk : W.dir === 'down' ? base + '-front' + walk : base + walk;
        Q.draw(ctx, id, Math.round(W.px + 8 - 16 - cx), Math.round(W.py + T - 31 - cy), {t: now, flip: W.dir === 'left'});
      }});
      list.sort((a, b) => a.y - b.y).forEach(o => o.fn());
      // the "talk" bubble over whoever you face
      if (!W.busy && !W.move) {
        const [fx, fy] = facing(), n = npcAt(fx, fy), th = thingAt(fx, fy);
        if (n || th) Q.draw(ctx, 'talk', fx * T + 4 - cx, (n ? fy * T - 24 : fy * T - 8) - cy - (Q.reduced() ? 0 : Math.round(Math.abs(Math.sin(now / 250)) * 2)));
      }
      // a whisper: faint static bands, and the microphone's silhouette in every window for a moment
      if (W.whisper) {
        const a = Math.min(1, W.whisper.t / .5, (4.5 - W.whisper.t) / .8);
        W.def.tiles.forEach((row, ty) => [...row].forEach((ch, tx) => { if ((tdef(ch) || {}).peek) { ctx.globalAlpha = a; Q.draw(ctx, 'mic-shadow', tx * T + 5 - cx, ty * T + 2 - cy); } }));
        ctx.globalAlpha = a * .12; ctx.fillStyle = Q.css('q-grey');
        for (let i = 0; i < 6; i++) ctx.fillRect(0, (Q.reduced() ? i * 31 : (i * 31 + Math.floor(now / 90) * 7) % Q.H), Q.W, 1);
        ctx.globalAlpha = 1;
      }
      // drifting fog over the whole room (static with reduced motion)
      if (W.def.fog) {
        ctx.fillStyle = Q.css('q-fog');
        for (let i = 0; i < 4; i++) {
          const t = Q.reduced() ? 0 : now / 9000;
          const fxp = ((i * 97 + t * (40 + i * 12)) % (Q.W + 160)) - 80, fyp = 30 + i * 38;
          ctx.globalAlpha = 0.07; ctx.beginPath(); ctx.ellipse(fxp, fyp, 70, 12, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // door fade and the battle flash
      if (W.fade) { ctx.fillStyle = Q.css('q-black'); ctx.globalAlpha = W.fade.dir < 0 ? Math.min(1, W.fade.t) : 1 - Math.min(1, W.fade.t); ctx.fillRect(0, 0, Q.W, Q.H); ctx.globalAlpha = 1; }
      if (W.flash) {
        if (Q.reduced()) { ctx.fillStyle = Q.css('q-black'); ctx.globalAlpha = Math.min(1, W.flash.t * 2); }
        else { ctx.fillStyle = Q.css(Math.floor(W.flash.t * 8) % 2 ? 'q-white' : 'q-purple'); ctx.globalAlpha = 0.5; }
        ctx.fillRect(0, 0, Q.W, Q.H); ctx.globalAlpha = 1;
      }
    },
  };
})(window.Arcade);
