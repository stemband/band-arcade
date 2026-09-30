/* SUSTAIN SPEEDWAY: DYNAMICS ZONES and SLUR LAPS (sustain-speedway/game.js, levels.js dyn / slurLaps / RULES.dyn /
   RULES.slur, tips.js dynamics). The VOLUME CHECK learns soft and loud levels (?demo S then L) and is skipped for tracks
   without dynamics; a p zone at the soft level = full speed, at the loud level = slower + "softer!"; a slur lap with no
   gap keeps its speed, with a gap (?demo B) slows + "Slur it!"; the second note comes from the note set (brass: a lip
   slur); the report adds "Pitch in soft / loud zones" and the slur count. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const {openSpeedway, startTrack} = require('./speedway-helpers');

const store = (m = 'trumpet') => device(m, {gameData: {'sustain-speedway': {steerHint: true, gfx: 'lite'}}});
const clickLevel = (page, lv) => page.evaluate(lv => { document.querySelector(`.trk[data-l="${lv}"]`).click(); document.querySelector('.ls-start').click(); }, lv);

test('the volume check: SOFT then LOUD sets the levels; RETRY; tracks without dynamics skip it', async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  // track 1: no dynamics, no check
  await startTrack(page, 1, {skipChecks: false});
  expect(await page.evaluate(() => Arcade.Speedway.dyn().levels)).toBe(null);
  // track 3: the check runs before the countdown
  await openSpeedway(page);
  await clickLevel(page, 3);
  await page.waitForFunction(() => { const d = Arcade.Speedway.dyn(); return d && d.check; }, null, {timeout: 20000});
  await expect(page.locator('#vcheck')).toBeVisible();
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'soft', null, {timeout: 10000});
  await page.keyboard.down('s');
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'ready-loud', null, {timeout: 10000});
  await page.keyboard.up('s'); await page.keyboard.down('l');
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'done', null, {timeout: 10000});
  await page.keyboard.up('l');
  const r = await page.evaluate(() => Arcade.Speedway.dyn().check.result);
  expect(r.ok).toBe(true);
  expect(r.loud - r.soft).toBeGreaterThan(10);
  await page.click('#vcRetry');                                             // RETRY starts over
  expect(await page.evaluate(() => Arcade.Speedway.dyn().check.step)).toBe('ready-soft');
  // not playing at all: "I didn't hear…" and no LET'S RACE
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'done', null, {timeout: 15000});
  await expect(page.locator('#vcGo')).toHaveCount(0);
  await page.click('#vcRetry');
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'soft', null, {timeout: 10000});
  await page.keyboard.down('s');
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'ready-loud', null, {timeout: 10000});
  await page.keyboard.up('s'); await page.keyboard.down('l');
  await page.waitForFunction(() => Arcade.Speedway.dyn().check.step === 'done', null, {timeout: 10000});
  await page.keyboard.up('l');
  await page.click('#vcGo');
  await page.waitForFunction(() => Arcade.Speedway.debug().phase === 'race', null, {timeout: 20000});
  const lv = await page.evaluate(() => Arcade.Speedway.dyn().levels);
  expect(lv.loud).toBeGreaterThan(lv.soft);
  // the same session: the next dynamics track doesn't ask again
  await openSpeedway(page);
  await clickLevel(page, 4);
  await page.waitForFunction(() => { const G = Arcade.Speedway.debug(); return G && G.phase !== 'vcheck'; }, null, {timeout: 10000});
  expect(await page.evaluate(() => Arcade.Speedway.debug().phase)).not.toBe('vcheck');
  watch.check();
});

test('a p zone: soft = full speed, loud = slower with "softer!"; the report has the soft / loud rows', async ({page}) => {
  test.setTimeout(150000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  await startTrack(page, 3);
  // one lap, one p zone from 20 % to 80 % of it; the rivals crawl
  await page.evaluate(() => {
    const G = Arcade.Speedway.debug(); G.lens = [6, 6]; G.total = 12; G.rivals.forEach(r => { r.pace = .01; });
    G.zones = [[{from: 1.2, to: 4.8, kind: 'p'}], [{from: 1.2, to: 4.8, kind: 'f'}]];
  });
  await page.keyboard.down('s');
  await page.waitForFunction(() => { const d = Arcade.Speedway.dyn(); return d.zone && Arcade.Speedway.debug().dist > 2.2; }, null, {timeout: 30000});
  const soft = await page.evaluate(() => ({d: Arcade.Speedway.dyn(), v: Arcade.Speedway.debug().v}));
  expect(soft.d.zone.kind).toBe('p');
  expect(soft.d.mul).toBe(1);
  await expect(page.locator('#dynBadge .dyn-hint')).toHaveCount(0);
  await page.keyboard.up('s'); await page.keyboard.down('l');
  await page.waitForFunction(() => Arcade.Speedway.dyn().mul < 1, null, {timeout: 10000});
  await expect(page.locator('#dynBadge .dyn-hint')).toHaveText('softer!');
  const loud = await page.evaluate(() => Arcade.Speedway.dyn());
  expect(loud.mul).toBeCloseTo(.8, 5);
  // f zone on lap 2: loud is right, soft is "louder!"
  await page.keyboard.up('l'); await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.debug().lap === 1 && Arcade.Speedway.debug().phase === 'race' && Arcade.Speedway.dyn().zone, null, {timeout: 60000});
  await page.keyboard.up('Space'); await page.keyboard.down('s');
  await page.waitForFunction(() => Arcade.Speedway.dyn().mul < 1, null, {timeout: 10000});
  await expect(page.locator('#dynBadge .dyn-hint')).toHaveText('louder!');
  await page.keyboard.up('s'); await page.keyboard.down('Space');
  await page.waitForFunction(() => document.querySelector('#resTuning'), null, {timeout: 60000});
  await page.keyboard.up('Space');
  await expect(page.locator('.tn-dyn .tn-row')).toHaveCount(2);
  watch.check();
});

test('a slur lap: no gap keeps the speed ("Smooth!"), a gap slows ("Slur it!"); brass gets a lip slur', async ({page}) => {
  test.setTimeout(150000);
  const watch = await prepare(page, {store: store()});
  await openSpeedway(page);
  await startTrack(page, 5);
  const setup = await page.evaluate(() => {
    const G = Arcade.Speedway.debug();
    const fing = window.MASHER_FINGERINGS.trumpet.notes, name = it => it.n.letter + (it.n.acc < 0 ? 'b' : it.n.acc > 0 ? '#' : '') + it.n.oct;
    const pairs = G.slurB.map((b, i) => b && [name(G.items[i]), name(b), fing[name(G.items[i])] && fing[name(G.items[i])][0], fing[name(b)] && fing[name(b)][0]]).filter(Boolean);
    G.lens = G.lens.map(() => 3); G.total = 3 * G.lens.length; G.rivals.forEach(r => { r.pace = .01; });
    G.zones = G.zones.map(() => []);
    // laps 1 and 2 are slur laps in this test (the same partner rule)
    G.slurB[0] = G.slurB[2] || G.slurB[5]; G.items[0] = G.items[2] || G.items[5];
    G.slurB[1] = G.slurB[0]; G.items[1] = G.items[0];
    return {pairs, laps: G.slurB.map(Boolean)};
  });
  expect(setup.pairs.length).toBe(2);                                        // Harbor Lights: laps 3 and 6
  // the pool is First 5 (C D E F G): a lip slur exists for C and G (both open); every partner is in the pool
  setup.pairs.forEach(([a, b, fa, fb]) => { expect(['C4', 'D4', 'E4', 'F4', 'G4']).toContain(b); if (['C4', 'G4'].includes(a)) expect(fb).toBe(fa); });
  await page.keyboard.down('Space');                                        // Space = a clean slur
  await page.waitForFunction(() => { const s = Arcade.Speedway.slur(); return s.slurs.length >= 1; }, null, {timeout: 40000});
  await page.keyboard.up('Space');
  let s = await page.evaluate(() => Arcade.Speedway.slur());
  expect(s.slurs[0].how).toBe('slur');
  expect(s.mul).toBe(1);
  await page.waitForFunction(() => Arcade.Speedway.debug().lap === 1 && Arcade.Speedway.debug().phase === 'race', null, {timeout: 30000});
  await page.keyboard.down('b');                                            // B = a break at the switch
  await page.waitForFunction(() => Arcade.Speedway.slur().slurs.length >= 2, null, {timeout: 40000});
  s = await page.evaluate(() => Arcade.Speedway.slur());
  expect(s.slurs[1].how).toBe('break');
  expect(s.mul).toBeCloseTo(.55, 5);
  await expect(page.locator('#banner')).toHaveText('Slur it!');
  await page.keyboard.up('b'); await page.keyboard.down('Space');
  await page.waitForFunction(() => document.querySelector('#resTuning'), null, {timeout: 90000});
  await page.keyboard.up('Space');
  await expect(page.locator('#tnSlurs')).toContainText('3 of 4');                       // laps 1, 2 (+ the track's 3 and 6): one break
  watch.check();
});

test('slur partners stay in the note set and never cross the break (clarinet, alto sax) or leave the range', async ({page}) => {
  test.setTimeout(90000);
  for (const m of ['clarinet', 'altosax', 'flute', 'trombone', 'tuba', 'horn']) {
    await prepare(page, {store: store(m)});
    await page.evaluate(m => { try { const d = JSON.parse(localStorage.getItem('bandarcade.v1')); d.player = m; localStorage.setItem('bandarcade.v1', JSON.stringify(d)); } catch (e) { /* first page */ } }, m).catch(() => {});
    await openSpeedway(page);
    await page.evaluate(m => { const d = Arcade.store; d.setPlayer(m); }, m);
    await openSpeedway(page);
    await startTrack(page, 8);
    const r = await page.evaluate(() => {
      const G = Arcade.Speedway.debug(), pool = G.seq.pool.map(p => p.midi);
      return G.slurB.map((b, i) => b && {a: G.items[i].midi, b: b.midi, inPool: pool.includes(b.midi)}).filter(Boolean);
    });
    expect(r.length).toBeGreaterThan(0);
    r.forEach(x => {
      expect(x.inPool).toBe(true);
      expect(x.a).not.toBe(x.b);
      if (m === 'clarinet') expect(x.a < 70.5).toBe(x.b < 70.5);
      if (m === 'altosax') expect(x.a < 73.5).toBe(x.b < 73.5);
    });
  }
});
