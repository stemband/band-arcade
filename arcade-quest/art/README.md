# Arcade Quest: your own art

Every picture in Arcade Quest is drawn in code (`arcade-quest/sprites.js`, `sprites-manor.js`), but any of them can be
replaced by a PNG in this folder. If `art/<sprite id>.png` exists, the game uses it instead of the drawn sprite; if it
doesn't, nothing changes. (A missing file is only asked for once per browser tab. Opening the game by double-clicking
`index.html` skips this folder: use the local server or the website.)

Rules for every PNG:

- **Transparent background**, pixel art at **1×** (the game scales it up with sharp pixels). Don't draw it bigger.
- Frames go **side by side, left to right**, each exactly the sprite's size. No gaps, no padding.
- Keep the character's feet and the instrument inside the frame.

## The players: their own avatars (no PNG)

The hero is always the student's own **avatar** from Create Your Player (their skin tone, face, hair, head covering,
clothes, glasses, hearing aids, wheelchair and name), holding their instrument. It's drawn in code from
`shared/avatar-parts.js` (how to add a hair style, a hat, a top…: see the notes at the top of that file), so player
sheets (`art/player-<instrument>.png`) are no longer used. Instrument positions and hand points are the POSES in
`shared/instrument-sprites.js`.

You can check every instrument at `arcade-quest/index.html?sprites` (the sprite review page shows every frame, as
your avatar, a random one or in a wheelchair).

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
