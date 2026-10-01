/* THE PRIZE COUNTER + THE SHARED WALLET (shared/tokens.js, shared/prizes.js): one wallet, two counters (the floor's
   Prize Counter and Arcade Quest's Token Booth), the Manor Collection (only in Arcade Quest), the Prize of the Week and
   its discount, the wish bar, QUEST CODE v5 (16-bit tokens), the Arcade Backup Code carrying the wallet, the results
   line, the badge's menu line, the layout at iPad and phone sizes, reduced motion and the keyboard. */
const {test, expect} = require('@playwright/test');
const {prepare, device, offscreen} = require('./helpers');

const QUEST = {keysTip: true, settings: {textSpeed: 'instant', dodge: 'easy'}};
const store = (extra = {}) => device('trumpet', Object.assign({avatarOffered: true, gameData: {'arcade-quest': QUEST}}, extra));
const TODAY = '2026-09-30';                      // a Wednesday: the week of Monday 28 September 2026
const FLOOR = `index.html?demo&nostart&today=${TODAY}`;
const QPAGE = `arcade-quest/index.html?demo&test&today=${TODAY}`;

/** stars for the saved trumpet (Note Storm levels 1–2: 3 + 2) and Chime Heist (the bells: 1) = 6 new stars */
const earn = page => page.evaluate(() => {
  const s = Arcade.store;
  s.setLevel('note-storm', s.instId, 1, {stars: 3, best: 10}, 3);
  s.setLevel('note-storm', s.instId, 2, {stars: 2, best: 10}, 2);
  s.setLevel('chime-heist', 'bells', 1, {stars: 1, best: 10}, 1);
});
async function floor(page, url = FLOOR) {
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Tokens && Arcade.Prizes && document.getElementById('prizeSign'));
}
async function openCounter(page) {
  await page.locator('#prizeSign').click();
  await expect(page.locator('#prizes')).toBeVisible();
}
async function quest(page) {
  await page.goto(QPAGE);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
}
async function booth(page) {
  await page.evaluate(() => { Arcade.Quest.talk.npc('terry'); });
  // Terry's lines: tap the text box (Enter would go to the Test Arena's own menu underneath)
  for (let i = 0; i < 40 && !(await page.locator('.q-booth .q-btn').count()); i++) {
    const t = page.locator('#qText:not([hidden])');
    if (await t.count()) await t.click({force: true});
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.q-booth .q-btn').first()).toBeVisible();
}
const freshAtBooth = page => page.evaluate(() => Arcade.Quest.talk.starSources().reduce((n, s) => n + s.fresh, 0));

test('one wallet: stars turned in at the Prize Counter are gone at the Token Booth, with the same balance', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page); await earn(page); await floor(page);
  expect(await page.evaluate(() => Arcade.Tokens.freshStars())).toBe(6);
  await openCounter(page);
  await expect(page.locator('.pz-panel .pz-mline')).toContainText('6 new ★ = 30 tokens');
  await page.locator('.pz-turn').click();
  await expect(page.locator('#pzBal')).toHaveText('30');
  await expect(page.locator('.pz-turn')).toHaveCount(0);
  await expect(page.locator('.pz-panel .pz-mline')).toContainText('Earn stars in any game, then come back!');
  await quest(page);
  expect(await freshAtBooth(page)).toBe(0);
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(30);
  await booth(page);
  await expect(page.locator('.q-booth .q-btn', {hasText: /Turn in/})).toHaveCount(0);
  await expect(page.locator('.q-booth')).toContainText('You have 30 tokens');
  watch.check();
});

test('one wallet, the other way: stars turned in at the Token Booth are gone at the Prize Counter', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page); await earn(page);
  await quest(page);
  expect(await freshAtBooth(page)).toBe(6);
  await booth(page);
  await page.locator('.q-booth .q-btn', {hasText: 'Turn in 6'}).click();
  await expect(page.locator('.q-booth')).toContainText('Ka-ching');
  await floor(page);
  const st = await page.evaluate(() => ({fresh: Arcade.Tokens.freshStars(), bal: Arcade.Tokens.balance()}));
  expect(st).toEqual({fresh: 0, bal: 30});
  await openCounter(page);
  await expect(page.locator('#pzBal')).toHaveText('30');
  await expect(page.locator('.pz-turn')).toHaveCount(0);
  watch.check();
});

test('a device that never opened Arcade Quest gets only the wallet, and Arcade Quest keeps it', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await floor(page); await earn(page); await floor(page);
  const w = await page.evaluate(() => { Arcade.Tokens.turnIn(); return Arcade.store.gameData('arcade-quest').save; });
  expect(w.v).toBeUndefined();
  expect(Object.keys(w).sort()).toEqual(['converted', 'tokens', 'wallet']);
  expect(w.tokens).toBe(30);
  await quest(page);
  const s = await page.evaluate(() => { const s = Arcade.Quest.save.get(); return {v: s.v, tokens: Arcade.Tokens.balance(), level: s.level, fresh: Arcade.Tokens.freshStars()}; });
  expect(s).toEqual({v: 5, tokens: 30, level: 1, fresh: 0});
  watch.check();
});

test('buying at one counter shows OWNED at the other (both ways)', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page);
  await page.evaluate(() => Arcade.Tokens.add(2000));
  const key = await page.evaluate(() => { const w = Arcade.Tokens.weekly(); return Arcade.Tokens.catalog().find(it => !it.questOnly && !it.season && it.key !== w.key && it.full === 150).key; });
  const name = await page.evaluate(k => Arcade.Tokens.item(k).name, key);
  await openCounter(page);
  await page.locator(`.pz-wall [data-key="${key}"]`).click();
  await expect(page.locator('#pzCard')).toBeVisible();
  await page.locator('#pzCard [data-c=buy]').click();
  await expect(page.locator('#uiConfirm')).toContainText(`Buy the ${name} for 150 tokens?`);
  await page.locator('#uiConfirm [data-act=yes]').click();
  await expect(page.locator('#pzCard')).toContainText('is yours');
  await expect(page.locator('#pzCard [data-c=wear]')).toHaveText('Wear it now');
  await expect(page.locator('#pzCard [data-c=close]')).toHaveText('Keep shopping');
  await page.locator('#pzCard [data-c=close]').click();
  await expect(page.locator(`.pz-wall [data-key="${key}"]`)).toHaveClass(/owned/);
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(1850);
  // …OWNED at Arcade Quest's booth; and one bought there shows OWNED here
  await quest(page);
  await booth(page);
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  await expect(page.locator('.q-cosshop .q-btn', {hasText: name})).toContainText('OWNED');
  const other = await page.evaluate(() => { const w = Arcade.Tokens.weekly(); return Arcade.Tokens.catalog().find(it => !it.questOnly && !it.season && it.key !== w.key && it.full === 200 && !Arcade.Tokens.owned(it.key)); });
  await page.locator('.q-cosshop .q-btn', {hasText: other.name}).click();
  await expect(page.locator('.q-cosshop')).toContainText(`The ${other.name} is yours`);
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(1650);
  await floor(page);
  await openCounter(page);
  await expect(page.locator(`.pz-wall [data-key="${other.key}"]`)).toHaveClass(/owned/);
  watch.check();
});

test('the Manor Collection: behind glass at the Prize Counter (no BUY), for sale in Arcade Quest', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page);
  const r = await page.evaluate(() => {
    const T = Arcade.Tokens; T.add(1000);
    return {manor: T.catalog().filter(it => it.questOnly).map(it => it.key).sort(), refuse: T.buy('head:pirate'), can: T.canBuy('head:pirate'), bal: T.balance(), owned: T.owned('head:pirate'),
      list: window.AVATAR_PARTS.MANOR_COLLECTION};
  });
  expect(r.manor).toEqual(['bg:fireflies', 'hand:wand', 'head:pirate', 'head:royalcrown']);
  expect(r.list).toEqual(['head:pirate', 'hand:wand', 'bg:fireflies', 'head:royalcrown']);
  expect(r.refuse).toMatchObject({ok: false, why: 'questOnly', text: 'Only at the Token Booth in Arcade Quest!'});
  expect(r.can.ok).toBe(false);
  expect(r.bal).toBe(1000);
  expect(r.owned).toBe(false);
  await openCounter(page);
  const shelf = page.locator('.pz-s-manor');
  await expect(shelf).toContainText('Only at the Token Booth in Arcade Quest!');
  await expect(shelf.locator('.pz-prize')).toHaveCount(4);
  await shelf.locator('[data-key="head:pirate"]').click();
  await expect(page.locator('#pzCard')).toContainText('Only at the Token Booth in Arcade Quest!');
  await expect(page.locator('#pzCard [data-c=buy]')).toHaveCount(0);
  await expect(page.locator('#pzCard .pt-box-big')).toHaveCount(1);          // the try-on
  await page.keyboard.press('Escape');
  await expect(page.locator('#pzCard')).toHaveCount(0);
  // Arcade Quest's booth sells it (tagged), and then it's owned everywhere
  await quest(page);
  await booth(page);
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  const pirate = page.locator('.q-cosshop .q-btn', {hasText: 'Pirate hat'});
  await expect(pirate).toContainText('MANOR COLLECTION: only here!');
  await pirate.click();
  await expect(page.locator('.q-cosshop')).toContainText('The Pirate hat is yours');
  expect(await page.evaluate(() => ({bal: Arcade.Tokens.balance(), own: Arcade.Tokens.owned('head:pirate')}))).toEqual({bal: 800, own: true});
  watch.check();
});

test('the Prize of the Week: the same on every device, a new one next week, never a Manor item; 20 % off at both counters', async ({browser}) => {
  const pick = async date => {
    const ctx = await browser.newContext(), page = await ctx.newPage();
    await prepare(page, {store: store()});
    await page.goto(`index.html?demo&nostart&today=${date}`);
    await page.waitForFunction(() => window.Arcade && Arcade.Tokens && Arcade.Avatar);
    const w = await page.evaluate(() => { const w = Arcade.Tokens.weekly(); return {key: w.key, price: w.price, full: w.full, quest: w.item.questOnly, daysLeft: w.daysLeft}; });
    await ctx.close();
    return w;
  };
  const a = await pick('2026-09-30'), b = await pick('2026-09-28'), c = await pick('2026-10-04'), next = await pick('2026-10-05');
  expect(b.key).toBe(a.key);                                             // Monday … Sunday: one week, one prize
  expect(c.key).toBe(a.key);
  expect(next.key).not.toBe(a.key);
  expect(a.daysLeft).toBe(5);
  for (const w of [a, next]) { expect(w.quest).toBe(false); expect(w.price).toBe(Math.round(w.full * 0.8 / 5) * 5); }

  // one device: every item sold at both counters comes round before any repeats
  const ctx = await browser.newContext(), page = await ctx.newPage();
  const watch = await prepare(page, {store: store()});
  await page.goto(`index.html?demo&nostart&today=${TODAY}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Tokens && Arcade.Avatar);
  const r = await page.evaluate(() => {
    const T = Arcade.Tokens, pool = T.catalog().filter(it => !it.questOnly && !it.season).map(it => it.key), out = [];
    const d0 = new Date(2024, 0, 1);
    for (let i = 0; i < pool.length * 3; i++) out.push(T.weekly(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 7 * i)).key);
    const rounds = [0, 1, 2].map(k => out.slice(k * pool.length, (k + 1) * pool.length));
    return {n: pool.length, full: rounds.map(x => new Set(x).size), back2back: out.some((k, i) => i && k === out[i - 1]), manor: out.some(k => T.item(k).questOnly)};
  });
  expect(r.full).toEqual([r.n, r.n, r.n]);
  expect(r.back2back).toBe(false);
  expect(r.manor).toBe(false);
  await ctx.close();
  watch.check();
});

test('the weekly discount at the Prize Counter and at the Token Booth (⭐ WEEKLY)', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page);
  const w = await page.evaluate(() => { const w = Arcade.Tokens.weekly(); Arcade.Tokens.add(1000); return {key: w.key, name: w.item.name, price: w.price, full: w.full}; });
  expect(w.price).toBe(Math.round(w.full * 0.8 / 5) * 5);
  await openCounter(page);
  const spot = page.locator('#pzSpot');
  await expect(spot).toContainText('Prize of the week');
  await expect(spot).toContainText('20 % off');
  await expect(spot.locator('s')).toHaveText(String(w.full));
  await expect(spot).toContainText(`${w.price} tokens`);
  await expect(spot).toContainText('New prize in 5 days');
  await spot.locator('.pz-spot-btn').click();
  await expect(page.locator('#pzCard .pz-card-price')).toContainText(String(w.price));
  await page.locator('#pzCard [data-c=buy]').click();
  await expect(page.locator('#uiConfirm')).toContainText(`for ${w.price} tokens?`);
  await page.locator('#uiConfirm [data-act=no]').click();
  await page.locator('#pzCard [data-c=close]').click();
  await quest(page);
  await booth(page);
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  const b = page.locator('.q-cosshop .q-btn', {hasText: w.name});
  await expect(b).toContainText('⭐ WEEKLY');
  await expect(b).toContainText(`${w.full} ${w.price} tokens`);
  await b.click();
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(1000 - w.price);
  // bought: the spotlight says so
  await floor(page); await openCounter(page);
  await expect(page.locator('#pzSpot')).toContainText("You got this week's prize!");
  watch.check();
});

test('the wish bar: tokens + stars waiting at the counter, then "You can get your wish!"', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page); await earn(page); await floor(page);           // 6 new stars = 30 tokens waiting
  const key = await page.evaluate(() => { const w = Arcade.Tokens.weekly(); return Arcade.Tokens.catalog().find(it => !it.questOnly && !it.season && it.full === 300 && it.key !== w.key).key; });
  const name = await page.evaluate(k => Arcade.Tokens.item(k).name, key);
  await page.evaluate(() => Arcade.Tokens.add(180));
  await openCounter(page);
  await page.locator(`.pz-wall [data-key="${key}"]`).click();
  await page.locator('#pzCard [data-c=wish]').click();
  await expect(page.locator('#pzCard [data-c=wish]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#pzCard [data-c=buy]')).toHaveText('Need 120 more tokens');
  await expect(page.locator('#pzCard [data-c=buy]')).toBeDisabled();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(page.locator('#prizes')).toBeHidden();
  const p = await page.evaluate(() => Arcade.Tokens.wishProgress());
  expect(p).toMatchObject({key, price: 300, have: 180, waiting: 30, affordable: false});
  expect(p.pct).toBeCloseTo(60, 5);
  expect(p.pctWaiting).toBeCloseTo(10, 5);
  const sign = page.locator('#prizeSign');
  await expect(sign).toContainText(`Wish: ${name} · 180 / 300`);
  await expect(sign).toContainText('+30 waiting at the counter');
  expect(await sign.locator('.zs-have').evaluate(e => parseFloat(e.style.width))).toBeCloseTo(60, 3);
  expect(await sign.locator('.zs-wait').evaluate(e => parseFloat(e.style.width))).toBeCloseTo(10, 3);
  await page.evaluate(() => Arcade.Tokens.add(200));
  await expect(sign.locator('.zs-wish-go')).toHaveText('You can get your wish!');
  await expect(sign.locator('.zs-wish-go .tk-ic.tk-coin[aria-hidden="true"]')).toHaveCount(1);
  await expect(sign).toContainText('300 / 300');
  watch.check();
});

test('QUEST CODE v5: tokens and stars turned in above 2047 survive a round trip; the save makes v5', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await quest(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, T = Arcade.Tokens, B = Arcade.Backup;
    T.add(40000);
    const s = Q.save.get(); s.converted = {'m:trumpet': 5000}; Q.save.write();
    const code = Q.save.code(), d = B.questDecode(code);
    Q.save.reset();                                                  // NEW GAME keeps the shared wallet…
    const kept = T.balance();
    T.spend(T.balance()); T.wallet().converted = {};                 // …so empty it by hand before loading the code
    const loaded = Q.save.fromCode(code);
    return {code, kept, len: code.replace(/-/g, '').length, groups: code.split('-').length, d: d.fields, loaded, bal: T.balance(), left: T.wallet().convertedLeft,
      v5list: B.QUEST_V5.cosmetics, v4list: B.QUEST_V4.cosmetics};
  });
  expect(r.kept).toBe(40000);
  expect(r.len).toBe(65);
  expect(r.groups).toBe(13);
  expect(r.d.tokens).toBe(40000);
  expect(r.d.convertedLeft).toBe(5000);
  expect(r.loaded.ok).toBe(true);
  expect(r.bal).toBe(40000);
  expect(r.left).toBe(5000);
  expect(r.v5list.slice(0, r.v4list.length)).toEqual(r.v4list);           // V4 frozen, V5 starts with it
  watch.check();
});

test('the Arcade Backup Code carries the wallet (and a balance over 2047)', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page); await earn(page); await floor(page);
  await page.evaluate(() => { Arcade.Tokens.turnIn(); Arcade.Tokens.add(5000 - Arcade.Tokens.balance()); Arcade.Tokens.setWish('back:jetpack'); });
  const code = await page.evaluate(() => Arcade.Backup.fullEncode());
  await page.evaluate(() => localStorage.clear());
  await floor(page);
  expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(0);
  const after = await page.evaluate(async c => {
    const r = await Arcade.Backup.fullDecode(c); Arcade.store.importAll(r.data);
    return {ok: r.ok, bal: Arcade.Tokens.balance(), fresh: Arcade.Tokens.freshStars(), wish: Arcade.Tokens.wish()};
  }, code);
  expect(after).toEqual({ok: true, bal: 5000, fresh: 0, wish: 'back:jetpack'});
  watch.check();
});

test('a results screen says "+3 ★ = 15 tokens at the Prize Counter", and the badge menu opens the counter', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await page.goto('note-storm/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.UI && Arcade.Tokens && Arcade.store);
  await page.waitForTimeout(200);
  const line = await page.evaluate(() => {
    const s = Arcade.store; s.setLevel('note-storm', s.instId, 1, {stars: 3, best: 10}, 3);
    Arcade.UI.results.show({title: 'Level cleared', stars: 3});
    const t = (document.getElementById('resTokens') || {}).textContent || '';
    Arcade.UI.results.hide(); Arcade.UI.results.show({title: 'Again', stars: 3});            // nothing new this time
    return {t, again: !!document.getElementById('resTokens')};
  });
  expect(line).toEqual({t: '+3 ★ = 15 tokens at the Prize Counter', again: false});
  await page.evaluate(() => Arcade.UI.results.hide());
  await page.locator('#topbar .avb-btn').click();
  const item = page.locator('#topbar .avb-prize');
  await expect(item).toContainText('0 tokens');
  await expect(item).toContainText('Prize Counter');
  await item.click();
  await page.waitForURL(u => /\/index\.html$/.test(new URL(u).pathname) && !/note-storm/.test(u.href || u));
  await expect(page.locator('#prizes')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('prizes')).toBe(false);
  watch.check();
});

const SIZES = [['phone', 390, 844], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['Chromebook', 1366, 768]];
for (const [name, w, h] of SIZES) {
  test(`the Prize Counter fits (${name}): nothing off screen, no prizes overlapping, controls ≥ 44 px`, async ({page}) => {
    await page.setViewportSize({width: w, height: h});
    const watch = await prepare(page, {store: store()});
    await floor(page); await earn(page); await floor(page);
    await openCounter(page);
    expect(await offscreen(page)).toEqual([]);
    const r = await page.evaluate(() => {
      const ov = document.getElementById('prizes'), W = innerWidth, bad = [];
      const tiles = [...ov.querySelectorAll('.pz-prize, .pz-spot-btn')].map(e => ({k: e.dataset.key, r: e.getBoundingClientRect()}));
      tiles.forEach(t => { if (t.r.left < 0 || t.r.right > W + .5) bad.push('off ' + t.k); });
      for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i].r, b = tiles[j].r;
        if (!(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1)) bad.push(`overlap ${tiles[i].k} ${tiles[j].k}`);
      }
      const small = [...ov.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect()).filter(q => q.width < 44 || q.height < 44).length;
      return {bad, small, sw: ov.scrollWidth - ov.clientWidth};
    });
    expect(r.bad).toEqual([]);
    expect(r.small).toBe(0);
    expect(r.sw).toBeLessThanOrEqual(1);
    if (w <= 760) {                                                  // phones: the shelves scroll, the machine + spotlight stay on top
      await page.locator('#prizes').evaluate(e => { e.scrollTop = e.scrollHeight; });
      await page.waitForTimeout(100);
      const top = await page.locator('.pz-top').evaluate(e => e.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(-1);
      expect(top).toBeLessThan(40);                                // (stuck at the overlay's top padding)
      await expect(page.locator('.pz-turn')).toBeInViewport();
    }
    watch.check();
  });
}

test('reduced motion: nothing moves at the Prize Counter (turning in too)', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  const watch = await prepare(page, {store: store()});
  await floor(page); await earn(page); await floor(page);
  await openCounter(page);
  expect(await page.evaluate(() => Arcade.Prizes.state().still)).toBe(true);
  await page.locator('.pz-turn').click();
  await expect(page.locator('#pzBal')).toHaveText('30');
  const moving = await page.evaluate(() => document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t.closest && (t.closest('#prizes') || t.closest('#prizeSign')); }).length);
  expect(moving).toBe(0);
  watch.check();
});

test('keyboard: Enter opens, arrows move between prizes, Enter tries one on, Esc closes the card, then the counter', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await floor(page);
  await page.locator('#prizeSign').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#prizes')).toBeVisible();
  const first = await page.evaluate(() => Arcade.Prizes.state().focus);
  expect(first).toBeTruthy();                                        // the spotlight (no stars to turn in)
  await page.keyboard.press('ArrowDown');
  const a = await page.evaluate(() => Arcade.Prizes.state().focus);
  expect(a).not.toBe(first);
  await page.keyboard.press('ArrowRight');
  const b = await page.evaluate(() => Arcade.Prizes.state().focus);
  expect(b).not.toBe(a);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => Arcade.Prizes.state().focus)).toBe(a);
  await page.keyboard.press('Enter');
  await expect(page.locator('#pzCard')).toBeVisible();
  expect(await page.evaluate(() => Arcade.Prizes.state().card)).toBe(a);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pzCard')).toHaveCount(0);
  expect(await page.evaluate(() => Arcade.Prizes.state().focus)).toBe(a);
  await page.keyboard.press('Escape');
  await expect(page.locator('#prizes')).toBeHidden();
  await expect(page.locator('#prizeSign')).toBeFocused();
  watch.check();
});

test('the 3D floor has the counter on the back wall: a tap opens the Prize Counter', async ({page}) => {
  const watch = await prepare(page, {store: store()});
  await page.goto(`index.html?demo&nostart&keep3d#zone=note-reading`);
  await page.waitForFunction(() => window.Arcade && Arcade.Arcade && Arcade.Arcade.state().kind);
  const kind = await page.evaluate(() => Arcade.Arcade.state().kind);
  const door = page.locator(kind === '3d' ? '.prize3d' : '.prize2d');
  await expect(door).toBeVisible({timeout: 15000});
  await door.click();
  await expect(page.locator('#prizes')).toBeVisible();
  watch.check();
});
