/* ARCADE QUEST'S ON-SCREEN CONTROLS (engine/controls.js): no zooming on iPads (the viewport, rapid taps on the pad,
   the RESET VIEW button when the page got zoomed anyway), and ARRANGE CONTROLS (drag, size, opacity, reset, saved per
   device and per orientation, always on screen, never over a menu or the text). Touch screens: hasTouch. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const LAND = {width: 1180, height: 820}, PORT = {width: 820, height: 1180};
const store = () => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: {textSpeed: 'instant', dodge: 'easy', assist: true}}}});

async function boot(page, size = LAND) {
  await page.setViewportSize(size);
  const watch = await prepare(page, {store: store()});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena' && Arcade.Quest.arrange);
  await page.waitForTimeout(300);
  return watch;
}
const st = page => page.evaluate(() => Arcade.Quest.arrange.state());
const center = r => ({x: r.left + r.width / 2, y: r.top + r.height / 2});
async function drag(page, k, to) {
  const r = (await st(page))[k], c = center(r);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, {steps: 8}); await page.mouse.up();
  await page.waitForTimeout(150);
}
async function slider(page, k, v) {
  await page.evaluate(([k, v]) => { const i = document.querySelector(`.q-arrange input[data-k="${k}"]`); i.value = v; i.dispatchEvent(new Event('input', {bubbles: true})); }, [k, v]);
}

test.describe('touch screens', () => {
  test.use({hasTouch: true});

  test('the viewport can\'t be scaled, and "Arrange controls" is in the settings', async ({page}) => {
    const watch = await boot(page);
    expect(await page.getAttribute('meta[name="viewport"]', 'content')).toBe('width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('stage')).touchAction)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#pad .pb-a')).touchAction)).toBe('none');
    await page.evaluate(() => Arcade.UI.settings.open({theme: 'q-theme'}));
    await expect(page.locator('#uiSettings .q-arrange-btn')).toBeVisible();
    await page.locator('#uiSettings .q-arrange-btn').click();
    await expect(page.locator('.q-arrange')).toBeVisible();
    expect((await st(page)).editing).toBe(true);
    watch.check();
  });

  test('ARRANGE: drag, size and opacity are saved, and come back after a reload; always fully on screen', async ({page}) => {
    const watch = await boot(page);
    const before = await st(page);
    expect(before.free).toBe(false);
    await page.evaluate(() => Arcade.Quest.arrange.open());
    await drag(page, 'dpad', {x: 300, y: 300});   // (clear of the arena's menus: over one it would be nudged)
    await slider(page, 'ab', 150);
    await slider(page, 'op', 50);
    await drag(page, 'ab', {x: 5000, y: 5000});                     // far off the screen: kept fully on it
    await page.locator('.q-arrange [data-act=done]').click();
    let s = await st(page);
    expect(s.free).toBe(true);
    expect(Math.abs(center(s.dpad).x - 300)).toBeLessThan(3);
    expect(Math.abs(center(s.dpad).y - 300)).toBeLessThan(3);
    expect(s.ab.width / before.ab.width).toBeCloseTo(1.5, 1);
    expect(s.ab.right).toBeLessThanOrEqual(LAND.width);
    expect(s.ab.bottom).toBeLessThanOrEqual(LAND.height);
    expect(+s.opacity).toBeCloseTo(0.5, 2);
    expect(s.saved.landscape).toMatchObject({op: 0.5, ab: {s: 1.5}});
    // a reload: the same arrangement
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
    await page.waitForTimeout(300);
    s = await st(page);
    expect(Math.abs(center(s.dpad).x - 300)).toBeLessThan(3);
    expect(+s.opacity).toBeCloseTo(0.5, 2);
    watch.check();
  });

  test('ARRANGE: portrait and landscape are saved separately; RESET TO DEFAULT forgets one', async ({page}) => {
    const watch = await boot(page);
    await page.evaluate(() => Arcade.Quest.arrange.open());
    await drag(page, 'dpad', {x: 400, y: 300});
    await page.locator('.q-arrange [data-act=done]').click();
    const land = center((await st(page)).dpad);
    // portrait: the normal layout until it's arranged, then its own arrangement
    await page.setViewportSize(PORT); await page.waitForTimeout(400);
    let s = await st(page);
    expect(s.orient).toBe('portrait');
    expect(s.free).toBe(false);
    await page.evaluate(() => Arcade.Quest.arrange.open());
    await drag(page, 'dpad', {x: 200, y: 900});
    await page.locator('.q-arrange [data-act=done]').click();
    s = await st(page);
    expect(Math.abs(center(s.dpad).x - 200)).toBeLessThan(3);
    expect(Object.keys(s.saved).sort()).toEqual(['landscape', 'portrait']);
    // back to landscape: its own arrangement again
    await page.setViewportSize(LAND); await page.waitForTimeout(400);
    s = await st(page);
    expect(s.orient).toBe('landscape');
    expect(Math.abs(center(s.dpad).x - land.x)).toBeLessThan(3);
    expect(Math.abs(center(s.dpad).y - land.y)).toBeLessThan(3);
    // reset landscape to the default: the normal layout, portrait still arranged
    await page.evaluate(() => Arcade.Quest.arrange.open());
    await page.locator('.q-arrange [data-act=reset]').click();
    await page.locator('.q-arrange [data-act=done]').click();
    s = await st(page);
    expect(s.free).toBe(false);
    expect(Object.keys(s.saved)).toEqual(['portrait']);
    watch.check();
  });

  for (const [name, size, at] of [['landscape', LAND, {x: 590, y: 600}], ['portrait', PORT, {x: 410, y: 420}]]) {
    test(`the controls never cover the battle menu or its text (${name})`, async ({page}) => {
      const watch = await boot(page, size);
      // arrange both clusters right where the battle's menu and text box will be
      await page.evaluate(() => Arcade.Quest.arrange.open());
      await drag(page, 'ab', at);
      await drag(page, 'dpad', {x: at.x - 120, y: at.y});
      await page.locator('.q-arrange [data-act=done]').click();
      await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}));
      const overlaps = () => page.evaluate(() => {
        const S = Arcade.Quest.arrange.state(), hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const obs = [...document.querySelectorAll('#ui .q-menu, #ui .q-textbox')].filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect());
        return {n: obs.length, bad: obs.filter(o => hit(S.dpad, o) || hit(S.ab, o)).length};
      });
      let sawMenu = false;
      for (let i = 0; i < 30; i++) {                               // the intro text, then the battle menu
        await page.waitForTimeout(250);
        const o = await overlaps();
        expect(o.bad).toBe(0);
        if (await page.locator('#qCmd:not([hidden]) .q-btn').count()) { sawMenu = true; break; }
        await page.keyboard.press('Enter');
      }
      expect(sawMenu).toBe(true);
      expect((await overlaps()).bad).toBe(0);
      watch.check();
    });
  }

  test('RESET VIEW: shows only when the page is zoomed, and resets the viewport', async ({page}) => {
    const watch = await boot(page);
    expect(await page.locator('.q-resetview:not([hidden])').count()).toBe(0);
    await page.evaluate(() => Arcade.Quest.view.check(1.8));        // as if pinch-zoomed to 180 %
    await expect(page.locator('.q-resetview')).toBeVisible();
    await expect(page.locator('.q-resetview')).toHaveText('Reset view');
    const metaDuring = await page.evaluate(() => { document.querySelector('.q-resetview').click(); return document.querySelector('meta[name="viewport"]').content; });
    expect(metaDuring).toContain('user-scalable=no');
    await expect(page.locator('.q-resetview')).toBeHidden();
    const v = await page.evaluate(() => Arcade.Quest.view.state());
    expect(v).toMatchObject({zoomed: false, resets: 1, meta: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'});
    // regaining focus checks again
    await page.evaluate(() => { Arcade.Quest.view.check(1.5); Arcade.Quest.view.check(1); dispatchEvent(new Event('focus')); });
    expect(await page.locator('.q-resetview:not([hidden])').count()).toBe(0);
    watch.check();
  });
});

test.describe('an iPad-like phone emulation (mobile viewport, touch)', () => {
  test.use({hasTouch: true, isMobile: true, viewport: {width: 1024, height: 768}});
  test('rapid taps on the D-pad and A/B never zoom or scroll the page', async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'isMobile emulation is Chromium\'s');
    const watch = await prepare(page, {store: store()});
    await page.goto('arcade-quest/index.html?demo&test');
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
    for (const sel of ['#pad .pb-up', '#pad .pb-a', '#pad .pb-b', '#pad .pb-left']) {
      const b = await page.locator(sel).boundingBox();
      for (let i = 0; i < 6; i++) { await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(40); }
    }
    await page.waitForTimeout(400);
    const v = await page.evaluate(() => ({scale: visualViewport.scale, x: scrollX, y: scrollY}));
    expect(v).toEqual({scale: 1, x: 0, y: 0});
    watch.check();
  });
});

test('keyboard / mouse devices: no "Arrange controls" and no pad', async ({page}) => {
  const watch = await boot(page);
  expect(await page.evaluate(() => Arcade.Quest.input.touch)).toBe(false);
  await page.evaluate(() => Arcade.UI.settings.open({theme: 'q-theme'}));
  await expect(page.locator('#uiSettings')).toBeVisible();
  expect(await page.locator('#uiSettings .q-arrange-btn').count()).toBe(0);
  await page.evaluate(() => Arcade.Quest.arrange.open());
  expect((await st(page)).editing).toBe(false);
  watch.check();
});
