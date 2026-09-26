/* Button Masher: THE FINGERING TABLE. Every fingering the game accepts, for every instrument.
   Verify against the 6th Grade Honor Band fingering charts.

   HOW TO READ IT
     Each instrument (an instrument MEMBER id from shared/instruments.js) lists its WRITTEN notes, and for each
     note every fingering the game accepts: the PRIMARY first (the one the Chart shows and the game glows after a
     wrong answer), then common alternates. A student's combo is right when the pressed keys EXACTLY match any
     one of them (nothing missing, nothing extra).
     Note names: letter, then b or #, then octave, middle C = C4 ('Bb4', 'F#4'). A sharp and its flat twin
     (C#5 / Db5) are the same fingering; list either spelling once.

     Brass:     '0' = open, '1-3' = valves 1 and 3, '4' = the 4th valve (euphonium, tuba),
                'T' in front = the horn's thumb trigger (the B♭ side): 'T1-2'. 'T0' = trigger alone.
     Trombone:  slide positions, 1 to 7.
     Woodwinds: the key names drawn on that instrument's diagram (diagrams.js), separated by spaces.
                '|' is only a visual split between the hands and is ignored.
                1 2 3 = left-hand fingers (index, middle, ring), 4 5 6 = right-hand fingers.
                '1h' = key 1 HALF-HOLED (oboe, bassoon): the half state must match exactly.
                Flute:     T (B thumb), Tb (B♭ thumb lever), G# (left pinky), Eb (right pinky)
                Oboe:      Oct (thumb octave key), Oct2 (side octave key), G# LEb LF (left pinky), REb RF (right pinky)
                Clarinet:  Th (thumb hole), Reg (register key), A, G# (throat keys), LE LF LF# (left pinky),
                           RE RF RAb (right pinky), SEb SBb (right-hand side keys: side E♭ and side B♭)
                Saxophone: Oct, bis, pD pEb pF (palm keys), fF (front F), SE SC SBb (side keys), G# LC# LB LBb
                           (left pinky), REb RC (right pinky)
                Bassoon:   W (whisper key), fA fC fD (flick keys; all left thumb), C# Eb (left pinky),
                           RE RF# RBb (right thumb), F Ab (right pinky)

   HOW TO FIX A FINGERING
     Find the instrument below (trumpet and Baritone T.C. share one table, so do the clarinets, the saxophones)
     and edit that note's list. To make an alternate the primary, move it to the front. To stop accepting one,
     delete it. Save and reload: the Chart view shows the change. Only use key names that appear on the diagram
     (listed above); a typo shows a warning in the browser console.

   FINGERINGS I WAS NOT FULLY CERTAIN ABOUT (please check these first)
     Oboe (the whole oboe table deserves a check; student oboes vary):
       F4 / F5  primary "regular F" = 1 2 3 | 5 6 + right F key; alternates forked F (1 2 3 | 4 6) and left F
       B♭4 / B♭5  1 | 4 ("one and one") as the only fingering
       C5       2 only (middle finger)
       C♯5/D♭5  all keys open
       E♭4 / E♭5  right E♭ key first, left E♭ key accepted
     Clarinet and Bass Clarinet:
       B3       Th 1 2 3 | 5
       E♭4      Th 1 2 + side E♭ key (the forked/sliver E♭ is not accepted)
       B♭4      only A key + register key (side-key B♭ not accepted)
     Flute:
       F4 to B4  also accepted WITHOUT the right-pinky E♭ key (many beginners are taught without it)
       D6 (T 2 3 + E♭) and E♭6 (T 1 2 3 | 4 5 6 + E♭)
     Bassoon (the whole bassoon table deserves a check):
       D3 (W 1 2), E♭3 (W 1 2 + E♭ key), E3 (W 1), F3 (W only)
       D♭3      W 1 2 3 + C♯ key (left pinky)
       G3, A♭3  half-hole, whisper key optional
       A3, B♭3  flick key optional (A flick; C flick also accepted on B♭3)
       C4 (1 2 3, C flick optional), D4 (1 2, D flick optional), E♭4 (1 2 + E♭ key)
     Horn (F side primary):
       D4 = 1, E♭4 = 2, E4 = 0 (the F-horn chart, not the trumpet one), E4 also 1-2
       B♭-side alternates for D4 (T1-2, T3), D5 (T1-2, T3) and G5 (T0, T1)
     Trumpet and Baritone T.C.: alternates G4 1-3, D5 1-3, E5 1-2, G5 1-3
     All valve brass: valve 3 accepted anywhere 1-2 is the primary (A3, E4, A4, C♯5…)
     Euphonium and Tuba: C4 (euph) / C3 (tuba) accept 1, 1-3 and 4; 4 accepted for every 1-3, 2-4 for 1-2-3
     Trombone: alternates F3 in 6th, B♭3 in 5th, C4 in 6th, D4 in 4th
*/
(function () {
  "use strict";

  /* ---------- valve brass ---------- */
  const TRUMPET = {       // Trumpet and Baritone T.C. (written notes)
    'F#3': ['1-2-3'],
    'G3':  ['1-3'],
    'Ab3': ['2-3'],
    'A3':  ['1-2', '3'],
    'Bb3': ['1'],
    'B3':  ['2'],
    'C4':  ['0'],
    'C#4': ['1-2-3'],
    'D4':  ['1-3'],
    'Eb4': ['2-3'],
    'E4':  ['1-2', '3'],
    'F4':  ['1'],
    'F#4': ['2'],
    'G4':  ['0', '1-3'],
    'Ab4': ['2-3'],
    'A4':  ['1-2', '3'],
    'Bb4': ['1'],
    'B4':  ['2'],
    'C5':  ['0'],
    'C#5': ['1-2', '3'],
    'D5':  ['1', '1-3'],
    'Eb5': ['2'],
    'E5':  ['0', '1-2'],
    'F5':  ['1'],
    'F#5': ['2'],
    'G5':  ['0', '1-3'],
  };

  const HORN = {          // Horn in F (written). F side first, then B♭ side (thumb trigger)
    'Bb3': ['1', 'T1'],
    'B3':  ['2', 'T2'],
    'C4':  ['0', 'T0'],
    'D4':  ['1', 'T1-2', 'T3'],
    'Eb4': ['2', 'T1'],
    'E4':  ['0', '1-2', '3', 'T2'],
    'F4':  ['1', 'T0'],
    'G4':  ['0', 'T1'],
    'Ab4': ['2-3', 'T2'],
    'A4':  ['1-2', '3', 'T0'],
    'Bb4': ['1', 'T1'],
    'B4':  ['2', 'T2'],
    'C5':  ['0', 'T0'],
    'D5':  ['1', 'T1-2', 'T3'],
    'Eb5': ['2', 'T1'],
    'E5':  ['0', 'T2'],
    'F5':  ['1', 'T0'],
    'G5':  ['0', 'T0', 'T1'],
  };

  const EUPHONIUM = {     // Baritone / Euphonium B.C. (concert pitch). 4 = the 4th valve
    'F2':  ['1-3', '4'],
    'G2':  ['1-2', '3'],
    'Ab2': ['1'],
    'A2':  ['2'],
    'Bb2': ['0'],
    'C3':  ['1-3', '4'],
    'Db3': ['2-3'],
    'D3':  ['1-2', '3'],
    'Eb3': ['1'],
    'E3':  ['2'],
    'F3':  ['0'],
    'G3':  ['1-2', '3'],
    'Ab3': ['1'],
    'A3':  ['2'],
    'Bb3': ['0'],
    'C4':  ['1', '1-3', '4'],
    'D4':  ['0'],
    'Eb4': ['1'],
  };

  const TUBA = {          // B♭ tuba (concert pitch). 4 = the 4th valve
    'F1':  ['1-3', '4'],
    'G1':  ['1-2', '3'],
    'Ab1': ['1'],
    'A1':  ['2'],
    'Bb1': ['0'],
    'C2':  ['1-3', '4'],
    'Db2': ['2-3'],
    'D2':  ['1-2', '3'],
    'Eb2': ['1'],
    'E2':  ['2'],
    'F2':  ['0'],
    'G2':  ['1-2', '3'],
    'Ab2': ['1'],
    'A2':  ['2'],
    'Bb2': ['0'],
    'C3':  ['1', '1-3', '4'],
    'D3':  ['0'],
    'Eb3': ['1'],
  };

  /* ---------- trombone: slide positions ---------- */
  const TROMBONE = {
    'F2':  [6],
    'G2':  [4],
    'Ab2': [3],
    'A2':  [2],
    'Bb2': [1],
    'C3':  [6],
    'Db3': [5],
    'D3':  [4],
    'Eb3': [3],
    'E3':  [2],
    'F3':  [1, 6],
    'G3':  [4],
    'Ab3': [3],
    'A3':  [2],
    'Bb3': [1, 5],
    'C4':  [3, 6],
    'D4':  [1, 4],
    'Eb4': [3],
  };

  /* ---------- woodwinds ---------- */
  const FLUTE = {
    'F4':  ['T 1 2 3 | 4 Eb', 'T 1 2 3 | 4'],
    'G4':  ['T 1 2 3 | Eb', 'T 1 2 3'],
    'Ab4': ['T 1 2 3 G# | Eb', 'T 1 2 3 G#'],
    'A4':  ['T 1 2 | Eb', 'T 1 2'],
    'Bb4': ['Tb 1 | Eb', 'T 1 | 4 Eb', 'Tb 1', 'T 1 | 4'],
    'B4':  ['T 1 | Eb', 'T 1'],
    'C5':  ['1 | Eb'],
    'Db5': ['Eb'],
    'D5':  ['T 2 3 | 4 5 6'],
    'Eb5': ['T 2 3 | 4 5 6 Eb'],
    'E5':  ['T 1 2 3 | 4 5 Eb'],
    'F5':  ['T 1 2 3 | 4 Eb'],
    'G5':  ['T 1 2 3 | Eb'],
    'Ab5': ['T 1 2 3 G# | Eb'],
    'A5':  ['T 1 2 | Eb'],
    'Bb5': ['Tb 1 | Eb', 'T 1 | 4 Eb'],
    'B5':  ['T 1 | Eb'],
    'C6':  ['1 | Eb'],
    'D6':  ['T 2 3 | Eb'],
    'Eb6': ['T 1 2 3 | 4 5 6 Eb'],
  };

  const OBOE = {
    'Eb4': ['1 2 3 | 4 5 6 REb', '1 2 3 LEb | 4 5 6'],
    'F4':  ['1 2 3 | 5 6 RF', '1 2 3 | 4 6', '1 2 3 LF | 5 6'],
    'G4':  ['1 2 3'],
    'Ab4': ['1 2 3 G#'],
    'A4':  ['1 2'],
    'Bb4': ['1 | 4'],
    'C5':  ['2'],
    'Db5': [''],
    'D5':  ['1h 2 3 | 4 5 6'],
    'Eb5': ['1h 2 3 | 4 5 6 REb', '1h 2 3 LEb | 4 5 6'],
    'E5':  ['1h 2 3 | 4 5'],
    'F5':  ['1h 2 3 | 5 6 RF', '1h 2 3 | 4 6', '1h 2 3 LF | 5 6'],
    'G5':  ['Oct 1 2 3'],
    'Ab5': ['Oct 1 2 3 G#'],
    'A5':  ['Oct 1 2'],
    'Bb5': ['Oct 1 | 4'],
  };

  const CLARINET = {      // B♭ Clarinet and Bass Clarinet (written)
    'G3':  ['Th 1 2 3 | 4 5 6'],
    'A3':  ['Th 1 2 3 | 4 5'],
    'Bb3': ['Th 1 2 3 | 4'],
    'B3':  ['Th 1 2 3 | 5'],
    'C4':  ['Th 1 2 3'],
    'D4':  ['Th 1 2'],
    'Eb4': ['Th 1 2 | SEb'],
    'E4':  ['Th 1'],
    'F4':  ['Th'],
    'F#4': ['1'],
    'G4':  [''],
    'A4':  ['A'],
    'Bb4': ['A Reg'],
    'B4':  ['Th Reg 1 2 3 LE | 4 5 6', 'Th Reg 1 2 3 | 4 5 6 RE'],
    'C5':  ['Th Reg 1 2 3 LF | 4 5 6', 'Th Reg 1 2 3 | 4 5 6 RF'],
    'D5':  ['Th Reg 1 2 3 | 4 5 6'],
    'E5':  ['Th Reg 1 2 3 | 4 5'],
    'F5':  ['Th Reg 1 2 3 | 4'],
  };

  const SAX = {           // Alto, Tenor and Baritone Sax (written)
    'C4':  ['1 2 3 | 4 5 6 RC'],
    'D4':  ['1 2 3 | 4 5 6'],
    'E4':  ['1 2 3 | 4 5'],
    'F4':  ['1 2 3 | 4'],
    'F#4': ['1 2 3 | 5'],
    'G4':  ['1 2 3'],
    'A4':  ['1 2'],
    'Bb4': ['1 bis', '1 | 4', '1 | SBb'],
    'B4':  ['1'],
    'C5':  ['2', '1 | SC'],
    'C#5': [''],
    'D5':  ['Oct 1 2 3 | 4 5 6'],
    'Eb5': ['Oct 1 2 3 | 4 5 6 REb'],
    'E5':  ['Oct 1 2 3 | 4 5'],
    'F5':  ['Oct 1 2 3 | 4'],
    'F#5': ['Oct 1 2 3 | 5'],
    'G5':  ['Oct 1 2 3'],
    'A5':  ['Oct 1 2'],
    'Bb5': ['Oct 1 bis', 'Oct 1 | 4', 'Oct 1 | SBb'],
    'B5':  ['Oct 1'],
    'C6':  ['Oct 2', 'Oct 1 | SC'],
  };

  const BASSOON = {
    'F2':  ['W 1 2 3 | 4 5 6 F'],
    'G2':  ['W 1 2 3 | 4 5 6'],
    'Ab2': ['W 1 2 3 | 4 5 6 Ab'],
    'A2':  ['W 1 2 3 | 4 5'],
    'Bb2': ['W 1 2 3 | 4 RBb'],
    'C3':  ['W 1 2 3'],
    'Db3': ['W 1 2 3 C#'],
    'D3':  ['W 1 2'],
    'Eb3': ['W 1 2 Eb'],
    'E3':  ['W 1'],
    'F3':  ['W'],
    'G3':  ['1h 2 3 | 4 5 6', 'W 1h 2 3 | 4 5 6'],
    'Ab3': ['1h 2 3 | 4 5 6 Ab', 'W 1h 2 3 | 4 5 6 Ab'],
    'A3':  ['fA 1 2 3 | 4 5', '1 2 3 | 4 5'],
    'Bb3': ['fA 1 2 3 | 4 RBb', '1 2 3 | 4 RBb', 'fC 1 2 3 | 4 RBb'],
    'C4':  ['fC 1 2 3', '1 2 3'],
    'D4':  ['fD 1 2', '1 2'],
    'Eb4': ['1 2 Eb'],
  };

  /* instrument member id (shared/instruments.js) -> {diagram, notes}
     diagram: the drawing in diagrams.js; 'none' = percussion (no fingerings: the game points to Chime Heist) */
  window.MASHER_FINGERINGS = {
    flute:      {diagram: 'flute',    notes: FLUTE},
    oboe:       {diagram: 'oboe',     notes: OBOE},
    clarinet:   {diagram: 'clarinet', notes: CLARINET},
    basscl:     {diagram: 'clarinet', notes: CLARINET},
    altosax:    {diagram: 'sax',      notes: SAX},
    tenorsax:   {diagram: 'sax',      notes: SAX},
    barisax:    {diagram: 'sax',      notes: SAX},
    bassoon:    {diagram: 'bassoon',  notes: BASSOON},
    trumpet:    {diagram: 'trumpet',  notes: TRUMPET},
    baritonetc: {diagram: 'trumpet',  notes: TRUMPET},
    horn:       {diagram: 'horn',     notes: HORN},
    euphbc:     {diagram: 'euph',     notes: EUPHONIUM},
    tuba:       {diagram: 'tuba',     notes: TUBA},
    trombone:   {diagram: 'trombone', notes: TROMBONE},
    bells:      {diagram: 'none',     notes: {}},
  };
})();
