/* Sustain Speedway: THE GARAGE (Sustain Speedway only, never the arcade's menus). Arcade.SpeedwayGarage.
   The student's car = BODY + PAINT + DECAL (+ a number 1–99), saved per device in
   store.gameData('sustain-speedway').garage = {body, paint, decal, number}. The items and their unlock rules are
   SPEEDWAY_GARAGE in levels.js; everything is checked from the saved Speedway progress (so old progress counts):
   stars (store.allStars('*', game)), tracks finished / won (every progress key, every instrument), gameData's
   achievements ('virtuoso-win', 'perfect-lap'), wins (a counter kept since the garage) and bestLap.
   An old save has no garage: Coupe + "My instrument's color" (+ an equipped color skin's color), and its decal is
   AUTO (decal null): racing stripes when the equipped skin has them (Racing Stripes), else none, until one is chosen.
   A choice that is locked (it can't be picked, but an old save or ?demo&unlockall could hold one) falls back to the
   free default. NEW IN THE GARAGE: gameData.garageSeen = every item seen unlocked; the results screen shows the ones
   earned since (fresh()), then marks them seen. ?demo&unlockall opens everything (never saved as seen).
   open({onClose}) = the GARAGE panel: a live preview on a turntable, BODY / PAINT / DECAL tabs, the number. */
(function (A) {
  "use strict";
  const GAME_ID = 'sustain-speedway';
  const CFG = window.SPEEDWAY_GARAGE, TRACKS = window.SPEEDWAY_TRACKS;
  const KINDS = {body: CFG.bodies, paint: CFG.paints, decal: CFG.decals};
  const TAB_NAMES = {body: 'Body', paint: 'Paint', decal: 'Decal'};
  const unlockAll = () => A.DEMO && /[?&]unlockall(=|&|$)/.test(location.search);
  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const who = () => (A.currentMember() || {}).id;

  /* ---------- what the saved progress says ---------- */
  function stats() {
    const games = (A.store.exportAll() || {}).games || {}, g = gd();
    const finished = new Set(), won = new Set(); let winEntries = 0;
    Object.keys(games).forEach(k => {
      if (k !== GAME_ID && k.indexOf(GAME_ID + ':') !== 0) return;
      Object.values(games[k] || {}).forEach(lv => Object.keys(lv || {}).forEach(n => {
        const p = lv[n]; if (!p) return;
        if (p.best > 0 || p.stars > 0) finished.add(+n);
        if (p.stars >= 3) { won.add(+n); winEntries++; }
      }));
    });
    return {stars: A.store.allStars('*', GAME_ID), tracks: finished.size, wins: won.size, won,
      winCount: Math.max(g.wins || 0, winEntries), ach: g.achievements || {}, bestLap: Object.keys(g.bestLap || {}).length > 0};
  }
  function ruleMet(u, s) {
    if (!u || u.free) return true;
    if (u.any) return u.any.some(r => ruleMet(r, s));
    if (u.stars != null) return s.stars >= u.stars;
    if (u.tracks != null) return s.tracks >= u.tracks;
    if (u.wins != null) return s.wins >= u.wins;
    if (u.winCount != null) return s.winCount >= u.winCount;
    if (u.track != null) return s.won.has(u.track);
    if (u.achievement) return !!s.ach[u.achievement];
    if (u.bestLap) return s.bestLap;
    return false;
  }
  const item = (kind, id) => (KINDS[kind] || []).find(x => x.id === id);
  function unlocked(kind, id, s) { const it = item(kind, id); return !!it && (unlockAll() || ruleMet(it.unlock, s || stats())); }
  function requirement(kind, id) {
    const u = (item(kind, id) || {}).unlock || {};
    return u.text || (u.stars != null ? `Earn ${u.stars} ★ in Speedway` : u.free ? '' : 'Keep racing to unlock');
  }
  function progressText(kind, id, s) {
    const u = (item(kind, id) || {}).unlock || {}; s = s || stats();
    if (u.stars != null) return `${Math.min(s.stars, u.stars)} of ${u.stars} ★ so far`;
    if (u.tracks != null) return `${Math.min(s.tracks, u.tracks)} of ${u.tracks} tracks so far`;
    if (u.wins != null && u.wins > 1) return `${Math.min(s.wins, u.wins)} of ${u.wins} tracks so far`;
    if (u.winCount != null) return `${Math.min(s.winCount, u.winCount)} of ${u.winCount} wins so far`;
    return '';
  }
  const keys = s => { s = s || stats(); return Object.keys(KINDS).flatMap(k => KINDS[k].filter(it => unlocked(k, it.id, s)).map(it => `${k}:${it.id}`)); };

  /* ---------- the saved choice ---------- */
  const DEFAULT = {body: 'coupe', paint: 'instrument', decal: null, number: 7};
  function choice() {
    const c = Object.assign({}, DEFAULT, gd().garage || {}), s = stats();
    if (!unlocked('body', c.body, s)) c.body = DEFAULT.body;
    if (!unlocked('paint', c.paint, s)) c.paint = DEFAULT.paint;
    if (c.decal != null && !unlocked('decal', c.decal, s)) c.decal = null;
    c.number = Math.max(1, Math.min(99, Math.round(c.number) || DEFAULT.number));
    return c;
  }
  /** the instrument's own look: the equipped color skin's first color, else the instrument's color; skin stripes */
  function instrumentLook() {
    const m = who();
    let color = css('pt-' + m) || css('pink'), stripes = false;
    const eq = A.Skins && m && A.Skins.equipped(m), sk = eq && A.Skins.LIST.find(x => x.id === eq.color);
    if (sk && sk.id !== 'classic' && sk.look && sk.look.colors) color = css(sk.look.colors[0] === 'white' ? 'white-hi' : sk.look.colors[0]) || color;
    if (sk && sk.look && sk.look.stripes) stripes = true;
    return {color, stripes};
  }
  /** the car to draw: {body, color, decal, number} (c = a choice to preview, else the saved one) */
  function look(c) {
    c = c || choice();
    const inst = instrumentLook();
    return {body: c.body, color: c.paint === 'instrument' ? inst.color : css(c.paint) || inst.color,
      decal: c.decal == null ? (inst.stripes ? 'stripes' : 'none') : c.decal, number: c.number};
  }
  function set(patch) {
    const g = gd(), c = Object.assign(choice(), patch);
    g.garage = {body: c.body, paint: c.paint, decal: c.decal, number: c.number}; save();
  }

  /* ---------- NEW IN THE GARAGE ---------- */
  function seenList() {
    const g = gd();
    if (!Array.isArray(g.garageSeen)) { g.garageSeen = unlockAll() ? [] : keys(); save(); }   // the first visit: what's already open isn't "new"
    return g.garageSeen;
  }
  function fresh() { if (unlockAll()) return []; const seen = new Set(seenList()); return keys().filter(k => !seen.has(k)); }
  function markSeen(list) { const g = gd(), seen = new Set(seenList()); (list || keys()).forEach(k => seen.add(k)); g.garageSeen = [...seen]; save(); }
  const nameOf = key => { const [k, id] = key.split(':'); const it = item(k, id); return it ? it.name : id; };
  /** the results screen's "NEW IN THE GARAGE!" card (html) for these keys */
  function cardHTML(list) {
    return `<div class="sw-newcar" id="gNew"><p class="sw-newcar-t">NEW IN THE GARAGE!</p>` +
      `<p class="sw-newcar-l">${list.map(k => `<span>${nameOf(k)}</span>`).join('')}</p>` +
      `<button type="button" class="btn btn-secondary btn-small" id="gNewBtn">Garage</button></div>`;
  }

  /* ---------- THE GARAGE panel ---------- */
  let ov = null, cur = null, tab = 'body', raf = 0, back = null, onClose = null;
  const reduced = () => (A.reducedMotion ? A.reducedMotion.matches : matchMedia('(prefers-reduced-motion: reduce)').matches);
  function open(opts = {}) {
    if (ov) return;
    onClose = opts.onClose || null; back = document.activeElement;
    seenList();
    cur = choice(); tab = opts.tab || 'body';
    ov = document.createElement('div');
    ov.className = 'overlay sw-garage-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'gTitle');
    ov.innerHTML = `<div class="panel sw-garage">
      <h2 id="gTitle">Garage</h2>
      <div class="g-stage"><canvas class="g-prev" id="gPrev" aria-hidden="true"></canvas><p class="g-name" id="gName"></p></div>
      <div class="ui-seg g-tabs" role="group" aria-label="Garage parts">${Object.keys(KINDS).map(k => `<button type="button" data-tab="${k}">${TAB_NAMES[k]}</button>`).join('')}</div>
      <div class="g-opts" id="gOpts" role="group"></div>
      <div class="g-num" id="gNum" hidden><span class="ui-label">Your number</span>
        <button type="button" class="btn btn-secondary btn-small" data-num="-1" aria-label="Lower number">−</button>
        <b id="gNumV" aria-live="polite"></b>
        <button type="button" class="btn btn-secondary btn-small" data-num="1" aria-label="Higher number">+</button></div>
      <p class="g-req" id="gReq" aria-live="polite"></p>
      <div class="acts"><button type="button" class="btn btn-primary" id="gDone">Done</button></div></div>`;
    document.body.appendChild(ov);
    if (A.lockScroll) A.lockScroll(true);
    ov.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; drawTabs(); tick('ui-toggle'); }));
    ov.querySelectorAll('[data-num]').forEach(b => b.addEventListener('click', () => {
      cur.number = ((cur.number - 1 + +b.dataset.num + 99) % 99) + 1; set({number: cur.number}); drawNum(); drawOpts(); tick('ui-toggle');
    }));
    ov.querySelector('#gDone').addEventListener('click', close);
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {                                                     // the focus stays in the panel
        const f = [...ov.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      e.stopPropagation();
    });
    drawTabs();
    tick('avatar-open');
    ov.querySelector(`[data-tab="${tab}"]`).focus();
    const loop = t => { raf = requestAnimationFrame(loop); preview(t); };
    raf = requestAnimationFrame(loop);
  }
  function close() {
    if (!ov) return;
    cancelAnimationFrame(raf); raf = 0;
    ov.remove(); ov = null;
    if (A.lockScroll) A.lockScroll(false);
    markSeen();
    if (back && back.focus) back.focus({preventScroll: true});
    tick('ui-back');
    if (onClose) onClose();
  }
  const tick = name => { if (A.Sfx) A.Sfx.event(name); };
  function drawTabs() {
    ov.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    drawOpts(); drawNum();
    ov.querySelector('#gReq').textContent = '';
  }
  function drawNum() {
    const on = tab === 'decal' && cur.decal === 'number';
    ov.querySelector('#gNum').hidden = !on;
    ov.querySelector('#gNumV').textContent = cur.number;
  }
  function drawOpts() {
    const s = stats(), box = ov.querySelector('#gOpts'), c = look(cur);
    box.setAttribute('aria-label', TAB_NAMES[tab]);
    box.className = 'g-opts g-' + tab;
    box.innerHTML = KINDS[tab].map(it => {
      const open = unlocked(tab, it.id, s), on = tab === 'decal' ? (cur.decal == null ? c.decal : cur.decal) === it.id : cur[tab] === it.id;
      let pic;
      if (tab === 'paint') {
        const col = it.id === 'instrument' ? instrumentLook().color : css(it.id);
        pic = `<span class="g-swatch${it.id === 'instrument' ? ' inst' : ''}" style="--sw:${open ? col : 'var(--floor-3)'}"></span>`;
      } else {
        const o = Object.assign({}, c, tab === 'body' ? {body: it.id} : {decal: it.id});
        pic = `<img class="g-thumb" alt="" src="${A.SpeedwayCars.thumbURL(o, 110, {locked: !open})}">`;
      }
      return `<button type="button" class="g-opt${open ? '' : ' locked'}" data-id="${it.id}" aria-pressed="${on}" ${open ? '' : 'aria-disabled="true"'}
        aria-label="${it.name}${open ? '' : '. Locked: ' + requirement(tab, it.id)}">${pic}<span class="g-on">${it.name}</span>` +
        (open ? '' : `<span class="g-lock" aria-hidden="true">🔒</span><small class="g-need">${requirement(tab, it.id)}</small>`) + `</button>`;
    }).join('');
    box.querySelectorAll('.g-opt').forEach(b => b.addEventListener('click', () => pick(tab, b.dataset.id)));
  }
  /** choose an item (false if it's locked: it says how to earn it instead) */
  function pick(kind, id) {
    const s = stats();
    if (!item(kind, id)) return false;
    if (!unlocked(kind, id, s)) {
      const p = progressText(kind, id, s), msg = `Locked: ${requirement(kind, id)}.${p ? ' ' + p + '.' : ''}`;
      if (ov) ov.querySelector('#gReq').textContent = msg;
      return false;
    }
    cur = cur || choice(); cur[kind] = id;
    set({[kind]: id});
    if (ov) {
      const was = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.id;
      drawOpts(); drawNum(); ov.querySelector('#gReq').textContent = '';
      const b = ov.querySelector(`.g-opt[data-id="${was || id}"]`); if (b) b.focus({preventScroll: true});
    }
    tick(kind === 'paint' ? 'skin-equip' : 'avatar-change');
    return true;
  }
  /** the live preview: the car on a turntable, turning a little (a gentle sway; still with reduced motion) */
  function preview(t) {
    const cv = ov && ov.querySelector('#gPrev'); if (!cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const cw = Math.min(W * .62, H * 1.25), gy = H * .8;
    x.fillStyle = css('floor-3'); x.beginPath(); x.ellipse(W / 2, gy + cw * .02, cw * .72, cw * .13, 0, 0, 7); x.fill();       // the turntable
    x.strokeStyle = css('pink'); x.lineWidth = 2; x.globalAlpha = .7; x.stroke(); x.globalAlpha = 1;
    const still = reduced(), a = still ? 0 : Math.sin(t / 1400);
    x.save(); x.translate(W / 2, gy); x.scale(1 - (still ? 0 : .06 * Math.abs(a)), 1); x.rotate(still ? 0 : a * .025);
    A.SpeedwayCars.draw(x, 0, 0, cw, Object.assign(look(cur), {dpr, t, reduced: still, sky: css('sw-sky-low')}));
    x.restore();
    const c = cur, b = item('body', c.body), p = item('paint', c.paint), d = look(c).decal;
    ov.querySelector('#gName').textContent = `${b ? b.name : ''} · ${p ? p.name : ''}${d !== 'none' ? ' · ' + (d === 'number' ? '#' + c.number : item('decal', d).name) : ''}`;
  }

  A.SpeedwayGarage = {choice, look, set, pick, open, close, stats, unlocked, requirement, keys, fresh, markSeen, cardHTML, instrumentLook,
    state: () => ({open: !!ov, tab, choice: choice(), look: look(), unlocked: Object.fromEntries(Object.keys(KINDS).map(k => [k, KINDS[k].filter(it => unlocked(k, it.id)).map(it => it.id)]))})};
})(window.Arcade);
