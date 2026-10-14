/* ARCADE QUEST, EPISODE 2: THE RHYTHM PATTERNS for the RHYTHM FAMILY's battles (battle/challenges.js: RHYTHM reads
   one, ECHO plays one for you to copy). MAT: edit freely.
   Each pattern is ONE MEASURE of 4/4 in Mr. Graham's counting text (shared/counting.js: q quarter · h half · e eighth
   · q. dotted quarter · qr / er rests). A machine's `tier` picks the pool; a test checks every pattern parses, has at
   least 3 notes and keeps to its tier's rules:
     tier 1  quarter notes, half notes, quarter rests                       (the Orchestra Pit, Sal's first lesson)
     tier 2  + eighth notes in pairs on the beat (1 &)
     tier 3  + the dotted quarter + eighth (1 (& 2) &) and single eighths with eighth rests
     echo2   SERENADE against a Mic-let: two beats of 2/4, by ear (at least 2 notes)
   Add patterns freely; never put a harder value in an easier tier. */
window.QUEST_RHYTHMS = {
  1: ['q q h', 'q qr q q', 'h q q', 'q q q q', 'q q qr q', 'qr q q q', 'q h q', 'q q q qr'],
  2: ['e e q e e q', 'q e e qr q', 'e e q q q', 'q e e q q', 'q q e e q', 'e e e e q q', 'q q e e e e', 'e e h q', 'q e e h', 'e e qr e e q'],
  3: ['q. e q q', 'e er e e q q', 'q. e h', 'q q. e q', 'er e q q q', 'q er e q q', 'q. e e e q', 'e er q q. e', 'q. e q. e', 'h q. e'],
  echo2: ['q q', 'e e q', 'q e e', 'e e e e'],
};
