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
   avatar / guestAvatar: Create Your Player's avatars (shared/avatar.js, versioned by their `v`); avatarOffered.
   gameData: {gameId: {...}} holds a game's own extra records (Ancient Ninja Scrolls: mastered terms, exam
   results, spar bests), kept apart from the shared progress shape above.
   endless: {gameId: {instKey: {setKey: [{score, name, date, notes, speed, combo}, … best first, at most 5]}}}:
   ENDLESS MODE's Top 5 (shared/endless.js). Kept apart from `games`, so it never counts as stars.
   activity: {'YYYY-MM-DD': {s, c, g, e, p, f}}: the DAILY ACTIVITY LOG (stars, levels cleared, games, best Endless score,
   plays, games FINISHED: a round played to its end) that seasonal events (shared/seasons.js) and Today's Practice
   (shared/practice.js: `f`) count; the last 400 days.
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
  const CHECKER_MODES = ['five', 'Bb', 'Eb', 'F', 'Ab', 'full', 'art'];
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
    // Scale Audition was renamed Scale Trainer (id 'scale-audition' → 'scale-trainer'): its stars, its gameData
    // (ALL-STATE READY badges, best clean runs, chromatic best times, options), the level select's memory, the lobby's
    // CONTINUE, the activity log and queued leaderboard events move to the new id. On a clash the better value stays.
    // It runs on a restored backup too (importAll calls migrate()), so an old Backup Code lands in the new keys.
    if (!done['scale-trainer-rename']) {
      renameGame('scale-audition', 'scale-trainer', {
        gameData(o, n) {                                      // n wins except where o holds a better record
          const out = Object.assign({}, o, n);
          if (o.ready || n.ready) {                            // ALL-STATE READY per member: kept, the earlier date
            out.ready = Object.assign({}, n.ready || {});
            Object.entries(o.ready || {}).forEach(([m, d]) => { if (!out.ready[m] || d < out.ready[m]) out.ready[m] = d; });
          }
          if (o.practice || n.practice) {                     // best clean run per scale: the faster (tenths)
            out.practice = JSON.parse(JSON.stringify(n.practice || {}));
            Object.entries(o.practice || {}).forEach(([m, sc]) => { const t = out.practice[m] || (out.practice[m] = {}); Object.entries(sc || {}).forEach(([id, v]) => { if (!(t[id] <= v)) t[id] = v; }); });
          }
          if (o.chrom || n.chrom) {                           // the Chromatic Challenge: the faster time, the more stars
            out.chrom = JSON.parse(JSON.stringify(n.chrom || {}));
            Object.entries(o.chrom || {}).forEach(([m, c]) => { const t = out.chrom[m] || (out.chrom[m] = {});
              if (c.t && !(t.t <= c.t)) t.t = c.t; if ((c.stars || 0) > (t.stars || 0)) t.stars = c.stars; });
          }
          return out;
        },
      });
      done['scale-trainer-rename'] = true;
      save();
    }
    // Note Ninja's RARE DIAMOND GEAR now needs the Diamond belt on Chromatic notes in Random order (the key
    // 'note-ninja:random-chromatic': avatar-parts.js NINJA_DIAMOND, skins.js 'diamond'). Before, any note set earned it.
    // A device that met the OLD rule (a star on belt 10 under any Note Ninja key) keeps every piece: each becomes
    // OWNED (data.items.owned, like a bought item), and an owned item stays unlocked and worn. It runs on a restored
    // backup too (importAll calls migrate()), so an old Backup Code keeps its gear. Never edit this list.
    if (!done['ninja-diamond-chromatic']) {
      const had = Object.keys(data.games || {}).some(k => (k === 'note-ninja' || k.startsWith('note-ninja:')) &&
        Object.values(data.games[k] || {}).some(lv => lv && typeof lv === 'object' && lv[10] && lv[10].stars >= 1));
      if (had) {
        const it = data.items || (data.items = {}), own = it.owned || (it.owned = {});
        ['head:diamondband', 'head:belt-diamond', 'plate:belt-diamond', 'bg:bamboomoon', 'skin:diamond'].forEach(k => { own[k] = true; });
      }
      done['ninja-diamond-chromatic'] = true;
      save();
    }
    // The leaderboard's 'play' event went from once a day to once a day PER GAME: the old `day` (the date of the
    // day's one 'play') becomes plays = {day, games: []} (that day's first game may send once more; harmless).
    if (!done['lb-plays-per-game']) {
      const lb = (data.gameData || {}).leaderboard;
      if (lb && 'day' in lb) {
        if (!lb.plays && typeof lb.day === 'string') lb.plays = {day: lb.day, games: []};
        delete lb.day;
      }
      done['lb-plays-per-game'] = true;
      save();
    }
  }
  /** a game's id changed: move everything saved under the old id (and its '<old>:…' progress keys) to the new one.
      games: per instrument and level the more stars and the higher best stay; gameData: merge(old, new) (default: new
      wins, old fills the gaps); the level select's memory ('<old>[:mode]|player|inst'), the lobby's CONTINUE, the
      activity log's games played, queued leaderboard events. */
  function renameGame(OLD, NEW, {gameData: merge} = {}) {
    const moved = k => (k === OLD || k.startsWith(OLD + ':') || k.startsWith(OLD + '|')) ? NEW + k.slice(OLD.length) : null;
    const G = data.games || {};
    Object.keys(G).forEach(k => {
      const nk = moved(k); if (!nk) return;
      const to = G[nk] || (G[nk] = {});
      Object.entries(G[k] || {}).forEach(([inst, lvs]) => {
        const t = to[inst] || (to[inst] = {});
        Object.entries(lvs || {}).forEach(([lv, p]) => {
          const q = t[lv];
          if (!q) { t[lv] = p; return; }
          t[lv] = Object.assign({}, q, {stars: Math.max(q.stars || 0, (p && p.stars) || 0), best: Math.max(q.best || 0, (p && p.best) || 0)});
        });
      });
      delete G[k];
    });
    const GD = data.gameData || {};
    if (GD[OLD]) { GD[NEW] = merge ? merge(GD[OLD], GD[NEW] || {}) : Object.assign({}, GD[OLD], GD[NEW] || {}); delete GD[OLD]; }
    const ls = GD['level-select'];
    if (ls) Object.keys(ls).forEach(k => { const nk = moved(k); if (nk) { if (!(nk in ls)) ls[nk] = ls[k]; delete ls[k]; } });
    if (GD.floor && GD.floor.last === OLD) GD.floor.last = NEW;
    Object.values(data.activity || {}).forEach(a => { if (a && a.g && a.g[OLD]) { a.g[NEW] = 1; delete a.g[OLD]; } });
    const lb = GD.leaderboard;
    if (lb && Array.isArray(lb.queue)) lb.queue.forEach(e => { if (e && e.game === OLD) e.game = NEW; });
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  /* the daily activity log (see store.activity); the caller saves */
  function logActivity({game, stars = 0, cleared = 0, endless = 0, play = 0, finished = 0} = {}) {
    const k = A.store.dayKey();
    const log = data.activity || (data.activity = {}), a = log[k] || (log[k] = {});
    if (finished) { if (game) (a.f || (a.f = {}))[game] = 1; return; }     // a finished round: only `f` (g, p stay as they are)
    if (stars) a.s = (a.s || 0) + stars;
    if (cleared) a.c = (a.c || 0) + cleared;
    if (endless) a.e = Math.max(a.e || 0, endless);
    if (play || stars || cleared || endless) a.p = (a.p || 0) + (play ? 1 : 0);
    if (game) (a.g || (a.g = {}))[game] = 1;
    const keys = Object.keys(log);
    if (keys.length > 400) keys.sort().slice(0, keys.length - 400).forEach(x => { delete log[x]; });
  }

  A.store = {
    /** THE BACKUP (shared/backup.js): everything this device remembers, as a plain object (a deep copy) */
    exportAll() {
      const d = JSON.parse(JSON.stringify(data));
      if (d.gameData) delete d.gameData.mic;           // the microphone's room check + Classroom mode are about THIS device and room (pitch.js ROOM)
      return d;
    },
    /** replace everything with a backup (the caller asks first and reloads the page afterwards) */
    importAll(obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
      const mic = data.gameData && data.gameData.mic;   // this device's own room check stays (never in a backup)
      data = Object.assign({inst: null, player: null, hornStart: 'F', sens: 50, sfx: true, ambience: false, checkerMode: 'five', members: {}, modes: {}, games: {}}, obj);
      if (data.gameData) delete data.gameData.mic;
      if (mic) (data.gameData || (data.gameData = {})).mic = mic;
      migrate(); save(); return true;
    },
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
    /** volumes 0–1 (shared/sfx.js's speaker button): effects (default 0.6), the lobby ambience (default 0.3, 0 = off),
        and the Select Player music (musVol, below) */
    get sfxVol() { return typeof data.sfxVol === 'number' ? data.sfxVol : 0.6; },
    get ambVol() { return typeof data.ambVol === 'number' ? data.ambVol : 0.3; },
    /** the character-select music on Select Player (default 0.4, 0 = off) */
    get musVol() { return typeof data.musVol === 'number' ? data.musVol : 0.4; },
    setVolume(k, v) { if (k === 'sfxVol' || k === 'ambVol' || k === 'musVol') { data[k] = Math.max(0, Math.min(1, +v || 0)); save(); } },
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
    /** save a level's progress. run = the stars THIS play earned (games pass it: p.stars is the best ever), which the
        daily activity log counts for seasonal events (shared/seasons.js); left out = the new best stars only */
    setLevel(gameId, instId, lvl, p, run) {
      const old = this.levels(gameId, instId)[lvl];
      this.levels(gameId, instId)[lvl] = p;
      const got = run != null ? run : Math.max(0, ((p && p.stars) || 0) - ((old && old.stars) || 0));
      logActivity({game: gameId.split(':')[0], stars: got, cleared: got > 0 ? 1 : 0});
      save();
      // the leaderboard (shared/leaderboard.js): only the INCREASE of this level's best stars
      const gain = ((p && p.stars) || 0) - ((old && old.stars) || 0);
      if (gain > 0 && A.Leaderboard) A.Leaderboard.stars(gameId.split(':')[0], lvl, gain);
    },
    /** THE DAILY ACTIVITY LOG (seasonal events count only what happens inside their dates):
        {'YYYY-MM-DD': {s: stars earned, c: levels cleared, g: {gameId: 1} (games played), e: best Endless score,
        p: plays, f: {gameId: 1} (a round FINISHED today: Today's Practice, shared/practice.js)}}, the last 400 days, in
        the Arcade Backup Code. note({game, play, endless}) adds to today. */
    get activity() { return JSON.parse(JSON.stringify(data.activity || {})); },
    noteActivity(o) { logActivity(o); save(); if (o && o.play && o.game && A.Leaderboard) A.Leaderboard.play(o.game); },
    /** one day's entry of the log (a copy; {} when nothing happened). key: 'YYYY-MM-DD', default today */
    activityOn(key) { return JSON.parse(JSON.stringify((data.activity || {})[key || this.dayKey()] || {})); },
    /** a round of this game was played to its END today (a results screen, a battle won or lost, a night survived…):
        the log's `f` (Today's Practice checks a step off with it). Saved only the first time each day. */
    noteFinished(gameId) {
      const game = String(gameId || '').split(':')[0];
      if (!game) return;
      const a = (data.activity || {})[this.dayKey()];
      if (a && a.f && a.f[game]) return;
      logActivity({game, finished: 1}); save();
    },
    /** 'YYYY-MM-DD' of a date (default today(), so ?demo&today= counts), in the device's own time */
    dayKey(d) { d = d || this.today(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; },
    /** read the saved data again (another tab, or this page kept in memory by the Back button, may have saved since).
        Only pages that keep no saved objects of their own between calls may use it (the floor page: shared/practice.js). */
    reload() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) data = Object.assign({inst: null, player: null, hornStart: 'F', sens: 50, sfx: true, ambience: false, checkerMode: 'five', members: {}, modes: {}, games: {}}, JSON.parse(raw));
      } catch (e) { /* blocked storage: keep what's in memory */ }
    },
    /** today's date (the device's; ?demo&today=YYYY-MM-DD pretends another day, for testing) */
    today() {
      const t = A.DEMO && A.params && /^\d{4}-\d{2}-\d{2}$/.test(A.params.get('today') || '') ? A.params.get('today').split('-').map(Number) : null;
      if (!t) return new Date();
      const n = new Date(); return new Date(t[0], t[1] - 1, t[2], n.getHours(), n.getMinutes(), n.getSeconds());
    },
    /** true once any level of this game key has been played by this instrument */
    hasProgress(gameId, instId) {
      const lv = (data.games[gameId] || {})[instId] || {};
      return Object.values(lv).some(p => p && (p.stars > 0 || p.best > 0));
    },
    /** a game's own extra saved object (created on demand); change it, then call saveGameData(gameId) */
    gameData(gameId) { const g = data.gameData || (data.gameData = {}); return g[gameId] || (g[gameId] = {}); },
    /** read a game's saved object without creating it (null = nothing saved): pitch.js reads the room check every frame */
    peekGameData(gameId) { return (data.gameData && data.gameData[gameId]) || null; },
    saveGameData() { save(); },
    /** ENDLESS MODE: the Top 5 for a game + instrument + note set (a copy, best first) */
    endlessTop(gameId, instKey, setKey) {
      const e = ((data.endless || {})[gameId] || {})[instKey] || {};
      return (e[setKey] || []).map(x => Object.assign({}, x));
    },
    /** every Endless Top 5 of one game: {instKey: {setKey: [runs]}} (a copy) */
    endlessRuns(gameId) { return JSON.parse(JSON.stringify(((data.endless || {})[gameId]) || {})); },
    /** add a finished run; keeps the best 5. Returns its place (0 = #1) or -1 if it didn't make the Top 5 */
    addEndless(gameId, instKey, setKey, entry) {
      const all = data.endless || (data.endless = {}), g = all[gameId] || (all[gameId] = {}), i = g[instKey] || (g[instKey] = {});
      const list = (i[setKey] || []).slice();
      logActivity({game: gameId, endless: entry.score});
      if (A.Leaderboard) A.Leaderboard.endless(gameId, entry.score);   // sent only if it beats this week's best here
      let at = list.findIndex(x => entry.score > x.score);
      if (at < 0) at = list.length;
      if (at >= 5) { save(); return -1; }
      list.splice(at, 0, entry);
      i[setKey] = list.slice(0, 5);
      save();
      return at;
    },
    /** THE STAR TOTAL: every star for one instrument across EVERY progress key (all NOTES × ORDER combinations,
        Chime Heist's modes, Button Masher's rivals…), for one game (gameId) or, without it, for all games.
        instrument: a member id ('trumpet': its group(s) for group-keyed games, the member for byMember games
        like Button Masher) or a player id a game saves under directly ('bells', 'all'). Every key that starts with
        '<gameId>:' counts for that game, so Showtime Malfunction's NIGHTMARE keys (':extra') are included. */
    allStars(instrument, gameId) {
      if (instrument === '*') {                   // DEVICE-WIDE: every instrument, every game, every mode
        let n = 0;
        Object.keys(data.games || {}).forEach(k => {
          if (gameId && k.split(':')[0] !== gameId) return;
          Object.keys(data.games[k] || {}).forEach(i => { n += this.totalStars(k, i); });
        });
        return n;
      }
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
        game: '<gameId>' and '<gameId>:…'). Used by skin achievements ("clear The Golden Vault"). suffix: only keys
        ending in it (Showtime Malfunction's NIGHTMARE keys end in ':extra'). exact: only the plain '<gameId>' key
        (Scale Trainer's Middle School levels; its high school sections save under 'scale-trainer:cb' / ':sb'), or with
        a full key as gameId only that key (a rule's `key`: 'note-ninja:random-chromatic' = Note Ninja's rare gear). */
    bestLevelStars(gameId, lvl, suffix, exact) {
      let best = 0;
      Object.keys(data.games || {}).forEach(k => {
        if (k !== gameId && (exact || k.indexOf(gameId + ':') !== 0)) return;
        if (suffix && k.slice(-suffix.length) !== suffix) return;
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
    /** CREATE YOUR PLAYER (shared/avatar.js): the device's avatar ({v, skin, face, hair, … name}), or null before the
        first visit; the Neon Face-Off GUEST (Player 2), kept apart so it never replaces the device's own */
    get avatar() { return data.avatar && typeof data.avatar === 'object' ? JSON.parse(JSON.stringify(data.avatar)) : null; },
    setAvatar(av) { data.avatar = av; save(); },
    get guestAvatar() { return data.guestAvatar && typeof data.guestAvatar === 'object' ? JSON.parse(JSON.stringify(data.guestAvatar)) : null; },
    setGuestAvatar(av) { data.guestAvatar = av; save(); },
    /** AVATAR ITEMS (shared/avatar.js): items bought at the Token Booth ({'<field>:<id>': true}, owned forever,
        everywhere; also earned items kept by a migration, and 'skin:<id>' for a kept color skin) and earned items
        whose UNLOCKED! card was already shown */
    get ownedItems() { return Object.assign({}, (data.items || {}).owned); },
    ownItem(key) { const it = data.items || (data.items = {}); (it.owned || (it.owned = {}))[key] = true; save(); },
    get itemsSeen() { return Object.assign({}, (data.items || {}).seen); },
    markItemsSeen(keys) { const it = data.items || (data.items = {}), s = it.seen || (it.seen = {}); keys.forEach(k => { s[k] = true; }); save(); },
    /** Select Player asks "Create your player?" once per device */
    get avatarOffered() { return !!data.avatarOffered; },
    setAvatarOffered() { data.avatarOffered = true; save(); },
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
