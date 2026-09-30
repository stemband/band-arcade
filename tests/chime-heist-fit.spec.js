/* CHIME HEIST needs no instrument switch: it always plays as the Bell Kit (games.js `player: 'bells'`, no `fit`), so
   with ANY saved instrument (a trumpet, a snare) its cabinet is never dimmed and never tagged "Bells only" in the
   lobby's zones, the No Instrument Needed zone, ALL GAMES or the Full Arcade (2D and 3D), START opens the game with no
   switch panel, and the saved instrument is the same afterwards. On an iPad (landscape) and a laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const state = page => page.evaluate(() => Arcade.Arcade.state());
const noFit = page => page.evaluate(() => {
  const g = Arcade.GAMES.find(x => x.id === 'chime-heist');
  return {fit: g.fit || null, ok: Arcade.gameFit(g, Arcade.store.player).ok, player: g.player, noInstrument: g.noInstrument,
    blurb: g.blurb, tags: document.querySelectorAll('#infoTags .fit-tag').length};
});

for (const [name, size, touch] of [['iPad landscape', {width: 1024, height: 768}, true], ['laptop', {width: 1366, height: 768}, false]]) {
  for (const member of ['trumpet', 'snare']) {
    test.describe(`${name}, a saved ${member}`, () => {
      if (touch) test.use({hasTouch: true});

      test('the zones and ALL GAMES: Chime Heist is lit, never "Bells only"', async ({page}) => {
        await page.setViewportSize(size);
        const watch = await prepare(page, {store: device(member)});
        const f = (await (async () => { await page.goto('index.html?demo&nostart'); return noFit(page); })());
        expect(f.fit).toBe(null);
        expect(f.ok).toBe(true);
        expect([f.player, f.noInstrument]).toEqual(['bells', true]);
        expect(f.blurb).toBe('Crack the vault codes on the bell kit: read each note and strike its bar. No mic and no instrument needed!');
        // the lobby (CONTINUE/ASSIGNED cards may show it) and ALL GAMES
        await expect(page.locator('.lcard.nofit[data-game="chime-heist"]')).toHaveCount(0);
        await page.goto('index.html?demo&nostart#all-games');
        await expect(page.locator('.gcard[data-game="chime-heist"]')).toBeVisible();
        await expect(page.locator('.gcard.nofit[data-game="chime-heist"]')).toHaveCount(0);
        await expect(page.locator('.gcard[data-game="chime-heist"]')).not.toContainText('Bells only');
        // its own zone and the No Instrument Needed zone (2D)
        for (const z of ['technique-lab', 'no-instrument']) {
          await page.goto(`index.html?demo&nostart&flat#zone=${z}&game=chime-heist`);
          await expect.poll(async () => (await state(page)).game).toBe('chime-heist');
          await expect(page.locator('.slot[data-d="0"]')).not.toHaveClass(/nofit/);
          await expect(page.locator('.slot[data-d="0"] .cab-start')).not.toHaveClass(/nofit/);
          expect((await noFit(page)).tags).toBe(0);
        }
        watch.check();
      });

      test('the Full Arcade in 3D: not dimmed, START goes straight in, the saved instrument unchanged', async ({page}) => {
        test.setTimeout(60000);
        await page.setViewportSize(size);
        const watch = await prepare(page, {store: device(member)});
        await page.goto('index.html?demo&nostart&keep3d#full-arcade&game=chime-heist');     // keep3d: no slow-device fallback in CI
        await expect.poll(async () => (await state(page)).kind, {timeout: 20000}).toBe('3d');
        await expect.poll(async () => (await state(page)).game).toBe('chime-heist');
        const jump = page.locator('#jumpStrip .jump[aria-current="true"]');
        await expect(jump).not.toHaveClass(/nofit/);
        await expect(page.locator('a.start3d')).not.toHaveClass(/nofit/);
        expect((await noFit(page)).tags).toBe(0);
        await page.locator('a.start3d').evaluate(a => a.click());          // (the canvas sways under it: a real click can miss)
        await page.waitForURL(/chime-heist\/index\.html/);
        await expect(page.locator('#fitDlg')).toHaveCount(0);            // never the switch panel (it lives on the floor page)
        expect(await page.evaluate(() => Arcade.store.player)).toBe(member);
        watch.check();
      });
    });
  }
}

test('the heist marquee is lit like the others: its canvas is about as bright as its neighbours\'', async ({page}) => {
  await page.setViewportSize({width: 1366, height: 768});
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto('index.html?demo&nostart&flat#full-arcade&game=chime-heist');
  await expect.poll(async () => (await state(page)).game).toBe('chime-heist');
  await page.waitForTimeout(1500);                                     // fonts + still frames
  const lum = await page.evaluate(() => {
    const out = {};
    ['chime-heist', 'lost-signal', 'sustain-speedway', 'ghost-notes', 'note-storm'].forEach(id => {
      const g = Arcade.GAMES.find(x => x.id === id), c = document.createElement('canvas'); c.width = 240; c.height = 60;
      Arcade.Marquee.draw(c.getContext('2d'), 240, 60, 1.6, g, {art: false});
      const d = c.getContext('2d').getImageData(0, 0, 240, 60).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
      out[id] = s / (d.length / 4);
    });
    return out;
  });
  const others = ['lost-signal', 'sustain-speedway', 'ghost-notes', 'note-storm'].map(k => lum[k]).sort((a, b) => a - b);
  expect(lum['chime-heist']).toBeGreaterThanOrEqual(others[0]);        // never the darkest sign on the floor
  watch.check();
});
