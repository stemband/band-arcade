/* MUSIC HIGHWAY SONGS (music-highway/songs.js + song-map.js): the NOTE TEXT tie ('~': one held note in the game, each
   side counted in its own measure, a bad tie reported), and the seven songs added from Mr. Graham's trumpet book:
   they parse, pass the bar check, come out for trumpet exactly as the book, fit every tested instrument's range and
   lanes, and each has its (optional) backing-drums event on the Sound Board. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const NEW = ['good-king-wenceslas', 'orpheus-can-can', 'come-from-sydney', 'donkey-riding', 'frogs-song', 'san-sereni', 'nutcracker-theme'];

async function board(page) {
  await page.goto('music-highway/songs.html?demo');
  await page.waitForFunction(() => window.Arcade && Arcade.SongMap && window.MH_SONGS && Arcade.MHSongText);
}

test.describe('music highway songs', () => {
  test('a tie (~) is ONE held note in the game, each side counted in its own measure; a bad tie is reported', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(() => {
      const SM = Arcade.SongMap, N = Arcade.MHSongText;
      const song = {id: 'tie-test', tier: 2, tempo: 100, timeSig: [2, 4], key: 'Bb', style: 'rock', notes: N('5:2~ | 5 4 | 3:2~ | 3:2')};
      const ev = SM.events(song).filter(e => !e.rest);
      const bad = {id: 'bad-tie', tier: 2, tempo: 100, timeSig: [2, 4], key: 'Bb', style: 'rock', notes: N('5:2~ | 4 4 | 3:2~ | r:2')};
      const short = {id: 'short-measure', tier: 2, tempo: 100, timeSig: [2, 4], key: 'Bb', style: 'rock', notes: N('5:3~ | 5 4')};
      const g = Arcade.groupFor('trumpet'), m = g.members.find(x => x.id === 'trumpet');
      const map = SM.forMember(song, m, g, {});
      const snare = Arcade.groupFor('snare');
      return {parsed: song.notes.filter(n => !n.bar).map(n => n.tie ? 'tie' : n.deg), check: SM.check(song),
        ev: ev.map(e => [e.t, e.beats, e.measure, e.tied || 1]), total: SM.events(song).total,
        badCheck: SM.check(bad), shortCheck: SM.check(short),
        notes: map.notes.map(n => n.beats), snare: SM.forMember(song, snare.members[0], snare, {}).notes.map(n => n.stick).join('')};
    });
    expect(r.parsed).toEqual(['tie', 5, 4, 'tie', 3]);
    expect(r.check).toEqual([]);                                     // 2 + (1 + 1) + 2 + 2: every measure adds up
    expect(r.ev).toEqual([[0, 3, 1, 2], [3, 1, 2, 1], [4, 4, 3, 2]]);  // three notes: G held 3 beats, F, D held 4 beats
    expect(r.total).toBe(8);
    expect(r.notes).toEqual([3, 1, 4]);                              // one pad (one longer trail) per tied pair
    expect(r.snare).toBe('RRR');                                     // the snare: one stroke per held note (each starts a measure: R)
    expect(r.badCheck.join(' ')).toMatch(/tied \(~\) but the next note isn't the same note/);
    expect(r.badCheck.length).toBe(2);                               // 5~ into 4, and 3~ into a rest
    expect(r.shortCheck.join(' ')).toMatch(/measure 1/i);            // the bar check still counts each side on its own
    watch.check();
  });

  test('the seven new songs: at the END, parse, pass the check, trumpet exactly as the book, ranges and lanes fit', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const r = await page.evaluate(ids => {
      const SM = Arcade.SongMap, nm = n => n.letter + (n.acc > 0 ? '#' : n.acc < 0 ? 'b' : '') + n.oct;
      const out = {order: MH_SONGS.slice(-7).map(s => s.id), count: MH_SONGS.length, first16: MH_SONGS[15].id, checks: MH_SONGS.flatMap(s => SM.check(s)), songs: {}};
      for (const id of ids) {
        const s = MH_SONGS.find(x => x.id === id), per = {};
        for (const [m, horn] of [['trumpet'], ['flute'], ['altosax'], ['horn', 'F'], ['horn', 'C'], ['snare']]) {
          const g = Arcade.groupFor(m, {hornStart: horn || 'F'}), mem = g.members.find(x => x.id === m);
          const map = SM.forMember(s, mem, g, {}), ns = map.notes, L = SM.lanes(s, map, g);
          const ws = ns.map(n => n.midi).filter(x => x != null);
          per[m + (horn || '')] = {first: ns.slice(0, 4).map(n => n.stick || nm(n.n)).join(' '), sig: map.sig ? map.sig.count + map.sig.type : '',
            // the GMEA range; a tier-1 song may also use the group's own first five (the C–G horn's G5 is above F5)
            inRange: map.unpitched || (Math.min(...ws) >= mem.lowMidi && Math.max(...ws) <= Math.max(mem.highMidi, s.tier === 1 ? Math.max(...L.lanes.flatMap(l => l.midis)) : 0)),
            lanes: L.lanes.length, max: SM.MAX_LANES[s.tier], notes: ns.length,
            firstFive: s.tier === 1 && !map.unpitched ? L.lanes.map(l => l.label).join(',') : null};
        }
        out.songs[id] = {tier: s.tier, key: s.key, per, drums: !!Arcade.Sounds.get('mh-drums-' + id)};
      }
      return out;
    }, NEW);
    expect(r.order).toEqual(NEW);                                    // added at the end, in this order
    expect(r.count).toBe(23);
    expect(r.first16).toBe('the-entertainer');                       // the old songs keep their numbers
    expect(r.checks).toEqual([]);
    const S = r.songs;
    // TRUMPET exactly as the book (written C major = concert B♭, written F major = concert E♭)
    expect([S['good-king-wenceslas'].per.trumpet.first, S['good-king-wenceslas'].per.trumpet.sig]).toEqual(['F4 F4 F4 G4', '']);
    expect([S['donkey-riding'].per.trumpet.first, S['donkey-riding'].per.trumpet.sig]).toEqual(['F4 G4 A4 A4', '1b']);
    expect([S['nutcracker-theme'].per.trumpet.first, S['nutcracker-theme'].per.trumpet.sig]).toEqual(['F4 E4 F4 E4', '1b']);
    expect(S['orpheus-can-can'].per.trumpet.first).toBe('C4 D4 F4 E4');
    expect(S['come-from-sydney'].per.trumpet.first).toBe('G4 G4 E4 E4');
    expect(S['frogs-song'].per.trumpet.first).toBe('C4 D4 E4 F4');
    expect(S['san-sereni'].per.trumpet.first).toBe('G4 E4 F4 G4');
    // the other instruments: in their own written key
    expect(S['good-king-wenceslas'].per.flute.first).toBe('Eb5 Eb5 Eb5 F5');
    expect(S['good-king-wenceslas'].per.altosax.first).toBe('C5 C5 C5 D5');
    expect(S['good-king-wenceslas'].per.hornF.first).toBe('Bb4 Bb4 Bb4 C5');
    expect(S['donkey-riding'].per.altosax.sig).toBe('');             // E♭ concert = alto sax C major
    for (const id of NEW) {
      const s = S[id];
      expect(s.drums, id).toBe(true);                                // mh-drums-<id> (optional file; the built-in groove plays without it)
      for (const [who, p] of Object.entries(s.per)) {
        expect(p.inRange, `${id} ${who}`).toBe(true);
        expect(p.lanes, `${id} ${who}`).toBeLessThanOrEqual(who === 'snare' ? 2 : p.max);
        if (p.firstFive) expect(p.lanes, `${id} ${who}: tier 1 = the first five`).toBe(5);
      }
    }
    expect(S['san-sereni'].per.trumpet.notes).toBe(21);              // 23 written notes, two ties
    watch.check();
  });

  test('the Song Board draws the new songs, ties included, and the Sound Board lists their drum files', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await board(page);
    const card = page.locator('.song').filter({hasText: 'San Serení'});
    await expect(card).toBeVisible();
    await expect(card.locator('svg path.tie').first()).toBeAttached();
    await page.goto('sound-board/index.html');
    await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard);
    for (const id of NEW) await expect(page.locator(`.sb-row[data-n="mh-drums-${id}"]`)).toBeAttached();
    watch.check();
  });
});
