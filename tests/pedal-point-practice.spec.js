/* PEDAL POINT: PRACTICE MODE (pedal-point/practice.js, docs/games/pedal-point.md). The Practice Room's setup and
   presets, playing (taps, the center thud, rolls, two fingers, keys, muffle, the pedal while ringing), the click, LOAD
   YOUR OWN SHEET MUSIC (IndexedDB, device-only: no request carries it, not in the Backup Code), the four etudes (parse,
   HEAR IT, PLAY ALONG's judging, loop, tempo, best %), the bass-clef staff, no stars, the practice-time log, layouts. */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');

const URL = 'pedal-point/index.html?demo&nostart';
const P = page => page.evaluate(() => Arcade.PedalPoint.practice.state());
/** open the Practice Room (the mode switch's tap also unlocks the audio) */
/** a device on DRUM SOUND: SYNTH (these tests check the synth; THE RECORDED DRUMS tests choose RECORDED themselves) */
const synthDevice = () => device('trumpet', {gameData: {'pedal-point': {drumSound: 'synth'}}});
async function room(page, store = synthDevice()) {
  const watch = await prepare(page, {store});
  await page.goto(URL);
  await page.locator('#modePractice').click();
  await expect(page.locator('#practice')).toBeVisible();
  return watch;
}
const strikes = (page, key) => page.evaluate(k => Arcade.Timpani.test.history.filter(h => h.kind === 'strike' && h.played && (!k || h.key === k)).length, key);

test('the mode switch: PRACTICE opens the Practice Room (remembered), LEVELS goes back; C & F is the 2-drum default', {tag: '@quick'}, async ({page}) => {
  const watch = await room(page);
  let s = await P(page);
  expect(s.open).toBe(true);
  expect(s.drums.map(d => [d.id, Math.round(d.midi)])).toEqual([['26', 48], ['23', 53]]);   // C3 on the 26", F3 on the 23"
  await expect(page.locator('#hub')).toBeHidden();
  await page.reload();
  await expect(page.locator('#practice')).toBeVisible();                       // remembered on this device
  await page.locator('#modeLevels').click();
  await expect(page.locator('#hub')).toBeVisible();
  await expect(page.locator('#practice')).toBeHidden();
  expect(await page.evaluate(() => Arcade.store.gameData('pedal-point').mode)).toBe('levels');
  watch.check();
});

test('SETUP: 1–4 drums, sizes, the order switch, pitches by pedal and by list, the presets, remembered', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prSetupBtn').click();
  await expect(page.locator('#prSetup')).toBeVisible();
  for (const n of [1, 3, 4, 2]) {
    await page.locator(`#prCount [data-n="${n}"]`).click();
    expect((await P(page)).drums.length).toBe(n);
    await expect(page.locator('.pr-drum')).toHaveCount(n);
  }
  // four drums: lowest on the left; the European order puts it on the right
  await page.locator('#prPresets [data-preset="four"]').click();
  let s = await P(page);
  expect(s.drums.map(d => [d.id, Math.round(d.midi)])).toEqual([['32', 41], ['29', 46], ['26', 48], ['23', 53]]);   // F B♭ C F
  const sizes = () => page.locator('.pr-drum .pr-sz').allTextContents();
  expect(await sizes()).toEqual(['32"', '29"', '26"', '23"']);
  await page.locator('#prOrder [data-order="eu"]').click();
  expect(await sizes()).toEqual(['23"', '26"', '29"', '32"']);
  await page.locator('#prOrder [data-order="us"]').click();
  // a size and a note from the drum's list (band spellings)
  await page.locator('#prPresets [data-preset="cf"]').click();
  const opts = await page.locator('[data-note="0"] option').allTextContents();
  expect(opts).toEqual(['B♭2', 'B2', 'C3', 'D♭3', 'D3', 'E♭3', 'E3', 'F3']);   // the 26"'s half steps, band spellings
  await page.locator('[data-note="0"]').selectOption('50');                      // D3
  expect(Math.round((await P(page)).drums[0].midi * 100)).toBe(5000);
  await page.locator('[data-size="1"]').selectOption('32');
  s = await P(page);
  expect(s.drums.map(d => d.id).sort()).toEqual(['26', '32']);
  await page.locator('#prSetupDone').click();
  // tuned by the pedal: drag the selected drum's pedal up
  await page.evaluate(() => { const p = Arcade.PedalPoint.practice; p.applyPreset('cf'); p.select(0); p.setPedal(0, .9); });
  s = await P(page);
  expect(s.drums[0].pedal).toBeCloseTo(.9, 6);
  // the presets
  for (const [id, want] of [['bbf', [['29', 46], ['26', 53]]], ['ebbb', [['29', 46], ['26', 51]]], ['cf', [['26', 48], ['23', 53]]]]) {
    await page.evaluate(id => Arcade.PedalPoint.practice.applyPreset(id), id);
    expect((await P(page)).drums.map(d => [d.id, Math.round(d.midi)])).toEqual(want);
  }
  // remembered
  await page.evaluate(() => { Arcade.PedalPoint.practice.applyPreset('four'); Arcade.store.saveGameData('pedal-point'); });
  await page.reload();
  expect((await P(page)).drums.length).toBe(4);
  watch.check();
});

test('PLAYING: a tap = one stroke at the drum\'s pitch, the center = the thud, a hold = a roll at the ROLL rate that stops on release', async ({page}) => {
  const watch = await room(page);
  const head = page.locator('.pr-drum[data-i="0"] .pr-head');
  const b = await head.boundingBox();
  // the playing spot: about 3–4 inches in from the rim
  let n0 = await strikes(page, 'p0');
  await page.mouse.click(b.x + b.width / 2 + b.width * .33, b.y + b.height / 2);
  let h = await page.evaluate(() => Arcade.Timpani.test.history.filter(x => x.kind === 'strike').slice(-1)[0]);
  expect(await strikes(page, 'p0')).toBe(n0 + 1);
  expect(h.freq).toBeCloseTo(130.81, 1);                                        // C3
  expect(h.thud).toBe(false);
  expect(h.layer).toBe(true);
  // the center: the thud
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  h = await page.evaluate(() => Arcade.Timpani.test.history.filter(x => x.kind === 'strike').slice(-1)[0]);
  expect(h.thud).toBe(true);
  expect(h.center).toBeGreaterThan(.9);
  const ringSpot = await page.evaluate(f => Arcade.Timpani.ringOf(f), h.freq);
  expect(h.ring).toBeLessThan(ringSpot * .5);                                   // a short, dull ring
  // a hold = a roll
  const R = await page.evaluate(() => Arcade.Timpani.ROLL);
  n0 = await strikes(page, 'p0');
  await page.mouse.move(b.x + b.width * .8, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  const during = await P(page);
  expect(during.presses[0].rolling).toBe(true);
  await page.mouse.up();
  const rolled = await strikes(page, 'p0') - n0;
  const want = 1 + (1000 - R.holdMs) * R.rate / 1000;
  expect(rolled).toBeGreaterThan(want * .55);
  expect(rolled).toBeLessThan(want * 1.4);
  await page.waitForTimeout(300);
  expect(await strikes(page, 'p0') - n0).toBe(rolled);                          // stops on release, no extra stroke
  watch.check();
});

test('PLAYING: two fingers at once, two-finger muffle, the ✋ button, the pedal glides a ringing drum', async ({page}) => {
  const watch = await room(page);
  const fire = (i, type, id) => page.locator(`.pr-drum[data-i="${i}"] .pr-head`).evaluate((el, [type, id]) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent(type, {pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: r.left + r.width * .8, clientY: r.top + r.height / 2, bubbles: true, cancelable: true}));
  }, [type, id]);
  // two drums at once: two-drum rolls
  await fire(0, 'pointerdown', 11); await fire(1, 'pointerdown', 12);
  await expect.poll(async () => (await P(page)).presses.filter(p => p.rolling).length).toBe(2);
  await fire(0, 'pointerup', 11); await fire(1, 'pointerup', 12);
  expect((await P(page)).presses.length).toBe(0);
  expect(await strikes(page, 'p0')).toBeGreaterThan(2);
  expect(await strikes(page, 'p1')).toBeGreaterThan(2);
  // two fingers on ONE drum within muffleMs = muffle
  await page.locator('.pr-drum[data-i="0"] .pr-head').evaluate(el => {        // both fingers at once (one call: no test-machine delay between them)
    const r = el.getBoundingClientRect();
    [21, 22].forEach(id => el.dispatchEvent(new PointerEvent('pointerdown', {pointerId: id, pointerType: 'touch', clientX: r.left + r.width * .8, clientY: r.top + r.height / 2, bubbles: true, cancelable: true})));
  });
  expect(await page.evaluate(() => Arcade.Timpani.test.ringing('p0'))).toBe(false);
  await fire(0, 'pointerup', 21); await fire(0, 'pointerup', 22);
  // ✋
  await fire(1, 'pointerdown', 31); await fire(1, 'pointerup', 31);
  expect(await page.evaluate(() => Arcade.Timpani.test.ringing('p1'))).toBe(true);
  await page.locator('.pr-hand[data-i="1"]').click();
  expect(await page.evaluate(() => Arcade.Timpani.test.ringing('p1'))).toBe(false);
  // the pedal while ringing: a glide, the same voice
  await fire(0, 'pointerdown', 41); await fire(0, 'pointerup', 41);
  const before = await page.evaluate(() => ({start: Arcade.Timpani.test.voiceStart('p0'), n: Arcade.Timpani.test.glides.length}));
  await page.evaluate(() => Arcade.PedalPoint.practice.setPedal(0, .9));
  const after = await page.evaluate(() => ({start: Arcade.Timpani.test.voiceStart('p0'), last: Arcade.Timpani.test.glides.slice(-1)[0], n: Arcade.Timpani.test.glides.length, f: Arcade.PedalPoint.practice.state().drums[0].freq}));
  expect(after.n).toBeGreaterThan(before.n);
  expect(after.start).toBe(before.start);
  expect(after.last.key).toBe('p0');
  expect(after.last.freq).toBeCloseTo(after.f, 6);
  watch.check();
});

test('KEYS: J K L ; (F G H J in Setup), a held key = a roll (repeat ignored), Shift = muffle, 1–4 + ↑/↓ = the pedal', async ({page}) => {
  const watch = await room(page);
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four'));
  for (const [k, i] of [['j', 0], ['k', 1], ['l', 2], [';', 3]]) {
    const n0 = await strikes(page, 'p' + i);
    await page.keyboard.press(k);
    expect(await strikes(page, 'p' + i)).toBe(n0 + 1);
  }
  // a held key: a roll; the key's repeat never adds strokes
  let n0 = await strikes(page, 'p0');
  await page.keyboard.down('j');
  await page.waitForTimeout(600);
  expect((await P(page)).presses[0].rolling).toBe(true);
  await page.keyboard.up('j');
  expect(await strikes(page, 'p0') - n0).toBeGreaterThan(3);
  // Shift + key = muffle
  await page.keyboard.press('k');
  expect(await page.evaluate(() => Arcade.Timpani.test.ringing('p1'))).toBe(true);
  await page.keyboard.press('Shift+K');
  expect(await page.evaluate(() => Arcade.Timpani.test.ringing('p1'))).toBe(false);
  // 3 selects the third drum; ↑ = its pedal (25 cents), Shift+↓ = the fine tuner
  const m0 = (await P(page)).drums[2].midi;
  await page.keyboard.press('3'); await page.keyboard.press('ArrowUp');
  let s = await P(page);
  expect(s.sel).toBe(2);
  expect((s.drums[2].midi - m0) * 100).toBeCloseTo(25, 3);
  await page.keyboard.press('Shift+ArrowDown');
  expect((await P(page)).drums[2].fine).toBeCloseTo(-2, 6);
  // F G H J
  await page.evaluate(() => { Arcade.PedalPoint.practice.openSetup(); });
  await page.locator('#prKeys [data-keys="fghj"]').click();
  await page.locator('#prSetupDone').click();
  n0 = await strikes(page, 'p0');
  await page.keyboard.press('f');
  expect(await strikes(page, 'p0')).toBe(n0 + 1);
  watch.check();
});

test('THE CLICK: the tempo, a one-bar count-in, the beat light', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prTempo').fill('120');
  await page.locator('#prClickBtn').click();
  await expect.poll(async () => (await P(page)).run && (await P(page)).run.log.length, {timeout: 5000}).toBeGreaterThan(5);
  const log = (await P(page)).run.log.filter(e => e.kind === 'click');
  log.slice(1, 5).forEach((e, k) => expect(e.time - log[k].time).toBeCloseTo(.5, 6));   // ♩ = 120
  const ev = await page.evaluate(() => { const s = Arcade.PedalPoint.practice.state(); return s.run.log.length; });
  expect(ev).toBeGreaterThan(5);
  await expect(page.locator('#prBeat')).toHaveClass(/on/);
  await page.locator('#prClickBtn').click();
  expect((await P(page)).click).toBe(false);
  watch.check();
});

/* ===== LOAD YOUR OWN SHEET MUSIC ===== */
async function pngOf(page, w = 800, h = 1000) {
  const b64 = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; for (let i = 0; i < 5; i++) x.fillRect(40, 100 + i * 20, w - 80, 2);
    return c.toDataURL('image/png').split(',')[1]; }, [w, h]);
  return Buffer.from(b64, 'base64');
}
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

test('SHEET MUSIC: an image loads, stays after a reload (IndexedDB), zooms, hides, is removed; no request carries it; not in the Backup Code', async ({page}) => {
  const watch = await room(page);
  const reqs = [];
  page.on('request', r => reqs.push({url: r.url(), method: r.method(), post: r.postData() || ''}));
  await page.locator('#prShow [data-show="sheet"]').click();
  await expect(page.locator('.pr-private')).toHaveText('Your music stays on this device.');
  const png = await pngOf(page);
  reqs.length = 0;
  await page.locator('#prFile').setInputFiles({name: 'my-etude-photo.png', mimeType: 'image/png', buffer: png});
  await expect(page.locator('#prView img')).toBeVisible();
  let s = await P(page);
  expect(s.sheet.type).toBe('image');
  expect(s.sheet.url).toMatch(/^blob:/);
  // NOTHING went anywhere: no outside host, no POST, no request naming the file
  expect(reqs.filter(r => !/^(http:\/\/127\.0\.0\.1|blob:|data:)/.test(r.url))).toEqual([]);
  expect(reqs.filter(r => r.method !== 'GET')).toEqual([]);
  expect(reqs.filter(r => /my-etude-photo/.test(r.url + r.post))).toEqual([]);
  // fit to the width, then + / −
  await expect.poll(async () => (await P(page)).sheet.zoom.fit).toBe(true);
  const fit = (await P(page)).sheet.zoom.s;
  const vw = await page.locator('#prView').evaluate(v => v.clientWidth);
  expect(fit * 800).toBeCloseTo(vw, 0);
  await page.locator('#prZoomIn').click();
  expect((await P(page)).sheet.zoom.s).toBeCloseTo(fit * 1.25, 6);
  await page.locator('#prFit').click();
  expect((await P(page)).sheet.zoom.s).toBeCloseTo(fit, 6);
  // not in the Backup Code (that's localStorage; the file is in IndexedDB)
  const backup = await page.evaluate(() => JSON.stringify(Arcade.store.exportAll()));
  expect(backup).not.toContain('my-etude-photo');
  expect(backup).not.toContain(png.toString('base64').slice(0, 40));
  // stays after a reload
  await page.reload();
  await expect(page.locator('#prView img')).toBeVisible();
  expect(await page.locator('#prSheetSel option').allTextContents()).toEqual(['my-etude-photo.png']);
  // HIDE MUSIC: the drums get the screen
  await page.locator('#prHide').click();
  await expect(page.locator('#prScore')).toBeHidden();
  // REMOVE
  await page.locator('#prShow [data-show="sheet"]').click();
  await page.locator('#prRemove').click();
  await page.getByRole('button', {name: 'Remove'}).last().click();
  await expect(page.locator('#prView img')).toHaveCount(0);
  expect(await page.evaluate(() => Arcade.PedalPoint.practice.SheetDB.list())).toEqual([]);
  watch.check();
});

test('SHEET MUSIC: a browser that can\'t keep the file still shows it for this visit (and says so)', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prShow [data-show="sheet"]').click();
  await page.evaluate(() => { Arcade.PedalPoint.practice.SheetDB.add = () => Promise.reject(new Error('storage refused')); });
  await page.locator('#prFile').setInputFiles({name: 'just-now.png', mimeType: 'image/png', buffer: await pngOf(page, 300, 200)});
  await expect(page.locator('#prView img')).toBeVisible();
  await expect(page.locator('.ui-toast', {hasText: 'here for now'})).toBeVisible();
  expect(await page.locator('#prSheetSel option').allTextContents()).toEqual(['just-now.png']);
  watch.check();
});

test('SHEET MUSIC: a PDF opens in the browser\'s own viewer from a blob: URL, or the tip shows where it can\'t', async ({page, browserName}) => {
  const watch = await room(page);
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.locator('#prShow [data-show="sheet"]').click();
  await page.locator('#prFile').setInputFiles({name: 'audition.pdf', mimeType: 'application/pdf', buffer: PDF});
  await expect(page.locator('#prView iframe.pr-pdf')).toHaveCount(1);
  const r = await page.evaluate(() => ({src: document.querySelector('#prView iframe').src, viewer: navigator.pdfViewerEnabled, tip: !document.getElementById('prPdfTip').hidden}));
  expect(r.src).toMatch(/^blob:/);
  // the tip shows exactly where the browser can't show the PDF well (iPad Safari, or no PDF viewer)
  if (browserName === 'chromium' && r.viewer !== false) expect(r.tip).toBe(false);
  if (r.viewer === false) expect(r.tip).toBe(true);
  expect(reqs.filter(u => !/^(http:\/\/127\.0\.0\.1|blob:|data:)/.test(u))).toEqual([]);
  watch.check();
});

/* ===== THE ETUDES ===== */
test('ETUDES: all eleven parse, every bar adds up; the first four (saved ids) unchanged: C3 and F3, their rolls / releases / accents', async ({page}) => {
  const watch = await room(page);
  const r = await page.evaluate(() => Arcade.PPEtudes.ETUDES.map(et => { const e = Arcade.PPEtudes.parse(et);
    return {id: et.id, errors: e.errors, measures: e.measures, total: e.total, per: e.parsed.meter.per, pitches: [...new Set(e.notes.filter(n => !n.rest).map(n => n.midi))].sort(),
      rolls: e.notes.filter(n => n.roll).length, releases: e.slurs.length, accents: e.notes.filter(n => n.accent).length}; }));
  expect(r.map(x => x.id)).toEqual(['warm-up', 'dotted', 'roll-release', 'big-finish', 'three-walk', 'waltz', 'leaps', 'eb-march', 'fanfare', 'rolling-hills', 'grand-finale']);
  expect(r.length).toBe(await page.evaluate(() => window.PP_ETUDES.length));
  r.forEach(x => { expect(x.errors, x.id).toEqual([]); expect(x.total, x.id).toBe(x.measures * x.per); });
  r.slice(0, 4).forEach(x => { expect(x.measures).toBe(8); expect(x.pitches).toEqual([48, 53]); });
  // the first four's music is exactly as it was (their ids are saved: each one's best %)
  const music = await page.evaluate(() => window.PP_ETUDES.slice(0, 4).map(e => [e.id, e.time, e.tempo, e.music.length, e.music.slice(0, 24), !!e.setup]));
  expect(music).toEqual([['warm-up', '4/4', 80, 189, 'C:q F:q C:q F:q | C:e C:', false], ['dotted', '4/4', 76, 191, 'C:q. C:e F:h | F:e. F:s ', false],
    ['roll-release', '4/4', 72, 109, 'C:h* F:h* | C:h*_ F:q -:', false], ['big-finish', '4/4', 88, 189, 'C:e F:e C:e F:e C:q F:q ', false]]);
  expect(r[2]).toMatchObject({rolls: 10, releases: 5, accents: 1});
  expect(r[3]).toMatchObject({rolls: 4, releases: 1, accents: 3});
  // a bar that doesn't add up is caught
  const bad = await page.evaluate(() => Arcade.PPEtudes.parse({id: 'x', time: '4/4', tempo: 80, music: 'C:q F:q C:q | F:w'}).errors);
  expect(bad.length).toBeGreaterThan(0);
  watch.check();
});

test('HEAR IT: the right strokes on the right drums at the tempo; rolls as fast strokes; the rit. slows bar 7; the tempo slider scales it', async ({page}) => {
  const watch = await room(page);
  const r = await page.evaluate(() => {
    const p = Arcade.PedalPoint.practice, w = p.plan('warm-up'), w50 = p.plan('warm-up', {pct: .5}), rr = p.plan('roll-release'), bf = p.plan('big-finish');
    const bar = (pl, m) => pl.notes.filter(n => Arcade.PPEtudes.parse(Arcade.PPEtudes.byId('big-finish')).notes[n.n].measure === m);
    const gaps = m => { const ns = bar(bf, m); return ns.slice(1).map((n, k) => n.time - ns[k].time); };
    return {first: w.strokes.slice(0, 4).map(s => [+s.time.toFixed(4), s.drum]), endS: w.endS, end50: w50.endS, t50: w50.strokes[1].time,
      roll0: rr.strokes.filter(s => s.n === 0).length, rollGap: rr.strokes[1].time - rr.strokes[0].time, g5: gaps(4), g7: gaps(6), g8: gaps(7)};
  });
  expect(r.first).toEqual([[0, 0], [.75, 1], [1.5, 0], [2.25, 1]]);            // ♩ = 80: C on the 26", F on the 23"
  expect(r.endS).toBeCloseTo(24, 6);
  expect(r.end50).toBeCloseTo(48, 6);
  expect(r.t50).toBeCloseTo(1.5, 6);
  const R = await page.evaluate(() => Arcade.Timpani.ROLL);
  expect(r.rollGap).toBeCloseTo(1 / R.rate, 6);
  expect(r.roll0).toBeGreaterThan(20);                                          // a half-note roll at ♩ = 72: ~1.6 s of strokes
  // the rit.: bar 7's eighths get longer and longer, bar 8 stays slow
  r.g5.forEach(g => expect(g).toBeCloseTo(60 / 88 / 2, 6));
  for (let k = 1; k < r.g7.length; k++) expect(r.g7[k]).toBeGreaterThan(r.g7[k - 1]);
  expect(r.g7[r.g7.length - 1]).toBeGreaterThan(60 / 88 / 2 * 1.2);
  expect(r.g8[0]).toBeCloseTo(60 / (88 * .75), 3);
  // and it plays: the scheduler's log has the strokes, the notes light
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('warm-up');
  await page.locator('#prHear').click();
  await expect.poll(async () => ((await P(page)).run || {log: []}).log.filter(e => e.kind === 'stroke').length, {timeout: 5000}).toBeGreaterThan(1);
  await expect(page.locator('#prStaff g.rn.pp-now')).toHaveCount(1, {timeout: 5000});
  await page.locator('#prStop').click();
  watch.check();
});

test('PLAY ALONG: on time / late / wrong drum / missed (the shared RhythmJudge), roll notes need a hold, the best % is saved', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('warm-up');
  await page.locator('#prEClick').click();                                       // (click off)
  // bar 1 only: C F C F (quarters at ♩ = 80)
  await page.locator('#prFrom').selectOption('0'); await page.locator('#prTo').selectOption('0');
  await page.locator('#prAlong').click();
  await page.evaluate(() => { const p = Arcade.PedalPoint.practice, pl = p.plan('warm-up', {from: 0, to: 0});
    p.attack(pl.notes[0].drum, pl.notes[0].time + .01);                         // on time
    p.attack(pl.notes[1].drum, pl.notes[1].time + .16);                         // late
    p.attack(1 - pl.notes[2].drum, pl.notes[2].time);                           // the wrong drum
    p.endNow(); });                                                             // (note 4: missed)
  let s = await P(page);
  expect(s.run.J.res.map(r => r.kind)).toEqual(['ok', 'off', 'wrong', 'miss']);
  expect(s.run.J.acc).toBe(Math.round(100 * (1 + .5) / 4));
  await expect(page.locator('#prStaff g.rn.r-ok')).toHaveCount(1);
  await expect(page.locator('#prStaff g.rn.r-miss')).toHaveCount(1);
  expect(s.etudesBest['warm-up']).toBeUndefined();                              // part of the etude: not a best
  // roll notes: a hold covering most of the note
  await page.locator('#prEtudeSel').selectOption('roll-release');
  await page.locator('#prFrom').selectOption('0'); await page.locator('#prTo').selectOption('0');
  await page.locator('#prAlong').click();
  await page.evaluate(() => { const p = Arcade.PedalPoint.practice, pl = p.plan('roll-release', {from: 0, to: 0}), n = pl.notes;
    p.attack(n[0].drum, n[0].time, (n[0].end - n[0].time) * .9);                // held through: a roll
    p.attack(n[1].drum, n[1].time, .1);                                         // one stroke: too short
    p.endNow(); });
  s = await P(page);
  expect(s.run.J.res.map(r => r.kind)).toEqual(['ok', 'short']);
  // the whole etude, every note on time: 100 %, saved as the best
  await page.locator('#prEtudeSel').selectOption('dotted');
  await page.locator('#prAlong').click();
  await page.evaluate(() => { const p = Arcade.PedalPoint.practice, pl = p.plan('dotted');
    pl.notes.forEach(n => p.attack(n.drum, n.time + .005, n.roll ? n.end - n.time : 0)); p.endNow(); });
  s = await P(page);
  expect(s.run.J.acc).toBe(100);
  expect(s.etudesBest.dotted).toEqual({best: 100, pct: 100});
  expect(await page.evaluate(() => Arcade.store.gameData('pedal-point').etudes.dotted.best)).toBe(100);
  watch.check();
});

test('LOOP repeats the bars; "Set up C & F for me"; the out-of-tune badge at more than 25 cents', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('warm-up');
  await page.locator('#prFrom').selectOption('0'); await page.locator('#prTo').selectOption('0');
  await page.locator('#prLoop').click();
  await page.locator('#prHear').click();
  await page.evaluate(() => Arcade.PedalPoint.practice.endNow());
  await expect.poll(async () => (await P(page)).passes).toBe(1);
  await expect.poll(async () => ((await P(page)).run || {}).kind).toBe('hear');   // playing those bars again
  await page.locator('#prStop').click();
  // one drum (C3 only): the etude needs F3 too
  await page.evaluate(() => Arcade.PedalPoint.practice.setCount(1));
  await expect(page.locator('#prNeed')).toBeVisible();
  await expect(page.locator('#prNeedText')).toContainText('F3');
  await page.locator('#prCF').click();
  await expect(page.locator('#prNeed')).toBeHidden();
  expect((await P(page)).drums.map(d => [d.id, Math.round(d.midi)])).toEqual([['26', 48], ['23', 53]]);
  // 20 cents off: fine; 30 cents off: "out of tune"
  await page.evaluate(() => Arcade.PedalPoint.practice.setFine(1, 20));
  await expect(page.locator('#prTune1')).toBeHidden();
  await page.evaluate(() => Arcade.PedalPoint.practice.setFine(1, 30));
  await expect(page.locator('#prTune1')).toBeVisible();
  await expect(page.locator('#prTune1')).toContainText('+30');
  watch.check();
});

test('THE STAFF: the bass-clef mode draws C3 in the 2nd space and F3 on the 4th line, roll slashes, slurs, accents, dynamics', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('roll-release');
  const r = await page.evaluate(() => {
    const st = document.getElementById('prStaff'), svg = st.querySelector('svg');
    const lines = [...svg.querySelectorAll('line.rs-line')].map(l => +l.getAttribute('y1'));
    const head = n => +st.querySelector(`g.rn[data-n="${n}"] ellipse`).getAttribute('cy');
    return {lines, c3: head(0), f3: head(1), slashes: st.querySelectorAll('g.rn[data-n="0"] path.rs-slash').length, slurs: st.querySelectorAll('path.rs-slur').length,
      accents: st.querySelectorAll('path.rs-acc').length, dyn: [...st.querySelectorAll('text.rs-dyn,text.rs-text')].map(t => t.textContent), clef: st.querySelectorAll('text.rs-clef').length};
  });
  expect(r.lines).toEqual([50, 60, 70, 80, 90]);                               // five lines (bottom = G2 at 90)
  expect(r.c3).toBe(75);                                                         // between the 1st and 2nd lines up: the 2nd space
  expect(r.f3).toBe(60);                                                         // the 4th line
  expect(r.slashes).toBe(3);
  expect(r.slurs).toBe(5);
  expect(r.accents).toBe(1);
  expect(r.dyn).toEqual(['p', 'cresc.', 'mf', 'p']);
  expect(r.clef).toBeGreaterThan(0);
  watch.check();
});

test('NO STARS from practice, nothing in `games` progress; the practice-time log counts real playing', async ({page}) => {
  const watch = await room(page);
  for (let k = 0; k < 6; k++) { await page.keyboard.press('j'); await page.waitForTimeout(300); }
  await page.evaluate(() => Arcade.PedalPoint.practice.flush());
  const r = await page.evaluate(() => ({games: (Arcade.store.exportAll().games || {})['pedal-point'] || null, log: Arcade.store.gameData('pedal-point').playS || {}, day: Arcade.store.dayKey()}));
  expect(Object.values(r.games || {}).flatMap(x => Object.keys(x))).toEqual([]);   // no level saved (the level select's read may make an empty {})
  expect(await page.evaluate(() => Arcade.store.allStars('all', 'pedal-point'))).toBe(0);
  expect(r.log[r.day]).toBeGreaterThan(1);
  watch.check();
});

/* ===== THE SEMICIRCLE: the drums around the player's seat, the pedals pointing at it ===== */
const ARC_OF = page => page.evaluate(() => Arcade.PedalPoint.practice.arc());
/* plain geometry (the test's own, not the game's): a pedal = a rectangle from toe to heel, w wide */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const corners = d => { const t = [d.toe.x, d.toe.y], h = [d.heel.x, d.heel.y], ax = sub(h, t), L = Math.hypot(...ax), n = [-ax[1] / L * d.w / 2, ax[0] / L * d.w / 2];
  return [[t[0] + n[0], t[1] + n[1]], [h[0] + n[0], h[1] + n[1]], [h[0] - n[0], h[1] - n[1]], [t[0] - n[0], t[1] - n[1]]]; };
const square = (c, sz) => [[c.x - sz / 2, c.y - sz / 2], [c.x + sz / 2, c.y - sz / 2], [c.x + sz / 2, c.y + sz / 2], [c.x - sz / 2, c.y + sz / 2]];
/** do two convex polygons overlap (separating axes)? */
function polysOverlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const e = sub(P[(i + 1) % P.length], P[i]), n = [-e[1], e[0]];
    const pr = Q => Q.map(q => q[0] * n[0] + q[1] * n[1]);
    const a = pr(A), b = pr(B);
    if (Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a)) return false;
  }
  return true;
}
/** distance from a point to a convex polygon (0 inside) */
function polyDist(p, P) {
  let inside = true, best = Infinity;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], e = sub(b, a), t = Math.max(0, Math.min(1, ((p[0] - a[0]) * e[0] + (p[1] - a[1]) * e[1]) / (e[0] ** 2 + e[1] ** 2)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * e[0], p[1] - a[1] - t * e[1]));
    if (e[0] * (p[1] - a[1]) - e[1] * (p[0] - a[0]) < 0) inside = false;
  }
  const ccw = P.every((q, i) => { const a = P[i], b = P[(i + 1) % P.length], c = P[(i + 2) % P.length]; return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) >= 0; });
  return (ccw ? inside : P.every((a, i) => { const b = P[(i + 1) % P.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0; })) ? 0 : best;
}
/** every rule of the picture: on the circle, the order, the span, no overlap, inside the box, the pedals' aim, sizes */
function checkArc(a, ARC, {eu = false} = {}) {
  const bad = [], n = a.drums.length, seat = [a.seat.x, a.seat.y];
  const dist = a.drums.map(d => Math.hypot(d.c.x - seat[0], d.c.y - seat[1]));
  if (Math.max(...dist) - Math.min(...dist) > 1) bad.push(`not on one circle: ${dist.map(Math.round)}`);
  const xs = a.drums.map(d => d.c.x), ids = a.drums.map(d => +d.id);
  for (let k = 1; k < n; k++) {
    if (!(xs[k] > xs[k - 1])) bad.push('not left to right');
    if (eu ? !(ids[k] > ids[k - 1]) : !(ids[k] < ids[k - 1])) bad.push(`order ${ids} (${eu ? 'European' : 'US'})`);
  }
  const ang = d => Math.atan2(d.c.x - seat[0], seat[1] - d.c.y) * 180 / Math.PI;
  if (n === 1 && Math.abs(ang(a.drums[0])) > .5) bad.push('one drum is not straight ahead');
  if (n > 1) {
    const span = ang(a.drums[n - 1]) - ang(a.drums[0]);
    if (!a.limited && Math.abs(span - ARC.span[n]) > 3) bad.push(`span ${span.toFixed(1)}° (want ${ARC.span[n]}°)`);
    if (Math.abs(span - a.span) > 1) bad.push(`span ${span.toFixed(1)}° vs the layout's ${a.span}`);
    if (Math.abs(ang(a.drums[0]) + ang(a.drums[n - 1])) > 1) bad.push('the fan is not centered on straight ahead');
  }
  for (let k = 1; k < n; k++) {
    const p = a.drums[k - 1], q = a.drums[k], gap = Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y) - p.r - q.r;
    if (gap < .5 * ARC.gap * ARC.shrink * a.s) bad.push(`rims ${gap.toFixed(1)} px apart`);
  }
  const ratio = a.drums.map(d => d.r / +d.id), r0 = ratio[0];
  if (ratio.some(x => Math.abs(x / r0 - 1) > .02)) bad.push(`heads not in proportion: ${a.drums.map(d => Math.round(d.r * 2))}`);
  a.drums.forEach(d => {
    const P = corners(d), axis = Math.atan2(d.heel.y - d.toe.y, d.heel.x - d.toe.x), toSeat = Math.atan2(seat[1] - d.toe.y, seat[0] - d.toe.x);
    if (Math.abs(((axis - toSeat) * 180 / Math.PI + 540) % 360 - 180) > 2) bad.push(`the ${d.id}" pedal doesn't point at the seat`);
    if (polyDist(seat, P) < a.seat.r) bad.push(`the ${d.id}" pedal touches the seat`);
    a.drums.forEach(e => {
      if (e !== d && polyDist([e.c.x, e.c.y], P) < e.r) bad.push(`the ${d.id}" pedal touches the ${e.id}" head`);
      if (e !== d && polysOverlap(P, corners(e))) bad.push(`the ${d.id}" and ${e.id}" pedals overlap`);
      if (polysOverlap(P, square(e.hand, e.hand.size))) bad.push(`the ${d.id}" pedal touches the ${e.id}" ✋`);
      if (e !== d && polysOverlap(square(d.hand, d.hand.size), square(e.hand, e.hand.size))) bad.push(`✋ ${d.id}" and ${e.id}" overlap`);
      if (polyDist([e.c.x, e.c.y], square(d.hand, d.hand.size)) < e.r) bad.push(`the ${d.id}" ✋ touches the ${e.id}" head`);
    });
    const B = a.box, pts = P.concat(square(d.hand, d.hand.size), [[d.c.x - d.r, d.c.y - d.r], [d.c.x + d.r, d.c.y + d.r]]);
    if (pts.some(q => q[0] < B.x - .5 || q[0] > B.x + B.w + .5 || q[1] < B.y - .5 || q[1] > B.y + B.h + .5)) bad.push(`the ${d.id}" drum's pieces leave #prDrums`);
    if (d.w < 44 - .01 || d.l < 90 - .01) bad.push(`the ${d.id}" pedal is ${d.w.toFixed(0)} × ${d.l.toFixed(0)} px`);
    if (d.hand.size < 44) bad.push('✋ under 44 px');
  });
  return bad;
}

test('THE SEMICIRCLE: 1–4 drums on one circle around the seat, low to high (or European), the span, no overlap, pedals aimed at the seat, real sizes', {tag: '@quick'}, async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  const watch = await room(page);
  const ARC = await page.evaluate(() => Arcade.PedalPoint.practice.ARC);
  for (const order of ['us', 'eu']) {
    await page.evaluate(o => { Arcade.PedalPoint.practice.state(); Arcade.store.gameData('pedal-point').practice.order = o; }, order);
    for (const n of [1, 2, 3, 4]) {
      await page.evaluate(n => Arcade.PedalPoint.practice.setCount(n), n);
      const a = await ARC_OF(page);
      expect(a.drums.length).toBe(n);
      expect(checkArc(a, ARC, {eu: order === 'eu'}), `${n} drums, ${order}`).toEqual([]);
      // what's drawn is that picture: the rims' boxes are the heads' circles
      const rims = await page.locator('.pr-rim').evaluateAll(cs => cs.map(c => { const r = c.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2}; }));
      rims.forEach((r, k) => { expect(Math.abs(r.x - a.drums[k].c.x)).toBeLessThan(1); expect(Math.abs(r.y - a.drums[k].c.y)).toBeLessThan(1); expect(Math.abs(r.r - a.drums[k].r)).toBeLessThan(1); });
      if (n === 4 && order === 'us') expect(a.span).toBeGreaterThan(90);     // the outer drums curve round toward the player's sides
    }
  }
  watch.check();
});

test('THE SEMICIRCLE: a pedal drags along its own angle; the head is round (a corner plays nothing), the spot strokes, the center thuds', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  const watch = await room(page);
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four'));
  const a = await ARC_OF(page);
  for (const v of [0, 3]) {                                                       // an outer drum each side: steep pedals
    const d = a.drums[v];
    expect(d.track).toBeGreaterThan(50); expect(d.track).toBeLessThan(110);         // about today's track (≈ 58 px)
    const mid = {x: (d.toe.x + d.heel.x) / 2, y: (d.toe.y + d.heel.y) / 2}, toward = [-d.u[0], -d.u[1]], across = [-d.u[1], d.u[0]];
    const drag = async dir => {
      await page.evaluate(i => Arcade.PedalPoint.practice.setPedal(i, .2), d.i);   // room to move up
      const m0 = (await P(page)).drums[d.i].midi;
      await page.mouse.move(mid.x, mid.y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) await page.mouse.move(mid.x + dir[0] * 5 * k, mid.y + dir[1] * 5 * k);
      await page.mouse.up();
      return ((await P(page)).drums[d.i].midi - m0) * 100;
    };
    const span = (await page.evaluate(id => Arcade.PPDrums.byId(id).span, d.id));
    const along = await drag(toward);
    // 40 px toward the drum = toe down = higher (within 2 %: WebKit rounds a diagonal drag's points to whole pixels)
    expect(Math.abs(along / (40 / d.track * span) - 1)).toBeLessThan(.02);
    expect(Math.abs(await drag(across))).toBeLessThan(along * .1);                 // across the pedal: almost nothing
  }
  // the head: a press in its box's corner (outside the circle) plays nothing; the spot strokes; the center thuds
  const d = a.drums[1], n0 = await page.evaluate(() => Arcade.Timpani.test.history.filter(h => h.kind === 'strike').length);
  const cornerX = d.c.x + d.r * .9, cornerY = d.c.y - d.r * .9;                    // inside the box, outside the circle
  expect(await page.evaluate(([x, y]) => !!(document.elementFromPoint(x, y) || {}).closest?.('.pr-head'), [cornerX, cornerY])).toBe(false);
  await page.mouse.click(cornerX, cornerY);
  expect(await page.evaluate(() => Arcade.Timpani.test.history.filter(h => h.kind === 'strike').length)).toBe(n0);
  await page.mouse.click(d.c.x + d.r * .7, d.c.y);
  let h = await page.evaluate(() => Arcade.Timpani.test.history.filter(x => x.kind === 'strike').slice(-1)[0]);
  expect(h).toMatchObject({key: 'p' + d.i, thud: false, played: true});
  await page.mouse.click(d.c.x, d.c.y);
  h = await page.evaluate(() => Arcade.Timpani.test.history.filter(x => x.kind === 'strike').slice(-1)[0]);
  expect(h).toMatchObject({key: 'p' + d.i, thud: true});
  watch.check();
});

/* ===== LAYOUTS ===== */
for (const [name, vp, min, minMusic] of [['phone', {width: 390, height: 844}, 60, 60], ['phone landscape', {width: 844, height: 390}, 60, 60],
  ['iPad portrait', {width: 768, height: 1024}, 120, 88], ['iPad landscape', {width: 1024, height: 768}, 120, 88], ['Chromebook', {width: 1366, height: 768}, 120, 88]]) {
  test(`LAYOUT (${name}): 1–4 drums in the semicircle, targets ≥ 44 px, nothing overlapping or off the screen, with and without music`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await room(page);
    const ARC = await page.evaluate(() => Arcade.PedalPoint.practice.ARC);
    const targets = async () => {
      const hands = await page.locator('.pr-hand').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }));
      hands.forEach(([w, h]) => { expect(w).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); });
    };
    for (const n of [1, 2, 3]) {
      await page.evaluate(n => Arcade.PedalPoint.practice.setCount(n), n);
      expect(checkArc(await ARC_OF(page), ARC), `${n} drums`).toEqual([]);
      await targets();
      expect(await tooWide(page)).toEqual([]);
    }
    await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four'));
    const heads = () => page.locator('.pr-head').evaluateAll(hs => hs.map(h => { const r = h.querySelector('.pr-rim').getBoundingClientRect(); return {w: r.width, l: r.left, r: r.right}; }));
    let hs = await heads();
    hs.forEach(h => { expect(h.l).toBeGreaterThanOrEqual(0); expect(h.r).toBeLessThanOrEqual(vp.width); });
    expect(Math.max(...hs.map(h => h.w))).toBeGreaterThanOrEqual(Math.min(min, 64));
    expect(checkArc(await ARC_OF(page), ARC), '4 drums').toEqual([]);
    await targets();
    expect(await tooWide(page)).toEqual([]);
    const h0 = (await ARC_OF(page)).box.h;
    for (const show of ['etude', 'sheet']) {
      await page.evaluate(m => Arcade.PedalPoint.practice.setShow(m), show);
      await expect.poll(async () => (await ARC_OF(page)).box.h).toBeLessThanOrEqual(h0);      // the music takes room: the drums shrink (never below a finger's size)
      hs = await heads();
      expect(Math.max(...hs.map(h => h.w))).toBeGreaterThanOrEqual(Math.min(minMusic, min, 64));
      expect(checkArc(await ARC_OF(page), ARC), `4 drums with ${show}`).toEqual([]);
      await targets();
      expect(await tooWide(page)).toEqual([]);
    }
    watch.check();
  });
}

/* GALLERY=1: the semicircle for Mr. Graham to compare with his diagram (1–4 drums, US and European, iPad landscape and
   a phone) */
test('gallery: docs/gallery/pedal-point-semicircle.png', async ({page, browserName}) => {
  test.skip(!process.env.GALLERY || browserName !== 'chromium', 'GALLERY=1 only');
  const shots = [];
  for (const [label, vp] of [['iPad landscape', {width: 1024, height: 768}], ['Phone', {width: 390, height: 844}]]) {
    await page.setViewportSize(vp);
    await room(page);
    for (const order of ['us', 'eu']) for (const n of [1, 2, 3, 4]) {
      if (order === 'eu' && n === 1) continue;
      await page.evaluate(([o, n]) => { const p = Arcade.PedalPoint.practice; Arcade.store.gameData('pedal-point').practice.order = o; n === 4 ? p.applyPreset('four') : p.setCount(n); }, [order, n]);
      await page.waitForTimeout(100);
      shots.push({label: `${label}: ${n} drum${n > 1 ? 's' : ''}${n > 1 ? (order === 'us' ? ' (low on the left)' : ' (European)') : ''}`, w: label === 'Phone' ? 360 : 600,
        b64: (await page.locator('#prStage').screenshot()).toString('base64')});
    }
  }
  await page.setViewportSize({width: 1280, height: 900});
  await page.setContent(`<body style="margin:0;padding:16px;background:#14101f;color:#eee;font:14px system-ui"><h2 style="margin:0 0 12px">Pedal Point: the Practice Room's semicircle</h2>
    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">${shots.map(s => `<figure style="margin:0;width:${s.w}px"><img style="width:100%" src="data:image/png;base64,${s.b64}"><figcaption>${s.label}</figcaption></figure>`).join('')}</div></body>`);
  await page.screenshot({path: require('path').join(__dirname, '..', 'docs', 'gallery', 'pedal-point-semicircle.png'), fullPage: true});
});

/* GALLERY=1: the Practice Room for Mr. Graham's review (2 and 4 drums, an etude mid-play-along, a loaded image) */
test('gallery: docs/gallery/pedal-point-practice.png', async ({page, browserName}) => {
  test.skip(!process.env.GALLERY || browserName !== 'chromium', 'GALLERY=1 only');
  await page.setViewportSize({width: 1024, height: 768});
  await room(page);
  const shots = [];
  const grab = async label => shots.push({label, b64: (await page.screenshot()).toString('base64')});
  await grab('2 drums (C & F)');
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four')); await grab('4 drums');
  for (const id of await page.evaluate(() => window.PP_ETUDES.map(e => e.id))) {
    await page.evaluate(id => { const p = Arcade.PedalPoint.practice; p.applySetup(p.setupOf(p.etudes.find(e => e.etude.id === id))); p.setShow('etude'); p.showEtude(id); }, id);
    await page.locator('#prStaff').screenshot().then(b => shots.push({label: 'Etude: ' + id, b64: b.toString('base64')}));
  }
  await page.evaluate(() => { const p = Arcade.PedalPoint.practice; p.showEtude('big-finish'); });
  await page.locator('#prAlong').click(); await page.waitForTimeout(3600); await grab('Big Finish, mid-play-along');
  await page.evaluate(() => Arcade.PedalPoint.practice.stop());
  await page.locator('#prShow [data-show="sheet"]').click();
  await page.locator('#prFile').setInputFiles({name: 'my-music.png', mimeType: 'image/png', buffer: await pngOf(page, 1200, 900)});
  await page.waitForTimeout(300); await grab('My music: a loaded image');
  await page.setContent(`<body style="margin:0;background:#111;color:#eee;font:16px sans-serif">${shots.map(s => `<h2 style="margin:12px">${s.label}</h2><img style="display:block;max-width:1024px" src="data:image/png;base64,${s.b64}">`).join('')}</body>`);
  await page.screenshot({path: require('path').join(__dirname, '..', 'docs', 'gallery', 'pedal-point-practice.png'), fullPage: true});
});

test('THE RECORDED DRUMS in the Practice Room: a held roll alternates takes and overlaps; p / f pick the soft / loud takes; a scheduled stroke\'s hit lands on its time', async ({page}) => {
  const watch = await room(page, device('trumpet', {gameData: {'pedal-point': {drumSound: 'samples'}}}));
  expect(await page.evaluate(() => [Arcade.Timpani.engine(), Arcade.Timpani.test.fakeBuffers()])).toEqual(['samples', true]);   // made-up takes: any browser
  const h0 = await page.evaluate(() => Arcade.Timpani.test.history.length);
  await page.keyboard.down('j');
  await page.waitForTimeout(700);
  await page.keyboard.up('j');
  const roll = await page.evaluate(n => Arcade.Timpani.test.history.slice(n).filter(h => h.kind === 'strike' && h.played), h0);
  expect(roll.length).toBeGreaterThan(5);
  roll.forEach(h => expect(h.engine).toBe('samples'));
  for (let k = 1; k < roll.length; k++) expect(roll[k].file, `roll stroke ${k + 1} repeats a take`).not.toBe(roll[k - 1].file);
  expect(Math.max(...roll.map(h => h.ringing))).toBeGreaterThan(2);    // the strokes ring on under each other: one sustained tone
  expect(Math.max(...roll.map(h => h.ringing))).toBeLessThanOrEqual(await page.evaluate(() => Arcade.Timpani.SAMPLES.MAX_RING));
  // the dynamics pick the layer
  const layers = await page.evaluate(() => {
    const p = Arcade.PedalPoint.practice, T = Arcade.Timpani, out = {};
    for (const d of ['p', 'mf', 'f']) { p.setDyn(d); p.stroke(0); out[d] = T.test.take('p0').layer; }
    return out;
  });
  expect(layers).toEqual({p: 'soft', mf: 'mid', f: 'loud'});
  // a stroke scheduled on the audio clock (HEAR IT, PLAY ALONG): the take starts 2 ms early, 8 ms into its file
  const s = await page.evaluate(() => {
    const T = Arcade.Timpani, ctx = Arcade.Sfx.output().ctx, at = ctx.currentTime + 0.5;
    T.strike('p1', 174.61, {at, layer: true, dyn: .68});
    const h = T.test.history[T.test.history.length - 1];
    return {at, start: h.start, offset: h.offset, hitAt: h.start + (0.010 - h.offset), lead: T.LEAD_S};
  });
  expect(s.start).toBeCloseTo(s.at - .002, 9);
  expect(s.offset).toBeCloseTo(.008, 9);
  expect(s.hitAt).toBeCloseTo(s.at, 9);                                  // the hit (10 ms into the file) lands on the time
  watch.check();
});

/* ===== THE 3- AND 4-DRUM ETUDES: setups, SET UP … FOR ME, accidentals, the tuning line, the list ===== */
test('NEW ETUDES: each setup holds exactly its notes, in range; SET UP … FOR ME tunes it (every pitch on its own drum at 0 cents, no badge, no offer)', async ({page}) => {
  const watch = await room(page);
  const list = await page.evaluate(() => window.PP_ETUDES.filter(e => e.setup).map(e => {
    const p = Arcade.PPEtudes.parse(e), D = Arcade.PPDrums;
    return {id: e.id, pitches: [...new Set(p.notes.filter(n => !n.rest).map(n => n.midi))].sort((a, b) => a - b),
      setup: e.setup.map(([d, n]) => ({d, m: D.midiOf(n), lo: D.byId(d).lowMidi, hi: D.byId(d).highMidi}))};
  }));
  expect(list.length).toBe(7);
  for (const e of list) {
    expect(e.pitches, e.id).toEqual(e.setup.map(x => x.m).sort((a, b) => a - b));
    e.setup.forEach(x => { expect(x.m, `${e.id} ${x.d}"`).toBeGreaterThanOrEqual(x.lo); expect(x.m).toBeLessThanOrEqual(x.hi); });
    await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('cf'));
    await page.evaluate(id => { const p = Arcade.PedalPoint.practice; p.setShow('etude'); p.showEtude(id); }, e.id);
    await expect(page.locator('#prNeed')).toBeVisible();
    await page.locator('#prCF').click();
    await expect(page.locator('#prNeed')).toBeHidden();
    const s = await P(page);
    expect(s.drums.map(d => [d.id, Math.round(d.midi * 100) / 100]), e.id).toEqual(e.setup.map(x => [x.d, x.m]));
    const map = await page.evaluate(id => Arcade.PedalPoint.practice.assign(id), e.id);
    e.pitches.forEach(m => { const i = map[m]; expect(i, `${e.id} ${m}`).not.toBeUndefined(); expect(Math.abs(s.drums[i].midi - m) * 100).toBeLessThan(.01); });
    expect(new Set(Object.values(map)).size).toBe(e.pitches.length);
    expect((await P(page)).badges).toEqual({off: {}, missing: []});
  }
  watch.check();
});

test('NEW ETUDES: 2 drums on C & F, Three-Drum Walk says it needs 3 drums; SET UP B♭ · C · F FOR ME sets up 3 drums; the list shows drum counts and what each teaches', async ({page}) => {
  const watch = await room(page);
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('cf'));
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('three-walk');
  await expect(page.locator('#prNeedText')).toHaveText('This etude needs 3 drums: B♭2, C3, F3. Tune them yourself (good practice!), or:');
  await expect(page.locator('#prCF')).toHaveText('Set up B♭ · C · F for me');
  await expect(page.locator('#prAbout')).toHaveText('moving to the next drum over, both ways');
  await page.locator('#prCF').click();
  expect((await P(page)).drums.map(d => [d.id, Math.round(d.midi)])).toEqual([['29', 46], ['26', 48], ['23', 53]]);
  await expect(page.locator('#prDrums .pr-drum')).toHaveCount(3);                  // the semicircle drawn again
  expect(await page.evaluate(() => Arcade.store.gameData('pedal-point').practice.drums.length)).toBe(3);   // saved
  // a different setup: E♭ on the 26", G on the 23"
  await page.locator('#prEtudeSel').selectOption('eb-march');
  await expect(page.locator('#prNeedText')).toHaveText('This etude needs E♭3 and G3 on your drums. Tune them yourself (good practice!), or:');
  await expect(page.locator('#prCF')).toHaveText('Set up B♭ · E♭ · G for me');
  await page.locator('#prEtudeSel').selectOption('fanfare');
  await expect(page.locator('#prCF')).toHaveText('Set up F · B♭ · C · F for me');
  const labels = await page.locator('#prEtudeSel option').allTextContents();
  expect(labels).toEqual(['1. Two-Drum Warm-Up · 2 drums', '2. Dotted Rhythms · 2 drums', '3. Roll and Release · 2 drums', '4. Big Finish · 2 drums',
    '5. Three-Drum Walk · 3 drums', '6. Waltz for Three · 3 drums', '7. Leaps and Crossings · 3 drums', '8. March in E♭ · 3 drums',
    '9. Four-Drum Fanfare · 4 drums', '10. Rolling Hills · 4 drums', '11. Grand Finale · 4 drums']);
  expect(await page.evaluate(() => window.PP_ETUDES.every(e => e.about && e.about.length < 80))).toBe(true);
  watch.check();
});

test('NEW ETUDES, THE STAFF: flats on the first B♭ / E♭ of each bar (not on a repeat in the bar), none in the C & F etudes; 2/4 and 3/4; the tuning line', async ({page}) => {
  const watch = await room(page);
  await page.locator('#prShow [data-show="etude"]').click();
  const accs = id => page.evaluate(id => {
    Arcade.PedalPoint.practice.showEtude(id);
    const e = Arcade.PedalPoint.practice.etudes.find(x => x.etude.id === id);
    return [...document.querySelectorAll('#prStaff .rs-accidental')].map(g => {
      const n = e.notes[+g.dataset.n], head = g.parentNode.querySelector('ellipse'), gb = g.getBBox(), hb = head.getBBox();
      return {n: +g.dataset.n, acc: +g.dataset.acc, m: n.measure, letter: n.pitch.letter, left: gb.x + gb.width <= hb.x + 1};
    });
  }, id);
  const march = await accs('eb-march');
  march.forEach(a => { expect(a.acc).toBe(-1); expect(a.left).toBe(true); });
  // bar 1: E♭ B♭ E♭ B♭ = a flat on the first E♭ and the first B♭ only; bar 2 (E♭ again): a flat again
  expect(march.filter(a => a.m === 0).map(a => [a.n, a.letter])).toEqual([[0, 'E'], [1, 'B']]);
  expect(march.filter(a => a.m === 1).map(a => a.letter)).toEqual(['E']);
  // bar 4: G3 E♭: only the E♭ (G has no flat)
  expect(march.filter(a => a.m === 3).map(a => a.letter)).toEqual(['E']);
  // one per pitch per bar, everywhere
  const perBar = {}; march.forEach(a => { const k = a.m + a.letter; perBar[k] = (perBar[k] || 0) + 1; });
  Object.values(perBar).forEach(c => expect(c).toBe(1));
  for (const id of ['warm-up', 'dotted', 'roll-release', 'big-finish']) expect(await accs(id), id).toEqual([]);
  // time signatures and bars: 2/4 and 3/4
  const meter = id => page.evaluate(id => {
    Arcade.PedalPoint.practice.showEtude(id);
    const t = [...document.querySelectorAll('#prStaff .pr-srow-staff')[0].querySelectorAll('.rs-time text')].map(x => x.textContent);
    const e = Arcade.PedalPoint.practice.etudes.find(x => x.etude.id === id);
    return {t, per: e.parsed.meter.per, measures: e.measures, rows: document.querySelectorAll('#prStaff .pr-srow-staff').length,
      bars: [...document.querySelectorAll('#prStaff .rs-bar')].length};
  }, id);
  const w = await meter('waltz'), m = await meter('eb-march');
  expect(w.t).toEqual(['3', '4']); expect(w.per).toBe(36); expect(w.measures).toBe(16);
  expect(m.t).toEqual(['2', '4']); expect(m.per).toBe(24); expect(m.measures).toBe(16);
  // every row has its bar lines (one between each pair of bars, one at the end of a non-final row)
  expect(w.bars).toBe(16 - 1);
  // the tuning line
  await page.evaluate(() => Arcade.PedalPoint.practice.showEtude('leaps'));
  await expect(page.locator('#prStaff .pr-tuning')).toHaveText('Timpani: B♭2 · C3 · F3');
  await page.evaluate(() => Arcade.PedalPoint.practice.showEtude('warm-up'));
  await expect(page.locator('#prStaff .pr-tuning')).toHaveText('Timpani: C3 · F3');
  watch.check();
});

test('NEW ETUDES: HEAR IT of Grand Finale strikes all four drums (rolls, rit.); PLAY ALONG of Rolling Hills judges releases on the right drums', async ({page}) => {
  const watch = await room(page);
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four'));
  const g = await page.evaluate(() => {
    const p = Arcade.PedalPoint.practice, pl = p.plan('grand-finale'), e = p.etudes.find(x => x.etude.id === 'grand-finale');
    const gap = m => { const ns = pl.notes.filter(n => e.notes[n.n].measure === m); return ns.slice(1).map((n, k) => n.time - ns[k].time); };
    return {drums: [...new Set(pl.strokes.map(s => s.drum))].sort(), rolls: pl.strokes.filter(s => s.roll).length, g6: gap(5), g8: gap(7)};
  });
  expect(g.drums).toEqual([0, 1, 2, 3]);
  expect(g.rolls).toBeGreaterThan(20);
  expect(Math.min(...g.g8)).toBeGreaterThan(Math.min(...g.g6) * .99);        // the rit.: the last bar never runs faster
  // PLAY ALONG (demo): each note played on its own drum at its time, rolls held: every note on time
  await page.locator('#prShow [data-show="etude"]').click();
  await page.locator('#prEtudeSel').selectOption('rolling-hills');
  await page.locator('#prEClick').click();                                       // (click off)
  const r = await page.evaluate(() => {
    const p = Arcade.PedalPoint.practice, pl = p.plan('rolling-hills'), map = p.assign('rolling-hills');
    return {notes: pl.notes.map(n => ({rel: n.time, drum: n.drum, d: n.end - n.time, roll: n.roll, midi: n.midi})), map};
  });
  r.notes.forEach(n => expect(n.drum).toBe(r.map[n.midi]));                     // each pitch on its own drum
  expect(new Set(r.notes.map(n => n.drum)).size).toBe(4);
  // played right: every roll held, each release landing on the next drum = all on time
  await page.locator('#prAlong').click();
  await page.evaluate(ns => { const p = Arcade.PedalPoint.practice; ns.forEach(n => p.attack(n.drum, n.rel, n.roll ? n.d * .9 : 0)); p.endNow(); }, r.notes);
  let s = await P(page);
  expect(s.run.J.res.map(x => x.kind).filter(k => k !== 'ok')).toEqual([]);
  expect(s.run.J.acc).toBe(100);
  // the second note (B♭, the first release's target) played on the C drum instead: the wrong drum
  await page.locator('#prAlong').click();
  await page.evaluate(ns => { const p = Arcade.PedalPoint.practice; ns.forEach((n, k) => p.attack(k === 1 ? ns[2].drum : n.drum, n.rel, n.roll ? n.d * .9 : 0)); p.endNow(); }, r.notes);
  s = await P(page);
  expect(s.run.J.res[1].kind).toBe('wrong');
  watch.check();
});

for (const [name, vp] of [['phone', {width: 390, height: 844}], ['iPad portrait', {width: 768, height: 1024}], ['iPad landscape', {width: 1024, height: 768}], ['Chromebook', {width: 1366, height: 768}]]) {
  test(`NEW ETUDES, LAYOUT (${name}): every etude's staff rows and tuning line fit the screen`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await room(page);
    await page.locator('#prShow [data-show="etude"]').click();
    for (const id of await page.evaluate(() => window.PP_ETUDES.map(e => e.id))) {
      await page.evaluate(id => { const p = Arcade.PedalPoint.practice; p.applySetup(p.setupOf(p.etudes.find(e => e.etude.id === id))); p.showEtude(id); }, id);
      const r = await page.evaluate(() => {
        const st = document.getElementById('prStaff').getBoundingClientRect(), t = document.querySelector('#prStaff .pr-tuning').getBoundingClientRect();
        return {rows: [...document.querySelectorAll('#prStaff .pr-srow-staff svg')].map(s => { const b = s.getBoundingClientRect(); return [b.left, b.right]; }), st: [st.left, st.right], t: [t.left, t.right]};
      });
      r.rows.forEach(([l, rr]) => { expect(l, id).toBeGreaterThanOrEqual(r.st[0] - 1); expect(rr, id).toBeLessThanOrEqual(r.st[1] + 1); });
      expect(r.t[1], id).toBeLessThanOrEqual(r.st[1] + 1);
      expect(await tooWide(page), id).toEqual([]);
    }
    watch.check();
  });
}
