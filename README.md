# Band Arcade

Practice games for beginning band that listen through the device microphone. Built for school iPads (Safari) and Chromebooks (Chrome), for practice-room and home use.

## What's in here

```
index.html            The arcade floor (home page): pick a GAME from a carousel of cabinets
arcade.css / .js      Arcade floor look and behavior (carousel, swipe, arrow keys, indicator lights)
arcade3d.js           The 3D arcade floor (three.js): cabinets built in code, glossy floor, haze
shared/vendor/        three.js r149 (three.min.js) and its MIT license. Loaded only by the home page
select-player/        "Select Player": pick your instrument for the game you chose, then play
shared/               The engine every game uses
  instruments.js      Instrument groups, transpositions, first five notes, and each group's instruments
                      with their full chromatic ranges (single source of truth)
  pitch.js            Microphone + pitch detection (YIN), "note held" events, demo keys
  mic-gate.js         The "Turn on the microphone" prompt and fix-it messages
  ui.js               Staff notation (whole staff or single notes), ghost mascot, stars, top bar
  storage.js          Saved instrument, mic sensitivity, and progress (on this device only)
  scales.js           The GMEA scales (Concert B♭, E♭, F, A♭, Chromatic) for every instrument, and the starting-note table
  modes.js            RANDOM NOTES / SCALES picker every game shows on its level screen
  games.js            The list of games on the arcade floor, and how each cabinet looks
  belts.js            The 10 Band Ninja belts (names and colors), shared by Note Ninja and Ancient Ninja Scrolls
  sfx.js              Sound effects for the arcade floor, Select Player and the mic-free games, and Chime Heist's
                      bell tones (made in code, no audio files)
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
button-masher/        Game 6: fingerings and slide positions, no microphone; a versus fighting game
  fingerings.js       THE fingering table: every accepted fingering for every instrument. Fix fingerings here
  levels.js           The 8 rivals (Squeaky Reed … The Conductor): note pools, notes per match, time, rival health
  diagrams.js         The instrument diagrams (flute, oboe, clarinet, sax, bassoon, valves, trombone slide)
  game.js             Game logic: the match, the rivals and the fighter, the CHART view
```

No build step and no installs. It's plain HTML, CSS and JavaScript, so any static web host can serve it.

## How students move through it

1. **Arcade floor** (`index.html`): choose a game. Turn the cabinets with the ◀ ▶ buttons, a swipe, the ←/→ keys, or the lights under the carousel. Press **START** on the front cabinet.
2. **Select Player** (`select-player/index.html?game=<game-id>`): choose an instrument. If this device already has one, a big **Continue as …** button comes first. Choosing goes straight into the game.
3. **The game.** The instrument name in the top bar opens Select Player again (to switch instruments); **← Arcade** goes back to the floor, turned to that game.

Opening a game with no instrument saved sends the student to Select Player for that game.

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
- Random notes and every scale work like the other games; progress is saved under `note-ninja` and `note-ninja:scale-…`.
- In `?demo` all belts are unlocked and the answer shows in small text under the buttons.

## Chime Heist

A **mallet keyboard** game for percussionists, and it **doesn't use the microphone**. A note of the vault code appears on the security terminal; the student strikes the matching bar on the chime lock, an on-screen bell kit (Orchestral Bells, written G3–C6). Every bar rings at its real pitch, two octaves above written, like real bells.

- **Always the Bell Kit.** START on the arcade floor goes straight into the game (no Select Player), and it never changes the instrument saved for the other games.
- **The bell kit:** natural bars on the lower row, sharps/flats raised above in groups of 2 and 3, bars shorter as the pitch goes up. Tap, click or use a pen; two fingers can strike at once. On a Chromebook: **← →** move the mallet, **↑ ↓** switch rows, **Enter** or **Space** strikes. On a phone held upright it asks you to turn it sideways.
- **Modes:** FIRST FIVE (B♭ C D E♭ F), FULL RANGE (any bar, G3–C6), SCALES (Concert B♭, E♭, F, A♭, up then down with the key signature) and CHROMATIC (up in sharps, down in flats). The last choice is remembered.
- **Rules:** only the exact bar counts, octave included ("Right note, wrong octave!" is a mistake). In scales the key signature counts: a B in F major is the B♭ bar. A wrong bar still rings, sets off the alarm, and the note stays. Running out of time: a guard's flashlight sweeps by, the right bar lights up, and the code moves on.
- **Alarm meter** instead of lives: each mistake or miss fills one segment. Full = "CAUGHT! The alarm went off." and the vault isn't cleared. The **silent streak** multiplies points (×2 at 5 in a row, up to ×4).
- **Vaults** (levels) are in `chime-heist/levels.js`, one line each: notes, seconds per note, bar labels (`all`, `faded`, `c` for C bars only, `none`), notes on the terminal at once (read ahead from the Museum Diamond Vault on), alarm segments, and the treasure behind the door. Stars: 3 = no mistakes and no misses, 2 = 90%, 1 = 80% without setting off the alarm (unlocks the next vault).
- Progress: `chime-heist` (First five), `chime-heist:full`, `chime-heist:scale-Bb` … `chime-heist:scale-Ab`, `chime-heist:chromatic`, all under the `bells` player. The arcade floor's hi-score counts First five and shows "Other modes: n of 6 started".
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

- **Which instrument.** It uses the saved instrument, and for groups with several instruments (Flute/Oboe/Tone Bells, Trumpet/Clarinet/Tenor Sax, Bass Clarinet/Baritone T.C., Trombone/Euphonium/Bassoon) it asks "Which instrument do you play?" (the same saved answer the Note Checker and scales use). Stars are saved **per instrument**, because a trumpet and a clarinet in the same group finger differently. Bells and Colored Tone Bells get "Percussion: try Chime Heist!" with a link, on the arcade floor and in the game.
- **The diagrams.** Every key, valve and slide position is a real button: tap to press it (filled = pressed), tap again to let go. The oboe's and bassoon's first key cycles open → half-hole → closed. **CLEAR** resets, **STRIKE!** checks it. Trombone: tapping a slide position strikes right away. The **COMBO** bar shows what's pressed as fighting-game input icons. Woodwind diagrams need a phone turned sideways; brass and trombone fit a phone upright.
- **Keyboard (Chromebooks):** brass **1–4** press valves (horn: **T** or **4** is the thumb trigger), trombone **1–7** pick a position, **Enter** = STRIKE!, **Backspace** = CLEAR. Woodwind keys are tap/click (Tab and Space also work).
- **Rivals** (levels, `button-masher/levels.js`): Squeaky Reed (first three notes, note name shown, the right keys glow faintly after 5 s), Captain Clef (first five, name shown), Tempo Tornado (Concert B♭ scale), Sir Sharp (E♭), Lady Flat (F), Dr. Dissonance (A♭), The Metronome (all four scales mixed) and The Conductor (all four, fastest, most health). Scale levels show the key signature and use the same octave as the scales in every other game. Notes come in random order, never the same note twice in a row. Each line of the table sets the note pool, notes per match, seconds per note and rival health.
- **Rules:** a wrong combo costs energy, the right keys glow green for a moment, and the same note stays for one more try. A timeout costs energy and moves on. Win by landing enough hits before your energy (5) runs out or the notes run out ("Time over"). Stars: 3 = no mistakes, 2 = one or two, 1 = won. Winning unlocks the next rival. Points get a speed bonus and a combo multiplier (×2 at 5 in a row, up to ×4).
- **CHART** (on the rival screen, never during a match): every note in the game for the chosen instrument, grouped by rival/scale, each with its staff note, name and the main fingering filled in on the diagram, with other accepted fingerings listed under it. Use it to study, and to check the fingerings.
- In `?demo` every rival is unlocked, the right keys have a faint dashed outline, and the answer is written under the diagram.

**Fixing a fingering (`button-masher/fingerings.js`).** Each instrument lists its written notes, and for each note every fingering the game accepts, main one first: `'D4': ['1-3']`, `'A4': ['1-2', '3']`, trombone `'F3': [1, 6]`, clarinet `'B4': ['Th Reg 1 2 3 LE | 4 5 6', …]`. The key names are explained at the top of the file (they're the labels on the diagrams). A combo is right only when it matches one of the listed fingerings exactly. To add an alternate, add it to the list; to change the main one, put it first. Trumpet and Baritone T.C. share a table, as do the two clarinets and the three saxophones. The comment block at the top of the file lists the fingerings I wasn't fully sure of: check those against the 6th Grade Honor Band charts first.

## Sounds

`shared/sfx.js` makes every sound in code (no audio files) and always respects the SOUND button. It's used on the arcade floor, Select Player, Note Ninja, Chime Heist, Ancient Ninja Scrolls and Button Masher only; games that listen to the microphone never load it. (There is no separate `sounds.js` or sound-file folder: every event below lives in `EVENTS` in `shared/sfx.js`.)

| Event | When | Sound (falls back to) |
|---|---|---|
| `select-<game>` | START on the arcade floor | the game's own sound if it has one, else the coin |
| `level-start` | a level begins | three rising notes |
| `note-hit` | a correct note | the blip |
| `note-wrong` | a wrong note | a low buzz |
| `note-missed` | time ran out | a falling tone |
| `level-complete` / `level-failed` | results | a rising / falling arpeggio |
| `star-earned` | more stars than before | a sparkle |
| `new-high-score` | a new best score | a quick fanfare |
| `ninja-slash` | Note Ninja: a correct answer | a swish and a chirp |
| `ninja-combo` | Note Ninja: every 5 in a row | a fast run up |
| `belt-earned` | Note Ninja: a new belt unlocked | a gong and a run |
| `belt-diamond` | Note Ninja: the Diamond belt unlocked | the belt sound plus a sparkle (belt-earned) |
| `tumbler-click` | Chime Heist: a correct bar (quiet, under the bell) | two tiny clicks (blip) |
| `alarm-buzz` | Chime Heist: a wrong bar or a timeout | a short two-tone buzz (blip) |
| `caught` | Chime Heist: the alarm meter is full | a siren wail (blip) |
| `vault-open` | Chime Heist: a vault is cracked and the door swings open | a heavy clunk and a shimmer (blip) |
| `vault-unlocked` | Chime Heist: a new vault becomes available | a rising chime (blip) |
| `answer-right` / `answer-wrong` | Ancient Ninja Scrolls: an answer | two bright notes / a soft falling tone (blip) |
| `scroll-unroll` | Ancient Ninja Scrolls: a term mastered | a paper swish and a run up (blip) |
| `gong` | Ancient Ninja Scrolls: the Belt Exam is turned in | a low gong (blip) |
| `test-ready` | Ancient Ninja Scrolls: a TEST READY badge | a warm fanfare (blip) |
| `fight-start` | Button Masher: "ROUND 1… FIGHT!" | two short beats and a long one (blip) |
| `key-press` | Button Masher: each key, valve or slide tap | a soft click (blip) |
| `special-move` | Button Masher: a correct STRIKE! | a rising zap and a sparkle (blip) |
| `combo-streak` | Button Masher: every 5 correct in a row | a fast run up (blip) |
| `rival-counter` | Button Masher: a wrong combo or a timeout | a cartoon "boing" (blip) |
| `ko` | Button Masher: the rival is defeated | a falling whoosh and a fanfare (blip) |

Chime Heist's bars use `Arcade.Sfx.bell(soundingMidi)`: a synthesized bell (bright attack, quick decay) at the exact pitch, so every bar is in tune. It is never replaced by an audio file, and it is silent when SOUND is off.

Any event without its own sound falls back to the blip (`select-…` events fall back to the coin). New events go in `EVENTS` in `shared/sfx.js`.

## Random notes and scales

Every game has two modes, picked with the big buttons on its level screen (remembered per game):

- **Random notes**: the game as it has always been, with the first five notes in random order. Stars saved before scales existed stay right where they were.
- **Scales**: pick **Concert B♭, E♭, F, A♭** or **Chromatic**. The notes come in scale order, up then down, with the key signature on the staff. Levels keep their difficulty (fading names and time in Ghost Notes; speed, notes on screen and lives in Note Storm). Each scale has its own levels and stars; the scale buttons show them (e.g. "E♭ ★ 9/24"). Students in a group with several instruments are asked which one they play first, because the written scale depends on it.

Each scale is written for the student's own instrument, e.g. Concert E♭ is **F Major** for trumpet, clarinet and tenor sax, **C Major** for alto and bari sax, **B♭ Major** for horn.

**Starting notes.** The table at the top of `shared/scales.js` lists the written note every scale starts on, for every instrument, like `trumpet: { Bb: 'C4', Eb: 'F4', F: 'G3', Ab: 'Bb3' }`. These should match the GMEA scale sheets. To move a scale an octave, change that one note (e.g. `'Bb3'` to `'Bb4'`).

**Where progress goes.** Random notes: `games['ghost-notes'][instrument][level]`, as always. Scales: the same shape under `ghost-notes:scale-Eb`, `note-storm:scale-chrom`, and so on. The home page's hi-score shows random-mode stars and a short "Scales: 3 of 5 started".

**Testing:** in `?demo`, keys 1–5 still play the first five notes; in Scales, hold **Space** to play the note the game is asking for.

## Note Checker: full range

The Note Checker's buttons at the top pick **First 5** (what the games' random mode uses), a scale (**B♭, E♭, F, A♭**: that scale up and down with its key signature, "11 of 15 notes") or **Chromatic**, the student's whole chromatic scale. Full range asks "Which instrument do you play?" when a player group has more than one (for example Trumpet / B♭ Clarinet / Tenor Sax) and remembers the answer.

- **The ranges** come from the **GMEA All-State Middle School Chromatic Scale sheets**. They live in `MEMBERS` in `shared/instruments.js`: each instrument's lowest and highest written note, and `sounds`, how many half steps it sounds below what's written (bells: −24, two octaves higher). If GMEA changes a sheet, change it there. The games are not affected.
- **The octave matters.** A note turns gold only when it's played in the octave written on the staff. Playing a low D doesn't count for the high D; the page says "That's a D, but an octave lower. Try the higher one." If the microphone hears a note a whole octave outside the instrument's range (common with tubas on built-in mics), it's moved into the range and counts.
- **Going down** shows the same scale descending, with flats. Notes found going up stay found.
- **Testing without an instrument** (`?demo`): in Full range, **↑/↓** pick a note and holding **Space** plays it; **Shift+Space** plays it an octave low.

## The 3D arcade floor

On devices that can do it, the home page shows real 3D cabinets (three.js). Everything students read or press (game name, description, hi-score, START, the arrows and lights) is still regular page content on top of the 3D picture.

- **2D fallback.** The flat cabinets are still there. The page switches to them by itself when the device has no WebGL, when three.js can't load, or when the device is too slow. The 3D view first lowers its quality (sharper pixels off, no haze, no sway); if frames are still slow (averaging over 40 ms for a few seconds), it switches to 2D.
- **Force 2D:** add `?flat` to the address, e.g. `index.html?flat` or `index.html?demo&flat`.
- **For testing only:** `?keep3d` stops the automatic switch to 2D, so you can see the 3D view on a slow computer. `?fps` shows the average frame time in the corner (under 40 ms is fine; the page aims for about 17–33 ms).
- **Why three.js r149:** it's the last version with a plain `three.min.js` that works from a `<script>` tag and when you open the page by double-clicking. Newer versions need JavaScript modules, which break on local files. Don't update it without checking that.

## Try it on your computer

Open `index.html` in **Chrome** by double-clicking it. Chrome allows the microphone on local files. Safari does not, so test on iPad only after the site is hosted.

**Test without an instrument:** add `?demo` to the end of the address, e.g. `.../index.html?demo`. Holding keys **1–5** "plays" the five notes, and all levels are unlocked.

## Put it online (GitHub Pages)

1. Create a free GitHub account, then a new **public** repository named `band-arcade`.
2. On the repository page choose **Add file → Upload files**. Drag in everything inside this folder (keep the folder structure), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set Source to **Deploy from a branch**, set Branch to **main** and **/(root)**, then **Save**.
4. After about a minute your arcade is live at `https://<your-username>.github.io/band-arcade/`.
5. Open that link on a school iPad and a Chromebook before sharing it. District web filters sometimes block `github.io`; if so, ask IT to allow your address.

Every later change you save to the repository goes live at the same link within about a minute.

## Adding a game

1. Copy the `ghost-notes/` folder and rename it, e.g. `echo-notes/`.
2. Keep the `<script>` tags for `../shared/*.js` in its `index.html`. Replace `game.js` (and `levels.js` if needed).
3. At the top of `game.js`, start with `const inst = Arcade.requireInstrument('echo-notes'); if (!inst) return;` and `Arcade.mountTopbar(inst, '', 'echo-notes');`. That sends students without an instrument to Select Player, and wires up the top bar.
4. Add an entry to `shared/games.js` (see the comment at the top of that file).
5. Save progress with `Arcade.store.setLevel(gameId, instrumentId, level, {stars, best})`, which lets the arcade floor show the hi-score automatically.
6. A game whose progress depends on the exact instrument (Button Masher's fingerings) sets `byMember: true`: it saves under the member id (`trumpet`, `clarinet`…) and the hi-score reads it. `noPlay` sends instruments the game can't use to another game (percussion → Chime Heist).
7. A game for one instrument only (like Chime Heist) sets `player: '<group id>'` in `shared/games.js`: START skips Select Player, the saved instrument is left alone, and the hi-score reads that player's progress. A game that needs no instrument at all (Ancient Ninja Scrolls) uses `player: 'all'`.

## Adding a cabinet

Every game gets its own cabinet on the arcade floor. A game with no `cabinet` entry still works: it gets the plain "classic" cabinet in its `color`, with a blinking PRESS START screen.

To give it a look, add a `cabinet` field to its entry in `shared/games.js` and mix and match the parts that already exist:

```js
cabinet: {shape: 'storm', trim: 'green', trim2: 'pink', marquee: 'shade', kicker: 'New!', screen: 'insert'},
```

- `shape`: the silhouette: `'classic'`, `'haunted'` (peaked roof, tombstone screen), `'soundcheck'` (small, domed), `'storm'` (slanted top, lightning notches), `'dojo'` (pagoda roof), `'vault'` (round vault-door top, combination-dial door, laser beams), `'temple'` (temple gate with belt-color lanterns), `'versus'` (wide two-player fighting cabinet: two joysticks, split red/blue face)
- `trim` / `trim2`: the neon tubes: `'pink'`, `'cyan'`, `'yellow'`, `'purple'`, `'amber'`, `'green'`, `'red'`, `'white'`, `'blue'`
- `marquee`: the lettering: `'bungee'`, `'haunt'`, `'pixel'`, `'shade'`, `'dojo'`, `'heist'`, `'scroll'` (a hanging hand scroll), `'versus'` (slanted, outlined fighting-game letters on a split sign)
- `screen`: the attract-mode loop the front cabinet plays: `'ghost'`, `'tuner'`, `'storm'`, `'ninja'`, `'heist'`, `'scrolls'`, `'versus'`, `'insert'`

For a brand-new look:

- **New silhouette:** add an entry to `SHAPES` in `shared/cabinets.js`. It's drawn on a 300 × 600 grid: `outline` (whole cabinet), `face`, `bezel`, `panel`/`lip` (control panel), joystick and button positions, coin `door`, and `slots` for where the marquee, screen and START button go. Copy `classic` and change the numbers.
- **New attract screen:** add an entry to `SCREENS` in `shared/cabinets.js` (`html(game, frame)` draws it; `period` redraws it every so many ms) and style it in `shared/cabinets.css` under `.attract` so only the front cabinet moves. Keep it small and light, and let the reduced-motion rule at the bottom of that file stop it.
- **3D cabinet:** add a `cabinet3d` field next to `cabinet`, e.g. `cabinet3d: {profile: 'haunted', body: 'cab-side'}`. Leave it out and the game gets a 3D cabinet that matches its 2D one. `profile` picks the side silhouette (`'classic'`, `'haunted'` with a peaked roof, `'soundcheck'` short and domed, `'storm'` with a raked top and lightning fins, `'dojo'` under a pagoda roof, `'vault'` with a round vault door on top, `'temple'` under a temple gate, `'versus'` wide with two joysticks and a lit VS sign); colors come from `trim`/`trim2`. A new silhouette goes in `PROFILES` in `arcade3d.js`: a list of side-view points (depth, height in meters, front is bigger depth) that is extruded into the body, plus where the marquee, screen, control panel, coin door and START sit on it.
- **New marquee lettering:** add a `.mq-<name>` style in `shared/cabinets.css`, and add the name to `MARQUEES` in `shared/cabinets.js`. A new font goes in `shared/fonts/` as a subset `.woff2` with its license, declared in `shared/fonts.css`.

## Known limits

- Pitch matching accepts the right note **in any octave**. Low brass is often read an octave off on built-in mics, so this is on purpose.
- The listening games make **no sounds**. A sound effect would be picked up by the mic and counted as a note. Only the arcade floor, Select Player, Note Ninja, Chime Heist, Ancient Ninja Scrolls and Button Masher (which don't use the mic) make sounds (a whoosh when the cabinets turn, a coin drop on START, a blip when you pick an instrument, and an optional arcade-room hum). The **SOUND** and **AMBIENCE** buttons in the top corner turn them off; the device remembers the choice. Sound starts only after the first tap, and on an iPad with the silent switch on you won't hear it.
- Other players nearby can be heard. Turn Mic sensitivity (on the Note Checker) toward *Less* in busy practice rooms.
- The arcade floor has no instrument picker on purpose: students pick a game first, then a player.
- Progress is saved in each device's browser. Clearing browser data, or using a different device, starts fresh.
