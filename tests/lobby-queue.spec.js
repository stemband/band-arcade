/* THE LOBBY QUEUE (shared/lobby-queue.js; docs/engine/page-flow.md "The lobby queue"): everything that pops up or
   slides in on its own on the floor page asks the queue, which shows ONE panel at a time (priority order, ≥ 600 ms
   apart, at most 2 a visit + an UNLOCKED! card), ONE banner and ONE toast (only with no panel up or next), and nothing
   over PRESS START, Choose Your Instrument or another panel. The page's clock is fixed in Spooky Season (Wednesday
   Oct 14 2026), so the event's free gift waits whatever day the tests run. */
const {test, expect} = require('@playwright/test');
const {prepare, device, LB_URL, settle} = require('./helpers');

const NOW = new Date(2026, 9, 14, 10, 0, 0);
const LAST_WEEK = '2026-10-05', THIS_WEEK = '2026-10-12';
const PID = 'abc123' + 'x'.repeat(18);
const champs = {week: LAST_WEEK, stars: [{id: 'abc123', name: [1, 2, 3], value: 9}], improved: [], streak: [], endless: {}};
const state = page => page.evaluate(() => Arcade.Lobby.queue.state());
const overlays = page => page.locator('body > .overlay:not([hidden])');
/** 12 stars on an instrument nobody plays here (no star-milestone skins), all of them this week */
function stars() { return {'note-storm': {zz: {1: {stars: 3, best: 100}, 2: {stars: 3, best: 100}, 3: {stars: 3, best: 100}, 4: {stars: 3, best: 100}}}}; }

/** a device with EVERYTHING due: a given item never announced (UNLOCKED!), an unclaimed CHAMPION award, the event's
    free gift, no grade (the grade question), SAVE YOUR PROGRESS due (a new player with 12 stars), and PRESS START ahead
    (the PLAYING AS toast) */
function everything() {
  return device('trumpet', {avatarOffered: true, games: stars(), activity: {'2026-10-13': {s: 12, p: 1}},
    items: {owned: {'effect:spookyglow': true}},
    gameData: {
      leaderboard: {on: true, pid: PID, week: THIS_WEEK, weekStars: 12, champCheckedWeek: LAST_WEEK, awards: {[LAST_WEEK]: {stars: {value: 9, claimed: false}}}},
      'season-lobby': {},
    }});
}

/** every overlay that comes and goes on the page, with its time (performance.now: the page's own clock) */
const recordOverlays = page => page.addInitScript(() => {
  window.__ov = [];
  const kind = el => el.classList.contains('sk-catchup') ? 'unlocked' : el.classList.contains('ch-ov') ? 'champion'
    : el.classList.contains('ev-overlay') ? 'event' : el.classList.contains('lq-test') ? el.dataset.id : el.className;
  addEventListener('DOMContentLoaded', () => new MutationObserver(list => list.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList.contains('overlay')) window.__ov.push({k: kind(n), on: true, t: performance.now()});
      if (n.nodeType === 1 && n.classList.contains('playing-as')) window.__toastAt = window.__toastAt || performance.now();
    });
    m.removedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('overlay')) window.__ov.push({k: kind(n), on: false, t: performance.now()}); });
  })).observe(document.body, {childList: true}));
});
/** how many overlays were up at once, at most */
const mostAtOnce = log => { let n = 0, max = 0; log.forEach(e => { n += e.on ? 1 : -1; max = Math.max(max, n); }); return max; };
/** the lobby shows again (ALL GAMES and back): a new visit */
async function lobbyAgain(page) {
  await page.evaluate(() => { location.hash = '#all-games'; });
  await expect(page.locator('#allView')).toBeVisible();
  await page.evaluate(() => { location.hash = ''; });
  await expect(page.locator('#lobby')).toBeVisible();
}
/** test panels through the queue (asked together, in this order): plain overlays with a CLOSE button that calls done() */
function testPanels(list) {
  list.forEach(([id, extra]) => Arcade.Lobby.queue.request(Object.assign({id, kind: 'panel', show: done => {
    const ov = document.createElement('div');
    ov.className = 'overlay lq-test'; ov.dataset.id = id;
    ov.innerHTML = `<div class="panel" role="dialog" aria-label="${id}"><button type="button" class="lq-close">Close ${id}</button></div>`;
    document.body.appendChild(ov);
    ov.querySelector('.lq-close').focus();
    ov.querySelector('.lq-close').addEventListener('click', () => { ov.remove(); done(); });
  }}, extra || {})));
}
const askPanels = (page, list) => page.evaluate(testPanels, list);
const askPanel = (page, id, extra = {}) => askPanels(page, [[id, extra]]);

test.describe('the lobby queue', () => {
  test.describe.configure({timeout: 60_000});

  test('everything at once: one panel at a time in priority order, 2 a visit (+ UNLOCKED!), one banner, the toast after the panels; the rest next visit', async ({page}) => {
    test.skip(!LB_URL, 'the leaderboard is switched off (no grade question, no champions)');
    await page.clock.install({time: NOW});
    await recordOverlays(page);
    const watch = await prepare(page, {store: everything(), visit: false});
    await page.route(u => /script\.google/.test(u.hostname), async route => {
      const u = new URL(route.request().url());
      if (u.searchParams.get('action') === 'champions') return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, enabled: true, grade: 7, champions: champs})});
      return route.fallback();
    });
    await page.goto('index.html');
    await expect(page.locator('#pressStart')).toBeVisible();
    await settle(page, 1500);
    await expect(overlays(page)).toHaveCount(0);                     // nothing over PRESS START
    expect((await state(page)).blocked).toBe('press-start');
    expect((await state(page)).waiting).toEqual(expect.arrayContaining(['unlocked', 'champion', 'event-gift', 'grade', 'backup-nudge']));
    await page.keyboard.press('Enter');
    await expect(page.locator('#pressStart')).toBeHidden();

    // 1st panel: UNLOCKED! (the given item), the toast and both banners wait
    const unlocked = page.locator('.sk-catchup');
    await expect(unlocked).toBeVisible();
    expect((await state(page)).current).toBe('unlocked');
    await expect(page.locator('.sk-catchup .sk-u-equip, .sk-catchup [data-close]').first()).toBeFocused();   // the focus moves in
    await expect(page.locator('.ui-toast.playing-as')).toHaveCount(0);
    await expect(page.locator('#gradeAsk .gq-card, #saveNudge .bn-card')).toHaveCount(0);
    await unlocked.locator('[data-close]').click();
    // 2nd: the CHAMPION card (≥ 600 ms later)
    await expect(page.locator('.ch-ov')).toBeVisible();
    await expect(page.locator('.ch-claim')).toBeFocused();
    await expect(page.locator('.ui-toast.playing-as')).toHaveCount(0);
    await page.locator('.ch-claim').click();
    // its prize, the CHAMPION plate: an UNLOCKED! card may be the visit's 3rd panel (a reward)
    await expect(unlocked).toBeVisible();
    await expect(unlocked).toContainText(/champion/i);
    await unlocked.locator('[data-close]').click();
    await expect(overlays(page)).toHaveCount(0);
    // the event's free gift waits for the next visit (2 panels + the reward this visit)
    await settle(page, 1500);
    await expect(overlays(page)).toHaveCount(0);
    let st = await state(page);
    expect(st.waiting).toContain('event-gift');
    expect(st.panels).toBe(3);
    expect(st.shownThisVisit.filter(id => !['playing-as', 'grade', 'backup-nudge'].includes(id))).toEqual(['unlocked', 'champion']);
    // ONE banner: the grade question (before SAVE YOUR PROGRESS); the toast now that the panels are done
    await expect(page.locator('#gradeAsk .gq-card')).toBeVisible();
    await expect(page.locator('#saveNudge .bn-card')).toHaveCount(0);
    expect(st.banner).toBe('grade');
    expect(st.shownThisVisit).toContain('playing-as');
    // the focus came back to the lobby
    expect(await page.evaluate(() => !!document.activeElement.closest('#lobby'))).toBe(true);
    // "Not now" on the question: then SAVE YOUR PROGRESS takes the banner slot
    await page.locator('.gq-later').click();
    await expect(page.locator('#saveNudge .bn-card')).toBeVisible();
    expect((await state(page)).banner).toBe('backup-nudge');

    // never two panels at once, and each next one ≥ 600 ms after the last closed
    const log = await page.evaluate(() => window.__ov);
    expect(mostAtOnce(log)).toBe(1);
    expect(log.filter(e => e.on).map(e => e.k)).toEqual(['unlocked', 'champion', 'unlocked']);
    for (let i = 1; i < log.length; i++) if (log[i].on && !log[i - 1].on) expect(log[i].t - log[i - 1].t).toBeGreaterThanOrEqual(590);
    // the PLAYING AS toast only after the last panel closed
    expect(await page.evaluate(() => window.__toastAt)).toBeGreaterThan(log[log.length - 1].t);

    // THE NEXT VISIT: the event's free gift
    await lobbyAgain(page);
    await expect(page.locator('.ev-overlay')).toBeVisible();
    expect((await state(page)).current).toBe('event-gift');
    await expect(page.locator('.ev-claim')).toBeFocused();
    await expect(page.locator('#saveNudge .bn-card')).toHaveCount(0);          // the banner waits while it's up
    await page.locator('.ev-close').click();
    await expect(page.locator('.ev-overlay')).toHaveCount(0);
    await expect(page.locator('#saveNudge .bn-card')).toBeVisible();          // back after
    // once a day: another visit today doesn't open it again
    await lobbyAgain(page);
    await settle(page, 1500);
    await expect(overlays(page)).toHaveCount(0);
    expect((await state(page)).waiting).not.toContain('event-gift');
    watch.check();
  });

  test('waiting for screens: nothing over PRESS START or Choose Your Instrument; it shows after', async ({page}) => {
    await recordOverlays(page);
    // a lobby panel asked on the way in; "ask every time" = Choose Your Instrument after PRESS START (shared/teacher-settings.js)
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
    await page.addInitScript(fn => addEventListener('DOMContentLoaded', () => (0, eval)('(' + fn + ')')([['for-the-lobby']])), testPanels.toString());
    await page.route(/shared\/teacher-settings\.js/, async route => {
      const r = await route.fetch();
      await route.fulfill({response: r, body: (await r.text()).replace('ASK_INSTRUMENT_EVERY_TIME: false', 'ASK_INSTRUMENT_EVERY_TIME: true')});
    });
    await page.goto('index.html');
    await expect(page.locator('#pressStart')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(overlays(page)).toHaveCount(0);
    expect(await state(page)).toMatchObject({current: null, waiting: ['for-the-lobby'], blocked: 'press-start'});
    await page.keyboard.press('Enter');
    await expect(page.locator('body.in-select')).toHaveCount(1);
    await page.waitForTimeout(1200);
    await expect(overlays(page)).toHaveCount(0);
    expect((await state(page)).blocked).toBe('choose your instrument');
    await page.locator('#selectBtn').click();                          // → the lobby: now the panel
    await expect(page.locator('body.in-select')).toHaveCount(0);
    await expect(page.locator('.lq-test[data-id="for-the-lobby"]')).toBeVisible();
    await page.getByRole('button', {name: 'Close for-the-lobby'}).click();
    await expect(overlays(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('#lobby'))).toBe(true);   // the focus is back in the lobby
    watch.check();
  });

  test('closing: done() brings the next panel ≥ 600 ms later; asking twice is one request; at most 2 panels a visit, the 3rd next visit', async ({page}) => {
    await recordOverlays(page);
    const watch = await prepare(page);
    await page.goto('index.html?demo&nostart&queue=log');
    await expect(page.locator('#lobby')).toBeVisible();
    await page.waitForTimeout(500);
    // asked together (the same id twice = one request); shown by priority, not by the order asked
    await page.evaluate(() => Arcade.Lobby.queue.hold('test', true));
    await askPanels(page, [['low', {priority: 5}], ['high', {priority: 65}], ['high', {priority: 65}], ['mid', {priority: 55}]]);
    expect((await state(page)).waiting).toEqual(['high', 'mid', 'low']);
    await page.evaluate(() => Arcade.Lobby.queue.hold('test', false));
    const panel = id => page.locator(`.lq-test[data-id="${id}"]`);
    await expect(panel('high')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Close high'})).toBeFocused();
    await page.getByRole('button', {name: 'Close high'}).click();
    await expect(panel('mid')).toBeVisible();
    await page.getByRole('button', {name: 'Close mid'}).click();
    await page.waitForTimeout(1200);
    await expect(panel('low')).toHaveCount(0);                          // 2 this visit
    expect((await state(page)).waiting).toContain('low');
    await lobbyAgain(page);
    await expect(panel('low')).toBeVisible();                           // the next visit
    await page.getByRole('button', {name: 'Close low'}).click();
    const log = (await page.evaluate(() => window.__ov)).filter(e => /^(high|mid|low)$/.test(e.k));
    expect(log.filter(e => e.on).map(e => e.k)).toEqual(['high', 'mid', 'low']);
    expect(mostAtOnce(log)).toBe(1);
    const closed = log.find(e => e.k === 'high' && !e.on), next = log.find(e => e.k === 'mid' && e.on);
    expect(next.t - closed.t).toBeGreaterThanOrEqual(590);
    // a reward (an UNLOCKED! card) may be a visit's 3rd panel; nothing else may
    await lobbyAgain(page);
    await askPanel(page, 'a', {priority: 60});
    await expect(panel('a')).toBeVisible();
    await page.getByRole('button', {name: 'Close a'}).click();
    await askPanels(page, [['b', {priority: 60}], ['prize', {priority: 59, reward: true}]]);
    await expect(panel('b')).toBeVisible();
    await page.getByRole('button', {name: 'Close b'}).click();
    await expect(panel('prize')).toBeVisible();
    await page.getByRole('button', {name: 'Close prize'}).click();
    // when() is asked again just before it shows: no longer wanted = dropped; cancel(id) takes a request back
    await page.evaluate(() => {
      window.__want = true;
      Arcade.Lobby.queue.request({id: 'unwanted', kind: 'panel', priority: 60, when: () => window.__want, show: done => done()});
      Arcade.Lobby.queue.request({id: 'cancelled', kind: 'panel', priority: 60, show: done => done()});
      Arcade.Lobby.queue.cancel('cancelled');
      window.__want = false;
    });
    await lobbyAgain(page);
    await page.waitForTimeout(1000);
    const st = await state(page);
    expect(st.waiting).not.toContain('unwanted');
    expect(st.waiting).not.toContain('cancelled');
    expect(st.shownThisVisit).not.toContain('unwanted');
    watch.check();
  });

  test('the first-day tour (a `tour` panel) holds everything below it until it finishes; a toast waits for it', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, items: {owned: {'plate:champion': true}}})});
    // asked on the way in, with the lobby's own UNLOCKED! card (PRIORITY.tour is above it) and a toast
    await page.addInitScript(fn => addEventListener('DOMContentLoaded', () => {
      (0, eval)('(' + fn + ')')([['tour']]);
      Arcade.Lobby.queue.request({id: 'test-toast', kind: 'toast', views: 'any', ms: 1500,
        show: () => { const t = Arcade.UI.toast('Hello', {ms: 1500}); t.classList.add('lq-toast'); return t; }});
    }), testPanels.toString());
    await page.goto('index.html?demo&nostart');
    await expect(page.locator('#lobby')).toBeVisible();
    await expect(page.locator('.lq-test[data-id="tour"]')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator('.sk-catchup')).toHaveCount(0);
    await expect(page.locator('.lq-toast')).toHaveCount(0);
    expect((await state(page)).current).toBe('tour');
    await page.getByRole('button', {name: 'Close tour'}).click();
    await expect(page.locator('.sk-catchup')).toBeVisible();            // then UNLOCKED!
    await expect(page.locator('.lq-toast')).toHaveCount(0);             // the toast still waits
    await page.locator('.sk-catchup [data-close]').click();
    await expect(page.locator('.lq-toast')).toBeVisible();              // then the toast
    watch.check();
  });

  test('an open panel (Settings, the Prize Counter) holds the queue; ?demo&queue=log logs its decisions', async ({page}) => {
    const lines = [];
    page.on('console', m => { if (/^\[lobby queue\]/.test(m.text())) lines.push(m.text()); });
    const watch = await prepare(page);
    await page.goto('index.html?demo&nostart&queue=log');
    await expect(page.locator('#lobby')).toBeVisible();
    await page.evaluate(() => Arcade.UI.settings.open());
    await askPanel(page, 'held', {priority: 60});
    await page.waitForTimeout(1000);
    await expect(page.locator('.lq-test')).toHaveCount(0);
    expect((await state(page)).blocked).toBe('panel');
    await page.keyboard.press('Escape');
    await expect(page.locator('.lq-test[data-id="held"]')).toBeVisible();
    await page.getByRole('button', {name: 'Close held'}).click();
    if (await page.locator('#prizeSign').count()) {
      await page.locator('#prizeSign').click();
      await askPanel(page, 'held2', {priority: 60});
      await page.waitForTimeout(1000);
      await expect(page.locator('.lq-test')).toHaveCount(0);
      expect((await state(page)).blocked).toMatch(/^(panel|overlay)$/);
    }
    expect(lines.some(l => /asked held/.test(l))).toBe(true);
    expect(lines.some(l => /shows held/.test(l))).toBe(true);
    expect(lines.some(l => /done held/.test(l))).toBe(true);
    watch.check();
  });
});
