/* Arcade home page: the arcade floor. Students pick a GAME here (no instruments on this page).
   A carousel of cabinets: arrows, swipe, ←/→ keys, the indicator lights, or a tap on a side cabinet
   turn a cabinet to the front. START opens SELECT YOUR PLAYER as a view on this same page (select-player/player.js;
   URL index.html?game=<id>, the browser's Back button returns to the carousel), so the audio the student unlocked
   here stays unlocked and the select music starts at once. A game with its own fixed player (Chime Heist, Ancient
   Ninja Scrolls) goes straight to its page.
   PRESS START: the first time the floor opens in a visit (sessionStorage), a full-screen attract screen; any tap,
   click or key dismisses it, and that same gesture unlocks the audio. ?demo&nostart skips it.
   Sound (shared/sfx.js): wheel-left / wheel-right when the aisle turns, cabinet-focus when it stops, select-<game id>
   on START, and, through the music manager, the lobby ambience here / the select music in the select view.

   Two ways to draw the cabinets ("views"), one set of controls:
     3D   arcade3d.js + shared/vendor/three.min.js (loaded here only when WebGL works)
     2D   the CSS/SVG cabinets from shared/cabinets.js. Used when ?flat is in the URL, when WebGL or
          three.js is missing, or when the 3D view gives up because the device is too slow.
   A view has: place(cur, instant), pick(event) -> ring offset of a tapped side cabinet (or null),
   startLink (the real START <a>), destroy(). */
(function (A) {
  "use strict";
  const {$} = A;
  const GAMES = A.GAMES, N = GAMES.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  $('arcadeName').innerHTML = A.ARCADE_NAME.replace(/ (\S+)$/, ' <span>$1</span>');
  $('arcadeTagline').textContent = A.ARCADE_TAGLINE;
  document.title = A.ARCADE_NAME;
  $('demoNote').hidden = !A.DEMO;
  A.Sfx.mountControls($('soundCtl'));
  if (A.Backup) A.Backup.button($('soundCtl').querySelector('.snd-pop'), 'snd-backup');   // shared/backup.js: BACKUP / RESTORE
  A.Sfx.use('floor');                                   // the floor's sounds (and every game's select-<id>) load after the first tap
  A.Sfx.mountControls($('spSound'));                     // the select view's own speaker button (same settings)

  /* ---------- PRESS START (first visit only; the gesture that dismisses it also unlocks the audio) ---------- */
  const VISIT = 'bandarcade.visit', ps = $('pressStart');
  let visited = false;
  try { visited = sessionStorage.getItem(VISIT) === '1'; } catch (e) { /* private mode: show it */ }
  const pressStart = () => !ps.hidden;
  if (!visited && !(A.DEMO && A.params.has('nostart'))) {
    $('psName').innerHTML = $('arcadeName').innerHTML;
    $('psHint').textContent = matchMedia('(pointer: coarse)').matches ? 'Tap anywhere' : 'Press any key';
    ps.hidden = false; ps.focus();
    const dismiss = e => {
      if (ps.classList.contains('go')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta|Tab)$/.test(e.key)) return;
      e.preventDefault(); e.stopImmediatePropagation();       // the key or tap only starts the arcade, nothing else
      try { sessionStorage.setItem(VISIT, '1'); } catch (x) { /* fine */ }
      A.Sfx.play('coin');                                      // shared/sfx.js unlocked the audio a moment ago (same gesture)
      ps.classList.add('go');
      // it stays on top a moment longer, so the click that follows this tap can't press a cabinet's START
      setTimeout(() => {
        ps.hidden = true; ps.classList.remove('go');
        ['pointerdown', 'keydown', 'click'].forEach(t => removeEventListener(t, dismiss, true));
        const f = A.SelectView.isOpen ? null : view && view.startLink; if (f) f.focus({preventScroll: true});
      }, 320);
    };
    ['pointerdown', 'keydown', 'click'].forEach(t => addEventListener(t, dismiss, true));
  }
  if (!N) return;

  /* The ring of cabinets. With fewer than 5 games the list repeats (only visually) so both
     sides of the aisle always have a neighbor. ring[r] is GAMES[r % N]. */
  const M = N >= 5 ? N : N * Math.ceil(5 / N);
  const ring = Array.from({length: M}, (_, r) => GAMES[r % N]);
  const aisle = $('aisle');
  const wrap = d => { d = ((d % M) + M) % M; return d > M / 2 ? d - M : d; };   // ring offset, −M/2 < d ≤ M/2
  let cur = Math.max(0, GAMES.findIndex(g => '#' + g.id === location.hash));
  let view = null;

  /* ---------- the 2D view: CSS 3D-transformed HTML cabinets ---------- */
  function make2D() {
    aisle.classList.remove('is-3d', 'loading-3d');
    aisle.innerHTML = ring.map((g, r) =>
      `<div class="slot" data-r="${r}">${A.cabinetHTML(g, {href: A.startLink(g, '')})}</div>`).join('');
    const slots = [...aisle.querySelectorAll('.slot')];
    if (A.Marquee) A.Marquee.hydrate(aisle);                  // the marquees' still frames (shared/marquees.js)
    return {
      kind: '2d',
      get startLink() { return slots[cur].querySelector('.cab-start'); },
      place(c) {
        slots.forEach((el, r) => {
          let d = Math.max(-3, Math.min(3, wrap(r - c)));
          const prev = el.dataset.d === undefined ? d : +el.dataset.d;
          el.classList.toggle('jump', Math.abs(d - prev) > 1);   // wrapping from one end of the aisle to the other: no fly-across
          el.dataset.d = d;
          el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
          el.querySelector('.cab-start').tabIndex = d === 0 ? 0 : -1;
        });
        A.setAttract(slots[c].querySelector('.cab'), ring[c]);
      },
      pick(e) {
        const slot = e.target.closest('.slot');
        return slot ? +slot.dataset.d : null;
      },
      destroy() { A.setAttract(null); slots.forEach(el => el.remove()); },
    };
  }

  function useView(v) {
    const hadFocus = aisle.contains(document.activeElement);
    if (view) view.destroy();
    view = v;
    aisle.dataset.view = v.kind;
    place(true);
    if (hadFocus) view.startLink.focus({preventScroll: true});
  }

  $('lights').innerHTML = GAMES.map((g, i) =>
    `<button class="light" data-i="${i}" aria-label="${g.name}"><i></i></button>`).join('');
  const lights = [...$('lights').querySelectorAll('.light')];

  function place(instant) {
    const hadFocus = aisle.contains(document.activeElement);
    view.place(cur, instant || reduced.matches);
    const g = ring[cur];
    if (hadFocus) view.startLink.focus({preventScroll: true});
    if (reduced.matches && !instant) { aisle.classList.remove('fade'); void aisle.offsetWidth; aisle.classList.add('fade'); }

    $('infoSkill').textContent = g.skill || '';
    $('infoName').textContent = g.name;
    $('infoBlurb').textContent = g.blurb || '';
    // a game with its own instrument (games.js `player`, e.g. Chime Heist's bell kit) always shows its score
    // player 'all' (a game that needs no instrument, e.g. Ancient Ninja Scrolls) saves under that id
    const inst = g.player ? (A.getInstrument(g.player) || {id: g.player, shortName: ''}) : A.currentInstrument(), hs = $('hiscore');
    // the saved player (an instrument member) names the line; games.js `byMember` (Button Masher) saves under it
    const member = !g.player && inst ? A.currentMember() : null;
    const pid = g.byMember ? (member && member.id) : inst && inst.id;
    // games.js `noPlay`: an instrument the game can't use (percussion in Button Masher) gets a link to a game it can
    let np = g.noPlay, redirect = np && inst && ((np.groups || []).includes(inst.id) || (member && (np.members || []).includes(member.id)));
    // an unpitched player (the Snare Drum) on a game that needs pitch: a link to Showtime Malfunction instead
    if (!redirect && !g.player && !g.unpitched && inst && inst.pitched === false) { np = {label: 'Snare drummers: try Showtime Malfunction!', game: 'showtime-malfunction'}; redirect = true; }
    hs.hidden = !(inst && g.maxStars && (pid || redirect));
    // games.js `summary(store)`: a game with its own kind of progress (Arcade Quest) gives its own line
    const sum = !redirect && g.summary ? g.summary(A.store) : '';
    if (sum) { hs.hidden = false; hs.textContent = sum; }
    else if (redirect) {
      const to = GAMES.find(x => x.id === np.game);
      hs.innerHTML = to ? `<a class="np-link" href="${A.startLink(to, '')}">${np.label}</a>` : np.label;
    } else if (!hs.hidden) {
      // the ALL-MODES total (Arcade.store.allStars): every NOTES × ORDER combination (games.js `noteModes`), or the game's one key
      const total = A.store.allStars(member ? member.id : pid, g.id), who = g.playerName || (member ? member.short : inst.shortName);
      hs.innerHTML = `<b>Hi-score:</b> ${total}${g.noteModes ? '' : ' / ' + g.maxStars} <span class="star" aria-hidden="true">★</span><span class="sr">stars</span>` +
        (g.noteModes ? ' all modes' : '') + (who ? ` <span class="who">(${who})</span>` : '');
      // games.js `badge`: a count of badges the game keeps in store.gameData(id).badges (e.g. "Test Ready: 3 belts")
      if (g.badge) {
        const n = Object.keys(A.store.gameData(g.id).badges || {}).length;
        if (n) hs.innerHTML += `<span class="scales-note">${g.badge.label}: ${n} ${n === 1 ? g.badge.one : g.badge.many}</span>`;
      }
      // how many of the 12 NOTES × ORDER combinations have been played (each saves separately)
      if (g.noteModes && A.progressKeys) {
        const keys = A.progressKeys(g.id), started = keys.filter(k => A.store.hasProgress(k, pid)).length;
        if (started) hs.innerHTML += `<span class="scales-note">Modes played: ${started} of ${keys.length}</span>`;
      }
    }
    lights.forEach((b, i) => b.setAttribute('aria-current', i === cur % N ? 'true' : 'false'));
    if (!g.player) A.Sfx.preloadMusic('select-music-' + g.id);   // this game's own select music (if Mat made one) is ready for START
    // the address says which cabinet is in front (not while Select Player's ?game= address is showing)
    if (!new URLSearchParams(location.search).has('game')) { try { history.replaceState(null, '', '#' + g.id); } catch (e) { /* some browsers block this on local files */ } }
  }

  /* the turn sound (wheel-left / wheel-right), then a quiet cabinet-focus once the new cabinet is at the front */
  let focusT = 0;
  function turnSound(dir) {
    A.Sfx.event(dir < 0 ? 'wheel-left' : 'wheel-right');
    clearTimeout(focusT); focusT = setTimeout(() => A.Sfx.event('cabinet-focus'), reduced.matches ? 120 : 450);
  }
  const go = step => { cur = ((cur + step) % M + M) % M; place(); turnSound(step); };
  /** turn game i to the front, taking the shortest way round */
  function goTo(i) {
    let best = cur, bestD = Infinity;
    for (let r = i; r < M; r += N) { const d = Math.abs(wrap(r - cur)); if (d < bestD) { bestD = d; best = r; } }
    if (best === cur) return;
    const dir = wrap(best - cur); cur = best; place(); turnSound(dir);
  }

  $('prevBtn').addEventListener('click', () => go(-1));
  $('nextBtn').addEventListener('click', () => go(1));
  lights.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.i)));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || A.SelectView.isOpen || pressStart()) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  /* a tap on a side cabinet turns it to the front (its START does nothing until then) */
  let swiped = false;
  aisle.addEventListener('click', e => {
    if (swiped) { swiped = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!view) return;
    const start = e.target.closest('a');
    if (start && start === view.startLink) {          // START: the game's select-<id> sound, then Select Player (this page)
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) {
        e.preventDefault();
        const g = ring[cur];
        if (g.player) A.Sfx.playThenGo('select-' + g.id, start.href);   // its own fixed player: straight to the game
        else { A.Sfx.event('select-' + g.id); openSelect(g); }
      }
      return;
    }
    const d = view.pick(e);
    if (d) { e.preventDefault(); go(d); }
  }, true);

  /* swipe left/right. touch-action: pan-y (arcade.css) leaves vertical scrolling to the browser. */
  let sx = 0, sy = 0, sid = null;
  aisle.addEventListener('pointerdown', e => { sid = e.pointerId; sx = e.clientX; sy = e.clientY; swiped = false; });
  aisle.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return;
    sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 350); }
  });
  aisle.addEventListener('pointercancel', () => { sid = null; });
  aisle.addEventListener('dragstart', e => e.preventDefault());

  /* ---------- choose a view ---------- */
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  /* ---------- the two views of this page: the carousel and SELECT YOUR PLAYER (index.html?game=<id>) ---------- */
  const SELECT_KEYS = ['game', 'players', 'need'];
  /** this page's address without the select view's parameters (every other flag, like ?demo, stays) */
  function floorURL(gameId) {
    const p = new URLSearchParams(location.search);
    SELECT_KEYS.forEach(k => p.delete(k));
    const q = p.toString().replace(/=(?=&|$)/g, '');
    return location.pathname + (q ? '?' + q : '') + (gameId ? '#' + gameId : '');
  }
  const wanted = () => { const id = new URLSearchParams(location.search).get('game'); return id ? (A.ALL_GAMES || GAMES).find(g => g.id === id) || null : null; };
  /** the lobby's sound through the music manager: the room ambience, no music */
  const floorSound = () => { A.Sfx.setMusic(null); A.Sfx.setAmbience('lobby-ambience', {builtIn: true}); A.Sfx.preloadMusic('select-music'); };
  /** make the page match its address (on load, after START, and on the Back/Forward buttons) */
  function showView() {
    A.params = new URLSearchParams(location.search);
    const g = wanted();
    if (g && g.player) { location.replace(A.startLink(g, '')); return; }        // a game with its own player: no choosing
    if (g) {
      document.body.classList.add('in-select'); A.floorPaused = true;          // the 3D floor stops drawing meanwhile
      if (A.SelectView.game !== g) A.SelectView.open(g, {players: A.params.get('players'), need: A.params.get('need')});
      return;
    }
    if (new URLSearchParams(location.search).has('game')) { try { history.replaceState(null, '', floorURL()); } catch (e) { /* file:// */ } A.params = new URLSearchParams(location.search); }
    const was = A.SelectView.game;
    A.SelectView.close();
    document.body.classList.remove('in-select'); A.floorPaused = false;
    floorSound();
    if (was) faceGame(was.id);
  }
  function openSelect(g) {
    try { history.pushState({select: g.id}, '', A.playerLink(g.id, '')); } catch (e) { location.href = A.playerLink(g.id, ''); return; }
    showView();
  }
  /** turn this game's cabinet to the front, with no turning sound (back from Select Player) */
  function faceGame(id) {
    const i = GAMES.findIndex(g => g.id === id);
    if (i < 0) return;
    let best = cur, bestD = Infinity;
    for (let r = i; r < M; r += N) { const d = Math.abs(wrap(r - cur)); if (d < bestD) { bestD = d; best = r; } }
    cur = best; place(true);
    if (view && view.startLink) view.startLink.focus({preventScroll: true});
  }
  addEventListener('popstate', showView);
  // "← ARCADE" in the select view: back to the carousel (the browser's Back when START opened it, so history stays tidy)
  $('spBack').addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault(); A.Sfx.event('ui-back');
    const g = A.SelectView.game;
    if (history.state && history.state.select) history.back();
    else { try { history.replaceState(null, '', floorURL(g && g.id)); } catch (x) { location.href = floorURL(g && g.id); return; } showView(); }
  });
  // links to another game's Select Player (the snare message's "try Showtime Malfunction") stay on this page too
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('#selectView a[href]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button || a.id === 'spBack') return;
    const u = new URL(a.href, location.href);
    if (u.pathname !== location.pathname || !u.searchParams.get('game')) return;
    const g = (A.ALL_GAMES || GAMES).find(x => x.id === u.searchParams.get('game'));
    if (!g || g.player) return;
    e.preventDefault(); A.Sfx.event('select-' + g.id); openSelect(g);
  });

  useView(make2D());                       // the 2D aisle works right away (and is the fallback)
  showView();                              // ?game=<id> opens straight into Select Player; otherwise the lobby sound
  if (!A.params.has('flat') && hasWebGL() && A.Floor3D) {
    aisle.classList.add('loading-3d');     // hide the 2D cabinets for the moment the 3D ones take to load
    let settled = false;                   // once we fall back to 2D, a late 3D load is thrown away
    const giveUp = () => { settled = true; if (!view || view.kind !== '2d') useView(make2D()); aisle.classList.remove('loading-3d'); };
    const timer = setTimeout(giveUp, 8000);
    loadScript('shared/vendor/three.min.js')
      .then(() => A.Floor3D.create(aisle, {ring, wrap, cur, onGiveUp: giveUp}))
      .then(v => {
        clearTimeout(timer);
        if (settled) { v.destroy(); return; }
        aisle.classList.remove('loading-3d'); useView(v);
      })
      .catch(err => { clearTimeout(timer); if (window.console) console.warn('3D arcade off:', err); giveUp(); });
  }
})(window.Arcade);
