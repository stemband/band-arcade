/* RHYTHM DOJO: Mr. Graham's counting (shared/counting.js), clap detection (shared/onsets.js), the timing check
   (shared/calibration.js) and the game's judging, with synthesized claps and the game's own clicks played back into
   the detector. The level and Endless runs are in game-runs.spec.js (tests/games.js). */
const {test, expect} = require('@playwright/test');
const {prepare, device, saved} = require('./helpers');

const CALIB = {gameData: {'rhythm-dojo': {calib: {clap: {ms: 0}, tap: {ms: 0}}}}};
/* WebKit on a test machine with no sound card says its audio is running but its clock never moves: there the game runs
   with SOUND OFF (its performance.now() clock, as on a muted iPad) */
const store = browser => device('trumpet', Object.assign({}, CALIB, browser === 'webkit' ? {sfx: false} : {}));

test.describe('rhythm dojo', () => {
  test('the Counting Board: every example matches the counting rule', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('rhythm-dojo/counting.html');
    const n = await page.locator('article.ex').count();
    expect(n).toBeGreaterThanOrEqual(40);
    await expect(page.locator('article.ex[data-ok="false"]')).toHaveCount(0);
    // the rule itself, straight from the module (the examples in the PR description)
    const got = await page.evaluate(() => {
      const C = Arcade.Counting, t = (r, time = '4/4') => C.text(C.groups(C.parse(r, time)));
      return {dq: t('q. e q q'), sync: t('e q e q q'), half3: t('q q h'), whole: t('w'), rest2: t('q qr q q'), hrest3: t('q q hr'),
        erest: t('e er q q q'), six: t('s s s s q h'), trip: t('[e e e] q h'), tieBar: t('q q h_ | q q h'), sixEight: t('q e q e', '6/8'), s68: t('s s s s s s q.', '6/8')};
    });
    expect(got).toEqual({dq: '1^(& 2) & 3 4', sync: '1 &^(2) & 3 4', half3: '1 2 3^(4)', whole: '1^(2 3 4)', rest2: '1 (2) 3 4', hrest3: '1 2 (3^(4))',
      erest: '1 (&) 2 3 4', six: '1 e & a 2 3^(4)', trip: '1 la le 2 3^(4)', tieBar: '1 2 3^(4 1) 2 3^(4)', sixEight: '1^(2) 3 4^(5) 6', s68: '1 & 2 & 3 & 4^(5 6)'});
    // only the small syllables are underlined: one line per group with held syllables, never under a big one
    const u = await page.evaluate(() => {
      const art = [...document.querySelectorAll('article.ex')].find(a => a.querySelector('h2').textContent === 'Dotted quarter + eighth');
      const g = art.querySelector('g.rc'), line = g.querySelector('.rc-u'), big = g.querySelector('.rc-big').getBBox(), sm = [...g.querySelectorAll('.rc-small')].map(e => e.getBBox());
      return {lines: art.querySelectorAll('.rc-u').length, x1: +line.getAttribute('x1'), x2: +line.getAttribute('x2'), bigEnd: big.x + big.width, smStart: sm[0].x, smEnd: sm[sm.length - 1].x + sm[sm.length - 1].width,
        raised: sm[0].y + sm[0].height < big.y + big.height};
    });
    expect(u.lines).toBe(1);
    expect(u.x1).toBeGreaterThanOrEqual(u.bigEnd - .5);                       // the underline starts after the big "1"
    expect(Math.abs(u.x1 - u.smStart)).toBeLessThan(2);
    expect(Math.abs(u.x2 - u.smEnd)).toBeLessThan(2);
    expect(u.raised).toBe(true);                                              // small = raised like an exponent
    watch.check();
  });

  test('clap detection: synthesized claps are found to the millisecond; hums and room noise are not', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    const r = await page.evaluate(() => {
      const sr = 48000; let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
      const buf = new Float32Array(sr * 6);
      const clap = (at, amp) => { const s0 = Math.round(at * sr);
        [[0, .9], [.009, .7], [.017, 1]].forEach(([o, a]) => { for (let i = 0; i < .006 * sr; i++) buf[s0 + Math.round(o * sr) + i] += amp * a * rnd() * Math.exp(-i / (.002 * sr)); });
        for (let i = 0; i < .12 * sr; i++) buf[s0 + Math.round(.02 * sr) + i] += amp * .5 * rnd() * Math.exp(-i / (.03 * sr)); };
      for (let i = 0; i < buf.length; i++) buf[i] += .004 * rnd() + .05 * Math.sin(2 * Math.PI * 60 * i / sr);   // room noise + mains hum
      for (let i = 3.6 * sr; i < 4.6 * sr; i++) buf[i] += .12 * Math.sin(2 * Math.PI * 330 * i / sr) * Math.min(1, (i - 3.6 * sr) / (.05 * sr));   // a hummed note (soft start)
      const want = [.5, 1.0, 1.25, 1.5, 1.65, 2.2, 2.35, 2.5, 3.4, 5.1, 5.25];
      want.forEach((t, k) => clap(t, k % 3 === 0 ? .15 : .5));
      const got = Arcade.Onsets.analyse(buf, sr, {gate: .007});
      return {want, got: got.map(o => o.time)};
    });
    expect(r.got.length).toBe(r.want.length);
    r.want.forEach((t, k) => expect(Math.abs(r.got[k] - t) * 1000).toBeLessThan(2));
    watch.check();
  });

  test('the count-in clicks are never claps; synthesized claps through the same path are judged on time', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', 'WebKit on the test machine has no running audio clock');
    const watch = await prepare(page, {store: device('trumpet', CALIB)});
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.mouse.click(5, 5);                                               // unlock the audio
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'clap', hp: false}));
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    const mic = page.locator('[data-act=go]'); if (await mic.isVisible().catch(() => false)) await mic.click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    // THE LOOP: everything the arcade plays goes straight into the clap detector (as if the microphone heard the speakers)
    await page.evaluate(() => { const o = Arcade.Sfx.output(); Arcade.Onsets.watchNode(o.out); });
    const perform = async () => {
      await page.locator('#rdGo').click();
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
      return page.evaluate(() => Object.assign(Arcade.RhythmDojo.state().last, {heard: Arcade.Onsets.log.filter(o => !o.fake).length}));
    };
    // 1. nobody claps: the count-in's clicks reach the detector, but nothing counts
    await page.evaluate(() => { Arcade.Onsets.log.length = 0; });
    const quiet = await perform();
    expect(quiet.heard, 'the detector heard the count-in clicks').toBeGreaterThan(0);
    expect(quiet.extras).toBe(0);
    expect(quiet.res.every(r => r === 'miss')).toBe(true);
    // 2. headphones mode (the clicks keep going through the whole rhythm): still nothing counts (the bleed rule)
    await page.evaluate(() => Arcade.RhythmDojo.set({hp: true}));
    await page.locator('#rdRetry').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
    const hp = await page.evaluate(() => Arcade.RhythmDojo.state().last);
    const bleed = await page.evaluate(() => Arcade.RhythmDojo.bleed());
    console.log('bleed rule (headphones run):', JSON.stringify(bleed));
    expect(bleed.heard, 'the count-in taught how late and how loud the clicks are heard').toBeGreaterThan(0);
    expect(hp.extras).toBe(0);
    expect(hp.res.every(r => r === 'miss')).toBe(true);
    // 3. synthesized claps (louder than the clicks) played into the same loop right on the notes: judged on time
    await page.evaluate(() => Arcade.RhythmDojo.set({hp: false}));
    await page.evaluate(() => {
      const o = Arcade.Sfx.output(), ctx = o.ctx, sr = ctx.sampleRate;
      const b = ctx.createBuffer(1, Math.round(sr * .2), sr), d = b.getChannelData(0);
      [[0, .9], [.009, .7], [.017, 1]].forEach(([at, a]) => { for (let i = 0; i < .006 * sr; i++) d[Math.round(at * sr) + i] += a * (Math.random() * 2 - 1) * Math.exp(-i / (.002 * sr)); });
      for (let i = 0; i < .12 * sr && Math.round(.02 * sr) + i < d.length; i++) d[Math.round(.02 * sr) + i] += .5 * (Math.random() * 2 - 1) * Math.exp(-i / (.03 * sr));
      window.__clapBuf = b;
    });
    const T = await page.evaluate(() => new Promise(res => {
      const go = document.getElementById('rdRetry');
      // as soon as the performance starts, a clap at each note's AudioContext time (Arcade.RhythmDojo.timeline())
      const tick = () => {
        const s = Arcade.RhythmDojo.state();
        if (s.phase === 'perform' && Arcade.RhythmDojo.timeline) {
          const tl = Arcade.RhythmDojo.timeline(), o = Arcade.Sfx.output();
          tl.notes.forEach(t => { const src = o.ctx.createBufferSource(); src.buffer = window.__clapBuf; src.connect(o.out); src.start(tl.T0 + t); });
          return res(tl.notes.length);
        }
        requestAnimationFrame(tick);
      };
      go.click(); tick();
    }));
    expect(T).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
    const claps = await page.evaluate(() => Arcade.RhythmDojo.state().last);
    expect(claps.extras).toBe(0);
    expect(claps.res.filter(r => r === 'miss').length).toBe(0);
    watch.check();
  });

  test('judging: rests and extra attacks are penalized, TAP holds must last, the feedback is colored', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
    await page.locator('.ls-card:not(.ls-endless)').nth(1).click();             // Long Tones: half and whole notes (held)
    await page.locator('.ls-start').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await page.evaluate(() => Arcade.RhythmDojo.setRound('q qr h', '4/4', 90));
    const run = async (auto, btn = '#rdGo') => {
      await page.evaluate(a => Arcade.RhythmDojo.autoPlay(a.offset, a.o), auto);
      await page.locator(btn).click();
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
      return page.evaluate(() => Arcade.RhythmDojo.state().last);
    };
    // perfect, held
    const ok = await run({offset: 0, o: {}});
    expect(ok.res).toEqual(['perfect', 'perfect']);
    expect(ok.acc).toBe(1);
    await expect(page.locator('#rows .rc.ok')).toHaveCount(3);                  // both notes and the rest green
    // a tap in the rest (beat 2) = EXTRA; the tip says so; the rest turns red
    const rest = await run({offset: 0, o: {extra: [60 / 90]}}, '#rdRetry');
    expect(rest.extras).toBe(1);
    expect(rest.tip).toMatch(/rest/i);
    await expect(page.locator('#rows .rc.rest.bad')).toHaveCount(1);
    // the half note let go early = SHORT (its held syllable yellow), 110 ms late on beat 1 = GOOD
    const short = await run({offset: [110, 0], o: {short: [1]}}, '#rdRetry');
    expect(short.res).toEqual(['good', 'perfect+short']);
    await expect(page.locator('#rows .rc.short')).toHaveCount(1);
    // a miss is red
    const miss = await run({offset: 0, o: {skip: [1]}}, '#rdRetry');
    expect(miss.res[1]).toBe('miss');
    await expect(page.locator('#rows .rc.bad')).toHaveCount(1);
    expect(miss.tip).toMatch(/missed beat 3/);
    // way off (-300 ms) = EARLY
    const early = await run({offset: [-300, 0], o: {}}, '#rdRetry');
    expect(early.res[0]).toBe('early');
    expect(early.tip).toMatch(/rushed beat 1/);
    watch.check();
  });

  test('the timing check (tapping): Space on the clicks saves the offset', async ({page, browserName}) => {
    test.skip(browserName === 'webkit', 'WebKit on the test machine has no running audio clock');
    const watch = await prepare(page);
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.mouse.click(5, 5);
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
    await page.locator('#calBtn').click();
    await page.locator('#calGo').click();
    const clicks = await page.evaluate(() => Arcade.RhythmDojo.calClicks());
    expect(clicks.length).toBe(12);
    for (const c of clicks.slice(4)) {                                          // tap 40 ms after each click
      const wait = c + 40 - await page.evaluate(() => performance.now());
      if (wait > 0) await page.waitForTimeout(wait);
      await page.keyboard.press('Space');
    }
    await expect(page.locator('#calSay')).toContainText('All set', {timeout: 5000});
    const c = (await saved(page)).gameData['rhythm-dojo'].calib.tap;
    expect(c.n).toBeGreaterThanOrEqual(5);
    expect(c.ms).toBeGreaterThan(-60);
    expect(c.ms).toBeLessThan(160);
    watch.check();
  });

  test('HEAR IT lights the syllables without listening; pause stops the rhythm and RESUME waits for PERFORM', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await page.locator('#rdHear').click();
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('#rows .lit').length), {timeout: 8000}).toBeGreaterThan(0);
    expect(await page.evaluate(() => Arcade.Pitch.listening())).toBe(false);
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 15000}).toBe('study');
    await page.locator('#rdGo').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 5000}).toBe('perform');
    await page.locator('#uiPauseBtn').click();
    await expect(page.locator('#uiPause')).toBeVisible();
    expect(await page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await page.locator('#uiPause [data-act=resume]').click();
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await expect(page.locator('#rdGo')).toBeVisible();
    watch.check();
  });
});
