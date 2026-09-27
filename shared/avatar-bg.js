/* Band Arcade: AVATAR BACKGROUNDS (the avatar's 'bg' field: the list and the unlock rules are P.BGS at the end of
   shared/avatar-parts.js). Drawn in code behind the avatar's bust wherever it shows (Arcade.avatarHTML puts one in
   every .av-box): basics (solid colors, two-color fades, patterns) and ANIMATED SCENES, which are the very same art
   as the game menus' backgrounds (shared/bg-scenes.js), drawn brighter (`lift`) because the avatar sits in a small
   box instead of under a menu. Load after avatar.js (and bg-scenes.js, which the scenes need).

     Arcade.AvatarBg.html(id, size, {live})   the layer's markup for a .pt-box of that size ('big' | 'tile' | 'chip')
                                              chip: just the background's main color (the top-bar badge; never moves)
                                              others: a still frame; live: true adds a canvas that may animate
     Arcade.AvatarBg.draw(ctx, id, W, H, t, {state, still})   one frame (tests, thumbnails)
     Arcade.AvatarBg.stillURL(id, px)         a still frame as an image URL (cached per id and size)
     Arcade.AvatarBg.get(id) / list() / main(id) / animated(id)
     Arcade.AvatarBg.stats()                  tests: {running, animating, frames, avgMs, slow, live}

   ANIMATION RULES: only ONE avatar background moves at a time: the LARGEST visible live one (the creator's preview,
   Choose Your Instrument's preview, a results screen); every other copy is a still frame. At most 30 frames a second
   (FPS), a canvas at most MAX_PX pixels wide, nothing while the tab is hidden, and still frames for good with
   prefers-reduced-motion, the MOVING BACKGROUNDS switch off (gameData('bg').motion, the speaker panel), or when this
   device can't keep up (average draw over SLOW_MS for SLOW_FRAMES frames). Photosensitivity: the scenes' own rules
   (bg-scenes.js: soft lightning glows, slow sputters, no flashes over 3 a second), and a live box is never full
   screen. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const FPS = 30, MAX_PX = 320, SLOW_MS = 14, SLOW_FRAMES = 90;
  const TAU = Math.PI * 2;
  const P = () => window.AVATAR_PARTS || {};
  const list = () => P().BGS || [];
  const get = id => list().find(b => b.id === id) || list()[0] || {id: 'none', kind: 'none', main: 'floor-3'};
  const animated = id => get(id).kind === 'scene';
  const main = id => get(id).main || 'floor-3';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionOK = () => !reduced.matches && !slow && !(A.store && A.store.gameData && A.store.gameData('bg').motion === false);

  /* ---------- colors (theme tokens only) ---------- */
  const rgbCache = {};
  let probe = null;
  function rgb(name) {
    if (rgbCache[name]) return rgbCache[name];
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    probe = probe || document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#000'; if (v) probe.fillStyle = v;
    const s = probe.fillStyle;
    return (rgbCache[name] = s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number));
  }
  const col = (n, a = 1) => { const [r, g, b] = rgb(n); return `rgba(${r},${g},${b},${a})`; };

  /* ---------- the basics ---------- */
  function star(x, cx, cy, r) {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  const PATTERNS = {
    stripes(x, W, H, c) {
      x.fillStyle = col(c, .35); const w = W / 9;
      for (let i = -H; i < W + H; i += w * 2) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + w, 0); x.lineTo(i + w - H, H); x.lineTo(i - H, H); x.fill(); }
    },
    dots(x, W, H, c) {
      x.fillStyle = col(c, .45); const g = W / 6, r = g * .16;
      for (let row = 0; row * g < H + g; row++) for (let k = 0; k * g < W + g; k++) { x.beginPath(); x.arc(k * g + (row % 2 ? g / 2 : 0), row * g + g / 2, r, 0, TAU); x.fill(); }
    },
    staff(x, W, H, c) {
      x.strokeStyle = col(c, .4); x.lineWidth = Math.max(1, W / 160);
      const gap = H / 22;
      [.14, .62].forEach(top => { for (let i = 0; i < 5; i++) { const y = H * top + i * gap; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } });
      x.fillStyle = col(c, .35);                                             // a few notes on the staffs, at the sides
      [[.08, .14, 3], [.2, .14, 1], [.84, .14, 2], [.92, .62, 4], [.1, .62, 0]].forEach(([u, top, n]) => {
        const cy = H * top + n * gap; x.beginPath(); x.ellipse(W * u, cy, gap * .62, gap * .45, -.35, 0, TAU); x.fill();
        x.fillRect(W * u + gap * .5, cy - gap * 3.2, Math.max(1, W / 160), gap * 3.2);
      });
    },
    checker(x, W, H, c) {
      x.fillStyle = col(c); const n = 6, s = W / n;
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if ((r + k) % 2) x.fillRect(k * s, r * s, s + .5, s + .5);
    },
    stars(x, W, H, c) {
      x.fillStyle = col(c, .5); const g = W / 4;
      for (let row = 0; row * g < H + g; row++) for (let k = 0; k * g < W + g; k++) star(x, k * g + (row % 2 ? g / 2 : 0), row * g + g / 2, g * .16);
    },
  };

  /** one frame of background `id` on ctx (W × H); t in seconds; o.state = this canvas's scene cache; o.still */
  function draw(x, id, W, H, t = 0, o = {}) {
    const b = get(id), c = b.colors || [];
    x.save();
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (b.kind === 'solid') { x.fillStyle = col(c[0]); x.fillRect(0, 0, W, H); }
    else if (b.kind === 'grad') { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col(c[0])); g.addColorStop(1, col(c[1])); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    else if (b.kind === 'pattern') { x.fillStyle = col(c[0]); x.fillRect(0, 0, W, H); (PATTERNS[b.pat] || (() => {}))(x, W, H, c[1]); }
    else if (b.kind === 'scene') {
      const S = A.BgScenes, fn = S && S[b.scene];
      if (fn) {
        try { fn(x, W, H, o.still ? (S.STILL[b.scene] || 5) : t, {state: o.state || {}, still: !!o.still, colors: []}); } catch (e) { x.fillStyle = col(b.main); x.fillRect(0, 0, W, H); }
        x.restore(); x.save();
        const lift = (b.lift || 1) - 1;                                   // brighter than on a menu: the frame drawn on itself
        if (lift > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, lift); x.drawImage(x.canvas, 0, 0, x.canvas.width, x.canvas.height, 0, 0, W, H); }
      } else { x.fillStyle = col(b.main); x.fillRect(0, 0, W, H); }
    }
    x.restore();
  }

  /* ---------- still frames, cached ---------- */
  const stills = new Map();
  function stillURL(id, px = 128) {
    const key = id + '|' + px;
    if (stills.has(key)) return stills.get(key);
    let url = '';
    try {
      const c = document.createElement('canvas'); c.width = c.height = px;
      draw(c.getContext('2d'), id, px, px, 0, {still: true, state: {}});
      url = c.toDataURL('image/jpeg', .86);
    } catch (e) { url = ''; }
    stills.set(key, url);
    return url;
  }
  const RES = {big: 256, tile: 128};
  /** the layer inside an avatar's .pt-box */
  function html(id, size = 'tile', {live = false} = {}) {
    const b = get(id);
    if (!b || b.kind === 'none') return '';
    if (size === 'chip') return `<span class="av-bg av-bg-chip" aria-hidden="true" style="background:var(--${b.main})"></span>`;
    const url = stillURL(b.id, RES[size] || 128);
    const canMove = live && animated(b.id);
    if (canMove) wake();
    return `<span class="av-bg" aria-hidden="true" data-bg="${b.id}" style="background-image:url(${url})">` +
      (canMove ? `<canvas class="av-bg-live" data-bg="${b.id}" hidden></canvas>` : '') + `</span>`;
  }

  /* ---------- the one animated background ---------- */
  let raf = 0, last = 0, t0 = performance.now(), slow = false, frames = 0, spent = 0, current = null;
  const states = new WeakMap();
  function wake() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  function visibleArea(el) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return 0;
    return r.width * r.height;
  }
  function tick(now) {
    raf = 0;
    const all = [...document.querySelectorAll('canvas.av-bg-live')];
    if (!all.length || document.hidden) { current = null; return; }
    if (!motionOK()) { all.forEach(c => { c.hidden = true; }); current = null; return; }
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / FPS - 2) return;
    last = now;
    // the largest visible one moves; the rest show their still frame (a covered page's avatar isn't "visible":
    // an overlay on top of it hides it from elementFromPoint)
    let best = null, bestA = 0;
    all.forEach(c => {
      const box = c.closest('.pt-box'); let a = box ? visibleArea(box) : 0;
      if (a && box) {
        const r = box.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && !box.contains(hit) && !hit.contains(box)) a = 0;
      }
      if (a > bestA) { bestA = a; best = c; }
    });
    all.forEach(c => { if (c !== best) c.hidden = true; });
    current = best;
    if (!best) return;
    const r = best.getBoundingClientRect(), px = Math.max(32, Math.min(MAX_PX, Math.round(r.width * Math.min(1.5, devicePixelRatio || 1))));
    if (best.width !== px) { best.width = best.height = px; states.delete(best); }
    let st = states.get(best); if (!st) { st = {}; states.set(best, st); }
    const s = performance.now();
    draw(best.getContext('2d'), best.dataset.bg, px, px, (now - t0) / 1000 + 4, {state: st});
    const ms = performance.now() - s;
    best.hidden = false;
    frames++; spent += ms;
    if (frames >= SLOW_FRAMES) {                          // too slow for this device: still frames from now on (this page)
      if (spent / frames > SLOW_MS) { slow = true; all.forEach(c => { c.hidden = true; }); }
      stat.avgMs = +(spent / frames).toFixed(2); frames = 0; spent = 0;
    }
  }
  const stat = {avgMs: 0};
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduced.addEventListener && reduced.addEventListener('change', wake);

  A.AvatarBg = {
    list, get, main, animated, draw, stillURL, html, wake, FPS, MAX_PX,
    stats: () => ({running: !!raf, animating: current ? current.dataset.bg : null, frames, avgMs: stat.avgMs || (frames ? +(spent / frames).toFixed(2) : 0), slow,
      live: document.querySelectorAll('canvas.av-bg-live').length, motion: motionOK()}),
  };
})(window.Arcade);
