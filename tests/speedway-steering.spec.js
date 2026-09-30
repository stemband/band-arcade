/* SUSTAIN SPEEDWAY: PITCH STEERING and THE INTONATION REPORT (sustain-speedway/game.js, levels.js RULES.steer /
   RULES.report, tips.js). Holding the note sharp (?demo D) drifts the car right and shows "▶ SHARP"; in tune it stays on
   the center line; the steering never changes the speed; rivals never overlap the drifting car. After a race the report
   has one row per note with the right sign, the matching tip from tips.js (or "Right on pitch! Great ears."), and the
   history is saved. Phone, iPad and laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const {openSpeedway, startTrack, shortRace} = require('./speedway-helpers');

const SIZES = [['phone', {width: 390, height: 844}], ['iPad', {width: 1024, height: 768}], ['laptop', {width: 1366, height: 768}]];

for (const [name, size] of SIZES) {
  test(`${name}: sharp drifts right with "▶ SHARP", in tune stays centered, no overlaps, the hint shows once`, async ({page}) => {
    test.setTimeout(120000);
    await page.setViewportSize(size);
    const watch = await prepare(page, {store: device('trumpet')});
    await openSpeedway(page);
    await startTrack(page, 1);
    await expect(page.locator('#steerHint')).toBeVisible();
    // no car ever overlaps another, drifting included
    await page.evaluate(() => {
      window.__ov = 0;
      const tick = () => { const g = Arcade.Speedway.debug(); if (!g) return; const c = g.carsDrawn || [];
        for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) { const a = c[i].box, b = c[j].box; if (a.l < b.r - .5 && b.l < a.r - .5 && a.t < b.b - .5 && b.t < a.b - .5) window.__ov++; }
        requestAnimationFrame(tick); };
      tick();
    });
    await page.keyboard.down('Space');
    await page.waitForTimeout(2000);
    const inTune = await page.evaluate(() => Arcade.Speedway.steer());
    expect(Math.abs(inTune.steer)).toBeLessThan(.05);
    expect(inTune.word).toBe('');
    await page.keyboard.up('Space');
    await page.keyboard.down('d');
    await page.waitForFunction(() => Arcade.Speedway.steer().word === 'r', null, {timeout: 12000});
    const sharp = await page.evaluate(() => Arcade.Speedway.steer());
    expect(sharp.steer).toBeGreaterThan(.75);
    expect(sharp.x).toBeGreaterThan(20);
    await expect(page.locator('#steerWord')).toHaveText('▶ SHARP');
    await expect(page.locator('#steerWord')).toBeVisible();
    await page.keyboard.up('d');
    await page.keyboard.down('f');
    await page.waitForFunction(() => Arcade.Speedway.steer().word === 'l', null, {timeout: 12000});
    await expect(page.locator('#steerWord')).toHaveText('FLAT ◀');
    await page.keyboard.up('f');
    // let go: the car eases back to the center
    await page.waitForFunction(() => Math.abs(Arcade.Speedway.steer().steer) < .05, null, {timeout: 5000});
    await expect(page.locator('#steerWord')).toBeHidden();
    expect(await page.evaluate(() => window.__ov)).toBe(0);
    expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').steerHint)).toBe(true);
    watch.check();
  });
}

test('the steering never changes the speed: the same drift, steering on or pinned to the center, drives the same', async ({page}) => {
  test.setTimeout(90000);
  const watch = await prepare(page, {store: device('trumpet')});
  await openSpeedway(page);
  await startTrack(page, 1);
  // the speed comes only from what is heard: the same heard score, with the car steered to the center or either
  // edge, gives exactly the same speed and distance (driveStep = the race loop's physics)
  const r = await page.evaluate(() => {
    const G = Arcade.Speedway.debug(), S = Arcade.Speedway.hearing();
    G.held = true;                                                   // (the loop stands still meanwhile)
    const run = steer => {
      G.v = .3; G.dist = 0; G.world = 0; G.nitro = false;
      const out = [];
      for (let i = 0; i < 50; i++) { G.steer = steer; S.state = i % 17 === 5 ? 'wrong' : 'on'; S.score = .5 + .4 * Math.sin(i); Arcade.Speedway.driveStep(.04); out.push(+G.v.toFixed(9)); }
      return {v: out, d: G.dist};
    };
    return [run(0), run(1), run(-1), run(.5)];
  });
  r.slice(1).forEach(x => { expect(x.v).toEqual(r[0].v); expect(x.d).toBe(r[0].d); });
  watch.check();
});

test('the intonation report: rows with the right signs, the matching tip, history saved; all in tune = "Right on pitch!"', async ({page}) => {
  test.setTimeout(300000);                                              // (a sharp car is slow: generous under a busy test machine)
  const watch = await prepare(page, {store: device('trumpet')});
  await openSpeedway(page);
  await startTrack(page, 1);
  await shortRace(page);
  // hold D (sharp) through every lap; the pit stops end by themselves
  await page.keyboard.down('d');
  await page.waitForFunction(() => document.querySelector('#resTuning'), null, {timeout: 200000});
  await page.keyboard.up('d');
  const rows = await page.$$eval('.tn-row', els => els.map(e => ({note: e.dataset.note, cents: +e.dataset.cents, word: e.querySelector('.tn-word').textContent})));
  expect(rows.length).toBeGreaterThan(0);
  rows.forEach(r => { expect(r.cents).toBeGreaterThan(12); expect(r.word).toMatch(/sharp/); expect(r.note).toMatch(/^[A-G][♯♭]?\d$/); });
  // the tip: every note sharp by more than 10 cents = the trumpet's general tip first
  await expect(page.locator('#tnTips li').first()).toContainText('Pull your main tuning slide out a little');
  const hist = await page.evaluate(() => Arcade.store.gameData('sustain-speedway').tuning.trumpet);
  expect(hist.length).toBe(1);
  expect(Object.values(hist[0].n).every(c => c > 12)).toBe(true);
  // the tip picker: a note-specific tip wins for its note (trumpet low D sharp), else the air tip
  const tips = await page.evaluate(() => [
    Arcade.Speedway.tipsFor([{key: 'D4', m: 25, n: 10}, {key: 'G4', m: 1, n: 10}], 12),
    Arcade.Speedway.tipsFor([{key: 'G4', m: -22, n: 10}, {key: 'C4', m: 3, n: 10}], 12)]);
  expect(tips[0].some(t => /3rd valve slide/.test(t))).toBe(true);
  expect(tips[1].some(t => /faster air/.test(t))).toBe(true);
  watch.check();
});

test('all in tune: "Right on pitch! Great ears." and a trend arrow from the history', async ({page}) => {
  test.setTimeout(300000);                                              // (a sharp car is slow: generous under a busy test machine)
  const past = {d: '2026-09-01', n: {}};
  ['C4', 'D4', 'E4', 'F4', 'G4'].forEach(k => { past.n[k] = 30; });
  const watch = await prepare(page, {store: device('trumpet', {gameData: {'sustain-speedway': {tuning: {trumpet: [past]}}}})});
  await openSpeedway(page);
  await startTrack(page, 1);
  await shortRace(page);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => document.querySelector('#resTuning'), null, {timeout: 200000});
  await page.keyboard.up('Space');
  await expect(page.locator('#tnGreat')).toHaveText('Right on pitch! Great ears.');
  await expect(page.locator('#tnTips')).toHaveCount(0);
  await expect(page.locator('.tn-trend.closer').first()).toContainText('getting closer!');
  expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').tuning.trumpet.length)).toBe(2);
  watch.check();
});
