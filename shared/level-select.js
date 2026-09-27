/* Band Arcade: THE LEVEL SELECT PATTERN, the same on every game's first screen, so students see that they pick a level
   before play starts:
     "SELECT A LEVEL"   the heading right above the level cards (the announcer style of CHOOSE YOUR INSTRUMENT), with
                        "② " in front when the screen also has a note-set picker, which gets "① PICK YOUR NOTES"; the
                        heading swells once after the note set changes (step 2 is next)
     the voice line     sounds.js 'select-level' as the screen appears (after PRESS START, or back from a level), at
                        most once a minute, the music dipping while it speaks (Sfx.announce, like choose-instrument)
     RECOMMENDED LEVEL  the next level to play: the lowest unlocked level without stars (Level 1 for a new player);
                        if every unlocked level has stars, the lowest without all of them; if all are full, the last.
                        Its card glows and pulses gently (steady under reduced motion), shows a big "▶ PLAY", has the
                        keyboard focus and is scrolled into view. Never an Endless tile (the game passes levels only).
     IDLE HINT          nothing tapped for IDLE_MS after the screen appears: a bouncing arrow points at that card; any
                        tap or key hides it, and it comes back only when the screen is shown again
     KEYBOARD           arrows move between the cards (to the nearest one that way on screen), Enter/Space starts
     LOCKED LEVELS      dimmed, a lock and "Clear Level N to unlock", never glowing

   Arcade.LevelSelect.show({
     screen,            the level-select screen (the section that is shown and hidden)
     grid,              the element holding the level cards (the heading goes right above it)
     cards,             the level cards in level order (elements; buttons, or anything focusable)
     stars(i),          stars earned on level i (0-based)
     unlocked(i),       whether level i can be played
     max = 3,           stars a level can give
     picker,            the note-set picker's element (optional: the two step labels)
     title,             heading text (default 'Select a level')
     lockText(i),       the locked card's line (default "Clear Level i to unlock"; i = the level before it)
     fresh,             true = treat this as the screen appearing again even if it never looked hidden
   })  Call it every time the cards are drawn. The screen APPEARING (the first call, or the first call after the screen
       was hidden) brings the voice line, the focus, the scroll and the idle hint; a redraw while it stays on screen
       (a new note set) only moves the glow.
   Arcade.LevelSelect.highlight({screen, el})   a setup screen's main button (START MATCH, CONTINUE): the glow, the
       idle hint and the keyboard focus, no heading or voice line
   Arcade.LevelSelect.state()   tests: {rec (0-based), hint, appeared, voiceKey} */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const IDLE_MS = 5000, VOICE_KEY = 'bandarcade.select-level-at', VOICE_GAP = 60000, VOICE_DELAY = 600;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const LOCK = '<svg class="ls-lock-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  const ARROW = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 18h22V7l18 17-18 17V30H4z"/></svg>';
  const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden]');

  let S = null;                                   // the current screen: {screen, cards, rec, appeared, obs, hint...}

  /** the next level to play (0-based), from each level's stars and lock */
  function recommend(n, stars, unlocked, max = 3) {
    const open = [];
    for (let i = 0; i < n; i++) if (unlocked(i)) open.push(i);
    if (!open.length) return 0;
    const none = open.find(i => !stars(i));
    if (none !== undefined) return none;
    const part = open.find(i => stars(i) < max);
    return part !== undefined ? part : n - 1;
  }

  /* ---------- the screen appearing / going ---------- */
  function watch(screen) {
    if (S && S.screen === screen) return S;
    stop();
    S = {screen, appeared: false, hint: null, idleT: 0, voice: null, dismissed: false};
    // the screen going away (hidden, or its section swapped out): the next show() is a new appearance
    const check = () => { if (S && S.screen === screen && S.appeared && !visible(screen)) leave(); };
    S.obs = new MutationObserver(check);
    for (let el = screen; el && el !== document.body; el = el.parentElement) S.obs.observe(el, {attributes: true, attributeFilter: ['hidden', 'class', 'style']});
    return S;
  }
  function leave() {
    if (!S) return;
    S.appeared = false; S.dismissed = false;
    clearTimeout(S.idleT); hideHint();
    if (S.voice) { S.voice.cancel(); S.voice = null; }
  }
  function stop() { if (S) { leave(); if (S.obs) S.obs.disconnect(); } S = null; }

  /** anything the student does on the page: the hint goes (and stays away), and a voice line not yet started is off */
  function onAct(e) {
    if (!S || !S.appeared) return;
    if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key)) return;
    S.dismissed = true; clearTimeout(S.idleT); hideHint();
    const onCard = e.target && e.target.closest && S.cards && S.cards.some(c => c.contains(e.target));
    if (S.voice && (onCard || (e.type === 'keydown' && /^(Arrow|Enter$| $)/.test(e.key)))) { S.voice.cancel(); S.voice = null; }
  }
  addEventListener('pointerdown', onAct, true);
  addEventListener('keydown', onAct, true);

  /** PRESS START still up (shared/press-start.js): wait for its tap before speaking, focusing or hinting */
  function afterStart(fn) {
    const P = A.PressStart, st = P && P.state && P.state();
    if (st && st.game && !st.done) P.show(st.game, fn); else fn();
  }

  /* ---------- the idle hint: a bouncing arrow beside the recommended card ---------- */
  function showHint() {
    if (!S || S.dismissed || !S.recEl || !visible(S.recEl) || S.hint) return;
    if (document.querySelector('body>.overlay:not([hidden]), .overlay.on') || document.documentElement.classList.contains('ps-on')) {
      S.idleT = setTimeout(showHint, 1000); return;                  // a panel covers the screen: later
    }
    const h = document.createElement('div');
    h.className = 'ls-hint'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = ARROW;
    document.body.appendChild(h);
    S.hint = h; placeHint();
  }
  function placeHint() {
    const h = S && S.hint, c = S && S.recEl;
    if (!h || !c) return;
    const r = c.getBoundingClientRect(), sx = scrollX, sy = scrollY, size = 44;
    // beside it on the left, pointing right; no room there (the first column on a phone): on its top-left corner, pointing down
    const side = r.left >= size + 6;
    h.classList.toggle('down', !side);
    h.style.left = (side ? r.left - size - 4 + sx : r.left + 10 + sx) + 'px';
    h.style.top = (side ? r.top + r.height / 2 - size / 2 + sy : r.top - size + 8 + sy) + 'px';
  }
  function hideHint() { if (S && S.hint) { S.hint.remove(); S.hint = null; } }
  addEventListener('resize', () => placeHint());

  /* ---------- the heading and the step labels ---------- */
  function heading(grid, title, step) {
    let h = grid.previousElementSibling;
    if (!h || !h.classList.contains('ls-head')) {
      h = document.createElement('h2');
      h.className = 'ls-head';
      grid.parentNode.insertBefore(h, grid);
    }
    h.innerHTML = (step ? '<span class="ls-step" aria-hidden="true">②</span> ' : '') + `<span class="ls-t">${title}</span>`;
    return h;
  }
  function stepLabel(picker) {
    if (!picker || picker.querySelector('.ls-pick')) return;
    const l = document.createElement('p');
    l.className = 'ls-pick';
    l.innerHTML = '<span class="ls-step" aria-hidden="true">①</span> Pick your notes';
    picker.insertBefore(l, picker.firstChild);
    // a new note set: the heading swells once (step 2 is next)
    picker.addEventListener('click', e => {
      if (!e.target.closest('button')) return;
      setTimeout(() => { if (S && S.head) swell(S.head); }, 30);
    });
  }
  function swell(h) {
    if (reduced.matches) return;
    h.classList.remove('say'); void h.offsetWidth; h.classList.add('say');
  }

  /* ---------- keyboard: arrows move to the nearest card that way ---------- */
  function onKey(e) {
    if (!S || !S.cards || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = S.cards.find(c => c === document.activeElement || c.contains(document.activeElement));
    if (!cur) return;
    const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
    if (!dir) return;
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bd = Infinity;
    S.cards.forEach(c => {
      if (c === cur || c.disabled || !visible(c)) return;
      const b = c.getBoundingClientRect(), dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      if (along <= 4) return;
      const d = along + across * 2.5;
      if (d < bd) { bd = d; best = c; }
    });
    if (!best) return;
    e.preventDefault();
    best.focus({preventScroll: false});
    if (best.scrollIntoView) best.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }
  addEventListener('keydown', onKey);

  /* ---------- show ---------- */
  function show(o) {
    const {screen, grid, max = 3, picker, title = 'Select a level'} = o;
    const cards = [].slice.call(o.cards || []);
    if (!screen || !cards.length) return;
    const st = watch(screen);
    if (o.fresh) leave();
    const n = cards.length, stars = i => +(o.stars ? o.stars(i) : 0) || 0, open = i => o.unlocked ? !!o.unlocked(i) : true;
    const rec = recommend(n, stars, open, max);
    if (grid) st.head = heading(grid, title, !!picker);
    stepLabel(picker);
    cards.forEach((c, i) => {
      c.classList.add('ls-card');
      c.classList.toggle('ls-rec', i === rec);
      c.classList.toggle('ls-locked', !open(i));
      c.querySelectorAll(':scope>.ls-play, :scope>.ls-lock').forEach(x => x.remove());
      if (i === rec) {
        c.insertAdjacentHTML('beforeend', '<span class="ls-play" aria-hidden="true">▶ Play</span>');
        if (!/next level/i.test(c.getAttribute('aria-description') || '')) c.setAttribute('aria-description', 'Recommended: your next level');
      } else c.removeAttribute('aria-description');
      if (!open(i)) {
        const t = o.lockText ? o.lockText(i) : `Clear Level ${i} to unlock`;
        c.insertAdjacentHTML('beforeend', `<span class="ls-lock">${LOCK}<span>${t}</span></span>`);
      }
    });
    st.cards = cards; st.rec = rec; st.recEl = cards[rec];
    const refocus = !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected ||
      cards.some(c => c === document.activeElement) || (st.head && st.head.contains(document.activeElement));
    if (st.appeared) {                                               // a redraw (a new note set): the glow moves, that's all
      if (refocus) st.recEl.focus({preventScroll: true});
      if (st.hint) placeHint();
      return;
    }
    st.appeared = true; st.dismissed = false;
    afterStart(() => {
      if (S !== st || !st.appeared) return;
      st.dismissed = false;                                          // (the PRESS START tap itself doesn't count)
      const el = st.recEl;
      // the recommended card in view (it may be far down: Level 7 on a phone), then the keyboard focus on it
      requestAnimationFrame(() => {
        if (S !== st || !visible(el)) return;
        const r = el.getBoundingClientRect(), h = st.head && st.head.getBoundingClientRect();
        if (r.bottom > innerHeight - 8 || r.top < 0) {
          // the heading too, when both fit
          const top = h && r.bottom - h.top < innerHeight - 24 ? h.top : r.top - innerHeight / 2 + r.height / 2;
          scrollTo({top: Math.max(0, scrollY + top - 12), behavior: 'auto'});
        }
        const a = document.activeElement;
        if (!a || a === document.body || cards.includes(a) || !a.isConnected) el.focus({preventScroll: true});
      });
      if (o.voice !== false) {
        st.voice = A.Sfx && A.Sfx.announce ? A.Sfx.announce('select-level', {key: VOICE_KEY, gap: VOICE_GAP, delay: VOICE_DELAY,
          alive: () => S === st && st.appeared && visible(screen),
          hold: () => !!document.querySelector('body>.overlay:not([hidden])'),
          onPlay: () => { if (st.head) swell(st.head); }}) : null;
      }
      clearTimeout(st.idleT);
      st.idleT = setTimeout(showHint, IDLE_MS);
    });
  }

  /** a setup screen's main button (START MATCH, CONTINUE): glow, idle hint, focus; no heading or voice */
  function highlight({screen, el}) {
    if (!screen || !el) return;
    const st = watch(screen);
    st.cards = [el]; st.rec = 0; st.recEl = el; st.head = null;
    el.classList.add('ls-card', 'ls-rec', 'ls-main');
    if (st.appeared) return;
    st.appeared = true; st.dismissed = false;
    afterStart(() => {
      if (S !== st || !st.appeared) return;
      st.dismissed = false;
      requestAnimationFrame(() => {
        const a = document.activeElement;
        if (visible(el) && (!a || a === document.body || !a.isConnected)) el.focus({preventScroll: true});
      });
      clearTimeout(st.idleT);
      st.idleT = setTimeout(showHint, IDLE_MS);
    });
  }

  A.LevelSelect = {show, highlight, recommend, IDLE_MS, VOICE_KEY,
    state: () => S ? {rec: S.rec, hint: !!S.hint, appeared: S.appeared, dismissed: S.dismissed} : null};
})(window.Arcade);
