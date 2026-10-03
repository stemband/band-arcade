/* NEON FACE-OFF: SMASH and POWER shots are really faster. Each power level has its own minimum crossing time, a share
   of the receiver's window, never under the absolute floor (levels.js FACEOFF_RULES: power[].factor/minShare, hardMin):
     T = max(base × factor, receiver's window × minShare, hardMin)
   - the formula itself (Arcade.FaceOff.crossTime) at every rally length and difficulty: SMASH < POWER < GOOD, never
     under hardMin, the long-rally smash times written in levels.js (Rookie 1.6 s, Pro 1.0 s, All-Star 0.9 s);
   - real shots in ?demo (struck with a set reaction time through Arcade.FaceOffDemoHit, the rally base set through
     Arcade.FaceOff.M.base): with the receiver on Rookie / Pro / All-Star each power crosses in its formula ±50 ms,
     the puck holds until the receiver's mic is live (a long extra mute never shortens the crossing);
   - vs The Champ (seeded Math.random) a long-rally smash is sometimes returned and sometimes scores;
   - the look: a SMASH has a long trail + speed lines in the hitter's color and "INCOMING!" on the receiver's panel,
     POWER a medium trail; reduced motion: no trail, no lines, only the color. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const BASE = 6, SPEEDUP = 0.92;                                  // levels.js serveTime, rallySpeedUp (checked below)
const WINDOWS = {rookie: 4.0, pro: 2.5, allstar: 1.5};
/* the reaction time each shot is played with (seconds), through the ?demo hook Arcade.FaceOffDemoHit: the detector's
   own latency on a busy test machine never moves a shot into another power band (the microphone path itself is
   tests/faceoff-notes.spec.js's and the game run's) */
const REACT = {'SMASH!': 0.5, POWER: 1.4, GOOD: 2.4, WEAK: 3.5};

async function open(page, {p2 = 'flute', diff = 'rookie', rival = 1, reduce = false, seed = 0} = {}) {
  const watch = await prepare(page, {store: device('trumpet', {opponent: p2,
    gameData: {'neon-face-off': {smashTip: true, settings: {p1: {diff}, p2: {diff}, points: 11, rival}}}})});
  if (reduce) await page.emulateMedia({reducedMotion: 'reduce'});
  if (seed) await page.addInitScript(s => {                      // a seeded Math.random (mulberry32): the CPU's dice
    let a = s >>> 0;
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  await page.goto('neon-face-off/index.html?demo&nostart');
  // a quicker break between points (only the pause before the next serve; nothing about a shot)
  await page.evaluate(() => { FACEOFF_RULES.celebrateMs = 250; });
  await page.locator('#startBtn').click();
  const go = page.locator('[data-act=go]:visible');
  if (await go.count()) await go.first().click();
  // every frame: a puck in travel whose receiver's mic is not live yet must be held at the mallet
  await page.evaluate(() => {
    window.__bad = [];
    const tick = () => { const s = Arcade.FaceOff.state(); if (s && s.state === 'travel' && !s.live && !s.hold) window.__bad.push(s); requestAnimationFrame(tick); };
    tick();
  });
  return watch;
}
/** wait for human player `who` (0/1, or either) to be live; set the rally base; strike with this reaction time */
async function shoot(page, {who = null, base = null, reaction}) {
  const i = await page.waitForFunction(who => {
    const F = Arcade.FaceOff, s = F.state();
    return s && s.live && s.active !== null && !F.P[s.active].cpu && (who === null || s.active === who) && (s.state === 'serve' || s.state === 'travel') ? String(s.active) : null;
  }, who, {timeout: 30000, polling: 50}).then(h => h.jsonValue()).then(Number);
  const n = await page.evaluate(([base, reaction]) => {
    const F = Arcade.FaceOff, n = F.M.shots.length;
    if (base !== null) F.M.base = F.M.state === 'serve' ? base : base / FACEOFF_RULES.rallySpeedUp;   // a return speeds it up first
    Arcade.FaceOffDemoHit(reaction);
    return n;
  }, [base, reaction]);
  return {i, n};
}
const shotN = (page, n) => page.waitForFunction(n => { const sh = Arcade.FaceOff.M.shots[n]; return sh && (sh.crossed !== null || Arcade.FaceOff.M.shots.length > n + 1) ? sh : null; },
  n, {timeout: 20000, polling: 50}).then(h => h.jsonValue(), async e => {
  const st = await page.evaluate(() => JSON.stringify({s: Arcade.FaceOff.state(), shots: Arcade.FaceOff.M.shots}));
  throw new Error(`shot ${n} never finished: ${st}\n${e.message}`);
});

test.describe('Neon Face-Off: SMASH and POWER are faster', () => {
  test('the crossing-time formula: SMASH < POWER < GOOD at every rally length and difficulty, never under 0.9 s', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {opponent: 'flute', gameData: {'neon-face-off': {smashTip: true}}})});
    await page.goto('neon-face-off/index.html?demo&nostart');
    const r = await page.evaluate(() => {
      const R = FACEOFF_RULES, by = l => R.power.find(p => p.label === l), out = [];
      const windows = FACEOFF_DIFFICULTY.map(d => d.window).concat(R.cpuWindow);
      for (const w of windows) for (let n = 0; n <= 60; n++) {
        const base = R.serveTime * R.rallySpeedUp ** n, t = {};
        ['SMASH!', 'POWER', 'GOOD', 'WEAK'].forEach(l => { t[l] = Arcade.FaceOff.crossTime(by(l), base, w); });
        out.push({w, n, base, t});
      }
      return {out, rules: {serveTime: R.serveTime, rallySpeedUp: R.rallySpeedUp, hardMin: R.hardMin,
        power: R.power.map(p => [p.label, p.factor, p.minShare])}, windows: FACEOFF_DIFFICULTY.map(d => [d.id, d.window])};
    });
    expect(r.rules.serveTime).toBe(BASE);
    expect(r.rules.rallySpeedUp).toBe(SPEEDUP);
    expect(r.rules.hardMin).toBe(0.9);
    expect(r.rules.power).toEqual([['SMASH!', .35, .40], ['POWER', .55, .65], ['GOOD', .85, 1.0], ['WEAK', 1.0, 1.0]]);
    expect(Object.fromEntries(r.windows)).toEqual(WINDOWS);
    const F = Object.fromEntries(r.rules.power.map(([l, f, s]) => [l, {f, s}]));
    for (const {w, n, base, t} of r.out) {
      const at = `window ${w} s, rally ${n}`;
      for (const l of Object.keys(t)) {
        expect(t[l], `${l} at ${at}`).toBeCloseTo(Math.max(base * F[l].f, w * F[l].s, 0.9), 9);
        expect(t[l], `${l} at ${at}`).toBeGreaterThanOrEqual(0.9);
      }
      expect(t['SMASH!'], `SMASH < POWER at ${at}`).toBeLessThan(t.POWER);
      expect(t.POWER, `POWER < GOOD at ${at}`).toBeLessThan(t.GOOD);
      expect(t.GOOD, `GOOD ≤ WEAK at ${at}`).toBeLessThanOrEqual(t.WEAK);
      expect(t.GOOD, `GOOD gets the whole window at ${at}`).toBeGreaterThanOrEqual(w);
    }
    // a long rally's smash: Rookie 1.6 s, Pro 1.0 s, All-Star 0.9 s (levels.js's comment)
    const last = w => r.out.filter(x => x.w === w).pop().t['SMASH!'];
    expect(last(4.0)).toBeCloseTo(1.6, 6); expect(last(2.5)).toBeCloseTo(1.0, 6); expect(last(1.5)).toBeCloseTo(0.9, 6);
    watch.check();
  });

  for (const diff of ['rookie', 'pro', 'allstar']) {
    test(`real shots at a ${diff} receiver cross in their own time (±50 ms), held until the mic is live`, async ({page}) => {
      test.setTimeout(120_000);
      const watch = await open(page, {diff});
      const w = WINDOWS[diff];
      const F = {'SMASH!': [.35, .40], POWER: [.55, .65], GOOD: [.85, 1], WEAK: [1, 1]};
      const PLAN = [['SMASH!', BASE], ['SMASH!', BASE * SPEEDUP ** 20], ['POWER', BASE * SPEEDUP ** 3], ['POWER', BASE * SPEEDUP ** 20],
        ['GOOD', BASE * SPEEDUP ** 20], ['WEAK', BASE * SPEEDUP ** 20], ['SMASH!', BASE * SPEEDUP ** 12, 'mute']];
      for (const [power, base, mute] of PLAN) {
        const {n} = await shoot(page, {base, reaction: REACT[power]});
        if (mute) await page.evaluate(() => Arcade.Pitch.suppress(1500));   // a long mute after the hit: the puck must wait for it
        const sh = await shotN(page, n);
        const want = Math.max(base * F[power][0], w * F[power][1], 0.9);
        expect(sh.power, `reaction ${sh.reaction.toFixed(2)} s`).toBe(power);
        expect(sh.window).toBe(w);
        expect(sh.T, `${power} at base ${base.toFixed(2)}`).toBeCloseTo(want, 6);
        expect(sh.crossed, `${power} not returned: it scores`).not.toBeNull();
        // the arrival lies between the last frame before the goal and the goal's frame (a busy machine's frames can be
        // far apart): it is within 50 ms of the formula when that bracket reaches it
        const why = `${power}: arrived between ${Math.round(sh.before)} and ${Math.round(sh.crossed)} ms, wanted ${Math.round(want * 1000)}`;
        expect(sh.before, why).toBeLessThanOrEqual(want * 1000 + 50);
        expect(sh.crossed, why).toBeGreaterThanOrEqual(want * 1000 - 50);
        expect(sh.crossed / 1000).toBeGreaterThanOrEqual(0.9 - 0.001);
        if (mute) {
          expect(sh.start - sh.at, 'the puck waited for the 1.5 s mute to end').toBeGreaterThanOrEqual(1450);
        }
      }
      expect(await page.evaluate(() => window.__bad.length), 'a puck moved before its receiver was live').toBe(0);
      watch.check();
    });
  }

  test('vs The Champ a long-rally smash is sometimes returned and sometimes scores (seeded CPU)', async ({page}) => {
    test.setTimeout(180_000);
    const watch = await open(page, {p2: 'cpu', diff: 'rookie', rival: 8, reduce: true, seed: 20261002});
    const out = {returned: 0, scored: 0};
    for (let k = 0; k < 40 && !(out.returned && out.scored); k++) {
      if (await page.evaluate(() => Arcade.FaceOff.state().state === 'over')) break;
      const {n} = await shoot(page, {who: 0, base: 1.0, reaction: REACT['SMASH!']});
      const sh = await shotN(page, n);
      expect(sh.power).toBe('SMASH!');
      expect(sh.T).toBeCloseTo(0.9, 6);                          // max(1.0 × .35, 1.5 × .40, 0.9): the floor
      if (sh.crossed !== null) out.scored++; else out.returned++;
    }
    expect(out.returned, JSON.stringify(out)).toBeGreaterThan(0);
    expect(out.scored, JSON.stringify(out)).toBeGreaterThan(0);
    watch.check();
  });

  for (const reduce of [false, true]) {
    test(`the look of speed${reduce ? ' (reduced motion: only the color)' : ''}: SMASH trail + lines + INCOMING!, POWER a medium trail`, async ({page}) => {
      test.setTimeout(90_000);
      const watch = await open(page, {diff: 'rookie', reduce});
      const looks = async (n) => page.evaluate(n => new Promise(done => {
        const seen = {trail: 0, trailMax: 0, lines: 0, colors: new Set(), incoming: false};
        const F = Arcade.FaceOff, rx = F.M.shots[n].from === 0 ? 2 : 1;
        const tick = () => {
          const s = F.state(), sh = F.M.shots[n];
          if (s.state === 'travel' && F.M.shots.length === n + 1) {
            seen.trail = Math.max(seen.trail, s.look.trail || 0); seen.lines = Math.max(seen.lines, s.look.lines || 0);
            seen.trailMax = Math.max(seen.trailMax, s.look.trailMax || 0);
            if (s.look.color) seen.colors.add(s.look.color);
            if (!document.querySelector(`#side${rx} .s-incoming`).hidden) seen.incoming = true;
          }
          if (sh.crossed !== null || F.M.shots.length > n + 1) done({...seen, colors: [...seen.colors], from: sh.from, hitter: F.P[sh.from].color});
          else requestAnimationFrame(tick);
        };
        tick();
      }), n);
      // SMASH
      let {n} = await shoot(page, {base: BASE * SPEEDUP ** 5, reaction: REACT['SMASH!']});
      let L = await looks(n);
      expect(L.colors).toEqual([L.hitter]);                        // the glow in the hitter's color
      expect(L.incoming, 'INCOMING! on the receiver').toBe(true);
      // the trail grows one point a frame up to its power's length (trailMax: SMASH 30, POWER 18, else 10). How long it
      // gets on screen depends on the frame rate (a busy WebKit test machine draws ~6 frames a second), so the test
      // checks each power's length and that the trail is drawn and stays within it, not a frame count
      if (reduce) { expect(L.trail).toBe(0); expect(L.trailMax).toBe(0); expect(L.lines).toBe(0); }
      else { expect(L.trailMax).toBe(30); expect(L.trail).toBeGreaterThan(1); expect(L.trail).toBeLessThanOrEqual(30); expect(L.lines).toBeGreaterThan(0); }
      // POWER
      ({n} = await shoot(page, {base: BASE * SPEEDUP ** 5, reaction: REACT.POWER}));
      L = await looks(n);
      expect(L.colors).toEqual([L.hitter]);
      expect(L.incoming, 'no INCOMING! for a POWER shot').toBe(false);
      expect(L.lines).toBe(0);
      if (reduce) expect(L.trail).toBe(0);
      else { expect(L.trailMax).toBe(18); expect(L.trail).toBeGreaterThan(1); expect(L.trail).toBeLessThanOrEqual(18); }
      // GOOD: the plain yellow puck
      ({n} = await shoot(page, {base: BASE * SPEEDUP ** 5, reaction: REACT.GOOD}));
      L = await looks(n);
      expect(L.colors).toEqual([]);
      expect(L.lines).toBe(0);
      expect(L.trail).toBeLessThanOrEqual(reduce ? 0 : 10);
      expect(L.trailMax).toBe(reduce ? 0 : 10);
      watch.check();
    });
  }
});
