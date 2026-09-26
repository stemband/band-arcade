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
};

/* ARCADE QUEST: THE CHARMS (power-ups). ARCADE QUEST ONLY: they change Quest battles and NOTHING else (stars in the
   practice games always show what a student can really play). Wear up to 2 at once: Menu (B) → CHARMS.
   MAT: edit names, words, prices and strengths freely; never rename an id (saves and save codes use it) and add new
   charms at the end (the save code has room for 8: shared/backup.js QUEST_V2.charms).
   effect: {maxHp: +HP} | {calm: × CALM gained} | {dodge: × enemy note speed} | {block: hits blocked per battle}
           | {inTune: × damage, at: the accuracy (0–1) a PLAY needs for it}
   how you get it: price = Arcade Tokens at the Token Booth · found = '<room>' (a spot in the manor: the map's
   thing with charm: '<id>') · reward = '<enemy id>' (befriending that ghost). A charm can have more than one. */
window.QUEST_CHARMS = {
  'golden-mouthpiece': {name: 'Golden Mouthpiece', icon: 'mouthpiece', desc: '+8 max HP. Big sound, big lungs.', effect: {maxHp: 8}, price: 150},
  'lucky-reed':        {name: 'Lucky Reed', icon: 'reed', desc: 'CALM rises 30% faster.', effect: {calm: 1.3}, found: 'kitchen', price: 250},
  'metronome-charm':   {name: 'Metronome Charm', icon: 'metro', desc: 'Enemy notes move 15% slower when you dodge.', effect: {dodge: 0.85}, reward: 'fermata'},
  'silver-mute':       {name: 'Silver Mute', icon: 'mute', desc: 'Blocks the first sour note that hits you in each battle.', effect: {block: 1}, price: 200},
  'tuning-fork':       {name: 'Tuning Fork', icon: 'fork', desc: 'In-tune playing (90% or better) hits 25% harder.', effect: {inTune: 1.25, at: 0.9}, found: 'library'},
};
