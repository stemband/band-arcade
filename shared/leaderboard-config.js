/* Band Arcade: THE LEADERBOARD's address (Mat's Google Apps Script scoreboard; shared/leaderboard.js talks to it).
   This is the ONLY address the arcade ever sends anything to, from only two files (see CLAUDE.md):
     shared/leaderboard.js: a random device id, the grade (6/7/8), the avatar name as three word NUMBERS, and
       game/type/value/level for stars, Endless scores and one "played today" per game a day (and reads: the boards,
       last week's champions);
     shared/bug-report.js: anonymous bug reports {type: 'error', game, message, where, browser, version, count}, with
       nothing about the student (teacher-settings.js BUG_REPORTS turns them off).
   Never a real name, email, PIN or anything else. Leave it '' (empty) to turn both off: the leaderboard button
   disappears and nothing is ever sent. (Loaded on every page by shared/version.js, and again by the pages that list it.) */
window.Arcade = window.Arcade || {};
window.Arcade.LEADERBOARD_URL = 'https://script.google.com/macros/s/AKfycbxzfRWbIpwQzJ4cKSaPhekw8DJgKZExpl_UPxrRchI4e5Zn3idvOWv-_hpn_ESiheGS/exec';
