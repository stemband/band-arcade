/* BLOCKTAVE: THE ITEMS, THE RECIPES and THE CHAPTERS (Mat edits this file).

   THE ITEMS: id (never rename: saved worlds use it) → {name, kind, block?, tier?, desc, found?}
     kind  'material' (dropped when you lose all hearts: dropShare in rules.js) | 'block' (placeable, also dropped) |
           'tool' (a mallet: never dropped) | 'use' (eaten or used from the hotbar)
     hotbar true = a tool that lives in the HOTBAR (the Neon Torch: it lights the dark while it's in any hotbar slot)
     block the block it places (world.js BLOCKS); tier: a tool's tier (rules.js tools)
     desc  the tooltip's one line (hover, focus or a long-press on any item: written for 6th graders)
     found materials: where to find it (the tooltip's "Found: …"); a tool's tooltip lists what it can mine by itself */
window.BT_ITEMS = {
  dirt:      {name: 'Dirt', kind: 'block', block: 'dirt', desc: 'Plain dirt. Good for quick walls, steps and filling holes.', found: 'Under the Glow Moss, everywhere'},
  sand:      {name: 'Sand', kind: 'block', block: 'sand', desc: 'Soft and sandy. Two make Glass, and it goes into Band Hall Bricks.', found: 'The sandy banks by the marsh pools'},
  leaves:    {name: 'Leaves', kind: 'block', block: 'leaves', desc: 'A handful of leaves. Mixed with Reed Cane they make a Snack Bag.', found: 'The tops of Maple and Cork trees'},
  slate:     {name: 'Slate', kind: 'block', block: 'slate', desc: 'Hard gray stone. With Sand it makes Band Hall Bricks.', found: 'Underground everywhere (it needs a Wooden Mallet)'},
  reed:      {name: 'Reed Cane', kind: 'material', desc: 'Springy cane, like a reed for a clarinet or a sax. Goes into Snack Bags.', found: 'Reed Cane plants by the water in the Reed Marsh'},
  cork:      {name: 'Cork', kind: 'material', desc: 'Bark from Cork Trunks in the Reed Marsh. Used in mallets and the Luthier\'s Bench.', found: 'Cork Trunks in the Reed Marsh'},
  felt:      {name: 'Pad Felt', kind: 'material', desc: 'Soft pad felt, like the pads on a woodwind\'s keys. Used for Soundproof Panels, Stage Floor and the Practice Cot.', found: 'Purple felt patches on the ground in the Reed Marsh'},
  maple:     {name: 'Maple', kind: 'material', desc: 'A piece of maple wood. Make it into Maple Planks to build almost anything.', found: 'Maple Trunks in all three lands'},
  rawhide:   {name: 'Rawhide', kind: 'material', desc: 'Tough skin like a drum head. Keep it in your Band Locker.', found: 'Rawhide Brush in Percussion Canyon'},
  tone:      {name: 'Tone Shard', kind: 'material', desc: 'A glowing shard that hums. Two make Composer Blocks.', found: 'Tone Ore, a little way underground (play its note)'},
  brass:     {name: 'Brass', kind: 'material', desc: 'Shiny brass, like a trumpet\'s. Used in the Brass Mallet, the Music Stand and the Tuner.', found: 'Brass Ore in the Brass Mountains (play its note)'},
  gem:       {name: 'Scale Gem', kind: 'material', desc: 'A gem shaped like a scale going up. Used for the best tools and the Podium.', found: 'Scale Veins deep underground (play a scale)'},
  spring:    {name: 'Valve Spring', kind: 'material', desc: 'A tiny valve spring. Goes into the Silver Mallet and the Metronome.', found: 'Spring Veins in the Brass Mountains, and Rushers you calm'},
  hum:       {name: 'Hum Crystal', kind: 'material', desc: 'A crystal that keeps humming a long tone. Part of the Golden Baton.', found: 'Sustain Stones, deep down or high up (hold a long tone)'},
  rhythm:    {name: 'Rhythm Rock', kind: 'material', desc: 'A rock that keeps a steady beat. Part of the Metronome.', found: 'Rhythm Rock in Percussion Canyon (play its rhythm)'},
  rest:      {name: 'Rest Crystal', kind: 'material', desc: 'A crystal of perfect silence. Part of the Golden Baton.', found: 'Rest Crystals deep down (stay silent on the rests)'},
  pearl:     {name: 'Pearl', kind: 'material', desc: 'A shiny pearl from a calm Night Clam. Part of the Tuner.', found: 'Night Clams you calm with your music'},
  dust:      {name: 'Pitch Dust', kind: 'material', desc: 'Sparkly dust from a Sour Wisp that got in tune. Stage Lamps need it.', found: 'Sour Wisps you dispel with a steady note'},
  planks:    {name: 'Maple Planks', kind: 'block', block: 'planks', desc: 'Flat maple boards: the main building block. Mallets, doors and benches start here.'},
  panel:     {name: 'Soundproof Panel', kind: 'block', block: 'panel', desc: 'A soft panel that soaks up sound. Great for practice room walls.'},
  brick:     {name: 'Band Hall Brick', kind: 'block', block: 'brick', desc: 'A strong red brick. Build the Band Hall\'s walls with these.'},
  stage:     {name: 'Stage Floor', kind: 'block', block: 'stage', desc: 'A shiny black stage floor. The Band Hall stands on it.'},
  riser:     {name: 'Riser Steps', kind: 'block', block: 'riser', desc: 'Steps like a band\'s risers. Hold JUMP to climb them.'},
  door:      {name: 'Door', kind: 'block', block: 'door', desc: 'A door 2 blocks tall. Tap it in BUILD mode to open or close it. A room with a door is a shelter!'},
  glass:     {name: 'Glass', kind: 'block', block: 'glass', desc: 'A clear window block. Light comes in, creatures don\'t.'},
  lamp:      {name: 'Stage Lamp', kind: 'block', block: 'lamp', desc: 'A stage lamp. Nothing spooky appears in its light.'},
  cot:       {name: 'Practice Cot', kind: 'block', block: 'cot', desc: 'A practice cot. Tap it in BUILD mode: you wake up here, and at night you can sleep till morning.'},
  locker:    {name: 'Band Locker', kind: 'block', block: 'locker', desc: 'A band locker for storing your things. Tap it in BUILD mode to open it.'},
  stand:     {name: 'Music Stand', kind: 'block', block: 'stand', desc: 'A music stand. The Band Hall needs one inside.'},
  metronome: {name: 'Metronome', kind: 'block', block: 'metronome', desc: 'A metronome. Creatures near it slow down to its steady beat.'},
  tuner:     {name: 'Tuner', kind: 'block', block: 'tuner', desc: 'A tuner. Sour Wisps can\'t come close to it.'},
  composer:  {name: 'Composer Block', kind: 'block', block: 'composer', desc: 'Write your own melody: put up to 8 in a row and tap each one in BUILD mode to pick its note.'},
  podium:    {name: "Conductor's Podium", kind: 'block', block: 'podium', desc: 'A conductor\'s podium. Put it at the end of a Composer row and perform the melody to power it.'},
  bench:     {name: "Luthier's Bench", kind: 'block', block: 'bench', desc: 'A luthier\'s workbench. Better recipes need one close by.'},
  mallet1:   {name: 'Wooden Mallet', kind: 'tool', tier: 1, desc: 'Your first mallet, made of wood. Taps out Tone Ore, Slate and more.'},
  mallet2:   {name: 'Brass Mallet', kind: 'tool', tier: 2, desc: 'A brass mallet. Tone Ore asks only ONE note with it, and it opens Scale Veins.'},
  mallet3:   {name: 'Silver Mallet', kind: 'tool', tier: 3, desc: 'A silver mallet. It opens Sustain Stones and Rest Crystals.'},
  baton:     {name: 'Golden Baton', kind: 'tool', tier: 4, desc: 'The Golden Baton: the best tool. It mines everything, and long tones and rolls get shorter.'},
  torch:     {name: 'Neon Torch', kind: 'tool', tier: 0, hotbar: true, desc: 'A glowing neon tube on a handle. Keep it in your hotbar and it lights the dark around you, at night and underground.'},
  snack:     {name: 'Snack Bag', kind: 'use', desc: 'A bag of snacks. Tap its hotbar slot twice to eat it and get hearts back.'},
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
  // --- added later (append only: never reorder) ---
  {id: 'neon-torch',     name: 'Neon Torch',          in: ['planks', 'tone'],                     perf: 'note',     out: 'torch',   n: 1},
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
