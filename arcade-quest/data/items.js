/* ARCADE QUEST: THE ITEMS. MAT: edit freely (an item's id is saved in students' bags, so don't rename one).
   effect: {heal: HP} | {shield: sour notes blocked on the next dodge} | {slow: 0–1, the next dodge's speed}
           | {boost: × damage of your next PLAY}
   keep: true = a key item: never used up, once per battle (the Conductor's Baton).
   price: Arcade Tokens at Rusty's shop (leave it out and the shop doesn't sell it). */
window.QUEST_ITEMS = {
  'valve-oil':   {name: 'Valve Oil',   desc: 'Heals 12 HP.',                                    effect: {heal: 12}, price: 15},
  'cork-grease': {name: 'Cork Grease', desc: 'A shield: the next 3 sour notes slide right off.', effect: {shield: 3}, price: 20},
  'metronome':   {name: 'Metronome',   desc: 'Slows the next dodge way down.',                  effect: {slow: 0.55}, price: 20},
  'snack':       {name: 'Band Snack',  desc: 'Heals 6 HP. Crunchy.',                            effect: {heal: 6}, price: 8},
  'tuning-slide': {name: 'Tuning Slide', desc: 'Your next PLAY hits 50% harder.',                  effect: {boost: 1.5}, price: 30},
  // keep: true = a key item, never used up: once per battle (the Ghost Conductor's gift)
  'baton':       {name: 'Conductor\'s Baton', desc: 'Once per battle: the next dodge moves at YOUR tempo (much slower).', effect: {slow: 0.5}, keep: true},
  // Episode 2: THE BIG NUMBER's gift (befriended). Not in the QUEST CODE's item list (QUEST_V1.items is frozen): a
  // restored code gets it back from the save repair (engine/save.js routes(): a befriended boss's `keep` item)
  'mic-stand':   {name: 'Golden Mic Stand', desc: 'Once per battle: step up to the mic. Your next PLAY rings out 25% stronger.', effect: {boost: 1.25}, keep: true},
};

/* ARCADE QUEST: THE MOVES (designed by a Raven Band student). A new move unlocks at each `level`; it shows in PLAY's
   menu (battle/battle.js) and can be used ONCE PER BATTLE. Each is a short musical challenge (battle/challenges.js
   Q.challenge.move) and hits like a PLAY (power × accuracy × speed, crits, charms, gear) × `mult`; your band plays
   along after it like after a PLAY. Nothing is saved: a move is yours once your level reaches it.
   kind: 'tap' = `taps` clean, separate attacks on concert B♭ (the Snare Drum: taps) · 'tone' = hold concert B♭ for
   `hold` seconds, full and steady (the Bells and the Snare: tap instead) · 'run' = the first five notes in order
   (`updown`: up AND back down), in `time` seconds (the Snare: `taps` strokes).
   MAT: TUNE every number (the student's flat 1 / 5 / 10 / 20 damage became shares of your power, and his levels
   5 / 10 / 15 / 20 became 3 / 5 / 8 / 10: students finish Episode 2 at about LV 7–11). Never rename an id. */
window.QUEST_MOVES = [
  {id: 'bop',    name: 'BOP ATTACK',    level: 3,  mult: 1.15, kind: 'tap',  taps: 3, time: 6},
  {id: 'blow',   name: 'STRONGER BLOW', level: 5,  mult: 1.3,  kind: 'tone', hold: 3, time: 9, taps: 4},
  {id: 'big',    name: 'BIG BLAST',     level: 8,  mult: 1.45, kind: 'run',  time: 10, taps: 5},
  {id: 'ultra',  name: 'ULTRA CANNON',  level: 10, mult: 1.6,  kind: 'run',  updown: true, time: 14, taps: 9},
];

/* ARCADE QUEST: THE CHARMS (power-ups). ARCADE QUEST ONLY: they change Quest battles and NOTHING else (stars in the
   practice games always show what a student can really play). Wear up to 2 at once: the Pause menu (B, Esc or PAUSE) → CHARMS.
   MAT: edit names, words, prices and strengths freely; never rename an id (saves and save codes use it) and add new
   charms at the end (the save code has room for 8: shared/backup.js QUEST_V2.charms).
   effect: {maxHp: +HP} | {calm: × CALM gained} | {dodge: × enemy note speed} | {block: hits blocked per battle}
           | {inTune: × damage, at: the accuracy (0–1) a PLAY needs for it} | {crit: a lucky crit's chance}
           | {toneCalm: × CALM gained from a LONG TONE (a PLAY or SERENADE that held a note)}
           | {rhythm: × the RHYTHM / TEMPO / ECHO timing windows (battle/challenges.js RHYTHM: 1.15 = 70 → 80 ms PERFECT)}
           | {tokens: × the Arcade Tokens a battle gives (battle.js rewards)}
           | {party: × the damage of your PLAY AND of every companion's hit (stacks with the Tuning Fork, a boost and
             critical hits, like they stack with each other)} | {quickPlay: true = QUICK PLAY in PLAY's menu (battle.js)}
   how you get it: price = Arcade Tokens at the Token Booth · found = '<room>' (a spot in the manor: the map's
   thing with charm: '<id>') · reward = '<enemy id>' (befriending that ghost) · from = how else, in words (the
   CHARMS panel says it: a lesson). A charm can have more than one. secret = what the CHARMS panel says instead of
   where it hides (the Hamburger Charm: an easter egg). icon = its picture, the sprite 'charm-<icon>' when one is drawn
   (sprites-stage.js; the CHARMS panel and the found message show it). */
window.QUEST_CHARMS = {
  'golden-mouthpiece': {name: 'Golden Mouthpiece', icon: 'mouthpiece', desc: '+8 max HP. Big sound, big lungs.', effect: {maxHp: 8}, price: 150},
  'lucky-reed':        {name: 'Lucky Reed', icon: 'reed', desc: 'CALM rises 30% faster.', effect: {calm: 1.3}, found: 'kitchen', price: 250},
  'metronome-charm':   {name: 'Metronome Charm', icon: 'metro', desc: 'Enemy notes move 15% slower when you dodge.', effect: {dodge: 0.85}, reward: 'fermata'},
  'silver-mute':       {name: 'Silver Mute', icon: 'mute', desc: 'Blocks the first sour note that hits you in each battle.', effect: {block: 1}, price: 200},
  'tuning-fork':       {name: 'Tuning Fork', icon: 'fork', desc: 'In-tune playing (90% or better) hits 25% harder.', effect: {inTune: 1.25, at: 0.9}, found: 'library'},
  // THE ALTERNATE ROUTE's treasure: only in the Hidden Passage (opened by DEFEATING the Phantom Fermata)
  'echo-chime':        {name: 'Echo Chime', icon: 'chime', desc: '+4 max HP, and CALM rises 15% faster. It rings with the old orchestra.', effect: {maxHp: 4, calm: 1.15}, found: 'passage'},
  // crit: a LUCKY CRIT's chance (battle.js RULES.critChance is 1 in 12 without it)
  'sharp-ear':         {name: 'Sharp Ear', icon: 'ear', desc: 'Critical hits come twice as often (1 in 6).', effect: {crit: 1 / 6}, price: 300},
  // EPISODE 2 (shared/backup.js QUEST_V6.charms): the Rosin Pouch hides in the Orchestra Pit's corner timpani; Snapjaw
  // Sal gives the Metronome Ticker for passing her rhythm lesson (engine/talk.js 'rhythm-lesson')
  'metronome-ticker':  {name: 'Metronome Ticker', icon: 'metro', desc: 'Rhythm, tempo and echo timing is a little more forgiving (15%).', effect: {rhythm: 1.15}, from: 'pass Snapjaw Sal\'s rhythm lesson'},
  'rosin-pouch':       {name: 'Rosin Pouch', icon: 'reed', desc: 'Long tones calm machines 30% faster.', effect: {toneCalm: 1.3}, found: 'pit'},
  // THE DEFEAT ROUTE's treasure (Episode 2, like the Echo Chime): only in the Vent, opened by powering Rico Bandit down
  'ricos-pick':        {name: 'Rico\'s Lucky Pick', icon: 'ear', desc: 'Battles give 50% more tokens. Rico swears it\'s lucky.', effect: {tokens: 1.5}, found: 'vent'},
  // EPISODE 2's HIDDEN EASTER EGG (designed by a Raven Band student): the Main Stage's bottom-left corner, no sparkle,
  // no sign. The 4th of QUEST_V6.charms' 6 places in the save code
  'hamburger':         {name: 'Hamburger Charm', icon: 'burger', desc: 'Your band hits twice as hard. Unlocks QUICK PLAY: 3 E♭s, 3 hits!', effect: {party: 2, quickPlay: true}, found: 'stage', secret: 'A secret somewhere on the Main Stage...'},
};

/* ARCADE QUEST: INSTRUMENT TIERS and UPGRADES (designed by a Raven Band student; Mr. Graham settled the open
   questions). ARCADE QUEST ONLY, like the charms: they change Quest battles and NOTHING else. engine/save.js Q.gear
   reads these two blocks; battle.js applies them. MAT: TUNE every number here (never rename an id: saves and save
   codes use them; add new ones at the end).
   THE TIERS: the student's own instrument gets better. Each is named after their REAL instrument ({you} = member.short:
   "Rusty Clarinet", "Metal Trumpet", "Diamond Snare"). The BEST tier you own is always the one used (no equip screen).
     dmg   share added to YOUR damage (PLAY, each QUICK PLAY hit, the B♭ Blast, the E♭ Encore). Never your band's.
     calm  share added to every CALM gain you cause (the Lucky Reed's hook, battle.js addCalm), never LISTEN's flat CALM.
           The student's wording for Metal, "+1 calm for every 5 calm", is exactly +20 % (calm: .2).
     price Arcade Tokens at Token Booth Terry or Ticket Booth Tina (the shared wallet); `free` = the story flag that
           gives it for nothing (no refund for a student who bought it first: the booth says so before they buy)
     found the room of its secret map `thing` ({gear: '<id>'}: data/maps/stage.js)
     locked shown as a "???" teaser, never owned (Q.gear.give refuses it)
   THE UPGRADES (Rusty's and Popcorn Pete's UPGRADES tab, paid in NOTE SHARDS): two tracks of `max` steps; step n
   costs costs[n - 1] Shards and gives n × `step`. An upgrade ADDS to the tier's share, then the sum multiplies like a
   charm (Metal + POWER UP 3 = +10 % + 12 % = × 1.22). No refunds, no resets.
   THE SHARDS: the FIRST time each enemy is helped (befriended or powered down) on a map: a regular one `enemy`, a
   mini-boss (`boss`: the Phantom Fermata, Rico Bandit) `boss`, a final boss (`final`: the Ghost Conductor, THE BIG
   NUMBER) `final`. Never again for the same enemy, never in the Test Arena or a practice room. Today's total: 18 + 3 + 5
   (Episode 1) + 20 + 3 + 5 (Episode 2) = 54 Shards; both tracks maxed = 2 × 26 = 52 (nearly everything). */
window.QUEST_INSTRUMENTS = {
  tiers: [
    {id: 'rusty',   name: 'Rusty {you}',       dmg: 0,   calm: 0,   badge: 'rust'},                         // you start with it
    {id: 'metal',   name: 'Metal {you}',       dmg: .10, calm: .20, badge: 'steel', price: 350, free: 'ep1Done'},   // MAT: TUNE
    {id: 'diamond', name: 'Diamond {you}',     dmg: .20, calm: .40, badge: 'diamond', found: 'balcony'},          // MAT: TUNE
    {id: 'perfect', name: 'The Perfect {you}', dmg: .30, calm: .80, locked: true},                                // not earnable yet
  ],
};
window.QUEST_UPGRADES = {
  max: 5,
  costs: [2, 3, 5, 7, 9],                                  // MAT: TUNE: Shards for steps 1–5 (26 a track, 52 for both)
  power: {step: .04},                                      // MAT: TUNE: POWER UP, + 4 % damage a step (5 = +20 %)
  calm: {step: .06},                                       // MAT: TUNE: CALM UP, + 6 % CALM a step (5 = +30 %)
  shards: {enemy: 1, boss: 3, final: 5},                   // MAT: TUNE: Shards the first time each enemy is helped
};
