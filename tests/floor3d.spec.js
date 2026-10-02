/* THE 3D FLOOR on a slow device (arcade3d.js): every frame is made slow on purpose, so the floor first downgrades
   (level 1) and then gives up and hands over to the 2D floor (onGiveUp). It must run ONE animation loop the whole
   time (at most the 2 render passes per animation frame), never draw again after giving up (its renderer is disposed),
   and log no WebGL error (WebKit reports "glTexStorage2D: Texture is immutable" as an error when a disposed renderer
   draws again). */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

test('a slow device: one loop, a clean give-up to the 2D floor, nothing drawn after it', async ({page}) => {
  test.setTimeout(60_000);
  const gl = [];
  page.on('console', m => { if (/WebGL|GL_INVALID|immutable/i.test(m.text()) && !/Performance|software WebGL|swiftshader/i.test(m.text())) gl.push(m.text()); });
  await prepare(page);
  await page.addInitScript(() => {
    const L = window.__floor = {frame: 0, maxPerFrame: 0, after: 0, disposed: false};
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => { const end = performance.now() + 55; while (performance.now() < end) { /* a slow device */ } cb(t); });
    const tick = () => { L.frame++; raf(tick); }; raf(tick);
    let T, wrapped = false, seen = -1, n = 0;
    const wrap = v => {
      if (wrapped || !v || !v.WebGLRenderer) return; wrapped = true;
      const R = v.WebGLRenderer;
      v.WebGLRenderer = function (...a) {
        const r = new R(...a), render = r.render, dispose = r.dispose;
        r.render = function () { if (L.disposed) L.after++; if (seen !== L.frame) { seen = L.frame; n = 0; } L.maxPerFrame = Math.max(L.maxPerFrame, ++n); return render.apply(this, arguments); };
        r.dispose = function () { L.disposed = true; return dispose.apply(this, arguments); };
        return r;
      };
    };
    Object.defineProperty(window, 'THREE', {configurable: true, get: () => { wrap(T); return T; }, set: v => { T = v; }});
  });
  await page.goto('index.html#full-arcade');
  await expect.poll(() => page.evaluate(() => window.__floor.disposed), {timeout: 30_000}).toBe(true);
  await page.waitForTimeout(2000);                          // a second loop would still be drawing now
  const f = await page.evaluate(() => Object.assign({}, window.__floor, {canvas: !!document.querySelector('canvas.floor3d')}));
  expect(f.after, 'renders after the floor gave up').toBe(0);
  expect(f.maxPerFrame, 'render passes in one animation frame (2 = the reflection + the room)').toBeLessThanOrEqual(2);
  expect(f.canvas, 'the 3D canvas is gone (the 2D floor took over)').toBe(false);
  expect(gl).toEqual([]);
});
