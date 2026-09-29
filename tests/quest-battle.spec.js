/* ARCADE QUEST BATTLES: a well-played battle can end in a fade (a full CALM no longer protects the enemy), HARMONIZE
   still befriends, a TRIO (you + 2 befriended ghosts) where a companion is hit, sits out and never comes back into the
   enemy's aim, power by level (LV 1 vs LV 10), and old saves getting the default band.
   The real battle scene runs through its own menus and text boxes; only the student's playing is stood in for:
   Q.challenge.run returns a chosen result (how well "you" played) and Q.dodge.start plays a chosen number of hits. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: false};

async function open(page, {level = 1, roster = [], band} = {}) {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(({level, roster, band}) => {
    const Q = Arcade.Quest, s = Q.save.reset();
    s.level = level; s.roster = roster; if (band !== undefined) s.band = band;
    Q.charms.fixHp(s); s.hp = s.maxHp; Q.save.write();
    window.__lines = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async () => Object.assign({}, window.__play);
    window.__hits = 0;                                          // sour notes that get through on the enemy's turn
    Q.dodge.start = async ({onHit, enemy}) => {
      let dmg = 0, hits = 0;
      for (let i = 0; i < window.__hits; i++) { const d = Math.max(1, Math.round(enemy.atk || 2)); hits++; dmg += d; if (onHit(d, false) === 'stop') break; }
      return {damage: dmg, hits, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0};
    };
  }, {level, roster, band});
  return watch;
}
const state = page => page.evaluate(() => Arcade.Quest.battleState());
const start = (page, enemy) => page.evaluate(e => Arcade.Quest.go('battle', {enemy: e, back: 'arena'}), enemy);
/** step the battle: advance text with A (Enter); at the command menu pick `cmd(state)` ('PLAY', 'HARMONIZE'…) */
async function step(page, cmd) {
  const menu = await page.evaluate(() => { const c = document.getElementById('qCmd'); return !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0; });
  if (menu) {
    const label = cmd(await state(page));
    await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)); b.click(); }, label);
  } else await page.keyboard.press('Enter');
  await page.waitForTimeout(40);
}
async function until(page, done, cmd = () => 'PLAY', max = 400) {
  for (let i = 0; i < max; i++) {
    const s = await page.evaluate(() => ({b: Arcade.Quest.battleState(), scene: Arcade.Quest.sceneName}));
    if (done(s.b, s.scene)) return s;
    await step(page, cmd);
  }
  throw new Error('the battle never got there');
}

test('a well-played battle can end in a FADE, even with a full CALM (the student chooses)', async ({page}) => {
  const watch = await open(page);
  await start(page, 'squawk');
  let calmFullSeen = false;
  await until(page, (b, scene) => {
    if (b && b.calm >= 100) calmFullSeen = true;
    return scene !== 'battle';                                  // (through the rewards' text, back to the arena)
  });
  expect(calmFullSeen).toBe(true);                              // CALM filled up on the way…
  const lines = await page.evaluate(() => window.__lines);
  expect(lines).toContain('Its CALM is full: HARMONIZE to befriend it, or keep playing to defeat it.');
  expect(lines.filter(l => /CALM is full: HARMONIZE/.test(l))).toHaveLength(1);   // said once
  expect(lines.some(l => /too calm to fade|won't fade away/.test(l))).toBe(false);
  // … and playing on defeated it: it faded away
  await expect.poll(() => page.evaluate(() => (Arcade.Quest.save.get().battles || {}).faded)).toBe(1);
  expect(await page.evaluate(() => Arcade.Quest.save.get().roster)).toEqual([]);
  expect(lines.some(l => /fades away/.test(l))).toBe(true);
  watch.check();
});

test('HARMONIZE with a full CALM still befriends', async ({page}) => {
  const watch = await open(page);
  await start(page, 'squawk');
  await until(page, (b, scene) => scene !== 'battle', b => (b && b.calm >= 100 ? 'HARMONIZE' : 'PLAY'));
  await expect.poll(() => page.evaluate(() => Arcade.Quest.save.get().roster)).toEqual(['squawk']);
  expect(await page.evaluate(() => (Arcade.Quest.save.get().battles || {}).befriended)).toBe(1);
  watch.check();
});

test('a story-critical enemy (the Phantom Fermata) still holds on at 1 HP until HARMONIZED', async ({page}) => {
  const watch = await open(page, {level: 6});
  await start(page, 'fermata');
  await until(page, b => b && b.hp <= 1, () => 'PLAY');
  const b = await state(page);
  expect(b.hp).toBe(1);
  expect(b.state).toBe('fight');
  watch.check();
});

test('a TRIO: companions play after you (your accuracy), a companion that is hit sits out, then it\'s back next battle', async ({page}) => {
  const watch = await open(page, {roster: ['squawk', 'wisp', 'hush']});   // never chosen: the last two befriended play
  expect(await page.evaluate(() => Arcade.Quest.band.members())).toEqual(['wisp', 'hush']);
  await start(page, 'wobble');
  await expect.poll(async () => (await state(page)) && (await state(page)).band.length).toBe(2);
  let b = await state(page);
  expect(b.ehp).toBe(Math.round(30 * (1 + 0.3 * 2)));           // a fair fight for a trio: 48 HP
  await expect(page.locator('#qComp0 .q-cname')).toHaveText('Wisp');
  await expect(page.locator('#qComp1 .q-cname')).toHaveText('Hush');
  await expect(page.locator('#qHudP .q-party')).toHaveText('TRIO');
  // one PLAY at 50 %: you do 10 × .5 × (0.55 + 0.45) = 5, each companion .3 × 10 × .5 = 1.5 -> 2
  await page.evaluate(() => { window.__play = {acc: .5, speed: 1, correct: 1, total: 2, success: false}; Math.random = () => 0.99; window.__hits = 30; });
  await until(page, b => b && b.aim === 'hush');                 // the enemy's turn: aimed at Hush (the last of the pool)
  b = await state(page);
  expect(b.hp).toBe(48 - 5 - 2 - 2);
  await until(page, b => b && b.band[1].out);                    // hit until out of breath: it sits out
  b = await state(page);
  expect(b.band[1]).toMatchObject({id: 'hush', hp: 0, out: true});
  expect(b.php).toBe(b.maxHp);                                   // you weren't hit
  expect(b.state).toBe('fight');                                 // the battle goes on
  await expect(page.locator('#qComp1')).toHaveClass(/out/);
  const lines = await page.evaluate(() => window.__lines);
  expect(lines.some(l => /Hush is out of breath and sits out/.test(l))).toBe(true);
  // next turns: never aimed at Hush again (Math.random .99 now picks Wisp, the last one still playing)
  await page.evaluate(() => { window.__hits = 0; });
  const hpBefore = b.hp;
  await until(page, b => b && b.aim && b.aim !== null && b.hp < hpBefore);
  b = await state(page);
  expect(b.aim).toBe('wisp');
  expect(hpBefore - b.hp).toBe(5 + 2);                           // Hush sits out: only you and Wisp play
  // finish it, then a new battle: everyone back at full HP
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true}; });
  await until(page, (b, scene) => scene !== 'battle');
  await start(page, 'squawk');
  await expect.poll(async () => { const s = await state(page); return s && s.band.map(c => [c.id, c.out, c.hp === c.maxHp]); })
    .toEqual([['wisp', false, true], ['hush', false, true]]);
  watch.check();
});

test('the BAND screen: up to 2 friends, a third sends the oldest pick on a break, a solo is allowed', async ({page}) => {
  const watch = await open(page, {roster: ['squawk', 'wisp', 'hush']});
  await page.evaluate(() => { Arcade.Quest.talk.band(); });
  const panel = page.locator('.q-band');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Playing beside you: Wisp and Hush.');
  await panel.locator('.q-btn', {hasText: 'Squawk'}).click();
  expect(await page.evaluate(() => Arcade.Quest.band.members())).toEqual(['hush', 'squawk']);
  await panel.locator('.q-btn', {hasText: 'Hush'}).click();
  await panel.locator('.q-btn', {hasText: 'Squawk'}).click();
  expect(await page.evaluate(() => Arcade.Quest.band.members())).toEqual([]);
  await expect(panel).toContainText('Just you (a solo)');
  await panel.locator('.q-btn', {hasText: 'Done'}).click();
  expect(await page.evaluate(() => Arcade.Quest.save.get().band)).toEqual([]);
  watch.check();
});

test('damage grows with level: one perfect PLAY at LV 1 vs LV 10 (solo), shown as POW', async ({page}) => {
  const hit = async level => {
    await open(page, {level});
    await start(page, 'squawk');
    await until(page, b => b && b.hp < b.ehp);
    const b = await state(page);
    await expect(page.locator('#qPHpN')).toContainText(`POW ${b.power}`);
    return {dmg: b.ehp - b.hp, power: b.power};
  };
  const lv1 = await hit(1), lv10 = await hit(10);
  expect(lv1).toEqual({dmg: 10, power: 10});
  expect(lv10).toEqual({dmg: 33, power: 33});
  // every level is clearly stronger than the last (about 14 %)
  const curve = await page.evaluate(() => Array.from({length: 15}, (_, i) => Arcade.Quest.save.powerAt(i + 1)));
  curve.slice(1).forEach((p, i) => expect(p / curve[i]).toBeGreaterThan(1.08));
});

test('an old save (version 3, no band choice) keeps working and gets the default band', async ({page}) => {
  const old = {v: 3, level: 4, xp: 5, hp: 30, maxHp: 32, tokens: 12, items: {'valve-oil': 1}, roster: ['warble', 'wisp', 'hush', 'wobble'], battles: {won: 4, befriended: 4, faded: 0},
    world: null, flags: {songBb: true}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}};
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS, save: old}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  const r = await page.evaluate(() => ({s: Arcade.Quest.save.get(), band: Arcade.Quest.band.members()}));
  expect(r.s.v).toBe(4);
  expect(r.s.band).toBe(null);
  expect(r.s.level).toBe(4);
  expect(r.s.roster).toEqual(old.roster);
  expect(r.band).toEqual(['hush', 'wobble']);
  watch.check();
});
