/* SMOKE: every page loads in Chromium and WebKit at iPad landscape, iPad portrait and Chromebook sizes with no
   JavaScript error, no console error, no missing local file, no request to an outside host, no visible button
   sticking out of the screen sideways, and nothing visible wider than the screen (helpers.js tooWide; phones:
   phone-width.spec.js). All @quick (QUICK CHECK). */
const {test, expect} = require('@playwright/test');
const {prepare, device, offscreen, tooWide, VIEWPORTS} = require('./helpers');
const {PAGES} = require('./pages');

const SIZES = Object.entries(VIEWPORTS);

for (const P of PAGES) {
  test(`smoke: ${P.name}`, {tag: '@quick'}, async ({page}, info) => {
    const watch = await prepare(page, P.member ? {store: device(P.member)} : undefined);
    await page.setViewportSize((P.sizes || SIZES)[0][1]);
    // every file the page asks for has arrived (and its errors would have shown): nothing loading for 500 ms
    await page.goto(P.url, {waitUntil: 'networkidle'});
    // a game's PRESS START screen: tap it, so the level screen underneath is checked too
    const ps = page.locator('.ps-screen');
    if (await ps.isVisible().catch(() => false)) {
      await ps.click({position: {x: 20, y: 200}});
      await expect(ps).toBeHidden();
      await page.waitForLoadState('networkidle');
    }
    if (P.open) await P.open(page);
    for (const [k, [label, size]] of (P.sizes || SIZES).entries()) {
      if (k) {                                        // (the first size is the one the page opened at)
        await page.setViewportSize(size);
        await page.waitForTimeout(450);               // the pages' own resize handlers wait up to ~300 ms before they lay out again
      }
      const bad = [...await offscreen(page), ...await tooWide(page)];      // (tooWide: nothing visible wider than the screen, docs/engine/testing.md PHONE WIDTH)
      if (bad.length) await page.screenshot({path: info.outputPath(`${label.replace(/\s/g, '-')}.png`)});
      expect([...new Set(bad)], `buttons or anything else outside the screen at ${label} (${size.width} × ${size.height})`).toEqual([]);
    }
    watch.check(`on ${P.url}`);
  });
}
