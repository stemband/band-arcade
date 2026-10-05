/* GAME RUNS (?demo, Chromium and WebKit): every game from PRESS START to its results screen, with its stars saved.
   Which games and how: tests/games.js. On the way, in every game: PAUSE (the shared pause menu opens), SETTINGS
   (a setting changed), RESUME, and at the end the results screen's buttons are there and LEVELS goes back.
   THE RESULTS FIT A PHONE: each results screen and Endless GAME OVER, just filled by the run, is checked at the phone
   sizes (helpers.js PHONES, windowFits) before LEVELS.
   GALLERY=1 also saves screenshots of each game's level select, pause menu, settings panel and results screen into
   docs/gallery/ (docs/gallery.html shows them): `GALLERY=1 npx playwright test game-runs --project=chromium`. */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device, saved, starsIn, ROOT, CPU_DRAWING, windowFits, PHONES} = require('./helpers');
test.use(CPU_DRAWING);                       // WebKit draws on the CPU here: every game is a canvas game (helpers.js CPU_DRAWING: fewer page crashes on CI)
const {RUNS, click} = require('./games');
const GALLERY = !!process.env.GALLERY;
const shot = (page, id, kind) => GALLERY ? page.screenshot({path: path.join(ROOT, 'docs/gallery', `${id}-${kind}.jpg`), type: 'jpeg', quality: 72}) : null;

/* the shared pause menu (shared/ui-kit.js), once, as soon as the level shows its pause button */
async function pauseCheck(page, R) {
  const btn = page.locator('#uiPauseBtn');
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click();
  await expect(page.locator('#uiPause'), `${R.name}: the pause menu`).toBeVisible();
  const before = await page.evaluate(() => Arcade.UI.state().pause.paused);
  expect(before, `${R.name}: paused`).toBe(true);
  await shot(page, R.id, 'pause');
  // every game's menu ends with BACK TO ARCADE GAMES (the kit's; secondary), right after the game's own BACK TO …
  const acts = await page.locator('#uiPause .ui-menu button').evaluateAll(bs => bs.map(b => [b.dataset.act, b.className, b.textContent]));
  expect(acts[acts.length - 1], `${R.name}: BACK TO ARCADE GAMES closes the pause menu`).toEqual(['arcade', 'btn btn-secondary', 'Back to Arcade Games']);
  const lv = acts.findIndex(a => a[0] === 'levels');
  if (lv >= 0) expect(lv, `${R.name}: after the game's own BACK TO …`).toBe(acts.length - 2);
  await page.locator('#uiPause [data-act=settings]').click();
  await expect(page.locator('#uiSettings')).toBeVisible();
  await shot(page, R.id, 'settings');
  const vol = page.locator('#uiSettings input[data-k=sfxVol]');
  if (await vol.isEnabled()) await vol.fill('55');
  await page.locator('#uiSettings [data-act=done]').click();
  await expect(page.locator('#uiSettings')).toHaveCount(0);
  await page.locator('#uiPause [data-act=resume]').click();
  await expect(page.locator('#uiPause')).toBeHidden();
  return true;
}

/* THE RESULTS FIT A PHONE (docs/engine/testing.md PHONE WIDTH): the results screen this run just filled (stars, score
   sheet, the game's extras, UNLOCKED!), resized to each phone size: nothing wider than the screen (helpers.js tooWide)
   and its main button reachable; then back to the run's own size. */
async function resultsFit(page, R, what = 'the results screen') {
  const size = page.viewportSize();
  for (const [label, w, h] of PHONES) {
    await page.setViewportSize({width: w, height: h});
    expect.soft(await windowFits(page, '#results'), `${R.name}: ${what} on a ${label} phone`).toEqual([]);
  }
  await page.setViewportSize(size);
}

/* overlays that open before or during a level and just want their main button (a story, an intro, "Turn on the
   microphone": the demo stands in for it). The results, pause and ending panels are left alone. */
const LEAVE = ['results', 'uiPause', 'uiSettings', 'uiConfirm', 'ending', 'finale', 'files'];
async function dismiss(page) {
  return page.evaluate(leave => {
    for (const ov of document.querySelectorAll('.overlay')) {
      if (ov.hidden || leave.includes(ov.id) || !ov.getClientRects().length || getComputedStyle(ov).display === 'none') continue;
      const b = ov.querySelector('[data-act="go"]') || ov.querySelector('.btn-primary') || ov.querySelector('button.btn');
      if (b && b.getClientRects().length) { b.click(); return ov.id || 'overlay'; }
    }
    return null;
  }, LEAVE);
}
/** what the page looks like right now, for a failure message (the log is all Mat sees without the screenshots) */
const diag = page => page.evaluate(() => {
  const A = window.Arcade || {}, vis = e => e && !e.hidden && e.getClientRects().length > 0;
  const overlays = [...document.querySelectorAll('.overlay, .ps-screen')].filter(vis).map(e => e.id || e.className);
  const prompt = (document.getElementById('prompt') || {}).textContent || '';
  let state = null;
  try {
    const hook = (A.Showtime && A.Showtime.debug && (() => { const G = A.Showtime.debug(); return G && {t: G.t, rebooted: G.rebooted, total: G.total, lights: G.lights, paused: G.paused, bots: G.bots.map(b => b.state + ':' + b.left)}; }))
      || (A.Blocktave && (() => { const s = A.Blocktave.state(); return {screen: s.screen, inv: s.inv, held: s.held, card: s.card, panel: s.panel, stats: A.Blocktave.demo && A.Blocktave.demo.stats()}; })) || (A.Highway && A.Highway.state) || (A.Duel && A.Duel.state) || (A.FaceOff && A.FaceOff.state) || (A.Quest && A.Quest.battleState) || null;
    state = hook ? hook() : null;
  } catch (e) { state = 'state error: ' + e.message; }
  const sfx = A.Sfx && A.Sfx.output ? (A.Sfx.output() ? 'audio running' : 'no audio output') : '';
  return JSON.stringify({url: location.pathname + location.search, overlays, prompt: prompt.slice(0, 80), sfx, listening: A.Pitch && A.Pitch.listening ? A.Pitch.listening() : null, state}).slice(0, 1500);
});
const resultsShown = page => page.evaluate(() => { const r = document.getElementById('results'); return !!r && !r.hidden && r.getClientRects().length > 0; });

/* A game puts the focus on its results screen's NEXT LEVEL button: a key pressed just as the results open would press
   it and start Level 2. So right before every key press: stop if the results are up, and take the focus off buttons
   (the demo keys are read by the whole page, never by a button). */
const readyForKeys = page => page.evaluate(() => {
  const r = document.getElementById('results');
  if (r && !r.hidden && r.getClientRects().length) return false;
  const a = document.activeElement;
  if (a && a !== document.body && /^(BUTTON|A|INPUT)$/.test(a.tagName)) a.blur();
  return true;
});
async function step(page, R, how) {
  if (R.next && await click(R.next)(page)) { await page.waitForTimeout(300); return; }   // one thing per step
  if (typeof how === 'function') return how(page);
  if (how !== 'idle' && !(await readyForKeys(page))) return;
  if (how === 'tap') await page.keyboard.press('Space');
  else if (how === 'wrong') await page.keyboard.press('w');
  else if (how === 'idle') { /* nothing: the notes run out on their own */ }
  else if (how === 'hold') { await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space'); }
  await page.waitForTimeout(R.every);
}

/* GAME STARTS (@quick: QUICK CHECK's "every game opens and a level starts"): open the game, Level 1, START, past its
   intro and "Turn on the microphone" overlays (and a game's own first step, e.g. Ancient Ninja Scrolls' TRAIN) until the level is playing (its pause button shows; Arcade Quest: the
   battle), with no JavaScript error. The full level is the game run below. */
for (const R of RUNS) {
  test(`game starts: ${R.name}`, {tag: '@quick'}, async ({page, browserName}) => {
    test.skip(R.skip === browserName, `not in ${browserName}`);
    const watch = await prepare(page, {store: device(R.member, typeof R.store === 'function' ? R.store(browserName) : R.store)});
    await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
    if (R.setup) await R.setup(page);
    if (R.start) await R.start(page);
    else {
      await page.locator('.ls-card:not(.ls-endless)').first().click();
      await page.locator('.ls-start').click();
    }
    const playing = R.pause === false
      ? () => page.evaluate(() => { const Q = Arcade.Quest, b = Q && Q.battleState && Q.battleState(); return !!b; })
      : () => page.locator('#uiPauseBtn').isVisible().catch(() => false);
    await expect.poll(async () => { if (await playing()) return true; await dismiss(page); if (typeof R.play === 'function') await step(page, R, R.play); return playing(); },
      {message: `${R.name}: the level never started`, timeout: 30_000, intervals: [100, 250, 500]}).toBe(true);
    watch.check();
  });
}

for (const R of RUNS) {
  test(`game run: ${R.name}`, R.slow ? {tag: '@slow'} : {}, async ({page, browserName}) => {
    test.skip(R.skip === browserName, `not in ${browserName}`);
    test.setTimeout(R.limit + 60_000);
    const watch = await prepare(page, {store: device(R.member, typeof R.store === 'function' ? R.store(browserName) : R.store)});
    if (GALLERY) await page.setViewportSize({width: 1180, height: 820});
    await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
    if (R.setup) await R.setup(page);
    if (GALLERY) { await page.waitForTimeout(900); await shot(page, R.id, 'levels'); }
    if (R.start) await R.start(page);
    else {
      await page.locator('.ls-card:not(.ls-endless)').first().click();
      await page.locator('.ls-start').click();
    }
    const done = R.done || resultsShown;
    const until = Date.now() + R.limit;
    let paused = R.pause === false;
    while (!(await done(page)) && Date.now() < until) {
      if (await dismiss(page)) { await page.waitForTimeout(300); continue; }
      if (!paused && await pauseCheck(page, R)) { paused = true; continue; }
      await step(page, R, R.play);
    }
    if (!(await done(page))) expect(false, `${R.name}: the results screen never showed. The page: ${await diag(page)}`).toBe(true);
    expect(paused, `${R.name}: the pause button showed during the level`).toBe(true);
    if (R.stars) expect(starsIn(await saved(page), R.key), `${R.name}: stars saved for level 1`).toBeGreaterThan(0);
    if (!R.done) {                                   // the shared results screen: its buttons, and LEVELS goes back
      await page.waitForTimeout(GALLERY ? 1800 : 300);
      await shot(page, R.id, 'results');
      await resultsFit(page, R);
      await expect(page.locator('#resRetry')).toBeVisible();
      await page.locator('#resLevels').click();
      await expect(page.locator('#results')).toBeHidden();
    }
    watch.check();
  });
}

/* ENDLESS: every game with an Endless card, from its card to GAME OVER (wrong notes / missed notes cost the hearts) */
for (const R of RUNS.filter(r => r.endless)) {
  test(`endless: ${R.name}`, R.endlessSlow ? {tag: '@slow'} : {}, async ({page, browserName}) => {
    test.setTimeout(150_000);
    const watch = await prepare(page, {store: device(R.member, typeof R.store === 'function' ? R.store(browserName) : R.store)});
    await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
    await page.locator('.ls-endless').first().click();
    await page.locator('.ls-start').click();
    const over = () => page.locator('#results.ed-over').isVisible().catch(() => false);
    const until = Date.now() + 100_000;
    while (!(await over()) && Date.now() < until) {
      if (await dismiss(page)) { await page.waitForTimeout(300); continue; }
      await step(page, Object.assign({}, R, {every: 400}), R.endlessPlay);
    }
    if (!(await over())) expect(false, `${R.name}: Endless never reached GAME OVER. The page: ${await diag(page)}`).toBe(true);
    await resultsFit(page, R, 'GAME OVER');
    watch.check();
  });
}
