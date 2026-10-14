/* ARCADE QUEST, EPISODE 2, build step 6 (docs/games/arcade-quest-ep2-plan.md): THE MUSIC. Every Episode 2 slot in one
   table (arcade-quest/data/music.js QUEST_EP2_MUSIC) that agrees with Mr. Graham's recording checklist
   (shared/sounds/README.md, "Arcade Quest — Episode 2 music": its Uploaded column against the files in shared/sounds/),
   with shared/sounds.js and with what the game really asks the music manager for (each slot, then its fallbacks); the
   Microphone's speech has no music; the Sound Board's "Arcade Quest — Episode 2" section (Rooms · Battles · Story ·
   Effects, each row's fallback, found by its room's name). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT} = require('./helpers');

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
    await expect.poll(() => page.locator('#rooms2 .sb-row[data-n="quest-room-vent"] [data-mstatus]').textContent(), {timeout: 20000})
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
