/* THE PLAY SESSION (Arcade.session, shared/version.js): things that happen once per play session, from opening the
   arcade until the tab is closed or reloaded. The flags are handed from page to page in the same tab (every game is its
   own page), and a reload starts over.
   - The "Turn on the microphone" reminder (shared/mic-gate.js) shows before the first listening game only; later games
     start the microphone straight from the tap, and the browser's permission request and the error screen (mic
     blocked) still happen whenever they're needed.
   - Music Highway's first song of a session always starts with the timing check, even on a calibrated device. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

/* a microphone the browser "has": getUserMedia gives a silent stream (counted), or refuses when window.__denyMic.
   The stream is an empty MediaStream marked __fake, and the page's own AudioContext turns it into a silent node:
   a stream made by ANOTHER AudioContext outside a tap is refused by WebKit, while pitch.js's real start-up (the
   permission request, resume, the analyser) runs unchanged. The machine's audio device is faked too (resume's wait
   capped): headless WebKit on CI has no running audio clock. Where the browser has no media devices at all (Playwright's
   WebKit on Linux), navigator.mediaDevices itself is supplied. */
async function fakeMic(page) {
  await page.addInitScript(() => {
    window.__micAsks = 0;
    // Playwright's WebKit on Linux has no media-stream support at all (no navigator.mediaDevices, no MediaStream):
    // give it the device the test needs
    if (!navigator.mediaDevices) { try { Object.defineProperty(navigator, 'mediaDevices', {value: {}, configurable: true}); } catch (e) { return; } }
    [window.AudioContext, window.webkitAudioContext].forEach(AC => {
      if (!AC || AC.prototype.__fakeMic) return;
      const real = AC.prototype.createMediaStreamSource;
      AC.prototype.createMediaStreamSource = function (s) { return s && s.__fake ? this.createGain() : real.call(this, s); };
      // …and an audio device: the CI machine's WebKit has none, so resume() never settles there (see rhythm-dojo.spec.js);
      // the real resume() is still called, only the wait is capped
      const resume = AC.prototype.resume;
      if (resume) AC.prototype.resume = function () { return Promise.race([resume.call(this), new Promise(r => setTimeout(r, 300))]); };
      AC.prototype.__fakeMic = true;
    });
    navigator.mediaDevices.getUserMedia = async () => {
      window.__micAsks++;
      if (window.__denyMic) throw new DOMException('Permission denied', 'NotAllowedError');
      const s = window.MediaStream ? new MediaStream() : {getTracks: () => [], getAudioTracks: () => []};
      s.__fake = true;
      return s;
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
    // remember why the microphone didn't start, if it doesn't (the failure message says what the browser was missing)
    await page.evaluate(() => {
      const start = Arcade.Pitch.start;
      Arcade.Pitch.start = async function () {
        try { return await start.apply(this, arguments); } catch (e) { window.__startErr = e && (e.name || '') + ': ' + (e.message || ''); throw e; }
      };
    });
    await startLevel(page);
    await expect(page.locator('#micGateTitle')).toBeVisible();
    await page.locator('[data-act=go]').click();
    await expect.poll(() => page.evaluate(() => !document.getElementById('play').hidden || !!window.__startErr), {timeout: 10_000}).toBe(true);
    const why = await page.evaluate(() => {
      const AC = window.AudioContext || window.webkitAudioContext, err = document.querySelector('.overlay .err');
      return {startErr: window.__startErr || null, err: err && !err.hidden ? err.textContent.trim().slice(0, 120) : null, secure: window.isSecureContext,
        mediaDevices: !!navigator.mediaDevices, gum: typeof (navigator.mediaDevices && navigator.mediaDevices.getUserMedia), audioContext: typeof AC,
        asks: window.__micAsks, active: Arcade.Pitch.active};
    });
    await expect(page.locator('#play'), `the microphone didn't start: ${JSON.stringify(why)}`).toBeVisible();
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
