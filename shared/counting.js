/* THE COUNTING (Mr. Graham's counting system), shared by any game that shows rhythms: Rhythm Dojo today.
   Plain data in, plain data out (no DOM): shared/rhythm-staff.js draws it under a one-line staff.

   RHYTHMS AS TEXT (what levels.js and the Counting Board write):
     values   w (whole) · h (half) · q (quarter) · e (eighth) · s (sixteenth), then . for a dot (q. = dotted quarter)
     rests    the same + r: qr, hr, er, sr, wr, h.r (a dotted half rest)
     ties     _ after a note ties it to the next note: h_ | q  (within a measure or across a bar line)
     triplets [e e e] = three eighths in the time of two (also [q e], [e er e], [e q])
     bars     | between measures (checked: every measure must add up to the time signature)
     example  '4/4' + 'q. e q qr | h h'
   Times: '4/4', '3/4', '2/4', '6/8'. Everything is counted in TICKS: a quarter = 12 (an eighth 6, a sixteenth 3, a
   triplet eighth 4), so 6/8's eighth-note beat = 6 ticks.

   THE SYLLABLES
     quarters   1 2 3 4               eighths    1 & 2 & 3 & 4 &
     sixteenths 1 e & a 2 e & a …     triplets   1 la le 2 la le …
     3/4 and 2/4: the same with fewer beats.
     6/8: the EIGHTH gets the beat, counted 1 2 3 4 5 6; sixteenths in 6/8 are 1 & 2 & 3 & 4 & 5 & 6 &.

   THE RULE: every note's STARTING syllable full size, then SMALL raised syllables (like exponents) for every grid point it
   is held through, strictly between its start and its end; only the small ones are underlined (one line under the
   group). The grid for a note's small syllables = the COARSEST grid (quarter → eighth → sixteenth; the triplet grid for
   triplet rhythms) on which both its start and its end fall. A TIE chain is ONE note (it keeps counting across the bar
   line in the next measure's syllables). A REST is counted the same way, the whole group in parentheses: (2), (3⁴), (&).

     Arcade.Counting.parse(text, time)  -> {time, meter, notes, measures, total, errors}
         notes: [{i, t, d, rest, tie, dots, val, trip, measure}] (t/d in ticks; trip = the triplet group's number)
     Arcade.Counting.groups(parsed)     -> [{g, notes: [i…], t, end, rest, big, bigT, small: [{text, t}], grid}]
     Arcade.Counting.syllable(t, meter) -> '1' | '&' | 'e' | 'a' | 'la' | 'le'
     Arcade.Counting.text(groups)       -> '1^(& 2) & (3^(4))'  (plain text: ^( ) = the small, underlined syllables)
     Arcade.Counting.meter(time)        -> {num, den, beat, per, grids, tpq}
     Arcade.Counting.TPQ = 12 */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const TPQ = 12;
  const VAL = {w: 48, h: 24, q: 12, e: 6, s: 3};

  function meter(time) {
    const [num, den] = String(time || '4/4').split('/').map(Number);
    const compound = den === 8;
    const beat = compound ? 6 : 12;                         // 6/8: the eighth note gets the beat
    return {time: `${num}/${den}`, num, den, beat, per: num * (den === 8 ? 6 : 12), compound,
      grids: compound ? [6, 3] : [12, 6, 4, 3], tpq: TPQ};
  }

  /* one token: 'q', 'q.', 'qr', 'h.r', 'e_', 'q._' */
  const TOK = /^([whqes])(\.{0,2})(r?)(_?)$/;
  function parse(text, time) {
    const M = meter(time), notes = [], errors = [];
    let t = 0, trip = 0, inTrip = false, measure = 0, barAt = 0;
    const src = String(text).replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').replace(/\|/g, ' | ').trim().split(/\s+/).filter(Boolean);
    const bar = () => {
      if (t - barAt !== M.per) errors.push(`Measure ${measure + 1} has ${(t - barAt) / TPQ} quarter notes' worth, not ${M.per / TPQ}.`);
      measure++; barAt = t;
    };
    for (const tok of src) {
      if (tok === '[') { inTrip = true; trip++; continue; }
      if (tok === ']') { inTrip = false; continue; }
      if (tok === '|') { bar(); continue; }
      const m = TOK.exec(tok);
      if (!m) { errors.push(`I can't read "${tok}".`); continue; }
      let d = VAL[m[1]], add = d / 2;
      for (let k = 0; k < m[2].length; k++) { d += add; add /= 2; }
      if (inTrip) d = d * 2 / 3;
      if (d !== Math.round(d)) { errors.push(`"${tok}" doesn't fit the tick grid.`); d = Math.round(d); }
      notes.push({i: notes.length, t, d, rest: !!m[3], tie: !!m[4] && !m[3], dots: m[2].length, val: m[1], trip: inTrip ? trip : 0, measure});
      t += d;
    }
    if (t > barAt) bar();
    // a tie must lead to a note
    notes.forEach((n, k) => { if (n.tie && (!notes[k + 1] || notes[k + 1].rest)) { n.tie = false; errors.push(`Note ${k + 1} is tied to nothing.`); } });
    return {time: M.time, meter: M, notes, measures: measure, total: t, errors};
  }

  const NAMES4 = {0: null, 6: '&', 3: 'e', 9: 'a', 4: 'la', 8: 'le'};
  const NAMES8 = {0: null, 3: '&'};
  function syllable(t, M) {
    const r = ((t % M.per) + M.per) % M.per, beat = Math.floor(r / M.beat) + 1, w = r % M.beat;
    const n = (M.compound ? NAMES8 : NAMES4)[w];
    return n === undefined ? '·' : n === null ? String(beat) : n;
  }
  /* the coarsest grid both ends fall on */
  function gridFor(t, end, M) {
    for (const g of M.grids) if (t % g === 0 && end % g === 0) return g;
    return M.grids[M.grids.length - 1];
  }

  function groups(p) {
    const M = p.meter, out = [];
    for (let k = 0; k < p.notes.length; k++) {
      const first = p.notes[k], ids = [k];
      let end = first.t + first.d;
      while (!first.rest && p.notes[ids[ids.length - 1]].tie && p.notes[ids[ids.length - 1] + 1]) {
        const nx = p.notes[ids[ids.length - 1] + 1]; ids.push(nx.i); end = nx.t + nx.d;
      }
      const grid = gridFor(first.t, end, M), small = [];
      for (let x = first.t + grid; x < end; x += grid) small.push({text: syllable(x, M), t: x});
      out.push({g: out.length, notes: ids, t: first.t, end, rest: first.rest, big: syllable(first.t, M), bigT: first.t, small, grid});
      k = ids[ids.length - 1];
    }
    return out;
  }

  const one = g => g.big + (g.small.length ? `^(${g.small.map(s => s.text).join(' ')})` : '');
  const text = gs => gs.map(g => g.rest ? `(${one(g)})` : one(g)).join(' ');

  A.Counting = {TPQ, VAL, meter, parse, groups, syllable, gridFor, text,
    /** a rhythm's notes to attack: every non-rest group = one attack {t, end, g} */
    attacks: gs => gs.filter(g => !g.rest).map(g => ({t: g.t, end: g.end, g: g.g}))};
})(window.Arcade);
