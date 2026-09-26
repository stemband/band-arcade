/* Band Arcade: the 10 Band Ninja belts (ranks), in order. The one place their names and colors live.
   Used by Note Ninja (its belts/levels in note-ninja/levels.js match these by name) and
   Ancient Ninja Scrolls (ranks 3–10). Colors are the --belt-* tokens in shared/theme.css.
     rank     1–10, as on the Band Ninja tests
     name     the belt's name
     color    its theme token
     sparkle  the belt glints (Diamond) */
window.Arcade = window.Arcade || {};
window.Arcade.BELTS = [
  {rank: 1,  name: 'White',   color: 'belt-white'},
  {rank: 2,  name: 'Yellow',  color: 'belt-yellow'},
  {rank: 3,  name: 'Orange',  color: 'belt-orange'},
  {rank: 4,  name: 'Green',   color: 'belt-green'},
  {rank: 5,  name: 'Blue',    color: 'belt-blue'},
  {rank: 6,  name: 'Purple',  color: 'belt-purple'},
  {rank: 7,  name: 'Red',     color: 'belt-red'},
  {rank: 8,  name: 'Brown',   color: 'belt-brown'},
  {rank: 9,  name: 'Black',   color: 'belt-black'},
  {rank: 10, name: 'Diamond', color: 'belt-diamond', sparkle: true},
];
/** a belt by rank (1–10) or name ('Red') */
window.Arcade.belt = key => window.Arcade.BELTS.find(b => b.rank === key || b.name === key) || window.Arcade.BELTS[0];
