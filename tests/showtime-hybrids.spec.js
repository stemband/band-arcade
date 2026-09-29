/* SHOWTIME MALFUNCTION HYBRIDS (levels.js SHOWTIME_SPECIALS `hybrid: [A, B]`): each one spawns with ?demo&special=<id>
   and runs BOTH parents' tricks (a wind player and the snare), its first meeting shows the HYBRID! card with both
   parents, the Malfunction Files have a HYBRIDS section, hybrids first appear at Showtime 5, never two at once, and
   the fairness check keeps every hybrid beatable in the time it walks. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const HYBRIDS = ['glitch-lurker', 'blackout-jester', 'sprocket-dolls', 'oil-tank', 'turbo-blackout', 'duet-tank'];
const store = (member = 'trumpet', extra = {}) => device(member, {gameData: {'showtime-malfunction': Object.assign({storySeen: true}, extra)}});

async function start(page, lv = 1) {
  await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 40 && !(await page.evaluate(() => !!Arcade.Showtime.debug())); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect.poll(() => page.evaluate(() => !!Arcade.Showtime.debug())).toBe(true);
}
/** the forced hybrid walks on: its card (the first meeting), then the game again */
async function meet(page, id) {
  // a machine already met on this device walks on without its card
  await expect.poll(() => page.evaluate(() => !document.getElementById('specialCard').hidden || !!Arcade.Showtime.debug().bots.find(b => b.special)), {timeout: 20_000}).toBe(true);
  if (await page.locator('#specialCard').isHidden()) return {title: null, parents: null, how: null};
  await expect(page.locator('#spHybrid')).toBeVisible();
  const card = await page.evaluate(() => ({title: document.getElementById('spTitle').textContent, parents: document.getElementById('spParents').textContent, how: document.getElementById('spHow').textContent}));
  await page.locator('#spGo').click();
  return card;
}
const bot = page => page.evaluate(() => { const b = Arcade.Showtime.debug().bots.find(x => x.special); return b && {id: b.special, traits: b.traits, hybrid: b.hybrid, count: b.count, left: b.left, total: b.total,
  plates: b.plates || 0, popFirst: !!b.popFirst, dark: !!b.dark, revealAt: b.revealAt, duet: b.duet ? b.duet.map(i => i.pc) : null, switchLeft: b.switchLeft, switched: !!b.switched,
  lurkGlitch: !!b.lurkGlitch, rollRate: b.rollRate, rollRate2: b.rollRate2, fast: !!b.fast, need: b.need, holdP: b.holdP, item: b.item ? b.item.pc : null, state: b.state, speed: b.speed, z: b.z}; });

test.describe('Showtime Malfunction: hybrids', () => {
  for (const id of HYBRIDS) {
    test(`${id}: spawns with ?demo&special, the HYBRID! card names both parents`, async ({page}) => {
      const watch = await prepare(page, {store: store()});
      await page.goto(`showtime-malfunction/index.html?demo&nostart&special=${id}`);
      await start(page, 5);
      const card = await meet(page, id);
      const r = await page.evaluate(i => ({M: window.SHOWTIME_SPECIALS.machines[i], names: window.SHOWTIME_SPECIALS.machines[i].hybrid.map(p => window.SHOWTIME_SPECIALS.machines[p].name)}), id);
      expect(card.title).toBe(r.M.name);
      expect(card.parents).toBe(r.names.join(' + '));
      expect(card.how).toBe(r.M.how);
      const b = await bot(page);
      expect([b.id, b.hybrid, b.traits]).toEqual([id, true, r.M.hybrid]);
      // its own drawing, with stitches and both parents' colors
      expect(await page.locator('.bots .bot.hybrid .a-stitch').count()).toBeGreaterThan(0);
      watch.check();
    });
  }

  test('each hybrid does both parents\' tricks (a wind player)', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    const out = {};
    for (const id of HYBRIDS) {
      await page.goto(`showtime-malfunction/index.html?demo&nostart&special=${id}`);
      await start(page, 5);
      await meet(page, id);
      out[id] = await bot(page);
    }
    const G = out;
    // Glitch Lurker: a hold (1 "play") that glitches halfway
    expect([G['glitch-lurker'].count, G['glitch-lurker'].lurkGlitch, G['glitch-lurker'].need > 0]).toEqual([1, true, true]);
    // Blackout Jester: dark until 40 %, then a glitch after half its plays
    expect([G['blackout-jester'].dark || G['blackout-jester'].z >= .4, G['blackout-jester'].revealAt, G['blackout-jester'].switchLeft != null]).toEqual([true, .4, true]);
    // Sprocket Dolls: a duet pair (two different notes) that will split
    expect(G['sprocket-dolls'].duet.length).toBe(2);
    expect(G['sprocket-dolls'].duet[0]).not.toBe(G['sprocket-dolls'].duet[1]);
    // Oil Tank: 1.5× plays, 4 plates popped first
    expect([G['oil-tank'].plates, G['oil-tank'].popFirst]).toEqual([4, true]);
    // Turbo Blackout: 1–2 plays, dark until a third of the way
    expect(G['turbo-blackout'].count).toBeLessThanOrEqual(2);
    expect(G['turbo-blackout'].revealAt).toBe(.33);
    // Duet Tank: two notes in turns, an even count ≥ 4, a plate per play (up to 8)
    expect(G['duet-tank'].duet.length).toBe(2);
    expect(G['duet-tank'].count % 2).toBe(0);
    expect(G['duet-tank'].plates).toBe(Math.min(G['duet-tank'].count, 8));
    watch.check();
  });

  test('Glitch Lurker (wind): hold, the note glitches halfway, the ring keeps its fill, hold the new note to reboot', async ({page}) => {
    test.setTimeout(90_000);
    const watch = await prepare(page, {store: store()});
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=glitch-lurker');
    await start(page, 5);
    await meet(page, 'glitch-lurker');
    await expect.poll(() => page.evaluate(() => { const G = Arcade.Showtime.debug(); return !!G.bots.find(b => b.special && b.state === 'walk'); })).toBe(true);
    const first = (await bot(page)).item;
    await page.keyboard.down('s');                                     // ?demo: hold S = its note, steady
    await expect.poll(async () => (await bot(page)).switched, {timeout: 20_000}).toBe(true);
    await page.keyboard.up('s');
    const mid = await bot(page);
    expect(mid.item).not.toBe(first);                                   // the note glitched into another
    expect(mid.holdP).toBeGreaterThanOrEqual(mid.need * .45);           // the ring kept what it had
    await page.keyboard.down('s');                                     // hold the NEW note
    await expect.poll(async () => { const b = await bot(page); return !b || b.state !== 'walk'; }, {timeout: 20_000}).toBe(true);
    await page.keyboard.up('s');
    watch.check();
  });

  test('Sprocket Dolls (wind): take turns, then it splits into two minis keeping one doll\'s note each', async ({page}) => {
    test.setTimeout(90_000);
    const watch = await prepare(page, {store: store()});
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=sprocket-dolls');
    await start(page, 5);
    await meet(page, 'sprocket-dolls');
    const b = await bot(page);
    // ?demo: Space = an attack on the target's note (the doll whose turn it is); spaced out past each tick sound's mute
    for (let k = 0; k < 40 && !(await page.evaluate(() => Arcade.Showtime.debug().bots.some(x => x.mini))); k++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(450);
    }
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.filter(x => x.mini).map(x => x.item.pc).sort()), {timeout: 10_000}).toEqual(b.duet.slice().sort());
    expect(await page.evaluate(() => Arcade.Showtime.debug().bots.filter(x => x.mini).map(x => x.count))).toEqual([1, 1]);
    watch.check();
  });

  test('Oil Tank: oils the others only while it has plates; the first plays pop them', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=oil-tank');
    await start(page, 5);
    await meet(page, 'oil-tank');
    const r = await page.evaluate(() => {
      const G = Arcade.Showtime.debug(), t = G.bots.find(b => b.special);
      const left = () => t.plates - (t.total - t.left);
      const before = left(); t.left -= 4;                                // four plays popped every plate
      return {before, after: left(), every: t.oilEvery};
    });
    expect([r.before, r.after, r.every]).toEqual([4, 0, 4.5]);
    watch.check();
  });

  test('the snare: Glitch Lurker rolls faster halfway; Sprocket Dolls splits into two 1-hit minis; the rest are counts', async ({page}) => {
    test.setTimeout(120_000);
    const watch = await prepare(page, {store: store('snare')});
    const out = {};
    for (const id of HYBRIDS) {
      await page.goto(`showtime-malfunction/index.html?demo&nostart&special=${id}`);
      await start(page, 5);
      await meet(page, id);
      out[id] = Object.assign(await bot(page), {how: await page.evaluate(i => window.SHOWTIME_SPECIALS.machines[i].howSnare || window.SHOWTIME_SPECIALS.machines[i].how, id)});
    }
    expect([out['glitch-lurker'].rollRate, out['glitch-lurker'].rollRate2, out['glitch-lurker'].lurkGlitch]).toEqual([6, 8, false]);
    expect(out['glitch-lurker'].how).toMatch(/Halfway, roll faster/);
    ['blackout-jester', 'sprocket-dolls', 'duet-tank'].forEach(id => { expect(out[id].duet, id).toBe(null); expect(out[id].switchLeft, id).toBe(undefined); });
    expect(out['sprocket-dolls'].how).toMatch(/one hit for each mini/);
    // the roll speeds up halfway (hold S = a steady roll in ?demo)
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=glitch-lurker');
    await start(page, 5);
    await meet(page, 'glitch-lurker');
    await page.keyboard.down('s');
    await expect.poll(async () => (await bot(page)).fast, {timeout: 20_000}).toBe(true);
    await expect.poll(async () => { const b = await bot(page); return !b || b.state !== 'walk'; }, {timeout: 20_000}).toBe(true);
    await page.keyboard.up('s');
    // the Sprocket Dolls' minis: one hit each
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=sprocket-dolls');
    await start(page, 5);
    await meet(page, 'sprocket-dolls');
    for (let k = 0; k < 40 && !(await page.evaluate(() => Arcade.Showtime.debug().bots.some(x => x.mini))); k++) { await page.keyboard.press('Space'); await page.waitForTimeout(450); }
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.filter(x => x.mini).map(x => x.count)), {timeout: 10_000}).toEqual([1, 1]);
    watch.check();
  });

  test('hybrids first appear at Showtime 5; never two at once; the Files have a HYBRIDS section', async ({page}) => {
    const watch = await prepare(page, {store: store('trumpet', {files: {'oil-tank': {seen: 1, beaten: 1}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await start(page, 1);
    const r = await page.evaluate(() => {
      const G = Arcade.Showtime.debug(), S = Arcade.Showtime, rnd = Math.random, out = {};
      Math.random = () => 0;                                             // every roll: a special, and a hybrid when allowed
      for (let lv = 1; lv <= 8; lv++) { G.lv = lv; G.special = null; out[lv] = S.choose(); }
      // one special (hybrid or not) still walking: nothing else special walks on
      G.special = {state: 'walk'}; out.busy = S.choose();
      Math.random = rnd;
      return {out, hybrids: S.HYBRID_IDS, specials: S.SPECIAL_IDS};
    });
    for (let lv = 1; lv <= 8; lv++) {
      const got = r.out[lv];
      if (lv < 3) expect(got, `showtime ${lv}`).toBe(null);
      else if (lv < 5) expect(r.specials, `showtime ${lv}`).toContain(got);
      else expect(r.hybrids, `showtime ${lv}`).toContain(got);
    }
    expect(r.out.busy).toBe(null);
    // the Files: the hybrids after the specials, locked silhouettes until met
    await page.locator('#uiPauseBtn').click();
    await page.locator('#uiPause [data-act=levels]').click();
    const yes = page.locator('#uiConfirm [data-act=yes]');
    if (await yes.isVisible().catch(() => false)) await yes.click();
    await page.locator('#filesBtn').click();
    await expect(page.locator('#files .files-sec')).toHaveText(/Hybrids/i);
    expect(await page.locator('#files .file.f-hybrid').count()).toBe(6);
    expect(await page.locator('#files .file.f-hybrid .silhouette').count()).toBe(5);
    await expect(page.locator('#files .file[data-id="oil-tank"] .f-parents')).toContainText('Oil Can Ollie + Tuba Tank');
    await expect(page.locator('#filesCount')).toHaveText('1/14');
    watch.check();
  });

  test('THE FAIRNESS CHECK: every hybrid can be beaten while its note shows, at every showtime from 5, Normal and NIGHTMARE', async ({page}) => {
    for (const member of ['trumpet', 'snare']) {
      const watch = await prepare(page, {store: store(member)});
      for (const id of HYBRIDS) {
        await page.goto(`showtime-malfunction/index.html?demo&nostart&special=${id}`);
        await start(page, 5);
        const bad = await page.evaluate(() => {
          const G = Arcade.Showtime.debug(), F = window.SHOWTIME_SPECIALS.hybrids.fair, snare = Arcade.store.player === 'snare', out = [];
          for (let lv = 5; lv <= 8; lv++) for (const x of [false, true]) {
            const L = window.SHOWTIMES[lv - 1], X = x ? L.x : {};
            G.lv = lv; G.L = Object.assign({}, L, {walk: L.walk / (X.speed || 1)});
            const count = (snare ? X.snare || L.snare : X.count || L.count)[1];
            for (let k = 0; k < 5; k++) {
              const s = Arcade.Showtime.specialize({kind: 'walrus', count, item: G.pool[0] || null});
              const shows = G.L.walk / s.speed * (1 - (s.dark ? s.revealAt : 0));
              if (s.needS > shows * F.margin + 1e-6) out.push({lv, x, needS: s.needS, shows});
            }
          }
          return out;
        });
        expect(bad, `${member} ${id}`).toEqual([]);
      }
      watch.check();
    }
  });

  test('Jump Scare: a hybrid can be the source of a scare', async ({page}) => {
    const watch = await prepare(page, {store: store('trumpet', {spooky: 'jump', jumpDay: '2026-10-5'})});
    await page.goto('showtime-malfunction/index.html?demo&nostart&today=2026-10-05&special=oil-tank');
    await start(page, 5);
    await meet(page, 'oil-tank');
    await expect.poll(() => page.evaluate(() => !!Arcade.Showtime.debug().bots.find(b => b.special && b.state === 'walk'))).toBe(true);
    await page.evaluate(() => Arcade.Showtime.scare('lunge'));
    await expect(page.locator('#scareBot svg.hybrid')).toHaveCount(1);
    expect(await page.evaluate(() => Arcade.Showtime.debug().scare.from)).toBe('oil-tank');
    watch.check();
  });
});
