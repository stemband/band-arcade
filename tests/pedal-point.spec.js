/* PEDAL POINT (pedal-point/, docs/games/pedal-point.md): a timpani tuning game with NO MICROPHONE. The synth (the
   principal on the pedal's equal-cents map, the partials at their ratios, the pedal gliding a ringing drum, silence when
   muted or while a mic listens), the drums (ranges, the fine tuner, the gauge), the scoring, every level's rules, the
   game never asking for the microphone, and the pedals working by touch and mouse on every screen size. */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');

const URL = 'pedal-point/index.html?demo&nostart';
const st = page => page.evaluate(() => Arcade.PedalPoint.state());
/** open the page, with a first tap (it unlocks the arcade's audio, as PRESS START's tap does) */
/** a device on DRUM SOUND: SYNTH (these tests check the synth; THE RECORDED DRUMS tests choose RECORDED themselves) */
const synthDevice = () => device('trumpet', {gameData: {'pedal-point': {drumSound: 'synth'}}});
async function open(page, store = synthDevice()) {
  const watch = await prepare(page, {store});
  await page.goto(URL);
  await page.locator('.game-title').click();
  return watch;
}
const freq = m => 440 * Math.pow(2, (m - 69) / 12);

test('opens with no instrument chosen, never asks for the microphone, and Level 1 plays to 3 stars by keys', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: {player: null, members: {}, games: {}, modes: {}, gameData: {'season-lobby': {giftAfter: '9999-12-31'}}}});
  await page.addInitScript(() => {
    window.__gum = 0;
    if (navigator.mediaDevices) { const real = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = function () { window.__gum++; return real.apply(this, arguments); }; }
  });
  await page.goto(URL);
  await expect(page).toHaveURL(/pedal-point\/index\.html/);                 // no Choose Your Instrument on the way in
  expect(await page.evaluate(() => typeof Arcade.Pitch)).toBe('undefined'); // pitch.js isn't even on the page
  await page.locator('.lvl[data-l="1"]').click();
  await page.locator('.ls-start').click();
  await page.locator('#introGo').click();
  for (let k = 0; k < 40 && !(await page.locator('#results').isVisible().catch(() => false)); k++) {
    await page.keyboard.press('a'); await page.keyboard.press('Enter');
    await expect.poll(async () => (await st(page)).phase).not.toBe('tune');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#results')).toBeVisible();
  const r = await page.evaluate(() => ({s: Arcade.PedalPoint.state(), p: Arcade.store.level('pedal-point', 'all', 1), gum: window.__gum}));
  expect(r.s.results.length).toBe(5);
  r.s.results.forEach(x => expect(Math.abs(x.cents)).toBeLessThan(.01));
  expect(r.p.stars).toBe(3);
  expect(r.p.best).toBe(500);
  expect(r.gum).toBe(0);
  watch.check();
});

test('THE SYNTH: the principal follows the pedal in equal cents, the partials sit at the timpani ratios, the pedal glides a ringing drum', async ({page, browserName}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.PedalPoint.begin(1));
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, D = Arcade.PPDrums, T = Arcade.Timpani, d = D.byId('29');
    const out = {};
    P.setFine(0, 0);
    P.setPedal(0, 2 / 7);                                    // F2 + 2 of its 7 half steps = G2
    out.g2 = P.state().drums[0].freq;
    P.setPedal(0, 0); out.low = P.state().drums[0].freq;
    P.setPedal(0, 1); out.high = P.state().drums[0].freq;
    P.setPedal(0, .5); out.mid = D.cents(P.state().drums[0].freq, D.freq(d.lowMidi));
    P.setPedal(0, 2 / 7);
    out.struck = P.strike(false);
    out.principal = T.test.principal(0);
    out.partials = T.test.partials(0);
    out.ratios = T.TIMPANI.partials.map(p => p.ratio).concat(T.TIMPANI.thump.ratio);
    out.ringing = T.test.ringing(0);
    out.start = T.test.voiceStart(0);
    out.glides = T.test.glides.length;
    P.setPedal(0, 4 / 7);                                    // the pedal moves while it rings: up to A2
    out.after = T.test.principal(0);
    out.lastGlide = T.test.glides[T.test.glides.length - 1];
    out.start2 = T.test.voiceStart(0);
    out.ringing2 = T.test.ringing(0);
    return out;
  });
  expect(r.g2).toBeCloseTo(freq(43), 3);                    // G2 = 97.999 Hz
  expect(r.low).toBeCloseTo(freq(41), 3);                   // F2
  expect(r.high).toBeCloseTo(freq(48), 3);                  // C3
  expect(r.mid).toBeCloseTo(350, 3);                        // halfway = half the range in CENTS (not in Hz)
  expect(r.struck).toBe(true);
  expect(r.principal).toBeCloseTo(freq(43), 3);
  expect(r.ratios).toEqual([1, 1.5, 1.98, 2.44, 2.94, .62]);
  r.partials.forEach((f, i) => expect(f).toBeCloseTo(freq(43) * r.ratios[i], 3));
  expect(r.ringing).toBe(true);
  expect(r.after).toBeCloseTo(freq(45), 3);                 // A2: the same voice, glided (never restarted)
  expect(r.lastGlide.freq).toBeCloseTo(freq(45), 3);
  expect(r.lastGlide.tc).toBe(.04);
  expect(r.start2).toBe(r.start);
  expect(r.ringing2).toBe(true);
  if (browserName === 'chromium') {                         // the audio engine itself has glided there (a running clock)
    await expect.poll(() => page.evaluate(() => Arcade.Timpani.test.live(0)[0])).toBeGreaterThan(freq(45) - .5);
    const live = await page.evaluate(() => Arcade.Timpani.test.live(0));
    live.forEach((f, i) => expect(Math.abs(f - freq(45) * r.ratios[i])).toBeLessThan(1));
  }
  watch.check();
});

test('THE SYNTH: nothing plays with the sound off, or while a microphone listens (the pitched-audio rule)', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.PedalPoint.begin(1));
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, T = Arcade.Timpani, out = {};
    out.on = P.strike(true);
    Arcade.store.setSfx(false);                             // SOUND OFF (the top bar's speaker button)
    out.muted = P.strike(true);
    out.mutedPipe = T.pipe(220);
    Arcade.store.setSfx(true);
    out.back = P.strike(true);
    Arcade.Pitch = {listening: () => true};                 // pretend a microphone were listening
    out.listening = P.strike(false);
    out.listeningPipe = T.pipe(220);
    out.last = T.test.history.slice(-2).map(h => h.played);
    delete Arcade.Pitch;
    return out;
  });
  expect(r).toMatchObject({on: true, muted: false, mutedPipe: null, back: true, listening: false, listeningPipe: null, last: [false, false]});
  watch.check();
});

test('THE DRUMS: ranges, the fine tuner (±50 cents), the gauge at every pedal position with band spellings', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const D = Arcade.PPDrums;
    return {
      ranges: D.DRUMS.map(d => [d.name, D.label(d.lowMidi), D.label(d.highMidi), D.freqAt(d, 0), D.freqAt(d, 1), D.freq(d.lowMidi), D.freq(d.highMidi)]),
      fine: D.DRUMS.map(d => [D.cents(D.freqAt(d, .5, 50), D.freqAt(d, .5)), D.cents(D.freqAt(d, .5, -50), D.freqAt(d, .5)), D.cents(D.freqAt(d, .5, 90), D.freqAt(d, .5))]),
      gauge: D.DRUMS.map(d => { const out = []; for (let m = d.lowMidi; m <= d.highMidi; m++) out.push([D.gauge(d, D.pedalFor(d, m)), D.gauge(d, D.pedalFor(d, m), 40), D.gauge(d, D.pedalFor(d, m), -40)]); return out; }),
    };
  });
  expect(r.ranges.map(x => x.slice(0, 3))).toEqual([['32"', 'D2', 'A2'], ['29"', 'F2', 'C3'], ['26"', 'B♭2', 'F3'], ['23"', 'D3', 'A3']]);
  r.ranges.forEach(x => { expect(x[3]).toBeCloseTo(x[5], 6); expect(x[4]).toBeCloseTo(x[6], 6); });
  r.fine.forEach(([up, down, over]) => { expect(up).toBeCloseTo(50, 6); expect(down).toBeCloseTo(-50, 6); expect(over).toBeCloseTo(50, 6); });
  expect(r.gauge[1].map(g => g[0])).toEqual(['F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B', 'C']);     // 29": F2 to C3
  expect(r.gauge[0].map(g => g[0])).toEqual(['D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A']);     // 32"
  r.gauge.forEach(g => g.forEach(([at, up, down]) => { expect(up).toBe(at); expect(down).toBe(at); }));   // ±40 cents: still the nearest note
  watch.check();
});

test('SCORING: cents by frequency ratio; 0 / +7 / −14 / +30 cents earn 3 / 2 / 1 / 0 stars; a real lock-in at exact pitch is 0 cents', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, D = Arcade.PPDrums;
    const out = {cents: [7, -14, 30].map(c => D.cents(440 * Math.pow(2, c / 1200), 440)), stars: [0, 7, -14, 30].map(c => P.starsFor(Math.abs(c)))};
    P.begin(1); P.auto(); P.lock(); out.exact = P.state().results[0];
    P.next(); P.auto(); P.setFine(0, P.state().drums[0].fine + 7); P.lock(); out.plus7 = P.state().results[1];
    P.next(); P.auto(); P.setFine(0, P.state().drums[0].fine - 14); P.lock(); out.minus14 = P.state().results[2];
    return out;
  });
  r.cents.forEach((c, i) => expect(c).toBeCloseTo([7, -14, 30][i], 6));
  expect(r.stars).toEqual([3, 2, 1, 0]);
  expect(Math.abs(r.exact.cents)).toBeLessThan(.01);
  expect(r.exact.points).toBe(100);
  expect(r.plus7.cents).toBeCloseTo(7, 4);
  expect(r.minus14.cents).toBeCloseTo(-14, 4);
  await expect(page.locator('#feedback .pp-err')).toHaveText('−14 cents flat');
  watch.check();
});

test('a level of 30-cent misses (W) earns no stars and saves none', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => { const P = Arcade.PedalPoint; P.begin(1); for (let i = 0; i < 5; i++) { P.wrong(); P.lock(); P.next(); } });
  await expect(page.locator('#results')).toBeVisible();
  const r = await page.evaluate(() => ({s: Arcade.PedalPoint.state(), p: Arcade.store.level('pedal-point', 'all', 1)}));
  expect(r.s.stars).toBe(0);
  expect(r.s.avg).toBeCloseTo(30, 3);
  expect(r.p.stars).toBe(0);
  watch.check();
});

test('LEVELS: replays (any vs once), the gauge on and off, targets never repeat, the first gauge-off level says "gauges drift" once', async ({page}) => {
  const watch = await open(page);
  // Level 1: the reference replays any time; the gauge shows
  await page.evaluate(() => Arcade.PedalPoint.begin(1));
  await expect.poll(async () => (await st(page)).ref.plays).toBe(1);
  let s = await st(page);
  expect(s.ref.allowed).toBe(true);
  await expect(page.locator('#refBtn')).toBeVisible();
  await expect(page.locator('.pp-gauge').first()).toBeVisible();
  expect(await page.evaluate(() => Arcade.PedalPoint.reference())).toBe(true);
  expect((await st(page)).ref.plays).toBe(2);
  // every target in a level is different
  const targets = await page.evaluate(() => { const P = Arcade.PedalPoint, out = []; for (let i = 0; i < 5; i++) { out.push(P.state().targets[0].midi); P.auto(); P.lock(); P.next(); } return out; });
  expect(new Set(targets).size).toBe(5);
  // Level 4: the pitch pipe plays ONCE, no replay button, no gauge
  await page.evaluate(() => Arcade.PedalPoint.begin(4));
  await expect.poll(async () => (await st(page)).ref.plays).toBe(1);
  s = await st(page);
  expect(s.ref).toMatchObject({mode: 'once', allowed: false});
  await expect(page.locator('#refBtn')).toBeHidden();
  await expect(page.locator('.pp-gauge').first()).toBeHidden();
  expect(await page.evaluate(() => Arcade.PedalPoint.reference())).toBe(false);
  await page.keyboard.press('r');
  expect((await st(page)).ref.plays).toBe(1);
  // the lesson: said with the first gauge-off level's intro, then never again
  await page.evaluate(() => Arcade.PedalPoint.showHub());
  await page.evaluate(() => Arcade.PedalPoint.intro(2));
  await expect(page.locator('#gaugeLesson')).toContainText('Gauges drift: trust your ear');
  await page.locator('#introBack').click();
  await page.evaluate(() => Arcade.PedalPoint.intro(4));
  await expect(page.locator('#introTitle')).toHaveText('Pitch Pipe');
  await expect(page.locator('#gaugeLesson')).toHaveCount(0);
  watch.check();
});

test('PICK YOUR DRUM: the wrong drum says it is out of range (no penalty), the right one is tuned', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.PedalPoint.begin(3));
  const s = await st(page);
  expect(s.phase).toBe('pick');
  const [wrong, right] = await page.evaluate(() => {
    const D = Arcade.PPDrums, s = Arcade.PedalPoint.state(), m = s.targets[0].midi;
    return [s.drums.findIndex(x => !D.inRange(D.byId(x.id), m)), s.drums.findIndex(x => D.inRange(D.byId(x.id), m))];
  });
  expect(wrong).toBeGreaterThanOrEqual(0);
  await page.locator(`.pp-kettle[data-i="${wrong}"]`).click();
  await expect(page.locator('.ui-toast', {hasText: 'That note is out of this drum\'s range'})).toBeVisible();
  expect((await st(page)).phase).toBe('pick');
  await page.locator(`.pp-kettle[data-i="${right}"]`).click();
  const after = await st(page);
  expect(after).toMatchObject({phase: 'tune', active: right, wrongPicks: 1});
  expect(after.drums[right].enabled).toBe(true);
  await page.evaluate(() => { Arcade.PedalPoint.auto(); Arcade.PedalPoint.lock(); });
  expect(Math.abs((await st(page)).results[0].cents)).toBeLessThan(.01);   // no penalty beyond the time
  watch.check();
});

test('INTERVALS: A3 → the D a fifth below is D3 on the 26"; every round lands its interval on the drum it needs', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, D = Arcade.PPDrums, out = {d3: P.intervalTarget('A3', -7), e3: P.intervalTarget('A3', -5), a2: P.intervalTarget('A3', -12), rounds: []};
    for (const lv of [5, 6]) {
      P.begin(lv);
      for (let i = 0; i < 5; i++) { const s = P.state(), t = s.targets[0]; out.rounds.push({lv, ref: s.ref.midi, iv: s.ref.iv, t: t.midi, drum: t.drum, comfy: D.comfy(D.byId(t.drum), t.midi), on: s.drums[t.di].enabled, prompt: s.prompt}); P.auto(); P.lock(); P.next(); }
    }
    return out;
  });
  expect(r.d3).toEqual({midi: 50, drum: '26', name: 'D3'});
  expect(r.e3).toEqual({midi: 52, drum: '23', name: 'E3'});            // nearer the middle of the 23"'s range
  expect(r.a2).toEqual({midi: 45, drum: '29', name: 'A2'});
  r.rounds.forEach(x => {
    expect(x.t).toBe(x.ref + x.iv);
    expect(x.comfy).toBe(true);
    expect(x.on).toBe(true);
    expect(x.prompt).toMatch(x.iv < 0 ? / below this / : / above this /);
    if (x.lv === 5) expect([-7, -5, 5, 7]).toContain(x.iv); else expect([-12, -7, -5, 5, 7, 12]).toContain(x.iv);
  });
  watch.check();
});

test('TWO-DRUM SETUP: the four keys, tonic and dominant on their two drums, both scored', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, out = [];
    P.begin(7);
    for (let i = 0; i < 4; i++) {
      const s = P.state();
      out.push({key: s.ref.key, t: s.targets.map(t => [t.part, t.midi, t.drum]), on: s.drums.filter(d => d.enabled).length, ref: s.ref.midi, plays: s.ref.mode});
      P.auto(); P.lock(); out[i].scored = P.state().results.length; P.next();
    }
    return {keys: out, stars: P.state().stars};
  });
  const keys = r.keys;
  expect(keys.map(k => k.key).sort()).toEqual(['A♭', 'B♭', 'E♭', 'F']);
  const want = {'B♭': [['tonic', 46, '29'], ['dominant', 41, '32']], 'E♭': [['tonic', 51, '26'], ['dominant', 46, '29']],
    'F': [['tonic', 41, '32'], ['dominant', 48, '26']], 'A♭': [['tonic', 44, '29'], ['dominant', 51, '26']]};
  keys.forEach((k, i) => {
    expect(k.t).toEqual(want[k.key]);
    expect(((k.t[1][1] - k.t[0][1]) % 12 + 12) % 12).toBe(7);          // the dominant is a fifth above the tonic (any octave)
    expect(k.on).toBe(2);
    expect(k.ref).toBe(k.t[0][1]);                                       // ONE reference: the tonic
    expect(k.plays).toBe('once');
    expect(k.scored).toBe(2 * (i + 1));                                  // both drums scored
  });
  expect(r.stars).toBe(3);
  watch.check();
});

test('QUICK CHANGE: the drum starts on the old note, the count runs after the reference, PAUSE holds it, the downbeat judges a late change', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.PedalPoint.begin(8));
  let s = await st(page);
  const t = s.targets[0];
  expect(s.drums[t.di].midi).toBeCloseTo(s.ref.from, 6);                // exactly on the old note
  expect(Math.abs(t.midi - s.ref.from)).toBeGreaterThanOrEqual(1);
  expect(Math.abs(t.midi - s.ref.from)).toBeLessThanOrEqual(4);
  expect(s.prompt).toMatch(/^Change \S+ to \S+ in 4 bars$/);
  expect(s.count.ms).toBe(0);
  await expect.poll(async () => (await st(page)).count.started, {timeout: 6000}).toBe(true);
  s = await st(page);
  expect(s.count.ms).toBeCloseTo(4 * 4 * 600, 3);                       // 4 bars of 4 at ♩ = 100
  // PAUSE: the count holds
  await page.locator('#uiPauseBtn').click();
  const held = (await st(page)).count.left;
  await page.waitForTimeout(800);
  expect((await st(page)).count.left).toBeCloseTo(held, 0);
  await page.locator('#uiPause [data-act="resume"], #uiPause .ui-menu button').first().click();
  await expect.poll(async () => (await st(page)).count.left).toBeLessThan(held - 100);
  // nothing done: the downbeat judges the drum where it is (late)
  await expect.poll(async () => (await st(page)).phase, {timeout: 12000}).toBe('feedback');
  s = await st(page);
  expect(s.late).toBe(1);
  expect(s.results[0].late).toBe(true);
  await expect(page.locator('#lateMsg')).toBeVisible();
  // a late change caps the level at 1 star, even when every other change is perfect
  const stars = await page.evaluate(() => { const P = Arcade.PedalPoint; P.next(); for (let i = 1; i < 5; i++) { P.auto(); P.lock(); P.next(); } return P.state(); });
  expect(stars.stars).toBeLessThanOrEqual(1);
  watch.check();
});

/* THE PEDALS by touch and by mouse, and every control on the screen, at a phone, an iPad both ways and a Chromebook */
for (const [name, vp, touch] of [['phone', {width: 390, height: 844}, true], ['iPad portrait', {width: 768, height: 1024}, true],
  ['iPad landscape', {width: 1024, height: 768}, true], ['Chromebook', {width: 1366, height: 768}, false]]) {
  test(`LAYOUT (${name}): four drums fit, the pedals drag, the fine tuner turns, nothing is off the screen`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await open(page);
    await page.evaluate(() => { Arcade.PedalPoint.begin(7); });
    // every control fully on the screen, sideways and down
    const boxes = await page.evaluate(() => [...document.querySelectorAll('.pp-kettle, .pp-pedal, #fineDown, #fineTrack, #fineUp, #tapBtn, #strokeBtn, #lockBtn')]
      .filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return {id: e.id || e.className, l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height}; }));
    expect(boxes.length).toBe(4 + 4 + 3 + 3);
    boxes.forEach(b => { expect(b.l, b.id).toBeGreaterThanOrEqual(0); expect(b.r, b.id).toBeLessThanOrEqual(vp.width); });
    boxes.filter(b => /pp-pedal/.test(b.id)).forEach(b => { expect(b.w).toBeGreaterThanOrEqual(64); expect(b.h).toBeGreaterThanOrEqual(100); });
    const bottom = Math.max(...boxes.map(b => b.b));
    expect(bottom, 'the controls fit the screen without scrolling').toBeLessThanOrEqual(vp.height);
    expect(await tooWide(page)).toEqual([]);
    // drag the active drum's pedal UP (toe down = higher) by mouse or by touch
    await page.evaluate(() => { const s = Arcade.PedalPoint.state(); Arcade.PedalPoint.setPedal(s.active, .5); });   // (a round may start at the very top)
    const s0 = await st(page), i = s0.active;
    const plate = page.locator(`.pp-pedal[data-i="${i}"]`);
    const pb = await plate.boundingBox();
    const x = pb.x + pb.width / 2, y = pb.y + pb.height / 2;
    if (touch) {
      const fire = (type, yy) => plate.dispatchEvent(type, {pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: yy, bubbles: true});
      await fire('pointerdown', y); await fire('pointermove', y - 20); await fire('pointermove', y - 40); await fire('pointerup', y - 40);
    } else {
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 20); await page.mouse.move(x, y - 40); await page.mouse.up();
    }
    const s1 = await st(page);
    expect(s1.drums[i].pedal).toBeGreaterThan(s0.drums[i].pedal + .05);
    expect(s1.drums[i].midi).toBeGreaterThan(s0.drums[i].midi);
    // the fine tuner: dragged sideways, and its − / + buttons
    const ft = await page.locator('#fineTrack').boundingBox();
    if (touch) {
      const fire = (type, xx) => page.locator('#fineTrack').dispatchEvent(type, {pointerId: 8, pointerType: 'touch', isPrimary: true, clientX: xx, clientY: ft.y + ft.height / 2, bubbles: true});
      await fire('pointerdown', ft.x + ft.width / 2); await fire('pointermove', ft.x + ft.width / 2 + 16); await fire('pointerup', ft.x + ft.width / 2 + 16);
    } else {
      await page.mouse.move(ft.x + ft.width / 2, ft.y + ft.height / 2); await page.mouse.down(); await page.mouse.move(ft.x + ft.width / 2 + 16, ft.y + ft.height / 2); await page.mouse.up();
    }
    expect((await st(page)).drums[i].fine).toBeCloseTo(10, 3);          // 16 px = 10 cents
    await page.locator('#fineUp').click();
    expect((await st(page)).drums[i].fine).toBeCloseTo(12, 3);
    // a resting drum's pedal doesn't move
    const rest = s1.drums.findIndex(d => !d.enabled);
    const rb = await page.locator(`.pp-pedal[data-i="${rest}"]`).boundingBox();
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.mouse.down(); await page.mouse.move(rb.x + rb.width / 2, rb.y); await page.mouse.up();
    expect((await st(page)).drums[rest].pedal).toBe(s1.drums[rest].pedal);
    watch.check();
  });
}

test('THE KEYBOARD: ←/→ drum, ↑/↓ pedal, Shift = fine, Space taps, R reference, Enter locks in', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.PedalPoint.begin(7));
  await expect.poll(async () => (await st(page)).ref.plays).toBe(1);
  const s0 = await st(page), a = s0.active;
  await page.keyboard.press('ArrowUp');
  let s = await st(page);
  expect((s.drums[a].midi - s0.drums[a].midi) * 100).toBeCloseTo(25, 3);
  await page.keyboard.press('Shift+ArrowDown');
  s = await st(page);
  expect(s.drums[a].fine).toBeCloseTo(-2, 6);
  const before = await page.evaluate(() => Arcade.Timpani.test.history.length);
  await page.keyboard.press('Space');
  const strike = await page.evaluate(() => Arcade.Timpani.test.history.slice(-1)[0]);
  expect(await page.evaluate(() => Arcade.Timpani.test.history.length)).toBe(before + 1);
  expect(strike).toMatchObject({kind: 'strike', soft: true, key: a});
  await page.keyboard.press('Shift+Space');
  expect(await page.evaluate(() => Arcade.Timpani.test.history.slice(-1)[0].soft)).toBe(false);
  await page.keyboard.press('ArrowRight');
  s = await st(page);
  expect(s.active).not.toBe(a);
  expect(s.drums[s.active].enabled).toBe(true);
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('feedback');
  expect((await st(page)).results.length).toBe(2);
  watch.check();
});

/* ================= THE RECORDED DRUMS (pedal-point/samples.js, shared/sounds/timpani/) =================
   The engine's tests give every take a made-up buffer (Timpani.test.fakeBuffers: a decaying sine at its hz, the hit at
   HIT_MS), so picking, rates, round robin, overlap and the glide are checked in every browser (the open-source Chromium
   the tests use has no AAC decoder). The real files are decoded where the browser can (WebKit). */
const fs = require('fs'), path = require('path');
const TIMP_DIR = path.join(__dirname, '..', 'shared/sounds/timpani');
const TIMP_FILES = fs.existsSync(TIMP_DIR) ? fs.readdirSync(TIMP_DIR).filter(f => /\.m4a$/i.test(f)).sort() : [];
const UPLOAD_NOTE = 'upload the timpani samples (shared/sounds/timpani/*.m4a; see its README.md)';
const recordedDevice = () => device('trumpet', {gameData: {'pedal-point': {drumSound: 'samples'}}});
const TABLE = () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'pedal-point/samples.js'), 'utf8');
  return [...src.matchAll(/^\s*\['([^']+)',\s*([0-9.]+),\s*'(soft|mid|loud)',\s*([0-9.]+)\],/gm)].map(m => ({file: m[1], hz: +m[2], layer: m[3], sec: +m[4]}));
};

test('THE RECORDED DRUMS: the table and shared/sounds/timpani/ match exactly', () => {
  test.skip(!TIMP_FILES.length, UPLOAD_NOTE);
  const rows = TABLE(), names = rows.map(r => r.file + '.m4a');
  expect(rows.length).toBeGreaterThan(0);
  expect(names.filter(f => !TIMP_FILES.includes(f)), 'table rows with no file').toEqual([]);
  expect(TIMP_FILES.filter(f => !names.includes(f)), 'files not in the table').toEqual([]);
  expect(new Set(names).size).toBe(names.length);
  rows.forEach(r => { expect(r.hz).toBeGreaterThan(60); expect(r.hz).toBeLessThan(240); });
});

test('THE RECORDED DRUMS: every file decodes, and its mallet hit is 10 ms in', async ({page}) => {
  test.skip(!TIMP_FILES.length, UPLOAD_NOTE);
  test.setTimeout(120_000);
  await page.goto('offline.html');
  const got = await page.evaluate(async files => {
    const ctx = new OfflineAudioContext(1, 1, 44100), out = {};
    for (const f of files) {
      try {
        const buf = await ctx.decodeAudioData(await (await fetch('shared/sounds/timpani/' + f)).arrayBuffer());
        const d = buf.getChannelData(0), w = Math.round(buf.sampleRate / 1000), n = Math.min(d.length, w * 200);
        let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        // the hit: the first 1 ms whose loudest sample reaches a quarter of the peak. (Not "the first sample over 5 %":
        // AAC's pre-echo smears a few % of a quiet take's attack into the 10 ms before it.)
        let hit = -1, pre = 0;
        for (let k = 0; k * w < n && hit < 0; k++) { let m = 0; for (let i = k * w; i < (k + 1) * w; i++) m = Math.max(m, Math.abs(d[i])); if (m >= peak / 4) hit = k; else pre = Math.max(pre, m / peak); }
        out[f] = {sec: buf.duration, hit, pre};
      } catch (e) { out[f] = {error: String(e && e.message || e)}; }
    }
    return out;
  }, TIMP_FILES);
  const noAac = TIMP_FILES.every(f => got[f].error);
  test.skip(noAac, 'this browser has no AAC decoder (the open-source Chromium): the timpani files are decoded in WebKit');
  const rows = TABLE(), bad = [];
  for (const f of TIMP_FILES) {
    const r = got[f], row = rows.find(x => x.file + '.m4a' === f);
    if (r.error) { bad.push(`${f}: does not decode (${r.error})`); continue; }
    if (Math.abs(r.sec - row.sec) > 0.12) bad.push(`${f}: ${r.sec.toFixed(2)} s, the table says ${row.sec}`);
    if (!(r.hit >= 8 && r.hit <= 17)) bad.push(`${f}: the hit is at ${r.hit} ms (want 10)`);
  }
  expect(bad).toEqual([]);
});

test('THE RECORDED DRUMS: the take\'s rate makes the principal exact; a tap is soft, a stroke mid; round robin; the pedal glides the rate; overlap; damp; mute and the mic rule', async ({page}) => {
  const watch = await open(page, recordedDevice());
  await page.evaluate(() => Arcade.PedalPoint.begin(1));
  const r = await page.evaluate(() => {
    const P = Arcade.PedalPoint, T = Arcade.Timpani, out = {};
    out.engine = T.engine();
    out.fake = T.test.fakeBuffers();
    P.setFine(0, 0); P.setPedal(0, 2 / 7);                 // G2 on the 29"
    const f = P.state().drums[0].freq;
    out.f = f;
    out.stroke = P.strike(false); out.sTake = T.test.take(0); out.sPrincipal = T.test.principal(0);
    out.tap = P.strike(true); out.tTake = T.test.take(0);
    out.last = T.test.history[T.test.history.length - 1];
    // round robin: twelve strokes in a row never repeat a take
    const files = [];
    for (let k = 0; k < 12; k++) { P.strike(false); files.push(T.test.take(0).file); }
    out.files = files;
    out.ringingNow = T.test.voices(0);
    out.MAX = T.SAMPLES.MAX_RING;
    // the pedal while it rings: every take's playbackRate glides to the new pitch
    P.setPedal(0, 4 / 7);
    out.after = P.state().drums[0].freq;
    out.glide = T.test.glides[T.test.glides.length - 1];
    out.principal2 = T.test.principal(0);
    out.hz = T.test.take(0).hz;
    // damp: every take stops
    T.damp(0);
    out.damped = {voices: T.test.voices(0), ringing: T.test.ringing(0)};
    // SOUND OFF and a listening microphone: nothing
    Arcade.store.setSfx(false); out.muted = P.strike(false); Arcade.store.setSfx(true);
    Arcade.Pitch = {listening: () => true}; out.listening = P.strike(true); delete Arcade.Pitch;
    out.HIT = T.HIT_OFFSET_S;
    return out;
  });
  expect(r.engine).toBe('samples');
  expect(r.fake).toBe(true);
  expect(r.stroke).toBe(true);
  expect(r.sTake.layer).toBe('mid');
  expect(Math.abs(r.sTake.hz * r.sTake.rate - r.f)).toBeLessThan(1e-9);  // the principal is EXACTLY the drum's pitch
  expect(r.sPrincipal).toBeCloseTo(r.f, 9);
  expect(r.tap).toBe(true);
  expect(r.tTake.layer).toBe('soft');
  expect(Math.abs(r.tTake.hz * r.tTake.rate - r.f)).toBeLessThan(1e-9);
  expect(r.last).toMatchObject({engine: 'samples', soft: true, want: 'soft', played: true});
  expect(r.last.offset).toBeCloseTo(.008, 9);                           // 2 ms before the hit: no 10 ms delay
  for (let k = 1; k < r.files.length; k++) expect(r.files[k], `stroke ${k + 1} repeats a take`).not.toBe(r.files[k - 1]);
  expect(r.ringingNow).toBeGreaterThan(1);                              // strokes OVERLAP (no cut)
  expect(r.ringingNow).toBeLessThanOrEqual(r.MAX);
  expect(r.after).toBeCloseTo(freq(45), 3);                             // A2
  expect(r.glide.rates.length).toBe(r.ringingNow);                      // every ringing take follows the pedal
  expect(r.glide.tc).toBeGreaterThan(0);
  r.glide.rates.forEach(x => expect(x.rate).toBeGreaterThan(1));
  expect(r.principal2).toBeCloseTo(freq(45), 6);
  expect(r.glide.rates[r.glide.rates.length - 1].rate * r.hz).toBeCloseTo(freq(45), 6);
  expect(r.damped).toEqual({voices: 0, ringing: false});
  expect(r.muted).toBe(false);
  expect(r.listening).toBe(false);
  expect(r.HIT).toBeCloseTo(.008, 9);
  watch.check();
});

test('THE RECORDED DRUMS: with no files (every timpani/ request a 404) the synth plays, the menu says so, and a level still earns its stars', async ({page}) => {
  const watch = await prepare(page, {store: recordedDevice()});
  await page.route(/\/shared\/sounds\/timpani\//, route => route.fulfill({status: 404, body: ''}));
  await page.goto(URL);
  await page.locator('.game-title').click();                            // the first tap: the audio, then the loading
  await expect.poll(() => page.evaluate(() => Arcade.Timpani.samplesState()), {timeout: 15_000}).toBe('missing');
  expect(await page.evaluate(() => Arcade.Timpani.engine())).toBe('samples');   // the student's choice stays
  await page.evaluate(() => Arcade.UI.settings.open());
  await expect(page.locator('#uiSettings [data-snd="samples"]')).toHaveText('Recorded (not available here)');
  await expect(page.locator('#uiSettings .pp-credit')).toContainText('Versilian Community Sample Library (public domain)');
  await page.keyboard.press('Escape');
  await expect(page.locator('#uiSettings')).toBeHidden();
  await page.locator('.lvl[data-l="1"]').click();
  await page.locator('.ls-start').click();
  await page.locator('#introGo').click();
  for (let k = 0; k < 40 && !(await page.locator('#results').isVisible().catch(() => false)); k++) {
    await page.keyboard.press('Space');                                  // a tuning tap: the synth plays it
    await page.keyboard.press('a'); await page.keyboard.press('Enter');
    await expect.poll(async () => (await st(page)).phase).not.toBe('tune');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#results')).toBeVisible();
  const r = await page.evaluate(() => ({p: Arcade.store.level('pedal-point', 'all', 1), eng: [...new Set(Arcade.Timpani.test.history.filter(h => h.kind === 'strike' && h.played).map(h => h.engine))]}));
  expect(r.p.stars).toBe(3);
  expect(r.eng).toEqual(['synth']);
  watch.check();
});

test('DRUM SOUND: RECORDED · SYNTH switches the engine and is remembered on this device', async ({page}) => {
  const watch = await open(page, recordedDevice());
  await page.evaluate(() => Arcade.UI.settings.open());
  const rec = page.locator('#uiSettings [data-snd="samples"]'), syn = page.locator('#uiSettings [data-snd="synth"]');
  await expect(rec).toHaveAttribute('aria-pressed', 'true');
  await expect(rec).toHaveText(/^Recorded/);
  await syn.click();
  await expect(syn).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => [Arcade.Timpani.engine(), Arcade.store.gameData('pedal-point').drumSound])).toEqual(['synth', 'synth']);
  await page.evaluate(() => { Arcade.Timpani.test.fakeBuffers(); Arcade.PedalPoint.begin(1); Arcade.PedalPoint.strike(true); });
  expect(await page.evaluate(() => Arcade.Timpani.test.history.slice(-1)[0].engine)).toBe('synth');   // SYNTH even with takes loaded
  await page.reload();
  expect(await page.evaluate(() => Arcade.Timpani.engine())).toBe('synth');
  await page.evaluate(() => Arcade.UI.settings.open());
  await expect(page.locator('#uiSettings [data-snd="synth"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#uiSettings [data-snd="samples"]').click();
  expect(await page.evaluate(() => [Arcade.Timpani.engine(), Arcade.store.gameData('pedal-point').drumSound])).toEqual(['samples', 'samples']);
  watch.check();
});

test('THE SAMPLE TUNER (?tune-samples): every take listed by pitch; +5 cents then COPY gives the ready-to-paste line', async ({page}) => {
  const watch = await prepare(page, {store: synthDevice()});
  await page.goto('pedal-point/index.html?tune-samples&nostart');
  await expect(page.locator('#tuner')).toBeVisible();
  await expect(page.locator('#hub')).toBeHidden();
  const rows = TABLE();
  await expect(page.locator('.tn-row')).toHaveCount(rows.length);
  expect(rows.length).toBe(65);
  await expect(page.locator('.tn-pitch').first()).toHaveText('D2');
  await expect.poll(() => page.evaluate(() => Arcade.PPTuner.state().source)).toBe(true);   // samples.js read (the comments)
  const first = page.locator('.tn-row').first();
  await first.locator('[data-c="5"]').click();
  await expect(page.locator('#tunerCount')).toHaveText('changed: 1');
  await expect(first).toHaveClass(/tn-changed/);
  // ▶ PIPE plays the row's (nudged) pitch
  await page.locator('.tn-play').first().click();                       // a tap (the audio)
  await first.locator('[data-act="pipe"]').click();
  const pipe = await page.evaluate(() => Arcade.Timpani.test.history.filter(h => h.kind === 'pipe').slice(-1)[0]);
  const want = (rows[0].hz * Math.pow(2, 5 / 1200)).toFixed(2);
  expect(pipe.played).toBe(true);
  expect(pipe.freq).toBeCloseTo(rows[0].hz * Math.pow(2, 5 / 1200), 9);
  await page.locator('#tunerCopy').click();
  const out = await page.locator('#tunerOut').inputValue();
  expect(out).toBe(`    ['${rows[0].file}', ${want}, '${rows[0].layer}', ${rows[0].sec.toFixed(2)}],   // Timpani7G_hit_v2_rr1`);
  // −5 again: back where it was, nothing changed
  await first.locator('[data-c="-5"]').click();
  await expect(page.locator('#tunerCount')).toHaveText('changed: 0');
  watch.check();
});

test('the Sound Board\'s Pedal Point section links THE SAMPLE TUNER (a teacher tool: no student page links it)', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('sound-board/index.html');
  await expect(page.locator('details[data-sec="pedal-point"] .sb-tool a')).toHaveAttribute('href', '../pedal-point/index.html?tune-samples');
  watch.check();
});
