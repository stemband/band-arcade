/* SUSTAIN SPEEDWAY: THE VISUALS (sustain-speedway/scenery.js + game.js render): a race runs in FULL and LITE graphics
   without errors (LITE: no particles, no roadside things, no shake); AUTO switches to LITE by itself on a slow device;
   the finish shows THE PODIUM with the right place, skippable with Enter or a tap; reduced motion = no shake or blur;
   the seasonal touches follow ?season= (and the "Seasonal look" switch); every time of day draws. Phone, iPad, laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const {openSpeedway, startTrack, shortRace} = require('./speedway-helpers');

const store = (gd = {}) => device('trumpet', {gameData: {'sustain-speedway': Object.assign({steerHint: true}, gd)}});
const SIZES = [['phone', {width: 390, height: 844}], ['iPad', {width: 1024, height: 768}], ['laptop', {width: 1366, height: 768}]];

for (const [name, size] of SIZES) for (const gfx of ['full', 'lite']) {
  test(`${name}, ${gfx}: a race to the podium and the results`, async ({page}) => {
    test.setTimeout(120000);
    await page.setViewportSize(size);
    const watch = await prepare(page, {store: store({gfx})});
    await openSpeedway(page, '&season=winter');
    await startTrack(page, 2);
    await shortRace(page, 3);
    await page.keyboard.down('Space');
    await page.waitForTimeout(1500);
    const fx = await page.evaluate(() => Arcade.Speedway.fx());
    expect(fx.lite).toBe(gfx === 'lite');
    if (gfx === 'lite') { expect(fx.particles).toBe(0); expect(fx.shook).toBe(0); }
    else { expect(fx.particles).toBeGreaterThan(10); expect(fx.kinds).toContain('snow'); }
    await page.waitForFunction(() => Arcade.Speedway.podium(), null, {timeout: 90000});
    await page.keyboard.up('Space');
    const pd = await page.evaluate(() => Arcade.Speedway.podium());
    expect(pd.place).toBe(1);
    expect(pd.order[0]).toBe('you');
    await expect(page.locator('#podium .pd-slot.p1.me')).toBeVisible();
    await expect(page.locator('#podium .pd-slot.p1 .av-box, #podium .pd-slot.p1 .pt-box').first()).toBeVisible();   // your avatar on the top step
    if (gfx === 'lite') expect(await page.evaluate(() => Arcade.Speedway.fx().particles)).toBe(0);
    else expect(await page.evaluate(() => Arcade.Speedway.fx().kinds)).toContain('confetti');
    await page.keyboard.press('Enter');                                            // skip it
    await expect(page.locator('#podium')).toBeHidden();
    await expect(page.locator('#results')).toBeVisible();
    watch.check();
  });
}

test('the podium: the right place when you finish 3rd, and a tap skips it', async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: store({gfx: 'full'})});
  await openSpeedway(page);
  await startTrack(page, 1);
  await page.evaluate(() => {
    const G = Arcade.Speedway.debug(); G.lens = G.lens.map(() => 2); G.total = 2 * G.lens.length;
    G.rivals.forEach((r, i) => { r.pace = [5, 4, .01][i]; });                          // two rivals far ahead
  });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.podium(), null, {timeout: 90000});
  await page.keyboard.up('Space');
  const pd = await page.evaluate(() => Arcade.Speedway.podium());
  expect(pd.place).toBe(3);
  expect(pd.order[2]).toBe('you');
  await expect(page.locator('#podium .pd-slot.p3.me')).toBeVisible();
  expect(await page.evaluate(() => Arcade.Speedway.fx().kinds)).toContain('spark');    // sparkles for 2nd/3rd
  await page.locator('#podium').click();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#resPos')).toHaveText('3rd place');
  watch.check();
});

test('reduced motion: no shake, no blur, no speed lines during nitro', async ({page}) => {
  test.setTimeout(90000);
  await page.emulateMedia({reducedMotion: 'reduce'});
  const watch = await prepare(page, {store: store({gfx: 'full'})});
  await openSpeedway(page);
  await startTrack(page, 1);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.debug().nitro, null, {timeout: 20000});
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => Arcade.Speedway.fx().shook)).toBe(0);
  await page.keyboard.up('Space');
  watch.check();
});

test('normal motion, Full: nitro shakes (the check above means something)', async ({page}) => {
  test.setTimeout(90000);
  const watch = await prepare(page, {store: store({gfx: 'full'})});
  await openSpeedway(page);
  await startTrack(page, 1);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.debug().nitro, null, {timeout: 20000});
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => Arcade.Speedway.fx().shook)).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  watch.check();
});

test('seasonal touches follow ?season= and the date; the Seasonal look switch turns them off', async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: store({gfx: 'full'})});
  const look = async q => { await openSpeedway(page, q); await startTrack(page, 3); const f = await page.evaluate(() => Arcade.Speedway.fx()); await page.evaluate(() => Arcade.Speedway.stop && Arcade.Speedway.stop()); return f; };
  let f = await look('&season=spooky');
  expect(f.season).toBe('spooky'); expect(f.props).toContain('pumpkin'); expect(f.air).toBe('bat');
  f = await look('&season=spring');
  expect(f.season).toBe('spring'); expect(f.props).toContain('flower'); expect(f.air).toBe('petal');
  f = await look('&today=2026-12-10');
  expect(f.season).toBe('winter'); expect(f.air).toBe('snow');
  f = await look('&today=2026-06-20');
  expect(f.season).toBe(null); expect(f.props).toEqual(['palm']);
  await page.evaluate(() => Arcade.Seasons.setLookOn(false));
  f = await look('&today=2026-12-10');
  expect(f.season).toBe(null);
  watch.check();
});

test('every time of day and weather draws (all 8 tracks) without errors', async ({page}) => {
  test.setTimeout(180000);
  const watch = await prepare(page, {store: store({gfx: 'full'})});
  await openSpeedway(page);
  const seen = [];
  for (let lv = 1; lv <= 8; lv++) {
    await page.evaluate(() => Arcade.Speedway.stop && Arcade.Speedway.stop());
    await openSpeedway(page);
    await startTrack(page, lv);
    await page.waitForTimeout(400);
    seen.push((await page.evaluate(() => Arcade.Speedway.fx())).time);
  }
  expect(seen).toEqual(['sunset', 'dusk', 'golden', 'neon', 'dawn', 'night', 'noon', 'night']);
  watch.check();
});

test('AUTO graphics: a slow device switches to LITE by itself, without a word', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium feature');
  test.setTimeout(120000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  await startTrack(page, 8);
  const cdp = await page.context().newCDPSession(page);
  // a frame that takes 40 ms: the first seconds' average is over 22 ms
  await page.evaluate(() => { const busy = () => { const t = performance.now(); while (performance.now() - t < 40); window.__busy = requestAnimationFrame(busy); }; window.__busy = requestAnimationFrame(busy); });
  await page.waitForFunction(() => Arcade.Speedway.fx().lite, null, {timeout: 20000});
  await page.evaluate(() => cancelAnimationFrame(window.__busy));
  const r = await page.evaluate(() => ({fx: Arcade.Speedway.fx(), saved: Arcade.store.gameData('sustain-speedway').gfxSlow}));
  expect(r.fx.mode).toBe('auto'); expect(r.saved).toBe(true); expect(r.fx.particles).toBe(0);
  expect(r.fx.perf.avg).toBeGreaterThan(22);
  await cdp.detach();
  watch.check();
});

test('the Settings panel: Graphics Auto / Full / Lite, saved', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  await page.evaluate(() => Arcade.UI.settings.open());
  const seg = page.locator('.sw-gfx [data-gfx]');
  await expect(seg).toHaveCount(3);
  await expect(page.locator('.sw-gfx [data-gfx="auto"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.sw-gfx [data-gfx="lite"]').click();
  await expect(page.locator('.sw-gfx [data-gfx="lite"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').gfx)).toBe('lite');
  watch.check();
});
