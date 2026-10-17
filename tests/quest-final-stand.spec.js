/* ARCADE QUEST, EPISODE 2: THE FINAL STAND, THE HAMBURGER CHARM and QUICK PLAY (designed by a Raven Band student).
   THE FINAL STAND (THE BIG NUMBER's `finalStand`, data/enemies.js; battle.js, battle/dodge.js): it starts once, at
   10 % (a PLAY can't jump past it), on the band's turn; its 6 parts at 0, 10 … 50 s (the banner, the member lit, the
   hazards); the seconds left on screen; 2× damage (ASSIST halves it) and 2× speed (Easy still slows it); always aimed
   at you; surviving = the finale (HP 1, CALM full; HARMONIZE = the best ending); out of breath = Part 1 again at full
   HP, the band still at 10 %, never `outOfBreath`; the Easy / Assist tip after the 2nd try, once; its lines ≤ 80; the
   flash rule; reduced motion; its banner, countdown and card at phone / iPad / Chromebook sizes. The Ghost Conductor and
   Rico have none.
   THE HAMBURGER CHARM: found at the Main Stage's [1, 8] (standing on it, or facing it), before and after ep2Done,
   once; its icon in CHARMS; the secret wording before; × 2 your PLAY and each companion's hit; its save code place.
   QUICK PLAY: only while it's worn (also with no songs); 3 E♭s = 3 hits (?demo keys), 1 wrong = 2; the band plays
   once; the snare: 3 taps; the Final Stand's floor and the finale hold. GALLERY=1 saves docs/gallery/aq-final-stand/. */
const path = require('path');
const fs = require('fs');
const {test, expect} = require('@playwright/test');
const {prepare, device, ROOT} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'normal', assist: false};
const FULL = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
/** a save inside Episode 2 (the stage open, ricoDone), LV `level`, optionally with friends in the band and charms */
function save({level = 20, band = [], charms = {}, worn = [null, null], flags = {}} = {}) {
  return {v: 6, level, xp: 0, hp: 20 + (level - 1) * 4, maxHp: 20 + (level - 1) * 4, tokens: 100, items: {}, roster: band.slice(), battles: {won: 9, befriended: 4, faded: 5},
    world: {map: 'lobby', x: 21, y: 5, dir: 'up'}, converted: {}, charms: {owned: charms, equipped: worn}, band, route: {rico: 'befriend'}, ep: 2,
    flags: Object.assign({'seen-intro': true, pathsTip: true, ep1Done: true, ep2Start: true, rhythmTip: true, ricoDone: true, ricoDoor: true, 'met-bignumber': true}, flags),
    done: {'dressing:boss': 'befriend'}};
}
async function boot(page, s = save(), {url = 'arcade-quest/index.html?demo&test', settings = SETTINGS, member = 'trumpet', standIn = true} = {}) {
  const watch = await prepare(page, {store: device(member, {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings, keysTip: true}}})});
  await page.goto(url);
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName && (Arcade.Quest.sceneName !== 'world' || Arcade.Quest.world.state()));
  await page.evaluate(standIn => {
    const Q = Arcade.Quest;
    window.__lines = []; window.__said = []; window.__gos = [];
    const say = Q.say; Q.say = (l, o) => { const ls = [].concat(l).filter(Boolean); window.__lines.push(...ls); window.__said.push({name: o && o.name, lines: ls}); return say(l, o); };
    const go = Q.go; Q.go = (name, args) => { window.__gos.push(name === 'cutscene' ? 'cutscene:' + args.id : name); return go(name, args); };
    Q.micReady = async () => true;
    window.__play = {acc: 1, speed: 1, correct: 4, total: 4, success: true};
    if (standIn) Q.challenge.run = async (type, o) => (o && o.harmonize ? {acc: 1, speed: 1, correct: 8, total: 8, success: true} : Object.assign({}, window.__play));
  }, standIn);
  return watch;
}
const st = page => page.evaluate(() => Arcade.Quest.battleState());
const dodge = page => page.evaluate(() => Arcade.Quest.dodge.state());
const lines = page => page.evaluate(() => window.__lines.slice());
/** press A through text boxes until `done` (a page function) is true */
async function until(page, done, arg, max = 200) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(done, arg)) return;
    if (await page.locator('#qText:not([hidden])').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
  }
  throw new Error('never: ' + done.toString() + ' ' + JSON.stringify(await page.evaluate(() => ({b: Arcade.Quest.battleState(), d: Arcade.Quest.dodge.state(), scene: Arcade.Quest.sceneName}))));
}
const cmdReady = () => !!document.querySelector('#qCmd:not([hidden]) .q-btn');
const pick = (page, label) => page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l) && !x.disabled); if (!b) throw new Error('no ' + l); b.click(); }, label);
/** into THE BIG NUMBER (from the Test Arena), at the menu */
async function bigNumber(page, opts = {}) {
  await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => Arcade.Quest.go('battle', {enemy: 'bignumber', back: 'arena'}));
  await until(page, cmdReady);
}
/** the band at `share` of its HP, then a PLAY that would finish it: THE FINAL STAND is waiting */
async function toFloor(page, share = .3) {
  await page.evaluate(sh => Arcade.Quest.battleDemo.hp(Math.round(Arcade.Quest.battleState().ehp * sh)), share);
  await pick(page, 'PLAY');
  await until(page, () => Arcade.Quest.dodge.active());
}
/** keep the student's note safe (tests that aren't about getting hit): every hit is dropped before it lands */
const safe = page => page.evaluate(() => { const s = Arcade.Quest.dodge.start; Arcade.Quest.dodge.start = o => s(Object.assign({}, o, {onHit: () => {}})); });

/* ---------- THE FINAL STAND ---------- */
test.describe('THE FINAL STAND', () => {
  test('the data: 6 parts of 10 s (each a member, lit, a line ≤ 80), 2× damage and speed at 10 %; the Ghost Conductor and Rico have none', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const E = window.QUEST_ENEMIES, b = E.find(e => e.id === 'bignumber').finalStand, T = window.QUEST_TEXT;
      return {at: b.at, dmg: b.dmg, speed: b.speed, parts: b.parts.map(p => [p.seconds, p.who, p.lit, p.say.length, p.patterns.map(x => x.kind + (x.from ? ':' + x.from : '') + (x.dir ? ':' + x.dir : '') + (x.sprite === 'baton-shot' ? ':baton-shot' : ''))]),
        others: E.filter(e => e.id !== 'bignumber' && e.finalStand).map(e => e.id), text: ['fsOpen', 'fsCrack', 'fsRetry', 'fsTip', 'quickIntro', 'quickHit', 'quickMiss'].map(k => T[k].length),
        listen: E.find(e => e.id === 'bignumber').listen.slice(-1)[0]};
    });
    expect([r.at, r.dmg, r.speed]).toEqual([.1, 2, 2]);
    expect(r.parts.map(p => p[0])).toEqual([10, 10, 10, 10, 10, 10]);
    expect(r.parts.map(p => p[1])).toEqual(['Tubby Tusk', 'Snapjaw Sal', 'Maestro Moose', 'Professor Hoot', 'Rico Bandit', 'Maestro Moose']);
    expect(r.parts.map(p => p[2])).toEqual([0, 2, 4, 1, 3, -1]);
    expect(r.parts.map(p => p[4])).toEqual([['burst:center'], ['rings:drum'], ['aimed:baton-shot', 'baton'], ['measure:alt'], ['beam:sax'],
      ['burst:center', 'rings:drum', 'aimed:baton-shot', 'baton', 'measure:alt', 'beam:sax']]);
    r.parts.forEach(p => expect(p[3]).toBeLessThanOrEqual(80));
    r.text.forEach(n => expect(n).toBeLessThanOrEqual(80));
    expect(r.others).toEqual([]);
    expect(r.listen).toBe('Near the end they make a FINAL STAND: survive 60 seconds of their best!');
    watch.check();
  });

  test('it starts ONCE at 10 %: a PLAY from 30 % that would finish the band stops at 10 %, and the stand is the band\'s turn', async ({page}) => {
    const watch = await boot(page);
    await bigNumber(page);
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(Math.round(Arcade.Quest.battleState().ehp * .3)));
    await pick(page, 'PLAY');
    await until(page, () => (Arcade.Quest.battleState().fs || {}).pending || Arcade.Quest.dodge.active());
    const b = await st(page);
    expect(b.hp).toBe(Math.round(b.ehp * .1));                         // exactly the floor (20 of 196)
    expect(b.fs.floor).toBe(20);
    await until(page, () => Arcade.Quest.dodge.active());
    const d = await dodge(page);
    expect([d.parts, d.len, d.part]).toEqual([6, 60, 0]);
    expect(await lines(page)).toContain('This is it! Our FINAL STAND! Survive one whole minute of our best!');
    expect((await st(page)).fs).toMatchObject({active: true, pending: false});
    watch.check();
  });

  test('the 6 parts at 0, 10, 20, 30, 40, 50 s: the banner, the member lit, the hazards; the countdown on screen', async ({page}) => {
    test.setTimeout(90000);
    await page.clock.install();
    const watch = await boot(page);
    await bigNumber(page);
    await safe(page);
    await toFloor(page);
    const seen = [];
    // to `s` seconds into the stand (the dodge's own clock: the test clock also runs on by itself while the test works)
    const to = async s => { const t = (await dodge(page)).t; if (s > t) await page.clock.runFor(Math.round((s - t) * 1000)); };
    for (let p = 0; p < 6; p++) {
      await to(p * 10 + .6);
      const r = await page.evaluate(() => ({d: Arcade.Quest.dodge.state(), lit: Arcade.Quest.bandLit(), banner: document.getElementById('qFsBanner').textContent,
        bannerOn: !document.getElementById('qFsBanner').hidden, time: document.getElementById('qFsTime').textContent, timeOn: !document.getElementById('qFsTime').hidden}));
      // a few seconds into the part: what's in the box
      const things = new Set();
      for (let k = 0; k < 8; k++) {
        await to(p * 10 + 1.5 + k * .8);
        const d = await dodge(page);
        if (!d) throw new Error(`the stand ended at ${p * 10 + 1.5 + k * .8} s: ` + JSON.stringify(await st(page)));
        [].concat(d.sprites, d.fxFrom, d.measures.length ? ['measure'] : [], d.batons ? ['baton'] : [], d.warnRings ? ['warn'] : []).forEach(x => things.add(x));
      }
      seen.push({part: r.d.part, lit: r.lit, banner: r.banner, bannerOn: r.bannerOn, time: r.time, timeOn: r.timeOn, stuff: [...things]});
    }
    expect(seen.map(s => s.part)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(seen.map(s => s.lit)).toEqual([0, 2, 4, 1, 3, -1]);
    expect(seen.map(s => s.banner.split(' ').slice(0, 2).join(' '))).toEqual(['Tubby Tusk', 'Snapjaw Sal', 'Maestro Moose', 'Professor Hoot', 'Rico Bandit', 'Maestro Moose']);
    seen.forEach(s => { expect(s.bannerOn).toBe(true); expect(s.timeOn).toBe(true); expect(s.time).toMatch(/^Survive: \d+ s$/); });
    expect(seen[0].time).toMatch(/^Survive: (60|59) s$/);
    expect(seen[0].stuff.some(x => x === 'flurry-shot' || x === 'warn')).toBe(true);
    expect(seen[1].stuff).toContain('rings:drum');
    expect(seen[2].stuff).toContain('baton-shot');
    expect(seen[3].stuff).toContain('measure');
    expect(seen[4].stuff).toContain('beam:sax');
    watch.check();
  });

  // one test per setting (THE TIME BUDGET: 60 s a test)
  for (const [name, settings, hit, speed] of [['Normal', SETTINGS, 6, 2], ['ASSIST halves it', Object.assign({}, SETTINGS, {assist: true}), 3, 2],
    ['Dodging: Easy still slows it', Object.assign({}, SETTINGS, {dodge: 'easy'}), 6, 1.4]]) {
    test(`2× damage a hit, 2× speed (${name}); always aimed at you, never your band`, async ({page}) => {
      await page.clock.install();
      const watch = await boot(page, save({level: 60, band: ['spotlight', 'feedback']}), {settings});
      await bigNumber(page);
      await page.evaluate(() => { const s = Arcade.Quest.dodge.start; window.__hits = []; Arcade.Quest.dodge.start = o => s(Object.assign({}, o, {onHit: (d, b) => { window.__hits.push(d); return o.onHit(d, b); }})); });
      await toFloor(page);
      const band0 = (await st(page)).band;
      await page.clock.runFor(12000);                                  // standing still: Tubby's bursts and Sal's waves find you
      const r = await page.evaluate(() => ({hits: window.__hits, d: Arcade.Quest.dodge.state(), b: Arcade.Quest.battleState()}));
      expect(r.hits.length).toBeGreaterThan(0);
      expect([...new Set(r.hits)]).toEqual([hit]);                     // a stage hit is 3 (round(atk 2.6)): × 2
      expect(r.d.mult).toBeCloseTo(speed, 5);
      expect(r.b.aim).toBe('you');
      expect(r.b.band.map(c => c.hp)).toEqual(band0.map(c => c.hp));  // the band cheers you on: never hit
      watch.check();
    });
  }

  test('surviving 60 s: the static cracks, the finale at 1 HP with CALM full; HARMONIZE (the E♭ scale) = the best ending', async ({page}) => {
    test.setTimeout(90000);
    await page.clock.install();
    const watch = await boot(page, save(), {url: 'arcade-quest/index.html?demo&warp=stage'});
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state() && !Arcade.Quest.world.state().busy);
    await page.evaluate(() => Arcade.Quest.world.fight('boss'));
    await until(page, cmdReady);
    await safe(page);
    await toFloor(page);
    await page.clock.runFor(61000);
    await until(page, cmdReady);
    const b = await st(page);
    expect([b.hp, b.calm, b.fs.done, b.fs.finale]).toEqual([1, 100, true, true]);
    expect(await lines(page)).toEqual(expect.arrayContaining(['You made it! The static CRACKS, all the way across the stage!',
      'HARMONIZE to bring the band back, or play on and they power down to rest.']));
    expect(await page.evaluate(() => !document.querySelector('#qCmd .c-harm').disabled)).toBe(true);
    await pick(page, 'HARMONIZE');
    await until(page, () => window.__gos.includes('cutscene:ep2-ending'), null, 300);
    expect(await page.evaluate(() => Arcade.Quest.save.get().done['stage:boss'])).toBe('befriend');
    watch.check();
  });

  test('out of breath: Part 1 again at full HP, the band still at 10 %; never outOfBreath; the Easy / Assist tip after the 2nd try, once', async ({page}) => {
    test.setTimeout(90000);
    await page.clock.install();
    const watch = await boot(page);
    await bigNumber(page);
    // every try: knocked out 2 s in
    await page.evaluate(() => { const s = Arcade.Quest.dodge.start; window.__tries = 0; Arcade.Quest.dodge.start = o => { window.__tries++; const p = s(o); if (o.parts && window.__tries <= 3) setTimeout(() => o.onHit(9999, false) === 'stop' && Arcade.Quest.dodge.end(), 2000); return p; }; });
    await toFloor(page);
    const tip = 'Tip: Settings → Dodging: Easy, or Assist, makes it gentler.', retry = 'The band holds the last chord... Catch your breath. Try the Final Stand again!';
    for (let k = 1; k <= 3; k++) {
      await page.clock.runFor(2500);
      await until(page, k => Arcade.Quest.battleState().fs.tries === k, k);
      const b = await st(page);
      expect([b.php, b.hp, b.state]).toEqual([b.maxHp, b.fs.floor, 'fight']);
      await until(page, k => Arcade.Quest.dodge.active() && window.__tries === k + 1, k);
      expect((await dodge(page)).part).toBe(0);                        // from Part 1
      expect((await lines(page)).filter(l => l === tip).length, `after try ${k}`).toBe(k >= 2 ? 1 : 0);
    }
    expect((await lines(page)).filter(l => l === retry).length).toBe(3);
    expect(await lines(page)).not.toContain('You\'re out of breath! Time to rest up and try again.');
    expect(await page.evaluate(() => Arcade.Quest.sceneName)).toBe('battle');
    watch.check();
  });

  test('the flash rule, measured: 3 s of each part (the drums\' shockwaves, everyone at once)', {tag: '@slow'}, async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'the frame-by-frame measurement runs in Chromium');
    test.setTimeout(300000);
    await page.setViewportSize({width: 640, height: 400});
    await page.clock.install();
    const watch = await boot(page);
    await bigNumber(page);
    await safe(page);
    // the hazards, not your note: standing still it's hit, and a hit's own small shake (once per 0.9 s) isn't a hazard
    await page.evaluate(() => { Arcade.Quest.shake = () => {}; });
    await toFloor(page);
    for (const [name, at] of [1, 2, 3, 4, 5, 6].map(n => ['Part ' + n, n === 1 ? 1000 : 6950])) {
      await page.clock.runFor(at);
      const r = await measure(page, 3000);
      expect(r.worst, `${name}: a cell swung 3 times within a second ${JSON.stringify(r.where)}`).toBeLessThanOrEqual(2);
    }
    watch.check();
  });

  test('reduced motion: the batons don\'t spin, the drums don\'t shake (the same hazards)', {tag: '@quick'}, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await boot(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d');
      const shot = t => { x.clearRect(0, 0, 8, 8); Q.draw(x, 'baton-shot', 0, 0, {t}); return c.toDataURL(); };
      return {reduced: Q.reduced(), same: shot(0) === shot(130) && shot(0) === shot(260), frames: Q.spriteDef('baton-shot').frames.length};
    });
    expect(r).toEqual({reduced: true, same: true, frames: 4});
    watch.check();
  });

  for (const [name, size] of [['phone', {width: 390, height: 844}], ['iPad landscape', {width: 1180, height: 820}], ['iPad portrait', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
    test(`the FINAL STAND card, the banner and the countdown fit at ${name} size`, async ({page}) => {
      await page.setViewportSize(size);
      await page.clock.install();
      const watch = await boot(page);
      await bigNumber(page);
      await safe(page);
      await page.evaluate(sh => Arcade.Quest.battleDemo.hp(Math.round(Arcade.Quest.battleState().ehp * sh)), .3);
      await pick(page, 'PLAY');
      await until(page, () => !!document.querySelector('.q-fs-card'));
      const fit = sel => page.evaluate(sel => {
        const e = document.querySelector(sel), r = e.getBoundingClientRect(), s = document.getElementById('screen').getBoundingClientRect();
        return {in: r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1, clip: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1};
      }, sel);
      expect(await fit('.q-fs-card b')).toEqual({in: true, clip: false});
      await until(page, () => Arcade.Quest.dodge.active());
      await page.clock.runFor(300);
      for (const p of [0, 5]) {                                        // the longest banners: Tubby's and everyone's
        if (p) await page.clock.runFor(50000);
        expect(await fit('#qFsBanner'), `banner ${p}`).toEqual({in: true, clip: false});
        expect(await fit('#qFsTime'), `countdown ${p}`).toEqual({in: true, clip: false});
        // the banner never covers the dodge box
        expect(await page.evaluate(() => { const b = document.getElementById('qFsBanner').getBoundingClientRect(), c = document.getElementById('screen').getBoundingClientRect(), k = c.width / 320;
          return b.right <= c.left + 100 * k + 1; })).toBe(true);
      }
      watch.check();
    });
  }
});

/* ---------- THE HAMBURGER CHARM ---------- */
test.describe('THE HAMBURGER CHARM', () => {
  for (const [when, flags] of [['before THE BIG NUMBER', {}], ['after it (ep2Done)', {ep2Done: true}]]) {
    test(`found at the Main Stage's [1, 8] ${when}, standing in the corner; once only`, async ({page}) => {
      const s = save({flags}); if (flags.ep2Done) Object.assign(s.done, {'stage:boss': 'befriend'});
      const watch = await boot(page, s, {url: 'arcade-quest/index.html?demo&warp=stage'});
      const idle = () => page.waitForFunction(() => { const w = Arcade.Quest.world.state(); return w && !w.busy && !document.querySelector('#qText:not([hidden])'); });
      await idle();
      expect(await page.evaluate(() => Arcade.Quest.charms.owned('hamburger'))).toBe(false);
      await page.evaluate(() => Arcade.Quest.world.warp(1, 8, 'left'));            // hugging the wall in the corner
      await page.keyboard.press('Enter');
      for (let i = 0; i < 10 && !(await page.evaluate(() => Arcade.Quest.charms.owned('hamburger'))); i++) await page.waitForTimeout(100);
      for (let i = 0; i < 10 && (await page.locator('#qText:not([hidden])').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
      await idle();
      expect(await page.evaluate(() => Arcade.Quest.charms.owned('hamburger'))).toBe(true);
      expect(await lines(page)).toEqual(expect.arrayContaining(['Something crunches underfoot. Wedged in the corner: a tiny golden hamburger!',
        expect.stringContaining('You found a charm: the Hamburger Charm!')]));
      await page.evaluate(() => { window.__lines.length = 0; });
      await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      expect(await lines(page)).toEqual([]);                                       // once only: nothing more there
      watch.check();
    });
  }

  test('facing the corner from beside it finds it too; no twinkle and no talk bubble give it away; a 3-pixel crumb is its only clue', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save(), {url: 'arcade-quest/index.html?demo&warp=stage'});
    await page.waitForFunction(() => { const w = Arcade.Quest.world.state(); return w && !w.busy && !document.querySelector('#qText:not([hidden])'); });
    const r = await page.evaluate(() => {
      const M = window.QUEST_MAPS.stage, th = M.things.find(t => t.charm === 'hamburger'), crumb = M.props.find(p => p.sprite === 'burger-crumb');
      return {th, crumb, d: Arcade.Quest.spriteDef('burger-crumb'), tile: M.tiles[8][1]};
    });
    expect(r.th).toMatchObject({at: [1, 8], secret: true, found: 'stage-burger-found'});
    expect(r.th.say).toBeUndefined();
    expect(r.crumb).toMatchObject({at: [1, 8], if: '!charm:hamburger'});
    expect([r.d.w, r.d.h]).toEqual([3, 2]);
    expect(r.tile).toBe('G');                                                       // the boards: you can stand there
    await page.evaluate(() => Arcade.Quest.world.warp(2, 8, 'left'));
    await page.keyboard.press('Enter');
    await until(page, () => Arcade.Quest.charms.owned('hamburger'));
    watch.check();
  });

  test('CHARMS: the secret wording before it\'s found (never the room), then its burger icon and its words', async ({page}) => {
    const watch = await boot(page, save(), {url: 'arcade-quest/index.html?demo&warp=lobby'});
    await page.waitForFunction(() => { const w = Arcade.Quest.world.state(); return w && !w.busy; });
    const row = () => page.evaluate(() => { const b = [...document.querySelectorAll('.q-charms .q-btn')].find(x => x.textContent.includes('Hamburger Charm'));
      return b && {sub: b.querySelector('small').textContent, pic: !!b.querySelector('canvas.q-bpic'), disabled: b.disabled}; });
    page.evaluate(() => Arcade.Quest.talk.charms()).catch(() => {});
    await expect(page.locator('.q-charms')).toBeVisible();
    expect(await row()).toEqual({sub: 'A secret somewhere on the Main Stage...', pic: false, disabled: true});
    expect(await page.locator('.q-charms').textContent()).not.toMatch(/hidden in The Main Stage/);
    await page.locator('.q-charms .q-btn', {hasText: 'Done'}).click();
    await page.evaluate(() => { Arcade.Quest.charms.give('hamburger'); });
    page.evaluate(() => Arcade.Quest.talk.charms()).catch(() => {});
    await expect(page.locator('.q-charms')).toBeVisible();
    expect(await row()).toEqual({sub: 'Your band hits twice as hard. Unlocks QUICK PLAY: 3 E♭s, 3 hits!', pic: true, disabled: false});
    const icon = await page.evaluate(() => { const c = document.querySelector('.q-charms canvas.q-bpic'); return [c.width, c.height, c.getBoundingClientRect().width > 0]; });
    expect(icon).toEqual([12, 10, true]);
    watch.check();
  });

  test('wearing it: your PLAY and each companion\'s hit × 2', async ({browser}) => {
    const run = async worn => {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      const watch = await boot(page, save({level: 12, band: ['spotlight'], charms: {hamburger: true}, worn: worn ? ['hamburger', null] : [null, null]}));
      await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
      await page.evaluate(() => { window.__play = {acc: .6, speed: 1, correct: 2, total: 4, success: false}; Arcade.Quest.go('battle', {enemy: 'squawk', back: 'arena'}); });
      await until(page, cmdReady);
      await page.evaluate(() => { Arcade.Quest.battleDemo.hp(9999); Math.random = () => .99; });   // (no lucky crits)
      await pick(page, 'PLAY');
      if (worn) { await until(page, () => !!document.querySelector('#qCmd .q-btn.c-back')); await pick(page, 'PLAY'); }   // its menu: the regular PLAY
      await until(page, () => window.__lines.some(l => /plays along|joins in|hits/.test(l)) && !document.querySelector('#qText:not([hidden])') || Arcade.Quest.dodge.active());
      const r = await page.evaluate(() => ({hp: Arcade.Quest.battleState().hp, band: window.__lines.filter(l => /\d/.test(l))}));
      watch.check();
      await ctx.close();
      return 9999 - r.hp;
    };
    const plain = await run(false);
    const doubled = await run(true);
    expect(plain).toBeGreaterThan(0);
    expect(Math.abs(doubled - 2 * plain)).toBeLessThanOrEqual(2);                  // (each part rounded)
  });

  test('its save code place: the 4th of QUEST_V6.charms; owned and worn round-trip; every older code still loads as before', {tag: '@quick'}, async ({page}) => {
    const watch = await boot(page, save({charms: {hamburger: true, 'rosin-pouch': true}, worn: ['hamburger', 'rosin-pouch']}));
    const old = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/quest-codes.json'), 'utf8'));
    const routes = fs.readdirSync(path.join(ROOT, 'tests/fixtures/quest-ep2-routes')).map(f => fs.readFileSync(path.join(ROOT, 'tests/fixtures/quest-ep2-routes', f), 'utf8').trim());
    const r = await page.evaluate(([old, routes]) => {
      const B = Arcade.Backup, Q = Arcade.Quest, code = Q.save.code(), f = B.questDecode(code).fields;
      const codes = [].concat(...Object.values(old).map(v => (typeof v === 'string' ? [v] : Object.values(v).filter(x => typeof x === 'string' || (x && x.code)).map(x => x.code || x)))).filter(c => typeof c === 'string' && c.length >= 25);
      const decoded = codes.concat(routes).map(c => B.questDecode(c)).filter(d => d.ok);
      return {place: B.QUEST_V6.charms.indexOf('hamburger'), list: B.QUEST_V6.charms, owned: f.charms.owned, eq: f.charms.equipped, len: code.length, n: decoded.length,
        anyBurger: decoded.some(d => d.fields.charms && d.fields.charms.owned.hamburger)};
    }, [old, routes]);
    expect(r.list).toEqual(['metronome-ticker', 'rosin-pouch', 'ricos-pick', 'hamburger']);
    expect(r.place).toBe(3);
    expect(r.len).toBe(routes[0].length);                                          // the same version 6, the same length
    expect(r.owned).toMatchObject({hamburger: true, 'rosin-pouch': true});
    expect(r.eq).toEqual(['hamburger', 'rosin-pouch']);
    expect(r.n).toBeGreaterThan(18);
    expect(r.anyBurger).toBe(false);                                               // its bit was always 0
    watch.check();
  });
});

/* ---------- QUICK PLAY ---------- */
test.describe('QUICK PLAY', () => {
  const into = async (page, s, enemy = 'squawk', opts = {}) => {
    const watch = await boot(page, s, Object.assign({standIn: false}, opts));
    await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
    await page.evaluate(e => { Arcade.Quest.micReady = async () => true; Arcade.Quest.go('battle', {enemy: e, back: 'arena'}); }, enemy);
    await until(page, cmdReady);
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(9999));
    return watch;
  };
  /** three separate E♭s (?demo: Space, released between: a held note is one note, as with a real horn) */
  const threeEbs = async page => {
    for (let k = 0; k < 3; k++) { await page.keyboard.down(' '); await page.waitForTimeout(600); await page.keyboard.up(' '); await page.waitForTimeout(250); }
    await page.waitForFunction(() => !document.querySelector('.q-chal'), null, {timeout: 20000});
  };
  const menu = page => page.evaluate(() => [...document.querySelectorAll('#qCmd .q-btn .q-bl')].map(b => b.textContent));

  test('only in PLAY\'s menu while the Hamburger Charm is worn (also with no songs learned)', async ({page, browser}) => {
    const ctx = await browser.newContext(), first = await ctx.newPage();
    let watch = await into(first, save({charms: {hamburger: true}}));
    await pick(first, 'PLAY');
    await first.waitForTimeout(300);
    expect(await first.locator('.q-chal').count(), 'not worn: PLAY goes straight to its challenge').toBe(1);
    watch.check();
    await ctx.close();
    watch = await into(page, save({charms: {hamburger: true}, worn: ['hamburger', null]}));
    await pick(page, 'PLAY');
    await expect(page.locator('#qCmd .q-btn', {hasText: 'QUICK PLAY'})).toBeVisible();
    expect((await menu(page)).slice(1)).toEqual(['QUICK PLAY', 'Back']);             // (the first: this foe's own challenge)
    expect(await page.locator('#qCmd .q-btn', {hasText: 'QUICK PLAY'}).locator('small').textContent()).toBe('3 E♭s, 3 hits');
    watch.check();
  });

  test('3 E♭s (written F4 for the trumpet) = 3 hits, each its own float and line; your band plays ONCE', async ({page}) => {
    const watch = await into(page, save({level: 12, band: ['spotlight'], charms: {hamburger: true}, worn: ['hamburger', null]}));
    await page.evaluate(() => { const b = Arcade.buildSequence; Arcade.buildSequence = o => (window.__seq = b(o)); });
    await page.evaluate(() => { window.__floats = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('q-float') && window.__floats.push(n.textContent)))).observe(Arcade.Quest.ui, {childList: true}); });
    await pick(page, 'PLAY'); await pick(page, 'QUICK PLAY');
    await expect(page.locator('.q-chal')).toBeVisible();
    expect(await page.locator('.q-chal-t').textContent()).toContain('Concert E♭, three times');
    expect(await page.evaluate(() => window.__seq.items[0].show.letter + window.__seq.items[0].show.oct)).toBe('F4');
    expect(await page.locator('#qStaff svg .q-cur, #qStaff svg [id^="qn"]').count()).toBeGreaterThanOrEqual(3);
    await threeEbs(page);
    await until(page, () => window.__lines.some(l => /QUICK PLAY hit 3/.test(l)));
    const l = await lines(page);
    expect(l.filter(x => /^QUICK PLAY hit \d/.test(x)).length).toBe(3);
    expect(l.filter(x => /^Spotlight Sprite .*takes \d/.test(x)).length).toBe(1); // the band: once, after the third
    const hits = l.filter(x => /^QUICK PLAY hit \d/.test(x)).map(x => '-' + /takes (\d+)/.exec(x)[1]);
    await page.waitForTimeout(900);                                                 // (the floats come 0.3 s apart)
    const floats = await page.evaluate(() => window.__floats);
    hits.forEach(h => { const k = floats.indexOf(h); expect(k, `a float for ${h}`).toBeGreaterThanOrEqual(0); floats.splice(k, 1); });   // a float for each
    watch.check();
  });

  test('1 wrong note = 2 hits (that one is a miss)', async ({page}) => {
    const watch = await into(page, save({level: 12, charms: {hamburger: true}, worn: ['hamburger', null]}));
    await pick(page, 'PLAY'); await pick(page, 'QUICK PLAY');
    await expect(page.locator('.q-chal')).toBeVisible();
    await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w');
    await threeEbs(page);
    await until(page, () => window.__lines.some(l => /QUICK PLAY (hit|note)/.test(l)) && !document.querySelector('#qText:not([hidden])') || Arcade.Quest.dodge.active());
    const l = await lines(page);
    expect(l.filter(x => /^QUICK PLAY hit \d/.test(x)).length).toBe(2);
    expect(l).toContain('QUICK PLAY note 1 missed.');
    watch.check();
  });

  test('the snare: 3 clean taps', async ({page}) => {
    const watch = await into(page, save({level: 12, charms: {hamburger: true}, worn: ['hamburger', null]}), 'squawk', {member: 'snare'});
    await pick(page, 'PLAY'); await pick(page, 'QUICK PLAY');
    await expect(page.locator('.q-chal')).toBeVisible();
    expect(await page.locator('.q-chal-t').textContent()).toContain('3 clean taps');
    for (let k = 0; k < 3; k++) { await page.keyboard.press('t'); await page.waitForTimeout(350); }
    await until(page, () => window.__lines.filter(l => /^QUICK PLAY hit/.test(l)).length === 3, null, 300);
    watch.check();
  });

  test('it can\'t skip THE FINAL STAND\'s floor or the finale', async ({page}) => {
    test.setTimeout(90000);
    await page.clock.install();
    const watch = await boot(page, save({level: 60, charms: {hamburger: true}, worn: ['hamburger', null]}), {standIn: false});
    await bigNumber(page);
    await page.evaluate(() => Arcade.Quest.battleDemo.hp(Math.round(Arcade.Quest.battleState().ehp * .3)));
    await page.evaluate(() => { Arcade.Quest.challenge.quick = async () => ({acc: 1, speed: 1, correct: 3, total: 3, hits: [true, true, true]}); });
    await pick(page, 'PLAY'); await pick(page, 'QUICK PLAY');
    await until(page, () => Arcade.Quest.battleState().fs.pending || Arcade.Quest.dodge.active());
    expect((await st(page)).hp).toBe(20);
    await safe(page);
    await until(page, () => Arcade.Quest.dodge.active());
    await page.clock.runFor(61000);
    await until(page, cmdReady);
    expect((await st(page)).hp).toBe(1);
    // the finale: QUICK PLAY's first hit can't end it in the PLAY that... it's already the finale: the next one plays on
    await pick(page, 'PLAY'); await pick(page, 'QUICK PLAY');
    await until(page, () => Arcade.Quest.battleState() && Arcade.Quest.battleState().state === 'fading' || window.__gos.includes('cutscene:ep2-ending-fade'), null, 300);
    watch.check();
  });
});

/* ---------- GALLERY=1: one picture of each part, the burger icon and the corner (docs/gallery/aq-final-stand/) ---------- */
test('GALLERY=1: THE FINAL STAND\'s 6 parts, the Hamburger Charm\'s icon and its corner', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  test.setTimeout(120000);
  const OUT = path.join(ROOT, 'docs/gallery/aq-final-stand');
  fs.mkdirSync(OUT, {recursive: true});
  await page.setViewportSize({width: 1180, height: 820});
  await page.clock.install();
  const watch = await boot(page);
  await bigNumber(page);
  await safe(page);
  await toFloor(page);
  for (let p = 0; p < 6; p++) {
    const t = (await dodge(page)).t;                                 // (the dodge's own clock)
    await page.clock.runFor(Math.round((p * 10 + 3 - t) * 1000));
    await page.locator('#screen').screenshot({path: path.join(OUT, `part-${p + 1}.png`)});
  }
  // the burger icon, big, and the found message
  await page.evaluate(() => {
    const Q = Arcade.Quest, sheet = document.createElement('div'); sheet.id = 'burger';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1d1830;display:flex;gap:24px;align-items:center;justify-content:center';
    [2, 4, 8].forEach(s => { const c = document.createElement('canvas'), d = Q.spriteDef('charm-burger'); c.width = d.w * s; c.height = d.h * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; Q.draw(x, 'charm-burger', 0, 0, {scale: s}); sheet.appendChild(c); });
    document.body.appendChild(sheet);
  });
  await page.locator('#burger').screenshot({path: path.join(OUT, 'burger-icon.png')});
  watch.check();
  // the corner of the Main Stage (the crumb)
  const w2 = await boot(page, save(), {url: 'arcade-quest/index.html?demo&warp=stage'});
  await page.clock.runFor(1500);
  await page.evaluate(() => { Arcade.Quest.world.warp(4, 7, 'left'); const t = document.getElementById('qText'); if (t) t.hidden = true; });
  await page.clock.runFor(800);
  await page.locator('#screen').screenshot({path: path.join(OUT, 'the-corner.png')});
  w2.check();
});

/* the flash rule's measurement (tests/quest-ep2-finale.spec.js's technique): the page on the test clock, a screenshot
   every 50 ms; a cell "swings" when its luminance changes by ≥ 0.1 after turning the other way; never 3 swings in a
   second. The grid is 8 × 5, not the finale's 16 × 10: at 2× speed the hazards (the baton's sweep, the measures) MOVE
   across a 40-pixel cell faster than that, though nothing blinks; an 80-pixel cell is still far smaller than WCAG's
   flash area (a quarter of 10° of view, about a third of this screen each way). */
const GRID = {w: 8, h: 5};
async function grid(page, CW, CH) {
  const png = await page.screenshot();
  return page.evaluate(async ([b64, o]) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = document.createElement('canvas');
    const {CW, CH} = o; c.width = CW * 8; c.height = CH * 8;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data, f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const cells = new Array(CW * CH).fill(0);
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const i = (py * c.width + px) * 4;
      cells[Math.floor(py / 8) * CW + Math.floor(px / 8)] += (.2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2])) / 64;
    }
    return cells;
  }, [png.toString('base64'), {CW, CH}]);
}
async function measure(page, totalMs, stepMs = 50, CW = GRID.w, CH = GRID.h) {
  const frames = [];
  for (let t = 0; t <= totalMs; t += stepMs) { frames.push([t, await grid(page, CW, CH)]); await page.clock.runFor(stepMs); }
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
