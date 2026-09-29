# Band Arcade style guide

This page is the one guide for how every screen looks and sounds. When you build or change a screen, use the shared
pieces in `shared/ui-kit.js` and `shared/ui-kit.css`. Don't build a new version of any of them. You can see every
piece side by side at `docs/gallery.html`.

## Colors
Use only the tokens in `shared/theme.css`. Never type a color code in a game.
- **Floor** (backgrounds, from darkest to lightest): `--deep`, `--floor`, `--floor-2`, `--floor-3`.
- **Neon** (titles, borders, glows, short labels): `--pink`, `--cyan`, `--yellow`, plus `--purple`, `--amber`,
  `--green`, `--red`, `--blue`. Each has a `-hi` (lighter) and an `-ink` (darker) shade and a `--glow-*` shadow.
- **Text**: use `--text-hi` for main text, `--text-lo` for secondary text and `--text-dim` for hints. Long text is
  always one of these, never neon, so it passes WCAG AA.
- **Music**: notation sits on a light screen (`--screen` with `--ink`) inside a cyan frame (`.stage`).
- A game's own palette (`--mh-*`, `--kt-*`, …) is only for that game's play area and art.

## Fonts
| Font | Token | Use it for |
|---|---|---|
| Display (Bungee) | `--display` | titles, headings, big numbers, the START and PAUSE buttons |
| Neon sign (Monoton) | `--neon-font` | the arcade's own sign on the home page only |
| Text (Atkinson Hyperlegible) | `--text` | everything people read: sentences, buttons, labels |
| Marquee fonts (GN Haunt, GN Pixel, GN Brush…) | | cabinet signs and a game's own title only, never body text |

## Headings
| Class | Looks like | Use it for |
|---|---|---|
| `.game-title` | 38–68 px display font; the game picks its colors | the game's name on its level select |
| `.ui-title` | 24–30 px display font, pink | a panel's title (Paused, Settings, a results title) |
| `.ui-section` | **the gold section heading**: yellow, slanted, red outline | "① SELECT YOUR NOTES", "② SELECT YOUR LEVEL", "UNLOCKED!", "This game" |
| `.ui-kicker` | small cyan capitals | the line above a title ("Level 3 · 5 transmissions") |
| `.ui-label` | small grey capitals | the label over a control or a number |
| `.ui-howto` | plain text, `--text-lo` | the one-sentence "how to play" under a game's title |

## Buttons
Every button uses `.btn` plus one style class, and is at least 44 px tall.
- `.btn-primary` is yellow. Use it for **the one main action** on a screen (Resume, Next level, Start listening).
  A screen never has two.
- `.btn-secondary` is outlined. Use it for everything else (Try again, Levels, Settings).
- `.btn-danger` is a red outline. Use it for leaving or losing something (Back to levels, Start over).
- Sizes: the default is 48 px. `.btn-small` (44 px) is for rows of tools. `.btn-big` (60 px) is for a setup
  screen's main button.
- `.ui-seg` is a row of choices where one is pressed (difficulty, speed, clef). Use it for every option toggle;
  a game may recolor the pressed choice with `--seg-on`.
- **Button order is always the same**: on results, NEXT, then TRY AGAIN, then LEVELS. In the pause menu, RESUME,
  RESTART, SETTINGS, then the game's extras, then BACK TO LEVELS.

## Glow
- Glow is for neon things only: titles, borders, the primary button, the selected choice.
- Use the `--glow-*` tokens. Don't use blur filters.
- Don't put glow on body text.

## Spacing
- Pages use `.wrap`, which is 860 px wide with a 16 px gutter and respects the notch.
- Panels have 22 px of padding and 10 px between buttons.
- Gaps are multiples of 2 (4, 6, 8, 10, 14, 18, 22).
- Nothing may scroll sideways. An overlay scrolls itself; a panel is never cut off.

## Icons
- Icons are simple line or solid shapes in `currentColor`, drawn as inline SVG at 18–24 px.
- Every icon-only button has an `aria-label`.
- Don't use emoji as buttons.

## Words on screen (students are 11–14)
- Keep it plain, short and encouraging: "So close! Try again", "New best!", "Leave this level?".
- Tell students what to do next, not what went wrong in the code.
- Speak to the student ("your notes"). Don't use slang, sarcasm or baby talk.
- Use sentence case in text. Capitals are only for display-font headings and buttons that are styled that way.

## Motion and flashing (these rules are not optional)
- Nothing may flash more than 3 times a second, and nothing flashes full-screen. Lightning, sparks and alarms light
  only part of the screen and fade in and out.
- Motion is off when the device asks for less motion **or** the Settings panel's Motion switch is off. In CSS, write
  `@media (prefers-reduced-motion: reduce)` rules; `html.no-motion` stops every animation for the switch. In
  scripts, check `Arcade.reducedMotion.matches`. Never call your own `matchMedia`.
- Keep animations short (under 0.5 s for turns and pop-ins) and light (transform and opacity only).

## Sound and the microphone
- Every sound goes through `shared/sfx.js` (`Arcade.Sfx.event`); music goes through the music manager
  (`Arcade.Sfx.setMusic` / `gameMenuMusic`). Never play audio yourself.
- A sound played while the game listens mutes the microphone for that moment, and game clocks pause while that
  happens. Sounds heard during play must be under 0.5 s.
- The microphone starts only from a tap (`Arcade.requireMic`).
- While a game is paused, the microphone isn't listening.
- No game plays pitched notes while listening. The exceptions are listed in CLAUDE.md.

## The shared pieces (shared/ui-kit.js)
| Piece | Call | Notes |
|---|---|---|
| Pause | `Arcade.UI.pause.mount({onPause, onResume, onRestart, onLevels, extras})`, then `pause.setActive(true)` while a level runs | The button sits top-left, where "← Arcade" is on the level select. Esc or P pauses. It also pauses by itself when the tab is hidden. BACK TO LEVELS asks first. |
| Results | `Arcade.UI.results.show({stars, title, msg, tiles, best, newBest, extra, next, retry, levels})` | Stars pop in the same way everywhere. The results show the avatar and the UNLOCKED! card by themselves. |
| Settings | the top bar's Settings button, the pause menu, or `Arcade.UI.settings.open()` | Sound, Music, Effects, Motion, Mic sensitivity with a live meter. A game adds its own options with `UI.settings.register(fn)`. |
| Level intro | `Arcade.UI.intro.show({kicker, title, text, go, back})` | |
| Confirm | `Arcade.UI.confirm({title, text, yes, no, danger})` returns a promise | Never use `alert()` or `confirm()`. |
| Toast | `Arcade.UI.toast(text, {near})` | A short message that fades by itself. |
| Countdown | `Arcade.countdown({…})` (`shared/countdown.js`) | |
| Messages | `.ui-msg`, with `.err`, `.empty` or `.loading` | For loading, empty and error messages. |

A game can re-theme a piece (pass `theme: 'my-class'` and style `.my-class .panel` in its `style.css`), but the
layout, the button order and the behavior stay the same everywhere.
