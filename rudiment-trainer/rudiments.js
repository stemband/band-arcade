/* THE RUDIMENT TRAINER's DATA (Mr. Graham edits this file): the 40 PAS International Drum Rudiments, the five tempo
   levels and the tempos. rudiment-trainer/game.js reads everything from here (Arcade.Rudiments).

   EACH RUDIMENT: {n, id, name, fam, time, tiers, text, bpm?}
     n       its PAS number (1–40, in order)
     id      SAVED (check-offs and links: rudiment-trainer/index.html?r=<id>): NEVER rename or remove one
     name    shown on its card and page
     fam     its family: 'roll' | 'diddle' | 'flam' | 'drag' (FAMILIES below)
     time    '2/4' | '3/4' | '4/4' | '6/8' (6/8 counts DOTTED QUARTERS: the tempo is dotted quarters a minute)
     tiers   its tempo set: 'A' | 'B' | 'C' (TEMPO_SETS below)
     bpm     optional: its own five tempos [Bronze, Silver, Gold, Platinum, Diamond], which win over its set
     text    the rudiment in the rhythm text format (shared/counting.js, RUDIMENT NOTATION in docs/engine/rhythm.md):
             s/e/q = 16th/8th/quarter, R/L = the hand, > = accent, {L} before a note = a flam's grace, {LL} = a drag's
             two graces, s/R = a diddle (two 32nds, same hand), z = a buzz, [ ] = a triplet, r = a rest, | = a bar line.
             The text and time may be corrected at any time (the tests check that all 40 still read with no errors).
   `MAT: CONFIRM` lines are Mr. Graham's still to check: keep them until he has. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  /* the families, in this order (the picker's tabs) */
  const FAMILIES = [
    {id: 'roll', name: 'Roll Rudiments', short: 'Roll'},
    {id: 'diddle', name: 'Diddle Rudiments', short: 'Diddle'},
    {id: 'flam', name: 'Flam Rudiments', short: 'Flam'},
    {id: 'drag', name: 'Drag Rudiments', short: 'Drag'},
  ];
  /* THE FIVE TEMPO LEVELS. The ids, names and order are SAVED (check-offs): never rename or reorder; add at the end.
     color = its theme token (shared/theme.css --tier-*) */
  const TIERS = [
    {id: 'bronze', name: 'Bronze', color: 'tier-bronze'},
    {id: 'silver', name: 'Silver', color: 'tier-silver'},
    {id: 'gold', name: 'Gold', color: 'tier-gold'},
    {id: 'platinum', name: 'Platinum', color: 'tier-platinum'},
    {id: 'diamond', name: 'Diamond', color: 'tier-diamond'},
  ];
  /* THE TEMPO SETS: quarter notes a minute for Bronze → Diamond (6/8: dotted quarters). Mr. Graham tunes these by ear. */
  const TEMPO_SETS = {
    A: [60, 80, 100, 120, 140],         // singles, buzz, paradiddles
    B: [50, 65, 80, 95, 110],           // anything with diddles (= 32nds)
    C: [50, 70, 90, 110, 130],          // flams and drags
  };
  /* OPEN–CLOSE–OPEN: each rudiment from its own Bronze up to its Diamond and back (seconds to speed up, to hold the
     top, to slow down). It is its own check-off: id 'oco' (saved, like the tiers) */
  const OCO = {id: 'oco', name: 'Open–Close–Open', upS: 40, holdS: 10, downS: 40};
  /* TODAY'S PRACTICE: this many seconds of playing along today = the snare's warm-up done (and the technique step).
     The same number as shared/practice.js PRACTICE.rudimentS (a test checks they agree). */
  const PRACTICE_S = 120;

  /* THE 40 (PAS order). ids are SAVED: never rename them. */
  const LIST = [
  {n: 1, id: 'single-stroke-roll', name: 'Single Stroke Roll', fam: 'roll', time: '2/4', tiers: 'A', text: 'sR sL sR sL sR sL sR sL'},
  {n: 2, id: 'single-stroke-four', name: 'Single Stroke Four', fam: 'roll', time: '2/4', tiers: 'A', text: '[sR sL sR] e>L [sL sR sL] e>R'},   // MAT: CONFIRM: Accent on the 4th note: many books add it, the PAS sheet may not.
  {n: 3, id: 'single-stroke-seven', name: 'Single Stroke Seven', fam: 'roll', time: '2/4', tiers: 'A', text: '[sR sL sR] [sL sR sL] e>R er | [sL sR sL] [sR sL sR] e>L er'},
  {n: 4, id: 'multiple-bounce-roll', name: 'Multiple Bounce Roll', fam: 'roll', time: '2/4', tiers: 'A', text: 'szR szL szR szL szR szL szR szL'},   // MAT: CONFIRM: Buzzes on 16ths (eighths are the other common way).
  {n: 5, id: 'triple-stroke-roll', name: 'Triple Stroke Roll', fam: 'roll', time: '2/4', tiers: 'A', text: '[sR sR sR] [sL sL sL] [sR sR sR] [sL sL sL]'},
  {n: 6, id: 'double-stroke-open-roll', name: 'Double Stroke Open Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s/L s/R s/L s/R s/L'},   // MAT: CONFIRM: Diddles as slashed 16ths = 32nds (same convention for every roll below).
  {n: 7, id: 'five-stroke-roll', name: 'Five Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L e>R s/L s/R e>L'},
  {n: 8, id: 'six-stroke-roll', name: 'Six Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's>R s/L s/R s>L s>R s/L s/R s>L'},
  {n: 9, id: 'seven-stroke-roll', name: 'Seven Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s>L s/L s/R s/L s>R'},
  {n: 10, id: 'nine-stroke-roll', name: 'Nine Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s/L q>R | s/L s/R s/L s/R q>L'},
  {n: 11, id: 'ten-stroke-roll', name: 'Ten Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s/L e>R e>L'},
  {n: 12, id: 'eleven-stroke-roll', name: 'Eleven Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s/L s/R s>L er | s/L s/R s/L s/R s/L s>R er'},   // MAT: CONFIRM: Five diddles then the release, which lands on the e of beat 2. Books differ on where it lands: tell me how you teach it.
  {n: 13, id: 'thirteen-stroke-roll', name: 'Thirteen Stroke Roll', fam: 'roll', time: '2/4', tiers: 'B', text: 's/R s/L s/R s/L s/R s/L e>R | s/L s/R s/L s/R s/L s/R e>L'},
  {n: 14, id: 'fifteen-stroke-roll', name: 'Fifteen Stroke Roll', fam: 'roll', time: '3/4', tiers: 'B', text: 's/R s/L s/R s/L s/R s/L s/R s>L qr | s/L s/R s/L s/R s/L s/R s/L s>R qr'},   // MAT: CONFIRM: Release on the last 16th of beat 2, then a rest.
  {n: 15, id: 'seventeen-stroke-roll', name: 'Seventeen Stroke Roll', fam: 'roll', time: '3/4', tiers: 'B', text: 's/R s/L s/R s/L s/R s/L s/R s/L q>R | s/L s/R s/L s/R s/L s/R s/L s/R q>L'},
  {n: 16, id: 'single-paradiddle', name: 'Single Paradiddle', fam: 'diddle', time: '2/4', tiers: 'A', text: 's>R sL sR sR s>L sR sL sL'},
  {n: 17, id: 'double-paradiddle', name: 'Double Paradiddle', fam: 'diddle', time: '6/8', tiers: 'A', text: 'e>R eL eR eL eR eR | e>L eR eL eR eL eL'},
  {n: 18, id: 'triple-paradiddle', name: 'Triple Paradiddle', fam: 'diddle', time: '4/4', tiers: 'A', text: 's>R sL sR sL sR sL sR sR s>L sR sL sR sL sR sL sL'},
  {n: 19, id: 'paradiddle-diddle', name: 'Paradiddle-Diddle', fam: 'diddle', time: '6/8', tiers: 'A', text: 'e>R eL eR eR eL eL | e>R eL eR eR eL eL'},
  {n: 20, id: 'flam', name: 'Flam', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}qR {R}qL'},
  {n: 21, id: 'flam-accent', name: 'Flam Accent', fam: 'flam', time: '2/4', tiers: 'C', text: '[{L}e>R eL eR] [{R}e>L eR eL]'},
  {n: 22, id: 'flam-tap', name: 'Flam Tap', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR sR {R}sL sL {L}sR sR {R}sL sL'},   // MAT: CONFIRM: No accents (the flam is the accent). Add > if you teach it accented.
  {n: 23, id: 'flamacue', name: 'Flamacue', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR s>L sR sL {L}eR er'},
  {n: 24, id: 'flam-paradiddle', name: 'Flam Paradiddle', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR sL sR sR {R}sL sR sL sL'},
  {n: 25, id: 'single-flammed-mill', name: 'Single Flammed Mill', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR sR sL sR {R}sL sL sR sL'},
  {n: 26, id: 'flam-paradiddle-diddle', name: 'Flam Paradiddle-Diddle', fam: 'flam', time: '3/4', tiers: 'C', text: '{L}sR sL sR sR sL sL {R}sL sR sL sL sR sR'},   // MAT: CONFIRM: Straight 16ths in 3/4 (also often written as 16th sextuplets in 2/4).
  {n: 27, id: 'pataflafla', name: 'Pataflafla', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR sL sR {R}sL {L}sR sL sR {R}sL'},
  {n: 28, id: 'swiss-army-triplet', name: 'Swiss Army Triplet', fam: 'flam', time: '2/4', tiers: 'C', text: '[{L}eR eR eL] [{L}eR eR eL]'},
  {n: 29, id: 'inverted-flam-tap', name: 'Inverted Flam Tap', fam: 'flam', time: '2/4', tiers: 'C', text: '{L}sR sL {R}sL sR {L}sR sL {R}sL sR'},
  {n: 30, id: 'flam-drag', name: 'Flam Drag', fam: 'flam', time: '6/8', tiers: 'C', text: '{L}e>R sL sL eR {R}e>L sR sR eL'},   // MAT: CONFIRM: The "drag" here is two 16ths on the same hand (L L), not grace notes.
  {n: 31, id: 'drag', name: 'Drag', fam: 'drag', time: '2/4', tiers: 'C', text: '{LL}qR {RR}qL'},
  {n: 32, id: 'single-drag-tap', name: 'Single Drag Tap', fam: 'drag', time: '2/4', tiers: 'C', text: '{LL}eR e>L {RR}eL e>R'},
  {n: 33, id: 'double-drag-tap', name: 'Double Drag Tap', fam: 'drag', time: '2/4', tiers: 'C', text: '[{LL}eR {LL}eR e>L] [{RR}eL {RR}eL e>R]'},
  {n: 34, id: 'lesson-25', name: 'Lesson 25', fam: 'drag', time: '2/4', tiers: 'C', text: '{LL}sR sL e>R {RR}sL sR e>L'},
  {n: 35, id: 'single-dragadiddle', name: 'Single Dragadiddle', fam: 'drag', time: '2/4', tiers: 'B', text: 's/>R sL sR sR s/>L sR sL sL'},   // MAT: CONFIRM: A paradiddle whose first note is a diddle (RR L R R). Please confirm.
  {n: 36, id: 'drag-paradiddle-1', name: 'Drag Paradiddle #1', fam: 'drag', time: '3/4', tiers: 'C', text: 'e>R {LL}sR sL sR sR e>L {RR}sL sR sL sL'},   // MAT: CONFIRM: Least sure of the rhythm: an accented 8th, then the paradiddle in 16ths with a drag on its first note.
  {n: 37, id: 'drag-paradiddle-2', name: 'Drag Paradiddle #2', fam: 'drag', time: '2/4', tiers: 'C', text: 'e>R {LL}eR {LL}sR sL sR sR | e>L {RR}eL {RR}sL sR sL sL'},   // MAT: CONFIRM: Same question as #1.
  {n: 38, id: 'single-ratamacue', name: 'Single Ratamacue', fam: 'drag', time: '2/4', tiers: 'C', text: '[{LL}sR sL sR] e>L [{RR}sL sR sL] e>R'},
  {n: 39, id: 'double-ratamacue', name: 'Double Ratamacue', fam: 'drag', time: '3/4', tiers: 'C', text: '{LL}eR [{LL}sR sL sR] e>L {RR}eL [{RR}sL sR sL] e>R'},
  {n: 40, id: 'triple-ratamacue', name: 'Triple Ratamacue', fam: 'drag', time: '2/4', tiers: 'C', text: '{LL}eR {LL}eR [{LL}sR sL sR] e>L | {RR}eL {RR}eL [{RR}sL sR sL] e>R'},
  ];

  const byId = id => LIST.find(r => r.id === id) || null;
  /** a rudiment's five tempos (its own bpm, else its set's) */
  const bpms = r => (Array.isArray(r.bpm) && r.bpm.length === 5 ? r.bpm : TEMPO_SETS[r.tiers] || TEMPO_SETS.A).slice();
  /** has a / roll (the page's SLASHES ⇄ WRITTEN OUT switch) */
  const hasRolls = r => /\//.test(r.text);
  A.Rudiments = {LIST, FAMILIES, TIERS, TEMPO_SETS, OCO, PRACTICE_S, byId, bpms, hasRolls,
    CREDIT: 'The 40 PAS International Drum Rudiments · Percussive Arts Society'};
})(window.Arcade);
