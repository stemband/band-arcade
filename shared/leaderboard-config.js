/* Band Arcade: THE LEADERBOARD's address (Mat's Google Apps Script scoreboard; shared/leaderboard.js talks to it).
   This is the ONLY place the arcade ever sends anything off the device, and it sends only: a random device id, the
   grade (6/7/8), the avatar name as three word NUMBERS, and game/type/value/level for stars, Endless scores and one
   "played today" per game a day (and reads: the boards, last week's champions). Never a real name, email, PIN or anything else (see CLAUDE.md).
   Leave it '' (empty) to turn the whole leaderboard off: the button disappears and nothing is ever sent. */
window.Arcade = window.Arcade || {};
window.Arcade.LEADERBOARD_URL = 'https://script.google.com/macros/s/AKfycbxzfRWbIpwQzJ4cKSaPhekw8DJgKZExpl_UPxrRchI4e5Zn3idvOWv-_hpn_ESiheGS/exec';
