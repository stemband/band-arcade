/* GAME RUNS (?demo, Chromium and WebKit): every game from PRESS START to its results screen, with its stars saved.
   Which games and how: tests/games.js. */
const {test, expect} = require('@playwright/test');
const {prepare, device, saved, starsIn} = require('./helpers');
const {RUNS, click} = require('./games');

/* overlays that open before or during a level and just want their main button (a story, an intro, "Turn on the
   microphone": the demo stands in for it). The results, pause and ending panels are left alone. */
const LEAVE = ['results', 'pausePanel', 'ending', 'finale', 'files', 'jumpWarn'];
async function dismiss(page) {
  return page.evaluate(leave => {
    for (const ov of document.querySelectorAll('.overlay')) {
      if (ov.hidden || leave.includes(ov.id) || !ov.getClientRects().length || getComputedStyle(ov).display === 'none') continue;
      const b = ov.querySelector('[data-act="go"]') || ov.querySelector('.btn-gold, .btn-primary') || ov.querySelector('button.btn');
      if (b && b.getClientRects().length) { b.click(); return ov.id || 'overlay'; }
    }
    return null;
  }, LEAVE);
}
const resultsShown = page => page.evaluate(() => { const r = document.getElementById('results'); return !!r && !r.hidden && r.getClientRects().length > 0; });

async function step(page, R, how) {
  if (R.next && await click(R.next)(page)) { await page.waitForTimeout(300); return; }   // one thing per step
  if (typeof how === 'function') return how(page);
  if (how === 'tap') await page.keyboard.press('Space');
  else if (how === 'wrong') await page.keyboard.press('w');
  else if (how === 'idle') { /* nothing: the notes run out on their own */ }
  else if (how === 'hold') { await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space'); }
  await page.waitForTimeout(R.every);
}

for (const R of RUNS) {
  test(`game run: ${R.name}`, async ({page, browserName}) => {
    test.skip(R.skip === browserName, `not in ${browserName}`);
    test.setTimeout(R.limit + 60_000);
    const watch = await prepare(page, {store: device(R.member, R.store)});
    await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
    if (R.setup) await R.setup(page);
    if (R.start) await R.start(page);
    else {
      await page.locator('.ls-card:not(.ls-endless)').first().click();
      await page.locator('.ls-start').click();
    }
    const done = R.done || resultsShown;
    const until = Date.now() + R.limit;
    while (!(await done(page)) && Date.now() < until) {
      if (await dismiss(page)) { await page.waitForTimeout(300); continue; }
      await step(page, R, R.play);
    }
    expect(await done(page), `${R.name}: the results screen never showed`).toBe(true);
    if (R.stars) expect(starsIn(await saved(page), R.key), `${R.name}: stars saved for level 1`).toBeGreaterThan(0);
    watch.check();
  });
}

/* ENDLESS: every game with an Endless card, from its card to GAME OVER (wrong notes / missed notes cost the hearts) */
for (const R of RUNS.filter(r => r.endless)) {
  test(`endless: ${R.name}`, async ({page}) => {
    test.setTimeout(150_000);
    const watch = await prepare(page, {store: device(R.member, R.store)});
    await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
    await page.locator('.ls-endless').first().click();
    await page.locator('.ls-start').click();
    const over = () => page.locator('#edOverTitle').isVisible().catch(() => false);
    const until = Date.now() + 100_000;
    while (!(await over()) && Date.now() < until) {
      if (await dismiss(page)) { await page.waitForTimeout(300); continue; }
      await step(page, Object.assign({}, R, {every: 400}), R.endlessPlay);
    }
    expect(await over(), `${R.name}: Endless never reached GAME OVER`).toBe(true);
    watch.check();
  });
}
