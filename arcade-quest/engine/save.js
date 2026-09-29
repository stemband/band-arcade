/* ARCADE QUEST ENGINE: the save slot and the settings, both in Arcade.store.gameData('arcade-quest') on this device.
   SAVE FORMAT (version 3; bump SAVE_VERSION and add a step to upgrade() whenever the shape changes):
     {v: 2, level, xp, hp, maxHp, tokens, items: {itemId: count}, roster: [enemyId…] (befriended), battles: {won, befriended, faded},
      world: {map, x, y, dir} (where you last saved at a Save Jukebox; null = never),
      flags: {name: true} (story flags: met-mezzo, songBb, reginaldAwake, atticOpen…),
      done: {'<room>:<ghost key>': 'befriend' | 'fade'} (manor ghosts already helped: they don't come back),
      converted: {'<source>': stars} (stars already turned into tokens at the Token Booth: 'm:<member>' or 'g:<game>'),
      charms: {owned: {charmId: true}, equipped: [charmId | null, charmId | null]} (v3: data/items.js QUEST_CHARMS),
      band: [enemyId…] | null (v4: the friends who play beside you in battle, up to 2; null = never chosen = the last
            two befriended; [] = a solo)}
   maxHp = maxHpAt(level) + the equipped charms' maxHp (Q.charms.fixHp keeps it right).
   AVATAR ITEMS bought at the Token Booth are NOT in this save: they're the arcade's (Arcade.store.ownItem), worn
   everywhere. The save code carries them anyway (shared/backup.js version 2).
   Progress (level, items, tokens, friends, flags) saves as it happens; the jukebox saves WHERE you are and heals you.
   SAVE CODES (shared/backup.js, format version 1): Q.save.code() = the 25-character code shown at the jukebox;
   Q.save.fromCode(code) -> {ok, error} replaces this device's save with it (ENTER SAVE CODE on the title screen).
   `convertedLeft` (from a code): stars already turned into tokens on the other device, spread over this device's
   star sources the next time the Token Booth counts (engine/talk.js).
   Every write also stores `progress` = {pct, friends} for the arcade floor's line ("Episode 1: 60% · 7 friends").
   SETTINGS: {textSpeed: 'slow'|'normal'|'fast'|'instant', dodge: 'easy'|'normal', assist: bool} (your look and name: Create Your Player, EDIT PLAYER here).
   Sound and music volumes are the arcade's own (shared/sfx.js speaker settings), so they match every other game.
   Q.settings.open() shows the arcade's shared SETTINGS panel (shared/ui-kit.js) with these options under "Arcade Quest". */
(function (A) {
  "use strict";
  const Q = A.Quest, GAME = 'arcade-quest';
  const SAVE_VERSION = 4;
  const data = () => A.store.gameData(GAME);
  const CHARMS = () => window.QUEST_CHARMS || {};
  /* how far through Episode 1: every manor ghost helped = 50 %, the B♭ Blast 10, Sir Reginald 10, the attic 10,
     the Ghost Conductor 20 */
  function progress(s) {
    const maps = window.QUEST_MAPS || {}, keys = [];
    Object.keys(maps).forEach(id => { if (!maps[id].practice) (maps[id].enemies || []).forEach(e => keys.push(id + ':' + e.key)); });
    const helped = keys.filter(k => (s.done || {})[k]).length, f = s.flags || {};
    const pct = Math.round((keys.length ? helped / keys.length * 50 : 0) + (f.songBb ? 10 : 0) + (f.reginaldAwake ? 10 : 0) + (f.atticOpen ? 10 : 0) + (f.ep1Done ? 20 : 0));
    return {pct: Math.min(100, pct), friends: (s.roster || []).length};
  }
  const write = () => { const d = data(); if (d.save && d.save.v) d.save.progress = progress(d.save); A.store.saveGameData(GAME); };
  const fresh = () => ({v: SAVE_VERSION, level: 1, xp: 0, hp: 20, maxHp: 20, tokens: 0, items: {'valve-oil': 2, 'cork-grease': 1, 'metronome': 1}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: null, flags: {}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: null});
  /** older saves -> the current version, one step at a time */
  function upgrade(s) {
    if (!s || typeof s !== 'object' || !s.v) return fresh();
    if (s.v === 1) { Object.assign(s, {world: null, flags: {}, done: {}, converted: {}}); s.v = 2; }    // v1 -> v2: Episode 1
    if (s.v === 2) { s.charms = {owned: {}, equipped: [null, null]}; s.v = 3; }                           // v2 -> v3: charms
    if (s.v === 3) { s.band = null; s.v = 4; }                                                            // v3 -> v4: the band (default)
    s.flags = s.flags || {}; s.done = s.done || {}; s.converted = s.converted || {};
    s.charms = s.charms || {owned: {}, equipped: [null, null]}; s.charms.owned = s.charms.owned || {};
    s.charms.equipped = [0, 1].map(i => { const id = (s.charms.equipped || [])[i]; return id && s.charms.owned[id] && CHARMS()[id] ? id : null; });
    return s;
  }

  Q.save = {
    VERSION: SAVE_VERSION,
    get() { const d = data(); d.save = upgrade(d.save); return d.save; },
    write,
    reset() { data().save = fresh(); write(); return data().save; },
    /** this save as a 25-character save code (shared/backup.js) */
    code: () => A.Backup ? A.Backup.questEncode(Q.save.get()) : '',
    /** replace this device's save with a save code: {ok: true} or {ok: false, error} */
    fromCode(code) {
      const r = A.Backup ? A.Backup.questDecode(code) : {ok: false, error: 'Save codes need shared/backup.js.'};
      if (!r.ok) return r;
      const f = r.fields, s = fresh(), friends = f.roster.filter(id => !['squawk', 'warble', 'clatterbox', 'quizzle', 'stickyvalve'].includes(id));
      Object.assign(s, {level: f.level, xp: f.xp, tokens: f.tokens, items: f.items, roster: f.roster, flags: f.flags, done: f.done, world: f.world,
        convertedLeft: f.convertedLeft, maxHp: Q.save.maxHpAt(f.level), charms: f.charms || s.charms});
      data().save = s; Q.charms.fixHp(s);
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
      return {ok: true};
    },
    progress,
    /** skins (shared/skins.js rules {game: 'arcade-quest', achievement}): 'ep1' = Episode 1 finished (Pixel Hero);
        'manor-friends' = every kind of manor ghost befriended (the Baton). Saved in gameData('arcade-quest').achievements. */
    achievements() {
      const s = Q.save.get(), d = data(), a = d.achievements || (d.achievements = {});
      if ((s.flags || {}).ep1Done) a.ep1 = true;
      const manor = (window.QUEST_ENEMIES || []).filter(e => e.area === 'manor').map(e => e.id);
      if (manor.length && manor.every(id => (s.roster || []).includes(id))) a['manor-friends'] = true;
      write();
      return a;
    },
    xpToNext: level => 20 + (level - 1) * 15,
    /** YOUR POWER at a level: about 14 % more every level (LV 1 10 · 2 11 · 3 13 · 5 17 · 8 25 · 10 33 · 15 63).
        A PLAY does power × accuracy × (0.55 + 0.45 × speed) (battle.js); your band's companions scale with it too. */
    powerAt: level => Math.round(10 * Math.pow(1.14, Math.max(0, level - 1))),
    maxHpAt: level => 20 + (level - 1) * 4,
    flag: name => !!(Q.save.get().flags || {})[name],
    setFlag(name, on = true) { const s = Q.save.get(); s.flags = s.flags || {}; if (on) s.flags[name] = true; else delete s.flags[name]; write(); },
    /** manor ghosts helped (befriended or faded), outside the Practice Hall */
    helped: () => Object.keys(Q.save.get().done || {}).length,
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
    /** choose the band ([] = a solo) */
    set(ids) { const s = Q.save.get(), can = Q.band.choices(); s.band = [...new Set(ids)].filter(id => can.includes(id)).slice(0, Q.band.MAX); write(); return s.band; },
    enemy: COMPANION,
  };

  /* ---------- CHARMS (ARCADE QUEST ONLY): 2 slots. Only battle.js and dodge.js read them, and only this game loads
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

  const DEFAULTS = {textSpeed: 'normal', dodge: 'normal', assist: false};
  /* THE SETTINGS PANEL is the arcade's shared one (shared/ui-kit.js Arcade.UI.settings: sound, music, effects, motion,
     mic sensitivity), pixel-themed in style.css; Arcade Quest adds its own options under "This game" (registered once,
     so they're there however it opens: the title, the arena, a battle's ⚙, the pause menu or the top bar). */
  const OPTS = [['textSpeed', 'Text speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]],
    ['dodge', 'Dodging', [['easy', 'Easy'], ['normal', 'Normal']]],
    ['assist', 'Assist mode', [['false', 'Off'], ['true', 'On']], 'On: enemies’ sour notes do half damage.']];
  function questOptions(box) {
    const s = Q.settings.get();
    box.innerHTML = OPTS.map(([k, name, opts, note]) => `<div><span class="ui-label" id="qSet-${k}">${name}</span>` +
      `<div class="ui-seg ui-seg-sm" role="group" aria-labelledby="qSet-${k}" data-k="${k}">` +
      opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(s[k]) === v}">${l}</button>`).join('') + `</div>` +
      (note ? `<p class="ui-howto q-snote">${note}</p>` : '') + `</div>`).join('') +
      (A.AvatarCreator ? `<div><span class="ui-label">Your player</span><button type="button" class="btn btn-secondary btn-small q-edit-av">Edit player</button>` +
        `<p class="ui-howto q-snote">Your look and your name, everywhere in the arcade.</p></div>` : '');
    box.querySelectorAll('.ui-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const k = g.dataset.k, v = k === 'assist' ? b.dataset.v === 'true' : b.dataset.v;
      Q.settings.set({[k]: v}); Q.sfx('quest-select');
      g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (Q.onSettings) Q.onSettings();
    })));
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
