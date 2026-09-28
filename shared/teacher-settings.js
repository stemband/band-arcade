/* Band Arcade: TEACHER SETTINGS. Switches for the teacher (Mat): edit a line, save, and push. Nothing here is ever
   changed by a student or saved on a device.

   JUMP_SCARE_ALLOWED   true: Showtime Malfunction offers JUMP SCARE as a third SPOOKY LEVEL (after a warning every
                        time it's turned on; it goes back to SPOOKY at the start of each new day on a device).
                        false: the option is hidden everywhere, and a device that had it on plays SPOOKY instead. */
window.Arcade = window.Arcade || {};
window.Arcade.TEACHER = Object.assign(window.Arcade.TEACHER || {}, {
  JUMP_SCARE_ALLOWED: true,
});
