/* BLOCKTAVE (blocktave/): the world, saving, mining = playing, the snare, crafting = performing, creatures, the
   milestone stars, the layout on iPads and phones, and the frame rate at 4× CPU throttle. Every test opens ?demo with
   a fixed ?seed= (the world is the same every run) and uses the game's own hooks (Arcade.Blocktave.demo), which call
   the real mining, crafting and building code. Chapter 1 end to end is in the game runs (tests/games.js). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

/* the music and the count-off clicks play on the AudioContext's clock. WebKit on a CI machine has no sound card: its
   AudioContext says it is running but its clock doesn't keep time (tests/games.js: Music Highway and Rhythm Dojo play
   with SOUND OFF there), so the cave track never reports playing and clicks land "too late" (skipped, never late: 1–3
   of 4). The 2 cave-music and 2 count-off tests failed in all of the last 10 WebKit runs (October 2026), and the
   INSTRUMENT count-off's clicks come out empty there; these 5 run in Chromium. */
const NO_AUDIO_CLOCK = 'WebKit on a CI machine: the audio clock doesn\'t keep time (no sound card); Chromium checks this';
const SEEN = {welcome: 1, mining: 1, night: 1, 'c-clam': 1, 'c-wisp': 1, 'c-rusher': 1, 'c-zipper': 1, composer: 1, 'file-note': 1};
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
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // two frames drawn
}
const st = page => page.evaluate(() => Arcade.Blocktave.state());
/** stand next to the nearest block of this kind (a pocket dug beside it) and return where it is */
const nextTo = (page, key) => page.evaluate(k => { const d = Arcade.Blocktave.demo, t = d.find(k); d.standBy(t.x, t.y); return t; }, key);
/** a block of this kind right beside the player (so every kind can be tried) */
const putBeside = (page, key) => page.evaluate(k => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
  d.put(x, y, k); d.put(x, y + 1, 'slate'); return {x, y}; }, key);
const cardOpen = page => page.evaluate(() => !!Arcade.BlocktaveCard.current);
// (checked every 100 ms, not on the page's animation frames: a card closes on a timer, and a busy WebKit runner can
// starve a page's frames for seconds)
const waitCardGone = page => page.waitForFunction(() => !Arcade.BlocktaveCard.current, null, {timeout: 20_000, polling: 100}).catch(async e => {
  // what the card was doing (a failure message is all there is on CI)
  const why = await page.evaluate(() => { const c = Arcade.BlocktaveCard.current; if (!c) return 'closed just now';
    try { const s = c.state(); return JSON.stringify({kind: s.kind, phase: s.phase, mode: Arcade.Blocktave.state().mode, done: s.done, t0: s.t0, now: Math.round(performance.now()), info: s.info}).slice(0, 600); } catch (x) { return 'state failed: ' + x.message; } })
    .catch(x => 'page gone: ' + x.message.split('\n')[0]);
  e.message += `\n  the open card: ${why}`; throw e;
});
/** a WRONG letter that is on the open card's answer pad (a spelled pad shows only its set's letters: shared/answer-pad.js) */
const wrongLetter = page => page.evaluate(() => { const w = Arcade.BlocktaveCard.current.want().n.letter;
  return [...document.querySelectorAll('.bt-card .apad-letter')].map(b => b.dataset.letter).find(l => l !== w); });

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

  test('save → reload = the same world; the world file round-trips; the Backup Code never carries the world', {tag: '@quick'}, async ({page}) => {
    const watch = await enter(page);
    // change the world a little: dig, build, move
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y);
      d.mine(x + 1, y); d.place(x - 1, y - 1, 'planks'); d.give('reed', 3); });
    // the pause menu saves it
    await page.locator('#uiPauseBtn').click();
    await expect(page.locator('#uiPause')).toBeVisible();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem(Arcade.Blocktave.key)));
    expect(before.v).toBe(3);                                             // v 3: the world's drops are saved too (and Chapter 6's ores are in it)
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
    await page.locator(`.bt-card .apad-letter[data-letter="${await wrongLetter(page)}"]`).dispatchEvent('pointerdown');
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

  for (const [member, want] of [['flute', ['B♭', 'C', 'D', 'E♭', 'F']], ['snare', null]]) {
    test(`TOUCH: a note card spells its pad for its set, one tap (${member}${want ? ': ' + want.join(' ') : ', reading the bells\' notes'})`, async ({page}) => {
      const watch = await enter(page, {member, mode: 'touch'});
      await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
      const t = await nextTo(page, 'toneOre');
      await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
      const p = await page.evaluate(() => ({sp: !!document.querySelector('.bt-card .apad.sp'),
        labels: [...document.querySelectorAll('.bt-card .apad-letter')].map(b => b.textContent),
        accRow: !!document.querySelector('.bt-card .apad-accs:not([hidden])'), want: Arcade.BlocktaveCard.current.want()}));
      if (!p.sp) { expect(p.labels, `${member}: Chromatic (the Shift pad)`).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']); watch.check(); return; }
      if (want) expect(p.labels, member).toEqual(want);
      expect(p.labels, member).toContain(p.want.label);                       // the right answer is a button …
      expect(p.accRow, member).toBe(false);                                    // … with no ♭ ♮ ♯ row
      await page.locator(`.bt-card .apad-letter[data-letter="${p.want.n.letter}"]`).dispatchEvent('pointerdown');   // one tap
      await waitCardGone(page);
      expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), t), member).toBe('air');
      watch.check();
    });
  }

  test('three wrong answers in a row show the note name as a hint', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet2', 1));
    const t = await nextTo(page, 'toneOre');
    for (let k = 0; k < 3; k++) {
      await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
      expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().hint), `wrong answers so far: ${k}`).toBe(false);
      await page.locator(`.bt-card .apad-letter[data-letter="${await wrongLetter(page)}"]`).dispatchEvent('pointerdown');
      await waitCardGone(page);
    }
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), t);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().hint)).toBe(true);
    await expect(page.locator('.bt-card .ncap').first()).toBeVisible();
  });

  // every block type, in 3 parts per mode (every 3rd type): each card is performed in real time, so the parts run side
  // by side instead of one 90 s test
  for (const mode of ['inst', 'touch']) for (let part = 0; part < 3; part++) {
    test(`SNARE DRUM (${mode === 'inst' ? 'instrument' : 'touch'} mode): every block type is mineable (part ${part + 1} of 3)`, async ({page}) => {
      const watch = await enter(page, {member: 'snare', mode});
      await page.evaluate(() => Arcade.Blocktave.demo.give('baton', 1));
      const all = await page.evaluate(() => Arcade.BlocktaveWorld.BLOCKS.filter(b => b.mine).map(b => b.key));
      expect(all).toEqual(expect.arrayContaining(['toneOre', 'brassOre', 'scaleVein', 'springVein', 'sustain', 'rhythmRock', 'restCrystal', 'dirt', 'slate']));
      const kinds = all.filter((k, i) => i % 3 === part);
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
      if (mode === 'inst') {
        // INSTRUMENT on the drum: counts, rhythms and even rolls (never notes)
        expect(Object.values(got).every(kind => ['count', 'rhythm', 'rest', 'roll', 'dynamics', 'tempo'].includes(kind)), JSON.stringify(got)).toBe(true);
        if (kinds.includes('toneOre')) expect(got.toneOre).toBe('count');
        if (kinds.includes('sustain')) expect(got.sustain).toBe('roll');
      } else {
        // TOUCH is the same for everyone: the bells' notes, the key question, tapped rhythms; never a count or a roll
        expect(Object.values(got).some(kind => kind === 'count' || kind === 'roll'), JSON.stringify(got)).toBe(false);
        if (kinds.includes('toneOre')) expect(got.toneOre).toBe('notes');
        if (kinds.includes('sustain')) expect(got.sustain).toBe('key');
      }
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
    await page.locator(`.bt-card .apad-letter[data-letter="${await wrongLetter(page)}"]`).dispatchEvent('pointerdown');
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

  test('INSTRUMENT: playing a Night Clam\'s notes calms it (a Pearl, 2×)', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('baton', 1); d.time(window.BT_RULES.dayS + 30); d.spawn('clam', 4); });
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening()), {message: 'a creature near: the microphone listens'}).toBe(true);
    // the Golden Baton: 5 a hit, so 2 right notes (each hit shows a new note: play that one next)
    await expect.poll(() => page.evaluate(() => { const c = Arcade.Blocktave.state().creatures[0]; if (!c || c.state !== 'live') { Arcade.Pitch.demoNote = null; return 'calm'; }
      Arcade.Pitch.demoNote = c.sounding; return c.hp; }), {timeout: 12000}).toBe('calm');
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
    // all at once on the game's test clock (demo.step): a 1.8 s mute, 1 s in it, then 1.5 s more (past its end), so a
    // busy runner's real time between the steps never matters
    const {a, b, c} = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, pos = () => { const c = Arcade.Blocktave.state().creatures[0]; return [c.x, c.y]; };
      Arcade.Pitch.suppress(1800);
      d.step(.1); const a = pos(); d.step(1); const b = pos(); d.step(1.5); return {a, b, c: pos()};
    });
    expect(b, 'frozen during the mute').toEqual(a);
    expect(Math.hypot(c[0] - a[0], c[1] - a[1]), 'moving again after it').toBeGreaterThan(.1);
  });

  test('a Rusher\'s speed fits its challenge (the fairness check)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES; d.time(R.dayS + 30); d.spawn('rusher', 14);
      const c = Arcade.Blocktave.state().creatures[0], b = 60 / R.rhythm.bpm, need = R.rhythm.leadS + R.rusher.beats * 2 * b + R.rhythm.lateMs / 1000;
      return {speed: R.rusher.speed * c.mul, reach: R.rusher.alert / (R.rusher.speed * c.mul), need: need * R.fair.margin}; });
    expect(r.reach, 'seconds to reach you from where it charges ≥ its challenge × the margin').toBeGreaterThanOrEqual(r.need - 1e-6);
  });

  test('losing all hearts: back at the Practice Cot, only 10 % of the materials in a bag (a cot set), tools kept', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    const cot = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, s = B.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      d.put(x, y, 'air'); d.put(x, y + 1, 'dirt'); d.place(x, y, 'cot'); d.act(x, y, true); return {x, y}; });
    expect((await st(page)).cot).toEqual(cot);
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('dirt', 30); d.give('reed', 20); d.give('mallet1', 1); d.tp(Math.floor(Arcade.Blocktave.state().player.x) + 20, 20); });
    await settleFor(page, 400);
    await page.evaluate(() => { for (let k = 0; k < 5; k++) Arcade.Blocktave.demo.hurt(1); });
    const s = await st(page);
    expect([Math.floor(s.player.x), Math.round(s.player.y)]).toEqual([cot.x, cot.y + 1]);
    expect(s.player.hearts).toBe(5);
    expect([s.inv.dirt, s.inv.reed, s.inv.mallet1]).toEqual([27, 18, 1]);
    expect(s.bags).toBe(1);
    const bag = await page.evaluate(() => Arcade.Blocktave.world().bags[0]);
    expect(bag.items).toEqual({dirt: 3, reed: 2});
    // walking into it picks it up
    await page.evaluate(b => Arcade.Blocktave.demo.tp(Math.floor(b.x), Math.floor(b.y)), bag);
    await expect.poll(async () => (await st(page)).bags).toBe(0);
    expect((await st(page)).inv.dirt).toBe(30);
    watch.check();
  });
});

/* ================= COMBAT (the Rey Update): HP, music damage, the Zipper, the spawn ramp, breaking out, the cot ================= */
test.describe('Blocktave: COMBAT (HP and music damage)', () => {
  const TOOLS = [null, 'mallet1', 'mallet2', 'mallet3', 'baton'];
  /** night, a tool (or none), a creature 6 tiles away; its id */
  const night = (page, kind, tool, dx = 6) => page.evaluate(({kind, tool, dx}) => { const d = Arcade.Blocktave.demo; if (tool) d.give(tool, 1); d.time(window.BT_RULES.dayS + 30); return d.spawn(kind, dx); }, {kind, tool, dx});
  const creature = (page, id) => page.evaluate(i => Arcade.Blocktave.state().creatures.find(c => c.id === i) || null, id);

  for (const [t, tool] of TOOLS.entries()) {
    test(`TOUCH, ${tool || 'no tool'}: a Night Clam needs ceil(10 ÷ ${t + 1}) right answers, a NEW note each time`, async ({page}) => {
      await enter(page, {mode: 'touch'});
      const id = await night(page, 'clam', tool);
      const R = await page.evaluate(() => window.BT_RULES.combat);
      expect(await page.evaluate(() => Arcade.Blocktave.state().damage)).toBe(R.damage[t]);
      const need = Math.ceil(R.hp.clam / R.damage[t]), pcs = [];
      for (let k = 0; k < need; k++) {
        const c = await creature(page, id);
        expect(c.state, `answer ${k + 1}`).toBe('live');
        expect(c.hp).toBe(Math.max(0, R.hp.clam - k * R.damage[t]));
        pcs.push(c.pc);
        if (!(await cardOpen(page))) await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
        const t0 = await page.evaluate(() => { const c = Arcade.BlocktaveCard.current; Arcade.Blocktave.demo.answer(); return c.state().t0; });
        await page.waitForFunction(t => { const c = Arcade.BlocktaveCard.current; return !c || c.state().t0 !== t; }, t0);
      }
      expect((await creature(page, id) || {state: 'gone'}).state, `calmed after exactly ${need}`).not.toBe('live');
      for (let k = 1; k < pcs.length; k++) expect(pcs[k], 'each hit shows a new note').not.toBe(pcs[k - 1]);
    });
  }

  test('a wrong answer does no damage and ends the chain; a right one chains the next card (TOUCH)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const id = await night(page, 'clam', 'mallet1');
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    await page.keyboard.press(await wrongLetter(page));
    await waitCardGone(page);
    await page.waitForTimeout(400);
    expect(await cardOpen(page), 'a wrong answer: no next card').toBe(false);
    expect((await creature(page, id)).hp).toBe(10);
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    await page.evaluate(() => Arcade.Blocktave.demo.answer());
    await expect.poll(async () => (await creature(page, id)).hp).toBe(8);
    await expect.poll(() => cardOpen(page), {message: 'a right answer: the next card'}).toBe(true);
  });

  test('INSTRUMENT: a wrong note does nothing; the right one is a hit and shows a new note', async ({page}) => {
    await enter(page, {mode: 'inst'});
    const id = await night(page, 'clam', 'mallet2', 4);
    const c = await creature(page, id);
    await page.evaluate(pc => Arcade.Blocktave.demo.heard((pc + 1) % 12), c.pc);
    expect((await creature(page, id)).hp).toBe(10);
    await page.evaluate(pc => Arcade.Blocktave.demo.heard(pc), c.pc);
    const c2 = await creature(page, id);
    expect(c2.hp).toBe(7);
    expect(c2.pc).not.toBe(c.pc);
  });

  test('snare INSTRUMENT: each right count is a hit (a new count each time)', async ({page}) => {
    await enter(page, {member: 'snare', mode: 'inst'});
    const id = await night(page, 'clam', 'mallet3');
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('count');
    expect(await calmByCards(page, id)).toBe(3);                          // 10 HP, 4 a hit
  });

  test('Sour Wisp, INSTRUMENT: each second of a steady in-tune note is one hit', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y);
      for (let dx = 1; dx <= 5; dx++) for (let dy = -3; dy <= -1; dy++) d.put(x + dx, y + dy, 'air'); });
    const id = await night(page, 'wisp', 'baton', 3);
    await expect.poll(() => page.evaluate(() => Arcade.Pitch.listening())).toBe(true);
    await page.evaluate(() => { Arcade.Pitch.demoNote = 72; });
    await expect.poll(async () => (await creature(page, id) || {state: 'gone'}).state, {timeout: 15000}).not.toBe('live');
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    const fx = (await st(page)).fx;
    expect([fx.hits, fx.damage], 'three hits of 5: 15 → 10 → 5 → calm').toEqual([3, 15]);
  });

  test('Sour Wisp, TOUCH: each right key answer is one hit, then a new question', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const id = await night(page, 'wisp', 'baton');
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('key');
    expect(await calmByCards(page, id)).toBe(3);                          // 15 HP, 5 a hit
  });

  test('Sour Wisp, snare: each 1 s roll card is one hit', async ({page}) => {
    await enter(page, {member: 'snare', mode: 'inst'});
    const id = await night(page, 'wisp', 'baton');
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('roll');
    expect(await calmByCards(page, id)).toBe(3);
  });

  for (const [member, mode] of [['trumpet', 'touch'], ['trumpet', 'inst'], ['snare', 'inst']]) {
    test(`Rusher, ${member} ${mode}: every right hit in its rhythm is one hit`, async ({page}) => {
      await enter(page, {member, mode});
      const id = await night(page, 'rusher', 'mallet1', 9);
      await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
      expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('rhythm');
      // every right hit in a card is one hit (2 a hit: the Wooden Mallet): 2, 4 or 6 a card (its 1 to 3 notes)
      expect(await calmByCards(page, id), 'calmed in a few cards').toBeLessThanOrEqual(8);
      const fx = (await st(page)).fx;
      expect(fx.damage).toBeGreaterThanOrEqual(12);
      for (const d of fx.dmgLog) expect([2, 4, 6]).toContain(d);
    });
  }

  test('the HP bar shows once hit (and while its card is open); "−5" floats up; calmed at 0: the poof, its drop, counted once', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const id = await night(page, 'clam', 'baton');
    expect((await creature(page, id)).bar, 'no bar before a hit').toBe(false);
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect((await creature(page, id)).bar, 'a bar while its card is open').toBe(true);
    await page.evaluate(() => Arcade.BlocktaveCard.close());
    await page.evaluate(i => Arcade.Blocktave.demo.hit(i), id);
    const s = await st(page);
    expect(s.creatures.find(c => c.id === id)).toMatchObject({hp: 5, bar: true});
    expect(s.fx.dmgLog).toEqual([5]);
    expect(s.dmgLabels.length ? s.dmgLabels : ['−5'], 'its "−5" (unless it has already faded on a slow machine)').toEqual(['−5']);
    await expect.poll(async () => (await creature(page, id)).bar, {message: 'gone barMs after the hit', timeout: 10_000}).toBe(false);
    const before = await page.evaluate(() => Arcade.Blocktave.demo.stats().clams || 0);
    await page.evaluate(i => { Arcade.Blocktave.demo.hit(i); Arcade.Blocktave.demo.hit(i); Arcade.Blocktave.demo.calm(i); }, id);
    expect((await creature(page, id) || {state: 'gone'}).state).not.toBe('live');
    expect(await page.evaluate(() => Arcade.Blocktave.demo.stats().clams)).toBe(before + 1);
    expect((await st(page)).drops.filter(d => d.item === 'pearl').reduce((a, d) => a + d.n, 0)).toBe(1);
  });

  test('THE FAIRNESS CHECK with HP: with no mallet, a Night Clam is slow enough for 10 right notes (and a Wisp for 15 seconds)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES; d.time(R.dayS + 30);
      return [8, 14, 22].flatMap(dx => ['clam', 'wisp', 'zipper'].map(kind => { const id = d.spawn(kind, dx), c = Arcade.Blocktave.state().creatures.find(k => k.id === id), p = Arcade.Blocktave.state().player;
        const base = kind === 'clam' ? R.clam.hopX / R.clam.hopS : kind === 'wisp' ? R.wisp.speed : R.zipper.speedX * R.clam.hopX / R.clam.hopS;
        return {kind, dx, need: c.need, reach: Math.hypot(c.x - p.x, c.y - p.y) / (base * c.mul), margin: R.fair.margin}; })); });
    for (const q of r) {
      expect(q.need, `${q.kind}: HP ÷ 1 × its action time`).toBe({clam: 10 * 2, wisp: 15 * 1, zipper: 1 * 2.5}[q.kind]);
      expect(q.reach, `${q.kind} from ${q.dx}: seconds to reach you ≥ the time to calm it × the margin`).toBeGreaterThanOrEqual(q.need * q.margin - 1e-6);
    }
  });

  test('a stronger tool lets creatures move faster (less to do), never faster than their own speed', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const m = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30);
      const a = d.spawn('clam', 10); d.give('baton', 1); const b = d.spawn('clam', 10); const cs = Arcade.Blocktave.state().creatures;
      return [cs.find(c => c.id === a).mul, cs.find(c => c.id === b).mul]; });
    expect(m[1]).toBeGreaterThan(m[0]);
    expect(m[1]).toBeLessThanOrEqual(1);
  });
});

test.describe('Blocktave: THE ZIPPER', () => {
  const night = (page, kind, tool, dx = 6) => page.evaluate(({kind, tool, dx}) => { const d = Arcade.Blocktave.demo; if (tool) d.give(tool, 1); d.time(window.BT_RULES.dayS + 30); return d.spawn(kind, dx); }, {kind, tool, dx});
  const creature = (page, id) => page.evaluate(i => Arcade.Blocktave.state().creatures.find(c => c.id === i) || null, id);

  test('its first-time card; 1 HP; 3× a clam\'s speed; one right answer calms it and it drops Zip Thread', async ({page}) => {
    const seen = Object.assign({}, SEEN); delete seen['c-zipper'];
    await enter(page, {mode: 'touch', extra: {gameData: {blocktave: {mode: 'touch', seen}}}});
    const id = await night(page, 'zipper', null, 8);
    await page.evaluate(() => Arcade.Blocktave.demo.step(.2));
    await expect(page.locator('#intro')).toContainText('A Zipper!');
    await page.locator('#intro [data-act=go]').click();
    const R = await page.evaluate(() => window.BT_RULES);
    expect(R.zipper.speedX).toBe(3);
    const c = await creature(page, id);
    expect([c.hp, c.max]).toEqual([1, 1]);
    // its run: about 3× a clam's top speed × the fairness check (measured on the test clock, on open ground)
    const v = await page.evaluate(i => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), p = s.player, x = Math.floor(p.x), y = Math.floor(p.y);
      for (let dx = -12; dx <= 12; dx++) { d.put(x + dx, y, 'slate'); for (let dy = 1; dy <= 3; dy++) d.put(x + dx, y - dy, 'air'); }
      const c0 = s.creatures.find(c => c.id === i); d.step(.3); const a = Arcade.Blocktave.state().creatures.find(c => c.id === i); return {dx: Math.abs(a.x - c0.x), mul: a.mul}; }, id);
    expect(v.dx / .3).toBeGreaterThan(R.zipper.speedX * R.clam.hopX / R.clam.hopS * v.mul * .6);
    expect(await calmByCards(page, id)).toBe(1);
    expect((await st(page)).drops.filter(d => d.item === 'zipthread').length).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.BT_ITEMS.zipthread.name)).toBe('Zip Thread');
  });

  test('INSTRUMENT: any note of its pool calms it; snare: a 1-hit count', async ({page}) => {
    await enter(page, {mode: 'inst'});
    const id = await night(page, 'zipper', null, 4);
    const c = await creature(page, id);
    expect(c.pcs.length).toBeGreaterThan(1);
    await page.evaluate(pc => Arcade.Blocktave.demo.heard(pc), c.pcs[c.pcs.length - 1]);
    expect((await creature(page, id) || {state: 'gone'}).state).not.toBe('live');
  });

  test('snare INSTRUMENT: its card is ONE hit', async ({page}) => {
    await enter(page, {member: 'snare', mode: 'inst'});
    const [id, kind] = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); const i = d.spawn('zipper', 6); d.creatureCard(i); return [i, Arcade.BlocktaveCard.current.state().kind]; });
    expect(kind).toBe('count');
    expect((await creature(page, id)).n).toBe(1);
    expect(await calmByCards(page, id)).toBe(1);
  });

  test('its touch costs ½ a heart, then it zips away', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const id = await night(page, 'zipper', null, .3);
    const r = await page.evaluate(i => { const d = Arcade.Blocktave.demo; d.step(.1); const s = Arcade.Blocktave.state(); return {hearts: s.player.hearts, flee: s.creatures.find(c => c.id === i).flee}; }, id);
    expect(r.hearts).toBe(4.5);
    expect(r.flee).toBeGreaterThan(0);
  });
});

test.describe('Blocktave: smarter nights (the spawn ramp, breaking out, the cot)', () => {
  test('THE SPAWN RAMP: +15 % a night, at most 2×; Zippers from night 2, Rushers from night 3', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, w = B.world(), out = {};
      for (const n of [1, 2, 3, 7, 12]) { w.nights = n; out[n] = {ramp: B.state().ramp, clam: d.caps('clam'), zipper: d.caps('zipper')}; }
      return out; });
    const R = await page.evaluate(() => window.BT_RULES.spawn);
    expect(r[1].ramp).toBe(1);
    expect(r[2].ramp).toBeCloseTo(1.15);
    expect(r[3].ramp).toBeCloseTo(1.3);
    expect(r[7].ramp).toBeCloseTo(1.9);
    expect(r[12].ramp).toBe(2);
    expect(r[1].clam).toEqual({perNight: R.perNight.clam, atOnce: R.atOnce.clam});
    expect(r[12].clam).toEqual({perNight: R.perNight.clam * 2, atOnce: R.atOnce.clam * 2});
    expect(R.zippersFrom).toBe(2);
    // real spawning: none on night 1, some on night 2
    const kinds = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, w = B.world(), R = window.BT_RULES, out = {};
      for (const n of [1, 2]) { w.nights = n; d.time(R.dayS + 30); B.state(); for (let k = 0; k < 400; k++) d.spawnCheck(); out[n] = B.state().creatures.map(c => c.kind); }
      return out; });
    expect(kinds[1]).not.toContain('zipper');
    expect(kinds[1]).not.toContain('rusher');
    expect(kinds[2]).toContain('zipper');
  });

  /** a closed box of `wall` blocks, 1 wide × 2 high, its floor at (x, y + 1); returns its tiles */
  const box = (page, dx, wall = 'dirt') => page.evaluate(({dx, wall}) => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + dx, y = Math.floor(s.player.y) - 1;
    for (let xx = x - 1; xx <= x + 1; xx++) for (let yy = y - 2; yy <= y + 1; yy++) d.put(xx, yy, 'slate');
    for (let yy = y - 2; yy <= y + 1; yy++) { d.put(x - 1, yy, wall); d.put(x + 1, yy, wall); }
    d.put(x, y - 2, wall); d.put(x, y + 1, 'slate'); d.put(x, y, 'air'); d.put(x, y - 1, 'air');
    return {x, y}; }, {dx, wall});

  test('BREAKING OUT: a boxed-in creature breaks ONE soft wall block every 2 s after 3 s stuck; the block drops', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const b = await box(page, -5);
    const r = await page.evaluate(({x, y}) => { const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES; d.time(R.dayS + 30);
      const id = d.spawn('clam', x + .5 - B.state().player.x); const c = B.world && B.state().creatures.find(k => k.id === id);
      const walls = () => [[x - 1, y], [x - 1, y - 1], [x + 1, y], [x + 1, y - 1], [x, y - 2]].filter(([a, b]) => d.at(a, b) === 'air').length;
      // (it's stuck from its first hop against the wall, which comes within one hop time: clam.hopS)
      d.step(2.5); const early = walls(); d.step(R.combat.breakAfterS + R.clam.hopS * 2); const one = walls(); d.step(3); const still = walls();
      return {early, one, still, dirt: B.state().drops.filter(q => q.item === 'dirt').length, start: [c.x, c.y]}; }, b);
    expect(r.early, 'not before breakAfterS').toBe(0);
    expect(r.one, 'one block').toBe(1);
    expect(r.still, 'out of its box: no more breaking').toBe(1);
    expect(r.dirt, 'it dropped its block').toBeGreaterThan(0);
  });

  test('BREAKING OUT: never bricks (only soft blocks), never a shelter\'s wall, never out in the open', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const brick = await box(page, -5, 'brick');
    const r = await page.evaluate(({x, y}) => { const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES; d.time(R.dayS + 30);
      d.spawn('clam', x + .5 - B.state().player.x); d.step(10);
      return {bricks: [[x - 1, y], [x - 1, y - 1], [x + 1, y], [x + 1, y - 1], [x, y - 2]].every(([a, b]) => d.at(a, b) === 'brick'), breaks: B.state().fx.breaks || 0}; }, brick);
    expect(r).toEqual({bricks: true, breaks: 0});
    // a pocket whose only soft wall is a shelter's wall (a closed room with a door): it stays
    await page.evaluate(() => Arcade.Blocktave.demo.shelter());
    const sh = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, w = B.world(), x0 = Math.floor(w.spawn.x) - 1, y = Math.floor(w.spawn.y) + 1, px = x0 - 2;
      // the pocket left of the shelter's left wall (x0 - 1): bricks all round, the shelter's dirt wall on its right
      for (let yy = y - 3; yy <= y; yy++) { d.put(px - 1, yy, 'brick'); d.put(px, yy, 'brick'); }
      d.put(px, y - 1, 'air'); d.put(px, y - 2, 'air');
      d.put(x0 + 4, y - 1, 'dirt'); d.put(x0 + 4, y - 2, 'dirt');
      return {px, y, wall: [[x0 - 1, y - 1], [x0 - 1, y - 2]]}; });
    const r2 = await page.evaluate(({px, y, wall}) => { const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES; d.time(R.dayS + 30);
      d.spawn('clam', px + .5 - B.state().player.x); d.step(10); return wall.map(([a, b]) => d.at(a, b)); }, sh);
    expect(r2, 'the shelter wall stays').toEqual(['dirt', 'dirt']);
    // out in the open, behind a dirt wall: never digs through the world toward you
    const open = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES, s = B.state(), x = Math.floor(s.player.x) + 30, y = Math.floor(s.player.y) - 1;
      d.tp(x, y); for (let yy = y - 1; yy <= y; yy++) d.put(x + 3, yy, 'dirt');
      const n0 = B.state().fx.breaks || 0; d.time(R.dayS + 30); d.spawn('clam', 6); d.step(10); return (B.state().fx.breaks || 0) - n0; });
    expect(open).toBe(0);
  });

  test('THE COT: no spawns within 12 tiles of a Practice Cot, even in the dark', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => { const B = Arcade.Blocktave, d = B.demo, R = window.BT_RULES, s = B.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      d.time(R.dayS + 30);
      const spots = []; for (let dx = -16; dx <= 16; dx++) for (let dy = -8; dy <= 3; dy++) if (d.canSpawnAt(x + dx, y + dy, 'clam')) spots.push([x + dx, y + dy]);
      d.put(x, y, 'air'); d.put(x, y + 1, 'dirt'); d.place(x, y, 'cot'); d.act(x, y, true); d.time(R.dayS + 30);   // (setting it sleeps to morning: night again)
      const near = spots.filter(([a, b]) => Math.hypot(a - x, b - y) < R.spawn.cotSafe - 1);
      const far = spots.filter(([a, b]) => Math.hypot(a - x, b - y) > R.spawn.cotSafe + 1);
      return {cot: B.state().cot, safe: R.spawn.cotSafe, near: near.filter(([a, b]) => d.canSpawnAt(a, b, 'clam')).length, nearAll: near.length,
        far: far.filter(([a, b]) => d.canSpawnAt(a, b, 'clam')).length, farAll: far.length}; });
    expect(r.cot).toBeTruthy();
    expect(r.safe).toBe(12);
    expect(r.nearAll, 'there were dark spots near it before').toBeGreaterThan(0);
    expect(r.near, 'none now').toBe(0);
    expect(r.far, 'farther away: unchanged').toBe(r.farAll);
  });

  test('THE COT: the dusk tip shows once (with no cot); losing all hearts with no cot still bags 25 %', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { window.__toasts = []; const t = Arcade.UI.toast; Arcade.UI.toast = (m, o) => { window.__toasts.push(String(m)); return t(m, o); }; });
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.nightFalls(); d.nightFalls(); });
    expect((await page.evaluate(() => window.__toasts)).filter(t => /Practice Cot/.test(t))).toEqual(['Craft a Practice Cot: you\'ll wake up next to it and lose less if the night goes badly.']);
    expect((await st(page)).cotTip).toBe(true);
    const inv = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(); d.give('dirt', 8 - (s.inv.dirt || 0)); d.give('reed', 4 - (s.inv.reed || 0)); for (let k = 0; k < 5; k++) d.hurt(1); return [Arcade.Blocktave.state().inv, Arcade.Blocktave.world().bags, Arcade.Blocktave.state().player]; });
    expect(inv[1].map(b => b.items), JSON.stringify(inv)).toEqual([{dirt: 2, reed: 1}]);
  });

  test('an old save (from before HP and the Zipper) loads and plays', async ({page}) => {
    const seen = {welcome: 1, mining: 1, night: 1, 'c-clam': 1, 'c-wisp': 1, 'c-rusher': 1, composer: 1, 'file-note': 1};
    await enter(page, {mode: 'touch', extra: {gameData: {blocktave: {mode: 'touch', seen, stats: {trumpet: {ore: 0, clams: 3, wisps: 1, mined: 40}}}}}});
    expect(await page.evaluate(() => Arcade.Blocktave.demo.stats().clams)).toBe(3);
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('baton', 1); d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 6); });
    expect(await calmByCards(page, id)).toBe(2);
    expect(await page.evaluate(() => Arcade.Blocktave.demo.stats().clams)).toBe(4);
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
    // every milestone twice: each chapter ends at 3 stars, 18 in all (6 chapters)
    const ids = await page.evaluate(() => window.BT_CHAPTERS.flatMap(c => c.goals.map(g => g.id)));
    for (const id of ids.concat(ids)) { await page.evaluate(i => Arcade.Blocktave.demo.award(i), id); await page.waitForTimeout(20); }
    expect(await page.evaluate(() => [1, 2, 3, 4, 5, 6].map(l => Arcade.store.level('blocktave', 'trumpet', l).stars))).toEqual([3, 3, 3, 3, 3, 3]);
    expect(await page.evaluate(() => Arcade.store.allStars('trumpet', 'blocktave'))).toBe(18);
    const lb = await page.evaluate(() => window.__lb);
    expect(lb.every(([g]) => g === 'blocktave')).toBe(true);
    expect(lb.reduce((a, [, , gain]) => a + gain, 0), 'one star event per milestone').toBe(18);
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

  // 20 random seeds, one per test: each its own page (one 20-load page ran ~8 minutes in WebKit, whose page process can
  // crash on a CI machine; a short test loses only itself to a crash, and its one retry is short), side by side
  const SEEDS = Array.from({length: 20}, (_, k) => (k * 40503 + 1234567) >>> 0);
  for (let part = 0; part < 20; part++) test(`chapter 1 end to end on random seed ${part + 1} of 20: Maple → planks → mallet → 10 Tone Ore → a shelter with a door`, async ({page}) => {
    const seeds = SEEDS.slice(part, part + 1);
    const watch = await prepare(page, {store: store('trumpet', 'touch')});
    // what the page saw (printed when a seed fails): the longest gap between animation frames, and any hidden / pagehide
    await page.addInitScript(() => {
      const L = window.__btLog = {gap: 0, vis: []}; let last = 0;
      const f = t => { if (last) L.gap = Math.max(L.gap, Math.round(t - last)); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
      document.addEventListener('visibilitychange', () => L.vis.push((document.hidden ? 'hidden ' : 'visible ') + Math.round(performance.now())));
      addEventListener('pagehide', () => L.vis.push('pagehide ' + Math.round(performance.now())));
    });
    const log = () => Promise.race([page.evaluate(() => JSON.stringify(window.__btLog)).catch(e => 'page gone: ' + e.message.split('\n')[0]),
      new Promise(r => setTimeout(() => r('no answer in 3 s (the page is stuck)'), 3000))]);
    for (const seed of seeds) try {
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
        // the loot lands beside you and is picked up: the game's test clock runs a quarter second at a time until it is
        // (the world moves at most 50 ms a frame, so on a slow runner's frames this took many seconds)
        await page.waitForFunction(() => { const B = Arcade.Blocktave; if (B.state().drops.length) B.demo.step(.25); return !B.state().drops.length; },
          null, {timeout: 30_000, polling: 100});
        return t;
      };
      await mineNear('maple'); await craft('maple-planks');
      await mineNear('cork'); await craft('wooden-mallet');
      expect((await st(page)).inv.mallet1, `seed ${seed}: the mallet`).toBe(1);
      for (let k = 0; k < 10; k++) await mineNear('toneOre');
      await mineNear('maple'); await craft('maple-planks'); await craft('door');
      expect((await st(page)).inv.door, `seed ${seed}: a door`).toBe(1);
      await page.evaluate(() => Arcade.Blocktave.demo.shelter());
      await settleFor(page, 400);
      const ms = await page.evaluate(() => ['mallet', 'ore10', 'shelter'].map(id => !!((Arcade.store.gameData('blocktave').ms || {}).trumpet || {})[id]));
      expect(ms, `seed ${seed}: chapter 1's three milestones`).toEqual([true, true, true]);
      await page.evaluate(() => { Arcade.Blocktave.showHub(); localStorage.clear(); });   // (the hub first: leaving the world saves it)
    } catch (e) { e.message += `\n  seed ${seed}; the page: ${await log()}`; throw e; }
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
    // (they are dropped when a frame is drawn: a busy WebKit runner can go seconds without one)
    await expect.poll(async () => (await st(page)).labels.length, {message: 'they fade out after pickupLabelMs', timeout: 15_000}).toBe(0);
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
    // read in the same call as the mining: on a busy machine a frame could end the swing before a second call
    let fx = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1; d.give('mallet1', 1); d.put(x, y, 'dirt'); d.mine(x, y);
      return Arcade.Blocktave.state().fx; });
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

  /* MINING UNDERGROUND NEVER ERASES THE CAVE BACKDROP: it goes behind every open tile under the GENERATED ground (w.ground),
     however deep the student digs; the outside layers never show through a shaft or a mined tunnel */
  const frames = (page, ms = 120) => page.evaluate(m => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, m)))), ms);
  /** a shaft from the surface at column x down to row `bottom`, then 3 tiles mined sideways and 1 below; the player stands in it */
  const digShaft = (page, x, bottom) => page.evaluate(({x, bottom}) => {
    const d = Arcade.Blocktave.demo, BW = Arcade.BlocktaveWorld, W = Arcade.Blocktave.world(), g = BW.groundAt(W, x), dug = [];
    for (let y = g; y <= bottom; y++) { d.put(x, y, 'air'); dug.push([x, y]); }
    for (let k = 1; k <= 3; k++) { d.put(x + k, bottom, 'air'); dug.push([x + k, bottom]); }
    d.put(x + 3, bottom + 1, 'air'); dug.push([x + 3, bottom + 1]);
    d.put(x, bottom + 1, 'slate'); d.put(x + 1, bottom + 1, 'slate'); d.put(x + 2, bottom + 1, 'slate'); d.put(x + 3, bottom + 2, 'slate');
    d.tp(x, bottom);
    return {g, dug, top: BW.top(W, x)};
  }, {x, bottom});
  /** the canvas colors in the middle of these tiles (no light shading: rules.js light.maxShade 0 for the check) */
  const tileColors = (page, cells) => page.evaluate(cells => {
    const cv = document.getElementById('btCanvas'), g = cv.getContext('2d'), s = Arcade.Blocktave.state(), S = s.tile, WPX = cv.width / innerWidth, cam = s.backdrop.cam;
    return cells.map(([x, y]) => { const X = Math.round(((x + .5) * S - cam.x) * WPX), Y = Math.round(((y + .5) * S - cam.y) * WPX); return Array.from(g.getImageData(X, Y, 1, 1).data.slice(0, 3)); });
  }, cells);
  const CAVE = [[0x22, 0x1e, 0x3d], [0x2a, 0x25, 0x49], [0x43, 0x3c, 0x6e]];
  const nearCave = c => Math.min(...CAVE.map(k => Math.hypot(c[0] - k[0], c[1] - k[1], c[2] - k[2]))) < 40;

  test('mining underground never erases the cave backdrop: a shaft into the Bass Depths and its side tunnel show cave rock, never the outside', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { Arcade.Blocktave.demo.time(60); window.BT_RULES.light.maxShade = 0; });
    const R = await page.evaluate(() => ({deepY: window.BT_RULES.world.deepY, depth: window.BT_RULES.light.caveDepth}));
    const sh = await digShaft(page, 44, R.deepY + 6);
    expect(sh.top, 'the live top moved down to the bottom of the shaft').toBeGreaterThan(R.deepY);
    await frames(page);
    const bd = (await st(page)).backdrop, at = new Set(bd.cave.at);
    // every dug tile below the GENERATED ground that's on screen gets the cave texture
    const shown = await page.evaluate(cells => { const s = Arcade.Blocktave.state(), S = s.tile, c = s.backdrop.cam;
      return cells.filter(([x, y]) => x * S >= c.x && (x + 1) * S <= c.x + innerWidth && y * S >= c.y && (y + 1) * S <= c.y + innerHeight); }, sh.dug.filter(([, y]) => y > sh.g));
    expect(shown.length, 'the shaft is on screen').toBeGreaterThan(8);
    expect(shown.filter(([x, y]) => !at.has(`${x},${y}`)), 'behind every dug tile').toEqual([]);
    expect(bd.clef, 'the bass clef in the Bass Depths').toBe('bass');
    // the canvas there: the cave's own colors (fully faded in: caveDepth rows under the generated ground), never the sky or a biome layer
    const deepCells = shown.filter(([, y]) => y - sh.g >= R.depth + 1);
    const cols = await tileColors(page, deepCells);
    expect(cols.filter(c => !nearCave(c)).length, JSON.stringify(cols.slice(0, 6))).toBeLessThanOrEqual(Math.floor(cols.length * .15));
    // above the generated ground nothing changes: no cave texture there
    expect(bd.cave.at.filter(k => { const [x, y] = k.split(',').map(Number); return y <= sh.g && x === 44; })).toEqual([]);
    // the light still follows the LIVE ground: the shaft is lit by day near its mouth
    expect(await page.evaluate(({x, y}) => Arcade.BlocktaveWorld.light(Arcade.Blocktave.world(), x, y, 1, [], window.BT_RULES), {x: 44, y: sh.g + 2})).toBeGreaterThan(.4);
  });

  test('a pit opened to the sky in the middle layer: cave rock behind it, and its bottom is still "Underground" (not the surface)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { Arcade.Blocktave.demo.time(60); window.BT_RULES.light.maxShade = 0; });
    const R = await page.evaluate(() => window.BT_RULES.world);
    const g0 = await page.evaluate(() => Arcade.BlocktaveWorld.groundAt(Arcade.Blocktave.world(), 60));
    const sh = await digShaft(page, 60, g0 + 14);
    expect(g0 + 14).toBeLessThan(R.deepY);
    await frames(page);
    const bd = (await st(page)).backdrop, at = new Set(bd.cave.at);
    const shown = await page.evaluate(cells => { const s = Arcade.Blocktave.state(), S = s.tile, c = s.backdrop.cam;
      return cells.filter(([x, y]) => x * S >= c.x && (x + 1) * S <= c.x + innerWidth && y * S >= c.y && (y + 1) * S <= c.y + innerHeight); }, sh.dug.filter(([, y]) => y > sh.g));
    expect(shown.length, 'the pit is on screen').toBeGreaterThan(8);
    expect(shown.filter(([x, y]) => !at.has(`${x},${y}`)), 'cave behind every tile of the pit').toEqual([]);
    const cols = await tileColors(page, sh.dug.filter(([, y]) => y >= sh.g + 6).slice(0, 8));
    expect(cols.filter(c => !nearCave(c)).length, JSON.stringify(cols)).toBeLessThanOrEqual(1);
    const z = await page.evaluate(y => Arcade.BlocktaveWorld.zone(Arcade.Blocktave.world(), 60, y), g0 + 14);
    expect(z.layer, 'counted from the generated ground').toBe('middle');
  });

  test('an older save (no ground line) loads with exactly the ground line of a fresh world from its seed', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES;
      Arcade.Blocktave.showHub();                                           // (leaving saves the world: write the old one after)
      const w = BW.generate(9091, R, 2), o = BW.encode(w); o.v = 2;
      for (let y = BW.top(w, 50); y < R.world.deepY + 4; y++) w.b[y * w.w + 50] = BW.ID.air;   // a shaft dug before this change
      const o2 = BW.encode(w); o2.v = 2;
      localStorage.setItem(Arcade.Blocktave.key, JSON.stringify(o2));
      return {saved: 'ground' in o2, fresh: Array.from(BW.generate(9091, R).ground)};
    });
    expect(r.saved, 'the ground line is never saved (old code ignores nothing new)').toBe(false);
    await page.evaluate(() => Arcade.Blocktave.begin(1));
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    const g = await page.evaluate(() => Array.from(Arcade.BlocktaveWorld.groundOf(Arcade.Blocktave.world())));
    expect(g).toEqual(r.fresh);
    // a world the seed can't rebuild (another size): the live top, smoothed, once
    const fb = await page.evaluate(() => { const BW = Arcade.BlocktaveWorld, w = {w: 40, h: 30, seed: 1, b: new Uint8Array(40 * 30)};
      for (let x = 0; x < 40; x++) for (let y = 12; y < 30; y++) w.b[y * 40 + x] = BW.ID.slate;
      for (let y = 12; y < 25; y++) w.b[y * 40 + 20] = BW.ID.air;                       // one shaft: the median ignores it
      return Array.from(BW.groundOf(w)); });
    expect(fb.every(v => v === 12)).toBe(true);
  });

  test('GALLERY=1: before / after of a shaft in the Bass Depths (docs/gallery/blocktave-cave-shaft.png)', async ({page}) => {
    test.skip(!process.env.GALLERY, 'only with GALLERY=1');
    await page.setViewportSize({width: 1100, height: 700});
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    const R = await page.evaluate(() => window.BT_RULES.world);
    await digShaft(page, 44, R.deepY + 6);
    await frames(page, 200);
    // BEFORE: the cave counted from the LIVE top (how it was), AFTER: from the generated ground
    await page.evaluate(() => { const BW = Arcade.BlocktaveWorld; window.__ga = BW.groundAt; BW.groundAt = (w, x) => BW.top(w, x); });
    await frames(page, 200);
    const before = (await page.screenshot()).toString('base64');
    await page.evaluate(() => { Arcade.BlocktaveWorld.groundAt = window.__ga; });
    await frames(page, 200);
    const after = (await page.screenshot()).toString('base64');
    const png = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + src; });
      const [A, B] = await Promise.all([load(a), load(b)]), c = document.createElement('canvas'), pad = 40;
      c.width = A.width + B.width + 30; c.height = A.height + pad; const g = c.getContext('2d');
      g.fillStyle = '#0b0b1a'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = '700 24px sans-serif';
      g.fillText('Before: the outside shows through the shaft', 10, 28); g.fillText('After: cave rock behind every dug tile', A.width + 40, 28);
      g.drawImage(A, 0, pad); g.drawImage(B, A.width + 30, pad);
      return c.toDataURL('image/png').split(',')[1];
    }, [before, after]);
    require('fs').writeFileSync(require('path').join(__dirname, '..', 'docs', 'gallery', 'blocktave-cave-shaft.png'), Buffer.from(png, 'base64'));
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

test.describe('Blocktave: cave music deep underground', () => {
  /** stand `depth` rows below the ground near the player (a pocket dug there), then let stepWay measure it */
  const down = async (page, depth) => { await page.evaluate(dp => { const d = Arcade.Blocktave.demo, W = Arcade.Blocktave.world(), B = Arcade.BlocktaveWorld,
      x = Math.floor(Arcade.Blocktave.state().player.x), g = B.top(W, x);
    for (let y = g + dp - 3; y <= g + dp; y++) for (let k = -3; k <= 3; k++) d.put(x + k, y, 'air'); d.put(x, g + dp + 1, 'slate');
    for (let k = -3; k <= 3; k++) d.put(x + k, g + dp + 1, 'slate'); d.tp(x, g + dp); }, depth);
    await page.waitForFunction(dp => { const w = Arcade.Blocktave.state().way; return w && Math.abs(w.depth - dp) <= 1; }, depth, {timeout: 4000}); };
  const surface = page => page.evaluate(() => { const W = Arcade.Blocktave.world(); Arcade.Blocktave.demo.tp(W.spawn.x, W.spawn.y); });

  test('deeper than caveRows = the cave track (it wins over night); back above leaveRows = day/night; between them nothing switches', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', NO_AUDIO_CLOCK);
    await enter(page, {mode: 'touch'});
    await page.mouse.click(5, 300);                                            // a tap: the audio starts
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    await page.waitForFunction(() => Arcade.Blocktave.state().music === 'blocktave-day');
    const M = await page.evaluate(() => window.BT_RULES.music);
    await down(page, M.caveRows + 3);
    await page.waitForFunction(() => Arcade.Blocktave.state().music === 'blocktave-cave', null, {timeout: 4000});
    await page.waitForFunction(() => { const m = Arcade.Sfx.musicState().music; return m.want === 'blocktave-cave' && m.playing === 'built-in'; }, null, {timeout: 6000});
    // night + underground = cave
    await page.evaluate(() => Arcade.Blocktave.demo.time(window.BT_RULES.dayS + 30));
    await settleFor(page, 400);
    expect((await st(page)).music).toBe('blocktave-cave');
    // hovering between leaveRows and caveRows: no switch either way
    await down(page, Math.round((M.caveRows + M.leaveRows) / 2));
    await settleFor(page, 700);
    expect((await st(page)).music, 'still the cave on the way up').toBe('blocktave-cave');
    await surface(page);
    await page.waitForFunction(() => Arcade.Blocktave.state().music === 'blocktave-night', null, {timeout: 4000});
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    await page.waitForFunction(() => Arcade.Blocktave.state().music === 'blocktave-day', null, {timeout: 4000});
    await down(page, Math.round((M.caveRows + M.leaveRows) / 2));
    await settleFor(page, 700);
    expect((await st(page)).music, 'not the cave yet on the way down').toBe('blocktave-day');
    expect(await page.evaluate(() => Arcade.Sfx.musicState().music.want)).toBe('blocktave-day');
  });

  test('nothing plays while a card listens (INSTRUMENT mode); the cave track comes back after', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', NO_AUDIO_CLOCK);
    await enter(page, {mode: 'inst'});
    await page.mouse.click(5, 300);
    const M = await page.evaluate(() => window.BT_RULES.music);
    await down(page, M.caveRows + 3);
    await page.waitForFunction(() => Arcade.Sfx.musicState().music.playing === 'built-in', null, {timeout: 6000});
    const at = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      d.give('mallet1', 1); d.put(x, y, 'toneOre'); d.mine(x, y); return !!Arcade.BlocktaveCard.current; });
    expect(at).toBe(true);
    await page.waitForFunction(() => Arcade.Pitch.listening() && Arcade.Sfx.musicState().music.playing === null, null, {timeout: 4000});
    await page.evaluate(() => Arcade.BlocktaveCard.current.close());
    await page.waitForFunction(() => Arcade.Sfx.musicState().music.playing === 'built-in', null, {timeout: 6000});
  });
});

test.describe('Blocktave: the CRAFT panel layout (materials right under the slots)', () => {
  /** lots of materials (so the panel scrolls), the craft panel open */
  const openCraft = async page => {
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, I = window.BT_ITEMS;
      Object.keys(I).filter(k => I[k].kind !== 'tool').forEach(k => d.give(k, 3)); });
    await page.keyboard.press('c');
    await expect(page.locator('#craft')).toBeVisible();
  };
  const box = (page, sel) => page.locator(sel).first().evaluate(e => { const b = e.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height}; });
  const noOverflow = page => page.evaluate(() => ['craft', 'craftMain', 'bookWrap'].every(id => { const e = document.getElementById(id); return e.hidden || e.scrollWidth <= e.clientWidth + 1; })
    && document.documentElement.scrollWidth <= innerWidth);

  for (const [name, vp] of [['Chromebook', {width: 1366, height: 768}], ['iPad landscape', {width: 1180, height: 820}]]) {
    test(`wide (${name}): two columns with the book open, the materials within 300 px of the slots; the book closed = full width`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      await openCraft(page);
      await page.locator('#bookBtn').click();
      await expect(page.locator('#craft')).toHaveClass(/wide/);
      await expect(page.locator('#craftTabs')).toBeHidden();
      await expect(page.locator('#bookWrap')).toBeVisible();
      await expect(page.locator('#craftItems')).toBeVisible();
      const slots = await box(page, '#measure'), mat = await box(page, '#craftItems .bt-mat'), main = await box(page, '#craftMain'), bk = await box(page, '#bookWrap');
      expect(mat.t - slots.b, 'the first materials row right under the slots').toBeLessThanOrEqual(300);
      expect(mat.t).toBeGreaterThan(slots.b);
      expect(bk.l, 'the book is the right column').toBeGreaterThanOrEqual(main.r - 1);
      expect(Math.abs(bk.t - main.t)).toBeLessThan(8);
      // the search box sits at the top of the right column
      const se = await box(page, '#bookWrap .bt-search');
      expect(se.t).toBeGreaterThanOrEqual(bk.t - 1);
      expect(se.t).toBeLessThan(bk.t + 20);
      // the book has its own scroll: scrolling it never moves the slots
      const sc = await page.locator('#bookWrap').evaluate(e => { e.scrollTop = e.scrollHeight; return e.scrollTop; });
      expect(sc, 'the book scrolls by itself').toBeGreaterThan(0);
      expect((await box(page, '#measure')).t).toBeCloseTo(slots.t, 0);
      expect(await noOverflow(page)).toBe(true);
      // the book closed: the left column takes the full width
      await page.locator('#bookBtn').click();
      await expect(page.locator('#bookWrap')).toBeHidden();
      const panel = await page.locator('#craft').evaluate(e => e.clientWidth), m2 = await box(page, '#craftMain');
      expect(m2.w).toBeGreaterThan(panel - 40);
      expect(await noOverflow(page)).toBe(true);
    });
  }

  for (const [name, vp] of [['phone', {width: 390, height: 844}], ['iPad portrait', {width: 820, height: 1180}]]) {
    test(`narrow (${name}): the bench stays visible while the materials scroll; the tabs switch; a recipe fills the slots and goes back to Materials`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      await openCraft(page);
      await expect(page.locator('#craft')).not.toHaveClass(/wide/);
      await expect(page.locator('#craftTabs')).toBeVisible();
      await expect(page.locator('#tabMats')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#matsPane')).toBeVisible();
      await expect(page.locator('#bookWrap')).toBeHidden();
      for (const t of ['#tabMats', '#tabBook']) expect((await box(page, t)).h, 'a tab ≥ 48 px').toBeGreaterThanOrEqual(48);
      // scroll the panel to the end: the bench is still on screen, inside the panel
      const scrolled = await page.locator('#craft').evaluate(e => { e.scrollTop = e.scrollHeight; return e.scrollTop; });
      if (name === 'phone') expect(scrolled, 'the panel scrolls on a phone').toBeGreaterThan(50);
      await page.waitForTimeout(50);
      const panel = await box(page, '#craft'), bench = await box(page, '#bench'), last = await box(page, '#craftItems .bt-mat:last-child');
      expect(bench.t, 'the bench stays at the top').toBeGreaterThanOrEqual(panel.t - 1);
      expect(bench.b).toBeLessThanOrEqual(panel.b);
      expect(last.b, 'the last material can be reached').toBeLessThanOrEqual(panel.b + 1);
      expect(last.t, 'and is not under the bench').toBeGreaterThanOrEqual(bench.b - 1);
      expect(await noOverflow(page)).toBe(true);
      // the tabs switch (and the Recipe Book button picks the book tab)
      await page.locator('#tabBook').click();
      await expect(page.locator('#tabBook')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#bookWrap')).toBeVisible();
      await expect(page.locator('#matsPane')).toBeHidden();
      await expect(page.locator('#bookBtn')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#tabMats').click();
      await expect(page.locator('#matsPane')).toBeVisible();
      await expect(page.locator('#bookWrap')).toBeHidden();
      await page.locator('#bookBtn').click();
      await expect(page.locator('#tabBook')).toHaveAttribute('aria-selected', 'true');
      expect(await noOverflow(page)).toBe(true);
      // a recipe tap fills the slots and goes back to Materials
      await page.locator('#book .bt-rec[data-id="door"]').click();
      expect((await st(page)).slots).toEqual(['planks', 'planks', 'planks', null]);
      await expect(page.locator('#tabMats')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#matsPane')).toBeVisible();
      await expect(page.locator('#measure .bt-slot.full')).toHaveCount(3);
      await expect(page.locator('#measure .bt-slot.full').first()).toBeInViewport();
    });
  }

  for (const [name, vp] of [['phone', {width: 390, height: 844}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`dragging (${name}): from the last materials row onto the bench = the next slot; a drop on the bench off a slot works; the slots light up; tap-to-add unchanged`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      await openCraft(page);
      // tap-to-add
      await page.locator('#craftItems [data-id="planks"]').click();
      expect((await st(page)).slots).toEqual(['planks', null, null, null]);
      // the last row: scroll it into view, drag it onto the first empty slot's area of the bench
      await page.locator('#craft').evaluate(e => { e.scrollTop = e.scrollHeight; });
      const lastId = await page.locator('#craftItems .bt-mat:last-child').getAttribute('data-id');
      const src = await box(page, '#craftItems .bt-mat:last-child'), slot = await box(page, '#measure .bt-slot:not(.full)');
      await page.mouse.move(src.l + 20, src.t + 20); await page.mouse.down();
      await page.mouse.move(src.l + 40, src.t - 10, {steps: 4});
      await expect(page.locator('#bench')).toHaveClass(/dragging/);
      await page.mouse.move(slot.l + slot.w / 2, slot.t + slot.h / 2, {steps: 8});
      await expect(page.locator('#bench')).toHaveClass(/drop-on/);
      await page.mouse.up();
      expect((await st(page)).slots).toEqual(['planks', lastId, null, null]);
      await expect(page.locator('#bench')).not.toHaveClass(/dragging/);
      // a drop on the bench but OFF any slot (on its words) = the next empty slot
      await page.locator('#craft').evaluate(e => { e.scrollTop = 0; });
      const say = await box(page, '.bt-bench-say'), cork = await box(page, '#craftItems [data-id="cork"]');
      await page.mouse.move(cork.l + 20, cork.t + 20); await page.mouse.down();
      await page.mouse.move(cork.l + 50, cork.t - 20, {steps: 4}); await page.mouse.move(say.l + 10, say.t + say.h / 2, {steps: 8}); await page.mouse.up();
      expect((await st(page)).slots).toEqual(['planks', lastId, 'cork', null]);
    });
  }

  test('dragging near the top of a scrolled panel scrolls it toward the slots (narrow)', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await enter(page, {mode: 'touch'});
    await openCraft(page);
    const before = await page.locator('#craft').evaluate(e => { e.scrollTop = e.scrollHeight; return e.scrollTop; });
    expect(before).toBeGreaterThan(50);
    const src = await box(page, '#craftItems .bt-mat:last-child'), panel = await box(page, '#craft');
    await page.mouse.move(src.l + 20, src.t + 20); await page.mouse.down();
    await page.mouse.move(src.l + 30, panel.t + 10, {steps: 10});
    // the panel scrolls on the page's animation frames, which a busy WebKit runner starves: wait for the scroll itself
    // (on a timer), never a fixed time
    await expect.poll(() => page.locator('#craft').evaluate(e => e.scrollTop), {message: 'the panel scrolled up', intervals: [100], timeout: 10000}).toBeLessThan(before);
    await page.mouse.move(src.l + 30, panel.t + 10); await page.mouse.up();
  });

  test('the materials heading says how; the first open shows a one-line tip, later opens do not', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.keyboard.press('c');
    await expect(page.locator('#matsPane .ui-kicker')).toContainText('Tap a material to add it (or drag it)');
    await expect(page.locator('#craftTip')).toHaveText('Tip: tap a material, or tap a recipe in the Recipe Book to fill the slots for you.');
    await expect(page.locator('#craftTip')).toBeVisible();
    await page.keyboard.press('c');
    await expect(page.locator('#craft')).toBeHidden();
    await page.keyboard.press('c');
    await expect(page.locator('#craft')).toBeVisible();
    await expect(page.locator('#craftTip')).toBeHidden();
  });
});

test.describe('Blocktave: the Recipe Book search', () => {
  /** every recipe found, the craft panel + its book open */
  const openBook = async page => {
    await page.evaluate(() => { const g = Arcade.store.gameData('blocktave'); g.found = Object.fromEntries(window.BT_RECIPES.map(r => [r.id, 1])); Arcade.store.saveGameData('blocktave'); });
    await page.keyboard.press('c');
    await page.locator('#bookBtn').click();
    await expect(page.locator('#bookSearch')).toBeVisible();
  };
  const selIndex = page => page.evaluate(() => [...document.querySelectorAll('.bt-hot')].findIndex(e => e.classList.contains('sel')));

  test('"plank" finds Maple Planks and everything made with planks (marked); "xyz" says so; ✕ and Esc clear it; Esc again closes the book', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await openBook(page);
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id), 'never focused by itself').not.toBe('bookSearch');
    await page.locator('#bookSearch').fill('PLANK');
    const want = await page.evaluate(() => { const I = window.BT_ITEMS, n = id => (I[id] && I[id].name || id).toLowerCase();
      return window.BT_RECIPES.filter(r => r.name.toLowerCase().includes('plank') || n(r.out).includes('plank') || r.in.some(i => n(i).includes('plank'))).map(r => r.id).sort(); });
    const got = (await page.locator('#book .bt-rec[data-id]').evaluateAll(els => els.map(e => e.dataset.id))).sort();
    expect(got).toEqual(want);
    expect(got).toContain('maple-planks');
    expect(got).toContain('wooden-mallet');
    expect(got.length).toBeLessThan(await page.evaluate(() => window.BT_RECIPES.length));
    await expect(page.locator('#book .bt-rec[data-id="maple-planks"] b mark')).toHaveText('Plank');
    await expect(page.locator('#book .bt-rec[data-id="wooden-mallet"] .bt-why mark').first()).toHaveText('Plank');
    // a performance word
    await page.locator('#bookSearch').fill('scale');
    expect(await page.locator('#book .bt-rec[data-id]').count()).toBeGreaterThan(0);
    // nothing
    await page.locator('#bookSearch').fill('xyz');
    await expect(page.locator('#bookEmpty')).toHaveText("No recipes match 'xyz'.");
    await expect(page.locator('#book')).toBeHidden();
    // ✕ clears
    await page.locator('#bookSearchX').click();
    await expect(page.locator('#bookSearch')).toHaveValue('');
    await expect(page.locator('#bookEmpty')).toBeHidden();
    expect(await page.locator('#book .bt-rec[data-id]').count()).toBe(await page.evaluate(() => window.BT_RECIPES.length));
    // Esc clears, a second Esc closes the book (never the pause menu)
    await page.locator('#bookSearch').fill('mallet');
    await page.locator('#bookSearch').press('Escape');
    await expect(page.locator('#bookSearch')).toHaveValue('');
    await expect(page.locator('#bookWrap')).toBeVisible();
    await page.locator('#bookSearch').press('Escape');
    await expect(page.locator('#bookWrap')).toBeHidden();
    await expect(page.locator('#uiPause')).toBeHidden();
    // closing the book clears the search; "/" focuses it
    await page.locator('#bookBtn').click();
    await page.locator('#bookSearch').fill('door');
    await page.locator('#craftClose').click();
    await page.keyboard.press('c');
    await page.keyboard.press('/');
    await expect(page.locator('#bookSearch')).toBeFocused();
    await expect(page.locator('#bookSearch')).toHaveValue('');
  });

  test('typing in the field never controls the game: "e", "c", "1", Space, W/A/D, B', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await openBook(page);
    const before = await st(page), sel0 = await selIndex(page);
    await page.locator('#bookSearch').focus();
    await page.keyboard.type('ec1 wad3 b');
    await page.waitForTimeout(400);
    const s = await st(page);
    await expect(page.locator('#bookSearch')).toHaveValue('ec1 wad3 b');
    expect(s.panel, 'still the craft panel (E / C did nothing)').toBe('craft');
    expect(s.build).toBe(before.build);
    expect(Math.abs(s.player.x - before.player.x)).toBeLessThan(.01);
    expect(await selIndex(page), 'the hotbar slot did not change').toBe(sel0);
  });

  for (const [name, vp] of [['phone', {width: 390, height: 844}], ['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`the search field fits (${name})`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      await openBook(page);
      const r = await page.evaluate(() => { const a = document.getElementById('bookSearch').getBoundingClientRect(); return {left: a.left, right: a.right, h: a.height, vw: innerWidth}; });
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(r.vw + .5);
      expect(r.h).toBeGreaterThanOrEqual(44);
      await page.locator('#bookSearch').fill('a');
      const xb = await page.locator('#bookSearchX').boundingBox();
      expect(xb.width).toBeGreaterThanOrEqual(44);
      expect(xb.x + xb.width).toBeLessThanOrEqual(r.right + .5);
    });
  }
});

test.describe('Blocktave: PAUSE right above the milestones box', () => {
  for (const [name, vp] of [['phone portrait', {width: 390, height: 844}], ['iPad portrait', {width: 820, height: 1180}], ['iPad landscape', {width: 1180, height: 820}],
    ['Chromebook', {width: 1366, height: 768}], ['short landscape', {width: 844, height: 390}]]) {
    test(`the pause button sits on top of the goals and covers no HUD piece (${name})`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      const r = await page.evaluate(() => {
        const box = el => { if (!el || !el.getClientRects().length) return null; const b = el.getBoundingClientRect(); return b.width && b.height ? {l: b.left, t: b.top, r: b.right, b: b.bottom} : null; };
        const p = box(document.getElementById('uiPauseBtn')), g = box(document.getElementById('goals'));
        const others = {hearts: '#hearts', hud: '.bt-hud', hotbar: '#hotbar', bottom: '.bt-bottom', padMove: '#padMove', padAct: '#padAct', courage: '#courage'};
        const hits = Object.entries(others).filter(([, q]) => { const o = box(document.querySelector(q)); return o && p.l < o.r && o.l < p.r && p.t < o.b && o.t < p.b; }).map(([k]) => k);
        return {p, g, hits, inset: 12};
      });
      expect(r.p, 'the pause button shows').not.toBeNull();
      expect(r.hits, 'nothing under the pause button').toEqual([]);
      if (r.g) {
        expect(Math.abs(r.p.l - r.g.l), 'the same left edge').toBeLessThanOrEqual(2);
        const gap = r.g.t - r.p.b;
        expect(gap, 'right above the goals').toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThanOrEqual(16);
      } else {
        expect(name, 'the goals hide only in short landscape').toBe('short landscape');
        expect(r.p.l).toBeGreaterThanOrEqual(10);
        expect(r.p.t, 'in the goals\' spot: the top-left').toBeLessThanOrEqual(20);
      }
      // a card never sits under it
      await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
        d.give('mallet1', 1); d.put(x, y, 'toneOre'); d.mine(x, y); });
      const cov = await page.evaluate(() => { const a = document.getElementById('uiPauseBtn').getBoundingClientRect(), c = document.querySelector('.bt-card'); if (!c) return false; const b = c.getBoundingClientRect();
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; });
      expect(cov, 'a card is never under the pause button').toBe(false);
      await page.evaluate(() => Arcade.BlocktaveCard.current && Arcade.BlocktaveCard.current.close());
      // P still pauses, P again resumes
      await page.keyboard.press('p');
      await expect(page.locator('#uiPause')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#uiPause')).toBeHidden();
    });
  }
});

test.describe('Blocktave: the count-off you can hear on rhythm cards', () => {
  /** a Rhythm Rock beside the player, mined: its card opens (the audio already started by a tap) */
  const rockCard = page => page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
    d.give('mallet1', 1); d.put(x, y, 'rhythmRock'); d.mine(x, y); const c = Arcade.BlocktaveCard.current; return c && c.state(); });
  const spacing = cs => cs.slice(1).map((k, i) => k.t - cs[i].t);

  test('TOUCH: one measure of clicks on the audio clock (beat 1 accented, evenly spaced, none from the downbeat on); the setting OFF = silent', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', NO_AUDIO_CLOCK);
    await enter(page, {mode: 'touch'});
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    const s = await rockCard(page);
    expect(s.kind).toBe('rhythm');
    const co = s.countOff, R = await page.evaluate(() => window.BT_RULES.rhythm);
    expect(co.on).toBe(true);
    expect(co.clicks.length).toBe(4);
    expect(co.clicks.map(k => k.accent)).toEqual([true, false, false, false]);
    const beat = 60 / R.bpm;
    spacing(co.clicks).forEach(d => expect(Math.abs(d - beat) * 1000, 'beat spacing').toBeLessThan(2));
    co.clicks.forEach(k => expect(k.perf, 'before the downbeat').toBeLessThan(s.t0 - 1));
    expect(Math.abs(s.t0 - co.clicks[3].perf - beat * 1000), 'the downbeat comes a beat after the last click').toBeLessThan(2);
    expect(co.muteUntil, 'no microphone: nothing muted').toBeNull();
    await page.evaluate(() => Arcade.BlocktaveCard.current.close());
    // the setting OFF
    await page.evaluate(() => { const g = Arcade.store.gameData('blocktave'); g.countoff = false; Arcade.store.saveGameData('blocktave'); });
    const off = await rockCard(page);
    expect(off.countOff.on).toBe(false);
    expect(off.countOff.silentWhy).toBe('setting off');
    expect(off.countOff.clicks).toEqual([]);
  });

  test('3/4 counts three, 6/8 counts all six (eighth notes); 4/4 four', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', NO_AUDIO_CLOCK);
    await enter(page, {mode: 'touch'});
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    for (const [time, text, n, ticks] of [['3/4', 'q q q', 3, 12], ['6/8', 'q. q.', 6, 6], ['4/4', 'q q q q', 4, 12]]) {
      const s = await page.evaluate(({time, text}) => { const C = Arcade.BlocktaveCard; C.open({kind: 'rhythm', mode: 'touch', time, text, bpm: 80, at: {x: 300, y: 300}}); const st = C.current.state(); C.close(); return st; }, {time, text});
      expect(s.countOff.clicks.length, time).toBe(n);
      expect(s.countOff.clicks[0].accent).toBe(true);
      const want = 60 / 80 * ticks / 12;
      spacing(s.countOff.clicks).forEach(d => expect(Math.abs(d - want) * 1000, time).toBeLessThan(2));
    }
  });

  test('INSTRUMENT: the clicks mute the microphone until they have died away, never into the first note; ?demo autoPlay still passes', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', NO_AUDIO_CLOCK);
    await enter(page, {mode: 'inst'});
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    const s = await rockCard(page);
    const co = s.countOff, R = await page.evaluate(() => window.BT_RULES);
    expect(co.on).toBe(true);
    expect(co.muteUntil).not.toBeNull();
    // every click lands inside the mute, and the mute ends before the first note's window opens
    for (const k of co.clicks) expect(await page.evaluate(t => Arcade.Pitch.isSuppressed(t), k.perf + 60)).toBe(true);
    expect(co.muteUntil).toBeGreaterThanOrEqual(co.clicks[co.clicks.length - 1].perf + R.countOffEchoMs);
    expect(co.muteUntil, 'the first note\'s window stays open').toBeLessThanOrEqual(s.t0 - R.rhythm.lateMs);
    // a clap during the count-off never counts (it is before the first note), and the right performance, played by ?demo
    // (onsets at every note, minus the saved delay), still passes: the Rhythm Rock breaks and drops its item
    await page.evaluate(() => Arcade.Onsets.fake());
    await page.evaluate(() => Arcade.BlocktaveCard.current.answer());
    await waitCardGone(page);
    await expect.poll(async () => { const s = await st(page); return (s.inv.rhythm || 0) + s.drops.filter(d => d.item === 'rhythm').length; }, {timeout: 6000}).toBeGreaterThan(0);
  });

  test('INSTRUMENT: a tempo so fast that the mute would reach the first note keeps the count-in silent', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    const s = await page.evaluate(() => { Arcade.Pitch.pauseListening(false); const C = Arcade.BlocktaveCard; C.open({kind: 'rhythm', mode: 'inst', text: 'q q q q', bpm: 200, at: {x: 300, y: 300}}); const st = C.current.state(); C.close(); return st; });
    expect(s.countOff.on).toBe(false);
    expect(s.countOff.silentWhy).toMatch(/first note/);
  });
});

test.describe('Blocktave: the Neon Torch', () => {
  test('made from Planks + a Tone Shard; the first-time card; in the hotbar it lights the dark (drawn only: spawning unchanged); it can\'t be placed', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('planks', 1); d.give('tone', 1); d.craft('neon-torch'); d.answer(); });
    await waitCardGone(page);
    // the first time: the card ("A Neon Torch!")
    await expect(page.locator('#intro')).toContainText('A Neon Torch!');
    await page.locator('#intro [data-act=go]').click();
    let s = await st(page);
    expect(s.inv.torch).toBe(1);
    expect(s.hot, 'it went into the hotbar').toContain('torch');
    expect(s.torch).toBe(true);
    // underground at noon, in a dark room 20 rows down: 6 tiles away the drawn light is ≥ caveMin + .3 with it, not without
    await page.evaluate(() => Arcade.Blocktave.demo.time(60));
    const at = await page.evaluate(() => { const d = Arcade.Blocktave.demo, W = Arcade.Blocktave.world(), B = Arcade.BlocktaveWorld, x = Math.floor(Arcade.Blocktave.state().player.x), g = B.top(W, x), y = g + 20;
      for (let xx = x - 10; xx <= x + 10; xx++) for (let yy = y - 9; yy <= y + 1; yy++) d.put(xx, yy, (yy === y + 1 || yy === y - 9) ? 'slate' : 'air');
      d.tp(x, y); return {x, y}; });
    const lit = () => page.evaluate(({x, y}) => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(Arcade.Blocktave.lightAt(x + 6, y - 1))))), at);
    const R = await page.evaluate(() => window.BT_RULES.light);
    const withTorch = await lit();
    expect(withTorch).toBeGreaterThanOrEqual(R.caveMin + .3);
    const spawn = await page.evaluate(({x, y}) => Arcade.Blocktave.demo.canSpawnAt(x + 6, y, 'clam'), at);
    // out of the hotbar: the normal glow again (dimmer there)
    await page.evaluate(() => Arcade.Blocktave.demo.hotbar('torch', false));
    s = await st(page);
    expect(s.torch).toBe(false);
    const without = await lit();
    expect(without).toBeLessThan(withTorch - .1);
    // the spawn check is the same with or without it (night, the same tile)
    await page.evaluate(() => Arcade.Blocktave.demo.time(window.BT_RULES.dayS + 40));
    const spawnNoTorch = await page.evaluate(({x, y}) => Arcade.Blocktave.demo.canSpawnAt(x + 6, y, 'clam'), at);
    await page.evaluate(() => Arcade.Blocktave.demo.hotbar('torch', true));
    const spawnTorch = await page.evaluate(({x, y}) => Arcade.Blocktave.demo.canSpawnAt(x + 6, y, 'clam'), at);
    expect(spawnTorch, 'the torch never stops creatures appearing').toBe(spawnNoTorch);
    expect(spawn).toBe(spawnNoTorch);
    // it can't be placed
    const placed = await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; return d.place(x + 1, y, 'torch'); }, at);
    expect(placed).toBe(false);
    await expect(page.locator('.ui-toast', {hasText: 'Carry it in your hotbar to light the way'})).toBeVisible();
  });

  test('its icon shows in the hotbar, the inventory, a tooltip and the Recipe Book', async ({page}) => {
    await enter(page, {mode: 'touch', extra: {gameData: {blocktave: {mode: 'touch', seen: Object.assign({torch: 1}, {welcome: 1, mining: 1, night: 1, 'c-clam': 1, 'c-wisp': 1, 'c-rusher': 1, composer: 1, 'file-note': 1}), found: {'neon-torch': 1}}}}});
    await page.evaluate(() => Arcade.Blocktave.demo.give('torch', 1));
    const hot = page.locator('.bt-hot[data-item="torch"] img');
    await expect(hot).toBeVisible();
    expect(await hot.evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
    await hot.hover();
    await expect(page.locator('#btTip')).toContainText('Neon Torch');
    await page.keyboard.press('e');
    await expect(page.locator('#invGrid [data-item="torch"] img')).toBeVisible();
    await page.keyboard.press('e');
    await page.keyboard.press('c');
    await page.locator('#bookBtn').click();
    await expect(page.locator('#book .bt-rec[data-id="neon-torch"]')).toBeVisible();
  });
});

test.describe('Blocktave: other-clef scales sit on the staff (moved by octaves), and no staff is ever cut off', () => {
  test('every treble reader in the Bass Depths and every bass reader in the Treble Peaks: 4 scales × 5 and 8 notes stay near the staff, only octaves moved', {tag: '@slow'}, async ({page}) => {
    test.setTimeout(240_000);
    await enter(page, {mode: 'touch'});
    const members = await page.evaluate(() => Arcade.PLAYERS.filter(m => m !== 'snare').map(m => ({m, clef: Arcade.groupFor(m).clef})));
    expect(members.length).toBeGreaterThan(10);
    const bad = [];
    for (const {m, clef} of members) {
      await enter(page, {member: m, mode: 'touch'});
      const r = await page.evaluate(clef => {
        const A = Arcade, d = A.Blocktave.demo, R = window.BT_RULES, x = Math.floor(A.Blocktave.state().player.x);
        const y = clef === 'treble' ? R.world.deepY + 10 : R.world.peaksY - 8, other = clef === 'treble' ? 'bass' : 'treble';
        const FIT = {treble: [55, 84], bass: [36, 64]}[other], out = [];
        const member = A.memberById(A.store.player), group = A.groupFor(A.store.player, {hornStart: A.store.hornStart});
        for (const pool of ['Bb', 'Eb', 'F', 'Ab']) for (const n of [5, 8]) {
          const set = d.notesAt(x, y, n, {order: 'order', pool});
          const ref = A.buildSequence({member, group, notes: pool, order: 'order', level: 2, count: Math.max(n, 8)}).items.slice(0, n);
          const tag = `${pool} ×${n}`;
          if (set.clef !== other) out.push(`${tag}: clef ${set.clef}`);
          const inside = set.items.filter(it => it.midi >= FIT[0] && it.midi <= FIT[1]).length;
          if (inside / n < .8) out.push(`${tag}: only ${inside}/${n} in range`);
          set.items.forEach((it, k) => {
            const yy = A.noteY(other, it.show);
            if (yy < 0 || yy > 176) out.push(`${tag}: note ${k} more than 3 ledger lines out (y ${yy})`);
            const r0 = ref[k];
            if (it.n.letter !== r0.n.letter || (it.n.acc || 0) !== (r0.n.acc || 0)) out.push(`${tag}: note ${k} spelled differently`);
            if ((it.midi - r0.midi) % 12 || it.midi - r0.midi !== set.items[0].midi - ref[0].midi) out.push(`${tag}: note ${k} moved by a non-octave or unevenly`);
            if (it.pc !== r0.pc || it.sounding !== r0.sounding) out.push(`${tag}: note ${k}'s pitch to play changed`);
          });
          const sig = JSON.stringify(set.sig), sig0 = JSON.stringify(A.buildSequence({member, group, notes: pool, order: 'order', level: 2, count: 8}).sig);
          if (sig !== sig0) out.push(`${tag}: key signature changed`);
        }
        return out;
      }, clef);
      r.forEach(t => bad.push(`${m}: ${t}`));
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  test('own-clef scales are untouched (a trumpet in the middle layer): exactly buildSequence\'s notes, no shift, no hint line', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const A = Arcade, d = A.Blocktave.demo, W = A.Blocktave.world(), x = Math.floor(A.Blocktave.state().player.x), y = A.BlocktaveWorld.top(W, x) + 12;
      const member = A.memberById('trumpet'), group = A.groupFor('trumpet');
      return ['Bb', 'Eb', 'F', 'Ab'].map(pool => {
        const set = d.notesAt(x, y, 8, {order: 'order', pool}), ref = A.buildSequence({member, group, notes: pool, order: 'order', level: 2, count: 8}).items.slice(0, 8);
        return {same: JSON.stringify(set.items) === JSON.stringify(ref), shifted: set.shifted, other: set.other};
      });
    });
    r.forEach(x => expect(x).toEqual({same: true, shifted: false, other: false}));
  });

  test('the hint line shows on a moved scale for the first otherClefNames cards, then stops', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const notes = await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = Math.floor(Arcade.Blocktave.state().player.x);
      return Array.from({length: R.otherClefNames + 3}, () => d.spec('scale', x, R.world.deepY + 10, 5).note); });
    const n = await page.evaluate(() => window.BT_RULES.otherClefNames);
    expect(notes.slice(0, n).every(t => t === 'Bass clef! Play it where it sits on your instrument.')).toBe(true);
    expect(notes.slice(n).every(t => t === null)).toBe(true);
    // the card shows it under the staff
    await page.evaluate(() => { const g = Arcade.store.gameData('blocktave'); g.otherClef = 0; Arcade.store.saveGameData('blocktave'); });
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = Math.floor(Arcade.Blocktave.state().player.x); d.openSpec(d.spec('scale', x, R.world.deepY + 10, 5), x + 1, 40); });
    await expect(page.locator('.bt-card .bt-cnote')).toHaveText('Bass clef! Play it where it sits on your instrument.');
  });

  test('playing: INSTRUMENT holds the right notes (pitch class) through a moved bass-clef scale for trumpet; TOUCH answers by name', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = Math.floor(Arcade.Blocktave.state().player.x), y = R.world.deepY + 10;
      const sp = d.spec('scale', x, y, 5); window.__sp = sp; d.openSpec(sp, x + 1, 40); });
    expect(await page.evaluate(() => window.__sp.shifted && window.__sp.clef)).toBe('bass');
    for (let k = 0; k < 5; k++) {
      await page.keyboard.down(' '); await page.waitForTimeout(550); await page.keyboard.up(' '); await page.waitForTimeout(250);
    }
    await waitCardGone(page);
    expect(await page.evaluate(() => Arcade.Blocktave.state().card)).toBeFalsy();
    // TOUCH
    await enter(page, {mode: 'touch'});
    const ok = await page.evaluate(() => new Promise(res => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = Math.floor(Arcade.Blocktave.state().player.x);
      const sp = d.spec('scale', x, R.world.deepY + 10, 8); Arcade.BlocktaveCard.open(Object.assign({}, sp, {mode: 'touch', at: {x: 300, y: 300}, onDone: r => res(r.ok)})); Arcade.BlocktaveCard.current.answer(); }));
    expect(ok).toBe(true);
  });

  for (const [name, vp] of [['phone portrait', {width: 390, height: 844}], ['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`nothing is cut off: every note head and ledger line inside the card, even 6 ledger lines out (${name})`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      const check = () => page.evaluate(() => {
        const card = document.querySelector('.bt-card'), cr = card.getBoundingClientRect(), out = [];
        card.querySelectorAll('.bt-staff svg').forEach(svg => svg.querySelectorAll('ellipse.head, g[id^=btn] line, g[id^=btn] text.head').forEach(e => {
          const r = e.getBoundingClientRect();
          if (r.top < cr.top - .5 || r.bottom > cr.bottom + .5 || r.left < cr.left - .5 || r.right > cr.right + .5) out.push(`${e.tagName} outside the card`);
          // heads and ledger lines inside the staff box itself (an accidental's text box is its font's whole em box, so it's checked against the card only)
          const sr = svg.getBoundingClientRect();
          if (e.tagName !== 'text' && (r.top < sr.top - .5 || r.bottom > sr.bottom + .5)) out.push(`${e.tagName} outside its staff box`);
        }));
        if (cr.top < -.5 || cr.bottom > innerHeight + .5) out.push('the card leaves the screen');
        return out;
      });
      // the real bug: a trumpet's scale vein in the Bass Depths
      await page.evaluate(() => { const d = Arcade.Blocktave.demo, R = window.BT_RULES, x = Math.floor(Arcade.Blocktave.state().player.x); d.openSpec(d.spec('scale', x, R.world.deepY + 10, 8), x + 1, 40); });
      expect(await check()).toEqual([]);
      await page.evaluate(() => Arcade.BlocktaveCard.close());
      // a deliberately extreme card: notes 6 ledger lines above and below a treble staff (the box must grow, not clip)
      const hb = await page.evaluate(() => {
        const mk = (letter, oct, acc = 0) => { const n = {letter, oct, acc}; return {n, show: n, label: letter, midi: 0, sounding: 0, pc: 0}; };
        const items = [mk('C', 7, 1), mk('A', 6), mk('D', 3, -1), mk('C', 3)];
        Arcade.BlocktaveCard.open({kind: 'notes', mode: 'touch', items, clef: 'treble', sig: null, at: {x: 300, y: 400}});
        const svg = document.querySelector('.bt-card .bt-staff svg'); return svg.viewBox.baseVal.height;
      });
      expect(hb, 'the box grew beyond the usual staff').toBeGreaterThan(200);
      expect(await check()).toEqual([]);
    });
  }
});

test.describe('Blocktave: the Courage meter at the bottom of the world', () => {
  /** a room at the very bottom (bedrock below), the player in it; the courage clocks shortened (grace, drain) */
  const bottom = async (page, {grace = 1.2, drain = 2, dy = 0} = {}) => {
    // shorter numbers, taken up by the meter (out of the zone) before stepping down. Every wait in these tests runs the
    // game's own test clock (demo.step: settleFor / gameUntil), so a slow runner's frames never stretch the courage clock
    await page.evaluate(({grace, drain}) => { const K = window.BT_RULES.courage, W = Arcade.Blocktave.world(); K.graceS = grace; K.drainS = drain; K.refillS = .4;
      Arcade.Blocktave.demo.tp(W.spawn.x, W.spawn.y); }, {grace, drain});
    await settleFor(page, 150);
    return page.evaluate(({dy}) => {
    const d = Arcade.Blocktave.demo, W = Arcade.Blocktave.world(), s = Arcade.Blocktave.state();
    const x = Math.floor(s.player.x), floorY = W.h - 3;                // the last row above the 2 World Floor rows
    for (let xx = x - 6; xx <= x + 6; xx++) for (let y = floorY - 7; y <= floorY; y++) d.put(xx, y, (xx === x - 6 || xx === x + 6) ? 'slate' : 'air');
    for (let xx = x - 6; xx <= x + 6; xx++) d.put(xx, floorY - 8, 'slate');
    if (dy) for (let xx = x - 5; xx <= x + 5; xx++) for (let k = 0; k < dy; k++) d.put(xx, floorY - k, 'slate');
    d.tp(x, floorY - dy);
    return {x, y: floorY - dy};
  }, {dy});
  };
  const cg = page => page.evaluate(() => Arcade.Blocktave.state().courage);

  test('at the bottom with no building: the grace, then the meter drains and you are carried up, keeping everything', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(60); d.give('maple', 3); d.give('cork', 2); d.give('pearl', 1); });
    const before = await st(page);
    const spot = await bottom(page);
    await settleFor(page, 400);
    let c = await cg(page);
    expect(c.inZone).toBe(true);
    expect(c.value).toBe(1);
    expect(c.shown, 'hidden during the grace').toBe(false);
    await gameUntil(page, () => { const c = Arcade.Blocktave.state().courage; return c.shown && c.value < .9; });
    await expect(page.locator('#courage')).toHaveClass(/on/);
    await expect(page.locator('#courageName')).toHaveText('Courage');
    await gameUntil(page, () => Arcade.Blocktave.state().courage.warned);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.jitters === 1 && !Arcade.Blocktave.state().courage.jitter);
    const s = await st(page);
    const top = await page.evaluate(x => Arcade.BlocktaveWorld.top(Arcade.Blocktave.world(), x), Math.floor(s.player.x));
    expect(Math.abs(s.player.y - top), 'standing on the ground').toBeLessThan(.01);
    expect(Math.abs(Math.floor(s.player.x) - spot.x), 'straight above (or near)').toBeLessThanOrEqual(24);
    const open = await page.evaluate(({x, y}) => { const W = Arcade.Blocktave.world(), B = Arcade.BlocktaveWorld; for (let yy = 0; yy < y; yy++) if (B.BLOCKS[B.at(W, x, yy)].solid) return false; return true; }, {x: Math.floor(s.player.x), y: Math.floor(s.player.y) - 1});
    expect(open, 'open sky over them').toBe(true);
    expect(s.inv).toEqual(before.inv);
    expect(s.player.hearts).toBe(before.player.hearts);
    expect(s.bags).toBe(before.bags);
    await expect(page.locator('.ui-toast', {hasText: 'You got the jitters'})).toBeVisible();
    expect((await cg(page)).value).toBe(1);
  });

  test('building keeps you brave: placing a block, crafting, and (with resetOnMine) a passed card refill it and restart the grace', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const spot = await bottom(page, {grace: .6, drain: 6});
    await gameUntil(page, () => { const c = Arcade.Blocktave.state().courage; return c.value < .85; });
    // placing a block
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.place(x + 2, y, 'planks'), spot);
    let c = await cg(page);
    expect(c.graceLeft, "the grace started over").toBeGreaterThan(.3);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value === 1);
    // crafting (MAKE IT)
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value < .85);
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('maple', 1); d.craft('maple-planks'); d.answer(); });
    await waitCardGone(page);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value === 1);
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; if (Arcade.Blocktave.state().panel) document.getElementById('craftClose').click(); });
    // a passed challenge card (mining a music block) with resetOnMine
    const mine = () => page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('mallet1', 1); d.put(x + 1, y, 'toneOre'); d.mine(x + 1, y); d.answer(); }, spot);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value < .85);
    await mine(); await waitCardGone(page);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value === 1);
    // resetOnMine off: the card doesn't count
    await page.evaluate(() => { window.BT_RULES.courage.resetOnMine = false; });
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value < .85);
    const v0 = (await cg(page)).value;
    await mine(); await waitCardGone(page);
    await settleFor(page, 200);                                           // a little game time after the card (it stops the clock)
    expect((await cg(page)).value, 'kept draining').toBeLessThan(v0);
    expect((await cg(page)).graceLeft).toBe(0);
  });

  test('a card open or the pause menu stops the clock; one row above the zone nothing happens; leaving refills and hides it', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const spot = await bottom(page, {grace: .3, drain: 1.2});
    // a card open longer than drainS: no jitters
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('mallet1', 1); d.put(x + 1, y, 'toneOre'); d.mine(x + 1, y); }, spot);
    expect(await cardOpen(page)).toBe(true);
    const g0 = (await cg(page)).graceLeft;
    await settleFor(page, 2000);
    let c = await cg(page);
    expect(c.jitters).toBe(0);
    expect(c.graceLeft).toBe(g0);
    await page.evaluate(() => Arcade.BlocktaveCard.current.close());
    // the pause menu longer than drainS
    await page.keyboard.press('Escape');
    await expect(page.locator('#uiPause')).toBeVisible();
    await settleFor(page, 2000);
    expect((await cg(page)).jitters).toBe(0);
    await page.locator('#uiPause [data-act=resume], #uiPause button').first().click();
    await expect(page.locator('#uiPause')).toBeHidden();
    // one row above the zone: nothing
    await page.evaluate(() => { window.BT_RULES.courage.graceS = .2; });
    const up = await page.evaluate(({x}) => { const d = Arcade.Blocktave.demo, W = Arcade.Blocktave.world(), K = window.BT_RULES.courage, y = W.h - 2 - K.floorRows - 2;
      for (let xx = x - 3; xx <= x + 3; xx++) { d.put(xx, y + 1, 'slate'); d.put(xx, y, 'air'); d.put(xx, y - 1, 'air'); } d.tp(x, y); return y; }, spot);
    await settleFor(page, 1500);
    c = await cg(page);
    expect(c.inZone).toBe(false);
    expect(c.value).toBe(1);
    expect(c.shown).toBe(false);
    expect(c.jitters).toBe(0);
    // into the zone, draining, then out: it refills and hides
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x, y), spot);
    await gameUntil(page, () => Arcade.Blocktave.state().courage.value < .8);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x, y), {x: spot.x, y: up});
    await gameUntil(page, () => { const c = Arcade.Blocktave.state().courage; return c.value === 1 && !c.shown; });
    expect(up).toBeGreaterThan(0);
  });

  test('Survival Nights: a jitters trip never ends the run', async ({page}) => {
    await prepare(page, {store: store('trumpet', 'touch')});
    await page.goto('blocktave/index.html?demo&nostart&seed=42');
    await page.locator('.ls-endless').click();
    await page.locator('.ls-start').click();
    await into(page);
    expect((await st(page)).endless).toBe(true);
    await bottom(page, {grace: .3, drain: .8});
    await gameUntil(page, () => Arcade.Blocktave.state().courage.jitters === 1 && !Arcade.Blocktave.state().courage.jitter);
    const s = await st(page);
    expect(s.endless).toBe(true);
    expect(s.screen).toBe('world');
    expect(await page.locator('#results').isVisible().catch(() => false)).toBe(false);
  });

  test('reduced motion: no swirl and no pulse; the meter fits under the hearts and never covers the hotbar or a card', async ({page}) => {
    for (const vp of [{width: 390, height: 844}, {width: 1180, height: 820}, {width: 768, height: 1024}, {width: 1366, height: 768}]) {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      const spot = await bottom(page, {grace: .2, drain: 6});
      await page.evaluate(() => { window.BT_RULES.courage.warnAt = .99; });
      await gameUntil(page, () => Arcade.Blocktave.state().courage.shown);
      await settleFor(page, 600);
      const r = await page.evaluate(() => {
        const box = e => e.getBoundingClientRect(), m = box(document.getElementById('courage')), h = box(document.getElementById('hearts'));
        const hot = document.querySelector('.bt-bottom') ? box(document.querySelector('.bt-bottom')) : null;
        const hit = (a, b) => b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return {under: m.top >= h.bottom - .5, onScreen: m.left >= 0 && m.right <= innerWidth + .5, hot: hit(m, hot), w: m.width};
      });
      expect(r.under, JSON.stringify(vp)).toBe(true);
      expect(r.onScreen, JSON.stringify(vp)).toBe(true);
      expect(r.hot, JSON.stringify(vp)).toBe(false);
      // a card opened beside a block: the meter never covers it
      await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('mallet1', 1); d.put(x + 1, y, 'toneOre'); d.mine(x + 1, y); }, spot);
      const cov = await page.evaluate(() => { const a = document.getElementById('courage').getBoundingClientRect(), b = document.querySelector('.bt-card').getBoundingClientRect();
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; });
      expect(cov, 'over a card: ' + JSON.stringify(vp)).toBe(false);
      await page.evaluate(() => Arcade.BlocktaveCard.current && Arcade.BlocktaveCard.current.close());
    }
    // reduced motion
    await page.setViewportSize({width: 1180, height: 820});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await enter(page, {mode: 'touch'});
    await bottom(page, {grace: .2, drain: 1.5});
    await page.evaluate(() => { window.BT_RULES.courage.warnAt = .99; });
    await gameUntil(page, () => Arcade.Blocktave.state().courage.warned);
    const anim = await page.evaluate(() => getComputedStyle(document.getElementById('courage')).animationName);
    expect(anim).toBe('none');
    await gameUntil(page, () => Arcade.Blocktave.state().courage.jitter);
    const sw = await page.evaluate(() => { const j = document.getElementById('btJitter'); return {still: j.classList.contains('still'), before: getComputedStyle(j, '::before').display}; });
    expect(sw).toEqual({still: true, before: 'none'});
  });
});

test.describe('Blocktave: world drops and the pickup radius', () => {
  test('a calmed Clam drops a Pearl where it was; the milestone counts at once; the magnet pulls it in; a full bag leaves it', async ({page}) => {
    const watch = await enter(page, {mode: 'touch'});
    const {x0, y0} = await flat(page);
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 8); });
    await page.evaluate(i => Arcade.Blocktave.demo.calm(i), id);
    expect((await page.evaluate(() => Arcade.Blocktave.demo.stats())).clams, 'counted at the calming moment').toBe(1);
    // it falls to the ground: 3 s of game time on the game's test clock (a slow runner's frames never matter)
    await settleFor(page, 3000);
    let s = await st(page);
    expect(s.inv.pearl || 0, 'not in your bag while you\'re far').toBe(0);
    expect(s.drops.filter(d => d.item === 'pearl').length).toBe(1);
    const dr = s.drops.find(d => d.item === 'pearl');
    expect(Math.abs(dr.y - (y0 - .22)), 'it rests on the ground').toBeLessThan(.05);
    // THE MAGNET: from 2.1 tiles (inside magnetRadius, outside pickupRadius) it glides to you and is picked up
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.tp(Math.floor(x + 2.1 - .5), y - 1); }, {x: dr.x, y: y0});
    const px = (await st(page)).player.x;
    await expect.poll(() => page.evaluate(() => { Arcade.Blocktave.demo.step(.25); return Arcade.Blocktave.state().inv.pearl || 0; })).toBe(1);
    expect(Math.abs((await st(page)).player.x - px), 'you didn\'t walk to it').toBeLessThan(.01);
    // A FULL BAG: the item stays on the ground, "Bag full!"
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, I = window.BT_ITEMS, n = window.BT_RULES.invSlots;
      Object.keys(I).filter(k => I[k].kind !== 'tool').slice(0, n + 2).forEach(k => { if (d.canHold(k)) d.give(k, 1); }); });
    const left = await page.evaluate(() => Object.keys(window.BT_ITEMS).find(k => window.BT_ITEMS[k].kind !== 'tool' && !Arcade.Blocktave.state().inv[k]));
    expect(await page.evaluate(k => Arcade.Blocktave.demo.canHold(k), left)).toBe(false);
    await page.evaluate(k => { const s = Arcade.Blocktave.state(); Arcade.Blocktave.demo.drop(k, 1, s.player.x + .6, s.player.y - 1); }, left);
    await settleFor(page, 900);
    expect((await st(page)).drops.some(d => d.item === left), 'it stays on the ground').toBe(true);
    await expect(page.locator('.ui-toast', {hasText: 'Bag full!'})).toBeVisible();
    watch.check();
  });

  test('drops are saved with the world; off screen they despawn after dropDespawnS, on screen never; the bag never does; at most maxDrops', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const {x0, y0} = await flat(page);
    await page.evaluate(({x0, y0}) => { const d = Arcade.Blocktave.demo; d.drop('pearl', 1, x0 + 80, 10); d.drop('cork', 2, x0 + 6, y0 - 1); }, {x0, y0});
    await settleFor(page, 600);                                          // they land (game time: the test clock)
    await page.evaluate(() => Arcade.Blocktave.save());
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Arcade.Blocktave.key)));
    expect(saved.v).toBe(3);
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
    await settleFor(page, 900);                                          // past dropDespawnS (game time)
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

/* ================= CHAPTER 6: SIX NEW ORES, NINE NEW RECIPES, "GRAND STAFF" ================= */
const ORES2 = ['rumbleOre', 'piccoloQuartz', 'intervalGeode', 'keyQuartz', 'dynamicCoral', 'tempoAmber'];
/** a flat open test ground around the player: a slate floor under the feet, air above (cols left/right, rows up) */
const flatGround = (page, cols = 14, rows = 12) => page.evaluate(({cols, rows}) => {
  const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x0 = Math.floor(s.player.x), y = Math.floor(s.player.y);
  for (let x = x0 - cols; x <= x0 + cols; x++) { d.put(x, y, 'slate'); d.put(x, y + 1, 'slate'); for (let yy = y - rows; yy < y; yy++) d.put(x, yy, 'air'); }
  d.tp(x0, y - 1);
  return {x: x0, y};                                      // the floor row (the feet stand at y)
}, {cols, rows});
/** follow the player for ms of GAME time, run at once on the game's test clock (demo.step: fixed 60 fps steps, so the
    result never depends on the test machine's frame rate): [lowest feet row reached (min y), the start y, the largest
    downward speed, where it ends]. `setup(d, after)` runs first; after(ms, fn) runs fn at that game time. */
const track = (page, ms, setup) => page.evaluate(({ms, setup}) => {
  const B = Arcade.Blocktave, y0 = B.state().player.y, later = []; let minY = y0, maxVy = -1e9;
  if (setup) (new Function('d', 'after', setup))(B.demo, (at, fn) => later.push({at, fn}));
  B.demo.step(ms / 1000, t => {
    later.filter(l => !l.done && t * 1000 >= l.at).forEach(l => { l.done = true; l.fn(); });
    const s = B.state(); minY = Math.min(minY, s.player.y); maxVy = Math.max(maxVy, s.vy);
  });
  const s = B.state();
  return {minY, y0, maxVy, y: s.player.y, x: s.player.x};
}, {ms, setup});
/** let the game run `ms` of game time at once (the test clock): a jump lands, a fall ends */
/** COMBAT: answer a creature's cards (they chain: a new one after each right answer) until it's calmed; how many it took */
async function calmByCards(page, id, max = 16) {
  for (let k = 1; k <= max; k++) {
    const live = await page.evaluate(i => (Arcade.Blocktave.state().creatures.find(c => c.id === i) || {}).state === 'live', id);
    if (!live) return k - 1;
    if (!(await page.evaluate(() => !!Arcade.BlocktaveCard.current))) await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    const t0 = await page.evaluate(() => { const c = Arcade.BlocktaveCard.current; Arcade.Blocktave.demo.answer(); return c ? c.state().t0 : null; });
    await page.waitForFunction(t => { const c = Arcade.BlocktaveCard.current; return !c || c.state().t0 !== t; }, t0);   // judged and closed (or the next one open)
  }
  return max + 1;
}
const settleFor = (page, ms) => page.evaluate(ms => Arcade.Blocktave.demo.step(ms / 1000), ms);
/** run the game's test clock a tenth of a second at a time until cond() (run in the page) is true (at most 20 s of
    real time: things that end on a real timer, a card closing, still get there) */
const gameUntil = (page, cond) => page.waitForFunction(src => { Arcade.Blocktave.demo.step(.1); return (0, eval)('(' + src + ')')(); },
  cond.toString(), {timeout: 20_000, polling: 100});

test.describe('Blocktave: Chapter 6: the six new ores in the world', () => {
  test('over 20 seeds each ore forms only by its rules; Rumble Ore and Piccolo Quartz reachable (≥ 6); the averages', async ({page}) => {
    await prepare(page, {store: store('trumpet', 'touch')});
    await page.goto('blocktave/index.html?demo&nostart');
    const r = await page.evaluate(ORES2 => {
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, ID = BW.ID, B = BW.BLOCKS, O = R.ores, bad = [], tot = {}, min = {}, reach = {rumbleOre: 1e9, piccoloQuartz: 1e9};
      ORES2.forEach(k => { tot[k] = 0; min[k] = 1e9; });
      for (let s = 1; s <= 20; s++) {
        const seed = s * 7919, w = BW.generate(seed, R), o = BW.generate(seed, R, 2), W = w.w, at = (x, y) => (x < 0 || x >= W || y < 0 || y >= w.h) ? ID.bedrock : w.b[y * W + x];
        const n = {}; ORES2.forEach(k => { n[k] = 0; }); const rn = {rumbleOre: 0, piccoloQuartz: 0};
        const openO = (x, y) => { const v = (x < 0 || x >= W || y < 0 || y >= o.h) ? ID.bedrock : o.b[y * W + x]; return v === ID.air || v === ID.water; };
        for (let i = 0; i < w.b.length; i++) {
          const v = w.b[i], k = B[v].key; if (!ORES2.includes(k)) continue;
          const x = i % W, y = Math.floor(i / W), g = BW.top(o, x), bi = BW.biomeOf(R, x).id, ov = o.b[i];
          n[k]++;
          if (ov === v) bad.push(`${seed} ${k}: was there before`);
          // the shape of the world is the same as the generator's version 2: only ore replaced natural ground
          if (!B[ov].solid || ov === ID.bedrock) bad.push(`${seed} ${k} replaced ${B[ov].key}`);
          const face = openO(x - 1, y) || openO(x + 1, y) || openO(x, y - 1) || openO(x, y + 1);
          if (k === 'rumbleOre' && !(y >= R.world.deepY + O.rumbleBelow)) bad.push(`${seed} rumble at row ${y}`);
          if (k === 'piccoloQuartz' && !(y < R.world.peaksY - O.piccoloAbove)) bad.push(`${seed} piccolo at row ${y}`);
          if (k === 'dynamicCoral' && !(bi === 'marsh' && o.b[(y - 1) * W + x] === ID.water)) bad.push(`${seed} coral not on a pool bed (${x},${y})`);
          if (k === 'tempoAmber' && !(bi === 'canyon' && y >= g + O.amberBelow)) bad.push(`${seed} amber at (${x},${y}) ${bi}`);
          if (k === 'keyQuartz' && !(bi === 'brass' && y >= g + O.keyBelow && y < R.world.deepY && !face)) bad.push(`${seed} key quartz at (${x},${y}) ${bi}`);
          if (k === 'intervalGeode' && !(y > g + R.world.shallow && y < R.world.deepY && face)) bad.push(`${seed} geode at (${x},${y})`);
          if ((k === 'rumbleOre' || k === 'piccoloQuartz') && face) rn[k]++;
        }
        ORES2.forEach(k => { tot[k] += n[k]; min[k] = Math.min(min[k], n[k]); });
        Object.keys(rn).forEach(k => { reach[k] = Math.min(reach[k], rn[k]); });
        // only new ore differs from version 2
        for (let i = 0; i < w.b.length; i++) if (w.b[i] !== o.b[i] && !ORES2.includes(B[w.b[i]].key)) { bad.push(`${seed}: another tile changed`); break; }
      }
      const avg = {}; ORES2.forEach(k => { avg[k] = tot[k] / 20; });
      return {bad: bad.slice(0, 10), avg, min, reach};
    }, ORES2);
    console.log('Chapter 6 ores, 20 seeds: average', JSON.stringify(r.avg), 'fewest', JSON.stringify(r.min));
    expect(r.bad).toEqual([]);
    expect(r.reach.rumbleOre, 'Rumble Ore on an open face').toBeGreaterThanOrEqual(6);
    expect(r.reach.piccoloQuartz, 'Piccolo Quartz on an open face').toBeGreaterThanOrEqual(6);
    const want = {rumbleOre: 25, piccoloQuartz: 20, intervalGeode: 40, keyQuartz: 30, dynamicCoral: 20, tempoAmber: 25};
    Object.entries(want).forEach(([k, n]) => { expect(r.avg[k], k).toBeGreaterThan(n * .7); expect(r.avg[k], k).toBeLessThan(n * 1.3); });
  });
});

test.describe('Blocktave: Chapter 6: the new cards (INSTRUMENT, SNARE, TOUCH)', () => {
  /** mine an ore beside the player with the Silver Mallet: its card opens */
  const mineOre = async (page, key) => {
    const at = await putBeside(page, key);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), at);
    expect(await cardOpen(page), `${key} opens a card`).toBe(true);
    return at;
  };
  const gone = (page, at) => page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), at);
  /** a wrong answer for whatever card is open (mode-aware) */
  async function wrong(page) {
    const s = await page.evaluate(() => { const c = Arcade.BlocktaveCard.current, st = c.state(); return {kind: st.kind, info: st.info, mode: Arcade.Blocktave.state().mode, snare: Arcade.Blocktave.state().snare, want: c.want() && {letter: c.want().n && c.want().n.letter, sounding: c.want().sounding}}; });
    if (s.kind === 'notes' || (s.kind === 'interval' && s.mode === 'inst') || (s.kind === 'keysig' && s.mode === 'inst')) {
      // (a pickup's sound mutes the mic for a moment: a note held through it isn't new, so play it again, like a player would)
      if (s.mode === 'inst') for (let k = 0; k < 4 && await cardOpen(page); k++) { await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w'); await page.waitForTimeout(250); }
      else { const L = 'ABCDEFG', l = L[(L.indexOf(s.want.letter) + 1) % 7]; await page.keyboard.press(l.toLowerCase()); }
    } else if (s.kind === 'interval') await page.locator(`.bt-card [data-n]:not([data-n="${s.info.size}"])`).first().click();
    else if (s.kind === 'keysig') await page.locator(`.bt-card [data-id]:not([data-id="${s.info.scale}"])`).first().click();
    else if (s.kind === 'dynamics' && s.mode !== 'inst') await page.locator('.bt-card .bt-mark').evaluateAll(bs => { const ks = bs.map(b => +b.dataset.k), hi = Math.max(...ks); bs.find(b => +b.dataset.k === hi).click(); });
    else if (s.kind === 'dynamics' && s.snare) await page.evaluate(() => { const c = Arcade.BlocktaveCard.current, t = performance.now(); c.hit(t, .1); c.hit(t + 400, .12); });
    else if (s.kind === 'dynamics') await page.evaluate(() => { Arcade.Pitch.demoLevel = .06; Arcade.Pitch.demoNote = Arcade.BlocktaveCard.current.want().sounding; });   // 1× : never loud enough
    else if (s.kind === 'tempo') await page.evaluate(() => { const c = Arcade.BlocktaveCard.current, st = c.state(), g = 60000 / st.info.bpm; for (let k = 0; k < st.info.beats; k++) c.hit(st.t0 + k * g * (k % 2 ? .7 : 1.3)); });
    else if (s.kind === 'count') await page.evaluate(() => { const c = Arcade.BlocktaveCard.current; for (let k = 0; k < 9; k++) c.hit(performance.now() + k); });
    // (a rhythm card with no hits at all: "A note was missed")
    await waitCardGone(page);
  }
  for (const [name, member, mode] of [['INSTRUMENT', 'trumpet', 'inst'], ['SNARE', 'snare', 'inst'], ['TOUCH', 'trumpet', 'touch']]) {
    test(`${name}: every new ore passes with the right answer (the block breaks) and stays with a wrong one`, {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await enter(page, {member, mode});
      await page.evaluate(() => Arcade.Blocktave.demo.give('mallet3', 1));
      const kinds = {};
      for (const key of ORES2) {
        let at = await mineOre(page, key);
        kinds[key] = (await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind));
        await wrong(page);
        expect(await gone(page, at), `${key}: a wrong answer keeps the block`).toBe(key);
        at = await mineOre(page, key);
        if (kinds[key] === 'dynamics' && mode === 'inst' && member !== 'snare') await page.evaluate(() => { Arcade.Pitch.demoLevel = null; });
        await page.evaluate(() => Arcade.Blocktave.demo.answer());
        await waitCardGone(page);
        expect(await gone(page, at), `${key}: the right answer breaks it`).toBe('air');
      }
      if (member === 'snare') expect(Object.values(kinds).every(k => ['count', 'rhythm', 'dynamics', 'tempo'].includes(k)), JSON.stringify(kinds)).toBe(true);
      else expect(kinds).toEqual({rumbleOre: 'notes', piccoloQuartz: 'notes', intervalGeode: 'interval', keyQuartz: 'keysig', dynamicCoral: 'dynamics', tempoAmber: 'tempo'});
      // the drops: each ore's own material
      const inv = (await st(page)).drops.map(d => d.item).concat(Object.keys((await st(page)).inv));
      ['basscrystal', 'treblecrystal', 'harmony', 'keyshard', 'coralpearl', 'amberbeat'].forEach(k => expect(inv, k).toContain(k));
      watch.check();
    });
  }

  test('Rumble Ore = 1–3 ledger lines BELOW the bass staff going down; Piccolo Quartz ABOVE the treble staff going up; judged by pitch class', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y), out = [];
      for (let k = 0; k < 12; k++) for (const kind of ['lowread', 'highread']) {
        const sp = d.spec(kind, x, y, 3), m = sp.items.map(i => i.midi);
        out.push({kind, clef: sp.clef, m, sorted: kind === 'lowread' ? m.every((v, i) => !i || v < m[i - 1]) : m.every((v, i) => !i || v > m[i - 1]),
          ys: sp.items.map(i => Arcade.noteY(sp.clef, i.show)), pc: sp.items.every(i => i.pc === ((i.midi - 2) % 12 + 12) % 12), acc: sp.items.some(i => i.n.acc)});
      }
      return out;
    });
    r.forEach(c => {
      expect(c.clef).toBe(c.kind === 'lowread' ? 'bass' : 'treble');
      expect(c.sorted, 'going down / up').toBe(true);
      expect(c.acc, 'spelled naturally').toBe(false);
      expect(c.pc, 'judged by the concert pitch class (trumpet: written − 2)').toBe(true);
      // 1–3 ledger lines: below the staff's bottom line (y 120) by 16–48, or above its top (y 56) by 16–48
      c.ys.forEach(y => c.kind === 'lowread' ? expect(y).toBeGreaterThanOrEqual(128) : expect(y).toBeLessThanOrEqual(48));
      c.ys.forEach(y => c.kind === 'lowread' ? expect(y).toBeLessThanOrEqual(168) : expect(y).toBeGreaterThanOrEqual(8));
    });
  });

  for (const [name, vp] of [['phone', {width: 390, height: 844}], ['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`ledger-line notes are never cut off (${name})`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {mode: 'touch'});
      for (const kind of ['lowread', 'highread']) {
        await page.evaluate(k => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec(k, x, y, 5), x + 1, y - 2); }, kind);
        const out = await page.evaluate(() => {
          const card = document.querySelector('.bt-card'), cr = card.getBoundingClientRect(), bad = [];
          card.querySelectorAll('.bt-staff svg').forEach(svg => { const sr = svg.getBoundingClientRect(); svg.querySelectorAll('ellipse.head, g[id^=btn] line').forEach(e => {
            const r = e.getBoundingClientRect();
            if (r.top < sr.top - .5 || r.bottom > sr.bottom + .5 || r.top < cr.top - .5 || r.bottom > cr.bottom + .5 || r.left < cr.left - .5 || r.right > cr.right + .5) bad.push(e.tagName);
          }); });
          return {bad, n: card.querySelectorAll('ellipse.head').length, onScreen: cr.top >= -.5 && cr.bottom <= innerHeight + .5};
        });
        expect(out.n, `${kind}: 5 notes`).toBe(5);
        expect(out.bad, kind).toEqual([]);
        expect(out.onScreen).toBe(true);
        await page.evaluate(() => Arcade.BlocktaveCard.close());
      }
    });
  }

  test('DYNAMICS: passes on a 2× louder second note, fails at 1.2× ("MUCH louder!"); the snare by its hits\' peaks', async ({page}) => {
    test.setTimeout(120_000);
    await enter(page, {mode: 'inst'});
    const run = async ratio => {
      await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec('dynamics', x, y), x + 1, y - 2);
        Arcade.Pitch.demoLevel = .05; Arcade.Pitch.demoNote = Arcade.BlocktaveCard.current.want().sounding; });
      await page.waitForFunction(() => Arcade.BlocktaveCard.current.state().phase === 'loud', null, {timeout: 5000});
      await page.evaluate(r => { Arcade.Pitch.demoLevel = .05 * r; }, ratio);
      await page.waitForFunction(() => !Arcade.BlocktaveCard.current, null, {timeout: 10_000, polling: 100});
      await page.evaluate(() => { Arcade.Pitch.demoNote = null; Arcade.Pitch.demoLevel = null; });
      return (await st(page)).fx.lastCard;
    };
    expect((await run(2)).ok).toBe(true);
    const f = await run(1.2);
    expect(f.ok).toBe(false);
    expect(f.why).toBe('Make the second one MUCH louder!');
  });
  test('DYNAMICS on the snare: a soft hit, then a loud hit (their peaks): 2× passes, 1.2× fails', async ({page}) => {
    await enter(page, {member: 'snare', mode: 'inst'});
    for (const [l2, ok] of [[.2, true], [.12, false]]) {
      await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec('dynamics', x, y), x + 1, y - 2); });
      const k = await page.evaluate(l => { const c = Arcade.BlocktaveCard.current, t = performance.now(); c.hit(t, .1); c.hit(t + 400, l); return c.state(); }, l2);
      expect(k.kind).toBe('dynamics');
      await waitCardGone(page);
      expect((await st(page)).fx.lastCard.ok, `snare ${l2 / .1}×`).toBe(ok);
    }
  });

  test('TEMPO: the word and mark from Tune Up\'s metronome; passes at the target ±5 % steady; fails at +15 % or an uneven beat', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const open = () => page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec('tempo', x, y, 8), x + 1, y - 2);
      return Arcade.BlocktaveCard.current.state().info; });
    const info = await open();
    expect(window => 1).toBeTruthy();
    expect(await page.evaluate(() => window.BT_RULES.tempo.choices)).toContain(info.bpm);
    expect(info.word).toBe(await page.evaluate(b => Arcade.TempoWords.tempoWord(b), info.bpm));
    await expect(page.locator('.bt-card .bt-tempo')).toContainText(`♩ = ${info.bpm}`);
    await page.evaluate(() => Arcade.BlocktaveCard.close());
    for (const [label, gaps, ok] of [['+5 %', k => 1.05, true], ['−5 %', k => .95, true], ['+15 %', k => 1.15, false], ['uneven', k => (k % 2 ? .7 : 1.3), false]]) {
      await open();
      await page.evaluate(src => { const f = new Function('k', 'return (' + src + ')(k)'), c = Arcade.BlocktaveCard.current, s = c.state(), g = 60000 / s.info.bpm;
        let t = s.t0; for (let k = 0; k < s.info.beats; k++) { c.hit(t); t += g * f(k); } }, gaps.toString());
      await waitCardGone(page);
      expect((await st(page)).fx.lastCard.ok, label).toBe(ok);
    }
  });

  test('nothing pitched plays while listening: the organ refuses, a trampoline bounce is silent with a card open, the tempo count-off mutes the mic', async ({page}) => {
    await enter(page, {mode: 'inst'});
    await page.evaluate(() => { window.__ev = []; const e = Arcade.Sfx.event; Arcade.Sfx.event = (n, ...a) => { window.__ev.push([n, Arcade.Pitch.listening()]); return e.call(Arcade.Sfx, n, ...a); }; });
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    const h0 = await page.evaluate(() => Arcade.tones.history.length);
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec('tempo', x, y, 8), x + 1, y - 2); });
    expect(await page.evaluate(() => Arcade.Pitch.listening())).toBe(true);
    const co = await page.evaluate(() => Arcade.BlocktaveCard.current.state().countOff);
    if (co.on) for (const k of co.clicks) expect(await page.evaluate(t => Arcade.Pitch.isSuppressed(t), k.perf + 40)).toBe(true);
    else expect(co.silentWhy).toBeTruthy();
    expect(await page.evaluate(() => Arcade.Blocktave.demo.organ())).toBe(true);
    expect(await page.evaluate(() => Arcade.tones.history.length), 'no organ chord while listening').toBe(h0);
    await page.evaluate(() => Arcade.BlocktaveCard.close());
    expect(await page.evaluate(() => window.__ev.filter(([n, l]) => n === 'bt-boing' && l).length)).toBe(0);
  });
});

test.describe('Blocktave: Chapter 6: the nine recipes and what they do', () => {
  const RECIPES9 = {'timpani-trampoline': 'trampoline', 'tuba-boots': 'tubaboots', 'piccolo-glider': 'glider', 'ds-al-coda': 'segno', 'grand-staff-gem': 'grandgem',
    'sonar-fork': 'sonarfork', 'pipe-organ': 'organ', 'accelerando-boots': 'accelboots', 'coral-lamp': 'corallamp'};
  test('each recipe makes its output (a Luthier\'s Bench where needed); D.S. al Coda makes a Segno AND a Coda; the Grand Staff Gem is a milestone', async ({page}) => {
    test.setTimeout(180_000);
    await enter(page, {mode: 'touch'});
    for (const [id, out] of Object.entries(RECIPES9)) {
      const r = await page.evaluate(id => { const d = Arcade.Blocktave.demo, rec = window.BT_RECIPES.find(x => x.id === id); rec.in.forEach(k => d.give(k, 1)); return {bench: !!rec.bench}; }, id);
      if (r.bench) {
        // no bench nearby: MAKE IT does nothing
        expect(await page.evaluate(id => Arcade.Blocktave.demo.craft(id), id), `${id} needs a bench`).toBe(false);
        await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) - 1, y = Math.floor(s.player.y) - 1; d.put(x, y, 'air'); d.place(x, y, 'bench'); });
      }
      expect(await page.evaluate(id => Arcade.Blocktave.demo.craft(id), id), id).toBe(true);
      await page.evaluate(() => Arcade.Blocktave.demo.answer());
      await waitCardGone(page);
      expect((await st(page)).inv[out], `${id} made ${out}`).toBeGreaterThan(0);
      if (r.bench) await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) - 1, y = Math.floor(s.player.y) - 1; d.mine(x, y); });
    }
    expect((await st(page)).inv.coda).toBe(1);
    expect(await page.evaluate(() => Arcade.store.gameData('blocktave').ms.trumpet.grandgem)).toBeTruthy();
    // gear: a badge on its hotbar slot, and it can't be placed
    await expect(page.locator('.bt-hot[data-item="tubaboots"] .bt-gearbadge')).toHaveCount(1);
    expect(await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(); return d.place(Math.floor(s.player.x) + 1, Math.floor(s.player.y) - 1, 'tubaboots'); })).toBe(false);
    // the Recipe Book lists all nine (search finds them)
    if ((await st(page)).panel !== 'craft') await page.keyboard.press('c');
    await page.locator('#bookBtn').click();
    for (const id of Object.keys(RECIPES9)) await expect(page.locator(`#book .bt-rec[data-id="${id}"]`)).toHaveCount(1);
    await page.locator('#bookSearch').fill('coral');
    await expect(page.locator('#book .bt-rec[data-id="coral-lamp"]')).toBeVisible();
  });

  test('movement: the trampoline launches 6 tiles (7 holding JUMP); Tuba Boots +1; the Glider falls ≤ glideSpeed; Accelerando +30 % (and both boots)', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const R = await page.evaluate(() => window.BT_RULES);
    const g = await flatGround(page);
    // THE TRAMPOLINE: dropped from 4 tiles onto it
    for (const [hold, want] of [[false, R.trampoline.boost], [true, R.trampoline.boost + R.trampoline.holdBoost]]) {
      await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.put(x, y, 'trampoline'); d.tp(x, y - 5); }, g);
      const t = await track(page, 1600, hold ? 'd.key("jump", true)' : null);
      await page.evaluate(() => Arcade.Blocktave.demo.key('jump', false));
      expect(g.y - t.minY, `the trampoline launches ${want} tiles`).toBeGreaterThan(want - .6);
      expect(g.y - t.minY).toBeLessThan(want + .6);
      await settleFor(page, 1500);
    }
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.put(x, y, 'slate'), g);
    // TUBA BOOTS: one tile higher
    const jump = async () => { await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x - 4, y - 1), g); await settleFor(page, 300);
      const t = await track(page, 900, 'd.key("jump", true); after(120, () => d.key("jump", false))'); return t.y0 - t.minY; };
    const plain = await jump();
    await page.evaluate(() => { Arcade.Blocktave.demo.give('tubaboots', 1); Arcade.Blocktave.demo.hotbar('tubaboots', true); });
    const boots = await jump();
    expect(boots - plain, 'Tuba Boots: +1 tile').toBeGreaterThan(R.gear.jumpPlus - .3);
    expect(boots - plain).toBeLessThan(R.gear.jumpPlus + .3);
    // ACCELERANDO: 30 % faster (with the Tuba Boots too: they stack)
    const walk = async () => { await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x - 10, y - 1), g); await settleFor(page, 250);
      const t = await track(page, 1000, 'd.key("right", true)'); await page.evaluate(() => Arcade.Blocktave.demo.key('right', false)); return t.x - (g.x - 10 + .5); };
    await page.evaluate(() => Arcade.Blocktave.demo.hotbar('tubaboots', false));
    const slow = await walk();
    await page.evaluate(() => { Arcade.Blocktave.demo.give('accelboots', 1); Arcade.Blocktave.demo.hotbar('accelboots', true); });
    const fast = await walk();
    expect(fast / slow, 'Accelerando: +30 %').toBeGreaterThan(1 + R.gear.speedPlus - .06);
    expect(fast / slow).toBeLessThan(1 + R.gear.speedPlus + .06);
    await page.evaluate(() => Arcade.Blocktave.demo.hotbar('tubaboots', true));
    const both = await jump();
    expect(both - plain, 'both boots: still +1 jump').toBeGreaterThan(R.gear.jumpPlus - .3);
    expect((await st(page)).gear).toMatchObject({tubaboots: true, accelboots: true});
    // THE GLIDER: hold JUMP while falling
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.give('glider', 1); d.hotbar('glider', true); });
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x, y - 12), g);
    const gl = await track(page, 700, 'd.key("jump", true)');
    await page.evaluate(() => Arcade.Blocktave.demo.key('jump', false));
    expect(gl.maxVy, 'gliding: never faster than glideSpeed').toBeLessThanOrEqual(R.gear.glideSpeed + .01);
    await settleFor(page, 1500);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.tp(x, y - 12), g);
    const fall = await track(page, 700, null);
    expect(fall.maxVy, 'not holding JUMP: a normal fall').toBeGreaterThan(R.gear.glideSpeed * 2);
  });

  test('D.S. al Coda signs: they pair and travel; never with a card open, at night with a creature within 8, or just hurt; a 4th pair is refused; breaking one = "No partner"', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const g = await flatGround(page, 16);
    const S = await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('segno', 4); d.give('coda', 4);
      d.tp(x - 3, y - 1); const a = d.place(x - 5, y - 1, 'segno'); d.tp(x + 9, y - 1); const b = d.place(x + 11, y - 1, 'coda'); return {a, b, A: {x: x - 5, y: y - 1}, B: {x: x + 11, y: y - 1}}; }, g);
    expect([S.a, S.b]).toEqual([true, true]);
    // (the first sign's card: what D.S. al Coda means)
    await expect(page.locator('#intro')).toContainText('go back to the sign, then jump to the coda');
    await page.locator('#intro [data-act=go]').click();
    let s = await st(page);
    expect(s.signs.find(q => q.sign === 'segno').mate).toBe(`${S.B.x},${S.B.y}`);
    // travel from the coda to the segno
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.travel(x, y), S.B);
    await expect.poll(async () => (await st(page)).warp, {message: 'the warp is over'}).toBe(false);   // (it ends on a timer)
    s = await st(page);
    expect(Math.floor(s.player.x), 'traveled to the segno').toBe(S.A.x);
    expect(await page.evaluate(() => Arcade.store.gameData('blocktave').ms.trumpet.coda), 'the coda milestone').toBeTruthy();
    // a card open: no travel
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.openSpec(d.spec('note', x, y), x, y); }, S.A);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.travel(x, y), S.A);
    expect(await st(page), 'refused at once: no warp started').toMatchObject({warp: false});
    expect(Math.floor((await st(page)).player.x)).toBe(S.A.x);
    await page.evaluate(() => Arcade.BlocktaveCard.close());
    // at night with a creature within 8: no travel
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); d.spawn('clam', 5); });
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.travel(x, y), S.A);
    expect(await st(page), 'refused at once: no warp started').toMatchObject({warp: false});
    expect(Math.floor((await st(page)).player.x)).toBe(S.A.x);
    await expect(page.locator('.ui-toast', {hasText: 'Too dangerous to travel right now!'}).first()).toBeVisible();
    // just hurt (daytime, no creature): no travel either
    await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(30); Arcade.Blocktave.state(); d.hurt(.5); });
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.travel(x, y), S.A);
    expect(await st(page), 'refused at once: no warp started').toMatchObject({warp: false});
    expect(Math.floor((await st(page)).player.x)).toBe(S.A.x);
    // up to 3 pairs: the 4th is refused
    const placed = await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo, out = []; d.tp(x, y - 1);
      for (const [k, dx] of [['segno', -2], ['coda', -1], ['segno', 1], ['coda', 2], ['segno', 3]]) out.push(d.place(x + dx, y - 1, k)); return out; }, g);
    expect(placed).toEqual([true, true, true, true, false]);
    await expect(page.locator('.ui-toast', {hasText: 'Your world has 3 sign pairs. Break one to build another.'}).first()).toBeVisible();
    // breaking a sign: its partner has "No partner"
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.tp(x + 2, y); d.mine(x, y); }, S.A);
    s = await st(page);
    expect(s.signs.find(q => q.at === `${S.B.x},${S.B.y}`).mate).toBeNull();
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.tp(x - 2, y); d.target(x, y); }, S.B);
    await expect.poll(async () => (await st(page)).targetName).toBe('Coda Sign (no partner)');   // (named on the next frame)
  });

  test('the Sonar Tuning Fork points to the nearest chosen ore you\'ve seen; "None nearby" otherwise; its picker opens from a double tap', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const at = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 15, y = Math.floor(s.player.y) - 4;
      d.put(x, y, 'tempoAmber'); d.give('sonarfork', 1); d.hotbar('sonarfork', true); return {x, y}; });
    await page.waitForTimeout(500);
    expect((await st(page)).oreSeen, 'it was on screen: seen').toContain('tempoAmber');
    // the picker: tap its hotbar slot twice
    const slot = page.locator('.bt-hot[data-item="sonarfork"]');
    await slot.click(); await slot.click();
    await expect(page.locator('#sonar')).toBeVisible();
    await page.locator('#sonarGrid [data-ore="tempoAmber"]').click();
    await expect(page.locator('#sonar')).toBeHidden();
    await settleFor(page, 700);
    let s = await st(page);
    expect(s.sonar.target).toBe('tempoAmber');
    // the nearest Tempo Amber (natural ones are deep under the canyon, far from the marsh)
    expect([s.sonar.hit.x, s.sonar.hit.y]).toEqual([at.x, at.y]);
    // gone: "None nearby"
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.put(x, y, 'air'), at);
    await settleFor(page, 700);
    s = await st(page);
    expect(s.sonar.hit).toBeNull();
  });

  test('the Pipe Organ: 2 × 3, a chord only when nothing listens, and it counts as the Band Hall\'s music stand', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const got = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, w = Arcade.Blocktave.world(), x0 = Math.floor(w.spawn.x) - 5, y0 = Math.floor(w.spawn.y) - 5;
      for (let x = x0 - 1; x <= x0 + 8; x++) for (let y = y0 - 1; y <= y0 + 4; y++) {
        const edge = x === x0 - 1 || x === x0 + 8 || y === y0 - 1 || y === y0 + 4;
        d.put(x, y, !edge ? 'air' : y === y0 + 4 ? 'stage' : 'brick');
      }
      d.put(x0 + 8, y0 + 3, 'door'); d.put(x0 + 8, y0 + 2, 'door');
      d.put(x0 + 1, y0 + 3, 'lamp');
      d.tp(x0 + 3, y0 + 3);
      const ok = d.place(x0 + 5, y0 + 3, 'organ');
      const tiles = []; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 3; dy++) tiles.push(d.at(x0 + 5 + dx, y0 + 3 - dy));
      return {ok, tiles, hall: !!Arcade.store.gameData('blocktave').ms.trumpet.hall, x: x0 + 5, y: y0 + 3};
    });
    expect(got.ok).toBe(true);
    expect(got.tiles).toEqual(new Array(6).fill('organ'));
    expect(got.hall, 'the organ counts as the music stand').toBe(true);
    // a chord (TOUCH: nothing listens): three tones at once
    await page.mouse.click(5, 300);
    await page.waitForFunction(() => !!(Arcade.Sfx.output && Arcade.Sfx.output()));
    const h0 = await page.evaluate(() => Arcade.tones.history.length);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.act(x, y - 1, true), got);
    expect(await page.evaluate(() => Arcade.tones.history.length)).toBe(h0 + 3);
    const ch = (await st(page)).lastChord;
    expect([ch[1] - ch[0], ch[2] - ch[0]], 'a major chord').toEqual([4, 7]);
    // breaking one tile breaks all six, one organ drops
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x + 1, y - 2), got);
    expect(await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo, o = []; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 3; dy++) o.push(d.at(x + dx, y - dy)); return o; }, got)).toEqual(new Array(6).fill('air'));
    expect((await st(page)).drops.filter(d => d.item === 'organ').reduce((a, d) => a + d.n, 0)).toBe(1);
  });

  test('the Coral Lamp: placed in water, nothing spawns in its light, the water comes back when it breaks', async ({page}) => {
    await enter(page, {mode: 'touch'});
    const r = await page.evaluate(() => {
      const d = Arcade.Blocktave.demo, w = Arcade.Blocktave.world(), BW = Arcade.BlocktaveWorld;
      // a water tile with ground under it near the spawn (the marsh pools)
      let t = null; for (let i = 0; i < w.b.length && !t; i++) { const x = i % w.w, y = Math.floor(i / w.w); if (w.b[i] === BW.ID.water && BW.BLOCKS[BW.at(w, x, y + 1)].solid && Math.abs(x - w.spawn.x) < 60) t = {x, y}; }
      d.tp(t.x - 1, t.y - 2);
      const placed = d.place(t.x, t.y, 'corallamp');
      d.time(window.BT_RULES.dayS + 40);
      return {t, placed, at: d.at(t.x, t.y)};
    });
    expect(r.placed).toBe(true);
    expect(r.at).toBe('corallamp');
    // its light: no spawn 2 tiles away at night (a dry pocket dug there)
    expect(await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.put(x + 2, y - 3, 'air'); d.put(x + 2, y - 4, 'air'); d.put(x + 2, y - 2, 'slate'); return d.canSpawnAt(x + 2, y - 3, 'clam'); }, r.t)).toBe(false);
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), r.t);
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), r.t), 'the water comes back').toBe('water');
  });
});

test.describe('Blocktave: Chapter 6 "Grand Staff" and its stars', () => {
  test('hidden until Chapter 5 has a star; each milestone one star, once; maxStars 18; an old save with Chapter 5 done gets the NEW CHAPTER card', async ({page}) => {
    await enter(page, {mode: 'touch'});
    expect(await page.evaluate(() => Arcade.ALL_GAMES.find(g => g.id === 'blocktave').maxStars)).toBe(18);
    await page.evaluate(() => Arcade.Blocktave.showHub());
    await expect(page.locator('#levelGrid .lvl')).toHaveCount(5);
    // a Chapter 5 star (an old save: all of Chapter 5 done)
    await page.evaluate(() => { ['mallet', 'ore10', 'shelter', 'night', 'lamp', 'clams', 'bench', 'metro', 'tuner', 'deep', 'sustain', 'wisps', 'hall', 'row8', 'baton'].forEach(id => Arcade.Blocktave.demo && 0);
      const g = Arcade.store.gameData('blocktave'), ms = (g.ms = g.ms || {}).trumpet = g.ms.trumpet || {};
      window.BT_CHAPTERS.slice(0, 5).forEach((c, i) => { c.goals.forEach(x => { ms[x.id] = '2026-01-01'; }); Arcade.store.setLevel('blocktave', 'trumpet', i + 1, {stars: 3, best: 3}, 3); });
      g.shownCh = {trumpet: {0: 1, 1: 1, 2: 1, 3: 1, 4: 1}};
      Arcade.store.saveGameData('blocktave'); Arcade.Blocktave.showHub(); });
    await expect(page.locator('#levelGrid .lvl')).toHaveCount(6);
    await expect(page.locator('#levelGrid .lvl').nth(5)).toContainText('Grand Staff');
    await page.evaluate(() => Arcade.Blocktave.begin(6));
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    await expect(page.locator('#intro')).toContainText('NEW CHAPTER!', {timeout: 6000});
    await expect(page.locator('#intro')).toContainText('Grand Staff');
    await page.locator('#intro [data-act=go]').click();
    await expect(page.locator('#goals')).toContainText('Chapter 6: Grand Staff');
    // each milestone: one star, once
    for (const id of ['extremes', 'coda', 'grandgem', 'extremes', 'coda']) await page.evaluate(i => Arcade.Blocktave.demo.award(i), id);
    expect(await page.evaluate(() => Arcade.store.level('blocktave', 'trumpet', 6).stars)).toBe(3);
    expect(await page.evaluate(() => Arcade.store.allStars('trumpet', 'blocktave'))).toBe(18);
    // the card shows only once
    await page.evaluate(() => { Arcade.UI.results.hide(); Arcade.Blocktave.showHub(); Arcade.Blocktave.begin(6); });
    await page.waitForTimeout(2000);
    await expect(page.locator('#intro')).toBeHidden();
  });

  test('"Mine Rumble Ore AND Piccolo Quartz": done only with both', async ({page}) => {
    await enter(page, {mode: 'touch'});
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet3', 1));
    for (const [key, done] of [['rumbleOre', false], ['rumbleOre', false], ['piccoloQuartz', true]]) {
      const at = await putBeside(page, key);
      await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.mine(x, y); d.answer(); }, at);
      await waitCardGone(page);
      expect(!!(await page.evaluate(() => (Arcade.store.gameData('blocktave').ms || {}).trumpet || {})).extremes, key).toBe(done);
    }
  });
});

test.describe('Blocktave: Chapter 6 saving (save v 3 and the one-time ore pass)', () => {
  test('a v 2 world gets the ore pass once: every other tile identical, nothing within 6 of a build or in view; v 3 reloads identically; signs, gear and new blocks survive the file', async ({page}) => {
    test.setTimeout(120_000);
    await enter(page, {mode: 'touch'});
    // an older (v 2) world: generated by version 2, with a few things built (written after leaving the world: leaving saves it)
    const made = await page.evaluate(() => {
      Arcade.Blocktave.showHub();
      const BW = Arcade.BlocktaveWorld, R = window.BT_RULES, w = BW.generate(4242, R, 2), ID = BW.ID;
      const builds = [];
      for (const [x, k] of [[40, 'planks'], [110, 'lamp'], [118, 'brick'], [200, 'cot'], [230, 'bench']]) {
        for (let dy = 0; dy < 30; dy++) { const y = R.world.deepY + 2 + dy; if (w.b[y * w.w + x] === ID.slate) { w.b[y * w.w + x] = ID[k]; builds.push([x, y]); break; } }
      }
      const o = BW.encode(w); o.v = 2;
      localStorage.setItem(Arcade.Blocktave.key, JSON.stringify(o));
      return {b: Array.from(w.b), builds};
    });
    await page.evaluate(() => Arcade.Blocktave.begin(1));
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    const r = await page.evaluate(made => {
      const BW = Arcade.BlocktaveWorld, w = Arcade.Blocktave.world(), B = BW.BLOCKS, R = window.BT_RULES, s = Arcade.Blocktave.state();
      const out = {changed: 0, bad: [], counts: s.ores2, player: s.player};
      for (let i = 0; i < w.b.length; i++) {
        if (w.b[i] === made.b[i]) continue;
        out.changed++;
        const k = B[w.b[i]].key, x = i % w.w, y = Math.floor(i / w.w);
        if (!BW.ORES2.includes(k)) { out.bad.push(`(${x},${y}) became ${k}`); continue; }
        if (made.builds.some(([bx, by]) => Math.hypot(bx - x, by - y) <= R.ores.keepAway)) out.bad.push(`(${x},${y}) near a build`);
        if (Math.abs(x - s.player.x) < 12 && Math.abs(y - s.player.y) < 8) out.bad.push(`(${x},${y}) in view`);
      }
      out.builds = made.builds.every(([x, y]) => w.b[y * w.w + x] === made.b[y * w.w + x]);
      return out;
    }, made);
    expect(r.bad.slice(0, 5)).toEqual([]);
    expect(r.builds, 'every build untouched').toBe(true);
    expect(r.changed).toBeGreaterThan(50);
    expect(Object.values(r.counts).reduce((a, n) => a + n, 0)).toBe(r.changed);
    // saved as v 3; reloading never runs the pass again
    const b1 = await page.evaluate(() => { Arcade.Blocktave.save(); return {v: JSON.parse(localStorage.getItem(Arcade.Blocktave.key)).v, b: Array.from(Arcade.Blocktave.world().b)}; });
    expect(b1.v).toBe(3);
    await page.evaluate(() => { Arcade.Blocktave.showHub(); Arcade.Blocktave.begin(1); });
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    const again = await page.evaluate(b => { const w = Arcade.Blocktave.world(); return {same: w.b.every((v, i) => v === b[i]), ores2: Arcade.Blocktave.state().ores2}; }, b1.b);
    expect(again).toEqual({same: true, ores2: null});
    // signs' pairs, gear and new blocks survive SAVE WORLD TO FILE / LOAD
    const g = await flatGround(page, 8);
    await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('segno', 1); d.give('coda', 1); d.place(x - 2, y - 1, 'segno'); d.place(x + 2, y - 1, 'coda'); d.put(x + 4, y - 1, 'trampoline');
      d.give('tubaboots', 1); d.give('glider', 1); }, g);
    const before = await page.evaluate(() => { const s = Arcade.Blocktave.state(); return {signs: s.signs, hot: s.hot, inv: s.inv, json: Arcade.Blocktave.worldJSON()}; });
    await page.evaluate(t => Arcade.Blocktave.importWorld(t, false), before.json);
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    const after = await page.evaluate(() => { const s = Arcade.Blocktave.state(); return {signs: s.signs, hot: s.hot, inv: s.inv}; });
    expect(after.signs).toEqual(before.signs);
    expect(after.signs.every(q => q.mate)).toBe(true);
    expect(after.inv.tubaboots).toBe(1);
    expect(after.hot).toEqual(before.hot);
    expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x + 4, y - 1), g)).toBe('trampoline');
  });
});

/* ================= TOUCH MODE IS THE SAME FOR EVERY MEMBER (the snare included) ================= */
test.describe('Blocktave: TOUCH mode is the same for every member (the snare reads the bells and taps rhythms)', () => {
  const NO_WORDS = /\bplay|\bhits?\b/i;
  /** a snare in TOUCH mode, with the microphone watched from the first script on */
  async function snareTouch(page, {endless = false} = {}) {
    await prepare(page, {store: store('snare', 'touch')});
    await page.addInitScript(() => {
      window.__mic = [];
      const md = navigator.mediaDevices;
      if (md) { const g = md.getUserMedia && md.getUserMedia.bind(md); md.getUserMedia = c => { window.__mic.push('getUserMedia'); return g ? g(c) : Promise.reject(new Error('no')); }; }
    });
    await page.goto('blocktave/index.html?demo&nostart&seed=42');
    await page.evaluate(() => {
      const P = Arcade.Pitch, s = P.start; P.start = function () { window.__mic.push('Pitch.start'); return s.apply(this, arguments); };
      const rm = Arcade.requireMic; Arcade.requireMic = fn => { window.__mic.push('requireMic'); return rm(fn); };
      const e = Arcade.Onsets.ensure; Arcade.Onsets.ensure = () => { if (Arcade.Pitch.source()) window.__mic.push('Onsets'); return e(); };
      window.__texts = [];
      const t = Arcade.UI.toast; Arcade.UI.toast = (m, o) => { window.__texts.push(String(typeof m === 'string' ? m : (m && m.text) || '')); return t(m, o); };
      const i = Arcade.UI.intro.show; Arcade.UI.intro.show = o => { window.__texts.push(o.title + ' ' + o.text); return i(o); };
    });
    if (endless) await page.locator('.ls-endless').first().click(); else await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    await page.waitForFunction(() => Arcade.Blocktave.state().screen === 'world');
    await page.waitForTimeout(300);
  }
  /** what the student sees on the card now (its title line, the question, the buttons) */
  const cardText = page => page.evaluate(() => { const c = document.querySelector('.bt-card'); return c ? c.innerText : ''; });
  const answer = async page => { await page.evaluate(() => Arcade.Blocktave.demo.answer()); await waitCardGone(page); };

  test('snare + TOUCH: every block, creature, recipe, the Podium: a touch card that ?demo passes; no microphone; never "play" or "hits"', {tag: '@slow'}, async ({page}) => {
    test.setTimeout(300_000);
    await snareTouch(page);
    const seenCards = [];
    await page.evaluate(() => Arcade.Blocktave.demo.give('mallet3', 1));
    // every block type
    const kinds = await page.evaluate(() => Arcade.BlocktaveWorld.BLOCKS.filter(b => b.mine && b.mine !== 'tap').map(b => b.key));
    for (const k of kinds) {
      const at = await putBeside(page, k);
      await page.evaluate(({x, y}) => Arcade.Blocktave.demo.mine(x, y), at);
      if (await page.locator('#intro').isVisible()) await page.locator('#intro [data-act=go]').click();
      expect(await cardOpen(page), `${k} opens a card`).toBe(true);
      const kind = await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind);
      seenCards.push([k, kind, await cardText(page)]);
      await answer(page);
      expect(await page.evaluate(({x, y}) => Arcade.Blocktave.demo.at(x, y), at), `${k} was mined`).toBe('air');
    }
    // the creatures (their own cards, as if tapped)
    for (const kind of ['clam', 'wisp', 'rusher']) {
      const id = await page.evaluate(k => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn(k, 7); }, kind);
      await page.waitForTimeout(150);
      if (await page.locator('#intro').isVisible()) await page.locator('#intro [data-act=go]').click();
      if (!(await cardOpen(page))) await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
      seenCards.push([kind, await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind), await cardText(page)]);
      expect(await calmByCards(page, id), `${kind} calmed`).toBeLessThanOrEqual(12);
    }
    await page.evaluate(() => Arcade.Blocktave.demo.time(30));
    // every recipe performance (note, notes3, beats, longtone, scale), at a bench
    await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) - 1, y = Math.floor(s.player.y) - 1; d.put(x, y, 'air'); d.place(x, y, 'bench'); });
    for (const id of ['maple-planks', 'brass-mallet', 'metronome', 'tuner', 'music-stand']) {
      await page.evaluate(id => { const d = Arcade.Blocktave.demo; window.BT_RECIPES.find(r => r.id === id).in.forEach(k => d.give(k, 1)); }, id);
      expect(await page.evaluate(id => Arcade.Blocktave.demo.craft(id), id), id).toBe(true);
      seenCards.push([id, await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind), await cardText(page) + ' ' + await page.locator('#recipeLine').innerText()]);
      await answer(page);
    }
    // the recipe book's performance lines
    await page.locator('#bookBtn').click();
    seenCards.push(['book', '-', await page.locator('#book').innerText()]);
    await page.evaluate(() => Arcade.Blocktave.demo.hold(false));
    await page.keyboard.press('c');
    // the Composer row + the Conductor's Podium
    const pod = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x) + 1, y = Math.floor(s.player.y) - 1;
      for (let k = 0; k < 3; k++) { d.put(x + k, y, 'composer'); } d.put(x + 3, y, 'podium'); d.put(x + 3, y + 1, 'slate'); return {x: x + 3, y}; });
    await page.evaluate(({x, y}) => Arcade.Blocktave.demo.act(x, y, true), pod);
    seenCards.push(['podium say', '-', await page.locator('#compSay').innerText()]);
    await page.locator('#compPerf').click();
    seenCards.push(['podium', await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind), await cardText(page)]);
    await answer(page);
    // the Settings row
    await page.evaluate(() => Arcade.UI.settings.open());
    seenCards.push(['settings', '-', await page.locator('#uiSettings .ui-srow').first().innerText()]);
    await page.evaluate(() => { const d = document.querySelector('#uiSettings [data-act=done]'); if (d) d.click(); });
    // the cards: touch cards, never a drum performance
    for (const [what, kind] of seenCards) expect(['count', 'roll'], `${what}: ${kind}`).not.toContain(kind);
    const byKey = Object.fromEntries(seenCards.map(([w, k]) => [w, k]));
    expect(byKey.toneOre).toBe('notes'); expect(byKey.scaleVein).toBe('notes'); expect(byKey.sustain).toBe('key');
    expect(byKey.rhythmRock).toBe('rhythm'); expect(byKey.clam).toBe('notes'); expect(byKey.wisp).toBe('key'); expect(byKey.podium).toBe('notes');
    // the words: never "play" or "hits" (cards, first cards, toasts, the recipe line and book, the podium, Settings)
    const words = seenCards.map(([w, , t]) => [w, t]).concat((await page.evaluate(() => window.__texts)).map(t => ['toast/first card', t]));
    expect(words.filter(([, t]) => NO_WORDS.test(t)).map(([w, t]) => `${w}: ${t.replace(/\s+/g, ' ').slice(0, 90)}`)).toEqual([]);
    // no microphone at any point
    expect(await page.evaluate(() => window.__mic)).toEqual([]);
    expect(await page.evaluate(() => Arcade.Pitch.listening())).toBe(false);
  });

  test('snare + TOUCH: Survival Nights is all touch cards too, with no microphone', async ({page}) => {
    await snareTouch(page, {endless: true});
    expect((await st(page)).endless).toBe(true);
    for (const k of ['toneOre', 'sustain']) {
      const at = await putBeside(page, k);
      await page.evaluate(({x, y}) => { const d = Arcade.Blocktave.demo; d.give('baton', 1); d.mine(x, y); }, at);
      if (await page.locator('#intro').isVisible()) await page.locator('#intro [data-act=go]').click();
      expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe(k === 'toneOre' ? 'notes' : 'key');
      expect(NO_WORDS.test(await cardText(page))).toBe(false);
      await answer(page);
    }
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 7); });
    await page.waitForTimeout(150);
    if (await page.locator('#intro').isVisible()) await page.locator('#intro [data-act=go]').click();
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('notes');
    expect(await calmByCards(page, id)).toBe(2);                         // the Golden Baton: 5 a hit, a clam has 10
    expect(await page.evaluate(() => window.__mic)).toEqual([]);
  });

  test('snare + INSTRUMENT: exactly the drum cards (count, roll, rhythm); trumpet unchanged in both modes', async ({page}) => {
    const kinds = () => page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y), o = {};
      for (const k of ['tone', 'note', 'notes3', 'scale', 'sustain', 'longtone', 'rhythm', 'rest', 'beats']) o[k] = d.spec(k, x, y, 3).kind; return o; });
    await enter(page, {member: 'snare', mode: 'inst'});
    expect(await kinds()).toEqual({tone: 'count', note: 'count', notes3: 'count', scale: 'rhythm', sustain: 'roll', longtone: 'roll', rhythm: 'rhythm', rest: 'rest', beats: 'rhythm'});
    const id = await page.evaluate(() => { const d = Arcade.Blocktave.demo; d.time(window.BT_RULES.dayS + 30); return d.spawn('clam', 7); });
    await page.evaluate(i => Arcade.Blocktave.demo.creatureCard(i), id);
    expect(await page.evaluate(() => Arcade.BlocktaveCard.current.state().kind)).toBe('count');
    await page.evaluate(() => Arcade.BlocktaveCard.close());
    await page.evaluate(() => { Arcade.Blocktave.demo.give('maple', 1); Arcade.Blocktave.demo.addToSlot('maple'); });
    await page.keyboard.press('c');
    await expect(page.locator('#recipeLine')).toContainText('Count your hits');
  });
  for (const mode of ['inst', 'touch']) {
    test(`trumpet (${mode}): the cards are unchanged`, async ({page}) => {
      await enter(page, {mode});
      const k = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y), o = {};
        for (const k of ['tone', 'scale', 'sustain', 'rhythm', 'rest', 'beats']) o[k] = d.spec(k, x, y, 3).kind; o.clef = d.spec('tone', x, y, 1).clef; return o; });
      expect(k).toEqual({tone: 'notes', scale: 'notes', sustain: mode === 'inst' ? 'sustain' : 'key', rhythm: 'rhythm', rest: 'rest', beats: 'rhythm', clef: 'treble'});
    });
  }

  for (const [name, vp] of [['phone', {width: 390, height: 844}], ['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`snare + TOUCH: note cards in treble clef, the bells' range, fitting the card (${name})`, async ({page}) => {
      await page.setViewportSize(vp);
      await enter(page, {member: 'snare', mode: 'touch'});
      const r = await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y), b = Arcade.memberById('bells'), out = [];
        for (let k = 0; k < 10; k++) { const sp = d.spec(k % 2 ? 'scale' : 'notes3', x, y, k % 2 ? 8 : 3); out.push({clef: sp.clef, inRange: sp.items.every(i => i.midi >= b.lowMidi && i.midi <= b.highMidi)}); }
        return out; });
      r.forEach(c => expect(c).toEqual({clef: 'treble', inRange: true}));
      await page.evaluate(() => { const d = Arcade.Blocktave.demo, s = Arcade.Blocktave.state(), x = Math.floor(s.player.x), y = Math.floor(s.player.y); d.openSpec(d.spec('scale', x, y, 8), x + 1, y - 2); });
      const fit = await page.evaluate(() => { const card = document.querySelector('.bt-card'), cr = card.getBoundingClientRect(), bad = [];
        card.querySelectorAll('.bt-staff ellipse.head').forEach(e => { const q = e.getBoundingClientRect(); if (q.left < cr.left - .5 || q.right > cr.right + .5 || q.top < cr.top - .5 || q.bottom > cr.bottom + .5) bad.push(1); });
        return {bad: bad.length, n: card.querySelectorAll('.bt-staff ellipse.head').length, onScreen: cr.left >= -.5 && cr.right <= innerWidth + .5 && cr.bottom <= innerHeight + .5, clef: card.querySelector('.bt-staff svg').textContent.includes('𝄞')}; });
      expect(fit).toEqual({bad: 0, n: 8, onScreen: true, clef: true});
    });
  }
});
