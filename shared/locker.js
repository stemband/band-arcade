/* Band Arcade: THE LOCKER. Every avatar item (unlock rules in shared/avatar-parts.js; worn everywhere) and the
   instrument's skins (shared/skins.js; per instrument), in tabs OUTFIT · HATS · EXTRAS · PETS · BACKGROUNDS · EFFECTS.
   Locked = a dark silhouette + what earns it (+ progress). A live preview of the student's avatar on top. One tap wears
   an item. NEW = earned since the Locker was last opened (Arcade.Locker.fresh, in shared/avatar-badge.js); opening it
   clears the badge's dot, the NEW tags stay for that visit.
   Where it opens: Choose Your Instrument's player card (LOCKER; Player 2's turn dresses the GUEST avatar), the avatar
   badge's menu in any top bar (the saved instrument), a results screen's LOCKER button (after an UNLOCKED! card). It is
   an overlay on the page: closing it goes back to exactly where the student was (focus included).
   Loaded by the floor page; any other page gets it (+ shared/locker.css and the full-body sprite parts) on demand
   through Arcade.Locker.open (avatar-badge.js).
     Arcade.LockerUI.open({member, guest, tab, onChange, onClose})   member = the instrument whose skins show
     Arcade.LockerUI.close()
     Arcade.LockerUI.picOf(field, id, member, avatar)   an item's thumbnail (the Prize Counter's shelves use it too)
     Arcade.LockerUI.state()   tests: {open, member, tab, fresh: [keys shown as NEW]} */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const P = () => window.AVATAR_PARTS, AV = () => A.Avatar;
  const info = id => A.memberById(id);
  // official Band Ninja gear (earned in class: a belt code) shows only once it's been earned
  const earned = (field, list) => list.filter(o => !o.official || AV().isUnlocked(field, o.id));
  const TABS = {
    outfit: [{field: 'top', label: 'Tops', list: () => earned('top', P().TOPS)}, {field: 'shoes', label: 'Shoes', note: 'in Arcade Quest and the full-body picture', list: () => P().SHOES},
             {field: 'hairColor', label: 'Hair colors', list: () => P().HAIR_COLORS}],
    hats: [{field: 'head', label: 'Hats and head coverings', list: () => P().HEADS}],
    extras: [{skin: 'acc', label: 'Accessory', note: 'worn with this instrument'}, {field: 'hand', label: 'Held item', list: () => earned('hand', P().HANDS || [])}, {field: 'back', label: 'On your back', list: () => P().BACKS},
             {field: 'belt', label: 'Band Ninja belts', note: 'official Band Ninja gear: earned in class', list: () => { const l = earned('belt', P().BN_BELTS || []); return l.length > 1 ? l : []; }},
             {field: 'plate', label: 'Name plates', note: 'around your name on results and score lists', list: () => earned('plate', P().PLATES || [])},
             {field: 'eyes', label: 'Expressions: eyes', list: () => P().EYES}, {field: 'mouth', label: 'Expressions: mouth', list: () => P().MOUTHS}],
    pets: [{field: 'pet', label: 'Pets', note: 'they float beside you', list: () => P().PETS}],
    backgrounds: [{field: 'bg', label: 'Backgrounds', note: 'behind your player', list: () => earned('bg', P().BGS || [])}],
    effects: [{field: 'effect', label: 'Effects around you', note: 'they move on the biggest picture of you', list: () => earned('effect', P().EFFECTS || [])}, {skin: 'color', label: 'Glow effects', note: 'worn with this instrument'}],
  };
  const TAB_NAMES = {outfit: 'Outfit', hats: 'Hats', extras: 'Extras', pets: 'Pets', backgrounds: 'Backgrounds', effects: 'Effects'};

  function markup() {
    if ($('locker')) return $('locker');
    const ov = document.createElement('div');
    ov.className = 'overlay sk-locker'; ov.id = 'locker'; ov.hidden = true;
    ov.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="lkTitle">
      <div class="lk-head"><div class="lk-stage"><div class="lk-pic" id="lkPic"></div></div>
        <div class="lk-info"><p class="lk-kicker">Locker</p><h2 id="lkTitle"></h2><p class="lk-now" id="lkNow" aria-live="polite"></p>
          <p class="muted lk-how">Earn items with stars from every game, special wins, or tokens at the Prize Counter. Tap one to wear it.</p></div></div>
      <div class="lk-tabs" role="tablist" aria-label="Locker sections" id="lkTabs">${Object.keys(TABS).map(t => `<button type="button" role="tab" data-tab="${t}" id="lkTab-${t}">${TAB_NAMES[t]}</button>`).join('')}</div>
      <div class="lk-panel" id="lkBody" role="tabpanel"></div>
      <div class="acts"><button type="button" class="btn btn-primary" id="lkDone">Done</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => {
      if (e.target === ov) return close();
      const b = e.target.closest('.sk-opt'); if (b) return pick(b);
      const t = e.target.closest('[role="tab"]'); if (t) return show(t.dataset.tab, true);
      if (e.target.closest('#lkDone')) close();
    });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest('#lkTabs')) {  // ←/→ between the tabs
        const list = Object.keys(TABS), i = list.indexOf(S.tab);
        e.preventDefault(); show(list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length], true);
      } else if (e.key === 'Tab') {                                // focus stays in the Locker
        const f = [...ov.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      e.stopPropagation();                                          // a game underneath never sees the Locker's keys
    });
    return ov;
  }

  const S = {member: null, guest: false, tab: 'outfit', onChange: null, onClose: null, prev: null, fresh: new Set()};
  const avatar = () => S.guest ? AV().guest() : AV().get();
  const LOCK = '<svg class="lk-lock" viewBox="0 0 20 24" aria-hidden="true"><rect x="3" y="10" width="14" height="12" rx="2"/><path d="M6.5 10V7a3.5 3.5 0 0 1 7 0v3" fill="none"/></svg>';
  function tile({attrs, name, open, pressed, need, prog, pic, legend, fresh}) {
    return `<button type="button" class="sk-opt${open ? '' : ' locked'}${legend ? ' sk-legend' : ''}${fresh ? ' lk-isnew' : ''}" ${attrs} aria-pressed="${pressed}"` +
      ` aria-label="${esc(name)}${fresh ? ', new' : ''}${legend ? ', legendary' : ''}${open ? (pressed ? ', wearing' : '') : ', locked. ' + esc(need)}"${open ? '' : ' aria-disabled="true"'}>` +
      (fresh ? '<span class="lk-new" aria-hidden="true">NEW</span>' : '') +
      `<span class="sk-o-pic" aria-hidden="true">${pic}${open ? '' : LOCK}</span>` +
      (legend ? '<span class="lk-legend-tag" aria-hidden="true">Legendary</span>' : '') +
      `<b>${esc(name)}</b>${open ? '' : `<small>${esc(need)}${prog ? `<br>${esc(prog)}` : ''}</small>`}</button>`;
  }
  /** an item's picture: your avatar wearing it; a name plate: its frame around your name; shoes: your full body */
  function picOf(field, itemId, member, av) {
    const worn = Object.assign({}, av, {[field]: itemId});
    if (field === 'plate') return `<span class="lk-plate"><span class="av-plate av-plate-${itemId}">${esc(AV().nameOf(av).split(' ').slice(-1)[0])}</span></span>`;
    if (field === 'shoes' && AV().sprites) { const sp = AV().sprites(member, {avatar: worn}); if (sp && sp['-front']) return `<span class="lk-shoe"><img alt="" src="${sp['-front'].frames[0].toDataURL()}"></span>`; }
    return A.avatarHTML({size: 'tile', member, avatar: worn, label: ''});
  }
  const skinKey = (s, m) => `skin:${s.id}@${m}`;
  function draw() {
    const id = S.member, Sk = A.Skins, eq = Sk.equipped(id), m = info(id), av = avatar(), guest = S.guest;
    $('lkTitle').textContent = guest ? `Guest · ${m.short}` : `${AV().nameOf(av)} · ${m.short}`;
    $('lkPic').innerHTML = A.avatarHTML({size: 'big', member: id, guest, live: true});
    $('lkNow').textContent = `Wearing: ${Sk.get(eq.color).name}${eq.acc ? ' + ' + Sk.get(eq.acc).name : ''}` +
      (av.pet && av.pet !== 'none' ? ` · Pet: ${(P().PETS.find(p => p.id === av.pet) || {}).name}` : '');
    const tabNew = t => TABS[t].some(g => g.skin ? (g.skin === 'color' ? Sk.colors() : Sk.accessories()).some(s => S.fresh.has(skinKey(s, id)))
      : g.list().some(p => S.fresh.has(`${g.field}:${p.id}`)));
    $('lkTabs').querySelectorAll('[role="tab"]').forEach(b => {
      const on = b.dataset.tab === S.tab, t = b.dataset.tab;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      b.innerHTML = TAB_NAMES[t] + (tabNew(t) ? '<span class="lk-tdot" aria-label=" (new)"></span>' : '');
    });
    $('lkBody').setAttribute('aria-labelledby', 'lkTab-' + S.tab);
    $('lkBody').innerHTML = TABS[S.tab].map((g, gi) => {
      let html;
      if (!g.skin && !g.list().length) return '';                // nothing to show (Band Ninja belts before a code)
      if (g.skin) {
        const list = g.skin === 'color' ? Sk.colors() : [{id: 'none', kind: 'acc', name: 'None', unlock: {always: true}}].concat(Sk.accessories());
        html = list.map(s => {
          const open = Sk.isUnlocked(s, id), skin = g.skin === 'color' ? {color: s.id, acc: eq.acc} : {color: eq.color, acc: s.id === 'none' ? null : s.id};
          const pressed = g.skin === 'color' ? s.id === eq.color : (s.id === 'none' ? !eq.acc : s.id === eq.acc);
          return tile({attrs: `data-kind="${s.kind}" data-skin="${s.id}"`, name: s.name, open, pressed, need: open ? '' : Sk.requirement(s), prog: open ? '' : Sk.progress(s, id),
            pic: s.id === 'none' ? '<span class="lk-none" aria-hidden="true">∅</span>' : A.avatarHTML({size: 'tile', member: id, guest, skin, label: m.short}), fresh: S.fresh.has(skinKey(s, id))});
        }).join('');
      } else {
        html = g.list().map(p => {
          const open = AV().isUnlocked(g.field, p.id);
          const dim = ['bg', 'effect', 'plate'].includes(g.field) ? ' data-lk-bg="1"' : '';          // a locked one: its dimmed picture, not a silhouette
          return tile({attrs: `data-field="${g.field}" data-item="${p.id}"${dim}`, name: p.name, open, pressed: av[g.field] === p.id,
            need: open ? '' : AV().requirement(g.field, p.id), prog: open ? '' : AV().progress(g.field, p.id),
            pic: picOf(g.field, p.id, id, av), legend: !!p.legendary, fresh: S.fresh.has(`${g.field}:${p.id}`)});
        }).join('');
      }
      return `<h3 class="lk-sub" id="lkG${gi}">${g.label}${g.note ? ` <small>(${g.note})</small>` : ''}</h3><div class="lk-grid" role="group" aria-labelledby="lkG${gi}">${html}</div>`;
    }).join('');
  }
  function pick(b) {
    const name = b.querySelector('b').textContent;
    if (b.classList.contains('locked')) {
      if (A.Sfx) A.Sfx.event('note-wrong');
      $('lkNow').textContent = `${name}: ${b.dataset.item ? AV().requirement(b.dataset.field, b.dataset.item) : A.Skins.requirement(A.Skins.get(b.dataset.skin))}`;
      return;
    }
    let sel;
    if (b.dataset.item) {                                        // an avatar item: the avatar wears it everywhere
      const av = avatar(); av[b.dataset.field] = b.dataset.item;
      if (S.guest) AV().setGuest(av); else AV().set(av);
      if (A.Sfx) A.Sfx.event('skin-equip');
      sel = `[data-field="${b.dataset.field}"][data-item="${b.dataset.item}"]`;
      try { dispatchEvent(new CustomEvent('arcade:avatar', {detail: {guest: S.guest}})); } catch (e) { /* old browsers */ }
    } else {
      const s = b.dataset.skin;
      A.Skins.equip(S.member, b.dataset.kind === 'acc' ? {acc: s === 'none' ? null : s} : {color: s});
      sel = `[data-kind="${b.dataset.kind}"][data-skin="${s}"]`;
      if (A.Skins.refresh) A.Skins.refresh(S.member);
    }
    const ov = $('locker'), scroll = ov.scrollTop;
    draw();
    ov.scrollTop = scroll;
    if (S.onChange) S.onChange();
    const again = ov.querySelector('.sk-opt' + sel);
    if (again) again.focus({preventScroll: true});
  }
  function show(tab, focus) {
    S.tab = tab; draw();
    if (focus) { $('lkTab-' + tab).focus(); if (A.Sfx) A.Sfx.event('ui-toggle'); }
  }
  function open({member, guest = false, tab, onChange, onClose} = {}) {
    member = member || (A.store && A.store.player) || 'trumpet';
    if (!info(member) || !AV()) return false;
    const ov = markup();
    Object.assign(S, {member, guest, onChange: onChange || null, onClose: onClose || null, prev: document.activeElement});
    if (tab && TABS[tab]) S.tab = tab;
    // NEW: what was earned since the last visit (the student's own avatar only), then the badge's dot clears
    S.fresh = new Set(!guest && A.Locker ? A.Locker.fresh(member) : []);
    if (!guest && A.Locker) A.Locker.markOpened(member);
    draw();
    ov.hidden = false; ov.scrollTop = 0;
    if (A.UI && A.UI.layer) A.UI.layer.open(ov, {min: 85});   // on top of whatever opened it (shared/ui-kit.js UI.layer)
    document.body.classList.add('lk-open');
    if (A.lockScroll) A.lockScroll(true);
    $('lkTab-' + S.tab).focus({preventScroll: true});
    if (A.Sfx) A.Sfx.event('ui-toggle');
    return true;
  }
  function close() {
    const ov = $('locker');
    if (!ov || ov.hidden) return;
    ov.hidden = true; if (A.UI && A.UI.layer) A.UI.layer.close(ov);
    document.body.classList.remove('lk-open');
    if (A.lockScroll) A.lockScroll(false);
    const cb = S.onClose, prev = S.prev;
    S.onClose = S.onChange = null; S.member = null; S.fresh = new Set();
    if (cb) cb(); else if (prev && prev.isConnected && prev.focus) prev.focus({preventScroll: true});
  }
  A.LockerUI = {open, close, TABS, picOf, get isOpen() { return !!($('locker') && !$('locker').hidden); },
    state: () => ({open: !!($('locker') && !$('locker').hidden), member: S.member, guest: S.guest, tab: S.tab, fresh: [...S.fresh]})};
})(window.Arcade);
