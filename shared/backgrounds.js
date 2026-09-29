/* Band Arcade: MENU BACKGROUNDS. Every game's menu screens (level select / hub, mode picker, level intros, results,
   setup and title screens) show a full-screen background behind the menu; gameplay never does (it crossfades away,
   0.4 s, as play starts and back when a menu returns). What shows, best first:
     1. MAT'S PICTURE: shared/backgrounds/<game id>.webp | .jpg | .png  (and <game id>-portrait.* for tall screens);
        see shared/backgrounds/README.md. A missing file is looked for once per browser tab.
     2. THE CODED SCENE: games.js bg.scene, drawn by shared/bg-scenes.js (animated; a still frame with reduced motion,
        with the Motion switch off, or on a device that turned out too slow).
     3. the page's own plain background (a game without bg).
   A dark READABILITY OVERLAY sits on top of 1 and 2: games.js bg.dim (0–1, how dark everywhere) and bg.focus (0–1,
   extra darkness in the middle, where the menu is).

   Arcade.Bg.mount(gameId)   once per page (mountTopbar does it for every game page)
   Arcade.Bg.menu(on)        true on a menu screen, false when play starts (Sfx.gameMenuMusic calls it for most games);
                             it also sets html.in-play during play (the avatar badge hides)
   Arcade.Bg.motion / setMotion(on)   the MOTION switch (the Settings panel shows it), saved on this device
   Arcade.Bg.state()         tests: {game, scene, image, on, running, still, why, fps, avgMs}

   PERFORMANCE: one scene at a time, at most FPS frames a second, drawn at RES × the screen size (≤ MAX_W pixels wide)
   and scaled up; nothing while the tab is hidden or during play. If frames average over SLOW_MS for SLOW_WINDOW ms,
   this device switches to still frames for good (the Motion switch turns motion back on). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const FPS = 30, RES = .6, MAX_W = 1100, FADE_MS = 400, SLOW_MS = 40, SLOW_WINDOW = 3000;
  const DIM = .45, FOCUS = .35;                                 // defaults for games.js bg.dim / bg.focus
  const DIR = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') + 'backgrounds/' : 'shared/backgrounds/'; })();
  const MISS_KEY = 'bandarcade.bg-miss', misses = new Set();
  try { JSON.parse(sessionStorage.getItem(MISS_KEY) || '[]').forEach(u => misses.add(u)); } catch (e) { /* private mode */ }
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const data = () => (A.store && A.store.gameData ? A.store.gameData('bg') : {});
  const save = () => { try { A.store.saveGameData('bg'); } catch (e) { /* no storage */ } };

  let layer = null, cv = null, ctx = null, game = null, cfg = null, scene = null, img = {land: undefined, port: undefined};
  let on = false, fading = false, raf = 0, t0 = performance.now(), last = 0, hideT = 0, frames = [], why = '';
  const sceneState = {};

  /* ---------- pictures: <id>.webp|.jpg|.png and <id>-portrait.* ---------- */
  const ver = u => (A.v ? A.v(u) : u);
  function findImage(name) {
    return new Promise(res => {
      const tries = ['webp', 'jpg', 'png'].map(ext => ver(DIR + name + '.' + ext)).filter(u => !misses.has(u));
      const next = () => {
        const u = tries.shift(); if (!u) return res(null);
        const im = new Image();
        im.onload = () => res(u);
        im.onerror = () => { misses.add(u); try { sessionStorage.setItem(MISS_KEY, JSON.stringify([...misses])); } catch (e) {} next(); };
        im.src = u;
      };
      next();
    });
  }
  const portrait = () => innerHeight > innerWidth * 1.05;
  function showImage() {
    const u = (portrait() && img.port) || img.land || img.port || null;
    layer.classList.toggle('has-img', !!u);
    layer.querySelector('.bg-img').style.backgroundImage = u ? `url("${u}")` : '';
    if (u) stop(); else if (on) start();
  }

  /* ---------- the scene: sizing, the loop, the still frame ---------- */
  const motionOK = () => !reduced.matches && data().motion !== false && !data().slow;
  function size() {
    if (!cv) return;
    const w = Math.min(MAX_W, Math.round(innerWidth * RES)), h = Math.round(w * innerHeight / Math.max(1, innerWidth));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; if (scene) sceneState[scene] = {}; }
  }
  function draw(t) {
    const fn = scene && A.BgScenes && A.BgScenes[scene];
    if (!fn || !ctx) return;
    try { fn(ctx, cv.width, cv.height, t, {state: sceneState[scene] || (sceneState[scene] = {}), still: !motionOK(), colors: cfg.colors || []}); }
    catch (e) { console.warn('Band Arcade background:', e); scene = null; }
  }
  const stillT = () => (A.BgScenes && A.BgScenes.STILL && A.BgScenes.STILL[scene]) || 0;
  function start() {
    if (!layer || !scene || layer.classList.contains('has-img')) return;
    size();
    if (!motionOK()) { cancelAnimationFrame(raf); raf = 0; draw(stillT()); why = reduced.matches ? 'reduced motion' : data().slow ? 'this device was slow: still frames' : 'Motion switched off'; return; }
    why = 'animated';
    if (!raf) { frames = []; last = 0; raf = requestAnimationFrame(loop); }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function loop(now) {
    raf = 0;
    if (!(on || fading) || document.hidden || !motionOK()) return;   // it keeps moving while it fades out
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / FPS - 3) return;
    if (last) {                                               // the automatic slow-device check
      frames.push([now, now - last]);
      while (frames.length && now - frames[0][0] > SLOW_WINDOW) frames.shift();
      if (frames.length > 20 && now - frames[0][0] > SLOW_WINDOW * .9) {
        const avg = frames.reduce((a, f) => a + f[1], 0) / frames.length;
        if (avg > SLOW_MS) { data().slow = true; save(); stop(); draw(stillT()); why = 'this device was slow: still frames'; refreshControls(); return; }
      }
    }
    last = now;
    draw((now - t0) / 1000);
  }

  /* ---------- menu screens on, gameplay off ---------- */
  function menu(show) {
    on = !!show;
    // play: html.in-play hides the avatar badge (shared/avatar-badge.js) so it can't be tapped by accident mid-level
    document.documentElement.classList.toggle('in-play', !on);
    if (!layer) return;
    clearTimeout(hideT);
    if (on) {
      document.documentElement.classList.add('bg-on');         // the body's own background steps aside
      layer.classList.add('on');
      start();
    } else {
      layer.classList.remove('on');
      fading = true;
      hideT = setTimeout(() => { fading = false; if (!on) { stop(); document.documentElement.classList.remove('bg-on'); } }, FADE_MS + 50);
    }
  }
  function mount(gameId) {
    if (layer || !gameId) return;
    game = (A.ALL_GAMES || A.GAMES || []).find(g => g.id === gameId) || null;
    cfg = (game && game.bg) || null;
    if (!cfg) return;
    scene = cfg.scene && A.BgScenes && A.BgScenes[cfg.scene] ? cfg.scene : null;
    layer = document.createElement('div');
    layer.className = 'bg-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<canvas class="bg-cv"></canvas><div class="bg-img"></div><div class="bg-dim"></div>';
    const dim = cfg.dim != null ? cfg.dim : DIM, focus = cfg.focus != null ? cfg.focus : FOCUS;
    layer.style.setProperty('--bg-edge', Math.round(dim * 100) + '%');
    layer.style.setProperty('--bg-mid', Math.round((dim + focus * (1 - dim)) * 100) + '%');
    document.body.appendChild(layer);
    cv = layer.querySelector('canvas'); ctx = cv.getContext('2d');
    menu(true);                                                  // every game opens on a menu
    Promise.all([findImage(gameId), findImage(gameId + '-portrait')]).then(([land, port]) => { img = {land, port}; showImage(); });
    addEventListener('resize', () => { size(); if (layer.classList.contains('has-img')) showImage(); else if (on && !raf) draw(stillT()); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && on) start(); });
    const onReduce = () => { if (on) { stop(); start(); } };
    if (reduced.addEventListener) reduced.addEventListener('change', onReduce); else if (reduced.addListener) reduced.addListener(onReduce);
  }

  /* ---------- the MOTION switch (the Settings panel, shared/ui-kit.js) ---------- */
  function setMotion(v) {
    const d = data(); d.motion = !!v; if (v) d.slow = false; save();
    if (on) { stop(); start(); }
    refreshControls();
  }
  // the Settings panel (shared/ui-kit.js) redraws itself; html.no-motion follows the switch (shared/version.js)
  function refreshControls() { if (A.reducedMotion && A.reducedMotion.refresh) A.reducedMotion.refresh(); }
  A.Bg = {
    mount, menu, setMotion, FPS, RES, SLOW_MS, SLOW_WINDOW, DIR,
    get motion() { return motionOK(); },
    findImage,
    state: () => ({game: game && game.id, scene, image: layer ? (layer.querySelector('.bg-img').style.backgroundImage || null) : null, on, running: !!raf,
      still: !motionOK(), why, size: cv ? [cv.width, cv.height] : null,
      avgMs: frames.length ? +(frames.reduce((a, f) => a + f[1], 0) / frames.length).toFixed(1) : null}),
  };
})(window.Arcade);
