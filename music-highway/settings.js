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
  roadDepth: 5,           // how far the road reaches: a card on the horizon is 1 ÷ (1 + this) of its size at the line (deeper = more cards fit)
  leadBeats: 4,           // a card appears this many beats before it reaches the strike line …
  leadMinS: 2.2,          // … but never less than this many seconds …
  leadMaxS: 3.6,          // … and never more than this (both only when the card spacing below allows it)
  /* CARD SPACING. Two cards in a row are always at least cardGap × a card's size apart (bottom of one to the top of
     the next), even for the song's shortest note, anywhere on the road; so a song with quick notes moves its cards
     faster. When that would leave a card on the road for less than readMinS, the cards get smaller for that song
     instead (never below cardMinScale); cards never overlap. */
  cardGap: .4,            // the smallest gap between two cards, as a share of a card's size
  wideMul: 1.5,           // NOTE SPACING: WIDE = this much more room from one card to the next (stars count in both)
  cardMaxPx: 190,         // a card at the strike line is never bigger than this (it is about one lane wide)
  cardMinScale: .6,       // … and never shrunk below this share of its normal size
  readMinS: 1.5,          // a card should be on the road at least this long (time to read it)
  /* THE STRIKE GLOW (a right note in time lights the target in the card's color). Never a strobe: it fades in 60 ms
     and out 200 ms (style.css), stays lit through a run of notes, and goes out at most 3 times a second. */
  glowLingerMs: 250,      // a short note's glow stays this long after the note's end (so a run stays lit)
  glowMinCycleMs: 340,    // the glow goes out at most once in this long (≤ 3 flashes a second)
  badMs: 450,             // a miss / wrong note: a dim red outline on that lane's pad for this long
  /* STAFF SPACING (the scrolling staff, the trouble spot and the Song Board; units: one staff space = 16) */
  staff: {
    barPadL: 26,          // room after every bar line before the first note (about a notehead and a half)
    barPadR: 20,          // room after the last note (and its dot) before the next bar line
    noteBase: 36,         // the space after the song's shortest note (head to head)
    noteGrow: .6,         // longer notes get more: base × (1 + noteGrow × log2(length ÷ shortest))
    noteMin: 34,          // never less than this (heads, stems, flags, beams and letter names never touch)
    accRoom: 22,          // extra room in front of a note with a ♯ / ♭ / ♮
    dotRoom: 10,          // extra room after a dotted note
  },
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
