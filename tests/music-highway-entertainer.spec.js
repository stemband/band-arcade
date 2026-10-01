/* MUSIC HIGHWAY: THE ENTERTAINER'S RHYTHM + "A BAR LINE AFTER EVERY MEASURE". The Entertainer's text used to run two
   measures per string with no bar line between them, so a missing sixteenth rest (beat 2 of measures 3, 7 and 11) was
   "paid back" by over-long tied notes and SongMap.check never saw it. Now: the corrected song (13 measures, the rest on
   beat 2 of measure 3, the ties exactly a sixteenth + a quarter, 100 % in ?demo), the new check (notes running more
   than one measure past a bar line are reported: the old text is caught), every song with a bar line after every
   measure, and every other song's events exactly as before (tests/fixtures/mh-song-events.json, taken before the fix). */
const {test, expect} = require('@playwright/test');
const {prepare, device, CPU_DRAWING} = require('./helpers');
test.use(CPU_DRAWING);                       // WebKit draws on the CPU here (helpers.js CPU_DRAWING: no page crashes on CI)
const BEFORE = require('./fixtures/mh-song-events.json');

const CAL = browser => Object.assign({gameData: {'music-highway': {calib: {speaker: {ms: 0}, headphones: {ms: 0}}}}}, browser === 'webkit' ? {sfx: false} : {});
async function board(page) {
  await page.goto('music-highway/songs.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.SongMap && window.MH_SONGS && Arcade.MHSongText);
}

test.describe('music highway: The Entertainer + a bar line after every measure', () => {
  test('The Entertainer: 13 measures, the sixteenth rest on beat 2 of measures 3, 7, 11, the trumpet part as written', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, s = MH_SONGS.find(x => x.id === 'the-entertainer'), ev = SM.events(s);
      const g = Arcade.groupFor('trumpet'), map = SM.forMember(s, g.members.find(x => x.id === 'trumpet'), g, {});
      const by = {}; map.notes.forEach(n => (by[n.measure] = by[n.measure] || []).push(n.label));
      return {i: MH_SONGS.indexOf(s), check: SM.check(s), measures: map.measures, total: ev.total, by,
        rests: ev.filter(e => e.rest).map(e => [e.measure, +(e.t % 2).toFixed(3), e.beats]),
        ties: ev.filter(e => e.tied).map(e => [e.measure, e.beats])};
    });
    expect(r.i).toBe(15);                                            // song 16: the stars saved for it stay where they are
    expect(r.check).toEqual([]);
    expect([r.measures, r.total]).toEqual([13, 26]);
    // a SIXTEENTH rest on beat 2 (1 beat into the measure) of measures 3, 7 and 11
    for (const m of [3, 7, 11]) expect(r.rests, `measure ${m}`).toContainEqual([m, 1, .25]);
    // the tied notes: exactly a sixteenth + a quarter, every time
    expect(r.ties).toEqual([[2, 1.25], [6, 1.25], [8, 1.25], [10, 1.25]]);
    expect(r.by).toEqual({1: ['D', 'D♯'], 2: ['E', 'C', 'E', 'C', 'E', 'C'], 3: ['C', 'D', 'D♯'], 4: ['E', 'C', 'D', 'E', 'B', 'D'], 5: ['C', 'D', 'D♯'],
      6: ['E', 'C', 'E', 'C', 'E', 'C'], 7: ['A', 'G', 'F♯'], 8: ['A', 'C', 'E', 'D', 'C', 'A', 'D'], 9: ['D', 'D♯'], 10: ['E', 'C', 'E', 'C', 'E', 'C'],
      11: ['C', 'D', 'D♯'], 12: ['E', 'C', 'D', 'E', 'B', 'D'], 13: ['C']});
    watch.check();
  });

  test('the check reports a stretch of more than one measure with no bar line (the old Entertainer text is caught)', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, N = Arcade.MHSongText;
      const old = {id: 'old-entertainer', tier: 3, tempo: 76, timeSig: [2, 4], key: 'Bb', style: 'march', notes: N('r:1.5 2:.25 #2:.25',
        "3:.25 1':.5 3:.25 1':.5 3:.25 1':1.25 1':.25 2':.25 #2':.25 3':.25", "1':.25 2':.25 3':.5 7:.25 2':.5 1':1.25 r:.5 2:.25 #2:.25")};
      const ok = {id: 'one-bar-each', tier: 2, tempo: 100, timeSig: [3, 4], key: 'Bb', style: 'waltz', notes: N('1 2 3 | 4:3~ | 4 5 6 | 1:3')};
      return {old: SM.check(old), ok: SM.check(ok)};
    });
    expect(r.old).toContain('old-entertainer: measure 2 has no bar line after it (add | so each measure is checked)');
    expect(r.ok).toEqual([]);
    // the Song Board shows it too: every song there is clean today
    await expect(page.locator('.song .warn')).toHaveCount(0);
    watch.check();
  });

  test('every song has a bar line after every measure, and every other song plays exactly as before', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, out = {noBar: [], events: {}};
      MH_SONGS.forEach(s => {
        const per = SM.beatsPer(s); let t = 0, last = 0;
        s.notes.forEach(n => { if (n.bar) { if (t - last > per + 1e-6) out.noBar.push(s.id + ' @' + last); last = t; } else t += n.rest != null ? n.rest : n.beats; });
        if (t - last > per + 1e-6) out.noBar.push(s.id + ' @' + last);
        out.events[s.id] = SM.events(s);
      });
      return out;
    });
    expect(r.noBar).toEqual([]);
    for (const [id, ev] of Object.entries(BEFORE)) expect(JSON.parse(JSON.stringify(r.events[id])), id).toEqual(ev);
    expect(Object.keys(BEFORE).length).toBe(Object.keys(r.events).length - 1);    // all but The Entertainer
    watch.check();
  });

  test('?demo autoPlay: The Entertainer scores 100 %', async ({page, browserName}) => {
    test.setTimeout(90_000);
    const watch = await prepare(page, {store: device('trumpet', CAL(browserName))});
    await page.goto('music-highway/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.Highway && Arcade.session && window.MH_SONGS);
    await page.evaluate(() => { Arcade.session.mark('mh-calibrated-speaker'); Arcade.session.mark('mic-reminder'); });
    await page.evaluate(() => { Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === 'the-entertainer')); Arcade.Highway.autoPlay(0); });
    await expect(page.locator('#results')).toBeVisible({timeout: 60_000});
    const res = await page.evaluate(() => Arcade.Highway.results());
    expect(res.length).toBe(54);
    expect(res.every(x => x === 'perfect'), res.join(' ')).toBe(true);
    await expect(page.locator('#results')).toContainText('100');
    watch.check();
  });
});
