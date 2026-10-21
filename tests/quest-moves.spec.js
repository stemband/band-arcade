/* ARCADE QUEST: THE MOVES (designed by a Raven Band student; data/items.js QUEST_MOVES, battle.js, challenges.js
   Q.challenge.move). BOP ATTACK at LV 3, STRONGER BLOW at LV 5, BIG BLAST at LV 8, ULTRA CANNON at LV 10, in PLAY's
   menu (only the ones your level reached; none = PLAY goes straight to the challenge, as before). Each ONCE PER BATTLE
   (then dimmed "Used this battle"; back again next battle). Damage = a PLAY's at the same accuracy and speed × its
   mult; your band plays along after it; its own line. The challenges for real: BOP = 3 separate attacks on your first
   note, STRONGER BLOW = hold it (the Bells: taps), BIG BLAST = the first five up, ULTRA CANNON = up and back down
   (9 notes), the Snare: strokes. A level-up that reaches a move says so. Every new line ≤ 80 characters. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
function save({level = 1, band = [], flags = {}} = {}) {
  return {v: 7, level, xp: 0, hp: 20 + (level - 1) * 4, maxHp: 20 + (level - 1) * 4, tokens: 0, items: {'valve-oil': 1}, roster: band.slice(), battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'foyer', x: 5, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band, route: {}, ep: 1, done: {},
    gear: {tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}},
    flags: Object.assign({'seen-intro': true, pathsTip: true, rhythmTip: true}, flags)};
}
async function boot(page, s = save(), {member = 'trumpet', standIn = true} = {}) {
  const watch = await prepare(page, {store: device(member, {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(standIn => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__floats = []; window.__moves = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: .6, speed: 1, correct: 2, total: 4, success: false};
    if (standIn) {
      Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play));
      Q.challenge.move = async m => { window.__moves.push(m.id); return Object.assign({}, window.__play); };
      Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
    }
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('q-float') && window.__floats.push([n.className, n.textContent]))))
      .observe(document.body, {childList: true, subtree: true});
  }, standIn);
  return watch;
}
async function until(page, done, arg, max = 250) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(done, arg)) return;
    if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('never: ' + done.toString());
}
const cmdReady = () => !!document.querySelector('#qCmd:not([hidden]) .q-btn');
const pick = (page, label) => page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.querySelector('.q-bl').textContent === l && !x.disabled); if (!b) throw new Error('no ' + l); b.click(); }, label);
const labels = page => page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn')].map(b => ({label: b.querySelector('.q-bl').textContent, sub: (b.querySelector('small') || {}).textContent || '', off: b.disabled})));
const setLevel = (page, n) => page.evaluate(n => { const s = Arcade.Quest.save.get(); s.level = n; Arcade.Quest.save.write(); }, n);
async function fight(page) {
  await page.evaluate(() => { window.__floats.length = 0; window.__lines.length = 0; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
  await until(page, cmdReady);
  await page.evaluate(() => { Arcade.Quest.battleDemo.hp(9999); Math.random = () => .99; });
}
/** PLAY → the sub-menu (or straight into the challenge when there is none) */
const openPlay = async page => { await pick(page, 'PLAY'); await page.waitForTimeout(150); };
const backToCmd = page => until(page, () => !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') && !document.querySelector('#qCmd .q-btn.c-back'));

test.describe('THE MOVES', () => {
  test('they unlock at LV 3 / 5 / 8 / 10, in order; below LV 3 PLAY has no sub-menu', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const data = await page.evaluate(() => window.QUEST_MOVES.map(m => [m.id, m.name, m.level]));
    expect(data).toEqual([['bop', 'BOP ATTACK', 3], ['blow', 'STRONGER BLOW', 5], ['big', 'BIG BLAST', 8], ['ultra', 'ULTRA CANNON', 10]]);
    for (const [lv, want] of [[1, []], [2, []], [3, ['bop']], [4, ['bop']], [5, ['bop', 'blow']], [8, ['bop', 'blow', 'big']], [10, ['bop', 'blow', 'big', 'ultra']], [14, ['bop', 'blow', 'big', 'ultra']]]) {
      await setLevel(page, lv);
      expect(await page.evaluate(() => Arcade.Quest.moves().map(m => m.id)), `LV ${lv}`).toEqual(want);
    }
    // LV 2: PLAY goes straight to the challenge (no sub-menu, exactly as before)
    await setLevel(page, 2);
    await fight(page);
    await openPlay(page);
    await backToCmd(page);
    expect(await page.evaluate(() => window.__floats.some(f => /\bdmg\b/.test(f[0])))).toBe(true);
    // LV 10: PLAY, then the four moves, then BACK
    await page.evaluate(() => Arcade.Quest.go('arena'));
    await setLevel(page, 10);
    await fight(page);
    await openPlay(page);
    expect((await labels(page)).map(l => l.label)).toEqual(['PLAY', 'BOP ATTACK', 'STRONGER BLOW', 'BIG BLAST', 'ULTRA CANNON', 'Back']);
    watch.check();
  });

  test('damage = a PLAY at the same accuracy × the move\'s mult; your band plays along; its own line', async ({page}) => {
    const watch = await boot(page, save({level: 10, band: ['spotlight']}));
    const plain = [];
    await fight(page); await openPlay(page); await pick(page, 'PLAY'); await backToCmd(page);
    const you = () => page.evaluate(() => window.__floats.filter(f => /\bdmg\b/.test(f[0]) && !/\bband\b/.test(f[0])).map(f => -+f[1]));
    const band = () => page.evaluate(() => window.__floats.filter(f => /\bband\b/.test(f[0])).map(f => -+f[1]));
    await page.waitForTimeout(900);
    plain.push(...(await you())); const bandPlain = await band();
    expect(plain.length).toBe(1);
    const power = await page.evaluate(() => Arcade.Quest.save.powerAt(10));
    expect(plain[0]).toBe(Math.round(power * .6));
    for (const m of await page.evaluate(() => window.QUEST_MOVES)) {
      await page.evaluate(() => Arcade.Quest.go('arena'));
      await fight(page); await openPlay(page); await pick(page, m.name); await backToCmd(page);
      await page.waitForTimeout(900);
      expect(await you(), m.id).toEqual([Math.round(Math.round(power * .6 * m.mult))]);
      expect(await band(), `${m.id}: the band`).toEqual(bandPlain);
      const l = await page.evaluate(() => window.__lines.slice());
      expect(l.some(x => x.startsWith(m.name + '!') && x.includes('takes')), m.id).toBe(true);
    }
    expect(await page.evaluate(() => window.__moves)).toEqual(['bop', 'blow', 'big', 'ultra']);
    watch.check();
  });

  test('once per battle: dimmed "Used this battle", the others still there; a new battle has them all again', async ({page}) => {
    const watch = await boot(page, save({level: 10}));
    await fight(page); await openPlay(page); await pick(page, 'BIG BLAST'); await backToCmd(page);
    await openPlay(page);
    const l = await labels(page);
    expect(l.find(x => x.label === 'BIG BLAST')).toEqual({label: 'BIG BLAST', sub: 'Used this battle', off: true});
    expect(l.filter(x => x.off).length).toBe(1);
    expect(await page.evaluate(() => Arcade.Quest.battleState().moved)).toEqual(['big']);
    await pick(page, 'ULTRA CANNON'); await backToCmd(page);
    await openPlay(page);
    expect((await labels(page)).filter(x => x.off).map(x => x.label)).toEqual(['BIG BLAST', 'ULTRA CANNON']);
    await page.evaluate(() => Arcade.Quest.go('arena'));
    await fight(page); await openPlay(page);
    expect((await labels(page)).filter(x => x.off)).toEqual([]);
    watch.check();
  });

  test('a level-up that reaches a move announces it (and only then)', async ({page}) => {
    const watch = await boot(page, save({level: 2}));
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.xp = Arcade.Quest.save.xpToNext(2) - 1; Arcade.Quest.save.write(); });
    await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true}; window.__lines.length = 0; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
    await until(page, cmdReady);
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(1));
    await openPlay(page);
    await until(page, () => Arcade.Quest.sceneName === 'arena');
    const l = await page.evaluate(() => window.__lines.slice());
    expect(l.some(x => x.startsWith('LEVEL UP! You\'re level 3'))).toBe(true);
    expect(l).toContain('New move: BOP ATTACK! Find it in PLAY. Once per battle.');
    expect(l.filter(x => x.startsWith('New move')).length).toBe(1);
    watch.check();
  });

  test('every move\'s words fit the text box (≤ 80 characters)', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const words = await page.evaluate(() => {
      const Q = Arcade.Quest, out = [];
      for (const m of window.QUEST_MOVES) for (const k of ['moveIntroTap', 'moveIntroTone', 'moveIntroRun', 'moveIntroUpdown', 'moveIntroDrum', 'moveHit', 'moveNew'])
        out.push(Q.text(k, {move: m.name, n: 9, name: 'The Extremely Long-Winded Squawk'}));
      return out;
    });
    for (const w of words) expect(w.length, w).toBeLessThanOrEqual(80);
    watch.check();
  });
});

test.describe('THE MOVES: the real challenges', () => {
  for (const [member, want] of [['trumpet', {bop: 'taps:3', blow: 'hold', big: 'notes:5', ultra: 'notes:9'}], ['bells', {blow: 'taps:4'}], ['snare', {bop: 'taps:3', blow: 'taps:4', big: 'taps:5', ultra: 'taps:9'}]]) {
    test(`${member}: ${Object.entries(want).map(([k, v]) => k + ' = ' + v).join(', ')}`, async ({page}) => {
      const watch = await boot(page, save({level: 10}), {member, standIn: false});
      for (const [id, what] of Object.entries(want)) {
        const got = await page.evaluate(id => {
          const m = window.QUEST_MOVES.find(x => x.id === id);
          Arcade.Quest.challenge.move(m);
          const p = document.querySelector('.q-chal');
          const r = !p ? 'none' : p.querySelector('#qHold') ? 'hold' : p.querySelector('#qTaps') ? 'taps:' + p.querySelectorAll('#qTaps i').length
            : 'notes:' + p.querySelectorAll('[id^="qn"]').length;
          return {r, title: p && p.querySelector('.q-chal-t').textContent};
        }, id);
        expect(got.r, `${member} ${id}`).toBe(what);
        expect(got.title.length).toBeLessThanOrEqual(80);
        await page.evaluate(() => { document.querySelectorAll('.q-chal').forEach(p => p.remove()); Arcade.Quest.listen(false); });
      }
      watch.check();
    });
  }
});
