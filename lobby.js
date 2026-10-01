/* The arcade LOBBY and ALL GAMES: flat HTML and CSS only (no three.js), drawn here; arcade.js decides when they show.
   THE ZONE LOBBY: a dark arcade wall with one neon sign per zone (+ the PRIZE COUNTER's sign last: prizeSign()) (games.js ZONES: its color, name, tagline, small
   silhouettes of its cabinets and the student's stars there for the current instrument), and on top a CONTINUE card
   (the last game opened on this device) and the ASSIGNED card (shared/featured.js).
   ALL GAMES: every game once (even one in two zones), as a card: its marquee, name, zone tags, stars, 2P / ASSIGNED,
   and "No instrument needed" (games.js noInstrument). THE FILTER above the cards: the chip "No instrument needed"
   (aria-pressed) shows only those games; remembered for this browser session (sessionStorage bandarcade.noinst).
   The marquee pictures are still frames from shared/marquees.js (Arcade.Marquee.thumb: drawn once, then kept).
   A game that doesn't suit the instrument (games.js fit) stays, dimmed, with its short tag.
     Arcade.Lobby.render({onZone(zone), onGame(game, from)})
     Arcade.Lobby.renderAll({onGame(game, from), focus: gameId})
     Arcade.Lobby.lastGame() / remember(game)   the CONTINUE game (store.gameData('floor').last) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const {$} = A;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const thumb = g => A.Marquee
    ? `<img class="mq-thumb" data-mq-thumb="${esc(A.Marquee.thumbKey(g))}" src="${A.Marquee.thumb(g)}" alt="" draggable="false">`
    : `<span class="mq-thumb mq-none">${esc(g.name)}</span>`;
  const zoneStyle = z => z ? `--z:var(--${z.color});--z-hi:var(--${z.color}-hi);--z-ink:var(--${z.color}-ink)` : '';
  const starsHTML = n => `<span class="star" aria-hidden="true">★</span> <b>${n}</b><span class="sr"> stars</span>`;
  const fitOf = g => A.gameFit(g, A.store.player);
  const twoP = g => g.players === 2;

  /* the CONTINUE game: the last one opened from this page (a game's own record; nothing inside the games changes) */
  const lastGame = () => { const id = (A.store.gameData('floor') || {}).last; return A.floorGames().find(g => g.id === id) || null; };
  function remember(g) {
    const d = A.store.gameData('floor');
    d.last = g.id; d.lastAt = Date.now();
    A.store.saveGameData('floor');
  }

  /* ---------- the lobby ---------- */
  let lit = false;                                          // the signs flicker on once per page load
  function lobbyCard(kind, g, label, note) {
    const f = fitOf(g), z = A.zonesOf(g)[0];
    return `<button type="button" class="lcard lc-${kind}${f.ok ? '' : ' nofit'}" data-game="${esc(g.id)}" style="${zoneStyle(z)}">` +
      `<span class="lc-pic">${thumb(g)}</span>` +
      `<span class="lc-text"><span class="lc-label">${label}</span><span class="lc-name">${esc(g.name)}</span>` +
      (note ? `<span class="lc-note">${esc(note)}</span>` : '') +
      (f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`) + `</span></button>`;
  }
  function render({onZone, onGame}) {
    const cards = [], F = A.featuredGame(), last = lastGame();
    if (last) cards.push(lobbyCard('continue', last, 'Continue', ''));
    if (F) cards.push(lobbyCard('assigned', F, 'Assigned', (A.FEATURED && A.FEATURED.note) || ''));
    $('lobbyCards').innerHTML = cards.join('');
    $('lobbyCards').hidden = !cards.length;
    const zones = A.zoneList(), flicker = !lit && !reduced.matches;
    $('zones').innerHTML = zones.map((z, i) => {
      const games = A.zoneGames(z.id), stars = games.reduce((n, g) => n + A.gameStars(g), 0);
      const assigned = F && games.includes(F);
      return `<button type="button" class="zsign${flicker ? ' flick' : ''}" data-zone="${esc(z.id)}" style="${zoneStyle(z)};--i:${i}" ` +
        `aria-label="${esc(z.name)}: ${games.map(g => esc(g.name)).join(', ')}. ${stars} stars.">` +
        `<span class="zs-name">${esc(z.name)}</span>` +
        `<span class="zs-tag">${esc(z.tagline || '')}</span>` +
        `<span class="zs-cabs" aria-hidden="true">${games.map(g => A.cabSilhouetteSVG(g)).join('')}</span>` +
        `<span class="zs-foot"><span class="zs-stars">${starsHTML(stars)}</span><span class="zs-count">${games.length} ${games.length === 1 ? 'game' : 'games'}</span>` +
        (assigned ? `<span class="badge b-assigned">Assigned</span>` : '') + `</span></button>`;
    }).join('') + prizeSign(zones.length, flicker);
    lit = true;
    $('zones').querySelectorAll('.zsign[data-zone]').forEach(b => b.addEventListener('click', () => onZone(A.zoneById(b.dataset.zone))));
    wirePrize();
    $('lobbyCards').querySelectorAll('.lcard').forEach(b => b.addEventListener('click', () =>
      onGame(A.floorGames().find(g => g.id === b.dataset.game), 'lobby')));
    if (A.SeasonLobby) A.SeasonLobby.render($('lobby'));       // a seasonal event: its banner + decorations (season-lobby.js)
  }

  /* ---------- THE PRIZE COUNTER's sign (shared/prizes.js; the wallet: shared/tokens.js): the last sign, the same size
     and style as the zones' (it flickers on with them), with the token balance and the WISH bar: "Wish: Jetpack ·
     180 / 300", a lighter part for the stars not turned in yet ("+60 waiting at the counter"), and "You can get your
     wish! 🎟" (a gentle pulse; none with reduced motion) once it's affordable. ---------- */
  function prizeSign(i, flicker) {
    if (!A.Tokens || !A.Prizes || !A.store) return '';
    const T = A.Tokens, bal = T.balance(), fresh = T.freshStars(), w = T.wishProgress();
    let wish = '', say = '';
    if (w && w.owned) { wish = `<span class="zs-wish"><span class="zs-wish-t">Wish: ${esc(w.name)} · yours!</span></span>`; say = ` Your wish, the ${w.name}, is yours.`; }
    else if (w) {
      const ready = w.affordable;
      wish = `<span class="zs-wish${ready ? ' ready' : ''}"><span class="zs-wish-t">Wish: ${esc(w.name)} · ${Math.min(w.have, w.price)} / ${w.price}</span>` +
        `<span class="zs-bar" aria-hidden="true"><i class="zs-have" style="width:${w.pct.toFixed(1)}%"></i><i class="zs-wait" style="width:${w.pctWaiting.toFixed(1)}%"></i></span>` +
        (w.season && w.left ? `<span class="zs-wish-left">${esc(w.left)}</span>` : '') +
        (ready ? `<span class="zs-wish-go">${w.questOnly ? 'Get it at the Token Booth in Arcade Quest!' : 'You can get your wish! 🎟'}</span>` : w.waiting ? `<span class="zs-wish-w">+${w.waiting} waiting at the counter</span>` : '') + `</span>`;
      say = (ready ? ` You can get your wish, the ${w.name}!` : ` Wish: ${w.name}, ${Math.min(w.have, w.price)} of ${w.price} tokens${w.waiting ? `, plus ${w.waiting} waiting at the counter` : ''}.`) + (w.season && w.left ? ` ${w.name}: ${w.left}` : '');
    }
    if (!w) { const g = T.wishGone(); if (g) { wish = `<span class="zs-wish"><span class="zs-wish-t">${esc(g.text)}</span></span>`; say = ' ' + g.text; } }
    return `<button type="button" class="zsign zs-prize${flicker ? ' flick' : ''}" id="prizeSign" style="--z:var(--amber);--z-hi:var(--amber-hi);--z-ink:var(--amber-ink);--i:${i}" ` +
      `aria-label="Prize Counter: ${bal} tokens${fresh ? `, ${fresh} new stars to turn in` : ''}.${esc(say)}">` +
      `<span class="zs-name">Prize Counter</span><span class="zs-tag">Turn your stars into prizes</span>` +
      `<span class="zs-bal"><i class="pz-coin" aria-hidden="true"></i><b>${bal}</b> tokens${fresh ? ` <small>· ${fresh} new ★ to turn in</small>` : ''}</span>${wish}</button>`;
  }
  function wirePrize() {
    const b = $('prizeSign');
    if (b) b.addEventListener('click', () => { if (A.Prizes) A.Prizes.open({onClose: () => { const s = $('prizeSign'); if (s) s.focus({preventScroll: true}); }}); });
  }
  // the wallet or the wish changed: redraw the sign (no flicker)
  addEventListener('arcade:tokens', () => {
    const b = $('prizeSign'); if (!b) return;
    const f = document.activeElement === b, w = document.createElement('div');
    w.innerHTML = prizeSign(+b.style.getPropertyValue('--i') || 0, false);
    if (!w.firstChild) return;
    b.replaceWith(w.firstChild); wirePrize();
    if (f) $('prizeSign').focus({preventScroll: true});
  });

  /* ---------- ALL GAMES ---------- */
  const NI_KEY = 'bandarcade.noinst';
  const niOn = () => { try { return sessionStorage.getItem(NI_KEY) === '1'; } catch (e) { return false; } };
  function renderAll({onGame, focus}) {
    const F = A.featuredGame(), only = niOn();
    const chip = $('niFilter');
    if (chip) {
      chip.setAttribute('aria-pressed', String(only));
      chip.onclick = () => {
        try { sessionStorage.setItem(NI_KEY, niOn() ? '0' : '1'); } catch (e) { /* private mode: still toggles below */ }
        if (A.Sfx) A.Sfx.event('ui-toggle');
        renderAll({onGame, focus: null});
        chip.focus({preventScroll: true});
      };
    }
    const games = A.floorGames().filter(g => !only || g.noInstrument);
    const count = $('allCount');
    if (count) count.textContent = only ? `${games.length} game${games.length === 1 ? '' : 's'} you can play without your instrument` : '';
    $('allGrid').innerHTML = games.map(g => {
      const f = fitOf(g), zones = A.zonesOf(g);
      const foot = g.maxStars ? `<span class="gc-stars">${starsHTML(A.gameStars(g))}</span>`
        : `<span class="gc-sum">${esc((g.summary && g.summary(A.store)) || 'No stars: just play!')}</span>`;
      return `<button type="button" class="gcard${f.ok ? '' : ' nofit'}" data-game="${esc(g.id)}" style="${zoneStyle(zones[0])}" ` +
        `aria-label="${esc(g.name)}${twoP(g) ? ', 2 players' : ''}${F === g ? ', assigned' : ''}${g.noInstrument ? ', no instrument needed' : ''}${f.ok ? '' : ', ' + esc(f.tag)}">` +
        `<span class="gc-pic">${thumb(g)}</span>` +               // the marquee alone: badges never cover its title
        `<span class="gc-body"><span class="gc-head"><span class="gc-name">${esc(g.name)}</span><span class="gc-badges">` +
        (F === g ? `<span class="badge b-assigned">Assigned</span>` : '') + (twoP(g) ? `<span class="badge b-2p">2P</span>` : '') + `</span></span><span class="gc-skill">${esc(g.skill || '')}</span>` +
        `<span class="gc-zones">${zones.map(z => `<span class="ztag" style="${zoneStyle(z)}">${esc(z.name)}</span>`).join('')}` +
        (g.noInstrument ? `<span class="ni-tag">No instrument needed</span>` : '') + `</span>` +
        `<span class="gc-foot">${foot}${f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`}</span></span></button>`;
    }).join('');
    $('allGrid').querySelectorAll('.gcard').forEach(b => b.addEventListener('click', () =>
      onGame(A.floorGames().find(g => g.id === b.dataset.game), 'all')));
    const f = focus && $('allGrid').querySelector(`.gcard[data-game="${focus}"]`);
    if (f) { f.scrollIntoView({block: 'center'}); f.focus({preventScroll: true}); }
  }

  A.Lobby = {render, renderAll, lastGame, remember, thumb, zoneStyle};
})(window.Arcade);
