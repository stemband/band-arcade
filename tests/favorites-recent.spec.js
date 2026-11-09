/* MY FAVORITES, RECENTLY PLAYED and FITS MY INSTRUMENT on the arcade floor (docs/engine/page-flow.md):
   - THE STAR: ☆ on ARCADE VIEW's cards, under a cabinet and in FIND A GAME's results stars a game; every star for it
     follows; it's saved on the device (store.gameData('floor').favs) and survives a reload
   - MY FAVORITES: a lobby sign (second, after NEW GAMES) with the starred games in the order they were starred, hidden
     while none are; ARCADE VIEW's ★ MY FAVORITES filter; unstarring with the filter on drops the card
   - RECENTLY PLAYED: the lobby's CONTINUE card shows the last game big and up to 3 more played lately; a game page
     notes itself (a game opened from a link counts too); one tap opens one
   - FITS MY <INSTRUMENT>: ARCADE VIEW's filter shows only the games that suit the saved instrument; it combines with the
     others; hidden with no instrument saved */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const floor = (hash = '') => `index.html?demo&nostart&flat&today=2026-11-08${hash}`;
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.Arcade && Arcade.Lobby && document.querySelector('#zones .zsign, #allGrid .gcard, .slot'));
const favs = page => page.evaluate(() => Arcade.favorites().map(g => g.id));
const withFloor = floorData => device('trumpet', {gameData: {floor: floorData}});

test('THE STAR: ARCADE VIEW, a cabinet and FIND A GAME star the same game; saved; the lobby sign follows', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  await expect(page.locator('.zsign[data-zone="favorites"]')).toHaveCount(0);        // nothing starred: no sign
  // ARCADE VIEW: a card's star (its own button, not the card's)
  await page.goto(floor('#all-games'));
  await ready(page);
  const star = page.locator('#allGrid .gc-fav[data-fav="rhythm-dojo"]');
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(star).toHaveAttribute('aria-label', /in my favorites/);
  expect(page.url()).toMatch(/#all-games$/);                                           // the tap never opened the game
  // FIND A GAME: the same game's star is already on; starring another from there
  await page.locator('#searchBtn').click();
  await page.locator('#gsInput').fill('timpani');
  await expect(page.locator('#gsList .gs-fav[data-fav="pedal-point"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#gsList .gs-fav[data-fav="pedal-point"]').click();
  await expect(page.locator('#gameSearch')).toBeVisible();                             // starring keeps the panel open
  await expect(page.locator('#gsList .gs-fav[data-fav="pedal-point"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#allGrid .gc-fav[data-fav="pedal-point"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await favs(page)).toEqual(['rhythm-dojo', 'pedal-point']);
  // saved: the lobby's MY FAVORITES sign, second, in the order they were starred
  await page.goto(floor());
  await ready(page);
  await expect(page.locator('#zones .zsign').nth(1)).toHaveAttribute('data-zone', 'favorites');
  await page.locator('.zsign[data-zone="favorites"]').click();
  await expect.poll(async () => (await page.evaluate(() => Arcade.Arcade.state())).zone).toBe('favorites');
  expect((await page.evaluate(() => Arcade.Arcade.state())).ring).toEqual(['rhythm-dojo', 'pedal-point']);
  // under a cabinet: the pill unstars the front game
  const pill = page.locator('#infoFav .fav-btn');
  await expect(pill).toHaveAttribute('aria-pressed', 'true');
  await expect(pill).toContainText('In my favorites');
  await pill.click();
  await expect(pill).toHaveAttribute('aria-pressed', 'false');
  await expect(pill).toContainText('Add to favorites');
  expect(await favs(page)).toEqual(['pedal-point']);
  watch.check();
});

test('ARCADE VIEW\'s filters: ★ my favorites, fits my instrument, no instrument needed (together = all of them)', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: withFloor({favs: ['rhythm-dojo', 'scale-trainer', 'chime-heist']})});
  await page.goto(floor('#all-games'));
  await ready(page);
  const shown = () => page.locator('#allGrid .gcard').evaluateAll(cs => cs.map(c => c.dataset.game));
  const all = await shown();
  // FITS MY TRUMPET: every game that suits the trumpet, none that don't
  await expect(page.locator('#fitFilter')).toBeVisible();
  await expect(page.locator('#fitFilter')).toContainText('Fits my Trumpet');
  await page.locator('#fitFilter').click();
  const fits = await page.evaluate(() => Arcade.floorGames().filter(g => Arcade.gameFit(g, 'trumpet').ok).map(g => g.id));
  expect(await shown()).toEqual(fits);
  expect(fits).not.toContain('rudiment-trainer');                                     // snare and bells only
  await expect(page.locator('#allGrid .gcard.nofit')).toHaveCount(0);
  await expect(page.locator('#allCount')).toContainText('for your Trumpet');
  // + ★ MY FAVORITES: both at once
  await page.locator('#favFilter').click();
  expect(await shown()).toEqual(['chime-heist', 'rhythm-dojo', 'scale-trainer'].filter(id => fits.includes(id)).sort((a, b) => all.indexOf(a) - all.indexOf(b)));
  // unstarring with the favorites filter on drops the card
  await page.locator('#allGrid .gc-fav[data-fav="rhythm-dojo"]').click();
  await expect(page.locator('#allGrid .gcard[data-game="rhythm-dojo"]')).toHaveCount(0);
  // off again: every game; remembered for the session only
  await page.locator('#fitFilter').click();
  await page.locator('#favFilter').click();
  expect(await shown()).toEqual(all);
  // no favorites at all: a hint how to add some
  await page.evaluate(() => { Arcade.store.gameData('floor').favs = []; Arcade.store.saveGameData('floor'); });
  await page.locator('#favFilter').click();
  await expect(page.locator('#allGrid .gcard')).toHaveCount(0);
  await expect(page.locator('#allCount')).toContainText('No favorites yet');
  watch.check();
});

test('FITS MY INSTRUMENT is hidden with no instrument saved', async ({page}) => {
  const watch = await prepare(page, {store: {player: null, members: {}, games: {}, modes: {}, gameData: {'season-lobby': {giftAfter: '9999-12-31'}}}});
  await page.goto(floor('#all-games'));
  await page.waitForFunction(() => window.Arcade && Arcade.Lobby && document.querySelector('#allGrid .gcard'));
  await expect(page.locator('#fitFilter')).toBeHidden();
  watch.check();
});

test('RECENTLY PLAYED: the last game big, 3 more under it; a game page notes itself; a tap opens one', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: withFloor({last: 'ghost-notes', recent: ['ghost-notes', 'rhythm-dojo', 'blocktave', 'lost-signal', 'note-storm']})});
  await page.goto(floor());
  await ready(page);
  const card = page.locator('#lobbyCards .lc-recent.lc-continue');
  await expect(card.locator('.rp-main')).toHaveAttribute('data-game', 'ghost-notes');
  expect(await card.locator('.rp-mini').evaluateAll(b => b.map(x => x.dataset.game))).toEqual(['rhythm-dojo', 'blocktave', 'lost-signal']);
  // a game opened straight from a link (a Brightspace post) counts too
  await page.goto('first-sight/index.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.pageGame === 'first-sight');
  await page.goto(floor());
  await ready(page);
  await expect(card.locator('.rp-main')).toHaveAttribute('data-game', 'first-sight');
  expect(await card.locator('.rp-mini').evaluateAll(b => b.map(x => x.dataset.game))).toEqual(['ghost-notes', 'rhythm-dojo', 'blocktave']);
  expect(await page.evaluate(() => Arcade.store.gameData('floor').recent.length)).toBeLessThanOrEqual(8);
  // one tap: that game (it then leads the card)
  await card.locator('.rp-mini[data-game="rhythm-dojo"]').click();
  await page.waitForURL(/rhythm-dojo\/index\.html/);
  watch.check();
});

test('RECENTLY PLAYED from an older save: CONTINUE alone, as before', async ({page}) => {
  const watch = await prepare(page, {store: withFloor({last: 'note-storm'})});
  await page.goto(floor());
  await ready(page);
  await expect(page.locator('#lobbyCards .lc-continue .rp-main')).toHaveAttribute('data-game', 'note-storm');
  await expect(page.locator('#lobbyCards .rp-mini')).toHaveCount(0);
  watch.check();
});
