/* Band Arcade: THE AVATAR BADGE, in the top bar of every screen that has one (the floor's lobby, zones, Full Arcade and
   All Games, Choose Your Instrument, every game page through Arcade.mountTopbar), so a student can reach Create Your
   Player from anywhere without losing their place.
     the badge   the student's avatar (the portrait bust), its safe-builder name, the instrument under it, a small pencil;
                 no avatar saved yet: a silhouette and "Create avatar"
     its menu    a small popover with two big buttons: EDIT AVATAR (the creator as an overlay on this very page, so the
                 screen, the selections and the scroll stay exactly as they were) and CHANGE INSTRUMENT (what the chip
                 did before: Choose Your Instrument). Tap outside or Esc closes it; keyboard: Enter opens, focus goes to
                 EDIT AVATAR, Tab/↑/↓ move, Esc returns to the badge
     during play hidden (html.in-play, set by Arcade.Bg.menu: every level, round, match, battle and transmission turns
                 the menu background off, and back on for results), so it can't be tapped by accident
   The creator (shared/avatar-creator.js + avatar.css + the full-body sprite parts in arcade-quest/sprites.js) is
   loaded the first time EDIT AVATAR is used on a page that doesn't already have it.

     Arcade.AvatarBadge.mount(el, {member, instLabel, changeInstrument: href | fn | null})   draws the badge into el
     Arcade.AvatarBadge.edit({member, onClose})   the creator for the device's avatar (loads it first if needed)
     Arcade.AvatarBadge.load()                    a Promise: the creator is ready
   Saving the avatar fires window 'arcade:avatar' ({detail: {guest}}); every badge redraws itself on it. */
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
    loading = (window.QUEST_ART ? Promise.resolve() : script(DIR + '../arcade-quest/sprites.js'))
      .then(() => A.AvatarCreator ? null : script(DIR + 'avatar-creator.js'))
      .catch(e => { loading = null; throw e; });
    return loading;
  }
  /** the creator for the device's own avatar, over this page */
  function edit({member, onClose} = {}) {
    return load().then(() => A.AvatarCreator.open({member, onClose}))
      .catch(e => { if (window.console) console.warn('Band Arcade: the avatar editor could not load', e); });
  }

  /* ---------- the badge ---------- */
  function mount(el, opts = {}) {
    if (!el) return null;
    const b = {el, opts};
    el.classList.add('avb');
    el.innerHTML = `<button type="button" class="avb-btn" aria-haspopup="true" aria-expanded="false"></button>` +
      `<div class="avb-menu" role="group" aria-label="Your player" hidden>` +
      `<button type="button" class="avb-item avb-edit">${PENCIL}<span>Edit avatar</span></button>` +
      (opts.changeInstrument ? `<button type="button" class="avb-item avb-inst"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg><span>Change instrument</span></button>` : '') +
      `</div>`;
    const btn = el.querySelector('.avb-btn'), menu = el.querySelector('.avb-menu');
    const open = () => {
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
    return b;
  }
  function draw(b) {
    const {el, opts} = b, btn = el.querySelector('.avb-btn');
    if (!btn) return;
    const has = !!(A.store && A.store.avatar) && A.Avatar && A.avatarHTML;
    const name = has ? A.Avatar.nameOf(A.Avatar.get()) : '';
    const inst = typeof opts.instLabel === 'function' ? opts.instLabel() : opts.instLabel || '';
    btn.innerHTML = `<span class="avb-pic" aria-hidden="true">${has ? A.avatarHTML({size: 'chip', member: opts.member || undefined, label: ''}) : SILHOUETTE}</span>` +
      `<span class="avb-txt"><b class="avb-name">${esc(has ? name : 'Create avatar')}</b>${inst ? `<small class="avb-sub">${esc(inst)}</small>` : ''}</span>${PENCIL}`;
    btn.setAttribute('aria-label', has ? `Your player, ${name}${inst ? ', playing ' + inst : ''}. Edit avatar${opts.changeInstrument ? ' or change instrument' : ''}` : 'Create your avatar');
  }
  // a saved avatar (the creator's DONE): every badge on the page redraws
  addEventListener('arcade:avatar', () => badges.forEach(b => { if (b.el.isConnected) b.render(); else badges.delete(b); }));

  A.AvatarBadge = {mount, edit, load};
})(window.Arcade);
