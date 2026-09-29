/* SEASONAL LOOKS (season-look.js + shared/seasons.js): the right look for a date, an event beats a background-only
   season, the "Seasonal look" switch (Settings panel + event panel) turns it off and is remembered, the old DECORATIONS
   "off" carries over, ?season= previews without saving, the concert countdown, and game pages never get a look. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const floor = (q = '') => `index.html?demo&nostart${q}`;
const look = page => page.evaluate(() => ({html: document.documentElement.dataset.slook || null, hosts: document.querySelectorAll('.slook').length,
  banner: !!document.querySelector('.ev-banner'), state: Arcade.SeasonLook.state()}));
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1') || '{}').gameData?.seasons || {});

test('the right look for sample dates; an event always beats a background-only season', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor());
  const got = await page.evaluate(() => {
    const at = s => { const [y, m, d] = s.split('-').map(Number); const L = Arcade.Seasons.look(new Date(y, m - 1, d, 12)); return L ? `${L.look}/${L.kind}` : null; };
    const dates = ['2026-08-01', '2026-09-30', '2026-10-01', '2026-11-01', '2026-11-02', '2026-11-30', '2026-12-01', '2027-01-07', '2027-01-08', '2027-02-06',
      '2027-02-07', '2027-02-14', '2027-02-15', '2027-02-28', '2027-03-15', '2027-04-15', '2027-05-22', '2027-06-20'];
    const out = Object.fromEntries(dates.map(d => [d, at(d)]));
    // a background-only season on an event's days: the event's look wins
    Arcade.SEASON_BACKDROPS.push({id: 'test-overlap', name: 'Overlap', look: 'frost', dates: [['10-01', '10-31']]});
    out.overlap = at('2026-10-15');
    Arcade.SEASON_BACKDROPS.pop();
    return out;
  });
  expect(got).toEqual({
    '2026-08-01': 'school/backdrop', '2026-09-30': 'school/backdrop', '2026-10-01': 'spooky/event', '2026-11-01': 'spooky/event',
    '2026-11-02': 'harvest/backdrop', '2026-11-30': 'harvest/backdrop', '2026-12-01': 'winter/event', '2027-01-07': 'winter/event',
    '2027-01-08': 'frost/backdrop', '2027-02-06': 'frost/backdrop', '2027-02-07': 'friendship/event', '2027-02-14': 'friendship/event',
    '2027-02-15': 'frost/backdrop', '2027-02-28': 'frost/backdrop', '2027-03-15': 'miosm/event', '2027-04-15': 'spring/event',
    '2027-05-22': 'summer/event', '2027-06-20': null, overlap: 'spooky/event'});
  watch.check();
});

test('the look shows on the menus (lobby, zone, ALL GAMES) and the 3D room takes its colors', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2026-10-05'));
  let s = await look(page);
  expect(s.html).toBe('spooky');
  expect(s.state.hosts.sort()).toEqual(['body', 'pressStart', 'selectView']);   // behind the floor, PRESS START, Choose Your Instrument
  expect(s.banner).toBe(true);
  await expect(page.locator('body > .slook .sl-moon')).toBeVisible();
  await page.goto(floor('&today=2026-11-10#all-games'));
  expect((await look(page)).html).toBe('harvest');
  await expect(page.locator('#allView')).toBeVisible();
  await page.goto(floor('&today=2027-01-20#zone=note-reading'));
  await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
  expect((await look(page)).html).toBe('frost');
  if (await page.evaluate(() => Arcade.Arcade.state().kind === '3d')) {
    expect(await page.evaluate(() => Arcade.Floor3D.look())).toEqual({haze: ['cyan', 'blue', 'white'], lights: ['cyan', 'blue']});
  }
  watch.check();
});

test('"Seasonal look" OFF in the Settings panel: the normal arcade look, remembered; the event banner stays', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2026-10-05'));
  expect((await look(page)).html).toBe('spooky');
  await page.evaluate(() => Arcade.UI.settings.open({lobby: true}));
  const sw = page.locator('#uiSettings [data-k=season]');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  let s = await look(page);
  expect([s.html, s.hosts, s.banner]).toEqual([null, 0, true]);
  expect(await saved(page)).toMatchObject({look: false});
  await page.reload();
  s = await look(page);
  expect([s.html, s.hosts, s.banner]).toEqual([null, 0, true]);
  // on again from the event panel's switch
  await page.locator('.ev-banner').click();
  const cb = page.locator('.ev-deco-cb');
  await expect(cb).not.toBeChecked();
  await cb.check();
  expect((await look(page)).html).toBe('spooky');
  expect(await saved(page)).toMatchObject({look: true});
  watch.check();
});

test('an old DECORATIONS "off" (gameData seasons.deco = false) carries over as Seasonal look: Off', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {seasons: {deco: false, claimed: {}}}})});
  await page.goto(floor('&today=2026-12-10'));
  let s = await look(page);
  expect([s.html, s.state.on, s.banner]).toEqual([null, false, true]);
  await page.evaluate(() => Arcade.UI.settings.open({lobby: true}));
  const sw = page.locator('#uiSettings [data-k=season]');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  s = await look(page);
  expect(s.html).toBe('winter');
  const d = await saved(page);
  expect(d.look).toBe(true);
  expect('deco' in d).toBe(false);                                 // the old setting is gone
  watch.check();
});

test('?season= previews any look (events, background-only seasons, a look by name) and saves nothing', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  for (const [id, want, banner] of [['frost', 'frost', false], ['school', 'school', false], ['concert', 'concert', false], ['spring', 'spring', true]]) {
    await page.goto(floor(`&today=2027-06-20&season=${id}`));
    const s = await look(page);
    expect([id, s.html, s.banner]).toEqual([id, want, banner]);
  }
  expect(await saved(page)).toEqual({});
  // and with the switch off, a preview still shows (it's for trying a look)
  await page.evaluate(() => Arcade.Seasons.setLookOn(false));
  await page.goto(floor('&today=2027-06-20&season=harvest'));
  expect((await look(page)).html).toBe('harvest');
  watch.check();
});

test('a concert with countdown: true: the Concert Season look and "🎻 Concert in N days!"', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2027-04-29'));
  const r = await page.evaluate(() => {
    Arcade.SEASONS.unshift({id: 'concert-test', name: 'Spring Concert', emoji: '🎻', start: '2027-04-20', end: '2027-05-04', look: 'concert', countdown: true,
      colors: ['yellow', 'red'], deco: 'music', ladder: [{do: 'days', n: 2}]});
    Arcade.SeasonLook.apply(); Arcade.SeasonLobby.render();
    const S = Arcade.Seasons, o = S.active();
    return {look: document.documentElement.dataset.slook, banner: document.querySelector('.ev-banner').textContent.replace(/\s+/g, ' ').trim(),
      tomorrow: S.leftText(Object.assign({}, o, {daysLeft: 1})), today: S.leftText(Object.assign({}, o, {daysLeft: 0}))};
  });
  expect(r.look).toBe('concert');
  expect(r.banner).toBe('🎻Concert in 5 days!');
  expect([r.tomorrow, r.today]).toEqual(['Concert tomorrow!', 'Concert tonight!']);
  watch.check();
});

test('games keep their own look; MOTION off stills the backdrop', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {bg: {motion: false}}})});
  await page.goto(floor('&today=2026-12-10'));
  const s = await look(page);
  expect([s.html, s.state.still]).toEqual(['winter', true]);
  expect(await page.evaluate(() => [...document.querySelectorAll('body > .slook .sl-x')].every(e => getComputedStyle(e).animationName === 'none'))).toBe(true);
  await page.goto('ghost-notes/index.html?demo&nostart&today=2026-12-10');
  await page.waitForFunction(() => window.Arcade && Arcade.store);
  expect(await page.evaluate(() => [document.querySelectorAll('.slook').length, document.documentElement.dataset.slook || null])).toEqual([0, null]);
  watch.check();
});
