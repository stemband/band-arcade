/* AFTER REPLACING SOUNDS in shared/sounds/, add 1 to this number, so every student's device loads the new files right
   away instead of a copy it saved earlier (every sound URL ends in ?v=<this number>). */
var SOUNDS_VERSION = 1;

/* Band Arcade: THE SOUND LIST. Every sound the arcade plays, by event name. shared/sfx.js plays them.

   To use your own recording for an event, upload it into shared/sounds/ named exactly as `file` below, as
   <file>.m4a or <file>.mp3 (.m4a is tried first). No file (or a broken one) = the arcade's built-in sound for
   that event, so nothing ever goes silent. shared/sounds/README.md lists every file; the Sound Board
   (sound-board/index.html) plays them all and shows which ones are your files.

   Each line:
     file    the file name in shared/sounds/, without .m4a/.mp3
     vol     0–1, this sound's own loudness (the student's effects slider is applied on top)
     loop    true: plays until stopped (the arcade-floor ambience, and the Select Player music)
     mic     true: may play while a game is listening to the microphone. The detector then ignores what it
             hears for the sound's length + 250 ms, and game timers pause meanwhile (see shared/pitch.js).
             false: never plays while the microphone is listening.
     play    true: plays DURING a game ("during play" in the README): keep it under 0.5 s
     screen  where it plays (groups the README and the Sound Board; also which sounds a page preloads)
     when    when it plays, in words
     len     a suggested length for your recording
     echo    (optional) ms the microphone stays deaf after the sound (default 250, for room echo). attack-tick uses a short
             tail so quick tonguing keeps counting; keep that recording under 0.1 s

   A GAME CAN ADD ITS OWN SOUNDS without touching sfx.js: in its own script (before it plays them),
     Arcade.Sounds.add({'bonus-round': {file: 'bonus-round', vol: .8, mic: true, screen: 'my-game', when: '…', len: '0.5 s',
                                        gen: [[523, 0, .08], [784, .08, .16]]}});
   `gen` is its built-in fallback: a list of [frequency Hz, start s, length s, volume 0–1, wave] beeps
   (or the name of another event to borrow, e.g. gen: 'star-earned').
   select-<game id> needs no line: every game in shared/games.js gets one automatically (file select-<id>,
   falling back to select-default). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const LIST = {
    // ---- the arcade floor --------------------------------------------------------------------------------
    'lobby-ambience':  {file: 'lobby-ambience', vol: .3, loop: true, mic: false, screen: 'floor', when: 'Background room sound on the arcade floor (the AMBIENCE slider). Loops without a gap.', len: '20–60 s loop'},
    'wheel-left':      {file: 'wheel-left',  vol: .7, mic: false, screen: 'floor', when: 'The cabinets turn left (◀, swipe, ← key).', len: '0.2–0.4 s'},
    'wheel-right':     {file: 'wheel-right', vol: .7, mic: false, screen: 'floor', when: 'The cabinets turn right (▶, swipe, → key).', len: '0.2–0.4 s'},
    'cabinet-focus':   {file: 'cabinet-focus', vol: .35, mic: false, screen: 'floor', when: 'A new cabinet arrives at the front (quiet, after the turn).', len: '0.1–0.3 s'},
    'select-default':  {file: 'select-default', vol: .8, mic: false, screen: 'floor', when: 'START on the arcade floor, for any game without its own select-<game> sound.', len: '0.4–1.2 s'},
    // select-<game id>: added below for every game in shared/games.js
    // ---- Select Player --------------------------------------------------------------------------------------
    'select-music':    {file: 'select-music', vol: .6, loop: true, mic: false, screen: 'select', when: 'Character select music on Select Player (the MUSIC slider). It replaces the room ambience there. Loops without a gap; without a file, a built-in original chiptune loop plays.', len: '30–90 s loop'},
    'tile-move':       {file: 'tile-move',       vol: .5, mic: false, screen: 'select', when: 'The highlight moves to another instrument.', len: '0.05–0.15 s'},
    'player-select':   {file: 'player-select',   vol: .8, mic: false, screen: 'select', when: 'An instrument tile is confirmed (SELECT, or tapping the highlighted tile).', len: '0.2–0.5 s'},
    'player-continue': {file: 'player-continue', vol: .8, mic: false, screen: 'select', when: 'The CONTINUE AS button (or Same opponent) is pressed.', len: '0.2–0.5 s'},
    'player-ready':    {file: 'player-ready',    vol: .9, mic: false, screen: 'select', when: 'The "PLAYER 1 READY" flash.', len: '0.6–1.2 s'},
    'player2-join':    {file: 'player2-join',    vol: .9, mic: false, screen: 'select', when: 'Neon Face-Off: "PLAYER 2 — PRESS START" appears.', len: '0.4–1 s'},
    'skin-equip':      {file: 'skin-equip',      vol: .4, mic: true, screen: 'select', when: 'A skin or accessory is put on (the SKINS locker, or Equip now).', len: '0.2–0.4 s'},
    'skin-unlocked':   {file: 'skin-unlocked',   vol: .8, mic: true, screen: 'select', when: 'An UNLOCKED! card appears (a results screen, or Select Player catch-up).', len: '0.4–0.5 s'},
    // ---- everywhere -------------------------------------------------------------------------------------------
    'ui-back':         {file: 'ui-back',   vol: .6, mic: true, screen: 'general', when: '"← ARCADE": back to the arcade floor.', len: '0.1–0.3 s'},
    'ui-toggle':       {file: 'ui-toggle', vol: .5, mic: true, screen: 'general', when: 'SOUND ON, the horn\'s Starting notes, NOTES × ORDER and other toggles.', len: '0.05–0.15 s'},
    // ---- every game --------------------------------------------------------------------------------------------
    'level-start':     {file: 'level-start',    vol: .8, mic: true, screen: 'game', when: 'A level begins.', len: '0.3–0.8 s'},
    'note-hit':        {file: 'note-hit',       vol: .7, mic: true, play: true, screen: 'game', when: 'A correct note.', len: 'under 0.5 s (0.1–0.3 s)'},
    'note-wrong':      {file: 'note-wrong',     vol: .7, mic: true, play: true, screen: 'game', when: 'A wrong note.', len: 'under 0.5 s (0.1–0.3 s)'},
    'note-missed':     {file: 'note-missed',    vol: .7, mic: true, play: true, screen: 'game', when: 'Time ran out on a note.', len: 'under 0.5 s (0.2–0.4 s)'},
    'level-complete':  {file: 'level-complete', vol: .9, mic: true, screen: 'game', when: 'The results screen, level cleared.', len: '0.5–1.5 s'},
    'level-failed':    {file: 'level-failed',   vol: .8, mic: true, screen: 'game', when: 'The results screen, level not cleared.', len: '0.5–1.5 s'},
    'star-earned':     {file: 'star-earned',    vol: .8, mic: true, screen: 'game', when: 'Results: more stars than before (after level-complete).', len: '0.2–0.5 s'},
    'new-high-score':  {file: 'new-high-score', vol: .9, mic: true, screen: 'game', when: 'Results: a new best score.', len: '0.5–1 s'},
    // ---- Note Storm / Note Checker -----------------------------------------------------------------------------
    'life-lost':       {file: 'life-lost',  vol: .8, mic: true, play: true, screen: 'note-storm', when: 'Note Storm: a note reaches Tempo and a heart is lost.', len: 'under 0.5 s'},
    'game-over':       {file: 'game-over',  vol: .9, mic: true, screen: 'note-storm', when: 'Note Storm: the last heart is gone.', len: '0.8–1.5 s'},
    'all-notes-found': {file: 'all-notes-found', vol: .9, mic: true, screen: 'note-checker', when: 'Note Checker: every note on the staff has been found.', len: '0.8–1.5 s'},
    // ---- Note Ninja ---------------------------------------------------------------------------------------------
    'ninja-slash':     {file: 'ninja-slash', vol: .7, mic: true, play: true, screen: 'note-ninja', when: 'Note Ninja: a correct answer.', len: '0.1–0.3 s'},
    'ninja-combo':     {file: 'ninja-combo', vol: .8, mic: true, play: true, screen: 'note-ninja', when: 'Note Ninja: every 5 right in a row.', len: '0.3–0.5 s'},
    'belt-earned':     {file: 'belt-earned', vol: .9, mic: true, screen: 'note-ninja', when: 'Note Ninja: a new belt unlocked.', len: '0.8–1.5 s'},
    'belt-diamond':    {file: 'belt-diamond', vol: .9, mic: true, screen: 'note-ninja', when: 'Note Ninja: the Diamond belt unlocked.', len: '1–2 s'},
    // ---- Chime Heist (the bell bars themselves are always generated, so every pitch is exact) ----------------
    'tumbler-click':   {file: 'tumbler-click', vol: .5, mic: true, play: true, screen: 'chime-heist', when: 'Chime Heist: a correct bar (quiet, under the bell).', len: 'under 0.1 s'},
    'alarm-buzz':      {file: 'alarm-buzz',    vol: .7, mic: true, play: true, screen: 'chime-heist', when: 'Chime Heist: a wrong bar or a timeout.', len: '0.2–0.4 s'},
    'caught':          {file: 'caught',        vol: .8, mic: true, screen: 'chime-heist', when: 'Chime Heist: the alarm meter is full.', len: '0.8–1.5 s'},
    'vault-open':      {file: 'vault-open',    vol: .9, mic: true, screen: 'chime-heist', when: 'Chime Heist: a vault is cracked and the door swings open.', len: '0.6–1.2 s'},
    'vault-unlocked':  {file: 'vault-unlocked', vol: .8, mic: true, screen: 'chime-heist', when: 'Chime Heist: a new vault becomes available.', len: '0.3–0.6 s'},
    // ---- Ancient Ninja Scrolls ------------------------------------------------------------------------------------
    'answer-right':    {file: 'answer-right',  vol: .7, mic: true, play: true, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: a right answer.', len: '0.1–0.3 s'},
    'answer-wrong':    {file: 'answer-wrong',  vol: .7, mic: true, play: true, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: a wrong answer.', len: '0.1–0.3 s'},
    'scroll-unroll':   {file: 'scroll-unroll', vol: .8, mic: true, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: a term mastered.', len: '0.3–0.6 s'},
    'gong':            {file: 'gong',          vol: .9, mic: true, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: the Belt Exam is turned in.', len: '1–2 s'},
    'test-ready':      {file: 'test-ready',    vol: .9, mic: true, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: the Sensei presents a TEST READY badge.', len: '0.8–1.5 s'},
    // ---- Button Masher ------------------------------------------------------------------------------------------------
    'key-press':       {file: 'key-press',     vol: .5, mic: true, play: true, screen: 'button-masher', when: 'Button Masher: each key, valve or slide tap.', len: 'under 0.1 s'},
    'special-move':    {file: 'special-move',  vol: .8, mic: true, play: true, screen: 'button-masher', when: 'Button Masher: a correct STRIKE!', len: '0.2–0.5 s'},
    'combo-streak':    {file: 'combo-streak',  vol: .8, mic: true, play: true, screen: 'button-masher', when: 'Button Masher: every 5 correct in a row.', len: '0.3–0.5 s'},
    'rival-counter':   {file: 'rival-counter', vol: .8, mic: true, play: true, screen: 'button-masher', when: 'Button Masher: a wrong combo or a timeout (a cartoon "boing").', len: '0.2–0.5 s'},
    'ko':              {file: 'ko',            vol: .9, mic: true, screen: 'button-masher', when: 'Button Masher: the rival is defeated.', len: '0.8–1.5 s'},
    'fight-start':     {file: 'fight-start',   vol: .9, mic: true, screen: 'button-masher', when: 'Button Masher: "ROUND 1… FIGHT!"', len: '0.6–1.2 s'},
    // ---- Neon Face-Off (listening: each sound mutes the detector while it plays; the next note waits for it) --------
    'puck-hit-soft':   {file: 'puck-hit-soft', vol: .8, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: a WEAK shot.', len: 'under 0.5 s (0.1–0.2 s)'},
    'puck-hit-hard':   {file: 'puck-hit-hard', vol: .8, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: a GOOD or POWER shot.', len: 'under 0.5 s (0.1–0.25 s)'},
    'puck-smash':      {file: 'puck-smash',    vol: .9, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: a SMASH! shot.', len: 'under 0.5 s (0.2–0.35 s)'},
    'rail-bounce':     {file: 'rail-bounce',   vol: .5, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: the puck bounces off a rail (only while the microphone is already muted, or on the CPU\'s turn).', len: 'under 0.1 s'},
    'goal':            {file: 'goal',          vol: .9, mic: true, screen: 'neon-face-off', when: 'Neon Face-Off: a goal.', len: '0.5–1.5 s'},
    'match-win':       {file: 'match-win',     vol: .9, mic: true, screen: 'neon-face-off', when: 'Neon Face-Off: the match is won.', len: '0.8–1.5 s'},
    'your-turn':       {file: 'your-turn',     vol: .5, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: the turn changes.', len: 'under 0.2 s'},
    // ---- Showtime Malfunction (listening: each sound mutes the detector while it plays, and the band stands still) ----
    'showtime-start':  {file: 'showtime-start', vol: .9, mic: true, gen: 'level-start', screen: 'showtime-malfunction', when: 'Showtime Malfunction: a showtime begins ("It\'s showtime!"). Without a file: level-start.', len: '0.6–1.2 s'},
    'attack-tick':     {file: 'attack-tick',   vol: .6, mic: true, play: true, echo: 60, screen: 'showtime-malfunction', when: 'Showtime Malfunction: each counted note (tongued or struck) on the target\'s voice box. The mic is deaf only ~0.1 s after it, so fast tonguing still counts.', len: 'under 0.1 s (a tick)'},
    'reboot':          {file: 'reboot',        vol: .8, mic: true, play: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: an animatronic reboots (eyes turn blue), or Maestro Moose finishes a phase.', len: 'under 0.5 s'},
    'spotlight-out':   {file: 'spotlight-out', vol: .8, mic: true, play: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: an animatronic reaches the front and a spotlight goes out.', len: 'under 0.5 s'},
    'showtime-over':   {file: 'showtime-over', vol: .8, mic: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: all three spotlights are out, SHOWTIME\'S OVER. Spooky-fun, never a scream.', len: '1–2 s'},
    'extra-spooky-unlocked': {file: 'extra-spooky-unlocked', vol: .8, mic: true, fallback: 'skin-unlocked', screen: 'showtime-malfunction', when: 'Showtime Malfunction: the results screen the first time EXTRA SPOOKY unlocks (The 5:00 Show cleared on Normal). Spooky-fun, never a scream.', len: '0.8–1.5 s'},
  };

  /** the screens, in README / Sound Board order, with their headings */
  const SCREENS = [['floor', 'Arcade floor'], ['select', 'Select Player'], ['general', 'Everywhere'], ['game', 'Every game (shared events)'],
    ['ghost-notes', 'Ghost Notes'], ['note-storm', 'Note Storm'], ['note-checker', 'Note Checker'], ['note-ninja', 'Note Ninja'], ['chime-heist', 'Chime Heist'],
    ['ancient-ninja-scrolls', 'Ancient Ninja Scrolls'], ['button-masher', 'Button Masher'], ['neon-face-off', 'Neon Face-Off'], ['showtime-malfunction', 'Showtime Malfunction']];

  A.Sounds = {
    LIST, SCREENS,
    VERSION: typeof SOUNDS_VERSION !== 'undefined' ? SOUNDS_VERSION : 1,   // added to every sound URL as ?v= (top of this file)
    /** add (or replace) sound events: {name: {file, vol, loop, mic, play, screen, when, len, gen}} */
    add(entries) { Object.keys(entries || {}).forEach(k => { LIST[k] = Object.assign({file: k, vol: .8, mic: true}, entries[k]); }); },
    /** the entry for an event; select-<game id> is made on the fly for any game */
    get(name) {
      if (LIST[name]) return LIST[name];
      if (/^select-/.test(name)) {
        const g = (A.GAMES || []).find(x => 'select-' + x.id === name);
        return {file: name, vol: .8, mic: false, screen: 'floor', fallback: 'select-default', auto: true,
                when: `START on the arcade floor for ${g ? g.name : name.slice(7)} (plays before the page changes; the page changes when it ends, 1.5 s at most).`, len: '0.4–1.2 s'};
      }
      return null;
    },
    /** every event name, including one select-<id> per game in shared/games.js (if loaded) */
    names() { return Object.keys(LIST).concat((A.GAMES || []).map(g => 'select-' + g.id).filter(n => !LIST[n])); },
  };
})(window.Arcade);
