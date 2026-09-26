/* ARCADE QUEST ENGINE: the save slot and the settings, both in Arcade.store.gameData('arcade-quest') on this device.
   SAVE FORMAT (version 1; bump SAVE_VERSION and add a step to upgrade() whenever the shape changes):
     {v: 1, level, xp, hp, maxHp, tokens, items: {itemId: count}, roster: [enemyId…] (befriended), battles: {won, befriended, faded}}
   SETTINGS: {textSpeed: 'slow'|'normal'|'fast'|'instant', dodge: 'easy'|'normal', assist: bool, tone: 0–3 (skin tone)}.
   Sound and music volumes are the arcade's own (shared/sfx.js speaker settings), so they match every other game.
   Q.settings.open() shows the SETTINGS panel. */
(function (A) {
  "use strict";
  const Q = A.Quest, GAME = 'arcade-quest';
  const SAVE_VERSION = 1;
  const data = () => A.store.gameData(GAME);
  const write = () => A.store.saveGameData(GAME);
  const fresh = () => ({v: SAVE_VERSION, level: 1, xp: 0, hp: 20, maxHp: 20, tokens: 0, items: {'valve-oil': 2, 'cork-grease': 1, 'metronome': 1}, roster: [], battles: {won: 0, befriended: 0, faded: 0}});
  /** older saves -> the current version (nothing to do yet: version 1 is the first) */
  function upgrade(s) { if (!s || typeof s !== 'object' || !s.v) return fresh(); return s; }

  Q.save = {
    VERSION: SAVE_VERSION,
    get() { const d = data(); d.save = upgrade(d.save); return d.save; },
    write,
    reset() { data().save = fresh(); write(); return data().save; },
    xpToNext: level => 20 + (level - 1) * 15,
    maxHpAt: level => 20 + (level - 1) * 4,
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
