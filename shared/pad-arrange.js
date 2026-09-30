/* ARRANGE CONTROLS: the student moves, sizes and fades a game's on-screen control clusters (touch screens only).
   Moved out of Arcade Quest (engine/controls.js) so every game with an on-screen pad uses the same one: Arcade Quest
   (the D-pad + the A/B cluster), Blocktave (◀ ▶ + JUMP / MINE-BUILD).
     const arr = Arcade.PadArrange.create({
       gameId,                      saved in gameData(gameId)[key] = {portrait | landscape: {<cluster>: {x, y, s}, op}}
       key: 'controls',             x, y = the cluster's center as a share of the window, s = size, op = opacity
       clusters: {dpad: () => el, ab: () => el},   the clusters, in order (their keys are what gets saved)
       labels: {dpad: 'D-pad', ab: 'A/B'},         each size slider's name
       pad: () => el,               the element holding the clusters (its opacity follows the slider; hidden = no pad)
       wrap: () => el,              gets .pad-free while an arrangement is applied
       obstacles: () => [el…],      what a cluster must never cover (menus, text boxes): nudged clear while they show
       watch: () => el,             an element to watch for those coming and going (MutationObserver)
       touch: () => bool,           a touch screen (the edit mode only opens there)
       onStart(), onEnd(),          the edit mode opens / closes (the game stops reading its pad meanwhile)
       cls: 'q-',                   class prefix: <cls>arrange (the panel), <cls>arr-panel, <cls>arr-acts,
                                    <cls>dragme (a cluster being arranged), body.<cls>arranging
       hint })                      the panel's one line
     arr.open() / close() / apply() (after a resize or a turn) / init() (watch + apply) / state()
   The page layout never changes: an arranged cluster is only moved and scaled with a transform from its normal place.
   Size 75–150 %, opacity 20–100 %, RESET TO DEFAULT, DONE. Saved per device AND orientation. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const SIZE = [0.75, 1.5], OPAC = [0.2, 1], GAP = 6, EDGE = 4;

  function create(o) {
    const cls = o.cls || '', key = o.key || 'controls', keys = Object.keys(o.clusters);
    const data = () => A.store.gameData(o.gameId);
    const orient = () => (innerWidth > innerHeight ? 'landscape' : 'portrait');
    const saved = () => (data()[key] || {})[orient()] || null;
    function save(L) { const d = data(); d[key] = Object.assign({}, d[key], {[orient()]: L}); A.store.saveGameData(o.gameId); }
    function forget() { const d = data(); if (d[key]) { delete d[key][orient()]; A.store.saveGameData(o.gameId); } }
    const cluster = k => o.clusters[k] && o.clusters[k]();
    let E = null;                                                // the edit mode: {L, drag, el}

    /** a cluster's box in the normal layout (without its transform) */
    const natural = c => { const t = c.style.transform; c.style.transform = ''; const r = c.getBoundingClientRect(); c.style.transform = t; return r; };
    /** where the clusters stand in the normal layout (their centers as shares of the window), for a first arrangement */
    function defaults() {
      const L = {op: 1};
      keys.forEach(k => { const r = natural(cluster(k)); L[k] = {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: 1}; });
      return L;
    }
    function clear() { keys.forEach(k => { const c = cluster(k); if (c) c.style.transform = ''; }); const p = o.pad(); if (p) p.style.opacity = ''; }
    function obstacles() {
      return (o.obstacles ? o.obstacles() : []).filter(el => el && el.offsetParent !== null && !el.hidden && !el.closest('[hidden]'))
        .map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    }
    const hits = (a, b) => a.left < b.right + GAP && a.right > b.left - GAP && a.top < b.bottom + GAP && a.bottom > b.top - GAP;
    const box = (left, top, w, h) => ({left, top, width: w, height: h, right: left + w, bottom: top + h});
    /** a cluster's box: its saved center and size, fully on screen, then clear of every obstacle */
    function placeBox(p, avoid, r0) {
      const W = innerWidth, H = innerHeight, w = r0.width * p.s, h = r0.height * p.s;
      const clampX = x => Math.max(EDGE, Math.min(W - w - EDGE, x)), clampY = y => Math.max(EDGE, Math.min(H - h - EDGE, y));
      const r = box(clampX(p.x * W - w / 2), clampY(p.y * H - h / 2), w, h);
      if (!avoid) return r;
      const obs = obstacles(), free = b => !obs.some(x => hits(b, x)) && b.left >= EDGE - .5 && b.top >= EDGE - .5 && b.right <= W - EDGE + .5 && b.bottom <= H - EDGE + .5;
      if (free(r)) return r;
      const tries = [];
      obs.forEach(x => tries.push(box(r.left, x.top - GAP - h, w, h), box(r.left, x.bottom + GAP, w, h), box(x.left - GAP - w, r.top, w, h), box(x.right + GAP, r.top, w, h)));
      const ok = tries.map(b => box(clampX(b.left), clampY(b.top), w, h)).filter(free)
        .sort((a, b) => Math.hypot(a.left - r.left, a.top - r.top) - Math.hypot(b.left - r.left, b.top - r.top));
      return ok[0] || r;
    }
    /** lay the pad out: the saved arrangement for this orientation (or the edit mode's), else the normal layout */
    function apply() {
      const w = o.wrap(), p = o.pad();
      if (!w || !p || p.hidden) return;
      const L = E ? E.L : saved();
      if (!L) { if (w.classList.contains('pad-free')) { w.classList.remove('pad-free'); clear(); } return; }
      w.classList.add('pad-free');
      p.style.opacity = Math.max(OPAC[0], Math.min(OPAC[1], L.op || 1));
      keys.forEach(k => {
        const c = cluster(k); if (!c || !L[k]) return;
        const r0 = natural(c), r = placeBox(L[k], !E, r0);
        c.style.transform = `translate(${Math.round(r.left - r0.left)}px, ${Math.round(r.top - r0.top)}px) scale(${L[k].s})`;
      });
    }
    let queued = false;
    const soon = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
    let watching = false;
    function watch() {
      const el = o.watch && o.watch(); if (!el || watching) return;
      watching = true;
      new MutationObserver(soon).observe(el, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']});
    }

    /* the edit mode */
    function open() {
      const p = o.pad();
      if (!(o.touch ? o.touch() : true) || !p || p.hidden || E) return;
      const L = JSON.parse(JSON.stringify(saved() || defaults()));
      keys.forEach(k => { if (!L[k]) L[k] = defaults()[k]; });
      const el = document.createElement('div');
      el.className = cls + 'arrange'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Arrange controls');
      const pct = v => Math.round(v * 100);
      const labels = o.labels || {};
      el.innerHTML = `<div class="${cls}arr-panel"><h2>Arrange controls</h2><p class="${cls}small">${o.hint || 'Drag the controls where your thumbs like them.'}</p>` +
        keys.map(k => `<label>${labels[k] || k} size <input type="range" data-k="${k}" min="${pct(SIZE[0])}" max="${pct(SIZE[1])}" step="5" value="${pct(L[k].s)}"><output></output></label>`).join('') +
        `<label>Opacity <input type="range" data-k="op" min="${pct(OPAC[0])}" max="${pct(OPAC[1])}" step="5" value="${pct(L.op || 1)}"><output></output></label>` +
        `<div class="${cls}arr-acts"><button type="button" class="btn btn-secondary btn-small" data-act="reset">Reset to default</button>` +
        `<button type="button" class="btn btn-primary btn-small" data-act="done">Done</button></div></div>`;
      document.body.appendChild(el);
      E = {L, el, drag: null, orient: orient()};
      if (o.onStart) o.onStart();
      document.body.classList.add(cls + 'arranging');
      const outs = () => el.querySelectorAll('input').forEach(i => { i.nextElementSibling.textContent = i.value + '%'; });
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        const v = +i.value / 100;
        if (i.dataset.k === 'op') E.L.op = v; else E.L[i.dataset.k].s = v;
        outs(); apply(); save(E.L);
      }));
      outs();
      el.querySelector('[data-act=reset]').addEventListener('click', () => {
        forget(); E.L = defaults();
        el.querySelectorAll('input').forEach(i => { i.value = 100; });
        outs(); apply();
        E.reset = true;
      });
      el.querySelector('[data-act=done]').addEventListener('click', close);
      // dragging a cluster (the whole cluster moves; its buttons press nothing while arranging)
      keys.forEach(k => {
        const c = cluster(k);
        c.classList.add(cls + 'dragme');
        c.addEventListener('pointerdown', E[k + 'Down'] = e => {
          if (!E) return;
          e.preventDefault(); e.stopPropagation();
          E.drag = {k, id: e.pointerId, x: e.clientX, y: e.clientY, x0: E.L[k].x, y0: E.L[k].y};
          E.reset = false;
          try { c.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
        }, true);
      });
      E.move = e => {
        const d = E && E.drag; if (!d || e.pointerId !== d.id) return;
        E.L[d.k].x = d.x0 + (e.clientX - d.x) / innerWidth; E.L[d.k].y = d.y0 + (e.clientY - d.y) / innerHeight;
        apply();
      };
      E.up = e => {
        const d = E && E.drag; if (!d || e.pointerId !== d.id) return;
        E.drag = null;
        const r = cluster(d.k).getBoundingClientRect();                   // keep what's on screen: the clamped center
        E.L[d.k].x = (r.left + r.width / 2) / innerWidth; E.L[d.k].y = (r.top + r.height / 2) / innerHeight;
        save(E.L);
      };
      addEventListener('pointermove', E.move); addEventListener('pointerup', E.up); addEventListener('pointercancel', E.up);
      E.resize = () => { if (E && orient() !== E.orient) { E.orient = orient(); E.L = JSON.parse(JSON.stringify(saved() || defaults())); } };
      addEventListener('resize', E.resize);
      apply();
      el.querySelector('[data-act=done]').focus();
    }
    function close() {
      if (!E) return;
      const e = E;
      if (!e.reset) save(e.L);
      removeEventListener('pointermove', e.move); removeEventListener('pointerup', e.up); removeEventListener('pointercancel', e.up); removeEventListener('resize', e.resize);
      keys.forEach(k => { const c = cluster(k); c.classList.remove(cls + 'dragme'); c.removeEventListener('pointerdown', e[k + 'Down'], true); });
      e.el.remove();
      E = null;
      document.body.classList.remove(cls + 'arranging');
      if (o.onEnd) o.onEnd();
      apply();
    }
    return {
      open, close, apply,
      init() { watch(); apply(); },
      get editing() { return !!E; },
      state() {
        const r = k => { const c = cluster(k); if (!c) return null; const b = c.getBoundingClientRect(); return {left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height}; };
        const out = {editing: !!E, orient: orient(), free: !!o.wrap() && o.wrap().classList.contains('pad-free'), saved: data()[key] || null,
          opacity: o.pad() ? getComputedStyle(o.pad()).opacity : null};
        keys.forEach(k => { out[k] = r(k); });
        return out;
      },
    };
  }
  A.PadArrange = {create, SIZE, OPAC};
})(window.Arcade);
