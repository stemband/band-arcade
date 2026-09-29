/* TWO ARCADE-WIDE PIECES:
   - BACK TO ARCADE GAMES in every pause menu (shared/ui-kit.js; game-runs.spec.js checks it is there, last, in every
     game): mid-level it asks first with the same leave question as BACK TO LEVELS ("Keep playing" stays in the level),
     then stops the microphone and lands on the arcade floor's ALL GAMES view with the game in front.
   - ALL GAMES' "No instrument needed" filter (lobby.js, games.js noInstrument): exactly the flagged games, each card
     tagged, remembered for the browser session only. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

async function startLevel(page) {
  await page.locator('.ls-card:not(.ls-endless)').first().click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 30 && !(await page.locator('#uiPauseBtn').isVisible().catch(() => false)); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await expect(page.locator('#uiPauseBtn')).toBeVisible();
}

test.describe('BACK TO ARCADE GAMES', () => {
  for (const id of ['ghost-notes', 'rhythm-dojo']) {
    test(`${id}: asks before leaving mid-level, then opens ALL GAMES with the game in front`, async ({page}) => {
      const watch = await prepare(page, {store: device('trumpet', id === 'rhythm-dojo' ? {gameData: {'rhythm-dojo': {mode: 'tap', calib: {clap: {ms: 0}, tap: {ms: 0}}}}} : {})});
      await page.goto(`${id}/index.html?demo&nostart`);
      await startLevel(page);
      await page.locator('#uiPauseBtn').click();
      const arcade = page.locator('#uiPauseArcade');
      await expect(arcade).toBeVisible();
      await expect(arcade).toHaveText('Back to Arcade Games');
      // the leave question: "Keep playing" stays in the level, still paused
      await arcade.click();
      await expect(page.locator('#uiConfirm')).toBeVisible();
      await page.locator('#uiConfirm [data-act=no]').click();
      await expect(page.locator('#uiConfirm')).toHaveCount(0);
      expect(page.url()).toContain(`${id}/index.html`);
      await expect(page.locator('#uiPause')).toBeVisible();
      // "Leave": the floor's ALL GAMES, this game's card in front (focused)
      await arcade.click();
      await page.locator('#uiConfirm [data-act=yes]').click();
      await page.waitForURL(/\/index\.html(\?[^#]*)?#all-games$/, {timeout: 10_000});
      await expect.poll(() => page.evaluate(() => Arcade.Arcade && Arcade.Arcade.state().view)).toBe('all');
      await expect(page.locator(`#allGrid .gcard[data-game="${id}"]`)).toBeFocused();
      watch.check();
    });
  }

  test('the microphone is stopped before the page changes', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await startLevel(page);
    await page.evaluate(() => {
      const P = Arcade.Pitch, stop = P.stop;
      P.stop = function () { sessionStorage.setItem('test-mic-stopped', '1'); return stop.apply(this, arguments); };
    });
    await page.locator('#uiPauseBtn').click();
    await page.locator('#uiPauseArcade').click();
    await page.locator('#uiConfirm [data-act=yes]').click();
    await page.waitForURL(/#all-games$/, {timeout: 10_000});
    expect(await page.evaluate(() => sessionStorage.getItem('test-mic-stopped'))).toBe('1');
    watch.check();
  });

  test('Dojo Duel: the kit\'s BACK TO ARCADE GAMES replaces the old EXIT (no duplicate)', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('dojo-duel/index.html?demo&nostart');
    await page.locator('#goBtn').click();
    await expect(page.locator('#uiPauseBtn')).toBeVisible({timeout: 15_000});
    await page.locator('#uiPauseBtn').click();
    const acts = await page.locator('#uiPause .ui-menu button').evaluateAll(bs => bs.map(b => b.textContent));
    expect(acts.filter(t => /exit|arcade/i.test(t))).toEqual(['Back to Arcade Games']);
    watch.check();
  });
});

const FLAGGED = ['note-ninja', 'keys-to-the-city', 'chime-heist', 'rhythm-dojo', 'ancient-ninja-scrolls', 'button-masher', 'dojo-duel'];

for (const [name, w, h] of [['phone', 390, 844], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['laptop', 1366, 768]]) {
  test(`ALL GAMES: "No instrument needed" shows exactly the flagged games (${name})`, async ({page}) => {
    await page.setViewportSize({width: w, height: h});
    const watch = await prepare(page, {store: device()});
    await page.goto('index.html?demo&nostart#all-games');
    const chip = page.locator('#niFilter');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    const all = await page.locator('#allGrid .gcard').evaluateAll(cs => cs.map(c => c.dataset.game));
    const flagged = await page.evaluate(() => Arcade.floorGames().filter(g => g.noInstrument).map(g => g.id));
    expect(flagged.sort()).toEqual(FLAGGED.slice().sort());
    // each flagged card carries the tag, no other card does
    for (const id of all) await expect(page.locator(`#allGrid .gcard[data-game="${id}"] .ni-tag`)).toHaveCount(FLAGGED.includes(id) ? 1 : 0);
    // on: exactly the flagged games
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    const shown = await page.locator('#allGrid .gcard').evaluateAll(cs => cs.map(c => c.dataset.game));
    expect(shown.slice().sort()).toEqual(all.filter(id => FLAGGED.includes(id)).sort());
    // nothing sideways, the chip fully on screen
    const box = await chip.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    // remembered for this browser session (a reload keeps it) …
    await page.reload();
    await expect(page.locator('#niFilter')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#allGrid .gcard')).toHaveCount(shown.length);
    // … and off again shows every game
    await page.locator('#niFilter').click();
    await expect(page.locator('#allGrid .gcard')).toHaveCount(all.length);
    watch.check();
  });
}

test('ALL GAMES: the filter is session-only (a new browser session starts with every game)', async ({browser}) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await prepare(page, {store: device()});
  await page.goto('index.html?demo&nostart#all-games');
  await page.locator('#niFilter').click();
  expect(await page.evaluate(() => localStorage.getItem('bandarcade.noinst'))).toBeNull();
  await ctx.close();
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await prepare(p2, {store: device()});
  await p2.goto('index.html?demo&nostart#all-games');
  await expect(p2.locator('#niFilter')).toHaveAttribute('aria-pressed', 'false');
  await ctx2.close();
});
