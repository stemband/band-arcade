# Band Arcade

Practice games for beginning band that listen through the device microphone. Built for school iPads (Safari) and Chromebooks (Chrome), for practice-room and home use.

**Play it at [https://bandarcade.org](https://bandarcade.org).** (The old address, `stemband.github.io/band-arcade/`,
now forwards there.)

**Progress is saved per web address.** Stars, avatars and settings live in the browser under the address the arcade was
opened from, so `bandarcade.org`, a copy on your own computer and any other address each start with their own
progress. To move a student's progress from one address (or device) to another, make an **Arcade Backup Code** on the
old one (BACKUP / RESTORE in the arcade floor's speaker panel or under the Select Player card) and restore it on the
new one.

## Automatic tests

Every pull request shows a check: a green ✓ means all tests passed; a red ✗ means something broke. Open 'Details' to see which test failed and its screenshot. Don't merge a red ✗; paste the failure into Claude Code and ask it to fix it.

(What the tests do: they open every page of the arcade in Chrome and in Safari's engine at iPad and Chromebook sizes,
play Level 1 of every game in demo mode, check the pitch detector with made-up instrument sounds, check that nothing
is sent anywhere except the leaderboard, and check that a Backup Code brings everything back. Details:
`tests/README.md`. The screenshots are in the "test-report-chromium" or "test-report-webkit" download at the bottom of a failed run's Summary page.)

## What's in here

```
index.html            The arcade (home page): PRESS START, the ZONE LOBBY, each zone's cabinets, ALL GAMES, the FULL ARCADE
arcade.css / .js      The arcade's look and behavior (the page's views and addresses, a zone's carousel, swipe, keys)
lobby.js              The zone lobby's neon signs, CONTINUE and ASSIGNED cards, and the ALL GAMES grid (flat, no 3D)
arcade3d.js           The 3D arcade floor (three.js): cabinets built in code, glossy floor, haze
shared/vendor/        three.js r149 (three.min.js) and its MIT license. Loaded only by the home page
select-player/        "Select Your Player": a view on the arcade floor page (player.js, style.css); its old address redirects
sound-board/          The Sound Board: plays every sound and shows which are your files (for Mat; not linked from the arcade)
shared/               The engine every game uses
  instruments.js      Instrument groups, transpositions, first five notes, each group's instruments with
                      their full chromatic ranges, and groupFor(): instrument -> group (single source of truth)
  portraits.js        The instrument portraits: Mat's artwork from portraits/, with the neon SVG line art
                      (drawn in code) as the automatic fallback
  portraits/          Mat's portrait images, one per instrument (see portraits/README.md)
  skins.js            Unlockable portrait skins: the list, how each is earned, accessory positions
  avatar-parts.js     Create Your Player: every avatar part (skin tones, faces, hair, head coverings, clothes, extras) as pixel maps
  avatar-names.js     Create Your Player: the name builder's word lists (titles, adjectives, nouns) — edit freely
  avatar.js           Draws and saves the avatar: the portrait bust (screens) and the full-body sprite (Arcade Quest)
  avatar-bg.js        Avatar backgrounds, and the one loop that animates the biggest avatar on screen
  avatar-fx.js        Avatar effects (floating notes, sparkles, aura, snow…) and animated items' frames
  avatar-creator.js   The Create Your Player screen (+ avatar.css)
  avatar-code.js      The avatar code (Share to Band Ninja / Load avatar code): the format table and the panels
  bandninja.js        The optional Band Ninja connection: link settings, instrument names, belt reward codes
  countdown.js        The shared countdown (3-2-1, quick, READY-GO) for Dojo Duel and Neon Face-Off
  pitch.js            Microphone + pitch detection (YIN), "note held" events, demo keys
  mic-gate.js         The "Turn on the microphone" prompt and fix-it messages
  ui.js               Staff notation (whole staff or single notes), ghost mascot, stars, top bar
  storage.js          Saved instrument, mic sensitivity, and progress (on this device only)
  scales.js           The GMEA scales (Concert B♭, E♭, F, A♭, Chromatic) for every instrument, and the starting-note table
  sequences.js        The notes of every level in the note-reading games (NOTES × ORDER), and their progress keys
  mode-picker.js      The NOTES × ORDER picker those games show on their level screen
  patterns.js         The pattern generator (short melodies: steps, then skips) for Lost Signal and Vanishing Ink
  echo.js             The echo flow for Lost Signal and Vanishing Ink: answer slots filled note by note, results on the staff
  games.js            The list of games and the lobby's ZONES, which zone(s) each game is in, which instruments it
                      suits, and how each cabinet looks
  featured.js         The ASSIGNED game (edit it by hand: see "The zone lobby" below)
  belts.js            The 10 Band Ninja belts (names and colors), shared by Note Ninja and Ancient Ninja Scrolls
  sounds.js           THE SOUND LIST: every sound event, its file name, volume and rules (see sounds/README.md)
  sounds/             Mat's recorded sounds (.m4a / .mp3), and the list of file names to use (README.md)
  sfx.js              Plays every sound: your files, else the built-in sounds; volumes; mutes the mic while sounds play
  counting.js         MR. GRAHAM'S COUNTING (1 & 2 &, 1 e & a, 1 la le, 6/8…): rhythms as text, the counting of each note
  rhythm-staff.js     Draws a rhythm on a one-line percussion staff with the counting underneath (true superscripts)
  onsets.js           Hears claps and drum hits (sharp onsets, never pitch) from the same microphone as pitch.js
  calibration.js      The audio clock (what the student hears, when) and the timing check's math (Music Highway, Rhythm Dojo)
  cabinets.js / .css  The arcade cabinets (drawn in SVG + HTML, no images) and their attract-mode screens
  theme.css           Colors, type, buttons, overlays shared by every page
  fonts.css + fonts/  Fonts bundled with the site (no outside font service needed)
note-checker/         Shared tuner-style checker (every game links to it): FIRST 5 NOTES or FULL RANGE
ghost-notes/          Game 1: note reading with fading note names
  levels.js           Level design: counts, time per note, how visible the names are
  game.js             Game logic
note-storm/           Game 2: speed reading; notes march toward Tempo the robot, play each one to blast it
  levels.js           Level design: counts, march speed, notes on screen at once, names on or off
  game.js             Game logic (the staff is drawn once; only the notes move)
note-ninja/           Game 3: note names, no microphone; tap the name of the note on the scroll
  levels.js           The 10 Band Ninja belts (White … Diamond): notes, time, letter guides, read-ahead
chime-heist/          Game 4: mallet keyboard for percussion, no microphone; strike the bar on an on-screen bell kit
  levels.js           The vaults (Lemonade Stand Lockbox … The Golden Vault): notes, time, labels, read-ahead, alarm
  game.js             Game logic: the bell kit, the vault code, the alarm meter
ancient-ninja-scrolls/ Game 5: Band Ninja music vocabulary (Ranks 3–10), no instrument, no microphone
  vocab.js            THE Band Ninja vocabulary tests: word banks, pass rules, all 120 items. Edit here
  game.js             Train, Spar, Belt Exam, Scroll Review, the scroll rack and the Sensei
neon-face-off/        Game 7: two-player air hockey played with instruments (or you vs the CPU ladder)
  levels.js           The 8 CPU rivals (Rookie Robo … The Champ), difficulties and rules (power, speed, sounds)
  game.js             The match: turns, the microphone rules, the canvas table, results
button-masher/        Game 6: fingerings and slide positions, no microphone; a versus fighting game
  levels.js           The 8 rivals (Squeaky Reed … The Conductor): note pools, notes per match, time, rival health
  game.js             Game logic: the match, the rivals and the fighter, the CHART view
                      (THE fingering table is shared/fingerings.js, the diagrams shared/diagrams.js + diagrams.css:
                      Button Masher, Arcade Quest and Music Highway all use them. Fix fingerings there)
showtime-malfunction/ Game 8: articulation. Play each note N separate times (tongued or struck) to reboot animatronics
  levels.js           The 8 showtimes (The 5:00 Show … The Midnight Encore): counts, lanes, speed, the boss. Edit here
  characters.js       THE SHOWTIME BAND, drawn in SVG: Tubby Tusk, Professor Hoot, Snapjaw Sal, Rico Bandit, Maestro Moose
  game.js             The show: the lanes, voice boxes, spotlights, the stage band, snare mode, results
sustain-speedway/     Game 9: long tones and tuning. Your instrument is the engine: hold each lap's note in tune and steady to race
  levels.js           The 8 tracks (Downtown Loop … The Grand Prix): laps, lap length, rivals, and HOW SPEED WORKS. Edit here
  game.js             The race: the speed model, the canvas road, the tuning speedometer, pit stops, rivals, ghost car, results
keys-to-the-city/     Piano keys and the staff in a neon city: find keys, name them, place notes, build scales (touch or mic)
  levels.js           THE CITY MAP (9 districts), rules, Night Shift (endless). Edit here; never reorder (stars = district number)
  quiz.js             The music model (spelling, key signatures) and the round maker
  game.js             The skyline keyboard, the Chopsticks and Fork signs, the staff, the Mayor, instrument mode, results
rhythm-dojo/          Rhythm reading: read the rhythm and Mr. Graham's counting, then tap it, clap it or play it on a snare
  levels.js           The 11 levels (the rhythms each round is built from), judging windows, stars, the Dojo Marathon. Edit here
  game.js             Hear it, perform (count-in, playhead, pulse light), judging, the colored feedback, timing check, marathon
  examples.js         The Counting Board's 49 examples (each with the counting it must show: the tests check them)
  counting.html       THE COUNTING BOARD (not linked for students): every case of the counting, drawn on the staff
music-highway/        Play-along rhythm game: your fingerings fly down a neon highway with the band; play each note on the line
  songs.js            THE SONG LIST (23 songs in 3 tiers, as concert scale degrees in B♭ or E♭). Edit here; never reorder (stars = song number)
  song-map.js         Songs -> each instrument's written notes, octave, chords · settings.js: judging windows, stars, volumes
  backing.js          The generated drums (and the headphones-mode band), on the audio clock
  game.js             The highway, the judge, calibration, the headphones check, results, PRACTICE THIS PART
  songs.html          The Song Board: every song on a staff (concert + any instrument) with ▶ PLAY
  README.md           The song format (and notes for a future MIDI importer)
lost-signal/          Pitch memory: an alien probe plays a melody, echo it back on your instrument
  levels.js           The 8 levels, rules, the pattern weights and Deep Space Scan (endless). Edit here
vanishing-ink/        Reading memory: notes appear on the Ink Master's scroll, the ink fades, play them back from memory
  levels.js           The 8 levels (First Stroke … Invisible Master), rules, the pattern weights and Endless Scroll. Edit here
  game.js             The round (brush in, study, fade/vanish, answer, results), the Ink Master, reveals, Endless Scroll
arcade-quest/         Arcade Quest: The Mysterious Microphone (Episode 1: Ghost Notes Manor)
  sprites.js          THE PIXEL ART: every enemy as a small pixel map + palette (theme tokens); the instruments the
                      hero holds are in shared/instrument-sprites.js. Edit here
  sprites-manor.js    Ghost Notes Manor's art: map tiles, the manor's ghosts (NPCs), Episode 1's enemies and the mini-boss
  engine/             core.js (screen, loop, scenes), input.js (keys, taps, touch pad), sprites.js (drawing, PNG hook,
                      player builder), text.js (text box, menus), save.js (save slot + settings)
                      world.js (the overworld: rooms, walking, doors, wandering ghosts), talk.js (conversations,
                      signs, Save Jukebox, Token Booth, shop, pause menu)
  data/               enemies.js, items.js, battle-text.js (every enemy, item and battle message: edit freely)
  data/dialogue.js    EVERY LINE the manor's ghosts say, and every sign. Rewrite anything
  data/maps/manor.js  Ghost Notes Manor's rooms as tile maps (readable rows of letters), with doors, ghosts and signs
  battle/             challenges.js (PLAY, LONG TONE, ARTICULATE, VOCAB, FINGERING, HARMONIZE), dodge.js, battle.js
  scenes.js / main.js The title screen (Continue, New game) and the test arena; start-up
  art/                (optional) your own PNGs: art/<sprite id>.png replaces a drawn sprite (sheet layouts: art/README.md)
  sprite-review.js    index.html?sprites: your avatar with every instrument, in every pose and frame, to check the art
```

No build step and no installs. It's plain HTML, CSS and JavaScript, so any static web host can serve it.

## How students move through it

0. **PRESS START:** the first time the arcade opens in a visit, a neon attract screen says PRESS START; any tap or key lets you in, and the lobby sound starts right away (browsers only allow sound after a tap, so this is that tap). Coming back from a game in the same visit skips it.
1. **Select Your Instrument** comes next (once per visit, and whenever the device has no instrument yet): **Continue as …** is one tap. The player chip in the top bar opens it again any time.
2. **The zone lobby** (`index.html`): one neon sign per zone (see *The zone lobby* below). Tap a sign to walk into that zone: its cabinets in the carousel (◀ ▶ buttons, a swipe, the ←/→ keys, or the lights). **START** opens the game straight away with the saved instrument. **← LOBBY** (or the browser's Back, or the iPad's back-swipe) goes back. **ALL GAMES** shows every game as a card; **FULL ARCADE** walks the whole arcade (every cabinet in one carousel); **TUNE UP** opens the Note Checker.
2b. **Select Your Player for one game** (`index.html?game=<game-id>`, on the same page, so its music starts at once; the old `select-player/index.html?game=<game-id>` addresses still work; the browser's Back button returns to the cabinets) opens for a two-player game (Neon Face-Off: Player 2 picks there too), when no instrument is saved yet, or from a game's instrument chip: a fighting-game character select. Sixteen portraits, one per instrument (woodwinds on the top row, brass and percussion below, including the **Snare Drum**), tinted by section (woodwinds magenta, brass amber, percussion cyan). Tap one to see it big with its player card (name, key and clef, first five notes, stars on this device; Horn also has **Starting notes: F–C / C–G**), then tap it again or press **SELECT**. On a Chromebook the arrow keys move and Enter selects. A flash, **PLAYER 1 READY**, and the game starts. If this device already has a player, **Continue as …** (with its portrait) comes first.
   The big preview shows **the student's own avatar** (see *Create Your Player*) with the instrument as a badge, and **EDIT PLAYER** opens Create Your Player. The first time a device reaches Select Player it asks **"Create your player?"** once (MAYBE LATER keeps the random look it was given).
3. **The game.** The instrument name in the top bar opens Select Player again (to switch instruments); **← Arcade** goes back to the zone you came from (or ALL GAMES, or the lobby), with that game's cabinet in front.

Opening a game with no instrument saved sends the student to Select Player for that game.

## The zone lobby

After PRESS START and the instrument, students land in the **zone lobby**: a dark arcade wall with a glowing neon sign for each zone. Each sign shows the zone's name, a short line, little outlines of its cabinets and the student's stars there (for the instrument they chose). Tapping a sign walks into that zone: the same 3D cabinets as always, but only that zone's games. A game can be in two zones (Dojo Duel is in the Band Ninja Dojo and the 2-Player Corner; Vanishing Ink is in Note Reading and the Band Ninja Dojo).

| Zone | Games |
|---|---|
| Note Reading | Ghost Notes, Note Storm, Vanishing Ink |
| Band Ninja Dojo | Note Ninja, Vanishing Ink, Ancient Ninja Scrolls, Dojo Duel |
| Technique Lab | Chime Heist, Button Masher, Showtime Malfunction, Sustain Speedway |
| Ear Training | Lost Signal |
| 2-Player Corner | Neon Face-Off, Dojo Duel |
| Adventure | Arcade Quest |

- **CONTINUE** (top of the lobby): the last game opened on this device, one tap to play it again.
- **ALL GAMES** (in the top bar everywhere): every game once, as a card with its marquee, its zone(s), the stars for the current instrument, and a 2P badge for two-player games.
- **TUNE UP** (in the top bar everywhere): the Note Checker. It isn't a cabinet any more; the games' own links to it still work.
- **FULL ARCADE** (in the top bar next to ALL GAMES): every game's cabinet in one carousel, zone by zone in the lobby's order (a game in two zones stands only once, in its first zone), with a small zone-color sign under each cabinet so students learn where games live. Below it, a strip of every game's marquee, grouped by zone: tap one and the carousel spins straight there. It opens on the ASSIGNED game, else the last game played on this device, else the first. Link to it with `index.html#full-arcade`.
- **Addresses:** each view has its own address, so the browser's Back button and the iPad's back-swipe work, and you can share a zone: `index.html#zone=technique-lab`, `index.html#all-games`, `index.html#full-arcade`. (`?demo` stays on.)
- **The zones themselves** (names, colors, taglines, order) are the `ZONES` list near the top of `shared/games.js`; a game joins zones with its `zones: [...]` line. A zone with no games hides itself. A zone's `order` line picks which cabinet is in front when it opens (Technique Lab opens on Showtime Malfunction, which every instrument can play).
- **Two-cabinet zones** (2-Player Corner) are a straight row: the arrows go back and forth between the two (no wrapping around), and the arrow at an end rests.

### The ASSIGNED game (change it yourself)

Open `shared/featured.js` and edit this one line:

```js
window.Arcade.FEATURED = {game: 'lost-signal', note: 'Practice this week!', until: '2026-10-09'};
```

- **game**: the game's folder name, in quotes (`'note-storm'`, `'ghost-notes'`, `'sustain-speedway'`…). The list is in the comment at the top of that file.
- **note**: what students read on the card (keep it short).
- **until** (optional): the last day it shows, as year-month-day. The day after, it disappears by itself. Leave it out to keep it up until you change it.
- **To turn it off**, write `game: null` (no quotes around null).

While it's on, the lobby shows a glowing **ASSIGNED** card at the top with your note, and the game gets an ASSIGNED badge on its cabinet, its zone's sign and its ALL GAMES card. Save the file (upload it to GitHub); students see it the next time the arcade opens.

### Which instruments a game suits

A game that doesn't work for the student's instrument stays visible but dimmed, with a short tag; opening it explains why and offers **Switch instrument**. These are the `fit` lines in `shared/games.js`:

| Game | Suits | Tag |
|---|---|---|
| Ghost Notes, Note Storm, Note Ninja, Neon Face-Off, Lost Signal, Vanishing Ink | every instrument except Snare Drum | Not for snare |
| Chime Heist | Bells only | Bells only |
| Button Masher, Sustain Speedway | woodwinds and brass (not Bells or Snare Drum) | Winds & brass only |
| Ancient Ninja Scrolls, Showtime Malfunction, Dojo Duel, Arcade Quest | every instrument | — |

## Endless mode (Note Storm and Note Ninja)

Under the levels (or belts) of both games there is an **∞ ENDLESS** card. It's always open, uses whatever notes and
order are picked above it, and plays until your 3 hearts are gone while the speed keeps rising. It gives no stars.

- **The speed** (shown as SPEED in the top bar, with a short "SPEED UP!" at each step) starts slower than Level 1 / the
  White belt. It climbs fast at first, then more slowly, but it never stops. Note Storm: the notes march faster and more
  of them come at once, up to 5. Note Ninja: less time per note, read-ahead up to 4 notes, and the whole note set.
- **Hearts:** Note Storm loses one when a note reaches Tempo (a wrong note only breaks the combo, because the mic can
  mishear). Note Ninja loses one for a wrong answer or running out of time.
- **Score:** points per note × the combo (×2 at 10 in a row, ×3 at 25, ×4 at 50), worth more the faster it goes.
- **Top 5:** each instrument and note set has its own Top 5 on the device (the avatar's name and the date), shown on the
  card and on the GAME OVER panel. They're part of the Arcade Backup Code. `?demo` runs are never saved.
- **Tuning:** every number is in one commented block at the bottom of `note-storm/levels.js` (`STORM_ENDLESS`) and
  `note-ninja/levels.js` (`NINJA_ENDLESS`). The shared parts live in `shared/endless.js`.

## Lost Signal

A **pitch memory** game in deep space. An alien probe plays a short melody (a *transmission*); the student echoes it back
on their instrument, note by note, in order. It's the one game that plays pitched tones, so it takes turns: the
microphone is switched off while a transmission plays and listens again only once the last tone has faded.

- **A transmission:** INCOMING TRANSMISSION (the tones play, the radar pings each note) → YOUR TURN · ECHO THE SIGNAL
  (a row of signal slots; each note played fills the next one, right or wrong; 6 s per note) → the result on the staff in
  the student's written pitch: right notes gold, wrong notes coral with "you played D", missed notes in a dotted box.
  **Replay signal** (limited, costs a little) before answering; **Hear it again** after (free).
- **Notes:** from the note set picked above the levels (First 5, a scale or Chromatic), played in a comfortable register
  (concert G3–G5, the whole pattern moved by octaves, so a tuba player hears it higher; the octave doesn't matter when
  answering). *Scale Order* keeps every transmission stepwise.
- **Levels:** First Contact, Moon Relay, Asteroid Belt, Ringed Giant, Static Storm, Nebula, Deep Space, The Source.
  From Static Storm the first note's name is hidden by static; in Static Storm and Nebula the student first *finds* it
  by ear. Stars: 70% of notes = 1, 85% = 2, every note with no replays = 3. Clearing The Source ends the story.
- **Deep Space Scan** (the ENDLESS card): the same signal comes back each round with one new note on the end; 3 hearts,
  no replays; Top 5 per instrument and note set on the device.
- **Signal check:** the first visit plays a test tone and asks "Can you hear the signal?" (turn the volume up!).
- **Tuning:** every number is in `lost-signal/levels.js` (levels, rules, the pattern generator's weights, Deep Space Scan).
- **Shared with Vanishing Ink:** the pattern generator (`shared/patterns.js`) and the echo flow (the slots, how a note
  counts, the result on the staff: `shared/echo.js`). A fix there reaches both games.

## Vanishing Ink

A **reading-memory** game in the Band Ninja dojo: the next step after Ghost Notes. A short line of notes is brushed
onto the Ink Master's scroll; the magic ink fades away; the student plays the notes back, in order, from memory. It
trains reading notes in groups and seeing the shape of a melody (steps, skips, repeated notes).

- **A round:** STUDY THE SCROLL (the notes brush in left to right, then stay for the level's study time; a thin line with
  an ink drop shows the time left) → the ink **fades** (all notes together, over the last part of the study time) or
  **vanishes** (all at once, in a puff of ink) → PLAY IT FROM MEMORY (empty ink circles, one per note; each note played
  fills the next one, right or wrong; 6 s per note) → the ink comes back on the scroll: right notes gold, wrong notes
  coral with "you played D", missed notes coral in a dotted box, and "4 of 5 notes remembered".
- **Read, don't play yet:** the microphone listens while the ink shows, but nothing counts; playing brings up
  "READ, DON'T PLAY YET". The answer starts fresh the moment the ink is gone.
- **Reveal scroll** (before the first note, limited per level, costs 15% of that round's points): the ink shows again
  for 1.5 s.
- **Notes:** from the note set picked above the levels (First 5, a scale or Chromatic), in the student's written pitch and
  clef, as plain quarter notes; any octave counts. *Scale Order* keeps every scroll stepwise.
- **Levels** (6 scrolls each; 70% of notes = 1 star, 85% = 2, every note with no reveals = 3; a star opens the next):

  | # | Name | Notes | Moves | Study | Ink | Reveals |
  |---|---|---|---|---|---|---|
  | 1 | First Stroke | 2 | steps | 5 s | fades | 2 |
  | 2 | Wet Ink | 3 | steps | 5 s | fades | 2 |
  | 3 | Brush Skips | 3 | small skips (3rds) | 4 s | fades | 2 |
  | 4 | Quick Brush | 4 | small skips | 4 s | fades | 1 |
  | 5 | Fading Fast | 4 | steps and skips (up to a 4th) | 3 s | fades faster | 1 |
  | 6 | Vanishing Point | 5 | steps and skips | 3 s | vanishes | 1 |
  | 7 | Shadow Ink | 5 | larger skips (up to a 5th) | 2 s | vanishes | 0 |
  | 8 | Invisible Master | 6 | the whole note set, repeated notes | 1.5 s | vanishes | 0 |

- **Endless Scroll** (the ENDLESS card): starts with 2 notes; each perfect round the SAME scroll comes back with one new
  note on the end. Study time = 2.5 s + 0.5 s a note, a little shorter every round (never under 1 s + 0.3 s a note).
  The ink fades for the first 5 rounds, then vanishes. 3 lives: a round with any wrong or missed note costs one and the
  same scroll comes back. GAME OVER shows the longest scroll, the score and the rounds survived; Top 5 per instrument
  and note set on the device.
- **Sounds:** every one is unpitched (brush swishes, puffs, clicks); the menu music plays only on the level screens.
- **Tuning:** every number is in `vanishing-ink/levels.js` (levels, rules, the pattern weights, Endless Scroll).

## Dojo Duel

A **two-player note-reading race** on one iPad or Chromebook, in a neon night dojo. No microphone and no instrument
needed. Each player gets their own half of the screen with their own note and their own answer buttons (the same
♭ ♮ ♯ + A–G layout as Note Ninja); the first to tap the right name wins the point.

- **Setup:** 2 PLAYERS or SOLO VS. SENSEI (Easy about 3 s, Medium about 2 s, Hard about 1.3 s); first to 7, 10 or 15;
  TABLETOP (the iPad lies flat between the players, the far half turned to face them) or SIDE BY SIDE. Each player picks
  a look (Player 2 is a guest avatar), a name (Player 1 / Player 2, or their avatar's name), a clef, a note set and a
  **belt**: any Note Ninja belt they've earned on this device. The belt is a handicap: White gets the first three notes
  and letter guides, higher belts get the whole set with no guides. **Countdown:** QUICK (a fast 3-2-1, the default),
  CLASSIC (one second a number) or OFF (a short pause), remembered on the device.
- **A point:** a 3-2-1 over both staffs (the buttons rest, a little dimmed), then both notes appear at the same instant
  and the buttons wake up. The first note of a match always gets a slow 3-2-1 and BEGIN!, and so does the note after
  someone reaches MATCH POINT. A wrong tap makes you dizzy for 1 second. Then a **result moment** (1.5 s): the winner's
  half glows in their belt color, their ninja does a playful strike, "+1" flies to their score, and BOTH sides see the
  right answer (the name next to the note, the right button glowing, a wrong tap still coral: "You tapped G. It's E.").
  Nobody right in 6 seconds, or both wrong: "Too slow, ninjas!", no point. The winning point goes to the victory screen.
  With QUICK, a note comes about every 3 seconds.
- **Results** face each player: accuracy, average answer time and "Practice these" (the notes they missed or were
  slowest on). No stars; the device keeps a **dojo record** of wins for each player name (in the Arcade Backup Code).
- **Keyboards:** Player 1 Q–U = A–G (A = ♭, S = ♯); Player 2 1–7 = A–G (8 = ♭, 9 = ♯).
- **Tuning:** `dojo-duel/levels.js`: `DUEL_PACING` at the top holds every timing (countdown steps, the result moment,
  stun, the 6 s per note), then the rules, the Sensei's speed and lines.

## Note Ninja

A note-reading game that **doesn't use the microphone**, so students can play it anywhere, even without their instrument. A note appears on a lit scroll in a neon dojo; they tap its name. Correct answers make the ninja strike the practice target; a wrong answer makes it stumble.

- **Answering:** seven big letter buttons A–G. Above them, **♭ ♮ ♯** work like a Shift key: tap ♭, the letters change to A♭ B♭ …, tap the letter, and it goes back to ♮. The ♭ ♮ ♯ row only appears when the notes include sharps or flats. On a Chromebook: keys **A–G** answer, **1 / 2 / 3** pick ♭ / ♮ / ♯.
- **The right answer is the real name of the note, key signature included.** In F major a B on the staff is B♭. In chromatic, the spelling shown counts: C♯ is not D♭.
- **Belts** are the levels, the 10 Band Ninja ranks in `note-ninja/levels.js`, one line each: White, Yellow, Orange, Green, Blue, Purple, Red, Brown, Black, Diamond. Change the numbers or colors freely (colors are the `--belt-…` tokens in `shared/theme.css`). Stars are saved by belt number, so reordering or removing belts would move students' stars.
  - White: the first three notes, 8 notes, 10 s each, faint letter guides on the staff lines and spaces. Yellow: all five notes, fainter guides. Orange: no guides. Green: 12 notes, less time.
  - Blue and up are **read ahead**, answered left to right: Blue 2 notes at once, Purple 3, Red 3 and faster, Brown 4, Black 20 notes with 4 at once.
  - **Diamond:** 24 notes, 4 at once, fastest, and the letter buttons no longer change to A♭ B♭ … when ♭ or ♯ is tapped, so students have to know the note without the hint. The Diamond belt glints (not under reduced motion).
  - Earlier versions had 8 belts. The first time a device loads this version, saved stars on the old Brown (7) and Black (8) move to the new Brown (8) and Black (9) in every mode and for every instrument; Red (7) and Diamond (10) start empty. A belt that has stars always stays playable, so those students can still play Brown and Black. This runs once (`migrated` in the saved data).
- **Scoring:** points for each note, a speed bonus, and a **combo** multiplier (×2 at 5 in a row, up to ×4) that resets on a mistake or a timeout. A wrong answer is a mistake and the note stays; running out of time is a miss, shows the name, and moves on. Stars: 3 = no mistakes and no misses, 2 = 90%, 1 = 80% (clears the belt and unlocks the next).
- Every NOTES × ORDER combination works like the other games (see "Notes and order"); in a scale the right name follows the key signature, in Random and Scale Order alike.
- In `?demo` all belts are unlocked and the answer shows in small text under the buttons.

## Chime Heist

A **mallet keyboard** game for percussionists, and it **doesn't use the microphone**. A note of the vault code appears on the security terminal; the student strikes the matching bar on the chime lock, an on-screen bell kit (Orchestral Bells, written G3–C6). Every bar rings at its real pitch, two octaves above written, like real bells.

- **Always the Bell Kit.** START on the arcade floor goes straight into the game (no Select Player), and it never changes the instrument saved for the other games.
- **The bell kit:** natural bars on the lower row, sharps/flats raised above in groups of 2 and 3, bars shorter as the pitch goes up. Tap, click or use a pen; two fingers can strike at once. On a Chromebook: **← →** move the mallet, **↑ ↓** switch rows, **Enter** or **Space** strikes. On a phone held upright it asks you to turn it sideways.
- **Modes:** NOTES × ORDER like the other games: First 5 (B♭ C D E♭ F), Concert B♭ / E♭ / F / A♭, or Chromatic (the whole kit, G3–C6), in Random or Scale Order. The old FULL RANGE mode is Chromatic + Random.
- **Rules:** only the exact bar counts, octave included ("Right note, wrong octave!" is a mistake). In scales the key signature counts: a B in F major is the B♭ bar. A wrong bar still rings, sets off the alarm, and the note stays. Running out of time: a guard's flashlight sweeps by, the right bar lights up, and the code moves on.
- **Alarm meter** instead of lives: each mistake or miss fills one segment. Full = "CAUGHT! The alarm went off." and the vault isn't cleared. The **silent streak** multiplies points (×2 at 5 in a row, up to ×4).
- **Vaults** (levels) are in `chime-heist/levels.js`, one line each: notes, seconds per note, bar labels (`all`, `faded`, `c` for C bars only, `none`), notes on the terminal at once (read ahead from the Museum Diamond Vault on), alarm segments, and the treasure behind the door. Stars: 3 = no mistakes and no misses, 2 = 90%, 1 = 80% without setting off the alarm (unlocks the next vault).
- Progress: the keys in "Notes and order", all under the `bells` player; its older keys stay (`chime-heist:full` = Chromatic + Random, `chime-heist:chromatic` = Chromatic + Scale Order).
- In `?demo` all vaults are unlocked and the right bar has a faint dashed outline.

## Ancient Ninja Scrolls

The official Band Ninja **music vocabulary** trainer for Ranks 3–10 (Orange through Diamond), using the real vocabulary tests. It needs **no instrument and no microphone**: START on the arcade floor goes straight in (no Select Player), and the instrument saved for the other games is never changed.

The temple has one chamber per belt, each lit in its belt color. Every term is a secret scroll: answer it right 3 times (in any mode, across sessions) and it unrolls onto that belt's **scroll rack**; scrolls not yet mastered stay rolled with their names hidden. Every belt is open.

- **Train:** four choices from the belt's word bank. Every other question flips: the term is shown and the student picks the matching sentence (or, for symbols, the name or the symbol). A miss shows the right answer and a one-line reminder, and that item comes back a few questions later until it's answered right twice. Stars per belt: 1 = round complete, 2 = 90%+ right the first time, 3 = all 15 scrolls mastered.
- **Spar:** 60 seconds of rapid-fire questions from one belt, with a combo multiplier (×2 at 5 in a row, up to ×4) and a best score per belt.
- **Belt Exam:** a replica of the paper test. All 15 items on one page with the word bank at the top: tap a word, then a blank (or a blank, then a word); each word is used once and grays out; tap a filled blank to clear it. Symbol items (fermata, repeat sign, measure repeat, accent) are "tap the correct symbol". SUBMIT asks first, then marks each item right or wrong with the answer. Pass rules: Orange 100%, Green miss 2 or fewer, Blue–Diamond miss 3 or fewer. Passing earns the belt's **TEST READY** badge from the Sensei: "You're ready to take your real Rank X test in person!" The best result is kept.
- **Scroll Review:** 15 mixed questions from every belt with at least one mastered scroll, weighted toward the terms missed most.
- Keys **1–4** pick an answer; Enter goes on after a miss. In `?demo` the right answer has a faint dashed outline, and the exam shows each answer in small text.
- The home page shows Train stars (out of 24) and "Test Ready: n belts".

**Editing the tests (`ancient-ninja-scrolls/vocab.js`):** `VOCAB_BANKS` are the word banks in the order printed on each test; `VOCAB_PASS` is how many items each rank may miss; `VOCAB` has one line per item: `id` (a short name that never changes, since saved progress uses it), `rank`, `prompt` (exactly as on the test, with `___` where the blank goes), `answer` (spelled exactly like its bank word, accents included: Più, L'istesso), and `type` (`'word'` or `'symbol'`; symbol answers are `'treble-clef'`, `'bass-clef'`, `'fermata'`, `'repeat'`, `'measure-repeat'`, `'accent'`). `show` draws a symbol with the prompt; `tip` overrides the reminder shown after a miss. `SCROLL_RULES` at the bottom sets how many right answers master a scroll, Spar's length and so on.

Saved: Train stars as the usual progress (`ancient-ninja-scrolls`, player `all`, belts 1–8 = Orange–Diamond); mastered terms, misses, Spar bests, exam results and TEST READY badges in their own object, `gameData['ancient-ninja-scrolls']`.

## Button Masher

A **fingering and slide-position trainer** dressed as a neon versus fighting game, and it **doesn't use the microphone**. A note appears on the staff between the student's fighter and a rival. The student builds the note's fingering on a diagram of their own instrument (the "special move combo") and hits **STRIKE!** A correct combo fires an energy blast and drains the rival's health; a wrong one lets the rival land a harmless cartoon "boing" counter that drains the student's energy.

- **Which instrument.** It uses the player chosen on Select Player. Stars are saved **per instrument**, because a trumpet and a clarinet finger differently. Bells get "Percussion: try Chime Heist!" with a link, on the arcade floor and in the game.
- **The diagrams.** Every key, valve and slide position is a real button: tap to press it (filled = pressed), tap again to let go. The oboe's and bassoon's first key cycles open → half-hole → closed. **CLEAR** resets, **STRIKE!** checks it. Trombone: tapping a slide position strikes right away. The **COMBO** bar shows what's pressed as fighting-game input icons. Woodwind diagrams need a phone turned sideways; brass and trombone fit a phone upright.
- **Keyboard (Chromebooks):** brass **1–4** press valves (horn: **T** or **4** is the thumb trigger), trombone **1–7** pick a position, **Enter** = STRIKE!, **Backspace** = CLEAR. Woodwind keys are tap/click (Tab and Space also work).
- **Rivals** (levels, `button-masher/levels.js`): Squeaky Reed (first three notes, note name shown, the right keys glow faintly after 5 s), Captain Clef (first five, name shown), Tempo Tornado (Concert B♭ scale), Sir Sharp (E♭), Lady Flat (F), Dr. Dissonance (A♭), The Metronome (all four scales mixed) and The Conductor (all four, fastest, most health). Scale levels show the key signature and use the same octave as the scales in every other game. Notes come in random order, never the same note twice in a row. Each line of the table sets the note pool, notes per match, seconds per note and rival health. **Woodwinds get 1.5× the time per note** (they have many more keys to find than brass valves or a slide): Squeaky Reed 22.5 s instead of 15, The Conductor 9 s instead of 6. The rival cards show each instrument's own time. Change it with `timeByFamily` in `MASHER_RULES` (bottom of `levels.js`).
- **Rules:** a wrong combo costs energy, the right keys glow green for a moment, and the same note stays for one more try. A timeout costs energy and moves on. Win by landing enough hits before your energy (5) runs out or the notes run out ("Time over"). Stars: 3 = no mistakes, 2 = one or two, 1 = won. Winning unlocks the next rival. Points get a speed bonus and a combo multiplier (×2 at 5 in a row, up to ×4).
- **CHART** (on the rival screen, never during a match): every note in the game for the chosen instrument, grouped by rival/scale, each with its staff note, name and the main fingering filled in on the diagram, with other accepted fingerings listed under it. Use it to study, and to check the fingerings. It scrolls with the mouse wheel, a trackpad, a finger, or the keyboard (arrows, Page Up/Down, Space); the instrument's name and a big CLOSE stay at the top, and Esc closes it.
- In `?demo` every rival is unlocked, the right keys have a faint dashed outline, and the answer is written under the diagram.

**Fixing a fingering (`shared/fingerings.js`).** Each instrument lists its written notes, and for each note every fingering the game accepts, main one first: `'D4': ['1-3']`, `'A4': ['1-2', '3']`, trombone `'F3': [1, 6]`, clarinet `'B4': ['Th Reg 1 2 3 LE | 4 5 6', …]`. The key names are explained at the top of the file (they're the labels on the diagrams). A combo is right only when it matches one of the listed fingerings exactly. To add an alternate, add it to the list; to change the main one, put it first. Trumpet and Baritone T.C. share a table, as do the two clarinets and the three saxophones. The comment block at the top of the file lists the fingerings I wasn't fully sure of: check those against the 6th Grade Honor Band charts first.

## Neon Face-Off

**Air hockey with instruments**, for two players on one device (one microphone), or one player against the CPU. When the puck slides toward your goal, your note appears on your panel with a big **YOUR TURN**; play it and hold it, and your mallet strikes. The faster you play it, the harder the shot: **WEAK**, **GOOD**, **POWER** or **SMASH!** (a harder shot crosses faster, leaving your opponent less time). Every return also speeds the rally up a little. If the puck reaches your goal first, your opponent scores. First to 5, 7 or 11 wins.

- **Players:** START on the arcade floor opens Select Your Player for two: Player 1 picks as usual, then **PLAYER 2 — PRESS START** (magenta 2P marker), or **CPU**. Player 2's choice is remembered as the last opponent and never changes Player 1's instrument.
- **Match setup:** one column per player with **NOTES** and **ORDER** (the same picker as the other games; each player's own notes, clef and key) and **DIFFICULTY**: Rookie (at least 4 s to play every note, and a smaller set of notes), Pro (2.5 s), All-Star (1.5 s). Nobody ever gets less than their own minimum time, so every shot can be returned. Points to win are shared. Two-player matches show the head-to-head record for that pairing on this device ("Trumpet 3 – 2 Flute").
- **The microphone:** only the player whose turn it is can hit. Every turn the detector switches to that player's instrument and range (a tuba and a flute are listened for very differently), and a note still ringing from the other player never counts. A new note is never the same pitch the other player just played. A wrong note shows "That's a D" and the clock keeps running.
- **Countdowns:** a slow **3 – 2 – 1 – GO!** before the first serve of a match, and a quick **READY… GO!** before the serve after every point (a slow 3-2-1 again when someone is one point from winning). Never between hits in a rally. The numbers are big on the rink, and in portrait they show twice, one each way, so both players read them. Nothing played during a countdown counts; the "GO!" voice finishes just before the serve note appears, so it never talks over the moment you play. The voices are `faceoff-count-3`, `-2`, `-1`, `faceoff-ready` and `faceoff-count-go` (until uploaded: Dojo Duel's countdown voices, then its tick). The goal celebration plus READY-GO takes about 2.2 s (with a "Go!" file under 0.45 s; Dojo Duel's 1.08 s "Go!" makes it about 2.75 s until `faceoff-count-go` is uploaded).
- **Hits and the microphone:** the moment the puck is hit, the other player's note appears (dimmed, with "…"), so they can already read it. The hit sound mutes the microphone for at most 0.3 s (`maxHitSuppressMs`); as soon as it really listens again the panel lights up, and only then do their clock and the puck start, so a sound never costs anyone time. The puck and their clock also stop during any later sound while their note is up. **Trim the puck sounds and `your-turn` to under 0.3 s** (the Sound Board warns about longer files). Turn sounds off with SOUND, or for good with `sounds: false` in `neon-face-off/levels.js`.
- **Smashes:** "Play your note FAST to smash: faster notes hit harder and speed up the rally!" (on the setup screen, and on the rink before a device's first match).
- **1 player vs CPU:** 8 rivals on a ladder in `neon-face-off/levels.js` (Rookie Robo, Slide Rule, Puckster, Rim Shot, Glide, Blitz, Zero Gravity, The Champ), each with a reaction-time range and an accuracy. The CPU "plays" silently (its note lights up), so it never confuses the microphone. Stars: win = 1, win by 4 or more = 2, shutout = 3; beating a rival unlocks the next. Stars are saved under Player 1's instrument; the arcade floor shows them.
- **Layout:** landscape puts Player 1 on the left and Player 2 on the right (stand on either side of the device); portrait puts Player 1 at the bottom and Player 2 at the top, with Player 2's panel turned to face them.
- **Testing** (`?demo`): all rivals unlocked; in a match hold **Space** to play the active player's note (press it later for a slower, softer shot) or **W** for a wrong note.
- Rules you can change in `levels.js`: the first shot's speed, how much each return speeds up, the power thresholds, who serves after a goal (`serve: 'loser'`, like real air hockey, or `'alternate'`), `celebrateMs` (1300), the countdown beats (`countdown.classic` 1000, `countdown.ready` 450, `countdown.goMax` 1000) and `maxHitSuppressMs` (300).

## Showtime Malfunction

**An articulation game.** Years ago the Band Arcade had its own animatronic house band, THE SHOWTIME BAND. Tonight, after closing, they've powered back on, glitching, with sour voice boxes, and they're lurching across the arcade floor toward you. Each one's **voice box** shows a note and a count, like **E♭ × 4**: play that note that many **separate** times (tongue each one, or strike it) and it reboots: its eyes turn from red to friendly blue, it straightens up and shuffles back to the little stage, where the band slowly fills up. The closest one is always the target (outlined, with an arrow). A wrong note makes its voice box glitch and doesn't count; holding one long note without re-tonguing for a second shows **"Tongue each note!"**

- **Spotlights:** you have 3. An animatronic that reaches the front knocks one out. All three out = **SHOWTIME'S OVER**. Stars: 3 = no spotlights lost, 2 = one lost, 1 = survived.
- **The band:** Tubby Tusk (walrus, tuba), Professor Hoot (owl, flute), Snapjaw Sal (gator, snare), Rico Bandit (raccoon, sax), and Maestro Moose, the conductor and final boss of **The Midnight Encore** (× 8, three phases, while the band keeps coming). All original, cartoon-creepy machines: no gore, nothing like any existing franchise.
- **Showtimes:** The 5:00 Show to The 11:00 Show, then The Midnight Encore, in `showtime-malfunction/levels.js`: how many animatronics, the count range, how many at once, lanes and walking speed. Notes come from **NOTES × ORDER**, like the other note games.
- **Snare Drum players** play a count-only mode: no staff, the voice box shows a drum and a count (bigger counts, up to × 12), and any clean hit counts. They face the same band as everyone else: the same animatronics, special machines and Maestro Moose (only the counting is different: hits instead of notes).
- **DIFFICULTY: NORMAL | NIGHTMARE** (remembered on the level screen). NIGHTMARE is the same eight showtimes with bigger counts and a band that walks 15–20% faster: The 5:00 Show × 2–3, 6:00 × 4, 7:00 × 5, 8:00 × 6, 9:00 × 6–8, 10:00 × 8, 11:00 × 8–10, and The Midnight Encore with Maestro Moose at × 12, three times over. Snare Drum counts go up the same way, to × 16. Same number of animatronics and lanes. It's **locked** ("Clear The 5:00 Show to unlock") until that instrument clears The 5:00 Show on Normal, in any mode (always open in `?demo`); the first time it opens, the results screen says so. Both columns are in `showtime-malfunction/levels.js` (each showtime's `x`: `count`, `snare`, `speed`, `blurb`, and the boss's `count`/`snare`), so you can edit Normal and NIGHTMARE side by side. **Stars are kept separately**: NIGHTMARE saves under the same progress keys plus `:extra` (`showtime-malfunction:extra`, `showtime-malfunction:scale-Eb:extra`, `showtime-malfunction:count:extra`…), and the level screen shows the stars for the difficulty you picked. Both count toward the instrument's star total (the arcade floor, the player card, star skins); the game's maximum is 48 (24 + 24).
- **SPOOKY LEVEL** (remembered on the level screen, separate from the difficulty: it only changes how things look, never the counts): **Mild** (default) = glitches and static only; **Spooky** = darker, more static, and a sudden silent lean-in at SHOWTIME'S OVER. No screams, and the flicker is always slow and gentle; with reduced motion there's no flicker, twitching or lean-in at all. The first switch to NIGHTMARE sets Spooky (you can switch back to Mild); NIGHTMARE with Spooky looks a little darker still: red emergency lighting that slowly pulses, more static on the cabinets and eyes that flicker more.
- **The microphone:** each played note or drum hit is an **attack** (see *Attack detection* below). While a sound plays the microphone is ignored and the band stands still, so sounds never cost time.
- **Achievements:** defeat Maestro Moose to unlock the **Animatronic** skin for every instrument; defeat him on NIGHTMARE for the **Nightmare Animatronic** skin.
- **Testing** (`?demo`): every showtime is unlocked; tap **Space** = one attack on the right note, tap **W** = one on a wrong note, hold **S** = a long note with no new attacks (shows the hint).

## Sustain Speedway

**A long-tone and intonation racing game.** The student's instrument is the car's engine: the car only moves while they hold the lap's **target note** (same letter, any octave their instrument plays), and it goes faster the more **in tune** and **steady** they are. A neon synthwave road runs to a striped sun; the car's color is the instrument's own neon, or the color of the skin it wears.

- **How speed works** (every number is in `sustain-speedway/levels.js`, `SPEEDWAY_RULES`): each moment, speed = **60 % in tune** (full credit within the difficulty's window, sliding down to a little at ±40 cents) + **25 % steady pitch** (little wobble over the last 0.3 s) + **15 % steady volume** (no big swells or fades). A **wrong note** brakes hard and the note card flashes "Target: B♭". **Breathing** (silence) just coasts, slowly losing speed. Within **±5 cents and steady for 2 seconds** = **IN THE ZONE!**: a nitro boost for as long as it lasts.
- **Difficulty** (remembered, shown on the results): **Rookie** (full speed within ±20 cents), **Pro** (±12), **Virtuoso** (±6).
- **The dashboard:** the **TUNING SPEEDOMETER** (a needle from −50 to +50 cents, the in-tune zone glowing in the middle and a speed arc inside), the target note on the student's own staff (key signature for the scale pools), lap, race position, time, speed and a **STEADY** meter. The game only measures pitch and loudness, so it says IN TUNE and STEADY and never grades tone.
- **Laps and pit stops:** one target note per lap, from **NOTES × ORDER** (Scale Order is the natural long-tone warm-up; Random works too). A lap is a distance: at full speed it takes the track's lap length in seconds of good tone; students can breathe mid-lap and carry on. Between laps there's a required **pit stop** (3.5 s): "Breathe in… 2… 3… 4", with the next note shown so they can get the fingering and pitch ready. The rivals pit too, so it's the same for everyone.
- **Rivals:** three CPU cars with a fixed pace per track, plus a see-through **ghost car** replaying your own best run on that track, mode and instrument (saved on the device).
- **Tracks:** Downtown Loop (4 laps × 5 s), River Street Run (4 × 6), Sunset Strip (5 × 7), Tunnel Vision (5 × 8: the road goes dark in the tunnels and staying in tune lights it), Harbor Lights (6 × 9), Midnight Mountain (6 × 10), Neon Desert Endurance (6 × 12), The Grand Prix (8 laps, 12 to 15 s each, the fastest rivals). **Stars:** 1st = 3, 2nd = 2, 3rd = 1, last = 0. Winning opens the next track.
- **Results:** finish position, total time, best lap, average cents off, % of time in the zone, the difficulty, and a **chart of each lap's tuning** (which notes ran sharp or flat, against the in-tune band), with one line per lap.
- **Players:** Bells and Snare Drum can't hold a long tone, so they're sent to Select Player with "Percussion: try Chime Heist or Showtime Malfunction!" (games.js `noPlay` with `block: true`). Stars are saved per instrument and mode like the other note games; ghost cars and best laps are kept separately.
- **Sound:** nothing plays during a race (the microphone is listening): no engine, music or ambience. `race-countdown` plays before GO (the race waits for it), `pit-in` in the pit stop (a rest), then `race-finish`, `podium` and `new-best-lap`.
- **Achievements:** win The Grand Prix → the **Racing Stripes** skin; win any track on Virtuoso → the **Helmet**.
- **Testing** (`?demo`): every track is open. Hold **Space** = the right note perfectly in tune, **D** = the right note drifting sharp (+25 to +35 cents, wobbling), **W** = a wrong note, **E** = the right note centered but wobbly; let go = breathing.

## Arcade Quest: The Mysterious Microphone

**An 8-bit RPG where your instrument is how you win battles, and nobody gets hurt.** Episode 1, **Ghost Notes Manor**, is complete: story, final boss, ending, save codes. The cabinet is on the arcade floor (marquee ARCADE QUEST, "Episode 1: Ghost Notes Manor"); instead of a hi-score its line shows **"Episode 1: 60% · 7 friends"** (how far you are, and how many ghosts joined your band). `arcade-quest/index.html?test` opens the test arena.

### The story (Episode 1)

- **The villain, only glimpsed:** the Band Arcade's own listening **microphone**. For years it heard every squeak, cracked note and wrong fingering, and nobody ever played just for it. It has come to believe music is only noise, so it is pulling the sound out of the cabinets to make the noise stop. It's misunderstood, not evil. Episode 1 only hints at it: the static, missing sounds, rumors, a giant microphone glimpsed in the windows with a crackling whisper ("...so much noise...") every minute or so while you explore, and the cliffhanger.
- **Title screen:** "ARCADE QUEST: THE MYSTERIOUS MICROPHONE" over the microphone's 8-bit silhouette in static. NEW GAME / CONTINUE / ENTER SAVE CODE / SETTINGS (and TEST ARENA with `?demo`).
- **Intro** (short, SKIP button or Esc): the arcade after hours, you stay late to practice, the cabinets glitch, the colors drain into static, a whisper, and the Ghost Notes cabinet pulls you in. You land in the Foyer.
- **Final boss: THE GHOST CONDUCTOR** (the Attic, after the Phantom Fermata). The manor's old conductor, whose orchestra's sound was stolen by the static; he's furious and conducting silence. He speaks first, then the battle changes as his HP drops: **1. PLAY** (First 5, or the B♭ Blast) with baton swipes in the dodge, **2. LONG TONE** ("Hold it until I cut you off!": the hold length is a secret) with falling measures, **3. ARTICULATE** (6 notes on the beat of his baton light) with sweeping fermatas, then at 1 HP his CALM fills: **4. HARMONIZE** = the whole concert B♭ scale, bottom to top (Snare Drum: 8 clean strokes), to give his orchestra its sound back. He can't be faded: befriending him is the only way to finish. He joins your band and gives you the **Conductor's Baton** (a key item: once per battle, a much slower dodge). Assist mode and Easy dodging still apply.
- **The ending:** the manor's color comes back and the ghosts celebrate... then every speaker crackles, a giant 8-bit microphone fills the screen ("...still... so much... noise..."), and it vanishes: **TO BE CONTINUED IN EPISODE 2**. A short credits roll ("Created by Mr. Graham", the manor's cast, a Showtime Band cameo), skippable. Then **Episode 1 complete!**: your stats, your save code, and any skins earned. KEEP EXPLORING goes back to the attic.
- **Skins:** **Pixel Hero** (8-bit frame and chunky pixel sparkles) for finishing Episode 1, and the **Baton** accessory for befriending every kind of ghost in the manor (Wisp, Squeaker, Hush, Wobble, Chatterbox, the Phantom Fermata, the Ghost Conductor).
- **Where the words are:** every line (the intro, the Conductor, the ending, the whispers, the credits) is in `arcade-quest/data/dialogue.js` (`QUEST_DIALOGUE`, `QUEST_CUTSCENES`, `QUEST_WHISPERS`, `QUEST_CREDITS`); the pictures behind the cutscenes are drawn in `arcade-quest/engine/story.js`; the Conductor, the microphone and the new dodge shapes are pixel art in `arcade-quest/sprites-story.js`; the boss's stages in `data/enemies.js`.

### Save codes and backups

- **Arcade Quest save code:** every Save Jukebox (the Foyer's and the Attic's) shows a 45-character code in 9 groups of 5, with a COPY button (older 25- and 40-character codes still load). On any device, **ENTER SAVE CODE** on the title screen carries on from there (it asks before replacing a save). Codes never use 0/O or 1/I, ignore spaces, dashes and lower case, and have a checksum: a mistyped letter says "That code doesn't look right. Check each letter." instead of loading the wrong save. A code keeps your level, XP, tokens, items, band, story progress, which manor ghosts you helped, your last jukebox and how many stars you already turned into tokens (so they can't be turned in twice), plus your **charms** (owned and worn) and your **player items** (unlocked or bought, and the ones you're wearing).
- **Arcade backup (everything):** the **BACKUP / RESTORE** button (in the arcade floor's speaker panel, and under the player card on Select Player) makes one code with everything on the device: every star in every game and mode, skins unlocked and worn, the avatar and its items (bought, unlocked, worn), settings and the Arcade Quest save (charms included). It's long, so it has a COPY button (paste it into an email, a note or Google Classroom); the panel also shows the short Quest code. Pasting a code there and pressing RESTORE asks "This will replace this device's progress. Continue?" first.
- **The formats** are documented at the top of `shared/backup.js` (Quest code version 2, which still reads version 1; backup format A). Future episodes add a new version and keep reading the old ones.

### Episode 1: Ghost Notes Manor

The first cabinet world, entered from inside the Ghost Notes cabinet (about 30–45 minutes). **NEW GAME** plays the intro, then starts in the Foyer; **CONTINUE** goes back to your last Save Jukebox.

- **Exploring:** a top-down tile map with a camera that follows you. Walk with the arrows/WASD or the on-screen D-pad, one tile per step; walk into a door (or onto the doormat at the bottom of a room) to change rooms. **A** talks to whoever you face or reads the sign or object in front of you (a speech bubble shows what you can talk to); **B** (or MENU on touch screens) opens the pause menu: your level, HP, tokens, bag, band and SETTINGS. Candles, the fireplace, the jukebox and the stove flicker; fog drifts (all still with reduced motion).
- **Ghosts are visible** and wander near their spot. Bump into one (or let one drift into you) and a battle starts; there are no random battles. A ghost you **befriend or fade never comes back**, except in the **Practice Hall** (off the Foyer), where one of each kind is back every visit.
- **The rooms:** 1. **The Foyer** (safe: Madame Mezzo, the Save Jukebox, Token Booth Terry and Rusty's shop), 2. **The Portrait Hall** (Wisps and a Squeaker: PLAY and LISTEN), 3. **The Library** (Hush: VOCAB, Orange belt), 4. **The Ballroom** (Wobbles: LONG TONE; the Butler), 5. **The Kitchen** (Chatterboxes: ARTICULATE), 6. **The Attic Stairs** (the mini-boss), 7. **The Attic** (locked until the mini-boss is harmonized; the Ghost Conductor and a second Save Jukebox).
- **The path:** Sir Reginald Rest sleeps in front of the attic stairs until you have helped **8 ghosts** (befriended or faded). At the top, **The Phantom Fermata** holds the attic door shut: its turns alternate LONG TONE and PLAY phases, its HP never drops below 1, and only **HARMONIZE** (hold its happy note for 4 seconds) makes it let go of the door.
- **Notes:** your First 5 notes. After the Butler teaches you **the B♭ Blast** (play the concert B♭ scale from bottom to top for him; Snare Drum: 8 clean strokes), PLAY in battle offers a second attack that uses 4 notes of your B♭ scale and hits 30 % harder.
- **Befriending:** the turn a ghost's CALM meter fills up it can't fade away, so you always get the choice: HARMONIZE (a friend, bigger rewards) or PLAY again (it fades away grumbling).
- **Enemies:** Wisp (PLAY; each one loves a different note of the First 5), Squeaker (PLAY; LISTEN to it once and your clean notes calm it twice as much), Hush (VOCAB), Wobble (LONG TONE), Chatterbox (ARTICULATE), and the mini-boss. The **Snare Drum** gets ARTICULATE instead of any pitched challenge (VOCAB stays VOCAB).
- **Token Booth:** Token Booth Terry turns the stars you earned in the other arcade games into **Arcade Tokens, 5 per star**: every star of your instrument (all games and modes), plus Chime Heist and Ancient Ninja Scrolls. Each star is turned in only once (the save remembers how many were turned in from each).
- **Rusty's shop** (tokens): Valve Oil (15, heals 12), Cork Grease (20, blocks 3 sour notes), Metronome (20, slower dodge), Band Snack (8, heals 6), Tuning Slide (30, your next PLAY hits 50 % harder). Prices are in `data/items.js`.
- **Saving:** your level, items, tokens, friends and story progress save as they happen. The **Save Jukebox** saves *where you are* and refills your HP; running out of breath in a battle takes you back to it (nothing is lost).
- **Room music (Episode 1):** every room has its own slot. Upload `shared/sounds/<track>.m4a` (seamless loop, 30–90 s):

  | Room | Track (file name) | Until it's uploaded |
  |---|---|---|
  | The Foyer | `quest-room-foyer` | `quest-foyer` |
  | The Portrait Hall | `quest-room-hall` | `quest-manor` |
  | The Library | `quest-room-library` | `quest-manor` |
  | The Ballroom | `quest-room-ballroom` | `quest-manor` |
  | The Kitchen | `quest-room-kitchen` | `quest-manor` |
  | The Attic Stairs | `quest-room-stairs` | `quest-manor` |
  | The Attic | `quest-room-attic` | `quest-manor` |
  | The Practice Hall | `quest-room-practice` | `quest-foyer` |

  To let several rooms share one track, edit `arcade-quest/data/music.js` (instructions at its top). Rooms on the same
  track keep it playing as you walk; a different track crossfades in about a second; after a battle the room's music
  carries on from where it stopped. The Sound Board's "Arcade Quest — Episode 1 Rooms" section shows which are uploaded.
- **Music:** the title waits behind a PRESS START the first time, so that first tap starts the title music. `quest-title`, `quest-intro` (the intro), each room's own music (below; until it's uploaded, `quest-foyer` in the Foyer and Practice Hall and `quest-manor` in the other rooms), `quest-battle`, `quest-miniboss`, `quest-boss` (the Ghost Conductor), `quest-victory` (the celebration and Episode 1 complete), `quest-cliffhanger`, `quest-credits`, each only when its file is uploaded; it stops while the microphone listens. Sounds: `quest-step`, `quest-door`, `quest-save`, `quest-encounter`, `quest-tokens`, `quest-static` (the intro's glitch), `quest-mic-crackle` (the microphone's whispers), `quest-boss-phase` (the Conductor's next stage) and the battle sounds.
- **Editing:** every line of dialogue and every sign is in `arcade-quest/data/dialogue.js` (grouped by character and room, one line per text box; a test checks they all fit). The rooms are tile maps in `arcade-quest/data/maps/manor.js`: rows of letters, one per tile, with a legend at the top, plus each room's doors, ghosts (and which note a Wisp loves), people and signs. Enemies are in `data/enemies.js`.
- **Testing:** `?demo&warp=<room>` starts in a room (`foyer`, `hall`, `library`, `ballroom`, `kitchen`, `stairs`, `attic`, `practice`; `?demo&warp=attic` = straight to the Ghost Conductor); the battle demo keys below work everywhere.

### The engine and battles

- **Look:** a 320 × 180 pixel screen drawn in code, scaled up crisp (letterboxed on iPad portrait). Battles are on black with a white-bordered text box. Text is **Pixelify Sans** (OFL), bundled as `shared/fonts/pixelify.woff2`.
- **Your hero** is the student's own **avatar** (Create Your Player: their look, their name, their wheelchair if they use one, which rolls instead of walking), 32 × 32 pixels, who **holds** their instrument in their hands (flute across the chest, clarinet upright, sax on its strap, trumpet at the side, tuba hugged with the bell over the shoulder, sticks and mallets in hand…) and only brings it to the lips while actually playing a challenge (PLAY, LONG TONE, ARTICULATE, HARMONIZE, FINGERING); bells and snare strike on every hit the microphone hears. Walking works in 4 directions. Outlined in the equipped skin's color; the characters call the hero by their player name. Every pose's hand and instrument positions are in one table in `shared/instrument-sprites.js` (POSES), and **`arcade-quest/index.html?sprites`** shows every character in every pose and frame (1×/2×/4×, dark and light) to check them.
- **A battle:** your HP, the enemy's HP and its **CALM** meter. Your turn: **PLAY** (the enemy's challenge; damage = accuracy × speed, right notes raise CALM), **LISTEN** (what it is, what it likes; some calm down just from being listened to), **ITEM** (Valve Oil heals, Cork Grease blocks the next 3 sour notes, Metronome slows the next dodge), **HARMONIZE** (only with a full CALM meter: play its happy note or rhythm and it **joins your band**, with bigger rewards). At 0 HP an enemy **fades away grumbling** (smaller rewards). Out of HP = "out of breath": nothing is lost.
- **Challenges:** PLAY (1–4 notes from sequences.js), **LONG TONE** (hold a note in tune: cents shown), **ARTICULATE** (one note N separate times, `Pitch.onAttack`), **VOCAB** (an Orange-belt question from Ancient Ninja Scrolls' `vocab.js`), **FINGERING** (the shared `diagrams.js` and `fingerings.js`). A challenge the instrument can't do falls back: Snare Drum → ARTICULATE (VOCAB stays VOCAB); Bells → no long tones; no fingering chart → PLAY.
- **The enemy's turn is a dodge** (no instrument, a rest for the lips): steer a glowing note for 5–8 s (arrows/WASD, the on-screen pad, or drag anywhere) around sour notes, static bursts and falling rests (the Ghost Conductor adds baton swipes with a warning line, falling measures and sweeping fermatas).
- **The staff** in every playing challenge is drawn sharp at the screen's full resolution (not pixel-scaled like the rest), large, with thick staff lines and clear ledger lines, so it reads at arm's length on an iPad.
- **The microphone listens only during PLAY, HARMONIZE and the playing challenges** (a red "The mic is listening" tag shows). Battle music (`quest-battle`, only if Mat adds the file) plays in menus and dodges and stops while listening.
- **Settings:** text speed, dodging Easy/Normal (Easy = slower and fewer), **ASSIST MODE** (half damage), **EDIT PLAYER** (Create Your Player), and the arcade's own sound and music sliders. Reduced motion (device setting) = no screen shake or flashing.
- **Rewards:** XP (level-ups raise max HP), Arcade Tokens, items, charms. The save slot (level, HP, XP, tokens, items, charms, band roster, version number) is on this device.
- **CHARMS (power-ups, ARCADE QUEST ONLY):** Menu → **CHARMS** has 2 slots. **Golden Mouthpiece** (+8 max HP; 150 tokens), **Lucky Reed** (CALM rises 30% faster; hidden in the Kitchen's reed jar, or 250 tokens), **Metronome Charm** (enemy notes 15% slower; befriend the Phantom Fermata), **Silver Mute** (blocks the first sour note that hits you each battle; 200 tokens), **Tuning Fork** (90%+ accurate playing hits 25% harder; hidden in the Library). A hidden charm twinkles on its spot until found. Charms change Arcade Quest battles only: they never touch stars or scoring in any other game, so a student's stars always show what they really played. Edit them in `QUEST_CHARMS` in `data/items.js` (the top explains every field).
- **The Token Booth** (Terry, in the Foyer) turns stars into tokens, and sells **player items** (hats, pets, a jetpack…: owned forever and worn everywhere in the arcade, marked OWNED once bought) and **charms**.
- **Your own art:** put `arcade-quest/art/<sprite id>.png` (frames side by side, transparent background) and it replaces the drawn sprite: enemies by id (`squawk`, `wisp`…; the mini-boss `fermata` is 56 × 40) (the players are always the students' avatars), the manor's ghosts `npc-mezzo`… (24 × 28, 2 frames) and map tiles `tile-floor`, `tile-candle`… (16 × 16). The ids are listed at the top of `sprites-manor.js`.
- **Editing:** enemies (HP, challenge, happy note, dodge patterns, lines, rewards) in `data/enemies.js`, items in `data/items.js`, every battle message in `data/battle-text.js`.
- **Testing** (`?demo&test`): hold **Space** = the right note(s), **W** = a wrong note, **S** = a steady long tone, **T** (or Space) taps = attacks, **V** = auto-answer VOCAB / FINGERING.

### Attack detection (the engine)

`shared/pitch.js` can report every separate **attack**: a tongued note, a new mallet strike, a drum hit (`Arcade.Pitch.onAttack`). It watches how loud the sound is about every 5–8 ms and counts a sharp rise after a dip, so quick tonguing (gaps as short as 40 ms), bells struck again while still ringing and snare hits all count, but a **slur** (a new pitch without a new attack) and vibrato don't. Each attack is reported with the pitch heard in the next ~150 ms (or none, for a drum). The numbers (how big a rise, how long before another attack can count) are at the top of that section of `pitch.js`, and the Note Checker's **ARTICULATION** test shows exactly what the detector counts on a real instrument. Only games that ask for attacks run it, so nothing else changes.

## Sounds

Every sound in the arcade goes through `shared/sfx.js`, and each one can be **your own recording**. The full list of sounds, with the exact file name for each, when it plays and a suggested length, is in [`shared/sounds/README.md`](shared/sounds/README.md) (the same list, with volumes and rules, is `shared/sounds.js`).

**To add or replace a sound:** record it, save it as `.m4a` (best) or `.mp3`, name it exactly as in that list (for example `select-ghost-notes.m4a`, `note-hit.mp3`, `lobby-ambience.m4a`), and upload it into `shared/sounds/`. That's all: the arcade uses your file from then on. Without a file (or if a file won't play), each sound falls back to the arcade's own built-in sound for that moment, so nothing ever goes silent and students never see an error; a missing file is only noted in the browser console. (Music has no built-in version in Arcade Quest; if a track doesn't play, open the page with `?debug` added to its address to see what it tried.) To make one sound louder or softer without re-recording, change its `vol` in `shared/sounds.js`.

**The Sound Board** (`sound-board/index.html`, for example `https://bandarcade.org/sound-board/index.html`; it isn't linked from the arcade): it checks every file when it opens, and **RELOAD ALL SOUNDS** checks again without reloading the page, always against the live files on the server (never a saved copy), with the time of the check. Every sound gets a label: **YOUR FILE (m4a/mp3)**, **FALLBACK** (the arcade's built-in sound for that moment) or **MISSING FILE, USING GENERATED** (a short generic beep until you add one). Press **Play** to hear any sound, and watch the level meter and the peak (dB) next to each sound to match loudness between recordings. The ambience has a **Loop test** that jumps to just before the loop point, so you can hear whether it wraps around cleanly.

**After replacing sounds, bump `SOUNDS_VERSION` by 1** (the number at the top of `shared/sounds.js`): every sound's address ends in `?v=<that number>`, so every student's device picks up the new files right away instead of a saved copy, and then keeps them saved for fast loading. Details in [`shared/sounds/README.md`](shared/sounds/README.md).

What students hear:
- **The arcade floor:** a turn sound each way (`wheel-left`, `wheel-right`), a quiet `cabinet-focus`, the room ambience loop, and on START the game's own `select-<game>` sound as Select Player opens (a game that skips Select Player, like Chime Heist, plays it before the page changes, never more than 1.5 s). A new game gets its `select-<game>` automatically, falling back to `select-default` (the old coin).
- **Select Player:** character select music (`select-music`, a loop; until you upload one, a built-in original chiptune plays; a game can have its own, `select-music-<game>`, e.g. `select-music-sustain-speedway`), `tile-move`, `player-select`, `player-continue`, `player-ready`, `player2-join`, and the skin sounds. The music crossfades in from the room ambience the moment Select Player opens (no extra tap), crossfades back when you go back to the cabinets, and fades out as the game opens.
- **How music starts:** every page asks one music manager (`Arcade.sfx.setMusic`, in `shared/sfx.js`) for the track it wants; it starts that track with a fade-in as soon as the first tap has unlocked sound and the file has loaded, never plays two tracks at once and never restarts the one already playing. Arcade Quest's room music starts the first time you enter a room.
- **The games:** the shared events (`level-start`, `note-hit`, `note-wrong`, `note-missed`, `level-complete`, `level-failed`, `star-earned`, `new-high-score`) and each game's own. Chime Heist's bell bars are always made by the arcade so every pitch is exactly in tune; they are never replaced by files.
- **Controls:** the speaker button in every top bar opens **SOUND ON/OFF**, an **EFFECTS** volume, a **MUSIC** volume (the character select music, and Arcade Quest's music) and an **AMBIENCE** volume (the room sound, on the arcade floor only). Defaults: effects on at 60 %, music at 40 %, ambience at 30 %. The device remembers them on every page. Browsers only allow sound after the first tap on each page, and an iPad with its silent switch on stays silent.

**Sounds and the microphone:** the listening games (Ghost Notes, Note Storm, the Note Checker, Neon Face-Off, Showtime Malfunction) play sounds too (Sustain Speedway plays nothing while racing). While a sound plays, and for 250 ms after it (room echo), the arcade ignores the microphone: nothing heard counts as a right note, a wrong note, or toward holding a note, and the game's timer stops (Ghost Notes' note timer, the Note Storm notes, Neon Face-Off's puck and reaction clock), so a sound never costs a student time. A note still ringing afterwards has to be played again. So keep the **during play** sounds (marked in the list) under half a second. The Note Checker only plays a sound when every note is found, never per note, so a scale can be played straight through.

Each page loads only its own sounds, after the first tap, two at a time (school Wi-Fi). A page opened by double-clicking still plays your files, but the ambience loop and exact timings are only right on the served site.

## Create Your Player (avatars)

**The avatar badge.** Every screen with a top bar (the lobby, zones, Full Arcade, All Games, Choose Your Instrument and
every game's menus) shows the student's avatar, name and instrument in the top-right corner, with a small pencil.
Tapping it offers **EDIT AVATAR** (the editor opens right on top of that screen; DONE saves and closes, CANCEL throws
the changes away, and the student is back exactly where they were, with the same note set and level selected) and
**CHANGE INSTRUMENT**. The badge is hidden during a level, so it can't be tapped by accident.

Every student has an **8-bit avatar**, one per device, shown all over the arcade: the Select Player card and **Continue as …**, the top bar of every game, every results screen (with the player's name), Button Masher's fighter, Neon Face-Off's players, the Sustain Speedway dashboard, and in **Arcade Quest the hero IS the avatar** (walking, rolling in a wheelchair, holding and playing their own instrument). The first visit gives each device a random avatar, so nobody is left without one.

- **Opening it:** **EDIT PLAYER** on the Select Player card; Arcade Quest's title (**YOUR PLAYER**) and SETTINGS (**EDIT PLAYER**); and the one-time "Create your player?" offer.
- **The screen:** a big live preview (the portrait plus the full-body sprite holding the instrument; tap it to turn around), and tabs **FACE** (12 skin tones, face shape, eyes, eye color, eyebrows, mouth, freckle styles, face paint in colors) · **HAIR** (26 styles, including afro puffs, a high puff, cornrows, a high-top fade, Bantu knots, twists, coils, box braids with beads, locs, braids, wavy, pixie, side part, bangs and a mohawk, in natural and bright colors) · **HEAD** (hijab, headwrap, turban, patka, kufi, headscarf, durag, beanie, ball cap, band shako, headphones, and the earned hats; hair under a hijab or turban is hidden automatically) · **CLOTHES** (band tee, hoodie, sweater vest, flannel, marching jacket, concert black, polo, jersey and the earned tops; jeans, joggers, shorts, skirt, cargo pants; sneakers, high-tops, boots, sandals, each in colors) · **EXTRAS** (glasses in six frames, hearing aids, a wheelchair, things on your back, and the skins gear they've earned) · **HELD ITEM** · **PETS** · **EFFECTS** · **BACKGROUND** · **NAME** (and its name plate). **SURPRISE ME** randomizes everything (or **SHUFFLE THIS TAB** just the tab), **UNDO** steps back, **DONE** keeps it. There's no boy/girl choice: students just pick parts. Every option is a big labeled button; arrows and Enter work on a Chromebook. Moving items carry a small wave icon; a tab with something newly unlocked has a **NEW!** dot, and the new item itself says NEW! until the tab has been opened.
- **Names are built, never typed:** TITLE + ADJECTIVE + NOUN (e.g. "Captain Brassy Blaze", "Sensei Jolly Narwhal"), picked from A–Z lists, with a **Random name** button. There is no first initial any more. To change the words, edit [`shared/avatar-names.js`](shared/avatar-names.js) (the rules for safe words are at its top: check a new word against every word in the other lists). Its **NEVER USE** list (Zesty, Pickle, Spicy, Wobbly, Director, Nova: words students use as slang or insults) can never be added; the builder skips them even if one slips into a list. A saved name that has one of those words (or an old initial) gets a new random word from the same list once, and the next page shows "Your name got an upgrade! Tap your name to change it." Long names always fit: they wrap onto two lines, never cut off. Tap the name under the preview to go straight to the NAME tab.
- **Backgrounds** (the **BACKGROUND** tab and the LOCKER's **BACKGROUNDS** tab): a picture behind the avatar wherever it shows (the editor, Choose Your Instrument, results screens, Dojo Duel, high-score lists; the top-bar badge shows just its main color). 14 are free (solid colors, color fades, stripes, polka dots, staff lines, checkerboard, stars). 22 more are **animated scenes**, the same art as the game menus' backgrounds, earned by playing (table below). Only one background moves at a time (the biggest avatar on screen, at most 30 frames a second); the rest show a still picture, and every one is still with reduced motion or with MOVING BACKGROUNDS off in the speaker panel. Nothing flashes.
- **Skins:** the color skins become effects on the avatar (glow, aura, backdrop…), and the accessory skins (Headband, Shades, Visor, Crown, Cape, Helmet, Ninja Mask, Baton) are drawn on the avatar.
- **Neon Face-Off, two players:** Player 2 is a **guest** avatar (random; SURPRISE ME for a new one), remembered as the device's last guest; it never replaces the device's own avatar.
- **Animated items and effects:** wings and capes flap, the plume sways, the baton spins, glowing headphones pulse, light-up sneakers change color, and every pet has an idle animation. An **effect** (floating notes, sparkles, orbiting stars, a glow aura in a color of your choice, snowflakes, bubbles, soft lightning sparks, or confetti that bursts on a results screen) floats around the avatar but never over the face or the name. Like the backgrounds, only the biggest avatar on screen moves (at most 30 frames a second); every other copy is a still picture, and all of it is still with reduced motion or MOVING BACKGROUNDS off. Nothing flashes more than 3 times a second.
- **Name plates** (NAME tab): the name under the avatar on results screens and in the Endless Top 5 sits on a plate: Simple (free), Music notes, Gold, Neon, Flames, or the color of any Note Ninja belt the student has earned.
- **Backups:** the avatar and its items are part of the Arcade Backup Code (and the Arcade Quest save code carries the items too).
- **Adding a part** (a hair style, a hat, a top…): see the notes at the top of [`shared/avatar-parts.js`](shared/avatar-parts.js). Each part is a small pixel map (like Arcade Quest's sprites), drawn for the sprite (side, front, back) and the portrait; then open Create Your Player with `?demo` and check it from every side (Arcade Quest's `?sprites` page shows your avatar with every instrument).

### Earning player items

Most player items are free from the start (every skin tone, face, eye color, brow, hair style and hair color, the everyday hats, clothes and shoes, glasses, face paint and freckles); the rest are earned or bought. **Identity items are always free and never locked:** hijab, headwrap, turban, patka, kufi, headscarf, durag, hearing aids, the wheelchair and glasses, in every color.

| How | Items |
|---|---|
| Stars on this device (every instrument, every game and mode added up) | 10 Star eyes · 25 Rock-star jacket · 50 Gold hair · 100 Top hat · 150 Note sprite (pet) · 200 Silly tongue · 300 Galaxy hair (sparkles) · 500 Wizard hat · 750 Tuxedo · 1000 Neon wings |
| Special wins | Tiny ghost pet (3 ★ on Ghost Run, Ghost Notes) · Mini animatronic pet (defeat Maestro Moose, Showtime Malfunction) · Diamond headband (Diamond belt, Note Ninja) · Championship jacket (beat The Champ, Neon Face-Off) · Pixel-hero cape (finish Arcade Quest Episode 1) · Sequined marching jacket (The Golden Vault, Chime Heist) · Plumed shako (The Conductor, Button Masher) · Flame tips hair (win The Grand Prix, Sustain Speedway) · Wink (a TEST READY badge, Ancient Ninja Scrolls) |
| Arcade Tokens at Arcade Quest's Token Booth | Whistle 50 · Heart eyes 75 · Neon green hair 100 · Lucky star (pet) 150 · Metronome buddy (pet) 250 · Jetpack 300 · Royal crown 400 |
| Backgrounds: a game's final level | Thunderstorm (clear Note Storm Level 8) · Haunted Hall (clear Ghost Notes Level 8) · Bamboo Moon (Diamond belt, Note Ninja) · Ink Bloom (clear Vanishing Ink Level 8) · Laser Vault (clear The Golden Vault, Chime Heist) · Lantern Temple (a star on the Diamond scroll, Ancient Ninja Scrolls) · Combo Arena (defeat The Conductor, Button Masher) · Spotlight Stage (clear Showtime Malfunction Level 8) · Night Track (top 3 in The Grand Prix, Sustain Speedway) · Deep Space Radar (clear Lost Signal Level 8) |
| Backgrounds: other goals | Air Rink (win 5 Neon Face-Off matches on this device) · Dojo Night (win 5 Dojo Duel matches on this device) · Pixel Castle (finish Episode 1 of Arcade Quest) |
| Backgrounds: stars on this device | 50 Neon City · 100 Synthwave Sunset · 150 Aurora · 250 Galaxy Swirl · 400 Gold Record Wall |
| Backgrounds: Token Booth | Underwater Bubbles 150 · Fireflies Night 200 · Lava Lamp 250 · Confetti Party 300 |
| More stars on this device | 25 Cat (pet) · 50 Floating notes (effect) · 100 Marching band uniform · 100 Music-notes plate · 150 Orbiting stars (effect) · 250 Glow aura (effect) · 250 Gold plate · 400 Astronaut helmet · 600 Conductor's baton (held, spins) |
| More game goals | Ghost-hunter coat (3 ★ on every Ghost Notes level) · Lightning sparks (3 ★ on every Note Storm level) · Sparkles (3 ★ on every Chime Heist vault) · Drumsticks (3 ★ against every Button Masher rival) · Racing jacket (win all 8 Sustain Speedway tracks) · Space suit (echo a 10-note signal in Lost Signal's Deep Space Scan) · Bubbles (remember a 10-note scroll in Vanishing Ink's Endless Scroll) · Mini robot pet (The Midnight Encore on NIGHTMARE, Showtime Malfunction) · Baby dragon pet (win 10 Dojo Duel matches) · Trophy (win 10 Neon Face-Off matches) · Owl pet (4 TEST READY badges, Ancient Ninja Scrolls) · Microphone (finish Arcade Quest Episode 1) · each Note Ninja belt = that belt's headband and name plate; the White belt also gives the white ninja gi, the Black belt the black gi |
| More at the Token Booth | Penguin 150 · Neon plate 150 · Narwhal 200 · Pirate hat 200 · Glow stick 200 · Magic wand 250 · Snowflakes 250 · Flames plate 250 · Light-up sneakers 300 · Glowing headphones 350 · Confetti 350 · Sequined stage jacket 400 · Feathered wings 450 |

Unlocks are checked from saved progress on every results screen and whenever Select Player opens, so old progress counts: a new item shows on the same **UNLOCKED!** card as skins, with **Wear it**. Pets float beside the avatar (and follow the Arcade Quest hero).

**THE LOCKER** (the player card's **LOCKER** button on Select Player) holds everything: tabs **OUTFIT** (tops, shoes, hair colors) · **HATS** · **EXTRAS** (this instrument's accessory skin, held items, things on your back, name plates, expressions) · **PETS** · **BACKGROUNDS** · **EFFECTS** (the avatar's effects and this instrument's glow skins). Tap an item to wear it; locked ones are dark silhouettes (a background: its own picture, dimmed) that say what they take ("Earn 150 ★", "Defeat Maestro Moose in Showtime Malfunction", "250 tokens at the Token Booth"). Create Your Player shows the same locks.

**To add an item or change how it's earned:** see HOW TO ADD AN ITEM near the end of [`shared/avatar-parts.js`](shared/avatar-parts.js). An item is a part with an `unlock` rule: `{stars: 150}` (stars on this device), `{game: 'ghost-notes', level: 8, stars: 3, text: 'Get 3 ★ on Ghost Run in Ghost Notes'}` (a special win), `{game: 'arcade-quest', achievement: 'ep1', text: …}`, `{game: 'ancient-ninja-scrolls', badge: true, text: …}` (or `badges: 4`: that many badges), `{game: 'chime-heist', perfect: 8, text: …}` (3 ★ on levels 1–8), `{game: 'lost-signal', endless: 10, text: …}` (an Endless run that reached 10 notes), `{game: 'dojo-duel', wins: 10, text: …}` or `{shop: 250}` (sold at the Token Booth for 250 tokens). Leave `unlock` out and it's free. Never lock an identity item. Never change an item's `id`, and add a new item to the end of `QUEST_V3.cosmetics` in `shared/backup.js` so save codes carry it.

## Band Ninja connection (optional)

Band Arcade can work alongside Mr. Graham's **Band Ninja** progress portal (a Google Apps Script web app). It's
**optional**: a student who never uses a Band Ninja link, code or PIN gets exactly the same arcade, and nothing ever
asks them about Band Ninja. There are **no logins**. The arcade stays **anonymous**: it never sends student data
anywhere and stores nothing off the device. Who a student is stays in Band Ninja; the arcade only understands link
settings and makes or checks codes. Everything lives in [`shared/bandninja.js`](shared/bandninja.js) and
[`shared/avatar-code.js`](shared/avatar-code.js).

**Link settings.** Any page takes these settings in its address, applies them once and then removes them from the
address bar, so a reload doesn't apply them again (`?demo` still carries through):

| Setting | Where | What it does |
|---|---|---|
| `inst=<instrument>` | any page | sets the student's instrument (Band Ninja's name for it, e.g. `Alto Sax`, `French Horn`, `Baritone`, `Percussion`), so Choose Your Instrument is skipped. Names are matched loosely (capitals, spaces and punctuation don't matter) through the alias table at the top of `shared/bandninja.js`: add any name Band Ninja uses there. "Percussion" means Bells. A name it doesn't know is ignored and the normal instrument screen shows. |
| `belt=<white…diamond>` | Note Ninja | selects that belt on the level screen if it's open; otherwise the highest open belt, with "Your Band Ninja belt is Green. Clear the belts below to get there!" |
| `rank=<orange…diamond>` | Ancient Ninja Scrolls | selects that rank's chamber (every chamber is always open there) |

Examples: `bandarcade.org/note-ninja/index.html?inst=Alto%20Sax&belt=green` and
`bandarcade.org/ancient-ninja-scrolls/index.html?inst=Trumpet&rank=orange`.

**The avatar code ("Share to Band Ninja").** In Create Your Player and in the avatar badge's menu, **SHARE TO BAND
NINJA** shows a short code (like `BA1-KEKCCchQwkDgRwSUMkLGUEUIZDlhJRFBNFihyIA`, about 43 characters) with a COPY button:
"Paste this in your Band Ninja Progress page." The code holds only how the avatar looks (every item, color,
background, effect and the name's words), nothing else. **LOAD AVATAR CODE** in Create Your Player brings an avatar to
a new device; anything that device hasn't unlocked yet is left out (it says which). The code's format is the TABLE in
`shared/avatar-code.js`: when you add an avatar part, add its id to the END of its list there (`?demo` warns in the
console about anything missing).

**The avatar card page.** `avatar-card/index.html?code=<avatar code>` draws the avatar exactly as the arcade does
(background, items, pet, effect, animation) in a rounded frame, with its name underneath, for the portal to show in an
iframe (about 260 × 280). Options: `frame=<any CSS color>` (the border; default: the arcade's gold), `still=1` (no
animation; reduced motion does the same), `name=0` (no name). It loads only the drawing code, never reads or writes
anything on the device, and shows a silhouette with "Avatar not found" for a missing or broken code.

**Belt reward codes (Token Booth).** Band Ninja shows students one code per belt they've fully earned in class (like
`GRN-3T3H`). At Arcade Quest's **Token Booth**, **Enter a code** checks it right on the device (capitals, spaces and
the dash don't matter; 10 tries a minute) and unlocks that belt's **OFFICIAL BAND NINJA GEAR** with the usual UNLOCKED!
card: a martial-arts belt at the waist in Band Ninja's colors and a matching name-plate frame; the Black belt code also
gives the **Black Belt Gi**, the Diamond belt code the animated **Diamond Aura** effect and the **Diamond Dojo**
background. This gear only comes from codes and is labeled "Official Band Ninja gear: earned in class" (Create Your
Player shows it on its own BAND NINJA tab once a code has opened some); the arcade's own Note Ninja belt items are
separate. Unlocked belts are saved on the device and kept by the Arcade Backup Code. Every game, level, star and every
other unlockable stays available without any code.

The codes are `beltUnlockCode(belt)` in `shared/bandninja.js`: FNV-1a of `ARCADE_CODE_SALT + "|belt|" + belt`, written
as 4 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` after the belt's 3 letters. It's the portal's exact algorithm.
**`ARCADE_CODE_SALT` must match the portal's.** Change it in BOTH places at the start of each school year (the repo is
public, so the salt is not a secret; changing it just makes last year's codes stop working). With `?demo` the arcade
checks its ten codes against the portal's list (`EXPECTED` in bandninja.js: update that list too when the salt changes).

## Leaderboard & privacy

A per-grade weekly leaderboard (the trophy button in the arcade's top bar): ⭐ Stars this week, 📈 Most improved,
🔥 Practice streak (school days in a row) and ♾️ Endless (pick a game). It resets every Monday. It talks to Mat's Google
Apps Script scoreboard, whose address is in `shared/leaderboard-config.js` (`Arcade.LEADERBOARD_URL`); **set it to
`''` to switch the whole leaderboard off** (the button disappears and nothing is ever sent).

**What is sent** (and nothing else, ever): a random device id (24 letters/numbers, made on the device, not tied to
anyone), the grade (6, 7 or 8), the avatar's name as three word **numbers** (never text), and for each event the game,
the kind (`stars`, `endless` or `play`), a number and the level:
- `stars`: how many NEW stars a level's best just gained (1–3);
- `endless`: an Endless score, only when it beats this device's best for that game this week;
- `play`: once a day, the first time a game is started that day (for the practice streak).

**What is never sent:** real names, emails, PINs, the avatar's look, what instrument is played, anything typed.

**Turning it off:** every student has a "Show me on the leaderboard" switch (on by default) on the leaderboard
screen, under MY SETTINGS. Off = nothing is sent at all (anything still waiting is thrown away). Nothing is sent
until the student picks a grade, and never in `?demo`. The device id, grade and switch are in the Arcade Backup
Code, so a student's streak follows them to a new device.

**Hiding a player (teacher):** open the leaderboard with `?teacher` in the address
(`bandarcade.org/index.html?teacher`). Every entry then shows its 6-character id; paste it into the **Blocked**
tab of the scoreboard Sheet. Under the board it also says how the last request went: "OK in 3.2 s", or why it
failed ("timeout after 25 s", "offline", "HTTP 500", "not JSON", "network error (CORS or blocked)") and how long it
took. That's the line to look at when a school device says the leaderboard is taking a break.

**A slow scoreboard:** a Google Apps Script that hasn't run for a while can take 10–20 seconds to answer. So the arcade
wakes it quietly when it opens (and when the lobby shows again 10+ minutes later), a board read waits up to 25 s and
is tried once more if that runs out, the screen says "Loading the leaderboard…" while it waits, and if it still can't
get through it shows the last board this device saw ("Couldn't refresh — showing the board from 2 hours ago"). Only a
device that has never loaded a board shows "Leaderboard is taking a break".

Names: every word in `shared/avatar-names.js` has a permanent number (its place in its list), so the lists are
append-only now: add new words at the end, and retire a word with a `#` in front (`'#Word'`) instead of deleting it.
A retired or unknown word shows as "Mystery" on the leaderboard.

## PRESS START title screens

Every game page opens on a title screen: the game's marquee, big and moving, over its menu background, with a
blinking PRESS START. Browsers don't allow any sound on a new page until the student taps, and every game is its own
page, so this one tap (or any key) turns the sound on: the `press-start` sound plays (or the game's own
`press-start-<game id>` file, if you upload one), the game's menu music starts, and the level select fades in. The top
bar (← Arcade, sound) still works on the title screen. It shows only when the game page opens, never between levels,
and never turns on the microphone (that still happens when a level starts). Arcade Quest keeps its own title screen;
the Note Checker has none. Add `?nostart` to a game's address to skip it while testing.

## Select your notes, select your level, START (every game's first screen)

After PRESS START, every game's first screen works in two steps, then one big button:

- **① SELECT YOUR NOTES** on the note picker, and **② SELECT YOUR LEVEL** right above the level cards (both headings in
  the same neon style). The announcer says "Select your level" (the `select-level` sound, at most once a minute).
- **Tapping a level selects it** (a lit border and a ✓, like the chosen note set). It doesn't start the game yet.
  Locked levels say what opens them ("Clear Level 3 to unlock") when tapped. The Endless card can be selected too.
- **START** then appears next to the heading, with what you picked ("LEVEL 4 · FIRST FIVE") and the `start-ready`
  sound. Before a level is picked it says "Select your notes and level" there instead.
- **Remembered:** each device remembers the last level picked (and the notes) for each game and instrument, so a
  returning student can press START right away. After a level, the screen comes back with that level selected.
- If nobody taps for 5 seconds, a **bouncing arrow** points at the next step: the level cards, or START.
- The **"Your first five notes" staff** is back under the note picker, at half size.

Dojo Duel's BEGIN THE DUEL, Neon Face-Off's START MATCH and Arcade Quest's CONTINUE / NEW GAME glow the same way.

## Menu backgrounds

Every game's menu screens (level select, mode picker, level intros, results, setup and title screens) have a moving
background drawn in code, like stepping inside the game's cabinet art: storm clouds with soft lightning for Note
Storm, a haunted hallway for Ghost Notes, moonlit bamboo for Note Ninja, a blueprint vault with lasers for Chime Heist,
and so on (`shared/bg-scenes.js`; each game picks one with `bg` in `shared/games.js`). Gameplay never shows it: it
fades away when play starts.

- **Your own picture wins:** put `shared/backgrounds/<game-id>.webp` (or `.jpg` / `.png`, 1920 × 1080; optional
  `<game-id>-portrait.webp`, 1080 × 1920) and that game shows it instead. See `shared/backgrounds/README.md`.
- **The Art Board** (`art-board/index.html`, not linked from the arcade) shows every game's scene, moving, with its
  picture slots (background, marquee) and which one is showing, plus every instrument portrait slot.
- **Readable first:** a dark overlay sits on every background (`bg.dim`, `bg.focus` in games.js).
- **Moving backgrounds** can be switched off in the speaker panel (remembered on the device). Devices that ask for
  reduced motion get a still picture, and a device that is too slow to draw it smoothly switches to a still picture
  by itself.
- **No flashing:** Note Storm's lightning is a soft glow behind the clouds every 6–15 seconds, never a full-screen flash.

## Instrument portraits

Each instrument's portrait is Mat's artwork in `shared/portraits/` (`trumpet.png`, `alto-sax.png`, …): the Select Player tiles, the instrument badge on the big preview, Chime Heist's bell kit and the CPU rivals in Neon Face-Off. (The PLAYER is shown as their avatar: see *Create Your Player*.) Underneath each image is the drawn neon portrait from `portraits.js`; if a file is missing or broken, the drawing shows instead, so a broken image never appears.

**To add or replace a portrait:** save a PNG or WebP with a transparent background as `shared/portraits/<name>.png`, using the name from the table in [`shared/portraits/README.md`](shared/portraits/README.md). Any shape works: it is fitted into a square, centered, never stretched. If that instrument has a smaller copy in `shared/portraits/optimized/` (alto sax, tenor sax, bells and horn do today), delete the copy and take its name off `OPTIMIZED` in `portraits.js`, or make a new copy. Optional `<name>-full.png` is a bigger picture used only in the Select Player preview. That README also covers skin variants and making optimized copies.

## Skins

Students earn **skins** for their instrument's portrait by playing: a **color skin** (Sunset Wave, Ice Crystal, Flame, Galaxy, Pixel, Chrome Gold, Diamond, Animatronic, Nightmare Animatronic, Racing Stripes, Ghostly, Pixel Hero; Classic Neon is always there) and one **accessory** on top (Headband, Shades, Visor, Crown, Cape, Helmet, Ninja Mask, Baton). On Select Player, the player card's **LOCKER** button opens the locker (EFFECTS = color skins, EXTRAS = accessories, next to the player items): tap an unlocked skin to wear it (the big portrait shows it right away); locked ones are dark silhouettes that say what they take ("Earn 50 ★ to unlock", "Clear The Golden Vault in Chime Heist"). What a student wears is saved per instrument on this device and shows everywhere that instrument's portrait does: the tile, CONTINUE AS, every game's top-bar chip, Button Masher's fighter and the Neon Face-Off player sides (Player 2 wears their own instrument's skin).

**How skins are earned** (all in `shared/skins.js`, easy to edit):

| Skin | How |
|---|---|
| Sunset Wave, Headband, Ice Crystal, Shades, Flame, Galaxy, Pixel, Visor | 10, 25, 50, 100, 150, 200, 300, 500 ★ on THIS instrument, all games and all modes together (the same total as the player card) |
| Chrome Gold | clear The Golden Vault in Chime Heist |
| Diamond | earn the Diamond belt in Note Ninja |
| Ghostly | 3 ★ on Ghost Run in Ghost Notes |
| Crown | defeat The Conductor in Button Masher |
| Cape | beat The Champ in Neon Face-Off (1 player vs CPU) |
| Ninja Mask | earn any TEST READY badge in Ancient Ninja Scrolls |
| Animatronic | defeat Maestro Moose (The Midnight Encore) in Showtime Malfunction: a metal sheen, bolts and glowing blue eyes |
| Nightmare Animatronic | clear The Midnight Encore on NIGHTMARE in Showtime Malfunction: cracked chrome, bolts, a few loose wires, and one red eye and one blue that swap back and forth |
| Racing Stripes | win The Grand Prix in Sustain Speedway: two stripes down the portrait (and on the car) in sunset magenta and orange |
| Helmet | win any track on Virtuoso in Sustain Speedway: an original racing helmet with a visor |
| Pixel Hero | finish Episode 1 of Arcade Quest (befriend the Ghost Conductor): an 8-bit frame and chunky pixel sparkles |
| Baton | befriend every kind of ghost in Ghost Notes Manor (Arcade Quest): the Ghost Conductor's baton |

Star skins belong to the instrument that earned the stars. The special wins count in any NOTES × ORDER mode, on any instrument, and unlock that skin for every instrument on the device. Progress from before skins existed counts: the first time a student opens Select Player (or reaches any results screen) they get one **UNLOCKED!** card with everything they have already earned. After that, a new skin's card appears on the results screen that earned it, with **Equip now**. Nothing ever interrupts a game.

**To add a skin:** add a line to `SKINS` in `shared/skins.js`: an `id` (never change it later), `kind` (`'color'` or `'acc'`), a `name`, how it `unlock`s, and how it looks (a color skin's `look`: two theme colors, plus any of a backdrop, aura, effect, pixel or ghost style; an accessory's drawing goes in `ACC_ART` and where it sits in `art`). **To change how a skin is earned**, edit its `unlock`: `{stars: 50}` for a star goal on the instrument, or `{game: 'chime-heist', level: 8, stars: 1, text: 'Clear The Golden Vault in Chime Heist'}` for a special win (`text` is what the locker says; add `suffix: ':extra'` to count only Showtime Malfunction's NIGHTMARE stars). A rule for a game that isn't in the arcade is skipped. The top of `skins.js` explains every field.

**To draw a skin yourself** for one instrument, add `shared/portraits/<name>--<skin id>.png` (for example `trumpet--flame.png`); it replaces the code-drawn version. **If an accessory sits in the wrong place**, nudge that instrument's numbers in `ANCHORS` in `shared/skins.js`. Both are explained, with a table of every instrument's positions, in [`shared/portraits/README.md`](shared/portraits/README.md).

**Testing:** `?demo&unlockall` (on Select Player or any game) previews every skin and player item without earning it. Nothing is saved as earned, and without `?demo` the flag does nothing. Animated effects (flames, sparkles, the gold sweep, drifting stars, the ghost's float) play only on the big Select Player portraits, and not at all with reduced motion; tiles, chips and in-game portraits show the still version.

## Players and old saves

The saved choice is an **instrument** (Trumpet, Oboe, Horn…), picked on Select Your Player. Behind the scenes each instrument belongs to one of the original ten **player groups** (Trumpet, Clarinet and Tenor Sax share the "Trumpet, Clarinet, Tenor Saxophone" group), which sets the first five notes and is where the games save stars. So a trumpet player's stars from before this update are still there. The mapping is `Arcade.groupFor(instrument)` in `shared/instruments.js`; everything goes through it. Horn is one tile; its **Starting notes** toggle picks the F G A B♭ C group (F–C, the default) or the C D E F G group (C–G), and is remembered. Games no longer ask "Which instrument do you play?": the chosen instrument is the answer.

The first time a device loads this version, its old choice moves over once:

| Saved before | Becomes |
|---|---|
| A group with one instrument (Alto Sax, Bari Sax, Tuba, Bells) | that instrument, automatically |
| French Horn (F, G, A, B♭, C) / French Horn (C, D, E, F, G) | Horn, with Starting notes F–C / C–G |
| A group with several instruments, and an answer to "Which instrument do you play?" | that instrument, automatically |
| A group with several instruments and no answer | Select Your Player opens with that group's tiles outlined and "Pick your exact instrument!" |
| Colored Tone Bells | "Choose your player again!" (Colored Tone Bells has left the arcade) |

## Notes and order

Ghost Notes, Note Storm, Note Ninja and Chime Heist share one picker on their level screen (remembered per game) with two separate choices:

- **NOTES:** **First 5** (the player's first five notes), **Concert B♭, E♭, F or A♭** (one octave of that scale, written for the student's own instrument, with its key signature), or **Chromatic** (the student's whole range).
- **ORDER:** **Random** (every note of the pool before any repeats, never the same note twice in a row) or **Scale Order** (up, then down).

All 12 combinations work in every one of these games, and each has its own stars; the NOTES buttons show them for the chosen order (e.g. "E♭ ★ 9/24"). Level 1 in Random uses a smaller pool: the first three notes, the scale's first five notes, or one chromatic octave from the first-five tonic. Scales show the key signature in both orders, and in Note Ninja and Chime Heist the right answer follows it (a B in F major is B♭). First 5 + Random is the game exactly as it has always been. Each level keeps its own rules (timing, fading names, read-ahead, lives, the alarm).

Each scale is written for the student's own instrument, e.g. Concert E♭ is **F Major** for trumpet, clarinet and tenor sax, **C Major** for alto and bari sax, **B♭ Major** for horn.

**Starting notes.** The table at the top of `shared/scales.js` lists the written note every scale starts on, for every instrument, like `trumpet: { Bb: 'C4', Eb: 'F4', F: 'G3', Ab: 'Bb3' }`. These should match the GMEA scale sheets. To move a scale an octave, change that one note (e.g. `'Bb3'` to `'Bb4'`).

**Where progress goes.** Every combination saves under its own key, in the usual shape (`games[key][instrument][level]`):

| NOTES | ORDER | Progress key | Notes |
|---|---|---|---|
| First 5 | Random | `<game>` | the original key: every star from before scales still counts here |
| First 5 | Scale Order | `<game>:order-first5` | new |
| Concert B♭ / E♭ / F / A♭ | Scale Order | `<game>:scale-Bb` … `:scale-Ab` | the original SCALES keys |
| Chromatic | Scale Order | `<game>:scale-chrom` (Chime Heist: `chime-heist:chromatic`) | the original keys |
| Concert B♭ / E♭ / F / A♭ | Random | `<game>:random-Bb` … `:random-Ab` | new |
| Chromatic | Random | `<game>:random-chromatic` (Chime Heist: `chime-heist:full`, its old FULL RANGE) | new (Chime Heist: kept) |

`Arcade.store.allStars(instrument, game)` adds up every one of these (and every other game's keys), and is what the arcade floor ("Hi-score: 31 ★ all modes", plus "Modes played: 4 of 12") and the Select Player card show.

**Testing:** in `?demo`, keys 1–5 still play the first five notes; with any NOTES choice, hold **Space** to play the note the game is asking for.

## Note Checker: full range

The Note Checker's buttons at the top pick **First 5** (what the games' random mode uses), a scale (**B♭, E♭, F, A♭**: that scale up and down with its key signature, "11 of 15 notes"), **Chromatic**, the student's whole chromatic scale, or **Articulation**. Scales and Chromatic use the instrument chosen on Select Player (no extra question).

- **Articulation** counts every attack the microphone catches, in big numbers with a flash, plus the note name (or "Hit!" on the snare) and how many per second. Play the same note again and again, "ta ta ta ta"; hold one long note and it says so. **Reset** starts over. This is the way to check attack detection on real instruments (Showtime Malfunction uses the same detector). It is the only Note Checker mode for the Snare Drum. In `?demo`: tap **Space**, tap **W**, hold **S**.

- **The ranges** come from the **GMEA All-State Middle School Chromatic Scale sheets**. They live in `MEMBERS` in `shared/instruments.js`: each instrument's lowest and highest written note, and `sounds`, how many half steps it sounds below what's written (bells: −24, two octaves higher). If GMEA changes a sheet, change it there. The games are not affected.
- **The octave matters.** A note turns gold only when it's played in the octave written on the staff. Playing a low D doesn't count for the high D; the page says "That's a D, but an octave lower. Try the higher one." If the microphone hears a note a whole octave outside the instrument's range (common with tubas on built-in mics), it's moved into the range and counts.
- **Going down** shows the same scale descending, with flats. Notes found going up stay found.
- **Testing without an instrument** (`?demo`): in Full range, **↑/↓** pick a note and holding **Space** plays it; **Shift+Space** plays it an octave low.

## The 3D arcade floor

On devices that can do it, the home page shows real 3D cabinets (three.js). Everything students read or press (game name, description, hi-score, START, the arrows and lights) is still regular page content on top of the 3D picture.

- **2D fallback.** The flat cabinets are still there. The page switches to them by itself when the device has no WebGL, when three.js can't load, or when the device is too slow. The 3D view first lowers its quality (sharper pixels off, no haze, no sway); if frames are still slow (averaging over 40 ms for a few seconds), it switches to 2D.
- **Force 2D:** add `?flat` to the address, e.g. `index.html?flat` or `index.html?demo&flat`.
- **Only what's needed.** The lobby and ALL GAMES are flat pictures (no 3D at all), so three.js loads only when a zone opens. Inside a zone (and the Full Arcade), only the front cabinet and its neighbors are full 3D models; one farther away is a flat picture, cabinets too far round to be seen aren't built at all, a quick spin from the jump strip builds only where it starts and ends, and walking back to the lobby throws the zone's cabinets away. Compared with the old 13-cabinet aisle, a zone is ready about twice as fast and uses about half the memory.
- **For testing only:** `?keep3d` stops the automatic switch to 2D, so you can see the 3D view on a slow computer. `?fps` shows the average frame time in the corner (under 40 ms is fine; the page aims for about 17–33 ms).
- **Why three.js r149:** it's the last version with a plain `three.min.js` that works from a `<script>` tag and when you open the page by double-clicking. Newer versions need JavaScript modules, which break on local files. Don't update it without checking that.

## Try it on your computer

Open `index.html` in **Chrome** by double-clicking it. Chrome allows the microphone on local files. Safari does not, so test on iPad only after the site is hosted.

**Test without an instrument:** add `?demo` to the end of the address, e.g. `.../index.html?demo`. Holding keys **1–5** "plays" the five notes, and all levels are unlocked.

## Put it online (GitHub Pages)

The arcade lives at **https://bandarcade.org**. Every address in the site is relative (`shared/…`, `../index.html`), so
the same files also work from a subfolder (`https://<your-username>.github.io/band-arcade/`), from
`python3 -m http.server` and from a double-clicked file. Nothing has to change if the address changes again.

1. Create a free GitHub account, then a new **public** repository named `band-arcade`.
2. On the repository page choose **Add file → Upload files**. Drag in everything inside this folder (keep the folder structure), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set Source to **GitHub Actions**. The workflow in
   `.github/workflows/pages.yml` then publishes the site every time something is saved to `main`.
4. After about a minute your arcade is live at `https://<your-username>.github.io/band-arcade/`.
5. **Your own domain (optional):** in **Settings → Pages → Custom domain**, type the domain (ours is `bandarcade.org`),
   save, and tick **Enforce HTTPS** once it's offered; at your domain registrar, point the domain at GitHub Pages
   (GitHub's "Managing a custom domain" page lists the records). The setting is kept in the repository's settings, so
   every publish keeps it. (The `CNAME` file in the repository says the same domain; with the GitHub Actions source it
   isn't needed, but it does no harm.) Moving to a new address starts students fresh there: see *Progress is saved per
   web address* at the top.
6. Open that link on a school iPad and a Chromebook before sharing it. District web filters sometimes block new domains
   or `github.io`; if so, ask IT to allow your address.

Every later change you save to the repository goes live at the same link within about a minute.

**The version number (why updates show up right away).** Browsers keep the arcade's files for a while, so after an
update a student could get the old game, or a mix of old and new files that breaks a page. Every time `main` changes,
the publishing workflow stamps a new **site version** (the commit's short id) into `shared/version.js` and onto every
file each page loads (`game.js?v=a1b2c3d`), so browsers fetch the new files at once; a page that was itself cached
reloads once to catch up. You never set it: in the repository it just says `'dev'` (which switches it off when you open
the arcade from your own computer). Sounds keep their own number, `SOUNDS_VERSION` at the top of `shared/sounds.js`.

## One arcade, one look (the UI kit)

Every game uses the same pieces, so the arcade feels like one place:
- **The pause button** is top-left, where "← Arcade" is on the level select. Esc and P also pause, and so does
  hiding the tab. The pause menu is always RESUME · RESTART · SETTINGS · BACK TO LEVELS; BACK TO LEVELS asks first,
  because the level's progress would be lost.
- **The results screen** has the stars (they pop in one by one), a big title, 2–4 stat tiles, a NEW BEST!
  ribbon, the game's own extras (trouble spots, missed notes…), and then NEXT · TRY AGAIN · LEVELS in that order.
- **The Settings panel** opens from every top bar (the speaker button), the pause menu and the lobby. It has
  Sound on/off, Music, Effects, Motion (animations on/off) and Mic sensitivity with a live level meter, plus the
  game's own options. Every setting is remembered on the device and shared by every game.
- Level intros, yes/no questions (never a browser pop-up) and short toasts all use the same pieces too.

The rules (colors, fonts, headings, buttons, words, motion, sound) are one page: **docs/STYLE.md**. To see every
piece and every game's level select, pause menu, settings and results side by side, open **docs/gallery.html**
(not linked for students). Refresh its pictures with `cd tests && GALLERY=1 npx playwright test game-runs --project=chromium`.

## The app (Home Screen, offline)

Band Arcade can be installed like an app: on an iPad, Safari's **Share → Add to Home Screen**; on a Chromebook, the
**Install** icon at the right end of Chrome's address bar. It opens full screen with its own icon, starts fast, and
keeps working on weak Wi-Fi or none: every game, the avatar editor and saved progress work offline (the leaderboard
says it's taking a break). Pages and scripts are stored when the app is installed; sounds and pictures the first
time they're used.

- **Updates** still arrive at once: pages are always checked with the server when there's a connection. If the app
  was left open during an update, a small **"New version ready — tap to update"** banner appears (never during a
  game); ignored, the update is applied the next time the app opens. A page never mixes files from two versions.
- **The INSTALL THE APP button** (the lobby's sound panel) is off for now: `SHOW_INSTALL_PROMPT` in
  `shared/teacher-settings.js`. Turn it on once the site is at its final address: an installed app keeps the progress
  of the address it was installed from. Installing by hand works either way.
- **iPad progress:** a Home Screen app on an iPad has its OWN storage, separate from Safari. Its first launch asks for
  a Backup Code ("Bring your progress": make it in Safari with Backup / Restore, paste it in the app) or
  **Start fresh**.
- **Microphone:** iPadOS allows the microphone in Home Screen apps. If a device refuses, the microphone panel
  suggests opening Band Arcade in Safari instead.
- The offline copy exists only on the published site (not from your computer), and only for the version that's
  live. You never manage it: the publishing workflow writes the list of files into `sw.js` (`tools/stamp-version.py`).
- The app's icons are `shared/app/` (drawn from `tools/app-icon.html`); its name and colors are in
  `manifest.webmanifest`.

## Adding a game

1. Copy the `ghost-notes/` folder and rename it, e.g. `echo-notes/`.
2. Keep the `<script>` tags for `../shared/*.js` in its `index.html`. Replace `game.js` (and `levels.js` if needed).
3. At the top of `game.js`, start with `const inst = Arcade.requireInstrument('echo-notes'); if (!inst) return;` and `Arcade.mountTopbar(inst, '', 'echo-notes');`. That sends students without an instrument to Select Player, and wires up the top bar.
4. Add an entry to `shared/games.js` (see the comment at the top of that file), with its zone(s) (`zones: ['technique-lab']`) and, if it doesn't suit every instrument, a `fit` line. That's all the lobby, the zone and ALL GAMES need.
5. Save progress with `Arcade.store.setLevel(gameId, instrumentId, level, {stars, best})`, which lets the arcade floor show the hi-score automatically.
6. A game whose progress depends on the exact instrument (Button Masher's fingerings) sets `byMember: true`: it saves under the member id (`trumpet`, `clarinet`…) and the hi-score reads it. `noPlay` sends instruments the game can't use to another game (percussion → Chime Heist); with `block: true` those instruments can't open the game at all: they go back to Select Player, which dims their tiles and shows the message (Sustain Speedway: bells and snare).
7. The **Snare Drum** is an unpitched player (`pitched: false` in `shared/instruments.js`: no notes, only attacks). A game that works without pitch sets `unpitched: true` in `shared/games.js` (Showtime Malfunction, the Note Checker's ARTICULATION test) and checks `inst.pitched === false`; every other game automatically sends a snare player back to Select Player with "Snare drummers: try Showtime Malfunction! Pick a pitched instrument for this game.", and on those games the snare tile is dimmed and the arcade floor links to Showtime Malfunction instead of a hi-score.
8. A game for one instrument only (like Chime Heist) sets `player: '<group id>'` in `shared/games.js`: START skips Select Player, the saved instrument is left alone, and the hi-score reads that player's progress. A game that needs no instrument at all (Ancient Ninja Scrolls) uses `player: 'all'`.

## Marquees (the lit signs)

Every cabinet's marquee is an animated picture drawn in code (`shared/marquees.js`) with the game's title on top. The same drawing is used by the 3D cabinets, the 2D cabinets (`?flat`) and the sign above SELECT YOUR PLAYER.

| Game | Scene |
|---|---|
| Note Checker | glowing VU meters and equalizer bars bouncing gently (amber/green) |
| Ghost Notes | a foggy, moonlit manor on a hill; little ghosts drift behind the letters; fog along the bottom |
| Note Storm | rolling storm clouds; a forked lightning bolt every few seconds lights the clouds near it; faint rain |
| Note Ninja | a dojo roofline under a big red moon; cherry-blossom petals; swaying paper lanterns |
| Chime Heist | a vault door with a slowly turning combination dial; green and red lasers sweeping |
| Ancient Ninja Scrolls | an unrolled scroll, mountain temples, lanterns in the Band Ninja belt colors |
| Button Masher | a fighting-game VS burst, two fighters facing off, sparks between their fists |
| Neon Face-Off | an air hockey table in perspective; a glowing puck with a light trail |
| Showtime Malfunction | a stage curtain, a row of bulbs (a few broken, two flickering slowly), red animatronic eyes blinking |
| Sustain Speedway | a synthwave sunset, a grid road rushing toward the horizon, speed lines |
| Lost Signal | deep space: a starfield, two radar screens with slow sweeps, a glowing waveform |
| Dojo Duel | a night dojo: crossed bamboo swords, belt ribbons, swaying paper lanterns |
| Vanishing Ink | an unrolled parchment scroll with brush-ink notes (the last one slowly fades and returns), ink splashes with neon rims, a falling drop; the title in a brush script |
| Arcade Quest | an 8-bit night landscape, a giant microphone looming behind the title, pixel static |
| any new game | its neon color in a slowly moving gradient, with sparkles |

- **Only the front cabinet's marquee moves** (20 frames a second), and the one on Select Player. Every other marquee shows a still frame. Nothing moves while the tab is hidden, or when the device asks for reduced motion (then every marquee is a still frame).
- **Readable first:** the title always has a dark outline and a soft dark haze behind it, so the scene never gets in the way.
- **No flashing:** nothing on a marquee flashes more than 3 times a second. Lightning, flickering bulbs and sparks light up only part of the sign and fade in and out; lightning strikes at most once every 1.2 seconds (3.2 s by default).
- **Change a game's marquee** in `shared/games.js`: `marquee: {scene: 'storm', colors: ['yellow-hi', 'purple-ink', 'purple-hi'], every: 3.2}`. `scene` picks the picture, `colors` are theme colors (the list each scene uses is in `shared/marquees.js`), `speed` makes it faster or slower (1 = normal), `still` picks the moment shown as the still frame. Leave `marquee` out for the default.
- **Title only, as big as it fits (every marquee):** a marquee shows ONLY the game's name, never a subtitle, tagline, "2 PLAYER" or any other small text (2-player and other info goes on the lobby's cards). The name is drawn as large as it can be: one line or two stacked lines (e.g. "SUSTAIN SPEEDWAY" or "SUSTAIN / SPEEDWAY"; a word is never split, not even at a hyphen: "NEON / FACE-OFF"), whichever gives bigger letters, with the glow, outline and slant counted and an even margin all round. It is measured only after the sign's font has loaded, and fitted again when the screen size changes or a font arrives. New games get this automatically. To allow only certain line breaks, list them: `titleLayouts: [['SHOWTIME MALFUNCTION'], ['SHOWTIME', 'MALFUNCTION']]`.
- **Your own art:** put `shared/marquees/<game-id>.png` (or `.webp`) there and it replaces the drawn scene (the title is still drawn on top), or `<game-id>-full.png` to replace the whole sign, title included. Recommended size 1200 × 300. See [`shared/marquees/README.md`](shared/marquees/README.md).
- **A new scene:** add it to `SCENES` in `shared/marquees.js` (a `draw(ctx, W, H, t, colors)` function, its default `colors` and a `still` moment). Keep to the rules at the top of that file: theme colors only, and no flashing.

## Adding a cabinet

Every game gets its own cabinet on the arcade floor. A game with no `cabinet` entry still works: it gets the plain "classic" cabinet in its `color`, with a blinking PRESS START screen.

To give it a look, add a `cabinet` field to its entry in `shared/games.js` and mix and match the parts that already exist:

```js
cabinet: {shape: 'storm', trim: 'green', trim2: 'pink', marquee: 'shade', screen: 'insert'},
```

- `shape`: the silhouette: `'classic'`, `'haunted'` (peaked roof, tombstone screen), `'soundcheck'` (small, domed), `'storm'` (slanted top, lightning notches), `'dojo'` (pagoda roof), `'vault'` (round vault-door top, combination-dial door, laser beams), `'temple'` (temple gate with belt-color lanterns), `'versus'` (wide two-player fighting cabinet: two joysticks, split red/blue face), `'rink'` (rounded top, two players, a puck light on top)
- `trim` / `trim2`: the neon tubes: `'pink'`, `'cyan'`, `'yellow'`, `'purple'`, `'amber'`, `'green'`, `'red'`, `'white'`, `'blue'`
- `marquee`: the lettering of the title on the marquee (the picture behind it is the game's own `marquee` entry: see *Marquees*): `'bungee'`, `'haunt'` (drippy), `'pixel'`, `'shade'` (3D block letters), `'versus'` (slanted), `'faceoff'` (neon tubes, two colors), `'showtime'` (two lines, one burnt-out letter), `'speedway'` (slanted), `'quest'` (pixel), and `'dojo'`, `'heist'`, `'scroll'` (the plain display font). In 2D it also sets the sign's frame shape.
- `screen`: the attract-mode loop the front cabinet plays: `'ghost'`, `'tuner'`, `'storm'`, `'ninja'`, `'heist'`, `'scrolls'`, `'versus'`, `'hockey'` (a tiny air hockey table), `'insert'`

For a brand-new look:

- **New silhouette:** add an entry to `SHAPES` in `shared/cabinets.js`. It's drawn on a 300 × 600 grid: `outline` (whole cabinet), `face`, `bezel`, `panel`/`lip` (control panel), joystick and button positions, coin `door`, and `slots` for where the marquee, screen and START button go. Copy `classic` and change the numbers.
- **New attract screen:** add an entry to `SCREENS` in `shared/cabinets.js` (`html(game, frame)` draws it; `period` redraws it every so many ms) and style it in `shared/cabinets.css` under `.attract` so only the front cabinet moves. Keep it small and light, and let the reduced-motion rule at the bottom of that file stop it.
- **3D cabinet:** add a `cabinet3d` field next to `cabinet`, e.g. `cabinet3d: {profile: 'haunted', body: 'cab-side'}`. Leave it out and the game gets a 3D cabinet that matches its 2D one. `profile` picks the side silhouette (`'classic'`, `'haunted'` with a peaked roof, `'soundcheck'` short and domed, `'storm'` with a raked top and lightning fins, `'dojo'` under a pagoda roof, `'vault'` with a round vault door on top, `'temple'` under a temple gate, `'versus'` wide with two joysticks and a lit VS sign, `'rink'` with a glowing puck on top); colors come from `trim`/`trim2`. A new silhouette goes in `PROFILES` in `arcade3d.js`: a list of side-view points (depth, height in meters, front is bigger depth) that is extruded into the body, plus where the marquee, screen, control panel, coin door and START sit on it.
- **New marquee lettering:** add the name to `MARQUEES` in `shared/cabinets.js` (and a `.mq-<name>` frame style in `shared/cabinets.css` if the 2D sign needs a special shape), and its font to `FONTS` in `shared/marquees.js`. A new font goes in `shared/fonts/` as a subset `.woff2` with its license, declared in `shared/fonts.css`.
- **New marquee picture:** see *Marquees* above.

## Known limits

- Pitch matching accepts the right note **in any octave**. Low brass is often read an octave off on built-in mics, so this is on purpose.
- Sounds start only after the first tap on each page (a browser rule), and an iPad with the silent switch on stays silent. While a sound plays, a listening game ignores the microphone (see Sounds).
- Other players nearby can be heard. Turn Mic sensitivity (on the Note Checker) toward *Less* in busy practice rooms.
- The arcade floor has no instrument picker on purpose: students pick a game first, then a player.
- Progress is saved in each device's browser, for each web address. Clearing browser data, using a different device or opening the arcade from a different address starts fresh, unless you restore a backup code (BACKUP / RESTORE on the arcade floor's speaker panel or the Select Player card; Arcade Quest also has its own short save code).
