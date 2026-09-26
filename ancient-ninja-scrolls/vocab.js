/* ANCIENT NINJA SCROLLS: the source for the Band Ninja vocabulary tests (Ranks 3–10, Orange through Diamond).
   This is the one place the tests live. The game (Train, Spar, Belt Exam, Scroll Review) reads everything here.

   MAT: edit freely.
   - VOCAB_BANKS: the word bank printed at the top of each rank's test, in the order on the paper.
     Every 'word' answer must be spelled exactly like its bank word (capitals and accents too: Più, L'istesso).
   - VOCAB_PASS: how many items a student may miss and still pass that rank's exam (Orange 0 = 100%).
   - VOCAB: one line per test item.
       id      a short name that never changes (saved progress uses it; don't rename an id once students have played)
       rank    3 = Orange … 10 = Diamond (belt names and colors come from shared/belts.js)
       prompt  exactly as on the test, with ___ where the blank goes. No ___ means the blank goes
               after a question ("What word means …?") or before a definition ("Lightly").
       answer  the bank word, or for a 'symbol' item the symbol id (below)
       type    'word' (fill in from the bank) or 'symbol' (tap the correct symbol; drawn in shared/ui.js)
       show    optional: a symbol drawn with the prompt ("What is this symbol called?")
       tip     optional: the one-line reminder shown after a wrong answer (default: the sentence filled in)
   Symbol ids: 'treble-clef', 'bass-clef', 'fermata', 'repeat', 'measure-repeat', 'accent'.
   Each rank has 15 items. */
window.VOCAB_BANKS = {
  3:  ['Key Signature', 'Tempo', 'Time Signature', 'Beat', 'Bass Clef', 'Loud', 'Treble Clef', 'Soft', 'Bar Line', 'Measure', 'Sharp', 'Natural', 'Flat', 'Rest', 'The beginning'],
  4:  ['Beginning', 'Cut Time', 'Major Scale', 'Countermelody', 'Chromatic Scale', 'Melody', 'Slur', 'The end of a song or section', 'Tie', 'Dynamics', 'Lips', 'Ledger Lines'],
  5:  ['Crescendo', 'Slower', 'Decrescendo', 'Sign', 'Medium soft', 'Medium loud', 'Pick-up note', 'Very loud', 'Intonation', 'Very soft', 'Pitch', 'Interval', 'Unison', 'Octave'],
  6:  ['Grand pause', 'Fast', 'Simile', 'Light and lively', 'Syncopation', 'Walking tempo', 'Chord', 'Moderate tempo', 'Marcato', 'Articulation', 'Legato', 'Slower', 'Light and detached', 'Faster', 'A tempo'],
  7:  ['Very slow', 'Always', 'Andantino', 'More', 'Coda', 'Much', 'Majestically', 'Less', 'Solo', 'Little', 'Soli', 'With', 'Tacet', 'Motion', 'Very'],
  8:  ['Scherzo', 'Adagietto', 'Agitato', 'Rubato', 'Al Fine', 'Tenuto', 'Con Amore', 'Leggiero', "L'istesso", 'Presto', 'Cantabile', 'Pesante', 'Non troppo', 'Grazioso', 'Smorzando'],
  9:  ['Octave', 'Vivo', 'In the style of', 'Faster', 'Little, gradually', 'Mute', 'Vocal', 'Without', 'Half step', 'First', 'Calando', 'Moto', 'Etude', 'Marcia', 'Joyfully'],
  10: ['Appassionato', 'Larghetto', 'Brillante', 'Marziale', 'Veloce', 'Con Grazia', 'Grave', 'Energico', 'Subito', 'Larghissimo', 'Con Spirito', 'Opus', 'Ritenuto', 'Prestissimo', 'Religioso'],
};

/* most items a student can miss and still pass (Orange: 100%; Green: miss 2 or fewer; Blue–Diamond: miss 3 or fewer) */
window.VOCAB_PASS = {3: 0, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3};

window.VOCAB = [
  /* ---------- RANK 3: ORANGE ---------- */
  {id: 'tempo',          rank: 3, type: 'word', prompt: 'The speed of the beat is the ___.', answer: 'Tempo'},
  {id: 'beat',           rank: 3, type: 'word', prompt: 'The underlying pulse of the music is the ___.', answer: 'Beat'},
  {id: 'forte',          rank: 3, type: 'word', prompt: 'Forte (f) = ___', answer: 'Loud'},
  {id: 'piano',          rank: 3, type: 'word', prompt: 'Piano (p) = ___', answer: 'Soft'},
  {id: 'rest',           rank: 3, type: 'word', prompt: '___ is silence in music.', answer: 'Rest'},
  {id: 'sharp',          rank: 3, type: 'word', prompt: 'A ___ raises a tone a half step.', answer: 'Sharp'},
  {id: 'flat',           rank: 3, type: 'word', prompt: 'A ___ lowers a tone a half step.', answer: 'Flat'},
  {id: 'natural',        rank: 3, type: 'word', prompt: 'A ___ cancels a sharp or a flat.', answer: 'Natural'},
  {id: 'measure',        rank: 3, type: 'word', prompt: 'The space between two bar lines is a ___.', answer: 'Measure'},
  {id: 'bar-line',       rank: 3, type: 'word', prompt: 'A ___ divides music into measures.', answer: 'Bar Line'},
  {id: 'da-capo-3',      rank: 3, type: 'word', prompt: '"Da Capo (D.C.)" means to go back to ___.', answer: 'The beginning'},
  {id: 'treble-clef',    rank: 3, type: 'word', prompt: 'What is this symbol called?', show: 'treble-clef', answer: 'Treble Clef'},
  {id: 'bass-clef',      rank: 3, type: 'word', prompt: 'What is this symbol called?', show: 'bass-clef', answer: 'Bass Clef'},
  {id: 'time-signature', rank: 3, type: 'word', prompt: 'The ___ tells how many counts are in each measure and what kind of note receives one count.', answer: 'Time Signature'},
  {id: 'key-signature',  rank: 3, type: 'word', prompt: 'The ___ is the flat and sharp signs at the beginning of a piece of music.', answer: 'Key Signature'},

  /* ---------- RANK 4: GREEN (on paper the three symbols are drawn; here the student taps the correct one) ---------- */
  {id: 'fermata',        rank: 4, type: 'symbol', prompt: 'Which symbol is a fermata?', answer: 'fermata'},
  {id: 'repeat-sign',    rank: 4, type: 'symbol', prompt: 'Which symbol is a repeat sign?', answer: 'repeat'},
  {id: 'measure-repeat', rank: 4, type: 'symbol', prompt: 'Which symbol is a measure repeat sign?', answer: 'measure-repeat'},
  {id: 'cut-time',       rank: 4, type: 'word', prompt: 'What time signature means "1/2 the value of 4/4 (2/2)"?', answer: 'Cut Time'},
  {id: 'major-scale',    rank: 4, type: 'word', prompt: 'A ___ is a series of eight tones in a specific order.', answer: 'Major Scale'},
  {id: 'chromatic-scale', rank: 4, type: 'word', prompt: 'A ___ is a series of tones using all half steps.', answer: 'Chromatic Scale'},
  {id: 'slur',           rank: 4, type: 'word', prompt: 'Moving from one note to another without tonguing: ___', answer: 'Slur'},
  {id: 'tie',            rank: 4, type: 'word', prompt: 'A curved line between two notes of the same pitch: ___', answer: 'Tie'},
  {id: 'dynamics',       rank: 4, type: 'word', prompt: 'The loudness and softness in music: ___', answer: 'Dynamics'},
  {id: 'embouchure',     rank: 4, type: 'word', prompt: '"Embouchure" means the formation of the ___ for proper tonal production.', answer: 'Lips'},
  {id: 'da-capo-4',      rank: 4, type: 'word', prompt: '"Da Capo (D.C.)" means to go back to the ___.', answer: 'Beginning'},
  {id: 'ledger-lines',   rank: 4, type: 'word', prompt: 'Added lines for making the staff bigger are called ___.', answer: 'Ledger Lines'},
  {id: 'double-bar',     rank: 4, type: 'word', prompt: 'A "Double Bar" indicates ___.', answer: 'The end of a song or section'},
  {id: 'melody',         rank: 4, type: 'word', prompt: 'The main tune of a piece of music is the ___.', answer: 'Melody'},
  {id: 'countermelody',  rank: 4, type: 'word', prompt: 'The secondary tune of a piece of music is the ___.', answer: 'Countermelody'},

  /* ---------- RANK 5: BLUE ---------- */
  {id: 'ritardando',     rank: 5, type: 'word', prompt: 'Ritardando means to gradually get ___.', answer: 'Slower'},
  {id: 'crescendo',      rank: 5, type: 'word', prompt: '___ means to gradually get louder.', answer: 'Crescendo'},
  {id: 'decrescendo',    rank: 5, type: 'word', prompt: '___ means to gradually get softer.', answer: 'Decrescendo'},
  {id: 'mezzo-piano',    rank: 5, type: 'word', prompt: 'Mezzo Piano (mp) = ___', answer: 'Medium soft'},
  {id: 'mezzo-forte',    rank: 5, type: 'word', prompt: 'Mezzo Forte (mf) = ___', answer: 'Medium loud'},
  {id: 'fortissimo',     rank: 5, type: 'word', prompt: 'Fortissimo (ff) = ___', answer: 'Very loud'},
  {id: 'pianissimo',     rank: 5, type: 'word', prompt: 'Pianissimo (pp) = ___', answer: 'Very soft'},
  {id: 'dal-segno',      rank: 5, type: 'word', prompt: '"Dal Segno" (D.S.) means to go back to the ___.', answer: 'Sign'},
  {id: 'accent',         rank: 5, type: 'symbol', prompt: 'Which symbol is an accent?', answer: 'accent'},
  {id: 'pick-up',        rank: 5, type: 'word', prompt: 'A note or notes coming before the first full measure is a ___.', answer: 'Pick-up note'},
  {id: 'interval',       rank: 5, type: 'word', prompt: 'The distance between any two notes is an ___.', answer: 'Interval'},
  {id: 'octave-5',       rank: 5, type: 'word', prompt: 'The distance between one note and the next note of the same name is an ___.', answer: 'Octave'},
  {id: 'unison',         rank: 5, type: 'word', prompt: '___ means playing the same notes.', answer: 'Unison'},
  {id: 'pitch',          rank: 5, type: 'word', prompt: 'The highness and lowness in music is the ___.', answer: 'Pitch'},
  {id: 'intonation',     rank: 5, type: 'word', prompt: 'Matching pitches exactly is ___.', answer: 'Intonation'},

  /* ---------- RANK 6: PURPLE ---------- */
  {id: 'allegro',        rank: 6, type: 'word', prompt: 'Allegro = ___', answer: 'Fast'},
  {id: 'allegretto',     rank: 6, type: 'word', prompt: 'Allegretto = ___', answer: 'Light and lively'},
  {id: 'grand-pause',    rank: 6, type: 'word', prompt: 'A break in the music is also called a ___.', answer: 'Grand pause'},
  {id: 'simile',         rank: 6, type: 'word', prompt: '___ means to continue in the same style.', answer: 'Simile'},
  {id: 'andante',        rank: 6, type: 'word', prompt: 'Andante = ___', answer: 'Walking tempo'},
  {id: 'moderato',       rank: 6, type: 'word', prompt: 'Moderato = ___', answer: 'Moderate tempo'},
  {id: 'syncopation',    rank: 6, type: 'word', prompt: 'Emphasis on the weak beat is called ___.', answer: 'Syncopation'},
  {id: 'chord',          rank: 6, type: 'word', prompt: 'Three or more notes played together is called a ___.', answer: 'Chord'},
  {id: 'articulation',   rank: 6, type: 'word', prompt: 'Proper tonguing and slurring is ___.', answer: 'Articulation'},
  {id: 'rallentando',    rank: 6, type: 'word', prompt: 'Rallentando (rall.) means to play gradually ___.', answer: 'Slower'},
  {id: 'accelerando',    rank: 6, type: 'word', prompt: 'Accelerando (accel.) means to play gradually ___.', answer: 'Faster'},
  {id: 'marcato',        rank: 6, type: 'word', prompt: '___ is a "marked style of articulation with emphasis."', answer: 'Marcato'},
  {id: 'legato',         rank: 6, type: 'word', prompt: 'The "smooth, connected style of articulation" is called ___.', answer: 'Legato'},
  {id: 'staccato',       rank: 6, type: 'word', prompt: 'Staccato means to play how? ___', answer: 'Light and detached'},
  {id: 'a-tempo',        rank: 6, type: 'word', prompt: '___ means to go back to the original tempo.', answer: 'A tempo'},

  /* ---------- RANK 7: RED ---------- */
  {id: 'solo',           rank: 7, type: 'word', prompt: 'What word means "one player"?', answer: 'Solo'},
  {id: 'soli',           rank: 7, type: 'word', prompt: 'What word means "more than one player, but not full band"?', answer: 'Soli'},
  {id: 'adagio',         rank: 7, type: 'word', prompt: 'Adagio = ___', answer: 'Very slow'},
  {id: 'sempre',         rank: 7, type: 'word', prompt: 'Sempre = ___', answer: 'Always'},
  {id: 'piu',            rank: 7, type: 'word', prompt: 'Più = ___', answer: 'More'},
  {id: 'mosso',          rank: 7, type: 'word', prompt: 'Mosso = ___', answer: 'Motion'},
  {id: 'andantino',      rank: 7, type: 'word', prompt: '___ is a little quicker than andante.', answer: 'Andantino'},
  {id: 'coda',           rank: 7, type: 'word', prompt: 'The final added measures of a piece of music is the ___.', answer: 'Coda'},
  {id: 'maestoso',       rank: 7, type: 'word', prompt: 'Maestoso = ___', answer: 'Majestically'},
  {id: 'molto',          rank: 7, type: 'word', prompt: 'Molto = ___', answer: 'Much'},
  {id: 'meno',           rank: 7, type: 'word', prompt: 'Meno = ___', answer: 'Less'},
  {id: 'poco-a-poco',    rank: 7, type: 'word', prompt: 'Poco a poco means ___ (by little).', answer: 'Little'},
  {id: 'con',            rank: 7, type: 'word', prompt: 'Con = ___', answer: 'With'},
  {id: 'assai',          rank: 7, type: 'word', prompt: 'Assai = ___', answer: 'Very'},
  {id: 'tacet',          rank: 7, type: 'word', prompt: 'What word means "do not play"?', answer: 'Tacet'},

  /* ---------- RANK 8: BROWN ---------- */
  {id: 'adagietto',      rank: 8, type: 'word', prompt: 'Slow, but not as slow as Adagio', answer: 'Adagietto'},
  {id: 'agitato',        rank: 8, type: 'word', prompt: 'Agitated, rapid', answer: 'Agitato'},
  {id: 'al-fine',        rank: 8, type: 'word', prompt: 'To the finish (end)', answer: 'Al Fine'},
  {id: 'con-amore',      rank: 8, type: 'word', prompt: 'With tenderness', answer: 'Con Amore'},
  {id: 'listesso',       rank: 8, type: 'word', prompt: 'The same', answer: "L'istesso"},
  {id: 'leggiero',       rank: 8, type: 'word', prompt: 'Lightly', answer: 'Leggiero'},
  {id: 'grazioso',       rank: 8, type: 'word', prompt: 'Gracefully', answer: 'Grazioso'},
  {id: 'non-troppo',     rank: 8, type: 'word', prompt: 'Not too much', answer: 'Non troppo'},
  {id: 'pesante',        rank: 8, type: 'word', prompt: 'Heavily; with emphasis', answer: 'Pesante'},
  {id: 'cantabile',      rank: 8, type: 'word', prompt: 'In a singing style', answer: 'Cantabile'},
  {id: 'presto',         rank: 8, type: 'word', prompt: 'Very fast', answer: 'Presto'},
  {id: 'rubato',         rank: 8, type: 'word', prompt: 'Temporary irregularity of time', answer: 'Rubato'},
  {id: 'tenuto',         rank: 8, type: 'word', prompt: 'Sustain full value', answer: 'Tenuto'},
  {id: 'smorzando',      rank: 8, type: 'word', prompt: 'Dying away', answer: 'Smorzando'},
  {id: 'scherzo',        rank: 8, type: 'word', prompt: 'Playfully; usually in a rapid tempo', answer: 'Scherzo'},

  /* ---------- RANK 9: BLACK ---------- */
  {id: 'vivo',           rank: 9, type: 'word', prompt: 'Lively, brisk', answer: 'Vivo'},
  {id: 'stringendo',     rank: 9, type: 'word', prompt: 'Stringendo means gradually ___.', answer: 'Faster'},
  {id: 'sordino',        rank: 9, type: 'word', prompt: 'Sordino = ___', answer: 'Mute'},
  {id: 'senza',          rank: 9, type: 'word', prompt: 'Senza = ___', answer: 'Without'},
  {id: 'primo',          rank: 9, type: 'word', prompt: 'Primo = ___', answer: 'First'},
  {id: 'moto',           rank: 9, type: 'word', prompt: 'Motion, movement', answer: 'Moto'},
  {id: 'marcia',         rank: 9, type: 'word', prompt: 'March style', answer: 'Marcia'},
  {id: 'giocoso',        rank: 9, type: 'word', prompt: 'Giocoso = ___', answer: 'Joyfully'},
  {id: 'etude',          rank: 9, type: 'word', prompt: 'A musical study', answer: 'Etude'},
  {id: 'calando',        rank: 9, type: 'word', prompt: 'Gradually slower and softer', answer: 'Calando'},
  {id: 'half-step',      rank: 9, type: 'word', prompt: 'The smallest interval used in music is a ___.', answer: 'Half step'},
  {id: 'arioso',         rank: 9, type: 'word', prompt: 'Arioso = in a ___ style', answer: 'Vocal'},
  {id: 'a-poco',         rank: 9, type: 'word', prompt: 'A poco = ___', answer: 'Little, gradually'},
  {id: 'alla',           rank: 9, type: 'word', prompt: 'Alla = ___', answer: 'In the style of'},
  {id: 'ottava',         rank: 9, type: 'word', prompt: 'Ottava = ___', answer: 'Octave'},

  /* ---------- RANK 10: DIAMOND ---------- */
  {id: 'marziale',       rank: 10, type: 'word', prompt: 'Martial, in a march style', answer: 'Marziale'},
  {id: 'con-grazia',     rank: 10, type: 'word', prompt: 'In a graceful style', answer: 'Con Grazia'},
  {id: 'larghetto',      rank: 10, type: 'word', prompt: 'Slow, but not as slow as largo', answer: 'Larghetto'},
  {id: 'energico',       rank: 10, type: 'word', prompt: 'Energetically', answer: 'Energico'},
  {id: 'opus',           rank: 10, type: 'word', prompt: 'A musical work or composition', answer: 'Opus'},
  {id: 'larghissimo',    rank: 10, type: 'word', prompt: 'Very slow, more so than largo', answer: 'Larghissimo'},
  {id: 'prestissimo',    rank: 10, type: 'word', prompt: 'Very fast, more so than presto', answer: 'Prestissimo'},
  {id: 'religioso',      rank: 10, type: 'word', prompt: 'In a solemn style', answer: 'Religioso'},
  {id: 'ritenuto',       rank: 10, type: 'word', prompt: 'A steady pace, but slower than the preceding tempo', answer: 'Ritenuto'},
  {id: 'con-spirito',    rank: 10, type: 'word', prompt: 'With spirit', answer: 'Con Spirito'},
  {id: 'grave',          rank: 10, type: 'word', prompt: 'Very slow', answer: 'Grave'},
  {id: 'subito',         rank: 10, type: 'word', prompt: 'Suddenly', answer: 'Subito'},
  {id: 'veloce',         rank: 10, type: 'word', prompt: 'Very fast', answer: 'Veloce'},
  {id: 'appassionato',   rank: 10, type: 'word', prompt: 'Intensely, passionately, with deep feeling', answer: 'Appassionato'},
  {id: 'brillante',      rank: 10, type: 'word', prompt: 'Brilliantly', answer: 'Brillante'},
];

/* how the game plays (not part of the tests) */
window.SCROLL_RULES = {
  masterAfter: 3,        // correct answers (across sessions) that master a term and unroll its scroll
  retryUntil: 2,         // Train: a missed item comes back until answered correctly this many times
  retryGap: 3,           // … about this many questions later
  twoStarRate: 0.9,      // Train stars: 1 = round complete, 2 = 90%+ right the first time, 3 = every scroll mastered
  sparSeconds: 60,       // Spar: length of a round
  sparBase: 100,         // Spar: points per right answer, plus up to sparSpeed for a quick one …
  sparSpeed: 50,
  comboStep: 5,          // … times the combo (×2 at 5 in a row, up to ×4)
  maxMultiplier: 4,
  reviewCount: 15,       // Scroll Review: questions in a round
};
