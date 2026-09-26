/* ARCADE QUEST: start-up. The saved player (Select Player) is the hero; ?test opens the TEST ARENA directly,
   ?demo&warp=<room> a room of Ghost Notes Manor.
   The microphone never listens outside a playing challenge (Pitch.pauseListening, see battle/challenges.js). */
(function (A) {
  "use strict";
  const GAME_ID = 'arcade-quest', Q = A.Quest;
  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember();
  A.mountTopbar(inst, '', GAME_ID);
  A.Pitch.setInstrument(inst);
  A.Pitch.pauseListening(true);
  Q.challengeSetup(inst, member);
  const hero = () => Q.playerId(member.id, {tone: Q.settings.get().tone});   // your sprite (rebuilt when SETTINGS change)
  hero(); Q.onSettings = hero;
  Q.mountPad(Q.$('pad'));
  document.body.classList.toggle('q-touch', Q.input.touch);
  Q.init();
  // ?test = the test arena; ?demo&warp=<room> = straight into a room of Ghost Notes Manor (foyer, hall, library,
  // ballroom, kitchen, stairs, attic, practice)
  const warp = A.DEMO && (/[?&]warp=([\w-]+)/.exec(location.search) || [])[1];
  if (warp) Q.go('world', {map: warp});
  else Q.go(/[?&]test(=|&|$)/.test(location.search) ? 'arena' : 'title');
})(window.Arcade);
