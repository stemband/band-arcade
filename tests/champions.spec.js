/* WEEKLY CHAMPIONS (shared/leaderboard.js WEEKLY CHAMPIONS, champion-lobby.js, leaderboard-screen.js's strip, the player
   card's trophy shelf). The scoreboard (helpers.js's mock) gets a route in front that answers ?action=champions with
   this test's champions and logs every request. This device's id on the boards = its pid's first 6 characters. */
const {test, expect} = require('@playwright/test');
const {prepare, device, boardFor, lastWeekKey, offscreen, LB_URL, LB_HOSTS} = require('./helpers');

const PID = 'abc123' + 'x'.repeat(18), ME = 'abc123';
const WEEK = lastWeekKey();
const isLB = url => LB_HOSTS.test(new URL(url).hostname);
const lb = (extra = {}) => Object.assign({grade: 7, on: true, pid: PID}, extra);
const store = (lbData = lb(), extra = {}) => device('trumpet', Object.assign({avatarOffered: true, gameData: {leaderboard: lbData}}, extra));
const e = (id, value, name = [1, 2, 3]) => ({id, name, value});
const champs = (o = {}) => Object.assign({week: WEEK, stars: [], improved: [], streak: [], endless: {}}, o);

/** the scoreboard for this test: champions(req, n) → the champions object, or a number = an HTTP error; every request is logged */
async function scoreboard(page, champions, {board} = {}) {
  const log = [];
  let n = 0;
  await page.route(isLB, async route => {
    const req = route.request(), u = new URL(req.url());
    log.push({method: req.method(), action: u.searchParams.get('action'), params: [...u.searchParams.keys()].sort(), body: req.postData()});
    if (u.searchParams.get('action') === 'champions') {
      const c = typeof champions === 'function' ? champions(req, n++) : champions;
      if (typeof c === 'number') return route.fulfill({status: c, body: 'oops'});
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, enabled: true, grade: +u.searchParams.get('grade'), champions: c})});
    }
    if (u.searchParams.get('action') === 'board' && board) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign(boardFor(u.searchParams), {champions: board}))});
    return route.fallback();
  });
  return log;
}
const champReqs = log => log.filter(r => r.action === 'champions');
const balance = page => page.evaluate(() => Arcade.Tokens.balance());
const lbData = page => page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1')).gameData.leaderboard);
const card = page => page.locator('.ch-ov');
async function claim(page) {
  await page.locator('.ch-claim').click();
  await expect(card(page)).toHaveCount(0);
  const ok = page.locator('.sk-catchup [data-close]');             // the UNLOCKED! card that may follow
  if (await ok.isVisible({timeout: 1200}).catch(() => false)) await ok.click();
}
/** the lobby shows again (ALL GAMES and back) */
async function lobbyAgain(page) {
  await page.evaluate(() => { location.hash = '#all-games'; });
  await page.waitForTimeout(250);
  await page.evaluate(() => { location.hash = ''; });
}
/** the weekly check has finished (good or not) */
const checked = page => expect.poll(() => page.evaluate(() => !!Arcade.Leaderboard.champState().last), {timeout: 8000}).toBe(true);

test.describe('weekly champions', () => {
  test.skip(!LB_URL, 'the leaderboard is switched off (no address in shared/leaderboard-config.js)');

  test('1st on MOST STARS: the card, CLAIM pays once, the plate unlocks; a reload shows no second card', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    const log = await scoreboard(page, champs({stars: [e(ME, 14), e('ZZZZZZ', 14)], streak: [e('QQQQQQ', 6)]}));   // (tied: still a full championship)
    await page.goto('index.html');
    await expect(card(page)).toBeVisible();
    const st = await page.evaluate(() => Arcade.ChampionLobby.state());
    expect(st.lines).toHaveLength(1);
    expect(st.lines[0]).toContain('1st in 7th grade for MOST STARS');
    expect(st.lines[0]).not.toMatch(/tie/i);
    expect(st.id).toBe(ME);
    await expect(page.locator('.ch-claim')).toBeFocused();
    await expect(page.locator('.ch-name')).toHaveText(await page.evaluate(() => Arcade.Avatar.nameOf(Arcade.Avatar.get())));
    await expect(page.locator('.ch-n')).toHaveText('100');           // (counted up)
    await claim(page);
    expect(await balance(page)).toBe(100);
    expect(await page.evaluate(() => Arcade.store.ownedItems['plate:champion'])).toBe(true);
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('plate', 'champion'))).toBe(true);
    expect((await lbData(page)).awards[WEEK].stars).toEqual({value: 14, claimed: true});
    // a reload: checked this week, already claimed: nothing more
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(card(page)).toHaveCount(0);
    expect(await balance(page)).toBe(100);
    expect(champReqs(log)).toHaveLength(1);
    watch.check();
  });

  test('two tabs with the same award: paid once', async ({page, context}) => {
    const s = store(lb({champCheckedWeek: WEEK, awards: {[WEEK]: {improved: {value: 9, claimed: false}}}}));
    const watch = await prepare(page, {store: s});
    await scoreboard(page, champs());
    await page.goto('index.html');
    const page2 = await context.newPage();
    await prepare(page2, {store: s});
    await scoreboard(page2, champs());
    await page2.goto('index.html');
    await expect(card(page)).toBeVisible();
    await expect(card(page2)).toBeVisible();
    await claim(page);
    await claim(page2);
    expect(await balance(page2)).toBe(75);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1')).gameData['arcade-quest'].save.tokens)).toBe(75);
    watch.check();
  });

  test('several awards: stars AND streak = one card, two lines, both paid; an Endless one names its game', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await scoreboard(page, champs({stars: [e(ME, 20)], streak: [e(ME, 5)], endless: {'note-ninja': [e(ME, 2340)], 'note-storm': [e('OTHER1', 99)]}}));
    await page.goto('index.html');
    await expect(card(page)).toBeVisible();
    const lines = (await page.evaluate(() => Arcade.ChampionLobby.state())).lines;
    expect(lines).toHaveLength(3);
    expect(lines.some(l => /MOST STARS/.test(l))).toBe(true);
    expect(lines.some(l => /PRACTICE STREAK \(5 days\)/.test(l))).toBe(true);
    expect(lines.some(l => /Note Ninja Endless \(2,340\)/.test(l))).toBe(true);
    await claim(page);
    expect(await balance(page)).toBe(100 + 75 + 50);
    watch.check();
  });

  test('not this device: a different id, or empty champions, pays nothing', async ({page}) => {
    for (const c of [champs({stars: [e('OTHER1', 30)], endless: {'note-ninja': [e('OTHER2', 10)]}}), champs()]) {
      await page.context().clearCookies();
      const watch = await prepare(page, {store: store()});
      await scoreboard(page, c);
      await page.goto('index.html');
      await checked(page);
      await page.waitForTimeout(1200);
      await expect(card(page)).toHaveCount(0);
      expect(await balance(page)).toBe(0);
      const d = await lbData(page);
      expect(d.champCheckedWeek).toBe(WEEK);
      expect(d.awards || {}).toEqual({});
      watch.check();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.unrouteAll({behavior: 'ignoreErrors'});
    }
  });

  test('the request: a GET with only action + grade; none with the switch off, no grade, no address or ?demo', async ({page}) => {
    // sends: only action and grade, no body
    let watch = await prepare(page, {store: store()});
    let log = await scoreboard(page, champs());
    await page.goto('index.html');
    await expect.poll(() => champReqs(log).length).toBe(1);
    expect(champReqs(log)[0]).toMatchObject({method: 'GET', params: ['action', 'grade'], body: null});
    watch.check();
    // never: the switch off / no grade / ?demo / no address
    const cases = [
      {name: 'switch off', s: store(lb({on: false})), url: 'index.html'},
      {name: 'no grade', s: store(lb({grade: undefined})), url: 'index.html'},
      {name: '?demo', s: store(), url: 'index.html?demo&nostart'},
      {name: 'no address', s: store(), url: 'index.html', noAddress: true},
    ];
    for (const c of cases) {
      const p = await page.context().newPage();
      watch = await prepare(p, {store: c.s});
      log = await scoreboard(p, champs({stars: [e(ME, 3)]}));
      if (c.noAddress) await p.route('**/shared/leaderboard-config.js*', r => r.fulfill({contentType: 'text/javascript', body: "window.Arcade = window.Arcade || {}; window.Arcade.LEADERBOARD_URL = '';"}));
      await p.goto(c.url);
      await p.waitForTimeout(2500);
      expect(champReqs(log), c.name).toEqual([]);
      await expect(card(p), c.name).toHaveCount(0);
      watch.check(c.name);
      await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await p.close();
    }
  });

  test('a failed check is tried again at a later lobby showing (10 minutes on); a good one is not repeated that week', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    const log = await scoreboard(page, (req, n) => (n === 0 ? 500 : champs()));
    await page.goto('index.html');
    await expect.poll(() => champReqs(log).length).toBe(1);
    await checked(page);
    expect((await lbData(page)).champLast.ok).toBe(false);
    expect((await lbData(page)).champCheckedWeek).toBeUndefined();
    // the lobby again within 10 minutes: no new request
    await lobbyAgain(page);
    await page.waitForTimeout(2000);
    expect(champReqs(log)).toHaveLength(1);
    // 10+ minutes later: tried again, and it works
    await page.evaluate(() => sessionStorage.setItem('bandarcade.lb-champ', String(Date.now() - 11 * 60000)));
    await lobbyAgain(page);
    await expect.poll(() => champReqs(log).length).toBe(2);
    await expect.poll(async () => (await lbData(page)).champCheckedWeek).toBe(WEEK);
    // checked this week: not again, even 10+ minutes later
    await page.evaluate(() => sessionStorage.setItem('bandarcade.lb-champ', String(Date.now() - 11 * 60000)));
    await lobbyAgain(page);
    await page.waitForTimeout(2000);
    expect(champReqs(log)).toHaveLength(2);
    watch.check();
  });

  test('a Backup Code restore keeps the awards: no second payment', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await scoreboard(page, champs({stars: [e(ME, 14)]}));
    await page.goto('index.html');
    await expect(card(page)).toBeVisible();
    await claim(page);
    expect(await balance(page)).toBe(100);
    const code = await page.evaluate(() => Arcade.Backup.fullEncode());
    // a new device: restore the code there
    await page.evaluate(async c => {
      localStorage.clear(); sessionStorage.setItem('bandarcade.visit', '1');
      const r = await Arcade.Backup.fullDecode(c);
      Arcade.store.importAll(r.data);
    }, code);
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(card(page)).toHaveCount(0);
    expect(await balance(page)).toBe(100);
    expect((await lbData(page)).awards[WEEK].stars.claimed).toBe(true);
    watch.check();
  });

  test('the leaderboard screen: LAST WEEK\'S CHAMPIONS plaques (names, YOU) and a 🏆 by last week\'s champions', async ({page}) => {
    const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK}))});
    await scoreboard(page, champs(), {board: champs({stars: [e(ME, 14, [3, 5, 7])], streak: [e('BBBBBB', 6, [2, 3, 4])], endless: {'note-ninja': [e('CCCCCC', 2340, [4, 4, 4])]}})});
    await page.goto('index.html');
    await page.locator('#lbBtn').click();
    await page.locator('.lb-gs[data-g="7"]').click().catch(() => {});
    await expect(page.locator('.lb-plaque').first()).toBeVisible();
    const st = await page.evaluate(() => Arcade.LeaderboardScreen.state());
    const names = await page.evaluate(() => [[3, 5, 7], [2, 3, 4], [4, 4, 4]].map(n => Arcade.Avatar.nameFromNumbers(n)));
    expect(st.plaques).toHaveLength(3);
    expect(st.plaques[0].text).toContain(names[0]);
    expect(st.plaques[0].me).toBe(true);
    expect(st.plaques[0].text).toContain('YOU');
    expect(st.plaques[1].text).toContain(names[1]);
    expect(st.plaques[2].text).toContain('Note Ninja Endless');
    expect(st.plaques[2].text).toContain(names[2]);
    // this week's stars board has BBBBBB (2nd): last week's streak champion, so a 🏆
    expect(st.cups).toHaveLength(1);
    expect(st.cups[0]).toContain(names[1]);
    // no champions at all: no strip
    watch.check();
  });

  test('no champions at all: no strip', async ({page}) => {
    const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK}))});
    await scoreboard(page, champs(), {board: champs()});
    await page.goto('index.html');
    await page.locator('#lbBtn').click();
    await expect(page.locator('.lb-row').first()).toBeVisible();
    await expect(page.locator('.lb-champs')).toHaveCount(0);
    watch.check();
  });

  test('the card waits: PRESS START, then Choose Your Instrument and its Create Your Player offer', async ({page}) => {
    const s = store(lb({champCheckedWeek: WEEK, awards: {[WEEK]: {stars: {value: 9, claimed: false}}}}), {avatarOffered: false});
    const watch = await prepare(page, {store: s, visit: false});
    await scoreboard(page, champs());
    await page.goto('index.html');
    await expect(page.locator('#pressStart')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(card(page)).toHaveCount(0);
    await page.keyboard.press('Enter');                                // PRESS START → Choose Your Instrument (pick mode)
    await expect(page.locator('body.in-select')).toHaveCount(1);
    await page.waitForTimeout(1500);
    await expect(card(page)).toHaveCount(0);
    await expect(page.getByText('Maybe later')).toBeVisible();        // "Create your player?" over it
    await page.getByText('Maybe later').click();
    await page.waitForTimeout(800);
    await expect(card(page)).toHaveCount(0);
    await page.locator('#selectBtn').click();                          // → the lobby: now the card
    await expect(page.locator('body.in-select')).toHaveCount(0);
    await expect(card(page)).toBeVisible();
    watch.check();
  });

  test('the card waits for an open panel (Settings)', async ({page}) => {
    const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK}))});
    await scoreboard(page, champs());
    await page.goto('index.html');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      Arcade.UI.settings.open();
      const d = Arcade.store.gameData('leaderboard'); d.awards = {[Arcade.Leaderboard.lastWeekKey()]: {stars: {value: 9, claimed: false}}};
      Arcade.store.saveGameData('leaderboard');
      dispatchEvent(new CustomEvent('arcade:champion'));
    });
    await page.waitForTimeout(2000);
    await expect(card(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(card(page)).toBeVisible();
    watch.check();
  });

  for (const [name, size] of [['phone', {width: 390, height: 844}], ['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`the card fits on a ${name}`, async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK, awards: {[WEEK]: {stars: {value: 14, claimed: false}, streak: {value: 5, claimed: false}, 'endless:note-ninja': {value: 2340, claimed: false}}}}))});
      await scoreboard(page, champs());
      await page.goto('index.html');
      await expect(card(page)).toBeVisible();
      expect(await offscreen(page)).toEqual([]);
      const box = await page.locator('.ch-pan').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
      await page.locator('.ch-claim').scrollIntoViewIfNeeded();
      await expect(page.locator('.ch-claim')).toBeInViewport();
      watch.check();
    });
  }

  test('reduced motion: no confetti, the tokens shown at once', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK, awards: {[WEEK]: {stars: {value: 14, claimed: false}}}}))});
    await scoreboard(page, champs());
    await page.goto('index.html');
    await expect(card(page)).toBeVisible();
    const st = await page.evaluate(() => Arcade.ChampionLobby.state());
    expect(st.confetti).toBe(false);
    expect(st.tokens).toBe(100);
    watch.check();
  });

  test('the 5th championship unlocks the GOLD TROPHY; the trophy shelf on the player card lists them', async ({page}) => {
    const old = {'2026-01-05': {stars: {value: 10, claimed: true}}, '2026-01-12': {streak: {value: 4, claimed: true}},
      '2026-01-19': {improved: {value: 3, claimed: true}}, '2026-01-26': {'endless:note-storm': {value: 999, claimed: true}}};
    const watch = await prepare(page, {store: store(lb({champCheckedWeek: WEEK, awards: Object.assign({}, old, {[WEEK]: {stars: {value: 14, claimed: false}}})}),
      {items: {owned: {'plate:champion': true}, seen: {'plate:champion': true}}})});
    await scoreboard(page, champs());
    await page.goto('index.html');
    await expect(card(page)).toBeVisible();
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('back', 'goldtrophy'))).toBe(false);
    expect(await page.evaluate(() => Arcade.Avatar.requirement('back', 'goldtrophy'))).toBe('Finish 1st on a leaderboard 5 times');
    await page.locator('.ch-claim').click();
    await expect(page.locator('.sk-catchup')).toBeVisible();          // the usual UNLOCKED! card
    await page.locator('.sk-catchup [data-close]').click();
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('back', 'goldtrophy'))).toBe(true);
    expect(await page.evaluate(() => Arcade.Tokens.catalog().some(i => /champion|goldtrophy/.test(i.key)))).toBe(false);   // never sold
    // the player card: "5× weekly champion", a tap lists them
    await page.goto('index.html?pick');
    await expect(page.locator('#cTrophies')).toBeVisible();
    await expect(page.locator('#cTrophyN')).toHaveText('5');
    await page.locator('#cTrophies').click();
    await expect(page.locator('#cTrophyList li')).toHaveCount(5);
    await expect(page.locator('#cTrophyList li').first()).toContainText('Most stars (14 ★)');
    await expect(page.locator('#cTrophyList')).toContainText('Week of Jan 26: Note Storm Endless (999)');
    watch.check();
  });

  test('no championships: no trophy shelf', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await scoreboard(page, champs());
    await page.goto('index.html?pick');
    await expect(page.locator('#selectBtn')).toBeVisible();
    await expect(page.locator('#cTrophies')).toBeHidden();
    watch.check();
  });
});
