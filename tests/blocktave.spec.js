/* BLOCKTAVE (blocktave/): the world, saving, mining = playing, the snare, crafting = performing, creatures, the
   milestone stars, the layout on iPads and phones, and the frame rate at 4× CPU throttle. Every test opens ?demo with
   a fixed ?seed= (the world is the same every run) and uses the game's own hooks (Arcade.Blocktave.demo), which call
   the real mining, crafting and building code. Chapter 1 end to end is in the game runs (tests/games.js). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SEEN = {welcome: 1, mining: 1, night: 1, 'c-clam': 1, 'c-wisp': 1, 'c-rusher': 1, composer: 1, 'file-note': 1};
/** the device: an instrument, Blocktave's mode, every first-time card already seen */
const store = (member, mode, extra = {}) => device(member, Object.assign({gameData: {blocktave: {mode, seen: SEEN}}}, extra));

/** open Blocktave and walk into the world (chapter 1): INSTRUMENT mode's microphone reminder is answered */
async function enter(page, {member = 'trumpet', mode = 'touch', seed = 42, extra} = {}) {
  const watch = await prepare(page, {store: store(member, mode, extra)});
  await page.goto(`blocktave/index.html?demo&nostart&seed=${seed}`);
  await page.locator('.ls-card:not(.ls-endless)').first().click();
  await page.locator('.ls-start').click();
  await into(page);
  return watch;
}
async function into(page) {
  const gate = page.locator('.overlay:not([hidden]) [data-act=go]').first();
  await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world' || !!document.querySelector('.overlay:not([hidden]) [data-act=go]'));
  if (await gate.isVisible().catch(() => false)) await gate.click();
  await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
  await page.waitForTimeout(300);
}
const st = page => page.evaluate(() => Arcade.Blocktave.state());
/** stand next to the nearest block of this kind (a pocket dug beside it) and return where it is */
const nextTo = (page, key) => page.evaluate(k => { const d = Arcade.Blocktave.demo, t = d.find(k); d.standBy(t.x, t.y); return t; }, key);
/** a block of this kind right beside the player (so every kind can be tried) */
const putBeside = (page, key) => page.evaluate(k => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
  d.put(x, y, k); d.put(x, y + 1, 'slate'); return {x, y}; }, key);
const cardOpen = page => page.evaluate(() => !!Arcade.BlocktaveCard.current);
const waitCardGone = page => page.waitForFunction(() => !Arcade.BlocktaveCard.current, null, {timeout: 20_000});

test.describe('Blocktave: the world', () => {
  test('the same seed makes the same world; every biome and both deep layers exist', async ({page}) => {
    await prepare(page, {store: store('trumpet', 'touch')});
    await page.goto('blocktave/index.html?demo&nostart');
    const r = await page.evaluate(() => {
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, B = BW.BLOCKS, ID = BW.ID;
      const same = (a, b) => a.b.length === b.b.length && a.b.every((v, i) => v === b.b[i]);
      const out = {same: [], differ: same(BW.generate(1, R), BW.generate(2, R)), worlds: []};
      for (const seed of [1, 7, 42, 2026, 99999]) {
        const a = BW.generate(seed, R), b = BW.generate(seed, R);
        out.same.push(same(a, b) && JSON.stringify(a.spawn) === JSON.stringify(b.spawn));
        const has = (key, bi) => { for (let i = 0; i < a.b.length; i++) if (a.b[i] === ID[key] && (!bi || BW.biomeOf(R, i % a.w).id === bi)) return true; return false; };
        let peaks = 0, depths = 0;
        for (let i = 0; i < a.b.length; i++) { const y = Math.floor(i / a.w), v = a.b[i]; if (y < R.world.peaksY && B[v].solid) peaks++; if (y >= R.world.deepY && v !== ID.bedrock) depths++; }
        out.worlds.push({marsh: has('reed', 'marsh') && (has('cork', 'marsh') || has('maple', 'marsh')) && has('water', 'marsh'),
          brass: has('brassOre', 'brass') && has('springVein', 'brass'), canyon: has('clay', 'canyon') && has('rhythmRock', 'canyon'),
          peaks, depths, ores: ['toneOre', 'scaleVein', 'sustain', 'restCrystal'].every(k => has(k)),
          zones: [BW.zone(a, 10, 30, R).biome, BW.zone(a, 120, 30, R).biome, BW.zone(a, 220, 30, R).biome, BW.zone(a, 10, R.world.deepY + 2, R).layer]});
      }
      return out;
    });
    expect(r.same, 'a seed always makes the same world').toEqual([true, true, true, true, true]);
    expect(r.differ, 'two seeds make different worlds').toBe(false);
    r.worlds.forEach(w => {
      expect(w.marsh && w.brass && w.canyon, `the three biomes have their materials: ${JSON.stringify(w)}`).toBe(true);
      expect(w.peaks, 'the Treble Peaks: mountain tops above the peaks row').toBeGreaterThan(8);
      expect(w.depths, 'the Bass Depths').toBeGreaterThan(500);
      expect(w.ores).toBe(true);
      expect(w.zones).toEqual(['marsh', 'brass', 'canyon', 'depths']);
    });
  });

  test('save → reload = the same world; the world file round-trips; the Backup Code never carries the world', async ({page}) => {
    const watch = await enter(page);
    // change the world a little: dig, build, move
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y);
      d.mine(x + 1, y); d.place(x - 1, y - 1, 'planks'); d.give('reed', 3); });
    // the pause menu saves it
    await page.locator('#uiPauseBtn').click();
    await expect(page.locator('#uiPause')).toBeVisible();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem(Arcade.Blocktave.key)));
    expect(before.v).toBe(1);
    expect(before.chunks.length).toBe(16);                                // 256 columns in chunks of 16, run-length encoded
    expect(before.player.inv.reed).toBe(3);
    // SAVE WORLD TO FILE
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#btSaveFile').click()]);
    expect(dl.suggestedFilename()).toBe('blocktave-world.json');
    const file = await dl.path(), text = require('fs').readFileSync(file, 'utf8');
    const saved = JSON.parse(text);
    expect(saved.game).toBe('blocktave');
    expect(saved.chunks).toEqual(before.chunks);
    // reload: the same world comes back
    await page.reload();
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    await into(page);
    const again = await page.evaluate(() => JSON.parse(Arcade.Blocktave.worldJSON()));
    expect(again.chunks, 'the reloaded world').toEqual(before.chunks);
    expect(again.seed).toBe(before.seed);
    expect((await st(page)).inv.reed).toBe(3);
    // change it, then LOAD WORLD FILE brings the saved one back (after asking)
    await page.evaluate(() => { const w = Arcade.Blocktave.world(); for (let x = 0; x < 40; x++) Arcade.Blocktave.demo.put(x, 60, 'brick'); });
    expect((await page.evaluate(() => JSON.parse(Arcade.Blocktave.worldJSON()))).chunks).not.toEqual(before.chunks);
    await page.locator('#uiPauseBtn').click();
    await page.locator('#worldFile').setInputFiles(file);
    await page.locator('#uiConfirm [data-act=yes]').click();
    await page.waitForFunction(c => JSON.stringify(JSON.parse(Arcade.Blocktave.worldJSON()).chunks) === c, JSON.stringify(before.chunks));
    // THE BACKUP CODE: the store never holds the world, and saving the world never changes the code's size
    await page.addScriptTag({url: '../shared/backup.js'});
    const b = await page.evaluate(async () => {
      const a1 = JSON.stringify(Arcade.store.exportAll()), c1 = await Arcade.Backup.fullEncode();
      for (let x = 0; x < 256; x++) for (let y = 40; y < 90; y += 3) Arcade.Blocktave.demo.put(x, y, 'glass');
      Arcade.Blocktave.save();
      const a2 = JSON.stringify(Arcade.store.exportAll()), c2 = await Arcade.Backup.fullEncode();
      return {same: a1 === a2, chunks: /chunks|"b":\[/.test(a2), len1: c1.length, len2: c2.length, world: localStorage.getItem(Arcade.Blocktave.key).length};
    });
    expect(b.same, 'saving the world leaves the backed-up store alone').toBe(true);
    expect(b.chunks, 'the Backup Code has no world in it').toBe(false);
    expect(Math.abs(b.len1 - b.len2), 'the Backup Code keeps its size').toBeLessThanOrEqual(2);
    expect(b.world).toBeGreaterThan(b.len2);
    watch.check();
  });
});

test.describe('Blocktave: mining = playing', () => {
  test('INSTRUMENT: Tone Ore breaks on the right note (Pitch.demoNote) and drops 2×; a wrong note keeps it', async ({page}) => {
    const watch = await enter(page, {mode: 'inst'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));     // the Brass Mallet: Tone Ore asks one note
    let t = await nextTo(page, 'toneOre');
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening()), {message: 'the microphone listens while the card is open'}).toBe(true);
    // a wrong note: the card shakes, the block stays
    await page.evaluate(() => { Arcade.Pitch.demoNote = Arcade.BlocktaveCard.current.want().sounding + 2; });
    await expect(page.locator('.bt-card.bad')).toBeVisible();
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    await waitCardGone(page);
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), t)).toBe('toneOre');
    expect((await st(page)).inv.tone || 0).toBe(0);
    // the right note
    await page.waitForTimeout(400);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    await page.evaluate(() => { Arcade.Pitch.demoNote = Arcade.BlocktaveCard.current.want().sounding; });
    await waitCardGone(page);
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), t)).toBe('air');
    expect((await st(page)).inv.tone, 'INSTRUMENT mode drops 2×').toBe(2);
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening()), {message: 'the microphone stops listening after'}).toBe(false);
    watch.check();
  });

  test('TOUCH: Tone Ore breaks on the right letter and drops 1×; a wrong letter keeps it', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
    const t = await nextTo(page, 'toneOre');
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    const want = await page.evaluate(() => Arcade.BlocktaveCard.current.want().n);
    const wrong = want.letter === 'A' ? 'B' : 'A';
    await page.locator(`.bt-card .apad-letter[data-letter="${wrong}"]`).dispatchEvent('pointerdown');
    await expect(page.locator('.bt-card.bad')).toBeVisible();
    await waitCardGone(page);
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), t)).toBe('toneOre');
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    const n = await page.evaluate(() => Arcade.BlocktaveCard.current.want().n);
    if (n.acc) await page.locator(`.bt-card .apad-acc[data-acc="${n.acc}"]`).dispatchEvent('pointerdown');
    await page.locator(`.bt-card .apad-letter[data-letter="${n.letter}"]`).dispatchEvent('pointerdown');
    await waitCardGone(page);
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), t)).toBe('air');
    expect((await st(page)).inv.tone, 'TOUCH mode drops 1×').toBe(1);
    watch.check();
  });

  test('three wrong answers in a row show the note name as a hint', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
    const t = await nextTo(page, 'toneOre');
    for (let k = 0; k < 3; k++) {
      await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
      expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().hint), `wrong answers so far: ${k}`).toBe(false);
      const w = await page.evaluate(() => Arcade.BlocktaveCard.current.want().n.letter);
      await page.locator(`.bt-card .apad-letter[data-letter="${w === 'A' ? 'B' : 'A'}"]`).dispatchEvent('pointerdown');
      await waitCardGone(page);
    }
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().hint)).toBe(true);
    await expect(page.locator('.bt-card .ncap').first()).toBeVisible();
  });

  for (const mode of ['inst', 'touch']) {
    test(`SNARE DRUM (${mode === 'inst' ? 'instrument' : 'touch'} mode): every block type is mineable`, async ({page}) => {
      test.setTimeout(240_000);
      const watch = await enter(page, {member: 'snare', mode});
      await page.evaluate(() => Arcade.Blocktave.demo.give('baton', 1));
      const kinds = await page.evaluate(() => Arcade.BlocktaveWorld.BLOCKS.filter(b => b.mine).map(b => b.key));
      expect(kinds).toEqual(expect.arrayContaining(['toneOre', 'brassOre', 'scaleVein', 'springVein', 'sustain', 'rhythmRock', 'restCrystal', 'dirt', 'slate']));
      const got = {};
      for (const k of kinds) {
        const at = await putBeside(page, k);
        await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), at);
        if (await cardOpen(page)) {
          got[k] = (await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind));
          await page.evaluate(() => Arcade.Blocktave.demo.answer());
          await waitCardGone(page);
        }
        expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), at), `${k} was mined`).toMatch(/^(air)$/);
      }
      // the snare's cards: counts, rhythms and even rolls (never notes)
      expect(Object.values(got).every(kind => ['count', 'rhythm', 'rest', 'roll'].includes(kind)), JSON.stringify(got)).toBe(true);
      expect(got.toneOre).toBe('count');
      expect(got.sustain).toBe('roll');
      watch.check();
    });
  }
});

test.describe('Blocktave: crafting = performing', () => {
  test('the order in the Measure matters; a passed performance makes the item; a failed one keeps the ingredients', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('planks', 2); d.give('cork', 1); });
    await page.locator('#craftBtn').click();
    await expect(page.locator('#craft')).toBeVisible();
    const add = id => page.locator(`#craftItems .bt-chip[data-id="${id}"]`).click();
    // the wrong order: cork, planks, planks is no recipe
    await add('cork'); await add('planks'); await add('planks');
    await expect(page.locator('#recipeLine')).not.toHaveClass(/on/);
    await expect(page.locator('#perform')).toBeHidden();
    // clear the measure (tap each slot), then the right order: planks, planks, cork = the Wooden Mallet
    for (let k = 0; k < 3; k++) await page.locator('#measure .bt-slot.full').first().click();
    await add('planks'); await add('planks'); await add('cork');
    await expect(page.locator('#recipeLine')).toHaveClass(/on/);
    await expect(page.locator('#recipeLine')).toContainText('Wooden Mallet');
    // a FAILED performance: the ingredients stay
    await page.locator('#perform').click();
    const n = await page.evaluate(() => Arcade.BlocktaveCard.current.want().n);
    await page.locator(`.bt-card .apad-letter[data-letter="${n.letter === 'A' ? 'B' : 'A'}"]`).dispatchEvent('pointerdown');
    await waitCardGone(page);
    let inv = (await st(page)).inv;
    expect([inv.planks, inv.cork, inv.mallet1 || 0]).toEqual([2, 1, 0]);
    // a PASSED performance: the item is made, the ingredients used
    await page.locator('#perform').click();
    await page.evaluate(() => Arcade.Blocktave.demo.answer());
    await waitCardGone(page);
    inv = (await st(page)).inv;
    expect([inv.planks || 0, inv.cork || 0, inv.mallet1]).toEqual([0, 0, 1]);
    // the Recipe Book knows it
    await page.locator('#bookBtn').click();
    await expect(page.locator('#book .bt-rec[data-id="wooden-mallet"]')).toBeVisible();
    await expect(page.locator('#book .bt-rec.unknown').first()).toBeVisible();
    watch.check();
  });
});

test.describe('Blocktave: building', () => {
  test('a Composer row of 8 with a Conductor\'s Podium: perform it and the row powers up and opens its door', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    // a flat floor: 8 Composer Blocks in a row, the podium at its right end, a door beside the podium
    const r = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, w = Arcade.Blocktave.world(), x0 = Math.floor(w.spawn.x) - 4, y = Math.floor(w.spawn.y) - 2;
      for (let x = x0 - 2; x <= x0 + 12; x++) { for (let yy = y - 4; yy <= y; yy++) d.put(x, yy, 'air'); d.put(x, y + 1, 'slate'); }
      d.tp(x0 + 5, y - 1);
      for (let k = 0; k < 8; k++) { d.put(x0 + k, y, 'air'); d.place(x0 + k, y, 'composer'); }
      d.place(x0 + 8, y, 'podium'); d.put(x0 + 9, y, 'door'); d.put(x0 + 9, y - 1, 'door');
      return {x0, y};
    });
    expect(await page.evaluate(({x0, y}) => [0, 1, 2, 3, 4, 5, 6, 7].map(k => Arcade.Blocktave.demo.at(x0 + k, y)), r)).toEqual(new Array(8).fill('composer'));
    // one block's note, picked in BUILD mode
    await page.evaluate(({x0, y}) => Arcade.Blocktave.demo.act(x0 + 2, y, true), r);
    await expect(page.locator('#composer')).toBeVisible();
    await page.locator('#compActs [data-d="1"]').click();
    await page.locator('#compDone').click();
    // the podium: the melody, PERFORM
    await page.evaluate(({x0, y}) => Arcade.Blocktave.demo.act(x0 + 8, y, true), r);
    await expect(page.locator('#compTitle')).toContainText('8 notes');
    await page.locator('#compPerf').click();
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('notes');
    await page.evaluate(() => Arcade.Blocktave.demo.answer());
    await waitCardGone(page);
    const out = await page.evaluate(({x0, y}) => { const w = Arcade.Blocktave.world(); return {powered: [0, 1, 2, 3, 4, 5, 6, 7].every(k => (w.meta[(x0 + k) + ',' + y] || {}).powered),
      door: Arcade.Blocktave.demo.at(x0 + 9, y), star: Arcade.store.level('blocktave', 'trumpet', 5).stars}; }, r);
    expect(out).toEqual({powered: true, door: 'doorOpen', star: 1});
    watch.check();
  });

  test('the Band Hall: bricks, a door, a Stage Floor, a Stage Lamp and a Music Stand', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const got = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, w = Arcade.Blocktave.world(), x0 = Math.floor(w.spawn.x) - 5, y0 = Math.floor(w.spawn.y) - 5;   // the room: x0..x0+7, y0..y0+3
      for (let x = x0 - 1; x <= x0 + 8; x++) for (let y = y0 - 1; y <= y0 + 4; y++) {
        const edge = x === x0 - 1 || x === x0 + 8 || y === y0 - 1 || y === y0 + 4;
        d.put(x, y, !edge ? 'air' : y === y0 + 4 ? 'stage' : 'brick');
      }
      d.put(x0 + 8, y0 + 3, 'door'); d.put(x0 + 8, y0 + 2, 'door');
      d.put(x0 + 1, y0 + 3, 'lamp');
      d.tp(x0 + 4, y0 + 3);
      const before = Arcade.store.level('blocktave', 'trumpet', 5).stars;
      d.place(x0 + 5, y0 + 3, 'stand');
      return [before, Arcade.store.gameData('blocktave').ms.trumpet.hall ? 1 : 0];
    });
    expect(got).toEqual([0, 1]);
  });
});

test.describe('Blocktave: creatures', () => {
  test('nothing appears in light or inside a closed room with a door', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES, w = B.world();
      d.time(R.dayS + 30);                                               // night
      d.shelter();                                                       // a 3 × 2 room with a door at the spawn
      const x0 = Math.floor(w.spawn.x) - 1, y = Math.floor(w.spawn.y) + 1, inRoom = d.canSpawnAt(x0 + 1, y - 1);
      d.put(x0 + 3, y - 1, 'air'); d.put(x0 + 3, y - 2, 'air');          // the door taken out: the same spot is open
      const openRoom = d.canSpawnAt(x0 + 1, y - 1);
      // a dark spot out in the open, then a Stage Lamp beside it
      let spot = null;
      for (let x = 20; x < 240 && !spot; x++) { const t = Arcade.BlocktaveWorld.top(w, x), yy = t - 1; if (Math.abs(x - B.state().player.x) > 12 && d.canSpawnAt(x, yy)) spot = {x, y: yy}; }
      return {inRoom, openRoom, dark: !!spot, spot};
    });
    expect(r.inRoom, 'inside a closed room with a door').toBe(false);
    expect(r.openRoom, 'the same room with its door taken out').toBe(true);
    expect(r.dark, 'a dark spot outside at night').toBe(true);
    // the lamp: rescan the gear (placing it the real way does), then nothing within its light
    const lit = await page.evaluate(({spot}) => { const d = Arcade.Blocktave.demo; d.put(spot.x + 1, spot.y, 'air'); d.tp(spot.x - 3, spot.y); d.place(spot.x + 1, spot.y, 'lamp'); return d.canSpawnAt(spot.x, spot.y); }, r);
    expect(lit, 'next to a Stage Lamp').toBe(false);
    // and a whole night of spawning next to lamps: no creature ever inside a lamp's light
    const n = await page.evaluate(() => { const B = Arcade.Blocktave, BW = Arcade.BlocktaveWorld, d = B.demo, R = window.BT_RULES, w = B.world(), s = B.state();
      // Stage Lamps every few blocks along the ground around the player
      for (let x = Math.floor(s.player.x) - 30; x <= Math.floor(s.player.x) + 30; x += 5) { const y = BW.top(w, x) - 1; if (d.at(x, y) === 'air') d.put(x, y, 'lamp'); }
      d.tp(Math.floor(s.player.x), BW.top(w, Math.floor(s.player.x)) - 1); d.place(Math.floor(s.player.x) + 1, BW.top(w, Math.floor(s.player.x) + 1) - 1, 'lamp');
      const lamps = []; for (let i = 0; i < w.b.length; i++) if (w.b[i] === BW.ID.lamp) lamps.push({x: i % w.w + .5, y: Math.floor(i / w.w) + .5});
      for (let k = 0; k < 400; k++) d.spawnCheck();
      const cs = B.state().creatures;
      return {all: cs.length, lit: cs.filter(c => BW.light(w, Math.floor(c.x), Math.floor(c.y - .5), R.light.nightSky, lamps, R) >= R.light.dark).length}; });
    expect(n.all, 'creatures did come out in the dark').toBeGreaterThan(0);
    expect(n.lit, 'none in a lamp\'s light').toBe(0);
  });

  test('INSTRUMENT: playing a Night Clam\'s note calms it (a Pearl, 2×)', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { Arcade.Blocktave.demo.time(window.BT_RULES.dayS + 30); Arcade.Blocktave.demo.spawn('clam', 4); });
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening()), {message: 'a creature near: the microphone listens'}).toBe(true);
    await page.evaluate(() => { Arcade.Pitch.demoNote = Arcade.Blocktave.state().creatures[0].sounding; });
    await expect.poll(() => page.evaluate(() => (Arcade.Blocktave.state().creatures[0] || {state: 'gone'}).state), {timeout: 8000}).not.toBe('live');
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    expect((await st(page)).inv.pearl).toBe(2);
  });

  test('creatures freeze while a sound mutes the microphone', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { Arcade.Blocktave.demo.time(window.BT_RULES.dayS + 30); Arcade.Blocktave.demo.spawn('wisp', 6); });
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening())).toBe(true);
    const pos = () => page.evaluate(() => { const c = Arcade.Blocktave.state().creatures[0]; return [c.x, c.y]; });
    await page.evaluate(() => Arcade.Pitch.suppress(1800));
    await page.waitForTimeout(100);
    const a = await pos();
    await page.waitForTimeout(1000);
    const b = await pos();
    expect(b, 'frozen during the mute').toEqual(a);
    await page.waitForTimeout(1500);
    const c = await pos();
    expect(Math.hypot(c[0] - a[0], c[1] - a[1]), 'moving again after it').toBeGreaterThan(.1);
  });

  test('a Rusher\'s speed fits its challenge (the fairness check)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES; d.time(R.dayS + 30); d.spawn('rusher', 14);
      const c = Arcade.Blocktave.state().creatures[0], b = 60 / R.rhythm.bpm, need = R.rhythm.leadS + R.rusher.beats * 2 * b + R.rhythm.lateMs / 1000;
      return {speed: R.rusher.speed * c.mul, reach: R.rusher.alert / (R.rusher.speed * c.mul), need: need * R.fair.margin}; });
    expect(r.reach, 'seconds to reach you from where it charges ≥ its challenge × the margin').toBeGreaterThanOrEqual(r.need - 1e-6);
  });

  test('losing all hearts: back at the Practice Cot, 25 % of the materials in a bag, tools kept', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    const cot = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, s = B.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      d.put(x, y, 'air'); d.put(x, y + 1, 'dirt'); d.place(x, y, 'cot'); d.act(x, y, true); return {x, y}; });
    expect((await st(page)).cot).toEqual(cot);
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('dirt', 8); d.give('reed', 4); d.give('mallet1', 1); d.tp(Math.floor(Arcade.Blocktave.state().player.x) + 20, 20); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { for (let k = 0; k < 5; k++) Arcade.Blocktave.demo.hurt(1); });
    const s = await st(page);
    expect([Math.floor(s.player.x), Math.round(s.player.y)]).toEqual([cot.x, cot.y + 1]);
    expect(s.player.hearts).toBe(5);
    expect([s.inv.dirt, s.inv.reed, s.inv.mallet1]).toEqual([6, 3, 1]);
    expect(s.bags).toBe(1);
    const bag = await page.evaluate(() => Arcade.Blocktave.world().bags[0]);
    expect(bag.items).toEqual({dirt: 2, reed: 1});
    // walking into it picks it up
    await page.evaluate(b => Arcade.Blocktave.demo.tp(Math.floor(b.x), Math.floor(b.y)), bag);
    await expect.poll(async () => (await st(page)).bags).toBe(0);
    expect((await st(page)).inv.dirt).toBe(8);
    watch.check();
  });
});

test.describe('Blocktave: stars only from milestones', () => {
  test('each milestone sets its star once; 1,000 blocks mined add none; the leaderboard hears only milestones', async ({page}) => {
    test.setTimeout(120_000);
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => {
      window.__lb = [];
      const L = Arcade.Leaderboard, orig = L.stars;
      L.stars = (game, level, gain) => { window.__lb.push([game, level, gain]); return orig(game, level, gain); };
    });
    // 1,000 blocks: none is a milestone
    await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, s = B.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      for (let k = 0; k < 1000; k++) { d.put(x, y, 'dirt'); d.mine(x, y); } });
    expect(await page.evaluate(() => Arcade.Blocktave.demo.stats().mined)).toBeGreaterThanOrEqual(1000);
    expect(await page.evaluate(() => Arcade.store.allStars('trumpet', 'blocktave'))).toBe(0);
    expect(await page.evaluate(() => window.__lb)).toEqual([]);
    // Tone Ore past the goal: ONE star for the milestone, never more
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
    for (let k = 0; k < 13; k++) {
      await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, s = B.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1; d.put(x, y, 'toneOre'); d.mine(x, y); d.answer(); });
      await waitCardGone(page);
    }
    expect(await page.evaluate(() => Arcade.store.level('blocktave', 'trumpet', 1).stars)).toBe(1);
    // every milestone twice: each chapter ends at 3 stars, 15 in all
    const ids = await page.evaluate(() => window.BT_CHAPTERS.flatMap(c => c.goals.map(g => g.id)));
    for (const id of ids.concat(ids)) { await page.evaluate(i => Arcade.Blocktave.demo.award(i), id); await page.waitForTimeout(20); }
    expect(await page.evaluate(() => [1, 2, 3, 4, 5].map(l => Arcade.store.level('blocktave', 'trumpet', l).stars))).toEqual([3, 3, 3, 3, 3]);
    expect(await page.evaluate(() => Arcade.store.allStars('trumpet', 'blocktave'))).toBe(15);
    const lb = await page.evaluate(() => window.__lb);
    expect(lb.every(([g]) => g === 'blocktave')).toBe(true);
    expect(lb.reduce((a, [, , gain]) => a + gain, 0), 'one star event per milestone').toBe(15);
    // the Encore's rewards: the Blocktave Builder hat and the Band Hall background
    expect(await page.evaluate(() => [Arcade.Avatar.isUnlocked('head', 'blocktave'), Arcade.Avatar.isUnlocked('bg', 'bandhall')])).toEqual([true, true]);
  });
});

test.describe('Blocktave: controls and layout', () => {
  for (const [name, w, h] of [['iPad landscape', 1180, 820], ['iPad portrait', 820, 1180], ['phone', 390, 844]]) {
    test(`the pad, hotbar, INVENTORY and CRAFT fit and work (${name})`, async ({page}) => {
      await page.setViewportSize({width: w, height: h});
      const watch = await enter(page, {mode: 'touch'});
      const boxes = await page.evaluate(() => ['padL', 'padR', 'padJ', 'modeBtn', 'hotbar', 'invBtn', 'craftBtn', 'uiPauseBtn'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return {id, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height}; }));
      boxes.forEach(b => {
        expect(b.l >= 0 && b.t >= 0 && b.r <= w + .5 && b.b <= h + .5, `${b.id} on screen: ${JSON.stringify(b)}`).toBe(true);
        expect(Math.min(b.w, b.h), `${b.id} big enough to tap`).toBeGreaterThanOrEqual(40);
      });
      const hit = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(hit(boxes[i], boxes[j]), `${boxes[i].id} × ${boxes[j].id}`).toBe(false);
      // ▶ held walks right; MINE/BUILD toggles
      const x0 = (await st(page)).player.x;
      await page.locator('#padR').dispatchEvent('pointerdown', {pointerId: 3});
      await page.waitForTimeout(600);
      await page.locator('#padR').dispatchEvent('pointerup', {pointerId: 3});
      expect((await st(page)).player.x).not.toBe(x0);
      await page.locator('#modeBtn').click();
      expect((await st(page)).build).toBe(true);
      await expect(page.locator('#modeBtn')).toHaveText('BUILD');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      watch.check();
    });
  }
  test('the keyboard: A/D walk, 1–6 pick a hotbar slot, E and C open the panels', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const x0 = (await st(page)).player.x;
    await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
    expect((await st(page)).player.x).toBeGreaterThan(x0);
    await page.keyboard.press('3');
    await expect(page.locator('.bt-hot[data-i="2"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('e'); await expect(page.locator('#inv')).toBeVisible();
    await page.keyboard.press('c'); await expect(page.locator('#craft')).toBeVisible(); await expect(page.locator('#inv')).toBeHidden();
  });
});

test.describe('Blocktave: performance', () => {
  test('a 60 s run at 4× CPU throttle averages at least 30 frames a second', async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium feature');
    // a frame rate only means something with the machine to itself: this runs ALONE (PERF=1, one worker: its own CI step
    // in .github/workflows/tests.yml), never beside other tests competing for the CPU
    test.skip(!process.env.PERF, 'runs alone: PERF=1 npx playwright test blocktave -g performance --project=chromium --workers=1');
    test.setTimeout(150_000);
    await page.setViewportSize({width: 1180, height: 820});
    await enter(page, {mode: 'touch'});
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    // a busy scene: night, lamps, creatures, the player walking back and forth
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES; d.time(R.dayS + 5); d.spawn('clam', 8); d.spawn('wisp', -9); });
    const f0 = (await st(page)).run;
    const until = Date.now() + 60_000;
    let dir = 'd';
    while (Date.now() < until) { await page.keyboard.down(dir); await page.waitForTimeout(3000); await page.keyboard.up(dir); dir = dir === 'd' ? 'a' : 'd'; }
    const f1 = (await st(page)).run;
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
    const fps = (f1.frames - f0.frames) / ((f1.ms - f0.ms) / 1000);
    console.log(`Blocktave at 4× CPU throttle: ${fps.toFixed(1)} fps`);
    expect(fps).toBeGreaterThanOrEqual(30);
  });
});
