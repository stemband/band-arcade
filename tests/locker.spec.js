/* THE LOCKER from anywhere (shared/locker.js + avatar-badge.js's Arcade.Locker): the avatar badge's menu opens it
   ("Locker · n of N") over the page and closes back where the student was; the NEW dot on the badge after an unlock,
   NEW on the tile, cleared by opening the Locker (and remembered); a results screen's UNLOCKED! card has OPEN LOCKER,
   which loads the Locker on a game page. Choose Your Instrument's LOCKER still works. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const ITEM = 'head:pumpkin';                         // an event item: owned = unlocked (and a "fresh" UNLOCKED! card item)
const store = (extra = {}) => device('trumpet', Object.assign({avatarOffered: true}, extra));
const dot = page => page.locator('#avBadge .avb-dot');

test.describe('the locker', () => {
  test('the badge menu opens the Locker over the lobby ("Locker · n of N"), and Done goes back', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('index.html?demo&nostart');
    await page.locator('#avBadge .avb-btn').click();
    const item = page.locator('#avBadge .avb-locker');
    await expect(item).toBeVisible();
    await expect(item).toContainText(/Locker\s*· \d+ of \d+/);
    await item.click();
    await expect(page.locator('#locker')).toBeVisible();
    expect(await page.evaluate(() => Arcade.LockerUI.state())).toMatchObject({open: true, member: 'trumpet', guest: false});
    expect(await page.evaluate(() => Arcade.Arcade.state().view)).toBe('lobby');
    // wear something free: the avatar changes everywhere
    await page.locator('#lkTab-hats').click();
    await page.locator('#locker .sk-opt[data-field="head"]:not(.locked)').nth(1).click();
    await page.locator('#lkDone').click();
    await expect(page.locator('#locker')).toBeHidden();
    await expect(page.locator('#avBadge .avb-btn')).toBeFocused();
    expect(await page.evaluate(() => Arcade.Arcade.state().view)).toBe('lobby');
    watch.check();
  });

  test('NEW: the dot appears after an unlock, NEW on the tile, opening the Locker clears it (and it stays cleared)', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('index.html?demo&nostart');
    await expect(dot(page)).toHaveCount(0);                                   // what was earned before counts as seen
    await page.evaluate(k => { Arcade.store.ownItem(k); Arcade.Locker.changed(); }, ITEM);
    await expect(dot(page)).toHaveCount(1);
    await page.locator('#avBadge .avb-btn').click();
    await expect(page.locator('#avBadge .avb-lk-new')).toHaveText('1 new');
    await page.locator('#avBadge .avb-locker').click();
    await expect(page.locator('#locker')).toBeVisible();
    expect((await page.evaluate(() => Arcade.LockerUI.state())).fresh).toEqual([ITEM]);
    await expect(dot(page)).toHaveCount(0);                                   // cleared as it opened
    await expect(page.locator('#lkTab-hats .lk-tdot')).toHaveCount(1);        // its tab says so
    await page.locator('#lkTab-hats').click();
    await expect(page.locator(`#locker .sk-opt[data-field="head"][data-item="pumpkin"] .lk-new`)).toHaveText('NEW');
    await page.locator('#lkDone').click();
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Locker && document.querySelector('#avBadge .avb-btn'));
    await expect(dot(page)).toHaveCount(0);
    expect(await page.evaluate(() => Arcade.Locker.fresh('trumpet'))).toEqual([]);
    watch.check();
  });

  test('a results screen with an UNLOCKED! card has OPEN LOCKER: it loads the Locker on a game page and closes back', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('ghost-notes/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.Skins && Arcade.Locker);
    expect(await page.evaluate(() => !!Arcade.LockerUI)).toBe(false);        // not loaded until needed
    await page.evaluate(k => {
      Arcade.store.ownItem(k);
      Arcade.UI.results.show({gameId: 'ghost-notes', stars: 3, title: 'Level cleared!', retry: () => {}, levels: () => {}});
    }, ITEM);
    const btn = page.locator('#results .sk-u-locker');
    await expect(btn).toBeVisible();
    await expect(page.locator('#results .sk-unlock')).toContainText(/Unlocked/i);
    await btn.click();
    await expect(page.locator('#locker')).toBeVisible();
    expect(await page.evaluate(() => Arcade.LockerUI.state())).toMatchObject({open: true, member: 'trumpet'});
    await page.keyboard.press('Escape');
    await expect(page.locator('#locker')).toBeHidden();
    await expect(btn).toBeFocused();
    await expect(page.locator('#results')).toBeVisible();                    // still on the results
    watch.check();
  });

  test("Choose Your Instrument's player card LOCKER still opens it for the highlighted instrument", async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('index.html?demo&nostart&game=ghost-notes');
    await page.locator('#skinsBtn').click();
    await expect(page.locator('#locker')).toBeVisible();
    expect((await page.evaluate(() => Arcade.LockerUI.state())).member).toBe('trumpet');
    await page.locator('#lkDone').click();
    await expect(page.locator('#skinsBtn')).toBeFocused();
    watch.check();
  });
});
