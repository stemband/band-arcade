/* LEVEL LINKS and UP NEXT (shared/ui.js Arcade.LevelLink, shared/level-select.js).
   A link like ghost-notes/index.html?level=3&notes=bb&order=scale opens the game with that note set and that level
   selected (START ready); a locked level falls back to the highest open one below it and says so. The address loses the
   link's words at once (so nothing carries them to another page), and the wish survives Select Player. The ASSIGNED card
   (shared/featured.js level/notes) uses the same wish. UP NEXT: a returning student whose last level is cleared and
   whose next level is open but unplayed gets that next level selected. ?demo shows COPY LINK TO THIS LEVEL. */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

const appeared = page => page.waitForFunction(() => Arcade.LevelSelect && Arcade.LevelSelect.state() && Arcade.LevelSelect.state().appeared);
const ls = page => page.evaluate(() => Arcade.LevelSelect.state());
/** stars for Ghost Notes' First 5 · Random, levels 1-based */
async function stars(page, levels) {
  await page.evaluate(lv => { for (const [n, s] of Object.entries(lv)) Arcade.store.setLevel('ghost-notes', Arcade.store.instId, +n, {stars: s, best: 10}, 3); }, levels);
}

test.describe('level links', () => {
  test('?level=3&notes=bb&order=scale selects Concert B♭ · Scale order, Level 3; the address drops the link', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart&level=3&notes=bb&order=scale');
    await appeared(page);
    const s = await ls(page);
    expect([s.sel, s.ready, s.linked]).toEqual([2, true, true]);
    expect(s.summary).toBe('Level 3 · Concert B♭ · Scale order');
    await expect(page.locator('.mp-note[data-notes="Bb"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mp-ord[data-order="order"]')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).search).toBe('?demo&nostart');
    expect(await page.evaluate(() => [Arcade.params.has('level'), sessionStorage.getItem(Arcade.LevelLink.KEY)])).toEqual([false, null]);
    // the link is used once: the screen remembers it as the student's own choice
    await page.goto('ghost-notes/index.html?demo&nostart');
    await appeared(page);
    expect((await ls(page)).sel).toBe(2);
    watch.check();
  });

  test('a locked level opens the highest open one below it, with a line saying so', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?nostart');
    await appeared(page);
    await stars(page, {1: 3});                                   // level 1 cleared: level 2 open, 3+ locked
    await page.goto('ghost-notes/index.html?nostart&level=5');
    await appeared(page);
    const s = await ls(page);
    expect([s.sel, s.linked]).toEqual([1, true]);
    await expect(page.locator('.ls-bn')).toHaveText(/Level 5 is still locked\. Clear Level 2 to get there!/);
    watch.check();
  });

  test('a level past the last one opens the last level; bad words are ignored', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart&level=99&notes=zz&order=sideways');
    await appeared(page);
    const n = await page.locator('.ls-card').count();
    expect((await ls(page)).sel).toBe(n - 1);
    await expect(page.locator('.mp-note[data-notes="first5"]')).toHaveAttribute('aria-pressed', 'true');
    watch.check();
  });

  test('the wish survives Select Player: a floor link ?game=…&level= with no instrument saved', async ({page}) => {
    const watch = await prepare(page, {store: null});
    await page.goto('index.html?demo&game=note-storm&level=2');
    await page.waitForFunction(() => document.body.classList.contains('in-select'));
    expect(new URL(page.url()).searchParams.has('level')).toBe(false);
    await page.evaluate(() => Arcade.store.setPlayer('trumpet'));
    await page.goto('note-storm/index.html?demo&nostart');
    await appeared(page);
    expect((await ls(page)).sel).toBe(1);
    watch.check();
  });

  test('a wish for one game never selects a level in another', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await appeared(page);
    await page.evaluate(() => Arcade.LevelLink.wish('note-storm', {level: 4}));
    await page.goto('ghost-notes/index.html?demo&nostart');
    await appeared(page);
    expect((await ls(page)).linked).toBe(false);
    expect(await page.evaluate(() => Arcade.LevelLink.peek('note-storm').level)).toBe(4);
    watch.check();
  });

  test('the ASSIGNED card opens featured.js level + notes', async ({page}) => {
    const watch = await prepare(page);
    await page.route('**/shared/featured.js*', r => r.fulfill({contentType: 'application/javascript',
      body: "window.Arcade = window.Arcade || {}; window.Arcade.FEATURED = {game: 'ghost-notes', note: 'Level 4!', level: 4, notes: 'eb'};"}));
    await page.goto('index.html?demo');
    await page.locator('.lcard.lc-assigned').click();
    await page.waitForURL(/ghost-notes\/index\.html/);
    await appeared(page);
    const s = await ls(page);
    expect([s.sel, s.linked]).toEqual([3, true]);
    expect(s.summary).toMatch(/^Level 4 · Concert E♭/);
    watch.check();
  });
});

test.describe('up next', () => {
  test('last level cleared, the next open and unplayed: START is the next level, "Up next"', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?nostart');
    await appeared(page);
    await page.locator('.ls-card').nth(0).click();               // the student's level: 1
    await stars(page, {1: 2});
    await page.reload();
    await appeared(page);
    const s = await ls(page);
    expect([s.sel, s.next]).toEqual([1, true]);
    await expect(page.locator('.ls-start .ls-sum')).toHaveText(/^Up next · Level 2/);
    // a tap on another card: no more "Up next"
    await page.locator('.ls-card').nth(0).click();
    await expect(page.locator('.ls-start .ls-sum')).toHaveText(/^Level 1/);
    watch.check();
  });

  test('the next level already has stars (the student went back on purpose): the remembered level stays', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?nostart');
    await appeared(page);
    await stars(page, {1: 3, 2: 1});
    await page.locator('.ls-card').nth(0).click();
    await page.reload();
    await appeared(page);
    expect(await ls(page)).toMatchObject({sel: 0, next: false});
    watch.check();
  });

  test('the remembered level not cleared yet: it stays', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?nostart');
    await appeared(page);
    await page.locator('.ls-card').nth(0).click();
    await page.reload();
    await appeared(page);
    expect(await ls(page)).toMatchObject({sel: 0, next: false});
    watch.check();
  });
});

test.describe('copy link (?demo only)', () => {
  test('?demo: COPY LINK builds the level link for the selected level and notes; students never see it', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('ghost-notes/index.html?demo&nostart');
    await appeared(page);
    await page.locator('.mp-note[data-notes="F"]').click();
    await page.locator('.ls-card').nth(4).click();
    const href = await page.locator('.ls-link').getAttribute('data-href');
    const u = new URL(href);
    expect(u.pathname).toMatch(/\/ghost-notes\/index\.html$/);
    expect(u.search).toBe('?level=5&notes=f');
    await page.goto('ghost-notes/index.html?nostart');
    await appeared(page);
    await page.locator('.ls-card').nth(0).click();
    await expect(page.locator('.ls-start')).toBeVisible();
    await expect(page.locator('.ls-link')).toHaveCount(0);
    watch.check();
  });
});
