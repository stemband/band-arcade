/* Band Arcade — saved settings and progress (this device only, via localStorage).
   Shape:
     { inst: 'alto', sens: 50, sfx: true, ambience: false,
       checkerMode: 'five', members: {bb: 'clarinet'}, modes: {'ghost-notes': {mode: 'scales', scale: 'Eb'}},
       games: { 'ghost-notes': { alto: { 1:{stars:3,best:1480}, 2:{...} } },
                'ghost-notes:scale-Eb': { alto: { 1:{stars:2,best:900} } } } }
   Games store progress per instrument, per level, as {stars, best}. The arcade home
   page reads that shape to show star totals, so new games should use it too.
   SCALES mode saves each scale under its own game key, '<gameId>:scale-<scaleId>' (Arcade.Scales.progressKey),
   with the same shape; RANDOM NOTES mode keeps the plain game id, so existing stars never move. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const KEY = 'bandarcade.v1';
  const CHECKER_MODES = ['five', 'Bb', 'Eb', 'F', 'Ab', 'full'];
  let data = {inst: null, sens: 50, sfx: true, ambience: false, checkerMode: 'five', members: {}, modes: {}, games: {}};

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
  } catch (e) { /* private mode or blocked storage: everything still works, it just won't remember */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  A.store = {
    get instId() { return data.inst; },
    setInstId(id) { data.inst = id; save(); },
    get sens() { return data.sens; },
    setSens(v) { data.sens = v; save(); },
    /** sound on the arcade floor and Select Player only (shared/sfx.js); games stay silent */
    get sfx() { return data.sfx !== false; },
    setSfx(on) { data.sfx = !!on; save(); },
    get ambience() { return data.ambience === true; },
    setAmbience(on) { data.ambience = !!on; save(); },
    /** Note Checker: 'five' (first five notes), 'full' (chromatic, full range) or a scale id ('Bb', 'Eb', 'F', 'Ab') */
    get checkerMode() { return CHECKER_MODES.includes(data.checkerMode) ? data.checkerMode : 'five'; },
    setCheckerMode(m) { data.checkerMode = CHECKER_MODES.includes(m) ? m : 'five'; save(); },
    /** a game's RANDOM NOTES / SCALES choice: {mode: 'random'|'scales', scale: 'Bb'|'Eb'|'F'|'Ab'|'chrom'} */
    gameMode(gameId) { return Object.assign({mode: 'random', scale: 'Bb'}, (data.modes || {})[gameId]); },
    setGameMode(gameId, patch) { data.modes = Object.assign({}, data.modes, {[gameId]: Object.assign(this.gameMode(gameId), patch)}); save(); },
    /** which instrument in a player group this student plays (e.g. bb -> 'clarinet'); for full range only */
    memberFor(groupId) { return (data.members || {})[groupId] || null; },
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
})(window.Arcade);
