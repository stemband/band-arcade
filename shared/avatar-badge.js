/* Band Arcade: THE AVATAR BADGE, in the top bar of every screen that has one (the floor's lobby, zones, Full Arcade and
   All Games, Choose Your Instrument, every game page through Arcade.mountTopbar), so a student can reach Create Your
   Player from anywhere without losing their place.
     the badge   the student's avatar (the portrait bust), its safe-builder name, the instrument under it, a small pencil;
                 no avatar saved yet: a silhouette and "Create avatar"
     its menu    a small popover with big buttons: EDIT AVATAR (the creator as an overlay on this very page, so the
                 screen, the selections and the scroll stay exactly as they were), SHARE TO BAND NINJA, LOCKER (below)
                 and CHANGE INSTRUMENT (what the chip
                 did before: Choose Your Instrument). Tap outside or Esc closes it; keyboard: Enter opens, focus goes to
                 EDIT AVATAR, Tab/↑/↓ move, Esc returns to the badge
     during play hidden (html.in-play, set by Arcade.Bg.menu: every level, round, match, battle and transmission turns
                 the menu background off, and back on for results), so it can't be tapped by accident
   The creator (shared/avatar-creator.js + avatar.css + the full-body sprite parts in shared/instrument-sprites.js) is
   loaded the first time EDIT AVATAR is used on a page that doesn't already have it.

     Arcade.AvatarBadge.mount(el, {member, instLabel, changeInstrument: href | fn | null})   draws the badge into el
     the menu also has "🎟 142 tokens · PRIZE COUNTER": the Prize Counter over this page when it has shared/prizes.js
     (the floor), else the floor page with ?prizes, which opens it there
     Arcade.AvatarBadge.edit({member, onClose, tab})   the creator for the device's avatar (loads it first if needed)
   THE NAME UPGRADE NOTE: after the name migration (shared/avatar.js: a NEVER-USE word or an old initial was replaced),
   the first badge on the next page shows "Your name got an upgrade! Tap your name to change it." once, under the
   badge; tapping it opens the creator on the NAME tab, × closes it.
     Arcade.AvatarBadge.load()                    a Promise: the creator is ready
   Saving the avatar fires window 'arcade:avatar' ({detail: {guest}}); every badge redraws itself on it.
   THE LOCKER (shared/locker.js) from anywhere: the menu's LOCKER ("Locker · 12 of 58") opens it over this page for the
   badge's instrument (the saved one), and a results screen's LOCKER button (shared/skins.js announce) too.
     Arcade.Locker.open({member, guest, tab, onChange, onClose})   loads shared/locker.js + locker.css (+ the full-body
                                                     sprite parts) the first time, then opens it; a Promise
     Arcade.Locker.count(member)     {have, total}: avatar items + that instrument's skins (official gear only once earned)
     Arcade.Locker.fresh(member)     NEW: the item keys earned since the Locker was last opened ('field:id', skins
                                     'skin:<id>@<member>'); gameData('locker').seen. The first time a device is asked,
                                     everything already earned counts as seen (only new earnings get a NEW)
     Arcade.Locker.markOpened(member)  everything earned so far = seen (opening the Locker); fires 'arcade:locker'
   The badge shows a small pink dot while fresh(member) has anything; every badge redraws on 'arcade:locker'. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const DIR = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : 'shared/'; })();
  const ver = u => (A.v ? A.v(u) : u);
  const PENCIL = '<svg class="avb-pen" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/></svg>';
  const SILHOUETTE = '<svg class="avb-sil" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="13" r="7"/><path d="M5 34c1-8 6-12 13-12s12 4 13 12z"/></svg>';
  const badges = new Set();

  /* ---------- the creator, loaded on demand ---------- */
  let loading = null;
  function script(src) {
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = ver(src); s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  }
  function load() {
    if (A.AvatarCreator && window.QUEST_ART) return Promise.resolve();
    if (loading) return loading;
    if (!document.querySelector('link[href*="avatar.css"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ver(DIR + 'avatar.css'); document.head.appendChild(l);
    }
    loading = (window.QUEST_ART ? Promise.resolve() : script(DIR + 'instrument-sprites.js'))
      .then(() => A.AvatarCreator ? null : script(DIR + 'avatar-creator.js'))
      .catch(e => { loading = null; throw e; });
    return loading;
  }
  /** the creator for the device's own avatar, over this page */
  function edit({member, onClose, tab} = {}) {
    return load().then(() => A.AvatarCreator.open({member, onClose, tab}))
      .catch(e => { if (window.console) console.warn('Band Arcade: the avatar editor could not load', e); });
  }

  /* ---------- THE LOCKER: counts, what's NEW, and the Locker itself loaded on demand ---------- */
  const unlockAll = () => !!(A.DEMO && A.params && A.params.has && A.params.has('unlockall'));
  function lockItems() {
    const AV = A.Avatar; if (!AV || !AV.items) return [];
    return AV.items().filter(it => !it.official || AV.isUnlocked(it.field, it.id));
  }
  const lockSkins = () => (A.Skins && A.Skins.LIST ? A.Skins.LIST.filter(s => !s.unlock.always) : []);
  function count(member) {
    member = member || (A.store && A.store.player);
    const items = lockItems(), skins = lockSkins(), AV = A.Avatar;
    return {have: items.filter(it => AV.isUnlocked(it.field, it.id)).length + (member ? skins.filter(s => A.Skins.isUnlocked(s, member)).length : 0),
      total: items.length + (member ? skins.length : 0)};
  }
  function earnedKeys(member) {
    const AV = A.Avatar; if (!AV || !AV.items || !A.store) return {items: [], skins: []};
    return {items: lockItems().filter(it => AV.isUnlocked(it.field, it.id)).map(it => it.key),
      skins: member ? lockSkins().filter(s => A.Skins.isUnlocked(s, member)).map(s => `skin:${s.id}@${member}`) : []};
  }
  function lockData() {
    const d = A.store.gameData('locker');
    if (!d.seen) d.seen = {};
    if (!d.members) d.members = {};
    return d;
  }
  function fresh(member) {
    member = member || (A.store && A.store.player);
    if (!A.store || !A.Avatar || unlockAll()) return [];
    const d = lockData(), k = earnedKeys(member);
    let save = false;
    // the first time: what's already earned is not "new" (only what's earned from now on)
    if (!d.base) { k.items.forEach(x => { d.seen[x] = 1; }); d.base = 1; save = true; }
    if (member && !d.members[member]) { k.skins.forEach(x => { d.seen[x] = 1; }); d.members[member] = 1; save = true; }
    if (save) A.store.saveGameData('locker');
    return k.items.concat(k.skins).filter(x => !d.seen[x]);
  }
  function markOpened(member) {
    member = member || (A.store && A.store.player);
    if (!A.store || !A.Avatar || unlockAll()) return;
    const d = lockData(), k = earnedKeys(member);
    k.items.concat(k.skins).forEach(x => { d.seen[x] = 1; });
    d.base = 1; if (member) d.members[member] = 1;
    A.store.saveGameData('locker');
    changed();
  }
  const changed = () => { try { dispatchEvent(new CustomEvent('arcade:locker')); } catch (e) { badges.forEach(b => b.render()); } };
  let lkLoading = null;
  function loadLocker() {
    if (A.LockerUI && window.QUEST_ART) return Promise.resolve();
    if (lkLoading) return lkLoading;
    if (!document.querySelector('link[href*="locker.css"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ver(DIR + 'locker.css'); document.head.appendChild(l);
    }
    lkLoading = (window.QUEST_ART ? Promise.resolve() : script(DIR + 'instrument-sprites.js'))
      .then(() => A.LockerUI ? null : script(DIR + 'locker.js'))
      .catch(e => { lkLoading = null; throw e; });
    return lkLoading;
  }
  function openLocker(opts = {}) {
    return loadLocker().then(() => A.LockerUI.open(opts))
      .catch(e => { if (window.console) console.warn('Band Arcade: the Locker could not load', e); });
  }
  A.Locker = {open: openLocker, load: loadLocker, count, fresh, markOpened, changed};

  /* ---------- the badge ---------- */
  function mount(el, opts = {}) {
    if (!el) return null;
    const b = {el, opts};
    el.classList.add('avb');
    el.innerHTML = `<button type="button" class="avb-btn" aria-haspopup="true" aria-expanded="false"></button>` +
      `<div class="avb-menu" role="group" aria-label="Your player" hidden>` +
      `<button type="button" class="avb-item avb-edit">${PENCIL}<span>Edit avatar</span></button>` +
      `<button type="button" class="avb-item avb-share"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/></svg><span>Share to Band Ninja</span></button>` +
      `<button type="button" class="avb-item avb-locker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14M9 7h2M9 16h2"/></svg><span class="avb-lk-t">Locker</span></button>` +
      (A.Tokens && A.store ? `<button type="button" class="avb-item avb-prize"><span class="avb-tk" aria-hidden="true">🎟</span><span class="avb-pz-t">Prize Counter</span></button>` : '') +
      (opts.changeInstrument ? `<button type="button" class="avb-item avb-inst"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg><span>Change instrument</span></button>` : '') +
      `</div>`;
    const btn = el.querySelector('.avb-btn'), menu = el.querySelector('.avb-menu');
    const open = () => {
      lockerLabel(b);
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); el.classList.add('open');
      if (A.Sfx) A.Sfx.event('ui-toggle');
      setTimeout(() => menu.querySelector('.avb-item').focus(), 0);
      setTimeout(() => { addEventListener('pointerdown', outside, true); addEventListener('keydown', key, true); }, 0);
    };
    const close = (refocus) => {
      if (menu.hidden) return;
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); el.classList.remove('open');
      removeEventListener('pointerdown', outside, true); removeEventListener('keydown', key, true);
      if (refocus) btn.focus({preventScroll: true});
    };
    const outside = e => { if (!el.contains(e.target)) close(false); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (/^Arrow(Up|Down)$/.test(e.key) && menu.contains(document.activeElement)) {
        e.preventDefault(); e.stopPropagation();
        const items = [...menu.querySelectorAll('.avb-item')], i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
      }
    };
    btn.addEventListener('click', () => (menu.hidden ? open() : close(true)));
    el.querySelector('.avb-edit').addEventListener('click', () => {
      close(false);
      const done = opts.onEdit ? opts.onEdit() : edit({member: opts.member, onClose: () => btn.focus({preventScroll: true})});
      return done;
    });
    el.querySelector('.avb-share').addEventListener('click', () => {      // the avatar code (shared/avatar-code.js)
      close(false);
      if (A.avatarCode) A.avatarCode.share(A.Avatar.get(), {onClose: () => btn.focus({preventScroll: true})});
    });
    el.querySelector('.avb-locker').addEventListener('click', () => {    // THE LOCKER, over this page (shared/locker.js)
      close(false);
      openLocker({member: opts.member || (A.store && A.store.player) || undefined, onClose: () => { btn.focus({preventScroll: true}); draw(b); }});
    });
    const pz = el.querySelector('.avb-prize');                         // THE PRIZE COUNTER (shared/prizes.js): here, or on the floor
    if (pz) pz.addEventListener('click', () => {
      close(false);
      if (A.Prizes) { A.Prizes.open({onClose: () => btn.focus({preventScroll: true})}); return; }
      const href = A.linkTo((A.ROOT || '../') + 'index.html', {prizes: ''});
      if (A.Sfx && A.Sfx.playThenGo) A.Sfx.playThenGo('ui-toggle', href); else location.href = href;
    });
    const inst = el.querySelector('.avb-inst');
    if (inst) inst.addEventListener('click', () => {
      close(false);
      const c = opts.changeInstrument;
      if (typeof c === 'function') c();
      else if (A.Sfx && A.Sfx.playThenGo) A.Sfx.playThenGo('ui-toggle', c); else location.href = c;
    });
    b.render = () => draw(b);
    b.close = close;
    badges.add(b);
    draw(b);
    upgradeNote(b);
    return b;
  }
  /** the one-time "Your name got an upgrade!" note under the badge */
  function upgradeNote(b) {
    if (!A.Avatar || !A.Avatar.nameNote || !A.store.avatar) return;
    A.Avatar.get();                                             // (reading it runs the migration)
    if (!A.Avatar.nameNote.pending() || document.querySelector('.avb-up')) return;
    A.Avatar.nameNote.seen();
    const n = document.createElement('div');
    n.className = 'avb-up'; n.setAttribute('role', 'status');
    n.innerHTML = `<button type="button" class="avb-up-go">${esc(A.Avatar.nameNote.TEXT)}</button><button type="button" class="avb-up-x" aria-label="Close">×</button>`;
    b.el.appendChild(n);
    n.querySelector('.avb-up-x').addEventListener('click', e => { e.stopPropagation(); n.remove(); });
    n.querySelector('.avb-up-go').addEventListener('click', e => {
      e.stopPropagation(); n.remove();
      if (b.opts.onEdit) b.opts.onEdit(); else edit({member: b.opts.member, tab: 'name', onClose: () => b.el.querySelector('.avb-btn').focus({preventScroll: true})});
    });
  }
  function draw(b) {
    const {el, opts} = b, btn = el.querySelector('.avb-btn');
    if (!btn) return;
    const has = !!(A.store && A.store.avatar) && A.Avatar && A.avatarHTML;
    const name = has ? A.Avatar.nameOf(A.Avatar.get()) : '';
    const inst = typeof opts.instLabel === 'function' ? opts.instLabel() : opts.instLabel || '';
    btn.innerHTML = `<span class="avb-pic" aria-hidden="true">${has ? A.avatarHTML({size: 'chip', member: opts.member || undefined, label: ''}) : SILHOUETTE}</span>` +
      `<span class="avb-txt"><b class="avb-name">${esc(has ? name : 'Create avatar')}</b>${inst ? `<small class="avb-sub">${esc(inst)}</small>` : ''}</span>${PENCIL}` +
      (newCount(opts) ? '<i class="avb-dot" aria-hidden="true"></i>' : '');
    const n = newCount(opts);
    btn.setAttribute('aria-label', (has ? `Your player, ${name}${inst ? ', playing ' + inst : ''}. Edit avatar, open the Locker${opts.changeInstrument ? ' or change instrument' : ''}` : 'Create your avatar') +
      (n ? `. ${n} new item${n === 1 ? '' : 's'} in your Locker` : ''));
    lockerLabel(b);
  }
  const newCount = opts => { try { return fresh(opts.member || (A.store && A.store.player)).length; } catch (e) { return 0; } };
  /** the menu's "Locker · 12 of 58" (+ "· 2 NEW") and "🎟 142 tokens · Prize counter" */
  function lockerLabel(b) {
    const pz = b.el.querySelector('.avb-pz-t');
    if (pz) { let n = 0; try { n = A.Tokens.balance(); } catch (e) { /* no wallet on this page */ } pz.innerHTML = `${n} tokens <small class="avb-lk-n">· Prize Counter</small>`; }
    const t = b.el.querySelector('.avb-lk-t'); if (!t) return;
    let c = {have: 0, total: 0}, n = 0;
    try { c = count(b.opts.member); n = newCount(b.opts); } catch (e) { /* no avatar parts on this page */ }
    t.innerHTML = `Locker <small class="avb-lk-n">· ${c.have} of ${c.total}</small>${n ? ` <b class="avb-lk-new">${n} new</b>` : ''}`;
  }
  // a saved avatar (the creator's DONE): every badge on the page redraws
  addEventListener('arcade:avatar', () => badges.forEach(b => { if (b.el.isConnected) b.render(); else badges.delete(b); }));
  // the Locker opened (the NEW dot clears) or something was just unlocked (a results screen): redraw
  addEventListener('arcade:locker', () => badges.forEach(b => { if (b.el.isConnected) b.render(); else badges.delete(b); }));

  A.AvatarBadge = {mount, edit, load};
})(window.Arcade);
