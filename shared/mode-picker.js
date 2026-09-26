/* Band Arcade: the NOTES × ORDER picker every note-reading game shows on its level-select screen.
   Needs scales.js and sequences.js (and games.js for each game's maxStars). Replaces the old RANDOM NOTES /
   SCALES toggle (the old shared/modes.js).

     const picker = Arcade.ModePicker.mount(el, {gameId, group, member, levels, onChange});
     picker.state = {notes, order, member, group, scale, progressKey, label}
       notes  'first5' | 'Bb' | 'Eb' | 'F' | 'Ab' | 'chrom'      order  'random' | 'order'
       scale  the built scale for scale/chromatic pools (Scales.build), else null
       progressKey  where this combination's stars live (Arcade.progressKey)
       label  one line explaining the choice ("Random notes from Concert E♭ (your F Major)")
     group, member: the player group and instrument member (default: the saved player). Chime Heist passes its bells.
     memory: where the choice is remembered (default gameId; Neon Face-Off keeps one per player: 'neon-face-off:p2').
     stars: false hides the star totals (a game whose stars aren't per NOTES × ORDER, like Neon Face-Off).
     keySuffix: a function returning text added to every progress key the stars are read from (Showtime
       Malfunction's EXTRA SPOOKY: () => ':extra'); max: the stars shown per combination (default games.js maxStars).
       The game saves under picker.state.progressKey + that suffix itself; call picker.refresh() when it changes.
   The last NOTES + ORDER choice is remembered per game (Arcade.store.noteMode). The NOTES buttons show each
   combination's stars for the chosen ORDER, out of the game's maxStars from games.js ("E♭ ★ 9/24").

   Helpers for the games:
     ModePicker.sequence(state, L, lv)  Arcade.buildSequence for level lv (L = its row in levels.js)
     ModePicker.hubCard(state)          {cap, sub, html}: the notes of the chosen pool on a staff
     ModePicker.levelText(state, L, lv, extra)  a level's description: the game's own blurb for First 5 + Random
                                        (as always), else what this level plays + the game's extra parts
     ModePicker.useRange(state)         the pitch detector's range: the member's whole range except in First 5
     ModePicker.demoSpace(fn)           ?demo: holding Space "plays" fn() (a sounding midi) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const S = A.Scales, {noteLabel} = A.music;
  const nm = n => `${noteLabel(n)}${n.oct}`;

  function mount(el, {gameId, group, member, levels, onChange, memory = gameId, stars: showStars = true, keySuffix = () => '', max: maxOpt}) {
    const uid = memory.replace(/[^a-z0-9]/gi, '-');
    const state = {notes: 'first5', order: 'random', member: null, group: null, scale: null, progressKey: gameId, label: ''};
    const game = (A.GAMES || []).find(g => g.id === gameId);
    const max = maxOpt || (game && game.maxStars ? game.maxStars : levels * 3);

    function compute() {
      const saved = A.store.noteMode(memory);
      state.group = group || A.currentInstrument();
      state.member = member || A.currentMember();
      state.notes = A.NOTE_CHOICES.some(n => n.id === saved.notes) ? saved.notes : 'first5';
      state.order = saved.order === 'order' ? 'order' : 'random';
      state.scale = state.notes === 'first5' ? null : S.build(state.member, state.notes);
      state.progressKey = A.progressKey(gameId, state.notes, state.order);
      state.label = explain(state);
    }
    function render() {
      compute();
      const g = state.group;
      el.innerHTML =
        `<div class="mp" role="group" aria-label="Game mode">` +
        `<div class="mp-row"><span class="mp-lbl" id="mpNotes-${uid}">Notes</span><div class="mp-notes" role="group" aria-labelledby="mpNotes-${uid}">` +
        A.NOTE_CHOICES.map(c => {
          const stars = A.store.totalStars(A.progressKey(gameId, c.id, state.order) + keySuffix(), game && game.byMember ? state.member.id : g.id);   // games.js byMember: saved per member
          const sc = c.id === 'first5' || c.id === 'chrom' ? null : S.build(state.member, c.id);
          const sub = c.id === 'first5' ? g.notes.map(noteLabel).join(' ') : c.id === 'chrom' ? 'Full range' : 'your ' + sc.key;
          const name = c.id === 'first5' || c.id === 'chrom' ? c.short : 'Concert ' + c.short;
          return `<button type="button" class="mp-note${c.id === 'first5' || c.id === 'chrom' ? ' wide' : ''}" data-notes="${c.id}" aria-pressed="${c.id === state.notes}" ` +
            `aria-label="${name}${sc ? ', your ' + sc.key : ''}${showStars ? `. ${stars} of ${max} stars` : ''}">` +
            `<b>${c.short}</b><small>${sub}</small>${showStars ? `<span class="mp-stars"><span aria-hidden="true">★</span> ${stars}/${max}</span>` : ''}</button>`;
        }).join('') + `</div></div>` +
        `<div class="mp-row"><span class="mp-lbl" id="mpOrder-${uid}">Order</span><div class="mp-order" role="group" aria-labelledby="mpOrder-${uid}">` +
        A.ORDER_CHOICES.map(o => `<button type="button" class="mp-ord" data-order="${o.id}" aria-pressed="${o.id === state.order}">${o.label}</button>`).join('') +
        `</div></div><p class="mp-say" aria-live="polite">${state.label}</p></div>`;
      el.querySelectorAll('[data-notes]').forEach(b => b.addEventListener('click', () => { A.store.setNoteMode(memory, {notes: b.dataset.notes}); update(b); if (A.Sfx) A.Sfx.event('ui-toggle'); }));
      el.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => { A.store.setNoteMode(memory, {order: b.dataset.order}); update(b); if (A.Sfx) A.Sfx.event('ui-toggle'); }));
    }
    function update(btn) {
      const k = btn && [...btn.attributes].find(a => /^data-(notes|order)$/.test(a.name));
      render();
      if (k) { const again = el.querySelector(`[${k.name}="${k.value}"]`); if (again) again.focus(); }   // keep keyboard focus
      onChange(state);
    }
    render();
    return {state, refresh: render};
  }

  /** one line saying what the current choice plays */
  function explain(st) {
    const g = st.group, sc = st.scale, random = st.order === 'random';
    if (st.notes === 'first5') return random ? `Random notes from your first five (${g.notes.map(noteLabel).join(' ')})` : `Your first five notes in order, up and down`;
    if (st.notes === 'chrom') {
      const lo = sc.up[0], hi = sc.up[sc.up.length - 1];
      return random ? `Random notes from your whole chromatic range (${nm(lo)} to ${nm(hi)})` : `Chromatic, ${nm(lo)} up to ${nm(hi)} and back down`;
    }
    return random ? `Random notes from ${sc.label}` : `${sc.label}, up and down in order`;
  }

  const sequence = (st, L, lv) => A.buildSequence({member: st.member, group: st.group, notes: st.notes, order: st.order, level: lv, count: L.count, pool: L.pool});

  /** a level's description */
  function levelText(st, L, lv, extra = []) {
    if (st.notes === 'first5' && st.order === 'random') return L.blurb;
    const seq = sequence(st, L, lv), len = st.order === 'order' ? (st.notes === 'first5' ? 9 : st.scale.notes.length) : 0;
    const what = st.order === 'order' ? (seq.items.length > len ? 'Up and down, then again.' : 'Up and down once.')
      : st.notes === 'first5' ? (seq.small ? 'First three notes, random.' : 'All five notes, random.')
      : st.notes === 'chrom' ? (seq.small ? `One octave from ${noteLabel(seq.pool[0].n)}, random.` : 'Your whole range, random.')
      : (seq.small ? 'The first five notes of the scale, random.' : 'The whole scale, random.');
    return [what, ...extra].filter(Boolean).join(' ');
  }

  /** the staff card at the top of a level screen: the chosen pool */
  function hubCard(st) {
    const sc = st.scale, m = st.member, g = st.group, lab = n => noteLabel(n);
    if (!sc) return {cap: 'Your first five notes', sub: 'Concert ' + g.concertLabel, html: A.fiveNoteStaff(g)};
    if (sc.id === 'chrom') {
      const lo = sc.up[0], hi = sc.up[sc.up.length - 1];
      return {cap: `Chromatic: ${nm(lo)} up to ${nm(hi)}`, sub: `${sc.up.length} notes`,
        html: A.staffSVG(m.clef, [{n: lo, x: 150, caption: 'Lowest ' + lab(lo)}, {n: hi, x: 290, caption: 'Highest ' + lab(hi)}],
          {label: `Chromatic scale from ${lab(lo)} to ${lab(hi)}`})};
    }
    const x0 = 84 + A.keySigWidth(sc.sig), step = (392 - x0) / sc.up.length;
    return {cap: sc.label, sub: st.order === 'order' ? 'Up and down, 15 notes' : 'Random notes from the scale',
      html: A.staffSVG(m.clef, sc.up.map((n, i) => ({n: n.show, x: x0 + step * (i + .5), caption: lab(n)})),
        {keySig: sc.sig, label: `${sc.label}: ` + sc.up.map(lab).join(', ')})};
  }

  /** the member's whole range for scale and chromatic pools; the games' default for First 5 */
  function useRange(st) {
    if (st.notes !== 'first5') A.Pitch.setRange(st.member.soundLow, st.member.soundHigh);
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

  A.ModePicker = {mount, sequence, levelText, hubCard, useRange, demoSpace, explain};
})(window.Arcade);
