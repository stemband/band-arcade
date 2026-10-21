/* ARCADE QUEST: THE BATTLE SCENE. Turn-based: your turn (PLAY · SERENADE · LISTEN · ITEM · HARMONIZE), then the enemy's
   turn (a dodge). Player HP, enemy HP and the enemy's CALM meter (0–100). TWO WAYS TO WIN, about equally long:
   DEFEAT (PLAY until its HP is 0) or BEFRIEND (SERENADE until its CALM is full, then HARMONIZE).
     PLAY       the enemy's challenge (challenges.js). Damage = your power × accuracy × speed; right notes raise CALM a little.
     SERENADE   its happy note (HARMONIZE's challenge, shorter; the Snare Drum: a gentle, steady beat). CALM +=
                RULES.serenadeCalm × accuracy × the CALM SCALE; NO damage. Your band follows your lead: after a
                SERENADE each companion adds CALM (your CALM × its companion.power, + its calm perk) instead of playing
                at the enemy. Not against the final boss (`serenade: false`: his finale is the story's own).
     LISTEN     its description, weakness and what calms it (some enemies calm down just from being listened to), and
                "It calms down when you play its happy notes: SERENADE." The first battle ever says the two ways once.
     ITEM       Valve Oil (heal), Cork Grease (shield), Metronome (slower next dodge)… (data/items.js)
     HARMONIZE  only with a full CALM meter: its happy-note challenge. Success = it joins your band (bigger rewards).
   Enemy HP 0 = it fades away grumbling (smaller rewards), WHATEVER ITS CALM: the student chooses. A full CALM offers
   HARMONIZE (and says so once: "Its CALM is full: HARMONIZE to befriend it, or keep playing to defeat it."); playing
   on defeats it. `mustHarmonize` (HP stops at 1) is kept for an enemy that must never be defeated; none uses it in
   Episode 1: the Phantom Fermata and the Ghost Conductor have ALTERNATE ROUTES instead (data/enemies.js
   `opensIfFaded`: defeating the Fermata opens the Hidden Passage; the Conductor's `finale` holds him at 1 HP ONCE,
   then HARMONIZE = the best ending, PLAY on = the defeat ending, engine/world.js).
   THE SAFETY NET (once per battle, not the final boss, and ONLY after at least one SERENADE this battle: a PLAY-only
   battle always ends at 0 HP): a PLAY that would bring its HP to 0 while CALM ≥ RULES.netCalm (50) leaves it at 1 HP: "It's barely standing… but it's listening." + "SERENADE to befriend it, or PLAY to finish
   it." The next PLAY defeats it; SERENADE / HARMONIZE carry on the befriend path.
   THE CALM SCALE (B.calmScale): every CALM gain but LISTEN's (SERENADE, PLAY's per-note/success CALM, the companions')
   × powerAt(level) / powerAt(1) × RULES.calmRef (30) / its HP (base × area × band size), so CALM rises exactly like
   damage: befriending stays as long as defeating at every level, area and band size.
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
   QUEST_AREAS). THE TURNS TABLE: a standard enemy (30 HP, the manor; a trio fights 48 HP), playing at 80 % accuracy,
   70 % speed (a PLAY = power × 0.69; companions .3 power each; a SERENADE = 38 × .8 × the CALM SCALE, companions .3
   of yours). DEFEAT = PLAYs until 0 HP; BEFRIEND = SERENADEs until CALM 100, + 1 HARMONIZE:
                          DEFEAT (solo / trio)   BEFRIEND (solo / trio)
       LV 1  (power 10)   5 / 5 turns            4 + 1 = 5 / 4 + 1 = 5 turns
       LV 5  (power 17)   3 / 3 turns            2 + 1 = 3 / 2 + 1 = 3 turns
       LV 10 (power 33)   2 / 2 turns            1 + 1 = 2 / 1 + 1 = 2 turns
   CRITICAL HITS (PLAY and the B♭ Blast, RULES.crit*): at 80 % a LUCKY CRIT (1 in 12, × 1.5) adds about 4 % to the
   average PLAY, so the table above is unchanged. A SKILL CRIT (95 % accuracy and 80 % speed: always × 1.5; your band
   × 1.2 that turn, never a crit of its own) and a PERFECT SERENADE (95 %+: CALM × 1.5) reward a near-perfect player
   (100 %, 90 % speed; measured with the same rounding):
                          DEFEAT solo / trio        BEFRIEND solo / trio
       LV 1               3 → 2 / 3 → 3 turns       4 → 3 / 4 → 3 turns
       LV 5, LV 10        unchanged (2 / 2 and 1 / 1: already the fewest turns) and befriend 3 / 3, 2 / 2
   (a boss: the Phantom Fermata, 64 HP (trio 122) at LV 4 (power 15): solo about 7 PLAYs, trio 7: the band shares the
   dodging, not the win). A later area multiplies HP (QUEST_AREAS) to keep fights this length at the levels students
   arrive with.
   Episode 1 adds: `phases` (a boss's challenge changes with each PLAY of it), the B♭ Blast (a second attack once the Butler
   teaches it; Episode 2's E♭ ENCORE from Professor Hoot the same way, flag songEb, × RULES.encore; both in PLAY's
   menu in both episodes), the Tuning Slide (boost), `listenBoost`, `mustHarmonize` (HP stops at 1) and per-enemy `music`.
   The FINAL BOSS adds `stages` (the battle changes as its HP drops: each stage's challenge, notes, dodge and opening
   line; quest-boss-phase plays between them), `finale` (at HP 1 its CALM fills and it says these lines: time to
   HARMONIZE), `harmonizeKeep` (a missed HARMONIZE keeps the CALM) and harmonize {type: 'scale'} (the whole concert
   B♭ scale). Key items (`keep` in data/items.js, the Conductor's Baton) aren't used up: once per battle.
   CHARMS (data/items.js QUEST_CHARMS, 2 worn, Q.charms in engine/save.js; ARCADE QUEST ONLY): `calm` × every CALM
   gain, `inTune` × damage of a PLAY at `at` accuracy or better, `block` sour notes blocked per battle (B.mute),
   `dodge` × the enemy notes' speed (dodge.js), `maxHp` (the save's maxHp), `party` × the damage of your PLAY and of
   every companion's hit (the Hamburger Charm: × 2), `quickPlay` = QUICK PLAY in PLAY's menu.
   INSTRUMENT TIERS and UPGRADES (engine/save.js Q.gear; designed by a Raven Band student): the best tier you own
   (Rusty, Metal, Diamond) + your POWER UP / CALM UP steps ADD into one share, then multiply like a charm: YOUR damage
   × Q.gear.dmgMult() (PLAY, the B♭ Blast, the E♭ Encore, each QUICK PLAY hit: last, after the Tuning Fork, the
   boost, a crit and the Hamburger's party, each step rounded), never your band's hits; every CALM gain but LISTEN's ×
   Q.gear.calmMult() (addCalm, the Lucky Reed's hook: yours, PLAY's small CALM and your band's after a SERENADE). The
   HUD's name shows the tier as a small badge (a rust dot, a steel dot, a diamond: it sparkles slowly, still under
   reduced motion). NOTE SHARDS: a battle started from the map (engine/world.js) knows the Shards it gives the first
   time (`shards`) and says so with its rewards; world.js adds them with the enemy's `done` record.
   THE BAND'S SPECIALS (data/enemies.js companion.special; designed by a Raven Band student): each companion has a
   SPECIAL meter (a thin gold bar under its HP; empty at the start of every battle). Each of your PLAYs, moves, QUICK
   PLAYs and SERENADEs fills it by RULES.specialFill × your accuracy; when it's full, that companion's next turn is its
   SPECIAL instead (the meter empties): a big hit, several hits, an ECHO that hits at the start of each of the enemy's
   turns (stacking; never below 1 HP or past the Final Stand's floor: only your PLAY finishes it), a heal for everyone,
   a shield, a slower next dodge or CALM. After a SERENADE a damage special adds CALM instead (RULES.specialCalm), so
   befriending keeps up with defeating.
   THE MOVES (data/items.js QUEST_MOVES; designed by a Raven Band student): BOP ATTACK (LV 3), STRONGER BLOW (LV 5), BIG
   BLAST (LV 8), ULTRA CANNON (LV 10) in PLAY's menu, each ONCE PER BATTLE (B.moved): its own short challenge
   (challenges.js Q.challenge.move) and a PLAY's damage × its mult (crits, the Tuning Fork, a boost, party, gear); your
   band plays along after it. A level-up that reaches one says so (moveNew). Q.moves() = the ones your level reached.
   QUICK PLAY (the Hamburger Charm; designed by a Raven Band student): concert E♭ three times (RULES.quick; the snare:
   3 clean taps), each note played = one regular PLAY hit (power × its accuracy × speed, the Tuning Fork, crits, ×
   party), a missed note = a miss for that hit only; your band plays along once, after the last. It's your turn
   (the band's turn follows) and it keeps the finale's rules and the Final Stand's floor like PLAY.
   THE FINAL STAND (THE BIG NUMBER's `finalStand`, data/enemies.js; designed by a Raven Band student): the first time
   its HP would reach `at` × its max (your PLAY, a QUICK PLAY or your band's hits) it STOPS THERE, and on the band's next
   turn it makes its stand instead of a normal turn: quest-boss-phase, Maestro Moose's line, the FINAL STAND card,
   then ONE dodge of its `parts` back to back (60 s), its notes × `speed` and × `dmg`, always aimed at you (your band
   cheers you on). Each part: its member lit, their line in a small banner (the dodge keeps going), quest-fs-part;
   the seconds left on screen. Survive and the static cracks: the finale (HP 1, CALM full, its lines, the choice).
   Out of breath: HP back to full and the Final Stand again from its first part (never `outOfBreath`; after the
   second miss, once, the Easy / Assist tip). Leaving the battle loses it as always; nothing of it is saved.
   Q.go('battle', {enemy: 'squawk', back: 'arena'}) or, from the overworld,
   Q.go('battle', {enemy: 'wisp', overrides: {happy: 2}, back: {scene: 'world', args: {...}}}): when it ends, the
   back scene gets args.result = {kind: 'befriend' | 'fade' | 'rest', enemy}. All words: data/battle-text.js. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const RULES = {calmMax: 100, harmonizeMiss: 30, speedWeight: .45, blast: 1.3, encore: 1.3, breath: .3,
    partyHp: .3, bossPartyHp: .45, compHp: .6,             // enemy HP per companion; a companion's HP share (see the header)
    serenadeCalm: 38,                                      // SERENADE: CALM = this × accuracy × the CALM SCALE (see the header)
    compCalm: 1,                                           // after a SERENADE a companion adds your CALM × its companion.power × this (+ its calm perk)
    calmRef: 30,                                           // the CALM SCALE's reference HP (a standard enemy)
    netCalm: 50,                                           // THE SAFETY NET: after a SERENADE, a PLAY that would defeat it with CALM ≥ this holds it at 1 HP (once)
    // CRITICAL HITS (PLAY and the B♭ Blast): a SKILL CRIT at critSkill accuracy AND critSpeed speed, always; otherwise a
    // LUCKY CRIT at critLuckyFrom accuracy or better, 1 in 12 (critChance; the Sharp Ear charm: 1 in 6). × critMult;
    // your band hits × critBand that turn. PERFECT SERENADE: accuracy ≥ perfectSerenade = CALM × perfectMult
    critSkill: .95, critSpeed: .8, critLuckyFrom: .7, critChance: 1 / 12, critMult: 1.5, critBand: 1.2,
    perfectSerenade: .95, perfectMult: 1.5,
    quick: {notes: 3, time: 9},
    // MAT: TUNE: THE BAND'S SPECIALS: each of your PLAYs / moves / SERENADEs fills every playing companion's SPECIAL
    // meter by specialFill × your accuracy (100 = full: its special instead of its usual turn, about every 3rd turn at
    // 100 %); specialCalm = the CALM a damage special adds after a SERENADE, per share of your power (≈ the same work)
    specialFill: 36, specialCalm: 33,                            // MAT: TUNE: QUICK PLAY (the Hamburger Charm): concert E♭ × notes, in time seconds
    fsCardMs: 1400, fsBannerMs: 3500};                    // MAT: TUNE: THE FINAL STAND's title card and each part's banner (ms)
  const ENEMIES = () => window.QUEST_ENEMIES, ITEMS = () => window.QUEST_ITEMS;
  let B = null;                                               // the battle in progress
  const INTRO_SLIDE = 550;                                     // ms: the band sliding in beside you (THE LINEUP)

  const hud = () => {
    if (!B) return;
    const e = B.e, s = B.save;
    Q.$('qEHp').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    Q.$('qEHpN').textContent = `${Math.max(0, Math.ceil(e.hp))}/${e.maxHp}`;
    Q.$('qCalm').style.width = Math.min(100, B.calm) + '%';
    Q.$('qCalmBox').classList.toggle('full', B.calm >= RULES.calmMax);
    Q.$('qPHp').style.width = Math.max(0, s.hp / s.maxHp * 100) + '%';
    Q.$('qPHpN').textContent = `${Math.max(0, s.hp)}/${s.maxHp} · ${Q.text('power')} ${Q.save.powerAt(s.level)}`;
    const lv = Q.$('qLv'); if (lv.textContent !== 'LV ' + s.level) { lv.textContent = 'LV ' + s.level; Q.fitText(lv.parentElement); }
    Q.$('qHudP').classList.toggle('target', B.aim === 'you');
    B.band.forEach((c, i) => {
      const row = Q.$('qComp' + i); if (!row) return;
      row.querySelector('i').style.width = Math.max(0, c.hp / c.maxHp * 100) + '%';
      row.querySelector('small').textContent = c.out ? Q.text('outShort') : `${Math.max(0, c.hp)}/${c.maxHp}`;
      row.classList.toggle('out', c.out); row.classList.toggle('target', B.aim === c);
      const sp = row.querySelector('.q-sp i'); if (sp) { sp.style.width = Math.min(100, c.sp) + '%'; row.classList.toggle('sp-full', c.sp >= 100); }
    });
    Q.$('qShield').hidden = !B.shield && !B.mute; Q.$('qShield').textContent = [B.shield ? `Shield ×${B.shield}` : '', B.mute ? 'Mute ready' : ''].filter(Boolean).join(' · ');
  };
  /** THE TIER BADGE before your name (style.css .q-tier: a rust dot, a steel dot, a diamond with a slow sparkle) */
  const tierBadge = member => { const t = Q.gear.best(), name = Q.gear.name(t.id, member);
    return `<i class="q-tier q-tier-${t.badge || t.id}" id="qTier" role="img" aria-label="${name}" title="${name}"></i>`; };
  /** a floating number over the canvas (damage, CALM +) */
  function float(text, x, y, cls) {
    const f = Q.el('span', 'q-float ' + (cls || ''), text);
    f.style.left = `calc(var(--px) * ${x})`; f.style.top = `calc(var(--px) * ${y})`;
    Q.ui.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
  function addCalm(n, say, {listen = false} = {}) {
    if (!n) return;
    n *= Q.charms.mult('calm');                                  // the Lucky Reed
    if (!listen) n *= Q.gear.calmMult();                         // YOUR INSTRUMENT + CALM UP (never LISTEN's flat CALM)
    if (B.lastKind === 'longtone') n *= Q.charms.mult('toneCalm'); // the Rosin Pouch: CALM from long tones
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
  const TYPE_NAME = {play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING', rhythm: 'RHYTHM', tempo: 'TEMPO', echo: 'ECHO'};
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
    // (THE BIG NUMBER: each stage is one band member's: their name and portrait, `who` / `portrait`)
    await Q.say([].concat(stage().say || []), {name: stage().who || B.e.name, portrait: stage().portrait || B.e.sprite});
  }
  /** PLAY: once the Butler taught the B♭ Blast (songBb) or Professor Hoot the E♭ Encore (songEb), pick the enemy's
      challenge or a song */
  function playMenu() {
    const songs = [].concat(Q.save.flag('songBb') ? [{id: 'blast', label: Q.text('blast'), sub: Q.text('blastSub'), cls: 'c-play'}] : [],
      Q.save.flag('songEb') ? [{id: 'encore', label: Q.text('encore'), sub: Q.text('encoreSub'), cls: 'c-play'}] : [],
      Q.charms.effects().some(e => e.quickPlay) ? [{id: 'quick', label: Q.text('quick'), sub: Q.text('quickSub'), cls: 'c-play'}] : [],   // (the Hamburger Charm)
      // THE MOVES (data/items.js QUEST_MOVES): every move your level has reached, once per battle
      Q.moves().map(m => ({id: 'move:' + m.id, label: m.name, sub: B.moved[m.id] ? Q.text('moveUsed') : Q.text('moveSub' + m.id[0].toUpperCase() + m.id.slice(1)), cls: 'c-play c-move', disabled: !!B.moved[m.id]})));
    if (!songs.length) return Promise.resolve('main');
    return new Promise(done => {
      const cmd = Q.$('qCmd'); cmd.hidden = false;
      const t = Q.challenge.resolve(challengeNow());
      const items = [{id: 'main', label: TYPE_NAME[t] || 'PLAY', sub: Q.text('playSub')}].concat(songs, [{id: null, label: Q.text('back'), cls: 'c-back'}]);
      const many = items.length > 5;                               // (the moves: a second row, shorter buttons)
      const m = Q.menu(cmd, items, {cols: many ? Math.ceil(items.length / 2) : items.length, cls: many ? 'q-movesmenu' : '', label: Q.text('playWhich'),
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
      ].concat(canSerenade() ? [{id: 'serenade', label: Q.text('serenade'), sub: Q.text('serenadeSub'), cls: 'c-ser'}] : [], [
        {id: 'listen', label: Q.text('listen'), sub: Q.text('listenSub'), cls: 'c-listen'},
        {id: 'item', label: Q.text('item'), sub: Q.text('itemSub'), cls: 'c-item'},
        {id: 'harmonize', label: Q.text('harmonize'), sub: canHarm ? Q.text('harmonizeSub') : Q.text('harmonizeLocked'), cls: 'c-harm' + (canHarm ? ' ready' : ''), disabled: !canHarm},
      ]), {cols: canSerenade() ? 5 : 4, cls: canSerenade() ? 'q-five' : '', label: 'Your turn', start: B.lastCmd || 0,
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
      const m = Q.menu(cmd, items, {cols: Math.min(4, items.length), label: 'Items', cls: 'q-items',
        onPick: it => { m.destroy(); cmd.hidden = true; done(it.id); }, onBack: () => { m.destroy(); cmd.hidden = true; done(null); }});
    });
  }

  /** the enemy takes n (you or a companion); a story-critical enemy (mustHarmonize) holds on at 1 HP */
  function hurtFoe(n) {
    B.e.hp -= n; B.hurtUntil = performance.now() + 450; Q.sfx('quest-enemy-hurt'); Q.shake(2, 180);
    // THE FINAL STAND's floor: no hit (yours, a QUICK PLAY's, your band's) can jump past it; it starts on their turn
    if (B.e.finalStand && !B.fsDone && B.e.hp <= fsFloor()) { B.e.hp = fsFloor(); B.fsPending = true; return; }
    if (B.e.hp >= 1) return;
    if (B.e.finale && !B.finale) {                                // the final boss's finale: he holds on at 1 HP ONCE
      B.e.hp = 1; B.finale = true; B.calm = RULES.calmMax; B.choiceSaid = true;
      B.queue.push(...[].concat(B.e.finale), Q.text(B.e.finaleChoice || 'finaleChoice', {name: B.e.name})); Q.sfx('quest-boss-phase');
    } else if (B.e.finale && B.finaleHeldThisPlay) B.e.hp = 1;     // (not in the same PLAY that started the finale)
    else if (B.e.finale) return;
    else if (B.netThisPlay) B.e.hp = 1;                           // (your band can't finish it in the same PLAY either)
    else if (!B.netUsed && !B.e.mustHarmonize && B.serenaded && B.calm >= RULES.netCalm) {
      // THE SAFETY NET (once per battle, only after the student has SERENADEd: they're trying to befriend it; a
      // PLAY-only battle ends at 0 HP, even though PLAY raises CALM a little): it holds on at 1 HP; the next PLAY defeats it
      B.e.hp = 1; B.netUsed = B.netThisPlay = true;
      B.queue.push(Q.text('netLine', {name: B.e.name}), Q.text('netHint', {name: B.e.name}));
    } else if (B.e.mustHarmonize) {
      B.e.hp = 1;
      if (!B.heldSaid) { B.heldSaid = true; B.queue.push(B.e.lines.hold); }
    }
  }
  /** after each of YOUR PLAYs: every companion still playing plays too, as well as you just did (your accuracy) */
  function bandPlay(res, crit) {
    const active = B.band.filter(c => !c.out);
    if (!active.length) return;
    if (!(res.acc > 0)) { B.queue.push(Q.text('bandRest', {band: bandNames(active)})); return; }
    const power = Q.save.powerAt(B.save.level);
    active.forEach((c, i) => {
      if (B.e.hp <= 0) return;                                  // already fading: nothing left to play against
      if (fillSpecial(c, res.acc)) { special(c, res.acc, 'play', i); return; }   // THE BAND'S SPECIALS: a full meter
      const p = c.def.companion, perk = p.perk || {};
      const dmg = Math.max(1, Math.round(power * p.power * res.acc * (perk.power || 1) * (crit ? RULES.critBand : 1) * Q.charms.mult('party')));   // they follow your lead: never a crit of their own (× party: the Hamburger Charm)
      c.hop = performance.now() + 250 + 300 * i;
      setTimeout(() => { if (B && B.band.includes(c)) float('-' + dmg, 186, 40 + 10 * i, 'dmg band'); }, 250 + 300 * i);
      hurtFoe(dmg);
      B.queue.push(Q.text('bandHit', {band: c.name, name: B.e.name, n: dmg}));
      if (perk.calm) { B.queue.push(Q.text('bandCalm', {band: c.name, name: B.e.name})); addCalm(perk.calm * res.acc * B.calmScale); }
      if (perk.heal && B.save.hp < B.save.maxHp) {
        const n = Math.min(B.save.maxHp - B.save.hp, Math.max(1, Math.round(perk.heal * res.acc)));
        B.save.hp += n; float('+' + n, 40, 60, 'heal'); B.queue.push(Q.text('bandHeal', {band: c.name, n}));
      }
    });
    hud();
  }
  const bandNames = list => list.map(c => c.name).join(' and ');
  /* ---------- THE BAND'S SPECIALS (designed by a Raven Band student; data/enemies.js companion.special) ---------- */
  /** your turn fills this companion's meter (× your accuracy); true = it was full: its SPECIAL now (the meter empties) */
  function fillSpecial(c, acc) {
    if (!c.def.companion.special) return false;
    c.sp = Math.min(100, (c.sp || 0) + RULES.specialFill * (acc || 0));
    if (c.sp < 100) return false;
    c.sp = 0; return true;
  }
  /** a companion's SPECIAL. After a PLAY its damage lands (one big hit, several hits, or an echo that keeps hitting at
      the start of each of its turns); after a SERENADE the same work becomes CALM. Heal, shield, slow and calm work
      either way. Everything × your accuracy (they follow your lead) and × party (the Hamburger), never a crit. */
  function special(c, acc, mode, i) {
    const sp = c.def.companion.special, power = Q.save.powerAt(B.save.level), party = Q.charms.mult('party');
    c.hop = performance.now() + 250 + 300 * i;
    Q.sfx('quest-crit');
    setTimeout(() => { if (B && B.band.includes(c)) float(Q.text('specialFloat'), 176, 34 + 10 * i, 'special'); }, 150 + 300 * i);
    B.queue.push(Q.text('specialGo', {band: c.name, special: sp.name}), sp.say);
    const shareDmg = (sp.hit || 0) + (sp.hits ? sp.hits * (sp.share || 0) : 0);
    if (mode === 'play') {
      const one = share => Math.max(1, Math.round(power * share * acc * party));
      if (sp.hit) { const d = one(sp.hit); hurtFoe(d); later(() => float('-' + d, 186, 40 + 10 * i, 'dmg band'), 250 + 300 * i); B.queue.push(Q.text('specialHit', {special: sp.name, name: B.e.name, n: d})); }
      if (sp.hits) {
        let total = 0;
        for (let k = 0; k < sp.hits && B.e.hp > 0; k++) { const d = one(sp.share); total += d; hurtFoe(d); later(() => float('-' + d, 180 + 6 * k, 30 + 7 * k, 'dmg band'), 250 + 180 * k); }
        B.queue.push(Q.text('specialHits', {special: sp.name, k: sp.hits, name: B.e.name, n: total}));
      }
      if (sp.dot && B.e.hp > 0) {
        const per = one(sp.dot.share);
        B.dots.push({name: sp.name, per, turns: sp.dot.turns});
        B.queue.push(Q.text('specialDot', {name: B.e.name, n: per, t: sp.dot.turns}));
      }
    } else if (shareDmg || sp.dot) {                            // after a SERENADE: the same work, as CALM
      addCalm((shareDmg + (sp.dot ? sp.dot.share * sp.dot.turns : 0)) * RULES.specialCalm * acc * B.calmScale);
      B.queue.push(Q.text('specialCalm', {special: sp.name, name: B.e.name}));
    }
    if (sp.calm) addCalm(sp.calm * acc * B.calmScale);
    if (sp.heal) {
      const n = Math.max(1, Math.round(B.save.maxHp * sp.heal * acc)), was = B.save.hp;
      B.save.hp = Math.min(B.save.maxHp, B.save.hp + n);
      B.band.forEach(m => { if (!m.out) m.hp = Math.min(m.maxHp, m.hp + Math.max(1, Math.round(m.maxHp * sp.heal * acc))); });
      if (B.save.hp > was) float('+' + (B.save.hp - was), 40, 60, 'heal');
      B.queue.push(Q.text('specialHeal', {special: sp.name}));
    }
    if (sp.shield) { B.shield += sp.shield; B.queue.push(Q.text('itemShield', {n: B.shield})); }
    if (sp.slow) { B.slow = Math.min(B.slow || 1, sp.slow); B.queue.push(Q.text('specialSlow', {name: B.e.name})); }
    hud();
  }
  const later = (f, ms) => setTimeout(() => { if (B) f(); }, ms);
  /** THE ECHOES (a special's `dot`): at the start of the enemy's turn each one hits, then counts down. They stack, and
      never bring it below 1 HP (nor past THE FINAL STAND's floor, nor into the finale): only your PLAY finishes it */
  async function echoes() {
    if (!B.dots.length) return;
    const lo = B.finale ? Infinity : B.e.finalStand && !B.fsDone ? fsFloor() + 1 : 1;
    const lines = [];
    B.dots.forEach(d => {
      const n = Math.min(d.per, Math.max(0, Math.ceil(B.e.hp) - lo));
      d.turns--;
      if (n <= 0) return;
      B.e.hp -= n; B.hurtUntil = performance.now() + 450; Q.sfx('quest-enemy-hurt');
      float('-' + n, 176, 46, 'dmg echo'); lines.push(Q.text('echoHit', {special: d.name, name: B.e.name, n}));
    });
    B.dots = B.dots.filter(d => d.turns > 0);
    hud();
    if (lines.length) await Q.say(lines);
  }
  /** after a SERENADE: your band follows your lead and plays softly too: CALM instead of damage (your accuracy) */
  function bandSerenade(res, gain) {
    const active = B.band.filter(c => !c.out);
    if (!active.length) return;
    if (!(gain > 0)) { B.queue.push(Q.text('bandRest', {band: bandNames(active)})); return; }
    active.forEach((c, i) => {
      if (fillSpecial(c, res.acc)) { special(c, res.acc, 'serenade', i); return; }   // THE BAND'S SPECIALS: a full meter
      const p = c.def.companion, perk = p.perk || {};
      const n = gain * p.power * RULES.compCalm + (perk.calm ? perk.calm * res.acc * B.calmScale : 0);
      c.hop = performance.now() + 250 + 300 * i;
      B.queue.push(Q.text('bandSerenade', {band: c.name, name: B.e.name}));
      addCalm(n);
      if (perk.heal && B.save.hp < B.save.maxHp) {
        const h = Math.min(B.save.maxHp - B.save.hp, Math.max(1, Math.round(perk.heal * res.acc)));
        B.save.hp += h; float('+' + h, 40, 60, 'heal'); B.queue.push(Q.text('bandHeal', {band: c.name, n: h}));
      }
    });
    hud();
  }
  /** SERENADE is offered to every enemy but the final boss (his finale is the story's own befriending moment) */
  const canSerenade = () => B.e.serenade !== false;

  /** a critical hit? 'skill' (a near-perfect, quick PLAY), 'lucky' (a good one, by chance) or null */
  function critOf(res) {
    if (res.acc >= RULES.critSkill && res.speed >= RULES.critSpeed) return 'skill';
    const chance = Math.max(RULES.critChance, ...Q.charms.effects().map(e => e.crit || 0));    // the Sharp Ear charm
    return res.acc >= RULES.critLuckyFrom && Math.random() < chance ? 'lucky' : null;
  }

  /* ---------- actions ---------- */
  async function doPlay() {
    const which = await playMenu();
    if (!which) return false;
    if (which === 'quick') return doQuick();
    const move = which.startsWith('move:') ? Q.moves().find(m => 'move:' + m.id === which) : null;
    const type = challengeNow(), blast = which === 'blast', encore = which === 'encore', song = blast || encore || !!move;
    if ((song || Q.challenge.uses(type)) && !(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    if (B.e.phases && !song) { await Q.say(Q.text('phase', {n: B.phase % B.e.phases.length + 1, what: TYPE_NAME[Q.challenge.resolve(type)] || 'PLAY'}), {name: B.e.name}); B.phase++; }
    if (move) B.moved[move.id] = true;                           // once per battle (set as its challenge starts)
    const res = blast ? await Q.challenge.blast(false) : encore ? await Q.challenge.encore(false) : move ? await Q.challenge.move(move) : await Q.challenge.run(type, {enemy: foe()});
    if (B) B.lastKind = res.kind || null;                        // (the Rosin Pouch: long tones)
    if (B === null) return false;
    const power = Q.save.powerAt(B.save.level);
    B.heldSaid = false; B.finaleHeldThisPlay = !B.finale; B.netThisPlay = false;          // the PLAY that reaches the finale can't also end it
    let dmg = Math.round(power * res.acc * (1 - RULES.speedWeight + RULES.speedWeight * res.speed) * (blast ? RULES.blast : encore ? RULES.encore : move ? move.mult : 1));
    const fork = Q.charms.effects().find(e => e.inTune && res.acc >= (e.at || .9));    // the Tuning Fork
    if (fork && dmg > 0) { dmg = Math.round(dmg * fork.inTune); B.queue.push(Q.text('charmInTune')); }
    const boosted = B.boost && dmg > 0 ? B.boost : 0;
    if (boosted) { dmg = Math.round(dmg * boosted); B.boost = 0; }
    const crit = dmg > 0 ? critOf(res) : null;
    if (crit) dmg = Math.round(dmg * RULES.critMult);
    if (dmg > 0 && Q.charms.mult('party') !== 1) dmg = Math.round(dmg * Q.charms.mult('party'));   // the Hamburger Charm
    if (dmg > 0 && Q.gear.dmgMult() !== 1) dmg = Math.round(dmg * Q.gear.dmgMult());               // YOUR INSTRUMENT + POWER UP
    B.lastCrit = crit;
    if (dmg > 0) {
      hurtFoe(dmg);
      float('-' + dmg, 170, 30, 'dmg'); hud();
      B.queue.unshift(move ? Q.text('moveHit', {move: move.name, name: B.e.name, n: dmg}) : Q.text(res.acc >= .9 ? 'hitGreat' : res.acc >= .5 ? 'hitGood' : 'hitWeak', {name: B.e.name, n: dmg}));
      if (crit) {                                                  // CRITICAL! (a big gold float, a stronger shake, its own sound)
        B.queue.unshift(Q.text(crit === 'skill' ? 'critSkill' : 'critLucky'));
        float(Q.text('critFloat'), 160, 12, 'crit'); Q.shake(5, 380); Q.sfx('quest-crit');
      }
      if (boosted) B.queue.unshift(Q.text('boosted', {n: boosted}));
      if (B.e.hp > 1 && B.e.hp <= B.e.maxHp / 2 && !B.saidHurt) { B.saidHurt = true; B.queue.push(B.e.lines.hurt); }
    } else B.queue.push(Q.text('miss'));
    if (B.finale) hud();
    const perNote = (B.e.calm.perNote || 0) * (B.listened && B.e.listenBoost ? B.e.listenBoost : 1);
    addCalm((perNote * res.correct + (res.success ? B.e.calm.success || 0 : 0)) * B.calmScale, true);
    bandPlay(res, crit);                                        // your band plays along (your accuracy; ×1.2 after a critical)
    // 0 HP = it fades away, whatever its CALM (run() ends the battle): with a full CALM the student chose to keep playing
    await sayQ();
    return true;
  }
  /** QUICK PLAY (the Hamburger Charm): concert E♭ three times (the snare: 3 taps); each note played = one PLAY hit */
  async function doQuick() {
    if (!(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    const res = await Q.challenge.quick(RULES.quick);
    if (B === null) return false;
    B.lastKind = null;
    const power = Q.save.powerAt(B.save.level), party = Q.charms.mult('party'), fork = Q.charms.effects().find(e => e.inTune && 1 >= (e.at || .9));
    B.heldSaid = false; B.finaleHeldThisPlay = !B.finale; B.netThisPlay = false;          // the finale's rules, like a PLAY
    const hits = res.hits || [];
    let crit = null;
    hits.forEach((ok, k) => {
      if (!ok) { B.queue.push(Q.text('quickMiss', {k: k + 1})); return; }
      if (B.e.hp <= 0) return;                                  // already fading
      let dmg = Math.round(power * (1 - RULES.speedWeight + RULES.speedWeight * res.speed));   // a regular PLAY hit at this note's accuracy (1)
      if (fork) dmg = Math.round(dmg * fork.inTune);
      if (B.boost) { dmg = Math.round(dmg * B.boost); B.boost = 0; }   // (the Tuning Slide: the first hit)
      const c = critOf({acc: 1, speed: res.speed}); if (c) { dmg = Math.round(dmg * RULES.critMult); crit = crit || c; }
      dmg = Math.round(dmg * party);
      dmg = Math.round(dmg * Q.gear.dmgMult());                 // YOUR INSTRUMENT + POWER UP (each hit)
      hurtFoe(dmg); hud();
      setTimeout(() => { if (B) float('-' + dmg, 160 + 12 * k, 26 + 8 * k, c ? 'dmg crit' : 'dmg'); }, 300 * k);
      B.queue.push(Q.text('quickHit', {k: k + 1, name: B.e.name, n: dmg}));
    });
    B.lastCrit = crit;
    if (B.e.hp > 1 && B.e.hp <= B.e.maxHp / 2 && !B.saidHurt) { B.saidHurt = true; B.queue.push(B.e.lines.hurt); }
    bandPlay({acc: hits.length ? hits.filter(Boolean).length / hits.length : 0}, crit);   // your band plays along ONCE
    await sayQ();
    return true;
  }
  /** SERENADE: its happy notes (its CALM challenge, shorter than HARMONIZE); CALM up, no damage */
  async function doSerenade() {
    if (!(await micReady())) { await Q.say(Q.text('micHint')); return false; }
    const res = await Q.challenge.run(null, {enemy: B.e, serenade: true});
    if (B) B.lastKind = res.kind || null;
    if (B === null) return false;
    B.serenaded = true;                                           // (THE SAFETY NET is for a student trying to befriend)
    const perfect = res.acc >= RULES.perfectSerenade;
    const gain = RULES.serenadeCalm * res.acc * B.calmScale * (perfect ? RULES.perfectMult : 1);
    B.lastSerenade = gain; B.lastPerfect = perfect;
    if (perfect) { float(Q.text('perfectFloat'), 160, 12, 'perfect'); Q.sfx('quest-serenade-perfect'); B.queue.push(Q.text('serenadePerfect', {name: B.e.name})); }
    if (gain > 0) { if (!perfect) B.queue.push(Q.text(res.acc >= .9 ? 'serenadeGreat' : 'serenadeGood', {name: B.e.name})); addCalm(gain); }
    else B.queue.push(Q.text('serenadeMiss', {name: B.e.name}));
    bandSerenade(res, gain);
    await sayQ();
    return true;
  }
  async function doListen() {
    const lines = B.e.listen.map(l => l.replace('{happy}', Q.happyLabel(B.e))).concat(canSerenade() ? [Q.text('listenSerenade')] : []);
    await Q.say(lines, {name: B.e.name, portrait: B.e.sprite});
    B.listened = true;
    if (B.e.calm.listen) { addCalm(B.e.calm.listen, false, {listen: true}); await sayQ(Q.text('listenCalm', {name: B.e.name})); }
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
    if ((Q.challenge.uses('play') || h.type === 'articulate' || Q.challenge.RHYTHMIC.includes(h.type)) && !(await micReady())) { await Q.say(Q.text('micHint')); return false; }
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
    await echoes();                                              // THE BAND'S SPECIALS: the echoes hit first
    if (!B) return;
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

  /* ---------- THE FINAL STAND (THE BIG NUMBER's finalStand; see the header) ---------- */
  const fsFloor = () => Math.max(1, Math.round(B.e.finalStand.at * B.e.maxHp));
  const MOOSE = {name: 'Maestro Moose', portrait: 'npc-moose'};
  /** the title card: FINAL STAND, for a moment (no zoom with reduced motion: CSS) */
  const fsCard = () => new Promise(done => {
    const c = Q.el('div', 'q-fs-card', `<b>${Q.text('fsTitle')}</b>`); Q.ui.appendChild(c);
    setTimeout(() => { c.remove(); done(); }, RULES.fsCardMs);
  });
  /** a new part: its member lit, their line in the small banner (the dodge keeps going), a quiet boss-phase */
  function fsPart(i) {
    const part = B.e.finalStand.parts[i];
    B.fsPart = i; B.fsLit = part.lit;
    if (i > 0) Q.sfx('quest-fs-part');
    const el = Q.$('qFsBanner'); if (!el) return;
    el.innerHTML = `<b>${part.who}</b> ${part.say}`; el.hidden = false;
    clearTimeout(B.fsBannerT); B.fsBannerT = setTimeout(() => { el.hidden = true; }, RULES.fsBannerMs);
  }
  async function finalStand() {
    const b = B, fs = B.e.finalStand, total = fs.parts.reduce((n, p) => n + p.seconds, 0);
    B.fsPending = false; B.fsActive = true; B.fsTries = 0; B.aim = 'you'; hud();
    Q.sfx('quest-boss-phase'); Q.shake(4, 400);
    await Q.say(Q.text('fsOpen'), MOOSE);
    const slow = B.slow;                                         // (the Metronome: for every try of this stand)
    for (;;) {
      if (B !== b) return;
      await fsCard();
      if (B !== b) return;
      const st = Q.settings.get();
      Q.$('qFsTime').hidden = false;
      const res = await Q.dodge.start({enemy: Object.assign({}, B.e, {dodge: {seconds: total, patterns: fs.parts[0].patterns}}), parts: fs.parts, speed: fs.speed, dmg: fs.dmg,
        easy: st.dodge === 'easy', slow, shield: B.shield, assist: st.assist, mute: B.mute, charm: Q.charms.mult('dodge'), onPart: fsPart,
        onHit: (dmg, blocked) => {                                // always you (your band cheers you on)
          if (blocked) { float('Blocked!', 150, 80, 'calm'); return; }
          Q.sfx('quest-hurt');
          B.save.hp = Math.max(0, B.save.hp - dmg); float('-' + dmg, 40, 58, 'dmg'); hud();
          if (B.save.hp <= 0) return 'stop';
        }});
      if (B !== b) return;
      clearTimeout(B.fsBannerT); Q.$('qFsBanner').hidden = true; Q.$('qFsTime').hidden = true;
      B.shield = res.shieldLeft || 0; B.mute = res.muteLeft || 0;
      if (B.save.hp > 0) break;
      // out of breath: HP back to full, the band holds at its floor, and the stand starts again from Part 1
      B.fsTries++; B.fsLit = null; B.save.hp = B.save.maxHp; Q.save.write(); hud();
      const lines = [Q.text('fsRetry')];
      if (B.fsTries >= 2 && !B.fsTipSaid) { B.fsTipSaid = true; lines.push(Q.text('fsTip')); }
      await Q.say(lines, MOOSE);
    }
    B.slow = null; B.fsActive = false; B.fsDone = true; B.fsLit = null; B.aim = null; Q.save.write();
    // the static cracks: straight to the finale (the band's last 10 % is the stand itself)
    B.e.hp = 1; B.finale = true; B.calm = RULES.calmMax; B.choiceSaid = true; hud();
    Q.sfx('quest-boss-phase'); Q.shake(5, 500);
    B.queue.push(Q.text('fsCrack'), ...[].concat(B.e.finale || []), Q.text(B.e.finaleChoice || 'finaleChoice', {name: B.e.name}));
    await sayQ();
  }

  /* ---------- endings ---------- */
  async function rewards(kind) {
    const r = (B.e.rewards || {})[kind] || {xp: 5, tokens: 1}, s = B.save;
    const tok = Math.round(r.tokens * Q.charms.mult('tokens'));                // (Rico's Lucky Pick: more tokens)
    s.xp += r.xp; A.Tokens.add(tok);                                   // THE SHARED WALLET (shared/tokens.js)
    const lines = [Q.text('rewards', {n: r.xp, tokens: tok})];
    if (r.item && ITEMS()[r.item]) { s.items[r.item] = (s.items[r.item] || 0) + 1; lines.push(Q.text('gotItem', {item: ITEMS()[r.item].name})); }
    if (kind === 'befriend') Object.keys(Q.charms.list()).forEach(id => {       // a charm for befriending this ghost
      const c = Q.charms.get(id); if (c.reward === B.e.id && Q.charms.give(id)) { lines.push(Q.text('gotCharm', {item: c.name})); Q.sfx('charm-equip'); }
    });
    // NOTE SHARDS: the first time this enemy is helped (engine/world.js adds them with its `done` record)
    if (B.shards > 0) lines.push(Q.text('gotShards', {n: B.shards, shards: Q.gear.shardWord(B.shards)}));
    // THE METAL TIER: finishing Episode 1 (its final boss, either way: world.js sets ep1Done next) gives it, free
    const free = Q.gear.tiers().find(t => t.free === 'ep1Done');
    if (B.e.final && (B.e.ep || 1) === 1 && B.fromMap && free && Q.gear.give(free.id)) lines.push(Q.text('gearEp1', {tier: Q.gear.name(free.id), bonus: Q.gear.bonusText(free)}));
    const breath = Math.min(s.maxHp - s.hp, Math.ceil(s.maxHp * RULES.breath));   // a breather after every battle won
    if (breath > 0) { s.hp += breath; lines.push(Q.text('breath', {n: breath})); }
    let up = false;
    const powerWas = Q.save.powerAt(s.level), levelWas = s.level;
    while (s.xp >= Q.save.xpToNext(s.level)) { s.xp -= Q.save.xpToNext(s.level); s.level++; Q.charms.fixHp(s); s.hp = s.maxHp; up = true; }
    s.battles = s.battles || {won: 0, befriended: 0, faded: 0};
    s.battles.won++; s.battles[kind === 'befriend' ? 'befriended' : 'faded']++;
    Q.save.write(); hud();
    await Q.say(lines);
    if (up) {
      Q.sfx('quest-levelup');
      const fresh = (window.QUEST_MOVES || []).filter(m => m.level > levelWas && m.level <= s.level);   // THE MOVES this level-up unlocked
      await Q.say([Q.text('levelUp', {n: s.level, from: powerWas, to: Q.save.powerAt(s.level)})].concat(fresh.map(m => Q.text('moveNew', {move: m.name}))));
    }
  }
  async function befriend() {
    B.state = 'friend'; Q.sfx('quest-befriend');
    if (!B.save.roster.includes(B.e.id)) B.save.roster.push(B.e.id);
    if (B.e.opens) Q.save.setFlag(B.e.opens);                  // e.g. the Phantom Fermata opens the attic
    Q.save.achievements();                                      // skins: every kind of manor ghost befriended
    Q.save.write();
    // NEW FRIEND, CLEAR CHOICE: on the automatic band it joins (the two newest friends play); a band the student picked stays
    const joins = Q.band.choices().includes(B.e.id) ? Q.text(Q.band.auto() ? 'bandNewAuto' : 'bandNewChosen', {name: B.e.name}) : Q.text('befriended', {name: B.e.name});
    await Q.say([B.e.lines.befriend.replace(/\{you\}/g, B.member.short).replace(/\{hero\}/g, Q.hero()), joins], {name: B.e.name, portrait: B.e.sprite});
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
    const L = b.lineup;
    if (L && L.out.length) {                                      // the lineup isn't the saved band: say why, once
      const out = Q.band.enemy(L.out[0]).name, left = b.band.length;
      await Q.say(L.subs.length ? Q.text('lineupSub', {band: out, sub: L.subs.map(id => Q.band.enemy(id).name).join(' and ')})
        : Q.text(left ? 'lineupDuet' : 'lineupSolo', {band: out}));
    }
    if (!Q.save.flag('pathsTip') && b.e.serenade !== false) { await Q.say(Q.text('twoPaths')); Q.save.setFlag('pathsTip'); }   // the first battle: the two ways to win
    // the first RHYTHM / TEMPO / ECHO battle anywhere: Snapjaw Sal's how-to card, once (challenges.js Q.rhythmTip)
    if ([b.e.challenge].concat((b.e.stages || []).map(st => st.challenge), b.e.phases || []).some(t => Q.challenge.RHYTHMIC.includes(t) && Q.challenge.resolve(t) === t)) await Q.rhythmTip();
    while (B === b) {
      await stageStart();
      if (B !== b) return;
      const id = await command();
      if (B !== b) return;
      let r = id === 'play' ? await doPlay() : id === 'serenade' ? await doSerenade() : id === 'listen' ? await doListen() : id === 'item' ? await doItem() : await doHarmonize();
      if (B !== b) return;
      if (r === 'over') break;
      if (r === false) continue;                                  // backed out: still your turn
      if (b.e.hp <= 0) { await fade(); break; }
      if (b.fsPending && !b.fsDone) { await finalStand(); if (B !== b) return; b.round++; continue; }   // THE FINAL STAND, instead of their turn
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
    A.store.noteFinished('arcade-quest');                       // a battle won or lost: finished (Today's Practice)
    const result = {kind: b.state === 'friend' ? 'befriend' : b.state === 'fading' ? 'fade' : 'rest', enemy: b.e.id};
    if (b.back && typeof b.back === 'object') Q.go(b.back.scene, Object.assign({}, b.back.args, {result}));
    else Q.go(b.back || 'arena', {from: b.e.id, result});
  }

  Q.scenes.battle = {
    enter({enemy, back, overrides, shards}) {
      const src = Object.assign({}, ENEMIES().find(e => e.id === enemy) || ENEMIES()[0], overrides || {});
      const save = Q.save.get(), member = A.currentMember();
      A.store.noteActivity({game: 'arcade-quest', play: 1});      // seasonal events: a game played today
      // THE BAND (everyone at full HP: they refill after every battle) and a fight that stays fair for its size
      // THE LINEUP (engine/save.js Q.band.lineup): a friend of the enemy's own kind sits out and the next friend steps in
      const L = Q.band.lineup(src.id);
      const band = L.band.map(id => {
        const def = Q.band.enemy(id), maxHp = Math.max(4, Math.round(Q.save.maxHpAt(save.level) * (def.companion.hp || RULES.compHp)));
        return {id, def, name: def.name, sprite: def.sprite, maxHp, hp: maxHp, out: false, hop: 0, sp: 0};
      });
      const area = (window.QUEST_AREAS || {})[src.area || (src.test ? 'test' : '')] || {hp: 1, atk: 1};
      const hp = Math.round(src.hp * (area.hp || 1) * (1 + (src.boss ? RULES.bossPartyHp : RULES.partyHp) * band.length));
      B = {e: Object.assign({}, src, {maxHp: hp, hp, atk: (src.atk || 2) * (area.atk || 1)}), save, member, back, band, aim: null, calm: 0, kept: {}, stageShown: null, finale: false, shield: 0, mute: Q.charms.sum('block'), slow: null, boost: 0, round: 0, phase: 0, listened: false, queue: [], state: 'fight', hurtUntil: 0,
        player: Q.playerId(member.id), lineup: L, moved: {}, dots: [], introAt: performance.now(), shards: shards || 0, fromMap: !!(back && typeof back === 'object' && back.scene === 'world')};
      // THE CALM SCALE: CALM rises like damage does: with your power (level) and against its HP (area × band size)
      B.calmScale = Q.save.powerAt(save.level) / Q.save.powerAt(1) * RULES.calmRef / hp;
      Q.ui.innerHTML = `<div class="q-hud">` +
        `<div class="q-hud-e"><p class="q-hname">${src.name}</p><div class="q-bar hp"><i id="qEHp"></i></div><small id="qEHpN"></small>` +
        `<div class="q-calm" id="qCalmBox"><span>CALM</span><div class="q-bar calm"><i id="qCalm"></i></div></div></div>` +
        `<div class="q-hud-p" id="qHudP"><p class="q-hname">${tierBadge(member)}${member.short} <span id="qLv"></span>${B.band.length ? ` <span class="q-party">${Q.text(B.band.length > 1 ? 'bandTrio' : 'bandDuet')}</span>` : ''}</p>` +
        `<div class="q-bar php"><i id="qPHp"></i></div><small id="qPHpN"></small><small class="q-shield" id="qShield" hidden></small>` +
        B.band.map((c, i) => `<div class="q-comp" id="qComp${i}"><span class="q-cname">${c.name}</span><div class="q-bar chp"><i></i></div><small></small>` +
          (c.def.companion.special ? `<span class="q-sp" title="${c.def.companion.special.name}"><i></i></span>` : '') + `</div>`).join('') + `</div></div>` +
        `<p class="q-mictag" id="qMicTag" hidden><span class="q-dot"></span> The mic is listening</p>` +
        `<button type="button" class="q-gear" id="qGear" aria-label="Settings">⚙</button>` +
        `<p class="q-prompt" id="qPrompt" hidden></p><div class="q-cmd" id="qCmd" hidden></div>` +
        (src.finalStand ? `<p class="q-fs-banner" id="qFsBanner" hidden></p><p class="q-fs-time" id="qFsTime" hidden></p>` : '');
      Q.$('qGear').addEventListener('click', () => Q.settings.open().then(() => { if (B) B.player = Q.playerId(member.id); }));
      hud();
      Q.ui.querySelectorAll('.q-hname,.q-cname').forEach(Q.fitText);     // long names shrink (then wrap), never "…"
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(Q.battleMusic(src));
      run();
    },
    exit() {
      B = null;
      if (Q.dodge.active()) Q.dodge.end();
      Q.listen(false);
      if (A.Sfx && A.Sfx.setMusic) A.Sfx.setMusic(null);
    },
    update(dt) { Q.dodge.update(dt); Q.save.tick(dt); },
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
      // THE BIG NUMBER: the band in two rows, × 1.5 (× 2 would reach under its HUD), standing on the floor
      if (d.members) { const bs = dodging ? 1 : 1.5; band5(ctx, now, d, bs, Math.round(160 - d.w * bs / 2) + hurt, dodging ? ey : 118 - d.h * bs, alpha); }
      else Q.draw(ctx, B.e.sprite, Math.round(160 - d.w * es / 2) + hurt, ey, {scale: es, t: now, alpha, frame: B.state === 'friend' ? 2 : undefined});
      // your band beside you (happy faces; out of breath = faded; a little hop when they play)
      if (!dodging) B.band.forEach((c, i) => {
        const hop = now < c.hop && now > c.hop - 250 && !Q.reduced() ? -3 : 0;
        // THE LINEUP slides in beside you as the battle opens (INTRO_SLIDE ms, one after the other; still under reduced motion)
        const p = Q.reduced() ? 1 : Math.max(0, Math.min(1, (now - B.introAt - 150 * i) / INTRO_SLIDE)), slide = Math.round((1 - p) * (1 - p) * -70);
        Q.draw(ctx, c.sprite, 72 + slide, 60 + 28 * i + hop, {t: now, frame: 2, alpha: c.out ? .35 : 1});
      });
      // you
      if (!dodging) Q.draw(ctx, B.player, 6, B.band.length ? 58 : 52, {scale: 2, t: now});   // switches to its PLAYING pose during a challenge
      Q.dodge.draw(ctx, now);
      // THE FINAL STAND: the seconds left to survive
      const ft = B.fsActive && Q.$('qFsTime'), ds = ft && Q.dodge.state();
      if (ds) { const t = Q.text('fsTime', {n: Math.max(0, Math.ceil(ds.len - ds.t))}); if (ft.textContent !== t) ft.textContent = t; }
    },
  };
  /* THE BIG NUMBER (sprites-stage.js 'bignumber': `members` = [{sprite, ok, at}] in its own 72 × 48 box): the member
     whose stage is running stands lit (full color, a soft warm glow behind them); the others wait, dimmed, and
     flicker GENTLY: a slow fade between two dim levels (FLICKER.hz, well under 3 a second, a small part of the screen),
     plus a 1-pixel glitch shift now and then. Befriended: everyone lit and un-glitched. Reduced motion: no flicker,
     no shift (the dim members hold still). */
  const FLICKER = {hz: .8, lo: .42, hi: .58, shiftEvery: 1.7, shiftFor: .12};
  function band5(ctx, now, d, s, x0, y0, alpha) {
    const lit = B.state === 'friend' ? -1 : B.fsLit != null ? B.fsLit : Math.max(0, stageIdx()), still = Q.reduced(), t = now / 1000;   // (THE FINAL STAND: its part's member; -1 = everyone)
    const order = d.members.map((m, i) => i).sort((a, b) => d.members[a].at[1] - d.members[b].at[1]);   // the back row first
    order.forEach(i => {
      const m = d.members[i], on = lit < 0 || i === lit, x = x0 + m.at[0] * s, y = y0 + m.at[1] * s;
      if (on && lit >= 0) { ctx.globalAlpha = .28 * alpha; ctx.fillStyle = Q.css('q-stage-glow'); ctx.beginPath(); ctx.ellipse(x + 12 * s, y + 16 * s, 13 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      const dim = still ? (FLICKER.lo + FLICKER.hi) / 2 : FLICKER.lo + (FLICKER.hi - FLICKER.lo) * (.5 + .5 * Math.sin(t * Math.PI * 2 * FLICKER.hz + i * 1.3));
      const shift = !on && !still && ((t + i * .37) % FLICKER.shiftEvery) < FLICKER.shiftFor ? s : 0;
      Q.draw(ctx, B.state === 'friend' ? m.ok : m.sprite, x + shift, y, {scale: s, t: now, alpha: alpha * (on ? 1 : dim)});
    });
  }
  /** tests: THE BIG NUMBER's lit member (-1 = everyone, befriended) and the flicker's numbers */
  Q.bandLit = () => (B && Q.spriteDef(B.e.sprite) && Q.spriteDef(B.e.sprite).members ? (B.state === 'friend' ? -1 : B.fsLit != null ? B.fsLit : Math.max(0, stageIdx())) : null);
  Q.bandLit.FLICKER = FLICKER;
  /** THE MOVES your level has reached (data/items.js QUEST_MOVES), in order */
  Q.moves = () => { const s = Q.save.get(); return (window.QUEST_MOVES || []).filter(m => s && s.level >= m.level); };
  /** ?demo only (tests): set the enemy's HP right now */
  Q.battleDemo = {hp(n) { if (A.DEMO && B) { B.e.hp = n; hud(); } }};
  Q.battleState = () => B && {hp: B.e.hp, ehp: B.e.maxHp, atk: B.e.atk, calm: B.calm, php: B.save.hp, maxHp: B.save.maxHp, state: B.state, shield: B.shield, mute: B.mute,
    power: Q.save.powerAt(B.save.level), calmScale: B.calmScale, gear: {tier: Q.gear.best().id, dmg: Q.gear.dmgMult(), calm: Q.gear.calmMult()}, shards: B.shards, net: !!B.netUsed, serenade: B.lastSerenade || 0, perfect: !!B.lastPerfect, crit: B.lastCrit || null, moved: Object.keys(B.moved), aim: B.aim && (B.aim === 'you' ? 'you' : B.aim.id),
    band: B.band.map(c => ({id: c.id, hp: c.hp, maxHp: c.maxHp, out: c.out, sp: c.sp})), dots: B.dots.map(d => Object.assign({}, d)), slow: B.slow, lineup: B.lineup,
    fs: B.e.finalStand ? {floor: fsFloor(), pending: !!B.fsPending, active: !!B.fsActive, done: !!B.fsDone, part: B.fsPart == null ? null : B.fsPart, tries: B.fsTries || 0, tip: !!B.fsTipSaid, finale: !!B.finale} : null};   // tests
})(window.Arcade);
