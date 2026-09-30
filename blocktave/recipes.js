/* BLOCKTAVE: THE ITEMS, THE RECIPES and THE CHAPTERS (Mat edits this file).

   THE ITEMS: id (never rename: saved worlds use it) → {name, kind, block?, tier?}
     kind  'material' (dropped when you lose all hearts: dropShare in rules.js) | 'block' (placeable, also dropped) |
           'tool' (a mallet: never dropped) | 'use' (eaten or used from the hotbar)
     block the block it places (world.js BLOCKS); tier: a tool's tier (rules.js tools) */
window.BT_ITEMS = {
  dirt:      {name: 'Dirt', kind: 'block', block: 'dirt'},
  sand:      {name: 'Sand', kind: 'block', block: 'sand'},
  leaves:    {name: 'Leaves', kind: 'block', block: 'leaves'},
  slate:     {name: 'Slate', kind: 'block', block: 'slate'},
  reed:      {name: 'Reed Cane', kind: 'material'},
  cork:      {name: 'Cork', kind: 'material'},
  felt:      {name: 'Pad Felt', kind: 'material'},
  maple:     {name: 'Maple', kind: 'material'},
  rawhide:   {name: 'Rawhide', kind: 'material'},
  tone:      {name: 'Tone Shard', kind: 'material'},
  brass:     {name: 'Brass', kind: 'material'},
  gem:       {name: 'Scale Gem', kind: 'material'},
  spring:    {name: 'Valve Spring', kind: 'material'},
  hum:       {name: 'Hum Crystal', kind: 'material'},
  rhythm:    {name: 'Rhythm Rock', kind: 'material'},
  rest:      {name: 'Rest Crystal', kind: 'material'},
  pearl:     {name: 'Pearl', kind: 'material'},
  dust:      {name: 'Pitch Dust', kind: 'material'},
  planks:    {name: 'Maple Planks', kind: 'block', block: 'planks'},
  panel:     {name: 'Soundproof Panel', kind: 'block', block: 'panel'},
  brick:     {name: 'Band Hall Brick', kind: 'block', block: 'brick'},
  stage:     {name: 'Stage Floor', kind: 'block', block: 'stage'},
  riser:     {name: 'Riser Steps', kind: 'block', block: 'riser'},
  door:      {name: 'Door', kind: 'block', block: 'door'},
  glass:     {name: 'Glass', kind: 'block', block: 'glass'},
  lamp:      {name: 'Stage Lamp', kind: 'block', block: 'lamp'},
  cot:       {name: 'Practice Cot', kind: 'block', block: 'cot'},
  locker:    {name: 'Band Locker', kind: 'block', block: 'locker'},
  stand:     {name: 'Music Stand', kind: 'block', block: 'stand'},
  metronome: {name: 'Metronome', kind: 'block', block: 'metronome'},
  tuner:     {name: 'Tuner', kind: 'block', block: 'tuner'},
  composer:  {name: 'Composer Block', kind: 'block', block: 'composer'},
  podium:    {name: "Conductor's Podium", kind: 'block', block: 'podium'},
  bench:     {name: "Luthier's Bench", kind: 'block', block: 'bench'},
  mallet1:   {name: 'Wooden Mallet', kind: 'tool', tier: 1},
  mallet2:   {name: 'Brass Mallet', kind: 'tool', tier: 2},
  mallet3:   {name: 'Silver Mallet', kind: 'tool', tier: 3},
  baton:     {name: 'Golden Baton', kind: 'tool', tier: 4},
  snack:     {name: 'Snack Bag', kind: 'use'},
};

/* THE RECIPES: a recipe is a MEASURE of up to 4 ingredients IN ORDER (like notes in a bar: the same ingredients in
   another order are not the recipe). Once they're in the slots, the recipe's PERFORMANCE makes the item.
     id      never rename (the Recipe Book remembers found recipes by it)
     name    what it makes, shown when the slots match
     in      the ingredients in order (item ids above)
     perf    the performance: 'note' (one note; TOUCH: tap its name) | 'notes3' (three notes) | 'beats' (4 steady quarter
             notes) | 'longtone' (a 4-second in-tune long tone; TOUCH: a key-signature question; Snare: an even roll) |
             'scale' (the Concert B♭ scale up; TOUCH: tap its notes in order; Snare: a rhythm)
     out     the item made, n how many
     bench   true = needs a Luthier's Bench nearby (rules.js benchRange)
   A recipe is FOUND (it shows in the Recipe Book) the first time you hold all its ingredients. */
window.BT_RECIPES = [
  // --- tools ---
  {id: 'wooden-mallet',  name: 'Wooden Mallet',       in: ['planks', 'planks', 'cork'],           perf: 'note',     out: 'mallet1', n: 1},
  {id: 'brass-mallet',   name: 'Brass Mallet',        in: ['planks', 'brass', 'brass'],           perf: 'notes3',   out: 'mallet2', n: 1},
  {id: 'silver-mallet',  name: 'Silver Mallet',       in: ['planks', 'spring', 'brass', 'gem'],   perf: 'scale',    out: 'mallet3', n: 1, bench: true},
  {id: 'golden-baton',   name: 'Golden Baton',        in: ['maple', 'hum', 'rest', 'gem'],        perf: 'longtone', out: 'baton',   n: 1, bench: true},
  // --- building ---
  {id: 'maple-planks',   name: 'Maple Planks',        in: ['maple'],                              perf: 'note',     out: 'planks',  n: 4},
  {id: 'soundproof',     name: 'Soundproof Panel',    in: ['felt', 'planks'],                     perf: 'note',     out: 'panel',   n: 4},
  {id: 'band-hall-brick', name: 'Band Hall Brick',    in: ['slate', 'sand'],                      perf: 'note',     out: 'brick',   n: 4},
  {id: 'stage-floor',    name: 'Stage Floor',         in: ['planks', 'planks', 'felt'],           perf: 'note',     out: 'stage',   n: 4},
  {id: 'riser-steps',    name: 'Riser Steps',         in: ['planks', 'planks'],                   perf: 'note',     out: 'riser',   n: 4},
  {id: 'door',           name: 'Door',                in: ['planks', 'planks', 'planks'],         perf: 'note',     out: 'door',    n: 1},
  {id: 'glass',          name: 'Glass',               in: ['sand', 'sand'],                       perf: 'note',     out: 'glass',   n: 2},
  // --- light ---
  {id: 'stage-lamp',     name: 'Stage Lamp',          in: ['dust', 'glass', 'planks'],            perf: 'note',     out: 'lamp',    n: 2},
  // --- survival ---
  {id: 'practice-cot',   name: 'Practice Cot',        in: ['felt', 'felt', 'planks'],             perf: 'note',     out: 'cot',     n: 1},
  {id: 'band-locker',    name: 'Band Locker',         in: ['planks', 'planks', 'brass', 'planks'], perf: 'notes3',  out: 'locker',  n: 1},
  {id: 'snack-bag',      name: 'Snack Bag',           in: ['leaves', 'reed'],                     perf: 'note',     out: 'snack',   n: 2},
  // --- gear ---
  {id: 'music-stand',    name: 'Music Stand',         in: ['brass', 'planks', 'brass'],           perf: 'scale',    out: 'stand',   n: 1},
  {id: 'metronome',      name: 'Metronome',           in: ['planks', 'spring', 'rhythm'],         perf: 'beats',    out: 'metronome', n: 1, bench: true},
  {id: 'tuner',          name: 'Tuner',               in: ['brass', 'gem', 'pearl'],              perf: 'longtone', out: 'tuner',   n: 1, bench: true},
  // --- music ---
  {id: 'composer-block', name: 'Composer Block',      in: ['planks', 'tone', 'tone'],             perf: 'note',     out: 'composer', n: 2, bench: true},
  {id: 'podium',         name: "Conductor's Podium",  in: ['planks', 'planks', 'brass', 'gem'],   perf: 'scale',    out: 'podium',  n: 1, bench: true},
  // --- the first bench is made by hand ---
  {id: 'luthiers-bench', name: "Luthier's Bench",     in: ['planks', 'planks', 'planks', 'cork'], perf: 'note',     out: 'bench',   n: 1},
];

/* THE CHAPTERS: 5 chapters × 3 MILESTONES = the game's 15 stars (games.js maxStars). Stars come ONLY from these,
   never from mining or building more. Saved as setLevel('blocktave', member, chapter, {stars}) (per instrument).
   Chapter numbers are levels: never reorder. Each milestone's `id` is saved: never rename.
     test  what completes it (game.js MILESTONE checks): see each line
     hint  the "How?" line the in-game goals panel shows under the current unfinished goal (optional) */
/* recipes the Recipe Book always shows (with their ingredients), found or not: the way to the first mallet and shelter */
window.BT_ALWAYS_SHOWN = ['maple-planks', 'wooden-mallet', 'door'];
window.BT_CHAPTERS = [
  {name: 'First Steps', goals: [
    {id: 'mallet',  text: 'Make a Wooden Mallet',
     hint: 'Tap a Maple Trunk to collect Maple → make Maple Planks → Planks, Planks, Cork in the Measure.'},
    {id: 'ore10',   text: 'Mine 10 Tone Ore',                             // rules.js goals.toneOre (Brass Ore counts)
     hint: 'Dig down near camp and look for glowing Tone Ore. Your Wooden Mallet mines it.'},
    {id: 'shelter', text: 'Build a shelter with a door',                  // an enclosed room (rules.js room)
     hint: 'Wall in a small space and put a Door in the wall.'}]},
  {name: 'First Night', goals: [
    {id: 'night',   text: 'Survive a night'},                             // dawn comes without losing all your hearts
    {id: 'lamp',    text: 'Place a Stage Lamp'},
    {id: 'clams',   text: 'Calm 5 Night Clams'}]},                        // rules.js goals.clams
  {name: 'Workshop', goals: [
    {id: 'bench',   text: "Place a Luthier's Bench"},
    {id: 'metro',   text: 'Make a Metronome'},
    {id: 'tuner',   text: 'Make a Tuner'}]},
  {name: 'Deep Notes', goals: [
    {id: 'deep',    text: 'Reach the Bass Depths or the Treble Peaks'},
    {id: 'sustain', text: 'Mine a Sustain Stone'},
    {id: 'wisps',   text: 'Dispel 3 Sour Wisps'}]},                       // rules.js goals.wisps
  {name: 'Encore', goals: [
    {id: 'hall',    text: 'Build the Band Hall'},                         // rules.js bandHall
    {id: 'row8',    text: 'Power a Composer row of 8 notes'},             // rules.js goals.row
    {id: 'baton',   text: 'Make the Golden Baton'}]},
];
