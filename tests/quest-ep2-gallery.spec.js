/* ARCADE QUEST, EPISODE 2: THE REVIEW PACK for Mr. Graham (build step 6 of docs/games/arcade-quest-ep2-plan.md). Only with
     GALLERY=1 npx playwright test quest-ep2-gallery quest-ep2.spec -g GALLERY --project=chromium
   It saves into docs/gallery/aq-ep2/ (committed): every Episode 2 room at iPad landscape before anything is helped
   (room-<id>.png) and the Main Stage after the ending (room-stage-after.png); one frame of each cutscene
   (cut-<id>.png); Episode 2's avatar items worn together (avatar-items.png); EPISODE 2 COMPLETE on both routes
   (complete-befriend.png, complete-fade.png). The sprite sheet (sprites.png): tests/quest-ep2.spec.js's GALLERY test. */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT} = require('./helpers');

test.skip(!process.env.GALLERY, 'only with GALLERY=1');
const OUT = path.join(ROOT, 'docs/gallery/aq-ep2');
const IPAD = {width: 1180, height: 820};
const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const MACHINES = ['pit:m1', 'pit:m2', 'pit:m3', 'workshop:m1', 'workshop:m2', 'workshop:m3', 'workshop:m4', 'backstage:m1', 'backstage:m2', 'backstage:m3',
  'backstage:m4', 'dressing:m1', 'dressing:m2', 'dressing:m3', 'loft:m1', 'loft:m2', 'loft:m3', 'loft:m4', 'balcony:m1', 'balcony:m2'];

/** a save just inside Episode 2 (nothing helped yet), or after THE BIG NUMBER on a route */
function save(route = null) {
  const s = {v: 6, level: route ? 14 : 8, xp: 0, hp: 60, maxHp: 60, tokens: 300, items: {}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {}, ep: 2, play: {1: 2200, 2: route ? 2900 : 0},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true, balconyGlimpse: true}, done: {}};
  if (route) {
    MACHINES.forEach(k => { s.done[k] = route; });
    Object.assign(s.done, {'dressing:boss': route, 'stage:boss': route});
    Object.assign(s.flags, {tuskAwake: true, salAwake: true, hootAwake: true, songEb: true, ricoDone: true, [route === 'fade' ? 'ricoVent' : 'ricoDoor']: true, ep2Done: true});
    if (route === 'befriend') s.roster = ['spotlight', 'feedback', 'metrognome', 'tapsy', 'ropeknot', 'confetti', 'stubs', 'miclet', 'rico', 'bignumber'];
    s.battles = {won: 22, befriended: route === 'befriend' ? 22 : 0, faded: route === 'fade' ? 22 : 0};
  }
  return s;
}
async function boot(page, s, url = 'arcade-quest/index.html?demo&warp=lobby') {
  await page.setViewportSize(IPAD);
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
  return watch;
}
/** stand in a room (at the door you'd come in by), the text box away, everything settled */
async function stand(page, id, at) {
  await page.evaluate(([m, at]) => {
    const M = window.QUEST_MAPS, d = [].concat(...Object.values(M).map(x => (x.doors || []).filter(y => y.to === m)))[0];
    const [x, y] = at || (d ? d.spawn : M[m].start || [2, 2]);
    Arcade.Quest.go('world', {map: m, x, y, dir: 'up'});
  }, [id, at]);
  await page.waitForFunction(m => { const w = Arcade.Quest.world.state(); return w && w.map === m && !w.busy; }, id);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const t = document.getElementById('qText'); if (t) t.hidden = true; });
}

test('GALLERY=1: every Episode 2 room at iPad landscape, before anything is helped; the Main Stage after the ending', async ({page}) => {
  test.setTimeout(120_000);
  const watch = await boot(page, save());
  const rooms = await page.evaluate(() => Object.keys(window.QUEST_MAPS).filter(id => window.QUEST_MAPS[id].ep === 2));
  expect(rooms.length).toBe(10);
  for (const id of rooms) {
    await stand(page, id);
    await page.locator('#screen').screenshot({path: path.join(OUT, `room-${id}.png`)});
  }
  // after THE BIG NUMBER (the best ending): the band awake on stage, Moose at his podium, the hole and its cable
  await page.evaluate(s => { Arcade.store.gameData('arcade-quest').save = s; }, save('befriend'));
  await stand(page, 'stage', [11, 7]);
  await page.locator('#screen').screenshot({path: path.join(OUT, 'room-stage-after.png')});
  watch.check();
});

test('GALLERY=1: one frame of each Episode 2 cutscene', async ({page}) => {
  test.setTimeout(120_000);
  const watch = await boot(page, save());
  // each picture held a moment (its lights warmed up, its text on screen); the cliffhanger: Mezzo's line
  for (const [id, show, line] of [['ep2-intro', 'marquee', null], ['ep2-ending', 'stage-encore', null], ['ep2-ending-fade', 'stage-rest', null],
    ['ep2-mic', 'stage-mic', 'I was THEIR microphone'], ['ep2-cliffhanger', 'black', 'cable GOING']]) {
    await page.evaluate(id => Arcade.Quest.go('cutscene', {id, next: {scene: 'arena'}}), id);
    for (let i = 0; i < 80; i++) {
      const c = await page.evaluate(() => { const c = Arcade.Quest.cutscene && Arcade.Quest.cutscene(), t = document.querySelector('#qText .q-tline'); return {show: c && c.show, text: t ? t.textContent : ''}; });
      if (c.show === show && (!line || c.text.includes(line))) break;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(2500);
    await page.locator('#screen').screenshot({path: path.join(OUT, `cut-${id}.png`)});
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'lobby', x: 21, y: 5, dir: 'up'}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world');
  }
  watch.check();
});

test('GALLERY=1: Episode 2\'s avatar items, worn together on an avatar (the rewards; the Stage Collection)', async ({page}) => {
  const watch = await boot(page, save());
  await page.evaluate(() => {
    const A = Arcade, base = A.Avatar.get(), sheet = document.createElement('div');
    sheet.id = 'aqItems';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1d1830;color:#fbf8ff;font:14px monospace;padding:16px;display:flex;gap:28px;align-items:flex-start';
    [['The rewards (ep2, stage-friends, stage-all)', {bg: 'showtimestage', head: 'showtophat', top: 'showsash', effect: 'spotlight', plate: 'showstopper'}],
      ['The Encore name plate', {bg: 'showtimestage', head: 'showtophat', top: 'tee', effect: 'none', plate: 'encore'}],
      ['The Stage Collection (Ticket Booth Tina)', {bg: 'showtimestage', head: 'usher', top: 'bowtie', effect: 'none', plate: 'none'}],
      ['The Marquee-bulb headband', {bg: 'none', head: 'bulbband', top: 'bowtie', effect: 'none', plate: 'none'}]].forEach(([name, items]) => {
      const av = Object.assign({}, base, {pet: 'none', back: 'none', hand: 'none'}, items), box = document.createElement('figure');
      box.style.cssText = 'margin:0;text-align:center;width:250px';
      box.innerHTML = `<div style="display:flex;justify-content:center">${A.avatarHTML({size: 'big', avatar: av, label: ''})}</div>` +
        (av.plate !== 'none' ? `<span class="av-plate av-plate-${av.plate}" style="display:inline-block;margin-top:8px">${A.Avatar.nameOf(av)}</span>` : '');
      const sp = A.Avatar.sprites('trumpet', {avatar: av}), row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:8px';
      ['-front', '', '-back'].forEach(v => { const c = document.createElement('canvas'), fr = sp[v].frames[0]; c.width = fr.width * 3; c.height = fr.height * 3; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(fr, 0, 0, c.width, c.height); row.appendChild(c); });
      box.appendChild(row);
      const cap = document.createElement('figcaption'); cap.style.marginTop = '8px'; cap.textContent = name; box.appendChild(cap);
      sheet.appendChild(box);
    });
    document.body.appendChild(sheet);
  });
  await page.waitForTimeout(500);
  await page.locator('#aqItems').screenshot({path: path.join(OUT, 'avatar-items.png')});
  watch.check();
});

for (const route of ['befriend', 'fade']) {
  test(`GALLERY=1: EPISODE 2 COMPLETE, the ${route === 'befriend' ? 'best ending (befriended)' : 'shorter ending (powered down)'}`, async ({page}) => {
    const watch = await boot(page, save(route), 'arcade-quest/index.html?demo&warp=stage');
    await page.evaluate(() => { Arcade.Skins.markSeen('trumpet', Arcade.Skins.fresh('trumpet')); Arcade.Avatar.markSeen(Arcade.Avatar.freshItems()); Arcade.Quest.go('complete', {ep: 2}); });
    await expect(page.locator('#results')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.screenshot({path: path.join(OUT, `complete-${route}.png`)});
    watch.check();
  });
}
