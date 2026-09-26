# Marquee art (optional)

Every cabinet's marquee (the lit sign at the top) is drawn in code by `shared/marquees.js`: an animated scene behind
the game's title. You can replace the scene with your own picture at any time. Just add a file here; no code changes.

| File name | What it does |
|---|---|
| `<game-id>.png` or `<game-id>.webp` | Replaces the drawn **scene**. The game's title is still drawn on top (with its glow and dark outline). |
| `<game-id>-full.png` or `<game-id>-full.webp` | Replaces the **whole** marquee. Your picture must include the title. |

`<game-id>` is the game's `id` in `shared/games.js` (the folder name): `note-storm`, `ghost-notes`, `note-checker`,
`note-ninja`, `chime-heist`, `ancient-ninja-scrolls`, `button-masher`, `neon-face-off`, `showtime-malfunction`,
`sustain-speedway`, `arcade-quest`. If both files exist, the `-full` one wins; `.webp` is tried before `.png`.

## Size

- **Recommended: 1200 × 300 pixels** (4 : 1), under about 250 KB (WebP is smallest).
- The sign is not the same shape on every cabinet (from about 2.3 : 1 to 4.5 : 1), so the picture is scaled to
  **cover** it and centered: the left and right edges, or the top and bottom, may be cut off. Keep anything important
  (and, for `-full`, the title) in the middle 60 % of the width and the middle 70 % of the height.
- For a background (`<game-id>.png`), keep the middle darker and calmer: the title is drawn over it.
- Your picture is a still image: it doesn't animate (the drawn scenes do).

## Rules

- **No flashing.** A picture is still, so this only matters if you ever make an animated one: nothing may flash more than 3 times a second.
- A picture that fails to load is skipped (the drawn scene shows instead), and the arcade doesn't ask for it again
  until the browser tab is reopened.
- Opened from a file on your computer (double-click), the **3D** arcade can't use pictures (browsers forbid it for
  WebGL), so it shows the drawn scene; the 2D arcade (`?flat`) and Select Player still show your picture. On the
  website both work.
- After replacing a picture, students may need to reload the page once to see the new one (the browser caches it).
