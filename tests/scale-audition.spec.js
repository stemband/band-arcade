/* SCALE AUDITION (scale-audition/, the AUDITION table in shared/scales.js): the GMEA MS All-State / District Honor Band
   scale audition. The table builds the right notes for every member, in audition order; a whole level-4 audition
   played through Pitch.demoNote (the detector's own ?demo input, so the note follower is the real one) earns 3 stars;
   a wrong note turns red then amber when fixed; a skipped note turns red and the follower moves on; time running out
   mid-scale lets that scale finish, then ends (scales not started score 0); the chromatic ranges; the Snare Drum is
   refused; the results' score sheet and the ALL-STATE READY badge. */
const {test, expect} = require('@playwright/test');
const {prepare, device, saved} = require('./helpers');

const URL = 'scale-audition/index.html?demo&nostart';
const MEMBERS = ['flute', 'oboe', 'clarinet', 'basscl', 'bassoon', 'altosax', 'tenorsax', 'barisax', 'trumpet', 'horn', 'trombone', 'baritonetc', 'euphbc', 'tuba', 'bells'];

async function open(page, member = 'trumpet', extra = {}) {
  const watch = await prepare(page, {store: device(member, Object.assign({avatarOffered: true}, extra))});
  await page.goto(URL);
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleAudition && document.querySelector('#levelGrid .lvl'));
  return watch;
}
/** pick a mode, select a card, START; the microphone reminder is clicked through; wait until it listens */
async function start(page, mode, card) {
  await page.locator(`#modeSeg [data-mode="${mode}"]`).click();
  await page.locator(`#levelGrid .lvl`).nth(card).click();
  await page.locator('.ls-start').click();
  const mic = page.getByRole('button', {name: 'Turn on microphone'});
  if (await mic.isVisible({timeout: 1500}).catch(() => false)) await mic.click();
  await page.waitForFunction(() => { const s = Arcade.ScaleAudition.state(); return s && s.listening; }, null, {timeout: 20000});
}
/** "play" a sounding midi through the detector's ?demo input for ms, then a short silence */
async function play(page, midi, ms = 170, gap = 0) {
  await page.evaluate(m => { Arcade.Pitch.demoJitter = .02; Arcade.Pitch.demoNote = m; }, midi);
  await page.waitForTimeout(ms);
  if (gap) { await page.evaluate(() => { Arcade.Pitch.demoNote = null; }); await page.waitForTimeout(gap); }
}
const want = page => page.evaluate(() => { const w = Arcade.ScaleAudition.want(); return w ? w.sounding : null; });
/** play every expected note until nothing more is wanted (or n notes) */
async function playAll(page, n = 1e9) {
  for (let k = 0; k < n; k++) { const w = await want(page); if (w == null) break; await play(page, w); }
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
}

test('the AUDITION table: every member, every scale: 21 or 41 notes, the right key signature, start and end on the given written note, inside the GMEA range (bells exempt), audition order F, B♭, E♭, A♭', async ({page}) => {
  const watch = await open(page);
  const out = await page.evaluate(members => {
    const S = Arcade.Scales, errs = [];
    if (S.AUDITION_ORDER.join() !== 'F,Bb,Eb,Ab') errs.push('order ' + S.AUDITION_ORDER);
    members.forEach(id => {
      const m = Arcade.memberById(id) || Arcade.getMember(Arcade.getInstrument(Arcade.groupFor(id)), id), e = S.AUDITION[id];
      if (!e) { errs.push(id + ': no AUDITION entry'); return; }
      if (!(e.time > 0)) errs.push(id + ': no time');
      const ids = S.AUDITION_ORDER.map(k => (S.audition(m, k) || {}).id);
      if (ids.join() !== 'F,Bb,Eb,Ab') errs.push(id + ': order ' + ids);
      S.AUDITION_ORDER.forEach(k => {
        const sc = S.audition(m, k), [start, oct] = e[k], w = Arcade.music.writtenMidi(Arcade.music.parseNote(start));
        const n = sc.notes, want = oct === 2 ? 41 : 21;
        if (n.length !== want) errs.push(`${id} ${k}: ${n.length} notes, not ${want}`);
        if (n[0].midi !== w || n[n.length - 1].midi !== w) errs.push(`${id} ${k}: starts ${n[0].midi} ends ${n[n.length - 1].midi}, not ${start}`);
        const top = n[oct === 2 ? 14 : 7].midi;
        if (top !== w + 12 * oct) errs.push(`${id} ${k}: the top is ${top}`);
        const sig = S.keySignature(n[0]), b = S.build(m, k).sig;
        if (JSON.stringify(sc.sig) !== JSON.stringify(sig) || sig.type !== b.type || sig.count !== b.count) errs.push(`${id} ${k}: key signature ${JSON.stringify(sc.sig)} vs ${JSON.stringify(b)}`);
        if (n.some(x => x.pc !== ((x.midi - m.sounds) % 12 + 12) % 12)) errs.push(`${id} ${k}: a wrong concert pitch`);
        const concertTonic = {F: 5, Bb: 10, Eb: 3, Ab: 8}[k];
        if (n[0].pc !== concertTonic) errs.push(`${id} ${k}: tonic pc ${n[0].pc}`);
        if (sc.measures.reduce((a, c) => a + c, 0) !== n.length) errs.push(`${id} ${k}: the rhythm picture has the wrong count`);
        if (id !== 'bells' && n.some(x => x.midi < m.lowMidi || x.midi > m.highMidi)) errs.push(`${id} ${k}: outside the GMEA chromatic range ${m.lowMidi}–${m.highMidi}`);
      });
    });
    return errs;
  }, MEMBERS);
  expect(out).toEqual([]);
  watch.check();
});

test('the rhythm picture: a 2-octave scale is 7 bars, a 1-octave scale 4 bars, only quarters, eighths and one whole note (never sixteenths)', async ({page}) => {
  const watch = await open(page);                                           // trumpet: Concert F = 2 octaves, B♭ = 1 octave
  const data = await page.evaluate(() => Arcade.ScaleAudition.scales().map(sc => ({id: sc.id, oct: sc.octaves, bars: sc.measures,
    beats: sc.notes.map(n => n.beats), sums: sc.measures.map((c, m) => sc.notes.filter(n => n.measure === m).reduce((a, n) => a + n.beats, 0))})));
  const SCALE = [1, .5, .5, .5, .5, .5, .5], ARP = [1, .5, .5, 1, .5, .5];
  for (const d of data) {
    expect(d.bars.length, d.id).toBe(d.oct === 2 ? 7 : 4);
    expect(d.sums.every(x => x === 4), d.id + ': every bar is 4/4').toBe(true);
    expect(d.beats.every(b => b === 1 || b === .5 || b === 4), d.id + ': only quarters, eighths and a whole note').toBe(true);
    expect(d.beats.filter(b => b === 4)).toEqual([4]);
    expect(d.beats[d.beats.length - 1]).toBe(4);
    const want = d.oct === 2 ? [SCALE, SCALE, SCALE, SCALE, ARP, ARP, [4]] : [SCALE, SCALE, ARP, [4]];
    expect(d.beats).toEqual([].concat(...want));
  }
  // …and drawn that way: every bar line (plus each row break) accounts for every measure, one whole note, no second beams
  for (const [card, bars] of [[0, 7], [1, 4]]) {
    await page.locator('#modeSeg [data-mode="practice"]').click();
    await page.locator('#levelGrid .lvl').nth(card).click();
    await page.locator('.ls-start').click();
    const mic = page.getByRole('button', {name: 'Turn on microphone'});
    if (await mic.isVisible({timeout: 1500}).catch(() => false)) await mic.click();
    await expect(page.locator('#sheet .sa-row').first()).toBeVisible();
    const d = await page.evaluate(() => ({rows: document.querySelectorAll('#sheet .sa-row').length, lines: document.querySelectorAll('#sheet .sa-bar').length,
      whole: document.querySelectorAll('#sheet .head.whole').length, beams: document.querySelectorAll('#sheet .sa-beam').length}));
    expect(d.lines - 1 + d.rows, `card ${card}: measures drawn`).toBe(bars);   // bar lines inside rows + row breaks (the final thin line counted once)
    expect(d.whole).toBe(1);
    expect(d.beams).toBe(bars === 7 ? 4 * 3 + 2 * 2 : 2 * 3 + 2);                // one beam per eighth pair: 3 per scale bar, 2 per arpeggio bar
    await page.keyboard.press('Escape');
    await page.locator('#uiPause .btn-danger, #uiPause [data-act="levels"]').first().click();
    const yes = page.locator('#uiConfirm .btn-danger, #uiConfirm .btn-primary').first();
    if (await yes.isVisible({timeout: 1000}).catch(() => false)) await yes.click();
    await expect(page.locator('#hub')).toBeVisible();
  }
  watch.check();
});

test('a level-4 audition played through Pitch.demoNote: in time, every note clean = 3 stars, the score sheet and ALL-STATE READY', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  await start(page, 'audition', 3);
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().memory)).toBe(true);        // levels 3–4: from memory
  await expect(page.locator('#memory')).toBeVisible();
  await expect(page.locator('#sheet')).toBeHidden();
  const lim = await page.evaluate(() => Arcade.ScaleAudition.state().limit);
  expect(lim).toBe(60000);                                                                  // trumpet: the GMEA sheet's 1:00
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 10000});
  const st = await page.evaluate(() => Arcade.ScaleAudition.state());
  expect(st.timeUp).toBe(false);
  expect(st.runs.map(r => r.id)).toEqual(['F', 'Bb', 'Eb', 'Ab']);
  expect(st.runs.every(r => r.done && r.inTime && r.res.length === r.n && r.res.every(x => x === 'ok'))).toBe(true);
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await expect(page.locator('#scoreSheet tbody tr:not(.sa-dotline)')).toHaveCount(4);
  await expect(page.locator('#scoreSheet')).toContainText('41/41');
  await expect(page.locator('#resReady')).toBeVisible();
  const s = await saved(page);
  expect(s.games['scale-audition'].trumpet[4].stars).toBe(3);
  expect(s.gameData['scale-audition'].ready.trumpet).toBeTruthy();
  // the level screen shows the badge now
  await page.locator('#resLevels').click();
  await expect(page.locator('#readyBadge')).toBeVisible();
  watch.check();
});

test('ALL-STATE READY only after 3 stars on level 4 (3 stars on level 1 is not enough); results keep the buttons above the score sheet', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  await expect(page.locator('#readyBadge')).toBeHidden();
  await start(page, 'audition', 0);
  await expect(page.locator('#sheet .sa-row').first()).toBeVisible();                     // level 1: the music is shown
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 10000});
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await expect(page.locator('#resReady')).toHaveCount(0);
  const order = await page.evaluate(() => { const p = document.querySelector('#results .panel'), k = [...p.children];
    return k.indexOf(p.querySelector('.ui-res-acts')) < k.indexOf(p.querySelector('.ui-res-extra')); });
  expect(order).toBe(true);
  expect((await saved(page)).gameData['scale-audition'].ready).toBeFalsy();
  watch.check();
});

test('a wrong note turns the expected note red, then amber when it is played; a skipped note turns red and the follower moves on', async ({page}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  await start(page, 'audition', 0);
  const notes = await page.evaluate(() => Arcade.ScaleAudition.scales()[0].notes.map(n => n.sounding));
  await play(page, notes[0]);
  await play(page, notes[1] + 1);                               // a wrong note (a half step off, not the next note)
  let st = await page.evaluate(() => Arcade.ScaleAudition.state().runs[0]);
  expect(st.i).toBe(1); expect(st.res[1]).toBe('bad');
  await expect(page.locator('#sn1')).toHaveClass(/bad/);
  await play(page, notes[1]);                                   // now the right one: fixed (amber), not clean
  st = await page.evaluate(() => Arcade.ScaleAudition.state().runs[0]);
  expect(st.i).toBe(2); expect(st.res[1]).toBe('fix');
  await expect(page.locator('#sn1')).toHaveClass(/fix/);
  // holding the note just counted changes nothing
  await play(page, notes[1], 300);
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().runs[0].i)).toBe(2);
  // skip note 2: play note 3
  await play(page, notes[3]);
  st = await page.evaluate(() => Arcade.ScaleAudition.state().runs[0]);
  expect(st.res[2]).toBe('bad'); expect(st.res[3]).toBe('ok'); expect(st.i).toBe(4);
  await expect(page.locator('#sn2')).toHaveClass(/bad/);
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
  watch.check();
});

test('time runs out mid-scale: that scale may finish, then "Time. Thank you."; scales not started score 0', async ({page}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  await start(page, 'audition', 0);
  await playAll(page, 5);                                        // the first scale is under way
  await page.evaluate(() => { const s = Arcade.ScaleAudition.state(); Arcade.ScaleAudition.setMs(s.limit + 10); });
  await page.waitForFunction(() => Arcade.ScaleAudition.state().timeUp);
  await expect(page.locator('#prompt')).toContainText('finish this scale');
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().listening)).toBe(true);    // still listening: it may finish
  await playAll(page);                                           // …the rest of scale 1 (then it ends: nothing more wanted)
  await expect(page.locator('#timeUp')).toBeVisible();
  await expect(page.locator('#timeUp')).toContainText('Time. Thank you.');
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  const st = await page.evaluate(() => Arcade.ScaleAudition.state());
  expect(st.runs[0].done).toBe(true); expect(st.runs[0].inTime).toBe(false);
  expect(st.runs.slice(1).every(r => !r.started && r.res.filter(x => x === 'ok').length === 0)).toBe(true);
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(0);
  await expect(page.locator('#scoreSheet')).toContainText('✗ time');
  await expect(page.locator('#scoreSheet')).toContainText('0/21');
  watch.check();
});

test('the Chromatic Challenge: trumpet F♯3 up to G5 and back; mallets F4–F6; a stopwatch, no limit', async ({page, browser}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  const ch = await page.evaluate(() => Arcade.ScaleAudition.chromatic().notes.map(n => n.letter + (n.acc < 0 ? 'b' : n.acc > 0 ? '#' : '') + n.oct));
  expect(ch[0]).toBe('F#3'); expect(ch[ch.indexOf('G5')]).toBe('G5'); expect(ch[ch.length - 1]).toBe('F#3');
  expect(ch.indexOf('G5')).toBe(25); expect(ch.length).toBe(51);
  expect(ch.slice(0, 3)).toEqual(['F#3', 'G3', 'G#3']);                    // sharps going up…
  expect(ch.slice(26, 29)).toEqual(['Gb5', 'F5', 'E5']);                   // …flats coming down
  await start(page, 'chrom', 0);
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().limit)).toBe(0);
  await expect(page.locator('#timeBar')).toBeHidden();
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 10000});
  await expect(page.locator('#scoreSheet')).toContainText('51/51');
  expect((await saved(page)).gameData['scale-audition'].chrom.trumpet.t).toBeGreaterThan(0);
  watch.check();
  // mallets: 2 octaves up and down from F4
  const ctx = await browser.newContext({baseURL: page.url().replace(/scale-audition\/.*$/, '')}), p2 = await ctx.newPage();
  const w2 = await open(p2, 'bells');
  const b = await p2.evaluate(() => Arcade.ScaleAudition.chromatic().notes.map(n => n.letter + (n.acc < 0 ? 'b' : n.acc > 0 ? '#' : '') + n.oct));
  expect(b[0]).toBe('F4'); expect(b[24]).toBe('F6'); expect(b.length).toBe(49); expect(b[48]).toBe('F4');
  expect(await p2.evaluate(() => Arcade.ScaleAudition.scales().map(s => s.octaves))).toEqual([2, 2, 2, 2]);
  w2.check();
  await ctx.close();
});

test('the Snare Drum is refused (sent to Choose Your Instrument with need=pitched)', async ({page}) => {
  await prepare(page, {store: device('snare', {avatarOffered: true})});
  await page.goto(URL);
  await page.waitForURL(/need=pitched/);
  expect(page.url()).toContain('game=scale-audition');
});

test('practice: pick a scale, no clock and no stars; LOOP counts clean runs and keeps the best clean run', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page, 'trumpet', {gameData: {'scale-audition': {mode: 'practice', loop: true}}});
  await expect(page.locator('#practiceOpts')).toBeVisible();
  await expect(page.locator('#levelGrid .lvl')).toHaveCount(5);
  await expect(page.locator('#levelGrid .lvl').nth(1)).toContainText('Concert B♭ (your C Major)');
  await start(page, 'practice', 1);
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().limit)).toBe(0);
  await playAll(page, 21);
  await expect(page.locator('#stepNo')).toContainText('Clean runs: 1');
  expect(await page.evaluate(() => Arcade.ScaleAudition.state().runs[0].i)).toBe(0);      // LOOP: back to the first note
  expect((await saved(page)).gameData['scale-audition'].practice.trumpet.Bb).toBeGreaterThan(0);
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
  watch.check();
});
