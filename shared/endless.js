/* ENDLESS MODE, shared by Note Storm and Note Ninja: play until the last heart is gone while the speed keeps rising.
   Each game keeps its own SETTINGS block (the speed curve and what the speed changes) in its levels.js; this file
   has what both share:
     Arcade.Endless.speed(C, t)      the speed after t seconds of a run:
                                     C.start + (C.max − C.start) × (1 − e^(−t / C.k)) + C.creep × t
                                     (rises fast through the easy range, then slower, but never stops rising)
     Arcade.Endless.mult(combo)      the combo multiplier: ×2 at 10 in a row, ×3 at 25, ×4 at 50 (COMBO below)
     Arcade.Endless.instKey(inst, member), setKey(pickerState)   where a run's Top 5 lives: game + instrument + note set
     Arcade.Endless.top(gameId, instKey, setKey)                 the Top 5 (Arcade.store.endlessTop)
     Arcade.Endless.tile(el, {gameId, instKey, setKey, label, blurb, onPlay})   the ENDLESS card on the level screen
     Arcade.Endless.gameOver({gameId, instKey, setKey, run, onAgain, onBack, backLabel})   the GAME OVER panel:
                                     saves the run (never in ?demo: "Demo run — score not saved"), shows the Top 5
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
        return `<li class="${mine ? 'me' : ''}"><span class="ed-rank">${i + 1}</span><span class="ed-name">${esc(x.name || 'Player')}</span>` +
          `<span class="ed-score">${Number(x.score).toLocaleString()}</span><span class="ed-date">${esc(dateText(x.date))}</span></li>`;
      }).join('') + '</ol>';
    },
    /** the ENDLESS card on a level screen: always unlocked, the Top 5 for this instrument + note set */
    tile(el, {gameId, instKey, setKey, label, blurb, onPlay}) {
      const list = E.top(gameId, instKey, setKey);
      el.innerHTML = `<section class="ed-tile" aria-labelledby="edTileTitle">
        <div class="ed-tile-main">
          <span class="ed-inf" aria-hidden="true">∞</span>
          <div><h2 class="ed-title" id="edTileTitle">Endless</h2>
            <p class="ed-blurb">${esc(blurb)}</p>
            <p class="ed-set">${esc(label)}</p></div>
          <button type="button" class="btn btn-gold ed-go">Play Endless</button>
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
    gameOver({gameId, instKey, setKey, run, onAgain, onBack, backLabel}) {
      const demo = A.DEMO && !E.saveInDemo;
      const before = E.top(gameId, instKey, setKey);
      const entry = {score: Math.round(run.score), name: E.playerName(), date: today(), notes: run.notes, speed: +run.speed.toFixed(1), combo: run.combo};
      let rank = -1, list = before;
      if (demo) {                                   // where it WOULD have placed, without saving it
        const at = before.findIndex(x => entry.score > x.score);
        rank = at < 0 ? (before.length < TOP ? before.length : -1) : at;
      } else if (entry.score > 0) {
        rank = A.store.addEndless(gameId, instKey, setKey, entry);
        list = E.top(gameId, instKey, setKey);
      }
      const newTop = rank === 0 && entry.score > 0;
      const ov = overlay();
      ov.querySelector('.ed-new').hidden = demo || !(rank >= 0 && entry.score > 0);
      ov.querySelector('.ed-new').textContent = rank < 0 ? '' : newTop ? (before.length ? 'NEW HIGH SCORE!' : 'FIRST HIGH SCORE!') : `#${rank + 1} on your Top 5!`;
      ov.querySelector('.ed-new').classList.toggle('top', newTop);
      ov.querySelector('#edScore').textContent = entry.score.toLocaleString();
      ov.querySelector('#edNotes').textContent = run.notes;
      ov.querySelector('#edSpeed').textContent = run.speed.toFixed(1);
      ov.querySelector('#edCombo').textContent = run.combo;
      ov.querySelector('.ed-demo').hidden = !demo;
      ov.querySelector('.ed-list').innerHTML = E.listHTML(demo ? before : list, demo ? null : (rank >= 0 ? rank : null));
      const again = ov.querySelector('.ed-again'), back = ov.querySelector('.ed-back');
      back.textContent = backLabel || 'Levels';
      again.onclick = () => { close(); onAgain(); };
      back.onclick = () => { close(); onBack(); };
      ov.hidden = false;
      if (A.Skins) A.Skins.announce(ov.querySelector('.panel'));     // the player's avatar and name at the top
      again.focus();
      A.Sfx.sequence(['endless-game-over', newTop && !demo && 'endless-high-score']);
      return rank;
    },
  };

  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function dateText(iso) {
    const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || '');
    if (!m) return '';
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}); } catch (e) { return iso; }
  }

  let ov = null;
  function overlay() {
    if (ov) return ov;
    ov = document.createElement('div');
    ov.className = 'overlay ed-over'; ov.hidden = true;
    ov.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="edOverTitle">
      <p class="ed-kicker"><span aria-hidden="true">∞</span> Endless</p>
      <h2 id="edOverTitle">Game Over</h2>
      <p class="ed-new" aria-live="polite" hidden></p>
      <div class="stats">
        <div><small>Score</small><b id="edScore">0</b></div>
        <div><small>Notes cleared</small><b id="edNotes">0</b></div>
        <div><small>Top speed</small><b id="edSpeed">0</b></div>
        <div><small>Longest combo</small><b id="edCombo">0</b></div>
      </div>
      <p class="ed-demo" hidden>Demo run — score not saved</p>
      <p class="ed-top-h">Top 5 on this device</p>
      <div class="ed-list"></div>
      <div class="acts">
        <button type="button" class="btn btn-gold ed-again">Play again</button>
        <button type="button" class="btn btn-ghost ed-back">Levels</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') ov.querySelector('.ed-back').click(); });
    return ov;
  }
  function close() { if (ov) ov.hidden = true; }
})(window.Arcade);
