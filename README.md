# Band Arcade

Practice games for beginning band that listen through the device microphone. Built for school iPads (Safari) and Chromebooks (Chrome), for practice-room and home use.

## What's in here

```
index.html            The arcade floor (home page): pick a GAME from a carousel of cabinets
arcade.css / .js      Arcade floor look and behavior (carousel, swipe, arrow keys, indicator lights)
select-player/        "Select Player": pick your instrument for the game you chose, then play
shared/               The engine every game uses
  instruments.js      Instrument groups, transpositions, first five notes (single source of truth)
  pitch.js            Microphone + pitch detection (YIN), "note held" events, demo keys
  mic-gate.js         The "Turn on the microphone" prompt and fix-it messages
  ui.js               Staff notation (whole staff or single notes), ghost mascot, stars, top bar
  storage.js          Saved instrument, mic sensitivity, and progress (on this device only)
  games.js            The list of games on the arcade floor, and how each cabinet looks
  sfx.js              Sound effects for the arcade floor and Select Player (made in code, no audio files)
  cabinets.js / .css  The arcade cabinets (drawn in SVG + HTML, no images) and their attract-mode screens
  theme.css           Colors, type, buttons, overlays shared by every page
  fonts.css + fonts/  Fonts bundled with the site (no outside font service needed)
note-checker/         Shared tuner-style checker (every game links to it)
ghost-notes/          Game 1: note reading with fading note names
  levels.js           Level design: counts, time per note, how visible the names are
  game.js             Game logic
note-storm/           Game 2: speed reading; notes march toward Tempo the robot, play each one to blast it
  levels.js           Level design: counts, march speed, notes on screen at once, names on or off
  game.js             Game logic (the staff is drawn once; only the notes move)
```

No build step and no installs. It's plain HTML, CSS and JavaScript, so any static web host can serve it.

## How students move through it

1. **Arcade floor** (`index.html`): choose a game. Turn the cabinets with the ◀ ▶ buttons, a swipe, the ←/→ keys, or the lights under the carousel. Press **START** on the front cabinet.
2. **Select Player** (`select-player/index.html?game=<game-id>`): choose an instrument. If this device already has one, a big **Continue as …** button comes first. Choosing goes straight into the game.
3. **The game.** The instrument name in the top bar opens Select Player again (to switch instruments); **← Arcade** goes back to the floor, turned to that game.

Opening a game with no instrument saved sends the student to Select Player for that game.

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
- **New marquee lettering:** add a `.mq-<name>` style in `shared/cabinets.css`, and add the name to `MARQUEES` in `shared/cabinets.js`. A new font goes in `shared/fonts/` as a subset `.woff2` with its license, declared in `shared/fonts.css`.

## Known limits

- Pitch matching accepts the right note **in any octave**. Low brass is often read an octave off on built-in mics, so this is on purpose.
- The games make **no sounds**. A sound effect would be picked up by the mic and counted as a note. Only the arcade floor and Select Player make sounds (a whoosh when the cabinets turn, a coin drop on START, a blip when you pick an instrument, and an optional arcade-room hum). The **SOUND** and **AMBIENCE** buttons in the top corner turn them off; the device remembers the choice. Sound starts only after the first tap, and on an iPad with the silent switch on you won't hear it.
- Other players nearby can be heard. Turn Mic sensitivity (on the Note Checker) toward *Less* in busy practice rooms.
- The arcade floor has no instrument picker on purpose: students pick a game first, then a player.
- Progress is saved in each device's browser. Clearing browser data, or using a different device, starts fresh.
