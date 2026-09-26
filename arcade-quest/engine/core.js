/* ARCADE QUEST ENGINE: the core. Everything hangs off Arcade.Quest (Q).
   THE SCREEN: a 320 × 180 canvas (Q.W × Q.H) scaled up with nearest-neighbor (image-rendering: pixelated) to fill the
   biggest 16:9 box that fits (letterboxed). Text, menus and challenge panels are HTML in #ui on top of it, sized in
   "pixels" of the 320-wide screen: CSS var(--px) = one game pixel, so calc(var(--px) * 10) = 10 game pixels.
   THE LOOP: requestAnimationFrame; nothing updates while the tab is hidden (the game pauses).
   SCENES: Q.scenes[name] = {enter(args), exit(), update(dt, now), draw(ctx, now), press(button)}; Q.go(name, args).
     title, arena (the test arena) and battle today; later the overworld and cutscenes. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const Q = A.Quest = A.Quest || {};
  Q.W = 320; Q.H = 180;
  Q.scenes = {};
  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
  Q.reduced = () => reducedMQ.matches;
  const cssCache = {};
  /** a theme token's color (shared/theme.css), e.g. Q.css('q-brass') */
  Q.css = name => cssCache[name] || (cssCache[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#ff00ff');
  Q.$ = id => document.getElementById(id);
  /** make an element: Q.el('button', 'q-btn', 'PLAY') */
  Q.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  Q.rand = (a, b) => a + Math.random() * (b - a);
  Q.pick = list => list[Math.floor(Math.random() * list.length)];
  Q.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let stage, canvas, ctx, ui, viewport, scene = null, last = 0, shakeUntil = 0, shakeAmp = 0;
  Q.init = function () {
    viewport = Q.$('viewport'); stage = Q.$('stage'); canvas = Q.$('screen'); ui = Q.$('ui');
    canvas.width = Q.W; canvas.height = Q.H;
    ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    Q.ctx = ctx; Q.ui = ui; Q.stage = stage; Q.canvas = canvas;
    addEventListener('resize', resize); resize();
    document.addEventListener('visibilitychange', () => { last = performance.now(); });
    requestAnimationFrame(loop);
  };
  /* letterbox: the biggest 16:9 box inside #viewport */
  function resize() {
    const r = viewport.getBoundingClientRect();
    const w = Math.max(160, Math.min(r.width, r.height * 16 / 9)), h = w * 9 / 16;
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    stage.style.setProperty('--px', (w / Q.W) + 'px');
    Q.scale = w / Q.W;
  }
  Q.resize = resize;
  /** a point in the page -> game pixels */
  Q.toGame = (clientX, clientY) => { const r = canvas.getBoundingClientRect(); return {x: (clientX - r.left) / r.width * Q.W, y: (clientY - r.top) / r.height * Q.H}; };

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden || !scene) return;                       // paused while the tab is hidden
    if (scene.update) scene.update(dt, now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = Q.css('q-black'); ctx.fillRect(0, 0, Q.W, Q.H);
    if (now < shakeUntil && !Q.reduced()) ctx.translate(Math.round(Q.rand(-shakeAmp, shakeAmp)), Math.round(Q.rand(-shakeAmp, shakeAmp)));
    if (scene.draw) scene.draw(ctx, now);
  }
  /** a short screen shake (never with reduced motion) */
  Q.shake = (px = 2, ms = 200) => { if (Q.reduced()) return; shakeAmp = px; shakeUntil = performance.now() + ms; };

  /** change scene: the old one's exit(), a fresh #ui, the new one's enter(args) */
  Q.go = function (name, args) {
    if (scene && scene.exit) scene.exit();
    if (Q.input) Q.input.clear();
    ui.innerHTML = '';
    scene = Q.scenes[name]; Q.sceneName = name;
    if (scene && scene.enter) scene.enter(args || {});
  };
  Q.scene = () => scene;

  /** wait ms of game time (does not count while the tab is hidden) */
  Q.wait = ms => new Promise(res => {
    let left = ms, t0 = performance.now();
    const step = () => {
      const now = performance.now();
      if (!document.hidden) left -= now - t0;
      t0 = now;
      if (left <= 0) res(); else setTimeout(step, Math.min(50, left));
    };
    setTimeout(step, Math.min(50, ms));
  });
  /** a sound through shared/sfx.js (respects mute; while the mic listens sfx.js mutes the detector for it) */
  Q.sfx = name => (A.Sfx ? A.Sfx.event(name) : 0);
})(window.Arcade);
