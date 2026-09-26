# Instrument portraits

Mat's artwork for the 15 players, and the skins drawn on it. `shared/portraits.js` (`Arcade.portraitHTML`) shows these images wherever a
player's portrait appears: the Select Player tiles, the big preview, CONTINUE AS, the instrument chip in every
game's top bar, the Button Masher fighter (HUD, the badge by the fighter, results) and the Neon Face-Off player
sides and results. The drawn neon SVG portrait is always underneath: if a file is missing or broken, the SVG
shows instead, never a broken image.

## File names

| File | Instrument member id (`instruments.js`) | Shown as |
|---|---|---|
| `flute.png` | `flute` | Flute |
| `oboe.png` | `oboe` | Oboe |
| `clarinet.png` | `clarinet` | Clarinet |
| `bass-clarinet.png` | `basscl` | Bass Clarinet |
| `bassoon.png` | `bassoon` | Bassoon |
| `alto-sax.png` | `altosax` | Alto Sax |
| `tenor-sax.png` | `tenorsax` | Tenor Sax |
| `bari-sax.png` | `barisax` | Bari Sax |
| `trumpet.png` | `trumpet` | Trumpet |
| `horn.png` | `horn` | Horn (both Starting notes: F–C and C–G) |
| `trombone.png` | `trombone` | Trombone |
| `baritone-tc.png` | `baritonetc` | Baritone (T.C.) |
| `euphonium.png` (or `euphonium-bc.png`) | `euphbc` | Euphonium (B.C.) |
| `tuba.png` | `tuba` | Tuba |
| `bells.png` | `bells` | Bells |
| `snare.png` | `snare` | Snare (not uploaded yet: the drawn snare drum shows) |

The map lives in `FILES` at the bottom of `shared/portraits.js`. Each name can be `.png` or `.webp`.
For the euphonium, `euphonium.png` is tried first, so if you rename it to `euphonium-bc.png`, delete the old one.
The CPU in Neon Face-Off has no file: it keeps its drawn portrait, and CPU rivals keep their recolored drawings.

## Adding or replacing a portrait

1. Draw the instrument on a **transparent background** (PNG or WebP). Any shape works: it is fitted inside a
   square without stretching or cropping, centered. Keep it under 250 KB and 1024 px if you can.
2. Save it here with the name from the table (for example `trombone.png`), replacing the old file.
3. If that instrument is listed in `OPTIMIZED` in `shared/portraits.js`, delete its copy in `optimized/` and take
   the name off the list (or make a new smaller copy, see below). Otherwise the old optimized copy still shows.
4. Open `select-player/index.html?game=ghost-notes&demo` and check the tile and the big preview.

### Optional: a bigger picture for the preview

`<name>-full.png` (for example `trumpet-full.png`) is shown only in the big preview on Select Player, and only
loaded when that instrument is highlighted. It can be tall (up to 1024 px). Without one, the preview uses the
square portrait.

### Optional: drawn skin variants

Skins (`shared/skins.js`) are drawn in code on top of your pictures: color skins become a glow, a backdrop or an
aura, and accessories are small drawings placed on the portrait. If you'd rather draw a skin yourself, save it as
`<name>--<skin id>.png` (or `.webp`), for example `trumpet--flame.png` or `horn--crown.png`, with the skin id from
the `SKINS` list in `shared/skins.js` (`sunset`, `ice`, `flame`, `galaxy`, `pixel`, `gold`, `diamond`, `animatronic`, `nightmare`, `ghostly`;
accessories `headband`, `shades`, `visor`, `crown`, `cape`, `mask`). For the big preview, `<name>-full--<skin id>.png`.

- A drawn **color** skin (`trumpet--flame.png`) replaces the code-drawn effect for that instrument. An accessory
  the student wears with it is still drawn on top.
- A drawn **accessory** (`trumpet--crown.png`) replaces the code-drawn accessory. The color skin's glow and
  backdrop still go around it.
- If a student wears both and you drew both, the color skin's picture wins.
- If an instrument has no picture at all (the drawn SVG portrait shows), a color skin just recolors its neon lines.

The site asks for each variant once per browser tab, so a variant you add shows up in a new tab.

## Accessory positions (anchors)

Where each accessory sits is set per instrument in `ANCHORS` in `shared/skins.js`. **Edit the numbers there**;
this table is a copy, to show what they mean. Every number is a PERCENT of the square portrait (the square you see
on a Select Player tile): x from the left edge, y from the top edge, and a width.

- **head** `[x, y, width]`: the top of the instrument. The bottom edge of the **Crown** sits on this point.
- **face** `[x, y, width, tilt]`: the instrument's "face". **Shades**, **Visor** and **Ninja Mask** are centered
  here and the **Headband** sits just above. Tilt is in degrees (+ turns clockwise) to follow a slanted tube.
- **back** `[x, y, width]` (optional): the top middle of the **Cape**, which hangs behind the instrument. Without
  it, the Cape hangs from just above the face.
- `img` numbers are for your picture, `svg` numbers for the drawn fallback portrait. A `-full` picture can get
  its own `full: {head, face, back}`; without it, the `img` numbers are used for it too, which will be off for a
  picture of a different shape.

To nudge something: open `select-player/index.html?game=ghost-notes&demo&unlockall`, press **SKINS**, wear the
accessory, change the numbers in `shared/skins.js`, and reload. For example, to move the trumpet's Crown up a
little, make the trumpet's head `y` smaller.

| Instrument | head (img) | face (img) | back (img) |
|---|---|---|---|
| `flute` | `[86, 7, 20]` | `[70, 31, 26, 38]` | (from face) |
| `oboe` | `[77, 6, 15]` | `[63, 30, 22, 32]` | (from face) |
| `clarinet` | `[66, 5, 15]` | `[60, 28, 22, 16]` | (from face) |
| `basscl` | `[55, 5, 20]` | `[47, 30, 22, 4]` | (from face) |
| `bassoon` | `[35, 5, 14]` | `[44, 26, 21, 22]` | (from face) |
| `altosax` | `[69, 7, 20]` | `[58, 32, 24, 35]` | (from face) |
| `tenorsax` | `[69, 7, 20]` | `[58, 32, 24, 35]` | (from face) |
| `barisax` | `[52, 7, 17]` | `[66, 32, 24, 40]` | (from face) |
| `trumpet` | `[42, 36, 22]` | `[88, 45, 20, -8]` | `[46, 40, 40]` |
| `horn` | `[78, 19, 25]` | `[80, 48, 27, 0]` | `[52, 34, 46]` |
| `trombone` | `[58, 21, 17]` | `[58, 34, 18, 0]` | `[44, 34, 34]` |
| `baritonetc` | `[60, 6, 31]` | `[40, 42, 27, 0]` | (from face) |
| `euphbc` | `[60, 6, 31]` | `[40, 42, 27, 0]` | (from face) |
| `tuba` | `[88, 25, 20]` | `[26, 57, 27, 0]` | `[42, 42, 46]` |
| `bells` | `[50, 23, 25]` | `[50, 42, 33, 0]` | `[50, 30, 44]` |
| `snare` | `[50, 43, 26]` | `[50, 64, 34, 0]` | `[50, 52, 60]` |

## Optimized copies

Images over 250 KB or 1024 px get a smaller WebP copy in `optimized/` (at most 512 px on the long side; a
`-full` image at most 1024 px tall). The original stays untouched here, and the site loads the copy. Today:

| Original | Size | Copy | Size |
|---|---|---|---|
| `alto-sax.png` | 400 KB, 675 × 599 | `optimized/alto-sax.webp` | 45 KB, 512 × 454 |
| `tenor-sax.png` | 396 KB, 675 × 599 | `optimized/tenor-sax.webp` | 45 KB, 512 × 454 |
| `bells.png` | 343 KB, 634 × 354 | `optimized/bells.webp` | 38 KB, 512 × 286 |
| `horn.png` | 311 KB, 486 × 333 | `optimized/horn.webp` | 53 KB, 486 × 333 |

To make a copy without special tools: open the image in a browser-based converter (or any photo app that saves
WebP), resize the long side to 512 px, save as WebP (quality about 90) into `optimized/`, and add the name to
`OPTIMIZED` in `shared/portraits.js`.
