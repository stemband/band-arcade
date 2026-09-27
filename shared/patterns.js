/* THE PATTERN GENERATOR (shared by Lost Signal and Vanishing Ink): short melodic patterns made from the student's
   NOTES × ORDER note set, moving by steps, then small skips, then larger skips, the way real melodies move.
     Arcade.patterns.noteSet(pickerState, pool)   the note set a pattern is made from: {set, sig, fit, name}
                                                  set = one item per SOUNDING pitch (low to high), items as
                                                  Arcade.buildSequence makes them ({n, show, label, midi, sounding, pc});
                                                  pool 3 = the smaller level-1 pool, 5 = the whole note set
     Arcade.patterns.generate(set, len, rules, gen)   a pattern of len items; rules = {leap, repeats}:
                                                  leap = the biggest skip in half steps (2 = stepwise, 4 = up to a 3rd,
                                                  7 = up to a 5th, 12 = up to an octave); repeats = the same note may
                                                  come twice in a row (never three times)
     Arcade.patterns.next(set, pattern, rules, gen)   one more note after a pattern (endless modes grow a pattern)
     Arcade.patterns.GEN                          the default move weights (a game may pass its own `gen`, e.g. Lost
                                                  Signal's SIGNAL_GEN in its levels.js; missing fields use these)
   Loaded after sequences.js and mode-picker.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  /* how likely each move is (bigger = more likely) */
  const GEN = {
    step: 4,              // up or down a half or whole step
    third: 2.2,           // a 3rd (3–4 half steps)
    fourth: 1.2,          // a 4th (5)
    fifth: 1,             // a 5th (6–7)
    wide: 0.3,            // 6ths and 7ths (8–11)
    octave: 0.6,          // an octave (12)
    repeat: 1.8,          // the same note again (only where `repeats` is on)
    recover: 2.5,         // after a skip bigger than a 3rd, a step back the other way is this much more likely…
    noBigInARow: true,    // …and another skip bigger than a 3rd is not allowed (no leaping around)
    noPingPong: 0.4,      // going straight back to the note before last is less likely (× this)
    mustSkip: true,       // rules with skips: a pattern of 3+ notes always has at least one
  };
  const gen = g => (g && g !== GEN ? Object.assign({}, GEN, g) : GEN);

  /** the note set for a picker state: one item per sounding pitch, low to high */
  function noteSet(st, pool) {
    const seq = A.ModePicker.sequence(st, {count: 8, pool}, pool < 5 ? 1 : 2);
    const seen = new Set(), set = [];
    seq.pool.slice().sort((a, b) => a.sounding - b.sounding).forEach(it => { if (!seen.has(it.sounding)) { seen.add(it.sounding); set.push(it); } });
    return {set, sig: seq.sig, fit: seq.fit, name: seq.name};
  }
  function weight(a, G) {
    return a === 0 ? G.repeat : a <= 2 ? G.step : a <= 4 ? G.third : a === 5 ? G.fourth : a <= 7 ? G.fifth : a < 12 ? G.wide : G.octave;
  }
  /** the next note after pattern (a list of set items), within rules {leap, repeats} */
  function next(set, pattern, rules, g) {
    const G = gen(g);
    const cur = pattern[pattern.length - 1], prev = pattern[pattern.length - 2], prev2 = pattern[pattern.length - 3];
    const prevInt = prev ? cur.sounding - prev.sounding : null;
    const opts = [];
    set.forEach(it => {
      const d = it.sounding - cur.sounding, a = Math.abs(d);
      if (a > rules.leap) return;
      if (a === 0 && (!rules.repeats || (prev && prev.sounding === cur.sounding))) return;   // never three in a row
      let w = weight(a, G);
      if (prevInt !== null && Math.abs(prevInt) > 4) {
        if (a > 4 && G.noBigInARow) return;                       // no leaping around
        if (a > 0 && a <= 2 && Math.sign(d) !== Math.sign(prevInt)) w *= G.recover;   // a step back after a skip
      }
      if (prev && a > 0 && it.sounding === prev.sounding && prev2 !== undefined) w *= G.noPingPong;
      if (w > 0) opts.push([it, w]);
    });
    if (!opts.length) {                                           // nothing fits (a tiny set): the nearest other note
      const other = set.filter(it => it.sounding !== cur.sounding).sort((a, b) => Math.abs(a.sounding - cur.sounding) - Math.abs(b.sounding - cur.sounding));
      return other[0] || cur;
    }
    let r = Math.random() * opts.reduce((s, [, w]) => s + w, 0);
    for (const [it, w] of opts) { r -= w; if (r <= 0) return it; }
    return opts[opts.length - 1][0];
  }
  /** a pattern of len notes from set */
  function generate(set, len, rules, g) {
    const G = gen(g);
    let best = null;
    for (let tries = 0; tries < 16; tries++) {
      const p = [set[Math.floor(Math.random() * set.length)]];
      while (p.length < len) p.push(next(set, p, rules, G));
      const skip = p.some((it, i) => i && Math.abs(it.sounding - p[i - 1].sounding) > 2);
      best = p;
      if (G.mustSkip && rules.leap > 2 && len >= 3 && !skip && set.length > 3) continue;   // these rules are about skips
      break;
    }
    return best;
  }

  A.patterns = {GEN, noteSet, next, generate, weight: a => weight(a, GEN)};
})(window.Arcade);
