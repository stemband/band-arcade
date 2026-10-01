# Band Arcade: notes for Claude

Mat Graham (middle school band director) owns this project. It's a set of mic-driven practice games for beginning band students, played on school iPads (Safari) and Chromebooks (Chrome) in practice rooms and at home. It's hosted as a static site on GitHub Pages at https://bandarcade.org (the site root; the old `stemband.github.io/band-arcade/` forwards there).

## Hard rules
- Follow docs/STYLE.md for all UI; use the shared components in shared/ui-kit instead of building new versions.
- **No build step, no npm dependencies, no frameworks.** Plain HTML/CSS/JS served as static files. Mat edits and deploys without tooling. The one exception is test tooling: it is allowed ONLY in `tests/` (its own package.json, Playwright as a dev dependency) and in `.github/workflows/`. Nothing in `tests/` is ever loaded by the site (the Pages deploy leaves it out). The one vendored library is three.js **r149** (`shared/vendor/three.min.js` + MIT license), used only by the home page. It's pinned because r149 is the last release with a classic UMD `three.min.js`; later ones are modules-only, which breaks double-click testing.
- **Classic `<script>` tags, not ES modules.** Everything hangs off the `window.Arcade` namespace. Modules break when a page is opened from a local file, and Mat tests by double-clicking.
- **Every address is relative (never a leading `/`, never the domain or `/band-arcade/`)**: the same files must work at the domain root, in a subfolder and from a double-clicked file. Files loaded by shared code find their folder from their own script's address (`document.currentScript.src`: sfx.js, portraits.js, marquees.js, backgrounds.js, avatar-badge.js). The custom domain is set in Settings → Pages (the `CNAME` file is harmless with the Actions deploy). localStorage is per web address: progress moves between addresses only with the Arcade Backup Code.
- **All links end in `index.html`** (e.g. `../index.html`, `ghost-notes/index.html`) so they work both locally and hosted. Build links with `Arcade.link(path)` so `?demo` carries through.
- **Never copy shared logic into a game.** Instruments and transpositions live only in `shared/instruments.js`, pitch detection only in `shared/pitch.js`, and so on. A fix to the engine must reach every game.
- **Always start music and ambience with the music manager: `Arcade.sfx.setMusic(name | [names] | null)` / `setAmbience(...)` (shared/sfx.js). Never start audio directly** (no `new Audio()`, no AudioContext of your own, no play() calls): browsers block audio until the first tap on each page load, and the manager remembers the wished track and starts it as soon as the audio is unlocked AND the file has loaded.
- **Sound while listening mutes the detector.** Every sound goes through `shared/sfx.js` (loaded by EVERY page, after `sounds.js`) and respects the mute and volume settings. A sound played while a game listens to the microphone (`Pitch.listening()`) automatically calls `Pitch.suppress(sound length + 250 ms)`: nothing heard in that window counts, and every game timer or reaction clock PAUSES during it (`Pitch.isSuppressed(now)`). "During play" sounds must be under 0.5 s; never a sound per note in the Note Checker. The exceptions (Music Highway's backing, Rhythm Dojo's click, Note Storm, mic-free games) and every detail: the full rule in [docs/engine/sound.md](docs/engine/sound.md). Read it before adding any sound to a game that listens.
- **No game plays pitched audio, EXCEPT LOST SIGNAL and MUSIC HIGHWAY's HEADPHONES MODE and PRACTICE MODE** (a guide melody, bass and chords from `music-highway/backing.js`: HEADPHONES quietly, only after the SPEAKER CHECK proved the mic can't hear the speakers; PRACTICE out loud, because the microphone is never requested or used there; its Song Board, which never uses the mic, plays songs with a soft synth). It takes turns: it pauses the mic (`Pitch.pauseListening(true)`) before a pattern plays, listens again only after the last tone has fully faded (tone end + 400 ms) and its "your turn" sound has ended, then `Pitch.ignoreCurrent()`. Its tones come ONLY from `shared/tones.js` (`Arcade.tones`, through sfx.js's output: mute and EFFECTS apply). Every other game still never plays a pitched tone, EXCEPT KEYS TO THE CITY in TOUCH mode (no microphone: every tapped key plays `Sfx.piano(midi)`, which refuses while `Pitch.listening()`; its INSTRUMENT mode plays no pitched sound at all, its effects are unpitched noise), EXCEPT BLOCKTAVE's Conductor's Podium ▶ LISTEN (`Sfx.piano`, which refuses while `Pitch.listening()`), EXCEPT DOJO DUEL, which never uses the microphone, so its own sounds (gong, jingles; all `mic: false`) may be pitched; none may ever play one while listening. EXCEPT TUNE UP's TUNER: HEAR THE NOTE plays ONE 2 s tone through `shared/tones.js`, taking turns like Lost Signal (the mic paused before it, listening again only after it has faded + 400 ms, then `Pitch.ignoreCurrent()`). Tune Up's METRONOME clicks (unpitched noise, backing.js's kit) never play while listening: that tab turns the microphone off. Lost Signal's own sounds are unpitched (noise) and mic: false except two tiny echo clicks; its menu music plays only on its level screens (never during a transmission).
- **THE SITE VERSION (stale-cache fix; `shared/version.js`).** GitHub Pages lets browsers keep files ~10 minutes, so every page's `<head>` starts with `<meta http-equiv="Cache-Control" content="no-cache">` + two lines: `document.write` of `shared/version.js?t=<now>` (fetched fresh every load) and `Arcade.checkVersion('dev')` (an older cached copy of the page reloads once with `?v=<new>`). Copy those three lines into any new page (with the right `../`). Write script/stylesheet tags as plain relative `src`/`href` WITHOUT `?v=`: on every push to main the deploy workflow (`.github/workflows/pages.yml` → `tools/stamp-version.py`, on the deploy's copy, nothing committed) writes the commit's short id into `Arcade.VERSION` and each page's `checkVersion`, and adds `?v=<id>` to every local .js/.css tag. Files loaded by code (pictures, extra scripts) go through `Arcade.v(url)` (portraits.js, marquees.js, arcade.js's three.js, Arcade Quest's art). NEVER edit VERSION by hand: it stays `'dev'` in the repository, which turns all of this off (local files, `python3 -m http.server`). Sounds keep their own `SOUNDS_VERSION`. Needs Settings → Pages → Source: GitHub Actions.
- **THE APP (installable, offline; `manifest.webmanifest`, `sw.js`, `shared/app.js`, `offline.html`).** `checkVersion` writes every page's app tags and loads `shared/app.js`, so a new page needs only the three version lines + its own `theme-color`. The full rule (the service worker, updates, install, Bring your progress, safe areas, tests): [docs/engine/version-and-app.md](docs/engine/version-and-app.md).
- Cabinet marquees show only the game's main title, fit as large as possible (titleFit:'max'). No subtitles, taglines or small text on marquees. (shared/marquees.js MARQUEES in [docs/engine/backgrounds-cabinets-marquees.md](docs/engine/backgrounds-cabinets-marquees.md): 1 line or 2, measured with the real font, glow and slant.)
- Game MENU BACKGROUNDS show on menu screens only, never during play (shared/backgrounds.js: Mat's picture in shared/backgrounds/ → the coded scene games.js `bg.scene` → the plain page). No flashing: ≤ 3 flashes a second, never full-screen (the storm's lightning is a soft glow behind the clouds).
- Every game opens on a PRESS START title screen (shared/press-start.js, shown by mountTopbar from its games.js entry: every game except tools and `pressStart: false`), because each game is its own page and browsers block sound until a tap there; its tap unlocks + primes the audio and starts the menu music, and never starts the microphone.
- Every game's first screen uses the shared LEVEL SELECT PATTERN (`shared/level-select.js`: SELECT YOUR NOTES, SELECT YOUR LEVEL, then START; `Arcade.LevelSelect.show(...)` each time the level cards are drawn, `LevelSelect.played(i)` in every start function; a setup screen's main button: `LevelSelect.highlight`); new games use it too.
- Games must work on iPad Safari. The mic and AudioContext start only from a tap, via `Arcade.requireMic(fn)`.
- Keep the student-facing copy plain and encouraging. Students are 11–14.
- Band Ninja features are optional. Never add a login or make any game depend on a Band Ninja link, code or PIN.
- **THE LEADERBOARD ENDPOINT IS THE ONLY PLACE THE ARCADE MAY SEND DATA** (`Arcade.LEADERBOARD_URL` in `shared/leaderboard-config.js`, only through `shared/leaderboard.js`), and ONLY these fields: `{pid (random device id), grade, name: [title, adjective, noun] word NUMBERS, game, type ('stars'|'endless'|'play'), value, level}`. Never add names, emails, PINs, typed text or any other personal data, never another endpoint, analytics or third-party script. Nothing is sent in `?demo`, with the student's "Show me on the leaderboard" switch off, without a grade, or when the URL is empty. Every other request the arcade makes is to its own files.
- **Saved ids never change.** Never reorder, rename or remove anything a save or a link points to: songs, levels, belts, districts, chapters, vaults, rivals, tracks, game and zone ids, item/part/skin ids, block and recipe ids, progress keys, `avatar-code.js` TABLE entries, the name word lists, Quest code lists. Add at the end, or write a one-time migration in `storage.js` `migrate()`. Each topic doc says which of its ids are saved.
- **The GMEA sheets are the source for ranges and scales.** Instrument ranges = `MEMBERS` in `shared/instruments.js`; starting notes and audition scales = `START`, `AUDITION`, `CHROMATIC_HS` in `shared/scales.js`. If GMEA changes a sheet, edit those tables, never a game.
- **When you change a game or system, update ITS doc file in the same change. Never put game details back into CLAUDE.md.** CLAUDE.md holds only the summary, these hard rules, the checklist and the index.

## BEFORE YOU START
1. Read the hard rules above.
2. Read the doc for EVERY game or system you will touch (the index below). A change to shared code: read the engine doc AND the docs of the games that use it.
3. Run the tests (docs/engine/testing.md): `cd tests && npm ci && npx playwright install chromium webkit && npx playwright test`, and check a level with `?demo`.
4. Update that doc (and the index, for a new file) in the same change.

## THE INDEX
Engine and shared systems (`docs/engine/`):

| File | Read it when you touch… |
|---|---|
| [version-and-app.md](docs/engine/version-and-app.md) | the installable app, `sw.js`, `shared/app.js`, offline, updates, the play session (`Arcade.session`) |
| [page-flow.md](docs/engine/page-flow.md) | the floor page: lobby, zones, ALL GAMES, FULL ARCADE, the top bar, opening a game, Choose Your Instrument / Select Player, pick mode, players and groups, zones and `fit`, `requireInstrument`, links |
| [ui-kit.md](docs/engine/ui-kit.md) | any UI: buttons, results, pause, settings, intro, confirm, toasts, layers, hold guard, overlays |
| [look-and-theme.md](docs/engine/look-and-theme.md) | colors, tokens, fonts, the neon arcade look, the floor's look |
| [press-start-and-level-select.md](docs/engine/press-start-and-level-select.md) | a game's PRESS START screen or its first screen (SELECT YOUR NOTES / LEVEL / START) |
| [sound.md](docs/engine/sound.md) | any sound, music or ambience; sound in a listening game (the full "sound while listening" rule); countdowns; the loudness cap; `tones.js`; the automatic compression of sound files (`tools/compress-sounds.py`, `compress-sounds.yml`) |
| [pitch.md](docs/engine/pitch.md) | pitch detection or any listening game: `pitch.js`, attacks, suppress, `setRange`, `requireMic`, detector tuning |
| [notes-and-scales.md](docs/engine/notes-and-scales.md) | instruments and members, transpositions, scales, note sequences, the mode picker, progress keys, staff drawing |
| [rhythm.md](docs/engine/rhythm.md) | rhythms, counting, the rhythm staff, onsets (claps/hits), calibration and the audio clock, the rhythm judge, the timing check |
| [avatars.md](docs/engine/avatars.md) | avatars, the creator, parts and names, avatar backgrounds and animation, item unlocks, portraits, skins, the Locker, the avatar badge |
| [seasons.md](docs/engine/seasons.md) | seasonal events, event items, the lobby's event banner and panel, seasonal looks |
| [leaderboard.md](docs/engine/leaderboard.md) | the leaderboard endpoint, its events, its screen, privacy |
| [prize-counter.md](docs/engine/prize-counter.md) | tokens (`shared/tokens.js`), the Prize Counter, the Token Booth's prices, the prize of the week, the seasonal shelf |
| [progress-and-saving.md](docs/engine/progress-and-saving.md) | `Arcade.store`, saved progress, migrations, the Arcade Backup Code, Quest save codes |
| [endless.md](docs/engine/endless.md) | an Endless mode (`shared/endless.js`) |
| [patterns-and-echo.md](docs/engine/patterns-and-echo.md) | pattern generation or echo games (`patterns.js`, `echo.js`) |
| [band-ninja.md](docs/engine/band-ninja.md) | the Band Ninja connection, belt codes, belts, the Sensei, the answer pad |
| [backgrounds-cabinets-marquees.md](docs/engine/backgrounds-cabinets-marquees.md) | menu backgrounds, cabinets (2D and 3D), marquees, the 3D floor's performance |
| [testing.md](docs/engine/testing.md) | the automatic tests, `?demo`, how to check a change |
| [adding-a-game.md](docs/engine/adding-a-game.md) | making a new game (the full steps) |

Games and tools (`docs/games/`, one per game id in `shared/games.js`):

| File | Read it when you touch… |
|---|---|
| [ghost-notes.md](docs/games/ghost-notes.md) | Ghost Notes (`ghost-notes/`) |
| [note-storm.md](docs/games/note-storm.md) | Note Storm (`note-storm/`) |
| [note-ninja.md](docs/games/note-ninja.md) | Note Ninja (`note-ninja/`) |
| [keys-to-the-city.md](docs/games/keys-to-the-city.md) | Keys to the City (`keys-to-the-city/`) |
| [vanishing-ink.md](docs/games/vanishing-ink.md) | Vanishing Ink (`vanishing-ink/`) |
| [chime-heist.md](docs/games/chime-heist.md) | Chime Heist (`chime-heist/`) |
| [rhythm-dojo.md](docs/games/rhythm-dojo.md) | Rhythm Dojo (`rhythm-dojo/`) |
| [ancient-ninja-scrolls.md](docs/games/ancient-ninja-scrolls.md) | Ancient Ninja Scrolls (`ancient-ninja-scrolls/`) |
| [button-masher.md](docs/games/button-masher.md) | Button Masher (`button-masher/`), `shared/fingerings.js`, `shared/diagrams.js` |
| [neon-face-off.md](docs/games/neon-face-off.md) | Neon Face-Off (`neon-face-off/`) |
| [showtime-malfunction.md](docs/games/showtime-malfunction.md) | Showtime Malfunction (`showtime-malfunction/`) |
| [sustain-speedway.md](docs/games/sustain-speedway.md) | Sustain Speedway (`sustain-speedway/`) |
| [music-highway.md](docs/games/music-highway.md) | Music Highway (`music-highway/`), `shared/highway-draw.js` |
| [scale-trainer.md](docs/games/scale-trainer.md) | Scale Trainer (`scale-trainer/`), the AUDITION tables in `shared/scales.js` |
| [lost-signal.md](docs/games/lost-signal.md) | Lost Signal (`lost-signal/`) |
| [dojo-duel.md](docs/games/dojo-duel.md) | Dojo Duel (`dojo-duel/`) |
| [blocktave.md](docs/games/blocktave.md) | Blocktave (`blocktave/`) |
| [arcade-quest.md](docs/games/arcade-quest.md) | Arcade Quest (`arcade-quest/`) |
| [note-checker.md](docs/games/note-checker.md) | TUNE UP, the toolbox (`note-checker/`): the Note Checker, the Tuner, the Metronome |

## Adding a game (short)
1. Read [adding-a-game.md](docs/engine/adding-a-game.md) (the full steps) and [press-start-and-level-select.md](docs/engine/press-start-and-level-select.md).
2. New folder with `index.html` (copy `ghost-notes/index.html`'s `<head>`: the three version lines + the shared script tags), `style.css`, `game.js` (`requireInstrument` + `mountTopbar`).
3. Notes only from `sequences.js` / `mode-picker.js`; results, pause, intros from the UI kit; menu music through `Sfx.gameMenuMusic`.
4. Add it to `shared/games.js` (zones, `maxStars`, color, `cabinet`, `marquee`, `bg`, `fit` if needed) and a tests/games.js entry if it needs special steps.
5. Write `docs/games/<game id>.md` and add it to the index above.
