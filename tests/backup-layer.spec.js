/* BACKUP / RESTORE opens ON TOP of whatever opened it (shared/backup.js + UI.layer in shared/ui-kit.js):
   from the arcade's Settings panel, Select Player's card, Arcade Quest's title (ENTER SAVE CODE) and a Save Jukebox,
   and the app's first launch. Each time: the panel is the topmost thing where its code box is, the code is visible,
   the focus is inside (Tab stays there), a RESTORE confirmation comes up above it, Esc closes it and the focus goes back
   to the button that opened it. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

/** the point in the middle of an element, and which overlay the page draws there */
async function topAt(page, sel) {
  return page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return {missing: true};
    el.scrollIntoView({block: 'center'});
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      inBackup: !!(hit && hit.closest('.bk-overlay')), inConfirm: !!(hit && hit.closest('#uiConfirm')),
      onScreen: r.width > 0 && r.height > 0 && y >= 0 && y <= innerHeight, hit: hit ? (hit.id || hit.className) : null,
    };
  }, sel);
}

/** open Backup with `opener` (a locator), then check everything the fix promises */
async function check(page, opener) {
  await opener.focus();
  await opener.click();
  const bk = page.locator('.bk-overlay');
  await expect(bk).toBeVisible();
  // the focus is inside the panel (the first button), and Tab never leaves it
  await expect.poll(() => page.evaluate(() => !!document.activeElement.closest('.bk-overlay'))).toBe(true);
  expect(await page.evaluate(() => document.activeElement.classList.contains('bk-make'))).toBe(true);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.bk-overlay')), `Tab ${i}`).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('.bk-overlay'))).toBe(true);

  // MAKE: the code box is visible and the panel is the topmost thing there
  await page.locator('.bk-overlay .bk-make').click();
  await expect(page.locator('.bk-overlay .bk-code')).toBeVisible();
  await expect.poll(() => page.locator('.bk-overlay .bk-code').inputValue()).toMatch(/^BKP/);
  const at = await topAt(page, '.bk-overlay .bk-code');
  expect(at, JSON.stringify(at)).toMatchObject({inBackup: true, onScreen: true});
  const inAt = await topAt(page, '.bk-overlay .bk-in');
  expect(inAt, JSON.stringify(inAt)).toMatchObject({inBackup: true, onScreen: true});

  // RESTORE: its confirmation comes up above the Backup panel; No keeps Backup open
  await page.locator('.bk-overlay .bk-in').fill(await page.locator('.bk-overlay .bk-code').inputValue());
  await page.locator('.bk-overlay .bk-restore').click();
  const conf = page.locator('#uiConfirm');
  await expect(conf).toBeVisible();
  const z = await page.evaluate(() => ({bk: +getComputedStyle(document.querySelector('.bk-overlay')).zIndex,
    conf: +getComputedStyle(document.querySelector('#uiConfirm').closest('.ui-confirm-ov') || document.querySelector('#uiConfirm')).zIndex}));
  expect(z.conf, JSON.stringify(z)).toBeGreaterThan(z.bk);
  const btn = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#uiConfirm button')].find(x => x.offsetParent);
    const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!(hit && hit.closest('#uiConfirm'));
  });
  expect(btn).toBe(true);
  await page.keyboard.press('Escape');                                   // Esc = No (the kit's confirm)
  await expect(conf).toBeHidden();
  await expect(bk).toBeVisible();                                        // Esc on the confirmation never closes Backup too

  // Esc closes Backup; the focus goes back to its opener
  await page.mouse.move(1, 1);                                          // (Arcade Quest's menus follow the mouse: keep it off them)
  await page.locator('.bk-overlay .bk-in').focus();
  await page.keyboard.press('Escape');
  await expect(bk).toHaveCount(0);
  await expect.poll(() => opener.evaluate(el => el === document.activeElement)).toBe(true);
}

test('from the arcade Settings panel', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.UI && Arcade.Backup);
  await page.evaluate(() => Arcade.UI.settings.open({lobby: true}));
  const opener = page.locator('#uiSettings .bk-btn');
  await expect(opener).toBeVisible();
  await check(page, opener);
  await expect(page.locator('#uiSettings')).toBeVisible();                // the Settings panel is still there under it
  watch.check();
});

test("from Select Player's card", async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?game=ghost-notes&demo&nostart');
  const opener = page.locator('#backupBtn');
  await expect(opener).toBeVisible();
  await check(page, opener);
  watch.check();
});

test("from Arcade Quest's title (Enter save code)", async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('arcade-quest/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.talk && Arcade.Backup);
  await page.evaluate(() => { Arcade.Quest.talk.enterCode(); });
  const opener = page.locator('.q-codep [data-a="backup"]');
  await expect(opener).toBeVisible();
  await check(page, opener);
  await expect(page.locator('#qCodeIn')).toBeVisible();                   // ENTER SAVE CODE is still open under it
  watch.check();
});

test('from an Arcade Quest Save Jukebox (the save code panel)', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('arcade-quest/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.save && Arcade.Backup);
  await page.evaluate(() => { const Q = Arcade.Quest; Q.save.get(); Q.save.write(); Q.talk.showCode(); });
  const opener = page.locator('.q-codep .q-btn', {hasText: 'Backup'});
  await expect(opener).toBeVisible();
  await check(page, opener);
  await expect(page.locator('.q-codep .q-code')).toBeVisible();           // the save code panel is still under it
  watch.check();
});

test("from the app's first launch (Bring your progress)", async ({page}) => {
  const watch = await prepare(page, {store: null, visit: false});
  await page.goto('index.html?standalone');
  await page.locator('#pressStart').click();
  await expect(page.locator('.app-welcome .app-panel')).toBeVisible();
  const opener = page.locator('.app-welcome .app-backup');
  await expect(opener).toBeVisible();
  await check(page, opener);
  await expect(page.locator('.app-welcome .app-panel')).toBeVisible();
  watch.check();
});

test('the iPad keyboard never hides the RESTORE box', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  const watch = await prepare(page, {store: device('clarinet', {avatarOffered: true})});
  await page.goto('index.html?game=ghost-notes&demo&nostart');
  await page.locator('#backupBtn').click();
  // the overlay scrolls itself when the panel is taller than the screen
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.bk-overlay')).overflowY)).toBe('auto');
  // pretend the on-screen keyboard took the bottom 360 px: the RESTORE box moves into what's left
  await page.evaluate(() => {
    const vv = window.visualViewport;
    Object.defineProperty(vv, 'height', {configurable: true, get: () => innerHeight - 360});
    document.querySelector('.bk-overlay .bk-in').focus();
    vv.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => page.evaluate(() => {
    const r = document.querySelector('.bk-overlay .bk-in').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight - 360;
  }), {timeout: 3000}).toBe(true);
  watch.check();
});
