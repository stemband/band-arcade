/* Band Arcade: EVERY GAME'S PRESS START TITLE SCREEN. Browsers block sound on each new page until a tap, and every game
   is its own page, so a game opens on a title screen: its marquee, big and moving, over its menu background, a slowly
   blinking PRESS START and "Tap anywhere or press any key". That one tap (or key) unlocks the audio, primes the page's
   sounds, plays `press-start` (or the game's own `press-start-<game id>`), starts the menu music and fades (0.4 s) into
   the game's first screen, which is already drawn underneath. The top bar (← ARCADE, the sound button, the chip)
   stays usable above it. The microphone is NOT started here: it still starts when a level begins (requireMic).

   It appears ONCE per page load, never between the game's own screens. mountTopbar shows it for every game in
   games.js except tools (the Note Checker) and `pressStart: false` (Arcade Quest, which has its own title screen).
   Skipped: `?nostart`; when the browser already allows sound on load (Sfx.autoStart, e.g. Chrome's autoplay flag);
   and a page brought back by the Back button with its sound still running.

   Arcade.PressStart.show(gameId, onStart)   (mountTopbar calls it; onStart runs after the tap, optional)
   Arcade.PressStart.state()                  tests: {shown, done, skipped, why} */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const FADE_MS = 400, DECIDE_MS = 300;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const touchFirst = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
  let el = null, game = null, done = false, why = '', started = null, cbs = [];

  /** the page's sounds, primed: every effect this game uses loads + decodes now */
  function prime() {
    const S = A.Sfx; if (!S) return;
    if (S.preloadScreen) S.preloadScreen('game', 'general', game.id, 'endless');
  }
  function finish(how) {
    if (done) return;
    done = true; why = how;
    const S = A.Sfx, root = document.documentElement;
    if (how === 'tap' && S) {
      prime();
      S.eventSoon('press-start-' + game.id, 350);             // the game's own sound if uploaded, else press-start
      // the menu music: the game already asked for it on its first screen; a game that didn't gets its games.js track
      const m = S.musicState && S.musicState().music;
      if (m && !m.want && game.menuMusic && !game.menuMusicOwn) S.gameMenuMusic(game.id);
    } else if (S && how !== 'nostart') prime();
    if (A.Marquee && el) A.Marquee.animate(null, 'title');
    root.classList.remove('ps-on');
    if (!el) return run();
    if (how === 'tap') {
      root.classList.add('ps-reveal');                       // the first screen fades in as the title fades out
      el.classList.add('ps-out');
      setTimeout(() => { root.classList.remove('ps-reveal'); if (el) el.remove(); el = null; }, FADE_MS + 50);
    } else { el.remove(); el = null; }
    run();
  }
  const run = () => cbs.splice(0).forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });

  function show(gameId, onStart) {
    if (onStart) cbs.push(onStart);
    if (started) { if (done) run(); return; }                 // once per page
    started = true;
    game = (A.ALL_GAMES || A.GAMES || []).find(g => g.id === gameId);
    if (!game || game.tool || game.pressStart === false) { done = true; why = 'no title screen for this page'; run(); return; }
    if (A.params && A.params.has('nostart')) { finish('nostart'); return; }
    const root = document.documentElement;
    root.classList.add('ps-on', 'ps-wait');                  // the page hides; the title appears once we know it's needed
    const bar = document.getElementById('topbar');
    el = document.createElement('div');
    el.className = 'ps-screen';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${game.name}: press start`);
    const stars = game.maxStars ? (A.gameStars ? A.gameStars(game) : 0) : null;
    const line = stars ? `★ ${stars} of ${game.maxStars}` : (game.summary && A.store ? game.summary(A.store) : '') || '';
    el.innerHTML = `<div class="ps-mq mq-live" data-mq="${esc(game.id)}"><canvas class="mq-cv" aria-hidden="true"></canvas><span class="sr">${esc(game.name)}</span></div>` +
      (A.Marquee ? '' : `<h1 class="ps-name">${esc(game.name)}</h1>`) +
      `<button type="button" class="ps-go">Press start</button>` +
      `<p class="ps-hint">${touchFirst() ? 'Tap anywhere or press any key' : 'Click anywhere or press any key'}</p>` +
      (line ? `<p class="ps-stars">${esc(line)}</p>` : '');
    const place = () => { if (!el) return; const r = bar && bar.getBoundingClientRect(); el.style.setProperty('--ps-top', Math.max(0, r ? r.bottom + 6 : 0) + 'px'); };
    place(); requestAnimationFrame(place); addEventListener('resize', place);   // again once the top bar is built
    document.body.appendChild(el);
    if (A.Marquee) { A.Marquee.hydrate(el); A.Marquee.animate(el.querySelector('.ps-mq'), 'title'); }
    // any tap on the title screen (the top bar is above it, so its buttons still work) or any key
    const go = e => {
      if (done) return;
      if (e.type === 'keydown') {
        if (/^(Tab|Shift|Control|Alt|Meta|CapsLock|Escape)$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (bar && bar.contains(e.target)) return;           // Enter/Space on a top-bar button does that button's job
      }
      e.preventDefault(); e.stopPropagation();
      finish('tap');
      removeEventListener('keydown', go, true);
    };
    el.addEventListener('pointerdown', go);
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    addEventListener('keydown', go, true);
    // does this browser already allow sound (Chrome's autoplay setting)? then no title screen at all
    const decide = A.Sfx && A.Sfx.autoStart ? A.Sfx.autoStart(DECIDE_MS) : Promise.resolve(false);
    decide.then(ok => {
      if (done) return;
      if (ok) { removeEventListener('keydown', go, true); finish('audio already allowed'); return; }
      root.classList.remove('ps-wait');
      why = 'waiting for a tap';
      const btn = el.querySelector('.ps-go'); if (btn && (!document.activeElement || document.activeElement === document.body)) btn.focus({preventScroll: true});
    });
    // the Back button brings the page back with its sound still running: no title screen
    addEventListener('pageshow', e => { if (e.persisted && !done && A.Sfx && A.Sfx.unlocked) finish('back button, sound running'); });
  }

  A.PressStart = {show, state: () => ({shown: !!el, done, why, game: game && game.id})};
})(window.Arcade);
