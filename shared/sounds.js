/* AFTER REPLACING SOUNDS in shared/sounds/, add 1 to this number, so every student's device loads the new files right
   away instead of a copy it saved earlier (every sound URL ends in ?v=<this number>). */
var SOUNDS_VERSION = 3;

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
     voice   true: a spoken line (the Sensei, the countdown voice, the announcer). It never plays over itself (a
             second play while it still speaks is skipped), and in Sfx.sequence it waits until any other voice
             line has finished, so two voices never talk at once
     maxInstances  (optional) at most this many copies of the sound at once (voice: true = 1); a play beyond it is skipped

   A GAME CAN ADD ITS OWN SOUNDS without touching sfx.js: in its own script (before it plays them),
     Arcade.Sounds.add({'bonus-round': {file: 'bonus-round', vol: .8, mic: true, screen: 'my-game', when: '…', len: '0.5 s',
                                        gen: [[523, 0, .08], [784, .08, .16]]}});
   `gen` is its built-in fallback: a list of [frequency Hz, start s, length s, volume 0–1, wave] beeps
   (or the name of another event to borrow, e.g. gen: 'star-earned').
   select-<game id> needs no line: every game in shared/games.js gets one automatically (file select-<id>,
   falling back to select-default). Nor does select-music-<game id>: optional Select Player music for one game
   (a loop; without the file, select-music plays). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const LIST = {
    // ---- the arcade floor --------------------------------------------------------------------------------
    'lobby-ambience':  {file: 'lobby-ambience', vol: .3, loop: true, mic: false, screen: 'floor', when: 'Background room sound on the arcade floor (the AMBIENCE slider). Loops without a gap.', len: '20–60 s loop'},
    'wheel-left':      {file: 'wheel-left',  vol: .7, mic: false, screen: 'floor', when: 'The cabinets turn left (◀, swipe, ← key).', len: '0.2–0.4 s'},
    'wheel-right':     {file: 'wheel-right', vol: .7, mic: false, screen: 'floor', when: 'The cabinets turn right (▶, swipe, → key).', len: '0.2–0.4 s'},
    'cabinet-focus':   {file: 'cabinet-focus', vol: .35, mic: false, screen: 'floor', when: 'A new cabinet arrives at the front (quiet, after the turn).', len: '0.1–0.3 s'},
    // the lobby's zones (arcade.js): mic: false, short
    'zone-select':     {file: 'zone-select', vol: .7, mic: false, screen: 'floor', gen: [[392, 0, .06, .25, 'square'], [587, .05, .1, .25, 'square']], when: 'A zone sign is tapped in the arcade lobby (the sign lights up), or FULL ARCADE is tapped.', len: '0.2–0.5 s'},
    'zone-enter':      {file: 'zone-enter', vol: .6, mic: false, screen: 'floor', gen: [[[220, 660], 0, .35, .18, 'triangle'], [[1200, 3000], .05, .3, .08, 'noise', 1.2]], when: 'A zone (or the FULL ARCADE) opens: its cabinets appear.', len: '0.3–0.8 s'},
    'zone-back':       {file: 'zone-back', vol: .6, mic: false, screen: 'floor', gen: [[[660, 220], 0, .3, .18, 'triangle']], when: 'BACK TO LOBBY (leaving a zone or ALL GAMES).', len: '0.2–0.6 s'},
    'all-games-open':  {file: 'all-games-open', vol: .6, mic: false, screen: 'floor', gen: [[523, 0, .05, .2, 'square'], [659, .05, .05, .2, 'square'], [784, .1, .08, .2, 'square']], when: 'ALL GAMES opens (the grid of every game).', len: '0.2–0.6 s'},
    'press-start':     {file: 'press-start', vol: .8, mic: false, screen: 'general', gen: [[392, 0, .07, .25, 'square'], [523, .07, .07, .25, 'square'], [784, .14, .18, .25, 'square'], [1047, .14, .18, .12, 'triangle']], when: 'A game\'s PRESS START title screen is tapped (any key or tap). A game can have its own: press-start-<game id>.', len: '0.3–0.8 s'},
    'select-default':  {file: 'select-default', vol: .8, mic: false, screen: 'floor', when: 'START on the arcade floor, for any game without its own select-<game> sound.', len: '0.4–1.2 s'},
    // select-<game id>: added below for every game in shared/games.js
    // ---- Select Player --------------------------------------------------------------------------------------
    'select-music':    {file: 'select-music', vol: .3, loop: true, mic: false, screen: 'select', when: 'Character select music on Choose Your Instrument (the MUSIC slider). It replaces the room ambience there. Loops without a gap; without a file, a built-in original chiptune loop plays.', len: '30–90 s loop'},
    'select-level':    {file: 'select-level', voice: true, vol: .9, mic: false, screen: 'game', gen: [[392, 0, .09, .2, 'square'], [523, .1, .09, .2, 'square'], [659, .2, .22, .2, 'square'], [330, .2, .22, .12, 'triangle']], when: 'Announcer says "Select your level" when a game\'s level select appears (after PRESS START, or back from a level). At most once a minute.', len: '0.8–2 s'},
    'start-ready':     {file: 'start-ready', vol: .7, mic: false, screen: 'game', gen: [[523, 0, .06, .18, 'square'], [784, .06, .12, .18, 'square']], when: 'A level is selected on a game\'s level select: the big START button appears.', len: '0.2–0.5 s'},
    'choose-instrument': {file: 'choose-instrument', voice: true, vol: .9, mic: false, screen: 'select', gen: [[523, 0, .09, .2, 'square'], [659, .1, .09, .2, 'square'], [784, .2, .22, .2, 'square'], [392, .2, .22, .12, 'triangle']], when: 'Announcer says "Choose your instrument" when the Choose Your Instrument screen opens.', len: '0.8–2 s'},
    'tile-move':       {file: 'tile-move',       vol: .5, mic: false, screen: 'select', when: 'The highlight moves to another instrument.', len: '0.05–0.15 s'},
    'player-select':   {file: 'player-select',   vol: .8, mic: false, screen: 'select', when: 'An instrument tile is confirmed (SELECT, or tapping the highlighted tile).', len: '0.2–0.5 s'},
    'player-continue': {file: 'player-continue', vol: .8, mic: false, screen: 'select', when: 'The CONTINUE AS button (or Same opponent) is pressed.', len: '0.2–0.5 s'},
    'player-ready':    {file: 'player-ready',    vol: .9, mic: false, screen: 'select', when: 'The "PLAYER 1 READY" flash.', len: '0.6–1.2 s'},
    'player2-join':    {file: 'player2-join',    vol: .9, mic: false, screen: 'select', when: 'Neon Face-Off: "PLAYER 2 — PRESS START" appears.', len: '0.4–1 s'},
    'skin-equip':      {file: 'skin-equip',      vol: .4, mic: true, screen: 'select', when: 'A skin or accessory is put on (the SKINS locker, or Equip now).', len: '0.2–0.4 s'},
    'skin-unlocked':   {file: 'skin-unlocked',   vol: .8, mic: true, screen: 'select', when: 'An UNLOCKED! card appears (a results screen, or Choose Your Instrument catch-up).', len: '0.4–0.5 s'},
    // ---- everywhere -------------------------------------------------------------------------------------------
    'ui-back':         {file: 'ui-back',   vol: .6, mic: true, screen: 'general', when: '"← ARCADE": back to the arcade floor.', len: '0.1–0.3 s'},
    'ui-toggle':       {file: 'ui-toggle', vol: .5, mic: true, screen: 'general', when: 'SOUND ON, the horn\'s Starting notes, NOTES × ORDER and other toggles.', len: '0.05–0.15 s'},
    'avatar-change':    {file: 'avatar-change',    vol: .45, mic: true, screen: 'general', gen: 'ui-toggle', when: 'Create Your Player: picking any option (a hair style, a color, a word of your name…).', len: '0.05–0.15 s'},
    'avatar-randomize': {file: 'avatar-randomize', vol: .6, mic: true, screen: 'general', gen: [[523, 0, .06, .25], [784, .05, .06, .25], [659, .1, .06, .25], [1047, .15, .1, .25]], when: 'Create Your Player: SURPRISE ME (everything, one tab, or a random name).', len: '0.2–0.5 s'},
    'item-unlocked':    {file: 'item-unlocked',    vol: .8, mic: true, screen: 'general', fallback: 'skin-unlocked', when: 'An UNLOCKED! card with a new item for your player (a hat, a pet, a jacket…): a results screen or Select Player.', len: '0.5–1 s'},
    'item-purchase':    {file: 'item-purchase',    vol: .7, mic: true, screen: 'arcade-quest', fallback: 'quest-tokens', gen: 'select-default', when: 'Arcade Quest: buying a player item or a charm at the Token Booth.', len: '0.3–0.8 s'},
    'charm-equip':      {file: 'charm-equip',      vol: .6, mic: true, screen: 'arcade-quest', fallback: 'skin-equip', gen: 'skin-equip', when: 'Arcade Quest: putting on or taking off a charm (Menu: CHARMS), or a ghost giving you one.', len: '0.2–0.5 s'},
    'avatar-open':      {file: 'avatar-open',      vol: .6, mic: false, screen: 'general', gen: [[392, 0, .07, .18, 'triangle'], [587, .06, .07, .18, 'triangle'], [784, .12, .14, .16, 'triangle']], when: 'The avatar editor (Create Your Player) opens over any screen, from the avatar badge in the top bar or EDIT PLAYER.', len: '0.2–0.6 s'},
    'avatar-save':      {file: 'avatar-save',      vol: .7, mic: true, screen: 'general', gen: 'skin-equip', when: 'Create Your Player: DONE (the new look is saved). CANCEL plays ui-back.', len: '0.3–0.6 s'},
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
    // ---- ENDLESS MODE (Note Storm and Note Ninja) --------------------------------------------------------------
    'endless-start':      {file: 'endless-start',      vol: .8, mic: true, screen: 'endless', fallback: 'level-start', gen: 'level-start', when: 'Endless mode: a run begins (the storm waits for it; keep it under 1.5 s).', len: '0.5–1.5 s'},
    'speed-up':           {file: 'speed-up',           vol: .6, mic: true, play: true, screen: 'endless', gen: [[660, 0, .06, .18, 'square'], [880, .06, .06, .18, 'square'], [1175, .12, .1, .18, 'square']], when: 'Endless mode: SPEED UP! (the speed passes the next step). During play: under 0.5 s.', len: 'under 0.5 s (0.2–0.4 s)'},
    'endless-life-lost':  {file: 'endless-life-lost',  vol: .8, mic: true, play: true, screen: 'endless', fallback: 'life-lost', gen: 'life-lost', when: 'Endless mode: a heart is lost (Note Storm: a note reaches Tempo; Note Ninja: a wrong answer or time runs out). During play: under 0.5 s.', len: 'under 0.5 s'},
    'endless-game-over':  {file: 'endless-game-over',  vol: .9, mic: true, screen: 'endless', fallback: 'game-over', gen: 'game-over', when: 'Endless mode: the last heart is gone (the GAME OVER panel).', len: '0.8–1.5 s'},
    'endless-high-score': {file: 'endless-high-score', vol: .9, mic: true, screen: 'endless', fallback: 'new-high-score', gen: 'new-high-score', when: 'Endless mode: GAME OVER with a new #1 on this Top 5 (after endless-game-over).', len: '0.5–1.5 s'},
    // ---- Lost Signal: NONE of these may be a pitched tone (the microphone must never take one for a note). They are
    //      all mic: false (they never play while the game listens), except the two tiny clicks during an echo, which go
    //      through the usual mute rules with a short tail. Built-in versions are filtered noise, never tones.
    'lost-signal-music':     {file: 'lost-signal-music', vol: .5, loop: true, mic: false, screen: 'lost-signal', when: 'Lost Signal: the menu and level screens only (never during a transmission). Until you upload it: the built-in chiptune.', len: '30–90 s loop'},
    'lost-signal-incoming':  {file: 'lost-signal-incoming', vol: .6, mic: false, screen: 'lost-signal', gen: [[[400, 3200], 0, .7, .22, 'noise', .7], [2500, .72, .05, .2, 'noise', 1]], when: 'Lost Signal: INCOMING TRANSMISSION, before the pattern plays (a static swell). No pitched tones.', len: '0.5–1.2 s'},
    'lost-signal-your-turn': {file: 'lost-signal-your-turn', vol: .6, mic: false, screen: 'lost-signal', gen: [[3000, 0, .04, .3, 'noise', 1.2], [3000, .12, .04, .3, 'noise', 1.2]], when: 'Lost Signal: YOUR TURN, ECHO THE SIGNAL (plays just before the microphone listens). No pitched tones.', len: 'under 0.4 s'},
    'lost-signal-correct':   {file: 'lost-signal-correct', vol: .5, mic: true, play: true, echo: 40, screen: 'lost-signal', gen: [[3500, 0, .02, .28, 'noise', .9]], when: 'Lost Signal: an echoed note was right (a tiny click, NOT a tone: it plays while the microphone listens).', len: 'under 0.05 s'},
    'lost-signal-wrong':     {file: 'lost-signal-wrong', vol: .5, mic: true, play: true, echo: 60, screen: 'lost-signal', gen: [[900, 0, .1, .25, 'noise', .5]], when: 'Lost Signal: an echoed note was wrong (a short static burst, NOT a tone: it plays while the microphone listens).', len: 'under 0.15 s'},
    'lost-signal-decoded':   {file: 'lost-signal-decoded', vol: .7, mic: false, screen: 'lost-signal', gen: [[[600, 5000], 0, .35, .25, 'noise', 1.5], [4000, .38, .05, .25, 'noise', 1.5], [4000, .5, .05, .25, 'noise', 1.5]], when: 'Lost Signal: TRANSMISSION DECODED (every note right). No pitched tones.', len: '0.5–1.2 s'},
    'lost-signal-partial':   {file: 'lost-signal-partial', vol: .6, mic: false, screen: 'lost-signal', gen: [[[2000, 500], 0, .5, .22, 'noise', .6]], when: 'Lost Signal: a transmission with some notes wrong or missed (a fading crackle). No pitched tones.', len: '0.4–1 s'},
    'lost-signal-found':     {file: 'lost-signal-found', vol: .7, mic: false, screen: 'lost-signal', gen: [[[800, 4000], 0, .25, .25, 'noise', 1.5], [4000, .28, .06, .25, 'noise', 1.5]], when: 'Lost Signal: FIND THE SIGNAL, the first note found. No pitched tones.', len: '0.3–0.8 s'},
    'lost-signal-level-clear': {file: 'lost-signal-level-clear', vol: .8, mic: false, screen: 'lost-signal', gen: [[[500, 6000], 0, .6, .25, 'noise', 1.2], [5000, .65, .06, .25, 'noise', 1.5], [5000, .8, .06, .25, 'noise', 1.5], [5000, .95, .1, .25, 'noise', 1.5]], when: 'Lost Signal: the level results with at least 1 star. No pitched tones.', len: '0.8–2 s'},
    'lost-signal-life-lost': {file: 'lost-signal-life-lost', vol: .7, mic: false, screen: 'lost-signal', gen: [[[3000, 300], 0, .4, .25, 'noise', .7]], when: 'Lost Signal: Deep Space Scan, a round missed: a heart is lost. No pitched tones.', len: '0.3–0.8 s'},
    'lost-signal-game-over': {file: 'lost-signal-game-over', vol: .8, mic: false, screen: 'lost-signal', gen: [[[2500, 150], 0, 1.1, .25, 'noise', .5]], when: 'Lost Signal: Deep Space Scan, GAME OVER (the signal fades out). No pitched tones.', len: '0.8–1.5 s'},
    'lost-signal-high-score': {file: 'lost-signal-high-score', vol: .8, mic: false, screen: 'lost-signal', gen: [[[500, 6000], 0, .5, .25, 'noise', 1.2], [5000, .55, .06, .25, 'noise', 1.5], [5000, .7, .06, .25, 'noise', 1.5]], when: 'Lost Signal: Deep Space Scan, GAME OVER with a new #1 (after lost-signal-game-over). No pitched tones.', len: '0.5–1.5 s'},
    // ---- Dojo Duel (no microphone: pitched sounds are fine; every entry is mic: false) ---------------------------
    //      The timings named below live in DUEL_PACING at the top of dojo-duel/levels.js.
    'dojo-music':       {file: 'dojo-music', vol: .5, loop: true, mic: false, screen: 'dojo-duel', when: 'Dojo Duel: the setup screen, before a match (a loop). Until you upload it: the built-in chiptune.', len: '30–90 s loop'},
    'dojo-match-music': {file: 'dojo-match-music', vol: .3, loop: true, mic: false, screen: 'dojo-duel', when: 'Dojo Duel: during a match, quieter under the taps (a loop). Until you upload it: the built-in chiptune.', len: '30–90 s loop'},
    'dojo-begin':       {file: 'dojo-begin', vol: .8, mic: false, screen: 'dojo-duel', gen: [[98, 0, 1.4, .3, 'triangle'], [147, 0, 1.2, .18, 'sine'], [196, 0, 1, .12, 'sine'], [392, .02, .5, .06, 'sine']], when: 'Dojo Duel: gong at the start of each match, before the countdown (with sensei-begin; REMATCH too). The 3-2-1 starts 0.4 s after both have finished.', len: '1–2 s'},
    'dojo-count':       {file: 'dojo-count', vol: .6, mic: false, play: true, screen: 'dojo-duel', gen: [[1320, 0, .05, .22, 'square']], when: 'Dojo Duel: a short TICK on each number (3, 2, 1) of a QUICK countdown (0.35 s apart: a spoken number would not fit). Also what a spoken number (dojo-count-3/-2/-1) plays until its own file is uploaded. A tick, not a voice: never a whole "3, 2, 1, go" in one file.', len: 'under 0.2 s'},
    // THE VOICE COUNTDOWN: one file per word, each played the moment its number (or the note) appears. Trim each file
    // so the word starts at the very beginning; keep each number under about 0.8 s (they are 1 s apart).
    'dojo-count-3':     {file: 'dojo-count-3', voice: true, vol: .9, mic: false, screen: 'dojo-duel', fallback: 'dojo-count', gen: [[1320, 0, .05, .22, 'square']], when: 'Dojo Duel: the spoken "3!" as the 3 appears in a CLASSIC countdown (the first note of a match, the note after a MATCH POINT, or COUNTDOWN: CLASSIC). Not in QUICK or OFF. Missing: the dojo-count tick.', len: 'under 0.8 s'},
    'dojo-count-2':     {file: 'dojo-count-2', voice: true, vol: .9, mic: false, screen: 'dojo-duel', fallback: 'dojo-count', gen: [[1320, 0, .05, .22, 'square']], when: 'Dojo Duel: the spoken "2!" as the 2 appears, 1 second after the 3 (CLASSIC countdown only). Missing: the dojo-count tick.', len: 'under 0.8 s'},
    'dojo-count-1':     {file: 'dojo-count-1', voice: true, vol: .9, mic: false, screen: 'dojo-duel', fallback: 'dojo-count', gen: [[1320, 0, .05, .22, 'square']], when: 'Dojo Duel: the spoken "1!" as the 1 appears, 1 second after the 2 (CLASSIC countdown only). Missing: the dojo-count tick.', len: 'under 0.8 s'},
    'dojo-count-go':    {file: 'dojo-count-go', voice: true, vol: .9, mic: false, screen: 'dojo-duel', fallback: 'dojo-reveal', gen: [[1568, 0, .06, .22, 'square'], [2093, .05, .12, .2, 'square'], [[2500, 6000], 0, .12, .12, 'noise', 1.5]], when: 'Dojo Duel: the spoken "Go!" the moment the note appears on both sides, after EVERY countdown (QUICK, CLASSIC and OFF; the first note of a match too). Plays INSTEAD of dojo-reveal (never both). Missing: dojo-reveal.', len: 'under 1 s'},
    'dojo-reveal':      {file: 'dojo-reveal', vol: .7, mic: false, play: true, screen: 'dojo-duel', gen: [[1568, 0, .06, .22, 'square'], [2093, .05, .12, .2, 'square'], [[2500, 6000], 0, .12, .12, 'noise', 1.5]], when: 'Dojo Duel: the note appears on both sides, ONLY while there is no dojo-count-go file (the spoken "Go!" replaces it). A quick swish or chime.', len: 'under 0.3 s'},
    'dojo-wrong':       {file: 'dojo-wrong', vol: .6, mic: false, play: true, screen: 'dojo-duel', gen: [[[330, 165], 0, .25, .25, 'sawtooth'], [[1400, 700], .05, .2, .12, 'noise', 2]], when: 'Dojo Duel: a wrong tap by any player (or the Sensei): that player is dizzy for 1 second.', len: 'under 0.5 s'},
    'dojo-strike':      {file: 'dojo-strike', vol: .7, mic: false, play: true, screen: 'dojo-duel', gen: [[[3200, 700], 0, .09, .2, 'noise', 1.2], [[220, 90], .04, .14, .3, 'triangle']], when: 'Dojo Duel: any point won (players or the Sensei): the winner\'s ninja does a quick strike (a playful bump). First sound of the result moment, before dojo-point.', len: 'under 0.3 s'},
    'dojo-point':       {file: 'dojo-point', vol: .7, mic: false, play: true, screen: 'dojo-duel', gen: [[784, 0, .06, .3, 'square'], [1175, .06, .12, .3, 'square']], when: 'Dojo Duel: any point won (players or the Sensei), right after dojo-strike.', len: 'under 0.5 s'},
    'dojo-match-point': {file: 'dojo-match-point', vol: .8, mic: false, screen: 'dojo-duel', gen: [[523, 0, .12, .3, 'square'], [523, .16, .12, .3, 'square'], [784, .32, .3, .3, 'square']], when: 'Dojo Duel: MATCH POINT: a point that leaves someone one point from winning (after dojo-point).', len: '0.5–1 s'},
    'dojo-no-point':    {file: 'dojo-no-point', vol: .6, mic: false, play: true, screen: 'dojo-duel', gen: [[392, 0, .12, .22, 'triangle'], [330, .13, .22, .22, 'triangle']], when: 'Dojo Duel: nobody scores (both wrong, or no right answer in 6 s: "Too slow, ninjas!").', len: 'under 0.5 s'},
    'dojo-victory':     {file: 'dojo-victory', vol: .9, mic: false, screen: 'dojo-duel', gen: [[523, 0, .12, .3, 'square'], [659, .12, .12, .3, 'square'], [784, .24, .12, .3, 'square'], [1047, .36, .5, .3, 'square'], [98, .36, 1.2, .25, 'triangle']], when: 'Dojo Duel: the match is won (the victory screen), in every mode. Followed by sensei-victory.', len: '1–2.5 s'},
    // the Sensei's voice (the announcer). Until you upload a recording, a short built-in jingle plays; the words show on screen either way
    'sensei-begin':     {file: 'sensei-begin', voice: true, vol: .9, mic: false, screen: 'dojo-duel', gen: [[392, 0, .1, .2, 'triangle'], [523, .11, .22, .2, 'triangle']], when: 'Dojo Duel (the Sensei\'s voice): Sensei\'s opening line with the gong, at the start of each match (REMATCH too), before the countdown. The 3-2-1 waits until it has finished (+0.4 s; at most 3 s in all).', len: '1–2 s'},
    'sensei-fast':      {file: 'sensei-fast', voice: true, vol: .9, mic: false, screen: 'dojo-duel', gen: [[1568, 0, .05, .18, 'square'], [2093, .05, .05, .18, 'square'], [2637, .1, .12, .18, 'square']], when: 'Dojo Duel (the announcer\'s voice): after any very fast correct answer by a PLAYER (a point won in under 1.5 s: fastMs in DUEL_PACING), in 2-player and Solo ("Swift and sharp!"). Never for the Sensei\'s own points, and not on the point that wins the match (sensei-victory speaks then).', len: 'under 1 s'},
    'sensei-point':     {file: 'sensei-point', voice: true, vol: .9, mic: false, screen: 'dojo-duel', gen: [[294, 0, .1, .22, 'triangle'], [392, .12, .2, .22, 'triangle']], when: 'Dojo Duel (the Sensei\'s voice): SOLO VS. SENSEI only, when the computer Sensei wins a point (fast or not). Never in a 2-player game. Not on the point that wins the match.', len: 'under 1 s'},
    'sensei-victory':   {file: 'sensei-victory', voice: true, vol: .9, mic: false, screen: 'dojo-duel', gen: [[523, 0, .12, .2, 'triangle'], [659, .12, .12, .2, 'triangle'], [784, .24, .3, .2, 'triangle']], when: 'Dojo Duel (the Sensei\'s voice): the end of every match, right after dojo-victory ("A worthy duel! Bow, ninjas.").', len: '1–2 s'},
    // ---- GAME MENU MUSIC: every game's own loop (games.js `menuMusic`, played by Sfx.gameMenuMusic). Until its file
    //      is uploaded the arcade's select-music plays instead. Record a seamless loop, 30–90 s, .m4a, named exactly so.
    'ghost-notes-menu': {file: 'ghost-notes-menu', vol: .45, loop: true, mic: false, screen: 'ghost-notes', when: 'Ghost Notes: menu music: level select, mode picker and results screens. Fades out (0.5 s) when a level starts and before the microphone listens; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'note-storm-menu': {file: 'note-storm-menu', vol: .45, loop: true, mic: false, screen: 'note-storm', when: 'Note Storm: menu music: level select, mode picker and results screens (and the Endless GAME OVER). Fades out (0.5 s) when a level starts and before the microphone listens; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'note-ninja-menu': {file: 'note-ninja-menu', vol: .45, loop: true, mic: false, screen: 'note-ninja', when: 'Note Ninja: menu music: belt select, mode picker and results screens (and the Endless GAME OVER). Fades out (0.5 s) when a level starts; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'chime-heist-menu': {file: 'chime-heist-menu', vol: .45, loop: true, mic: false, screen: 'chime-heist', when: 'Chime Heist: menu music: vault select, mode picker and results screens. Fades out (0.5 s) when a level starts; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'ancient-ninja-scrolls-menu': {file: 'ancient-ninja-scrolls-menu', vol: .45, loop: true, mic: false, screen: 'ancient-ninja-scrolls', when: 'Ancient Ninja Scrolls: menu music: the dojo and belt chambers, quiz results and Belt Exam results. Fades out (0.5 s) when a level starts; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'button-masher-menu': {file: 'button-masher-menu', vol: .45, loop: true, mic: false, screen: 'button-masher', when: 'Button Masher: menu music: rival select, the chart and results screens. Fades out (0.5 s) when a level starts; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'neon-face-off-menu': {file: 'neon-face-off-menu', vol: .45, loop: true, mic: false, screen: 'neon-face-off', when: 'Neon Face-Off: menu music: the setup screen (players, difficulty, rival) and results. Fades out (0.5 s) when a level starts and before the microphone listens; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'showtime-malfunction-menu': {file: 'showtime-malfunction-menu', vol: .45, loop: true, mic: false, screen: 'showtime-malfunction', when: 'Showtime Malfunction: menu music: show select, mode picker, the story and results screens. Fades out (0.5 s) when a level starts and before the microphone listens; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    // ---- Keys to the City: every effect is UNPITCHED noise (safe while INSTRUMENT MODE listens); the piano tones are
    //      generated (Sfx.piano, TOUCH mode only) and never files
    'keys-to-the-city-menu': {file: 'keys-to-the-city-menu', vol: .45, loop: true, mic: false, screen: 'keys-to-the-city', when: 'Keys to the City: menu music: the city map, a district\'s intro and results. Fades out (0.5 s) when a district starts. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'kttc-window-on':   {file: 'kttc-window-on', vol: .4, mic: true, play: true, echo: 40, screen: 'keys-to-the-city', gen: [[[1800, 3600], 0, .08, .14, 'noise', 2]], when: 'Keys to the City: a key lights up (its windows switch on) or a new note appears. A soft click, never a tone.', len: 'under 0.15 s'},
    'kttc-correct':     {file: 'kttc-correct', vol: .5, mic: true, play: true, echo: 40, screen: 'keys-to-the-city', gen: [[3200, 0, .03, .25, 'noise', 1.5], [4200, .06, .04, .22, 'noise', 1.5]], when: 'Keys to the City: a right answer. Two bright ticks, never a tone (it plays while instrument mode listens).', len: 'under 0.2 s'},
    'kttc-wrong':       {file: 'kttc-wrong', vol: .5, mic: true, play: true, echo: 60, screen: 'keys-to-the-city', gen: [[700, 0, .14, .25, 'noise', .6]], when: 'Keys to the City: a wrong answer (or time up). A soft thud, never a tone.', len: 'under 0.2 s'},
    'kttc-block-lights': {file: 'kttc-block-lights', vol: .5, mic: true, play: true, echo: 40, screen: 'keys-to-the-city', gen: [[[1500, 5000], 0, .3, .2, 'noise', 1.2]], when: 'Keys to the City: every 5 right answers in a row, a whole block of the city lights up. A shimmer, never a tone.', len: 'under 0.4 s'},
    'kttc-golden-key':  {file: 'kttc-golden-key', vol: .75, mic: false, screen: 'keys-to-the-city', gen: [[[600, 5000], 0, .5, .25, 'noise', 1.3], [4800, .55, .06, .25, 'noise', 1.5], [4800, .7, .08, .25, 'noise', 1.5]], when: 'Keys to the City: a district cleared: the Mayor hands over a golden key (results).', len: '0.6–1.5 s'},
    'kttc-keys-to-city': {file: 'kttc-keys-to-city', vol: .8, mic: false, screen: 'keys-to-the-city', gen: 'star-earned', when: "Keys to the City: The Mayor's Challenge cleared: the KEYS TO THE CITY celebration.", len: '2–4 s'},
    'kttc-mayor-hello': {file: 'kttc-mayor-hello', voice: true, vol: .9, mic: false, optional: true, screen: 'keys-to-the-city', gen: [], when: 'Keys to the City (optional voice): the Mayor welcomes you to a district (its intro). Silent until recorded.', len: '1–3 s'},
    // the sign hints: mic: true, because a student may tap a sign in instrument mode too (the manager mutes the detector while it speaks)
    'kttc-mayor-chopsticks': {file: 'kttc-mayor-chopsticks', voice: true, vol: .9, mic: true, optional: true, screen: 'keys-to-the-city', gen: [], when: 'Keys to the City (optional voice): "C is right next to the Chopsticks!" Plays when a student taps the Chopsticks sign, and as a hint after a wrong answer (touch mode). Silent until recorded (the Mayor\'s bubble shows the words).', len: '1–2.5 s'},
    'kttc-mayor-fork':  {file: 'kttc-mayor-fork', voice: true, vol: .9, mic: true, optional: true, screen: 'keys-to-the-city', gen: [], when: 'Keys to the City (optional voice): "F is right next to the Fork!" Plays when a student taps the Fork sign, and as a hint after a wrong answer (touch mode). Silent until recorded (the Mayor\'s bubble shows the words).', len: '1–2.5 s'},
    'music-highway-menu': {file: 'music-highway-menu', vol: .45, loop: true, mic: false, screen: 'music-highway', when: 'Music Highway: menu music: the song select, the timing check and results screens. Fades out (0.5 s) before a song\'s count-in; never during a song. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
    'mh-click': {file: 'mh-click', vol: 1, mic: true, screen: 'music-highway', len: 'under 0.06 s',
      when: 'Music Highway: THE CLICK of the one-measure count-in before every song and of the timing check (calibration). A woodblock / stick-click: a sharp attack, bright (most of its sound between 1.5 and 4 kHz so small speakers carry it), under 60 ms, and NOT a pitched tone (the microphone must never take it for a note). The first click of each measure plays it a little higher and louder. Scheduled on the audio clock by music-highway/backing.js (never through the normal effects player); its level is clickVol in music-highway/settings.js. Until you upload it: a generated woodblock click.',
      gen: [[[2400, 2100], 0, .045, .5, 'noise', 4], [3400, 0, .02, .35, 'noise', 2]]},
    // mh-drums-<song id>: made below for every song in music-highway/songs.js (optional backing-drums recordings)
    'sustain-speedway-menu': {file: 'sustain-speedway-menu', vol: .45, loop: true, mic: false, screen: 'sustain-speedway', when: 'Sustain Speedway: menu music: track select, mode picker and results screens. Fades out (0.5 s) when a level starts and before the microphone listens; comes back on the results screen after its sounds. Until you upload it: the arcade\'s select-music.', len: '30–90 s loop'},
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
    'puck-hit-soft':   {file: 'puck-hit-soft', vol: .8, mic: true, play: true, screen: 'neon-face-off', maxLen: .3, when: 'Neon Face-Off: a WEAK shot. Trim it to UNDER 0.3 s: in a rally the microphone is muted for at most 0.3 s of it (levels.js maxHitSuppressMs), so a longer tail plays over the next player\'s turn.', len: 'under 0.3 s (0.1–0.2 s)'},
    'puck-hit-hard':   {file: 'puck-hit-hard', vol: .8, mic: true, play: true, screen: 'neon-face-off', maxLen: .3, when: 'Neon Face-Off: a GOOD or POWER shot. Trim it to UNDER 0.3 s: in a rally the microphone is muted for at most 0.3 s of it (levels.js maxHitSuppressMs), so a longer tail plays over the next player\'s turn.', len: 'under 0.3 s (0.1–0.25 s)'},
    'puck-smash':      {file: 'puck-smash',    vol: .9, mic: true, play: true, screen: 'neon-face-off', maxLen: .3, when: 'Neon Face-Off: a SMASH! shot. Trim it to UNDER 0.3 s: in a rally the microphone is muted for at most 0.3 s of it (levels.js maxHitSuppressMs), so a longer tail plays over the next player\'s turn.', len: 'under 0.3 s (0.15–0.3 s)'},
    'rail-bounce':     {file: 'rail-bounce',   vol: .5, mic: true, play: true, screen: 'neon-face-off', when: 'Neon Face-Off: the puck bounces off a rail (only while the microphone is already muted, or on the CPU\'s turn).', len: 'under 0.1 s'},
    'goal':            {file: 'goal',          vol: .9, mic: true, screen: 'neon-face-off', when: 'Neon Face-Off: a goal.', len: '0.5–1.5 s'},
    'match-win':       {file: 'match-win',     vol: .9, mic: true, screen: 'neon-face-off', when: 'Neon Face-Off: the match is won.', len: '0.8–1.5 s'},
    'your-turn':       {file: 'your-turn',     vol: .5, mic: true, play: true, screen: 'neon-face-off', maxLen: .3, when: 'Neon Face-Off: the turn changes (the receiver\'s note appears). In a rally it mutes the microphone for at most 0.3 s.', len: 'under 0.2 s'},
    /* NEON FACE-OFF COUNTDOWNS (shared/countdown.js, voicePrefix 'faceoff'): the microphone is PAUSED during a countdown, so
       these are mic: false. One file per word, trimmed to start at once. Missing: the matching dojo-count-* file, then the
       dojo-count tick; with no file at all, a soft generated click (noise, never a pitched tone). */
    'faceoff-count-3':  {file: 'faceoff-count-3', voice: true, vol: .9, mic: false, screen: 'neon-face-off', fallback: 'dojo-count-3', gen: [[[1800, 3200], 0, .05, .3, 'noise', 3]], when: 'Neon Face-Off: the spoken "3!" of a CLASSIC countdown (before the first serve of a match, and before the serve after a point that leaves someone at MATCH POINT). Missing: dojo-count-3, then the dojo-count tick.', len: 'under 0.8 s'},
    'faceoff-count-2':  {file: 'faceoff-count-2', voice: true, vol: .9, mic: false, screen: 'neon-face-off', fallback: 'dojo-count-2', gen: [[[1800, 3200], 0, .05, .3, 'noise', 3]], when: 'Neon Face-Off: the spoken "2!", 1 second after the 3 (CLASSIC countdown). Missing: dojo-count-2, then the dojo-count tick.', len: 'under 0.8 s'},
    'faceoff-count-1':  {file: 'faceoff-count-1', voice: true, vol: .9, mic: false, screen: 'neon-face-off', fallback: 'dojo-count-1', gen: [[[1800, 3200], 0, .05, .3, 'noise', 3]], when: 'Neon Face-Off: the spoken "1!", 1 second after the 2 (CLASSIC countdown). Missing: dojo-count-1, then the dojo-count tick.', len: 'under 0.8 s'},
    'faceoff-ready':    {file: 'faceoff-ready', voice: true, vol: .9, mic: false, screen: 'neon-face-off', fallback: 'dojo-count', gen: [[[1500, 2600], 0, .05, .28, 'noise', 3]], when: 'Neon Face-Off: the spoken "Ready…" of a READY-GO countdown (before the serve after every point). Missing: the dojo-count tick.', len: 'under 0.45 s'},
    'faceoff-count-go': {file: 'faceoff-count-go', voice: true, vol: .9, mic: false, screen: 'neon-face-off', fallback: 'dojo-count-go', gen: [[[2500, 6000], 0, .12, .3, 'noise', 1.5]], when: 'Neon Face-Off: the spoken "Go!" on the LAST beat of every countdown. The serve note appears (and the microphone listens) as it ends, so keep it short and trimmed. Missing: dojo-count-go, then dojo-reveal.', len: 'under 0.45 s'},
    // ---- Showtime Malfunction (listening: each sound mutes the detector while it plays, and the band stands still) ----
    'showtime-start':  {file: 'showtime-start', vol: .9, mic: true, gen: 'level-start', screen: 'showtime-malfunction', when: 'Showtime Malfunction: a showtime begins ("It\'s showtime!"). Without a file: level-start.', len: '0.6–1.2 s'},
    'attack-tick':     {file: 'attack-tick',   vol: .6, mic: true, play: true, echo: 60, screen: 'showtime-malfunction', when: 'Showtime Malfunction: each counted note (tongued or struck) on the target\'s voice box. The mic is deaf only ~0.1 s after it, so fast tonguing still counts.', len: 'under 0.1 s (a tick)'},
    'reboot':          {file: 'reboot',        vol: .8, mic: true, play: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: an animatronic reboots (eyes turn blue), or Maestro Moose finishes a phase.', len: 'under 0.5 s'},
    'spotlight-out':   {file: 'spotlight-out', vol: .8, mic: true, play: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: an animatronic reaches the front and a spotlight goes out.', len: 'under 0.5 s'},
    'showtime-over':   {file: 'showtime-over', vol: .8, mic: true, screen: 'showtime-malfunction', when: 'Showtime Malfunction: all three spotlights are out, SHOWTIME\'S OVER. Spooky-fun, never a scream.', len: '1–2 s'},
    'nightmare-unlocked': {file: 'nightmare-unlocked', vol: .8, mic: true, fallback: 'skin-unlocked', screen: 'showtime-malfunction', when: 'Showtime Malfunction: the results screen the first time NIGHTMARE unlocks (The 5:00 Show cleared on Normal). Spooky-fun, never a scream.', len: '0.8–1.5 s'},
    // ---- Sustain Speedway (the mic listens for the whole race: nothing plays while racing) ------------------------
    'race-countdown':  {file: 'race-countdown', vol: .8, mic: true, screen: 'sustain-speedway', gen: [[523, 0, .16], [523, 1, .16], [523, 2, .16], [1047, 3, .45]], when: 'Sustain Speedway: "3, 2, 1, GO!" before the first note. It plays BEFORE listening counts: GO waits until it ends.', len: '3–3.5 s (GO on the last beat)'},
    'pit-in':          {file: 'pit-in', vol: .7, mic: true, play: true, screen: 'sustain-speedway', gen: [[392, 0, .08, .25], [523, .08, .14, .25]], when: 'Sustain Speedway: the car pulls into the pit stop (a rest between laps).', len: 'under 0.5 s'},
    'race-finish':     {file: 'race-finish', vol: .8, mic: true, screen: 'sustain-speedway', gen: 'level-complete', when: 'Sustain Speedway: crossing the finish line.', len: '0.8–1.5 s'},
    'podium':          {file: 'podium', vol: .8, mic: true, screen: 'sustain-speedway', gen: 'new-high-score', when: 'Sustain Speedway: the results screen, finishing 1st, 2nd or 3rd.', len: '1–2 s'},
    'new-best-lap':    {file: 'new-best-lap', vol: .8, mic: true, screen: 'sustain-speedway', gen: 'star-earned', when: 'Sustain Speedway: the results screen, a new best lap on this track (after the podium).', len: '0.5–1 s'},
    // ---- Arcade Quest (the mic listens only during a playing challenge; menus and dodging are quiet for it) --------
    'quest-battle': {file: 'quest-battle', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: battle music (the MUSIC slider), during menus and dodging. It stops while the microphone listens. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-text': {file: 'quest-text', vol: .25, mic: false, screen: 'arcade-quest', gen: [[880, 0, .018, .12, 'square']], when: 'Arcade Quest: the text box typing (a tiny blip every few letters). Never while the microphone listens.', len: 'under 0.05 s'},
    'quest-move': {file: 'quest-move', vol: .5, mic: false, screen: 'arcade-quest', gen: 'tile-move', when: 'Arcade Quest: moving between menu buttons.', len: 'under 0.1 s'},
    'quest-select': {file: 'quest-select', vol: .6, mic: false, screen: 'arcade-quest', gen: 'ui-toggle', when: 'Arcade Quest: choosing a menu button.', len: 'under 0.2 s'},
    'quest-hurt': {file: 'quest-hurt', vol: .6, mic: false, play: true, screen: 'arcade-quest', gen: [[330, 0, .07, .3, 'square'], [220, .06, .09, .3, 'square']], when: 'Arcade Quest: a sour note hits you while dodging.', len: 'under 0.3 s'},
    'quest-enemy-hurt': {file: 'quest-enemy-hurt', vol: .7, mic: true, screen: 'arcade-quest', gen: [[660, 0, .06, .3, 'square'], [990, .06, .08, .25, 'square']], when: 'Arcade Quest: your PLAY lands (after the challenge, never while listening).', len: 'under 0.4 s'},
    'quest-calm': {file: 'quest-calm', vol: .6, mic: true, screen: 'arcade-quest', gen: 'note-hit', when: 'Arcade Quest: the enemy\'s CALM meter rises.', len: 'under 0.4 s'},
    'quest-befriend': {file: 'quest-befriend', vol: .8, mic: true, screen: 'arcade-quest', gen: 'level-complete', when: 'Arcade Quest: HARMONIZE works and the enemy joins your band.', len: '1–2 s'},
    'quest-fade': {file: 'quest-fade', vol: .7, mic: true, screen: 'arcade-quest', gen: [[523, 0, .12, .25, 'triangle'], [392, .12, .12, .25, 'triangle'], [262, .24, .3, .25, 'triangle']], when: 'Arcade Quest: the enemy fades away grumbling (its HP ran out).', len: '0.5–1 s'},
    'quest-levelup': {file: 'quest-levelup', vol: .8, mic: true, screen: 'arcade-quest', gen: 'star-earned', when: 'Arcade Quest: LEVEL UP after a battle.', len: '0.8–1.5 s'},
    'quest-item': {file: 'quest-item', vol: .6, mic: false, screen: 'arcade-quest', gen: 'skin-equip', when: 'Arcade Quest: using an item.', len: 'under 0.5 s'},
    // Arcade Quest music (the MUSIC slider): files only, no built-in version. Each loops; it plays while exploring,
    // in menus and during dodges, and stops while the microphone listens.
    'quest-title': {file: 'quest-title', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: title screen music. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-foyer': {file: 'quest-foyer', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Arcade Quest: Ghost Notes Manor, the Foyer (the safe hub) and the Practice Hall. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-manor': {file: 'quest-manor', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Arcade Quest: exploring Ghost Notes Manor (every room but the Foyer). Nothing plays until you upload it.', len: '30–90 s loop'},
    /* EPISODE 1 ROOM MUSIC: one slot per explorable room (arcade-quest/data/music.js says which room plays which; several
       rooms can share one). Until a room's file is uploaded it plays what it always did (quest-foyer / quest-manor).
       resume: true = picks up where it left off (after a battle, or the microphone listening) */
    'quest-room-foyer': {file: 'quest-room-foyer', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Foyer. Until it is uploaded, this room plays quest-foyer.', len: '30–90 s loop'},
    'quest-room-hall': {file: 'quest-room-hall', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Portrait Hall. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-library': {file: 'quest-room-library', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Library. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-ballroom': {file: 'quest-room-ballroom', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Ballroom. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-kitchen': {file: 'quest-room-kitchen', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Kitchen. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-stairs': {file: 'quest-room-stairs', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Attic Stairs. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-attic': {file: 'quest-room-attic', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Attic. Until it is uploaded, this room plays quest-manor.', len: '30–90 s loop'},
    'quest-room-practice': {file: 'quest-room-practice', vol: .5, loop: true, mic: false, resume: true, screen: 'arcade-quest', when: 'Episode 1: The Practice Hall. Until it is uploaded, this room plays quest-foyer.', len: '30–90 s loop'},
    'quest-miniboss': {file: 'quest-miniboss', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the mini-boss battle (The Phantom Fermata), in menus and dodging; stops while listening. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-step': {file: 'quest-step', vol: .12, mic: false, screen: 'arcade-quest', gen: [[140, 0, .025, .08, 'triangle']], when: 'Arcade Quest: a footstep while exploring (every other step, very quiet).', len: 'under 0.08 s'},
    'quest-door': {file: 'quest-door', vol: .55, mic: false, screen: 'arcade-quest', gen: [[196, 0, .12, .2, 'square'], [147, .1, .16, .2, 'square']], when: 'Arcade Quest: going through a door to another room (or a locked door rattling).', len: 'under 0.5 s'},
    'quest-save': {file: 'quest-save', vol: .7, mic: false, screen: 'arcade-quest', gen: 'star-earned', when: 'Arcade Quest: saving at the Save Jukebox.', len: '0.5–1.5 s'},
    // ---- Vanishing Ink: every sound is unpitched noise (none may be a tone). mic: true ones play while the microphone
    //      listens (short; the detector ignores them, the answer clock waits); mic: false ones only when it doesn't
    'vanishing-ink-music':  {file: 'vanishing-ink-music', vol: .5, loop: true, mic: false, screen: 'vanishing-ink', when: 'Vanishing Ink: the level screens only (never while a scroll is on: the music stops as the microphone listens). Nothing plays until you upload it (no built-in tune: nothing pitched is generated here).', len: '30–90 s loop'},
    'ink-brush':            {file: 'ink-brush', vol: .45, mic: true, play: true, echo: 40, screen: 'vanishing-ink', gen: [[[1400, 4200], 0, .07, .16, 'noise', .8]], when: 'Vanishing Ink: each note brushes onto the scroll (one per note, 0.1 s apart). A soft brush swish, never a tone.', len: 'under 0.1 s'},
    'ink-fade':             {file: 'ink-fade', vol: .4, mic: true, play: true, screen: 'vanishing-ink', gen: [[[3200, 700], 0, .45, .1, 'noise', .5]], when: 'Vanishing Ink: the ink starts to fade (FADE levels). A soft breathy hush, never a tone.', len: 'under 0.5 s'},
    'ink-vanish':           {file: 'ink-vanish', vol: .6, mic: true, play: true, screen: 'vanishing-ink', gen: [[[900, 200], 0, .28, .3, 'noise', .6], [2600, 0, .05, .18, 'noise', 1.2]], when: 'Vanishing Ink: the ink vanishes all at once in a puff (VANISH levels). A "poof", never a tone.', len: 'under 0.4 s'},
    'ink-your-turn':        {file: 'ink-your-turn', vol: .6, mic: true, play: true, echo: 60, screen: 'vanishing-ink', gen: [[2200, 0, .03, .3, 'noise', 2], [2200, .11, .03, .3, 'noise', 2]], when: 'Vanishing Ink: PLAY IT FROM MEMORY (the ink is gone). Two wood-block taps, never a tone.', len: 'under 0.3 s'},
    'ink-note-correct':     {file: 'ink-note-correct', vol: .5, mic: true, play: true, echo: 40, screen: 'vanishing-ink', gen: [[3500, 0, .02, .28, 'noise', .9]], when: 'Vanishing Ink: a note played back was right. Plays while the microphone listens: a tiny click, never a tone.', len: 'under 0.1 s'},
    'ink-note-wrong':       {file: 'ink-note-wrong', vol: .5, mic: true, play: true, echo: 60, screen: 'vanishing-ink', gen: [[900, 0, .1, .25, 'noise', .5]], when: 'Vanishing Ink: a note played back was wrong. Plays while the microphone listens: a short dull thud, never a tone.', len: 'under 0.15 s'},
    'ink-reveal-scroll':    {file: 'ink-reveal-scroll', vol: .5, mic: true, play: true, screen: 'vanishing-ink', gen: [[[500, 2800], 0, .3, .14, 'noise', .7]], when: 'Vanishing Ink: REVEAL SCROLL (the ink shows again for a moment). A paper rustle, never a tone.', len: 'under 0.4 s'},
    'ink-round-complete':   {file: 'ink-round-complete', vol: .6, mic: false, screen: 'vanishing-ink', gen: [[[700, 3600], 0, .3, .2, 'noise', 1.2], [3600, .34, .05, .22, 'noise', 1.5]], when: 'Vanishing Ink: a round\'s result (the ink comes back on the scroll, marked).', len: '0.3–0.8 s'},
    'ink-level-clear':      {file: 'ink-level-clear', vol: .8, mic: false, screen: 'vanishing-ink', gen: [[[500, 6000], 0, .6, .25, 'noise', 1.2], [5000, .65, .06, .25, 'noise', 1.5], [5000, .8, .06, .25, 'noise', 1.5]], when: 'Vanishing Ink: the level results with at least 1 star, and the Ink Master\'s last words.', len: '0.8–2 s'},
    'ink-life-lost':        {file: 'ink-life-lost', vol: .7, mic: false, screen: 'vanishing-ink', gen: [[[3000, 300], 0, .4, .25, 'noise', .7]], when: 'Vanishing Ink: Endless Scroll, a round with a wrong or missed note: a life lost.', len: '0.3–0.8 s'},
    'ink-game-over':        {file: 'ink-game-over', vol: .8, mic: false, screen: 'vanishing-ink', gen: [[[2500, 150], 0, 1.1, .25, 'noise', .5]], when: 'Vanishing Ink: Endless Scroll, GAME OVER.', len: '0.8–1.5 s'},
    'ink-high-score':       {file: 'ink-high-score', vol: .8, mic: false, screen: 'vanishing-ink', gen: [[[500, 6000], 0, .5, .25, 'noise', 1.2], [5000, .55, .06, .25, 'noise', 1.5], [5000, .7, .06, .25, 'noise', 1.5]], when: 'Vanishing Ink: Endless Scroll, GAME OVER with a new #1 (after ink-game-over).', len: '0.5–1.5 s'},
    'quest-encounter': {file: 'quest-encounter', vol: .7, mic: false, screen: 'arcade-quest', gen: [[523, 0, .06, .25, 'square'], [659, .06, .06, .25, 'square'], [784, .12, .06, .25, 'square'], [1047, .18, .14, .25, 'square']], when: 'Arcade Quest: you bump into a ghost and a battle starts.', len: '0.3–0.8 s'},
    'quest-tokens': {file: 'quest-tokens', vol: .6, mic: false, screen: 'arcade-quest', gen: 'select-default', when: 'Arcade Quest: stars turned into Arcade Tokens at the Token Booth, or buying at the shop.', len: 'under 1 s'},
    // Episode 1's finale: cutscene and boss music (files only, like every quest-* loop) and three effects
    'quest-intro': {file: 'quest-intro', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the intro cutscene (the arcade after hours, the glitch, the pull into Ghost Notes Manor). Nothing plays until you upload it.', len: '20–60 s loop'},
    'quest-boss': {file: 'quest-boss', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the final boss battle (The Ghost Conductor), in menus and dodging; stops while listening. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-victory': {file: 'quest-victory', vol: .55, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the ending: the manor\'s color comes back and the ghosts celebrate. Nothing plays until you upload it.', len: '20–60 s loop'},
    'quest-cliffhanger': {file: 'quest-cliffhanger', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the cliffhanger (the giant microphone, TO BE CONTINUED). Low and eerie. Nothing plays until you upload it.', len: '15–40 s loop'},
    'quest-credits': {file: 'quest-credits', vol: .5, loop: true, mic: false, screen: 'arcade-quest', when: 'Arcade Quest: the credits roll after Episode 1. Nothing plays until you upload it.', len: '30–90 s loop'},
    'quest-static': {file: 'quest-static', vol: .45, mic: false, screen: 'arcade-quest', gen: [[90, 0, .18, .12, 'sawtooth'], [70, .08, .22, .1, 'square']], when: 'Arcade Quest: static crackles (the intro glitch, color draining away).', len: '0.5–1.5 s'},
    'quest-mic-crackle': {file: 'quest-mic-crackle', vol: .5, mic: false, screen: 'arcade-quest', gen: [[60, 0, .12, .14, 'sawtooth'], [1800, .05, .03, .06, 'square'], [55, .1, .2, .12, 'sawtooth']], when: 'Arcade Quest: the Mysterious Microphone crackles (whispers in the manor, the cliffhanger). Never while listening.', len: '0.5–2 s'},
    'quest-boss-phase': {file: 'quest-boss-phase', vol: .7, mic: true, screen: 'arcade-quest', gen: [[392, 0, .08, .25, 'square'], [523, .08, .08, .25, 'square'], [784, .16, .2, .25, 'square']], when: 'Arcade Quest: the Ghost Conductor starts a new phase of the battle (never while listening).', len: '0.5–1 s'},
  };

  /** the screens, in README / Sound Board order, with their headings */
  const SCREENS = [['floor', 'Arcade floor'], ['select', 'Choose Your Instrument'], ['general', 'Everywhere'], ['game', 'Every game (shared events)'],
    ['ghost-notes', 'Ghost Notes'], ['note-storm', 'Note Storm'], ['note-checker', 'Note Checker'], ['note-ninja', 'Note Ninja'], ['endless', 'Endless mode (Note Storm, Note Ninja)'], ['lost-signal', 'Lost Signal'], ['vanishing-ink', 'Vanishing Ink'], ['dojo-duel', 'Dojo Duel'], ['chime-heist', 'Chime Heist'],
    ['ancient-ninja-scrolls', 'Ancient Ninja Scrolls'], ['button-masher', 'Button Masher'], ['neon-face-off', 'Neon Face-Off'], ['showtime-malfunction', 'Showtime Malfunction'], ['sustain-speedway', 'Sustain Speedway'], ['keys-to-the-city', 'Keys to the City'], ['music-highway', 'Music Highway'], ['arcade-quest', 'Arcade Quest']];

  A.Sounds = {
    LIST, SCREENS,
    VERSION: typeof SOUNDS_VERSION !== 'undefined' ? SOUNDS_VERSION : 1,   // added to every sound URL as ?v= (top of this file)
    /** add (or replace) sound events: {name: {file, vol, loop, mic, play, screen, when, len, gen}} */
    add(entries) { Object.keys(entries || {}).forEach(k => { LIST[k] = Object.assign({file: k, vol: .8, mic: true}, entries[k]); }); },
    /** the entry for an event; select-<game id> is made on the fly for any game */
    get(name) {
      if (LIST[name]) return LIST[name];
      const sm = /^select-music-/.test(name) && (A.GAMES || []).find(x => 'select-music-' + x.id === name);
      if (sm) {                                            // a game's own character-select music (optional)
        const g = sm;                                      // (select-music-highway is Music Highway's START sound, below)
        return g ? {file: name, vol: .6, loop: true, mic: false, screen: 'select', fallback: 'select-music', auto: true,
                    when: `Choose Your Instrument music for ${g.name} only (instead of select-music).`, len: '30–90 s loop'} : null;
      }
      if (/^press-start-/.test(name)) {                    // a game's own PRESS START sound (optional)
        const g = (A.GAMES || []).find(x => 'press-start-' + x.id === name);
        return g ? {file: name, vol: .8, mic: false, screen: 'general', fallback: 'press-start', auto: true,
                    when: `${g.name}'s PRESS START title screen is tapped (instead of press-start).`, len: '0.3–0.8 s'} : null;
      }
      if (/^mh-drums-/.test(name)) {                       // Music Highway: a song's backing drums (optional; songs.js)
        const sg = (window.MH_SONGS || []).find(x => 'mh-drums-' + x.id === name);
        return sg ? {file: name, vol: 1, mic: true, drums: true, screen: 'music-highway', auto: true, gen: [[3000, 0, .03, .3, 'noise', 3]],
                     when: `Music Highway: the backing DRUMS for "${sg.title}" (optional; drums and unpitched percussion only, nothing pitched). Start exactly on beat 1 of the song (the game plays its own count-in first) at ${sg.tempo} beats a minute, and last the whole song. Without it: the game's generated ${sg.style} groove (hear it on the Song Board). The Play button here only plays your file.`,
                     len: 'the whole song'} : null;
      }
      if (/^select-/.test(name)) {
        const g = (A.GAMES || []).find(x => 'select-' + x.id === name);
        return {file: name, vol: .8, mic: false, screen: 'floor', fallback: 'select-default', auto: true,
                when: `START on the arcade floor for ${g ? g.name : name.slice(7)} (plays before the page changes; the page changes when it ends, 1.5 s at most).`, len: '0.4–1.2 s'};
      }
      return null;
    },
    /** every event name, including one select-<id> per game in shared/games.js (if loaded) */
    names() { return Object.keys(LIST).concat((A.GAMES || []).map(g => 'select-' + g.id).filter(n => !LIST[n]),
      (A.GAMES || []).filter(g => !g.tool && g.pressStart !== false).map(g => 'press-start-' + g.id),
      (window.MH_SONGS || []).map(x => 'mh-drums-' + x.id)); },
  };
})(window.Arcade);
