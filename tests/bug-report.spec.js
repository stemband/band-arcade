/* ANONYMOUS BUG REPORTS (shared/bug-report.js; docs/engine/leaderboard.md): an error in one of the arcade's own files
   sends {type: 'error', game, message, where, browser, version, count} to the scoreboard address, and nothing else.
   These tests pretend a DEPLOYED version (shared/version.js's VERSION 'test1' instead of 'dev') and a browser that
   isn't the test runner (navigator.webdriver false); Ghost Notes' game.js gets a small `__throw(message, times)` at its
   end (thrown from an event listener: the browser reports it to `window`, and the test clock never swallows it), so the errors come from one of the arcade's own files. The scoreboard is page.route'd; the page's clock is the
   test's (page.clock), so the 2 s / 30 s waits are jumped. */
const {test, expect} = require('@playwright/test');
const {prepare, device, LB_HOSTS} = require('./helpers');

const ALLOWED = ['browser', 'count', 'game', 'message', 'type', 'version', 'where'];
const PID = 'zq9' + 'x'.repeat(21);
const store = () => device('trumpet', {avatarOffered: true, gameData: {leaderboard: {pid: PID, grade: 7, on: true}}});

/** the page as deployed: a real version, not the test runner, a scoreboard that records every request */
async function deployed(page, {version = true, teacherOff = false, noAddress = false, webdriver = false} = {}) {
  await page.clock.install();
  const watch = await prepare(page, {store: store()});
  if (!webdriver) await page.addInitScript(() => { try { Object.defineProperty(Navigator.prototype, 'webdriver', {configurable: true, get: () => false}); } catch (e) { /* */ } });
  if (version) await page.route(/\/shared\/version\.js/, async route => {
    const r = await route.fetch();
    await route.fulfill({response: r, body: (await r.text()).replace("window.Arcade.VERSION = 'dev';", "window.Arcade.VERSION = 'test1';")});
  });
  if (teacherOff) await page.route(/\/shared\/teacher-settings\.js/, async route => {
    const r = await route.fetch();
    await route.fulfill({response: r, body: (await r.text()).replace('BUG_REPORTS: true', 'BUG_REPORTS: false')});
  });
  if (noAddress) await page.route(/\/shared\/leaderboard-config\.js/, r => r.fulfill({contentType: 'text/javascript', body: "window.Arcade = window.Arcade || {}; window.Arcade.LEADERBOARD_URL = '';"}));
  // an error thrown from one of the arcade's own files (Ghost Notes' game.js), on demand
  await page.route(/\/ghost-notes\/game\.js/, async route => {
    const r = await route.fetch();
    await route.fulfill({response: r, body: (await r.text()) +
      '\nwindow.__throw = function (m, n) { var t = document.createElement("i"); t.addEventListener("boom", function () { throw new Error(m); });' +
      ' for (var i = 0; i < (n || 1); i++) t.dispatchEvent(new Event("boom")); };\n'});   // (an error in a listener is reported, never thrown back)
  });
  const reports = [], requests = [];
  await page.route(u => LB_HOSTS.test(u.hostname), async route => {
    const body = route.request().postData() || '';
    requests.push(route.request().url());
    if (/"type":"error"/.test(body)) reports.push(body);
    return route.fulfill({status: 200, contentType: 'application/json', body: '{"ok":true}'});
  });
  return {watch, reports, requests};
}
/** open the game page, then stop the page's clock: only jump() moves it (a flowing clock on a busy machine made the
    jumps uneven) */
async function open(page, url = 'ghost-notes/index.html') {
  await page.goto(url);
  await page.waitForFunction(() => window.__throw && window.Arcade && Arcade.BugReport);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 5000));   // (ahead of the page: it can't go back)
}
const boom = (page, m, n) => page.evaluate(([m, n]) => window.__throw(m, n), [m, n]);
const jump = async (page, ms) => { await page.clock.fastForward(ms); await page.waitForTimeout(300); };
const ours = watch => watch.errors.filter(e => !/Boom|Oops|ResizeObserver/.test(e));

test.describe('anonymous bug reports', () => {
  test('a thrown error in a game page: one POST with exactly the allowed fields, nothing about the student', {tag: '@quick'}, async ({page}) => {
    const {watch, reports} = await deployed(page);
    await open(page);
    expect(await page.evaluate(() => Arcade.BugReport.state().on)).toBe(true);
    await boom(page, 'Boom in https://bandarcade.org/ghost-notes/index.html?demo the game');
    await jump(page, 2500);
    await expect.poll(() => reports.length).toBe(1);
    const raw = reports[0], r = JSON.parse(raw);
    expect(Object.keys(r).sort()).toEqual(ALLOWED);
    expect(r).toMatchObject({type: 'error', game: 'ghost-notes', version: 'test1', count: 1});
    expect(r.message).toBe('Error: Boom in [address] the game');
    expect(r.where).toMatch(/^game\.js:\d+$/);
    expect(r.where).not.toMatch(/http|\?|\//);
    expect(r.browser).toMatch(/^(Chrome|Safari|Edge|Firefox) \d+$/);
    // nothing about the student, anywhere in the raw text
    for (const bad of [PID, PID.slice(0, 6), 'pid', 'grade', '"name"', 'trumpet', 'stack', 'localStorage']) expect(raw).not.toContain(bad);
    expect(ours(watch)).toEqual([]);
  });

  test('grouped and limited: 10 of the same = one report with count 10; at most 5 different; one send per 30 s', async ({page}) => {
    const {watch, reports} = await deployed(page);
    await open(page);
    await boom(page, 'Boom same', 10);
    await jump(page, 2500);
    await expect.poll(() => reports.length).toBe(1);
    expect(reports.map(b => JSON.parse(b)).map(r => [r.message, r.count])).toEqual([['Error: Boom same', 10]]);
    // again within 30 s: waits; it goes 30 s after the last send, with its own count
    await boom(page, 'Boom same', 3);
    await jump(page, 10000);
    expect(reports).toHaveLength(1);
    await jump(page, 21000);
    await expect.poll(() => reports.length).toBe(2);
    expect(JSON.parse(reports[1]).count).toBe(3);
    // 7 different errors: 4 more kinds fit (5 a page load in all), the other 3 are never sent
    for (let i = 1; i <= 7; i++) await boom(page, 'Oops ' + i);
    await jump(page, 31000);
    await expect.poll(() => reports.length).toBe(6);
    const kinds = new Set(reports.map(b => JSON.parse(b).message));
    expect(kinds.size).toBe(5);
    expect(reports).toHaveLength(6);
    expect(ours(watch)).toEqual([]);
  });

  for (const [name, opts, url] of [['?demo', {}, 'ghost-notes/index.html?demo'], ["a 'dev' version", {version: false}],
    ['BUG_REPORTS: false', {teacherOff: true}], ['no scoreboard address', {noAddress: true}], ['the test runner', {webdriver: true}]]) {
    test(`not sending: ${name}`, async ({page}) => {
      const {reports} = await deployed(page, opts);
      await open(page, url);
      expect(await page.evaluate(() => Arcade.BugReport.state().on)).toBe(false);
      await boom(page, 'Boom off', 3);
      await jump(page, 35000);
      await page.evaluate(() => { dispatchEvent(new Event('pagehide')); Arcade.BugReport.flush(); });
      await page.waitForTimeout(300);
      expect(reports).toEqual([]);
    });
  }

  test('noise: another site\'s script, "ResizeObserver loop" and "Script error." are never sent', async ({page}) => {
    const {reports} = await deployed(page);
    await page.route('https://cdn.example.com/**', r => r.fulfill({contentType: 'text/javascript', body: 'throw new Error("Boom elsewhere");'}));
    await open(page);
    await page.evaluate(() => { const s = document.createElement('script'); s.src = 'https://cdn.example.com/widget.js'; document.head.appendChild(s); });
    await boom(page, 'ResizeObserver loop completed with undelivered notifications.');
    await page.evaluate(() => dispatchEvent(new ErrorEvent('error', {message: 'Script error.', filename: '', lineno: 0})));
    await jump(page, 35000);
    expect(reports).toEqual([]);
    expect(await page.evaluate(() => Arcade.BugReport.state().kinds)).toBe(0);
  });

  test('on close: pagehide sends what waits with sendBeacon', async ({page}) => {
    await deployed(page);
    await page.addInitScript(() => {
      window.__beacons = [];
      navigator.sendBeacon = (url, data) => { data.text().then(t => window.__beacons.push({url, t, type: data.type})); return true; };
    });
    await open(page);
    await boom(page, 'Boom before leaving', 2);
    await jump(page, 500);                                              // not sent yet (2 s)
    await page.evaluate(() => dispatchEvent(new Event('pagehide')));
    await expect.poll(() => page.evaluate(() => window.__beacons.length)).toBe(1);
    const b = (await page.evaluate(() => window.__beacons))[0];
    expect(b.type).toBe('text/plain');
    expect(b.url).toMatch(/^https:\/\/script\.google\.com\//);
    expect(JSON.parse(b.t)).toMatchObject({type: 'error', message: 'Error: Boom before leaving', count: 2});
    expect(Object.keys(JSON.parse(b.t)).sort()).toEqual(ALLOWED);
  });

  test('never breaking: a broken sendBeacon and fetch never surface an error or stop the page', async ({page}) => {
    const {watch} = await deployed(page);
    await page.addInitScript(() => {
      navigator.sendBeacon = () => { throw new Error('beacon broken'); };
      addEventListener('DOMContentLoaded', () => { const f = window.fetch; window.__fetch = f; });
    });
    await open(page);
    await page.evaluate(() => { window.fetch = () => { throw new Error('fetch broken'); }; });
    await boom(page, 'Boom with a broken network', 2);
    await jump(page, 2500);
    await page.evaluate(() => dispatchEvent(new Event('pagehide')));
    await boom(page, 'Boom again');
    await jump(page, 31000);
    await page.evaluate(() => { window.fetch = window.__fetch; });
    expect(ours(watch)).toEqual([]);                                    // only the test's own thrown errors
    expect(await page.evaluate(() => typeof Arcade.BugReport.state().sent)).toBe('number');
    await expect(page.locator('body')).toBeVisible();
  });
});
