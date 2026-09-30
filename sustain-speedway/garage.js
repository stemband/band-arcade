/* Sustain Speedway: THE GARAGE (Sustain Speedway only, never the arcade's menus). Arcade.SpeedwayGarage.
   The student's car, saved per device in store.gameData('sustain-speedway').garage (levels.js SPEEDWAY_GARAGE has the
   items, their unlock rules and the full shape): BODY · PAINT (+ FINISH, + an optional TWO-TONE roof color) · DECAL
   (+ its own color, + a number 1–99) · PARTS (rims, spoiler, underglow, nitro flame color, trail) · PLATE (a preset word
   or up to 4 digits: never typed text). Everything is checked from the saved progress (so old progress counts): stars
   (store.allStars('*', game)), tracks finished / won, gameData's achievements ('virtuoso-win', 'perfect-lap',
   'teacher-ghost'), wins, bestLap, clean laps (gameData.cleanLaps), breath records (gameData.breath), dynamics zones
   nailed (gameData.dynNailed), smooth slurs (gameData.slurSmooth) and Arcade stars (store.allStars('*')).
   An old save has no garage: Coupe + "My instrument's color" (+ an equipped color skin's color), and its decal is
   AUTO (decal null): racing stripes when the equipped skin has them (Racing Stripes), else none, until one is chosen.
   A choice that is locked (it can't be picked, but an old save, a loadout or ?demo&unlockall could hold one) falls back
   to the free default. NEW IN THE GARAGE: gameData.garageSeen = every item seen unlocked; the results screen shows the
   ones EARNED since (fresh(): free items are never announced), then marks them seen. ?demo&unlockall opens everything.
   3 SAVED LOADOUTS (gameData.loadouts): each slot's name is picked from CFG.loadoutNames (a tap cycles it), SAVE HERE /
   WEAR. RANDOMIZE uses only unlocked items. nextUnlock() = the locked item closest to being earned (the track select's
   "Next unlock" hint).
   open({onClose, tab}) = the GARAGE panel: a live preview (the rear view on a turntable with a gentle sway, or the SIDE
   VIEW), tabs BODY · PAINT · DECALS · PARTS · PLATE, RANDOMIZE, the loadouts, DONE. Touch and keyboard (Tab stays inside,
   Esc closes, ←/→ between tabs when a tab has the focus). */
(function (A) {
  "use strict";
  const GAME_ID = 'sustain-speedway';
  const CFG = window.SPEEDWAY_GARAGE;
  // every choosable kind, its list and its garage field (paint2 / dcolor use the paints)
  const KINDS = {body: CFG.bodies, paint: CFG.paints, finish: CFG.finishes, decal: CFG.decals, rims: CFG.rims, spoiler: CFG.spoilers,
    glow: CFG.glows, flame: CFG.flames, trail: CFG.trails};
  const KIND_NAMES = {body: 'Body', paint: 'Paint', finish: 'Finish', decal: 'Decal', rims: 'Wheels', spoiler: 'Spoiler', glow: 'Underglow', flame: 'Nitro flame', trail: 'Trail'};
  const TABS = [['body', 'Body'], ['paint', 'Paint'], ['decal', 'Decals'], ['parts', 'Parts'], ['plate', 'Plate']];
  const unlockAll = () => A.DEMO && /[?&]unlockall(=|&|$)/.test(location.search);
  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const who = () => (A.currentMember() || {}).id;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

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
    const breath = Object.values(g.breath || {}).reduce((a, b) => Math.max(a, (b && b.best) || 0), 0);
    return {stars: A.store.allStars('*', GAME_ID), tracks: finished.size, wins: won.size, won,
      winCount: Math.max(g.wins || 0, winEntries), ach: g.achievements || {}, bestLap: Object.keys(g.bestLap || {}).length > 0,
      cleanLaps: g.cleanLaps || 0, breath, dynZones: g.dynNailed || 0, slurs: g.slurSmooth || 0, arcadeStars: A.store.allStars('*')};
  }
  const COUNTS = ['stars', 'tracks', 'wins', 'winCount', 'cleanLaps', 'breath', 'dynZones', 'slurs', 'arcadeStars'];
  function ruleMet(u, s) {
    if (!u || u.free) return true;
    if (u.any) return u.any.some(r => ruleMet(r, s));
    for (const k of COUNTS) if (u[k] != null) return s[k] >= u[k];
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
  const UNITS = {stars: ['★', ''], tracks: ['tracks', ''], wins: ['tracks', ''], winCount: ['wins', ''], cleanLaps: ['clean laps', ''], breath: ['s', 'breath'],
    dynZones: ['zones', ''], slurs: ['slurs', ''], arcadeStars: ['★', 'arcade']};
  /** how far along an item is: {have, need, share} or null */
  function progressOf(kind, id, s) {
    const u = (item(kind, id) || {}).unlock || {}; s = s || stats();
    const k = COUNTS.find(c => u[c] != null);
    if (!k) return null;
    const have = k === 'breath' ? Math.round(s.breath * 10) / 10 : s[k];
    return {k, have: Math.min(have, u[k]), need: u[k], share: Math.min(1, have / u[k])};
  }
  function progressText(kind, id, s) {
    const p = progressOf(kind, id, s); if (!p) return '';
    if (p.k === 'wins' && p.need <= 1) return '';
    if (p.k === 'breath') return `best so far: ${p.have.toFixed(1)} of ${p.need} s`;
    return `${p.have} of ${p.need} ${UNITS[p.k][0]} so far`;
  }
  const keys = s => { s = s || stats(); return Object.keys(KINDS).flatMap(k => KINDS[k].filter(it => unlocked(k, it.id, s)).map(it => `${k}:${it.id}`)); };
  const earnedKeys = s => keys(s).filter(k => { const [kind, id] = k.split(':'); return !((item(kind, id) || {}).unlock || {}).free; });

  /* ---------- the saved choice ---------- */
  const DEFAULT = {body: 'coupe', paint: 'instrument', finish: 'gloss', paint2: null, decal: null, dcolor: null, number: 7,
    rims: 'classic', spoiler: 'stock', glow: 'none', flame: 'orange', trail: 'none', plate: {w: 'BAND'}};
  const FIELDS = Object.keys(DEFAULT);
  function clean(raw, s) {
    const c = Object.assign({}, DEFAULT, raw || {});
    s = s || stats();
    ['body', 'paint', 'finish', 'rims', 'spoiler', 'glow', 'flame', 'trail'].forEach(k => { if (!unlocked(k, c[k], s)) c[k] = DEFAULT[k]; });
    if (c.decal != null && !unlocked('decal', c.decal, s)) c.decal = null;
    if (c.paint2 != null && !unlocked('paint', c.paint2, s)) c.paint2 = null;
    if (c.dcolor != null && !unlocked('paint', c.dcolor, s)) c.dcolor = null;
    c.number = Math.max(1, Math.min(99, Math.round(c.number) || DEFAULT.number));
    const pl = c.plate || {};
    c.plate = pl.w && CFG.plateWords.includes(pl.w) ? {w: pl.w} : pl.d != null && /^\d{1,4}$/.test(String(pl.d)) ? {d: String(pl.d)} : {w: 'BAND'};
    const out = {}; FIELDS.forEach(k => { out[k] = c[k]; });
    return out;
  }
  const choice = () => clean(gd().garage);
  /** the instrument's own look: the equipped color skin's first color, else the instrument's color; skin stripes */
  function instrumentLook() {
    const m = who();
    let color = css('pt-' + m) || css('pink'), stripes = false;
    const eq = A.Skins && m && A.Skins.equipped(m), sk = eq && A.Skins.LIST.find(x => x.id === eq.color);
    if (sk && sk.id !== 'classic' && sk.look && sk.look.colors) color = css(sk.look.colors[0] === 'white' ? 'white-hi' : sk.look.colors[0]) || color;
    if (sk && sk.look && sk.look.stripes) stripes = true;
    return {color, stripes};
  }
  const colorOf = id => (id === 'instrument' ? instrumentLook().color : css(id) || instrumentLook().color);
  /** the car to draw: everything cars.js needs (c = a choice to preview, else the saved one) */
  function look(c) {
    c = c || choice();
    const inst = instrumentLook(), p = item('paint', c.paint) || {};
    return {body: c.body, color: colorOf(c.paint), finish: p.finish || c.finish, color2: c.paint2 ? colorOf(c.paint2) : null,
      decal: c.decal == null ? (inst.stripes ? 'stripes' : 'none') : c.decal, dcolor: c.dcolor ? colorOf(c.dcolor) : null, number: c.number,
      rims: c.rims, spoiler: c.spoiler, glow: c.glow, flame: c.flame, trail: c.trail, plate: c.plate};
  }
  function set(patch) {
    const g = gd();
    g.garage = clean(Object.assign(choice(), patch)); save();
  }

  /* ---------- NEW IN THE GARAGE ---------- */
  function seenList() {
    const g = gd();
    if (!Array.isArray(g.garageSeen)) { g.garageSeen = unlockAll() ? [] : keys(); save(); }   // the first visit: what's already open isn't "new"
    return g.garageSeen;
  }
  function fresh() { if (unlockAll()) return []; const seen = new Set(seenList()); return earnedKeys().filter(k => !seen.has(k)); }
  function markSeen(list) { const g = gd(), seen = new Set(seenList()); (list || keys()).forEach(k => seen.add(k)); g.garageSeen = [...seen]; save(); }
  const nameOf = key => { const [k, id] = key.split(':'); const it = item(k, id); return it ? (k === 'body' || k === 'paint' || k === 'decal' ? it.name : `${it.name} (${KIND_NAMES[k].toLowerCase()})`) : id; };
  /** the results screen's "NEW IN THE GARAGE!" card (html) for these keys */
  function cardHTML(list) {
    return `<div class="sw-newcar" id="gNew"><p class="sw-newcar-t">NEW IN THE GARAGE!</p>` +
      `<p class="sw-newcar-l">${list.map(k => `<span>${esc(nameOf(k))}</span>`).join('')}</p>` +
      `<button type="button" class="btn garage-btn garage-fill" id="gNewBtn">${ICON}<span class="gb-t">Garage</span></button></div>`;
  }
  /** THE NEXT UNLOCK: the locked item closest to being earned (by progress share; ties = the list's order) */
  function nextUnlock() {
    if (unlockAll()) return null;
    const s = stats(); let best = null;
    Object.keys(KINDS).forEach(kind => KINDS[kind].forEach(it => {
      if (unlocked(kind, it.id, s)) return;
      const p = progressOf(kind, it.id, s), share = p ? p.share : 0;
      if (!best || share > best.share) best = {kind, id: it.id, name: it.name, what: KIND_NAMES[kind], text: requirement(kind, it.id), progress: progressText(kind, it.id, s), share};
    }));
    return best;
  }
  /** the garage's car icon (the track menu's GARAGE button has the same one) */
  const ICON = '<svg class="gb-i" viewBox="0 0 40 24" aria-hidden="true"><path d="M3 18V12L8 10L12 4H28L32 10L37 12V18Z" fill="currentColor"/>' +
    '<circle cx="11" cy="19" r="4" fill="var(--gb-wheel,var(--deep))" stroke="currentColor" stroke-width="2"/><circle cx="29" cy="19" r="4" fill="var(--gb-wheel,var(--deep))" stroke="currentColor" stroke-width="2"/></svg>';

  /* ---------- RANDOMIZE (only unlocked items) and the LOADOUTS ---------- */
  const pickOne = l => l[Math.floor(Math.random() * l.length)];
  function randomize() {
    const s = stats(), open = kind => KINDS[kind].filter(it => unlocked(kind, it.id, s)).map(it => it.id);
    const paints = open('paint');
    const c = {body: pickOne(open('body')), paint: pickOne(paints), finish: pickOne(open('finish')), paint2: Math.random() < .3 ? pickOne(paints) : null,
      decal: pickOne(open('decal')), dcolor: Math.random() < .4 ? pickOne(paints) : null, number: 1 + Math.floor(Math.random() * 99),
      rims: pickOne(open('rims')), spoiler: pickOne(open('spoiler')), glow: pickOne(open('glow')), flame: pickOne(open('flame')), trail: pickOne(open('trail')),
      plate: Math.random() < .8 ? {w: pickOne(CFG.plateWords)} : {d: String(Math.floor(Math.random() * 10000)).padStart(4, '0')}};
    set(c); cur = choice();
    return cur;
  }
  function loadouts() {
    const g = gd();
    if (!Array.isArray(g.loadouts) || g.loadouts.length !== 3) g.loadouts = [0, 1, 2].map(i => (g.loadouts && g.loadouts[i]) || {name: CFG.loadoutNames[i], car: null});
    return g.loadouts;
  }
  function saveLoadout(i) { const l = loadouts(); l[i].car = choice(); save(); }
  function wearLoadout(i) { const l = loadouts()[i]; if (!l || !l.car) return false; set(l.car); cur = choice(); return true; }
  function renameLoadout(i) {
    const l = loadouts(), n = CFG.loadoutNames, k = n.indexOf(l[i].name);
    l[i].name = n[(k + 1) % n.length]; save(); return l[i].name;
  }

  /* ---------- THE GARAGE panel ---------- */
  let ov = null, cur = null, tab = 'body', raf = 0, back = null, onClose = null, view = 'rear';
  const reduced = () => (A.reducedMotion ? A.reducedMotion.matches : matchMedia('(prefers-reduced-motion: reduce)').matches);
  function open(opts = {}) {
    if (ov) return;
    onClose = opts.onClose || null; back = document.activeElement;
    seenList();
    cur = choice(); tab = opts.tab === 'decal' || TABS.some(t => t[0] === opts.tab) ? opts.tab : 'body';
    ov = document.createElement('div');
    ov.className = 'overlay sw-garage-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'gTitle');
    ov.innerHTML = `<div class="panel sw-garage">
      <h2 id="gTitle">Garage</h2>
      <div class="g-stage"><canvas class="g-prev" id="gPrev" role="img" aria-label="Your car"></canvas>
        <button type="button" class="btn btn-secondary btn-small g-view" id="gView" aria-pressed="false">Side view</button>
        <p class="g-name" id="gName"></p></div>
      <div class="ui-seg g-tabs" role="group" aria-label="Garage parts">${TABS.map(([k, n]) => `<button type="button" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="g-body" id="gBody"></div>
      <p class="g-req" id="gReq" aria-live="polite"></p>
      <div class="g-loads" id="gLoads" role="group" aria-label="Saved loadouts"></div>
      <div class="acts"><button type="button" class="btn btn-secondary" id="gRandom">Randomize</button><button type="button" class="btn btn-primary" id="gDone">Done</button></div></div>`;
    document.body.appendChild(ov);
    if (A.lockScroll) A.lockScroll(true);
    ov.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; drawTabs(); tick('ui-toggle'); }));
    ov.querySelector('#gDone').addEventListener('click', close);
    ov.querySelector('#gRandom').addEventListener('click', () => { randomize(); drawTabs(); tick('avatar-randomize'); });
    ov.querySelector('#gView').addEventListener('click', e => { view = view === 'rear' ? 'side' : 'rear'; e.currentTarget.setAttribute('aria-pressed', String(view === 'side')); e.currentTarget.textContent = view === 'side' ? 'Rear view' : 'Side view'; tick('ui-toggle'); });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      const tb = e.target.closest && e.target.closest('[data-tab]');
      if (tb && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {                // ←/→ between the tabs
        const i = TABS.findIndex(t => t[0] === tb.dataset.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
        e.preventDefault(); tab = n; drawTabs(); ov.querySelector(`[data-tab="${n}"]`).focus();
      }
      if (e.key === 'Tab') {                                                     // the focus stays in the panel
        const f = [...ov.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      e.stopPropagation();
    });
    drawTabs(); drawLoads();
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
    drawBody();
    ov.querySelector('#gReq').textContent = '';
  }
  /** one row of options: a title + buttons (data-kind, data-id); pic(item, open) = the picture */
  function section(title, kind, list, isOn, pic, {cls = '', extra = null} = {}) {
    const s = stats();
    const opts = (extra ? [extra] : []).concat(list).map(it => {
      const open = it.free || unlocked(kind === 'paint2' || kind === 'dcolor' ? 'paint' : kind, it.id, s);
      const req = open ? '' : requirement(kind === 'paint2' || kind === 'dcolor' ? 'paint' : kind, it.id);
      return `<button type="button" class="g-opt${open ? '' : ' locked'}" data-kind="${kind}" data-id="${it.id}" aria-pressed="${isOn(it.id)}" ${open ? '' : 'aria-disabled="true"'}
        aria-label="${esc(it.name)}${open ? '' : '. Locked: ' + esc(req)}">${pic(it, open)}<span class="g-on">${esc(it.name)}</span>` +
        (open ? '' : `<span class="g-lock" aria-hidden="true">🔒</span><small class="g-need">${esc(req)}</small>`) + `</button>`;
    }).join('');
    return `<section class="g-sec"><h3 class="g-sh">${title}</h3><div class="g-opts g-${kind} ${cls}" role="group" aria-label="${title}">${opts}</div></section>`;
  }
  const swatch = (id, open) => `<span class="g-swatch${id === 'instrument' ? ' inst' : ''}" style="--sw:${open ? colorOf(id) : 'var(--floor-3)'}"></span>`;
  const thumb = (o, open) => `<img class="g-thumb" alt="" src="${A.SpeedwayCars.thumbURL(o, 110, {locked: !open})}">`;
  const TRAIL_ICON = {none: '–', streak: '━', sparkles: '✦', notes: '♪', stars: '★'};
  function drawBody() {
    const box = ov.querySelector('#gBody'), c = look(cur), paintsOpen = CFG.paints.filter(p => unlocked('paint', p.id));
    let html = '';
    if (tab === 'body') html = section('Body', 'body', CFG.bodies, id => cur.body === id, (it, open) => thumb(Object.assign({}, c, {body: it.id}), open));
    else if (tab === 'paint') {
      html = section('Color', 'paint', CFG.paints, id => cur.paint === id, (it, open) => swatch(it.id, open), {cls: 'g-small'})
        + section('Finish', 'finish', CFG.finishes, id => ((item('paint', cur.paint) || {}).finish || cur.finish) === id, (it, open) => thumb(Object.assign({}, c, {finish: it.id, decal: 'none'}), open))
        + section('Two-tone roof', 'paint2', paintsOpen, id => (cur.paint2 || 'none') === id, it => (it.id === 'none' ? '<span class="g-swatch none"></span>' : swatch(it.id, true)),
          {cls: 'g-small', extra: {id: 'none', name: 'One color', free: true}});
    } else if (tab === 'decal') {
      const d = cur.decal == null ? c.decal : cur.decal;
      html = section('Decal', 'decal', CFG.decals, id => d === id, (it, open) => thumb(Object.assign({}, c, {decal: it.id}), open))
        + section('Decal color', 'dcolor', paintsOpen, id => (cur.dcolor || 'auto') === id, it => (it.id === 'auto' ? '<span class="g-swatch auto"></span>' : swatch(it.id, true)),
          {cls: 'g-small', extra: {id: 'auto', name: 'Its own colors', free: true}})
        + `<div class="g-num" id="gNum" ${d === 'number' || cur.body === 'stock' ? '' : 'hidden'}><span class="ui-label">Your number</span>
          <button type="button" class="btn btn-secondary btn-small" data-num="-1" aria-label="Lower number">−</button><b id="gNumV" aria-live="polite">${cur.number}</b>
          <button type="button" class="btn btn-secondary btn-small" data-num="1" aria-label="Higher number">+</button></div>`;
    } else if (tab === 'parts') {
      html = section('Wheels', 'rims', CFG.rims, id => cur.rims === id, (it, open) => `<img class="g-rim${open ? '' : ' dim'}" alt="" src="${A.SpeedwayCars.rimURL(it.id, 64)}">`)
        + section('Spoiler', 'spoiler', CFG.spoilers, id => cur.spoiler === id, (it, open) => thumb(Object.assign({}, c, {spoiler: it.id, decal: 'none'}), open))
        + section('Underglow', 'glow', CFG.glows, id => cur.glow === id, (it, open) => `<span class="g-swatch glow${it.id === 'none' ? ' none' : ''}" style="--sw:${open && it.id !== 'none' ? css(it.id) : 'var(--floor-3)'}"></span>`, {cls: 'g-small'})
        + section('Nitro flame', 'flame', CFG.flames, id => cur.flame === id, (it, open) => `<span class="g-swatch flame f-${it.id}" style="--sw:${open ? (it.id === 'orange' ? css('sw-flame-1') : css(it.id) || 'var(--pink)') : 'var(--floor-3)'}"></span>`, {cls: 'g-small'})
        + section('Trail', 'trail', CFG.trails, id => cur.trail === id, it => `<span class="g-icon" aria-hidden="true">${TRAIL_ICON[it.id] || '•'}</span>`, {cls: 'g-small'})
        + '<p class="g-note">Trails show at speed (not in Lite graphics or with reduced motion).</p>';
    } else if (tab === 'plate') {
      const pl = cur.plate || {}, digits = String(pl.d != null ? pl.d : '0000').padStart(4, '0').split('');
      html = `<section class="g-sec"><h3 class="g-sh">A word</h3><div class="g-opts g-words" role="group" aria-label="Plate words">${CFG.plateWords.map(w =>
          `<button type="button" class="g-word" data-word="${esc(w)}" aria-pressed="${pl.w === w}"><span class="g-plate">${esc(w)}</span></button>`).join('')}</div></section>
        <section class="g-sec"><h3 class="g-sh">Or 4 digits</h3><div class="g-digits" role="group" aria-label="Plate digits">${digits.map((n, i) =>
          `<div class="g-dig"><button type="button" class="btn btn-secondary btn-small" data-dig="${i}" data-step="1" aria-label="Digit ${i + 1} up">▲</button><b id="gDig${i}">${n}</b><button type="button" class="btn btn-secondary btn-small" data-dig="${i}" data-step="-1" aria-label="Digit ${i + 1} down">▼</button></div>`).join('')}
          <button type="button" class="g-word" id="gUseDigits" aria-pressed="${pl.d != null}"><span class="g-plate">${digits.join('')}</span><small>Use these</small></button></div></section>`;
    }
    box.innerHTML = html;
    box.querySelectorAll('.g-opt').forEach(b => b.addEventListener('click', () => pick(b.dataset.kind, b.dataset.id)));
    box.querySelectorAll('[data-num]').forEach(b => b.addEventListener('click', () => {
      cur.number = ((cur.number - 1 + +b.dataset.num + 99) % 99) + 1; set({number: cur.number}); box.querySelector('#gNumV').textContent = cur.number; tick('ui-toggle');
    }));
    box.querySelectorAll('[data-word]').forEach(b => b.addEventListener('click', () => { cur.plate = {w: b.dataset.word}; set({plate: cur.plate}); drawBody(); focusSame(b); tick('avatar-change'); }));
    box.querySelectorAll('[data-dig]').forEach(b => b.addEventListener('click', () => {
      const d = String((cur.plate && cur.plate.d != null ? cur.plate.d : '0000')).padStart(4, '0').split(''), i = +b.dataset.dig;
      d[i] = String((+d[i] + +b.dataset.step + 10) % 10); cur.plate = {d: d.join('')}; set({plate: cur.plate}); drawBody(); focusSame(b); tick('ui-toggle');
    }));
    const ud = box.querySelector('#gUseDigits');
    if (ud) ud.addEventListener('click', () => { const d = String((cur.plate && cur.plate.d) || '0000').padStart(4, '0'); cur.plate = {d}; set({plate: cur.plate}); drawBody(); focusSame(ud); tick('avatar-change'); });
  }
  function focusSame(b) {
    const sel = b.id ? `#${b.id}` : b.dataset.word ? `[data-word="${b.dataset.word}"]` : b.dataset.dig ? `[data-dig="${b.dataset.dig}"][data-step="${b.dataset.step}"]` : null;
    const n = sel && ov.querySelector(sel); if (n) n.focus({preventScroll: true});
  }
  /** choose an item (false if it's locked: it says how to earn it instead). kind 'paint2' / 'dcolor' = a paint id or 'none' / 'auto' */
  function pick(kind, id) {
    const s = stats(), base = kind === 'paint2' || kind === 'dcolor' ? 'paint' : kind;
    const clear = (kind === 'paint2' && id === 'none') || (kind === 'dcolor' && id === 'auto');
    if (!clear && !item(base, id)) return false;
    if (!clear && !unlocked(base, id, s)) {
      const p = progressText(base, id, s), msg = `Locked: ${requirement(base, id)}.${p ? ' ' + p + '.' : ''}`;
      if (ov) ov.querySelector('#gReq').textContent = msg;
      return false;
    }
    cur = cur || choice(); cur[kind] = clear ? null : id;
    if (kind === 'paint' && (item('paint', id) || {}).finish) cur.finish = item('paint', id).finish;
    set({[kind]: cur[kind], finish: cur.finish});
    if (ov) {
      const was = document.activeElement && document.activeElement.dataset;
      drawBody(); ov.querySelector('#gReq').textContent = '';
      const b = was && was.id ? ov.querySelector(`.g-opt[data-kind="${was.kind || kind}"][data-id="${was.id}"]`) : ov.querySelector(`.g-opt[data-kind="${kind}"][data-id="${id}"]`);
      if (b) b.focus({preventScroll: true});
    }
    tick(base === 'paint' || kind === 'finish' ? 'skin-equip' : 'avatar-change');
    return true;
  }
  function drawLoads() {
    const box = ov.querySelector('#gLoads'), l = loadouts();
    box.innerHTML = `<p class="g-sh">Saved cars</p>` + l.map((x, i) => `<div class="g-load">
      <button type="button" class="g-lname" data-lname="${i}" aria-label="Name: ${esc(x.name)}. Tap to change">${esc(x.name)}</button>
      <button type="button" class="btn btn-secondary btn-small" data-lsave="${i}">Save here</button>
      <button type="button" class="btn btn-secondary btn-small" data-lwear="${i}" ${x.car ? '' : 'disabled'}>Wear</button></div>`).join('');
    box.querySelectorAll('[data-lname]').forEach(b => b.addEventListener('click', () => { renameLoadout(+b.dataset.lname); drawLoads(); ov.querySelector(`[data-lname="${b.dataset.lname}"]`).focus(); tick('ui-toggle'); }));
    box.querySelectorAll('[data-lsave]').forEach(b => b.addEventListener('click', () => { saveLoadout(+b.dataset.lsave); drawLoads(); ov.querySelector(`[data-lsave="${b.dataset.lsave}"]`).focus(); ov.querySelector('#gReq').textContent = `Saved as ${loadouts()[+b.dataset.lsave].name}.`; tick('avatar-save'); }));
    box.querySelectorAll('[data-lwear]').forEach(b => b.addEventListener('click', () => { if (wearLoadout(+b.dataset.lwear)) { drawBody(); ov.querySelector('#gReq').textContent = `Wearing ${loadouts()[+b.dataset.lwear].name}.`; tick('skin-equip'); } }));
  }
  /** the live preview: the car on a turntable, turning a little (a gentle sway; still with reduced motion), or its side */
  function preview(t) {
    const cv = ov && ov.querySelector('#gPrev'); if (!cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const still = reduced(), a = still ? 0 : Math.sin(t / 1400), L = look(cur), sky = css('sw-sky-low');
    if (view === 'side') {
      const gy = H * .84, cw = Math.min(W * .78, (gy - 8) / A.SpeedwayCars.sideHeight(L.body));
      x.fillStyle = css('floor-3'); x.fillRect(W / 2 - cw * .6, gy, cw * 1.2, 3);
      A.SpeedwayCars.side(x, W / 2, gy, cw, Object.assign({}, L, {sky}));
    } else {
      const gy = H * .8, cw = Math.min(W * .62, H * 1.25, (gy - 8) / (L.body === 'monster' || L.spoiler === 'tall' ? .7 : .6));
      x.fillStyle = css('floor-3'); x.beginPath(); x.ellipse(W / 2, gy + cw * .02, cw * .72, cw * .13, 0, 0, 7); x.fill();       // the turntable
      x.strokeStyle = css('pink'); x.lineWidth = 2; x.globalAlpha = .7; x.stroke(); x.globalAlpha = 1;
      x.save(); x.translate(W / 2, gy); x.scale(1 - (still ? 0 : .06 * Math.abs(a)), 1); x.rotate(still ? 0 : a * .025);
      A.SpeedwayCars.draw(x, 0, 0, cw, Object.assign(L, {dpr, t, reduced: still, sky}));
      x.restore();
    }
    const c = cur, b = item('body', c.body), p = item('paint', c.paint), d = look(c).decal, f = (p && p.finish) || c.finish;
    ov.querySelector('#gName').textContent = `${b ? b.name : ''} · ${p ? p.name : ''}${f !== 'gloss' ? ' ' + item('finish', f).name.toLowerCase() : ''}${d !== 'none' ? ' · ' + (d === 'number' ? '#' + c.number : item('decal', d).name) : ''}`;
  }

  A.SpeedwayGarage = {ICON, choice, look, set, pick, open, close, stats, unlocked, requirement, keys, fresh, markSeen, cardHTML, instrumentLook,
    randomize, nextUnlock, loadouts, saveLoadout, wearLoadout, renameLoadout, KINDS,
    state: () => ({open: !!ov, tab, view, choice: choice(), look: look(), unlocked: Object.fromEntries(Object.keys(KINDS).map(k => [k, KINDS[k].filter(it => unlocked(k, it.id)).map(it => it.id)]))})};
})(window.Arcade);
