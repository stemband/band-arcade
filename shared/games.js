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
                'classic' | 'haunted' | 'soundcheck' | 'storm' | 'dojo' | 'vault' | 'temple' | 'versus' | 'rink' | 'showtime' | 'speedway' | 'quest' | 'signal' | 'duel' | 'ink'   (drawn in shared/cabinets.js, SHAPES)
       trim     neon tube around the cabinet: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'white' | 'blue'
       trim2    second neon (screen glow, some buttons): same choices
       marquee  the TITLE's lettering on the lit marquee (its font; in 2D also the sign's frame): 'bungee' | 'haunt' | 'pixel' | 'shade'
                | 'dojo' | 'heist' | 'scroll' | 'versus' | 'faceoff' | 'showtime' | 'speedway' | 'quest' | 'signal' | 'duel' | 'ink'. The picture behind the
                title is the game's own `marquee` entry (below)
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
     zones      the lobby ZONES this game's cabinet stands in (ids from Arcade.ZONES below), e.g. ['technique-lab'].
                A game can be in more than one zone (Dojo Duel). A game with no zone still shows in ALL GAMES.
     fit        which instruments the game suits (the lobby dims it for the others, with `tag`, and opening it explains
                `why` with a button to switch instruments). Leave it out = every instrument. {only: [member ids]} or
                {not: [member ids]} (member ids from shared/instruments.js: 'bells', 'snare', 'trumpet'…), tag (a few
                words), why (one or two plain sentences). This only changes the lobby: the game's own page still
                checks the instrument itself (unpitched / noPlay below).
     tool       optional: true = not a cabinet (the Note Checker): the lobby's TUNE UP button opens it instead
     demoOnly   optional: true = only on the arcade floor with ?demo in the URL (a game still being built: Arcade Quest)
     unpitched  optional: true = an unpitched player (the Snare Drum, instruments.js `pitched: false`) can play it
                (Showtime Malfunction, the Note Checker's ARTICULATION test). Every other game sends a snare player to
                Select Player ("Snare drummers: try Showtime Malfunction!"); games with a fixed `player` are unaffected
     noPlay     optional: {groups, members, label, game}: students whose instrument is one of these see `label`
                as a link to `game` instead of a hi-score (Button Masher: percussion -> Chime Heist).
                + block: true = those instruments can't play it at all: the game sends them to Select Player, which
                dims their tiles and shows `label` with links to `games` (Sustain Speedway: bells and snare)
     marquee    the lit sign's themed, animated picture behind the title (shared/marquees.js draws it, for the 3D and
                2D cabinets and Select Player). Optional: leave it out for a moving gradient in the game's color with
                sparkles. {scene, colors, speed, still, every}:
       scene    'storm' | 'manor' | 'vu' | 'dojo' | 'vault' | 'scroll' | 'versus' | 'hockey' | 'curtain' | 'synthwave'
                | 'pixel' | 'radio' | 'duel' | 'ink' | 'sparkle' (the list of each scene's colors is in shared/marquees.js, SCENES)
       colors   theme tokens, in the scene's order (any left out use the scene's own)
       speed    1 = normal, 0.5 = half as fast · still: the moment shown as the still frame (seconds)
       every    storm only: seconds between lightning strikes (never under 1.2; one flash each, never a strobe)
       titleLayouts optional: the ways to break the title ([['ONE LINE'], ['TWO', 'LINES']]); left out = 1 line or
                2 stacked lines. EVERY marquee shows ONLY the game's name, as large as it fits without clipping: no
                subtitles, taglines or small text (2-player info goes on the lobby's cards, never on the sign)
                Your own picture: shared/marquees/<id>.png (behind the title) or <id>-full.png (the whole sign)
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
/* THE ZONES of the arcade lobby, in the order their neon signs appear. A game joins a zone with its `zones` list
   (below); a zone with no games is hidden.
     id       the zone's id (used in the address: index.html#zone=technique-lab); never rename one
     name     the sign's words
     color    the sign's neon: 'pink' | 'cyan' | 'yellow' | 'purple' | 'amber' | 'green' | 'red' | 'blue' | 'white'
     tagline  one short line under the name
     order    optional: game ids in the order the zone shows them (the first one is in front when the zone opens);
              games left out follow in games.js order */
window.Arcade.ZONES = [
  {id: 'note-reading',  name: 'Note Reading',     color: 'cyan',   tagline: 'Read it, play it, beat the clock.'},
  {id: 'ninja-dojo',    name: 'Band Ninja Dojo',  color: 'red',    tagline: 'Earn your belts: notes, words and duels.'},
  {id: 'technique-lab', name: 'Technique Lab',    color: 'yellow', tagline: 'Fingerings, tonguing, long tones and mallets.',
   // Showtime Malfunction first: every instrument can play it (Chime Heist, bells only, was in front for everyone)
   order: ['showtime-malfunction', 'button-masher', 'sustain-speedway', 'chime-heist']},
  {id: 'ear-training',  name: 'Ear Training',     color: 'green',  tagline: 'Listen closely, then play it back.'},
  {id: 'two-player',    name: '2-Player Corner',  color: 'pink',   tagline: 'Grab a friend and face off.'},
  {id: 'adventure',     name: 'Adventure',        color: 'purple', tagline: 'A story you play with your instrument.'},
];
window.Arcade.GAMES = [
  {
    id: 'note-checker',
    tool: true,                          // not a cabinet: the lobby's TUNE UP button opens it
    zones: [],
    name: 'Note Checker',
    skill: 'Start here',
    blurb: 'Play a note and watch it light up. Tuning needle included.',
    maxStars: 0,
    color: 'cyan',
    unpitched: true,                     // the Snare Drum can use it (its ARTICULATION test)
    marquee: {scene: 'vu', colors: ['green', 'amber', 'amber-hi']},
    cabinet: {shape: 'soundcheck', trim: 'amber', trim2: 'green', marquee: 'pixel', screen: 'tuner'},
    cabinet3d: {profile: 'soundcheck', body: 'cab-face'},
  },
  {
    id: 'ghost-notes',
    zones: ['note-reading'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Ghost Notes listens for the notes you play, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Ghost Notes',
    skill: 'Note reading',
    blurb: 'Read the note and play it. The note names fade away as you level up.',
    maxStars: 24,
    noteModes: true,
    color: 'pink',
    marquee: {scene: 'manor', colors: ['purple-ink', 'yellow', 'screen']},
    cabinet: {shape: 'haunted', trim: 'purple', trim2: 'cyan', marquee: 'haunt', screen: 'ghost'},
    cabinet3d: {profile: 'haunted', body: 'cab-side'},
  },
  {
    id: 'note-storm',
    zones: ['note-reading'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Note Storm listens for the notes you play, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Note Storm',
    skill: 'Speed reading',
    blurb: 'Notes march toward your robot. Read each one fast and play it to blast it.',
    maxStars: 24,
    noteModes: true,
    color: 'yellow',
    marquee: {scene: 'storm', colors: ['yellow-hi', 'purple-ink', 'purple-hi'], every: 3.2},
    cabinet: {shape: 'storm', trim: 'yellow', trim2: 'pink', marquee: 'shade', screen: 'storm'},
    cabinet3d: {profile: 'storm', body: 'cab-side'},
  },
  {
    id: 'note-ninja',
    zones: ['ninja-dojo'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Note Ninja shows the notes your instrument reads, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Note Ninja',
    skill: 'Note names',
    blurb: 'A note appears on the scroll. Tap its name before time runs out. No instrument needed!',
    maxStars: 30,
    noteModes: true,
    color: 'pink',
    marquee: {scene: 'dojo', colors: ['red', 'pink-hi', 'amber']},
    cabinet: {shape: 'dojo', trim: 'red', trim2: 'white', marquee: 'dojo', screen: 'ninja'},
    cabinet3d: {profile: 'dojo', body: 'cab-side'},
  },
  {
    id: 'vanishing-ink',
    zones: ['note-reading', 'ninja-dojo'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Vanishing Ink listens for the notes you play, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Vanishing Ink',
    skill: 'Reading in groups',
    blurb: 'Notes appear on the Ink Master\'s scroll, then the magic ink fades away. Play them back from memory!',
    maxStars: 24,
    color: 'pink',
    noteModes: true,                                 // NOTES × ORDER: the note set the scrolls are made from
    marquee: {scene: 'ink', colors: ['vi-paper', 'pink', 'dd-night']},
    cabinet: {shape: 'ink', trim: 'pink', trim2: 'amber', marquee: 'ink', screen: 'ink'},
    cabinet3d: {profile: 'ink', body: 'cab-side'},
  },
  {
    id: 'chime-heist',
    zones: ['technique-lab'],
    fit: {only: ['bells'], tag: 'Bells only', why: 'Chime Heist is played on the bell kit. Switch your instrument to Bells to play it.'},
    name: 'Chime Heist',
    skill: 'Mallet keyboard',
    blurb: 'Crack the vault codes: read each note and strike its bar on the chime lock. No mic needed!',
    maxStars: 24,
    color: 'cyan',
    player: 'bells', playerName: 'Bell Kit',        // always the bell kit: START skips Select Player
    noteModes: true,                                // NOTES × ORDER; its old FULL RANGE / CHROMATIC keys are kept (sequences.js)
    marquee: {scene: 'vault', colors: ['green', 'red', 'cyan']},
    cabinet: {shape: 'vault', trim: 'green', trim2: 'red', marquee: 'heist', screen: 'heist'},
    cabinet3d: {profile: 'vault', body: 'cab-side'},
  },
  {
    id: 'ancient-ninja-scrolls',
    zones: ['ninja-dojo'],
    name: 'Ancient Ninja Scrolls',
    skill: 'Music vocabulary',
    blurb: 'Study the Band Ninja vocabulary scrolls for Ranks 3–10, then pass the practice Belt Exam. No instrument needed!',
    maxStars: 24,
    color: 'yellow',
    player: 'all',
    badge: {label: 'Test Ready', one: 'belt', many: 'belts'},
    marquee: {scene: 'scroll', colors: ['temple-sky', 'amber']},
    cabinet: {shape: 'temple', trim: 'amber', trim2: 'red', marquee: 'scroll', screen: 'scrolls'},
    cabinet3d: {profile: 'temple', body: 'cab-side'},
  },
  {
    id: 'button-masher',
    zones: ['technique-lab'],
    fit: {not: ['bells', 'snare'], tag: 'Winds & brass only', why: 'Button Masher is about fingerings and slide positions, so it needs a woodwind or brass instrument. Percussion: try Chime Heist or Showtime Malfunction!'},
    name: 'Button Masher',
    skill: 'Fingerings',
    blurb: 'A note appears: press its fingering on your instrument like a special-move combo, then STRIKE! No mic needed!',
    maxStars: 24,
    color: 'pink',
    byMember: true,                                  // fingerings differ inside a group: stars are saved per instrument
    noPlay: {groups: ['bells'], label: 'Percussion: try Chime Heist!', game: 'chime-heist'},
    marquee: {scene: 'versus', colors: ['blue', 'red', 'yellow-hi']},
    cabinet: {shape: 'versus', trim: 'red', trim2: 'blue', marquee: 'versus', screen: 'versus'},
    cabinet3d: {profile: 'versus', body: 'cab-side'},
  },
  {
    id: 'neon-face-off',
    zones: ['two-player'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Neon Face-Off listens for the notes you play, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Neon Face-Off',
    skill: '2-Player duel',
    blurb: 'Air hockey with your instruments! Play your note to strike the puck back. Two players on one device, or you vs the CPU.',
    maxStars: 24,
    color: 'cyan',
    players: 2,                                      // Select Player asks Player 2 too (or CPU)
    byMember: true,                                  // CPU-ladder stars are saved under Player 1's instrument
    marquee: {scene: 'hockey', colors: ['cyan', 'pink', 'white-hi']},
    cabinet: {shape: 'rink', trim: 'cyan', trim2: 'pink', marquee: 'faceoff', screen: 'hockey'},
    cabinet3d: {profile: 'rink', body: 'cab-side'},
  },
  {
    id: 'showtime-malfunction',
    zones: ['technique-lab'],
    name: 'Showtime Malfunction',
    skill: 'Articulation',
    blurb: "The arcade's old animatronic band has powered back on! Play each note as many times as its voice box shows, tonguing every one, to reboot them.",
    maxStars: 48,                                    // 8 showtimes × 3 on Normal + 8 × 3 on NIGHTMARE (keys + ':extra')
    color: 'yellow',
    noteModes: true,                                 // NOTES × ORDER (the snare plays a single count mode)
    byMember: true,                                  // stars are saved per instrument member ('snare' included)
    unpitched: true,                                 // the Snare Drum plays it: count mode, any clean hit counts
    marquee: {scene: 'curtain', colors: ['red', 'amber-hi', 'anim-eye-bad']},
    cabinet: {shape: 'showtime', trim: 'red', trim2: 'amber', marquee: 'showtime', screen: 'showtime'},
    cabinet3d: {profile: 'showtime', body: 'cab-side'},
  },
  {
    id: 'sustain-speedway',
    zones: ['technique-lab'],
    fit: {not: ['bells', 'snare'], tag: 'Winds & brass only', why: 'In Sustain Speedway you hold long notes, so it needs a woodwind or brass instrument. Percussion: try Chime Heist or Showtime Malfunction!'},
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
    marquee: {scene: 'synthwave', colors: ['sw-grid', 'sw-sun-1', 'text-hi']},
    cabinet: {shape: 'speedway', trim: 'pink', trim2: 'amber', marquee: 'speedway', screen: 'speedway'},
    cabinet3d: {profile: 'speedway', body: 'cab-side'},
  },
  {
    id: 'lost-signal',
    zones: ['ear-training'],
    fit: {not: ['snare'], tag: 'Not for snare', why: 'Lost Signal listens for the notes you play, so it needs an instrument that plays pitches. Snare drummers: try Showtime Malfunction!'},
    name: 'Lost Signal',
    skill: 'Playing by ear',
    blurb: 'An alien probe is sending melodies across the galaxy. Listen to each transmission, then echo it back on your instrument to make contact.',
    maxStars: 24,
    color: 'cyan',
    noteModes: true,                                 // NOTES × ORDER: the note set the transmissions are made from
    marquee: {scene: 'radio', colors: ['ls-wave', 'green', 'text-hi']},
    cabinet: {shape: 'signal', trim: 'green', trim2: 'green', marquee: 'signal', screen: 'signal'},
    cabinet3d: {profile: 'signal', body: 'cab-side'},
  },
  {
    id: 'dojo-duel',
    zones: ['ninja-dojo', 'two-player'],
    name: 'Dojo Duel',
    skill: '2-Player duel',
    blurb: 'Two ninjas, one screen! A note appears for each of you: the first to tap its name wins the point. Or duel the Sensei. No instrument needed!',
    maxStars: 0,                                     // no stars: a friendly duel (a win count per player name, below)
    color: 'pink',
    player: 'all',                                   // no instrument: START goes straight to the game
    players: 2,                                      // a 2-player game (like Neon Face-Off): both choose on its own setup screen
    // the floor's line instead of a hi-score: the dojo record on this device
    summary: store => { const r = (store.gameData('dojo-duel') || {}).record || {}, n = Object.values(r).reduce((a, b) => a + b, 0);
      return n ? `Dojo record: ${n} ${n === 1 ? 'duel' : 'duels'} won on this device` : ''; },
    marquee: {scene: 'duel', colors: ['temple-sky', 'belt-red', 'amber']},
    cabinet: {shape: 'duel', trim: 'pink', trim2: 'amber', marquee: 'duel', screen: 'duel'},
    cabinet3d: {profile: 'duel', body: 'cab-side'},
  },
  {
    id: 'arcade-quest',
    zones: ['adventure'],
    name: 'Arcade Quest',
    skill: 'RPG adventure',
    blurb: 'The Mysterious Microphone, Episode 1: Ghost Notes Manor. An 8-bit adventure: play your instrument to calm the manor\'s grumpy ghosts and win them over to your band.',
    maxStars: 0,                                     // no stars: the quest keeps its own save (level, tokens, band roster)
    color: 'cyan',
    unpitched: true,                                 // the Snare Drum plays too (rhythm, vocab and dodging challenges)
    // the floor's line instead of a hi-score: "Episode 1: 60% · 7 friends" (arcade-quest/engine/save.js keeps it up to date)
    summary: store => { const s = (store.gameData('arcade-quest') || {}).save, p = s && s.progress;
      return p ? `Episode 1: ${p.pct}% · ${p.friends} ${p.friends === 1 ? 'friend' : 'friends'}` : ''; },
    marquee: {scene: 'pixel', colors: ['purple-ink', 'purple', 'cyan-hi']},
    cabinet: {shape: 'quest', trim: 'cyan', trim2: 'purple', marquee: 'quest', screen: 'quest'},
    cabinet3d: {profile: 'quest', body: 'cab-side'},
  },
];
/* games still being built (demoOnly) stay off the floor unless the URL has ?demo. ALL_GAMES keeps every game, so a
   hidden game's own page, Select Player and requireInstrument still find it. */
window.Arcade.ALL_GAMES = window.Arcade.GAMES;
if (!/[?&]demo(=|&|$)/.test(location.search)) window.Arcade.GAMES = window.Arcade.GAMES.filter(g => !g.demoOnly);
