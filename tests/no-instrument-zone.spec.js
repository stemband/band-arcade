/* THE NO INSTRUMENT NEEDED ZONE (shared/games.js ZONES `auto: 'noInstrument'`): its games come from the games' own
   `noInstrument` flag, it opens and returns like every zone, the Full Arcade still shows each cabinet once, nothing in
   it is dimmed for the saved instrument, and the lobby's signs fit on a phone, an iPad (both ways) and a laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const ZONE = 'no-instrument';
const state = page => page.evaluate(() => Arcade.Arcade.state());

test('the zone holds exactly the noInstrument games, in games.js order, and a newly flagged game joins by itself', async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto('index.html?demo&nostart');
  const r = await page.evaluate(z => {
    const A = Arcade, flagged = A.floorGames().filter(g => g.noInstrument).map(g => g.id);
    const zones = A.zoneList().map(x => x.id);
    const before = A.zoneGames(z).map(g => g.id);
    const ghost = A.GAMES.find(g => g.id === 'ghost-notes'); ghost.noInstrument = true;     // a game flagged later
    const after = A.zoneGames(z).map(g => g.id);
    delete ghost.noInstrument;
    return {flagged, zones, before, after, zone: A.zoneById(z), ownZones: A.floorGames().filter(g => (g.zones || []).includes(z)).map(g => g.id),
      stillInOwn: flagged.every(id => A.zonesOf(A.GAMES.find(g => g.id === id)).length > 0)};
  }, ZONE);
  expect(r.zone).toMatchObject({name: 'No Instrument Needed', tagline: 'Tap, clap and play: no instrument required.', auto: 'noInstrument'});
  expect(r.zones.indexOf(ZONE)).toBe(r.zones.indexOf('ninja-dojo') + 1);             // right after the Band Ninja Dojo
  expect(r.before).toEqual(r.flagged);                                             // exactly the flag, games.js order
  expect(r.before.length).toBeGreaterThan(0);
  expect(r.after).toContain('ghost-notes');
  expect(r.ownZones).toEqual([]);                                                  // nobody lists it by hand
  expect(r.stillInOwn).toBe(true);                                                 // they stay in their own zones
  // the lobby sign: its neon differs from its neighbours', its game count
  const sign = page.locator(`.zsign[data-zone="${ZONE}"]`);
  await expect(sign).toBeVisible();
  await expect(sign.locator('.zs-name')).toHaveText('No Instrument Needed');
  await expect(sign.locator('.zs-count')).toHaveText(`${r.flagged.length} games`);
  await expect(sign.locator('.cab-sil')).toHaveCount(r.flagged.length);
  const colors = await page.evaluate(() => Arcade.zoneList().map(z => z.color));
  const i = r.zones.indexOf(ZONE);
  expect(colors[i]).not.toBe(colors[i - 1]);
  expect(colors[i]).not.toBe(colors[i + 1]);
  watch.check();
});

test('the sign opens the carousel, the address links to it, Back returns to the lobby', async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto('index.html?demo&nostart&flat');
  const flagged = await page.evaluate(() => Arcade.floorGames().filter(g => g.noInstrument).map(g => g.id));
  await page.locator(`.zsign[data-zone="${ZONE}"]`).click();
  await expect.poll(async () => (await state(page)).zone).toBe(ZONE);
  let s = await state(page);
  expect(s.view).toBe('zone');
  expect(s.ring).toEqual(flagged);
  expect(page.url()).toContain(`#zone=${ZONE}`);
  await expect(page.locator('#fbTitle')).toHaveText('No Instrument Needed');
  await page.locator('#backBtn').click();
  await expect.poll(async () => (await state(page)).view).toBe('lobby');
  // a direct link
  await page.goto(`index.html?demo&nostart&flat#zone=${ZONE}&game=rhythm-dojo`);
  await expect.poll(async () => (await state(page)).game).toBe('rhythm-dojo');
  expect((await state(page)).zone).toBe(ZONE);
  watch.check();
});

test('back from a game opened here returns to this zone; the Full Arcade shows each cabinet once', async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(`index.html?demo&nostart&flat#zone=${ZONE}&game=note-ninja`);
  await expect.poll(async () => (await state(page)).game).toBe('note-ninja');
  await page.locator('.slot[data-d="0"] .cab-start').click();
  await page.waitForURL(/note-ninja\/index\.html/);
  await page.goto('index.html?demo&nostart&flat#note-ninja');                  // the game's "← ARCADE"
  await expect.poll(async () => (await state(page)).zone).toBe(ZONE);
  expect((await state(page)).game).toBe('note-ninja');
  // the Full Arcade: every floor game once, none tagged with this zone
  await page.goto('index.html?demo&nostart&flat#full-arcade');
  await expect.poll(async () => (await state(page)).view).toBe('full');
  const s = await state(page);
  const floor = await page.evaluate(() => Arcade.floorGames().map(g => g.id));
  expect(s.ring.length).toBe(new Set(s.ring).size);
  expect(s.ring.slice().sort()).toEqual(floor.slice().sort());
  await expect(page.locator('#jumpStrip .jg', {hasText: 'No Instrument Needed'})).toHaveCount(0);
  await expect(page.locator('.cab-ztag', {hasText: 'No Instrument Needed'})).toHaveCount(0);
  watch.check();
});

test('nothing in the zone is dimmed for the saved instrument, and opening one needs no switch', async ({page}) => {
  const watch = await prepare(page, {store: device('snare')});                  // a snare: Chime Heist is "bells only" elsewhere
  await page.goto('index.html?demo&nostart&flat#zone=technique-lab&game=chime-heist');
  await expect.poll(async () => (await state(page)).game).toBe('chime-heist');
  await expect(page.locator('.slot.nofit')).not.toHaveCount(0);                  // its own zone still dims it
  await page.goto(`index.html?demo&nostart&flat#zone=${ZONE}&game=chime-heist`);
  await expect.poll(async () => (await state(page)).zone).toBe(ZONE);
  await expect(page.locator('.slot')).not.toHaveCount(0);
  await expect(page.locator('.slot.nofit')).toHaveCount(0);
  await expect(page.locator('#infoTags .fit-tag')).toHaveCount(0);
  await page.locator('.slot[data-d="0"] .cab-start').click();
  await page.waitForURL(/chime-heist\/index\.html/);                              // straight in: no "switch instrument" panel
  watch.check();
});

for (const [name, w, h] of [['phone', 390, 844], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['laptop', 1366, 768]]) {
  test(`the lobby's signs fit with the new zone (${name})`, async ({page}) => {
    await page.setViewportSize({width: w, height: h});
    const watch = await prepare(page, {store: device()});
    await page.goto('index.html?demo&nostart');
    const signs = page.locator('.zsign');
    const n = await page.evaluate(() => Arcade.zoneList().length);
    await expect(signs).toHaveCount(n);
    const boxes = await signs.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; }));
    const grid = await page.locator('#zones').evaluate(e => { const r = e.getBoundingClientRect(); return {x: r.x, w: r.width}; });
    for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(w + 0.5); }
    // every sign the same width, none overlapping
    boxes.forEach(b => expect(Math.abs(b.w - boxes[0].w)).toBeLessThan(2));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      expect(a.x + a.w <= b.x + 1 || b.x + b.w <= a.x + 1 || a.y + a.h <= b.y + 1 || b.y + b.h <= a.y + 1).toBe(true);
    }
    // every sign's cabinet silhouettes stay inside it (7 of them on the No Instrument Needed sign)
    const spill = await signs.evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect();
      return [...e.querySelectorAll('.cab-sil')].some(s => { const q = s.getBoundingClientRect(); return q.left < r.left - 0.5 || q.right > r.right + 0.5; }); }).map(e => e.dataset.zone));
    expect(spill).toEqual([]);
    // a lone sign on the last row stands in the middle
    const last = boxes[boxes.length - 1], alone = boxes.filter(b => Math.abs(b.y - last.y) < 2).length === 1;
    if (alone) expect(Math.abs(last.x + last.w / 2 - (grid.x + grid.w / 2))).toBeLessThan(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({path: `test-results/lobby-zones-${name.replace(/ /g, '-')}.png`, fullPage: true});
    watch.check();
  });
}
