/* ARCADE QUEST: THE GLITCH DIMENSION (designed by a Raven Band student; engine/world.js THE GLITCH CODE, data/maps/stage.js
   `glitch`, data/enemies.js `yourself` / `mrgraham`, battle.js fillAtHold + THE BAND COMBO, challenges.js first5x3).
   THE CODE: nothing before ep2Done; after it, the room (glitchFound). Sizzle tells it. BEFRIEND-ONLY: PLAY as hard as
   you like, HP stops at 1 and CALM fills; a missed HARMONIZE keeps it; HARMONIZE = the first five × 3 (15 notes; the
   snare 15 strokes). REWARDS: Yourself?!? = the GLITCH NOTE (every turn, stacking echoes) + the Glitch look; Mr.
   Graham? = THE BAND COMBO (every special at once); both join the band. Sprites: Yourself?!? from the student's own
   avatar, half glitched; Mr. Graham? 3 frames. Save codes carry the flags (version 7). Never one of the 20. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
function save({level = 11, band = [], flags = {}, done = {}, roster} = {}) {
  return {v: 7, level, xp: 0, hp: 20 + (level - 1) * 4, maxHp: 20 + (level - 1) * 4, tokens: 0, items: {}, roster: (roster || band).slice(), battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band, route: {}, ep: 2, done,
    gear: {tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}},
    flags: Object.assign({'seen-intro': true, pathsTip: true, rhythmTip: true, ep1Done: true, ep2Start: true, ep2Done: true}, flags)};
}
async function boot(page, s = save(), {url = 'arcade-quest/index.html?demo&test', member = 'trumpet', standIn = true} = {}) {
  const watch = await prepare(page, {store: device(member, {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName && (Arcade.Quest.sceneName !== 'world' || Arcade.Quest.world.state()));
  await page.evaluate(standIn => {
    const Q = Arcade.Quest;
    window.__lines = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
    window.__harm = {acc: 1, speed: 1, correct: 15, total: 15, success: true};
    if (standIn) {
      Q.challenge.run = async (type, o) => Object.assign({}, o && o.harmonize ? window.__harm : window.__play);
      Q.challenge.move = async () => Object.assign({}, window.__play);
      Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
    }
  }, standIn);
  return watch;
}
async function until(page, done, arg, max = 300) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(done, arg)) return;
    if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('never: ' + done.toString() + ' ' + JSON.stringify(await page.evaluate(() => ({b: Arcade.Quest.battleState(), scene: Arcade.Quest.sceneName}))));
}
const cmdReady = () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') && !document.querySelector('#qCmd .q-btn.c-back') && !document.querySelector('#qText:not([hidden])');
const pick = (page, label) => page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.querySelector('.q-bl').textContent === l && !x.disabled); if (!b) throw new Error('no ' + l); b.click(); }, label);
const labels = page => page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn')].map(b => ({label: b.querySelector('.q-bl').textContent, off: b.disabled})));
const st = page => page.evaluate(() => Arcade.Quest.battleState());
/** PLAY (then the sub-menu's first entry, or `sub`), through the enemy's turn */
async function play(page, sub) {
  await pick(page, 'PLAY');
  await page.waitForTimeout(120);
  if (await page.locator('#qCmd .q-btn.c-back').count()) { if (sub) await pick(page, sub); else await page.locator('#qCmd .q-btn').first().click(); }
  await until(page, () => (!!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') && !document.querySelector('#qCmd .q-btn.c-back') && !document.querySelector('#qText:not([hidden])')) || Arcade.Quest.sceneName !== 'battle');
}
async function fight(page, enemy) {
  await page.evaluate(e => { window.__lines.length = 0; Arcade.Quest.go('battle', {enemy: e, back: 'arena'}); }, enemy);
  await until(page, cmdReady);
}

test.describe('THE GLITCH DIMENSION: the way in', () => {
  test('the code does nothing before Episode 2 is finished', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({flags: {ep2Done: false}}), {url: 'arcade-quest/index.html?demo&warp=lobby'});
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state().map === 'lobby' && !Arcade.Quest.world.state().busy);
    await page.evaluate(() => Arcade.Quest.world.code());
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({map: Arcade.Quest.world.state().map, found: Arcade.Quest.save.flag('glitchFound'), lines: window.__lines.slice()}));
    expect(r).toEqual({map: 'lobby', found: false, lines: []});
    watch.check();
  });

  test('after it: UP UP LEFT RIGHT DOWN UP RIGHT RIGHT DOWN UP opens the room; a wrong press doesn\'t; the portal goes back to the Lobby', async ({page}) => {
    const watch = await boot(page, save(), {url: 'arcade-quest/index.html?demo&warp=lobby'});
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state().map === 'lobby' && !Arcade.Quest.world.state().busy);
    await page.evaluate(() => Arcade.Quest.world.code(['up', 'up', 'left', 'right', 'down', 'up', 'right', 'left', 'down', 'up']));
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => Arcade.Quest.world.state().map)).toBe('lobby');
    await page.evaluate(() => Arcade.Quest.world.code());
    await until(page, () => Arcade.Quest.world.state().map === 'glitch' && !Arcade.Quest.world.state().busy);
    const r = await page.evaluate(() => ({w: Arcade.Quest.world.state(), found: Arcade.Quest.save.flag('glitchFound'), lines: window.__lines.slice(), ep: Arcade.Quest.save.get().ep}));
    expect(r.found).toBe(true);
    expect(r.lines).toContain('KSSSHHHH! The world glitches... and pulls you somewhere else!');
    expect([r.w.x, r.w.y]).toEqual([6, 7]);
    expect(r.ep).toBe(2);
    expect(r.w.ghosts.map(g => g.type).sort()).toEqual(['mrgraham', 'yourself']);
    // the portal: one step down
    await page.keyboard.press('ArrowDown');
    await until(page, () => Arcade.Quest.world.state().map === 'lobby' && !Arcade.Quest.world.state().busy);
    expect(await page.evaluate(() => [Arcade.Quest.world.state().x, Arcade.Quest.world.state().y])).toEqual([21, 5]);
    watch.check();
  });

  test('Sous-Chef Sizzle tells the code (after Episode 2 only); never one of the 20; every new line fits', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const t = window.QUEST_DIALOGUE.sizzle.talk, Q = Arcade.Quest;
      const all = [].concat(...t.slice(0, 2).map(x => [].concat(x.lines || [], ...(x.cycle || [])))).concat(window.QUEST_SIGNS['glitch-sign'], window.QUEST_SIGNS['glitch-wall'],
        ...['glitchOpen', 'harmonizeFirst5x3', 'glitchYouReward', 'glitchGrahamReward', 'combo', 'comboSub', 'comboWait', 'comboGo', 'moveIntroGlitch'].map(k => Q.text(k, {move: 'GLITCH NOTE', n: 15})),
        ...window.QUEST_ENEMIES.filter(e => e.area === 'glitch').map(e => [].concat(Object.values(e.lines), e.listen, e.companion.special.say)).flat(2));
      return {first: t[0].if, lines: t[0].lines, long: all.filter(l => typeof l === 'string' && l.length > 80), n: Q.save.ghosts(2).length};
    });
    expect(r.first).toBe('ep2Done&!glitchHint');
    expect(r.lines[1]).toBe('UP, UP, LEFT, RIGHT, DOWN, UP, RIGHT, RIGHT, DOWN, UP.');
    expect(r.long).toEqual([]);
    expect(r.n).toBe(20);
    watch.check();
  });
});

test.describe('THE GLITCH DIMENSION: befriend-only', () => {
  for (const [id, name, flag] of [['mrgraham', 'Mr. Graham?', 'glitchGraham'], ['yourself', 'Yourself?!?', 'glitchYou']]) {
    test(`${name}: PLAY all you like, HP stops at 1 and CALM fills; a missed HARMONIZE keeps it; then HARMONIZE befriends`, async ({page}) => {
      const watch = await boot(page, save({level: 30}));
      await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
      await fight(page, id);
      for (let k = 0; k < 6; k++) {
        await play(page);
        const s = await st(page);
        expect(s.state, `PLAY ${k + 1}`).toBe('fight');
        expect(s.hp).toBeGreaterThanOrEqual(1);
      }
      let s = await st(page);
      expect(s.hp).toBe(1);
      expect(s.calm).toBe(100);
      expect(await page.evaluate(e => window.__lines.includes(window.QUEST_ENEMIES.find(x => x.id === e).lines.hold), id)).toBe(true);
      // a missed HARMONIZE: the CALM stays
      await page.evaluate(() => { window.__harm = {acc: .3, speed: 1, correct: 4, total: 15, success: false}; });
      await pick(page, 'HARMONIZE');
      await until(page, cmdReady);
      s = await st(page);
      expect([s.hp, s.calm, s.state]).toEqual([1, 100, 'fight']);
      await page.evaluate(() => { window.__harm = {acc: 1, speed: 1, correct: 15, total: 15, success: true}; });
      await pick(page, 'HARMONIZE');
      await until(page, () => Arcade.Quest.sceneName === 'arena');
      const after = await page.evaluate(e => ({roster: Arcade.Quest.save.get().roster.includes(e), choice: Arcade.Quest.band.choices().includes(e), faded: Arcade.Quest.save.get().battles.faded}), id);
      expect(after).toEqual({roster: true, choice: true, faded: 0});
      watch.check();
    });
  }

  test('on the map: befriending sets its flag, says its reward, and it leaves the room', async ({page}) => {
    const watch = await boot(page, save({level: 30}), {url: 'arcade-quest/index.html?demo&warp=glitch'});
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state().map === 'glitch' && !Arcade.Quest.world.state().busy);
    for (const [key, flag, reward] of [['graham', 'glitchGraham', 'New in PLAY: BAND COMBO! Fill your band\'s meters halfway, then go!'], ['you', 'glitchYou', 'New move: GLITCH NOTE! And a new look: Glitch (Effects, in Create Your Player).']]) {
      await page.evaluate(k => { window.__lines.length = 0; return Arcade.Quest.world.fight(k); }, key);
      await until(page, () => Arcade.Quest.sceneName === 'battle');
      await until(page, () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play'));
      for (let k = 0; k < 8 && (await st(page)).calm < 100; k++) await play(page);
      await pick(page, 'HARMONIZE');
      await until(page, () => Arcade.Quest.sceneName === 'world' && !Arcade.Quest.world.state().busy && !document.querySelector('#qText:not([hidden])'));
      const r = await page.evaluate(([k, f]) => ({flag: Arcade.Quest.save.flag(f), done: Arcade.Quest.save.get().done['glitch:' + k], here: Arcade.Quest.world.state().ghosts.some(g => g.key === k), lines: window.__lines.slice()}), [key, flag]);
      expect(r.flag, key).toBe(true);
      expect(r.done).toBe('befriend');
      expect(r.here).toBe(false);
      expect(r.lines).toContain(reward);
    }
    expect(await page.evaluate(() => !!Arcade.Quest.save.achievements().glitch)).toBe(true);
    watch.check();
  });

  for (const [member, want] of [['trumpet', 'notes:15'], ['snare', 'taps:15']]) test(`HARMONIZE for real (${member}): your first five, three times = ${want}`, async ({page}) => {
    const watch = await boot(page, save(), {member, standIn: false});
    const r = await page.evaluate(() => {
      Arcade.Quest.challenge.run(null, {enemy: window.QUEST_ENEMIES.find(e => e.id === 'mrgraham'), harmonize: true});
      const p = document.querySelector('.q-chal');
      const what = p.querySelector('#qTaps') ? 'taps:' + p.querySelectorAll('#qTaps i').length : 'notes:' + p.querySelectorAll('[id^="qn"]').length;
      return {what, title: p.querySelector('.q-chal-t').textContent};
    });
    expect(r.what).toBe(want);
    expect(r.title.length).toBeLessThanOrEqual(80);
    watch.check();
  });
});

test.describe('THE GLITCH DIMENSION: the rewards', () => {
  test('the GLITCH NOTE: only after Yourself?!?, usable every turn, and its echoes stack', async ({page}) => {
    const watch = await boot(page, save({level: 2}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    expect(await page.evaluate(() => Arcade.Quest.moves().map(m => m.id))).toEqual([]);
    await page.evaluate(() => { Arcade.Quest.save.setFlag('glitchYou'); });
    expect(await page.evaluate(() => Arcade.Quest.moves().map(m => m.id))).toEqual(['glitch']);
    await fight(page, 'warble');
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(9999));
    await play(page, 'GLITCH NOTE');
    await pick(page, 'PLAY'); await page.waitForTimeout(120);
    expect((await labels(page)).find(l => l.label === 'GLITCH NOTE').off).toBe(false);
    await pick(page, 'GLITCH NOTE');
    await until(page, cmdReady);
    const s = await st(page);
    expect(s.dots.filter(d => d.name === 'GLITCH NOTE').length).toBe(2);
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(2));
    expect(s.dots[0].per).toBe(Math.max(1, Math.round(power * .15)));
    watch.check();
  });

  test('THE BAND COMBO: only after Mr. Graham?; ready once every meter is half full; every special at once, once a battle', async ({page}) => {
    const watch = await boot(page, save({level: 2, band: ['squawk', 'clatterbox'], flags: {glitchGraham: true}}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await fight(page, 'warble');
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(9999));
    await pick(page, 'PLAY'); await page.waitForTimeout(120);
    expect((await labels(page)).find(l => l.label === 'BAND COMBO')).toEqual({label: 'BAND COMBO', off: true});
    await page.locator('#qCmd .q-btn').first().click();
    await until(page, cmdReady);
    await play(page);                                                   // 72 % each
    await pick(page, 'PLAY'); await page.waitForTimeout(120);
    expect((await labels(page)).find(l => l.label === 'BAND COMBO').off).toBe(false);
    await page.evaluate(() => { window.__lines.length = 0; });
    await pick(page, 'BAND COMBO');
    await until(page, cmdReady);
    const l = await page.evaluate(() => window.__lines.slice()), s = await st(page);
    expect(l).toContain('BAND COMBO! Everyone plays their SPECIAL at once!');
    expect(l).toContain('Squawk\'s SPECIAL: SOUR SQUAWK!');
    expect(l).toContain('Clatterbox\'s SPECIAL: CLATTER COMBO!');
    expect(s.combo).toBe(true);
    await pick(page, 'PLAY'); await page.waitForTimeout(120);
    expect((await labels(page)).find(l => l.label === 'BAND COMBO').off).toBe(true);
    watch.check();
  });

  test('the sprites: Yourself?!? = your own avatar, right half glitched (frame 2 = you); Mr. Graham? has 3 frames', async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, id = Q.glitchYou('trumpet'), d = Q.spriteDef(id), base = Q.spriteDef('player-trumpet');
      const px = (c, x0, x1) => { const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let y = 0; y < c.height; y++) for (let x = x0; x < x1; x++) { const i = (y * c.width + x) * 4; h = (h * 31 + g[i] + g[i + 1] * 3 + g[i + 2] * 7 + g[i + 3]) % 1e9; } return h; };
      const b0 = base.canvases[0], w = d.w;
      return {n: d.canvases.length, anim: d.anim, leftSame: px(d.canvases[0], 0, w / 2 - 2) === px(b0, 0, w / 2 - 2), rightDiff: px(d.canvases[0], w / 2, w) !== px(b0, w / 2, w),
        happySame: px(d.canvases[2], 0, w) === px(b0, 0, w), graham: Q.spriteDef('mrgraham').frames.length};
    });
    expect(r).toEqual({n: 3, anim: [0, 1], leftSame: true, rightDiff: true, happySame: true, graham: 3});
    watch.check();
  });

  test('the Glitch look: locked until \'glitch\'; drawn in front, right half only, never on the face', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const AV = Arcade.Avatar, before = AV.isUnlocked('effect', 'glitch'), req = AV.requirement('effect', 'glitch');
      Arcade.Quest.save.setFlag('glitchYou'); Arcade.Quest.save.achievements();
      const after = AV.isUnlocked('effect', 'glitch');
      const c = document.createElement('canvas'); c.width = c.height = 360; const x = c.getContext('2d');
      Arcade.AvatarFx.draw(x, 'glitch', 360, 1.3, {layer: 'front'});
      const g = x.getImageData(0, 0, 360, 360).data, at = (px, py) => g[(py * 360 + px) * 4 + 3];
      let face = 0, left = 0, right = 0;
      for (let y = 0; y < 360; y += 2) for (let xx = 0; xx < 360; xx += 2) {
        const bx = xx / 10, by = y / 10, a = at(xx, y);
        if (bx > 8.5 && bx < 27.5 && by > 9.5 && by < 25.5) face += a ? 1 : 0; else if (bx < 16.5) left += a ? 1 : 0; else right += a ? 1 : 0;   // (a band may slip a pixel past the middle)
      }
      return {before, req, after, face, left, right, back: (() => { const k = document.createElement('canvas'); k.width = k.height = 36; Arcade.AvatarFx.draw(k.getContext('2d'), 'glitch', 36, 0, {layer: 'back'}); return k.getContext('2d').getImageData(0, 0, 36, 36).data.some(v => v); })(),
        code: true};
    });
    expect(r.before).toBe(false);
    expect(r.req).toBe('Befriend Yourself?!? in the Glitch Dimension (Arcade Quest)');
    expect(r.after).toBe(true);
    expect(r.face).toBe(0);
    expect(r.left).toBe(0);
    expect(r.right, JSON.stringify(r)).toBeGreaterThan(50);
    expect(r.back).toBe(false);
    watch.check();
  });

  test('a save code carries it (version 7): the two friends\' flags, then the friends and their done keys come back', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({roster: ['yourself', 'mrgraham'], band: ['mrgraham'], flags: {glitchFound: true, glitchYou: true, glitchGraham: true}, done: {'glitch:you': 'befriend', 'glitch:graham': 'befriend'}}));
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, code = Arcade.Backup.questEncode(Q.save.get());
      Q.save.reset();
      const ok = Q.save.fromCode(code).ok, s = Q.save.get();
      return {ok, len: code.replace(/[^A-Z0-9]/g, '').length, flags: ['glitchYou', 'glitchGraham'].map(f => !!s.flags[f]), roster: s.roster.filter(r => ['yourself', 'mrgraham'].includes(r)).sort(),
        done: [s.done['glitch:you'], s.done['glitch:graham']], glitch: !!Q.save.achievements().glitch, moves: Q.moves().map(m => m.id)};
    });
    expect(r).toEqual({ok: true, len: 85, flags: [true, true], roster: ['mrgraham', 'yourself'], done: ['befriend', 'befriend'], glitch: true, moves: ['bop', 'blow', 'big', 'ultra', 'glitch']});
    watch.check();
  });
});
