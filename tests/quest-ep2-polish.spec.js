/* ARCADE QUEST, EPISODE 2, build step 6 (docs/games/arcade-quest-ep2-plan.md): THE MUSIC. Every Episode 2 slot in one
   table (arcade-quest/data/music.js QUEST_EP2_MUSIC) that agrees with Mr. Graham's recording checklist
   (shared/sounds/README.md, "Arcade Quest — Episode 2 music": its Uploaded column against the files in shared/sounds/),
   with shared/sounds.js and with what the game really asks the music manager for (each slot, then its fallbacks); the
   Microphone's speech has no music; the Sound Board's "Arcade Quest — Episode 2" section (Rooms · Battles · Story ·
   Effects, each row's fallback, found by its room's name). THE LOOK AND MOTION PASS: every Episode 2 line fits its text box
   at phone, iPad and Chromebook sizes; every room, its HUD, Ticket Booth Tina, the Showtime Log and EPISODE 2 COMPLETE
   fit those sizes; reduced motion and the arcade's Motion switch keep every cutscene, dodge and room animation still;
   the flash rule measured on the intro's marquee, the Balcony's glimpse and the Fly Loft's Microphone; the Main Stage
   and the Fly Loft at 4× CPU throttle (PERF=1: the perf job). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT, tooWide, windowFits} = require('./helpers');

/** QUEST_EP2_MUSIC + QUEST_ROOM_MUSIC + the maps, read straight from the files (classic scripts: a window of our own) */
function data() {
  const win = {};
  win.window = win;
  for (const f of ['arcade-quest/data/maps/manor.js', 'arcade-quest/data/maps/stage.js', 'arcade-quest/data/music.js'])
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), win);
  return win;
}
/** the README's Episode 2 tables: one {n, desc, len, fallback, uploaded, group} a row */
function readme() {
  const t = fs.readFileSync(path.join(ROOT, 'shared/sounds/README.md'), 'utf8').split('## Arcade Quest — Episode 2 music')[1].split(/\n## /)[0];
  const rows = [];
  let group = null;
  for (const line of t.split('\n')) {
    const g = line.match(/^\*\*(Rooms|Battles|Story|Effects)\*\*$/);
    if (g) { group = g[1].toLowerCase(); continue; }
    const m = line.match(/^\| `([a-z0-9-]+)` \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/);
    if (m) rows.push({n: m[1], desc: m[2], len: m[3], fallback: (m[4].match(/`([a-z0-9-]+)`/g) || []).map(x => x.slice(1, -1)), uploaded: m[5], group});
  }
  return rows;
}
const uploaded = n => fs.readdirSync(path.join(ROOT, 'shared/sounds')).some(f => f.replace(/\.[a-z0-9]+$/, '') === n);

test.describe('Episode 2 music: one table', () => {
  test('QUEST_EP2_MUSIC: every room slot, battle, story track and effect, each with its description, length and fallback', {tag: '@quick'}, () => {
    const w = data(), M = w.QUEST_EP2_MUSIC;
    const rooms = Object.keys(w.QUEST_MAPS).filter(id => w.QUEST_MAPS[id].ep === 2);
    // every Episode 2 room has its row, in the room order, and its row names that room
    expect(M.filter(m => m.group === 'rooms').map(m => m.room)).toEqual(rooms);
    rooms.forEach(id => expect(M.find(m => m.room === id).n).toBe(w.QUEST_ROOM_MUSIC[id] || 'quest-room-' + id));
    expect(M.find(m => m.room === 'vent')).toMatchObject({n: 'quest-room-vent', fallback: ['quest-room-loft', 'quest-manor']});
    expect(M.filter(m => m.group === 'battles').map(m => [m.n, m.fallback])).toEqual([['quest-ep2-battle', ['quest-battle']],
      ['quest-ep2-miniboss', ['quest-miniboss']], ['quest-ep2-boss', ['quest-boss']]]);
    expect(M.find(m => m.n === 'quest-encore').desc).toMatch(/E♭ major/);
    expect(new Set(M.map(m => m.n)).size).toBe(M.length);
    M.forEach(m => {
      expect(['rooms', 'battles', 'story', 'effects']).toContain(m.group);
      expect(m.desc.length, m.n).toBeGreaterThan(30);
      expect(m.len, m.n).toBeTruthy();
      // music always has somewhere to fall back to (an effect: its built-in sound)
      if (m.group !== 'effects') expect(m.fallback && m.fallback.length, m.n).toBeGreaterThan(0);
    });
    // (the Microphone's speech: silence + the crackle, so it isn't a music slot of its own)
    expect(M.some(m => /mic-speech|quest-ep2-mic$/.test(m.n))).toBe(false);
  });

  test('shared/sounds/README.md\'s checklist agrees with it, and its Uploaded column with shared/sounds/', {tag: '@quick'}, () => {
    const M = data().QUEST_EP2_MUSIC, R = readme();
    expect(R.map(r => r.n)).toEqual(M.map(m => m.n));
    R.forEach((r, i) => {
      const m = M[i];
      expect([r.group, r.desc, r.len], m.n).toEqual([m.group, m.desc, m.len]);
      expect(r.fallback, m.n).toEqual(m.fallback || []);
      expect(r.uploaded, m.n).toBe(uploaded(m.n) ? '✓ uploaded' : 'missing');
    });
    // every slot is a sound shared/sounds.js knows (the Sound Board's rows, the music manager's events)
    const src = fs.readFileSync(path.join(ROOT, 'shared/sounds.js'), 'utf8');
    M.forEach(m => expect(src, m.n).toContain(`'${m.n}'`));
  });
});

/* ---------- in the game: what the music manager is really asked for ---------- */
const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
function save(extra = {}) {
  const s = {v: 6, level: 30, xp: 0, hp: 150, maxHp: 150, tokens: 0, items: {}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true, songEb: true,
      tuskAwake: true, 'met-tusk': true, salAwake: true, 'met-sal': true, hootAwake: true, 'met-rico': true, ricoDone: true, ricoVent: true}, done: {}, ep: 2};
  return Object.assign(s, extra);
}
async function boot(page, url, s = save()) {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName);
  return watch;
}
const want = page => page.evaluate(() => Arcade.Sfx.musicState().music.want);

test.describe('Episode 2 music in the game', () => {
  test('every room asks for its own slot, then its fallbacks (the Vent: its own, the Loft\'s, then quest-manor)', async ({page}) => {
    const watch = await boot(page, 'arcade-quest/index.html?demo&warp=vent');
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    await expect.poll(() => want(page)).toBe('quest-room-vent|quest-room-loft|quest-manor');
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest;
      return {
        // each Episode 2 enemy's battle music: the machines quest-ep2-battle → quest-battle, the two bosses their own
        battles: Object.fromEntries((window.QUEST_ENEMIES || []).filter(e => e.ep === 2).map(e => [e.id, [].concat(Q.battleMusic(e)).join('|')])),
        ep1: [].concat(Q.battleMusic((window.QUEST_ENEMIES || []).find(e => !e.ep && !e.boss))).join('|'),
        // every cutscene list = its slot's row in the table
        cuts: Object.fromEntries(Object.entries(window.QUEST_CUTSCENES || {}).filter(([id]) => /^ep2-/.test(id)).map(([id, c]) => [id, c.music])),
        track: ['quest-ep2-intro', 'quest-encore', 'quest-ep2-cliffhanger'].map(n => Q.track(n)),
      };
    });
    Object.entries(r.battles).forEach(([id, m]) => expect(['quest-ep2-battle|quest-battle', 'quest-ep2-miniboss|quest-miniboss', 'quest-ep2-boss|quest-boss'], id).toContain(m));
    expect(r.battles.rico).toBe('quest-ep2-miniboss|quest-miniboss');
    expect(r.battles.bignumber).toBe('quest-ep2-boss|quest-boss');
    expect(r.ep1).toBe('quest-battle');                                       // (Episode 1 is untouched)
    expect(r.cuts['ep2-intro']).toEqual(r.track[0]);
    expect(r.cuts['ep2-ending']).toEqual(r.track[1]);
    expect(r.cuts['ep2-ending-fade']).toEqual(r.track[1]);
    expect(r.cuts['ep2-cliffhanger']).toEqual(r.track[2]);
    expect(r.cuts['ep2-mic'], 'the Microphone speaks over silence').toBeNull();
    watch.check();
  });

  test('a room preloads the rooms behind its doors and its battles\' music', async ({page}) => {
    const watch = await boot(page, 'arcade-quest/index.html?demo&warp=backstage');
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    const pre = await page.evaluate(async () => {
      const got = []; const p = Arcade.Sfx.preloadMusic; Arcade.Sfx.preloadMusic = l => { got.push(...[].concat(l)); return p(l); };
      const Q = Arcade.Quest; Q.save.get().world = {map: 'backstage', x: 2, y: 2, dir: 'down'}; Q.go('world', {continue: true});
      await new Promise(r => setTimeout(r, 200));
      return got;
    });
    const doors = await page.evaluate(() => window.QUEST_MAPS.backstage.doors.map(d => d.to));
    for (const to of doors) expect(pre, to).toContain((await page.evaluate(id => (window.QUEST_ROOM_MUSIC || {})[id] || 'quest-room-' + id, to)));
    expect(pre).toEqual(expect.arrayContaining(['quest-ep2-battle', 'quest-battle']));
    watch.check();
  });

  test('the title (Episode 2 open), the credits and EPISODE 2 COMPLETE ask for their slots, then Episode 1\'s', async ({page}) => {
    const watch = await boot(page, 'arcade-quest/index.html?demo');
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'title');
    await expect.poll(() => want(page)).toBe('quest-ep2-title|quest-title');
    const r = await page.evaluate(() => ['quest-ep2-credits', 'quest-ep2-complete'].map(n => [].concat(Arcade.Quest.track(n)).join('|')));
    expect(r).toEqual(['quest-ep2-credits|quest-credits', 'quest-ep2-complete|quest-victory']);
    const src = fs.readFileSync(path.join(ROOT, 'arcade-quest/engine/story.js'), 'utf8');
    expect(src).toContain("Q.track('quest-ep2-credits')");
    expect(src).toContain("Q.track('quest-ep2-complete')");
    watch.check();
  });
});

/* ---------- THE SOUND BOARD ---------- */
test.describe('the Sound Board: Arcade Quest — Episode 2', () => {
  test('Rooms · Battles · Story · Effects, every slot of the table, each row with Play/Stop (effects: Play) and its fallback', async ({page}) => {
    test.setTimeout(75000);
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('sound-board/index.html');
    await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard);
    const M = data().QUEST_EP2_MUSIC;
    const sec = page.locator('.sb-sec[data-sec="rooms2"]');
    await expect(sec.locator('h2')).toHaveText('Arcade Quest — Episode 2');
    await sec.locator('summary').click();
    await expect(sec.locator('.sb-sub')).toHaveText(['Rooms', 'Battles', 'Story', 'Effects']);
    const got = await page.evaluate(() => Object.fromEntries(['rooms2', 'ep2battles', 'ep2story', 'ep2effects'].map(id =>
      [id, [...document.querySelectorAll(`#${id} .sb-row`)].map(r => ({n: r.dataset.n, fb: r.dataset.fallback || '', btns: [...r.querySelectorAll('button')].map(b => b.textContent)}))])));
    const want = {rooms2: 'rooms', ep2battles: 'battles', ep2story: 'story', ep2effects: 'effects'};
    for (const [id, g] of Object.entries(want)) {
      expect(got[id].map(r => r.n), id).toEqual(M.filter(m => m.group === g).map(m => m.n));
      got[id].forEach(r => {
        const m = M.find(x => x.n === r.n);
        expect(r.btns, r.n).toEqual(g === 'effects' ? ['Play'] : ['Play', 'Stop']);
        if (g !== 'effects') expect(r.fb, r.n).toBe(m.fallback[0]);
      });
    }
    // the status line names the whole fallback list (once checked)
    // (RELOAD ALL SOUNDS checks every file, four at a time, when the page opens: on a busy machine that takes a while)
    await expect.poll(() => page.locator('#rooms2 .sb-row[data-n="quest-room-vent"] [data-mstatus]').textContent(), {timeout: 45000})
      .toMatch(/missing — plays quest-room-loft, then quest-manor|✓ uploaded/);
    watch.check();
  });

  test('the search finds an Episode 2 room by its name ("pit", "loft") and a battle or effect by its slot', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('sound-board/index.html');
    await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard);
    const shown = () => page.evaluate(() => [...document.querySelectorAll('[data-sec="rooms2"] .sb-row')].filter(r => !r.hidden && r.offsetParent).map(r => r.dataset.n));
    await page.locator('#search').fill('pit');
    await expect.poll(shown).toContain('quest-room-pit');
    await page.locator('#search').fill('loft');
    await expect.poll(shown).toEqual(expect.arrayContaining(['quest-room-loft', 'quest-room-vent']));     // (the Vent falls back to the Loft's)
    await page.locator('#search').fill('fly loft');
    await expect.poll(shown).toEqual(['quest-room-loft']);
    await page.locator('#search').fill('mic-crackle');
    await expect.poll(shown).toEqual(['quest-mic-crackle']);
    await page.locator('#search').fill('ep2-battle');
    await expect.poll(shown).toEqual(['quest-ep2-battle']);
    watch.check();
  });
});

/* ---------- THE LOOK AND MOTION PASS ---------- */
const SIZES = [['phone', {width: 390, height: 844}, true], ['iPad', {width: 1180, height: 820}, true], ['Chromebook', {width: 1366, height: 768}, false]];
/** everything open: every room reachable, the finale not yet played */
const open = (extra = {}) => save(Object.assign({level: 30, tokens: 2000, route: {rico: 'befriend'}, done: {'dressing:boss': 'befriend'}, roster: ['rico']}, extra,
  {flags: Object.assign({}, save().flags, {ricoDoor: true, ricoVent: false, 'met-tina': true, hootAwake: true, songEb: true}, extra.flags || {})}));
/** every Episode 2 line a student reads in the text box (talk, signs, cutscenes, whispers, battles, story text) */
const EP2_LINES = `(() => {
  const out = new Set(), walk = v => { if (typeof v === 'string') out.add(v.replace(/^@[a-z-]+ /, '')); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  const D = window.QUEST_DIALOGUE, keys = ['moose', 'tina', 'pete', 'hoot', 'tusk', 'sal', 'rico', 'speaker', 'bignumber'].concat(Object.keys(D).filter(k => /^stage-/.test(k)));
  keys.forEach(k => D[k] && walk(D[k].talk && D[k].talk.map(t => [t.lines, t.yes, t.no, t.cycle, Array.isArray(t) ? t : null])) || walk(D[k] && D[k].wake));
  Object.keys(window.QUEST_CUTSCENES).filter(k => /^ep2-/.test(k)).forEach(k => walk(window.QUEST_CUTSCENES[k].shots.map(x => x.lines || x.say || x.text)));
  walk(window.QUEST_EP2_ARRIVAL); walk(window.QUEST_WHISPERS_EP2); walk(window.QUEST_MAPS.loft.whisperLines);
  const M = window.QUEST_MAPS, signs = new Set([].concat(...Object.keys(M).filter(id => M[id].ep === 2).map(id => (M[id].things || []).map(t => t.say).concat((M[id].doors || []).map(d => d.locked)))));
  signs.forEach(k => walk((window.QUEST_SIGNS || {})[k]));
  window.QUEST_ENEMIES.filter(e => e.area === 'stage').forEach(e => { walk(e.lines); walk(e.listen); walk((e.stages || []).map(x => x.say)); });
  ['finaleChoiceEp2', 'cutoffDoneTusk', 'showstopper', 'rhythmTip', 'rhythmTipWinds', 'rhythmTipDrum'].forEach(k => walk(window.QUEST_TEXT[k]));
  return [...out].filter(l => /\\w/.test(l));
})()`;
for (const [name, size, touch] of SIZES) {
  test(`every Episode 2 line fits the text box at ${name} size (never taller than Episode 1's longest line)`, async ({browser}) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({viewport: size, hasTouch: touch, isMobile: touch && size.width < 500});
    const page = await ctx.newPage();
    const watch = await boot(page, 'arcade-quest/index.html?demo&warp=lobby', open());
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    const r = await page.evaluate(src => {
      const Q = Arcade.Quest, lines = eval(src);
      Q.say(['x'], {name: 'Professor Hoot', portrait: 'npc-hoot'});                   // the box, with a speaker's portrait (the narrowest)
      const b = document.getElementById('qText'), el = b.querySelector('.q-tline'), lh = parseFloat(getComputedStyle(el).lineHeight) || 12;
      const rows = t => { el.textContent = t; return Math.round(el.getBoundingClientRect().height / lh); };
      // Episode 1's longest line: the yardstick
      const ep1 = [].concat(...window.QUEST_ENEMIES.filter(e => e.area === 'manor').map(e => [].concat(Object.values(e.lines || {}), e.listen || []).flat())).filter(x => typeof x === 'string');
      const most = Math.max(...ep1.map(rows), 3);
      const screen = document.getElementById('screen').getBoundingClientRect();
      const over = lines.map(t => [t, rows(t)]).filter(([, n]) => n > most), boxes = [];
      lines.forEach(t => { el.textContent = t; const r = b.getBoundingClientRect(); if (r.top < screen.top - 1 || r.bottom > screen.bottom + 1) boxes.push(t); });
      return {n: lines.length, most, over, boxes};
    }, EP2_LINES);
    expect(r.n).toBeGreaterThan(300);
    expect(r.over, `lines taller than Episode 1's longest (${r.most} rows)`).toEqual([]);
    expect(r.boxes, 'the text box stays on the game screen').toEqual([]);
    watch.check();
    await ctx.close();
  });

  test(`EVERY Episode 2 room, its HUD, Ticket Booth Tina, the Showtime Log and EPISODE 2 COMPLETE at ${name} size`, async ({browser}) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({viewport: size, hasTouch: touch, isMobile: touch && size.width < 500});
    const page = await ctx.newPage();
    const watch = await boot(page, 'arcade-quest/index.html?demo&warp=lobby', open({flags: {ricoVent: true}}));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    const rooms = await page.evaluate(() => { const M = window.QUEST_MAPS; return Object.keys(M).filter(id => M[id].ep === 2).map(id => {
      const d = [].concat(...Object.values(M).map(m => (m.doors || []).filter(x => x.to === id)))[0]; return [id, d.spawn[0], d.spawn[1]]; }); });
    expect(rooms.length).toBe(10);
    const inside = async what => {
      const box = await page.locator('#screen').boundingBox(), hud = await page.locator('#qWHud').boundingBox();
      expect(box.x, what).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, what).toBeLessThanOrEqual(size.width + 1);
      expect(box.y + box.height, what).toBeLessThanOrEqual(size.height + 1);
      expect(hud && hud.width > 0, `${what}: the HUD shows`).toBe(true);
      expect(hud.x >= box.x - 1 && hud.x + hud.width <= box.x + box.width + 1 && hud.y >= box.y - 1, `${what}: the HUD inside the screen`).toBe(true);
      expect(await tooWide(page), what).toEqual([]);
    };
    for (const [id, x, y] of rooms) {
      await page.evaluate(([m, x, y]) => Arcade.Quest.go('world', {map: m, x, y, dir: 'down'}), [id, x, y]);
      await page.waitForFunction(m => { const w = Arcade.Quest.world.state(); return w && w.map === m && !w.busy; }, id);
      await page.evaluate(() => { const t = document.getElementById('qText'); if (t) t.hidden = true; });
      await inside(id);
    }
    // Ticket Booth Tina (her booth's PLAYER ITEMS, the Stage Collection), the Showtime Log (pause), EPISODE 2 COMPLETE
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'lobby', x: 3, y: 5, dir: 'up'}));
    await page.waitForFunction(() => { const w = Arcade.Quest.world.state(); return w && w.map === 'lobby' && !w.busy; });
    await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await page.keyboard.press('Enter');
    for (let i = 0; i < 20 && !(await page.locator('.q-booth').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    expect(await windowFits(page, '.q-booth')).toEqual([]);
    await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
    await expect(page.locator('.q-cosshop')).toBeVisible();
    expect(await windowFits(page, '.q-cosshop')).toEqual([]);
    await page.evaluate(() => document.querySelectorAll('.q-overlay').forEach(o => o.remove()));
    await page.evaluate(() => Arcade.Quest.go('world', {map: 'pit', x: 8, y: 9, dir: 'up'}));
    await page.waitForFunction(() => { const w = Arcade.Quest.world.state(); return w && w.map === 'pit' && !w.busy; });
    await page.evaluate(() => { const t = document.getElementById('qText'); if (t) t.hidden = true; if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    if (touch) await page.evaluate(() => Arcade.UI.pause && document.querySelector('[data-pause], .ui-pause-btn, #qPause') && document.querySelector('[data-pause], .ui-pause-btn, #qPause').click());
    if (!(await page.locator('#uiPause').isVisible())) await page.keyboard.press('m');
    await expect(page.locator('#uiPause #qGhostLog')).toBeVisible();
    await expect(page.locator('#uiPause .q-glog-n')).toHaveText(/^SHOWTIME LOG: \d+ \/ 20 helped$/);
    expect(await windowFits(page, '#uiPause')).toEqual([]);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const s = Arcade.Quest.save.get(); s.flags.ep2Done = true; s.done['stage:boss'] = 'befriend'; Arcade.Quest.save.write(); Arcade.Quest.go('complete', {ep: 2}); });
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#results')).toContainText('Episode 2 complete!');
    expect(await windowFits(page, '#results')).toEqual([]);
    watch.check();
    await ctx.close();
  });
}

/* reduced motion (the system's setting) and the arcade's own MOTION switch (gameData bg.motion: false) are one switch to
   Arcade Quest (Arcade.reducedMotion → Q.reduced()): every Episode 2 room stands still, the cutscene pictures don't
   move, and its dodges run their still versions */
for (const how of ['reduced motion', 'Motion off']) {
  test(`${how}: every Episode 2 room and cutscene picture stands still; the dodges run their calm versions`, async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'pixel-for-pixel frames: Chromium');
    test.setTimeout(90000);
    if (how === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    const s = open({flags: {ricoVent: true}});
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true},
      ...(how === 'Motion off' ? {bg: {motion: false}} : {})}})});
    await page.goto('arcade-quest/index.html?demo&warp=lobby');
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    expect(await page.evaluate(() => Arcade.Quest.reduced())).toBe(true);
    await page.clock.install();
    // the canvas twice, 1.3 s apart: the same pixels, except where something walks (NPCs, machines: their own steps)
    const still = async what => {
      const a = await page.evaluate(() => document.getElementById('screen').toDataURL());
      await page.clock.runFor(1300);
      const b = await page.evaluate(() => document.getElementById('screen').toDataURL());
      return a === b;
    };
    const M = await page.evaluate(() => Object.keys(window.QUEST_MAPS).filter(id => window.QUEST_MAPS[id].ep === 2));
    const moving = [];
    // (its machines held where they stand: wandering is walking, gameplay, not an animation; set before the rooms load)
    await page.evaluate(() => Object.values(window.QUEST_MAPS).forEach(m => (m.enemies || []).forEach(e => { e.wander = 0; })));
    for (const id of M) {
      await page.evaluate(m => { const Q = Arcade.Quest; Q.save.get().flags.balconyGlimpse = true; Q.go('world', {map: m, x: 0, y: 0, dir: 'down'}); }, id);
      await page.clock.runFor(800);
      await page.evaluate(m => {
        const d = [].concat(...Object.values(window.QUEST_MAPS).map(x => (x.doors || []).filter(y => y.to === m)))[0];
        Arcade.Quest.world.warp(d.spawn[0], d.spawn[1], 'down'); const t = document.getElementById('qText'); if (t) t.hidden = true;
      }, id);
      await page.clock.runFor(800);
      if (!(await still(id))) moving.push(id);
    }
    expect(moving, 'rooms with something still animating').toEqual([]);
    // every Episode 2 cutscene picture, held, once its one-time change has played (the pull into the grille, the lights
    // coming on): nothing may keep moving after it
    const shows = await page.evaluate(() => [...new Set([].concat(...Object.keys(window.QUEST_CUTSCENES).filter(k => /^ep2-/.test(k)).map(k => window.QUEST_CUTSCENES[k].shots.map(x => x.show).filter(Boolean))))]);
    const loose = [];
    for (const show of shows) {
      await page.evaluate(show => { window.QUEST_CUTSCENES.t = {music: null, shots: [{show, wait: 60000}]}; Arcade.Quest.go('cutscene', {id: 't'}); }, show);
      await page.clock.runFor(4500);
      if (!(await still(show))) loose.push(show);
    }
    expect(loose, 'cutscene pictures still moving').toEqual([]);
    // the dodges: every Episode 2 piece reads Q.reduced() (its still path: quest-ep2-battles, -rico and -finale specs test
    // each one under reduced motion), and Q.reduced() is this switch: a real dodge here runs its still version
    await page.evaluate(() => {
      const Q = Arcade.Quest, E = window.QUEST_ENEMIES.find(e => e.id === 'bignumber');
      Q.challenge.run = async () => new Promise(() => {});                       // (the battle waits; only the dodge runs)
      Q.go('battle', {enemy: 'bignumber', back: 'arena'});
      setTimeout(() => { Q.dodge.start({enemy: Object.assign({}, E, E.stages[0]), easy: false, onHit: () => {}}); }, 50);
    });
    await page.clock.runFor(2500);
    const b = await page.evaluate(() => (Arcade.Quest.dodge.state() || {}).bubbles || []);
    expect(b.length).toBeGreaterThan(0);
    b.forEach(x => expect(x.wobble, 'a bubble wobbling').toBe(0));
    watch.check();
  });
}

/* ---------- THE FLASH RULE, MEASURED, on three more: the intro's marquee, the Balcony's glimpse of the Microphone and the
   Fly Loft's Microphone silhouette (the technique: tests/quest-ep2-finale.spec.js, Showtime Malfunction's) ---------- */
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
  ['the intro\'s marquee (SHOWTIME, its bulbs coming on)', `() => { window.QUEST_CUTSCENES.t = {music: null, shots: [{show: 'marquee', wait: 9000}]}; Arcade.Quest.go('cutscene', {id: 't'}); }`, 3500],
  ['the Balcony\'s glimpse: the giant Microphone through the curtain gap, the first visit', `() => { const Q = Arcade.Quest; delete Q.save.get().flags.balconyGlimpse; Q.go('world', {map: 'balcony', x: 7, y: 8, dir: 'up'}); }`, 5000],
  ['the Fly Loft: the Microphone\'s silhouette in a whisper', `() => { const Q = Arcade.Quest; Q.go('world', {map: 'loft', x: 3, y: 2, dir: 'down'}); setTimeout(() => Q.world.whisperNow(), 600); }`, 6000],
]) {
  test(`the flash rule, measured: ${name}`, async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'the frame-by-frame measurement runs in Chromium');
    test.setTimeout(90000);
    await page.setViewportSize({width: 640, height: 400});
    await page.clock.install();
    const watch = await boot(page, 'arcade-quest/index.html?demo&warp=lobby', open());
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    const r = await measure(page, start, ms);
    expect(r.frames).toBeGreaterThan(50);
    expect(r.worst, `a cell swung 3 times within a second: ${JSON.stringify(r.where)}`).toBeLessThanOrEqual(2);
    watch.check();
  });
}

/* ---------- FRAME RATE: the Main Stage and the Fly Loft at 4× CPU throttle (runs alone: the perf job) ---------- */
test.describe('Arcade Quest Episode 2: performance', () => {
  for (const [map, x, y] of [['stage', 11, 6], ['loft', 3, 2]]) {
    test(`${map === 'stage' ? 'the Main Stage' : 'the Fly Loft'}: 20 s walking at 4× CPU throttle averages at least 30 frames a second`, async ({page, browserName}) => {
      test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium feature');
      test.skip(!process.env.PERF, 'runs alone: PERF=1 npx playwright test quest-ep2-polish -g performance --project=chromium --workers=1');
      test.setTimeout(90_000);
      await page.setViewportSize({width: 1180, height: 820});
      const watch = await boot(page, `arcade-quest/index.html?demo&warp=${map}`, open({flags: {ricoVent: true}}));
      await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
      await page.evaluate(([x, y]) => Arcade.Quest.world.warp(x, y, 'down'), [x, y]);
      await page.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
      const f0 = await page.evaluate(() => [window.__frames, performance.now()]);
      const until = Date.now() + 20_000;
      let dir = 'ArrowRight';
      while (Date.now() < until) { await page.keyboard.down(dir); await page.waitForTimeout(1500); await page.keyboard.up(dir); dir = dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'; }
      const f1 = await page.evaluate(() => [window.__frames, performance.now()]);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
      const fps = (f1[0] - f0[0]) / ((f1[1] - f0[1]) / 1000);
      console.log(`Arcade Quest, ${map}, at 4× CPU throttle: ${fps.toFixed(1)} fps`);
      expect(fps).toBeGreaterThanOrEqual(30);
      watch.check();
    });
  }
});
