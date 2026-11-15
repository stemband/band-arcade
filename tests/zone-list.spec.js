/* A ZONE AS LIST (arcade.js gridZone, lobby.js renderAll with `games`): a zone opens on its cards by default (a first
   visit: gameData('floor').zoneView unset); one tap opens a game and Back from it returns to the zone, scrolled to that
   card; the switch at the top flips to CABINETS and back with the same game, remembered on this device; NO INSTRUMENT
   WITH ME filters the cards; the cards fit on a phone, an iPad (both ways) and a Chromebook. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const fresh = (member = 'trumpet', floor = {}) => device(member, {gameData: {floor: Object.assign({zoneView: undefined}, floor)}});
const state = page => page.evaluate(() => Arcade.Arcade.state());
const lobby = 'index.html?demo&nostart&flat';

test('a zone opens as LIST by default: the zone\'s games as cards, no filter chips, no repeated zone tag', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: fresh()});
  await page.goto(lobby);
  await page.locator('.zsign[data-zone="technique-lab"]').click();
  await expect.poll(async () => (await state(page)).mode).toBe('list');
  const s = await state(page);
  expect(s.zone).toBe('technique-lab');
  expect(s.ring).toEqual(await page.evaluate(() => Arcade.zoneGames('technique-lab').map(g => g.id)));
  await expect(page.locator('#allView')).toBeVisible();
  await expect(page.locator('#zoneView')).toBeHidden();
  await expect(page.locator('.allg-bar')).toBeHidden();
  await expect(page.locator('#fbTitle')).toHaveText('Technique Lab');
  await expect(page.locator('#allGrid .ztag', {hasText: 'Technique Lab'})).toHaveCount(0);
  await expect(page.locator('#allView .vsw-opt[data-mode="list"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#viewBtn')).toHaveAttribute('aria-pressed', 'false');     // not ARCADE VIEW
  await page.locator('#backBtn').click();
  await expect.poll(async () => (await state(page)).view).toBe('lobby');
  watch.check();
});

test('one tap opens the game; its "← ARCADE" comes back to the zone\'s list with that card', async ({page}) => {
  const watch = await prepare(page, {store: fresh()});
  await page.goto(lobby + '#zone=ear-training');
  await expect.poll(async () => (await state(page)).mode).toBe('list');
  await page.locator('#allGrid .gcard[data-game="pedal-point"]').click();
  await page.waitForURL(/pedal-point\/index\.html/);
  await page.goto(lobby + '#pedal-point');
  await expect.poll(async () => (await state(page)).zone).toBe('ear-training');
  const s = await state(page);
  expect([s.mode, s.game]).toEqual(['list', 'pedal-point']);
  await expect(page.locator('#allGrid .gcard[data-game="pedal-point"]')).toBeFocused();
  watch.check();
});

test('the switch: CABINETS with the same game in front, LIST again, remembered on this device', async ({page}) => {
  const watch = await prepare(page, {store: fresh()});
  await page.goto(lobby + '#zone=note-reading&game=note-storm');
  await expect.poll(async () => (await state(page)).mode).toBe('list');
  await page.locator('#allView .vsw-opt[data-mode="cabinets"]').click();
  await expect.poll(async () => (await state(page)).mode).toBe('cabinets');
  expect((await state(page)).game).toBe('note-storm');
  await expect(page.locator('#zoneView .vsw-opt[data-mode="cabinets"]')).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => Arcade.store.gameData('floor').zoneView)).toBe('cabinets');
  // remembered: another zone opens as CABINETS too
  await page.goto(lobby);
  await page.locator('.zsign[data-zone="ear-training"]').click();
  await expect.poll(async () => (await state(page)).mode).toBe('cabinets');
  // and back to LIST, with the front cabinet's card
  await page.locator('#zoneView .vsw-opt[data-mode="list"]').click();
  await expect.poll(async () => (await state(page)).mode).toBe('list');
  const front = (await state(page)).game;
  expect(front).toBeTruthy();
  // ARCADE VIEW keeps its own remembered way (the zone's switch never changes it)
  expect(await page.evaluate(() => Arcade.store.gameData('floor').arcadeView)).toBeUndefined();
  watch.check();
});

test('NO INSTRUMENT WITH ME: the zone\'s list shows only those games, none dimmed', async ({page}) => {
  const watch = await prepare(page, {store: fresh('snare')});
  await page.goto(lobby);
  await page.locator('#noInstSwitch').click();
  await page.locator('.zsign[data-zone="technique-lab"]').click();
  await expect.poll(async () => (await state(page)).mode).toBe('list');
  const ids = (await state(page)).ring;
  const want = await page.evaluate(() => Arcade.zoneGames('technique-lab').filter(g => g.noInstrument).map(g => g.id));
  expect(ids).toEqual(want);
  await expect(page.locator('#allGrid .gcard.nofit')).toHaveCount(0);
  watch.check();
});

for (const [name, w, h] of [['phone', 390, 844], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768]]) {
  test(`the zone's cards fit (${name})`, async ({page}) => {
    await page.setViewportSize({width: w, height: h});
    const watch = await prepare(page, {store: fresh()});
    await page.goto(lobby + '#zone=technique-lab');
    await expect.poll(async () => (await state(page)).mode).toBe('list');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const first = await page.locator('#allGrid .gcard').first().boundingBox();
    expect(first.y + first.height).toBeLessThanOrEqual(h);                         // the first card on screen, no scrolling
    const sw = await page.locator('#allView .vsw').boundingBox();
    expect(sw.y).toBeGreaterThanOrEqual(0);
    await page.screenshot({path: `test-results/zone-list-${name.replace(/ /g, '-')}.png`});
    watch.check();
  });
}
