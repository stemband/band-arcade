/* SLIDE QUEST (slide-quest/, docs/games/slide-quest.md): a trombone slide game with NO MICROPHONE. The physics (the
   marks' spots in both tunings, the growing gaps, every mark × partial on the chart note, the tuning slide's room,
   spotFor and waysTo against shared/fingerings.js), the sound (the horn follows the slide, glides and slurs without
   restarting, the drone and the horn BEAT, silence when muted or while a mic listens), every level's rules, the game
   never asking for the microphone, the keyboard, and the slide working by touch and mouse on every screen size. */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');
const fs = require('fs'), path = require('path');

const URL = 'slide-quest/index.html?demo&nostart';
const st = page => page.evaluate(() => Arcade.SlideQuest.state());
const sqDevice = (gd = {hpTip: true}) => device('trumpet', {gameData: {'slide-quest': gd}});
/** open the page, with a first tap (it unlocks the arcade's audio, as PRESS START's tap does) */
async function open(page, store = sqDevice()) {
  const watch = await prepare(page, {store});
  await page.goto(URL);
  await page.locator('.game-title').click();
  return watch;
}
const freq = m => 440 * Math.pow(2, (m - 69) / 12);

/* ================= THE PHYSICS ================= */
test('THE PHYSICS: the marks in both tunings, the gaps grow, and every mark × partial is the chart note (0 cents ideal, the harmonic error real)', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const S = Arcade.SQSlide, out = {ideal: [], real: [], err: {}, room: {}};
    for (let k = 1; k <= 7; k++) { out.ideal.push(S.markX(k, 'ideal')); out.real.push(S.markX(k, 'real')); }
    ['ideal', 'real'].forEach(mode => {
      out.err[mode] = {};
      [2, 3, 4, 5, 6].forEach(n => {
        out.err[mode][n] = [];
        for (let k = 1; k <= 7; k++) { const midi = S.SLIDE.et[n] - (k - 1); out.err[mode][n].push(S.cents(S.freq(n, S.markX(k, mode), mode), S.midiFreq(midi))); }
      });
    });
    // THE ROOM: real-mode against the stops is 20 cents sharp of 1st position, on every partial
    [2, 3, 4, 5, 6].forEach(n => { out.room[n] = S.cents(S.freq(n, 0, 'real'), S.freq(n, S.markX(1, 'real'), 'real')); });
    out.harm = [2, 3, 4, 5, 6].map(n => S.harmonicError(n));
    out.consts = {FP: S.SLIDE.FP, L0: S.SLIDE.L0, travel: S.SLIDE.travel, room: S.SLIDE.room};
    return out;
  });
  expect(r.consts).toEqual({FP: 58.2705, L0: 270, travel: 60, room: 20});
  [0, 8.0, 16.5, 25.5, 35.1, 45.2, 55.9].forEach((v, i) => expect(Math.abs(r.ideal[i] - v), `ideal mark ${i + 1}`).toBeLessThan(.06));
  [1.6, 9.7, 18.3, 27.4, 37.1, 47.3, 58.1].forEach((v, i) => expect(Math.abs(r.real[i] - v), `real mark ${i + 1}`).toBeLessThan(.06));
  for (const m of [r.ideal, r.real]) for (let k = 2; k < 7; k++) expect(m[k] - m[k - 1], `gap ${k}–${k + 1}`).toBeGreaterThan(m[k - 1] - m[k - 2]);
  Object.values(r.err.ideal).forEach(list => list.forEach(c => expect(Math.abs(c)).toBeLessThan(1e-9)));
  const harm = {2: 0, 3: 1.955, 4: 0, 5: -13.686, 6: 1.955};
  Object.entries(r.err.real).forEach(([n, list]) => list.forEach(c => expect(Math.abs(c - harm[n]), `partial ${n}`).toBeLessThan(.01)));
  expect(r.err.real[5][0]).toBeGreaterThan(-13.8); expect(r.err.real[5][0]).toBeLessThan(-13.6);   // −13.7 ± 0.1
  Object.values(r.room).forEach(c => expect(c).toBeCloseTo(20, 9));
  r.harm.forEach((h, i) => expect(h).toBeCloseTo(harm[i + 2], 2));
  watch.check();
});

test('THE PHYSICS: spotFor round-trips, out-of-reach is null, and waysTo covers every TROMBONE chart entry (shared/fingerings.js) on partials 2–6', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page);
  await page.addScriptTag({url: '/shared/fingerings.js'});
  const r = await page.evaluate(() => {
    const S = Arcade.SQSlide, out = {trip: [], nulls: [], missing: [], covered: 0, names: {}};
    ['ideal', 'real'].forEach(mode => [2, 3, 4, 5, 6].forEach(n => {
      for (let k = 1; k <= 7; k++) {
        const midi = S.SLIDE.et[n] - (k - 1), x = S.spotFor(midi, n, mode);
        out.trip.push([mode, n, k, x, S.cents(S.freq(n, x, mode), S.midiFreq(midi))]);
      }
      out.nulls.push(S.spotFor(S.SLIDE.et[n] + 1, n, mode), S.spotFor(S.SLIDE.et[n] - 7, n, mode));   // above 1st, below 7th
    }));
    const TB = window.MASHER_FINGERINGS.trombone.notes;
    Object.entries(TB).forEach(([note, poss]) => {
      const midi = Arcade.music.writtenMidi(Arcade.music.parseNote(note));
      poss.forEach(k => {
        const n = [2, 3, 4, 5, 6].find(p => S.SLIDE.et[p] - (k - 1) === midi);
        if (!n) return;                                       // partials 7 and up (G4, A♭4…): not on this horn's ladder
        out.covered++;
        ['ideal', 'real'].forEach(mode => { if (!S.waysTo(midi, mode).some(([wn, wk]) => wn === n && wk === k)) out.missing.push(`${note} ${k} (${mode})`); });
      });
    });
    out.d4 = S.waysTo(62, 'ideal'); out.f3 = S.waysTo(53, 'real'); out.e2 = S.waysTo(40, 'ideal');
    [46, 47, 54, 61, 63, 66, 70].forEach(m => { out.names[m] = S.label(m); });
    return out;
  });
  r.trip.forEach(([mode, n, k, x, c]) => { expect(x, `${mode} ${n}/${k}`).not.toBeNull(); expect(Math.abs(c)).toBeLessThan(1e-9); });
  r.nulls.forEach(x => expect(x).toBeNull());
  expect(r.covered).toBeGreaterThan(25);
  expect(r.missing).toEqual([]);
  expect(r.d4).toEqual([[5, 1], [6, 4]]);
  expect(r.f3).toEqual([[3, 1], [4, 6]]);
  expect(r.e2).toEqual([[2, 7]]);
  expect(r.names).toEqual({46: 'B♭2', 47: 'B2', 54: 'F♯3', 61: 'D♭4', 63: 'E♭4', 66: 'F♯4', 70: 'B♭4'});
  watch.check();
});

/* ================= THE SOUND ================= */
test('opens with no instrument chosen, never asks for the microphone, and Level 1 plays to 3 stars by keys', {tag: '@quick'}, async ({page}) => {
  const watch = await prepare(page, {store: {player: null, members: {}, games: {}, modes: {}, gameData: {'season-lobby': {giftAfter: '9999-12-31'}}}});
  await page.addInitScript(() => {
    window.__gum = 0;
    if (navigator.mediaDevices) { const real = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = function () { window.__gum++; return real.apply(this, arguments); }; }
  });
  await page.goto(URL);
  await expect(page).toHaveURL(/slide-quest\/index\.html/);                 // no Choose Your Instrument on the way in
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
  const r = await page.evaluate(() => ({s: Arcade.SlideQuest.state(), p: Arcade.store.level('slide-quest', 'all', 1), gum: window.__gum}));
  expect(r.s.results.length).toBe(5);
  r.s.results.forEach(x => expect(Math.abs(x.cents)).toBeLessThan(1e-6));
  expect(r.p.stars).toBe(3);
  expect(r.p.best).toBe(500);
  expect(r.gum).toBe(0);
  watch.check();
});

test('THE HORN: its live frequency follows the slide; a glide never restarts the voice; a lip change is a slur, not a restart', async ({page, browserName}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(6));
  const r = await page.evaluate(() => {
    const Q = Arcade.SlideQuest, B = Arcade.SQBrass, S = Arcade.SQSlide, out = {};
    Q.setSlide(S.markX(4, 'ideal'));
    out.blew = Q.blow(true);
    out.playing = B.playing();
    out.start = B.test.voiceStart();
    const p = Q.state().partial;
    out.f0 = Q.state().freq; out.t0 = B.test.target();
    Q.setSlide(S.markX(2, 'ideal'));                         // slide IN two positions, while it sounds
    out.f1 = Q.state().freq; out.t1 = B.test.target();
    out.start1 = B.test.voiceStart();
    out.lipped = Q.lip(p === 6 ? 5 : p + 1);
    out.f2 = Q.state().freq; out.t2 = B.test.target();
    out.start2 = B.test.voiceStart();
    out.slur = B.test.history.slice(-1)[0];
    out.horns = B.test.history.filter(h => h.kind === 'horn' && h.played).length;
    return out;
  });
  expect(r.blew).toBe(true);
  expect(r.playing).toBe(true);
  expect(r.t0).toBeCloseTo(r.f0, 9);
  expect(r.t1).toBeCloseTo(r.f1, 9);
  expect(1200 * Math.log2(r.f1 / r.f0)).toBeCloseTo(200, 6);       // two positions in = two half steps up
  expect(r.start1).toBe(r.start);                                   // the same voice, glided
  expect(r.lipped).toBe(true);
  expect(r.t2).toBeCloseTo(r.f2, 9);
  expect(r.start2).toBe(r.start);                                   // a slur: still the same voice
  expect(r.slur).toMatchObject({kind: 'slur'});
  expect(r.horns).toBe(1);
  if (browserName === 'chromium') {                                 // the audio engine itself has glided there
    await expect.poll(() => page.evaluate(() => Math.abs(Arcade.SQBrass.test.live() - Arcade.SlideQuest.state().freq))).toBeLessThan(.5);
  }
  watch.check();
});

test('THE BEATS: the drone and the horn 3 Hz apart beat at 3 Hz (an OfflineAudioContext render), and in tune they don\'t', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(1));
  await expect.poll(async () => (await st(page)).droneOn).toBe(true);
  const r = await page.evaluate(async () => {
    const Q = Arcade.SlideQuest, B = Arcade.SQBrass, S = Arcade.SQSlide, s = Q.state();
    // put the live horn exactly 3 Hz off the target (the drone): flat, unless that is past the end of the slide (a
    // 7th-position target), then sharp (a 1st-position target can't go sharp: the slide is against the stops)
    const n = s.target.n, xFor = f => (S.SLIDE.L0 * S.base(n, 'ideal') / f - S.SLIDE.L0) / 2;
    let x = xFor(s.target.freq - 3);
    if (x > S.SLIDE.travel) x = xFor(s.target.freq + 3);
    Q.setSlide(x); Q.blow(true);
    const fh = B.test.target(), fd = B.test.drone().freq;
    const beat = async (a, b) => {
      const {data, rate} = await B.test.render(a, b, 4);
      const win = Math.round(rate * .01), env = [];
      for (let i = Math.round(rate * .5); i + win <= data.length; i += win) { let q = 0; for (let j = i; j < i + win; j++) q += data[j] * data[j]; env.push(Math.sqrt(q / win)); }
      const mean = env.reduce((a, b) => a + b, 0) / env.length, e = env.map(v => v - mean);
      let best = 0, bestF = 0, total = 0;
      for (let f = .5; f <= 10; f += .05) {
        let re = 0, im = 0; e.forEach((v, i) => { re += v * Math.cos(2 * Math.PI * f * i / 100); im += v * Math.sin(2 * Math.PI * f * i / 100); });
        const p = Math.hypot(re, im); total += p; if (p > best) { best = p; bestF = f; }
      }
      return {f: bestF, depth: (Math.max(...env) - Math.min(...env)) / mean};
    };
    return {fh, fd, three: await beat(fh, fd), tuned: await beat(fd, fd)};
  });
  expect(Math.abs(r.fd - r.fh)).toBeCloseTo(3, 6);
  expect(r.three.f).toBeGreaterThan(2.7); expect(r.three.f).toBeLessThan(3.3);
  expect(r.three.depth).toBeGreaterThan(.4);                        // a clear wah-wah-wah, not a ripple
  expect(r.tuned.depth).toBeLessThan(r.three.depth / 3);            // in tune: the beating stops
  watch.check();
});

test('THE SOUND: nothing plays with the sound off, or while a microphone listens (the pitched-audio rule)', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(1));
  const r = await page.evaluate(() => {
    const B = Arcade.SQBrass, out = {};
    out.on = B.start(220); B.stop();
    Arcade.store.setSfx(false);                             // SOUND OFF (the top bar's speaker button)
    out.muted = B.start(220); out.mutedDrone = B.drone(220);
    Arcade.store.setSfx(true);
    out.back = B.start(220); B.stop();
    Arcade.Pitch = {listening: () => true};                 // pretend a microphone were listening
    out.listening = B.start(220); out.listeningDrone = B.drone(220, {sec: 1});
    out.last = B.test.history.slice(-2).map(h => h.played);
    delete Arcade.Pitch;
    B.stopAll();
    return out;
  });
  expect(r).toMatchObject({on: true, muted: false, mutedDrone: null, back: true, listening: false, listeningDrone: null, last: [false, false]});
  watch.check();
});

/* ================= THE LEVELS ================= */
test('LEVELS: each level\'s flags (named, told, marks, needle, drone vs once, lips) on the screen', async ({page}) => {
  const watch = await open(page);
  const EXPECT = [
    {tuning: 'ideal', named: true, told: true, marks: true, needle: true, lips: false, ref: 'drone'},
    {tuning: 'ideal', named: true, told: false, marks: true, needle: true, lips: false, ref: 'drone'},
    {tuning: 'ideal', named: false, told: false, marks: true, needle: false, lips: false, ref: 'drone'},
    {tuning: 'ideal', named: false, told: false, marks: false, needle: false, lips: false, ref: 'drone'},
    {tuning: 'ideal', named: false, told: false, marks: false, needle: false, lips: false, ref: 'once'},
    {tuning: 'ideal', named: true, told: false, marks: true, needle: false, lips: true, ref: 'drone'},
    {tuning: 'real', named: true, told: true, marks: true, needle: false, lips: true, ref: 'drone'},
    {tuning: 'real', named: false, told: false, marks: false, needle: false, lips: true, ref: 'drone'},
  ];
  for (let lv = 1; lv <= 8; lv++) {
    await page.evaluate(lv => Arcade.SlideQuest.begin(lv), lv);
    const s = await st(page), e = EXPECT[lv - 1];
    expect(s.flags, `level ${lv}`).toEqual(e);
    expect(await page.locator('#marks').isVisible(), `marks ${lv}`).toBe(e.marks);
    expect(await page.locator('#needle').isVisible(), `needle ${lv}`).toBe(e.needle);
    expect(await page.locator('#lips').isVisible(), `lips ${lv}`).toBe(e.lips);
    expect(await page.locator('#droneBtn').isVisible(), `drone ${lv}`).toBe(e.ref === 'drone');
    expect(s.prompt.includes(s.target.name), `named ${lv}: ${s.prompt}`).toBe(e.named);
    expect(/position/.test(s.prompt), `told ${lv}: ${s.prompt}`).toBe(e.told);
    if (e.told) expect(s.prompt).toContain(Arcade_ord(s.target.pos) + ' position');
    // the reference by itself at the start of the round: the drone held ON, or the note once
    if (e.ref === 'drone') await expect.poll(async () => (await st(page)).droneOn).toBe(true);
    else await expect.poll(async () => (await st(page)).target.refPlays).toBe(1);
    // no live pitch display while tuning: no note name in the stage or the controls
    expect(await page.locator('#stage, #controls').evaluateAll(els => els.map(e => e.textContent).join(' '))).not.toMatch(/[A-G][♭♯]?[1-6]/);
  }
  watch.check();
});
function Arcade_ord(k) { return ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'][k]; }

test('LOCK IN is disabled until the horn has sounded this round; the drone is ON at the start and toggles; a once level plays once', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(3));
  await expect.poll(async () => (await st(page)).droneOn).toBe(true);
  await expect(page.locator('#lockBtn')).toBeDisabled();
  expect(await page.evaluate(() => Arcade.SlideQuest.lock())).toBe(false);
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('tune');
  await page.locator('#droneBtn').click();
  expect((await st(page)).droneOn).toBe(false);
  expect(await page.evaluate(() => Arcade.SQBrass.droning())).toBe(false);
  await page.keyboard.press('d');
  expect((await st(page)).droneOn).toBe(true);
  await page.evaluate(() => Arcade.SlideQuest.blow(true));
  await page.evaluate(() => Arcade.SlideQuest.blow(false));
  await expect(page.locator('#lockBtn')).toBeEnabled();
  expect(await page.evaluate(() => Arcade.SlideQuest.lock())).toBe(true);
  expect((await st(page)).phase).toBe('feedback');
  // the next round: locked again until it is blown
  await page.evaluate(() => Arcade.SlideQuest.next());
  await expect(page.locator('#lockBtn')).toBeDisabled();
  // FROM MEMORY: the note plays once by itself; D (and the hook) can't replay it
  await page.evaluate(() => Arcade.SlideQuest.begin(5));
  await expect.poll(async () => (await st(page)).target.refPlays).toBe(1);
  await page.keyboard.press('d');
  expect(await page.evaluate(() => Arcade.SlideQuest.reference())).toBe(false);
  expect((await st(page)).target.refPlays).toBe(1);
  await expect(page.locator('#droneBtn')).toBeHidden();
  // a PAUSE while the once-only note plays: it plays again, free, on RESUME (and only then)
  await page.evaluate(() => Arcade.SlideQuest.begin(5));
  await expect.poll(async () => (await st(page)).target.refPlays).toBe(1);
  await page.locator('#uiPauseBtn').click();
  expect(await page.evaluate(() => Arcade.SQBrass.test.history.filter(h => h.kind === 'drone' && h.played).length)).toBeGreaterThan(0);
  const before = await page.evaluate(() => Arcade.SQBrass.test.history.filter(h => h.kind === 'drone' && h.played).length);
  await page.locator('#uiPause [data-act="resume"]').click();
  await expect.poll(async () => (await st(page)).target.refPlays).toBe(1);
  expect(await page.evaluate(() => Arcade.SQBrass.test.history.filter(h => h.kind === 'drone' && h.played).length)).toBe(before + 1);
  watch.check();
});

test('SCORING: auto() is 0 cents (BULLSEYE, Right there!); a level of 30-cent misses (W) earns no stars and saves none', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(2));
  await page.evaluate(() => { Arcade.SlideQuest.auto(); Arcade.SlideQuest.lock(); });
  let s = await st(page);
  expect(Math.abs(s.results[0].cents)).toBeLessThan(1e-6);
  expect(s.results[0].points).toBe(100);
  await expect(page.locator('.sq-bull')).toBeVisible();
  await expect(page.locator('#spotMsg')).toHaveText('Right there!');
  await expect(page.locator('#ghost')).toBeVisible();
  await page.evaluate(() => Arcade.SlideQuest.begin(3));
  s = await page.evaluate(() => { const Q = Arcade.SlideQuest; for (let i = 0; i < 5; i++) { Q.wrong(); Q.lock(); Q.next(); } return Q.state(); });
  s.results.forEach(x => expect(Math.abs(x.cents)).toBeCloseTo(30, 6));
  expect(s.stars).toBe(0);
  expect(await page.evaluate(() => Arcade.store.level('slide-quest', 'all', 3).stars || 0)).toBe(0);
  const fx = await page.evaluate(() => [Arcade.SlideQuest.starsFor(0), Arcade.SlideQuest.starsFor(7), Arcade.SlideQuest.starsFor(14), Arcade.SlideQuest.starsFor(30), Arcade.SlideQuest.pointsFor(7)]);
  expect(fx).toEqual([3, 2, 1, 0, 79]);
  watch.check();
});

test('ROUNDS: targets never repeat, the slide starts ≥ 150 cents from the spot, and (lips) on a partial that can\'t play the target', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const Q = Arcade.SlideQuest, S = Arcade.SQSlide, out = [];
    for (let rep = 0; rep < 3; rep++) for (let lv = 1; lv <= 8; lv++) {
      Q.begin(lv);
      const L = {lv, targets: [], away: [], lipsOk: [], startOnSlide: []};
      for (let i = 0; i < 5; i++) {
        const s = Q.state(), t = s.target;
        L.targets.push(t.midi);
        L.away.push(Math.abs(S.centsBetween(s.x, t.spot)));
        L.startOnSlide.push(s.x === t.startX && s.partial === t.startPartial);
        if (s.flags.lips) L.lipsOk.push(!S.waysTo(t.midi, s.flags.tuning).some(w => w[0] === s.partial));
        else L.lipsOk.push(s.partial === t.n);
        Q.auto(); Q.lock(); Q.next();
      }
      out.push(L);
    }
    return out;
  });
  r.forEach(L => {
    expect(new Set(L.targets).size, `level ${L.lv}`).toBe(5);
    L.away.forEach(c => expect(c, `level ${L.lv}`).toBeGreaterThanOrEqual(150));
    L.lipsOk.forEach(ok => expect(ok, `level ${L.lv}`).toBe(true));
    L.startOnSlide.forEach(ok => expect(ok).toBe(true));
  });
  watch.check();
});

test('REAL HORN (level 7): at least 3 of 5 rounds on partial 5; a mark-placed 5th-partial answer is about −14 cents, and the line says to move IN', async ({page}) => {
  const watch = await open(page);
  const counts = await page.evaluate(() => { const Q = Arcade.SlideQuest, out = []; for (let k = 0; k < 6; k++) { Q.begin(7); let n5 = 0; for (let i = 0; i < 5; i++) { if (Q.state().target.n === 5) n5++; Q.auto(); Q.lock(); Q.next(); } out.push(n5); } return out; });
  counts.forEach(n => expect(n).toBeGreaterThanOrEqual(3));
  await page.evaluate(() => Arcade.SlideQuest.begin(7));
  for (let k = 0; k < 5 && (await st(page)).target.n !== 5; k++) await page.evaluate(() => { const Q = Arcade.SlideQuest; Q.auto(); Q.lock(); Q.next(); });
  const s = await st(page);
  expect(s.target.n).toBe(5);
  const res = await page.evaluate(() => {
    const Q = Arcade.SlideQuest, S = Arcade.SQSlide, t = Q.state().target;
    Q.lip(5); Q.setSlide(S.markX(t.pos, 'real')); Q.blow(true); Q.blow(false); Q.lock();
    return Q.state().results.slice(-1)[0];
  });
  expect(res.cents).toBeGreaterThan(-13.8); expect(res.cents).toBeLessThan(-13.6);
  await expect(page.locator('.sq-err')).toHaveText(/−14 cents flat/);
  await expect(page.locator('#spotMsg')).toHaveText('The exact spot was a little further IN.');
  await expect(page.locator('#flatTip')).toContainText('5th-partial notes are flat at the mark: bring the slide IN a little.');
  watch.check();
});

test('THE EAR LESSON: level 4\'s intro says "From here on, your ears are the tuner." the first time only', async ({page}) => {
  const watch = await open(page, sqDevice({hpTip: true}));
  await page.evaluate(() => Arcade.SlideQuest.intro(3));
  await expect(page.locator('#introTitle')).toHaveText('Ears Only');
  await expect(page.locator('#earLesson')).toHaveCount(0);
  await page.locator('#introBack').click();
  await page.evaluate(() => Arcade.SlideQuest.intro(4));
  await expect(page.locator('#earLesson')).toHaveText('From here on, your ears are the tuner.');
  await page.locator('#introBack').click();
  await page.evaluate(() => Arcade.SlideQuest.intro(4));
  await expect(page.locator('#introTitle')).toHaveText('No Marks');
  await expect(page.locator('#earLesson')).toHaveCount(0);
  expect(await page.evaluate(() => Arcade.store.gameData('slide-quest').earLesson)).toBe(true);
  watch.check();
});

/* ================= THE CONTROLS ================= */
test('THE KEYBOARD: ←/→ 5 cents (Shift 1), ↑/↓ lips, Space held = blow, D drone, Enter = LOCK IN then NEXT', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => { Arcade.SlideQuest.begin(6); Arcade.SlideQuest.setSlide(30); });
  const c = () => page.evaluate(() => { const s = Arcade.SlideQuest.state(); return Arcade.SQSlide.freq(s.partial, s.x, 'ideal'); });
  let f0 = await c();
  await page.keyboard.press('ArrowLeft');                             // in = higher
  expect(1200 * Math.log2((await c()) / f0)).toBeCloseTo(5, 6);
  f0 = await c();
  await page.keyboard.press('Shift+ArrowRight');                      // out = lower, fine
  expect(1200 * Math.log2((await c()) / f0)).toBeCloseTo(-1, 6);
  const p0 = (await st(page)).partial;
  await page.keyboard.press(p0 < 6 ? 'ArrowUp' : 'ArrowDown');
  expect((await st(page)).partial).toBe(p0 < 6 ? p0 + 1 : p0 - 1);
  await expect(page.locator('#ladder i.on')).toHaveCount(1);
  await page.keyboard.down(' ');
  expect((await st(page)).blowing).toBe(true);
  await page.keyboard.up(' ');
  expect((await st(page)).blowing).toBe(false);
  expect((await st(page)).blown).toBe(true);
  await expect.poll(async () => (await st(page)).droneOn).toBe(true);
  await page.keyboard.press('d');
  expect((await st(page)).droneOn).toBe(false);
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('feedback');
  await page.keyboard.press('Enter');
  expect((await st(page)).phase).toBe('tune');
  expect((await st(page)).i).toBe(1);
  watch.check();
});

test('BLOW: a tap toggles the horn on and off; a press held down stops on release', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => Arcade.SlideQuest.begin(1));
  const b = await page.locator('#blowBtn').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();      // a tap: it keeps sounding
  expect((await st(page)).blowing).toBe(true);
  await expect(page.locator('#stage')).toHaveClass(/sounding/);
  await page.mouse.down(); await page.mouse.up();                                    // a second tap: stops
  expect((await st(page)).blowing).toBe(false);
  await page.mouse.down(); await page.waitForTimeout(500);                           // a hold: sounds while held
  expect((await st(page)).blowing).toBe(true);
  await page.mouse.up();
  expect((await st(page)).blowing).toBe(false);
  watch.check();
});

test('THE NUDGE buttons move the slide 2 cents\' worth; the slide stops at the stops and at 60 cm', async ({page}) => {
  const watch = await open(page);
  await page.evaluate(() => { Arcade.SlideQuest.begin(1); Arcade.SlideQuest.setSlide(50); });
  const f = () => page.evaluate(() => Arcade.SlideQuest.state().freq);
  let f0 = await f();
  await page.locator('#nudgeUp').click();
  expect(1200 * Math.log2((await f()) / f0)).toBeCloseTo(2, 6);
  f0 = await f();
  await page.locator('#nudgeDown').click(); await page.locator('#nudgeDown').click();
  expect(1200 * Math.log2((await f()) / f0)).toBeCloseTo(-4, 6);
  await page.evaluate(() => Arcade.SlideQuest.setSlide(-5));
  expect((await st(page)).x).toBe(0);
  await page.evaluate(() => Arcade.SlideQuest.setSlide(99));
  expect((await st(page)).x).toBe(60);
  watch.check();
});

/* THE SLIDE by touch and by mouse, and every control on the screen, at a phone, an iPad both ways and a Chromebook */
for (const [name, vp, touch] of [['phone', {width: 390, height: 844}, true], ['iPad portrait', {width: 768, height: 1024}, true],
  ['iPad landscape', {width: 1024, height: 768}, true], ['Chromebook', {width: 1366, height: 768}, false]]) {
  test(`LAYOUT (${name}): the slide is full width and drags from where it is; every control is on the screen`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await open(page);
    for (const lv of [1, 6]) {
      await page.evaluate(lv => { Arcade.SlideQuest.begin(lv); }, lv);
      const sel = '#stage svg, #blowBtn, #nudgeDown, #nudgeUp, #droneBtn, #lockBtn' + (lv === 6 ? ', #lipUp, #lipDown' : ', #needle');
      const boxes = await page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length)
        .map(e => { const r = e.getBoundingClientRect(); return {id: e.id || e.tagName, l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height}; }), sel);
      expect(boxes.length, `level ${lv}`).toBe(lv === 6 ? 8 : 7);
      boxes.forEach(b => { expect(b.l, b.id).toBeGreaterThanOrEqual(0); expect(b.r, b.id).toBeLessThanOrEqual(vp.width); });
      boxes.filter(b => /nudge|lip|blowBtn/.test(b.id)).forEach(b => { expect(b.w, b.id).toBeGreaterThanOrEqual(44); expect(b.h, b.id).toBeGreaterThanOrEqual(44); });
      const svg = boxes.find(b => b.id === 'svg');
      expect(svg.w, 'the slide spans the play area').toBeGreaterThan(Math.min(vp.width, 1000) * .8);
      expect(Math.max(...boxes.map(b => b.b)), 'the controls fit the screen without scrolling').toBeLessThanOrEqual(vp.height);
      expect(await tooWide(page)).toEqual([]);
    }
    // drag the outer slide OUT from a spot away from its grip: it moves from where it is (never jumps to the finger)
    await page.evaluate(() => Arcade.SlideQuest.setSlide(10));
    const s0 = await st(page);
    const crook = await page.locator('#outer .sq-bumper').boundingBox();
    const svgBox = await page.locator('#stage svg').boundingBox();
    const k = svgBox.width / 1000 * (340 / 60);                         // screen px per cm (game.js V.travel 340 units = 60 cm)
    const x = crook.x - 20, y = crook.y + crook.height / 2;
    if (touch) {
      const fire = (type, xx) => page.locator('#outer').dispatchEvent(type, {pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: xx, clientY: y, bubbles: true});
      await fire('pointerdown', x);
      expect((await st(page)).x).toBe(s0.x);
      await fire('pointermove', x + 20); await fire('pointermove', x + 40); await fire('pointerup', x + 40);
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      expect((await st(page)).x).toBe(s0.x);
      await page.mouse.move(x + 20, y); await page.mouse.move(x + 40, y); await page.mouse.up();
    }
    const s1 = await st(page);
    expect(s1.x).toBeCloseTo(s0.x + 40 / k, 4);
    expect(s1.freq).toBeLessThan(s0.freq);                              // out = lower
    watch.check();
  });
}

/* GALLERY=1: level 1 (marks, needle), level 6 (lips) and an after-lock-in screen with the ghost slide, side by side,
   for Mr. Graham's review */
test('GALLERY=1: docs/gallery/slide-quest.png (level 1, level 6, after LOCK IN with the ghost slide)', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await page.setViewportSize({width: 1024, height: 900});
  const watch = await open(page);
  const shots = [];
  await page.evaluate(() => Arcade.SlideQuest.begin(1));
  await expect.poll(async () => (await st(page)).droneOn).toBe(true);
  await page.evaluate(() => { const Q = Arcade.SlideQuest, s = Q.state(); Q.setSlide(Arcade.SQSlide.shiftX(s.target.spot, -9)); Q.blow(true); });
  shots.push(await page.locator('#play').screenshot());
  await page.evaluate(() => { Arcade.SlideQuest.blow(false); Arcade.SlideQuest.begin(6); });
  await expect.poll(async () => (await st(page)).droneOn).toBe(true);
  shots.push(await page.locator('#play').screenshot());
  await page.evaluate(() => { const Q = Arcade.SlideQuest, s = Q.state(); Q.lip(s.target.n); Q.setSlide(Arcade.SQSlide.shiftX(s.target.spot, 20)); Q.blow(true); Q.blow(false); Q.lock(); });
  await page.waitForTimeout(300);
  shots.push(await page.locator('#play').screenshot());
  const imgs = shots.map(b => 'data:image/png;base64,' + b.toString('base64'));
  watch.check();
  const sheet = await page.context().newPage();                         // the game's page keeps running untouched
  await sheet.setViewportSize({width: 3 * 600 + 4 * 12, height: 900});
  await sheet.setContent(`<body style="margin:0;background:#0a0d14;display:flex;gap:12px;padding:12px;align-items:flex-start">${imgs.map(s => `<img src="${s}" style="width:600px">`).join('')}</body>`);
  const out = path.join(__dirname, '..', 'docs/gallery/slide-quest.png');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  await sheet.screenshot({path: out, fullPage: true});
});
