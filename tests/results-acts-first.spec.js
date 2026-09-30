/* UI.results.show({actsFirst: true}) (shared/ui-kit.js): the buttons row comes right after the tiles / best line and
   BEFORE the game's extra part. Sustain Speedway uses it: NEXT TRACK / TRY AGAIN / TRACKS / GARAGE are on screen the
   moment the results appear (phone portrait, iPad both ways, laptop), NEXT has the focus, Tab then reaches the NEW IN
   THE GARAGE! card and the "Race details" (the tuning report). Every other game keeps the buttons last. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const {URL, startTrack, shortRace, driveToFinish} = require('./speedway-helpers');

const SIZES = [['phone portrait', {width: 390, height: 844}], ['iPad landscape', {width: 1024, height: 768}],
  ['iPad portrait', {width: 768, height: 1024}], ['laptop', {width: 1366, height: 768}]];

/** the results' layout: DOM order and where each button is */
const layout = page => page.evaluate(() => {
  const panel = document.querySelector('#results .panel'), kids = [...panel.children];
  const acts = panel.querySelector('.ui-res-acts'), extra = panel.querySelector('.ui-res-extra');
  return {
    actsBeforeExtra: kids.indexOf(acts) < kids.indexOf(extra),
    scrollTop: document.getElementById('results').scrollTop,
    buttons: [...acts.querySelectorAll('.btn')].map(b => { const r = b.getBoundingClientRect();
      return {id: b.id, primary: b.classList.contains('btn-primary'), inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth}; }),
    focus: document.activeElement && document.activeElement.id,
    more: !!extra.querySelector('#resMore'), tuningInExtra: !!extra.querySelector('#resDiff'),
    cardAfterActs: (() => { const c = panel.querySelector('.sw-newcar'); return !c || !!(acts.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); })(),
    unlockAfterActs: [...panel.querySelectorAll('.sk-unlock')].every(c => acts.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
  };
});

for (const [name, size] of SIZES) {
  test(`Sustain Speedway: the buttons first, on screen at once (${name})`, async ({page}) => {
    test.setTimeout(180000);
    await page.setViewportSize(size);
    // a first win: something new in the garage (the card with its filled GARAGE; no plain one in the row)
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto(URL);
    await page.waitForFunction(() => window.Arcade && Arcade.Speedway && document.querySelector('.trk[data-l="1"]'));
    await startTrack(page, 1);
    await shortRace(page, 2);
    await driveToFinish(page);
    await expect(page.locator('#results')).toBeVisible({timeout: 120000});
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    const L = await layout(page);
    expect(L.actsBeforeExtra).toBe(true);
    expect(L.scrollTop).toBe(0);
    expect(L.buttons.map(b => b.id)).toEqual(['resNext', 'resRetry', 'resLevels']);
    expect(L.buttons[0].primary).toBe(true);
    for (const b of L.buttons) expect(b.inView, `${b.id} on screen at ${name}`).toBe(true);
    expect(L.focus).toBe('resNext');
    expect(L.more).toBe(true); expect(L.tuningInExtra).toBe(true);
    expect(L.cardAfterActs).toBe(true); expect(L.unlockAfterActs).toBe(true);
    // Tab: past the buttons, into the garage card, then the details below
    await expect(page.locator('#gNewBtn')).toBeVisible();
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    const after = await page.evaluate(() => { const a = document.activeElement; return {inExtra: !!a.closest('.ui-res-extra, .sk-unlock'), id: a.id}; });
    expect(after.inExtra, JSON.stringify(after)).toBe(true);
    watch.check();
  });
}

test('Sustain Speedway: nothing new = the plain GARAGE in the buttons row, on screen', async ({page}) => {
  test.setTimeout(180000);
  await page.setViewportSize({width: 390, height: 844});
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, games: {'sustain-speedway': {trumpet: {1: {stars: 3, best: 400}}}},
    gameData: {'sustain-speedway': {wins: 3, achievements: {'perfect-lap': true}, bestLap: {'sustain-speedway|trumpet|1': 1}, cleanLaps: 50,
      breath: {trumpet: {best: 99, notes: {}, hist: []}}}}})});
  await page.goto(URL);
  await page.waitForFunction(() => window.Arcade && Arcade.Speedway && document.querySelector('.trk[data-l="1"]'));
  await page.evaluate(() => { const G = Arcade.SpeedwayGarage; G.markSeen(G.fresh()); });
  await startTrack(page, 1);
  await shortRace(page, 2);
  await driveToFinish(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 120000});
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  const L = await layout(page);
  if (!(await page.locator('#gNew').count())) {                             // (a race can still earn something new)
    expect(L.buttons.map(b => b.id)).toEqual(['resNext', 'resRetry', 'resLevels', 'resGarage']);
    for (const b of L.buttons) expect(b.inView, b.id).toBe(true);
  }
  expect(L.actsBeforeExtra).toBe(true);
  watch.check();
});

test('the kit: actsFirst puts the buttons before the extra part; without it (every other game) the buttons stay last; no NEXT = TRY AGAIN has the focus', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('ghost-notes/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.UI && Arcade.UI.results);
  const order = actsFirst => page.evaluate(af => {
    const panel = Arcade.UI.results.show({title: 'Test', stars: 2, tiles: [['A', '1']], extra: '<p id="xx">extra</p>', announce: false, actsFirst: af,
      next: {hidden: true}, retry: {onClick() {}}, levels: {onClick() {}}});
    const kids = [...panel.children].map(c => c.className);
    const r = {acts: kids.findIndex(c => /ui-res-acts/.test(c)), extra: kids.findIndex(c => /ui-res-extra/.test(c)), last: kids[kids.length - 1], focus: document.activeElement.id};
    Arcade.UI.results.hide(); return r;
  }, actsFirst);
  const a = await order(true);
  expect(a.acts).toBeLessThan(a.extra); expect(a.focus).toBe('resRetry');
  const b = await order(false);
  expect(b.acts).toBeGreaterThan(b.extra); expect(b.last).toMatch(/ui-res-acts/); expect(b.focus).toBe('resRetry');
  const c = await page.evaluate(() => { const host = document.createElement('div'); document.body.appendChild(host);
    const {panel} = Arcade.UI.results.render(host, {title: 'T', extra: 'x', retry: {}, actsFirst: true});
    const k = [...panel.children].map(x => x.className); host.remove(); return k.findIndex(x => /acts/.test(x)) < k.findIndex(x => /extra/.test(x)); });
  expect(c).toBe(true);
  watch.check();
});
