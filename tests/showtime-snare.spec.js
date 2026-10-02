/* SHOWTIME MALFUNCTION, THE SNARE DRUM'S JOBS (showtime-malfunction/snare.js, levels.js SNARE_RULES): exact counts
   (confirm, over-hits, the gap), FREEZE, rhythm machines (the shared judge, the timing check's delay, the count-in),
   soft and loud (the soundcheck, p / f machines, accents), even and crescendo rolls, the tempo-lock Maestro, the
   fairness check at every showtime, and a wind player never seeing any of it. Hits are fired with the ?demo hook
   Arcade.Onsets.fake(time, level) (a hit at that exact moment and loudness). */
const {test, expect} = require('@playwright/test');
const {prepare, device, pageEvents} = require('./helpers');

const DYN = {soft: .05, loud: .4, split: .1414, at: 1};
const store = (gd = {}, other = {}) => device('snare', {gameData: Object.assign({'showtime-malfunction': Object.assign({storySeen: true}, gd)}, other)});

/** open a showtime as the snare (?demo&snarejob=… forces every regular machine's job) */
async function open(page, {lv = 1, job = 'count', q = '', gd = {}, other = {}, solo = false, staleRaf = 0} = {}) {
  // WebKit: game sounds off, like every timing test here (rhythm-dojo, tuneup, music-highway). The snare's clock stands
  // still while a sound plays (the microphone is muted then), and the CI runner's WebKit has no sound card, so its
  // sounds don't take their real length: the band's pauses shifted every planned hit early or late ("rushing")
  const quietRun = test.info().project.name === 'webkit' || !!process.env.SNARE_NO_SFX;
  const watch = await prepare(page, {store: store(gd, Object.assign(quietRun ? {sfx: false} : {}, other))});
  // a busy page: every animation frame's timestamp up to `staleRaf` ms older than the moment it runs
  if (staleRaf) await page.addInitScript(ms => { const r = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => r(t => cb(t - Math.random() * ms)); }, staleRaf);
  await page.goto(`showtime-malfunction/index.html?demo&nostart${job ? '&snarejob=' + job : ''}${q}`);
  await page.locator('.ls-card:not(.ls-endless)').nth(lv - 1).click();
  await page.locator('.ls-start').click();
  for (let k = 0; k < 40 && !(await page.evaluate(() => !!Arcade.Showtime.debug())); k++) {
    const go = page.locator('[data-act=go]:visible').first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  await expect.poll(() => page.evaluate(() => !!Arcade.Showtime.debug())).toBe(true);
  if (solo) await page.evaluate(() => { const G = Arcade.Showtime.debug(); G.queue.length = Math.min(G.queue.length, 1); });
  return watch;
}
const sn = page => page.evaluate(() => Arcade.Showtime.snare());
/** close a NEW DRUM CHALLENGE card if one shows */
async function card(page) { if (await page.locator('#spGo').isVisible()) await page.locator('#spGo').click(); }
/** wait until the target exists (and the check passes), closing any challenge card */
async function waitFor(page, check, timeout = 30_000) {
  let s = null;
  try { await expect.poll(async () => { await card(page); s = await sn(page); return !!(s && s.target && check(s)); }, {timeout}).toBe(true); } catch (e) {
    const t = s && s.target, J = t && t.job;              // stuck: what the snare had, and what the page went through
    e.message += `\n  the snare: ${JSON.stringify({phase: t && t.phase, job: J && {type: J.type, start: J.start, fill: J.fill, phaseDone: J.phaseDone}, log: s && s.log && s.log.slice(-12)})}\n  the page: ${await pageEvents(page)}`;
    e.message += `\n  the audio clock: ${await audioClock(page)}`;
    throw e;
  }
  return s;
}
/** how the page's AudioContext time moves against real time over ~1.2 s (20 samples): its state, latency, output
    timestamp and each step, so a stuck test shows whether the audio clock stalls, jumps or runs at the wrong rate */
const audioClock = page => Promise.race([page.evaluate(() => new Promise(res => {
  const o = Arcade.Sfx.output && Arcade.Sfx.output(), c = o && o.ctx;
  if (!c) return res('no AudioContext');
  const out = [], p0 = performance.now(), c0 = c.currentTime;
  const iv = setInterval(() => {
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : {};
    out.push([Math.round(performance.now() - p0), Math.round((c.currentTime - c0) * 1000), ts.contextTime != null ? Math.round(ts.contextTime * 1000) : null, ts.performanceTime != null ? Math.round(ts.performanceTime) : null]);
    if (out.length >= 20) { clearInterval(iv); res(JSON.stringify({state: c.state, rate: c.sampleRate, base: c.baseLatency, out: c.outputLatency, steps: '[perf ms, ctx ms, outTs ctx ms, outTs perf]', samples: out})); }
  }, 60);
})).catch(e => 'page gone: ' + e.message.split('\n')[0]), new Promise(r => setTimeout(() => r('no answer'), 5000))]);
/** not muted (a sound playing mutes the microphone: nothing counts then) */
const quiet = page => expect.poll(async () => { await card(page); return page.evaluate(() => !Arcade.Pitch.isSuppressed(performance.now()) && !Arcade.Showtime.debug().paused &&
  !Arcade.Sfx.pending('showtime') && !(Arcade.Sfx.busy() > 0)); }, {timeout: 15_000}).toBe(true);   // (a card closed; no sound still queued: a card's second sound)
const hit = (page, level = .3) => page.evaluate(l => Arcade.Onsets.fake(performance.now(), l), level);
async function hits(page, n, gap = 160, level = .3) { for (let k = 0; k < n; k++) { await hit(page, level); await page.waitForTimeout(gap); } }
const bot = (page, id) => page.evaluate(i => { const G = Arcade.Showtime.debug(); if (!G) return {state: 'show over'}; const b = G.bots.find(x => x.id === i); return b && {state: b.state, left: b.left, z: b.z, phase: b.phase}; }, id);

/* a rhythm / accent / tempo job: wait for a fresh count-in, then fire the measure's hits at exact moments.
   offsets {i: ms}, skip [i], extra [beats after the downbeat], levels (per note, or one level), countIn (hit the count-in's beats too) */
async function freshCountIn(page) {
  // checked every 100 ms: the window (measure 0 still ≥ 0.9 s away) is short, and a busy machine's checks are slow.
  // When it has gone by (the job got past measure 0: failed measures and the Maestro's tempo go on with the pulse, never
  // back to a count-in), the band stands still for a moment (the pause), which by the game's own rule starts the job
  // again from its count-in
  await expect.poll(async () => {
    await card(page);
    return page.evaluate(() => {
      const P = Arcade.Showtime.snarePlan(), G = Arcade.Showtime.debug();
      if (!P || !G || window.__restarting) return false;
      const ahead = P.measureStartPerf - performance.now();
      if (P.k === 0 && ahead > 900 && !Arcade.Pitch.isSuppressed(performance.now())) return true;
      if ((P.k > 0 || ahead <= 900) && !G.paused) { window.__restarting = true; G.paused = true; setTimeout(() => { G.paused = false; setTimeout(() => { window.__restarting = false; }, 200); }, 120); }
      return false;
    });
  }, {timeout: 30_000, intervals: [100]}).toBe(true);
}
function playMeasure(page, o = {}) {
  return page.evaluate(o => {
    // each hit is handed over up to 0.3 s BEFORE its moment, stamped with that exact moment (the game judges a measure
    // only at its end, by the hits' times): a busy machine's late timer can't make a hit miss its measure
    const P = Arcade.Showtime.snarePlan(), now = performance.now(), fire = (at, lv) => setTimeout(() => Arcade.Onsets.fake(at, lv), Math.max(0, at - 300 - performance.now()));
    const lvOf = i => Array.isArray(o.levels) ? o.levels[i] : o.levels != null ? o.levels : .3, ahead = (o.m || 0) * P.measureS * 1000;
    P.perfOf.forEach((at, i) => { if ((o.skip || []).includes(i)) return; fire(at + ahead + ((o.offsets || {})[i] || 0), lvOf(i)); });
    (o.extra || []).forEach(b => fire(P.measureStartPerf + b * P.beatS * 1000, .3));
    if (o.countIn) for (let k = 0; k < 4; k++) fire(P.countInPerf + k * P.beatS * 1000, .3);
    return {P, now};
  }, o);
}
const judged = (page, k = 0) => expect.poll(() => page.evaluate(k => { const s = Arcade.Showtime.snare(); return !!(s && s.last && s.last.k === k); }, k), {timeout: 15_000}).toBe(true);

test.describe('Showtime Malfunction: the snare drum', () => {
  test.describe.configure({timeout: 120_000});

  /* ---------- EXACT COUNTS ---------- */
  test('exact counts: a hit while it waits at 0 is an over-hit (+2, no reboot); silence reboots it', async ({page}) => {
    const watch = await open(page, {lv: 1});
    let s = await waitFor(page, s => s.target.job.type === 'count');
    await quiet(page);
    const id = s.target.id, n = s.target.left;
    await hits(page, n - 1);
    await expect(page.locator('#tpCount .sn-andstop')).toBeVisible();                   // "…and STOP" at 1
    // the last hit, then (inside the 350 ms wait) one more: in the page, at exact moments
    const r = await page.evaluate(() => {
      const t0 = performance.now(); Arcade.Onsets.fake(t0, .3);
      const waiting = Arcade.Showtime.snare().confirm;
      Arcade.Onsets.fake(t0 + 150, .3);                                                  // (in the same task: a busy test machine can't delay it past the wait)
      return {waiting};
    });
    expect(r.waiting && r.waiting.id).toBe(id);                                           // at 0 it waits (CONFIRM)
    s = await sn(page);                                                                  // …and heard one more
    expect(s.target.left).toBe(2);
    expect(s.confirm).toBe(null);
    expect(s.log).toContain('overhit');
    await expect(page.locator('#prompt')).toContainText('Too many!');
    expect((await bot(page, id)).state).toBe('walk');
    await hits(page, 2);                                                                 // count it down again, then silence
    await expect.poll(async () => (await bot(page, id)).state, {timeout: 5000}).not.toBe('walk');
    watch.check();
  });

  test('exact counts: hits in the gap after a reboot count for nothing; a two-hand spam burst never reboots a × 6', async ({page}) => {
    const watch = await open(page, {lv: 3});                                              // two on the floor, × 6 each
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.filter(b => b.state === 'walk').length), {timeout: 30_000}).toBe(2);
    let s = await waitFor(page, () => true);
    await quiet(page);
    const first = s.target.id;
    const second = await page.evaluate(f => Arcade.Showtime.debug().bots.find(b => b.state === 'walk' && b.id !== f).id, first);
    const left = (await bot(page, second)).left;
    // in the page (no round trips): the first one's hits, its reboot, and as soon as the reboot's sound is over (the gap
    // runs from then) 5 hits 150 ms apart: nothing counts, and each one starts the gap again
    await page.evaluate(([f, n]) => new Promise(res => {
      const G = () => Arcade.Showtime.debug(), t0 = performance.now();
      for (let k = 0; k < n; k++) setTimeout(() => Arcade.Onsets.fake(t0 + k * 150, .3), k * 150);
      const go = () => {
        const b = G().bots.find(x => x.id === f);
        if (b.state === 'walk' || Arcade.Pitch.isSuppressed(performance.now()) || G().paused) return setTimeout(go, 5);
        const t1 = performance.now();
        for (let k = 0; k < 5; k++) setTimeout(() => Arcade.Onsets.fake(t1 + k * 150, .3), k * 150);
        setTimeout(res, 5 * 150);
      };
      setTimeout(go, n * 150);
    }), [first, s.target.left]);
    s = await sn(page);
    expect(s.target.left).toBe(left);
    expect(s.log.filter(x => x === 'gap').length).toBeGreaterThanOrEqual(4);
    await page.waitForTimeout(700);                                                      // silence: now it listens
    // THE SPAM BURST: 8 hits 60 ms apart (both hands as fast as possible) on a × 6
    await page.evaluate(n => { const t0 = performance.now(); for (let k = 0; k < n; k++) setTimeout(() => Arcade.Onsets.fake(t0 + k * 60, .3), k * 60); }, left + 2);
    await page.waitForTimeout(left * 60 + 1400);
    const b = await bot(page, second);
    expect(b.state).toBe('walk');                                                        // never rebooted by spamming
    expect(b.left).toBe(1);                                                              // 6 down, +2 for the over-hit, 1 more down
    watch.check();
  });

  /* ---------- FREEZE ---------- */
  test('freeze: the hand rises partway; a hit during it adds 2; everyone walks at half speed; GO! after', async ({page}) => {
    const watch = await open(page, {lv: 2, job: 'freeze'});
    let s = await waitFor(page, s => s.target.freezeAt > 0);
    await quiet(page);
    const id = s.target.id;
    for (let k = 0; k < 8 && !(await sn(page)).freeze; k++) await hits(page, 1, 250);
    await card(page);                                                                    // (the first freeze: NEW DRUM CHALLENGE)
    await quiet(page);
    // the freeze lasts a few beats of game time: its state and what's on screen are read in ONE call (the same moment;
    // a busy machine's next call can already be after GO!)
    s = await page.evaluate(() => { const shown = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; };
      return Object.assign(Arcade.Showtime.snare(), {hand: shown('stHand'), panel: shown('tpFreeze')}); });
    expect(s.freeze && s.freeze.id).toBe(id);
    expect(s.freeze.beats).toBe(await page.evaluate(() => window.SNARE_RULES.freeze.beats[1]));
    expect(s.walkMul).toBe(.5);
    expect(s.hand, 'the raised hand').toBe(true);
    expect(s.panel, 'the FREEZE panel').toBe(true);
    // half speed: z moves dt / walk × 0.5 on the game clock
    const a = await page.evaluate(i => { const G = Arcade.Showtime.debug(), b = G.bots.find(x => x.id === i); return {t: G.t, z: b.z, walk: b.walk}; }, id);
    await page.waitForTimeout(400);
    const b2 = await page.evaluate(i => { const G = Arcade.Showtime.debug(), b = G.bots.find(x => x.id === i); return {t: G.t, z: b.z, frozen: !!Arcade.Showtime.snare().freeze}; }, id);
    if (b2.frozen) expect((b2.z - a.z) / ((b2.t - a.t) / a.walk)).toBeCloseTo(.5, 1);
    const before = (await sn(page)).target.left;
    await hit(page);
    s = await sn(page);
    if (s.freeze) {
      expect(s.target.left).toBe(before + 2);
      await expect(page.locator('#prompt')).toContainText('Freeze means FREEZE');
    }
    await expect.poll(async () => (await sn(page)).freeze, {timeout: 10_000}).toBe(null);
    expect((await sn(page)).walkMul).toBe(1);
    watch.check();
  });

  test('freeze: never in the last seconds before a machine reaches the front', async ({page}) => {
    const watch = await open(page, {lv: 2, job: 'freeze'});
    let s = await waitFor(page, s => s.target.freezeAt > 0);
    await quiet(page);
    const id = s.target.id, need = s.target.left - s.target.freezeAt;
    await hits(page, need - 1, 200);
    await page.evaluate(i => { const b = Arcade.Showtime.debug().bots.find(x => x.id === i); b.z = 1 - 1.2 / b.walk; }, id);   // 1.2 s from the front
    await hit(page);
    s = await sn(page);
    expect(s.freeze).toBe(null);
    expect(s.log).toContain('freeze-guard');
    watch.check();
  });

  /* ---------- RHYTHM MACHINES ---------- */
  test('rhythm: the tempo comes from SNARE_RULES; an exact performance (with count-in hits) passes and reboots it', async ({page}) => {
    const watch = await open(page, {lv: 3, job: 'rhythm', solo: true});
    const s = await waitFor(page, s => s.target.job.type === 'rhythm' && s.target.job.start != null);
    expect(s.target.job.bpm).toBe(await page.evaluate(() => window.SNARE_RULES.rhythm.bpm[2]));
    expect(s.target.job.measures).toBe(await page.evaluate(() => window.SNARE_RULES.rhythm.measures[2]));
    await expect(page.locator('#tpStaff svg.rs')).toBeVisible();                          // the rhythm with the counting
    await expect(page.locator('#tpStaff .rc-big').first()).toBeVisible();
    await freshCountIn(page);
    const id = s.target.id;
    await playMeasure(page, {countIn: true});                                             // the count-in's hits never count
    await judged(page);
    const r = await sn(page);
    expect(r.last.pass).toBe(true);
    expect(r.last.extras).toBe(0);
    await expect.poll(async () => (await bot(page, id)).state, {timeout: 5000}).not.toBe('walk');
    watch.check();
  });

  // the snare's clock runs on performance.now() (the time hits are stamped with), never the frame's timestamp: on a busy
  // page (a slow iPad, a loaded CI runner) that can be 150 ms behind, and a hit 250 ms early was judged an EXTRA hit
  for (const [name, off, kind] of [['early', -250, 'early'], ['late', 250, 'late'], ['on time', 0, null]]) {
    test(`a busy page's late animation frames don't move the judging: a hit ${name} is judged ${kind || 'on time'}`, async ({page}) => {
      const watch = await open(page, {lv: 3, job: 'rhythm', solo: true, staleRaf: 150});
      const s = await waitFor(page, s => s.target.job.type === 'rhythm' && s.target.job.start != null);
      await page.evaluate(i => { const b = Arcade.Showtime.debug().bots.find(x => x.id === i); b.job.list[b.job.idx].text = 'q q q q'; }, s.target.id);
      await freshCountIn(page);
      await playMeasure(page, {offsets: {1: off}});
      await judged(page);
      const r = await sn(page);
      if (kind) { expect(r.last.pass).toBe(false); expect(r.target.job.marks.hits.map(h => h.kind)).toEqual([kind]); }
      else expect(r.last.pass).toBe(true);
      watch.check();
    });
  }

  test('rhythm on NIGHTMARE: the tempo × nightmareBpm', async ({page}) => {
    const watch = await open(page, {lv: 3, job: 'rhythm', gd: {diff: 'extra'}});
    const s = await waitFor(page, s => s.target.job.type === 'rhythm');
    expect(s.target.job.bpm).toBe(await page.evaluate(() => Math.round(window.SNARE_RULES.rhythm.bpm[2] * window.SNARE_RULES.rhythm.nightmareBpm)));
    watch.check();
  });

  for (const [name, o, kind] of [['early', {offsets: {1: -250}}, 'early'], ['late', {offsets: {1: 250}}, 'late'], ['missing', {skip: [1]}, 'miss'], ['extra', {extra: [3.5]}, 'extra']]) {
    test(`rhythm: an ${name} hit fails the measure, shows the tick, and the same rhythm comes again`, async ({page}) => {
      const watch = await open(page, {lv: 3, job: 'rhythm', solo: true});
      const s = await waitFor(page, s => s.target.job.type === 'rhythm' && s.target.job.start != null);
      // a fixed rhythm (a note on every beat, nothing on the last & ), so the extra hit lands in no note's window
      await page.evaluate(i => { const b = Arcade.Showtime.debug().bots.find(x => x.id === i); b.job.list[b.job.idx].text = 'q q q q'; }, s.target.id);
      await freshCountIn(page);
      await playMeasure(page, o);
      await judged(page);
      const r = await sn(page);
      expect(r.last.pass).toBe(false);
      expect(r.target.id).toBe(s.target.id);
      expect(r.target.job.text).toBe('q q q q');                                          // the same rhythm again
      if (kind === 'miss') expect(r.target.job.marks.miss).toContain(1);
      else expect(r.target.job.marks.hits.map(h => h.kind)).toContain(kind);
      await expect(page.locator(kind === 'miss' ? '#tpStaff .sn-miss' : `#tpStaff .sn-tick.${kind}`).first()).toBeAttached();
      watch.check();
    });
  }

  test('rhythm: a hit in a rest fails the measure', async ({page}) => {
    const watch = await open(page, {lv: 4, job: 'rhythm', solo: true});
    const s = await waitFor(page, s => s.target.job.type === 'rhythm' && s.target.job.start != null);
    await page.evaluate(i => { const b = Arcade.Showtime.debug().bots.find(x => x.id === i); b.job.list[b.job.idx].text = 'q qr q q'; }, s.target.id);
    await freshCountIn(page);
    await playMeasure(page, {extra: [1]});                                                // beat 2 is a rest
    await judged(page);
    const r = await sn(page);
    expect(r.last.pass).toBe(false);
    expect(r.last.extras).toBe(1);
    await expect(page.locator('#prompt')).toContainText('extra hit');
    watch.check();
  });

  test('rhythm: the timing check\'s delay is taken off every hit', async ({page}) => {
    const watch = await open(page, {lv: 3, job: 'rhythm', other: {'rhythm-dojo': {calib: {clap: {ms: 300, n: 8, at: 1}}}}, solo: true});
    const s = await waitFor(page, s => s.target.job.type === 'rhythm' && s.target.job.start != null);
    expect(s.lag).toBe(300);
    await freshCountIn(page);
    const {P} = await playMeasure(page);                                                  // every hit heard 300 ms after the note
    expect(P.lag).toBe(300);
    await judged(page);
    expect((await sn(page)).last.pass).toBe(true);
    watch.check();
  });

  /* ---------- SOFT AND LOUD ---------- */
  test('the soundcheck refuses a too-close pair, then stores the split halfway (log scale)', async ({page}) => {
    const watch = await prepare(page, {store: store()});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await page.evaluate(() => Arcade.Showtime.soundcheck());
    await expect(page.locator('#stSound')).toBeVisible();
    const four = async lv => { for (let k = 0; k < 4; k++) { await page.evaluate(l => Arcade.Onsets.fake(performance.now(), l), lv); await page.waitForTimeout(120); } };
    await four(.1); await four(.15);
    await expect(page.locator('#stSoundSay')).toContainText('Make the soft hits softer and the loud hits louder');
    expect(await page.evaluate(() => Arcade.store.gameData('showtime-malfunction').snareDyn || null)).toBe(null);
    await four(.05); await four(.4);
    await expect.poll(() => page.evaluate(() => (Arcade.store.gameData('showtime-malfunction').snareDyn || {}).split || null)).toBeCloseTo(Math.sqrt(.05 * .4), 3);
    await expect(page.locator('#stSound')).toBeHidden();
    // a dynamics showtime with no soundcheck saved runs it first
    await page.evaluate(() => { delete Arcade.store.gameData('showtime-malfunction').snareDyn; Arcade.store.saveGameData('showtime-malfunction'); });
    await page.reload();
    await page.locator('.ls-card:not(.ls-endless)').nth(4).click();
    await page.locator('.ls-start').click();
    for (let k = 0; k < 20 && !(await page.locator('#stSound').isVisible()); k++) { const go = page.locator('[data-act=go]:visible').first(); if (await go.count()) await go.click().catch(() => {}); await page.waitForTimeout(150); }
    await expect(page.locator('#stSound')).toBeVisible();
    watch.check();
  });

  test('a p machine counts only soft hits (a loud one adds 1); an f machine counts only loud ones', async ({page}) => {
    for (const job of ['p', 'f']) {
      const watch = await open(page, {lv: 5, job, gd: {snareDyn: DYN}, solo: true});
      const s = await waitFor(page, s => s.target.job.type === job);
      await quiet(page);
      const left = s.target.left;
      await hit(page, job === 'p' ? DYN.loud : DYN.soft);                                 // the wrong loudness
      expect((await sn(page)).target.left).toBe(job === 'p' ? left + 1 : left);
      await expect(page.locator('#prompt')).toContainText(job === 'p' ? 'Softer!' : 'Louder!');
      await page.waitForTimeout(150);
      await hit(page, job === 'p' ? DYN.soft : DYN.loud);                                 // the right one
      expect((await sn(page)).target.left).toBe(job === 'p' ? left : left - 1);
      await expect(page.locator('#tpStaff .sn-dyn')).toHaveText(job);
      watch.check();
    }
  });

  test('an accent measure fails when an accent is soft or an unaccented hit is loud; right loudness passes', async ({page}) => {
    const watch = await open(page, {lv: 6, job: 'accent', gd: {snareDyn: DYN}, solo: true});
    const s = await waitFor(page, s => s.target.job.type === 'accent' && s.target.job.start != null);
    await expect(page.locator('#tpStaff .sn-acc').first()).toBeAttached();                // the accents on the staff
    const acc = s.target.job.accents;
    await page.evaluate(() => Arcade.Showtime.debug().bots.forEach(b => { b.walk *= 20; }));  // three measures in a row: it must not reach the front meanwhile (a busy machine's test steps are slow)
    const levels = f => acc.map((a, i) => f(a, i));
    // three measures in a row (a failed measure is played again right away, the pulse going on): every hit soft, then
    // every hit loud, then right
    await freshCountIn(page);
    await playMeasure(page, {levels: levels(() => DYN.soft)});
    await playMeasure(page, {m: 1, levels: levels(() => DYN.loud)});
    await playMeasure(page, {m: 2, levels: levels(a => a ? DYN.loud : DYN.soft)});
    // each measure's judgment and its prompt, read together the moment it is judged (the next measure follows ~2.7 s
    // later and replaces the prompt: a busy machine's separate check could see that one)
    for (const [k, why] of [[0, 'Accents louder!'], [1, 'Keep the others soft!']]) {
      let r = null;
      await expect.poll(async () => { r = await page.evaluate(k => { const s = Arcade.Showtime.snare(); return s && s.last && s.last.k === k ? {pass: s.last.pass, loudness: s.last.loudness, prompt: document.getElementById('prompt').textContent} : null; }, k); return !!r; },
        {timeout: 15_000, intervals: [100]}).toBe(true);
      expect(r.pass, `measure ${k}`).toBe(false);
      expect(r.loudness).toBe(why);
      expect(r.prompt).toContain(why);
    }
    await judged(page, 2);
    expect((await sn(page)).last.pass).toBe(true);
    watch.check();
  });

  /* ---------- ROLLS ---------- */
  /** a roll from inside the page: `gaps` ms between hits (repeated), at `level` (a function of the hit number, or a number) */
  const roll = (page, ms, gaps, level = .3) => page.evaluate(([ms, gaps, level]) => new Promise(res => {
    const t0 = performance.now(), times = [];
    for (let t = 0, k = 0; t < ms; t += gaps[k % gaps.length], k++) times.push(t0 + t);
    times.forEach(at => setTimeout(() => Arcade.Onsets.fake(at, level), Math.max(0, at - performance.now())));
    setTimeout(res, ms + 30);
  }), [ms, gaps, level]);
  /** the walking special's ring (id: that machine only: null once it has rebooted) */
  const holdP = (page, id) => page.evaluate(id => { const G = Arcade.Showtime.debug(); const b = G && G.bots.find(x => x.special && x.state === 'walk' && (id == null || x.id === id)); return b ? {id: b.id, p: b.holdP, need: b.need, t: G.t, cresc: !!b.cresc} : null; }, id);

  test('the Lurker\'s roll: an even roll fills at full speed, a clumpy one at 0.3×', async ({page}) => {
    const watch = await open(page, {lv: 2, job: null, q: '&special=long-tone-lurker'});
    await waitFor(page, s => s.target.job.type === 'roll');
    await quiet(page);
    // the judgment itself (hits already in, then asked now: timers can't bunch them up on a busy machine)
    const judge = gaps => page.evaluate(gaps => {
      const now = performance.now(), times = [];
      for (let t = 950, k = 0; t >= 0; t -= gaps[k % gaps.length], k++) times.push(now - t);
      times.forEach(at => Arcade.Onsets.fake(at, .3));
      return Arcade.Showtime.snareRoll();
    }, gaps);
    const uneven = await judge([40, 210]);                                               // 8 a second, but clumpy (gaps 40 / 210 ms)
    expect(uneven.holding).toBe(true); expect(uneven.mul).toBe(.3); expect(uneven.msg).toContain('Smooth it out');
    await page.waitForTimeout(1100);                                                       // (those hits leave the 1 s window)
    const even = await judge([125]);
    expect(even.holding).toBe(true); expect(even.mul).toBe(1);
    const slow = await (async () => { await page.waitForTimeout(1100); return judge([300]); })();   // too slow: not a roll
    expect(slow.holding).toBe(false);
    // and the ring really fills while an even roll goes on
    const a = await holdP(page); await roll(page, 1500, [125]); const b = await holdP(page, a.id);
    expect(b ? b.p : Infinity).toBeGreaterThan(a.p);
    watch.check();
  });

  test('NIGHTMARE: the Glitch Lurker\'s crescendo roll needs a rising level', async ({page}) => {
    const watch = await open(page, {lv: 2, job: null, q: '&special=glitch-lurker', gd: {diff: 'extra'}});
    await waitFor(page, s => s.target.job.type === 'roll' && s.target.cresc);
    await quiet(page);
    await expect(page.locator('#tpCount .hold-ring.cresc')).toBeVisible();                 // the ring shows a hairpin
    // the level of each third is learned from its hits; past the first third the roll must be crescK louder than the
    // third before (hits already in, then asked now: timers can't bunch them up on a busy machine)
    const judge = (level, share) => page.evaluate(([level, share]) => {
      const now = performance.now(), b = Arcade.Showtime.debug().bots.find(x => x.special && x.state === 'walk');
      b.holdP = b.need * share;                                                            // (how full the ring is)
      for (let t = 950; t >= 0; t -= 125) Arcade.Onsets.fake(now - t, level);
      return Object.assign({id: b.id}, Arcade.Showtime.snareRoll());
    }, [level, share]);
    const first = await judge(.2, 0), id = first.id;
    expect(first.mul).toBe(1);                                                 // the first third: any steady level
    const thirds = await page.evaluate(i => Arcade.Showtime.debug().bots.find(x => x.id === i).thirds, id);
    expect(thirds[0].avg).toBeCloseTo(.2, 5);
    await page.waitForTimeout(1100);
    const flat = await judge(.2, .4);                                                      // the second third, no louder
    expect(flat.holding).toBe(true); expect(flat.mul).toBe(0); expect(flat.msg).toContain('Louder');
    await page.waitForTimeout(1100);
    const up = await judge(.3, .4);                                                        // louder: it fills again
    expect(up.holding).toBe(true); expect(up.mul).toBe(1);
    watch.check();
  });

  /* ---------- THE TEMPO-LOCK MAESTRO ---------- */
  test('NIGHTMARE Encore: steady eighths at the phase tempo fill it; rushing drains it and says "rushing"', async ({page}) => {
    const watch = await open(page, {lv: 8, job: null, gd: {diff: 'extra', snareDyn: DYN}});
    await page.evaluate(() => { Arcade.Showtime.debug().queue.length = 0; });            // Maestro Moose alone
    let s = await waitFor(page, s => s.target.job.type === 'tempo' && s.target.job.start != null);
    expect(s.target.job.bpm).toBe(await page.evaluate(() => window.SNARE_RULES.maestro.bpm[0]));
    await freshCountIn(page);
    // each eighth handed over up to 0.3 s before its moment, stamped with that moment (the Maestro judges every hit by its
    // own time), so a busy machine's late timer can't push one out of the window
    const eighths = (spacing, n) => page.evaluate(([spacing, n]) => {
      const P = Arcade.Showtime.snarePlan(), e8 = P.beatS * 500;
      for (let i = 0; i < n; i++) { const at = P.measureStartPerf + i * e8 * spacing; setTimeout(() => Arcade.Onsets.fake(at, .3), Math.max(0, at - 300 - performance.now())); }
      return P.beatS;
    }, [spacing, n]);
    // 16 good eighths fill the meter (2 × maestro.beats); 4 spares, so one lost hit can't leave it a step short (the
    // spares land in the next phase's count-in, which never counts)
    const beatS = await eighths(1, 20);
    await page.waitForTimeout((4 + 8.5) * beatS * 1000);
    s = await waitFor(page, s => s.target.phase === 2 && s.target.job.start != null);
    expect(s.target.job.bpm).toBe(await page.evaluate(() => window.SNARE_RULES.maestro.bpm[1]));   // a new tempo each phase
    await freshCountIn(page);
    const b2 = await eighths(.8, 10);                                                     // rushing: every eighth 20 % early
    await page.waitForTimeout((4 + 5) * b2 * 1000);
    s = await sn(page);
    expect(s.log).toContain('rushing');
    expect(s.target.job.fill).toBeLessThan(.3);
    await expect(page.locator('#prompt')).toContainText('rushing');
    watch.check();
  });

  /* ---------- THE FAIRNESS CHECK ---------- */
  test('fairness: no snare job ever needs more than `margin` of the time its machine walks (every showtime, Normal and NIGHTMARE)', async ({page}) => {
    const watch = await open(page, {lv: 1, job: null, gd: {snareDyn: DYN}});
    const bad = await page.evaluate(() => {
      const G = Arcade.Showtime.debug(), F = window.SNARE_RULES.fair, out = [];
      for (let lv = 1; lv <= 8; lv++) for (const x of [false, true]) {
        const L0 = window.SHOWTIMES[lv - 1], X = x ? L0.x : {};
        G.lv = lv; G.extra = x;
        G.L = Object.assign({}, L0, {snare: X.snare || L0.snare, walk: L0.walk / (X.speed || 1),
          boss: L0.boss && Object.assign({}, L0.boss, X.boss || {}, {walk: L0.boss.walk / (X.speed || 1)})});
        const specs = ['count', 'rhythm', 'accent', 'p', 'f'].map(j => [{kind: 'walrus', count: G.L.snare[1], forceJob: j}, false]);
        specs.push([{kind: 'long-tone-lurker', special: 'long-tone-lurker', traits: ['long-tone-lurker'], count: 1, need: window.SHOWTIME_SPECIALS.machines['long-tone-lurker'].roll[lv - 1], speed: .85}, false]);
        specs.push([{kind: 'turbo-tin', special: 'turbo-tin', traits: ['turbo-tin'], count: 3, speed: 2}, false]);
        if (G.L.boss) specs.push([{kind: 'moose', count: G.L.boss.snare}, true]);
        for (const [spec, boss] of specs) for (let k = 0; k < 4; k++) {
          const s = Arcade.Showtime.snareJob(spec, boss), walk = s.walk || G.L.walk / (s.speed || 1);
          if (s.snareNeed > walk * s.snareShows * F.margin + 1e-6) out.push({lv, x, job: s.job.type, need: s.snareNeed, walk});
        }
      }
      return out;
    });
    expect(bad).toEqual([]);
    watch.check();
  });

  /* ---------- WIND PLAYERS: nothing changes ---------- */
  test('a wind player never sees a snare job', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {gameData: {'showtime-malfunction': {storySeen: true}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart&snarejob=rhythm');
    await expect(page.locator('#snareCard')).toBeHidden();
    await page.locator('.ls-card:not(.ls-endless)').nth(5).click();
    await page.locator('.ls-start').click();
    for (let k = 0; k < 40 && !(await page.evaluate(() => !!Arcade.Showtime.debug())); k++) { const go = page.locator('[data-act=go]:visible').first(); if (await go.count()) await go.click().catch(() => {}); await page.waitForTimeout(150); }
    await expect.poll(() => page.evaluate(() => Arcade.Showtime.debug().bots.length), {timeout: 20_000}).toBeGreaterThan(0);
    const r = await page.evaluate(() => ({sn: Arcade.Showtime.snare(), jobs: Arcade.Showtime.debug().bots.map(b => b.job || null), on: document.getElementById('tpanel').classList.contains('sn-on'),
      beats: !!document.getElementById('tpBeats'), hand: !!document.getElementById('stHand')}));
    expect(r.sn).toBe(null);
    expect(r.jobs.every(j => j === null)).toBe(true);
    expect([r.on, r.beats, r.hand]).toEqual([false, false, false]);
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    await page.locator('#filesBtn').click();
    await expect(page.locator('#files .file').first()).toBeVisible();
    await expect(page.locator('#drumFilesSec')).toHaveCount(0);                            // no DRUM CHALLENGES in their files
    watch.check();
  });

  test('the snare card lists what each showtime adds; the Malfunction Files have DRUM CHALLENGES', async ({page}) => {
    const watch = await prepare(page, {store: store({files: {'drum-rhythm': {seen: 1, beaten: 2}}})});
    await page.goto('showtime-malfunction/index.html?demo&nostart');
    const t = await page.locator('#snareCard').innerText();
    ['Showtime 2', 'FREEZE', 'read rhythms', 'soft and loud', 'accents'].forEach(x => expect(t).toContain(x));
    await expect(page.locator('#snTiming')).toHaveText('Check your timing');
    await page.locator('#filesBtn').click();
    await expect(page.locator('#drumFilesSec')).toHaveText(/Drum challenges/i);
    expect(await page.locator('#files .file.f-drum').count()).toBe(7);
    await expect(page.locator('#files .file[data-id="drum-rhythm"] .f-count')).toHaveText('Beaten 2 times');
    await expect(page.locator('#filesCount')).toHaveText('0/14');                          // the machines' count is unchanged
    watch.check();
  });
});
