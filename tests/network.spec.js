/* NETWORK: the arcade only ever talks to its own files and to the leaderboard address (shared/leaderboard-config.js).
   Every other test fails on any request to an outside host too (helpers.js prepare); here: the leaderboard screen
   draws the mocked scoreboard, a real (not ?demo) star sends exactly the allowed fields, and ?demo sends nothing. */
const {test, expect} = require('@playwright/test');
const {prepare, device, LB_URL} = require('./helpers');

const ALLOWED_FIELDS = ['game', 'grade', 'level', 'name', 'pid', 'type', 'value'];
const withGrade = () => device('trumpet', {gameData: {leaderboard: {grade: 6, on: true}}});

test.describe('network', () => {
  test.skip(!LB_URL, 'the leaderboard is switched off (no address in shared/leaderboard-config.js)');

  test('the leaderboard screen shows the (mocked) scoreboard', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('index.html');
    await page.locator('#lbBtn').click();
    await page.locator('.lb-g').first().click();
    await expect(page.getByText('42', {exact: false}).first()).toBeVisible();
    await expect(page.getByText('Resets every Monday', {exact: false}).first()).toBeVisible();
    watch.check();
  });

  test('a new star sends only the allowed fields (not in ?demo)', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    await page.goto('index.html');
    await page.evaluate(() => { Arcade.store.setLevel('ghost-notes', 'bb', 1, {stars: 2, best: 100}, 2); return Arcade.Leaderboard.flush(); });
    await expect.poll(() => watch.posts.length).toBeGreaterThan(0);
    for (const body of watch.posts) expect(Object.keys(JSON.parse(body)).sort()).toEqual(ALLOWED_FIELDS);
    watch.check();
  });

  test('?demo sends nothing to the leaderboard', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    await page.goto('ghost-notes/index.html?demo&nostart');
    await page.evaluate(() => { Arcade.store.setLevel('ghost-notes', 'bb', 1, {stars: 3, best: 100}, 3); Arcade.store.addEndless && Arcade.store.addEndless('note-storm', 'trumpet', 'first5-random', {score: 999, notes: 9, speed: 1, combo: 3}); return Arcade.Leaderboard.flush(); });
    await page.waitForTimeout(1500);
    expect(watch.posts, 'leaderboard POSTs in ?demo').toEqual([]);
    watch.check();
  });
});
