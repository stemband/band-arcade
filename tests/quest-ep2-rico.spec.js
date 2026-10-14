/* ARCADE QUEST, EPISODE 2, build step 4 (docs/games/arcade-quest-ep2-plan.md): THE DRESSING ROOMS, THE VENT, THE FLY
   LOFT and RICO BANDIT, the mini-boss, by both routes. Befriended: the star door (ricoDoor); powered down: the vent
   (ricoVent) with RICO'S LUCKY PICK; either way ricoDone (the Fly Loft's stairs, Backstage's wings). The last 7 machines
   (20 in all), the Loft's Save Jukebox, its whispers, the ways to the stage, the NPCs' lines, the save code per route.
   The real overworld and battle scene run (Q.world.fight = walking into it); only the student's playing is stood in
   for (Q.challenge.run / Q.dodge.start). One room a test, per route (THE TIME BUDGET). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const PLAY = {befriend: {acc: .2, speed: .5, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};
const BEFORE = {pit: ['m1', 'm2', 'm3'], workshop: ['m1', 'm2', 'm3', 'm4'], backstage: ['m1', 'm2', 'm3', 'm4'], balcony: ['m1', 'm2']};
const ROOMS = {dressing: ['m1', 'm2', 'm3'], loft: ['m1', 'm2', 'm3', 'm4']};
const kindOf = (route, i) => (route === 'mixed' ? (i % 2 ? 'fade' : 'befriend') : route);

/** a save past step 3: the first four rooms done on this route, Tubby and Sal awake (LV 16: fewer turns a battle) */
function save(route = 'befriend', extra = {}) {
  const s = {v: 6, level: 16, xp: 0, hp: 80, maxHp: 80, tokens: 40, items: {'valve-oil': 2}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'foyer', x: 18, y: 3, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true,
      tuskAwake: true, 'met-tusk': true, salAwake: true, 'met-sal': true}, done: {}, ep: 2};
  [].concat(...Object.entries(BEFORE).map(([r, ks]) => ks.map(k => `${r}:${k}`))).forEach((k, i) => { s.done[k] = kindOf(route, i); });
  return Object.assign(s, extra, {flags: Object.assign(s.flags, extra.flags || {}), done: Object.assign(s.done, extra.done || {})});
}
async function boot(page, s = save(), url = 'arcade-quest/index.html?demo&warp=backstage') {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__runs = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async (type, o) => { window.__runs.push({type, harm: !!(o && o.harmonize), ser: !!(o && o.serenade)}); return o && o.harmonize ? {acc: 1, speed: 1, correct: 4, total: 4, success: true} : Object.assign({}, window.__play); };
    window.__hurt = false;
    Q.dodge.start = async ({onHit}) => {
      if (window.__hurt) { onHit(9999, false); return {damage: 9999, hits: 1, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0}; }
      return {damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0};
    };
  });
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd'), i = document.getElementById('intro');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0, intro: !!i && !i.hidden};
});
async function drive(page, done, pick = () => 'PLAY', max = 900) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.intro) await page.locator('#introGo').click();
    else if (s.cmd) await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)) || document.querySelector('#qCmd .q-btn'); b.click(); }, pick(s.b));
    else if (s.text || s.scene === 'battle') await page.keyboard.press('Enter');
    await page.waitForTimeout(35);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text && !s.intro;
async function go(page, map, x, y, dir = 'up') {
  await page.evaluate(([map, x, y, dir]) => Arcade.Quest.go('world', {map, x, y, dir}), [map, x, y, dir]);
  await drive(page, idleIn(map));
}
async function fight(page, map, key, how) {
  await page.evaluate(p => { window.__play = p; }, PLAY[how]);
  expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key), `${map}:${key}`).toBe(true);
  await drive(page, s => s.scene === 'battle');
  await drive(page, idleIn(map), b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY'));
  expect(await page.evaluate(k => Arcade.Quest.save.get().done[k], `${map}:${key}`)).toBe(how);
}
async function step(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.waitForTimeout(80);
  await page.keyboard.press({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'}[dir]);
  await page.waitForTimeout(700);
}
async function talkAt(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await page.evaluate(() => { window.__lines.length = 0; if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
}
const clear = page => page.evaluate(() => { window.__lines.length = 0; });
const lines = page => page.evaluate(() => window.__lines.slice());
const flags = page => page.evaluate(() => Arcade.Quest.save.get().flags);
const world = page => page.evaluate(() => Arcade.Quest.world.state());

/* THE LAST 7 MACHINES, by each route, one room a test */
for (const route of ['befriend', 'fade', 'mixed']) {
  test.describe(`the ${route} route`, () => {
    test('THE DRESSING ROOMS: Backstage\'s door, 3 machines (rhythm tier 3); Rico stays until his own battle', async ({page}) => {
      const watch = await boot(page, save(route));
      await step(page, 'backstage', 5, 2, 'up');
      await drive(page, idleIn('dressing'));
      for (const [i, k] of ROOMS.dressing.entries()) await fight(page, 'dressing', k, kindOf(route, 13 + i));
      expect((await world(page)).ghosts.map(g => g.key)).toEqual(['boss']);
      watch.check();
    });

    test('THE FLY LOFT: up Sal\'s ladder, 4 machines; the stairs down need ricoDone', async ({page}) => {
      const watch = await boot(page, save(route), 'arcade-quest/index.html?demo&warp=workshop');
      await step(page, 'workshop', 12, 2, 'up');
      await drive(page, idleIn('loft'));
      await clear(page);
      await step(page, 'loft', 20, 8, 'down');                                             // the stairs: no Rico yet
      await drive(page, idleIn('loft'));
      expect(await lines(page)).toContain('Stairs down to the stage. Notes are tangled in the rail. Not yet.');
      for (const [i, k] of ROOMS.loft.entries()) await fight(page, 'loft', k, kindOf(route, 16 + i));
      expect((await world(page)).ghosts).toEqual([]);
      watch.check();
    });
  });
}

test.describe('RICO BANDIT', () => {
  test('befriended: his speech once, the battle\'s phases and HARMONIZE (4 E♭ notes in order); the star door opens; he hands notes back', async ({page}) => {
    test.setTimeout(90000);
    const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=dressing');
    await page.evaluate(() => { window.__play = {acc: .2, speed: .5, correct: 4, total: 4, success: true}; Arcade.Quest.world.fight('boss'); });
    await drive(page, s => s.scene === 'battle');
    expect(await lines(page)).toContain('Borrowing! I\'m BORROWING them. Every note in this theater.');
    expect(await flags(page)).toMatchObject({'met-rico': true});
    // his phases, one each PLAY: echo, play (E♭ notes), rhythm (tier 3), echo… then SERENADE + HARMONIZE
    let plays = 0;
    await drive(page, idleIn('dressing'), b => (plays++ < 4 ? 'PLAY' : b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE'));
    const runs = await page.evaluate(() => window.__runs);
    expect(runs.filter(r => !r.harm && !r.ser).slice(0, 4).map(r => r.type)).toEqual(['echo', 'play', 'rhythm', 'echo']);
    expect(runs.some(r => r.harm)).toBe(true);
    const s = await page.evaluate(() => Arcade.Quest.save.get());
    expect(s.done['dressing:boss']).toBe('befriend');
    expect(s.flags).toMatchObject({ricoDone: true, ricoDoor: true});
    expect(s.flags.ricoVent).toBeFalsy();
    expect(s.roster).toContain('rico');
    expect(await lines(page)).toContain('The star on the stage door lights up. Somewhere beyond it, the stage waits.');
    expect((await world(page)).npcs).toContainEqual({id: 'rico', x: 12, y: 2});           // awake, by the star door
    await talkAt(page, 'dressing', 12, 3, 'up');
    await drive(page, idleIn('dressing'));
    expect((await lines(page)).join(' ')).toMatch(/Here, have a C|gave everybody|star door|Thanks for listening/);
    await clear(page);
    await step(page, 'dressing', 16, 2, 'up');                                            // the vent: still shut on this route
    await drive(page, idleIn('dressing'));
    expect(await lines(page)).toContain('A vent grate, low in the wall. It\'s screwed shut. Notes hum behind it.');
    watch.check();
  });

  test('HARMONIZE for real: the first 4 notes of the concert E♭ scale in order (trumpet: F G A B♭); the snare: 6 strokes', async ({page}) => {
    const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=dressing');
    expect(await page.evaluate(() => window.QUEST_ENEMIES.find(e => e.id === 'rico').harmonize)).toMatchObject({type: 'scale', notes: 'Eb', count: 4, taps: 6});
    await page.reload();                                                                    // (the real challenges: no stand-in)
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world');
    await page.evaluate(() => {
      const b = Arcade.buildSequence; Arcade.buildSequence = o => (window.__seq = b(o));
      window.__res = null;
      Arcade.Quest.challenge.run(null, {enemy: window.QUEST_ENEMIES.find(e => e.id === 'rico'), harmonize: true}).then(x => { window.__res = x; });
    });
    await expect(page.locator('#qStaff svg')).toBeVisible();
    expect(await page.evaluate(() => window.__seq.items.slice(0, 4).map(i => i.show.letter + i.show.oct))).toEqual(['F4', 'G4', 'A4', 'B4']);
    await expect(page.locator('.q-chal-t')).toContainText('first 4 notes of the E♭ scale');
    await page.keyboard.down(' ');
    await page.waitForFunction(() => window.__res, null, {timeout: 20000});
    await page.keyboard.up(' ');
    expect(await page.evaluate(() => window.__res.total)).toBe(4);
    watch.check();
  });

  test('powered down: the vent opens; Rico rests; the Lucky Pick is found once (more tokens); the Vent leads up into the Loft', async ({page}) => {
    test.setTimeout(90000);
    const watch = await boot(page, save('fade', {flags: {'met-rico': true}}), 'arcade-quest/index.html?demo&warp=dressing');
    await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 0, total: 4, success: false}; Arcade.Quest.world.fight('boss'); });
    await drive(page, s => s.scene === 'battle');
    await drive(page, idleIn('dressing'), () => 'PLAY');
    const s = await page.evaluate(() => Arcade.Quest.save.get());
    expect(s.done['dressing:boss']).toBe('fade');
    expect(s.flags).toMatchObject({ricoDone: true, ricoVent: true});
    expect(s.flags.ricoDoor).toBeFalsy();
    expect(await lines(page)).toContain('CLANG! Behind the mirrors, the vent grate pops open. Rico snores in his chair.');
    expect(await lines(page)).not.toContain('Something shifted somewhere in the manor…');     // (Episode 1's words stay in the manor)
    expect((await world(page)).npcs).toContainEqual({id: 'rico', x: 17, y: 2});           // resting in his chair
    await clear(page);
    await step(page, 'dressing', 13, 2, 'up');                                            // the star door stays locked on this route
    await drive(page, idleIn('dressing'));
    expect(await lines(page)).toContain('A door with a gold star. Locked. Someone wrote on it: "RICO\'S. KEEP OUT."');
    await step(page, 'dressing', 16, 2, 'up');                                            // into THE VENT
    await drive(page, idleIn('vent'));
    await talkAt(page, 'vent', 7, 2, 'down');
    await drive(page, idleIn('vent'));
    expect(await lines(page)).toContain('On the duct box, in the dust: a guitar pick with a tiny four-leaf clover!');
    expect(await page.evaluate(() => Arcade.Quest.charms.owned('ricos-pick'))).toBe(true);
    await talkAt(page, 'vent', 7, 2, 'down');
    await drive(page, idleIn('vent'));
    expect((await lines(page)).join(' ')).not.toMatch(/four-leaf/);                        // only once
    // it works: a battle's tokens × 1.5
    const t = await page.evaluate(() => { const Q = Arcade.Quest; Q.charms.equip(0, 'ricos-pick'); return Q.charms.mult('tokens'); });
    expect(t).toBe(1.5);
    await step(page, 'vent', 14, 2, 'up');                                                // the hatch up into the Fly Loft
    await drive(page, idleIn('loft'));
    expect((await world(page))).toMatchObject({x: 2, y: 9});
    watch.check();
  });

  test('a lost battle: back to the Fly Loft\'s jukebox (saved there), Rico still in the Dressing Rooms', async ({page}) => {
    const watch = await boot(page, save('befriend', {world: {map: 'loft', x: 3, y: 2, dir: 'up'}, flags: {'met-rico': true}}), 'arcade-quest/index.html?demo&warp=dressing');
    await page.evaluate(() => { window.__hurt = true; window.__play = {acc: 0, speed: 0, correct: 0, total: 3, success: false}; Arcade.Quest.world.fight('boss'); });
    await drive(page, s => s.scene === 'battle');
    await drive(page, idleIn('loft'), () => 'PLAY');
    expect(await world(page)).toMatchObject({map: 'loft', x: 3, y: 2});
    const f = await flags(page);
    expect(f.ricoDone).toBeFalsy();
    expect(await page.evaluate(() => Arcade.Quest.save.get().done['dressing:boss'])).toBeUndefined();
    await page.evaluate(() => { window.__hurt = false; });
    await go(page, 'dressing', 9, 9);
    expect((await world(page)).ghosts.map(g => g.key)).toContain('boss');
    watch.check();
  });

  for (const reduced of [false, true]) {
    test(`THE BORROW DODGE: notes arc out of his case and curve back toward you, then fade${reduced ? ' (reduced motion)' : ''}`, async ({page}) => {
      if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
      const watch = await boot(page);
      expect(await page.evaluate(() => window.QUEST_ENEMIES.find(e => e.id === 'rico').dodge.patterns.map(p => p.kind))).toEqual(['borrow', 'squeal']);
      // the real dodge (a fresh page: the test's stand-in replaced it), stepped quickly
      await page.reload();
      await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world');
      const d = await page.evaluate(() => {
        const Q = Arcade.Quest, rico = window.QUEST_ENEMIES.find(e => e.id === 'rico');
        Q.go('battle', {enemy: 'rico', back: 'arena'});
        let hits = 0; const kinds = new Set();
        Q.dodge.start({enemy: rico, easy: false, onHit: () => { hits++; }});
        for (let i = 0; i < 520 && Q.dodge.active(); i++) {
          Q.dodge.update(1 / 60);
          const st = Q.dodge.state(); if (st) st.kinds.forEach(k => kinds.add(k));
        }
        return {kinds: [...kinds], hits, active: Q.dodge.active(), reduced: Q.reduced()};
      });
      expect(d.kinds).toContain('borrow');
      expect(d.kinds).toContain('wave');                                                  // the sax's squeal (slower)
      expect(d.active).toBe(false);
      expect(d.reduced).toBe(reduced);
      watch.check();
    });
  }
});

test('THE FLY LOFT\'s jukebox saves, and CONTINUE comes back there; its whispers come more often, with lines of its own', async ({page}) => {
  const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=loft');
  await talkAt(page, 'loft', 3, 2, 'up');
  for (let i = 0; i < 30 && !(await page.locator('.q-codep').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  if (await page.locator('.q-codep .q-btn', {hasText: 'Done'}).count()) await page.locator('.q-codep .q-btn', {hasText: 'Done'}).click();
  await drive(page, idleIn('loft'));
  expect((await page.evaluate(() => Arcade.Quest.save.get())).world).toMatchObject({map: 'loft', x: 3, y: 2});
  await page.evaluate(() => Arcade.Quest.go('world', {continue: true}));
  await drive(page, idleIn('loft'));
  expect(await world(page)).toMatchObject({map: 'loft', x: 3, y: 2});
  const r = await page.evaluate(() => {
    const M = window.QUEST_MAPS, rates = Object.keys(M).filter(id => M[id].ep === 2 && !M[id].safe && !M[id].practice).map(id => [id, ((M[id].whispers || [])[1] || [55, 95])[1]]);
    return {loft: M.loft.whispers, rates, all: window.QUEST_WHISPERS_EP2.concat(M.loft.whisperLines)};
  });
  for (const [id, max] of r.rates) if (id !== 'loft') expect(r.loft[1][1], id).toBeLessThan(max);   // more often than anywhere else
  const seen = new Set();
  for (let i = 0; i < 12; i++) {                                                          // (whisperNow: the next one at once)
    await page.evaluate(() => Arcade.Quest.world.whisperNow());
    await expect(page.locator('#qWhisper.on')).toBeVisible();
    seen.add(await page.locator('#qWhisper').textContent());
  }
  expect([...seen].filter(t => !r.all.includes(t))).toEqual([]);                           // the episode's whispers + the Loft's own
  watch.check();
});

test('NO SOFT-LOCK: every mix of routes (Rico either way, every machine either way) opens at least one way to the stage', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, M = window.QUEST_MAPS, out = [];
    const ways = () => [].concat(...Object.keys(M).map(id => M[id].doors.filter(d => d.to === 'stage').map(d => ({from: id, need: d.need}))));
    for (let k = 0; k < 24; k++) {
      const s = Q.save.get();
      s.flags = {ep1Done: true, ep2Start: true}; s.done = {};
      Q.save.ghosts(2).forEach(g => { s.done[g.key] = Math.random() < .5 ? 'befriend' : 'fade'; });
      s.done['dressing:boss'] = k % 2 ? 'fade' : 'befriend';
      const f = Q.save.get().flags;                                                       // (the repair derives the flags from `done`)
      out.push({rico: s.done['dressing:boss'], open: ways().filter(w => !w.need || f[w.need]).map(w => w.from), ricoDone: !!f.ricoDone, door: !!f.ricoDoor, vent: !!f.ricoVent});
    }
    return {out, ways: ways()};
  });
  expect(r.ways.map(w => w.from).sort()).toEqual(['backstage', 'dressing', 'loft']);
  for (const o of r.out) {
    expect(o.open.length, JSON.stringify(o)).toBeGreaterThan(0);
    expect(o.ricoDone).toBe(true);
    expect(o.open).toEqual(expect.arrayContaining(['backstage', 'loft']));                 // the two that need only ricoDone
    if (o.rico === 'befriend') { expect(o.door).toBe(true); expect(o.vent).toBe(false); expect(o.open).toContain('dressing'); }
    else { expect(o.vent).toBe(true); expect(o.door).toBe(false); }
  }
  watch.check();
});

test('20 MACHINES in the episode, the plan\'s mix; the floor\'s line after all 20 + Rico; a save code per route restores the doors and the charm', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, M = window.QUEST_MAPS, list = Q.save.ghosts(2), mix = {};
    list.forEach(g => { const t = M[g.room].enemies.find(e => g.key === g.room + ':' + e.key).type; mix[t] = (mix[t] || 0) + 1; });
    const s = Q.save.get();
    s.flags = {ep1Done: true, ep2Start: true}; s.done = {};
    list.forEach(g => { s.done[g.key] = 'befriend'; }); s.done['dressing:boss'] = 'befriend'; Q.save.write();
    const pct = Q.save.progress(Q.save.get()).ep2;
    const codes = {};
    for (const route of ['befriend', 'fade']) {
      const t = Q.save.get(); t.flags = {ep1Done: true, ep2Start: true}; t.done = {'pit:m1': 'fade', 'dressing:boss': route}; t.charms.owned = route === 'fade' ? {'ricos-pick': true} : {};
      Q.save.write();
      const before = Q.save.get(), code = Q.save.code(); Q.save.reset();
      const ok = Q.save.fromCode(code).ok, after = Q.save.get();
      codes[route] = {ok, done: after.done['dressing:boss'], door: !!after.flags.ricoDoor, vent: !!after.flags.ricoVent, done2: !!after.flags.ricoDone, pick: !!after.charms.owned['ricos-pick']};
    }
    return {n: list.length, mix, pct, codes, log: Q.save.ghostLog(Q.save.get(), 2).total};
  });
  expect(r.n).toBe(20);
  expect(r.log).toBe(20);
  expect(r.mix).toEqual({tapsy: 3, spotlight: 3, feedback: 3, confetti: 2, metrognome: 3, stubs: 2, ropeknot: 2, miclet: 2});
  expect(r.pct).toBe(50 + 5 + 5 + 10);                                                    // all 20, Tubby, Sal, Rico (songEb and the finale to come)
  expect(r.codes.befriend).toEqual({ok: true, done: 'befriend', door: true, vent: false, done2: true, pick: false});
  expect(r.codes.fade).toEqual({ok: true, done: 'fade', door: false, vent: true, done2: true, pick: true});
  watch.check();
});

test('the NPCs react to Rico (befriended / powered down), every new line fits (≤ 80), and every new sign and NPC talks', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save('befriend', {flags: {ricoDone: true, ricoDoor: true, hootAwake: true, songEb: true, 'met-moose': true, 'met-tina': true, 'met-pete': true, 'met-hoot': true,
    'moose-tusk': true, 'moose-sal': true, 'tina-tusk': true, 'tina-sal': true, 'tina-eb': true, 'pete-tusk': true, 'pete-sal': true, 'pete-eb': true}}), 'arcade-quest/index.html?demo&warp=lobby');   // (the earlier milestones: already said)
  const r = await page.evaluate(() => {
    const M = window.QUEST_MAPS, D = window.QUEST_DIALOGUE, S = window.QUEST_SIGNS, out = {missing: [], long: []};
    const walk = (v, at) => { if (typeof v === 'string') { if (v.length > 80) out.long.push(`${at}: ${v}`); } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, at + '.' + k)); };
    ['dressing', 'vent', 'loft'].forEach(id => {
      const m = M[id];
      m.things.forEach(t => [t.say, t.found].filter(Boolean).forEach(k => (S[k] ? walk(S[k], k) : out.missing.push(k))));
      m.npcs.forEach(n => (D[n.id] ? walk(D[n.id], n.id) : out.missing.push(n.id)));
      m.doors.forEach(d => [d.locked, d.soon].filter(Boolean).forEach(k => (S[k] ? walk(S[k], k) : out.missing.push(k))));
      (m.whisperLines || []).forEach((l, i) => walk(l, id + '.whisper' + i));
    });
    ['moose', 'tina', 'pete', 'hoot', 'tusk', 'sal', 'rico'].forEach(id => walk(D[id], id));
    walk(S['wings-locked'], 'wings-locked');
    return out;
  });
  expect(r.missing).toEqual([]);
  expect(r.long).toEqual([]);
  // befriended: "Rico gave … back! Mostly." from each of them, once
  // (Maestro Moose has gone to the Main Stage by now: build step 5, tests/quest-ep2-finale.spec.js)
  for (const [map, x, y, want] of [['lobby', 3, 5, 'Rico gave my ticket stubs back! Mostly.'],
    ['lobby', 18, 5, 'Rico gave my POP back! Mostly.'], ['pit', 11, 4, 'Rico gave my low notes back! Mostly.'], ['workshop', 8, 4, 'Rico gave my rimshot back! Mostly.'],
    ['greenroom', 4, 6, 'Rico gave my notes back! Mostly.']]) {
    await go(page, map, x, y + 1 > 9 ? y : y);
    await talkAt(page, map, x, y, 'up');
    for (let i = 0; i < 20 && !(await lines(page)).some(l => l.startsWith(want)); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    expect((await lines(page)).some(l => l.startsWith(want)), `${map} ${x},${y}: ${(await lines(page)).join(' / ')}`).toBe(true);
    await page.evaluate(m => Arcade.Quest.go('world', {map: m}), map);               // (away from a counter's panel)
    await page.waitForTimeout(200);
  }
  watch.check();
});

test('powered down, the same NPCs say the other line; the wings and the Loft\'s stairs open with ricoDone either way', async ({page}) => {
  const watch = await boot(page, save('fade', {flags: {ricoDone: true, ricoVent: true, 'met-rico': true}}), 'arcade-quest/index.html?demo&warp=pit');
  await talkAt(page, 'pit', 11, 4, 'up');
  await drive(page, idleIn('pit'));
  expect(await lines(page)).toContain('Rico\'s resting. The notes found their own way home. Even the low ones.');
  await go(page, 'backstage', 14, 2);
  await clear(page);
  await step(page, 'backstage', 14, 2, 'up');                                             // the wings: ricoDone, onto the Main Stage (build step 5)
  await drive(page, idleIn('stage'));
  await go(page, 'loft', 20, 8);
  await clear(page);
  await step(page, 'loft', 20, 8, 'down');
  await drive(page, idleIn('stage'));
  watch.check();
});
