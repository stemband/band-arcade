/* MUSIC HIGHWAY: THE 20 SONGS FROM MR. GRAHAM'S TRUMPET BOOK (songs 27–46) AND THE THREE NEW METERS (2/2, 6/8, 3/8).
   The songs: at the END in book order, every song passes the bar check, maxStars = 46 × 3, every new song draws on the
   Song Board (concert + trumpet, horn, alto sax, trombone, tuba, snare) with no problem, and every note of every tier 2–3 song fits every instrument's GMEA range (THE RANGE RULE).
   The meters (beats stay QUARTER notes): the engraving (¢ for 2/2, 6/8 beamed in threes with dotted-quarter rests and a
   tie across the middle of the bar, 3/8 beamed a whole measure together), the grooves' hit positions, the count-in
   (at least 4 clicks on the PRIMARY beat: 2/2 two bars of halves, 6/8 two bars of dotted quarters, 3/8 four bars of
   one), the snare's DOWNBEATS RIGHT, and one ?demo autoPlay run per meter: 100 % PERFECT, every drum hit on the grid. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const NEW = ['largo-symphony-9', 'the-wabash-cannonball', 'still-still-still', 'minka-minka', 'el-capitan', 'theme-from-the-barber-of-seville',
  'the-old-brass-wagon', 'the-galway-piper', 'sourwood-mountain', 'o-tannenbaum', 'procession-of-the-nobles', 'yankee-doodle-march', 'cindy',
  'anvil-chorus', 'march-of-the-toreadors', 'the-stars-and-stripes-forever', 'the-merry-minstrels', 'lisbon-bay', 'habanera', 'la-cumparsita'];
const CAL = browser => Object.assign({gameData: {'music-highway': {calib: {speaker: {ms: 0}, headphones: {ms: 0}}}}}, browser === 'webkit' ? {sfx: false} : {});

async function board(page) {
  await page.goto('music-highway/songs.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.SongMap && window.MH_SONGS && Arcade.MHNotation && Arcade.SongBoard);
}
async function game(page, browserName) {
  const watch = await prepare(page, {store: device('trumpet', CAL(browserName))});
  await page.goto('music-highway/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Highway && Arcade.session);
  await page.evaluate(() => { Arcade.session.mark('mh-calibrated-speaker'); Arcade.session.mark('mh-calibrated-headphones'); });
  return watch;
}

test.describe('music highway: the book songs and the new meters', () => {
  test('the 20 book songs are songs 27–46, in book order; every song passes the check; maxStars = songs × 3', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('music-highway/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.SongMap && window.MH_SONGS && Arcade.ALL_GAMES);
    const r = await page.evaluate(() => ({n: MH_SONGS.length, tail: MH_SONGS.slice(26, 46).map(s => s.id), at25: MH_SONGS[25].id,
      checks: MH_SONGS.flatMap(s => Arcade.SongMap.check(s)), max: Arcade.ALL_GAMES.find(g => g.id === 'music-highway').maxStars,
      meters: Object.fromEntries(['the-stars-and-stripes-forever', 'lisbon-bay', 'the-merry-minstrels'].map(id => [id, Arcade.SongMap.meter(MH_SONGS.find(s => s.id === id)).label]))}));
    expect(r.n).toBeGreaterThanOrEqual(46);                         // (song 47 = the FINAL BOSS: music-highway-boss.spec.js)
    expect(r.at25).toBe('dies-irae');                                // the old songs keep their numbers
    expect(r.tail).toEqual(NEW);
    expect(r.checks).toEqual([]);
    expect(r.max).toBe(r.n * 3);
    expect(r.meters).toEqual({'the-stars-and-stripes-forever': '¢ 2/2', 'lisbon-bay': '6/8', 'the-merry-minstrels': '3/8'});
    watch.check();
  });

  test('the Song Board draws every new song (concert + 6 instruments) with no problem, each in its range', async ({page}) => {
    test.setTimeout(180_000);
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    for (const who of ['trumpet|trumpet', 'horn|hornF', 'altosax|altosax', 'trombone|trombone', 'tuba|tuba', 'snare|snare']) {
      const [m, gid] = who.split('|');
      const r = await page.evaluate(([m, gid, ids]) => {
        const sel = document.getElementById('inst'), o = [...sel.options].find(x => x.value === m + '|' + gid) || [...sel.options].find(x => x.value.startsWith(m + '|'));
        sel.value = o.value; Arcade.SongBoard.draw();
        const g = Arcade.groupsOf(m).find(x => x.id === o.value.split('|')[1]) || Arcade.groupFor(m), mem = g.members.find(x => x.id === m);
        return ids.map(id => {
          const i = MH_SONGS.findIndex(s => s.id === id), card = document.querySelector(`.song[data-i="${i}"]`), s = MH_SONGS[i];
          const map = Arcade.SongMap.forMember(s, mem, g, {}), ws = map.notes.map(n => n.midi).filter(x => x != null);
          const svgs = [...card.querySelectorAll('svg')];
          return {id, warn: !!card.querySelector('.warn'), svgs: svgs.length, bad: svgs.some(v => /NaN|undefined|Infinity/.test(v.outerHTML)),
            heads: card.querySelectorAll('svg .head').length, inRange: map.unpitched || (Math.min(...ws) >= mem.lowMidi && Math.max(...ws) <= mem.highMidi),
            lanes: Arcade.SongMap.lanes(s, map, g).lanes.length, max: map.unpitched ? 2 : Arcade.SongMap.MAX_LANES[s.tier]};
        });
      }, [m, gid, NEW]);
      for (const x of r) {
        expect(x.warn, `${x.id} ${m}`).toBe(false);
        expect(x.svgs, `${x.id} ${m}`).toBeGreaterThanOrEqual(2);      // concert rows + the instrument's rows
        expect(x.bad, `${x.id} ${m}`).toBe(false);
        expect(x.heads, `${x.id} ${m}`).toBeGreaterThan(10);
        expect(x.inRange, `${x.id} ${m}`).toBe(true);
        expect(x.lanes, `${x.id} ${m}`).toBeLessThanOrEqual(x.max);
      }
    }
    await expect(page.locator('.song').filter({hasText: 'The Stars and Stripes Forever'}).locator('.meta')).toContainText('¢ 2/2');
    watch.check();
  });

  test('THE RANGE RULE: every note of every tier 2–3 song is inside every instrument\'s GMEA range; trumpet unchanged', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, out = [], folded = {};
      MH_SONGS.filter(s => s.tier > 1).forEach(s => Arcade.PLAYERS.forEach(id => Arcade.groupsOf(id).forEach(g => {
        const mem = g.members.find(x => x.id === id); if (mem.pitched === false) return;
        const map = SM.forMember(s, mem, g, {});
        map.notes.forEach(n => { if (n.midi < mem.lowMidi || n.midi > mem.highMidi) out.push(`${s.id} ${id} ${n.midi}`); });
        const f = map.notes.filter(n => n.folded).length; if (f) folded[`${s.id} ${id}`] = f;
      })));
      return {out, folded};
    });
    expect(r.out).toEqual([]);
    // the notes moved by an octave (a song wider than the range); the trumpet never needs one
    expect(r.folded).toMatchObject({'the-merry-minstrels oboe': 3, 'the-merry-minstrels horn': 1, 'the-merry-minstrels tenorsax': 1,
      'march-of-the-toreadors oboe': 1, 'theme-from-the-barber-of-seville tenorsax': 4});
    expect(Object.keys(r.folded).filter(k => / trumpet$/.test(k))).toEqual([]);
    watch.check();
  });

  test('engraving: ¢ for 2/2; 6/8 beamed in threes, dotted-quarter rests, a tie across the middle; 3/8 beamed by the measure', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const E = o => Arcade.MHNotation.engrave(Object.assign({clef: null, header: 'full', events: []}, o));
      const ev = list => { let t = 0; return list.map(b => { const e = b < 0 ? {t, beats: -b, rest: true} : {t, beats: b, label: 'R'}; t += Math.abs(b); return e; }); };
      const cut = E({per: 4, timeSig: [2, 2], measures: 1, events: ev([.5, .5, .5, .5, 2])});
      const four = E({per: 4, timeSig: [4, 4], measures: 1, events: ev([1, 1, 1, 1])});
      const six = E({per: 3, timeSig: [6, 8], measures: 3, events: ev([.5, .5, .5, .5, .5, .5, -1.5, .5, .5, .5, 1, 1, 1])});
      const three = E({per: 1.5, timeSig: [3, 8], measures: 2, events: ev([.5, .5, .5, 1, .5])});
      const three8rest = E({per: 1.5, timeSig: [3, 8], measures: 1, events: ev([.5, -1])});
      // a real song: Lisbon Bay's first measure = a dotted-quarter rest + a quarter rest + an eighth
      const S = MH_SONGS.find(s => s.id === 'lisbon-bay'), g = Arcade.groupFor('trumpet'), map = Arcade.SongMap.forMember(S, g.members.find(x => x.id === 'trumpet'), g, {});
      const lis = Arcade.MHNotation.engrave({clef: map.clef, sig: map.sig, per: map.beatsPerMeasure, timeSig: S.timeSig, measures: 2, header: 'full',
        events: map.notes.filter(n => n.measure <= 2).map(n => ({t: n.t, beats: n.beats, n: n.n})).concat(map.rests.filter(x => x.measure <= 2).map(x => ({t: x.t, beats: x.beats, rest: true})))});
      return {cut: cut.svg.includes('cut-time'), cutBeams: cut.layout().beams, four: four.svg.includes('cut-time'),
        six: six.layout(), three: three.layout(), three8rest: three8rest.layout().pieces, lis: lis.layout().pieces.filter(p => p.t < 3)};
    });
    expect(r.cut).toBe(true);
    expect(r.four).toBe(false);
    expect(r.cutBeams).toEqual([[0, .5, 1, 1.5]]);                     // 2/2: beamed by the half note (one primary beat)
    // 6/8: two groups of three eighths in measure 1; the rest is ONE dotted quarter rest; the quarter across the middle
    // of measure 3 (beats 7–8) = an eighth TIED to an eighth
    expect(r.six.beams).toEqual([[0, .5, 1], [1.5, 2, 2.5], [4.5, 5, 5.5]]);
    expect(r.six.pieces.filter(p => p.rest)).toEqual([{t: 3, b: 1.5, rest: true, full: false, dot: true, tie: false}]);
    expect(r.six.pieces.filter(p => !p.rest && p.t >= 6).map(p => [p.t, p.b, p.tie])).toEqual([[6, 1, false], [7, .5, true], [7.5, .5, false], [8, 1, false]]);
    expect(r.three.beams).toEqual([[0, .5, 1]]);                       // 3/8: the measure's three eighths together
    expect(r.three.pieces.filter(p => p.t >= 1.5).map(p => [p.b, p.dot])).toEqual([[1, false], [.5, false]]);
    expect(r.three8rest.filter(p => p.rest).map(p => p.b)).toEqual([1]);   // a quarter rest after an eighth (never dotted there)
    expect(r.lis.filter(p => p.rest).map(p => [p.t, p.b, p.dot])).toEqual([[0, 1.5, true], [1.5, 1, false]]);
    watch.check();
  });

  test('grooves: 2/2 march in 2, 6/8 kick 1 snare 4 eighth hats, 3/8 one pulse; 3/4 stays the waltz', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const B = Arcade.MHBacking, pos = (g, d) => g.filter(h => h[1] === d).map(h => h[0]).sort((a, b) => a - b);
      const out = {};
      for (const [k, ts] of [['cut', [2, 2]], ['six', [6, 8]], ['three', [3, 8]], ['waltz', [3, 4]]]) {
        const g = B.groove('march', ts);
        out[k] = {kick: pos(g, 'kick'), snare: pos(g, 'snare'), hat: pos(g, 'hat'), strong: g.filter(h => h[1] === 'hat').sort((a, b) => b[2] - a[2]).slice(0, 2).map(h => h[0]).sort()};
      }
      out.waltzSame = JSON.stringify(B.groove('rock', [3, 4])) === JSON.stringify(B.GROOVES.waltz);
      return out;
    });
    expect(r.cut).toMatchObject({kick: [0], snare: [2], hat: [0, 1, 2, 3]});
    expect(r.six).toMatchObject({kick: [0], snare: [1.5], hat: [0, .5, 1, 1.5, 2, 2.5], strong: [0, 1.5]});
    expect(r.three).toMatchObject({kick: [0], snare: [], hat: [0, .5, 1]});
    expect(r.waltzSame).toBe(true);
    watch.check();
  });

  test('the count-in and the snare\'s DOWNBEATS RIGHT follow the primary beat', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, sn = Arcade.groupFor('snare');
      const song = (time, text) => ({id: 'm', tier: 2, tempo: 100, timeSig: time, key: 'Bb', style: 'march', notes: Arcade.MHSongText(text)});
      const st = s => SM.forMember(s, sn.members[0], sn, {sticking: 'downbeats'}).notes.map(n => n.stick).join('');
      return {m: [[4, 4], [3, 4], [2, 4], [2, 2], [6, 8], [3, 8]].map(ts => { const M = SM.meter(ts); return [M.pulse, M.countBars, M.countClicks, M.countBeats]; }),
        cut: st(song([2, 2], '1 2 3 4')), six: st(song([6, 8], '1:.5 2:.5 3:.5 4:.5 5:.5 6:.5')), three: st(song([3, 8], '1:.5 2:.5 3:.5')), four: st(song([4, 4], '1 2:.5 3:.5 4 5'))};
    });
    expect(r.m).toEqual([[1, 1, 4, 4], [1, 1, 3, 3], [1, 1, 2, 2], [2, 2, 4, 8], [1.5, 2, 4, 6], [1.5, 4, 4, 6]]);
    expect(r.cut).toBe('RLRL');                                         // halves on 1 and 3
    expect(r.six).toBe('RLLRLL');                                       // dotted quarters on 1 and 4
    expect(r.three).toBe('RLL');
    expect(r.four).toBe('RRLRR');                                       // 4/4 unchanged: every quarter
    watch.check();
  });

  // the three full-song runs one after another (never side by side in this file): a long main-thread stall on a busy
  // machine lets the game's miss sweep run before the test's autoPlay tick (a harness artifact, not the judging)
  test.describe('full songs', () => {
  test.describe.configure({mode: 'serial'});
  for (const [id, clicks] of [['the-stars-and-stripes-forever', [-8, -6, -4, -2]], ['lisbon-bay', [-6, -4.5, -3, -1.5]], ['the-merry-minstrels', [-6, -4.5, -3, -1.5]]]) {
    test(`?demo autoPlay: ${id} scores 100 % with no drift; the count-in (also after RESUME) is 4 primary beats`, async ({page, browserName}) => {
      test.setTimeout(150_000);
      const watch = await game(page, browserName);
      const i = await page.evaluate(id => MH_SONGS.findIndex(s => s.id === id), id);
      await page.evaluate(i => { Arcade.Highway.start(i); }, i);
      const m0 = await page.evaluate(() => Arcade.Highway.meter());
      expect(m0.clicks).toEqual(clicks);
      // pause after a few seconds, resume: back one measure, the same 4-click count-in on the primary beat
      await page.waitForFunction(() => Arcade.Highway.state().phase === 'play' && Arcade.Highway.state().t > 4, null, {timeout: 30_000});
      await page.evaluate(() => document.getElementById('uiPauseBtn').click());
      await expect.poll(() => page.evaluate(() => Arcade.Highway.paused())).toBe(true);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#uiPause button')].find(x => /resume/i.test(x.textContent)); b.click(); });
      await expect.poll(() => page.evaluate(() => Arcade.Highway.paused())).toBe(false);
      const m1 = await page.evaluate(() => Arcade.Highway.meter());
      expect(m1.clicks.map(c => +(c - m1.from).toFixed(3))).toEqual(clicks);
      expect(m1.from % m1.pulse).toBeCloseTo(0, 6);                     // resumed on a primary beat
      // then the whole song from the top, every note on time (autoPlay: through the real judging)
      await page.evaluate(i => { Arcade.Highway.start(i); Arcade.Highway.autoPlay(0); }, i);
      await expect(page.locator('#results')).toBeVisible({timeout: 90_000});
      const r = await page.evaluate(() => ({res: Arcade.Highway.results()}));
      expect(r.res.every(x => x === 'perfect'), r.res.join(' ')).toBe(true);
      await expect(page.locator('#results')).toContainText('100');
      watch.check();
    });
  }

  });

  test('drum hits sit exactly on the meter\'s grid (no drift) in each new meter', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', 'WebKit runs the game with SOUND OFF: no drums are scheduled');
    test.setTimeout(60_000);
    await game(page, browserName);
    await page.mouse.click(5, 5);                                       // a tap: the audio starts (the drums need it)
    for (const [id, grid] of [['the-stars-and-stripes-forever', [0, 1, 2, 3]], ['lisbon-bay', [0, .5, 1, 1.5, 2, 2.5]], ['the-merry-minstrels', [0, .5, 1]]]) {
      await page.evaluate(id => Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === id)), id);
      await page.waitForFunction(() => Arcade.Highway.state().t > 5, null, {timeout: 30_000});
      const m = await page.evaluate(() => Arcade.Highway.meter());
      expect(m.hits.length, id).toBeGreaterThan(8);
      for (const h of m.hits) {
        const inM = ((h % m.per) + m.per) % m.per;
        expect(grid.some(g => Math.abs(g - inM) < 1e-3) || Math.abs(inM - m.per) < 1e-3, `${id} hit at beat ${h}`).toBe(true);
      }
    }
  });
});
