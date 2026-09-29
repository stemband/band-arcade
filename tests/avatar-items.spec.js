/* AVATAR ITEMS + SAVE CODES: the Tumblers (hand items), the LEGENDARY Grandmaster's Aura (all 10 Band Ninja belt codes)
   and the Arcade Quest save code version 4. Old codes (versions 1–3) must read EXACTLY as they did before version 4:
   fixtures/quest-codes.json holds codes of each version and what the arcade decoded them to before version 4 existed. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const OLD = require('./fixtures/quest-codes.json');

const TUMBLERS = {
  'tumbler-pink': {shop: 150}, 'tumbler-blue': {shop: 150}, 'tumbler-lime': {shop: 150},
  'tumbler-sunset': {stars: 250}, 'tumbler-galaxy': {shop: 400}, 'tumbler-diamond': {bandninja: 'diamond'},
};

test('old Arcade Quest codes (v1, v2, v3) still read exactly the same', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('arcade-quest/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Backup);
  for (const [v, {code, fields}] of Object.entries(OLD)) {
    const d = await page.evaluate(c => Arcade.Backup.questDecode(c), code);
    expect(d.ok, v).toBe(true);
    expect(d.fields, v).toEqual(fields);
    // spaces, dashes and lower case are still ignored
    const loose = await page.evaluate(c => Arcade.Backup.questDecode(c.toLowerCase().replace(/-/g, ' ')), code);
    expect(loose.fields, v).toEqual(fields);
  }
  // the frozen lists are untouched: version 4's list starts with version 3's
  const lists = await page.evaluate(() => ({v3: Arcade.Backup.QUEST_V3.cosmetics, v4: Arcade.Backup.QUEST_V4.cosmetics}));
  expect(lists.v4.slice(0, lists.v3.length)).toEqual(lists.v3);
  expect(lists.v4.slice(lists.v3.length)).toEqual(['hand:tumbler-pink', 'hand:tumbler-blue', 'hand:tumbler-lime', 'hand:tumbler-galaxy']);
  watch.check();
});

test('a version-4 code round trip carries the Tumblers', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('arcade-quest/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Backup && Arcade.Avatar);
  const r = await page.evaluate(() => {
    const A = Arcade, B = A.Backup, s = A.store;
    ['hand:tumbler-galaxy', 'hand:tumbler-lime', 'pet:penguin'].forEach(k => s.ownItem(k));
    const av = A.Avatar.get(); av.hand = 'tumbler-galaxy'; A.Avatar.set(av);
    const code = B.questEncode({level: 9, xp: 200, tokens: 777, items: {}, roster: [], flags: {}, done: {}, world: null, converted: {}, charms: {owned: {}, equipped: [null, null]}});
    return {code, d: B.questDecode(code), tooLong: B.questDecode(code + '2')};
  });
  expect(r.code.replace(/-/g, '')).toHaveLength(60);
  expect(r.code.split('-')).toHaveLength(12);
  expect(r.d.ok).toBe(true);
  expect(r.d.fields.level).toBe(9);
  expect(r.d.fields.tokens).toBe(777);
  expect(r.d.fields.cosmetics.owned).toEqual(expect.arrayContaining(['hand:tumbler-galaxy', 'hand:tumbler-lime', 'pet:penguin']));
  expect(r.d.fields.cosmetics.owned).not.toContain('hand:tumbler-pink');
  expect(r.d.fields.cosmetics.worn).toContain('hand:tumbler-galaxy');
  expect(r.tooLong.ok).toBe(false);
  // one changed letter is caught by the check
  const bad = await page.evaluate(c => Arcade.Backup.questDecode(c.slice(0, 20) + (c[20] === 'A' ? 'B' : 'A') + c.slice(21)), r.code);
  expect(bad.ok).toBe(false);
  watch.check();
});

test('the Tumblers and the Grandmaster\'s Aura: rules, share code, Token Booth shelf', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && Arcade.avatarCode && Arcade.BandNinja);
  const r = await page.evaluate(() => {
    const A = Arcade, P = window.AVATAR_PARTS, AV = A.Avatar;
    const hand = id => P.HANDS.find(h => h.id === id);
    const items = AV.items();
    return {
      rules: Object.fromEntries(P.HANDS.filter(h => /^tumbler-/.test(h.id)).map(h => [h.id, Object.assign({}, h.unlock, {text: undefined})])),
      names: P.HANDS.filter(h => /^tumbler-/.test(h.id)).map(h => h.name),
      animated: ['tumbler-galaxy', 'tumbler-diamond'].map(id => !!hand(id).anim),
      shop: items.filter(it => it.shop && /tumbler/.test(it.id)).map(it => [it.id, it.shop]),
      booth: items.filter(it => it.shop).every(it => it.shop >= 50 && it.shop <= 500),
      gm: P.EFFECTS.find(e => e.id === 'grandmaster'),
      gmItem: items.find(it => it.key === 'effect:grandmaster'),
      locked: ['tumbler-pink', 'tumbler-diamond'].map(id => AV.isUnlocked('hand', id)).concat(AV.isUnlocked('effect', 'grandmaster')),
      req: AV.requirement('effect', 'grandmaster'),
    };
  });
  expect(Object.keys(r.rules)).toEqual(Object.keys(TUMBLERS));
  for (const [id, rule] of Object.entries(TUMBLERS)) expect(r.rules[id], id).toMatchObject(rule);
  r.names.forEach(n => expect(n).toMatch(/Tumbler$/));
  expect(r.animated).toEqual([true, true]);
  expect(r.shop).toEqual([['tumbler-pink', 150], ['tumbler-blue', 150], ['tumbler-lime', 150], ['tumbler-galaxy', 400]]);
  expect(r.booth).toBe(true);
  expect(r.gm).toMatchObject({name: "Grandmaster's Aura", legendary: true, official: true, unlock: {bandninja: 'all'}});
  expect(r.gmItem.legendary).toBe(true);
  expect(r.gmItem.shop).toBeFalsy();                              // never sold
  expect(r.locked).toEqual([false, false, false]);
  expect(r.req).toContain('all 10 Band Ninja belt codes');

  // every new id survives the avatar share code
  for (const [field, id] of [...Object.keys(TUMBLERS).map(id => ['hand', id]), ['effect', 'grandmaster']]) {
    const back = await page.evaluate(([f, id]) => {
      const av = Object.assign(Arcade.Avatar.get(), {[f]: id});
      return Arcade.avatarCode.decode(Arcade.avatarCode.encode(av))[f];
    }, [field, id]);
    expect(back, id).toBe(id);
  }

  // belt codes: the Diamond code opens the Diamond Tumbler; the aura only once ALL 10 are in
  const belts = await page.evaluate(() => {
    const BN = Arcade.BandNinja, AV = Arcade.Avatar, keys = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'red', 'brown', 'black', 'diamond'];
    const out = [];
    keys.forEach((k, i) => {
      BN.redeem(BN.beltUnlockCode(k));
      out.push({k, all: BN.hasAll(), aura: AV.isUnlocked('effect', 'grandmaster'), cup: AV.isUnlocked('hand', 'tumbler-diamond'), prog: AV.progress && AV.progress('effect', 'grandmaster')});
    });
    return out;
  });
  belts.slice(0, 9).forEach(b => { expect(b.all, b.k).toBe(false); expect(b.aura, b.k).toBe(false); expect(b.cup, b.k).toBe(false); });
  expect(belts[9]).toMatchObject({all: true, aura: true, cup: true});
  watch.check();
});

test('?unlockall shows the new items in the Locker and Create Your Player; the LEGENDARY card and frames', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?game=ghost-notes&demo&unlockall&nostart');
  await page.locator('#skinsBtn').click();
  await expect(page.locator('#locker')).toBeVisible();
  await page.locator('#locker [role=tab]', {hasText: /extras/i}).click();
  for (const n of ['Neon Pink Tumbler', 'Galaxy Tumbler', 'Diamond Tumbler']) await expect(page.locator(`#locker [aria-label*="${n}"]`).first()).toBeAttached();
  await page.locator('#locker [role=tab]', {hasText: /effects/i}).click();
  const legend = page.locator('#locker .sk-opt.sk-legend');
  await expect(legend).toHaveCount(1);
  await expect(legend.locator('.lk-legend-tag')).toBeVisible();
  await page.keyboard.press('Escape');

  // Create Your Player: the tumblers on HELD ITEM, the aura + Diamond Tumbler on the BAND NINJA tab (framed as legendary)
  await page.evaluate(() => Arcade.AvatarCreator.open({}));
  await page.locator('#avcTab-hand').click();
  await expect(page.locator('.avc-opt[aria-label*="Arctic Blue Tumbler"], .avc-opt:has-text("Arctic Blue Tumbler")').first()).toBeAttached();
  await page.locator('#avcTab-bandninja').click();
  await expect(page.locator('.avc-opt.avc-legend')).toHaveCount(1);
  await expect(page.locator('.avc-opt:has-text("Diamond Tumbler"), .avc-opt[aria-label*="Diamond Tumbler"]').first()).toBeAttached();

  // the UNLOCKED! card turns LEGENDARY for the aura
  const card = await page.evaluate(() => {
    const it = Arcade.Avatar.items().find(i => i.key === 'effect:grandmaster');
    const d = document.createElement('div'); d.innerHTML = Arcade.Skins.cardHTML([{item: it}], 'trumpet');
    return {cls: d.firstChild.className, title: d.querySelector('.sk-u-title').textContent, badge: !!d.querySelector('.sk-u-badge')};
  });
  expect(card.cls).toContain('sk-legendary');
  expect(card.title).toMatch(/legendary/i);
  expect(card.badge).toBe(true);
  watch.check();
});
