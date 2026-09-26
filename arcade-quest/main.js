/* ARCADE QUEST: start-up. The saved player (Select Player) is the hero; ?test opens the TEST ARENA directly.
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
  Q.mountPad(Q.$('pad'));
  document.body.classList.toggle('q-touch', Q.input.touch);
  Q.init();
  Q.go(/[?&]test(=|&|$)/.test(location.search) ? 'arena' : 'title');
})(window.Arcade);
