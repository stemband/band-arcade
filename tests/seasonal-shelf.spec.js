/* THE SEASONAL SHELF (the Prize Counter + Arcade Quest's Token Booth, shared/tokens.js): NEW items with unlock
   {shop, season} sold only during their event at both counters, owned forever after; never the Prize of the Week and
   never discounted; the events' own EARNED items never sold; the countdown, "Last day!" and the "Coming soon" card
   (across New Year too); a seasonal wish clearing when its event ends; the codes; every new item drawing at every
   size; Music Note Sparkles still under reduced motion; the event panel's line; the Locker's words. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const QUEST = {keysTip: true, settings: {textSpeed: 'instant', dodge: 'easy'}};
const store = () => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': QUEST}});
const SPOOKY = '2026-10-20', OFF = '2026-11-15';
const floorAt = async (page, date, extra = '') => {
  await page.goto(`index.html?demo&nostart&today=${date}${extra}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Tokens && Arcade.Prizes && Arcade.Seasons && document.getElementById('prizeSign'));
};
async function openCounter(page) { await page.locator('#prizeSign').click(); await expect(page.locator('#prizes')).toBeVisible(); }
async function questAt(page, date) {
  await page.goto(`arcade-quest/index.html?demo&test&today=${date}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
}
async function boothItems(page) {
  await page.evaluate(() => { Arcade.Quest.talk.npc('terry'); });
  for (let i = 0; i < 40 && !(await page.locator('.q-booth .q-btn').count()); i++) {
    const t = page.locator('#qText:not([hidden])'); if (await t.count()) await t.click({force: true});
    await page.waitForTimeout(80);
  }
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  await expect(page.locator('.q-cosshop')).toBeVisible();
}
const SPOOKY_KEYS = ['hand:treatbucket', 'back:webcape', 'pet:blackcat'];

test('a seasonal item: bought during its event at both counters, refused outside it, owned forever', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floorAt(page, SPOOKY);
  await page.evaluate(() => Arcade.Tokens.add(1000));
  await openCounter(page);
  const shelf = page.locator('.pz-s-season');
  await expect(shelf.locator('.pz-prize')).toHaveCount(3);
  expect(await shelf.locator('.pz-prize').evaluateAll(b => b.map(x => x.dataset.key).sort())).toEqual(SPOOKY_KEYS.slice().sort());
  await shelf.locator('[data-key="pet:blackcat"]').click();
  await expect(page.locator('#pzCard')).toContainText('Spooky Season only');
  await page.locator('#pzCard [data-c=buy]').click();
  await expect(page.locator('#uiConfirm')).toContainText('Buy the Black Cat for 350 tokens?');
  await page.locator('#uiConfirm [data-act=yes]').click();
  await expect(page.locator('#pzCard')).toContainText('is yours');
  // Arcade Quest's booth: "Seasonal", and the cape bought there
  await questAt(page, SPOOKY);
  await boothItems(page);
  const cape = page.locator('.q-cosshop .q-btn', {hasText: 'Spiderweb Cape'});
  await expect(cape).toContainText('SEASONAL: gone in 12 days!');
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'Black Cat'})).toContainText('OWNED');
  await cape.click();
  await expect(page.locator('.q-cosshop')).toContainText('The Spiderweb Cape is yours');
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(400);
  // after the event: refused (with the reason), not on the booth, still owned
  await questAt(page, OFF);
  const r = await page.evaluate(() => ({buy: Arcade.Tokens.buy('hand:treatbucket'), quest: Arcade.Tokens.buy('hand:treatbucket', {counter: 'quest'}),
    owned: ['pet:blackcat', 'back:webcape', 'hand:treatbucket'].map(k => Arcade.Tokens.owned(k)), bal: Arcade.Tokens.balance()}));
  expect(r.buy).toMatchObject({ok: false, why: 'offSeason', text: 'The Jack-o\'-Lantern Treat Bucket is only sold during Spooky Season.'});
  expect(r.quest.why).toBe('offSeason');
  expect(r.owned).toEqual([true, true, false]);
  expect(r.bal).toBe(400);
  await boothItems(page);
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'Treat Bucket'})).toHaveCount(0);
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'SEASONAL'})).toHaveCount(0);
  watch.check();
});

test('never the Prize of the Week, never discounted; the events\' own earned items are never sold', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floorAt(page, SPOOKY);
  const r = await page.evaluate(() => {
    const T = Arcade.Tokens, S = Arcade.Seasons, seasonal = T.catalog().filter(it => it.season).map(it => it.key), weeks = [];
    for (let i = 0; i < 160; i++) weeks.push(T.weekly(new Date(2026, 0, 5 + 7 * i)).key);
    const earned = [].concat(...S.list().map(ev => S.itemsOf(ev).map(it => it.key)));
    return {n: seasonal.length, weekly: weeks.filter(k => seasonal.includes(k)), full: seasonal.filter(k => T.price(k).price !== T.price(k).full || T.price(k).weekly),
      byEvent: S.list().map(ev => T.catalog().filter(it => it.season === ev.id).length),
      earned: earned.length, sold: earned.filter(k => T.item(k)), refused: earned.map(k => [T.canBuy(k).why, T.canBuy(k, {counter: 'quest'}).why]).filter(([a, b]) => a !== 'unknown' || b !== 'unknown'),
      manor: T.catalog().filter(it => it.season && it.questOnly).length};
  });
  expect(r.n).toBe(18);
  expect(r.byEvent).toEqual([3, 3, 3, 3, 3, 3]);
  expect(r.weekly).toEqual([]);
  expect(r.full).toEqual([]);
  expect(r.earned).toBeGreaterThan(20);
  expect(r.sold).toEqual([]);
  expect(r.refused).toEqual([]);
  expect(r.manor).toBe(0);
  // and none of them on either counter's shelves
  await openCounter(page);
  await expect(page.locator('#prizes [data-key="head:pumpkin"], #prizes [data-key="pet:boo"]')).toHaveCount(0);
  await questAt(page, SPOOKY);
  await boothItems(page);
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'Pumpkin head'})).toHaveCount(0);
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'Boo the ghost'})).toHaveCount(0);
  watch.check();
});

// three tests side by side (each date is a whole arcade floor loading)
const countdownAt = page => async date => {
  await floorAt(page, date);
  await openCounter(page);
  const s = await page.evaluate(() => Arcade.Prizes.state());
  await page.keyboard.press('Escape');
  return s;
};
const COUNTDOWN = 'the countdown ("gone in 12 days!" … "Last day!") and the Coming soon card, across New Year too';
test(`${COUNTDOWN}: Spooky Season`, async ({page}) => {
  const watch = await prepare(page, {store: store()}), at = countdownAt(page);
  const s = await at(SPOOKY);
  expect(s.season.sign).toBe('🎃 Spooky Season shelf · gone in 12 days!');
  expect(s.touch).toBe(true);
  expect((await at('2026-10-31')).season.left).toBe('gone tomorrow!');
  expect((await at('2026-11-01')).season.sign).toBe('🎃 Spooky Season shelf · Last day!');
  watch.check();
});
test(`${COUNTDOWN}: between events, Coming soon`, async ({page}) => {
  const watch = await prepare(page, {store: store()}), at = countdownAt(page);
  const s = await at(OFF);
  expect(s.season).toBeNull();
  expect(s.soon).toMatchObject({event: 'winter', text: '❄️ Coming soon: Winter Fest shelf, Dec 1'});
  expect(s.soon.items.sort()).toEqual(['hand:cocoa', 'pet:snowyowl', 'top:knitsweater']);
  expect(s.touch).toBe(false);
  await expect(page.locator('.pz-soon .pz-sil')).toHaveCount(3);
  expect((await at('2026-06-15')).soon.text).toBe('🎃 Coming soon: Spooky Season shelf, Oct 1');
  watch.check();
});
test(`${COUNTDOWN}: Winter Fest across New Year`, async ({page}) => {
  const watch = await prepare(page, {store: store()}), at = countdownAt(page);
  expect((await at('2026-12-30')).season.sign).toBe('❄️ Winter Fest shelf · gone in 8 days!');      // Winter Fest runs into January
  expect((await at('2027-01-07')).season.left).toBe('Last day!');
  expect((await at('2027-01-10')).soon.text).toBe('💖 Coming soon: Friendship Week shelf, Feb 7');
  watch.check();
});

test('a seasonal wish: "gone in 12 days!" on the lobby, then it clears when the event ends', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floorAt(page, SPOOKY);
  await page.evaluate(() => Arcade.Tokens.add(100));
  await openCounter(page);
  await page.locator('.pz-s-season [data-key="pet:blackcat"]').click();
  await page.locator('#pzCard [data-c=wish]').click();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const sign = page.locator('#prizeSign');
  await expect(sign).toContainText('Wish: Black Cat · 100 / 350');
  await expect(sign).toContainText('gone in 12 days!');
  await floorAt(page, OFF);
  expect(await page.evaluate(() => Arcade.Tokens.wish())).toBeNull();
  await expect(page.locator('#prizeSign')).toContainText('The Black Cat will be back next Spooky Season.');
  // a new wish replaces the note
  await page.evaluate(() => Arcade.Tokens.setWish('back:jetpack'));
  await expect(page.locator('#prizeSign')).not.toContainText('will be back');
  watch.check();
});

test('the new items survive the Arcade Backup Code, the QUEST CODE and the avatar code; old codes still decode', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floorAt(page, SPOOKY);
  const keys = await page.evaluate(() => Object.keys(window.AVATAR_PARTS.SEASON_SHOP));
  const r = await page.evaluate(ks => {
    ks.forEach(k => Arcade.store.ownItem(k));
    const B = Arcade.Backup, q = B.questEncode({level: 2, tokens: 3000, items: {}, roster: [], flags: {}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}});
    const d = B.questDecode(q);
    // the avatar code (shared/avatar-code.js TABLE) carries each new id
    const av = Arcade.Avatar.get(), share = [];
    ks.forEach(k => { const [f, id] = k.split(':'); const a = Object.assign({}, av, {[f]: id}); const back = Arcade.avatarCode.decode(Arcade.avatarCode.encode(a)); share.push([k, back && (back.avatar || back)[f]]); });
    return {owned: d.fields.cosmetics.owned, v5: B.QUEST_V5.cosmetics, share};
  }, keys);
  keys.forEach(k => { expect(r.v5).toContain(k); expect(r.owned).toContain(k); });
  r.share.forEach(([k, id]) => expect(id, k).toBe(k.split(':')[1]));
  const code = await page.evaluate(() => Arcade.Backup.fullEncode());
  await page.evaluate(() => localStorage.clear());
  await floorAt(page, SPOOKY);
  const back = await page.evaluate(async ([c, ks]) => { const d = await Arcade.Backup.fullDecode(c); Arcade.store.importAll(d.data); return ks.filter(k => !Arcade.store.ownedItems[k]); }, [code, keys]);
  expect(back).toEqual([]);
  // the frozen fixtures (v1–v4) still decode exactly
  const OLD = require('./fixtures/quest-codes.json');
  for (const [v, {code: c, fields}] of Object.entries(OLD)) expect(await page.evaluate(x => Arcade.Backup.questDecode(x).fields, c), v).toEqual(fields);
  watch.check();
});

test('every new item draws at chip, tile and big size (and full body), with no errors', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART);
  const r = await page.evaluate(() => {
    const out = [], av = Arcade.Avatar.get();
    Object.keys(window.AVATAR_PARTS.SEASON_SHOP).forEach(k => {
      const [f, id] = k.split(':'), a = Object.assign({}, av, {[f]: id});
      ['chip', 'tile', 'big'].forEach(size => { const h = Arcade.avatarHTML({size, avatar: a, label: ''}); if (!/src="data:image\/png/.test(h)) out.push(`${k} ${size}`); });
      const sp = Arcade.Avatar.sprites('trumpet', {avatar: a});
      if (!sp || !sp['-front'] || !sp['-front'].frames.length) out.push(`${k} sprite`);
      if (Arcade.Avatar.bustFrames(a).some(c => !c.width)) out.push(`${k} frames`);
    });
    return out;
  });
  expect(r).toEqual([]);
  watch.check();
});

for (const reduced of [false, true]) {
  test(`Music Note Sparkles ${reduced ? 'stay still with reduced motion' : 'move on the live avatar'}`, async ({page}) => {
    if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await prepare(page, {store: store()});
    await page.goto('index.html?demo&nostart&unlockall');
    await page.waitForFunction(() => window.Arcade && Arcade.Avatar && Arcade.AvatarFx);
    await page.evaluate(() => {
      const d = document.createElement('div'); d.id = 'fxTest'; d.style.cssText = 'position:fixed;left:20px;top:80px;width:260px;z-index:9999';
      d.innerHTML = Arcade.avatarHTML({size: 'big', avatar: Object.assign({}, Arcade.Avatar.get(), {effect: 'notesparkles'}), live: true, label: ''});
      document.body.appendChild(d);
    });
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => Arcade.AvatarFx.state(document.querySelector('#fxTest .av-box')));
    expect(st.fx).toBe(reduced ? null : 'notesparkles');
    expect(await page.evaluate(() => Arcade.AvatarFx.FX.includes('notesparkles'))).toBe(true);
    watch.check();
  });
}

test('the event panel says "New on the Prize Counter: 3 Spooky Season prizes" and opens it; the Locker\'s words', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floorAt(page, SPOOKY);
  const req = await page.evaluate(() => Arcade.Avatar.requirement('pet', 'blackcat'));
  expect(req).toBe('Prize Counter: 350 tokens (Spooky Season only)');
  await page.locator('.ev-banner').click();
  const line = page.locator('.ev-shop');
  await expect(line).toHaveText('New on the Prize Counter: 3 Spooky Season prizes');
  await line.click();
  await expect(page.locator('#prizes .pz-s-season')).toBeVisible();
  await page.keyboard.press('Escape');
  await floorAt(page, OFF);
  expect(await page.evaluate(() => Arcade.Avatar.requirement('pet', 'blackcat'))).toBe('Returns to the Prize Counter next Spooky Season');
  // the Locker shows it locked with those words
  await page.evaluate(() => Arcade.LockerUI.open({tab: 'pets'}));
  await expect(page.locator('#locker .sk-opt[data-item="blackcat"]')).toContainText('Returns to the Prize Counter next Spooky Season');
  watch.check();
});
