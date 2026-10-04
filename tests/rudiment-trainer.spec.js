/* THE RUDIMENT TRAINER (rudiment-trainer/): the 40 PAS rudiments' data (every text reads with no errors, ids, PAS order,
   families, tempo sets), their strokes, the picker (tabs, cards in PAS order, thumbnails, pips and the Diamond badge,
   the remembered tab, ?r=), a rudiment's page (play/stop, a new tempo at the next repetition, the check-off only after 4
   repetitions, saving, unchecking, Open–Close–Open needs a whole run on the test clock, the roll switch only with rolls,
   no stars / tokens / leaderboard), `fit` (a trumpet is sent away; snare and bells open it), the practice-time log, the
   Backup Code round trip, the layout at phone / iPad / Chromebook sizes and GALLERY=1's docs/gallery/rudiment-trainer.png.
   Sound is OFF unless a test needs the audio clock (the player then runs on performance.now: CI's WebKit has no sound card). */
const {test, expect} = require('@playwright/test');
const path = require('path');
const {prepare, device, saved, VIEWPORTS} = require('./helpers');

const ROOT = path.join(__dirname, '..');
const quiet = (member = 'snare', extra = {}) => device(member, Object.assign({sfx: false}, extra));
async function open(page, q = '', store = quiet()) {
  const watch = await prepare(page, {store});
  await page.goto(`rudiment-trainer/index.html?demo&nostart${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.RudimentTrainer);
  return watch;
}
const st = page => page.evaluate(() => { const s = Arcade.RudimentTrainer.state(); delete s.player; return s; });

test.describe('rudiment trainer: the data', () => {
  test('all 40 read with no errors; unique ids, PAS 1–40 in order, 15 / 4 / 11 / 10 per family, every tempo set has 5 tempos', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(() => {
      const R = Arcade.Rudiments, C = Arcade.Counting;
      return {n: R.LIST.map(x => x.n), ids: R.LIST.map(x => x.id), fams: R.FAMILIES.map(f => [f.id, R.LIST.filter(x => x.fam === f.id).length]),
        errors: R.LIST.map(x => [x.id, C.parse(x.text, x.time).errors]).filter(([, e]) => e.length),
        sets: R.LIST.map(x => [x.id, R.bpms(x).length, !!R.TEMPO_SETS[x.tiers]]).filter(([, n, ok]) => n !== 5 || !ok),
        tiers: R.TIERS.map(t => t.id), times: [...new Set(R.LIST.map(x => x.time))].sort(), credit: R.CREDIT};
    });
    expect(r.errors).toEqual([]);
    expect(r.n).toEqual(Array.from({length: 40}, (_, i) => i + 1));
    expect(new Set(r.ids).size).toBe(40);
    expect(r.fams).toEqual([['roll', 15], ['diddle', 4], ['flam', 11], ['drag', 10]]);
    expect(r.sets).toEqual([]);
    expect(r.tiers).toEqual(['bronze', 'silver', 'gold', 'platinum', 'diamond']);       // saved: never renamed or reordered
    expect(r.times).toEqual(['2/4', '3/4', '4/4', '6/8']);
    expect(r.credit).toBe('The 40 PAS International Drum Rudiments · Percussive Arts Society');
    watch.check();
  });

  test('each rudiment\'s strokes follow its sticking (the paradiddle, the five stroke roll, the flam accent, the single ratamacue)', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(() => {
      const R = Arcade.Rudiments, C = Arcade.Counting;
      const sticks = x => C.strokes(C.parse(x.text, x.time)).map(s => (s.grace ? s.hand.toLowerCase() : s.hand) + (s.accent ? '>' : '')).join(' ');
      // the sticking written in the text: graces, then the hand (twice for a / diddle), the accent on its first stroke
      const fromText = x => x.text.replace(/[[\]|]/g, ' ').trim().split(/\s+/).filter(Boolean).flatMap(tok => {
        const m = /^(?:\{([RL]+)\})?[whqes]\.*(r?)([/z]*)(>?)([RL]?)_?$/.exec(tok);
        if (!m || m[2]) return [];
        const g = (m[1] || '').split('').filter(Boolean).map(h => h.toLowerCase()), main = m[5] + (m[4] ? '>' : '');
        return g.concat(/\//.test(m[3]) ? [main, m[5]] : [main]);
      }).join(' ');
      return {all: R.LIST.map(x => [x.id, sticks(x) === fromText(x)]).filter(([, ok]) => !ok),
        para: sticks(R.byId('single-paradiddle')), five: sticks(R.byId('five-stroke-roll')), flam: sticks(R.byId('flam-accent')), rata: sticks(R.byId('single-ratamacue'))};
    });
    expect(r.all).toEqual([]);
    expect(r.para).toBe('R> L R R L> R L L');
    expect(r.five.split(' ').slice(0, 5).join(' ')).toBe('R R L L R>');
    expect(r.flam).toBe('l R> L R r L> R L');
    expect(r.rata.split(' ').slice(0, 6).join(' ')).toBe('l l R L R L>');
    watch.check();
  });
});

test.describe('rudiment trainer: the picker', () => {
  test('tabs, the 40 cards in PAS order with thumbnails, pips and the Diamond badge from saved check-offs; the tab is remembered', {tag: '@quick'}, async ({page}) => {
    const all = {bronze: '2026-10-01', silver: '2026-10-01', gold: '2026-10-01', platinum: '2026-10-02', diamond: '2026-10-02'};
    const watch = await open(page, '', quiet('snare', {gameData: {'rudiment-trainer': {done: {'single-paradiddle': all, 'flam': {bronze: '2026-10-02'}}}}}));
    const cards = page.locator('#grid .rt-card');
    await expect(cards).toHaveCount(40);
    expect(await cards.evaluateAll(l => l.map(c => c.dataset.id)), 'PAS order').toEqual(await page.evaluate(() => Arcade.Rudiments.LIST.map(r => r.id)));
    expect(await page.locator('#grid .rt-thumb svg.rs').count()).toBe(40);
    await expect(page.locator('.ls-head')).toHaveText(/Select your rudiment/);
    // the paradiddle: all five tempos = the Diamond badge; the flam: one pip lit
    await expect(page.locator('[data-id="single-paradiddle"] .rt-diamond')).toBeVisible();
    await expect(page.locator('[data-id="single-paradiddle"] .rt-pip.on')).toHaveCount(5);
    await expect(page.locator('[data-id="flam"] .rt-pip.on')).toHaveCount(1);
    await expect(page.locator('[data-id="flam"] .rt-diamond')).toHaveCount(0);
    await expect(page.locator('[data-tab="diddle"] small')).toHaveText('1 / 4 Diamond');
    await expect(page.locator('[data-tab="all"] small')).toHaveText('1 / 40 Diamond');
    // a family tab shows its cards only, and is remembered
    await page.locator('[data-tab="flam"]').click();
    expect(await cards.evaluateAll(l => l.filter(c => !c.hidden).length)).toBe(11);
    await page.reload(); await page.waitForFunction(() => window.Arcade && Arcade.RudimentTrainer);
    expect((await st(page)).tab).toBe('flam');
    await expect(page.locator('[data-tab="flam"]')).toHaveAttribute('aria-selected', 'true');
    // select, START: its page; ← RUDIMENTS back, the card stays selected
    await page.locator('[data-id="flam-tap"]').click();
    await page.locator('.ls-start').click();
    expect((await st(page)).screen).toBe('page');
    await page.locator('#backBtn').click();
    expect((await st(page)).screen).toBe('hub');
    expect(await page.evaluate(() => Arcade.LevelSelect.state().sel)).toBe(21);
    watch.check();
  });

  test('?r=<id> opens that rudiment\'s page directly (Today\'s Practice); an unknown id opens the picker', async ({page}) => {
    const watch = await open(page, '&r=single-ratamacue');
    expect(await st(page)).toMatchObject({screen: 'page', cur: 'single-ratamacue'});
    await expect(page.locator('#pgTitle')).toHaveText('#38 Single Ratamacue');
    await page.goto('rudiment-trainer/index.html?demo&nostart&r=nope');
    await page.waitForFunction(() => window.Arcade && Arcade.RudimentTrainer);
    expect((await st(page)).screen).toBe('hub');
    watch.check();
  });
});

test.describe('rudiment trainer: a rudiment', () => {
  test('play / stop, the strokes light, a new tempo lands on the next repetition, the check-off only after 4 repetitions; save and uncheck; no stars, tokens or leaderboard', async ({page}) => {
    test.setTimeout(60_000);
    const watch = await open(page, '&r=single-stroke-roll');
    const before = await saved(page);
    await expect(page.locator('#viewOpt')).toBeHidden();                       // no / rolls here: no roll switch
    await expect(page.locator('#check .rt-hint')).toHaveText('Play along 4 times at Bronze to check it off (0 of 4).');
    // Bronze (60): the count-off (2 measures of 2/4 = 4 s), then rep 0; Diamond asked for during rep 0 lands on rep 1
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toHaveText('■ Stop');
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('#staff .rp-now').length), {timeout: 9000, intervals: [100]}).toBeGreaterThan(0);
    await page.locator('[data-tier="4"]').click();
    await expect.poll(async () => (await st(page)).reps['single-stroke-roll|diamond'] || 0, {timeout: 15000, intervals: [100]}).toBeGreaterThanOrEqual(1);
    const r = (await st(page)).reps;
    expect(r['single-stroke-roll|bronze']).toBe(1);                         // rep 0 played whole at Bronze
    // the check-off at Diamond: only after 4 repetitions there
    await expect(page.locator('#checkBtn')).toHaveCount(0);
    await expect.poll(async () => (await st(page)).reps['single-stroke-roll|diamond'] || 0, {timeout: 15000, intervals: [100]}).toBeGreaterThanOrEqual(4);
    await expect(page.locator('#checkBtn')).toHaveText('✓ I can play this at Diamond');
    await page.locator('#checkBtn').click();
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toHaveText('▶ Play');
    const after = await saved(page);
    expect(Object.keys(after.gameData['rudiment-trainer'].done)).toEqual(['single-stroke-roll']);
    expect(after.gameData['rudiment-trainer'].done['single-stroke-roll'].diamond).toMatch(/^\d{4}-\d\d-\d\d$/);
    await expect(page.locator('[data-tier="4"] .rt-tick')).toHaveCount(1);
    // NOT stars: no progress in `games`, no tokens, no leaderboard stars
    expect(JSON.stringify(after.games || {})).not.toContain('rudiment-trainer');
    expect(after.tokens || 0).toBe(before.tokens || 0);
    expect(JSON.stringify(after.leaderboard || {})).not.toContain('"stars"');
    expect(watch.posts).toEqual([]);
    // the check-off counts for Today's Practice
    expect(Object.keys(((after.activity || {})[await page.evaluate(() => Arcade.store.dayKey())] || {}).f || {})).toContain('rudiment-trainer');
    // uncheck
    await page.locator('#uncheckBtn').click();
    expect((await saved(page)).gameData['rudiment-trainer'].done || {}).toEqual({});
    await expect(page.locator('[data-tier="4"] .rt-tick')).toHaveCount(0);
    watch.check();
  });

  test('Open–Close–Open needs one whole run (the test clock); the roll switch shows only with rolls and is remembered', async ({page}) => {
    test.setTimeout(90_000);
    const watch = await prepare(page, {store: quiet()});
    await page.clock.install();
    await page.goto('rudiment-trainer/index.html?demo&nostart&r=five-stroke-roll');
    await page.waitForFunction(() => window.Arcade && Arcade.RudimentTrainer);
    await expect(page.locator('#viewOpt')).toBeVisible();
    await page.locator('#viewSeg [data-view="written"]').click();
    expect((await st(page)).view).toBe('written');
    expect(await page.locator('#staff g.rn[data-s="1"]').count()).toBeGreaterThan(0);   // the diddles written out
    await page.locator('[data-tier="oco"]').click();
    await expect(page.locator('#check .rt-hint')).toContainText('all the way through');
    await page.locator('#playBtn').click();
    await page.clock.runFor(45_000);
    expect((await st(page)).canCheck).toBe(false);                            // half a run is not enough
    await page.locator('#playBtn').click();                                    // stopped: still not
    await page.locator('#playBtn').click();
    for (let i = 0; i < 12 && (await st(page)).playing; i++) await page.clock.runFor(10_000);
    const s = await st(page);
    expect([s.playing, s.ocoRuns['five-stroke-roll'], s.canCheck]).toEqual([false, 1, true]);
    await expect(page.locator('#checkBtn')).toHaveText('✓ I can play this at Open–Close–Open');
    await page.locator('#checkBtn').click();
    expect((await saved(page)).gameData['rudiment-trainer'].done['five-stroke-roll'].oco).toBeTruthy();
    expect((await saved(page)).gameData['rudiment-trainer'].view).toBe('written');
    watch.check();
  });

  test('the practice-time log counts only while playing with the audio running and the page visible; noteFinished once at 2 minutes', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', 'CI\'s WebKit has no sound card: its audio clock never moves');
    test.setTimeout(60_000);
    const day = '2026-10-05';
    const watch = await open(page, `&r=single-paradiddle&today=${day}`, device('snare', {gameData: {'rudiment-trainer': {playS: {[day]: 115}}}}));
    await page.locator('#playBtn').click();                                    // a tap: the audio unlocks
    await expect.poll(async () => { const s = await page.evaluate(() => Arcade.RudimentTrainer.state()); return s.playS[day] || 0; }, {timeout: 20000, intervals: [250]}).toBeGreaterThan(115);
    await page.locator('#playBtn').click();
    const a = (await saved(page)).gameData['rudiment-trainer'].playS[day];
    expect(a).toBeGreaterThanOrEqual(120);
    expect(((await saved(page)).activity[day] || {}).f).toEqual({'rudiment-trainer': 1});
    // stopped: nothing more counts
    await page.waitForTimeout(1500);
    expect((await saved(page)).gameData['rudiment-trainer'].playS[day]).toBe(a);
    // a hidden page: the kit's pause stops the player (and nothing counts while hidden)
    await page.locator('#playBtn').click();
    await expect.poll(() => page.evaluate(() => !!(Arcade.RudimentTrainer.state().player || {}).audio), {timeout: 8000}).toBe(true);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    await expect.poll(async () => (await st(page)).playing, {timeout: 5000}).toBe(false);
    watch.check();
  });
});

test.describe('rudiment trainer: fit and saving', () => {
  test('a trumpet is sent to Choose Your Instrument with the game\'s message; snare and bells open it', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('rudiment-trainer/index.html?demo&nostart');
    await page.waitForURL(/index\.html\?.*game=rudiment-trainer.*need=fit/);
    await expect(page.locator('#spMsg')).toContainText('The Rudiment Trainer is for snare drum and bells players');
    for (const m of ['snare', 'bells']) {
      await page.evaluate(id => { const s = JSON.parse(localStorage.getItem('bandarcade.v1')); s.player = id; localStorage.setItem('bandarcade.v1', JSON.stringify(s)); }, m);
      await page.goto('rudiment-trainer/index.html?demo&nostart');
      await page.waitForFunction(() => window.Arcade && Arcade.RudimentTrainer);
      expect(page.url(), m).toContain('rudiment-trainer/index.html');
    }
    watch.check();
  });

  test('check-offs ride along in the Arcade Backup Code', async ({page}) => {
    const watch = await prepare(page, {store: device('snare', {gameData: {'rudiment-trainer': {done: {flam: {gold: '2026-10-03'}}, playS: {'2026-10-03': 130}}}})});
    await page.goto('index.html?demo&nostart');
    const back = await page.evaluate(async () => { const code = await Arcade.Backup.fullEncode(); const r = await Arcade.Backup.fullDecode(code); return r.ok && r.data.gameData['rudiment-trainer']; });
    expect(back).toMatchObject({done: {flam: {gold: '2026-10-03'}}, playS: {'2026-10-03': 130}});
    watch.check();
  });
});

const SIZES = [['phone', {width: 390, height: 844}], ...Object.entries(VIEWPORTS)];
for (const [name, vp] of SIZES) {
  test(`the layout fits (${name}): no sideways scroll, the staff rows fit, buttons ≥ 44 px`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await open(page);
    const check = () => page.evaluate(() => {
      const sw = document.scrollingElement.scrollWidth, small = [...document.querySelectorAll('.rt-tab, .rt-tier, #playBtn, #backBtn, .rt-opts .ui-seg button, .rt-card, .ls-start')]
        .filter(b => b.getClientRects().length && b.getBoundingClientRect().height < 43.5).map(b => b.id || b.className);
      const stage = document.getElementById('staff'), wide = [...stage.querySelectorAll('svg.rs')].filter(s => s.getBoundingClientRect().right > stage.getBoundingClientRect().right + 1).length;
      return {over: sw > innerWidth + 1, small, wide};
    });
    expect(await check()).toEqual({over: false, small: [], wide: 0});
    for (const id of ['triple-paradiddle', 'seventeen-stroke-roll', 'double-ratamacue']) {
      await page.evaluate(i => Arcade.RudimentTrainer.open(i), id);
      expect(await check(), id).toEqual({over: false, small: [], wide: 0});
    }
    watch.check();
  });
}

test('GALLERY=1: the picker and a rudiment page (docs/gallery/rudiment-trainer.png)', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await page.setViewportSize({width: 820, height: 1180});
  const watch = await open(page, '', quiet('snare', {gameData: {'rudiment-trainer': {done: {'single-paradiddle': {bronze: 1, silver: 1, gold: 1, platinum: 1, diamond: 1}, flam: {bronze: 1, silver: 1}}}}}));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(600);
  const hub = await page.screenshot({fullPage: false});
  await page.evaluate(() => Arcade.RudimentTrainer.open('flam-accent'));
  await page.locator('[data-tier="2"]').click();
  await page.evaluate(() => { const h = Arcade.RhythmStaff && document.querySelectorAll('#staff g.rn')[3]; if (h) h.classList.add('rp-now'); });
  await page.waitForTimeout(300);
  const pg = await page.screenshot({fullPage: false});
  // the two side by side on one sheet
  await page.setContent(`<body style="margin:0;background:#0b0716;display:flex;gap:12px;padding:12px">` +
    `<img src="data:image/png;base64,${hub.toString('base64')}" style="width:600px"><img src="data:image/png;base64,${pg.toString('base64')}" style="width:600px"></body>`);
  await page.setViewportSize({width: 1236, height: 900});
  await page.screenshot({path: path.join(ROOT, 'docs/gallery/rudiment-trainer.png'), fullPage: true});
  watch.check();
});
