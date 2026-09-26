/* Band Arcade — RANDOM NOTES / SCALES for every game's level-select screen.
   Needs scales.js. A game calls:
     const picker = Arcade.Modes.mount(el, {gameId, inst, levels: LEVELS.length, onChange: redrawHub});
   and reads picker.state:
     mode         'random' | 'scales'
     scale        the built scale (Arcade.Scales.build) in SCALES mode once an instrument is known, else null
     member       the instrument member (Note Checker's "Which instrument do you play?" setting)
     progressKey  where to save stars: the plain game id in RANDOM mode (existing stars stay put),
                  '<gameId>:scale-<id>' in SCALES mode
     ready        false while SCALES is waiting for the instrument choice (show no levels yet)
   Helpers: Modes.nameFor(inst, scale) -> pc => note name spelled for the key; Modes.useRange(state) sets
   the pitch detector's range (the member's full range in SCALES mode, the games' default otherwise);
   Modes.demoSpace(fn): in ?demo, holding Space "plays" fn() (a sounding midi), for testing scales. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const S = A.Scales;

  function mount(el, {gameId, inst, levels, onChange}) {
    const state = {mode: 'random', scale: null, member: null, progressKey: gameId, ready: true};
    const saved = A.store.gameMode(gameId);

    function compute() {
      state.mode = saved.mode === 'scales' ? 'scales' : 'random';
      state.member = A.getMember(inst, A.store.memberFor(inst.id));
      state.ready = state.mode === 'random' || !!state.member;
      state.scale = state.mode === 'scales' && state.member ? S.build(state.member, saved.scale) : null;
      state.progressKey = state.scale ? S.progressKey(gameId, state.scale.id) : gameId;
    }

    function render() {
      compute();
      const max = levels * 3;
      let h = `<div class="mode-toggle" role="group" aria-label="Game mode">` +
        `<button type="button" class="mode-big" data-mode="random" aria-pressed="${state.mode === 'random'}">Random notes</button>` +
        `<button type="button" class="mode-big" data-mode="scales" aria-pressed="${state.mode === 'scales'}">Scales</button></div>`;
      if (state.mode === 'scales') {
        if (!state.member) {
          h += `<section class="member-pick" aria-labelledby="mpQ"><h2 id="mpQ">Which instrument do you play?</h2>` +
            `<p class="muted">Your scales are written a little differently for each one.</p><div class="member-btns">` +
            inst.members.map(m => `<button type="button" class="btn member-btn" data-member="${m.id}">${m.name}</button>`).join('') + `</div></section>`;
        } else {
          if (inst.members.length > 1) h += `<p class="playing">Playing: <b>${state.member.name}</b> <button type="button" class="linkish" data-change>change</button></p>`;
          h += `<div class="scale-btns" role="group" aria-label="Choose a scale">` + S.LIST.map(s => {
            const sc = S.build(state.member, s.id), stars = A.store.totalStars(S.progressKey(gameId, s.id), inst.id);
            return `<button type="button" class="scale-btn" data-scale="${s.id}" aria-pressed="${s.id === state.scale.id}" aria-label="${sc.label}. ${stars} of ${max} stars">` +
              `<b>${sc.short}</b><small>${sc.key ? 'your ' + sc.key : 'Full range'}</small>` +
              `<span class="sb-stars"><span aria-hidden="true">★</span> ${stars}/${max}</span></button>`;
          }).join('') + `</div>`;
        }
      }
      el.innerHTML = h;
      el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { saved.mode = b.dataset.mode; A.store.setGameMode(gameId, {mode: saved.mode}); update(); }));
      el.querySelectorAll('[data-scale]').forEach(b => b.addEventListener('click', () => { saved.scale = b.dataset.scale; A.store.setGameMode(gameId, {scale: saved.scale}); update(); }));
      el.querySelectorAll('[data-member]').forEach(b => b.addEventListener('click', () => { A.store.setMember(inst.id, b.dataset.member); update(); }));
      const ch = el.querySelector('[data-change]');
      if (ch) ch.addEventListener('click', () => { A.store.setMember(inst.id, null); update(); const f = el.querySelector('.member-btn'); if (f) f.focus(); });
    }
    function update() {
      const active = document.activeElement, key = active && el.contains(active) ? [...active.attributes].find(a => /^data-(mode|scale|member)$/.test(a.name)) : null;
      render();
      if (key) { const again = el.querySelector(`[${key.name}="${key.value}"]`); if (again) again.focus(); }   // keep keyboard focus
      onChange(state);
    }
    render();
    return {state, refresh: render};
  }

  /** note names for what the mic hears: spelled like the scale's key in SCALES mode, else the group's usual names */
  function nameFor(inst, scale) {
    if (!scale) return pc => inst.writtenName(pc);
    const map = {};
    scale.notes.forEach(n => { if (!(n.pc in map)) map[n.pc] = A.music.noteLabel(n); });
    return pc => map[pc] || inst.writtenName(pc);
  }

  /** SCALES needs the member's whole range (tuba low notes, flute high ones); RANDOM keeps the games' default */
  function useRange(state) {
    if (state.scale) A.Pitch.setRange(state.member.soundLow, state.member.soundHigh);
    else A.Pitch.setRange(null);
  }

  /** ?demo: hold Space to "play" whatever fn() returns (a sounding midi, or null) */
  function demoSpace(fn) {
    if (!A.DEMO) return;
    addEventListener('keydown', e => {
      if (e.key !== ' ' || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const m = fn(); if (m == null) return;
      e.preventDefault(); A.Pitch.demoNote = m;
    });
    addEventListener('keyup', e => { if (e.key === ' ' && A.Pitch.demoNote !== null) { e.preventDefault(); A.Pitch.demoNote = null; } });
  }

  /** the staff card at the top of a level screen: {cap, sub, html} for the first five notes or the chosen scale */
  function hubCard(inst, state) {
    const sc = state.scale;
    if (!sc) return {cap: 'Your first five notes', sub: 'Concert ' + inst.concertLabel, html: A.fiveNoteStaff(inst)};
    const m = state.member, lab = n => A.music.noteLabel(n);
    if (sc.id === 'chrom') {
      const lo = sc.up[0], hi = sc.up[sc.up.length - 1];
      return {cap: `Chromatic: ${lab(lo)}${lo.oct} up to ${lab(hi)}${hi.oct} and back down`, sub: `${sc.notes.length} notes`,
        html: A.staffSVG(m.clef, [{n: lo, x: 150, caption: 'Lowest ' + lab(lo)}, {n: hi, x: 290, caption: 'Highest ' + lab(hi)}],
          {label: `Chromatic scale from ${lab(lo)} to ${lab(hi)}`})};
    }
    const x0 = 84 + A.keySigWidth(sc.sig), step = (392 - x0) / sc.up.length;
    return {cap: sc.label, sub: 'Up and down, 15 notes',
      html: A.staffSVG(m.clef, sc.up.map((n, i) => ({n: n.show, x: x0 + step * (i + .5), caption: lab(n)})),
        {keySig: sc.sig, label: `${sc.label}: ` + sc.up.map(lab).join(', ')})};
  }

  /** a level's description in SCALES mode (the random-mode blurbs talk about "the first three notes") */
  function scaleBlurb(parts) { return parts.filter(Boolean).join(' '); }

  A.Modes = {mount, nameFor, useRange, demoSpace, hubCard, scaleBlurb};
})(window.Arcade);
