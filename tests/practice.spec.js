/* TODAY'S PRACTICE (shared/practice.js, the lobby's first card: lobby.js + arcade.css): the 3-step plan per date and
   instrument, the step checks (a FINISHED round: the activity log's `f`; the Tuner's HOLD IT; 2 minutes of metronome),
   the bonus paid once a day, the week's stamps, PRACTICE PRO, the card's layout, reduced motion and a Backup Code
   restore. `?demo&nostart&today=YYYY-MM-DD` pretends a date (2026-10-05 is a Monday). */
const {test, expect} = require('@playwright/test');
const {prepare, device, offscreen, saved, VIEWPORTS} = require('./helpers');

const MON = '2026-10-05', TUE = '2026-10-06', WED = '2026-10-07', THU = '2026-10-08', SAT = '2026-10-10', SUN = '2026-10-04';
const lobby = (page, day = MON, q = '') => page.goto(`index.html?demo&nostart&today=${day}${q}`);
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.Practice && Arcade.Lobby && document.querySelector('#zones .zsign'));
const plan = (page, day, member) => page.evaluate(([d, m]) => Arcade.Practice.plan(new Date(d + 'T12:00:00'), m), [day, member]);
const balance = page => page.evaluate(() => Arcade.Tokens.balance());
/** a device where today's three steps for a trumpet on a Monday are already done (the tuner's ring, Scale Trainer, Lost Signal) */
const doneToday = (member = 'trumpet', day = MON, extra = {}) => device(member, Object.assign({
  activity: {[day]: {f: {'scale-trainer': 1, 'lost-signal': 1, 'chime-heist': 1, 'music-highway': 1}}},
  gameData: {tuneup: {holds: {[day]: 1}}},
}, extra));

test.describe("Today's Practice: the plan", () => {
  test('the same date and member always give the same plan; Monday = scales; the override wins until its last day', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const a = await plan(page, MON, 'trumpet'), b = await plan(page, MON, 'trumpet');
    expect(a).toEqual(b);
    expect(a.map(s => s.step)).toEqual([1, 2, 3]);
    expect(a[1].skill).toBe('scales');
    expect(a[1].title).toBe('Skill of the day: Scales — Scale Trainer');
    // the card keeps the day's plan: a reload shows the same three steps
    const shown = await page.evaluate(() => Arcade.Practice.today().map(s => s.game));
    await page.reload(); await ready(page);
    expect(await page.evaluate(() => Arcade.Practice.today().map(s => s.game))).toEqual(shown);
    // Mr. Graham's override: rhythm until Tuesday (that whole day), then Wednesday is back to reading
    const o = await page.evaluate(([m, t, w]) => {
      const P = Arcade.Practice, at = d => new Date(d + 'T12:00:00');
      P.PRACTICE.today = {skill: 'rhythm', until: t};
      const r = [P.plan(at(m), 'trumpet')[1], P.plan(at(t), 'trumpet')[1], P.plan(at(w), 'trumpet')[1]];
      P.PRACTICE.today = {skill: 'lost-signal', until: m};             // a game id works too
      r.push(P.plan(at(m), 'trumpet')[1]);
      P.PRACTICE.today = null;
      return r.map(s => [s.skill, s.game]);
    }, [MON, TUE, WED]);
    expect(o).toEqual([['rhythm', 'rhythm-dojo'], ['rhythm', 'rhythm-dojo'], ['reading', 'note-storm'], ['lost-signal', 'lost-signal']]);
    // with lost-signal as the skill, step 3 (assigned: lost-signal) moved on to Music Highway
    watch.check();
  });

  test('a weekend picks the weakest suitable game (fewest stars as a share; ties in games.js order)', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page, SAT); await ready(page);
    let p = await plan(page, SAT, 'trumpet');
    expect(p[1].skill).toBe('choice');
    expect(p[1].game).toBe('ghost-notes');                 // nothing played yet: every share is 0, the first in games.js
    await page.evaluate(() => { const s = Arcade.store; s.setLevel('ghost-notes', s.instId, 1, {stars: 3, best: 100}, 3); });
    p = await plan(page, SAT, 'trumpet');
    expect(p[1].game).toBe('note-storm');                  // ghost-notes has stars now: the next one with none
    // the snare's weakest is never a game it can't play
    const sn = await plan(page, SUN, 'snare');
    expect(await page.evaluate(id => Arcade.gameFit(Arcade.GAMES.find(g => g.id === id), 'snare').ok, sn[1].game)).toBe(true);
    watch.check();
  });

  test('no step repeats a game and every step suits the instrument, for every member and weekday', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const bad = await page.evaluate(() => {
      const out = [], A = Arcade;
      A.PLAYERS.forEach(m => {
        for (let i = 0; i < 7; i++) {
          const d = new Date(2026, 9, 5 + i, 12), steps = A.Practice.plan(d, m);
          if (steps.length !== 3) { out.push(`${m} ${i}: ${steps.length} steps`); continue; }
          const games = steps.filter(s => !s.tool).map(s => s.game);
          if (new Set(games).size !== games.length) out.push(`${m} day ${i}: repeats ${games}`);
          steps.forEach(s => {
            const g = A.GAMES.find(x => x.id === s.game);
            if (!g) out.push(`${m} day ${i}: unknown ${s.game}`);
            else if (!s.tool && !A.gameFit(g, m).ok) out.push(`${m} day ${i}: ${s.game} doesn't suit`);
            if (!s.title || !s.task) out.push(`${m} day ${i}: no text`);
          });
        }
      });
      return out;
    });
    expect(bad).toEqual([]);
    watch.check();
  });

  test('the warm-up: trumpet = the Tuner, bells = a Scale Trainer scale, snare = the Metronome', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const t = await plan(page, MON, 'trumpet'), b = await plan(page, MON, 'bells'), s = await plan(page, MON, 'snare');
    expect([t[0].tool, t[0].title]).toEqual(['tuner', 'Warm up: hold a note in tune for 4 seconds']);
    expect(b[0].tool).toBeUndefined();
    expect(b[0].game).toBe('scale-trainer');
    expect(b[0].title).toMatch(/^Warm up: the concert [A-G][♭♯]? scale — Scale Trainer$/);
    expect(b[1].game).toBe('chime-heist');                 // scales day: Scale Trainer is already the warm-up
    expect(s[0].tool).toBe('metronome');
    expect(s.every(x => x.game !== 'scale-trainer')).toBe(true);
    expect(s[2].title).toBe('Play: Music Highway');        // the assigned Lost Signal doesn't suit the snare
    watch.check();
  });
});

test.describe("Today's Practice: checking off", () => {
  test('opening a game and leaving does NOT check it; a finished round (results shown) does; the game starts on the first level short of 3 ★', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    await expect(page.locator('#practiceCard .pr-step')).toHaveCount(3);
    await expect(page.locator('#practiceCard .pr-step').nth(1)).toHaveAttribute('aria-label', /Step 2, Skill: Scale Trainer\. Scales: Scale Trainer\. Not done yet\./);
    await page.evaluate(() => { const s = Arcade.store; s.setLevel('scale-trainer', 'trumpet', 1, {stars: 3, best: 10}, 3); });
    await page.locator('#practiceCard .pr-step').nth(1).click();
    await page.waitForURL(/scale-trainer\/index\.html/);
    await page.waitForFunction(() => Arcade.LevelSelect && Arcade.LevelSelect.state() && Arcade.LevelSelect.state().appeared);
    const ls = await page.evaluate(() => Arcade.LevelSelect.state());
    expect(ls.practice).toBe(true);
    expect(ls.sel).toBe(1);                                 // level 1 has 3 ★: the first open level short of 3 ★
    expect(await page.evaluate(() => sessionStorage.getItem('bandarcade.practice-pick'))).toBe(null);   // read once
    await lobby(page); await ready(page);
    expect(await page.evaluate(() => Arcade.Practice.today()[1].done)).toBe(false);
    await expect(page.locator('#practiceCard .pr-step').nth(1)).not.toHaveClass(/done/);
    // a finished round on the game's page: its results screen
    await page.goto(`scale-trainer/index.html?demo&nostart&today=${MON}`);
    await page.waitForFunction(() => Arcade.UI && Arcade.UI.results && Arcade.pageGame);
    await page.evaluate(() => Arcade.UI.results.show({stars: 1, title: 'Done', retry: {onClick() {}}}));
    expect(((await saved(page)).activity[MON] || {}).f).toEqual({'scale-trainer': 1});
    await page.goBack(); await ready(page);
    await expect(page.locator('#practiceCard .pr-step').nth(1)).toHaveClass(/done/);
    await expect(page.locator('#practiceCard .pr-step').nth(1)).toHaveAttribute('aria-label', /Done\.$/);
    await expect(page.locator('#practiceCard .pr-step').nth(1).locator('.pr-done')).toHaveText('Done');
    watch.check();
  });

  test('one HOLD IT ring on the Tuner checks the trumpet\'s warm-up', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    await page.locator('#practiceCard .pr-step').first().click();
    await page.waitForURL(/note-checker\/index\.html\?.*tool=tuner/);
    await page.waitForFunction(() => Arcade.TuneUp && Arcade.TuneUp.tab === 'tuner');
    const go = page.locator('[data-act=go]').filter({visible: true});
    if (await go.count()) await go.first().click();
    await page.evaluate(() => { const T = Arcade.TuneUp.tuner; Arcade.Pitch.demoNote = T.state().target + .05; });
    await expect.poll(() => page.evaluate(() => Arcade.TuneUp.tuner.state().filled), {timeout: 9000}).toBe(true);
    await lobby(page); await ready(page);
    await expect(page.locator('#practiceCard .pr-step').first()).toHaveClass(/done/);
    watch.check();
  });

  test('2 minutes of metronome checks the snare\'s warm-up (the test clock)', async ({page}) => {
    test.setTimeout(180_000);                               // 2 minutes of 25 ms scheduler ticks on the fake clock
    const watch = await prepare(page, {store: device('snare', {sfx: false})});
    await page.clock.install();
    await page.goto(`note-checker/index.html?demo&nostart&tool=metronome&today=${MON}`);
    await page.waitForFunction(() => Arcade.TuneUp && Arcade.TuneUp.tab === 'metronome');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // the dancer's frames: not what's tested, and slow on a fake clock
    await page.locator('#mtGo').click();
    await page.clock.runFor(60_000);
    expect(await page.evaluate(() => Arcade.TuneUp.metronome.state().today)).toBeLessThan(120);
    await page.clock.runFor(62_000);
    await page.locator('#mtGo').click();                    // stop: the last seconds are saved too
    const s = await page.evaluate(() => Arcade.TuneUp.metronome.state().today);
    expect(s).toBeGreaterThanOrEqual(120);
    expect(s).toBeLessThan(126);
    await lobby(page); await ready(page);
    expect(await page.evaluate(() => Arcade.Practice.today()[0])).toMatchObject({tool: 'metronome', done: true});
    // a ladder climbed to its goal counts too (another day)
    expect(await page.evaluate(() => { const t = Arcade.store.gameData('tuneup'); t.ladderTop = {'2026-10-06': 1}; Arcade.store.saveGameData('tuneup');
      return Arcade.Practice.plan(new Date('2026-10-06T12:00:00'), 'snare')[0].done; })).toBe(true);
    watch.check();
  });
});

test.describe("Today's Practice: the bonus and the week", () => {
  test('all 3 done pays the bonus exactly once (reloads, two tabs), the card turns gold, the Prize Counter sign updates', async ({page, context}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await lobby(page); await ready(page);
    const other = await context.newPage();
    await lobby(other); await ready(other);
    expect(await balance(page)).toBe(0);
    // finish all three in the first tab: it pays; the second tab hears about it (the storage event) and never pays again
    await page.evaluate(() => {
      const s = Arcade.store, t = s.gameData('tuneup'), k = s.dayKey();
      (t.holds || (t.holds = {}))[k] = 1; s.saveGameData('tuneup');
      s.noteFinished('scale-trainer'); s.noteFinished('lost-signal');
      Arcade.Lobby.redrawPractice();
    });
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    await expect(page.locator('#prTitle')).toContainText('Practice done!');
    await expect(page.locator('#prTitle')).toContainText('+10 tokens');
    await expect(page.locator('#practiceCard .pr-sub')).toHaveText('Come back tomorrow for a new skill!');
    await expect(page.locator('#prizeSign .zs-bal b')).toHaveText('10');
    expect(await balance(page)).toBe(10);
    await expect(other.locator('#practiceCard')).toHaveClass(/gold/);
    await other.evaluate(() => Arcade.Lobby.redrawPractice());
    await other.reload(); await ready(other);
    await page.reload(); await ready(page);
    await other.reload(); await ready(other);
    expect(await balance(page)).toBe(10);
    expect(await balance(other)).toBe(10);
    const s = await saved(page);
    expect(s.gameData.practice.paid).toEqual({[MON]: true});
    expect(s.gameData.practice.days).toEqual({[MON]: true});
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    watch.check();
  });

  test('the week row counts Monday to Sunday (a week boundary), today outlined; nothing scolds a missed day', async ({page}) => {
    const days = {'2026-10-03': true, [SUN]: true, [MON]: true, [TUE]: true};
    await prepare(page, {store: device('trumpet', {gameData: {practice: {days}}})});
    await lobby(page, WED); await ready(page);
    let w = await page.evaluate(() => Arcade.Practice.week());
    expect(w.days.map(d => d.key)).toEqual([MON, TUE, WED, THU, '2026-10-09', SAT, '2026-10-11']);
    expect(w.count).toBe(2);
    await expect(page.locator('.pr-week-n')).toHaveText('2 practice days this week');
    await expect(page.locator('.pr-stamp.on')).toHaveCount(2);
    await expect(page.locator('.pr-stamp.today')).toHaveCount(1);
    await expect(page.locator('.pr-stamp').nth(2)).toHaveClass(/today/);
    await expect(page.locator('.pr-week')).toHaveAttribute('aria-label', /This week: 2 practice days\. Monday: practiced, Tuesday: practiced, Wednesday \(today\): not yet/);
    await expect(page.locator('#practiceCard')).not.toContainText(/streak|missed|broke|lose/i);
    await lobby(page, SUN); await ready(page);
    w = await page.evaluate(() => Arcade.Practice.week());
    expect(w.days[0].key).toBe('2026-09-28');
    expect(w.count).toBe(2);                                 // Saturday 3rd + Sunday 4th
  });

  test('reaching weekGoal days in one week unlocks PRACTICE PRO with the UNLOCKED! card (never sold)', async ({page}) => {
    const watch = await prepare(page, {store: doneToday('trumpet', THU, {gameData: {tuneup: {holds: {[THU]: 1}}, practice: {days: {[MON]: true, [TUE]: true, [WED]: true}}}})});
    await lobby(page, THU); await ready(page);
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    await expect(page.locator('.sk-catchup')).toBeVisible({timeout: 5000});
    await expect(page.locator('.sk-catchup')).toContainText('PRACTICE PRO');
    const st = await page.evaluate(() => ({pro: Arcade.Practice.state().pro, open: Arcade.Avatar.isUnlocked('plate', 'practice'),
      shop: Arcade.Tokens.catalog().some(i => i.key === 'plate:practice')}));
    expect(st).toMatchObject({pro: THU, open: true, shop: false});
    watch.check();
  });
});

test.describe("Today's Practice: the card", () => {
  test('hidden with no instrument; first in the lobby cards, full width, no overflow at phone, iPad and Chromebook sizes', async ({page}) => {
    const watch = await prepare(page, {store: {members: {}, games: {}, modes: {}}});
    await lobby(page);
    await page.waitForFunction(() => window.Arcade && Arcade.Practice);
    await page.waitForTimeout(300);
    await expect(page.locator('#practiceCard')).toHaveCount(0);
    await page.evaluate(() => { localStorage.setItem('bandarcade.v1', JSON.stringify({player: 'trumpet', members: {}, games: {}, modes: {}})); });
    for (const [name, size] of Object.entries(Object.assign({phone: {width: 390, height: 844}}, VIEWPORTS))) {
      await page.setViewportSize(size);
      await lobby(page); await ready(page);
      const box = await page.evaluate(() => {
        const c = document.getElementById('practiceCard'), r = c.getBoundingClientRect(), row = document.getElementById('lobbyCards').getBoundingClientRect();
        const steps = [...c.querySelectorAll('.pr-step')].map(b => b.getBoundingClientRect());
        return {first: c === document.getElementById('lobbyCards').firstElementChild, left: r.left, right: r.right, rowW: row.width, w: r.width,
          minH: Math.min(...steps.map(s => s.height)), stepsIn: steps.every(s => s.left >= r.left - 1 && s.right <= r.right + 1),
          rowOfSteps: steps[0].top === steps[2].top, W: innerWidth};
      });
      expect(box.first, name).toBe(true);
      expect(box.right, name).toBeLessThanOrEqual(box.W + 1);
      expect(box.left, name).toBeGreaterThanOrEqual(-1);
      expect(Math.abs(box.w - box.rowW), name).toBeLessThan(2);       // it spans the whole row
      expect(box.minH, name).toBeGreaterThanOrEqual(48);
      expect(box.stepsIn, name).toBe(true);
      expect(box.rowOfSteps, name).toBe(name !== 'phone');            // a row of three, stacked on a phone
      expect(await offscreen(page), name).toEqual([]);
    }
    watch.check();
  });

  test('reduced motion: no glow on the next step, the stamp only fades', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await prepare(page, {store: doneToday()});
    await lobby(page); await ready(page);
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    await expect(page.locator('#practiceCard')).toHaveClass(/stamp-fade/);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.pr-seal')).animationName)).toBe('pr-fade');
    await page.evaluate(() => { localStorage.setItem('bandarcade.v1', JSON.stringify({player: 'trumpet', members: {}, games: {}, modes: {}})); });
    await lobby(page, TUE); await ready(page);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.pr-step.next')).animationName)).toBe('none');
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.reload(); await ready(page);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.pr-step.next')).animationName)).toBe('pr-glow');
    watch.check();
  });

  test('the stamp animates once a day; a Backup Code restore keeps today\'s checks and the paid record', async ({page}) => {
    const watch = await prepare(page, {store: doneToday()});
    await lobby(page); await ready(page);
    await expect(page.locator('#practiceCard')).toHaveClass(/stamp-go/);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.pr-seal')).animationName)).toBe('pr-stamp');
    await page.reload(); await ready(page);
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    await expect(page.locator('#practiceCard')).not.toHaveClass(/stamp-go/);
    const code = await page.evaluate(() => Arcade.Backup.fullEncode());
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(async c => { const r = await Arcade.Backup.fullDecode(c); Arcade.store.importAll(r.data); }, code);
    await lobby(page); await ready(page);
    expect(await page.evaluate(() => Arcade.Practice.today().every(s => s.done))).toBe(true);
    expect(await page.evaluate(() => Arcade.Practice.state().paid)).toBe(true);
    expect(await balance(page)).toBe(10);                  // restored, never paid again
    await expect(page.locator('#practiceCard')).toHaveClass(/gold/);
    watch.check();
  });
});
