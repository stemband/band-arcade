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
test('ETUDES: all four parse, every bar adds up, the rolls / releases / accents, C3 and F3', async ({page}) => {
  const watch = await room(page);
  const r = await page.evaluate(() => Arcade.PPEtudes.ETUDES.map(et => { const e = Arcade.PPEtudes.parse(et);
    return {id: et.id, errors: e.errors, measures: e.measures, total: e.total, per: e.parsed.meter.per, pitches: [...new Set(e.notes.filter(n => !n.rest).map(n => n.midi))].sort(),
      rolls: e.notes.filter(n => n.roll).length, releases: e.slurs.length, accents: e.notes.filter(n => n.accent).length}; }));
  expect(r.map(x => x.id)).toEqual(['warm-up', 'dotted', 'roll-release', 'big-finish']);
  r.forEach(x => { expect(x.errors, x.id).toEqual([]); expect(x.measures).toBe(8); expect(x.total).toBe(8 * x.per); expect(x.pitches).toEqual([48, 53]); });
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

/* ===== LAYOUTS ===== */
for (const [name, vp, min, minMusic] of [['phone', {width: 390, height: 844}, 60, 60], ['iPad portrait', {width: 768, height: 1024}, 120, 88],
  ['iPad landscape', {width: 1024, height: 768}, 120, 88], ['Chromebook', {width: 1366, height: 768}, 120, 88]]) {
  test(`LAYOUT (${name}): 4 drums big enough to tap, with and without music, nothing off the screen`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await room(page);
    await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four'));
    const heads = () => page.locator('.pr-head').evaluateAll(hs => hs.map(h => { const r = h.getBoundingClientRect(); return {w: r.width, l: r.left, r: r.right}; }));
    let hs = await heads();
    hs.forEach(h => { expect(h.l).toBeGreaterThanOrEqual(0); expect(h.r).toBeLessThanOrEqual(vp.width); });
    expect(Math.min(...hs.map(h => h.w))).toBeGreaterThanOrEqual(min * .78 - 1);   // the 23" is drawn smaller (its real size)
    expect(Math.max(...hs.map(h => h.w))).toBeGreaterThanOrEqual(min);
    expect(await tooWide(page)).toEqual([]);
    for (const show of ['etude', 'sheet']) {
      await page.evaluate(m => Arcade.PedalPoint.practice.setShow(m), show);
      hs = await heads();
      expect(Math.min(...hs.map(h => h.w))).toBeGreaterThanOrEqual(Math.min(minMusic, min) * .78 - 1);
      expect(Math.max(...hs.map(h => h.w))).toBeGreaterThanOrEqual(Math.min(minMusic, min));
      expect(await tooWide(page)).toEqual([]);
    }
    watch.check();
  });
}

/* GALLERY=1: the Practice Room for Mr. Graham's review (2 and 4 drums, an etude mid-play-along, a loaded image) */
test('gallery: docs/gallery/pedal-point-practice.png', async ({page, browserName}) => {
  test.skip(!process.env.GALLERY || browserName !== 'chromium', 'GALLERY=1 only');
  await page.setViewportSize({width: 1024, height: 768});
  await room(page);
  const shots = [];
  const grab = async label => shots.push({label, b64: (await page.screenshot()).toString('base64')});
  await grab('2 drums (C & F)');
  await page.evaluate(() => Arcade.PedalPoint.practice.applyPreset('four')); await grab('4 drums');
  for (const id of ['warm-up', 'dotted', 'roll-release', 'big-finish']) {
    await page.evaluate(id => { const p = Arcade.PedalPoint.practice; p.applyPreset('cf'); p.setShow('etude'); p.showEtude(id); }, id);
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
