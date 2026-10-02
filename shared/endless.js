/* ENDLESS MODE, shared by Note Storm, Note Ninja, Showtime Malfunction (THE ENCORE) and others: play until the last heart is gone while the speed keeps rising.
   Each game keeps its own SETTINGS block (the speed curve and what the speed changes) in its levels.js; this file
   has what both share:
     Arcade.Endless.speed(C, t)      the speed after t seconds of a run:
                                     C.start + (C.max − C.start) × (1 − e^(−t / C.k)) + C.creep × t
                                     (rises fast through the easy range, then slower, but never stops rising)
     Arcade.Endless.mult(combo)      the combo multiplier: ×2 at 10 in a row, ×3 at 25, ×4 at 50 (COMBO below)
     Arcade.Endless.instKey(inst, member), setKey(pickerState)   where a run's Top 5 lives: game + instrument + note set
     Arcade.Endless.top(gameId, instKey, setKey)                 the Top 5 (Arcade.store.endlessTop)
     Arcade.Endless.tile(el, {gameId, instKey, setKey, label, blurb, onPlay})   the ENDLESS card on the level screen
     Arcade.Endless.gameOver({gameId, instKey, setKey, run, onAgain, onBack, backLabel, title, kicker, sounds, againLabel, onShow})
                                     the GAME OVER panel: saves the run (never in ?demo: "Demo run — score not
                                     saved"), shows the Top 5. run = {score, notes, speed, combo, stats?}: stats =
                                     [[label, value], …] replaces the four standard boxes (Lost Signal: longest signal,
                                     score, rounds); sounds = {over, top} replaces endless-game-over/-high-score;
                                     againLabel = the Play again button's words; onShow(panel) = the results kit's hook
                                     (Showtime Malfunction: the rebooted band below the title).
     Arcade.Endless.hearts(lives, max)   the HUD's hearts
     Arcade.Endless.flash(el, text)      the short "SPEED UP!" banner (one gentle fade in and out, never a strobe)
   Endless gives no stars: runs are saved in Arcade.store `endless` (storage.js), never in `games`, so they never
   count toward star totals or unlocks. They are part of the Arcade Backup Code (it saves the whole store).
   Sounds (shared/sounds.js, screen 'endless'): endless-start, speed-up, endless-life-lost, endless-game-over,
   endless-high-score. Loaded after storage.js, ui.js, avatar.js and sfx.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const COMBO = [[50, 4], [25, 3], [10, 2]];          // [in a row, multiplier], biggest first
  const TOP = 5;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  const E = A.Endless = {
    COMBO,
    /** set true only while testing: lets ?demo runs save their scores (off for students) */
    saveInDemo: false,
    speed(C, t) { return C.start + (C.max - C.start) * (1 - Math.exp(-t / C.k)) + C.creep * t; },
    mult(combo) { const s = COMBO.find(([n]) => combo >= n); return s ? s[1] : 1; },
    /** the instrument part of the key: the member ('trumpet'); Horn adds its group, since F–C and C–G read different notes */
    instKey(inst, member) {
      if (!member) return inst.id;
      return A.groupsOf && A.groupsOf(member.id).length > 1 ? member.id + '.' + inst.id : member.id;
    },
    /** the note set: NOTES × ORDER from the mode picker ('first5-random', 'Eb-order', 'chrom-random'…) */
    setKey(st) { return st.notes + '-' + st.order; },
    top(gameId, instKey, setKey) { return A.store.endlessTop(gameId, instKey, setKey); },
    playerName() {
      try { const n = A.Avatar && A.Avatar.nameOf(A.Avatar.get()); if (n && n.trim()) return n.trim(); } catch (e) {}
      return 'Player';
    },
    hearts(lives, max) {
      return [...Array(max)].map((_, i) => `<span class="${i < lives ? 'on' : ''}">♥</span>`).join('');
    },
    /** the Top 5 as a list; hi = the index to highlight (this run), else every entry with this device's player name */
    listHTML(list, hi) {
      if (!list.length) return '<p class="ed-empty">No scores yet. Be the first!</p>';
      const me = E.playerName();
      return '<ol class="ed-top">' + list.map((x, i) => {
        const mine = hi != null ? i === hi : x.name === me;
        return `<li class="${mine ? 'me' : ''}"><span class="ed-rank">${i + 1}</span><span class="ed-name">${x.plate && /^[a-z-]+$/.test(x.plate) ? `<span class="av-plate av-plate-${x.plate}">${esc(x.name || 'Player')}</span>` : esc(x.name || 'Player')}</span>` +
          `<span class="ed-score">${Number(x.score).toLocaleString()}</span><span class="ed-date">${esc(dateText(x.date))}</span></li>`;
      }).join('') + '</ol>';
    },
    /** the ENDLESS card on a level screen: always unlocked, the Top 5 for this instrument + note set */
    tile(el, {gameId, instKey, setKey, label, blurb, onPlay, title}) {
      const list = E.top(gameId, instKey, setKey);
      el.innerHTML = `<section class="ed-tile" aria-labelledby="edTileTitle">
        <div class="ed-tile-main">
          <span class="ed-inf" aria-hidden="true">∞</span>
          <div><h2 class="ed-title" id="edTileTitle">${esc(title || 'Endless')}</h2>
            <p class="ed-blurb">${esc(blurb)}</p>
            <p class="ed-set">${esc(label)}</p></div>
          <button type="button" class="btn btn-primary ed-go">Play Endless</button>
        </div>
        <div class="ed-tile-top"><p class="ed-top-h">Top 5 on this device</p>${E.listHTML(list)}</div>
      </section>`;
      el.querySelector('.ed-go').addEventListener('click', onPlay);
    },
    flash(el, text) {
      if (!el) return;
      el.textContent = text;
      el.classList.remove('go'); void el.getBoundingClientRect(); el.classList.add('go');
    },
    /** GAME OVER: save the run (not in ?demo), show the stats and the Top 5, play the sounds. Returns its place (0 = #1, -1 = none). */
    gameOver({gameId, instKey, setKey, run, onAgain, onBack, backLabel, title, kicker, sounds, againLabel, onShow}) {
      const demo = A.DEMO && !E.saveInDemo;
      const before = E.top(gameId, instKey, setKey);
      const av = A.Avatar && A.store.avatar ? A.Avatar.get() : null;
      const entry = {score: Math.round(run.score), name: E.playerName(), date: today(), notes: run.notes, speed: +(+run.speed || 0).toFixed(1), combo: run.combo,
        plate: av && av.plate !== 'none' ? av.plate : undefined};      // the player's name plate (shown around the name in the Top 5)
      let rank = -1, list = before;
      if (demo) {                                   // where it WOULD have placed, without saving it
        const at = before.findIndex(x => entry.score > x.score);
        rank = at < 0 ? (before.length < TOP ? before.length : -1) : at;
      } else if (entry.score > 0) {
        const best = A.store.gameData('endless-best');                 // the longest run ever (avatar item goals: shared/skins.js)
        if ((+run.notes || 0) > (best[gameId] || 0)) { best[gameId] = +run.notes; A.store.saveGameData('endless-best'); }
        rank = A.store.addEndless(gameId, instKey, setKey, entry);
        list = E.top(gameId, instKey, setKey);
      }
      const newTop = rank === 0 && entry.score > 0;
      const stats = run.stats || [['Score', entry.score.toLocaleString()], ['Notes cleared', run.notes],
        ['Top speed', (+run.speed || 0).toFixed(1)], ['Longest combo', run.combo]];
      // THE RESULTS SCREEN (shared/ui-kit.js): no stars; the new place as the NEW BEST ribbon; the Top 5 as the extra
      const placed = !demo && rank >= 0 && entry.score > 0;
      A.UI.results.show({gameId, theme: 'ed-over', stars: null, kicker: '∞ ' + (kicker || 'Endless'), title: title || 'Game Over',
        newBest: placed, newBestText: !placed ? '' : newTop ? (before.length ? 'New high score!' : 'First high score!') : `#${rank + 1} on your Top 5!`,
        tiles: stats,
        extra: (demo ? '<p class="ed-demo">Demo run — score not saved</p>' : '') + '<p class="ed-top-h">Top 5 on this device</p>' +
          `<div class="ed-list">${E.listHTML(demo ? before : list, demo ? null : (rank >= 0 ? rank : null))}</div>`,
        onShow,
        retry: {label: againLabel || 'Play again', onClick: () => { A.UI.results.hide(); onAgain(); }},
        levels: {label: backLabel || 'Levels', onClick: () => { A.UI.results.hide(); onBack(); }}});
      const snd = Object.assign({over: 'endless-game-over', top: 'endless-high-score'}, sounds);
      A.Sfx.sequence([snd.over, newTop && !demo && snd.top]);
      return rank;
    },
  };

  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function dateText(iso) {
    const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || '');
    if (!m) return '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}); } catch (e) { return iso; }
  }

})(window.Arcade);
