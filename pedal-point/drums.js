/* PEDAL POINT: THE DRUMS. One table Mr. Graham edits (docs/games/pedal-point.md).
   Real pedal timpani, sizes and ranges as in a band room: each drum's PRINCIPAL (the pitch you hear) can be tuned
   anywhere from `low` to `high` with its pedal (concert pitch, A440).
     id      saved nowhere (levels.js names drums by this id); never shown as a number alone
     name    what the screen says ('32"')
     low     the pitch with the pedal all the way HEEL DOWN
     high    the pitch with the pedal all the way TOE DOWN
     comfy   the "comfortable middle" a level's targets come from: half steps in from each end (real timpanists stay
             off the very ends: the head goes flabby at the bottom and tight and choked at the top)
   THE PEDAL maps its travel to the range in EQUAL CENTS (log frequency): pedal 0 = low, 1 = high, 0.5 = halfway in
   cents. THE FINE TUNER (the T-handle) adds ±FINE_CENTS on top. Note names: shared/instruments.js (Arcade.music.spell)
   with the usual band spellings (B♭ not A♯), see `spell` below. */
window.PP_DRUMS = [
  {id: '32', name: '32"', low: 'D2',  high: 'A2', comfy: 1},
  {id: '29', name: '29"', low: 'F2',  high: 'C3', comfy: 1},
  {id: '26', name: '26"', low: 'Bb2', high: 'F3', comfy: 1},
  {id: '23', name: '23"', low: 'D3',  high: 'A3', comfy: 1},
];
window.PP_FINE_CENTS = 50;          // the fine tuner's reach each way (cents)

/* Arcade.PPDrums: the drum math (no sound here: pedal-point/timpani.js plays it) */
(function (A) {
  'use strict';
  const DRUMS = window.PP_DRUMS, FINE = window.PP_FINE_CENTS;
  const midiOf = s => A.music.writtenMidi(A.music.parseNote(s));        // 'Bb2' -> 46
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  // the usual concert spellings: flats, except F♯ (pc 6)
  const spell = midi => { const m = Math.round(midi), n = A.music.spell(m, ((m % 12) + 12) % 12 !== 6); return n; };
  const label = (midi, oct = true) => { const n = spell(midi); return n.letter + (n.acc < 0 ? '♭' : n.acc > 0 ? '♯' : '') + (oct ? n.oct : ''); };
  DRUMS.forEach(d => { d.lowMidi = midiOf(d.low); d.highMidi = midiOf(d.high); d.span = (d.highMidi - d.lowMidi) * 100; });
  const byId = id => DRUMS.find(d => d.id === String(id)) || null;
  /** cents above the drum's low end for a pedal position (0–1) and a fine-tuner offset (cents) */
  const centsAt = (d, pedal, fine = 0) => Math.max(0, Math.min(1, pedal)) * d.span + Math.max(-FINE, Math.min(FINE, fine));
  /** the PRINCIPAL frequency (Hz) */
  const freqAt = (d, pedal, fine = 0) => freq(d.lowMidi) * Math.pow(2, centsAt(d, pedal, fine) / 1200);
  /** the pitch as a fractional midi number */
  const midiAt = (d, pedal, fine = 0) => d.lowMidi + centsAt(d, pedal, fine) / 100;
  /** the pedal position that puts the principal on a midi pitch (fine tuner at 0) */
  const pedalFor = (d, midi) => (midi - d.lowMidi) * 100 / d.span;
  const inRange = (d, midi) => midi >= d.lowMidi - 1e-9 && midi <= d.highMidi + 1e-9;
  const comfy = (d, midi) => midi >= d.lowMidi + d.comfy && midi <= d.highMidi - d.comfy;
  /** cents between two frequencies (by their ratio): + = sharp */
  const cents = (f, target) => 1200 * Math.log2(f / target);
  /** THE TUNING GAUGE: the note nearest the drum's pitch */
  const gauge = (d, pedal, fine = 0) => label(Math.round(midiAt(d, pedal, fine)), false);
  A.PPDrums = {DRUMS, FINE, byId, centsAt, freqAt, midiAt, pedalFor, inRange, comfy, cents, gauge, freq, label, spell, midiOf};
})(window.Arcade);
