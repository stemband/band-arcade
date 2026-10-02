/* SEASONAL TOKENS (shared/tokens.js iconHTML/skin, shared/tokens.css, the `token` field in shared/seasons.js): one
   token icon everywhere (the Prize Counter, the badge menu, a results screen, the lobby's wish line, Arcade Quest's
   Token Booth), whose picture is the running event's (candy corn in Spooky Season, a snowflake coin in Winter Fest…)
   and the normal coin otherwise; only the picture changes, never the balance, the prices or the words.
   GALLERY=1 also saves docs/gallery/tokens.png: every skin at 16, 20 and 32 px (+ Arcade Quest's pixel style). */
const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const ROOT = path.join(__dirname, '..');
const QUEST = {keysTip: true, settings: {textSpeed: 'instant', dodge: 'easy'}};
const store = () => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': QUEST}});
/** the skin of a token icon: its tk-<skin> class (not tk-ic / tk-px) */
const skinOf = loc => loc.evaluate(e => [...e.classList].filter(c => /^tk-/.test(c) && c !== 'tk-ic' && c !== 'tk-px').map(c => c.slice(3)).join(' '));

async function floor(page, q) {
  await page.goto(`index.html?demo&nostart${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Tokens && Arcade.Prizes && document.getElementById('prizeSign'));
}
async function booth(page, q) {
  await page.goto(`arcade-quest/index.html?demo&test${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => { Arcade.Quest.talk.npc('terry'); });
  for (let i = 0; i < 40 && !(await page.locator('.q-booth .q-btn').count()); i++) {
    const t = page.locator('#qText:not([hidden])');
    if (await t.count()) await t.click({force: true});
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.q-booth .q-btn').first()).toBeVisible();
}

/** every place a token shows, on the date (or preview) `q`: {counter, card, tray, sign, wish, badge, results, booth} */
async function everyPlace(page, q) {
  const out = {};
  await floor(page, q);
  await page.evaluate(() => {                                   // stars to turn in, and a wish that's affordable
    const s = Arcade.store;
    s.setLevel('note-storm', s.instId, 1, {stars: 3, best: 10}, 3);
    const T = Arcade.Tokens, w = T.weekly();
    const key = T.catalog().find(it => !it.questOnly && !it.season && it.key !== w.key && it.full <= 300).key;
    T.add(400); T.setWish(key);
  });
  await floor(page, q);
  out.sign = await skinOf(page.locator('#prizeSign .zs-bal .tk-ic'));
  out.wish = await skinOf(page.locator('#prizeSign .zs-wish-go .tk-ic'));
  await expect(page.locator('#prizeSign .zs-wish-go')).toHaveText('You can get your wish!');
  const bal = await page.evaluate(() => Arcade.Tokens.balance());
  await page.locator('#prizeSign').click();
  await expect(page.locator('#prizes')).toBeVisible();
  out.counter = await skinOf(page.locator('#prizes .pz-wallet .tk-ic'));
  await expect(page.locator('#prizes .pz-wallet')).toHaveText(`${bal} tokens`);
  out.tray = await page.evaluate(() => {                        // TURN IN: the tokens spill into the tray (read at once:
    document.querySelector('.pz-turn').click();                  // the counter redraws after the count-up)
    return [...new Set([...document.querySelectorAll('.pz-tray .pz-spill')].map(e => [...e.classList].filter(c => /^tk-/.test(c) && c !== 'tk-ic').join(' ')))];
  });
  await expect(page.locator('#pzBal')).toHaveText(String(bal + 15));
  out.prices = await page.evaluate(() => Arcade.Tokens.catalog().filter(it => !it.season).map(it => [it.key, Arcade.Tokens.price(it.key).full]));
  await page.locator('.pz-wall [data-key]').first().click();
  out.card = await skinOf(page.locator('#pzCard .pz-card-price .tk-ic'));
  await expect(page.locator('#pzCard .pz-card-price')).toContainText(/\d+ tokens/);
  // a game page: the badge menu, a results screen
  await page.goto(`note-storm/index.html?demo&nostart${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.UI && Arcade.Tokens && Arcade.store);
  await page.waitForTimeout(200);
  await page.evaluate(() => { const s = Arcade.store; s.setLevel('note-storm', s.instId, 2, {stars: 2, best: 10}, 2); Arcade.UI.results.show({title: 'Level cleared', stars: 2}); });
  out.results = await skinOf(page.locator('#resTokens .tk-ic'));
  await expect(page.locator('#resTokens')).toHaveText('+2 ★ = 10 tokens at the Prize Counter');
  await page.evaluate(() => Arcade.UI.results.hide());
  await page.locator('#topbar .avb-btn').click();
  out.badge = await skinOf(page.locator('#topbar .avb-prize .tk-ic'));
  await expect(page.locator('#topbar .avb-prize')).toContainText(/\d+ tokens/);
  // Arcade Quest's Token Booth: the pixel style of the same skin
  await booth(page, q);
  const px = page.locator('.q-booth .tk-ic').first();
  expect(await px.evaluate(e => e.classList.contains('tk-px'))).toBe(true);
  out.booth = await skinOf(px);
  // every icon is decoration only
  expect(await page.locator('.tk-ic:not([aria-hidden="true"])').count()).toBe(0);
  return out;
}
const all = skin => ({sign: skin, wish: skin, counter: skin, card: skin, results: skin, badge: skin, booth: skin});

test('normal days: the coin everywhere a token shows', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: store()});
  const r = await everyPlace(page, '&today=2026-09-15');
  expect(r).toMatchObject(all('coin'));
  expect(r.tray).toEqual(['tk-coin']);
  watch.check();
});

test('Spooky Season: candy corn everywhere, candy corns tumble into the tray, the same balance and prices', async ({browser}) => {
  const run = async q => {
    const ctx = await browser.newContext(), page = await ctx.newPage();
    const watch = await prepare(page, {store: store()});
    const r = await everyPlace(page, q);
    watch.check(); await ctx.close();
    return r;
  };
  const [plain, spooky] = await Promise.all([run('&today=2026-09-15'), run('&today=2026-10-15')]);
  expect(spooky).toMatchObject(all('candycorn'));
  expect(spooky.tray).toEqual(['tk-candycorn']);
  // only the picture changes: every price is the same (the seasonal shelf and the week's discount aside), and the
  // balance above counted up by exactly 3 ★ × 5
  expect(spooky.prices).toEqual(plain.prices);
});

test('Winter Fest = snowflake; ?season=friendship previews the candy heart; a background-only season keeps the coin', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  const skinAt = async q => { await floor(page, q); return page.evaluate(() => [Arcade.Tokens.skin(), Arcade.Tokens.iconHTML()]); };
  expect(await skinAt('&today=2026-12-10')).toEqual(['snowflake', '<i class="tk-ic tk-snowflake" aria-hidden="true"></i>']);
  expect((await skinAt('&today=2027-01-03'))[0]).toBe('snowflake');               // Winter Fest crosses New Year
  expect((await skinAt('&season=friendship'))[0]).toBe('candyheart');
  expect((await skinAt('&today=2026-11-15'))[0]).toBe('coin');                    // Fall Harvest: a backdrop only
  expect((await skinAt('&today=2026-10-15&season=frost'))[0]).toBe('coin');        // previewing a backdrop on a Spooky day
  expect(await page.locator('#prizeSign .zs-bal .tk-ic.tk-coin').count()).toBe(1);
  // every event has a picture in tokens.css (an id with none would fall back to the plain coin)
  const css = fs.readFileSync(path.join(ROOT, 'shared/tokens.css'), 'utf8');
  const ids = await page.evaluate(() => Arcade.SEASONS.map(e => e.token));
  expect(ids).toEqual(['candycorn', 'snowflake', 'candyheart', 'goldnote', 'blossom', 'seashell']);
  for (const id of ids) { expect(css).toContain(`.tk-${id}`); expect(css).toContain(`.tk-px.tk-${id}`); }
  watch.check();
});

test('the picture is decided before it shows: never swapped after the page draws', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await page.addInitScript(() => {
    window.__tkSeen = [];
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('tk-ic')) window.__tkSeen.push(m.target.className);
    })).observe(document, {subtree: true, attributes: true, attributeFilter: ['class']});
  });
  await floor(page, '&today=2026-10-15');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__tkSeen)).toEqual([]);
  expect(await skinOf(page.locator('#prizeSign .zs-bal .tk-ic'))).toBe('candycorn');
  watch.check();
});

test('no 🎟 emoji left in the arcade, and every page that can show tokens loads the season calendar', () => {
  const files = [];
  const walk = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
    if (['node_modules', '.git', 'tests'].includes(e.name)) return;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(html|js|css)$/.test(e.name)) files.push(p);
  });
  walk(ROOT);
  const emoji = files.filter(f => fs.readFileSync(f, 'utf8').includes('🎟')).map(f => path.relative(ROOT, f));
  expect(emoji).toEqual([]);
  // a page with avatars (results lines, the badge) or the Prize Counter must load seasons.js, so it shows the same
  // token as every other page that day
  const pages = files.filter(f => f.endsWith('.html')).filter(f => { const t = fs.readFileSync(f, 'utf8'); return /shared\/(avatar|prizes)\.js/.test(t) && /shared\/storage\.js/.test(t); });   // no storage = no wallet (the avatar card)
  expect(pages.length).toBeGreaterThan(15);
  const missing = pages.filter(f => !/shared\/seasons\.js/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(ROOT, f));
  expect(missing).toEqual([]);
});

test('the sheet of every skin (GALLERY=1 saves docs/gallery/tokens.png)', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('docs/gallery.html');
  const rows = page.locator('#tokens tr[data-skin]');
  await expect(rows).toHaveCount(7);
  expect(await rows.evaluateAll(l => l.map(r => r.dataset.skin))).toEqual(['coin', 'candycorn', 'snowflake', 'candyheart', 'goldnote', 'blossom', 'seashell']);
  // each skin really draws (its own picture: a mask or a coin, never an empty box), at its size
  const sizes = await page.locator('#tokens tr[data-skin="candycorn"] td .tk-ic').evaluateAll(l => l.map(e => Math.round(e.getBoundingClientRect().width)));
  expect(sizes).toEqual([16, 20, 32, 15, 24, 20]);
  const masks = await rows.evaluateAll(l => l.map(r => { const s = getComputedStyle(r.querySelector('.tk-ic')); return s.maskImage || s.webkitMaskImage || 'none'; }));
  expect(masks.map(m => m !== 'none')).toEqual([false, true, false, true, false, true, true]);
  if (process.env.GALLERY) await page.locator('#tokens').screenshot({path: path.join(ROOT, 'docs/gallery/tokens.png')});
  watch.check();
});
