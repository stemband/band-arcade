/* SHOWTIME MALFUNCTION: the parts that broke before.
   - JUMP SCARE: every showtime plans its scares by PROGRESS (after a share of the animatronics has walked on), so every
     show gets at least one (two on the longer ones) however fast it's played.
   - SNARE: the same cast as everyone else (the band, the specials, Maestro Moose); only the counting differs.
   - THE STAGE LINEUP and the RESULTS BAND always fit (smaller, overlapping, more rows), the results' band sits BELOW
     the stars, and a special machine's card is on top of everything. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const DAY = '2026-10-05';                 // ?demo&today= pretends this date, so the Jump Scare day matches
const jumpStore = (member = 'trumpet') => device(member, {gameData: {'showtime-malfunction': {storySeen: true, spooky: 'jump', jumpDay: '2026-10-5'}}});

async function start(page, lv) {
  await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 40 && !(await page.evaluate(() => !!Arcade.Showtime.debug())); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect.poll(() => page.evaluate(() => !!Arcade.Showtime.debug())).toBe(true);
}

test.describe('Showtime Malfunction', () => {
  test('Jump Scare: every showtime plans its scares by progress (1, or 2 on the longer shows)', async ({page}) => {
    test.setTimeout(180_000);                                              // it plays a show until the first scare
    const watch = await prepare(page, {store: jumpStore()});
    await page.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}`);
    // the Settings line under the spooky buttons
    await page.locator('#topbar .snd-open').click();
    await expect(page.locator('#uiSettings [data-jump-note]')).toBeVisible();
    await expect(page.locator('#uiSettings [data-jump-note]')).toHaveText('Jump Scare resets to Spooky each new day.');
    await page.locator('#uiSettings [data-act=done]').click();
    const plans = {};
    for (const lv of [1, 3, 7, 8]) {
      await start(page, lv);
      plans[lv] = await page.evaluate(() => {
        const G = Arcade.Showtime.debug(), S = window.SHOWTIME_SCARES;
        return {n: G.scarePlan.length, afters: G.scarePlan.map(p => p.after), bots: G.L.bots, long: G.L.bots >= S.longFrom || !!G.L.boss};
      });
      const p = plans[lv];
      expect(p.n, `showtime ${lv}`).toBe(p.long ? 2 : 1);
      p.afters.forEach(a => { expect(a).toBeGreaterThanOrEqual(1); expect(a).toBeLessThan(p.bots); });   // never before the first, never after the last walks on
      await page.locator('#uiPauseBtn').click();
      await page.locator('#uiPause [data-act=levels]').click();
      const yes = page.locator('#uiConfirm [data-act=yes]');
      if (await yes.isVisible().catch(() => false)) await yes.click();
      await expect.poll(() => page.evaluate(() => !!Arcade.Showtime.debug())).toBe(false);
    }
    // a scare fires once enough of the band has walked on: play the show (?demo: Space = a right attack on the target), so
    // the animatronics are rebooted and the next ones walk on, until the first scare (a slow machine runs the game clock
    // slower: up to 90 s)
    await start(page, 1);
    let scares = 0;
    for (const t0 = Date.now(); Date.now() - t0 < 90_000 && !scares;) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      scares = await page.evaluate(() => { const G = Arcade.Showtime.debug(); return G ? G.scares.length : -1; });
      if (scares < 0) break;                                           // the show ended without a scare
    }
    expect(scares).toBeGreaterThanOrEqual(1);
    watch.check();
  });

  test('Snare: the same band, specials and Maestro Moose as everyone else', async ({page}) => {
    const watch = await prepare(page, {store: device('snare', {gameData: {'showtime-malfunction': {storySeen: true}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await start(page, 8);
    const s = await page.evaluate(() => {
      const G = Arcade.Showtime.debug();
      // (on a slow machine Maestro Moose may already be walking when this is read: he is the boss, not the band)
      return {kinds: G.queue.map(q => q.kind).concat(G.bots.filter(b => !b.boss).map(b => b.kind)), boss: !!G.L.boss,
        moose: G.bossPending || G.bots.some(b => b.boss && b.kind === 'moose'), html: document.body.innerHTML.includes('SAL-')};
    });
    expect(s.kinds.length).toBeGreaterThan(0);
    s.kinds.forEach(k => expect(['walrus', 'owl', 'gator', 'raccoon']).toContain(k));
    expect(new Set(s.kinds).size).toBeGreaterThan(1);                // not a clone army
    expect(s.boss && s.moose).toBe(true);                            // Maestro Moose comes (or is already on his way)
    expect(s.html).toBe(false);
    watch.check();
  });

  for (const [name, w, h] of [['phone landscape', 844, 390], ['iPad portrait', 820, 1180], ['iPad landscape', 1180, 820], ['laptop', 1366, 768]]) {
    test(`the stage lineup fits the most animatronics a show can have (${name})`, async ({page}) => {
      await page.setViewportSize({width: w, height: h});
      const watch = await prepare(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true}}})});
      await page.goto('showtime-malfunction/index.html?demo&nostart');
      await start(page, 1);
      // 10 animatronics + 20 Split Sprocket minis + Maestro Moose on the stage
      const r = await page.evaluate(() => new Promise(res => {
        const band = document.getElementById('band'), SHOW = Arcade.Showtime;
        band.innerHTML = '';
        for (let i = 0; i < 31; i++) {
          const el = document.createElement('span');
          el.className = 'band-bot bot fixed' + (i === 12 ? ' boss' : i > 10 ? ' mini' : '');
          el.innerHTML = SHOW.botSVG(i === 12 ? 'moose' : ['walrus', 'owl', 'gator', 'raccoon'][i % 4]);
          band.appendChild(el);
        }
        SHOW.lineup(band);
        setTimeout(() => {
          const box = document.querySelector('.arena').getBoundingClientRect();
          const out = [...band.children].filter(el => { const b = el.getBoundingClientRect(); return b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1; }).length;
          const boss = band.querySelector('.boss').getBoundingClientRect(), bb = band.getBoundingClientRect();
          res({out, rows: +band.dataset.rows, h: band.children[0].getBoundingClientRect().height, bossMid: Math.abs((boss.left + boss.right) / 2 - (bb.left + bb.right) / 2) / bb.width});
        }, 900);
      }));
      expect(r.out).toBe(0);
      expect(r.h).toBeGreaterThan(18);                     // still big enough to see
      expect(r.bossMid).toBeLessThan(.2);                  // Maestro Moose in the middle
      watch.check();
    });
  }

  test('a special machine\'s card is on top of the animatronics, the game paused behind it', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart&special=turbo');
    await start(page, 1);
    await expect(page.locator('#specialCard')).toBeVisible({timeout: 20_000});
    const onTop = await page.evaluate(() => {
      const card = document.querySelector('#specialCard .panel'), r = card.getBoundingClientRect();
      const pts = [[.5, .5], [.2, .3], [.8, .7], [.5, .9]];
      return pts.every(([x, y]) => card.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)));
    });
    expect(onTop).toBe(true);
    expect(await page.evaluate(() => Arcade.Showtime.debug().paused)).toBeTruthy();
    const t = await page.evaluate(() => Arcade.Showtime.debug().t);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => Arcade.Showtime.debug().t)).toBe(t);
    await page.locator('#spGo').click();
    await expect(page.locator('#specialCard')).toBeHidden();
    watch.check();
  });

  test('results: the rebooted band fits below the stars', async ({page}) => {
    await page.setViewportSize({width: 844, height: 390});
    const watch = await prepare(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await start(page, 1);
    // a finished show with a big band (31 on stage)
    await page.evaluate(() => {
      const G = Arcade.Showtime.debug();
      G.band = [...Array(31)].map((_, i) => ({kind: i === 12 ? 'moose' : ['walrus', 'owl', 'gator', 'raccoon'][i % 4], boss: i === 12, mini: i > 12}));
      G.rebooted = G.total; G.queue.length = 0; G.bossPending = false;
      Arcade.Showtime.finish();
    });
    await expect(page.locator('#results')).toBeVisible({timeout: 10_000});
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const band = document.getElementById('resBand'), stars = document.querySelector('#results .ui-stars');
      const sb = stars.getBoundingClientRect(), bb = band.getBoundingClientRect();
      const kids = [...band.children].map(el => el.getBoundingClientRect());
      const over = [...stars.querySelectorAll('*')].some(s => { const r = s.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && band.contains(e); });
      return {n: kids.length, below: bb.top >= sb.bottom - 1, inside: kids.every(k => k.left >= bb.left - 1 && k.right <= bb.right + 1 && k.top >= bb.top - 1 && k.bottom <= bb.bottom + 1), over};
    });
    expect(r.n).toBe(31);
    expect(r.below).toBe(true);
    expect(r.inside).toBe(true);
    expect(r.over).toBe(false);
    watch.check();
  });
});
