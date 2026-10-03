/* SHOWTIME MALFUNCTION: TERROR (the fourth SPOOKY LEVEL) and THE FULL-SCREEN SCARE (Jump Scare and Terror).
   - the gate: hidden unless teacher-settings.js TERROR_ALLOWED; its own warning; back to Spooky the next day; "Visual
     scares only" removes every sting;
   - every scare kind covers the whole viewport, above the top bar and the pause button, at phone / iPad / Chromebook
     sizes, with the eyes on screen; everything frozen meanwhile; the focus back where it was after;
   - THE BUILD-UP dims slowly and freezes the show; FAKE-OUTS (the real scare within fakeDelayS, ≤ 2, never twice in a row);
   - LIGHTS OUT: the mic listens, a right note counts in the dark, the target panel stays readable, never near the front
     or on the last 2 machines; MAESTRO: two silent sightings, then the lunge; never in Showtime 8;
   - the plans per showtime (the counts table), spotlights never lost to a scare;
   - THE FLASH RULE, measured: every kind (and the build-up, LIGHTS OUT, a sighting) frame by frame on the test clock:
     no screen cell's luminance swings more than twice in any second;
   - reduced motion: only the FADE; Jump Scare: its 4 kinds, no build-up. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const DAY = '2026-10-05', DAYKEY = '2026-10-5';          // ?demo&today= pretends this date (game.js dayKey: no zero padding)
const KINDS = ['lunge', 'eyes', 'popup', 'band', 'face', 'panel', 'maestro'];
const SIZES = [['phone portrait', 390, 844], ['phone landscape', 844, 390], ['iPad', 1180, 820], ['Chromebook', 1366, 768]];

/** the teacher setting on (or off) for this page, whatever teacher-settings.js says (it writes its values over
    window.Arcade.TEACHER: this keeps the test's) */
const allowTerror = (page, on = true) => page.addInitScript(on => {
  window.Arcade = window.Arcade || {};
  const T = window.Arcade.TEACHER = window.Arcade.TEACHER || {};
  Object.defineProperty(T, 'TERROR_ALLOWED', {get: () => on, set() {}, enumerable: true});
}, on);
const gameData = (o = {}) => ({'showtime-malfunction': Object.assign({storySeen: true, spooky: 'terror', terrorDay: DAYKEY, jumpDay: DAYKEY}, o)});
const G = page => page.evaluate(() => { const g = Arcade.Showtime.debug(); return g && {t: g.t, lights: g.lights, scare: g.scare && Object.assign({}, g.scare),
  z: g.bots.map(b => +b.z.toFixed(4)), scares: g.scares.slice(), dreads: g.dreads.slice(), fakeOuts: g.fakeOuts.slice(), sightings: g.sightings.slice(),
  plan: g.scarePlan.map(p => Object.assign({}, p)), lightsOut: !!g.lightsOut, maestro: g.maestro && Object.assign({}, g.maestro), lv: g.lv}; });

/** open Showtime Malfunction (TERROR allowed) and start showtime lv; resolves once a machine is walking */
async function show(page, {lv = 2, q = '', gd = {}, size = null, terror = true, clock = false, plan = false} = {}) {
  if (size) await page.setViewportSize({width: size[0], height: size[1]});
  if (terror) await allowTerror(page);
  if (clock) await page.clock.install();
  const watch = await prepare(page, {store: device('trumpet', {gameData: gameData(gd)})});
  await page.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}${q}`);
  await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
  await page.locator('.ls-start').click();
  await expect.poll(async () => {
    if (await page.evaluate(() => !!Arcade.Showtime.debug())) return true;
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    return false;
  }, {timeout: 20_000}).toBe(true);
  await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.some(b => b.state === 'walk')), {timeout: 20_000}).toBe(true);
  // the show's own planned scares stay out of the way of a test that sets off its own (plan: true keeps them)
  if (!plan) await page.evaluate(() => { Arcade.Showtime.debug().scarePlan.length = 0; });
  return watch;
}
/** the show's guards out of the way for a planned scare now (the first seconds, `apart`) */
const unguard = page => page.evaluate(() => { const g = Arcade.Showtime.debug(); g.t = Math.max(g.t, 7); g.lastScare = null; g.bots.forEach(b => { if (b.state === 'walk') b.z = Math.min(b.z, .3); }); });
const scareOver = page => expect.poll(() => page.evaluate(() => { const g = Arcade.Showtime.debug(); return !!g && !g.scare && !document.getElementById('scare').classList.contains('on'); }), {timeout: 15_000}).toBe(true);

test.describe('Showtime Malfunction: TERROR, the gate', () => {
  test('hidden unless TERROR_ALLOWED; its own warning; Visual scares only is kept', async ({page}) => {
    // not allowed (TERROR_ALLOWED: false): no Terror button, and a device that had it plays Spooky
    await allowTerror(page, false);
    let watch = await prepare(page, {store: device('trumpet', {gameData: gameData()})});
    await page.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}`);
    await expect(page.locator('#hub [data-spooky="terror"]')).toBeHidden();
    expect(await page.evaluate(() => [Arcade.store.gameData('showtime-malfunction').spooky, document.body.classList.contains('terror-mode')])).toEqual(['spooky', false]);
    expect(await page.evaluate(() => Arcade.TEACHER.TERROR_ALLOWED)).toBe(false);
    watch.check();
  });

  test('allowed: the warning (YES / NO + Visual scares only), then Terror with its look and its Settings line', async ({page}) => {
    await allowTerror(page);
    const watch = await prepare(page, {store: device('trumpet', {gameData: gameData({spooky: 'mild'})})});
    await page.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}`);
    const btn = page.locator('#hub [data-spooky="terror"]');
    await expect(btn).toBeVisible();
    // NO: nothing changes
    await btn.click();
    await expect(page.locator('#uiConfirm')).toContainText('TERROR mode is much scarier than Jump Scare: build-ups, fake-outs, the lights going out and full-screen scares with loud sounds. Are you sure?');
    await expect(page.locator('#uiConfirm .jw-check')).toContainText('Visual scares only');
    await page.locator('#uiConfirm [data-act=no]').click();
    expect(await page.evaluate(() => Arcade.store.gameData('showtime-malfunction').spooky)).toBe('mild');
    // YES with Visual scares only
    await btn.click();
    await page.locator('#uiConfirm #jwVisual').check();
    await page.locator('#uiConfirm [data-act=yes]').click();
    expect(await page.evaluate(() => { const d = Arcade.store.gameData('showtime-malfunction'); return [d.spooky, d.terrorDay, d.scareVisual]; })).toEqual(['terror', DAYKEY, true]);
    expect(await page.evaluate(() => ['spooky-mode', 'jump-mode', 'terror-mode'].map(c => document.body.classList.contains(c)))).toEqual([true, true, true]);
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    // the Settings panel: the Terror button and its line
    await page.locator('#topbar .snd-open').click();
    await expect(page.locator('#uiSettings [data-terror-note]')).toHaveText('Terror resets to Spooky each new day.');
    await expect(page.locator('#uiSettings [data-spooky="terror"]')).toBeVisible();
    watch.check();
  });

  test('Terror resets to Spooky on a new day', async ({page}) => {
    await allowTerror(page);
    const watch = await prepare(page, {store: device('trumpet', {gameData: gameData({terrorDay: '2026-10-4'})})});
    await page.goto(`showtime-malfunction/index.html?demo&nostart&today=${DAY}`);
    expect(await page.evaluate(() => Arcade.store.gameData('showtime-malfunction').spooky)).toBe('spooky');
    expect(await page.evaluate(() => document.body.classList.contains('terror-mode'))).toBe(false);
    watch.check();
  });

  test('"Visual scares only" removes every sting; otherwise the terror stings play (Jump Scare: the scare stings)', async ({page}) => {
    const watch = await show(page, {gd: {scareVisual: true}});
    const stings = () => page.evaluate(() => window.__stings.slice());
    await page.evaluate(() => { window.__stings = []; const ev = Arcade.Sfx.event; Arcade.Sfx.event = (n, ...a) => { if (/sting/.test(n)) window.__stings.push(n); return ev.call(Arcade.Sfx, n, ...a); }; });
    for (const k of ['face', 'eyes']) { await page.evaluate(k => Arcade.Showtime.scare(k), k); await scareOver(page); }
    expect(await stings()).toEqual([]);
    await page.evaluate(() => { Arcade.store.gameData('showtime-malfunction').scareVisual = false; });
    await page.evaluate(() => Arcade.Showtime.scare('lunge')); await scareOver(page);
    await page.evaluate(() => Arcade.Showtime.scare('panel'));                    // PANEL: the sting at the lunge, after the peek
    expect(await stings()).toHaveLength(1);
    await scareOver(page);
    const s = await stings();
    expect(s).toHaveLength(2);
    s.forEach(n => expect(n).toMatch(/^terror-sting-[123]$/));
    watch.check();
  });
});

test.describe('Showtime Malfunction: every scare fills the entire screen', () => {
  for (const [name, w, h] of SIZES) for (const [part, kinds] of [['Jump Scare\'s kinds', ['lunge', 'eyes', 'popup', 'band']], ['Terror\'s kinds + the FADE', ['face', 'panel', 'maestro', 'fade']]]) {
    test(`${part} cover the viewport, above the top bar and pause button, eyes on screen; frozen; focus back (${name})`, async ({page}) => {
      const watch = await show(page, {size: [w, h]});
      await page.evaluate(() => { Arcade.Showtime.debug().band = [{kind: 'walrus'}, {kind: 'owl'}, {kind: 'gator'}, {kind: 'raccoon'}]; });
      // every machine that can lunge at you: the band, a special, a hybrid (their eyes sit in different places)
      for (const [i, k] of kinds.entries()) {
        await page.evaluate(i => { const b = Arcade.Showtime.debug().bots.find(x => x.state === 'walk'); if (b) b.kind = ['gator', 'turbo-tin', 'oil-tank', 'owl'][i]; }, i);
        await page.evaluate(() => document.getElementById('uiPauseBtn').focus());
        // the show's state at the moment the scare starts (read in the same call)
        const before = await page.evaluate(k => { const was = JSON.stringify(Arcade.Showtime.debug().scare); Arcade.Showtime.scare(k); const g = Arcade.Showtime.debug();
          return {t: g.t, lights: g.lights, z: g.bots.map(b => +b.z.toFixed(4)), was, now: JSON.stringify(g.scare), n: g.scares.length, timers: g.timers.length}; }, k);
        expect(JSON.parse(before.now || 'null'), `${k} started (before: ${before.was})`).toMatchObject({kind: k, phase: 'scare'});
        const r = await page.evaluate(k => {
          const el = document.getElementById('scare'), b = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
          // what sits on top at the top bar, the pause button, the target panel, the arena and the corners
          el.style.pointerEvents = 'auto';
          const pts = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3], [W / 2, H / 2]];
          ['uiPauseBtn', 'topbar', 'tpanel', 'arena', 'hudScore'].forEach(id => { const e = document.getElementById(id); if (e) { const q = e.getBoundingClientRect(); pts.push([q.left + q.width / 2, q.top + q.height / 2]); } });
          const covered = pts.filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H).every(([x, y]) => el.contains(document.elementFromPoint(x, y)));
          el.style.pointerEvents = '';
          // the art at its biggest (before the FACE snaps away): every eye's center on screen
          const at = {panel: 1700, face: 500, eyes: 1000, fade: 1100}[k] || 700;
          el.getAnimations({subtree: true}).forEach(a => { a.currentTime = at; });
          const eyes = [...el.querySelectorAll(k === 'eyes' || k === 'fade' ? '.sc-eyes i' : '.sc-safe .a-eye')].map(e => e.getBoundingClientRect())
            .filter(q => q.width > 0).map(q => [q.left + q.width / 2, q.top + q.height / 2]);
          const onScreen = eyes.filter(([x, y]) => x >= 0 && x <= W && y >= 0 && y <= H).length;
          return {box: [b.left, b.top, b.width, b.height], W, H, covered, eyes: eyes.length, onScreen, fixed: getComputedStyle(el).position, peek: !!document.querySelector('#tpanel .tp-face')};
        }, k);
        expect(r.fixed, k).toBe('fixed');
        expect(Math.abs(r.box[0]) + Math.abs(r.box[1]), `${k}: the overlay starts at the corner`).toBeLessThanOrEqual(1);
        expect(Math.abs(r.box[2] - r.W) + Math.abs(r.box[3] - r.H), `${k}: the overlay is the viewport`).toBeLessThanOrEqual(2);
        expect(r.covered, `${k}: above everything`).toBe(true);
        expect(r.onScreen, `${k}: the eyes are on screen (${r.onScreen} of ${r.eyes})`).toBeGreaterThanOrEqual(2);
        if (k === 'panel') expect(r.peek, 'PANEL peeks from the target panel').toBe(true);
        // frozen while it lasts: the show clock, the band, the spotlights, checked in the page on every frame of the scare
        // (up to 20 frames; a busy machine may stall, so it reads while the scare is still on)
        const frozen = await page.evaluate(b => new Promise(res => {
          const g = Arcade.Showtime.debug(), s0 = g.scare; let n = 0, bad = null;
          const f = () => {
            if (g.scare !== s0) return res({n, bad});
            n++;
            const z = g.bots.slice(0, b.z.length).map(x => +x.z.toFixed(4));
            if (g.t !== b.t || JSON.stringify(z) !== JSON.stringify(b.z) || g.lights !== b.lights) bad = {t: g.t, z, lights: g.lights};
            if (n < 20) requestAnimationFrame(f); else res({n, bad});
          };
          requestAnimationFrame(f);
        }), before);
        expect(frozen.bad, `${k}: the show clock, the band and the spotlights wait (${JSON.stringify(before)})`).toBe(null);
        expect(frozen.n).toBeGreaterThan(0);
        await scareOver(page);
        const after = await page.evaluate(() => ({focus: document.activeElement && document.activeElement.id, vis: getComputedStyle(document.getElementById('scare')).visibility,
          pause: !document.getElementById('uiPauseBtn').hidden, peek: !!document.querySelector('#tpanel .tp-face')}));
        expect(after, `${k}: gone completely, the pause button back, the focus where it was`).toEqual({focus: 'uiPauseBtn', vis: 'hidden', pause: true, peek: false});
      }
      watch.check();
    });
  }
});

test.describe('Showtime Malfunction: TERROR\'s build-up, fake-outs, LIGHTS OUT and MAESTRO', () => {
  test('THE BUILD-UP: one slow dim (≥ 1.5 s, no fast step), the show frozen and silent, the target panel undimmed; then the scare', async ({page}) => {
    const watch = await show(page);
    await page.evaluate(() => { window.SHOWTIME_SCARES.terror.buildUpS = [4, 4]; window.__stings = 0; const ev = Arcade.Sfx.event; Arcade.Sfx.event = (n, ...a) => { if (/sting/.test(n)) window.__stings++; return ev.call(Arcade.Sfx, n, ...a); }; });
    // the dim layer's opacity, sampled every frame for 2.6 s (the show's state read as the build-up starts)
    const {trace, before} = await page.evaluate(() => new Promise(res => {
      const el = document.getElementById('stDread'), out = [], t0 = performance.now();
      Arcade.Showtime.dread('lunge', {fake: false});
      const g = Arcade.Showtime.debug(), before = {t: g.t, z: g.bots.map(b => +b.z.toFixed(4))};
      const f = () => { const t = performance.now() - t0; out.push([t, +getComputedStyle(el).opacity]); if (t < 2600) requestAnimationFrame(f); else res({trace: out, before}); };
      requestAnimationFrame(f);
    }));
    const top = Math.max(...trace.map(([, o]) => o));
    expect(top).toBeGreaterThan(.6);
    // timed from the moment the build-up starts (a busy WebKit draws only a few frames a second: the first frame it shows
    // may come late into the fade, but the fade can't be seen complete before it is)
    const reach = trace.find(([, o]) => o >= top * .98)[0];
    expect(reach, 'one smooth fade of at least 1.5 s').toBeGreaterThanOrEqual(1400);
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('stDread')).transitionDuration)), 'the fade itself: ≥ 1.5 s').toBeGreaterThanOrEqual(1.5);
    // never a fast step: over any 100 ms (or more, to the next sample) the dim changes by ≤ 0.15 (the whole fade is 0.72)
    for (let i = 0; i < trace.length; i++) {
      const j = trace.findIndex(([t]) => t >= trace[i][0] + 100); if (j < 0) break;
      expect(Math.abs(trace[j][1] - trace[i][1]) / (trace[j][0] - trace[i][0]) * 100, `never a fast step (at ${Math.round(trace[i][0])} ms)`).toBeLessThanOrEqual(.15);
    }
    const mid = await G(page);
    expect(mid.scare.phase).toBe('build');
    expect(mid.t).toBe(before.t);
    expect(mid.z.slice(0, before.z.length)).toEqual(before.z);
    expect(await page.evaluate(() => window.__stings), 'dead silence').toBe(0);
    expect(await page.evaluate(() => Arcade.Pitch.isSuppressed(performance.now())), 'no suppression: no sound plays').toBe(false);
    // the target panel: outside the arena, never under the dim layer, not dimmed
    expect(await page.evaluate(() => { const p = document.getElementById('tpanel'), q = p.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return p.contains(e) && getComputedStyle(p).opacity === '1' && getComputedStyle(p).filter === 'none'; })).toBe(true);
    // then the scare (not a fake-out)
    await expect.poll(async () => ((await G(page)).scare || {}).phase, {timeout: 5000}).toBe('scare');
    await scareOver(page);
    expect(await page.evaluate(() => document.body.classList.contains('st-dread'))).toBe(false);
    watch.check();
  });

  test('FAKE-OUTS: a build-up that ends in nothing, the real scare within fakeDelayS; at most 2, never twice in a row', async ({page}) => {
    const watch = await show(page, {lv: 2, q: '&fake=always'});      // (Showtime 2: no special machine's card pausing the show)
    await page.evaluate(() => { const T = window.SHOWTIME_SCARES.terror; T.buildUpS = [.4, .4]; T.recoverMs = 300; });
    /** plan one scare now (no kind given: Terror picks), wait until the build-up has ended (a fake-out or the scare) */
    const planNow = async (extra = {}) => {
      await unguard(page);
      await page.evaluate(e => { const g = Arcade.Showtime.debug(); g.scarePlan.unshift(Object.assign({at: g.t, kind: 'lunge'}, e)); }, extra);
      await expect.poll(async () => (await G(page)).dreads.length, {timeout: 10_000}).toBeGreaterThan(0);
    };
    const settle = async n => { await expect.poll(async () => (await G(page)).dreads.length, {timeout: 10_000}).toBe(n); await scareOver(page); };
    // 1: a fake-out (fake=always): no scare, the show moves again, the real one planned within fakeDelayS
    await planNow(); await settle(1);
    let g = await G(page);
    expect(g.scares).toEqual([]);
    expect(g.fakeOuts).toHaveLength(1);
    const follow = g.plan[0], [lo, hi] = await page.evaluate(() => window.SHOWTIME_SCARES.terror.fakeDelayS);
    expect(follow.follow).toBe(true);
    expect(follow.at - g.fakeOuts[0].t).toBeGreaterThanOrEqual(lo - .1);
    expect(follow.at - g.fakeOuts[0].t).toBeLessThanOrEqual(hi + .1);
    const t1 = g.t;
    await expect.poll(async () => (await G(page)).t, {timeout: 10_000}).toBeGreaterThan(t1);   // the band moves again
    // 2: the real one (a follow-up is never a fake-out), brought forward to now
    await unguard(page);
    await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.scarePlan[0].at = g.t; });
    await settle(2);
    g = await G(page);
    expect(g.scares.map(s => s.kind)).toEqual(['lunge']);
    // 3–5: a second fake-out, its real scare, then no third fake-out (fakeMax 2)
    await planNow(); await settle(3);
    await unguard(page); await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.scarePlan[0].at = g.t; }); await settle(4);
    await planNow(); await settle(5);
    g = await G(page);
    expect(g.dreads.map(d => d.fake)).toEqual([true, false, true, false, false]);
    expect(g.fakeOuts).toHaveLength(2);
    expect(g.scares).toHaveLength(3);
    // never two in a row, whatever the dice: a fake-out's own follow-up can't be one
    watch.check();
  });

  test('LIGHTS OUT: the arena dark, the eyes glowing, the band walking; the mic listens, a right note counts, the panel readable', async ({page}) => {
    const watch = await show(page, {q: '&loeyes=0'});
    await page.evaluate(() => { window.SHOWTIME_SCARES.terror.lightsOutS = [6, 6]; });
    const panelContrast = async () => {
      const png = await page.locator('#tpanel').screenshot();
      return page.evaluate(async b64 => {
        const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = document.createElement('canvas');
        c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, L = [];
        for (let i = 0; i < d.length; i += 16) L.push(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]);
        L.sort((a, b) => a - b); return L[Math.floor(L.length * .97)] - L[Math.floor(L.length * .03)];
      }, png.toString('base64'));
    };
    const lit = await panelContrast();
    const before = await page.evaluate(() => { const g = Arcade.Showtime.debug(), t = g.bots.filter(b => b.state === 'walk').sort((a, b) => b.z - a.z)[0]; return {id: t.id, left: t.left}; });
    await page.evaluate(() => Arcade.Showtime.lightsOut());
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('#loEyes i:not([hidden])').length)).toBeGreaterThanOrEqual(2);
    const s = await G(page);
    expect(s.lightsOut).toBe(true);
    expect(s.scare, 'not a scare moment: no freeze').toBe(null);
    expect(await page.evaluate(() => Arcade.Pitch.isSuppressed(performance.now())), 'no suppression').toBe(false);
    // the band keeps walking
    await expect.poll(async () => (await G(page)).t, {timeout: 5000}).toBeGreaterThan(s.t);
    // a right note (?demo Space) still counts
    await expect.poll(async () => { await page.keyboard.press('Space'); return page.evaluate(id => { const b = Arcade.Showtime.debug().bots.find(x => x.id === id); return b ? b.left : -1; }, before.id); },
      {timeout: 5000}).toBeLessThan(before.left);
    expect((await G(page)).lightsOut, 'still dark').toBe(true);
    // the target panel: still at least 60 % of its contrast
    const dark = await panelContrast();
    expect(dark / lit).toBeGreaterThanOrEqual(.6);
    await expect.poll(async () => (await G(page)).lightsOut, {timeout: 9000}).toBe(false);
    watch.check();
  });

  test('LIGHTS OUT never comes near the front or on the last 2 machines', async ({page}) => {
    const watch = await show(page);
    const r = await page.evaluate(() => {
      const g = Arcade.Showtime.debug(), S = Arcade.Showtime, walk = g.bots.filter(b => b.state === 'walk'), out = {};
      const kinds = () => [...Array(200)].map(() => S.terrorKind());
      walk.forEach(b => { b.z = .2; });
      out.farOk = S.lightsOutOk(); g.lastKind = null; out.far = kinds().includes('lightsout');
      walk[0].z = 1 - 3 / walk[0].walk;                    // 3 s from the front (bossGuard 5)
      out.nearOk = S.lightsOutOk(); g.lastKind = null; out.near = kinds().includes('lightsout');
      walk[0].z = .2;
      const q = g.queue.splice(0);                         // nothing left to come: only the last machines on the floor
      out.lastOk = S.lightsOutOk(); g.lastKind = null; out.last = kinds().includes('lightsout');
      g.queue.push(...q);
      return out;
    });
    expect(r).toEqual({farOk: true, far: true, nearOk: false, near: false, lastOk: false, last: false});
    watch.check();
  });

  test('MAESTRO: two silent sightings (no freeze, no sound), then the full-screen lunge', async ({page}) => {
    const watch = await show(page);
    await page.evaluate(() => { window.SHOWTIME_SCARES.terror.buildUpS = [.4, .4]; window.__stings = []; const ev = Arcade.Sfx.event; Arcade.Sfx.event = (n, ...a) => { window.__stings.push(n); return ev.call(Arcade.Sfx, n, ...a); }; });
    await page.evaluate(() => Arcade.Showtime.maestro());
    let g = await G(page);
    expect(g.sightings.map(x => x.n)).toEqual([1]);
    expect(g.scare).toBe(null);
    await expect(page.locator('#stSight.s1')).toBeVisible();
    const gap = g.maestro.at - g.t, [lo, hi] = await page.evaluate(() => window.SHOWTIME_SCARES.terror.sightS);
    expect(gap).toBeGreaterThanOrEqual(lo - .1); expect(gap).toBeLessThanOrEqual(hi + .1);
    expect(await page.evaluate(() => Arcade.Pitch.isSuppressed(performance.now()))).toBe(false);
    // the second sighting (brought forward), closer
    await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.maestro.at = g.t; });
    await expect.poll(async () => (await G(page)).sightings.length).toBe(2);
    await expect(page.locator('#stSight.s2')).toBeVisible();
    g = await G(page);
    expect(g.scare).toBe(null);
    expect(await page.evaluate(() => window.__stings.filter(n => /sting|scare|special/.test(n))), 'the sightings are silent').toEqual([]);
    // then the lunge (after its build-up): Maestro Moose, full screen
    await unguard(page);
    await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.maestro.at = g.t; });
    await expect.poll(async () => (await G(page)).scares.map(s => s.kind), {timeout: 8000}).toEqual(['maestro']);
    expect(await page.evaluate(() => document.querySelector('#scareBot .bot-svg') ? 'moose' : '')).toBe('moose');
    expect((await G(page)).dreads.map(d => d.kind)).toEqual(['maestro']);
    await scareOver(page);
    watch.check();
  });

  test('MAESTRO never comes in Showtime 8 (he is the boss there)', async ({page}) => {
    const watch = await show(page, {lv: 8});
    const kinds = await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.band = [{kind: 'owl'}]; return [...Array(300)].map(() => { g.lastKind = null; return Arcade.Showtime.terrorKind(); }); });
    expect(kinds).not.toContain('maestro');
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(5);
    watch.check();
  });
});

test.describe('Showtime Malfunction: TERROR\'s plans', () => {
  test('scares per show: Showtimes 1–3 = 2, 4–6 = 3, 7–8 = 4 (planned by progress); never the same kind twice in a row', async ({page}) => {
    test.setTimeout(60_000);
    const watch = await show(page, {lv: 1, plan: true});
    const plans = {};
    for (let lv = 1; lv <= 8; lv++) {
      if (lv > 1) {
        await page.evaluate(() => Arcade.Showtime.finish());
        await page.locator('#resLevels').click();
        await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
        await page.locator('.ls-start').click();
        await expect.poll(() => page.evaluate(lv => (Arcade.Showtime.debug() || {}).lv === lv && !Arcade.Showtime.debug().over, lv)).toBe(true);
      }
      plans[lv] = await page.evaluate(() => { const g = Arcade.Showtime.debug(); return {n: g.scarePlan.length, afters: g.scarePlan.map(p => p.after), bots: g.L.bots}; });
    }
    const want = {1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3, 7: 4, 8: 4};
    for (let lv = 1; lv <= 8; lv++) {
      expect(plans[lv].n, `showtime ${lv}`).toBe(want[lv]);
      plans[lv].afters.forEach((a, i) => { expect(a).toBeGreaterThanOrEqual(1); expect(a).toBeLessThan(plans[lv].bots); if (i) expect(a).toBeGreaterThan(plans[lv].afters[i - 1]); });
    }
    // never the same kind twice in a row
    const seq = await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.band = [{kind: 'owl'}]; g.lastKind = null; const out = [];
      for (let i = 0; i < 200; i++) { const k = Arcade.Showtime.terrorKind(); out.push(k); g.lastKind = k; } return out; });
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    watch.check();
  });

  test('NIGHTMARE: 4 scares a show', async ({page}) => {
    const watch = await show(page, {lv: 1, gd: {diff: 'extra'}, plan: true});
    expect(await page.evaluate(() => { const g = Arcade.Showtime.debug(); return [g.extra, g.scarePlan.length]; })).toEqual([true, 4]);
    watch.check();
  });

  test('a scare (and a build-up) never costs a spotlight: a machine at the front waits until it is over', async ({page}) => {
    const watch = await show(page);
    await page.evaluate(() => { window.SHOWTIME_SCARES.terror.buildUpS = [1, 1]; });
    await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.bots.filter(b => b.state === 'walk').forEach(b => { b.z = .999; }); Arcade.Showtime.dread('face', {fake: false}); });
    await expect.poll(async () => ((await G(page)).scare || {}).phase, {timeout: 5000}).toBe('scare');
    expect((await G(page)).lights).toBe(3);
    await scareOver(page);
    watch.check();
  });

  test('Jump Scare is as before: its 4 kinds, no build-up, no fake-outs, no lights out (but full screen)', async ({page}) => {
    const watch = await show(page, {gd: {spooky: 'jump'}, terror: false});
    const r = await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.band = [{kind: 'owl'}]; const out = [];
      for (let i = 0; i < 40; i++) { g.scare = null; Arcade.Showtime.scare(null); out.push(g.scares[g.scares.length - 1].kind); } g.scare = null; return out; });
    r.forEach(k => expect(['lunge', 'eyes', 'popup', 'band']).toContain(k));
    await scareOver(page);
    await unguard(page);
    await page.evaluate(() => { const g = Arcade.Showtime.debug(); g.scares.length = 0; g.scarePlan.unshift({at: g.t}); });
    await expect.poll(async () => (await G(page)).scares.length).toBe(1);
    const g = await G(page);
    expect(g.dreads).toEqual([]);
    expect(['lunge', 'eyes', 'popup', 'band']).toContain(g.scares[0].kind);
    expect(await page.evaluate(() => document.body.classList.contains('terror-mode'))).toBe(false);
    await scareOver(page);
    watch.check();
  });

  for (const spooky of ['mild', 'spooky']) {
    test(`${spooky[0].toUpperCase() + spooky.slice(1)} plans no scares and has no Terror look`, async ({page}) => {
      const watch = await show(page, {gd: {spooky}, plan: true});
      expect(await page.evaluate(() => [Arcade.Showtime.debug().scarePlan.length, document.body.classList.contains('terror-mode'), document.body.classList.contains('jump-mode')])).toEqual([0, false, false]);
      watch.check();
    });
  }
});

test.describe('Showtime Malfunction: reduced motion', () => {
  for (const kind of ['face', 'lightsout', 'maestro']) {
    test(`reduced motion: ?demo&scare=${kind} is only the FADE (no build-up, no lunge, no sightings)`, async ({page}) => {
      await page.emulateMedia({reducedMotion: 'reduce'});
      const watch = await show(page, {q: `&scare=${kind}`, plan: true});
      await expect.poll(async () => (await G(page)).scares.length, {timeout: 15_000}).toBeGreaterThan(0);
      const g = await G(page);
      expect(g.scares[0].kind).toBe('fade');
      expect(g.dreads).toEqual([]);
      expect(g.sightings).toEqual([]);
      expect(g.lightsOut).toBe(false);
      const r = await page.evaluate(() => {
        const el = document.getElementById('scare');
        const moving = el.getAnimations({subtree: true}).filter(a => { const k = a.effect.getKeyframes(); return k.some(f => f.transform && f.transform !== 'none' || f.translate); }).length;
        const dark = el.getAnimations({subtree: true}).find(a => a.animationName === 'sc-dark');
        return {moving, darkMs: dark ? dark.effect.getTiming().duration : 0};
      });
      expect(r.moving, 'nothing moves').toBe(0);
      expect(r.darkMs, 'one slow fade').toBeGreaterThanOrEqual(600);
      await scareOver(page);
      watch.check();
    });
  }
});

/* THE FLASH RULE, measured: the scare drawn frame by frame on the TEST CLOCK (page.clock paused; every CSS animation and
   transition paused too and set to the clock's time), a small screenshot every 50 ms, the screen in a 16 × 10 grid of
   cells; a cell's luminance "swing" = a change of ≥ 0.1 (relative luminance) after turning the other way. The rule: no
   cell swings 3 times within one second (≤ 2 opposite changes a second, anywhere). */
/** the screen now, as a 16 × 10 grid of each cell's average relative luminance */
async function grid(page) {
  const png = await page.screenshot();
  return page.evaluate(async b64 => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = document.createElement('canvas');
    const CW = 16, CH = 10; c.width = CW * 8; c.height = CH * 8;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data, f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const cells = new Array(CW * CH).fill(0);
    for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
      const i = (py * c.width + px) * 4;
      cells[Math.floor(py / 8) * CW + Math.floor(px / 8)] += (.2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2])) / 64;
    }
    return cells;
  }, png.toString('base64'));
}
/** the biggest change of any cell between two grids */
const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
async function measure(page, start, totalMs, stepMs = 50) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate(() => {
    const seen = new WeakMap();
    window.__syncAnims = () => {
      const now = performance.now();
      document.getAnimations().forEach(a => { if (!seen.has(a)) { seen.set(a, now); a.pause(); a.currentTime = 0; } else { a.pause(); a.currentTime = now - seen.get(a); } });
    };
    window.__syncAnims();
  });
  await page.evaluate(`(${start})()`);
  const frames = [];
  for (let t = 0; t <= totalMs; t += stepMs) {
    await page.evaluate(() => window.__syncAnims());
    // a capture can show the frame before the animations were set (a busy machine): when a frame differs from the last
    // one, it is captured again until two captures in a row agree, so only what the page really draws is measured
    let cells = await grid(page), prev = frames.length ? frames[frames.length - 1][1] : null;
    for (let k = 0; prev && k < 4 && diff(cells, prev) >= .05; k++) {
      const again = await grid(page);
      if (diff(again, cells) < .02) break;
      cells = again;
    }
    frames.push([t, cells]);
    await page.clock.runFor(stepMs);
  }
  // the swings of every cell
  let worst = 0, where = null;
  for (let c = 0; c < frames[0][1].length; c++) {
    let ext = frames[0][1][c], dir = 0; const swings = [];
    for (const [t, cells] of frames) {
      const L = cells[c];
      if (dir >= 0 && L > ext && dir !== 0) ext = L;
      if (dir <= 0 && L < ext && dir !== 0) ext = L;
      if (dir !== 1 && L - ext >= .1) { swings.push(t); dir = 1; ext = L; }
      else if (dir !== -1 && ext - L >= .1) { swings.push(t); dir = -1; ext = L; }
      else if (dir === 0) ext = L;
    }
    for (let i = 0; i + 2 < swings.length; i++) {
      const span = swings[i + 2] - swings[i];
      if (span <= 1000) { worst = Math.max(worst, 3); where = {cell: c, swings}; }
    }
    worst = Math.max(worst, Math.min(2, swings.length));
  }
  return {frames: frames.length, worst, where};
}
const FLASH = [
  ['lunge', 'scare'], ['eyes', 'scare'], ['popup', 'scare'], ['band', 'scare'], ['face', 'scare'], ['panel', 'scare'], ['maestro', 'scare'], ['fade', 'scare'],
  ['the build-up + a scare', 'dread'], ['a fake-out', 'fake'], ['LIGHTS OUT (+ its EYES ending)', 'lightsout'], ['a sighting', 'sight'],
];
test.describe('Showtime Malfunction: the flash rule, measured', () => {
  for (const [name, how] of FLASH) {
    test(`no flashes: ${name}`, async ({page, browserName}) => {
      // frame by frame on the test clock (~60–90 screenshots): Chromium only (WebKit on CI draws on the CPU, far too slow
      // for this; the scares are the same CSS in both)
      test.skip(browserName !== 'chromium', 'the frame-by-frame measurement runs in Chromium');
      const watch = await show(page, {size: [480, 300], clock: true, q: '&loeyes=1'});
      await page.evaluate(() => {
        const T = window.SHOWTIME_SCARES.terror, g = Arcade.Showtime.debug();
        T.buildUpS = [2, 2]; T.lightsOutS = [2, 2]; g.band = [{kind: 'walrus'}, {kind: 'owl'}, {kind: 'gator'}];
        // the band holds still (its walking is not what's measured here: the scare's light is), nobody new walks on
        g.spawnAt = Infinity; g.bots.forEach(b => { b.walk = 1e9; b.nextLurch = Infinity; });
      });
      const T = await page.evaluate(() => window.SHOWTIME_SCARES);
      const kind = how === 'scare' ? name : null;
      const start = {scare: `() => Arcade.Showtime.scare('${kind}')`, dread: `() => Arcade.Showtime.dread('face', {fake: false})`, fake: `() => Arcade.Showtime.dread('face', {fake: true})`,
        lightsout: `() => Arcade.Showtime.lightsOut()`, sight: `() => Arcade.Showtime.maestro()`}[how];
      // each window: the effect and the lights coming back after it (a slow fade: covered at its start)
      const total = {scare: T.ms + T.beat + (kind === 'panel' ? T.terror.peekMs : 0), dread: 2000 + T.ms + T.beat, fake: 2000 + T.terror.recoverMs,
        lightsout: 2000 + T.ms + T.beat, sight: T.terror.sightMs}[how] + 300;
      const r = await measure(page, start, total);
      expect(r.frames).toBeGreaterThan(20);
      expect(r.worst, `a cell swung 3 times within a second: ${JSON.stringify(r.where)}`).toBeLessThanOrEqual(2);
      watch.check();
    });
  }
});
