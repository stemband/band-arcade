/* ARCADE QUEST: GHOST WHISPERER (achievement 'manor-all', arcade-quest/engine/save.js). Every ghost placed in Ghost
   Notes Manor helped, befriended or faded (20: hall 4, library 4, ballroom 4, kitchen 4, stairs 3, attic 1); the
   Practice Hall and the Test Arena never count. It earns the Spirit Lantern (hand `spiritlantern`) and the Ghost
   Whisperer name plate (plate `ghostwhisperer`), shown on the UNLOCKED! card after the last battle's results; the
   pause menu's GHOST LOG counts them and, from 16, names the rooms that still have someone. Restores (a QUEST CODE, a
   Backup Code) bring it back. The full-route runs (quest-routes.spec.js) show all 20 are reachable either way. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: true};
const ALL = ['hall:w1', 'hall:w2', 'hall:w3', 'hall:s1', 'library:h1', 'library:h2', 'library:h3', 'library:w1', 'ballroom:b1', 'ballroom:b2',
  'ballroom:b3', 'ballroom:s1', 'kitchen:c1', 'kitchen:c2', 'kitchen:c3', 'kitchen:w1', 'stairs:boss', 'stairs:b1', 'stairs:c1', 'attic:boss'];
const ITEMS = [['hand', 'spiritlantern'], ['plate', 'ghostwhisperer']];
const REQ = 'Help every ghost in Ghost Notes Manor (Arcade Quest)';
const LINE = "Every ghost in the manor is at peace. You're a true Ghost Whisperer!";
// befriend: a gentle PLAY that fills CALM, then HARMONIZE; fade: full-power PLAYs
const PLAY = {befriend: {acc: .2, speed: .5, correct: 4, total: 4, success: true}, fade: {acc: 1, speed: 1, correct: 0, total: 4, success: false}};

/** a v5 save with these ghosts helped (all befriended), past Episode 1 (the Conductor is in the list) */
function save(keys) {
  const done = Object.fromEntries(keys.map(k => [k, 'befriend']));
  return {v: 5, level: 9, xp: 0, hp: 52, maxHp: 52, tokens: 0, items: {'valve-oil': 2}, roster: ['wisp', 'squeaker', 'hush', 'wobble', 'chatterbox', 'fermata', 'conductor'],
    battles: {won: keys.length, befriended: keys.length, faded: 0}, world: null, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {},
    flags: {'seen-intro': true, reginaldAwake: true, atticOpen: true, ep1Done: true, pathsTip: true}, done};
}
const store = keys => device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': Object.assign({settings: SETTINGS}, keys ? {save: save(keys)} : {})}});
const without = (...gone) => ALL.filter(k => !gone.includes(k));

async function boot(page, st) {
  const watch = await prepare(page, {store: st});
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__cardAt = null;
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
    Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 4, total: 4, success: true} : Object.assign({}, window.__play));
    Q.dodge.start = async () => ({damage: 0, hits: 0, blocked: 0, muted: 0, shieldLeft: 0, muteLeft: 0});
    // what was already earned before this test (Episode 1's skin and items) has been seen: only the new things show
    Arcade.Skins.markSeen('trumpet', Arcade.Skins.fresh('trumpet'));
    Arcade.Avatar.markSeen(Arcade.Avatar.freshItems());
    // when the UNLOCKED! card appears: the scene and how many lines had been said
    new MutationObserver(() => { if (!window.__cardAt && document.querySelector('.sk-catchup')) window.__cardAt = {scene: Q.sceneName, lines: window.__lines.length}; })
      .observe(document.body, {childList: true});
  });
  return watch;
}
const snap = page => page.evaluate(() => {
  const Q = Arcade.Quest, t = document.getElementById('qText'), c = document.getElementById('qCmd');
  return {scene: Q.sceneName, b: Q.battleState && Q.battleState(), w: Q.world && Q.world.state(), card: !!document.querySelector('.sk-catchup'),
    text: !!t && !t.hidden && t.offsetParent !== null, cmd: !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0};
});
async function drive(page, done, pick = () => 'PLAY', max = 900) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (done(s)) return s;
    if (s.cmd) await page.evaluate(l => [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)).click(), pick(s.b));
    else if (s.text || s.scene === 'battle') await page.keyboard.press('Enter');
    await page.waitForTimeout(35);
  }
  throw new Error('stuck: ' + JSON.stringify(await snap(page)));
}
const idleIn = map => s => s.scene === 'world' && s.w && s.w.map === map && !s.w.busy && !s.text && !s.card;
async function room(page, map, x = 1, y = 2) {
  await page.evaluate(([map, x, y]) => Arcade.Quest.go('world', {map, x, y, dir: 'up'}), [map, x, y]);
  await drive(page, idleIn(map));
}
/** fight a ghost in this room and come back to the overworld: idle, or the UNLOCKED! card showing */
async function fight(page, map, key, how) {
  await page.evaluate(p => { window.__play = p; }, PLAY[how]);
  expect(await page.evaluate(k => Arcade.Quest.world.fight(k), key)).toBe(true);
  await drive(page, s => s.scene === 'battle');
  return drive(page, s => idleIn(map)(s) || (s.scene === 'world' && s.card), b => (how === 'befriend' ? (b && b.calm >= 100 ? 'HARMONIZE' : 'SERENADE') : 'PLAY'));
}
const status = page => page.evaluate(([items]) => ({
  ach: !!(Arcade.store.gameData('arcade-quest').achievements || {})['manor-all'],
  open: items.map(([f, id]) => Arcade.Avatar.isUnlocked(f, id)),
  req: items.map(([f, id]) => Arcade.Avatar.requirement(f, id)),
  log: Arcade.Quest.save.ghostLog()}), [ITEMS]);
/** the pause menu's GHOST LOG (M opens the menu, Esc closes it) */
async function ghostLog(page) {
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  await page.keyboard.press('m');
  await expect(page.locator('#uiPause')).toBeVisible();
  const r = await page.evaluate(() => {
    const g = document.querySelector('#uiPause #qGhostLog'), q = s => (g && g.querySelector(s) ? g.querySelector(s).textContent : null);
    return g && {n: q('.q-glog-n'), left: q('.q-glog-left'), done: q('.q-glog-done'), icon: !!g.querySelector('svg.q-glog-ico rect')};
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#uiPause')).toBeHidden();
  return r;
}

test('the list: the 20 placed ghosts, from the maps (never the Practice Hall); progress() counts the same ones', async ({page}) => {
  const watch = await boot(page, store(null));
  const r = await page.evaluate(() => ({keys: Arcade.Quest.save.ghosts().map(g => g.key), maps: Object.keys(window.QUEST_MAPS).filter(id => window.QUEST_MAPS[id].practice),
    quest: Arcade.Backup.QUEST_V1.ghosts.map(g => g[0])}));
  expect(r.keys.slice().sort()).toEqual(ALL.slice().sort());
  expect(r.keys.some(k => k.startsWith('practice:'))).toBe(false);
  expect(r.maps).toEqual(['practice']);
  expect(r.quest.slice().sort()).toEqual(ALL.slice().sort());               // the QUEST CODE carries every one of them
  watch.check();
});

test('15 of 20: the Ghost Log counts, no rooms yet; the items are locked silhouettes in the Locker', async ({page}) => {
  const watch = await boot(page, store(without('library:h3', 'attic:boss', 'kitchen:c1', 'kitchen:c2', 'hall:w1')));
  await room(page, 'foyer', 10, 9);
  expect(await ghostLog(page)).toEqual({n: 'GHOST LOG: 15 / 20 helped', left: null, done: null, icon: true});
  expect((await status(page)).open).toEqual([false, false]);
  watch.check();
});

for (const how of ['befriend', 'fade']) {
  test(`19 of 20, then the last one ${how === 'befriend' ? 'BEFRIENDED' : 'FADED'}: Ghost Whisperer, both items, the UNLOCKED! card after the results`, async ({page}) => {
    test.setTimeout(120_000);
    const watch = await boot(page, store(without('library:h3')));
    await room(page, 'library', 10, 10);
    // 19 of 20: nothing yet, the items locked with what they take; the Ghost Log names the one room left
    let st = await status(page);
    expect(st).toMatchObject({ach: false, open: [false, false], req: [REQ, REQ]});
    expect(st.log).toMatchObject({helped: 19, total: 20, rooms: ['The Library'], all: false});
    expect(await ghostLog(page)).toEqual({n: 'GHOST LOG: 19 / 20 helped', left: 'Still wandering: the Library', done: null, icon: true});
    // the 20th
    const s = await fight(page, 'library', 'h3', how);
    expect(s.card).toBe(true);
    expect(await page.evaluate(() => Arcade.Quest.save.get().done['library:h3'])).toBe(how);
    st = await status(page);
    expect(st).toMatchObject({ach: true, open: [true, true]});
    expect(st.log).toMatchObject({helped: 20, total: 20, rooms: [], all: true});
    // the card comes after the battle's results, back in the manor, with its line and both items
    const card = await page.evaluate(() => ({at: window.__cardAt, lines: window.__lines.slice(0, window.__cardAt.lines),
      lead: document.querySelector('.sk-catchup .sk-u-lead').textContent, title: document.querySelector('.sk-catchup .sk-u-title').textContent,
      items: [...document.querySelectorAll('.sk-catchup .sk-u-equip')].map(b => b.dataset.item), busy: Arcade.Quest.world.state().busy}));
    expect(card.at.scene).toBe('world');
    expect(card.lines.some(l => /XP/.test(l))).toBe(true);                         // the rewards were said first
    expect(card.lead).toBe(LINE);
    expect(card.title).toBe('Unlocked!');
    expect(card.items.sort()).toEqual(['hand:spiritlantern', 'plate:ghostwhisperer']);
    expect(card.busy).toBe(true);                                                  // the manor waits for it
    // a stray A (Enter) from the battle's last line chooses nothing: the focus is on the card, not WEAR IT
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => [document.activeElement.matches('.sk-catchup .panel'), Arcade.Avatar.get().hand])).toEqual([true, 'none']);
    // OK closes it; the manor is yours again, and the Ghost Log says so
    await page.locator('.sk-catchup [data-close]').click();
    await drive(page, idleIn('library'));
    expect(await ghostLog(page)).toEqual({n: 'GHOST LOG: 20 / 20 helped', left: null, done: '✓ Ghost Whisperer', icon: true});
    // never shown twice: the next load re-checks quietly
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
    expect(await page.evaluate(() => [Arcade.Avatar.freshItems().map(i => i.key), (Arcade.store.gameData('arcade-quest').achievements || {})['manor-all']]))
      .toEqual([[], true]);
    watch.check();
  });
}

test('the Practice Hall and the Test Arena never count', async ({page}) => {
  test.setTimeout(120_000);
  const watch = await boot(page, store(without('library:h3')));
  // the Test Arena: a battle there changes nothing in the manor
  await page.evaluate(() => { window.__play = {acc: 1, speed: 1, correct: 0, total: 4, success: false}; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
  await drive(page, s => s.scene === 'arena');
  // the Practice Hall: its ghosts come back and are never saved
  await room(page, 'practice', 7, 7);
  for (const k of ['p1', 'p2']) await fight(page, 'practice', k, 'fade');
  const st = await status(page);
  expect(st).toMatchObject({ach: false, open: [false, false]});
  expect(st.log).toMatchObject({helped: 19, total: 20});
  expect(Object.keys(await page.evaluate(() => Arcade.Quest.save.get().done)).sort()).toEqual(without('library:h3').sort());
  expect(await page.evaluate(() => document.querySelector('.sk-catchup'))).toBeNull();
  watch.check();
});

test('a QUEST CODE with all 20 restores Ghost Whisperer and both items on a fresh device', async ({page, browser}) => {
  const watch = await boot(page, store(ALL));
  const code = await page.evaluate(() => Arcade.Quest.save.code());
  // a new device: nothing saved; ENTER SAVE CODE
  const ctx = await browser.newContext(), fresh = await ctx.newPage();
  const watch2 = await prepare(fresh, {store: device('trumpet', {avatarOffered: true})});
  await fresh.goto('arcade-quest/index.html?demo&test');
  await fresh.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  expect((await status(fresh)).open).toEqual([false, false]);
  expect(await fresh.evaluate(c => Arcade.Quest.save.fromCode(c), code)).toEqual({ok: true});
  const st = await status(fresh);
  expect(st).toMatchObject({ach: true, open: [true, true]});
  expect(st.log).toMatchObject({helped: 20, all: true});
  // and on the arcade floor too
  await fresh.goto('index.html?demo&nostart');
  await fresh.waitForFunction(() => window.Arcade && Arcade.Avatar);
  expect(await fresh.evaluate(it => it.map(([f, id]) => Arcade.Avatar.isUnlocked(f, id)), ITEMS)).toEqual([true, true]);
  watch.check(); watch2.check();
  await ctx.close();
});

test('a Backup Code with all 20 restores Ghost Whisperer and both items on a fresh device (an older save is re-checked on load)', async ({page}) => {
  const watch = await boot(page, store(ALL));
  // a save from before this achievement: all 20 helped, the flag never set
  await page.evaluate(() => { const d = Arcade.store.gameData('arcade-quest'); d.achievements = {ep1: true}; Arcade.store.saveGameData('arcade-quest'); });
  const code = await page.evaluate(() => Arcade.Backup.fullEncode());
  await page.goto('index.html?demo&nostart');
  await page.evaluate(async c => {
    localStorage.clear(); sessionStorage.setItem('bandarcade.visit', '1');
    const r = await Arcade.Backup.fullDecode(c);
    Arcade.store.importAll(r.data);
  }, code);
  await page.goto('arcade-quest/index.html?demo&test');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  const st = await status(page);
  expect(st).toMatchObject({ach: true, open: [true, true]});
  await page.goto('index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar);
  expect(await page.evaluate(it => it.map(([f, id]) => Arcade.Avatar.isUnlocked(f, id)), ITEMS)).toEqual([true, true]);
  watch.check();
});

test('the Locker: both are silhouettes with the requirement until earned', async ({page}) => {
  const watch = await prepare(page, {store: store(without('attic:boss'))});
  await page.goto('index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Locker);
  await page.evaluate(() => Arcade.Locker.open({member: 'trumpet'}));
  await expect(page.locator('#locker')).toBeVisible();
  await page.locator('#lkTab-extras').click();
  for (const [f, id] of ITEMS) {
    const t = page.locator(`#locker .sk-opt[data-field="${f}"][data-item="${id}"]`);
    await expect(t).toHaveClass(/locked/);
    await expect(t.locator('small')).toContainText(REQ);
  }
  watch.check();
});

test('the Spirit Lantern: drawn (bust and full body), 4 gentle frames, the ghost bobs; the plate draws; codes round-trip', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART && Arcade.avatarCode);
  const r = await page.evaluate(() => {
    const A = Arcade, P = window.AVATAR_PARTS, part = P.HANDS.find(h => h.id === 'spiritlantern'), out = {};
    const css = t => getComputedStyle(document.documentElement).getPropertyValue('--' + t).trim();
    const base = Object.assign(A.Avatar.get(), {bg: 'none', effect: 'none', pet: 'none', back: 'none', top: 'tee', hand: 'none'}), av = Object.assign({}, base, {hand: 'spiritlantern'});
    out.unlock = part.unlock;
    out.tokens = Object.values(part.pal).concat(...Object.values(part.anim.pal)).filter(t => !css(t));
    out.sizes = ['chip', 'tile', 'big'].filter(size => !/src="data:image\/png/.test(A.avatarHTML({size, avatar: av, label: ''})));
    const sp = A.Avatar.sprites('trumpet', {avatar: av});
    out.sprite = ['-front', '', '-back'].every(v => sp && sp[v] && sp[v].frames.length && sp[v].frames.every(c => c.width));
    // the bust: 4 frames, the lantern drawn where nothing was, inside the picture (x ≥ 26 beside the face)
    const pix = c => c.getContext('2d').getImageData(0, 0, 36, 36).data;
    const fr = A.Avatar.bustFrames(av), plain = pix(A.Avatar.bustFrames(base)[0]);
    out.frames = fr.length;
    const d0 = pix(fr[0]); let added = 0; for (let p = 0; p < d0.length; p += 4) if (d0[p + 3] && !plain[p + 3]) added++;
    out.added = added;
    const pts = []; const api = {px(x, y) { pts.push([Math.round(x), Math.round(y)]); return api; }, line(x0, y0, x1, y1) { api.px(x0, y0); api.px(x1, y1); return api; }};
    [0, 1, 2, 3].forEach(f => part.bust(api, f));
    out.outside = pts.filter(([x, y]) => x < 0 || x > 35 || y < 0 || y > 35 || (x < 26 && y > 9.5 && y < 25.5)).length;
    // the ghost's top row moves 1 px between frames; each frame changes only a few pixels (never a flash)
    const ghostTop = f => { const a = []; const api2 = {px(x, y, ch) { if (ch === 'L') a.push(y); return api2; }, line() { return api2; }}; part.bust(api2, f); return Math.min(...a); };
    out.bob = [0, 1, 2, 3].map(ghostTop);
    const lum = (d, i) => { const g = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * g(d[i]) + .7152 * g(d[i + 1]) + .0722 * g(d[i + 2]); };
    const flat = c => { const k = document.createElement('canvas'); k.width = k.height = 36; const x = k.getContext('2d'); x.fillStyle = '#140f1f'; x.fillRect(0, 0, 36, 36); x.drawImage(c, 0, 0); return x.getImageData(0, 0, 36, 36).data; };
    const fd = fr.map(flat); let worst = 0;
    fd.forEach((d, i) => { const e = fd[(i + 1) % 4]; let n = 0; for (let p = 0; p < d.length; p += 4) if (Math.abs(lum(d, p) - lum(e, p)) > .1) n++; worst = Math.max(worst, n / 1296); });
    out.worst = worst;
    // the plate: a CSS frame with a background and its wisp
    const s = document.createElement('span'); s.className = 'av-plate av-plate-ghostwhisperer'; s.textContent = 'Whisperer'; document.body.appendChild(s);
    out.plate = {bg: getComputedStyle(s).backgroundImage !== 'none', wisp: getComputedStyle(s, '::after').content !== 'none', border: getComputedStyle(s).borderTopColor};
    s.remove();
    // the avatar code: both ids at the END of their lists, and back again
    const T = f => A.avatarCode.TABLE.find(t => t[0] === f)[2];
    out.table = [T('hand').slice(-1)[0], T('plate').slice(-1)[0]];
    const both = Object.assign({}, base, {hand: 'spiritlantern', plate: 'ghostwhisperer'}), back = A.avatarCode.decode(A.avatarCode.encode(both));
    out.code = [(back.avatar || back).hand, (back.avatar || back).plate];
    out.plateUnlock = P.PLATES.find(p => p.id === 'ghostwhisperer').unlock;
    // never sold
    out.sold = A.Tokens.catalog().filter(it => ['hand:spiritlantern', 'plate:ghostwhisperer'].includes(it.key)).length;
    return out;
  });
  const RULE = {game: 'arcade-quest', achievement: 'manor-all', text: REQ};
  expect(r.unlock).toEqual(RULE);
  expect(r.plateUnlock).toEqual(RULE);
  expect(r.tokens).toEqual([]);
  expect(r.sizes).toEqual([]);
  expect(r.sprite).toBe(true);
  expect(r.frames).toBe(4);
  expect(r.added).toBeGreaterThan(40);
  expect(r.outside).toBe(0);
  expect(r.bob).toEqual([13, 12, 13, 14]);
  expect(r.worst).toBeLessThan(.05);
  expect(r.plate.bg).toBe(true);
  expect(r.plate.wisp).toBe(true);
  expect(r.table).toEqual(['spiritlantern', 'ghostwhisperer']);
  expect(r.code).toEqual(['spiritlantern', 'ghostwhisperer']);
  expect(r.sold).toBe(0);
  watch.check();
});

for (const reduced of [false, true]) {
  test(`the Spirit Lantern ${reduced ? 'is still with reduced motion' : 'moves on the live avatar, at most 4 frames a second'}`, async ({page}) => {
    if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
    await page.goto('index.html?demo&nostart&unlockall');
    await page.waitForFunction(() => window.Arcade && Arcade.Avatar && Arcade.AvatarFx);
    await page.evaluate(() => {
      const d = document.createElement('div'); d.id = 'fxTest'; d.style.cssText = 'position:fixed;left:20px;top:80px;width:260px;z-index:9999';
      d.innerHTML = Arcade.avatarHTML({size: 'big', avatar: Object.assign({}, Arcade.Avatar.get(), {effect: 'none', pet: 'none', bg: 'none', hand: 'spiritlantern'}), live: true, label: ''});
      document.body.appendChild(d);
    });
    await page.waitForTimeout(800);
    // 3 s of the live picture, sampled every 50 ms: how often it changes
    const r = await page.evaluate(async () => {
      const box = document.querySelector('#fxTest .av-box'), seen = [], t0 = performance.now();
      for (let i = 0; i < 60; i++) {
        const c = box.querySelector('canvas.av-live');
        seen.push(c && !c.hidden ? c.toDataURL() : 'still');
        await new Promise(r => setTimeout(r, 50));
      }
      let changes = 0; for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1]) changes++;
      return {changes, secs: (performance.now() - t0) / 1000, distinct: new Set(seen).size, body: Arcade.AvatarFx.state(box).body};
    });
    if (reduced) expect(r).toMatchObject({changes: 0, distinct: 1, body: false});
    else {
      expect(r.body).toBe(true);
      expect(r.distinct).toBeGreaterThan(1);
      expect(r.changes).toBeLessThanOrEqual(Math.ceil(r.secs * 4) + 1);   // ≤ 4 a second (+1 for where the count starts)
    }
    watch.check();
  });
}
