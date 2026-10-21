/* ARCADE QUEST: THE BAND'S SPECIALS and TOM-TOM TERMITE (designed by a Raven Band student; data/enemies.js
   companion.special, battle.js THE BAND'S SPECIALS, data/maps/stage.js the Workshop's `x1`).
   THE DATA: every companion has a special of a known kind, its words ≤ 80 characters. THE METER: each PLAY (or move,
   QUICK PLAY, SERENADE) fills it by specialFill × your accuracy; full = that turn the companion plays its SPECIAL
   instead (the meter empties), shown on the HUD. THE KINDS: one big hit, several hits, an ECHO (hits at the start of
   the enemy's turns, counts down, stacks, never below 1 HP), heal, shield, slow, CALM; after a SERENADE a damage
   special adds CALM and no damage. TOM-TOM TERMITE: in the Prop Workshop, a bonus friend: never one of the 20
   machines (the Showtime Log, the floor's %, the Workshop's wake gate, 'stage-friends'), befriendable, a band member
   with GHOST GNAW (a hit + an echo). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
function save({level = 10, band = [], flags = {}, done = {}, roster} = {}) {
  return {v: 7, level, xp: 0, hp: 20 + (level - 1) * 4, maxHp: 20 + (level - 1) * 4, tokens: 0, items: {}, roster: (roster || band).slice(), battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band, route: {}, ep: 2, done,
    gear: {tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}},
    flags: Object.assign({'seen-intro': true, pathsTip: true, rhythmTip: true, ep1Done: true, ep2Start: true}, flags)};
}
async function boot(page, s = save(), url = 'arcade-quest/index.html?demo&test') {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName && (Arcade.Quest.sceneName !== 'world' || Arcade.Quest.world.state()));
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__floats = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
    Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play));
    window.__dodges = [];
    Q.dodge.start = async o => { window.__dodges.push({slow: o.slow, shield: o.shield}); return {damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: o.shield || 0, muteLeft: 0}; };
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('q-float') && window.__floats.push([n.className, n.textContent]))))
      .observe(document.body, {childList: true, subtree: true});
  });
  return watch;
}
async function until(page, done, arg, max = 300) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(done, arg)) return;
    if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('never: ' + done.toString());
}
const cmdReady = () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play');
const pick = (page, label) => page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.querySelector('.q-bl').textContent === l && !x.disabled); if (!b) throw new Error('no ' + l); b.click(); }, label);
const st = page => page.evaluate(() => Arcade.Quest.battleState());
async function fight(page, enemy = 'squawk', overrides = null) {
  await page.evaluate(([e, o]) => { window.__floats.length = 0; window.__lines.length = 0; Arcade.Quest.go('battle', {enemy: e, back: 'arena', overrides: o}); }, [enemy, overrides]);
  await until(page, cmdReady);
  await page.evaluate(() => { Arcade.Quest.battleDemo.hp(9999); Math.random = () => .99; });
}
/** one turn: PLAY (at LV < 3 straight in; else PLAY in the sub-menu) or SERENADE, through the enemy's turn */
async function turn(page, what = 'PLAY') {
  const before = await page.evaluate(() => Arcade.Quest.battleState().round || 0);
  await pick(page, what);
  await page.waitForTimeout(120);
  if (what === 'PLAY' && await page.locator('#qCmd .q-btn.c-back').count()) await page.locator('#qCmd .q-btn').first().click();   // (the sub-menu: the enemy's own challenge)
  await until(page, () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') && !document.querySelector('#qCmd .q-btn.c-back') && !document.querySelector('#qText:not([hidden])'));
  return before;
}
const lines = page => page.evaluate(() => window.__lines.slice());

test.describe('THE BAND\'S SPECIALS', () => {
  test('the data: every companion has a special of a known kind; its words fit', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => window.QUEST_ENEMIES.filter(e => e.companion).map(e => {
      const sp = e.companion.special || {};
      const kinds = ['hit', 'hits', 'dot', 'heal', 'shield', 'slow', 'calm'].filter(k => sp[k] != null);
      const T = Arcade.Quest.text, words = [sp.say, T('specialGo', {band: e.name, special: sp.name}), T('specialHit', {special: sp.name, name: 'The Extremely Long-Winded Squawk', n: 999}),
        T('specialHits', {special: sp.name, k: 5, name: 'The Extremely Long-Winded Squawk', n: 999}), T('specialCalm', {special: sp.name, name: 'The Extremely Long-Winded Squawk'}),
        T('specialHeal', {special: sp.name}), T('echoHit', {special: sp.name, name: 'The Extremely Long-Winded Squawk', n: 999})];
      return {id: e.id, name: sp.name, kinds, long: words.filter(w => !w || w.length > 80), hitsOk: !sp.hits || sp.share > 0};
    }));
    expect(r.length).toBe(21);                                     // (+ Yourself?!? and Mr. Graham?, the Glitch Dimension's)
    for (const x of r) {
      expect(x.name, x.id).toBeTruthy();
      expect(x.kinds.length, x.id).toBeGreaterThan(0);
      expect(x.long, x.id).toEqual([]);
      expect(x.hitsOk, x.id).toBe(true);
    }
    expect(r.find(x => x.id === 'conductor').kinds).toEqual(['hits']);
    expect(r.find(x => x.id === 'termite').kinds).toEqual(['hit', 'dot']);
    watch.check();
  });

  test('the meter fills by accuracy; full = its SPECIAL instead of its usual turn (one big hit); the HUD shows it', async ({page}) => {
    const watch = await boot(page, save({band: ['squawk']}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await fight(page, 'warble');
    const fill = await page.evaluate(() => 36);
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(10));
    await turn(page);
    expect((await st(page)).band[0].sp).toBeCloseTo(fill, 5);
    expect(await page.evaluate(() => document.querySelector('#qComp0 .q-sp i').style.width)).toBe(fill + '%');
    await turn(page);
    expect((await st(page)).band[0].sp).toBeCloseTo(2 * fill, 5);
    expect((await lines(page)).some(l => /SPECIAL/.test(l))).toBe(false);
    await page.evaluate(() => { window.__floats.length = 0; window.__lines.length = 0; });
    await turn(page);                                                          // 108 → full: SOUR SQUAWK
    const l = await lines(page);
    expect(l).toContain('Squawk\'s SPECIAL: SOUR SQUAWK!');
    expect(l).toContain(`SOUR SQUAWK! Warble takes ${Math.round(power * 1.1)}.`);
    expect(l.some(x => x.startsWith('Squawk plays along'))).toBe(false);
    expect((await st(page)).band[0].sp).toBe(0);
    expect(await page.evaluate(() => window.__floats.some(f => /special/.test(f[0])))).toBe(true);
    watch.check();
  });

  test('half the accuracy, half the fill (no special until the meter is really full)', async ({page}) => {
    const watch = await boot(page, save({band: ['squawk']}));
    await fight(page, 'warble');
    await page.evaluate(() => { window.__play = {acc: .5, speed: 1, correct: 2, total: 4, success: false}; });
    for (let k = 1; k <= 5; k++) { await turn(page); expect((await st(page)).band[0].sp, `turn ${k}`).toBeCloseTo(18 * k, 5); }
    expect((await lines(page)).some(l => /SPECIAL/.test(l))).toBe(false);
    watch.check();
  });

  test('several hits (the Ghost Conductor\'s BATON FLURRY: 4 swings)', async ({page}) => {
    const watch = await boot(page, save({band: ['conductor']}));
    await fight(page, 'warble');
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(10));
    await turn(page); await turn(page);
    const hp = (await st(page)).hp;
    await page.evaluate(() => { window.__lines.length = 0; });
    await turn(page);
    const each = Math.round(power * .45), l = await lines(page);
    expect(l).toContain(`BATON FLURRY: 4 hits! Warble takes ${4 * each} in all.`);
    const mine = +l.map(x => /takes (\d+)/.exec(x)).find(m => m && !/BATON/.test(m.input))[1];   // your own PLAY (a skill crit at 100 %)
    expect(hp - (await st(page)).hp, l.join(' | ')).toBe(mine + 4 * each);
    watch.check();
  });

  test('an ECHO (Wisp): hits at the start of the enemy\'s next 3 turns, then stops; two stack; never below 1 HP', async ({page}) => {
    const watch = await boot(page, save({band: ['wisp', 'miclet']}));
    await fight(page, 'warble');
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(10));
    const wisp = Math.round(power * .25), mic = Math.round(power * .3);
    await turn(page); await turn(page);
    await page.evaluate(() => { window.__lines.length = 0; });
    await turn(page);                                                            // both full: both echoes start
    let s = await st(page);
    // the 3rd turn's echoes already hit once at the start of that enemy turn
    expect(s.dots.map(d => [d.name, d.per, d.turns])).toEqual([['WILL-O\'-THE-WISP', wisp, 2], ['ECHO ECHO', mic, 2]]);
    let l = await lines(page);
    expect(l).toContain(`WILL-O'-THE-WISP echoes! Warble takes ${wisp}.`);
    expect(l).toContain(`ECHO ECHO echoes! Warble takes ${mic}.`);
    await turn(page); await turn(page);
    s = await st(page);
    expect(s.dots).toEqual([]);
    // never below 1 HP: the meters were at 72 after those two turns, so the next PLAY starts two fresh echoes
    await turn(page);
    s = await st(page);
    expect(s.dots.length).toBe(2);
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(3));
    await pick(page, 'LISTEN');                                                  // no damage of yours: the echoes alone
    await until(page, () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') && !document.querySelector('#qText:not([hidden])'));
    s = await st(page);
    expect(s.hp).toBe(1);
    expect(s.state).toBe('fight');
    watch.check();
  });

  test('after a SERENADE a damage special adds CALM, no damage', async ({page}) => {
    const watch = await boot(page, save({band: ['squawk']}));
    await fight(page, 'warble', {hp: 4000});                                   // (a big one: the CALM meter fills slowly)
    await turn(page, 'SERENADE'); await turn(page, 'SERENADE');
    const before = await st(page);
    await page.evaluate(() => { window.__lines.length = 0; });
    await turn(page, 'SERENADE');
    const after = await st(page), l = await lines(page);
    expect(l).toContain('Squawk\'s SPECIAL: SOUR SQUAWK!');
    expect(l).toContain('SOUR SQUAWK, played softly. Warble listens.');
    expect(after.hp).toBe(before.hp);
    expect(after.calm).toBeGreaterThan(before.calm);
    watch.check();
  });

  test('support specials: SHHHHH! shields, TEMPO CHANGE slows the next dodge, VALVE OIL SPLASH heals everyone', async ({page}) => {
    const watch = await boot(page, save({band: ['hush', 'metrognome']}));
    await fight(page, 'warble');
    await turn(page); await turn(page);
    await page.evaluate(() => { window.__dodges.length = 0; });
    await turn(page);
    const d = await page.evaluate(() => window.__dodges.slice());
    expect(d[0].slow).toBe(.55);
    expect(d[0].shield).toBe(3);
    await page.evaluate(() => Arcade.Quest.go('arena'));
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.band = ['stickyvalve']; s.roster = ['stickyvalve']; Arcade.Quest.save.write(); });
    await fight(page, 'warble');
    await turn(page); await turn(page);
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.hp = 5; });
    await turn(page);
    const s = await st(page);
    expect(s.php).toBe(5 + Math.round(s.maxHp * .3));
    watch.check();
  });
});

test.describe('TOM-TOM TERMITE', () => {
  test('a bonus friend in the Prop Workshop: never one of the 20 machines', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, ws = window.QUEST_MAPS.workshop, t = ws.enemies.find(e => e.type === 'termite');
      const s = Q.save.get();
      const ghosts = Q.save.ghosts(2).map(g => g.key);
      // every Workshop machine but the termite helped: the gate is open (the save repair) and the % ignores the termite
      ['m1', 'm2', 'm3', 'm4'].forEach(k => { s.done['workshop:' + k] = 'befriend'; });
      Q.save.write(); Q.save.load && Q.save.load();
      const E = window.QUEST_ENEMIES.find(e => e.id === 'termite');
      return {t, n: ghosts.length, has: ghosts.includes('workshop:x1'), helped: Q.save.helped(2), sal: Q.save.flag('salAwake'), E: {extra: E.extra, area: E.area, sprite: !!Q.spriteDef('termite')}};
    });
    expect(r.t).toEqual({key: 'x1', type: 'termite', at: [14, 8], wander: 1, extra: true});
    expect(r.n).toBe(20);
    expect(r.has).toBe(false);
    expect(r.helped).toBe(4);
    expect(r.E).toEqual({extra: true, area: 'stage', sprite: true});
    watch.check();
  });

  test('\'stage-friends\' never needs the termite; befriended, it joins the band and its GHOST GNAW hits, then echoes', async ({page}) => {
    const all = ['tapsy', 'spotlight', 'feedback', 'confetti', 'metrognome', 'stubs', 'ropeknot', 'miclet', 'rico', 'bignumber'];
    const watch = await boot(page, save({roster: all, band: []}));
    expect(await page.evaluate(() => !!Arcade.Quest.save.achievements()['stage-friends'])).toBe(true);
    // befriend it (HARMONIZE with a full CALM)
    await page.evaluate(() => { Arcade.Quest.go('battle', {enemy: 'termite', back: 'arena', overrides: {calm: {perNote: 0, listen: 200, success: 0}}}); });
    await until(page, cmdReady);
    await pick(page, 'LISTEN');
    await until(page, () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-harm.ready'));
    await pick(page, 'HARMONIZE');
    await until(page, () => Arcade.Quest.sceneName === 'arena');
    expect(await page.evaluate(() => Arcade.Quest.save.get().roster.includes('termite'))).toBe(true);
    expect(await page.evaluate(() => Arcade.Quest.band.choices().includes('termite'))).toBe(true);
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.band = ['termite']; Arcade.Quest.save.write(); });
    await fight(page, 'warble');
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(10));
    await turn(page); await turn(page);
    await page.evaluate(() => { window.__lines.length = 0; });
    await turn(page);
    const l = await lines(page);
    expect(l).toContain('Tom-Tom Termite\'s SPECIAL: GHOST GNAW!');
    expect(l).toContain(`GHOST GNAW! Warble takes ${Math.round(power * .6)}.`);
    expect((await st(page)).dots.map(d => [d.name, d.per, d.turns])).toEqual([['GHOST GNAW', Math.round(power * .2), 3]]);
    watch.check();
  });

  test('a save code carries it (QUEST_V6.roster\'s 11th place, version 7): befriended, it comes back in the roster and stays helped', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({roster: ['tapsy', 'termite'], band: ['termite'], done: {'workshop:x1': 'befriend', 'workshop:m1': 'fade'}}));
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, code = Arcade.Backup.questEncode(Q.save.get());
      Q.save.reset();
      const ok = Q.save.fromCode(code).ok, s = Q.save.get();
      return {ok, len: code.replace(/[^A-Z0-9]/g, '').length, roster: s.roster, x1: s.done['workshop:x1'], m1: s.done['workshop:m1']};
    });
    expect(r).toEqual({ok: true, len: 85, roster: ['tapsy', 'termite'], x1: 'befriend', m1: 'fade'});
    watch.check();
  });

  test('it stands in the Workshop (drawn at every frame), and helping it never wakes Sal on its own', async ({page}) => {
    const watch = await boot(page, save({}), 'arcade-quest/index.html?demo&warp=workshop');
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state() && Arcade.Quest.world.state().map === 'workshop');
    const r = await page.evaluate(() => ({ghosts: Arcade.Quest.world.state().ghosts, frames: Arcade.Quest.spriteDef('termite').frames.length}));
    expect(JSON.stringify(r.ghosts)).toContain('termite');
    expect(r.frames).toBe(3);
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.done['workshop:x1'] = 'befriend'; Arcade.Quest.save.write(); });
    expect(await page.evaluate(() => Arcade.Quest.save.flag('salAwake'))).toBeFalsy();
    watch.check();
  });
});
