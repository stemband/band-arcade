/* MUSIC HIGHWAY SLURS: the NOTE TEXT slur '( … )' (across bar lines, with a tie inside, the reader's reports for an
   unclosed '(' and friends), the slur arc on the staff (opposite the stems, the snare draws none), the ribbon between
   slurred pads, judging UNCHANGED (the same results whether slurred notes arrive tongued or smooth), and the feedback:
   SMOOTH vs "tongued" and the after-song tip (feedback only), with the Slur tips setting. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const FROG = 20, SYDNEY = 18;                       // song indexes (0-based)
const CAL = browser => Object.assign({gameData: {'music-highway': {calib: {speaker: {ms: 0}, headphones: {ms: 0}}}}}, browser === 'webkit' ? {sfx: false} : {});

async function board(page) {
  await page.goto('music-highway/songs.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.SongMap && window.MH_SONGS && Arcade.MHSongText && Arcade.MHNotation);
}
/** play one song start to finish through the game's own autoPlay hook; returns what the tests look at */
async function play(page, i, o) {
  await page.evaluate(([i, o]) => { Arcade.Highway.start(i); Arcade.Highway.autoPlay(0, o); }, [i, o]);
  await expect(page.locator('#results')).toBeVisible({timeout: 60_000});
  return page.evaluate(() => ({log: Arcade.Highway.slurLog(), tip: Arcade.Highway.slurTip(), tipShown: document.getElementById('slurTip') ? document.getElementById('slurTip').textContent : null,
    counts: [...document.querySelectorAll('#resCounts span')].map(s => s.textContent), results: Arcade.Highway.results()}));
}
async function game(page, browserName, member = 'trumpet', extra = {}) {
  const store = device(member, CAL(browserName));
  Object.assign(store.gameData['music-highway'], extra);
  const watch = await prepare(page, {store});
  await page.goto('music-highway/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Highway && Arcade.session);
  await page.evaluate(() => { Arcade.session.mark('mh-calibrated-speaker'); Arcade.session.mark('mh-calibrated-headphones'); });
  return watch;
}

test.describe('music highway slurs', () => {
  test('NOTE TEXT: a slur group, across a bar line, with a tie inside; the reader reports a bad slur', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const N = Arcade.MHSongText, SM = Arcade.SongMap;
      const song = (id, notes, time = [4, 4]) => ({id, tier: 2, tempo: 100, timeSig: time, key: 'Bb', style: 'rock', notes});
      const a = N('(3 4 5) 4 3 r'), ev = x => SM.events(x).filter(e => !e.rest).map(e => [e.deg, e.slur, !!e.slurFirst, !!e.slurLast]);
      const across = song('across', N('3 3 (5 | 4 3) 2 | 1:3'), [3, 4]);
      const tied = song('tied', N('(3:2~ | 3 2) | 1:2 | r:2 | r:2'), [2, 4]);
      return {plain: a.filter(n => !n.bar).map(n => n.slur || 0), ev: ev(song('a', a)), across: ev(across), acrossCheck: SM.check(across),
        tied: ev(tied), tiedCheck: SM.check(tied),
        unclosed: SM.check(song('u', N('(3 4 5 | 1:4'))), stray: SM.check(song('s', N('3 4) 5 1'))),
        nested: SM.check(song('n', N('(3 (4 5) 1)'))), single: SM.check(song('o', N('(3) 4 5 1'))),
        rest: SM.check(song('r', N('(3 r 5) 1'))), tieOk: SM.check(song('t', N('(5:2~ | 5 4) 3:2', '')))};
    });
    expect(r.plain).toEqual([1, 1, 1, 0, 0, 0]);
    expect(r.ev).toEqual([[3, 1, true, false], [4, 1, false, false], [5, 1, false, true], [4, null, false, false], [3, null, false, false]]);
    expect(r.across).toEqual([[3, null, false, false], [3, null, false, false], [5, 1, true, false], [4, 1, false, false], [3, 1, false, true], [2, null, false, false], [1, null, false, false]]);
    expect(r.acrossCheck).toEqual([]);
    expect(r.tied).toEqual([[3, 1, true, false], [2, 1, false, true], [1, null, false, false]]);   // the tied pair = one note
    expect(r.tiedCheck).toEqual([]);
    expect(r.unclosed.join(' ')).toMatch(/slur "\(" is never closed/);
    expect(r.stray.join(' ')).toMatch(/"\)" with no "\("/);
    expect(r.nested.join(' ')).toMatch(/slur "\(" inside another slur/);
    expect(r.single.join(' ')).toMatch(/slur around a single note/);
    expect(r.rest.join(' ')).toMatch(/rest inside a slur/);
    // every song in the list reads cleanly (their slurs are closed)
    expect(await page.evaluate(() => MH_SONGS.flatMap(s => Arcade.SongMap.check(s)))).toEqual([]);
    watch.check();
  });

  test('the staff draws a slur arc opposite the stems (across a bar line too); the Song Board shows them; the snare draws none', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const A = Arcade, n = (letter, oct) => ({letter, acc: 0, oct});
      // low notes (stems up) → the arc UNDER the heads; high notes (stems down) → OVER them; a slur across the bar line
      const draw = notes => {
        const E = A.MHNotation.engrave({clef: 'treble', sig: null, per: 2, timeSig: [2, 4], measures: 2, header: 'none',
          events: notes.map((x, i) => ({t: i, beats: 1, n: x, label: x.letter, slur: 1, slurFirst: i === 0, slurLast: i === notes.length - 1}))});
        const box = document.createElement('div'); box.innerHTML = E.svg; document.body.appendChild(box);
        const arc = box.querySelector('path.slur'), heads = [...box.querySelectorAll('.head')].map(h => h.getBBox());
        const b = arc && arc.getBBox(), out = {arcs: box.querySelectorAll('path.slur').length, bars: E.bars,
          x: b && [b.x, b.x + b.width], under: b && b.y + b.height / 2 > Math.max(...heads.map(h => h.y + h.height / 2)),
          over: b && b.y + b.height / 2 < Math.min(...heads.map(h => h.y + h.height / 2))};
        box.remove(); return out;
      };
      return {low: draw([n('C', 4), n('D', 4), n('E', 4), n('F', 4)]), high: draw([n('C', 5), n('D', 5), n('E', 5), n('F', 5)])};
    });
    expect([r.low.arcs, r.low.under, r.high.arcs, r.high.over]).toEqual([1, true, 1, true]);
    expect(r.low.x[0]).toBeLessThan(r.low.bars[1]);                     // one arc across the bar line
    expect(r.low.x[1]).toBeGreaterThan(r.low.bars[1]);
    // the Song Board: The Frog's Song has its three phrase slurs on each staff; the snare's staff has none
    const frog = page.locator('.song').filter({hasText: "The Frog's Song"}).first();
    expect(await frog.locator('path.slur').count()).toBeGreaterThanOrEqual(6);
    await page.selectOption('#inst', {label: 'Snare Drum'});
    await expect.poll(() => frog.locator('svg').count()).toBeGreaterThan(0);
    // the snare's own (one-line) rows have none; the concert-pitch rows above them still do
    const rows = await page.evaluate(() => { const s = [...document.querySelectorAll('.song')].find(e => e.textContent.includes("The Frog's Song"));
      const all = [...s.querySelectorAll('svg.mh-staffsvg')], five = svg => !!svg.querySelector('line[y1="56"]');
      return {snare: all.filter(x => !five(x)).map(x => x.querySelectorAll('path.slur').length), concert: all.filter(five).map(x => x.querySelectorAll('path.slur').length)}; });
    expect(rows.snare.length).toBeGreaterThan(0);
    expect(rows.snare.every(n => n === 0)).toBe(true);
    expect(rows.concert.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3);
    watch.check();
  });

  test('judging is unchanged; the feedback marks tongued vs smooth arrivals; the tip only when slurs were tongued', async ({page, browserName}) => {
    const watch = await game(page, browserName);
    const smooth = await play(page, FROG, {slur: 'smooth'});
    const tongue = await play(page, FROG, {slur: 'tongue'});
    // the same judging either way: every judgment count (the hold bonus depends on the autoPlay's hold timer, not on slurs)
    expect(tongue.counts.slice(0, 6)).toEqual(smooth.counts.slice(0, 6));
    expect(tongue.results).toEqual(smooth.results);
    // Frog's Song: 3 phrase slurs, 7 + 6 + 6 notes after the first of each (a tie inside would count once)
    expect(smooth.log.length).toBeGreaterThan(10);
    expect(smooth.log.every(x => x.art === 'smooth')).toBe(true);
    expect(tongue.log.every(x => x.art === 'tongued')).toBe(true);
    expect([smooth.tip, smooth.tipShown]).toEqual(['', null]);
    expect(tongue.tip).toMatch(/^Measure \d+: slur it! One air stream, move only your fingers\.$/);
    expect(tongue.tipShown).toBe(tongue.tip);
    watch.check();
  });

  test('the pops during the song, the ribbon, the trombone wording and Slur tips: Off', async ({page, browserName}) => {
    const watch = await game(page, browserName, 'trombone');
    const pops = await page.evaluate(i => new Promise(res => {
      const seen = new Set(), H = Arcade.Highway;
      H.start(i); H.autoPlay(0, {slur: 'smooth'});
      const iv = setInterval(() => {
        const j = document.getElementById('judge'); if (j) j.querySelectorAll('.mh-art').forEach(e => seen.add(e.className));
        const r = document.getElementById('results'); if (r && !r.hidden && getComputedStyle(r).display !== 'none') { clearInterval(iv); res({seen: [...seen]}); }
      }, 20);
    }), SYDNEY);
    expect(pops.seen).toContain('mh-art smooth');
    const t = await play(page, SYDNEY, {slur: 'tongue'});
    expect(t.tip).toMatch(/^Measure \d+: slur it! Keep the air moving through the slide change; a light "doo" is OK\.$/);
    // Slur tips: Off (the shared Settings panel): no pops, no tip
    await page.evaluate(() => Arcade.UI.settings.open({}));
    await page.locator('#uiSettings [aria-labelledby=mhSetSlur] button[data-v=false]').click();
    await page.keyboard.press('Escape');
    const off = await play(page, SYDNEY, {slur: 'tongue'});
    expect([off.tip, off.tipShown]).toEqual(['', null]);
    expect(off.log.length).toBeGreaterThan(0);                            // still measured, just not shown
    expect(await page.evaluate(() => Arcade.store.gameData('music-highway').slurTips)).toBe(false);
    watch.check();
  });

  for (const member of ['trumpet', 'snare']) {
    test(`the highway joins slurred pads with a ribbon (${member})`, async ({page, browserName}) => {
      const watch = await game(page, browserName, member);
      await page.evaluate(i => Arcade.Highway.start(i), FROG);
      const links = await page.evaluate(() => Arcade.Highway.slurLinks());
      // Frog's Song: 7 notes in each of its three slurs = 18 links; the snare ignores slurs
      if (member === 'snare') expect(links).toEqual([]);
      else { expect(links.length).toBe(18); expect(links.every(([a, b]) => b === a + 1)).toBe(true); }
      await page.evaluate(() => Arcade.Highway.autoPlay(0));
      await expect(page.locator('#results')).toBeVisible({timeout: 60_000});
      watch.check();
    });
  }
});
