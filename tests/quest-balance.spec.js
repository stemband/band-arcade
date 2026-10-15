/* ARCADE QUEST'S BALANCE, MEASURED (build step 6 of docs/games/arcade-quest-ep2-plan.md). Not part of the normal run:
     BALANCE=1 npx playwright test quest-balance --project=chromium
   writes tests/balance-results/quest-balance-*.json (the tables in docs/games/arcade-quest.md, "Balance"). Two runs, BEFRIEND
   and POWER DOWN: EPISODE 1 from a new save (LV 1, every manor ghost, the Fermata, the Conductor), then EPISODE 2 on the
   same save (the attic speaker, every room, Rico, THE BIG NUMBER), all through the real overworld and battles (?demo).
   The student is stood in for at ACCURACY ABOUT .8: every PLAY / SERENADE scores acc .8 (4 of 5 notes), each dodge is
   hit once. Since nothing waits for a real student, each stood-in part ADDS ITS REAL LENGTH to the save's `play`
   (Q.save.tick): the challenge (its notes, hold, measures at its tempo + the count-off), the dodge (its seconds), every
   text box (2 s to read), every cutscene shot (4 s), every door (5 s of walking) and the walk to each enemy (5 s).
   Recorded per room: LV, HP and XP on entering; per battle: turns and seconds; the bosses; the save's play per episode.
   Also: THE RHYTHM TIERS at that accuracy (the real judge, shared/rhythm-judge.js, on every pattern of each tier, the
   student's timing off by a random ±σ): how often each tier is passed (acc ≥ .8). */
const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

test.skip(!process.env.BALANCE, 'the balance measurement runs with BALANCE=1');
const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
const OUT = process.env.BALANCE_OUT || path.join(__dirname, 'balance-results');      // (test-results/ is emptied by every run)
const ACC = .8;

async function boot(page) {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS, keysTip: true}}})});
  await page.goto('arcade-quest/index.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'title');
  await page.evaluate(ACC => {
    const Q = Arcade.Quest, RH = {1: 76, 2: 80, 3: 84};
    // THE CLOCK: a stood-in part adds its real length to the save's play (tick: at most .5 s a call)
    const add = sec => { window.__sec += sec; for (let t = sec; t > 0; t -= .5) Q.save.tick(Math.min(.5, t)); };
    window.__sec = 0; window.__add = add; window.__turns = 0; window.__lines = []; window.__gos = []; window.__res = null;
    const len = (type, e = {}) => {
      const bpm = e.bpm || RH[e.tier] || 80, beat = 60 / bpm, bars = e.bars || 1;
      if (type === 'play') return Math.min(e.time || 12, (e.count || 3) * 2) + 3;
      if (type === 'longtone') return (Array.isArray(e.hold) ? (e.hold[0] + e.hold[1]) / 2 : e.hold || 3) + 4;
      if (type === 'rhythm') return 1.6 + (4 + bars * 4) * beat + 2;
      if (type === 'tempo') return (4 + (e.beats || 8)) * 60 / (e.bpm || 96) + 2;
      if (type === 'echo') return (2 * 4 * bars + 4) * beat + 3;
      if (type === 'articulate') return (e.time || 7) + 2;
      if (type === 'vocab' || type === 'fingering') return 8;
      return 8;
    };
    window.__len = len;
    const go = Q.go; Q.go = (name, args) => {
      window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name);
      const c = name === 'cutscene' && (window.QUEST_CUTSCENES || {})[args.id];
      if (c) add(4 * (c.shots || []).length);
      if (name === 'credits') add(45);
      return go(name, args);
    };
    const show = Arcade.UI.results.show; Arcade.UI.results.show = o => { window.__res = o; return show(o); };
    const say = Q.say; Q.say = (l, o) => { const ls = [].concat(l).filter(Boolean); window.__lines.push(...ls); add(2 * ls.length); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: ACC, speed: ACC, correct: 4, total: 5, success: true};
    Q.challenge.run = async (type, o = {}) => {
      const e = o.enemy || {}, t = o.harmonize ? (e.harmonize || {}).type : Q.challenge.resolve(type || e.challenge, e);
      add(o.harmonize ? (t === 'scale' ? 8 * 1.5 + 3 : (e.harmonize || {}).hold || 2 + 3) : len(t, e));
      if (!o.harmonize) window.__turns++;
      return o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play);
    };
    Q.challenge.encore = async () => { add(15); return {acc: 1, speed: 1, correct: 8, total: 8, success: true}; };
    Q.challenge.blast = async () => { add(12); return {acc: 1, speed: 1, correct: 5, total: 5, success: true}; };
    // each dodge: its seconds, hit once (the enemy's damage)
    Q.dodge.start = async ({enemy, onHit}) => {
      add(((enemy && enemy.dodge) || {}).seconds || 6);
      const dmg = Math.max(1, Math.round((enemy && enemy.atk) || 2));
      if (onHit) onHit(dmg, false);
      return {damage: dmg, hits: 1, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0};
    };
  }, ACC);
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd'), i = document.getElementById('intro');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(), cut: Q.cutscene && Q.cutscene(),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0, intro: !!i && !i.hidden,
    ask: !!document.querySelector('.q-ask'), panel: !!document.querySelector('.q-wpanel'), card: !!document.querySelector('.sk-catchup')};
});
async function drive(page, done, pick = () => 'PLAY', max = 4000) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.intro) await page.locator('#introGo').click();
    else if (s.card) await page.locator('.sk-catchup [data-close]').click();
    else if (s.cmd) await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l) && !x.disabled) || document.querySelector('#qCmd .q-btn'); b.click(); }, pick(s.b));
    else if (s.scene === 'credits') await page.locator('.q-skip').click();
    else if (s.text || ['battle', 'cutscene'].includes(s.scene)) await page.keyboard.press('Enter');
    await page.waitForTimeout(25);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text && !s.intro && !s.panel && !s.card;
const blur = page => page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
const add = (page, sec) => page.evaluate(s => window.__add(s), sec);
async function step(page, map, x, y, dir, to) {
  await drive(page, idleIn(map));
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.waitForTimeout(60);
  await page.keyboard.press({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'}[dir]);
  await page.waitForTimeout(600);
  await add(page, 5);
  if (to) await drive(page, idleIn(to));
}
async function walk(page, doors) { for (const d of doors) await step(page, ...d); }
async function talkAt(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await blur(page);
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
}
const stats = page => page.evaluate(() => { const s = Arcade.Quest.save.get(); return {level: s.level, hp: s.hp, maxHp: s.maxHp, xp: s.xp, sec: window.__sec}; });

/** one battle, measured: walk to it (5 s), fight it the route's way at accuracy .8; a lost battle (out of HP) is
    fought again from where the game puts you */
async function battle(page, log, map, key, how, {boss = false, pick} = {}) {
  const pk = pick || (b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY'));
  let lost = 0;
  for (;;) {
    const at = (await snap(page)).w;
    if (!at || at.map !== map) await page.evaluate(m => Arcade.Quest.go('world', {map: m, x: 1, y: 2, dir: 'up'}), map), await drive(page, idleIn(map));
    await add(page, 5);
    const before = await stats(page), t0 = await page.evaluate(() => window.__turns);
    const type = (await snap(page)).w.ghosts.find(g => g.key === key).type;
    expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key), `${map}:${key}`).toBe(true);
    await drive(page, s => s.scene === 'battle');
    await drive(page, s => s.scene === 'world' && !s.text && !s.w.busy && !s.card || s.scene === 'complete' || s.scene === 'credits' || s.scene === 'cutscene', pk);
    const after = await stats(page), done = await page.evaluate(k => Arcade.Quest.save.get().done[k], `${map}:${key}`);
    const turns = await page.evaluate(t0 => window.__turns - t0, t0);
    log.push({map, key, type, how, boss, level: before.level, hp: before.hp, turns, sec: Math.round(after.sec - before.sec), won: !!done, lost});
    if (done) return;
    if (++lost > 4) throw new Error(`${map}:${key} lost 5 times`);
  }
}
async function roomOf(page, log, rooms, route, map, kindOf) {
  const s = await stats(page); rooms.push({map, level: s.level, hp: s.hp, maxHp: s.maxHp, xp: s.xp});
  const keys = (await snap(page)).w.ghosts.filter(g => g.key !== 'boss').map(g => g.key);
  for (const k of keys) await battle(page, log, map, k, kindOf(route, `${map}:${k}`));
}

async function run(page, route) {
  const log = [], rooms = [], kind = r => r;
  page.__log = {log, rooms};
  /* ----- EPISODE 1, from LV 1 (the first lines aside: the manor's rooms, the Fermata, the Conductor) ----- */
  await page.evaluate(() => { const Q = Arcade.Quest; Q.save.reset(); const s = Q.save.get(); Object.assign(s.flags, {'seen-intro': true, pathsTip: true}); Q.save.write(); });
  for (const map of ['hall', 'library', 'ballroom', 'kitchen']) {
    await page.evaluate(m => Arcade.Quest.go('world', {map: m, x: 1, y: 2, dir: 'up'}), map);
    await drive(page, idleIn(map));
    await add(page, 5);
    await roomOf(page, log, rooms, route, map, kind);
  }
  await page.evaluate(() => Arcade.Quest.go('world', {map: 'hall', x: 14, y: 3, dir: 'up'}));
  await drive(page, idleIn('hall'));
  await blur(page); await page.keyboard.press('Enter');
  await drive(page, s => idleIn('hall')(s) && s.w.npcs.find(n => n.id === 'reginald').x !== 14);
  await step(page, 'hall', 14, 2, 'up', 'stairs');
  await roomOf(page, log, rooms, route, 'stairs', kind);
  await battle(page, log, 'stairs', 'boss', route, {boss: true, pick: b => (route === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY')});
  await drive(page, idleIn('stairs'));
  if (route === 'fade') await walk(page, [['stairs', 1, 2, 'up', 'passage'], ['passage', 6, 2, 'up', 'attic']]);
  else await step(page, 'stairs', 5, 2, 'up', 'attic');
  { const s = await stats(page); rooms.push({map: 'attic', level: s.level, hp: s.hp, maxHp: s.maxHp, xp: s.xp}); }
  // the Ghost Conductor: PLAY (his finale holds him at 1 HP, CALM full: HARMONIZE to befriend, PLAY on to fade)
  await battle(page, log, 'attic', 'boss', route, {boss: true, pick: b => (route === 'befriend' && b && b.calm >= 100 && b.hp <= 1 ? 'HARMONIZE' : 'PLAY')});
  await drive(page, s => s.scene === 'complete', () => 'PLAY');
  const ep1 = await page.evaluate(() => ({play: Arcade.Quest.save.played(1), s: Arcade.Quest.save.get()}));

  /* ----- EPISODE 2, on the same save ----- */
  await page.evaluate(() => Arcade.Quest.go('world', {map: 'attic', x: 5, y: 6, dir: 'up'}));
  await talkAt(page, 'attic', 5, 5, 'up');
  await drive(page, s => s.ask);
  await page.locator('.q-ask .q-btn', {hasText: 'Yes'}).click();
  await drive(page, idleIn('lobby'));
  const r2 = (r, k) => route;                                            // (BEFRIEND / POWER DOWN: the whole route one way)
  await step(page, 'lobby', 11, 2, 'up', 'pit');
  await roomOf(page, log, rooms, route, 'pit', r2);
  await walk(page, [['pit', 8, 9, 'down', 'lobby'], ['lobby', 19, 2, 'up', 'workshop']]);
  await roomOf(page, log, rooms, route, 'workshop', r2);
  await walk(page, [['workshop', 8, 9, 'down', 'lobby'], ['lobby', 21, 2, 'up', 'balcony']]);
  await roomOf(page, log, rooms, route, 'balcony', r2);
  await walk(page, [['balcony', 7, 8, 'down', 'lobby'], ['lobby', 2, 2, 'up', 'greenroom']]);
  await talkAt(page, 'greenroom', 4, 6, 'up');                           // Professor Hoot: the E♭ Encore
  await drive(page, idleIn('greenroom'));
  await walk(page, [['greenroom', 7, 8, 'down', 'lobby'], ['lobby', 19, 2, 'up', 'workshop']]);
  await talkAt(page, 'workshop', 8, 4, 'up');                            // Snapjaw Sal's lesson
  await drive(page, idleIn('workshop'));
  await walk(page, [['workshop', 8, 9, 'down', 'lobby'], ['lobby', 11, 2, 'up', 'pit'], ['pit', 10, 4, 'up', 'backstage']]);
  await roomOf(page, log, rooms, route, 'backstage', r2);
  await step(page, 'backstage', 5, 2, 'up', 'dressing');
  await roomOf(page, log, rooms, route, 'dressing', r2);
  await battle(page, log, 'dressing', 'boss', route, {boss: true});
  await drive(page, idleIn('dressing'));
  if (route === 'fade') {
    await step(page, 'dressing', 16, 2, 'up', 'vent');
    { const s = await stats(page); rooms.push({map: 'vent', level: s.level, hp: s.hp, maxHp: s.maxHp, xp: s.xp}); }
    await talkAt(page, 'vent', 7, 2, 'down'); await drive(page, idleIn('vent'));
    await step(page, 'vent', 14, 2, 'up', 'loft');
  } else {
    await walk(page, [['dressing', 9, 9, 'down', 'backstage'], ['backstage', 17, 2, 'up', 'pit'], ['pit', 8, 9, 'down', 'lobby'], ['lobby', 19, 2, 'up', 'workshop'], ['workshop', 12, 2, 'up', 'loft']]);
  }
  await roomOf(page, log, rooms, route, 'loft', r2);
  await step(page, 'loft', 20, 8, 'down', 'stage');
  { const s = await stats(page); rooms.push({map: 'stage', level: s.level, hp: s.hp, maxHp: s.maxHp, xp: s.xp}); }
  // THE BIG NUMBER (A on Maestro Moose): PLAY through its five stages; BEFRIEND: HARMONIZE at its finale
  // (out of breath: back at the Lobby's jukebox, full HP; the student walks back to the stage: 4 doors, and tries again)
  const before = await stats(page), t0 = await page.evaluate(() => window.__turns);
  let lost = 0;
  const tries = [];
  for (;;) {
    await talkAt(page, 'stage', 10, 3, 'right');
    let left = null;
    const end = await drive(page, s => s.scene === 'cutscene' || s.scene === 'complete' || (s.scene === 'world' && s.w && s.w.map !== 'stage' && !s.w.busy && !s.text),
      b => { if (b) left = {bigHp: b.hp, of: b.ehp, yourHp: b.php, yourMax: b.maxHp}; return route === 'befriend' && b && b.calm >= 100 && b.hp <= 1 ? 'HARMONIZE' : 'PLAY'; });
    tries.push(Object.assign({won: end.scene !== 'world'}, left || {}));
    log.bigTries = tries;
    if (end.scene !== 'world') break;
    if (++lost > 4) throw new Error('THE BIG NUMBER lost 5 times: ' + JSON.stringify(tries));
    await add(page, 20);
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'stage', x: 12, y: 3, dir: 'left'}));
    await drive(page, idleIn('stage'));
  }
  const after = await stats(page);
  log.push({map: 'stage', key: 'boss', type: 'bignumber', how: route, boss: true, level: before.level, hp: before.hp, turns: await page.evaluate(t0 => window.__turns - t0, t0), sec: Math.round(after.sec - before.sec), won: true, lost});
  await drive(page, s => s.scene === 'complete');
  const ep2 = await page.evaluate(() => ({play: Arcade.Quest.save.played(2), s: Arcade.Quest.save.get()}));
  return {route, log, rooms, ep1: {play: ep1.play, level: ep1.s.level}, ep2: {play: ep2.play, level: ep2.s.level}};
}

const results = {};
for (const route of ['befriend', 'fade']) {
  test(`BALANCE: the ${route === 'befriend' ? 'BEFRIEND' : 'POWER DOWN'} route, Episode 1 then Episode 2, at accuracy .8`, {tag: '@slow'}, async ({page}) => {
    test.setTimeout(1_200_000);
    const watch = await boot(page);
    let r;
    try { r = await run(page, route); } catch (e) { fs.mkdirSync(OUT, {recursive: true}); fs.writeFileSync(path.join(OUT, `quest-balance-${route}-failed.json`), JSON.stringify({error: String(e), log: page.__log}, null, 1)); throw e; }
    fs.mkdirSync(OUT, {recursive: true});
    fs.writeFileSync(path.join(OUT, `quest-balance-${route}.json`), JSON.stringify(r, null, 1));
    results[route] = r;
    watch.check();
  });
}

test('BALANCE: the rhythm tiers at accuracy about .8 (the real judge, every pattern, the timing off by ±σ)', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {'arcade-quest': {settings: SETTINGS}}})});
  await page.goto('arcade-quest/index.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.RhythmJudge);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, C = Arcade.Counting, J = Arcade.RhythmJudge, W = Q.rhythm.windows(), V = {perfect: 1, good: .8, ok: .5, early: .3, late: .3, miss: 0};
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const RH = {1: 76, 2: 80, 3: 84};
    // one student attempt: every note's attack off by N(0, σ) ms, one in 25 missed
    const attempt = (text, bpm, sigma) => {
      const p = C.parse(text, '4/4'), spt = 60 / bpm / p.meter.beat, targets = C.groups(p).filter(g => !g.rest).map(g => ({t: g.t * spt}));
      if (!targets.length) return null;
      const attacks = targets.filter(() => rnd() > .04).map(x => ({rel: x.t + gauss() * sigma / 1000}));
      const {tg, extras} = J.match(targets, attacks, W);
      return Math.max(0, Math.min(1, tg.reduce((v, t) => v + (V[t.res] || 0), 0) / (tg.length || 1) - .1 * extras.length));
    };
    const tiers = {};
    const pools = Object.assign({}, window.QUEST_RHYTHMS || {});
    // σ: the timing spread at which a tier-1 measure scores .8 on average (that's ACCURACY ABOUT .8)
    const mean = (tier, sigma, n = 300) => { const pool = pools[tier] || []; let sum = 0, k = 0; for (let i = 0; i < n; i++) { const a = attempt(pool[i % pool.length], RH[tier] || 80, sigma); if (a != null) { sum += a; k++; } } return sum / k; };
    let lo = 5, hi = 400; for (let i = 0; i < 25; i++) { const mid = (lo + hi) / 2; if (mean(1, mid) > .8) lo = mid; else hi = mid; }
    const sigma = Math.round((lo + hi) / 2);
    Object.keys(pools).forEach(tier => {
      const pool = pools[tier]; let pass = 0, n = 0, sum = 0;
      for (let i = 0; i < 600; i++) { const a = attempt(pool[i % pool.length], RH[tier] || 80, sigma); if (a == null) continue; n++; sum += a; if (a >= .8) pass++; }
      tiers[tier] = {patterns: pool.length, mean: +(sum / n).toFixed(2), pass: +(pass / n).toFixed(2)};
    });
    // THE BIG NUMBER's rhythm stage (2 measures of tier 3) and TEMPO (8 beats at 96, the Big Number's speeding up 96→112)
    const two = (pools[3] || []).map((x, i, a) => x + ' | ' + a[(i + 3) % a.length]);
    { let pass = 0, sum = 0; for (let i = 0; i < 600; i++) { const a = attempt(two[i % two.length], RH[3], sigma); sum += a; if (a >= .8) pass++; } tiers['3, 2 measures'] = {patterns: two.length, mean: +(sum / 600).toFixed(2), pass: +(pass / 600).toFixed(2)}; }
    for (const [name, accel] of [['tempo', 0], ['tempo, speeding up', 16]]) {
      let pass = 0, sum = 0;
      for (let i = 0; i < 600; i++) {
        const targets = []; for (let b = 0, t = 0; b < 8; b++) { targets.push({t}); t += 60 / (96 + accel * b / 7); }
        const attacks = targets.filter(() => rnd() > .04).map(x => ({rel: x.t + gauss() * sigma / 1000}));
        const {tg, extras} = J.match(targets, attacks, W), a = Math.max(0, Math.min(1, tg.reduce((v, t) => v + (V[t.res] || 0), 0) / tg.length - .1 * extras.length));
        sum += a; if (a >= .8) pass++;
      }
      tiers[name] = {patterns: 1, mean: +(sum / 600).toFixed(2), pass: +(pass / 600).toFixed(2)};
    }
    return {sigma, tiers, sample: Object.keys(pools)};
  });
  fs.mkdirSync(OUT, {recursive: true});
  fs.writeFileSync(path.join(OUT, 'quest-balance-rhythm.json'), JSON.stringify(r, null, 1));
  watch.check();
});
