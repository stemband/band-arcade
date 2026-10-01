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
                        to the lobby, with a small "Playing as Trumpet · Change" message. */
window.Arcade = window.Arcade || {};
window.Arcade.TEACHER = Object.assign(window.Arcade.TEACHER || {}, {
  JUMP_SCARE_ALLOWED: true,
  SHOW_INSTALL_PROMPT: false,
  ASK_INSTRUMENT_EVERY_TIME: false,
});
