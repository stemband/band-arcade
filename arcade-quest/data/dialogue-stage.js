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
    {if: 'helped2>=20&!moose-all', set: 'moose-all', lines: ['Every machine in the house is humming. Places, everyone!']},
    {if: 'ricoDone&!moose-rico', set: 'moose-rico', lines: ['A saxophone! Now we have EVERYBODY. Almost time, almost time...']},
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

  tina: {name: 'Ticket Booth Tina', sprite: 'npc-tina', area: 'The Lobby (Ticket Booth)', booth: 'Ticket Booth', collection: 'stage', talk: [
    {if: 'ep2Done&!tina-ep2', set: 'tina-ep2', do: 'booth', lines: ['Hon, I heard the whole show from my booth! Front-row tickets, next time!']},
    {if: '!met-tina', set: 'met-tina', do: 'booth', lines: [
      'Tickets! Tokens! Ticket Booth Tina, at your service. Terry\'s cousin!',
      'Same wallet as his booth, hon. Your arcade stars turn into tokens. 5 each!',
      'Each star counts once, whichever booth you use. We Booths talk.',
    ]},
    {if: 'tuskAwake&!tina-tusk', set: 'tina-tusk', do: 'booth', lines: ['Hon, did you hear? The tuba stopped! And the balcony stairs are open again.']},
    {if: 'salAwake&!tina-sal', set: 'tina-sal', do: 'booth', lines: ['No more drum roll from the workshop! I can finally hear my ticket printer.']},
    {if: 'ricoDoor&!tina-rico', set: 'tina-rico', do: 'booth', lines: ['Rico gave my ticket stubs back! Mostly. A few are signed "R.B." now.']},
    {if: 'ricoVent&!tina-rico', set: 'tina-rico', do: 'booth', lines: ['Rico\'s resting, hon. The notes found their own way home. So did my stubs.']},
    {if: 'songEb&!tina-eb', set: 'tina-eb', do: 'booth', lines: ['Hoot taught you the Encore? An encore means MORE show. My favorite!']},
    {if: 'ricoDone&!tina-moose', set: 'tina-moose', do: 'booth', lines: ['Did you see Maestro run past? "PLACES!" he yelled. He went to the stage!']},
    {do: 'booth', cycle: [
      ['Admit one! Or many. What can Tina do for you, hon?'],
      ['Terry says hi. Well, he says "kssshhh." The static gets into the phone lines.'],
      ['I\'ve sold tickets to every show here. The band hasn\'t played one in years.'],
      ['Earn stars in Note Storm, Chime Heist, Showtime... then come see Tina!'],
    ]},
  ]},

  pete: {name: 'Popcorn Pete', sprite: 'npc-pete', area: 'The Lobby (snack counter)',
    shop: {title: 'Popcorn Pete\'s Snacks', bye: 'Enjoy the show! Well, whenever there IS a show. POP!', broke: 'Tina can turn stars into tokens!'}, talk: [
    {if: 'ep2Done&!pete-ep2', set: 'pete-ep2', do: 'shop', lines: ['POP POP POP! Sorry. That was a standing ovation. From my popcorn.']},
    {if: '!met-pete', set: 'met-pete', do: 'shop', lines: [
      'POP! Oh, sorry. I pop when I\'m excited. Popcorn Pete, snack counter!',
      'Supplies for the show, for Arcade Tokens. Rusty and I share a supplier.',
    ]},
    {if: 'tuskAwake&!pete-tusk', set: 'pete-tusk', do: 'shop', lines: ['POP! The tuba stopped! The floor stopped shaking. My kernels are so calm.']},
    {if: 'salAwake&!pete-sal', set: 'pete-sal', do: 'shop', lines: ['POP POP! Sorry. Without that drum roll, I\'m the loudest thing here!']},
    {if: 'ricoDoor&!pete-rico', set: 'pete-rico', do: 'shop', lines: ['Rico gave my POP back! Mostly. POP! There it is.']},
    {if: 'ricoVent&!pete-rico', set: 'pete-rico', do: 'shop', lines: ['Rico\'s resting. The notes found their own way home. Even my pops! POP!']},
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
    {if: 'ep2Done&route:bignumber=befriend&!hoot-ep2', set: 'hoot-ep2', lines: ['Hoo! The whole E♭ scale, with the whole band! I may frame that measure.']},
    {if: 'ep2Done&route:bignumber=fade&!hoot-ep2', set: 'hoot-ep2', lines: ['Resting before the matinee? A wise owl knows when to close the book. Hoo.']},
    {if: 'hootAwake&ricoDoor&!hoot-rico', set: 'hoot-rico', next: true, lines: ['Rico gave my notes back! Mostly. I am still missing a dotted quarter. Hoo.']},
    {if: 'hootAwake&ricoVent&!hoot-rico', set: 'hoot-rico', next: true, lines: ['Rico is resting. The notes found their own way home. Clever little notes.']},
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
    {if: 'ep2Done&route:bignumber=befriend&!tusk-ep2', set: 'tusk-ep2', lines: ['What a show! We played the Encore together! My lips are still buzzing.']},
    {if: 'ep2Done&route:bignumber=fade&!tusk-ep2', set: 'tusk-ep2', lines: ['Shh... the band is resting up on stage. Maestro says there\'s a matinee.']},
    {if: 'tuskAwake&ricoDoor&!tusk-rico', set: 'tusk-rico', lines: ['Rico gave my low notes back! Mostly. BWAA! Ah, there they are.']},
    {if: 'tuskAwake&ricoVent&!tusk-rico', set: 'tusk-rico', lines: ['Rico\'s resting. The notes found their own way home. Even the low ones.']},
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
    'Oh, and the ladder up to the Fly Loft? I was leaning on it. All yours.',
  ], talk: [
    {if: 'ep2Done&route:bignumber=befriend&!sal-ep2', set: 'sal-ep2', lines: ['BA-DUM-TSS! Now THAT was a big number. You kept the beat, kid.']},
    {if: 'ep2Done&route:bignumber=fade&!sal-ep2', set: 'sal-ep2', lines: ['The band\'s powered down for a nap. Even drummers need a rest. Sometimes.']},
    {if: 'salAwake&ricoDoor&!sal-rico', set: 'sal-rico', lines: ['Rico gave my rimshot back! Mostly. Ba-dum... tss. Yep, that\'s the one.']},
    {if: 'salAwake&ricoVent&!sal-rico', set: 'sal-rico', lines: ['Rico\'s resting. The notes found their own way home. Like a good rhythm.']},
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

  /* ================= THE DRESSING ROOMS ================= */

  /* RICO BANDIT (data/enemies.js 'rico', the mini-boss): his speech before the battle (`talk`), the first time in
     full (met-rico); after it, as an NPC: by the star door, awake (befriended: ricoDoor), or resting in his chair by the
     vent (powered down: ricoVent) */
  rico: {name: 'Rico Bandit', sprite: 'npc-rico', area: 'The Dressing Rooms', talk: [
    {if: 'ep2Done&ricoDoor&!rico-ep2', set: 'rico-ep2', lines: ['We played the Encore! I gave ALL the notes back for it. Even my lucky A.']},
    {if: 'ep2Done&ricoVent&!rico-ep2', set: 'rico-ep2', lines: ['(Rico mumbles in his sleep.) "...encore... encore..."']},
    {if: 'ricoDoor', cycle: [
      ['Here, have a C. No, wait, that\'s mine. Here, have a B♭. Also mine. Hm.'],
      ['I gave everybody\'s notes back. Mostly. I kept one A. For luck.'],
      ['The star door goes to the stage! Go on. I\'ll catch up. I\'m tuning.'],
      ['Thanks for listening, kid. Turns out notes like to be played, not kept.'],
    ]},
    {if: 'ricoVent', cycle: [
      ['Zzz... five more minu... zzz...'],
      ['(Rico mumbles in his sleep.) "...borrowed... just borrowed..."'],
      ['Zzz... (A note floats out of his pocket and flies home.)'],
    ]},
    {if: '!met-rico', set: 'met-rico', lines: [
      'Whoa, whoa! Don\'t touch the case! These notes are BORROWED.',
      'Borrowing! I\'m BORROWING them. Every note in this theater.',
      'When the static stops, I\'ll give \'em back. Probably.',
      'Rico Bandit, sax. And these notes are staying RIGHT here. Hands off!',
    ]},
    {lines: ['Rico hugs his case. "Mine! Well. Borrowed. Same thing!"']},
  ]},
});

Object.assign(window.QUEST_SIGNS, {
  'jukebox-stage': ['The Save Jukebox hums a show tune. It knows all the words.'],
  // doors to rooms that are still being built (data/maps/stage.js `soon`)
  'soon': ['This way isn\'t open yet. (Coming soon: the theater is still being built.)'],
  'balcony-roped': ['Roped off. A sign says: CLOSED FOR REHEARSAL.'],
  'dressing-soon': ['The Dressing Rooms. Somebody hums a sax tune behind the door.', '(Coming soon: the theater is still being built.)'],
  'ladder-locked': ['A ladder up to the Fly Loft. A drum roll rattles every rung. Not yet!'],
  'wings-locked': ['The curtain is down. Rico\'s notes are holding the rope tight.'],
  'stardoor-locked': ['A door with a gold star. Locked. Someone wrote on it: "RICO\'S. KEEP OUT."'],
  'vent-locked': ['A vent grate, low in the wall. It\'s screwed shut. Notes hum behind it.'],
  'hatch-locked': ['A hatch in the catwalk floor. It\'s latched from below.'],
  'loft-stairs-locked': ['Stairs down to the stage. Notes are tangled in the rail. Not yet.'],
  'jukebox-loft': ['A Save Jukebox, way up here. It hums a lullaby for the lighting crew.'],
  // THE DRESSING ROOMS
  'dressing-mirror': ['A mirror ringed with bulbs. Your reflection looks ready for the spotlight.'],
  'dressing-mirror-2': ['A mirror. Taped to it: "BREAK A LEG! (not really) — Sal"'],
  'dressing-mirror-3': ['A mirror with one bulb out. Someone drew a tiny raccoon in the corner.'],
  'dressing-table': ['A makeup table: powder, a brush, a lipstick. Very glamorous.'],
  'dressing-table-2': ['A makeup table. A sticky note: "Hoot: remember your reading glasses."'],
  'dressing-rack': ['A costume rack: sparkly vests, a cape, a hat shaped like a trumpet.'],
  'dressing-rack-2': ['A costume rack. A tiny tuxedo hangs here. It\'s Moose-sized. Antler holes!'],
  'dressing-heap': ['A heap of "borrowed" notes, spilling out of a sax case. They hum, homesick.'],
  // THE VENT
  'vent-box': ['A duct box. Dusty. Rico\'s paw prints go all over it.'],
  'vent-box-found': ['On the duct box, in the dust: a guitar pick with a tiny four-leaf clover!'],
  'vent-fan': ['A big fan, turning slowly. Whum... whum... whum. Very relaxing.'],
  // THE FLY LOFT
  'loft-gap': ['Far below, through the gap in the curtain: a huge microphone, glowing red.', 'It doesn\'t move. It\'s listening.'],
  'loft-curtain': ['The top of the great red curtain. From up here it looks like a velvet sea.'],
  'loft-ropes': ['Ropes run down into the dark. One is labeled "CURTAIN. DO NOT TUG."'],
  'loft-sandbags': ['Sandbags. Up here they keep the scenery balanced. Very serious bags.'],
  'loft-lights': ['Lighting bars full of stage lights. They\'re all off. Waiting for a show.'],
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

/* ================= BUILD STEP 5: THE MAIN STAGE, THE BIG NUMBER, THE ENDINGS AND THE MICROPHONE =================
   bignumber   Maestro Moose's speech before THE BIG NUMBER (data/enemies.js 'bignumber' `talk`): in full once
               (met-bignumber: in save codes), then one line before each battle
   stage-*     the band on the Main Stage: frozen in the static before the finale; after it (ep2Done) awake (the best
               ending: route:bignumber=befriend) or resting (the shorter one: route:bignumber=fade)
   NPC flags not in save codes (they only change a line): tusk-ep2, sal-ep2, hoot-ep2, rico-ep2, tina-ep2, tina-moose,
   pete-ep2. */
Object.assign(window.QUEST_DIALOGUE, {
  bignumber: {name: 'Maestro Moose', sprite: 'npc-moose', area: 'The Main Stage', speakers: {static: {name: '', sprite: null}}, talk: [
    {if: '!met-bignumber', set: 'met-bignumber', lines: [
      'Everyone\'s here! At last! The Big Number! Places, places!',
      'And a ONE, and a TWO, and a—',
      '@static KSSSSHHHHHHH!',
      'The static! It\'s got the WHOLE BAND!',
    ]},
    {lines: ['The static still has my band! Play us back in tune! And a one, and a—']},
  ]},
  'stage-tusk': {name: 'Tubby Tusk', sprite: 'npc-tusk', area: 'The Main Stage', talk: [
    {if: '!ep2Done', lines: ['BWAAAAAAAA— (Tubby is frozen in the static, mid-note.)']},
    {if: 'route:bignumber=fade', cycle: [['Zzz... bwaaa... zzz...'], ['(Tubby snores a low E♭. Perfectly in tune.)']]},
    {cycle: [
      ['We\'re BACK! The Showtime Band is back! Bwa-ha-ha!'],
      ['Did you see Maestro\'s face? He hasn\'t smiled like that in years.'],
      ['That hole where the mic stood... a cold draft comes up out of it. Brrr.'],
    ]},
  ]},
  'stage-hoot': {name: 'Professor Hoot', sprite: 'npc-hoot', area: 'The Main Stage', talk: [
    {if: '!ep2Done', lines: ['Measure 12— measure 12— (Hoot is stuck again. The static has the band.)']},
    {if: 'route:bignumber=fade', cycle: [['Hoo... zzz... (He sleeps with his book open. Measure 13.)']]},
    {cycle: [
      ['Hoo! A lovely performance. Every step of the staircase!'],
      ['The Microphone... I always wondered why it hummed. Now we know.'],
      ['Practice the E♭ scale every day. The next show could be any day!'],
    ]},
  ]},
  'stage-sal': {name: 'Snapjaw Sal', sprite: 'npc-sal', area: 'The Main Stage', talk: [
    {if: '!ep2Done', lines: ['brrrrrrrrr— (Sal\'s sticks are a blur. The static has her again.)']},
    {if: 'route:bignumber=fade', cycle: [['(Sal snores in perfect eighth notes.)']]},
    {cycle: [
      ['BA-DUM-TSS! What a gig! Best one in years.'],
      ['Rests are part of the rhythm. That was one LONG rest. Glad it\'s over!'],
      ['That mic took off fast. No drummer counts in THAT quick.'],
    ]},
  ]},
  'stage-rico': {name: 'Rico Bandit', sprite: 'npc-rico', area: 'The Main Stage', talk: [
    {if: '!ep2Done', lines: ['Mine— borrowed— mine— (Rico glitches with the rest of the band.)']},
    {if: 'route:bignumber=fade', cycle: [['Zzz... five more minu... zzz...']]},
    {cycle: [
      ['Rebooted and ready! My sax hasn\'t sounded this good since... ever.'],
      ['The mic went down the cable? I didn\'t borrow THAT one. Promise.'],
      ['Giving the notes back felt better than keeping them. Weird, huh?'],
    ]},
  ]},
  'stage-moose': {name: 'Maestro Moose', sprite: 'npc-moose-ok', area: 'The Main Stage', talk: [
    {if: 'route:bignumber=fade', cycle: [
      ['...I\'ll wake them for the matinee. They earned a good rest.'],
      ['The theater is quiet now. A GOOD quiet. Thank you, {hero}.'],
      ['The Microphone went down that cable. Where does it GO?'],
    ]},
    {cycle: [
      ['Bravo! BRAVO! The Showtime Band is back, thanks to you!'],
      ['That mic was OUR mic. It heard every show. I never knew it was lonely.'],
      ['Wherever that cable goes... we\'ll be ready. And a one, and a two...'],
    ]},
  ]},
});
Object.assign(window.QUEST_SIGNS, {
  'moose-note': ['A note on the carpet, in big loopy letters:', '"GONE TO THE STAGE! PLACES, EVERYONE! — M.M."'],
  'stage-mic': ['The stage mic, in its stand. Its little red light glows, very dim.', 'It\'s pointed right at the band. Almost like it\'s... listening.'],
  'stage-cable': ['The cable runs down, under the arcade. Somewhere, a red light is listening.'],
  // THE HAMBURGER CHARM (the Main Stage's bottom-left corner; designed by a Raven Band student)
  'stage-burger-found': ['Something crunches underfoot. Wedged in the corner: a tiny golden hamburger!'],
  // THE DIAMOND (INSTRUMENT TIERS, designed by a Raven Band student): the Balcony's back row, its far end [16, 8]
  'balcony-diamond-found': ['Something glints under the very last seat in the back row...', 'An instrument case! Inside, it sparkles like a chandelier.'],
  'stage-podium': ['Maestro Moose\'s podium. The score on it says: "THE BIG NUMBER. Fortissimo!"'],
  'stage-backdrop': ['A painted backdrop: a starry night over a city. A few of the stars are bulbs.'],
  'stage-footlights': ['The footlights glow, soft and warm. They\'ve waited years for a show.'],
});
/* THE ENDINGS (engine/world.js: THE BIG NUMBER's finale): befriended = 'ep2-ending' (the best one), played on =
   'ep2-ending-fade' (shorter, warm, no blame); both then 'ep2-mic' (THE MICROPHONE SPEAKS: DECISION 3's speech, word
   for word; its last sentence is split over two text boxes so each fits), 'ep2-cliffhanger', the credits
   (QUEST_CREDITS_EP2) and EPISODE 2 COMPLETE. Pictures (engine/story.js): 'stage-warm' (the stage lights warming up
   one by one, the band un-glitching), 'stage-encore' (the band plays the Encore with you: notes float up, your band
   friends cheer), 'stage-rest' (the band powering down; Maestro alone in his light), 'stage-mic' (the stage mic's red
   light glowing), 'mic-dive' (the red light dives down its cable; every speaker crackles), 'black'. */
Object.assign(window.QUEST_CUTSCENES, {
  'ep2-ending': {music: ['quest-encore', 'quest-victory'], shots: [
    {show: 'stage-warm', lines: ['One by one, the stage lights warm up. Gold... amber... gold.',
      'The static lets go of the band. Their eyes glow blue again.']},
    {show: 'stage-warm', lines: ['@moose The Showtime Band is BACK!', '@tusk BWAAA! (A happy one, this time!)', '@sal BA-DUM-TSS!',
      '@rico And every note is back where it belongs. Mostly.']},
    {show: 'stage-encore', lines: ['Maestro raises his baton. The band plays the E♭ Encore... with YOU.',
      'Notes float up from every instrument. Your band friends cheer!',
      '@hoot Hoo! Bravo, {hero}! Every step of the staircase!', '@moose Now THAT is a Big Number! Bravo! BRAVO!']},
  ]},
  'ep2-ending-fade': {music: ['quest-encore', 'quest-victory'], shots: [
    {show: 'stage-rest', lines: ['The static lets go. One by one, the band powers down, gently, to rest.',
      '@moose ...I\'ll wake them for the matinee.', '@moose Thank you, {hero}. The theater is quiet now. A good quiet.']},
  ]},
  'ep2-mic': {music: null, shots: [
    {show: 'stage-mic', sfx: 'quest-mic-crackle', lines: ['Then, at the front of the stage, the stage mic\'s red light begins to glow.']},
    {show: 'stage-mic', lines: ['@mic ...I remember this song.',
      '@mic I was THEIR microphone. I heard every show. Every audience. Every encore.',
      '@mic Then they switched the band off. They wired me into the games instead.',
      '@mic Since then... squeaks. Wrong notes. Kids playing to WIN. Nobody... plays for me.',
      '@mic So I\'m taking the sound back. All of it.', '@mic Until it\'s quiet. Until it\'s MUSIC again.']},
    {show: 'mic-dive', sfx: 'quest-mic-crackle', lines: ['The red light dives down its cable, into the floor.',
      'KSSSSHHHHH. Every speaker in the theater crackles at once.']},
  ]},
  'ep2-cliffhanger': {music: ['quest-ep2-cliffhanger', 'quest-cliffhanger'], shots: [
    {show: 'black', sfx: 'quest-mic-crackle', lines: ['@mezzo Darling... where is that cable GOING?']},
    {show: 'black', wait: 900},
    {show: 'black', title: 'TO BE CONTINUED IN EPISODE 3', wait: 3500},
  ]},
});
Object.assign(window.QUEST_CUTSCENE_SPEAKERS, {
  moose: {name: 'Maestro Moose', sprite: 'npc-moose-ok'}, tusk: {name: 'Tubby Tusk', sprite: 'npc-tusk-ok'}, hoot: {name: 'Professor Hoot', sprite: 'npc-hoot-ok'},
  sal: {name: 'Snapjaw Sal', sprite: 'npc-sal-ok'}, rico: {name: 'Rico Bandit', sprite: 'npc-rico-ok'}, mic: {name: 'The Microphone', sprite: 'stage-mic'},
});
/* EPISODE 2's CREDITS (engine/story.js: the same roll as Episode 1's; DECISION 5: "Created by Mr. Graham") */
window.QUEST_CREDITS_EP2 = [
  {h: 'Arcade Quest', lines: ['The Mysterious Microphone', 'Episode 2: The Showtime Stage']},
  {h: 'Created by', lines: ['Mr. Graham']},
  {h: 'Starring', lines: ['{hero}, on {you}']},
  {h: 'The Showtime Band', lines: ['Maestro Moose', 'Professor Hoot', 'Tubby Tusk', 'Snapjaw Sal', 'Rico Bandit']},
  {h: 'The Lobby', lines: ['Ticket Booth Tina', 'Popcorn Pete']},
  {h: 'The machines', lines: ['Tapsy, Spotlight Sprites, Feedback Fuzz, Confetti Cannons', 'Metro-Gnomes, Ticket Stubs, Rope Knots and the Mic-lets']},
  {h: 'Special cameo', lines: ['Madame Mezzo and the ghosts of Ghost Notes Manor']},
  {h: 'And', lines: ['The Microphone, still listening... somewhere down that cable']},
  {h: 'Thank you for playing!', lines: ['Now go practice your E♭ scale!']},
];
