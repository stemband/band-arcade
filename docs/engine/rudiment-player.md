# The rudiment player

`shared/rudiment-player.js` = `Arcade.RudimentPlayer`: plays any rudiment written in the rhythm text format (sticking,
accents, grace notes, rolls, buzzes: RUDIMENT NOTATION in [rhythm.md](rhythm.md)) in time, with Mr. Graham's snare
recordings, and lights each stroke as it sounds. Shared code for the Rudiment Trainer (and any page that plays a
rudiment). Loaded only by the pages that use it (today: the Sound Board), after `music-highway/backing.js` (the
fallback kit), `shared/calibration.js` (the audio clock), `shared/counting.js` and `shared/rhythm-staff.js`.

- **It never listens.** It plays only UNPITCHED drum sounds (like the metronome's click), never through `Sfx.event`, and
  refuses to start while a microphone listens (`Pitch.listening()`: `start()` resolves `false`).
- **No audio of its own:** it plays into `Sfx.output().out` (SOUND ON/OFF and the EFFECTS slider apply) on the arcade's
  AudioContext. Never `new Audio()`, never another AudioContext.

## The five sounds (sounds.js screen `rudiments`)

`rudiment-stroke`, `rudiment-accent`, `rudiment-grace`, `rudiment-buzz`, `rudiment-click` (all `mic: false`,
`play: false`; listed in `shared/sounds/README.md`). **The hit is exactly 10 ms into every file** (Mr. Graham trims them
so): `HIT_OFFSET_S = 0.010`, and every buffer starts 10 ms BEFORE its stroke's time, so the hit lands on the beat. A
stroke too close to "now" to start 10 ms early is skipped, never played late (NOTHING PLAYS LATE, [sound.md](sound.md)).
The files carry the dynamics (the accent about 8.5 dB over a stroke, the grace about 9 dB under); `rudiment-accent`
peaks near full scale after compression, so its sounds.js `vol` is .8. A source's level = `GAIN[kind]` × its sounds.js
`vol`. **A missing file** (or one not decoded yet, or a browser that can't decode it): Music Highway's kit
(`MHBacking`) plays instead, the same plan: the snare at velocity stroke .65, accent 1, grace .25; a buzz = 4 very fast
soft snare hits (`KIT`); the click = `kit.click`.

## `plan(parsed, opts)`: the schedule as data (pure, no audio)

→ `[{time (s from the start), kind: 'stroke'|'accent'|'grace'|'buzz'|'click', gain, n, s, rep, hand}]` in time order
(+ `copy` on extra buzz copies; clicks carry `beat`, `down`, and `countOff` or `track`). The array also has `.bpmAt(time)`,
`.gridS` (the pattern's start), `.endS`, `.patternS`, `.beatS`, `.reps`. Every test checks `plan`.

- **Strokes** come from `Counting.strokes(parsed)`. Ticks → seconds by DIVISION only: `sec = t / beatTicks × 60 / bpm`
  (never `% 12` or integer tick keys: a written-out roll's second stroke is at a fractional tick, 1.5).
- **THE BEAT:** `bpm` counts `beat` ticks. Default: a quarter (12) in 2/4, 3/4, 4/4; a DOTTED QUARTER (18) in 6/8. Set
  `beat` per call to count something else (the Rudiment Trainer may choose per rudiment).
- **Kind:** an accent → `accent`; a grace → `grace`; a buzz → `buzz`; else `stroke`. A rolled (`/`) note's first stroke
  takes the note's kind, its second is a `stroke` (an accent on a diddle accents its first stroke only).
- **GRACES** go before their note's time: a flam's one grace `flamMs` before; a drag's graces `dragGapMs` apart, the last
  `dragGapMs` before the note (the first 2 × `dragGapMs`). At fast tempos they move closer, never further before the note
  than `graceMaxFrac` of the time since the stroke before (so a grace never lands on or before that stroke; the first
  note measures from the pattern's last stroke, as it loops). Without a count-off, the first note's graces would come
  before 0: the pattern's start shifts so nothing is before 0 (with the count-off, it absorbs them).
- **BUZZ:** a `z` note rings for its whole written value: the buzz file at the note's time, and if the note is longer than
  the file minus `buzzOverlapMs`, more copies every `buzzStepMs` at `buzzTailGain` until the note ends (a slow multiple
  bounce sounds continuous; at fast tempos none). The next note's buzz starts on time; copies may overlap; they are
  scheduled, never looped. (`buzzLenS` = the file's real length once decoded.)
- **REPEATS:** `reps` (default 1), each exactly one pattern length later (the measures' total, so a pattern ending in a
  rest loops in time); `Infinity` = until stopped (`plan` then stops at `untilS`, 60 s; the live player plans one
  repetition at a time).
- **COUNT-OFF:** `countOff` (default true): a click on each beat, the stroke grid one beat after the last click. One
  measure, or TWO when a measure has fewer than 3 beats (2/4; 6/8 counted in 2). The first click is accented
  (`clickBeat`).
- **CLICK TRACK:** `click` (default false): the same clicks on every beat through the run, each measure's downbeat
  accented.
- **OPEN–CLOSE–OPEN:** `ramp: {from, to, upS, holdS, downS}`: the tempo rises linearly (in BPM) from `from` to `to` over
  `upS` seconds, holds `holdS`, falls back over `downS`. Stroke times come from integrating the tempo (`rampMath`:
  `beatsAt(τ)`, its inverse `tauAt(beats)`), so it speeds up and slows down evenly, never in jumps. The run ends at the
  end of the first whole repetition after the ramp is done. `bpmAt(time)` = the tempo then (the screen's readout).

## `create(opts)`: the live player

`opts` = `{parsed, bpm, beat, reps (default Infinity), countOff, click, ramp, onStroke(e), onBeat(e), onEnd({stopped})}` (`stopped`: true = `stop()` or an interruption, false = the run ended by itself: a finite `reps` or OPEN–CLOSE–OPEN) →
`{start(), stop(), setBpm(bpm), setClick(on), playing(), state()}`. Like the metronome: it waits for `Sfx.output()` (the
tap unlocking the audio), loads the five buffers with `Sfx.buffer` (at most 1.5 s; whatever isn't ready plays on the
kit), starts `AudioClock`, and a look-ahead scheduler (`lookaheadS` .15 s, every `tickMs` 25 ms) turns plan entries into
`AudioBufferSourceNode`s through a GainNode into the output. With no audio (sound off) the strokes still light, on
`performance.now()`.
- `setBpm` and `setClick` take effect at the NEXT repetition's start, never mid-pattern (during a ramp `setBpm` is
  ignored).
- Each live entry also carries `bpm`: the tempo its repetition plays at (OPEN–CLOSE–OPEN: the tempo at that moment), so a page can count whole repetitions per tempo (the Rudiment Trainer's check-off). `state().audio` = the arcade's AudioContext is really running (not sound off, not suspended): the Rudiment Trainer's practice-time log counts only then.
- `onStroke(e)` (every stroke and grace, not buzz copies) and `onBeat(e)` (every beat: the count-off and the click
  track's beats, sounding or not: `e.sounded`) fire at the AUDIBLE time (`AudioClock.audAt`, from a requestAnimationFrame
  loop): what the student hears is what lights.
- `stop()` cancels every scheduled source (each fades over 20 ms, never a click) and fires `onEnd` once. A `stop()` while `start()` is still waiting (the audio unlocking, the files loading) cancels that start: it resolves `false`, nothing plays, `onEnd({stopped: true})` fires once. A hidden tab,
  `pagehide` or the AudioContext stopping (iPad interruptions) stops the run the same way: nothing bursts out on return.
- `state()`: `{playing, bpm, click, rep, log (every source: time, start, kind, file or 'kit', gain), bpmNow, …}` (tests,
  the ramp's readout). Tests and the Sound Board may pass `audio: {ctx, out}`, `buffers` and `clock`.

## `light(svgRoot, engraved)`: the highlight

→ an `onStroke` handler that puts the class `rp-now` on the drawn head of the sounding stroke (from the engraver's
`strokes: [{n, s, x}]`; graces s < 0 light their grace group) and on its sticking letter, and takes it off the last one.
Slash view: a roll's second stroke has no head of its own, so the note stays lit through both strokes; written-out view:
each stroke lights its own head. `h.clear()` turns it off. The color is the theme token `--rp-now` (theme.css:
`svg.rs .rp-now`).

## The numbers Mr. Graham tunes (top of `shared/rudiment-player.js`)

`RULES` (timing):
- `flamMs` (30): how far before the main stroke a flam's grace lands; smaller = a tighter flam, larger = a wider, "flatter" one.
- `dragGapMs` (45): the space between a drag's two graces, and from the second grace to the main stroke; smaller = a
  tighter, buzzier drag.
- `graceMaxFrac` (.35): at fast tempos the graces squeeze in: they never start further before their note than this share
  of the time since the stroke before. Smaller = graces tuck in closer at speed.
- `buzzStepMs` (220): a long buzz note plays its recording again every this many ms until the note ends; smaller =
  denser, smoother long buzzes.
- `buzzTailGain` (.8): how loud those extra buzz copies are (1 = as loud as the first).
- `buzzOverlapMs` (60): a buzz note only gets copies when it is longer than the recording minus this.
- `lookaheadS`, `tickMs`, `startS`: the scheduler (leave them).

`GAIN` (levels, relative; the files already carry the dynamics): `stroke` 1, `accent` 1, `grace` 1, `buzz` 1, `click`
.55 (the count-off and click-track clicks), `clickBeat` .8 (the count-off's first click and every downbeat). Raise a
number to make that kind of stroke louder.

## The Sound Board's RUDIMENT PLAYER (the ear check)

`sound-board/index.html`, the section RUDIMENT PLAYER (a `<details>`, starts collapsed; searchable): every syntax
example of the notation (the paradiddle, flam accent, flam tap, single drag tap, the five-stroke figure, multiple
bounce, flam accent in 6/8) drawn with sticking, with ▶ PLAY / ■ STOP (loops until stopped; one at a time), a tempo row
60 / 80 / 100 / 120 / 140 (from the next repetition), CLICK on/off, slashes ⇄ written-out, and the strokes lighting as
they sound; plus OPEN–CLOSE–OPEN (the paradiddle, 60 → 140 → 60: 40 s up, 10 s at 140, 40 s down) with a live BPM
readout. Like every PLAY on the board it plays even when SOUND is off (the board's own output; the recordings loaded
through `Sfx.board.load`). The five raw recordings have their own rows under "Rudiment player (the Rudiment Trainer)".

## Tests

`tests/rudiment-player.spec.js`: the plan (timing at 60/120 and 6/8, `s/R`'s fractional tick, flam and drag spacing and
shrinking at 140, nothing before 0, buzz copies, count-off, click track, repeats, the ramp), the live player on an
OfflineAudioContext with a test clock (every source at its time − 10 ms with the right buffer and gain, onStroke in the
plan's order, `stop()` within 30 ms, a hidden tab, every file missing = the kit, a listening microphone refuses,
`setBpm`/`setClick` at the next repetition), the highlight in both views, the five recordings (decode, the hit at
10 ± 3 ms: .m4a in WebKit) and the Sound Board section at iPad and Chromebook sizes.
