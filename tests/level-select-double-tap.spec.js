/* THE LEVEL SELECT's DOUBLE TAP (shared/level-select.js): two taps on the same card within DOUBLE_MS start it, as if
   START were tapped (the game's own start path: requireMic, LevelSelect.played, the level screen). Slower taps, taps on
   two cards and locked cards only select (or say what opens them). Enter/Space on the selected card = START. The
   'start-ready' sound waits out the double-tap window. The tip under START shows at most 3 times.
   Ghost Notes (a plain game) and Note Storm (with Endless), with touch and with the mouse. The page's clock is
   Playwright's test clock, paused while tapping, so "within 350 ms" never depends on how busy the machine is. */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

/** open a game's level select with the clock paused and the spies on: Sfx.event names and LevelSelect.played calls */
async function open(page, url) {
  const watch = await prepare(page);
  await page.clock.install();
  await page.goto(url);
  await page.waitForFunction(() => Arcade.LevelSelect && Arcade.LevelSelect.state() && Arcade.LevelSelect.state().appeared);
  await page.evaluate(() => {
    window.__ev = []; window.__played = [];
    const ev = Arcade.Sfx.event.bind(Arcade.Sfx);
    Arcade.Sfx.event = (name, o) => { window.__ev.push(name); return ev(name, o); };
    const pl = Arcade.LevelSelect.played;
    Arcade.LevelSelect.played = i => { window.__played.push(i); window.__ev.push('PLAYED'); return pl(i); };
  });
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 500);
  return watch;
}
const sel = page => page.evaluate(() => Arcade.LevelSelect.state().sel);
const played = page => page.evaluate(() => window.__played.slice());
const events = page => page.evaluate(() => window.__ev.slice());

/** the game's own start path, after the tap: the microphone screen (the demo stands in), then the level */
async function started(page, which) {
  await page.clock.resume();
  await page.waitForFunction(() => window.__played.length || Arcade.requireMic.showing());
  if (await page.evaluate(() => Arcade.requireMic.showing())) await page.locator('[data-act=go]').click();
  await expect.poll(() => played(page)).toEqual([which]);
  await expect(page.locator('#hub')).toBeHidden();
  await expect(page.locator('#uiPauseBtn')).toBeVisible();
}

for (const input of ['touch', 'mouse']) {
  test.describe(`level select double tap (${input})`, () => {
    test.use(input === 'touch' ? {hasTouch: true} : {});
    const tap = (loc) => input === 'touch' ? loc.tap() : loc.click();
    // force: a locked card is aria-disabled (Playwright waits for it to be "enabled"); it still takes taps on purpose
    const dbl = async (loc, o = {}) => { if (input === 'touch') { await loc.tap(o); await loc.tap(o); } else await loc.dblclick(o); };

    test('a double tap on an open card starts that level; no start-ready, one ui-toggle', {tag: '@quick'}, async ({page}) => {
      const watch = await open(page, 'ghost-notes/index.html?demo&nostart');
      await dbl(page.locator('.ls-card').nth(2));
      expect(await sel(page)).toBe(2);
      await started(page, 2);
      const ev = await events(page), before = ev.slice(0, ev.indexOf('PLAYED'));
      expect(before.filter(n => n === 'ui-toggle')).toHaveLength(1);
      expect(ev.filter(n => n === 'start-ready')).toHaveLength(0);
      // no sound twice from one start (the game's own start sound once)
      const starts = ev.filter(n => /start/.test(n));
      expect(new Set(starts).size).toBe(starts.length);
      watch.check();
    });

    test('two taps 600 ms apart only select; START still works and its start-ready plays once', async ({page}) => {
      const watch = await open(page, 'ghost-notes/index.html?demo&nostart');
      const card = page.locator('.ls-card').nth(1);
      await tap(card);
      await page.clock.runFor(600);
      await tap(card);
      await page.clock.runFor(600);
      expect(await sel(page)).toBe(1);
      expect(await played(page)).toEqual([]);
      await expect(page.locator('#hub')).toBeVisible();
      expect((await events(page)).filter(n => n === 'start-ready')).toHaveLength(1);
      await tap(page.locator('.ls-start'));
      await started(page, 1);
      expect((await events(page)).filter(n => n === 'start-ready')).toHaveLength(1);
      watch.check();
    });

    test('quick taps on two different cards select the second only', async ({page}) => {
      const watch = await open(page, 'ghost-notes/index.html?demo&nostart');
      await tap(page.locator('.ls-card').nth(0));
      await tap(page.locator('.ls-card').nth(1));
      await page.clock.runFor(600);
      expect(await sel(page)).toBe(1);
      expect(await played(page)).toEqual([]);
      await expect(page.locator('#hub')).toBeVisible();
      watch.check();
    });

    test('a locked card never starts; its toast shows once', async ({page}) => {
      const watch = await open(page, 'ghost-notes/index.html?nostart');     // no ?demo: Level 2 is locked
      await page.evaluate(() => {
        window.__toasts = 0;
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('ui-toast')) window.__toasts++; })))
          .observe(document.getElementById('levelGrid'), {childList: true, subtree: true});
      });
      const card = page.locator('.ls-card').nth(1);
      await expect(card).toHaveClass(/ls-locked/);
      await dbl(card, {force: true});
      await page.clock.runFor(600);
      expect(await page.evaluate(() => window.__toasts)).toBe(1);
      expect(await sel(page)).toBe(null);
      expect(await played(page)).toEqual([]);
      await expect(page.locator('#hub')).toBeVisible();
      watch.check();
    });

    test('a double tap on the Endless tile starts Endless (its card and its button)', async ({page}) => {
      const watch = await open(page, 'note-storm/index.html?demo&nostart');
      await dbl(page.locator('.ls-endless .ed-blurb'));
      await started(page, 'endless');
      watch.check();
    });

    test('a double tap on the Endless button starts Endless', async ({page}) => {
      const watch = await open(page, 'note-storm/index.html?demo&nostart');
      await dbl(page.locator('.ls-endless .ed-go'));
      await started(page, 'endless');
      expect((await events(page)).filter(n => n === 'start-ready')).toHaveLength(0);
      watch.check();
    });
  });
}

for (const key of ['Enter', 'Space']) {
  test(`keyboard: ${key} on an unselected card selects it; on the selected card it starts`, async ({page}) => {
    const watch = await open(page, 'ghost-notes/index.html?demo&nostart');
    await page.locator('.ls-card').nth(1).focus();
    await page.keyboard.press(key);
    await page.clock.runFor(600);
    expect(await sel(page)).toBe(1);
    expect(await played(page)).toEqual([]);
    await page.keyboard.press(key);
    await started(page, 1);
    watch.check();
  });
}

test('the tip under START shows at most 3 times on this device', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('ghost-notes/index.html?demo&nostart');
  const tip = page.locator('.ls-row .ls-tip');
  await expect(page.locator('.ls-need')).toHaveText('Select your notes and level');
  await expect(tip).toHaveCount(0);                                 // nothing selected: no tip
  await page.locator('.ls-card').nth(0).click();
  await expect(tip).toHaveText('Tip: double-tap a level to start it');
  const count = () => page.evaluate(() => Arcade.store.gameData('level-select').dblHint);
  expect(await count()).toBe(1);
  for (const n of [2, 3]) {                                         // the remembered level: START ready on arrival
    await page.reload();
    await expect(tip).toBeVisible();
    expect(await count()).toBe(n);
  }
  await page.reload();
  await page.waitForFunction(() => Arcade.LevelSelect.state() && Arcade.LevelSelect.state().appeared && Arcade.LevelSelect.state().ready);
  await expect(tip).toHaveCount(0);
  expect(await count()).toBe(3);
  watch.check();
});
