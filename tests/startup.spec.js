/* Opening the arcade: PRESS START, then straight to the lobby when an instrument is saved (the PLAYING AS toast), or
   CHOOSE YOUR INSTRUMENT (pick mode) when there's none, a `pending` choice, or the teacher setting asks every time. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const toast = page => page.locator('.ui-toast.playing-as');
const voiced = page => page.evaluate(() => Arcade.Sfx.history.some(p => p.name === 'choose-instrument'));
/** the teacher setting ASK_INSTRUMENT_EVERY_TIME switched on (shared/teacher-settings.js, as Mat would) */
async function askEveryTime(page) {
  await page.route(/shared\/teacher-settings\.js/, async route => {
    const r = await route.fetch();
    await route.fulfill({response: r, body: (await r.text()).replace('ASK_INSTRUMENT_EVERY_TIME: false', 'ASK_INSTRUMENT_EVERY_TIME: true')});
  });
}

test.describe('a saved instrument goes straight to the lobby', () => {
  test('PRESS START → the lobby, the PLAYING AS toast, no pick mode, no voice line', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
    await page.goto('index.html?demo');
    await expect(page.locator('#pressStart')).toBeVisible();
    await page.locator('#pressStart').click();
    await expect(page.locator('#pressStart')).toBeHidden();
    await expect(page.locator('#lobby')).toBeVisible();
    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toContainText('Playing as Trumpet');
    await expect(toast(page).locator('.ui-toast-icon .pt-box')).toHaveCount(1);       // the instrument's portrait
    await expect(page.locator('body.in-select')).toHaveCount(0);
    // never over the zone signs' first row
    const box = await toast(page).boundingBox();
    const firstRow = await page.locator('#zones .zsign').first().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(firstRow.y);
    await expect(toast(page)).toHaveCount(0, {timeout: 6000});                        // 4 s, then gone
    await expect(page.locator('body.in-select')).toHaveCount(0);
    expect(await voiced(page)).toBe(false);
    watch.check();
  });

  test('"Change" opens pick mode', async ({page}) => {
    const watch = await prepare(page, {store: device('clarinet', {avatarOffered: true}), visit: false});
    await page.goto('index.html?demo');
    await page.locator('#pressStart').click();
    await toast(page).getByRole('button', {name: 'Change instrument'}).click();
    await expect(page.locator('body.in-select')).toHaveCount(1);
    await expect(page.locator('#selectView')).toBeVisible();
    expect(new URL(page.url()).searchParams.has('pick')).toBe(true);
    await expect(toast(page)).toHaveCount(0);
    watch.check();
  });

  test('a second lobby visit in the same session: no PRESS START, no toast', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
    await page.goto('index.html?demo');
    await page.locator('#pressStart').click();
    await expect(toast(page)).toBeVisible();
    await page.goto('index.html?demo');
    await expect(page.locator('#lobby')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator('#pressStart')).toBeHidden();
    await expect(toast(page)).toHaveCount(0);
    expect(await page.evaluate(() => Arcade.Arcade.state().playingAs)).toBe(false);
    watch.check();
  });

  test('?nostart: no PRESS START and no toast', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
    await page.goto('index.html?demo&nostart');
    await expect(page.locator('#lobby')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(toast(page)).toHaveCount(0);
    await expect(page.locator('body.in-select')).toHaveCount(0);
    watch.check();
  });
});

test.describe('pick mode after PRESS START where it is still needed', () => {
  test('no instrument saved → pick mode, with the voice line', async ({page}) => {
    // (no "Create your player?" offer: it would hold the voice line)
    const watch = await prepare(page, {store: {members: {}, games: {}, modes: {}, avatarOffered: true}, visit: false});
    await page.goto('index.html?demo');
    await page.locator('#pressStart').click();
    await expect(page.locator('body.in-select')).toHaveCount(1);
    await expect.poll(() => voiced(page), {timeout: 5000}).toBe(true);
    await expect(toast(page)).toHaveCount(0);
    watch.check();
  });

  test('a `pending` choice (the members migration) → pick mode', async ({page}) => {
    const watch = await prepare(page, {store: {inst: 'bb', members: {}, games: {}, modes: {}}, visit: false});
    await page.goto('index.html?demo');
    expect(await page.evaluate(() => Arcade.store.pending)).toEqual({group: 'bb'});
    await page.locator('#pressStart').click();
    await expect(page.locator('body.in-select')).toHaveCount(1);
    await expect(toast(page)).toHaveCount(0);
    watch.check();
  });

  test('the teacher setting ON → pick mode every session, even with an instrument saved', async ({browser}) => {
    for (let session = 0; session < 2; session++) {                      // each new page = a new browser session
      const page = await browser.newPage();
      await askEveryTime(page);
      const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
      await page.goto('index.html?demo');
      expect(await page.evaluate(() => Arcade.TEACHER.ASK_INSTRUMENT_EVERY_TIME)).toBe(true);
      await page.locator('#pressStart').click();
      await expect(page.locator('body.in-select')).toHaveCount(1);
      await expect(page.locator('#continueBtn')).toBeVisible();            // CONTINUE AS is one tap
      await expect(toast(page)).toHaveCount(0);
      watch.check();
      await page.close();
    }
  });
});
