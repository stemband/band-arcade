/* ARCADE QUEST: BUTTON LABELS NEVER CLIP. The GN Quest pixel font's glyphs are taller than a 1.0 line box, so a label
   with overflow:hidden lost the top or bottom of its letters (ARTICULATE in the PLAY sub-menu), and long ones got "…".
   Now (style.css .q-bl + engine/text.js Q.fitText) every label has room for its glyphs, a too-wide one shrinks a step
   at a time, then wraps (2 lines), never "…". For every button of every menu (the battle menu with 4 and 5 actions,
   PLAY's sub-menu for every challenge type, ITEM with every item ×12, a vocab challenge's answers, BAND, CHARMS, the
   title menu, the Token Booth and its shelves, Rusty's shop, a yes/no question) at phone, iPad (both ways) and laptop
   sizes: the label's scrollWidth ≤ clientWidth, scrollHeight ≤ clientHeight, it stays inside its button, the button
   doesn't overflow, and no label has text-overflow: ellipsis or overflow: hidden. The battle HUD's names too. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SIZES = [['phone', {width: 390, height: 844}, true], ['iPad landscape', {width: 1024, height: 768}, true],
  ['iPad portrait', {width: 768, height: 1024}, true], ['laptop', {width: 1366, height: 768}, false]];
const store = () => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {keysTip: true, settings: {textSpeed: 'instant', dodge: 'easy'}}}});

/** every visible button's label (and the HUD's names) measured; returns the ones that clip, with why */
const audit = (page, where) => page.evaluate(where => {
  const bad = [], vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const btns = [...document.querySelectorAll('#ui .q-btn, .ui-ov .panel .btn')].filter(vis);
  const names = [...document.querySelectorAll('.q-hname, .q-cname')].filter(vis);
  for (const b of btns.concat(names)) {
    const l = b.querySelector(':scope > .q-bl') || b, cs = getComputedStyle(l), txt = l.textContent.trim().slice(0, 40);
    const why = [];
    if (l.scrollWidth > l.clientWidth + 1) why.push(`wide ${l.scrollWidth}>${l.clientWidth}`);
    if (l.scrollHeight > l.clientHeight + 1) why.push(`tall ${l.scrollHeight}>${l.clientHeight}`);
    if (b !== l && (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1)) why.push('button overflows');
    if (cs.textOverflow === 'ellipsis') why.push('ellipsis');
    if (cs.overflow !== 'visible' && cs.overflowX !== 'visible') why.push('overflow ' + cs.overflow);
    if (b !== l) {
      const lr = l.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (lr.left < br.left - 1 || lr.right > br.right + 1 || lr.top < br.top - 1 || lr.bottom > br.bottom + 1) why.push('outside its button');
    }
    if (parseFloat(cs.lineHeight) < parseFloat(cs.fontSize) * 1.25) why.push('line-height ' + cs.lineHeight + ' for ' + cs.fontSize);
    if (why.length) bad.push(`${where}: "${txt}" ${why.join(', ')}`);
  }
  return {bad, n: btns.length};
}, where);

async function open(page, size, url = 'arcade-quest/index.html?demo&test') {
  await page.setViewportSize(size);
  const watch = await prepare(page, {store: store()});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => {
    const Q = Arcade.Quest, s = Q.save.get();
    Q.save.setFlag('pathsTip'); Q.save.setFlag('songBb');
    Object.keys(window.QUEST_ITEMS).forEach(k => { s.items[k] = 12; });
    s.roster = window.QUEST_ENEMIES.filter(e => e.companion).map(e => e.id); s.band = null;   // every friend there is
    Object.keys(Q.charms.list()).forEach(id => Q.charms.give(id));
    s.tokens = 9999; Q.save.write();
  });
  return watch;
}
async function battle(page, overrides) {
  await page.evaluate(o => Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena', overrides: o}), overrides || {});
  for (let i = 0; i < 60 && !(await page.locator('#qCmd:not([hidden]) .q-btn').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
  await expect(page.locator('#qCmd:not([hidden]) .q-btn').first()).toBeVisible();
  await page.waitForTimeout(80);
}
async function panelOpen(page, fn) {
  await page.evaluate(fn);
  for (let i = 0; i < 40 && !(await page.locator('.q-wpanel .q-btn').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
  await expect(page.locator('.q-wpanel .q-btn').first()).toBeVisible();
  await page.waitForTimeout(80);
}
const closePanels = page => page.evaluate(() => document.querySelectorAll('.q-wpanel').forEach(p => p.closest('.q-overlay').remove()));

for (const [name, size, touch] of SIZES) {
  test.describe(`labels fit (${name})`, () => {
    if (touch) test.use({hasTouch: true});

    test('battle: 5 and 4 actions, PLAY\'s sub-menu for every challenge type, every item, a vocab challenge\'s answers, the HUD names', async ({page}) => {
      test.setTimeout(120000);
      const watch = await open(page, size);
      const bad = [];
      for (const type of ['play', 'longtone', 'articulate', 'vocab', 'fingering']) {
        await battle(page, {challenge: type, name: 'The Extremely Long-Winded Squawk'});
        const main = await audit(page, `battle menu (${type})`); bad.push(...main.bad);
        expect(main.n).toBeGreaterThanOrEqual(5);
        await page.locator('#qCmd .q-btn').first().click();
        await expect(page.locator('#qCmd .q-btn')).toHaveCount(3);
        const labels = await page.locator('#qCmd .q-btn .q-bl').allTextContents();
        expect(labels[0]).toBe({play: 'PLAY', longtone: 'LONG TONE', articulate: 'ARTICULATE', vocab: 'VOCAB', fingering: 'FINGERING'}[type]);
        bad.push(...(await audit(page, `PLAY sub-menu (${type})`)).bad);
        if (type === 'vocab') {                                         // its answers
          await page.locator('#qCmd .q-btn').first().click();
          await expect(page.locator('.q-choices .q-btn').first()).toBeVisible();
          await page.waitForTimeout(100);
          bad.push(...(await audit(page, 'vocab answers')).bad);
        }
        await page.evaluate(() => Arcade.Quest.go('arena'));
        await page.waitForTimeout(100);
      }
      // 4 actions (no SERENADE), then ITEM: every item ×12
      await battle(page, {serenade: false});
      await expect(page.locator('#qCmd .q-btn')).toHaveCount(4);
      bad.push(...(await audit(page, 'battle menu (4)')).bad);
      await page.locator('#qCmd .q-btn', {hasText: 'ITEM'}).click();
      await expect(page.locator('#qCmd .q-btn', {hasText: '×12'}).first()).toBeVisible();
      bad.push(...(await audit(page, 'items')).bad);
      expect(bad).toEqual([]);
      watch.check();
    });

    test('menus: the title, BAND, CHARMS, the Token Booth (+ its shelves), Rusty\'s shop, a yes/no question', async ({page}) => {
      test.setTimeout(120000);
      const watch = await open(page, size);
      const bad = [];
      bad.push(...(await audit(page, 'test arena')).bad);
      await panelOpen(page, () => { Arcade.Quest.talk.band(); });
      bad.push(...(await audit(page, 'band')).bad); await closePanels(page);
      await panelOpen(page, () => { Arcade.Quest.talk.charms(); });
      bad.push(...(await audit(page, 'charms')).bad); await closePanels(page);
      await panelOpen(page, () => { Arcade.Quest.talk.npc('rusty'); });
      bad.push(...(await audit(page, 'shop')).bad); await closePanels(page);
      await panelOpen(page, () => { Arcade.Quest.talk.npc('terry'); });
      bad.push(...(await audit(page, 'token booth')).bad);
      for (const shelf of ['Player items', 'Charms']) {
        await page.locator('.q-booth .q-btn', {hasText: shelf}).click();
        await expect(page.locator('.q-wpanel:not(.q-booth) .q-btn').first()).toBeVisible();
        await page.waitForTimeout(100);
        bad.push(...(await audit(page, 'booth: ' + shelf)).bad);
        await page.locator('.q-wpanel:not(.q-booth) .q-btn', {hasText: /^(Done|Back)/}).last().click();
        await expect(page.locator('.q-booth')).toBeVisible();
      }
      await closePanels(page);
      await page.evaluate(() => { Arcade.UI.confirm({title: 'Start a new game?', text: 'Your level, items, tokens and band friends start over.', yes: 'Yes, start over', no: 'No, go back', danger: true, theme: 'q-theme'}); });
      await expect(page.locator('#uiConfirm .btn').first()).toBeVisible();
      bad.push(...(await audit(page, 'yes/no')).bad);
      await page.keyboard.press('Escape');
      await page.evaluate(() => Arcade.Quest.go('title'));
      for (let i = 0; i < 10 && !(await page.locator('#qTitleMenu .q-btn:not(.q-press)').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
      await expect(page.locator('#qTitleMenu .q-btn').first()).toBeVisible();
      bad.push(...(await audit(page, 'title')).bad);
      expect(bad).toEqual([]);
      watch.check();
    });
  });
}

test('Q.fitText: a label too wide shrinks first, then wraps to 2 lines, never "…"', async ({page}) => {
  const watch = await open(page, {width: 1366, height: 768});
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;width:2000px';
    Q.ui.appendChild(box);
    const m = Q.menu(box, [{id: 'a', label: 'ARTICULATE'}, {id: 'b', label: 'The Golden Mouthpiece ×12'}], {cols: 1, keys: false});
    const [la, lb] = box.querySelectorAll('.q-bl'), rg = document.createRange(); rg.selectNodeContents(la);
    const natural = rg.getBoundingClientRect().width, bt = la.parentElement, cb = getComputedStyle(bt),
      pad = bt.offsetWidth - bt.clientWidth + parseFloat(cb.paddingLeft) + parseFloat(cb.paddingRight);
    box.style.width = Math.round(natural * 0.85 + pad) + 'px';          // ARTICULATE is 15 % too wide now
    Q.refit(box);
    const [a, b] = [la, lb].map(l => ({size: parseFloat(getComputedStyle(l).fontSize), base: parseFloat(getComputedStyle(l.parentElement).fontSize),
      wrap: l.classList.contains('q-wrap2'), fits: l.scrollWidth <= l.clientWidth + 1 && l.scrollHeight <= l.clientHeight + 1,
      lines: Math.round(l.clientHeight / parseFloat(getComputedStyle(l).lineHeight)), ellipsis: getComputedStyle(l).textOverflow === 'ellipsis'}));
    m.destroy(); box.remove();
    return {a, b};
  });
  expect(r.a.fits).toBe(true);
  expect(r.a.size).toBeLessThan(r.a.base);          // shrunk to fit one line
  expect(r.a.wrap).toBe(false);
  expect(r.b.fits).toBe(true);
  expect(r.b.wrap).toBe(true);                      // too long even at the smallest size: 2 balanced lines
  expect(r.b.lines).toBe(2);
  expect(r.a.ellipsis || r.b.ellipsis).toBe(false);
  watch.check();
});
