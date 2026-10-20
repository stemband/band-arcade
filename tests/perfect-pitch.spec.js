/* PERFECT PITCH (perfect-pitch/, docs/games/perfect-pitch.md): an ear-training game with NO MICROPHONE. The mechanism
   physics (centsAt / dFor, out = lower, every level's offset fixable within every instrument's travel), the sound
   (shared/winds.js: each voice's harmonic recipe, the reference and a voice BEAT, the held note glides with the
   mechanism, silence when muted or while a mic listens), the picker (PLAYERS order, oboe and bassoon locked, the
   defaults, written-pitch note names), every level's rules, the keyboard, and the mechanism working by touch and mouse
   on every screen size. */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');
const fs = require('fs'), path = require('path');

const URL = 'perfect-pitch/index.html?demo&nostart';
const st = page => page.evaluate(() => Arcade.PerfectPitch.state());
const ppDevice = (member = 'clarinet', gd = {}) => device(member, {gameData: {'perfect-pitch': gd}});
const noInstrument = (gd = {}) => ({player: null, members: {}, games: {}, modes: {}, gameData: {'season-lobby': {giftAfter: '9999-12-31'}, 'perfect-pitch': gd}});
/** open the page, with a first tap (it unlocks the arcade's audio, as PRESS START's tap does) */
async function open(page, store = ppDevice(), {clock = false} = {}) {
  const watch = await prepare(page, {store});
  if (clock) await page.clock.install();                  // the test clock: the HEAR timers fast-forwarded
  await page.goto(URL);
  await page.locator('.game-title').click();
  return watch;
}
/** start level lv and judge the first round right: the TUNE phase (or, an in-tune round, its feedback) */
const tunePhase = (page, lv) => page.evaluate(lv => { const Q = Arcade.PerfectPitch; Q.begin(lv); const o = Q.state().target.offset; Q.judge(o > 0 ? 'sharp' : o < 0 ? 'flat' : 'tune'); return Q.state(); }, lv);
/** start level lv until its first round is out of tune (not an in-tune round), then judge it right */
const tuneRound = async (page, lv) => {
  for (let k = 0; k < 30; k++) { const s = await tunePhase(page, lv); if (s.phase === 'tune') return s; }
  throw new Error('no out-of-tune round');
};

/* ================= THE PHYSICS ================= */
test('THE PHYSICS: centsAt / dFor round-trip, out = lower for every instrument (the saxes\' in = higher), and every level\'s largest offset is fixable within every travel', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const T = Arcade.PP2Tune, maxOff = Math.max(...PP2_LEVELS.map(L => L.cents[1])), out = {maxOff, rows: []};
    T.TUNE.forEach(t => {
      const trip = [-60, -50, -12, -1, 0, 1, 7, 35, 50, 60].map(c => Math.abs(T.centsAt(t.id, T.dFor(t.id, c)) - c));
      out.rows.push({id: t.id, trip: Math.max(...trip), out1: T.centsAt(t.id, 1), in1: T.centsAt(t.id, -1), reach: T.test.reach(t.id),
        need: [T.dFor(t.id, -maxOff), T.dFor(t.id, maxOff)], travel: t.travel, double: t.double, L: t.L, voice: t.voice});
    });
    out.voices = Arcade.Winds.VOICES;
    return out;
  });
  expect(r.maxOff).toBe(50);
  expect(r.rows.map(x => x.id)).toEqual(['flute', 'clarinet', 'basscl', 'altosax', 'tenorsax', 'barisax', 'trumpet', 'horn', 'trombone', 'baritonetc', 'euphbc', 'tuba']);
  r.rows.forEach(x => {
    expect(x.trip, x.id).toBeLessThan(1e-9);
    expect(x.out1, `${x.id}: out = lower`).toBeLessThan(0);
    expect(x.in1, `${x.id}: in = higher`).toBeGreaterThan(0);
    expect(x.reach.out, `${x.id} reaches −${r.maxOff}`).toBeLessThanOrEqual(-r.maxOff);
    expect(x.reach.in, `${x.id} reaches +${r.maxOff}`).toBeGreaterThanOrEqual(r.maxOff);
    x.need.forEach(d => expect(Math.abs(d), x.id).toBeLessThan(x.travel));
    expect(r.voices, x.id).toContain(x.voice);
  });
  // the model itself: a 1 cm pull out on a 33 cm flute; the brass slides add twice the pull
  expect(r.rows.find(x => x.id === 'flute').reach.out).toBeCloseTo(-1200 * Math.log2((33 + 1.2) / 33), 9);
  expect(r.rows.find(x => x.id === 'trumpet').reach.out).toBeCloseTo(-1200 * Math.log2((148 + 2 * 2.6) / 148), 9);
  ['altosax', 'tenorsax', 'barisax'].forEach(id => { const x = r.rows.find(y => y.id === id); expect(x.in1).toBeGreaterThan(0); expect(x.double).toBe(false); });
  watch.check();
});

/* ================= THE SOUND ================= */
test('THE VOICES: each recipe\'s harmonics in an OfflineAudioContext render (the clarinet\'s even harmonics weak, the horn and low brass darker)', async ({page}) => {
  const watch = await open(page);
  const h = await page.evaluate(async () => {
    const out = {};
    const g = (data, rate, f) => { let re = 0, im = 0; for (let i = Math.round(rate * .5); i < data.length; i++) { re += data[i] * Math.cos(2 * Math.PI * f * i / rate); im += data[i] * Math.sin(2 * Math.PI * f * i / rate); } return Math.hypot(re, im); };
    for (const v of Arcade.Winds.VOICES) {
      const f = 233.08, {data, rate} = await Arcade.Winds.test.render(v, f, null, 1.5, 22050);
      const a = [1, 2, 3, 4, 5, 6, 7].map(k => g(data, rate, k * f));
      out[v] = a.map(x => x / a[0]);
    }
    return out;
  });
  const sum = (a, i, j) => a.slice(i, j).reduce((s, x) => s + x, 0);
  // FLUTE: nearly a sine with a soft 2nd harmonic
  expect(h.flute[1]).toBeGreaterThan(.1); expect(h.flute[1]).toBeLessThan(.35);
  h.flute.slice(2).forEach(x => expect(x).toBeLessThan(.1));
  // CLARINET: the odd harmonics strong, the even ones weak
  [2, 4].forEach(i => expect(h.clarinet[i], `clarinet h${i + 1}`).toBeGreaterThan(.25));
  [1, 3, 5].forEach(i => expect(h.clarinet[i], `clarinet h${i + 1}`).toBeLessThan(.05));
  // SAX: bright, every harmonic present
  h.sax.slice(1).forEach((x, i) => expect(x, `sax h${i + 2}`).toBeGreaterThan(.12));
  // BRASS: a strong 2nd and a bright top; HORN darker; LOW BRASS darker still
  expect(h.brass[1]).toBeGreaterThan(.6); expect(h.brass[4]).toBeGreaterThan(.2);
  expect(sum(h.horn, 3, 7)).toBeLessThan(sum(h.brass, 3, 7) * .7);
  expect(sum(h.lowbrass, 3, 7)).toBeLessThan(sum(h.horn, 3, 7));
  watch.check();
});

test('TOGETHER: a voice and the reference 3 Hz apart beat at 3 Hz (a render), and in tune they don\'t', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(async () => {
    const beat = async (voice, a, b) => {
      const {data, rate} = await Arcade.Winds.test.render(voice, a, b, 4);
      const win = Math.round(rate * .01), env = [];
      for (let i = Math.round(rate * .5); i + win <= data.length; i += win) { let q = 0; for (let j = i; j < i + win; j++) q += data[j] * data[j]; env.push(Math.sqrt(q / win)); }
      const mean = env.reduce((s, x) => s + x, 0) / env.length, e = env.map(v => v - mean);
      let best = 0, bestF = 0;
      for (let f = .5; f <= 10; f += .05) {
        let re = 0, im = 0; e.forEach((v, i) => { re += v * Math.cos(2 * Math.PI * f * i / 100); im += v * Math.sin(2 * Math.PI * f * i / 100); });
        const p = Math.hypot(re, im); if (p > best) { best = p; bestF = f; }
      }
      return {f: bestF, depth: (Math.max(...env) - Math.min(...env)) / mean};
    };
    return {clar: await beat('clarinet', 233, 236), brass: await beat('brass', 233, 236), tuned: await beat('clarinet', 233, 233)};
  });
  [r.clar, r.brass].forEach(b => { expect(b.f).toBeGreaterThan(2.7); expect(b.f).toBeLessThan(3.3); expect(b.depth).toBeGreaterThan(.3); });
  expect(r.tuned.depth).toBeLessThan(r.clar.depth / 3);
  watch.check();
});

test('THE HELD NOTE: ▶ PLAY sounds the note at the setting, and it glides with setPull without restarting', async ({page, browserName}) => {
  const watch = await open(page);
  await tuneRound(page, 1);
  const r = await page.evaluate(() => {
    const Q = Arcade.PerfectPitch, Wd = Arcade.Winds, out = {};
    out.played = Q.play();
    out.start = Wd.test.voiceStart();
    out.f0 = Q.state().freq; out.t0 = Wd.test.target();
    Q.setPull(4);
    out.f1 = Q.state().freq; out.t1 = Wd.test.target();
    out.start1 = Wd.test.voiceStart();
    out.starts = Wd.test.history.filter(x => x.kind === 'start' && x.played).length;
    return out;
  });
  expect(r.played).toBe(true);
  expect(r.t0).toBeCloseTo(r.f0, 9);
  expect(r.t1).toBeCloseTo(r.f1, 9);
  expect(r.f1).toBeLessThan(r.f0);                                  // pulled out: lower
  expect(r.start1).toBe(r.start);                                   // the same voice, glided
  expect(r.starts).toBe(1);
  if (browserName === 'chromium') await expect.poll(() => page.evaluate(() => Math.abs(Arcade.Winds.test.live() - Arcade.PerfectPitch.state().freq))).toBeLessThan(.5);
  watch.check();
});

test('THE SOUND: nothing plays with the sound off, or while a microphone listens (the pitched-audio rule)', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const Wd = Arcade.Winds, out = {};
    out.on = Wd.start('clarinet', 220); Wd.stop();
    Arcade.store.setSfx(false);                             // SOUND OFF (the top bar's speaker button)
    out.muted = [Wd.start('clarinet', 220), Wd.play('flute', 440), Wd.ref(440), Wd.together('sax', 220, 221)];
    Arcade.store.setSfx(true);
    out.back = Wd.start('clarinet', 220); Wd.stop();
    Arcade.Pitch = {listening: () => true};                 // pretend a microphone were listening
    out.listening = [Wd.start('brass', 220), Wd.play('horn', 220), Wd.ref(220), Wd.together('lowbrass', 110, 111)];
    out.last = Wd.test.history.slice(-4).map(h => h.played);
    delete Arcade.Pitch;
    Wd.stopAll();
    return out;
  });
  expect(r).toMatchObject({on: true, muted: [false, null, null, null], back: true, listening: [false, null, null, null], last: [false, false, false, false]});
  watch.check();
});

test('opens with no instrument chosen: the first START opens the picker; never asks for the microphone; Level 1 plays to 3 stars by keys', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: noInstrument()});
  await page.addInitScript(() => {
    window.__gum = 0;
    if (navigator.mediaDevices) { const real = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = function () { window.__gum++; return real.apply(this, arguments); }; }
  });
  await page.goto(URL);
  await expect(page).toHaveURL(/perfect-pitch\/index\.html/);              // no Choose Your Instrument on the way in
  expect(await page.evaluate(() => typeof Arcade.Pitch)).toBe('undefined'); // pitch.js isn't even on the page
  expect((await st(page)).tune).toBeNull();
  await expect(page.locator('#tuneName')).toHaveText('Choose');
  await page.locator('.lvl[data-l="1"]').click();
  await page.locator('.ls-start').click();
  await expect(page.locator('#tunePicker')).toBeVisible();                   // no choice yet: the picker first
  await page.locator('.p2-tile[data-id="trumpet"]').click();
  await expect(page.locator('#tunePicker')).toHaveCount(0);
  await expect(page.locator('#introTitle')).toHaveText('Way Off');           // then the level's intro
  await page.locator('#introGo').click();
  for (let k = 0; k < 40 && !(await page.locator('#results').isVisible().catch(() => false)); k++) {
    await page.keyboard.press('a'); await page.keyboard.press('Enter');
    await expect.poll(async () => (await st(page)).phase).toBe('feedback');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#results')).toBeVisible();
  const r = await page.evaluate(() => ({s: Arcade.PerfectPitch.state(), p: Arcade.store.level('perfect-pitch', 'all', 1), gum: window.__gum}));
  expect(r.s.results.length).toBe(5);
  r.s.results.forEach(x => { expect(Math.abs(x.cents)).toBeLessThan(1e-6); expect(x.right).toBe(true); });
  expect(r.p.stars).toBe(3);
  expect(r.p.best).toBe(750);
  expect(r.gum).toBe(0);
  await expect(page.locator('#results')).toContainText('5 of 5 right');
  await expect(page.locator('#results')).toContainText('Wrong-way starts');
  watch.check();
});

/* ================= THE PICKER ================= */
test('THE PICKER: tiles in PLAYERS order without bells and snare; oboe and bassoon locked (a tap explains and picks nothing); a pick is remembered', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page, noInstrument());
  await page.locator('#tuneBtn').click();
  const ids = await page.locator('.p2-tile').evaluateAll(els => els.map(e => e.dataset.id));
  expect(ids).toEqual(['flute', 'oboe', 'clarinet', 'basscl', 'bassoon', 'altosax', 'tenorsax', 'barisax', 'trumpet', 'horn', 'trombone', 'baritonetc', 'euphbc', 'tuba']);
  expect(await page.locator('.p2-tile.locked').evaluateAll(els => els.map(e => e.dataset.id))).toEqual(['oboe', 'bassoon']);
  await expect(page.locator('.p2-tile.locked .p2-lock')).toHaveCount(2);
  expect(await page.locator('.p2-tile[data-id="trumpet"] .pt-box').count()).toBe(1);   // the portrait
  await expect(page.locator('.p2-tile[data-id="euphbc"]')).toContainText('Euphonium (B.C.)');
  for (const id of ['oboe', 'bassoon']) {
    await page.locator(`.p2-tile[data-id="${id}"]`).click({force: true});     // aria-disabled: it still takes the tap
    await expect(page.locator('#uiConfirm')).toContainText('Oboes and bassoons don\'t tune with a slide or a barrel.');
    await expect(page.locator('#uiConfirm')).toContainText('The clarinet\'s barrel is a good one to try!');
    await page.locator('#uiConfirm [data-act="yes"]').click();
    expect((await st(page)).tune).toBeNull();
  }
  await page.locator('.p2-tile[data-id="altosax"]').click();
  expect((await st(page)).tune).toBe('altosax');
  await expect(page.locator('#tuneName')).toHaveText('Alto Sax');
  await expect(page.locator('#tuneWhat')).toHaveText('Mouthpiece, on the neck cork');
  expect(await page.evaluate(() => Arcade.store.gameData('perfect-pitch').tune)).toBe('altosax');
  await page.reload();
  expect((await st(page)).tune).toBe('altosax');                             // remembered on this device
  watch.check();
});

test('THE DEFAULT: a saved oboe or bassoon sees the explanation ONCE (then the picker), then the last instrument picked here', async ({browser}) => {
  for (const id of ['oboe', 'bassoon']) {
    const ctx = await browser.newContext(), p = await ctx.newPage();             // a device of its own
    const w = await prepare(p, {store: ppDevice(id)});
    await p.goto(URL);
    await expect(p.locator('#oboeNote')).toBeVisible();
    await expect(p.locator('#introText')).toContainText('Oboists tune by moving the reed in or out');
    expect(await p.evaluate(() => Arcade.PerfectPitch.state().tune)).toBeNull();
    await p.locator('#introGo').click();
    await expect(p.locator('#tunePicker')).toBeVisible();
    await p.locator('.p2-tile[data-id="clarinet"]').click();
    expect(await p.evaluate(() => Arcade.store.gameData('perfect-pitch'))).toMatchObject({oboeNote: true, tune: 'clarinet'});
    await p.reload();
    await p.waitForTimeout(300);
    await expect(p.locator('#oboeNote')).toHaveCount(0);                       // once per device
    expect(await p.evaluate(() => Arcade.PerfectPitch.state().tune)).toBe('clarinet');   // the last one picked here
    w.check(); await ctx.close();
  }
});

test('THE DEFAULT: a saved clarinet tunes the clarinet; bells and snare simply pick (no message)', async ({page, browser}) => {
  const watch = await open(page, ppDevice('clarinet'));
  expect((await st(page)).tune).toBe('clarinet');
  await expect(page.locator('#oboeNote')).toHaveCount(0);
  watch.check();
  for (const id of ['bells', 'snare']) {
    const ctx = await browser.newContext(), p = await ctx.newPage();
    const w = await prepare(p, {store: ppDevice(id)});
    await p.goto(URL);
    await p.waitForTimeout(300);
    await expect(p.locator('#oboeNote')).toHaveCount(0);
    expect(await p.evaluate(() => Arcade.PerfectPitch.state().tune)).toBeNull();
    w.check(); await ctx.close();
  }
});

test('NOTE NAMES are in the WRITTEN pitch and clef of the instrument tuned (clarinet C, alto sax G, horn F, euphonium B.C. B♭ in bass clef)', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page);
  const EXPECT = {clarinet: ['C4', 'treble', 58], altosax: ['G4', 'treble', 58], horn: ['F4', 'treble', 58], euphbc: ['B♭2', 'bass', 46], trumpet: ['C4', 'treble', 58], tuba: ['B♭1', 'bass', 34], flute: ['B♭4', 'treble', 70]};
  for (const [id, [w, clef, midi]] of Object.entries(EXPECT)) {
    await page.evaluate(id => { Arcade.PerfectPitch.pick(id); Arcade.PerfectPitch.begin(1); }, id);
    const s = await st(page);
    expect(s.target.midi, id).toBe(midi);                                     // concert B♭ in the first-five octave
    expect(s.target.written, id).toBe(w);
    expect(s.target.clef, id).toBe(clef);
    expect(s.target.concert).toBe('B♭');
    await expect(page.locator('#noteLine')).toHaveText(`Your note: ${w.replace(/\d$/, '')} (concert B♭)`);
  }
  // the staff after LOCK IN: the member's clef
  await page.evaluate(() => { Arcade.PerfectPitch.pick('euphbc'); });
  for (let k = 0; k < 10; k++) { const s = await tunePhase(page, 1); if (s.phase === 'tune') break; }
  await page.evaluate(() => { Arcade.PerfectPitch.auto(); Arcade.PerfectPitch.lock(); });
  await expect(page.locator('.p2-fb-staff svg')).toHaveAttribute('aria-label', /Written B♭2/);
  expect(await page.locator('.p2-fb-staff svg text').first().textContent()).toBe('𝄢');
  watch.check();
});

/* ================= THE LEVELS ================= */
test('LEVELS: each level\'s flags on the screen (AGAIN, TOGETHER, the needle), its offsets in range, its in-tune count, targets never repeating', async ({page}) => {
  const watch = await open(page);
  const EXPECT = [
    {cents: [35, 50], inTune: 0, notes: 'Bb', replay: true, together: true, needle: true},
    {cents: [20, 35], inTune: 1, notes: 'Bb', replay: true, together: true, needle: true},
    {cents: [15, 25], inTune: 2, notes: 'BbF', replay: true, together: true, needle: false},
    {cents: [10, 20], inTune: 1, notes: 'BbF', replay: true, together: true, needle: false},
    {cents: [10, 20], inTune: 1, notes: 'tuning', replay: true, together: false, needle: false},
    {cents: [10, 20], inTune: 1, notes: 'tuning', replay: false, together: false, needle: false},
    {cents: [8, 15], inTune: 1, notes: 'range', replay: true, together: false, needle: false},
    {cents: [5, 12], inTune: 1, notes: 'range', replay: false, together: false, needle: false},
  ];
  for (let lv = 1; lv <= 8; lv++) {
    const s = await tuneRound(page, lv), e = EXPECT[lv - 1];
    expect(s.flags, `level ${lv}`).toEqual(e);
    expect(await page.locator('#needle').isVisible(), `needle ${lv}`).toBe(e.needle);
    expect(await page.locator('#bothTuneBtn').isVisible(), `together (tune) ${lv}`).toBe(e.together);
    await page.evaluate(lv => Arcade.PerfectPitch.begin(lv), lv);
    expect(await page.locator('#againBtn').isVisible(), `again ${lv}`).toBe(e.replay);
    expect(await page.locator('#togetherBtn').isVisible(), `together ${lv}`).toBe(e.together);
    await expect(page.locator('#judgeSharp, #judgeFlat, #judgeTune')).toHaveCount(3);
  }
  // the plans, many times over: in range, never the same value twice, the in-tune count, never level 1's first round,
  // and the notes from the level's pool (never the same note + sign twice while another is left)
  const plans = await page.evaluate(() => {
    const Q = Arcade.PerfectPitch, T = Arcade.PP2Tune, out = [];
    for (const id of ['clarinet', 'tuba', 'flute']) {
      Q.pick(id);
      for (let rep = 0; rep < 12; rep++) for (let lv = 1; lv <= 8; lv++) { Q.begin(lv); out.push({id, lv, plan: Q.state().plan, pool: T.notesFor(id, PP2_LEVELS[lv - 1].notes)}); }
    }
    Q.showHub();
    return out;
  });
  plans.forEach(({id, lv, plan, pool}) => {
    const e = EXPECT[lv - 1], offs = plan.map(p => p.offset);
    expect(plan.length).toBe(5);
    expect(offs.filter(o => o === 0).length, `level ${lv}`).toBe(e.inTune);
    offs.filter(o => o).forEach(o => { expect(Math.abs(o)).toBeGreaterThanOrEqual(e.cents[0]); expect(Math.abs(o)).toBeLessThanOrEqual(e.cents[1]); });
    const abs = offs.filter(o => o).map(Math.abs);
    expect(new Set(abs).size, `level ${lv}: offsets never repeat`).toBe(abs.length);
    const signs = offs.filter(o => o).map(Math.sign);
    expect(Math.abs(signs.filter(x => x > 0).length - signs.filter(x => x < 0).length)).toBeLessThanOrEqual(1);   // sharp and flat about half each
    if (lv === 1) expect(offs[0]).not.toBe(0);
    plan.forEach(p => expect(pool, `${id} level ${lv}`).toContain(p.midi));
    const keys = plan.map(p => p.midi + '|' + Math.sign(p.offset) + '|' + p.offset);
    expect(new Set(keys).size).toBe(5);                                       // a target (note + offset) never repeats
    const pairs = plan.map(p => p.midi + '|' + Math.sign(p.offset)), avail = new Set(pool.flatMap(m => [-1, 0, 1].map(sg => m + '|' + sg))).size;
    if (avail >= 6) expect(new Set(pairs).size, `${id} level ${lv}: ${pairs}`).toBe(5);
  });
  watch.check();
});

test('IN TUNE right ends the round at 0 ("Right: leave it alone!"); a wrong judgment still goes on to TUNE; an in-tune note judged wrong must be locked near 0', async ({page}) => {
  const watch = await open(page);
  const findInTune = async () => {
    for (let k = 0; k < 40; k++) {
      const i = await page.evaluate(() => { Arcade.PerfectPitch.begin(3); return Arcade.PerfectPitch.state().plan.findIndex(p => p.offset === 0); });
      if (i === 0) return;
      if (i > 0) { await page.evaluate(i => { const Q = Arcade.PerfectPitch; for (let j = 0; j < i; j++) { Q.auto(); Q.lock(); Q.next(); } }, i); return; }
    }
  };
  await findInTune();
  expect((await st(page)).target.offset).toBe(0);
  await page.evaluate(() => Arcade.PerfectPitch.judge('tune'));
  let s = await st(page);
  expect(s.phase).toBe('feedback');
  const res = s.results.slice(-1)[0];
  expect(res).toMatchObject({cents: 0, right: true, leftAlone: true, points: 150});
  await expect(page.locator('#spotMsg')).toHaveText('Right: leave it alone!');
  await expect(page.locator('.p2-err')).toContainText('Right on: 0 cents');
  // a wrong judgment on an out-of-tune note: ✗, the right word, and TUNE anyway
  for (let k = 0; k < 20; k++) { await page.evaluate(() => Arcade.PerfectPitch.begin(1)); if ((await st(page)).target.offset) break; }
  const off = (await st(page)).target.offset;
  await page.evaluate(a => Arcade.PerfectPitch.judge(a), off > 0 ? 'flat' : 'sharp');
  s = await st(page);
  expect(s.phase).toBe('tune');
  expect(s.target.right).toBe(false);
  await expect(page.locator('#judged')).toHaveText(off > 0 ? '✗ It was sharp: a little too high.' : '✗ It was flat: a little too low.');
  await page.evaluate(() => { Arcade.PerfectPitch.auto(); Arcade.PerfectPitch.lock(); });
  s = await st(page);
  expect(s.results[0]).toMatchObject({right: false, points: 100});
  // an IN-TUNE note judged SHARP: TUNE, "don't move what's in tune", and locking it where it is = 0 cents
  await findInTune();
  await page.evaluate(() => Arcade.PerfectPitch.judge('sharp'));
  expect((await st(page)).phase).toBe('tune');
  await expect(page.locator('#judged')).toContainText('It was in tune. Don\'t move what\'s in tune');
  await page.evaluate(() => { Arcade.PerfectPitch.play(); Arcade.PerfectPitch.lock(); });
  s = await st(page);
  expect(s.results.slice(-1)[0]).toMatchObject({cents: 0, right: false, points: 100});
  await expect(page.locator('#leaveTip')).toBeVisible();
  watch.check();
});

test('LOCK IN is disabled until the note has been played at the setting; THE WRONG WAY banner is said once and counted', async ({page}) => {
  const watch = await open(page);
  const s0 = await tuneRound(page, 2);
  await expect(page.locator('#lockBtn')).toBeDisabled();
  expect(await page.evaluate(() => Arcade.PerfectPitch.lock())).toBe(false);
  await expect(page.locator('#wrongWay')).toBeHidden();
  // the FIRST move the wrong way: sharp → pushed IN (higher); flat → pulled OUT (lower)
  const wrongDir = s0.target.offset > 0 ? -1 : 1;
  await page.evaluate(d => Arcade.PerfectPitch.setPull(d), wrongDir * 2);
  let s = await st(page);
  expect(s.target.wrongWay).toBe(true);
  expect(s.wrongWay).toBe(1);
  await expect(page.locator('#wrongWay')).toBeVisible();
  await expect(page.locator('#wrongWay')).toHaveText(s0.target.offset > 0 ? 'Sharp means too high: PULL OUT to make it longer and lower.' : 'Flat means too low: PUSH IN to make it shorter and higher.');
  await page.evaluate(d => { Arcade.PerfectPitch.setPull(d * 4); Arcade.PerfectPitch.setPull(-d * 4); Arcade.PerfectPitch.setPull(d * 6); }, wrongDir);
  expect((await st(page)).wrongWay).toBe(1);                               // only the first move counts
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await page.locator('#playBtn').click();
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#nudgeUp').click();                                  // a move WHILE it sounds is heard: still open
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await expect.poll(async () => (await st(page)).sounding).toBe(false);   // the note has ended (1.6 s)
  await page.locator('#nudgeUp').click();                                  // moved in silence: play it again first
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await page.keyboard.press(' ');
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();
  expect((await st(page)).phase).toBe('feedback');
  // the next round: the right way first = no banner
  await page.evaluate(() => Arcade.PerfectPitch.next());
  for (let k = 0; k < 10 && !(await st(page)).target.offset; k++) await page.evaluate(() => { const Q = Arcade.PerfectPitch; Q.auto(); Q.lock(); Q.next(); });
  const s1 = await st(page);
  await page.evaluate(o => { const Q = Arcade.PerfectPitch; Q.judge(o > 0 ? 'sharp' : 'flat'); Q.setPull(o > 0 ? 2 : -2); }, s1.target.offset);
  s = await st(page);
  expect(s.target.wrongWay).toBe(false);
  expect(s.wrongWay).toBe(1);
  await expect(page.locator('#wrongWay')).toBeHidden();
  watch.check();
});

test('SCORING: auto() is 3 ★; 4 of 5 judgments right tops out at 2 ★; a level of 30-cent misses (W) earns no stars and saves none', async ({page}) => {
  const watch = await open(page);
  const fx = await page.evaluate(() => { const Q = Arcade.PerfectPitch; return [Q.starsFor(0, 5), Q.starsFor(0, 4), Q.starsFor(0, 3), Q.starsFor(0, 2), Q.starsFor(7, 5), Q.starsFor(13, 5), Q.starsFor(30, 5), Q.pointsFor(7, true), Q.pointsFor(7, false), Q.pointsFor(40, true)]; });
  expect(fx).toEqual([3, 2, 1, 0, 2, 1, 0, 129, 79, 50]);
  // one wrong judgment (tuned exactly anyway): 2 stars
  const r = await page.evaluate(() => {
    const Q = Arcade.PerfectPitch; Q.begin(4);
    for (let i = 0; i < 5; i++) {
      const o = Q.state().target.offset;
      if (i === 0) Q.judge(o > 0 ? 'flat' : 'sharp');           // wrong
      Q.auto(); if (Q.state().phase === 'tune') Q.lock();
      Q.next();
    }
    return {s: Q.state(), p: Arcade.store.level('perfect-pitch', 'all', 4)};
  });
  expect(r.s.right).toBe(4);
  expect(r.s.avg).toBeLessThan(1e-6);
  expect(r.s.stars).toBe(2);
  expect(r.p.stars).toBe(2);
  await expect(page.locator('#results')).toContainText('4 of 5 right');
  // W: a wrong judgment and 30 cents off, every round
  const w = await page.evaluate(() => { const Q = Arcade.PerfectPitch; Q.begin(3); for (let i = 0; i < 5; i++) { Q.wrong(); Q.lock(); Q.next(); } return {s: Q.state(), p: Arcade.store.level('perfect-pitch', 'all', 3)}; });
  w.s.results.forEach(x => { expect(Math.abs(x.cents)).toBeCloseTo(30, 6); expect(x.right).toBe(false); });
  expect(w.s.stars).toBe(0);
  expect(w.p.stars || 0).toBe(0);
  watch.check();
});

/* ================= THE CONTROLS ================= */
test('THE KEYBOARD: S / F / I and ↑ / ↓ / Enter judge; R again, T together; ←/→ move it (Shift = fine); Enter = LOCK IN then NEXT', async ({page}) => {
  const watch = await open(page, ppDevice(), {clock: true});
  const toJudge = async () => { await page.clock.runFor(4600); expect((await st(page)).phase).toBe('judge'); };
  for (const [key, ans] of [['s', 'sharp'], ['f', 'flat'], ['i', 'tune'], ['ArrowUp', 'sharp'], ['ArrowDown', 'flat'], ['Enter', 'tune']]) {
    await page.evaluate(() => Arcade.PerfectPitch.begin(2));
    await toJudge();
    if (key === 's') {                                                        // R and T while judging
      const n = () => page.evaluate(() => Arcade.Winds.test.history.length);
      await page.keyboard.press('t');
      expect(await page.evaluate(() => Arcade.Winds.test.history.slice(-1)[0].kind)).toBe('together');
      const before = (await st(page)).target.refPlays;
      await page.keyboard.press('r');
      expect((await st(page)).target.refPlays).toBe(before + 1);
      await toJudge();
      expect(await n()).toBeGreaterThan(2);
    }
    await page.keyboard.press(key);
    expect((await st(page)).target.judged, key).toBe(ans);
  }
  // ←/→ move the mechanism the way the arrow points on the drawing (the clarinet's barrel pulls out to the LEFT)
  await tuneRound(page, 1);
  const c = () => page.evaluate(() => Arcade.PerfectPitch.state().cents);
  let c0 = await c();
  await page.keyboard.press('ArrowLeft');                                     // left = out = lower
  expect((await c()) - c0).toBeCloseTo(-3, 6);
  c0 = await c();
  await page.keyboard.press('Shift+ArrowRight');                              // right = in = higher, fine
  expect((await c()) - c0).toBeCloseTo(1, 6);
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('tune');                                // not played at this setting yet
  await page.keyboard.press(' ');
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('feedback');
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('hear');
  expect((await st(page)).i).toBe(1);
  // a trumpet's slide pulls out to the RIGHT: → = out
  await page.evaluate(() => Arcade.PerfectPitch.pick('trumpet'));
  await tuneRound(page, 1);
  c0 = await c();
  await page.keyboard.press('ArrowRight');
  expect((await c()) - c0).toBeCloseTo(-3, 6);
  watch.check();
});

/* THE MECHANISM by touch and by mouse, and every control on the screen, at a phone, an iPad both ways and a Chromebook */
for (const [name, vp, touch] of [['phone', {width: 390, height: 844}, true], ['iPad portrait', {width: 768, height: 1024}, true],
  ['iPad landscape', {width: 1024, height: 768}, true], ['Chromebook', {width: 1366, height: 768}, false]]) {
  test(`LAYOUT (${name}): the judge buttons, the drawing and NUDGE fit; the mechanism drags from where it is`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await open(page, ppDevice('trumpet'));
    const boxesOf = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length)
      .map(e => { const r = e.getBoundingClientRect(); return {id: e.id || e.tagName, l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height}; }), sel);
    // JUDGE
    await page.evaluate(() => Arcade.PerfectPitch.begin(1));
    let boxes = await boxesOf('#stage svg, #judgeSharp, #judgeFlat, #judgeTune, #againBtn, #togetherBtn');
    expect(boxes.length).toBe(6);
    boxes.forEach(b => { expect(b.l, b.id).toBeGreaterThanOrEqual(0); expect(b.r, b.id).toBeLessThanOrEqual(vp.width); });
    boxes.filter(b => /judge/.test(b.id)).forEach(b => { expect(b.w, b.id).toBeGreaterThanOrEqual(44); expect(b.h, b.id).toBeGreaterThanOrEqual(44); });
    expect(Math.max(...boxes.map(b => b.b)), 'the judge buttons fit without scrolling').toBeLessThanOrEqual(vp.height);
    expect(await tooWide(page)).toEqual([]);
    // TUNE, for every drawing
    for (const id of ['clarinet', 'altosax', 'trumpet', 'tuba']) {
      await page.evaluate(id => Arcade.PerfectPitch.pick(id), id);
      await tuneRound(page, 1);
      boxes = await boxesOf('#stage svg, #nudgeDown, #nudgeUp, #playBtn, #refBtn, #bothTuneBtn, #lockBtn, #needle');
      expect(boxes.length, id).toBe(8);
      boxes.forEach(b => { expect(b.l, `${id} ${b.id}`).toBeGreaterThanOrEqual(0); expect(b.r, `${id} ${b.id}`).toBeLessThanOrEqual(vp.width); });
      boxes.filter(b => /nudge|playBtn/.test(b.id)).forEach(b => { expect(b.w, b.id).toBeGreaterThanOrEqual(44); expect(b.h, b.id).toBeGreaterThanOrEqual(44); });
      expect(boxes.find(b => b.id === 'svg').w, 'the drawing spans the play area').toBeGreaterThan(Math.min(vp.width, 1000) * .8);
      expect(Math.max(...boxes.map(b => b.b)), `${id}: the controls fit the screen without scrolling`).toBeLessThanOrEqual(vp.height);
      expect(await tooWide(page)).toEqual([]);
    }
    // drag the tuba's slide OUT (to the right) from a spot on it: it moves from where it is (never jumps to the finger)
    const s0 = await st(page);
    const art = await page.evaluate(() => ({span: Arcade.PP2Art.ART.tuba.span, travel: Arcade.PP2Tune.byId('tuba').travel}));
    const svgBox = await page.locator('#stage svg').boundingBox(), mech = await page.locator('#mech').boundingBox();
    const k = svgBox.width / 1000 * art.span / (2 * art.travel);              // screen px per mm
    const x = mech.x + mech.width * .6, y = mech.y + mech.height / 2;
    if (touch) {
      const fire = (type, xx) => page.locator('#mech').dispatchEvent(type, {pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: xx, clientY: y, bubbles: true});
      await fire('pointerdown', x);
      expect((await st(page)).d).toBe(s0.d);
      await fire('pointermove', x + 10); await fire('pointermove', x + 20); await fire('pointerup', x + 20);
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      expect((await st(page)).d).toBe(s0.d);
      await page.mouse.move(x + 10, y); await page.mouse.move(x + 20, y); await page.mouse.up();
    }
    const s1 = await st(page);
    expect(s1.d).toBeCloseTo(s0.d + 20 / k, 4);
    expect(s1.cents).toBeLessThan(s0.cents);                                 // out = lower
    // the picker panel fits too
    await page.evaluate(() => Arcade.PerfectPitch.showHub());
    await page.locator('#tuneBtn').click();
    expect(await tooWide(page)).toEqual([]);
    const tile = await page.locator('.p2-tile').first().boundingBox();
    expect(tile.width).toBeGreaterThanOrEqual(44);
    watch.check();
  });
}

/* GALLERY=1: the picker (oboe and bassoon locked), a JUDGE screen, a TUNE screen for clarinet, alto sax and trumpet, and
   an after-lock-in screen, side by side, for Mr. Graham's review */
test('GALLERY=1: docs/gallery/perfect-pitch.png (the picker, JUDGE, TUNE × 3, after LOCK IN)', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await page.setViewportSize({width: 1024, height: 900});
  const watch = await open(page);
  const shots = [];
  await page.locator('#tuneBtn').click();
  shots.push(await page.screenshot());
  await page.locator('#pickClose').click();
  await page.evaluate(() => Arcade.PerfectPitch.begin(2));
  await expect.poll(async () => (await st(page)).phase, {timeout: 9000}).toBe('judge');
  shots.push(await page.locator('#play').screenshot());
  for (const id of ['clarinet', 'altosax', 'trumpet']) {
    await page.evaluate(id => Arcade.PerfectPitch.pick(id), id);
    await tuneRound(page, 1);
    await page.evaluate(() => { const Q = Arcade.PerfectPitch, o = Q.state().target.offset; Q.setPull(Arcade.PP2Tune.dFor(Q.state().tune || 'clarinet', -o) * .5); Q.play(); });
    shots.push(await page.locator('#play').screenshot());
  }
  await page.evaluate(() => { const Q = Arcade.PerfectPitch; Q.setPull(Q.state().d + 1.5); Q.play(); Q.lock(); });
  await page.waitForTimeout(300);
  shots.push(await page.locator('#play').screenshot());
  const imgs = shots.map(b => 'data:image/png;base64,' + b.toString('base64'));
  watch.check();
  const sheet = await page.context().newPage();                         // the game's page keeps running untouched
  await sheet.setViewportSize({width: 3 * 600 + 4 * 12, height: 900});
  await sheet.setContent(`<body style="margin:0;background:#0c0a14;display:grid;grid-template-columns:repeat(3,600px);gap:12px;padding:12px;align-items:start">${imgs.map(s => `<img src="${s}" style="width:600px">`).join('')}</body>`);
  const out = path.join(__dirname, '..', 'docs/gallery/perfect-pitch.png');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  await sheet.screenshot({path: out, fullPage: true});
});
