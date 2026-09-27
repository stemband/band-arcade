/* THE ECHO FLOW (shared by Lost Signal and Vanishing Ink): the student plays a short pattern back, note by note.
   A row of answer SLOTS, one per note: each note heard fills the next slot, right or wrong, and the game moves on;
   a slot with no note for `slotMs` counts as missed. Then the pattern is drawn on a staff with the results marked
   (right = gold, wrong = coral + "you played D", missed = coral in a dotted box).

     const echo = Arcade.Echo.create({
       slots,              the element that holds the slots (each is <div class="slot">, styled by the game)
       slotHTML,           (optional) what goes inside each slot
       timer,              (optional) the slot clock's bar: an element whose first child is scaled from 1 to 0
       slotMs,             time for each note before its slot counts as missed
       running(),          true while the clock should run (the game is listening for the echo)
       answering(),        true while the current slot should be highlighted (.cur)
       pauseSuppressed,    true = the clock also stops while Pitch.isSuppressed() (a sound is muting the mic)
       sounds: {ok, bad},  the tiny sounds for a right / wrong note (no sound for a missed one)
       onFill(i, r),       after slot i is filled (r = {pc, ok}; pc null = missed)
       onMark(item),       after the highlight moves (item = the note wanted now, or undefined)
       onDone(res),        after the last slot is filled
     });
     echo.begin(pattern)   a new pattern (items with .pc): draws empty slots
     echo.start()          start answering (the first slot, or the current one again after a pause): resets its clock
     echo.fill(pc)         the student played pc (a concert pitch class); null = missed
     echo.mark()           redraws the highlight;  echo.pulse(i) = a short glow on slot i
     echo.i, echo.res, echo.pattern, echo.want()   where the echo is (i = -1 before start)

     Arcade.Echo.input({enabled, onNote})   listens for notes: each new articulation (Pitch.onAttack, with its pitch)
       calls onNote(pc, time); a held note (Pitch.onHeld) counts too when no attack was heard for it within 700 ms
       (soft entries), so a long note is ONE note and a repeated note needs a new attack. Returns {reset()}.

     Arcade.Echo.drawResult(el, {clef, pattern, res, sig, fit, name, gap, minW, label, idPrefix, plain})   the pattern
       on the staff, in the student's written pitch (items' .show and .label), results marked; name(pc) = how to spell
       a wrong note. plain: true = the same layout with no names and no marks (Vanishing Ink's scroll while studying);
       each note is a <g id="<idPrefix><k>"> (default 'rn'). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const GOLD = '#c98a12', CORAL = '#d0503f';            // the same found / missed colors as the other games

  function create(o) {
    const slotHTML = o.slotHTML || '';
    const E = {
      pattern: [], i: -1, res: [], slotStart: 0,
      want() { return E.pattern[E.i]; },
      begin(pattern) {
        E.pattern = pattern; E.i = -1; E.res = [];
        const n = pattern.length;
        o.slots.innerHTML = Array.from({length: n}, (_, k) => `<div class="slot" role="listitem" aria-label="Note ${k + 1}">${slotHTML}</div>`).join('');
        o.slots.style.setProperty('--n', n);
      },
      start() {
        if (E.i < 0) E.i = 0;
        E.slotStart = performance.now();
        E.mark();
      },
      mark() {
        const on = !o.answering || o.answering();
        [...o.slots.children].forEach((s, k) => s.classList.toggle('cur', on && k === E.i));
        if (o.onMark) o.onMark(E.pattern[E.i]);
      },
      pulse(k) {
        const s = o.slots.children[k]; if (!s) return;
        s.classList.remove('rx'); void s.offsetWidth; s.classList.add('rx');
      },
      /** fill the current slot (pc = what was played; null = the time ran out) and move on */
      fill(pc) {
        const k = E.i, want = E.pattern[k];
        if (!want) return;
        const ok = pc === want.pc, r = {pc, ok};
        E.res[k] = r;
        const s = o.slots.children[k];
        s.classList.remove('cur'); s.classList.add(pc == null ? 'miss' : ok ? 'ok' : 'bad');
        s.setAttribute('aria-label', `Note ${k + 1}: ${pc == null ? 'missed' : ok ? 'right' : 'wrong'}`);
        if (pc != null && o.sounds) A.Sfx.event(ok ? o.sounds.ok : o.sounds.bad);   // tiny, unpitched: allowed while listening
        E.i++;
        if (o.onFill) o.onFill(k, r);
        if (E.i >= E.pattern.length) { if (o.onDone) o.onDone(E.res); return; }
        E.slotStart = performance.now();
        E.mark();
      },
    };
    /* the slot clock: slotMs for each note (paused while the tab is hidden, and while a sound mutes the mic if asked) */
    let lastTick = performance.now();
    const bar = () => o.timer && o.timer.firstElementChild;
    setInterval(() => {
      const now = performance.now(), dt = now - lastTick; lastTick = now;
      if (!o.running()) { if (bar()) bar().style.transform = 'scaleX(0)'; return; }
      if (document.hidden || (o.pauseSuppressed && A.Pitch.isSuppressed(now))) { E.slotStart += dt; return; }
      const frac = 1 - (now - E.slotStart) / o.slotMs;
      if (bar()) { bar().style.transform = `scaleX(${Math.max(0, frac)})`; o.timer.classList.toggle('low', frac < .3); }
      if (frac <= 0) E.fill(null);
    }, 100);
    return E;
  }

  /** notes from the microphone: new attacks, and held notes no attack was heard for (soft entries) */
  function input(o) {
    let lastIn = null;
    A.Pitch.onAttack(a => {
      if (a.pc == null || !o.enabled()) return;
      lastIn = {pc: a.pc, t: performance.now()};
      o.onNote(a.pc, a.time);
    });
    A.Pitch.onHeld((pc, now) => {
      if (!o.enabled()) return;
      if (lastIn && lastIn.pc === pc && performance.now() - lastIn.t < 700) return;   // the note an attack already counted
      lastIn = {pc, t: performance.now()};
      o.onNote(pc, now);
    });
    return {reset() { lastIn = null; }};
  }

  /** the pattern on the staff with its results: right = gold, wrong = coral + what they played, missed = coral in a
      dotted box. res[k] = {pc, ok} (missing = not played yet: drawn as missed) */
  function drawResult(el, o) {
    const pattern = o.pattern, n = pattern.length, sig = o.sig, sigW = A.keySigWidth(sig), gap = o.gap || 66;
    const W = Math.max(88 + sigW + n * gap + 16, o.minW || 520);
    const start = (W - n * gap) / 2 + sigW / 2 + 20;                     // centered after the clef and key signature
    const ids = o.idPrefix || 'rn';
    const items = pattern.map((it, k) => ({n: it.show, x: start + k * gap + gap / 2, id: ids + k}));
    let svg = A.staffSVG(o.clef, items, {fit: o.fit, keySig: sig, width: W, captions: true, label: o.label || 'The pattern on the staff'});
    const m = svg.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/), vy = +m[2], vh = +m[4] + 22;
    svg = svg.replace(m[0], `viewBox="${m[1]} ${vy} ${m[3]} ${vh}"`);
    const capY = vy + vh - 30, font = `font-family='"GN Text",system-ui,sans-serif' font-weight="700" text-anchor="middle"`;
    let extra = '';
    if (o.plain) { el.innerHTML = svg; return {items, W}; }
    pattern.forEach((it, k) => {
      const r = o.res[k] || {pc: null, ok: false}, x = items[k].x, y = A.noteY(o.clef, it.show);
      extra += `<text x="${x}" y="${capY}" ${font} font-size="17" fill="${r.ok ? GOLD : CORAL}">${it.label}</text>`;
      if (!r.ok && r.pc != null) extra += `<text x="${x}" y="${capY + 18}" ${font} font-size="12" fill="${CORAL}">you played ${o.name(r.pc)}</text>`;
      if (r.pc == null) extra += `<rect x="${x - 17}" y="${y - 13}" width="34" height="26" rx="8" fill="none" stroke="${CORAL}" stroke-width="2" stroke-dasharray="4 3"/>` +
        `<text x="${x}" y="${capY + 18}" ${font} font-size="12" fill="${CORAL}">missed</text>`;
    });
    el.innerHTML = svg.replace('</svg>', extra + '</svg>');
    pattern.forEach((it, k) => A.colorNote(ids + k, (o.res[k] || {}).ok ? GOLD : CORAL));
    return {items, W};
  }

  A.Echo = {create, input, drawResult, GOLD, CORAL};
})(window.Arcade);
