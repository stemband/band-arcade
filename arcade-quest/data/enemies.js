/* ARCADE QUEST: THE ENEMIES. Grumpy creatures of the arcade. Nobody gets hurt: at 0 HP an enemy "fades away
   grumbling"; with a full CALM meter you can HARMONIZE and it joins your band. MAT: edit freely.

   id          never change it once students have played (their band roster saves it)
   name        what students see                 sprite   a sprite id in sprites.js (32 × 32: idle, idle, happy)
   hp          how much "grumpy" it has           atk      damage per sour note that hits you while dodging
   challenge   what PLAY does against it:
                 'play'       1–4 notes on the staff (count, notes, time)
                 'longtone'   hold one note steady and in tune for `hold` seconds
                 'articulate' one note × `taps` separate times (tongued or struck)
                 'vocab'      a Band Ninja vocabulary question (Orange belt, rank `rank`)
                 'fingering'  build the note's fingering on the Button Masher diagram
               A challenge the instrument can't do falls back (snare: articulate or vocab; bells: no long tones;
               no fingering chart: play).
   notes       the note pool: 'first5' | 'Bb' | 'Eb' | 'F' | 'Ab' | 'chrom' (shared/sequences.js)
   count       notes in one PLAY (1–4)            time     seconds for the whole challenge
   happy       its favorite note: an index into the first five (0 = concert B♭, shown in YOUR written pitch)
   calm        how the CALM meter rises (max 100): perNote (each right note), listen (using LISTEN), success
               (a challenge played well: 80 % or better)
   harmonize   its happy-note challenge when CALM is full: {type: 'note', hold: seconds} (hold its happy note),
               or {type: 'articulate', taps} (the Snare Drum always uses this one)
   listen      what LISTEN says (the last line is its weakness / what calms it)
   dodge       its turn: {seconds, patterns: [{kind, sprite, every (s), speed (px/s), count}]}
                 kind 'rain' (falls from the top) | 'side' (flies across) | 'burst' (a static burst flying outward)
                 | 'aimed' (heads for your note) | 'wave' (a row with one gap)
   rewards     {fade: {xp, tokens, item?}, befriend: {xp, tokens, item?}} (befriending always gives more)
   lines       its own words: intro, turn (before it attacks), hurt, calm, fade, befriend */
window.QUEST_ENEMIES = [
  {
    id: 'squawk', name: 'Squawk', sprite: 'squawk', hp: 32, atk: 2, test: 'PLAY',
    challenge: 'play', notes: 'first5', count: 3, time: 9,
    happy: 0,
    calm: {perNote: 12, listen: 0, success: 10},
    harmonize: {type: 'note', hold: 1.5},
    listen: ['SQUAWK. A sour note that escaped from a practice room.', 'It hates being played out of tune.', 'It loves {happy}. It calms down when you play clean notes.'],
    dodge: {seconds: 6, patterns: [{kind: 'rain', sprite: 'sour', every: 0.55, speed: 46}, {kind: 'side', sprite: 'sour', every: 1.6, speed: 58}]},
    rewards: {fade: {xp: 8, tokens: 3}, befriend: {xp: 18, tokens: 8, item: 'valve-oil'}},
    lines: {intro: 'Squawk bursts out of a busted speaker!', turn: ['Squawk honks a sour note!', 'Squawk flaps its flag at you.', 'SQUAAAWK!'],
      hurt: 'Squawk wobbles. That note was almost TOO clean.', calm: 'Squawk hums along a little.', fade: 'Squawk fades away grumbling about "perfect pitch."',
      befriend: 'Squawk sings your note back to you. It wants to join your band!'},
  },
  {
    id: 'warble', name: 'Warble', sprite: 'warble', hp: 30, atk: 2, test: 'LONG TONE',
    challenge: 'longtone', notes: 'first5', count: 1, hold: 3, time: 10,
    happy: 3,
    calm: {perNote: 0, listen: 10, success: 34},
    harmonize: {type: 'note', hold: 2.5},
    listen: ['WARBLE. A tuning-fork moth that can\'t hold still.', 'Its wings buzz a little sharp, then a little flat, then sharp again.', 'It calms down if you hold a long, steady note.'],
    dodge: {seconds: 6, patterns: [{kind: 'wave', sprite: 'sour', every: 1.5, speed: 40}, {kind: 'aimed', sprite: 'rest', every: 1.3, speed: 44}]},
    rewards: {fade: {xp: 9, tokens: 3}, befriend: {xp: 20, tokens: 9, item: 'metronome'}},
    lines: {intro: 'Warble flutters out of a jukebox, buzzing off-key!', turn: ['Warble buzzes sharp… then flat…', 'Warble zigzags around you.', 'Bzzzzzzzt?'],
      hurt: 'Warble spins in a circle.', calm: 'Warble\'s wings slow down.', fade: 'Warble drifts off, still buzzing a little flat.',
      befriend: 'Warble lands on your shoulder and buzzes perfectly in tune!'},
  },
  {
    id: 'clatterbox', name: 'Clatterbox', sprite: 'clatterbox', hp: 34, atk: 2, test: 'ARTICULATE',
    challenge: 'articulate', notes: 'first5', count: 1, taps: 4, time: 7,
    happy: 1,
    calm: {perNote: 6, listen: 0, success: 30},
    harmonize: {type: 'articulate', taps: 6},
    listen: ['CLATTERBOX. A metronome robot whose arm won\'t stop clattering.', 'It ticks on every beat. Loudly.', 'It calms down with clean, separate notes: ta, ta, ta, ta.'],
    dodge: {seconds: 7, patterns: [{kind: 'rain', sprite: 'rest', every: 0.42, speed: 52}, {kind: 'burst', sprite: 'static', every: 2.2, count: 6, speed: 40}]},
    rewards: {fade: {xp: 9, tokens: 4}, befriend: {xp: 20, tokens: 10, item: 'cork-grease'}},
    lines: {intro: 'Clatterbox tick-tick-ticks out of the prize counter!', turn: ['TICK TICK TICK TICK!', 'Clatterbox swings its arm like a pendulum.', 'Clatterbox beeps: "OFF. THE. BEAT."'],
      hurt: 'Clatterbox\'s gears grind.', calm: 'Clatterbox ticks a little softer.', fade: 'Clatterbox rolls away, ticking grumpily.',
      befriend: 'Clatterbox ticks right in time with you. It wants to keep the beat for your band!'},
  },
  {
    id: 'quizzle', name: 'Quizzle', sprite: 'quizzle', hp: 30, atk: 2, test: 'VOCAB',
    challenge: 'vocab', rank: 3, notes: 'first5', count: 2, time: 14,
    happy: 4,
    calm: {perNote: 8, listen: 20, success: 30},
    harmonize: {type: 'note', hold: 1.5},
    listen: ['QUIZZLE. A grumpy old scroll that has read every page of the band book.', 'It loves being listened to. (CALM goes up!)', 'It calms down when you know your music words.'],
    dodge: {seconds: 6, patterns: [{kind: 'side', sprite: 'static', every: 0.9, speed: 50}, {kind: 'aimed', sprite: 'sour', every: 1.5, speed: 40}]},
    rewards: {fade: {xp: 8, tokens: 3}, befriend: {xp: 18, tokens: 9, item: 'valve-oil'}},
    lines: {intro: 'Quizzle unrolls with a dusty harrumph. "POP QUIZ!"', turn: ['Quizzle flaps its pages at you.', '"Nobody reads the glossary anymore!"', 'Quizzle rolls up and bounces around.'],
      hurt: 'Quizzle crinkles.', calm: 'Quizzle nods slowly.', fade: 'Quizzle rolls itself up and grumbles off.',
      befriend: 'Quizzle unrolls a gold star just for you. It wants to join your band!'},
  },
  {
    id: 'stickyvalve', name: 'Sticky Valve', sprite: 'stickyvalve', hp: 30, atk: 2, test: 'FINGERING (bonus)',
    challenge: 'fingering', notes: 'first5', count: 1, time: 14,
    happy: 2,
    calm: {perNote: 0, listen: 5, success: 34},
    harmonize: {type: 'note', hold: 1.5},
    listen: ['STICKY VALVE. A brass gremlin whose three valves got stuck.', 'It squeaks every time someone uses the wrong fingering.', 'It calms down when you finger its note exactly right.'],
    dodge: {seconds: 6, patterns: [{kind: 'aimed', sprite: 'sour', every: 1, speed: 44}, {kind: 'rain', sprite: 'static', every: 0.8, speed: 40}]},
    rewards: {fade: {xp: 8, tokens: 3}, befriend: {xp: 18, tokens: 9, item: 'cork-grease'}},
    lines: {intro: 'Sticky Valve squeaks out from under a pinball machine!', turn: ['Squeak! Squeak!', 'Sticky Valve pumps its stuck valves.', 'Sticky Valve spits valve oil… the sour kind.'],
      hurt: 'Sticky Valve rattles.', calm: 'Sticky Valve\'s valves loosen a little.', fade: 'Sticky Valve squeaks off in a huff.',
      befriend: 'All three valves pop free! Sticky Valve wants to join your band!'},
  },
];
