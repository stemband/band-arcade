/* NETWORK: the arcade only ever talks to its own files and to the leaderboard address (shared/leaderboard-config.js).
   Every other test fails on any request to an outside host too (helpers.js prepare); here: the leaderboard screen
   draws the mocked scoreboard, a real (not ?demo) star sends exactly the allowed fields, 'play' goes once a day per
   game, and ?demo sends nothing. */
const {test, expect} = require('@playwright/test');
const {prepare, device, LB_URL, quickLeaderboard, settle} = require('./helpers');

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

  test("'play' goes once a day PER GAME, with only the allowed fields", async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    await page.goto('index.html');
    const plays = () => watch.posts.map(b => JSON.parse(b)).filter(b => b.type === 'play');
    const start = game => page.evaluate(g => { Arcade.store.noteActivity({game: g, play: true}); return Arcade.Leaderboard.flush(); }, game);
    await start('ghost-notes');
    await start('note-storm');                                   // two games on one day: two events
    await start('ghost-notes');                                  // the same game again: nothing more
    await expect.poll(() => plays().length).toBe(2);
    await page.waitForTimeout(800);
    expect(plays().map(b => b.game).sort()).toEqual(['ghost-notes', 'note-storm']);
    await page.evaluate(() => { const t = Arcade.store.today(); Arcade.store.today = () => new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1); });
    await start('ghost-notes');                                  // a new day: sent again
    await expect.poll(() => plays().length).toBe(3);
    expect(plays()[2]).toMatchObject({game: 'ghost-notes', type: 'play', value: 1});
    for (const body of watch.posts) expect(Object.keys(JSON.parse(body)).sort()).toEqual(ALLOWED_FIELDS);
    watch.check();
  });

  test("the old once-a-day 'day' field moves to plays = {day, games}", async ({page}) => {
    const store = withGrade(); store.gameData.leaderboard.day = '2026-01-05';
    const watch = await prepare(page, {store});
    await page.goto('index.html');
    const lb = await page.evaluate(() => Arcade.store.gameData('leaderboard'));
    expect(lb.day).toBeUndefined();
    expect(lb.plays).toEqual({day: '2026-01-05', games: []});
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

/* THE GRADE (the 7th-grade bug: students who earned stars but never chose a grade, or chose the wrong one, never showed
   up on their board). Stars, Endless scores and plays earned with no grade are HELD (gameData('leaderboard').held) and
   sent once a grade is chosen; the lobby asks for the grade after the first star; a changed grade sends one 'play' at
   once so the scoreboard (one grade per player: the newest event's) moves the whole week over. */
const noGrade = (extra = {}) => device('trumpet', Object.assign({avatarOffered: true, gameData: {leaderboard: {on: true}}}, extra));
const bodies = watch => watch.posts.map(b => JSON.parse(b));
/** earn stars: level 1 → 2 ★ then 3 ★, level 2 → 3 ★ (Ghost Notes, trumpet's key), an Endless score, a game start */
const earn = page => page.evaluate(() => {
  Arcade.store.setLevel('ghost-notes', 'bb', 1, {stars: 2, best: 80}, 2);
  Arcade.store.setLevel('ghost-notes', 'bb', 1, {stars: 3, best: 100}, 3);
  Arcade.store.setLevel('ghost-notes', 'bb', 2, {stars: 3, best: 100}, 3);
  Arcade.store.noteActivity({game: 'note-storm', play: true});
  Arcade.Leaderboard.endless('note-storm', 420);
});

test.describe('the grade', () => {
  test.skip(!LB_URL, 'the leaderboard is switched off (no address in shared/leaderboard-config.js)');
  test.describe.configure({timeout: 60_000});                          // a hang fails fast (the suite's default is 90 s)
  test.beforeEach(async ({page}) => { await quickLeaderboard(page); });

  test('with no grade, stars are HELD (nothing sent); choosing 7 sends them all, summed per level (≤ 3), only the allowed fields', async ({page}) => {
    const watch = await prepare(page, {store: noGrade()});
    await page.goto('index.html');
    await earn(page);
    await settle(page, 800);
    expect(watch.posts).toEqual([]);
    const held = await page.evaluate(() => Arcade.Leaderboard.held());
    expect(Object.values(held.stars).map(e => [e.level, e.value]).sort()).toEqual([[1, 3], [2, 3]]);
    expect(held.endless).toEqual({'note-storm': 420});
    expect(held.plays.games).toEqual(['note-storm']);
    await page.evaluate(() => { Arcade.Leaderboard.setGrade(7); return Arcade.Leaderboard.flush(); });
    await expect.poll(() => watch.posts.length).toBe(4);
    const b = bodies(watch);
    expect(b.every(x => x.grade === 7)).toBe(true);
    expect(b.filter(x => x.type === 'stars').map(x => [x.level, x.value]).sort()).toEqual([[1, 3], [2, 3]]);
    expect(b.find(x => x.type === 'endless')).toMatchObject({game: 'note-storm', value: 420});
    expect(b.find(x => x.type === 'play')).toMatchObject({game: 'note-storm', value: 1});
    for (const x of b) expect(Object.keys(x).sort()).toEqual(ALLOWED_FIELDS);
    expect(await page.evaluate(() => Arcade.Leaderboard.heldCount())).toBe(0);
    watch.check();
  });

  test('a new week drops what was held; the switch OFF drops it and sends nothing', async ({page}) => {
    const watch = await prepare(page, {store: noGrade()});
    await page.goto('index.html');
    await earn(page);
    expect(await page.evaluate(() => Arcade.Leaderboard.heldCount())).toBeGreaterThan(0);
    // a new week (the saved week is an old one): held is dropped
    await page.evaluate(() => { const d = Arcade.store.gameData('leaderboard'); d.week = '2026-01-05'; d.held.week = '2026-01-05'; Arcade.store.saveGameData('leaderboard'); Arcade.Leaderboard.mine(); });
    expect(await page.evaluate(() => Arcade.Leaderboard.heldCount())).toBe(0);
    // held again, then the switch OFF: dropped, and choosing a grade later sends nothing of it
    await earn(page);
    await page.evaluate(() => Arcade.store.setLevel('ghost-notes', 'bb', 3, {stars: 1, best: 50}, 1));
    expect(await page.evaluate(() => Arcade.Leaderboard.heldCount())).toBeGreaterThan(0);
    await page.evaluate(() => Arcade.Leaderboard.setOn(false));
    expect(await page.evaluate(() => Arcade.Leaderboard.heldCount())).toBe(0);
    await page.evaluate(() => { Arcade.Leaderboard.setGrade(7); return Arcade.Leaderboard.flush(); });
    await page.evaluate(() => { Arcade.Leaderboard.setOn(true); return Arcade.Leaderboard.flush(); });
    await settle(page, 1000);
    expect(watch.posts).toEqual([]);
    watch.check();
  });

  test('the lobby asks after the first star; "Not now" waits 3 days; UNDO leaves no grade and sends nothing; a choice sends the held stars', async ({page}) => {
    const watch = await prepare(page, {store: noGrade()});
    await page.goto('index.html');
    const card = page.locator('#gradeAsk .gq-card');
    await settle(page, 600);
    await expect(card).toHaveCount(0);                                  // no star yet: no question
    await earn(page);
    await page.evaluate(() => Arcade.LeaderboardScreen.askGrade());
    await expect(card).toBeVisible();
    await expect(card).toContainText('What grade are you in?');
    // Not now: 3 days
    await page.locator('.gq-later').click();
    await expect(card).toHaveCount(0);
    const after = await page.evaluate(() => Arcade.store.gameData('leaderboard').askAfter - Date.now());
    expect(after).toBeGreaterThan(2.9 * 86400000);
    expect(after).toBeLessThan(3.1 * 86400000);
    await page.evaluate(() => Arcade.LeaderboardScreen.askGrade());
    await expect(card).toHaveCount(0);
    await page.evaluate(() => { Arcade.store.gameData('leaderboard').askAfter = Date.now() - 1000; Arcade.LeaderboardScreen.askGrade(); });
    await expect(card).toBeVisible();
    // 7, then UNDO: no grade, nothing sent, the question again
    await page.locator('.gq-g[data-g="7"]').click();
    await expect(page.locator('#gradeAsk')).toContainText('7th grade ✓. You can change it on the Leaderboard.');
    await page.locator('.gq-undo').click();
    await settle(page, 5500);
    expect(await page.evaluate(() => Arcade.Leaderboard.settings().grade)).toBe(null);
    expect(watch.posts).toEqual([]);
    await expect(page.locator('.gq-g[data-g="7"]')).toBeVisible();
    // 7 for real: after 5 s the grade is set and the held stars go, with grade 7
    await page.locator('.gq-g[data-g="7"]').click();
    await settle(page, 1000);
    expect(await page.evaluate(() => Arcade.Leaderboard.settings().grade)).toBe(null);   // (still undoable)
    await settle(page, 4500);
    await expect.poll(() => page.evaluate(() => Arcade.Leaderboard.settings().grade)).toBe(7);
    await expect.poll(() => watch.posts.length).toBeGreaterThan(0);
    expect(bodies(watch).every(x => x.grade === 7)).toBe(true);
    await expect(card).toHaveCount(0);
    // the grade shows: the leaderboard screen ("Grade 7 · you") and the avatar badge's menu
    await page.locator('#lbBtn').click();
    await expect(page.locator('.lb-gs.on')).toHaveText('Grade 7 · you');
    await page.keyboard.press('Escape');
    await page.locator('.avb-btn').first().click();
    await expect(page.locator('.avb-lb-t').first()).toHaveText('Leaderboard: Grade 7 · change');
    watch.check();
  });

  test('changing the grade 6 → 7 sends one play at once, with grade 7 (not the daily record)', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {leaderboard: {grade: 6, on: true}}})});
    await page.goto('index.html');
    await settle(page, 500);
    expect(watch.posts).toEqual([]);
    await page.evaluate(() => { Arcade.Leaderboard.setGrade(7); return Arcade.Leaderboard.flush(); });
    await expect.poll(() => watch.posts.length).toBe(1);
    expect(bodies(watch)[0]).toMatchObject({type: 'play', grade: 7, game: 'arcade', value: 1});
    expect(await page.evaluate(() => Arcade.store.gameData('leaderboard').plays || null)).toBe(null);   // the daily record untouched
    // the same grade again: nothing
    await page.evaluate(() => { Arcade.Leaderboard.setGrade(7); return Arcade.Leaderboard.flush(); });
    await settle(page, 600);
    expect(watch.posts).toHaveLength(1);
    watch.check();
  });

  for (const g of [6, 7, 8]) {
    test(`grade ${g} end to end: a fresh device picks ${g} on the leaderboard, earns stars, every event says grade ${g}`, async ({page}) => {
      const watch = await prepare(page, {store: noGrade()});
      await page.goto('index.html');
      await page.locator('#lbBtn').click();
      await page.locator(`.lb-g[data-g="${g}"]`).click();
      await expect(page.locator('.lb-gs.on')).toHaveText(`Grade ${g} · you`);
      await page.keyboard.press('Escape');
      await earn(page);
      await page.evaluate(() => Arcade.Leaderboard.flush());
      await expect.poll(() => watch.posts.length).toBeGreaterThanOrEqual(4);
      const b = bodies(watch);
      expect(b.map(x => x.grade)).toEqual(b.map(() => g));
      expect(b.filter(x => x.type === 'stars').reduce((n, x) => n + x.value, 0)).toBe(6);
      for (const x of b) expect(Object.keys(x).sort()).toEqual(ALLOWED_FIELDS);
      watch.check();
    });
  }

  test('pacing: no more than 100 sends in an hour; the rest wait in the queue', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {leaderboard: {grade: 7, on: true}}})});
    await page.goto('index.html');
    await page.evaluate(() => localStorage.setItem('bandarcade.lb-sent', JSON.stringify(Array.from({length: 98}, () => Date.now() - 60000))));
    await page.evaluate(() => { for (let lv = 1; lv <= 5; lv++) Arcade.store.setLevel('ghost-notes', 'bb', lv, {stars: 1, best: 50}, 1); });
    const r = await page.evaluate(() => Arcade.Leaderboard.flush());
    await settle(page, 800);
    expect(watch.posts).toHaveLength(2);
    expect(await page.evaluate(() => Arcade.Leaderboard.queue().length)).toBe(3);
    expect(r && r.why || (await page.evaluate(() => Arcade.Leaderboard.flush())).why).toMatch(/pacing/);
    watch.check();
  });

  test('?teacher shows this device\'s state and SEND NOW; "Not showing up?" only when stars are missing from the board', async ({page}) => {
    const lb = {grade: 6, on: true, pid: 'zzzzzz' + 'q'.repeat(18)};
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {leaderboard: lb}})});
    await page.goto('index.html?teacher');
    await settle(page, 3500);                                          // (the page's own start-up flush has run)
    await page.evaluate(() => { const d = Arcade.store.gameData('leaderboard'); d.week = Arcade.Leaderboard.weekKey(); d.weekStars = 12; Arcade.store.saveGameData('leaderboard'); });
    await page.locator('#lbBtn').click();
    await expect(page.locator('.lb-row').first()).toBeVisible();
    // 12 stars, not on the (3-row) board, nothing waiting: ask Mr. Graham
    await expect(page.locator('.lb-missing')).toHaveText('Not showing up? Ask Mr. Graham to check.');
    const t = page.locator('.lb-dev');
    await expect(t).toContainText('Grade: 6');
    await expect(t).toContainText('Show me on the leaderboard: on');
    await expect(t).toContainText('ID: zzzzzz');
    await expect(t).toContainText('0 in the queue, 0 held');
    await expect(t).toContainText('Stars this week on this device: 12');
    await page.locator('.lb-send-now').click();
    await expect(page.locator('.lb-send-res')).toContainText('Nothing was waiting');
    // something waiting: "Still sending…"
    await page.evaluate(() => { const d = Arcade.store.gameData('leaderboard'); d.queue = [{pid: d.pid, grade: 6, name: [1, 1, 1], game: 'ghost-notes', type: 'stars', value: 1, level: 1}]; Arcade.store.saveGameData('leaderboard'); });
    await page.locator('.lb-gs[data-g="7"]').click(); await page.locator('.lb-gs[data-g="6"]').click();
    await expect(page.locator('.lb-missing')).toHaveText('Your stars this week: 12. Still sending…');
    await page.locator('.lb-send-now').click();
    await expect(page.locator('.lb-send-res')).toContainText('Sent 1');
    expect(watch.posts).toHaveLength(1);
    // on the board (the mock's TESTMK row): no line
    await page.evaluate(() => { Arcade.store.gameData('leaderboard').id = 'TESTMK'; });
    await page.locator('.lb-gs[data-g="7"]').click(); await page.locator('.lb-gs[data-g="6"]').click();
    await expect(page.locator('.lb-row.me')).toHaveCount(1);
    await expect(page.locator('.lb-missing')).toHaveCount(0);
    watch.check();
  });

  test('no stars this week: no "Not showing up?" line', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {leaderboard: {grade: 6, on: true}}})});
    await page.goto('index.html');
    await page.locator('#lbBtn').click();
    await expect(page.locator('.lb-row').first()).toBeVisible();
    await expect(page.locator('.lb-missing')).toHaveCount(0);
    watch.check();
  });
});
