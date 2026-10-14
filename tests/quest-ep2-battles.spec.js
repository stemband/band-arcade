/* ARCADE QUEST, EPISODE 2, build step 2 (docs/games/arcade-quest-ep2-plan.md): THE RHYTHM FAMILY (RHYTHM, TEMPO,
   ECHO in battle/challenges.js, from the shared rhythm code), THE E♭ ENCORE (Professor Hoot's lesson and its PLAY
   choice), and THE 8 SHOWTIME MACHINES in the Test Arena (?set=2), each befriended and powered down with its own dodge.
   The student's hits stand in through Q.rhythm.hit (?demo: a hit at a performance time, as if heard), the snare's
   through Arcade.Onsets.fake, the bells' through the pitch engine's Space key. Fast: no test waits a whole battle's
   real dodge (the real dodge runs, stepped by the test). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SETTINGS = {textSpeed: 'instant', dodge: 'easy', assist: false};
const MACHINES = ['tapsy', 'spotlight', 'feedback', 'confetti', 'metrognome', 'stubs', 'ropeknot', 'miclet'];

/** the Test Arena's Showtime machines, for one instrument (assist: ASSIST MODE on) */
async function arena(page, member = 'trumpet', {assist = false} = {}) {
  const watch = await prepare(page, {store: device(member, {avatarOffered: true, gameData: {'arcade-quest': {settings: Object.assign({}, SETTINGS, {assist}), keysTip: true}}})});
  await page.goto('arcade-quest/index.html?demo&test&set=2');
  await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'arena');
  await page.evaluate(() => {
    const Q = Arcade.Quest;
    Q.micReady = async () => true;
    window.__foe = id => window.QUEST_ENEMIES.find(e => e.id === id);
    window.__lines = [];
    const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
  });
  return watch;
}
/** start a challenge (Q.challenge.run) against a machine (with changes); the result lands in window.__res */
const run = (page, type, id, extra = {}, opts = {}) => page.evaluate(([type, id, extra, opts]) => {
  window.__res = null;
  const e = Object.assign({}, window.__foe(id), extra);
  Arcade.Quest.challenge.run(type, Object.assign({enemy: e}, opts)).then(r => { window.__res = r; });
}, [type, id, extra, opts]);
const rs = page => page.evaluate(() => Arcade.Quest.rhythm.state());
const result = async page => { await page.waitForFunction(() => window.__res, null, {timeout: 20000}); return page.evaluate(() => window.__res); };
/** wait for the count-off to start (the clock is known), then hit every note `offMs` off (fn(i) for a per-note offset) */
async function playAll(page, off = 0, {skip = [], extra = []} = {}) {
  await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.T0p && (s.phase === 'count' || s.phase === 'play'); }, null, {timeout: 15000});
  const st = await rs(page);
  await page.evaluate(([st, offs, skip, extra]) => {
    st.targets.forEach((t, i) => { if (!skip.includes(i)) Arcade.Quest.rhythm.hit(st.T0p + t * 1000 + st.lagMs + offs[i]); });
    extra.forEach(ms => Arcade.Quest.rhythm.hit(st.T0p + ms + st.lagMs));
  }, [st, st.targets.map((_, i) => (typeof off === 'function' ? off(i) : off)), skip, extra]);
  return st;
}

test.describe('THE RHYTHM PATTERNS (data/rhythms.js)', () => {
  test('every pattern parses as one measure, has at least 3 notes (echo2: 2) and keeps to its tier', {tag: '@quick'}, async ({page}) => {
    const watch = await arena(page);
    const bad = await page.evaluate(() => {
      const R = window.QUEST_RHYTHMS, C = Arcade.Counting, out = [];
      const ALLOW = {1: ['q', 'h', 'qr'], 2: ['q', 'h', 'qr', 'e'], 3: ['q', 'h', 'qr', 'e', 'q.', 'er'], echo2: ['q', 'e']};
      Object.keys(ALLOW).forEach(tier => {
        if (tier !== 'echo2' && R[tier].length < 8) out.push(`tier ${tier}: only ${R[tier].length}`);
        R[tier].forEach(text => {
          const time = tier === 'echo2' ? '2/4' : '4/4', p = C.parse(text, time), notes = p.notes.filter(n => !n.rest).length;
          if (p.errors.length) out.push(`${text}: ${p.errors.join(', ')}`);
          if (p.total !== p.meter.per) out.push(`${text}: not one measure`);
          if (notes < (tier === 'echo2' ? 2 : 3)) out.push(`${text}: ${notes} notes`);
          text.split(/\s+/).forEach(tok => { if (!ALLOW[tier].includes(tok)) out.push(`${text}: ${tok} in tier ${tier}`); });
          if (tier === '2') {                                    // eighths in pairs, on the beat
            p.notes.forEach((n, i) => { if (n.d === 6 && n.t % 12 === 0 && !(p.notes[i + 1] && p.notes[i + 1].d === 6 && !p.notes[i + 1].rest && !n.rest)) out.push(`${text}: a lone eighth`); });
          }
        });
      });
      return out;
    });
    expect(bad).toEqual([]);
    watch.check();
  });
});

test.describe('RHYTHM: read a measure and play it', () => {
  test('on time = PERFECT (≥ .95, a critical); 150 ms late scores lower; extras cost .1; a missed note counts', async ({page}) => {
    const watch = await arena(page);
    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q'});
    const st = await playAll(page, 0);
    expect(st.kind).toBe('rhythm');
    expect(st.targets.length).toBe(4);
    await expect(page.locator('.q-rhy .q-rstaff svg')).toBeVisible();                  // the staff, with counting
    await expect(page.locator('.q-rhy .q-rstaff g.rn').first()).toBeVisible();
    const good = await result(page);
    expect(good.acc).toBeGreaterThanOrEqual(.95);
    expect(good.speed).toBe(1);                                                        // all PERFECT/GOOD: a critical
    expect(good.correct).toBe(4);

    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q'});
    await playAll(page, 150);
    const late = await result(page);
    expect(late.acc).toBeLessThan(good.acc);
    expect(late.acc).toBeGreaterThan(0);

    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q'});
    await playAll(page, 0, {skip: [3], extra: [1700]});                               // one missed, one extra hit (between notes)
    const miss = await result(page);
    expect(miss.correct).toBe(3);
    expect(miss.acc).toBeCloseTo(3 / 4 - .1, 2);
    watch.check();
  });

  test('the count-off: hits before the first note never count, no sound mutes the detector, ASSIST widens the windows', async ({page}) => {
    const watch = await arena(page, 'trumpet', {assist: true});
    await page.evaluate(() => { window.__ev = 0; const e = Arcade.Sfx.event; Arcade.Sfx.event = function () { window.__ev++; return e.apply(this, arguments); }; });
    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q'});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.phase === 'count' && s.T0p; });
    const st = await rs(page);
    expect(st.clicks.length).toBe(4);                                                  // one measure of clicks, then none (no `click`)
    expect(st.windows.goodMs).toBeCloseTo(140 * 1.35, 0);
    // the count-off: hit on every click (as if counting along out loud)
    await page.evaluate(st => st.clicks.forEach(c => Arcade.Quest.rhythm.hit(c + st.lagMs)), st);
    expect((await rs(page)).hits).toBe(0);
    expect(await page.evaluate(() => Arcade.Pitch.isSuppressed(performance.now()))).toBe(false);
    expect(await page.evaluate(() => Arcade.Pitch.paused)).toBe(false);                 // listening (the mic never paused for the clicks)
    await page.evaluate(st => st.targets.forEach(t => Arcade.Quest.rhythm.hit(st.T0p + t * 1000 + st.lagMs)), st);
    const r = await result(page);
    expect(r.acc).toBeGreaterThanOrEqual(.95);
    expect(await page.evaluate(() => window.__ev)).toBe(0);                            // the clicks never went through Sfx.event
    watch.check();
  });

  test('the bleed rule (a machine with `click: true`): a quiet hit right on a click is the speaker, a loud one is you', async ({page}) => {
    const watch = await arena(page);
    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q', click: true});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.phase === 'count' && s.T0p; });
    const st = await rs(page);
    expect(st.clicks.length).toBe(8);                                                  // the click keeps going under the measure
    await page.evaluate(st => st.clicks.slice(0, 4).forEach(c => Arcade.Quest.rhythm.hit(c + 10, .02)), st);   // the count-off teaches the bleed
    expect((await rs(page)).bleed).toBeCloseTo(.02, 3);
    await page.evaluate(st => {
      Arcade.Quest.rhythm.hit(st.clicks[4] + 10, .03);                                 // beat 1: the click coming back (≤ bleed × 2.2): dropped
      Arcade.Quest.rhythm.hit(st.clicks[5] + 10, .3);                                  // beat 2: a real, loud hit
    }, st);
    expect((await rs(page)).hits).toBe(1);
    await result(page);
    watch.check();
  });

  test('THE SNARE plays by onsets (shared/onsets.js), never by pitch; THE BELLS by the pitch engine\'s attacks', async ({page}) => {
    const watch = await arena(page, 'snare');
    expect(await page.evaluate(() => Arcade.Quest.challenge.resolve('rhythm'))).toBe('rhythm');
    await run(page, 'rhythm', 'tapsy', {rhythm: 'q q q q'});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.T0p; });
    const st = await rs(page);
    for (const t of st.targets) {
      await page.waitForFunction(at => performance.now() >= at, st.T0p + t * 1000 + st.lagMs - 5);
      await page.evaluate(() => Arcade.Onsets.fake(performance.now(), .3));
    }
    const r = await result(page);
    expect(r.correct).toBe(4);
    expect(r.acc).toBeGreaterThan(.6);
    watch.check();
  });

  test('THE BELLS: Space in ?demo is a mallet attack (any note counts)', async ({page}) => {
    const watch = await arena(page, 'bells');
    await run(page, 'tempo', 'metrognome', {beats: 4, bpm: 96});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.T0p; });
    const st = await rs(page);
    for (const t of st.targets) {
      await page.waitForFunction(at => performance.now() >= at, st.T0p + t * 1000 - 5);
      await page.keyboard.press(' ');
    }
    const r = await result(page);
    expect(r.correct).toBeGreaterThanOrEqual(3);                                       // (key presses from the test: a little jitter)
    watch.check();
  });
});

test.describe('TEMPO and ECHO', () => {
  test('TEMPO: 8 steady quarters beat a drifting player; ACCEL speeds the beats up', async ({page}) => {
    const watch = await arena(page);
    await run(page, 'tempo', 'metrognome');
    const st = await playAll(page, 0);
    expect(st.targets.length).toBe(8);
    expect(st.targets[1]).toBeCloseTo(60 / 96, 3);
    await expect(page.locator('.q-rhy .q-tdots i')).toHaveCount(8);
    const steady = await result(page);
    expect(steady.acc).toBeGreaterThanOrEqual(.95);

    await run(page, 'tempo', 'metrognome');
    await playAll(page, i => i * 45);                                                  // dragging, a little more each beat
    const drift = await result(page);
    expect(drift.acc).toBeLessThan(.8);

    await run(page, 'tempo', 'metrognome', {accel: 24, beats: 4});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.T0p; });
    const a = await rs(page), gaps = a.targets.slice(1).map((t, i) => t - a.targets[i]);
    expect(gaps[2]).toBeLessThan(gaps[0]);
    expect(a.accel).toBe(24);
    watch.check();
  });

  test('ECHO: the mic is paused while it plays, back on after the last block + fade + 400 ms; HEAR IT AGAIN costs a little', async ({page}) => {
    const watch = await arena(page);
    await run(page, 'echo', 'miclet', {rhythm: 'q q h'});
    await page.waitForFunction(() => { const s = Arcade.Quest.rhythm.state(); return s && s.phase === 'hear' && s.resumeAtP; });
    expect(await page.evaluate(() => Arcade.Pitch.paused)).toBe(true);
    const h = await rs(page);
    await page.waitForFunction(() => Arcade.Quest.rhythm.state().phase === 'choose', null, {timeout: 10000});
    const at = await page.evaluate(() => performance.now());
    expect(at).toBeGreaterThanOrEqual(h.resumeAtP - 40);
    await page.evaluate(() => Arcade.Quest.rhythm.pick('again'));                      // once more, please
    await page.waitForFunction(() => Arcade.Quest.rhythm.state().phase === 'choose' && Arcade.Quest.rhythm.state().replays === 1, null, {timeout: 10000});
    await page.evaluate(() => Arcade.Quest.rhythm.pick('play'));
    await playAll(page, 0);
    expect(await page.evaluate(() => Arcade.Pitch.paused)).toBe(false);               // listening again for your turn
    const r = await result(page);
    expect(r.acc).toBeCloseTo(.85, 2);                                                 // all perfect × one replay
    expect(r.correct).toBe(3);
    watch.check();
  });
});

test.describe('THE E♭ ENCORE', () => {
  for (const [member, first] of [['trumpet', 'F4'], ['altosax', 'C5'], ['horn', 'Bb3'], ['flute', 'Eb5']]) {
    test(`learn it (${member}): the concert E♭ scale from shared/scales.js, bottom to top; in battle 4 notes`, async ({page}) => {
      const watch = await arena(page, member);
      await page.evaluate(() => { const b = Arcade.buildSequence; Arcade.buildSequence = o => (window.__seq = b(o)); });
      await page.evaluate(() => { window.__res = null; Arcade.Quest.challenge.encore(true).then(r => { window.__res = r; }); });
      await expect(page.locator('#qStaff svg')).toBeVisible();
      const seq = await page.evaluate(() => window.__seq.items.map(i => i.show.letter + i.show.oct));
      expect(seq.length).toBe(8);
      const want = first.replace('b', '');                                            // (the flat is in the key signature)
      expect(seq[0]).toBe(want);
      expect(seq[7]).toBe(want[0] + (+want.slice(1) + 1));
      await page.keyboard.down(' ');                                                   // ?demo: hold Space = the right notes
      const r = await result(page);
      await page.keyboard.up(' ');
      expect(r.acc).toBeGreaterThanOrEqual(.75);
      await page.evaluate(() => { window.__res = null; Arcade.Quest.challenge.encore(false).then(r => { window.__res = r; }); });
      await expect(page.locator('#qStaff svg')).toBeVisible();
      expect(await page.evaluate(() => window.__seq.items.length)).toBe(4);
      await page.keyboard.down(' ');
      await result(page);
      await page.keyboard.up(' ');
      watch.check();
    });
  }

  test('THE SNARE: 8 clean strokes to learn it, 6 in battle', async ({page}) => {
    const watch = await arena(page, 'snare');
    await page.evaluate(() => { window.__res = null; Arcade.Quest.challenge.encore(true).then(r => { window.__res = r; }); });
    await expect(page.locator('.q-chal-t')).toContainText('8');
    for (let i = 0; i < 8; i++) { await page.keyboard.press(' '); await page.waitForTimeout(160); }
    expect((await result(page)).total).toBe(8);
    await page.evaluate(() => { window.__res = null; Arcade.Quest.challenge.encore(false).then(r => { window.__res = r; }); });
    for (let i = 0; i < 6; i++) { await page.keyboard.press(' '); await page.waitForTimeout(160); }
    expect((await result(page)).total).toBe(6);
    watch.check();
  });

  test('the PLAY menu shows E♭ ENCORE only after songEb (with the B♭ Blast after songBb)', async ({page}) => {
    const watch = await arena(page);
    const playMenu = async flags => {
      await page.evaluate(flags => {
        const Q = Arcade.Quest, s = Q.save.get(); s.flags = Object.assign({}, s.flags, flags); Q.save.write();
        Q.challenge.run = async () => ({acc: 1, speed: 1, correct: 3, total: 3, success: true});
        Q.go('battle', {enemy: 'tapsy', back: 'arena'});
      }, flags);
      for (let i = 0; i < 40 && !(await page.locator('#qCmd:not([hidden]) .q-btn').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
      await page.locator('#qCmd .q-btn', {hasText: 'PLAY'}).first().click();
      await page.waitForTimeout(100);
      const items = await page.locator('#qCmd .q-btn .q-bl, #qCmd .q-btn').allTextContents();
      await page.evaluate(() => Arcade.Quest.go('arena'));
      await page.waitForFunction(() => Arcade.Quest.sceneName === 'arena');
      return items.join(' | ');
    };
    const none = await playMenu({});
    expect(none).not.toMatch(/ENCORE/i);
    const both = await playMenu({songBb: true, songEb: true});
    expect(both).toMatch(/BLAST/i);
    expect(both).toMatch(/ENCORE/i);
    watch.check();
  });
});

test.describe('PROFESSOR HOOT (the Green Room)', () => {
  async function greenroom(page, flags = {}) {
    const s = {v: 6, level: 9, xp: 0, hp: 52, maxHp: 52, tokens: 40, items: {}, roster: [], battles: {won: 0, befriended: 0, faded: 0},
      world: {map: 'greenroom', x: 4, y: 6, dir: 'up'}, converted: {}, charms: {owned: {}, equipped: [null, null]}, band: [], route: {},
      flags: Object.assign({'seen-intro': true, ep1Done: true, ep2Start: true, pathsTip: true}, flags), done: {}};
    const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true, gameData: {'arcade-quest': {save: s, settings: SETTINGS, keysTip: true}}})});
    await page.goto('arcade-quest/index.html?demo&warp=greenroom');
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.sceneName === 'world' && Arcade.Quest.world.state());
    await page.evaluate(() => {
      const Q = Arcade.Quest;
      Q.micReady = async () => true;
      window.__lines = [];
      const say = Q.say; Q.say = (l, o) => { window.__lines.push(...[].concat(l).filter(Boolean)); return say(l, o); };
    });
    return watch;
  }
  const helped = (page, n) => page.evaluate(n => { const Q = Arcade.Quest, h = Q.save.helped; Q.save.helped = ep => (ep === 2 ? n : h(ep)); }, n);
  /** talk to Hoot (at [4, 5]: from below) and press A through his lines until `until` (a selector) or the world is free */
  async function talk(page, sel) {
    await page.evaluate(() => { window.__lines.length = 0; Arcade.Quest.world.warp(4, 6, 'up'); });
    await page.keyboard.press('Enter');
    for (let i = 0; i < 40; i++) {
      if (sel && await page.locator(sel).count()) return;
      const free = await page.evaluate(() => { const w = Arcade.Quest.world.state(); return Arcade.Quest.sceneName === 'world' && w && !w.busy && !document.querySelector('#qText:not([hidden])'); });
      if (free && i > 2) return;
      await page.keyboard.press('Enter'); await page.waitForTimeout(60);
    }
  }
  const lines = page => page.evaluate(() => window.__lines.slice());

  test('before 6 machines are helped he loops measure 12 (glitched); at 6 he wakes, un-glitched, and teaches the E♭ Encore', async ({page}) => {
    const watch = await greenroom(page);
    await helped(page, 5);
    await talk(page);
    expect((await lines(page)).join(' ')).toMatch(/Measure 12/);
    expect(await page.evaluate(() => Arcade.Quest.save.get().flags.hootAwake)).toBeFalsy();
    await helped(page, 6);
    await talk(page, '.q-chal');
    expect(await lines(page)).toContain('MEASURE THIRTEEN! I\'m free! The static let go of my page!');
    expect(await page.evaluate(() => Arcade.Quest.save.get().flags.hootAwake)).toBe(true);
    await expect(page.locator('.q-chal #qStaff svg')).toBeVisible();                 // the lesson: the E♭ scale
    await page.keyboard.down(' ');
    await page.waitForFunction(() => Arcade.Quest.save.get().flags.songEb, null, {timeout: 30000});
    await page.keyboard.up(' ');
    await page.waitForFunction(() => window.__lines.some(l => /BRAVO/.test(l)));
    for (let i = 0; i < 20 && await page.locator('#qText:not([hidden])').count(); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    await talk(page);
    expect((await lines(page)).join(' ')).toMatch(/Practice your scales/);             // after the song: his practice lines
    expect(await page.evaluate(() => !!window.QUEST_ART.SPRITES['npc-hoot-ok'] && window.QUEST_MAPS.greenroom.npcs[0].awake.sprite)).toBe('npc-hoot-ok');
    watch.check();
  });

  test('a missed lesson: "Again, from the top. Slowly!" and no song', async ({page}) => {
    const watch = await greenroom(page, {hootAwake: true, 'met-hoot': true});
    await page.evaluate(() => { Arcade.Quest.challenge.encore = async () => ({acc: .4, speed: 0, correct: 3, total: 8, success: false}); });
    await talk(page);
    expect(await lines(page)).toContain('Again, from the top. Slowly!');
    expect(await page.evaluate(() => Arcade.Quest.save.get().flags.songEb)).toBeFalsy();
    watch.check();
  });
});

test.describe('THE 8 SHOWTIME MACHINES (Test Arena, ?set=2)', () => {
  test('the arena lists all 8 and Rhythm practice', {tag: '@quick'}, async ({page}) => {
    const watch = await arena(page);
    const labels = await page.locator('#qFoes .q-btn').allTextContents();
    expect(labels.length).toBe(9);
    expect(await page.evaluate(ids => ids.filter(id => !(window.__foe(id) && window.__foe(id).area === 'stage' && window.__foe(id).ep === 2)), MACHINES)).toEqual([]);
    expect(labels.join(' ')).toMatch(/Rhythm practice/);
    watch.check();
  });

  for (const reduced of [false, true]) {
    test(`each machine: befriended (SERENADE → HARMONIZE) and powered down (PLAY), its own dodge running${reduced ? ' (reduced motion)' : ''}`, async ({page}) => {
      test.setTimeout(90000);
      if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
      const watch = await arena(page);
      await page.evaluate(() => {
        const Q = Arcade.Quest, s = Q.save.get(); s.level = 6; Q.charms.fixHp(s); s.hp = s.maxHp; Q.save.write();
        window.__play = {acc: 1, speed: 1, correct: 3, total: 3, success: true};
        Q.challenge.run = async () => Object.assign({}, window.__play);
        // the real dodge, stepped quickly (1/60 s at a time) instead of waiting it out; what it threw is recorded
        window.__dodges = [];
        const start = Q.dodge.start.bind(Q.dodge);
        Q.dodge.start = o => {
          const p = start(o), seen = new Set(), fx = new Set();
          let hits = 0;
          for (let i = 0; i < 1200 && Q.dodge.active(); i++) {
            const st = Q.dodge.state(); st.kinds.forEach(k => seen.add(k)); st.fx.forEach(k => fx.add(k)); hits = st.hits;
            Q.dodge.update(1 / 60);
          }
          window.__dodges.push({enemy: o.enemy.id, kinds: [...seen], fx: [...fx], hits});
          return p;
        };
      });
      for (const [id, how] of MACHINES.flatMap(id => [[id, 'befriend'], [id, 'defeat']])) {
        await page.evaluate(id => { const Q = Arcade.Quest, s = Q.save.get(); s.hp = s.maxHp; s.roster = []; Q.save.write(); Q.go('battle', {enemy: id, back: 'arena'}); }, id);
        let turns = 0;
        for (let i = 0; i < 400; i++) {
          const s = await page.evaluate(() => ({b: Arcade.Quest.battleState(), scene: Arcade.Quest.sceneName,
            menu: (c => !!c && !c.hidden && c.querySelectorAll('.q-btn').length > 0)(document.getElementById('qCmd'))}));
          if (s.scene !== 'battle') break;
          if (s.menu) {
            const label = how === 'defeat' ? 'PLAY' : s.b && s.b.calm >= 100 ? 'HARMONIZE' : 'SERENADE';
            const ok = await page.evaluate(l => { const b = [...document.querySelectorAll('#qCmd .q-btn')].find(x => x.textContent.startsWith(l)); if (b) b.click(); return !!b; }, label);
            if (!ok) await page.locator('#qCmd .q-btn').first().click();                 // (a submenu: its first choice)
            turns++;
          } else await page.keyboard.press('Enter');
          await page.waitForTimeout(30);
        }
        const sv = await page.evaluate(() => Arcade.Quest.save.get());
        if (how === 'befriend') expect(sv.roster, `${id} befriended`).toContain(id);
        else expect(sv.roster, `${id} powered down`).not.toContain(id);
        expect(turns, id).toBeGreaterThan(0);
      }
      const dodges = await page.evaluate(() => window.__dodges);
      const KIND = {tapsy: ['taps'], spotlight: ['beam'], feedback: ['shot'], confetti: ['confetti'], metrognome: ['pendulum'], stubs: ['stubs'], ropeknot: ['rope'], miclet: ['rings']};
      MACHINES.forEach(id => {
        const d = dodges.filter(x => x.enemy === id);
        expect(d.length, `${id} dodged`).toBeGreaterThan(0);
        const all = new Set(d.flatMap(x => x.kinds.concat(x.fx)));
        KIND[id].forEach(k => expect([...all], `${id}: ${k}`).toContain(k));
      });
      watch.check();
    });
  }

  test('the dodges are fair: the spotlight\'s beam warns ≥ 0.8 s first; tap shoes land on the beat', async ({page}) => {
    const watch = await arena(page);
    const r = await page.evaluate(() => {
      const Q = Arcade.Quest, E = {spotlight: window.__foe('spotlight'), tapsy: window.__foe('tapsy')};
      const out = {};
      Q.dodge.start({enemy: E.spotlight, easy: false, onHit: () => {}});
      const warns = [];
      for (let i = 0; i < 600 && Q.dodge.active(); i++) { Q.dodge.update(1 / 60); const st = Q.dodge.state(); if (st) warns.push(...st.warns); }
      out.warns = warns;
      Q.dodge.end();
      Q.dodge.start({enemy: E.tapsy, easy: false, onHit: () => {}});
      const lands = [];
      for (let i = 0; i < 400 && Q.dodge.active(); i++) { Q.dodge.update(1 / 60); const st = Q.dodge.state(); if (st) st.taps.forEach(t => { if (!lands.includes(t)) lands.push(t); }); }
      Q.dodge.end();
      out.lands = lands;
      return out;
    });
    expect(r.warns.length).toBeGreaterThan(0);
    r.warns.forEach(w => expect(w).toBeGreaterThanOrEqual(.8));
    const beat = 60 / 96;
    expect(r.lands.length).toBeGreaterThan(2);
    r.lands.forEach(t => { const k = (t - r.lands[0]) / beat; expect(Math.abs(k - Math.round(k))).toBeLessThan(.02); });
    watch.check();
  });
});
