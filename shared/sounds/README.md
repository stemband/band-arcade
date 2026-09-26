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
   `https://stemband.github.io/band-arcade/sound-board/index.html`). It checks every file when it opens; after an
   upload, press **RELOAD ALL SOUNDS** (no need to reload the page). Your file shows **YOUR FILE (m4a, 0.42 s,
   18 KB)** with its length and size, so you can tell a replaced file from the old one; a label that changed since
   the last check gets a yellow outline, and "Checked at …" shows when the check ran. The Sound Board always asks
   the server for the live files, never the browser's saved copies (GitHub Pages can take a minute to publish an
   upload). Press **Play** to hear it, and use the level meter to match its loudness to the others.
5. **After replacing sounds, bump `SOUNDS_VERSION` by 1** (the number at the very top of `shared/sounds.js`) **so
   every student's device picks up the new files right away.** See *Caching* below.

## Caching: SOUNDS_VERSION

Browsers keep a saved copy of each sound so games start fast (GitHub Pages lets them keep files for about 10
minutes, and a tab also remembers a missing file until it closes). That's why a replaced sound can keep playing
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
- A browser remembers a missing file for the rest of that tab. If you just uploaded one, open a new tab, or bump
  `SOUNDS_VERSION` (the Sound Board always checks again).
- Each sound's loudness can be adjusted without re-recording: change its `vol` (0–1) in `shared/sounds.js`.
- Students set their own SOUND ON/OFF, EFFECTS, MUSIC and AMBIENCE volumes with the speaker button in every top bar.
- Opening a page by double-clicking it (a local file) still plays your files, through the browser's plain audio
  player; the ambience seam and exact lengths are only right on the served site.

## Sounds and the microphone

The games that listen (Ghost Notes, Note Storm, the Note Checker, Neon Face-Off) play sounds too. While a sound
plays, and for 250 ms after it (room echo), the arcade **ignores the microphone**: nothing heard counts as a
right note, a wrong note, or toward holding a note, and the game's timer stops, so a sound never costs a student
time. After that, a note that is still ringing has to be played again to count.

Sounds marked **during play** play in the middle of a game: keep them **under 0.5 s**, so the microphone is
only deaf for a moment. The longer ones (results, fanfares) play when nobody is being timed.

Showtime Malfunction's `attack-tick` plays after every counted note while the student is tonguing quickly, so it
only keeps the microphone deaf for its own length + 60 ms (its `echo` in `shared/sounds.js`). **Keep that recording
under 0.1 s**, or fast tonguing will start missing notes.

The **character select music** (`select-music`) plays only on Select Player, instead of the room ambience; until you
upload one, the arcade plays its own short original chiptune loop. Make it loop cleanly, like the ambience below, and
use the Sound Board's **Loop test** to hear the seam.

The **ambience loop** (`lobby-ambience`) never plays while the microphone is listening. Make it loop cleanly: start
and end at the same loudness. The arcade skips the tiny silence that .m4a and .mp3 encoders add at the ends, so it
loops without a gap; use the Sound Board's **Loop test** to hear the seam.

The Chime Heist bell bars are always generated by the arcade (so every pitch is exactly in tune) and are never
replaced by files.

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

### Select Player

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `select-music` | `select-music.m4a` or `select-music.mp3` | Character select music on Select Player (the MUSIC slider). It replaces the room ambience there. Loops without a gap; without a file, a built-in original chiptune loop plays. **loops** | 30–90 s loop |
| `select-music-<game id>` | e.g. `select-music-sustain-speedway.m4a` or `.mp3` | Optional: Select Player music for ONE game (when a student picks their instrument for that game), instead of `select-music`. Any game works: use its folder name. Without the file, `select-music` plays. **loops** | 30–90 s loop |
| `tile-move` | `tile-move.m4a` or `tile-move.mp3` | The highlight moves to another instrument. | 0.05–0.15 s |
| `player-select` | `player-select.m4a` or `player-select.mp3` | An instrument tile is confirmed (SELECT, or tapping the highlighted tile). | 0.2–0.5 s |
| `player-continue` | `player-continue.m4a` or `player-continue.mp3` | The CONTINUE AS button (or Same opponent) is pressed. | 0.2–0.5 s |
| `player-ready` | `player-ready.m4a` or `player-ready.mp3` | The "PLAYER 1 READY" flash. | 0.6–1.2 s |
| `player2-join` | `player2-join.m4a` or `player2-join.mp3` | Neon Face-Off: "PLAYER 2 — PRESS START" appears. | 0.4–1 s |
| `skin-equip` | `skin-equip.m4a` or `skin-equip.mp3` | A skin or accessory is put on (the SKINS locker, or Equip now). | 0.2–0.4 s |
| `skin-unlocked` | `skin-unlocked.m4a` or `skin-unlocked.mp3` | An UNLOCKED! card appears (a results screen, or Select Player catch-up). | 0.4–0.5 s |

### Everywhere

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `ui-back` | `ui-back.m4a` or `ui-back.mp3` | "← ARCADE": back to the arcade floor. | 0.1–0.3 s |
| `ui-toggle` | `ui-toggle.m4a` or `ui-toggle.mp3` | SOUND ON, the horn's Starting notes, NOTES × ORDER and other toggles. | 0.05–0.15 s |

### Every game (shared events)

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
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

### Note Ninja

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `ninja-slash` | `ninja-slash.m4a` or `ninja-slash.mp3` | Note Ninja: a correct answer. **during play: under 0.5 s** | 0.1–0.3 s |
| `ninja-combo` | `ninja-combo.m4a` or `ninja-combo.mp3` | Note Ninja: every 5 right in a row. **during play: under 0.5 s** | 0.3–0.5 s |
| `belt-earned` | `belt-earned.m4a` or `belt-earned.mp3` | Note Ninja: a new belt unlocked. | 0.8–1.5 s |
| `belt-diamond` | `belt-diamond.m4a` or `belt-diamond.mp3` | Note Ninja: the Diamond belt unlocked. | 1–2 s |

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
| `puck-hit-soft` | `puck-hit-soft.m4a` or `puck-hit-soft.mp3` | Neon Face-Off: a WEAK shot. **during play: under 0.5 s** | under 0.5 s (0.1–0.2 s) |
| `puck-hit-hard` | `puck-hit-hard.m4a` or `puck-hit-hard.mp3` | Neon Face-Off: a GOOD or POWER shot. **during play: under 0.5 s** | under 0.5 s (0.1–0.25 s) |
| `puck-smash` | `puck-smash.m4a` or `puck-smash.mp3` | Neon Face-Off: a SMASH! shot. **during play: under 0.5 s** | under 0.5 s (0.2–0.35 s) |
| `rail-bounce` | `rail-bounce.m4a` or `rail-bounce.mp3` | Neon Face-Off: the puck bounces off a rail (only while the microphone is already muted, or on the CPU's turn). **during play: under 0.5 s** | under 0.1 s |
| `goal` | `goal.m4a` or `goal.mp3` | Neon Face-Off: a goal. | 0.5–1.5 s |
| `match-win` | `match-win.m4a` or `match-win.mp3` | Neon Face-Off: the match is won. | 0.8–1.5 s |
| `your-turn` | `your-turn.m4a` or `your-turn.mp3` | Neon Face-Off: the turn changes. **during play: under 0.5 s** | under 0.2 s |

### Showtime Malfunction

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `showtime-start` | `showtime-start.m4a` or `showtime-start.mp3` | Showtime Malfunction: a showtime begins ("It's showtime!"). Without a file: level-start. | 0.6–1.2 s |
| `attack-tick` | `attack-tick.m4a` or `attack-tick.mp3` | Showtime Malfunction: each counted note (tongued or struck) on the target's voice box. The mic is deaf only ~0.1 s after it, so fast tonguing still counts. **during play: under 0.5 s** | under 0.1 s (a tick) |
| `reboot` | `reboot.m4a` or `reboot.mp3` | Showtime Malfunction: an animatronic reboots (eyes turn blue), or Maestro Moose finishes a phase. **during play: under 0.5 s** | under 0.5 s |
| `spotlight-out` | `spotlight-out.m4a` or `spotlight-out.mp3` | Showtime Malfunction: an animatronic reaches the front and a spotlight goes out. **during play: under 0.5 s** | under 0.5 s |
| `showtime-over` | `showtime-over.m4a` or `showtime-over.mp3` | Showtime Malfunction: all three spotlights are out, SHOWTIME'S OVER. Spooky-fun, never a scream. | 1–2 s |
| `extra-spooky-unlocked` | `extra-spooky-unlocked.m4a` or `extra-spooky-unlocked.mp3` | Showtime Malfunction: the results screen the first time EXTRA SPOOKY unlocks (The 5:00 Show cleared on Normal). Spooky-fun, never a scream. falls back to `skin-unlocked` | 0.8–1.5 s |

### Sustain Speedway

The microphone listens for the whole race, so there is no engine sound, music or ambience while racing. The countdown
plays before GO (the race waits for it to end), and `pit-in` plays during the pit stop, which is a rest.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `race-countdown` | `race-countdown.m4a` or `race-countdown.mp3` | Sustain Speedway: "3, 2, 1, GO!" before the first note. It plays BEFORE listening counts: GO waits until it ends. | 3–3.5 s (GO on the last beat) |
| `pit-in` | `pit-in.m4a` or `pit-in.mp3` | Sustain Speedway: the car pulls into the pit stop (a rest between laps). **during play: under 0.5 s** | under 0.5 s |
| `race-finish` | `race-finish.m4a` or `race-finish.mp3` | Sustain Speedway: crossing the finish line. | 0.8–1.5 s |
| `podium` | `podium.m4a` or `podium.mp3` | Sustain Speedway: the results screen, finishing 1st, 2nd or 3rd. | 1–2 s |
| `new-best-lap` | `new-best-lap.m4a` or `new-best-lap.mp3` | Sustain Speedway: the results screen, a new best lap on this track (after the podium). | 0.5–1 s |

### Arcade Quest

The microphone listens only while a student plays a challenge (PLAY, a long tone, HARMONIZE…). Menus, text and
dodging are quiet times for it, so these sounds play freely there; the battle music stops while it listens.

| Event | File to upload | When it plays | Suggested length |
|---|---|---|---|
| `quest-battle` | `quest-battle.m4a` or `quest-battle.mp3` | Arcade Quest: battle music (the MUSIC slider), during menus and dodging. It stops while the microphone listens. Nothing plays until you upload it. **loops** | 30–90 s loop |
| `quest-text` | `quest-text.m4a` or `quest-text.mp3` | Arcade Quest: the text box typing (a tiny blip every few letters). Never while the microphone listens. | under 0.05 s |
| `quest-move` | `quest-move.m4a` or `quest-move.mp3` | Arcade Quest: moving between menu buttons. | under 0.1 s |
| `quest-select` | `quest-select.m4a` or `quest-select.mp3` | Arcade Quest: choosing a menu button. | under 0.2 s |
| `quest-hurt` | `quest-hurt.m4a` or `quest-hurt.mp3` | Arcade Quest: a sour note hits you while dodging. **during play: under 0.5 s** | under 0.3 s |
| `quest-enemy-hurt` | `quest-enemy-hurt.m4a` or `quest-enemy-hurt.mp3` | Arcade Quest: your PLAY lands (after the challenge, never while listening). | under 0.4 s |
| `quest-calm` | `quest-calm.m4a` or `quest-calm.mp3` | Arcade Quest: the enemy's CALM meter rises. | under 0.4 s |
| `quest-befriend` | `quest-befriend.m4a` or `quest-befriend.mp3` | Arcade Quest: HARMONIZE works and the enemy joins your band. | 1–2 s |
| `quest-fade` | `quest-fade.m4a` or `quest-fade.mp3` | Arcade Quest: the enemy fades away grumbling (its HP ran out). | 0.5–1 s |
| `quest-levelup` | `quest-levelup.m4a` or `quest-levelup.mp3` | Arcade Quest: LEVEL UP after a battle. | 0.8–1.5 s |
| `quest-item` | `quest-item.m4a` or `quest-item.mp3` | Arcade Quest: using an item. | under 0.5 s |
