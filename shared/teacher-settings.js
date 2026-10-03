/* Band Arcade: TEACHER SETTINGS. Switches for the teacher (Mat): edit a line, save, and push. Nothing here is ever
   changed by a student or saved on a device.

   JUMP_SCARE_ALLOWED   true: Showtime Malfunction offers JUMP SCARE as a third SPOOKY LEVEL (after a warning every
                        time it's turned on; it goes back to SPOOKY at the start of each new day on a device).
                        false: the option is hidden everywhere, and a device that had it on plays SPOOKY instead.

   SHOW_INSTALL_PROMPT  true: the arcade's sound panel offers INSTALL THE APP (Home Screen / Chrome app; shared/app.js).
                        false (for now): no button. Turn it on once the site is at its final address (bandarcade.org):
                        an app keeps the progress of the address it was installed from. Installing by hand (Safari's
                        Share → Add to Home Screen, Chrome's install icon) works either way.

   ASK_INSTRUMENT_EVERY_TIME   true: CHOOSE YOUR INSTRUMENT opens after PRESS START every time the arcade opens (for a
                        class on shared devices). false (the default): a student with a saved instrument goes straight
                        to the lobby, with a small "Playing as Trumpet · Change" message.

   SPELL_ANSWER_BUTTONS Spell answer buttons for the key (no ♭/♯ tap). true (the default): the note-name answer pads
                        (shared/answer-pad.js: Note Ninja, Dojo Duel, Keys to the City, Blocktave) show one button per
                        note of the set, already spelled (flute First 5 = B♭ C D E♭ F: one tap answers B♭); only
                        Chromatic keeps the ♭ ♮ ♯ Shift. false: the old Shift pad (♭ ♮ ♯ + A–G) everywhere, for a class
                        practicing key signatures on purpose.

   BUG_REPORTS          true (the default): when something breaks on a student's device, a small ANONYMOUS note (the
                        game, the error's message, the file name + line, the browser, the version, how many times)
                        goes to your scoreboard's "Errors" tab (shared/bug-report.js; nothing about the student).
                        false: nothing is ever sent. (This file is loaded on every page, so it counts everywhere.)

   CLASSROOM_MODE       the microphone in a loud band room (shared/pitch.js ROOM; docs/engine/pitch.md): Classroom mode
                        listens only for the instrument CLOSEST to the device, so other students' notes don't count.
                        'auto' (the default): each device turns it on by itself in a loud room (and off again in a
                        quiet one), and a student can choose Auto / On / Off in Settings. 'on': always, on every device.
                        'off': never, on every device (the students' own choice is ignored). */
window.Arcade = window.Arcade || {};
window.Arcade.TEACHER = Object.assign(window.Arcade.TEACHER || {}, {
  JUMP_SCARE_ALLOWED: true,
  SHOW_INSTALL_PROMPT: false,
  ASK_INSTRUMENT_EVERY_TIME: false,
  SPELL_ANSWER_BUTTONS: true,
  BUG_REPORTS: true,                 // false: no anonymous bug reports to the scoreboard's "Errors" tab
  CLASSROOM_MODE: 'auto',            // 'auto' | 'on' | 'off': Classroom mode for the microphone (see above)
});
