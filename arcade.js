/* Arcade home page: the arcade floor. Students pick a GAME here (no instruments on this page).
   A carousel of cabinets: arrows, swipe, ←/→ keys, the indicator lights, or a tap on a side cabinet
   turn a cabinet to the front. START goes to select-player/index.html?game=<id>.
   Sound (shared/sfx.js): a whoosh when the aisle turns, a coin drop on START.

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
    const np = g.noPlay, redirect = np && inst && ((np.groups || []).includes(inst.id) || (member && (np.members || []).includes(member.id)));
    hs.hidden = !(inst && g.maxStars && (pid || redirect));
    if (redirect) {
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
    try { history.replaceState(null, '', '#' + g.id); } catch (e) { /* some browsers block this on local files */ }
  }

  const go = step => { cur = ((cur + step) % M + M) % M; place(); A.Sfx.play('whoosh'); };
  /** turn game i to the front, taking the shortest way round */
  function goTo(i) {
    let best = cur, bestD = Infinity;
    for (let r = i; r < M; r += N) { const d = Math.abs(wrap(r - cur)); if (d < bestD) { bestD = d; best = r; } }
    if (best === cur) return;
    cur = best; place(); A.Sfx.play('whoosh');
  }

  $('prevBtn').addEventListener('click', () => go(-1));
  $('nextBtn').addEventListener('click', () => go(1));
  lights.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.i)));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  /* a tap on a side cabinet turns it to the front (its START does nothing until then) */
  let swiped = false;
  aisle.addEventListener('click', e => {
    if (swiped) { swiped = false; e.preventDefault(); e.stopPropagation(); return; }
    if (!view) return;
    const start = e.target.closest('a');
    if (start && start === view.startLink) {          // START: coin drop, then Select Player
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) { e.preventDefault(); A.Sfx.playThenGo('select-' + ring[cur].id, start.href); }
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

  useView(make2D());                       // the 2D aisle works right away (and is the fallback)
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
