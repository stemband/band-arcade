/* THINGS THAT MUST STAY READABLE / REACHABLE ON SCREEN, at a phone size and an iPad size:
   - Ghost Notes: the ghost's body is the light screen color, so its note name reads from the moment it appears
     (a broken rule in theme.css once turned it black), in Spooky Season too.
   - Ancient Ninja Scrolls: during the Belt Exam the pause button never covers the word bank or the answers,
     wherever the page is scrolled.
   - Sustain Speedway: no two cars ever overlap on screen, even in a close race (drawn boxes: G.carsDrawn). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SIZES = [['phone', 390, 844], ['iPad', 820, 1180]];

async function startFirst(page, ready) {
  await page.locator('.ls-card:not(.ls-endless)').first().click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 40 && !(await page.evaluate(ready)); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(150);
  }
}
const lum = rgb => { const [r, g, b] = rgb.match(/\d+/g).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };

for (const [name, w, h] of SIZES) {
  test.describe(`on screen (${name})`, () => {
    test.use({viewport: {width: w, height: h}});

    for (const season of ['', '&season=spooky']) {
      test(`Ghost Notes: the note name on the ghost is readable${season ? ' in Spooky Season' : ''}`, async ({page}) => {
        const watch = await prepare(page, {store: device()});
        await page.goto(`ghost-notes/index.html?demo&nostart${season}`);
        await startFirst(page, () => !!document.querySelector('#ghostSlot .g-text'));
        const c = await page.evaluate(() => {
          const s = document.querySelector('#ghostSlot svg');
          return {body: getComputedStyle(s.querySelector('.g-body')).fill, text: getComputedStyle(s.querySelector('.g-text')).fill, label: s.querySelector('.g-text').textContent};
        });
        expect(c.label.length).toBeGreaterThan(0);
        const [a, b] = [lum(c.body), lum(c.text)].sort((x, y) => y - x);
        expect((a + .05) / (b + .05)).toBeGreaterThanOrEqual(4.5);     // WCAG AA contrast between the label and the ghost
        watch.check();
      });
    }

    test('Ancient Ninja Scrolls: the pause button never covers the word bank or the answers', async ({page}) => {
      const watch = await prepare(page, {store: device()});
      await page.goto('ancient-ninja-scrolls/index.html?demo&nostart');
      await page.locator('.ls-card:not(.ls-endless)').first().click();
      await page.locator('.ls-start').click();
      await page.locator('#goExam').click();
      await expect(page.locator('#uiPauseBtn')).toBeVisible();
      for (const y of [0, 150, 400, 900, 5000]) {
        await page.evaluate(y => scrollTo(0, y), y);
        await page.waitForTimeout(150);
        const r = await page.evaluate(() => {
          const bt = document.getElementById('uiPauseBtn').getBoundingClientRect();
          const bank = document.getElementById('bank').getBoundingClientRect();
          // every word in the bank and every blank the student can see: nothing under the button
          const under = [...document.querySelectorAll('#bank button, #exList button, #exList .blank')].filter(e => {
            const b = e.getBoundingClientRect(), x = Math.min(Math.max(bt.left + 4, b.left + 2), b.right - 2), yy = Math.min(Math.max(bt.top + 4, b.top + 2), b.bottom - 2);
            if (b.right <= bt.left || b.left >= bt.right || b.bottom <= bt.top || b.top >= bt.bottom) return false;
            const top = document.elementFromPoint(x, yy);
            return top && e.contains(top);                                  // it's visible there (not under the strip)
          }).length;
          const mid = document.elementFromPoint(bt.left + bt.width / 2, bt.top + bt.height / 2);
          return {under, onTop: !!(mid && mid.closest('#uiPauseBtn')), bankBelow: bank.top >= bt.bottom - 1};
        });
        expect(r.under, `scrolled to ${y}`).toBe(0);
        expect(r.onTop).toBe(true);
        expect(r.bankBelow).toBe(true);
      }
      watch.check();
    });

    test('Sustain Speedway: no two cars overlap on screen in a close race', async ({page}) => {
      const watch = await prepare(page, {store: device()});
      await page.goto('sustain-speedway/index.html?demo&nostart');
      await startFirst(page, () => !!Arcade.Speedway.debug());
      await page.evaluate(() => {
        const G = Arcade.Speedway.debug();
        G.rivals.forEach((r, i) => { r.pace = [1, .98, 1.02][i] || 1; });            // everyone right with you
        G.ghost = {t: G.total, p: [...Array(Math.ceil(G.total / .5) + 2)].map((_, i) => Math.min(G.lens.length, i * .5 / G.lens[0] * .99))};
        window.__carCheck = {frames: 0, overlaps: 0, most: 0};
        const tick = () => {
          const g = Arcade.Speedway.debug(); if (!g) return;
          const c = g.carsDrawn || [], k = window.__carCheck;
          for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
            const a = c[i].box, b = c[j].box;
            if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) k.overlaps++;
          }
          k.frames++; k.most = Math.max(k.most, c.length); requestAnimationFrame(tick);
        };
        tick();
      });
      await page.keyboard.down('Space');                                   // ?demo: hold Space = in tune
      await page.waitForTimeout(12_000);
      await page.keyboard.up('Space');
      const k = await page.evaluate(() => window.__carCheck);
      expect(k.frames).toBeGreaterThan(30);                                // (WebKit on the CI machine draws ~5 frames a second)
      expect(k.most).toBeGreaterThanOrEqual(3);                            // cars were on screen with yours
      expect(k.overlaps).toBe(0);
      watch.check();
    });
  });
}
