/* ARCADE QUEST, EPISODE 2, build step 6 (docs/games/arcade-quest-ep2-plan.md): THE FULL ROUTES, END TO END (?demo).
   The whole episode in SIX SEGMENTS, each one test, chained by SAVE CODES the way a student carries on another day:
     1. Episode 1 finished → the attic's sheet → the intro → the Lobby
     2. the Orchestra Pit + the Prop Workshop + the Balcony (Tubby and Sal wake)
     3. Backstage + Professor Hoot's lesson (the E♭ Encore) + Snapjaw Sal's (the Metronome Ticker)
     4. the Dressing Rooms + Rico Bandit
     5. the Fly Loft (+ the Vent and the Lucky Pick on the power-down route)
     6. the Main Stage → THE BIG NUMBER → the ending → the Microphone → the cliffhanger → the credits → EPISODE 2 COMPLETE
   on THREE ROUTES: BEFRIEND (everything befriended: the best ending, stage-friends + stage-all), POWER DOWN (everything
   powered down: the Vent, the Lucky Pick, the shorter ending, stage-all, never stage-friends) and MIXED (QUEST_V6's
   even machines befriended, odd ones powered down; Rico befriended; the Big Number powered down).
   Each segment ends at a real Save Jukebox (or EPISODE 2 COMPLETE's code), and checks that the code restores the save
   exactly (flags, done, routes, charms, items, roster, level), the floor's % and the Showtime Log's count. The next
   segment starts from that code: tests/fixtures/quest-ep2-routes/<route>-<segment>.txt, the code the segment before it
   made (checked: each segment's own code must carry the same story as its file). Re-record them after a change to the
   episode's story: QUEST_ROUTES_RECORD=1 npx playwright test quest-ep2-routes --project=chromium --workers=1.
   The real overworld, doors, talk, battles and cutscenes run; only the student's playing is stood in for
   (Q.challenge.run / encore / Q.dodge.start). Also here: a RANDOMIZED NO-SOFT-LOCK check (fixed seeds) and Episode 1
   untouched (a save halfway through it loads and saves exactly as before; its own route tests: quest-routes.spec.js). */
const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const PLAY = {befriend: {acc: .2, speed: .5, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};
const FULL = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
const DIR = path.join(__dirname, 'fixtures', 'quest-ep2-routes');
const RECORD = !!process.env.QUEST_ROUTES_RECORD;
const ROUTES = ['befriend', 'fade', 'mixed'];
// after each segment: the floor's Episode 2 % (save.js progress(): 20 machines = 50, the Encore 10, Tubby 5, Sal 5,
// Rico 10, the Big Number 20) and the Showtime Log's count
const AFTER = [null, {pct: 0, log: 0}, {pct: 33, log: 9}, {pct: 53, log: 13}, {pct: 70, log: 16}, {pct: 80, log: 20}, {pct: 100, log: 20}];

async function boot(page) {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS, keysTip: true}}})});
  await page.goto('arcade-quest/index.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'title');
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__gos = []; window.__res = null;
    const go = Q.go; Q.go = (name, args) => { window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name); return go(name, args); };
    const show = Arcade.UI.results.show; Arcade.UI.results.show = o => { window.__res = o; return show(o); };
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play));
    Q.challenge.encore = async () => ({acc: 1, speed: 1, correct: 8, total: 8, success: true});
    Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
  });
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd'), i = document.getElementById('intro');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(), cut: Q.cutscene && Q.cutscene(),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0, intro: !!i && !i.hidden,
    ask: !!document.querySelector('.q-ask'), panel: !!document.querySelector('.q-wpanel'), card: !!document.querySelector('.sk-catchup')};
});
/** step the game until done(snapshot): A (Enter) through text boxes and cutscenes, `pick` at the battle menu */
async function drive(page, done, pick = () => 'PLAY', max = 1500) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.intro) await page.locator('#introGo').click();
    else if (s.card) {                                             // an UNLOCKED! card over the room (SHOWSTOPPER): noted, closed
      await page.evaluate(() => { window.__cards = (window.__cards || []).concat(document.querySelector('.sk-catchup .sk-u-lead').textContent); });
      await page.locator('.sk-catchup [data-close]').click();
    } else if (s.cmd) await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l) && !x.disabled) || document.querySelector('#qCmd .q-btn'); b.click(); }, pick(s.b));
    else if (s.scene === 'credits') await page.locator('.q-skip').click();
    else if (s.text || ['battle', 'cutscene'].includes(s.scene)) await page.keyboard.press('Enter');
    await page.waitForTimeout(30);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text && !s.intro && !s.panel && !s.card;
const blur = page => page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
/** walk: stand at x, y facing dir, then step that way (through a door) */
async function step(page, map, x, y, dir, to) {
  await drive(page, idleIn(map));
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.waitForTimeout(80);
  await page.keyboard.press({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'}[dir]);
  await page.waitForTimeout(600);
  if (to) await drive(page, idleIn(to));
}
/** walk a list of doors: [map, x, y, dir, the room it leads to] */
async function walk(page, doors) { for (const d of doors) await step(page, ...d); }
/** A at the tile in front of x, y (facing dir) */
async function talkAt(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await blur(page);
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
}
const V6 = page => page.evaluate(() => Arcade.Backup.QUEST_V6.machines);
/** how a machine is helped on this route (MIXED: QUEST_V6's even places befriended, odd powered down) */
const kindOf = (route, key, list) => (route === 'mixed' ? (list.indexOf(key) % 2 ? 'fade' : 'befriend') : route);
const pickFor = how => b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY');
/** help one machine (Q.world.fight = walking into it), the route's way */
async function fight(page, map, key, how) {
  await page.evaluate(p => { window.__play = p; }, PLAY[how]);
  expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key), `${map}:${key}`).toBe(true);
  await drive(page, s => s.scene === 'battle');
  await drive(page, idleIn(map), pickFor(how));
  expect(await page.evaluate(k => Arcade.Quest.save.get().done[k], `${map}:${key}`)).toBe(how);
}
/** every machine in the room you stand in */
async function helpRoom(page, route, map) {
  const list = await V6(page), keys = (await snap(page)).w.ghosts.filter(g => g.key !== 'boss').map(g => g.key);
  expect(keys.length, map).toBeGreaterThan(0);
  for (const k of keys) await fight(page, map, k, kindOf(route, `${map}:${k}`, list));
  expect((await snap(page)).w.ghosts.filter(g => g.key !== 'boss'), map).toEqual([]);
}
/** SAVE HERE at a Save Jukebox: the code its panel shows */
async function jukebox(page, map, x, y) {
  await talkAt(page, map, x, y, 'up');
  for (let i = 0; i < 20 && !(await page.locator('.q-juke').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }   // (its sign first)
  await page.locator('.q-juke .q-btn', {hasText: 'Save here'}).click();
  for (let i = 0; i < 40 && !(await page.locator('.q-codep').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  const code = await page.locator('.q-codep .q-code').textContent();
  await page.locator('.q-codep .q-btn', {hasText: 'Done'}).click();
  await drive(page, idleIn(map));
  return code.trim();
}

/** start a segment: ENTER SAVE CODE's own function (Q.save.fromCode), then CONTINUE (its jukebox) */
async function load(page, code) {
  const ok = await page.evaluate(c => Arcade.Quest.save.fromCode(c).ok, code);
  expect(ok).toBe(true);
  await page.evaluate(() => Arcade.Quest.go('world', {continue: true}));
  await drive(page, s => s.scene === 'world' && s.w && !s.w.busy && !s.text && !s.panel);
}
const startCode = (route, n) => fs.readFileSync(path.join(DIR, `${route}-${n}.txt`), 'utf8').trim();

/** the end of a segment: the code restores the save exactly; the floor's % and the Showtime Log; the code carries the
    same story as the recorded one the next segment starts from */
async function finish(page, route, n, code) {
  const r = await page.evaluate(code => {
    const Q = Arcade.Quest, B = Arcade.Backup, coded = B.QUEST_V1.flags.concat(B.QUEST_V6.flags);
    const pick = s => ({level: s.level, xp: s.xp, ep: s.ep, flags: Object.keys(s.flags).filter(f => s.flags[f] && coded.includes(f)).sort(), done: s.done, route: s.route,
      charms: {owned: Object.keys(s.charms.owned).filter(k => s.charms.owned[k]).sort(), equipped: s.charms.equipped},
      items: Object.fromEntries(Object.entries(s.items || {}).filter(([, v]) => v > 0)), roster: (s.roster || []).slice().sort()});
    const before = pick(JSON.parse(JSON.stringify(Q.save.get())));
    const ok = Q.save.fromCode(code).ok, s = Q.save.get(), after = pick(s);
    return {ok, before, after, pct: (s.progress || {}).ep2, floor: (s.progress || {}).ep, log: Q.save.ghostLog(s, 2).helped, total: Q.save.ghostLog(s, 2).total,
      story: B.questDecode(code).fields};
  }, code);
  expect(r.ok).toBe(true);
  expect(r.after, 'the save code restores the save exactly').toEqual(r.before);
  expect([r.floor, r.pct, r.log, r.total]).toEqual([2, AFTER[n].pct, AFTER[n].log, 20]);
  const file = path.join(DIR, `${route}-${n}.txt`);
  if (RECORD) { fs.mkdirSync(DIR, {recursive: true}); fs.writeFileSync(file, code + '\n'); return r; }
  // the recorded code (the next segment's start) carries this same story
  const want = await page.evaluate(c => Arcade.Backup.questDecode(c).fields, fs.readFileSync(file, 'utf8').trim());
  const story = f => ({flags: Object.keys(f.flags).filter(k => f.flags[k]).sort(), done: f.done, roster: f.roster.slice().sort(), charms: Object.keys(f.charms.owned).filter(k => f.charms.owned[k]).sort(), ep: f.ep});
  expect(story(r.story), `${route}-${n}.txt is what this segment makes (re-record: QUEST_ROUTES_RECORD=1)`).toEqual(story(want));
  return r;
}

/* ---------- THE SIX SEGMENTS, on each route ---------- */
for (const route of ROUTES) {
  test.describe(`EPISODE 2, the ${route === 'fade' ? 'POWER DOWN' : route.toUpperCase()} route`, () => {
    test('segment 1: Episode 1 finished → the attic\'s sheet → the intro → the Lobby', {tag: '@slow'}, async ({page}) => {
      test.setTimeout(120_000);
      const watch = await boot(page);
      // EPISODE 1, FINISHED on this route (every manor ghost, the Fermata and the Conductor; LV 15), as a save code
      const code0 = await page.evaluate(route => {
        const Q = Arcade.Quest, s = Q.save.reset(), keys = Arcade.Backup.QUEST_V1.ghosts.map(([k]) => k);
        keys.forEach((k, i) => { s.done[k] = route === 'mixed' ? (i % 2 ? 'fade' : 'befriend') : route; });
        Object.assign(s, {level: 15, xp: 0, ep: 1, world: {map: 'foyer', x: 18, y: 3, dir: 'up'}, roster: route === 'fade' ? [] : ['wisp', 'conductor']});
        Object.assign(s.flags, {'seen-intro': true, reginaldAwake: true, pathsTip: true, songBb: true, ep1Done: true, 'met-conductor': true});
        Q.save.write();
        const c = Q.save.code(); Q.save.reset(); return c;
      }, route);
      await load(page, code0);
      expect(await page.evaluate(() => Arcade.Quest.save.get().flags.ep1Done)).toBe(true);
      expect(await page.evaluate(() => Arcade.Quest.save.progress(Arcade.Quest.save.get()))).toMatchObject({ep: 2, ep2: 0});
      // up to the attic (a demo jump: Episode 1's own route tests walk it); the dusty sheet: "Pull the sheet?" Yes
      await page.evaluate(() => Arcade.Quest.go('world', {map: 'attic', x: 5, y: 6, dir: 'up'}));
      await talkAt(page, 'attic', 5, 5, 'up');
      await drive(page, s => s.ask);
      await page.locator('.q-ask .q-btn', {hasText: 'Yes'}).click();
      await drive(page, idleIn('lobby'));                                                    // the whole intro, every shot
      const gos = await page.evaluate(() => window.__gos);
      expect(gos).toContain('cutscene:ep2-intro');
      const arrival = await page.evaluate(() => [window.QUEST_EP2_ARRIVAL, window.__lines]);
      expect(arrival[0].length).toBeGreaterThan(0);
      expect(arrival[1]).toEqual(expect.arrayContaining(arrival[0]));                           // the first lines in the Lobby
      expect(await page.evaluate(() => Arcade.Quest.save.get().flags.ep2Start)).toBe(true);
      const code = await jukebox(page, 'lobby', 21, 5);
      await finish(page, route, 1, code);
      watch.check();
    });

    test('segment 2: the Orchestra Pit + the Prop Workshop + the Balcony (Tubby and Sal wake)', {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await boot(page);
      await load(page, startCode(route, 1));
      await step(page, 'lobby', 11, 2, 'up', 'pit');                                         // the auditorium doors
      await helpRoom(page, route, 'pit');
      expect(await page.evaluate(() => Arcade.Quest.save.get().flags)).toMatchObject({tuskAwake: true, 'met-tusk': true});
      await step(page, 'pit', 8, 9, 'down', 'lobby');
      await step(page, 'lobby', 19, 2, 'up', 'workshop');                                    // the side door
      await helpRoom(page, route, 'workshop');
      expect(await page.evaluate(() => Arcade.Quest.save.get().flags)).toMatchObject({salAwake: true, 'met-sal': true});
      await step(page, 'workshop', 8, 9, 'down', 'lobby');
      await step(page, 'lobby', 21, 2, 'up', 'balcony');                                     // the stairs Tubby's rope opened
      await helpRoom(page, route, 'balcony');
      await step(page, 'balcony', 7, 8, 'down', 'lobby');
      const code = await jukebox(page, 'lobby', 21, 5);
      await finish(page, route, 2, code);
      watch.check();
    });

    test('segment 3: Backstage + Professor Hoot\'s lesson + Snapjaw Sal\'s lesson', {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await boot(page);
      await load(page, startCode(route, 2));
      await walk(page, [['lobby', 11, 2, 'up', 'pit'], ['pit', 10, 4, 'up', 'backstage']]);  // down the trap door
      await helpRoom(page, route, 'backstage');
      await walk(page, [['backstage', 17, 2, 'up', 'pit'], ['pit', 8, 9, 'down', 'lobby'], ['lobby', 2, 2, 'up', 'greenroom']]);
      // Professor Hoot: awake (9 + 4 helped), the E♭ Encore
      await talkAt(page, 'greenroom', 4, 6, 'up');
      await drive(page, idleIn('greenroom'));
      expect(await page.evaluate(() => window.__lines)).toEqual(expect.arrayContaining(['MEASURE THIRTEEN! I\'m free! The static let go of my page!',
        'BRAVO! Hoo-hoo! Every step of the staircase! You know the E♭ Encore!']));
      expect(await page.evaluate(() => Arcade.Quest.save.get().flags)).toMatchObject({hootAwake: true, songEb: true});
      // Snapjaw Sal: her rhythm lesson, the Metronome Ticker
      await walk(page, [['greenroom', 7, 8, 'down', 'lobby'], ['lobby', 19, 2, 'up', 'workshop']]);
      await page.evaluate(() => { window.__play = {acc: .9, speed: .9, correct: 4, total: 4, success: true}; });
      await talkAt(page, 'workshop', 8, 4, 'up');
      await drive(page, idleIn('workshop'));
      expect(await page.evaluate(() => window.__lines)).toContain('BA-DUM-TSS! Right in the pocket! Here, take this. It ticks with you.');
      expect(await page.evaluate(() => Arcade.Quest.charms.owned('metronome-ticker'))).toBe(true);
      await step(page, 'workshop', 8, 9, 'down', 'lobby');
      const code = await jukebox(page, 'lobby', 21, 5);
      await finish(page, route, 3, code);
      watch.check();
    });

    test('segment 4: the Dressing Rooms + Rico Bandit', {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await boot(page);
      await load(page, startCode(route, 3));
      await walk(page, [['lobby', 11, 2, 'up', 'pit'], ['pit', 10, 4, 'up', 'backstage'], ['backstage', 5, 2, 'up', 'dressing']]);
      await helpRoom(page, route, 'dressing');
      // RICO BANDIT: befriended on BEFRIEND and MIXED, powered down on POWER DOWN
      const rico = route === 'fade' ? 'fade' : 'befriend';
      await page.evaluate(p => { window.__play = p; }, PLAY[rico]);
      expect(await page.evaluate(() => Arcade.Quest.world.fight('boss'))).toBe(true);
      await drive(page, s => s.scene === 'battle');
      await drive(page, idleIn('dressing'), pickFor(rico));
      const s = await page.evaluate(() => Arcade.Quest.save.get());
      expect([s.done['dressing:boss'], s.route.rico, !!s.flags.ricoDoor, !!s.flags.ricoVent, !!s.flags.ricoDone]).toEqual([rico, rico, rico === 'befriend', rico === 'fade', true]);
      expect(s.roster.includes('rico')).toBe(rico === 'befriend');
      await walk(page, [['dressing', 9, 9, 'down', 'backstage'], ['backstage', 17, 2, 'up', 'pit'], ['pit', 8, 9, 'down', 'lobby']]);
      const code = await jukebox(page, 'lobby', 21, 5);
      await finish(page, route, 4, code);
      watch.check();
    });

    test(`segment 5: the Fly Loft${route === 'fade' ? ' (through the Vent: the Lucky Pick)' : ''}`, {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await boot(page);
      await load(page, startCode(route, 4));
      if (route === 'fade') {
        // the Vent: the grate Rico's fall popped open, the duct box (Rico's Lucky Pick), the hatch up into the Loft
        await walk(page, [['lobby', 11, 2, 'up', 'pit'], ['pit', 10, 4, 'up', 'backstage'], ['backstage', 5, 2, 'up', 'dressing'], ['dressing', 16, 2, 'up', 'vent']]);
        await talkAt(page, 'vent', 7, 2, 'down');
        await drive(page, idleIn('vent'));
        expect(await page.evaluate(() => Arcade.Quest.charms.owned('ricos-pick'))).toBe(true);
        await step(page, 'vent', 14, 2, 'up', 'loft');
      } else {
        await walk(page, [['lobby', 19, 2, 'up', 'workshop'], ['workshop', 12, 2, 'up', 'loft']]);   // Sal's ladder
      }
      await helpRoom(page, route, 'loft');
      // the 20th machine: SHOWSTOPPER (every route), its UNLOCKED! card over the room, once
      expect(await page.evaluate(() => window.__cards)).toEqual(['Every machine in the theater is humming again. You\'re a true SHOWSTOPPER!']);
      const code = await jukebox(page, 'loft', 3, 2);
      await finish(page, route, 5, code);
      expect(await page.evaluate(() => Arcade.Quest.save.get().charms.owned['ricos-pick'] === true)).toBe(route === 'fade');
      watch.check();
    });

    test('segment 6: the Main Stage → THE BIG NUMBER → the ending → the Microphone → the cliffhanger → the credits → EPISODE 2 COMPLETE', {tag: '@slow'}, async ({page}) => {
      test.setTimeout(300_000);
      const watch = await boot(page);
      await load(page, startCode(route, 5));
      expect((await snap(page)).w.map).toBe('loft');                                         // CONTINUE: the Loft's jukebox
      await step(page, 'loft', 20, 8, 'down', 'stage');                                       // the Loft's stairs
      await page.evaluate(() => { Arcade.Skins.markSeen('trumpet', Arcade.Skins.fresh('trumpet')); Arcade.Avatar.markSeen(Arcade.Avatar.freshItems()); });
      // A on Maestro Moose: his speech, then THE BIG NUMBER (BEFRIEND: HARMONIZE at its finale; else played on)
      const big = route === 'befriend' ? 'befriend' : 'fade';
      await page.evaluate(p => { window.__play = p; }, FULL);
      await talkAt(page, 'stage', 10, 3, 'right');
      await drive(page, s => s.scene === 'complete', b => (big === 'befriend' && b && b.calm >= 100 && b.hp <= 1 ? 'HARMONIZE' : 'PLAY'));
      await page.waitForFunction(() => window.__res);
      const r = await page.evaluate(() => ({gos: window.__gos, res: {title: window.__res.title, msg: window.__res.msg, tiles: window.__res.tiles, extra: window.__res.extra},
        ach: Arcade.store.gameData('arcade-quest').achievements || {}, s: Arcade.Quest.save.get()}));
      const ending = big === 'befriend' ? 'ep2-ending' : 'ep2-ending-fade';
      const order = ['cutscene:' + ending, 'cutscene:ep2-mic', 'cutscene:ep2-cliffhanger', 'credits', 'complete'].map(x => r.gos.indexOf(x));
      expect(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), r.gos.join(' ')).toBe(true);
      expect(r.gos).not.toContain('cutscene:' + (big === 'befriend' ? 'ep2-ending-fade' : 'ep2-ending'));
      expect(r.res.title).toBe('Episode 2 complete!');
      expect(r.res.tiles[0].slice(0, 2)).toEqual(['Machines helped', '20 / 20']);
      expect(r.res.msg).toContain('SHOWSTOPPER');
      expect([r.s.done['stage:boss'], r.s.route.bignumber, !!r.s.flags.ep2Done]).toEqual([big, big, true]);
      // the achievements: stage-all on every route; stage-friends only when everything was befriended
      expect(r.ach.ep2).toBe(true);
      expect(r.ach['stage-all']).toBe(true);
      expect(!!r.ach['stage-friends']).toBe(route === 'befriend');
      expect(!!r.s.items['mic-stand']).toBe(big === 'befriend');
      // EPISODE 2 COMPLETE's own save code
      const code = r.res.extra.match(/q-code">([0-9A-Z-]+)</)[1].replace(/-/g, '');
      await finish(page, route, 6, code);
      watch.check();
    });
  });
}

/* ---------- NO SOFT-LOCK, RANDOMIZED (fixed seeds): any order, any mix, codes in between ---------- */
test('NO SOFT-LOCK: 40 random playthroughs (fixed seeds) always reach every machine, Rico and THE BIG NUMBER; any save code on the way restores the way on', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, M = window.QUEST_MAPS, d = Arcade.store.gameData('arcade-quest'), out = [];
    // a small seeded random (mulberry32): the same 40 playthroughs every run
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // the rooms you can reach from the Lobby: every door whose `need` flag is set (the real map data, the real save)
    const reach = s => { const seen = new Set(['lobby']), todo = ['lobby'];
      while (todo.length) { const id = todo.pop(); (M[id].doors || []).forEach(dr => { if (M[dr.to] && M[dr.to].ep === 2 && (!dr.need || s.flags[dr.need]) && !seen.has(dr.to)) { seen.add(dr.to); todo.push(dr.to); } }); }
      return seen; };
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = rng(seed);
      const s = Q.save.reset();
      Object.assign(s.flags, {'seen-intro': true, ep1Done: true, ep2Start: true}); s.ep = 2; s.level = 20;
      Q.save.write();
      let steps = 0, stuck = null;
      for (;;) {
        const now = Q.save.get(), rooms = reach(now);
        // what you could do next: a machine (or a boss) in a room you can reach that isn't done
        const open = [...rooms].flatMap(id => (M[id].enemies || []).map(e => ({id, e})))
          .filter(({id, e}) => !now.done[id + ':' + e.key] && (e.key !== 'boss' || id !== 'stage' || now.flags.ricoDone));
        if (!open.length) break;
        const pick = open[Math.floor(rnd() * open.length)], how = rnd() < .5 ? 'befriend' : 'fade';
        now.done[pick.id + ':' + pick.e.key] = how;
        if (how === 'befriend' && pick.e.type && !now.roster.includes(pick.e.type)) now.roster.push(pick.e.type);
        Q.save.write();
        // now and then: carry on from a save code, as on another device
        if (rnd() < .3) { const ok = Q.save.fromCode(Q.save.code()).ok; if (!ok) { stuck = 'code'; break; } }
        if (++steps > 60) { stuck = 'loop'; break; }
      }
      const s2 = Q.save.get(), log = Q.save.ghostLog(s2, 2);
      out.push({seed, stuck, rooms: reach(s2).size, helped: log.helped, rico: !!s2.done['dressing:boss'], big: !!s2.done['stage:boss'], ep2Done: !!s2.flags.ep2Done,
        pct: Q.save.progress(s2).ep2, ways: [s2.flags.ricoDoor, s2.flags.ricoVent].filter(Boolean).length, vent: !!s2.flags.ricoVent});
    }
    d.save = null;
    return out;
  });
  for (const x of r) {
    expect(x, `seed ${x.seed}`).toMatchObject({stuck: null, rooms: x.vent ? 10 : 9, helped: 20, rico: true, big: true, ep2Done: true, ways: 1});
    expect(x.pct, `seed ${x.seed}`).toBe(100 - 10);              // everything but Professor Hoot's lesson (songEb is a lesson, not a machine)
  }
  watch.check();
});

/* ---------- EPISODE 1, UNTOUCHED ---------- */
test('a save halfway through Episode 1 is untouched: it loads, plays on and saves exactly as before (no Episode 2 flags, its own % and line)', {tag: '@quick'}, async ({page}) => {
  const half = {v: 6, level: 7, xp: 12, hp: 44, maxHp: 44, tokens: 30, items: {'valve-oil': 2, 'cork-grease': 1}, roster: ['wisp', 'squeaker'],
    battles: {won: 9, befriended: 5, faded: 4}, world: {map: 'foyer', x: 18, y: 3, dir: 'up'}, converted: {}, charms: {owned: {'golden-mouthpiece': true}, equipped: ['golden-mouthpiece', null]},
    band: null, route: {}, ep: 1, flags: {'seen-intro': true, pathsTip: true, songBb: true},
    done: {'hall:w1': 'befriend', 'hall:w2': 'fade', 'hall:w3': 'befriend', 'hall:s1': 'fade', 'library:h1': 'befriend', 'library:h2': 'fade', 'library:h3': 'befriend', 'library:w1': 'fade', 'ballroom:b1': 'befriend'}};
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: JSON.parse(JSON.stringify(half)), settings: SETTINGS, keysTip: true}}})});
  await page.goto('arcade-quest/index.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'title');
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, s = Q.save.get(), code = Q.save.code();
    const copy = JSON.parse(JSON.stringify(s));
    Q.save.fromCode(code);
    const t = Q.save.get();
    return {s: copy, code2: Q.save.code(), code, t: {flags: t.flags, done: t.done, ep: t.ep, level: t.level, roster: t.roster.slice().sort(), charms: t.charms}, title: document.body.textContent};
  });
  // loading changed nothing it had: the same story, Episode 1's, no Episode 2 flag, its own floor line
  ['level', 'xp', 'roster', 'flags', 'done', 'world', 'charms', 'items', 'ep'].forEach(k => expect(r.s[k], k).toEqual(half[k]));
  expect(r.s.progress).toMatchObject({ep: 1, pct: Math.round(9 / 20 * 50 + 10)});
  expect(Object.keys(r.s.flags).some(f => /ep2|tusk|sal|hoot|rico|songEb/.test(f))).toBe(false);
  // its save code round-trips exactly (the Episode 2 block all zeros, the episode 1)
  expect(r.code2).toBe(r.code);
  // (pathsTip only changes a line: save codes leave it out)
  // (and, as always in Episode 1's part of a code, which ghosts are helped, not how: the roster says who's a friend)
  expect(r.t).toMatchObject({flags: {'seen-intro': true, songBb: true}, ep: 1, level: 7, roster: ['squeaker', 'wisp']});
  expect(Object.keys(r.t.done).sort()).toEqual(Object.keys(half.done).sort());
  expect(r.t.flags.pathsTip).toBeUndefined();
  // the title: Episode 1 only (EPISODE SELECT opens at ep1Done)
  expect(r.title).not.toMatch(/Episode 2: The Showtime Stage/);
  watch.check();
});
