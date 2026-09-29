/* THE LEADERBOARD ON A SLOW OR UNREACHABLE SCOREBOARD (shared/leaderboard.js + leaderboard-screen.js). A cold Apps
   Script can take 20 s+ to answer, so:
   - the arcade wakes it with one quiet ?action=status when it opens (not again within 10 minutes);
   - every request is a CORS "simple request" (GET: no headers, no preflight; POST: text/plain only);
   - while a board loads: "Loading the leaderboard…" with the UI kit's spinner, then the board;
   - a read that times out is tried once more, then the grade's LAST GOOD BOARD (localStorage) is shown with
     "Couldn't refresh — showing the board from …"; with nothing saved: "Leaderboard is taking a break";
   - ?teacher says why the last request failed and how long it took.
   Each test puts its own scoreboard in front of helpers.js's mock (Playwright runs the newest route first). */
const {test, expect} = require('@playwright/test');
const {prepare, device, boardFor, LB_URL, LB_HOSTS} = require('./helpers');

const withGrade = () => device('trumpet', {gameData: {leaderboard: {grade: 6, on: true}}});
const isLB = url => LB_HOSTS.test(new URL(url).hostname);

/** the scoreboard for this test: mode(req) → 'ok' | 'slow' | 'hang' (never answers); every request is logged */
async function scoreboard(page, mode) {
  const log = [];
  await page.route(isLB, async route => {
    const req = route.request(), u = new URL(req.url());
    log.push({method: req.method(), action: u.searchParams.get('action'), headers: await req.allHeaders()});
    const m = typeof mode === 'function' ? mode(req) : mode;
    if (m === 'hang') return;                                           // a scoreboard that never answers
    if (m === 'slow') await new Promise(r => setTimeout(r, 2500));
    if (req.method() === 'POST') return route.fulfill({status: 200, contentType: 'application/json', body: '{"ok":true}'}).catch(() => {});
    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(boardFor(u.searchParams))}).catch(() => {});
  });
  return log;
}
const boards = log => log.filter(r => r.action === 'board').length;
async function openBoard(page) {
  await page.locator('#lbBtn').click();
  await expect(page.locator('#lbView')).toBeVisible();
}

test.describe('leaderboard on a slow scoreboard', () => {
  test.skip(!LB_URL, 'the leaderboard is switched off (no address in shared/leaderboard-config.js)');

  test('warm-up: one quiet status request as the arcade opens (not again within 10 minutes); no preflights', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    const log = await scoreboard(page, 'ok');
    await page.goto('index.html');
    await expect.poll(() => log.filter(r => r.action === 'status').length).toBe(1);
    // the lobby again (a zone and back): still within 10 minutes, so no second wake-up
    await page.evaluate(() => { location.hash = '#all-games'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = ''; });
    await page.waitForTimeout(800);
    expect(log.filter(r => r.action === 'status').length).toBe(1);
    // 10+ minutes later, the lobby showing again wakes it once more
    await page.evaluate(() => { sessionStorage.setItem('bandarcade.lb-warm', String(Date.now() - 11 * 60000)); location.hash = '#all-games'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = ''; });
    await expect.poll(() => log.filter(r => r.action === 'status').length).toBe(2);
    // a board read too: every request is a simple one (GET with no content-type or cache headers; never OPTIONS)
    await openBoard(page);
    await expect(page.locator('.lb-row').first()).toBeVisible();
    expect(log.some(r => r.method === 'OPTIONS')).toBe(false);
    for (const r of log.filter(x => x.method === 'GET')) {
      expect(Object.keys(r.headers).filter(h => /^(content-type|cache-control|pragma|x-)/i.test(h)), `${r.action} request headers`).toEqual([]);
    }
    watch.check();
  });

  test('a slow scoreboard: "Loading the leaderboard…" with the spinner, then the board', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    const log = await scoreboard(page, req => new URL(req.url()).searchParams.get('action') === 'board' ? 'slow' : 'ok');
    await page.goto('index.html');
    await openBoard(page);
    const loading = page.locator('.lb-loading');
    await expect(loading).toBeVisible();
    await expect(loading).toHaveText('Loading the leaderboard…');
    await expect(loading).toHaveClass(/ui-msg/);
    await expect(loading).toHaveClass(/loading/);                      // the UI kit's spinner
    await expect(page.locator('.lb-break')).toHaveCount(0);            // never the break message while it loads
    await expect(page.locator('.lb-row').first()).toContainText('42');
    await expect(loading).toHaveCount(0);
    expect(boards(log)).toBe(1);
    watch.check();
  });

  test('a read that times out is tried once more, then the last good board shows (with ?teacher: why)', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    let hang = false;
    const log = await scoreboard(page, req => hang && new URL(req.url()).searchParams.get('action') === 'board' ? 'hang' : 'ok');
    await page.goto('index.html?teacher');
    // a good read first: it's kept on the device
    await openBoard(page);
    await expect(page.locator('.lb-row').first()).toContainText('42');
    await expect(page.locator('.lb-diag')).toContainText('OK in');
    expect(await page.evaluate(() => !!JSON.parse(localStorage.getItem('bandarcade.lb-last'))[6])).toBe(true);
    // now the scoreboard stops answering (short time limits for the test)
    hang = true;
    await page.evaluate(() => { Arcade.Leaderboard.TIMEOUTS.read = 700; sessionStorage.removeItem('bandarcade.lb-cache'); });
    const before = boards(log);
    await page.locator('.lb-ref').click();                               // Refresh
    await expect(page.locator('.lb-stale')).toBeVisible({timeout: 10_000});
    await expect(page.locator('.lb-stale')).toHaveText(/^Couldn't refresh — showing the board from (just now|a minute ago|\d+ minutes ago)$/);
    await expect(page.locator('.lb-row').first()).toContainText('42');    // the saved board, not the break message
    await expect(page.locator('.lb-break')).toHaveCount(0);
    expect(boards(log) - before).toBe(2);                                // the time-out, then the one retry
    await expect(page.locator('.lb-diag')).toHaveText(/^Last request failed: timeout after 0\.7 s \(took \d+\.\d s, tried twice\)\.$/);
    watch.check();
  });

  test('nothing saved and no answer: loading, one retry, then "Leaderboard is taking a break"', async ({page}) => {
    const watch = await prepare(page, {store: withGrade()});
    const log = await scoreboard(page, req => new URL(req.url()).searchParams.get('action') === 'board' ? 'hang' : 'ok');
    await page.goto('index.html');
    await page.evaluate(() => { Arcade.Leaderboard.TIMEOUTS.read = 1200; localStorage.removeItem('bandarcade.lb-last'); });
    await openBoard(page);
    await expect(page.locator('.lb-loading')).toBeVisible();
    await expect(page.locator('.lb-break')).toHaveCount(0);
    await expect.poll(() => boards(log), {timeout: 5000}).toBe(2);        // still loading while it tries again
    await expect(page.locator('.lb-loading')).toBeVisible();
    await expect(page.locator('.lb-break')).toHaveText('Leaderboard is taking a break. Your progress is still saved!', {timeout: 5000});
    expect(boards(log)).toBe(2);
    expect(await page.evaluate(() => Arcade.LeaderboardScreen.state().why)).toBe('timeout');
    watch.check();
  });
});
