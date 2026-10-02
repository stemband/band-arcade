/* TUNE UP (note-checker/): the toolbox's tabs, THE TUNER (the hot-air balloon) and THE METRONOME (the avatar that bops
   on the beat + the TEMPO LADDER), and their two avatar items. ?demo stands in for the microphone (Pitch.demoNote,
   Pitch.demoJitter). The Note Checker itself is covered by the smoke and pitch tests. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

/* WebKit on a test machine with no sound card: its audio clock never moves, so the metronome runs with SOUND OFF there
   (its performance.now() clock, as on a muted iPad) */
const store = (browser, member = 'trumpet', extra = {}) => device(member, Object.assign(browser === 'webkit' ? {sfx: false} : {}, extra));
const dayKey = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

async function open(page, tool, q = '') {
  await page.goto(`note-checker/index.html?demo&nostart${tool ? '&tool=' + tool : ''}${q}`);
  await page.waitForFunction(() => window.Arcade && Arcade.TuneUp && Arcade.TuneUp.tab);
  // the microphone reminder (once per play session): its button "starts" the demo microphone
  const go = page.locator('[data-act=go]').filter({visible: true});
  if (await go.count()) await go.first().click();
}
const tuner = page => page.evaluate(() => Arcade.TuneUp.tuner.state());
const play = (page, semis) => page.evaluate(d => { const T = Arcade.TuneUp.tuner; Arcade.Pitch.demoNote = d === null ? null : T.state().target + d; }, semis);

test.describe('Tune Up: the toolbox', () => {
  test('?tool= opens a tab, the tabs move with ←/→, and the last tab is remembered', {tag: '@quick'}, async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('tuner');
    await expect(page.locator('#toolTuner')).toBeVisible();
    await expect(page.locator('#toolChecker')).toBeHidden();
    await page.locator('#tabTuner').focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('metronome');
    await expect(page.locator('#tabMetro')).toBeFocused();
    await expect(page.locator('#tabMetro')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('checker');
    await page.keyboard.press('ArrowLeft');
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('metronome');
    // every tab ≥ 48 px tall
    for (const id of ['#tabChecker', '#tabTuner', '#tabMetro']) expect((await page.locator(id).boundingBox()).height).toBeGreaterThanOrEqual(48);
    await page.goto('note-checker/index.html?demo&nostart');
    await page.waitForFunction(() => Arcade.TuneUp && Arcade.TuneUp.tab);
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('metronome');
    await open(page, 'metronome');
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('metronome');
    watch.check('on Tune Up');
  });

  test('switching tabs stops the other tool\'s sound and the microphone; the metronome never listens', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    expect((await page.evaluate(() => Arcade.TuneUp.state())).listening).toBe(true);
    await page.locator('#tabMetro').click();
    let st = await page.evaluate(() => Arcade.TuneUp.state());
    expect(st.listening).toBe(false);
    expect(st.micActive).toBe(false);
    await page.locator('#mtGo').click();
    await expect.poll(() => page.evaluate(() => Arcade.TuneUp.metronome.state().running)).toBe(true);
    expect((await page.evaluate(() => Arcade.TuneUp.state())).listening).toBe(false);   // clicking never opened the mic
    await page.locator('#tabChecker').click();
    st = await page.evaluate(() => ({m: Arcade.TuneUp.metronome.state(), t: Arcade.TuneUp.state()}));
    expect(st.m.running).toBe(false);
    expect(st.m.kitCount).toBe(0);
    expect(st.t.listening).toBe(true);
    watch.check('switching tabs');
  });

  test('the Snare Drum: the Tuner says drums don\'t need tuning and points to the Metronome', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName, 'snare')});
    await open(page, 'tuner');
    await expect(page.locator('#tnDrums')).toBeVisible();
    await expect(page.locator('#tnDrums')).toContainText("Drums don't need tuning! Try the Metronome.");
    await expect(page.locator('#tnMain')).toBeHidden();
    expect((await page.evaluate(() => Arcade.TuneUp.state())).listening).toBe(false);
    await page.locator('#tnToMetro').click();
    expect(await page.evaluate(() => Arcade.TuneUp.tab)).toBe('metronome');
    watch.check('snare');
  });
});

test.describe('Tune Up: the Tuner', () => {
  test('the balloon: sharp above the platform, flat below, in tune landed; words and arrows match; nothing heard = resting', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    await expect.poll(async () => (await tuner(page)).words).toBe('Play a long note!');
    expect((await tuner(page)).pos).toBe('rest');
    await play(page, .2);
    await expect.poll(async () => (await tuner(page)).words).toBe('Too high (sharp)');
    let s = await tuner(page);
    expect(s.pos).toBe('above');
    expect(s.arrow).toBe('down');                       // move down
    expect(s.basket).toBeLessThan(s.platform);
    await play(page, -.2);
    await expect.poll(async () => (await tuner(page)).words).toBe('Too low (flat)');
    s = await tuner(page);
    expect(s.pos).toBe('below');
    expect(s.arrow).toBe('up');
    expect(s.basket).toBeGreaterThan(s.platform);
    await play(page, .03);
    await expect.poll(async () => (await tuner(page)).words).toBe('IN TUNE!');
    s = await tuner(page);
    expect(s.pos).toBe('landed');
    expect(s.face).toBe('happy');
    expect(s.arrow).toBe(null);
    await play(page, .1);                                 // close: "Almost!"
    await expect.poll(async () => (await tuner(page)).words).toBe('Almost! A little lower');
    await play(page, -.1);
    await expect.poll(async () => (await tuner(page)).words).toBe('Almost! A little higher');
    await play(page, null);
    await expect.poll(async () => (await tuner(page)).pos).toBe('rest');
    expect((await tuner(page)).words).toBe('Play a long note!');
    watch.check('the balloon');
  });

  test('the written name for the instrument: trumpet concert B♭ = C, alto sax concert B♭ = G', async ({page, browser, browserName}) => {
    await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    await page.evaluate(() => { Arcade.Pitch.demoNote = 58; });       // concert B♭3
    await expect.poll(async () => (await tuner(page)).big).toBe('C');
    expect((await tuner(page)).small).toBe('concert B♭');
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    const p2 = await (await browser.newContext()).newPage();
    await prepare(p2, {store: store(browserName, 'altosax')});
    await open(p2, 'tuner');
    await p2.evaluate(() => { Arcade.Pitch.demoNote = 58; });
    await expect.poll(async () => (await tuner(p2)).big).toBe('G');
    expect((await tuner(p2)).small).toBe('concert B♭');
  });

  test('HOLD IT fills in 4 s in tune and drains when the note goes out; the tip shows after 1.5 s sharp', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    await play(page, .05);
    await page.waitForTimeout(2500);
    let s = await tuner(page);
    expect(s.filled).toBe(false);
    expect(s.hold).toBeGreaterThan(1.5);
    await expect.poll(async () => (await tuner(page)).filled, {timeout: 4000}).toBe(true);
    expect((await tuner(page)).holdText).toContain('Steady! 4 seconds in tune');
    expect(await page.evaluate(k => (Arcade.store.gameData('tuneup').holds || {})[k], dayKey())).toBe(1);
    await play(page, .3);                                 // out of `close`: it drains
    await page.waitForTimeout(600);
    s = await tuner(page);
    expect(s.hold).toBeLessThan(3.6);
    // THE TIP: sharp for 1.5 s = the trumpet's line
    await page.waitForTimeout(1200);
    expect((await tuner(page)).tip).toBe('Pull your main tuning slide out a little.');
    await play(page, -.3);
    await page.waitForTimeout(500);
    expect((await tuner(page)).tip).not.toBe('Push your main tuning slide in.');
    await expect.poll(async () => (await tuner(page)).tip, {timeout: 3000}).toBe('Push your main tuning slide in.');
    watch.check('hold it');
  });

  test('HEAR THE NOTE: the tone plays with the mic paused, then the cents are measured from the target; a wrong note is named', async ({page, browserName}) => {
    test.skip(browserName !== 'chromium', 'the tone needs a running audio clock (Chromium)');
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    await page.locator('#tnHear').click();
    await expect.poll(async () => (await tuner(page)).phase).toBe('tone');
    // while the tone plays the microphone is paused: the tone's own pitch never counts
    await page.evaluate(() => { const T = Arcade.TuneUp.tuner.state(); Arcade.Pitch.demoNote = T.target; });
    await page.waitForTimeout(700);
    let st = await page.evaluate(() => ({s: Arcade.TuneUp.tuner.state(), listening: Arcade.Pitch.listening(), tones: Arcade.tones.history.slice()}));
    expect(st.listening).toBe(false);
    expect(st.s.raw).toBe(null);
    expect(st.s.words).toBe('Listen…');
    expect(st.tones.length).toBe(1);
    expect(st.tones[0].noteMs).toBe(2000);
    expect(Math.abs(st.tones[0].midis[0] - st.s.target)).toBeLessThan(.001);
    await expect.poll(async () => (await tuner(page)).phase, {timeout: 4000}).toBe('yourturn');
    expect(await page.evaluate(() => Arcade.Pitch.listening())).toBe(true);
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
    await expect.poll(async () => (await tuner(page)).words).toBe('Now you play it!');
    expect((await tuner(page)).flag).toBe('C');
    // TARGET mode: an octave up and 10 cents sharp is 10 cents from the target (any octave)
    await play(page, 12.1);
    await expect.poll(async () => Math.round((await tuner(page)).cents)).toBeGreaterThanOrEqual(8);
    expect((await tuner(page)).words).toBe('Almost! A little lower');
    // another note: "That's a B, try a C!" (trumpet's written names)
    await play(page, -1);
    await expect.poll(async () => (await tuner(page)).words).toBe("That's a B, try a C!");
    watch.check('hear the note');
  });

  test('reduced motion: the balloon lands with no confetti', async ({page, browserName}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await prepare(page, {store: store(browserName)});
    await open(page, 'tuner');
    await play(page, .02);
    await expect.poll(async () => (await tuner(page)).landed).toBe(true);
    expect((await tuner(page)).confetti).toBe(0);
  });

  test('the Golden Tuning Fork: the 5th full HOLD IT ring of the day shows the UNLOCKED! card once the note ends', async ({page, browserName}) => {
    await prepare(page, {store: store(browserName, 'trumpet', {gameData: {tuneup: {holds: {[dayKey()]: 4}}}})});
    await open(page, 'tuner');
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('hand', 'tuningfork'))).toBe(false);
    await play(page, .02);
    await expect.poll(async () => (await tuner(page)).filled, {timeout: 6000}).toBe(true);
    await expect(page.locator('.tu-reward')).toHaveCount(0);           // never in the middle of a hold
    await play(page, null);
    await expect(page.locator('.tu-reward')).toContainText('Golden Tuning Fork', {timeout: 4000});
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('hand', 'tuningfork'))).toBe(true);
    // never sold, and in the avatar code's table
    expect(await page.evaluate(() => Arcade.Tokens.catalog().some(i => /tuningfork|plate:ladder/.test(i.key)))).toBe(false);
  });
});

test.describe('Tune Up: the Metronome', () => {
  const metro = page => page.evaluate(() => Arcade.TuneUp.metronome.state());
  const log = page => page.evaluate(() => Arcade.TuneUp.metronome.log());

  test('clicks exactly 60/BPM apart, beat 1 accented, 6/8 accents 1 and 4, subdivisions softer', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'metronome');
    await page.evaluate(() => Arcade.TuneUp.metronome.setBpm(150));
    await page.locator('#mtGo').click();
    await page.waitForTimeout(2600);
    let L = (await log(page)).filter(e => e.sub === 0);
    expect(L.length).toBeGreaterThan(5);
    for (let i = 1; i < L.length; i++) expect(Math.abs(L[i].t - L[i - 1].t - 60 / 150)).toBeLessThan(1e-5);
    L.forEach(e => { expect(e.accent).toBe(e.beat === 0); expect(e.one).toBe(e.beat === 0); });
    expect(L.find(e => e.beat === 0).vol).toBeGreaterThan(L.find(e => e.beat === 1).vol);
    if (browserName === 'chromium') expect(L.every(e => e.sound)).toBe(true);
    await page.locator('#mtGo').click();
    // 6/8: six beats, accents on 1 and 4
    await page.locator('#mtMeter [data-v="6/8"]').click();
    await expect(page.locator('#mtSub button').first()).toBeDisabled();
    await page.evaluate(() => Arcade.TuneUp.metronome.clear());
    await page.locator('#mtGo').click();
    await page.waitForTimeout(2900);
    L = (await log(page)).filter(e => e.sub === 0);
    expect(L.some(e => e.beat === 5)).toBe(true);
    L.forEach(e => expect(e.accent).toBe(e.beat === 0 || e.beat === 3));
    await page.locator('#mtGo').click();
    // subdivisions: eighths in 4/4, the extra ticks softer, evenly between the beats
    await page.locator('#mtMeter [data-v="4/4"]').click();
    await page.locator('#mtSub [data-v="2"]').click();
    await page.evaluate(() => Arcade.TuneUp.metronome.clear());
    await page.locator('#mtGo').click();
    await page.waitForTimeout(1500);
    L = await log(page);
    const subs = L.filter(e => e.sub === 1);
    expect(subs.length).toBeGreaterThan(2);
    subs.forEach(e => expect(e.vol).toBeLessThan(.6));
    for (let i = 1; i < L.length; i++) expect(Math.abs(L[i].t - L[i - 1].t - 60 / 150 / 2)).toBeLessThan(1e-5);
    await page.locator('#mtGo').click();
    // the schedule never accumulates: 5 minutes of ticks are exactly j × 60/BPM
    const ts = await page.evaluate(() => Arcade.TuneUp.metronome.times(97, 97 * 5));
    ts.forEach((t, j) => expect(Math.abs(t - j * 60 / 97)).toBeLessThan(1e-9));
    watch.check('the metronome');
  });

  test('the bop lands on the audible beat (≤ 10 ms), silent mode schedules no sound, reduced motion = no bobbing', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'metronome');
    await page.evaluate(() => Arcade.TuneUp.metronome.setBpm(132));
    await page.locator('#mtGo').click();
    await page.waitForTimeout(3000);
    const bops = await page.evaluate(() => Arcade.TuneUp.metronome.bops());
    expect(bops.length).toBeGreaterThan(4);
    // land = where the bop's phase puts the beat (the audio clock: exact on any machine); seen = the first frame drawn
    // after the beat, which is the MACHINE's frame rate: a busy CI runner (WebKit, software rendering) can stall one
    // frame past 100 ms, so the typical delay must stay under 0.1 s and no beat may be drawn later than 0.25 s
    bops.forEach(b => { expect(Math.abs(b.land - b.click)).toBeLessThanOrEqual(.010); expect(b.seen - b.click).toBeGreaterThanOrEqual(0); expect(b.seen - b.click).toBeLessThan(.25); });
    const late = bops.map(b => b.seen - b.click).sort((x, y) => x - y);
    expect(late[Math.floor(late.length / 2)], 'the typical frame after a beat').toBeLessThan(.1);
    expect(await page.locator('#mtDancer').evaluate(el => el.style.transform)).not.toBe('');
    await page.locator('#mtGo').click();
    // SILENT: nothing scheduled to sound
    await page.locator('#mtSilent').click();
    await page.evaluate(() => Arcade.TuneUp.metronome.clear());
    await page.locator('#mtGo').click();
    await page.waitForTimeout(1500);
    const L = await log(page);
    expect(L.length).toBeGreaterThan(2);
    expect(L.every(e => !e.sound)).toBe(true);
    expect((await metro(page)).kitCount).toBe(0);
    await page.locator('#mtGo').click();
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.evaluate(() => Arcade.reducedMotion && Arcade.reducedMotion.refresh && Arcade.reducedMotion.refresh());
    await page.locator('#mtGo').click();
    await page.waitForTimeout(1200);
    expect(await page.locator('#mtDancer').evaluate(el => el.style.transform)).toBe('');
    await expect(page.locator('#mtCount .mt-n.lit')).toHaveCount(1);
    watch.check('bop + silent');
  });

  test('tap tempo (4 taps), the tempo words at their boundaries, keyboard tempo, settings remembered', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'metronome');
    // four taps half a second apart = 120 (timed inside the page, so the test runner's own delays don't count)
    await page.evaluate(() => new Promise(done => { let n = 0; const t0 = performance.now();
      const go = () => { Arcade.TuneUp.metronome.tap(); if (++n < 4) setTimeout(go, t0 + n * 500 - performance.now()); else done(); }; go(); }));
    const b = (await metro(page)).shown;
    expect(b).toBeGreaterThanOrEqual(117); expect(b).toBeLessThanOrEqual(123);
    // the T key taps too; a tap more than 2 s after the last starts over (one tap alone changes nothing)
    await page.waitForTimeout(2100);
    await page.locator('#mtStage').click();
    await page.keyboard.press('t');
    expect((await metro(page)).shown).toBe(b);
    const words = await page.evaluate(() => [59, 60, 65, 66, 75, 76, 107, 108, 119, 120, 167, 168, 208].map(Arcade.TuneUp.metronome.tempoWord));
    expect(words).toEqual(['Largo', 'Larghetto', 'Larghetto', 'Adagio', 'Adagio', 'Andante', 'Andante', 'Moderato', 'Moderato', 'Allegro', 'Allegro', 'Presto', 'Presto']);
    await page.evaluate(() => Arcade.TuneUp.metronome.setBpm(107));
    await expect(page.locator('#mtWord')).toHaveText('Andante');
    await page.locator('#mtStage').click();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#mtWord')).toHaveText('Moderato');
    expect((await metro(page)).shown).toBe(108);
    await page.locator('#mtMeter [data-v="3/4"]').click();
    await page.locator('#mtSub [data-v="3"]').click();
    await page.locator('#mtLad summary').click();
    await page.locator('#ldGoal').fill('120'); await page.locator('#ldGoal').dispatchEvent('change');
    await page.reload();
    await page.waitForFunction(() => Arcade.TuneUp && Arcade.TuneUp.tab);
    const s = await metro(page);
    expect(s.saved).toMatchObject({bpm: 108, meter: '3/4', sub: 3});
    expect(s.ladderSettings.goal).toBe(120);
    watch.check('controls');
  });

  test('THE TEMPO LADDER: 60→100 step 4 is 10 steps; steps land on downbeats; HOLD, STEP BACK, the goal message and the fanfare after the click', async ({page, browserName}) => {
    test.setTimeout(120_000);
    const watch = await prepare(page, {store: store(browserName)});
    await open(page, 'metronome');
    const r = await page.evaluate(() => Arcade.TuneUp.metronome.rungs());
    expect(r[0]).toBe(60); expect(r[r.length - 1]).toBe(100); expect(r.length - 1).toBe(10);
    // a quick ladder: 2/4, 160 → 176 step 4, one measure a step, stop at the goal
    await page.locator('#mtMeter [data-v="2/4"]').click();
    await page.locator('#mtLad summary').click();
    for (const [id, v] of [['#ldStart', 160], ['#ldGoal', 176], ['#ldStep', 4], ['#ldMeas', 1]]) { await page.locator(id).fill(String(v)); await page.locator(id).dispatchEvent('change'); }
    await page.locator('#ldStop').click();
    await page.evaluate(() => Arcade.TuneUp.metronome.clear());
    await page.locator('#ldGo').click();
    await expect.poll(async () => (await metro(page)).msg, {timeout: 12000}).toBe('You climbed to 176! 🎉');
    await expect.poll(async () => (await metro(page)).running, {timeout: 6000}).toBe(false);
    await expect.poll(async () => (await metro(page)).fanfares, {timeout: 4000}).toBe(1);
    let L = (await log(page)).filter(e => e.sub === 0);
    expect(L[0].countIn).toBe(true);
    expect(L.filter(e => e.countIn).length).toBe(2);                 // one measure of 2/4 counted in
    for (let i = 1; i < L.length; i++) if (L[i].bpm !== L[i - 1].bpm) {
      expect(L[i].beat).toBe(0);                                      // a new tempo only ON A DOWNBEAT
      expect(L[i].bpm - L[i - 1].bpm).toBe(4);
    }
    expect([...new Set(L.map(e => e.bpm))]).toEqual([160, 164, 168, 172, 176]);
    // the beats keep their spacing across the steps
    for (let i = 1; i < L.length; i++) expect(Math.abs(L[i].t - L[i - 1].t - 60 / L[i - 1].bpm)).toBeLessThan(1e-5);
    expect((await metro(page)).ladders).toBe(0);                        // 4 steps: too short for the plate
    // HOLD and STEP BACK
    await page.locator('#ldStop').click();                             // keep going at the goal
    for (const [id, v] of [['#ldStart', 120], ['#ldGoal', 208], ['#ldStep', 8]]) { await page.locator(id).fill(String(v)); await page.locator(id).dispatchEvent('change'); }
    await page.evaluate(() => Arcade.TuneUp.metronome.clear());
    await page.locator('#ldGo').click();
    await expect.poll(async () => ((await metro(page)).ladder || {}).rung, {timeout: 8000, intervals: [50]}).toBeGreaterThanOrEqual(2);
    await page.locator('#ldHold').click();
    const held = (await metro(page)).ladder.rung;
    await page.waitForTimeout(3000);
    expect((await metro(page)).ladder.rung).toBe(held);
    expect((await metro(page)).stat).toContain('Holding');
    await page.locator('#ldBack').click();                              // (HOLD stays on: it stays one step lower)
    await expect.poll(async () => (await metro(page)).ladder.rung, {timeout: 4000}).toBe(held - 1);
    await page.waitForTimeout(1500);
    expect((await metro(page)).ladder.rung).toBe(held - 1);
    L = (await log(page)).filter(e => e.sub === 0);
    for (let i = 1; i < L.length; i++) if (L[i].bpm !== L[i - 1].bpm) expect(L[i].beat).toBe(0);
    await page.locator('#ldGo').click();                                // stop the ladder
    expect((await metro(page)).running).toBe(false);
    watch.check('the ladder');
  });

  test('a hidden tab pauses the metronome', async ({page, browserName}) => {
    await prepare(page, {store: store(browserName)});
    await open(page, 'metronome');
    await page.locator('#mtGo').click();
    await expect.poll(async () => (await metro(page)).running).toBe(true);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
    const s = await metro(page);
    expect(s.running).toBe(false);
    expect(s.paused).toBe(true);
    await expect(page.locator('#mtPaused')).toHaveText('Paused — tap START');
  });

  test('the Ladder Climber plate: 3 ladders of 8+ steps; never sold', async ({page, browserName}) => {
    await prepare(page, {store: store(browserName, 'trumpet', {gameData: {tuneup: {ladders: 2}}})});
    await open(page, 'metronome');
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('plate', 'ladder'))).toBe(false);
    expect(await page.evaluate(() => Arcade.Avatar.requirement('plate', 'ladder'))).toContain('Tempo Ladders');
    await page.evaluate(() => { Arcade.store.gameData('tuneup').ladders = 3; });
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('plate', 'ladder'))).toBe(true);
    expect(await page.evaluate(() => Arcade.avatarCode.TABLE.find(r => r[0] === 'plate')[2].includes('ladder') && Arcade.avatarCode.TABLE.find(r => r[0] === 'hand')[2].includes('tuningfork'))).toBe(true);
  });
});
