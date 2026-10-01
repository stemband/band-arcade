/* MUSIC HIGHWAY: THE FINAL BOSS (tier 4), "Flight of the Bumblebee". The song (the last one, tier 4, passes the bar
   check, ≤ 12 lanes and no merged lane for any instrument, the snare's 57 strokes alternating), the unlock (stars on 3
   tier-3 songs; ?demo opens it), the intro card (once a play session, before the song), the swarm over the road (a hit =
   a happy loop, a miss = a buzz past the gate; still under reduced motion), ?demo autoPlay at NORMAL and TURBO (100 %
   PERFECT), the pads' spacing at boss speed, the TAMER / LEGEND badges and the two avatar unlocks, maxStars. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const ID = 'flight-of-the-bumblebee';
const CAL = (browser, extra = {}) => Object.assign({gameData: {'music-highway': Object.assign({calib: {speaker: {ms: 0}, headphones: {ms: 0}}}, extra)}}, browser === 'webkit' ? {sfx: false} : {});

async function game(page, browserName, {demo = true, extra = {}, store = {}, reduced = false} = {}) {
  if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
  const watch = await prepare(page, {store: Object.assign(device('trumpet', CAL(browserName, extra)), store)});
  await page.goto(`music-highway/index.html?${demo ? 'demo&' : ''}nostart`);
  await page.waitForFunction(() => window.Arcade && Arcade.Highway && Arcade.session && window.MH_SONGS);
  await page.evaluate(() => { Arcade.session.mark('mh-calibrated-speaker'); Arcade.session.mark('mic-reminder'); });
  return watch;
}
/** the boss from the song select's START (the intro card, READY), then every note on time through the real judging */
async function playBoss(page, {offsets = 0, intro = true} = {}) {
  await page.evaluate(id => Arcade.Highway.begin(MH_SONGS.findIndex(s => s.id === id), {guide: false}), ID);
  if (intro) { await expect(page.locator('#intro')).toBeVisible(); await page.click('#introGo'); }
  await page.waitForFunction(() => Arcade.Highway.state().phase === 'play', null, {timeout: 20_000});
  await page.evaluate(o => Arcade.Highway.autoPlay(o), offsets);
  await expect(page.locator('#results')).toBeVisible({timeout: 60_000});
  return page.evaluate(() => ({res: Arcade.Highway.results(), text: document.getElementById('results').innerText}));
}

test.describe('music highway: the FINAL BOSS', () => {
  test('the song: last, tier 4, every note slurred, passes the check, ≤ 12 lanes and no merged lane for every instrument, maxStars 141', async ({page, browserName}) => {
    const watch = await game(page, browserName);
    const r = await page.evaluate(id => {
      const SM = Arcade.SongMap, i = MH_SONGS.findIndex(s => s.id === id), s = MH_SONGS[i], per = {};
      Arcade.PLAYERS.forEach(m => Arcade.groupsOf(m).forEach(g => {
        const mem = g.members.find(x => x.id === m), map = SM.forMember(s, mem, g, {}), L = SM.lanes(s, map, g);
        const ws = map.notes.map(n => n.midi).filter(x => x != null);
        per[m + '|' + g.id] = {lanes: L.lanes.length, merged: L.lanes.filter(l => l.merged).length, notes: map.notes.length,
          inRange: map.unpitched || (Math.min(...ws) >= mem.lowMidi && Math.max(...ws) <= mem.highMidi), sticks: map.notes.map(n => n.stick || '').join('')};
      }));
      const tr = Arcade.groupFor('trumpet'), tm = SM.forMember(s, tr.members.find(x => x.id === 'trumpet'), tr, {});
      return {last: i === MH_SONGS.length - 1, tier: s.tier, check: SM.check(s), per, max: Arcade.ALL_GAMES.find(g => g.id === 'music-highway').maxStars,
        n: MH_SONGS.length, trumpet: tm.notes.map(n => n.label).join(' '), key: tm.writtenKey,
        slur: SM.events(s).filter(e => !e.rest).map(e => [e.slur, !!e.slurFirst, !!e.slurLast])};
    }, ID);
    expect([r.last, r.tier, r.check]).toEqual([true, 4, []]);
    expect(r.max).toBe(r.n * 3);
    expect(r.max).toBe(141);
    expect(r.key).toBe('A minor');
    // every note under ONE slur, from the first note to the last (the final rest stays outside it)
    expect(r.slur.length).toBe(57);
    expect(r.slur.every(x => x[0] === 1)).toBe(true);
    expect(r.slur.map(x => x[1]).indexOf(true)).toBe(0);
    expect(r.slur.map(x => x[2]).lastIndexOf(true)).toBe(56);
    expect(r.slur.filter(x => x[1] || x[2]).length).toBe(2);
    expect(r.trumpet.split(' ').slice(0, 8).join(' ')).toBe('E D♯ D C♯ C F E D♯');
    expect(r.trumpet.split(' ').slice(32, 57).join(' ')).toBe('E F E D♯ E F E D♯ E F♯ G G♯ A B♭ A G♯ A G♯ G F♯ F F♯ G G♯ A');
    for (const [who, p] of Object.entries(r.per)) {
      expect(p.lanes, who).toBeLessThanOrEqual(12);
      expect(p.merged, who).toBe(0);
      expect(p.inRange, who).toBe(true);
      expect(p.notes, who).toBe(57);
    }
    // the snare: two sticking lanes, alternating hand to hand (every measure starts with R)
    expect(r.per['snare|snare'].lanes).toBe(2);
    expect(r.per['snare|snare'].sticks).toBe('RLRLRLRL'.repeat(7) + 'R');
    watch.check();
  });

  test('locked until stars on 3 tier-3 songs (its own FINAL BOSS section, the bee silhouette), open in ?demo', async ({page, browserName}) => {
    await game(page, browserName, {demo: false});
    const boss = page.locator('.mh-song.mh-boss');
    await expect(page.locator('#bossHead')).toHaveText(/final boss/i);
    await expect(boss).toHaveClass(/ls-locked/);
    await expect(boss.locator('.mh-bee-sil')).toBeAttached();
    expect(await page.evaluate(() => { const g = document.getElementById('songGrid'), k = [...g.children]; return k.indexOf(document.getElementById('bossHead')) === k.length - 2; })).toBe(true);
    // stars on 2 tier-3 songs: still locked; on 3: open
    const seed = async n => page.evaluate(n => {
      const idx = MH_SONGS.map((s, i) => s.tier === 3 ? i : -1).filter(i => i >= 0).slice(0, n);
      idx.forEach(i => Arcade.store.setLevel('music-highway', 'trumpet', i + 1, {stars: 1, best: 100}, 1));
    }, n);
    await seed(2); await page.reload(); await page.waitForFunction(() => window.Arcade && Arcade.Highway);
    await expect(page.locator('.mh-song.mh-boss')).toHaveClass(/ls-locked/);
    await seed(3); await page.reload(); await page.waitForFunction(() => window.Arcade && Arcade.Highway);
    await expect(page.locator('.mh-song.mh-boss')).not.toHaveClass(/ls-locked/);
    await expect(page.locator('.mh-song.mh-boss .mh-bee-sil')).toHaveCount(0);
    // ?demo: open from the start
    const p2 = await page.context().newPage();
    await p2.goto('music-highway/index.html?demo&nostart');
    await p2.waitForFunction(() => window.Arcade && Arcade.Highway);
    await expect(p2.locator('.mh-song.mh-boss')).not.toHaveClass(/ls-locked/);
  });

  test('NORMAL: the intro card (once a session), the swarm, 100 % PERFECT, the TAMER badge and the Bumblebee pet', async ({page, browserName}) => {
    test.setTimeout(120_000);
    const watch = await game(page, browserName);
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('pet', 'bumblebee'))).toBe(false);
    await page.mouse.click(5, 5);                                     // a tap: the audio starts (the sting needs it)
    await page.evaluate(id => Arcade.Highway.begin(MH_SONGS.findIndex(s => s.id === id), {guide: false}), ID);
    await expect(page.locator('#introTitle')).toHaveText('FINAL BOSS: FLIGHT OF THE BUMBLEBEE');
    await expect(page.locator('#introText')).toContainText('Sixteenth notes all the way');
    await expect(page.locator('#introGo')).toHaveText(/ready/i);
    if (browserName !== 'webkit') expect(await page.evaluate(() => Arcade.Sfx.history.some(h => /mh-boss-intro|special-alert/.test(h.name || h)))).toBe(true);
    await page.click('#introGo');
    await page.waitForFunction(() => Arcade.Highway.state().phase === 'play', null, {timeout: 20_000});
    await page.evaluate(() => Arcade.Highway.autoPlay(0));
    await page.waitForFunction(() => { const s = Arcade.Highway.boss().swarm; return s && s.loops >= 3; }, null, {timeout: 20_000});
    const sw = await page.evaluate(() => Arcade.Highway.boss().swarm);
    expect(sw.n).toBeGreaterThanOrEqual(5); expect(sw.n).toBeLessThanOrEqual(8);
    expect([sw.drawn, sw.still]).toEqual([true, false]);
    // the pads at boss speed: readable and never overlapping (the gap between two sixteenths at the gates)
    const sp = await page.evaluate(() => Arcade.Highway.spacing());
    expect(sp.gapPx).toBeGreaterThan(0);
    console.log('boss spacing NORMAL:', JSON.stringify(sp));
    await expect(page.locator('#results')).toBeVisible({timeout: 60_000});
    const r = await page.evaluate(() => ({res: Arcade.Highway.results(), text: document.getElementById('results').innerText}));
    expect(r.res.every(x => x === 'perfect'), r.res.join(' ')).toBe(true);
    expect(r.text).toContain('BUMBLEBEE TAMER badge earned!');
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('pet', 'bumblebee'))).toBe(true);
    expect(await page.evaluate(() => Arcade.Avatar.isUnlocked('back', 'beewings'))).toBe(false);
    // the song card shows the badge; a second START this session skips the intro card
    await page.click('#resLevels');
    await expect(page.locator('.mh-song.mh-boss .mh-tamer')).toContainText('BUMBLEBEE TAMER');
    await expect(page.locator('.mh-song.mh-boss .mh-legend')).toHaveCount(0);
    await page.evaluate(id => Arcade.Highway.begin(MH_SONGS.findIndex(s => s.id === id), {guide: false}), ID);
    await page.waitForFunction(() => Arcade.Highway.state().phase !== 'menu', null, {timeout: 20_000});
    expect(await page.evaluate(() => Arcade.Highway.boss().intros)).toBe(1);
    watch.check();
  });

  test('TURBO: 100 % PERFECT, readable pads, the LEGEND badge and Bee Wings', async ({page, browserName}) => {
    test.setTimeout(120_000);
    const watch = await game(page, browserName, {extra: {speed: 'turbo'}});
    const r = await playBoss(page);
    expect(r.res.every(x => x === 'perfect'), r.res.join(' ')).toBe(true);
    expect(r.text).toContain('BUMBLEBEE LEGEND badge earned!');
    expect(r.text).toContain('⚡ TURBO badge earned!');
    expect(await page.evaluate(() => [Arcade.Avatar.isUnlocked('pet', 'bumblebee'), Arcade.Avatar.isUnlocked('back', 'beewings'),
      Arcade.store.gameData('music-highway').achievements['bumblebee-legend']])).toEqual([true, true, true]);
    await page.click('#resLevels');
    await expect(page.locator('.mh-song.mh-boss .mh-legend')).toContainText('BUMBLEBEE LEGEND');
    // the spacing at TURBO (the same rules: smaller pads only if too fast to read, never overlapping)
    await page.evaluate(id => Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === id)), ID);
    const sp = await page.evaluate(() => Arcade.Highway.spacing());
    console.log('boss spacing TURBO:', JSON.stringify(sp));
    expect(sp.gapPx).toBeGreaterThan(0);
    // and no two pads in a lane ever overlap on the road, anywhere in the song
    const overlap = await page.evaluate(() => { let worst = Infinity; const tot = Arcade.Highway.pauses().dur;
      for (let t = 0; t < tot; t += .05) { const by = {};
        Arcade.Highway.cardRects(t).forEach(r => (by[r.lane] = by[r.lane] || []).push(r));
        Object.values(by).forEach(R => { R.sort((a, b) => a.y0 - b.y0); for (let i = 1; i < R.length; i++) worst = Math.min(worst, R[i].y0 - R[i - 1].y1); }); }
      return worst; });
    console.log('boss TURBO: smallest gap between two pads in one lane (px):', overlap);
    expect(overlap).toBeGreaterThan(0);
    // and between the pads of two notes in a row, whatever their lanes (the gap the spacing rule keeps)
    const seq = await page.evaluate(() => { let worst = Infinity; const tot = Arcade.Highway.pauses().dur;
      for (let t = 0; t < tot; t += .05) { const R = Arcade.Highway.cardRects(t).sort((a, b) => a.k - b.k);
        for (let i = 1; i < R.length; i++) if (R[i].k === R[i - 1].k + 1) worst = Math.min(worst, R[i - 1].y0 - R[i].y1); }
      return worst; });
    console.log('boss TURBO: smallest gap between two notes in a row (px):', seq);
    expect(seq).toBeGreaterThan(0);
    watch.check();
  });

  test('the swarm: a miss sends a bee buzzing past the gate; reduced motion = still bees; lo effects = no swarm', async ({page, browserName}) => {
    test.setTimeout(90_000);
    await game(page, browserName);
    await page.evaluate(id => { Arcade.session.mark('mh-boss-intro'); Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === id)); Arcade.Highway.autoPlay(0, {every: 2}); }, ID);
    await page.waitForFunction(() => { const s = Arcade.Highway.boss().swarm; return s && s.buzzes >= 1 && s.loops >= 1; }, null, {timeout: 30_000});
    // reduced motion: the bees never move
    const p2 = await page.context().newPage();
    await game(p2, browserName, {reduced: true});
    await p2.evaluate(id => { Arcade.session.mark('mh-boss-intro'); Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === id)); Arcade.Highway.autoPlay(0); }, ID);
    await p2.waitForFunction(() => Arcade.Highway.state().phase === 'play', null, {timeout: 20_000});
    await p2.waitForTimeout(300);
    const a = await p2.evaluate(() => Arcade.Highway.boss().swarm);
    await p2.waitForTimeout(1500);
    const b = await p2.evaluate(() => Arcade.Highway.boss().swarm);
    expect(a.still).toBe(true);
    expect(b.bees).toEqual(a.bees);
    expect(b.loops).toBe(0);
    // 'lo' effects: no swarm drawn
    const p3 = await page.context().newPage();
    await game(p3, browserName);
    await p3.evaluate(() => { Arcade.store.gameData('music-highway').fx = 'lo'; Arcade.store.saveGameData('music-highway'); });
    await p3.reload(); await p3.waitForFunction(() => window.Arcade && Arcade.Highway && Arcade.session);
    await p3.evaluate(id => { Arcade.session.mark('mh-boss-intro'); Arcade.Highway.start(MH_SONGS.findIndex(s => s.id === id)); }, ID);
    expect((await p3.evaluate(() => Arcade.Highway.boss().swarm)).drawn).toBe(false);
  });

  test('the avatar code carries the Bumblebee pet and Bee Wings', async ({page, browserName}) => {
    await game(page, browserName);
    const r = await page.evaluate(() => {
      const av = Object.assign({}, Arcade.Avatar.get(), {pet: 'bumblebee', back: 'beewings'});
      const code = Arcade.avatarCode.encode(av), back = Arcade.avatarCode.decode(code);
      return {pet: back.pet, back: back.back, names: [Arcade.Avatar.requirement('pet', 'bumblebee'), Arcade.Avatar.requirement('back', 'beewings')]};
    });
    expect([r.pet, r.back]).toEqual(['bumblebee', 'beewings']);
    expect(r.names[0]).toMatch(/Flight of the Bumblebee/);
    expect(r.names[1]).toMatch(/TURBO/);
  });
});
