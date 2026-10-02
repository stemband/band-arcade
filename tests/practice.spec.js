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
  activity: {[day]: {f: {'scale-trainer': 1, 'lost-signal': 1, 'vanishing-ink': 1, 'chime-heist': 1, 'music-highway': 1}}},
  gameData: {tuneup: {holds: {[day]: 1}}},
}, extra));

test.describe("Today's Practice: the plan", () => {
  test('the same date and member always give the same plan; Monday = scales; the override wins until its last day', {tag: '@quick'}, async ({page}) => {
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
    // (the week of Oct 5 is week 9 of the rotation: rhythm's 2nd game, reading's 1st)
    expect(o).toEqual([['rhythm', 'showtime-malfunction'], ['rhythm', 'showtime-malfunction'], ['reading', 'note-storm'], ['lost-signal', 'lost-signal']]);
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
    // the assigned Lost Signal doesn't suit the snare: the day's turn in `play` (day 63 of the rotation: 63 % 5 = 3)
    expect(s[2].title).toBe('Play: Keys to the City');
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

test.describe("Today's Practice: the rotation", () => {
  const PLAY = ['music-highway', 'blocktave', 'arcade-quest', 'keys-to-the-city', 'chime-heist'];
  /** step 2 / step 3 game ids for these dates (an override and an assignment can be passed in) */
  const games = (page, days, member, {skill, featured, start} = {}) => page.evaluate(([days, m, skill, featured, start]) => {
    const P = Arcade.Practice, keep = [P.PRACTICE.today, Arcade.FEATURED, P.PRACTICE.rotationStart];
    if (skill !== undefined) P.PRACTICE.today = skill ? {skill} : null;
    if (featured !== undefined) Arcade.FEATURED = featured;
    if (start) P.PRACTICE.rotationStart = start;
    try { return days.map(d => P.plan(new Date(d + 'T12:00:00'), m).map(s => s.game)); }
    finally { [P.PRACTICE.today, Arcade.FEATURED, P.PRACTICE.rotationStart] = keep; }
  }, [days, member, skill, featured, start]);
  const weeksFrom = (day, n) => Array.from({length: n}, (_, i) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + 7 * i); return d.toISOString().slice(0, 10); });
  const daysFrom = (day, n) => Array.from({length: n}, (_, i) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); });

  test('the skill games take turns week by week; scales stays Scale Trainer for pitched instruments', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const wed = await games(page, weeksFrom(WED, 4), 'trumpet');
    expect(wed.map(p => p[1])).toEqual(['note-storm', 'ghost-notes', 'note-ninja', 'note-storm']);
    const tue = await games(page, weeksFrom(TUE, 4), 'trumpet');
    expect(tue.map(p => p[1])).toEqual(['showtime-malfunction', 'rhythm-dojo', 'showtime-malfunction', 'rhythm-dojo']);
    for (const m of ['trumpet', 'flute', 'tuba', 'altosax']) {
      expect((await games(page, weeksFrom(MON, 6), m)).map(p => p[1]), m).toEqual(Array(6).fill('scale-trainer'));
    }
    // every week of a skill's turn is the same all week (Monday to Sunday share a week number)
    expect(await page.evaluate(() => [5, 6, 7, 8, 9, 10, 11].map(d => Arcade.Practice.weekNo(new Date(2026, 9, d, 12))))).toEqual(Array(7).fill(9));
    expect(await page.evaluate(() => Arcade.Practice.weekNo(new Date(2026, 6, 1, 12)))).toBe(0);   // before rotationStart = 0
    watch.check();
  });

  test('fallbacks only when NONE of a skill\'s games suits: the snare\'s reading, scales and ear training', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const pick = (skill, member, day) => page.evaluate(([k, m, d]) => { const g = Arcade.Practice.rotationPick(k, m, new Date(d + 'T12:00:00')); return g && g.id; }, [skill, member, day]);
    for (const d of weeksFrom(MON, 6)) {
      expect(await pick('reading', 'snare', d)).toBe('ancient-ninja-scrolls');
      expect(await pick('scales', 'snare', d)).toBe('chime-heist');     // the first fallback that suits (Chime Heist suits everyone)
      expect(await pick('ear', 'snare', d)).toBe('showtime-malfunction');
    }
    // THE KEY RULE: every member × every skill × 6 weeks: a fallback game only when none of the skill's games suits
    const bad = await page.evaluate(() => {
      const A = Arcade, P = A.Practice, out = [];
      A.PLAYERS.forEach(m => Object.keys(P.PRACTICE.skills).forEach(k => {
        const def = P.PRACTICE.skills[k], suit = def.games.filter(id => A.gameFit(A.GAMES.find(g => g.id === id), m).ok);
        for (let w = 0; w < 6; w++) {
          const date = new Date(2026, 9, 5 + 7 * w, 12), g = P.rotationPick(k, m, date);
          if (!g) { out.push(`${m} ${k} w${w}: nothing`); continue; }
          if (suit.length && !suit.includes(g.id)) out.push(`${m} ${k} w${w}: ${g.id} (a fallback, but ${suit} suits)`);
          if (!suit.length && !(def.fallback || []).includes(g.id)) out.push(`${m} ${k} w${w}: ${g.id} not in the fallback`);
          // the whole plan too (the skill as the day's override): step 2 is a fallback only when nothing in games
          // suits, or when step 1 already took the only one (the bells' Scale Trainer warm-up)
          P.PRACTICE.today = {skill: k};
          const s = P.plan(date, m), step1 = s[0].tool ? null : s[0].game, left = suit.filter(id => id !== step1);
          P.PRACTICE.today = null;
          if (left.length && !left.includes(s[1].game)) out.push(`${m} ${k} w${w}: plan step 2 ${s[1].game}`);
        }
      }));
      return out;
    });
    expect(bad).toEqual([]);
    // a trumpet never gets Chime Heist for scales or technique
    for (const k of ['scales', 'technique']) {
      const g = await games(page, weeksFrom(MON, 6), 'trumpet', {skill: k});
      expect(g.map(p => p[1]).filter(id => id === 'chime-heist'), k).toEqual([]);
    }
    watch.check();
  });

  test('PLAY: the play games take turns day by day, an assignment replaces them, and never step 2\'s game', async ({page}) => {
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    // nothing assigned: day 63 of the rotation is Monday Oct 5, so the turn is (63 + i) % 5
    const days = daysFrom(MON, 10), free = await games(page, days, 'trumpet', {featured: null});
    expect(free.map(p => p[2])).toEqual(days.map((_, i) => PLAY[(63 + i) % 5]));
    // an assignment replaces it every day
    const as = await games(page, days, 'trumpet', {featured: {game: 'lost-signal', until: '2026-12-31'}});
    expect(as.map(p => p[2]).every(id => id === 'lost-signal')).toBe(true);
    // the day's turn is already step 2 (Chime Heist on Oct 6 as the override): step 3 takes the next one
    const clash = await games(page, [TUE], 'trumpet', {featured: null, skill: 'chime-heist'});
    expect(clash[0][1]).toBe('chime-heist');
    expect(clash[0][2]).toBe('music-highway');
    // and never a repeat, for any member, any day of three weeks, assigned or not
    const bad = await page.evaluate(() => {
      const A = Arcade, P = A.Practice, out = [], keep = A.FEATURED;
      [null, keep].forEach(F => {
        A.FEATURED = F;
        A.PLAYERS.forEach(m => { for (let i = 0; i < 21; i++) {
          const s = P.plan(new Date(2026, 9, 5 + i, 12), m), ids = s.filter(x => !x.tool).map(x => x.game);
          if (new Set(ids).size !== ids.length) out.push(`${m} day ${i}: ${ids}`);
        } });
      });
      A.FEATURED = keep;
      return out;
    });
    expect(bad).toEqual([]);
    watch.check();
  });

  test('the same plan on every device; changing rotationStart shifts the cycle', async ({browser}) => {
    const plans = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await prepare(page);
      await lobby(page, WED); await ready(page);
      plans.push(await page.evaluate(() => Arcade.Practice.today().map(s => s.game)));
      if (i === 1) {
        // one week later in the cycle: Oct 7 becomes week 8 (Note Ninja) instead of week 9 (Note Storm)
        expect((await games(page, [WED], 'trumpet', {start: '2026-08-10'}))[0][1]).toBe('note-ninja');
        expect((await games(page, [WED], 'trumpet'))[0][1]).toBe('note-storm');
      }
      await ctx.close();
    }
    expect(plans[0]).toEqual(plans[1]);
    expect(plans[0][1]).toBe('note-storm');
  });

  test('a day\'s saved plan is kept (a mid-day update never un-checks a finished step); the first version\'s plan moves in', async ({page}) => {
    // the plan the card drew this morning (before an update): step 2 was Rhythm Dojo, and it was finished
    const morning = [
      {step: 1, word: 'Warm up', tool: 'tuner', game: 'note-checker', task: 'Hold a note in tune for 4 seconds', title: 'Warm up: hold a note in tune for 4 seconds', why: ''},
      {step: 2, word: 'Skill', game: 'rhythm-dojo', skill: 'rhythm', task: 'Rhythm: Rhythm Dojo', title: 'Skill of the day: Rhythm — Rhythm Dojo', why: ''},
      {step: 3, word: 'Play', game: 'blocktave', task: 'Play Blocktave', title: 'Play: Blocktave', why: ''}];
    const watch = await prepare(page, {store: device('trumpet', {
      activity: {[MON]: {f: {'rhythm-dojo': 1}}, [TUE]: {f: {'rhythm-dojo': 1}}},
      gameData: {practice: {plans: {[MON]: {member: 'trumpet', steps: morning}}, plan: {date: TUE, member: 'trumpet', steps: morning}}}})});
    await lobby(page, MON); await ready(page);
    let p = await page.evaluate(() => Arcade.Practice.today());
    expect(p.map(s => s.game)).toEqual(['note-checker', 'rhythm-dojo', 'blocktave']);
    expect(p[1].done).toBe(true);
    await expect(page.locator('#practiceCard .pr-step').nth(1)).toHaveClass(/done/);
    // Tuesday's plan came from the first version (one `plan`): it is moved into `plans` and kept, checks and all
    await lobby(page, TUE); await ready(page);
    p = await page.evaluate(() => Arcade.Practice.today());
    expect(p.map(s => s.game)).toEqual(['note-checker', 'rhythm-dojo', 'blocktave']);
    expect(p[1].done).toBe(true);
    const gd = (await saved(page)).gameData.practice;
    expect(gd.plan).toBeUndefined();
    expect(Object.keys(gd.plans).sort()).toEqual([MON, TUE]);
    // a new day: the rotation's plan (Wednesday = reading, week 9 = Note Storm), saved under its date
    await lobby(page, WED); await ready(page);
    expect(await page.evaluate(() => Arcade.Practice.today()[1].game)).toBe('note-storm');
    expect(Object.keys((await saved(page)).gameData.practice.plans)).toContain(WED);
    watch.check();
  });

  test('an old-style skill (a plain list) still works, with one console warning', async ({page}) => {
    const warns = [];
    page.on('console', m => { if (m.type() === 'warning' && /practice\.js/.test(m.text())) warns.push(m.text()); });
    const watch = await prepare(page);
    await lobby(page); await ready(page);
    const g = await page.evaluate(() => {
      const P = Arcade.Practice, keep = P.PRACTICE.skills.reading;
      P.PRACTICE.skills.reading = ['ghost-notes', 'note-ninja'];
      try { return [7, 14, 21].map(d => P.plan(new Date(2026, 9, d, 12), 'trumpet')[1].game); }   // weeks 9, 10, 11
      finally { P.PRACTICE.skills.reading = keep; }
    });
    expect(g).toEqual(['note-ninja', 'ghost-notes', 'note-ninja']);
    expect(warns.length).toBe(1);
    watch.check();
  });
});

test.describe("Today's Practice: the card", () => {
  test('hidden with no instrument; first in the lobby cards, full width, no overflow at phone, iPad and Chromebook sizes', {tag: '@quick'}, async ({page}) => {
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

test.describe("Today's Practice: collapsible", () => {
  const card = page => page.locator('#practiceCard');
  const toggle = page => page.locator('#prToggle');
  const oneDone = (extra = {}) => device('trumpet', Object.assign({activity: {[MON]: {f: {'scale-trainer': 1}}}}, extra));

  test('▲ hides it to a slim bar with the right count; the same day stays hidden after a reload; the next day opens it again', async ({page}) => {
    const watch = await prepare(page, {store: oneDone()});
    await lobby(page); await ready(page);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page)).toHaveAttribute('aria-controls', 'prBody');
    const tb = await toggle(page).boundingBox();
    expect(Math.min(tb.width, tb.height)).toBeGreaterThanOrEqual(48);
    await toggle(page).click();
    await expect(card(page)).toHaveClass(/collapsed/);
    await expect(page.locator('#prBody')).toBeHidden();
    await expect(page.locator('.pr-week')).toBeHidden();                 // the THIS WEEK stamps hide too
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toBeFocused();
    await expect(page.locator('#prTitle')).toHaveText("Today's Practice");
    await expect(page.locator('.pr-count')).toHaveText('1 of 3 steps done');      // "1 of 3" + its screen-reader words
    await expect(page.locator('.pr-mdot')).toHaveCount(3);
    await expect(page.locator('.pr-mdot.on')).toHaveCount(1);
    await expect(page.locator('.pr-step.next')).toHaveCount(0);         // nothing glows while collapsed
    expect((await saved(page)).gameData.practice.collapsed).toBe(MON);
    // the same day: still collapsed; Enter on the toggle opens it (a real button)
    await page.reload(); await ready(page);
    await expect(card(page)).toHaveClass(/collapsed/);
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(card(page)).not.toHaveClass(/collapsed/);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.pr-step')).toHaveCount(3);
    // a tap on the title row does the same as ▲; Space on the toggle too
    await page.locator('#prTitle').click();
    await expect(card(page)).toHaveClass(/collapsed/);
    await toggle(page).focus();
    await page.keyboard.press('Space');
    await expect(card(page)).not.toHaveClass(/collapsed/);
    await page.locator('#prTitle').click();
    await expect(card(page)).toHaveClass(/collapsed/);
    // a new day opens it again (reopenDaily: true)…
    await lobby(page, TUE); await ready(page);
    await expect(card(page)).not.toHaveClass(/collapsed/);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    // …and with reopenDaily: false it stays collapsed until opened
    await page.evaluate(() => { Arcade.Practice.PRACTICE.reopenDaily = false; Arcade.Lobby.redrawPractice(); });
    await expect(card(page)).toHaveClass(/collapsed/);
    watch.check();
  });

  test('all 3 done while collapsed: the gold bar, the bonus paid once; the stamp waits until the card is opened', async ({page}) => {
    const watch = await prepare(page, {store: doneToday('trumpet', MON, {gameData: {tuneup: {holds: {[MON]: 1}}, practice: {collapsed: MON}}})});
    await lobby(page); await ready(page);
    await expect(card(page)).toHaveClass(/collapsed/);
    await expect(card(page)).toHaveClass(/gold/);
    await expect(page.locator('#prTitle')).toHaveText('Practice done! ✓');
    await expect(card(page)).not.toHaveClass(/stamp-go/);
    expect(await balance(page)).toBe(10);
    await page.reload(); await ready(page);
    expect(await balance(page)).toBe(10);
    expect((await saved(page)).gameData.practice.stamped).toBeUndefined();
    await toggle(page).click();
    await expect(card(page)).toHaveClass(/stamp-go/);                   // opened: the stamp plays now, once
    await expect(page.locator('#prTitle')).toContainText('+10 tokens');
    expect((await saved(page)).gameData.practice.stamped).toEqual({[MON]: true});
    expect(await balance(page)).toBe(10);
    watch.check();
  });

  test('the body slides (≈ 200 ms); under reduced motion it just switches', async ({page}) => {
    const watch = await prepare(page, {store: oneDone()});
    await lobby(page); await ready(page);
    const after = () => page.evaluate(() => {
      document.getElementById('prToggle').click();
      const c = document.getElementById('practiceCard'), b = document.getElementById('prBody');
      return {anim: c.dataset.anim || null, collapsed: c.classList.contains('collapsed'), transition: b ? b.style.transition : ''};
    });
    let s = await after();                                               // closing: it slides first
    expect(s).toMatchObject({anim: '1', collapsed: false});
    expect(s.transition).toContain('height');
    await expect(card(page)).toHaveClass(/collapsed/);
    await expect(card(page)).not.toHaveAttribute('data-anim', '1');
    s = await after();                                                   // opening: the full card, sliding open
    expect(s).toMatchObject({anim: '1', collapsed: false});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.reload(); await ready(page);
    s = await after();
    expect(s).toEqual({anim: null, collapsed: true, transition: ''});    // switched at once
    s = await after();
    expect(s).toEqual({anim: null, collapsed: false, transition: ''});
    watch.check();
  });

  test('the slim bar is one line at phone, iPad and Chromebook sizes and the lobby moves up (screenshots: collapsed and open)', async ({page}, info) => {
    const watch = await prepare(page, {store: oneDone()});
    for (const [name, size] of Object.entries(Object.assign({phone: {width: 390, height: 844}}, VIEWPORTS))) {
      await page.setViewportSize(size);
      await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('bandarcade.v1')); if (d && d.gameData && d.gameData.practice) delete d.gameData.practice.collapsed; localStorage.setItem('bandarcade.v1', JSON.stringify(d)); } catch (e) { /* first page */ } }).catch(() => {});
      await lobby(page); await ready(page);
      const open = await card(page).boundingBox();
      await page.screenshot({path: info.outputPath(`practice-open-${name}.png`)});
      await toggle(page).click();
      await expect(card(page)).toHaveClass(/collapsed/);
      const m = await page.evaluate(() => {
        const c = document.getElementById('practiceCard'), r = c.getBoundingClientRect(), t = document.getElementById('prTitle');
        const parts = ['#prTitle', '.pr-dots', '.pr-count', '#prToggle'].map(q => c.querySelector(q).getBoundingClientRect());
        const next = c.nextElementSibling ? c.nextElementSibling.getBoundingClientRect() : document.getElementById('zones').getBoundingClientRect();
        const mid = x => x.top + x.height / 2;
        return {h: r.height, bottom: r.bottom, nextTop: next.top, titleFits: t.scrollWidth <= t.clientWidth + 1,
          oneLine: parts.every(p => Math.abs(mid(p) - mid(parts[0])) < 12), inside: parts.every(p => p.left >= r.left - 1 && p.right <= r.right + 1), W: innerWidth, right: r.right};
      });
      await page.screenshot({path: info.outputPath(`practice-collapsed-${name}.png`)});
      expect(m.h, name).toBeLessThanOrEqual(64);
      expect(m.h, name).toBeLessThan(open.height);
      expect(m.oneLine, name).toBe(true);
      expect(m.titleFits, name).toBe(true);
      expect(m.inside, name).toBe(true);
      expect(m.right, name).toBeLessThanOrEqual(m.W + 1);
      expect(m.nextTop - m.bottom, name).toBeLessThanOrEqual(20);          // no empty gap: what's below moved up
      expect(await offscreen(page), name).toEqual([]);
    }
    watch.check();
  });
});
