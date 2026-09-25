/* Band Arcade — the games on the arcade floor (the home page), in carousel order.
   To add a game: make a folder next to ghost-notes/, then add an entry here.
     id        folder name, also the key for saved progress
     name      shown on the cabinet's marquee and under the carousel
     skill     short tag ("Note reading")
     blurb     one or two plain sentences for students, shown under the carousel
     maxStars  total stars available per instrument (levels × 3), or 0 if the game has no stars
     color     the game's main neon: 'pink' | 'cyan' | 'yellow' (tokens in theme.css)
     cabinet   how its arcade cabinet looks. Every field is optional; leave `cabinet` out
               entirely and the game gets the plain 'classic' cabinet in its `color`.
       shape    silhouette (top, side panels, control-panel angle, coin door):
                'classic' | 'haunted' | 'soundcheck' | 'storm'   (drawn in shared/cabinets.js, SHAPES)
       trim     neon tube around the cabinet: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green'
       trim2    second neon (screen glow, some buttons): same choices
       marquee  lettering on the lit marquee: 'bungee' | 'haunt' | 'pixel' | 'shade'  (styles in shared/cabinets.css)
       kicker   small line above the name on the marquee (optional)
       screen   the attract-mode loop on the screen: 'ghost' | 'tuner' | 'storm' | 'insert'  (shared/cabinets.js, SCREENS)
   A brand-new look (a new shape or screen) is added in shared/cabinets.js and styled in
   shared/cabinets.css; see README.md "Adding a cabinet". */
window.Arcade = window.Arcade || {};
window.Arcade.ARCADE_NAME = 'Band Arcade';
window.Arcade.ARCADE_TAGLINE = 'Practice games that listen to you play.';
window.Arcade.GAMES = [
  {
    id: 'note-checker',
    name: 'Note Checker',
    skill: 'Start here',
    blurb: 'Play your five notes and watch each one light up. Tuning needle included.',
    maxStars: 0,
    color: 'cyan',
    cabinet: {shape: 'soundcheck', trim: 'amber', trim2: 'green', marquee: 'pixel', kicker: 'Sound check', screen: 'tuner'},
  },
  {
    id: 'ghost-notes',
    name: 'Ghost Notes',
    skill: 'Note reading',
    blurb: 'Read the note and play it. The note names fade away as you level up.',
    maxStars: 24,
    color: 'pink',
    cabinet: {shape: 'haunted', trim: 'purple', trim2: 'cyan', marquee: 'haunt', screen: 'ghost'},
  },
  {
    id: 'note-storm',
    name: 'Note Storm',
    skill: 'Speed reading',
    blurb: 'Notes march toward your robot. Read each one fast and play it to blast it.',
    maxStars: 24,
    color: 'yellow',
    cabinet: {shape: 'storm', trim: 'yellow', trim2: 'pink', marquee: 'shade', screen: 'storm'},
  },
];
