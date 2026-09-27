# Menu backgrounds

Every game's **menu screens** (level select, mode picker, level intros, results, setup and title screens) show a
background behind the menu. Gameplay screens never do: the background fades away (0.4 s) when play starts and
comes back on the next menu.

By default each game shows its own **animated scene drawn in code** (`shared/bg-scenes.js`, picked by `bg.scene` in
`shared/games.js`). **Your own picture always wins**: put it in this folder and that game shows it instead.

## File names

Name the file exactly after the game's folder name:

| Game | Landscape file | Portrait file (optional) |
|---|---|---|
| Ghost Notes | `ghost-notes.webp` | `ghost-notes-portrait.webp` |
| Note Storm | `note-storm.webp` | `note-storm-portrait.webp` |
| Note Ninja | `note-ninja.webp` | `note-ninja-portrait.webp` |
| Vanishing Ink | `vanishing-ink.webp` | `vanishing-ink-portrait.webp` |
| Chime Heist | `chime-heist.webp` | `chime-heist-portrait.webp` |
| Ancient Ninja Scrolls | `ancient-ninja-scrolls.webp` | `ancient-ninja-scrolls-portrait.webp` |
| Button Masher | `button-masher.webp` | `button-masher-portrait.webp` |
| Neon Face-Off | `neon-face-off.webp` | `neon-face-off-portrait.webp` |
| Showtime Malfunction | `showtime-malfunction.webp` | `showtime-malfunction-portrait.webp` |
| Sustain Speedway | `sustain-speedway.webp` | `sustain-speedway-portrait.webp` |
| Lost Signal | `lost-signal.webp` | `lost-signal-portrait.webp` |
| Dojo Duel | `dojo-duel.webp` | `dojo-duel-portrait.webp` |
| Arcade Quest (title screen) | `arcade-quest.webp` | `arcade-quest-portrait.webp` |
| Note Checker | `note-checker.webp` | `note-checker-portrait.webp` |

- `.webp`, `.jpg` or `.png` all work (tried in that order).
- **Landscape: 1920 × 1080. Portrait: 1080 × 1920.** The picture is scaled to cover the screen, so keep anything
  important away from the very edges. Without a portrait file, tall screens crop the landscape one.
- Keep each file **under about 400 KB** (WebP at quality 75–80 is usually plenty): school Wi-Fi is slow.
- Keep it **dark and calm**, with nothing important in the middle: the menu sits on top. A dark overlay is added
  anyway (`bg.dim` = how dark everywhere, `bg.focus` = extra darkness in the middle; both 0–1, in `shared/games.js`).
- The **Art Board** (`art-board/index.html`) shows every game's scene next to its picture slots, and which one is
  showing.

A missing file is looked for once per browser tab, so a picture you just uploaded shows after a new tab (or after the
site updates).
