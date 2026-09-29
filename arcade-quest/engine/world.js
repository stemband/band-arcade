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
   Q.go('world', {continue: true})     back to the last Save Jukebox (or the Foyer)
   Q.go('world', {resume: true, result})  back from a battle (battle.js does this)
   Q.world.state()                     for tests: {map, x, y, dir, ghosts, busy, paused}
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
  function kitPause() {
    if (pause || !A.UI || !A.UI.pause) return pause;
    pause = A.UI.pause.mount({
      theme: 'q-theme',
      onPause: freeze,
      onResume: () => {
        if (!inCharms) unfreeze();                                     // (the tab hidden over CHARMS: that panel is still open)
        // the kit gives the PAUSE button the focus back; here A (Enter/Space) must talk, not press it again
        setTimeout(() => { if (pause && document.activeElement === pause.el) pause.el.blur(); }, 0);
      },
      // never mid-battle-flash or while the microphone listens (the Butler's lesson); Esc/P only when you're free to walk
      canPause: reason => Q.sceneName === 'world' && !!W && !W.fighting && !Q.input.blocked && (reason !== 'key' || idle()),
      note: 'Save your spot at a Save Jukebox. Your level, items and friends save on their own.',
      info: () => { const s = Q.save.get(); return [['Level', s.level], ['Power', Q.save.powerAt(s.level)], ['HP', `${s.hp}/${s.maxHp}`], ['XP', `${s.xp}/${Q.save.xpToNext(s.level)}`], ['Tokens', s.tokens]]; },
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
      leaveText: 'Where you are in the manor is kept only from your last Save Jukebox. Your level, items, tokens and friends are already saved.',
      leaveYes: 'Title screen',
    });
    return pause;
  }

  /* ---------- the room ---------- */
  const doorAt = (x, y) => W.def.doors.find(d => d.at[0] === x && d.at[1] === y);
  const doorOpen = d => !d.need || Q.save.flag(d.need);
  function tileOf(x, y) {
    const row = W.def.tiles[y], ch = row ? row[x] : ' ';
    if (ch === 'L') { const d = doorAt(x, y); if (d && doorOpen(d)) return TILES().D; }
    if (ch === 'K') { const d = doorAt(x, y); if (d && doorOpen(d)) return TILES().O; }       // a cracked wall, opened
    return TILES()[ch] || TILES()[' '];
  }
  const npcAt = (x, y) => W.npcs.find(n => n.x === x && n.y === y);
  const ghostAt = (x, y) => W.ghosts.find(g => g.y === y && Math.abs(g.x - x) <= ((g.size || 1) - 1) / 2);
  const thingAt = (x, y) => W.def.things.find(t => t.at[0] === x && t.at[1] === y);
  const solid = (x, y) => !!tileOf(x, y).solid;

  /** draw the room's still tiles once into their own canvas; tiles that animate are drawn every frame */
  function prerender() {
    const def = W.def, c = document.createElement('canvas');
    c.width = def.tiles[0].length * T; c.height = def.tiles.length * T;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    W.anim = [];
    def.tiles.forEach((row, ty) => [...row].forEach((ch, tx) => {
      const t = tileOf(tx, ty), d = Q.spriteDef(t.sprite);
      if (t.over) Q.draw(x, TILES()[def.floor || '.'].sprite, tx * T, ty * T, {frame: 0});   // furniture stands on the room's floor
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

  function load(mapId, at, dir) {
    const def = MAPS()[mapId] || MAPS().foyer, id = MAPS()[mapId] ? mapId : 'foyer';
    const [x, y] = at || spawnFor(def);
    const save = Q.save.get();
    W = {map: id, def, x, y, px: x * T, py: y * T, dir: dir || 'up', move: null, busy: false, grace: 1.2, steps: 0, fade: null, flash: null,
      cycles: (W && W.cycles) || {}, cleared: {}, npcs: [], ghosts: []};
    W.npcs = def.npcs.map(n => {
      const at2 = n.moved && Q.save.flag(n.moved.flag) ? n.moved.at : n.at;
      const D = (window.QUEST_DIALOGUE || {})[n.id] || {};
      return {id: n.id, x: at2[0], y: at2[1], px: at2[0] * T, py: at2[1] * T, sprite: n.sprite || D.sprite || 'npc-mezzo', src: n};
    });
    W.ghosts = def.enemies.filter(e => def.practice || !save.done[id + ':' + e.key]).map(e => ({key: e.key, type: e.type, happy: e.happy,
      x: e.at[0], y: e.at[1], px: e.at[0] * T, py: e.at[1] * T, home: e.at.slice(), wander: e.wander == null ? 2 : e.wander, size: e.size || 1,
      move: null, wait: Q.rand(0.4, 1.6)}));
    prerender();
    setTimeout(() => { if (W && W.def === def) prerender(); }, 800);     // again, once any PNG art has loaded
    W.whisperAt = Q.rand(25, 45); W.whisper = null;
    // the room's track, through the music manager: it starts as soon as it's loaded, the FIRST time too. Its ghosts'
    // battle music and the rooms next door are fetched now, so a battle or the next room starts with music
    if (A.Sfx && A.Sfx.setMusic) {
      roomMusic(id);
      A.Sfx.preloadMusic(def.enemies.map(e => ((window.QUEST_ENEMIES || []).find(x => x.id === e.type) || {}).music || 'quest-battle')
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
    if (d && !doorOpen(d)) { if (!W.bumped) { W.bumped = true; Q.sfx('quest-door'); Q.talk.sign(d.locked || 'locked'); } return; }
    if (solid(nx, ny) || npcAt(nx, ny)) return;
    W.move = {fx: W.x, fy: W.y, t: 0};
    W.x = nx; W.y = ny;
    if (++W.steps % 2) Q.sfx('quest-step');
  }
  function arrive() {
    W.move = null; W.bumped = false;
    const d = doorAt(W.x, W.y);
    if (d && doorOpen(d)) goThrough(d);
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
    if (solid(nx, ny) || npcAt(nx, ny) || ghostAt(nx, ny) || 'DML'.includes(ch) || (W.move && nx === W.x && ny === W.y)) return;
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
      Q.go('battle', {enemy: g.type, overrides: g.happy != null ? {happy: g.happy} : null, back: {scene: 'world', args: {resume: true}}});
    }, Q.reduced() ? 350 : 700);
  }
  function afterBattle(result) {
    const g = W.ghosts.find(x => x.key === W.fighting);
    W.fighting = null; W.flash = null; W.busy = false; W.grace = 2;
    if (!result || !g) return;
    if (result.kind === 'rest') {                                             // out of breath: back to the last jukebox
      const at = Q.save.get().world;
      if (at && MAPS()[at.map]) load(at.map, [at.x, at.y], at.dir); else load('foyer');
      return;
    }
    W.ghosts = W.ghosts.filter(x => x !== g);
    const E = (window.QUEST_ENEMIES || []).find(e => e.id === result.enemy) || {}, s = Q.save.get();
    if (!W.def.practice) {
      s.done[W.map + ':' + g.key] = result.kind;
      if (E.opens || E.final) s.route = Object.assign({}, s.route, {[E.id]: result.kind});   // the route taken (achievements)
      Q.save.write();
    }
    if (E.opens || E.opensIfFaded) prerender();                                   // a door or a cracked wall opened
    // THE ALTERNATE ROUTE: the first gate ghost a student defeats (not befriends) says something moved
    if (!W.def.practice && result.kind === 'fade' && E.opensIfFaded && !Q.save.flag('shiftHint')) {
      Q.save.setFlag('shiftHint'); W.busy = true;
      Q.sfx('quest-door'); Q.shake(2, 500);
      Q.say([Q.text('shiftHint')]).then(() => { if (W) W.busy = false; });
    }
    if (E.final && !W.def.practice) {                                            // THE END of Episode 1 (engine/story.js)
      const first = !Q.save.flag('ep1Done');
      Q.save.setFlag('ep1Done'); Q.save.achievements();
      W.busy = true;
      // befriended: the full ending (the best one); defeated: the shorter, still happy one. Both finish Episode 1
      Q.go('cutscene', {id: result.kind === 'befriend' ? 'ending' : 'ending-fade', next: {id: 'cliffhanger', next: {credits: true, first}}});
    }
  }

  /* ---------- the microphone's whispers (Episode 1's hints): now and then, while exploring (not in the Foyer or the
     Practice Hall), the static crackles, a microphone shows in the windows and a whisper floats by ---------- */
  function whisperTick(dt) {
    if (W.whisper) { W.whisper.t += dt; if (W.whisper.t > 4.5) { W.whisper = null; const el = Q.$('qWhisper'); if (el) el.classList.remove('on'); } return; }
    if (W.busy || W.def.practice || W.def.safe || W.map === 'foyer') return;
    W.whisperAt -= dt;
    if (W.whisperAt > 0) return;
    W.whisperAt = Q.rand(55, 95);
    W.whisper = {t: 0};
    Q.sfx('quest-mic-crackle');
    let el = Q.$('qWhisper');
    if (!el) { el = Q.el('p', 'q-whisper'); el.id = 'qWhisper'; el.setAttribute('aria-live', 'polite'); Q.ui.appendChild(el); }
    el.textContent = Q.pick(window.QUEST_WHISPERS || ['...so much noise...']);
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  /* ---------- A and B ---------- */
  const facing = () => { const [dx, dy] = DIRS[W.dir]; return [W.x + dx, W.y + dy]; };
  async function interact() {
    const [fx, fy] = facing();
    const n = npcAt(fx, fy), th = thingAt(fx, fy), d = doorAt(fx, fy);
    if (!n && !th && !(d && !doorOpen(d))) return;
    W.busy = true;
    try {
      if (n) { if (n.x !== W.x) n.face = n.x > W.x ? 'left' : 'right'; await Q.talk.npc(n.id, n); }
      else if (th) await Q.talk.thing(th);
      else await Q.talk.sign(d.locked || 'locked');
    } finally { if (W) { W.busy = false; Q.talk.hud(); } }
  }

  Q.world = {
    state: () => W && {map: W.map, x: W.x, y: W.y, dir: W.dir, busy: W.busy, paused: !!Q.paused, ghosts: W.ghosts.map(g => ({key: g.key, type: g.type, x: g.x, y: g.y})),
      npcs: W.npcs.map(n => ({id: n.id, x: n.x, y: n.y}))},
    /** move an NPC somewhere (Sir Reginald stepping aside) */
    moveNpc(id, at) { W.npcs.filter(n => n.id === id).forEach(n => { n.x = at[0]; n.y = at[1]; n.px = at[0] * T; n.py = at[1] * T; }); },
    here: () => W && {map: W.map, x: W.x, y: W.y, dir: W.dir},
    /** tests: a whisper right now */
    whisperNow() { if (W) { W.whisper = null; W.whisperAt = 0; } },
    /** tests: stand on a tile (demo only) */
    /** ?demo (tests): start the battle with the ghost `key` in this room, as if you walked into it */
    fight(key) { if (!A.DEMO || !W || W.busy) return false; const g = W.ghosts.find(x => x.key === key); if (!g) return false; encounter(g); return true; },
    warp(x, y, dir) { if (!A.DEMO || !W) return; W.x = x; W.y = y; W.px = x * T; W.py = y * T; W.move = null; if (dir) W.dir = dir; },
  };

  Q.scenes.world = {
    enter(args = {}) {
      Q.listen(false);
      Q.talk.mount();
      if (kitPause()) pause.setActive(true);
      if (args.resume && W) {
        roomMusic(W.map);                                // the room's music again, from where it stopped
        Q.talk.hud();
        afterBattle(args.result);
      } else if (args.continue) {
        const at = Q.save.get().world;
        if (at && MAPS()[at.map]) load(at.map, [at.x, at.y], at.dir); else load('foyer');
      } else load(args.map || 'foyer', args.x != null ? [args.x, args.y] : null, args.dir);
      offKeys = Q.input.on(btn => {
        if (!W || W.busy || W.fade) return false;
        if (btn === 'a' && !W.move) { interact(); return true; }
        if (/^(up|down|left|right)$/.test(btn)) { W.tap = btn; return false; }        // a quick tap still takes one step
        if (btn === 'b') { if (pause) pause.pause('button'); return true; }
        return false;
      });
      if (args.intro) { W.busy = true; Q.talk.intro().then(() => { if (W) W.busy = false; }); }
    },
    exit() { if (offKeys) offKeys(); offKeys = null; if (pause) pause.setActive(false); unfreeze(); Q.input.clear(); },
    update(dt) {
      if (!W) return;
      if (W.grace > 0) W.grace -= dt;
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
        Q.draw(ctx, n.sprite, n.px + 8 - 12 - cx, n.py + T - 28 + 2 - cy, {t: now, flip: n.face === 'left'});
        if (n.id === 'reginald' && !Q.save.flag('reginaldAwake')) {
          ctx.fillStyle = Q.css('q-white'); ctx.font = '8px "GN Quest", monospace';
          const z = Q.reduced() ? 0 : (now / 600) % 1;
          ctx.globalAlpha = 1 - z; ctx.fillText('z', n.px + 16 - cx + z * 6, n.py - 14 - cy - z * 8); ctx.globalAlpha = 1;
        }
      }}));
      W.ghosts.forEach(g => list.push({y: g.py, fn: () => {
        const d = Q.spriteDef(g.type) || {w: 32, h: 32};
        Q.draw(ctx, g.type, Math.round(g.px + 8 - d.w / 2 - cx), Math.round(g.py + T - d.h + 2 - cy + bob), {t: now});
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
        W.def.tiles.forEach((row, ty) => [...row].forEach((ch, tx) => { if (ch === 'w') { ctx.globalAlpha = a; Q.draw(ctx, 'mic-shadow', tx * T + 5 - cx, ty * T + 2 - cy); } }));
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
