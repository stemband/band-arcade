/* SMOKE: every page loads in Chromium and WebKit at iPad landscape, iPad portrait and Chromebook sizes with no
   JavaScript error, no console error, no missing local file, no request to an outside host, and no visible button
   sticking out of the screen sideways. All @quick (QUICK CHECK). */
const {test, expect} = require('@playwright/test');
const {prepare, offscreen, VIEWPORTS} = require('./helpers');
const {PAGES} = require('./pages');

const SIZES = Object.entries(VIEWPORTS);

for (const P of PAGES) {
  test(`smoke: ${P.name}`, {tag: '@quick'}, async ({page}, info) => {
    const watch = await prepare(page);
    await page.setViewportSize((P.sizes || SIZES)[0][1]);
    await page.goto(P.url, {waitUntil: 'load'});
    await page.waitForTimeout(900);
    // a game's PRESS START screen: tap it, so the level screen underneath is checked too
    const ps = page.locator('.ps-screen');
    if (await ps.isVisible().catch(() => false)) { await ps.click({position: {x: 20, y: 200}}); await page.waitForTimeout(700); }
    if (P.open) await P.open(page);
    for (const [label, size] of P.sizes || SIZES) {
      await page.setViewportSize(size);
      await page.waitForTimeout(450);
      const bad = await offscreen(page);
      if (bad.length) await page.screenshot({path: info.outputPath(`${label.replace(/\s/g, '-')}.png`)});
      expect(bad, `buttons outside the screen at ${label} (${size.width} × ${size.height})`).toEqual([]);
    }
    watch.check(`on ${P.url}`);
  });
}
