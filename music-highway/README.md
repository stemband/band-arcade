# Music Highway

A play-along rhythm game. Neon light pads race down a synthwave highway in time with a backing groove, one lane per
pitch (low on the left, high on the right); the student plays each note as its pad reaches its lane's gate. The microphone
judges the pitch and the timing (from the note's attack).

| File | What it is |
|---|---|
| `songs.js` | **THE SONG LIST.** Every song, in the format below. Mat edits this. |
| `song-map.js` | The song engine: scale degrees → concert pitch → each instrument's written notes, octave fitting, chords. |
| `notation.js` | The notation engine: note values, beams, rests, ties, accidentals, engraving-style spacing and the time → x map the scrolling staff follows (also the Song Board and the trouble spot). |
| `settings.js` | Judging windows, scoring, stars, speeds, the highway (lanes, pads, pad spacing, the sun), the gate glow, performance, staff spacing, calibration, volumes. |
| `backing.js` | The generated drums (and the headphones-mode band), scheduled on the audio clock. |
| `game.js` | The game: song select, the highway, judging, calibration, the headphones check, results. |
| `../shared/highway-draw.js` | The highway drawing (sunset, road, pads, trails, gates), shared with the arcade cabinet's attract screen. |
| `songs.html` | The **Song Board**: every song on a staff (concert and any instrument), letter names, ▶ PLAY. |

## The song format

A song is one object in `window.MH_SONGS` (songs.js). **Songs are levels: stars are saved by song number, so never
reorder or remove songs. Add new ones at the end.**

```js
{
  id: 'ode-to-joy',              // never change (the drums file is shared/sounds/mh-drums-<id>.m4a)
  title: 'Ode to Joy',
  source: 'Ludwig van Beethoven (Symphony No. 9, main theme)',
  tier: 1,                       // 1 = degrees 1–5 only (first-five octave) · 2 = whole scale · 3 = wider range, minor, accidentals, syncopation
  tempo: 100,                    // quarter notes per minute
  timeSig: [4, 4],               // [4, 4] | [3, 4] | [2, 4]
  key: 'Bb',                     // the CONCERT major key (its key signature); 'Bb' for every song so far
  mode: 'minor',                 // optional: degree 1 = the key's relative minor (in B♭: G minor)
  style: 'rock',                 // drum groove: 'rock' | 'march' | 'swing' | 'waltz'
  sticking: 'RLRL RRLL …',        // optional, the snare: one R/L per note (left out = the student's ALTERNATE / DOWNBEATS RIGHT)
  chords: 'I I V I | …',         // optional: one Roman numeral per measure (headphones mode only; left out = chosen from the melody)
  notes: [                       // in order; no overlaps (one melody line)
    {deg: 3, oct: 0, beats: 1},            // a scale degree 1–7 of the key (or of the minor)
    {deg: 4, oct: 0, beats: 0.5, acc: 1},  // acc: +1 raised a half step (♯ or ♮), -1 lowered
    {rest: 2},                             // a rest, in beats
  ],
}
```

- **deg** 1–7: a scale degree of `key` (major) or of its relative minor (`mode: 'minor'`).
- **oct**: 0 = the octave from degree 1 up to degree 7; 1 = the octave above; −1 = below.
- **beats**: length in quarter-note beats (1 = quarter, 0.5 = eighth, 0.25 = sixteenth, 1.5 = dotted quarter, 3 = dotted half).
- **acc** (optional): +1 / −1 half step. The engine spells it in each instrument's written key (a raised 4th in concert
  B♭ is E♮ for flute, F♯ for trumpet).
- **{rest: beats}**: silence.

In songs.js the notes are typed as short NOTE TEXT (`N('3 3 4 5 | 5 4 3 2')`: `5,` = an octave lower, `1'` = higher,
`#4` / `b7` = raised / lowered, `:2` = two beats, `r:2` = a two-beat rest, `|` = a bar line that is CHECKED: a
measure that doesn't add up is reported in the browser console and on the Song Board). `N()` turns the text into the
objects above, which are the real format.

### What the engine does with it

1. **Concert pitch.** Degree 1 in octave 0 of `'Bb'` is B♭3 (concert); a minor song's degree 1 is its relative minor.
2. **The C–G horn.** A group whose first five start on another concert pitch (the horn's C–G start) gets the whole song
   moved to its own first five (concert F), so tier-1 songs use only notes it knows.
3. **Each instrument's written notes** = concert + the member's `sounds` (shared/instruments.js), spelled in its written
   key, drawn under its key signature.
4. **The octave.** Tier 1: degree 1 lands exactly on the first note of the student's first five. Tiers 2–3: the octave
   that fits the member's GMEA chromatic range best, closest to its first five, preferring notes with a fingering in
   `shared/fingerings.js`.
5. **Matching** is by concert pitch class (any octave), from the note's attack.
6. **The snare** plays the same rhythm: every note is a hit (R / L sticking), any clean attack counts.

## A future MIDI importer

A MIDI importer only needs to write song objects in this format (no MIDI code exists yet):

- Take one monophonic track (the melody); ticks → beats (`ticks / ticksPerQuarter`); gaps → `{rest}`.
- Tempo from the first tempo event (`tempo = 60 000 000 / µs per quarter`), time signature from the first one.
- Pick the concert major key (the key signature event, or ask) and turn each MIDI note into `deg` / `oct` / `acc`
  relative to its tonic (B♭3 = degree 1, octave 0 for `'Bb'`). A note outside the major scale = the degree below with
  `acc: 1` (or above with `acc: -1`, matching the key's flats).
- Set `tier` by hand, choose a `style`, and paste the object at the END of `MH_SONGS`.
- Open the Song Board to check it: measures that don't add up are listed there.

## Timing, calibration, headphones

- Everything runs on the arcade's AudioContext clock: the drums are scheduled on it, and the highway, staff and judge
  read the AUDIBLE time (`getOutputTimestamp` / `outputLatency`), so nothing drifts during a long song.
- **CALIBRATION** ("play any note on each of the 8 clicks", after 4 clicks to listen to) measures the delay of the
  microphone + note detector (+ any speaker delay the audio clock doesn't know about, like Bluetooth). Saved per device,
  separately for speaker mode and headphones mode (`gameData('music-highway').calib`). RECALIBRATE on the song select.
- **Windows** (settings.js, after that correction): PERFECT ±90 ms, GOOD ±170, OK ±260, EARLY/LATE up to ±420 (counts,
  combo resets), else MISS. Long notes (2+ beats): a hold bonus while the note keeps sounding (letting go only ends the bonus).
- **HEADPHONES MODE** adds a quiet guide melody, bass and chords (pitched), but only after the SPEAKER CHECK: three test
  notes play while the microphone listens; if it hears them, "It sounds like your speakers are on. Plug in headphones to
  use this mode." and the mode stays off. The check runs every time the mode is turned on, and before the first song
  after the page loads with it on.
- The backing plays while the microphone listens and does **not** mute it (see CLAUDE.md): the drums are unpitched, a
  hit only counts with the right pitch, and a snare player's hit on one of the backing's own drum hits must be clearly
  louder than the drums the microphone heard back (their level is learned during the count-in and between notes).

## Testing (`?demo`)

Space (or T) = an attack on the note at the line, W = a wrong note, hold S = hold it, 1–5 = your first five. Every song
is open. `Arcade.Highway.state()`, `.autoPlay(offsetMs | [offsets])`, `.start(i, {practice})`, `.speakerResult()`,
`.clock()`.
