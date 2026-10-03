/* SUSTAIN SPEEDWAY: THE PIT COUNTDOWN (sustain-speedway/game.js pitCoach). The pit stop (levels.js pitSec, on the race
   clock) is 4 equal beats: "Breathe in…", then a big 3, 2, 1 (at 1/4, 2/4, 3/4 of pitSec), then leavePit()'s "GO!"
   banner as the race resumes. Pausing mid-pit freezes the count; each number pops in gently, except under reduced motion. */
const {test, expect} = require('@playwright/test');
const {prepare, device, CPU_DRAWING} = require('./helpers');
test.use(CPU_DRAWING);
const {openSpeedway, startTrack, shortRace} = require('./speedway-helpers');

const store = () => device('trumpet', {gameData: {'sustain-speedway': {steerHint: true, gfx: 'lite'}}});
/** drive the first (short) lap and stop the race clock (G.held) the moment the pit stop starts */
async function intoPit(page) {
  await startTrack(page, 1);
  await shortRace(page, 2);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => { const G = Arcade.Speedway.debug(); if (G && G.phase === 'pit') { G.held = true; return true; } return false; }, null, {timeout: 60000, polling: 'raf'});
  await page.keyboard.up('Space');
}
/** the coach at `f` of the pit stop (+ `ms` milliseconds) on the race clock */
const coachAt = (page, f, ms = 0) => page.evaluate(([f, ms]) => {
  const G = Arcade.Speedway.debug(); G.clock = G.pitStart + f * Arcade.Speedway.rules.pitSec + ms / 1000; Arcade.Speedway.pitCoach();
  const c = document.querySelector('#coach'), sub = document.querySelector('#coachSub');
  return {text: c.textContent, num: c.classList.contains('coach-num'), sub: sub.hidden ? null : sub.textContent, anim: getComputedStyle(c).animationName};
}, [f, ms]);

test('pit stop: Breathe in…, then 3, 2, 1 at each quarter of pitSec, frozen while paused, then GO!', async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: store()});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await openSpeedway(page);
  await intoPit(page);
  await expect(page.locator('#pit')).toBeVisible();
  expect(await page.evaluate(() => Arcade.Speedway.rules.pitSec)).toBe(3.5);
  let c = await coachAt(page, 0);
  expect(c).toMatchObject({text: 'Breathe in…', num: false, sub: null});
  for (const [f, n] of [[.25, '3'], [.5, '2'], [.75, '1']]) {
    expect((await coachAt(page, f, -50)).text).not.toBe(n);              // ±50 ms of each quarter
    c = await coachAt(page, f, 50);
    expect(c).toMatchObject({text: n, num: true, sub: 'Breathe in… get ready!', anim: 'coach-pop'});
  }
  // the beats scale with pitSec (beat = pitSec / 4)
  await page.evaluate(() => { window.SPEEDWAY_RULES.pitSec = 2; });
  expect((await coachAt(page, 0)).text).toBe('Breathe in…');
  expect((await coachAt(page, .25, 50)).text).toBe('3');
  await page.evaluate(() => { window.SPEEDWAY_RULES.pitSec = 3.5; });

  // the real pause menu mid-pit: the race clock and the count stand still
  await coachAt(page, .3);
  await page.evaluate(() => { Arcade.Speedway.debug().held = false; });
  await page.keyboard.press('p');
  await expect(page.locator('#uiPause')).toBeVisible();
  const before = await page.evaluate(() => Arcade.Speedway.debug().clock);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => Arcade.Speedway.debug().clock)).toBe(before);
  await expect(page.locator('#coach')).toHaveText('3');
  expect(await page.evaluate(() => Arcade.Speedway.debug().phase)).toBe('pit');
  await page.keyboard.press('Escape');
  await expect(page.locator('#uiPause')).toBeHidden();
  // resumed: the count goes on (2, 1), then GO! as the race resumes
  await expect(page.locator('#coach')).toHaveText('2', {timeout: 3000});
  await expect(page.locator('#coach')).toHaveText('1', {timeout: 3000});
  await page.waitForFunction(() => Arcade.Speedway.debug().phase === 'race', null, {timeout: 5000});
  await expect(page.locator('#banner')).toHaveText('GO!');
  await expect(page.locator('#pit')).toBeHidden();
  watch.check();
});

test('pit countdown: reduced motion shows the numbers with no pop', async ({page}) => {
  test.setTimeout(90000);
  const watch = await prepare(page, {store: store()});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await openSpeedway(page);
  await intoPit(page);
  const c = await coachAt(page, .5, 50);
  expect(c).toMatchObject({text: '2', num: true, anim: 'none'});
  watch.check();
});
