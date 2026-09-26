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
                'classic' | 'haunted' | 'soundcheck' | 'storm' | 'dojo'   (drawn in shared/cabinets.js, SHAPES)
       trim     neon tube around the cabinet: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'white'
       trim2    second neon (screen glow, some buttons): same choices
       marquee  lettering on the lit marquee: 'bungee' | 'haunt' | 'pixel' | 'shade' | 'dojo'  (styles in shared/cabinets.css)
       kicker   small line above the name on the marquee (optional)
       screen   the attract-mode loop on the screen: 'ghost' | 'tuner' | 'storm' | 'ninja' | 'insert'  (shared/cabinets.js, SCREENS)
     player     optional: a game with its own fixed instrument group (e.g. 'bells'): START skips Select Player,
                the saved instrument is left alone, and progress is saved under that group. playerName: its label.
     modeKeys   optional: a game's own extra progress keys ('<id>:<key>') for the home page's "n started" note
     cabinet3d  the same cabinet in the 3D arcade (arcade3d.js). Optional; leave it out and the game
               gets a 3D cabinet matching its 2D `cabinet` (profile from `shape`, colors from `trim`/`trim2`).
       profile  the side silhouette that is extruded into a 3D body, plus its topper:
                'classic' | 'haunted' (peaked roof) | 'soundcheck' (short, domed) | 'storm' (raked top, lightning fins) | 'dojo' (pagoda roof)
                (drawn in arcade3d.js, PROFILES)
       trim, trim2  neon colors, as above (default: the 2D cabinet's)
       body     side-panel color: 'cab-side' | 'cab-face' | 'cab-panel' | 'floor-3' (theme.css tokens)
   A brand-new look (a new shape or screen) is added in shared/cabinets.js and styled in
   shared/cabinets.css; a new 3D profile goes in arcade3d.js. See README.md "Adding a cabinet". */
window.Arcade = window.Arcade || {};
window.Arcade.ARCADE_NAME = 'Band Arcade';
window.Arcade.ARCADE_TAGLINE = 'Practice games that listen to you play.';
window.Arcade.GAMES = [
  {
    id: 'note-checker',
    name: 'Note Checker',
    skill: 'Start here',
    blurb: 'Play a note and watch it light up. Tuning needle included.',
    maxStars: 0,
    color: 'cyan',
    cabinet: {shape: 'soundcheck', trim: 'amber', trim2: 'green', marquee: 'pixel', kicker: 'Sound check', screen: 'tuner'},
    cabinet3d: {profile: 'soundcheck', body: 'cab-face'},
  },
  {
    id: 'ghost-notes',
    name: 'Ghost Notes',
    skill: 'Note reading',
    blurb: 'Read the note and play it. The note names fade away as you level up.',
    maxStars: 24,
    color: 'pink',
    cabinet: {shape: 'haunted', trim: 'purple', trim2: 'cyan', marquee: 'haunt', screen: 'ghost'},
    cabinet3d: {profile: 'haunted', body: 'cab-side'},
  },
  {
    id: 'note-storm',
    name: 'Note Storm',
    skill: 'Speed reading',
    blurb: 'Notes march toward your robot. Read each one fast and play it to blast it.',
    maxStars: 24,
    color: 'yellow',
    cabinet: {shape: 'storm', trim: 'yellow', trim2: 'pink', marquee: 'shade', screen: 'storm'},
    cabinet3d: {profile: 'storm', body: 'cab-side'},
  },
  {
    id: 'note-ninja',
    name: 'Note Ninja',
    skill: 'Note names',
    blurb: 'A note appears on the scroll. Tap its name before time runs out. No instrument needed!',
    maxStars: 30,
    color: 'pink',
    cabinet: {shape: 'dojo', trim: 'red', trim2: 'white', marquee: 'dojo', screen: 'ninja'},
    cabinet3d: {profile: 'dojo', body: 'cab-side'},
  },
  {
    id: 'chime-heist',
    name: 'Chime Heist',
    skill: 'Mallet keyboard',
    blurb: 'Crack the vault codes: read each note and strike its bar on the chime lock. No mic needed!',
    maxStars: 24,
    color: 'cyan',
    player: 'bells', playerName: 'Bell Kit',        // always the bell kit: START skips Select Player
    modeKeys: ['full', 'scale-Bb', 'scale-Eb', 'scale-F', 'scale-Ab', 'chromatic'],   // its other modes, for the home page
    cabinet: {shape: 'vault', trim: 'green', trim2: 'red', marquee: 'heist', screen: 'heist'},
    cabinet3d: {profile: 'vault', body: 'cab-side'},
  },
];
