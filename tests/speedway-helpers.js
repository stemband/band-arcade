/* Sustain Speedway test helpers: open the game in ?demo, start a track and wait until the race is on. */
const URL = 'sustain-speedway/index.html?demo&nostart';

async function openSpeedway(page, extra = '') {
  await page.goto(URL + extra);
  await page.waitForFunction(() => window.Arcade && Arcade.Speedway && document.querySelector('.trk[data-l="1"]'));
}
/** start track `lv` and wait for GO (the microphone reminder / intro panels are clicked through) */
async function startTrack(page, lv = 1, {skipChecks = true} = {}) {
  await page.evaluate(lv => { document.querySelector(`.trk[data-l="${lv}"]`).click(); document.querySelector('.ls-start').click(); }, lv);
  for (let i = 0; i < 60; i++) {
    const phase = await page.evaluate(() => { const G = Arcade.Speedway.debug(); return G && G.phase; });
    if (phase === 'race') return;
    await page.evaluate(skip => {
      const b = document.querySelector('.overlay:not(#results):not([hidden]) [data-act="go"], .overlay:not(#results):not([hidden]) .btn-primary');
      if (b && b.getClientRects().length) b.click();
      if (skip && Arcade.Speedway.skipChecks) Arcade.Speedway.skipChecks();
    }, skipChecks);
    await page.waitForTimeout(250);
  }
  throw new Error('the race never started');
}
/** finish the race at once from ?demo: every lap driven by holding Space (fast: the rivals are slowed to a crawl) */
async function driveToFinish(page, key = 'Space', ms = 180_000) {
  await page.evaluate(() => { const G = Arcade.Speedway.debug(); G.rivals.forEach(r => { r.pace = .01; }); });
  await page.keyboard.down(key);
  await page.waitForFunction(() => { const G = Arcade.Speedway.debug(); return !G || G.phase === 'done' || G.phase === 'pit'; }, null, {timeout: ms});
}
/** a short race (tests): every lap `sec` seconds at full speed, the rivals crawling */
async function shortRace(page, sec = 3) {
  await page.evaluate(sec => { const G = Arcade.Speedway.debug(); G.lens = G.lens.map(() => sec); G.total = sec * G.lens.length; G.rivals.forEach(r => { r.pace = .01; }); }, sec);
}
module.exports = {URL, openSpeedway, startTrack, driveToFinish, shortRace};
