/* ARCADE QUEST, EPISODE 2, build step 5 (docs/games/arcade-quest-ep2-plan.md): THE MAIN STAGE, THE BIG NUMBER (the
   final boss: the whole Showtime Band), BOTH ENDINGS, THE MICROPHONE SPEAKS (DECISION 3, word for word), the
   cliffhanger, the credits, EPISODE 2 COMPLETE, the achievements (ep2, stage-friends, stage-all = SHOWSTOPPER) and their
   items, THE STAGE COLLECTION at Ticket Booth Tina, the flash rule measured on the stage's lights, the band sprite and
   the mic's red light. The real overworld, battle and cutscene scenes run; only the student's playing is stood in for
   (Q.challenge.run / Q.dodge.start) where a test says so. One route a test (THE TIME BUDGET: 60 s a test on CI). */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const PLAY = {befriend: {acc: 1, speed: 1, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};
const MACHINES = {pit: ['m1', 'm2', 'm3'], workshop: ['m1', 'm2', 'm3', 'm4'], backstage: ['m1', 'm2', 'm3', 'm4'], balcony: ['m1', 'm2'],
  dressing: ['m1', 'm2', 'm3'], loft: ['m1', 'm2', 'm3', 'm4']};
const ALL20 = [].concat(...Object.entries(MACHINES).map(([r, ks]) => ks.map(k => `${r}:${k}`)));
const KINDS = ['tapsy', 'spotlight', 'feedback', 'confetti', 'metrognome', 'stubs', 'ropeknot', 'miclet'];
const SPEECH = ['...I remember this song.', 'I was THEIR microphone. I heard every show. Every audience. Every encore.',
  'Then they switched the band off. They wired me into the games instead.', 'Since then... squeaks. Wrong notes. Kids playing to WIN. Nobody... plays for me.',
  'So I\'m taking the sound back. All of it.', 'Until it\'s quiet. Until it\'s MUSIC again.'];
const ITEMS = [['bg', 'showtimestage', 'ep2'], ['plate', 'encore', 'ep2'], ['head', 'showtophat', 'ep2'], ['effect', 'spotlight', 'stage-friends'],
  ['top', 'showsash', 'stage-all'], ['plate', 'showstopper', 'stage-all']];
const STAGE_COLLECTION = [['top', 'bowtie'], ['head', 'bulbband'], ['head', 'usher']];

/** a save at the end of step 4: every machine helped (12 of the 20 by default), Rico done on this route, LV 40 (a few
    PLAYs a battle) unless `level` says otherwise */
function save(route = 'befriend', {helped = 12, level = 40, extra = {}} = {}) {
  const s = {v: 6, level, xp: 0, hp: 200, maxHp: 200, tokens: 900, items: {'valve-oil': 2}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {rico: route},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true, songEb: true,
      tuskAwake: true, 'met-tusk': true, salAwake: true, 'met-sal': true, hootAwake: true, 'met-rico': true, ricoDone: true,
      [route === 'fade' ? 'ricoVent' : 'ricoDoor']: true}, done: {'dressing:boss': route}, ep: 2};
  ALL20.slice(0, helped).forEach(k => { s.done[k] = route; });
  if (route === 'befriend') s.roster.push('rico');
  return Object.assign(s, extra, {flags: Object.assign(s.flags, extra.flags || {}), done: Object.assign(s.done, extra.done || {})});
}
const store = (s, member = 'trumpet') => device(member, {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}});
async function boot(page, s = save(), url = 'arcade-quest/index.html?demo&warp=stage', {member = 'trumpet', standIn = true} = {}) {
  const watch = await prepare(page, {store: store(s, member)});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName && (Arcade.Quest.sceneName !== 'world' || Arcade.Quest.world.state()));
  await page.evaluate(standIn => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__runs = []; window.__said = []; window.__gos = []; window.__res = null; window.__shows = [];
    const go = Q.go; Q.go = (name, args) => { window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name); return go(name, args); };
    const show = Arcade.UI.results.show; Arcade.UI.results.show = o => { window.__res = o; return show(o); };      // EPISODE 2 COMPLETE
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); window.__said.push({name: o && o.name, lines: [].concat(l)}); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
    window.__hurt = false;
    if (!standIn) return;
    Q.challenge.run = async (type, o) => {
      window.__runs.push({type, harm: !!(o && o.harmonize), ser: !!(o && o.serenade), lit: Q.bandLit ? Q.bandLit() : null, enemy: o && o.enemy && {cutoff: o.enemy.cutoff, bars: o.enemy.bars, tier: o.enemy.tier, rhythm: o.enemy.rhythm, accel: o.enemy.accel, beats: o.enemy.beats, notes: o.enemy.notes}});
      return o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play);
    };
    window.__dodges = [];
    Q.dodge.start = async ({enemy, onHit}) => {
      window.__dodges.push(enemy.dodge.patterns.map(p => p.kind + (p.sprite ? ':' + p.sprite : '')).join('+'));
      if (window.__hurt) { onHit(9999, false); return {damage: 9999, hits: 1, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0}; }
      return {damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0};
    };
  }, standIn);
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd'), i = document.getElementById('intro');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(), cut: Q.cutscene && Q.cutscene(),
    card: !!document.querySelector('.sk-catchup'), results: !!document.querySelector('.q-theme .ui-results, #uiResults:not([hidden])'),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0, intro: !!i && !i.hidden};
});
async function drive(page, done, pick = () => 'PLAY', max = 1200) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.intro) await page.locator('#introGo').click();
    else if (s.cmd) await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l) && !x.disabled) || document.querySelector('#qCmd .q-btn'); b.click(); }, pick(s.b));
    else if (s.text || ['battle', 'cutscene', 'credits'].includes(s.scene)) await page.keyboard.press('Enter');
    await page.waitForTimeout(30);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text && !s.intro && !s.card;
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
const world = page => page.evaluate(() => Arcade.Quest.world.state());

/* ---------- THE MAIN STAGE: its three doors ---------- */
for (const [name, route, from, at, dir, spawn] of [
  ['Backstage\'s wings (ricoDone, either route)', 'fade', 'backstage', [14, 2], 'up', {x: 1, y: 3}],
  ['the Dressing Rooms\' star door (ricoDoor: Rico befriended)', 'befriend', 'dressing', [13, 2], 'up', {x: 20, y: 3}],
  ['the Fly Loft\'s stairs (ricoDone, either route)', 'befriend', 'loft', [20, 8], 'down', {x: 19, y: 2}],
]) {
  test(`the Main Stage opens from ${name}; the band stands frozen there, Moose at his podium`, async ({page}) => {
    const watch = await boot(page, save(route), `arcade-quest/index.html?demo&warp=${from}`);
    await step(page, from, at[0], at[1], dir);
    const w = await drive(page, idleIn('stage'));
    expect(w.w).toMatchObject(spawn);
    expect(w.w.npcs.map(n => n.id).sort()).toEqual(['stage-hoot', 'stage-rico', 'stage-sal', 'stage-tusk']);
    expect(w.w.ghosts).toEqual([{key: 'boss', type: 'bignumber', x: 11, y: 3}]);
    expect(await page.evaluate(() => [Arcade.Quest.save.helped(2), Arcade.Quest.save.ghosts(2).length])).toEqual([12, 20]);   // (the boss isn't one of the 20)
    watch.check();
  });
}

test('before ricoDone the three doors stay shut (their locked signs; no "coming soon" left anywhere)', {tag: '@quick'}, async ({page}) => {
  const s = save('befriend');
  delete s.flags.ricoDone; delete s.flags.ricoDoor; delete s.done['dressing:boss'];
  const watch = await boot(page, s, 'arcade-quest/index.html?demo&warp=backstage');
  await step(page, 'backstage', 14, 2, 'up');
  await drive(page, idleIn('backstage'));
  expect(await lines(page)).toContain('The curtain is down. Rico\'s notes are holding the rope tight.');
  const r = await page.evaluate(() => {
    const M = window.QUEST_MAPS, doors = Object.values(M).flatMap(m => m.doors.filter(d => d.to === 'stage'));
    return {doors: doors.map(d => [d.need, !!d.soon]), soonSigns: Object.keys(window.QUEST_SIGNS).filter(k => /^(wings|stardoor|loft-stairs)-soon$/.test(k)),
      built: !!M.stage, ep: M.stage.ep};
  });
  expect(r).toEqual({doors: [['ricoDone', false], ['ricoDoor', false], ['ricoDone', false]], soonSigns: [], built: true, ep: 2});
  watch.check();
});

test('MAESTRO MOOSE leaves the Lobby at ricoDone (his note on the carpet, Tina says where he went); on stage his speech plays once', {tag: '@quick'}, async ({page}) => {
  test.setTimeout(60000);
  // (Tina's earlier once-lines already said: hers about Maestro is next)
  const watch = await boot(page, save('befriend', {extra: {flags: {'met-tina': true, 'tina-tusk': true, 'tina-sal': true, 'tina-rico': true, 'tina-eb': true}}}), 'arcade-quest/index.html?demo&warp=lobby');
  await drive(page, idleIn('lobby'));
  expect((await world(page)).npcs.map(n => n.id)).not.toContain('moose');
  await talkAt(page, 'lobby', 11, 7, 'up');
  await drive(page, idleIn('lobby'));
  expect(await lines(page)).toEqual(['A note on the carpet, in big loopy letters:', '"GONE TO THE STAGE! PLACES, EVERYONE! — M.M."']);
  await talkAt(page, 'lobby', 3, 4, 'up');                                                  // Tina's window: her line, then her booth
  for (let i = 0; i < 20 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  await expect(page.locator('.q-booth')).toBeVisible();
  expect(await lines(page)).toContain('Did you see Maestro run past? "PLACES!" he yelled. He went to the stage!');
  // before ricoDone he is still in the Lobby
  expect(await page.evaluate(() => { const n = window.QUEST_MAPS.lobby.npcs.find(x => x.id === 'moose'); return n.if; })).toBe('!ricoDone');
  watch.check();
});

test('on the Main Stage: A on Moose = his speech (once), then THE BIG NUMBER; later visits say one line', async ({page}) => {
  test.setTimeout(60000);
  const watch = await boot(page, save('befriend'));
  await drive(page, idleIn('stage'));
  await talkAt(page, 'stage', 10, 3, 'right');
  await drive(page, s => s.scene === 'battle');
  expect((await lines(page)).slice(0, 4)).toEqual(['Everyone\'s here! At last! The Big Number! Places, places!', 'And a ONE, and a TWO, and a—', 'KSSSSHHHHHHH!',
    'The static! It\'s got the WHOLE BAND!']);
  expect(await page.evaluate(() => Arcade.Quest.save.flag('met-bignumber'))).toBe(true);
  // out of breath: back to the last Save Jukebox (the Lobby's), the band still there
  await page.evaluate(() => { window.__hurt = true; window.__play = {acc: 0, speed: 0, correct: 0, total: 4, success: false}; });
  await drive(page, idleIn('lobby'));
  expect(await page.evaluate(() => Arcade.Quest.save.get().done['stage:boss'])).toBeUndefined();
  await page.evaluate(() => { window.__hurt = false; Arcade.Quest.go('world', {map: 'stage', x: 12, y: 3, dir: 'left'}); });
  await drive(page, idleIn('stage'));
  expect((await world(page)).ghosts.map(g => g.key)).toEqual(['boss']);
  await clear(page);
  await page.keyboard.press('Enter');
  await drive(page, s => s.scene === 'battle');
  expect((await lines(page))[0]).toBe('The static still has my band! Play us back in tune! And a one, and a—');
  watch.check();
});

/* ---------- THE BIG NUMBER: five stages, one band member each ---------- */
const STAGES = [
  {who: 'Tubby Tusk', type: 'longtone', dodge: 'bubbles:tuba-bubble'},
  {who: 'Professor Hoot', type: 'play', dodge: 'rain:flurry-shot'},
  {who: 'Snapjaw Sal', type: 'rhythm', dodge: 'taps:stick-shot'},
  {who: 'Rico Bandit', type: 'echo', dodge: 'borrow:borrow-note'},
  {who: 'Maestro Moose', type: 'tempo', dodge: 'baton+rain:flurry-shot'},
];
/** start THE BIG NUMBER from the stage (walking into Moose) and play its stages at a level where each PLAY ends one */
async function bigNumber(page) {
  await drive(page, idleIn('stage'));
  expect(await page.evaluate(() => Arcade.Quest.world.fight('boss'))).toBe(true);
  await drive(page, s => s.scene === 'battle');
  // each PLAY takes it down one stage: a fifth of its HP (the stand-in plays well; the band sits out: band [])
  await page.evaluate(() => { const B = Arcade.Quest.battleState(); window.__fifth = Math.ceil(B.ehp / 5); });
}
for (const route of ['befriend', 'fade']) {
  test(`THE BIG NUMBER (${route === 'befriend' ? 'HARMONIZE: the best ending' : 'played on: the shorter ending'}): the five stages in order, each its member lit, its challenge and dodge; the finale at 1 HP`, async ({page}) => {
    test.setTimeout(90000);
    const watch = await boot(page, save('befriend', {level: 14}));
    await bigNumber(page);
    // a stand-in PLAY that does exactly a stage's worth (a fifth of the HP): the battle.js damage formula at acc 1
    await page.evaluate(() => {
      const Q = Arcade.Quest, run = Q.challenge.run;
      Q.challenge.run = async (type, o) => { const r = await run(type, o); return r; };
      // 55 %: no critical hits (a skill crit needs 95 %, a lucky one 70 %), about 33 damage a PLAY at LV 14: two a stage
      // (30 × 1.1: every Episode 2 save has finished Episode 1, so it plays the METAL tier: INSTRUMENT TIERS)
      window.__play = {acc: .55, speed: 1, correct: 2, total: 4, success: false};
      window.__perPlay = Q.save.powerAt(Q.save.get().level);
    });
    const r0 = await page.evaluate(() => ({e: window.QUEST_ENEMIES.find(e => e.id === 'bignumber'), hp: Arcade.Quest.battleState().ehp}));
    expect(r0.e).toMatchObject({boss: true, final: true, ep: 2, area: 'stage', music: ['quest-ep2-boss', 'quest-boss'], doneFlag: 'ep2Done', serenade: false,
      harmonize: {type: 'scale', notes: 'Eb'}, harmonizeKeep: true});
    expect(r0.e.stages.map(st => st.until)).toEqual([.8, .6, .4, .2, 0]);
    expect(r0.hp).toBe(196);                                                                   // 140 × the stage area's 1.4 (solo)
    // play until the finale: SERENADE is never offered; the stages come in order
    const s = await drive(page, x => x.b && x.b.hp === 1 && x.b.calm >= 100 && x.cmd, () => 'PLAY');
    const r = await page.evaluate(() => ({runs: window.__runs.filter(x => !x.harm), dodges: window.__dodges, said: window.__said.filter(x => x.lines.some(l => /./.test(l)))}));
    const types = [...new Set(r.runs.map(x => x.type))];
    expect(types).toEqual(STAGES.map(st => st.type));
    // the member lit during each stage's challenge = that stage (0 Tubby … 4 Moose)
    STAGES.forEach((st, i) => expect(r.runs.filter(x => x.type === st.type).every(x => x.lit === i), st.who).toBe(true));
    expect(r.runs.find(x => x.type === 'longtone').enemy).toMatchObject({cutoff: true, notes: 'Eb'});
    expect(r.runs.find(x => x.type === 'rhythm').enemy).toMatchObject({bars: 2, tier: 3});
    expect(r.runs.find(x => x.type === 'echo').enemy).toMatchObject({rhythm: 'q. e e e q'});
    expect(r.runs.find(x => x.type === 'tempo').enemy).toMatchObject({beats: 8, accel: 16});
    // each stage's dodge (the enemy's turn after each PLAY of that stage)
    STAGES.forEach(st => expect(r.dodges, st.who).toContain(st.dodge));
    // each stage opens with its member's words, under their name
    STAGES.forEach(st => expect(r.said.some(x => x.name === st.who), st.who).toBe(true));
    expect(await page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn')].map(b => b.textContent))).not.toContain(expect.stringMatching(/^SERENADE/));
    expect(await lines(page)).toContain('HARMONIZE to bring the band back, or play on and they power down to rest.');
    if (route === 'befriend') {
      await page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn')].find(b => b.textContent.startsWith('HARMONIZE')).click());
      await drive(page, x => x.scene === 'cutscene');
      expect(await page.evaluate(() => window.__runs.filter(x => x.harm).length)).toBe(1);
    } else {
      await drive(page, x => x.scene === 'cutscene', () => 'PLAY');
    }
    const sv = await page.evaluate(() => Arcade.Quest.save.get());
    expect(sv.done['stage:boss']).toBe(route);
    expect(sv.route.bignumber).toBe(route);
    expect(sv.flags.ep2Done).toBe(true);
    expect(sv.roster.includes('bignumber')).toBe(route === 'befriend');
    expect(!!sv.items['mic-stand']).toBe(route === 'befriend');                             // the Golden Mic Stand: befriended only
    expect((await snap(page)).cut.id).toBe(route === 'befriend' ? 'ep2-ending' : 'ep2-ending-fade');
    watch.check();
  });
}

/* ---------- BOTH ENDINGS, THE MICROPHONE, THE CLIFFHANGER, THE CREDITS, EPISODE 2 COMPLETE, KEEP EXPLORING ---------- */
const ENDING = {
  befriend: {cut: 'ep2-ending', shows: ['stage-warm', 'stage-encore'], line: '@moose The Showtime Band is BACK!', msg: 'The whole band played the E♭ Encore with you.'},
  fade: {cut: 'ep2-ending-fade', shows: ['stage-rest'], line: '@moose ...I\'ll wake them for the matinee.', msg: 'Maestro will wake them for the matinee.'},
};
for (const route of ['befriend', 'fade']) {
  test(`the ${route === 'befriend' ? 'BEST ENDING (befriended)' : 'SHORTER ENDING (played on)'}, then ep2-mic (the speech, word for word), the cliffhanger, the credits, EPISODE 2 COMPLETE, KEEP EXPLORING onto the stage`, async ({page}) => {
    test.setTimeout(90000);
    const watch = await boot(page, save('befriend'));
    await drive(page, idleIn('stage'));
    await page.evaluate(() => {                                                           // which picture each shot shows
      setInterval(() => { const c = Arcade.Quest.cutscene && Arcade.Quest.cutscene(); if (c && window.__shows[window.__shows.length - 1] !== c.id + ':' + c.show) window.__shows.push(c.id + ':' + c.show); }, 20);
    });
    await page.evaluate(() => { Arcade.Skins.markSeen('trumpet', Arcade.Skins.fresh('trumpet')); Arcade.Avatar.markSeen(Arcade.Avatar.freshItems()); });   // (only what this earns)
    expect(await page.evaluate(() => Arcade.Quest.world.fight('boss'))).toBe(true);
    await drive(page, s => s.scene === 'credits', b => (route === 'befriend' && b && b.calm >= 100 && b.hp <= 1 ? 'HARMONIZE' : 'PLAY'));
    const r = await page.evaluate(() => ({gos: window.__gos, shows: window.__shows, said: window.__said}));
    expect(r.gos).toEqual(expect.arrayContaining([`cutscene:${ENDING[route].cut}`, 'cutscene:ep2-mic', 'cutscene:ep2-cliffhanger', 'credits']));
    expect(r.gos).not.toContain(`cutscene:${ENDING[route === 'befriend' ? 'fade' : 'befriend'].cut}`);
    expect(r.gos).not.toContain('cutscene:cliffhanger');                                  // (Episode 1's)
    ENDING[route].shows.forEach(sh => expect(r.shows).toContain(`${ENDING[route].cut}:${sh}`));
    expect(r.shows).toEqual(expect.arrayContaining(['ep2-mic:stage-mic', 'ep2-mic:mic-dive', 'ep2-cliffhanger:black']));
    // THE MICROPHONE SPEAKS: DECISION 3, word for word, in order, as "The Microphone"
    const mic = r.said.filter(x => x.name === 'The Microphone').flatMap(x => x.lines);
    expect(mic).toEqual(SPEECH);
    expect(mic.join(' ')).toContain('So I\'m taking the sound back. All of it. Until it\'s quiet. Until it\'s MUSIC again.');
    const all = r.said.flatMap(x => x.lines);
    expect(all).toEqual(expect.arrayContaining(['The red light dives down its cable, into the floor.', 'KSSSSHHHHH. Every speaker in the theater crackles at once.']));
    expect(r.said.find(x => x.name === 'Madame Mezzo').lines).toEqual(['Darling... where is that cable GOING?']);
    expect(all).toContain(ENDING[route].line.replace(/^@\w+ /, ''));
    // THE CREDITS: Episode 2's roll (Created by Mr. Graham, the theater's cast, the machines, a manor cameo); SKIP
    const roll = await page.locator('#qRoll').textContent();
    ['Episode 2: The Showtime Stage', 'Created by', 'Mr. Graham', 'Maestro Moose', 'Professor Hoot', 'Tubby Tusk', 'Snapjaw Sal', 'Rico Bandit',
      'Ticket Booth Tina', 'Popcorn Pete', 'Mic-lets', 'Madame Mezzo'].forEach(t => expect(roll).toContain(t));
    expect(roll).not.toContain('Episode 1: Ghost Notes Manor');
    await page.locator('.q-skip').click();
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'complete' && window.__res);
    const res = await page.evaluate(() => ({title: window.__res.title, msg: window.__res.msg, tiles: window.__res.tiles, extra: window.__res.extra, next: window.__res.next.label, levels: window.__res.levels.label}));
    expect(res.title).toBe('Episode 2 complete!');
    expect(res.msg).toContain(ENDING[route === 'befriend' ? 'befriend' : 'fade'].msg);
    expect(res.msg).toContain('the Microphone got away');
    expect(res.msg).not.toContain('SHOWSTOPPER');                                         // (12 of 20 helped)
    expect(res.tiles.map(t => t[0])).toEqual(['Machines helped', 'Befriended', 'Powered down', 'Battles', 'Level', 'Time']);
    expect(res.tiles[0][1]).toBe('12 / 20');
    expect(res.extra).toMatch(/q-code">([0-9A-Z]{5}-){16}[0-9A-Z]{5}</);              // (85 characters: version 7)
    expect([res.next, res.levels]).toEqual(['Keep exploring', 'Title screen']);
    // the UNLOCKED! card on it: Episode 2's three items (A.Skins.announce), once
    await expect(page.locator('.sk-unlock .sk-u-equip').first()).toBeVisible();
    expect((await page.locator('.sk-unlock .sk-u-equip').evaluateAll(bs => bs.map(b => b.dataset.item))).sort()).toEqual(['bg:showtimestage', 'head:showtophat', 'plate:encore']);
    expect(await page.evaluate(() => Arcade.Avatar.freshItems().length)).toBe(0);
    // KEEP EXPLORING: back onto the Main Stage, beside the hole the cable went down
    await page.locator('.ui-results .btn, #uiResults .btn', {hasText: 'Keep exploring'}).first().click();
    await drive(page, idleIn('stage'));
    const w = await world(page);
    expect(w).toMatchObject({x: 11, y: 7, dir: 'down'});
    expect(w.ghosts).toEqual([]);
    expect(w.npcs.map(n => n.id).sort()).toEqual(['stage-hoot', 'stage-moose', 'stage-rico', 'stage-sal', 'stage-tusk']);
    await clear(page);
    await page.keyboard.press('Enter');
    await drive(page, idleIn('stage'));
    expect(await lines(page)).toEqual(['The cable runs down, under the arcade. Somewhere, a red light is listening.']);
    // the band: awake (the best ending) or resting (the shorter one); their new lines
    const rest = await page.evaluate(() => window.QUEST_MAPS.stage.npcs.filter(n => Arcade.Quest.world.cond(n.if)).map(n => [n.id, !!n.rest]));
    expect(rest.filter(([, r]) => r).map(([id]) => id).sort()).toEqual(route === 'befriend' ? [] : ['stage-hoot', 'stage-rico', 'stage-sal', 'stage-tusk']);
    await talkAt(page, 'stage', 12, 3, 'left');
    await drive(page, idleIn('stage'));
    expect((await lines(page))[0]).toBe(route === 'befriend' ? 'Bravo! BRAVO! The Showtime Band is back, thanks to you!' : '...I\'ll wake them for the matinee. They earned a good rest.');
    await talkAt(page, 'stage', 5, 5, 'down');
    await drive(page, idleIn('stage'));
    expect((await lines(page))[0]).toBe(route === 'befriend' ? 'We\'re BACK! The Showtime Band is back! Bwa-ha-ha!' : 'Zzz... bwaaa... zzz...');
    watch.check();
  });
}

/* ---------- every instrument: the fallbacks, and HARMONIZE with the whole concert E♭ scale in its written notes ---------- */
test('the snare and the bells fall back exactly as resolve() says (snare: long tone → ARTICULATE; bells: long tone → PLAY)', {tag: '@quick'}, async ({page, browser}) => {
  const want = {
    trumpet: ['longtone', 'play', 'rhythm', 'echo', 'tempo'],
    snare: ['articulate', 'articulate', 'rhythm', 'echo', 'tempo'],
    bells: ['play', 'play', 'rhythm', 'echo', 'tempo'],
  };
  for (const [member, types] of Object.entries(want)) {
    const ctx = await browser.newContext(), p = await ctx.newPage();
    const watch = await boot(p, save('befriend'), 'arcade-quest/index.html?demo&warp=stage', {member: member === 'bells' ? 'bells' : member, standIn: false});
    const got = await p.evaluate(() => window.QUEST_ENEMIES.find(e => e.id === 'bignumber').stages.map(st => Arcade.Quest.challenge.resolve(st.challenge)));
    expect(got, member).toEqual(types);
    watch.check();
    await ctx.close();
  }
});

// the written first and top notes (letter + octave: the flats are in the key signature): trumpet F, alto sax C, horn B♭, flute E♭
for (const [member, first, top] of [['trumpet', 'F4', 'F5'], ['altosax', 'C5', 'C6'], ['horn', 'B3', 'B4'], ['flute', 'E5', 'E6']]) {
  test(`HARMONIZE for real (${member}): the whole concert E♭ scale, bottom to top, in its written notes`, async ({page}) => {
    const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=stage', {member, standIn: false});
    await page.evaluate(() => {
      const b = Arcade.buildSequence; Arcade.buildSequence = o => (window.__seq = b(o));
      window.__res = null;
      Arcade.Quest.challenge.run(null, {enemy: window.QUEST_ENEMIES.find(e => e.id === 'bignumber'), harmonize: true}).then(x => { window.__res = x; });
    });
    await expect(page.locator('#qStaff svg')).toBeVisible();
    const seq = await page.evaluate(() => ({notes: window.__seq.items.map(i => i.show.letter + i.show.oct), n: window.__seq.items.length}));
    expect(seq.n).toBe(8);
    expect([seq.notes[0], seq.notes[7]]).toEqual([first, top]);
    expect(new Set(seq.notes.map(n => n[0])).size).toBe(7);                                // every letter once: a scale, in order
    await expect(page.locator('.q-chal-t')).toContainText('whole concert E♭ scale');
    await page.keyboard.down(' ');
    await page.waitForFunction(() => window.__res, null, {timeout: 45000});
    await page.keyboard.up(' ');
    expect(await page.evaluate(() => window.__res.total)).toBe(8);
    watch.check();
  });
}
test('HARMONIZE for real (snare): 8 clean, separate strokes', async ({page}) => {
  const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=stage', {member: 'snare', standIn: false});
  await page.evaluate(() => { window.__res = null; Arcade.Quest.challenge.run(null, {enemy: window.QUEST_ENEMIES.find(e => e.id === 'bignumber'), harmonize: true}).then(x => { window.__res = x; }); });
  await expect(page.locator('.q-chal-t')).toContainText('8 clean, separate strokes. Give the band its beat back!');
  watch.check();
});

/* ---------- THE BUBBLES DODGE (Tubby's stage) ---------- */
for (const reduced of [false, true]) {
  test(`the bubbles dodge${reduced ? ' with reduced motion: straight up, no wobble' : ': big slow bubbles rise from the bottom, wobbling gently'}`, {tag: '@quick'}, async ({page}) => {
    if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&test', {standIn: false});
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await page.evaluate(() => {
      const Q = Arcade.Quest, E = window.QUEST_ENEMIES.find(e => e.id === 'bignumber');
      Q.go('battle', {enemy: 'bignumber', back: 'arena'});
      setTimeout(() => { Q.dodge.start({enemy: Object.assign({}, E, E.stages[0]), easy: false, onHit: () => {}}); }, 50);
    });
    await page.waitForFunction(() => Arcade.Quest.dodge.state() && Arcade.Quest.dodge.state().bubbles.length >= 2, null, {timeout: 10000});
    const a = await page.evaluate(() => Arcade.Quest.dodge.state());
    await page.waitForTimeout(700);
    const b = await page.evaluate(() => Arcade.Quest.dodge.state());
    expect(a.kinds).toContain('bubbles');
    const same = b.bubbles.filter(x => a.bubbles.some(y => y.x0 === x.x0));
    expect(same.length).toBeGreaterThan(0);
    same.forEach(x => { const y = a.bubbles.find(z => z.x0 === x.x0); expect(x.y).toBeLessThan(y.y); });         // they rise
    if (reduced) { b.bubbles.forEach(x => { expect(x.wobble).toBe(0); expect(Math.abs(x.x - x.x0)).toBeLessThan(.01); }); }
    else { b.bubbles.forEach(x => expect(x.wobble).toBeGreaterThanOrEqual(3)); expect(b.bubbles.some(x => Math.abs(x.x - x.x0) > .2)).toBe(true); }
    expect(await page.evaluate(() => window.QUEST_ENEMIES.find(e => e.id === 'bignumber').stages[0].dodge.patterns[0].speed)).toBeLessThan(20);   // slow
    watch.check();
  });
}

/* ---------- SAVES: ep2Done and its ending route in the save code; EPISODE SELECT's ✓; the title's note gone ---------- */
const doneSave = (route, extra = {}) => save('befriend', {helped: 20, extra: Object.assign({done: {'stage:boss': route}, route: {rico: 'befriend', bignumber: route},
  flags: {ep2Done: true, 'met-bignumber': true}, roster: route === 'befriend' ? ['rico', 'bignumber'] : ['rico'], items: route === 'befriend' ? {'mic-stand': 1} : {}}, extra)});
for (const route of ['befriend', 'fade']) {
  test(`a save code carries ep2Done and the ending route (${route}); a fresh device gets the achievements, the band's place and the Mic Stand back`, {tag: '@quick'}, async ({page, browser}) => {
    const watch = await boot(page, doneSave(route), 'arcade-quest/index.html?demo&warp=stage');
    const code = await page.evaluate(() => Arcade.Quest.save.code());
    const d = await page.evaluate(c => Arcade.Backup.questDecode(c), code);
    expect(d.ok).toBe(true);
    expect(d.fields.flags).toMatchObject({ep2Done: true, 'met-bignumber': true});
    expect(d.fields.done['stage:boss']).toBe(route);                                      // (QUEST_V6.machines: 1 befriended, 2 powered down)
    const ctx = await browser.newContext(), p = await ctx.newPage();
    const watch2 = await prepare(p, {store: device('trumpet', {avatarOffered: true})});
    await p.goto('arcade-quest/index.html?demo&test');
    await p.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
    expect(await p.evaluate(c => Arcade.Quest.save.fromCode(c), code)).toEqual({ok: true});
    const r = await p.evaluate(() => { const s = Arcade.Quest.save.get(); return {route: s.route.bignumber, ep2: s.flags.ep2Done, stand: !!(s.items || {})['mic-stand'],
      ach: Arcade.store.gameData('arcade-quest').achievements, pct: s.progress && s.progress.ep2, npcs: window.QUEST_MAPS.stage.npcs.filter(n => Arcade.Quest.world.cond(n.if)).map(n => !!n.rest)}; });
    expect(r).toMatchObject({route, ep2: true, stand: route === 'befriend', pct: 100});
    expect(r.ach).toMatchObject({ep2: true, 'stage-all': true});
    expect(!!r.ach['stage-friends']).toBe(false);                                         // (this save befriended only Rico and maybe the Big Number)
    expect(r.npcs.filter(Boolean).length).toBe(route === 'fade' ? 4 : 0);
    watch.check(); watch2.check();
    await ctx.close();
  });
}

test('THE TITLE after Episode 2: no "coming soon" note; EPISODE SELECT shows "Episode 2: The Showtime Stage ✓"; the floor\'s line says 100 %', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, doneSave('befriend'), 'arcade-quest/index.html?demo');
  await page.waitForFunction(() => Arcade.Quest.sceneName === 'title');
  if (await page.locator('#qPress').count()) await page.locator('#qPress').click();
  await expect(page.locator('.q-title .q-ep')).toHaveText('Episode 2: The Showtime Stage');
  expect(await page.locator('.q-ep-soon').count()).toBe(0);
  await page.locator('#qTitleMenu .q-btn', {hasText: 'Episodes'}).click();
  const eps = await page.locator('#qTitleMenu .q-btn .q-bl').allTextContents();
  expect(eps).toEqual(['Episode 1: Ghost Notes Manor ✓', 'Episode 2: The Showtime Stage ✓', 'Back']);
  expect(await page.locator('#qTitleMenu').textContent()).not.toMatch(/coming soon/i);
  const line = await page.evaluate(() => (Arcade.ALL_GAMES || Arcade.GAMES).find(g => g.id === 'arcade-quest').summary(Arcade.store));
  expect(line).toMatch(/^Episode 2: 100% · \d+ friends?$/);
  // before the finale: no ✓ yet (the save repair sets ep2Done again from done['stage:boss']: both go)
  await page.evaluate(() => { const s = Arcade.Quest.save.get(); delete s.done['stage:boss']; delete s.flags.ep2Done; Arcade.Quest.save.write(); Arcade.Quest.go('title'); });
  await page.locator('#qTitleMenu .q-btn', {hasText: 'Episodes'}).click();
  expect((await page.locator('#qTitleMenu .q-btn .q-bl').allTextContents())[1]).toBe('Episode 2: The Showtime Stage');
  watch.check();
});

/* ---------- ACHIEVEMENTS: ep2, stage-friends, stage-all (SHOWSTOPPER) ---------- */
const statusOf = page => page.evaluate(items => ({ach: Arcade.store.gameData('arcade-quest').achievements || {}, open: items.map(([f, id]) => Arcade.Avatar.isUnlocked(f, id)),
  req: items.map(([f, id]) => Arcade.Avatar.requirement(f, id))}), ITEMS);
test('the rules: ep2 = ep2Done; stage-friends = every kind + Rico + the Big Number befriended; stage-all = all 20 helped (either way, from `done`)', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save('fade', {helped: 19}), 'arcade-quest/index.html?demo&warp=stage');
  let r = await statusOf(page);
  expect(r.open).toEqual([false, false, false, false, false, false]);
  expect(r.req).toEqual(['Finish Episode 2 of Arcade Quest', 'Finish Episode 2 of Arcade Quest', 'Finish Episode 2 of Arcade Quest',
    'Befriend every kind of machine in the Showtime Stage (Arcade Quest)', 'Help every machine in the Showtime Stage (Arcade Quest)', 'Help every machine in the Showtime Stage (Arcade Quest)']);
  r = await page.evaluate(() => {
    const Q = Arcade.Quest, s = Q.save.get(), out = [];
    s.done['loft:m4'] = 'fade'; Q.save.write(); out.push(Object.assign({}, Q.save.achievements()));                    // the 20th, powered down
    s.flags.ep2Done = true; Q.save.write(); out.push(Object.assign({}, Q.save.achievements()));
    s.roster = ['tapsy', 'spotlight', 'feedback', 'confetti', 'metrognome', 'stubs', 'ropeknot', 'miclet', 'rico']; Q.save.write(); out.push(Object.assign({}, Q.save.achievements()));
    s.roster.push('bignumber'); Q.save.write(); out.push(Object.assign({}, Q.save.achievements()));
    return out;
  });
  expect(r.map(a => [!!a['stage-all'], !!a.ep2, !!a['stage-friends']])).toEqual([[true, false, false], [true, true, false], [true, true, false], [true, true, true]]);
  expect((await statusOf(page)).open).toEqual([true, true, true, true, true, true]);
  watch.check();
});

test('THE SHOWTIME LOG (the pause menu) counts the 20 and names the rooms left from 16; the 20th machine = SHOWSTOPPER and its UNLOCKED! card, once', async ({page}) => {
  test.setTimeout(90000);
  const watch = await boot(page, save('befriend', {helped: 19, level: 40}), 'arcade-quest/index.html?demo&warp=loft');
  await drive(page, idleIn('loft'));
  await page.evaluate(() => { Arcade.Skins.markSeen('trumpet', Arcade.Skins.fresh('trumpet')); Arcade.Avatar.markSeen(Arcade.Avatar.freshItems()); });
  const log = async () => {
    await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await page.keyboard.press('m');
    await expect(page.locator('#uiPause')).toBeVisible();
    const g = await page.evaluate(() => { const g = document.querySelector('#uiPause #qGhostLog'), q = x => (g.querySelector(x) || {}).textContent || null; return {n: q('.q-glog-n'), left: q('.q-glog-left'), done: q('.q-glog-done')}; });
    await page.keyboard.press('Escape');
    await expect(page.locator('#uiPause')).toBeHidden();
    return g;
  };
  expect(await log()).toEqual({n: 'SHOWTIME LOG: 19 / 20 helped', left: 'Still glitching: the Fly Loft', done: null});
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 0, total: 4, success: false}; Arcade.Quest.world.fight('m4'); });
  await drive(page, s => s.scene === 'battle');
  const s = await drive(page, x => x.scene === 'world' && x.card, () => 'PLAY');
  expect(s.card).toBe(true);
  const card = await page.evaluate(() => ({lead: document.querySelector('.sk-catchup .sk-u-lead').textContent, items: [...document.querySelectorAll('.sk-catchup .sk-u-equip')].map(b => b.dataset.item).sort()}));
  expect(card.lead).toBe('Every machine in the theater is humming again. You\'re a true SHOWSTOPPER!');
  expect(card.items).toEqual(['plate:showstopper', 'top:showsash']);
  await page.locator('.sk-catchup [data-close]').click();
  await drive(page, idleIn('loft'));
  expect(await log()).toEqual({n: 'SHOWTIME LOG: 20 / 20 helped', left: null, done: '✓ Showstopper'});
  await page.reload();
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world');
  expect(await page.evaluate(() => Arcade.Avatar.freshItems().map(i => i.key))).toEqual([]);
  watch.check();
});

/* ---------- THE NEW AVATAR ITEMS: drawn at every size and view, theme tokens, the avatar code, sold or not ---------- */
test('every new item: drawn on the bust (chip, tile, big) and the full-body sprite (front, side, back) where it is worn; tokens exist; the avatar code round-trips; earned ones never sold', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART && Arcade.avatarCode && Arcade.AvatarFx && Arcade.AvatarBg);
  const all = ITEMS.map(([f, id]) => [f, id]).concat(STAGE_COLLECTION);
  const r = await page.evaluate(all => {
    const A = Arcade, P = window.AVATAR_PARTS, out = {};
    const css = t => getComputedStyle(document.documentElement).getPropertyValue('--' + t).trim();
    const list = {head: P.HEADS, top: P.TOPS, plate: P.PLATES, bg: P.BGS, effect: P.EFFECTS};
    const base = Object.assign(A.Avatar.get(), {bg: 'none', effect: 'none', pet: 'none', back: 'none', top: 'tee', hand: 'none', head: 'none', plate: 'none'});
    const pix = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const changed = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) n++; return n; };
    const plainBust = pix(A.Avatar.bustFrames(base)[0]), plainSp = A.Avatar.sprites('trumpet', {avatar: base});
    all.forEach(([f, id]) => {
      const part = list[f].find(x => x.id === id), av = Object.assign({}, base, {[f]: id}), o = out[f + ':' + id] = {};
      o.found = !!part;
      if (!part) return;
      o.tokens = Object.values(part.pal || {}).concat(...Object.values((part.anim || {}).pal || {})).filter(t => !css(t));
      o.sizes = ['chip', 'tile', 'big'].filter(size => !/src="data:image\/png/.test(A.avatarHTML({size, avatar: av, label: ''})));
      if (f === 'head' || f === 'top') {
        o.bust = changed(pix(A.Avatar.bustFrames(av)[0]), plainBust);
        const sp = A.Avatar.sprites('trumpet', {avatar: av});
        o.views = ['-front', '', '-back'].map(v => changed(pix(sp[v].frames[0]), pix(plainSp[v].frames[0])));
      }
      if (f === 'effect') { const st = A.AvatarFx.stillURLs(id, 'cyan', 96); o.fx = !!(st && st.back && st.back.length > 200); }
      if (f === 'bg') { const u = A.AvatarBg.stillURL(id, 128); o.bg = typeof u === 'string' && u.length > 500; }
      if (f === 'plate') { const sp = document.createElement('span'); sp.className = 'av-plate av-plate-' + id; sp.textContent = 'Encore'; document.body.appendChild(sp);
        const cs = getComputedStyle(sp); o.plate = cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; sp.remove(); }
      const T = A.avatarCode.TABLE.find(t => t[0] === f)[2];
      o.inTable = T.includes(id);
      const back = A.avatarCode.decode(A.avatarCode.encode(av));
      o.code = (back.avatar || back)[f] === id;
      o.unlock = part.unlock;
      o.sold = A.Tokens.catalog().some(it => it.key === f + ':' + id);
    });
    return out;
  }, all);
  for (const [f, id, ach] of ITEMS) {
    const o = r[f + ':' + id];
    expect(o, `${f}:${id}`).toMatchObject({found: true, tokens: [], sizes: [], inTable: true, code: true, sold: false});
    expect(o.unlock).toMatchObject({game: 'arcade-quest', achievement: ach});
    if (o.views) { expect(o.bust, `${id} bust`).toBeGreaterThan(20); o.views.forEach((n, i) => expect(n, `${id} view ${i}`).toBeGreaterThan(3)); }
  }
  for (const [f, id] of STAGE_COLLECTION) {
    const o = r[f + ':' + id];
    expect(o, `${f}:${id}`).toMatchObject({found: true, tokens: [], sizes: [], inTable: true, code: true, sold: true});
    expect(o.unlock).toMatchObject({booth: 'stage'});
    expect(o.unlock.shop).toBeGreaterThanOrEqual(50);
    expect(o.bust, `${id} bust`).toBeGreaterThan(10); o.views.forEach((n, i) => expect(n, `${id} view ${i}`).toBeGreaterThan(3));
  }
  expect(r['effect:spotlight'].fx).toBe(true);
  expect(r['bg:showtimestage'].bg).toBe(true);
  expect([r['plate:encore'].plate, r['plate:showstopper'].plate]).toEqual([true, true]);
  // the save code carries the Stage Collection (QUEST_V6.cosmetics, at its end)
  expect(await page.evaluate(() => Arcade.Backup.QUEST_V6.cosmetics.slice(-3))).toEqual(['top:bowtie', 'head:bulbband', 'head:usher']);
  watch.check();
});

test('THE STAGE COLLECTION: only at Ticket Booth Tina (tagged, priced, bought once); Terry\'s booth doesn\'t show it; the Prize Counter keeps it behind glass', async ({page}) => {
  test.setTimeout(60000);
  const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=lobby');
  await drive(page, idleIn('lobby'));
  const r = await page.evaluate(() => {
    const T = Arcade.Tokens, keys = ['top:bowtie', 'head:bulbband', 'head:usher'];
    return {cat: T.catalog().filter(it => keys.includes(it.key)).map(it => [it.key, it.collection, it.questOnly]),
      prize: keys.map(k => T.canBuy(k).why), terry: keys.map(k => T.canBuy(k, {counter: 'quest'}).why), tina: keys.map(k => T.canBuy(k, {counter: 'stage'}).ok),
      text: T.canBuy('head:usher').text, weekly: T.weekly && T.weekly() && keys.includes(T.weekly().key)};
  });
  expect(r.cat.map(x => x[1])).toEqual(['stage', 'stage', 'stage']);
  expect(r.prize).toEqual(['questOnly', 'questOnly', 'questOnly']);
  expect(r.text).toBe('Only at Ticket Booth Tina in Arcade Quest!');
  expect(r.terry).toEqual(['stageOnly', 'stageOnly', 'stageOnly']);
  expect(r.tina).toEqual([true, true, true]);
  expect(r.weekly).toBe(false);
  // Tina: PLAYER ITEMS, the Stage Collection first, tagged; buy the usher's cap; OWNED after
  await talkAt(page, 'lobby', 3, 4, 'up');
  for (let i = 0; i < 20 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  await expect(page.locator('.q-cosshop')).toBeVisible();
  const tags = await page.locator('.q-cosshop .q-btn .q-stagecol').count();
  expect(tags).toBe(3);
  // first (after a running season's own shelf, which always leads)
  const first3 = await page.evaluate(() => [...document.querySelectorAll('.q-cosshop .q-btn')].filter(b => !b.querySelector('.q-season')).slice(0, 3).map(b => b.querySelector('.q-stagecol') ? 'stage' : 'other'));
  expect(first3).toEqual(['stage', 'stage', 'stage']);
  const before = await page.evaluate(() => Arcade.Tokens.balance());
  await page.locator('.q-cosshop .q-btn', {hasText: 'Usher\'s cap'}).click();
  expect(await page.evaluate(() => [Arcade.Tokens.owned('head:usher'), Arcade.Avatar.get().head])).toEqual([true, 'usher']);
  expect(before - await page.evaluate(() => Arcade.Tokens.balance())).toBe(200);
  await expect(page.locator('.q-cosshop .q-btn', {hasText: 'Usher\'s cap'})).toContainText('OWNED');
  await page.locator('.q-cosshop .q-btn', {hasText: 'Usher\'s cap'}).click();                  // owned once: nothing more is spent
  expect(before - await page.evaluate(() => Arcade.Tokens.balance())).toBe(200);
  watch.check();
});

test('Token Booth Terry (the manor) never shows the Stage Collection', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save('befriend'), 'arcade-quest/index.html?demo&warp=foyer');
  await drive(page, idleIn('foyer'));
  const booth = await page.evaluate(() => window.QUEST_MAPS.foyer.things.find(t => t.use === 'booth').at);
  await talkAt(page, 'foyer', booth[0], booth[1] + 1, 'up');
  for (let i = 0; i < 20 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  await expect(page.locator('.q-cosshop')).toBeVisible();
  expect(await page.locator('.q-cosshop .q-stagecol').count()).toBe(0);
  expect(await page.locator('.q-cosshop .q-btn', {hasText: 'Usher\'s cap'}).count()).toBe(0);
  expect(await page.locator('.q-cosshop .q-manor').count()).toBeGreaterThan(0);           // (the Manor Collection: still here)
  watch.check();
});

test('the Prize Counter: the Stage Collection on its own glass shelf, try-on only', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Prizes && Arcade.Tokens);
  await page.evaluate(() => Arcade.Prizes.open());
  await expect(page.locator('.pz-s-stage')).toBeVisible();
  const keys = await page.locator('.pz-s-stage .pz-prize').evaluateAll(bs => bs.map(b => b.dataset.key).sort());
  expect(keys).toEqual(['head:bulbband', 'head:usher', 'top:bowtie']);
  await expect(page.locator('.pz-s-stage .pz-shead')).toContainText('Only at Ticket Booth Tina in Arcade Quest!');
  watch.check();
});

/* ---------- THE FLASH RULE, MEASURED (Showtime Malfunction's frame-by-frame technique: tests/showtime-terror.spec.js):
   the page drawn on the TEST CLOCK, a screenshot every 50 ms, the screen as a 16 × 10 grid of cells; a cell "swings" when
   its relative luminance changes by ≥ 0.1 after turning the other way. No cell may swing 3 times within one second.
   Chromium only (WebKit on CI draws on the CPU: far too slow for ~60 screenshots). ---------- */
async function grid(page) {
  const png = await page.screenshot();
  return page.evaluate(async b64 => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = document.createElement('canvas');
    const CW = 16, CH = 10; c.width = CW * 8; c.height = CH * 8;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data, f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const cells = new Array(CW * CH).fill(0);
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const i = (py * c.width + px) * 4;
      cells[Math.floor(py / 8) * CW + Math.floor(px / 8)] += (.2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2])) / 64;
    }
    return cells;
  }, png.toString('base64'));
}
const gdiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
async function measure(page, start, totalMs, stepMs = 50) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate(`(${start})()`);
  await page.clock.runFor(200);
  const frames = [];
  for (let t = 0; t <= totalMs; t += stepMs) {
    let cells = await grid(page), prev = frames.length ? frames[frames.length - 1][1] : null;
    for (let k = 0; prev && k < 4 && gdiff(cells, prev) >= .05; k++) { const again = await grid(page); if (gdiff(again, cells) < .02) break; cells = again; }
    frames.push([t, cells]);
    await page.clock.runFor(stepMs);
  }
  let worst = 0, where = null;
  for (let c = 0; c < frames[0][1].length; c++) {
    let ext = frames[0][1][c], dir = 0; const swings = [];
    for (const [t, cells] of frames) {
      const L = cells[c];
      if (dir >= 0 && L > ext && dir !== 0) ext = L;
      if (dir <= 0 && L < ext && dir !== 0) ext = L;
      if (dir !== 1 && L - ext >= .1) { swings.push(t); dir = 1; ext = L; }
      else if (dir !== -1 && ext - L >= .1) { swings.push(t); dir = -1; ext = L; }
      else if (dir === 0) ext = L;
    }
    for (let i = 0; i + 2 < swings.length; i++) if (swings[i + 2] - swings[i] <= 1000) { worst = 3; where = {cell: c, swings}; }
    worst = Math.max(worst, Math.min(2, swings.length));
  }
  return {frames: frames.length, worst, where};
}
for (const [name, start, ms] of [
  ['the Main Stage: the footlights, the glitching spots, the stage mic\'s red light', `() => Arcade.Quest.go('world', {map: 'stage', x: 11, y: 6, dir: 'down'})`, 3000],
  ['THE BIG NUMBER\'s band row: the lit member and the others\' gentle flicker', `() => Arcade.Quest.go('battle', {enemy: 'bignumber', back: 'arena'})`, 3000],
  // (each picture on its own, held: a test cutscene with one waiting shot)
  ['the ending: the stage lights warming up one by one', `() => { window.QUEST_CUTSCENES.t = {music: null, shots: [{show: 'stage-warm', wait: 9000}]}; Arcade.Quest.go('cutscene', {id: 't'}); }`, 4500],
  ['the Microphone: its red light glowing', `() => { window.QUEST_CUTSCENES.t = {music: null, shots: [{show: 'stage-mic', wait: 9000}]}; Arcade.Quest.go('cutscene', {id: 't'}); }`, 2500],
  ['the Microphone: its red light diving down the cable, the speakers crackling', `() => { window.QUEST_CUTSCENES.t = {music: null, shots: [{show: 'mic-dive', wait: 9000}]}; Arcade.Quest.go('cutscene', {id: 't'}); }`, 3000],
]) {
  test(`the flash rule, measured: ${name}`, async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'the frame-by-frame measurement runs in Chromium');
    test.setTimeout(90000);
    await page.setViewportSize({width: 640, height: 400});
    await page.clock.install();
    const watch = await boot(page, save('befriend'));
    await drive(page, idleIn('stage'));
    const r = await measure(page, start, ms);
    expect(r.frames).toBeGreaterThan(40);
    expect(r.worst, `a cell swung 3 times within a second: ${JSON.stringify(r.where)}`).toBeLessThanOrEqual(2);
    watch.check();
  });
}
test('the flash rule\'s numbers: the band row flickers well under 3 times a second; the footlights change once a second; the stage mic never blinks', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save('befriend'));
  const r = await page.evaluate(() => ({f: Arcade.Quest.bandLit.FLICKER, foot: window.QUEST_ART.SPRITES['tile-st-footlights'].fps, mic: window.QUEST_ART.SPRITES['stage-mic'].frames.length,
    glitch: window.QUEST_ART.SPRITES['stage-glitch'].fps, warm: Arcade.Quest.storyStage}));
  expect(r.f.hz).toBeLessThan(3);
  expect(r.f.hi - r.f.lo).toBeLessThan(.25);
  expect(r.foot).toBeLessThanOrEqual(1);
  expect(r.mic).toBe(1);
  expect(r.glitch).toBeLessThanOrEqual(2);
  expect(r.warm.warmS).toBeGreaterThanOrEqual(1);                                        // each light fades in over a second
  watch.check();
});

test('every new line fits the text box (≤ 80 characters, the speaker\'s @name aside), every new sprite uses theme tokens, every new sign and NPC talks', {tag: '@quick'}, async ({page}) => {
  const watch = await boot(page, save('befriend'));
  const r = await page.evaluate(() => {
    const long = [], walk = (v, at) => { if (typeof v === 'string') { const t = v.replace(/^@\w+ /, ''); if (t.length > 80) long.push(`${at}: ${t}`); } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, at + '.' + k)); };
    ['bignumber', 'stage-tusk', 'stage-hoot', 'stage-sal', 'stage-rico', 'stage-moose', 'tusk', 'sal', 'hoot', 'rico', 'tina', 'pete'].forEach(id => walk(window.QUEST_DIALOGUE[id].talk, id));
    ['ep2-ending', 'ep2-ending-fade', 'ep2-mic', 'ep2-cliffhanger'].forEach(id => walk(window.QUEST_CUTSCENES[id], id));
    ['moose-note', 'stage-mic', 'stage-cable', 'stage-podium', 'stage-backdrop', 'stage-footlights'].forEach(k => walk(window.QUEST_SIGNS[k], k));
    const E = window.QUEST_ENEMIES.find(e => e.id === 'bignumber'); walk(E.lines, 'lines'); walk(E.stages.map(s => s.say), 'stages'); walk(E.finale, 'finale'); walk(E.listen, 'listen');
    ['finaleChoiceEp2', 'cutoffDoneTusk', 'showstopper'].forEach(k => walk(window.QUEST_TEXT[k], k));
    const S = window.QUEST_ART.SPRITES, missing = [];
    ['tile-st-backdrop', 'tile-st-podium', 'tile-st-footlights', 'stage-glitch', 'stage-spot', 'stage-mic', 'stage-hole', 'moose-note', 'tuba-bubble', 'flurry-shot', 'stick-shot'].forEach(id =>
      Object.values(S[id].palette).forEach(t => { if (!getComputedStyle(document.documentElement).getPropertyValue('--' + t).trim()) missing.push(`${id}: ${t}`); }));
    const signs = window.QUEST_MAPS.stage.things.concat(window.QUEST_MAPS.lobby.things).filter(t => t.say).map(t => t.say).filter(k => !window.QUEST_SIGNS[k]);
    const npcs = window.QUEST_MAPS.stage.npcs.map(n => n.id).filter(id => !window.QUEST_DIALOGUE[id]);
    return {long, missing, signs, npcs, big: S.bignumber.members.map(m => [m.sprite, m.ok].every(id => !!S[id]))};
  });
  expect(r.long).toEqual([]);
  expect(r.missing).toEqual([]);
  expect(r.signs).toEqual([]);
  expect(r.npcs).toEqual([]);
  expect(r.big).toEqual([true, true, true, true, true]);
  watch.check();
});
