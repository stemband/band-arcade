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
      for (const seed of [1, 2, 7, 8, 21, 41, 42, 2026, 99999]) {
        const a = BW.generate(seed, R), b = BW.generate(seed, R);
        out.same.push(same(a, b) && JSON.stringify(a.spawn) === JSON.stringify(b.spawn));
        const has = (key, bi) => { for (let i = 0; i < a.b.length; i++) if (a.b[i] === ID[key] && (!bi || BW.biomeOf(R, i % a.w).id === bi)) return true; return false; };
        let peaks = 0, depths = 0;
        for (let i = 0; i < a.b.length; i++) { const y = Math.floor(i / a.w), v = a.b[i]; if (y < R.world.peaksY && B[v].solid) peaks++; if (y >= R.world.deepY && v !== ID.bedrock) depths++; }
        out.worlds.push({marsh: has('reed', 'marsh') && (has('cork', 'marsh') || has('maple', 'marsh')) && has('water', 'marsh'),
          brass: has('brassOre', 'brass') && has('springVein', 'brass'), canyon: has('clay', 'canyon') && has('rhythmRock', 'canyon'),
          peaks, depths, ores: ['toneOre', 'scaleVein', 'sustain', 'restCrystal'].every(k => has(k)),
          // the first mallet's materials and the chapter's Tone Ore are always near the (dry) spawn
          start: ['cork', 'maple', 'toneOre'].every(k => { for (let i = 0; i < a.b.length; i++) if (a.b[i] === ID[k] && Math.abs(i % a.w - a.spawn.x) < 25) return true; return false; })
            && Arcade.BlocktaveWorld.top(a, a.spawn.x) <= R.world.sea,
          zones: [BW.zone(a, 10, 30, R).biome, BW.zone(a, 120, 30, R).biome, BW.zone(a, 220, 30, R).biome, BW.zone(a, 10, R.world.deepY + 2, R).layer]});
      }
      return out;
    });
    expect(r.same, 'a seed always makes the same world').toEqual(new Array(9).fill(true));
    expect(r.differ, 'two seeds make different worlds').toBe(false);
    r.worlds.forEach(w => {
      expect(w.marsh && w.brass && w.canyon, `the three biomes have their materials: ${JSON.stringify(w)}`).toBe(true);
      expect(w.peaks, 'the Treble Peaks: mountain tops above the peaks row').toBeGreaterThan(8);
      expect(w.depths, 'the Bass Depths').toBeGreaterThan(500);
      expect(w.ores).toBe(true);
      expect(w.start, 'Cork, Maple and Tone Ore near a dry spawn').toBe(true);
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
    expect(before.v).toBe(2);                                             // v 2: the world's drops are saved too
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
    // (the code carries its making time, so its compressed length can wobble by a few letters: never by a world's worth)
    expect(Math.abs(b.len1 - b.len2), 'the Backup Code keeps its size').toBeLessThanOrEqual(12);
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
    // the loot pops out of the block and lands beside you: picked up within rules.js pickupRadius
    await expect.poll(async () => (await st(page)).inv.tone || 0, {message: 'INSTRUMENT mode drops 2×'}).toBe(2);
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
    await expect.poll(async () => (await st(page)).inv.tone || 0, {message: 'TOUCH mode drops 1×'}).toBe(1);
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
    await expect(page.locator('#recipeLine')).not.toHaveClass(/\bon\b/);
    await expect(page.locator('#perform'), 'MAKE IT waits for a recipe').toBeDisabled();
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
    // the Pearls drop into the world where it was (2: INSTRUMENT mode) and come to you once you're close
    const drops = (await st(page)).drops.filter(d => d.item === 'pearl');
    expect(drops.reduce((a, d) => a + d.n, 0)).toBe(2);
    await page.evaluate(d => Arcade.Blocktave.demo.tp(Math.floor(d.x), Math.floor(d.y)), drops[0]);
    await expect.poll(async () => (await st(page)).inv.pearl || 0).toBe(2);
  });

  test('creatures freeze while a sound mutes the microphone', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y);
      for (let dx = 1; dx <= 7; dx++) for (let dy = -3; dy <= -1; dy++) d.put(x + dx, y + dy, 'air');   // open air between it and you
      d.time(window.BT_RULES.dayS + 30); d.spawn('wisp', 6); });
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
    const bd = (await st(page)).backdrop;
    console.log(`Blocktave at 4× CPU throttle: ${fps.toFixed(1)} fps (backdrop layers: ${bd.layers.join(', ')})`);
    expect(fps).toBeGreaterThanOrEqual(30);
    expect(bd.low, 'the full parallax backdrop stayed within the frame budget (never dropped to the far layer)').toBe(false);
  });
});

const R_NEAR = 16 + 8;   // rules.js starterRange + starter.oreDepth
test.describe('Blocktave: every world can finish chapter 1', () => {
  test('the starter check passes on 500 seeds (trees on dry ground, Tone Ore close under the ground)', async ({page}) => {
    test.setTimeout(120_000);
    await prepare(page, {store: store('trumpet', 'touch')});
    await page.goto('blocktave/index.html?demo&nostart');
    const bad = await page.evaluate(() => {
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, out = [];
      for (let k = 0; k < 500; k++) { const seed = (k * 2654435761 + 97) >>> 0, w = BW.generate(seed, R), c = BW.starter(w, w, R); if (!c.ok) out.push([seed, c]); }
      return out;
    });
    expect(bad, 'seeds missing chapter 1 materials near the spawn').toEqual([]);
  });

  // 20 random seeds, 5 per test: each test is its own page (a quarter of the world loads per page: one 20-load page ran
  // ~8 minutes in WebKit and its process could crash), and the four run side by side
  const SEEDS = Array.from({length: 20}, (_, k) => (k * 40503 + 1234567) >>> 0);
  for (let part = 0; part < 4; part++) test(`chapter 1 end to end on random seeds ${part * 5 + 1}–${part * 5 + 5} of 20: Maple → planks → mallet → 10 Tone Ore → a shelter with a door`, async ({page}) => {
    test.setTimeout(300_000);
    const seeds = SEEDS.slice(part * 5, part * 5 + 5);
    const watch = await prepare(page, {store: store('trumpet', 'touch')});
    for (const seed of seeds) {
      await page.goto(`blocktave/index.html?demo&nostart&seed=${seed}`);
      await page.locator('.ls-card:not(.ls-endless)').first().click();
      await page.locator('.ls-start').click();
      await into(page);
      const craft = async id => { await page.evaluate(i => Arcade.Blocktave.demo.craft(i), id); await page.evaluate(() => Arcade.Blocktave.demo.answer()); await waitCardGone(page); };
      /** mine the nearest block of this kind to the SPAWN; it must be within the starter range and dry/shallow */
      const mineNear = async key => {
        const t = await page.evaluate(k => { const B = Arcade.Blocktave, d = B.demo, w = B.world(), R = window.BT_RULES;
          const t = d.find(k, w.spawn); d.standBy(t.x, t.y); d.mine(t.x, t.y); d.answer(); return {d: Math.hypot(t.x - w.spawn.x, t.y - w.spawn.y), x: t.x, y: t.y}; }, key);
        expect(t.d, `seed ${seed}: ${key} near the spawn`).toBeLessThanOrEqual(R_NEAR);
        await waitCardGone(page);
        await page.waitForFunction(() => !Arcade.Blocktave.state().drops.length, null, {timeout: 8000});   // the loot lands beside you: picked up
        return t;
      };
      await mineNear('maple'); await craft('maple-planks');
      await mineNear('cork'); await craft('wooden-mallet');
      expect((await st(page)).inv.mallet1, `seed ${seed}: the mallet`).toBe(1);
      for (let k = 0; k < 10; k++) await mineNear('toneOre');
      await mineNear('maple'); await craft('maple-planks'); await craft('door');
      expect((await st(page)).inv.door, `seed ${seed}: a door`).toBe(1);
      await page.evaluate(() => Arcade.Blocktave.demo.shelter());
      await page.waitForTimeout(400);
      const ms = await page.evaluate(() => ['mallet', 'ore10', 'shelter'].map(id => !!((Arcade.store.gameData('blocktave').ms || {}).trumpet || {})[id]));
      expect(ms, `seed ${seed}: chapter 1's three milestones`).toEqual([true, true, true]);
      await page.evaluate(() => { Arcade.Blocktave.showHub(); localStorage.clear(); });   // (the hub first: leaving the world saves it)
    }
    watch.check();
  });

  test('an older saved world without Cork is repaired ONCE, only in untouched ground; the player\'s blocks stay', async ({page}) => {
    await prepare(page, {store: store('trumpet', 'touch')});
    await page.goto('blocktave/index.html?demo&nostart');
    const info = await page.evaluate(() => {
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, ID = BW.ID;
      let seed = 1, w;
      for (; seed < 500; seed++) { w = BW.generate(seed, R, 1); if (BW.starter(w, BW.generate(seed, R, 1), R).cork < R.starter.cork) break; }
      w.repaired = 0;
      // the player's work: a plank wall and a dug hole near the spawn
      const sx = w.spawn.x, mine = [];
      for (let dx = 3; dx <= 8; dx++) { const x = sx + dx, g = BW.top(w, x); BW.put(w, x, g - 1, ID.planks); mine.push([x, g - 1, ID.planks]); }
      for (let dx = -8; dx <= -3; dx++) { const x = sx + dx, g = BW.top(w, x); BW.put(w, x, g, ID.air); mine.push([x, g, ID.air]); }
      delete w.tops;
      localStorage.setItem(Arcade.Blocktave.key, JSON.stringify(BW.encode(w)));
      return {seed, mine};
    });
    await page.evaluate(() => { window.__toasts = []; });
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.evaluate(() => { const t = Arcade.UI.toast; Arcade.UI.toast = (s, o) => { (window.__toasts = window.__toasts || []).push(s); return t(s, o); }; });
    await page.locator('.ls-start').click();
    await into(page);
    await page.waitForTimeout(900);
    const r = await page.evaluate(m => { const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, w = Arcade.Blocktave.world();
      const saved = BW.decode(JSON.parse(localStorage.getItem(Arcade.Blocktave.key)));
      return {ok: BW.starter(w, BW.generate(w.seed, R, 1), R).ok, kept: m.every(([x, y, v]) => BW.at(w, x, y) === v), repaired: saved.repaired, gen: saved.gen, toasts: window.__toasts}; }, info.mine);
    expect(r.ok, `seed ${info.seed}: the starter check passes after the repair`).toBe(true);
    expect(r.kept, 'the player\'s blocks and holes are untouched').toBe(true);
    expect([r.repaired, r.gen]).toEqual([1, 1]);
    expect(r.toasts).toContain('New trees have grown near your camp!');
    // once: loading again changes nothing and says nothing
    const again = await page.evaluate(() => { const BW = Arcade.BlocktaveWorld, w = BW.decode(JSON.parse(localStorage.getItem(Arcade.Blocktave.key))); return BW.repair(w); });
    expect(again).toBe(null);
  });
});

test.describe('Blocktave: findable first steps and bonus milestones', () => {
  test('the goals panel\'s "How?" hint, the Recipe Book\'s first recipes, and the Tone Ore card without a mallet', async ({page}) => {
    const seen = Object.assign({}, SEEN);
    await enter(page, {mode: 'touch', extra: {gameData: {blocktave: {mode: 'touch', seen}}}});
    await expect(page.locator('#goals .bt-how')).toContainText('Tap a Maple Trunk to collect Maple');
    await page.evaluate(() => Arcade.Blocktave.demo.award('mallet'));
    await expect(page.locator('#goals .bt-how')).toContainText('Dig down near camp');
    // the Recipe Book: Maple Planks, Wooden Mallet and Door with their ingredients, found or not
    await page.locator('#craftBtn').click(); await page.locator('#bookBtn').click();
    for (const id of ['maple-planks', 'wooden-mallet', 'door']) await expect(page.locator(`#book .bt-rec[data-id="${id}"] .ins img`).first()).toBeVisible();
    await page.locator('#craftClose').click();
    // Tone Ore with no mallet: a first-time card
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1; d.put(x, y, 'toneOre'); d.mine(x, y); });
    await expect(page.locator('#intro')).toContainText('Planks, Planks, Cork');
  });

  test('a later chapter\'s milestone is a BONUS; its chapter\'s results wait until the player reaches it', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { window.__toasts = []; const t = Arcade.UI.toast; Arcade.UI.toast = (s, o) => { window.__toasts.push(s); return t(s, o); }; });
    for (const id of ['lamp', 'night', 'clams']) await page.evaluate(i => Arcade.Blocktave.demo.award(i), id);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => window.__toasts)).toContain('★ Bonus milestone (Chapter 2): Place a Stage Lamp!');
    await expect(page.locator('#results')).toBeHidden();
    await expect(page.locator('#goals')).toContainText('Chapter 1');
    await expect(page.locator('#goals .bt-bonus')).toHaveText('+ 3 milestones already done in later chapters');
    // chapter 1 done: its results, then (KEEP BUILDING) chapter 2's, reached at last
    for (const id of ['mallet', 'ore10', 'shelter']) await page.evaluate(i => Arcade.Blocktave.demo.award(i), id);
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#results')).toContainText('First Steps: complete!');
    await page.locator('#resRetry').click();
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#results')).toContainText('First Night: complete!');
    await page.locator('#resRetry').click();
    await expect(page.locator('#goals')).toContainText('Chapter 3');
    // back on the chapter select: it starts on Chapter 3; a later chapter done early says so
    await page.evaluate(() => Arcade.Blocktave.demo.award('deep'));
    await page.evaluate(() => { ['sustain', 'wisps'].forEach(i => Arcade.Blocktave.demo.award(i)); });
    await page.evaluate(() => Arcade.Blocktave.showHub());
    await expect(page.locator('.ls-card.ls-sel')).toContainText('Chapter 3');
    await expect(page.locator('.bt-ch[data-l="4"] .foot')).toContainText('Complete · finished early');
    await expect(page.locator('.bt-ch[data-l="1"] .foot')).toContainText('Complete');
    await expect(page.locator('.bt-ch[data-l="1"] .foot')).not.toContainText('early');
  });

  for (const [name, w, h] of [['iPad landscape', 1180, 820], ['iPad portrait', 820, 1180], ['Chromebook', 1366, 768], ['phone', 390, 844]]) {
    test(`the chapter cards hold their goals (${name})`, async ({page}) => {
      await page.setViewportSize({width: w, height: h});
      await prepare(page, {store: store('trumpet', 'touch')});
      await page.goto('blocktave/index.html?demo&nostart');
      await page.waitForSelector('.bt-ch');
      const r = await page.evaluate(() => [...document.querySelectorAll('.bt-ch')].map(c => {
        const b = c.getBoundingClientRect(), box = e => { const r = e.getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom}; };
        return {card: {l: b.left, t: b.top, r: b.right, b: b.bottom}, lines: [...c.querySelectorAll('.bt-card-goals li')].map(box), foot: box(c.querySelector('.foot')),
          list: box(c.querySelector('.bt-card-goals'))};
      }));
      const inside = (a, c) => a.l >= c.l - .5 && a.r <= c.r + .5 && a.t >= c.t - .5 && a.b <= c.b + .5;
      const hit = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
      r.forEach((c, i) => {
        expect(c.lines.length).toBe(3);
        c.lines.forEach(l => expect(inside(l, c.card), `chapter ${i + 1}: a goal line inside its card`).toBe(true));
        expect(c.foot.b <= c.list.t + .5, `chapter ${i + 1}: the stars line above the list`).toBe(true);
        r.forEach((d, j) => { if (j > i) expect(hit(c.card, d.card), `cards ${i + 1} × ${j + 1}`).toBe(false); });
      });
    });
  }
});

/** a flat test floor around the player: slate at row y0, 4 rows of air above it, 12 tiles each side */
const flat = page => page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x0 = Math.floor(s.player.x), y0 = Math.floor(s.player.y) + 1;
  for (let x = x0 - 12; x <= x0 + 12; x++) { d.put(x, y0, 'slate'); for (let y = y0 - 5; y < y0; y++) d.put(x, y, 'air'); }
  d.tp(x0, y0 - 1); return {x0, y0}; });

test.describe('Blocktave: pickup labels and tooltips', () => {
  test('"+1 Maple" labels: the item and its count, merged within pickupMergeMs, at most 4, and read out for screen readers', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { window.__said = []; new MutationObserver(() => window.__said.push(document.getElementById('btLive').textContent)).observe(document.getElementById('btLive'), {childList: true, characterData: true, subtree: true}); });
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('maple', 1); d.give('maple', 2); d.give('planks', 4); });
    expect((await st(page)).labels).toEqual(['+3 Maple', '+4 Maple Planks']);
    await page.evaluate(() => ['cork', 'reed', 'sand', 'felt'].forEach(k => Arcade.Blocktave.demo.give(k, 1)));
    expect((await st(page)).labels.length, 'at most 4 on screen').toBe(4);
    await expect.poll(() => page.evaluate(() => window.__said.join(' | ')), {message: 'the words for screen readers', timeout: 5000}).toContain('+2 Maple');
    expect(await page.evaluate(() => window.__said.length), 'gathered, never one per item').toBeLessThanOrEqual(3);
    await expect.poll(async () => (await st(page)).labels.length, {message: 'they fade out after pickupLabelMs'}).toBe(0);
  });

  test('INSTRUMENT mode\'s bonus is in the label\'s number: "+2 Tone Shard"', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
    const t = await nextTo(page, 'toneOre');
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    await page.evaluate(() => { Arcade.Pitch.demoNote = Arcade.BlocktaveCard.current.want().sounding; });
    await waitCardGone(page);
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    await expect.poll(async () => (await st(page)).labels).toContain('+2 Tone Shard');
  });

  test('a tooltip on hover, on keyboard focus and on a long-press; a normal tap still picks the item', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('cork', 2); d.give('sand', 1); d.give('mallet1', 1); });
    // the hotbar: hover
    const slot = page.locator('.bt-hot[data-item="cork"]');
    await slot.hover();
    await expect(page.locator('#btTip')).toBeVisible();
    await expect(page.locator('#btTip')).toContainText('Cork');
    await expect(page.locator('#btTip')).toContainText('Found: Cork Trunks in the Reed Marsh');
    const [tr, sr] = await Promise.all([page.locator('#btTip').boundingBox(), slot.boundingBox()]);
    const vw = page.viewportSize();
    expect(tr.x >= 0 && tr.y >= 0 && tr.x + tr.width <= vw.width && tr.y + tr.height <= vw.height, 'on screen').toBe(true);
    expect(tr.x < sr.x + sr.width && tr.x + tr.width > sr.x && tr.y < sr.y + sr.height && tr.y + tr.height > sr.y, 'never over its item').toBe(false);
    await page.mouse.move(5, 300);
    await expect(page.locator('#btTip')).toBeHidden();
    // the inventory: keyboard focus; a tool says what it mines
    await page.locator('#invBtn').click();
    await page.locator('#invGrid [data-item="mallet1"]').focus();
    await expect(page.locator('#btTip')).toContainText('Can mine:');
    await expect(page.locator('#btTip')).toContainText('Tone Ore');
    await page.locator('#invClose').click();
    // a long-press on a hotbar slot shows it, lifting hides it, and that tap picks nothing
    const sel0 = await page.evaluate(() => document.querySelector('.bt-hot.sel').dataset.i);
    const other = page.locator('.bt-hot:not(.sel)[data-item]').first();
    const b = await other.boundingBox(), at = {pointerType: 'touch', pointerId: 7, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2, isPrimary: true};
    await other.dispatchEvent('pointerdown', at);
    await page.waitForTimeout(550);
    await expect(page.locator('#btTip')).toBeVisible();
    await other.dispatchEvent('pointerup', at);
    await other.dispatchEvent('click');
    await expect(page.locator('#btTip')).toBeHidden();
    expect(await page.evaluate(() => document.querySelector('.bt-hot.sel').dataset.i), 'a long-press picks nothing').toBe(sel0);
    // a normal tap still selects
    await other.click();
    expect(await page.evaluate(() => document.querySelector('.bt-hot.sel').dataset.i)).not.toBe(sel0);
  });
});

test.describe('Blocktave: reach, the swing, the poof', () => {
  test('no dashed reach circle; a tap out of reach outlines the block and says "Too far: walk closer!" (at most every 3 s)', async ({page}) => {
    await page.addInitScript(() => { window.__dash = []; const f = CanvasRenderingContext2D.prototype.setLineDash; CanvasRenderingContext2D.prototype.setLineDash = function (a) { window.__dash.push(a.slice()); return f.call(this, a); }; });
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { window.__dash = []; });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__dash.filter(a => a.length).length), 'nothing dashed drawn while playing').toBe(0);
    const far = await page.evaluate(() => { const s = Arcade.Blocktave.state(); return {x: Math.floor(s.player.x) + 9, y: Math.floor(s.player.y) - 1}; });
    await page.evaluate(f => { Arcade.Blocktave.demo.act(f.x, f.y); Arcade.Blocktave.demo.act(f.x, f.y); }, far);
    expect((await st(page)).fx.far).toBe(true);
    await expect(page.locator('.ui-toast', {hasText: 'Too far: walk closer!'})).toHaveCount(1);
    await expect.poll(async () => (await st(page)).fx.far, {message: 'the red outline is gone after farFlashMs'}).toBe(false);
  });

  test('mining swings the tool and chips fly; a calmed creature poofs and drops its item; none of it with reduced motion', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1; d.give('mallet1', 1); d.put(x, y, 'dirt'); d.mine(x, y); });
    let fx = (await st(page)).fx;
    expect([fx.swings, fx.chips, fx.swing]).toEqual([1, 1, true]);
    await expect.poll(async () => (await st(page)).fx.swing, {message: 'a swing lasts swingMs'}).toBe(false);
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 5); });
    await page.evaluate(i => Arcade.Blocktave.demo.calm(i), id);
    fx = (await st(page)).fx;
    expect([fx.poofs, fx.poofing]).toEqual([1, 1]);
    expect(await page.evaluate(() => Arcade.Sfx.history.some(h => /bt-poof|bt-calm/.test(h.name || h))), 'the poof sound').toBe(true);
  });

  test('reduced motion: no swing, chips, poof or drifting label', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1; d.put(x, y, 'dirt'); d.mine(x, y);
      d.time(window.BT_RULES.dayS + 30); d.calm(d.spawn('clam', 5)); });
    const fx = (await st(page)).fx;
    expect([fx.rm, fx.swings || 0, fx.chips || 0, fx.poofs || 0, fx.swing]).toEqual([true, 0, 0, 0, false]);
  });
});

test.describe('Blocktave: THE MEASURE, a crafting station', () => {
  test('labeled slots, the result box and its performance, MAKE IT, the Recipe Book, a bench, dragging', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('planks', 3); d.give('cork', 1); d.give('spring', 1); d.give('rhythm', 1); });
    await page.locator('#craftBtn').click();
    await expect(page.locator('.bt-slotlbl')).toHaveText(['1st', '2nd', '3rd', '4th']);
    await expect(page.locator('.bt-slotcap').first()).toHaveText('Material 1');
    await expect(page.locator('#recipeLine')).toContainText('?');
    await expect(page.locator('#perform')).toBeDisabled();
    await expect(page.locator('#perform')).toHaveText('Make it');
    for (const id of ['planks', 'planks', 'cork']) await page.locator(`#craftItems [data-id="${id}"]`).click();
    await expect(page.locator('#recipeLine')).toContainText('Wooden Mallet');
    await expect(page.locator('#recipeLine')).toContainText('Tap 1 note name');
    await expect(page.locator('#perform')).toBeEnabled();
    await expect(page.locator('#measure .bt-slot.full .bt-slotx')).toHaveCount(3);
    // a filled slot's ✕ takes it out (the rest move up: planks, cork is no recipe)
    await page.locator('#measure .bt-slot.full').first().click();
    expect((await st(page)).slots).toEqual(['planks', 'cork', null, null]);
    await expect(page.locator('#perform')).toBeDisabled();
    // a recipe that needs a Luthier's Bench nearby
    await page.locator('#measure .bt-slot.full').first().click(); await page.locator('#measure .bt-slot.full').first().click();
    for (const id of ['planks', 'spring', 'rhythm']) await page.locator(`#craftItems [data-id="${id}"]`).click();
    await expect(page.locator('#recipeLine')).toContainText("Needs a Luthier's Bench nearby");
    await expect(page.locator('#perform')).toBeDisabled();
    for (let k = 0; k < 3; k++) await page.locator('#measure .bt-slot.full').first().click();
    // THE RECIPE BOOK: a recipe you have the items for fills the slots in order; one you don't shows what's missing
    await page.locator('#bookBtn').click();
    await page.locator('#book .bt-rec[data-id="door"]').click();
    expect((await st(page)).slots).toEqual(['planks', 'planks', 'planks', null]);
    await page.evaluate(() => Arcade.Blocktave.demo.fromBook('maple-planks'));
    await page.locator('#bookBtn').click();
    await page.locator('#book .bt-rec[data-id="maple-planks"]').click();
    await expect(page.locator('#book .bt-rec.missing em')).toContainText('Missing: 1 Maple');
    await page.locator('#bookBtn').click();
    // DRAG a material onto the workbench: the next empty slot
    for (let k = 0; k < 3; k++) await page.locator('#measure .bt-slot.full').first().click();
    const src = await page.locator('#craftItems [data-id="cork"]').boundingBox(), dst = await page.locator('#bench').boundingBox();
    await page.mouse.move(src.x + 20, src.y + 20); await page.mouse.down();
    await page.mouse.move(src.x + 60, src.y - 40, {steps: 5}); await page.mouse.move(dst.x + 40, dst.y + 40, {steps: 8}); await page.mouse.up();
    expect((await st(page)).slots).toEqual(['cork', null, null, null]);
  });

  for (const [name, w, h] of [['iPad landscape', 1180, 820], ['iPad portrait', 820, 1180], ['Chromebook', 1366, 768], ['phone', 390, 844]]) {
    test(`THE MEASURE fits (${name}): slots ≥ 64 px, nothing overflows`, async ({page}) => {
      await page.setViewportSize({width: w, height: h});
      await enter(page, {mode: 'touch'});
      await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('planks', 3); d.give('cork', 1); });
      await page.locator('#craftBtn').click();
      for (const id of ['planks', 'planks', 'cork']) await page.locator(`#craftItems [data-id="${id}"]`).click();
      const r = await page.evaluate(() => {
        const box = e => { const b = e.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height}; };
        const panel = document.getElementById('craft'), bench = box(document.getElementById('bench'));
        return {slots: [...document.querySelectorAll('.bt-slot')].map(box), bench, result: box(document.getElementById('recipeLine')), make: box(document.getElementById('perform')),
          over: panel.scrollWidth > panel.clientWidth + 1, panel: box(panel), page: document.documentElement.scrollWidth <= innerWidth};
      });
      const inside = (a, c) => a.l >= c.l - .5 && a.r <= c.r + .5 && a.t >= c.t - .5 && a.b <= c.b + .5;
      r.slots.forEach(s => { expect(Math.min(s.w, s.h), 'a slot ≥ 64 px').toBeGreaterThanOrEqual(64); expect(inside(s, r.bench), 'the slot on the bench').toBe(true); });
      expect(inside(r.result, r.bench) && inside(r.make, r.bench), 'the result and MAKE IT on the bench').toBe(true);
      expect(inside(r.bench, r.panel), 'the bench inside the panel').toBe(true);
      expect(r.over, 'nothing scrolls sideways in the panel').toBe(false);
      expect(r.page).toBe(true);
      for (let i = 0; i < r.slots.length; i++) for (let j = i + 1; j < r.slots.length; j++) {
        const a = r.slots[i], b = r.slots[j];
        expect(a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1, `slots ${i} × ${j}`).toBe(false);
      }
      if (w <= 760) expect(r.result.t, 'the result below the slots').toBeGreaterThan(Math.max(...r.slots.map(s => s.b)));
    });
  }
});

test.describe('Blocktave: staffs on the cards', () => {
  /* THE NOTE LAYOUT (challenges.js layoutNotes): every member, 2–8 notes (the four scales with their key signatures and the
     chromatic notes with their own accidentals), at iPad portrait / landscape and a phone: the first note's box starts
     staffLead after the clef + key signature, neighbors are ≥ 8 px apart on screen (accidentals included), every
     notehead ≥ noteMinPx tall, 2–3 notes centered; a phone wraps 8 notes onto two rows instead of shrinking them. */
  for (const [name, size] of [['iPad portrait', {width: 768, height: 1024}], ['iPad landscape', {width: 1180, height: 820}], ['phone', {width: 390, height: 844}]]) {
    test(`notes on the cards are spaced, centered and never too small: every member, 2–8 notes (${name})`, async ({page}) => {
      test.setTimeout(180_000);
      await page.setViewportSize(size);
      await enter(page, {mode: 'touch'});
      const r = await page.evaluate(async () => {
        await document.fonts.load('54px "GN Music"', '♭♯♮𝄞𝄢');        // measured with the real music font, not a fallback
        const A = Arcade, C = A.BlocktaveCard, R = window.BT_RULES, out = {bad: [], cards: 0, wrapped: 0, rowsAt8: new Set()};
        const check = what => {
          const card = document.querySelector('.bt-card'), svgs = [...card.querySelectorAll('.bt-staff svg')];
          svgs.forEach((svg, ri) => {
            const vb = svg.viewBox.baseVal, gs = [...svg.querySelectorAll('g[id^=btn]')];
            const head = Math.max(...[...svg.querySelectorAll('text:not(.head):not(.ncap)')].map(t => { const b = t.getBBox(); return b.x + b.width; }));
            const first = gs[0].getBBox();
            if (first.x - head < R.staffLead - 1) out.bad.push(`${what} row ${ri}: first note ${(first.x - head).toFixed(1)} after the key signature`);
            const rs = gs.map(g => g.getBoundingClientRect());
            for (let k = 1; k < rs.length; k++) if (rs[k].left - rs[k - 1].right < 8) out.bad.push(`${what} row ${ri}: notes ${k - 1}/${k} only ${(rs[k].left - rs[k - 1].right).toFixed(1)} px apart`);
            svg.querySelectorAll('ellipse.head').forEach(e => { const h = e.getBoundingClientRect().height; if (h < R.noteMinPx - .3) out.bad.push(`${what}: notehead ${h.toFixed(1)} px`); });
            if (svgs.length === 1 && gs.length <= 3) {
              const last = gs[gs.length - 1].getBBox(), mid = (first.x + last.x + last.width) / 2, want = (head + vb.width - 8) / 2;
              if (Math.abs(mid - want) > 9) out.bad.push(`${what}: ${gs.length} notes not centered (${mid.toFixed(0)} vs ${want.toFixed(0)})`);
            }
            const sr = svg.getBoundingClientRect();
            if (sr.right > innerWidth + .5 || sr.left < -.5) out.bad.push(`${what}: the staff leaves the screen`);
          });
          out.cards++; if (svgs.length > 1) out.wrapped++;
          return svgs.length;
        };
        for (const id of A.PLAYERS.filter(m => m !== 'snare')) {
          const mem = A.memberById(id), group = A.INSTRUMENTS.find(g => g.members && g.members.some(x => x.id === id));
          for (const notes of ['Bb', 'Eb', 'F', 'Ab', 'chrom']) {
            const seq = A.buildSequence({member: mem, group, notes, order: 'order', level: 2, count: 8});
            for (let n = 2; n <= 8; n++) {
              C.open({kind: 'notes', mode: 'touch', items: seq.items.slice(0, n), clef: group.clef, sig: seq.sig, fit: seq.fit, at: {x: 300, y: 300}});
              const rows = check(`${id} ${notes} ×${n}`);
              if (n === 8) out.rowsAt8.add(rows);
            }
          }
          C.open({kind: 'key', mode: 'touch', member: mem, clef: group.clef, ask: 'scale', scale: 'Eb', at: {x: 300, y: 300}});
          check(`${id} name this scale`);
          C.close();
        }
        out.rowsAt8 = [...out.rowsAt8];
        return out;
      });
      expect(r.bad.slice(0, 12)).toEqual([]);
      expect(r.cards).toBeGreaterThan(500);
      if (name === 'phone') expect(r.rowsAt8, 'a phone wraps 8 notes onto two rows').toContain(2);
      else expect(r.rowsAt8, 'an iPad keeps 8 notes on one row').toEqual([1]);
    });
  }
  test('a Composer row uses the same layout (the Conductor\'s Podium)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const C = Arcade.BlocktaveCard, ch = Arcade.chromaticScale(Arcade.memberById('trumpet')).slice(0, 8);
      const s = C.staffRows(ch.map(n => ({n, caption: C.label(n)})), {clef: 'treble', availPx: 700, captions: true});
      return {rows: s.rows.length, W: s.W, ok: s.rows[0].xs.every((x, k, xs) => !k || x - xs[k - 1] >= window.BT_RULES.staffGap - .01)};
    });
    expect(r).toEqual({rows: 1, W: expect.any(Number), ok: true});
  });
});

test.describe('Blocktave: light underground and the way up', () => {
  /** a cave room (w × h open tiles, rock all around) `depth` rows under the ground near the player; the player stands in
      its left part. Returns {x, y (the room's floor row - 1), ground}. */
  const cave = (page, {depth = 20, w = 14, h = 4, dx = 0} = {}) => page.evaluate(({depth, w, h, dx}) => {
    const d = Arcade.Blocktave.demo, BW = Arcade.BlocktaveWorld, W = Arcade.Blocktave.world(), s = Arcade.Blocktave.state();
    const x0 = Math.floor(s.player.x) + dx, ground = BW.top(W, x0), y1 = ground + depth;
    for (let x = x0 - 7; x < x0 + w + 7; x++) for (let y = y1 - h - 7; y <= y1 + 7; y++) d.put(x, y, 'slate');
    for (let x = x0; x < x0 + w; x++) for (let y = y1 - h + 1; y <= y1; y++) d.put(x, y, 'air');
    d.tp(x0 + 2, y1 - 1);
    return {x: x0, y: y1, ground, w, h};
  }, {depth, w, h, dx});
  const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));

  test('at noon, 20 rows down with no lamp: the player\'s glow lights every tile within 4 tiles (≥ .35); nothing underground under caveMin', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));                 // noon
    await cave(page);
    await frames(page);
    const r = await page.evaluate(() => {
      const B = Arcade.Blocktave, s = B.state(), g = B.lightGrid(), BW = Arcade.BlocktaveWorld, W = B.world(), R = window.BT_RULES;
      const px = s.player.x, py = s.player.y - .9, near = [], under = [];
      for (let j = 0; j < g.rows; j++) for (let i = 0; i < g.cols; i++) {
        const x = g.x0 + i, y = g.y0 + j, v = g.v[j * g.cols + i];
        if (x < 0 || y < 0 || x >= W.w || y >= W.h) continue;
        if (Math.hypot(x + .5 - px, y + .5 - py) <= 4) near.push(v);
        if (y > BW.top(W, x)) under.push(v);
      }
      return {near: Math.min(...near), nNear: near.length, under: Math.min(...under), caveMin: R.light.caveMin,
        spawnLight: BW.light(W, Math.floor(px) + 4, Math.floor(py), 1, [], R)};
    });
    expect(r.nNear).toBeGreaterThan(40);
    expect(r.near).toBeGreaterThanOrEqual(.35);
    expect(r.under).toBeGreaterThanOrEqual(r.caveMin - 1e-6);
    expect(r.spawnLight, 'the glow is drawn only: the world\'s own light there stays dark').toBeLessThan(.5);
  });

  test('at night creatures can still appear at the edge of the player\'s glow (light.dark unchanged); ores glint in the dark', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const R = window.BT_RULES; Arcade.Blocktave.demo.time(R.dayS + 60); });
    const c = await cave(page, {w: 12, h: 3});
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.put(x + 1, y + 1, 'toneOre'), c);
    await frames(page);
    const r = await page.evaluate(({x, y}) => {
      const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), R = window.BT_RULES;
      const ex = Math.floor(s.player.x + R.light.playerRadius);          // a floor tile at the glow's edge
      return {edge: d.canSpawnAt(ex, y, 'clam'), dark: R.light.dark, drawn: Arcade.Blocktave.lightAt(ex, y)};
    }, c);
    expect(r.dark).toBe(.5);
    expect(r.edge).toBe(true);
    expect(r.drawn).toBeGreaterThan(.12);
  });

  test('a shaft dug straight up to the sky is lit by day, fading over light.shaftRows', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    const r = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, BW = Arcade.BlocktaveWorld, W = Arcade.Blocktave.world(), R = window.BT_RULES, s = Arcade.Blocktave.state();
      const x = Math.floor(s.player.x) + 5, g = BW.top(W, x);
      for (let y = g - 3; y < g + 16; y++) { d.put(x - 1, y, 'slate'); d.put(x + 1, y, 'slate'); d.put(x, y, 'slate'); }
      for (let y = 0; y < g - 3; y++) { d.put(x - 1, y, 'air'); d.put(x + 1, y, 'air'); d.put(x, y, 'air'); }
      const dark = BW.light(W, x, g + 4, 1, [], R);
      for (let y = g - 3; y < g + 12; y++) d.put(x, y, 'air');              // the shaft
      const rows = []; for (let k = 0; k <= 8; k++) rows.push(BW.light(W, x, g - 3 + k, 1, [], R));
      return {dark, rows, caveMin: R.light.caveMin, n: R.light.shaftRows};
    });
    expect(r.dark, 'before digging: rock is dark').toBeLessThan(.2);
    expect(r.rows[0]).toBeGreaterThan(.8);
    expect(r.rows[3], 'lit a few rows down').toBeGreaterThan(.4);
    for (let k = 1; k <= r.n; k++) expect(r.rows[k]).toBeLessThanOrEqual(r.rows[k - 1] + 1e-6);
    expect(r.rows[r.n + 2]).toBeLessThan(.5);
  });

  test('lost underground: the Surface arrow points along the shortest open path; ↑ SURFACE in the pause menu takes you up', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    // a cave room 20 rows down with ONE open tunnel up at its right end (a winding way: up 6, right 3, up to the sky)
    const c = await cave(page, {w: 10, h: 3});
    const tunnel = await page.evaluate(({x, y, ground, w, h}) => {
      const d = Arcade.Blocktave.demo, BW = Arcade.BlocktaveWorld, W = Arcade.Blocktave.world(), tx = x + w - 1;
      let cy = y - h; for (; cy > y - h - 6; cy--) d.put(tx, cy, 'air');
      for (let k = 1; k <= 3; k++) d.put(tx + k, cy + 1, 'air');
      const ux = tx + 3; for (let yy = cy; yy >= 0; yy--) { d.put(ux, yy, 'air'); if (yy < BW.top(W, ux)) break; }
      return {tx, ux};
    }, c);
    // speed the clocks: the arrow after lostS without getting closer; the button after surfaceAfterS
    await page.evaluate(() => { const R = window.BT_RULES.light; R.lostS = 1; R.surfaceAfterS = 2; });
    await page.waitForFunction(() => { const w = Arcade.Blocktave.state().way; return w && w.arrow; }, null, {timeout: 8000});
    let s = await st(page);
    expect(s.way.depth).toBeGreaterThan(8);
    expect(s.way.arrow.open).toBe(true);
    expect(s.way.arrow.dx, 'toward the tunnel (to the right)').toBeGreaterThan(.3);
    expect(s.way.path, 'the shortest open path: along the room, up the tunnel').toBeLessThan(40);
    // ↑ SURFACE
    await page.waitForFunction(() => Arcade.Blocktave.state().way.surfaceBtn, null, {timeout: 8000});
    await page.keyboard.press('Escape');
    await expect(page.locator('#btSurface')).toBeVisible();
    await page.locator('#btSurface').click();
    s = await st(page);
    const top = await page.evaluate(x => Arcade.BlocktaveWorld.top(Arcade.Blocktave.world(), x), Math.floor(s.player.x));
    expect(Math.abs(s.player.y - top), 'standing on the ground under the open sky').toBeLessThan(.01);
    expect(Math.floor(s.player.x)).toBe(tunnel.ux);
  });

  test('↑ SURFACE with no open way digs nothing: "Dig upward with your mallet!"; the target always shows its name', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    await cave(page);
    const before = await page.evaluate(() => Array.from(Arcade.Blocktave.world().b).join(''));
    const p0 = (await st(page)).player;
    await page.evaluate(() => Arcade.Blocktave.surface());
    await expect(page.locator('.ui-toast', {hasText: 'Dig upward with your mallet!'})).toBeVisible();
    const after = await page.evaluate(() => Array.from(Arcade.Blocktave.world().b).join(''));
    expect(after === before, 'no block changed').toBe(true);
    expect((await st(page)).player.x).toBe(p0.x);
    // the target block's name, readable in the dark
    await page.evaluate(() => { const s = Arcade.Blocktave.state(); Arcade.Blocktave.demo.target(Math.floor(s.player.x) - 3, Math.floor(s.player.y) - 1); });
    await frames(page);
    expect((await st(page)).targetName).toBe('Slate');
  });
});

test.describe('Blocktave: the parallax backdrop', () => {
  /** stand on the ground at column x (the camera follows), then let a few frames draw */
  const at = async (page, x) => { await page.evaluate(x => { const d = Arcade.Blocktave.demo, W = Arcade.Blocktave.world(); d.tp(x, Arcade.BlocktaveWorld.top(W, x) - 1); }, x);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80))))); return (await st(page)).backdrop; };

  test('each biome draws its own three layers; between biomes the two sets cross-fade over the blend columns', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    const R = await page.evaluate(() => window.BT_RULES);
    for (const [x, id] of [[40, 'marsh'], [128, 'brass'], [214, 'canyon']]) {
      const bd = await at(page, x);
      expect(bd.biomes, `column ${x}`).toEqual([{id, a: 1}]);
      expect(bd.layers).toEqual(['far', 'mid', 'near']);
      expect(bd.strips).toContain(id);
    }
    // the camera's middle right on the marsh / brass border: half and half; blend columns away: one set
    const camAt = async cx => { await at(page, Math.round(cx)); return (await st(page)).backdrop; };
    let bd = await camAt(R.biomes[1].from);
    expect(bd.biomes.map(b => b.id)).toEqual(['marsh', 'brass']);
    expect(Math.abs(bd.biomes[0].a - .5)).toBeLessThan(.2);
    bd = await camAt(R.biomes[1].from - R.backdrop.blend - 2);
    expect(bd.biomes).toEqual([{id: 'marsh', a: 1}]);
    bd = await camAt(R.biomes[1].from + R.backdrop.blend + 2);
    expect(bd.biomes).toEqual([{id: 'brass', a: 1}]);
  });

  test('moving the camera 100 px moves the layers 15 / 35 / 60 px (vertically 10 px); the cave backdrop 20', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const a = await at(page, 120), b = await at(page, 130);
    const tile = (await st(page)).tile, dx = 10 * tile;
    for (const [L, k] of [['far', 15], ['mid', 35], ['near', 60]]) expect((b.offsets[L].x - a.offsets[L].x) / dx * 100, L).toBeCloseTo(k, 5);
    // up and down: dig a shaft and stand 10 rows lower
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, BW = Arcade.BlocktaveWorld, W = Arcade.Blocktave.world(), x = 130, t = BW.top(W, x);
      for (let y = t; y < t + 12; y++) d.put(x, y, 'air'); d.put(x, t + 12, 'slate'); d.tp(x, t + 11); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));
    const d2 = (await st(page)).backdrop;
    expect(d2.cam.y - b.cam.y, 'the camera went down').toBeGreaterThan(100);
    for (const L of ['far', 'mid', 'near']) {
      expect(d2.offsets[L].x, L).toBeCloseTo(b.offsets[L].x, 5);
      expect((d2.offsets[L].y - b.offsets[L].y) / (d2.cam.y - b.cam.y) * 100, `${L}: up and down`).toBeCloseTo(10, 5);
    }
    expect(d2.cave.offset.x / d2.cam.x * 100, 'the cave backdrop: 20 % both ways').toBeCloseTo(20, 5);
    expect(d2.cave.offset.y / d2.cam.y * 100).toBeCloseTo(20, 5);
  });

  test('night tints the layers; under the ground the cave backdrop shows, with the bass clef in the Bass Depths', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    let bd = await at(page, 40);
    expect(bd.night).toBe(0);
    await page.evaluate(() => Arcade.Blocktave.demo.time(window.BT_RULES.dayS + 60));
    bd = await at(page, 40);
    expect(bd.night).toBeGreaterThan(.5);
    // the deep caves: the cave backdrop is drawn, with the faint bass clef
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = 40, y = R.world.deepY + 12;
      for (let k = -5; k <= 5; k++) for (let j = 0; j < 4; j++) d.put(x + k, y - j, 'air'); d.put(x, y + 1, 'slate'); d.tp(x, y); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))));
    bd = (await st(page)).backdrop;
    expect(bd.cave.drawn).toBe(true);
    expect(bd.clef).toBe('bass');
  });

  test('reduced motion: the layers still follow the camera, but nothing sways; a slow device keeps only the far layer', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    const a = await at(page, 30), b = await at(page, 40);
    expect(a.still).toBe(true);
    expect(a.sway).toBe(0); expect(b.sway).toBe(0);
    expect(b.offsets.far.x).toBeGreaterThan(a.offsets.far.x);
    await page.emulateMedia({reducedMotion: 'no-preference'});
    let moved = 0;
    for (let k = 0; k < 6; k++) { const s = await at(page, 40); moved = Math.max(moved, Math.abs(s.sway)); await page.waitForTimeout(300); }
    expect(moved, 'with motion the marsh reeds sway a little').toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual(await page.evaluate(() => window.BT_RULES.backdrop.swayPx));
    await page.evaluate(() => Arcade.Blocktave.demo.bgLow(true));
    const c = await at(page, 40);
    expect(c.layers).toEqual(['far']);
    expect(c.sway).toBe(0);
  });
});

test.describe('Blocktave: world drops and the pickup radius', () => {
  test('a calmed Clam drops a Pearl where it was; the milestone counts at once; the magnet pulls it in; a full bag leaves it', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    const {x0, y0} = await flat(page);
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 8); });
    await page.evaluate(i => Arcade.Blocktave.demo.calm(i), id);
    expect((await page.evaluate(() => Arcade.Blocktave.demo.stats())).clams, 'counted at the calming moment').toBe(1);
    // it falls to the ground: the game's frames decide how fast (a slow runner's are slower), so wait for it to land
    await expect.poll(async () => { const d = (await st(page)).drops.find(x => x.item === 'pearl'); return d ? Math.abs(d.y - (y0 - .22)) : 9; },
      {message: 'it rests on the ground', timeout: 10_000}).toBeLessThan(.05);
    let s = await st(page);
    expect(s.inv.pearl || 0, 'not in your bag while you\'re far').toBe(0);
    expect(s.drops.filter(d => d.item === 'pearl').length).toBe(1);
    const dr = s.drops.find(d => d.item === 'pearl');
    expect(Math.abs(dr.y - (y0 - .22)), 'it rests on the ground').toBeLessThan(.05);
    // THE MAGNET: from 2.1 tiles (inside magnetRadius, outside pickupRadius) it glides to you and is picked up
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.tp(Math.floor(x + 2.1 - .5), y - 1); }, {x: dr.x, y: y0});
    const px = (await st(page)).player.x;
    await expect.poll(async () => (await st(page)).inv.pearl || 0).toBe(1);
    expect(Math.abs((await st(page)).player.x - px), 'you didn\'t walk to it').toBeLessThan(.01);
    // A FULL BAG: the item stays on the ground, "Bag full!"
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, I = window.BT_ITEMS, n = window.BT_RULES.invSlots;
      Object.keys(I).filter(k => I[k].kind !== 'tool').slice(0, n + 2).forEach(k => { if (d.canHold(k)) d.give(k, 1); }); });
    const left = await page.evaluate(() => Object.keys(window.BT_ITEMS).find(k => window.BT_ITEMS[k].kind !== 'tool' && !Arcade.Blocktave.state().inv[k]));
    expect(await page.evaluate(k => Arcade.Blocktave.demo.canHold(k), left)).toBe(false);
    await page.evaluate(k => { const s = Arcade.Blocktave.state(); Arcade.Blocktave.demo.drop(k, 1, s.player.x + .6, s.player.y - 1); }, left);
    await page.waitForTimeout(900);
    expect((await st(page)).drops.some(d => d.item === left), 'it stays on the ground').toBe(true);
    await expect(page.locator('.ui-toast', {hasText: 'Bag full!'})).toBeVisible();
    watch.check();
  });

  test('drops are saved with the world; off screen they despawn after dropDespawnS, on screen never; the bag never does; at most maxDrops', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const {x0, y0} = await flat(page);
    await page.evaluate(({x0, y0}) => { const d = Arcade.Blocktave.demo; d.drop('pearl', 1, x0 + 80, 10); d.drop('cork', 2, x0 + 6, y0 - 1); }, {x0, y0});
    await page.waitForTimeout(600);
    await page.evaluate(() => Arcade.Blocktave.save());
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Arcade.Blocktave.key)));
    expect(saved.v).toBe(2);
    expect([...new Set(saved.drops.map(d => d.item))].sort()).toEqual(['cork', 'pearl']);
    // reload: they come back
    await page.reload();
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    await into(page);
    expect([...new Set((await st(page)).drops.map(d => d.item))].sort()).toEqual(['cork', 'pearl']);
    // the despawn clock: only off screen
    await page.evaluate(() => { const R = window.BT_RULES, w = Arcade.Blocktave.world(); w.drops.forEach(d => { d.t = R.dropDespawnS - .3; });
      w.bags.push({x: w.drops.find(d => d.item === 'pearl').x + 3, y: 10, items: {dirt: 2}}); });
    await page.waitForTimeout(900);
    const s = await st(page);
    expect([...new Set(s.drops.map(d => d.item))], 'the far one is gone, the one you can see stays').toEqual(['cork']);
    expect(s.bags, 'the lost-hearts bag never despawns').toBe(1);
    // the cap: the oldest beyond maxDrops joins the nearest drop of its kind (nothing is lost)
    const cap = await page.evaluate(({x0}) => { const d = Arcade.Blocktave.demo, R = window.BT_RULES;
      for (let k = 0; k < R.maxDrops + 6; k++) d.drop('dirt', 1, x0 + 60 + (k % 10), 8);
      const D = Arcade.Blocktave.world().drops; return {n: D.length, dirt: D.filter(q => q.item === 'dirt').reduce((a, q) => a + q.n, 0), max: R.maxDrops}; }, {x0});
    expect(cap.n).toBeLessThanOrEqual(cap.max);
    expect(cap.dirt).toBe(cap.max + 6);
  });

  test('an old version-1 save (no drops) still loads, with none', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const ok = await page.evaluate(() => { const BW = Arcade.BlocktaveWorld, w = BW.generate(77, window.BT_RULES), o = BW.encode(w); o.v = 1; delete o.drops; const back = BW.decode(o); return !!back && Array.isArray(back.drops) && back.drops.length === 0; });
    expect(ok).toBe(true);
  });
});
