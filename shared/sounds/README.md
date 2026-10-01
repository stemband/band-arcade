# Band Arcade sounds

Put your own recorded sounds in this folder. Every sound the arcade makes has an event name, and each event plays
the file with the name listed below. If there's no file (or it won't play), the arcade uses its own built-in
sound for that moment, so nothing ever goes silent and students never see an error.

## Adding or replacing a sound

1. Record it and save it as **`.m4a`** (best: small, and every school iPad and Chromebook plays it) or **`.mp3`**.
2. Name it **exactly** as in the table below, for example `select-ghost-notes.m4a` or `note-hit.mp3`
   (lowercase, dashes, no spaces). If both exist, the `.m4a` is used.
3. Upload it into this folder (`shared/sounds/`) on GitHub. To replace a sound, upload a new file with the same name.
4. Open the **Sound Board** (`sound-board/index.html` on the site, e.g.
   `https://bandarcade.org/sound-board/index.html`). It checks every file when it opens; after an
   upload, press **RELOAD ALL SOUNDS** (no need to reload the page). Your file shows **YOUR FILE (m4a, 0.42 s,
   18 KB)** with its length and size, so you can tell a replaced file from the old one; a label that changed since
   the last check gets a yellow outline, and "Checked at …" shows when the check ran. The Sound Board always asks
   the server for the live files, never the browser's saved copies (GitHub Pages can take a minute to publish an
   upload). Press **Play** to hear it, and use the level meter to match its loudness to the others.
5. **After replacing sounds, bump `SOUNDS_VERSION` by 1** (the number at the very top of `shared/sounds.js`) **so
   every student's device picks up the new files right away.** See *Caching* below.

## Caching: SOUNDS_VERSION

Browsers keep a saved copy of each sound so games start fast (GitHub Pages lets them keep files for about 10
minutes, and a tab also remembers a missing sound effect until it closes; music is always checked again). That's why a replaced sound can keep playing
the old version for a while. Every sound's address ends in `?v=<SOUNDS_VERSION>`, so when you add 1 to that
number, the files count as new and every device downloads them the next time it loads the page; after that they're
saved again, so students keep fast sounds. You don't need to bump it for a brand-new sound that nobody has heard
yet, only when you replace or delete one. The games never skip the saved copies themselves (that would make
students download every sound on every page).

One catch: `shared/sounds.js` is itself a saved file, so a device that loaded a page in the last ~10 minutes may
still have the old number until its copy of `sounds.js` refreshes (at most about 10 minutes on GitHub Pages).

Tips:
- Keep files short and small (under about 100 KB each; the ambience and music loops under about 1 MB). Students load them on
  school Wi-Fi, and each page only loads its own sounds, after the first tap.
- Trim silence at the start, so the sound plays the moment it happens.
- A browser remembers a missing sound EFFECT for the rest of that tab. If you just uploaded one, open a new tab, or bump
  `SOUNDS_VERSION` (the Sound Board always checks again). Music (the loops) is never remembered as missing: a
  newly uploaded music file plays on the next page load.
- **Music not playing?** Add `?debug` to the page's address (for example `arcade-quest/index.html?debug`): a small
  MUSIC box on the page lists the track the page wants, every file it tried (404 = not there), when it loaded and
  when it started or stopped.
- Keep music files around 128 kbps. A 320 kbps file is about 2.5× bigger, so it takes longer to download on school
  Wi-Fi and to get ready on an iPad.
- Each sound's loudness can be adjusted without re-recording: change its `vol` (0–1) in `shared/sounds.js`.
- Students set their own SOUND ON/OFF, EFFECTS, MUSIC and AMBIENCE volumes with the speaker button in every top bar.
- Opening a page by double-clicking it (a local file) still plays your files, through the browser's plain audio
  player; the ambience seam and exact lengths are only right on the served site.

## Sounds and the microphone

The games that listen (Ghost Notes, Note Storm, the Note Checker, Neon Face-Off, Vanishing Ink) play sounds too. While a sound
plays, and for 250 ms after it (room echo), the arcade **ignores the microphone**: nothing heard counts as a
right note, a wrong note, or toward holding a note, and the game's timer stops, so a sound never costs a student
time. After that, a note that is still ringing has to be played again to count.

Sounds marked **during play** play in the middle of a game: keep them **under 0.5 s**, so the microphone is
only deaf for a moment. The longer ones (results, fanfares) play when nobody is being timed.

Showtime Malfunction's `attack-tick` plays after every counted note while the student is tonguing quickly, so it
only keeps the microphone deaf for its own length + 60 ms (its `echo` in `shared/sounds.js`). **Keep that recording
under 0.1 s**, or fast tonguing will start missing notes.

The **character select music** (`select-music`) plays only on Choose Your Instrument, instead of the room ambience; until you
upload one, the arcade plays its own short original chiptune loop. Make it loop cleanly, like the ambience below, and
use the Sound Board's **Loop test** to hear the seam.

The **ambience loop** (`lobby-ambience`) never plays while the microphone is listening. Make it loop cleanly: start
and end at the same loudness. The arcade skips the tiny silence that .m4a and .mp3 encoders add at the ends, so it
loops without a gap; use the Sound Board's **Loop test** to hear the seam.

The Chime Heist bell bars are always generated by the arcade (so every pitch is exactly in tune) and are never
replaced by files.

## Game menu music

Every game has its own MENU MUSIC (`menuMusic` in `shared/games.js`). It plays on the game's menu screens (level
select, mode picker, intro panels, and the results screen once the result sounds have finished), fades out (0.5 s)
when a level starts, **before the microphone listens** (music never plays while the mic listens), and fades back in
on the next menu. The MUSIC slider and the sound button control it. The Sound Board's **Music** section lists every
track with "✓ uploaded" or what plays instead, and a Play / Stop button.

**Recording menu music:** make a **seamless loop, 30–90 s long**, export it as **.m4a**, and name it **exactly** as
listed below (e.g. `showtime-malfunction-menu.m4a`) in `shared/sounds/`. Silence the encoder adds at the start or end
is trimmed automatically and the loop point is smoothed, so it wraps without a gap. Then bump `SOUNDS_VERSION`.

| Game | Menu track | File to upload | Until it is uploaded |
|---|---|---|---|
| Ghost Notes | `ghost-notes-menu` | `ghost-notes-menu.m4a` (or .mp3) | the arcade’s select-music |
| Note Storm | `note-storm-menu` | `note-storm-menu.m4a` (or .mp3) | the arcade’s select-music |
| Note Ninja | `note-ninja-menu` | `note-ninja-menu.m4a` (or .mp3) | the arcade’s select-music |
| Vanishing Ink | `vanishing-ink-music` | `vanishing-ink-music.m4a` (or .mp3) | its own rule: silent until uploaded (menus only) |
| Chime Heist | `chime-heist-menu` | `chime-heist-menu.m4a` (or .mp3) | the arcade’s select-music |
| Ancient Ninja Scrolls | `ancient-ninja-scrolls-menu` | `ancient-ninja-scrolls-menu.m4a` (or .mp3) | the arcade’s select-music |
| Button Masher | `button-masher-menu` | `button-masher-menu.m4a` (or .mp3) | the arcade’s select-music |
| Neon Face-Off | `neon-face-off-menu` | `neon-face-off-menu.m4a` (or .mp3) | the arcade’s select-music |
| Showtime Malfunction | `showtime-malfunction-menu` | `showtime-malfunction-menu.m4a` (or .mp3) | the arcade’s select-music |
| Sustain Speedway | `sustain-speedway-menu` | `sustain-speedway-menu.m4a` (or .mp3) | the arcade’s select-music |
| Keys to the City | `keys-to-the-city-menu` | `keys-to-the-city-menu.m4a` (or .mp3) | the arcade’s select-music |
| Music Highway | `music-highway-menu` | `music-highway-menu.m4a` (or .mp3) | the arcade’s select-music |
| Rhythm Dojo | `rhythm-dojo-menu` | `rhythm-dojo-menu.m4a` (or .mp3) | the arcade’s select-music |
| Scale Trainer | `scale-trainer-menu` | `scale-trainer-menu.m4a` (or .mp3) | a file already uploaded under the game's old name, `scale-audition-menu.m4a` (or .mp3), then the arcade’s select-music |
| Blocktave | `blocktave-menu` | `blocktave-menu.m4a` (or .mp3) | the arcade’s select-music |
| Lost Signal | `lost-signal-music` | `lost-signal-music.m4a` (or .mp3) | its own rule: its built-in chiptune until uploaded (level screens only) |
| Dojo Duel | `dojo-music` | `dojo-music.m4a` (or .mp3) | its own rule: its built-in chiptune until uploaded (setup screen; dojo-match-music in a match) |
| Arcade Quest | `quest-title` | `quest-title.m4a` (or .mp3) | its own rule: silent until uploaded (the title screen; every scene and room has its own track) |

## Every sound

Events for a game that doesn't exist yet can be added to `shared/sounds.js` (see the top of that file); a new
game in `shared/games.js` gets its `select-<game id>` sound automatically, falling back to `select-default`.

### Arcade floor

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `lobby-ambience` | `lobby-ambience.m4a` or `lobby-ambience.mp3` | Background room sound on the arcade floor (the AMBIENCE slider). Loops without a gap. **loops** | 20–60 s loop |
| `wheel-left` | `wheel-left.m4a` or `wheel-left.mp3` | The cabinets turn left (◀, swipe, ← key). | 0.2–0.4 s |
| `wheel-right` | `wheel-right.m4a` or `wheel-right.mp3` | The cabinets turn right (▶, swipe, → key). | 0.2–0.4 s |
| `cabinet-focus` | `cabinet-focus.m4a` or `cabinet-focus.mp3` | A new cabinet arrives at the front (quiet, after the turn). | 0.1–0.3 s |
| `zone-select` | `zone-select.m4a` or `zone-select.mp3` | A zone sign is tapped in the arcade lobby (the sign lights up), or FULL ARCADE is tapped. | 0.2–0.5 s |
| `zone-enter` | `zone-enter.m4a` or `zone-enter.mp3` | A zone (or the FULL ARCADE) opens: its cabinets appear. | 0.3–0.8 s |
| `zone-back` | `zone-back.m4a` or `zone-back.mp3` | BACK TO LOBBY (leaving a zone or ALL GAMES). | 0.2–0.6 s |
| `all-games-open` | `all-games-open.m4a` or `all-games-open.mp3` | ALL GAMES opens (the grid of every game). | 0.2–0.6 s |
| `prize-hello` | `prize-hello.m4a` or `prize-hello.mp3` | Optional voice: the Prize Counter opens and Ticket the counter bot says its line ("Welcome to the Prize Counter!"…). Silent until recorded. | 0.8–2 s |
| `prize-tokens` | `prize-tokens.m4a` or `prize-tokens.mp3` | The Prize Counter's TURN IN: stars drop into the Token Counter machine and tokens spill into the tray (a coin counter). falls back to `quest-tokens` | 0.6–1.5 s |
| `prize-win` | `prize-win.m4a` or `prize-win.mp3` | The Prize Counter: a prize is bought (a short fanfare). falls back to `skin-unlocked` | 0.5–1.2 s |
| `select-default` | `select-default.m4a` or `select-default.mp3` | START on the arcade floor, for any game without its own select-&lt;game&gt; sound. | 0.4–1.2 s |
| `select-note-checker` | `select-note-checker.m4a` or `select-note-checker.mp3` | START on the arcade floor for Note Checker (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-ghost-notes` | `select-ghost-notes.m4a` or `select-ghost-notes.mp3` | START on the arcade floor for Ghost Notes (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-note-storm` | `select-note-storm.m4a` or `select-note-storm.mp3` | START on the arcade floor for Note Storm (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-note-ninja` | `select-note-ninja.m4a` or `select-note-ninja.mp3` | START on the arcade floor for Note Ninja (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-chime-heist` | `select-chime-heist.m4a` or `select-chime-heist.mp3` | START on the arcade floor for Chime Heist (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-ancient-ninja-scrolls` | `select-ancient-ninja-scrolls.m4a` or `select-ancient-ninja-scrolls.mp3` | START on the arcade floor for Ancient Ninja Scrolls (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-button-masher` | `select-button-masher.m4a` or `select-button-masher.mp3` | START on the arcade floor for Button Masher (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-neon-face-off` | `select-neon-face-off.m4a` or `select-neon-face-off.mp3` | START on the arcade floor for Neon Face-Off (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-showtime-malfunction` | `select-showtime-malfunction.m4a` or `select-showtime-malfunction.mp3` | START on the arcade floor for Showtime Malfunction (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |
| `select-sustain-speedway` | `select-sustain-speedway.m4a` or `select-sustain-speedway.mp3` | START on the arcade floor for Sustain Speedway (plays before the page changes; the page changes when it ends, 1.5 s at most). falls back to `select-default` | 0.4–1.2 s |

### Choose Your Instrument (Select Player)

The **`choose-instrument`** voice line plays about half a second after the screen opens (later if the START sound
is still playing), at most once a minute, only when the audio is already unlocked by a tap, and never if the student
taps an instrument first. While it plays, the music dips to about 40% and comes back up over half a second. Trim the
file so the voice starts at the very beginning.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `select-music` | `select-music.m4a` or `select-music.mp3` | Character select music on Choose Your Instrument (the MUSIC slider). It replaces the room ambience there. Loops without a gap; without a file, a built-in original chiptune loop plays. **loops** | 30–90 s loop |
| `select-music-<game id>` | e.g. `select-music-sustain-speedway.m4a` or `.mp3` | Optional: Choose Your Instrument music for ONE game (when a student picks their instrument for that game), instead of `select-music`. Any game works: use its folder name. Without the file, `select-music` plays. **loops** | 30–90 s loop |
| `choose-instrument` | `choose-instrument.m4a` or `choose-instrument.mp3` | Announcer says "Choose your instrument" when the Choose Your Instrument screen opens. | 0.8–2 s |
| `tile-move` | `tile-move.m4a` or `tile-move.mp3` | The highlight moves to another instrument. | 0.05–0.15 s |
| `player-select` | `player-select.m4a` or `player-select.mp3` | An instrument tile is confirmed (SELECT, or tapping the highlighted tile). | 0.2–0.5 s |
| `player-continue` | `player-continue.m4a` or `player-continue.mp3` | The CONTINUE AS button (or Same opponent) is pressed. | 0.2–0.5 s |
| `player-ready` | `player-ready.m4a` or `player-ready.mp3` | The "PLAYER 1 READY" flash. | 0.6–1.2 s |
| `player2-join` | `player2-join.m4a` or `player2-join.mp3` | Neon Face-Off: "PLAYER 2 — PRESS START" appears. | 0.4–1 s |
| `skin-equip` | `skin-equip.m4a` or `skin-equip.mp3` | A skin or accessory is put on (the SKINS locker, or Equip now). | 0.2–0.4 s |
| `skin-unlocked` | `skin-unlocked.m4a` or `skin-unlocked.mp3` | An UNLOCKED! card appears (a results screen, or Choose Your Instrument catch-up). | 0.4–0.5 s |

### Everywhere

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `press-start` | `press-start.m4a` or `press-start.mp3` | A game's PRESS START title screen is tapped (any tap or key): the first sound on every game page. A game can have its own: upload `press-start-<game id>.m4a` (e.g. `press-start-note-storm.m4a`); without it, `press-start` plays. | 0.3–0.8 s |
| `ui-back` | `ui-back.m4a` or `ui-back.mp3` | "← ARCADE": back to the arcade floor. | 0.1–0.3 s |
| `ui-toggle` | `ui-toggle.m4a` or `ui-toggle.mp3` | SOUND ON, the horn's Starting notes, NOTES × ORDER and other toggles. | 0.05–0.15 s |
| `avatar-change` | `avatar-change.m4a` or `avatar-change.mp3` | Create Your Player: picking any option (a hair style, a color, a word of your name…). Without it: the toggle blip. | 0.05–0.15 s |
| `avatar-randomize` | `avatar-randomize.m4a` or `avatar-randomize.mp3` | Create Your Player: SURPRISE ME (everything, one tab, or a random name). Without it: a quick built-in arpeggio. | 0.2–0.5 s |
| `avatar-open` | `avatar-open.m4a` or `avatar-open.mp3` | The avatar editor (Create Your Player) opens over any screen, from the avatar badge in the top bar or EDIT PLAYER. The music dips a little while it's open. | 0.2–0.6 s |
| `avatar-save` | `avatar-save.m4a` or `avatar-save.mp3` | Create Your Player: DONE (the new look is saved). CANCEL plays `ui-back`. | 0.3–0.6 s |
| `item-unlocked` | `item-unlocked.m4a` or `item-unlocked.mp3` | An UNLOCKED! card with a new item for your player (a hat, a pet, a jacket…): a results screen or Select Player. falls back to `skin-unlocked` | 0.5–1 s |
| `event-spooky-jingle` | `event-spooky-jingle.m4a` or `event-spooky-jingle.mp3` | Spooky Season (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `event-winter-jingle` | `event-winter-jingle.m4a` or `event-winter-jingle.mp3` | Winter Fest (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `event-friendship-jingle` | `event-friendship-jingle.m4a` or `event-friendship-jingle.mp3` | Friendship Week (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `event-miosm-jingle` | `event-miosm-jingle.m4a` or `event-miosm-jingle.mp3` | Music In Our Schools Month (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `event-spring-jingle` | `event-spring-jingle.m4a` or `event-spring-jingle.mp3` | Spring Bloom (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `event-summer-jingle` | `event-summer-jingle.m4a` or `event-summer-jingle.mp3` | Summer Send-Off (seasonal event): the lobby banner opens the event panel, or its free gift is claimed. Built-in jingle until uploaded | 0.5–1.5 s |
| `item-purchase` | `item-purchase.m4a` or `item-purchase.mp3` | Arcade Quest: buying a player item or a charm at the Token Booth. falls back to `quest-tokens` | 0.3–0.8 s |
| `charm-equip` | `charm-equip.m4a` or `charm-equip.mp3` | Arcade Quest: putting on or taking off a charm (Menu: CHARMS), or a ghost giving you one. falls back to `skin-equip` | 0.2–0.5 s |

### Every game (shared events)

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `select-level` | `select-level.m4a` or `select-level.mp3` | Announcer says "Select your level" when a game's level select appears (after PRESS START, or back from a level). At most once a minute, the music dips while it speaks. | 0.8–2 s |
| `start-ready` | `start-ready.m4a` or `start-ready.mp3` | A level is selected on a game's level select: the big START button appears. | 0.2–0.5 s |
| `level-start` | `level-start.m4a` or `level-start.mp3` | A level begins. | 0.3–0.8 s |
| `note-hit` | `note-hit.m4a` or `note-hit.mp3` | A correct note. **during play: under 0.5 s** | under 0.5 s (0.1–0.3 s) |
| `note-wrong` | `note-wrong.m4a` or `note-wrong.mp3` | A wrong note. **during play: under 0.5 s** | under 0.5 s (0.1–0.3 s) |
| `note-missed` | `note-missed.m4a` or `note-missed.mp3` | Time ran out on a note. **during play: under 0.5 s** | under 0.5 s (0.2–0.4 s) |
| `level-complete` | `level-complete.m4a` or `level-complete.mp3` | The results screen, level cleared. | 0.5–1.5 s |
| `level-failed` | `level-failed.m4a` or `level-failed.mp3` | The results screen, level not cleared. | 0.5–1.5 s |
| `star-earned` | `star-earned.m4a` or `star-earned.mp3` | Results: more stars than before (after level-complete). | 0.2–0.5 s |
| `new-high-score` | `new-high-score.m4a` or `new-high-score.mp3` | Results: a new best score. | 0.5–1 s |

### Note Storm

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `life-lost` | `life-lost.m4a` or `life-lost.mp3` | Note Storm: a note reaches Tempo and a heart is lost. **during play: under 0.5 s** | under 0.5 s |
| `game-over` | `game-over.m4a` or `game-over.mp3` | Note Storm: the last heart is gone. | 0.8–1.5 s |

### Note Checker

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `all-notes-found` | `all-notes-found.m4a` or `all-notes-found.mp3` | Note Checker: every note on the staff has been found. | 0.8–1.5 s |
| `tuneup-ladder-top` | `tuneup-ladder-top.m4a` or `tuneup-ladder-top.mp3` | Tune Up, Metronome: the Tempo Ladder reached its goal (a small fanfare once the click has stopped, never on a beat; falls back to `level-complete`). | 0.5–1.5 s |

### Note Ninja

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `ninja-slash` | `ninja-slash.m4a` or `ninja-slash.mp3` | Note Ninja: a correct answer. **during play: under 0.5 s** | 0.1–0.3 s |
| `ninja-combo` | `ninja-combo.m4a` or `ninja-combo.mp3` | Note Ninja: every 5 right in a row. **during play: under 0.5 s** | 0.3–0.5 s |
| `belt-earned` | `belt-earned.m4a` or `belt-earned.mp3` | Note Ninja: a new belt unlocked. | 0.8–1.5 s |
| `belt-diamond` | `belt-diamond.m4a` or `belt-diamond.mp3` | Note Ninja: the Diamond belt unlocked. | 1–2 s |

### Endless mode (Note Storm, Note Ninja)

Until you upload these, each plays its fallback (the sound in brackets), so nothing goes silent. Endless never pauses
for a sound: keep the "during play" ones short.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `endless-start` | `endless-start.m4a` or `endless-start.mp3` | Endless mode: a run begins; Note Storm's first note waits for it (falls back to `level-start`). | 0.5–1.5 s |
| `speed-up` | `speed-up.m4a` or `speed-up.mp3` | Endless mode: "SPEED UP!" as the speed passes the next step (a built-in rising blip until then). **during play: under 0.5 s** | 0.2–0.4 s |
| `endless-life-lost` | `endless-life-lost.m4a` or `endless-life-lost.mp3` | Endless mode: a heart is lost (Note Storm: a note reaches Tempo; Note Ninja: a wrong answer or time runs out) (falls back to `life-lost`). **during play: under 0.5 s** | under 0.5 s |
| `endless-game-over` | `endless-game-over.m4a` or `endless-game-over.mp3` | Endless mode: the last heart is gone, the GAME OVER panel (falls back to `game-over`). | 0.8–1.5 s |
| `endless-high-score` | `endless-high-score.m4a` or `endless-high-score.mp3` | Endless mode: GAME OVER with a new #1 on the Top 5, after `endless-game-over` (falls back to `new-high-score`). | 0.5–1.5 s |

### Lost Signal

**No Lost Signal sound may be a pitched tone** (a hum, a beep with a clear note, a chime): the microphone could take it for
a note. Use static, clicks, sweeps and noise. Every one of them is `mic: false` (it never plays while the game listens),
except the two tiny echo clicks. Until you upload a file, a built-in version made of filtered noise plays.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `lost-signal-music` | `lost-signal-music.m4a` or `lost-signal-music.mp3` | Lost Signal: The Lost Signal menu and level screens only, never during a transmission (a loop; until you upload it, the built-in chiptune). | 30–90 s loop |
| `lost-signal-incoming` | `lost-signal-incoming.m4a` or `lost-signal-incoming.mp3` | Lost Signal: INCOMING TRANSMISSION, before the pattern plays. | 0.5–1.2 s |
| `lost-signal-your-turn` | `lost-signal-your-turn.m4a` or `lost-signal-your-turn.mp3` | Lost Signal: YOUR TURN: ECHO THE SIGNAL, just before the microphone listens. | under 0.4 s |
| `lost-signal-correct` | `lost-signal-correct.m4a` or `lost-signal-correct.mp3` | Lost Signal: An echoed note was right. **Plays while the microphone listens: a tiny click, never a tone.** | under 0.05 s |
| `lost-signal-wrong` | `lost-signal-wrong.m4a` or `lost-signal-wrong.mp3` | Lost Signal: An echoed note was wrong (or a wrong try in FIND THE SIGNAL). **Plays while the microphone listens: a short static burst, never a tone.** | under 0.15 s |
| `lost-signal-decoded` | `lost-signal-decoded.m4a` or `lost-signal-decoded.mp3` | Lost Signal: TRANSMISSION DECODED (every note right), and the end of the story. | 0.5–1.2 s |
| `lost-signal-partial` | `lost-signal-partial.m4a` or `lost-signal-partial.mp3` | Lost Signal: A transmission with some notes wrong or missed; the level results without a star. | 0.4–1 s |
| `lost-signal-found` | `lost-signal-found.m4a` or `lost-signal-found.mp3` | Lost Signal: FIND THE SIGNAL: the hidden first note found. | 0.3–0.8 s |
| `lost-signal-level-clear` | `lost-signal-level-clear.m4a` or `lost-signal-level-clear.mp3` | Lost Signal: The level results with at least 1 star. | 0.8–2 s |
| `lost-signal-life-lost` | `lost-signal-life-lost.m4a` or `lost-signal-life-lost.mp3` | Lost Signal: Deep Space Scan: a round missed, a heart lost. | 0.3–0.8 s |
| `lost-signal-game-over` | `lost-signal-game-over.m4a` or `lost-signal-game-over.mp3` | Lost Signal: Deep Space Scan: GAME OVER. | 0.8–1.5 s |
| `lost-signal-high-score` | `lost-signal-high-score.m4a` or `lost-signal-high-score.mp3` | Lost Signal: Deep Space Scan: GAME OVER with a new #1 (after lost-signal-game-over). | 0.5–1.5 s |

### Vanishing Ink

**No Vanishing Ink sound may be a pitched tone** (a hum, a beep with a clear note, a chime): the microphone listens while
most of them play (from the moment the ink appears), and could take a tone for a note. Use brush swishes, paper, wood
clicks, puffs and noise. The ones marked **during play** play while the microphone listens: keep them short (the
detector ignores them, and the answer clock waits). The rest are `mic: false`. Until you upload a file, a built-in
version made of filtered noise plays (the music: nothing, until you upload it).

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `vanishing-ink-music` | `vanishing-ink-music.m4a` or `vanishing-ink-music.mp3` | Vanishing Ink: the level screens only, never while a scroll is on (a loop). Nothing plays until you upload it: no built-in tune, since nothing pitched is generated for this game. | 30–90 s loop |
| `ink-brush` | `ink-brush.m4a` or `ink-brush.mp3` | Vanishing Ink: each note brushes onto the scroll (one per note, 0.1 s apart). **during play: a soft brush swish, never a tone.** | under 0.1 s |
| `ink-fade` | `ink-fade.m4a` or `ink-fade.mp3` | Vanishing Ink: the ink starts to fade (FADE levels). **during play: a soft breathy hush, never a tone.** | under 0.5 s |
| `ink-vanish` | `ink-vanish.m4a` or `ink-vanish.mp3` | Vanishing Ink: the ink vanishes all at once in a puff (VANISH levels). **during play: a "poof", never a tone.** | under 0.4 s |
| `ink-your-turn` | `ink-your-turn.m4a` or `ink-your-turn.mp3` | Vanishing Ink: PLAY IT FROM MEMORY (the ink is gone). **during play: two wood-block taps, never a tone.** | under 0.3 s |
| `ink-note-correct` | `ink-note-correct.m4a` or `ink-note-correct.mp3` | Vanishing Ink: a note played back was right. **Plays while the microphone listens: a tiny click, never a tone.** | under 0.1 s |
| `ink-note-wrong` | `ink-note-wrong.m4a` or `ink-note-wrong.mp3` | Vanishing Ink: a note played back was wrong. **Plays while the microphone listens: a short dull thud, never a tone.** | under 0.15 s |
| `ink-reveal-scroll` | `ink-reveal-scroll.m4a` or `ink-reveal-scroll.mp3` | Vanishing Ink: REVEAL SCROLL (the ink shows again for a moment). **during play: a paper rustle, never a tone.** | under 0.4 s |
| `ink-round-complete` | `ink-round-complete.m4a` or `ink-round-complete.mp3` | Vanishing Ink: a round's result (the ink comes back on the scroll, marked). | 0.3–0.8 s |
| `ink-level-clear` | `ink-level-clear.m4a` or `ink-level-clear.mp3` | Vanishing Ink: the level results with at least 1 star, and the Ink Master's last words. | 0.8–2 s |
| `ink-life-lost` | `ink-life-lost.m4a` or `ink-life-lost.mp3` | Vanishing Ink: Endless Scroll, a round with a wrong or missed note: a life lost. | 0.3–0.8 s |
| `ink-game-over` | `ink-game-over.m4a` or `ink-game-over.mp3` | Vanishing Ink: Endless Scroll, GAME OVER. | 0.8–1.5 s |
| `ink-high-score` | `ink-high-score.m4a` or `ink-high-score.mp3` | Vanishing Ink: Endless Scroll, GAME OVER with a new #1 (after ink-game-over). | 0.5–1.5 s |

### Dojo Duel

Dojo Duel never uses the microphone, so pitched sounds (a gong, chimes, a melody) are fine here. Every entry is
`mic: false`. Until you upload a file, a built-in beep version plays (the two music loops: the built-in chiptune).
The four `sensei-*` lines are the Sensei's voice (the announcer); the Sensei's words always show on screen too.
**`sensei-fast` and `sensei-point` are different moments:** `sensei-fast` praises any player's very fast answer
(under 1.5 s, `fastMs` in `DUEL_PACING` at the top of `dojo-duel/levels.js`); `sensei-point` is the computer Sensei
itself scoring, so it only happens in SOLO VS. SENSEI. A recording that says "Swift and sharp!" belongs in
`sensei-fast`; `sensei-point` wants something like "A point for the Sensei!".

**THE VOICE COUNTDOWN: one file per word.** `dojo-count-3`, `dojo-count-2`, `dojo-count-1` (the spoken numbers) and
`dojo-count-go` ("Go!"), each played the moment its number (or the note) appears. CLASSIC countdowns speak the
numbers; QUICK ones tick (`dojo-count`: a spoken number would not fit in 0.35 s); every countdown ends on
`dojo-count-go`. **Trim each countdown voice file so the word starts at the very beginning of the file (no silence
before it), and keep each number under about 0.8 s** (they are 1 s apart; "Go!" can be up to 1 s). `dojo-count`
itself must be a short tick, never a whole "3, 2, 1, go" in one file: the full take uploaded as `dojo-count.mp3`
was moved to `recordings/dojo-countdown-full-take.mp3` (not played by the game) so you can cut it into the four
files. Until a voice file is uploaded, a number plays the tick and "Go!" plays `dojo-reveal`. Nothing ever cuts a
countdown sound off: each plays to its end.

**Match start:** the gong (`dojo-begin`) and the Sensei’s opening line (`sensei-begin`) play together; the 3-2-1 starts
0.4 s after the longer one ends (at most 3 s in all). **Trim the silence at the end of every file:** the game times
what comes next by where the sound ends, and the Sound Board now says when a file has more than half a second of
silence at the end (today, for example, `dojo-point` is a 10 s file: about 5 s of sound, the rest silence).

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `dojo-music` | `dojo-music.m4a` or `dojo-music.mp3` | Dojo Duel: the setup screen, before a match (a loop). Until you upload it: the built-in chiptune. | 30–90 s loop |
| `dojo-match-music` | `dojo-match-music.m4a` or `dojo-match-music.mp3` | Dojo Duel: during a match, quieter under the taps (a loop). Until you upload it: the built-in chiptune. | 30–90 s loop |
| `dojo-begin` | `dojo-begin.m4a` or `dojo-begin.mp3` | Dojo Duel: gong at the start of each match, before the countdown (with sensei-begin; REMATCH too). The 3-2-1 starts 0.4 s after both have finished. | 1–2 s |
| `dojo-count` | `dojo-count.m4a` or `dojo-count.mp3` | Dojo Duel: a short TICK on each number (3, 2, 1) of a QUICK countdown (0.35 s apart: a spoken number would not fit). Also what a spoken number (dojo-count-3/-2/-1) plays until its own file is uploaded. A tick, not a voice: never a whole "3, 2, 1, go" in one file. | under 0.2 s |
| `dojo-count-3` | `dojo-count-3.m4a` or `dojo-count-3.mp3` | Dojo Duel: the spoken "3!" as the 3 appears in a CLASSIC countdown (the first note of a match, the note after a MATCH POINT, or COUNTDOWN: CLASSIC). Not in QUICK or OFF. Missing: the dojo-count tick. **voice: never over itself or another voice** | under 0.8 s |
| `dojo-count-2` | `dojo-count-2.m4a` or `dojo-count-2.mp3` | Dojo Duel: the spoken "2!" as the 2 appears, 1 second after the 3 (CLASSIC countdown only). Missing: the dojo-count tick. **voice: never over itself or another voice** | under 0.8 s |
| `dojo-count-1` | `dojo-count-1.m4a` or `dojo-count-1.mp3` | Dojo Duel: the spoken "1!" as the 1 appears, 1 second after the 2 (CLASSIC countdown only). Missing: the dojo-count tick. **voice: never over itself or another voice** | under 0.8 s |
| `dojo-count-go` | `dojo-count-go.m4a` or `dojo-count-go.mp3` | Dojo Duel: the spoken "Go!" the moment the note appears on both sides, after EVERY countdown (QUICK, CLASSIC and OFF; the first note of a match too). Plays INSTEAD of dojo-reveal (never both). Missing: dojo-reveal. **voice: never over itself or another voice** | under 1 s |
| `dojo-reveal` | `dojo-reveal.m4a` or `dojo-reveal.mp3` | Dojo Duel: the note appears on both sides, ONLY while there is no dojo-count-go file (the spoken "Go!" replaces it). A quick swish or chime. | under 0.3 s |
| `dojo-wrong` | `dojo-wrong.m4a` or `dojo-wrong.mp3` | Dojo Duel: a wrong tap by any player (or the Sensei): that player is dizzy for 1 second. | under 0.5 s |
| `dojo-strike` | `dojo-strike.m4a` or `dojo-strike.mp3` | Dojo Duel: any point won (players or the Sensei): the winner's ninja does a quick strike (a playful bump). First sound of the result moment, before dojo-point. | under 0.3 s |
| `dojo-point` | `dojo-point.m4a` or `dojo-point.mp3` | Dojo Duel: any point won (players or the Sensei), right after dojo-strike. | under 0.5 s |
| `dojo-match-point` | `dojo-match-point.m4a` or `dojo-match-point.mp3` | Dojo Duel: MATCH POINT: a point that leaves someone one point from winning (after dojo-point). | 0.5–1 s |
| `dojo-no-point` | `dojo-no-point.m4a` or `dojo-no-point.mp3` | Dojo Duel: nobody scores (both wrong, or no right answer in 6 s: "Too slow, ninjas!"). | under 0.5 s |
| `dojo-victory` | `dojo-victory.m4a` or `dojo-victory.mp3` | Dojo Duel: the match is won (the victory screen), in every mode. Followed by sensei-victory. | 1–2.5 s |
| `sensei-begin` | `sensei-begin.m4a` or `sensei-begin.mp3` | Dojo Duel (the Sensei's voice): Sensei's opening line with the gong, at the start of each match (REMATCH too), before the countdown. The 3-2-1 waits until it has finished (+0.4 s; at most 3 s in all). **voice: never over itself or another voice** | 1–2 s |
| `sensei-fast` | `sensei-fast.m4a` or `sensei-fast.mp3` | Dojo Duel (the announcer's voice): after any very fast correct answer by a PLAYER (a point won in under 1.5 s: fastMs in DUEL_PACING), in 2-player and Solo ("Swift and sharp!"). Never for the Sensei's own points, and not on the point that wins the match (sensei-victory speaks then). **voice: never over itself or another voice** | under 1 s |
| `sensei-point` | `sensei-point.m4a` or `sensei-point.mp3` | Dojo Duel (the Sensei's voice): SOLO VS. SENSEI only, when the computer Sensei wins a point (fast or not). Never in a 2-player game. Not on the point that wins the match. **voice: never over itself or another voice** | under 1 s |
| `sensei-victory` | `sensei-victory.m4a` or `sensei-victory.mp3` | Dojo Duel (the Sensei's voice): the end of every match, right after dojo-victory ("A worthy duel! Bow, ninjas."). **voice: never over itself or another voice** | 1–2 s |

### Chime Heist

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `tumbler-click` | `tumbler-click.m4a` or `tumbler-click.mp3` | Chime Heist: a correct bar (quiet, under the bell). **during play: under 0.5 s** | under 0.1 s |
| `alarm-buzz` | `alarm-buzz.m4a` or `alarm-buzz.mp3` | Chime Heist: a wrong bar or a timeout. **during play: under 0.5 s** | 0.2–0.4 s |
| `caught` | `caught.m4a` or `caught.mp3` | Chime Heist: the alarm meter is full. | 0.8–1.5 s |
| `vault-open` | `vault-open.m4a` or `vault-open.mp3` | Chime Heist: a vault is cracked and the door swings open. | 0.6–1.2 s |
| `vault-unlocked` | `vault-unlocked.m4a` or `vault-unlocked.mp3` | Chime Heist: a new vault becomes available. | 0.3–0.6 s |

### Ancient Ninja Scrolls

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `answer-right` | `answer-right.m4a` or `answer-right.mp3` | Ancient Ninja Scrolls: a right answer. **during play: under 0.5 s** | 0.1–0.3 s |
| `answer-wrong` | `answer-wrong.m4a` or `answer-wrong.mp3` | Ancient Ninja Scrolls: a wrong answer. **during play: under 0.5 s** | 0.1–0.3 s |
| `scroll-unroll` | `scroll-unroll.m4a` or `scroll-unroll.mp3` | Ancient Ninja Scrolls: a term mastered. | 0.3–0.6 s |
| `gong` | `gong.m4a` or `gong.mp3` | Ancient Ninja Scrolls: the Belt Exam is turned in. | 1–2 s |
| `test-ready` | `test-ready.m4a` or `test-ready.mp3` | Ancient Ninja Scrolls: the Sensei presents a TEST READY badge. | 0.8–1.5 s |

### Button Masher

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `key-press` | `key-press.m4a` or `key-press.mp3` | Button Masher: each key, valve or slide tap. **during play: under 0.5 s** | under 0.1 s |
| `special-move` | `special-move.m4a` or `special-move.mp3` | Button Masher: a correct STRIKE! **during play: under 0.5 s** | 0.2–0.5 s |
| `combo-streak` | `combo-streak.m4a` or `combo-streak.mp3` | Button Masher: every 5 correct in a row. **during play: under 0.5 s** | 0.3–0.5 s |
| `rival-counter` | `rival-counter.m4a` or `rival-counter.mp3` | Button Masher: a wrong combo or a timeout (a cartoon "boing"). **during play: under 0.5 s** | 0.2–0.5 s |
| `ko` | `ko.m4a` or `ko.mp3` | Button Masher: the rival is defeated. | 0.8–1.5 s |
| `fight-start` | `fight-start.m4a` or `fight-start.mp3` | Button Masher: "ROUND 1… FIGHT!" | 0.6–1.2 s |

### Neon Face-Off

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `puck-hit-soft` | `puck-hit-soft.m4a` or `puck-hit-soft.mp3` | Neon Face-Off: a WEAK shot. **during play: trim to under 0.3 s** | under 0.3 s (0.1–0.2 s) |
| `puck-hit-hard` | `puck-hit-hard.m4a` or `puck-hit-hard.mp3` | Neon Face-Off: a GOOD or POWER shot. **during play: trim to under 0.3 s** | under 0.3 s (0.1–0.25 s) |
| `puck-smash` | `puck-smash.m4a` or `puck-smash.mp3` | Neon Face-Off: a SMASH! shot. **during play: trim to under 0.3 s** | under 0.3 s (0.15–0.3 s) |
| `rail-bounce` | `rail-bounce.m4a` or `rail-bounce.mp3` | Neon Face-Off: the puck bounces off a rail (only while the microphone is already muted, or on the CPU's turn). **during play: under 0.5 s** | under 0.1 s |
| `goal` | `goal.m4a` or `goal.mp3` | Neon Face-Off: a goal. | 0.5–1.5 s |
| `match-win` | `match-win.m4a` or `match-win.mp3` | Neon Face-Off: the match is won. | 0.8–1.5 s |
| `your-turn` | `your-turn.m4a` or `your-turn.mp3` | Neon Face-Off: the turn changes (the receiver's note appears). In a rally it mutes the microphone for at most 0.3 s. **during play: under 0.5 s** | under 0.2 s |
| `faceoff-count-3` | `faceoff-count-3.m4a` or `faceoff-count-3.mp3` | Neon Face-Off: the spoken "3!" of a CLASSIC countdown (before the first serve of a match, and before the serve after a point that leaves someone at MATCH POINT). Missing: `dojo-count-3`, then the `dojo-count` tick. **voice** | under 0.8 s |
| `faceoff-count-2` | `faceoff-count-2.m4a` or `faceoff-count-2.mp3` | Neon Face-Off: the spoken "2!", 1 second after the 3. Missing: `dojo-count-2`, then the tick. **voice** | under 0.8 s |
| `faceoff-count-1` | `faceoff-count-1.m4a` or `faceoff-count-1.mp3` | Neon Face-Off: the spoken "1!", 1 second after the 2. Missing: `dojo-count-1`, then the tick. **voice** | under 0.8 s |
| `faceoff-ready` | `faceoff-ready.m4a` or `faceoff-ready.mp3` | Neon Face-Off: the spoken "Ready…" of a READY-GO countdown (before the serve after every point). Missing: the `dojo-count` tick. **voice** | under 0.45 s |
| `faceoff-count-go` | `faceoff-count-go.m4a` or `faceoff-count-go.mp3` | Neon Face-Off: the spoken "Go!" on the LAST beat of every countdown; the serve note appears (and the microphone listens) as it ends. Missing: `dojo-count-go`, then `dojo-reveal`. **voice** | under 0.45 s |

**Neon Face-Off timing.** The puck sounds (`puck-hit-soft`, `puck-hit-hard`, `puck-smash`) and `your-turn` play in the
middle of a rally: the microphone is muted for at most 0.3 s of each (`maxHitSuppressMs` in `neon-face-off/levels.js`),
so **trim them to under 0.3 s** (the Sound Board warns about longer ones). The countdown voices play while the
microphone is paused, so they never mute anything; trim them so each word starts at once.

### Showtime Malfunction

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `showtime-start` | `showtime-start.m4a` or `showtime-start.mp3` | Showtime Malfunction: a showtime begins ("It's showtime!"). Without a file: level-start. | 0.6–1.2 s |
| `attack-tick` | `attack-tick.m4a` or `attack-tick.mp3` | Showtime Malfunction: each counted note (tongued or struck) on the target's voice box. The mic is deaf only ~0.1 s after it, so fast tonguing still counts. **during play: under 0.5 s** | under 0.1 s (a tick) |
| `reboot` | `reboot.m4a` or `reboot.mp3` | Showtime Malfunction: an animatronic reboots (eyes turn blue), or Maestro Moose finishes a phase. **during play: under 0.5 s** | under 0.5 s |
| `spotlight-out` | `spotlight-out.m4a` or `spotlight-out.mp3` | Showtime Malfunction: an animatronic reaches the front and a spotlight goes out. **during play: under 0.5 s** | under 0.5 s |
| `showtime-over` | `showtime-over.m4a` or `showtime-over.mp3` | Showtime Malfunction: all three spotlights are out, SHOWTIME'S OVER. Spooky-fun, never a scream. | 1–2 s |
| `nightmare-unlocked` | `nightmare-unlocked.m4a` or `nightmare-unlocked.mp3` | Showtime Malfunction: the results screen the first time NIGHTMARE unlocks (The 5:00 Show cleared on Normal). Spooky-fun, never a scream. falls back to `skin-unlocked` | 0.8–1.5 s |
| `special-alert` | `special-alert.m4a` or `special-alert.mp3` | Showtime Malfunction: a SPECIAL MACHINE walks on (when it has no sound of its own), and the "NEW MALFUNCTION DETECTED!" card opens (the game is paused). **during play: under 0.5 s** | under 0.5 s |
| `special-intro` | `special-intro.m4a` or `special-intro.mp3` | Showtime Malfunction: right after special-alert, the special machine's card slides in (the game is paused). | 0.4–1 s |
| `special-turbo-tin` | `special-turbo-tin.m4a` or `special-turbo-tin.mp3` | Showtime Malfunction: Turbo Tin walks on (a revving zoom). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-tuba-tank` | `special-tuba-tank.m4a` or `special-tuba-tank.mp3` | Showtime Malfunction: Tuba Tank walks on (heavy clanking armor). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-long-tone-lurker` | `special-long-tone-lurker.m4a` or `special-long-tone-lurker.mp3` | Showtime Malfunction: Long Tone Lurker walks on (a long, low creak). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-duet-dolls` | `special-duet-dolls.m4a` or `special-duet-dolls.mp3` | Showtime Malfunction: the Duet Dolls walk on (wind-up key clicks). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-glitch-jester` | `special-glitch-jester.m4a` or `special-glitch-jester.mp3` | Showtime Malfunction: Glitch Jester walks on (a glitchy warble), and when its note glitches into another. falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-split-sprocket` | `special-split-sprocket.m4a` or `special-split-sprocket.mp3` | Showtime Malfunction: Split Sprocket walks on (ratcheting gears), and when it splits in two. falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-blackout-bot` | `special-blackout-bot.m4a` or `special-blackout-bot.mp3` | Showtime Malfunction: Blackout Bot walks on (a power-down whump). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `special-oil-can-ollie` | `special-oil-can-ollie.m4a` or `special-oil-can-ollie.mp3` | Showtime Malfunction: Oil Can Ollie walks on (two squirts of an oil can). falls back to `special-alert` **during play: under 0.5 s** | under 0.5 s |
| `scare-sting-1` | `scare-sting-1.m4a` or `scare-sting-1.mp3` | Showtime Malfunction, JUMP SCARE mode: a jump scare (1 of 3, at random). Cartoon-creepy, never a scream. **Loudness cap:** the game turns it down so its peak is never more than 3 dB over the arcade's normal loudest effect. Never plays with "Visual scares only". | 0.5–1 s |
| `scare-sting-2` | `scare-sting-2.m4a` or `scare-sting-2.mp3` | Showtime Malfunction, JUMP SCARE mode: a jump scare (2 of 3, at random). Same rules as scare-sting-1. | 0.5–1 s |
| `scare-sting-3` | `scare-sting-3.m4a` or `scare-sting-3.mp3` | Showtime Malfunction, JUMP SCARE mode: a jump scare (3 of 3, at random). Same rules as scare-sting-1. | 0.5–1 s |

### Sustain Speedway

The microphone listens for the whole race, so there is no engine sound, music or ambience while racing. The countdown
(one file per word, like Dojo Duel's) plays before GO: the race starts when the microphone is live again after "Go!".
`pit-in` plays during the pit stop, which is a rest. `race-countdown` (the old one-file "3, 2, 1, GO!") is **no longer
used**: an uploaded file is simply ignored.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `race-count-3` | `race-count-3.m4a` or `race-count-3.mp3` | Sustain Speedway countdown voice; optional, falls back to the Dojo Duel voice. The spoken "3!" as the 3 appears before a race. Missing: `dojo-count-3`, then the `dojo-count` tick. **voice** | under 0.8 s |
| `race-count-2` | `race-count-2.m4a` or `race-count-2.mp3` | Sustain Speedway countdown voice; optional, falls back to the Dojo Duel voice. The spoken "2!", 1 second after the 3. Missing: `dojo-count-2`, then the `dojo-count` tick. **voice** | under 0.8 s |
| `race-count-1` | `race-count-1.m4a` or `race-count-1.mp3` | Sustain Speedway countdown voice; optional, falls back to the Dojo Duel voice. The spoken "1!", 1 second after the 2. Missing: `dojo-count-1`, then the `dojo-count` tick. **voice** | under 0.8 s |
| `race-count-go` | `race-count-go.m4a` or `race-count-go.mp3` | Sustain Speedway countdown voice; optional, falls back to the Dojo Duel voice. The spoken "Go!" 1 second after the 1; the race starts when the microphone is live again after it, so keep it short and trimmed. Missing: `dojo-count-go`, then `dojo-reveal`. **voice** | under 0.6 s |
| `pit-in` | `pit-in.m4a` or `pit-in.mp3` | Sustain Speedway: the car pulls into the pit stop (a rest between laps). **during play: under 0.5 s** | under 0.5 s |
| `race-finish` | `race-finish.m4a` or `race-finish.mp3` | Sustain Speedway: crossing the finish line. | 0.8–1.5 s |
| `podium` | `podium.m4a` or `podium.mp3` | Sustain Speedway: the results screen, finishing 1st, 2nd or 3rd. | 1–2 s |
| `new-best-lap` | `new-best-lap.m4a` or `new-best-lap.mp3` | Sustain Speedway: the results screen, a new best lap on this track (after the podium). | 0.5–1 s |

### Keys to the City

Keys to the City has two ways to play. In TOUCH mode no microphone is used, and every tapped key plays a piano note
(generated by the arcade, never a file). In INSTRUMENT mode the microphone listens, so **every effect below must be
unpitched** (clicks, taps, shimmers, noise): the microphone must never hear a note from the game. The Mayor's voice
slots are optional: until you record them, the Mayor only speaks in text.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `keys-to-the-city-menu` | `keys-to-the-city-menu.m4a` or `keys-to-the-city-menu.mp3` | Keys to the City: menu music (city map, a district's intro, results). | 30–90 s loop |
| `kttc-window-on` | `kttc-window-on.m4a` or `kttc-window-on.mp3` | A key lights up (its windows switch on) or a new note appears. **during play: under 0.5 s, unpitched** | under 0.15 s |
| `kttc-correct` | `kttc-correct.m4a` or `kttc-correct.mp3` | A right answer. **during play: under 0.5 s, unpitched** | under 0.2 s |
| `kttc-wrong` | `kttc-wrong.m4a` or `kttc-wrong.mp3` | A wrong answer or time up. **during play: under 0.5 s, unpitched** | under 0.2 s |
| `kttc-block-lights` | `kttc-block-lights.m4a` or `kttc-block-lights.mp3` | Every 5 right in a row: a whole block of the city lights up. **during play: under 0.5 s, unpitched** | under 0.4 s |
| `kttc-golden-key` | `kttc-golden-key.m4a` or `kttc-golden-key.mp3` | A district cleared: the Mayor hands over a golden key (results). | 0.6–1.5 s |
| `kttc-keys-to-city` | `kttc-keys-to-city.m4a` or `kttc-keys-to-city.mp3` | The Mayor's Challenge cleared: the KEYS TO THE CITY celebration. | 2–4 s |
| `kttc-mayor-hello` | `kttc-mayor-hello.m4a` or `kttc-mayor-hello.mp3` | Optional voice: the Mayor welcomes you to a district. Silent until recorded. | 1–3 s |
| `kttc-mayor-chopsticks` | `kttc-mayor-chopsticks.m4a` or `kttc-mayor-chopsticks.mp3` | Optional voice: "C is right next to the Chopsticks!" Plays when a student taps the Chopsticks sign, and as a hint after a wrong answer. Silent until recorded (the Mayor's bubble shows the words). | 1–2.5 s |
| `kttc-mayor-fork` | `kttc-mayor-fork.m4a` or `kttc-mayor-fork.mp3` | Optional voice: "F is right next to the Fork!" Plays when a student taps the Fork sign, and as a hint after a wrong answer. Silent until recorded (the Mayor's bubble shows the words). | 1–2.5 s |

### Music Highway

Music Highway is the one game whose backing plays WHILE the microphone listens, and it does NOT mute the microphone
(a song can't stop for its own drums). That's safe because the drums are unpitched (a note only counts with the right
PITCH, and a snare player's hits must be louder than the drums the mic hears back). So a backing-drums file must be
**drums and unpitched percussion only: no bass, no chords, no melody, no toms tuned to notes.** No sound effects play
during a song; the menu music and the results sounds play only before and after.

**Recording backing drums (optional):** one file per song, `mh-drums-<song id>.m4a`. Start **exactly on beat 1 of the
song** (the game plays its own one-measure count-in first, then starts your file on the downbeat), at the song's tempo,
and make it last the whole song. Slow mode and PRACTICE THIS PART always use the generated groove. The song ids and
tempos are in `music-highway/songs.js`; the Song Board (`music-highway/songs.html`) plays every song with the generated
groove so you can hear what to match.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `music-highway-menu` | `music-highway-menu.m4a` or `music-highway-menu.mp3` | Music Highway: menu music (song select, the timing check, results). Never during a song. | 30–90 s loop |
| `mh-click` | `mh-click.m4a` or `mh-click.mp3` | Music Highway: THE CLICK of every song's count-in and of the timing check. A woodblock / stick-click: sharp, bright (most of it between 1.5 and 4 kHz so small speakers carry it), NOT a pitched tone. Trim it to start at once. The downbeat plays it a little higher and louder; its level is `clickVol` in music-highway/settings.js (the timing check ignores the EFFECTS slider). Until you upload it: a generated woodblock click. | under 0.06 s |
| `mh-drums-hot-cross-buns` | `mh-drums-hot-cross-buns.m4a` or `mh-drums-hot-cross-buns.mp3` | Music Highway: the backing drums for Hot Cross Buns (88 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-mary-lamb` | `mh-drums-mary-lamb.m4a` or `mh-drums-mary-lamb.mp3` | Music Highway: the backing drums for Mary Had a Little Lamb (96 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-aunt-rhody` | `mh-drums-aunt-rhody.m4a` or `mh-drums-aunt-rhody.mp3` | Music Highway: the backing drums for Go Tell Aunt Rhody (96 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-lightly-row` | `mh-drums-lightly-row.m4a` or `mh-drums-lightly-row.mp3` | Music Highway: the backing drums for Lightly Row (100 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-ode-to-joy` | `mh-drums-ode-to-joy.m4a` or `mh-drums-ode-to-joy.mp3` | Music Highway: the backing drums for Ode to Joy (100 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-jingle-bells` | `mh-drums-jingle-bells.m4a` or `mh-drums-jingle-bells.mp3` | Music Highway: the backing drums for Jingle Bells (108 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-saints` | `mh-drums-saints.m4a` or `mh-drums-saints.mp3` | Music Highway: the backing drums for When the Saints Go Marching In (104 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-twinkle` | `mh-drums-twinkle.m4a` or `mh-drums-twinkle.mp3` | Music Highway: the backing drums for Twinkle, Twinkle, Little Star (100 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-frere-jacques` | `mh-drums-frere-jacques.m4a` or `mh-drums-frere-jacques.mp3` | Music Highway: the backing drums for Frère Jacques (100 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-yankee-doodle` | `mh-drums-yankee-doodle.m4a` or `mh-drums-yankee-doodle.mp3` | Music Highway: the backing drums for Yankee Doodle (108 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-oh-susanna` | `mh-drums-oh-susanna.m4a` or `mh-drums-oh-susanna.mp3` | Music Highway: the backing drums for Oh! Susanna (104 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-camptown-races` | `mh-drums-camptown-races.m4a` or `mh-drums-camptown-races.mp3` | Music Highway: the backing drums for Camptown Races (112 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-aura-lee` | `mh-drums-aura-lee.m4a` or `mh-drums-aura-lee.mp3` | Music Highway: the backing drums for Aura Lee (84 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-shenandoah` | `mh-drums-shenandoah.m4a` or `mh-drums-shenandoah.mp3` | Music Highway: the backing drums for Shenandoah (76 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-scarborough-fair` | `mh-drums-scarborough-fair.m4a` or `mh-drums-scarborough-fair.mp3` | Music Highway: the backing drums for Scarborough Fair (104 beats a minute). Optional: without it, the generated groove. | the whole song |
| `mh-drums-the-entertainer` | `mh-drums-the-entertainer.m4a` or `mh-drums-the-entertainer.mp3` | Music Highway: the backing drums for The Entertainer (76 beats a minute). Optional: without it, the generated groove. | the whole song |

### Rhythm Dojo

Rhythm Dojo's CLICK plays WHILE the microphone listens for claps (the count-in, and in headphones mode the whole beat), and
it does NOT mute the microphone: claps heard before the rhythm's first note never count, and a clap right on a click
must be clearly louder than the clicks were during the count-in. So the click and the woodblock must be **short, dry,
unpitched knocks**. Nothing else plays during a performance (the "Ready!" sound ends before the microphone listens;
the feedback sounds play after it stops).

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `rhythm-dojo-menu` | `rhythm-dojo-menu.m4a` or `rhythm-dojo-menu.mp3` | Rhythm Dojo: menu music (the level select, the timing check, results). Never while a rhythm plays. | 30–90 s loop |
| `rd-click` | `rd-click.m4a` or `rd-click.mp3` | THE CLICK: the one-measure count-in before every performance, the beat under HEAR IT, the beat all the way through in TAP mode (and in CLAP mode with headphones), and the timing check. A stick click, NOT a pitched tone; trim it to start at once. The downbeat plays it a little higher and louder. Until you upload it: the same generated click as Music Highway. | under 0.06 s |
| `rd-woodblock` | `rd-woodblock.m4a` or `rd-woodblock.mp3` | HEAR IT: the rhythm on a woodblock over the click (the microphone is not listening), and every tap on the drum pad in TAP mode. A dry, woody knock with no ringing pitch. Until you upload it: a generated woodblock. | under 0.1 s |
| `rd-count-in` | `rd-count-in.m4a` or `rd-count-in.mp3` | "Ready!": when the student taps CLAP IT! / TAP IT! / PLAY IT!, just before the count-in clicks (the microphone waits until it ends). A short taiko-style knock or soft gong swell, unpitched. | under 0.8 s |
| `rd-perfect` | `rd-perfect.m4a` or `rd-perfect.mp3` | After a performance with 95 % or better (the feedback; the microphone has stopped). Falls back to star-earned. | 0.4–1 s |
| `rd-miss` | `rd-miss.m4a` or `rd-miss.mp3` | After a performance under 60 %: a gentle "try again". Kind, never harsh. Falls back to level-failed. | under 0.6 s |
| `rd-level-clear` | `rd-level-clear.m4a` or `rd-level-clear.mp3` | A level cleared (its results screen): the big taiko finish. Falls back to level-complete. | 1–2.5 s |

### Scale Trainer

The microphone listens the whole time a scale is played (an audition, a practice run, the Chromatic Challenge), so
**nothing plays during a scale**: no note sounds, no metronome, no alarm when time runs out (like the real audition
room). The adjudicator's line and the countdown play before the microphone starts listening.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `scale-trainer-menu` | `scale-trainer-menu.m4a` or `scale-trainer-menu.mp3` | Scale Trainer: menu music (the mode and level select, the score sheet). Never while the microphone listens. | 30–90 s loop |
| `scale-trainer-menu-oldfile` | `scale-audition-menu.m4a` or `scale-audition-menu.mp3` | The game's old name: its menu music, played only when `scale-trainer-menu` is missing. Better: upload it again as `scale-trainer-menu`. | 30–90 s loop |
| `sa-adjudicator` | `sa-adjudicator.m4a` or `sa-adjudicator.mp3` | Optional voice: the adjudicator before an audition, "Please play your scales in order, from memory." (the words also show on screen). Silent until recorded. **voice** | 2–4 s |
| `audition-count-3` | `audition-count-3.m4a` or `audition-count-3.mp3` | Scale Trainer countdown voice; optional, falls back to the Dojo Duel voice (`dojo-count-3`, then the `dojo-count` tick). The spoken "3!". **voice** | under 0.8 s |
| `audition-count-2` | `audition-count-2.m4a` or `audition-count-2.mp3` | The spoken "2!" (falls back to `dojo-count-2`). **voice** | under 0.8 s |
| `audition-count-1` | `audition-count-1.m4a` or `audition-count-1.mp3` | The spoken "1!" (falls back to `dojo-count-1`). **voice** | under 0.8 s |
| `audition-count-go` | `audition-count-go.m4a` or `audition-count-go.mp3` | "Begin!": the microphone listens and the timer starts when it has ended, so keep it short and trimmed (falls back to `dojo-count-go`, then `dojo-reveal`). **voice** | under 0.6 s |

### Blocktave

The world's music is two loops, DAY and NIGHT (the MUSIC slider); like every loop they stop while the microphone
listens (a challenge card is open, or a creature is near in INSTRUMENT mode) and come back after. Every effect is
unpitched noise; the "during play" ones are short because a sound played while the microphone listens mutes it for
the sound's length + 250 ms (the world's creatures freeze meanwhile). No pitched sound ever plays while listening
(the Conductor's Podium's ▶ LISTEN uses the built-in piano, only when nothing listens).

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `blocktave-menu` | `blocktave-menu.m4a` or `blocktave-menu.mp3` | Blocktave: menu music (the title screen with the chapters and Survival Nights, the results). | 30–90 s loop |
| `blocktave-day` | `blocktave-day.m4a` or `blocktave-day.mp3` | DAY music in the world. Silent until uploaded; stops while the microphone listens. | 60–180 s loop |
| `blocktave-night` | `blocktave-night.m4a` or `blocktave-night.mp3` | NIGHT music in the world: a little mysterious, never scary. Silent until uploaded; stops while the microphone listens. | 60–180 s loop |
| `bt-break` | `bt-break.m4a` or `bt-break.mp3` | A block breaks. **during play: under 0.5 s, unpitched** | under 0.2 s |
| `bt-mined` | `bt-mined.m4a` or `bt-mined.mp3` | A challenge passed: a music block breaks and drops its loot. **during play: under 0.5 s, unpitched** | under 0.3 s |
| `bt-place` | `bt-place.m4a` or `bt-place.mp3` | A block placed, a door opened or closed. **during play: under 0.5 s, unpitched** | under 0.15 s |
| `bt-pickup` | `bt-pickup.m4a` or `bt-pickup.mp3` | An item picked up (a drop in the world, your bag), a Snack Bag eaten. **during play: under 0.5 s, unpitched** | under 0.2 s |
| `bt-wrong` | `bt-wrong.m4a` or `bt-wrong.mp3` | A challenge card missed (the card shakes; the block stays). **during play: under 0.5 s, unpitched** | under 0.2 s |
| `bt-craft` | `bt-craft.m4a` or `bt-craft.mp3` | A performance passed at the Measure: the item is made. **during play: under 0.5 s, unpitched** | under 0.4 s |
| `bt-calm` | `bt-calm.m4a` or `bt-calm.mp3` | A creature calmed (a Night Clam, a Sour Wisp, a Rusher). **during play: under 0.5 s, unpitched** | under 0.4 s |
| `bt-poof` | `bt-poof.m4a` or `bt-poof.mp3` | A creature calmed: a soft, friendly poof (its item drops where it was). Falls back to bt-calm. **during play: under 0.5 s, unpitched** | under 0.4 s |
| `bt-hurt` | `bt-hurt.m4a` or `bt-hurt.mp3` | You lose a heart. A soft bump, never scary. **during play: under 0.5 s, unpitched** | under 0.2 s |
| `bt-powered` | `bt-powered.m4a` or `bt-powered.mp3` | A Composer row powered at its Conductor's Podium (it lights up, its door opens). Falls back to star-earned. | 0.5–1.5 s |
| `bt-milestone` | `bt-milestone.m4a` or `bt-milestone.mp3` | A milestone done: a star! Falls back to star-earned. | 0.5–1.5 s |
| `bt-night` | `bt-night.m4a` or `bt-night.mp3` | Night falls (a soft, low whoosh; never scary). | 0.5–2 s |
| `bt-dawn` | `bt-dawn.m4a` or `bt-dawn.mp3` | Morning comes: you survived the night! | 0.5–2 s |
| `bt-respawn` | `bt-respawn.m4a` or `bt-respawn.mp3` | Out of breath: you wake up at your cot (your bag waits where you fell). | 0.5–1.5 s |

### Arcade Quest

The microphone listens only while a student plays a challenge (PLAY, a long tone, HARMONIZE…). Menus, text and
dodging are quiet times for it, so these sounds play freely there; the music stops while it listens. The music
(`quest-title`, `quest-foyer`, `quest-manor`, `quest-battle`, `quest-miniboss`) has no built-in version: until you
upload a file, that part of the game is simply quiet.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `quest-battle` | `quest-battle.m4a` or `quest-battle.mp3` | Arcade Quest: battle music (the MUSIC slider), during menus and dodging. It stops while the microphone listens. Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-text` | `quest-text.m4a` or `quest-text.mp3` | Arcade Quest: the text box typing (a tiny blip every few letters). Never while the microphone listens. | under 0.05 s |
| `quest-move` | `quest-move.m4a` or `quest-move.mp3` | Arcade Quest: moving between menu buttons. | under 0.1 s |
| `quest-select` | `quest-select.m4a` or `quest-select.mp3` | Arcade Quest: choosing a menu button. | under 0.2 s |
| `quest-hurt` | `quest-hurt.m4a` or `quest-hurt.mp3` | Arcade Quest: a sour note hits you while dodging. **during play: under 0.5 s** | under 0.3 s |
| `quest-enemy-hurt` | `quest-enemy-hurt.m4a` or `quest-enemy-hurt.mp3` | Arcade Quest: your PLAY lands (after the challenge, never while listening). | under 0.4 s |
| `quest-crit` | `quest-crit.m4a` or `quest-crit.mp3` | Arcade Quest: a CRITICAL hit (PLAY or the B♭ Blast; after the challenge, never while listening). | under 0.5 s |
| `quest-serenade-perfect` | `quest-serenade-perfect.m4a` or `quest-serenade-perfect.mp3` | Arcade Quest: a PERFECT SERENADE (95 % or better): a soft chime. | under 0.6 s |
| `quest-calm` | `quest-calm.m4a` or `quest-calm.mp3` | Arcade Quest: the enemy's CALM meter rises. | under 0.4 s |
| `quest-befriend` | `quest-befriend.m4a` or `quest-befriend.mp3` | Arcade Quest: HARMONIZE works and the enemy joins your band. | 1–2 s |
| `quest-fade` | `quest-fade.m4a` or `quest-fade.mp3` | Arcade Quest: the enemy fades away grumbling (its HP ran out). | 0.5–1 s |
| `quest-levelup` | `quest-levelup.m4a` or `quest-levelup.mp3` | Arcade Quest: LEVEL UP after a battle. | 0.8–1.5 s |
| `quest-item` | `quest-item.m4a` or `quest-item.mp3` | Arcade Quest: using an item. | under 0.5 s |
| `quest-title` | `quest-title.m4a` or `quest-title.mp3` | Arcade Quest: title screen music. Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-foyer` | `quest-foyer.m4a` or `quest-foyer.mp3` | Arcade Quest: Ghost Notes Manor, the Foyer (the safe hub) and the Practice Hall. Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-manor` | `quest-manor.m4a` or `quest-manor.mp3` | Arcade Quest: exploring Ghost Notes Manor (every room but the Foyer). Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-miniboss` | `quest-miniboss.m4a` or `quest-miniboss.mp3` | Arcade Quest: the mini-boss battle (The Phantom Fermata), in menus and dodging; stops while listening. Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-step` | `quest-step.m4a` or `quest-step.mp3` | Arcade Quest: a footstep while exploring (every other step, very quiet). | under 0.08 s |
| `quest-door` | `quest-door.m4a` or `quest-door.mp3` | Arcade Quest: going through a door to another room (or a locked door rattling). | under 0.5 s |
| `quest-save` | `quest-save.m4a` or `quest-save.mp3` | Arcade Quest: saving at the Save Jukebox. | 0.5–1.5 s |
| `quest-encounter` | `quest-encounter.m4a` or `quest-encounter.mp3` | Arcade Quest: you bump into a ghost and a battle starts. | 0.3–0.8 s |
| `quest-tokens` | `quest-tokens.m4a` or `quest-tokens.mp3` | Arcade Quest: stars turned into Arcade Tokens at the Token Booth, or buying at the shop. | under 1 s |
| `quest-intro` | `quest-intro.m4a` or `quest-intro.mp3` | Arcade Quest: the intro cutscene (the arcade after hours, the glitch, the pull into Ghost Notes Manor). Nothing plays until you upload it. | 20–60 s loop |
| `quest-boss` | `quest-boss.m4a` or `quest-boss.mp3` | Arcade Quest: the final boss battle (The Ghost Conductor), in menus and dodging; stops while listening. Nothing plays until you upload it. | 30–90 s loop |
| `quest-victory` | `quest-victory.m4a` or `quest-victory.mp3` | Arcade Quest: the ending: the manor's color comes back and the ghosts celebrate. Nothing plays until you upload it. | 20–60 s loop |
| `quest-cliffhanger` | `quest-cliffhanger.m4a` or `quest-cliffhanger.mp3` | Arcade Quest: the cliffhanger (the giant microphone, TO BE CONTINUED). Low and eerie. Nothing plays until you upload it. | 15–40 s loop |
| `quest-credits` | `quest-credits.m4a` or `quest-credits.mp3` | Arcade Quest: the credits roll after Episode 1. Nothing plays until you upload it. | 30–90 s loop |
| `quest-static` | `quest-static.m4a` or `quest-static.mp3` | Arcade Quest: static crackles (the intro glitch, color draining away). | 0.5–1.5 s |
| `quest-mic-crackle` | `quest-mic-crackle.m4a` or `quest-mic-crackle.mp3` | Arcade Quest: the Mysterious Microphone crackles (whispers in the manor, the cliffhanger). Never while listening. | 0.5–2 s |
| `quest-boss-phase` | `quest-boss-phase.m4a` or `quest-boss-phase.mp3` | Arcade Quest: the Ghost Conductor starts a new phase of the battle (never while listening). | 0.5–1 s |
