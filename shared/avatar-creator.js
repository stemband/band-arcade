/* Band Arcade: THE CREATE YOUR PLAYER SCREEN (styles: shared/avatar.css). Opened from Select Player's player card
   (EDIT PLAYER), its one-time "Create your player?" offer, and Arcade Quest's title and SETTINGS.

     Arcade.AvatarCreator.open({guest, member, onClose})
       guest   true: edit Neon Face-Off's GUEST avatar (Player 2) instead of the device's own
       member  the instrument shown in the preview and whose GEAR (accessory + effect skins) EXTRAS changes
               (default the saved player)
       onClose(saved) runs after it closes (saved = true after SAVE)
     Arcade.AvatarCreator.offer({onDone})   the one-time "Create your player?" card (skippable)

   A big live preview (the portrait bust, and the full-body sprite holding the instrument, which turns when you tap
   it), tabs FACE · HAIR · HEAD · CLOTHES · EXTRAS · NAME, a grid of big labeled buttons per choice, SURPRISE ME (all,
   or this tab), UNDO and SAVE. Keyboard: ←/→ on the tabs, arrows move inside a grid, Enter/Space picks, Esc closes.
   Nothing is saved until SAVE (the name is only ever built from the word lists: no typing). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const V = () => A.Avatar, P = () => A.Avatar.parts, N = () => A.Avatar.names;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the tabs: each a list of choice groups. A group: {k (the avatar field), label, kind: 'part' | 'color' | 'toggle' |
     'word', list(), show(av)?, thumb: 'bust' | 'body' | 'swatch'} */
  const colorList = (ids, prefix = '') => ids.map(id => ({id, name: (P().COLORS.find(c => c.id === id) || {name: id === 'aid' ? 'Skin beige' : id}).name, token: prefix + id}));
  const TABS = () => [
    {id: 'face', label: 'Face', groups: [
      {k: 'skin', label: 'Skin tone', kind: 'color', list: () => P().SKIN.map(s => ({id: s.id, name: s.name, token: 'av-skin-' + s.id}))},
      {k: 'face', label: 'Face shape', kind: 'part', list: () => P().FACES, thumb: 'bust'},
      {k: 'eyes', label: 'Eyes', kind: 'part', list: () => P().EYES, thumb: 'face'},
      {k: 'eyeColor', label: 'Eye color', kind: 'color', list: () => P().EYE_COLORS.map(c => ({id: c.id, name: c.name, token: 'av-eye-' + c.id}))},
      {k: 'brows', label: 'Eyebrows', kind: 'part', list: () => P().BROWS, thumb: 'face'},
      {k: 'mouth', label: 'Mouth', kind: 'part', list: () => P().MOUTHS, thumb: 'face'},
      {k: 'freckles', label: 'Freckles', kind: 'toggle', list: () => [{id: false, name: 'No freckles'}, {id: true, name: 'Freckles'}], thumb: 'face'},
    ]},
    {id: 'hair', label: 'Hair', groups: [
      {k: 'hair', label: 'Hair style', kind: 'part', list: () => P().HAIRS, thumb: 'bust', note: av => { const h = P().HEADS.find(x => x.id === av.head); return h && h.hides === 'all' ? `Your ${h.name.toLowerCase()} covers your hair. Pick "Nothing" on HEAD to see it.` : ''; }},
      {k: 'hairColor', label: 'Hair color', kind: 'color', list: () => P().HAIR_COLORS.map(c => ({id: c.id, name: c.name, token: 'av-hair-' + c.id}))},
    ]},
    {id: 'head', label: 'Head', groups: [
      {k: 'head', label: 'Head covering', kind: 'part', list: () => P().HEADS, thumb: 'bust'},
      {k: 'headColor', label: 'Color', kind: 'color', list: () => colorList(P().COLORS.map(c => c.id), 'av-'), show: av => av.head !== 'none'},
    ]},
    {id: 'clothes', label: 'Clothes', groups: [
      {k: 'top', label: 'Top', kind: 'part', list: () => P().TOPS, thumb: 'bust'},
      {k: 'topColor', label: 'Top color', kind: 'color', list: () => colorList(P().COLORS.map(c => c.id), 'av-'), labelFor: av => av.top === 'concert' ? 'Bow tie color' : 'Top color'},
      {k: 'bottom', label: 'Bottoms', kind: 'part', list: () => P().BOTTOMS, thumb: 'body'},
      {k: 'bottomColor', label: 'Bottoms color', kind: 'color', list: () => colorList(P().BOTTOM_COLORS, 'av-')},
      {k: 'shoes', label: 'Shoes', kind: 'part', list: () => P().SHOES, thumb: 'body'},
      {k: 'shoeColor', label: 'Shoe color', kind: 'color', list: () => colorList(P().SHOE_COLORS, 'av-')},
    ]},
    {id: 'extras', label: 'Extras', groups: [
      {k: 'glasses', label: 'Glasses', kind: 'part', list: () => P().GLASSES, thumb: 'face'},
      {k: 'glassesColor', label: 'Frame color', kind: 'color', list: () => colorList(P().FRAME_COLORS, 'av-'), show: av => av.glasses !== 'none'},
      {k: 'aids', label: 'Hearing aids', kind: 'part', list: () => P().AIDS, thumb: 'bust'},
      {k: 'aidColor', label: 'Hearing aid color', kind: 'color', list: () => colorList(P().AID_COLORS, 'av-'), show: av => av.aids !== 'none'},
      {k: 'chair', label: 'Wheelchair', kind: 'toggle', list: () => [{id: false, name: 'No wheelchair'}, {id: true, name: 'Wheelchair'}], thumb: 'body'},
      {k: 'chairColor', label: 'Wheelchair color', kind: 'color', list: () => colorList(P().CHAIR_COLORS, 'av-'), show: av => av.chair},
      {k: 'gear.acc', label: 'Gear you earned', kind: 'gear', list: () => gearList('acc'), thumb: 'bust', show: () => !!S.member && !S.guest},
      {k: 'gear.color', label: 'Glow effect', kind: 'gear', list: () => gearList('color'), thumb: 'effect', show: () => !!S.member && !S.guest},
    ]},
    {id: 'name', label: 'Name', groups: [
      {k: 'name.title', label: 'Title', kind: 'word', list: () => N().titles.map(w => ({id: w, name: w}))},
      {k: 'name.adj', label: 'Adjective', kind: 'word', list: () => N().adjectives.map(w => ({id: w, name: w}))},
      {k: 'name.noun', label: 'Noun', kind: 'word', list: () => N().nouns.map(w => ({id: w, name: w}))},
      {k: 'name.initial', label: 'First initial (optional)', kind: 'word', list: () => [{id: '', name: 'None'}].concat('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => ({id: c, name: c + '.'})))},
    ]},
  ];
  // the fields each tab's SURPRISE ME changes
  const TAB_FIELDS = {face: ['skin', 'face', 'eyes', 'eyeColor', 'brows', 'mouth', 'freckles'], hair: ['hair', 'hairColor'], head: ['head', 'headColor'],
    clothes: ['top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'shoeColor'], extras: ['glasses', 'glassesColor', 'aids', 'aidColor', 'chairColor'], name: ['name']};

  /* the unlocked accessories / color skins for the preview's instrument (earned in the games; SKINS locker too) */
  function gearList(kind) {
    if (!A.Skins || !S.member) return [];
    const list = kind === 'acc' ? [{id: null, name: 'None'}].concat(A.Skins.accessories()) : A.Skins.colors();
    return list.filter(s => s.id === null || A.Skins.isUnlocked(s, S.member)).map(s => ({id: s.id, name: s.id === 'classic' ? 'Classic (none)' : s.name, skin: s}));
  }

  let S = null;         // the open creator's state: {av, gear {color, acc}, history, tab, member, guest, root, onClose, dirty}
  const getK = (o, k) => k.split('.').reduce((x, p) => x && x[p], o);
  const setK = (o, k, v) => { const ps = k.split('.'); const last = ps.pop(); ps.reduce((x, p) => x[p], o)[last] = v; };

  function open({guest = false, member, onClose} = {}) {
    if (S) close(false);
    member = member === undefined ? A.store.player : member;
    const av = guest ? V().guest() : V().get();
    S = {av: V().clone(av), gear: V().eqFor(member), history: [], tab: 'face', member, guest, onClose, dirty: false, view: 0, t0: performance.now()};
    const root = S.root = document.createElement('div');
    root.className = 'av-creator';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'avcTitle');
    const tabs = TABS();
    root.innerHTML = `<div class="avc-wrap">
      <header class="avc-head"><h2 id="avcTitle">${guest ? 'Guest player' : 'Create your player'}</h2>
        <button type="button" class="avc-close" aria-label="Close without saving"><span aria-hidden="true">×</span></button></header>
      <div class="avc-main">
        <section class="avc-preview" aria-label="Preview">
          <div class="avc-stage">
            <div class="avc-bust"></div>
            <button type="button" class="avc-body" aria-label="Turn your player around"><canvas width="32" height="32"></canvas><small aria-hidden="true">Tap to turn</small></button>
          </div>
          <p class="avc-name" aria-live="polite"></p>
          <div class="avc-acts">
            <button type="button" class="btn btn-ghost avc-rand-all">Surprise me</button>
            <button type="button" class="btn btn-ghost avc-rand-tab">Shuffle this tab</button>
            <button type="button" class="btn btn-ghost avc-undo" disabled>Undo</button>
            <button type="button" class="btn btn-gold avc-save">Save</button>
          </div>
          <div class="avc-leave" hidden><p>Leave without saving?</p><button type="button" class="btn btn-ghost avc-stay">Keep editing</button><button type="button" class="btn btn-gold avc-go">Leave</button></div>
        </section>
        <section class="avc-edit">
          <div class="avc-tabs" role="tablist" aria-label="Parts">${tabs.map(t => `<button type="button" role="tab" id="avcTab-${t.id}" class="avc-tab" data-tab="${t.id}" aria-controls="avcPanel" aria-selected="false" tabindex="-1">${t.label}</button>`).join('')}</div>
          <div class="avc-panel" id="avcPanel" role="tabpanel"></div>
        </section>
      </div></div>`;
    document.body.appendChild(root);
    document.body.classList.add('avc-open');
    if (A.lockScroll) A.lockScroll(true);
    const $ = s => root.querySelector(s);
    $('.avc-close').addEventListener('click', () => tryClose());
    $('.avc-stay').addEventListener('click', () => { $('.avc-leave').hidden = true; $('.avc-save').focus(); });
    $('.avc-go').addEventListener('click', () => close(false));
    $('.avc-save').addEventListener('click', save);
    $('.avc-undo').addEventListener('click', undo);
    $('.avc-rand-all').addEventListener('click', () => { change(() => { const keepChair = S.av.chair; S.av = V().random({keep: S.av}); S.av.chair = keepChair; }); sfx('avatar-randomize'); });
    $('.avc-rand-tab').addEventListener('click', () => { change(() => { S.av = V().random({keep: S.av, only: TAB_FIELDS[S.tab]}); }); sfx('avatar-randomize'); });
    $('.avc-body').addEventListener('click', () => { S.view = (S.view + 1) % 4; drawSprite(); });
    root.querySelectorAll('.avc-tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab, true)));
    $('.avc-tabs').addEventListener('keydown', e => {
      if (!/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)) return;
      e.preventDefault();
      const list = TABS().map(t => t.id), i = list.indexOf(S.tab);
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      showTab(list[n], true);
    });
    root.addEventListener('keydown', onKey);
    showTab('face');
    render();
    animate();
    setTimeout(() => $('#avcTab-face').focus(), 0);
  }

  /* ---------- editing ---------- */
  function change(fn) {
    S.history.push({av: V().clone(S.av), gear: Object.assign({}, S.gear)});
    if (S.history.length > 40) S.history.shift();
    fn();
    S.av = V().normalize(S.av);
    S.dirty = true;
    render();
  }
  function undo() {
    const h = S.history.pop(); if (!h) return;
    S.av = h.av; S.gear = h.gear; S.dirty = true;
    sfx('avatar-change');
    render();
  }
  function pickOption(g, id) {
    if (g.kind === 'gear') change(() => { S.gear = Object.assign({}, S.gear, {[g.k.split('.')[1]]: id}); });
    else change(() => setK(S.av, g.k, id));
    sfx('avatar-change');
  }
  function save() {
    if (S.guest) V().setGuest(S.av);
    else {
      V().set(S.av);
      if (S.member && A.Skins) {
        const now = A.Skins.equipped(S.member);
        if (now.color !== S.gear.color || now.acc !== S.gear.acc) A.Skins.equip(S.member, {color: S.gear.color, acc: S.gear.acc}, {sound: false});
        if (A.Skins.refresh) A.Skins.refresh(S.member);
      }
    }
    sfx('avatar-save');
    close(true);
  }
  function tryClose() {
    if (!S.dirty) { close(false); return; }
    const box = S.root.querySelector('.avc-leave'); box.hidden = false; box.querySelector('.avc-stay').focus();
  }
  function close(saved) {
    if (!S) return;
    const {root, onClose} = S;
    cancelAnimationFrame(S.raf); clearTimeout(S.tick);
    root.remove();
    document.body.classList.remove('avc-open');
    if (A.lockScroll) A.lockScroll(false);
    S = null;
    V().redrawAll();
    if (onClose) onClose(saved);
  }

  /* ---------- drawing ---------- */
  function render() {
    const root = S.root;
    root.querySelector('.avc-bust').innerHTML = A.avatarHTML({size: 'big', avatar: S.av, member: S.member, skin: S.gear, cls: 'avc-live'});
    const box = root.querySelector('.avc-bust .av-box'); if (box) box.dataset.avFixed = '1';
    root.querySelector('.avc-name').textContent = V().nameOf(S.av);
    root.querySelector('.avc-undo').disabled = !S.history.length;
    drawSprite();
    fillPanel();
  }
  function drawSprite() {
    const c = S.root.querySelector('.avc-body canvas'), x = c.getContext('2d');
    x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32);
    const sp = V().sprites(S.member || 'trumpet', {avatar: S.av, eq: S.gear});
    const body = S.root.querySelector('.avc-body');
    if (!sp) { body.hidden = true; return; }
    const key = ['', '-front', '-back', '-play'][S.view];
    const set = sp[key], f = REDUCED() ? 0 : Math.floor((performance.now() - S.t0) / 500) % set.frames.length;
    x.drawImage(set.frames[f], 0, 0);
  }
  function animate() {
    if (!S) return;
    if (!REDUCED()) drawSprite();
    S.tick = setTimeout(() => { S.raf = requestAnimationFrame(animate); }, 250);
  }
  function thumbHTML(g, opt) {
    if (g.kind === 'color') return `<span class="avc-sw" style="--sw:var(--${opt.token})"></span>`;
    if (g.kind === 'word') return '';
    if (g.thumb === 'effect') return `<span class="avc-th avc-eff">${A.avatarHTML({size: 'tile', avatar: S.av, member: S.member, skin: {color: opt.id, acc: S.gear.acc}, label: ''})}</span>`;
    const av = V().clone(S.av);
    let eq = S.gear;
    if (g.kind === 'gear') eq = Object.assign({}, S.gear, {acc: opt.id});
    else setK(av, g.k, opt.id);
    if (g.thumb === 'body') {
      const sp = V().sprites(S.member || 'trumpet', {avatar: av, eq});
      return sp ? `<span class="avc-th avc-th-body"><img alt="" src="${sp['-front'].frames[0].toDataURL()}"></span>` : '';
    }
    return `<span class="avc-th${g.thumb === 'face' ? ' avc-th-face' : ''}"><img alt="" src="${V().bustURL(V().normalize(av), eq)}"></span>`;
  }
  function fillPanel() {
    const panel = S.root.querySelector('.avc-panel'), tab = TABS().find(t => t.id === S.tab);
    const focusId = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.opt;
    const focusGroup = document.activeElement && document.activeElement.closest && document.activeElement.closest('.avc-grid') && document.activeElement.closest('.avc-grid').dataset.k;
    const scroll = panel.scrollTop;
    panel.setAttribute('aria-labelledby', 'avcTab-' + tab.id);
    let html = '';
    if (tab.id === 'name') html += `<div class="avc-namebar"><button type="button" class="btn btn-ghost avc-rand-name">Random name</button></div>`;
    tab.groups.forEach(g => {
      if (g.show && !g.show(S.av)) return;
      const list = g.list(); if (!list.length) return;
      const cur = g.kind === 'gear' ? S.gear[g.k.split('.')[1]] : getK(S.av, g.k);
      const label = g.labelFor ? g.labelFor(S.av) : g.label;
      const note = g.note ? g.note(S.av) : '';
      const gid = 'avcG-' + g.k.replace('.', '-');
      html += `<div class="avc-group"><h3 id="${gid}">${label}</h3>${note ? `<p class="avc-note">${esc(note)}</p>` : ''}` +
        (g.kind === 'gear' && g.k === 'gear.acc' ? `<p class="avc-note">Earned in the games. It's worn with your ${esc((A.memberById(S.member) || {}).short || 'instrument')}.</p>` : '') +
        `<div class="avc-grid avc-${g.kind}${g.thumb === 'body' ? ' avc-bodies' : ''}" role="group" aria-labelledby="${gid}" data-k="${g.k}">` +
        list.map(o => {
          const on = o.id === cur || (o.id === null && !cur);
          return `<button type="button" class="avc-opt" data-opt="${esc(String(o.id))}" aria-pressed="${on}" aria-label="${esc(label + ': ' + o.name)}">${thumbHTML(g, o)}<span class="avc-lbl">${esc(o.name)}</span></button>`;
        }).join('') + `</div></div>`;
    });
    panel.innerHTML = html;
    panel.scrollTop = scroll;
    panel.querySelectorAll('.avc-grid').forEach(grid => {
      const g = tab.groups.find(x => x.k === grid.dataset.k), list = g.list();
      grid.querySelectorAll('.avc-opt').forEach((b, i) => b.addEventListener('click', () => pickOption(g, list[i].id)));
    });
    const rn = panel.querySelector('.avc-rand-name');
    if (rn) rn.addEventListener('click', () => { change(() => { S.av.name = V().randomName(); }); sfx('avatar-randomize'); });
    if (focusGroup) {
      const b = panel.querySelector(`.avc-grid[data-k="${focusGroup}"] .avc-opt[data-opt="${CSS.escape(focusId || '')}"]`) || panel.querySelector(`.avc-grid[data-k="${focusGroup}"] .avc-opt`);
      if (b) b.focus({preventScroll: true});
    }
  }
  function showTab(id, focus) {
    S.tab = id;
    S.root.querySelectorAll('.avc-tab').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on); });
    const panel = S.root.querySelector('.avc-panel'); panel.scrollTop = 0;
    fillPanel();
    if (focus) S.root.querySelector('#avcTab-' + id).focus();
    if (focus) sfx('ui-toggle');
  }

  /* ---------- keyboard: arrows inside a grid move to the nearest button that way (on screen), Esc closes ---------- */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const leave = S.root.querySelector('.avc-leave'); if (!leave.hidden) { leave.hidden = true; return; } tryClose(); return; }
    const b = e.target.closest && e.target.closest('.avc-opt');
    if (!b || !/^Arrow/.test(e.key)) { if (e.key === 'Tab') trap(e); return; }
    e.preventDefault(); e.stopPropagation();
    const all = [...S.root.querySelectorAll('.avc-panel .avc-opt')], r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
    let best = null, bestD = Infinity;
    all.forEach(o => {
      if (o === b) return;
      const q = o.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
      if (dir[0] && Math.sign(dx) !== dir[0]) return; if (dir[1] && Math.sign(dy) !== dir[1]) return;
      if (dir[0] && Math.abs(dy) > r.height * 0.6) return;
      const d = dir[0] ? Math.abs(dx) + Math.abs(dy) * 3 : Math.abs(dy) + Math.abs(dx) * 0.6;
      if (d < bestD) { bestD = d; best = o; }
    });
    if (best) { best.focus(); best.scrollIntoView({block: 'nearest'}); }
  }
  function trap(e) {                               // Tab stays inside the creator
    const f = [...S.root.querySelectorAll('button:not([disabled]):not([hidden]), [tabindex="0"]')].filter(x => x.offsetParent !== null && x.tabIndex >= 0);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }

  /* ---------- the one-time offer on Select Player ---------- */
  function offer({onDone} = {}) {
    if (A.store.avatarOffered) return false;
    A.store.setAvatarOffered();
    const ov = document.createElement('div');
    ov.className = 'overlay avc-offer';
    ov.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="avcOfferT">` +
      `<div class="avc-offer-pic">${A.avatarHTML({size: 'big', skin: false})}</div>` +
      `<h2 id="avcOfferT">Create your player?</h2><p>This is you in the arcade: <b>${esc(V().nameOf(V().get()))}</b>. Pick your own look and name, or keep this one. You can change it any time with EDIT PLAYER.</p>` +
      `<div class="acts"><button type="button" class="btn btn-ghost" data-no>Maybe later</button><button type="button" class="btn btn-gold" data-yes>Create my player</button></div></div>`;
    document.body.appendChild(ov);
    const done = yes => { ov.remove(); document.removeEventListener('keydown', k, true); if (yes) open({onClose: () => onDone && onDone()}); else if (onDone) onDone(); };
    const k = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', k, true);
    ov.querySelector('[data-no]').addEventListener('click', () => done(false));
    ov.querySelector('[data-yes]').addEventListener('click', () => done(true));
    ov.querySelector('[data-yes]').focus();
    return true;
  }

  A.AvatarCreator = {open, offer, get isOpen() { return !!S; }, close: () => close(false), state: () => S && {av: S.av, gear: S.gear, tab: S.tab, dirty: S.dirty}};
})(window.Arcade);
