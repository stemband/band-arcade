/* Music Highway: THE SETTINGS (Mat edits these numbers). The songs are in songs.js.
   Timing is judged from the moment the student's note STARTS (its attack), after the latency correction measured by
   CALIBRATION, against the moment the note's card reaches the strike line (which is exactly when the drums are heard). */
window.MH_RULES = {
  /* JUDGING WINDOWS (ms, early or late) */
  perfectMs: 90,          // PERFECT
  goodMs: 170,            // GOOD
  okMs: 260,              // OK
  outerMs: 420,           // up to here = EARLY / LATE (the note counts, the combo resets); further away = not for this note
  pitchConfirmMs: 250,    // an attack's pitch must be confirmed (the right note heard) within this after the attack
  bleedMs: 60,            // SNARE: an attack this close to one of the backing's own drum hits may be the speakers …
  bleedK: 2.5,            // … and then counts only when this many times louder than the drums the microphone heard back
  softEntryMs: 150,       // a note that started without a clear attack (a very soft entry) still counts from its first
                          // steady reading, if no attack was heard within this before it
  /* SCORING. Accuracy = the average of each note's value; stars from the accuracy */
  points: {perfect: 300, good: 200, ok: 100, early: 50, late: 50, miss: 0},
  value:  {perfect: 1, good: .9, ok: .7, early: .4, late: .4, miss: 0},
  stars: [60, 80, 95],    // accuracy % for 1 ★, 2 ★, 3 ★ (NORMAL speed only)
  comboStep: 10,          // every 10 in a row = +1 multiplier (×1 … ×4)
  comboMax: 4,
  holdFrom: 2,            // a note of this many beats or more is a LONG NOTE (a glowing tail): hold it for bonus points
  holdPoints: 20,         // bonus points per beat held (a long note's tail meter); letting go early ends the bonus only
  holdGapMs: 160,         // a gap longer than this in the heard note = let go
  /* SPEED */
  slowRate: .75,          // SLOW mode: 75 % of the song's tempo (no stars)
  practiceRate: .6,       // PRACTICE THIS PART: the trouble spot looped at 60 %
  practiceMeasures: 2,
  practiceLoops: 12,      // it loops this many times (or until PAUSE)    // how many measures a trouble spot is
  /* THE HIGHWAY */
  lanes: 5,
  leadBeats: 4,           // a card appears this many beats before it reaches the strike line …
  leadMinS: 2.2,          // … but never less than this many seconds …
  leadPerShortest: 14,    // … and at least 14 × the song's shortest note (quick notes spread out) …
  leadMaxS: 3.6,          // … and never more than this
  /* CALIBRATION ("Play any note on each of the 8 clicks") */
  calClicks: 8,
  calLead: 4,             // clicks to listen to first ("ready… 3, 2, 1")
  calBpm: 80,
  calNeed: 5,             // at least this many clicks must be played for a good measurement
  defaultLagMs: 60,       // before calibrating: the usual delay of a microphone + the note detector
  maxLagMs: 450,          // a calibration outside ±this is refused ("Let's try that again")
  /* THE BACKING (generated drums; shared/sounds/mh-drums-<song id>.m4a replaces them) */
  lookaheadS: .6,         // the drums are put on the audio clock this far ahead (a stalled page never delays a hit)
  drumVol: .55,           // the whole kit (the student's EFFECTS slider and SOUND ON/OFF apply on top)
  clickVol: .6,           // count-in and calibration clicks
  /* HEADPHONES MODE: a quiet guide melody, bass and chords on top of the drums (pitched: only after the speaker check) */
  guideVol: .16, bassVol: .2, padVol: .07,
  checkVol: .35,          // the speaker check's test tones (louder than the guide, so a speaker is surely heard)
  checkFrames: 3,         // readings of a test tone's pitch that mean "your speakers are on"
};
