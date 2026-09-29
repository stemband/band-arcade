/* Music Highway: THE SONG LIST (Mat edits this file). Songs are the game's levels, in this order.
   NEVER REORDER OR REMOVE SONGS: stars are saved by song NUMBER (1 = the first song below). Add new songs at the END.

   A SONG = {
     id        never change it (the backing-drums file is shared/sounds/mh-drums-<id>.m4a, and the Song Board links to it)
     title     as students see it
     source    composer or source ("Traditional (American folk song)", "Scott Joplin, 1902")
     tier      1 = only degrees 1–5 in the first-five octave · 2 = the whole scale · 3 = wider range, minor, accidentals, syncopation
     tempo     quarter notes per minute (Slow mode plays 75 % of it)
     timeSig   [beats per measure, 4]: [4, 4], [3, 4] or [2, 4]
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
   A future MIDI importer only needs to produce the `notes` objects (see music-highway/README.md). */
(function () {
  'use strict';
  /** one phrase of NOTE TEXT -> note objects (bar lines are kept as {bar: true} markers for the measure check) */
  function N(...lines) {
    const out = [];
    lines.join(' | ').split(/\s+/).filter(Boolean).forEach(tok => {
      if (tok === '|') { out.push({bar: true}); return; }
      const m = /^(r|([#b]?)([1-7])([',]*))(?::([\d.]+))?(~)?$/.exec(tok);
      if (!m) { console.warn('Music Highway songs.js: "' + tok + '" is not a note'); return; }
      const beats = m[5] ? parseFloat(m[5]) : 1;
      if (m[1] === 'r') { out.push({rest: beats}); return; }
      const o = {deg: +m[3], oct: (m[4].match(/'/g) || []).length - (m[4].match(/,/g) || []).length, beats};
      if (m[2]) o.acc = m[2] === '#' ? 1 : -1;
      if (m[6]) o.tie = true;                                  // tied into the next note (see NOTE TEXT)
      out.push(o);
    });
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
       (B♭) parts: written C major = concert 'Bb', written F major = concert 'Eb'. ---------- */
    {id: 'good-king-wenceslas', title: 'Good King Wenceslas', source: 'Traditional (English carol)', tier: 1, tempo: 100, timeSig: [4, 4], key: 'Bb', style: 'march',
     notes: N('4 4 4 5 | 4 4 1:2 | 2 1 2 3 | 4 r 4 r', '4 4 4 5 | 4 4 1:2 | 2 1 2 3 | 4 r 4 r')},
    // the book's repeat with 1st/2nd endings, written out
    {id: 'orpheus-can-can', title: 'Can-Can (Orpheus in the Underworld)', source: 'Jacques Offenbach, 1858', tier: 2, tempo: 112, timeSig: [2, 4], key: 'Bb', style: 'rock',
     notes: N("1:2 | 2:.5 4:.5 3:.5 2:.5 | 5 5 | 5:.5 6:.5 3:.5 4:.5 | 2 2 | 2:.5 4:.5 3:.5 2:.5 | 1:.5 1':.5 7:.5 6:.5 | 5:.5 4:.5 3:.5 2:.5",
              "1:2 | 2:.5 4:.5 3:.5 2:.5 | 5 5 | 5:.5 6:.5 3:.5 4:.5 | 2 2 | 2:.5 4:.5 3:.5 2:.5 | 1:.5 5:.5 2:.5 3:.5 | 1 1")},
    // the book's 1-beat pickup: the first measure starts with 2 beats of rest
    {id: 'come-from-sydney', title: "I've Just Come From Sydney", source: 'Traditional (Australian folk song)', tier: 1, tempo: 108, timeSig: [3, 4], key: 'Bb', style: 'waltz',
     notes: N('r:2 5:.5 5:.5 | 3 3 5 | 2 2 5 | 5:.5 5:.5 4 2 | 3:2 5:.5 5:.5', '3:.5 3:.5 3 5:.5 5:.5 | 2:.5 2:.5 2 5:.5 5:.5 | 5 4 2 | 1:3')},
    {id: 'donkey-riding', title: 'Donkey Riding', source: 'Traditional (Canadian folk song)', tier: 2, tempo: 96, timeSig: [2, 4], key: 'Eb', style: 'march',
     notes: N('1:.5 2:.5 3:.5 3:.5 | 4:.5 2:.5 3 | 3:.5 2:.5 2:.5 1:.5 | 3:.5 2:.5 2', '1:.5 2:.5 3:.5 3:.5 | 4:.5 2:.5 3 | 3:.5 2:.5 2:.5 3:.5 | 1 1')},
    {id: 'frogs-song', title: "The Frog's Song", source: 'Traditional (Japanese folk song)', tier: 2, tempo: 104, timeSig: [4, 4], key: 'Bb', style: 'rock',
     notes: N('1 2 3 4 | 3 2 1:2 | 3 4 5 6 | 5 4 3:2', '1 r 1 r | 1 r 1 r | 1 2 3 6 | 3 2 1:2')},
    {id: 'san-sereni', title: 'San Serení', source: 'Traditional (Puerto Rican folk song)', tier: 2, tempo: 104, timeSig: [2, 4], key: 'Bb', style: 'rock',
     notes: N('5:2 | 3 4 | 5:2~ | 5 5 | 6 5 | 4 3 | 5:2 | 4:2', '4:2 | 2 3 | 4:2~ | 4 4 | 5 4 | 2 7, | 1:2~ | 1 r')},
    {id: 'nutcracker-theme', title: 'Theme from The Nutcracker', source: 'Pyotr Ilyich Tchaikovsky, 1892', tier: 2, tempo: 84, timeSig: [4, 4], key: 'Eb', style: 'march',
     notes: N('1:.5 7,:.5 1:.5 7,:.5 1 7, | 2 1 3:2 | 4:.5 3:.5 4:.5 3:.5 2 1 | 1:2 7,:2',
              '6,:.5 6,:.5 6,:.5 6,:.5 6, 5, | 6,:.5 6,:.5 6,:.5 6,:.5 6, 5, | 6,:.5 6,:.5 6,:.5 6,:.5 6, 5, | 1:3 r:1')},
  ];
})();
