/* ARCADE QUEST ENGINE: the text box and menus (HTML over the canvas, in the pixel font).
   Q.say(lines, {name, portrait})   show lines one at a time in the white-bordered text box, typed out at the TEXT SPEED
                                    setting. Tap/click the box, A (Enter/Space) or B to finish the line, again for the
                                    next one. Resolves when the last line is dismissed. portrait: a sprite id.
   Q.menu(el, items, {cols, onPick, onBack, cls, keys})   big pixel buttons in a grid: arrows/D-pad move, A picks, B backs;
                                    taps and clicks pick directly. keys: false = taps, clicks and Tab only (a second menu). items: [{id, label, sub, disabled, title}].
   Q.text(key, vars)                a battle message from data/battle-text.js, with {name} placeholders filled in. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const SPEED = {slow: 22, normal: 42, fast: 90, instant: 0};         // letters per second

  Q.text = function (key, vars = {}) {
    let t = (window.QUEST_TEXT || {})[key];
    if (Array.isArray(t)) t = Q.pick(t);
    if (t == null) t = key;
    return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  };

  /** the text box: created in the scene's #ui on first use */
  function box() {
    let b = Q.$('qText');
    if (!b) {
      b = Q.el('div', 'q-textbox');
      b.id = 'qText';
      b.innerHTML = '<div class="q-portrait" aria-hidden="true"></div><div class="q-tbody"><p class="q-tname"></p><p class="q-tline"></p><span class="q-tmore" aria-hidden="true">▼</span></div><p class="sr" aria-live="polite"></p>';
      Q.ui.appendChild(b);
    }
    return b;
  }
  Q.say = function (lines, {name = '', portrait = null} = {}) {
    lines = [].concat(lines).filter(Boolean);
    const b = box(); b.hidden = false;
    const line = b.querySelector('.q-tline'), more = b.querySelector('.q-tmore'), sr = b.querySelector('.sr');
    b.querySelector('.q-tname').textContent = name; b.querySelector('.q-tname').hidden = !name;
    const pic = b.querySelector('.q-portrait'); pic.innerHTML = ''; pic.hidden = !portrait;
    if (portrait) pic.appendChild(Q.spriteEl(portrait, {scale: 2}));
    return new Promise(done => {
      let i = -1, shown = 0, full = '', timer = 0, typing = false;
      const cps = SPEED[Q.settings.get().textSpeed] || SPEED.normal;
      const finishLine = () => { clearInterval(timer); typing = false; line.textContent = full; more.hidden = false; };
      const next = () => {
        i++;
        if (i >= lines.length) { off(); b.removeEventListener('click', tap); b.hidden = true; done(); return; }
        full = lines[i]; shown = 0; more.hidden = true; sr.textContent = full;
        if (!cps) return finishLine();
        typing = true; line.textContent = '';
        timer = setInterval(() => {
          if (document.hidden) return;
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
      next();
    });
  };
  Q.hideText = () => { const b = Q.$('qText'); if (b) b.hidden = true; };

  Q.menu = function (el, items, {cols = items.length, onPick, onBack, cls = '', label = 'Menu', start = 0, keys = true} = {}) {
    el.innerHTML = '';
    const grid = Q.el('div', 'q-menu ' + cls); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', label);
    grid.style.setProperty('--cols', cols);
    const btns = items.map((it, i) => {
      const b = Q.el('button', 'q-btn' + (it.cls ? ' ' + it.cls : ''), `<span class="q-bl">${it.label}</span>${it.sub ? `<small>${it.sub}</small>` : ''}`);
      b.type = 'button'; b.disabled = !!it.disabled; if (it.title) b.title = it.title;
      b.addEventListener('click', () => { if (!b.disabled) pick(i); });
      b.addEventListener('focus', () => { cur = i; mark(); });
      grid.appendChild(b); return b;
    });
    el.appendChild(grid);
    let cur = Math.max(0, Math.min(start, items.length - 1)), live = true;
    const mark = () => btns.forEach((b, k) => b.classList.toggle('sel', keys && k === cur));
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
    setTimeout(() => { if (live && keys && btns[cur]) btns[cur].focus({preventScroll: true}); }, 30);
    return {el: grid, destroy() { live = false; off(); grid.remove(); }, get index() { return cur; }};
  };
})(window.Arcade);
