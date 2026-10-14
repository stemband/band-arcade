/* ARCADE QUEST, EPISODE 2, build step 3 (docs/games/arcade-quest-ep2-plan.md): THE ORCHESTRA PIT, THE PROP WORKSHOP,
   BACKSTAGE and THE BALCONY, their 13 machines, TUBBY TUSK and SNAPJAW SAL waking up (either way), the trap door, the
   balcony stairs and the ladder, Sal's rhythm tip and lesson (the Metronome Ticker), the Rosin Pouch, the balcony's
   Microphone glimpse, Professor Hoot waking at 6, the floor's line and the save code at each milestone, the rooms at
   phone / iPad / Chromebook sizes, every NPC and sign.
   The real overworld and battle scene run (Q.world.fight = walking into a machine); only the student's playing is
   stood in for (Q.challenge.run / Q.dodge.start), as in quest-routes.spec.js (Episode 1). */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const ROOMS = {pit: ['m1', 'm2', 'm3'], workshop: ['m1', 'm2', 'm3', 'm4'], backstage: ['m1', 'm2', 'm3', 'm4'], balcony: ['m1', 'm2']};
// befriend: a gentle, calm-raising PLAY (CALM fills before the HP runs out), then HARMONIZE; defeat: full-power PLAYs
const PLAY = {befriend: {acc: .2, speed: .5, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};

/** a save past Episode 1, inside the Showtime Stage (never saved at its jukebox yet; LV 16: fewer turns a battle) */
function save(extra = {}) {
  return Object.assign({v: 6, level: 16, xp: 0, hp: 80, maxHp: 80, tokens: 40, items: {'valve-oil': 2}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'foyer', x: 18, y: 3, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true}, done: {}, ep: 2}, extra);
}
async function boot(page, s = save(), url = 'arcade-quest/index.html?demo&warp=lobby') {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 4, total: 4, success: true} : Object.assign({}, window.__play));
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
/** step the game until done(snapshot): A (Enter) through text boxes, `pick` at the battle menu, GOT IT on a tip card */
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
/** help one machine: 'befriend' (SERENADE until CALM is full, then HARMONIZE) or 'fade' (full-power PLAYs) */
async function fight(page, map, key, how) {
  await page.evaluate(p => { window.__play = p; }, PLAY[how]);
  expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key), `${map}:${key}`).toBe(true);
  await drive(page, s => s.scene === 'battle');
  await drive(page, idleIn(map), b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY'));
  expect(await page.evaluate(k => Arcade.Quest.save.get().done[k], `${map}:${key}`)).toBe(how);
}
/** walk: stand at x, y facing dir, then step that way (into a door) */
async function step(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.waitForTimeout(80);
  await page.keyboard.press({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'}[dir]);
  await page.waitForTimeout(700);
}
/** A at the tile in front of x, y (facing dir) */
async function talkAt(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await page.evaluate(() => { window.__lines.length = 0; if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
}
const lines = page => page.evaluate(() => window.__lines.slice());
const flags = page => page.evaluate(() => Arcade.Quest.save.get().flags);
const ep2 = page => page.evaluate(() => Arcade.Quest.save.progress(Arcade.Quest.save.get()).ep2);
const machines = page => page.evaluate(() => Arcade.Quest.world.state().ghosts.map(g => g.key));

/* THE THREE ROUTES, through the real doors: every machine of the four rooms helped by BEFRIEND, by POWER DOWN and
   MIXED, one room a test (THE TIME BUDGET: under 60 s each on WebKit). Each room wakes its band member (Tubby: the trap
   door, the balcony stairs; Sal: the ladder), and the floor's line moves. A later room's test starts from a save where
   the rooms before it are done (the same route). */
const ORDER = ['pit', 'backstage', 'workshop', 'balcony'];
const kindOf = (route, i) => (route === 'mixed' ? (i % 2 ? 'fade' : 'befriend') : route);
/** a save with these rooms' machines already helped on this route (and, as the game would, their band awake) */
function after(route, rooms) {
  const s = save(), list = [].concat(...rooms.map(r => ROOMS[r].map(k => `${r}:${k}`)));
  list.forEach((k, i) => { s.done[k] = kindOf(route, i); });
  if (rooms.includes('pit')) Object.assign(s.flags, {tuskAwake: true, 'met-tusk': true});
  if (rooms.includes('workshop')) Object.assign(s.flags, {salAwake: true, 'met-sal': true});
  return s;
}
const pct = page => page.evaluate(() => { const s = Arcade.Quest.save.get(), n = Arcade.Quest.save.ghosts(2).length; return Math.round(Object.keys(s.done).filter(k => !/:boss$/.test(k)).length / n * 50 + (s.flags.tuskAwake ? 5 : 0) + (s.flags.salAwake ? 5 : 0) + (s.flags.songEb ? 10 : 0)); });
async function helpAll(page, route, map) {
  const before = ORDER.slice(0, ORDER.indexOf(map)).reduce((n, r) => n + ROOMS[r].length, 0);
  for (const [i, k] of ROOMS[map].entries()) await fight(page, map, k, kindOf(route, before + i));
}
for (const route of ['befriend', 'fade', 'mixed']) {
  test.describe(`the ${route} route`, () => {
    test('THE ORCHESTRA PIT: Tubby on the trap door; 3 machines; he wakes, moves aside, the trap door opens to Backstage', async ({page}) => {
      const watch = await boot(page);
      expect(await ep2(page)).toBe(0);
      await step(page, 'lobby', 11, 2, 'up');                                            // the auditorium doors
      await drive(page, idleIn('pit'));
      await talkAt(page, 'pit', 10, 4, 'up');                                            // the glitched Tubby: BWAAAA
      await drive(page, idleIn('pit'));
      expect((await lines(page)).join(' ')).toMatch(/BWAAAA/);
      await page.evaluate(() => { window.__lines.length = 0; });
      await step(page, 'pit', 9, 3, 'right');                                            // the trap door: he's sitting on it
      await drive(page, idleIn('pit'));
      expect(await lines(page)).toContain('A trap door. Tubby Tusk is sitting right on top of it. BWAAAAA.');
      await page.evaluate(() => { window.__lines.length = 0; });
      await helpAll(page, route, 'pit');
      const f = await flags(page);
      expect(f.tuskAwake).toBe(true);
      expect(f['met-tusk']).toBe(true);
      expect(await lines(page)).toContain('BWAAAAAAA—aa? Oh! Hello! Was I stuck? I was stuck.');
      expect((await page.evaluate(() => Arcade.Quest.world.state())).npcs).toEqual([{id: 'tusk', x: 11, y: 3}]);   // he shuffled aside
      expect(await ep2(page)).toBe(await pct(page));
      await step(page, 'pit', 10, 4, 'up');                                              // down the trap door
      await drive(page, idleIn('backstage'));
      watch.check();
    });

    test('BACKSTAGE: down the trap door, 4 machines, the ladder back up', async ({page}) => {
      const watch = await boot(page, after(route, ['pit']), 'arcade-quest/index.html?demo&warp=pit');
      await step(page, 'pit', 10, 4, 'up');
      await drive(page, idleIn('backstage'));
      await helpAll(page, route, 'backstage');
      expect(await machines(page)).toEqual([]);
      expect(await ep2(page)).toBe(await pct(page));
      await step(page, 'backstage', 17, 2, 'up');                                        // the ladder up to the Pit
      await drive(page, idleIn('pit'));
      watch.check();
    });

    test('THE PROP WORKSHOP: the ladder rattles; 4 machines; Sal wakes and clears it (the loft: not today)', async ({page}) => {
      const watch = await boot(page, after(route, ['pit', 'backstage']));
      await step(page, 'lobby', 19, 2, 'up');                                            // the side door
      await drive(page, idleIn('workshop'));
      await page.evaluate(() => { window.__lines.length = 0; });
      await step(page, 'workshop', 12, 2, 'up');
      await drive(page, idleIn('workshop'));
      expect(await lines(page)).toContain('A ladder up to the fly loft. A drum roll rattles every rung. Not yet!');
      await helpAll(page, route, 'workshop');
      const f = await flags(page);
      expect(f.salAwake).toBe(true);
      expect(f['met-sal']).toBe(true);
      expect(await lines(page)).toContain('—rrrrrrrrrrIMSHOT! Phew. Thanks, kid. My wrists were getting tired.');
      await page.evaluate(() => { window.__lines.length = 0; });
      expect(await ep2(page)).toBe(await pct(page));
      await step(page, 'workshop', 12, 2, 'up');                                          // the ladder: up into the Fly Loft
      await drive(page, idleIn('loft'));
      watch.check();
    });

    test('THE BALCONY: up the stairs Tubby opened, its 2 machines; these 13 helped, the floor\'s line, and none come back', async ({page}) => {
      const watch = await boot(page, after(route, ['pit', 'backstage', 'workshop']));
      await step(page, 'lobby', 21, 2, 'up');
      await drive(page, idleIn('balcony'));
      await helpAll(page, route, 'balcony');
      const s = await page.evaluate(() => Arcade.Quest.save.get());
      expect(Object.keys(s.done).filter(k => /^(pit|workshop|backstage|balcony):/.test(k)).length).toBe(13);
      if (route !== 'mixed') expect(Object.values(s.done).every(k => k === route)).toBe(true);
      else expect(new Set(Object.values(s.done)).size).toBe(2);
      expect(await ep2(page)).toBe(Math.round(13 / 20 * 50 + 10));                          // 13 of the 20 machines, Tubby 5, Sal 5
      for (const [map, x, y] of [['pit', 8, 9], ['workshop', 8, 9], ['backstage', 12, 2], ['balcony', 7, 8]]) { await go(page, map, x, y); expect(await machines(page), map).toEqual([]); }
      watch.check();
    });
  });
}

test('a lost battle: back to the jukebox (the Lobby, never saved: the hub), the machine still there', async ({page}) => {
  const watch = await boot(page);
  await go(page, 'pit', 8, 9);
  await page.evaluate(() => { window.__hurt = true; window.__play = {acc: 0, speed: 0, correct: 0, total: 3, success: false}; });
  expect(await page.evaluate(() => Arcade.Quest.world.fight('m1'))).toBe(true);
  await drive(page, s => s.scene === 'battle');
  await drive(page, idleIn('lobby'), () => 'PLAY');
  expect(await page.evaluate(() => Arcade.Quest.save.get().done['pit:m1'])).toBeUndefined();
  await page.evaluate(() => { window.__hurt = false; });
  await go(page, 'pit', 8, 9);
  expect(await machines(page)).toEqual(['m1', 'm2', 'm3']);
  watch.check();
});

test('NO SOFT-LOCKS: a search over the gates reaches every room and machine, whatever the routes; codes repair the wakes', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, M = window.QUEST_MAPS, E = id => window.QUEST_ENEMIES.find(e => e.id === id), rooms = Object.keys(M).filter(id => M[id].ep === 2);
    // the gates: a door is passable once its `need` flag is set; a room's `wakes` flag is set once ALL its machines
    // are helped (either way: the rule never asks how); a boss's flags (Rico) follow the route taken with it;
    // Hoot (helped2>=6) and songEb gate no door
    const needs = [].concat(...rooms.map(id => M[id].doors.filter(d => d.need).map(d => d.need)));
    const wakes = rooms.map(id => M[id].wakes && M[id].wakes.flag).filter(Boolean);
    const bossFlags = rooms.map(id => M[id].enemies.map(e => E(e.type)).filter(d => d && d.boss).map(d => [d.opens, d.opensIfFaded, d.doneFlag])).flat(2).filter(Boolean);
    const search = route => {
      const reach = new Set(['lobby']), fl = new Set();
      for (let changed = true; changed;) {
        changed = false;
        [...reach].forEach(id => {
          M[id].doors.forEach(d => { if (M[d.to] && (!d.need || fl.has(d.need)) && !reach.has(d.to)) { reach.add(d.to); changed = true; } });
          const add = f => { if (f && !fl.has(f)) { fl.add(f); changed = true; } };
          if (M[id].wakes) add(M[id].wakes.flag);                                           // every machine here can be helped
          M[id].enemies.map(e => E(e.type)).filter(d => d && d.boss).forEach(d => { add(route === 'befriend' ? d.opens : d.opensIfFaded); add(d.doneFlag); });
        });
      }
      return [...reach].sort();
    };
    // the save repair (save codes carry `done`): every machine done, any mix of routes = everyone awake
    const out = [];
    for (let k = 0; k < 12; k++) {
      const s = Q.save.get();
      s.flags = {ep1Done: true, ep2Start: true}; s.done = {};
      rooms.forEach(id => (M[id].practice ? [] : M[id].enemies).forEach(e => { s.done[id + ':' + e.key] = Math.random() < .5 ? 'befriend' : 'fade'; }));
      const f = Q.save.get().flags;
      out.push(wakes.every(w => f[w]));
    }
    const machineRooms = rooms.filter(id => !M[id].practice && M[id].enemies.length);
    return {rooms: rooms.sort(), machineRooms, befriend: search('befriend'), fade: search('fade'), needs, wakes, bossFlags, repair: out,
      hootFirst: (M.pit.enemies.length + M.workshop.enemies.length) >= 6};
  });
  // every room with machines, on either route; only the defeat route's own passage (the Vent) needs that route
  for (const route of ['befriend', 'fade']) expect(r.machineRooms.filter(id => !r[route].includes(id)), route).toEqual([]);
  expect(r.fade).toEqual(r.rooms);
  expect(r.rooms.filter(id => !r.befriend.includes(id))).toEqual(['vent']);
  expect(r.needs.every(n => r.wakes.includes(n) || r.bossFlags.includes(n))).toBe(true);    // every gate: a band member waking, or Rico
  expect(r.repair.every(Boolean)).toBe(true);
  expect(r.hootFirst).toBe(true);                                                         // 6 helped before any gate: Hoot first
  watch.check();
});

test('PROFESSOR HOOT wakes at 6 machines helped across these rooms and teaches the E♭ Encore', async ({page}) => {
  const watch = await boot(page);
  await page.evaluate(() => {
    const s = Arcade.Quest.save.get();
    Object.assign(s.done, {'pit:m1': 'befriend', 'pit:m2': 'fade', 'pit:m3': 'befriend', 'workshop:m1': 'fade', 'workshop:m2': 'befriend'});
    Arcade.Quest.save.write();
    Arcade.Quest.challenge.encore = async () => ({acc: 1, speed: 1, correct: 8, total: 8, success: true});
  });
  await go(page, 'greenroom', 4, 7);
  await talkAt(page, 'greenroom', 4, 6, 'up');
  await drive(page, idleIn('greenroom'));
  expect((await lines(page)).join(' ')).toMatch(/Measure 12/);                            // 5 helped: still stuck
  expect((await flags(page)).hootAwake).toBeFalsy();
  // the 6th: the Workshop's Rope Knot, powered down
  await go(page, 'workshop', 8, 9);
  await fight(page, 'workshop', 'm3', 'fade');
  await go(page, 'greenroom', 4, 7);
  await talkAt(page, 'greenroom', 4, 6, 'up');
  await drive(page, idleIn('greenroom'));
  const f = await flags(page);
  expect(f.hootAwake).toBe(true);
  expect(f.songEb).toBe(true);
  expect(await lines(page)).toContain('MEASURE THIRTEEN! I\'m free! The static let go of my page!');
  watch.check();
});

test('SNAPJAW SAL: her rhythm tip before the first rhythm battle, once; her lesson: a miss, then the Metronome Ticker, once', async ({page}) => {
  test.setTimeout(90000);
  const s0 = save(); delete s0.flags.rhythmTip;
  const watch = await boot(page, s0);
  await page.evaluate(() => {
    window.__tips = 0;
    const show = Arcade.UI.intro.show;
    Arcade.UI.intro.show = o => {
      const p = show(o);
      if (/Sal/.test(o.kicker || '')) { window.__tips++; window.__tip = {text: o.text, hero: p.querySelector('.ui-intro-hero').childElementCount}; }
      return p;
    };
  });
  await go(page, 'workshop', 8, 9);
  // the first rhythm battle (a Tapsy): the card first, in Sal's voice (she is still glitched)
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true}; Arcade.Quest.world.fight('m1'); });
  await drive(page, idleIn('workshop'), () => 'PLAY');                                    // (GOT IT on the card)
  const tip = await page.evaluate(() => window.__tip);
  expect(tip.text).toContain('Read the rhythm. Count it. Play it on ANY note: it\'s all about WHEN.');
  expect(tip.hero).toBe(1);                                                                // Sal's portrait
  // the second one: no card
  await page.evaluate(() => Arcade.Quest.world.fight('m2'));
  await drive(page, s => s.scene === 'battle');
  await drive(page, idleIn('workshop'), () => 'PLAY');
  expect(await page.evaluate(() => window.__tips)).toBe(1);
  // her lesson, once she's awake
  await page.evaluate(() => {
    Arcade.Quest.save.setFlag('salAwake');
    window.__rhythm = [];
    Arcade.Quest.challenge.run = async (type, o) => { window.__rhythm.push({type, tier: o && o.enemy && o.enemy.tier}); return Object.assign({}, window.__lesson); };
    window.__lesson = {acc: .5, speed: .3, correct: 2, total: 4, success: false};
  });
  await talkAt(page, 'workshop', 8, 4, 'up');
  await drive(page, idleIn('workshop'));
  expect(await lines(page)).toContain('Again! Count out loud this time.');
  expect(await page.evaluate(() => Arcade.Quest.charms.owned('metronome-ticker'))).toBe(false);
  await page.evaluate(() => { window.__lesson = {acc: .9, speed: .9, correct: 4, total: 4, success: true}; });
  await talkAt(page, 'workshop', 8, 4, 'up');
  await drive(page, idleIn('workshop'));
  expect(await lines(page)).toContain('BA-DUM-TSS! Right in the pocket! Here, take this. It ticks with you.');
  expect(await page.evaluate(() => Arcade.Quest.charms.owned('metronome-ticker'))).toBe(true);
  expect(await page.evaluate(() => window.__rhythm)).toEqual([{type: 'rhythm', tier: 2}, {type: 'rhythm', tier: 2}]);
  // after it: her practice lines, no more lessons
  await talkAt(page, 'workshop', 8, 4, 'up');
  await drive(page, idleIn('workshop'));
  expect(await page.evaluate(() => window.__rhythm.length)).toBe(2);
  // it works: the rhythm windows, 15 % wider (with ASSIST already on)
  const w = await page.evaluate(() => { const Q = Arcade.Quest, a = Q.rhythm.windows().goodMs; Q.charms.equip(0, 'metronome-ticker'); return [a, Q.rhythm.windows().goodMs]; });
  expect(w[1] / w[0]).toBeCloseTo(1.15, 2);
  watch.check();
});

test('THE ROSIN POUCH: found once in the Pit\'s corner timpani; long tones calm 30 % faster with it on', async ({page}) => {
  const watch = await boot(page);
  await go(page, 'pit', 8, 9);
  await talkAt(page, 'pit', 16, 3, 'up');
  await drive(page, idleIn('pit'));
  expect(await lines(page)).toContain('Something glints behind the timpani, in the corner: a little pouch!');
  expect(await page.evaluate(() => Arcade.Quest.charms.owned('rosin-pouch'))).toBe(true);
  await talkAt(page, 'pit', 16, 3, 'up');
  await drive(page, idleIn('pit'));
  expect((await lines(page)).join(' ')).not.toMatch(/pouch/);                                // only once
  // SERENADE a Spotlight Sprite (its happy note is a LONG TONE) with and without it
  const calm = async on => {
    await page.evaluate(on => {
      const Q = Arcade.Quest; Q.charms.equip(0, on ? 'rosin-pouch' : null);
      Q.challenge.run = async () => ({acc: .15, speed: .5, correct: 1, total: 1, success: false, kind: 'longtone'});   // (well under the CALM cap)
      Q.go('battle', {enemy: 'spotlight', back: 'arena'});
    }, on);
    await drive(page, s => s.cmd);
    await page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith('SERENADE')).click());
    await drive(page, s => s.b && s.b.calm > 0);
    const c = await page.evaluate(() => Arcade.Quest.battleState().calm);
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'pit'}));
    await drive(page, idleIn('pit'));
    return c;
  };
  const off = await calm(false), on = await calm(true);
  expect(on / off).toBeCloseTo(1.3, 1);
  watch.check();
});

test('THE BALCONY: the giant Microphone shows through the curtain gap the first time only (+ a crackle)', async ({page}) => {
  const watch = await boot(page, save({flags: Object.assign(save().flags, {tuskAwake: true})}));
  await page.evaluate(() => { window.__sfx = []; const f = Arcade.Quest.sfx; Arcade.Quest.sfx = n => { window.__sfx.push(n); return f(n); }; });
  await step(page, 'lobby', 21, 2, 'up');
  await page.waitForFunction(() => Arcade.Quest.world.state().map === 'balcony' && Arcade.Quest.world.state().whisper === 'glimpse', null, {timeout: 4000});
  expect(await page.evaluate(() => window.__sfx)).toContain('quest-mic-crackle');
  expect((await flags(page)).balconyGlimpse).toBe(true);
  await go(page, 'lobby', 11, 9);
  await step(page, 'lobby', 21, 2, 'up');
  await drive(page, idleIn('balcony'));
  await page.waitForTimeout(1500);
  expect((await page.evaluate(() => Arcade.Quest.world.state())).whisper).toBeNull();
  watch.check();
});

test('SAVES: a save code mid-way (some machines, Tubby awake, Sal not, the Rosin Pouch) restores exactly; the floor\'s line at each milestone', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, s = Q.save.get(), P = () => Q.save.progress(Q.save.get()).ep2, line = [];
    line.push(P());                                                                         // nothing yet: 0
    Object.assign(s.done, {'pit:m1': 'befriend', 'pit:m2': 'fade', 'pit:m3': 'befriend'}); Q.save.write();
    line.push(P());                                                                         // the Pit (repaired: Tubby awake)
    Object.assign(s.done, {'workshop:m1': 'fade', 'workshop:m2': 'befriend', 'backstage:m2': 'fade'}); Q.save.write();
    line.push(P());
    Q.charms.give('rosin-pouch'); Q.charms.equip(0, 'rosin-pouch');
    const before = JSON.parse(JSON.stringify(Q.save.get()));
    const code = Q.save.code();
    Q.save.reset();
    const ok = Q.save.fromCode(code).ok, t = Q.save.get();
    return {line, ok, before: {done: before.done, flags: before.flags, charms: before.charms}, after: {done: t.done, flags: t.flags, charms: t.charms}, ep2: P()};
  });
  expect(r.line).toEqual([0, Math.round(3 / 20 * 50 + 5), Math.round(6 / 20 * 50 + 5)]);
  expect(r.ok).toBe(true);
  expect(r.after.done).toEqual(r.before.done);
  for (const f of ['tuskAwake', 'met-tusk', 'ep2Start', 'ep1Done']) expect(!!r.after.flags[f], f).toBe(!!r.before.flags[f]);
  expect(r.after.flags.salAwake).toBeFalsy();
  expect(r.after.charms).toEqual(r.before.charms);
  expect(r.ep2).toBe(r.line[2]);
  watch.check();
});

test('every NPC and sign of the four rooms talks, and every line fits the text box (≤ 80 characters)', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save({flags: Object.assign(save().flags, {tuskAwake: true})}));
  const r = await page.evaluate(() => {
    const M = window.QUEST_MAPS, D = window.QUEST_DIALOGUE, S = window.QUEST_SIGNS, T = window.QUEST_TEXT, out = {missing: [], long: []};
    const walk = (v, at) => { if (typeof v === 'string') { if (v.length > 80) out.long.push(`${at}: ${v}`); } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, at + '.' + k)); };
    ['pit', 'workshop', 'backstage', 'balcony'].forEach(id => {
      const m = M[id];
      m.things.forEach(t => { [t.say, t.found].filter(Boolean).forEach(k => { if (!S[k]) out.missing.push(k); else walk(S[k], k); }); });
      m.npcs.forEach(n => { if (!D[n.id]) out.missing.push(n.id); else walk(D[n.id], n.id); });
      m.doors.forEach(d => [d.locked, d.soon].filter(Boolean).forEach(k => { if (!S[k]) out.missing.push(k); else walk(S[k], k); }));
    });
    ['moose', 'tina', 'pete'].forEach(id => walk(D[id], id));
    Object.keys(T).filter(k => /^rhythmTip/.test(k)).forEach(k => walk(T[k], k));
    out.sprites = [].concat(...['pit', 'workshop', 'backstage', 'balcony'].map(id => Object.values(M[id].legend || {}).map(t => t.sprite)))
      .concat(['npc-tusk', 'npc-tusk-ok', 'npc-sal', 'npc-sal-ok']).filter(id => !window.QUEST_ART.SPRITES[id]);
    return out;
  });
  expect(r.missing).toEqual([]);
  expect(r.long).toEqual([]);
  expect(r.sprites).toEqual([]);
  // the real thing: a few in each room, through A
  for (const [map, x, y, dir, want] of [['pit', 11, 4, 'up', 'Long tones are like naps'], ['pit', 5, 2, 'up', 'Mind the tuba.'],
    ['workshop', 4, 6, 'up', 'cardboard moon'], ['workshop', 8, 4, 'up', 'brrrrrrrr'], ['backstage', 7, 6, 'up', 'ENCORE (mic check!)'],
    ['backstage', 9, 2, 'up', 'QUIET PLEASE PLEASE PLEASE'], ['balcony', 4, 4, 'up', 'brass railing']]) {
    await go(page, map, x, y + 1);
    await talkAt(page, map, x, y, dir);
    await drive(page, idleIn(map));
    expect((await lines(page)).join(' '), `${map} ${x},${y}`).toContain(want);
  }
  watch.check();
});

for (const [name, size, touch] of [['phone', {width: 390, height: 844}, true], ['iPad', {width: 1180, height: 820}, true], ['Chromebook', {width: 1366, height: 768}, false]]) {
  test(`the four rooms at ${name} size: walkable, the canvas inside the screen, nothing too wide`, async ({browser}) => {
    const ctx = await browser.newContext({viewport: size, hasTouch: touch, isMobile: touch && size.width < 500});
    const page = await ctx.newPage();
    const watch = await boot(page, save({flags: Object.assign(save().flags, {tuskAwake: true, salAwake: true})}));
    for (const [map, x, y] of [['pit', 8, 9], ['workshop', 8, 9], ['backstage', 12, 2], ['balcony', 7, 8]]) {
      await go(page, map, x, y);
      await page.keyboard.press(map === 'backstage' ? 'ArrowDown' : 'ArrowUp');
      await page.waitForTimeout(400);
      const w = await page.evaluate(() => Arcade.Quest.world.state());
      expect([w.map, w.y], map).toEqual([map, map === 'backstage' ? y + 1 : y - 1]);         // one step
      const box = await page.locator('#screen').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
      expect(await tooWide(page), map).toEqual([]);
    }
    watch.check();
    await ctx.close();
  });
}
