/* SHOWTIME MALFUNCTION: THE ENCORE (ENDLESS MODE; levels.js SHOWTIME_ENDLESS, game.js G.endless, shared/endless.js).
   - the ∞ card under the showtimes, its Top 5 per member + note set (the snare's 'count' apart);
   - the ramp by RUN TIME (the pausable show clock): speed = Endless.speed, atOnce / lanes steps, no specials before 45 s,
     Maestro Moose's encore every 20 reboots;
   - 3 spotlights = 3 lives, the combo multiplier, a sour note / a spotlight lost resets the combo;
   - no stars or `games` progress, ?demo never saves, a real run goes to store.endless and the leaderboard;
   - pausing (the kit PAUSE, a special's card, a sound muting the mic) stops t and the band;
   - the snare's ramp (counts first, freeze and rhythm at their times, the over-hit);
   - jump scares only where allowed and on, at most one per 25 reboots;
   - the stage band never overflows; reduced motion; the frame rate at 4× CPU throttle (PERF=1, Chromium, alone). */
const {test, expect} = require('@playwright/test');
const {prepare, device, LB_URL} = require('./helpers');

const DAY = '2026-10-05';
const seen = {storySeen: true};
const S = page => page.evaluate(() => Arcade.Showtime.state());

/** open the page and start THE ENCORE from its ∞ card (the level select: the card, then START) */
async function encore(page, {store = device('trumpet', {gameData: {'showtime-malfunction': seen}}), q = ''} = {}) {
  const watch = await prepare(page, {store});
  await page.goto(`showtime-malfunction/index.html?demo&nostart${q}`);
  await play(page);
  return watch;
}
/** the ∞ card, START, then past the microphone card (?demo stands in for the mic) */
async function play(page) {
  await page.locator('.ls-endless').first().click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 40 && !(await page.evaluate(() => !!(Arcade.Showtime.state() || {}).endless)); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect.poll(async () => !!((await S(page)) || {}).endless, {timeout: 20_000}).toBe(true);
}
/** reboot the closest machine at once (the next one walks on right away) */
async function rebootOne(page) {
  await page.evaluate(() => { const G = Arcade.Showtime.debug(); if (G) G.spawnAt = 0; });
  await expect.poll(() => page.evaluate(() => {
    const G = Arcade.Showtime.debug(); if (!G) return false; G.spawnAt = 0;
    if (!document.getElementById('specialCard').hidden) document.getElementById('spGo').click();   // a special's first card
    return Arcade.Showtime.clearTarget();
  }), {timeout: 15_000}).toBe(true);
}
/** the closest machine reaches the front: one spotlight out (waits for it; the last one = GAME OVER) */
async function loseLight(page) {
  const before = (await S(page)).lights;
  await toFront(page);
  await expect.poll(async () => { const s = await S(page); return s ? s.lights : 0; }, {timeout: 15_000}).toBeLessThan(before);
}
async function toFront(page) {
  await expect.poll(() => page.evaluate(() => {
    const G = Arcade.Showtime.debug(); if (!G) return false; G.spawnAt = 0;
    if (!document.getElementById('specialCard').hidden) document.getElementById('spGo').click();   // a special's first card
    const b = G.bots.filter(x => x.state === 'walk').sort((x, y) => y.z - x.z)[0];
    if (!b) return false;
    b.z = .999; return true;
  }), {timeout: 15_000}).toBe(true);
}

test.describe('Showtime Malfunction: THE ENCORE', () => {
  test('the ∞ card under the showtimes opens a run; its Top 5 is per member + note set, the snare\'s apart', async ({page}) => {
    const runs = {'showtime-malfunction': {trumpet: {'first5-random': [{score: 4321, name: 'Trumpet Ace', date: '2026-09-01', notes: 30, speed: 1.2, combo: 12}]},
      snare: {count: [{score: 777, name: 'Drummer', date: '2026-09-01', notes: 9, speed: 1, combo: 4}]}}};
    const watch = await prepare(page, {store: device('trumpet', {endless: runs, gameData: {'showtime-malfunction': seen}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    const tile = page.locator('#endlessTile .ed-tile');
    await expect(tile).toBeVisible();
    await expect(tile.locator('.ed-title')).toHaveText('The Encore');
    await expect(tile.locator('.ed-blurb')).toContainText('The show never ends!');
    // under the showtimes
    const below = await page.evaluate(() => document.getElementById('endlessTile').getBoundingClientRect().top >= document.getElementById('levelGrid').getBoundingClientRect().bottom - 1);
    expect(below).toBe(true);
    await expect(tile.locator('.ed-top li')).toHaveCount(1);
    await expect(tile.locator('.ed-score')).toHaveText('4,321');
    // another note set: its own (empty) Top 5
    expect(await page.evaluate(() => Arcade.Endless.top('showtime-malfunction', 'trumpet', 'Eb-random').length)).toBe(0);
    // the run starts from the card (always open, NIGHTMARE or not)
    await play(page);
    expect(await page.evaluate(() => document.body.classList.contains('extra-mode'))).toBe(false);
    watch.check();
  });

  test('the snare\'s Top 5 is its own (note set \'count\')', async ({page}) => {
    const runs = {'showtime-malfunction': {trumpet: {'first5-random': [{score: 4321, name: 'Trumpet Ace', date: '2026-09-01', notes: 30, speed: 1.2, combo: 12}]},
      snare: {count: [{score: 777, name: 'Drummer', date: '2026-09-01', notes: 9, speed: 1, combo: 4}]}}};
    const watch = await prepare(page, {store: device('snare', {endless: runs, gameData: {'showtime-malfunction': seen}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await expect(page.locator('#endlessTile .ed-score')).toHaveText('777');
    await expect(page.locator('#endlessTile .ed-top li')).toHaveCount(1);
    watch.check();
  });

  test('the ramp: speed by Endless.speed, atOnce and lanes step up, no specials before 45 s, the Maestro at 20 reboots', async ({page}) => {
    test.setTimeout(120_000);
    let watch = await encore(page);
    const a = await page.evaluate(() => {
      const st = Arcade.Showtime.state().endless, E = window.SHOWTIME_ENDLESS;
      const tries = [...Array(300)].map(() => Arcade.Showtime.choose());
      return {st, want: Arcade.Endless.speed(E.speed, st.t), specials: tries.filter(Boolean).length};
    });
    expect(a.st.atOnce).toBe(1);
    expect(a.st.lanes).toBe(2);
    expect(Math.abs(a.st.speed - a.want)).toBeLessThan(.01);
    expect(a.specials, 'no specials in the first 45 s').toBe(0);
    // 20 reboots: Maestro Moose's encore (2 phases), the next one due at 40
    await page.evaluate(() => { Arcade.Showtime.debug().rebooted = 19; });
    await rebootOne(page);
    await expect.poll(async () => (await S(page)).endless.boss).toBe(true);
    const b = await page.evaluate(() => { const G = Arcade.Showtime.debug(); return {next: G.endless.nextBossAt, phases: G.endless.boss.phases, encores: G.endless.encores}; });
    expect(b).toEqual({next: 40, phases: 2, encores: 1});
    watch.check();

    // later in a run (?demo&endlessT=): faster, more at once, three lanes, specials
    for (const [t, atOnce, lanes] of [[60, 2, 2], [200, 3, 3]]) {
      const p = await page.context().newPage();
      watch = await encore(p, {q: `&endlessT=${t}`});
      const r = await p.evaluate(() => {
        const st = Arcade.Showtime.state().endless, E = window.SHOWTIME_ENDLESS;
        const G = Arcade.Showtime.debug(), sp = G.special;
        G.special = null;                                    // (one may already be walking: choose() then waits for it)
        const specials = [...Array(300)].map(() => Arcade.Showtime.choose()).filter(Boolean).length;
        G.special = sp;
        return {st, want: Arcade.Endless.speed(E.speed, st.t), specials};
      });
      expect(r.st.atOnce, `atOnce at ${t} s`).toBe(atOnce);
      expect(r.st.lanes, `lanes at ${t} s`).toBe(lanes);
      expect(r.st.speed).toBeGreaterThan(a.st.speed);
      expect(Math.abs(r.st.speed - r.want)).toBeLessThan(.01);
      expect(r.specials, `specials at ${t} s`).toBeGreaterThan(0);
      watch.check();
      await p.close();
    }
  });

  test('3 spotlights out = GAME OVER with the stats; the combo multiplier; a spotlight lost or a sour note resets it', async ({page}) => {
    test.setTimeout(120_000);
    const watch = await encore(page);
    for (let k = 0; k < 10; k++) await rebootOne(page);
    let st = (await S(page)).endless;
    expect(st.combo).toBe(10);
    expect(st.score, '9 × 100, then the 10th at ×2').toBe(9 * 100 + 200);
    // a sour note (a wrong pitch: ?demo's W) breaks the combo
    await expect.poll(async () => { await page.keyboard.press('w'); await page.waitForTimeout(150); return (await S(page)).endless.combo; }, {timeout: 15_000}).toBe(0);
    await rebootOne(page);
    expect((await S(page)).endless.combo).toBe(1);
    // a spotlight lost breaks it too
    await toFront(page);
    await expect.poll(async () => (await S(page)).endless.lives).toBe(2);
    expect((await S(page)).endless.combo).toBe(0);
    await toFront(page);
    await expect.poll(async () => (await S(page)).endless.lives).toBe(1);
    await toFront(page);
    await expect(page.locator('#results.ed-over')).toBeVisible({timeout: 15_000});
    const tiles = await page.locator('#results .ui-tile small').allTextContents();
    for (const k of ['Machines rebooted', 'Best combo', 'Time', 'Specials beaten', 'Maestro encores']) expect(tiles).toContain(k);
    await expect(page.locator('#results .ed-demo')).toHaveText('Demo run — score not saved');
    await expect(page.locator('#resRetry')).toHaveText('Encore again');
    // the rebooted band on the results
    expect(await page.locator('#resBand .bot').count()).toBeGreaterThan(0);
    // no stars, nothing in games, nothing saved in ?demo
    const saved = await page.evaluate(() => ({games: JSON.stringify(Arcade.store.level('showtime-malfunction', 'trumpet', 1)), endless: Arcade.Endless.top('showtime-malfunction', 'trumpet', 'first5-random').length,
      stars: Arcade.store.allStars('trumpet', 'showtime-malfunction')}));
    expect(saved.endless).toBe(0);
    expect(saved.stars).toBe(0);
    watch.check();
  });

  test('a real run: saved in store.endless (never in games) and an Endless leaderboard event with only the allowed fields', async ({page}) => {
    test.skip(!LB_URL, 'the leaderboard is switched off');
    test.setTimeout(120_000);
    const watch = await encore(page, {store: device('trumpet', {gameData: {'showtime-malfunction': seen, leaderboard: {grade: 6, on: true}}})});
    const progress = () => page.evaluate(() => JSON.stringify(Object.entries(JSON.parse(localStorage.getItem('bandarcade.v1')).games || {}).filter(([k]) => k.startsWith('showtime'))));
    const before = await progress();
    for (let k = 0; k < 3; k++) await rebootOne(page);
    // a real run (not ?demo) from here on: the page's demo flag off, so the run saves and the leaderboard hears it
    await page.evaluate(() => { Arcade.DEMO = false; });
    for (let k = 0; k < 3; k++) await loseLight(page);
    await expect(page.locator('#results.ed-over')).toBeVisible({timeout: 15_000});
    await page.evaluate(() => Arcade.Leaderboard.flush());
    const r = await page.evaluate(() => ({top: Arcade.Endless.top('showtime-malfunction', 'trumpet', 'first5-random')}));
    expect(r.top.length).toBe(1);
    expect(r.top[0].score).toBe(300);
    expect(await progress(), 'nothing in games progress').toBe(before);
    await expect.poll(() => watch.posts.length, {timeout: 10_000}).toBeGreaterThan(0);
    const ev = watch.posts.map(p => JSON.parse(p)).find(p => p.type === 'endless');
    expect(ev).toBeTruthy();
    expect(Object.keys(ev).sort()).toEqual(['game', 'grade', 'level', 'name', 'pid', 'type', 'value']);
    expect(ev).toMatchObject({game: 'showtime-malfunction', type: 'endless', value: 300});
    watch.check();
  });

  test('pausing freezes the run clock and the band: the kit PAUSE, a special\'s card, a sound muting the mic', async ({page}) => {
    test.setTimeout(120_000);
    const watch = await encore(page, {q: '&special=turbo'});
    const frozen = async what => {
      const a = await page.evaluate(() => { const G = Arcade.Showtime.debug(); return {t: G.t, z: G.bots.map(b => b.z)}; });
      await page.waitForTimeout(700);
      const b = await page.evaluate(() => { const G = Arcade.Showtime.debug(); return {t: G.t, z: G.bots.map(b => b.z)}; });
      expect(b, what).toEqual(a);
    };
    // a special's first card (?demo&special=: every machine may be that special, even before 45 s)
    await expect(page.locator('#specialCard')).toBeVisible({timeout: 20_000});
    await frozen('the special\'s card');
    await page.locator('#spGo').click();
    await expect.poll(async () => (await S(page)).t).toBeGreaterThan(0);
    // the kit PAUSE
    await page.locator('#uiPauseBtn').click();
    await expect(page.locator('#uiPause')).toBeVisible();
    await frozen('PAUSE');
    await page.locator('#uiPause [data-act=resume]').click();
    // a sound muting the microphone (Pitch.suppress)
    await page.evaluate(() => Arcade.Pitch.suppress(3000));
    await frozen('a sound playing');
    watch.check();
  });

  test('the snare: exact counts first, freeze and rhythm at their times, the over-hit adds hits', async ({page}) => {
    test.setTimeout(120_000);
    const snareStore = () => device('snare', {gameData: {'showtime-malfunction': Object.assign({snareDyn: {soft: .05, loud: .4, split: .1414}}, seen)}});
    let watch = await encore(page, {store: snareStore()});
    const early = await page.evaluate(() => {
      const G = Arcade.Showtime.debug(), out = [];
      for (let k = 0; k < 60; k++) out.push(Arcade.Showtime.snareJob({kind: 'walrus', count: 4, item: null}).job.type);
      return {types: [...new Set(out)], lv: G.lv};
    });
    expect(early.types).toEqual(['count']);
    expect(early.lv).toBe(1);
    // the over-hit: at 0 the machine waits; one more hit adds overhitAdd
    await expect.poll(() => page.evaluate(() => !!(Arcade.Showtime.snare() || {}).target), {timeout: 20_000}).toBe(true);
    await expect.poll(() => page.evaluate(() => !Arcade.Showtime.snare().stillNow)).toBe(true);
    // one hit at a time (each on a moving frame: a hit while the band stands still counts for nothing) until the CONFIRM
    const hit = () => page.evaluate(() => { const s = Arcade.Showtime.snare(); if (s.stillNow) return false; Arcade.Onsets.fake(performance.now(), .3); return true; });
    await expect.poll(async () => { if (await page.evaluate(() => Arcade.Showtime.snare().target.left <= 1)) return true; await hit(); await page.waitForTimeout(220); return false; },
      {timeout: 20_000}).toBe(true);
    // the last hit (the CONFIRM wait begins), then one too many
    await expect.poll(() => page.evaluate(() => { const s = Arcade.Showtime.snare(); if (s.stillNow) return false; Arcade.Onsets.fake(performance.now(), .3); Arcade.Onsets.fake(performance.now() + 5, .3); return true; })).toBe(true);
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.snare().log.includes('overhit'))).toBe(true);
    expect((await S(page)).endless.combo, 'an over-hit is a sour note').toBe(0);
    watch.check();
    // later: freeze (from 40 s) and rhythm machines (from 90 s); the showtime the tables are read at grows with t
    const p = await page.context().newPage();
    watch = await encore(p, {store: snareStore(), q: '&endlessT=200'});
    const late = await p.evaluate(() => {
      const G = Arcade.Showtime.debug(), out = [];
      for (let k = 0; k < 200; k++) out.push(Arcade.Showtime.snareJob({kind: 'walrus', count: 6, item: null}).job.type);
      return {types: [...new Set(out)], lv: G.lv};
    });
    expect(late.lv).toBe(5);                                  // 1 + 200 ÷ 45
    expect(late.types).toContain('rhythm');
    expect(late.types).toContain('count');
    // freeze: a count machine as the target gets a freeze point (the chance at its showtime: run it until one does)
    const fz = await p.evaluate(() => { const E = window.SHOWTIME_ENDLESS.snare; return E.freezeFromS <= 200; });
    expect(fz).toBe(true);
    watch.check();
    await p.close();
  });

  test('jump scares: none when the spooky level is Mild', async ({page}) => {
    test.setTimeout(120_000);
    const watch = await encore(page);
    for (let k = 0; k < 30; k++) await rebootOne(page);
    expect(await page.evaluate(() => Arcade.Showtime.debug().scares.length + Arcade.Showtime.debug().scarePlan.length)).toBe(0);
    watch.check();
  });

  test('jump scares: where allowed and on today, at most one per 25 reboots', async ({page}) => {
    test.setTimeout(150_000);
    const p = page;
    const watch = await prepare(p, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true, spooky: 'jump', jumpDay: '2026-10-5', scareVisual: true}}})});
    await p.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}`);
    const allowed = await p.evaluate(() => !!(Arcade.TEACHER && Arcade.TEACHER.JUMP_SCARE_ALLOWED));
    await play(p);
    for (let k = 0; k < 25; k++) {
      await rebootOne(p);
      await p.waitForTimeout(80);
    }
    // let the planned scare come (it waits for its guards: never with a machine near the front)
    await p.evaluate(() => { Arcade.Showtime.debug().bots.forEach(b => { if (b.state === 'walk') b.z = 0; }); });
    await p.waitForTimeout(allowed ? 9000 : 1500);
    const n = await p.evaluate(() => { const G = Arcade.Showtime.debug(); return G.scares.length + G.scarePlan.length; });
    if (allowed) expect(n).toBe(1); else expect(n).toBe(0);
    watch.check();
  });

  test('the stage band never overflows after 60 reboots', {tag: '@slow'}, async ({page}) => {
    test.setTimeout(180_000);
    const watch = await encore(page);
    await page.evaluate(() => { Arcade.Showtime.debug().endless.nextBossAt = 1e9; });   // (the Maestro: not this test)
    for (let k = 0; k < 60; k++) await rebootOne(page);
    await page.waitForTimeout(3000);                                                     // the last ones home, the oldest walked off
    const r = await page.evaluate(() => {
      const band = document.getElementById('band'), box = document.querySelector('.arena').getBoundingClientRect();
      const kids = [...band.children].filter(el => !el.classList.contains('leaving'));
      return {n: kids.length, max: window.SHOWTIME_ENDLESS.bandMax, inBand: Arcade.Showtime.debug().band.length,
        out: kids.filter(el => { const b = el.getBoundingClientRect(); return b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1; }).length};
    });
    expect(r.inBand).toBe(r.max);
    expect(r.n).toBe(r.max);
    expect(r.out).toBe(0);
    watch.check();
  });

  test('reduced motion: SPEED UP! only fades (no motion), no lean-in at GAME OVER', async ({page}) => {
    test.setTimeout(120_000);
    await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await encore(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true, spooky: 'spooky'}}}), q: '&endlessT=44'});
    await expect.poll(async () => (await S(page)).endless.tier, {timeout: 20_000}).toBe(1);
    const tf = [];
    for (let k = 0; k < 6; k++) { tf.push(await page.evaluate(() => getComputedStyle(document.getElementById('edFlash')).transform)); await page.waitForTimeout(120); }
    expect(new Set(tf).size, 'SPEED UP! never moves').toBe(1);
    expect(await page.locator('#edFlash').textContent()).toContain('SPEED UP!');
    for (let k = 0; k < 3; k++) await loseLight(page);
    await page.waitForTimeout(400);
    expect(await page.locator('.bots .lean-in').count()).toBe(0);
    await expect(page.locator('#results.ed-over')).toBeVisible({timeout: 15_000});
    watch.check();
  });

  test('performance: 3 machines + a special + the band at 4× CPU throttle keep ≥ 30 frames a second', async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium feature');
    test.skip(!process.env.PERF, 'runs alone: PERF=1 npx playwright test showtime-endless -g performance --project=chromium --workers=1');
    test.setTimeout(120_000);
    await page.setViewportSize({width: 1180, height: 820});
    const watch = await encore(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true, files: {'oil-can-ollie': {seen: 1, beaten: 0}}}}}), q: '&endlessT=200&special=oil-can'});
    await page.evaluate(() => { Arcade.Showtime.debug().endless.nextBossAt = 1e9; });
    for (let k = 0; k < 12; k++) await rebootOne(page);                        // a band on the stage
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.filter(b => b.state === 'walk').length), {timeout: 30_000}).toBeGreaterThanOrEqual(3);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    const fps = await page.evaluate(() => new Promise(res => {
      let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 8000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); };
      // keep the machines on the floor while it's measured
      const keep = setInterval(() => { const G = Arcade.Showtime.debug(); if (G) G.bots.forEach(b => { if (b.state === 'walk' && b.z > .7) b.z = .2; }); }, 200);
      requestAnimationFrame(f); setTimeout(() => clearInterval(keep), 8200);
    }));
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
    const st = await page.evaluate(() => { const G = Arcade.Showtime.debug(); return {walking: G.bots.filter(b => b.state === 'walk').length, special: G.bots.some(b => b.special && b.state === 'walk'), band: G.band.length}; });
    console.log(`Showtime Malfunction (The Encore) at 4× CPU throttle: ${fps.toFixed(1)} fps (${JSON.stringify(st)})`);
    expect(st.special).toBe(true);
    expect(fps).toBeGreaterThanOrEqual(30);
    watch.check();
  });
});
