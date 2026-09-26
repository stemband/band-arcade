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
  sfx.js              Sound effects for the arcade floor and Select Player (made in code, no audio files)
  cabinets.js / .css  The arcade cabinets (drawn in SVG + HTML, no images) and their attract-mode screens
  theme.css           Colors, type, buttons, overlays shared by every page
  fonts.css + fonts/  Fonts bundled with the site (no outside font service needed)
note-checker/         Shared tuner-style checker (every game links to it): FIRST 5 NOTES or FULL RANGE
ghost-notes/          Game 1: note reading with fading note names
  levels.js           Level design: counts, time per note, how visible the names are
  game.js             Game logic
note-storm/           Game 2: speed reading; notes march toward Tempo the robot, play each one to blast it
note-ninja/           Game 3: note names, no microphone; tap the name of the note on the scroll
  levels.js           The belts (White … Black): notes, time, letter guides, read-ahead. Rename or reorder freely
  levels.js           Level design: counts, march speed, notes on screen at once, names on or off
  game.js             Game logic (the staff is drawn once; only the notes move)
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
- **Belts** are the levels, White to Black, in `note-ninja/levels.js`. Each line is one belt; rename, reorder or recolor them to match your Band Ninja belts (colors are the `--belt-…` tokens in `shared/theme.css`). White belt uses the first three notes with letter guides on the staff; Blue and up are **read ahead**, with 2–4 notes on the staff answered left to right.
- **Scoring:** points for each note, a speed bonus, and a **combo** multiplier (×2 at 5 in a row, up to ×4) that resets on a mistake or a timeout. A wrong answer is a mistake and the note stays; running out of time is a miss, shows the name, and moves on. Stars: 3 = no mistakes and no misses, 2 = 90%, 1 = 80% (clears the belt and unlocks the next).
- Random notes and every scale work like the other games; progress is saved under `note-ninja` and `note-ninja:scale-…`.
- In `?demo` all belts are unlocked and the answer shows in small text under the buttons.

## Sounds

`shared/sfx.js` makes every sound in code (no audio files) and always respects the SOUND button. It's used on the arcade floor, Select Player and Note Ninja only; games that listen to the microphone never load it.

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

## Adding a cabinet

Every game gets its own cabinet on the arcade floor. A game with no `cabinet` entry still works: it gets the plain "classic" cabinet in its `color`, with a blinking PRESS START screen.

To give it a look, add a `cabinet` field to its entry in `shared/games.js` and mix and match the parts that already exist:

```js
cabinet: {shape: 'storm', trim: 'green', trim2: 'pink', marquee: 'shade', kicker: 'New!', screen: 'insert'},
```

- `shape`: the silhouette: `'classic'`, `'haunted'` (peaked roof, tombstone screen), `'soundcheck'` (small, domed), `'storm'` (slanted top, lightning notches)
- `trim` / `trim2`: the neon tubes: `'pink'`, `'cyan'`, `'yellow'`, `'purple'`, `'amber'`, `'green'`
- `marquee`: the lettering: `'bungee'`, `'haunt'`, `'pixel'`, `'shade'`
- `screen`: the attract-mode loop the front cabinet plays: `'ghost'`, `'tuner'`, `'storm'`, `'insert'`

For a brand-new look:

- **New silhouette:** add an entry to `SHAPES` in `shared/cabinets.js`. It's drawn on a 300 × 600 grid: `outline` (whole cabinet), `face`, `bezel`, `panel`/`lip` (control panel), joystick and button positions, coin `door`, and `slots` for where the marquee, screen and START button go. Copy `classic` and change the numbers.
- **New attract screen:** add an entry to `SCREENS` in `shared/cabinets.js` (`html(game, frame)` draws it; `period` redraws it every so many ms) and style it in `shared/cabinets.css` under `.attract` so only the front cabinet moves. Keep it small and light, and let the reduced-motion rule at the bottom of that file stop it.
- **3D cabinet:** add a `cabinet3d` field next to `cabinet`, e.g. `cabinet3d: {profile: 'haunted', body: 'cab-side'}`. Leave it out and the game gets a 3D cabinet that matches its 2D one. `profile` picks the side silhouette (`'classic'`, `'haunted'` with a peaked roof, `'soundcheck'` short and domed, `'storm'` with a raked top and lightning fins); colors come from `trim`/`trim2`. A new silhouette goes in `PROFILES` in `arcade3d.js`: a list of side-view points (depth, height in meters, front is bigger depth) that is extruded into the body, plus where the marquee, screen, control panel, coin door and START sit on it.
- **New marquee lettering:** add a `.mq-<name>` style in `shared/cabinets.css`, and add the name to `MARQUEES` in `shared/cabinets.js`. A new font goes in `shared/fonts/` as a subset `.woff2` with its license, declared in `shared/fonts.css`.

## Known limits

- Pitch matching accepts the right note **in any octave**. Low brass is often read an octave off on built-in mics, so this is on purpose.
- The listening games make **no sounds**. A sound effect would be picked up by the mic and counted as a note. Only the arcade floor, Select Player and Note Ninja (which doesn't use the mic) make sounds (a whoosh when the cabinets turn, a coin drop on START, a blip when you pick an instrument, and an optional arcade-room hum). The **SOUND** and **AMBIENCE** buttons in the top corner turn them off; the device remembers the choice. Sound starts only after the first tap, and on an iPad with the silent switch on you won't hear it.
- Other players nearby can be heard. Turn Mic sensitivity (on the Note Checker) toward *Less* in busy practice rooms.
- The arcade floor has no instrument picker on purpose: students pick a game first, then a player.
- Progress is saved in each device's browser. Clearing browser data, or using a different device, starts fresh.
