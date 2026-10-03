/* ARCADE QUEST: THE MENU AND THE KEYS. The Settings panel's chosen options are highlighted (Text speed, Dodging,
   Assist mode: the quest's own rule used to hide the kit's pressed look), the ☰ MENU button (the kit's pause button in
   the game screen's corner: only while you're free to walk, never over the pad or the HUD, even arranged), M opens the
   menu, and on keyboards only: the key legend (fades after 10 s, back on a key), "▼ Enter" in the text box and the
   one-time keyboard line. Touch screens: hasTouch. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const LAPTOP = {width: 1366, height: 768}, LAND = {width: 1024, height: 768}, PORT = {width: 768, height: 1024};
const store = (extra = {}) => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': Object.assign({settings: {textSpeed: 'instant', dodge: 'easy'}}, extra)}});

async function world(page, size, extra) {
  await page.setViewportSize(size);
  const watch = await prepare(page, {store: store(extra)});
  await page.goto('arcade-quest/index.html?demo&warp=foyer');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
  return watch;
}
/** the text boxes that open a room (the keyboard line the first time): read through them */
async function settle(page) {
  for (let i = 0; i < 20 && await page.evaluate(() => Arcade.Quest.world.state().busy); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await expect.poll(() => page.evaluate(() => Arcade.Quest.world.state().busy)).toBe(false);
}
const btn = page => page.locator('#qMenuSlot .q-menubtn');
const rect = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e && !e.hidden && e.getClientRects().length ? e.getBoundingClientRect().toJSON() : null; }, sel);
const overlap = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test('Settings: the chosen Text speed, Dodging and Assist mode are highlighted (a different background + ▶)', {tag: '@quick'}, async ({page}) => {
  const watch = await world(page, LAPTOP);
  await settle(page);
  await page.evaluate(() => { Arcade.Quest.settings.open(); });
  for (const [k, v] of [['textSpeed', 'fast'], ['dodge', 'normal'], ['assist', 'true']]) {
    const group = page.locator(`#uiSettings .ui-seg[data-k="${k}"]`);
    await group.locator(`button[data-v="${v}"]`).click();
    const r = await group.evaluate((g, v) => [...g.querySelectorAll('button')].map(b => ({v: b.dataset.v, pressed: b.getAttribute('aria-pressed'),
      bg: getComputedStyle(b).backgroundColor, mark: getComputedStyle(b, '::before').content})), v);
    const on = r.find(x => x.v === v), off = r.filter(x => x.v !== v);
    expect(on.pressed, k).toBe('true');
    off.forEach(x => { expect(x.pressed).toBe('false'); expect(x.bg, `${k} ${x.v}`).not.toBe(on.bg); expect(x.mark).toBe('none'); });
    expect(on.mark).toContain('▶');
  }
  expect(await page.evaluate(() => Arcade.Quest.settings.get())).toMatchObject({textSpeed: 'fast', dodge: 'normal', assist: true});
  // the keys, listed under "Controls"
  await expect(page.locator('#uiSettings .q-keylist')).toContainText('Arrows or W A S D');
  await expect(page.locator('#uiSettings .q-keylist')).toContainText('M, Esc, P or B');
  watch.check();
});

test.describe('a keyboard (laptop)', () => {
  test('the first time: the keyboard line; the key legend shows, fades after 10 s and comes back on a key', async ({page}) => {
    await page.clock.install();                                                 // the test's clock: the 10 s pass at once
    const watch = await world(page, LAPTOP);
    await expect(page.locator('.q-textbox .q-tline')).toHaveText('On a keyboard: Z or Enter = A, X or Esc = B, M = Menu.');
    await expect(page.locator('.q-textbox .q-tmore')).toHaveText('▼ Enter');
    await expect(btn(page)).toBeHidden();                                       // a text box: no MENU button
    await settle(page);
    await expect(btn(page)).toBeVisible();
    await expect(btn(page)).toHaveText('Menu');
    let k = await page.evaluate(() => Arcade.Quest.keyHints.state());
    expect(k).toMatchObject({shown: true, dim: false, text: 'Arrows: move · Z / Enter: A (talk, choose) · X / Esc: B (back) · M: Menu · H: hide hints'});
    await page.clock.fastForward(10_500);
    await expect.poll(() => page.evaluate(() => Arcade.Quest.keyHints.state().dim)).toBe(true);
    // the fade itself is a CSS transition (real time): it has started once the opacity moves
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('qKeys')).opacity)).not.toBe('0.95');
    await page.keyboard.press('Shift');
    expect(await page.evaluate(() => Arcade.Quest.keyHints.state().dim)).toBe(false);
    // said only once on this device
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    await page.waitForTimeout(500);
    expect(await page.locator('.q-textbox .q-tline').filter({hasText: 'On a keyboard'}).count()).toBe(0);
    watch.check();
  });

  test('M and the MENU button open the menu (Esc closes it); the button hides in battle; "Show key hints: Off"', async ({page}) => {
    const watch = await world(page, LAPTOP, {keysTip: true});
    await settle(page);
    await page.keyboard.press('m');
    await expect(page.locator('#uiPause')).toBeVisible();
    expect(await page.evaluate(() => Arcade.Quest.world.state().paused)).toBe(true);
    await page.keyboard.press('m');                                             // M again: back to the game
    await expect(page.locator('#uiPause')).toBeHidden();
    await btn(page).click();
    await expect(page.locator('#uiPause')).toBeVisible();
    await expect(page.locator('#uiPause [data-act=resume]')).toBeVisible();
    await expect(page.locator('#uiPause')).toContainText('Charms');
    await page.keyboard.press('Escape');
    await expect(page.locator('#uiPause')).toBeHidden();
    // a battle: no MENU button, no legend
    await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'wisp', back: {scene: 'world', args: {resume: true}}}));
    await expect.poll(() => page.evaluate(() => Arcade.Quest.sceneName)).toBe('battle');
    await expect(btn(page)).toBeHidden();
    expect(await page.evaluate(() => Arcade.Quest.keyHints.state().shown)).toBe(false);
    await page.keyboard.press('m');
    await expect(page.locator('#uiPause')).toBeHidden();
    // the setting: no legend, but the MENU button stays
    await page.evaluate(() => { Arcade.Quest.settings.set({keyHints: false}); Arcade.Quest.go('world', {map: 'foyer'}); });
    await settle(page);
    await expect(btn(page)).toBeVisible();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => Arcade.Quest.keyHints.state().shown)).toBe(false);
    watch.check();
  });

  test('H and the ✕ hide the key legend (saved, with a toast), H brings it back; the Settings switch follows', async ({page}) => {
    const watch = await world(page, LAPTOP, {keysTip: true});
    await settle(page);
    const legend = page.locator('#qKeys');
    await expect(legend).toBeVisible();
    await page.keyboard.press('h');
    await expect(legend).toBeHidden();
    await expect(page.locator('.ui-toast')).toContainText('Key hints hidden: press H to show them.');
    expect(await page.evaluate(() => Arcade.Quest.settings.get().keyHints)).toBe(false);
    // the choice survives a reload
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    await settle(page);
    await page.waitForTimeout(300);
    await expect(legend).toBeHidden();
    // the Settings switch shows Off
    await page.evaluate(() => { Arcade.Quest.settings.open(); });
    await expect(page.locator('#uiSettings .ui-seg[data-k="keyHints"] button[aria-pressed="true"]')).toHaveText('Off');
    await expect(page.locator('#uiSettings .q-keylist')).toContainText('Hide or show the key hints');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => Arcade.UI.state().settings)).toBe(false);
    // H brings it back
    await page.keyboard.press('h');
    await expect(legend).toBeVisible();
    await expect(page.locator('.ui-toast')).toContainText('Key hints on.');
    expect(await page.evaluate(() => Arcade.Quest.settings.get().keyHints)).toBe(true);
    // the ✕: hidden again, same setting; nothing else is left in that corner
    await legend.locator('.q-keys-x').click();
    await expect(legend).toBeHidden();
    expect(await page.evaluate(() => Arcade.Quest.settings.get().keyHints)).toBe(false);
    await page.evaluate(() => { Arcade.Quest.settings.open(); });
    await expect(page.locator('#uiSettings .ui-seg[data-k="keyHints"] button[aria-pressed="true"]')).toHaveText('Off');
    // …and the switch turns it back on
    await page.locator('#uiSettings .ui-seg[data-k="keyHints"] button[data-v="true"]').click();
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => Arcade.UI.state().settings)).toBe(false);
    await expect(legend).toBeVisible();
    watch.check();
  });

  test('the title screen names the key', async ({page}) => {
    await page.setViewportSize(LAPTOP);
    const watch = await prepare(page, {store: store()});
    await page.goto('arcade-quest/index.html?demo');
    await expect(page.locator('#qPress')).toContainText('Press Enter (or any key)');
    watch.check();
  });
});

test.describe('touch screens (iPad)', () => {
  test.use({hasTouch: true});
  for (const [name, size] of [['landscape', LAND], ['portrait', PORT]]) {
    test(`${name}: no key hints; the MENU button clears the pad and the HUD, arranged or not`, async ({page}) => {
      const watch = await world(page, size);
      await settle(page);
      expect(await page.evaluate(() => ({keys: Arcade.Quest.keyHints.state().shown, more: Arcade.Quest.keyHints.more, a: Arcade.Quest.keyHints.label('a')})))
        .toEqual({keys: false, more: '▼', a: 'A'});
      await expect(btn(page)).toBeVisible();
      const check = async () => {
        const m = await rect(page, '#qMenuSlot .q-menubtn');
        expect(m).not.toBe(null);
        for (const sel of ['#pad .dpad', '#pad .abpad', '#qWHud']) expect(overlap(m, await rect(page, sel)), sel).toBe(false);
        expect(m.width).toBeGreaterThanOrEqual(44); expect(m.height).toBeGreaterThanOrEqual(44);
      };
      await check();
      // a custom arrangement right over the button's corner: the A/B cluster moves clear of it
      const orient = size.width > size.height ? 'landscape' : 'portrait';
      await page.evaluate(o => {
        const d = Arcade.store.gameData('arcade-quest');
        const m = document.querySelector('#qMenuSlot .q-menubtn').getBoundingClientRect();
        d.controls = {[o]: {dpad: {x: .15, y: .85, s: 1}, ab: {x: (m.left + m.width / 2) / innerWidth, y: (m.top + m.height / 2) / innerHeight, s: 1}, op: 1}};
        Arcade.store.saveGameData('arcade-quest');
        Arcade.Quest.arrange.apply ? Arcade.Quest.arrange.apply() : dispatchEvent(new Event('resize'));
      }, orient);
      await page.waitForTimeout(300);
      expect((await page.evaluate(() => Arcade.Quest.arrange.state())).free).toBe(true);
      await check();
      watch.check();
    });
  }
});

/* THE BATTLE MENU (style.css .q-btn.sel, engine/text.js Q.menu): selecting any of the five actions never changes a
   button's size or covers "What will you do?"; exactly one button looks selected (filled + ▶); the mouse moves it */
async function battle(page, size, touch) {
  await page.setViewportSize(size);
  const watch = await prepare(page, {store: store({keysTip: true})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => { Arcade.Quest.save.setFlag('pathsTip'); Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
  for (let i = 0; i < 40 && !(await page.locator('#qCmd:not([hidden]) .q-btn').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
  await expect(page.locator('#qCmd .q-btn')).toHaveCount(5);
  return watch;
}
const menuBoxes = page => page.evaluate(() => {
  const bs = [...document.querySelectorAll('#qCmd .q-btn')], pr = document.getElementById('qPrompt').getBoundingClientRect();
  const sel = bs.filter(b => b.classList.contains('sel'));
  return {boxes: bs.map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }),
    prompt: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.bottom)], top: Math.min(...bs.map(b => b.getBoundingClientRect().top)),
    sel: sel.map(b => b.querySelector('.q-bl').textContent), filled: bs.map(b => getComputedStyle(b).backgroundColor),
    wraps: bs.some(b => { const l = b.querySelector('.q-bl'); return l.scrollWidth > l.clientWidth + 1 || l.getClientRects().length > 1; }),
    pointer: sel.map(b => getComputedStyle(b, '::before').content)};
});
for (const [name, size, touch] of [['laptop', LAPTOP, false], ['phone', {width: 390, height: 844}, true], ['iPad landscape', LAND, true], ['iPad portrait', PORT, true]]) {
  test.describe(`the battle menu (${name})`, () => {
    if (touch) test.use({hasTouch: true});
    test('selecting each action keeps every button\'s box and the prompt; exactly one looks selected', async ({page}) => {
      const watch = await battle(page, size, touch);
      const first = await menuBoxes(page);
      const labels = await page.locator('#qCmd .q-btn .q-bl').allTextContents();
      expect(labels).toEqual(['PLAY', 'SERENADE', 'LISTEN', 'ITEM', 'HARMONIZE']);
      const seen = [];
      // HARMONIZE is disabled (CALM not full): the arrows skip it; the fifth press wraps to PLAY
      for (let k = 0; k < 5; k++) {
        const m = await menuBoxes(page);
        expect(m.boxes, `${name} step ${k}`).toEqual(first.boxes);                   // no button moves or grows
        expect(m.prompt).toEqual(first.prompt);
        expect(m.prompt[2]).toBeLessThanOrEqual(m.top);                             // the prompt is above, never covered
        expect(m.wraps).toBe(false);
        expect(m.sel).toHaveLength(1);
        const i = labels.indexOf(m.sel[0]), rest = m.filled.filter((_, j) => j !== i && j !== 4);
        expect(new Set(rest).size).toBe(1);                                          // the others all alike…
        expect(rest[0]).not.toBe(m.filled[i]);                                       // …and the selected one filled
        expect(m.pointer[0]).toContain('▶');
        seen.push(m.sel[0]);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(60);
      }
      expect(seen).toEqual(['PLAY', 'SERENADE', 'LISTEN', 'ITEM', 'PLAY']);
      // unselected ones all look alike (the same background), the selected one differs
      const m = await menuBoxes(page), i = labels.indexOf(m.sel[0]);
      const others = m.filled.filter((_, j) => j !== i && j !== 4);
      expect(new Set(others).size).toBe(1);
      expect(others[0]).not.toBe(m.filled[i]);
      watch.check();
    });
  });
}
test('the battle menu: the mouse moves the ONE selection (never a hovered box and another selected one)', async ({page}) => {
  const watch = await battle(page, LAPTOP, false);
  for (const label of ['LISTEN', 'SERENADE', 'ITEM']) {
    await page.locator('#qCmd .q-btn', {hasText: label}).hover();
    await expect.poll(async () => (await menuBoxes(page)).sel).toEqual([label]);
  }
  // a disabled HARMONIZE can't take it
  await page.locator('#qCmd .q-btn', {hasText: 'HARMONIZE'}).hover();
  await page.waitForTimeout(100);
  expect((await menuBoxes(page)).sel).toEqual(['ITEM']);
  // and the keys carry on from where the mouse left it
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await menuBoxes(page)).sel).toEqual(['LISTEN']);
  watch.check();
});
