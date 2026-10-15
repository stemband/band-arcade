# Pedal Point (`pedal-point/`)

- WHAT IT TEACHES: tuning a timpani BY EAR. Each round the game plays a REFERENCE (a pitch pipe); the student strikes a virtual timpani and works its PEDAL (and the fine tuner) until the drum matches, then LOCKS IN and is scored on how close it got, in cents. Zone `ear-training`; `noInstrument: true` (so it is in NO INSTRUMENT NEEDED by itself), `player: 'all'` (START goes straight to the game, no Select Player; any saved instrument or none, `unpitched: true` so the Snare Drum opens it too), no `fit`. `maxStars` 24 (8 levels × 3). Working title: renaming it = games.js `name` (the marquee draws the name) + the page's `<title>` / `.game-title`.
- NO MICROPHONE AT ALL (the pitched-audio exception, [CLAUDE.md](../../CLAUDE.md) hard rules and [sound.md](../engine/sound.md)): the page doesn't even load `pitch.js` or `mic-gate.js`; no `requireMic`. Every pitched sound is the game's own (`timpani.js`) through `Sfx.output()` (SOUND OFF and the EFFECTS slider apply; never an AudioContext of its own), and every one REFUSES to play while `Arcade.Pitch.listening()` (it never listens; the guard keeps the rule honest). Because the game makes every sound, the score is exact.

## The sound (`timpani.js` = `Arcade.Timpani`)

- MODAL SYNTHESIS on `Sfx.output()`'s context: a sum of decaying sine MODES at the real timpani ratios relative to the PRINCIPAL (the pitch heard): 1.00, 1.50, 1.98, 2.44, 2.94, gains falling off (1, .55, .34, .20, .12), each decaying a little faster as it goes up (decay × .8, .62, .48, .38 of the principal's); a low THUMP mode (ratio .62) damped in 0.07 s; a felt MALLET attack (band-passed noise, 30 ms, 900 Hz; a tap 550 Hz). THE RING: the principal falls to −60 dB in `ringLow` 5 s at D2 down to `ringHigh` 3.2 s at A3 (by log pitch). EVERY NUMBER IS IN ONE COMMENTED `TIMPANI` BLOCK at the top of the file, so Mr. Graham can tune the sound by ear (change, reload, tap the drum).
- THE PEDAL MOVES A RINGING DRUM: `Timpani.setFreq(key, f)` glides every mode of a ringing drum together (`setTargetAtTime`, `TIMPANI.glide` 0.04 s), so students hear the glissando real timpanists use. A new strike (`strike(key, f, {soft})`) restarts the ring at the current pitch (the old voice fades in 25 ms).
- STRIKE: a TUNING TAP (`soft`: `tapVol` .38 of a stroke, upper modes × `tapBright` .55, a darker mallet) and a full STROKE, as timpanists tap lightly while tuning.
- THE REFERENCE is a different sound from the drum, as in real life: a PITCH PIPE (`pipe(f, {sec})`, the `PIPE` block: a free-reed PeriodicWave, odd harmonics a little stronger, a low-pass at 14 × the pitch, no vibrato, held `RULES.pipeSec` 2 s). Students learn to match across timbres.
- `Timpani.test` for tests: `principal(key)`, `partials(key)` (the frequencies every mode is headed for), `live(key)` (the oscillators' own frequency now), `ringing(key)`, `history` (every strike and pipe, `played` false when refused), `glides`, `voiceStart(key)`.
- HEADPHONES: tablet and Chromebook speakers barely reproduce 70–110 Hz (the low drums). The overtones still carry the pitch, and the first level ever played shows a one-time toast "Headphones help: these drums are LOW." (`gameData('pedal-point').hpTip`); it never blocks play.

## The drums (`drums.js`, one table: `PP_DRUMS`; `Arcade.PPDrums` = the math)

| Drum | Range (the principal, concert) |
|---|---|
| 32" | D2–A2 |
| 29" | F2–C3 |
| 26" | B♭2–F3 |
| 23" | D3–A3 |

- `comfy` (1): a level's targets come from the COMFORTABLE MIDDLE, one half step in from each end. On the stage the drums stand low to high, left to right (the American setup), each kettle drawn to its size.
- THE PEDAL maps its travel to the range in EQUAL CENTS (log frequency): `freqAt(d, pedal, fine)` = low × 2^((pedal × span + fine) / 1200); toe down (drag UP the screen) = higher, heel down = lower, like a balanced-action pedal. A drag moves it from where it is (never jumps to the finger). ↑/↓ = `RULES.pedalStep` 25 cents.
- THE FINE TUNER (the T-handle, `PP_FINE_CENTS` ±50 cents) is shown ON EVERY LEVEL (levels.js `fine: true`), by design: on a touchscreen one pixel of the pedal is about 3 cents, so the last few cents need it (and 6 cents earns 3 ★). It is one control under the stage for the active drum: drag sideways (`RULES.finePx` 1.6 px a cent; the T turns), or − / + (`fineStep` 2 cents), or Shift + ↑/↓. To show it only from level 3 on, set `fine: false` on levels 1–2.
- THE TUNING GAUGE (the note-letter plate under the rim): the note NEAREST the drum's pitch (`gauge()`), letters only. ON in levels 1 and 3, OFF in the rest; the first gauge-off level a student opens says once, in its intro, "The gauge is gone. Gauges drift: trust your ear." (`gameData('pedal-point').gaugeLesson`). No other pitch display while tuning: no numbers, no meter, no ticks on the pedal (Pick Your Drum shows each drum's range, which it needs).
- NOTE NAMES: the shared speller (`Arcade.music.spell`) in concert pitch, flats except F♯ (B♭ not A♯, E♭, A♭, D♭; F♯): `PPDrums.label(midi)`. Never a second speller.

## The levels (`levels.js`: `PP_LEVELS`, saved by number: never reorder), the shared LEVEL SELECT PATTERN

Each level starts with its intro (`UI.intro`: the idea in one paragraph, LET'S TUNE! / LEVELS). The reference plays by itself at the start of every round. `ref: 'any'` = ▶ REFERENCE replays any time (even while the drum rings, to hear the two beat); `'once'` = that first play only (the button is hidden). Targets never repeat in a level.

| # | Name | What it asks |
|---|---|---|
| 1 | Match It | the 29", the target named, replays, gauge ON |
| 2 | By Ear | the same, not named, gauge OFF |
| 3 | Pick Your Drum | 4 drums, the target named: tap a drum whose range has it (a wrong one: the toast "That note is out of this drum's range", a shake, `note-wrong`; nothing else lost but time), then tune; gauge ON, ranges shown |
| 4 | Pitch Pipe | the 29" or 26" (the game lights the one the note sits on), the pitch pipe ONCE, not named |
| 5 | Fifths and Fourths | a named reference (`PP_REFS`, F2–C4) and "Tune the 26" drum to the D a fifth below this A": ±5 / ±7 half steps; replays |
| 6 | Octaves and Fifths | ±5 / ±7 / ±12 from a named reference heard ONCE; only the interval is named |
| 7 | Two-Drum Setup | `PP_KEYS`: B♭ (B♭2 on 29", F2 on 32"), E♭ (E♭3 on 26", B♭2 on 29"), F (F2 on 32", C3 on 26"), A♭ (A♭2 on 29", E♭3 on 26"); ONE reference (the tonic), both drums tuned (←/→ or a tap switches), both scored; 4 rounds (one per key, shuffled) |
| 8 | Quick Change | the drum starts EXACTLY on the old note; "Change F to G in 4 bars": the new note's pitch pipe plays once, then 4 bars of 4 at ♩ = 100 are counted (bar boxes, beat dots, a running bar, `pp-count` each beat); lock in before the downbeat, or the downbeat judges the drum where it is (late) |

- An interval target is reference + interval exactly, on the drum whose comfortable middle has it nearest its center (`bestDrum`): A3 → a fifth below = D3 on the 26"; a fourth below = E3 on the 23". A QUICK CHANGE moves `steps` 1–4 half steps inside one drum's comfortable middle.
- The level select's cards: "Level N", a small kettle, the name, the one-line `idea`, the stars and "Best N" (or "5 tunings" / "4 keys"). A level opens when the one before has a star (`?demo`: all open).

## Scoring (`PP_SCORING`)

- A tuning's error = 1200 × log2(drum ÷ target) cents (the principal; + = sharp). Stars from the level's AVERAGE |error|: ≤ 25 = 1 ★, ≤ 12 = 2 ★, ≤ 6 = 3 ★ (`stars`). QUICK CHANGE: any change not locked in before the downbeat caps the level at `lateStars` 1. Points: 100 − 3 × |cents| (never below 0) a tuning; the level's score (their sum) is its Best. A tuning within `bullseye` 3 cents says BULLSEYE! and plays `pp-star`.
- Saved: `A.store.setLevel('pedal-point', 'all', level, {stars, best})` (one progress key; the instrument doesn't matter), so the leaderboard's star events and today's activity work like every game. Nothing new leaves the device (the PRIVACY RULE is unchanged).
- Results (`UI.results`): Average (cents), Closest, Score; NEXT LEVEL (with a star), TRY AGAIN, LEVELS.

## The screen and the controls

- The stage (`--pp-*` tokens in theme.css): a dark stage under a warm spotlight; 1–4 copper kettles seen from the player's seat, the ACTIVE one lit (`.on`), the round's other drums usable, the rest resting (dimmed, `.rest`). Under each kettle its gauge (when on) and its PEDAL: a vertical track with a chrome footplate, "TOE ▲" / "HEEL ▼", ≥ 64 px wide and 118–190 px tall, `touch-action: none`, pointer capture, `Arcade.holdGuard({lock})`. A strike WOBBLES the head (0.6 s) and lights it; under reduced motion / MOTION off only the light (no wobble).
- Buttons: TAP (a tuning tap; a tap on the kettle itself is one too, and makes it the active drum), STROKE (a full stroke), ▶ REFERENCE (only where replays are allowed), LOCK IN.
- KEYBOARD: ←/→ pick a drum (PICK YOUR DRUM: move the dashed cursor, Space/Enter picks), ↑/↓ the pedal (Shift = the fine tuner), Space = tap, Shift+Space = stroke, R = reference, Enter = LOCK IN; after a lock-in the focus is on NEXT (Enter).
- AFTER LOCK IN (never during tuning, so nothing gives the answer away): per drum, its error in words ("+7 cents sharp", "−14 cents flat", "Right on: 0 cents"), a cents meter (−50…+50, the 2 ★ and 3 ★ zones), the target (gold) and the drum (its nearest note: green within 6 cents, blue within 25, coral beyond) on a small bass-clef staff (`staffSVG`), then the pitch pipe and the drum played TOGETHER (`RULES.bothSec` 1.6 s each, one tuning after another; ▶ HEAR BOTH again), and NEXT.
- THE PAUSE MENU (`UI.pause`): every sound stops; QUICK CHANGE's count holds (`countStart` shifted by the paused time); a once-only reference interrupted by PAUSE plays again, free, on RESUME.

## Arcade integration

- games.js: `menuMusic: 'pedal-point-menu'` (a loop slot in sounds.js, screen `pedal-point`; the arcade's select-music until uploaded), faded out as a level starts (tuning needs quiet), back with the results. Effects (all UNPITCHED noise, `mic: false`): `pp-lock` (LOCK IN), `pp-star` (a bullseye), `pp-count` (QUICK CHANGE's beats); shared `level-complete`, `level-failed`, `star-earned`, `new-high-score`, `note-wrong`, `ui-toggle`.
- The look: cabinet `shape: 'timpani'` (a drum head and copper kettle band over the marquee, crossed felt mallets on the side panels, the pedal on the kick plate), `screen: 'timpani'` (a canvas: two waves BEATING slower and slower as the pedal rises, then a steady gold wave and IN TUNE; 6 s loop, 2D and 3D), lettering `kettles` (spotlight yellow in a copper-amber frame), marquee scene `kettles` (a timpani at each end of the sign under a spotlight, taking turns ringing: soft rings spread over the head, never a flash), menu background `timpani` (a concert stage at night: a red curtain, two pairs of copper kettles at the edges under breathing spotlights, dust in the light; `STILL` 3), 3D profile `timpani` with a `kettle` topper (a copper half-sphere on three chrome legs, its head ringed in the second trim color).
- TODAY'S PRACTICE: not in any skill rotation yet (`shared/practice.js`); Mr. Graham decides later.

## Tests

- `tests/pedal-point.spec.js`: the synth (the principal = the target's frequency at a pedal position, equal cents across the range, the modes at their ratios, the pedal gliding a ringing drum without restarting it, the live oscillators in Chromium, nothing with SOUND OFF or while `Pitch.listening()` is forced true); the drums (range ends, the fine tuner's ±50, the gauge at every half step with band spellings); scoring (cents by ratio, 0 / +7 / −14 / +30 cents → 3 / 2 / 1 / 0 ★, a real lock-in at exact pitch = 0 cents, a level of 30-cent misses saves nothing); each level (replays any vs once, the gauge lesson once, targets never repeat, the wrong drum's message, A3 → D3, every interval round, the four keys and both drums scored, QUICK CHANGE's start note, count, PAUSE and late downbeat); no `getUserMedia` call at all and no `Arcade.Pitch`, with no instrument chosen; the keyboard; the layout at a phone, an iPad both ways and a Chromebook (every control on the screen, pedals ≥ 64 px, dragged by touch and by mouse, the fine tuner dragged and stepped, a resting pedal never moves).
- `tests/games.js` STEPS: the game run presses LET'S TUNE!, then A + Enter, Enter (`?demo`: A = tune every target drum exactly, W = 30 cents sharp; `Arcade.PedalPoint.state()` / `begin(lv)` / `intro(lv)` / `auto()` / `wrong()` / `lock()` / `next()` / `pick(i)` / `setPedal(i, p)` / `setFine(i, c)` / `strike(soft)` / `reference()` / `starsFor(avg, late)` / `intervalTarget(ref, iv)`). Smoke and phone-width cover the page automatically.
