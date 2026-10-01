/* SUSTAIN SPEEDWAY: BREATH STATS and THE TEACHER GHOST CHALLENGE (sustain-speedway/game.js, teacher-ghosts.js).
   A race saves the longest steady hold (results: "Longest steady hold: … (new record!)", the "Breath record!" badge
   the next time it's beaten) and the track select's PERSONAL RECORDS panel shows it; with ?teacher the results offer
   SAVE AS TEACHER GHOST, whose code round-trips: pasted into teacher-ghosts.js it shows BEAT MR. GRAHAM on the track,
   races as a gold ghost with the name tag, and the results say who won (beating it = Teacher's Gold in the garage);
   a bad code is ignored. Nothing is sent anywhere. */
const {test, expect} = require('@playwright/test');
const {prepare, device, CPU_DRAWING} = require('./helpers');
test.use(CPU_DRAWING);                       // WebKit draws on the CPU here (helpers.js CPU_DRAWING: no page crashes on CI)
const {openSpeedway, startTrack, shortRace} = require('./speedway-helpers');

const store = (gd = {}) => device('trumpet', {gameData: {'sustain-speedway': Object.assign({steerHint: true, gfx: 'lite'}, gd)}});
async function raceToResults(page, lv = 1, sec = 3) {
  await startTrack(page, lv);
  await shortRace(page, sec);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.podium() || document.querySelector('#resTuning'), null, {timeout: 90000});
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#resTuning'), null, {timeout: 20000});
  await page.keyboard.up('Space');
}

test('breath records: saved, shown on the results and the track select, a new record gets the badge', async ({page}) => {
  test.setTimeout(150000);
  const watch = await prepare(page, {store: store({breath: {trumpet: {best: 1.2, notes: {C4: {s: 1.2, m: 60}}, hist: [{d: '2026-09-01', best: 1.2}]}}})});
  await openSpeedway(page);
  await expect(page.locator('#records')).toBeVisible();
  await expect(page.locator('#recBest')).toHaveText('1.2 s');
  await raceToResults(page, 1, 3);
  await expect(page.locator('#resBreath')).toContainText('Longest steady hold');
  await expect(page.locator('#resBreath')).toContainText('(new record!)');
  await expect(page.locator('#brBadge')).toHaveText('🌬️ Breath record!');
  const b = await page.evaluate(() => Arcade.Speedway.breath());
  expect(b.best).toBeGreaterThan(1.2);
  expect(b.hist.length).toBe(2);
  expect(Object.keys(b.notes).length).toBeGreaterThan(0);
  await page.click('#resLevels');
  await expect(page.locator('#recBest')).toHaveText(`${b.best.toFixed(1)} s`);
  await expect(page.locator('#records .rec-spark')).toBeVisible();
  watch.check();
});

test('the teacher ghost: ?teacher saves a code; pasted into teacher-ghosts.js it races, with the badge and the results line', async ({page}) => {
  test.setTimeout(200000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page, '&teacher');
  await raceToResults(page, 1, 3);
  await page.click('#resTeacherGhost');
  const line = await page.locator('#tgCode').inputValue();
  expect(line).toMatch(/^\{name: "Mr\. Graham", week: "\d{4}-\d\d-\d\d", code: "SSG1-[^"]+"\},$/);
  const code = /code: "([^"]+)"/.exec(line)[1];
  const dec = await page.evaluate(c => Arcade.Speedway.decodeGhost(c), code);
  expect(dec.lv).toBe(1);
  expect(dec.p[dec.p.length - 1]).toBe(4);                                          // the whole race: 4 laps
  expect(await page.evaluate(c => Arcade.Speedway.decodeGhost(c.replace(/.$/, c.endsWith('0') ? '1' : '0')), code)).toBe(null);   // the checksum
  // "paste it into the file": the page now loads a teacher-ghosts.js with that line (+ a broken one, ignored)
  await page.route('**/sustain-speedway/teacher-ghosts.js*', r => r.fulfill({contentType: 'text/javascript',
    body: `window.SPEEDWAY_TEACHER_GHOSTS = [{name: "Mr. Graham", week: "2026-10-05", code: "SSG1-broken-0000000"}, ${line}];`}));
  const warns = []; page.on('console', m => { if (m.type() === 'warning') warns.push(m.text()); });
  await openSpeedway(page);
  await expect(page.locator('.trk[data-l="1"] .tg-badge')).toHaveText(/Beat Mr\. Graham/i);
  await expect(page.locator('.trk[data-l="2"] .tg-badge')).toHaveCount(0);
  expect(warns.some(w => /not a valid code/.test(w))).toBe(true);
  // race it slowly: his ghost is on the road with its name tag, and he wins
  await startTrack(page, 1);
  expect(await page.evaluate(() => Arcade.Speedway.debug().teacher.name)).toBe('Mr. Graham');
  await page.evaluate(() => { const G = Arcade.Speedway.debug(); G.lens = G.lens.map(() => 3); G.total = 12; G.rivals.forEach(r => { r.pace = .01; }); });
  await page.keyboard.down('e');                                                     // centered but wobbly: slower than his run
  await page.waitForFunction(() => (Arcade.Speedway.debug().carsDrawn || []).some(c => c.name === 'Mr. Graham'), null, {timeout: 30000});
  await page.waitForFunction(() => Arcade.Speedway.podium() || document.querySelector('#resTuning'), null, {timeout: 120000});
  await page.keyboard.up('e');
  await page.keyboard.press('Enter');
  await expect(page.locator('#resTeacher')).toContainText("Mr. Graham's ghost won by");
  expect(await page.evaluate(() => !!(Arcade.store.gameData('sustain-speedway').achievements || {})['teacher-ghost'])).toBe(false);
  watch.check();
});

test('beating the teacher ghost: the results line and Teacher\'s Gold in the garage (once)', async ({page}) => {
  test.setTimeout(150000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  // a slow teacher run on track 1 (4 laps, 40 s): made with the page's own encoder
  const code = await page.evaluate(() => {
    const p = []; for (let t = 0; t <= 40; t += .5) p.push(+(t / 10).toFixed(3));
    const payload = ['1', 1, 'first5', 'random', 'rookie', 400, p.map((v, i) => Math.round((v - (i ? p[i - 1] : 0)) * 1000).toString(36)).join('.')].join('~');
    let h = 0x811c9dc5; for (let i = 0; i < payload.length; i++) { h ^= payload.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return `SSG1-${payload}-${h.toString(36).padStart(7, '0')}`;
  });
  expect(await page.evaluate(c => !!Arcade.Speedway.decodeGhost(c), code)).toBe(true);
  await page.route('**/sustain-speedway/teacher-ghosts.js*', r => r.fulfill({contentType: 'text/javascript', body: `window.SPEEDWAY_TEACHER_GHOSTS = [{name: "Mr. Graham", week: "2026-10-05", code: ${JSON.stringify(code)}}];`}));
  await openSpeedway(page);
  await raceToResults(page, 1, 3);
  await expect(page.locator('#resTeacher')).toContainText("You beat Mr. Graham's ghost by");
  await expect(page.locator('.sw-newcar')).toContainText("Teacher's Gold");
  expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').achievements['teacher-ghost'])).toBe(true);
  expect(watch.posts).toEqual([]);                                                   // nothing sent anywhere
  watch.check();
});

test('an empty or broken teacher-ghosts.js never breaks the game', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await page.route('**/sustain-speedway/teacher-ghosts.js*', r => r.fulfill({contentType: 'text/javascript',
    body: 'window.SPEEDWAY_TEACHER_GHOSTS = [null, {}, {name: "X", code: 42}, {name: "Y", code: "SSG1-1~99~a~b~c~1~1-0000000"}];'}));
  await openSpeedway(page);
  await expect(page.locator('.tg-badge')).toHaveCount(0);
  await startTrack(page, 1);
  expect(await page.evaluate(() => Arcade.Speedway.debug().teacher)).toBe(null);
  watch.check();
});
