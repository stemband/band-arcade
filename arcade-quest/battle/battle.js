/* ARCADE QUEST: THE BATTLE SCENE. Turn-based: your turn (PLAY · LISTEN · ITEM · HARMONIZE), then the enemy's turn
   (a dodge). Player HP, enemy HP and the enemy's CALM meter (0–100).
     PLAY       the enemy's challenge (challenges.js). Damage = your power × accuracy × speed; right notes raise CALM.
     LISTEN     its description, weakness and what calms it (some enemies calm down just from being listened to).
     ITEM       Valve Oil (heal), Cork Grease (shield), Metronome (slower next dodge)… (data/items.js)
     HARMONIZE  only with a full CALM meter: its happy-note challenge. Success = it joins your band (bigger rewards).
   Enemy HP 0 = it fades away grumbling (smaller rewards). Your HP 0 = "out of breath": nothing is lost, HP refills.
   Episode 1 adds: `phases` (a boss's challenge changes with each PLAY of it), the B♭ Blast (a second attack once the Butler
   teaches it), the Tuning Slide (boost), `listenBoost`, `mustHarmonize` (HP stops at 1) and per-enemy `music`.
   Q.go('battle', {enemy: 'squawk', back: 'arena'}) or, from the overworld,
   Q.go('battle', {enemy: 'wisp', overrides: {happy: 2}, back: {scene: 'world', args: {...}}}): when it ends, the
   back scene gets args.result = {kind: 'befriend' | 'fade' | 'rest', enemy}. All words: data/battle-text.js. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const RULES = {power: 10, powerPerLevel: 2, calmMax: 100, harmonizeMiss: 30, speedWeight: .45, blast: 1.3, breath: .3, calmSave: 60};
  const ENEMIES = () => window.QUEST_ENEMIES, ITEMS = () => window.QUEST_ITEMS;
  let B = null;                                               // the battle in progress

  const hud = () => {
    if (!B) return;
    const e = B.e, s = B.save;
    Q.$('qEHp').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    Q.$('qEHpN').textContent = `${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}`;
    Q.$('qCalm').style.width = Math.min(100, B.calm) + '%';
    Q.$('qCalmBox').classList.toggle('full', B.calm >= RULES.calmMax);
    Q.$('qPHp').style.width = Math.max(0, s.hp / s.maxHp * 100) + '%';
    Q.$('qPHpN').textContent = `${Math.max(0, s.hp)}/${s.maxHp}`;
    Q.$('qLv').textContent = 'LV ' + s.level;
    Q.$('qShield').hidden = !B.shield; Q.$('qShield').textContent = `Shield ×${B.shield}`;
  };
  /** a floating number over the canvas (damage, CALM +) */
  function float(text, x, y, cls) {
    const f = Q.el('span', 'q-float ' + (cls || ''), text);
    f.style.left = `calc(var(--px) * ${x})`; f.style.top = `calc(var(--px) * ${y})`;
    Q.ui.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
  function addCalm(n, say) {
    if (!n) return;
    const was = B.calm;
    B.calm = Math.min(RULES.calmMax, B.calm + n); hud();
    if (B.calm >= 50 && was < 50 && B.calm < RULES.calmMax) B.queue.push(B.e.lines.calm);
    if (B.calm > was) { float(`CALM +${Math.round(B.calm - was)}`, 150, 18, 'calm'); Q.sfx('quest-calm'); if (say) B.queue.push(Q.text('calmUp', {name: B.e.name})); }
    if (B.calm >= RULES.calmMax && was < RULES.calmMax) B.queue.push(Q.text('calmFull', {name: B.e.name}));
  }
  const micReady = () => Q.micReady();
  const TYPE_NAME = {play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING'};
  /** this turn's challenge: the enemy's own, or its phase (a boss changes challenge each turn) */
  const challengeNow = () => (B.e.phases ? B.e.phases[B.phase % B.e.phases.length] : B.e.challenge);
  /** PLAY: once the Butler taught the B♭ Blast, pick the enemy's challenge or the Blast */
  function playMenu() {
    if (!Q.save.flag('songBb')) return Promise.resolve('main');
    return new Promise(done => {
      const cmd = Q.$('qCmd'); cmd.hidden = false;
      const t = Q.challenge.resolve(challengeNow());
      const m = Q.menu(cmd, [{id: 'main', label: TYPE_NAME[t] || 'PLAY', sub: Q.text('playSub')}, {id: 'blast', label: Q.text('blast'), sub: Q.text('blastSub'), cls: 'c-play'},
        {id: null, label: Q.text('back'), cls: 'c-back'}], {cols: 3, label: Q.text('playWhich'),
        onPick: it => { m.destroy(); cmd.hidden = true; done(it.id); }, onBack: () => { m.destroy(); cmd.hidden = true; done(null); }});
    });
  }
  const sayQ = async (lines, opts) => { const l = [].concat(B.queue, lines || []); B.queue = []; if (l.length) await Q.say(l, opts); };

  /* ---------- the menu ---------- */
  function command() {
    return new Promise(done => {
      const cmd = Q.$('qCmd'); cmd.hidden = false;
      const canHarm = B.calm >= RULES.calmMax;
      const m = Q.menu(cmd, [
        {id: 'play', label: Q.text('play'), sub: Q.text('playSub'), cls: 'c-play'},
        {id: 'listen', label: Q.text('listen'), sub: Q.text('listenSub'), cls: 'c-listen'},
        {id: 'item', label: Q.text('item'), sub: Q.text('itemSub'), cls: 'c-item'},
        {id: 'harmonize', label: Q.text('harmonize'), sub: canHarm ? Q.text('harmonizeSub') : Q.text('harmonizeLocked'), cls: 'c-harm' + (canHarm ? ' ready' : ''), disabled: !canHarm},
      ], {cols: 4, label: 'Your turn', start: B.lastCmd || 0,
        onPick: (it, i) => { B.lastCmd = i; m.destroy(); cmd.hidden = true; done(it.id); },
        onBack: () => { Q.settings.open().then(() => { B.player = Q.playerId(B.member.id, {tone: Q.settings.get().tone}); }); }});
      const p = Q.$('qPrompt'); p.hidden = false; p.textContent = Q.text('menuPrompt', {you: B.member.short});
    }).then(id => { Q.$('qPrompt').hidden = true; return id; });
  }
  function itemMenu() {
    return new Promise(done => {
      const cmd = Q.$('qCmd'); cmd.hidden = false;
      const bag = B.save.items, list = Object.keys(bag).filter(k => bag[k] > 0 && ITEMS()[k]);
      const items = list.map(k => ({id: k, label: `${ITEMS()[k].name} ×${bag[k]}`, sub: ITEMS()[k].desc}))
        .concat([{id: null, label: Q.text('back'), sub: list.length ? '' : Q.text('noItems'), cls: 'c-back'}]);
      const m = Q.menu(cmd, items, {cols: Math.min(4, items.length), label: 'Items',
        onPick: it => { m.destroy(); cmd.hidden = true; done(it.id); }, onBack: () => { m.destroy(); cmd.hidden = true; done(null); }});
    });
  }

  /* ---------- actions ---------- */
  async function doPlay() {
    const which = await playMenu();
    if (!which) return false;
    const type = challengeNow(), blast = which === 'blast', wasCalm = B.calm >= RULES.calmMax;
    if ((blast || Q.challenge.uses(type)) && !(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    if (B.e.phases && !blast) { await Q.say(Q.text('phase', {n: B.phase % B.e.phases.length + 1, what: TYPE_NAME[Q.challenge.resolve(type)] || 'PLAY'}), {name: B.e.name}); B.phase++; }
    const res = blast ? await Q.challenge.blast(false) : await Q.challenge.run(type, {enemy: B.e});
    if (B === null) return false;
    const power = RULES.power + (B.save.level - 1) * RULES.powerPerLevel;
    let dmg = Math.round(power * res.acc * (1 - RULES.speedWeight + RULES.speedWeight * res.speed) * (blast ? RULES.blast : 1));
    const boosted = B.boost && dmg > 0 ? B.boost : 0;
    if (boosted) { dmg = Math.round(dmg * boosted); B.boost = 0; }
    if (dmg > 0) {
      B.e.hp -= dmg; B.hurtUntil = performance.now() + 450; Q.sfx('quest-enemy-hurt'); Q.shake(2, 180);
      if (B.e.mustHarmonize && B.e.hp < 1) { B.e.hp = 1; B.queue.push(B.e.lines.hold); }
      float('-' + dmg, 170, 30, 'dmg'); hud();
      B.queue.unshift(Q.text(res.acc >= .9 ? 'hitGreat' : res.acc >= .5 ? 'hitGood' : 'hitWeak', {name: B.e.name, n: dmg}));
      if (boosted) B.queue.unshift(Q.text('boosted', {n: boosted}));
      if (B.e.hp > 1 && B.e.hp <= B.e.maxHp / 2 && !B.saidHurt) { B.saidHurt = true; B.queue.push(B.e.lines.hurt); }
    } else B.queue.push(Q.text('miss'));
    const perNote = (B.e.calm.perNote || 0) * (B.listened && B.e.listenBoost ? B.e.listenBoost : 1);
    addCalm(perNote * res.correct + (res.success ? B.e.calm.success || 0 : 0), true);
    // a ghost that is getting calm can't fade: someone playing well always gets to HARMONIZE. The round its CALM fills
    // up the student chooses: HARMONIZE (a friend) or PLAY again (it fades away). RULES.calmSave = "getting calm".
    if (!wasCalm && B.e.hp < 1 && B.calm >= RULES.calmSave) {
      B.e.hp = 1; hud(); B.queue.push(Q.text(B.calm >= RULES.calmMax ? 'tooCalm' : 'almostCalm', {name: B.e.name}));
    }
    await sayQ();
    return true;
  }
  async function doListen() {
    const lines = B.e.listen.map(l => l.replace('{happy}', Q.happyLabel(B.e)));
    await Q.say(lines, {name: B.e.name, portrait: B.e.sprite});
    B.listened = true;
    if (B.e.calm.listen) { addCalm(B.e.calm.listen); await sayQ(Q.text('listenCalm', {name: B.e.name})); }
    return true;
  }
  async function doItem() {
    const id = await itemMenu();
    if (!id) return false;
    const it = ITEMS()[id], fx = it.effect || {};
    if (fx.heal && !fx.shield && !fx.slow && B.save.hp >= B.save.maxHp) { await Q.say(Q.text('fullHp')); return false; }   // don't waste it
    B.save.items[id]--; Q.save.write(); Q.sfx('quest-item');
    const lines = [Q.text('itemUsed', {item: it.name})];
    if (fx.heal) { const was = B.save.hp; B.save.hp = Math.min(B.save.maxHp, B.save.hp + fx.heal); lines.push(Q.text('itemHeal', {n: B.save.hp - was})); float('+' + (B.save.hp - was), 40, 60, 'heal'); }
    if (fx.shield) { B.shield += fx.shield; lines.push(Q.text('itemShield', {n: B.shield})); }
    if (fx.slow) { B.slow = fx.slow; lines.push(Q.text('itemSlow')); }
    if (fx.boost) { B.boost = fx.boost; lines.push(Q.text('itemBoost')); }
    hud(); Q.save.write();
    await Q.say(lines);
    return true;
  }
  async function doHarmonize() {
    const h = B.e.harmonize || {};
    if ((Q.challenge.uses('play') || h.type === 'articulate') && !(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    const res = await Q.challenge.run(null, {enemy: B.e, harmonize: true});
    if (B === null) return false;
    if (res.success) { await befriend(); return 'over'; }
    B.calm = Math.max(0, B.calm - RULES.harmonizeMiss); hud();
    await Q.say(Q.text('harmonizeFail', {name: B.e.name}));
    return true;
  }

  /* ---------- the enemy's turn: dodge ---------- */
  async function enemyTurn() {
    await Q.say([Q.pick([].concat(B.e.lines.turn)), Q.text('dodgeStart')], {name: B.e.name});
    const st = Q.settings.get();
    const res = await Q.dodge.start({enemy: B.e, easy: st.dodge === 'easy', slow: B.slow, shield: B.shield, assist: st.assist,
      onHit: (dmg, blocked) => {
        if (blocked) { float('Blocked!', 150, 80, 'calm'); return; }
        B.save.hp = Math.max(0, B.save.hp - dmg); float('-' + dmg, 40, 58, 'dmg'); Q.sfx('quest-hurt'); hud();
        if (B.save.hp <= 0) return 'stop';
      }});
    B.slow = null; B.shield = res.shieldLeft || 0; hud(); Q.save.write();
    const lines = [];
    if (res.damage) lines.push(Q.text('dodgeHits', {n: res.damage}));
    else lines.push(Q.text(res.blocked ? 'shieldBlock' : 'dodgeClean'));
    await Q.say(lines);
  }

  /* ---------- endings ---------- */
  async function rewards(kind) {
    const r = (B.e.rewards || {})[kind] || {xp: 5, tokens: 1}, s = B.save;
    s.xp += r.xp; s.tokens += r.tokens;
    const lines = [Q.text('rewards', {n: r.xp, tokens: r.tokens})];
    if (r.item && ITEMS()[r.item]) { s.items[r.item] = (s.items[r.item] || 0) + 1; lines.push(Q.text('gotItem', {item: ITEMS()[r.item].name})); }
    const breath = Math.min(s.maxHp - s.hp, Math.ceil(s.maxHp * RULES.breath));   // a breather after every battle won
    if (breath > 0) { s.hp += breath; lines.push(Q.text('breath', {n: breath})); }
    let up = false;
    while (s.xp >= Q.save.xpToNext(s.level)) { s.xp -= Q.save.xpToNext(s.level); s.level++; s.maxHp = Q.save.maxHpAt(s.level); s.hp = s.maxHp; up = true; }
    s.battles = s.battles || {won: 0, befriended: 0, faded: 0};
    s.battles.won++; s.battles[kind === 'befriend' ? 'befriended' : 'faded']++;
    Q.save.write(); hud();
    await Q.say(lines);
    if (up) { Q.sfx('quest-levelup'); await Q.say(Q.text('levelUp', {n: s.level})); }
  }
  async function befriend() {
    B.state = 'friend'; Q.sfx('quest-befriend');
    if (!B.save.roster.includes(B.e.id)) B.save.roster.push(B.e.id);
    if (B.e.opens) Q.save.setFlag(B.e.opens);                  // e.g. the Phantom Fermata opens the attic
    Q.save.write();
    await Q.say([B.e.lines.befriend, Q.text('befriended', {name: B.e.name})], {name: B.e.name, portrait: B.e.sprite});
    await rewards('befriend');
  }
  async function fade() {
    B.state = 'fading'; B.fadeAt = performance.now(); Q.sfx('quest-fade');
    await Q.say([B.e.lines.fade, Q.text('faded', {name: B.e.name})]);
    await rewards('fade');
  }

  async function run() {
    const b = B;
    await Q.say(b.e.lines.intro);
    while (B === b) {
      const id = await command();
      if (B !== b) return;
      let r = id === 'play' ? await doPlay() : id === 'listen' ? await doListen() : id === 'item' ? await doItem() : await doHarmonize();
      if (B !== b) return;
      if (r === 'over') break;
      if (r === false) continue;                                  // backed out: still your turn
      if (b.e.hp <= 0) { await fade(); break; }
      await enemyTurn();
      b.round++;
      if (B !== b) return;
      if (b.save.hp <= 0) {
        b.state = 'rest';
        await Q.say([Q.text('outOfBreath'), Q.text('outOfBreath2')]);
        b.save.hp = b.save.maxHp; Q.save.write();
        break;
      }
    }
    if (B !== b) return;
    const result = {kind: b.state === 'friend' ? 'befriend' : b.state === 'fading' ? 'fade' : 'rest', enemy: b.e.id};
    if (b.back && typeof b.back === 'object') Q.go(b.back.scene, Object.assign({}, b.back.args, {result}));
    else Q.go(b.back || 'arena', {from: b.e.id, result});
  }

  Q.scenes.battle = {
    enter({enemy, back, overrides}) {
      const src = Object.assign({}, ENEMIES().find(e => e.id === enemy) || ENEMIES()[0], overrides || {});
      const save = Q.save.get(), member = A.currentMember();
      B = {e: Object.assign({}, src, {maxHp: src.hp, hp: src.hp}), save, member, back, calm: 0, shield: 0, slow: null, boost: 0, round: 0, phase: 0, listened: false, queue: [], state: 'fight', hurtUntil: 0,
        player: Q.playerId(member.id, {tone: Q.settings.get().tone})};
      Q.ui.innerHTML = `<div class="q-hud">` +
        `<div class="q-hud-e"><p class="q-hname">${src.name}</p><div class="q-bar hp"><i id="qEHp"></i></div><small id="qEHpN"></small>` +
        `<div class="q-calm" id="qCalmBox"><span>CALM</span><div class="q-bar calm"><i id="qCalm"></i></div></div></div>` +
        `<div class="q-hud-p"><p class="q-hname">${member.short} <span id="qLv"></span></p><div class="q-bar php"><i id="qPHp"></i></div><small id="qPHpN"></small><small class="q-shield" id="qShield" hidden></small></div></div>` +
        `<p class="q-mictag" id="qMicTag" hidden><span class="q-dot"></span> The mic is listening</p>` +
        `<button type="button" class="q-gear" id="qGear" aria-label="Settings">⚙</button>` +
        `<p class="q-prompt" id="qPrompt" hidden></p><div class="q-cmd" id="qCmd" hidden></div>`;
      Q.$('qGear').addEventListener('click', () => Q.settings.open().then(() => { if (B) B.player = Q.playerId(member.id, {tone: Q.settings.get().tone}); }));
      hud();
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(src.music || 'quest-battle');
      run();
    },
    exit() {
      B = null;
      if (Q.dodge.active()) Q.dodge.end();
      Q.listen(false);
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(null);
    },
    update(dt) { Q.dodge.update(dt); },
    draw(ctx, now) {
      if (!B) return;
      // the floor: a dark stage with a few pixel stripes
      ctx.fillStyle = Q.css('q-floor'); ctx.fillRect(0, 118, Q.W, 62);
      ctx.fillStyle = Q.css('q-floor-2'); for (let x = 0; x < Q.W; x += 16) ctx.fillRect(x, 118, 8, 1);
      // the enemy (a shake when hurt, its happy face as a friend, fading out when it leaves)
      const hurt = now < B.hurtUntil && !Q.reduced() ? Math.round(Math.sin(now / 25) * 2) : 0;
      let alpha = 1;
      if (B.state === 'fading') alpha = Math.max(0, 1 - (now - B.fadeAt) / 1400);
      const d = Q.spriteDef(B.e.sprite) || {w: 32, h: 32}, dodging = Q.dodge.active(), big = d.h > 32;
      const es = dodging && big ? 1 : 2, ey = dodging ? (big ? 26 : 12) : (big ? 24 : 30);
      Q.draw(ctx, B.e.sprite, Math.round(160 - d.w * es / 2) + hurt, ey, {scale: es, t: now, alpha, frame: B.state === 'friend' ? 2 : undefined});
      // you
      if (!dodging) Q.draw(ctx, B.player, 22, 64, {scale: 2, t: now});
      Q.dodge.draw(ctx, now);
    },
  };
  Q.battleState = () => B && {hp: B.e.hp, calm: B.calm, php: B.save.hp, state: B.state, shield: B.shield};   // tests
})(window.Arcade);
