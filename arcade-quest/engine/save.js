/* ARCADE QUEST ENGINE: the save slot and the settings, both in Arcade.store.gameData('arcade-quest') on this device.
   SAVE FORMAT (version 2; bump SAVE_VERSION and add a step to upgrade() whenever the shape changes):
     {v: 2, level, xp, hp, maxHp, tokens, items: {itemId: count}, roster: [enemyId…] (befriended), battles: {won, befriended, faded},
      world: {map, x, y, dir} (where you last saved at a Save Jukebox; null = never),
      flags: {name: true} (story flags: met-mezzo, songBb, reginaldAwake, atticOpen…),
      done: {'<room>:<ghost key>': 'befriend' | 'fade'} (manor ghosts already helped: they don't come back),
      converted: {'<source>': stars} (stars already turned into tokens at the Token Booth: 'm:<member>' or 'g:<game>')}
   Progress (level, items, tokens, friends, flags) saves as it happens; the jukebox saves WHERE you are and heals you.
   SAVE CODES (shared/backup.js, format version 1): Q.save.code() = the 25-character code shown at the jukebox;
   Q.save.fromCode(code) -> {ok, error} replaces this device's save with it (ENTER SAVE CODE on the title screen).
   `convertedLeft` (from a code): stars already turned into tokens on the other device, spread over this device's
   star sources the next time the Token Booth counts (engine/talk.js).
   Every write also stores `progress` = {pct, friends} for the arcade floor's line ("Episode 1: 60% · 7 friends").
   SETTINGS: {textSpeed: 'slow'|'normal'|'fast'|'instant', dodge: 'easy'|'normal', assist: bool, tone: 0–3 (skin tone)}.
   Sound and music volumes are the arcade's own (shared/sfx.js speaker settings), so they match every other game.
   Q.settings.open() shows the SETTINGS panel. */
(function (A) {
  "use strict";
  const Q = A.Quest, GAME = 'arcade-quest';
  const SAVE_VERSION = 2;
  const data = () => A.store.gameData(GAME);
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
    world: null, flags: {}, done: {}, converted: {}});
  /** older saves -> the current version, one step at a time */
  function upgrade(s) {
    if (!s || typeof s !== 'object' || !s.v) return fresh();
    if (s.v === 1) { Object.assign(s, {world: null, flags: {}, done: {}, converted: {}}); s.v = 2; }    // v1 -> v2: Episode 1
    s.flags = s.flags || {}; s.done = s.done || {}; s.converted = s.converted || {};
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
        convertedLeft: f.convertedLeft, maxHp: Q.save.maxHpAt(f.level)});
      s.hp = s.maxHp;
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
    maxHpAt: level => 20 + (level - 1) * 4,
    flag: name => !!(Q.save.get().flags || {})[name],
    setFlag(name, on = true) { const s = Q.save.get(); s.flags = s.flags || {}; if (on) s.flags[name] = true; else delete s.flags[name]; write(); },
    /** manor ghosts helped (befriended or faded), outside the Practice Hall */
    helped: () => Object.keys(Q.save.get().done || {}).length,
  };

  const DEFAULTS = {textSpeed: 'normal', dodge: 'normal', assist: false, tone: 1};
  Q.settings = {
    get() { const d = data(); d.settings = Object.assign({}, DEFAULTS, d.settings || {}); return d.settings; },
    set(patch) { Object.assign(this.get(), patch); write(); },
    /** the SETTINGS panel over the current scene; resolves when closed */
    open() {
      return new Promise(done => {
        const s = this.get();
        const p = Q.el('div', 'q-overlay');
        const seg = (key, opts) => `<div class="q-seg" role="group" data-k="${key}">` +
          opts.map(([v, l]) => `<button type="button" class="q-chip" data-v="${v}" aria-pressed="${String(s[key]) === String(v)}">${l}</button>`).join('') + `</div>`;
        p.innerHTML = `<div class="q-panel q-settings" role="dialog" aria-modal="true" aria-labelledby="qSetT"><h2 id="qSetT">Settings</h2>` +
          `<div class="q-row"><span>Text speed</span>${seg('textSpeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']])}</div>` +
          `<div class="q-row"><span>Dodging</span>${seg('dodge', [['easy', 'Easy'], ['normal', 'Normal']])}</div>` +
          `<div class="q-row"><span>Assist mode</span>${seg('assist', [['false', 'Off'], ['true', 'On']])}<small>On: enemies' sour notes do half damage.</small></div>` +
          `<div class="q-row"><span>Your look</span>${seg('tone', [[0, '<i class="q-tone t0"></i>'], [1, '<i class="q-tone t1"></i>'], [2, '<i class="q-tone t2"></i>'], [3, '<i class="q-tone t3"></i>']])}</div>` +
          `<div class="q-row"><span>Sound &amp; music</span><div class="q-snd" id="qSnd"></div><small>The same settings as the rest of the arcade.</small></div>` +
          `<div class="q-row"><span>Motion</span><small>${Q.reduced() ? 'Reduced motion is on (from your device): no screen shake or flashing.' : 'Screen shake is on. Turn on "reduce motion" on your device to switch it off.'}</small></div>` +
          `<button type="button" class="q-btn q-close">Done</button></div>`;
        Q.ui.appendChild(p);
        if (A.Sfx) A.Sfx.mountControls(p.querySelector('#qSnd'));
        p.querySelectorAll('.q-seg').forEach(g => g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          const k = g.dataset.k, raw = b.dataset.v, v = k === 'assist' ? raw === 'true' : k === 'tone' ? +raw : raw;
          this.set({[k]: v}); Q.sfx('quest-select');
          g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
          if (Q.onSettings) Q.onSettings();
        })));
        const close = () => { off(); p.remove(); done(); };
        const off = Q.input.on(btn => { if (btn === 'b') close(); return true; });   // arrows/Tab move between buttons
        p.querySelector('.q-close').addEventListener('click', close);
        p.querySelector('.q-chip[aria-pressed="true"]').focus();
      });
    },
  };
})(window.Arcade);
