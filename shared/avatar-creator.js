/* Band Arcade: THE CREATE YOUR PLAYER SCREEN (styles: shared/avatar.css). Opened from Select Player's player card
   (EDIT PLAYER), its one-time "Create your player?" offer, and Arcade Quest's title and SETTINGS.

     Arcade.AvatarCreator.open({guest, member, onClose, tab})
       guest   true: edit Neon Face-Off's GUEST avatar (Player 2) instead of the device's own
       member  the instrument shown in the preview and whose GEAR (accessory + effect skins) EXTRAS changes
               (default the saved player)
       onClose(saved) runs after it closes (saved = true after SAVE)
       tab     the tab to open on ('name': "Tap your name to change it")
     Arcade.AvatarCreator.offer({onDone})   the one-time "Create your player?" card (skippable)

   A big live preview (the portrait bust, and the full-body sprite holding the instrument, which turns when you tap
   it; the background behind the bust moves: shared/avatar-bg.js), tabs FACE · HAIR · HEAD · CLOTHES · EXTRAS ·
   BACKGROUND · NAME (tapping the name under the preview opens NAME), a grid of big labeled buttons per choice, SURPRISE ME (all,
   or this tab), UNDO, CANCEL and DONE. Keyboard: ←/→ on the tabs, arrows move inside a grid, Enter/Space picks, Esc
   closes (asks first when something changed). Nothing is saved until DONE (the name is only ever built from the word
   lists: no typing). It is an overlay on the current page (the avatar badge opens it from any screen: shared/
   avatar-badge.js), so closing it leaves the page exactly as it was. Sounds: avatar-open as it opens (the music dips a
   little while it's open: Sfx.duckHold), avatar-save on DONE, ui-back on CANCEL. DONE fires window 'arcade:avatar'. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const V = () => A.Avatar, P = () => A.Avatar.parts, N = () => A.Avatar.names;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };
  const REDUCED = () => (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches;

  /* the tabs: each a list of choice groups. A group: {k (the avatar field), label, kind: 'part' | 'color' | 'toggle' |
     'word', list(), show(av)?, thumb: 'bust' | 'body' | 'swatch'} */
  const colorList = (ids, prefix = '') => ids.map(id => ({id, name: (P().COLORS.find(c => c.id === id) || {name: id === 'aid' ? 'Skin beige' : id}).name, token: prefix + id}));
  /* OFFICIAL BAND NINJA GEAR (earned in class: a belt code at the Token Booth) lives on its own tab, apart from the
     arcade's own items, and that tab only shows once a code has opened something (or with ?demo&unlockall) */
  const own = list => list.filter(o => !o.official);
  const official = list => list.filter(o => o.official);
  const bnTab = () => (A.Skins && A.Skins.UNLOCK_ALL) || !!(A.BandNinja && Object.keys(A.BandNinja.belts()).length);
  const TABS = () => [
    {id: 'face', label: 'Face', groups: [
      {k: 'skin', label: 'Skin tone', kind: 'color', list: () => P().SKIN.map(s => ({id: s.id, name: s.name, token: 'av-skin-' + s.id}))},
      {k: 'face', label: 'Face shape', kind: 'part', list: () => P().FACES, thumb: 'bust'},
      {k: 'eyes', label: 'Eyes', kind: 'part', list: () => P().EYES, thumb: 'face'},
      {k: 'eyeColor', label: 'Eye color', kind: 'color', list: () => P().EYE_COLORS.map(c => ({id: c.id, name: c.name, token: 'av-eye-' + c.id}))},
      {k: 'brows', label: 'Eyebrows', kind: 'part', list: () => P().BROWS, thumb: 'face'},
      {k: 'mouth', label: 'Mouth', kind: 'part', list: () => P().MOUTHS, thumb: 'face'},
      {k: 'freckles', label: 'Freckles', kind: 'part', list: () => P().FRECKLE_STYLES, thumb: 'face'},
      {k: 'paint', label: 'Face paint', kind: 'part', list: () => P().PAINTS, thumb: 'face'},
      {k: 'paintColor', label: 'Face paint color', kind: 'color', list: () => colorList(P().PAINT_COLORS, 'av-'), show: av => av.paint !== 'none'},
    ]},
    {id: 'hair', label: 'Hair', groups: [
      {k: 'hair', label: 'Hair style', kind: 'part', list: () => P().HAIRS, thumb: 'bust', note: av => { const h = P().HEADS.find(x => x.id === av.head); return h && h.hides === 'all' ? `Your ${h.name.toLowerCase()} covers your hair. Pick "Nothing" on HEAD to see it.` : ''; }},
      {k: 'hairColor', label: 'Hair color', kind: 'color', list: () => P().HAIR_COLORS.map(c => ({id: c.id, name: c.name, token: 'av-hair-' + c.id}))},
    ]},
    {id: 'head', label: 'Head', groups: [
      {k: 'head', label: 'Hats and head coverings', kind: 'part', list: () => P().HEADS, thumb: 'bust'},
      {k: 'headColor', label: 'Color', kind: 'color', list: () => colorList(P().COLORS.map(c => c.id), 'av-'), show: av => av.head !== 'none'},
    ]},
    {id: 'clothes', label: 'Clothes', groups: [
      {k: 'top', label: 'Top', kind: 'part', list: () => own(P().TOPS), thumb: 'bust'},
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
      {k: 'back', label: 'On your back', kind: 'part', list: () => P().BACKS, thumb: 'bust'},
      {k: 'gear.acc', label: 'Gear you earned', kind: 'gear', list: () => gearList('acc'), thumb: 'bust', show: () => !!S.member && !S.guest},
      {k: 'gear.color', label: 'Glow effect', kind: 'gear', list: () => gearList('color'), thumb: 'effect', show: () => !!S.member && !S.guest},
    ]},
    {id: 'hand', label: 'Held item', groups: [
      {k: 'hand', label: 'In your hand', kind: 'part', list: () => own(P().HANDS), thumb: 'hand', note: () => 'Held up beside your portrait (in Arcade Quest you hold your instrument).'},
    ]},
    {id: 'pets', label: 'Pets', groups: [
      {k: 'pet', label: 'Pet', kind: 'part', list: () => P().PETS, thumb: 'pet', note: () => 'Your pet floats beside you and does a little dance now and then.'},
    ]},
    {id: 'effects', label: 'Effects', groups: [
      {k: 'effect', label: 'Effect', kind: 'part', list: () => own(P().EFFECTS), thumb: 'fx', note: () => 'Effects move around you (never over your face) on the biggest picture of you.'},
      {k: 'effectColor', label: 'Aura color', kind: 'color', list: () => P().EFFECT_COLORS.map(c => ({id: c, name: c[0].toUpperCase() + c.slice(1), token: c})), show: av => av.effect === 'aura'},
    ]},
    {id: 'bg', label: 'Background', groups: [
      {k: 'bg', label: 'Background', kind: 'part', list: () => own(P().BGS || []), thumb: 'bg', note: () => 'The ones that come to life move behind your player. Unlock more by playing!'},
    ]},
    {id: 'name', label: 'Name', groups: [                // A–Z, no repeats, never a NEVER-USE word (Avatar.words)
      {k: 'name.title', label: 'Title', kind: 'word', list: () => V().words('title').map(w => ({id: w, name: w}))},
      {k: 'name.adj', label: 'Adjective', kind: 'word', list: () => V().words('adj').map(w => ({id: w, name: w}))},
      {k: 'name.noun', label: 'Noun', kind: 'word', list: () => V().words('noun').map(w => ({id: w, name: w}))},
      {k: 'plate', label: 'Name plate', kind: 'part', list: () => own(P().PLATES), thumb: 'plate', note: () => 'The frame around your name on results screens and score lists.'},
    ]},
  ].concat(bnTab() ? [{id: 'bandninja', label: 'Band Ninja', groups: [
    {k: 'belt', label: 'Belt', kind: 'part', list: () => P().BN_BELTS || [], thumb: 'body', note: () => 'Official Band Ninja gear: earned in class. Enter your belt codes from Band Ninja at the Token Booth in Arcade Quest.'},
    {k: 'plate', label: 'Belt name frame', kind: 'part', list: () => [P().PLATES[0]].concat(official(P().PLATES)), thumb: 'plate', note: () => 'Official Band Ninja gear: earned in class.'},
    {k: 'top', label: 'Gi', kind: 'part', list: () => official(P().TOPS), thumb: 'bust', note: () => 'Official Band Ninja gear: earned in class (the Black belt code).'},
    {k: 'hand', label: 'In your hand', kind: 'part', list: () => [P().HANDS[0]].concat(official(P().HANDS)), thumb: 'hand', note: () => 'Official Band Ninja gear: earned in class (the Diamond belt code).'},
    {k: 'effect', label: 'Effect', kind: 'part', list: () => [P().EFFECTS[0]].concat(official(P().EFFECTS)), thumb: 'fx', note: () => 'Official Band Ninja gear: earned in class (the Diamond belt code; the LEGENDARY Grandmaster\'s Aura: all 10 belt codes).'},
    {k: 'bg', label: 'Background', kind: 'part', list: () => [(P().BGS || [])[0]].concat(official(P().BGS || [])), thumb: 'bg', note: () => 'Official Band Ninja gear: earned in class (the Diamond belt code).'},
  ]}] : []);
  // the fields each tab's SURPRISE ME changes
  const TAB_FIELDS = {face: ['skin', 'face', 'eyes', 'eyeColor', 'brows', 'mouth', 'freckles', 'paint', 'paintColor'], hair: ['hair', 'hairColor'], head: ['head', 'headColor'],
    clothes: ['top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'shoeColor'], extras: ['glasses', 'glassesColor', 'aids', 'aidColor', 'chairColor'], bg: ['bg'], name: ['name'],
    hand: ['hand'], pets: ['pet'], effects: ['effect', 'effectColor'], bandninja: ['belt']};

  /* the unlocked accessories / color skins for the preview's instrument (earned in the games; SKINS locker too) */
  function gearList(kind) {
    if (!A.Skins || !S.member) return [];
    const list = kind === 'acc' ? [{id: null, name: 'None'}].concat(A.Skins.accessories()) : A.Skins.colors();
    return list.filter(s => s.id === null || A.Skins.isUnlocked(s, S.member)).map(s => ({id: s.id, name: s.id === 'classic' ? 'Classic (none)' : s.name, skin: s}));
  }

  let S = null;         // the open creator's state: {av, gear {color, acc}, history, tab, member, guest, root, onClose, dirty}
  const getK = (o, k) => k.split('.').reduce((x, p) => x && x[p], o);
  const setK = (o, k, v) => { const ps = k.split('.'); const last = ps.pop(); ps.reduce((x, p) => x[p], o)[last] = v; };

  function open({guest = false, member, onClose, tab} = {}) {
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
          <button type="button" class="avc-name" aria-describedby="avcNameHint"></button><span id="avcNameHint" hidden>Change your name</span>
          <p class="avc-upgrade" role="status" hidden></p>
          <div class="avc-acts">
            <button type="button" class="btn btn-secondary avc-rand-all">Surprise me</button>
            <button type="button" class="btn btn-secondary avc-rand-tab">Shuffle this tab</button>
            <button type="button" class="btn btn-secondary avc-undo" disabled>Undo</button>
            <button type="button" class="btn btn-secondary avc-cancel">Cancel</button>
            <button type="button" class="btn btn-primary avc-save">Done</button>
          </div>
          <div class="avc-codes"${S.guest ? ' hidden' : ''}>
            <button type="button" class="btn btn-secondary btn-small avc-share">Share to Band Ninja</button>
            <button type="button" class="btn btn-secondary btn-small avc-loadcode">Load avatar code</button>
          </div>
          <p class="avc-lockmsg" role="status" hidden></p>
        </section>
        <section class="avc-edit">
          <div class="avc-tabs" role="tablist" aria-label="Parts">${tabs.map(t => `<button type="button" role="tab" id="avcTab-${t.id}" class="avc-tab" data-tab="${t.id}" aria-controls="avcPanel" aria-selected="false" tabindex="-1">${t.label}</button>`).join('')}</div>
          <div class="avc-panel" id="avcPanel" role="tabpanel"></div>
        </section>
      </div></div>`;
    document.body.appendChild(root);
    if (A.UI && A.UI.layer) A.UI.layer.open(root, {min: 80});   // on top of whatever opened it (shared/ui-kit.js UI.layer)
    document.body.classList.add('avc-open');
    if (A.lockScroll) A.lockScroll(true);
    sfx('avatar-open');                                      // and the music steps back a little while it's open
    if (A.Sfx && A.Sfx.duckHold) A.Sfx.duckHold(true);
    const $ = s => root.querySelector(s);
    $('.avc-close').addEventListener('click', () => tryClose());
    $('.avc-save').addEventListener('click', save);
    $('.avc-cancel').addEventListener('click', () => { sfx('ui-back'); close(false); });
    $('.avc-undo').addEventListener('click', undo);
    // THE AVATAR CODE (shared/avatar-code.js): share this look, or bring one from another device
    $('.avc-share').addEventListener('click', () => { if (A.avatarCode) A.avatarCode.share(S.av); });
    $('.avc-loadcode').addEventListener('click', () => {
      if (!A.avatarCode) return;
      A.avatarCode.load({onLoad: (av, locked) => {
        change(() => { S.av = av; });
        sfx('avatar-randomize');
        const n = S.root.querySelector('.avc-lockmsg');
        n.textContent = locked.length ? `Avatar loaded! Not unlocked on this device yet, so left out: ${locked.join(', ')}.` : 'Avatar loaded! Press DONE to keep it.';
        n.hidden = false; clearTimeout(S.lockT); S.lockT = setTimeout(() => { if (S) n.hidden = true; }, 6000);
      }});
    });
    $('.avc-rand-all').addEventListener('click', () => { change(() => { const keepChair = S.av.chair; S.av = V().random({keep: S.av}); S.av.chair = keepChair; }); sfx('avatar-randomize'); });
    $('.avc-rand-tab').addEventListener('click', () => { change(() => { S.av = V().random({keep: S.av, only: TAB_FIELDS[S.tab]}); }); sfx('avatar-randomize'); });
    $('.avc-body').addEventListener('click', () => { S.view = (S.view + 1) % 4; drawSprite(); });
    $('.avc-name').addEventListener('click', () => showTab('name', true));
    if (!guest && V().nameNote.pending()) {                    // the name migration's one-time note
      const n = $('.avc-upgrade'); n.textContent = V().nameNote.TEXT; n.hidden = false; V().nameNote.seen();
    }
    root.querySelectorAll('.avc-tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab, true)));
    $('.avc-tabs').addEventListener('keydown', e => {
      if (!/^Arrow(Left|Right)$|^Home$|^End$/.test(e.key)) return;
      e.preventDefault();
      const list = TABS().map(t => t.id), i = list.indexOf(S.tab);
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      showTab(list[n], true);
    });
    root.addEventListener('keydown', onKey);
    const first = TABS().some(t => t.id === tab) ? tab : 'face';
    showTab(first);
    render();
    animate();
    setTimeout(() => $('#avcTab-' + first).focus(), 0);
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
  const locked = (g, id) => g.kind !== 'gear' && !V().isUnlocked(g.k, id);
  function pickOption(g, id) {
    if (locked(g, id)) {                                         // locked: say how to get it, change nothing
      const n = S.root.querySelector('.avc-lockmsg'); n.textContent = `Locked: ${V().requirement(g.k, id)}.`;
      n.hidden = false; clearTimeout(S.lockT); S.lockT = setTimeout(() => { if (S) n.hidden = true; }, 3200);
      return;
    }
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
    if (!S.dirty) { sfx('ui-back'); close(false); return; }
    // the shared yes/no question (shared/ui-kit.js); the safe answer (keep editing) has the focus
    A.UI.confirm({title: 'Leave without saving?', text: 'Your changes to your player won’t be saved.', yes: 'Leave', no: 'Keep editing', danger: true})
      .then(leave => { if (!S) return; if (leave) { sfx('ui-back'); close(false); } else { const s = S.root.querySelector('.avc-save'); if (s) s.focus(); } });
  }
  function close(saved) {
    if (!S) return;
    const {root, onClose, guest} = S;
    cancelAnimationFrame(S.raf); clearTimeout(S.tick);
    root.remove(); if (A.UI && A.UI.layer) A.UI.layer.close(root);
    document.body.classList.remove('avc-open');
    if (A.lockScroll) A.lockScroll(false);
    if (A.Sfx && A.Sfx.duckHold) A.Sfx.duckHold(false);
    S = null;
    V().redrawAll();
    // the new look everywhere at once: every avatar box redraws (above); badges, setup cards and sprites listen for this
    if (saved) dispatchEvent(new CustomEvent('arcade:avatar', {detail: {guest: !!guest}}));
    if (onClose) onClose(saved);
  }

  /* ---------- drawing ---------- */
  function render() {
    const root = S.root;
    root.querySelector('.avc-bust').innerHTML = A.avatarHTML({size: 'big', avatar: S.av, member: S.member, skin: S.gear, cls: 'avc-live', live: true});
    const box = root.querySelector('.avc-bust .av-box'); if (box) box.dataset.avFixed = '1';
    const nm = V().nameOf(S.av);                             // with its name plate
    root.querySelector('.avc-name').innerHTML = S.av.plate && S.av.plate !== 'none' ? `<span class="av-plate av-plate-${esc(S.av.plate)}">${esc(nm)}</span>` : esc(nm);
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
    if (g.thumb === 'bg') {                                      // the background with you in front (a locked one: just its dimmed picture)
      const url = A.AvatarBg ? A.AvatarBg.stillURL(opt.id, 128) : '';
      const you = locked(g, opt.id) ? '' : `<img alt="" src="${V().bustURL(V().normalize(av), eq)}">`;
      return `<span class="avc-th avc-th-bg"${opt.id !== 'none' && url ? ` style="background-image:url(${url})"` : ''}>${you}</span>`;
    }
    if (g.thumb === 'plate') return `<span class="avc-th avc-th-plate"><span class="av-plate av-plate-${esc(String(opt.id))}">Name</span></span>`;
    if (g.thumb === 'fx') {                                      // the effect's still pictures behind and in front of you
      const fx = opt.id !== 'none' && A.AvatarFx ? A.AvatarFx.stillURLs(opt.id, av.effectColor, 96) : null;
      return `<span class="avc-th avc-th-fx">${fx ? `<img alt="" src="${fx.back}">` : ''}<img alt="" src="${V().bustURL(V().normalize(av), eq)}">${fx ? `<img alt="" src="${fx.front}">` : ''}</span>`;
    }
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
    if (tab.id === 'name') html += `<div class="avc-namebar"><button type="button" class="btn btn-secondary avc-rand-name">Random name</button></div>`;
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
          const moving = animatedOpt(g, o), anim = moving ? `<span class="avc-anim" title="Animated" aria-hidden="true">${ANIM_ICON}</span>` : '', animSay = moving ? ', animated' : '';
          if (locked(g, o.id)) {                                 // a dark silhouette (backgrounds, effects, plates: dimmed) + what unlocks it
            const req = V().requirement(g.k, o.id);
            return `<button type="button" class="avc-opt avc-locked${['bg', 'fx', 'plate'].includes(g.thumb) ? ' avc-bglock' : ''}${o.legendary ? ' avc-legend' : ''}" data-opt="${esc(String(o.id))}" aria-pressed="false" aria-disabled="true" aria-label="${esc(label + ': ' + o.name + animSay + ', locked. ' + req)}">${thumbHTML(g, o)}${anim}<span class="avc-lock" aria-hidden="true">🔒</span>${o.legendary ? '<span class="avc-legend-tag" aria-hidden="true">Legendary</span>' : ''}<span class="avc-lbl">${esc(o.name)}</span><span class="avc-req">${esc(req)}</span>${V().progress(g.k, o.id) ? `<span class="avc-req avc-prog">${esc(V().progress(g.k, o.id))}</span>` : ''}</button>`;
          }
          const fresh = S.fresh && S.fresh.has(V().itemKey(g.k, o.id)) ? '<span class="avc-newi">NEW!</span>' : '';
          return `<button type="button" class="avc-opt${o.legendary ? ' avc-legend' : ''}" data-opt="${esc(String(o.id))}" aria-pressed="${on}" aria-label="${esc(label + ': ' + o.name + animSay + (fresh ? ', new' : ''))}">${thumbHTML(g, o)}${anim}${fresh}${o.legendary ? '<span class="avc-legend-tag" aria-hidden="true">Legendary</span>' : ''}<span class="avc-lbl">${esc(o.name)}</span></button>`;
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
  /* ---------- ANIMATED items get a small icon; NEW! = unlocked but not looked at here yet ---------- */
  const ANIM_ICON = '<svg viewBox="0 0 16 16"><path d="M2 9c2-4 4-4 6 0s4 4 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="3" cy="4" r="1.3" fill="currentColor"/><circle cx="13" cy="4" r="1.3" fill="currentColor"/></svg>';
  function animatedOpt(g, o) {
    if (g.k === 'effect') return o.id !== 'none';
    if (g.k === 'bg') return !!(A.AvatarBg && A.AvatarBg.animated(o.id));
    return !!(o && (o.anim || o.frames));
  }
  const viewed = () => { const d = A.store.gameData('avatar'); return d.viewed || (d.viewed = {}); };
  /** the unlocked items in a tab that the student hasn't looked at in the creator yet (never with ?unlockall) */
  function freshIn(tabId) {
    if (A.Skins && A.Skins.UNLOCK_ALL) return [];
    const tab = TABS().find(t => t.id === tabId), seen = viewed();
    if (!tab) return [];
    // the items this tab really shows (official Band Ninja gear only on its own tab)
    const here = new Set([].concat(...tab.groups.filter(g => g.kind === 'part').map(g => g.list().map(o => V().itemKey(g.k, o.id)))));
    return V().items().filter(it => here.has(it.key) && !seen[it.key] && V().isUnlocked(it.field, it.id)).map(it => it.key);
  }
  function newDots() {
    S.root.querySelectorAll('.avc-tab').forEach(b => {
      const has = freshIn(b.dataset.tab).length > 0;
      let d = b.querySelector('.avc-new');
      if (has && !d) { d = document.createElement('span'); d.className = 'avc-new'; d.textContent = 'NEW!'; b.appendChild(d); }
      if (!has && d) d.remove();
      b.setAttribute('aria-label', b.textContent.replace('NEW!', '').trim() + (has ? ', something new' : ''));
    });
  }
  function showTab(id, focus) {
    S.tab = id;
    // what's new here is marked NEW! on its button this time, and counts as seen from now on
    const fresh = freshIn(id);
    S.fresh = new Set(fresh);
    if (fresh.length) { const seen = viewed(); fresh.forEach(k => { seen[k] = true; }); A.store.saveGameData('avatar'); }
    S.root.querySelectorAll('.avc-tab').forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on); });
    const panel = S.root.querySelector('.avc-panel'); panel.scrollTop = 0;
    fillPanel();
    newDots();
    if (focus) S.root.querySelector('#avcTab-' + id).focus();
    if (focus) sfx('ui-toggle');
  }

  /* ---------- keyboard: arrows inside a grid move to the nearest button that way (on screen), Esc closes ---------- */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tryClose(); return; }
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
      `<div class="acts"><button type="button" class="btn btn-secondary" data-no>Maybe later</button><button type="button" class="btn btn-primary" data-yes>Create my player</button></div></div>`;
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
