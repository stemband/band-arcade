/* The arcade LOBBY and ALL GAMES: flat HTML and CSS only (no three.js), drawn here; arcade.js decides when they show.
   THE ZONE LOBBY: a dark arcade wall with one neon sign per zone (games.js ZONES: its color, name, tagline, small
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
    }).join('');
    lit = true;
    $('zones').querySelectorAll('.zsign').forEach(b => b.addEventListener('click', () => onZone(A.zoneById(b.dataset.zone))));
    $('lobbyCards').querySelectorAll('.lcard').forEach(b => b.addEventListener('click', () =>
      onGame(A.floorGames().find(g => g.id === b.dataset.game), 'lobby')));
    if (A.SeasonLobby) A.SeasonLobby.render($('lobby'));       // a seasonal event: its banner + decorations (season-lobby.js)
  }

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
