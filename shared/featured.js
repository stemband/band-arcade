/* THE ASSIGNED GAME (Mr. Graham edits this file by hand).
   The arcade lobby shows a glowing ASSIGNED card for this game, with your note, and an ASSIGNED badge on its
   cabinet and in ALL GAMES. Today's Practice makes it the PLAY step.
     game   the game's id (its folder name, the same as its id in shared/games.js): 'ghost-notes', 'note-storm',
            'note-ninja', 'keys-to-the-city', 'vanishing-ink', 'chime-heist', 'rhythm-dojo', 'rudiment-trainer',
            'ancient-ninja-scrolls', 'button-masher', 'neon-face-off', 'showtime-malfunction', 'sustain-speedway',
            'music-highway', 'scale-trainer', 'first-sight', 'lost-signal', 'pedal-point', 'slide-quest',
            'perfect-pitch', 'dojo-duel', 'blocktave', 'arcade-quest'. Put null (no quotes) to turn it off.
     note   a short line for students (optional)
     until  optional: the last day it shows, as 'YYYY-MM-DD'. After that day it hides by itself.
     level  optional: the level the ASSIGNED card (and the PLAY step) opens on: 1 = the first level card. A locked
            level opens the highest open one below it, with a line saying which to clear.
     notes  optional, for games with the NOTES picker: 'first5', 'bb', 'eb', 'f', 'ab' or 'chrom'
     order  optional, with notes: 'random' or 'scale'
   Example:  window.Arcade.FEATURED = {game: 'note-storm', note: 'Beat level 4 by Friday!', until: '2026-11-20', level: 4, notes: 'bb'};
   The same choices work as a link (Brightspace, a QR code): note-storm/index.html?level=4&notes=bb
   (open any game with ?demo, pick the level, and tap COPY LINK TO THIS LEVEL to get one). */
window.Arcade = window.Arcade || {};
window.Arcade.FEATURED = {game: 'lost-signal', note: 'Practice this week!', until: '2026-10-09'};
