/* SEASONAL EVENTS in the arcade LOBBY (shared/seasons.js has the calendar and the rules; lobby.js calls render()).
   While an event runs:
     THE BANNER: a small themed button above the lobby cards ("🎃 SPOOKY SEASON: 6 days left!", "FREE GIFT!" while
       the gift waits) that opens THE EVENT PANEL: the free gift (with its CLAIM button), the challenge ladder with
       progress bars, and a preview of every item on the student's own avatar. A claimed or earned item gets the
       arcade's usual UNLOCKED! card (Skins.catchUp: WEAR IT) and the event's jingle.
     THE LOOK: the whole menu backdrop is season-look.js (Arcade.SeasonLook); here only the small touch on each sign
       (`.lobby[data-deco]`: snow on top, a flower…), shown with the look. The panel's SEASONAL LOOK switch is the same
       setting as the Settings panel's (Arcade.Seasons.lookOn / setLookOn; it replaced the old DECORATIONS switch).
   ?season=<id> previews any event today (nothing saved), see seasons.js.
     Arcade.SeasonLobby.render(lobbyEl)   draw or remove the banner (+ the signs' touch)
     Arcade.SeasonLobby.open()            the event panel
     Arcade.SeasonLobby.state()           tests: {event, preview, daysLeft, gift, claimed, steps, deco, banner, open, left} */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const S = () => A.Seasons;
  const decoOn = () => S().lookOn() || S().preview;
  const still = () => (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches || A.store.gameData('bg').motion === false;
  const leftText = o => S().leftText(o);
  const evStyle = ev => `--ev:var(--${ev.colors[0]});--ev-hi:var(--${ev.colors[0]}-hi);--ev2:var(--${ev.colors[1]});--ev2-hi:var(--${ev.colors[1]}-hi)`;

  /* ---------- the banner ---------- */
  function render(lobby) {
    lobby = lobby || document.getElementById('lobby');
    if (!lobby || !S()) return;
    lobby.querySelectorAll('.ev-banner-row').forEach(el => el.remove());
    const o = S().active();
    lobby.dataset.deco = o && decoOn() ? (o.ev.deco || '') : '';
    lobby.classList.toggle('ev-still', still());
    if (!o) return;
    if (!o.preview) S().check();                               // a step finished on a game page without a card: earned now
    const ev = o.ev, wait = ev.gift && !S().claimed(o), ready = S().steps(o).filter(s => s.done).length;
    const row = document.createElement('div');
    row.className = 'ev-banner-row';
    row.innerHTML = `<button type="button" class="ev-banner" style="${evStyle(ev)}" aria-haspopup="dialog">` +
      `<span class="ev-emoji" aria-hidden="true">${ev.emoji || '★'}</span>` +
      (ev.countdown ? '' : `<span class="ev-name">${esc(ev.name)}:</span> `) + `<span class="ev-left">${esc(leftText(o))}</span>` +
      (wait ? `<span class="ev-gift">Free gift!</span>` : ready ? `<span class="ev-count">${ready} of ${ev.ladder.length}</span>` : '') +
      (o.preview ? `<span class="ev-pv">Preview</span>` : '') + `</button>`;
    const cards = document.getElementById('lobbyCards');
    lobby.insertBefore(row, cards || lobby.firstChild);
    row.firstChild.addEventListener('click', () => { jingle(ev); open(); });
  }
  function jingle(ev) { if (A.Sfx && ev.jingle) A.Sfx.event(ev.jingle); }

  /* ---------- the event panel ---------- */
  function itemPreview(key, locked) {
    const [field, id] = key.split(':'), part = S().partOf(key);
    let pic;
    if (field === 'plate') {
      const av = Object.assign(A.Avatar.get(), {plate: id});
      pic = `<span class="ev-plate"><b class="av-plate av-plate-${esc(id)}">${esc(A.Avatar.nameOf(av))}</b></span>`;
    } else {
      const av = Object.assign(A.Avatar.get(), {[field]: id});
      if (field === 'shoes') av.chair = false;
      pic = field === 'shoes' ? spritePic(av) : A.avatarHTML({size: 'tile', avatar: av, cls: 'ev-av'});
    }
    return `<span class="ev-pic${locked ? ' locked' : ''}">${pic}${locked ? '<span class="ev-lock" aria-hidden="true">🔒</span>' : ''}</span>` +
      `<span class="ev-iname">${esc(part ? part.name : key)}</span>`;
  }
  // shoes don't show on the portrait: the full-body sprite, standing
  function spritePic(av) {
    const Sp = A.Avatar.sprites && A.Avatar.sprites(A.store.player || 'trumpet', {avatar: av});
    const c = Sp && Sp['-front'] && Sp['-front'].frames[0];
    let url = ''; try { url = c ? c.toDataURL('image/png') : ''; } catch (e) { url = ''; }
    return url ? `<span class="pt-box pt-box-tile ev-sprite"><img src="${url}" alt="" draggable="false"></span>` : '';
  }
  let ov = null;
  function close() { if (!ov) return; ov.remove(); ov = null; document.removeEventListener('keydown', onKey); if (A.lockScroll) A.lockScroll(false); render(); }
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.sk-catchup')) close(); };
  function open() {
    const o = S() && S().active();
    if (!o) return;
    const fresh = o.preview ? [] : S().check();
    const ev = o.ev, steps = S().steps(o), claimed = S().claimed(o), giftOwned = ev.gift && S().owned(ev.gift);
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'overlay ev-overlay';
      document.body.appendChild(ov);
      document.addEventListener('keydown', onKey);
      if (A.lockScroll) A.lockScroll(true);
      ov.addEventListener('click', e => { if (e.target === ov) close(); });
    }
    const pct = s => Math.round(100 * s.have / s.n), keep = ov.scrollTop;
    ov.innerHTML = `<div class="panel ev-pan" role="dialog" aria-modal="true" aria-labelledby="evTitle" style="${evStyle(ev)}">` +
      `<header class="ev-head"><span class="ev-emoji big" aria-hidden="true">${ev.emoji || '★'}</span><div><h2 id="evTitle">${esc(ev.name)}</h2>` +
      `<p class="ev-when">${esc(S().when(ev))} · ${esc(leftText(o))}${o.preview ? ' · <b>Preview: nothing is saved</b>' : ''}</p></div></header>` +
      (ev.gift ? `<section class="ev-giftbox"><h3>Free gift</h3><div class="ev-item">${itemPreview(ev.gift, !giftOwned)}</div>` +
        (claimed || giftOwned ? `<p class="ev-done">✓ Yours to keep!</p>` : `<button type="button" class="btn btn-primary ev-claim">Claim</button>`) + `</section>` : '') +
      `<section class="ev-ladder"><h3>Challenges</h3><ol>` + steps.map(s =>
        `<li class="ev-step${s.owned ? ' done' : ''}"><div class="ev-item">${s.item ? itemPreview(s.item, !s.owned) : ''}</div>` +
        `<div class="ev-goal"><b>${esc(s.label)}</b><span class="ev-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${s.n}" aria-valuenow="${s.have}" aria-label="${esc(s.label)}">` +
        `<i style="width:${pct(s)}%"></i></span><small>${s.owned ? '✓ Earned: yours to keep!' : `${s.have} of ${s.n}`}</small></div></li>`).join('') + `</ol></section>` +
      `<p class="muted ev-foot">Only what you do during ${esc(ev.name)} counts. Items you earn are yours forever. ${esc(ev.name)} comes back every year!</p>` +
      `<div class="acts"><label class="ev-decot"><input type="checkbox" class="ev-deco-cb"${S().lookOn() ? ' checked' : ''}> Seasonal look</label>` +
      `<button type="button" class="btn btn-secondary ev-close">Close</button></div></div>`;
    ov.querySelector('.ev-close').addEventListener('click', close);
    ov.querySelector('.ev-deco-cb').addEventListener('change', e => { S().setLookOn(e.target.checked); if (A.Sfx) A.Sfx.event('ui-toggle'); render(); });
    const cl = ov.querySelector('.ev-claim');
    if (cl) cl.addEventListener('click', () => {
      if (!S().claim(o)) return;
      jingle(ev);
      open();
      celebrate([ev.gift]);
    });
    (ov.querySelector('.ev-claim') || ov.querySelector('.ev-close')).focus({preventScroll: true});
    ov.scrollTop = keep;
    if (fresh.length) celebrate(fresh);
  }
  /* the arcade's usual UNLOCKED! card (Skins.catchUp: WEAR IT), over the panel */
  function celebrate(keys) {
    if (!A.Skins || !A.Skins.catchUp) return;
    setTimeout(() => A.Skins.catchUp(A.store.player, {only: keys, foot: 'It\'s yours forever: find it in <b>Create Your Player</b> and the <b>LOCKER</b>.',
      onEquip: () => { if (A.Avatar) A.Avatar.redrawAll(); }}), 350);
  }
  function state() {
    const o = S() && S().active();
    return o ? {event: o.ev.id, preview: !!o.preview, daysLeft: o.daysLeft, gift: o.ev.gift, claimed: S().claimed(o), steps: S().steps(o), left: leftText(o), deco: (document.getElementById('lobby') || {}).dataset ? document.getElementById('lobby').dataset.deco : null,
      banner: !!document.querySelector('.ev-banner'), open: !!ov} : {event: null, banner: !!document.querySelector('.ev-banner')};
  }
  A.SeasonLobby = {render, open, close, state};
})(window.Arcade);
