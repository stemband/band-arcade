/* SPOOKY SEASON'S BONUS LADDER (shared/seasons.js `bonus`, the event panel in season-lobby.js) and the new avatar items:
   the 6 bonus items (Glowing jack-o'-lantern, Mummy wraps, Vampire cape, Floating bats, Candy Corn name plate, Lil'
   Reaper) and the year-round Smiley pet. The ladder stays locked until the 5 challenges are done, then counts the whole
   event; each step gives its item once; the banner counts the bonus steps; the items are never sold; after the event a
   locked one says "Returns next Spooky Season!"; every item draws at every size and view, keeps to theme tokens, never
   flashes, is still under reduced motion and survives the avatar code. GALLERY=1 saves a sheet of the 7 new items to
   docs/gallery/avatar-new-items.png for Mat to look over. */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {ROOT, prepare, device, offscreen, VIEWPORTS, closeUnlocked} = require('./helpers');

const BONUS = ['hand:jacklantern', 'top:mummywraps', 'back:vampcape', 'effect:floatbats', 'plate:candycorn', 'pet:reaper'];
const NEW = BONUS.concat('pet:smiley');
const GAMES = ['ghost-notes', 'note-storm', 'note-ninja', 'vanishing-ink', 'chime-heist', 'rhythm-dojo', 'button-masher', 'neon-face-off', 'lost-signal'];
const MID = '2026-10-15', AFTER = '2026-11-05';

/** an activity log: days = [[date, {s, c, g: [games], e}]] */
const log = days => Object.fromEntries(days.map(([d, a]) => [d, {s: a.s || 0, c: a.c || 0, e: a.e || 0, p: 1, g: Object.fromEntries((a.g || []).map(g => [g, 1]))}]));
const oct = n => `2026-10-${String(n).padStart(2, '0')}`;
/** 9 days in October: 9 games, 36 ★, 18 levels, a 1,600 Endless run (every bonus step but the 50 ★ one), and a big
    day in September that must never count */
const BUSY = log([['2026-09-28', {s: 60, c: 20, g: GAMES, e: 3000}],
  ...GAMES.map((g, i) => [oct(i + 1), {s: 4, c: 2, g: [g], e: i === 4 ? 1600 : 100}])]);
// the free gift already claimed (the banner shows "Free gift!" instead of the count until it is)
const store = (activity, extra) => device('trumpet', Object.assign({avatarOffered: true, activity, gameData: {seasons: {claimed: {'spooky@2026-10-01': 1}}}}, extra || {}));
const floor = async (page, q, {unlocked = 'close'} = {}) => {
  await page.goto(`index.html?demo&nostart&${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Seasons && Arcade.SeasonLobby && Arcade.Avatar && Arcade.Tokens);
  if (unlocked === 'close') await closeUnlocked(page);         // the steps earned since the last visit: the lobby's UNLOCKED! card first
};
const openPanel = async page => { await page.locator('.ev-banner').click(); await expect(page.locator('.ev-pan')).toBeVisible(); };

test('the bonus ladder is locked until the 5 challenges are done (preview): one line + 6 silhouettes', async ({page}) => {
  const watch = await prepare(page, {store: store({})});
  await floor(page, `season=spooky&today=${MID}`);
  const st = await page.evaluate(() => Arcade.SeasonLobby.state());
  expect(st).toMatchObject({event: 'spooky', preview: true, bonusOpen: false});
  expect(st.bonus.map(s => s.item)).toEqual(['hand:jacklantern', 'top:mummywraps', 'back:vampcape', 'effect:floatbats', 'plate:candycorn', 'pet:reaper']);
  expect(st.bonus.map(s => [s.do, s.n])).toEqual([['games', 8], ['stars', 30], ['levels', 15], ['days', 8], ['endless', 1500], ['stars', 50]]);
  await openPanel(page);
  const box = page.locator('.ev-bonus-locked');
  await expect(box.locator('h3')).toHaveText('Bonus challenges 👻');
  await expect(box).toContainText('Finish all 5 challenges to unlock 6 bonus challenges!');
  await expect(box.locator('.ev-sil')).toHaveCount(6);
  await expect(page.locator('.ev-bonus .ev-step')).toHaveCount(0);
  // the locked items say what they take during the event
  const req = await page.evaluate(() => ['pet:reaper', 'effect:floatbats', 'plate:candycorn'].map(k => Arcade.Avatar.requirement(...k.split(':'))));
  expect(req).toEqual(['Spooky Season bonus: Earn 50 ★', 'Spooky Season bonus: Play on 8 different days', 'Spooky Season bonus: Score 1,500 in any Endless mode']);
  watch.check();
});

test('locked with 4 of 5 done, even past a bonus goal; the 5th opens it and counts everything since Oct 1', async ({page}) => {
  // Oct 1–2: 9 games, 60 ★ (bonus goals met), but only 2 days: the main ladder's "3 different days" isn't done
  const two = log([[oct(1), {s: 30, c: 3, g: GAMES.slice(0, 5), e: 600}], [oct(2), {s: 30, c: 3, g: GAMES.slice(5)}]]);
  const watch = await prepare(page, {store: store(two)});
  await floor(page, `today=${oct(2)}`);
  let st = await page.evaluate(() => Arcade.SeasonLobby.state());
  expect(st.preview).toBe(false);
  expect(st.steps.filter(s => s.done)).toHaveLength(4);
  expect(st.bonusOpen).toBe(false);
  expect(st.count).toBe('4 of 5');
  expect(await page.evaluate(k => k.filter(x => Arcade.Seasons.owned(x)), BONUS)).toEqual([]);
  // day 3: one small play opens the bonus ladder, and its progress already holds Oct 1 and 2
  await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('bandarcade.v1')); a.activity['2026-10-03'] = {s: 1, c: 0, e: 0, p: 1, g: {'ghost-notes': 1}}; localStorage.setItem('bandarcade.v1', JSON.stringify(a)); });
  await floor(page, `today=${oct(3)}`);
  st = await page.evaluate(() => Arcade.SeasonLobby.state());
  expect(st.bonusOpen).toBe(true);
  expect(st.bonus.map(s => s.have)).toEqual([8, 30, 6, 3, 600, 50]);
  expect(await page.evaluate(k => k.filter(x => Arcade.Seasons.owned(x)), BONUS)).toEqual(['hand:jacklantern', 'top:mummywraps', 'pet:reaper']);
  expect(st.count).toBe('8 of 11');
  watch.check();
});

test('open: 6 step rows counted from Oct 1, each item given once, the banner says "10 of 11"', async ({page}) => {
  const watch = await prepare(page, {store: store(BUSY)});
  await floor(page, `today=${MID}`);
  const st = await page.evaluate(() => Arcade.SeasonLobby.state());
  expect(st.bonusOpen).toBe(true);
  // September's big day never counts: 36 ★ (not 96), 18 levels, 9 games, 9 days, best Endless 1,600 (not 3,000)
  expect(st.bonus.map(s => s.have)).toEqual([8, 30, 15, 8, 1500, 36]);
  expect(st.bonus.map(s => s.done)).toEqual([true, true, true, true, true, false]);
  expect(st.count).toBe('10 of 11');
  await expect(page.locator('.ev-banner .ev-count')).toHaveText('10 of 11');
  const owned = await page.evaluate(k => ({own: k.filter(x => Arcade.Seasons.owned(x)), again: Arcade.Seasons.check()}), BONUS);
  expect(owned.own).toEqual(BONUS.slice(0, 5));
  expect(owned.again).toEqual([]);                                                  // given once: nothing new the second time
  await openPanel(page);
  const rows = page.locator('.ev-bonus .ev-step');
  await expect(rows).toHaveCount(6);
  await expect(page.locator('.ev-bonus-locked')).toHaveCount(0);
  await expect(rows.nth(5)).toContainText('Earn 50 ★');
  await expect(rows.nth(5)).toContainText('36 of 50');
  await expect(rows.nth(4)).toContainText('Score 1,500 in any Endless mode');
  await expect(rows.nth(0)).toContainText('Earned: yours to keep!');
  expect(await page.evaluate(() => Arcade.Avatar.progress('pet', 'reaper'))).toBe('36 of 50 so far');
  watch.check();
});

test('the Reaper: 50 ★ gives it, its UNLOCKED! card says Spooky Season, and the jingle is the event\'s', async ({page}) => {
  const more = Object.assign({}, BUSY, log([[oct(14), {s: 14, g: ['ghost-notes']}]]));
  const watch = await prepare(page, {store: store(more)});
  await page.addInitScript(() => { window.__sfx = []; });
  await floor(page, `today=${MID}`, {unlocked: 'keep'});
  expect(await page.evaluate(() => Arcade.Seasons.owned('pet:reaper'))).toBe(true);
  await page.evaluate(() => { const ev = Arcade.Sfx.event; Arcade.Sfx.event = (n, ...r) => { window.__sfx.push(n); return ev.call(Arcade.Sfx, n, ...r); }; });
  const card = page.locator('.sk-catchup');                                        // the lobby's own UNLOCKED! card (the lobby queue)
  await expect(card).toContainText("Lil' Reaper");
  await expect(card).toContainText('Spooky Season: yours forever');
  await page.locator('.sk-catchup [data-close]').click();
  await page.locator('.ev-banner').click();                                         // the banner plays the event's jingle
  await expect.poll(() => page.evaluate(() => window.__sfx)).toContain('event-spooky-jingle');
  watch.check();
});

test('the bonus items are never sold: not in the catalog, refused at both counters, not on either shelf', async ({page}) => {
  const watch = await prepare(page, {store: store(BUSY, {gameData: {seasons: {claimed: {'spooky@2026-10-01': 1}}, 'arcade-quest': {keysTip: true, settings: {textSpeed: 'instant', dodge: 'easy'}}}})});
  await floor(page, `today=${MID}`);
  const r = await page.evaluate(k => ({sold: Arcade.Tokens.catalog().filter(it => k.includes(it.key)).map(it => it.key),
    why: k.map(x => [Arcade.Tokens.canBuy(x).why, Arcade.Tokens.canBuy(x, {counter: 'quest'}).why]),
    unlock: k.map(x => { const [f, id] = x.split(':'); return Arcade.Avatar.items().find(i => i.field === f && i.id === id).unlock; })}), BONUS);
  expect(r.sold).toEqual([]);
  r.why.forEach(w => expect(w).toEqual(['unknown', 'unknown']));
  r.unlock.forEach(u => expect(u).toEqual({event: 'spooky'}));
  await page.locator('#prizeSign').click();
  await expect(page.locator('#prizes')).toBeVisible();
  for (const k of BONUS) await expect(page.locator(`#prizes [data-key="${k}"]`)).toHaveCount(0);
  await page.keyboard.press('Escape');
  // Arcade Quest's Token Booth: PLAYER ITEMS
  await page.goto(`arcade-quest/index.html?demo&test&today=${MID}`);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => { Arcade.Quest.talk.npc('terry'); });
  for (let i = 0; i < 40 && !(await page.locator('.q-booth .q-btn').count()); i++) {
    const t = page.locator('#qText:not([hidden])'); if (await t.count()) await t.click({force: true});
    await page.waitForTimeout(80);
  }
  await page.locator('.q-booth .q-btn', {hasText: 'Player items'}).click();
  await expect(page.locator('.q-cosshop')).toBeVisible();
  for (const n of ["Glowing jack-o'-lantern", 'Mummy wraps', 'Vampire cape', 'Floating bats', 'Candy Corn', "Lil' Reaper"]) {
    await expect(page.locator('.q-cosshop .q-btn', {hasText: n})).toHaveCount(0);
  }
  watch.check();
});

test('after the event a locked bonus item says "Returns next Spooky Season!" (requirement and the Locker)', async ({page}) => {
  const watch = await prepare(page, {store: store({})});
  await floor(page, `today=${AFTER}`);
  expect(await page.evaluate(() => Arcade.SeasonLobby.state().event)).toBeNull();
  const req = await page.evaluate(k => k.map(x => Arcade.Avatar.requirement(...x.split(':'))), BONUS);
  req.forEach(t => expect(t).toBe('Returns next Spooky Season!'));
  await page.evaluate(() => Arcade.LockerUI.open({tab: 'pets'}));
  await expect(page.locator('#locker .sk-opt[data-item="reaper"]')).toContainText('Returns next Spooky Season!');
  watch.check();
});

/** n stars in Note Storm's levels (device-wide stars count every key) */
const starGames = n => { const lv = {}; for (let i = 1; n > 0; i++) { lv[i] = {stars: Math.min(3, n), best: 90}; n -= 3; } return {'note-storm': {trumpet: lv}}; };
for (const date of ['2026-06-15', MID]) {
  test(`Smiley: locked at 24 ★, earned at 25 ★ with its UNLOCKED! card (${date})`, async ({page}) => {
    const watch = await prepare(page, {store: store({}, {games: starGames(24)})});
    await floor(page, `today=${date}`);
    const at24 = await page.evaluate(() => ({stars: Arcade.store.allStars('*'), open: Arcade.Avatar.isUnlocked('pet', 'smiley'), req: Arcade.Avatar.requirement('pet', 'smiley'), prog: Arcade.Avatar.progress('pet', 'smiley')}));
    expect(at24).toEqual({stars: 24, open: false, req: 'Earn 25 ★', prog: '24 of 25 ★ so far'});
    await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('bandarcade.v1')); a.games['note-storm'].trumpet[9] = {stars: 1, best: 40}; localStorage.setItem('bandarcade.v1', JSON.stringify(a)); });
    await floor(page, `today=${date}`);
    expect(await page.evaluate(() => [Arcade.store.allStars('*'), Arcade.Avatar.isUnlocked('pet', 'smiley')])).toEqual([25, true]);
    await page.evaluate(() => Arcade.Skins.catchUp('trumpet'));
    await expect(page.locator('.sk-catchup')).toContainText('Smiley');
    // never an event item, never sold, placed right after Note sprite
    const r = await page.evaluate(() => { const P = window.AVATAR_PARTS.PETS; const i = P.findIndex(p => p.id === 'smiley'); return {after: P[i - 1].id, unlock: P[i].unlock, sold: Arcade.Tokens.catalog().some(it => it.key === 'pet:smiley')}; });
    expect(r).toEqual({after: 'note', unlock: {stars: 25}, sold: false});
    watch.check();
  });
}

test('every new item: drawn at every size and view, theme tokens only, 8 × 8 pets, ids at the end of the TABLE, codes round-trip', async ({page}) => {
  const watch = await prepare(page, {store: store({})});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART && Arcade.avatarCode && Arcade.AvatarFx);
  const r = await page.evaluate(KEYS => {
    const P = window.AVATAR_PARTS, A = Arcade, out = {draw: [], tokens: [], pets: [], hands: [], table: {}, code: {}};
    const LIST = {hand: P.HANDS, top: P.TOPS, back: P.BACKS, effect: P.EFFECTS, plate: P.PLATES, pet: P.PETS};
    const css = t => getComputedStyle(document.documentElement).getPropertyValue('--' + t).trim();
    const base = A.Avatar.get();
    KEYS.forEach(k => {
      const [f, id] = k.split(':'), part = LIST[f].find(p => p.id === id), av = Object.assign({}, base, {[f]: id});
      if (!part) { out.draw.push(`${k}: no part`); return; }
      // tokens: every color the part names is defined in theme.css
      Object.values(part.pal || {}).concat(...Object.values((part.anim && part.anim.pal) || {})).forEach(t => { if (!css(t)) out.tokens.push(`${k} ${t}`); });
      if (f === 'plate') { const s = document.createElement('span'); s.className = 'av-plate av-plate-' + id; document.body.appendChild(s); if (getComputedStyle(s).backgroundImage === 'none') out.draw.push(`${k}: no CSS`); s.remove(); }
      else {
        ['chip', 'tile', 'big'].forEach(size => { if (!/src="data:image\/png/.test(A.avatarHTML({size, avatar: av, label: ''}))) out.draw.push(`${k} ${size}`); });
        const sp = A.Avatar.sprites('trumpet', {avatar: av});
        ['-front', '', '-back'].forEach(v => { if (!sp || !sp[v] || !sp[v].frames.length || sp[v].frames.some(c => !c.width)) out.draw.push(`${k} sprite${v || '-side'}`); });
        if (A.Avatar.bustFrames(av).some(c => !c.width)) out.draw.push(`${k} bust`);
      }
      if (f === 'effect' && !A.AvatarFx.FX.includes(id)) out.draw.push(`${k}: no effect drawing`);
      if (f === 'pet') {
        const all = [part.rows].concat((part.frames || []).filter(Boolean));
        if (all.some(rows => rows.length !== 8 || rows.some(r => r.length !== 8))) out.pets.push(`${k} not 8 × 8`);
        if (!part.seq || part.seq.length !== 4 || part.seq.some(i => i >= part.frames.length)) out.pets.push(`${k} seq`);
        all.forEach(rows => rows.join('').replace(/\./g, '').split('').forEach(ch => { if (!part.pal[ch]) out.pets.push(`${k} letter ${ch} has no color`); }));
      }
      if (f === 'hand') {                                    // a held item stays inside the picture, right of the face (x ≥ 26, like the other held items)
        const api = {px(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || x > 35 || y < 0 || y > 35 || (x < 26 && y > 9.5 && y < 25.5)) out.hands.push(`${k} ${x},${y}`); return api; },
          line(x0, y0, x1, y1) { api.px(x0, y0); api.px(x1, y1); return api; }};
        [0, 1, 2, 3].forEach(fr => part.bust(api, fr));
      }
      const row = A.avatarCode.TABLE.find(t => t[0] === f);
      out.table[k] = row[2].filter(v => KEYS.includes(f + ':' + v));      // in the TABLE (items added later go after them)
      const back = A.avatarCode.decode(A.avatarCode.encode(av));
      out.code[k] = back && (back.avatar || back)[f];
    });
    // all of them at once, too
    const all = Object.assign({}, base, {hand: 'jacklantern', top: 'mummywraps', back: 'vampcape', effect: 'floatbats', plate: 'candycorn', pet: 'reaper'});
    const b = A.avatarCode.decode(A.avatarCode.encode(all)); out.all = ['hand', 'top', 'back', 'effect', 'plate', 'pet'].map(f => (b.avatar || b)[f]);
    return out;
  }, NEW);
  expect(r.draw).toEqual([]);
  expect(r.tokens).toEqual([]);
  expect(r.pets).toEqual([]);
  expect(r.hands).toEqual([]);
  expect(r.table).toEqual({'hand:jacklantern': ['jacklantern'], 'top:mummywraps': ['mummywraps'], 'back:vampcape': ['vampcape'], 'effect:floatbats': ['floatbats'],
    'plate:candycorn': ['candycorn'], 'pet:reaper': ['reaper', 'smiley'], 'pet:smiley': ['reaper', 'smiley']});
  NEW.forEach(k => expect(r.code[k], k).toBe(k.split(':')[1]));
  expect(r.all).toEqual(['jacklantern', 'mummywraps', 'vampcape', 'floatbats', 'candycorn', 'reaper']);
  watch.check();
});

test('no flashing: the animated items change only a few pixels a frame; the bats never flash', async ({page}) => {
  const watch = await prepare(page, {store: store({})});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && Arcade.AvatarFx);
  const r = await page.evaluate(() => {
    const A = Arcade, lum = (d, i) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2]); };
    const px = (src, size) => { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.fillStyle = '#140f1f'; x.fillRect(0, 0, size, size); if (typeof src === 'function') src(x); else x.drawImage(src, 0, 0, size, size); return x.getImageData(0, 0, size, size).data; };
    const base = Object.assign(A.Avatar.get(), {bg: 'none', effect: 'none', pet: 'none', hand: 'none', back: 'none', top: 'tee'});
    const out = {items: {}, bats: null};
    // the 4 bust frames of each animated item: the share of the picture that changes from one frame to the next
    [['hand', 'jacklantern'], ['top', 'mummywraps'], ['back', 'vampcape'], ['pet', 'reaper'], ['pet', 'smiley']].forEach(([f, id]) => {
      const fr = A.Avatar.bustFrames(Object.assign({}, base, {[f]: id})).map(c => px(c, 36));
      let worst = 0;
      fr.forEach((d, i) => { const e = fr[(i + 1) % fr.length]; let n = 0; for (let p = 0; p < d.length; p += 4) if (Math.abs(lum(d, p) - lum(e, p)) > .1) n++; worst = Math.max(worst, n / (36 * 36)); });
      out.items[id] = {frames: fr.length, worst};
    });
    // the bats: 3 s at 30 fps, both layers; each frame's changed share, and each pixel's flashes (a rise + a fall)
    const S = 96, frames = [];
    for (let i = 0; i <= 90; i++) frames.push(px(x => { A.AvatarFx.draw(x, 'floatbats', S, i / 30, {layer: 'back'}); A.AvatarFx.draw(x, 'floatbats', S, i / 30, {layer: 'front'}); }, S));
    let worst = 0, maxFlash = 0; const last = new Float32Array(S * S), dir = new Int8Array(S * S), turns = new Uint16Array(S * S);
    frames.forEach((d, i) => {
      let n = 0;
      for (let p = 0, j = 0; p < d.length; p += 4, j++) {
        const L = lum(d, p);
        if (i) { const dl = L - last[j]; if (Math.abs(dl) > .1) { n++; const s = Math.sign(dl); if (dir[j] && s !== dir[j]) turns[j]++; dir[j] = s; } }
        last[j] = L;
      }
      if (i) worst = Math.max(worst, n / (S * S));
    });
    turns.forEach(t => { maxFlash = Math.max(maxFlash, t); });
    out.bats = {worst, flashesPerSecond: maxFlash / 3, still: frames[0].some((v, i) => i % 4 === 0 && v > 40)};
    return out;
  });
  Object.entries(r.items).forEach(([id, it]) => { expect(it.frames, id).toBe(4); expect(it.worst, id).toBeLessThan(.1); });
  expect(r.bats.worst).toBeLessThan(.1);
  expect(r.bats.flashesPerSecond).toBeLessThanOrEqual(3);
  expect(r.bats.still).toBe(true);                                                  // something is drawn
  watch.check();
});

for (const reduced of [false, true]) {
  test(`the Reaper, the bats and Smiley ${reduced ? 'are still with reduced motion' : 'move on the live avatar'}`, async ({page}) => {
    if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await prepare(page, {store: store({})});
    for (const [f, id] of [['pet', 'reaper'], ['effect', 'floatbats'], ['pet', 'smiley']]) {
      await page.goto('index.html?demo&nostart&unlockall');
      await page.waitForFunction(() => window.Arcade && Arcade.Avatar && Arcade.AvatarFx);
      await page.evaluate(([f, id]) => {
        const d = document.createElement('div'); d.id = 'fxTest'; d.style.cssText = 'position:fixed;left:20px;top:80px;width:260px;z-index:9999';
        d.innerHTML = Arcade.avatarHTML({size: 'big', avatar: Object.assign({}, Arcade.Avatar.get(), {effect: 'none', pet: 'none', [f]: id}), live: true, label: ''});
        document.body.appendChild(d);
      }, [f, id]);
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => Arcade.AvatarFx.state(document.querySelector('#fxTest .av-box')));
      if (f === 'effect') expect(st.fx, id).toBe(reduced ? null : id);
      else expect(st.body, id).toBe(!reduced);
    }
    watch.check();
  });
}

test('the event panel fits at phone, iPad and Chromebook sizes (locked and open); it scrolls, nothing sticks out', async ({page}) => {
  const watch = await prepare(page, {store: store(BUSY)});
  const sizes = [['phone', {width: 390, height: 844}], ...Object.entries(VIEWPORTS)];
  for (const q of [`season=spooky&today=${MID}`, `today=${MID}`]) {
    await floor(page, q);
    await openPanel(page);
    expect(await page.locator('.ev-bonus').count()).toBe(1);
    for (const [label, size] of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      expect(await offscreen(page), `${q} at ${label}`).toEqual([]);
      const fit = await page.evaluate(() => {
        const ov = document.querySelector('.ev-overlay'), pan = ov.querySelector('.ev-pan'), W = innerWidth, wide = [];
        pan.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) wide.push(el.className); });
        // the last thing in the panel can be scrolled into view
        const close = pan.querySelector('.ev-close'); close.scrollIntoView({block: 'nearest'}); const r = close.getBoundingClientRect();
        return {wide, closeVisible: r.top >= 0 && r.bottom <= innerHeight + 1};
      });
      expect(fit.wide, `${q} at ${label}`).toEqual([]);
      expect(fit.closeVisible, `${q} at ${label}`).toBe(true);
    }
    await page.setViewportSize(VIEWPORTS['Chromebook']);
    await page.keyboard.press('Escape');
  }
  watch.check();
});

test('GALLERY=1: a sheet of the 7 new items (bust frames, full body front / side / back) for Mat', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await prepare(page, {store: store({})});
  await page.setViewportSize({width: 1300, height: 1400});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART && Arcade.AvatarFx);
  await page.evaluate(KEYS => {
    const base = Object.assign(Arcade.Avatar.get(), {skin: 4, hair: 'short', hairColor: 'brown', head: 'none', top: 'tee', topColor: 'teal', pet: 'none', back: 'none', hand: 'none', effect: 'none', bg: 'midnight', plate: 'none', chair: false});
    const d = document.createElement('div'); d.id = 'sheet';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#140f1f;padding:12px;overflow:auto;color:#fff;font:14px sans-serif';
    const S = 3, cv = (src, w) => { const c = document.createElement('canvas'); c.width = c.height = w * S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w * S, w * S); c.style.cssText = 'margin:2px;background:#2a2340'; return c; };
    KEYS.forEach(k => {
      const [f, id] = k.split(':'), av = Object.assign({}, base, {[f]: id});
      const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:6px 0';
      row.innerHTML = `<b style="width:150px">${k}</b>`;
      if (f === 'plate') row.insertAdjacentHTML('beforeend', `<span class="av-plate av-plate-${id}" style="font-size:20px">${Arcade.Avatar.nameOf(av)}</span>`);
      else {
        if (f === 'effect') [0, 1.5, 3, 4.5].forEach(t => { const c = document.createElement('canvas'); c.width = c.height = 108; c.style.cssText = 'margin:2px;background:#2a2340'; const x = c.getContext('2d');
          Arcade.AvatarFx.draw(x, id, 108, t, {layer: 'back'}); x.imageSmoothingEnabled = false; x.drawImage(Arcade.Avatar.bustFrames(av)[0], 0, 0, 108, 108); Arcade.AvatarFx.draw(x, id, 108, t, {layer: 'front'}); row.appendChild(c); });
        else Arcade.Avatar.bustFrames(av).forEach(c => row.appendChild(cv(c, 36)));
        const sp = Arcade.Avatar.sprites('trumpet', {avatar: av});
        ['-front', '', '-back'].forEach(v => row.appendChild(cv(sp[v].frames[0], 32)));
      }
      d.appendChild(row);
    });
    document.body.appendChild(d);
  }, NEW);
  await page.locator('#sheet').screenshot({path: path.join(ROOT, 'docs/gallery', 'avatar-new-items.png')});
});
