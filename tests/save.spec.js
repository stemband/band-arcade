/* SAVE DATA: an Arcade Backup Code round trip (make the code → clear this browser → restore it) brings back the stars,
   the avatar, unlocked items and the settings. Done through the real BACKUP / RESTORE panel. */
const {test, expect} = require('@playwright/test');
const {prepare, saved, starsIn} = require('./helpers');

test('Arcade Backup Code: export → clear → import', async ({page}) => {
  const watch = await prepare(page, {store: null});
  await page.goto('index.html?demo&nostart');
  const before = await page.evaluate(() => {
    const A = Arcade, s = A.store;
    s.setPlayer('clarinet');
    s.setLevel('note-storm', s.instId, 1, {stars: 3, best: 1234}, 3);
    s.setLevel('showtime-malfunction', 'clarinet', 2, {stars: 2, best: 500}, 2);
    const av = A.Avatar.get();
    av.name = {title: av.name.title, adj: av.name.adj, noun: av.name.noun};
    A.Avatar.set(av);
    s.ownItem('head:crown');
    s.setVolume('sfxVol', 0.25); s.setSfx(false);
    s.gameData('showtime-malfunction').spooky = 'spooky'; s.saveGameData('showtime-malfunction');
    return {avatar: JSON.stringify(A.Avatar.get()), inst: s.instId};
  });
  const code = await page.evaluate(() => Arcade.Backup.fullEncode());
  expect(code).toMatch(/^BKP/);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect(starsIn(await saved(page), 'note-storm')).toBe(0);

  await page.evaluate(() => Arcade.Backup.open());
  await page.locator('.bk-in').fill(code);
  await page.locator('.bk-restore').click();
  await page.locator('.bk-yes').click();
  await page.waitForEvent('load');
  await page.waitForTimeout(500);

  const after = await saved(page);
  expect(starsIn(after, 'note-storm')).toBe(3);
  expect(starsIn(after, 'showtime-malfunction', 2)).toBe(2);
  expect(after.player).toBe('clarinet');
  expect(after.sfx).toBe(false);
  expect(after.sfxVol).toBe(0.25);
  expect(after.items && after.items.owned).toEqual({'head:crown': true});
  expect(await page.evaluate(() => Arcade.store.ownedItems['head:crown'])).toBe(true);
  expect(JSON.stringify(after.gameData && after.gameData['showtime-malfunction'])).toContain('spooky');
  expect(await page.evaluate(() => JSON.stringify(Arcade.Avatar.get()))).toBe(before.avatar);
  watch.check();
});
