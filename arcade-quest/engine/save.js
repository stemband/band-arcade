/* ARCADE QUEST ENGINE: the save slot and the settings, both in Arcade.store.gameData('arcade-quest') on this device.
   SAVE FORMAT (version 3; bump SAVE_VERSION and add a step to upgrade() whenever the shape changes):
     {v: 2, level, xp, hp, maxHp, tokens, items: {itemId: count}, roster: [enemyId…] (befriended), battles: {won, befriended, faded},
      world: {map, x, y, dir} (where you last saved at a Save Jukebox; null = never),
      flags: {name: true} (story flags: met-mezzo, songBb, reginaldAwake, atticOpen…),
      done: {'<room>:<ghost key>': 'befriend' | 'fade'} (manor ghosts already helped: they don't come back),
      converted: {'<source>': stars} (stars already turned into tokens: 'm:<member>' or 'g:<game>'),
      tokens, converted and convertedLeft are THE SHARED WALLET: only shared/tokens.js (Arcade.Tokens) reads or writes
      them, for the Prize Counter and the Token Booth alike. A save with no `v` holding only {wallet, tokens, converted}
      (the Prize Counter used before Arcade Quest was ever opened) becomes a fresh save that keeps them.
      charms: {owned: {charmId: true}, equipped: [charmId | null, charmId | null]} (v3: data/items.js QUEST_CHARMS),
      band: [enemyId…] | null (v4: the friends who play beside you in battle, up to 2; null = never chosen = the last
            two befriended; [] = a solo),
      route: {<gate or final enemy id>: 'befriend' | 'fade'} (v5: how each story ghost was passed: the Phantom Fermata
            (befriend = the attic door, fade = the Hidden Passage) and the Ghost Conductor (the best ending or the
            defeat ending); for future achievements),
      play: {1: seconds, 2: seconds} (the time played in each episode, from build step 5 on; optional: missing = 0),
      ep: 1 | 2 (v6: the episode last played: the episode of the room you were last in (QUEST_MAPS[id].ep, 1 when
            left out); an older save takes it from save.world's room). EPISODE 2 (THE SHOWTIME STAGE) keeps
            everything else in the same fields: its story flags in `flags` (ep2Start, songEb…), its machines in `done`
            ('<room>:<key>': its room ids never clash with the manor's), its friends in `roster`, its charms in `charms`,
      gear: {tiers: {metal: true, diamond: true}, shards: n, shardsGranted: true, up: {power: 0–5, calm: 0–5}} (v7:
            INSTRUMENT TIERS and UPGRADES, Q.gear below: the tiers owned (Rusty always; the Perfect never), the NOTE
            SHARDS not yet spent, `shardsGranted` = the Shards for the enemies a save had already helped were granted
            (once: the v6 → v7 migration), the two upgrade tracks' steps)}
   ALTERNATE ROUTES stay open whatever happens (routes()): a gate ghost that is done (befriended or faded) always has
   ITS way open: befriended = its `opens` flag, faded = its `opensIfFaded` flag, unless one is already set. This
   repairs saves from before the routes, save codes (they carry the ghosts helped and the roster, so which way is known,
   not the passage flag) and anything odd, so neither route can lock a student out. The same for Episode 2's band:
   a room whose machines are all helped (either way) has its band member awake (its map's `wakes` flag). And the
   GEAR (gearRepair): a save that finished Episode 1 (ep1Done) owns the Metal tier, an old save's Shards are granted
   once, the upgrade steps stay whole numbers 0–max, the Perfect is never owned.
   maxHp = maxHpAt(level) + the equipped charms' maxHp (Q.charms.fixHp keeps it right).
   AVATAR ITEMS bought at the Token Booth are NOT in this save: they're the arcade's (Arcade.store.ownItem), worn
   everywhere. The save code carries them anyway (shared/backup.js version 2).
   Progress (level, items, tokens, friends, flags) saves as it happens; the jukebox saves WHERE you are and heals you.
   SAVE CODES (shared/backup.js, format version 7): Q.save.code() = the 85-character code shown at the jukebox;
   Q.save.fromCode(code) -> {ok, error} replaces this device's save with it (ENTER SAVE CODE on the title screen).
   `convertedLeft` (from a code): stars already turned into tokens on the other device, spread over this device's
   star sources the next time the Token Booth counts (engine/talk.js).
   Every write also stores `progress` = {ep, pct (Episode 1's), ep2 (Episode 2's), friends} for the arcade floor's line
   ("Episode 1: 60% · 7 friends"; from ep1Done on, Episode 2's: "Episode 2: 15% · 9 friends"; the weights: progress()).
   SETTINGS: {textSpeed: 'slow'|'normal'|'fast'|'instant', dodge: 'easy'|'normal', assist: bool, keyHints: bool (keyboards: the key legend)} (your look and name: Create Your Player, EDIT PLAYER here).
   Sound and music volumes are the arcade's own (shared/sfx.js speaker settings), so they match every other game.
   Q.settings.open() shows the arcade's shared SETTINGS panel (shared/ui-kit.js) with these options under "Arcade Quest". */
(function (A) {
  "use strict";
  const Q = A.Quest, GAME = 'arcade-quest';
  const SAVE_VERSION = 7;
  const data = () => A.store.gameData(GAME);
  const CHARMS = () => window.QUEST_CHARMS || {};
  /* THE EPISODES: every room says which one it belongs to (QUEST_MAPS[id].ep: data/maps/stage.js sets 2; manor.js
     leaves it out = 1). EP2_ROOMS = THE SHOWTIME STAGE's room ids (docs/games/arcade-quest-ep2-plan.md), so a room
     that isn't built yet (a save code from a later version, a door's sign) still knows its episode. Never reuse one. */
  const EP2_ROOMS = ['lobby', 'greenroom', 'pit', 'workshop', 'backstage', 'dressing', 'loft', 'stage', 'balcony', 'vent'];
  const episodeOf = id => { const m = (window.QUEST_MAPS || {})[id]; return m ? m.ep || 1 : EP2_ROOMS.includes(id) ? 2 : 1; };
  /** EVERY GHOST (Episode 1) or MACHINE (Episode 2) of an episode: '<room>:<key>' for every enemy placed on a map of
      that episode, outside `practice` rooms (the Practice Hall, the Green Room; the Test Arena has no map). Read from
      the maps each time, so one added to a map later counts by itself. -> [{key, room}] */
  function ghosts(ep = 1) {
    const maps = window.QUEST_MAPS || {}, out = [];
    // (a map entry with `boss: true` isn't one of them: Episode 2's Rico Bandit and THE BIG NUMBER have flags of their own;
    // nor is an `extra`: a bonus friend, Tom-Tom Termite)
    Object.keys(maps).forEach(id => { if (!maps[id].practice && episodeOf(id) === ep) (maps[id].enemies || []).forEach(e => { if (!e.boss && !e.extra) out.push({key: id + ':' + e.key, room: id}); }); });
    return out;
  }
  /** THE GHOST LOG (the pause menu): {helped, total, rooms: the rooms that still have someone (map names, in map
      order), all: every ghost helped}. The same list as progress() and the 'manor-all' achievement (Episode 1). */
  function ghostLog(s = Q.save.get(), ep = 1) {
    const list = ghosts(ep), done = s.done || {}, left = list.filter(g => !done[g.key]), maps = window.QUEST_MAPS || {};
    const rooms = [...new Set(left.map(g => g.room))].map(id => maps[id].name || id);
    return {helped: list.length - left.length, total: list.length, rooms, all: list.length > 0 && !left.length};
  }
  /* THE FLOOR'S LINE: Episode 1 until ep1Done, then Episode 2 (it opens then).
     EPISODE 1: every manor ghost helped = 50 %, the B♭ Blast 10, Sir Reginald 10, the attic 10 (its door or the Hidden
       Passage), the Ghost Conductor 20.
     EPISODE 2: every Showtime machine helped = 50 % (none placed yet: 0 until the rooms are built), the E♭ Encore
       (songEb) 10, Tubby Tusk awake 5, Snapjaw Sal awake 5, Rico Bandit (ricoDone, either route) 10, THE BIG NUMBER
       (ep2Done) 20. */
  /* -> {ep: the episode the floor shows, pct: EPISODE 1's % (as it always was), ep2: EPISODE 2's %, friends} */
  function progress(s) {
    const f = s.flags || {}, done = s.done || {};
    const share = ep => { const keys = ghosts(ep).map(g => g.key); return keys.length ? keys.filter(k => done[k]).length / keys.length * 50 : 0; };
    const pct = Math.round(share(1) + (f.songBb ? 10 : 0) + (f.reginaldAwake ? 10 : 0) + (f.atticOpen || f.atticPassage ? 10 : 0) + (f.ep1Done ? 20 : 0));
    const ep2 = Math.round(share(2) + (f.songEb ? 10 : 0) + (f.tuskAwake ? 5 : 0) + (f.salAwake ? 5 : 0) + (f.ricoDone ? 10 : 0) + (f.ep2Done ? 20 : 0));
    return {ep: f.ep1Done ? 2 : 1, pct: Math.min(100, pct), ep2: Math.min(100, ep2), friends: (s.roster || []).length};
  }
  /** where you stand after loading at a room's Save Jukebox: the tile below it, facing up (null: no jukebox / no room) */
  function jukeSpot(id) {
    const m = (window.QUEST_MAPS || {})[id], j = m && (m.things || []).find(t => t.use === 'jukebox');
    return j ? {map: id, x: j.at[0], y: j.at[1] + 1, dir: 'up'} : null;
  }
  const write = () => { const d = data(); if (d.save && d.save.v) d.save.progress = progress(d.save); A.store.saveGameData(GAME); };
  const fresh = () => ({v: SAVE_VERSION, level: 1, xp: 0, hp: 20, maxHp: 20, tokens: 0, items: {'valve-oil': 2, 'cork-grease': 1, 'metronome': 1}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: null, flags: {}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: null, route: {}, ep: 1, gear: freshGear(true)});
  /* ---------- THE GEAR's numbers (data/items.js QUEST_INSTRUMENTS / QUEST_UPGRADES) ---------- */
  const TIERS = () => (window.QUEST_INSTRUMENTS || {}).tiers || [{id: 'rusty', name: 'Rusty {you}', dmg: 0, calm: 0}];
  const UPS = () => window.QUEST_UPGRADES || {max: 5, costs: [], power: {step: 0}, calm: {step: 0}, shards: {}};
  const freshGear = granted => ({tiers: {}, shards: 0, shardsGranted: !!granted, up: {power: 0, calm: 0}});
  /** the NOTE SHARDS an enemy gives the first time it's helped: a final boss, a mini-boss (`boss`) or a regular one */
  function shardsFor(enemyId) {
    const e = (window.QUEST_ENEMIES || []).find(x => x.id === enemyId), S = UPS().shards || {};
    return !e ? 0 : e.final ? S.final || 0 : e.boss ? S.boss || 0 : S.enemy || 0;
  }
  /** the Shards a save's helped enemies are worth (its `done` records, read through the maps: '<room>:<key>' → type) */
  function shardsEarned(done) {
    const maps = window.QUEST_MAPS || {};
    return Object.keys(done || {}).reduce((n, k) => {
      const [room, key] = k.split(':'), m = maps[room], g = m && !m.practice && (m.enemies || []).find(x => x.key === key);
      return n + (g ? shardsFor(g.type) : 0);
    }, 0);
  }
  /** THE GEAR's repair (every load, like routes()): the shape, Metal at ep1Done, an old save's Shards once */
  function gearRepair(s) {
    // (in place: code holding s.gear or s.gear.up across a get() keeps writing to the same objects)
    if (!s.gear || typeof s.gear !== 'object') s.gear = freshGear(false);
    const g = s.gear;
    if (!g.tiers || typeof g.tiers !== 'object') g.tiers = {};
    if (!g.up || typeof g.up !== 'object') g.up = {power: 0, calm: 0};
    g.shardsGranted = !!g.shardsGranted;
    ['power', 'calm'].forEach(k => { g.up[k] = Math.max(0, Math.min(UPS().max || 5, Math.round(+g.up[k] || 0))); });
    g.shards = Math.max(0, Math.round(+g.shards || 0));
    TIERS().forEach(t => { if (t.locked) delete g.tiers[t.id]; else if (t.free && s.flags[t.free]) g.tiers[t.id] = true; });
    delete g.tiers.rusty;                                                   // (always yours: never stored)
    // THE RETROACTIVE GRANT: a save from before the Shards gets them for every enemy it had helped, ONCE (the maps
    // and the enemies must be loaded to count them: the game's pages always have them by the first get())
    if (!g.shardsGranted && window.QUEST_MAPS && window.QUEST_ENEMIES) { g.shards += shardsEarned(s.done); g.shardsGranted = true; }
  }
  /** the story ghosts' routes: every gate ghost that's done keeps its way open, and `route` notes how it was passed */
  function routes(s) {
    const maps = window.QUEST_MAPS || {}, E = window.QUEST_ENEMIES || [];
    s.route = s.route || {};
    Object.keys(maps).forEach(id => {
      if (maps[id].practice) return;
      (maps[id].enemies || []).forEach(g => {
        const def = E.find(e => e.id === g.type), kind = s.done[id + ':' + g.key];
        if (!def || !kind || !(def.opens || def.opensIfFaded || def.final)) return;
        if (def.doneFlag) s.flags[def.doneFlag] = true;                    // (Rico: ricoDone; THE BIG NUMBER: ep2Done)
        // a befriended boss's KEY ITEM (`keep`: the Golden Mic Stand) comes back with a save code, which has no room for it
        const gift = kind === 'befriend' && ((def.rewards || {}).befriend || {}).item, IT = window.QUEST_ITEMS || {};
        if (gift && IT[gift] && IT[gift].keep && !(s.items || {})[gift]) { s.items = s.items || {}; s.items[gift] = 1; }
        if (!s.route[def.id]) s.route[def.id] = kind;
        if ((def.opens && s.flags[def.opens]) || (def.opensIfFaded && s.flags[def.opensIfFaded])) return;
        const flag = kind === 'befriend' ? def.opens || def.opensIfFaded : def.opensIfFaded || def.opens;
        if (flag) s.flags[flag] = true;
      });
      // a BONUS FRIEND (`extra`: Tom-Tom Termite): a save code carries the roster and its doneFlag (termiteDone), not
      // its `done` key: in the roster = befriended there; the flag alone = powered down. Either way it doesn't come back
      (maps[id].enemies || []).forEach(g => {
        if (!g.extra || s.done[id + ':' + g.key]) return;
        const E = (window.QUEST_ENEMIES || []).find(e => e.id === g.type) || {}, friend = (s.roster || []).includes(g.type);
        if (friend || (E.doneFlag && s.flags[E.doneFlag])) s.done[id + ':' + g.key] = friend ? 'befriend' : 'fade';   // (its doneFlag: helped either way)
      });
      // THE BAND WAKES (data/maps/stage.js `wakes`): every machine of that room helped, either way = they're awake
      const wk = maps[id].wakes, list = (maps[id].enemies || []).filter(g => !g.extra);   // (a bonus friend never gates)
      if (wk && list.length && list.every(g => s.done[id + ':' + g.key])) s.flags[wk.flag] = true;
    });
  }
  /** older saves -> the current version, one step at a time */
  function upgrade(s) {
    if (!s || typeof s !== 'object') return fresh();
    if (!s.v) {          // no save yet, or only THE SHARED WALLET (shared/tokens.js: the Prize Counter was used first): keep it
      const f = fresh();
      f.tokens = Math.max(0, Math.round(+s.tokens || 0));
      if (s.converted && typeof s.converted === 'object') f.converted = s.converted;
      if (s.convertedLeft > 0) f.convertedLeft = s.convertedLeft;
      return f;
    }
    if (s.v === 1) { Object.assign(s, {world: null, flags: {}, done: {}, converted: {}}); s.v = 2; }    // v1 -> v2: Episode 1
    if (s.v === 2) { s.charms = {owned: {}, equipped: [null, null]}; s.v = 3; }                           // v2 -> v3: charms
    if (s.v === 3) { s.band = null; s.v = 4; }                                                            // v3 -> v4: the band (default)
    if (s.v === 4) { s.route = {}; s.v = 5; }                                                             // v4 -> v5: routes
    if (s.v === 5) { s.ep = episodeOf((s.world || {}).map); s.v = 6; }                                     // v5 -> v6: episodes
    if (s.v === 6) { s.gear = freshGear(false); s.v = 7; }                                                 // v6 -> v7: the gear (Shards granted below)
    s.flags = s.flags || {}; s.done = s.done || {}; s.converted = s.converted || {};
    routes(s);
    gearRepair(s);
    s.charms = s.charms || {owned: {}, equipped: [null, null]}; s.charms.owned = s.charms.owned || {};
    s.charms.equipped = [0, 1].map(i => { const id = (s.charms.equipped || [])[i]; return id && s.charms.owned[id] && CHARMS()[id] ? id : null; });
    return s;
  }

  Q.save = {
    VERSION: SAVE_VERSION,
    EP2_ROOMS,
    episodeOf,
    jukeSpot,
    get() { const d = data(); d.save = upgrade(d.save); return d.save; },
    write,
    /** NEW GAME: a fresh save that KEEPS THE SHARED WALLET (tokens, stars already turned in: shared/tokens.js), which
        belongs to the whole arcade (the Prize Counter spends it too), so no star is ever counted twice */
    reset() {
      const old = data().save, s = fresh();
      if (old && typeof old === 'object') {
        s.tokens = Math.max(0, Math.round(+old.tokens || 0));
        if (old.converted && typeof old.converted === 'object') s.converted = old.converted;
        if (old.convertedLeft > 0) s.convertedLeft = old.convertedLeft;
      }
      data().save = s; write(); return s;
    },
    /** this save as a save code (shared/backup.js: version 7, 85 characters) */
    code: () => A.Backup ? A.Backup.questEncode(Q.save.get()) : '',
    /** replace this device's save with a save code: {ok: true} or {ok: false, error} */
    fromCode(code) {
      const r = A.Backup ? A.Backup.questDecode(code) : {ok: false, error: 'Save codes need shared/backup.js.'};
      if (!r.ok) return r;
      const f = r.fields, s = fresh(), friends = f.roster.filter(id => !['squawk', 'warble', 'clatterbox', 'quizzle', 'stickyvalve'].includes(id));
      // (version 6: Episode 2's flags, machines, friends and charms come in these same fields, + the episode)
      const world = f.world && f.world.x == null ? jukeSpot(f.world.map) || f.world : f.world;   // the Fly Loft's spot: from its map
      Object.assign(s, {level: f.level, xp: f.xp, items: f.items, roster: f.roster, flags: f.flags, done: f.done, world,
        maxHp: Q.save.maxHpAt(f.level), charms: f.charms || s.charms, ep: f.ep || episodeOf((f.world || {}).map)});
      // THE GEAR (version 7 carries it); an older code derives it the way the save repair does: Metal at ep1Done, the
      // Shards of the enemies it helped, no upgrades
      s.gear = f.gear ? {tiers: Object.assign({}, f.gear.tiers), shards: f.gear.shards, shardsGranted: true, up: Object.assign({}, f.gear.up)}
        : {tiers: {}, shards: shardsEarned(f.done), shardsGranted: true, up: {power: 0, calm: 0}};
      gearRepair(s);
      data().save = s; Q.charms.fixHp(s);
      if (A.Tokens) A.Tokens.restore(f); else Object.assign(s, {tokens: f.tokens, convertedLeft: f.convertedLeft});   // THE SHARED WALLET
      s.hp = s.maxHp;
      // avatar items (version-2 codes): unlocked ones become owned on this device, the worn ones go back on
      if (f.cosmetics) {
        f.cosmetics.owned.forEach(k => A.store.ownItem(k));
        if (f.cosmetics.worn.length && A.store.avatar) {
          const av = A.store.avatar; f.cosmetics.worn.forEach(k => { const [fl, id] = k.split(':'); av[fl] = id; }); A.store.setAvatar(av);
        }
      }
      const done = Object.values(f.done);
      s.battles = {won: done.length, befriended: done.filter(k => k === 'befriend').length || friends.length, faded: done.filter(k => k === 'fade').length};
      data().save = s; write();
      Q.save.achievements();                       // the ghosts helped came back: so do the achievements ('manor-all')
      return {ok: true};
    },
    progress,
    ghosts,
    ghostLog,
    /** ACHIEVEMENTS (shared/skins.js and avatar-parts.js rules {game: 'arcade-quest', achievement}), saved in
        gameData('arcade-quest').achievements, never taken back:
          'ep1'           Episode 1 finished (the Pixel Hero skin, the Pixel-hero cape, the Microphone, Pixel Castle)
          'manor-friends' every KIND of manor ghost befriended (the Baton skin accessory)
          'manor-all'     EVERY manor ghost helped, befriended or faded (ghostLog().all: the 20 placed ghosts, the
                          Practice Hall and the Test Arena never count): the Spirit Lantern + the Ghost Whisperer plate
        EPISODE 2 (THE SHOWTIME STAGE, build step 5):
          'ep2'           Episode 2 finished, either ending (ep2Done): the Showtime Stage background, the "Encore!"
                          plate, the Showtime Top Hat
          'stage-friends' every KIND of Episode 2 machine befriended, + Rico Bandit and THE BIG NUMBER (every
                          QUEST_ENEMIES entry with area 'stage' in the roster): the Spotlight effect
          'stage-all'     SHOWSTOPPER: all 20 Showtime machines helped, befriended or powered down (ghostLog(s, 2).all;
                          the Green Room and the Test Arena never count): the Showstopper Sash + its plate
        Checked after every battle (world.js afterBattle), on load (main.js: Q.save.recheck) and after a save code
        (fromCode); a Backup Code reloads the page, so the load check covers it. */
    achievements() {
      const s = Q.save.get(), d = data(), a = d.achievements || (d.achievements = {});
      if ((s.flags || {}).ep1Done) a.ep1 = true;
      const manor = (window.QUEST_ENEMIES || []).filter(e => e.area === 'manor' && !e.extra).map(e => e.id);
      if (manor.length && manor.every(id => (s.roster || []).includes(id))) a['manor-friends'] = true;
      if (ghostLog(s).all) a['manor-all'] = true;
      if ((s.flags || {}).ep2Done) a.ep2 = true;
      const stage = (window.QUEST_ENEMIES || []).filter(e => e.area === 'stage' && !e.extra).map(e => e.id);   // (Tom-Tom Termite, a bonus friend: not needed)
      if (stage.length && stage.every(id => (s.roster || []).includes(id))) a['stage-friends'] = true;
      if (ghostLog(s, 2).all) a['stage-all'] = true;
      write();
      return a;
    },
    /** is an achievement already earned (before checking again)? */
    has: id => !!(data().achievements || {})[id],
    /** on load: re-check the achievements when there is a save (never makes one: a device that never played stays so) */
    recheck() { const d = data(); if (d.save && d.save.v) Q.save.achievements(); },
    /** THE TIME PLAYED, per episode (EPISODE 2 COMPLETE shows it): world.js and battle.js add each frame's seconds to
        save.play[<the episode last played>] (written with the save's next write; not in save codes) */
    tick(dt) { const s = Q.save.get(), ep = s.ep || 1; s.play = s.play || {}; s.play[ep] = (s.play[ep] || 0) + Math.min(dt, .5); },
    played: (ep = 1) => Math.round(((Q.save.get().play || {})[ep] || 0)),
    xpToNext: level => 20 + (level - 1) * 15,
    /** YOUR POWER at a level: about 14 % more every level (LV 1 10 · 2 11 · 3 13 · 5 17 · 8 25 · 10 33 · 15 63).
        A PLAY does power × accuracy × (0.55 + 0.45 × speed) (battle.js); your band's companions scale with it too. */
    powerAt: level => Math.round(10 * Math.pow(1.14, Math.max(0, level - 1))),
    maxHpAt: level => 20 + (level - 1) * 4,
    flag: name => !!(Q.save.get().flags || {})[name],
    setFlag(name, on = true) { const s = Q.save.get(); s.flags = s.flags || {}; if (on) s.flags[name] = true; else delete s.flags[name]; write(); },
    /** ghosts (Episode 1) or machines (Episode 2) helped, befriended or faded, outside the practice rooms */
    helped: (ep = 1) => { const d = Q.save.get().done || {}; return ghosts(ep).filter(g => d[g.key]).length; },
  };

  /* ---------- THE BAND: befriended ghosts (the roster) with a `companion` (data/enemies.js) who play beside you in
     battle, up to 2 (a DUET or a TRIO). The choice is `band` in the save; never chosen (null, and every save from before
     the band) = the last two befriended. ---------- */
  const COMPANION = id => { const e = (window.QUEST_ENEMIES || []).find(x => x.id === id); return e && e.companion ? e : null; };
  Q.band = {
    MAX: 2,
    /** every friend who can play beside you, in the order you befriended them */
    choices: () => (Q.save.get().roster || []).filter(COMPANION),
    /** who plays beside you now (the saved choice, else the last two befriended), as enemy ids */
    members() {
      const s = Q.save.get(), can = Q.band.choices();
      return (Array.isArray(s.band) ? s.band.filter(id => can.includes(id)) : can.slice(-Q.band.MAX)).slice(0, Q.band.MAX);
    },
    /** true while the band is the automatic default (never chosen on the BAND screen: the two newest friends) */
    auto: () => !Array.isArray(Q.save.get().band),
    /** THE LINEUP for a battle against `enemyId`: a friend never plays against its own kind, so each one who can't
        play is replaced, for this battle only, by the next friend available (the most recently befriended first, not
        already in the band, not that kind); nobody left = the band plays short. -> {band, out, subs} (enemy ids) */
    lineup(enemyId) {
      const saved = Q.band.members(), out = saved.filter(id => id === enemyId);
      const spare = Q.band.choices().slice().reverse().filter(id => !saved.includes(id) && id !== enemyId);
      const band = saved.map(id => (id === enemyId ? spare.shift() : id)).filter(Boolean);
      return {band, out, subs: band.filter(id => !saved.includes(id))};
    },
    /** choose the band ([] = a solo) */
    set(ids) { const s = Q.save.get(), can = Q.band.choices(); s.band = [...new Set(ids)].filter(id => can.includes(id)).slice(0, Q.band.MAX); write(); return s.band; },
    enemy: COMPANION,
  };

  /* ---------- CHARMS (ARCADE QUEST ONLY): 2 slots. Only battle.js, dodge.js and challenges.js (the rhythm windows) read them, and only this game loads
     this file, so they can never change a practice game. ---------- */
  Q.charms = {
    SLOTS: 2,
    list: () => CHARMS(),
    get: id => CHARMS()[id] || null,
    owned: id => !!Q.save.get().charms.owned[id],
    equipped: () => Q.save.get().charms.equipped.slice(),
    /** the equipped charms' effects, e.g. Q.charms.effects().map(e => e.calm) */
    effects: () => Q.save.get().charms.equipped.filter(Boolean).map(id => (CHARMS()[id] || {}).effect || {}),
    /** a product (calm, dodge…) or a sum (maxHp, block) of the equipped charms' effects */
    mult: k => Q.charms.effects().reduce((m, e) => m * (e[k] || 1), 1),
    sum: k => Q.charms.effects().reduce((n, e) => n + (e[k] || 0), 0),
    /** give a charm (found, bought or a reward): false if it was already yours */
    give(id) { const s = Q.save.get(); if (!CHARMS()[id] || s.charms.owned[id]) return false; s.charms.owned[id] = true; write(); return true; },
    /** wear a charm in slot 0/1 (null = take it off); the same charm can't be in both slots */
    equip(slot, id) {
      const s = Q.save.get(), eq = s.charms.equipped;
      if (id && !s.charms.owned[id]) return false;
      if (id) eq.forEach((x, i) => { if (x === id) eq[i] = null; });
      eq[slot] = id || null; Q.charms.fixHp(s); write();
      return true;
    },
    /** max HP = the level's + the charms'; HP goes up with it (and never over it) */
    fixHp(s = Q.save.get()) {
      const was = s.maxHp, bonus = (s.charms.equipped || []).filter(Boolean).reduce((n, id) => n + (((CHARMS()[id] || {}).effect || {}).maxHp || 0), 0);
      s.maxHp = Q.save.maxHpAt(s.level) + bonus;
      if (s.maxHp > was) s.hp += s.maxHp - was;
      s.hp = Math.max(1, Math.min(s.hp, s.maxHp));
    },
  };

  /* ---------- THE GEAR: INSTRUMENT TIERS and UPGRADES (designed by a Raven Band student; ARCADE QUEST ONLY, like the
     charms). The numbers: data/items.js QUEST_INSTRUMENTS / QUEST_UPGRADES. The save: s.gear (v7).
     THE TIERS: Rusty (always yours), Metal (ep1Done, or bought: 350 tokens at either token booth), Diamond (a secret
     map thing in Episode 2: data/maps/stage.js), the Perfect (`locked`: a "???" teaser, never owned). The BEST tier
     you own is always the one that plays. THE UPGRADES: POWER UP and CALM UP, bought with NOTE SHARDS (the first time
     each enemy is helped: engine/world.js afterBattle). bonus() = the tier's share + the upgrades' (they ADD), and
     battle.js multiplies YOUR damage by 1 + dmg (never your band's) and every CALM gain but LISTEN's by 1 + calm. ---------- */
  const pct = x => Math.round(x * 100);
  /* the instrument's PORTRAIT in a tier's colors: the member's carry pose (shared/instrument-sprites.js POSES +
     SHAPES) redrawn with that tier's palette (a tint: rust, steel, diamond; the Perfect a dark silhouette) */
  const DIA = ['q-gear-dia-l', 'q-gear-dia'], BARS = '123456';
  const TINT = {
    rusty: Object.assign({g: 'q-gear-rust', G: 'q-gear-rust-d', m: 'q-gear-rust-l', M: 'q-gear-rust-d', d: 'q-gear-rust'}, ...[...BARS].map((b, i) => ({[b]: i % 2 ? 'q-gear-rust' : 'q-gear-rust-l'}))),
    metal: Object.assign({g: 'q-silver', G: 'q-steel-d', m: 'q-silver', M: 'q-steel-d', d: 'q-steel'}, ...[...BARS].map((b, i) => ({[b]: i % 2 ? 'q-steel' : 'q-silver'}))),
    diamond: Object.assign({g: DIA[0], G: DIA[1], m: DIA[0], M: DIA[1], k: 'q-gear-dia-d', w: 'q-gear-dia-d', W: DIA[1], d: DIA[1], D: 'q-white', r: DIA[0], s: DIA[0], x: 'q-white'},
      ...[...BARS].map((b, i) => ({[b]: DIA[i % 2]}))),
  };
  function portrait(tierId, memberId) {
    const ART = window.QUEST_ART || {}, P = ART.POSES || {}, SH = ART.SHAPES || {}, id = `gear-${memberId}-${tierId}`;
    if (Q.spriteDef(id)) return id;
    const pose = (P[memberId] || P[Object.keys(P)[0]] || {}).side, parts = (pose && pose.parts || []).filter(p => SH[p[0]]);
    if (!parts.length) return null;
    let x0 = 99, y0 = 99, x1 = 0, y1 = 0;
    parts.forEach(([sh, x, y]) => { const r = SH[sh]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + Math.max(...r.map(l => l.length))); y1 = Math.max(y1, y + r.length); });
    const base = ART.INSTRUMENT_PALETTE || {}, tint = TINT[tierId], pal = {};
    Object.keys(base).forEach(ch => { pal[ch] = tierId === 'perfect' ? 'q-gear-shadow' : (tint && tint[ch]) || base[ch]; });
    // (the 'back' parts first, like the hero's drawing)
    const order = parts.filter(p => p[3] === 'back').concat(parts.filter(p => p[3] !== 'back'));
    Q.addSprite(id, {w: x1 - x0, h: y1 - y0, layers: [order.map(([sh, x, y]) => ({rows: SH[sh], palette: pal, at: [x - x0, y - y0]}))]});
    return id;
  }
  Q.gear = {
    tiers: () => TIERS(),
    ups: () => UPS(),
    tier: id => TIERS().find(t => t.id === id) || null,
    /** do you own this tier? (the first is always yours; a `locked` one never is) */
    owned(id) { const t = Q.gear.tier(id); return !!t && !t.locked && (t === TIERS()[0] || !!Q.save.get().gear.tiers[id]); },
    /** the BEST tier you own: the one that plays */
    best: () => TIERS().filter(t => Q.gear.owned(t.id)).pop() || TIERS()[0],
    /** a tier's name with your real instrument ("Metal Clarinet", "Rusty Snare") */
    name(id = Q.gear.best().id, member = A.currentMember && A.currentMember()) { const t = Q.gear.tier(id) || TIERS()[0]; return t.name.replace(/\{you\}/g, member ? member.short : 'Instrument'); },
    /** give a tier (bought, found or earned): false if it was already yours or can't be owned */
    give(id) {
      const t = Q.gear.tier(id), s = Q.save.get();
      if (!t || t.locked || Q.gear.owned(id)) return false;
      s.gear.tiers[id] = true; write(); return true;
    },
    /** the steps bought on a track ('power' | 'calm') */
    level: k => (Q.save.get().gear.up || {})[k] || 0,
    /** what plays now: the best tier's share + the upgrades' (they ADD) -> {dmg, calm} */
    bonus() {
      const t = Q.gear.best(), U = UPS();
      return {dmg: (t.dmg || 0) + Q.gear.level('power') * ((U.power || {}).step || 0), calm: (t.calm || 0) + Q.gear.level('calm') * ((U.calm || {}).step || 0)};
    },
    dmgMult: () => 1 + Q.gear.bonus().dmg,
    calmMult: () => 1 + Q.gear.bonus().calm,
    /** "+10 % damage, +20 % CALM" (a tier, or {dmg, calm}) */
    bonusText: b => Q.text('gearBonus', {dmg: pct(b.dmg || 0), calm: pct(b.calm || 0)}),
    pct,
    /* ---------- NOTE SHARDS (placeholder name: QUEST_TEXT `shards`) ---------- */
    shards: () => Q.save.get().gear.shards,
    /** the currency's name for n of them ("1 Note Shard", "4 Note Shards"): the one text key, a last "s" dropped for 1 */
    shardWord: n => { const w = Q.text('shards'); return n === 1 ? w.replace(/s$/, '') : w; },
    shardsFor,
    shardsEarned,
    /** add Shards (engine/world.js: the first time an enemy is helped) */
    earn(n) { if (!(n > 0)) return 0; const s = Q.save.get(); s.gear.shards += n; write(); return n; },
    /** the next step's cost on a track, or null at the top */
    cost(k) { const U = UPS(), lv = Q.gear.level(k); return lv >= U.max ? null : U.costs[lv]; },
    /** buy the next step: {ok, level} | {ok: false, why: 'max' | 'need', need} (no refunds, no resets) */
    buy(k) {
      const s = Q.save.get(), c = Q.gear.cost(k);
      if (c == null) return {ok: false, why: 'max'};
      if (s.gear.shards < c) return {ok: false, why: 'need', need: c};
      s.gear.shards -= c; s.gear.up[k] = Q.gear.level(k) + 1; write();
      return {ok: true, level: s.gear.up[k]};
    },
    /** a tier's portrait sprite id for your instrument (made the first time it's asked for) */
    portrait: (tierId = Q.gear.best().id, memberId = (A.currentMember && A.currentMember() || {}).id) => portrait(tierId, memberId),
  };

  const DEFAULTS = {textSpeed: 'normal', dodge: 'normal', assist: false, keyHints: true};
  /* THE SETTINGS PANEL is the arcade's shared one (shared/ui-kit.js Arcade.UI.settings: sound, music, effects, motion,
     mic sensitivity), pixel-themed in style.css; Arcade Quest adds its own options under "This game" (registered once,
     so they're there however it opens: the title, the arena, a battle's ⚙, the pause menu or the top bar). */
  const OPTS = [['textSpeed', 'Text speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]],
    ['dodge', 'Dodging', [['easy', 'Easy'], ['normal', 'Normal']]],
    ['assist', 'Assist mode', [['false', 'Off'], ['true', 'On']], 'On: enemies’ sour notes do half damage.'],
    ['keyHints', 'Show key hints', [['true', 'On'], ['false', 'Off']], 'The keys in the corner while you explore.', 'keyboard']];
  const BOOL = ['assist', 'keyHints'];
  /* THE CONTROLS (every key engine/input.js knows, + M for the menu), listed under "Controls" */
  const CONTROLS = [['Arrows or W A S D', 'Move'], ['Z, Enter or Space', 'A: talk, check, choose'], ['X, Esc or Backspace', 'B: back'],
    ['M, Esc, P or B', 'Menu (while you explore)'], ['H', 'Hide or show the key hints']];
  function questOptions(box, ctx) {
    const s = Q.settings.get();
    box.innerHTML = OPTS.filter(o => !(o[4] === 'keyboard' && Q.input.touch)).map(([k, name, opts, note]) => `<div><span class="ui-label" id="qSet-${k}">${name}</span>` +
      `<div class="ui-seg ui-seg-sm" role="group" aria-labelledby="qSet-${k}" data-k="${k}">` +
      opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(s[k]) === v}">${l}</button>`).join('') + `</div>` +
      (note ? `<p class="ui-howto q-snote">${note}</p>` : '') + `</div>`).join('') +
      (A.AvatarCreator ? `<div><span class="ui-label">Your player</span><button type="button" class="btn btn-secondary btn-small q-edit-av">Edit player</button>` +
        `<p class="ui-howto q-snote">Your look and your name, everywhere in the arcade.</p></div>` : '') +
      // ARRANGE CONTROLS (engine/controls.js): touch screens only (the pad only shows there)
      (Q.input.touch && Q.arrange ? `<div><span class="ui-label">On-screen controls</span><button type="button" class="btn btn-secondary btn-small q-arrange-btn">Arrange controls</button>` +
        `<p class="ui-howto q-snote">Move the D-pad and the A/B buttons, change their size and how see-through they are.</p></div>` : '') +
      `<div><span class="ui-label" id="qSetKeys">Controls</span><dl class="q-keylist" aria-labelledby="qSetKeys">` +
      CONTROLS.map(([k, what]) => `<dt>${k}</dt><dd>${what}</dd>`).join('') + `</dl>` +
      (Q.input.touch ? `<p class="ui-howto q-snote">On this screen: the D-pad, A, B and the ☰ MENU button.</p>` : '') + `</div>`;
    box.querySelectorAll('.ui-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const k = g.dataset.k, v = BOOL.includes(k) ? b.dataset.v === 'true' : b.dataset.v;
      Q.settings.set({[k]: v}); Q.sfx('quest-select');
      g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (Q.onSettings) Q.onSettings();
    })));
    const ar = box.querySelector('.q-arrange-btn');
    if (ar) ar.addEventListener('click', () => { if (ctx && ctx.close) ctx.close(); setTimeout(() => Q.arrange.open(), 50); });
    const ed = box.querySelector('.q-edit-av');                     // Create Your Player (shared/avatar-creator.js)
    if (ed) ed.addEventListener('click', () => A.AvatarCreator.open({onClose: () => { if (Q.onSettings) Q.onSettings(); if (ed.isConnected) ed.focus(); }}));
  }
  if (A.UI && A.UI.settings) A.UI.settings.register(questOptions, {title: 'Arcade Quest'});
  Q.settings = {
    get() { const d = data(); d.settings = Object.assign({}, DEFAULTS, d.settings || {}); return d.settings; },
    set(patch) { Object.assign(this.get(), patch); write(); },
    /** the shared SETTINGS panel over the current scene; resolves when closed */
    open() {
      return new Promise(done => {
        if (!A.UI || !A.UI.settings || A.UI.state().settings) { done(); return; }
        Q.input.clear();
        A.UI.settings.open({theme: 'q-theme', onClose: () => { if (Q.onSettings) Q.onSettings(); done(); }});
      });
    },
  };
})(window.Arcade);
