/* Band Arcade — saved settings and progress (this device only, via localStorage).
   Shape:
     { inst: 'alto', sens: 50, sfx: true, ambience: false,
       checkerMode: 'five', members: {bb: 'clarinet'}, modes: {'ghost-notes': {mode: 'scales', scale: 'Eb'}},
       games: { 'ghost-notes': { alto: { 1:{stars:3,best:1480}, 2:{...} } },
                'ghost-notes:scale-Eb': { alto: { 1:{stars:2,best:900} } } } }
   Games store progress per instrument, per level, as {stars, best}. The arcade home
   page reads that shape to show star totals, so new games should use it too.
   Note-reading games save each NOTES × ORDER combination under its own key (Arcade.progressKey, sequences.js):
   First 5 + Random keeps the plain game id and scales in order keep '<gameId>:scale-<id>', so old stars never move.
   allStars() adds every key up.
   skins: {equipped: {memberId: {color, acc}}, seen: {memberId | '*': {skinId: true}}} (shared/skins.js).
   gameData: {gameId: {...}} holds a game's own extra records (Ancient Ninja Scrolls: mastered terms, exam
   results, spar bests), kept apart from the shared progress shape above.
   migrated: {name: true} records one-time progress moves (see migrate()), e.g. Note Ninja's 8 → 10 belts.
   THE PLAYER: `player` is the saved INSTRUMENT MEMBER ('trumpet', 'oboe', 'horn'…, Arcade.PLAYERS), chosen on
   Select Player. `inst` is kept as its player GROUP (Arcade.groupFor), which is what every game saves progress
   under, so stars saved before members existed never move. `hornStart` ('F' | 'C') picks the horn's group.
   `pending` (after the members migration): a group whose exact instrument the student must still pick
   ({group: 'bb'}), or {reason: 'tonebells'}; Select Player shows it and clears it. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const KEY = 'bandarcade.v1';
  const CHECKER_MODES = ['five', 'Bb', 'Eb', 'F', 'Ab', 'full'];
  let data = {inst: null, player: null, hornStart: 'F', sens: 50, sfx: true, ambience: false, checkerMode: 'five', members: {}, modes: {}, games: {}};

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign(data, JSON.parse(raw));
    // one-time move of progress from the single-file Ghost Notes (v1)
    const old = localStorage.getItem('ghostnotes.v1');
    if (old && !data.games['ghost-notes']) {
      const o = JSON.parse(old);
      data.games['ghost-notes'] = o.prog || {};
      data.inst = data.inst || o.inst || null;
      if (typeof o.sens === 'number') data.sens = o.sens;
      save();
    }
    migrate();
  } catch (e) { /* private mode or blocked storage: everything still works, it just won't remember */ }

  /* one-time moves of saved progress, each remembered in data.migrated so it never runs twice */
  function migrate() {
    const done = data.migrated || (data.migrated = {});
    // Note Ninja went from 8 belts to 10 (Red added before Brown, Diamond after Black): old belt 8 (Black)
    // becomes 9, old 7 (Brown) becomes 8; 7 (Red) and 10 (Diamond) start empty. Every Note Ninja key
    // (random 'note-ninja', 'note-ninja:scale-…') and every instrument.
    if (!done['ninja-10-belts']) {
      Object.keys(data.games || {}).filter(k => k === 'note-ninja' || k.startsWith('note-ninja:')).forEach(k => {
        Object.values(data.games[k] || {}).forEach(lv => {
          if (!lv || typeof lv !== 'object') return;
          [[8, 9], [7, 8]].forEach(([from, to]) => { if (lv[from]) lv[to] = lv[from]; else delete lv[to]; delete lv[from]; });
        });
      });
      done['ninja-10-belts'] = true;
      save();
    }
    // One tile per instrument: the saved choice becomes a MEMBER. A group with one member maps straight to it
    // (hornF / hornC -> horn, with the matching starting notes); a group with several uses the member the student
    // already picked for "Which instrument do you play?"; otherwise Select Player asks for the exact instrument.
    // Colored Tone Bells is gone: those students choose again.
    if (!done['players-v1']) {
      const g = data.inst && A.getInstrument(data.inst), picked = (data.members || {})[data.inst];
      if (!data.player && g) {
        if (g.id === 'hornF' || g.id === 'hornC') { data.player = 'horn'; data.hornStart = g.id === 'hornC' ? 'C' : 'F'; }
        else if (picked === 'tonebells') { data.pending = {reason: 'tonebells'}; data.inst = null; }
        else if (picked && g.members.some(m => m.id === picked)) data.player = picked;
        else if (g.members.length === 1) data.player = g.members[0].id;
        else data.pending = {group: g.id};                 // keep data.inst, so the old group's stars still show meanwhile
      }
      Object.keys(data.members || {}).forEach(k => { if (data.members[k] === 'tonebells') delete data.members[k]; });
      done['players-v1'] = true;
      save();
    }
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  A.store = {
    /** the saved player GROUP id (what games save progress under), from the saved member */
    get instId() { const g = data.player && A.groupFor(data.player, {hornStart: data.hornStart}); return g ? g.id : (data.pending && data.pending.group ? null : data.inst); },
    /** the saved instrument MEMBER id ('trumpet'…), or null */
    get player() { return data.player && A.memberById(data.player) ? data.player : null; },
    /** save the player (a member id); its group follows (Arcade.groupFor) */
    setPlayer(id) {
      if (!A.memberById(id)) return;
      data.player = id; data.pending = null;
      const g = A.groupFor(id, {hornStart: data.hornStart}); data.inst = g.id;
      data.members = Object.assign({}, data.members, {[g.id]: id});
      save();
    },
    /** horn: 'F' (F G A B♭ C, group hornF) or 'C' (C D E F G, group hornC) */
    get hornStart() { return data.hornStart === 'C' ? 'C' : 'F'; },
    setHornStart(v) { data.hornStart = v === 'C' ? 'C' : 'F'; if (data.player === 'horn') data.inst = A.groupFor('horn', {hornStart: data.hornStart}).id; save(); },
    /** Player 2 for two-player games (Neon Face-Off): the last opponent, a member id or 'cpu'. Never touches
        the saved player. Its own horn Starting notes: opponentHornStart. */
    get opponent() { const o = data.opponent; return o === 'cpu' || (o && A.memberById(o)) ? o : null; },
    setOpponent(id) { data.opponent = id === 'cpu' || A.memberById(id) ? id : null; save(); },
    get opponentHornStart() { return data.opponentHornStart === 'C' ? 'C' : 'F'; },
    setOpponentHornStart(v) { data.opponentHornStart = v === 'C' ? 'C' : 'F'; save(); },
    /** after the members migration: {group} to pick an exact instrument from, {reason: 'tonebells'}, or null */
    get pending() { return data.pending || null; },
    /** old: saves a GROUP directly. Kept for old links/tests; prefer setPlayer(member id) */
    setInstId(id) { data.inst = id; const g = A.getInstrument(id); if (g && g.members.length === 1) data.player = g.members[0].id; save(); },
    get sens() { return data.sens; },
    setSens(v) { data.sens = v; save(); },
    /** SOUND ON/OFF for the whole arcade (shared/sfx.js) */
    get sfx() { return data.sfx !== false; },
    setSfx(on) { data.sfx = !!on; save(); },
    /** volumes 0–1 (shared/sfx.js's speaker button): effects (default 0.6) and the lobby ambience (default 0.3, 0 = off) */
    get sfxVol() { return typeof data.sfxVol === 'number' ? data.sfxVol : 0.6; },
    get ambVol() { return typeof data.ambVol === 'number' ? data.ambVol : 0.3; },
    setVolume(k, v) { if (k === 'sfxVol' || k === 'ambVol') { data[k] = Math.max(0, Math.min(1, +v || 0)); save(); } },
    /** the lobby ambience is on (its volume is above 0) */
    get ambience() { return this.ambVol > 0; },
    setAmbience(on) { data.ambVol = on ? (this.ambVol || 0.3) : 0; save(); },
    /** Note Checker: 'five' (first five notes), 'full' (chromatic, full range) or a scale id ('Bb', 'Eb', 'F', 'Ab') */
    get checkerMode() { return CHECKER_MODES.includes(data.checkerMode) ? data.checkerMode : 'five'; },
    setCheckerMode(m) { data.checkerMode = CHECKER_MODES.includes(m) ? m : 'five'; save(); },
    /** a note-reading game's NOTES × ORDER choice (shared/mode-picker.js): {notes: 'first5'|'Bb'|'Eb'|'F'|'Ab'|'chrom',
        order: 'random'|'order'}. A choice saved by the older RANDOM NOTES / SCALES picker is read the same way:
        random -> First 5 + Random, scales + X -> X + Scale Order, Chime Heist's full -> Chromatic + Random,
        its chrom -> Chromatic + Scale Order. */
    noteMode(gameId) {
      const m = (data.modes || {})[gameId] || {};
      if (m.notes) return {notes: m.notes, order: m.order === 'order' ? 'order' : 'random'};
      if (m.mode === 'scales') return {notes: m.scale || 'Bb', order: 'order'};
      if (m.mode === 'full') return {notes: 'chrom', order: 'random'};
      if (m.mode === 'chrom') return {notes: 'chrom', order: 'order'};
      return {notes: 'first5', order: 'random'};
    },
    setNoteMode(gameId, patch) { data.modes = Object.assign({}, data.modes, {[gameId]: Object.assign(this.noteMode(gameId), patch)}); save(); },
    /** which instrument in a player group this student plays (e.g. bb -> 'clarinet'); for full range only */
    memberFor(groupId) {
      if (data.player && A.groupsOf(data.player).some(g => g.id === groupId)) return data.player;   // the player IS the answer
      return (data.members || {})[groupId] || null;
    },
    setMember(groupId, id) { data.members = Object.assign({}, data.members, {[groupId]: id}); save(); },
    /** progress object for one game + instrument (created on demand) */
    levels(gameId, instId) {
      const g = data.games[gameId] || (data.games[gameId] = {});
      return g[instId] || (g[instId] = {});
    },
    level(gameId, instId, lvl) { return this.levels(gameId, instId)[lvl] || {stars: 0, best: 0}; },
    setLevel(gameId, instId, lvl, p) { this.levels(gameId, instId)[lvl] = p; save(); },
    /** true once any level of this game key has been played by this instrument */
    hasProgress(gameId, instId) {
      const lv = (data.games[gameId] || {})[instId] || {};
      return Object.values(lv).some(p => p && (p.stars > 0 || p.best > 0));
    },
    /** a game's own extra saved object (created on demand); change it, then call saveGameData(gameId) */
    gameData(gameId) { const g = data.gameData || (data.gameData = {}); return g[gameId] || (g[gameId] = {}); },
    saveGameData() { save(); },
    /** THE STAR TOTAL: every star for one instrument across EVERY progress key (all NOTES × ORDER combinations,
        Chime Heist's modes, Button Masher's rivals…), for one game (gameId) or, without it, for all games.
        instrument: a member id ('trumpet': its group(s) for group-keyed games, the member for byMember games
        like Button Masher) or a player id a game saves under directly ('bells', 'all'). */
    allStars(instrument, gameId) {
      const isMember = !!A.memberById(instrument);
      const groups = isMember ? A.groupsOf(instrument).map(g => g.id) : [instrument];
      let n = 0;
      Object.keys(data.games || {}).forEach(k => {
        const game = k.split(':')[0];
        if (gameId && game !== gameId) return;
        const byMember = (A.GAMES || []).some(g => g.byMember && g.id === game);
        (byMember && isMember ? [instrument] : groups).forEach(i => { n += this.totalStars(k, i); });
      });
      return n;
    },
    starsForPlayer(memberId) { return this.allStars(memberId); },
    /** the most stars any instrument has earned on one level of a game, in ANY mode (every progress key of that
        game: '<gameId>' and '<gameId>:…'). Used by skin achievements ("clear The Golden Vault"). */
    bestLevelStars(gameId, lvl) {
      let best = 0;
      Object.keys(data.games || {}).forEach(k => {
        if (k !== gameId && k.indexOf(gameId + ':') !== 0) return;
        Object.values(data.games[k] || {}).forEach(lv => { const p = lv && lv[lvl]; if (p && p.stars > best) best = p.stars; });
      });
      return best;
    },
    /** SKINS (shared/skins.js): the equipped color skin + accessory for one instrument member on this device */
    skin(memberId) { const e = ((data.skins || {}).equipped || {})[memberId] || {}; return {color: e.color || 'classic', acc: e.acc || null}; },
    setSkin(memberId, patch) {
      const sk = data.skins || (data.skins = {}), eq = sk.equipped || (sk.equipped = {});
      eq[memberId] = Object.assign(this.skin(memberId), patch); save();
    },
    /** skins whose UNLOCKED! card was already shown: key = a member id (star milestones) or '*' (achievements) */
    skinsSeen(key) { return Object.assign({}, ((data.skins || {}).seen || {})[key]); },
    markSkinsSeen(key, ids) {
      const sk = data.skins || (data.skins = {}), seen = sk.seen || (sk.seen = {}), s = seen[key] || (seen[key] = {});
      ids.forEach(id => { s[id] = true; }); save();
    },
    totalStars(gameId, instId) {
      const lv = (data.games[gameId] || {})[instId] || {};
      return Object.values(lv).reduce((s, p) => s + (p.stars || 0), 0);
    },
  };

  /* URL flags shared by every page */
  A.params = new URLSearchParams(location.search);
  A.DEMO = A.params.has('demo');     // keys 1–5 fake the five notes; all levels unlocked
  /** build a link that keeps ?demo (and any other flags) */
  A.link = path => path + location.search;
  A.currentInstrument = () => A.getInstrument(A.store.instId);
  /** the saved instrument member ({id, name, short, …}), or null */
  A.currentMember = () => A.store.player ? A.getMember(A.currentInstrument(), A.store.player) : null;
})(window.Arcade);
