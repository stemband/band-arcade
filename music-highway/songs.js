/* Music Highway: THE SONG LIST (Mat edits this file). Songs are the game's levels, in this order.
   NEVER REORDER OR REMOVE SONGS: stars are saved by song NUMBER (1 = the first song below). Add new songs at the END.

   A SONG = {
     id        never change it (the backing-drums file is shared/sounds/mh-drums-<id>.m4a, and the Song Board links to it)
     title     as students see it
     source    composer or source ("Traditional (American folk song)", "Scott Joplin, 1902")
     tier      1 = only degrees 1–5 in the first-five octave · 2 = the whole scale · 3 = wider range, minor, accidentals, syncopation
     tempo     quarter notes per minute (Slow mode plays 75 % of it)
     timeSig   as printed: [4, 4], [3, 4], [2, 4], [2, 2] (cut time, drawn ¢), [6, 8] or [3, 8]. Beats are always QUARTER
               notes (a 6/8 measure = 3 beats, 3/8 = 1.5) and `tempo` is quarter notes a minute; the drums, the count-in,
               the chords, the highway's lines and the snare's DOWNBEATS RIGHT follow the PRIMARY beat (2/2: two halves;
               6/8: two dotted quarters; 3/8: one dotted quarter)
     key       the CONCERT major key the song is written in: 'Bb' (the default; every group except the C–G horn reads it
               with its own key signature). The engine moves the song to a C–G horn's first five (concert F) itself.
     mode      optional: 'minor' = degree 1 is the key's relative minor (in 'Bb': G minor, same key signature)
     style     the drum groove: 'rock' | 'march' | 'swing' | 'waltz'
     notes     [{deg, oct, beats, acc?} | {rest: beats}], built below from one line of text per phrase (see NOTE TEXT)
                 deg   1–7, a scale degree of the key (or of the minor)
                 oct   0 = the octave from degree 1 up to degree 7; 1 = the octave above; -1 = below
                 beats length in quarter-note beats (0.5 = an eighth, 1.5 = dotted quarter, 0.25 = a sixteenth)
                 acc   optional: +1 = raised a half step (♯ or ♮), -1 = lowered
     sticking  optional, for the snare: one R or L per note, in order (spaces and | are ignored), e.g. 'RLRL RRLL'. Left out,
               the student's pattern on the song select decides (ALTERNATE or DOWNBEATS RIGHT). The Song Board checks the count.
     chords    optional: one chord per measure, as Roman numerals ('I IV V I …'; minor songs 'i iv v'). Left out, the
               game picks I / IV / V (i / iv / v) for each measure from the melody. Only heard in HEADPHONES MODE.
   }
   The game maps every degree to the student's WRITTEN notes (song-map.js): concert pitch, then each instrument's
   transposition, in the octave that fits that instrument (tier 1 = exactly the first five notes). One song = every
   instrument. The Snare Drum plays the same rhythm (no pitch).

   NOTE TEXT: one string per phrase, notes separated by spaces, '|' = a bar line (checked: every measure must add up,
   or the Song Board and the browser console say which one doesn't).
       3        degree 3, one beat            3:2     degree 3, two beats          3:.5   an eighth note
       5,       degree 5 an octave LOWER      1'      degree 1 an octave HIGHER    #4     degree 4 raised   b7  lowered
       r:2      a rest, two beats
       5:2~     a TIE: '~' at the end ties this note into the NEXT note (same degree, octave and accidental), e.g.
                '5:2~ | 5 5' (2/4) = one note held 3 beats, then 5. The game plays a tied pair as ONE held note (one
                pad, one longer trail); the bar check still counts each side in its own measure; the staff draws a tie.
       (3 4 5)  a SLUR: parentheses around a group of notes (at least two; it may cross bar lines, e.g. '(5 | 4 3) 2').
                The staff draws the slur arc, the highway joins the pads with a thin ribbon ("one breath, no tongue"), and
                the game's feedback says SMOOTH or "tongued" (feedback only: a slurred note scores exactly like any other).
                A tie can sit inside a slur ('(3:2~ | 3 2)'). A '(' that is never closed, a ')' with no '(' or a slur
                inside a slur is reported on the Song Board and in the console. The Snare Drum ignores slurs.
   A future MIDI importer only needs to produce the `notes` objects (see music-highway/README.md). */
(function () {
  'use strict';
  /** one phrase of NOTE TEXT -> note objects (bar lines are kept as {bar: true} markers for the measure check) */
  function N(...lines) {
    const out = [], problems = [];
    let slur = null, slurs = 0;                                // the open slur: {id, notes}
    lines.join(' | ').split(/\s+/).filter(Boolean).forEach(tok => {
      if (tok === '|') { out.push({bar: true}); return; }
      const m = /^(\()?(r|([#b]?)([1-7])([',]*))(?::([\d.]+))?(~)?(\))?$/.exec(tok);
      if (!m) { problems.push(`"${tok}" is not a note`); return; }
      const beats = m[6] ? parseFloat(m[6]) : 1;
      if (m[1]) {                                              // '(' opens a slur
        if (slur) problems.push(`a slur "(" inside another slur at "${tok}"`);
        else slur = {id: ++slurs, notes: []};
      }
      let o;
      if (m[2] === 'r') {
        o = {rest: beats};
        if (slur) problems.push(`a rest inside a slur at "${tok}"`);
      } else {
        o = {deg: +m[4], oct: (m[5].match(/'/g) || []).length - (m[5].match(/,/g) || []).length, beats};
        if (m[3]) o.acc = m[3] === '#' ? 1 : -1;
        if (m[7]) o.tie = true;                                // tied into the next note (see NOTE TEXT)
        if (slur) slur.notes.push(o);
      }
      out.push(o);
      if (m[8]) {                                              // ')' closes it
        if (!slur) problems.push(`a ")" with no "(" at "${tok}"`);
        else { close(slur); slur = null; }
      }
    });
    if (slur) problems.push(`a slur "(" is never closed (it starts ${slur.notes.length ? 'at note ' + (out.filter(n => n.deg).indexOf(slur.notes[0]) + 1) : 'before the end'})`);
    function close(sl) {
      // a slur needs two DIFFERENT notes (a tied pair alone is one note)
      if (sl.notes.filter((n, i) => !(i && sl.notes[i - 1].tie)).length < 2) { problems.push('a slur around a single note'); return; }
      sl.notes.forEach(n => { n.slur = sl.id; });
    }
    if (problems.length) { out.problems = problems; problems.forEach(p => console.warn('Music Highway songs.js: ' + p)); }
    return out;
  }
  (window.Arcade = window.Arcade || {}).MHSongText = N;     // the same reader, for tests

  window.MH_SONGS = [
    /* ---------- TIER 1: the first five notes (degrees 1–5) ---------- */
    {id: 'hot-cross-buns', title: 'Hot Cross Buns', source: 'Traditional (English street cry)', tier: 1, tempo: 88, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('3 2 1:2 | 3 2 1:2 | 1:.5 1:.5 1:.5 1:.5 2:.5 2:.5 2:.5 2:.5 | 3 2 1:2')},
    {id: 'mary-lamb', title: 'Mary Had a Little Lamb', source: 'Traditional (American nursery song)', tier: 1, tempo: 96, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('3 2 1 2 | 3 3 3:2 | 2 2 2:2 | 3 5 5:2', '3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1:4')},
    {id: 'aunt-rhody', title: 'Go Tell Aunt Rhody', source: 'Traditional (American folk song)', tier: 1, tempo: 96, timeSig: [4, 4], key: 'Bb', style: 'march',
     notes: N('3:2 3 2 | 1 r:1 1 r:1 | 2:2 2 4 | 3 2 1 r:1 | 5:2 5 4 | 3 r:1 3 3 | 2 4 3 2 | 1:4')},
    {id: 'lightly-row', title: 'Lightly Row', source: 'Traditional (German folk song)', tier: 1, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('5 3 3:2 | 4 2 2:2 | 1 2 3 4 | 5 5 5:2', '5 3 3:2 | 4 2 2:2 | 1 3 5 5 | 3:4',
              '2 2 2 2 | 2 3 4:2 | 3 3 3 3 | 3 4 5:2', '5 3 3:2 | 4 2 2:2 | 1 3 5 5 | 1:4')},
    {id: 'ode-to-joy', title: 'Ode to Joy', source: 'Ludwig van Beethoven (Symphony No. 9, main theme)', tier: 1, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3:1.5 2:.5 2:2', '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2:1.5 1:.5 1:2')},
    {id: 'jingle-bells', title: 'Jingle Bells', source: 'James Lord Pierpont (chorus)', tier: 1, tempo: 108, timeSig: [4, 4], key: 'Bb', style: 'swing',
     notes: N('3 3 3:2 | 3 3 3:2 | 3 5 1:1.5 2:.5 | 3:4', '4 4 4:1.5 4:.5 | 4 3 3 3:.5 3:.5 | 3 2 2 3 | 2:2 5:2',
              '3 3 3:2 | 3 3 3:2 | 3 5 1:1.5 2:.5 | 3:4', '4 4 4 4 | 4 3 3 3:.5 3:.5 | 5 5 4 2 | 1:4')},
    {id: 'saints', title: 'When the Saints Go Marching In', source: 'Traditional (American spiritual)', tier: 1, tempo: 104, timeSig: [4, 4], key: 'Bb', style: 'swing',
     notes: N('r 1 3 4 | 5:4 | r 1 3 4 | 5:4', 'r 1 3 4 | 5:2 3:2 | 1:2 3:2 | 2:4',
              'r 3 3 2 | 1:3 1 | 3:2 5:2 | 5 4:3', 'r:2 3 4 | 5:2 3:2 | 1:2 2:2 | 1:4')},

    /* ---------- TIER 2: the whole scale ---------- */
    {id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', source: 'Traditional (French melody "Ah! vous dirai-je, maman")', tier: 2, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('1 1 5 5 | 6 6 5:2 | 4 4 3 3 | 2 2 1:2', '5 5 4 4 | 3 3 2:2 | 5 5 4 4 | 3 3 2:2',
              '1 1 5 5 | 6 6 5:2 | 4 4 3 3 | 2 2 1:2')},
    {id: 'frere-jacques', title: 'Frère Jacques', source: 'Traditional (French round)', tier: 2, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'march',
     notes: N('1 2 3 1 | 1 2 3 1 | 3 4 5:2 | 3 4 5:2', '5:.5 6:.5 5:.5 4:.5 3 1 | 5:.5 6:.5 5:.5 4:.5 3 1 | 1 5, 1:2 | 1 5, 1:2')},
    {id: 'yankee-doodle', title: 'Yankee Doodle', source: 'Traditional (American, 1700s)', tier: 2, tempo: 108, timeSig: [4, 4], key: 'Bb', style: 'march',
     notes: N('1 1 2 3 | 1 3 2 5, | 1 1 2 3 | 1:2 7,:2', '1 1 2 3 | 4 3 2 1 | 7, 5, 6, 7, | 1:2 1:2',
              '6:1.5 7:.5 6 5 | 6 7 1\':2 | 5:1.5 6:.5 5 4 | 3:2 5:2', '6:1.5 7:.5 6 5 | 6 7 1\' 6 | 5 1\' 7 2\' | 1\':2 1\':2')},
    {id: 'oh-susanna', title: 'Oh! Susanna', source: 'Stephen Foster, 1848', tier: 2, tempo: 104, timeSig: [4, 4], key: 'Bb', style: 'swing',
     notes: N('r:3 1:.5 2:.5 | 3 5 5:1.5 6:.5 | 5 3 1:1.5 2:.5 | 3 3 2 1 | 2:3 1:.5 2:.5',
              '3 5 5:1.5 6:.5 | 5 3 1:1.5 2:.5 | 3 3 2 2 | 1:4',
              '4:2 6:2 | 6:2 5 5 | 3 1 2:2 | r:2 1 2', '3 5 5:1.5 6:.5 | 5 3 1:1.5 2:.5 | 3 3 2 2 | 1:4')},
    {id: 'camptown-races', title: 'Camptown Races', source: 'Stephen Foster, 1850', tier: 2, tempo: 112, timeSig: [4, 4], key: 'Bb', style: 'swing',
     notes: N('5 5 3 5 | 6 5 3:2 | 3 2:3 | 3 2:3', '5 5 3 5 | 6 5 3:2 | 2:2 3 2 | 1:4',
              '1:1.5 1:.5 3 5 | 1\':4 | 6:1.5 6:.5 1\' 6 | 5:4', '5 5 3 5 | 6 5 3:2 | 2:2 3 2 | 1:4')},

    /* ---------- TIER 3: wider range, minor, accidentals, syncopation ---------- */
    {id: 'aura-lee', title: 'Aura Lee', source: 'George R. Poulton, 1861', tier: 3, tempo: 84, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('5, 1 7, 1 | 2 6, 2:2 | 1 7, 6, 7, | 1:4', '5, 1 7, 1 | 2 6, 2:2 | 1 7, 6, 7, | 1:4',
              '3 3 3:2 | 3 3 3:2 | 3 2 1 2 | 3:4', '3 3 4 3 | 2 5 2:2 | 1 7, 6, 7, | 1:4')},
    {id: 'shenandoah', title: 'Shenandoah', source: 'Traditional (American folk song)', tier: 3, tempo: 76, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('r:3 5, | 1:2 1 1:.5 2:.5 | 3:.5 4:.5 6 5:2 | 1\':1.5 7:.5 6 5 | 6 5 3 5',
              '6:2 6 5:.5 6:.5 | 1\':2 6 5 | 3:4 | r:3 5',
              '1\':2 1\' 2\' | 2\':2 1\' 6 | 1\' 6 5 3 | 5:3 5', '6:2 3 2 | 1:2 2 3 | 1 2 1:2 | 1:4')},
    {id: 'scarborough-fair', title: 'Scarborough Fair', source: 'Traditional (English ballad)', tier: 3, tempo: 104, timeSig: [3, 4], key: 'Bb', mode: 'minor', style: 'waltz',
     notes: N('1:2 1 | 5:2 5 | 2:1.5 3:.5 2 | 1:3', 'r 5 7 | 1\':2 7 | 5 #6 4 | 5:3',
              'r 1\' 1\' | 1\':2 7 | 5 5 4 | 3 2 7,', '1:2 5 | 4:2 3 | 2 1 7, | 1:3')},
    {id: 'the-entertainer', title: 'The Entertainer', source: 'Scott Joplin, 1902 (opening strain)', tier: 3, tempo: 76, timeSig: [2, 4], key: 'Bb', style: 'march',
     notes: N('r:1.5 2:.25 #2:.25',
              '3:.25 1\':.5 3:.25 1\':.5 3:.25 1\':1.25 1\':.25 2\':.25 #2\':.25 3\':.25',
              '1\':.25 2\':.25 3\':.5 7:.25 2\':.5 1\':1.25 r:.5 2:.25 #2:.25',
              '3:.25 1\':.5 3:.25 1\':.5 3:.25 1\':1.25 6:.25 5:.25 #4:.25 6:.25',
              '1\':.25 3\':.5 2\':.25 1\':.25 6:.25 2\':.5 2\':1.5 2:.25 #2:.25',
              '3:.25 1\':.5 3:.25 1\':.5 3:.25 1\':1.25 1\':.25 2\':.25 #2\':.25 3\':.25',
              '1\':.25 2\':.25 3\':.5 7:.25 2\':.5 1\':2.25')},

    /* ---------- ADDED LATER (always at the end: stars are saved by song number). Transcribed by Mr. Graham from trumpet
       (B♭) parts, one step up from concert:
         written C major = concert 'Bb'            written D minor = 'Eb' + mode: 'minor'
         written F major = concert 'Eb'            written A minor = 'Bb' + mode: 'minor'
         written G major = concert 'F'             written E minor = 'F'  + mode: 'minor'
         written B♭ major = concert 'Ab'
       Repeats, 1st/2nd endings and D.C. al Fine are written out (the game plays straight through). ---------- */
    {id: 'good-king-wenceslas', title: 'Good King Wenceslas', source: 'Traditional (English carol)', tier: 1, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'march',
     notes: N('4 4 4 5 | 4 4 1:2 | 2 1 2 3 | 4 r 4 r', '4 4 4 5 | 4 4 1:2 | 2 1 2 3 | 4 r 4 r')},
    // the book's repeat with 1st/2nd endings, written out
    {id: 'orpheus-can-can', title: 'Can-Can (Orpheus in the Underworld)', source: 'Jacques Offenbach, 1858', tier: 2, tempo: 112, timeSig: [2, 4], key: 'Bb', style: 'rock',
     notes: N("1:2 | 2:.5 4:.5 3:.5 2:.5 | 5 5 | 5:.5 6:.5 3:.5 4:.5 | 2 2 | 2:.5 4:.5 3:.5 2:.5 | 1:.5 1':.5 7:.5 6:.5 | 5:.5 4:.5 3:.5 2:.5",
              "1:2 | 2:.5 4:.5 3:.5 2:.5 | 5 5 | 5:.5 6:.5 3:.5 4:.5 | 2 2 | 2:.5 4:.5 3:.5 2:.5 | 1:.5 5:.5 2:.5 3:.5 | 1 1")},
    // the book's 1-beat pickup: the first measure starts with 2 beats of rest
    {id: 'come-from-sydney', title: "I've Just Come From Sydney", source: 'Traditional (Australian folk song)', tier: 1, tempo: 108, timeSig: [3, 4], key: 'Bb', style: 'waltz',
     notes: N('r:2 5:.5 5:.5 | 3 3 5 | 2 2 5 | 5:.5 5:.5 4 2 | 3:2 5:.5 5:.5', '3:.5 3:.5 3 5:.5 5:.5 | 2:.5 2:.5 2 5:.5 5:.5 | (5 4) 2 | 1:3')},   // the book's m. 7 slur (G–F; its measures count from after the pickup)
    {id: 'donkey-riding', title: 'Donkey Riding', source: 'Traditional (Canadian folk song)', tier: 2, tempo: 96, timeSig: [2, 4], key: 'Eb', style: 'march',
     notes: N('1:.5 2:.5 3:.5 3:.5 | 4:.5 2:.5 3 | 3:.5 2:.5 2:.5 1:.5 | 3:.5 2:.5 2', '1:.5 2:.5 3:.5 3:.5 | 4:.5 2:.5 3 | 3:.5 2:.5 2:.5 3:.5 | 1 1')},
    {id: 'frogs-song', title: "The Frog's Song", source: 'Traditional (Japanese folk song)', tier: 2, tempo: 104, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('(1 2 3 4 | 3 2 1:2) | (3 4 5 6 | 5 4 3:2)', '1 r 1 r | 1 r 1 r | (1 2 3 6 | 3 2 1:2)')},   // the book's phrase slurs: mm. 1–2, 3–4, 7–8
    {id: 'san-sereni', title: 'San Serení', source: 'Traditional (Puerto Rican folk song)', tier: 2, tempo: 104, timeSig: [2, 4], key: 'Bb', style: 'rock',
     notes: N('5:2 | 3 4 | 5:2~ | 5 5 | (6 5) | 4 3 | (5:2 | 4:2)', '4:2 | 2 3 | 4:2~ | 4 4 | (5 4) | 2 7, | 1:2~ | 1 r')},   // slurs: mm. 5, 13, 7→8
    {id: 'nutcracker-theme', title: 'Theme from The Nutcracker', source: 'Pyotr Ilyich Tchaikovsky, 1892', tier: 2, tempo: 84, timeSig: [4, 4], key: 'Eb', style: 'march',
     notes: N('1:.5 7,:.5 1:.5 7,:.5 1 7, | 2 1 3:2 | 4:.5 3:.5 4:.5 3:.5 2 1 | 1:2 7,:2',
              '6,:.5 6,:.5 6,:.5 6,:.5 (6, 5,) | 6,:.5 6,:.5 6,:.5 6,:.5 6, 5, | 6,:.5 6,:.5 6,:.5 6,:.5 6, 5, | 1:3 r:1')},   // m. 5: the last two notes slurred
    // written G major (trumpet) = concert F; the book's slurs: mm. 2 (G–F♯), 4 (E–D), 6 (D–C), 8 (A–G)
    {id: 'santa-lucia', title: 'Santa Lucia', source: 'Traditional (Italian folk song)', tier: 2, tempo: 96, timeSig: [3, 4], key: 'F', style: 'waltz',
     chords: 'I | V | IV | I | I | V | V | I',
     notes: N('5, 5, 1 | (1:.5 7,:.5) 7,:2 | 4, 4, 6, | (6, 5,:2)', '3, 6, 5, | (5,:.5 4,:.5) 4,:2 | 5, 6, 7, | (2 1:2)')},
    // written C major (trumpet) = concert B♭; the book's slur: m. 7, the first three notes
    {id: 'werde-munter', title: 'Werde munter (Jesu, Joy)', source: 'Johann Schop, 1642 (used by J.S. Bach in Cantata 147)', tier: 1, tempo: 84, timeSig: [3, 4], key: 'Bb', style: 'waltz',
     chords: 'I | I | IV | V | I | I | V | I',
     notes: N('3:2 4 | 5:2 5 | 4:2 3 | 2 2:2', '3:2 4 | 5:2 3 | (2:.5 4:.5 3) 2 | 1:3')},
    // concert C minor = key 'Eb' + mode 'minor' (degree 1 = C; the natural minor: degree 7 = B♭, no raised leading tone)
    {id: 'dies-irae', title: 'Dies Irae', source: 'Gregorian chant (13th century)', tier: 3, tempo: 72, timeSig: [4, 4], key: 'Eb', mode: 'minor', style: 'march',
     chords: 'i | i | i | v | i | i | i',
     notes: N('3 2 3 1 | 2 7, 1:2', '3 3 4 3 | 2 1 7, 2 | 3 2 1:2', '3 2 3 1 | 2 7, 1:2')},
    // D.C. al Fine written out: the whole piece, then the first line again to Fine
    {id: 'largo-symphony-9', title: '"Largo" from Symphony No. 9', source: 'Antonín Dvořák', tier: 2, tempo: 56, timeSig: [4, 4], key: 'Eb', style: 'rock',
     notes: N("(3:1.5 5:.5) 5:2 | (3:1.5 2:.5) 1:2 | (2:1.5 3:.5 5:1.5 3:.5) | 2:4",
     "(3:1.5 5:.5) 5:2 | (3:1.5 2:.5) 1:2 | 2 3 (2:1.5 1:.5) | 1:4",
     "(6,:1.5 1:.5) 1:2 | (7, 5,) 6,:2 | (6, 1 7, 5,) | 6,:4",
     "(6,:1.5 1:.5) 1:2 | (7, 5,) 6,:2 | (6, 1 7, 5,) | 6,:4",
     "(3:1.5 5:.5) 5:2 | (3:1.5 2:.5) 1:2 | (2:1.5 3:.5 5:1.5 3:.5) | 2:4",
     "(3:1.5 5:.5) 5:2 | (3:1.5 2:.5) 1:2 | 2 3 (2:1.5 1:.5) | 1:4")},
    // Repeat with 1st/2nd endings written out: m1-7 + 1st ending, m1-6 + 2nd ending.
    {id: 'the-wabash-cannonball', title: 'The Wabash Cannonball', source: 'Traditional (American folk song)', tier: 2, tempo: 96, timeSig: [2, 4], key: 'Eb', style: 'march',
     notes: N('5,:.5 5,:.5 1:.5 2:.5 | 3:.5 5 1:.5 | 2:.5 1:.5 1:.5 6,:.5 | 5,:1.5 6,:.5 | 5,:.5 5,:.5 7,:.5 2:.5 | 3:.5 2 2:.5 | 1:.5 2:.5 1:.5 6,:.5 | 5,:1.5 5,:.5',
     '5,:.5 5,:.5 1:.5 2:.5 | 3:.5 5 1:.5 | 2:.5 1:.5 1:.5 6,:.5 | 5,:1.5 6,:.5 | 5,:.5 5,:.5 7,:.5 2:.5 | 3:.5 2 2:.5 | 7,:.5 5,:.5 7,:.5 2:.5 | 1:2')},
    {id: 'still-still-still', title: 'Still, Still, Still', source: 'Austrian Carol', tier: 2, tempo: 76, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N("(5 1') (3 5) | 1:3 (1:.5 3:.5) | 2 (2:.5 4:.5) 7, (7,:.5 2:.5) | 1:3 3",
     "2 (2:.5 3:.5) 4 2 | 3 (3:.5 4:.5) 5 3",
     "2 (2:.5 3:.5) 4 2 | 3 (3:.5 4:.5) 5 3",
     "(5 1') (3 5) | 1:3 (1:.5 3:.5) | 2 (2:.5 4:.5) 7, (7,:.5 2:.5) | 1:3 r")},
    // repeat + 1st/2nd endings written out; the 2nd ending's shouted "Hey!" = a quarter rest
    {id: 'minka-minka', title: 'Minka, Minka', source: 'Ukrainian Folk Song', tier: 3, tempo: 120, timeSig: [2, 4], key: 'Bb', mode: 'minor', style: 'march',
     notes: N("1':.5 1':.5 1':.5 1':.5 | 1':.5 3':.5 2':.5 1':.5 | #7:.5 #7:.5 #7:.5 #7:.5 | #7:.5 2':.5 1':.5 #7:.5",
     "1':.5 1':.5 1':.5 1':.5 | 1':.5 3':.5 2':.5 1':.5 | #7:.5 5:.5 #6:.5 #7:.5 | 1' 1'",
     "1':.5 1':.5 1':.5 1':.5 | 1':.5 3':.5 2':.5 1':.5 | #7:.5 #7:.5 #7:.5 #7:.5 | #7:.5 2':.5 1':.5 #7:.5",
     "1':.5 1':.5 1':.5 1':.5 | 1':.5 3':.5 2':.5 1':.5 | #7:.5 5:.5 #6:.5 #7:.5 | 1' r")},
    // repeat + 1st/2nd endings written out: intro | A + 1st ending | A + 2nd ending
    {id: 'el-capitan', title: 'El Capitan', source: 'John Philip Sousa', tier: 3, tempo: 120, timeSig: [2, 4], key: 'Bb', style: 'march',
     notes: N("1':.5 r:.5 1':.5 r:.5 | 1':.5 r:.5 5",
     "1':2 | 7 3 | 6:.5 3:.5 3 | r:.5 3:.5 2:.5 1:.5 | 4:2 | 3 2 | 3:.5 5:.5 5 | r:.5 5:.5 6:.5 7:.5",
     "1':2 | 7 3 | 6:.5 3:.5 3 | r:.5 3:.5 2:.5 1:.5 | #5:2 | r:.5 5:.5 5:.5 5:.5 | 1':2~ | 1' 5",
     "1':2 | 7 3 | 6:.5 3:.5 3 | r:.5 3:.5 2:.5 1:.5 | 4:2 | 3 2 | 3:.5 5:.5 5 | r:.5 5:.5 6:.5 7:.5",
     "1':2 | 7 3 | 6:.5 3:.5 3 | r:.5 3:.5 2:.5 1:.5 | #5:2 | r:.5 5:.5 5:.5 5:.5 | 1':2~ | 1':.5 r:.5 1':.5 r:.5")},
    // Written E minor (1 sharp, tune ends on E; no D-sharps). 2-beat pickup padded with rests.
    {id: 'theme-from-the-barber-of-seville', title: 'Theme from "The Barber of Seville"', source: 'Gioacchino Rossini (from "The Barber of Seville")', tier: 3, tempo: 120, timeSig: [4, 4], key: 'F', mode: 'minor', style: 'rock',
     notes: N('r:2.5 5:.5 5:.5 5:.5 | (6:.5 5:.5) r r:.5 5:.5 5:.5 5:.5 | (6:.5 5:.5) r r:.5 5:.5 5:.5 5:.5 | (6:.5 5:.5) r:.5 4:.5 (4:.5 3:.5) r:.5 2:.5 | (2:.5 1:.5) 1 r:.5 3:.5 3:.5 3:.5',
     '(2:.5 1:.5) r:.5 3:.5 (2:.5 1:.5) r:.5 3:.5 | (5:.5 2:.5) 2 r:.5 1:.5 7,:.5 6,:.5 | 5,:.5 1:.5 7,:.5 6,:.5 5,:.5 1:.5 7,:.5 6,:.5 | (6,:.5 5,:.5) (5,:.5 4:.5) (4:.5 3:.5) (3:.5 2:.5) | 1:2~ 1:.5 r:.5 r')},
    // Only the first line is visible; it ends with a repeat sign, so it is written out twice.
    {id: 'the-old-brass-wagon', title: 'The Old Brass Wagon', source: 'Traditional (American folk song)', tier: 3, tempo: 96, timeSig: [2, 4], key: 'F', style: 'march',
     notes: N('1:.25 1:.25 1:.25 1:.25 1 | 1:.5 1:.5 (6,:.5 5,:.5) | 2:.25 2:.25 2:.25 2:.25 2 | 5,:.5 5,:.5 (6,:.5 1:.5) | 3:.25 3:.25 3:.25 3:.25 3 | 2:.5 1:.5 (6,:.5 1:.5) | 2:.5 3:.5 5,:.5 6,:.5 | 1 1',
     '1:.25 1:.25 1:.25 1:.25 1 | 1:.5 1:.5 (6,:.5 5,:.5) | 2:.25 2:.25 2:.25 2:.25 2 | 5,:.5 5,:.5 (6,:.5 1:.5) | 3:.25 3:.25 3:.25 3:.25 3 | 2:.5 1:.5 (6,:.5 1:.5) | 2:.5 3:.5 5,:.5 6,:.5 | 1 1')},
    // written out: the whole tune is repeated (repeat sign at the end)
    {id: 'the-galway-piper', title: 'The Galway Piper', source: 'Traditional (Irish reel)', tier: 3, tempo: 96, timeSig: [2, 4], key: 'Eb', style: 'march',
     notes: N('1:.5 3:.5 1:.5 3:.5 | 1:.5 3:.5 (4:.25 3:.25 2:.25 1:.25) | 7,:.5 2:.5 7,:.5 2:.5 | 7,:.5 2:.5 (3:.25 2:.25 1:.25 7,:.25)',
     '1:.5 3:.5 1:.5 3:.5 | 1:.5 3:.5 5 | (4:.25 3:.25 2:.25 1:.25) 7,:.5 2:.5 | 1:.5 3:.5 1:.5 r:.5',
     // repeat
     '1:.5 3:.5 1:.5 3:.5 | 1:.5 3:.5 (4:.25 3:.25 2:.25 1:.25) | 7,:.5 2:.5 7,:.5 2:.5 | 7,:.5 2:.5 (3:.25 2:.25 1:.25 7,:.25)',
     '1:.5 3:.5 1:.5 3:.5 | 1:.5 3:.5 5 | (4:.25 3:.25 2:.25 1:.25) 7,:.5 2:.5 | 1:.5 3:.5 1:.5 r:.5')},
    // written out: the whole tune is repeated (repeat sign at the end)
    {id: 'sourwood-mountain', title: 'Sourwood Mountain', source: 'Traditional (American folk song)', tier: 3, tempo: 108, timeSig: [2, 4], key: 'F', style: 'march',
     notes: N('3:.5 3:.5 1:.25 1:.25 1:.5 | 2:.5 1:.5 6,:.5 5,:.5 | 1:.5 2:.5 3:.5 5:.5 | 3:.25 3:.25 2:.25 2:.25 1',
     '3:.5 3:.5 1:.25 1:.25 1:.5 | 2:.5 1:.5 6,:.5 5,:.5 | 1:.5 2:.5 3:.5 5:.5 | 3:.25 3:.25 2:.25 2:.25 1',
     // repeat
     '3:.5 3:.5 1:.25 1:.25 1:.5 | 2:.5 1:.5 6,:.5 5,:.5 | 1:.5 2:.5 3:.5 5:.5 | 3:.25 3:.25 2:.25 2:.25 1',
     '3:.5 3:.5 1:.25 1:.25 1:.5 | 2:.5 1:.5 6,:.5 5,:.5 | 1:.5 2:.5 3:.5 5:.5 | 3:.25 3:.25 2:.25 2:.25 1')},
    {id: 'o-tannenbaum', title: 'O Tannenbaum', source: 'Traditional (German folk song)', tier: 2, tempo: 76, timeSig: [3, 4], key: 'Ab', style: 'waltz',
     notes: N('r:2 5 | 1:.75 1:.25 1 2 | 3:.75 3:.25 3:1.5 3:.5 | 2:.5 3:.5 4 7, | (2 1) 5',
     '1:.75 1:.25 1 2 | 3:.75 3:.25 3:1.5 3:.5 | 2:.5 3:.5 4 7, | (2 1) r')},
    {id: 'procession-of-the-nobles', title: 'Procession of the Nobles', source: 'Nicolai Rimsky-Korsakov', tier: 3, tempo: 84, timeSig: [3, 4], key: 'Eb', style: 'waltz',
     notes: N('1:.5 1:.25 7,:.25 1:.5 2:.5 3:.5 5:.5 | (2:.75 3:.25) 1:.5 2:.5 2 | 2:.75 1:.25 2:.25 3:.25 4:.25 3:.25 2:.5 1:.5 | 7,:.5 1:.25 6,:.25 5,:.5 2:.5 7, | 2:.25 3:.25 4:.25 3:.25 2:.5 1:.5 7,:.5 1:.25 6,:.25',
     '5,:.5 2:.25 1:.25 2:.5 3:.5 1:.5 3:.5 | 2:.25 3:.25 4:.25 3:.25 2:.5 1:.5 7,:.5 1:.25 6,:.25 | 5,:.5 2:.25 1:.25 2 3 | 1:3~ | 1:.5 r:.5 1:.5 r:.5 r')},
    {id: 'yankee-doodle-march', title: 'Yankee Doodle (March)', source: 'Traditional (American folk song)', tier: 2, tempo: 96, timeSig: [2, 4], key: 'F', style: 'march',
     notes: N('1:.5 1:.5 2:.5 3:.5 | 1:.5 3:.5 2:.5 5,:.5 | 1:.5 1:.5 2:.5 3:.5 | 1 7,',
     '1:.5 1:.5 2:.5 3:.5 | 4:.5 3:.5 2:.5 1:.5 | 7,:.5 5,:.5 6,:.5 7,:.5 | 1 1')},
    {id: 'cindy', title: 'Cindy', source: 'Traditional (American folk song)', tier: 3, tempo: 108, timeSig: [2, 4], key: 'Eb', style: 'march',
     notes: N('r 5 | 6:.5 5:.5 3:.75 3:.25 | 2:.5 1 5:.5 | 6:.5 5:.5 3:.5 5:.5 | 5 r:.5 5:.5',
     '6:.5 5:.5 3:.75 3:.25 | 2:.5 1:.5 1:.75 2:.25 | 3:.5 2:.5 1:.5 6,:.5 | 1 1:.25 1:.25 1:.5',
     '6, 6,:.75 5,:.25 | 6,:.5 1:.5 1:.25 1:.25 1:.5 | 5 5:.75 5:.25 | 3:.5 5:.5 1:.25 1:.25 1:.5',
     '6, 6,:.75 5,:.25 | 6,:.5 1 2:.5 | 3:.5 3:.5 2:.5 2:.5 | 1 r')},
    {id: 'anvil-chorus', title: 'Anvil Chorus from "Il Trovatore"', source: 'Giuseppe Verdi (from "Il Trovatore")', tier: 3, tempo: 84, timeSig: [4, 4], key: 'F', style: 'march',
     notes: N('3 3 3:.75 2:.25 1:.75 6,:.25 | 5,:.75 7,:.25 2:.75 4:.25 3 1',
     '3 3 3:.75 2:.25 1:.75 6,:.25 | 5,:.75 7,:.25 2:.75 4:.25 3:.5 1:.5 r')},
    {id: 'march-of-the-toreadors', title: 'March of the Toreadors', source: 'Georges Bizet (from "Carmen")',
     tier: 3, tempo: 108, timeSig: [4, 4], key: 'Eb', style: 'march',
     notes: N('5 6:.75 5:.25 3 3 | 3:.75 2:.25 3:.75 4:.25 3:2 | 4 2:.75 5:.25 3:2 | 1 6,:.75 2:.25 5,:2',
     '2 2~ 2:.5 6:.5 5:.5 4:.5 | 3:.5 2:.5 3:.5 4:.5 3:2',
     '(7, 3) 3 #2:.75 #4:.25 | 7:4',
     'r:.5 (6:.5 #5:.5) 6:.5 2:.5 3:.5 4 | r:.5 (3:.5 1:.5) 6:.5 5:2 | r:.5 1:.5 5,:.5 4:.5 3 2 | 1:3 r')},
    // cut time, half-note pickup padded with a half rest; m11-12 print stacked octave Fs (F4 + F5): the LOWER (F4) is used
    {id: 'the-stars-and-stripes-forever', title: 'The Stars and Stripes Forever', source: 'John Philip Sousa',
     tier: 3, tempo: 120, timeSig: [2, 2], key: 'Eb', style: 'march',
     notes: N('r:2 5:2 | 5:2 (4 3) | 3:2 (#2 3) | 3:4~ | 3:2 (#2 3) | 3:2 (#2 3) | 5:2 3:1.5 5:.5 | (4:4 | 2:2) r 1',
     '1:2 (7, 1) | b3:2 (2 1) | 1:4~ | 1 (1 2 3) | 5 (1 2 3) | 5 (5, 6, 3) | (2:4 | 1) r 1 r')},
    // a ROUND: the printed repeat sign is for going around again; here it is played through ONE time only
    {id: 'the-merry-minstrels', title: 'The Merry Minstrels (Round)', source: 'Henry Purcell',
     tier: 3, tempo: 99, timeSig: [3, 8], key: 'Bb', style: 'waltz',
     notes: N("1':.5 1':.5 1':.5 | 7:.5 7:.5 7:.5 | 6:.5 6:.5 6:.5 | 5 5:.5 | 4:.5 4:.5 4:.5 | 3:.5 3:.5 3:.5 | 2:.5 2:.5 2:.5 | 1 r:.5",
     "3':.5 3':.5 3':.5 | 2':.5 2':.5 2':.5 | 1':.5 1':.5 1':.5 | 7 7:.5 | 6:.5 6:.5 6:.5 | 5:.5 5:.5 5:.5 | 4:.5 4:.5 4:.5 | 3 r:.5",
     "1:.5 1:.5 3:.5 | 5:.5 5:.5 5:.5 | 6:.5 6:.5 6:.5 | 3 3:.5 | 4:.5 4:.5 6:.5 | 1':.5 1:.5 1:.5 | 4:.5 2:.5 7,:.5 | 1 r:.5")},
    // Written C with B-flats (C mixolydian flavour) -> key Bb, B-flat = b7. Eighth pickup padded.
    // Repeat with 1st/2nd endings written out: m1-3 + 1st ending, m1-3 + 2nd ending, then m5-12.
    {id: 'lisbon-bay', title: 'Lisbon Bay', source: 'Traditional (English folk song)', tier: 3, tempo: 90, timeSig: [6, 8], key: 'Bb', style: 'march',
     notes: N('r:2.5 4:.5 | 5 6:.5 5 2:.5 | 1:1.5 1 2:.5 | 3 1:.5 4 3:.5 | 1:1.5~ 1 4:.5',
     '5 6:.5 5 2:.5 | 1:1.5 1 2:.5 | 3 1:.5 4 3:.5 | 1:1.5~ 1 2:.5',
     '3 4:.5 5 1\':.5 | 1\' b7:.5 5 6:.5 | b7 1\':.5 b7 5:.5 | 4:1.5~ 4 4:.5 | 5 6:.5 5 2:.5 | 1:1.5 1 2:.5 | 3 1:.5 4 3:.5 | 1:1.5~ 1:.5 r:.5 r:.5')},
    {id: 'habanera', title: 'Habanera from "Carmen"', source: 'Georges Bizet (from "Carmen")', tier: 3, tempo: 96, timeSig: [2, 4], key: 'Eb', mode: 'minor', style: 'rock',
     notes: N('1\' #7 | 7:.5 7 7:.5 | #6 6 | 5:1.5 5:.5 | #4 4 | (3:.5 4:.25 3:.25) 2:.5 3:.5 | 4 3 | 2:1.5 r:.5',
     '1\' #7 | 7:.5 7 7:.5 | #6 6 | 5:1.5 5:.5 | 4 3 | (2:.5 3:.25 2:.25) 1:.5 2:.5 | 3 2 | 1:2')},
    // written D minor; the printed repeat (back to the start) is written out: measures 1-8 played twice
    {id: 'la-cumparsita', title: 'La Cumparsita', source: 'Gerardo H. Matos Rodríguez',
     tier: 3, tempo: 96, timeSig: [4, 4], key: 'Eb', mode: 'minor', style: 'rock',
     notes: N('5 4 2 #7, | r:.5 (5:.5 6:.5 5:.5) #4 5 | 5 5 3 1 | r:.5 (5:.5 6:.5 5:.5) #4 5',
     '5 4 2 #7, | r:.5 (5:.5 6:.5 5:.5) #4 5 | 1 r:.5 (6:.5 5:.5) 4:.5 3:.5 2:.5 | 1 r:.5 5:.5 1\' r',
     // repeat
     '5 4 2 #7, | r:.5 (5:.5 6:.5 5:.5) #4 5 | 5 5 3 1 | r:.5 (5:.5 6:.5 5:.5) #4 5',
     '5 4 2 #7, | r:.5 (5:.5 6:.5 5:.5) #4 5 | 1 r:.5 (6:.5 5:.5) 4:.5 3:.5 2:.5 | 1 r:.5 5:.5 1\' r')},
  ];
})();
