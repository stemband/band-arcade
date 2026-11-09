/* FINDING GAMES on the arcade floor (docs/engine/page-flow.md: FIND A GAME, NEW GAMES, AUDITION PREP):
   - every game in shared/games.js has an `added` date and `keywords` (FIND A GAME and the NEW badge need them)
   - FIND A GAME (shared/game-search.js): the words students type find the right game first (names, skills, keywords,
     run-together words, near spellings); Tune Up's tools are results too; nothing typed = every game A–Z
   - the top bar's SEARCH button and "/" open it from the lobby, a zone and ARCADE VIEW; Esc and ✕ close it; Enter opens
     the best match; a result opens the game like a lobby card, and Back from the game returns to where it was found
   - NEW GAMES: the lobby's first sign holds the games added in the last NEW_GAME_DAYS days (newest first) and is hidden
     when none are; NEW badges on ARCADE VIEW's cards, the carousel's info and the search results
   - AUDITION PREP: Scale Trainer, First Sight and the Rudiment Trainer in one zone (each still in its own) */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const DAY = '2026-11-08';                               // First Sight (added 2026-11-05) is new; Rhythm Dojo isn't
const floor = (hash = '', today = DAY) => `index.html?demo&nostart&flat&today=${today}${hash}`;
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.GameSearch && Arcade.Arcade && document.querySelector('#zones .zsign, #allGrid .gcard, .slot'));
const first = (page, q) => page.evaluate(q => Arcade.GameSearch.find(q).map(r => r.tool ? r.g.id + ':' + r.tool : r.g.id), q);

test('every game has an added date and search keywords', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  const bad = await page.evaluate(() => (Arcade.ALL_GAMES || Arcade.GAMES).filter(g =>
    !/^\d{4}-\d{2}-\d{2}$/.test(g.added || '') || isNaN(new Date(g.added)) || !Array.isArray(g.keywords) || !g.keywords.length ||
    g.keywords.some(k => typeof k !== 'string' || k !== k.toLowerCase() || !k.trim())).map(g => g.id));
  expect(bad, 'games.js: each game needs added: \'YYYY-MM-DD\' and lowercase keywords').toEqual([]);
  watch.check();
});

test('FIND A GAME: what students type finds the right game first', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  const top = {
    'first sight': 'first-sight', 'sight reading': 'first-sight', 'sightreading': 'first-sight', 'Sight-Read': 'first-sight',
    'etude': 'first-sight', 'timpani': 'pedal-point', 'timpany': 'pedal-point', 'rudament': 'rudiment-trainer',
    'paradiddle': 'rudiment-trainer', 'scales': 'scale-trainer', 'scal': 'scale-trainer', 'trombone slide': 'slide-quest',
    'air hockey': 'neon-face-off', 'vocab': 'ancient-ninja-scrolls', 'fingering': 'button-masher', 'piano': 'keys-to-the-city',
    'long tones': 'sustain-speedway', 'tonguing': 'showtime-malfunction', 'ghost': 'ghost-notes', 'glockenspiel': 'chime-heist',
    'tuner': 'note-checker:tuner', 'metronome': 'note-checker:metronome', 'rhythm': 'rhythm-dojo',
  };
  for (const [q, id] of Object.entries(top)) expect((await first(page, q))[0], `"${q}"`).toBe(id);
  // a word that several games share finds all of them
  expect((await first(page, 'audition')).slice(0, 3).sort()).toEqual(['first-sight', 'rudiment-trainer', 'scale-trainer']);
  expect((await first(page, '2 players')).sort()).toEqual(['dojo-duel', 'neon-face-off']);
  // the zone names count: Audition Prep, No Instrument Needed, New Games
  expect(await first(page, 'audition prep')).toEqual(expect.arrayContaining(['first-sight', 'rudiment-trainer', 'scale-trainer']));
  expect(await first(page, 'new games')).toEqual(expect.arrayContaining(['first-sight', 'perfect-pitch', 'slide-quest', 'pedal-point']));
  // every typed word must match; nonsense finds nothing; nothing typed finds nothing (the panel lists all A–Z instead)
  expect(await first(page, 'timpani rhythm')).toEqual([]);
  expect(await first(page, 'xyzzy')).toEqual([]);
  expect(await first(page, '   ')).toEqual([]);
  // the tools only for their own words (not every "tuning" game's search)
  expect((await first(page, 'scales')).some(id => id.startsWith('note-checker'))).toBe(false);
  watch.check();
});

test('the SEARCH button: A–Z, typing, NEW badges, Enter opens the best match', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  await page.locator('#searchBtn').click();
  await expect(page.locator('#gameSearch')).toBeVisible();
  await expect(page.locator('#gsInput')).toBeFocused();
  await expect(page.locator('#searchBtn')).toHaveAttribute('aria-expanded', 'true');
  // nothing typed: the suggestions and every game, A–Z (Tune Up too)
  await expect(page.locator('#gsTry')).toBeVisible();
  const n = await page.evaluate(() => Arcade.GAMES.length);
  await expect(page.locator('#gsList .gs-item')).toHaveCount(n);
  const names = await page.locator('#gsList .gs-name').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  // a suggestion fills the field
  await page.locator('#gsTry .gs-chip', {hasText: 'Sight-reading'}).click();
  await expect(page.locator('#gsInput')).toHaveValue('Sight-reading');
  await expect(page.locator('#gsList .gs-item').first()).toHaveAttribute('data-game', 'first-sight');
  await expect(page.locator('#gsList .gs-item[data-game="first-sight"] .b-new')).toBeVisible();
  // typing: the list follows; no match says so
  await page.locator('#gsInput').fill('qqqq');
  await expect(page.locator('#gsList .gs-item')).toHaveCount(0);
  await expect(page.locator('#gsCount')).toContainText('No games match');
  await page.locator('#gsInput').fill('rudament');
  await expect(page.locator('#gsList .gs-item').first()).toHaveAttribute('data-game', 'rudiment-trainer');
  await expect(page.locator('#gsList .gs-item[data-game="rudiment-trainer"] .b-new')).toHaveCount(0);   // added 2026-10-04: not new
  // ↓ moves into the results, ↑ back to the field
  await page.locator('#gsInput').press('ArrowDown');
  await expect(page.locator('#gsList .gs-item').first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#gsInput')).toBeFocused();
  // Enter: the best match opens like a lobby card (the saved trumpet: straight into the game)
  await page.locator('#gsInput').fill('sight reading');
  await page.locator('#gsInput').press('Enter');
  await page.waitForURL(/first-sight\/index\.html/);
  watch.check();
});

test('"/" opens it in a zone and in ARCADE VIEW; Esc and ✕ close it; nothing pops up over it', async ({page}) => {
  const watch = await prepare(page, {store: device()});
  for (const hash of ['#zone=ear-training', '#all-games', '']) {
    await page.goto(floor(hash));
    await ready(page);
    const before = await page.evaluate(() => { const s = Arcade.Arcade.state(); return [s.view, s.zone]; });
    await page.locator('body').press('/');
    await expect(page.locator('#gameSearch'), hash).toBeVisible();
    await expect(page.locator('#gsInput')).toBeFocused();
    expect(await page.evaluate(() => Arcade.Lobby.queue.busy({views: 'any'}))).toBe('panel');   // the lobby queue waits
    await page.keyboard.press('Escape');
    await expect(page.locator('#gameSearch')).toBeHidden();
    await expect(page.locator('#searchBtn')).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => { const s = Arcade.Arcade.state(); return [s.view, s.zone]; }), `${hash}: Esc leaves the view where it was`).toEqual(before);
    await page.locator('#searchBtn').click();
    await page.locator('#gsClose').click();
    await expect(page.locator('#gameSearch')).toBeHidden();
    await expect(page.locator('#searchBtn')).toBeFocused();
  }
  watch.check();
});

test('a game found from ARCADE VIEW comes back to ARCADE VIEW; Tune Up\'s tools open on their tab', async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor('#all-games'));
  await ready(page);
  await page.locator('#searchBtn').click();
  await page.locator('#gsInput').fill('timpani');
  await page.locator('#gsList .gs-item[data-game="pedal-point"]').click();
  await page.waitForURL(/pedal-point\/index\.html/);
  await page.goto(floor('#pedal-point'));                      // the game's "← ARCADE"
  await expect.poll(async () => (await page.evaluate(() => Arcade.Arcade.state())).view).toBe('all');
  await expect(page.locator('#gameSearch')).toBeHidden();
  await page.locator('#searchBtn').click();
  await page.locator('#gsInput').fill('metronome');
  await page.locator('#gsList .gs-item[data-tool="metronome"]').click();
  await page.waitForURL(/note-checker\/index\.html\?(.*&)?tool=metronome/);
  watch.check();
});

test('NEW GAMES: the first sign while games are new, newest first; badges; gone once nothing is new', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  await expect(page.locator('#zones .zsign').first()).toHaveAttribute('data-zone', 'new-games');
  expect(await page.evaluate(() => Arcade.zoneGames('new-games').map(g => g.id))).toEqual(['first-sight', 'perfect-pitch', 'slide-quest', 'pedal-point']);
  // the zone opens like any other, with the NEW badge in the info
  await page.locator('.zsign[data-zone="new-games"]').click();
  await expect.poll(async () => (await page.evaluate(() => Arcade.Arcade.state())).zone).toBe('new-games');
  await expect(page.locator('#infoTags .b-new')).toBeVisible();
  // ARCADE VIEW's list: a badge on the new ones only; the Full Arcade skips the zone (each cabinet once)
  await page.goto(floor('#all-games'));
  await ready(page);
  await expect(page.locator('#allGrid .gcard[data-game="first-sight"] .b-new')).toBeVisible();
  await expect(page.locator('#allGrid .gcard .b-new')).toHaveCount(4);
  await expect(page.locator('#allGrid .gcard[data-game="first-sight"]')).toHaveAttribute('aria-label', /, new/);
  expect(await page.evaluate(() => Arcade.zonesOf(Arcade.GAMES.find(g => g.id === 'first-sight')).map(z => z.id))).not.toContain('new-games');
  // a month on: nothing new, no sign, no badges
  await page.goto(floor('#all-games', '2027-03-01'));
  await ready(page);
  await expect(page.locator('#allGrid .gcard .b-new')).toHaveCount(0);
  await page.goto(floor('', '2027-03-01'));
  await ready(page);
  await expect(page.locator('.zsign[data-zone="new-games"]')).toHaveCount(0);
  await page.goto(floor('#zone=new-games', '2027-03-01'));    // an old link to it: the lobby
  await ready(page);
  await expect.poll(async () => (await page.evaluate(() => Arcade.Arcade.state())).view).toBe('lobby');
  // a game is only new from its added day (never before)
  expect(await page.evaluate(() => [Arcade.isNewGame({added: '2027-03-01'}), Arcade.isNewGame({added: '2027-03-02'}),
    Arcade.isNewGame({added: '2027-01-30'}), Arcade.isNewGame({added: '2027-01-31'}), Arcade.isNewGame({})])).toEqual([true, false, false, true, false]);
  watch.check();
});

test('AUDITION PREP: Scale Trainer, First Sight and the Rudiment Trainer together, each still in its own zone', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device()});
  await page.goto(floor());
  await ready(page);
  await page.locator('.zsign[data-zone="audition-prep"]').click();
  await expect.poll(async () => (await page.evaluate(() => Arcade.Arcade.state())).zone).toBe('audition-prep');
  expect((await page.evaluate(() => Arcade.Arcade.state())).ring).toEqual(['scale-trainer', 'first-sight', 'rudiment-trainer']);
  expect(await page.evaluate(() => Arcade.zoneGames('technique-lab').map(g => g.id))).toEqual(expect.arrayContaining(['scale-trainer', 'rudiment-trainer']));
  expect(await page.evaluate(() => Arcade.zoneGames('note-reading').map(g => g.id))).toContain('first-sight');
  // the Full Arcade still shows each cabinet once, under its first zone
  await page.goto(floor('#full-arcade'));
  await ready(page);
  const ring = (await page.evaluate(() => Arcade.Arcade.state())).ring;
  expect(ring.length).toBe(new Set(ring).size);
  expect(ring.length).toBe(await page.evaluate(() => Arcade.floorGames().length));
  watch.check();
});
