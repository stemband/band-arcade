/* ARCADE QUEST, EPISODE 1: THE TWO ROUTES, END TO END (?demo). The Phantom Fermata guards the attic: BEFRIENDED, it
   opens the attic door (atticOpen); DEFEATED, the stairwell's cracked wall opens the Hidden Passage (atticPassage), with
   its own treasure (the Echo Chime) and a secret stair up to the attic. The Ghost Conductor: befriended = the full
   ending, defeated = the shorter defeat ending; Episode 1 is finished either way.
   Each run plays every manor ghost through the real overworld and battle scene (Q.world.fight = walking into it) and
   walks the real doors: Sir Reginald, the stairs, the attic door or the cracked wall and the passage. Only the
   student's playing is stood in for (Q.challenge.run / Q.dodge.start). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const ROOMS = ['hall', 'library', 'ballroom', 'kitchen'];
// befriend: a gentle, calm-raising PLAY (CALM fills before the HP runs out), then HARMONIZE; defeat: full-power PLAYs
const PLAY = {befriend: {acc: .2, speed: .5, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};

async function boot(page, store) {
  const watch = await prepare(page, {store: store || device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {settings: SETTINGS}}})});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__gos = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    const go = Q.go; Q.go = (name, args) => { window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name); return go(name, args); };
    Q.micReady = async () => true;
    const show = Arcade.UI.results.show; Arcade.UI.results.show = o => { window.__res = o.msg; return show(o); };   // EPISODE 1 COMPLETE's words
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 4, total: 4, success: true} : Object.assign({}, window.__play));
    Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
  });
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0, cut: Q.cutscene && Q.cutscene(),
    chime: Q.charms.owned('echo-chime'), gos: window.__gos.slice(-8)};
});
/** step the game until done(snapshot): A (Enter) through text boxes and cutscenes, `pick` at the battle menu */
async function drive(page, done, pick = () => 'PLAY', max = 900) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.cmd) await page.evaluate(l => [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)).click(), pick(s.b));
    else if (s.text || ['battle', 'cutscene', 'credits'].includes(s.scene)) await page.keyboard.press('Enter');
    await page.waitForTimeout(35);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text;
async function room(page, map, x, y, dir = 'up') {
  await page.evaluate(([map, x, y, dir]) => Arcade.Quest.go('world', {map, x, y, dir}), [map, x, y, dir]);
  await drive(page, idleIn(map));
}
/** fight one ghost: 'befriend' (SERENADEs, then HARMONIZE) or 'fade' (full-power PLAYs) */
async function fight(page, map, key, how) {
  await page.evaluate(p => { window.__play = p; }, PLAY[how]);
  expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key)).toBe(true);
  await drive(page, s => s.scene === 'battle');
  // befriend = SERENADE until CALM is full, then HARMONIZE (the befriend path); fade = PLAY
  await drive(page, idleIn(map), b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY'));
  expect(await page.evaluate(k => Arcade.Quest.save.get().done[k], `${map}:${key}`)).toBe(how);
}
/** A (Enter) at whatever you face. A focused button takes Enter for itself (keyboard access; WebKit can leave one
    focused after a text box), so nothing is focused first, as while playing */
async function pressA(page) {
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  await page.keyboard.press('Enter');
}
/** walk: stand at x, y facing dir, then step that way (through a door) */
async function step(page, map, x, y, dir) {
  await drive(page, idleIn(map));
  await page.evaluate(([x, y, dir]) => Arcade.Quest.world.warp(x, y, dir), [x, y, dir]);
  await page.waitForTimeout(80);
  await page.keyboard.press({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'}[dir]);
  await page.waitForTimeout(700);                               // the step, a door's fade out and in, or a sign opening
}

/** a whole run: every manor ghost (how(i) for the i-th), then the Fermata and the Conductor */
async function run(page, {ghost, fermata, conductor}) {
  let i = 0;
  for (const map of ROOMS) {
    await room(page, map, 1, 2);
    const keys = (await snap(page)).w.ghosts.map(g => g.key);
    for (const k of keys) await fight(page, map, k, ghost(i++));
  }
  // Sir Reginald wakes up (8 ghosts helped) and steps aside; up the stairs
  await room(page, 'hall', 14, 3, 'up');
  await pressA(page);
  await drive(page, s => idleIn('hall')(s) && s.w.npcs.find(n => n.id === 'reginald').x !== 14);
  await step(page, 'hall', 14, 2, 'up');
  await drive(page, idleIn('stairs'));
  // the stairs: the two ghosts, then the gate: the Fermata
  for (const k of ['b1', 'c1']) await fight(page, 'stairs', k, ghost(i++));
  await fight(page, 'stairs', 'boss', fermata);
  if (fermata === 'fade') {
    await drive(page, idleIn('stairs'));                          // "Something shifted somewhere in the manor…"
    // the door stays shut; the cracked wall is open: into the Hidden Passage, its treasure, the secret stair
    await step(page, 'stairs', 5, 2, 'up'); await drive(page, idleIn('stairs'));
    expect((await snap(page)).w.map).toBe('stairs');
    await step(page, 'stairs', 1, 2, 'up'); await drive(page, idleIn('passage'));
    await page.evaluate(() => Arcade.Quest.world.warp(8, 7, 'up')); await page.waitForTimeout(80); await pressA(page);
    await drive(page, s => idleIn('passage')(s) && s.chime);          // the treasure: found only this way
    await step(page, 'passage', 6, 2, 'up'); await drive(page, idleIn('attic'));
  } else {
    await step(page, 'stairs', 1, 2, 'up'); await drive(page, idleIn('stairs'));   // the crack stays a wall
    expect((await snap(page)).w.map).toBe('stairs');
    await step(page, 'stairs', 5, 2, 'up'); await drive(page, idleIn('attic'));
  }
  // the attic: the Ghost Conductor (full-power PLAYs: his finale holds him at 1 HP once, CALM full; then the choice)
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true}; });
  expect(await page.evaluate(() => Arcade.Quest.world.fight('boss'))).toBe(true);
  await drive(page, s => s.gos.includes('complete'), b => (conductor === 'befriend' && b && b.calm >= 100 && b.hp <= 1 ? 'HARMONIZE' : 'PLAY'), 1500);
  return page.evaluate(() => ({s: Arcade.Quest.save.get(), gos: window.__gos, lines: window.__lines,
    msg: window.__res || ''}));
}

test('BEFRIEND-ALL: the attic door, the full ending, Episode 1 finished', async ({page}) => {
  test.setTimeout(300_000);
  const watch = await boot(page);
  const r = await run(page, {ghost: () => 'befriend', fermata: 'befriend', conductor: 'befriend'});
  expect(r.s.flags).toMatchObject({atticOpen: true, ep1Done: true});
  expect(r.s.flags.atticPassage).toBeFalsy();
  expect(r.s.flags.shiftHint).toBeFalsy();
  expect(r.s.route).toEqual({fermata: 'befriend', conductor: 'befriend'});
  expect(r.s.roster).toEqual(expect.arrayContaining(['fermata', 'conductor']));
  expect(r.gos).toEqual(expect.arrayContaining(['cutscene:ending', 'cutscene:cliffhanger', 'credits', 'complete']));
  expect(r.gos).not.toContain('cutscene:ending-fade');
  expect(r.msg).toContain('The Ghost Conductor joined your band.');
  expect(r.s.progress.pct).toBe(90);                             // everything but the Butler's B♭ Blast lesson (not part of these runs): the same on both routes
  watch.check();
});

test('DEFEAT-ALL: the Hidden Passage, its treasure, the defeat ending, Episode 1 finished', async ({page}) => {
  test.setTimeout(300_000);
  const watch = await boot(page);
  const r = await run(page, {ghost: () => 'fade', fermata: 'fade', conductor: 'fade'});
  expect(r.s.flags).toMatchObject({atticPassage: true, ep1Done: true, shiftHint: true});
  expect(r.s.flags.atticOpen).toBeFalsy();
  expect(r.s.route).toEqual({fermata: 'fade', conductor: 'fade'});
  expect(r.s.roster).toEqual([]);
  expect(r.lines.filter(l => l === 'Something shifted somewhere in the manor…')).toHaveLength(1);
  expect(r.lines.some(l => /PROPERTY OF THE MANOR ORCHESTRA|silver chime/.test(l))).toBe(true);   // the passage's own words
  expect(r.gos).toEqual(expect.arrayContaining(['cutscene:ending-fade', 'cutscene:cliffhanger', 'credits', 'complete']));
  expect(r.gos).not.toContain('cutscene:ending');
  expect(r.msg).toContain('faded into the rafters');
  expect(r.s.progress.pct).toBe(90);                             // everything but the Butler's B♭ Blast lesson (not part of these runs): the same on both routes
  watch.check();
});

test('MIXED: some friends, the Fermata defeated (the passage), the Conductor befriended (the best ending)', async ({page}) => {
  test.setTimeout(300_000);
  const watch = await boot(page);
  const r = await run(page, {ghost: i => (i % 2 ? 'fade' : 'befriend'), fermata: 'fade', conductor: 'befriend'});
  expect(r.s.flags).toMatchObject({atticPassage: true, ep1Done: true});
  expect(r.s.route).toEqual({fermata: 'fade', conductor: 'befriend'});
  expect(r.gos).toContain('cutscene:ending');
  expect(r.msg).toContain('joined your band');
  watch.check();
});

test('the routes stay open: old saves, save codes and a done gate ghost always keep their way (no soft-lock)', async ({page}) => {
  const watch = await boot(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.Quest, A = Arcade, d = A.store.gameData('arcade-quest'), out = {};
    const base = {level: 5, xp: 0, hp: 36, maxHp: 36, tokens: 0, items: {}, battles: {won: 0, befriended: 0, faded: 0}, world: null, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: null};
    // 1. a version-4 save that already BEFRIENDED the Fermata: keeps its opened door, no passage
    d.save = Object.assign({}, base, {v: 4, roster: ['fermata'], flags: {atticOpen: true}, done: {'stairs:boss': 'befriend'}});
    let s = Q.save.get(); out.befriended = {v: s.v, open: !!s.flags.atticOpen, passage: !!s.flags.atticPassage, route: s.route};
    // 2. a gate ghost faded with no flag at all (any odd state): the passage opens by itself
    d.save = Object.assign({}, base, {v: 4, roster: [], flags: {}, done: {'stairs:boss': 'fade'}});
    s = Q.save.get(); out.faded = {open: !!s.flags.atticOpen, passage: !!s.flags.atticPassage, route: s.route};
    // 3. a save code of a defeat-route save (codes don't carry the passage flag): loading it keeps the way open
    d.save = Object.assign({}, base, {v: 5, roster: ['wisp'], flags: {atticPassage: true, shiftHint: true, songBb: true}, done: {'stairs:boss': 'fade', 'hall:w1': 'befriend'}, route: {fermata: 'fade'}});
    const code = Q.save.code(); Q.save.reset();
    out.loaded = Q.save.fromCode(code).ok;
    s = Q.save.get(); out.fromCode = {open: !!s.flags.atticOpen, passage: !!s.flags.atticPassage, route: s.route};
    // 4. the Echo Chime survives a save code (the 6th charm place)
    s.charms.owned['echo-chime'] = true; Q.save.write();
    out.chime = A.Backup.questDecode(Q.save.code()).fields.charms.owned['echo-chime'] === true;
    return out;
  });
  expect(r.befriended).toEqual({v: 5, open: true, passage: false, route: {fermata: 'befriend'}});
  expect(r.faded).toEqual({open: false, passage: true, route: {fermata: 'fade'}});
  expect(r.loaded).toBe(true);
  expect(r.fromCode).toEqual({open: false, passage: true, route: {fermata: 'fade'}});
  expect(r.chime).toBe(true);
  watch.check();
});

test('the cracked wall is a wall until the Fermata is defeated (it says so), then it leads into the Hidden Passage', async ({page}) => {
  const watch = await boot(page);
  await room(page, 'stairs', 1, 2);
  await step(page, 'stairs', 1, 2, 'up');
  await drive(page, idleIn('stairs'));
  expect((await snap(page)).w.map).toBe('stairs');
  expect(await page.evaluate(() => window.__lines)).toContain('A thin crack runs up the wall. Cold air whistles through it... in B♭.');
  await page.evaluate(() => Arcade.Quest.save.setFlag('atticPassage'));
  await room(page, 'stairs', 1, 2);
  await step(page, 'stairs', 1, 2, 'up');
  await drive(page, idleIn('passage'));
  expect((await snap(page)).w).toMatchObject({map: 'passage', x: 5, y: 7});
  watch.check();
});
