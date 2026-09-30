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

test('HARMONIZE with a full CALM still befriends (the befriend path: SERENADE, then HARMONIZE)', async ({page}) => {
  const watch = await open(page);
  await start(page, 'squawk');
  await until(page, (b, scene) => scene !== 'battle', b => (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE'));
  await expect.poll(() => page.evaluate(() => Arcade.Quest.save.get().roster)).toEqual(['squawk']);
  expect(await page.evaluate(() => (Arcade.Quest.save.get().battles || {}).befriended)).toBe(1);
  watch.check();
});

test('the Phantom Fermata can be defeated now: it fades and opens the Hidden Passage (atticPassage), not the door', async ({page}) => {
  const watch = await open(page, {level: 6});
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 0, total: 3, success: false}; });
  await start(page, 'fermata');
  await until(page, (b, scene) => scene !== 'battle');
  const f = await page.evaluate(() => Arcade.Quest.save.get().flags);
  expect(f.atticPassage).toBe(true);
  expect(f.atticOpen).toBeFalsy();
  watch.check();
});

test('the Ghost Conductor holds on ONCE for his finale (CALM fills, the choice is said), then can be defeated', async ({page}) => {
  const watch = await open(page, {level: 8});
  await start(page, 'conductor');
  await until(page, b => b && b.hp === 1 && b.calm >= 100, () => 'PLAY');
  const lines = await page.evaluate(() => window.__lines);
  expect(lines.some(l => /HARMONIZE to give the orchestra back its sound, or keep playing/.test(l))).toBe(true);
  expect((await state(page)).state).toBe('fight');
  await until(page, b => !b || b.state !== 'fight', () => 'PLAY');                // PLAY again: he fades
  expect((await state(page)).state).toBe('fading');
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
  // a perfect PLAY (100 %, full speed) is a SKILL CRIT: power × 1.5
  expect(lv1).toEqual({dmg: 15, power: 10});
  expect(lv10).toEqual({dmg: Math.round(33 * 1.5), power: 33});
  // every level is clearly stronger than the last (about 14 %)
  const curve = await page.evaluate(() => Array.from({length: 15}, (_, i) => Arcade.Quest.save.powerAt(i + 1)));
  curve.slice(1).forEach((p, i) => expect(p / curve[i]).toBeGreaterThan(1.08));
});

test('an old save (version 3, no band choice) keeps working and gets the default band (and the current version)', async ({page}) => {
  const old = {v: 3, level: 4, xp: 5, hp: 30, maxHp: 32, tokens: 12, items: {'valve-oil': 1}, roster: ['warble', 'wisp', 'hush', 'wobble'], battles: {won: 4, befriended: 4, faded: 0},
    world: null, flags: {songBb: true}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}};
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS, save: old}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  const r = await page.evaluate(() => ({s: Arcade.Quest.save.get(), band: Arcade.Quest.band.members()}));
  expect(r.s.v).toBe(await page.evaluate(() => Arcade.Quest.save.VERSION));
  expect(r.s.band).toBe(null);
  expect(r.s.level).toBe(4);
  expect(r.s.roster).toEqual(old.roster);
  expect(r.band).toEqual(['hush', 'wobble']);
  watch.check();
});

/* SERENADE: the befriend path (battle.js THE CALM SCALE, THE SAFETY NET, the turns table) */
/** one whole battle, counting YOUR turns (every command that ends in the enemy's turn or the end) */
async function fight(page, enemy, pick) {
  await start(page, enemy);
  let turns = 0;
  for (let i = 0; i < 600; i++) {
    const s = await page.evaluate(() => ({b: Arcade.Quest.battleState(), scene: Arcade.Quest.sceneName, menu: (c => !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0)(document.getElementById('qCmd'))}));
    if (s.scene !== 'battle') return {turns, save: await page.evaluate(() => Arcade.Quest.save.get())};
    if (s.menu) {
      const label = pick(s.b); turns++;
      await page.evaluate(l => [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)).click(), label);
    } else await page.keyboard.press('Enter');
    await page.waitForTimeout(30);
  }
  throw new Error('the battle never ended');
}
const PLAYED = {acc: .8, speed: .7, correct: 2, total: 3, success: true};   // "about 80 %" (the turns table)
for (const level of [1, 10]) for (const trio of [false, true]) {
  test(`SERENADE then HARMONIZE befriends in about as many turns as PLAY defeats (LV ${level}, ${trio ? 'trio' : 'solo'})`, async ({page}) => {
    const band = trio ? ['wisp', 'hush'] : [];
    const watch = await open(page, {level, roster: ['wisp', 'hush'], band});
    // DEFEAT: PLAYs at 80 % (no lucky crit rolled: the table's average; crits have their own tests)
    await page.evaluate(p => { window.__play = Object.assign({}, p, {correct: 0, success: false}); Math.random = () => 0.99; }, PLAYED);
    const defeat = await fight(page, 'wobble', () => 'PLAY');
    await page.evaluate(p => { window.__play = p; }, PLAYED);
    expect(defeat.save.battles.faded).toBe(1);
    const befriend = await fight(page, 'wobble', b => (b.calm >= 100 ? 'HARMONIZE' : 'SERENADE'));
    expect(befriend.save.battles.befriended).toBe(1);
    expect(befriend.save.roster).toContain('wobble');
    // the same length within a turn (the table: LV 1 5 / 5, LV 10 2 / 2)
    expect(Math.abs(befriend.turns - defeat.turns), `defeat ${defeat.turns}, befriend ${befriend.turns}`).toBeLessThanOrEqual(1);
    expect(defeat.turns).toBe(level === 1 ? 5 : 2);
    watch.check();
  });
}

test('SERENADE does no damage; your band follows your lead with CALM (not damage); LISTEN names SERENADE; the first battle says the two ways once', async ({page}) => {
  const watch = await open(page, {roster: ['wisp', 'hush'], band: ['wisp', 'hush']});
  await page.evaluate(() => { window.__play = {acc: .5, speed: 1, correct: 1, total: 1, success: false}; });
  await start(page, 'wobble');
  await until(page, b => b && b.calm > 0, () => 'SERENADE');
  const b = await state(page);
  expect(b.hp).toBe(b.ehp);                                      // no damage from you or the band
  // you: 38 × .5 × (30 / 48) = 11.9; Wisp .3 of yours = 3.6; Hush .3 of yours + its calm perk 8 × .5 × .625 = 6.1
  expect(b.calm).toBeCloseTo(11.875 + 3.5625 + 3.5625 + 2.5, 1);
  await until(page, b => b && b.aim);                            // (on to the enemy's turn)
  let lines = await page.evaluate(() => window.__lines);
  expect(lines.filter(l => /plays along softly|hums along with you/.test(l)).length).toBe(2);
  expect(lines.some(l => /takes \d/.test(l))).toBe(false);
  expect(lines.filter(l => /^Two ways to win: PLAY to defeat it, or SERENADE/.test(l))).toHaveLength(1);
  await until(page, b => b && !b.aim);
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__lines.includes('It calms down when you play its happy notes: SERENADE.'))); i++) await step(page, () => 'LISTEN');
  expect(await page.evaluate(() => window.__lines.includes('It calms down when you play its happy notes: SERENADE.'))).toBe(true);
  // a second battle: no tutorial line again
  await page.evaluate(() => { window.__lines = []; window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true}; });
  await until(page, (b, scene) => scene !== 'battle');
  await start(page, 'squawk');
  await until(page, b => b && b.hp < b.ehp);
  lines = await page.evaluate(() => window.__lines);
  expect(lines.some(l => /^Two ways to win/.test(l))).toBe(false);
  watch.check();
});

test('THE SAFETY NET: after a SERENADE, a PLAY that would defeat it with CALM ≥ 50 leaves it at 1 HP once; the next PLAY defeats it', async ({page}) => {
  const watch = await open(page);
  // Wobble: 30 HP; one SERENADE at 60 % (CALM 22.8), then PLAYs at 90 % (no crit: 70 % speed; 9 damage, 36 CALM each)
  await page.evaluate(() => { window.__play = {acc: .6, speed: 1, correct: 1, total: 1, success: false}; Math.random = () => 0.99; });
  await start(page, 'wobble');
  await until(page, b => b && b.calm > 0, () => 'SERENADE');
  await page.evaluate(() => { window.__play = {acc: .9, speed: .7, correct: 3, total: 3, success: true}; });
  await until(page, b => b && b.net);
  let b = await state(page);
  expect([b.hp, b.state]).toEqual([1, 'fight']);
  await until(page, b => b && b.aim);                            // its words, then the enemy's turn
  const lines = await page.evaluate(() => window.__lines);
  expect(lines.filter(l => l === 'It\'s barely standing… but it\'s listening.')).toHaveLength(1);
  expect(lines).toContain('SERENADE to befriend it, or PLAY to finish it.');
  await until(page, (b, scene) => scene !== 'battle');           // PLAY again: it fades
  expect(await page.evaluate(() => Arcade.Quest.save.get().battles.faded)).toBe(1);
  expect((await page.evaluate(() => window.__lines)).filter(l => /barely standing/.test(l))).toHaveLength(1);
  watch.check();
});

test('the snare SERENADEs with a gentle steady beat (its own challenge), the Ghost Conductor has no SERENADE', async ({page}) => {
  const watch = await prepare(page, {store: device('snare', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => { const Q = Arcade.Quest; Q.save.reset(); Q.save.write(); Q.micReady = async () => true; });
  await start(page, 'squawk');
  for (let i = 0; i < 80 && !(await page.locator('.q-chal-t').count()); i++) await step(page, () => 'SERENADE');
  await expect(page.locator('.q-chal-t')).toHaveText('SERENADE: a gentle, steady beat. 4 soft hits!');
  expect(await page.locator('.q-taps i').count()).toBe(4);
  // the final boss: PLAY · LISTEN · ITEM · HARMONIZE only
  await page.evaluate(() => Arcade.Quest.go('arena'));
  await start(page, 'conductor');
  await expect.poll(async () => { for (let i = 0; i < 40 && !(await page.locator('#qCmd:not([hidden]) .q-btn').count()); i++) await page.keyboard.press('Enter'); return page.locator('#qCmd .q-btn .q-bl').allTextContents(); })
    .toEqual(['PLAY', 'LISTEN', 'ITEM', 'HARMONIZE']);
  watch.check();
});

/* CRITICAL HITS and the PERFECT SERENADE (battle.js RULES.crit*, perfect*); THE SAFETY NET only after a SERENADE */
test('a SKILL CRIT: a PLAY at 96 % accuracy and 90 % speed is always critical (× 1.5, "CRITICAL!", its sound)', async ({page}) => {
  const watch = await open(page, {level: 5});
  await page.evaluate(() => { window.__play = {acc: .96, speed: .9, correct: 3, total: 3, success: true}; Math.random = () => 0.99;
    const Q = Arcade.Quest, f = Q.sfx; window.__sfx = []; Q.sfx = (n, ...x) => { window.__sfx.push(n); return f(n, ...x); }; });
  await start(page, 'wobble');
  await until(page, b => b && b.hp < b.ehp);
  const b = await state(page), power = b.power;
  expect(b.crit).toBe('skill');
  expect(b.ehp - b.hp).toBe(Math.round(Math.round(power * .96 * (.55 + .45 * .9)) * 1.5));
  await expect(page.locator('.q-float.crit')).toHaveText('CRITICAL!');
  expect(await page.evaluate(() => window.__sfx)).toContain('quest-crit');
  await until(page, b => b && b.aim);
  expect(await page.evaluate(() => window.__lines)).toContain('A perfect note! CRITICAL HIT!');
  watch.check();
});

test('a LUCKY CRIT: 1 in 12 at 70 %+ (a seeded random), never below 70 %; the Sharp Ear charm makes it 1 in 6; the band hits × 1.2', async ({page}) => {
  const watch = await open(page, {roster: ['wisp'], band: ['wisp']});
  const one = async (acc, rnd, charm) => {
    await page.evaluate(([acc, rnd, charm]) => {
      window.__play = {acc, speed: .5, correct: 2, total: 3, success: acc >= .8};
      Math.random = () => rnd;
      const s = Arcade.Quest.save.get(); s.charms.owned['sharp-ear'] = true; s.charms.equipped = [charm ? 'sharp-ear' : null, null]; Arcade.Quest.save.write();
    }, [acc, rnd, charm]);
    await start(page, 'wobble');
    await until(page, b => b && b.hp < b.ehp);
    const b = await state(page);
    return {crit: b.crit, dmg: b.ehp - b.hp, power: b.power};
  };
  // 1 / 12 = .0833: a roll of .08 crits, .09 doesn't
  let r = await one(.8, .08, false);
  expect(r.crit).toBe('lucky');
  const you = Math.round(Math.round(r.power * .8 * (.55 + .45 * .5)) * 1.5), wisp = Math.max(1, Math.round(r.power * .3 * .8 * 1.2));
  expect(r.dmg).toBe(you + wisp);
  expect((await one(.8, .09, false)).crit).toBe(null);
  expect((await one(.65, .01, false)).crit).toBe(null);                     // under 70 %: never lucky
  // the Sharp Ear: 1 / 6 = .1667
  expect((await one(.8, .15, true)).crit).toBe('lucky');
  expect((await one(.8, .17, true)).crit).toBe(null);
  // a statistical check of the plain chance with a seeded generator: about 1 in 12
  const rate = await page.evaluate(() => { let x = 42; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    let n = 0; for (let i = 0; i < 12000; i++) if (rnd() < 1 / 12) n++; return n / 12000; });
  expect(rate).toBeGreaterThan(.07); expect(rate).toBeLessThan(.097);
  expect(await page.evaluate(() => window.QUEST_CHARMS['sharp-ear'])).toMatchObject({name: 'Sharp Ear', effect: {crit: 1 / 6}, price: 300});
  watch.check();
});

test('a PLAY-only battle is never held at 1 HP by THE SAFETY NET (even with a full CALM from PLAY)', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => { window.__play = {acc: .9, speed: .7, correct: 3, total: 3, success: true}; Math.random = () => 0.99; });
  await start(page, 'wobble');
  let maxCalm = 0, held = false;
  await until(page, (b, scene) => { if (b) { maxCalm = Math.max(maxCalm, b.calm); if (b.net || b.hp === 1) held = true; } return scene !== 'battle'; });
  expect(maxCalm).toBeGreaterThanOrEqual(50);
  expect(held).toBe(false);
  expect(await page.evaluate(() => Arcade.Quest.save.get().battles.faded)).toBe(1);
  expect((await page.evaluate(() => window.__lines)).some(l => /barely standing/.test(l))).toBe(false);
  watch.check();
});

test('a PERFECT SERENADE (95 %+) gives CALM × 1.5 with "PERFECT SERENADE!"', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => { window.__play = {acc: .96, speed: 1, correct: 1, total: 1, success: true}; });
  await start(page, 'wobble');
  await until(page, b => b && b.calm > 0, () => 'SERENADE');
  const b = await state(page);
  expect(b.perfect).toBe(true);
  expect(b.calm).toBeCloseTo(38 * .96 * b.calmScale * 1.5, 5);
  await expect(page.locator('.q-float.perfect')).toHaveText('PERFECT SERENADE!');
  // not perfect: × 1
  await page.evaluate(() => { window.__play = {acc: .9, speed: 1, correct: 1, total: 1, success: true}; });
  const before = b.calm;
  await until(page, s => s && s.calm > before, () => 'SERENADE');
  const c = await state(page);
  expect(c.perfect).toBe(false);
  expect(c.calm - before).toBeCloseTo(38 * .9 * c.calmScale, 5);
  watch.check();
});
