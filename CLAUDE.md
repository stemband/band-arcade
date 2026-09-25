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

## Engine API (shared/)
- `Arcade.INSTRUMENTS`, `Arcade.currentInstrument()`. Each instrument has `notes` (written), `targetPc` (concert pitch classes), `writtenName(pc)`, `clef`, `t` (transposition), `concertLabel`, `shortName`.
- `Arcade.Pitch.setInstrument(inst)`, `onFrame((reading, level, now) => …)` (~25×/s; `reading` is `null` or `{freq, midi, pc, cents}` with a concert `pc`), `onHeld((pc, now) => …)` (once per held note, `holdMs` = 280), `ignoreCurrent()`, `heldPc()`, `setSensitivity(0–100)`, `bars(level)`, `levelPct(level)`.
- `Arcade.requireMic(fn)` shows the mic prompt when needed, then runs `fn`.
- `Arcade.staffSVG(clef, items, {fit, label, width, captions})`, `Arcade.noteGlyph(clef, {n, x, caption}, capY)` (one note, for games that move notes on their own layer), `Arcade.noteY(clef, n)`, `Arcade.fiveNoteStaff(inst, colorFor)`, `Arcade.colorNote(id, color)`, `Arcade.ghostSVG(text, cls)`, `Arcade.starStr(n)`, `Arcade.mountTopbar(inst, extraHTML)`.
- `Arcade.store`: `instId`, `sens`, `level(game, inst, lvl)`, `setLevel(game, inst, lvl, {stars, best})`, `totalStars(game, inst)`. Progress shape: `games[gameId][instId][level] = {stars, best}`.
- `Arcade.DEMO` is true with `?demo`. Keys 1–5 fake the five notes, and games should unlock all levels.

## Adding a game
Make a new folder with `index.html` (same shared script tags as `ghost-notes/index.html`), `style.css` and `game.js`. Add it to `shared/games.js` (`maxStars` = levels × 3, or 0). Reuse `theme.css` components (`.stage`, `.hear`, `.overlay/.panel`, `.btn-*`). Give it a cabinet `color` (`'pink'|'cyan'|'yellow'`) in `games.js`.
- Keep the neon arcade look: a near-black arcade floor (`--floor`, `--floor-2`, `--floor-3`, `--deep`) lit by neon `--pink`, `--cyan` and `--yellow` (each with `-hi`/`-ink` variants and a `--glow-*` shadow). Every color is a token in `shared/theme.css`; don't hard-code colors in a game. Neon is for titles, borders, glows and short labels; long text uses `--text-hi`/`--text-lo` so it meets WCAG AA. The staff `.stage` is a light "screen" (`--screen`, `--ink`) in a cyan neon frame, so notation stays crisp. Titles use the display font (`--display`, Bungee); body text stays Atkinson Hyperlegible (`--text`). Keep motion light (no blur filters) and turn it off under `prefers-reduced-motion`. The older names (`--gold`, `--night-2`, `--bone`, `--mist`, `--coral`…) are aliases of the new tokens.

## Testing
- `python3 -m http.server` from the repo root, then open `http://localhost:8000/?demo`.
- Before finishing a change, verify with `?demo` that a level can be completed and that the home page star count updates.
- Real-instrument testing is Mat's job. Ask him which instruments/notes misread rather than guessing at detector changes.

## Detector tuning (shared/pitch.js)
YIN with threshold 0.15, clarity ≥ 0.8, loudness gate from the sensitivity slider, ±0.65-semitone hysteresis, 110 ms release gap. Per-instrument search range comes from `range` in `instruments.js` (min × 0.78, max × 2.3). Change these carefully and note why in the commit message.
