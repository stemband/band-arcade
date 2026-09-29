/* ARCADE QUEST: THE BATTLE SCENE. Turn-based: your turn (PLAY · LISTEN · ITEM · HARMONIZE), then the enemy's turn
   (a dodge). Player HP, enemy HP and the enemy's CALM meter (0–100).
     PLAY       the enemy's challenge (challenges.js). Damage = your power × accuracy × speed; right notes raise CALM.
     LISTEN     its description, weakness and what calms it (some enemies calm down just from being listened to).
     ITEM       Valve Oil (heal), Cork Grease (shield), Metronome (slower next dodge)… (data/items.js)
     HARMONIZE  only with a full CALM meter: its happy-note challenge. Success = it joins your band (bigger rewards).
   Enemy HP 0 = it fades away grumbling (smaller rewards), WHATEVER ITS CALM: the student chooses. A full CALM offers
   HARMONIZE (and says so once: "Its CALM is full: HARMONIZE to befriend it, or keep playing to defeat it."); playing
   on defeats it. `mustHarmonize` (HP stops at 1) is kept for an enemy that must never be defeated; none uses it in
   Episode 1: the Phantom Fermata and the Ghost Conductor have ALTERNATE ROUTES instead (data/enemies.js
   `opensIfFaded`: defeating the Fermata opens the Hidden Passage; the Conductor's `finale` holds him at 1 HP ONCE,
   then HARMONIZE = the best ending, PLAY on = the defeat ending, engine/world.js).
   Your HP 0 = "out of breath": nothing is lost, HP refills.
   YOUR POWER = Q.save.powerAt(level) (engine/save.js): about 14 % more every level. A PLAY does
   power × accuracy × (0.55 + 0.45 × speed) (× 1.3 for the B♭ Blast).
   THE BAND (engine/save.js Q.band: up to 2 befriended ghosts, chosen on the BAND screen; default = the last two
   befriended): a DUET (you + 1) or a TRIO (you + 2). Each companion stands on your side with its own HP bar and name
   (HP = your level's max HP × companion.hp), and after each of YOUR PLAYs plays too: its companion.power × your power ×
   YOUR ACCURACY on that PLAY (a missed PLAY = they wait for your lead), plus its perk (data/enemies.js companion.perk:
   power, calm or heal, also × your accuracy). On the enemy's turn it aims at ONE member of the band at random (you or a
   companion still playing); you still play the dodge, and the sour notes that get through hurt that member. A
   companion at 0 HP is "out of breath" and sits out the rest of the battle (never lost); everyone is back for the next.
   FAIR FIGHTS: the enemy's HP × (1 + 0.3 per companion; a boss 0.45) and HP/atk × its area (data/enemies.js
   QUEST_AREAS). Turns to defeat a standard enemy (30 HP, the manor), playing at 80 % accuracy, 70 % speed (a PLAY =
   power × 0.69; companions .3–.35 power each):
       LV 1  (power 10)   solo 5 turns   trio 4–5 turns (48 HP)
       LV 5  (power 17)   solo 3 turns   trio 3 turns
       LV 10 (power 33)   solo 2 turns   trio 2 turns
   (a boss: the Phantom Fermata, 64 HP (trio 122) at LV 4 (power 15): solo about 7 PLAYs, trio 7: the band shares the
   dodging, not the win). A later area multiplies HP (QUEST_AREAS) to keep fights this length at the levels students
   arrive with.
   Episode 1 adds: `phases` (a boss's challenge changes with each PLAY of it), the B♭ Blast (a second attack once the Butler
   teaches it), the Tuning Slide (boost), `listenBoost`, `mustHarmonize` (HP stops at 1) and per-enemy `music`.
   The FINAL BOSS adds `stages` (the battle changes as its HP drops: each stage's challenge, notes, dodge and opening
   line; quest-boss-phase plays between them), `finale` (at HP 1 its CALM fills and it says these lines: time to
   HARMONIZE), `harmonizeKeep` (a missed HARMONIZE keeps the CALM) and harmonize {type: 'scale'} (the whole concert
   B♭ scale). Key items (`keep` in data/items.js, the Conductor's Baton) aren't used up: once per battle.
   CHARMS (data/items.js QUEST_CHARMS, 2 worn, Q.charms in engine/save.js; ARCADE QUEST ONLY): `calm` × every CALM
   gain, `inTune` × damage of a PLAY at `at` accuracy or better, `block` sour notes blocked per battle (B.mute),
   `dodge` × the enemy notes' speed (dodge.js), `maxHp` (the save's maxHp).
   Q.go('battle', {enemy: 'squawk', back: 'arena'}) or, from the overworld,
   Q.go('battle', {enemy: 'wisp', overrides: {happy: 2}, back: {scene: 'world', args: {...}}}): when it ends, the
   back scene gets args.result = {kind: 'befriend' | 'fade' | 'rest', enemy}. All words: data/battle-text.js. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const RULES = {calmMax: 100, harmonizeMiss: 30, speedWeight: .45, blast: 1.3, breath: .3,
    partyHp: .3, bossPartyHp: .45, compHp: .6};            // enemy HP per companion; a companion's HP share (see the header)
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
    Q.$('qPHpN').textContent = `${Math.max(0, s.hp)}/${s.maxHp} · ${Q.text('power')} ${Q.save.powerAt(s.level)}`;
    Q.$('qLv').textContent = 'LV ' + s.level;
    Q.$('qHudP').classList.toggle('target', B.aim === 'you');
    B.band.forEach((c, i) => {
      const row = Q.$('qComp' + i); if (!row) return;
      row.querySelector('i').style.width = Math.max(0, c.hp / c.maxHp * 100) + '%';
      row.querySelector('small').textContent = c.out ? Q.text('outShort') : `${Math.max(0, c.hp)}/${c.maxHp}`;
      row.classList.toggle('out', c.out); row.classList.toggle('target', B.aim === c);
    });
    Q.$('qShield').hidden = !B.shield && !B.mute; Q.$('qShield').textContent = [B.shield ? `Shield ×${B.shield}` : '', B.mute ? 'Mute ready' : ''].filter(Boolean).join(' · ');
  };
  /** a floating number over the canvas (damage, CALM +) */
  function float(text, x, y, cls) {
    const f = Q.el('span', 'q-float ' + (cls || ''), text);
    f.style.left = `calc(var(--px) * ${x})`; f.style.top = `calc(var(--px) * ${y})`;
    Q.ui.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
  function addCalm(n, say) {
    if (!n) return;
    n *= Q.charms.mult('calm');                                  // the Lucky Reed
    const was = B.calm;
    B.calm = Math.min(RULES.calmMax, B.calm + n); hud();
    if (B.calm >= 50 && was < 50 && B.calm < RULES.calmMax) B.queue.push(B.e.lines.calm);
    if (B.calm > was) { float(`CALM +${Math.round(B.calm - was)}`, 150, 18, 'calm'); Q.sfx('quest-calm'); if (say) B.queue.push(Q.text('calmUp', {name: B.e.name})); }
    if (B.calm >= RULES.calmMax && was < RULES.calmMax) {
      // the first time in a battle: the choice (a story-critical enemy can only be HARMONIZED, so no choice there)
      const choice = !B.choiceSaid && !B.e.mustHarmonize;
      if (choice) B.choiceSaid = true;
      B.queue.push(Q.text(choice ? 'calmChoice' : 'calmFull', {name: B.e.name}));
    }
  }
  const micReady = () => Q.micReady();
  const TYPE_NAME = {play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING'};
  /** the final boss's stage (data/enemies.js `stages`): the first whose `until` (a share of its HP) is still below it */
  const stageIdx = () => { const st = B.e.stages; if (!st) return -1; const f = B.e.hp / B.e.maxHp, i = st.findIndex(s => f > s.until); return i < 0 ? st.length - 1 : i; };
  const stage = () => (B.e.stages ? B.e.stages[stageIdx()] : null);
  /** the enemy as this turn sees it: with its stage's challenge, notes and dodge */
  const foe = () => (stage() ? Object.assign({}, B.e, stage()) : B.e);
  /** this turn's challenge: the enemy's own, its stage's, or its phase (a boss changes challenge each turn) */
  const challengeNow = () => (B.e.stages ? stage().challenge : B.e.phases ? B.e.phases[B.phase % B.e.phases.length] : B.e.challenge);
  /** a new stage of the final boss: its sound and its opening words */
  async function stageStart() {
    const i = stageIdx();
    if (i < 0 || i === B.stageShown) return;
    const first = B.stageShown == null; B.stageShown = i;
    if (!first) { Q.sfx('quest-boss-phase'); Q.shake(3, 300); float(`STAGE ${i + 1}`, 150, 18, 'calm'); }
    await Q.say([].concat(stage().say || []), {name: B.e.name, portrait: B.e.sprite});
  }
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
        onBack: () => { Q.settings.open().then(() => { B.player = Q.playerId(B.member.id); }); }});
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

  /** the enemy takes n (you or a companion); a story-critical enemy (mustHarmonize) holds on at 1 HP */
  function hurtFoe(n) {
    B.e.hp -= n; B.hurtUntil = performance.now() + 450; Q.sfx('quest-enemy-hurt'); Q.shake(2, 180);
    if (B.e.hp >= 1) return;
    if (B.e.finale && !B.finale) {                                // the final boss's finale: he holds on at 1 HP ONCE
      B.e.hp = 1; B.finale = true; B.calm = RULES.calmMax; B.choiceSaid = true;
      B.queue.push(...[].concat(B.e.finale), Q.text('finaleChoice', {name: B.e.name})); Q.sfx('quest-boss-phase');
    } else if (B.e.finale && B.finaleHeldThisPlay) B.e.hp = 1;     // (not in the same PLAY that started the finale)
    else if (B.e.mustHarmonize) {
      B.e.hp = 1;
      if (!B.heldSaid) { B.heldSaid = true; B.queue.push(B.e.lines.hold); }
    }
  }
  /** after each of YOUR PLAYs: every companion still playing plays too, as well as you just did (your accuracy) */
  function bandPlay(res) {
    const active = B.band.filter(c => !c.out);
    if (!active.length) return;
    if (!(res.acc > 0)) { B.queue.push(Q.text('bandRest', {band: bandNames(active)})); return; }
    const power = Q.save.powerAt(B.save.level);
    active.forEach((c, i) => {
      if (B.e.hp <= 0) return;                                  // already fading: nothing left to play against
      const p = c.def.companion, perk = p.perk || {};
      const dmg = Math.max(1, Math.round(power * p.power * res.acc * (perk.power || 1)));
      c.hop = performance.now() + 250 + 300 * i;
      setTimeout(() => { if (B && B.band.includes(c)) float('-' + dmg, 186, 40 + 10 * i, 'dmg band'); }, 250 + 300 * i);
      hurtFoe(dmg);
      B.queue.push(Q.text('bandHit', {band: c.name, name: B.e.name, n: dmg}));
      if (perk.calm) { B.queue.push(Q.text('bandCalm', {band: c.name, name: B.e.name})); addCalm(perk.calm * res.acc); }
      if (perk.heal && B.save.hp < B.save.maxHp) {
        const n = Math.min(B.save.maxHp - B.save.hp, Math.max(1, Math.round(perk.heal * res.acc)));
        B.save.hp += n; float('+' + n, 40, 60, 'heal'); B.queue.push(Q.text('bandHeal', {band: c.name, n}));
      }
    });
    hud();
  }
  const bandNames = list => list.map(c => c.name).join(' and ');

  /* ---------- actions ---------- */
  async function doPlay() {
    const which = await playMenu();
    if (!which) return false;
    const type = challengeNow(), blast = which === 'blast';
    if ((blast || Q.challenge.uses(type)) && !(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    if (B.e.phases && !blast) { await Q.say(Q.text('phase', {n: B.phase % B.e.phases.length + 1, what: TYPE_NAME[Q.challenge.resolve(type)] || 'PLAY'}), {name: B.e.name}); B.phase++; }
    const res = blast ? await Q.challenge.blast(false) : await Q.challenge.run(type, {enemy: foe()});
    if (B === null) return false;
    const power = Q.save.powerAt(B.save.level);
    B.heldSaid = false; B.finaleHeldThisPlay = !B.finale;          // the PLAY that reaches the finale can't also end it
    let dmg = Math.round(power * res.acc * (1 - RULES.speedWeight + RULES.speedWeight * res.speed) * (blast ? RULES.blast : 1));
    const fork = Q.charms.effects().find(e => e.inTune && res.acc >= (e.at || .9));    // the Tuning Fork
    if (fork && dmg > 0) { dmg = Math.round(dmg * fork.inTune); B.queue.push(Q.text('charmInTune')); }
    const boosted = B.boost && dmg > 0 ? B.boost : 0;
    if (boosted) { dmg = Math.round(dmg * boosted); B.boost = 0; }
    if (dmg > 0) {
      hurtFoe(dmg);
      float('-' + dmg, 170, 30, 'dmg'); hud();
      B.queue.unshift(Q.text(res.acc >= .9 ? 'hitGreat' : res.acc >= .5 ? 'hitGood' : 'hitWeak', {name: B.e.name, n: dmg}));
      if (boosted) B.queue.unshift(Q.text('boosted', {n: boosted}));
      if (B.e.hp > 1 && B.e.hp <= B.e.maxHp / 2 && !B.saidHurt) { B.saidHurt = true; B.queue.push(B.e.lines.hurt); }
    } else B.queue.push(Q.text('miss'));
    if (B.finale) hud();
    const perNote = (B.e.calm.perNote || 0) * (B.listened && B.e.listenBoost ? B.e.listenBoost : 1);
    addCalm(perNote * res.correct + (res.success ? B.e.calm.success || 0 : 0), true);
    bandPlay(res);                                              // your band plays along (your accuracy)
    // 0 HP = it fades away, whatever its CALM (run() ends the battle): with a full CALM the student chose to keep playing
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
    if (it.keep && B.kept[id]) { await Q.say(Q.text('keptUsed', {item: it.name})); return false; }            // a key item: once per battle
    if (it.keep) B.kept[id] = true; else B.save.items[id]--;
    Q.save.write(); Q.sfx('quest-item');
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
    if (!B.e.harmonizeKeep) B.calm = Math.max(0, B.calm - RULES.harmonizeMiss);
    hud();
    await Q.say(Q.text('harmonizeFail', {name: B.e.name}));
    return true;
  }

  /* ---------- the enemy's turn: dodge ---------- */
  /** who the enemy aims at this turn: you or a companion still playing, at random ('you' or the companion) */
  const pickAim = () => { const pool = ['you'].concat(B.band.filter(c => !c.out)); return pool[Math.floor(Math.random() * pool.length)]; };
  async function enemyTurn() {
    const aim = B.aim = pickAim(), you = aim === 'you';
    hud();
    await Q.say([Q.pick([].concat(B.e.lines.turn)), you && !B.band.length ? '' : Q.text(you ? 'aimYou' : 'aimBand', {name: B.e.name, band: you ? '' : aim.name}),
      Q.text('dodgeStart')], {name: B.e.name});
    const st = Q.settings.get();
    const res = await Q.dodge.start({enemy: foe(), easy: st.dodge === 'easy', slow: B.slow, shield: B.shield, assist: st.assist,
      mute: B.mute, charm: Q.charms.mult('dodge'),
      onHit: (dmg, blocked) => {
        if (blocked) { float('Blocked!', 150, 80, 'calm'); return; }
        Q.sfx('quest-hurt');
        if (!you) {                                             // a companion takes it; at 0 it sits out (never lost)
          aim.hp = Math.max(0, aim.hp - dmg); float('-' + dmg, 90, 58 + 28 * B.band.indexOf(aim), 'dmg'); hud();
          if (aim.hp <= 0) { aim.out = true; hud(); return 'stop'; }
          return;
        }
        B.save.hp = Math.max(0, B.save.hp - dmg); float('-' + dmg, 40, 58, 'dmg'); hud();
        if (B.save.hp <= 0) return 'stop';
      }});
    B.slow = null; B.shield = res.shieldLeft || 0; B.mute = res.muteLeft || 0; B.aim = null; hud(); Q.save.write();
    const lines = [];
    if (res.damage) lines.push(Q.text(you ? 'dodgeHits' : 'bandHurt', {n: res.damage, band: you ? '' : aim.name}));
    else lines.push(res.muted && !res.blocked ? Q.text('charmMute') : res.blocked ? Q.text('shieldBlock') : you ? Q.text('dodgeClean') : Q.text('bandDodged', {band: aim.name}));
    if (res.damage && res.muted) lines.push(Q.text('charmMute'));
    if (!you && aim.out) lines.push(Q.text('bandOut', {band: aim.name}));
    await Q.say(lines);
  }

  /* ---------- endings ---------- */
  async function rewards(kind) {
    const r = (B.e.rewards || {})[kind] || {xp: 5, tokens: 1}, s = B.save;
    s.xp += r.xp; s.tokens += r.tokens;
    const lines = [Q.text('rewards', {n: r.xp, tokens: r.tokens})];
    if (r.item && ITEMS()[r.item]) { s.items[r.item] = (s.items[r.item] || 0) + 1; lines.push(Q.text('gotItem', {item: ITEMS()[r.item].name})); }
    if (kind === 'befriend') Object.keys(Q.charms.list()).forEach(id => {       // a charm for befriending this ghost
      const c = Q.charms.get(id); if (c.reward === B.e.id && Q.charms.give(id)) { lines.push(Q.text('gotCharm', {item: c.name})); Q.sfx('charm-equip'); }
    });
    const breath = Math.min(s.maxHp - s.hp, Math.ceil(s.maxHp * RULES.breath));   // a breather after every battle won
    if (breath > 0) { s.hp += breath; lines.push(Q.text('breath', {n: breath})); }
    let up = false;
    const powerWas = Q.save.powerAt(s.level);
    while (s.xp >= Q.save.xpToNext(s.level)) { s.xp -= Q.save.xpToNext(s.level); s.level++; Q.charms.fixHp(s); s.hp = s.maxHp; up = true; }
    s.battles = s.battles || {won: 0, befriended: 0, faded: 0};
    s.battles.won++; s.battles[kind === 'befriend' ? 'befriended' : 'faded']++;
    Q.save.write(); hud();
    await Q.say(lines);
    if (up) { Q.sfx('quest-levelup'); await Q.say(Q.text('levelUp', {n: s.level, from: powerWas, to: Q.save.powerAt(s.level)})); }
  }
  async function befriend() {
    B.state = 'friend'; Q.sfx('quest-befriend');
    if (!B.save.roster.includes(B.e.id)) B.save.roster.push(B.e.id);
    if (B.e.opens) Q.save.setFlag(B.e.opens);                  // e.g. the Phantom Fermata opens the attic
    Q.save.achievements();                                      // skins: every kind of manor ghost befriended
    Q.save.write();
    await Q.say([B.e.lines.befriend.replace(/\{you\}/g, B.member.short).replace(/\{hero\}/g, Q.hero()), Q.text('befriended', {name: B.e.name})], {name: B.e.name, portrait: B.e.sprite});
    await rewards('befriend');
  }
  async function fade() {
    B.state = 'fading'; B.fadeAt = performance.now(); Q.sfx('quest-fade');
    if (B.e.opensIfFaded) Q.save.setFlag(B.e.opensIfFaded);    // THE ALTERNATE ROUTE (the Fermata: the Hidden Passage)
    await Q.say([B.e.lines.fade, Q.text('faded', {name: B.e.name})]);
    await rewards('fade');
  }

  async function run() {
    const b = B;
    await Q.say(b.e.lines.intro);
    while (B === b) {
      await stageStart();
      if (B !== b) return;
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
      A.store.noteActivity({game: 'arcade-quest', play: 1});      // seasonal events: a game played today
      // THE BAND (everyone at full HP: they refill after every battle) and a fight that stays fair for its size
      const band = Q.band.members().filter(id => id !== src.id).map(id => {
        const def = Q.band.enemy(id), maxHp = Math.max(4, Math.round(Q.save.maxHpAt(save.level) * (def.companion.hp || RULES.compHp)));
        return {id, def, name: def.name, sprite: def.sprite, maxHp, hp: maxHp, out: false, hop: 0};
      });
      const area = (window.QUEST_AREAS || {})[src.area || (src.test ? 'test' : '')] || {hp: 1, atk: 1};
      const hp = Math.round(src.hp * (area.hp || 1) * (1 + (src.boss ? RULES.bossPartyHp : RULES.partyHp) * band.length));
      B = {e: Object.assign({}, src, {maxHp: hp, hp, atk: (src.atk || 2) * (area.atk || 1)}), save, member, back, band, aim: null, calm: 0, kept: {}, stageShown: null, finale: false, shield: 0, mute: Q.charms.sum('block'), slow: null, boost: 0, round: 0, phase: 0, listened: false, queue: [], state: 'fight', hurtUntil: 0,
        player: Q.playerId(member.id)};
      Q.ui.innerHTML = `<div class="q-hud">` +
        `<div class="q-hud-e"><p class="q-hname">${src.name}</p><div class="q-bar hp"><i id="qEHp"></i></div><small id="qEHpN"></small>` +
        `<div class="q-calm" id="qCalmBox"><span>CALM</span><div class="q-bar calm"><i id="qCalm"></i></div></div></div>` +
        `<div class="q-hud-p" id="qHudP"><p class="q-hname">${member.short} <span id="qLv"></span>${B.band.length ? ` <span class="q-party">${Q.text(B.band.length > 1 ? 'bandTrio' : 'bandDuet')}</span>` : ''}</p>` +
        `<div class="q-bar php"><i id="qPHp"></i></div><small id="qPHpN"></small><small class="q-shield" id="qShield" hidden></small>` +
        B.band.map((c, i) => `<div class="q-comp" id="qComp${i}"><span class="q-cname">${c.name}</span><div class="q-bar chp"><i></i></div><small></small></div>`).join('') + `</div></div>` +
        `<p class="q-mictag" id="qMicTag" hidden><span class="q-dot"></span> The mic is listening</p>` +
        `<button type="button" class="q-gear" id="qGear" aria-label="Settings">⚙</button>` +
        `<p class="q-prompt" id="qPrompt" hidden></p><div class="q-cmd" id="qCmd" hidden></div>`;
      Q.$('qGear').addEventListener('click', () => Q.settings.open().then(() => { if (B) B.player = Q.playerId(member.id); }));
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
      // your band beside you (happy faces; out of breath = faded; a little hop when they play)
      if (!dodging) B.band.forEach((c, i) => {
        const hop = now < c.hop && now > c.hop - 250 && !Q.reduced() ? -3 : 0;
        Q.draw(ctx, c.sprite, 72, 60 + 28 * i + hop, {t: now, frame: 2, alpha: c.out ? .35 : 1});
      });
      // you
      if (!dodging) Q.draw(ctx, B.player, 6, B.band.length ? 58 : 52, {scale: 2, t: now});   // switches to its PLAYING pose during a challenge
      Q.dodge.draw(ctx, now);
    },
  };
  Q.battleState = () => B && {hp: B.e.hp, ehp: B.e.maxHp, atk: B.e.atk, calm: B.calm, php: B.save.hp, maxHp: B.save.maxHp, state: B.state, shield: B.shield, mute: B.mute,
    power: Q.save.powerAt(B.save.level), aim: B.aim && (B.aim === 'you' ? 'you' : B.aim.id),
    band: B.band.map(c => ({id: c.id, hp: c.hp, maxHp: c.maxHp, out: c.out}))};   // tests
})(window.Arcade);
