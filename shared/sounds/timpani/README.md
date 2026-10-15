# Pedal Point's recorded timpani

These are the drums students hear in **Pedal Point** (`pedal-point/`). Every file here is listed, with the pitch it
plays at, in **`pedal-point/samples.js`**: that table is what the game reads. A file that isn't in the table is never
played. (If the files can't load, for example a page opened by double-clicking, the game quietly plays its own
synthesized drum instead, and DRUM SOUND says "Recorded (not available here)".)

## What's here

- **65 files**, `timp-<note>-<layer>-<take>.m4a`, for example `timp-c3-mid-2.m4a` = C3, struck medium, the 2nd take.
  Notes are written `ab2` = A♭2, `fs3` = F♯3. They cover about D2 to F♯3 (the game stretches the nearest take to any
  pitch on the drums, D2 to A3).
- **Layers** (how hard the drum was struck): `soft`, `mid`, `loud`. A tuning tap plays a soft take, a stroke a mid
  one; the Practice Room's p / mf / f play soft / mid / loud.
- **Already processed. Never re-encode, trim or normalize them:**
  - mono AAC at 80 kbps (about 2.4 MB in all);
  - **the mallet hits exactly 10 ms into every file** (the game starts each take 2 ms before the hit, so a tap is
    heard at once and a scheduled stroke lands exactly on the beat: `HIT_MS` in `pedal-point/samples.js`);
  - a 300 ms fade at the end;
  - levels matched within each layer, with the real difference between layers kept (peaks: soft about −24 dB, mid
    about −16, loud about −4).
- **The compressor skips this folder on purpose.** `tools/compress-sounds.py` (the "Compress uploaded sounds" bot) only
  looks at the top level of `shared/sounds/`. These files are already small, and re-encoding them would move the
  10 ms hit and change the levels.

## Where they came from (the credit)

The **Versilian Community Sample Library (VCSL)** by Versilian Studios, **CC0 1.0** (public domain):
<https://github.com/sgossner/VCSL>, `Membranophones/Struck Membranophones/Timpani 2/Hit/`. Velocity 2 = soft, 3 = mid,
5 = loud. The comment after each line of `pedal-point/samples.js` names the VCSL take it came from. Two physical drums:
"Timpani 2" drum 6 (A♭2–E3) and drum 7 (D2, F2, G2, F♯3).

The pitches were **measured**: each take's spectrum after the attack (0.26–2.26 s) gave the principal (the (1,1) mode,
the pitch we hear) and its overtones near 1.5× and 2×. Takes where the two disagreed by more than 20 cents were dropped
(the pitch has to be unambiguous), and so were takes that ring for less than about 2 s (VCSL's smallest drums were cut
short at F3 and A3). The table's `hz` is the geometric mean of the principal and the overtone-fitted pitch.

## Fine-tune a pitch by ear: THE SAMPLE TUNER

Open **`pedal-point/index.html?tune-samples`** (for example `https://bandarcade.org/pedal-point/index.html?tune-samples`;
the Sound Board's Pedal Point row links it). Every take is listed by pitch. Press **▶ BOTH**: the drum, then the pitch
pipe at the row's pitch, under its ring. If they beat against each other, nudge the row's cents (−5 / −1 / +1 / +5)
until they sound in tune. Then press **COPY CHANGED LINES** and paste them over the same lines in
`pedal-point/samples.js` (or give them to Claude Code). Nothing is saved on the page: leaving it forgets the nudges.

## To replace them with your own drums

1. **Record.** One quiet room, the microphone 2–3 ft above the head.
   - Each drum (the 32", 29", 26" and 23") at 3–4 pitches across its range.
   - Three dynamics (soft, medium, loud), two takes each.
   - Let every note ring until it is silent (6 s or more), and don't damp it.
2. **Send the recordings to Claude in chat.** It trims them (the hit at 10 ms), matches the levels, measures the
   pitches, encodes them, and gives you the files and the new table lines.
3. **Upload the files here** (`shared/sounds/timpani/`), **paste the lines into `pedal-point/samples.js`** (replacing
   the `list`), and **bump `SOUNDS_VERSION`** by 1 at the top of `shared/sounds.js`, so every device fetches the new
   files.
4. Old files that aren't in the table any more are simply unused; delete them whenever you like.
5. Fine-tune any pitch by ear with the SAMPLE TUNER (above).
