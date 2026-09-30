/* SUSTAIN SPEEDWAY: NO GLITCHING AT THE START (sustain-speedway/game.js placeCars: the starting grid, stable lanes,
   eased drawn distances). Every frame's carsDrawn is recorded through the countdown and the first 5 seconds of a race
   (3 rivals + the ghost + you): no car changes lane more than once, no car's picture jumps between frames, no two
   cars (or a car and yours) ever overlap, before GO every car sits in its grid slot, and the drawing never touches the
   race (the standings the HUD shows are the real ones). Phone, iPad and laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const GHOST = {t: 200, p: Array.from({length: 400}, (_, i) => +(i * .012).toFixed(3))};   // a slow best run: the ghost starts in the pack
const store = () => device('trumpet', {gameData: {'sustain-speedway': {ghosts: {'sustain-speedway|trumpet|8': GHOST}}}});

async function race(page, size, drive) {
  await page.setViewportSize(size);
  const watch = await prepare(page, {store: store()});
  await page.goto('sustain-speedway/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Speedway && document.querySelector('.trk[data-l="8"]'));
  // record every frame from the moment the race screen shows
  await page.evaluate(() => {
    window.__frames = [];
    const rec = () => {
      const G = Arcade.Speedway.debug();
      if (G && G.carsDrawn) window.__frames.push({t: performance.now(), phase: G.phase, clock: G.clock, pos: document.getElementById('hudPos').textContent,
        cars: JSON.parse(JSON.stringify(G.carsDrawn))});
      window.__rec = requestAnimationFrame(rec);
    };
    window.__rec = requestAnimationFrame(rec);
  });
  await page.evaluate(() => { document.querySelector('.trk[data-l="8"]').click(); document.querySelector('.ls-start').click(); });
  for (let i = 0; i < 30 && !(await page.evaluate(() => { const G = Arcade.Speedway.debug(); return G && G.phase === 'race'; })); i++) {
    await page.evaluate(() => { const b = document.querySelector('.overlay:not(#results) [data-act="go"], .overlay:not(#results) .btn-primary'); if (b && b.getClientRects().length) b.click();
      Arcade.Speedway.skipChecks(); });                                  // (The Grand Prix has dynamics: no volume check here)
    await page.waitForTimeout(250);
  }
  if (drive) await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.debug().clock >= 5, null, {timeout: 30000});
  if (drive) await page.keyboard.up('Space');
  return {watch, frames: await page.evaluate(() => { cancelAnimationFrame(window.__rec); return window.__frames; })};
}

function check(frames, where) {
  const hit = (a, b) => a.l < b.r - .5 && b.l < a.r - .5 && a.t < b.b - .5 && b.t < a.b - .5;
  const lanes = {}, problems = [];
  let prev = null, counted = 0, grid = 0;
  frames.forEach(f => {
    // no overlaps, ever
    for (let i = 0; i < f.cars.length; i++) for (let j = i + 1; j < f.cars.length; j++)
      if (hit(f.cars[i].box, f.cars[j].box)) problems.push(`${where}: ${f.cars[i].name} over ${f.cars[j].name} at ${f.phase} ${f.clock.toFixed(2)} s`);
    f.cars.filter(c => c.name !== 'you').forEach(c => {
      (lanes[c.name] = lanes[c.name] || []).push(c.lane);
      if (f.phase === 'count') { grid++; if (c.grid !== 1) problems.push(`${where}: ${c.name} off the grid before GO`); }
      const p = prev && prev.cars.find(x => x.name === c.name);
      if (!p || f.t - prev.t > 300) return;                              // a new car, or a long stall: nothing to compare (WebKit on CI draws ~5 frames a second)
      counted++;
      // the DRAWN position (road units: the distance up the road and the lane offset) per 60 fps frame (a slow test
      // machine skips frames): it follows the race smoothly, never a jump (pixels aren't compared: near the camera a
      // car rushing past covers many pixels in a frame, which is real motion)
      const k = 16.7 / Math.max(16.7, f.t - prev.t, (f.clock - prev.clock) * 1000), dd = Math.abs(c.drawnD - p.drawnD) * k, doff = Math.abs(c.off - p.off) * k;
      if (dd > .1 || doff > .12) problems.push(`${where}: ${c.name} jumped ${dd.toFixed(3)} up the road, ${doff.toFixed(3)} sideways at ${f.clock.toFixed(2)} s`);
    });
    prev = f;
  });
  Object.entries(lanes).forEach(([name, l]) => {
    const changes = l.filter((v, i) => i && v !== l[i - 1]).length;
    if (changes > 1) problems.push(`${where}: ${name} changed lane ${changes} times (${l.join(',')})`);
  });
  return {problems, counted, grid, cars: Object.keys(lanes)};
}

for (const [name, size] of [['phone', {width: 390, height: 844}], ['iPad landscape', {width: 1024, height: 768}], ['iPad portrait', {width: 768, height: 1024}], ['laptop', {width: 1366, height: 768}]]) {
  for (const drive of [false, true]) {
    test(`${name}, ${drive ? 'driving in tune' : 'waiting at the line'}: a starting grid, steady lanes, no jumps, no overlaps`, async ({page}) => {
      test.setTimeout(90000);
      const {watch, frames} = await race(page, size, drive);
      const r = check(frames, `${name}${drive ? ' driving' : ''}`);
      expect(r.problems.slice(0, 8)).toEqual([]);
      expect(r.grid).toBeGreaterThan(8);                                  // the countdown was recorded, on the grid (a slow CI machine: few frames)
      expect(r.counted).toBeGreaterThan(25);                               // frames compared (Chromium ~300; WebKit on CI ~5 a second)
      expect(r.cars).toEqual(expect.arrayContaining(['Violet Vortex', 'Volt Viper', 'The Maestro']));
      // the drawing never changes the race: the HUD's position = the real standings from the rivals' pace
      const real = await page.evaluate(() => {
        const G = Arcade.Speedway.debug();
        return {hud: document.getElementById('hudPos').textContent, paces: G.rivals.map(r => r.pace)};
      });
      expect(real.paces).toEqual([.68, .77, .84]);
      expect(real.hud).toMatch(/^[1-4](st|nd|rd|th)$/);
      watch.check();
    });
  }
}

test('reduced motion: no sliding, but no flicker either (each car changes lane at most once, never back and forth)', async ({page}) => {
  test.setTimeout(90000);
  await page.emulateMedia({reducedMotion: 'reduce'});
  const {watch, frames} = await race(page, {width: 1024, height: 768}, true);
  const r = check(frames, 'reduced motion');
  expect(r.problems.filter(p => !/sideways/.test(p)).slice(0, 8)).toEqual([]);   // (a lane change is instant here, by design)
  expect(r.counted).toBeGreaterThan(25);                               // frames compared (Chromium ~300; WebKit on CI ~5 a second)
  watch.check();
});
