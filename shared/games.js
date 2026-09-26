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
                'classic' | 'haunted' | 'soundcheck' | 'storm' | 'dojo' | 'vault' | 'temple' | 'versus' | 'rink' | 'showtime' | 'speedway' | 'quest'   (drawn in shared/cabinets.js, SHAPES)
       trim     neon tube around the cabinet: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'white' | 'blue'
       trim2    second neon (screen glow, some buttons): same choices
       marquee  lettering on the lit marquee: 'bungee' | 'haunt' | 'pixel' | 'shade' | 'dojo' | 'heist' | 'scroll' | 'versus' | 'faceoff'  (styles in shared/cabinets.css)
       kicker   small line above the name on the marquee (optional)
       screen   the attract-mode loop on the screen: 'ghost' | 'tuner' | 'storm' | 'ninja' | 'heist' | 'scrolls' | 'versus' | 'hockey' | 'insert'  (shared/cabinets.js, SCREENS)
     player     optional: a game with its own fixed instrument group (e.g. 'bells'), or 'all' for a game that needs
                no instrument: START skips Select Player, the saved instrument is left alone, and progress is
                saved under that id. playerName: its label on the home page (leave out for none).
     badge      optional: {label, one, many}: the home page adds "<label>: n <one|many>", counting the keys of
                Arcade.store.gameData(id).badges (Ancient Ninja Scrolls: "Test Ready: 3 belts")
     noteModes  optional: true = a note-reading game with the NOTES × ORDER picker (shared/mode-picker.js): its stars are
                spread over 12 progress keys (Arcade.progressKeys), so the home page shows the all-modes total
                (Arcade.store.allStars) and "Modes played: n of 12"
     byMember   optional: true = progress is saved per instrument MEMBER (Button Masher: fingerings differ inside a
                group), under the saved player (Arcade.store.player); the hi-score reads that member
     players    optional: 2 = a two-player game (Neon Face-Off): START opens Select Player with &players=2, so Player 2
                picks too (or CPU); stored as Arcade.store.opponent, never replacing Player 1's instrument
     demoOnly   optional: true = only on the arcade floor with ?demo in the URL (a game still being built: Arcade Quest)
     unpitched  optional: true = an unpitched player (the Snare Drum, instruments.js `pitched: false`) can play it
                (Showtime Malfunction, the Note Checker's ARTICULATION test). Every other game sends a snare player to
                Select Player ("Snare drummers: try Showtime Malfunction!"); games with a fixed `player` are unaffected
     noPlay     optional: {groups, members, label, game}: students whose instrument is one of these see `label`
                as a link to `game` instead of a hi-score (Button Masher: percussion -> Chime Heist).
                + block: true = those instruments can't play it at all: the game sends them to Select Player, which
                dims their tiles and shows `label` with links to `games` (Sustain Speedway: bells and snare)
     cabinet3d  the same cabinet in the 3D arcade (arcade3d.js). Optional; leave it out and the game
               gets a 3D cabinet matching its 2D `cabinet` (profile from `shape`, colors from `trim`/`trim2`).
       profile  the side silhouette that is extruded into a 3D body, plus its topper:
                'classic' | 'haunted' (peaked roof) | 'soundcheck' (short, domed) | 'storm' (raked top, lightning fins) | 'dojo' (pagoda roof)
                | 'vault' (vault door) | 'temple' (temple gate) | 'versus' (wide, two players, a VS sign) | 'rink' (a glowing puck on top)
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
    unpitched: true,                     // the Snare Drum can use it (its ARTICULATION test)
    cabinet: {shape: 'soundcheck', trim: 'amber', trim2: 'green', marquee: 'pixel', kicker: 'Sound check', screen: 'tuner'},
    cabinet3d: {profile: 'soundcheck', body: 'cab-face'},
  },
  {
    id: 'ghost-notes',
    name: 'Ghost Notes',
    skill: 'Note reading',
    blurb: 'Read the note and play it. The note names fade away as you level up.',
    maxStars: 24,
    noteModes: true,
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
    noteModes: true,
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
    noteModes: true,
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
    noteModes: true,                                // NOTES × ORDER; its old FULL RANGE / CHROMATIC keys are kept (sequences.js)
    cabinet: {shape: 'vault', trim: 'green', trim2: 'red', marquee: 'heist', screen: 'heist'},
    cabinet3d: {profile: 'vault', body: 'cab-side'},
  },
  {
    id: 'ancient-ninja-scrolls',
    name: 'Ancient Ninja Scrolls',
    skill: 'Music vocabulary',
    blurb: 'Study the Band Ninja vocabulary scrolls for Ranks 3–10, then pass the practice Belt Exam. No instrument needed!',
    maxStars: 24,
    color: 'yellow',
    player: 'all',
    badge: {label: 'Test Ready', one: 'belt', many: 'belts'},
    cabinet: {shape: 'temple', trim: 'amber', trim2: 'red', marquee: 'scroll', screen: 'scrolls'},
    cabinet3d: {profile: 'temple', body: 'cab-side'},
  },
  {
    id: 'button-masher',
    name: 'Button Masher',
    skill: 'Fingerings',
    blurb: 'A note appears: press its fingering on your instrument like a special-move combo, then STRIKE! No mic needed!',
    maxStars: 24,
    color: 'pink',
    byMember: true,                                  // fingerings differ inside a group: stars are saved per instrument
    noPlay: {groups: ['bells'], label: 'Percussion: try Chime Heist!', game: 'chime-heist'},
    cabinet: {shape: 'versus', trim: 'red', trim2: 'blue', marquee: 'versus', kicker: '1P vs 2P', screen: 'versus'},
    cabinet3d: {profile: 'versus', body: 'cab-side'},
  },
  {
    id: 'neon-face-off',
    name: 'Neon Face-Off',
    skill: '2-Player duel',
    blurb: 'Air hockey with your instruments! Play your note to strike the puck back. Two players on one device, or you vs the CPU.',
    maxStars: 24,
    color: 'cyan',
    players: 2,                                      // Select Player asks Player 2 too (or CPU)
    byMember: true,                                  // CPU-ladder stars are saved under Player 1's instrument
    cabinet: {shape: 'rink', trim: 'cyan', trim2: 'pink', marquee: 'faceoff', kicker: '1P vs 2P', screen: 'hockey'},
    cabinet3d: {profile: 'rink', body: 'cab-side'},
  },
  {
    id: 'showtime-malfunction',
    name: 'Showtime Malfunction',
    skill: 'Articulation',
    blurb: "The arcade's old animatronic band has powered back on! Play each note as many times as its voice box shows, tonguing every one, to reboot them.",
    maxStars: 48,                                    // 8 showtimes × 3 on Normal + 8 × 3 on EXTRA SPOOKY (keys + ':extra')
    color: 'yellow',
    noteModes: true,                                 // NOTES × ORDER (the snare plays a single count mode)
    byMember: true,                                  // stars are saved per instrument member ('snare' included)
    unpitched: true,                                 // the Snare Drum plays it: count mode, any clean hit counts
    cabinet: {shape: 'showtime', trim: 'red', trim2: 'amber', marquee: 'showtime', kicker: 'The Showtime Band', screen: 'showtime'},
    cabinet3d: {profile: 'showtime', body: 'cab-side'},
  },
  {
    id: 'sustain-speedway',
    name: 'Sustain Speedway',
    skill: 'Long tones & tuning',
    blurb: 'Your instrument is the engine! Hold each lap\'s note in tune and steady to race; breathe in the pit stops.',
    maxStars: 24,
    color: 'pink',
    noteModes: true,                                 // NOTES × ORDER: one target note per lap
    byMember: true,                                  // stars (and ghost cars) are saved per instrument member
    // bells and snare can't hold a long tone: block: true sends them back to Select Player with this message
    noPlay: {groups: ['bells', 'snare'], label: 'Percussion: try Chime Heist or Showtime Malfunction!', game: 'chime-heist',
             games: ['chime-heist', 'showtime-malfunction'], block: true},
    cabinet: {shape: 'speedway', trim: 'pink', trim2: 'amber', marquee: 'speedway', kicker: 'Long tones', screen: 'speedway'},
    cabinet3d: {profile: 'speedway', body: 'cab-side'},
  },
  {
    id: 'arcade-quest',
    name: 'Arcade Quest',
    skill: 'RPG adventure',
    blurb: 'Arcade Quest: The Mysterious Microphone. An 8-bit adventure where your instrument calms the arcade\'s grumpy creatures. Coming soon!',
    maxStars: 0,                                     // no stars: the quest keeps its own save (level, tokens, band roster)
    color: 'cyan',
    unpitched: true,                                 // the Snare Drum plays too (rhythm, vocab and dodging challenges)
    demoOnly: true,                                  // hidden on the floor unless ?demo, until Episode 1 is finished
    cabinet: {shape: 'quest', trim: 'cyan', trim2: 'purple', marquee: 'quest', kicker: 'The Mysterious Microphone', screen: 'quest'},
    cabinet3d: {profile: 'quest', body: 'cab-side'},
  },
];
/* games still being built (demoOnly) stay off the floor unless the URL has ?demo. ALL_GAMES keeps every game, so a
   hidden game's own page, Select Player and requireInstrument still find it. */
window.Arcade.ALL_GAMES = window.Arcade.GAMES;
if (!/[?&]demo(=|&|$)/.test(location.search)) window.Arcade.GAMES = window.Arcade.GAMES.filter(g => !g.demoOnly);
