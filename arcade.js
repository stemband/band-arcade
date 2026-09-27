/* Arcade home page (index.html): PRESS START, then the ZONE LOBBY, the ZONES and ALL GAMES, all on this one page (so
   the audio the student unlocked stays unlocked, and the lobby sound never restarts between them).
     PRESS START   the first visit of a browser session: an attract screen; the gesture that dismisses it unlocks the
                   audio, then CHOOSE YOUR INSTRUMENT (Select Player in pick mode, index.html?pick) opens once.
     LOBBY         index.html (no hash): one neon sign per zone, CONTINUE, ASSIGNED (lobby.js draws it)
     A ZONE        index.html#zone=<zone id>[&game=<game id>]: the cabinet carousel with only that zone's cabinets
     ALL GAMES     index.html#all-games: every game as a card (lobby.js)
     FULL ARCADE   index.html#full-arcade[&game=<game id>]: EVERY game's cabinet in one carousel (each once, zone by
                   zone in the lobby's order, then the zone's own order), a zone tag under each cabinet and the QUICK
                   JUMP strip of marquee thumbnails below (a tap spins straight there). It opens on the ASSIGNED game,
                   else the last game played here, else the first. The same carousel as a zone (arcade.js treats it as
                   one: `zone` is FULL).
     SELECT PLAYER index.html?game=<id> (select-player/player.js; a two-player game, or no instrument saved yet)
   Every step is a browser history entry, so Back (and the iPad back-swipe) goes game → zone → lobby, and a zone can be
   linked straight to. A game page's "← ARCADE" comes back as index.html#<game id>: the student returns to the zone
   (or ALL GAMES, or the lobby) they left from (sessionStorage), with that game's cabinet in front.
   Opening a game: a game that doesn't suit the saved instrument (games.js `fit`) explains why, with SWITCH INSTRUMENT;
   a two-player game with its own Select Player (Neon Face-Off), or no instrument saved yet, opens Select Player;
   anything else goes straight to the game with the saved instrument.
   Sound (shared/sfx.js): the lobby ambience through the music manager (the same track everywhere here, never
   restarted); wheel-left / wheel-right / cabinet-focus in a zone, zone-select / zone-enter / zone-back /
   all-games-open, select-<game id> when a game opens.

   Two ways to draw a zone's cabinets ("views"), one set of controls:
     3D   arcade3d.js + shared/vendor/three.min.js, loaded the first time a zone opens (the lobby never needs it).
          Full cabinets only for the front one and its neighbors; setRing() swaps zones and disposes the old ones.
     2D   the CSS/SVG cabinets from shared/cabinets.js. Used with ?flat, when WebGL or three.js is missing, or when
          the 3D view gives up because the device is too slow.
   A view has: place(cur, instant), pick(event) -> ring offset of a tapped side cabinet (or null), startLink (the real
   START <a>), destroy(); the 3D one also setRing(ring, wrap, cur, fade) and refade(fade). */
(function (A) {
  "use strict";
  const {$} = A;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ss = {get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }};

  $('arcadeName').innerHTML = A.ARCADE_NAME.replace(/ (\S+)$/, ' <span>$1</span>');
  $('arcadeTagline').textContent = A.ARCADE_TAGLINE;
  document.title = A.ARCADE_NAME;
  $('demoNote').hidden = !A.DEMO;
  A.Sfx.mountControls($('soundCtl'));
  if (A.Backup) A.Backup.button($('soundCtl').querySelector('.snd-pop'), 'snd-backup');   // shared/backup.js: BACKUP / RESTORE
  A.Sfx.prefer('choose-instrument');                    // the CHOOSE YOUR INSTRUMENT voice line: never late (PRESS START → pick)
  A.Sfx.use('floor');                                   // the floor's sounds (and every game's select-<id>) load after the first tap
  A.Sfx.mountControls($('spSound'));                     // the select view's own speaker button (same settings)
  $('tuneBtn').href = A.linkTo('note-checker/index.html');

  /* ---------- PRESS START (first visit only; the gesture that dismisses it also unlocks the audio) ---------- */
  const VISIT = 'bandarcade.visit', ps = $('pressStart');
  const pressStart = () => !ps.hidden;
  let pickAfterStart = false;
  if (ss.get(VISIT) !== '1' && !(A.DEMO && A.params.has('nostart'))) {
    $('psName').innerHTML = $('arcadeName').innerHTML;
    $('psHint').textContent = matchMedia('(pointer: coarse)').matches ? 'Tap anywhere' : 'Press any key';
    ps.hidden = false; ps.focus();
    pickAfterStart = true;
    const dismiss = e => {
      if (ps.classList.contains('go')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta|Tab)$/.test(e.key)) return;
      e.preventDefault(); e.stopImmediatePropagation();       // the key or tap only starts the arcade, nothing else
      ss.set(VISIT, '1');
      A.Sfx.play('coin');                                      // shared/sfx.js unlocked the audio a moment ago (same gesture)
      ps.classList.add('go');
      // it stays on top a moment longer, so the click that follows this tap can't press anything underneath
      setTimeout(() => {
        ps.hidden = true; ps.classList.remove('go');
        ['pointerdown', 'keydown', 'click'].forEach(t => removeEventListener(t, dismiss, true));
        if (pickAfterStart && !A.SelectView.isOpen) openPick(null);        // then: CHOOSE YOUR INSTRUMENT (CONTINUE AS is one tap)
        else focusView();
      }, 320);
    };
    ['pointerdown', 'keydown', 'click'].forEach(t => addEventListener(t, dismiss, true));
  }

  /* ---------- the carousel: ONE ZONE's cabinets (no repeats; with 1 game, no arrows), or the FULL ARCADE ---------- */
  const FULL = {id: 'full-arcade', name: 'Full Arcade', full: true};
  /** every floor game once, zone by zone (the lobby's order, then each zone's own), then any game in no zone; its zone */
  function fullGames() {
    const list = [], zoneOf = {};
    A.zoneList().forEach(z => A.zoneGames(z.id).forEach(g => { if (!zoneOf[g.id]) { zoneOf[g.id] = z; list.push(g); } }));
    A.floorGames().forEach(g => { if (!list.includes(g)) list.push(g); });
    return {list, zoneOf};
  }
  let fullZoneOf = {};
  const tagOf = g => { const z = fullZoneOf[g.id]; return z ? {text: z.name, color: z.color} : null; };
  const isFull = () => zone === FULL;
  let zone = null, ring = [], N = 0, cur = 0, view = null, v3 = null, loading3D = false;
  let use3D = !A.params.has('flat') && hasWebGL() && !!A.Floor3D;
  const aisle = $('aisle');
  // ring offset, −N/2 < d ≤ N/2. Two cabinets are a straight row instead (no ring): with a ring both would stand on the
  // same side and one would vanish on every turn, so the second is always on the right of the first
  const LINE = () => N === 2;
  const wrap = d => { if (!N) return 0; if (LINE()) return d; d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; };
  const fitOf = g => A.gameFit(g, A.store.player);
  const fade = g => fitOf(g).ok ? 1 : .45;                // a game that doesn't suit this instrument stands dimmed

  /* the 2D view: CSS 3D-transformed HTML cabinets */
  function make2D() {
    aisle.classList.remove('is-3d', 'loading-3d');
    aisle.innerHTML = ring.map((g, r) =>
      `<div class="slot${fitOf(g).ok ? '' : ' nofit'}" data-r="${r}">${A.cabinetHTML(g, {href: gameHref(g)})}${isFull() && tagOf(g) ? zoneTagHTML(g) : ''}</div>`).join('');
    const slots = [...aisle.querySelectorAll('.slot')];
    if (A.Marquee) A.Marquee.hydrate(aisle);                  // the marquees' still frames (shared/marquees.js)
    return {
      kind: '2d',
      get startLink() { return slots[cur] && slots[cur].querySelector('.cab-start'); },
      place(c) {
        slots.forEach((el, r) => {
          let d = Math.max(-3, Math.min(3, wrap(r - c)));
          const prev = el.dataset.d === undefined ? d : +el.dataset.d;
          el.classList.toggle('jump', Math.abs(d - prev) > 1);   // wrapping from one end of the aisle to the other: no fly-across
          el.dataset.d = d;
          el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
          el.querySelector('.cab-start').tabIndex = d === 0 ? 0 : -1;
        });
        if (slots[c]) A.setAttract(slots[c].querySelector('.cab'), ring[c]);
      },
      pick(e) {
        const slot = e.target.closest('.slot');
        return slot ? +slot.dataset.d : null;
      },
      destroy() { A.setAttract(null); slots.forEach(el => el.remove()); },
    };
  }
  const zoneTagHTML = g => { const z = fullZoneOf[g.id]; return `<span class="ztag cab-ztag" style="${A.Lobby.zoneStyle(z)}" aria-hidden="true">${esc(z.name)}</span>`; };
  function useView(v) {
    if (view && view !== v) view.destroy();
    view = v;
    aisle.dataset.view = v.kind;
  }
  /** show this zone's cabinets in the current view (3D keeps its renderer and swaps the cabinets) */
  function showCabinets() {
    if (v3) { v3.setRing(ring, wrap, cur, fade, isFull() ? tagOf : null); useView(v3); }
    else if (use3D) { if (view) { view.destroy(); view = null; } aisle.classList.add('loading-3d'); if (!loading3D) load3D(); }   // 3D on its way: no 2D cabinets to build and throw away
    else useView(make2D());
    place(true);
  }
  /** leaving a zone: the 3D cabinets are disposed (the renderer waits, paused); the 2D ones removed */
  function hideCabinets() {
    if (v3) v3.setRing([], wrap, 0);
    if (view && view !== v3) { view.destroy(); view = null; }
    A.setAttract(null);
  }

  function place(instant) {
    const g = ring[cur];
    if (!g) return;
    if (view) {                                           // (none yet while the 3D view loads: the words still show)
      const hadFocus = aisle.contains(document.activeElement);
      view.place(cur, instant || reduced.matches);
      if (hadFocus && view.startLink) view.startLink.focus({preventScroll: true});
      if (reduced.matches && !instant) { aisle.classList.remove('fade'); void aisle.offsetWidth; aisle.classList.add('fade'); }
    }
    if (view && view.startLink) { view.startLink.href = gameHref(g); view.startLink.classList.toggle('nofit', !fitOf(g).ok); }

    $('infoSkill').textContent = g.skill || '';
    $('infoName').textContent = g.name;
    $('infoBlurb').textContent = g.blurb || '';
    // tags: ASSIGNED (shared/featured.js), 2 players, and the instrument fit (games.js fit)
    const F = A.featuredGame(), f = fitOf(g);
    $('infoTags').innerHTML = (F === g ? `<span class="badge b-assigned">Assigned</span>${A.FEATURED.note ? ` <span class="as-note">${esc(A.FEATURED.note)}</span>` : ''}` : '') +
      (g.players === 2 ? ' <span class="badge b-2p">2 players</span>' : '') + (f.ok ? '' : ` <span class="fit-tag">${esc(f.tag)}</span>`);
    if (isFull() && tagOf(g)) $('infoTags').innerHTML = `<span class="ztag" style="${A.Lobby.zoneStyle(fullZoneOf[g.id])}">${esc(fullZoneOf[g.id].name)}</span> ` + $('infoTags').innerHTML;
    $('aisleFlags').innerHTML = (F === g ? '<span class="badge b-assigned">Assigned</span>' : '') + (f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`);
    hiscore(g);
    lights.forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
    jumps.forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
    if (jumps[cur]) centerJump(jumps[cur], instant);
    $('prevBtn').disabled = LINE() && cur === 0;                     // a straight row: the arrow at an end rests
    $('nextBtn').disabled = LINE() && cur === N - 1;
    // its START sound (and the next cabinets' either side) download before every other sound
    A.Sfx.prefer([g, ring[(cur + 1) % N], ring[(cur - 1 + N) % N]].filter(Boolean).map(x => 'select-' + x.id));
    // the address says which zone and cabinet (Back from a game comes here); the history entry stays the same
    setHash((isFull() ? '#full-arcade' : '#zone=' + zone.id) + '&game=' + g.id, true);
  }
  /** the HI-SCORE line (as on the old floor): stars for the saved instrument, a game's own summary, or a link */
  function hiscore(g) {
    const inst = g.player ? (A.getInstrument(g.player) || {id: g.player, shortName: ''}) : A.currentInstrument(), hs = $('hiscore');
    const member = !g.player && inst ? A.currentMember() : null;
    const pid = g.byMember ? (member && member.id) : inst && inst.id;
    let np = g.noPlay, redirect = np && inst && ((np.groups || []).includes(inst.id) || (member && (np.members || []).includes(member.id)));
    if (!redirect && !g.player && !g.unpitched && inst && inst.pitched === false) { np = {label: 'Snare drummers: try Showtime Malfunction!', game: 'showtime-malfunction'}; redirect = true; }
    hs.hidden = !(inst && g.maxStars && (pid || redirect));
    const sum = !redirect && g.summary ? g.summary(A.store) : '';
    if (sum) { hs.hidden = false; hs.textContent = sum; }
    else if (redirect) {
      const to = A.floorGames().find(x => x.id === np.game);
      hs.innerHTML = to ? `<a class="np-link" href="#" data-open="${to.id}">${np.label}</a>` : np.label;
    } else if (!hs.hidden) {
      const total = A.store.allStars(member ? member.id : pid, g.id), who = g.playerName || (member ? member.short : inst.shortName);
      hs.innerHTML = `<b>Hi-score:</b> ${total}${g.noteModes ? '' : ' / ' + g.maxStars} <span class="star" aria-hidden="true">★</span><span class="sr">stars</span>` +
        (g.noteModes ? ' all modes' : '') + (who ? ` <span class="who">(${esc(who)})</span>` : '');
      if (g.badge) {
        const n = Object.keys(A.store.gameData(g.id).badges || {}).length;
        if (n) hs.innerHTML += `<span class="scales-note">${g.badge.label}: ${n} ${n === 1 ? g.badge.one : g.badge.many}</span>`;
      }
      if (g.noteModes && A.progressKeys) {
        const keys = A.progressKeys(g.id), started = keys.filter(k => A.store.hasProgress(k, pid)).length;
        if (started) hs.innerHTML += `<span class="scales-note">Modes played: ${started} of ${keys.length}</span>`;
      }
    }
  }
  $('hiscore').addEventListener('click', e => {
    const a = e.target.closest('a[data-open]'); if (!a) return;
    e.preventDefault(); openGame(A.floorGames().find(g => g.id === a.dataset.open), 'zone');
  });

  /* the turn sound (wheel-left / wheel-right), then a quiet cabinet-focus once the new cabinet is at the front */
  let focusT = 0;
  function turnSound(dir) {
    A.Sfx.event(dir < 0 ? 'wheel-left' : 'wheel-right');
    clearTimeout(focusT); focusT = setTimeout(() => A.Sfx.event('cabinet-focus'), reduced.matches ? 120 : 450);
  }
  const go = step => {
    if (N < 2) return;
    if (LINE() && (cur + step < 0 || cur + step >= N)) return;     // a straight row: no going past either end
    cur = ((cur + step) % N + N) % N; place(); turnSound(step);
  };
  function goTo(i) { if (i === cur) return; const dir = wrap(i - cur); cur = i; place(); turnSound(dir); }

  let lights = [];
  function drawLights() {
    $('lights').innerHTML = N > 1 ? ring.map((g, i) => `<button class="light" data-i="${i}" aria-label="${esc(g.name)}"><i></i></button>`).join('') : '';
    lights = [...$('lights').querySelectorAll('.light')];
    lights.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.i)));
  }
  /* the Full Arcade's QUICK JUMP strip: every game's marquee thumbnail, zone by zone (a thin zone-color line + name); the
     front game's is lit; a tap spins the carousel straight there (arcade3d.js builds only both ends of a long spin) */
  let jumps = [];
  function drawJumps() {
    const strip = $('jumpStrip');
    strip.hidden = !isFull();
    if (!isFull()) { strip.innerHTML = ''; jumps = []; return; }
    const groups = [];
    ring.forEach((g, i) => {
      const z = fullZoneOf[g.id] || null, last = groups[groups.length - 1];
      if (last && last.z === z) last.items.push([g, i]); else groups.push({z, items: [[g, i]]});
    });
    strip.innerHTML = groups.map(({z, items}) => `<div class="jg" style="${A.Lobby.zoneStyle(z)}"><span class="jg-name" aria-hidden="true">${z ? esc(z.name) : 'More games'}</span><div class="jg-row">` +
      items.map(([g, i]) => `<button type="button" class="jump${fitOf(g).ok ? '' : ' nofit'}" data-i="${i}" aria-label="${esc(g.name)}${z ? ' (' + esc(z.name) + ')' : ''}"><span class="mq-thumb mq-wait"></span></button>`).join('') +
      `</div></div>`).join('');
    // the marquee pictures a few at a time once the cabinets are up (the 3D view comes first on a slow Chromebook)
    const set = ring, idle = window.requestIdleCallback || (fn => setTimeout(fn, 60));
    const fill = () => {
      if (ring !== set) return;
      const todo = jumps.filter(b => b.querySelector('.mq-wait')).slice(0, 3);
      todo.forEach(b => { b.innerHTML = A.Lobby.thumb(ring[+b.dataset.i]); });
      if (todo.length) idle(fill, {timeout: 400});
    };
    setTimeout(() => idle(fill, {timeout: 400}), 300);
    jumps = [...strip.querySelectorAll('.jump')];
    jumps.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.i)));
  }
  function centerJump(b, instant) {
    const s = $('jumpStrip'), left = b.offsetLeft - (s.clientWidth - b.offsetWidth) / 2;
    if (s.scrollWidth > s.clientWidth) s.scrollTo({left, behavior: instant || reduced.matches ? 'auto' : 'smooth'});
  }
  $('prevBtn').addEventListener('click', () => go(-1));
  $('nextBtn').addEventListener('click', () => go(1));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || A.SelectView.isOpen || pressStart()) return;
    if (document.body.classList.contains('avc-open') || e.defaultPrevented) return;   // the avatar editor (or the badge's menu) has the keys
    if (!$('fitDlg').hidden) { if (e.key === 'Escape') closeFit(); return; }
    if (e.key === 'Escape' && current !== 'lobby') { e.preventDefault(); goBack(); return; }
    if (current !== 'zone') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  /* a tap on a side cabinet turns it to the front (its START does nothing until then); START opens the game */
  let swiped = false;
  aisle.addEventListener('click', e => {
    if (swiped) { swiped = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!view) return;
    const start = e.target.closest('a');
    if (start && start === view.startLink) {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) { e.preventDefault(); openGame(ring[cur], 'zone'); }
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
    if (N > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 350); }
  });
  aisle.addEventListener('pointercancel', () => { sid = null; });
  aisle.addEventListener('dragstart', e => e.preventDefault());

  /* ---------- the 3D view: loaded the first time a zone opens ---------- */
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = A.v ? A.v(src) : src; s.onload = ok; s.onerror = fail;   // ?v=<site version> (shared/version.js)
      document.head.appendChild(s);
    });
  }
  function load3D() {
    loading3D = true;
    aisle.classList.add('loading-3d');     // hide the 2D cabinets for the moment the 3D ones take to load
    let settled = false;                   // once we fall back to 2D, a late 3D load is thrown away
    const giveUp = () => {
      settled = true; use3D = false; v3 = null; loading3D = false;
      aisle.classList.remove('loading-3d');
      if (current === 'zone' && (!view || view.kind !== '2d')) { view = null; useView(make2D()); place(true); }
    };
    const timer = setTimeout(giveUp, 8000);
    let made = null;                       // the cabinets it was made with (a zone change while loading: swap them)
    (window.THREE ? Promise.resolve() : loadScript('shared/vendor/three.min.js'))
      .then(() => { made = ring; return A.Floor3D.create(aisle, {ring, wrap, cur, fade, tag: isFull() ? tagOf : null, onGiveUp: giveUp}); })
      .then(v => {
        clearTimeout(timer); loading3D = false;
        if (settled) { v.destroy(); return; }
        aisle.classList.remove('loading-3d');
        v3 = v;
        if (current === 'zone') { if (made !== ring) v.setRing(ring, wrap, cur, fade, isFull() ? tagOf : null); useView(v); place(true); }
        else v.setRing([], wrap, 0);
      })
      .catch(err => { clearTimeout(timer); if (window.console) console.warn('3D arcade off:', err); giveUp(); });
  }

  /* ---------- opening a game ---------- */
  const FROM = 'bandarcade.from';
  const gameHref = g => A.linkTo(g.id + '/index.html');
  function openGame(g, from) {
    if (!g) return;
    const f = fitOf(g);
    if (!f.ok) { openFit(g); return; }
    A.Lobby.remember(g);                                          // the lobby's CONTINUE card
    ss.set(FROM, JSON.stringify(from === 'zone' && isFull() ? {view: 'full'} : {view: from, zone: from === 'zone' && zone ? zone.id : null}));
    // a two-player game with its own Select Player (Player 2 picks there too), or no instrument chosen yet: Select Player
    if (!g.player && (g.players === 2 || !A.store.player || A.store.pending)) { A.Sfx.eventSoon('select-' + g.id); openSelect(g); return; }
    A.Sfx.playThenGo('select-' + g.id, gameHref(g));              // its START sound, then the game (the saved instrument)
  }

  /* a game that doesn't suit this instrument: why, and SWITCH INSTRUMENT (pick mode, that game's unsuited ones dimmed) */
  let fitGame = null, fitReturn = null;
  function openFit(g) {
    fitGame = g; fitReturn = document.activeElement;
    const f = fitOf(g);
    $('fitPic').innerHTML = A.Lobby.thumb(g);
    $('fitTitle').textContent = `${g.name}: ${f.tag}`;
    $('fitWhy').textContent = f.why;
    $('fitDlg').hidden = false;
    A.Sfx.event('ui-toggle');
    $('fitSwitch').focus();
  }
  function closeFit() {
    $('fitDlg').hidden = true; fitGame = null;
    if (fitReturn && fitReturn.isConnected) fitReturn.focus({preventScroll: true});
  }
  $('fitClose').addEventListener('click', closeFit);
  $('fitDlg').addEventListener('click', e => { if (e.target === $('fitDlg')) closeFit(); });
  $('fitSwitch').addEventListener('click', () => { const g = fitGame; closeFit(); openPick(g); });

  /* ---------- the views of this page (the address decides; Back/Forward too) ---------- */
  const SELECT_KEYS = ['game', 'players', 'need', 'pick'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  /** this page's address without the select views' parameters (every other flag, like ?demo, stays) */
  function floorURL(hash) {
    const p = new URLSearchParams(location.search);
    SELECT_KEYS.forEach(k => p.delete(k));
    const q = p.toString().replace(/=(?=&|$)/g, '');
    return location.pathname + (q ? '?' + q : '') + (hash || '');
  }
  function setHash(hash, keepState) {
    try { history.replaceState(keepState ? history.state : null, '', floorURL(hash)); } catch (e) { /* file:// in some browsers */ }
  }
  function push(hash, state) {
    try { history.pushState(state, '', floorURL(hash)); } catch (e) { location.hash = hash; }
  }
  /** what the address asks for: {view: 'lobby' | 'zone' | 'all', zone, game} */
  function route() {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw || raw === 'lobby') return {view: 'lobby'};
    if (raw === 'all-games') return {view: 'all'};
    const p = new URLSearchParams(raw);
    if (p.has('full-arcade')) return {view: 'zone', zone: FULL, game: p.get('game') || fullStart()};
    if (p.has('zone')) {
      const z = A.zoneById(p.get('zone'));
      return z && A.zoneGames(z.id).length ? {view: 'zone', zone: z, game: p.get('game')} : {view: 'lobby'};
    }
    // index.html#<game id>: back from a game (its "← ARCADE"): where the student left from
    const g = A.floorGames().find(x => x.id === raw);
    if (!g) { setHash(''); return {view: 'lobby'}; }
    let from = {};
    try { from = JSON.parse(ss.get(FROM) || '{}') || {}; } catch (e) { /* none */ }
    const z = from.zone && (g.zones || []).includes(from.zone) ? A.zoneById(from.zone) : A.zonesOf(g)[0];
    const to = from.view === 'all' ? {view: 'all', game: g.id} : from.view === 'full' ? {view: 'zone', zone: FULL, game: g.id}
      : from.view === 'lobby' || !z ? {view: 'lobby'} : {view: 'zone', zone: z, game: g.id};
    // the lobby goes underneath, so Back from here goes to the lobby (then back to the game)
    setHash('');
    if (to.zone === FULL) push('#full-arcade&game=' + g.id, {from: 'lobby'});
    else if (to.view === 'zone') push('#zone=' + z.id + '&game=' + g.id, {from: 'lobby'});
    if (to.view === 'all') push('#all-games', {from: 'lobby'});
    return to;
  }

  /** where the Full Arcade opens: the ASSIGNED game, else the last game played on this device, else the first */
  function fullStart() {
    const g = A.featuredGame() || A.Lobby.lastGame();
    return g ? g.id : null;
  }
  let current = null, lastSelectGame = null, afterPick = null, autoPicked = false, shownFor;
  /** the lobby's sound through the music manager: the room ambience, no music (the same track in every view here) */
  const floorSound = () => { A.Sfx.setMusic(null); A.Sfx.setAmbience('lobby-ambience', {builtIn: true}); A.Sfx.preloadMusic('select-music'); };
  function showView() {
    A.params = new URLSearchParams(location.search);
    const gid = A.params.get('game');
    const g = gid ? (A.ALL_GAMES || A.GAMES).find(x => x.id === gid) || null : null;
    if (g && g.player) { location.replace(A.startLink(g, '')); return; }        // a game with its own player: no choosing
    if (g && A.BandNinja && A.BandNinja.skipSelect()) return;                   // a Band Ninja link gave the instrument
    if (g || A.params.has('pick')) {
      closeFit();
      document.body.classList.add('in-select'); A.floorPaused = true;          // the 3D floor stops drawing meanwhile
      if (g) { if (A.SelectView.game !== g) { lastSelectGame = g; A.SelectView.open(g, {players: A.params.get('players'), need: A.params.get('need')}); } }
      else if (!A.SelectView.isOpen || A.SelectView.game) {
        const forGame = A.floorGames().find(x => x.id === A.params.get('pick')) || null;
        A.SelectView.open(null, {forGame, onDone: id => picked(forGame)});
      }
      return;
    }
    if (gid) setHash(location.hash);                                            // an unknown ?game=: dropped
    A.SelectView.close();
    document.body.classList.remove('in-select');
    floorSound();
    const r = route();
    render(r);
    // no instrument yet (and no PRESS START to lead there): CHOOSE YOUR INSTRUMENT, once per page load
    if (!A.store.player && !pressStart() && !autoPicked && r.view === 'lobby') { autoPicked = true; openPick(null); return; }
    if (afterPick) { const pg = afterPick; afterPick = null; if (fitOf(pg).ok) openGame(pg, current); }
    if (lastSelectGame && r.view === 'zone') { const i = ring.indexOf(lastSelectGame); if (i >= 0 && i !== cur) { cur = i; place(true); } }
    lastSelectGame = null;
  }
  function render(r) {
    const was = current;
    current = r.view;
    document.body.classList.toggle('v-lobby', r.view === 'lobby');
    document.body.classList.toggle('v-zone', r.view === 'zone');
    document.body.classList.toggle('v-full', r.view === 'zone' && r.zone === FULL);
    document.body.classList.toggle('v-all', r.view === 'all');
    $('lobby').hidden = r.view !== 'lobby';
    $('zoneView').hidden = r.view !== 'zone';
    $('allView').hidden = r.view !== 'all';
    chip();
    const bar = $('fbar');
    bar.style.cssText = r.view === 'zone' && r.zone !== FULL ? A.Lobby.zoneStyle(r.zone) : '';
    $('backBtn').hidden = r.view === 'lobby';
    $('fbTitle').hidden = r.view === 'lobby';
    $('allBtn').hidden = r.view === 'all';
    $('fullBtn').hidden = r.view === 'zone' && r.zone === FULL;
    if (r.view !== 'zone') { A.floorPaused = true; if (zone) { hideCabinets(); zone = null; } }
    if (r.view === 'lobby') {
      document.title = A.ARCADE_NAME;
      A.Lobby.render({onZone: z => enterZone(z), onGame: openGame});
    } else if (r.view === 'all') {
      document.title = `All Games · ${A.ARCADE_NAME}`;
      $('fbTitle').textContent = 'All Games';
      $('backLbl').textContent = backLabel();
      A.Lobby.renderAll({onGame: openGame, focus: r.game});
      if (!r.game) window.scrollTo(0, 0);
    } else {
      document.title = `${r.zone.name} · ${A.ARCADE_NAME}`;
      $('fbTitle').textContent = r.zone.name;
      $('backLbl').textContent = r.zone === FULL ? backLabel() : 'Lobby';
      $('backBtn').setAttribute('aria-label', 'Back to the ' + (r.zone === FULL ? backLabel() : 'lobby'));
      A.floorPaused = false;
      let games;
      if (r.zone === FULL) { const f = fullGames(); games = f.list; fullZoneOf = f.zoneOf; } else games = A.zoneGames(r.zone.id);
      const instChanged = shownFor !== undefined && shownFor !== A.store.player;
      shownFor = A.store.player;
      if (!zone || zone.id !== r.zone.id || instChanged) {
        zone = r.zone; ring = games; N = ring.length;
        cur = Math.max(0, ring.findIndex(g => g.id === r.game));
        $('zoneView').classList.toggle('single', N < 2);
        drawLights(); drawJumps();
        showCabinets();
      } else {
        const i = ring.findIndex(g => g.id === r.game);
        if (i >= 0 && i !== cur) { cur = i; place(true); } else place(true);
      }
      if (v3) v3.refade(fade);
      jumps.forEach(b => b.classList.toggle('nofit', !fitOf(ring[+b.dataset.i]).ok));
      if (was !== 'zone') window.scrollTo(0, 0);
    }
    if (was && was !== current) focusView();
  }
  function backLabel() {
    const st = history.state || {};
    if (st.from === 'zone' && st.zone) { const z = st.zone === FULL.id ? FULL : A.zoneById(st.zone); if (z) return z.name; }
    return 'Lobby';
  }
  function focusView() {
    if (pressStart() || A.SelectView.isOpen) return;
    const el = current === 'zone' ? view && view.startLink : current === 'all' ? $('allGrid').querySelector('.gcard') : $('zones').querySelector('.zsign');
    if (el) el.focus({preventScroll: true});
  }
  /** THE AVATAR BADGE in the top bar (shared/avatar-badge.js): the avatar, its name and the instrument; its menu =
      EDIT AVATAR (the creator over this view: the zone, cabinet and scroll stay put) or CHANGE INSTRUMENT (pick mode) */
  const badge = A.AvatarBadge.mount($('avBadge'), {
    member: A.store.player || null,
    instLabel: () => { const m = A.store.player ? A.memberById(A.store.player) : null; return m ? m.short : 'Choose instrument'; },
    changeInstrument: () => openPick(null),
  });
  function chip() { badge.opts.member = A.store.player || null; badge.render(); }

  function enterZone(z) {
    A.Sfx.event('zone-select');
    push('#zone=' + z.id, {from: 'lobby'});
    showView();
    setTimeout(() => A.Sfx.event('zone-enter'), 160);
  }
  function openFull() {
    A.Sfx.event('zone-select');
    push('#full-arcade', {from: current, zone: zone && zone.id});
    showView();
    setTimeout(() => A.Sfx.event('zone-enter'), 160);
  }
  function openAll() {
    A.Sfx.event('all-games-open');
    push('#all-games', {from: current, zone: zone && zone.id});
    showView();
  }
  /** BACK: the browser's Back when this page put the view on top (history stays tidy), else straight to the lobby */
  function goBack() {
    A.Sfx.event('zone-back');
    if (history.state && history.state.from) history.back();
    else { setHash(''); showView(); }
  }
  $('backBtn').addEventListener('click', goBack);
  $('allBtn').addEventListener('click', openAll);
  $('fullBtn').addEventListener('click', openFull);

  function openPick(g) {
    const p = new URLSearchParams(location.search);
    SELECT_KEYS.forEach(k => p.delete(k));
    p.set('pick', g ? g.id : '');
    try { history.pushState({pick: 1}, '', location.pathname + '?' + p.toString().replace(/=(?=&|$)/g, '') + location.hash); }
    catch (e) { /* file:// */ }
    showView();
  }
  /** an instrument was chosen in pick mode: back to where the student was (and on to the game they wanted) */
  function picked(forGame) {
    afterPick = forGame;
    if (history.state && history.state.pick) history.back();
    else { setHash(location.hash); showView(); }
  }
  function openSelect(g) {
    try { history.pushState({select: g.id}, '', A.playerLink(g.id, '')); } catch (e) { location.href = A.playerLink(g.id, ''); return; }
    showView();
  }
  addEventListener('popstate', showView);
  // back to this page from a game with the browser's Back (a page kept in memory): fresh stars and CONTINUE
  addEventListener('pageshow', e => { if (e.persisted) { A.floorPaused = current !== 'zone'; showView(); } });
  // "← ARCADE" in the select view: back where the student was (the browser's Back when this page opened it)
  $('spBack').addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault(); A.Sfx.event('ui-back');
    if (history.state && (history.state.select || history.state.pick)) history.back();
    else { setHash(location.hash); showView(); }
  });
  // links to another game's Select Player (the snare message's "try Showtime Malfunction") stay on this page too
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('#selectView a[href]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button || a.id === 'spBack') return;
    const u = new URL(a.href, location.href);
    if (u.pathname !== location.pathname || !u.searchParams.get('game')) return;
    const g = (A.ALL_GAMES || A.GAMES).find(x => x.id === u.searchParams.get('game'));
    if (!g || g.player) return;
    e.preventDefault(); A.Sfx.event('select-' + g.id); openSelect(g);
  });

  showView();                              // the address decides: lobby, a zone, ALL GAMES or Select Player
  A.Arcade = {state: () => ({view: isFull() ? 'full' : current, jump: jumps.findIndex(b => b.getAttribute('aria-current') === 'true'), zone: zone && zone.id, game: ring[cur] && ring[cur].id, ring: ring.map(g => g.id), kind: view && view.kind})};
})(window.Arcade);
