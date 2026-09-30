/* ARCADE QUEST ENGINE: the text box and menus (HTML over the canvas, in the pixel font).
   Q.say(lines, {name, portrait})   show lines one at a time in the white-bordered text box, typed out at the TEXT SPEED
                                    setting. Tap/click the box, A (Enter/Space) or B to finish the line, again for the
                                    next one. Resolves when the last line is dismissed. portrait: a sprite id.
   Q.menu(el, items, {cols, onPick, onBack, cls, keys})   big pixel buttons in a grid: arrows/D-pad move, A picks, B backs;
                                    the mouse and Tab move the same ONE selection (.sel: filled + a ▶, style.css);
                                    taps and clicks pick directly. keys: false = taps, clicks and Tab only (a second menu). items: [{id, label, sub, disabled, title}].
   Q.text(key, vars)                a battle message from data/battle-text.js, with {name} placeholders filled in. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const SPEED = {slow: 22, normal: 42, fast: 90, instant: 0};         // letters per second

  /** the hero's name: the student's avatar name (Create Your Player, shared/avatar.js), e.g. "Captain Brassy Blaze" */
  Q.hero = () => (A.Avatar ? A.Avatar.nameOf(A.Avatar.get()) : 'friend');
  Q.text = function (key, vars = {}) {
    let t = (window.QUEST_TEXT || {})[key];
    if (Array.isArray(t)) t = Q.pick(t);
    if (t == null) t = key;
    return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : k === 'hero' ? Q.hero() : m));
  };

  /** the text box: created in the scene's #ui on first use */
  function box() {
    let b = Q.$('qText');
    if (!b) {
      b = Q.el('div', 'q-textbox');
      b.id = 'qText';
      b.innerHTML = `<div class="q-portrait" aria-hidden="true"></div><div class="q-tbody"><p class="q-tname"></p><p class="q-tline"></p><span class="q-tmore" aria-hidden="true">${Q.keyHints ? Q.keyHints.more : '▼'}</span></div><p class="sr" aria-live="polite"></p>`;
      Q.ui.appendChild(b);
    }
    return b;
  }
  let skipNow = null;                                                  // the text box on screen: jump to its end (cutscene SKIP)
  Q.skipText = () => { if (skipNow) skipNow(); };
  Q.say = function (lines, {name = '', portrait = null} = {}) {
    lines = [].concat(lines).filter(Boolean);
    const b = box(); b.hidden = false;
    const line = b.querySelector('.q-tline'), more = b.querySelector('.q-tmore'), sr = b.querySelector('.sr');
    b.querySelector('.q-tname').textContent = name; b.querySelector('.q-tname').hidden = !name;
    const pic = b.querySelector('.q-portrait'); pic.innerHTML = ''; pic.hidden = !portrait;
    if (portrait) pic.appendChild(Q.spriteEl(portrait, {scale: 3}));
    return new Promise(done => {
      let i = -1, shown = 0, full = '', timer = 0, typing = false;
      const sp = Q.settings.get().textSpeed, cps = sp in SPEED ? SPEED[sp] : SPEED.normal;   // instant = 0
      const finishLine = () => { clearInterval(timer); typing = false; line.textContent = full; more.hidden = false; };
      const next = () => {
        i++;
        if (i >= lines.length) { off(); skipNow = null; b.removeEventListener('click', tap); b.hidden = true; done(); return; }
        full = lines[i]; shown = 0; more.hidden = true; sr.textContent = full;
        if (!cps) return finishLine();
        typing = true; line.textContent = '';
        timer = setInterval(() => {
          if (document.hidden || Q.paused) return;
          shown++;
          line.textContent = full.slice(0, shown);
          if (shown % 3 === 1 && full[shown - 1] !== ' ' && !(A.Pitch && A.Pitch.listening())) Q.sfx('quest-text');
          if (shown >= full.length) finishLine();
        }, 1000 / cps);
      };
      const advance = () => { if (typing) finishLine(); else next(); };
      const tap = e => { e.preventDefault(); advance(); };
      const off = Q.input.on(btn => { if (btn === 'a' || btn === 'b') { advance(); return true; } return true; });   // the box has the keys
      b.addEventListener('click', tap);
      skipNow = () => { clearInterval(timer); typing = false; i = lines.length - 1; next(); };
      next();
    });
  };
  Q.hideText = () => { const b = Q.$('qText'); if (b) b.hidden = true; };

  /* FIT INSTEAD OF CUT: a label too wide for its box shrinks a step at a time (FIT.step) down to FIT.min of its own size
     (never under FIT.floor px) until it fits on ONE line; only if it still can't, it wraps (2 lines, balanced), starting
     again from its own size and shrinking until the lines fit the box. Never an ellipsis, never a cut letter (style.css
     gives the pixel font's tall glyphs room: line-height + a little padding). Every `.q-fit` element is refit when the
     game resizes (core.js resize) and when a font arrives. */
  const FIT = {step: 0.92, min: 0.65, floor: 9};
  Q.FIT = FIT;
  Q.fitText = function (el) {
    if (!el || !el.isConnected) return;
    el.classList.add('q-fit');
    const box = el.closest('.q-btn'), sub = box && box.querySelector(':scope > small');
    el.style.fontSize = ''; el.classList.remove('q-wrap2'); if (sub) sub.style.fontSize = '';
    if (!el.clientWidth) return;                                      // hidden: fitted when it shows (the next resize)
    const px = e => parseFloat(getComputedStyle(e).fontSize) || 12;
    const base = px(el), min = Math.min(base, Math.max(FIT.floor, base * FIT.min));
    const wide = () => el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5;
    // a fixed-height button (the battle's) must hold the label AND its description
    const tall = () => !!box && (box.scrollHeight > box.clientHeight + 0.5 || box.scrollWidth > box.clientWidth + 0.5);
    const shrink = (e, from, to, bad) => { let v = from; while (bad() && v * FIT.step >= to) { v *= FIT.step; e.style.fontSize = v + 'px'; } return v; };
    // 1. one line, a step smaller at a time; 2. still too wide: two lines, from its own size again
    let size = shrink(el, base, min, wide);
    if (wide()) {
      const lines = () => { const c = getComputedStyle(el); return Math.round((el.scrollHeight - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom)) / parseFloat(c.lineHeight)); };
      el.classList.add('q-wrap2'); el.style.fontSize = ''; size = shrink(el, base, min * 0.85, () => wide() || lines() > 2);
    }
    if (!tall()) return;
    // 3. the button overflows: the description gets smaller first, then the label
    if (sub) { const sb = px(sub); shrink(sub, sb, Math.min(sb, Math.max(FIT.floor * 0.8, sb * FIT.min)), tall); }
    shrink(el, size, min * 0.85, tall);
  };
  Q.refit = root => (root || document).querySelectorAll('.q-fit').forEach(Q.fitText);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => Q.refit());

  Q.menu = function (el, items, {cols = items.length, onPick, onBack, cls = '', label = 'Menu', start = 0, keys = true} = {}) {
    el.innerHTML = '';
    const grid = Q.el('div', 'q-menu ' + cls); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', label);
    grid.style.setProperty('--cols', cols);
    const btns = items.map((it, i) => {
      const b = Q.el('button', 'q-btn' + (it.cls ? ' ' + it.cls : ''), `<span class="q-bl">${it.label}</span>${it.sub ? `<small>${it.sub}</small>` : ''}`);
      b.type = 'button'; b.disabled = !!it.disabled; if (it.title) b.title = it.title;
      b.addEventListener('click', () => { if (!b.disabled) pick(i); });
      b.addEventListener('focus', () => { cur = i; engaged = true; mark(); });
      // THE MOUSE MOVES THE SELECTION (never a hovered box and a different selected one); a disabled button can't be it
      b.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch' || b.disabled || !live || cur === i) return;
        cur = i; engaged = true; mark();
        if (keys) b.focus({preventScroll: true});
      });
      grid.appendChild(b); return b;
    });
    el.appendChild(grid);
    btns.forEach(b => Q.fitText(b.querySelector('.q-bl')));
    requestAnimationFrame(() => btns.forEach(b => Q.fitText(b.querySelector('.q-bl'))));   // after a panel finishes laying out
    let cur = Math.max(0, Math.min(start, items.length - 1)), live = true, engaged = false;
    // ONE selection (style.css .q-btn.sel): shown from the start in a keyboard menu, in a tap-only menu once the mouse
    // or Tab reaches it
    const mark = () => btns.forEach((b, k) => b.classList.toggle('sel', (keys || engaged) && k === cur));
    const move = d => {
      for (let k = 1; k <= items.length; k++) {
        const n = (cur + d * k + items.length * 4) % items.length;
        if (!items[n].disabled) { cur = n; break; }
        if (Math.abs(d) > 1) break;
      }
      btns[cur].focus({preventScroll: true}); mark(); Q.sfx('quest-move');
    };
    function pick(i) { if (!live) return; Q.sfx('quest-select'); if (onPick) onPick(items[i], i); }
    const off = !keys ? () => {} : Q.input.on(btn => {
      if (!live) return false;
      if (btn === 'left') move(-1); else if (btn === 'right') move(1);
      else if (btn === 'up') move(-cols); else if (btn === 'down') move(cols);
      else if (btn === 'a') { if (!items[cur].disabled) pick(cur); }
      else if (btn === 'b') { if (onBack) onBack(); }
      return true;
    });
    if (items[cur] && items[cur].disabled) { const k = items.findIndex(x => !x.disabled); if (k >= 0) cur = k; }
    mark();
    setTimeout(() => { if (live && keys && btns[cur] && !document.body.classList.contains('ui-modal')) btns[cur].focus({preventScroll: true}); }, 30);   // never out of a panel opened on top meanwhile (Backup)
    return {el: grid, destroy() { live = false; off(); grid.remove(); }, get index() { return cur; }};
  };
})(window.Arcade);
