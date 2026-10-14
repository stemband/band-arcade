/* ARCADE QUEST, EPISODE 2: THE SHOWTIME STAGE. EVERY WORD ITS CHARACTERS SAY. MAT: rewrite anything!
   The same rules as data/dialogue.js (read its notes first): one line = one text box, under about 80 characters;
   the FIRST `talk` choice whose `if` is true is used; '@name ' = another speaker; {you} = the instrument, {hero} = the
   player's name. NEW HERE: `ask` = a YES / NO question after the lines (engine/talk.js Q.talk.ask): then `yes` / `no`
   lines, and `do` happens only on yes ('episode2' = into the Showtime Stage: its intro the first time, else its last
   Save Jukebox). A keeper's `booth` / `shop` = the title of their counter (the same shelves and stock as Terry's and
   Rusty's: THE SHARED WALLET).
   THE SHOWTIME BAND (Showtime Malfunction's animatronic house band) are friendly malfunctioning MACHINES here: stuck
   in loops by the static, never scary, nobody inside them. Arcade Quest's warm, funny tone.
   FLAGS this episode sets (shared/backup.js QUEST_V6.flags reserves them all): ep2Start (the intro), met-moose,
   met-hoot, met-tina, met-pete, hootAwake (6 machines helped), songEb (Hoot's lesson passed), tuskAwake + met-tusk
   (the Pit's 3 machines helped), salAwake + met-sal (the Workshop's 4); later: ricoDone (+ ricoDoor / ricoVent),
   ep2Done. Not in save codes (they only change a line): rhythmTip (Sal's tip card, battle/challenges.js),
   balconyGlimpse, moose-tusk, moose-sal, tina-tusk, tina-sal, tina-eb, pete-tusk, pete-sal, pete-eb.
   NEW CONDITIONS: 'a&b' = both; 'charm:<id>' = that charm is yours.
   A BAND MEMBER WHO WAKES (data/maps/stage.js `wakes`): `wake` = the lines said the moment the room's last machine is
   helped (with the awake portrait), `metFlag` = set then. NEW CONDITION: 'helped2>=6' = 6 or more Episode 2 machines
   helped (befriended or powered down), wherever you are; `do: 'teach-eb'` = the E♭ Encore lesson.
   ALSO IN THIS FILE: the intro cutscene ('ep2-intro'), the first lines in the Lobby (QUEST_EP2_ARRIVAL) and the
   microphone's Episode 2 whispers (QUEST_WHISPERS_EP2). */
/* Professor Hoot's lesson (used twice in his `talk`: right after he wakes, and every visit until you pass) */
const HOOT_TEACH = {if: 'hootAwake', do: 'teach-eb', lines: [
  'Now then! The E♭ ENCORE: the concert E♭ scale, bottom to top.', 'On the drum: 8 clean strokes.',
  'Play it for me, one note at a time. Slowly! A scale is a staircase, not a slide.',
], yes: [
  'BRAVO! Hoo-hoo! Every step of the staircase! You know the E♭ Encore!',
  'Choose it after PLAY in any battle. Your E♭ scale, and it hits harder.',
], no: ['Again, from the top. Slowly!']};
Object.assign(window.QUEST_DIALOGUE, {

  /* ================= THE ATTIC (Episode 1's last room): the way in ================= */

  // the old stage speaker under the dusty sheet (data/maps/manor.js attic things `use: 'speaker'`), after ep1Done
  speaker: {name: '', sprite: null, area: 'The Attic', talk: [
    {if: '!ep2Start', lines: [
      'An old stage speaker hides under the sheet, as big as a wardrobe.',
      'A thick cable runs from it into the wall.',
    ], ask: 'Pull the sheet?', do: 'episode2', no: ['You leave the sheet alone. Under it, something hums: kssshhh...']},
    {lines: ['The old stage speaker hums. Its grille glows a soft red.'],
      ask: 'Step back into the Showtime Stage?', do: 'episode2', no: ['The speaker hums along quietly. It will wait for you.']},
  ]},

  /* ================= THE LOBBY ================= */

  moose: {name: 'Maestro Moose', sprite: 'npc-moose', area: 'The Lobby', talk: [
    {if: '!met-moose', set: 'met-moose', lines: [
      'And a one, and a t— And a one, and a t— And a one, and a t—',
      '...I can\'t START without my band! The static has them all stuck in loops!',
      'Tubby, Hoot, Sal, Rico... Help the theater\'s machines. Clear the static!',
      'And a one, and a t— (He freezes again, baton in the air.)',
    ]},
    {if: 'salAwake&!moose-sal', set: 'moose-sal', lines: [
      'A snare! Now we have a beat! Ba-dum, ba-dum...',
      'Tubby AND Sal! Bass and drums! And a one, and a two, and a— (frozen again).',
    ]},
    {if: 'tuskAwake&!moose-tusk', set: 'moose-tusk', lines: [
      'A tuba! I hear a TUBA! The band is coming back!',
      'Tubby, my old friend! And a one, and a t— (He freezes. But he\'s smiling.)',
    ]},
    {if: 'salAwake', cycle: [
      ['Bass and drums are back! Now we need everyone else. And a one, and a t—'],
      ['Rico... where is Rico? His sax has gone very quiet. And a one, and a t—'],
      ['Professor Hoot is in the Green Room. I think he has a song for you.'],
    ]},
    {if: 'tuskAwake', cycle: [
      ['A tuba in the pit again! What a sound. And a one, and a t—'],
      ['Snapjaw Sal is in the Prop Workshop. Her drum roll never stops!'],
      ['Professor Hoot is in the Green Room, reading one page. Over and over.'],
    ]},
    {cycle: [
      ['And a one, and a t— And a one, and a t— ...I can\'t START without my band!'],
      ['A conductor without a band is just a moose waving a stick. And a one, and a t—'],
      ['And a one, and a t— KSSSHHH— ...the static. It hums in my antlers.'],
      ['Professor Hoot is in the Green Room, reading one page. Over and over.'],
      ['Down in the pit, Tubby holds one low note. He has held it for YEARS. And a t—'],
    ]},
  ]},

  tina: {name: 'Ticket Booth Tina', sprite: 'npc-tina', area: 'The Lobby (Ticket Booth)', booth: 'Ticket Booth', talk: [
    {if: '!met-tina', set: 'met-tina', do: 'booth', lines: [
      'Tickets! Tokens! Ticket Booth Tina, at your service. Terry\'s cousin!',
      'Same wallet as his booth, hon. Your arcade stars turn into tokens. 5 each!',
      'Each star counts once, whichever booth you use. We Booths talk.',
    ]},
    {if: 'tuskAwake&!tina-tusk', set: 'tina-tusk', do: 'booth', lines: ['Hon, did you hear? The tuba stopped! And the balcony stairs are open again.']},
    {if: 'salAwake&!tina-sal', set: 'tina-sal', do: 'booth', lines: ['No more drum roll from the workshop! I can finally hear my ticket printer.']},
    {if: 'songEb&!tina-eb', set: 'tina-eb', do: 'booth', lines: ['Hoot taught you the Encore? An encore means MORE show. My favorite!']},
    {do: 'booth', cycle: [
      ['Admit one! Or many. What can Tina do for you, hon?'],
      ['Terry says hi. Well, he says "kssshhh." The static gets into the phone lines.'],
      ['I\'ve sold tickets to every show here. The band hasn\'t played one in years.'],
      ['Earn stars in Note Storm, Chime Heist, Showtime... then come see Tina!'],
    ]},
  ]},

  pete: {name: 'Popcorn Pete', sprite: 'npc-pete', area: 'The Lobby (snack counter)',
    shop: {title: 'Popcorn Pete\'s Snacks', bye: 'Enjoy the show! Well, whenever there IS a show. POP!', broke: 'Tina can turn stars into tokens!'}, talk: [
    {if: '!met-pete', set: 'met-pete', do: 'shop', lines: [
      'POP! Oh, sorry. I pop when I\'m excited. Popcorn Pete, snack counter!',
      'Supplies for the show, for Arcade Tokens. Rusty and I share a supplier.',
    ]},
    {if: 'tuskAwake&!pete-tusk', set: 'pete-tusk', do: 'shop', lines: ['POP! The tuba stopped! The floor stopped shaking. My kernels are so calm.']},
    {if: 'salAwake&!pete-sal', set: 'pete-sal', do: 'shop', lines: ['POP POP! Sorry. Without that drum roll, I\'m the loudest thing here!']},
    {if: 'songEb&!pete-eb', set: 'pete-eb', do: 'shop', lines: ['An Encore! POP! I always pop extra popcorn for an encore.']},
    {do: 'shop', cycle: [
      ['POP! Welcome back!'],
      ['Valve Oil heals you. Popcorn does not. I learned that one the hard way.'],
      ['The static makes my kernels jumpy. POP! See?'],
      ['Maestro has been frozen like that for years. I keep his popcorn warm.'],
    ]},
  ]},

  /* ================= THE GREEN ROOM ================= */

  /* PROFESSOR HOOT: stuck on measure 12 until 6 Episode 2 machines are helped ('helped2>=6': only the Showtime Stage's
     machines count, befriended or powered down); then he wakes (hootAwake) and teaches the E♭ ENCORE ('teach-eb':
     the concert E♭ scale bottom to top, 75 % to pass = songEb; the snare: 8 clean strokes) */
  hoot: {name: 'Professor Hoot', sprite: 'npc-hoot', area: 'The Green Room', talk: [
    {if: 'songEb', cycle: [
      ['Hoo! Practice your scales every day. Slowly first.', 'The Encore loves a slow start.'],
      ['Choose the E♭ Encore after PLAY in a battle. Your whole scale, hitting harder!'],
      ['Long tones, then scales, then the fun stuff.', 'That is the order of the universe. Hoo.'],
      ['A scale played slowly and well beats a scale played fast and messy. Every time.'],
    ]},
    HOOT_TEACH,
    {if: 'helped2>=6', set: 'hootAwake', next: true, lines: [
      'Measure 12... measure 12... measure... thirteen?',
      'MEASURE THIRTEEN! I\'m free! The static let go of my page!',
      'You did that, didn\'t you? All those machines, calmer now. Hoo! Thank you!',
    ]},
    HOOT_TEACH,
    {if: '!met-hoot', set: 'met-hoot', lines: [
      'Measure 12... measure 12... measure 12...',
      '...Hm? A student! Hoo! I mean, hello. I seem to be stuck on this page.',
      'When the theater is a little quieter, I shall teach you a song: the E♭ Encore!',
      'Until then... measure 12... measure 12...',
    ]},
    {cycle: [
      ['Measure 12... measure 12... measure 12...'],
      ['Hoo! Still measure 12. A lovely measure. I know every dot in it.'],
      ['A quieter theater, and I could teach you the E♭ Encore.', '({n} machines helped. Measure 12...)'],
      ['Tip: read the rhythm BEFORE you play it. Hoo! ...measure 12...'],
    ]},
  ]},

  /* ================= THE ORCHESTRA PIT ================= */

  /* TUBBY TUSK: stuck on one low note until the Pit's 3 machines are helped (either way: data/maps/stage.js `wakes`);
     then he wakes, shuffles off the trap door (Backstage) and the balcony's rope comes down */
  tusk: {name: 'Tubby Tusk', sprite: 'npc-tusk', area: 'The Orchestra Pit', metFlag: 'met-tusk', wake: [
    'BWAAAAAAA—aa? Oh! Hello! Was I stuck? I was stuck.',
    'One note, for years! My lips feel like jelly. Thank you, little musician.',
    'Oh! I was sitting on the trap door. Scoot, scoot... There! Down to Backstage.',
    'And the rope on the balcony stairs came down. Go up and look, if you like.',
  ], talk: [
    {if: 'tuskAwake', cycle: [
      ['Long tones are like naps for your sound. Very good for you.'],
      ['Breathe low, from your belly. A walrus knows. I am mostly belly.'],
      ['The trap door goes down to Backstage. Mind the sandbags. They don\'t move.'],
      ['From the balcony you see the whole stage. Something waits behind the curtain.'],
      ['A tuba is just a trumpet that ate a big lunch. Ha! Bwa-ha!'],
    ]},
    {cycle: [
      ['BWAAAAAAAAAAAAAAAAAAAAA—', '(He can\'t stop. His eyes glow red with static.)'],
      ['BWAAAAAAAAAA— (He waves a flipper at the machines in the pit.) —AAAAA'],
      ['BWAAAAAAAAAAAAA— (Help the pit\'s 3 machines. Maybe then he can stop.)'],
    ]},
  ]},

  /* ================= THE PROP WORKSHOP ================= */

  /* SNAPJAW SAL: stuck in a drum roll until the Workshop's 4 machines are helped (either way); then she wakes, clears
     the fly loft ladder and TEACHES RHYTHM ('rhythm-lesson': one tier-2 rhythm, pass = the Metronome Ticker, once).
     Her tip card before the first rhythm battle: battle-text.js rhythmTip… */
  sal: {name: 'Snapjaw Sal', sprite: 'npc-sal', area: 'The Prop Workshop', metFlag: 'met-sal', wake: [
    '—rrrrrrrrrrIMSHOT! Phew. Thanks, kid. My wrists were getting tired.',
    'Snapjaw Sal, drums. I keep the beat for the whole Showtime Band.',
    'Want to read rhythms like a pro? Talk to me. The lesson\'s free!',
    'Oh, and the ladder up to the fly loft? I was leaning on it. All yours.',
  ], talk: [
    {if: 'charm:metronome-ticker', cycle: [
      ['Count out loud: "1 and 2 and." Your feet can tap, too. Feet are free drums.'],
      ['Rests are part of the rhythm. Silence counts! Literally. Count it.'],
      ['Eighth notes come in pairs: "1 and." Two notes, one beat. A bargain!'],
      ['Wear that Metronome Ticker. It ticks right along with you.'],
    ]},
    {if: 'salAwake&snare', do: 'rhythm-lesson', lines: [
      'Lesson time, drummer! One measure. I count you in, you hit it.',
      'Read it first. Count it in your head. Then hit exactly WHEN the notes are.',
    ], yes: ['BA-DUM-TSS! Right in the pocket! Here, take this. It ticks with you.'], no: ['Again! Count out loud this time.']},
    {if: 'salAwake', do: 'rhythm-lesson', lines: [
      'Lesson time! One measure. I count you in, you play it on any one note.',
      'Read it first. Count it in your head. Then play exactly WHEN the notes are.',
    ], yes: ['BA-DUM-TSS! Right in the pocket! Here, take this. It ticks with you.'], no: ['Again! Count out loud this time.']},
    {cycle: [
      ['brrrrrrrrrrrrrrrrrrrrrrrrrrrr', '(Her drum roll never ends. Her eyes glow red with static.)'],
      ['brrrrrrrrrr— (She nods at the machines in the workshop.) —rrrrrrrrrr'],
      ['brrrrrrrrrrrr— (Help the workshop\'s 4 machines. Then maybe...) —rrrrr'],
    ]},
  ]},
});

Object.assign(window.QUEST_SIGNS, {
  'jukebox-stage': ['The Save Jukebox hums a show tune. It knows all the words.'],
  // doors to rooms that are still being built (data/maps/stage.js `soon`)
  'soon': ['This way isn\'t open yet. (Coming soon: the theater is still being built.)'],
  'balcony-roped': ['Roped off. A sign says: CLOSED FOR REHEARSAL.'],
  'dressing-soon': ['The Dressing Rooms. Somebody hums a sax tune behind the door.', '(Coming soon: the theater is still being built.)'],
  'wings-soon': ['The curtain is down. Something big is waiting behind it.', '(Coming soon: the theater is still being built.)'],
  'ladder-locked': ['A ladder up to the fly loft. A drum roll rattles every rung. Not yet!'],
  'ladder-soon': ['The ladder goes up into the dark. Not today.'],
  // THE ORCHESTRA PIT
  'trap-locked': ['A trap door. Tubby Tusk is sitting right on top of it. BWAAAAA.'],
  'pit-sign': ['A sign on the rail: "The orchestra pit. Mind the tuba."'],
  'pit-rail': ['The stage is just above the rail. The curtain is down.'],
  'pit-timpani': ['A timpani: a big copper kettle drum. It hums along with Tubby.'],
  'pit-timpani-2': ['Another timpani, tucked in the corner. Nothing else back here.'],
  'pit-timpani-found': ['Something glints behind the timpani, in the corner: a little pouch!'],
  'pit-stand': ['A music stand. The music on it is one long, low whole note.'],
  'pit-stand-2': ['A music stand. Someone wrote "BREATHE" in the margin. Twice.'],
  // THE PROP WORKSHOP
  'workshop-bench': ['A workbench: wood blocks, glue, a paintbrush. Nothing sharp. Safety first!'],
  'workshop-bench-2': ['A prop on the bench: a cardboard trumpet. It\'s pretty good, actually.'],
  'workshop-paint': ['Paint cans: red, blue, gold. One drip dried into a perfect eighth note.'],
  'workshop-moon': ['A giant cardboard moon with a sleepy face. It looks very relaxed.'],
  'workshop-sawhorse': ['A sawhorse. It\'s not a horse. It doesn\'t even neigh. Disappointing.'],
  'workshop-backdrop': ['A backdrop: half a blue sky, half plain canvas. The painter left mid-cloud.'],
  // BACKSTAGE
  'backstage-lamp': ['The stage manager\'s lamp. It glows a soft, steady green. Very calming.'],
  'backstage-clipboard': ['A clipboard with the running order:', '"1. Overture. 2. The Big Number. 3. ENCORE (mic check!)"'],
  'backstage-quiet': ['A lit sign: QUIET PLEASE.', 'It flickers. Now it says: QUIET PLEASE PLEASE PLEASE.'],
  'backstage-ropes': ['Rope lines run up into the dark. They hold scenery way, way above.'],
  'backstage-sandbags': ['Sandbags. They keep the scenery from floating away. Very important bags.'],
  'backstage-case': ['A road case stenciled SHOWTIME BAND. It\'s covered in stickers.'],
  'backstage-case-2': ['A road case: "FRAGILE: CONTAINS ONE (1) TRIANGLE."'],
  // THE BALCONY
  'balcony-spot': ['A follow-spot on a stand. It points down at the stage, waiting for a star.'],
  'balcony-railing': ['A brass railing. Far below: the dark stage, and a gap in the curtain.'],
  'balcony-seats': ['Balcony seats. A little brass plate says: BEST VIEW IN THE HOUSE.'],
  'box-office': ['The box office. A sign in the window: "TONIGHT: THE SHOWTIME BAND! (Probably.)"'],
  'snack-counter': ['The snack counter smells like warm popcorn. Something goes POP now and then.'],
  'lobby-poster': ['A poster: "THE SHOWTIME BAND! Tubby! Hoot! Sal! Rico! And Maestro Moose!"'],
  'lobby-poster-2': ['A faded poster: "ONE NIGHT ONLY: THE BIG NUMBER." Someone drew a star on it.'],
  'lobby-bulbs': ['Light bulbs all around the doors. A few are out. The rest twinkle hopefully.'],
  'velvet-rope': ['A red velvet rope on shiny brass posts. Very fancy. You step around it politely.'],
  'greenroom-stand': ['A music stand. The page says "Measure 12" in very big letters. Hoo.'],
  'greenroom-mirror': ['A mirror ringed with light bulbs. You look ready for the stage.'],
  'greenroom-mirror-2': ['A mirror with bulbs. Someone wrote on it in lipstick: "BREATHE FIRST!"'],
  'greenroom-callboard': ['The callboard: "Warm up. Tune. Long tones. THEN the show." Signed: Hoot.'],
  'greenroom-couch': ['A squashy green couch. It has heard a thousand nervous jokes before a show.'],
});

/* THE INTRO (engine/story.js plays it; skippable like every cutscene): the attic's speaker pulls you into the theater.
   Its pictures: 'sheet' (the sheet slides off the speaker), 'speaker' (its grille glows red), 'speaker-pull' (Episode
   1's pull, through the grille), 'black', 'marquee' (the Showtime Stage's marquee, half its letters out: "SH WT ME";
   one letter flickers slowly) and 'steps' (you land on the theater's front steps). Then the Lobby. */
Object.assign(window.QUEST_CUTSCENES, {
  'ep2-intro': {music: ['quest-ep2-intro', 'quest-intro'], shots: [
    {show: 'sheet', lines: ['Under the sheet: an old stage speaker, as big as a wardrobe.',
      'Its cable runs into the wall... and somewhere far away.']},
    {show: 'speaker', sfx: 'quest-mic-crackle', lines: ['KSSSHHH. The grille glows red. Then it PULLS.']},
    {show: 'speaker-pull', sfx: 'quest-static', lines: ['Hold on to your {you}! WHOOOOSH!']},
    {show: 'black', wait: 900},
    {show: 'marquee', lines: ['A theater marquee flickers in the dark. Half its letters are out.',
      '"SH WT ME." The Showtime Stage!']},
    {show: 'steps', lines: ['You land on the front steps. Inside, somebody is counting...',
      '"And a one, and a t— And a one, and a t—"']},
  ]},
});

/* the first lines in the Lobby, after the intro */
window.QUEST_EP2_ARRIVAL = ['The doors swing open on their own. Velvet ropes, red carpet... and static.',
  'In the middle of the lobby, a moose in a tailcoat stands frozen, baton raised.'];

/* THE MICROPHONE'S WHISPERS in the Showtime Stage (never in the Lobby or the Green Room): the giant microphone shows
   between the curtains for a moment, and one of these floats by. */
window.QUEST_WHISPERS_EP2 = ['...applause... I remember applause...', '...so much noise...', '...play it again...',
  '...the lights... the curtain...', '...one more show...', '...every encore...'];
