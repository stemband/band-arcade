/* ARCADE QUEST: the TITLE screen and the TEST ARENA.
   TITLE: CONTINUE (back to your last Save Jukebox in Ghost Notes Manor), NEW GAME (Episode 1 from the Foyer),
   TEST ARENA (only with ?demo or ?test) and SETTINGS. The title music is quest-title.
   TEST ARENA (index.html?test, or TEST ARENA on the title): pick any test enemy (one per challenge type) and fight it
   with your instrument. The card shows the challenge YOUR instrument gets (the Snare Drum: ARTICULATE or VOCAB).
   Your HP refills every time you come back to the arena. RESET SAVE starts the save slot over. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const TYPE_NAME = {play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING'};
  let player = null;
  const me = () => (player = Q.playerId(A.currentMember().id, {tone: Q.settings.get().tone}));

  /* ---------- the title ---------- */
  Q.scenes.title = {
    enter() {
      me();
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-title');
      Q.ui.innerHTML = `<div class="q-title"><h1><small>Arcade Quest</small>The Mysterious Microphone</h1>` +
        `<p class="q-ep">Episode 1: Ghost Notes Manor</p><div id="qTitleMenu"></div></div>`;
      const s = Q.save.get(), started = !!(s.world || s.battles.won || Object.keys(s.flags || {}).length);
      const testing = A.DEMO || /[?&]test(=|&|$)/.test(location.search);
      const items = (started ? [{id: 'continue', label: 'Continue'}] : []).concat([{id: 'new', label: 'New game'}],
        testing ? [{id: 'arena', label: 'Test Arena'}] : [], [{id: 'settings', label: 'Settings'}]);
      const menu = () => {
        const m = Q.menu(Q.$('qTitleMenu'), items, {cols: items.length > 2 ? 2 : 1, label: 'Title menu', onPick: it => {
          if (it.id === 'continue') { m.destroy(); Q.go('world', {continue: true}); }
          else if (it.id === 'arena') { m.destroy(); Q.go('arena'); }
          else if (it.id === 'settings') Q.settings.open().then(me);
          else if (!started) { m.destroy(); Q.save.reset(); Q.go('world', {map: 'foyer', intro: true}); }
          else {                                                  // a new game over a saved one: ask first
            m.destroy();
            const c = Q.menu(Q.$('qTitleMenu'), [{id: 'yes', label: 'Yes, start over', sub: 'Level, items, tokens and friends reset'}, {id: 'no', label: 'No, go back'}],
              {cols: 2, label: 'Start a new game?', start: 1, onPick: x => { c.destroy(); if (x.id === 'yes') { Q.save.reset(); Q.go('world', {map: 'foyer', intro: true}); } else menu(); },
                onBack: () => { c.destroy(); menu(); }});
          }
        }});
      };
      menu();
    },
    exit() { if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(null); },
    draw(ctx, now) {
      // a starfield of pixels + the mysterious microphone, bobbing (still with reduced motion)
      ctx.fillStyle = Q.css('q-grey-d');
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 73) % Q.W, (i * 41) % 110, 1, 1);
      const bob = Q.reduced() ? 0 : Math.round(Math.sin(now / 500) * 2);
      Q.draw(ctx, 'mic', 160 - 9, 10 + bob, {scale: 2});
      Q.draw(ctx, player, 8, 128, {scale: 2, t: now});
    },
  };

  /* ---------- the test arena ---------- */
  const TEST = () => window.QUEST_ENEMIES.filter(e => e.test);
  const slots = () => TEST().map((e, i, all) => ({e, x: Math.round(Q.W / (all.length + 1) * (i + 1)) - 16, y: 36}));
  Q.scenes.arena = {
    enter({from} = {}) {
      const s = Q.save.get();
      s.hp = s.maxHp; Q.save.write();                         // a rest between fights
      me();
      const befriended = id => s.roster.includes(id);
      const items = Object.keys(s.items).filter(k => s.items[k] > 0 && window.QUEST_ITEMS[k]).map(k => `${window.QUEST_ITEMS[k].name} ×${s.items[k]}`).join(', ') || 'none';
      Q.ui.innerHTML = `<div class="q-arena"><h2 class="q-ah">Test Arena</h2>` +
        `<p class="q-stats"><b>LV ${s.level}</b> · HP ${s.hp}/${s.maxHp} · XP ${s.xp}/${Q.save.xpToNext(s.level)} · ${s.tokens} Tokens</p>` +
        `<p class="q-stats q-small">Bag: ${items} · Band: ${s.roster.length ? s.roster.map(id => (window.QUEST_ENEMIES.find(e => e.id === id) || {name: id}).name).join(', ') : 'nobody yet'}</p>` +
        `<div id="qFoes"></div><div class="q-arena-foot" id="qFoot"></div></div>`;
      const foes = TEST().map(e => {
        const t = Q.challenge.resolve(e.challenge);
        return {id: e.id, cls: 'q-foe' + (befriended(e.id) ? ' friend' : ''),
          label: `${e.name}${befriended(e.id) ? ' <span class="q-ok">✓ friend</span>' : ''}`,
          sub: `${e.test}${TYPE_NAME[t] !== e.test.replace(' (bonus)', '') ? ` → ${TYPE_NAME[t]} for you` : ''}`};
      });
      const start = Math.max(0, TEST().findIndex(e => e.id === from));
      const m = Q.menu(Q.$('qFoes'), foes, {cols: foes.length, label: 'Test enemies', start, cls: 'q-foes',
        onPick: it => { m.destroy(); f.destroy(); Q.go('battle', {enemy: it.id, back: 'arena'}); },
        onBack: () => { m.destroy(); f.destroy(); Q.go('title'); }});
      const f = Q.menu(Q.$('qFoot'), [{id: 'settings', label: 'Settings'}, {id: 'reset', label: 'Reset save'}, {id: 'title', label: 'Title'}],
        {cols: 3, label: 'Arena options', cls: 'q-small-menu', keys: false, onPick: it => {
          if (it.id === 'settings') Q.settings.open().then(me);
          else if (it.id === 'title') { m.destroy(); f.destroy(); Q.go('title'); }
          else if (confirm('Start the Arcade Quest save over? (Level, tokens, items and band friends.)')) { m.destroy(); f.destroy(); Q.save.reset(); Q.go('arena'); }
        }});
      this.menu = m;
    },
    draw(ctx, now) {
      for (let y = 112; y < Q.H; y += 16) for (let x = 0; x < Q.W; x += 16) Q.draw(ctx, 'tile', x, y);
      const s = Q.save.get(), cur = this.menu ? this.menu.index : -1;
      slots().forEach(({e, x, y}, i) => {
        ctx.fillStyle = Q.css(i === cur ? 'q-cursor' : 'q-grey-d'); ctx.fillRect(x - 2, y + 30, 36, 3);
        Q.draw(ctx, e.sprite, x, y + (i === cur && !Q.reduced() ? Math.round(Math.sin(now / 180)) - 1 : 0), {t: now, frame: s.roster.includes(e.id) ? 2 : undefined});
      });
      Q.draw(ctx, player, 18, 129, {scale: 2, t: now});
    },
  };
})(window.Arcade);
