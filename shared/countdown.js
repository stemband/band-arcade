/* Band Arcade: THE COUNTDOWN (shared by Dojo Duel, Neon Face-Off and Sustain Speedway). Only the beats and their sounds live here;
   each game draws the numbers its own way (its `show` callback) and runs the timers on its own clock (its `later`),
   so pausing a game pauses its countdown too.

   Arcade.countdown({style, voicePrefix, later, show, onGo, steps, go, delay})
     style        'classic'  3 · 2 · 1, one number every steps.classic ms (1000), a spoken number on each
                  'quick'    3 · 2 · 1 every steps.quick ms (350), a short TICK on each (a spoken number would not fit)
                  'readygo'  two beats: "READY…" then "GO!", steps.ready ms (450) each
                  'off'      nothing shown, just a steps.off ms (400) pause
     voicePrefix  whose sounds: 'dojo' → dojo-count-3/-2/-1, dojo-count (the tick), dojo-ready, dojo-count-go.
                  'faceoff' → faceoff-count-3/-2/-1, faceoff-ready, faceoff-count-go; every faceoff-* sound falls back
                  to the matching dojo-count-* file, then to the dojo-count tick (sounds.js `fallback`), and the tick
                  of a QUICK countdown is <prefix>-count when that event exists, else dojo-count.
                  'race' (Sustain Speedway) → race-count-3/-2/-1, race-count-go, falling back exactly like 'faceoff'.
                  A new prefix needs only its sounds.js entries (each with `fallback` = the matching dojo-count-* event).
     countdown.sounds(prefix)  every event (and fallback) a CLASSIC + GO countdown with that prefix can play: hand it to
                  Sfx.prefer / Sfx.whenReady so the first countdown after a page load is on time
     later(ms, fn) the game's own timer (Dojo Duel: its game clock, which stops while paused)
     show(label, kind)  draw the beat: label '3' | '2' | '1' | 'READY…' | 'GO!' | '' (clear); kind 'count' | 'ready' | 'go'
     onGo()       the moment play starts (the note appears)
     go           true = a spoken "GO!" beat before onGo (Neon Face-Off: the voice ends BEFORE the note appears, so it
                  never plays over the moment a player needs the microphone; onGo waits until the GO sound has
                  finished, at most steps.goMax). false (Dojo Duel) = onGo right after the last number: the game says
                  "Go!" itself as the note appears. 'readygo' always has its GO beat.
     delay        ms before the first beat (Dojo Duel: after the gong and the Sensei's "Begin!")
   Photosensitivity: a beat at most every 350 ms (under 3 a second); the games only scale their numbers in (no flash),
   and nothing moves under prefers-reduced-motion. Returns {total} = the planned ms until onGo (without a longer GO). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const STEPS = {classic: 1000, quick: 350, ready: 450, off: 400, goMax: 1000};
  const has = name => !!(A.Sounds && A.Sounds.LIST && A.Sounds.LIST[name]);
  const play = name => (A.Sfx ? A.Sfx.event(name) : 0) * 1000;

  function countdown({style = 'classic', voicePrefix = 'dojo', later, show = () => {}, onGo = () => {}, steps = {}, go = false, delay = 0} = {}) {
    const S = Object.assign({}, STEPS, steps), pre = voicePrefix;
    later = later || ((ms, fn) => setTimeout(fn, ms));
    const tick = has(pre + '-count') ? pre + '-count' : 'dojo-count';
    /* the GO beat: "GO!" + its voice; play starts as the voice ends (at least `min` ms after the beat) */
    const goBeat = (at, min) => later(at, () => {
      show('GO!', 'go');
      const ms = play(pre + '-count-go');
      later(Math.min(Math.max(min, ms), S.goMax), () => { show('', ''); onGo(); });
    });
    if (style === 'off') { later(delay + S.off, onGo); return {total: delay + S.off}; }
    if (style === 'readygo') {
      later(delay, () => { show('READY…', 'ready'); play(pre + '-ready'); });
      goBeat(delay + S.ready, S.ready);
      return {total: delay + 2 * S.ready};
    }
    const step = style === 'quick' ? S.quick : S.classic;
    [3, 2, 1].forEach((n, k) => later(delay + k * step, () => {
      show(String(n), 'count');
      play(style === 'classic' ? `${pre}-count-${n}` : tick);
    }));
    if (go) { goBeat(delay + 3 * step, Math.min(step, S.ready)); return {total: delay + 3 * step + Math.min(step, S.ready)}; }
    later(delay + 3 * step, onGo);
    return {total: delay + 3 * step};
  }
  countdown.STEPS = STEPS;
  /** every sound a CLASSIC countdown with a spoken GO can play for this prefix, fallbacks included */
  countdown.sounds = pre => {
    const out = [], add = n => { while (n && has(n) && !out.includes(n)) { out.push(n); n = A.Sounds.LIST[n].fallback; } };
    ['-count-3', '-count-2', '-count-1', '-count-go'].forEach(s => add(pre + s));
    add('dojo-count');
    return out;
  };
  A.countdown = countdown;
})(window.Arcade);
