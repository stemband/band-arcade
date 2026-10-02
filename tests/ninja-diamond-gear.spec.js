/* NOTE NINJA'S RARE DIAMOND GEAR: the Diamond headband, the Diamond belt headband, the Diamond belt name plate, Bamboo
   Moon and the Diamond color skin need the Diamond belt on CHROMATIC notes in RANDOM order ('note-ninja:random-chromatic');
   First 5 or Scale Order no longer earn them, belts White–Black are unchanged. A device that had them under the old
   rule keeps them (storage.js migrate() 'ninja-diamond-chromatic' makes them OWNED), on load and from an old Backup
   Code. Note Ninja's Diamond belt card says the challenge exists. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const ITEMS = [['head', 'diamondband'], ['head', 'belt-diamond'], ['plate', 'belt-diamond'], ['bg', 'bamboomoon']];
const KEYS = ITEMS.map(([f, id]) => `${f}:${id}`).concat('skin:diamond');
const TEXT = 'Earn the Diamond belt in Note Ninja on Chromatic notes, Random order';
const BELTS = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'red', 'brown', 'black'];

/** every rare piece: is it unlocked, and what does it ask for */
const gear = page => page.evaluate(ITEMS => ({
  items: ITEMS.map(([f, id]) => ({key: `${f}:${id}`, open: Arcade.Avatar.isUnlocked(f, id), need: Arcade.Avatar.requirement(f, id)})),
  skin: {open: Arcade.Skins.isUnlocked('diamond', 'trumpet'), need: Arcade.Skins.requirement(Arcade.Skins.get('diamond'))},
}), ITEMS);
const allLocked = g => g.items.every(i => !i.open) && !g.skin.open;
const allOpen = g => g.items.every(i => i.open) && g.skin.open;
/** stars on a Note Ninja belt under one progress key, for the saved instrument */
const earn = (page, key, lv = 10) => page.evaluate(([key, lv]) => Arcade.store.setLevel(key, Arcade.store.instId, lv, {stars: 1, best: 100}), [key, lv]);

/** this device as it was BEFORE the change: First 5 Diamond, wearing the gear, the migration never run */
async function oldDevice(page) {
  await page.evaluate(() => {
    const s = Arcade.store, d = JSON.parse(localStorage.getItem('bandarcade.v1'));
    d.games['note-ninja'] = {[s.instId]: {10: {stars: 1, best: 900}}};
    d.avatar = Arcade.Avatar.normalize(Object.assign(Arcade.Avatar.get(), {head: 'diamondband', bg: 'bamboomoon', plate: 'belt-diamond'}));
    d.skins = {equipped: {trumpet: {color: 'diamond', acc: null}}};
    delete d.items; delete d.migrated['ninja-diamond-chromatic'];
    localStorage.setItem('bandarcade.v1', JSON.stringify(d));
  });
}
/** owned, worn and unlocked after the migration */
async function expectKept(page) {
  expect(await page.evaluate(() => Arcade.store.ownedItems)).toEqual(expect.objectContaining(Object.fromEntries(KEYS.map(k => [k, true]))));
  expect(allOpen(await gear(page))).toBe(true);
  expect(await page.evaluate(() => { const a = Arcade.Avatar.get(); return [a.head, a.bg, a.plate]; })).toEqual(['diamondband', 'bamboomoon', 'belt-diamond']);
  expect(await page.evaluate(() => Arcade.Skins.equipped('trumpet').color)).toBe('diamond');
}

test.describe('Note Ninja rare Diamond gear', () => {
  test('First 5 Diamond on a fresh device: the five stay locked with the new text; belts White–Black unchanged', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    for (let lv = 1; lv <= 10; lv++) await earn(page, 'note-ninja', lv);
    const g = await gear(page);
    expect(allLocked(g)).toBe(true);
    g.items.forEach(i => expect(i.need, i.key).toBe(TEXT));
    expect(g.skin.need).toBe(TEXT);
    // belts 1–9 (headbands and name plates) still open with any note set
    expect(await page.evaluate(B => B.every(b => Arcade.Avatar.isUnlocked('head', 'belt-' + b) && Arcade.Avatar.isUnlocked('plate', 'belt-' + b)), BELTS)).toBe(true);
    expect(await page.evaluate(() => Arcade.Avatar.requirement('head', 'belt-black'))).toBe('Earn the Black belt in Note Ninja');
    // nothing is owned, and no UNLOCKED! card offers them
    expect(await page.evaluate(() => Arcade.store.ownedItems)).toEqual({});
    expect(await page.evaluate(() => Arcade.Avatar.freshItems().map(i => i.key))).not.toContain('head:diamondband');
    // the Locker: dark silhouettes with the new words
    await page.evaluate(() => Arcade.Locker.open({member: 'trumpet', tab: 'hats'}));
    const tile = page.locator('#locker .sk-opt[data-field="head"][data-item="diamondband"]');
    await expect(tile).toHaveClass(/locked/);
    await expect(tile.locator('small')).toContainText(TEXT);
    await page.locator('#lkTab-effects').click();
    const skin = page.locator('#locker .sk-opt[data-skin="diamond"]');
    await expect(skin).toHaveClass(/locked/);
    await expect(skin.locator('small')).toContainText(TEXT);
    await page.locator('#lkTab-backgrounds').click();
    await expect(page.locator('#locker .sk-opt[data-field="bg"][data-item="bamboomoon"] small')).toContainText(TEXT);
    watch.check();
  });

  test('Scale Order Chromatic Diamond: still locked', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await earn(page, 'note-ninja:scale-chrom');
    await earn(page, 'note-ninja:order-first5');
    await earn(page, 'note-ninja:random-Bb');
    expect(allLocked(await gear(page))).toBe(true);
    watch.check();
  });

  test('Chromatic + Random Diamond: all five unlock, with UNLOCKED! cards', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await earn(page, 'note-ninja:random-chromatic');
    expect(allOpen(await gear(page))).toBe(true);
    const found = await page.evaluate(() => Arcade.Skins.catchUp('trumpet').map(f => f.item ? f.item.key : 'skin:' + f.id));
    expect(found.sort()).toEqual(KEYS.slice().sort());
    const card = page.locator('.sk-catchup .sk-unlock');
    await expect(card).toBeVisible();
    for (const name of ['Diamond headband', 'Diamond belt headband', 'Diamond belt', 'Bamboo Moon', 'Diamond']) await expect(card.locator('.sk-u-name', {hasText: name}).first()).toBeVisible();
    await expect(card).toContainText(TEXT);
    // earned, not owned: nothing was written into ownedItems
    expect(await page.evaluate(() => Arcade.store.ownedItems)).toEqual({});
    watch.check();
  });

  test('a device that had First 5 Diamond before the change keeps everything (owned, worn, after reloads)', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await oldDevice(page);
    await page.reload();
    await expectKept(page);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1')).migrated['ninja-diamond-chromatic'])).toBe(true);
    await page.reload();
    await expectKept(page);
    watch.check();
  });

  test('a device without the old Diamond belt gets nothing from the migration', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await page.evaluate(() => {
      const s = Arcade.store, d = JSON.parse(localStorage.getItem('bandarcade.v1'));
      d.games['note-ninja'] = {[s.instId]: {9: {stars: 3, best: 900}}};              // the Black belt only
      delete d.migrated['ninja-diamond-chromatic'];
      localStorage.setItem('bandarcade.v1', JSON.stringify(d));
    });
    await page.reload();
    expect(await page.evaluate(() => Arcade.store.ownedItems)).toEqual({});
    expect(allLocked(await gear(page))).toBe(true);
    watch.check();
  });

  test('an old Backup Code (made before the change) keeps the gear when restored', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await oldDevice(page);
    // the code as an old arcade made it: First 5 Diamond, the gear worn, no 'ninja-diamond-chromatic', nothing owned
    const code = await page.evaluate(async () => {
      const s = Arcade.store, ex = s.exportAll, old = JSON.parse(localStorage.getItem('bandarcade.v1'));
      s.exportAll = () => JSON.parse(JSON.stringify(old));
      try { return await Arcade.Backup.fullEncode(); } finally { s.exportAll = ex; }
    });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(allLocked(await gear(page))).toBe(true);
    const ok = await page.evaluate(async c => { const r = await Arcade.Backup.fullDecode(c); return r.ok && Arcade.store.importAll(r.data); }, code);
    expect(ok).toBe(true);
    await page.reload();
    await expectKept(page);
    await page.reload();
    await expectKept(page);
    watch.check();
  });

  test('the avatar code round trip keeps owned gear (and a device without it falls back)', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart');
    await oldDevice(page);
    await page.reload();
    const r = await page.evaluate(() => {
      const code = Arcade.avatarCode.encode(Arcade.Avatar.get()), d = Arcade.avatarCode.forDevice(Arcade.avatarCode.decode(code));
      return {head: d.av.head, bg: d.av.bg, plate: d.av.plate, locked: d.locked, code};
    });
    expect(r).toMatchObject({head: 'diamondband', bg: 'bamboomoon', plate: 'belt-diamond', locked: []});
    // the same code on a device that never earned them: the defaults, and it says what was locked
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const other = await page.evaluate(c => { const d = Arcade.avatarCode.forDevice(Arcade.avatarCode.decode(c)); return {head: d.av.head, locked: d.locked}; }, r.code);
    expect(other.head).not.toBe('diamondband');
    expect(other.locked).toEqual(expect.arrayContaining(['Diamond headband', 'Bamboo Moon', 'Diamond belt']));
    watch.check();
  });

  test('Note Ninja\'s Diamond belt card shows the RARE GEAR line with the gear\'s pictures', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('note-ninja/index.html?demo&nostart');
    const card = page.locator('#levelGrid .lvl[data-l="10"]');
    await expect(card).toBeVisible();
    await expect(card.locator('.rare-t')).toHaveText('Rare gear: earn it on Chromatic + Random!');
    await expect(card.locator('.rare-pic')).toHaveCount(5);
    await expect(page.locator('#levelGrid .rare')).toHaveCount(1);
    // drawing the pictures never saves an avatar for a student who hasn't made one (Create Your Player still asks)
    expect(await page.evaluate(() => Arcade.store.avatar)).toBeNull();
    // the pictures stay inside the card
    const [c, r] = await Promise.all([card.boundingBox(), card.locator('.rare-icons').boundingBox()]);
    expect(r.x + r.width).toBeLessThanOrEqual(c.x + c.width + 0.5);
    expect(r.y + r.height).toBeLessThanOrEqual(c.y + c.height + 0.5);
    watch.check();
  });
});
