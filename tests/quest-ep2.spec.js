/* ARCADE QUEST, EPISODE 2: THE SHOWTIME STAGE, build step 1 (THE FRAMEWORK: docs/games/arcade-quest-ep2-plan.md).
   EPISODE SELECT on the title (only after ep1Done; ?demo opens it on any save, ?demo&locked keeps the real lock), the attic's stage speaker (the yes/no and the pull), the intro
   cutscene 'ep2-intro' (skippable, reduced motion), the Lobby and the Green Room (walkable, every NPC talks, Ticket
   Booth Tina = THE SHARED WALLET, Popcorn Pete's shop, the Save Jukebox saves ep: 2 and CONTINUE comes back), doors
   to rooms still being built, Episode 2's whispers, the floor's line per episode, SAVE_VERSION 6, the QUEST CODE
   version 6 (Episode 2's progress; every older version still loads), the Arcade Backup Code, the new rooms at phone,
   iPad and Chromebook sizes, every new line ≤ 80 characters. GALLERY=1 saves docs/gallery/aq-ep2/sprites.png.
   Episode 1 itself is checked by every other quest-*.spec.js (unchanged). */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide, ROOT} = require('./helpers');
const OLD = require('./fixtures/quest-codes.json');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
/** a v5 save (before Episode 2 existed): past Episode 1 or not, last saved at the Foyer's jukebox */
function save(ep1Done = true, extra = {}) {
  return Object.assign({v: 5, level: 9, xp: 0, hp: 30, maxHp: 52, tokens: 400, items: {'valve-oil': 2}, roster: ['wisp', 'hush', 'conductor'],
    battles: {won: 20, befriended: 20, faded: 0}, world: {map: 'foyer', x: 18, y: 3, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]},
    band: [], route: {}, flags: Object.assign({'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true}, ep1Done ? {ep1Done: true} : {}), done: {}}, extra);
}
const store = (s = save()) => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}});

/** the game, its title screen past PRESS START (or a room with ?warp) */
async function boot(page, st = store(), url = 'arcade-quest/index.html?demo') {
  const watch = await prepare(page, {store: st});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName);
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
  });
  if (/warp=/.test(url)) return watch;
  await page.waitForFunction(() => Arcade.Quest.sceneName === 'title');
  if (await page.locator('#qPress').count()) await page.locator('#qPress').click();
  await expect(page.locator('#qTitleMenu .q-btn:not(.q-press)').first()).toBeVisible();
  return watch;
}
const titleItems = page => page.locator('#qTitleMenu .q-btn .q-bl').allTextContents();
const pick = (page, label) => page.locator('#qTitleMenu .q-btn', {hasText: label}).first().click();
const where = page => page.evaluate(() => { const Q = Arcade.Quest; return {scene: Q.sceneName, w: Q.world && Q.world.state(), cut: Q.cutscene && Q.cutscene()}; });
/** press A until the overworld is free again (text boxes closed) */
async function idle(page, map) {
  for (let i = 0; i < 60; i++) {
    const s = await where(page), text = await page.locator('#qText:not([hidden])').count();
    if (s.scene === 'world' && s.w && (!map || s.w.map === map) && !s.w.busy && !text && !(await page.locator('.q-overlay').count())) return s.w;
    if (text) await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
  }
  throw new Error('not idle: ' + JSON.stringify(await where(page)));
}
/** stand on a tile facing a direction, then A */
async function faceAndTalk(page, x, y, dir) {
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.keyboard.press('Enter');
}
const lines = page => page.evaluate(() => window.__lines.slice());
/** press A through the text box until a panel shows */
async function until(page, sel) {
  for (let i = 0; i < 30 && !(await page.locator(sel).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  await expect(page.locator(sel).first()).toBeVisible();
}
const clearLines = page => page.evaluate(() => { window.__lines.length = 0; });

test.describe('EPISODE SELECT', () => {
  test('before Episode 1 is finished the title is exactly as before: no EPISODES, Episode 1\'s line', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, store(save(false)), 'arcade-quest/index.html?demo&locked');      // (the real lock, under ?demo)
    expect(await titleItems(page)).toEqual(['Continue', 'New game', 'Enter save code', 'Settings', 'Your player', 'Test Arena']);
    await expect(page.locator('.q-title .q-ep')).toHaveText('Episode 1: Ghost Notes Manor');
    expect(await page.evaluate(() => Arcade.Quest.episodes.go(2))).toBe(false);          // locked: nothing happens
    expect((await where(page)).scene).toBe('title');
    watch.check();
  });

  test('after it: EPISODES lists both; Episode 2 plays its intro the first time, then goes to the Lobby; Episode 1 = the Foyer\'s jukebox', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    expect(await titleItems(page)).toEqual(['Continue', 'Episodes', 'New game', 'Enter save code', 'Settings', 'Your player', 'Test Arena']);
    await expect(page.locator('.q-title .q-ep')).toContainText('Episode 2: The Showtime Stage');
    expect(await page.locator('.q-title .q-ep-soon').count()).toBe(0);                  // (build step 5 took the "coming soon" note off)
    await pick(page, 'Episodes');
    expect(await titleItems(page)).toEqual(['Episode 1: Ghost Notes Manor ✓', 'Episode 2: The Showtime Stage', 'Back']);
    expect(await page.locator('.q-demo-note').count()).toBe(0);                          // truly unlocked: no demo note
    await page.keyboard.press('Escape');                                                 // B = back to the title menu
    await expect(page.locator('#qTitleMenu .q-btn', {hasText: 'Episodes'})).toBeVisible();
    await pick(page, 'Episodes');
    await pick(page, 'Episode 2');
    await expect.poll(async () => ((await where(page)).cut || {}).id).toBe('ep2-intro');
    expect(await page.evaluate(() => Arcade.Quest.save.flag('ep2Start'))).toBe(true);
    await page.locator('.q-skip').click();
    const w = await idle(page, 'lobby');
    expect([w.x, w.y]).toEqual([11, 10]);                                                // the front steps → the Lobby
    expect(await lines(page)).toEqual(expect.arrayContaining([expect.stringContaining('frozen, baton raised')]));
    expect(await page.evaluate(() => Arcade.Quest.save.get().ep)).toBe(2);
    // the second time: no intro, straight to the Lobby's jukebox
    await page.evaluate(() => Arcade.Quest.go('title'));
    await pick(page, 'Episodes'); await pick(page, 'Episode 2');
    expect((await idle(page, 'lobby'))).toMatchObject({x: 21, y: 5, dir: 'up'});
    // Episode 1: the Foyer's jukebox
    await page.evaluate(() => Arcade.Quest.go('title'));
    await pick(page, 'Episodes'); await pick(page, 'Episode 1');
    expect((await idle(page, 'foyer'))).toMatchObject({x: 18, y: 3, dir: 'up'});
    expect(await page.evaluate(() => Arcade.Quest.save.get().ep)).toBe(1);
    watch.check();
  });

  test('the title menu and EPISODE SELECT fit at phone, iPad and laptop sizes (with the demo note too)', async ({browser}) => {
    test.setTimeout(90000);
    for (const size of [{width: 390, height: 844}, {width: 1024, height: 768}, {width: 768, height: 1024}, {width: 1366, height: 768}]) {
      for (const demo of [false, true]) {                    // finished Episode 1 / ?demo on a save that didn't (the note)
        const ctx = await browser.newContext({viewport: size}), page = await ctx.newPage();
        const watch = await boot(page, store(save(!demo)));
        for (const step of ['title', 'episodes']) {
          if (step === 'episodes') await pick(page, 'Episodes');
          const bad = await page.evaluate(() => [...document.querySelectorAll('#ui .q-btn, #ui .q-demo-note')].filter(b => {
            const l = b.querySelector('.q-bl') || b, r = b.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
            const over = b.classList.contains('q-demo-note') && [...document.querySelectorAll('#qTitleMenu .q-btn')].some(x => { const q = x.getBoundingClientRect(); return q.bottom > r.top + 1 && q.top < r.bottom - 1; });
            return l.scrollWidth > l.clientWidth + 1 || l.scrollHeight > l.clientHeight + 1 || r.bottom > s.bottom + 1 || r.top < s.top - 1 || over;
          }).map(b => b.textContent));
          expect(bad, `${step}${demo ? ' (demo)' : ''} at ${size.width} × ${size.height}`).toEqual([]);
          if (step === 'episodes') expect(await page.locator('.q-demo-note').count()).toBe(demo ? 1 : 0);
        }
        watch.check();
        await ctx.close();
      }
    }
  });

  test('?demo opens EPISODE SELECT before Episode 1 is finished (the teacher): no ✓ on Episode 1, the demo note; Episode 2 = its intro, ep1Done untouched', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, store(save(false)));
    expect(await titleItems(page)).toEqual(['Continue', 'Episodes', 'New game', 'Enter save code', 'Settings', 'Your player', 'Test Arena']);
    await expect(page.locator('.q-title .q-ep')).toHaveText('Episode 1: Ghost Notes Manor');   // the story's line: still Episode 1
    expect(await page.evaluate(() => [Arcade.Quest.episodes.unlocked(2), Arcade.Quest.episodes.open(2)])).toEqual([false, true]);
    await pick(page, 'Episodes');
    expect(await titleItems(page)).toEqual(['Episode 1: Ghost Notes Manor', 'Episode 2: The Showtime Stage', 'Back']);
    await expect(page.locator('.q-demo-note')).toHaveText('Demo: every episode is open.');
    await expect(page.locator('.q-demo-note')).toBeVisible();
    await pick(page, 'Episode 2');
    await expect.poll(async () => ((await where(page)).cut || {}).id).toBe('ep2-intro');
    expect(await page.locator('.q-demo-note').count()).toBe(0);
    expect(await page.evaluate(() => Arcade.Quest.save.flag('ep2Start'))).toBe(true);
    await page.locator('.q-skip').click();
    const w = await idle(page, 'lobby');
    expect([w.x, w.y]).toEqual([11, 10]);
    expect(await page.evaluate(() => Arcade.Quest.save.flag('ep1Done'))).toBe(false);    // demo opened the menu, not the story
    watch.check();
  });

  test('?demo on a brand-new device (no save at all): EPISODES shows; Episode 2 plays its intro', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS, keysTip: true}}}));
    expect(await titleItems(page)).toContain('Episodes');
    await pick(page, 'Episodes');
    await pick(page, 'Episode 2');
    await expect.poll(async () => ((await where(page)).cut || {}).id).toBe('ep2-intro');
    watch.check();
  });

  test('without ?demo, before Episode 1 is finished: no EPISODES, and Episode 2 can\'t be opened', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, store(save(false)), 'arcade-quest/index.html');
    expect(await titleItems(page)).not.toContain('Episodes');
    expect(await page.evaluate(() => Arcade.Quest.episodes.go(2))).toBe(false);
    expect((await where(page)).scene).toBe('title');
    watch.check();
  });
});

test.describe('the attic\'s old stage speaker', () => {
  test('before ep1Done the dusty sheet is only its old sign', async ({page}) => {
    const watch = await boot(page, store(save(false)), 'arcade-quest/index.html?demo&warp=attic');
    await idle(page, 'attic');
    await clearLines(page);
    await faceAndTalk(page, 5, 5, 'up');
    await idle(page, 'attic');
    expect(await lines(page)).toEqual(['Something huge under a dusty sheet. A thick cable snakes out from under it.',
      'You hear a low hum. Kssshhh... It sounds like it\'s listening. Better not peek yet.']);
    expect(await page.locator('.q-ask').count()).toBe(0);
    expect(await page.evaluate(() => Arcade.Quest.save.flag('ep2Start'))).toBe(false);
    watch.check();
  });

  test('after it: "Pull the sheet?" (No = nothing happens; Yes = the pull); then the speaker stands uncovered', async ({page}) => {
    const watch = await boot(page, store(), 'arcade-quest/index.html?demo&warp=attic');
    await idle(page, 'attic');
    await clearLines(page);
    await faceAndTalk(page, 5, 5, 'up');
    await until(page, '.q-ask');
    await expect(page.locator('.q-ask h2')).toHaveText('Pull the sheet?');
    expect(await lines(page)).toEqual(['An old stage speaker hides under the sheet, as big as a wardrobe.', 'A thick cable runs from it into the wall.']);
    await page.locator('.q-ask .q-btn', {hasText: 'No'}).click();
    await idle(page, 'attic');
    expect(await page.evaluate(() => Arcade.Quest.save.flag('ep2Start'))).toBe(false);
    await faceAndTalk(page, 6, 5, 'up');
    await until(page, '.q-ask');
    await page.locator('.q-ask .q-btn', {hasText: 'Yes'}).click();
    await expect.poll(async () => ((await where(page)).cut || {}).id).toBe('ep2-intro');
    expect(await page.evaluate(() => Arcade.Quest.cutscene().show)).toBe('sheet');
    await page.locator('.q-skip').click();
    await idle(page, 'lobby');
    // back in the attic: the speaker stands where the sheet was (a prop), and it offers the way back in
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'attic', x: 5, y: 5, dir: 'up'}));
    await idle(page, 'attic');
    await faceAndTalk(page, 5, 5, 'up');
    await until(page, '.q-ask');
    await expect(page.locator('.q-ask h2')).toHaveText('Step back into the Showtime Stage?');
    await page.locator('.q-ask .q-btn', {hasText: 'Yes'}).click();
    expect(await idle(page, 'lobby')).toMatchObject({x: 21, y: 5});                       // no intro the second time
    watch.check();
  });
});

test.describe('the intro cutscene', () => {
  test('every shot plays in order and A moves on; SKIP ends it', async ({page}) => {
    const watch = await boot(page);
    await page.evaluate(() => Arcade.Quest.episodes.go(2));
    const shows = [];
    for (let i = 0; i < 40; i++) {
      const s = await where(page);
      if (s.scene !== 'cutscene') break;
      if (!shows.includes(s.cut.show) || shows[shows.length - 1] !== s.cut.show) shows.push(s.cut.show);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    }
    expect([...new Set(shows)]).toEqual(['sheet', 'speaker', 'speaker-pull', 'black', 'marquee', 'steps']);
    await idle(page, 'lobby');
    watch.check();
  });

  test('reduced motion: no flicker (the marquee stands still), still skippable', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await boot(page);
    await page.evaluate(() => Arcade.Quest.episodes.go(2));
    for (let i = 0; i < 20 && ((await where(page)).cut || {}).show !== 'marquee'; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
    expect((await where(page)).cut.show).toBe('marquee');
    expect(await page.evaluate(() => Arcade.Quest.reduced())).toBe(true);
    // the marquee drawn at 12 moments over 3 s: every frame the same (the flickering M stays on, the bulbs steady)
    const frames = await page.evaluate(async () => {
      const c = document.getElementById('screen'), out = new Set();
      for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 250)); out.add(c.toDataURL()); }
      return out.size;
    });
    expect(frames).toBe(1);
    await page.locator('.q-skip').click();
    await idle(page, 'lobby');
    watch.check();
  });

  test('the marquee\'s M flickers slowly (never 3 times a second) with motion on', async ({page}) => {
    const watch = await boot(page);
    await page.evaluate(() => Arcade.Quest.episodes.go(2));
    for (let i = 0; i < 20 && ((await where(page)).cut || {}).show !== 'marquee'; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
    // the canvas's top half (the marquee, above the text box), sampled every 50 ms of the page's own time over 3 s
    const changes = await page.evaluate(async () => {
      const c = document.getElementById('screen'), x = c.getContext('2d'), seen = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 3000) {
        await new Promise(r => setTimeout(r, 50));
        const d = x.getImageData(0, 0, c.width, Math.round(c.height / 2)).data;
        let sum = 0; for (let i = 0; i < d.length; i += 64) sum += d[i] + d[i + 1] + d[i + 2];
        seen.push([performance.now(), sum]);
      }
      const flips = []; for (let i = 1; i < seen.length; i++) if (seen[i][1] !== seen[i - 1][1]) flips.push(seen[i][0]);
      return flips;
    });
    // at most 2 changes (off, on again) in any one second
    for (const t of changes) expect(changes.filter(u => u >= t && u < t + 1000).length).toBeLessThanOrEqual(2);
    watch.check();
  });
});

test.describe('the Lobby and the Green Room', () => {
  test('walkable; Maestro Moose, Tina, Pete and Professor Hoot all talk', async ({page}) => {
    const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true, 'seen-intro': true, pathsTip: true}})), 'arcade-quest/index.html?demo&warp=lobby');
    let w = await idle(page, 'lobby');
    expect(w).toMatchObject({x: 11, y: 10});
    await page.keyboard.press('ArrowLeft');                                              // a few steps along the carpet
    await expect.poll(async () => { const s = (await where(page)).w; return [s.x, s.moving]; }).toEqual([10, false]);
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => { const s = (await where(page)).w; return [s.y, s.moving]; }).toEqual([9, false]);
    expect((await idle(page, 'lobby')).npcs.map(n => n.id).sort()).toEqual(['moose', 'pete', 'tina']);
    // Maestro Moose (in the middle: talk from below)
    await clearLines(page); await faceAndTalk(page, 11, 7, 'up'); await idle(page, 'lobby');
    expect((await lines(page))[0]).toBe('And a one, and a t— And a one, and a t— And a one, and a t—');
    expect(await lines(page)).toContain('...I can\'t START without my band! The static has them all stuck in loops!');
    await clearLines(page); await faceAndTalk(page, 11, 7, 'up'); await idle(page, 'lobby');
    expect((await lines(page)).join(' ')).toMatch(/And a one|t—/);
    // the Green Room: in through its door, Professor Hoot stuck on measure 12
    await page.evaluate(() => Arcade.Quest.world.warp(2, 2, 'up'));
    await page.keyboard.press('ArrowUp');
    w = await idle(page, 'greenroom');
    expect([w.x, w.y]).toEqual([7, 8]);
    await clearLines(page); await faceAndTalk(page, 4, 6, 'up'); await idle(page, 'greenroom');
    expect((await lines(page))[0]).toBe('Measure 12... measure 12... measure 12...');
    await clearLines(page); await faceAndTalk(page, 5, 6, 'up'); await idle(page, 'greenroom');
    expect(await lines(page)).toEqual(['A music stand. The page says "Measure 12" in very big letters. Hoo.']);
    // out through the aisle exit, back in the Lobby by the Green Room's door
    await page.evaluate(() => Arcade.Quest.world.warp(7, 8, 'down'));
    await page.keyboard.press('ArrowDown');
    w = await idle(page, 'lobby');
    expect([w.x, w.y]).toEqual([2, 2]);
    watch.check();
  });

  test('Ticket Booth Tina is THE SHARED WALLET; Popcorn Pete sells Rusty\'s stock for the same tokens', async ({page}) => {
    const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true}})), 'arcade-quest/index.html?demo&warp=lobby');
    await idle(page, 'lobby');
    const bal = () => page.evaluate(() => Arcade.Tokens.balance());
    const start = await bal();
    // Tina: talk at her window
    await faceAndTalk(page, 3, 5, 'up');
    await until(page, '.q-booth');
    await expect(page.locator('.q-booth h2')).toHaveText('Ticket Booth');
    await expect(page.locator('.q-booth .q-pbody')).toContainText(`You have ${start} tokens`);
    expect(await lines(page)).toContain('Same wallet as his booth, hon. Your arcade stars turn into tokens. 5 each!');
    // the same shelves as Terry's: the shared catalog
    await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
    const n = await page.locator('.q-cosshop .q-pmenu .q-btn').count();
    expect(n - 1).toBe(await page.evaluate(() => Arcade.Tokens.catalog().filter(it => it.onSale).length));
    await page.locator('.q-cosshop .q-btn', {hasText: 'Back'}).click();
    await page.locator('.q-booth .q-btn', {hasText: 'Done'}).click();
    await idle(page, 'lobby');
    expect(await page.evaluate(() => Arcade.Quest.save.flag('met-tina'))).toBe(true);
    // Pete: a Valve Oil, paid from the same wallet
    await faceAndTalk(page, 18, 5, 'up');
    await until(page, '.q-shop');
    await expect(page.locator('.q-shop h2')).toHaveText('Popcorn Pete\'s Snacks');
    const oil = await page.evaluate(() => Arcade.Quest.save.get().items['valve-oil'] || 0);
    await page.locator('.q-shop .q-btn', {hasText: 'Valve Oil'}).click();
    expect(await page.evaluate(() => Arcade.Quest.save.get().items['valve-oil'])).toBe(oil + 1);
    expect(await bal()).toBe(start - await page.evaluate(() => window.QUEST_ITEMS['valve-oil'].price));
    await page.locator('.q-shop .q-btn', {hasText: 'Done'}).click();
    await idle(page, 'lobby');
    expect(await lines(page)).toContain('Enjoy the show! Well, whenever there IS a show. POP!');
    watch.check();
  });

  test('the Save Jukebox saves ep: 2 and the room and refills HP; CONTINUE comes back to it', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true}})), 'arcade-quest/index.html?demo&warp=lobby');
    await idle(page, 'lobby');
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.hp = 5; Arcade.Quest.save.write(); });
    await faceAndTalk(page, 21, 5, 'up');
    await until(page, '.q-juke');
    await page.locator('.q-juke .q-btn', {hasText: 'Save here'}).click();
    for (let i = 0; i < 10 && !(await page.locator('.q-codep').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    await expect(page.locator('.q-codep .q-code')).toHaveText(/^([0-9A-Z]{5}-){15}[0-9A-Z]{5}$/);    // the 80-character code
    await page.locator('.q-codep .q-btn', {hasText: 'Done'}).click();
    const s = await page.evaluate(() => { const s = Arcade.Quest.save.get(); return {v: s.v, ep: s.ep, world: s.world, hp: s.hp, maxHp: s.maxHp}; });
    expect(s).toMatchObject({v: 6, ep: 2, world: {map: 'lobby', x: 21, y: 5, dir: 'up'}});
    expect(s.hp).toBe(s.maxHp);
    await page.evaluate(() => Arcade.Quest.go('title'));
    await pick(page, 'Continue');
    expect(await idle(page, 'lobby')).toMatchObject({x: 21, y: 5});
    watch.check();
  });

  test('the Lobby\'s doors: the Pit and the Workshop open (build step 3); the balcony is roped off until Tubby wakes; no whispers in the Lobby or the Green Room', async ({page}) => {
    const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true}})), 'arcade-quest/index.html?demo&warp=lobby');
    await idle(page, 'lobby');
    for (const [x, map] of [[11, 'pit'], [19, 'workshop']]) {
      await page.evaluate(x => Arcade.Quest.world.warp(x, 2, 'up'), x);
      await page.keyboard.press('ArrowUp');                                              // through the door
      await idle(page, map);
      await page.evaluate(() => Arcade.Quest.go('world', {map: 'lobby'}));
      await idle(page, 'lobby');
    }
    await clearLines(page);
    await page.evaluate(() => Arcade.Quest.world.warp(21, 2, 'up'));
    await page.keyboard.press('ArrowUp');                                                // bump into the rope
    await expect.poll(() => lines(page)).toContain('Roped off. A sign says: CLOSED FOR REHEARSAL.');
    expect(await idle(page, 'lobby')).toMatchObject({x: 21, y: 2});
    // Tubby awake: the rope comes down, and the stairs lead up to the balcony
    await page.evaluate(() => Arcade.Quest.save.setFlag('tuskAwake'));
    await page.evaluate(() => Arcade.Quest.world.warp(21, 2, 'up'));
    await page.keyboard.press('ArrowUp');
    await idle(page, 'balcony');
    // whispers: never in the safe Lobby nor the practice Green Room
    for (const map of ['lobby', 'greenroom']) {
      await page.evaluate(m => Arcade.Quest.go('world', {map: m}), map);
      await idle(page, map);
      await page.evaluate(() => Arcade.Quest.world.whisperNow());
      await page.waitForTimeout(300);
      expect(await page.locator('#qWhisper.on').count(), map).toBe(0);
    }
    watch.check();
  });

  test('Episode 2\'s whispers: its own lines, the microphone between the curtains', async ({page}) => {
    const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true}})), 'arcade-quest/index.html?demo&warp=lobby');
    await idle(page, 'lobby');
    // a pretend Episode 2 room with curtains (the real ones come with the next build steps)
    const lines2 = await page.evaluate(() => {
      window.QUEST_MAPS['ep2-test'] = {name: 'Test Wings', ep: 2, floor: 'u', tiles: ['========', '=VVVVVV=', '=uuuuuu=', '=uuuuuu=', '===A===='],
        doors: [{at: [3, 4], to: 'lobby', spawn: [11, 9], dir: 'down'}], npcs: [], things: [], enemies: []};
      Arcade.Quest.go('world', {map: 'ep2-test', x: 2, y: 2});
      return window.QUEST_WHISPERS_EP2;
    });
    await idle(page, 'ep2-test');
    await page.evaluate(() => Arcade.Quest.world.whisperNow());
    await expect(page.locator('#qWhisper.on')).toBeVisible();
    expect(lines2).toContain(await page.locator('#qWhisper').textContent());
    watch.check();
  });

  for (const [name, size, touch] of [['phone', {width: 390, height: 844}, true], ['iPad', {width: 1180, height: 820}, true], ['Chromebook', {width: 1366, height: 768}, false]]) {
    test(`the new rooms at ${name} size: the canvas letterboxes inside the screen, nothing too wide`, async ({browser}) => {
      const ctx = await browser.newContext({viewport: size, hasTouch: touch, isMobile: touch && size.width < 500});
      const page = await ctx.newPage();
      const watch = await boot(page, store(save(true, {flags: {ep1Done: true, ep2Start: true}})), 'arcade-quest/index.html?demo&warp=lobby');
      for (const map of ['lobby', 'greenroom']) {
        await page.evaluate(m => Arcade.Quest.go('world', {map: m}), map);
        await idle(page, map);
        const box = await page.locator('#screen').boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.y).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
        expect(box.width / box.height).toBeCloseTo(320 / 180, 1);
        expect(await tooWide(page), map).toEqual([]);
      }
      watch.check();
      await ctx.close();
    });
  }
});

test.describe('saves and codes', () => {
  test('a v5 save upgrades to v6 (ep from its last jukebox); Episode 1 progress unchanged', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, store(save(false)));
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, s = Q.save.get();
      return {v: s.v, ep: s.ep, level: s.level, roster: s.roster, world: s.world, flags: s.flags};
    });
    expect(r).toMatchObject({v: 6, ep: 1, level: 9, roster: ['wisp', 'hush', 'conductor'], world: {map: 'foyer', x: 18, y: 3}});
    // a v5 save last saved in a (future) Episode 2 room: ep 2
    const r2 = await page.evaluate(() => {
      const d = Arcade.store.gameData('arcade-quest');
      d.save = {v: 5, level: 3, xp: 0, hp: 28, maxHp: 28, tokens: 0, items: {}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
        world: {map: 'loft', x: 4, y: 4, dir: 'up'}, flags: {ep1Done: true}, done: {}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: null, route: {}};
      const s = Arcade.Quest.save.get();
      return {v: s.v, ep: s.ep};
    });
    expect(r2).toEqual({v: 6, ep: 2});
    watch.check();
  });

  test('every older QUEST CODE version (1–5) still loads, exactly as before', async ({page}) => {
    const watch = await boot(page, store(save(false)));
    for (const [v, {code, fields}] of Object.entries(OLD)) {
      const d = await page.evaluate(c => Arcade.Backup.questDecode(c), code);
      expect(d.ok, v).toBe(true);
      expect(d.fields, v).toEqual(fields);
      const loaded = await page.evaluate(c => { const r = Arcade.Quest.save.fromCode(c); const s = Arcade.Quest.save.get(); return {ok: r.ok, v: s.v, ep: s.ep}; }, code);
      expect(loaded, v).toEqual({ok: true, v: 6, ep: 1});
    }
    watch.check();
  });

  test('the version-6 code round-trips Episode 2\'s progress (flags, machines and their routes, friends, charms, the episode, the jukebox)', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, B = Arcade.Backup, s = Q.save.get();
      // (Episode 2's charms come with build step 5: a stand-in for the Rosin Pouch, so it can be worn)
      window.QUEST_CHARMS['rosin-pouch'] = window.QUEST_CHARMS['rosin-pouch'] || {name: 'Rosin Pouch', desc: 'A stand-in.', effect: {calm: 1.1}};
      Object.assign(s.flags, {ep2Start: true, songEb: true, tuskAwake: true, ricoDone: true, ricoVent: true, 'met-moose': true, hootAwake: true});
      Object.assign(s.done, {'pit:m1': 'befriend', 'workshop:m3': 'fade', 'balcony:m2': 'befriend', 'dressing:boss': 'fade', 'hall:w1': 'befriend'});
      s.roster.push('tapsy', 'rico');
      s.charms.owned['rosin-pouch'] = true; s.charms.owned['golden-mouthpiece'] = true;
      s.charms.equipped = ['rosin-pouch', 'golden-mouthpiece'];
      s.ep = 2; s.world = {map: 'lobby', x: 21, y: 5, dir: 'up'};
      Q.save.write();
      const code = Q.save.code(), d = B.questDecode(code).fields;
      Q.save.reset();
      const ok = Q.save.fromCode(code).ok, t = Q.save.get();
      return {code, d, ok, t: {ep: t.ep, world: t.world, flags: t.flags, done: t.done, roster: t.roster, charms: t.charms, v: t.v},
        loft: (() => { const c = B.questEncode(Object.assign({}, t, {world: {map: 'loft'}})); return B.questDecode(c).fields.world; })()};
    });
    expect(r.code.replace(/-/g, '')).toHaveLength(80);
    expect(r.ok).toBe(true);
    expect(r.t.v).toBe(6);
    expect(r.t.ep).toBe(2);
    expect(r.t.world).toEqual({map: 'lobby', x: 21, y: 5, dir: 'up'});
    expect(r.t.flags).toMatchObject({ep1Done: true, ep2Start: true, songEb: true, tuskAwake: true, ricoDone: true, ricoVent: true, 'met-moose': true, hootAwake: true});
    expect(r.t.done).toEqual({'pit:m1': 'befriend', 'workshop:m3': 'fade', 'balcony:m2': 'befriend', 'dressing:boss': 'fade', 'hall:w1': 'befriend'});
    expect(r.t.roster).toEqual(expect.arrayContaining(['wisp', 'hush', 'conductor', 'tapsy', 'rico']));
    expect(r.t.charms.owned).toMatchObject({'rosin-pouch': true, 'golden-mouthpiece': true});
    expect(r.t.charms.equipped).toEqual(['rosin-pouch', 'golden-mouthpiece']);
    expect(r.loft).toEqual({map: 'loft'});                                               // the Fly Loft's spot: read from its map once it exists
    // one changed letter is caught
    const bad = await page.evaluate(c => Arcade.Backup.questDecode(c.slice(0, 30) + (c[30] === 'A' ? 'B' : 'A') + c.slice(31)).ok, r.code);
    expect(bad).toBe(false);
    watch.check();
  });

  test('the Arcade Backup Code carries the v6 save', async ({page}) => {
    const watch = await boot(page);
    const code = await page.evaluate(async () => {
      const Q = Arcade.Quest, s = Q.save.get();
      s.flags.ep2Start = true; s.flags.songEb = true; s.ep = 2; s.world = {map: 'greenroom', x: 3, y: 3, dir: 'up'}; Q.save.write();
      return Arcade.Backup.fullEncode();
    });
    await page.evaluate(() => localStorage.clear());
    const back = await page.evaluate(async c => {
      const r = await Arcade.Backup.fullDecode(c); Arcade.store.importAll(r.data);
      const s = Arcade.store.gameData('arcade-quest').save;
      return {ok: r.ok, v: s.v, ep: s.ep, world: s.world, flags: s.flags};
    }, code);
    expect(back).toMatchObject({ok: true, v: 6, ep: 2, world: {map: 'greenroom'}, flags: {ep2Start: true, songEb: true, ep1Done: true}});
    watch.check();
  });

  test('the floor\'s line: Episode 1 until it\'s finished, then Episode 2 (by its own weights)', async ({page}) => {
    const watch = await boot(page, store(save(false)));
    const line = () => page.evaluate(() => Arcade.ALL_GAMES.find(g => g.id === 'arcade-quest').summary(Arcade.store));
    await page.evaluate(() => Arcade.Quest.save.write());
    expect(await line()).toMatch(/^Episode 1: \d+% · 3 friends$/);
    await page.evaluate(() => Arcade.Quest.save.setFlag('ep1Done'));
    expect(await line()).toBe('Episode 2: 0% · 3 friends');
    await page.evaluate(() => { const Q = Arcade.Quest; ['songEb', 'tuskAwake'].forEach(f => Q.save.setFlag(f)); });
    expect(await line()).toBe('Episode 2: 15% · 3 friends');
    await page.evaluate(() => { const Q = Arcade.Quest; ['salAwake', 'ricoDone', 'ep2Done'].forEach(f => Q.save.setFlag(f)); });
    expect(await line()).toBe('Episode 2: 50% · 3 friends');                         // (the machines' 50 % come with their rooms)
    // a line saved before Episode 2 existed ({pct, friends}, no ep) still reads "Episode 1"
    const old = await page.evaluate(() => Arcade.ALL_GAMES.find(g => g.id === 'arcade-quest').summary({gameData: () => ({save: {progress: {pct: 40, friends: 1}}})}));
    expect(old).toBe('Episode 1: 40% · 1 friend');
    watch.check();
  });
});

test('every Episode 2 line fits the text box (≤ 80 characters) and every new sprite uses theme tokens', async ({page}) => {
  const watch = await boot(page, store(save(false)));
  const r = await page.evaluate(() => {
    const long = [], walk = (v, at) => { if (typeof v === 'string') { if (v.length > 80) long.push(`${at}: ${v}`); } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, at + '.' + k)); };
    ['moose', 'tina', 'pete', 'hoot', 'speaker'].forEach(id => walk(window.QUEST_DIALOGUE[id].talk, id));
    walk(window.QUEST_CUTSCENES['ep2-intro'], 'ep2-intro'); walk(window.QUEST_EP2_ARRIVAL, 'arrival'); walk(window.QUEST_WHISPERS_EP2, 'whispers');
    Object.keys(window.QUEST_SIGNS).filter(k => /soon|roped|stage|box-office|snack|lobby|velvet|greenroom/.test(k)).forEach(k => walk(window.QUEST_SIGNS[k], k));
    const S = window.QUEST_ART.SPRITES, ids = Object.keys(S).filter(id => /^(tile-st-|stage-speaker|npc-(moose|hoot|tina|pete|tusk|sal|rico)|(tapsy|spotlight|feedback|confetti|metrognome|stubs|ropeknot|miclet|tap-shot|squeal-shot|stub-shot|rico|borrow-note|borrow-case)$)/.test(id));
    const missing = [];
    ids.forEach(id => Object.values(S[id].palette).forEach(t => { if (!getComputedStyle(document.documentElement).getPropertyValue('--' + t).trim()) missing.push(`${id}: ${t}`); }));
    return {long, missing, n: ids.length};
  });
  expect(r.long).toEqual([]);
  expect(r.missing).toEqual([]);
  expect(r.n).toBe(99);          // the tiles (+ the Main Stage's new ones, build step 5), the speaker, 7 NPCs + Hoot, Moose, Tubby, Sal and Rico (x2) awake, 8 machines + Rico, 5 dodge pieces
  watch.check();
});

test('GALLERY=1: every Episode 2 tile, NPC (glitched and awake), machine (every frame), the stage speaker, the Main Stage\'s pieces, THE BIG NUMBER and the new avatar items at 4× (docs/gallery/aq-ep2/sprites.png)', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await page.setViewportSize({width: 1400, height: 2700});
  const watch = await boot(page, store(save(false)));
  await page.evaluate(() => {
    const Q = Arcade.Quest, S = window.QUEST_ART.SPRITES, ids = Object.keys(S).filter(id => /^(tile-st-|stage-speaker|stage-(glitch|spot|mic|hole)$|moose-note|npc-(moose|hoot|tina|pete|tusk|sal|rico)|(tapsy|spotlight|feedback|confetti|metrognome|stubs|ropeknot|miclet|tap-shot|squeal-shot|stub-shot|rico|borrow-note|borrow-case|bignumber|tuba-bubble|flurry-shot|stick-shot)$)/.test(id));
    const sheet = document.createElement('div');
    sheet.id = 'aqGallery';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1d1830;color:#fbf8ff;font:12px monospace;padding:10px;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start;overflow:hidden';
    ids.forEach(id => {
      const d = Q.spriteDef(id), frames = d.frames || d.layers, n = frames.length, c = document.createElement('canvas'), s = d.w > 48 ? 3 : 4;   // (THE BIG NUMBER: layers, at 3×)
      const key = f => JSON.stringify(f), uniq = [...new Set(frames.map(key))].length;
      c.width = d.w * s * uniq + (uniq - 1) * 4; c.height = d.h * s;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const seen = [];
      for (let f = 0; f < n; f++) { const k = key(frames[f]); if (seen.includes(k)) continue; Q.draw(x, id, seen.length * (d.w * s + 4), 0, {frame: f, scale: s}); seen.push(k); }
      const box = document.createElement('figure'); box.style.cssText = 'margin:0;text-align:center';
      box.appendChild(c); const cap = document.createElement('figcaption'); cap.textContent = id; box.appendChild(cap); sheet.appendChild(box);
    });
    // build step 5's avatar items: the bust (big) and the full body from the front, the side and the back, each worn alone
    const A = Arcade, base = Object.assign(A.Avatar.get(), {bg: 'none', effect: 'none', pet: 'none', back: 'none', top: 'tee', hand: 'none', head: 'none', plate: 'none'});
    [['head', 'showtophat'], ['head', 'bulbband'], ['head', 'usher'], ['top', 'bowtie'], ['top', 'showsash'], ['effect', 'spotlight'], ['bg', 'showtimestage'], ['plate', 'encore'], ['plate', 'showstopper']].forEach(([f, id]) => {
      const av = Object.assign({}, base, {[f]: id}), box = document.createElement('figure'); box.style.cssText = 'margin:0;text-align:center;width:220px';
      box.innerHTML = `<div style="display:flex;gap:6px;align-items:flex-end;justify-content:center">${A.avatarHTML({size: 'tile', avatar: av, label: ''})}</div>`;
      if (f === 'plate') box.innerHTML += `<span class="av-plate av-plate-${id}" style="display:inline-block;margin-top:6px">${A.Avatar.nameOf(av)}</span>`;
      const sp = A.Avatar.sprites('trumpet', {avatar: av}), row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;justify-content:center;margin-top:4px';
      ['-front', '', '-back'].forEach(v => { const c = document.createElement('canvas'), fr = sp[v].frames[0]; c.width = fr.width * 3; c.height = fr.height * 3; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(fr, 0, 0, c.width, c.height); row.appendChild(c); });
      box.appendChild(row); const cap = document.createElement('figcaption'); cap.textContent = `${f}:${id}`; box.appendChild(cap); sheet.appendChild(box);
    });
    document.body.appendChild(sheet);
  });
  await page.locator('#aqGallery').screenshot({path: path.join(ROOT, 'docs/gallery/aq-ep2/sprites.png')});
  watch.check();
});
