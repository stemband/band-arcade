# Band Arcade's automatic tests

These check the whole arcade on every pull request (GitHub runs them: `.github/workflows/tests.yml`). Everything here
is test tooling only: **nothing in `tests/` is ever loaded by the site**, and the site itself still has no build step
and no npm packages.

## What they check

| File | What it does | Browsers |
|---|---|---|
| `smoke.spec.js` | Opens every page (`pages.js`: the lobby, every zone, All Games, the Full Arcade, Choose Your Instrument, pick mode, the leaderboard screen, every game, the Note Checker, the Sound Board, Art Board, Song Board and avatar card) at **iPad landscape** (1180 × 820), **iPad portrait** (820 × 1180) and **Chromebook** (1366 × 768). Fails on any JavaScript error, any console error, any missing local file, any request to another website, and any visible button sticking out of the screen sideways. | Chromium + WebKit |
| `game-runs.spec.js` | Plays every game in `?demo`: Level 1 → START → the demo's right answers → the results screen, and checks the stars were saved. Two-player games play a short match; Arcade Quest fights a Test Arena battle; every Endless card is played to GAME OVER. | Chromium + WebKit |
| `pitch.spec.js` | Feeds made-up clarinet-, flute-, sax-, trumpet- and tuba-like tones (every note of each instrument's GMEA range) through the pitch detector and checks each one is read as exactly the right note, never a twelfth or an octave off. | Chromium |
| `network.spec.js` | The leaderboard (mocked with fake data) draws its board; a real star sends only the allowed fields; `?demo` sends nothing. (Every other test also fails on a request to any other website.) | Chromium + WebKit |
| `save.spec.js` | Arcade Backup Code round trip: make a code → clear the browser → restore it → stars, avatar, unlocked items and settings are back. | Chromium + WebKit |

WebKit is the engine inside Safari, so it stands in for the iPads.

## Adding a game

Nothing to do in most cases: the game list comes from `shared/games.js`, so a new game gets the smoke test and a game
run automatically (Level 1, START, tap Space until the results show). If it needs other steps (a setup screen, a
different demo key, an instrument), add a small entry to `STEPS` in `games.js`; the comment at the top of that file
lists every option.

A file the site looks for ON PURPOSE and doesn't mind missing (sound recordings, portrait and marquee pictures,
menu backgrounds, Arcade Quest art) is listed in `OPTIONAL` in `helpers.js`; any other missing file fails.

## Running them yourself (Claude Code, or any computer with Node.js and Python 3)

```
cd tests
npm ci                                   # the test tools (Playwright), only inside tests/
npx playwright install chromium webkit   # the browsers (add --with-deps on a fresh Linux machine)
npx playwright test                      # everything, both browsers (it starts python3 -m http.server by itself)
npx playwright test --project=chromium   # Chromium only (quicker)
npx playwright test smoke -g "Note Storm"  # one file, tests whose names match
npx playwright show-report               # the report of the last run, with screenshots of what failed
```

In Claude Code's cloud sandbox the browsers are already installed in `/opt/pw-browsers` (Chromium only: WebKit can't be
downloaded there), so use `--project=chromium` and let GitHub check WebKit.
