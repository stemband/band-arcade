/* THE LOBBY'S ON-DEMAND SCRIPTS (Arcade.need / Arcade.lazy, shared/version.js; arcade.js "THE ON-DEMAND SCRIPTS"):
   not loaded at startup; the first tap loads and opens the feature, with the UI kit's spinner on the tapped button
   while it loads; a script that can't load = the "Couldn't open that" toast, and the next tap tries again. */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

const ON_DEMAND = ['shared/prizes.js', 'shared/locker.js', 'shared/avatar-creator.js', 'shared/backup.js', 'leaderboard-screen.js', 'arcade3d.js', 'shared/vendor/three.min.js'];
const loaded = page => page.evaluate(() => [...document.scripts].map(s => s.getAttribute('src') || '').filter(Boolean).map(s => s.replace(/^(\.\/)?/, '').split('?')[0]));

test('nothing rarely used loads with the lobby; each feature loads on its first open', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('index.html?demo&nostart');
  await expect(page.locator('#zones .zsign').first()).toBeVisible();
  const at = (await loaded(page)).map(s => s.replace(/^.*?(shared\/|leaderboard-screen|arcade3d)/, '$1'));
  for (const f of ON_DEMAND) expect(at, f).not.toContain(f);
  expect(await page.evaluate(() => [Arcade.Prizes.lazy, Arcade.Backup.lazy, Arcade.LeaderboardScreen.lazy, !Arcade.AvatarCreator, !Arcade.LockerUI])).toEqual([true, true, true, true, true]);

  await page.locator('#prizeSign').click();                                  // THE PRIZE COUNTER (+ the Locker's pictures)
  await expect(page.locator('#prizes')).toBeVisible();
  expect(await page.evaluate(() => [!Arcade.Prizes.lazy, !!Arcade.LockerUI])).toEqual([true, true]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#prizes')).toBeHidden();
  await page.locator('#prizeSign').click();                                  // the second time: the same script, once
  await expect(page.locator('#prizes')).toBeVisible();
  await page.keyboard.press('Escape');
  const tags = (await loaded(page)).filter(s => /prizes\.js$/.test(s));
  expect(tags).toHaveLength(1);

  await page.locator('#soundCtl .snd-btn').first().click();                  // Settings → BACKUP / RESTORE
  await page.locator('#uiSettings .bk-btn').click();
  await expect(page.locator('.bk-make')).toBeVisible();
  expect(await page.evaluate(() => !Arcade.Backup.lazy)).toBe(true);
  watch.check();
});

test('while a script loads the tapped button shows the spinner; if it can’t load, a toast, and the next tap tries again', async ({page}) => {
  const watch = await prepare(page);
  let mode = 'slow';
  await page.route('**/shared/backup.js*', async route => {
    if (mode === 'fail') return route.abort();
    await new Promise(r => setTimeout(r, 1200));
    return route.continue();
  });
  await page.goto('index.html?demo&nostart');
  await page.locator('#soundCtl .snd-btn').first().click();
  const btn = page.locator('#uiSettings .bk-btn');

  mode = 'fail';
  await btn.click();
  await expect(page.locator('.ui-toast')).toHaveText("Couldn't open that. Check your connection and try again.");
  await expect(btn.locator('.ui-spin')).toHaveCount(0);
  await expect(page.locator('.bk-make')).toHaveCount(0);

  mode = 'slow';
  await btn.click();
  await expect(btn.locator('.ui-spin')).toBeVisible();                         // the UI kit's spinner, on the tapped button
  await expect(btn).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.bk-make')).toBeVisible({timeout: 10_000});
  await expect(btn.locator('.ui-spin')).toHaveCount(0);
  await expect(btn).not.toHaveAttribute('aria-busy', 'true');
  // the aborted request is the only error: the browser's own "failed to load" line
  expect(watch.errors.filter(e => !/Failed to load resource|ERR_FAILED/.test(e))).toEqual([]);
});

test('the 2D floor (?flat) never loads three.js or the 3D floor', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('index.html?demo&nostart&flat');
  await page.locator('#zones .zsign').first().click();
  await expect(page.locator('#zoneView')).toBeVisible();
  await expect(page.locator('#aisle .slot').first()).toBeVisible();
  const at = await loaded(page);
  expect(at.filter(s => /arcade3d|three\.min/.test(s))).toEqual([]);
  watch.check();
});
