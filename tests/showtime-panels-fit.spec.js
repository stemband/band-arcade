/* SHOWTIME MALFUNCTION'S PANELS FIT A PHONE. The story's band art (5 animatronics at a fixed 110 px height) used to
   force the story panel to 457 px on a 390 px screen, cutting off the end of every line. Now:
   - at 390 × 844, 360 × 740 and 375 × 667 (touch, isMobile; Chromium and WebKit) every Showtime panel that ?demo can
     open fits the screen: its edges inside the viewport, nothing inside it wider than the panel, no sideways scroll;
   - the story: all 5 characters inside the panel, never squashed, and "Let's go" reachable by scrolling and tappable;
   - iPad and Chromebook: the story art keeps its full size (110 px tall, as before). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const PHONES = [['390 × 844', 390, 844], ['360 × 740', 360, 740], ['375 × 667', 375, 667], ['844 × 390 landscape', 844, 390]];
const store = (member = 'trumpet', gd = {}) => device(member, {gameData: {'showtime-malfunction': Object.assign({storySeen: true, snareDyn: {soft: .05, loud: .4, split: .1414}}, gd)}});

/** what doesn't fit in the open panel `sel` (the panel = that element, or the overlay's first visible child) */
const misfit = (page, sel) => page.evaluate(sel => {
  const host = document.querySelector(sel);
  if (!host || !host.getClientRects().length) return [`${sel} is not open`];
  const p = host.matches('.panel, .ui-panel, [role=dialog]') ? host : [...host.children].find(c => c.getClientRects().length) || host;
  const W = document.documentElement.clientWidth, r = p.getBoundingClientRect(), bad = [];
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  if (r.left < -.5) bad.push(`the panel starts ${Math.round(-r.left)} px off the left edge`);
  if (r.right > W + .5) bad.push(`the panel is ${Math.round(r.width)} px wide and runs ${Math.round(r.right - W)} px off a ${W} px screen`);
  for (const el of p.querySelectorAll('*')) {
    if (!el.getClientRects().length || el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const q = el.getBoundingClientRect();
    if (q.width && (q.right > r.right + 1 || q.left < r.left - 1)) bad.push(`${name(el)} (${Math.round(q.left)}–${Math.round(q.right)}) outside the panel (${Math.round(r.left)}–${Math.round(r.right)})`);
  }
  const ov = p.closest('.overlay') || document.scrollingElement;
  if (ov.scrollWidth > ov.clientWidth + 1) bad.push(`sideways scroll: ${ov.scrollWidth} > ${ov.clientWidth}`);
  return bad.slice(0, 6);
}, sel);

async function open(page, {member = 'trumpet', gd = {}, q = ''} = {}) {
  const watch = await prepare(page, {store: store(member, gd)});
  await page.goto(`showtime-malfunction/index.html?demo&nostart${q}`);
  await expect(page.locator('#hub')).toBeVisible();
  return watch;
}
/** start a showtime from the level select (past the microphone card: ?demo stands in for it) */
async function startShow(page, lv = 1) {
  await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
  await page.locator('.ls-start').click();
  await expect.poll(async () => {
    if (await page.evaluate(() => !!Arcade.Showtime.debug())) return true;
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    return false;
  }, {timeout: 20_000}).toBe(true);
}

for (const [size, w, h] of PHONES) {
  test.describe(`Showtime panels on a phone (${size})`, () => {
    test.use({viewport: {width: w, height: h}, isMobile: true, hasTouch: true});

    test(`the story fits: every line, all 5 characters (never squashed), "Let's go" reachable and tappable (${size})`, {tag: size === '390 × 844' ? '@quick' : undefined}, async ({page}) => {
      const watch = await open(page);
      await page.locator('#storyBtn').tap();
      await expect(page.locator('#story')).toBeVisible();
      expect(await misfit(page, '#story .story-panel')).toEqual([]);
      const art = await page.evaluate(() => {
        const p = document.querySelector('#story .story-panel').getBoundingClientRect();
        return [...document.querySelectorAll('#storyArt .bot')].map(b => { const r = b.getBoundingClientRect(); return {in: r.left >= p.left - .5 && r.right <= p.right + .5, ratio: +(r.width / r.height).toFixed(2), w: r.width}; });
      });
      expect(art).toHaveLength(5);
      art.forEach(a => { expect(a.in).toBe(true); expect(a.ratio).toBeCloseTo(.7, 1); expect(a.w).toBeGreaterThan(30); });
      // it opens at its top (the panel's top edge and the title on screen, without scrolling); "Let's go" can be
      // scrolled to and tapped
      expect(await page.evaluate(() => { const p = document.querySelector('#story .story-panel').getBoundingClientRect(), t = document.getElementById('storyTitle').getBoundingClientRect();
        return {panelTop: p.top >= 0, title: t.top >= 0 && t.bottom <= innerHeight}; })).toEqual({panelTop: true, title: true});
      await page.locator('#storyGo').scrollIntoViewIfNeeded();
      await expect(page.locator('#storyGo')).toBeInViewport();
      await page.locator('#storyGo').tap();
      await expect(page.locator('#story')).toBeHidden();
      watch.check();
    });

    test(`the Malfunction Files, the TERROR warning and Settings fit (${size})`, async ({page}) => {
      const watch = await open(page);
      await page.locator('#filesBtn').tap();
      await expect(page.locator('#files')).toBeVisible();
      expect(await misfit(page, '#files .files-panel'), 'the Malfunction Files').toEqual([]);
      await page.locator('#filesClose').tap();
      const terror = page.locator('#hub [data-spooky="terror"]');
      if (await terror.isVisible()) {                                // (only where teacher-settings.js allows Terror)
        await terror.tap();
        await expect(page.locator('#uiConfirm')).toBeVisible();
        expect(await misfit(page, '#uiConfirm'), 'the TERROR warning').toEqual([]);
        await page.locator('#uiConfirm [data-act=no]').tap();
      }
      await page.locator('#topbar .snd-open').tap();
      await expect(page.locator('#uiSettings')).toBeVisible();
      expect(await misfit(page, '#uiSettings'), 'Settings').toEqual([]);
      watch.check();
    });

    test(`a special machine's card, the pause menu, the results and the NIGHTMARE unlock fit (${size})`, async ({page}) => {
      const watch = await open(page, {q: '&special=turbo'});
      await startShow(page, 1);
      await expect(page.locator('#specialCard')).toBeVisible({timeout: 20_000});
      expect(await misfit(page, '#specialCard .special-panel'), 'the NEW MALFUNCTION card').toEqual([]);
      await page.locator('#spGo').tap();
      await page.locator('#uiPauseBtn').tap();
      await expect(page.locator('#uiPause')).toBeVisible();
      expect(await misfit(page, '#uiPause'), 'the pause menu').toEqual([]);
      await page.locator('#uiPause [data-act=resume]').tap();
      // a finished first show: the results with the band and the NIGHTMARE unlock (first clear on Normal)
      await page.evaluate(() => { const G = Arcade.Showtime.debug(); G.band = [...Array(12)].map((_, i) => ({kind: ['walrus', 'owl', 'gator', 'raccoon'][i % 4]})); Arcade.Showtime.finish(); });
      await expect(page.locator('#results')).toBeVisible();
      await expect(page.locator('#resUnlock')).toBeVisible();
      expect(await misfit(page, '#results'), 'the results + NIGHTMARE unlock').toEqual([]);
      watch.check();
    });

    test(`the snare's timing check and soundcheck fit (${size})`, async ({page}) => {
      const watch = await open(page, {member: 'snare'});
      await page.evaluate(() => Arcade.Showtime.timingCheck());
      await expect(page.locator('#stCal')).toBeVisible();
      expect(await misfit(page, '#stCal'), 'the timing check').toEqual([]);
      await page.locator('#stCalSkip').tap();
      await page.evaluate(() => Arcade.Showtime.soundcheck());
      await expect(page.locator('#stSound')).toBeVisible();
      expect(await misfit(page, '#stSound'), 'the soundcheck').toEqual([]);
      watch.check();
    });
  });
}

for (const [size, w, h] of [['iPad', 1180, 820], ['Chromebook', 1366, 768]]) {
  test(`the story on a ${size}: the art at full size, the panel as before (${size})`, async ({page}) => {
    await page.setViewportSize({width: w, height: h});
    const watch = await open(page);
    await page.locator('#storyBtn').click();
    await expect(page.locator('#story')).toBeVisible();
    const r = await page.evaluate(() => ({panel: Math.round(document.querySelector('#story .story-panel').getBoundingClientRect().width),
      art: [...document.querySelectorAll('#storyArt .bot')].map(b => Math.round(b.getBoundingClientRect().height))}));
    expect(r.art).toEqual([110, 110, 110, 110, 110]);
    expect(r.panel).toBe(460);                                         // (the shared .panel width, as on main)
    expect(await misfit(page, '#story .story-panel')).toEqual([]);
    if (process.env.GALLERY) await page.locator('#story .story-panel').screenshot({path: `../docs/gallery/showtime-story-${size.toLowerCase()}.png`});
    watch.check();
  });
}
