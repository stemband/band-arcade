# Instrument portraits

Mat's artwork for the 15 players. `shared/portraits.js` (`Arcade.portraitHTML`) shows these images wherever a
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

### Optional: skin variants

`<name>--<skin-id>.png` and `<name>-full--<skin-id>.png` (for example `trumpet--gold.png`) are tried first when
a skin is passed to `Arcade.portraitHTML(id, {skin})`. There is no skins system yet (`shared/skins.js` doesn't
exist), so nothing uses them today.

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
