/* THE RHYTHM JUDGE: which hit belongs to which written note (moved out of Rhythm Dojo, so every game that times hits
   against a rhythm judges them the same way: Rhythm Dojo, Showtime Malfunction's snare jobs).
     Arcade.RhythmJudge.match(targets, attacks, rules) -> {tg, extras}
       targets  the written notes to attack, in time order: [{t (s from the rhythm's start), …}]
       attacks  the hits heard, in time order, already corrected by the device's timing check: [{rel (s), …}]
       rules    {perfectMs, goodMs, okMs, lateMs}
       tg       a copy of every target + {res: 'perfect'|'good'|'ok'|'early'|'late'|'miss', d (ms, − = early), a (its hit)}
       extras   the hits that are no note's (farther than lateMs from every unclaimed note: a rest, or one too many)
   Each hit, in order, claims the NEAREST note not yet claimed within lateMs; a note left over is a MISS. A note is judged
   only by when it starts (a hit can't be held). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  function match(targets, attacks, R) {
    const tg = targets.map(x => Object.assign({}, x, {res: null, d: null, a: null}));
    const extras = [];
    attacks.forEach(x => {
      let best = null;
      tg.forEach(t => { if (t.res) return; const d = (x.rel - t.t) * 1000; if (Math.abs(d) <= R.lateMs && (!best || Math.abs(d) < Math.abs(best.d))) best = {t, d}; });
      if (!best) { extras.push(x); return; }
      const t = best.t, d = best.d, ad = Math.abs(d);
      t.d = d; t.a = x;
      t.res = ad <= R.perfectMs ? 'perfect' : ad <= R.goodMs ? 'good' : ad <= R.okMs ? 'ok' : d < 0 ? 'early' : 'late';
    });
    tg.forEach(t => { if (!t.res) t.res = 'miss'; });
    return {tg, extras};
  }
  A.RhythmJudge = {match};
})(window.Arcade);
