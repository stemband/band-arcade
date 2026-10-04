/* THE 3D FLOOR on a slow device (arcade3d.js): every animation frame is made slow on purpose, so the floor first
   downgrades (level 1: its resize kick()s from inside a frame) and then gives up and hands over to the 2D floor. A
   marquee picture "arrives" in the middle of frames too (its onArt listener: redraw + kick()). The floor must run ONE
   animation loop the whole time (its frame() at most once per animation frame), and never draw again once it has given
   up (its renderer is disposed). */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

test('a slow device: one loop through the downgrade and a mid-frame marquee picture; nothing drawn after giving up', async ({page}) => {
  test.setTimeout(60_000);
  const watch = await prepare(page);
  await page.addInitScript(() => {
    const L = window.__floor = {ticks: 0, maxPerFrame: 0, frames: 0, renders: 0, after: 0, disposed: false, art: 0, level1: false};
    // every animation frame callback takes 55 ms (a slow device: over SLOW_MS), and the floor's frame() is counted per
    // animation frame (callbacks in one animation frame share its timestamp)
    const raf = window.requestAnimationFrame.bind(window);
    let seenT = -1, n = 0;
    (function tick() { raf(t => { if (t !== seenT) { seenT = t; n = 0; L.ticks++; } raf(tick); }); })();   // (counts animation frames)
    window.requestAnimationFrame = cb => raf(t => {
      const end = performance.now() + 55; while (performance.now() < end) { /* a slow device */ }
      if (t !== seenT) { seenT = t; n = 0; L.ticks++; }
      if (cb.name === 'frame') { L.frames++; L.maxPerFrame = Math.max(L.maxPerFrame, ++n); }
      cb(t);
    });
    // the marquee pictures' listeners (arcade3d.js: draw the marquee again + kick()), fired from inside a frame below
    const fns = [];
    const A = window.Arcade = window.Arcade || {};
    let M;
    Object.defineProperty(A, 'Marquee', {configurable: true, get: () => M, set: v => {
      M = v; const on = v.onArt; v.onArt = (g, fn) => { fns.push(fn); return on.call(v, g, fn); };
    }});
    // three.js's renderer: count the renders (a picture arrives during some of them), and anything drawn after dispose()
    let T, wrapped = false;
    const wrap = v => {
      if (wrapped || !v || !v.WebGLRenderer) return; wrapped = true;
      const R = v.WebGLRenderer;
      v.WebGLRenderer = function (...a) {
        const r = new R(...a), render = r.render, dispose = r.dispose;
        r.render = function () {
          if (L.disposed) L.after++;
          L.renders++;
          const st = A.Floor3D && A.Floor3D.stats && A.Floor3D.stats();
          if (st && st.level) L.level1 = true;
          // a picture arrives mid-frame: early on, and again after the downgrade
          if ((L.renders === 20 || L.renders === 60 || (L.level1 && L.art < 3)) && fns.length) { L.art++; fns.forEach(fn => fn()); }
          return render.apply(this, arguments);
        };
        r.dispose = function () { L.disposed = true; return dispose.apply(this, arguments); };
        return r;
      };
    };
    Object.defineProperty(window, 'THREE', {configurable: true, get: () => { wrap(T); return T; }, set: v => { T = v; }});
  });
  await page.goto('index.html#full-arcade');
  await page.waitForFunction(() => Arcade.Arcade && Arcade.Arcade.state().kind, null, {timeout: 15_000});
  test.skip(await page.evaluate(() => Arcade.Arcade.state().kind !== '3d' && !window.__floor.renders), 'no WebGL in this browser');
  await expect.poll(() => page.evaluate(() => window.__floor.disposed), {timeout: 40_000}).toBe(true);
  const at = await page.evaluate(() => Object.assign({}, window.__floor));
  await page.waitForFunction(n => window.__floor.ticks >= n, at.ticks + 15, {timeout: 15_000});   // a second loop would still be drawing now
  const f = await page.evaluate(() => Object.assign({}, window.__floor, {canvas: !!document.querySelector('canvas.floor3d')}));
  expect(f.level1, 'the floor downgraded first').toBe(true);
  expect(f.art, 'marquee pictures arrived mid-frame').toBeGreaterThanOrEqual(2);
  expect(f.maxPerFrame, "the floor's frame() in one animation frame (2 = two loops)").toBe(1);
  expect(f.after, 'renders after the floor gave up').toBe(0);
  expect(f.frames, 'no frame() ran after the floor gave up').toBe(at.frames);
  expect(f.canvas, 'the 3D canvas is gone (the 2D floor took over)').toBe(false);
  watch.check();
});
