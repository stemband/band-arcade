# Arcade Quest: your own art

Every picture in Arcade Quest is drawn in code (`arcade-quest/sprites.js`, `sprites-manor.js`), but any of them can be
replaced by a PNG in this folder. If `art/<sprite id>.png` exists, the game uses it instead of the drawn sprite; if it
doesn't, nothing changes. (A missing file is only asked for once per browser tab. Opening the game by double-clicking
`index.html` skips this folder: use the local server or the website.)

Rules for every PNG:

- **Transparent background**, pixel art at **1×** (the game scales it up with sharp pixels). Don't draw it bigger.
- Frames go **side by side, left to right**, each exactly the sprite's size. No gaps, no padding.
- Keep the character's feet and the instrument inside the frame.

## Band kids (the players): one sheet per instrument

`art/player-<instrument>.png`, frames **32 × 32 px**, **4 rows × 6 columns** (192 × 128 px in all):

| Row | What | Columns 1–2 | Columns 3–6 |
|---|---|---|---|
| 1 (top) | CARRY, facing **right** (battle, title; walking left is this row mirrored) | idle (breathing) | walk cycle |
| 2 | CARRY, facing **you** (walking down) | idle | walk cycle |
| 3 | CARRY, facing **away** (walking up) | idle | walk cycle |
| 4 | PLAYING, facing right (only during a playing challenge) | 2 frames: a breath, or for bells and snare **mallets up**, then **striking** | leave empty |

The walk cycle is 4 frames: step, pass, other step, pass. Put the feet on the bottom rows (y 29–30) and keep the
character in the same spot in every frame, or it will jitter.

- **CARRY:** the instrument is held in the hands, not at the mouth.
- **PLAYING:** the mouthpiece or reed is at the lips (bells and snare: striking).
- **Skins:** your drawing replaces the code-drawn outline tint.

Instrument ids: `flute`, `oboe`, `clarinet`, `basscl`, `bassoon`, `altosax`, `tenorsax`, `barisax`, `trumpet`, `horn`,
`trombone`, `baritonetc`, `euphbc`, `tuba`, `bells`, `snare` (e.g. `art/player-trumpet.png`).

You can check your sheet at `arcade-quest/index.html?sprites` (the sprite review page shows every frame).

## Enemies, the mini-boss, NPCs and tiles

| Sprite ids | Frame size | Frames |
|---|---|---|
| `squawk`, `warble`, `clatterbox`, `quizzle`, `stickyvalve`, `wisp`, `squeaker`, `hush`, `wobble`, `chatterbox` | 32 × 32 | 3: idle, idle, happy (befriended) |
| `fermata` (The Phantom Fermata) | 56 × 40 | 3: idle, idle, happy |
| `conductor` (The Ghost Conductor, the final boss) | 48 × 48 | 3: baton up, downbeat, happy (both arms up) |
| `mic-big` (the Mysterious Microphone: title screen and cliffhanger) | 32 × 56 | 1 (keep the red light at x 14–15, y 29–30: it blinks there) |
| `mic-shadow` (the microphone glimpsed in windows) | 7 × 12 | 1 |
| `npc-mezzo`, `npc-rusty`, `npc-terry`, `npc-reginald`, `npc-tilly`, `npc-tally`, `npc-butler`, `npc-lou`, `npc-fran`, `npc-dot`, `npc-sizzle` | 24 × 28 | 2 (a gentle bob) |
| `tile-floor`, `tile-wall`, `tile-carpet`… (every `tile-*` in `sprites-manor.js`) | 16 × 16 | 1, or 2 for `tile-candle`, `tile-fireplace`, `tile-fog`, `tile-jukebox`, `tile-stove` (they flicker) |
| `sour`, `static`, `rest` (dodge shapes), `cursor` (your note), `fermata-sm`, `baton-tip` (the Conductor's) | as in `sprites.js` / `sprites-story.js` | as drawn |

After adding or replacing files, reload the page (clearing the tab's memory of missing files: open a new tab).
