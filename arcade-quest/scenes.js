/* ARCADE QUEST: the TITLE screen and the TEST ARENA.
   TITLE: "ARCADE QUEST: THE MYSTERIOUS MICROPHONE" over the microphone's 8-bit silhouette in static.
   CONTINUE (back to your last Save Jukebox in Ghost Notes Manor), NEW GAME (the intro cutscene, then Episode 1 from
   the Foyer), ENTER SAVE CODE (a code from any Save Jukebox, on any device: shared/backup.js), SETTINGS, YOUR PLAYER
   (Create Your Player: your look and name, shared/avatar-creator.js), and TEST
   ARENA (only with ?demo or ?test). The title music is quest-title. While the audio is still locked (the first visit
   of this page load), the menu waits behind PRESS START, so the first tap starts the music instead of a new game.
   TEST ARENA (index.html?test, or TEST ARENA on the title): pick any test enemy (one per challenge type) and fight it
   with your instrument. The card shows the challenge YOUR instrument gets (the Snare Drum: ARTICULATE or VOCAB).
   Your HP refills every time you come back to the arena. RESET SAVE starts the save slot over. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const TYPE_NAME = {play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING'};
  let player = null;
  const me = () => (player = Q.playerId(A.currentMember().id));

  // a new look from the avatar badge's editor (the top bar): the title's hero is redrawn
  addEventListener('arcade:avatar', e => { if (!e.detail.guest && Q.scene && Q.scene() === Q.scenes.title) me(); });

  /* ---------- the title ---------- */
  Q.scenes.title = {
    enter() {
      me();
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic('quest-title');
      Q.ui.innerHTML = `<div class="q-title"><h1><small>Arcade Quest:</small>The Mysterious Microphone</h1>` +
        `<p class="q-ep">Episode 1: Ghost Notes Manor</p><div id="qTitleMenu"></div></div>`;
      const s = Q.save.get(), started = !!(s.world || s.battles.won || Object.keys(s.flags || {}).length);
      const testing = A.DEMO || /[?&]test(=|&|$)/.test(location.search);
      const items = (started ? [{id: 'continue', label: 'Continue'}] : []).concat([{id: 'new', label: 'New game'}, {id: 'code', label: 'Enter save code'}],
        [{id: 'settings', label: 'Settings'}], A.AvatarCreator ? [{id: 'avatar', label: 'Your player'}] : [], testing ? [{id: 'arena', label: 'Test Arena'}] : []);
      // NEW GAME: the intro cutscene (skippable), then the Foyer
      const newGame = () => { Q.save.reset(); Q.save.setFlag('seen-intro'); Q.go('cutscene', {id: 'intro', next: {scene: 'world', args: {map: 'foyer', intro: true}}}); };
      const menu = () => {
        const m = Q.menu(Q.$('qTitleMenu'), items, {cols: 2, label: 'Title menu', onPick: it => {
          if (it.id === 'continue') { m.destroy(); Q.go('world', {continue: true}); }
          else if (it.id === 'arena') { m.destroy(); Q.go('arena'); }
          else if (it.id === 'settings') Q.settings.open().then(me);
          else if (it.id === 'avatar') A.AvatarCreator.open({onClose: () => { me(); const b = Q.$('qTitleMenu').querySelector('.q-btn:nth-child(' + (items.findIndex(x => x.id === 'avatar') + 1) + ')'); if (b) b.focus(); }});   // Create Your Player
          else if (it.id === 'code') Q.talk.enterCode().then(ok => { if (ok) { m.destroy(); Q.go('world', {continue: true}); } });
          else if (!started) { m.destroy(); newGame(); }
          else {                                                  // a new game over a saved one: ask first (the arcade's own question)
            A.UI.confirm({title: 'Start a new game?', text: 'Your level, items, tokens and band friends start over.', yes: 'Yes, start over', no: 'No, go back',
              danger: true, theme: 'q-theme'}).then(yes => { if (yes && Q.$('qTitleMenu')) { m.destroy(); newGame(); } });
          }
        }});
        // CONTINUE (or NEW GAME) glows, has the focus and gets the idle hint (shared/level-select.js)
        const first = Q.$('qTitleMenu').querySelector('.q-btn');
        if (A.LevelSelect && first) A.LevelSelect.highlight({screen: Q.$('qTitleMenu'), el: first});
      };
      // PRESS START while the audio is still locked: browsers allow sound only after a tap, so the first tap on this
      // page starts the title music (shared/sfx.js unlocks on that same tap) instead of leaving the title at once
      if (A.Sfx && !A.Sfx.unlocked) {
        const box = Q.$('qTitleMenu');
        box.innerHTML = `<button type="button" class="q-btn q-press" id="qPress">Press start<small>${Q.input.touch ? 'Tap anywhere' : 'Press Enter (or any key)'}</small></button>`;
        // any click/tap (it ends with a click), any key or the on-screen pad; the menu appears just AFTER that gesture,
        // so the same tap can't also press a menu button that appears under the finger
        const done = () => { off(); document.removeEventListener('click', go, true); document.removeEventListener('keydown', key, true); };
        const go = () => { done(); setTimeout(() => { if (Q.$('qPress')) { box.innerHTML = ''; menu(); } }, 0); };
        const key = e => { if (!/^(Shift|Control|Alt|Meta|Tab)$/.test(e.key)) go(); };
        const off = Q.input.on(() => { go(); return true; });
        document.addEventListener('click', go, true);
        document.addEventListener('keydown', key, true);
        Q.$('qPress').focus({preventScroll: true});
      } else menu();
    },
    exit() { if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(null); },
    draw(ctx, now) {
      // static (still with reduced motion) and the Mysterious Microphone's silhouette looming behind the title
      const f = Q.reduced() ? 1 : Math.floor(now / 90);
      for (let i = 0; i < 260; i++) {
        const r = Math.sin((f * 977 + i) * 12.9898) * 43758.5453 % 1;
        ctx.fillStyle = Q.css(Math.abs(r) > .7 ? 'q-grey' : 'q-grey-d'); ctx.globalAlpha = .45;
        ctx.fillRect(Math.floor(Math.abs(Math.sin(i * 3.1 + f) * 10000) % Q.W), Math.floor(Math.abs(Math.sin(i * 7.7 + f * 1.3) * 10000) % Q.H), 1, 1);
      }
      ctx.globalAlpha = .5; ctx.fillStyle = Q.css('q-purple-d'); ctx.beginPath(); ctx.ellipse(160, 58, 60, 56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .75; Q.draw(ctx, 'mic-big', 128, 2, {scale: 2}); ctx.globalAlpha = 1;
      if (!Q.reduced() && Math.floor(now / 700) % 2) { ctx.fillStyle = Q.css('q-out'); ctx.fillRect(156, 60, 4, 4); }   // its red light blinks
      Q.draw(ctx, player, 0, 118, {scale: 2, t: now});
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
        `<p class="q-stats"><b>LV ${s.level}</b> · ${Q.text('power')} ${Q.save.powerAt(s.level)} · HP ${s.hp}/${s.maxHp} · XP ${s.xp}/${Q.save.xpToNext(s.level)} · ${A.Tokens.balance()} Tokens</p>` +
        `<p class="q-stats q-small">Bag: ${items} · Friends: ${s.roster.length ? s.roster.map(id => (window.QUEST_ENEMIES.find(e => e.id === id) || {name: id}).name).join(', ') : 'nobody yet'}` +
        ` · Playing beside you: ${Q.band.members().map(id => Q.band.enemy(id).name).join(', ') || 'just you'}</p>` +
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
      const f = Q.menu(Q.$('qFoot'), [{id: 'band', label: 'Band'}, {id: 'settings', label: 'Settings'}, {id: 'reset', label: 'Reset save'}, {id: 'title', label: 'Title'}],
        {cols: 4, label: 'Arena options', cls: 'q-small-menu', keys: false, onPick: it => {
          if (it.id === 'band') { m.destroy(); f.destroy(); Q.talk.band().then(() => Q.go('arena')); }
          else if (it.id === 'settings') Q.settings.open().then(me);
          else if (it.id === 'title') { m.destroy(); f.destroy(); Q.go('title'); }
          else A.UI.confirm({title: 'Start your save over?', text: 'Your Arcade Quest level, tokens, items and band friends start over.', yes: 'Start over', no: 'Keep my save',
            danger: true, theme: 'q-theme'}).then(yes => { if (yes && Q.$('qFoes')) { m.destroy(); f.destroy(); Q.save.reset(); Q.go('arena'); } });
        }});
      this.menu = m; this.foot = f;
    },
    // leaving the arena any other way (a test, ?demo): its menus stop listening for A
    exit() { [this.menu, this.foot].forEach(x => { if (x) x.destroy(); }); this.menu = this.foot = null; },
    draw(ctx, now) {
      for (let y = 112; y < Q.H; y += 16) for (let x = 0; x < Q.W; x += 16) Q.draw(ctx, 'tile', x, y);
      const s = Q.save.get(), cur = this.menu ? this.menu.index : -1;
      slots().forEach(({e, x, y}, i) => {
        ctx.fillStyle = Q.css(i === cur ? 'q-cursor' : 'q-grey-d'); ctx.fillRect(x - 2, y + 30, 36, 3);
        Q.draw(ctx, e.sprite, x, y + (i === cur && !Q.reduced() ? Math.round(Math.sin(now / 180)) - 1 : 0), {t: now, frame: s.roster.includes(e.id) ? 2 : undefined});
      });
      Q.draw(ctx, player, 8, 118, {scale: 2, t: now});
    },
  };
})(window.Arcade);
