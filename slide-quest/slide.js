/* SLIDE QUEST: THE PHYSICS (Arcade.SQSlide; docs/games/slide-quest.md). A tenor trombone in B♭. The pitch is exact
   math (no sound here: slide-quest/brass.js plays it), so the score is exact.

   THE SLIDE: the extension x (cm, 0 = against the stops) adds 2x of tubing, so the pitch × L0 / (L0 + 2x). Each step
   out is a little LONGER than the last, because pitch follows tube length: the positions are NOT evenly spaced.
   THE PARTIAL n (2–6), chosen by the lips: which note of the horn's harmonic series sounds at the slide's spot.
   TWO TUNINGS (a level's `tuning`):
     'ideal'  every partial EXACTLY in tune with the equal-tempered chart: f(n, x) = ET(n) × L0 / (L0 + 2x), 1st
              position at x = 0 (levels 1–6)
     'real'   the TRUE harmonic series, like a real horn: f(n, x) = n × FP × 2^(room / 1200) × L0 / (L0 + 2x).
              Partial 3 is +2 cents, partial 5 −13.7, partial 6 +2 against the chart; the main tuning slide leaves
              `room` cents to spare (against the stops the horn is `room` cents sharp of 1st position), so a player can
              push flat notes up (levels 7–8)
   THE MARKS: markX(k) = L0/2 × (2^((room + 100(k − 1)) / 1200) − 1), room = 0 in ideal mode. In real mode a mark ×
   a partial = that partial's true harmonic, so a 5th-partial note at its mark really is flat. That is the lesson.
   Note names: the shared speller (Arcade.music.spell), concert pitch, flats except F♯, exactly like PPDrums.label. */
(function (A) {
  'use strict';

  /* ================= THE SLIDE: every number of the physics. MAT: TUNE ================= */
  const SLIDE = {
    FP: 58.2705,        // Hz: the pedal B♭1 (the horn's fundamental, equal tempered at A440)
    L0: 270,            // cm: the effective tube length with the slide closed. It sets the SPACING of the positions
                        // (a longer tube = positions closer together)
    travel: 60,         // cm: how far the slide goes (a little past 7th, like a real one)
    room: 20,           // cents: REAL tuning only. The main tuning slide is set this much sharp of 1st position, so a
                        // player has room to bring flat notes (the 5th partial) up by moving the slide IN
    positions: 7,       // the slide positions (1st = closed … 7th = all the way out)
    partials: [2, 3, 4, 5, 6],   // the partials the lips can choose (the LIP ladder)
    // the equal-tempered chart note (concert midi) of each partial in 1st position: B♭2, F3, B♭3, D4, F4
    et: {2: 46, 3: 53, 4: 58, 5: 62, 6: 65},
  };

  const {FP, L0} = SLIDE;
  const midiFreq = m => 440 * Math.pow(2, (m - 69) / 12);
  const room = mode => mode === 'real' ? SLIDE.room : 0;
  /** cents between two frequencies (by their ratio): + = sharp */
  const cents = (f, target) => 1200 * Math.log2(f / target);
  /** the partial's pitch with the slide closed (x = 0) */
  const base = (n, mode) => mode === 'real' ? n * FP * Math.pow(2, SLIDE.room / 1200) : midiFreq(SLIDE.et[n]);
  /** the pitch (Hz) of partial n at extension x (cm) */
  const freq = (n, x, mode = 'ideal') => base(n, mode) * L0 / (L0 + 2 * x);
  /** the true harmonic's error against the chart (cents): 0, +2, 0, −13.7, +2 for n = 2…6 */
  const harmonicError = n => cents(n * FP, midiFreq(SLIDE.et[n]));
  /** where position k's mark sits (cm) */
  const markX = (k, mode = 'ideal') => L0 / 2 * (Math.pow(2, (room(mode) + 100 * (k - 1)) / 1200) - 1);
  const clampX = x => Math.max(0, Math.min(SLIDE.travel, x));
  /** the slide moved by `c` cents' worth (+ = higher = IN), from x */
  const shiftX = (x, c) => ((L0 + 2 * x) * Math.pow(2, -c / 1200) - L0) / 2;
  /** the cents between two slide spots on one partial (+ = x1 is higher than x2) */
  const centsBetween = (x1, x2) => 1200 * Math.log2((L0 + 2 * x2) / (L0 + 2 * x1));
  /** the chart position of a note on a partial (1–7, or out of 1–7 when it isn't one of that partial's positions) */
  const positionOf = (midi, n) => SLIDE.et[n] - midi + 1;
  /** the exact x for a note on a partial, or null when it's out of reach (or not one of that partial's 7 positions) */
  function spotFor(midi, n, mode = 'ideal') {
    if (!SLIDE.et[n]) return null;
    const k = positionOf(midi, n);
    if (k < 1 || k > SLIDE.positions) return null;
    const x = (L0 * base(n, mode) / midiFreq(midi) - L0) / 2;
    if (x < -1e-9 || x > SLIDE.travel + 1e-9) return null;
    return Math.max(0, x);
  }
  /** every [partial, position] that plays a note */
  const waysTo = (midi, mode = 'ideal') => SLIDE.partials.filter(n => spotFor(midi, n, mode) != null).map(n => [n, positionOf(midi, n)]);
  /** the pitch as a fractional midi number */
  const midiOf = f => 69 + 12 * Math.log2(f / 440);
  // the usual concert spellings: flats, except F♯ (pc 6), exactly like Pedal Point's PPDrums.label
  const spell = midi => { const m = Math.round(midi); return A.music.spell(m, ((m % 12) + 12) % 12 !== 6); };
  const label = (midi, oct = true) => { const n = spell(midi); return n.letter + (n.acc < 0 ? '♭' : n.acc > 0 ? '♯' : '') + (oct ? n.oct : ''); };
  const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
  const ordinal = k => ORD[k] || k + 'th';

  A.SQSlide = {SLIDE, freq, cents, markX, spotFor, waysTo, positionOf, harmonicError, base, clampX, shiftX, centsBetween, midiFreq, midiOf, spell, label, ordinal};
})(window.Arcade);
