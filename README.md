# Band Arcade

Practice games for beginning band that listen through the device microphone. Built for school iPads (Safari) and Chromebooks (Chrome), for practice-room and home use.

## What's in here

```
index.html            Arcade home: pick an instrument, then a game
arcade.css / .js      Home page look and behavior
shared/               The engine every game uses
  instruments.js      Instrument groups, transpositions, first five notes (single source of truth)
  pitch.js            Microphone + pitch detection (YIN), "note held" events, demo keys
  mic-gate.js         The "Turn on the microphone" prompt and fix-it messages
  ui.js               Staff notation drawing, ghost mascot, stars, top bar
  storage.js          Saved instrument, mic sensitivity, and progress (on this device only)
  games.js            The list of games shown on the home page
  theme.css           Colors, type, buttons, overlays shared by every page
  fonts.css + fonts/  Fonts bundled with the site (no outside font service needed)
note-checker/         Shared tuner-style checker (every game links to it)
ghost-notes/          Game 1: note reading with fading note names
  levels.js           Level design: counts, time per note, how visible the names are
  game.js             Game logic
```

No build step and no installs. It's plain HTML, CSS and JavaScript, so any static web host can serve it.

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
3. Add an entry to `shared/games.js`.
4. Save progress with `Arcade.store.setLevel(gameId, instrumentId, level, {stars, best})`, which lets the home page show star totals automatically.

## Known limits

- Pitch matching accepts the right note **in any octave**. Low brass is often read an octave off on built-in mics, so this is on purpose.
- The games make **no sounds**. A pitched sound effect would be picked up by the mic and counted as a note.
- Other players nearby can be heard. Turn Mic sensitivity (on the Note Checker) toward *Less* in busy practice rooms.
- Progress is saved in each device's browser. Clearing browser data, or using a different device, starts fresh.
