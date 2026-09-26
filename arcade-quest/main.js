/* ARCADE QUEST: start-up. The saved player (Select Player) is the hero; ?test opens the TEST ARENA directly,
   ?demo&warp=<room> a room of Ghost Notes Manor, ?sprites the sprite review sheet (sprite-review.js).
   The microphone never listens outside a playing challenge (Pitch.pauseListening, see battle/challenges.js). */
(function (A) {
  "use strict";
  const GAME_ID = 'arcade-quest', Q = A.Quest;
  // ?sprites = the sprite review sheet (every character in every pose): no instrument needed, the game doesn't start
  if (/[?&]sprites(=|&|$)/.test(location.search)) { Q.spriteReview(); return; }
  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  const member = A.currentMember();
  A.mountTopbar(inst, '', GAME_ID);
  A.Pitch.setInstrument(inst);
  A.Pitch.pauseListening(true);
  // the music manager (shared/sfx.js) starts each scene's track as soon as it has loaded; fetch the likely ones now
  A.Sfx.preloadMusic(['quest-title', 'quest-foyer', 'quest-manor', 'quest-battle']);
  Q.challengeSetup(inst, member);
  const hero = () => Q.playerId(member.id);   // your avatar's sprite (rebuilt when SETTINGS / EDIT PLAYER change it)
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
