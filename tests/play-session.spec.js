/* THE PLAY SESSION (Arcade.session, shared/version.js): things that happen once per play session, from opening the
   arcade until the tab is closed or reloaded. The flags are handed from page to page in the same tab (every game is its
   own page), and a reload starts over.
   - The "Turn on the microphone" reminder (shared/mic-gate.js) shows before the first listening game only; later games
     start the microphone straight from the tap, and the browser's permission request and the error screen (mic
     blocked) still happen whenever they're needed.
   - Music Highway's first song of a session always starts with the timing check, even on a calibrated device. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

/* a microphone the browser "has": getUserMedia gives a silent stream (counted), or refuses when window.__denyMic */
async function fakeMic(page) {
  await page.addInitScript(() => {
    window.__micAsks = 0;
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia = async () => {
      window.__micAsks++;
      if (window.__denyMic) throw new DOMException('Permission denied', 'NotAllowedError');
      const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC();
      return ctx.createMediaStreamDestination().stream;
    };
  });
}
const reminder = page => page.evaluate(() => !!(Arcade.requireMic.showing && Arcade.requireMic.showing()));
async function startLevel(page) {
  await page.locator('.ls-card:not(.ls-endless)').first().click();
  await page.locator('.ls-start').click();
}

test.describe('play session', () => {
  test('the microphone reminder shows once per play session; permission and errors still happen; a reload shows it again', async ({page}) => {
    const watch = await prepare(page, {mic: true});
    await fakeMic(page);
    // the first listening game: the reminder, then the microphone
    await page.goto('ghost-notes/index.html?nostart');
    await startLevel(page);
    await expect(page.locator('#micGateTitle')).toBeVisible();
    await page.locator('[data-act=go]').click();
    await expect(page.locator('#play')).toBeVisible();
    expect(await page.evaluate(() => [Arcade.Pitch.active, window.__micAsks])).toEqual([true, 1]);
    // the next game in the same tab: no reminder, the microphone starts straight from the tap (permission asked again)
    await page.goto('note-storm/index.html?nostart');
    await startLevel(page);
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.active)).toBe(true);
    expect(await reminder(page)).toBe(false);
    expect(await page.evaluate(() => window.__micAsks)).toBe(1);
    // the microphone refused in a later game: no reminder, but the permission request happens and the error shows
    await page.goto('ghost-notes/index.html?nostart');
    await page.evaluate(() => { window.__denyMic = true; });
    await startLevel(page);
    await expect(page.locator('#micGateTitle')).toBeVisible();
    await expect(page.locator('.overlay .err')).toContainText('blocked');
    expect(await page.evaluate(() => [window.__micAsks, Arcade.Pitch.active])).toEqual([1, false]);
    // a reload = a new play session: the reminder again
    await page.reload();
    await startLevel(page);
    await expect(page.locator('#micGateTitle')).toBeVisible();
    await expect(page.locator('.overlay .err')).toBeHidden();
    expect(await page.evaluate(() => window.__micAsks)).toBe(0);            // nothing asked before the tap on the reminder
    watch.check();
  });

  test('Music Highway: the first song of a play session starts with the timing check, even when calibrated; a reload asks again', async ({page, browserName}) => {
    const store = device('trumpet', Object.assign({gameData: {'music-highway': {calib: {speaker: {ms: 30}, headphones: {ms: 30}}}}}, browserName === 'webkit' ? {sfx: false} : {}));
    const watch = await prepare(page, {store});
    await page.goto('music-highway/index.html?demo&nostart');
    const play = async () => {
      await startLevel(page);
      if (await reminder(page)) await page.locator('[data-act=go]').click();   // (the demo stands in for the microphone)
    };
    const backToMenu = async () => {
      await expect.poll(() => page.evaluate(() => Arcade.Highway.state().phase)).not.toBe('menu');
      await page.locator('#uiPauseBtn').click();
      await page.locator('#uiPause [data-act=levels]').click();
      const yes = page.locator('#uiConfirm [data-act=yes]');
      if (await yes.isVisible().catch(() => false)) await yes.click();
      await expect.poll(() => page.evaluate(() => Arcade.Highway.state().phase)).toBe('menu');
    };
    // first song: the timing check, although this device calibrated before (skipping it still counts)
    await play();
    await expect(page.locator('#calPanel')).toBeVisible();
    await page.locator('#calSkip').click();
    await backToMenu();
    // second song: straight in
    await play();
    await page.waitForTimeout(500);
    await expect(page.locator('#calPanel')).toBeHidden();
    await backToMenu();
    // RECALIBRATE works any time
    await page.locator('#calBtn').click();
    await expect(page.locator('#calPanel')).toBeVisible();
    await page.locator('#calSkip').click();
    await expect(page.locator('#calPanel')).toBeHidden();
    // a reload = a new play session: the first song asks again
    await page.reload();
    await play();
    await expect(page.locator('#calPanel')).toBeVisible();
    watch.check();
  });
});
