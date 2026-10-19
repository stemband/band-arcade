# Perfect Pitch (`perfect-pitch/`)

- WHAT IT TEACHES: HEARING SHARP AND FLAT, then fixing it, for EVERY student (no instrument, no microphone). Each round the game plays a REFERENCE (a tuner's tone), then the INSTRUMENT's note, played by a synthesized version of the instrument the student is tuning, which the game has made SHARP, FLAT or exactly IN TUNE. The student JUDGES it (SHARP · FLAT · IN TUNE), TUNES it with that instrument's real tuning mechanism drawn on the screen (drag, listen, repeat), and LOCKS IN; the score is the judgment and how close it got, in cents. [Pedal Point](pedal-point.md) and [Slide Quest](slide-quest.md) are its siblings: the same page skeleton, flow, scoring, results, `?demo` hooks and test structure. Four lessons:
  - HEARING SHARP VS FLAT: the only game in the arcade that asks for that judgment before anything is touched.
  - LONGER = LOWER: sharp means too high, so pull out (longer, lower); flat means too low, so push in (shorter, higher).
  - WHERE YOUR OWN INSTRUMENT TUNES and which way it moves (the drawing, its labels and the silhouette's dot).
  - DON'T MOVE WHAT'S IN TUNE: some notes already are; judging IN TUNE right ends the round with full points.
- Zone `ear-training`; `noInstrument: true` (in NO INSTRUMENT NEEDED by itself), `player: 'all'` (START goes straight to the game, no Select Player), `unpitched: true` (the Snare Drum and bells open it too), no `fit`. `maxStars` 24 (8 levels × 3).
- NO MICROPHONE AT ALL (the pitched-audio exception, [CLAUDE.md](../../CLAUDE.md) hard rules and [sound.md](../engine/sound.md)): the page doesn't load `pitch.js` or `mic-gate.js`; no `requireMic`. Every pitched sound is the game's own (`shared/winds.js`, `Arcade.Winds`) through `Sfx.output()` (SOUND OFF and the EFFECTS slider apply; never an AudioContext of its own), and every one REFUSES to play while `Arcade.Pitch.listening()` (it never listens; the guard keeps the rule honest). Because the game makes every sound, the score is exact.

## Choose an instrument to tune

- THE ROW on the first screen, above the level cards (Pedal Point's mode-row look, `.ui-seg`): "Tuning: Clarinet ▸" with the instrument's portrait and its mechanism ("Barrel, at the upper joint"); a tap opens THE PICKER (`#tunePicker`, a panel on `UI.layer` with the dialog plumbing): tiles in `PLAYERS` order (shared/instruments.js) without bells and snare (`PP2_HIDDEN`), each the member's portrait (`portraitHTML`) and `short` name.
- OBOE AND BASSOON ARE LEFT OUT ON PURPOSE (`PP2_LOCKED`): their tiles show in place, dimmed with a small lock (`aria-disabled`); a tap shows one panel (`UI.notice`): "Oboes and bassoons don't tune with a slide or a barrel. Oboists tune by moving the reed in or out a tiny bit and with their embouchure, and bassoonists change to a different bocal. That's too small to practice here, so pick another instrument to tune. The clarinet's barrel is a good one to try!" Nothing is picked.
- THE DEFAULT: the saved instrument (`A.currentMember()`) when it's tunable (the horn tile covers both horn groups); else the last one picked here (`gameData('perfect-pitch').tune`, a player id); else none yet, and the first START opens the picker (then the level's intro). A SAVED OBOE OR BASSOON: after PRESS START the first screen shows the same explanation ONCE per device as an intro panel (`#oboeNote`; `gameData('perfect-pitch').oboeNote`), and its CHOOSE opens the picker. Bells or snare players, or no instrument saved: they simply pick (no message: they're not missing anything).
- PROGRESS is one key, `'all'`, like Pedal Point: the stars don't depend on which instrument is tuned.
- NOTE NAMES ARE WRITTEN PITCH for the instrument tuned: its member's `sounds` and clef (shared/instruments.js), never a second transposition table; flats except F♯ (like Pedal Point and Slide Quest). Concert B♭ = a written C on clarinet and trumpet, a G on alto sax, an F on horn, a B♭ in bass clef on euphonium B.C. and trombone; the baritone T.C. reads treble. The round's line: "Your note: C (concert B♭)". The staff after LOCK IN uses the member's clef.

## The tuning mechanisms and the physics (`instruments.js`: `PP2_TUNE` one table, `Arcade.PP2Tune` the math; every number marked `MAT: TUNE`)

| Player id | Mechanism | Voice | L (cm) | double | travel (mm, each way) |
|---|---|---|---|---|---|
| flute | the HEADJOINT, in the body | flute | 33 | – | 12 |
| clarinet | the BARREL, at the upper joint | clarinet | 33 | – | 12 |
| basscl | the NECK, in the body | clarinet | 66 | – | 24 |
| altosax / tenorsax / barisax | the MOUTHPIECE, on the neck cork | sax | 57 / 85 / 125 | – | 20 / 30 / 45 |
| trumpet | the MAIN TUNING SLIDE | brass | 148 | ✓ | 26 |
| horn | the MAIN TUNING SLIDE | horn | 370 | ✓ | 66 |
| trombone | the TUNING SLIDE, in the bell section | brass | 275 | ✓ | 50 |
| baritonetc / euphbc | the MAIN TUNING SLIDE | lowbrass | 275 | ✓ | 50 |
| tuba | the MAIN TUNING SLIDE | lowbrass | 550 | ✓ | 100 |

- THE MODEL: every round starts the mechanism at the MIDDLE of its travel (`d` = 0), so it can go either way. Pulling OUT by `d` mm adds `(double ? 2 : 1) × d / 10` cm to the air column `L`: `cents = −1200 × log2((L + added) / L)` (out = longer = LOWER, in = HIGHER; the saxes' "in" covers more cork and is higher). The same shift applies to every note (good enough for a tuning slide). `centsAt(id, d)`, `dFor(id, cents)` (its inverse), `clampD`, `test.reach(id)`.
- TRAVEL SCALES WITH L: a long instrument needs a long pull to move its pitch (a tuba's ±10 mm would be only ±6 cents), so each travel reaches about ±60 cents, past the largest offset any level uses (50), with room so the stop never gives the answer away. These are game numbers, not measurements.
- THE NOTES (`notesFor(id, kind)`, concert midi): `'Bb'` = concert B♭ in the instrument's comfortable middle octave (the octave of its first-five tonic, `Scales.startMidi`, i.e. `START` in shared/scales.js); `'BbF'` = B♭ or concert F (the 5th above); `'tuning'` = B♭, F or A (the A a half step under the B♭, an octave up if that is out of the comfortable range); `'range'` = the first five or any note of the comfortable range (the GMEA chromatic, a 3rd trimmed from each end).

## The sound (`shared/winds.js` = `Arcade.Winds`; [sound.md](../engine/sound.md))

- Each tunable instrument maps to a voice (`PP2_TUNE.voice`): `flute`, `clarinet` (the bass clarinet too), `sax`, `brass` (trumpet, trombone), `horn`, `lowbrass` (euphonium, baritone, tuba). THE REFERENCE is a tuner's tone, a different timbre (Slide Quest's drone).
- HEAR: `Winds.ref` for `RULES.refSec` 1.6 s, a `gapSec` 0.3 s gap, then `Winds.play` for `noteSec` 1.6 s. ▶ PLAY while tuning is a HELD note (`Winds.start` / `setFreq` / `stop`, `noteSec` long): dragging while it sounds GLIDES its pitch (the same voice). ▶ TOGETHER = `Winds.together` (`bothSec` 1.6 s): the two BEAT. `Winds.stopAll()` on pause, on hide and on leaving (`pagehide`).

## A round

1. HEAR: the reference, the gap, the instrument note (the prompt says which is playing; the stage glows softly while the note sounds). The answer buttons wait until the note has ended. ▶ AGAIN (levels with `replay`; R) replays both; ▶ TOGETHER (levels with `together`; T) plays both at once. A PAUSE during HEAR plays it again, free, on RESUME.
2. JUDGE: three big buttons, SHARP (too high) · FLAT (too low) · IN TUNE (≥ 44 px, one row at every width); keys S / F / I, or ↑ / ↓ / Enter. Right: a ✓ and "Yes: it was sharp." (`note-hit`); wrong: a gentle ✗ and "It was flat: a little too low." (`note-wrong`, the loudest sound allowed here). IN TUNE and right: the round ends at once with full tuning points (0 cents) and "Right: leave it alone!". IN TUNE was wrong (or SHARP/FLAT for an in-tune note): on to TUNE anyway ("It was in tune. Don't move what's in tune: play it, then lock it in.").
3. TUNE: the instrument's tuning area drawn large (`art.js`), its mechanism (`#mech`) dragged anywhere on it (pointer capture, `touch-action: none`, `Arcade.holdGuard({lock})`; it moves from where it is, never jumping to the finger); NUDGE − / + (`RULES.nudgeCents` 1 cent's worth); ←/→ move it the way the arrow points on the drawing (`arrowCents` 3, Shift = `fineCents` 1). ▶ PLAY (Space), ▶ REFERENCE (R), ▶ TOGETHER (T, levels with `together`). THE TUNER NEEDLE (levels with `needle`): −50…+50 cents, Slide Quest's look, live while the note sounds (idle otherwise).
   - THE FIRST MOVE is recorded: sharp and the first move went IN (higher), or flat and it went OUT (lower): a small banner that stops nothing, right then, once ("Sharp means too high: PULL OUT to make it longer and lower." or the flat version), counted in the results as WRONG-WAY STARTS.
   - LOCK IN (Enter): disabled until the note has been HEARD AT THE SETTING BEING LOCKED: a ▶ PLAY or ▶ TOGETHER after the last move (a drag while the held note sounds counts as heard). So the mechanism is never placed by eye alone, and an in-tune note can be locked where it is after one PLAY.
4. AFTER LOCK IN (Slide Quest's layout): the error in words ("+7 cents sharp", "Right on: 0 cents"), the cents meter with the 2 ★ and 3 ★ zones, the reference (gold, "Tuner") and the note ("You") on a small staff in the written pitch and clef, "The exact spot was a little further OUT / IN." (or "Right there!" within 3 cents), for an in-tune note that was moved "It was in tune from the start. Don't move what's in tune!", then the tuned note and the reference together (`bothSec`; ▶ HEAR BOTH again), and NEXT.

- OFFSETS: a level's `cents: [min, max]`; each round's offset is ± a whole number of cents in that range, never the same value twice in a level, sharp and flat about half each. `inTune` rounds are exactly 0, shuffled in, never level 1's first round. NOTES: from the level's `notes`; a target (note + offset) never repeats, and a note never comes twice with the same sign while another one is left.

## The levels (`levels.js`: `PP2_LEVELS`, saved by number: never reorder), the shared LEVEL SELECT PATTERN

Each level starts with its intro (`UI.intro`: its `say`, the instrument being tuned, LET'S PLAY! / LEVELS). Fields: `name`, `idea`, `say`, `cents`, `inTune`, `notes`, `replay`, `together`, `needle`, `rounds` 5.

| # | Name | cents | inTune | notes | replay | together | needle |
|---|---|---|---|---|---|---|---|
| 1 | Way Off | 35–50 | 0 | Bb | ✓ | ✓ | ✓ |
| 2 | Getting Closer | 20–35 | 1 | Bb | ✓ | ✓ | ✓ |
| 3 | In Tune or Not? | 15–25 | 2 | BbF | ✓ | ✓ | – |
| 4 | No Needle | 10–20 | 1 | BbF | ✓ | ✓ | – |
| 5 | Tuning Notes | 10–20 | 1 | tuning | ✓ | – | – |
| 6 | Hear It Once | 10–20 | 1 | tuning | – | – | – |
| 7 | Any Note | 8–15 | 1 | range | ✓ | – | – |
| 8 | Perfect Pitch | 5–12 | 1 | range | – | – | – |

- The level select's cards: "Level N", the instrument's silhouette, the name, the one-line `idea`, the stars and "Best N" (or "5 rounds"). A level opens when the one before has a star (`?demo`: all open).

## Scoring (`PP2_SCORING`)

- A round's error = the offset + the mechanism's cents (+ = sharp). Points: 50 for a right judgment (`judge`), plus `max(0, 100 − 3 × |cents|)`; the level's score (their sum) is its Best. Within `bullseye` 3 cents: BULLSEYE! and `p2-star`.
- STARS need BOTH the level's AVERAGE |error| and the judgments right: 1 ★ ≤ 25 cents and ≥ 3 of 5 right; 2 ★ ≤ 12 and ≥ 4; 3 ★ ≤ 6 and all 5 (each star needs the one before).
- Saved: `A.store.setLevel('perfect-pitch', 'all', level, {stars, best})`. Nothing new leaves the device (the PRIVACY RULE is unchanged).
- Results (`UI.results`): Judgments ("4 of 5 right"), Average (cents), Closest, Wrong-way starts, Score; NEXT LEVEL (with a star), TRY AGAIN, LEVELS.
- THE PAUSE MENU (`UI.pause`): every sound stops.

## The pictures (`art.js` = `Arcade.PP2Art`; `--p2-*` tokens in theme.css)

- Each instrument's TUNING AREA, large, seen from the side, an SVG on a 1000-wide sheet cropped to its own `vb`: the flute's headjoint (lip plate, crown) sliding into the body's tenon; the clarinet's mouthpiece, ligature and barrel on the upper joint's cork tenon; the bass clarinet's metal neck curving up to the mouthpiece; the saxophone's mouthpiece and ligature on the neck cork (pushing in covers more cork); the main tuning slide's U and its two tubes for trumpet, horn, euphonium / baritone and tuba (each with its valves or coil); the trombone's tuning slide in the bell section (Slide Quest's corrected assembly).
- The moving part is drawn pushed all the way in and shifted by `shift(art, d, travel)`; the EXPOSED part under it (lighter metal, or cork) shows more the further it's pulled. Labels on the drawing point the way the mechanism really moves: "◂ PULL OUT = lower" / "PUSH IN = higher ▸" (mirrored where it pulls to the right). A small whole-instrument SILHOUETTE in a top corner has a dot on the tuning area (also the level cards' icon, `icon(art)`). Generic shapes only: no brand names or logos.

## Arcade integration

- games.js: `color: 'pink'`, `skill: 'Hearing sharp and flat'`, `blurb: 'Is it sharp, flat or in tune? Hear it, then fix it with the tuning slide.'`, `menuMusic: 'perfect-pitch-menu'` (a loop slot in sounds.js, screen `perfect-pitch`; the arcade's select music until Mr. Graham uploads one), faded out as a level starts, back with the results. Effects (UNPITCHED noise, `mic: false`): `p2-lock` (LOCK IN, or a right IN TUNE), `p2-star` (a bullseye) (copies of `sq-lock` / `sq-star`); shared `note-hit`, `note-wrong`, `level-complete`, `level-failed`, `star-earned`, `new-high-score`.
- The look: cabinet `shape: 'tuner'` (a clip-on tuner's head over the marquee with a row of little LEDs, the middle one green; a tuning fork down the lower right), `screen: 'needle'` (a canvas: a tuner's needle swings sharp, then flat, then settles in the middle and IN TUNE fades in; a 6 s loop, every move eased, 2D and 3D; named `needle` because `tuner` is Tune Up's screen), lettering `bungee`, marquee scene `tuner` (a small tuner's arc at the left end whose needle drifts and settles, one smooth 8 s cycle, never a flash), menu background `tuner` (a band room at night: chairs and music stands in silhouette at the edges, a tuner's green glow on one stand breathing slowly, dust in its light; `STILL` 3), 3D profile `tuner` with a `fork` topper (a silver tuning fork, a soft glow between its tines in the second trim color). See [backgrounds-cabinets-marquees.md](../engine/backgrounds-cabinets-marquees.md).
- TODAY'S PRACTICE: not in any skill rotation yet (`shared/practice.js`); Mr. Graham decides later.

## Tests (`tests/perfect-pitch.spec.js`)

- THE PHYSICS: `centsAt` / `dFor` round-trip; out = lower for every instrument and the saxes' in = higher; every level's largest offset (50) is fixable within every instrument's travel.
- THE SOUND: each voice's harmonic recipe (an `OfflineAudioContext` render: the flute nearly a sine, the clarinet's even harmonics weak, the sax bright, the horn and low brass darker than the brass); TOGETHER beats at 3 Hz with the two 3 Hz apart (and not in tune); the held note glides with `setPull` without restarting; nothing with SOUND OFF or while `Pitch.listening()` is forced true; no `getUserMedia` and no `Arcade.Pitch`.
- THE PICKER: the tiles in `PLAYERS` order without bells and snare; oboe and bassoon dimmed, a tap explains and picks nothing; a saved oboe or bassoon sees the explanation once, then the picker; a saved clarinet defaults to clarinet; bells, snare and no instrument simply pick; the choice is remembered; note names in written pitch and clef.
- THE LEVELS: each level's flags on the screen; offsets in range, never repeated, the `inTune` count, never level 1's first round; targets never repeat; IN TUNE right ends the round at 0; a wrong judgment still tunes; an in-tune note judged wrong locks at 0 where it is; the wrong-way banner once; LOCK IN disabled before a play at the setting; `auto()` = 3 ★; 4 of 5 judgments right = 2 ★ at most; a level of 30-cent misses earns no stars.
- THE CONTROLS: the keyboard map; the layout at a phone, an iPad both ways and a Chromebook (the judge buttons, the drawing, NUDGE and every tuning control on screen for clarinet, alto sax, trumpet and tuba; the picker fits); the mechanism drags by touch and by mouse from where it is. Smoke, the game runs and phone-width cover the page automatically.
- `GALLERY=1` saves `docs/gallery/perfect-pitch.png`: the picker (oboe and bassoon locked), a JUDGE screen, TUNE screens for clarinet, alto sax and trumpet, and an after-lock-in screen, for Mr. Graham's review.
- `tests/games.js` STEPS: the game run presses LET'S PLAY!, then A + Enter, Enter. `?demo` (`Arcade.PerfectPitch`): `state()`, `begin(lv)`, `intro(lv)`, `pick(id)`, `openPicker()`, `judge('sharp' | 'flat' | 'tune')`, `setPull(mm)`, `nudge(c)`, `play()`, `reference()`, `together()`, `again()`, `auto()` (judges right and sets the mechanism exactly; it also counts as heard, so A + Enter locks in), `wrong()` (a wrong judgment and 30 cents off), `lock()`, `next()`, `starsFor(avg, right)`, `pointsFor(cents, right)`; keys A = auto, W = wrong.
