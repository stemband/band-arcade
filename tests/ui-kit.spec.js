/* THE UI KIT (shared/ui-kit.js): the pause menu, the results screen, the settings panel and the confirm dialog every
   game shares. Opened and closed with the mouse and the keyboard (focus inside, Tab stays inside, Esc, arrows), and
   the settings remembered on the device and shared by every game. Ghost Notes is the page (any game would do). */
const {test, expect} = require('@playwright/test');
const {prepare, device, saved} = require('./helpers');

async function startLevel(page) {
  await page.locator('.ls-card:not(.ls-endless)').first().click();
  await page.locator('.ls-start').click();
  const mic = page.locator('[data-act=go]');
  if (await mic.isVisible().catch(() => false)) await mic.click();          // "Turn on the microphone": the demo stands in
  await expect(page.locator('#uiPauseBtn')).toBeVisible();
}
const focusedText = page => page.evaluate(() => (document.activeElement && document.activeElement.textContent || '').trim());

test.describe('ui kit', () => {
  test('pause: the button, Esc and P; the menu takes the focus, arrows move, Tab stays inside, the clock stops', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await expect(page.locator('#topbar .brand')).toBeVisible();
    await startLevel(page);
    await expect(page.locator('#topbar .brand')).toBeHidden();              // in a level the back link is the pause button
    await page.locator('#uiPauseBtn').click();
    await expect(page.locator('#uiPause')).toBeVisible();
    expect(await focusedText(page)).toBe('Resume');
    await page.keyboard.press('ArrowDown');
    expect(await focusedText(page)).toBe('Restart');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');           // Tab never leaves the menu
    expect(await page.evaluate(() => !!document.activeElement.closest('#uiPause'))).toBe(true);
    // the note clock doesn't move while paused
    const t1 = await page.locator('#timer i').evaluate(e => e.style.transform);
    await page.waitForTimeout(1200);
    expect(await page.locator('#timer i').evaluate(e => e.style.transform)).toBe(t1);
    expect(await page.evaluate(() => Arcade.Pitch.listening())).toBe(false);   // the microphone isn't listening
    await page.keyboard.press('Escape');                                     // Esc = resume
    await expect(page.locator('#uiPause')).toBeHidden();
    expect(await page.evaluate(() => Arcade.UI.state().pause.paused)).toBe(false);
    await page.keyboard.press('p');                                          // P = pause
    await expect(page.locator('#uiPause')).toBeVisible();
    await page.locator('#uiPause [data-act=resume]').click();
    await expect(page.locator('#uiPause')).toBeHidden();
    watch.check();
  });

  test('pause: BACK TO LEVELS asks first; No keeps playing, Leave goes to the level select', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await startLevel(page);
    await page.keyboard.press('Escape');
    await page.locator('#uiPause [data-act=levels]').click();
    await expect(page.locator('#uiConfirm')).toBeVisible();
    expect(await focusedText(page)).toBe('Keep playing');                    // the safe answer has the focus
    await page.keyboard.press('Escape');
    await expect(page.locator('#uiConfirm')).toHaveCount(0);
    await expect(page.locator('#uiPause')).toBeVisible();                    // still paused, still in the level
    await page.locator('#uiPause [data-act=levels]').click();
    await page.locator('#uiConfirm [data-act=yes]').click();
    await expect(page.locator('#hub')).toBeVisible();
    await expect(page.locator('#uiPauseBtn')).toBeHidden();
    await expect(page.locator('#topbar .brand')).toBeVisible();              // and on the level select, back = the arcade
    watch.check();
  });

  test('pause: hiding the tab pauses the level', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await startLevel(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('#uiPause')).toBeVisible();
    watch.check();
  });

  test('results: stars, tiles, new best, button order, the yellow button has the focus, arrows move', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    const clicks = [];
    await page.exposeFunction('clicked', n => clicks.push(n));
    await page.evaluate(() => Arcade.UI.results.show({stars: 2, title: 'Level cleared', msg: 'Nice!', tiles: [['Notes', '5/6'], ['Score', 900]],
      best: 'Best: 900', newBest: true, next: {label: 'Next level', onClick: () => window.clicked('next')},
      retry: {label: 'Try again', onClick: () => window.clicked('retry')}, levels: {label: 'Levels', onClick: () => window.clicked('levels')}, announce: false}));
    const r = page.locator('#results');
    await expect(r).toBeVisible();
    await expect(r.locator('.ui-stars .on')).toHaveCount(2);
    await expect(r.locator('.ui-tile')).toHaveCount(2);
    await expect(r.locator('.ui-newbest')).toBeVisible();
    expect(await r.locator('.ui-res-acts button').allTextContents()).toEqual(['Next level', 'Try again', 'Levels']);
    await expect(r.locator('#resNext')).toHaveClass(/btn-primary/);
    expect(await focusedText(page)).toBe('Next level');
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page)).toBe('Try again');
    await page.keyboard.press('Enter');
    expect(clicks).toEqual(['retry']);
    // no next level: TRY AGAIN is the yellow one
    await page.evaluate(() => Arcade.UI.results.show({stars: 0, title: 'So close', next: {hidden: true}, retry: {label: 'Try again'}, levels: {label: 'Levels'}, announce: false}));
    await expect(r.locator('#resNext')).toHaveCount(0);
    await expect(r.locator('#resRetry')).toHaveClass(/btn-primary/);
    await page.evaluate(() => Arcade.UI.results.hide());
    await expect(r).toBeHidden();
    watch.check();
  });

  test('settings: opens from the top bar, Esc closes (focus back), every setting is remembered and shared', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    const btn = page.locator('#topbar .snd-open');
    await btn.click();
    const s = page.locator('#uiSettings');
    await expect(s).toBeVisible();
    await expect(s.locator('[data-k=sfx]')).toBeFocused();
    await s.locator('input[data-k=sfxVol]').fill('35');
    await s.locator('[data-k=sfx]').click();                                  // sound off (the volumes wait, dimmed)
    await expect(s.locator('input[data-k=sfxVol]')).toBeDisabled();
    await s.locator('input[data-k=sens]').fill('70');
    await s.locator('[data-k=motion]').click();                               // motion off
    expect(await page.evaluate(() => document.documentElement.classList.contains('no-motion') && Arcade.reducedMotion.matches)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(s).toHaveCount(0);
    await expect(btn).toBeFocused();
    const st = await saved(page);
    expect(st.sfx).toBe(false);
    expect(Math.round(st.sfxVol * 100)).toBe(35);
    expect(st.sens).toBe(70);
    expect(st.gameData.bg.motion).toBe(false);
    // another game (and the lobby) shows the same settings
    await page.goto('note-storm/index.html?demo&nostart');
    expect(await page.evaluate(() => document.documentElement.classList.contains('no-motion'))).toBe(true);
    await page.locator('#topbar .snd-open').click();
    await expect(page.locator('#uiSettings [data-k=sfx]')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#uiSettings input[data-k=sfxVol]')).toHaveValue('35');
    await expect(page.locator('#uiSettings input[data-k=sens]')).toHaveValue('70');
    await expect(page.locator('#uiSettings [data-k=motion]')).toHaveAttribute('aria-checked', 'false');
    await page.locator('#uiSettings [data-act=done]').click();
    await page.goto('index.html?demo&nostart');
    await page.locator('#soundCtl .snd-open').click();
    await expect(page.locator('#uiSettings input[data-k=ambVol]')).toBeVisible();   // the lobby also has the arcade hum
    await expect(page.locator('#uiSettings .bk-btn')).toBeVisible();                // and Backup / Restore
    watch.check();
  });

  test('settings from the pause menu come back to the pause menu', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await startLevel(page);
    await page.keyboard.press('Escape');
    await page.locator('#uiPause [data-act=settings]').click();
    await expect(page.locator('#uiSettings')).toBeVisible();
    await page.keyboard.press('Escape');                                      // closes Settings only
    await expect(page.locator('#uiSettings')).toHaveCount(0);
    await expect(page.locator('#uiPause')).toBeVisible();
    await expect(page.locator('#uiPause [data-act=settings]')).toBeFocused();
    watch.check();
  });

  test('confirm and toast', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    const p = page.evaluate(() => Arcade.UI.confirm({title: 'Start over?', text: 'Sure?', yes: 'Yes', no: 'No', danger: true}));
    await expect(page.locator('#uiConfirm')).toBeVisible();
    await expect(page.locator('#uiConfirm [data-act=no]')).toBeFocused();
    await page.locator('#uiConfirm [data-act=yes]').click();
    expect(await p).toBe(true);
    await page.evaluate(() => Arcade.UI.toast('Clear Level 1 to unlock'));
    await expect(page.locator('.ui-toast')).toHaveText('Clear Level 1 to unlock');
    await expect(page.locator('.ui-toast')).toHaveCount(0, {timeout: 5000});
    watch.check();
  });
});
