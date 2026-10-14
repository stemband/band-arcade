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
   met-hoot, met-tina, met-pete; later: tuskAwake, hootAwake, songEb, salAwake, ricoDone (+ ricoDoor / ricoVent),
   ep2Done.
   ALSO IN THIS FILE: the intro cutscene ('ep2-intro'), the first lines in the Lobby (QUEST_EP2_ARRIVAL) and the
   microphone's Episode 2 whispers (QUEST_WHISPERS_EP2). */
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
    {do: 'shop', cycle: [
      ['POP! Welcome back!'],
      ['Valve Oil heals you. Popcorn does not. I learned that one the hard way.'],
      ['The static makes my kernels jumpy. POP! See?'],
      ['Maestro has been frozen like that for years. I keep his popcorn warm.'],
    ]},
  ]},

  /* ================= THE GREEN ROOM ================= */

  hoot: {name: 'Professor Hoot', sprite: 'npc-hoot', area: 'The Green Room', talk: [
    {if: '!met-hoot', set: 'met-hoot', lines: [
      'Measure 12... measure 12... measure 12...',
      '...Hm? A student! Hoo! I mean, hello. I seem to be stuck on this page.',
      'When the theater is a little quieter, I shall teach you a song: the E♭ Encore!',
      'Until then... measure 12... measure 12...',
    ]},
    {cycle: [
      ['Measure 12... measure 12... measure 12...'],
      ['Hoo! Still measure 12. A lovely measure. I know every dot in it.'],
      ['A quieter theater, and I could teach you the E♭ Encore. Measure 12...'],
      ['Tip: read the rhythm BEFORE you play it. Hoo! ...measure 12...'],
    ]},
  ]},
});

Object.assign(window.QUEST_SIGNS, {
  'jukebox-stage': ['The Save Jukebox hums a show tune. It knows all the words.'],
  // doors to rooms that are still being built (data/maps/stage.js `soon`)
  'soon': ['This way isn\'t open yet. (Coming soon: the theater is still being built.)'],
  'pit-soon': ['The orchestra pit. Something down there goes BWAAAA.', '(Coming soon: the theater is still being built.)'],
  'workshop-soon': ['The Prop Workshop. Behind the door, a drum roll rattles on and on.', '(Coming soon: the theater is still being built.)'],
  'balcony-roped': ['Roped off. A sign says: CLOSED FOR REHEARSAL.'],
  'balcony-soon': ['The balcony stairs creak. (Coming soon: the theater is still being built.)'],
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
