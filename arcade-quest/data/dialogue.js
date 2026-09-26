/* ARCADE QUEST, EPISODE 1: EVERY WORD THE MANOR'S GHOSTS SAY. MAT: rewrite anything!
   One line = one text box. Keep each line under about 80 characters so it fits (a test checks it).
   HOW A CONVERSATION IS CHOSEN: each character has a list of `talk` choices; the FIRST one whose `if` is true is used.
     if     'flag' (true once set) | '!flag' (not set yet) | 'helped>=8' (manor ghosts calmed, befriended or faded)
            | 'snare' (the player is on Snare Drum). Leave `if` out for the default.
     set    a flag to set after the lines (e.g. 'met-mezzo', so the first-meeting speech plays once)
     lines  the lines, in order                cycle   several line lists: a different one each time you talk
     do     something that happens after: 'shop' | 'booth' | 'teach' (the Butler's B♭ Blast) | 'wake' (Sir Reginald)
     next   true = after these lines, carry on straight into the next choice below whose `if` is true
     yes / no   for 'teach': the lines after passing or not passing the song
   '@tally Hi!' = this line is said by another speaker listed in that character's `speakers`.
   {you} = the student's instrument, {need} = how many more ghosts Sir Reginald wants calmed.
   FLAGS the game sets: songBb (learned the B♭ Blast), reginaldAwake, atticOpen (the Phantom Fermata harmonized),
   met-conductor (heard the Ghost Conductor's speech), ep1Done (the Ghost Conductor befriended: Episode 1 finished).
   THE STORY: the Band Arcade's own listening microphone has heard every squeak, cracked note and wrong fingering
   for years, and nobody ever played just for IT. It has come to believe music is only noise, so it is pulling the
   sound out of the cabinets to make the noise stop. It is misunderstood, not evil. Episode 1 only HINTS at it: the
   static, missing sounds, a giant microphone glimpsed in windows, crackling whispers, rumors, and the cliffhanger.
   ALSO IN THIS FILE: QUEST_CUTSCENES (the intro, the ending, the cliffhanger), QUEST_WHISPERS (the microphone's
   whispers while you explore) and QUEST_CREDITS. */
window.QUEST_DIALOGUE = {

  /* ================= THE ATTIC: the final boss's speech (before the battle, once) ================= */

  conductor: {name: 'The Ghost Conductor', sprite: 'conductor', area: 'The Attic', talk: [
    {if: '!met-conductor', set: 'met-conductor', lines: [
      'SILENCE! Who dares make a sound in MY attic?',
      'I am the Ghost Conductor. My orchestra played in this manor for a hundred years.',
      'Then the static came. It swallowed their sound. Every note. Every last one.',
      'Now there is only silence. And silence, I will conduct FOREVER!',
      '...Unless you think you can play? Hmph. Show me. From the top!',
    ]},
    {lines: ['You again! Very well. From the top! And this time, WATCH MY BATON!']},
  ]},

  /* ================= THE FOYER ================= */

  mezzo: {name: 'Madame Mezzo', sprite: 'npc-mezzo', area: 'The Foyer', talk: [
    {if: 'ep1Done', cycle: [
      ['Darling! The music is BACK! I have not stopped singing since. Nobody has asked me to.'],
      ['That crackle at the end, though... Kssshhh. Something out there is still listening.'],
      ['The Conductor rehearses every night now. Ghosts love a rehearsal. We have time.'],
    ]},
    {if: 'atticOpen', cycle: [
      ['The Fermata let you pass? Magnificent! Bravissimo! Encore!',
        'But the attic... Something up there hums at night. Low. Steady. Listening.',
        'Whatever it is, darling, remember: every villain is just a bad audience.'],
      ['I have saved you a seat for the grand finale. Front row. Fog machine included.'],
    ]},
    {if: '!met-mezzo', set: 'met-mezzo', lines: [
      'Ah! A visitor! Welcome, welcome, darling, to Ghost Notes Manor!',
      'I am Madame Mezzo. Opera singer. Hostess. Legend. Ghost.',
      'You came in through the Ghost Notes cabinet? Of course you did. Everyone does.',
      'This manor used to be FULL of music. Now the notes have gone... grumpy.',
      'Sour notes in the hall! Shushing in the library! A teacup that will NOT stop talking!',
      'Play for them, darling. A clean note calms a ghost faster than any lullaby.',
      'When a ghost\'s CALM meter is full, HARMONIZE with it. Friends beat foes!',
      'The jukebox saves your game. Terry trades your arcade stars for tokens.',
      'And Rusty sells supplies. Be gentle with him. He startles. Loudly.',
      'Now go! Up the hall! Break a leg! (Not literally. We\'re ghosts. It\'s complicated.)',
    ]},
    {if: 'reginaldAwake', cycle: [
      ['Sir Reginald woke up? For YOU? He slept through my entire farewell tour.',
        'The attic stairs are open, then. Something big waits at the top. Be brave, darling.'],
      ['A fermata means "hold this note as long as you like." That one likes it VERY long.'],
    ]},
    {cycle: [
      ['Have you tried LISTENING to a ghost? Most of them just want to be heard. Like me!'],
      ['I once held a high C for eleven minutes. The chandelier has never been the same.'],
      ['Lately there\'s a crackle in the walls. Kssshhh. The others call it "the static."'],
      ['Sir Reginald is asleep on the attic stairs. Calm the manor down and he might move.'],
      ['Warm up, darling! Long tones first. Even legends do their long tones.'],
      ['Some nights, whole songs go missing. Just... gone. As if something swallowed them.'],
      ['They say the arcade has a microphone that hears everything. Nobody has ever seen it.'],
    ]},
  ]},

  rusty: {name: 'Rusty', sprite: 'npc-rusty', area: 'The Foyer (shop)', talk: [
    {if: '!met-rusty', set: 'met-rusty', do: 'shop', lines: [
      'AAH! Oh. Oh, it\'s a customer. Sorry. I startle. It\'s a whole thing.',
      'I\'m Rusty. I\'m made of valve oil. Ninety percent valve oil. Ten percent worry.',
      'I sell supplies! For Arcade Tokens. Only tokens. Stars are too pointy.',
    ]},
    {do: 'shop', cycle: [
      ['Welcome back! Please, no sudden crescendos.'],
      ['Valve Oil: two drops and your valves go "ahhh." It heals you too. Somehow.'],
      ['Did the walls just go kssshh? That\'s not normal, right? RIGHT?'],
      ['Cork Grease keeps sour notes from sticking. Also great for stuck corks. Obviously.'],
      ['I heard a noise in the attic once. I hid in a trumpet case for three days.'],
      ['Terry says the static comes from a giant microphone. I say we DON\'T go look.'],
      ['A Tuning Slide! Pull it out, push it in. Your next PLAY hits way harder.'],
    ]},
  ]},

  terry: {name: 'Token Booth Terry', sprite: 'npc-terry', area: 'The Foyer (Token Booth)', talk: [
    {if: '!met-terry', set: 'met-terry', do: 'booth', lines: [
      'Step right up! Token Booth Terry, at your service. Sixty years in the business.',
      'Well. Twenty years alive, forty years ghost. It all counts.',
      'Stars you earn in the OTHER arcade games? I turn \'em into Arcade Tokens. 5 each!',
      'Each star only once, though. No double-dipping. I\'ve got a very good memory.',
    ]},
    {do: 'booth', cycle: [
      ['Got stars? I got tokens. Let\'s do business.'],
      ['Earn more stars in Ghost Notes, Note Storm, Chime Heist... then come see Terry!'],
      ['Fun fact: the static started the same night the jukebox skipped a beat. Coincidence?'],
      ['I heard it once, through the jukebox. A whisper: "...so much noise..." Brrr.'],
      ['Tokens buy supplies at Rusty\'s. Tell him Terry sent you. He\'ll scream. Then he\'ll help.'],
    ]},
  ]},

  lou: {name: 'Loopy Lou', sprite: 'npc-lou', area: 'The Foyer', talk: [
    {cycle: [
      ['Measure twelve... measure twelve... measure twelve again...'],
      ['I\'ve practiced this one measure for eighty years. Almost got it!'],
      ['"One more time from the top," they said. I took it VERY seriously.'],
      ['Tip: slow it down first, then speed up. I never did. Look where it got me.'],
      ['Measure twelve has a rest in it. I keep playing through it. Sir Reginald is furious.'],
    ]},
  ]},

  /* ================= THE PORTRAIT HALL ================= */

  reginald: {name: 'Sir Reginald Rest', sprite: 'npc-reginald', area: 'The Portrait Hall', talk: [
    {if: 'reginaldAwake', cycle: [
      ['In music, the silence counts too. Mostly I count it with my eyes closed.'],
      ['Something in the attic hums all night. Like it\'s... listening. Zzz.'],
      ['A whole rest, a half rest, a quarter rest... I\'ve taken them all. Delightful.'],
    ]},
    {if: 'helped>=8', do: 'wake', lines: [
      'Hm? It\'s... quieter. You did that? Well done. Very restful.',
      'Fine. I shall move. Slowly. Like a whole note.',
      'A fermata guards the top of those stairs. Very long. Very... held.',
      'Play steady, breathe first, and never rush your rests. Goodnight.',
    ]},
    {if: '!met-reginald', set: 'met-reginald', lines: [
      'Zzzz... hm? Wha? Oh. Hello. I\'m Sir Reginald Rest. I\'m resting.',
      'A rest is a note too, you know. A note of... not playing. The best kind.',
      'The attic stairs? Behind me? Mmm. Far too noisy up there. And down here.',
      'Calm {need} more grumpy ghosts and I\'ll... think about... moving... zzz.',
    ]},
    {cycle: [
      ['Zzz... quarter rest... half rest... whole rest... zzz... ({need} more ghosts)'],
      ['Mmph. Count the rests. One, two, three, fo... zzz. ({need} more ghosts to calm)'],
      ['Still too noisy... {need} more ghosts... then I\'ll move. Probably. Zzz.'],
    ]},
  ]},

  fran: {name: 'Forgetful Fran', sprite: 'npc-fran', area: 'The Portrait Hall', talk: [
    {cycle: [
      ['Have you seen my music? I left it on the stand. In 1953.'],
      ['I forgot my music, my pencil AND my reed. Also my body. Ghost joke.'],
      ['Last night something crackled in the attic. Like a giant microphone. Silly, right?'],
      ['Wisps love one special note. LISTEN to find out which. I forgot mine. Obviously.'],
      ['Always write your name on your music. Otherwise it ends up in a manor. Like me.'],
    ]},
  ]},

  /* ================= THE LIBRARY ================= */

  twins: {name: 'Tilly', sprite: 'npc-tilly', area: 'The Library',
    speakers: {tilly: {name: 'Tilly', sprite: 'npc-tilly'}, tally: {name: 'Tally', sprite: 'npc-tally'}}, talk: [
    {if: '!met-twins', set: 'met-twins', lines: [
      '@tilly Oh! A visitor! I\'m Tilly, and this is...',
      '@tally ...Tally! We finish each other\'s...',
      '@tilly ...sentences! And vocab quizzes.',
      '@tally The Hush ghosts LOVE music words. Answer right and they calm right...',
      '@tilly ...down. Answer wrong and they go SHHHH. Very loudly. For librarians.',
      '@tally Want hints? Talk to us again. We know every Orange belt...',
      '@tilly ...word! Well. Most. Some. Several.',
    ]},
    {cycle: [
      ['@tilly Hint! Tempo is the speed of the beat...', '@tally ...and the beat is the pulse you tap your foot to!'],
      ['@tally Forte means loud...', '@tilly ...piano means soft! Like a library. Shhh.'],
      ['@tilly A sharp raises a note a half step...', '@tally ...a flat lowers it, and a natural cancels them both!'],
      ['@tally A measure is the space between two...', '@tilly ...bar lines! The bar line divides the music.'],
      ['@tilly Da Capo, D.C., means go back to...', '@tally ...the beginning! One more time from the top!'],
      ['@tally The time signature tells the counts per...', '@tilly ...measure! The key signature shows the flats and sharps.'],
      ['@tilly The treble clef curls around G...', '@tally ...and the bass clef has two dots around F!'],
      ['@tally A rest is silence in music...', '@tilly ...Sir Reginald wrote a whole book about it. It\'s mostly blank.'],
      ['@tilly Have you heard the shelves crackle at night? Like...', '@tally ...static. Some pages have gone blank. Words just... missing.'],
    ]},
  ]},

  /* ================= THE BALLROOM ================= */

  butler: {name: 'The Butler', sprite: 'npc-butler', area: 'The Ballroom', talk: [
    {if: 'songBb', cycle: [
      ['The B♭ Blast suits you. Choose it after PLAY when a ghost needs a bigger sound.'],
      ['One more time from the top? Always. That is a butler\'s motto. And a band\'s.'],
      ['I polished the attic door once. It hummed at me. I have not gone back.'],
      ['The Wobbles adore a long tone. Hold it steady and they stop jiggling at once.'],
      ['Every sour note ever played in the arcade... something heard them all. Poor thing.'],
    ]},
    {if: '!met-butler', set: 'met-butler', next: true, lines: [
      'Good evening. I am the Butler. I have buttled here for one hundred and twelve years.',
      'The ballroom has not had a proper song since the static arrived. A tragedy.',
      'Might I teach you the house specialty? "The B♭ Blast." Big sound. Great posture.',
    ]},
    {if: 'snare', do: 'teach', lines: [
      'For the drum, the B♭ Blast is eight clean, separate strokes. With gusto.',
      'Play them for me now, please. I have eternity, but the ghosts do not.',
    ], yes: [
      'Splendid! Crisp as a fresh tablecloth. You now know the B♭ Blast.',
      'Choose it after PLAY in any battle. It hits harder. The ghosts will notice.',
    ], no: [
      'Nearly! Every drummer takes it again from the top. Speak to me when you\'re ready.',
    ]},
    {do: 'teach', lines: [
      'The B♭ Blast is the concert B♭ scale, bottom to top, with gusto.',
      'Play it for me now, please, one note at a time. I have eternity. Take your time.',
    ], yes: [
      'Splendid! Every note in its place, like silverware. You now know the B♭ Blast.',
      'Choose it after PLAY in any battle. It uses your scale and hits harder.',
    ], no: [
      'Nearly! Every musician takes it again from the top. Speak to me when you\'re ready.',
    ]},
  ]},

  dot: {name: 'Dizzy Dot', sprite: 'npc-dot', area: 'The Ballroom', talk: [
    {cycle: [
      ['One-two-three, one-two-three! Waltzes are in 3/4 time. Wheee!'],
      ['The Wobbles love a long tone. Hold it steady and they stop jiggling!'],
      ['The music in here went quiet one night. Just... gone. Like someone took it.'],
      ['Big breath BEFORE the long note, not in the middle! Dancing tip. Also a band tip.'],
      ['I\'ve been spinning since 1922. I\'m not dizzy. The ROOM is dizzy.'],
    ]},
  ]},

  /* ================= THE KITCHEN ================= */

  sizzle: {name: 'Sous-Chef Sizzle', sprite: 'npc-sizzle', area: 'The Kitchen', talk: [
    {cycle: [
      ['Chatterboxes in MY kitchen! Talk, talk, talk! Tongue your notes and they\'ll hush.'],
      ['Chef\'s tip: say "too-too-too" on every note. Crisp! Like a good cracker.'],
      ['Some of my pots don\'t clang anymore. The sound just... disappears. Very spooky.'],
      ['A clean start to every note, that\'s the secret. Nobody likes a soggy attack.'],
      ['Snare drummers, listen up: every stroke its own. No flams in my soup!'],
    ]},
  ]},
};

/* SIGNS AND THINGS: what you read when you inspect something (face it and press A). One line per box. */
window.QUEST_SIGNS = {
  'jukebox': ['The Save Jukebox hums a happy tune.'],
  'foyer-cabinet': ['The Ghost Notes cabinet. You came through this. Somehow.', 'Its screen still glows. Far away, the arcade is humming.'],
  'foyer-portrait': ['A portrait of Madame Mezzo, mid-high-note. The painter wore earplugs.'],
  'foyer-window': ['Fog, moonlight, and a very long driveway. Nobody\'s leaving tonight.'],
  'foyer-fireplace': ['A cozy ghost fire. It crackles in 4/4 time.'],
  'foyer-clock': ['A grandfather clock. It ticks at 60 beats per minute: one tick per second.'],
  'plant': ['A spooky plant. It droops a little when someone plays out of tune.'],
  'hall-portrait-1': ['A ghost with a tuba. The plaque says: "Low notes need the most air."'],
  'hall-portrait-2': ['"Lady in Red." She played trumpet. She always warmed up first.'],
  'hall-portrait-3': ['A painting of the moon. Someone wrote "Moonlight Sonata" on the frame.'],
  'hall-portrait-4': ['A portrait of Sir Reginald, asleep. The painter did too.'],
  'hall-portrait-5': ['"The Conductor." His baton is raised. The whole orchestra holds its breath.'],
  'book-1': ['"Dynamics for Beginners": p = piano = soft. f = forte = loud.'],
  'book-2': ['"Tempo Tales": Largo is very slow. Allegro is fast and lively.'],
  'book-3': ['"The Staff and You": five lines, four spaces. Notes live on both.'],
  'book-4': ['"Accidents Happen": a sharp raises a note a half step. A flat lowers it.'],
  'book-5': ['"Rests: The Quiet Heroes" by Sir Reginald Rest. Chapter one is blank. On purpose.'],
  'book-6': ['"Bar Lines and You": they split the music into measures. Very tidy.'],
  'book-7': ['"The Big Book of Clefs": the treble clef is also called the G clef.'],
  'book-8': ['This book\'s pages have gone blank. The edges crackle, like static.'],
  'book-9': ['"Da Capo!": D.C. means go back to the beginning. So... page one again.'],
  'book-10': ['"Time Signatures": the top number says how many counts are in each measure.'],
  'library-window': ['Outside, fog drifts by. A bat flaps past in 6/8 time.'],
  'library-table': ['A stack of flash cards. One says "FORTE." It is written very large.'],
  'piano': ['A grand piano. Middle C is near the middle. Close enough.', 'Someone left a note on it: "Please practice. Love, the Butler."'],
  'ballroom-portrait': ['A dancing couple, mid-spin. They have been spinning since 1922.'],
  'ballroom-portrait-2': ['A ghost orchestra. The second clarinet is waving at you.'],
  'ballroom-window': ['Moonlight pours in. For a moment you hear a waltz. Then static.'],
  'ballroom-table': ['A table set for a party that never ended. The cake is a ghost too.'],
  'stove': ['A ghostly stove. The kettle whistles a perfect A. That\'s 440 vibrations a second!'],
  'counter': ['A recipe card: "Tonguing Soup. One \'too\' per note. Stir. Do not slur."'],
  'counter-2': ['A jar labeled "SPARE REEDS." It is empty. Of course it is.'],
  'kitchen-clock': ['The kitchen clock ticks: tick, tock, tick, tock. Perfectly even. Like good tonguing.'],
  'kitchen-table': ['Teacups everywhere. You check them all. None of them are talking. Yet.'],
  'stairs': ['The stairs creak in B♭. Every. Single. Step.'],
  'stairs-candle': ['The candle flickers toward the attic, like something up there is breathing in.'],
  'locked-attic': ['The attic door won\'t budge. Something huge and ghostly is holding it shut.'],
  'attic-sheet': ['Something huge under a dusty sheet. A thick cable snakes out from under it.', 'You hear a low hum. Kssshhh... It sounds like it\'s listening. Better not peek yet.'],
  'attic-cable': ['A thick black cable, humming with static. It runs from the sheet... into the wall. Into the arcade?'],
  'attic-window': ['From up here you can see the whole arcade, glowing in the dark.'],
  'attic-end': ['A note, scribbled in shaky handwriting: "IT HEARS EVERYTHING."', 'Under it, in the Conductor\'s neat hand: "Then let us give it something worth hearing."'],
  'practice-sign': ['PRACTICE HALL: these ghosts come back every visit. Practice makes permanent!'],
  'practice-window': ['Rain on the window, perfectly in time. Even the weather practices here.'],
};

/* CUTSCENES (engine/story.js plays them; A or a tap = next line, SKIP skips the whole scene).
   Each shot: {show: what's on screen, lines, name?/portrait? (who's talking), sfx?, music?, wait? (ms, no lines),
   title? (big words on screen)}. show: 'arcade' (the arcade after hours, you practicing) | 'glitch' (screens
   flickering) | 'drain' (the color draining into static) | 'pull' (the Ghost Notes cabinet pulling you in) |
   'party' (the manor celebrating) | 'crackle' (every speaker crackles) | 'mic' (the giant microphone) | 'black'.
   '@conductor ' / '@mezzo ' at the start of a line = that character says it. {you} = the student's instrument. */
window.QUEST_CUTSCENES = {
  intro: {music: 'quest-intro', shots: [
    {show: 'arcade', lines: ['The Band Arcade, after closing. The lights are low. The cabinets hum.',
      'Everyone else went home. You stayed late to practice your {you}.',
      'One more time from the top. Just you, your music and the glowing screens.']},
    {show: 'glitch', sfx: 'quest-static', lines: ['Then... kssshhh. The screens flicker. Every cabinet at once.',
      'A low electronic hum fills the room. It almost sounds like... listening.']},
    {show: 'drain', sfx: 'quest-mic-crackle', lines: ['The colors drain away into gray, crackling static.',
      'Somewhere inside the static, a voice whispers: "...so... much... noise..."']},
    {show: 'pull', sfx: 'quest-static', lines: ['The Ghost Notes cabinet glows bright. Its screen is pulling you in!',
      'Hold on to your {you}! WHOOOOSH!']},
  ]},
  ending: {music: 'quest-victory', shots: [
    {show: 'party', lines: ['The Ghost Conductor raises his baton... and the whole manor fills with music!',
      'Color floods back into every room. The candles glow gold again.']},
    {show: 'party', lines: ['@conductor Listen! My orchestra has its sound back! Bravo, {you}! BRAVO!',
      '@mezzo BRAVISSIMA! Encore! ENCORE! Darling, you did it!',
      'Every ghost you helped is dancing. Even Sir Reginald is awake. Mostly.']},
  ]},
  cliffhanger: {music: null, shots: [
    {show: 'crackle', sfx: 'quest-mic-crackle', lines: ['Then every speaker in the manor crackles at once. KSSSSHHHHH.',
      'The music stops. The ghosts freeze. Nobody breathes. (Ghosts don\'t, but still.)']},
    {show: 'mic', music: 'quest-cliffhanger', sfx: 'quest-mic-crackle', lines: ['"...still... so much... noise..."']},
    {show: 'black', wait: 900},
    {show: 'black', title: 'TO BE CONTINUED IN EPISODE 2', wait: 3500},
  ]},
};
window.QUEST_CUTSCENE_SPEAKERS = {conductor: {name: 'The Ghost Conductor', sprite: 'conductor'}, mezzo: {name: 'Madame Mezzo', sprite: 'npc-mezzo'}};

/* THE MICROPHONE'S WHISPERS: now and then while you explore the manor, the static crackles, a giant microphone
   shows in the windows for a moment, and one of these floats by. */
window.QUEST_WHISPERS = ['...so much noise...', '...too loud... too many notes...', '...kssshhh... listening...', '...why won\'t it stop...',
  '...every squeak... every crack...', '...nobody ever plays for me...'];

/* THE CREDITS (a short roll after the cliffhanger; SKIP or A skips it). {you} = the student's instrument. */
window.QUEST_CREDITS = [
  {h: 'Arcade Quest', lines: ['The Mysterious Microphone', 'Episode 1: Ghost Notes Manor']},
  {h: 'Created by', lines: ['Mr. Graham']},
  {h: 'Starring', lines: ['You, on {you}']},
  {h: 'Ghost Notes Manor', lines: ['Madame Mezzo', 'Rusty', 'Token Booth Terry', 'Loopy Lou', 'Sir Reginald Rest', 'Forgetful Fran', 'Tilly & Tally', 'The Butler', 'Dizzy Dot', 'Sous-Chef Sizzle']},
  {h: 'The ghosts', lines: ['Wisps, Squeakers, Hushes, Wobbles and Chatterboxes', 'The Phantom Fermata', 'The Ghost Conductor and his orchestra']},
  {h: 'Special cameo', lines: ['The Showtime Band: Tubby Tusk, Professor Hoot, Snapjaw Sal, Rico Bandit and Maestro Moose (from Showtime Malfunction)']},
  {h: 'And', lines: ['The Mysterious Microphone, who is still listening']},
  {h: 'Thank you for playing!', lines: ['Keep practicing. Every clean note counts.']},
];
