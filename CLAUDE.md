# Band Arcade: notes for Claude

Mat Graham (middle school band director) owns this project. It's a set of mic-driven practice games for beginning band students, played on school iPads (Safari) and Chromebooks (Chrome) in practice rooms and at home. It's hosted as a static site on GitHub Pages.

## Hard rules
- **No build step, no npm dependencies, no frameworks.** Plain HTML/CSS/JS served as static files. Mat edits and deploys without tooling.
- **Classic `<script>` tags, not ES modules.** Everything hangs off the `window.Arcade` namespace. Modules break when a page is opened from a local file, and Mat tests by double-clicking.
- **All links end in `index.html`** (e.g. `../index.html`, `ghost-notes/index.html`) so they work both locally and hosted. Build links with `Arcade.link(path)` so `?demo` carries through.
- **Never copy shared logic into a game.** Instruments and transpositions live only in `shared/instruments.js`, pitch detection only in `shared/pitch.js`, and so on. A fix to the engine must reach every game.
- **No pitched audio output from games.** The mic would hear it. Visual feedback only.
- Games must work on iPad Safari. The mic and AudioContext start only from a tap, via `Arcade.requireMic(fn)`.
- Keep the student-facing copy plain and encouraging. Students are 11–14.

## Page flow
1. `index.html`, the arcade floor: students choose a GAME from a carousel of cabinets (◀ ▶ buttons, swipe, ←/→ keys, indicator lights, tap a side cabinet). No instruments here. START links to Select Player. The URL hash (`#ghost-notes`) says which cabinet is in front; game pages link back with it.
2. `select-player/index.html?game=<id>`: the game's marquee, "CONTINUE AS <instrument>" when one is saved, then the 10 instrument tiles. Choosing calls `Arcade.store.setInstId` and goes straight to the game. A bad or missing `?game=` goes home.
3. Game pages: `Arcade.requireInstrument(GAME_ID)` sends students with no saved instrument to Select Player for that game. `Arcade.mountTopbar(inst, extraHTML, GAME_ID)`: "← ARCADE" goes home (turned to this game), the instrument chip opens Select Player for this game.

## Engine API (shared/)
- `Arcade.INSTRUMENTS`, `Arcade.currentInstrument()`. Each instrument has `notes` (written), `targetPc` (concert pitch classes), `writtenName(pc)`, `clef`, `t` (transposition), `concertLabel`, `shortName`.
- `Arcade.Pitch.setInstrument(inst)`, `onFrame((reading, level, now) => …)` (~25×/s; `reading` is `null` or `{freq, midi, pc, cents}` with a concert `pc`), `onHeld((pc, now) => …)` (once per held note, `holdMs` = 280), `ignoreCurrent()`, `heldPc()`, `setSensitivity(0–100)`, `bars(level)`, `levelPct(level)`.
- `Arcade.requireMic(fn)` shows the mic prompt when needed, then runs `fn`.
- Links: `Arcade.link(path)` keeps the query string. `Arcade.linkTo(path, {game})` keeps `?demo` but sets or drops `?game=` (use it for links between pages). `Arcade.playerLink(gameId, root)`, `Arcade.homeLink(gameId, root)`; `root` is `'../'` from a game folder (the default) or `''` from the site root.
- `Arcade.requireInstrument(gameId)`: the saved instrument, or redirect to Select Player (returns null).
- Cabinets (`shared/cabinets.js` + `shared/cabinets.css`): `Arcade.cabinetHTML(game, {href})`, `Arcade.marqueeHTML(game)`, `Arcade.trimClasses(game)`, `Arcade.cabinetOf(game)` (settings with defaults), `Arcade.setAttract(cabEl, game)` (only the front cabinet animates).
- `Arcade.staffSVG(clef, items, {fit, label, width, captions})`, `Arcade.noteGlyph(clef, {n, x, caption}, capY)` (one note, for games that move notes on their own layer), `Arcade.noteY(clef, n)`, `Arcade.fiveNoteStaff(inst, colorFor)`, `Arcade.colorNote(id, color)`, `Arcade.ghostSVG(text, cls)`, `Arcade.starStr(n)`, `Arcade.mountTopbar(inst, extraHTML, gameId)`.
- `Arcade.store`: `instId`, `sens`, `level(game, inst, lvl)`, `setLevel(game, inst, lvl, {stars, best})`, `totalStars(game, inst)`. Progress shape: `games[gameId][instId][level] = {stars, best}`.
- `Arcade.DEMO` is true with `?demo`. Keys 1–5 fake the five notes, and games should unlock all levels.

## Adding a game
Make a new folder with `index.html` (same shared script tags as `ghost-notes/index.html`), `style.css` and `game.js`. Start `game.js` with `requireInstrument` + `mountTopbar(inst, '', GAME_ID)`. Add it to `shared/games.js` (`maxStars` = levels × 3, or 0) with a main `color` (`'pink'|'cyan'|'yellow'`) and a `cabinet` entry. Reuse `theme.css` components (`.stage`, `.hear`, `.overlay/.panel`, `.btn-*`).
- Cabinets: each game's look is its `cabinet` field in `games.js` (`shape`, `trim`, `trim2`, `marquee`, `kicker`, `screen`; all optional, missing or unknown values fall back to a classic cabinet). The parts it picks from live in `shared/cabinets.js` (`SHAPES` silhouettes on a 300 × 600 grid, `SCREENS` attract loops) and `shared/cabinets.css` (trim colors, marquee lettering, screen styles). Give a new game its own silhouette/screen rather than reusing another game's whole look. Never let a missing cabinet entry break the home page.
- The arcade floor look: a dark 1980s arcade at night: haze, neon sign (Monoton, `--neon-font`), cabinets glowing down an aisle with light pooling on the floor. Carousel turns stay under 0.5 s; only the front cabinet's screen animates; `prefers-reduced-motion` gives a plain fade and no attract loops. At phone width only one cabinet shows, arrows beside it. Nothing may scroll sideways.
- Keep the neon arcade look: a near-black arcade floor (`--floor`, `--floor-2`, `--floor-3`, `--deep`) lit by neon `--pink`, `--cyan` and `--yellow` (each with `-hi`/`-ink` variants and a `--glow-*` shadow). Every color is a token in `shared/theme.css` (cabinets also use `--purple`, `--amber`, `--green` and the `--cab-*` woodwork tokens); don't hard-code colors in a game. Neon is for titles, borders, glows and short labels; long text uses `--text-hi`/`--text-lo` so it meets WCAG AA. The staff `.stage` is a light "screen" (`--screen`, `--ink`) in a cyan neon frame, so notation stays crisp. Titles use the display font (`--display`, Bungee); body text stays Atkinson Hyperlegible (`--text`). Marquee fonts (`GN Haunt`, `GN Pixel`, `GN Shade`, `GN Neon`) are subset .woff2 files in `shared/fonts/` covering only Latin letters, digits and a little punctuation: signs only, never body text. Keep motion light (no blur filters) and turn it off under `prefers-reduced-motion`. The older names (`--gold`, `--night-2`, `--bone`, `--mist`, `--coral`…) are aliases of the new tokens.

## Testing
- `python3 -m http.server` from the repo root, then open `http://localhost:8000/?demo`.
- Before finishing a change, verify with `?demo` that a level can be completed and that the arcade floor's HI-SCORE for that game updates (it shows only when an instrument is saved).
- Real-instrument testing is Mat's job. Ask him which instruments/notes misread rather than guessing at detector changes.

## Detector tuning (shared/pitch.js)
YIN with threshold 0.15, clarity ≥ 0.8, loudness gate from the sensitivity slider, ±0.65-semitone hysteresis, 110 ms release gap. Per-instrument search range comes from `range` in `instruments.js` (min × 0.78, max × 2.3). Change these carefully and note why in the commit message.
