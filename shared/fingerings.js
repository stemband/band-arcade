/* THE FINGERING TABLE (shared: Button Masher checks combos against it, Arcade Quest's FINGERING challenge draws from
   it, Scale Trainer's fingering card and NOTE BY NOTE show it, Music Highway's octave fit reads it). Every fingering
   Button Masher accepts, for every instrument. EVERY NOTE OF EVERY MEMBER'S GMEA CHROMATIC RANGE (instruments.js
   `chromatic`, middle school) AND OF THE HIGH SCHOOL RANGES (shared/scales.js CHROMATIC_HS) is listed
   (tests/scale-trainer.spec.js checks both), so every scale note has one too.
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
                Flute:     T (B thumb), Tb (B♭ thumb lever), G# (left pinky), Eb (right pinky),
                           C# C (the footjoint rollers: low C♯, low C; right pinky)
                Oboe:      Oct (thumb octave key), Oct2 (side octave key), G# LEb LF LB LBb (left pinky), REb RF RC# RC (right pinky)
                Clarinet:  Th (thumb hole), Reg (register key), A, G# (throat keys), LE LF LF# (left pinky),
                           RE RF RAb (right pinky), SEb SBb (right-hand side keys: side E♭ and side B♭),
                           Sl (the C♯/G♯ sliver key, right hand)
                Saxophone: Oct, bis, pD pEb pF (palm keys), fF (front F), SE SC SBb (side keys), G# LC# LB LBb
                           (left pinky), REb RC (right pinky)
                Bassoon:   W (whisper key), fA fC fD (flick keys), LBb LB LC LD (low keys; all left thumb), C# Eb (left pinky),
                           RE RF# RBb (right thumb), F Ab (right pinky)

   HOW TO FIX A FINGERING
     Find the instrument below (trumpet and Baritone T.C. share one table, so do the clarinets, the saxophones)
     and edit that note's list. To make an alternate the primary, move it to the front. To stop accepting one,
     delete it. Save and reload: the Chart view shows the change. Only use key names that appear on the diagram
     (listed above); a typo shows a warning in the browser console.

   VERIFIED BY MR. GRAHAM
     Bassoon  E♭3 = W 1 3 (whisper key, left hand 1 and 3; no E♭ key). The old W 1 2 + E♭ key is not accepted.

   ADDED FOR SCALE TRAINER, PLEASE CHECK
     Every note below was missing (the table only had Button Masher's notes); Scale Trainer needs each member's whole
     GMEA chromatic range. Primary first, then alternates. Written pitch (euphonium B.C., trombone, bassoon, tuba: concert).
     Flute:     C4 T 1 2 3 | 4 5 6 + low C roller · C♯4 T 1 2 3 | 4 5 6 + low C♯ roller · D4 T 1 2 3 | 4 5 6 ·
                E♭4 T 1 2 3 | 4 5 6 E♭ · E4 T 1 2 3 | 4 5 E♭ · F♯4 T 1 2 3 | 6 E♭ (also without E♭) ·
                F♯5 T 1 2 3 | 6 E♭ · C♯6 2 3 | E♭ · E6 T 1 2 | 4 5 E♭ · F6 T 1 3 | 4 E♭
     Oboe:      C4 1 2 3 | 4 5 6 + low C · C♯4 1 2 3 | 4 5 6 + low C♯ · D4 1 2 3 | 4 5 6 · E4 1 2 3 | 4 5 ·
                F♯4 1 2 3 | 6 · B4 1 · F♯5 ½1 2 3 | 6 · B5 Oct 1 (or side octave 1) · C6 side octave 2 (or Oct 2)
     Clarinet and Bass Clarinet:
                E3 Th 1 2 3 | 4 5 6 + left E/B (or right E/B) · F3 the same with F/C · F♯3 Th 1 2 3 | 4 5 6 + left F♯/C♯ ·
                A♭3 Th 1 2 3 | 4 5 6 + right A♭/E♭ · C♯4 Th 1 2 3 + the C♯/G♯ sliver key (new key: Sl) · A♭4 the G♯ throat key ·
                C♯5 Reg Th 1 2 3 | 4 5 6 + left F♯/C♯ · E♭5 Reg Th 1 2 3 | 4 5 6 + right A♭/E♭ · F♯5 Reg Th 1 2 3 | 5 ·
                G5 Reg Th 1 2 3 · A♭5 Reg Th 1 2 3 + sliver · A5 Reg Th 1 2 · B♭5 Reg Th 1 2 + side E♭/B♭ · B5 Reg Th 1 ·
                C6 Reg Th · C♯6 Reg Th 2 3 | 4 5 + A♭/E♭ · D6 Reg Th 2 3 | 4 + A♭/E♭ (altissimo; not in the bass clarinet's range)
     Saxophones: C♯4 1 2 3 + low C♯ | 4 5 6 · E♭4 1 2 3 | 4 5 6 + low E♭ · A♭4 1 2 3 + G♯ · A♭5 Oct 1 2 3 + G♯ ·
                C♯6 Oct only · D6 Oct + palm D
     Bassoon:   B♭1 W 1 2 3 | 4 5 6 + low D + low B♭ · B1 … + low D + low B · C2 … + low D + low C · C♯2 … + low D + C♯ ·
                D2 W 1 2 3 | 4 5 6 + low D · E♭2 … + low D + E♭ · E2 W 1 2 3 | 4 5 6 + E (right thumb) ·
                F♯2 W 1 2 3 | 4 5 6 + F♯ (right thumb) · B2 W 1 2 3 | 4 · F♯3 ½1 2 3 | 4 5 6 + F♯ (whisper optional) ·
                B3 A flick 1 2 3 | 4 (flick optional) · C♯4 C flick 1 2 3 + C♯ (flick optional) · E4 1 2 | 4 5 · F4 1 2 | 4
                (new keys: the low B♭, B, C and D keys on the left thumb)
     Horn:      F3 1 (or T0) · F♯3 2 (or 1-2-3, T1-2-3) · G3 0 (or 1-3, T1-3) · A♭3 2-3 (or T2-3) · A3 1-2 (or 3, T1-2) ·
                C♯4 1-2 (or 3, T2-3) · F♯4 2 (or T1-2) · C♯5 1-2 (or T2-3)
     Euphonium B.C.: E2 1-2-3 (or 2-4) · F♯2 2-3 · B2 1-2-3 (or 2-4) · F♯3 2-3 · B3 1-2 (or 3) · C♯4 2 · E4 2 · F4 open
     Trombone:  E2 7th · F♯2 5th · B2 7th · F♯3 5th · B3 4th · C♯4 2nd (or 5th) · E4 2nd · F4 1st
     Tuba:      E1 1-2-3 (or 2-4) · F♯1 2-3 · B1 1-2-3 (or 2-4) · F♯2 2-3 · B2 1-2 (or 3) · C♯3 2 · E3 2 · F3 open

   ADDED FOR SCALE TRAINER HS, PLEASE CHECK
     The GMEA HIGH SCHOOL chromatic ranges (shared/scales.js CHROMATIC_HS) reach past the middle school ones: every note
     below was missing. Primary first, then alternates; I'm confident of the valve brass and trombone, much less of the
     woodwinds' top notes (marked ?): please check every one against your charts.
     Trumpet and Baritone T.C. (to C6): A♭5 2-3 · A5 1-2 (or 3) · B♭5 1 · B5 2 · C6 open
     Horn (to A5):  F♯5 2 (or T2) · A♭5 2-3 (or T2) · A5 1-2 (or T0)
     Euphonium B.C. (to B♭4): F♯4 2-3 · G4 1-2 (or 3) · A♭4 1 (or 2-3) · A4 2 · B♭4 open
     Tuba (to B♭3): F♯3 2-3 · G3 1-2 (or 3) · A♭3 1 (or 2-3) · A3 2 · B♭3 open
     Trombone (to B♭4): F♯4 3rd (or 5th) · G4 2nd (or 4th) · A♭4 3rd (or 1st) · A4 2nd · B♭4 1st
     Flute (to C7) ?: F♯6 T 1 3 | 6 E♭ · G6 1 2 3 | E♭ (no thumb) · A♭6 2 3 G♯ | E♭ · A6 T 1 | 5 E♭ ·
                B♭6 T 1 G♯ | 4 E♭ · B6 T 1 3 G♯ | 4 + low C roller · C7 1 2 3 G♯ | 4 E♭
     Oboe (B♭3 and B3 down low, to F6) ?: B♭3 1 2 3 + low B♭ (left pinky) | 4 5 6 + low C (or without low C) ·
                B3 the same with low B · C♯6 Oct2 2 3 | 4 5 6 · D6 Oct2 1 2 3 | 4 5 · E♭6 Oct2 1 2 3 | 4 5 6 REb ·
                E6 Oct2 1 2 | 4 5 RF · F6 Oct2 1 3 | 4 RF   (new keys on the oboe diagram: LB, LBb = low B and B♭, left pinky)
     Clarinet (to G6, altissimo) ?: E♭6 Th Reg 2 3 | 5 6 + A♭/E♭ · E6 Th Reg 2 | 4 5 + A♭/E♭ · F6 Th Reg 2 | 4 + A♭/E♭ ·
                F♯6 Th Reg 3 | 4 + A♭/E♭ · G6 Th Reg 3 | 5
     Saxophones (B♭3 and B3 down low, to F6): B♭3 1 2 3 + low B♭ | 4 5 6 · B3 1 2 3 + low B | 4 5 6 ·
                E♭6 Oct + palm D + palm E♭ · E6 … + side E · F6 … + side E + palm F
     Bassoon (to B♭4) ?: F♯4 1 2 | 6 + F♯ (right thumb) · G4 1 2 | 4 5 + A♭ · A♭4 2 3 | 4 5 6 + A♭ · A4 2 3 | 4 5 ·
                B♭4 2 3 | 4 5 + B♭ (right thumb)

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
       D3 (W 1 2), E3 (W 1), F3 (W only)
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
    'Ab5': ['2-3'],                                     // added for Scale Trainer HS (to C6)
    'A5':  ['1-2', '3'],
    'Bb5': ['1'],
    'B5':  ['2'],
    'C6':  ['0'],
  };

  const HORN = {          // Horn in F (written). F side first, then B♭ side (thumb trigger)
    'F3':  ['1', 'T0'],
    'F#3': ['2', '1-2-3', 'T1-2-3'],
    'G3':  ['0', '1-3', 'T1-3'],
    'Ab3': ['2-3', 'T2-3'],
    'A3':  ['1-2', '3', 'T1-2'],
    'Bb3': ['1', 'T1'],
    'B3':  ['2', 'T2'],
    'C4':  ['0', 'T0'],
    'C#4': ['1-2', '3', 'T2-3'],
    'D4':  ['1', 'T1-2', 'T3'],
    'Eb4': ['2', 'T1'],
    'E4':  ['0', '1-2', '3', 'T2'],
    'F4':  ['1', 'T0'],
    'F#4': ['2', 'T1-2'],
    'G4':  ['0', 'T1'],
    'Ab4': ['2-3', 'T2'],
    'A4':  ['1-2', '3', 'T0'],
    'Bb4': ['1', 'T1'],
    'B4':  ['2', 'T2'],
    'C5':  ['0', 'T0'],
    'C#5': ['1-2', 'T2-3'],
    'D5':  ['1', 'T1-2', 'T3'],
    'Eb5': ['2', 'T1'],
    'E5':  ['0', 'T2'],
    'F5':  ['1', 'T0'],
    'F#5': ['2', 'T2'],                                 // added for Scale Trainer HS (to A5)
    'G5':  ['0', 'T0', 'T1'],
    'Ab5': ['2-3', 'T2'],
    'A5':  ['1-2', 'T0'],
  };

  const EUPHONIUM = {     // Baritone / Euphonium B.C. (concert pitch). 4 = the 4th valve
    'E2':  ['1-2-3', '2-4'],
    'F2':  ['1-3', '4'],
    'F#2': ['2-3'],
    'G2':  ['1-2', '3'],
    'Ab2': ['1'],
    'A2':  ['2'],
    'Bb2': ['0'],
    'B2':  ['1-2-3', '2-4'],
    'C3':  ['1-3', '4'],
    'Db3': ['2-3'],
    'D3':  ['1-2', '3'],
    'Eb3': ['1'],
    'E3':  ['2'],
    'F3':  ['0'],
    'F#3': ['2-3'],
    'G3':  ['1-2', '3'],
    'Ab3': ['1'],
    'A3':  ['2'],
    'Bb3': ['0'],
    'B3':  ['1-2', '3'],
    'C4':  ['1', '1-3', '4'],
    'C#4': ['2'],
    'D4':  ['0'],
    'Eb4': ['1'],
    'E4':  ['2'],
    'F4':  ['0'],
    'F#4': ['2-3'],                                     // added for Scale Trainer HS (to B♭4)
    'G4':  ['1-2', '3'],
    'Ab4': ['1', '2-3'],
    'A4':  ['2'],
    'Bb4': ['0'],
  };

  const TUBA = {          // B♭ tuba (concert pitch). 4 = the 4th valve
    'E1':  ['1-2-3', '2-4'],
    'F1':  ['1-3', '4'],
    'F#1': ['2-3'],
    'G1':  ['1-2', '3'],
    'Ab1': ['1'],
    'A1':  ['2'],
    'Bb1': ['0'],
    'B1':  ['1-2-3', '2-4'],
    'C2':  ['1-3', '4'],
    'Db2': ['2-3'],
    'D2':  ['1-2', '3'],
    'Eb2': ['1'],
    'E2':  ['2'],
    'F2':  ['0'],
    'F#2': ['2-3'],
    'G2':  ['1-2', '3'],
    'Ab2': ['1'],
    'A2':  ['2'],
    'Bb2': ['0'],
    'B2':  ['1-2', '3'],
    'C3':  ['1', '1-3', '4'],
    'C#3': ['2'],
    'D3':  ['0'],
    'Eb3': ['1'],
    'E3':  ['2'],
    'F3':  ['0'],
    'F#3': ['2-3'],                                     // added for Scale Trainer HS (to B♭3)
    'G3':  ['1-2', '3'],
    'Ab3': ['1', '2-3'],
    'A3':  ['2'],
    'Bb3': ['0'],
  };

  /* ---------- trombone: slide positions ---------- */
  const TROMBONE = {
    'E2':  [7],
    'F2':  [6],
    'F#2': [5],
    'G2':  [4],
    'Ab2': [3],
    'A2':  [2],
    'Bb2': [1],
    'B2':  [7],
    'C3':  [6],
    'Db3': [5],
    'D3':  [4],
    'Eb3': [3],
    'E3':  [2],
    'F3':  [1, 6],
    'F#3': [5],
    'G3':  [4],
    'Ab3': [3],
    'A3':  [2],
    'Bb3': [1, 5],
    'B3':  [4],
    'C4':  [3, 6],
    'C#4': [2, 5],
    'D4':  [1, 4],
    'Eb4': [3],
    'E4':  [2],
    'F4':  [1],
    'F#4': [3, 5],                                      // added for Scale Trainer HS (to B♭4)
    'G4':  [2, 4],
    'Ab4': [3, 1],
    'A4':  [2],
    'Bb4': [1],
  };

  /* ---------- woodwinds ---------- */
  const FLUTE = {
    'C4':  ['T 1 2 3 | 4 5 6 C'],
    'C#4': ['T 1 2 3 | 4 5 6 C#'],
    'D4':  ['T 1 2 3 | 4 5 6'],
    'Eb4': ['T 1 2 3 | 4 5 6 Eb'],
    'E4':  ['T 1 2 3 | 4 5 Eb'],
    'F4':  ['T 1 2 3 | 4 Eb', 'T 1 2 3 | 4'],
    'F#4': ['T 1 2 3 | 6 Eb', 'T 1 2 3 | 6'],
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
    'F#5': ['T 1 2 3 | 6 Eb'],
    'G5':  ['T 1 2 3 | Eb'],
    'Ab5': ['T 1 2 3 G# | Eb'],
    'A5':  ['T 1 2 | Eb'],
    'Bb5': ['Tb 1 | Eb', 'T 1 | 4 Eb'],
    'B5':  ['T 1 | Eb'],
    'C6':  ['1 | Eb'],
    'C#6': ['2 3 | Eb'],
    'D6':  ['T 2 3 | Eb'],
    'Eb6': ['T 1 2 3 | 4 5 6 Eb'],
    'E6':  ['T 1 2 | 4 5 Eb'],
    'F6':  ['T 1 3 | 4 Eb'],
    'F#6': ['T 1 3 | 6 Eb'],                            // added for Scale Trainer HS (to C7)
    'G6':  ['1 2 3 | Eb'],
    'Ab6': ['2 3 G# | Eb'],
    'A6':  ['T 1 | 5 Eb'],
    'Bb6': ['T 1 G# | 4 Eb'],
    'B6':  ['T 1 3 G# | 4 C'],
    'C7':  ['1 2 3 G# | 4 Eb'],
  };

  const OBOE = {
    'Bb3': ['1 2 3 LBb | 4 5 6 RC', '1 2 3 LBb | 4 5 6'],     // added for Scale Trainer HS (low B♭ and B: left pinky)
    'B3':  ['1 2 3 LB | 4 5 6 RC', '1 2 3 LB | 4 5 6'],
    'C4':  ['1 2 3 | 4 5 6 RC'],
    'C#4': ['1 2 3 | 4 5 6 RC#'],
    'D4':  ['1 2 3 | 4 5 6'],
    'Eb4': ['1 2 3 | 4 5 6 REb', '1 2 3 LEb | 4 5 6'],
    'E4':  ['1 2 3 | 4 5'],
    'F4':  ['1 2 3 | 5 6 RF', '1 2 3 | 4 6', '1 2 3 LF | 5 6'],
    'F#4': ['1 2 3 | 6'],
    'G4':  ['1 2 3'],
    'Ab4': ['1 2 3 G#'],
    'A4':  ['1 2'],
    'Bb4': ['1 | 4'],
    'B4':  ['1'],
    'C5':  ['2'],
    'Db5': [''],
    'D5':  ['1h 2 3 | 4 5 6'],
    'Eb5': ['1h 2 3 | 4 5 6 REb', '1h 2 3 LEb | 4 5 6'],
    'E5':  ['1h 2 3 | 4 5'],
    'F5':  ['1h 2 3 | 5 6 RF', '1h 2 3 | 4 6', '1h 2 3 LF | 5 6'],
    'F#5': ['1h 2 3 | 6'],
    'G5':  ['Oct 1 2 3'],
    'Ab5': ['Oct 1 2 3 G#'],
    'A5':  ['Oct 1 2'],
    'Bb5': ['Oct 1 | 4'],
    'B5':  ['Oct 1', 'Oct2 1'],
    'C6':  ['Oct2 2', 'Oct 2'],
    'C#6': ['Oct2 2 3 | 4 5 6'],                         // added for Scale Trainer HS (to F6)
    'D6':  ['Oct2 1 2 3 | 4 5'],
    'Eb6': ['Oct2 1 2 3 | 4 5 6 REb'],
    'E6':  ['Oct2 1 2 | 4 5 RF'],
    'F6':  ['Oct2 1 3 | 4 RF'],
  };

  const CLARINET = {      // B♭ Clarinet and Bass Clarinet (written)
    'E3':  ['Th 1 2 3 LE | 4 5 6', 'Th 1 2 3 | 4 5 6 RE'],
    'F3':  ['Th 1 2 3 LF | 4 5 6', 'Th 1 2 3 | 4 5 6 RF'],
    'F#3': ['Th 1 2 3 LF# | 4 5 6'],
    'G3':  ['Th 1 2 3 | 4 5 6'],
    'Ab3': ['Th 1 2 3 | 4 5 6 RAb'],
    'A3':  ['Th 1 2 3 | 4 5'],
    'Bb3': ['Th 1 2 3 | 4'],
    'B3':  ['Th 1 2 3 | 5'],
    'C4':  ['Th 1 2 3'],
    'C#4': ['Th 1 2 3 | Sl'],
    'D4':  ['Th 1 2'],
    'Eb4': ['Th 1 2 | SEb'],
    'E4':  ['Th 1'],
    'F4':  ['Th'],
    'F#4': ['1'],
    'G4':  [''],
    'Ab4': ['G#'],
    'A4':  ['A'],
    'Bb4': ['A Reg'],
    'B4':  ['Th Reg 1 2 3 LE | 4 5 6', 'Th Reg 1 2 3 | 4 5 6 RE'],
    'C5':  ['Th Reg 1 2 3 LF | 4 5 6', 'Th Reg 1 2 3 | 4 5 6 RF'],
    'C#5': ['Th Reg 1 2 3 LF# | 4 5 6'],
    'D5':  ['Th Reg 1 2 3 | 4 5 6'],
    'Eb5': ['Th Reg 1 2 3 | 4 5 6 RAb'],
    'E5':  ['Th Reg 1 2 3 | 4 5'],
    'F5':  ['Th Reg 1 2 3 | 4'],
    'F#5': ['Th Reg 1 2 3 | 5'],
    'G5':  ['Th Reg 1 2 3'],
    'Ab5': ['Th Reg 1 2 3 | Sl'],
    'A5':  ['Th Reg 1 2'],
    'Bb5': ['Th Reg 1 2 | SEb'],
    'B5':  ['Th Reg 1'],
    'C6':  ['Th Reg'],
    'C#6': ['Th Reg 2 3 | 4 5 RAb'],
    'D6':  ['Th Reg 2 3 | 4 RAb'],
    'Eb6': ['Th Reg 2 3 | 5 6 RAb'],                     // added for Scale Trainer HS (to G6: altissimo)
    'E6':  ['Th Reg 2 | 4 5 RAb'],
    'F6':  ['Th Reg 2 | 4 RAb'],
    'F#6': ['Th Reg 3 | 4 RAb'],
    'G6':  ['Th Reg 3 | 5'],
  };

  const SAX = {           // Alto, Tenor and Baritone Sax (written)
    'Bb3': ['1 2 3 LBb | 4 5 6'],                         // added for Scale Trainer HS (low B♭ and B)
    'B3':  ['1 2 3 LB | 4 5 6'],
    'C4':  ['1 2 3 | 4 5 6 RC'],
    'C#4': ['1 2 3 LC# | 4 5 6'],
    'D4':  ['1 2 3 | 4 5 6'],
    'Eb4': ['1 2 3 | 4 5 6 REb'],
    'E4':  ['1 2 3 | 4 5'],
    'F4':  ['1 2 3 | 4'],
    'F#4': ['1 2 3 | 5'],
    'G4':  ['1 2 3'],
    'Ab4': ['1 2 3 G#'],
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
    'Ab5': ['Oct 1 2 3 G#'],
    'A5':  ['Oct 1 2'],
    'Bb5': ['Oct 1 bis', 'Oct 1 | 4', 'Oct 1 | SBb'],
    'B5':  ['Oct 1'],
    'C6':  ['Oct 2', 'Oct 1 | SC'],
    'C#6': ['Oct'],
    'D6':  ['Oct pD'],
    'Eb6': ['Oct pD pEb'],                                // added for Scale Trainer HS (to F6: palm keys)
    'E6':  ['Oct pD pEb SE'],
    'F6':  ['Oct pD pEb SE pF'],
  };

  const BASSOON = {
    'Bb1': ['W 1 2 3 LD LBb | 4 5 6'],
    'B1':  ['W 1 2 3 LD LB | 4 5 6'],
    'C2':  ['W 1 2 3 LD LC | 4 5 6'],
    'C#2': ['W 1 2 3 LD C# | 4 5 6'],
    'D2':  ['W 1 2 3 LD | 4 5 6'],
    'Eb2': ['W 1 2 3 LD Eb | 4 5 6'],
    'E2':  ['W 1 2 3 | 4 5 6 RE'],
    'F2':  ['W 1 2 3 | 4 5 6 F'],
    'F#2': ['W 1 2 3 | 4 5 6 RF#'],
    'G2':  ['W 1 2 3 | 4 5 6'],
    'Ab2': ['W 1 2 3 | 4 5 6 Ab'],
    'A2':  ['W 1 2 3 | 4 5'],
    'Bb2': ['W 1 2 3 | 4 RBb'],
    'B2':  ['W 1 2 3 | 4'],
    'C3':  ['W 1 2 3'],
    'Db3': ['W 1 2 3 C#'],
    'D3':  ['W 1 2'],
    'Eb3': ['W 1 3'],                                    // verified by Mr. Graham
    'E3':  ['W 1'],
    'F3':  ['W'],
    'F#3': ['1h 2 3 | 4 5 6 RF#', 'W 1h 2 3 | 4 5 6 RF#'],
    'G3':  ['1h 2 3 | 4 5 6', 'W 1h 2 3 | 4 5 6'],
    'Ab3': ['1h 2 3 | 4 5 6 Ab', 'W 1h 2 3 | 4 5 6 Ab'],
    'A3':  ['fA 1 2 3 | 4 5', '1 2 3 | 4 5'],
    'Bb3': ['fA 1 2 3 | 4 RBb', '1 2 3 | 4 RBb', 'fC 1 2 3 | 4 RBb'],
    'B3':  ['fA 1 2 3 | 4', '1 2 3 | 4'],
    'C4':  ['fC 1 2 3', '1 2 3'],
    'C#4': ['fC 1 2 3 C#', '1 2 3 C#'],
    'D4':  ['fD 1 2', '1 2'],
    'Eb4': ['1 2 Eb'],
    'E4':  ['1 2 | 4 5'],
    'F4':  ['1 2 | 4'],
    'F#4': ['1 2 | 6 RF#'],                               // added for Scale Trainer HS (to B♭4)
    'G4':  ['1 2 | 4 5 Ab'],
    'Ab4': ['2 3 | 4 5 6 Ab'],
    'A4':  ['2 3 | 4 5'],
    'Bb4': ['2 3 | 4 5 RBb'],
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
