/* SCALE TRAINER (scale-trainer/, the AUDITION table in shared/scales.js): the GMEA MS All-State / District Honor Band
   scale audition. The table builds the right notes for every member, in audition order; a whole level-4 audition
   played through Pitch.demoNote (the detector's own ?demo input, so the note follower is the real one) earns 3 stars;
   a wrong note turns red then amber when fixed; a skipped note turns red and the follower moves on; time running out
   mid-scale lets that scale finish, then ends (scales not started score 0); the chromatic ranges; the Snare Drum is
   refused; the results' score sheet and the ALL-STATE READY badge. */
const {test, expect} = require('@playwright/test');
const {prepare, device, saved, ROOT} = require('./helpers');

const URL = 'scale-trainer/index.html?demo&nostart';
const MEMBERS = ['flute', 'oboe', 'clarinet', 'basscl', 'bassoon', 'altosax', 'tenorsax', 'barisax', 'trumpet', 'horn', 'trombone', 'baritonetc', 'euphbc', 'tuba', 'bells'];

async function open(page, member = 'trumpet', extra = {}) {
  const watch = await prepare(page, {store: device(member, Object.assign({avatarOffered: true}, extra))});
  await page.goto(URL);
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleTrainer && document.querySelector('#levelGrid .lvl'));
  return watch;
}
/** pick a mode, select a card, START; the microphone reminder is clicked through; wait until it listens */
async function start(page, mode, card) {
  await page.locator(`#modeSeg [data-mode="${mode}"]`).click();
  await page.locator(`#levelGrid .lvl`).nth(card).click();
  await page.locator('.ls-start').click();
  const mic = page.getByRole('button', {name: 'Turn on microphone'});
  if (await mic.isVisible({timeout: 1500}).catch(() => false)) await mic.click();
  await page.waitForFunction(() => { const s = Arcade.ScaleTrainer.state(); return s && s.listening; }, null, {timeout: 20000});
}
/** "play" a sounding midi through the detector's ?demo input for ms, then a short silence */
async function play(page, midi, ms = 170, gap = 0) {
  await page.evaluate(m => { Arcade.Pitch.demoJitter = .02; Arcade.Pitch.demoNote = m; }, midi);
  await page.waitForTimeout(ms);
  if (gap) { await page.evaluate(() => { Arcade.Pitch.demoNote = null; }); await page.waitForTimeout(gap); }
}
const want = page => page.evaluate(() => { const w = Arcade.ScaleTrainer.want(); return w ? w.sounding : null; });
/** play every expected note until nothing more is wanted (or n notes) */
async function playAll(page, n = 1e9) {
  for (let k = 0; k < n; k++) { const w = await want(page); if (w == null) break; await play(page, w); }
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
}

test('the AUDITION table, every section: every member, every scale: 21 / 41 / 61 notes, the right written key, start and end on the given written note, inside the section\'s range (bells exempt), in the order printed, sameAs = its source', async ({page}) => {
  const watch = await open(page);
  const out = await page.evaluate(members => {
    const S = Arcade.Scales, errs = [], P = Arcade.music.parseNote, W = Arcade.music.writtenMidi;
    const ORDER = {ms: 'F,Bb,Eb,Ab', cb: 'G,C,F,Bb,Eb,Ab,Db,Gb', sb: 'G,C,F,Bb,Eb,Ab,Db,Gb,B,E,A,D'};
    if (S.SECTIONS.map(x => x.id).join() !== 'ms,cb,sb') errs.push('sections ' + S.SECTIONS.map(x => x.id));
    Object.keys(ORDER).forEach(sec => {
      if (S.AUDITION_ORDER[sec].join() !== ORDER[sec]) errs.push(sec + ' order ' + S.AUDITION_ORDER[sec]);
      members.forEach(id => {
        const m = Arcade.memberById(id), e = S.auditionEntry(m, sec), raw = S.AUDITION[sec][id];
        if (!e || !raw) { errs.push(`${sec} ${id}: no AUDITION entry`); return; }
        if (!(e.time > 0)) errs.push(`${sec} ${id}: no time`);
        if (raw.sameAs) {                                          // the same written notes as its source, its own time
          const a = S.auditionScales(m, sec), b = S.auditionScales(Arcade.memberById(raw.sameAs), sec);
          if (JSON.stringify(a.map(x => x.notes.map(n => n.midi))) !== JSON.stringify(b.map(x => x.notes.map(n => n.midi)))) errs.push(`${sec} ${id}: not the same as ${raw.sameAs}`);
        }
        if (e.scales.map(x => x[0]).join() !== ORDER[sec]) errs.push(`${sec} ${id}: table order ${e.scales.map(x => x[0])}`);
        const ids = S.auditionScales(m, sec).map(x => x.id);
        if (ids.join() !== ORDER[sec]) errs.push(`${sec} ${id}: order ${ids}`);
        const hs = sec !== 'ms', lo = hs ? W(P(S.CHROMATIC_HS[id][0])) : m.lowMidi, hi = hs ? W(P(S.CHROMATIC_HS[id][1])) : m.highMidi;
        e.scales.forEach(([k, start, oct]) => {
          const sc = S.audition(m, k, sec), w = W(P(start)), n = sc.notes, want = {1: 21, 2: 41, 3: 61}[oct];
          if (n.length !== want) errs.push(`${sec} ${id} ${k}: ${n.length} notes, not ${want}`);
          if (n[0].midi !== w || n[n.length - 1].midi !== w) errs.push(`${sec} ${id} ${k}: starts ${n[0].midi} ends ${n[n.length - 1].midi}, not ${start}`);
          const p = P(start);
          if (n[0].letter !== p.letter || n[0].acc !== p.acc) errs.push(`${sec} ${id} ${k}: spelled ${n[0].letter}${n[0].acc}, not ${start}`);
          if (n[7 * oct].midi !== w + 12 * oct) errs.push(`${sec} ${id} ${k}: the top is ${n[7 * oct].midi}`);
          if (JSON.stringify(sc.sig) !== JSON.stringify(S.keySignature(p))) errs.push(`${sec} ${id} ${k}: key signature ${JSON.stringify(sc.sig)}`);
          if (sc.sig.count > 7) errs.push(`${sec} ${id} ${k}: ${sc.sig.count} accidentals`);
          // every note spelled inside the written key: each letter once per octave, its accidental the key signature's
          if (n.some(x => x.acc !== S.sigAcc(sc.sig, x.letter))) errs.push(`${sec} ${id} ${k}: a note outside the key signature`);
          if (n.some(x => x.pc !== ((x.midi - m.sounds) % 12 + 12) % 12)) errs.push(`${sec} ${id} ${k}: a wrong concert pitch`);
          if (n[0].pc !== S.CONCERT[k][1]) errs.push(`${sec} ${id} ${k}: tonic pc ${n[0].pc}`);
          if (sc.measures.reduce((a, c) => a + c, 0) !== n.length) errs.push(`${sec} ${id} ${k}: the rhythm picture has the wrong count`);
          if (id !== 'bells' && n.some(x => x.midi < lo || x.midi > hi)) errs.push(`${sec} ${id} ${k}: outside the range ${lo}–${hi}`);
        });
      });
    });
    return errs;
  }, MEMBERS);
  expect(out).toEqual([]);
  watch.check();
});

test('the written key comes from the written start note: trumpet concert B = D♭ major (5 flats), horn concert B = G♭ major, clarinet concert E = F♯ major, alto sax concert A = F♯ major', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const S = Arcade.Scales, f = (id, k) => { const sc = S.audition(Arcade.memberById(id), k, 'sb'); return [sc.key, sc.sig.type, sc.sig.count, sc.label]; };
    return {tpt: f('trumpet', 'B'), horn: f('horn', 'B'), cl: f('clarinet', 'E'), alto: f('altosax', 'A'), tptCb: S.audition(Arcade.memberById('trumpet'), 'Gb', 'cb').key};
  });
  expect(r.tpt).toEqual(['D♭ Major', 'b', 5, 'Concert B (your D♭ Major)']);
  expect(r.horn).toEqual(['G♭ Major', 'b', 6, 'Concert B (your G♭ Major)']);
  expect(r.cl).toEqual(['F♯ Major', '#', 6, 'Concert E (your F♯ Major)']);
  expect(r.alto).toEqual(['F♯ Major', '#', 6, 'Concert A (your F♯ Major)']);
  expect(r.tptCb).toBe('A♭ Major');
  watch.check();
});

test('n-octave scales: 1, 2 and 3 octaves get 4, 7 and 10 bars in the same rhythm (never sixteenths), the arpeggio 3-5-8 in every octave, slurs from each top note', async ({page}) => {
  const watch = await open(page);
  const d = await page.evaluate(() => {
    const S = Arcade.Scales, m = id => Arcade.memberById(id);
    const of = (id, k, sec) => { const sc = S.audition(m(id), k, sec); return {oct: sc.octaves, n: sc.notes.length, bars: sc.measures, beats: sc.notes.map(x => x.beats), slurs: sc.slurs,
      arp: sc.notes.slice(14 * sc.octaves + 1).map(x => x.midi - sc.notes[0].midi), sums: sc.measures.map((c, i) => sc.notes.filter(x => x.measure === i).reduce((a, x) => a + x.beats, 0))}; };
    return {one: of('trumpet', 'C', 'cb'), two: of('trumpet', 'G', 'cb'), fluteC: [of('flute', 'C', 'cb'), of('flute', 'C', 'sb')], bsnBb: [of('bassoon', 'Bb', 'cb'), of('bassoon', 'Bb', 'sb')],
      cl: [of('clarinet', 'F', 'cb'), of('clarinet', 'Eb', 'cb'), of('clarinet', 'E', 'sb'), of('clarinet', 'D', 'sb')]};
  });
  const SCALE = [1, .5, .5, .5, .5, .5, .5], ARP = [1, .5, .5, 1, .5, .5];
  const rhythm = o => [].concat(...Array(2 * o).fill(SCALE), ...Array(o).fill(ARP), [4]);
  expect(d.one.oct).toBe(1); expect(d.one.n).toBe(21); expect(d.one.bars.length).toBe(4); expect(d.one.beats).toEqual(rhythm(1));
  expect(d.two.oct).toBe(2); expect(d.two.n).toBe(41); expect(d.two.bars.length).toBe(7); expect(d.two.beats).toEqual(rhythm(2));
  expect(d.one.slurs).toEqual([[7, 14], [17, 20]]); expect(d.two.slurs).toEqual([[14, 28], [34, 40]]);
  for (const t of [...d.fluteC, ...d.bsnBb, ...d.cl]) {
    expect(t.oct).toBe(3); expect(t.n).toBe(61);
    expect(t.bars).toEqual([7, 7, 7, 7, 7, 7, 6, 6, 6, 1]);
    expect(t.beats).toEqual(rhythm(3));
    expect(t.beats.every(b => b >= .5)).toBe(true);                                       // no sixteenths
    expect(t.sums.every(x => x === 4)).toBe(true);
    expect(t.arp).toEqual([4, 7, 12, 16, 19, 24, 28, 31, 36, 31, 28, 24, 19, 16, 12, 7, 4, 0]);   // 3-5-8-10-12-15-17-19-22 and back
    expect(t.slurs).toEqual([[21, 42], [51, 60]]);
  }
  watch.check();
});

test('a 3-octave scale is drawn with the extended bars: flute Concert Band C (practice), 10 measures, one whole note, single beams only', async ({page}) => {
  const watch = await open(page, 'flute', {gameData: {'scale-trainer': {section: 'cb'}}});
  await start(page, 'practice', 1);                                                       // CB order G, C…: card 1 = Concert C, 3 octaves
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0].n)).toBe(61);
  const d = await page.evaluate(() => ({rows: document.querySelectorAll('#sheet .sa-row').length, lines: document.querySelectorAll('#sheet .sa-bar').length,
    whole: document.querySelectorAll('#sheet .head.whole').length, beams: document.querySelectorAll('#sheet .sa-beam').length,
    notes: document.querySelectorAll('#sheet g.fc-note').length}));
  expect(d.notes).toBe(61);
  expect(d.lines - 1 + d.rows).toBe(10);
  expect(d.whole).toBe(1);
  expect(d.beams).toBe(6 * 3 + 3 * 2);                                                    // one beam per eighth pair (no second beams)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  watch.check();
});

test('Middle School bells: 75 s (the 2025-26 GMEA mallet sheet) and Concert F from F3', async ({page}) => {
  const watch = await open(page, 'bells');
  const r = await page.evaluate(() => { const S = Arcade.Scales, m = Arcade.memberById('bells'), f = S.audition(m, 'F', 'ms');
    return {time: S.auditionTime(m, 'ms'), start: Arcade.music.noteLabel(f.notes[0]) + f.notes[0].oct, oct: f.octaves, others: ['Bb', 'Eb', 'Ab'].map(k => { const n = S.audition(m, k, 'ms').notes[0]; return Arcade.music.noteLabel(n) + n.oct; })}; });
  expect(r).toEqual({time: 75, start: 'F3', oct: 2, others: ['B♭3', 'E♭4', 'A♭3']});
  watch.check();
});

test('the rhythm picture: a 2-octave scale is 7 bars, a 1-octave scale 4 bars, only quarters, eighths and one whole note (never sixteenths)', async ({page}) => {
  const watch = await open(page);                                           // trumpet: Concert F = 2 octaves, B♭ = 1 octave
  const data = await page.evaluate(() => Arcade.ScaleTrainer.scales().map(sc => ({id: sc.id, oct: sc.octaves, bars: sc.measures,
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
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().memory)).toBe(true);        // levels 3–4: from memory
  await expect(page.locator('#memory')).toBeVisible();
  await expect(page.locator('#sheet')).toBeHidden();
  const lim = await page.evaluate(() => Arcade.ScaleTrainer.state().limit);
  expect(lim).toBe(60000);                                                                  // trumpet: the GMEA sheet's 1:00
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 10000});
  const st = await page.evaluate(() => Arcade.ScaleTrainer.state());
  expect(st.timeUp).toBe(false);
  expect(st.runs.map(r => r.id)).toEqual(['F', 'Bb', 'Eb', 'Ab']);
  expect(st.runs.every(r => r.done && r.inTime && r.res.length === r.n && r.res.every(x => x === 'ok'))).toBe(true);
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await expect(page.locator('#scoreSheet tbody tr:not(.sa-dotline)')).toHaveCount(4);
  await expect(page.locator('#scoreSheet')).toContainText('41/41');
  await expect(page.locator('#resReady')).toBeVisible();
  const s = await saved(page);
  expect(s.games['scale-trainer'].trumpet[4].stars).toBe(3);
  expect(s.gameData['scale-trainer'].ready.trumpet).toBeTruthy();
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
  expect((await saved(page)).gameData['scale-trainer'].ready).toBeFalsy();
  watch.check();
});

test('a wrong note turns the expected note red, then amber when it is played; a skipped note turns red and the follower moves on', async ({page}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  await start(page, 'audition', 0);
  const notes = await page.evaluate(() => Arcade.ScaleTrainer.scales()[0].notes.map(n => n.sounding));
  await play(page, notes[0]);
  await play(page, notes[1] + 1);                               // a wrong note (a half step off, not the next note)
  let st = await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0]);
  expect(st.i).toBe(1); expect(st.res[1]).toBe('bad');
  await expect(page.locator('#sn1')).toHaveClass(/bad/);
  await play(page, notes[1]);                                   // now the right one: fixed (amber), not clean
  st = await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0]);
  expect(st.i).toBe(2); expect(st.res[1]).toBe('fix');
  await expect(page.locator('#sn1')).toHaveClass(/fix/);
  // holding the note just counted changes nothing
  await play(page, notes[1], 300);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0].i)).toBe(2);
  // skip note 2: play note 3
  await play(page, notes[3]);
  st = await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0]);
  expect(st.res[2]).toBe('bad'); expect(st.res[3]).toBe('ok'); expect(st.i).toBe(4);
  await expect(page.locator('#sn2')).toHaveClass(/bad/);
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
  watch.check();
});

test('time runs out mid-scale (level 3, the first timed level): that scale may finish, then "Time. Thank you."; scales not started score 0', async ({page}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  await start(page, 'audition', 2);
  await playAll(page, 5);                                        // the first scale is under way
  await page.evaluate(() => { const s = Arcade.ScaleTrainer.state(); Arcade.ScaleTrainer.setMs(s.limit + 10); });
  await page.waitForFunction(() => Arcade.ScaleTrainer.state().timeUp);
  await expect(page.locator('#prompt')).toContainText('finish this scale');
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().listening)).toBe(true);    // still listening: it may finish
  await playAll(page);                                           // …the rest of scale 1 (then it ends: nothing more wanted)
  await expect(page.locator('#timeUp')).toBeVisible();
  await expect(page.locator('#timeUp')).toContainText('Time. Thank you.');
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  const st = await page.evaluate(() => Arcade.ScaleTrainer.state());
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
  const ch = await page.evaluate(() => Arcade.ScaleTrainer.chromatic().notes.map(n => n.letter + (n.acc < 0 ? 'b' : n.acc > 0 ? '#' : '') + n.oct));
  expect(ch[0]).toBe('F#3'); expect(ch[ch.indexOf('G5')]).toBe('G5'); expect(ch[ch.length - 1]).toBe('F#3');
  expect(ch.indexOf('G5')).toBe(25); expect(ch.length).toBe(51);
  expect(ch.slice(0, 3)).toEqual(['F#3', 'G3', 'G#3']);                    // sharps going up…
  expect(ch.slice(26, 29)).toEqual(['Gb5', 'F5', 'E5']);                   // …flats coming down
  await start(page, 'chrom', 0);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().limit)).toBe(0);
  await expect(page.locator('#timeBar')).toBeHidden();
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 10000});
  await expect(page.locator('#scoreSheet')).toContainText('51/51');
  expect((await saved(page)).gameData['scale-trainer'].chrom.trumpet.t).toBeGreaterThan(0);
  watch.check();
  // mallets: 2 octaves up and down from F4
  const ctx = await browser.newContext({baseURL: page.url().replace(/scale-trainer\/.*$/, '')}), p2 = await ctx.newPage();
  const w2 = await open(p2, 'bells');
  const b = await p2.evaluate(() => Arcade.ScaleTrainer.chromatic().notes.map(n => n.letter + (n.acc < 0 ? 'b' : n.acc > 0 ? '#' : '') + n.oct));
  expect(b[0]).toBe('F4'); expect(b[24]).toBe('F6'); expect(b.length).toBe(49); expect(b[48]).toBe('F4');
  expect(await p2.evaluate(() => Arcade.ScaleTrainer.scales().map(s => s.octaves))).toEqual([2, 2, 2, 2]);
  w2.check();
  await ctx.close();
});

test('the Snare Drum is refused (sent to Choose Your Instrument with need=pitched)', async ({page}) => {
  await prepare(page, {store: device('snare', {avatarOffered: true})});
  await page.goto(URL);
  await page.waitForURL(/need=pitched/);
  expect(page.url()).toContain('game=scale-trainer');
});

test('practice: pick a scale, no clock and no stars; LOOP counts clean runs and keeps the best clean run', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page, 'trumpet', {gameData: {'scale-trainer': {mode: 'practice', loop: true}}});
  await expect(page.locator('#practiceOpts')).toBeVisible();
  await expect(page.locator('#levelGrid .lvl')).toHaveCount(5);
  await expect(page.locator('#levelGrid .lvl').nth(1)).toContainText('Concert B♭ (your C Major)');
  await start(page, 'practice', 1);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().limit)).toBe(0);
  await playAll(page, 21);
  await expect(page.locator('#stepNo')).toContainText('Clean runs: 1');
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0].i)).toBe(0);      // LOOP: back to the first note
  expect((await saved(page)).gameData['scale-trainer'].practice.trumpet.Bb).toBeGreaterThan(0);
  await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
  watch.check();
});

/* ---------- articulation, memory, and no timer on levels 1–2 ---------- */
/** play every remaining note of the current run straight into the follower (no attacks), scale by scale */
const hearAll = page => page.evaluate(() => { const SA = Arcade.ScaleTrainer; for (let k = 0; k < 400; k++) { const w = SA.want(); if (!w) break; SA.heard(w.pc); } });
const hearScale = page => page.evaluate(() => { const SA = Arcade.ScaleTrainer, si = SA.state().si; for (let k = 0; k < 100; k++) { const w = SA.want(); if (!w || SA.state().si !== si) break; SA.heard(w.pc); } });

test('slurs: scale top → tonic and arpeggio top → the final whole note, for 1 and 2 octaves; split at a line break; the drawing covers each span exactly', async ({page}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  const data = await page.evaluate(() => Arcade.ScaleTrainer.scales().map(sc => {
    const n = sc.notes, top = n.findIndex((x, i) => i > 0 && x.midi === Math.max(...n.slice(0, 2 * 7 * sc.octaves + 1).map(y => y.midi)));
    const arp = n.slice(2 * 7 * sc.octaves + 1), arpTop = 2 * 7 * sc.octaves + 1 + arp.findIndex(x => x.midi === Math.max(...arp.map(y => y.midi)));
    return {id: sc.id, oct: sc.octaves, slurs: sc.slurs, top, end: 2 * 7 * sc.octaves, arpTop, last: n.length - 1, endIsTonic: n[2 * 7 * sc.octaves].midi === n[0].midi};
  }));
  for (const d of data) {
    expect(d.slurs, d.id).toEqual([[d.top, d.end], [d.arpTop, d.last]]);
    expect(d.endIsTonic).toBe(true);
    expect(d.slurs).toEqual(d.oct === 2 ? [[14, 28], [34, 40]] : [[7, 14], [17, 20]]);
  }
  // drawn: the 2-octave scale (card 0) on a phone wraps over several lines; the 1-octave one (card 1) on an iPad
  for (const [card, size] of [[0, {width: 390, height: 844}], [0, {width: 1024, height: 768}], [1, {width: 1024, height: 768}]]) {
    await page.setViewportSize(size);
    await start(page, 'practice', card);
    const want = data[card].slurs;
    const parts = await page.evaluate(() => [...document.querySelectorAll('#sheet .sa-slur')].map(p => ({s: +p.dataset.slur, from: +p.dataset.from, to: +p.dataset.to, part: p.dataset.part,
      row: [...document.querySelectorAll('#sheet .sa-row')].indexOf(p.closest('.sa-row'))})));
    const rows = await page.locator('#sheet .sa-row').count();
    want.forEach(([a, b], si) => {
      const mine = parts.filter(p => p.s === si).sort((x, y) => x.row - y.row);
      expect(mine[0].from, `slur ${si} starts`).toBe(a);
      expect(mine[mine.length - 1].to, `slur ${si} ends`).toBe(b);
      for (let k = 1; k < mine.length; k++) expect(mine[k].from, 'no gap at a line break').toBe(mine[k - 1].to + 1);
      if (mine.length === 1) expect(mine[0].part).toBe('whole');
      else { expect(mine[0].part).toBe('start'); expect(mine[mine.length - 1].part).toBe('end'); }
    });
    if (size.width === 390 && card === 0) { expect(rows).toBeGreaterThan(2); expect(parts.some(p => p.part === 'start')).toBe(true); }
    await expect(page.locator('#artLine')).toBeVisible();
    await expect(page.locator('#artLine')).toHaveText('Tongue going up, slur coming down.');
    await page.evaluate(() => Arcade.ScaleTrainer.begin && document.getElementById('uiPauseBtn').click());
    await page.locator('#uiPause [data-act="levels"]').click();
    const yes = page.locator('#uiConfirm .btn-danger, #uiConfirm .btn-primary').first();
    if (await yes.isVisible({timeout: 1000}).catch(() => false)) await yes.click();
    await expect(page.locator('#hub')).toBeVisible();
  }
  watch.check();
});

test('mallets: no slurs anywhere (data and staff), no articulation line', async ({page}) => {
  test.setTimeout(60000);
  const watch = await open(page, 'bells');
  expect(await page.evaluate(() => Arcade.ScaleTrainer.scales().map(sc => sc.slurs))).toEqual([[], [], [], []]);
  await start(page, 'practice', 0);
  await expect(page.locator('#sheet .sa-row').first()).toBeVisible();
  await expect(page.locator('#sheet .sa-slur')).toHaveCount(0);
  await expect(page.locator('#artLine')).toBeHidden();
  watch.check();
});

test('levels 1–2: the staff for all four scales, no time bar, never end on time, "in order." without "from memory"; a slow clean run = 3 stars', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  for (const card of [0, 1]) {
    await page.locator(`#modeSeg [data-mode="audition"]`).click();
    await expect(page.locator('#levelGrid .lvl').nth(card)).toContainText('Music shown · No timer');
    await page.locator('#levelGrid .lvl').nth(card).click();
    await page.locator('.ls-start').click();
    const mic = page.getByRole('button', {name: 'Turn on microphone'});
    if (await mic.isVisible({timeout: 1500}).catch(() => false)) await mic.click();
    await expect(page.locator('#adjText')).toHaveText('Please play your scales in order.');
    await page.waitForFunction(() => { const s = Arcade.ScaleTrainer.state(); return s && s.listening; }, null, {timeout: 20000});
    expect(await page.evaluate(() => Arcade.ScaleTrainer.state().limit)).toBe(0);
    await expect(page.locator('#timeBar')).toBeHidden();
    await expect(page.locator('#clockLabel')).toHaveText('Time');
    // a very slow run: ten minutes on the stopwatch, still going
    await page.evaluate(() => Arcade.ScaleTrainer.setMs(600000));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => Arcade.ScaleTrainer.state().timeUp)).toBe(false);
    for (let si = 0; si < 4; si++) {
      await expect(page.locator('#sheet')).toBeVisible();
      await expect(page.locator('#memory')).toBeHidden();
      expect(await page.evaluate(() => Arcade.ScaleTrainer.state().si)).toBe(si);
      if (card === 0) await expect(page.locator('#sheet')).toHaveClass(/sa-names/);           // level 1: the note names
      else await expect(page.locator('#sheet')).not.toHaveClass(/sa-names/);
      await hearScale(page);
    }
    await expect(page.locator('#results')).toBeVisible({timeout: 8000});
    await expect(page.locator('#timeUp')).toBeHidden();
    await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
    await expect(page.locator('#scoreSheet')).toContainText('Your time 10:');
    await expect(page.locator('#scoreSheet')).toContainText('Audition limit 1:00');
    await expect(page.locator('#scoreSheet')).not.toContainText('✗');
    await page.locator('#resLevels').click();
  }
  const s = await saved(page);
  expect(s.games['scale-trainer'].trumpet[1].stars).toBe(3);
  expect(s.games['scale-trainer'].trumpet[2].stars).toBe(3);
  watch.check();
});

test('levels 3–4: from memory ("…, from memory."), timed, the staff hidden for every scale; level 4 ends on time like before', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  await expect(page.locator('#levelGrid .lvl').nth(2)).toContainText('Memory · Timed');
  await expect(page.locator('#levelGrid .lvl').nth(3)).toContainText('Memory · Audition time');
  await start(page, 'audition', 2);
  await expect(page.locator('#adjText')).toHaveText('Please play your scales in order, from memory.');
  await expect(page.locator('#timeBar')).toBeVisible();
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().limit)).toBe(75000);            // trumpet 60 s × 1.25
  for (let si = 0; si < 4; si++) {
    await expect(page.locator('#sheet')).toBeHidden();
    await expect(page.locator('#memory')).toBeVisible();
    await hearScale(page);
  }
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await page.locator('#resLevels').click();
  // level 4: time runs out before a scale is started = the audition ends at once
  await start(page, 'audition', 3);
  await hearScale(page);                                                                        // scale 1 done
  await page.evaluate(() => { const s = Arcade.ScaleTrainer.state(); Arcade.ScaleTrainer.setMs(s.limit + 10); });
  await expect(page.locator('#timeUp')).toContainText('Time. Thank you.');
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(0);
  await expect(page.locator('#scoreSheet')).toContainText('✗ time');
  watch.check();
});

test('articulation: shown on the score sheet (✓, or what to check) but never changes the stars while ARTICULATION_COUNTS is false', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.ARTICULATION_COUNTS)).toBe(false);
  // no attacks at all: every note slurred → "check tonguing going up", still 3 stars
  await start(page, 'audition', 0);
  await hearAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#scoreSheet .sa-art')).toHaveCount(4);
  await expect(page.locator('#scoreSheet .sa-art').first()).toHaveText('Articulation: check tonguing going up');
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await page.locator('#resRetry').click();
  // the demo's Space tongues where the music says (attacks going up, none under a slur): ✓
  await page.waitForFunction(() => { const s = Arcade.ScaleTrainer.state(); return s && s.listening; }, null, {timeout: 20000});
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.down('Space');
  await expect(page.locator('#results')).toBeVisible({timeout: 60000});
  await page.keyboard.up('Space');
  const arts = await page.locator('#scoreSheet .sa-art').allTextContents();
  expect(arts).toEqual(['Articulation: ✓', 'Articulation: ✓', 'Articulation: ✓', 'Articulation: ✓']);
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  // every note tongued (an attack on the slurred ones too) = "check slurring coming down"
  await page.locator('#resRetry').click();
  await page.waitForFunction(() => { const s = Arcade.ScaleTrainer.state(); return s && s.listening; }, null, {timeout: 20000});
  await page.evaluate(async () => {
    const SA = Arcade.ScaleTrainer;
    for (let k = 0; k < 400; k++) { const w = SA.want(); if (!w) break; SA.attack(performance.now() - 120); SA.heard(w.pc); await new Promise(r => setTimeout(r, 5)); }
  });
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#scoreSheet .sa-art').first()).toHaveText('Articulation: check slurring coming down');
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  watch.check();
});

/* ---------- the rename: Scale Audition (scale-audition) → Scale Trainer (scale-trainer) ---------- */
const OLD = 'scale-' + 'audition', OLDNAME = 'Scale ' + 'Audition';     // (spelled in two parts so the grep test below skips this file's code)
const oldStore = () => device('trumpet', {avatarOffered: true, migrated: {'ninja-10-belts': true, 'players-v1': true},
  games: {[OLD]: {trumpet: {1: {stars: 1, best: 50}, 4: {stars: 3, best: 100}}}, 'scale-trainer': {trumpet: {1: {stars: 2, best: 40}}}},
  gameData: {
    [OLD]: {mode: 'practice', ready: {trumpet: '2026-05-01'}, practice: {trumpet: {F: 300, Eb: 222}}, chrom: {trumpet: {t: 250, stars: 2}}},
    'scale-trainer': {practice: {trumpet: {F: 280, Bb: 200}}, chrom: {trumpet: {t: 300, stars: 3}}},
    'level-select': {[OLD + ':audition|trumpet|bb']: 3},
    floor: {last: OLD},
  }});

test('the rename migration: stars, badges, best times and the rest move to scale-trainer once, the better value kept on a clash', async ({page}) => {
  const watch = await prepare(page, {store: oldStore()});
  await page.goto('scale-trainer/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleTrainer);
  const check = async () => {
    const s = await saved(page);
    expect(s.migrated['scale-trainer-rename']).toBe(true);
    expect(Object.keys(s.games).filter(k => k.startsWith(OLD))).toEqual([]);
    expect(s.games['scale-trainer'].trumpet).toEqual({1: {stars: 2, best: 50}, 4: {stars: 3, best: 100}});   // the better of each
    expect(s.gameData[OLD]).toBeUndefined();
    const g = s.gameData['scale-trainer'];
    expect(g.ready).toEqual({trumpet: '2026-05-01'});
    expect(g.practice.trumpet).toEqual({F: 280, Bb: 200, Eb: 222});                                  // the faster run
    expect(g.chrom.trumpet).toEqual({t: 250, stars: 3});                                             // the faster time, the more stars
    expect(g.mode).toBe('practice');
    expect(s.gameData['level-select']).toEqual({'scale-trainer:audition|trumpet|bb': 3});
    expect(s.gameData.floor.last).toBe('scale-trainer');
    return s;
  };
  const first = await check();
  // the ALL-STATE READY badge and the Audition Room avatar background stay
  await expect(page.locator('#readyBadge')).toBeVisible();
  expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('bg', 'auditionroom'))).toBe(true);
  // exactly once: a reload changes nothing
  await page.reload();
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleTrainer);
  expect(await check()).toEqual(first);
  watch.check();
});

test('an old Backup Code (made before the rename) restores into the scale-trainer keys', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true})});
  await page.goto('index.html?demo&nostart');                              // the floor loads backup.js
  await page.waitForFunction(() => window.Arcade && Arcade.store && Arcade.Backup);
  const old = oldStore();
  const out = await page.evaluate(async ({old, OLD}) => {
    const S = Arcade.store, real = S.exportAll;
    S.exportAll = () => JSON.parse(JSON.stringify(old));                  // what an old device would have encoded
    const code = await Arcade.Backup.fullEncode();
    S.exportAll = real;
    const res = await Arcade.Backup.fullDecode(code);
    if (!res.ok || !Arcade.store.importAll(res.data)) return null;
    const d = Arcade.store.exportAll();
    return {old: Object.keys(d.games).filter(k => k.startsWith(OLD)).length + (d.gameData[OLD] ? 1 : 0), games: d.games['scale-trainer'], gd: d.gameData['scale-trainer'], flag: d.migrated['scale-trainer-rename']};
  }, {old, OLD});
  expect(out).not.toBeNull();
  expect(out.old).toBe(0);
  expect(out.flag).toBe(true);
  expect(out.games.trumpet[4]).toEqual({stars: 3, best: 100});
  expect(out.gd.ready).toEqual({trumpet: '2026-05-01'});
  watch.check();
});

test('the old address redirects: scale-audition/index.html?demo#x → scale-trainer/index.html?demo#x', async ({page}) => {
  await prepare(page);
  await page.goto(OLD + '/index.html?demo#x');
  await page.waitForURL(/\/scale-trainer\/index\.html\?demo#x$/);
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleTrainer);
  // the redirect page itself: noindex, a plain fallback link, relative addresses only
  const html = require('fs').readFileSync(require('path').join(ROOT, OLD, 'index.html'), 'utf8');
  expect(html).toContain('noindex');
  expect(html).toContain(OLDNAME + ' is now Scale Trainer — continue');
  expect(html).not.toMatch(/(href|src)="\//);
  expect(html).not.toContain('game.js');
});

test('the lobby says Scale Trainer (ALL GAMES and the Technique Lab), and nothing on the floor links to the old folder', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('index.html?demo&nostart&flat#all-games');
  await expect(page.getByText('Scale Trainer', {exact: true}).first()).toBeVisible({timeout: 15000});
  await page.goto('index.html?demo&nostart&flat#zone=technique-lab&game=scale-trainer');
  await expect(page.locator('body')).toContainText('Scale Trainer');
  const links = await page.evaluate(OLD => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h.includes(OLD)), OLD);
  expect(links).toEqual([]);
  watch.check();
});

test('no file mentions the old name, except the migration, the redirect, the old menu-music file and the notes about the rename', () => {
  const fs = require('fs'), path = require('path');
  const SKIP = new Set(['.git', 'node_modules', 'test-results', 'playwright-report']);
  const ALLOWED = {                                          // file → which lines may say it (null = any)
    'shared/storage.js': null,                               // the migration
    [OLD + '/index.html']: null,                             // the redirect
    'CLAUDE.md': l => /RENAMED|redirect|scale-trainer-rename|old name/.test(l),
    'shared/sounds.js': l => l.includes(OLD + '-menu') || /old name/.test(l),
    'shared/sounds/README.md': l => l.includes(OLD + '-menu'),
    'tests/scale-trainer.spec.js': null,                     // these tests
  };
  const bad = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir, {withFileTypes: true})) {
      if (SKIP.has(f.name)) continue;
      const p = path.join(dir, f.name), rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (f.isDirectory()) { walk(p); continue; }
      if (!/\.(js|html|css|md|json|py|yml|txt|webmanifest)$/.test(f.name)) continue;
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines.forEach((l, i) => {
        // the name as written, in ALL CAPS, run together, or split by a tag ("Scale <span>Audition</span>")
        const t = l.replace(/<[^>]+>/g, '');
        if (!(l.includes(OLD) || t.includes(OLDNAME) || t.includes(OLDNAME.toUpperCase()) || l.includes('Scale' + 'Audition'))) return;
        const ok = rel in ALLOWED && (ALLOWED[rel] === null || ALLOWED[rel](l));
        if (!ok) bad.push(`${rel}:${i + 1}: ${l.trim().slice(0, 120)}`);
      });
    }
  })(ROOT);
  expect(bad).toEqual([]);
});

/* ---------- THE FINGERING CARD + the fingering table covering every GMEA chromatic note ---------- */
test('the fingering table covers every note of every member\'s GMEA chromatic range (middle school and high school), with key names each diagram draws', async ({page}) => {
  const warns = [];
  page.on('console', m => { if (/fingerings\.js/.test(m.text())) warns.push(m.text()); });
  const watch = await open(page);
  const missing = await page.evaluate(() => {
    const out = [];
    Object.values(Arcade.INSTRUMENTS).forEach(g => g.members.forEach(m => {
      if (m.id === 'bells' || m.pitched === false || !m.chromatic) return;
      const T = Arcade.Masher.table(m);
      for (let x = m.lowMidi; x <= m.highMidi; x++) if (!T.has(x)) out.push(`${m.id} ${x}`);
      // …and the HIGH SCHOOL range (shared/scales.js CHROMATIC_HS) with every note of the Concert Band / Symphonic Band scales
      const hs = Arcade.Scales.CHROMATIC_HS[m.id], W = n => Arcade.music.writtenMidi(Arcade.music.parseNote(n));
      for (let x = W(hs[0]); x <= W(hs[1]); x++) if (!T.has(x)) out.push(`${m.id} HS ${x}`);
      ['cb', 'sb'].forEach(sec => Arcade.Scales.auditionScales(m, sec).forEach(sc => sc.notes.forEach(n => { if (!T.has(n.midi)) out.push(`${m.id} ${sec} ${sc.id} ${n.midi}`); })));
    }));
    return [...new Set(out)];
  });
  expect(missing).toEqual([]);
  expect(warns).toEqual([]);                                                   // every key id exists on its diagram
  watch.check();
});

/** tap a note on the sheet (dy: how far above its head, px) */
async function tapNote(page, i, dy = 0) {
  const head = page.locator(`#sn${i} ellipse.head`);
  await head.scrollIntoViewIfNeeded();
  const b = await head.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2 - dy);
}
const card = page => page.evaluate(() => Arcade.ScaleTrainer.card());
/** the card is fully on screen and covers neither the tapped note nor the current one */
async function clearOfNotes(page) {
  return page.evaluate(() => {
    const c = Arcade.ScaleTrainer.card(), r = c.rect, vw = innerWidth, vh = innerHeight;
    const s = c.src, sel = s.kind === 'dots' ? `#scoreSheet .fc-row[data-run="${s.run}"] i[data-i="${s.i}"]` : s.kind === 'live' ? `#liveDots i:nth-child(${s.i + 1})` : s.kind === 'nbn' ? '#nb ellipse.head' : `#sn${s.i} ellipse.head`;
    const boxes = [document.querySelector(sel), document.querySelector('#sheet g.cur ellipse.head')].filter(Boolean).map(e => e.getBoundingClientRect());
    const hit = boxes.some(b => r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom);
    return {onScreen: r.left >= 0 && r.top >= 0 && r.right <= vw && r.bottom <= vh, covers: hit};
  });
}

test('tap a scale note in Practice: the card shows its written name, concert pitch and the primary fingering drawn, alternates in words', async ({page}) => {
  const watch = await open(page);                                              // trumpet: Concert F = written G major, from G3
  await start(page, 'practice', 0);
  const sounds = await page.evaluate(() => Arcade.Sfx.history.length);
  await tapNote(page, 5, 18);                                                   // 18 px above the head still picks it (a finger-sized hit band)
  const c = await card(page);
  expect(c.open).toBe(true);
  expect(c.src).toMatchObject({kind: 'sheet', i: 5});
  const exp = await page.evaluate(() => { const n = Arcade.ScaleTrainer.scales()[0].notes[5], T = Arcade.Masher.table({id: 'trumpet'}), f = T.notes(n.midi);
    return {name: Arcade.music.noteLabel(n) + n.oct, keys: f[0].keys.slice().sort(), prim: f[0].text, alt: f.slice(1).map(x => x.text)}; });
  expect(c.name).toBe(exp.name);                                                // E4
  expect(c.concert).toBe('Concert D4');
  expect(c.diagram).toBe('dg-trumpet');
  expect(c.pressed).toEqual(exp.keys);
  expect(c.prim).toBe(exp.prim);
  expect(c.alt).toBe(exp.alt.length ? 'Also: ' + exp.alt.join(' · ') : '');
  expect(await page.locator('.fc-ring').count()).toBe(1);                       // the tapped note's ring
  expect(await page.locator('#fcard .diagram .key[role="button"]').count()).toBe(0);   // display only: no pressable keys
  // another note moves the card; the same note, a tap outside and ✕ close it
  await tapNote(page, 9);
  expect((await card(page)).src.i).toBe(9);
  await tapNote(page, 9);
  expect((await card(page)).open).toBe(false);
  await tapNote(page, 2);
  await page.mouse.click(5, 300);
  expect((await card(page)).open).toBe(false);
  await tapNote(page, 2);
  await page.locator('#fcard .fc-x').click();
  expect((await card(page)).open).toBe(false);
  expect(await page.evaluate(() => Arcade.Sfx.history.length)).toBe(sounds);   // no sound, ever (it would mute the microphone)
  watch.check();
});

test('the chromatic coming down shows the flat spelling', async ({page}) => {
  const watch = await open(page);
  await start(page, 'practice', 4);                                             // trumpet: Chromatic
  const i = await page.evaluate(() => { const n = Arcade.ScaleTrainer.chromatic().notes, half = Math.ceil(n.length / 2); return n.findIndex((x, k) => k >= half && x.acc < 0); });
  expect(i).toBeGreaterThan(0);
  await tapNote(page, i);
  const c = await card(page);
  expect(c.name).toMatch(/♭\d$/);
  expect(c.pressed.length).toBeGreaterThan(0);
  watch.check();
});

test('the trombone shows a slide position, alternates as "or 6th"', async ({page}) => {
  const watch = await open(page, 'trombone');
  await start(page, 'practice', 0);                                             // Concert F
  // F3 = 1st or 6th position (the first note of the scale with an alternate)
  const k = await page.evaluate(() => { const T = Arcade.Masher.table({id: 'trombone'}); return Arcade.ScaleTrainer.scales()[0].notes.findIndex(n => n.midi === 53 && T.notes(53).length === 2); });
  expect(k).toBeGreaterThanOrEqual(0);
  await tapNote(page, k);
  const t = await card(page);
  expect(t.diagram).toBe('dg-trombone');
  expect(t.prim).toBe('1st position');
  expect(t.alt).toBe('or 6th');
  expect(t.pressed).toEqual(['pos1']);
  watch.check();
});

test('the card never stops the note follower: notes played while it is open keep counting', async ({page}) => {
  const watch = await open(page);
  await start(page, 'practice', 1);                                             // Concert B♭ (1 octave)
  await tapNote(page, 8);
  expect((await card(page)).open).toBe(true);
  await playAll(page, 6);
  const s = await page.evaluate(() => Arcade.ScaleTrainer.state());
  expect(s.listening).toBe(true);
  expect(s.runs[0].i).toBe(6);
  expect(s.runs[0].res.slice(0, 6)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
  expect(await page.evaluate(() => Arcade.UI.pause.get().paused)).toBe(false);
  const c = await card(page);
  expect(c.open).toBe(true);
  expect(await clearOfNotes(page)).toEqual({onScreen: true, covers: false});   // still clear of the current note as it moves
  watch.check();
});

test('NOTE BY NOTE: its own fingering stays; a tapped dot shows that note on top without changing the note it waits for', async ({page}) => {
  const watch = await open(page, 'trumpet', {gameData: {'scale-trainer': {nbn: true}}});
  await start(page, 'practice', 0);
  const before = await page.evaluate(() => Arcade.ScaleTrainer.want().midi);
  const dot = await page.locator('#liveDots i').nth(7).boundingBox();
  await page.mouse.click(dot.x + dot.width / 2, dot.y + dot.height / 2 + 12);   // a little under the dot: still that dot
  const c = await card(page);
  expect(c.src).toMatchObject({kind: 'live', i: 7});
  expect(await page.evaluate(() => Arcade.ScaleTrainer.want().midi)).toBe(before);
  await expect(page.locator('#nbnFing svg.diagram')).toBeVisible();
  watch.check();
});

test('levels 3–4: no card while the run plays (the staff is hidden); the score sheet\'s dots open it afterwards', async ({page}) => {
  const watch = await open(page);
  await start(page, 'audition', 2);                                             // Hallway: from memory, timed
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().memory)).toBe(true);
  await page.evaluate(() => Arcade.ScaleTrainer.openCard('sheet', 0));
  expect((await card(page)).open).toBe(false);
  const m = await page.locator('#memory').boundingBox();
  await page.mouse.click(m.x + m.width / 2, m.y + m.height / 2);
  const dots = await page.locator('#liveDots').boundingBox();
  await page.mouse.click(dots.x + 4, dots.y + dots.height / 2);
  expect((await card(page)).open).toBe(false);
  await playAll(page, 3);                                                       // start scale 1, then the time runs out
  await page.evaluate(() => Arcade.ScaleTrainer.setMs(1e9));
  await expect(page.locator('#scoreSheet')).toBeVisible({timeout: 20000});
  await playAll(page);                                                          // (time's up: the first scale may finish)
  await expect(page.locator('#scoreSheet .fc-row').first()).toBeVisible({timeout: 30000});
  const d = page.locator('#scoreSheet .fc-row').first().locator('i').nth(2);
  await d.scrollIntoViewIfNeeded();
  const b = await d.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2 - 14);
  const c = await card(page);
  expect(c.src).toMatchObject({kind: 'dots', run: 0, i: 2});
  expect(c.name).toBe(await page.evaluate(() => { const n = Arcade.ScaleTrainer.scales()[0].notes[2]; return Arcade.music.noteLabel(n) + n.oct; }));
  expect(c.diagram).toBe('dg-trumpet');
  expect((await clearOfNotes(page)).onScreen).toBe(true);
  watch.check();
});

test('mallets: no fingering: the bars, about two octaves around the note, the one to strike lit', async ({page}) => {
  const watch = await open(page, 'bells');
  await start(page, 'practice', 0);
  await tapNote(page, 3);
  const c = await card(page);
  expect(c.diagram).toBe(null);
  expect(c.prim).toBe('Mallets: the lit bar');
  expect(c.bars).toBeGreaterThanOrEqual(24);
  expect(c.lit).toBe(1);
  watch.check();
});

test('keyboard: Enter opens the card, the arrows move it note by note, Esc closes it (not the pause menu)', async ({page}) => {
  const watch = await open(page);
  await start(page, 'practice', 0);
  await page.locator('#sn0').focus();
  await page.keyboard.press('Enter');
  expect((await card(page)).src).toMatchObject({kind: 'sheet', i: 0});
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  let c = await card(page);
  expect(c.open).toBe(true);
  expect(c.src.i).toBe(2);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('sn2');
  expect(await page.evaluate(() => [...document.querySelectorAll('#sheet .fc-note[tabindex="0"]')].map(g => g.id))).toEqual(['sn2']);   // one tab stop
  await page.keyboard.press('ArrowLeft');
  expect((await card(page)).src.i).toBe(1);
  await page.keyboard.press('Escape');
  c = await card(page);
  expect(c.open).toBe(false);
  expect(await page.evaluate(() => Arcade.UI.pause.get().paused)).toBe(false);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('sn1');
  await page.keyboard.press(' ');                                               // Space opens it too (and never "plays" a ?demo note)
  expect((await card(page)).src.i).toBe(1);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().runs[0].i)).toBe(0);
  watch.check();
});

for (const [label, vp] of [['iPad portrait', {width: 768, height: 1024}], ['phone', {width: 390, height: 844}]]) {
  test(`the card stays on screen and clear of the notes (${label})`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await open(page);
    await start(page, 'practice', 0);
    const n = await page.evaluate(() => Arcade.ScaleTrainer.scales()[0].notes.length);
    for (const i of [0, 1, 6, 13, 20, Math.floor(n / 2) + 3, n - 3, n - 1]) {
      await page.evaluate(() => Arcade.ScaleTrainer.closeCard());
      await tapNote(page, i);
      const c = await card(page);
      expect(c.open, `note ${i}`).toBe(true);
      expect(c.src.i, `note ${i}`).toBe(i);
      expect(await clearOfNotes(page), `note ${i}`).toEqual({onScreen: true, covers: false});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    watch.check();
  });
}

/* ---------- THE THREE SECTIONS: Middle School, Concert Band, Symphonic Band ---------- */
test('the section picker: three cards, Middle School by default, the choice remembered; maxStars 36', async ({page}) => {
  const watch = await open(page);
  await expect(page.locator('#secPick .sa-sec')).toHaveCount(3);
  await expect(page.locator('#secPick .sa-sec[aria-pressed="true"]')).toHaveAttribute('data-sec', 'ms');
  await expect(page.locator('#secPick [data-sec="ms"]')).toContainText('6th–8th grade · 4 scales · memory');
  await expect(page.locator('#secPick [data-sec="cb"]')).toContainText('9th–10th grade · 8 scales · music allowed');
  await expect(page.locator('#secPick [data-sec="sb"]')).toContainText('11th–12th grade · all 12 scales · music allowed');
  for (const c of await page.locator('#secPick .sa-sec').all()) await expect(c).toContainText('GMEA All-State (First Round) & District Honor Band');
  expect(await page.evaluate(() => Arcade.GAMES.find(g => g.id === 'scale-trainer').maxStars)).toBe(36);
  await page.locator('#secPick [data-sec="sb"]').click();
  expect(await page.evaluate(() => Arcade.ScaleTrainer.section())).toBe('sb');
  expect(await page.evaluate(() => Arcade.ScaleTrainer.scales().map(s => s.id).join())).toBe('G,C,F,Bb,Eb,Ab,Db,Gb,B,E,A,D');
  expect((await saved(page)).gameData['scale-trainer'].section).toBe('sb');
  await page.reload();
  await page.waitForFunction(() => window.Arcade && Arcade.ScaleTrainer && document.querySelector('#secPick .sa-sec'));
  await expect(page.locator('#secPick .sa-sec[aria-pressed="true"]')).toHaveAttribute('data-sec', 'sb');
  await page.locator('#modeSeg [data-mode="practice"]').click();
  await expect(page.locator('#levelGrid .lvl')).toHaveCount(13);                           // 12 scales + the chromatic
  await expect(page.locator('#levelGrid .lvl').first()).toContainText('Scale 1 of 12');
  watch.check();
});

const BEFORE = () => ({                                                                    // a save from before the sections
  games: {'scale-trainer': {trumpet: {1: {stars: 3, best: 100}, 2: {stars: 2, best: 95}, 3: {stars: 3, best: 100}, 4: {stars: 3, best: 100}}}},
  gameData: {'scale-trainer': {mode: 'audition', ready: {trumpet: '2026-05-01'}, practice: {trumpet: {F: 280, Bb: 200}}, chrom: {trumpet: {t: 250, stars: 3}}}},
});

test('a save from before: Middle School progress, ALL-STATE READY and the Audition Room are untouched; the high school sections start empty', async ({page}) => {
  const watch = await open(page, 'trumpet', BEFORE());
  await expect(page.locator('#readyBadge')).toBeVisible();
  await expect(page.locator('#secPick [data-sec="ms"]')).toContainText('11/12 ★');
  await expect(page.locator('#secPick [data-sec="ms"] .sa-ready-b')).toBeVisible();
  await expect(page.locator('#secPick [data-sec="cb"]')).toContainText('0/12 ★');
  await expect(page.locator('#secPick [data-sec="cb"] .sa-ready-b')).toHaveCount(0);
  expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('bg', 'auditionroom'))).toBe(true);
  expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('plate', 'cbready'))).toBe(false);
  await page.locator('#secPick [data-sec="cb"]').click();
  await expect(page.locator('#readyBadge')).toBeHidden();
  await expect(page.locator('#levelGrid .lvl').nth(3).locator('.stars span.on')).toHaveCount(0);
  await page.locator('#modeSeg [data-mode="chrom"]').click();
  await expect(page.locator('#levelGrid .lvl')).not.toContainText('Best');               // the HS chromatic has its own best
  await page.locator('#secPick [data-sec="ms"]').click();
  await expect(page.locator('#levelGrid .lvl')).toContainText('Best 0:25.0');
  const s = await saved(page), b = BEFORE();
  expect(s.games['scale-trainer']).toEqual(b.games['scale-trainer']);
  for (const k of ['scale-trainer:cb', 'scale-trainer:sb']) expect(Object.values((s.games[k] || {}).trumpet || {})).toEqual([]);   // nothing saved there
  const g = s.gameData['scale-trainer'];
  expect(g.ready).toEqual({trumpet: '2026-05-01'});
  expect(g.practice).toEqual(b.gameData['scale-trainer'].practice);
  expect(g.chrom).toEqual(b.gameData['scale-trainer'].chrom);
  watch.check();
});

test('Concert Band: stars under scale-trainer:cb; 3 ★ on level 4 = ALL-STATE READY for Concert Band and its name plate (not the Middle School Audition Room)', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page, 'trumpet', {gameData: {'scale-trainer': {section: 'cb'}}});
  await start(page, 'audition', 0);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().runs.length)).toBe(8);
  await hearAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await expect(page.locator('#scoreSheet tbody tr:not(.sa-dotline)')).toHaveCount(8);
  await expect(page.locator('#scoreSheet')).toContainText('Audition limit 2:00');
  await page.locator('#resLevels').click();
  await start(page, 'audition', 3);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().limit)).toBe(120000);      // trumpet CB 2:00
  await hearAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#resReady')).toBeVisible();
  await expect(page.locator('#resReady')).toContainText('Concert Band');
  const s = await saved(page);
  expect(s.games['scale-trainer:cb'].trumpet[1].stars).toBe(3);
  expect(s.games['scale-trainer:cb'].trumpet[4].stars).toBe(3);
  expect(Object.values((s.games['scale-trainer'] || {}).trumpet || {})).toEqual([]);      // Middle School untouched
  expect(s.gameData['scale-trainer'].ready.cb.trumpet).toBeTruthy();
  expect(s.gameData['scale-trainer'].ready.trumpet).toBeUndefined();
  const u = await page.evaluate(() => ({cb: Arcade.Avatar.isUnlocked('plate', 'cbready'), sb: Arcade.Avatar.isUnlocked('plate', 'sbready'),
    room: Arcade.Avatar.isUnlocked('bg', 'auditionroom'), all: Arcade.store.allStars('trumpet', 'scale-trainer')}));
  expect(u).toEqual({cb: true, sb: false, room: false, all: 6});
  await page.locator('#resLevels').click();
  await expect(page.locator('#readyBadge')).toBeVisible();
  await expect(page.locator('#secPick [data-sec="cb"] .sa-ready-b')).toBeVisible();
  await expect(page.locator('#secPick [data-sec="ms"] .sa-ready-b')).toHaveCount(0);
  watch.check();
});

test('Symphonic Band: stars under scale-trainer:sb, all 12 scales; its level 4 opens the Symphonic Band Ready plate', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page, 'horn', {gameData: {'scale-trainer': {section: 'sb'}}});
  await start(page, 'audition', 3);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state())).toMatchObject({section: 'sb', limit: 150000, memory: false});
  await hearAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#scoreSheet tbody tr:not(.sa-dotline)')).toHaveCount(12);
  const s = await saved(page);
  expect(s.games['scale-trainer:sb'].horn[4].stars).toBe(3);
  expect(s.gameData['scale-trainer'].ready.sb.horn).toBeTruthy();
  expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('plate', 'sbready'))).toBe(true);
  watch.check();
});

test('the memory rule: Concert Band levels 3–4 show the music; FROM MEMORY hides it and marks the result; Middle School levels 3–4 still hide it', async ({page}) => {
  test.setTimeout(120000);
  const watch = await open(page, 'trumpet', {gameData: {'scale-trainer': {section: 'cb'}}});
  await expect(page.locator('#levelGrid .lvl').nth(2)).toContainText('Music shown · Timed');
  await expect(page.locator('#levelGrid .lvl').nth(3)).toContainText('Music shown · Audition time');
  await expect(page.locator('#auditionOpts')).toBeVisible();
  await expect(page.locator('#memSw')).toHaveAttribute('aria-checked', 'false');
  for (const card of [2, 3]) {
    await start(page, 'audition', card);
    await expect(page.locator('#adjText')).toHaveText('Please play your scales in order.');
    expect(await page.evaluate(() => Arcade.ScaleTrainer.state())).toMatchObject({memory: false, fromMemory: false});
    await expect(page.locator('#sheet')).toBeVisible();
    await expect(page.locator('#memory')).toBeHidden();
    await expect(page.locator('#timeBar')).toBeVisible();
    await page.locator('#uiPauseBtn').click();
    await page.locator('#uiPause [data-act="levels"]').click();
    const yes = page.locator('#uiConfirm .btn-danger, #uiConfirm .btn-primary').first();
    if (await yes.isVisible({timeout: 1000}).catch(() => false)) await yes.click();
    await expect(page.locator('#hub')).toBeVisible();
  }
  // FROM MEMORY: levels 3–4 hide the music (levels 1–2 keep it), a "★ From memory" mark, the same stars
  await page.locator('#memSw').click();
  await expect(page.locator('#memSw')).toHaveAttribute('aria-checked', 'true');
  expect((await saved(page)).gameData['scale-trainer'].fromMemory).toBe(true);
  await expect(page.locator('#levelGrid .lvl').nth(2)).toContainText('From memory · Timed');
  await expect(page.locator('#levelGrid .lvl').nth(0)).toContainText('Music shown · No timer');
  await start(page, 'audition', 2);
  await expect(page.locator('#adjText')).toHaveText('Please play your scales in order, from memory.');
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state())).toMatchObject({memory: true, fromMemory: true});
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#memory')).toBeVisible();
  await hearAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 8000});
  await expect(page.locator('#results .ui-stars span.on')).toHaveCount(3);
  await expect(page.locator('#memMark')).toHaveText('★ From memory');
  await expect(page.locator('#results')).toContainText('★ From memory');
  const s = await saved(page);
  expect(s.games['scale-trainer:cb'].trumpet[3].stars).toBe(3);
  expect(s.gameData['scale-trainer'].memRuns.cb.trumpet[3]).toBe(true);
  await page.locator('#resLevels').click();
  await expect(page.locator('#levelGrid .lvl').nth(2).locator('.sa-memmark')).toHaveText('★ From memory');
  await start(page, 'audition', 0);                                                      // level 1: the music stays, even with the switch on
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().memory)).toBe(false);
  await expect(page.locator('#sheet')).toBeVisible();
  await page.locator('#uiPauseBtn').click();
  await page.locator('#uiPause [data-act="levels"]').click();
  const yes = page.locator('#uiConfirm .btn-danger, #uiConfirm .btn-primary').first();
  if (await yes.isVisible({timeout: 1000}).catch(() => false)) await yes.click();
  // Middle School: no switch; levels 3–4 are from memory as always
  await page.locator('#secPick [data-sec="ms"]').click();
  await expect(page.locator('#auditionOpts')).toBeHidden();
  await expect(page.locator('#levelGrid .lvl').nth(2)).toContainText('Memory · Timed');
  await start(page, 'audition', 3);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state())).toMatchObject({memory: true, fromMemory: false, section: 'ms'});
  await expect(page.locator('#sheet')).toBeHidden();
  watch.check();
});

test('the chromatic per section: trumpet Middle School F♯3–G5, high school F♯3–C6 (G♭3 coming down); bells high school C4–C6; oboe A♯3 going up', async ({page, browser}) => {
  test.setTimeout(90000);
  const watch = await open(page);
  const names = (sec, id = 'trumpet') => page.evaluate(([sec, id]) => Arcade.Scales.auditionChromatic(Arcade.memberById(id), sec).notes.map(n => n.letter + (n.acc < 0 ? 'b' : n.acc > 0 ? '#' : '') + n.oct), [sec, id]);
  const ms = await names('ms'), cb = await names('cb'), sb = await names('sb');
  expect([ms[0], ms[25], ms[ms.length - 1], ms.length]).toEqual(['F#3', 'G5', 'F#3', 51]);
  expect([cb[0], cb[30], cb[cb.length - 1], cb.length]).toEqual(['F#3', 'C6', 'Gb3', 61]);
  expect(cb.filter(n => n === 'C6')).toHaveLength(1);                                    // the top note played once
  expect(cb.slice(0, 3)).toEqual(['F#3', 'G3', 'G#3']);
  expect(cb.slice(31, 34)).toEqual(['B5', 'Bb5', 'A5']);
  expect(sb).toEqual(cb);
  const bells = await names('cb', 'bells');
  expect([bells[0], bells[24], bells[bells.length - 1], bells.length]).toEqual(['C4', 'C6', 'C4', 49]);
  expect((await names('ms', 'bells'))[0]).toBe('F4');                                     // Middle School bells: still from F (Mat: decide)
  const oboe = await names('sb', 'oboe');
  expect([oboe[0], oboe[oboe.length - 1], oboe[31]]).toEqual(['A#3', 'Bb3', 'F6']);
  // the game: the Concert Band chromatic challenge, and the microphone listens over the section's range
  await page.locator('#secPick [data-sec="cb"]').click();
  await start(page, 'chrom', 0);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.chromatic().notes.length)).toBe(61);
  const r = await page.evaluate(() => ({range: Arcade.ScaleTrainer.range(), pitch: Arcade.Pitch.range()}));
  expect(r.range).toEqual([52, 82]);                                                      // sounding F♯3−2 … C6−2 (the widest: the chromatic)
  await playAll(page);
  await expect(page.locator('#results')).toBeVisible({timeout: 15000});
  await expect(page.locator('#scoreSheet')).toContainText('61/61');
  const s = await saved(page);
  expect(s.gameData['scale-trainer'].chrom.cb.trumpet.t).toBeGreaterThan(0);
  expect(s.gameData['scale-trainer'].chrom.trumpet).toBeUndefined();
  watch.check();
});

test('SLOW GUIDE: the sheet\'s tempo joins the choices (Concert Band ♩ = 132; Symphonic Band horn 144; none where the sheet prints none)', async ({page}) => {
  const watch = await open(page, 'trumpet', {gameData: {'scale-trainer': {mode: 'practice'}}});
  await expect(page.locator('#guideSeg button')).toHaveCount(4);
  await page.locator('#secPick [data-sec="cb"]').click();
  await expect(page.locator('#guideSeg button')).toHaveCount(5);
  await expect(page.locator('#guideSeg button').last()).toHaveText('♩ = 132, audition tempo');
  await page.locator('#guideSeg button').last().click();
  expect((await saved(page)).gameData['scale-trainer'].guide).toBe(132);
  await start(page, 'practice', 0);
  expect(await page.evaluate(() => Arcade.ScaleTrainer.state().guide)).toBe(132);
  const t = await page.evaluate(() => { const S = Arcade.Scales, m = id => Arcade.memberById(id);
    return [S.auditionTempo(m('trumpet'), 'sb'), S.auditionTempo(m('horn'), 'sb'), S.auditionTempo(m('horn'), 'cb'), S.auditionTempo(m('flute'), 'cb'), S.auditionTempo(m('trumpet'), 'ms')]; });
  expect(t).toEqual([null, 144, null, 132, null]);
  watch.check();
});
