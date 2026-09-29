/* SEASONAL EVENTS in the arcade LOBBY (shared/seasons.js has the calendar and the rules; lobby.js calls render()).
   While an event runs:
     THE BANNER: a small themed button above the lobby cards ("🎃 SPOOKY SEASON: 6 days left!", "FREE GIFT!" while
       the gift waits) that opens THE EVENT PANEL: the free gift (with its CLAIM button), the challenge ladder with
       progress bars, and a preview of every item on the student's own avatar. A claimed or earned item gets the
       arcade's usual UNLOCKED! card (Skins.catchUp: WEAR IT) and the event's jingle.
     THE DECORATIONS: a few quiet seasonal touches on the lobby (cobwebs and pumpkins, snow on the signs, hearts,
       music notes, flowers, a summer sun). Nothing flashes; the few that drift stop with reduced motion or the
       MOVING BACKGROUNDS switch off, and the panel's DECORATIONS switch hides them all (gameData('seasons').deco).
   ?season=<id> previews any event today (nothing saved), see seasons.js.
     Arcade.SeasonLobby.render(lobbyEl)   draw or remove the banner + decorations
     Arcade.SeasonLobby.open()            the event panel
     Arcade.SeasonLobby.state()           tests: {event, preview, daysLeft, gift, claimed, steps, deco} */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const S = () => A.Seasons;
  const data = () => A.store.gameData('seasons');
  const decoOn = () => data().deco !== false;
  const still = () => (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches || A.store.gameData('bg').motion === false;
  const leftText = o => o.daysLeft <= 0 ? 'last day!' : o.daysLeft === 1 ? '1 day left!' : `${o.daysLeft} days left!`;
  const evStyle = ev => `--ev:var(--${ev.colors[0]});--ev-hi:var(--${ev.colors[0]}-hi);--ev2:var(--${ev.colors[1]});--ev2-hi:var(--${ev.colors[1]}-hi)`;

  /* ---------- the decorations: small inline pictures (colors from theme tokens in arcade.css) ---------- */
  const SVG = {
    web: '<svg viewBox="0 0 60 60" class="dw"><path d="M0 0L60 0M0 0L0 60M0 0L50 50M0 0L60 24M0 0L24 60"/><path d="M0 13Q9 9 13 0M0 26Q19 19 26 0M0 40Q29 29 40 0M0 54Q40 40 54 0"/></svg>',
    pumpkin: '<svg viewBox="0 0 26 24" class="dp"><path class="st" d="M13 6V1l3-1"/><ellipse class="o" cx="13" cy="14.5" rx="12" ry="9"/><path class="r" d="M9 7Q6 14 9 23M17 7Q20 14 17 23M13 6V23"/><path class="f" d="M7 12l2.5-2.5L12 12ZM14 12l2.5-2.5L19 12ZM8 16q5 4 10 0q-5 2-10 0Z"/></svg>',
    bat: '<svg viewBox="0 0 40 20" class="db"><path d="M20 6c2 0 3 2 3 4 3-4 9-7 17-6-4 2-5 6-4 9-3-2-6-1-8 2-2-2-5-3-8-2-3-1-6 0-8 2-2-3-5-4-8-2 1-3 0-7-4-9 8-1 14 2 17 6 0-2 1-4 3-4Z"/><circle cx="18.5" cy="9" r=".9"/><circle cx="21.5" cy="9" r=".9"/></svg>',
    flake: '<svg viewBox="0 0 20 20" class="dk"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9M10 4l-2-2M10 4l2-2M10 16l-2 2M10 16l2 2"/></svg>',
    heart: '<svg viewBox="0 0 24 22" class="dh"><path d="M12 21C-5 10 4-3 12 5c8-8 17 5 0 16Z"/></svg>',
    note: '<svg viewBox="0 0 20 26" class="dn"><ellipse cx="6" cy="21" rx="5.5" ry="4" transform="rotate(-20 6 21)"/><path d="M10.5 20V2l8 4v5l-8-4"/></svg>',
    flower: '<svg viewBox="0 0 24 24" class="df"><g class="pt"><circle cx="12" cy="5.5" r="5"/><circle cx="18.5" cy="10.3" r="5"/><circle cx="16" cy="18" r="5"/><circle cx="8" cy="18" r="5"/><circle cx="5.5" cy="10.3" r="5"/></g><circle class="c" cx="12" cy="12.5" r="3.6"/></svg>',
    sun: '<svg viewBox="0 0 60 60" class="ds"><circle cx="30" cy="30" r="13"/><path d="M30 4v8M30 48v8M4 30h8M48 30h8M11.6 11.6l5.7 5.7M42.7 42.7l5.7 5.7M11.6 48.4l5.7-5.7M42.7 17.3l5.7-5.7"/></svg>',
    wave: '<svg viewBox="0 0 120 12" preserveAspectRatio="none" class="dv"><path d="M0 8Q10 0 20 8T40 8T60 8T80 8T100 8T120 8"/></svg>',
  };
  // [picture, css position, class]: a handful, around the edges (never over a sign's name or a button)
  const DECO = {
    spooky: [['web', 'left:0;top:0', 'd-web'], ['web', 'right:0;top:0;transform:scaleX(-1)', 'd-web'], ['pumpkin', 'left:1.5%;bottom:4px', 'd-pk'],
      ['pumpkin', 'left:calc(1.5% + 34px);bottom:4px;transform:scale(.75)', 'd-pk'], ['pumpkin', 'right:2%;bottom:4px', 'd-pk'], ['bat', 'right:9%;top:64px', 'd-bat drift']],
    winter: [['flake', 'left:4%;top:12%', 'd-fl fall'], ['flake', 'left:22%;top:30%', 'd-fl fall s2'], ['flake', 'right:6%;top:18%', 'd-fl fall s3'],
      ['flake', 'right:24%;top:42%', 'd-fl fall s2'], ['flake', 'left:48%;top:6%', 'd-fl fall s3']],
    hearts: [['heart', 'left:3%;top:14%', 'd-ht drift'], ['heart', 'right:4%;top:22%;transform:scale(.7)', 'd-ht drift s2'], ['heart', 'left:6%;bottom:6%;transform:scale(.8)', 'd-ht drift s3'],
      ['heart', 'right:7%;bottom:9%', 'd-ht drift']],
    music: [['note', 'left:4%;top:16%', 'd-nt drift'], ['note', 'right:5%;top:20%;transform:scale(.8)', 'd-nt drift s2'], ['note', 'left:7%;bottom:7%;transform:scale(.7)', 'd-nt drift s3'],
      ['note', 'right:8%;bottom:6%', 'd-nt drift']],
    flowers: [['flower', 'left:1.5%;bottom:4px', 'd-fw'], ['flower', 'left:calc(1.5% + 30px);bottom:4px;transform:scale(.7)', 'd-fw'], ['flower', 'right:2%;bottom:4px', 'd-fw'],
      ['flower', 'right:calc(2% + 32px);bottom:4px;transform:scale(.8)', 'd-fw'], ['flower', 'left:4%;top:18%;transform:scale(.7)', 'd-fw drift']],
    summer: [['sun', 'right:1%;top:44px', 'd-sun'], ['wave', 'left:0;right:0;bottom:0', 'd-wave']],
  };
  function decoHTML(kind) {
    return (DECO[kind] || []).map(([pic, pos, cls]) => `<i class="ev-d ${cls}" style="${pos}">${SVG[pic]}</i>`).join('');
  }

  /* ---------- the banner ---------- */
  function render(lobby) {
    lobby = lobby || document.getElementById('lobby');
    if (!lobby || !S()) return;
    lobby.querySelectorAll('.ev-banner-row,.ev-deco').forEach(el => el.remove());
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
      `<span class="ev-name">${esc(ev.name)}:</span> <span class="ev-left">${esc(leftText(o))}</span>` +
      (wait ? `<span class="ev-gift">Free gift!</span>` : ready ? `<span class="ev-count">${ready} of ${ev.ladder.length}</span>` : '') +
      (o.preview ? `<span class="ev-pv">Preview</span>` : '') + `</button>`;
    const cards = document.getElementById('lobbyCards');
    lobby.insertBefore(row, cards || lobby.firstChild);
    row.firstChild.addEventListener('click', () => { jingle(ev); open(); });
    if (decoOn() && ev.deco && DECO[ev.deco]) {
      const d = document.createElement('div');
      d.className = 'ev-deco'; d.setAttribute('aria-hidden', 'true');
      d.innerHTML = decoHTML(ev.deco);
      lobby.appendChild(d);
    }
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
      `<div class="acts"><label class="ev-decot"><input type="checkbox" class="ev-deco-cb"${decoOn() ? ' checked' : ''}> Decorations</label>` +
      `<button type="button" class="btn btn-secondary ev-close">Close</button></div></div>`;
    ov.querySelector('.ev-close').addEventListener('click', close);
    ov.querySelector('.ev-deco-cb').addEventListener('change', e => { data().deco = e.target.checked; A.store.saveGameData('seasons'); if (A.Sfx) A.Sfx.event('ui-toggle'); render(); });
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
    return o ? {event: o.ev.id, preview: !!o.preview, daysLeft: o.daysLeft, gift: o.ev.gift, claimed: S().claimed(o), steps: S().steps(o), deco: (document.getElementById('lobby') || {}).dataset ? document.getElementById('lobby').dataset.deco : null,
      banner: !!document.querySelector('.ev-banner'), open: !!ov} : {event: null, banner: !!document.querySelector('.ev-banner')};
  }
  A.SeasonLobby = {render, open, close, state};
})(window.Arcade);
