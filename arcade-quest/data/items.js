/* ARCADE QUEST: THE ITEMS. MAT: edit freely (an item's id is saved in students' bags, so don't rename one).
   effect: {heal: HP} | {shield: sour notes blocked on the next dodge} | {slow: 0–1, the next dodge's speed} */
window.QUEST_ITEMS = {
  'valve-oil':   {name: 'Valve Oil',   desc: 'Heals 12 HP.',                                    effect: {heal: 12}},
  'cork-grease': {name: 'Cork Grease', desc: 'A shield: the next 3 sour notes slide right off.', effect: {shield: 3}},
  'metronome':   {name: 'Metronome',   desc: 'Slows the next dodge way down.',                  effect: {slow: 0.55}},
  'snack':       {name: 'Band Snack',  desc: 'Heals 6 HP. Crunchy.',                            effect: {heal: 6}},
};
