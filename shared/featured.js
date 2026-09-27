/* THE ASSIGNED GAME (Mr. Graham edits this file by hand).
   The arcade lobby shows a glowing ASSIGNED card for this game, with your note, and an ASSIGNED badge on its
   cabinet and in ALL GAMES.
     game   the game's id (its folder name): 'lost-signal', 'ghost-notes', 'note-storm', 'note-ninja', 'chime-heist',
            'ancient-ninja-scrolls', 'button-masher', 'neon-face-off', 'showtime-malfunction', 'sustain-speedway',
            'dojo-duel', 'arcade-quest'. Put null (no quotes) to turn it off.
     note   a short line for students (optional)
     until  optional: the last day it shows, as 'YYYY-MM-DD'. After that day it hides by itself.
   Example:  window.Arcade.FEATURED = {game: 'note-storm', note: 'Beat level 4 by Friday!', until: '2026-11-20'}; */
window.Arcade = window.Arcade || {};
window.Arcade.FEATURED = {game: 'lost-signal', note: 'Practice this week!', until: '2026-10-09'};
