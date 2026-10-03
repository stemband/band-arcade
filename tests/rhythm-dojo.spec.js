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
  test('a fresh device opens in TAP mode (first and pressed in the markup) and never asks for the microphone', {tag: '@quick'}, async ({page, browserName}) => {
    // no Rhythm Dojo choices saved yet (and no timing check): count every microphone request
    const watch = await prepare(page, {store: device('trumpet', browserName === 'webkit' ? {sfx: false} : {})});
    await page.addInitScript(() => {
      window.__micAsks = 0;
      const count = function () { window.__micAsks++; return Promise.reject(new DOMException('No microphone in the tests', 'NotFoundError')); };
      const put = o => { try { Object.defineProperty(o, 'getUserMedia', {value: count, configurable: true, writable: true}); } catch (e) { /* not ours */ } };
      if (window.MediaDevices) put(MediaDevices.prototype);
      if (navigator.mediaDevices) put(navigator.mediaDevices);
    });
    // the page as served (before any script runs): TAP first and already pressed, so CLAP never flashes selected
    const html = await (await page.request.get('rhythm-dojo/index.html')).text();
    const seg = /<div[^>]*id="modeSeg"[^>]*>([\s\S]*?)<\/div>/.exec(html)[1];
    const btns = [...seg.matchAll(/data-mode="(\w+)" aria-pressed="(\w+)"/g)].map(m => [m[1], m[2]]);
    expect(btns).toEqual([['tap', 'true'], ['clap', 'false'], ['snare', 'false']]);
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    expect(await page.evaluate(() => Arcade.RhythmDojo.state().mode)).toBe('tap');
    await expect(page.locator('#modeSeg [data-mode=tap]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#optNote')).toContainText('Tap the big drum pad or press Space on each note.');
    // START on Level 1: the first-time timing check is the TAP one; no microphone reminder, no request
    await page.locator('.ls-card:not(.ls-endless)').first().click();
    await page.locator('.ls-start').click();
    await expect(page.locator('#calPanel')).toBeVisible();
    expect(await page.evaluate(() => !!(Arcade.requireMic.showing && Arcade.requireMic.showing()))).toBe(false);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => [window.__micAsks, !!Arcade.Pitch.active])).toEqual([0, false]);
    expect(await page.evaluate(() => (Arcade.store.gameData('rhythm-dojo') || {}).mode || null)).toBeNull();   // nothing chosen: nothing saved
    watch.check();
  });

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

  test('judging: rests and extra attacks are penalized, the feedback is colored', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
    await page.locator('.ls-card:not(.ls-endless)').nth(1).click();             // Long Tones: half and whole notes
    await page.locator('.ls-start').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await page.evaluate(() => Arcade.RhythmDojo.setRound('q qr h', '4/4', 90));
    const run = async (auto, btn = '#rdGo') => {
      await page.evaluate(a => Arcade.RhythmDojo.autoPlay(a.offset, a.o), auto);
      await page.locator(btn).click();
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
      return page.evaluate(() => Arcade.RhythmDojo.state().last);
    };
    // perfect
    const ok = await run({offset: 0, o: {}});
    expect(ok.res).toEqual(['perfect', 'perfect']);
    expect(ok.acc).toBe(1);
    await expect(page.locator('#rows .rc.ok')).toHaveCount(3);                  // both notes and the rest green
    // a tap in the rest (beat 2) = EXTRA; the tip says so; the rest turns red
    const rest = await run({offset: 0, o: {extra: [60 / 90]}}, '#rdRetry');
    expect(rest.extras).toBe(1);
    expect(rest.tip).toMatch(/rest/i);
    await expect(page.locator('#rows .rc.rest.bad')).toHaveCount(1);
    // 110 ms late on beat 1 = GOOD
    const good = await run({offset: [110, 0], o: {}}, '#rdRetry');
    expect(good.res).toEqual(['good', 'perfect']);
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

  test('TAP: nothing is held: a whole note pressed on time and let go at once is PERFECT (pad and Space)', async ({page, browserName}) => {
    const watch = await prepare(page, {store: store(browserName)});
    await page.goto('rhythm-dojo/index.html?demo&nostart');
    await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
    await page.locator('.ls-card:not(.ls-endless)').nth(1).click();
    await page.locator('.ls-start').click();
    await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
    await page.evaluate(() => Arcade.RhythmDojo.setRound('w', '4/4', 90));
    expect(await page.evaluate(() => document.getElementById('pad').getAttribute('aria-label'))).not.toMatch(/hold/i);
    // a real press on the pad (or Space) at the note's start, released straight away
    for (const how of ['pad', 'space']) {
      await page.locator(how === 'pad' ? '#rdGo' : '#rdRetry').click();
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('perform');
      await page.evaluate(how => new Promise(res => {
        const pad = document.getElementById('pad');
        const wait = Math.max(0, Arcade.RhythmDojo.timeline().perf[0] - performance.now());
        setTimeout(() => {
          if (how === 'pad') {
            pad.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 7}));
            pad.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, pointerId: 7}));
          } else {
            dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
            dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true}));
          }
          res();
        }, wait);
      }), how);
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase), {timeout: 20000}).toBe('feedback');
      const last = await page.evaluate(() => Arcade.RhythmDojo.state().last);
      expect(last.extras, how).toBe(0);
      expect(last.res, how).toEqual(['perfect']);
      expect(last.acc, how).toBe(1);
      await expect(page.locator('#rows .rc.ok')).toHaveCount(1);
      expect(await page.locator('#tip').textContent()).not.toMatch(/hold/i);
    }
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

  /* THE COUNT-IN lives on the taiko: its number never covers the rhythm (1, 2 or more rows), the beat dots light one
     per beat (4 in 4/4, 3 in 3/4, 6 in 6/8), and every row stays on the screen */
  for (const [name, w, h] of [['phone', 390, 844], ['iPad portrait', 820, 1180], ['laptop', 1366, 768]]) {
    test(`the count-in never covers the rhythm (${name})`, async ({page, browserName}) => {
      await page.setViewportSize({width: w, height: h});
      const watch = await prepare(page, {store: store(browserName)});
      await page.goto('rhythm-dojo/index.html?demo&nostart');
      await page.evaluate(() => Arcade.RhythmDojo.set({mode: 'tap'}));
      await page.locator('.ls-card:not(.ls-endless)').nth(10).click();
      await page.locator('.ls-start').click();
      await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
      for (const [text, time, dots] of [['q q h', '4/4', 4], ['q q h | e e q h', '4/4', 4], ['q q q | h q | e e e e q | h.', '3/4', 3], ['q. q. | e e e q. | q e q e | h.', '6/8', 6]]) {
        await page.evaluate(a => Arcade.RhythmDojo.setRound(a[0], a[1], 40), [text, time]);
        await page.locator('#rdGo').click();
        await expect.poll(() => page.evaluate(() => document.getElementById('countBig').textContent), {timeout: 5000}).toMatch(/^[1-6]$/);
        const r = await page.evaluate(() => {
          const box = e => e.getBoundingClientRect(), c = box(document.querySelector('#countBig b')), rows = [...document.querySelectorAll('.rd-row')].map(box);
          const hit = b => !(c.right <= b.left || c.left >= b.right || c.bottom <= b.top || c.top >= b.bottom);
          const dots = document.querySelectorAll('#countDots i');
          return {hits: rows.filter(hit).length, rows: rows.length, clipped: c.top < 0 || c.left < 0 || c.right > innerWidth,
            dots: dots.length, lit: [...dots].filter(d => d.classList.contains('on')).length,
            live: document.getElementById('countBig').getAttribute('aria-live'),
            rowsIn: rows.every(b => b.top >= 0 && b.bottom <= innerHeight)};
        });
        expect(r.hits, `${text}: the number covers a row`).toBe(0);
        expect([r.clipped, r.dots, r.live, r.rowsIn], text).toEqual([false, dots, 'polite', true]);
        expect(r.lit).toBeGreaterThan(0);
        await page.locator('#uiPauseBtn').click();
        await page.locator('#uiPause [data-act=resume]').click();
        await expect.poll(() => page.evaluate(() => Arcade.RhythmDojo.state().phase)).toBe('study');
        expect(await page.evaluate(() => [document.getElementById('countBig').textContent, document.querySelectorAll('#countDots i').length])).toEqual(['', 0]);
      }
      watch.check();
    });
  }
});

/* THE BAMBOO DOJO: the cabinet, marquee and attract screen are jade green + gold (no pink, purple or cyan left in the
   art), the lettering is gold, and the new bamboo never flashes (the photosensitivity rule: ≤ 3 flashes a second) */
test('the bamboo dojo: jade + gold cabinet, marquee and screen, flash-safe', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto('index.html?demo&nostart#all-games');
  await page.waitForFunction(() => window.Arcade && Arcade.Marquee && Arcade.CAB_SCREENS);
  const r = await page.evaluate(() => {
    const A = Arcade, g = A.GAMES.find(x => x.id === 'rhythm-dojo'), cab = A.cabinetOf(g), k = A.Marquee.config(g);
    const W = 360, H = 90, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    // pixels that are clearly pink / purple / cyan: saturated, bright enough to see, hue in those ranges
    const bad = img => { let n = 0; const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), s = mx ? (mx - mn) / mx : 0;
        if (mx < .35 || s < .45) continue;
        let h = mx === r ? (gg - b) / (mx - mn) : mx === gg ? 2 + (b - r) / (mx - mn) : 4 + (r - gg) / (mx - mn); h = (h * 60 + 360) % 360;
        if (h >= 185 && h <= 345) n++;        // cyan-blue (185+), purple, magenta, pink (≤ 345)
      }
      return n / (d.length / 4); };
    const LIN = Float32Array.from({length: 256}, (_, v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });   // (a table: the same values, ~100× fewer powers)
    const lum = img => { const d = img.data, o = new Float32Array(d.length / 4);
      for (let i = 0; i < o.length; i++) o[i] = .2126 * LIN[d[i * 4]] + .7152 * LIN[d[i * 4 + 1]] + .0722 * LIN[d[i * 4 + 2]];
      return o; };
    let worstBad = 0, flashes = 0, prev = null, frames = [];
    for (let t = 0; t <= 4; t += 1 / 30) {                 // 4 s at 30 fps, the whole sign (scene + title)
      A.Marquee.draw(x, W, H, t, g, {art: false}); const img = x.getImageData(0, 0, W, H);
      worstBad = Math.max(worstBad, bad(img)); const L = lum(img);
      if (prev) { let big = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i] - prev[i]) > .1) big++; frames.push(big / L.length); }
      prev = L;
    }
    // a "flash" = a frame where more than 10 % of the sign changes by 0.1 relative luminance
    flashes = frames.filter(f => f > .1).length;
    const sc = A.CAB_SCREENS.taiko; let scrBad = 0;
    for (let t = 0; t < 4.5; t += .5) { sc.draw(x, W, H, t); scrBad = Math.max(scrBad, bad(x.getImageData(0, 0, W, H))); }
    return {color: g.color, trim: cab.trim, trim2: cab.trim2, colors: k.colors, worstBad, flashes, scrBad};
  });
  expect(r.color).toBe('green');
  expect([r.trim, r.trim2]).toEqual(['green', 'yellow']);
  expect(r.colors).toEqual(['yellow', 'rd-jade', 'rd-night']);
  expect(r.worstBad).toBeLessThan(.0005);
  expect(r.scrBad).toBeLessThan(.0005);
  expect(r.flashes).toBe(0);
  watch.check();
});
