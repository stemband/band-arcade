/* THE FLOOR'S TOP BAR, ARCADE VIEW and THE LEADERBOARD'S TITLE (index.html .fbar, arcade.js, arcade.css,
   leaderboard-screen.js; docs/engine/page-flow.md):
   - the bar = LEFT (back + title) | CENTER (ARCADE VIEW, TUNE UP, LEADERBOARD) | RIGHT (avatar badge, sound): the
     center group's middle within 8 px of the screen's middle, nothing overlapping, one row, every button ≥ 44 px, at
     Chromebook, iPad landscape/portrait and phone sizes; phones: the center buttons icon-only (aria-label + tooltip),
     and TUNE UP / LEADERBOARD in the badge's menu when even that doesn't fit
   - ARCADE VIEW opens the view used last on this device; the switch flips LIST ⇄ CABINETS (remembered across reloads,
     the same game in front); #all-games and #full-arcade still open the right one; Back from a game returns to it
   - the leaderboard's 🏆 LEADERBOARD 🏆 is centered on the panel (within 4 px), a trophy each side, read "Leaderboard" */
const {test, expect} = require('@playwright/test');
const {prepare, device, VIEWPORTS} = require('./helpers');

const SIZES = [...Object.entries(VIEWPORTS), ['phone', {width: 390, height: 844}]];
const state = page => page.evaluate(() => Arcade.Arcade.state());
const store = (view, member = 'trumpet') => device(member, view ? {gameData: {'season-lobby': {giftAfter: '9999-12-31'}, floor: {arcadeView: view}}} : {});

/** every visible top-bar element's box, the center group's, and which fit step arcade.js chose */
const barLayout = page => page.evaluate(() => {
  const vis = el => el && el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden';
  const box = el => { const r = el.getBoundingClientRect(); return {l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height}; };
  const els = {back: '#backBtn', title: '#fbTitle', view: '#viewBtn', tune: '#tuneBtn', lb: '#lbBtn', badge: '#avBadge .avb-btn', sound: '#soundCtl .snd-btn'};
  const items = Object.entries(els).map(([k, s]) => [k, document.querySelector(s)]).filter(([, el]) => vis(el)).map(([k, el]) => ({k, ...box(el),
    label: el.getAttribute('aria-label'), tip: el.getAttribute('title'), words: [...el.querySelectorAll('.fb-l')].some(vis)}));
  return {items, center: box(document.getElementById('fbCenter')), W: innerWidth, fit: document.getElementById('fbar').dataset.fit};
});

/** the bar's fit once it has stopped changing: the fonts loaded (WebKit's arrive late and widen the labels) and the
    same step on three looks 200 ms apart */
async function settledFit(page) {
  await page.evaluate(() => document.fonts && document.fonts.ready);
  let last = null, same = 0;
  for (let k = 0; k < 40 && same < 3; k++) {
    const f = await page.evaluate(() => document.getElementById('fbar').dataset.fit || null);
    same = f && f === last ? same + 1 : 0; last = f;
    await page.waitForTimeout(200);
  }
  expect(last, 'the top bar never settled on a fit').toBeTruthy();
  return last;
}

test.describe('THE TOP BAR: three groups, centered, one row', () => {
  for (const [name, size] of SIZES) {
    test(`${name}: centered, no overlaps, one row, 44 px buttons`, {tag: '@quick'}, async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: store('cabinets')});
      for (const hash of ['', '#zone=technique-lab', '#all-games', '#full-arcade']) {
        await page.goto('index.html?demo&nostart&flat' + hash);
        await settledFit(page);                                 // (fonts: arcade.js fits the bar again once they arrive)
        const L = await barLayout(page);
        const where = `${name} ${hash || 'lobby'} (${L.fit})`;
        // the center group's middle = the screen's middle
        expect(Math.abs((L.center.l + L.center.r) / 2 - L.W / 2), where).toBeLessThanOrEqual(8);
        // nothing overlaps; one row (every element's middle inside every other's height); on the screen
        for (const a of L.items) {
          expect(a.l, `${where}: ${a.k} off the left`).toBeGreaterThanOrEqual(0);
          expect(a.r, `${where}: ${a.k} off the right`).toBeLessThanOrEqual(L.W + .5);
          for (const b of L.items) {
            if (a === b) continue;
            const overlap = Math.min(a.r, b.r) - Math.max(a.l, b.l);
            expect(overlap, `${where}: ${a.k} overlaps ${b.k}`).toBeLessThanOrEqual(.5);
            expect((a.t + a.b) / 2, `${where}: ${a.k} not in ${b.k}'s row`).toBeGreaterThan(b.t);
            expect((a.t + a.b) / 2, `${where}: ${a.k} not in ${b.k}'s row`).toBeLessThan(b.b);
          }
          if (a.k !== 'title') {
            expect(a.w, `${where}: ${a.k} narrower than 44 px`).toBeGreaterThanOrEqual(44);
            expect(a.h, `${where}: ${a.k} shorter than 44 px`).toBeGreaterThanOrEqual(44);
          }
        }
        const center = L.items.filter(i => ['view', 'tune', 'lb'].includes(i.k));
        expect(center.map(i => i.k)[0]).toBe('view');           // ARCADE VIEW first; TUNE UP and LEADERBOARD after it
        center.forEach(i => { expect(i.label, `${where}: ${i.k}'s aria-label`).toBeTruthy(); expect(i.tip, `${where}: ${i.k}'s tooltip`).toBeTruthy(); });
        if (name === 'phone') {
          expect(center.every(i => !i.words), `${where}: icon-only`).toBe(true);
          if (L.fit === 'fit-tight') {                            // moved: into the avatar badge's menu
            expect(center.map(i => i.k)).toEqual(['view']);
            await page.locator('#avBadge .avb-btn').click();
            await expect(page.locator('#avBadge .avb-menu')).toBeVisible();
            expect(await page.evaluate(() => document.getElementById('fbar').dataset.fit), `${where}: the fit changed`).toBe('fit-tight');
            await expect(page.locator('#avBadge .avb-tune')).toBeVisible();
            if (await page.locator('#lbBtn').count() && await page.evaluate(() => Arcade.Leaderboard.available())) await expect(page.locator('#avBadge .avb-lb')).toBeVisible();
            await page.keyboard.press('Escape');
          } else expect(center.map(i => i.k)).toEqual(['view', 'tune', 'lb']);
        } else {
          expect(center.map(i => i.k)).toEqual(['view', 'tune', 'lb']);
          expect(center.every(i => i.words), `${where}: labels`).toBe(true);
          await expect(page.locator('#avBadge .avb-tune')).toBeHidden();
        }
      }
      watch.check();
    });
  }

  test('the badge menu\'s TUNE UP opens the toolbox (a phone zone, where the bar has no room for it)', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    const watch = await prepare(page);
    await page.goto('index.html?demo&nostart&flat#zone=technique-lab');
    expect(await settledFit(page)).toBe('fit-tight');
    await page.locator('#avBadge .avb-btn').click();
    await page.locator('#avBadge .avb-tune').click();
    await page.waitForURL(/note-checker\/index\.html/, {timeout: 10_000});
    watch.check();
  });
});

test.describe('ARCADE VIEW: LIST ⇄ CABINETS', () => {
  test('the first time: CABINETS with WebGL, else LIST; the button is pressed inside either view', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page);
    await page.goto('index.html?demo&nostart&flat');
    const gl = await page.evaluate(() => { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); });
    const btn = page.locator('#viewBtn');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toHaveAttribute('data-mode', gl ? 'cabinets' : 'list');
    await btn.click();
    await expect.poll(async () => (await state(page)).view).toBe(gl ? 'full' : 'all');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    // pressed again: out to where it was opened from
    await btn.click();
    await expect.poll(async () => (await state(page)).view).toBe('lobby');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    watch.check();
  });

  test('the switch flips the view, keeps the front game, is remembered across reloads; Back skips it', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: store('cabinets')});
    await page.goto('index.html?demo&nostart&flat');
    await page.locator('#viewBtn').click();
    await expect.poll(async () => (await state(page)).view).toBe('full');
    expect(page.url()).toMatch(/#full-arcade/);
    // the switch: a radiogroup, CABINETS checked
    const sw = page.locator('#zoneView .vsw');
    await expect(sw).toHaveAttribute('role', 'radiogroup');
    await expect(sw.getByRole('radio', {name: 'Cabinets'})).toHaveAttribute('aria-checked', 'true');
    await expect(sw.getByRole('radio', {name: 'List'})).toHaveAttribute('aria-checked', 'false');
    for (const r of await sw.getByRole('radio').all()) { const b = await r.boundingBox(); expect(b.height).toBeGreaterThanOrEqual(44); }
    // turn to another game, then LIST: scrolled to that game's card
    await page.locator('#nextBtn').click(); await page.locator('#nextBtn').click();
    const front = (await state(page)).game;
    await sw.getByRole('radio', {name: 'List'}).click();
    await expect.poll(async () => (await state(page)).view).toBe('all');
    expect(page.url()).toMatch(/#all-games$/);
    await expect(page.locator(`#allGrid .gcard[data-game="${front}"]`)).toBeInViewport();
    await expect(page.locator('#allView .vsw-opt[data-mode="list"]')).toBeFocused();       // the focus stays on the switch
    await expect(page.locator('#viewBtn')).toHaveAttribute('data-mode', 'list');
    // the keyboard: an arrow on the switch = CABINETS, with the same game in front
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await state(page)).view).toBe('full');
    await expect(page.locator('#zoneView .vsw-opt[data-mode="cabinets"]')).toBeFocused();
    expect((await state(page)).game).toBe(front);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await state(page)).view).toBe('all');
    // remembered: a reload, the lobby, ARCADE VIEW = LIST
    await page.goto('index.html?demo&nostart&flat');
    expect(await page.evaluate(() => Arcade.store.gameData('floor').arcadeView)).toBe('list');
    await expect(page.locator('#viewBtn')).toHaveAttribute('data-mode', 'list');
    await page.locator('#viewBtn').click();
    await expect.poll(async () => (await state(page)).view).toBe('all');
    await page.locator('#allView .vsw-opt[data-mode="cabinets"]').click();
    await expect.poll(async () => (await state(page)).view).toBe('full');
    // Back: the lobby (switching replaced the history entry, it didn't add one)
    await page.locator('#backBtn').click();
    await expect.poll(async () => (await state(page)).view).toBe('lobby');
    watch.check();
  });

  test('LIST → CABINETS turns to the last card tapped', async ({page}) => {
    const watch = await prepare(page, {store: store('list', 'snare')});
    await page.goto('index.html?demo&nostart&flat#all-games');
    await page.locator('#allGrid .gcard[data-game="scale-trainer"]').click();        // not for snare: the fit panel, no page change
    await expect(page.locator('#fitDlg')).toBeVisible();
    await page.locator('#fitClose').click();
    await page.locator('#allView .vsw-opt[data-mode="cabinets"]').click();
    await expect.poll(async () => (await state(page)).view).toBe('full');
    expect((await state(page)).game).toBe('scale-trainer');
    expect(await page.evaluate(() => Arcade.store.gameData('floor').arcadeView)).toBe('cabinets');
    watch.check();
  });

  test('#all-games and #full-arcade open the right view; Back from a game returns to CABINETS', async ({page}) => {
    const watch = await prepare(page, {store: store('list')});
    await page.goto('index.html?demo&nostart&flat#all-games');
    await expect.poll(async () => (await state(page)).view).toBe('all');
    await expect(page.locator('#viewBtn')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('index.html?demo&nostart&flat#full-arcade&game=ghost-notes');
    await expect.poll(async () => (await state(page)).view).toBe('full');
    expect((await state(page)).game).toBe('ghost-notes');
    await expect(page.locator('#zoneView .vsw')).toBeVisible();
    // START → the game; its "← ARCADE" (index.html#<game id>) → CABINETS, that game in front
    await page.locator('#aisle .slot[data-d="0"] .cab-start').click();
    await page.waitForURL(/ghost-notes\/index\.html/, {timeout: 10_000});
    await page.goto('index.html?demo&nostart&flat#ghost-notes');
    await expect.poll(async () => (await state(page)).view).toBe('full');
    expect((await state(page)).game).toBe('ghost-notes');
    // a zone's own carousel has no switch
    await page.goto('index.html?demo&nostart&flat#zone=technique-lab');
    await expect.poll(async () => (await state(page)).view).toBe('zone');
    await expect(page.locator('#zoneView .vsw')).toBeHidden();
    await expect(page.locator('#viewBtn')).toHaveAttribute('aria-pressed', 'false');
    watch.check();
  });
});

test.describe('THE LEADERBOARD\'S TITLE', () => {
  for (const [name, size] of [SIZES[2], SIZES[1], SIZES[3]]) {
    test(`${name}: 🏆 LEADERBOARD 🏆 centered on the panel, ✕ at the right edge`, {tag: '@quick'}, async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page);
      await page.goto('index.html?demo&nostart');
      test.skip(!(await page.evaluate(() => Arcade.Leaderboard && Arcade.Leaderboard.available())), 'no scoreboard address set');
      if (await page.locator('#lbBtn').isVisible()) await page.locator('#lbBtn').click();
      else { await page.locator('#avBadge .avb-btn').click(); await page.locator('#avBadge .avb-lb').click(); }   // a phone: the badge's menu
      await expect(page.locator('#lbView')).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Leaderboard', exact: true})).toBeVisible();   // the trophies are aria-hidden
      const m = await page.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect();
        const t = [...document.querySelectorAll('#lbTitle .lb-trophy')].map(e => e.getBoundingClientRect());
        return {n: t.length, hidden: [...document.querySelectorAll('#lbTitle .lb-trophy')].every(e => e.getAttribute('aria-hidden') === 'true'),
          fits: (e => e.scrollWidth <= e.clientWidth)(document.getElementById('lbTitle')), word: r('#lbTitle .lb-t-word'), t0: t[0], t1: t[1], panel: r('.lb-in'), x: r('.lb-x'), title: r('#lbTitle'),
          caps: getComputedStyle(document.querySelector('#lbTitle .lb-t-word')).textTransform};
      });
      expect(m.n).toBe(2);
      expect(m.hidden).toBe(true);
      expect(m.caps).toBe('uppercase');
      expect(m.t0.right).toBeLessThanOrEqual(m.word.left + .5);         // one on each side of the word
      expect(m.t1.left).toBeGreaterThanOrEqual(m.word.right - .5);
      expect(Math.abs(m.t0.height - m.t1.height)).toBeLessThanOrEqual(1);   // the same size
      expect(Math.abs((m.t0.left + m.t1.right) / 2 - (m.panel.left + m.panel.right) / 2)).toBeLessThanOrEqual(4);
      expect(Math.abs((m.word.left + m.word.right) / 2 - (m.panel.left + m.panel.right) / 2)).toBeLessThanOrEqual(4);
      expect(Math.abs(m.x.right - m.panel.right)).toBeLessThanOrEqual(1);   // ✕ at the right edge
      expect(m.t1.right).toBeLessThanOrEqual(m.x.left);                    // never under it
      expect(m.title.bottom - m.title.top).toBeLessThan(80);               // one line
      expect(m.fits, 'the title overflows its column').toBe(true);
      watch.check();
    });
  }
});
