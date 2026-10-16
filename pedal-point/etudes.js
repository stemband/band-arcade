/* PEDAL POINT: THE PRACTICE ETUDES (the Practice Room's play-along; docs/games/pedal-point.md). Eleven ORIGINAL etudes
   written for the game, bass clef: four for TWO drums on the C & F setup (C3 on the 26", F3 on the 23"), then seven for
   THREE and FOUR drums, each with its own tuning (`setup`).
   (The GMEA audition etude is NOT here and never may be: it is copyrighted. Students load their own copy with
   LOAD SHEET MUSIC.)

   THE FORMAT (edit freely; the tests parse every etude and check every bar adds up):
     each note   PITCH:VALUE        C:q  F:e.  (values w h q e s, . = dotted). A pitch may carry an accidental (Bb, Eb,
                                    F#: the staff draws the flat or sharp). Default octaves: C D E F = 3, G A B = 2 (C = C3,
                                    F = F3, Bb = B♭2, Eb = E♭3); any other octave is written out (F2, G3)
     a rest      -:qr               (-:hr, -:er …)
     a roll      C:h*               (three slashes on the stem; played as fast single strokes)
     a release   C:h*_ F:q          a roll that RELEASES into (is slurred to) the next note
     an accent   F:w*!              (after the roll mark)
     bars        |
   ids are SAVED (each etude's best %): never change or reorder them; add new etudes at the end.
     marks   [{m (bar, from 0), text, kind: 'dyn' | 'text', above, span}]: dynamics and words drawn with the music
     rit     {m, slow}: the tempo slows across bar m (from 0) by `slow` (.25 = to 75 %), and stays there
     setup   [[drum size (drums.js id), note], …] low to high: the drums and tuning SET UP … FOR ME tunes, and the
             "Timpani: …" tuning line over the music. No setup = the C & F preset (the first four)
     about   what the etude teaches: one short line under the etude list */
window.PP_ETUDES = [
  {id: 'warm-up', name: 'Two-Drum Warm-Up', time: '4/4', tempo: 80, about: 'two drums, steady quarters and eighths',
   music: 'C:q F:q C:q F:q | C:e C:e F:e F:e C:q -:qr | F:e F:e C:e C:e F:q -:qr | C:q F:q C:h | C:e F:e C:e F:e C:e F:e C:e F:e | F:q C:q F:q -:qr | C:e C:e F:e F:e C:e C:e F:e F:e | C:q C:q F:q -:qr',
   marks: [{m: 0, text: 'f', kind: 'dyn'}]},
  {id: 'dotted', name: 'Dotted Rhythms', time: '4/4', tempo: 76, about: 'dotted rhythms',
   music: 'C:q. C:e F:h | F:e. F:s C:q F:e. F:s C:q | C:e. C:s F:e. F:s C:q -:qr | F:q. F:e C:h | C:e. C:s F:q C:e. C:s F:q | F:e. F:s C:e. C:s F:q C:q | C:e C:e F:e. F:s C:q F:q | C:e. C:s F:q C:q -:qr',
   marks: [{m: 0, text: 'mf', kind: 'dyn'}]},
  {id: 'roll-release', name: 'Roll and Release', time: '4/4', tempo: 72, about: 'rolls and releases',
   music: 'C:h* F:h* | C:h*_ F:q -:qr | F:h*_ C:q -:qr | C:w* | F:q*_ C:q F:q*_ C:q | C:h.* F:q | F:h*_ C:q -:qr | F:w*!',
   marks: [{m: 0, text: 'p', kind: 'dyn'}, {m: 4, text: 'cresc.', kind: 'text'}, {m: 5, text: 'mf', kind: 'dyn'}, {m: 7, text: 'p', kind: 'dyn'}]},
  {id: 'big-finish', name: 'Big Finish', time: '4/4', tempo: 88, about: 'a big ending with accents and a rit.',
   music: 'C:e F:e C:e F:e C:q F:q | C:e. C:s F:e. F:s C:h*! | F:q C:q F:h*_ | C:q -:qr F:e F:e C:q | C:e C:e F:e F:e C:e C:e F:e F:e | F:h*! C:h*! | C:e F:e C:e F:e C:e F:e C:e F:e | C:q C:q F:q -:qr',
   marks: [{m: 0, text: 'f', kind: 'dyn'}, {m: 4, text: 'cresc.', kind: 'text'}, {m: 6, text: 'rit.', kind: 'text', above: true, span: true}, {m: 7, text: 'ff', kind: 'dyn'}],
   rit: {m: 6, slow: .25}},
  // ---- 3 and 4 drums (each carries `setup`: the drums and notes SET UP FOR ME tunes, low to high) ----
  {id: 'three-walk', name: 'Three-Drum Walk', time: '4/4', tempo: 84, setup: [['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: 'moving to the next drum over, both ways',
   music: 'Bb:q C:q F:q C:q | Bb:e C:e F:e C:e Bb:h | F:q C:q Bb:q -:qr | Bb:e Bb:e C:e C:e F:h | F:e C:e Bb:e C:e F:e C:e Bb:q | C:q. C:e F:q Bb:q | Bb:e C:e F:e F:e C:e C:e Bb:e Bb:e | F:q C:q Bb:h',
   marks: [{m: 0, text: 'mf', kind: 'dyn'}, {m: 4, text: 'cresc.', kind: 'text'}, {m: 6, text: 'f', kind: 'dyn'}]},
  {id: 'waltz', name: 'Waltz for Three', time: '3/4', tempo: 126, setup: [['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: '3/4, a light "oom-pah-pah," rolls, a closing rit.',
   music: 'F:q C:q C:q | F:q C:q C:q | Bb:q F:q F:q | C:h.* | F:q C:e C:e C:q | Bb:q C:e C:e C:q | C:q Bb:q C:q | F:q C:q F:q | C:q Bb:q Bb:q | C:q Bb:q Bb:q | F:q C:q C:q | F:h.* | Bb:q C:q F:q | C:q. C:e C:q | F:h*_ C:q | F:h -:qr',
   marks: [{m: 0, text: 'p', kind: 'dyn'}, {m: 4, text: 'mf', kind: 'dyn'}, {m: 8, text: 'p', kind: 'dyn'}, {m: 12, text: 'cresc.', kind: 'text'}, {m: 14, text: 'f', kind: 'dyn'}, {m: 15, text: 'rit.', kind: 'text', above: true, span: true}],
   rit: {m: 15, slow: .2}},
  {id: 'leaps', name: 'Leaps and Crossings', time: '4/4', tempo: 76, setup: [['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: 'jumping over the middle drum, 16ths, roll releases from drum to drum',
   music: 'Bb:q F:q Bb:q F:q | Bb:e F:e Bb:e F:e C:h | F:s C:s Bb:s C:s F:q F:s C:s Bb:s C:s F:q | Bb:h*_ F:q -:qr | Bb:e. F:s Bb:e. F:s C:e. Bb:s C:q | F:e Bb:e F:e Bb:e C:e F:e Bb:q | F:h*_ C:q*_ Bb:q | Bb:q F:q Bb:h*!',
   marks: [{m: 0, text: 'mf', kind: 'dyn'}, {m: 3, text: 'p', kind: 'dyn'}, {m: 4, text: 'cresc.', kind: 'text'}, {m: 6, text: 'f', kind: 'dyn'}]},
  {id: 'eb-march', name: 'March in E♭', time: '2/4', tempo: 112, setup: [['29', 'Bb2'], ['26', 'Eb3'], ['23', 'G3']],
   about: "2/4 in the band's favorite concert key, and a new tuning to set up",
   music: 'Eb:e Bb:e Eb:e Bb:e | Eb:q -:qr | Bb:e. Bb:s Eb:e. Eb:s | G3:q Eb:q | Bb:s Bb:s Eb:e Bb:s Bb:s Eb:e | G3:e Eb:e Bb:q | Eb:e G3:e Bb:e Eb:e | Eb:q! -:qr | Bb:e Bb:e Eb:e Eb:e | G3:e G3:e Eb:q | Bb:e. Bb:s Bb:e. Bb:s | Eb:q*_ Bb:q | Eb:s Eb:s Bb:e Eb:s Eb:s Bb:e | G3:e Bb:e G3:e Bb:e | Eb:e Bb:e G3:e Eb:e | Eb:q! -:qr',
   marks: [{m: 0, text: 'f', kind: 'dyn'}, {m: 4, text: 'mf', kind: 'dyn'}, {m: 8, text: 'p', kind: 'dyn'}, {m: 10, text: 'cresc.', kind: 'text'}, {m: 12, text: 'f', kind: 'dyn'}, {m: 14, text: 'cresc.', kind: 'text'}, {m: 15, text: 'ff', kind: 'dyn'}]},
  {id: 'fanfare', name: 'Four-Drum Fanfare', time: '4/4', tempo: 96, setup: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: 'big accents, dotted rhythms, runs across all four drums',
   music: 'F2:q! C:e. C:s F:q! -:qr | Bb:e. Bb:s C:e. C:s F:q F2:q | F2:e Bb:e C:e F:e F:e C:e Bb:e F2:e | F2:h*! C:q! -:qr | F:e. F:s C:e. C:s Bb:e. Bb:s F2:q | F2:e F2:e Bb:e Bb:e C:e C:e F:e F:e | F:q! C:q! Bb:q! F2:q! | F2:w*!',
   marks: [{m: 0, text: 'f', kind: 'dyn'}, {m: 5, text: 'cresc.', kind: 'text'}, {m: 7, text: 'ff', kind: 'dyn'}]},
  {id: 'rolling-hills', name: 'Rolling Hills', time: '4/4', tempo: 66, setup: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: 'slow legato rolls released from drum to drum, p < f > p, a rit.',
   music: 'F2:w* | Bb:h*_ C:h* | C:h*_ F:h* | F:w*_ | C:h*_ Bb:h* | Bb:q*_ C:q*_ Bb:q*_ F2:q | F2:h*_ C:h*_ | F2:w*',
   marks: [{m: 0, text: 'p', kind: 'dyn'}, {m: 1, text: 'cresc.', kind: 'text'}, {m: 3, text: 'f', kind: 'dyn'}, {m: 5, text: 'mf', kind: 'dyn'}, {m: 7, text: 'p', kind: 'dyn'}, {m: 7, text: 'rit.', kind: 'text', above: true, span: true}],
   rit: {m: 7, slow: .2}},
  {id: 'grand-finale', name: 'Grand Finale', time: '4/4', tempo: 104, setup: [['32', 'F2'], ['29', 'Bb2'], ['26', 'C3'], ['23', 'F3']],
   about: '16th-note runs around four drums, accents, rolls, ff, a rit.',
   music: 'F2:s Bb:s C:s F:s F:s C:s Bb:s F2:s F2:e! F2:e F:e! F:e | C:s C:s Bb:s Bb:s C:s C:s F:s F:s C:q! F2:q! | Bb:e F:e C:e F:e Bb:e F:e C:e F:e | F2:h*! F:h*! | F:s C:s Bb:s F2:s F:s C:s Bb:s F2:s F:s C:s Bb:s F2:s F:q! | F2:e. Bb:s C:e. F:s F2:e. Bb:s C:e. F:s | C:q*_ F:q*_ Bb:q*_ C:q | F2:q! F:q! F2:h*!',
   marks: [{m: 0, text: 'f', kind: 'dyn'}, {m: 3, text: 'ff', kind: 'dyn'}, {m: 4, text: 'f', kind: 'dyn'}, {m: 6, text: 'cresc.', kind: 'text'}, {m: 7, text: 'ff', kind: 'dyn'}, {m: 7, text: 'rit.', kind: 'text', above: true, span: true}],
   rit: {m: 7, slow: .2}},
];

/* Arcade.PPEtudes: the etudes as data the game can use (no DOM, no audio) */
(function (A) {
  'use strict';
  const DEFAULT_OCT = {C: 3, D: 3, E: 3, F: 3, G: 2, A: 2, B: 2};
  const TOKEN = /^(-|[A-G](?:b|#)?\d?):([whqes]\.{0,2}r?)(\*?)(_?)(!?)$/;
  /** an etude -> {etude, parsed (Arcade.Counting), notes: [{i, t, d, rest, pitch, midi, roll, release, accent, measure}],
      slurs: [[a, b]], text (the rhythm text the staff draws: rolls as ///, accents as >), errors} */
  function parse(et) {
    const errors = [], toks = [], src = String(et.music).trim().split(/\s+/);
    src.forEach(tok => {
      if (tok === '|') { toks.push({bar: true}); return; }
      const m = TOKEN.exec(tok);
      if (!m) { errors.push(`I can't read "${tok}".`); return; }
      const rest = m[1] === '-';
      if (rest !== /r$/.test(m[2])) errors.push(`"${tok}": a rest is written -:qr (and only a rest ends in r).`);
      if (rest && (m[3] || m[4] || m[5])) errors.push(`"${tok}": a rest can't be rolled, released or accented.`);
      if (m[4] && !m[3]) errors.push(`"${tok}": _ releases a ROLL into the next note (write *_).`);
      toks.push({rest, pitch: rest ? null : m[1], val: m[2], roll: !!m[3], release: !!m[4], accent: !!m[5], tok});
    });
    // the rhythm text: rolls as three slashes (drawn on the stem), accents as >
    const text = toks.map(x => x.bar ? '|' : x.val + (x.roll ? '///' : '') + (x.accent ? '>' : '')).join(' ');
    const parsed = A.Counting.parse(text, et.time || '4/4');
    errors.push(...parsed.errors);
    const ns = toks.filter(x => !x.bar);
    const notes = parsed.notes.map((n, k) => {
      const x = ns[k] || {}, p = x.pitch && pitchOf(x.pitch);
      return {i: n.i, t: n.t, d: n.d, rest: n.rest, measure: n.measure, pitch: p, midi: p ? p.midi : null,
        roll: !!x.roll, release: !!x.release, accent: !!x.accent};
    });
    const slurs = [];
    notes.forEach((n, k) => {
      if (!n.release) return;
      const nx = notes[k + 1];
      if (!nx || nx.rest) errors.push(`Note ${k + 1} releases into nothing.`); else slurs.push([n.i, nx.i]);
    });
    return {etude: et, parsed, notes, slurs, text, errors, measures: parsed.measures, total: parsed.total};
  }
  function pitchOf(s) {
    const m = /^([A-G])(b|#)?(\d)?$/.exec(s);
    if (!m) return null;
    const letter = m[1], acc = m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0, oct = m[3] ? +m[3] : DEFAULT_OCT[letter];
    return {letter, acc, oct, midi: (oct + 1) * 12 + {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[letter] + acc};
  }

  /** seconds from the etude's start for a tick, at `pct` of the marked tempo, honoring the rit. (the tempo slows linearly
      across the rit. bar to (1 − slow) of the tempo, then stays there) */
  function timer(e, pct = 1) {
    const et = e.etude, per = e.parsed.meter.per, bpm = et.tempo * pct, beatT = 12;
    const r = et.rit, b0 = r ? r.m * per / beatT : Infinity, L = per / beatT, k = r ? r.slow : 0;
    return tick => {
      const b = tick / beatT;
      if (b <= b0) return b * 60 / bpm;
      const u = Math.min(1, (b - b0) / L);
      let s = b0 * 60 / bpm + (60 * L / bpm) * (-Math.log(1 - k * u) / k);
      if (b > b0 + L) s += (b - b0 - L) * 60 / (bpm * (1 - k));
      return s;
    };
  }
  A.PPEtudes = {ETUDES: window.PP_ETUDES, parse, pitchOf, timer, byId: id => window.PP_ETUDES.find(e => e.id === id) || null};
})(window.Arcade);
