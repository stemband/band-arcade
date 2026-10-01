/* Band Arcade: THE PRIZE COUNTER. The arcade's own token counter, styled like the prize counter of an old arcade:
   a pegboard wall with shelves, the priciest prizes hanging up high (like giant stuffed animals), a glass display case
   at the front for the cheap ones, neon PRIZES lettering, warm lights, a little counter bell, TICKET the counter bot,
   the TOKEN COUNTER machine (turn stars in) and the PRIZE OF THE WEEK in a spotlight.
   ONE WALLET, TWO COUNTERS: every number here comes from shared/tokens.js (Arcade.Tokens), which Arcade Quest's Token
   Booth uses too. This file only draws. Charms stay Arcade Quest's; the MANOR COLLECTION sits behind glass here (a
   try-on, no BUY: "Only at the Token Booth in Arcade Quest!").

   SHELVES BY PRICE (the full price): 50–199 the glass case · 200–299 the lower shelves · 300–399 the upper shelves ·
   400+ hanging at the top · the Manor Collection on its own shelf behind glass.
   Each prize = the Locker's own thumbnail (the student's avatar wearing it: LockerUI.picOf) + a paper price tag on a
   string; OWNED once bought; ★ on the wished one.
   TRY-ON: a tap opens a card with the avatar wearing it (the Locker's live preview), the name and price, BUY (yellow;
   disabled "Need 40 more tokens" when short), ☆ WISH, CLOSE. BUY asks first (UI.confirm "Buy the Jetpack for 300
   tokens?"), then the prize is owned (prize-win) and the card offers WEAR IT NOW / KEEP SHOPPING.
   KEYS: arrows move between the prizes (and the spotlight), Enter opens, Esc closes the card, then the counter.
   MOTION: the neon's slow glow, the bulb, the stars dropping into the machine, the tokens in the tray (the season's
   token: candy corns tumble in during Spooky Season) and the balance
   counting up; all still with reduced motion or the MOTION switch (Arcade.reducedMotion / html.no-motion).
   Where it opens: the lobby's PRIZE COUNTER sign (lobby.js), the avatar badge's menu (shared/avatar-badge.js), the 3D
   floor's counter (arcade3d.js + arcade.js), and index.html?prizes (from a game page's badge).
     Arcade.Prizes.open({onClose}) / close() / state()   (loaded by the floor page; styles shared/prizes.css) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const T = () => A.Tokens;
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };
  const still = () => !!((A.reducedMotion && A.reducedMotion.matches) || document.documentElement.classList.contains('no-motion'));
  const member = () => (A.store && A.store.player) || 'trumpet';
  const LINES = ['Welcome to the Prize Counter!', 'Pick anything that fits your tokens!', 'Practice pays off: 5 tokens a star!'];
  const SHELVES = [
    {id: 'hang', title: 'Top prizes', note: '400+ tokens'},
    {id: 'upper', title: 'Upper shelf', note: '300–350 tokens'},
    {id: 'lower', title: 'Lower shelf', note: '200–250 tokens'},
    {id: 'manor', title: 'Manor Collection', note: 'Only at the Token Booth in Arcade Quest!'},
    {id: 'case', title: 'Glass case', note: '50–150 tokens'},
  ];
  const tierOf = it => it.season ? 'season' : it.questOnly ? 'manor' : it.full >= 400 ? 'hang' : it.full >= 300 ? 'upper' : it.full >= 200 ? 'lower' : 'case';
  // THE TOKEN ICON (Arcade.Tokens.iconHTML: the coin, or the running event's picture; sized by prizes.css)
  const coin = () => T().iconHTML();

  /* ---------- TICKET, the counter bot (an original drawing: a boxy robot, a token-slot mouth, one antenna bulb) ---------- */
  const TICKET = `<svg class="pz-bot" viewBox="0 0 100 120" aria-hidden="true">
    <line class="pz-bot-ant" x1="50" y1="6" x2="50" y2="22"/><circle class="pz-bulb" cx="50" cy="7" r="6"/>
    <rect class="pz-bot-head" x="18" y="22" width="64" height="46" rx="9"/>
    <circle class="pz-bot-eye" cx="37" cy="41" r="6"/><circle class="pz-bot-eye" cx="63" cy="41" r="6"/>
    <circle class="pz-bot-shine" cx="39" cy="39" r="2"/><circle class="pz-bot-shine" cx="65" cy="39" r="2"/>
    <rect class="pz-bot-mouth" x="36" y="54" width="28" height="8" rx="4"/><rect class="pz-bot-slot" x="41" y="57" width="18" height="2" rx="1"/>
    <rect class="pz-bot-neck" x="42" y="68" width="16" height="6"/>
    <rect class="pz-bot-body" x="24" y="74" width="52" height="40" rx="7"/>
    <rect class="pz-bot-roll" x="34" y="84" width="32" height="12" rx="3"/><path class="pz-bot-ticket" d="M42 96h16v14l-4-3-4 3-4-3-4 3z"/>
  </svg>`;
  const BELL = `<svg viewBox="0 0 48 40" aria-hidden="true"><rect class="pz-bell-base" x="4" y="32" width="40" height="6" rx="2"/>
    <path class="pz-bell-dome" d="M8 32a16 16 0 0 1 32 0z"/><rect class="pz-bell-knob" x="21" y="9" width="6" height="7" rx="2"/></svg>`;

  /* ---------- the screen ---------- */
  const S = {el: null, card: null, line: 0, onClose: null, counting: 0};
  function markup() {
    if (S.el) return S.el;
    const ov = document.createElement('div');
    ov.className = 'overlay pz-ov'; ov.id = 'prizes'; ov.hidden = true;
    ov.innerHTML = `<div class="panel pz-panel" role="dialog" aria-modal="true" aria-labelledby="pzTitle">
      <header class="pz-head">
        <h2 class="pz-neon" id="pzTitle"><span class="sr">The Prize Counter: </span><span aria-hidden="true">Prizes</span></h2>
        <p class="pz-wallet" aria-live="polite">${coin()}<b id="pzBal">0</b> <span>tokens</span></p>
        <button type="button" class="pz-x" data-act="close" aria-label="Close the Prize Counter">✕</button>
      </header>
      <section class="pz-clerk" aria-label="Ticket, the counter bot">${TICKET}
        <p class="pz-say" id="pzSay" aria-live="polite"></p>
        <button type="button" class="pz-bell" data-act="bell" aria-label="Ring the counter bell">${BELL}</button></section>
      <div class="pz-top">
        <section class="pz-machine" id="pzMachine" aria-labelledby="pzMachT"></section>
        <section class="pz-spot" id="pzSpot" aria-label="Prize of the week"></section>
      </div>
      <div class="pz-wall" id="pzWall"></div>
      <div class="pz-foot">
        <p class="pz-charms">Charms (power-ups for Arcade Quest) are at the Token Booth inside Arcade Quest.</p>
        ${A.BandNinja ? '<button type="button" class="btn btn-secondary btn-small pz-codebtn" data-act="code">Enter a code</button>' : ''}
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => {
      if (e.target === ov) return close();
      const a = e.target.closest('[data-act]');
      if (a) return act(a.dataset.act, a);
      const p = e.target.closest('[data-key]');
      if (p) openCard(p.dataset.key);
    });
    ov.addEventListener('keydown', e => { nav(e); e.stopPropagation(); });   // the floor underneath never sees these keys
    ov.addEventListener('keyup', e => e.stopPropagation());
    S.el = ov;
    return ov;
  }
  function act(what, el) {
    if (what === 'close') return close();
    if (what === 'turn') return turnIn();
    if (what === 'bell') { sfx('ui-toggle'); ring(); say(); return; }
    if (what === 'code') return codePanel();
  }
  function ring() {
    const b = S.el.querySelector('.pz-bell'); if (!b || still()) return;
    b.classList.remove('ding'); void b.offsetWidth; b.classList.add('ding');
  }
  function say(next = true) {
    if (next) S.line = (S.line + 1) % LINES.length;
    const el = S.el.querySelector('#pzSay'); if (el) el.textContent = LINES[S.line];
  }

  /* the TOKEN COUNTER machine: the star sources, "12 new ★ = 60 tokens", TURN IN */
  function machineHTML() {
    const src = T().starSources(), fresh = src.reduce((n, x) => n + x.fresh, 0), R = T().RATE;
    return `<h3 class="pz-mtitle" id="pzMachT">Token Counter</h3>
      <div class="pz-mbox"><div class="pz-mwin"><span class="pz-mstars" aria-hidden="true">${Array.from({length: Math.min(8, Math.max(1, fresh))}, (_, i) => `<i style="--n:${i}">★</i>`).join('')}</span>
        <p class="pz-mline">${fresh ? `<b>${fresh}</b> new ★ = <b>${fresh * R}</b> tokens` : 'Earn stars in any game, then come back!'}</p></div>
        <div class="pz-tray" aria-hidden="true"></div></div>
      ${fresh ? `<button type="button" class="btn btn-primary pz-turn" data-act="turn">Turn in ${fresh} ★</button>` : ''}
      <details class="pz-src"><summary>Where your stars come from</summary><table><tr><th>Where</th><th>Stars</th><th>New</th></tr>` +
      src.map(x => `<tr><td>${esc(x.label)}</td><td>${x.stars}</td><td>${x.fresh}</td></tr>`).join('') + `</table>
        <p class="pz-small">${R} tokens a star. The same tokens as Arcade Quest's Token Booth.</p></details>`;
  }
  function spotHTML() {
    const w = T().weekly();
    if (!w) return '';
    const own = T().owned(w.key), off = Math.round(T().SETTINGS.featuredDiscount * 100);
    return `<p class="pz-spot-sign"><span>Prize of the week</span> · <b>${off} % off</b></p>
      <button type="button" class="pz-nav pz-spot-btn${own ? ' owned' : ''}" data-key="${esc(w.key)}" aria-label="Prize of the week: ${esc(w.item.name)}, ${own ? 'owned' : `${w.price} tokens, was ${w.full}`}">
        <span class="pz-pic">${pic(w.item)}</span><span class="pz-name">${esc(w.item.name)}</span>
        ${own ? '<span class="pz-owned">Owned</span>' : `<span class="pz-price"><s>${w.full}</s> <b>${w.price}</b> tokens</span>`}</button>
      <p class="pz-spot-when">${own ? "You got this week's prize!" : w.daysLeft <= 1 ? 'New prize tomorrow' : `New prize in ${w.daysLeft} days`}</p>`;
  }
  function pic(it) {
    const av = A.Avatar.get();
    if (A.LockerUI && A.LockerUI.picOf) return A.LockerUI.picOf(it.field, it.id, member(), av);
    return A.avatarHTML({size: 'tile', member: member(), avatar: Object.assign({}, av, {[it.field]: it.id}), label: ''});
  }
  function tile(it) {
    const own = T().owned(it.key), p = T().price(it.key), wish = T().wish() === it.key;
    const tag = it.questOnly ? `<span class="pz-tag pz-lock">🔒 ${p.full}<small>Only at the Token Booth in Arcade Quest!</small></span>`
      : `<span class="pz-tag">${p.weekly ? `<s>${p.full}</s> ` : ''}${p.price}</span>`;
    return `<button type="button" class="pz-nav pz-prize pz-t-${tierOf(it)}${own ? ' owned' : ''}${wish ? ' wished' : ''}${p.weekly ? ' weekly' : ''}" data-key="${esc(it.key)}"` +
      ` aria-label="${esc(it.name)}, ${it.questOnly ? 'only at the Token Booth in Arcade Quest' : `${p.price} tokens`}${own ? ', owned' : ''}${wish ? ', your wish' : ''}${p.weekly ? ', prize of the week' : ''}">` +
      `<span class="pz-pic">${pic(it)}</span><span class="pz-name">${esc(it.name)}</span>${own ? '<span class="pz-owned">Owned</span>' : tag}` +
      (wish ? '<span class="pz-wishmark" aria-hidden="true">★</span>' : '') + `</button>`;
  }
  /* THE SEASONAL SHELF (shared/tokens.js seasonal()): during an event, a decorated shelf at the top with its sign
     ("🎃 SPOOKY SEASON SHELF · gone in 12 days!" … "Last day!") and the event's 3 shop items; between events, a small
     "Coming soon: Winter Fest shelf, Dec 1" card with the next event's items as silhouettes. The decorations follow the
     Seasonal look switch (shared/seasons.js lookOn); nothing moves or flashes. */
  const DECO = {spooky: ['🎃', '🕸️', '🦇', '🕸️', '🎃'], winter: ['❄️', '✨', '⛄', '✨', '❄️'], hearts: ['💖', '💗', '💌', '💗', '💖'],
    music: ['🎵', '🎺', '🎶', '🥁', '🎵'], flowers: ['🌸', '🌼', '🌷', '🌼', '🌸'], summer: ['☀️', '🌴', '🍉', '🌴', '☀️']};
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const evStyle = ev => (ev.colors || []).length ? `--ev1:var(--${ev.colors[0]});--ev2:var(--${ev.colors[1] || ev.colors[0]})` : '';
  const lookOn = () => !A.Seasons || A.Seasons.lookOn();
  function seasonHTML() {
    const sea = T().seasonal();
    if (sea) {
      const ev = sea.ev, deco = lookOn() && DECO[ev.deco] ? `<p class="pz-deco" aria-hidden="true">${DECO[ev.deco].map(d => `<span>${d}</span>`).join('')}</p>` : '';
      return `<section class="pz-shelf pz-s-season pz-ev-${esc(ev.id)}" style="${evStyle(ev)}" aria-labelledby="pzS-season">${deco}` +
        `<h3 class="pz-shead pz-season-sign" id="pzS-season"><span aria-hidden="true">${ev.emoji || '★'}</span> ${esc(ev.name)} shelf · <b>${esc(sea.left)}</b></h3>` +
        `<div class="pz-row">${sea.items.slice().sort((a, b) => a.full - b.full).map(tile).join('')}</div></section>`;
    }
    const nx = T().nextSeason();
    if (!nx) return '';
    const sil = it => `<span class="pz-sil" aria-hidden="true">${pic(it)}</span>`;
    return `<section class="pz-soon" style="${evStyle(nx.ev)}" aria-label="Coming soon">` +
      `<p class="pz-soon-t"><span aria-hidden="true">${nx.ev.emoji || '★'}</span> Coming soon: <b>${esc(nx.ev.name)} shelf</b>, ${MON[nx.from.getMonth()]} ${nx.from.getDate()}</p>` +
      `<div class="pz-soon-row">${nx.items.map(sil).join('')}</div></section>`;
  }
  function wallHTML() {
    const items = T().catalog().slice().sort((a, b) => a.full - b.full || a.name.localeCompare(b.name));
    return seasonHTML() + SHELVES.map(sh => {
      const list = items.filter(it => tierOf(it) === sh.id);
      if (!list.length) return '';
      return `<section class="pz-shelf pz-s-${sh.id}" aria-labelledby="pzS-${sh.id}"><h3 class="pz-shead" id="pzS-${sh.id}">${esc(sh.title)} <small>${esc(sh.note)}</small></h3>` +
        `<div class="pz-row">${list.map(tile).join('')}</div></section>`;
    }).join('');
  }
  function fix(root) { root.querySelectorAll('.av-box').forEach(b => { b.dataset.avFixed = '1'; }); }  // try-on pictures: never redrawn as the plain avatar
  function draw() {
    const ov = markup();
    const f = document.activeElement && ov.contains(document.activeElement) ? (document.activeElement.dataset.key || document.activeElement.dataset.act) : null;
    ov.querySelector('#pzBal').textContent = T().balance();
    ov.querySelector('#pzMachine').innerHTML = machineHTML();
    ov.querySelector('#pzSpot').innerHTML = spotHTML();
    ov.querySelector('#pzWall').innerHTML = wallHTML();
    // a light seasonal touch on the rest of the counter (a garland on the glass case), with the Seasonal look on
    const sea = T().seasonal(), panel = ov.querySelector('.pz-panel');
    panel.classList.toggle('pz-touch', !!(sea && lookOn()));
    panel.setAttribute('style', sea ? evStyle(sea.ev) : '');
    fix(ov);
    if (f) { const again = ov.querySelector(`.pz-top [data-key="${f}"], .pz-wall [data-key="${f}"], [data-act="${f}"]`); if (again) again.focus({preventScroll: true}); }
  }

  /* ---------- keys: arrows move between the prizes (and the spotlight) ---------- */
  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  function nav(e) {
    if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key) || S.card) return;
    const cur = e.target.closest && e.target.closest('.pz-nav'); if (!cur) return;
    const all = [...S.el.querySelectorAll('.pz-nav')].filter(visible);
    let next = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') next = all[all.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1)];
    else {
      const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, down = e.key === 'ArrowDown';
      let best = Infinity;
      all.forEach(b => {
        if (b === cur) return;
        const q = b.getBoundingClientRect(), dy = (q.top + q.height / 2) - cy, dx = (q.left + q.width / 2) - cx;
        if (down ? dy < r.height / 3 : dy > -r.height / 3) return;
        const score = Math.abs(dy) + Math.abs(dx) * 2;
        if (score < best) { best = score; next = b; }
      });
    }
    if (next) { e.preventDefault(); next.focus({preventScroll: true}); next.scrollIntoView({block: 'nearest', inline: 'nearest'}); }
  }

  /* ---------- TURN IN: the stars drop into the machine, tokens spill into the tray, the balance counts up ---------- */
  function turnIn() {
    const from = T().balance(), r = T().turnIn();
    if (!r.stars) return;
    sfx('prize-tokens');
    const m = S.el.querySelector('#pzMachine');
    if (!still()) {
      m.classList.add('go');
      const tray = m.querySelector('.pz-tray');
      tray.innerHTML = Array.from({length: Math.min(12, 3 + r.stars)}, (_, i) => T().iconHTML({cls: 'pz-spill', style: `--k:${i}`})).join('');
    }
    const to = T().balance(), bal = S.el.querySelector('#pzBal'), t0 = performance.now(), MS = still() ? 0 : 900;
    const tick = now => {
      const p = MS ? Math.min(1, (now - t0) / MS) : 1;
      bal.textContent = Math.round(from + (to - from) * p);
      if (p < 1) S.counting = requestAnimationFrame(tick);
      else { S.counting = 0; setTimeout(() => { if (S.el && !S.el.hidden) { draw(); focusFirst(); } }, MS ? 700 : 0); }
    };
    cancelAnimationFrame(S.counting);
    S.counting = requestAnimationFrame(tick);
    S.el.querySelector('#pzSay').textContent = `Ka-ching! ${r.stars} ★ = ${r.tokens} tokens.`;
  }

  /* ---------- TRY-ON: the card ---------- */
  function preview(it) {
    const av = Object.assign({}, A.Avatar.get(), {[it.field]: it.id});
    if (it.field === 'shoes' || it.field === 'plate') return `<span class="pz-card-duo">${A.avatarHTML({size: 'big', member: member(), live: true})}${pic(it)}</span>`;
    return A.avatarHTML({size: 'big', member: member(), avatar: av, live: true, label: ''});
  }
  function openCard(key, msg) {
    const it = T().item(key); if (!it) return;
    if (!S.card) {
      S.card = document.createElement('div');
      S.card.className = 'overlay pz-card-ov'; S.card.id = 'pzCard';
      S.card.innerHTML = '<div class="panel pz-card" role="dialog" aria-modal="true" aria-labelledby="pzCardT"></div>';
      document.body.appendChild(S.card);
      S.card.addEventListener('click', e => { if (e.target === S.card) closeCard(); });
      S.card.addEventListener('keydown', e => e.stopPropagation());
      A.UI.layer.open(S.card, {min: 76, trap: true, onEsc: closeCard, focus: false});
    }
    S.card.dataset.key = key;
    drawCard(it, msg);
    sfx('ui-toggle');
  }
  function drawCard(it, msg) {
    const p = T().price(it.key), c = T().canBuy(it.key), own = T().owned(it.key), wish = T().wish() === it.key;
    const worn = A.Avatar.get()[it.field] === it.id, panel = S.card.querySelector('.pz-card');
    const ev = it.season && (A.SEASONS || []).find(e => e.id === it.season);
    const priceLine = ev && !own ? `<p class="pz-card-price">${coin()}<b>${p.price}</b> tokens · ${esc(ev.name)} only${T().seasonal() ? ` · ${esc(T().seasonal().left)}` : ''}</p>` : it.questOnly ? `<p class="pz-card-price">${coin()}${p.full} tokens · <b>Only at the Token Booth in Arcade Quest!</b></p>`
      : `<p class="pz-card-price">${coin()}${p.weekly ? `<s>${p.full}</s> ` : ''}<b>${p.price}</b> tokens${p.weekly ? ' · Prize of the week!' : ''}</p>`;
    let acts;
    if (msg && msg.bought) acts = `${worn ? '' : '<button type="button" class="btn btn-primary" data-c="wear">Wear it now</button>'}<button type="button" class="btn btn-secondary" data-c="close">Keep shopping</button>`;
    else if (own) acts = `${worn ? '' : '<button type="button" class="btn btn-primary" data-c="wear">Wear it</button>'}<button type="button" class="btn btn-secondary" data-c="close">Close</button>`;
    else if (it.questOnly) acts = `<button type="button" class="btn btn-secondary" data-c="wish" aria-pressed="${wish}">${wish ? '★ Your wish' : '☆ Wish'}</button><button type="button" class="btn btn-secondary" data-c="close">Close</button>`;
    else acts = `<button type="button" class="btn btn-primary" data-c="buy"${c.ok ? '' : ' disabled'}>${c.ok ? 'Buy' : esc(c.text)}</button>` +
      `<button type="button" class="btn btn-secondary" data-c="wish" aria-pressed="${wish}">${wish ? '★ Your wish' : '☆ Wish'}</button><button type="button" class="btn btn-secondary" data-c="close">Close</button>`;
    const waiting = !own && !it.questOnly && !c.ok && c.why === 'short' && T().waiting() > 0 ? `<p class="pz-card-note">+${T().waiting()} tokens are waiting at the Token Counter: turn in your new stars!</p>` : '';
    panel.innerHTML = `<div class="pz-card-pic">${preview(it)}</div><h3 class="ui-title" id="pzCardT">${esc(it.name)}</h3>${priceLine}` +
      `<p class="pz-card-msg" aria-live="polite">${msg && msg.text ? esc(msg.text) : own ? 'You own this prize.' : it.questOnly ? 'Try it on here. You can buy it in Ghost Notes Manor.' : 'Try it on!'}</p>${waiting}` +
      `<div class="acts pz-card-acts">${acts}</div>`;
    fix(panel);
    panel.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => cardAct(b.dataset.c, it)));
    const first = panel.querySelector('[data-c]:not([disabled])');
    if (first) first.focus({preventScroll: true});
  }
  async function cardAct(what, it) {
    if (what === 'close') return closeCard();
    if (what === 'wish') {
      T().setWish(T().wish() === it.key ? null : it.key); sfx('ui-toggle');
      draw(); drawCard(it); return;
    }
    if (what === 'wear') {
      const av = A.Avatar.get(); av[it.field] = it.id; A.Avatar.set(av);
      try { dispatchEvent(new CustomEvent('arcade:avatar', {detail: {guest: false}})); } catch (e) { /* old browsers */ }
      sfx('skin-equip'); closeCard(); draw(); return;
    }
    if (what === 'buy') {
      const c = T().canBuy(it.key);
      if (!c.ok) { drawCard(it); return; }
      const yes = await A.UI.confirm({title: 'Buy this prize?', text: esc(`Buy the ${it.name} for ${c.price} tokens?`), yes: 'Buy it', no: 'Not now'});
      if (!yes || !S.card) return;
      const r = T().buy(it.key);
      if (!r.ok) { drawCard(it, {text: r.text}); return; }
      sfx('prize-win');
      draw();
      drawCard(it, {bought: true, text: `The ${it.name} is yours! It's in your Locker forever.`});
    }
  }
  function closeCard() {
    if (!S.card) return;
    const key = S.card.dataset.key, c = S.card;
    S.card = null;
    A.UI.layer.close(c, {restore: false}); c.remove();
    const back = S.el && S.el.querySelector(`.pz-wall [data-key="${key}"]`) || S.el && S.el.querySelector(`[data-key="${key}"]`);
    if (back) back.focus({preventScroll: true});
  }

  /* ---------- ENTER A CODE (Band Ninja belt codes: shared/bandninja.js, the same as Arcade Quest's booth) ---------- */
  function codePanel() {
    const BN = A.BandNinja; if (!BN) return;
    const ov = document.createElement('div');
    ov.className = 'overlay pz-code-ov';
    ov.innerHTML = `<div class="panel pz-code" role="dialog" aria-modal="true" aria-labelledby="pzCodeT"><h3 class="ui-title" id="pzCodeT">Enter a code</h3>
      <label class="pz-small" for="pzCodeIn">A belt code from your Band Ninja page, like ABC-1234. It opens official Band Ninja gear for your player.</label>
      <input id="pzCodeIn" class="pz-codein" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC-XXXX">
      <p class="pz-codemsg" role="alert"></p>
      <div class="acts"><button type="button" class="btn btn-primary" data-c="go">Check</button><button type="button" class="btn btn-secondary" data-c="back">Back</button></div></div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector('input'), msg = ov.querySelector('.pz-codemsg');
    const done = () => { A.UI.layer.close(ov); ov.remove(); };
    const check = () => {
      const r = BN.redeem(inp.value);
      msg.textContent = r.msg; msg.className = 'pz-codemsg ' + (r.ok ? 'good' : 'bad');
      if (!r.ok) { sfx('note-wrong'); return; }
      if (r.again) return;
      const keys = A.Avatar.items().filter(it => it.unlock.bandninja === r.belt || (it.unlock.bandninja === 'all' && BN.hasAll && BN.hasAll())).map(it => it.key);
      inp.value = '';
      if (A.Skins && A.Skins.catchUp) A.Skins.catchUp(A.store.player, {only: keys}); else sfx('item-unlocked');
    };
    ov.querySelector('[data-c=go]').addEventListener('click', check);
    ov.querySelector('[data-c=back]').addEventListener('click', done);
    ov.addEventListener('click', e => { if (e.target === ov) done(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === inp) { e.preventDefault(); check(); } e.stopPropagation(); });
    A.UI.layer.open(ov, {min: 78, trap: true, onEsc: done, focus: inp});
  }

  /* ---------- open / close ---------- */
  function focusFirst() {
    const f = S.el.querySelector('.pz-turn') || S.el.querySelector('.pz-spot-btn') || S.el.querySelector('.pz-prize');
    if (f) f.focus({preventScroll: true});
  }
  function open({onClose} = {}) {
    if (!T() || !A.Avatar || !A.store) return false;
    const ov = markup();
    if (!ov.hidden) return true;
    S.onClose = onClose || null;
    // Ticket's line: the next one each time the counter opens (this browser session)
    try { S.line = (+(sessionStorage.getItem('bandarcade.prize-line') || -1) + 1) % LINES.length; sessionStorage.setItem('bandarcade.prize-line', S.line); } catch (e) { S.line = 0; }
    draw(); say(false);
    ov.hidden = false; ov.scrollTop = 0;
    ov.classList.toggle('pz-still', still());
    A.UI.layer.open(ov, {min: 72, trap: true, onEsc: close, focus: false});
    document.body.classList.add('pz-open');
    if (A.lockScroll) A.lockScroll(true);
    focusFirst();
    sfx('all-games-open');
    setTimeout(() => sfx('prize-hello'), 250);        // Ticket's voice (optional: silent until recorded)
    return true;
  }
  function close() {
    if (!S.el || S.el.hidden) return;
    if (S.card) closeCard();
    cancelAnimationFrame(S.counting); S.counting = 0;
    S.el.hidden = true; S.el.querySelector('#pzMachine').classList.remove('go');
    A.UI.layer.close(S.el);
    document.body.classList.remove('pz-open');
    if (A.lockScroll) A.lockScroll(false);
    sfx('ui-back');
    const cb = S.onClose; S.onClose = null;
    if (cb) cb();
  }
  // the wallet changed somewhere (a purchase, a turn-in): redraw while open
  addEventListener('arcade:tokens', () => { if (S.el && !S.el.hidden && !S.counting) { const k = S.card && S.card.dataset.key; draw(); if (k && S.card && !S.card.contains(document.activeElement)) drawCard(T().item(k)); } });

  function state() {
    const open = !!(S.el && !S.el.hidden), ov = S.el;
    const shelves = {};
    if (ov) ov.querySelectorAll('.pz-shelf').forEach(s => { shelves[s.className.match(/pz-s-(\w+)/)[1]] = [...s.querySelectorAll('.pz-prize')].map(b => b.dataset.key); });
    const w = T() && T().weekly(), sea = T() && T().seasonal(), nx = !sea && T() && T().nextSeason();
    const sign = ov && ov.querySelector('.pz-season-sign'), soon = ov && ov.querySelector('.pz-soon-t');
    return {season: sea ? {event: sea.ev.id, left: sea.left, items: sea.items.map(it => it.key), sign: sign ? sign.textContent.trim() : ''} : null,
      soon: nx ? {event: nx.ev.id, text: soon ? soon.textContent.trim() : '', items: nx.items.map(it => it.key)} : null,
      touch: !!(ov && ov.querySelector('.pz-panel.pz-touch')),
      open, balance: T() ? T().balance() : 0, fresh: T() ? T().freshStars() : 0, weekly: w && w.key, card: S.card ? S.card.dataset.key : null,
      shelves, still: still(), line: ov ? (ov.querySelector('#pzSay') || {}).textContent : '', focus: document.activeElement && (document.activeElement.dataset.key || document.activeElement.dataset.act || document.activeElement.dataset.c || null)};
  }
  A.Prizes = {open, close, state, openCard, closeCard, get isOpen() { return !!(S.el && !S.el.hidden); }};
})(window.Arcade);
