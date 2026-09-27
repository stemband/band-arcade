/* Band Arcade: THE LEVEL SELECT PATTERN, the same on every game's first screen. Like the note-set picker, the student
   SELECTS, then STARTS:
     "① SELECT YOUR NOTES"   the heading on the note-set picker (when the screen has one)
     "② SELECT YOUR LEVEL"   the heading right above the level cards (no number without a picker). Both are ONE style,
                             `.ls-head` (the announcer's neon lettering, section-heading size), so they can't drift apart
     SELECTING               a tap (or Enter/Space) on a level card selects it (the chosen note set's look: lit border,
                             glow, a ✓); the one before is deselected. A tap never starts the game. A locked card can't
                             be selected: "Clear Level N to unlock" pops up on it for a moment. The Endless tile (its
                             whole card and its button) is selectable like a level.
     START                   in the heading row, so it is on screen whenever the heading is (the row sticks to the top
                             while the cards scroll under it): a big neon START + one line, "LEVEL 4 · FIRST FIVE"; until a
                             level is selected, a dim "Select your notes and level" there instead. It slides in with the
                             'start-ready' sound when the student's choice makes it ready. START (tap, Enter, Space) starts
                             exactly what a tap on that card used to (the game's own click handler: requireMic, story
                             panels, intro screens…). A new note set keeps the level and updates the line.
     REMEMBERED              the last level started or selected, per game + instrument on this device
                             (gameData('level-select')); restored when the screen opens (nothing when it's locked now or
                             gone). The note set is remembered by the picker. Arcade.LevelSelect.played(i) from a game's
                             start function (NEXT LEVEL, RETRY and START all go through it) keeps the level just played.
     THE VOICE LINE          'select-level' ("Select your level") as the screen appears (after PRESS START, or back from a
                             level), at most once a minute, the music dipping while it speaks (Sfx.announce)
     IDLE HINT               5 s without a tap: a bouncing arrow points at what's missing: the level cards when none is
                             selected, else START. Any tap or key hides it; it comes back only for the next missing step
                             (a level just selected → START) or when the screen appears again.
     KEYBOARD                arrows move between the cards (to the nearest one that way), Enter/Space select; Tab to START

   Arcade.LevelSelect.show({
     screen,          the level-select screen (the section that is shown and hidden)
     grid,            the element holding the level cards (the heading row goes right above it)
     cards,           the level cards in level order (the game's own buttons, with the game's own click handlers)
     unlocked(i),     whether level i (0-based) can be played
     picker,          the note-set picker's element (optional: "①"/"②" and the note set in START's line)
     endless,         the Endless tile's element (optional: selectable, 'endless')
     lockText(i),     a locked card's line (default "Clear Level i to unlock": i = the level before it)
     label(i),        START's name for level i (default: the card's `.n` text, e.g. "Level 4", "Track 2")
     gameId,          the progress memory's key (default: the page's folder)
     fresh,           true = treat this as the screen appearing again even if it never looked hidden
   })  Call it every time the cards are drawn. The screen APPEARING (the first call, or the first after the screen was
       hidden) restores the choice and brings the voice line and the idle hint; a redraw while it stays up (a new note
       set) keeps the selection and updates START's line.
   Arcade.LevelSelect.played(i | 'endless')   a game started level i (0-based): remembered and selected for the return
   Arcade.LevelSelect.highlight({screen, el})   a setup screen's main button (START MATCH, CONTINUE): lit, focused and
       the idle hint; no heading or voice line
   Arcade.LevelSelect.state()   tests: {sel, ready, hint, hintAt, appeared, summary} */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const IDLE_MS = 5000, VOICE_KEY = 'bandarcade.select-level-at', VOICE_GAP = 60000, VOICE_DELAY = 600, TOAST_MS = 1800;
  const LOCK = '<svg class="ls-lock-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
  const ARROW = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 18h22V7l18 17-18 17V30H4z"/></svg>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden]');
  const pageGame = () => { const m = location.pathname.match(/([^/]+)\/(?:index\.html)?$/); return m ? m[1] : 'game'; };

  let S = null;                                   // the current screen

  /* ---------- the remembered level: per game + instrument ---------- */
  const memo = () => (A.store && A.store.gameData ? A.store.gameData('level-select') : {});
  const memKey = gameId => [gameId, A.store && A.store.player || '', A.store && A.store.instId || ''].join('|');
  function remember(gameId, v) {
    try { const d = memo(); d[memKey(gameId)] = v; A.store.saveGameData('level-select'); } catch (e) { /* no storage */ }
  }
  const recall = gameId => { const v = memo()[memKey(gameId)]; return v === undefined ? null : v; };

  /* ---------- the screen appearing / going ---------- */
  function watch(screen) {
    if (S && S.screen === screen) return S;
    stop();
    S = {screen, appeared: false, hint: null, hintFor: null, idleT: 0, voice: null, sel: null, ready: false};
    const check = () => { if (S && S.screen === screen && S.appeared && !visible(screen)) leave(); };
    S.obs = new MutationObserver(check);
    for (let el = screen; el && el !== document.body; el = el.parentElement) S.obs.observe(el, {attributes: true, attributeFilter: ['hidden', 'class', 'style']});
    return S;
  }
  function leave() {
    if (!S) return;
    S.appeared = false;
    clearTimeout(S.idleT); hideHint();
    if (S.voice) { S.voice.cancel(); S.voice = null; }
  }
  function stop() { if (S) { leave(); if (S.obs) S.obs.disconnect(); } S = null; }

  /** anything the student does: the hint goes; a voice line not yet started is off after a choice */
  function onAct(e) {
    if (!S || !S.appeared) return;
    if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key)) return;
    clearTimeout(S.idleT); hideHint();
    const onCard = e.target && e.target.closest && (S.cards || []).some(c => c.contains(e.target));
    if (S.voice && (onCard || (e.type === 'keydown' && /^(Arrow|Enter$| $)/.test(e.key)))) { S.voice.cancel(); S.voice = null; }
  }
  addEventListener('pointerdown', onAct, true);
  addEventListener('keydown', onAct, true);

  /** PRESS START still up (shared/press-start.js): wait for its tap before speaking, focusing or hinting */
  function afterStart(fn) {
    const P = A.PressStart, st = P && P.state && P.state();
    if (st && st.game && !st.done) P.show(st.game, fn); else fn();
  }

  /* ---------- the idle hint: a bouncing arrow at what's missing ---------- */
  function armHint() {
    if (!S) return;
    clearTimeout(S.idleT);
    S.idleT = setTimeout(showHint, IDLE_MS);
  }
  function hintTarget() {
    if (!S) return null;
    if (S.main) return S.main;                                 // a setup screen's main button
    return S.ready ? S.start : S.grid;
  }
  function showHint() {
    const t = hintTarget();
    if (!S || !S.appeared || !t || !visible(t) || S.hint) return;
    const want = S.ready ? 'start' : 'grid';
    if (S.hintFor === want && S.hintDone) return;              // already shown for this step
    if (document.querySelector('body>.overlay:not([hidden]), .overlay.on') || document.documentElement.classList.contains('ps-on')) {
      S.idleT = setTimeout(showHint, 1000); return;             // a panel covers the screen: later
    }
    const h = document.createElement('div');
    h.className = 'ls-hint'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = ARROW;
    document.body.appendChild(h);
    S.hint = h; S.hintFor = want; S.hintDone = true; placeHint();
  }
  function placeHint() {
    const h = S && S.hint, t = hintTarget();
    if (!h || !t) return;
    const r = t.getBoundingClientRect(), sx = scrollX, sy = scrollY, size = 44;
    // the cards: at the first row's left edge; START: its left side. No room on the left: on top, pointing down
    const y = t === S.grid ? r.top + Math.min(r.height, 180) / 2 : r.top + r.height / 2;
    const side = r.left >= size + 6;
    h.classList.toggle('down', !side);
    h.style.left = (side ? r.left - size - 4 + sx : r.left + (t === S.grid ? 24 : r.width / 2 - size / 2) + sx) + 'px';
    h.style.top = (side ? y - size / 2 + sy : r.top - size + 6 + sy) + 'px';
  }
  function hideHint() { if (S && S.hint) { S.hint.remove(); S.hint = null; } }
  addEventListener('resize', () => placeHint());

  /* ---------- the two headings (one style) and the START row ---------- */
  function headRow(grid, step) {
    let row = grid.previousElementSibling;
    if (!row || !row.classList.contains('ls-row')) {
      row = document.createElement('div');
      row.className = 'ls-row';
      row.innerHTML = '<h2 class="ls-head"></h2><div class="ls-go" aria-live="polite"></div>';
      grid.parentNode.insertBefore(row, grid);
    }
    row.querySelector('.ls-head').innerHTML = (step ? '<span class="ls-step" aria-hidden="true">②</span> ' : '') + 'Select your level';
    return row;
  }
  function notesHead(picker) {
    if (!picker || picker.querySelector('.ls-pick')) return;
    const h = document.createElement('h2');
    h.className = 'ls-head ls-pick';
    h.innerHTML = '<span class="ls-step" aria-hidden="true">①</span> Select your notes';
    picker.insertBefore(h, picker.firstChild);
    // a new note set: START's line follows (the level stays selected)
    picker.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => { if (S && S.picker === picker) drawStart(false); }, 30); });
  }
  /** the note set, as START's line says it: FIRST FIVE, CONCERT B♭, CHROMATIC (+ SCALE ORDER) */
  function noteSet() {
    const p = S && S.picker;
    if (!p) return '';
    const n = p.querySelector('.mp-note[aria-pressed="true"] b'), o = p.querySelector('.mp-ord[aria-pressed="true"]');
    if (!n) return '';
    const t = n.textContent.trim(), name = /^first/i.test(t) ? 'First five' : /^chrom/i.test(t) ? 'Chromatic' : 'Concert ' + t;
    return name + (o && o.dataset.order === 'order' ? ' · Scale order' : '');
  }
  function levelName(i) {
    if (i === 'endless') {
      const t = S.endless && S.endless.querySelector('.ed-title');
      return t ? t.textContent.trim() : 'Endless';
    }
    if (S.opts.label) return S.opts.label(i);
    const c = S.cards[i], n = c && c.querySelector('.n, .cc-rank');
    return n ? n.textContent.trim() : `Level ${i + 1}`;
  }
  /** the START area: the button with its line once a level is selected, else the dim hint */
  function drawStart(announce) {
    if (!S || !S.row) return;
    const go = S.row.querySelector('.ls-go'), was = S.ready;
    S.ready = S.sel !== null;
    if (!S.ready) {
      go.innerHTML = `<p class="ls-need">Select your notes and level</p>`;
      S.start = null;
    } else {
      S.summary = [levelName(S.sel), noteSet()].filter(Boolean).join(' · ');
      let b = go.querySelector('.ls-start');
      if (!b) {
        go.innerHTML = `<button type="button" class="ls-start"><span class="ls-start-t">Start</span><small class="ls-sum"></small></button>`;
        b = go.querySelector('.ls-start');
        b.addEventListener('click', () => begin());
      }
      b.querySelector('.ls-sum').textContent = S.summary;
      b.setAttribute('aria-label', `Start: ${S.summary}`);
      S.start = b;
      if (!was && announce) {
        b.classList.remove('ls-in'); void b.offsetWidth; b.classList.add('ls-in');
        if (A.Sfx) A.Sfx.event('start-ready');
      }
    }
    if (S.ready !== was && S.appeared) armHint();              // the next missing step gets its own hint
  }

  /* ---------- selecting ---------- */
  function mark() {
    S.cards.forEach((c, i) => {
      const on = S.sel === i;
      c.classList.toggle('ls-sel', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const t = S.endless && S.endless.querySelector('.ed-tile');
    if (t) { t.classList.toggle('ls-sel', S.sel === 'endless'); }
    const eb = S.endless && S.endless.querySelector('.ed-go');
    if (eb) eb.setAttribute('aria-pressed', S.sel === 'endless' ? 'true' : 'false');
  }
  function select(v, byStudent) {
    if (!S) return;
    if (S.sel === v) { if (byStudent && S.start) S.start.focus({preventScroll: true}); return; }
    S.sel = v;
    if (byStudent) { remember(S.gameId, v); if (A.Sfx) A.Sfx.event('ui-toggle'); }
    mark(); drawStart(byStudent);
    // START on screen: the row sticks at the top, so this only matters when the page is scrolled past it
    if (byStudent && S.start) {
      const r = S.start.getBoundingClientRect();
      if (r.bottom > innerHeight || r.top < 0) S.row.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }
  function toast(card, text) {
    card.querySelectorAll(':scope>.ls-toast').forEach(x => x.remove());
    const t = document.createElement('span');
    t.className = 'ls-toast'; t.setAttribute('role', 'status'); t.textContent = text;
    card.appendChild(t);
    setTimeout(() => t.remove(), TOAST_MS);
  }
  /** START: what a tap on that card used to do, through the game's own click handler */
  function begin() {
    if (!S || S.sel === null) return;
    const el = S.sel === 'endless' ? S.endless && S.endless.querySelector('.ed-go') : S.cards[S.sel];
    if (!el) return;
    remember(S.gameId, S.sel);
    S.pass = true;
    try { el.click(); } finally { S.pass = false; }
  }
  /** clicks on the cards (and the Endless tile) select instead of starting; START's own click passes through */
  function intercept(el, which) {
    if (el._ls) return;
    el._ls = true;
    el.addEventListener('click', e => {
      if (!S || S.pass) return;
      if (which === 'endless') {
        if (!S.endless || !S.endless.contains(e.target)) return;
        if (e.target.closest('a')) return;
        e.preventDefault(); e.stopPropagation();
        select('endless', true);
        return;
      }
      const i = (S.cards || []).findIndex(c => c.contains(e.target));
      if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      if (!S.open(i)) { toast(S.cards[i], S.lockLine(i)); return; }
      select(i, true);
    }, true);
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
      if (c === cur || !visible(c)) return;
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
    const {screen, grid, picker} = o;
    const cards = [].slice.call(o.cards || []);
    if (!screen || !grid || !cards.length) return;
    const st = watch(screen);
    if (o.fresh) leave();
    st.opts = o; st.grid = grid; st.cards = cards; st.picker = picker || null; st.endless = o.endless || null;
    st.gameId = o.gameId || st.gameId || pageGame();
    st.open = i => o.unlocked ? !!o.unlocked(i) : true;
    st.lockLine = i => o.lockText ? o.lockText(i) : `Clear Level ${i} to unlock`;
    st.row = headRow(grid, !!picker);
    notesHead(picker);
    intercept(grid, 'cards');
    if (st.endless) intercept(st.endless, 'endless');
    cards.forEach((c, i) => {
      c.classList.add('ls-card');
      c.querySelectorAll(':scope>.ls-lock, :scope>.ls-toast').forEach(x => x.remove());
      const open = st.open(i);
      c.classList.toggle('ls-locked', !open);
      // a locked card stays tappable (to say what opens it) but reads as unavailable
      if (!open) {
        c.disabled = false; c.setAttribute('aria-disabled', 'true');
        c.insertAdjacentHTML('beforeend', `<span class="ls-lock">${LOCK}<span>${esc(st.lockLine(i))}</span></span>`);
      } else c.removeAttribute('aria-disabled');
    });
    if (st.endless) { const t = st.endless.querySelector('.ed-tile'); if (t) t.classList.add('ls-card', 'ls-endless'); }
    const valid = v => v === 'endless' ? !!(st.endless && st.endless.querySelector('.ed-go')) : Number.isInteger(v) && v >= 0 && v < cards.length && st.open(v);
    if (!st.appeared) {                                            // the screen appears: the remembered choice
      const v = recall(st.gameId);
      st.sel = valid(v) ? v : null;
    } else if (st.sel !== null && !valid(st.sel)) st.sel = null;
    mark(); drawStart(false);
    if (st.appeared) { if (st.hint) placeHint(); return; }         // a redraw (a new note set)
    st.appeared = true; st.hintDone = false; st.hintFor = null;
    afterStart(() => {
      if (S !== st || !st.appeared) return;
      requestAnimationFrame(() => {
        if (S !== st) return;
        const a = document.activeElement;
        if (st.start && visible(st.start) && (!a || a === document.body || !a.isConnected)) st.start.focus({preventScroll: true});
      });
      if (o.voice !== false) {
        st.voice = A.Sfx && A.Sfx.announce ? A.Sfx.announce('select-level', {key: VOICE_KEY, gap: VOICE_GAP, delay: VOICE_DELAY,
          alive: () => S === st && st.appeared && visible(screen),
          hold: () => !!document.querySelector('body>.overlay:not([hidden])'),
          onPlay: () => { const h = st.row.querySelector('.ls-head'); h.classList.remove('say'); void h.offsetWidth; h.classList.add('say'); }}) : null;
      }
      armHint();
    });
  }

  /** a game started level i (0-based) or 'endless': the screen comes back with it selected */
  function played(i) {
    const gameId = (S && S.gameId) || pageGame();
    remember(gameId, i);
    if (S && S.opts) { S.sel = i; mark(); drawStart(false); }
  }

  /** a setup screen's main button (START MATCH, CONTINUE): lit, focused, and the idle hint */
  function highlight({screen, el}) {
    if (!screen || !el) return;
    const st = watch(screen);
    st.cards = [el]; st.main = el; st.opts = null; st.row = null;
    el.classList.add('ls-main');
    if (st.appeared) return;
    st.appeared = true; st.hintDone = false;
    afterStart(() => {
      if (S !== st || !st.appeared) return;
      requestAnimationFrame(() => {
        const a = document.activeElement;
        if (visible(el) && (!a || a === document.body || !a.isConnected)) el.focus({preventScroll: true});
      });
      armHint();
    });
  }

  A.LevelSelect = {show, played, highlight, IDLE_MS, VOICE_KEY,
    state: () => S ? {sel: S.sel, ready: S.ready, hint: !!S.hint, hintAt: S.hint ? S.hintFor : null, appeared: S.appeared, summary: S.ready ? S.summary : ''} : null};
})(window.Arcade);
