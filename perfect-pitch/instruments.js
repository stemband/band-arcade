/* PERFECT PITCH: THE INSTRUMENTS AND THEIR TUNING MECHANISMS (window.PP2_TUNE, one table) and THE MECHANISM PHYSICS
   (Arcade.PP2Tune; docs/games/perfect-pitch.md). No sound here (shared/winds.js plays it), so the score is exact.

   THE MODEL: every mechanism starts a round at the MIDDLE of its travel (d = 0 mm). Pulling it OUT by d mm adds
   (double ? 2 : 1) × d / 10 cm to the air column of effective length L cm, so the pitch moves by
       cents = −1200 × log2((L + added) / L)            (out = longer = LOWER; in = shorter = HIGHER)
   and the same shift applies to every note the instrument plays (good enough for a tuning slide).
   A U-shaped brass tuning slide adds TWICE the pull (both of its tubes come out); a woodwind joint adds it once.
   Travel scales with L: a long instrument (a tuba) needs a long pull to move its pitch, so every mechanism reaches
   about ±60 cents, past the largest offset any level uses (50) with room to spare (the stop never gives the answer away).

   Instruments and note names: shared/instruments.js (each member's `sounds` and clef) and shared/scales.js (the
   first-five tonic); never a second transposition table. */
window.Arcade = window.Arcade || {};

/* ================= THE TABLE: every number of the physics. MAT: TUNE =================
     id        the Select Player id (shared/instruments.js PLAYERS)
     mech      what the student drags (the drawing's label)     where   where it is on the instrument
     voice     the synthesized voice (shared/winds.js)          art     the drawing (perfect-pitch/art.js)
     L         cm: the effective air-column length for its concert B♭ tuning note (MAT: TUNE)
     double    true = a U-shaped tuning slide (both tubes pull out: 2 × the pull)
     travel    mm: how far the mechanism moves EACH WAY from the middle (MAT: TUNE) */
window.PP2_TUNE = [
  {id: 'flute',      mech: 'Headjoint',          where: 'in the body',               voice: 'flute',    art: 'flute',    L: 33,  double: false, travel: 12},
  {id: 'clarinet',   mech: 'Barrel',             where: 'at the upper joint',        voice: 'clarinet', art: 'clarinet', L: 33,  double: false, travel: 12},
  {id: 'basscl',     mech: 'Neck',               where: 'in the body',               voice: 'clarinet', art: 'basscl',   L: 66,  double: false, travel: 24},
  {id: 'altosax',    mech: 'Mouthpiece',         where: 'on the neck cork',          voice: 'sax',      art: 'sax',      L: 57,  double: false, travel: 20},
  {id: 'tenorsax',   mech: 'Mouthpiece',         where: 'on the neck cork',          voice: 'sax',      art: 'sax',      L: 85,  double: false, travel: 30},
  {id: 'barisax',    mech: 'Mouthpiece',         where: 'on the neck cork',          voice: 'sax',      art: 'sax',      L: 125, double: false, travel: 45},
  {id: 'trumpet',    mech: 'Main tuning slide',  where: 'by the lead pipe',          voice: 'brass',    art: 'trumpet',  L: 148, double: true,  travel: 26},
  {id: 'horn',       mech: 'Main tuning slide',  where: 'by the lead pipe',          voice: 'horn',     art: 'horn',     L: 370, double: true,  travel: 66},
  {id: 'trombone',   mech: 'Tuning slide',       where: 'in the bell section',       voice: 'brass',    art: 'trombone', L: 275, double: true,  travel: 50},
  {id: 'baritonetc', mech: 'Main tuning slide',  where: 'by the valves',             voice: 'lowbrass', art: 'euph',     L: 275, double: true,  travel: 50},
  {id: 'euphbc',     mech: 'Main tuning slide',  where: 'by the valves',             voice: 'lowbrass', art: 'euph',     L: 275, double: true,  travel: 50},
  {id: 'tuba',       mech: 'Main tuning slide',  where: 'by the valves',             voice: 'lowbrass', art: 'tuba',     L: 550, double: true,  travel: 100},
];
/* LEFT OUT ON PURPOSE (their tiles show, dimmed and locked): oboes and bassoons don't tune with a slide or a barrel */
window.PP2_LOCKED = ['oboe', 'bassoon'];
/* never shown in the picker at all: unpitched, or no tuning mechanism to drag */
window.PP2_HIDDEN = ['bells', 'snare'];

(function (A) {
  'use strict';
  const TUNE = window.PP2_TUNE;
  const byId = id => TUNE.find(t => t.id === id) || null;
  const mod12 = x => ((x % 12) + 12) % 12;
  const midiFreq = m => 440 * Math.pow(2, (m - 69) / 12);
  /** cm added to the air column by a pull of d mm (+ = out) */
  const added = (t, d) => (t.double ? 2 : 1) * d / 10;
  /** the pitch change (cents) of a pull of d mm from the middle: out (+d) = lower (−) */
  const centsAt = (id, d) => { const t = byId(id); return -1200 * Math.log2((t.L + added(t, d)) / t.L); };
  /** the inverse: the pull (mm) that moves the pitch by c cents */
  const dFor = (id, c) => { const t = byId(id); return t.L * (Math.pow(2, -c / 1200) - 1) * 10 / (t.double ? 2 : 1); };
  const clampD = (id, d) => { const t = byId(id); return Math.max(-t.travel, Math.min(t.travel, d)); };

  /* ================= THE NOTES (concert midi), from the member's own data =================
     'Bb'      concert B♭ in the instrument's comfortable middle octave: the octave of its first-five tonic
     'BbF'     B♭ or concert F (the 5th of the first five, above it)
     'tuning'  B♭, F or A (the A a half step under the B♭; an octave up if that is out of the comfortable range)
     'range'   any note of the first five or of the comfortable range (the GMEA chromatic, a 3rd trimmed from each end) */
  const member = id => A.memberById(id);
  /** the written midi of the member's first-five tonic (shared/scales.js START, the concert B♭ scale) */
  function writtenTonic(m) {
    if (A.Scales && A.Scales.startMidi && A.Scales.LIST) return A.Scales.startMidi(m, A.Scales.LIST[0]);
    const g = A.groupFor(m.id); return A.music.writtenMidi(g.notes[0]);
  }
  const bb = id => { const m = member(id); return writtenTonic(m) - m.sounds; };
  /** the comfortable range: [low, high] concert midi */
  const comfy = id => { const m = member(id); return [m.lowMidi + 4 - m.sounds, m.highMidi - 4 - m.sounds]; };
  const inComfy = (id, c) => { const [lo, hi] = comfy(id); return c >= lo && c <= hi; };
  function notesFor(id, kind) {
    const b = bb(id), f = b + 7, a = inComfy(id, b - 1) ? b - 1 : b + 11;
    if (kind === 'Bb') return [b];
    if (kind === 'BbF') return [b, f];
    if (kind === 'tuning') return [b, f, a];
    const m = member(id), g = A.groupFor(id), five = g.notes.map(n => A.music.writtenMidi(n) - m.sounds);
    // the first five in the member's own octave (its group writes them for the whole group)
    const shift = 12 * Math.round((b - five[0]) / 12), out = new Set(five.map(x => x + shift));
    const [lo, hi] = comfy(id); for (let c = lo; c <= hi; c++) out.add(c);
    return [...out].sort((x, y) => x - y);
  }

  /* ================= NOTE NAMES: in the WRITTEN pitch of the instrument being tuned =================
     written = concert + the member's `sounds`; spelled with flats except F♯ (as Pedal Point and Slide Quest) */
  const spellWritten = (id, concert) => { const w = concert + member(id).sounds; return A.music.spell(w, mod12(w) !== 6); };
  const spellConcert = concert => A.music.spell(concert, mod12(concert) !== 6);
  const name = (n, oct = false) => n.letter + (n.acc < 0 ? '♭' : n.acc > 0 ? '♯' : '') + (oct ? n.oct : '');
  const writtenLabel = (id, concert, oct = false) => name(spellWritten(id, concert), oct);
  const concertLabel = (concert, oct = false) => name(spellConcert(concert), oct);
  const clefOf = id => member(id).clef;

  A.PP2Tune = {
    TUNE, LOCKED: window.PP2_LOCKED, HIDDEN: window.PP2_HIDDEN, byId, centsAt, dFor, clampD, midiFreq,
    notesFor, bb, comfy, spellWritten, writtenLabel, concertLabel, clefOf, member,
    /** cents between two frequencies: + = sharp */
    cents: (f, target) => 1200 * Math.log2(f / target),
    test: {
      /** what the ends of the travel do: {out: cents at +travel (lower), in: cents at −travel (higher)} */
      reach: id => { const t = byId(id); return {out: centsAt(id, t.travel), in: centsAt(id, -t.travel)}; },
    },
  };
})(window.Arcade);
