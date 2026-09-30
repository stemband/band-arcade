/* Sustain Speedway: THE TUNING TIPS shown under "Your tuning" on the results screen (game.js tipsFor). Mat edits this file.
   Words for the student: short, plain, kind (11–14 year olds). At most 2 tips show after a race.

   general   an OVERALL TENDENCY (every note together about +10 cents or more sharp, or flat): the instrument's tuning tip.
             Looked up by MEMBER id first (shared/instruments.js: 'trumpet', 'clarinet', 'altosax'…), then by FAMILY
             ('brass' | 'woodwind'). Each: {sharp: '…', flat: '…'}.
   notes     NOTE-SPECIFIC tips: {member (or [members]), notes: ['D4', 'C♯4'] (WRITTEN, octave included: sharps ♯ or #,
             flats ♭ or b), dir: 'sharp' | 'flat', text}. Used when that note was out of tune that way.
   air       the air / embouchure tip for a note when no specific tip matches: {sharp, flat}.
   dynamics  pitch in DYNAMICS ZONES (soft = p or the end of a decrescendo, loud = f or the top of a crescendo):
             {softFlat, softSharp, loudSharp, loudFlat} (by member / family like `general`, then `any`). */
// Mat: check these
window.SPEEDWAY_TIPS = {
  general: {
    trumpet:    {sharp: 'Pull your main tuning slide out a little.', flat: 'Push your main tuning slide in a little.'},
    baritonetc: {sharp: 'Pull your main tuning slide out a little.', flat: 'Push your main tuning slide in a little.'},
    euphbc:     {sharp: 'Pull your main tuning slide out a little.', flat: 'Push your main tuning slide in a little.'},
    tuba:       {sharp: 'Pull your main tuning slide out a little.', flat: 'Push your main tuning slide in a little.'},
    horn:       {sharp: 'Pull your main tuning slide out a little (and check your right hand is in the bell).', flat: 'Push your main tuning slide in a little.'},
    trombone:   {sharp: 'Pull your tuning slide (the one in the bell section) out a little.', flat: 'Push your tuning slide in a little.'},
    clarinet:   {sharp: 'Pull the barrel out a little.', flat: 'Push the barrel in a little.'},
    basscl:     {sharp: 'Pull the neck (or the mouthpiece) out a little.', flat: 'Push the neck (or the mouthpiece) in a little.'},
    flute:      {sharp: 'Pull the headjoint out a little.', flat: 'Push the headjoint in a little.'},
    altosax:    {sharp: 'Move the mouthpiece out on the neck a little.', flat: 'Push the mouthpiece farther onto the neck.'},
    tenorsax:   {sharp: 'Move the mouthpiece out on the neck a little.', flat: 'Push the mouthpiece farther onto the neck.'},
    barisax:    {sharp: 'Move the mouthpiece out on the neck a little.', flat: 'Push the mouthpiece farther onto the neck.'},
    oboe:       {sharp: 'Take a little less reed in your mouth and relax your lips around it.', flat: 'Firm your lip corners and use faster air. If it stays flat, your reed may need a check.'},
    bassoon:    {sharp: 'Take a little less reed and relax your jaw. You can also pull the bocal out a tiny bit.', flat: 'Use faster air and firm corners. A bocal pushed all the way in helps too.'},
    brass:      {sharp: 'Pull your main tuning slide out a little.', flat: 'Push your main tuning slide in a little.'},
    woodwind:   {sharp: 'Pull your instrument’s tuning joint out a little.', flat: 'Push your instrument’s tuning joint in a little.'},
  },
  notes: [
    {member: 'trumpet', notes: ['D4', 'C♯4', 'D♭4'], dir: 'sharp', text: 'Low D and C♯ are sharp on every trumpet: kick out your 3rd valve slide on them.'},
    {member: 'trumpet', notes: ['E4', 'A4'], dir: 'sharp', text: 'On E and A (1st + 2nd valves) push your 1st valve slide out a little.'},
    {member: 'baritonetc', notes: ['D4', 'C♯4', 'D♭4'], dir: 'sharp', text: 'Low D and C♯ tend to be sharp: use your 4th valve instead of 1–3 if you have one.'},
    {member: 'trombone', notes: ['D4', 'F4'], dir: 'sharp', text: 'High D and F in 1st position are often sharp: bring the slide out just a little from 1st.'},
    {member: ['altosax', 'tenorsax', 'barisax'], notes: ['C♯5', 'D♭5'], dir: 'sharp', text: 'Middle C♯ is often sharp on sax: relax your lips and let your jaw drop a little.'},
    {member: ['altosax', 'tenorsax', 'barisax'], notes: ['D5', 'E5'], dir: 'sharp', text: 'The notes with the octave key can go sharp: don’t bite, keep the air warm.'},
    {member: 'clarinet', notes: ['B4', 'C5'], dir: 'flat', text: 'Just over the break: keep your chin flat and your air fast so B and C stay up.'},
    {member: 'clarinet', notes: ['G4', 'A4', 'B♭4'], dir: 'sharp', text: 'The throat tones (G, A, B♭) like to be sharp: add a right-hand finger or two to bring them down.'},
    {member: 'flute', notes: ['C4', 'D4', 'E4'], dir: 'flat', text: 'Low notes go flat: aim the air a little higher and roll the flute out slightly.'},
    {member: 'flute', notes: ['E5', 'F5', 'G5'], dir: 'sharp', text: 'Upper notes can be sharp: aim the air a little lower and don’t overblow.'},
    {member: 'horn', notes: ['E4', 'A4'], dir: 'sharp', text: 'On E and A (1st + 2nd valves) use the B♭ side’s slides, or shade a little with your right hand.'},
  ],
  air: {
    sharp: 'Sharp: relax your lips and open the back of your throat (think "oh").',
    flat: 'Flat: faster air and firm corners.',
  },
  dynamics: {
    any: {
      softFlat: 'Soft notes went flat: when you play softly, keep the air FAST (just less of it) and firm your corners.',
      softSharp: 'Soft notes went sharp: don’t pinch when you play softly. Keep your lips relaxed.',
      loudSharp: 'Loud notes went sharp: open up and relax your lips; loud is more air, not more squeeze.',
      loudFlat: 'Loud notes went flat: keep your corners firm when you play loud, and keep the air focused.',
    },
    flute: {softFlat: 'Soft notes went flat: aim the air a little higher and keep it fast when you play softly.', loudSharp: 'Loud notes went sharp: aim the air a little lower when you play loud.'},
    brass: {loudSharp: 'Loud notes went sharp: open your throat and relax your lips; don’t press the mouthpiece harder.'},
  },
};
