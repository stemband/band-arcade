/* ARCADE QUEST: INSTRUMENT TIERS and UPGRADES with NOTE SHARDS (designed by a Raven Band student; engine/save.js
   Q.gear, data/items.js QUEST_INSTRUMENTS / QUEST_UPGRADES, battle.js, engine/talk.js, shared/backup.js version 7).
   TIERS: Rusty at a new game; Metal from ep1Done (and the Ghost Conductor's rewards on the map), or 350 tokens at Token
   Booth Terry AND Ticket Booth Tina (the shared wallet, the "Finishing Episode 1 also gives you this." warning first);
   the old-save repair; the Diamond at the Balcony's [16, 8] (standing on it or facing it), once, reachable whichever
   way the Pit was helped (and found for real on all three full routes: quest-ep2-routes.spec.js, segment 2); the
   Perfect locked forever ("???"); the best tier plays; the names use member.short.
   THE MATH: your damage × (1 + tier + upgrade) for PLAY, the B♭ Blast, the E♭ Encore and each QUICK PLAY hit, your band
   unchanged; every CALM gain × the same but LISTEN's; the order with the Tuning Fork, a crit and the Hamburger.
   SHARDS: 1 / 3 / 5 the first time; 0 again for an enemy already helped, 0 in a practice room and in the Test Arena;
   the retroactive grant, once. UPGRADES: costs and steps at Rusty's and Popcorn Pete's UPGRADES tab, dimmed "Need n",
   MAX at 5, saved. SAVE CODES: version 7 round-trips the gear (85 characters); every older fixture code decodes and loads
   exactly as before, with the derived gear. UI: the INSTRUMENT tile and panel, the booth's INSTRUMENT shelf and the
   UPGRADES tab fit at phone, iPad (both ways) and Chromebook sizes (labels never clip: quest-labels' rules); the HUD's
   tier badge; every new line ≤ 80 characters. */
const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT, windowFits} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
const OLD = require('./fixtures/quest-codes.json');
/** a v7 save: Episode 2 open by default (ep1Done); `gear` = {tiers, shards, up} */
function save({level = 12, band = [], charms = {}, worn = [null, null], flags = {}, done = {}, gear = null, tokens = 0, ep = 2, world = {map: 'lobby', x: 21, y: 5, dir: 'up'}, v = 7} = {}) {
  const s = {v, level, xp: 0, hp: 20 + (level - 1) * 4, maxHp: 20 + (level - 1) * 4, tokens, items: {'valve-oil': 1}, roster: band.slice(), battles: {won: 9, befriended: 4, faded: 5},
    world, converted: {}, charms: {owned: charms, equipped: worn}, band, route: {}, ep, done,
    flags: Object.assign({'seen-intro': true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true}, flags)};
  if (v >= 7) s.gear = Object.assign({tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}}, gear || {});
  return s;
}
async function boot(page, s = save(), {url = 'arcade-quest/index.html?demo&test', member = 'trumpet', settings = SETTINGS, standIn = true} = {}) {
  const watch = await prepare(page, {store: device(member, {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName && (Arcade.Quest.sceneName !== 'world' || Arcade.Quest.world.state()));
  await page.evaluate(standIn => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__gos = []; window.__floats = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    const go = Q.go; Q.go = (name, args) => { window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name); return go(name, args); };
    Q.micReady = async () => true;
    window.__play = {acc: .6, speed: 1, correct: 2, total: 4, success: false};
    if (standIn) {
      Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play));
      Q.challenge.blast = async () => Object.assign({}, window.__play);
      Q.challenge.encore = async () => Object.assign({}, window.__play);
      Q.challenge.quick = async () => ({acc: 1, speed: 1, correct: 3, total: 3, hits: [true, true, true]});
      Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
    }
    // every floating number: yours ('dmg'), your band's ('dmg band')
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('q-float') && window.__floats.push([n.className, n.textContent]))))
      .observe(document.body, {childList: true, subtree: true});
  }, standIn);
  return watch;
}
const lines = page => page.evaluate(() => window.__lines.slice());
const st = page => page.evaluate(() => Arcade.Quest.battleState());
/** press A through text boxes until `done` (a page function) is true */
async function until(page, done, arg, max = 250) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(done, arg)) return;
    if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('never: ' + done.toString() + ' ' + JSON.stringify(await page.evaluate(() => ({b: Arcade.Quest.battleState(), scene: Arcade.Quest.sceneName, w: Arcade.Quest.world && Arcade.Quest.world.state()}))));
}
const cmdReady = () => !!document.querySelector('#qCmd:not([hidden]) .q-btn');
/** PLAY, then (in its sub-menu, THE MOVES' or the songs') the enemy's own challenge */
const pickPlay = page => page.evaluate(() => { const bs = [...document.querySelectorAll('#qCmd .q-btn')]; const b = bs.find(x => x.textContent.startsWith('PLAY') && !x.disabled) || (document.querySelector('#qCmd .q-btn.c-back') ? bs[0] : null); if (!b) throw new Error('no PLAY'); b.click(); });
const pick = (page, label) => page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l) && !x.disabled); if (!b) throw new Error('no ' + l); b.click(); }, label);
const idleWorld = page => page.waitForFunction(() => { const w = Arcade.Quest.world && Arcade.Quest.world.state(); return Arcade.Quest.sceneName === 'world' && w && !w.busy && !document.querySelector('#qText:not([hidden])') && !document.querySelector('.q-overlay'); });
/** A through the text until the overworld is free again */
async function toIdle(page) {
  await until(page, () => { const w = Arcade.Quest.world && Arcade.Quest.world.state(); return Arcade.Quest.sceneName === 'world' && w && !w.busy && !document.querySelector('#qText:not([hidden])'); });
}
const setGear = (page, g) => page.evaluate(g => { const s = Arcade.Quest.save.get(); s.gear = Object.assign({tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}}, g); Arcade.Quest.save.write(); }, g);

/* ---------- TIERS ---------- */
test.describe('INSTRUMENT TIERS', () => {
  test('a new game: Rusty, no bonus, no Shards; the data: 4 tiers, Metal 350, the Perfect locked', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, s = Q.save.reset();
      return {gear: s.gear, best: Q.gear.best().id, name: Q.gear.name(), dmg: Q.gear.dmgMult(), calm: Q.gear.calmMult(), v: s.v,
        tiers: Q.gear.tiers().map(t => [t.id, t.dmg, t.calm, t.price || null, !!t.locked]), ups: window.QUEST_UPGRADES};
    });
    expect(r.v).toBe(7);
    expect(r.gear).toEqual({tiers: {}, shards: 0, shardsGranted: true, up: {power: 0, calm: 0}});
    expect([r.best, r.name, r.dmg, r.calm]).toEqual(['rusty', 'Rusty Trumpet', 1, 1]);
    expect(r.tiers).toEqual([['rusty', 0, 0, null, false], ['metal', .1, .2, 350, false], ['diamond', .2, .4, null, false], ['perfect', .3, .8, null, true]]);
    expect(r.ups.max).toBe(5);
    expect(r.ups.shards).toEqual({enemy: 1, boss: 3, final: 5});
    watch.check();
  });

  test('Metal: from ep1Done (the save repair: old saves too), and on the map from the Ghost Conductor\'s rewards, with its line', async ({page}) => {
    // an old v6 save that finished Episode 1: Metal on load, nobody loses anything
    const old = save({v: 6, flags: {}, ep: 1, world: {map: 'foyer', x: 18, y: 3, dir: 'up'}});
    const watch = await boot(page, old);
    expect(await page.evaluate(() => { const s = Arcade.Quest.save.get(); return [s.v, s.gear.tiers.metal, Arcade.Quest.gear.best().id]; })).toEqual([7, true, 'metal']);
    // a save that hasn't: Rusty; then finishing the Ghost Conductor on the map gives Metal (and says so)
    await page.evaluate(() => { const Q = Arcade.Quest, s = Q.save.get(); delete s.flags.ep1Done; delete s.flags.ep2Start; s.gear.tiers = {}; s.level = 30; Q.charms.fixHp(s); s.hp = s.maxHp; Q.save.write(); });
    expect(await page.evaluate(() => Arcade.Quest.gear.best().id)).toBe('rusty');
    await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 5, total: 5, success: true}; Arcade.Quest.go('world', {map: 'attic', x: 5, y: 6, dir: 'up'}); });
    await toIdle(page);
    await page.evaluate(() => Arcade.Quest.world.fight('boss'));
    await until(page, () => Arcade.Quest.sceneName === 'battle');
    for (let i = 0; i < 200 && !(await page.evaluate(() => window.__gos.some(g => g.startsWith('cutscene:')))); i++) {
      if (await page.evaluate(() => !!document.querySelector('#qCmd:not([hidden]) .q-btn'))) await pickPlay(page);
      else if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
      await page.waitForTimeout(40);
    }
    expect(await page.evaluate(() => window.__gos)).toContain('cutscene:ending-fade');
    expect(await lines(page)).toContain('Your instrument levels up: the Metal Trumpet! +10 % damage, +20 % CALM.');
    expect(await page.evaluate(() => [Arcade.Quest.save.get().gear.tiers.metal, Arcade.Quest.save.get().flags.ep1Done])).toEqual([true, true]);
    watch.check();
  });

  for (const [who, url, at] of [['Token Booth Terry', 'arcade-quest/index.html?demo&warp=foyer', 'terry'], ['Ticket Booth Tina', 'arcade-quest/index.html?demo&warp=lobby', 'tina']]) {
    test(`Metal for 350 tokens at ${who}: the INSTRUMENT shelf, the warning first, the wallet down 350, then OWNED`, async ({page}) => {
      const watch = await boot(page, save({flags: {ep1Done: false}, tokens: 500, ep: at === 'tina' ? 2 : 1}), {url});
      await idleWorld(page);
      await page.evaluate(() => Arcade.Tokens.balance());
      const before = await page.evaluate(() => Arcade.Tokens.balance());
      page.evaluate(id => Arcade.Quest.talk.npc(id), at).catch(() => {});
      for (let i = 0; i < 30 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
      const inst = page.locator('.q-booth .q-btn', {hasText: 'Instrument'});
      await expect(inst).toBeVisible();
      await expect(inst.locator('small')).toHaveText('Metal Trumpet · 350');
      await inst.click();
      await expect(page.locator('.q-instshop h2')).toHaveText('Instrument');                       // the INSTRUMENT heading
      await expect(page.locator('.q-instshop .q-pbody')).toContainText('Finishing Episode 1 also gives you this.');
      await page.locator('.q-instshop .q-btn', {hasText: 'Metal Trumpet'}).click();
      await expect(page.locator('.q-ask')).toBeVisible();
      await expect(page.locator('.q-ask h2')).toHaveText('Buy the Metal Trumpet for 350 tokens? Finishing Episode 1 also gives you this.');
      await page.locator('.q-ask .q-btn', {hasText: 'Yes'}).click();
      await expect(page.locator('.q-instshop .q-pbody')).toContainText('The Metal Trumpet is yours!');
      expect(await page.evaluate(() => [Arcade.Tokens.balance(), Arcade.Quest.gear.owned('metal'), Arcade.Quest.gear.best().id])).toEqual([before - 350, true, 'metal']);
      await expect(page.locator('.q-instshop .q-btn', {hasText: 'Metal Trumpet'}).locator('small')).toHaveText('OWNED');
      await expect(page.locator('.q-instshop .q-pbody')).not.toContainText('Finishing Episode 1');
      // again: nothing more is spent
      await page.locator('.q-instshop .q-btn', {hasText: 'Metal Trumpet'}).click();
      await expect(page.locator('.q-instshop .q-pbody')).toContainText('You own the Metal Trumpet.');
      expect(await page.evaluate(() => Arcade.Tokens.balance())).toBe(before - 350);
      await page.locator('.q-instshop .q-btn', {hasText: 'Back'}).click();
      await expect(inst.locator('small')).toHaveText('OWNED');
      watch.check();
    });
  }

  test('not enough tokens: the booth says so and sells nothing; NO said no: nothing spent', async ({page}) => {
    const watch = await boot(page, save({flags: {ep1Done: false}, tokens: 120, ep: 1}), {url: 'arcade-quest/index.html?demo&warp=foyer'});
    await idleWorld(page);
    page.evaluate(() => Arcade.Quest.talk.npc('terry')).catch(() => {});
    for (let i = 0; i < 30 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    await page.locator('.q-booth .q-btn', {hasText: 'Instrument'}).click();
    await page.locator('.q-instshop .q-btn', {hasText: 'Metal Trumpet'}).click();
    await expect(page.locator('.q-instshop .q-pbody')).toContainText('The Metal Trumpet costs 350 tokens. Turn in stars to get more!');
    expect(await page.locator('.q-ask').count()).toBe(0);
    await page.evaluate(() => Arcade.Tokens.add(400));
    await page.locator('.q-instshop .q-btn', {hasText: 'Metal Trumpet'}).click();
    await page.locator('.q-ask .q-btn', {hasText: 'No'}).click();
    expect(await page.evaluate(() => [Arcade.Tokens.balance(), Arcade.Quest.gear.owned('metal')])).toEqual([520, false]);
    watch.check();
  });

  test('the Diamond: the Balcony\'s back-row corner [16, 8], standing on it; its glint goes; once only; the best tier now', async ({page}) => {
    const watch = await boot(page, save({gear: {tiers: {metal: true}}, flags: {tuskAwake: true}}), {url: 'arcade-quest/index.html?demo&warp=balcony'});
    await idleWorld(page);
    const r0 = await page.evaluate(() => {
      const M = window.QUEST_MAPS.balcony, th = M.things.find(t => t.gear === 'diamond'), glint = (M.props || []).find(p => p.sprite === 'diamond-glint');
      return {th, glint, tile: M.tiles[8][16], around: [M.tiles[7][16], M.tiles[8][17], M.tiles[9][16], M.tiles[8][15]], glintOn: Arcade.Quest.world.cond(glint.if), d: Arcade.Quest.spriteDef('diamond-glint')};
    });
    expect(r0.th).toMatchObject({at: [16, 8], gear: 'diamond', secret: true, found: 'balcony-diamond-found'});
    expect(r0.th.say).toBeUndefined();
    expect(r0.tile).toBe('u');
    expect(r0.around).toEqual(['H', '=', '=', 'u']);                   // a dead end: seats above, walls right and below
    expect([r0.glintOn, r0.d.w, r0.d.h]).toEqual([true, 1, 1]);        // one pixel, nothing more
    await page.evaluate(() => Arcade.Quest.world.warp(16, 8, 'down'));
    await page.keyboard.press('Enter');
    await toIdle(page);
    expect(await lines(page)).toEqual(expect.arrayContaining(['Something glints under the very last seat in the back row...', 'You found the Diamond Trumpet!',
      'Your instrument shines: +20 % damage, +40 % CALM.']));
    expect(await page.evaluate(() => [Arcade.Quest.gear.best().id, Arcade.Quest.gear.dmgMult(), Arcade.Quest.gear.calmMult(), Arcade.Quest.world.cond('!gear:diamond')])).toEqual(['diamond', 1.2, 1.4, false]);
    const n = (await lines(page)).length;
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    await page.evaluate(() => Arcade.Quest.world.warp(15, 8, 'right'));
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    expect((await lines(page)).length, 'once only').toBe(n);
    watch.check();
  });

  test('the Diamond: facing the corner from beside it finds it too; no twinkle, no talk bubble; its room opens on BOTH routes', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({flags: {tuskAwake: true}}), {url: 'arcade-quest/index.html?demo&warp=balcony'});
    await idleWorld(page);
    // the Balcony's door needs only tuskAwake, which the Pit gives whichever way its machines are helped (map `wakes`):
    // befriend-only, power-down-only, mixed: the Balcony is reachable from the Lobby every time (no ricoDoor / ricoVent)
    const reach = await page.evaluate(() => {
      const Q = Arcade.Quest, M = window.QUEST_MAPS, out = {};
      for (const how of ['befriend', 'fade', 'mixed']) {
        const s = Q.save.reset(); Object.assign(s.flags, {ep1Done: true, ep2Start: true}); s.ep = 2;
        M.pit.enemies.forEach((e, i) => { s.done['pit:' + e.key] = how === 'mixed' ? (i % 2 ? 'fade' : 'befriend') : how; });
        Q.save.write();
        const f = Q.save.get().flags, seen = new Set(['lobby']), todo = ['lobby'];
        while (todo.length) { const id = todo.pop(); (M[id].doors || []).forEach(d => { if (M[d.to] && M[d.to].ep === 2 && (!d.need || f[d.need]) && !seen.has(d.to)) { seen.add(d.to); todo.push(d.to); } }); }
        out[how] = seen.has('balcony');
      }
      return {out, door: M.lobby.doors.find(d => d.to === 'balcony').need, stage: Object.keys(M).filter(id => (M[id].things || []).some(t => t.gear)), notStage: !(M.stage.things || []).some(t => t.gear)};
    });
    expect(reach.out).toEqual({befriend: true, fade: true, mixed: true});
    expect(reach.door).toBe('tuskAwake');
    expect(reach.stage).toEqual(['balcony']);                          // its own spot: not the Main Stage (the Hamburger's [1, 8])
    await page.evaluate(() => { const Q = Arcade.Quest, s = Q.save.get(); s.flags.tuskAwake = true; Q.save.write(); Q.go('world', {map: 'balcony', x: 15, y: 8, dir: 'right'}); });
    await idleWorld(page);
    // nothing gives it away: no twinkle (world.js draw() twinkles only a `charm` thing) and no talk bubble (`secret`)
    expect(await page.evaluate(() => { const t = window.QUEST_MAPS.balcony.things.find(x => x.gear); return [t.secret, t.charm, t.say]; })).toEqual([true, undefined, undefined]);
    await page.keyboard.press('Enter');
    await toIdle(page);
    expect(await page.evaluate(() => Arcade.Quest.gear.owned('diamond'))).toBe(true);
    watch.check();
  });

  test('the Perfect: locked forever (give, a hand-edited save, a code), shown as "???" with its words; no Episode 3 anywhere', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({gear: {tiers: {metal: true, diamond: true}}}), {url: 'arcade-quest/index.html?demo&warp=lobby'});
    await idleWorld(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, s = Q.save.get(), give = Q.gear.give('perfect');
      s.gear.tiers.perfect = true; Q.save.write();
      const after = Q.save.get().gear.tiers.perfect;
      return {give, after, owned: Q.gear.owned('perfect'), best: Q.gear.best().id};
    });
    expect(r).toEqual({give: false, after: undefined, owned: false, best: 'diamond'});
    page.evaluate(() => Arcade.Quest.talk.instrument()).catch(() => {});
    await expect(page.locator('.q-inst')).toBeVisible();
    const row = page.locator('.q-inst .q-btn.q-locked');
    await expect(row.locator('.q-bl')).toHaveText('???');
    await expect(row.locator('small')).toHaveText('A secret… for another time.');
    expect(await row.isDisabled()).toBe(true);
    expect(await row.locator('canvas.q-bpic').count()).toBe(1);        // the dark silhouette
    // nothing a student reads mentions Episode 3 or promises more (the gear's words, its signs, the panel)
    const words = await page.evaluate(() => { const T = window.QUEST_TEXT, keys = Object.keys(T).filter(k => /^(gear|up|shard|gotShards|shopItems)/.test(k));
      return keys.map(k => T[k]).concat(window.QUEST_SIGNS['balcony-diamond-found'], document.querySelector('.q-inst').textContent).join(' '); });
    expect(words).not.toMatch(/episode\s*3|episode three|coming soon|next episode/i);
    watch.check();
  });

  test('the best tier you own plays (no equip screen): the HUD badge, the multipliers, the INSTRUMENT panel', async ({page}) => {
    const watch = await boot(page, save({flags: {ep1Done: false}}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    for (const [tiers, want, badge, dmg, calm] of [[{}, 'rusty', 'rust', 1, 1], [{metal: true}, 'metal', 'steel', 1.1, 1.2], [{diamond: true}, 'diamond', 'diamond', 1.2, 1.4], [{metal: true, diamond: true}, 'diamond', 'diamond', 1.2, 1.4]]) {
      await setGear(page, {tiers});
      await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}));
      await until(page, cmdReady);
      const b = await page.evaluate(() => ({gear: Arcade.Quest.battleState().gear, cls: document.getElementById('qTier').className, label: document.getElementById('qTier').getAttribute('aria-label')}));
      expect(b.gear.tier, JSON.stringify(tiers)).toBe(want);
      expect(b.gear.dmg).toBeCloseTo(dmg, 9);
      expect(b.gear.calm).toBeCloseTo(calm, 9);
      expect(b.cls).toBe(`q-tier q-tier-${badge}`);
      expect(b.label).toBe(`${want[0].toUpperCase() + want.slice(1)} Trumpet`);
      await page.evaluate(() => Arcade.Quest.go('arena'));
    }
    watch.check();
  });

  test('the names use member.short: Rusty Clarinet, Metal Trumpet, Diamond Snare (and the Snare\'s found line)', {tag: '@quick'}, async ({browser}) => {
    const names = {};
    for (const m of ['clarinet', 'trumpet', 'snare']) {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      const watch = await boot(page, save(), {member: m});
      names[m] = await page.evaluate(() => ['rusty', 'metal', 'diamond'].map(id => Arcade.Quest.gear.name(id)).concat(Arcade.Quest.text('gearFound', {tier: Arcade.Quest.gear.name('diamond')})));
      watch.check();
      await ctx.close();
    }
    expect(names.clarinet.slice(0, 3)).toEqual(['Rusty Clarinet', 'Metal Clarinet', 'Diamond Clarinet']);
    expect(names.trumpet.slice(0, 3)).toEqual(['Rusty Trumpet', 'Metal Trumpet', 'Diamond Trumpet']);
    expect(names.snare.slice(0, 3)).toEqual(['Rusty Snare', 'Metal Snare', 'Diamond Snare']);
    expect(names.snare[3]).toBe('You found the Diamond Snare!');
  });
});

/* ---------- THE MATH ---------- */
test.describe('THE MATH', () => {
  /** one action in a fresh battle against Squawk (HP 9999, no lucky crits): your floats and your band's */
  async function hit(page, action, gear) {
    await setGear(page, gear);
    await page.evaluate(() => { window.__floats.length = 0; window.__lines.length = 0; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
    await until(page, cmdReady);
    await page.evaluate(() => { Arcade.Quest.battleDemo.hp(9999); Math.random = () => .99; });
    await pick(page, 'PLAY');
    await until(page, () => !!document.querySelector('#qCmd .q-btn.c-back'));
    await pick(page, action);
    await until(page, () => Arcade.Quest.battleState().state !== 'fight' || !!document.querySelector('#qCmd:not([hidden]) .q-btn.c-play') || false);
    await page.waitForTimeout(1100);                                   // (QUICK PLAY's floats come 0.3 s apart)
    const r = await page.evaluate(() => ({you: window.__floats.filter(f => /\bdmg\b/.test(f[0]) && !/\bband\b/.test(f[0])).map(f => -+f[1]),
      band: window.__floats.filter(f => /\bband\b/.test(f[0])).map(f => -+f[1]), hp: Arcade.Quest.battleState().hp}));
    await page.evaluate(() => Arcade.Quest.go('arena'));
    return r;
  }
  for (const action of ['PLAY', 'B♭ BLAST', 'E♭ ENCORE', 'QUICK PLAY']) test(`your damage × (1 + tier + upgrade) for ${action} (each hit); your band\'s hit unchanged`, async ({page}) => {
    const watch = await boot(page, save({band: ['spotlight'], flags: {ep1Done: false, songBb: true, songEb: true}, charms: {hamburger: true}, worn: ['hamburger', null]}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    const geared = {tiers: {metal: true}, up: {power: 3, calm: 0}};      // Metal + POWER UP 3 = +10 % + 12 % = × 1.22
    {
      const plain = await hit(page, action, {}), with_ = await hit(page, action, geared);
      expect(plain.you.length, action).toBeGreaterThan(0);
      expect(with_.you, action).toEqual(plain.you.map(d => Math.round(d * 1.22)));
      expect(with_.band, `${action}: the band`).toEqual(plain.band);
      expect(plain.band.length, `${action}: the band played`).toBe(1);
    }
    watch.check();
  });

  test('CALM × (1 + tier + upgrade) on SERENADE (and your band\'s after it) and PLAY\'s small CALM; never on LISTEN\'s', async ({page}) => {
    const watch = await boot(page, save({level: 1, band: ['spotlight'], flags: {ep1Done: false}}));        // (LV 1: CALM stays under 100)
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    const calmAfter = async (gear, act, calm) => {
      await setGear(page, gear);
      await page.evaluate(c => { window.__play = {acc: .3, speed: 1, correct: 1, total: 4, success: false}; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena', overrides: {calm: c}}); }, calm);
      await until(page, cmdReady);
      await page.evaluate(() => Arcade.Quest.battleDemo.hp(9999));
      await pick(page, act);
      await until(page, () => Arcade.Quest.battleState().calm > 0 && !document.querySelector('#qText:not([hidden])'));
      const c = (await st(page)).calm;
      await page.evaluate(() => Arcade.Quest.go('arena'));
      return c;
    };
    const G = {tiers: {diamond: true}, up: {power: 0, calm: 5}}, M = 1 + .4 + .3;       // Diamond + CALM UP 5 = × 1.7
    const base = {perNote: 2, success: 0, listen: 10};
    const ser = [await calmAfter({}, 'SERENADE', base), await calmAfter(G, 'SERENADE', base)];
    expect(ser[0]).toBeGreaterThan(0);
    expect(ser[1]).toBeCloseTo(ser[0] * M, 6);                         // yours + your band's, each × 1.7
    const play = [await calmAfter({}, 'PLAY', base), await calmAfter(G, 'PLAY', base)];
    expect(play[1]).toBeCloseTo(play[0] * M, 6);
    const listen = [await calmAfter({}, 'LISTEN', base), await calmAfter(G, 'LISTEN', base)];
    expect(listen).toEqual([10, 10]);                                  // LISTEN's flat CALM: never boosted
    watch.check();
  });

  test('the order with the Tuning Fork, a skill crit and the Hamburger: each × in turn, rounded, the gear last', async ({page}) => {
    const watch = await boot(page, save({level: 12, charms: {'tuning-fork': true, hamburger: true}, worn: ['tuning-fork', 'hamburger']}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await setGear(page, {tiers: {metal: true, diamond: true}, up: {power: 5, calm: 0}});      // + 20 % + 20 % = × 1.4
    await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true}; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
    await until(page, cmdReady);
    await page.evaluate(() => { Arcade.Quest.battleDemo.hp(99999); window.__floats.length = 0; });
    await pick(page, 'PLAY');
    await until(page, () => !!document.querySelector('#qCmd .q-btn.c-back'));
    await page.evaluate(() => document.querySelector('#qCmd .q-btn').click());                 // its own PLAY (not QUICK PLAY)
    await until(page, () => window.__floats.some(f => /\bdmg\b/.test(f[0])));
    const r = await page.evaluate(() => ({power: Arcade.Quest.battleState().power, dmg: -+window.__floats.find(f => /\bdmg\b/.test(f[0]))[1], crit: Arcade.Quest.battleState().crit}));
    const R = Math.round, want = R(R(R(R(R(r.power * 1 * 1) * 1.25) * 1.5) * 2) * 1.4);           // base, Fork, skill crit, Hamburger, gear
    expect(r.crit).toBe('skill');
    expect(r.dmg).toBe(want);
    watch.check();
  });
});

/* ---------- NOTE SHARDS ---------- */
test.describe('NOTE SHARDS', () => {
  /** walk into a room's enemy (Q.world.fight) and PLAY it down; back in the room */
  async function helpOne(page, key) {
    await page.evaluate(k => { window.__lines.length = 0; window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true}; return Arcade.Quest.world.fight(k); }, key);
    await until(page, () => Arcade.Quest.sceneName === 'battle');
    for (let i = 0; i < 250 && (await page.evaluate(() => Arcade.Quest.sceneName === 'battle')); i++) {
      if (await page.evaluate(() => !!document.querySelector('#qCmd:not([hidden]) .q-btn'))) await pickPlay(page);
      else if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
      await page.waitForTimeout(40);
    }
  }
  const shards = page => page.evaluate(() => Arcade.Quest.gear.shards());

  test('1 for a regular enemy the first time (its line with the rewards); 0 for one already helped; 0 in the Practice Hall', async ({page}) => {
    const watch = await boot(page, save({level: 40, ep: 1, flags: {}}), {url: 'arcade-quest/index.html?demo&warp=hall'});
    await toIdle(page);
    await helpOne(page, 'w1');
    await toIdle(page);
    expect(await shards(page)).toBe(1);
    expect(await lines(page)).toContain('You earned 1 Note Shard for UPGRADES at the shop!');
    // an enemy already helped (its `done` record came from elsewhere, e.g. a save code) earns nothing again
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.done['hall:w2'] = 'befriend'; Arcade.Quest.save.write(); });
    await helpOne(page, 'w2');
    await toIdle(page);
    expect(await shards(page)).toBe(1);
    expect((await lines(page)).some(l => /Note Shard/.test(l))).toBe(false);
    // the Practice Hall: fight its ghosts again and again, never a Shard
    const practice = await page.evaluate(() => Object.keys(window.QUEST_MAPS).find(id => window.QUEST_MAPS[id].practice && (window.QUEST_MAPS[id].enemies || []).length && !window.QUEST_MAPS[id].ep));
    await page.evaluate(id => Arcade.Quest.go('world', {map: id}), practice);
    await toIdle(page);
    const key = await page.evaluate(() => Arcade.Quest.world.state().ghosts[0].key);
    await helpOne(page, key);
    await toIdle(page);
    expect(await shards(page)).toBe(1);
    watch.check();
  });

  test('3 for a mini-boss (the Phantom Fermata, Rico Bandit), 5 for a final boss (THE BIG NUMBER), the first time', async ({page}) => {
    test.setTimeout(90000);
    const watch = await boot(page, save({level: 60, flags: {ricoDone: true, ricoDoor: true, 'met-rico': true, 'met-bignumber': true}, done: {}}), {url: 'arcade-quest/index.html?demo&warp=stairs'});
    await toIdle(page);
    expect(await page.evaluate(() => ['fermata', 'rico', 'conductor', 'bignumber', 'wisp', 'tapsy'].map(Arcade.Quest.gear.shardsFor))).toEqual([3, 3, 5, 5, 1, 1]);
    await helpOne(page, 'boss');
    await toIdle(page);
    expect(await shards(page)).toBe(3);
    expect(await lines(page)).toContain('You earned 3 Note Shards for UPGRADES at the shop!');
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); delete s.flags.ricoDone; Arcade.Quest.save.write(); Arcade.Quest.go('world', {map: 'dressing', x: 9, y: 9, dir: 'up'}); });
    await toIdle(page);
    await helpOne(page, 'boss');
    await toIdle(page);
    expect(await shards(page)).toBe(6);
    // THE BIG NUMBER (its Final Stand stood in: the dodge returns at once)
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'stage', x: 12, y: 3, dir: 'left'}));
    await toIdle(page);
    await helpOne(page, 'boss');
    await page.waitForFunction(() => window.__gos.includes('cutscene:ep2-ending-fade'));
    expect(await shards(page)).toBe(11);
    expect(await lines(page)).toContain('You earned 5 Note Shards for UPGRADES at the shop!');
    watch.check();
  });

  test('the Test Arena earns nothing', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({level: 40}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true}; Arcade.Quest.go('battle', {enemy: 'fermata', back: 'arena'}); });
    for (let i = 0; i < 80 && (await page.evaluate(() => Arcade.Quest.sceneName === 'battle')); i++) {
      if (await page.evaluate(() => !!document.querySelector('#qCmd:not([hidden]) .q-btn'))) await pickPlay(page);
      else if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
      await page.waitForTimeout(40);
    }
    expect(await page.evaluate(() => Arcade.Quest.sceneName)).toBe('arena');
    expect(await shards(page)).toBe(0);
    expect((await lines(page)).some(l => /Note Shard/.test(l))).toBe(false);
    watch.check();
  });

  test('the retroactive grant: an old save gets the Shards of every enemy it had helped, ONCE (spent ones never come back)', {tag: '@quick'}, async ({page}) => {
    const done = {'hall:w1': 'befriend', 'hall:w2': 'fade', 'stairs:boss': 'fade', 'attic:boss': 'befriend', 'pit:m1': 'befriend', 'dressing:boss': 'befriend', 'stage:boss': 'fade'};
    const watch = await boot(page, save({v: 6, done}));
    const r = await page.evaluate(() => { const s = Arcade.Quest.save.get(); return {v: s.v, gear: JSON.parse(JSON.stringify(s.gear))}; });
    expect(r.v).toBe(7);
    expect(r.gear).toMatchObject({shards: 1 + 1 + 3 + 5 + 1 + 3 + 5, shardsGranted: true, tiers: {metal: true}});
    await page.evaluate(() => Arcade.Quest.gear.buy('power'));         // spend 2
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName);
    expect(await page.evaluate(() => [Arcade.Quest.gear.shards(), Arcade.Quest.gear.level('power')])).toEqual([17, 1]);
    // the whole game today: 55 Shards (Episode 1: 18 + 3 + 5, Episode 2: 20 + 3 + 5, + Tom-Tom Termite's 1 + the Glitch Dimension's two bosses' 3 each); both tracks maxed: 52
    const all = await page.evaluate(() => { const M = window.QUEST_MAPS, d = {};
      Object.keys(M).filter(id => !M[id].practice).forEach(id => (M[id].enemies || []).forEach(e => { d[id + ':' + e.key] = 'fade'; }));
      const U = window.QUEST_UPGRADES; return {total: Arcade.Quest.gear.shardsEarned(d), max: 2 * U.costs.reduce((a, b) => a + b, 0)}; });
    expect(all).toEqual({total: 61, max: 52});
    watch.check();
  });
});

/* ---------- UPGRADES ---------- */
test.describe('UPGRADES', () => {
  async function openShop(page, keeper) {
    page.evaluate(k => Arcade.Quest.talk.npc(k), keeper).catch(() => {});
    for (let i = 0; i < 30 && !(await page.locator('.q-shop .q-tab').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    await page.locator('.q-shop .q-btn.q-tab', {hasText: 'Upgrades'}).click();
    await expect(page.locator('.q-shop.q-upgrades')).toBeVisible();
  }
  const rows = page => page.evaluate(() => [...document.querySelectorAll('.q-upgrades .q-pmenu .q-btn:not(.q-tab)')].map(b => [b.querySelector('.q-bl').textContent, (b.querySelector('small') || {}).textContent || '', b.disabled]));

  for (const [keeper, url, title] of [['rusty', 'arcade-quest/index.html?demo&warp=foyer', 'Rusty\'s Supplies'], ['pete', 'arcade-quest/index.html?demo&warp=lobby', 'Popcorn Pete\'s Snacks']]) {
    test(`at ${keeper === 'rusty' ? 'Rusty' : 'Popcorn Pete'}: the UPGRADES tab, every step's cost and bonus, MAX at 5, saved`, async ({page}) => {
      const watch = await boot(page, save({gear: {shards: 60}}), {url});
      await idleWorld(page);
      await openShop(page, keeper);
      await expect(page.locator('.q-upgrades h2')).toHaveText(title);
      await expect(page.locator('.q-upgrades .q-btn.q-tab-on')).toHaveText('Upgrades');
      await expect(page.locator('.q-upgrades .q-shards')).toHaveText('You have 60 Note Shards.');
      expect(await page.locator('.q-upgrades .q-shards canvas.q-shardic').count()).toBe(1);   // the Shards' icon
      expect(await rows(page)).toEqual([['POWER UP 0/5', 'Step 1: +4 % damage · 2 Note Shards', false], ['CALM UP 0/5', 'Step 1: +6 % CALM · 2 Note Shards', false], ['Done', '', false]]);
      const costs = [2, 3, 5, 7, 9];
      let have = 60;
      for (let n = 1; n <= 5; n++) {
        await page.locator('.q-upgrades .q-btn', {hasText: 'POWER UP'}).click();
        have -= costs[n - 1];
        await expect(page.locator('.q-upgrades .q-good')).toHaveText(`POWER UP step ${n}! Now +${4 * n} % damage.`);
        await expect(page.locator('.q-upgrades .q-shards')).toHaveText(`You have ${have} Note Shards.`);
      }
      expect((await rows(page))[0]).toEqual(['POWER UP 5/5', 'MAX: +20 % damage', true]);
      await expect(page.locator('.q-upgrades .q-pbody')).toContainText('POWER UP: step 5 of 5 (+20 % damage)');
      expect(await page.evaluate(() => Arcade.Quest.gear.buy('power'))).toEqual({ok: false, why: 'max'});
      for (let n = 1; n <= 5; n++) await page.locator('.q-upgrades .q-btn', {hasText: 'CALM UP'}).click();
      expect((await rows(page))[1]).toEqual(['CALM UP 5/5', 'MAX: +30 % CALM', true]);
      const b = await page.evaluate(() => [Arcade.Quest.gear.shards(), Arcade.Quest.gear.bonus()]);
      expect(b[0]).toBe(60 - 52);
      expect(b[1].dmg).toBeCloseTo(.1 + .2, 9);                        // Metal (ep1Done) + POWER UP 5
      expect(b[1].calm).toBeCloseTo(.2 + .3, 9);
      // the ITEMS tab is still the old shop
      await page.locator('.q-shop .q-btn.q-tab', {hasText: 'Items'}).click();
      await expect(page.locator('.q-shop .q-btn', {hasText: 'Valve Oil'})).toBeVisible();
      // saved: after a reload, and in the save code
      await page.reload();
      await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName);
      const r = await page.evaluate(() => { const Q = Arcade.Quest; return {up: Q.save.get().gear.up, shards: Q.gear.shards(), code: Arcade.Backup.questDecode(Q.save.code()).fields.gear}; });
      expect(r).toEqual({up: {power: 5, calm: 5}, shards: 8, code: {tiers: {metal: true}, shards: 8, up: {power: 5, calm: 5}}});
      watch.check();
    });
  }

  test('a step you can\'t afford is dimmed with "Need n Note Shards"; picking it buys nothing', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({gear: {shards: 4, up: {power: 2, calm: 0}}}), {url: 'arcade-quest/index.html?demo&warp=foyer'});
    await idleWorld(page);
    await openShop(page, 'rusty');
    expect(await rows(page)).toEqual([['POWER UP 2/5', 'Need 5 Note Shards', true], ['CALM UP 0/5', 'Step 1: +6 % CALM · 2 Note Shards', false], ['Done', '', false]]);
    expect(await page.locator('.q-upgrades .q-btn.q-need').count()).toBe(1);
    await page.locator('.q-upgrades .q-btn', {hasText: 'POWER UP'}).click({force: true});
    expect(await page.evaluate(() => [Arcade.Quest.gear.shards(), Arcade.Quest.gear.level('power')])).toEqual([4, 2]);
    await page.locator('.q-upgrades .q-btn', {hasText: 'CALM UP'}).click();
    await page.locator('.q-upgrades .q-btn', {hasText: 'CALM UP'}).click({force: true});   // 2 left, step 2 costs 3
    expect(await page.evaluate(() => [Arcade.Quest.gear.shards(), Arcade.Quest.gear.level('calm')])).toEqual([2, 1]);
    expect((await rows(page))[1]).toEqual(['CALM UP 1/5', 'Need 3 Note Shards', true]);
    watch.check();
  });
});

/* ---------- SAVE CODES ---------- */
test.describe('SAVE CODES', () => {
  test('version 7 round-trips every gear field (85 characters; Shards capped at 127); a changed letter is caught', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({gear: {tiers: {metal: true, diamond: true}, shards: 37, up: {power: 3, calm: 5}}, flags: {ep1Done: false}}));
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, B = Arcade.Backup, code = Q.save.code(), f = B.questDecode(code).fields;
      Q.save.reset(); Q.save.fromCode(code);
      const g = JSON.parse(JSON.stringify(Q.save.get().gear)), s = Q.save.get();
      s.gear.shards = 300; s.gear.tiers = {diamond: true}; s.gear.up = {power: 0, calm: 1}; Q.save.write();
      const big = B.questDecode(Q.save.code()).fields.gear;
      return {len: code.replace(/-/g, '').length, f: f.gear, g: JSON.parse(JSON.stringify(g)), big, v: B.questDecode(code).ok, v7: B.QUEST_V7.tiers};
    });
    expect(r.len).toBe(85);
    expect(r.v7).toEqual(['metal', 'diamond']);
    expect(r.f).toEqual({tiers: {metal: true, diamond: true}, shards: 37, up: {power: 3, calm: 5}});
    expect(r.g).toEqual({tiers: {metal: true, diamond: true}, shards: 37, shardsGranted: true, up: {power: 3, calm: 5}});
    expect(r.big).toEqual({tiers: {diamond: true}, shards: 127, up: {power: 0, calm: 1}});
    const code = await page.evaluate(() => Arcade.Quest.save.code());
    const bad = await page.evaluate(c => Arcade.Backup.questDecode(c.slice(0, 50) + (c[50] === 'A' ? 'B' : 'A') + c.slice(51)).ok, code);
    expect(bad).toBe(false);
    watch.check();
  });

  test('every fixture code of every older version (1–6) decodes exactly as before and loads with the derived gear', async ({page}) => {
    const watch = await boot(page);
    const routes = fs.readdirSync(path.join(ROOT, 'tests/fixtures/quest-ep2-routes-v6')).map(f => fs.readFileSync(path.join(ROOT, 'tests/fixtures/quest-ep2-routes-v6', f), 'utf8').trim());   // (the route codes as version 6 made them: frozen)
    const r = await page.evaluate(([old, routes]) => {
      const Q = Arcade.Quest, B = Arcade.Backup, out = [];
      Object.entries(old).map(([k, v]) => [k, v.code, v.fields]).concat(routes.map((c, i) => ['route' + i, c, null])).forEach(([k, c, fields]) => {
        const d = B.questDecode(c);
        const exact = !fields || JSON.stringify(d.fields) === JSON.stringify(fields);
        Q.save.reset(); const ok = Q.save.fromCode(c).ok, s = Q.save.get();
        out.push({k, ok: d.ok && ok, exact, gear: d.fields.gear === undefined, got: JSON.parse(JSON.stringify(s.gear)), want: {metal: !!d.fields.flags.ep1Done, shards: Q.gear.shardsEarned(d.fields.done)}});
      });
      return out;
    }, [OLD, routes]);
    expect(r.length).toBe(Object.keys(OLD).length + routes.length);
    for (const x of r) {
      expect([x.ok, x.exact, x.gear], x.k).toEqual([true, true, true]);   // decodes as before (no gear field in an old code)
      expect(x.got, x.k).toEqual({tiers: x.want.metal ? {metal: true} : {}, shards: x.want.shards, shardsGranted: true, up: {power: 0, calm: 0}});
    }
    // the v6 fixture: Episode 2 underway, Shards = 1 + 1 + 3 + 5 (manor) + 1 + 1 + 1 + 1 + 3 (Showtime)
    expect(r.find(x => x.k === 'v6').got.shards).toBe(17);
    watch.check();
  });

  test('a v6 code (Episode 2 finished on the POWER DOWN route) gets Metal and all 54 Shards; v7 keeps them exactly', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const code = fs.readFileSync(path.join(ROOT, 'tests/fixtures/quest-ep2-routes-v6/fade-6.txt'), 'utf8').trim();
    const r = await page.evaluate(c => {
      const Q = Arcade.Quest; Q.save.fromCode(c);
      const g = JSON.parse(JSON.stringify(Q.save.get().gear)), c7 = Q.save.code();
      Q.save.reset(); Q.save.fromCode(c7);
      return {g, again: JSON.parse(JSON.stringify(Q.save.get().gear)), len6: c.replace(/-/g, '').length, len7: c7.replace(/-/g, '').length};
    }, code);
    expect([r.len6, r.len7]).toEqual([80, 85]);
    expect(r.g).toEqual({tiers: {metal: true}, shards: 54, shardsGranted: true, up: {power: 0, calm: 0}});   // every enemy of both episodes: all 54
    expect(r.again).toEqual(r.g);
    watch.check();
  });
});

/* ---------- THE UI, AT EVERY SIZE ---------- */
const SIZES = [['phone', {width: 390, height: 844}, true], ['iPad landscape', {width: 1180, height: 820}, true], ['iPad portrait', {width: 820, height: 1180}, true], ['Chromebook', {width: 1366, height: 768}, false]];
/** every visible button's label (quest-labels.spec.js's rules): never wider or taller than its box, inside its button */
const audit = (page, where) => page.evaluate(where => {
  const bad = [], vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const btns = [...document.querySelectorAll('#ui .q-btn, .ui-ov .panel .btn')].filter(vis);
  for (const b of btns.concat([...document.querySelectorAll('.q-hname')].filter(vis))) {
    const l = b.querySelector(':scope > .q-bl') || b, cs = getComputedStyle(l), txt = l.textContent.trim().slice(0, 40), why = [];
    if (l.scrollWidth > l.clientWidth + 1) why.push(`wide ${l.scrollWidth}>${l.clientWidth}`);
    if (l.scrollHeight > l.clientHeight + 1) why.push(`tall ${l.scrollHeight}>${l.clientHeight}`);
    if (b !== l && (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1)) why.push('button overflows');
    if (cs.textOverflow === 'ellipsis') why.push('ellipsis');
    if (b !== l) { const lr = l.getBoundingClientRect(), br = b.getBoundingClientRect(); if (lr.left < br.left - 1 || lr.right > br.right + 1 || lr.top < br.top - 1 || lr.bottom > br.bottom + 1) why.push('outside its button'); }
    if (why.length) bad.push(`${where}: "${txt}" ${why.join(', ')}`);
  }
  return bad;
}, where);
/** a page at a size, in the Foyer: Diamond + Metal owned (the best: Diamond), 9 Shards, POWER UP 2, CALM UP 4 */
async function atSize(browser, size, touch) {
  const ctx = await browser.newContext({viewport: size, hasTouch: touch, isMobile: touch && size.width < 500});
  const page = await ctx.newPage();
  const watch = await boot(page, save({gear: {tiers: {metal: true, diamond: true}, shards: 9, up: {power: 2, calm: 4}}, flags: {ep1Done: false}, tokens: 999, ep: 1}),
    {url: 'arcade-quest/index.html?demo&warp=foyer', member: 'euphbc'});            // (the longest instrument name)
  await idleWorld(page);
  return {ctx, page, watch};
}
for (const [name, size, touch] of SIZES) {
  test(`the pause menu's INSTRUMENT tile and Note Shards tile, the INSTRUMENT panel and the HUD badge fit at ${name} size`, async ({browser}) => {
    const {ctx, page, watch} = await atSize(browser, size, touch);
    const bad = [];
    await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await page.keyboard.press('m');
    await expect(page.locator('#uiPause #qPauseInst')).toBeVisible();
    await expect(page.locator('#qPauseInst canvas.q-instpic')).toHaveCount(1);
    expect(await page.locator('#uiPause .ui-tile small').allTextContents()).toEqual(['Level', 'Power', 'HP', 'XP', 'Tokens', 'Note Shards']);
    await expect(page.locator('#uiPause .ui-tile canvas.q-shardic')).toHaveCount(1);
    bad.push(...await audit(page, 'pause'), ...await windowFits(page, '#uiPause'));
    await page.locator('#qPauseInst').click();
    await expect(page.locator('.q-inst')).toBeVisible();
    await page.waitForTimeout(150);
    bad.push(...await audit(page, 'instrument'), ...await windowFits(page, '.q-inst'));
    await expect(page.locator('.q-inst .q-pbody')).toContainText('Diamond Euphonium (B.C.): +20 % damage, +40 % CALM');
    await expect(page.locator('.q-inst .q-pbody')).toContainText('Your upgrades add +8 % damage, +24 % CALM on top.');
    await page.locator('.q-inst .q-btn', {hasText: 'Done'}).click();
    await page.keyboard.press('Escape');
    // the battle HUD's name with its badge
    await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}));
    await until(page, cmdReady);
    bad.push(...await audit(page, 'battle HUD'));
    const badge = await page.evaluate(() => { const b = document.getElementById('qTier').getBoundingClientRect(), h = document.getElementById('qHudP').getBoundingClientRect(); return b.width > 2 && b.left >= h.left && b.right <= h.right && b.top >= h.top && b.bottom <= h.bottom; });
    expect(badge, 'the badge inside the HUD').toBe(true);
    expect(bad).toEqual([]);
    watch.check();
    await ctx.close();
  });

  test(`the booth's INSTRUMENT shelf and Rusty's ITEMS / UPGRADES tabs fit at ${name} size`, async ({browser}) => {
    const {ctx, page, watch} = await atSize(browser, size, touch);
    const bad = [];
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); delete s.gear.tiers.metal; Arcade.Quest.save.write(); });   // (not owned: its price and warning)
    page.evaluate(() => Arcade.Quest.talk.npc('terry')).catch(() => {});
    for (let i = 0; i < 30 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    bad.push(...await audit(page, 'booth'));
    await page.locator('.q-booth .q-btn', {hasText: 'Instrument'}).click();
    await expect(page.locator('.q-instshop')).toBeVisible();
    await page.waitForTimeout(150);
    bad.push(...await audit(page, 'booth: instrument'), ...await windowFits(page, '.q-instshop'));
    await page.evaluate(() => document.querySelectorAll('.q-overlay').forEach(o => o.remove()));
    page.evaluate(() => Arcade.Quest.talk.npc('rusty')).catch(() => {});
    for (let i = 0; i < 30 && !(await page.locator('.q-shop .q-tab').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    bad.push(...await audit(page, 'shop: items'), ...await windowFits(page, '.q-shop'));
    await page.locator('.q-shop .q-btn.q-tab', {hasText: 'Upgrades'}).click();
    await page.waitForTimeout(150);
    bad.push(...await audit(page, 'shop: upgrades'), ...await windowFits(page, '.q-upgrades'));
    expect(bad).toEqual([]);
    watch.check();
    await ctx.close();
  });
}

test('the Diamond badge sparkles slowly (≤ 3 changes a second) and holds still under reduced motion', {tag: '@quick'}, async ({browser}) => {
  const read = async reduce => {
    const ctx = await browser.newContext({reducedMotion: reduce ? 'reduce' : 'no-preference'}), page = await ctx.newPage();
    const watch = await boot(page, save({gear: {tiers: {diamond: true}}}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}));
    await until(page, cmdReady);
    const r = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('qTier')); return {name: c.animationName, dur: parseFloat(c.animationDuration), timing: c.animationTimingFunction}; });
    watch.check(); await ctx.close();
    return r;
  };
  const on = await read(false), still = await read(true);
  expect(on.name).toBe('q-tier-spark');
  expect(on.timing).toMatch(/steps\(1/);
  expect(2 / on.dur).toBeLessThanOrEqual(3);                          // 2 color changes a cycle
  expect(still.name).toBe('none');
});

test('every new line a student reads is ≤ 80 characters (the longest instrument name, the biggest numbers)', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const long = await page.evaluate(() => {
    const Q = Arcade.Quest, T = window.QUEST_TEXT, out = [], longest = 'Euphonium (B.C.)';
    // the longest real values: the Diamond's name (Metal's where only Metal is ever named), its +20 % / +40 %
    const metalOnly = ['gearEp1', 'gearBuyAsk', 'gearBought', 'gearOwned', 'gearBroke'];
    const bonus = Q.text('gearBonus', {dmg: 20, calm: 40});
    Object.keys(T).filter(k => /^(gear|up|shards|gotShards|shopItems)/.test(k)).forEach(k => {
      const vars = {tier: (metalOnly.includes(k) ? 'Metal ' : 'Diamond ') + longest, bonus, price: 350, n: 127, shards: T.shards, cost: 9, track: 'POWER UP', max: 5, dmg: 20, calm: 40};
      const l = Q.text(k, vars).replace(/\{\w+\}/g, 'x'); if (l.length > 80 && k !== 'gearBuyAsk') out.push(`${k}: ${l}`);
    });
    [].concat(window.QUEST_SIGNS['balcony-diamond-found']).forEach(l => { if (l.length > 80) out.push(l); });
    const ask = Q.text('gearBuyAsk', {tier: 'Metal ' + longest, price: 350}) + ' ' + Q.text('gearFreeNote');
    if (ask.length > 2 * 80) out.push('ask: ' + ask);
    return out;
  });
  expect(long).toEqual([]);
  watch.check();
});
